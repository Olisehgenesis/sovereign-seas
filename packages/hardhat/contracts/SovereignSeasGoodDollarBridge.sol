// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

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

interface IDirectPaymentsPool {
    function support(address _sender, uint256 _amount, bytes memory _ctx) external returns (bytes memory);
    function claim(uint256 _nftId) external;
    function getRealtimeStats() external view returns (
        uint256 netIncome,
        uint256 totalFees,
        uint256 protocolFees,
        uint256 managerFees,
        int96 incomeFlowRate,
        int96 feeRate,
        int96 managerFeeRate
    );
}

// SovereignSeas interface
interface ISovereignSeas {
    struct Project {
        uint256 id;
        address payable owner;
        string name;
        string description;
        bool transferrable;
        bool active;
        uint256 createdAt;
    }
    
    struct Campaign {
        uint256 id;
        address admin;
        string name;
        string description;
        uint256 startTime;
        uint256 endTime;
        uint256 adminFeePercentage;
        uint256 maxWinners;
        bool useQuadraticDistribution;
        bool useCustomDistribution;
        address payoutToken;
        bool active;
        uint256 totalFunds;
    }
    
    struct ProjectParticipation {
        uint256 projectId;
        uint256 campaignId;
        bool approved;
        uint256 voteCount;
        uint256 fundsReceived;
    }
    
    function createProject(
        string memory _name,
        string memory _description,
        string memory _bio,
        string memory _contractInfo,
        string memory _additionalData,
        address[] memory _contracts,
        bool _transferrable
    ) external returns (uint256);
    
    function createCampaignWithFees(
        string memory _name,
        string memory _description,
        string memory _mainInfo,
        string memory _additionalInfo,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _adminFeePercentage,
        uint256 _maxWinners,
        bool _useQuadraticDistribution,
        bool _useCustomDistribution,
        string memory _customDistributionData,
        address _payoutToken,
        address _feeToken
    ) external payable returns (uint256);
    
    function getProject(uint256 _projectId) external view returns (
        uint256 id, address owner, string memory name, string memory description, 
        bool transferrable, bool active, uint256 createdAt, uint256[] memory campaignIds
    );
    
    function getCampaign(uint256 _campaignId) external view returns (
        uint256 id, address admin, string memory name, string memory description, 
        uint256 startTime, uint256 endTime, uint256 adminFeePercentage, uint256 maxWinners, 
        bool useQuadraticDistribution, bool useCustomDistribution, address payoutToken, 
        bool active, uint256 totalFunds
    );
    
    function getParticipation(uint256 _campaignId, uint256 _projectId) external view returns (
        bool approved, uint256 voteCount, uint256 fundsReceived
    );
    
    function getSortedProjects(uint256 _campaignId) external view returns (uint256[] memory);
    
    function submitProjectToCampaign(uint256 _projectId, uint256 _campaignId) external;
    
    function approveProject(uint256 _campaignId, uint256 _projectId) external;
    
    function getCampaignCount() external view returns (uint256);
    
    function getProjectCount() external view returns (uint256);
}

/**
 * @title SovereignSeasGoodDollarBridge
 * @dev Enhanced bridge contract that integrates SovereignSeas with Good Dollar functionality
 * Includes project creation, campaign management, and automatic Good Dollar distribution
 */
