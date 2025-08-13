// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

// Interfaces for Good Dollar ecosystem
interface ISuperGoodDollar {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IDirectPaymentsFactory {
    function createPool(
        string memory _projectId,
        string memory _ipfs,
        PoolSettings memory _settings,
        SafetyLimits memory _limits,
        uint32 _managerFeeBps
    ) external returns (address pool);
    
    struct PoolSettings {
        uint32 nftType;
        uint16[] validEvents;
        uint128[] rewardPerEvent;
        address manager;
        address membersValidator;
        address uniquenessValidator;
        address rewardToken;
        bool allowRewardOverride;
    }
    
    struct SafetyLimits {
        uint256 maxTotalPerMonth;
        uint256 maxMemberPerMonth;
        uint256 maxMemberPerDay;
    }
}

/**
 * @title SimpleGoodDollarBridge
 * @dev Simple bridge contract that integrates with Good Dollar functionality
 * Includes project creation, campaign management, and automatic Good Dollar distribution
 */
contract SimpleGoodDollarBridge is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Core contracts - Celo addresses
    ISuperGoodDollar public goodDollar; // G$ token on Celo
    IDirectPaymentsFactory public directPaymentsFactory; // 0xb1C7F09156d04BFf6F412447A73a0F72929b6ea4
    
    // Good Dollar ecosystem addresses on Celo
    address public constant GOOD_DOLLAR_TOKEN = 0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A; // G$ token
    address public constant DIRECT_PAYMENTS_FACTORY = 0xb1C7F09156d04BFf6F412447A73a0F72929b6ea4;
    
    // Campaign pools and project mappings
    mapping(uint256 => CampaignPool) public campaignPools;
    mapping(uint256 => mapping(uint256 => ProjectMembership)) public projectMemberships;
    mapping(address => uint256[]) public userProjects;
    mapping(uint256 => address) public campaignToGoodDollarPool; // Campaign ID to Good Dollar pool address
    
    // Good Dollar distribution settings
    uint256 public constant MIN_GOOD_DOLLAR_AMOUNT = 100 * 1e18; // 100 G$
    uint256 public constant MAX_GOOD_DOLLAR_AMOUNT = 100000 * 1e18; // 100,000 G$
    uint256 public goodDollarPoolSize = 1000 * 1e18; // Default 1,000 G$ per campaign
    uint256 public projectCreationReward = 50 * 1e18; // 50 G$ for creating project
    
    // Campaign counter
    uint256 public campaignCounter = 0;
    uint256 public projectCounter = 0;
    
    // Custom distribution settings
    struct CustomDistribution {
        uint256[] projectIds;
        uint256[] percentages; // In basis points (10000 = 100%)
        bool isActive;
        address setBy;
        uint256 setAt;
    }
    
    mapping(uint256 => CustomDistribution) public customDistributions;
    
    // Events
    event CampaignCreated(uint256 indexed campaignId, address indexed creator, uint256 goodDollarPoolAmount);
    event CampaignPoolCreated(uint256 indexed campaignId, uint256 goodDollarAmount);
    event ProjectCreated(uint256 indexed projectId, address indexed creator, uint256 goodDollarReward);
    event ProjectMemberAdded(uint256 indexed campaignId, uint256 indexed projectId, address indexed projectOwner);
    event GoodDollarDistributed(uint256 indexed campaignId, uint256 totalDistributed);
    event ProjectGoodDollarReceived(uint256 indexed campaignId, uint256 indexed projectId, uint256 amount);
    event CustomDistributionSet(uint256 indexed campaignId, uint256[] projectIds, uint256[] percentages);
    event PoolSizeUpdated(uint256 newSize);
    event ProjectRewardUpdated(uint256 newReward);
    event EmergencyRecovery(address indexed token, address indexed recipient, uint256 amount);

