// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Interface for main contract communication
interface ISovereignSeasV5 {
    function hasModuleAccess(address _user, bytes32 _role) external view returns (bool);
    function callModule(string memory _moduleName, bytes memory _data) external returns (bytes memory);
}

// Interface for TreasuryModule
interface ITreasuryModule {
    function collectFee(address _token, uint256 _amount, string memory _feeType) external;
    function getTokenBalance(address _token) external view returns (uint256);
}

/**
 * @title PoolsModule - SovereignSeasV5 Campaign and Project Pool Management
 * @dev Handles campaign pools, project pools, distribution methods, and team management
 */
contract PoolsModule is 
    Initializable, 
    AccessControlUpgradeable, 
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable 
{
    using SafeERC20 for IERC20;

    // State variables
    ISovereignSeasV5 public mainContract;
    ITreasuryModule public treasuryModule;
    
    // Constants
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant CAMPAIGN_ADMIN_ROLE = keccak256("CAMPAIGN_ADMIN_ROLE");
    
    // Fee constants
    uint256 public constant PROJECT_POOL_ADMIN_FEE = 5; // 5% admin fee on project pools
    uint256 public constant VOTER_DIVERSITY_BONUS_FACTOR = 5; // 5% bonus for voter diversity
    
    // Campaign Pool Management
    struct CampaignPool {
        uint256 id;
        uint256 campaignId;
        string name;
        string description;
        uint256 startTime;
        uint256 endTime;
        bool active;
        
        // Funding Sources
        uint256 totalVotes;           // From voting
        uint256 totalDonations;       // From donations
        uint256 adminFunding;         // From admin
        uint256 totalFunds;           // Total available
        
        // Distribution Settings
        DistributionType distributionType;
        bool fundsDistributed;
        uint256 createdAt;
        
        // Token balances
        mapping(address => uint256) tokenBalances;
        address[] supportedTokens;
    }
    
    // Project Pool Management
    struct ProjectPool {
        uint256 projectId;
        uint256 totalFunded;           // Total funds received
        uint256 totalClaimed;          // Total claimed by team
        uint256 lastClaimTime;         // Last claim timestamp
        bool isActive;                 // Pool status
        
        // Funding Sources
        uint256 campaignFunds;         // From campaign distribution
        uint256 directContributions;   // Direct contributions to project
        
        // Team Management
        address[] teamMembers;         // Team member addresses
        mapping(address => bool) isTeamMember;
        mapping(address => uint256) teamClaimPercentages; // Default: equal
        
        // Contributors (direct contributions only)
        address[] contributors;
        mapping(address => uint256) contributions;
        
        // Token balances
        mapping(address => uint256) tokenBalances;
        address[] supportedTokens;
    }
    
    // Team Member Management
    struct TeamMember {
        uint256 id;
        address wallet;
        string name;
        uint256 claimPercentage;      // Default: equal distribution
        bool isActive;
        uint256 lastClaimTime;
    }
    
    // Distribution Types
    enum DistributionType {
        AUTOMATIC,      // 0: Vote-based + voter diversity
        SEMI_AUTOMATIC, // 1: Automatic + admin adjustments
        MANUAL          // 2: Admin sets exact amounts
    }
    
    // Vote struct for pool voting
    struct PoolVote {
        address voter;
        uint256 poolId;
        uint256 projectId;
        address token;
        uint256 amount;
        uint256 celoEquivalent;
        uint256 timestamp;
    }
    
    // State mappings
    mapping(uint256 => CampaignPool) public campaignPools;
    mapping(uint256 => ProjectPool) public projectPools;
    mapping(uint256 => TeamMember) public teamMembers;
    
    // Counters
    uint256 public nextCampaignPoolId;
    uint256 public nextProjectPoolId;
    uint256 public nextTeamMemberId;
    
    // Indexing
    mapping(uint256 => uint256[]) public campaignPoolIds; // campaignId => poolIds[]
    mapping(uint256 => uint256[]) public projectPoolIds; // projectId => poolIds[]
    mapping(uint256 => uint256[]) public projectTeamMemberIds; // projectId => teamMemberIds[]
    
    // Events
    event CampaignPoolCreated(uint256 indexed poolId, uint256 indexed campaignId, string name);
    event CampaignPoolFunded(uint256 indexed poolId, address indexed funder, uint256 amount);
    event CampaignPoolDonation(uint256 indexed poolId, address indexed donor, address token, uint256 amount);
    event CampaignPoolWithdrawal(uint256 indexed poolId, address indexed admin, uint256 amount);
    
    event ProjectPoolCreated(uint256 indexed projectId);
    event ProjectPoolFunded(uint256 indexed projectId, uint256 amount, string source);
    event ProjectPoolContribution(uint256 indexed projectId, address indexed contributor, address token, uint256 amount);
    
    event TeamMemberAdded(uint256 indexed projectId, uint256 indexed memberId, address wallet, string name);
    event TeamMemberRemoved(uint256 indexed projectId, uint256 indexed memberId);
    event TeamClaimPercentagesUpdated(uint256 indexed projectId, uint256[] memberIds, uint256[] percentages);
    
    event FundsDistributed(uint256 indexed campaignId, DistributionType distributionType);
    event ProjectPoolClaimed(uint256 indexed projectId, address indexed claimer, uint256 amount);
    event UnclaimedFundsRecalled(uint256 indexed projectId, address indexed admin, uint256 amount);

    // Modifiers
    modifier onlyMainContract() {
        require(msg.sender == address(mainContract), "PoolsModule: Only main contract can call");
        _;
    }
    
    modifier hasModuleRole(bytes32 role) {
        require(mainContract.hasModuleAccess(msg.sender, role), "PoolsModule: Access denied");
        _;
    }
    
    modifier campaignPoolExists(uint256 _poolId) {
        require(campaignPools[_poolId].id != 0, "PoolsModule: Campaign pool does not exist");
        _;
    }
    
    modifier projectPoolExists(uint256 _projectId) {
        require(projectPools[_projectId].projectId != 0, "PoolsModule: Project pool does not exist");
        _;
    }
    
    modifier onlyCampaignAdmin(uint256 _campaignId) {
        require(mainContract.hasModuleAccess(msg.sender, CAMPAIGN_ADMIN_ROLE) || 
                mainContract.hasModuleAccess(msg.sender, ADMIN_ROLE), "PoolsModule: Only campaign admin");
        _;
    }
    
    modifier onlyProjectOwner(uint256 _projectId) {
        // Get project owner from ProjectsModule
        bytes memory projectData = mainContract.callModule("projects", abi.encodeWithSignature("getProject(uint256)", _projectId));
        (uint256 id, address owner, , , , , , ) = abi.decode(projectData, (uint256, address, string, string, bool, bool, uint256, uint256[]));
        require(id != 0, "PoolsModule: Project does not exist");
        require(msg.sender == owner, "PoolsModule: Only project owner");
        _;
    }
    
    modifier afterDelay(uint256 delay) {
        require(block.timestamp >= delay, "PoolsModule: Delay not met");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _mainContract) public initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        
        mainContract = ISovereignSeasV5(_mainContract);
        
        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
        
        // Initialize counters
        nextCampaignPoolId = 1;
        nextProjectPoolId = 1;
        nextTeamMemberId = 1;
    }

    // =============================================================================
    // CAMPAIGN POOL MANAGEMENT
    // =============================================================================

    /**
     * @dev Create a new campaign pool
     */
    function createCampaignPool(
        uint256 _campaignId,
        string memory _name,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime,
        DistributionType _distributionType
    ) external hasModuleRole(MANAGER_ROLE) whenNotPaused {
        require(_startTime < _endTime, "PoolsModule: Invalid time range");
        require(_startTime > block.timestamp, "PoolsModule: Start time must be in future");
        
        uint256 poolId = nextCampaignPoolId++;
        
        CampaignPool storage pool = campaignPools[poolId];
        pool.id = poolId;
        pool.campaignId = _campaignId;
        pool.name = _name;
        pool.description = _description;
        pool.startTime = _startTime;
        pool.endTime = _endTime;
        pool.active = true;
        pool.distributionType = _distributionType;
        pool.fundsDistributed = false;
        pool.createdAt = block.timestamp;
        
        campaignPoolIds[_campaignId].push(poolId);
        
        emit CampaignPoolCreated(poolId, _campaignId, _name);
    }

    /**
     * @dev Admin can fund campaign pools
     */
    function fundCampaignPool(uint256 _poolId, uint256 _amount) external hasModuleRole(ADMIN_ROLE) whenNotPaused {
        CampaignPool storage pool = campaignPools[_poolId];
        require(pool.id != 0, "PoolsModule: Campaign pool does not exist");
        require(pool.active, "PoolsModule: Campaign pool not active");
        
        pool.adminFunding += _amount;
        pool.totalFunds += _amount;
        
        emit CampaignPoolFunded(_poolId, msg.sender, _amount);
    }

    /**
     * @dev Anyone can donate to campaign pools
     */
    function donateToCampaignPool(
        uint256 _poolId, 
        address _token, 
        uint256 _amount
    ) external payable whenNotPaused {
        CampaignPool storage pool = campaignPools[_poolId];
        require(pool.id != 0, "PoolsModule: Campaign pool does not exist");
        require(pool.active, "PoolsModule: Campaign pool not active");
        require(block.timestamp >= pool.startTime && block.timestamp <= pool.endTime, "PoolsModule: Pool not active");
        
        if (_token == address(0)) {
            require(msg.value == _amount, "PoolsModule: Incorrect CELO amount");
        } else {
            IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        }
        
        pool.totalDonations += _amount;
        pool.totalFunds += _amount;
        
        // Track token balance
        if (pool.tokenBalances[_token] == 0) {
            pool.supportedTokens.push(_token);
        }
        pool.tokenBalances[_token] += _amount;
        
        emit CampaignPoolDonation(_poolId, msg.sender, _token, _amount);
    }

    /**
     * @dev Admin can withdraw from campaign pools
     */
    function withdrawFromCampaignPool(uint256 _poolId, uint256 _amount) external hasModuleRole(ADMIN_ROLE) whenNotPaused {
        CampaignPool storage pool = campaignPools[_poolId];
        require(pool.id != 0, "PoolsModule: Campaign pool does not exist");
        require(pool.active, "PoolsModule: Campaign pool not active");
        require(_amount <= pool.totalFunds, "PoolsModule: Insufficient funds");
        require(!pool.fundsDistributed, "PoolsModule: Funds already distributed");
        
        pool.totalFunds -= _amount;
        
        emit CampaignPoolWithdrawal(_poolId, msg.sender, _amount);
    }

    /**
     * @dev Vote in campaign pools
     */
    function vote(
        uint256 _poolId,
        uint256 _projectId,
        address _token,
        uint256 _amount
    ) external payable whenNotPaused {
        CampaignPool storage pool = campaignPools[_poolId];
        require(pool.id != 0, "PoolsModule: Campaign pool does not exist");
        require(pool.active, "PoolsModule: Campaign pool not active");
        require(block.timestamp >= pool.startTime && block.timestamp <= pool.endTime, "PoolsModule: Pool not active");
        require(_amount > 0, "PoolsModule: Invalid amount");
        
        // Handle token transfer
        uint256 celoEquivalent;
        if (_token == address(0)) {
            require(msg.value == _amount, "PoolsModule: Incorrect CELO amount");
            celoEquivalent = _amount;
        } else {
            IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
            celoEquivalent = _amount; // Simplified for now
        }
        
        pool.totalVotes += celoEquivalent;
        pool.totalFunds += celoEquivalent;
        
        // Track token balance
        if (pool.tokenBalances[_token] == 0) {
            pool.supportedTokens.push(_token);
        }
        pool.tokenBalances[_token] += _amount;
        
        // Update voting data in VotingModule
        mainContract.callModule("voting", abi.encodeWithSignature(
            "recordPoolVote(uint256,uint256,address,address,uint256,uint256)",
            _poolId, _projectId, msg.sender, _token, _amount, celoEquivalent
        ));
    }

    // =============================================================================
    // PROJECT POOL MANAGEMENT
    // =============================================================================

    /**
     * @dev Create project pool (called automatically when project is created)
     */
    function createProjectPool(uint256 _projectId) external onlyMainContract {
        require(projectPools[_projectId].projectId == 0, "PoolsModule: Project pool already exists");
        
        ProjectPool storage pool = projectPools[_projectId];
        pool.projectId = _projectId;
        pool.totalFunded = 0;
        pool.totalClaimed = 0;
        pool.isActive = true;
        pool.lastClaimTime = 0;
        
        projectPoolIds[_projectId].push(_projectId);
        
        emit ProjectPoolCreated(_projectId);
    }
    
    function _createProjectPool(uint256 _projectId) internal {
        require(projectPools[_projectId].projectId == 0, "PoolsModule: Project pool already exists");
        
        ProjectPool storage pool = projectPools[_projectId];
        pool.projectId = _projectId;
        pool.totalFunded = 0;
        pool.totalClaimed = 0;
        pool.isActive = true;
        pool.lastClaimTime = 0;
        
        projectPoolIds[_projectId].push(_projectId);
    }

    /**
     * @dev Distribute campaign funds to project pools (called by TreasuryModule)
     */
    function distributeCampaignFundsToProject(
        uint256 _campaignId,
        uint256 _projectId,
        uint256 _amount,
        address _token
    ) external onlyMainContract whenNotPaused {
        require(projectPools[_projectId].projectId != 0, "PoolsModule: Project pool does not exist");
        
        ProjectPool storage pool = projectPools[_projectId];
        
        // Calculate 5% admin fee
        uint256 adminFee = (_amount * PROJECT_POOL_ADMIN_FEE) / 100;
        uint256 poolAmount = _amount - adminFee;
        
        // Transfer admin fee to treasury
        if (adminFee > 0) {
            if (_token == address(0)) {
                // Native CELO
                payable(address(treasuryModule)).transfer(adminFee);
            } else {
                // ERC20 token
                IERC20(_token).safeTransfer(address(treasuryModule), adminFee);
            }
            
            // Record fee in treasury
            treasuryModule.collectFee(_token, adminFee, "project_pool_admin_fee");
        }
        
        // Add to project pool
        pool.campaignFunds += poolAmount;
        pool.totalFunded += poolAmount;
        
        // Track token balance
        if (pool.tokenBalances[_token] == 0) {
            pool.supportedTokens.push(_token);
        }
        pool.tokenBalances[_token] += poolAmount;
        
        emit ProjectPoolFunded(_projectId, poolAmount, "campaign_distribution");
    }

    /**
     * @dev Direct contributions to project (with 5% admin fee)
     */
    function contributeToProject(uint256 _projectId) external payable whenNotPaused {
        require(projectPools[_projectId].projectId != 0, "PoolsModule: Project pool does not exist");
        require(msg.value > 0, "PoolsModule: Must send CELO");
        
        ProjectPool storage pool = projectPools[_projectId];
        
        // Calculate 5% admin fee
        uint256 adminFee = (msg.value * PROJECT_POOL_ADMIN_FEE) / 100;
        uint256 poolAmount = msg.value - adminFee;
        
        // Transfer admin fee to treasury
        if (adminFee > 0) {
            payable(address(treasuryModule)).transfer(adminFee);
            treasuryModule.collectFee(address(0), adminFee, "project_pool_admin_fee");
        }
        
        // Add to project pool
        pool.directContributions += poolAmount;
        pool.totalFunded += poolAmount;
        
        // Track contributor
        if (pool.contributions[msg.sender] == 0) {
            pool.contributors.push(msg.sender);
        }
        pool.contributions[msg.sender] += poolAmount;
        
        // Track token balance
        if (pool.tokenBalances[address(0)] == 0) {
            pool.supportedTokens.push(address(0));
        }
        pool.tokenBalances[address(0)] += poolAmount;
        
        emit ProjectPoolContribution(_projectId, msg.sender, address(0), poolAmount);
    }

    /**
     * @dev Direct contributions with ERC20 tokens
     */
    function contributeWithToken(
        uint256 _projectId, 
        address _token, 
        uint256 _amount
    ) external whenNotPaused {
        require(projectPools[_projectId].projectId != 0, "PoolsModule: Project pool does not exist");
        require(_amount > 0, "PoolsModule: Invalid amount");
        require(_token != address(0), "PoolsModule: Use contributeToProject for CELO");
        
        ProjectPool storage pool = projectPools[_projectId];
        
        // Transfer tokens from user
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        
        // Calculate 5% admin fee
        uint256 adminFee = (_amount * PROJECT_POOL_ADMIN_FEE) / 100;
        uint256 poolAmount = _amount - adminFee;
        
        // Transfer admin fee to treasury
        if (adminFee > 0) {
            IERC20(_token).safeTransfer(address(treasuryModule), adminFee);
            treasuryModule.collectFee(_token, adminFee, "project_pool_admin_fee");
        }
        
        // Add to project pool
        pool.directContributions += poolAmount;
        pool.totalFunded += poolAmount;
        
        // Track contributor
        if (pool.contributions[msg.sender] == 0) {
            pool.contributors.push(msg.sender);
        }
        pool.contributions[msg.sender] += poolAmount;
        
        // Track token balance
        if (pool.tokenBalances[_token] == 0) {
            pool.supportedTokens.push(_token);
        }
        pool.tokenBalances[_token] += poolAmount;
        
        emit ProjectPoolContribution(_projectId, msg.sender, _token, poolAmount);
    }

    // =============================================================================
    // TEAM MANAGEMENT
    // =============================================================================

    /**
     * @dev Add team member to project
     */
    function addTeamMember(
        uint256 _projectId, 
        address _wallet, 
        string memory _name
    ) external onlyProjectOwner(_projectId) whenNotPaused {
        require(projectPools[_projectId].projectId != 0, "PoolsModule: Project pool does not exist");
        require(_wallet != address(0), "PoolsModule: Invalid wallet address");
        
        ProjectPool storage pool = projectPools[_projectId];
        require(!pool.isTeamMember[_wallet], "PoolsModule: Team member already exists");
        
        uint256 memberId = nextTeamMemberId++;
        
        TeamMember storage member = teamMembers[memberId];
        member.id = memberId;
        member.wallet = _wallet;
        member.name = _name;
        member.claimPercentage = 0; // Will be set to equal distribution
        member.isActive = true;
        member.lastClaimTime = 0;
        
        pool.teamMembers.push(_wallet);
        pool.isTeamMember[_wallet] = true;
        projectTeamMemberIds[_projectId].push(memberId);
        
        // Update claim percentages for equal distribution
        _updateEqualClaimPercentages(_projectId);
        
        emit TeamMemberAdded(_projectId, memberId, _wallet, _name);
    }

    /**
     * @dev Remove team member from project
     */
    function removeTeamMember(uint256 _projectId, uint256 _memberId) external onlyProjectOwner(_projectId) whenNotPaused {
        require(projectPools[_projectId].projectId != 0, "PoolsModule: Project pool does not exist");
        require(teamMembers[_memberId].id != 0, "PoolsModule: Team member does not exist");
        
        ProjectPool storage pool = projectPools[_projectId];
        TeamMember storage member = teamMembers[_memberId];
        
        // Remove from team members array
        for (uint256 i = 0; i < pool.teamMembers.length; i++) {
            if (pool.teamMembers[i] == member.wallet) {
                pool.teamMembers[i] = pool.teamMembers[pool.teamMembers.length - 1];
                pool.teamMembers.pop();
                break;
            }
        }
        
        pool.isTeamMember[member.wallet] = false;
        member.isActive = false;
        
        // Update claim percentages for remaining members
        _updateEqualClaimPercentages(_projectId);
        
        emit TeamMemberRemoved(_projectId, _memberId);
    }

    /**
     * @dev Set custom claim percentages for team members
     */
    function setTeamClaimPercentages(
        uint256 _projectId,
        uint256[] memory _memberIds,
        uint256[] memory _percentages
    ) external onlyProjectOwner(_projectId) whenNotPaused {
        require(_memberIds.length == _percentages.length, "PoolsModule: Arrays length mismatch");
        require(projectPools[_projectId].projectId != 0, "PoolsModule: Project pool does not exist");
        
        ProjectPool storage pool = projectPools[_projectId];
        
        // Validate percentages sum to 100
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < _percentages.length; i++) {
            totalPercentage += _percentages[i];
        }
        require(totalPercentage == 100, "PoolsModule: Percentages must sum to 100");
        
        // Set percentages
        for (uint256 i = 0; i < _memberIds.length; i++) {
            uint256 memberId = _memberIds[i];
            require(teamMembers[memberId].id != 0, "PoolsModule: Invalid member ID");
            require(pool.isTeamMember[teamMembers[memberId].wallet], "PoolsModule: Member not in project");
            
            pool.teamClaimPercentages[teamMembers[memberId].wallet] = _percentages[i];
        }
        
        emit TeamClaimPercentagesUpdated(_projectId, _memberIds, _percentages);
    }

    /**
     * @dev Update claim percentages for equal distribution
     */
    function _updateEqualClaimPercentages(uint256 _projectId) internal {
        ProjectPool storage pool = projectPools[_projectId];
        uint256 memberCount = pool.teamMembers.length;
        
        if (memberCount > 0) {
            uint256 equalPercentage = 100 / memberCount;
            uint256 remainder = 100 % memberCount;
            
            for (uint256 i = 0; i < memberCount; i++) {
                uint256 percentage = equalPercentage;
                if (i < remainder) {
                    percentage += 1; // Distribute remainder
                }
                
                pool.teamClaimPercentages[pool.teamMembers[i]] = percentage;
            }
        }
    }

    // =============================================================================
    // DISTRIBUTION METHODS
    // =============================================================================

    /**
     * @dev Automatic distribution based on votes and voter diversity
     */
    function distributeAutomatic(uint256 _campaignId) external whenNotPaused {
        // Get campaign pools
        uint256[] memory poolIds = campaignPoolIds[_campaignId];
        require(poolIds.length > 0, "PoolsModule: No pools for campaign");
        
        // Check if 40 days have passed OR if caller is campaign admin
        bool canDistribute = false;
        
        // Check if 40 days have passed since campaign end
        bytes memory campaignData = mainContract.callModule("campaigns", abi.encodeWithSignature("getCampaign(uint256)", _campaignId));
        (, , , , , uint256 endTime, , , , , , , ) = abi.decode(campaignData, (uint256, address, string, string, uint256, uint256, uint256, uint256, bool, bool, address, bool, uint256));
        
        if (block.timestamp >= endTime + 40 days) {
            canDistribute = true; // Anyone can distribute after 40 days
        } else {
            // Check if caller is campaign admin
            canDistribute = mainContract.hasModuleAccess(msg.sender, CAMPAIGN_ADMIN_ROLE) || 
                           mainContract.hasModuleAccess(msg.sender, ADMIN_ROLE);
        }
        
        require(canDistribute, "PoolsModule: Not authorized or 40 days not passed");
        
        for (uint256 i = 0; i < poolIds.length; i++) {
            uint256 poolId = poolIds[i];
            CampaignPool storage pool = campaignPools[poolId];
            
            if (pool.active && !pool.fundsDistributed && pool.totalFunds > 0) {
                _distributePoolFundsAutomatic(poolId);
            }
        }
        
        emit FundsDistributed(_campaignId, DistributionType.AUTOMATIC);
    }

    /**
     * @dev Semi-automatic distribution (automatic + admin adjustments)
     */
    function distributeSemiAutomatic(
        uint256 _campaignId,
        uint256[] memory _projectIds,
        uint256[] memory _adjustments
    ) external onlyCampaignAdmin(_campaignId) whenNotPaused {
        require(_projectIds.length == _adjustments.length, "PoolsModule: Arrays length mismatch");
        
        // Get automatic distribution first
        uint256[] memory autoAmounts = _getAutomaticDistribution(_campaignId);
        
        // Apply admin adjustments
        for (uint256 i = 0; i < _projectIds.length; i++) {
            uint256 projectId = _projectIds[i];
            uint256 adjustment = _adjustments[i];
            
            // Find the project in automatic distribution
            for (uint256 j = 0; j < autoAmounts.length; j++) {
                if (projectId == _projectIds[j]) {
                    autoAmounts[j] += adjustment;
                    break;
                }
            }
        }
        
        // Distribute adjusted amounts
        _distributeAdjustedAmounts(_campaignId, _projectIds, autoAmounts);
        
        emit FundsDistributed(_campaignId, DistributionType.SEMI_AUTOMATIC);
    }

    /**
     * @dev Manual distribution (admin sets exact amounts)
     */
    function distributeManual(
        uint256 _campaignId,
        uint256[] memory _projectIds,
        uint256[] memory _amounts
    ) external onlyCampaignAdmin(_campaignId) whenNotPaused {
        require(_projectIds.length == _amounts.length, "PoolsModule: Arrays length mismatch");
        
        // Validate total doesn't exceed available funds
        uint256 totalDistributed = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            totalDistributed += _amounts[i];
        }
        
        uint256 availableFunds = _getCampaignAvailableFunds(_campaignId);
        require(totalDistributed <= availableFunds, "PoolsModule: Insufficient funds");
        
        // Distribute amounts
        _distributeAdjustedAmounts(_campaignId, _projectIds, _amounts);
        
        emit FundsDistributed(_campaignId, DistributionType.MANUAL);
    }

    /**
     * @dev Get automatic distribution amounts based on votes
     */
    function _getAutomaticDistribution(uint256 _campaignId) internal returns (uint256[] memory amounts) {
        uint256[] memory projectIds = _getCampaignProjects(_campaignId);
        amounts = new uint256[](projectIds.length);
        
        uint256 availableFunds = _getCampaignAvailableFunds(_campaignId);
        uint256 totalVotes = 0;
        
        // Get total votes for all projects in campaign
        for (uint256 i = 0; i < projectIds.length; i++) {
            bytes memory participationData = mainContract.callModule("voting", abi.encodeWithSignature("getParticipation(uint256,uint256)", _campaignId, projectIds[i]));
            (bool approved, uint256 voteCount, ) = abi.decode(participationData, (bool, uint256, uint256));
            if (approved) {
                totalVotes += voteCount;
            }
        }
        
        // Distribute funds proportionally based on votes
        if (totalVotes > 0) {
            for (uint256 i = 0; i < projectIds.length; i++) {
                bytes memory participationData = mainContract.callModule("voting", abi.encodeWithSignature("getParticipation(uint256,uint256)", _campaignId, projectIds[i]));
                (bool approved, uint256 voteCount, ) = abi.decode(participationData, (bool, uint256, uint256));
                
                if (approved && voteCount > 0) {
                    amounts[i] = (availableFunds * voteCount) / totalVotes;
                } else {
                    amounts[i] = 0;
                }
            }
        } else {
            // If no votes, distribute equally
            uint256 equalShare = availableFunds / projectIds.length;
            for (uint256 i = 0; i < projectIds.length; i++) {
                amounts[i] = equalShare;
            }
        }
        
        return amounts;
    }

    /**
     * @dev Distribute pool funds automatically
     */
    function _distributePoolFundsAutomatic(uint256 _poolId) internal {
        CampaignPool storage pool = campaignPools[_poolId];
        
        // Get projects in campaign
        uint256[] memory projectIds = _getCampaignProjects(pool.campaignId);
        
        if (projectIds.length > 0) {
            uint256 equalShare = pool.totalFunds / projectIds.length;
            
            for (uint256 i = 0; i < projectIds.length; i++) {
                uint256 projectId = projectIds[i];
                
                // Create project pool if it doesn't exist
                if (projectPools[projectId].projectId == 0) {
                    _createProjectPool(projectId);
                }
                
                // Distribute funds
                projectPools[projectId].campaignFunds += equalShare;
                projectPools[projectId].totalFunded += equalShare;
            }
        }
        
        pool.fundsDistributed = true;
    }

    /**
     * @dev Distribute adjusted amounts
     */
    function _distributeAdjustedAmounts(
        uint256 _campaignId,
        uint256[] memory _projectIds,
        uint256[] memory _amounts
    ) internal {
        for (uint256 i = 0; i < _projectIds.length; i++) {
            uint256 projectId = _projectIds[i];
            uint256 amount = _amounts[i];
            
            if (amount > 0) {
                // Create project pool if it doesn't exist
                if (projectPools[projectId].projectId == 0) {
                    _createProjectPool(projectId);
                }
                
                // Distribute funds
                projectPools[projectId].campaignFunds += amount;
                projectPools[projectId].totalFunded += amount;
            }
        }
        
        // Mark campaign pools as distributed
        uint256[] memory poolIds = campaignPoolIds[_campaignId];
        for (uint256 i = 0; i < poolIds.length; i++) {
            campaignPools[poolIds[i]].fundsDistributed = true;
        }
    }

    // =============================================================================
    // CLAIMING FUNCTIONS
    // =============================================================================

    /**
     * @dev Team member claims their share of project funds
     */
    function claimProjectFunds(uint256 _projectId) external whenNotPaused {
        require(projectPools[_projectId].projectId != 0, "PoolsModule: Project pool does not exist");
        
        ProjectPool storage pool = projectPools[_projectId];
        require(pool.isTeamMember[msg.sender], "PoolsModule: Not a team member");
        
        uint256 claimableAmount = _calculateClaimableAmount(_projectId, msg.sender);
        require(claimableAmount > 0, "PoolsModule: No funds to claim");
        
        // Update claimed amount
        pool.totalClaimed += claimableAmount;
        pool.lastClaimTime = block.timestamp;
        
        // Update team member last claim time
        for (uint256 i = 0; i < projectTeamMemberIds[_projectId].length; i++) {
            uint256 memberId = projectTeamMemberIds[_projectId][i];
            if (teamMembers[memberId].wallet == msg.sender) {
                teamMembers[memberId].lastClaimTime = block.timestamp;
                break;
            }
        }
        
        // Transfer funds
        _transferProjectFunds(_projectId, msg.sender, claimableAmount);
        
        emit ProjectPoolClaimed(_projectId, msg.sender, claimableAmount);
    }

    /**
     * @dev Project owner claims all team funds
     */
    function claimAllTeamFunds(uint256 _projectId) external onlyProjectOwner(_projectId) whenNotPaused {
        require(projectPools[_projectId].projectId != 0, "PoolsModule: Project pool does not exist");
        
        ProjectPool storage pool = projectPools[_projectId];
        uint256 totalClaimable = pool.totalFunded - pool.totalClaimed;
        require(totalClaimable > 0, "PoolsModule: No funds to claim");
        
        // Update claimed amount
        pool.totalClaimed = pool.totalFunded;
        pool.lastClaimTime = block.timestamp;
        
        // Transfer funds
        _transferProjectFunds(_projectId, msg.sender, totalClaimable);
        
        emit ProjectPoolClaimed(_projectId, msg.sender, totalClaimable);
    }

    /**
     * @dev Project owner claims to specific wallet
     */
    function claimToWallet(
        uint256 _projectId, 
        address _recipient, 
        uint256 _amount
    ) external onlyProjectOwner(_projectId) whenNotPaused {
        require(projectPools[_projectId].projectId != 0, "PoolsModule: Project pool does not exist");
        require(_recipient != address(0), "PoolsModule: Invalid recipient");
        
        ProjectPool storage pool = projectPools[_projectId];
        uint256 claimableAmount = pool.totalFunded - pool.totalClaimed;
        require(_amount <= claimableAmount, "PoolsModule: Insufficient funds");
        require(_amount > 0, "PoolsModule: Invalid amount");
        
        // Update claimed amount
        pool.totalClaimed += _amount;
        pool.lastClaimTime = block.timestamp;
        
        // Transfer funds
        _transferProjectFunds(_projectId, _recipient, _amount);
        
        emit ProjectPoolClaimed(_projectId, _recipient, _amount);
    }

    /**
     * @dev Calculate claimable amount for team member
     */
    function _calculateClaimableAmount(uint256 _projectId, address _member) internal view returns (uint256) {
        ProjectPool storage pool = projectPools[_projectId];
        
        if (!pool.isTeamMember[_member]) {
            return 0;
        }
        
        uint256 totalClaimable = pool.totalFunded - pool.totalClaimed;
        uint256 memberPercentage = pool.teamClaimPercentages[_member];
        
        return (totalClaimable * memberPercentage) / 100;
    }

    /**
     * @dev Transfer project funds to recipient
     */
    function _transferProjectFunds(uint256 _projectId, address _recipient, uint256 _amount) internal {
        ProjectPool storage pool = projectPools[_projectId];
        
        // For now, transfer from pool's CELO balance
        // In full implementation, this would handle multiple tokens
        if (pool.tokenBalances[address(0)] >= _amount) {
            pool.tokenBalances[address(0)] -= _amount;
            payable(_recipient).transfer(_amount);
        } else {
            // Fallback: transfer from contract balance
            payable(_recipient).transfer(_amount);
        }
    }

    // =============================================================================
    // ADMIN FUNCTIONS
    // =============================================================================

    /**
     * @dev Admin can recall unclaimed funds after 6 months
     */
    function recallUnclaimedFunds(uint256 _projectId) external hasModuleRole(ADMIN_ROLE) whenNotPaused {
        require(projectPools[_projectId].projectId != 0, "PoolsModule: Project pool does not exist");
        
        ProjectPool storage pool = projectPools[_projectId];
        uint256 unclaimedAmount = pool.totalFunded - pool.totalClaimed;
        require(unclaimedAmount > 0, "PoolsModule: No unclaimed funds");
        
        // Check if 6 months have passed since last claim
        require(
            block.timestamp >= pool.lastClaimTime + 180 days || 
            pool.lastClaimTime == 0,
            "PoolsModule: 6 months not passed"
        );
        
        // Transfer unclaimed funds to admin
        _transferProjectFunds(_projectId, msg.sender, unclaimedAmount);
        
        // Update pool state
        pool.totalClaimed = pool.totalFunded;
        
        emit UnclaimedFundsRecalled(_projectId, msg.sender, unclaimedAmount);
    }

    /**
     * @dev Set treasury module address
     */
    function setTreasuryModule(address _treasuryModule) external hasModuleRole(ADMIN_ROLE) {
        require(_treasuryModule != address(0), "PoolsModule: Invalid treasury address");
        treasuryModule = ITreasuryModule(_treasuryModule);
    }

    // =============================================================================
    // VIEW FUNCTIONS
    // =============================================================================

    /**
     * @dev Get campaign available funds
     */
    function _getCampaignAvailableFunds(uint256 _campaignId) internal view returns (uint256) {
        uint256[] memory poolIds = campaignPoolIds[_campaignId];
        uint256 totalFunds = 0;
        
        for (uint256 i = 0; i < poolIds.length; i++) {
            CampaignPool storage pool = campaignPools[poolIds[i]];
            if (pool.active && !pool.fundsDistributed) {
                totalFunds += pool.totalFunds;
            }
        }
        
        return totalFunds;
    }

    /**
     * @dev Get campaign projects from CampaignsModule
     */
    function _getCampaignProjects(uint256 _campaignId) internal returns (uint256[] memory) {
        bytes memory projectIdsData = mainContract.callModule("campaigns", abi.encodeWithSignature("getCampaignProjects(uint256)", _campaignId));
        return abi.decode(projectIdsData, (uint256[]));
    }

    /**
     * @dev Get project pool info
     */
    function getProjectPool(uint256 _projectId) external view returns (
        uint256 totalFunded,
        uint256 totalClaimed,
        bool isActive,
        uint256 lastClaimTime,
        uint256 campaignFunds,
        uint256 directContributions
    ) {
        ProjectPool storage pool = projectPools[_projectId];
        return (
            pool.totalFunded,
            pool.totalClaimed,
            pool.isActive,
            pool.lastClaimTime,
            pool.campaignFunds,
            pool.directContributions
        );
    }

    /**
     * @dev Get project team members
     */
    function getProjectTeamMembers(uint256 _projectId) external view returns (address[] memory) {
        return projectPools[_projectId].teamMembers;
    }

    /**
     * @dev Get team member info
     */
    function getTeamMember(uint256 _memberId) external view returns (
        address wallet,
        string memory name,
        uint256 claimPercentage,
        bool isActive,
        uint256 lastClaimTime
    ) {
        TeamMember storage member = teamMembers[_memberId];
        return (
            member.wallet,
            member.name,
            member.claimPercentage,
            member.isActive,
            member.lastClaimTime
        );
    }

    /**
     * @dev Get campaign pools
     */
    function getCampaignPools(uint256 _campaignId) external view returns (uint256[] memory) {
        return campaignPoolIds[_campaignId];
    }

    /**
     * @dev Get campaign pool info
     */
    function getCampaignPool(uint256 _poolId) external view returns (
        uint256 id,
        uint256 campaignId,
        string memory name,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        bool active,
        uint256 totalVotes,
        uint256 totalDonations,
        uint256 adminFunding,
        uint256 totalFunds,
        DistributionType distributionType,
        bool fundsDistributed,
        uint256 createdAt
    ) {
        CampaignPool storage pool = campaignPools[_poolId];
        return (
            pool.id,
            pool.campaignId,
            pool.name,
            pool.description,
            pool.startTime,
            pool.endTime,
            pool.active,
            pool.totalVotes,
            pool.totalDonations,
            pool.adminFunding,
            pool.totalFunds,
            pool.distributionType,
            pool.fundsDistributed,
            pool.createdAt
        );
    }
    
    /**
     * @dev Get project pool status for other modules
     */
    function getProjectPoolStatus(uint256 _projectId) external view returns (
        bool exists,
        uint256 totalFunded,
        uint256 totalClaimed,
        bool isActive,
        uint256 campaignFunds,
        uint256 directContributions
    ) {
        ProjectPool storage pool = projectPools[_projectId];
        return (
            pool.projectId != 0,
            pool.totalFunded,
            pool.totalClaimed,
            pool.isActive,
            pool.campaignFunds,
            pool.directContributions
        );
    }
    
    /**
     * @dev Get campaign pool status for other modules
     */
    function getCampaignPoolStatus(uint256 _campaignId) external view returns (
        uint256 totalPools,
        uint256 totalFunds,
        uint256 totalVotes,
        bool hasActivePools
    ) {
        uint256[] memory poolIds = campaignPoolIds[_campaignId];
        uint256 totalFundsCount = 0;
        uint256 totalVotesCount = 0;
        bool hasActive = false;
        
        for (uint256 i = 0; i < poolIds.length; i++) {
            CampaignPool storage pool = campaignPools[poolIds[i]];
            if (pool.active) {
                hasActive = true;
                totalFundsCount += pool.totalFunds;
                totalVotesCount += pool.totalVotes;
            }
        }
        
        return (poolIds.length, totalFundsCount, totalVotesCount, hasActive);
    }
    
    /**
     * @dev Get pool token balances for treasury operations
     */
    function getPoolTokenBalances(uint256 _poolId) external view returns (
        address[] memory tokens,
        uint256[] memory balances
    ) {
        CampaignPool storage pool = campaignPools[_poolId];
        
        // Convert storage arrays to memory arrays
        uint256 tokenCount = pool.supportedTokens.length;
        tokens = new address[](tokenCount);
        balances = new uint256[](tokenCount);
        
        for (uint256 i = 0; i < tokenCount; i++) {
            tokens[i] = pool.supportedTokens[i];
            balances[i] = pool.tokenBalances[pool.supportedTokens[i]];
        }
        
        return (tokens, balances);
    }

    // =============================================================================
    // EMERGENCY FUNCTIONS
    // =============================================================================

    /**
     * @dev Emergency pause
     */
    function emergencyPause() external hasModuleRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Emergency unpause
     */
    function emergencyUnpause() external hasModuleRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Emergency withdrawal (admin only)
     */
    function emergencyWithdraw(address _token, uint256 _amount) external hasModuleRole(ADMIN_ROLE) {
        if (_token == address(0)) {
            payable(msg.sender).transfer(_amount);
        } else {
            IERC20(_token).safeTransfer(msg.sender, _amount);
        }
    }

    // =============================================================================
    // MODULE INTERFACE COMPLIANCE
    // =============================================================================

    /**
     * @dev Get module name
     */
    function getModuleName() external pure returns (string memory) {
        return "pools";
    }

    /**
     * @dev Get module version
     */
    function getModuleVersion() external pure returns (uint256) {
        return 1;
    }

    /**
     * @dev Grant roles to V5 admin
     */
    function grantRolesToV5Admin(address v5Admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(ADMIN_ROLE, v5Admin);
        _grantRole(MANAGER_ROLE, v5Admin);
    }

    // =============================================================================
    // RECEIVE FUNCTION
    // =============================================================================

    /**
     * @dev Receive function for native CELO
     */
    receive() external payable {
        // Accept CELO payments
    }
    
    /**
     * @dev Transfer funds to treasury (for fees)
     */
    function transferToTreasury(address _token, uint256 _amount, string memory _reason) external onlyMainContract {
        require(_amount > 0, "PoolsModule: Invalid amount");
        
        if (_token == address(0)) {
            // Native CELO
            payable(address(treasuryModule)).transfer(_amount);
        } else {
            // ERC20 token
            IERC20(_token).safeTransfer(address(treasuryModule), _amount);
        }
        
        emit FundsTransferredToTreasury(_token, _amount, _reason);
    }
    
    /**
     * @dev Receive funds from treasury (for funding)
     */
    function receiveFromTreasury(address _token, uint256 _amount, string memory _reason) external payable onlyMainContract {
        require(_amount > 0, "PoolsModule: Invalid amount");
        
        if (_token == address(0)) {
            // Native CELO - should be sent with the transaction
            require(msg.value == _amount, "PoolsModule: Incorrect CELO amount");
        } else {
            // ERC20 token - should be transferred to this contract
            IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        }
        
        emit FundsReceivedFromTreasury(_token, _amount, _reason);
    }
    
    // =============================================================================
    // MIGRATION FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Create campaign pool from V4 migration
     */
    function createCampaignPoolFromV4(
        uint256 _campaignId,
        string memory _name,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime,
        DistributionType _distributionType,
        uint256 _totalFunds,
        uint256 _totalVotes
    ) external onlyMainContract {
        require(_startTime < _endTime, "PoolsModule: Invalid time range");
        
        uint256 poolId = nextCampaignPoolId++;
        
        CampaignPool storage pool = campaignPools[poolId];
        pool.id = poolId;
        pool.campaignId = _campaignId;
        pool.name = _name;
        pool.description = _description;
        pool.startTime = _startTime;
        pool.endTime = _endTime;
        pool.active = true;
        pool.distributionType = _distributionType;
        pool.totalFunds = _totalFunds;
        pool.totalVotes = _totalVotes;
        pool.fundsDistributed = false;
        pool.createdAt = block.timestamp;
        
        campaignPoolIds[_campaignId].push(poolId);
        
        emit CampaignPoolCreated(poolId, _campaignId, _name);
    }
    
    /**
     * @dev Set campaign pool funds from V4 migration
     */
    function setCampaignPoolFundsFromV4(
        uint256 _poolId,
        uint256 _totalFunds,
        uint256 _totalVotes,
        address[] memory _tokens,
        uint256[] memory _balances
    ) external onlyMainContract {
        require(campaignPools[_poolId].id != 0, "PoolsModule: Campaign pool does not exist");
        
        CampaignPool storage pool = campaignPools[_poolId];
        pool.totalFunds = _totalFunds;
        pool.totalVotes = _totalVotes;
        
        // Set token balances
        for (uint256 i = 0; i < _tokens.length; i++) {
            if (_balances[i] > 0) {
                pool.tokenBalances[_tokens[i]] = _balances[i];
                pool.supportedTokens.push(_tokens[i]);
            }
        }
        
        emit CampaignPoolFundsSet(_poolId, _totalFunds, _totalVotes);
    }
    
    /**
     * @dev Set next campaign pool ID for V4 migration
     */
    function setNextCampaignPoolId(uint256 _nextId) external onlyMainContract {
        nextCampaignPoolId = _nextId;
    }
    
    /**
     * @dev Set next project pool ID for V4 migration
     */
    function setNextProjectPoolId(uint256 _nextId) external onlyMainContract {
        nextProjectPoolId = _nextId;
    }
    
    // =============================================================================
    // EVENTS
    // =============================================================================
    
    event FundsTransferredToTreasury(address indexed token, uint256 amount, string reason);
    event FundsReceivedFromTreasury(address indexed token, uint256 amount, string reason);
    event CampaignPoolFundsSet(uint256 indexed poolId, uint256 totalFunds, uint256 totalVotes);
}