contract SovereignSeasGoodDollarBridge is 
    AccessControlUpgradeable, 
    UUPSUpgradeable, 
    ReentrancyGuardUpgradeable,
    PausableUpgradeable 
{
    using SafeERC20 for IERC20;

    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant CAMPAIGN_CREATOR_ROLE = keccak256("CAMPAIGN_CREATOR_ROLE");

    // Core contracts - Celo addresses
    ISovereignSeas public sovereignSeas;
    ISuperGoodDollar public goodDollar; // G$ token on Celo
    IDirectPaymentsFactory public directPaymentsFactory; // 0xb1C7F09156d04BFf6F412447A73a0F72929b6ea4
    
    // Good Dollar ecosystem addresses on Celo
    address public constant GOOD_DOLLAR_TOKEN = 0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A; // G$ token
    address public constant DIRECT_PAYMENTS_FACTORY = 0xb1C7F09156d04BFf6F412447A73a0F72929b6ea4;
    address public constant PROVABLE_NFT = 0x251EEBd7d9469bbcc02Ef23c95D902Cbb7fD73B3;

    // Campaign pools and project mappings
    mapping(uint256 => CampaignPool) public campaignPools;
    mapping(uint256 => mapping(uint256 => ProjectMembership)) public projectMemberships;
    mapping(address => uint256[]) public userProjects;
    mapping(address => uint256[]) public userCampaigns;
    mapping(uint256 => address) public campaignToGoodDollarPool; // Campaign ID to Good Dollar pool address
    
    // Good Dollar distribution settings
    uint256 public constant MIN_GOOD_DOLLAR_AMOUNT = 100 * 1e18; // 100 G$
    uint256 public constant MAX_GOOD_DOLLAR_AMOUNT = 100000 * 1e18; // 100,000 G$
    uint256 public goodDollarPoolSize = 1000 * 1e18; // Default 1,000 G$ per campaign
    uint256 public projectCreationReward = 50 * 1e18; // 50 G$ for creating project
    
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

    struct DistributionData {
        uint256 projectId;
        uint256 voteCount;
        uint256 goodDollarShare;
        address projectOwner;
    }

    struct ProjectCreationParams {
        string name;
        string description;
        string bio;
        string contractInfo;
        string additionalData;
        address[] contracts;
        bool transferrable;
    }

    struct CampaignCreationParams {
        string name;
        string description;
        string mainInfo;
        string additionalInfo;
        uint256 startTime;
        uint256 endTime;
        uint256 adminFeePercentage;
        uint256 maxWinners;
        bool useQuadraticDistribution;
        bool useCustomDistribution;
        string customDistributionData;
        address payoutToken;
        address feeToken;
        uint256 goodDollarPoolAmount; // Custom pool size for this campaign
        // Good Dollar pool settings
        string poolProjectId; // Project ID for Good Dollar pool
        string poolIpfs; // IPFS hash for pool metadata
    }

    // Modifiers
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Only admin can call this function");
        _;
    }

    modifier onlyOperator() {
        require(hasRole(OPERATOR_ROLE, msg.sender) || hasRole(ADMIN_ROLE, msg.sender), "Only operator can call this function");
        _;
    }

    modifier onlyCampaignCreator() {
        require(hasRole(CAMPAIGN_CREATOR_ROLE, msg.sender) || hasRole(ADMIN_ROLE, msg.sender), "Only campaign creator can call this function");
        _;
    }

    modifier validCampaign(uint256 _campaignId) {
        require(_campaignId < sovereignSeas.getCampaignCount(), "Invalid campaign ID");
        _;
    }

    modifier validProject(uint256 _projectId) {
        require(_projectId < sovereignSeas.getProjectCount(), "Invalid project ID");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the contract - FIXED VERSION
     */
    function initialize(
        address _sovereignSeas,
        address _admin
    ) external initializer {
        require(_sovereignSeas != address(0), "Invalid SovereignSeas address");
        require(_admin != address(0), "Invalid admin address");

        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        sovereignSeas = ISovereignSeas(_sovereignSeas);
        goodDollar = ISuperGoodDollar(GOOD_DOLLAR_TOKEN);
        directPaymentsFactory = IDirectPaymentsFactory(DIRECT_PAYMENTS_FACTORY);

        // Setup roles - UNCOMMENTED AND FIXED
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
        _grantRole(CAMPAIGN_CREATOR_ROLE, _admin);
    }

    /**
     * @dev Create a project through the bridge with Good Dollar reward
     */
    function createProjectWithReward(ProjectCreationParams memory params) 
        external 
        whenNotPaused 
        returns (uint256 projectId) 
    {
        // Create project in SovereignSeas
        projectId = sovereignSeas.createProject(
            params.name,
            params.description,
            params.bio,
            params.contractInfo,
            params.additionalData,
            params.contracts,
            params.transferrable
        );

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
    function createCampaignWithGoodDollarPool(CampaignCreationParams memory params) 
        external 
        payable
        onlyCampaignCreator 
        whenNotPaused 
        returns (uint256 campaignId) 
    {
        // Use provided pool amount or default
        uint256 poolAmount = params.goodDollarPoolAmount > 0 ? params.goodDollarPoolAmount : goodDollarPoolSize;
        require(poolAmount >= MIN_GOOD_DOLLAR_AMOUNT, "Pool amount too small");
        require(poolAmount <= MAX_GOOD_DOLLAR_AMOUNT, "Pool amount too large");

        // Create campaign in SovereignSeas
        campaignId = sovereignSeas.createCampaignWithFees{value: msg.value}(
            params.name,
            params.description,
            params.mainInfo,
            params.additionalInfo,
            params.startTime,
            params.endTime,
            params.adminFeePercentage,
            params.maxWinners,
            params.useQuadraticDistribution,
            params.useCustomDistribution,
            params.customDistributionData,
            params.payoutToken,
            params.feeToken
        );

        // Track user campaigns
        userCampaigns[msg.sender].push(campaignId);

        // Create Good Dollar pool for campaign
        _createGoodDollarPool(campaignId, poolAmount, params.poolProjectId, params.poolIpfs);
        
        // Create campaign pool
        _createCampaignPool(campaignId, poolAmount);

        emit CampaignCreated(campaignId, msg.sender, poolAmount);
        return campaignId;
    }

    /**
     * @dev Create a Good Dollar pool for an existing campaign
     */
    function createCampaignPool(uint256 _campaignId, uint256 _goodDollarAmount) 
        external 
        onlyOperator 
        validCampaign(_campaignId) 
    {
        _createCampaignPool(_campaignId, _goodDollarAmount);
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

    function _createCampaignPool(uint256 _campaignId, uint256 _goodDollarAmount) internal {
        require(!campaignPools[_campaignId].isActive, "Pool already exists for this campaign");
        require(_goodDollarAmount >= MIN_GOOD_DOLLAR_AMOUNT, "Pool amount too small");
        require(_goodDollarAmount <= MAX_GOOD_DOLLAR_AMOUNT, "Pool amount too large");
        
        // Get campaign info to verify it's active
        (,,,,,,,,,,, bool active,) = sovereignSeas.getCampaign(_campaignId);
        require(active, "Campaign is not active");

        // Create campaign pool
        CampaignPool storage pool = campaignPools[_campaignId];
        pool.campaignId = _campaignId;
        pool.goodDollarAmount = _goodDollarAmount;
        pool.isActive = true;
        pool.createdAt = block.timestamp;

        // Transfer Good Dollars to this contract
        require(
            goodDollar.transferFrom(msg.sender, address(this), _goodDollarAmount),
            "Failed to transfer Good Dollars"
        );

        emit CampaignPoolCreated(_campaignId, _goodDollarAmount);
    }

    /**
     * @dev Submit project to campaign and auto-add to Good Dollar pool
     */
    function submitProjectToCampaignWithPool(uint256 _projectId, uint256 _campaignId) 
        external 
        validCampaign(_campaignId) 
        validProject(_projectId) 
        whenNotPaused 
    {
        // Submit project to campaign in SovereignSeas
        sovereignSeas.submitProjectToCampaign(_projectId, _campaignId);

        // If pool exists, prepare membership (will be activated when approved)
        if (campaignPools[_campaignId].isActive) {
            // Get project info
            (, address owner,,,,,,) = sovereignSeas.getProject(_projectId);
            require(owner == msg.sender, "Only project owner can submit");

            // Create pending membership
            ProjectMembership storage membership = projectMemberships[_campaignId][_projectId];
            membership.projectId = _projectId;
            membership.campaignId = _campaignId;
            membership.projectOwner = owner;
            membership.joinedAt = block.timestamp;
            membership.isMember = false; // Will be set to true when approved
            membership.isApproved = false;
        }
    }

    /**
     * @dev Approve project and add to Good Dollar pool
     */
    function approveProjectForCampaign(uint256 _campaignId, uint256 _projectId) 
        external 
        onlyOperator 
        validCampaign(_campaignId) 
        validProject(_projectId) 
    {
        // Approve project in SovereignSeas
        sovereignSeas.approveProject(_campaignId, _projectId);

        // Add to Good Dollar pool if exists
        if (campaignPools[_campaignId].isActive) {
            _addProjectToPool(_campaignId, _projectId);
        }
    }

    /**
     * @dev Internal function to add project to pool
     */
    function _addProjectToPool(uint256 _campaignId, uint256 _projectId) internal {
        CampaignPool storage pool = campaignPools[_campaignId];
        require(pool.isActive, "Campaign pool does not exist");

        // Get project info
        (, address owner,,,,,,) = sovereignSeas.getProject(_projectId);
        require(owner != address(0), "Invalid project owner");

        // Get participation info
        (bool approved, uint256 voteCount,) = sovereignSeas.getParticipation(_campaignId, _projectId);
        require(approved, "Project not approved for campaign");

        // Add project to campaign pool
        if (!pool.hasProject[_projectId]) {
            pool.participatingProjects.push(_projectId);
            pool.hasProject[_projectId] = true;
        }

        // Update project membership
        ProjectMembership storage membership = projectMemberships[_campaignId][_projectId];
        membership.projectOwner = owner;
        membership.voteCount = voteCount;
        membership.isMember = true;
        membership.isApproved = true;

        emit ProjectMemberAdded(_campaignId, _projectId, owner);
    }

    /**
     * @dev Set custom distribution for a campaign
     */
    function setCustomDistribution(
        uint256 _campaignId,
        uint256[] memory _projectIds,
        uint256[] memory _percentages
    ) external onlyOperator validCampaign(_campaignId) {
        require(_projectIds.length == _percentages.length, "Arrays length mismatch");
        require(_projectIds.length > 0, "Empty arrays");

        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < _percentages.length; i++) {
            totalPercentage += _percentages[i];
            require(_projectIds[i] < sovereignSeas.getProjectCount(), "Invalid project ID");
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
        onlyOperator 
        validCampaign(_campaignId) 
        whenNotPaused 
    {
        CampaignPool storage pool = campaignPools[_campaignId];
        require(pool.isActive, "Campaign pool does not exist");
        require(pool.distributedAmount == 0, "Already distributed");

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
     * @dev Distribute based on vote ratios
     */
    function _distributeByVotes(uint256 _campaignId) internal {
        CampaignPool storage pool = campaignPools[_campaignId];
        
        // Get sorted projects by votes
        uint256[] memory sortedProjects = sovereignSeas.getSortedProjects(_campaignId);
        require(sortedProjects.length > 0, "No projects in campaign");

        uint256 totalVotes = 0;
        DistributionData[] memory distributionData = new DistributionData[](sortedProjects.length);

        // Calculate total votes and prepare distribution data
        for (uint256 i = 0; i < sortedProjects.length; i++) {
            uint256 projectId = sortedProjects[i];
            if (projectMemberships[_campaignId][projectId].isMember) {
                (,, uint256 voteCount) = sovereignSeas.getParticipation(_campaignId, projectId);
                totalVotes += voteCount;
                
                distributionData[i] = DistributionData({
                    projectId: projectId,
                    voteCount: voteCount,
                    goodDollarShare: 0,
                    projectOwner: projectMemberships[_campaignId][projectId].projectOwner
                });
            }
        }

        require(totalVotes > 0, "No votes in campaign");

        // Calculate and distribute Good Dollars
        uint256 totalDistributed = 0;
        for (uint256 i = 0; i < distributionData.length; i++) {
            if (distributionData[i].voteCount > 0) {
                uint256 share = (pool.goodDollarAmount * distributionData[i].voteCount) / totalVotes;
                distributionData[i].goodDollarShare = share;
                
                if (share > 0) {
                    ProjectMembership storage membership = projectMemberships[_campaignId][distributionData[i].projectId];
                    membership.goodDollarReceived = share;
                    
                    // Transfer Good Dollars to project owner
                    require(
                        goodDollar.transfer(distributionData[i].projectOwner, share),
                        "Failed to transfer Good Dollars"
                    );
                    
                    totalDistributed += share;
                    
                    emit ProjectGoodDollarReceived(_campaignId, distributionData[i].projectId, share);
                }
            }
        }

        pool.distributedAmount = totalDistributed;
        emit GoodDollarDistributed(_campaignId, totalDistributed);
    }

    /**
     * @dev Admin functions
     */
    function updateGoodDollarPoolSize(uint256 _newSize) external onlyAdmin {
        require(_newSize >= MIN_GOOD_DOLLAR_AMOUNT, "Pool size too small");
        require(_newSize <= MAX_GOOD_DOLLAR_AMOUNT, "Pool size too large");
        goodDollarPoolSize = _newSize;
        emit PoolSizeUpdated(_newSize);
    }

    function updateProjectCreationReward(uint256 _newReward) external onlyAdmin {
        require(_newReward <= 1000 * 1e18, "Reward too high"); // Max 1000 G$
        projectCreationReward = _newReward;
        emit ProjectRewardUpdated(_newReward);
    }

    function grantCampaignCreatorRole(address _user) external onlyAdmin {
        grantRole(CAMPAIGN_CREATOR_ROLE, _user);
    }

    function revokeCampaignCreatorRole(address _user) external onlyAdmin {
        revokeRole(CAMPAIGN_CREATOR_ROLE, _user);
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
        bool hasCustomDistribution
    ) {
        CampaignPool storage pool = campaignPools[_campaignId];
        return (
            pool.campaignId,
            pool.goodDollarAmount,
            pool.distributedAmount,
            pool.isActive,
            pool.createdAt,
            pool.participatingProjects,
            pool.hasCustomDistribution
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

   function getUserProjects(address _user) external view returns (uint256[] memory) {
       return userProjects[_user];
   }

   function getUserCampaigns(address _user) external view returns (uint256[] memory) {
       return userCampaigns[_user];
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

   /**
    * @dev Emergency and utility functions
    */
   function pause() external onlyAdmin {
       _pause();
   }

   function unpause() external onlyAdmin {
       _unpause();
   }

   function emergencyRecovery(address _token, address _recipient, uint256 _amount) external onlyAdmin {
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

   function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}

   receive() external payable {}
}