    struct CampaignPool {
        uint256 campaignId;
        uint256 goodDollarAmount;
        uint256 distributedAmount;
        bool isActive;
        uint256 createdAt;
        uint256[] participatingProjects;
        mapping(uint256 => bool) hasProject;
        bool hasCustomDistribution;
        string name;
        string description;
        uint256 startTime;
        uint256 endTime;
        uint256 maxWinners;
    }

    struct ProjectMembership {
        uint256 projectId;
        uint256 campaignId;
        address projectOwner;
        uint256 voteCount;
        uint256 goodDollarReceived;
        bool isMember;
        uint256 joinedAt;
        bool isApproved;
    }

    struct Project {
        uint256 id;
        address owner;
        string name;
        string description;
        bool active;
        uint256 createdAt;
    }

    struct DistributionData {
        uint256 projectId;
        uint256 voteCount;
        uint256 goodDollarShare;
        address projectOwner;
    }

    struct ProjectCreationParams {
        string name;
        string description;
    }

    struct CampaignCreationParams {
        string name;
        string description;
        uint256 startTime;
        uint256 endTime;
        uint256 maxWinners;
        uint256 goodDollarPoolAmount; // Custom pool size for this campaign
        string poolProjectId; // Project ID for Good Dollar pool
        string poolIpfs; // IPFS hash for pool metadata
    }

    // Modifiers
    modifier validCampaign(uint256 _campaignId) {
        require(_campaignId < campaignCounter, "Invalid campaign ID");
        _;
    }

    modifier validProject(uint256 _projectId) {
        require(_projectId < projectCounter, "Invalid project ID");
        _;
    }

    constructor() Ownable(msg.sender) {
        goodDollar = ISuperGoodDollar(GOOD_DOLLAR_TOKEN);
        directPaymentsFactory = IDirectPaymentsFactory(DIRECT_PAYMENTS_FACTORY);
    }

    /**
     * @dev Create a project with Good Dollar reward
     */
    function createProject(ProjectCreationParams memory params) 
        external 
        whenNotPaused 
        returns (uint256 projectId) 
    {
        projectId = projectCounter++;
        
        // Store project info
        Project storage project = projects[projectId];
        project.id = projectId;
        project.owner = msg.sender;
        project.name = params.name;
        project.description = params.description;
        project.active = true;
        project.createdAt = block.timestamp;

        // Track user projects
        userProjects[msg.sender].push(projectId);

        // Reward project creator with Good Dollars
        if (projectCreationReward > 0 && goodDollar.balanceOf(address(this)) >= projectCreationReward) {
            require(
                goodDollar.transfer(msg.sender, projectCreationReward),
                "Failed to transfer Good Dollar reward"
            );
        }

        emit ProjectCreated(projectId, msg.sender, projectCreationReward);
        return projectId;
    }

    /**
     * @dev Create a campaign with automatic Good Dollar pool
     */
    function createCampaign(CampaignCreationParams memory params) 
        external 
        whenNotPaused 
        returns (uint256 campaignId) 
    {
        // Use provided pool amount or default
        uint256 poolAmount = params.goodDollarPoolAmount > 0 ? params.goodDollarPoolAmount : goodDollarPoolSize;
        require(poolAmount >= MIN_GOOD_DOLLAR_AMOUNT, "Pool amount too small");
        require(poolAmount <= MAX_GOOD_DOLLAR_AMOUNT, "Pool amount too large");

        campaignId = campaignCounter++;

        // Create campaign pool
        CampaignPool storage pool = campaignPools[campaignId];
        pool.campaignId = campaignId;
        pool.goodDollarAmount = poolAmount;
        pool.isActive = true;
        pool.createdAt = block.timestamp;
        pool.name = params.name;
        pool.description = params.description;
        pool.startTime = params.startTime;
        pool.endTime = params.endTime;
        pool.maxWinners = params.maxWinners;

        // Create Good Dollar pool for campaign
        address goodDollarPoolAddress = _createGoodDollarPool(campaignId, poolAmount, params.poolProjectId, params.poolIpfs);
        
        emit CampaignCreated(campaignId, msg.sender, poolAmount);
        return campaignId;
    }

    /**
     * @dev Create Good Dollar pool for campaign
     */
    function _createGoodDollarPool(
        uint256 _campaignId, 
        uint256 _amount, 
        string memory _projectId,
        string memory _ipfs
    ) internal returns (address poolAddress) {
        // Create pool settings for Good Dollar
        IDirectPaymentsFactory.PoolSettings memory poolSettings = IDirectPaymentsFactory.PoolSettings({
            nftType: uint32(_campaignId + 1000), // Unique NFT type for campaign
            validEvents: new uint16[](1),
            rewardPerEvent: new uint128[](1),
            manager: address(this),
            membersValidator: address(0), // Open to all
            uniquenessValidator: address(0), // No uniqueness requirement
            rewardToken: GOOD_DOLLAR_TOKEN,
            allowRewardOverride: true
        });
        
        // Set default event and reward
        poolSettings.validEvents[0] = 1; // Event type 1 = project participation
        poolSettings.rewardPerEvent[0] = uint128(_amount / 100); // Default reward per event
        
        // Create safety limits
        IDirectPaymentsFactory.SafetyLimits memory limits = IDirectPaymentsFactory.SafetyLimits({
            maxTotalPerMonth: _amount,
            maxMemberPerMonth: _amount / 10, // Max 10% per member per month
            maxMemberPerDay: _amount / 300 // Max ~0.33% per member per day
        });
        
        // Create the Good Dollar pool
        poolAddress = directPaymentsFactory.createPool(
            _projectId,
            _ipfs,
            poolSettings,
            limits,
            500 // 5% manager fee
        );
        
        // Store mapping
        campaignToGoodDollarPool[_campaignId] = poolAddress;
        
        return poolAddress;
    }

    /**
     * @dev Add project to campaign and auto-add to Good Dollar pool
     */
    function addProjectToCampaign(uint256 _projectId, uint256 _campaignId) 
        external 
        validCampaign(_campaignId) 
        validProject(_projectId) 
        whenNotPaused 
    {
        // Check if project owner
        require(projects[_projectId].owner == msg.sender, "Only project owner can add to campaign");
        
        // Check if campaign is active
        CampaignPool storage pool = campaignPools[_campaignId];
        require(pool.isActive, "Campaign is not active");
        require(block.timestamp >= pool.startTime, "Campaign not started yet");
        require(block.timestamp <= pool.endTime, "Campaign ended");

        // Add project to campaign pool
        if (!pool.hasProject[_projectId]) {
            pool.participatingProjects.push(_projectId);
            pool.hasProject[_projectId] = true;
        }

        // Update project membership
        ProjectMembership storage membership = projectMemberships[_campaignId][_projectId];
        membership.projectId = _projectId;
        membership.campaignId = _campaignId;
        membership.projectOwner = msg.sender;
        membership.joinedAt = block.timestamp;
        membership.isMember = true;
        membership.isApproved = true;

        emit ProjectMemberAdded(_campaignId, _projectId, msg.sender);
    }

    /**
     * @dev Set custom distribution for a campaign
     */
    function setCustomDistribution(
        uint256 _campaignId,
        uint256[] memory _projectIds,
        uint256[] memory _percentages
    ) external onlyOwner validCampaign(_campaignId) {
        require(_projectIds.length == _percentages.length, "Arrays length mismatch");
        require(_projectIds.length > 0, "Empty arrays");

        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < _percentages.length; i++) {
            totalPercentage += _percentages[i];
            require(_projectIds[i] < projectCounter, "Invalid project ID");
        }
        require(totalPercentage == 10000, "Total percentage must equal 10000 (100%)");

        CustomDistribution storage customDist = customDistributions[_campaignId];
        customDist.projectIds = _projectIds;
        customDist.percentages = _percentages;
        customDist.isActive = true;
        customDist.setBy = msg.sender;
        customDist.setAt = block.timestamp;

        campaignPools[_campaignId].hasCustomDistribution = true;

        emit CustomDistributionSet(_campaignId, _projectIds, _percentages);
    }

    /**
     * @dev Distribute Good Dollars based on votes or custom distribution
     */
    function distributeGoodDollars(uint256 _campaignId) 
        external 
        onlyOwner 
        validCampaign(_campaignId) 
        whenNotPaused 
    {
        CampaignPool storage pool = campaignPools[_campaignId];
        require(pool.isActive, "Campaign pool does not exist");
        require(pool.distributedAmount == 0, "Already distributed");
        require(block.timestamp > pool.endTime, "Campaign not ended yet");

        if (pool.hasCustomDistribution && customDistributions[_campaignId].isActive) {
            _distributeCustom(_campaignId);
        } else {
            _distributeByVotes(_campaignId);
        }
    }

    /**
     * @dev Distribute using custom percentages
     */
    function _distributeCustom(uint256 _campaignId) internal {
        CampaignPool storage pool = campaignPools[_campaignId];
        CustomDistribution storage customDist = customDistributions[_campaignId];

        uint256 totalDistributed = 0;

        for (uint256 i = 0; i < customDist.projectIds.length; i++) {
            uint256 projectId = customDist.projectIds[i];
            uint256 percentage = customDist.percentages[i];
            
            uint256 share = (pool.goodDollarAmount * percentage) / 10000;
            
            if (share > 0 && projectMemberships[_campaignId][projectId].isMember) {
                ProjectMembership storage membership = projectMemberships[_campaignId][projectId];
                membership.goodDollarReceived = share;
                
                // Transfer Good Dollars to project owner
                require(
                    goodDollar.transfer(membership.projectOwner, share),
                    "Failed to transfer Good Dollars"
                );
                
                totalDistributed += share;
                emit ProjectGoodDollarReceived(_campaignId, projectId, share);
            }
        }

        pool.distributedAmount = totalDistributed;
        emit GoodDollarDistributed(_campaignId, totalDistributed);
    }

    /**
     * @dev Distribute based on vote ratios (simplified - equal distribution)
     */
    function _distributeByVotes(uint256 _campaignId) internal {
        CampaignPool storage pool = campaignPools[_campaignId];
        
        uint256[] memory participatingProjects = pool.participatingProjects;
        require(participatingProjects.length > 0, "No projects in campaign");

        uint256 sharePerProject = pool.goodDollarAmount / participatingProjects.length;
        uint256 totalDistributed = 0;

        for (uint256 i = 0; i < participatingProjects.length; i++) {
            uint256 projectId = participatingProjects[i];
            if (projectMemberships[_campaignId][projectId].isMember) {
                ProjectMembership storage membership = projectMemberships[_campaignId][projectId];
                membership.goodDollarReceived = sharePerProject;
                
                // Transfer Good Dollars to project owner
                require(
                    goodDollar.transfer(membership.projectOwner, sharePerProject),
                    "Failed to transfer Good Dollars"
                );
                
                totalDistributed += sharePerProject;
                emit ProjectGoodDollarReceived(_campaignId, projectId, sharePerProject);
            }
        }

        pool.distributedAmount = totalDistributed;
        emit GoodDollarDistributed(_campaignId, totalDistributed);
    }

    /**
     * @dev Admin functions
     */
    function updateGoodDollarPoolSize(uint256 _newSize) external onlyOwner {
        require(_newSize >= MIN_GOOD_DOLLAR_AMOUNT, "Pool size too small");
        require(_newSize <= MAX_GOOD_DOLLAR_AMOUNT, "Pool size too large");
        goodDollarPoolSize = _newSize;
        emit PoolSizeUpdated(_newSize);
    }

    function updateProjectCreationReward(uint256 _newReward) external onlyOwner {
        require(_newReward <= 1000 * 1e18, "Reward too high"); // Max 1000 G$
        projectCreationReward = _newReward;
        emit ProjectRewardUpdated(_newReward);
    }

    /**
     * @dev View functions
     */
    function getCampaignPool(uint256 _campaignId) external view returns (
        uint256 campaignId,
        uint256 goodDollarAmount,
        uint256 distributedAmount,
        bool isActive,
        uint256 createdAt,
        uint256[] memory participatingProjects,
        bool hasCustomDistribution,
        string memory name,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        uint256 maxWinners
    ) {
        CampaignPool storage pool = campaignPools[_campaignId];
        return (
            pool.campaignId,
            pool.goodDollarAmount,
            pool.distributedAmount,
            pool.isActive,
            pool.createdAt,
            pool.participatingProjects,
            pool.hasCustomDistribution,
            pool.name,
            pool.description,
            pool.startTime,
            pool.endTime,
            pool.maxWinners
        );
    }

    function getProjectMembership(uint256 _campaignId, uint256 _projectId) external view returns (
        uint256 projectId,
        uint256 campaignId,
        address projectOwner,
        uint256 voteCount,
        uint256 goodDollarReceived,
        bool isMember,
        uint256 joinedAt,
        bool isApproved
    ) {
        ProjectMembership storage membership = projectMemberships[_campaignId][_projectId];
        return (
            membership.projectId,
            membership.campaignId,
            membership.projectOwner,
            membership.voteCount,
            membership.goodDollarReceived,
            membership.isMember,
            membership.joinedAt,
            membership.isApproved
        );
    }

    function getProject(uint256 _projectId) external view returns (
        uint256 id,
        address owner,
        string memory name,
        string memory description,
        bool active,
        uint256 createdAt
    ) {
        Project storage project = projects[_projectId];
        return (
            project.id,
            project.owner,
            project.name,
            project.description,
            project.active,
            project.createdAt
        );
    }

    function getUserProjects(address _user) external view returns (uint256[] memory) {
        return userProjects[_user];
    }

    function getCampaignProjectMembers(uint256 _campaignId) external view returns (uint256[] memory) {
        return campaignPools[_campaignId].participatingProjects;
    }

    function isProjectMember(uint256 _campaignId, uint256 _projectId) external view returns (bool) {
        return projectMemberships[_campaignId][_projectId].isMember;
    }

    function getGoodDollarBalance() external view returns (uint256) {
        return goodDollar.balanceOf(address(this));
    }

    function getCampaignGoodDollarPool(uint256 _campaignId) external view returns (address) {
        return campaignToGoodDollarPool[_campaignId];
    }

    function getCustomDistribution(uint256 _campaignId) external view returns (
        uint256[] memory projectIds,
        uint256[] memory percentages,
        bool isActive,
        address setBy,
        uint256 setAt
    ) {
        CustomDistribution storage dist = customDistributions[_campaignId];
        return (dist.projectIds, dist.percentages, dist.isActive, dist.setBy, dist.setAt);
    }

    /**
     * @dev Emergency and utility functions
     */
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyRecovery(address _token, address _recipient, uint256 _amount) external onlyOwner {
        require(_recipient != address(0), "Invalid recipient");
        require(_amount > 0, "Invalid amount");

        if (_token == address(0)) {
            require(address(this).balance >= _amount, "Insufficient balance");
            payable(_recipient).transfer(_amount);
        } else {
            require(IERC20(_token).balanceOf(address(this)) >= _amount, "Insufficient balance");
            IERC20(_token).safeTransfer(_recipient, _amount);
        }

        emit EmergencyRecovery(_token, _recipient, _amount);
    }

    // Storage for projects
    mapping(uint256 => Project) public projects;

    receive() external payable {}
}
