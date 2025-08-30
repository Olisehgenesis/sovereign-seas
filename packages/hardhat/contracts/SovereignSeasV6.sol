// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IBroker {
    function swapIn(address exchangeProvider, bytes32 exchangeId, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin) external returns (uint256 amountOut);
    function getAmountOut(address exchangeProvider, bytes32 exchangeId, address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256 amountOut);
    function exchangeProviders(uint256 index) external view returns (address);
}

// Minimal structs to avoid stack depth issues
struct Project {
    uint256 id;
    address payable owner;
    string name;
    string description;
    bool active;
    uint256 createdAt;
    // V4 compatibility fields
    string bio;
    string contractInfo;
    string additionalData;
    address[] contracts;
    bool transferrable;
    uint256[] campaignIds;
    mapping(uint256 => bool) campaignParticipation;
    // V6 Quality Control
    OfficialStatus officialStatus;
}

struct Campaign {
    uint256 id;
    address admin;
    string name;
    string description;
    uint256 startTime;
    uint256 endTime;
    bool active;
    uint256 totalFunds;
    uint256 createdAt;
    mapping(address => bool) campaignAdmins; // Added for campaign admin management
    mapping(address => uint256) tokenAmounts; // Added for campaign funding tracking
    bool autoPoolCreated; // Added for automatic pool creation
    uint256[] poolIds; // Added for managing campaign's pool IDs
    mapping(address => uint256) userMaxVoteAmount; // Added for user-specific max vote amounts
    // V4 compatibility fields
    string mainInfo;
    string additionalInfo;
    uint256 adminFeePercentage;
    uint256 maxWinners;
    bool useQuadraticDistribution;
    bool useCustomDistribution;
    string customDistributionData;
    address payoutToken;
    // V6 Quality Control
    OfficialStatus officialStatus;
}

struct FundPool {
    uint256 id;
    uint256 campaignId;
    string name;
    string description;
    uint256 startTime;
    uint256 endTime;
    bool active;
    uint256 totalDonations;
    uint256 totalVotes;
    bool fundsDistributed;
    uint256 createdAt;
    // V6 Quality Control
    OfficialStatus officialStatus;
}

struct Vote {
    address voter;
    uint256 campaignId;
    uint256 projectId;
    address token;
    uint256 amount;
    uint256 celoEquivalent;
    uint256 timestamp;
}

// V4 compatibility structs
struct ProjectParticipation {
    uint256 projectId;
    uint256 campaignId;
    bool approved;
    uint256 voteCount;
    uint256 fundsReceived;
    mapping(address => uint256) tokenVotes;
}

struct CustomDistributionDetails {
    uint256 projectId;
    uint256 amount;
    string comment;
    bytes jsonData;
}

struct TokenExchangeProvider {
    address provider;
    bytes32 exchangeId;
    bool active;
}

// Enhanced Fund Pool System Structs
struct ProjectPool {
    uint256 id;
    uint256 projectId;
    uint256 poolId;
    uint256 allocatedAmount;
    uint256 claimedAmount;
    bool active;
    bool claimable;
    uint256 claimableAt; // Timestamp when funds become claimable
    uint256 createdAt;
    address claimableBy; // Can be different from project owner
    string metadata; // Additional info about this allocation
}

struct FundAllocation {
    uint256 id;
    uint256 poolId;
    uint256 projectId;
    uint256 amount;
    uint256 allocatedAt;
    address allocatedBy;
    bool active;
    string reason; // Why this allocation was made
}

// Official Status Enum for Quality Control and Verification
enum OfficialStatus {
    PENDING,        // 0: Default status - awaiting review
    VERIFIED,       // 1: Officially verified and trusted
    FLAGGED,        // 2: Marked for review due to concerns
    SUSPENDED,      // 3: Temporarily suspended from platform
    ARCHIVED        // 4: No longer active but preserved for reference
}

/**
 * @title SovereignSeasV6 - Simplified Enterprise-Grade Sovereign Seas System
 * @dev Upgradable contract with enhanced security, access control, and features
 */
contract SovereignSeasV6 is 
    UUPSUpgradeable, 
    AccessControlUpgradeable, 
    PausableUpgradeable, 
    ReentrancyGuardUpgradeable 
{
    using SafeERC20 for IERC20;

    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    // CRITICAL: Storage layout preservation - V4 variables must come FIRST
    // State variables - minimal to reduce stack depth
    mapping(uint256 => Project) public projects;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => FundPool) public pools;
    mapping(address => bool) public supportedTokens;
    mapping(address => bool) public votingTokens;
    mapping(address => Vote[]) public userVoteHistory;
    uint256[] public projectIds;
    uint256[] public campaignIds;
    uint256[] public poolIds;
    
    // V4 compatibility state variables - CRITICAL: Must preserve order
    mapping(uint256 => mapping(uint256 => ProjectParticipation)) public projectParticipations;
    mapping(uint256 => mapping(address => mapping(uint256 => mapping(address => uint256)))) public userVotes;
    mapping(uint256 => mapping(address => uint256)) public totalUserVotesInCampaign;
    mapping(uint256 => address[]) private campaignUsedTokens;
    mapping(uint256 => mapping(address => bool)) private isTokenUsedInCampaign;
    mapping(address => TokenExchangeProvider) public tokenExchangeProviders;
    mapping(string => uint256) public dataStructureVersions;
    mapping(address => uint256) public collectedFees;
    address[] public supportedTokensList;
    uint256 public nextProjectId;
    uint256 public nextCampaignId;
    
    // V4 critical state variables - CRITICAL: Must preserve order
    mapping(address => bool) public superAdmins;
    address public mentoTokenBroker;
    IERC20 public celoToken;
    
    // V4 constants
    uint256 public constant PLATFORM_FEE = 15;
    uint256 public campaignCreationFee;
    uint256 public projectAdditionFee;
    bytes32 private bypassSecretCode;
    
    // Token addresses
    address public nativeToken;
    address public cusdToken;
    
    // Configurable Parameters
    uint256 public platformFeePercentage;
    uint256 public emergencyWithdrawalDelay;
    
    // Circuit Breaker
    bool public circuitBreakerTriggered;
    
    // CRITICAL: Add storage gap to prevent V4 storage corruption
    uint256[50] private __gap;
    
    // V6 Enhanced Fund Pool System State Variables - MOVED TO END to prevent storage collision
    uint256 public nextProjectPoolId;
    uint256 public nextFundAllocationId;
    mapping(uint256 => ProjectPool) public projectPools;
    mapping(uint256 => FundAllocation) public fundAllocations;
    mapping(uint256 => uint256[]) public poolProjectPools; // poolId => projectPoolIds[]
    mapping(uint256 => uint256[]) public projectProjectPools; // projectId => projectPoolIds[]
    mapping(uint256 => mapping(uint256 => bool)) public projectPoolExists; // projectId => poolId => exists
    mapping(uint256 => bool) public poolMilestoneEnabled; // poolId => milestone enabled
    mapping(uint256 => uint256) public poolDefaultClaimDelay; // poolId => default claim delay in seconds
    
    // Events
    event ProjectCreated(uint256 indexed projectId, address indexed owner, string name);
    event CampaignCreated(uint256 indexed campaignId, string name, uint256 startTime, uint256 endTime);
    event PoolCreated(uint256 indexed poolId, uint256 indexed campaignId, string name);
    event DonationMade(uint256 indexed poolId, address indexed donor, address indexed token, uint256 amount);
    event FundsDistributed(uint256 indexed poolId, uint256[] projectIds, uint256[] amounts, address[] tokens);
    event CampaignAdminAdded(uint256 indexed campaignId, address indexed newAdmin, address indexed initiator);
    event CampaignAdminRemoved(uint256 indexed campaignId, address indexed admin, address indexed initiator);
    event CampaignFunded(uint256 indexed campaignId, address indexed funder, address indexed token, uint256 amount);
    event CampaignFundsDistributed(uint256 indexed campaignId, uint256[] projectIds, uint256[] amounts, address token);
    event CampaignFundsWithdrawn(uint256 indexed campaignId, address indexed withdrawer, address indexed token, uint256 amount);
    event CampaignMigrated(uint256 indexed campaignId, address indexed initiator);
    event AutoPoolCreated(uint256 indexed campaignId, uint256 indexed poolId, string name);
    
    // V4 compatibility events
    event ProjectUpdated(uint256 indexed projectId, address indexed updatedBy);
    event ProjectOwnershipTransferred(uint256 indexed projectId, address indexed previousOwner, address indexed newOwner);
    event CampaignUpdated(uint256 indexed campaignId, address indexed updatedBy);
    event CampaignMetadataUpdated(uint256 indexed campaignId, address indexed updatedBy);
    event ProjectAddedToCampaign(uint256 indexed campaignId, uint256 indexed projectId);
    event ProjectRemovedFromCampaign(uint256 indexed campaignId, uint256 indexed projectId);
    event ProjectApproved(uint256 indexed campaignId, uint256 indexed projectId);
    event CustomFundsDistributed(uint256 indexed campaignId, string distributionDetails);
    event AdminAdded(address indexed target, address indexed admin, uint256 indexed campaignId, bool isSuper);
    event AdminRemoved(address indexed target, address indexed admin, uint256 indexed campaignId, bool isSuper);
    event TokenConversionSucceeded(address indexed fromToken, address indexed toToken, uint256 fromAmount, uint256 toAmount);
    event TokenConversionFailed(uint256 indexed campaignId, address indexed token, uint256 amount);
    event FundsDistributedToProject(uint256 indexed campaignId, uint256 indexed projectId, uint256 amount, address token);
    event ProjectFundsDistributedDetailed(uint256 indexed campaignId, uint256 indexed projectId, uint256 amount, address token, string comment, bytes jsonData);
    event DataStructureVersionUpdated(string dataType, uint256 newVersion, string structureDescription);
    event EmergencyTokenRecovery(address indexed token, address indexed recipient, uint256 amount, bool tokensNeededForActiveCampaigns);
    event FeeCollected(address indexed token, uint256 amount, string feeType);
    event FeeWithdrawn(address indexed token, address indexed recipient, uint256 amount);
    event FeeAmountUpdated(string feeType, uint256 previousAmount, uint256 newAmount);
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event TokenExchangeProviderSet(address indexed token, address indexed provider, bytes32 exchangeId);
    event TokenExchangeProviderDeactivated(address indexed token);
    // V4-style events for compatibility
    event FundsDistributedV4(uint256 indexed campaignId);
    event BrokerUpdated(address indexed newBroker);
    event BypassCodeUpdated(address indexed updatedBy);
    event VoteCast(address indexed voter, uint256 indexed campaignId, uint256 indexed projectId, address token, uint256 amount, uint256 celoEquivalent);
    
    // Enhanced Fund Pool System Events
    event ProjectPoolCreated(uint256 indexed projectPoolId, uint256 indexed projectId, uint256 indexed poolId, uint256 amount, address claimableBy);
    event ProjectPoolUpdated(uint256 indexed projectPoolId, uint256 amount, bool claimable, uint256 claimableAt);
    event ProjectPoolClaimed(uint256 indexed projectPoolId, uint256 indexed projectId, uint256 indexed poolId, address claimedBy, uint256 amount);
    event FundAllocated(uint256 indexed allocationId, uint256 indexed poolId, uint256 indexed projectId, uint256 amount, string reason);
    event FundAllocationUpdated(uint256 indexed allocationId, uint256 newAmount, bool active);
    event PoolClaimDelaySet(uint256 indexed poolId, uint256 claimDelay);
    event PoolMilestoneEnabled(uint256 indexed poolId, bool enabled);
    
    // V6 Quality Control Events
    event ProjectStatusUpdated(uint256 indexed projectId, OfficialStatus oldStatus, OfficialStatus newStatus, address indexed updatedBy, string reason);
    event CampaignStatusUpdated(uint256 indexed campaignId, OfficialStatus oldStatus, OfficialStatus newStatus, address indexed updatedBy, string reason);
    event PoolStatusUpdated(uint256 indexed poolId, OfficialStatus oldStatus, OfficialStatus newStatus, address indexed updatedBy, string reason);
    
    // CRITICAL: Missing V4 events - REMOVED DUPLICATES

    // Modifiers
    modifier circuitBreakerCheck() {
        require(!circuitBreakerTriggered, "SEVAS: Circuit breaker triggered");
        _;
    }
    
    modifier projectExists(uint256 _projectId) {
        require(projects[_projectId].id != 0, "SEVAS: Project does not exist");
        _;
    }
    
    modifier campaignExists(uint256 _campaignId) {
        require(campaigns[_campaignId].id != 0, "SEVAS: Campaign does not exist");
        _;
    }
    
    modifier poolExists(uint256 _poolId) {
        require(pools[_poolId].id != 0, "SEVAS: Pool does not exist");
        _;
    }
    
    modifier campaignAdmin(uint256 _campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(
            _msgSender() == campaign.admin || 
            campaign.campaignAdmins[_msgSender()] || 
            hasRole(ADMIN_ROLE, _msgSender()),
            "SEVAS: Only campaign admin or platform admin can call this function"
        );
        _;
    }
    
    // V4 compatibility modifiers
    modifier onlyProjectOwner(uint256 _projectId) { 
        require(projects[_projectId].owner == _msgSender(), "SEVAS: Only project owner can call this function"); 
        _; 
    }
    
    modifier validAddress(address _addr) { 
        require(_addr != address(0), "SEVAS: Invalid address"); 
        _; 
    }
    
    modifier activeProject(uint256 _projectId) { 
        require(projects[_projectId].active, "SEVAS: Project is not active"); 
        _; 
    }
    
    modifier activeCampaign(uint256 _campaignId) { 
        require(campaigns[_campaignId].active, "SEVAS: Campaign is not active"); 
        _; 
    }
    
    // CRITICAL: Missing V4 modifiers
    modifier onlySuperAdmin() { 
        require(superAdmins[_msgSender()], "SEVAS: Only super admin can call this function"); 
        _; 
    }
    
    modifier onlyCampaignAdmin(uint256 _campaignId) {
        require(
            _msgSender() == campaigns[_campaignId].admin || 
            campaigns[_campaignId].campaignAdmins[_msgSender()] || 
            superAdmins[_msgSender()], 
            "SEVAS: Only campaign admin or super admin can call this function"
        );
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _admin) public initializer {
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        
        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(MANAGER_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);
        
        // Initialize configurable parameters
        platformFeePercentage = 0;
        emergencyWithdrawalDelay = 24 hours;
        
        // V4 compatibility initialization
        campaignCreationFee = 2 * 1e18;
        projectAdditionFee = 1 * 1e18;
        nextProjectId = 0;
        nextCampaignId = 0;
        
        // CRITICAL: Initialize V4 compatibility
        superAdmins[_admin] = true;
        mentoTokenBroker = address(0); // Will be set later
        celoToken = IERC20(address(0)); // Will be set later
        
        // Initialize enhanced fund pool system
        nextProjectPoolId = 0;
        nextFundAllocationId = 0;
        
        // Initialize V6 constants
        circuitBreakerTriggered = false;
    }
    
    function setContractAddresses(
        address _nativeToken,
        address _cusdToken
    ) external onlyRole(ADMIN_ROLE) {
        nativeToken = _nativeToken;
        cusdToken = _cusdToken;
        
        // Initialize token support
        supportedTokens[_nativeToken] = true;
        supportedTokens[_cusdToken] = true;
        votingTokens[_nativeToken] = true;
        votingTokens[_cusdToken] = true;
    }

    // UUPS Upgrade Functions
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // Emergency Functions
    function emergencyPause(string memory reason) external onlyRole(EMERGENCY_ROLE) {
        _pause();
    }
    
    function emergencyUnpause() external onlyRole(EMERGENCY_ROLE) {
        _unpause();
    }
    
    function emergencyWithdraw(address _token, uint256 _amount) external onlyRole(EMERGENCY_ROLE) {
        if (_token == nativeToken) {
            payable(_msgSender()).transfer(_amount);
        } else {
            IERC20(_token).safeTransfer(_msgSender(), _amount);
        }
    }
    
    function triggerCircuitBreaker(string memory reason) external onlyRole(EMERGENCY_ROLE) {
        circuitBreakerTriggered = true;
    }
    
    function resetCircuitBreaker() external onlyRole(ADMIN_ROLE) {
        circuitBreakerTriggered = false;
    }

    // Project Management Functions
    function createProjectV6(
        uint256 _projectId,
        string memory _name,
        string memory _description
    ) external whenNotPaused {
        require(projects[_projectId].id == 0, "SEVAS: Project ID already exists");
        require(bytes(_name).length > 0, "SEVAS: Name cannot be empty");
        
        Project storage project = projects[_projectId];
        project.id = _projectId;
        project.owner = payable(_msgSender());
        project.name = _name;
        project.description = _description;
        project.active = true;
        project.createdAt = block.timestamp;
        
        projectIds.push(_projectId);
        emit ProjectCreated(_projectId, _msgSender(), _name);
    }
    
    // V4 compatibility project functions
    function createProjectV4(
        string memory _name,
        string memory _description,
        string memory _bioPart,
        string memory _contractInfoPart,
        string memory _additionalDataPart,
        address[] memory _contracts,
        bool _transferrable
    ) external payable whenNotPaused {
        require(msg.value >= projectAdditionFee, "SEVAS: Insufficient project addition fee");
        uint256 projectId = nextProjectId;
        nextProjectId++;
        
        Project storage newProject = projects[projectId];
        newProject.id = projectId;
        newProject.owner = payable(_msgSender());
        newProject.name = _name;
        newProject.description = _description;
        newProject.bio = _bioPart;
        newProject.contractInfo = _contractInfoPart;
        newProject.additionalData = _additionalDataPart;
        newProject.contracts = _contracts;
        newProject.transferrable = _transferrable;
        newProject.active = true;
        newProject.createdAt = block.timestamp;
        newProject.officialStatus = OfficialStatus.PENDING;
        
        projectIds.push(projectId);
        emit ProjectCreated(projectId, _msgSender(), _name);
    }
    
    function updateProject(
        uint256 _projectId,
        string memory _name,
        string memory _description,
        string memory _bioPart,
        string memory _contractInfoPart,
        string memory _additionalDataPart,
        address[] memory _contracts
    ) external onlyProjectOwner(_projectId) activeProject(_projectId) {
        Project storage project = projects[_projectId];
        project.name = _name;
        project.description = _description;
        project.bio = _bioPart;
        project.contractInfo = _contractInfoPart;
        project.additionalData = _additionalDataPart;
        project.contracts = _contracts;
        emit ProjectUpdated(_projectId, _msgSender());
    }
    
    function updateProjectMetadata(
        uint256 _projectId,
        uint8 _metadataType,
        string memory _newData
    ) external onlyProjectOwner(_projectId) activeProject(_projectId) {
        Project storage project = projects[_projectId];
        if (_metadataType == 1) project.bio = _newData;
        else if (_metadataType == 2) project.contractInfo = _newData;
        else if (_metadataType == 3) project.additionalData = _newData;
        else revert("SEVAS: Invalid metadata type");
        emit ProjectUpdated(_projectId, _msgSender());
    }
    
    function transferProjectOwnership(
        uint256 _projectId,
        address payable _newOwner
    ) external onlyProjectOwner(_projectId) validAddress(_newOwner) {
        Project storage project = projects[_projectId];
        require(project.transferrable, "SEVAS: Project is not transferrable");
        address previousOwner = project.owner;
        project.owner = _newOwner;
        emit ProjectOwnershipTransferred(_projectId, previousOwner, _newOwner);
    }

    // CRITICAL: Missing V4 core functions - REMOVED DUPLICATES



    // Campaign Management
    function createCampaignV6(
        uint256 _campaignId,
        string memory _name,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime
    ) external onlyRole(MANAGER_ROLE) whenNotPaused {
        require(_startTime < _endTime, "SEVAS: Invalid time range");
        require(_startTime > block.timestamp, "SEVAS: Start time must be in future");
        require(campaigns[_campaignId].id == 0, "SEVAS: Campaign ID already exists");
        
        Campaign storage campaign = campaigns[_campaignId];
        campaign.id = _campaignId;
        campaign.admin = _msgSender();
        campaign.name = _name;
        campaign.description = _description;
        campaign.startTime = _startTime;
        campaign.endTime = _endTime;
        campaign.active = true;
        campaign.totalFunds = 0;
        campaign.createdAt = block.timestamp;
        campaign.campaignAdmins[_msgSender()] = true; // Creator is first admin
        campaign.autoPoolCreated = false;
        campaign.officialStatus = OfficialStatus.PENDING;
        
        campaignIds.push(_campaignId);
        emit CampaignCreated(_campaignId, _name, _startTime, _endTime);
        
        // Automatically create the main fund pool
        _createAutoPool(_campaignId, _name, _description, _startTime, _endTime);
    }
    
    // Internal function to create automatic pool
    function _createAutoPool(
        uint256 _campaignId,
        string memory _name,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime
    ) internal {
        // Generate pool ID based on campaign ID
        uint256 poolId = uint256(keccak256(abi.encodePacked(_campaignId, "MAIN_POOL")));
        
        // Ensure pool ID is unique
        while (pools[poolId].id != 0) {
            poolId = uint256(keccak256(abi.encodePacked(poolId, "MAIN_POOL")));
        }
        
        FundPool storage pool = pools[poolId];
        pool.id = poolId;
        pool.campaignId = _campaignId;
        pool.name = string(abi.encodePacked(_name, " - Main Fund Pool"));
        pool.description = string(abi.encodePacked(_description, " - Main funding pool for this campaign"));
        pool.startTime = _startTime;
        pool.endTime = _endTime;
        pool.active = true;
        pool.fundsDistributed = false;
        pool.createdAt = block.timestamp;
        pool.officialStatus = OfficialStatus.PENDING;
        
        poolIds.push(poolId);
        
        // Link pool to campaign
        Campaign storage campaign = campaigns[_campaignId];
        campaign.poolIds.push(poolId);
        campaign.autoPoolCreated = true;
        
        emit PoolCreated(poolId, _campaignId, pool.name);
        emit AutoPoolCreated(_campaignId, poolId, pool.name);
    }
    
    // REMOVED DUPLICATE createCampaignV4 function (non-payable version)
    
    function updateCampaign(
        uint256 _campaignId,
        string memory _name,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _adminFeePercentage,
        uint256 _maxWinners,
        bool _useQuadraticDistribution,
        bool _useCustomDistribution,
        address _payoutToken
    ) external campaignAdmin(_campaignId) activeCampaign(_campaignId) whenNotPaused {
        require(supportedTokens[_payoutToken], "SEVAS: Payout token not supported");
        require(_startTime < _endTime, "SEVAS: Invalid time range");
        require(_startTime > block.timestamp, "SEVAS: Start time must be in future");
        
        Campaign storage campaign = campaigns[_campaignId];
        require(_adminFeePercentage <= campaign.adminFeePercentage, "SEVAS: Cannot increase admin fee");
        
        campaign.name = _name;
        campaign.description = _description;
        campaign.startTime = _startTime;
        campaign.endTime = _endTime;
        campaign.adminFeePercentage = _adminFeePercentage;
        campaign.maxWinners = _maxWinners;
        campaign.useQuadraticDistribution = _useQuadraticDistribution;
        campaign.useCustomDistribution = _useCustomDistribution;
        campaign.payoutToken = _payoutToken;
        
        emit CampaignUpdated(_campaignId, _msgSender());
    }
    
    function updateCampaignMetadata(
        uint256 _campaignId,
        string memory _mainInfo,
        string memory _additionalInfo
    ) external campaignAdmin(_campaignId) activeCampaign(_campaignId) whenNotPaused {
        Campaign storage campaign = campaigns[_campaignId];
        campaign.mainInfo = _mainInfo;
        campaign.additionalInfo = _additionalInfo;
        emit CampaignMetadataUpdated(_campaignId, _msgSender());
    }
    
    function updateCustomDistributionData(
        uint256 _campaignId,
        string memory _customDistributionData
    ) external campaignAdmin(_campaignId) activeCampaign(_campaignId) whenNotPaused {
        campaigns[_campaignId].customDistributionData = _customDistributionData;
        emit CampaignUpdated(_campaignId, _msgSender());
    }
    
    function setUserMaxVoteAmount(
        uint256 _campaignId,
        address _user,
        uint256 _maxAmount
    ) external campaignAdmin(_campaignId) whenNotPaused {
        campaigns[_campaignId].userMaxVoteAmount[_user] = _maxAmount;
    }
    
    // Enhanced Utility Functions for Quick Edits
    function editCampaignEndTime(
        uint256 _campaignId,
        uint256 _newEndTime
    ) external campaignAdmin(_campaignId) whenNotPaused {
        Campaign storage campaign = campaigns[_campaignId];
        require(_newEndTime > block.timestamp, "SEVAS: End time must be in future");
        require(_newEndTime > campaign.startTime, "SEVAS: End time must be after start time");
        
        campaign.endTime = _newEndTime;
        emit CampaignUpdated(_campaignId, _msgSender());
    }
    
    function editCampaignName(
        uint256 _campaignId,
        string memory _newName
    ) external campaignAdmin(_campaignId) whenNotPaused {
        require(bytes(_newName).length > 0, "SEVAS: Name cannot be empty");
        campaigns[_campaignId].name = _newName;
        emit CampaignUpdated(_campaignId, _msgSender());
    }
    
    function editCampaignDescription(
        uint256 _campaignId,
        string memory _newDescription
    ) external campaignAdmin(_campaignId) whenNotPaused {
        campaigns[_campaignId].description = _newDescription;
        emit CampaignUpdated(_campaignId, _msgSender());
    }
    
    function editProjectName(
        uint256 _projectId,
        string memory _newName
    ) external onlyProjectOwner(_projectId) whenNotPaused {
        require(bytes(_newName).length > 0, "SEVAS: Name cannot be empty");
        projects[_projectId].name = _newName;
        emit ProjectUpdated(_projectId, _msgSender());
    }
    
    function editProjectDescription(
        uint256 _projectId,
        string memory _newDescription
    ) external onlyProjectOwner(_projectId) whenNotPaused {
        require(bytes(_newDescription).length > 0, "SEVAS: Description cannot be empty");
        projects[_projectId].description = _newDescription;
        emit ProjectUpdated(_projectId, _msgSender());
    }
    
    function editProjectBio(
        uint256 _projectId,
        string memory _newBio
    ) external onlyProjectOwner(_projectId) whenNotPaused {
        projects[_projectId].bio = _newBio;
        emit ProjectUpdated(_projectId, _msgSender());
    }
    
    function editProjectContractInfo(
        uint256 _projectId,
        string memory _newContractInfo
    ) external onlyProjectOwner(_projectId) whenNotPaused {
        projects[_projectId].contractInfo = _newContractInfo;
        emit ProjectUpdated(_projectId, _msgSender());
    }
    
    function editProjectAdditionalData(
        uint256 _projectId,
        string memory _newAdditionalData
    ) external onlyProjectOwner(_projectId) whenNotPaused {
        projects[_projectId].additionalData = _newAdditionalData;
        emit ProjectUpdated(_projectId, _msgSender());
    }
    
    function editProjectContracts(
        uint256 _projectId,
        address[] memory _newContracts
    ) external onlyProjectOwner(_projectId) whenNotPaused {
        projects[_projectId].contracts = _newContracts;
        emit ProjectUpdated(_projectId, _msgSender());
    }
    
    function editProjectTransferrability(
        uint256 _projectId,
        bool _transferrable
    ) external onlyProjectOwner(_projectId) whenNotPaused {
        projects[_projectId].transferrable = _transferrable;
        emit ProjectUpdated(_projectId, _msgSender());
    }
    
    // Campaign Admin Management
    function addCampaignAdmin(uint256 _campaignId, address _newAdmin) external campaignExists(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(
            _msgSender() == campaign.admin || 
            campaign.campaignAdmins[_msgSender()] || 
            hasRole(ADMIN_ROLE, _msgSender()),
            "SEVAS: Only campaign admin or platform admin can add admins"
        );
        require(_newAdmin != address(0), "SEVAS: Invalid admin address");
        require(!campaign.campaignAdmins[_newAdmin], "SEVAS: Already an admin for this campaign");
        
        campaign.campaignAdmins[_newAdmin] = true;
        emit CampaignAdminAdded(_campaignId, _newAdmin, _msgSender());
    }
    
    function removeCampaignAdmin(uint256 _campaignId, address _admin) external campaignExists(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(
            _msgSender() == campaign.admin || 
            campaign.campaignAdmins[_msgSender()] || 
            hasRole(ADMIN_ROLE, _msgSender()),
            "SEVAS: Only campaign admin or platform admin can remove admins"
        );
        require(_admin != campaign.admin, "SEVAS: Cannot remove primary admin");
        require(campaign.campaignAdmins[_admin], "SEVAS: Not an admin for this campaign");
        
        campaign.campaignAdmins[_admin] = false;
        emit CampaignAdminRemoved(_campaignId, _admin, _msgSender());
    }
    

    
    // Migration function for V4 campaigns
    function migrateV4Campaign(uint256 _campaignId) external onlyRole(ADMIN_ROLE) campaignExists(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        
        // Initialize the new V6 fields if not already done
        if (!campaign.campaignAdmins[campaign.admin]) {
            campaign.campaignAdmins[campaign.admin] = true;
            emit CampaignAdminAdded(_campaignId, campaign.admin, _msgSender());
        }
        
        // Initialize token amounts if there are existing funds
        if (campaign.totalFunds > 0 && campaign.tokenAmounts[nativeToken] == 0) {
            // Assume existing funds are in native token (CELO) for V4 campaigns
            campaign.tokenAmounts[nativeToken] = campaign.totalFunds;
        }
        
        emit CampaignMigrated(_campaignId, _msgSender());
    }
    
    // Migration function for V4 campaigns with full data
    function migrateV4CampaignFull(
        uint256 _campaignId,
        address[] memory _existingAdmins,
        address[] memory _tokens,
        uint256[] memory _tokenAmounts
    ) external onlyRole(ADMIN_ROLE) campaignExists(_campaignId) {
        require(_tokens.length == _tokenAmounts.length, "SEVAS: Token arrays length mismatch");
        require(_existingAdmins.length > 0, "SEVAS: Must have at least one admin");
        
        Campaign storage campaign = campaigns[_campaignId];
        
        // Set all existing V4 campaign admins
        for (uint256 i = 0; i < _existingAdmins.length; i++) {
            if (_existingAdmins[i] != address(0)) {
                campaign.campaignAdmins[_existingAdmins[i]] = true;
                emit CampaignAdminAdded(_campaignId, _existingAdmins[i], _msgSender());
            }
        }
        
        // Set token amounts from V4 data
        uint256 totalFunds = 0;
        for (uint256 i = 0; i < _tokens.length; i++) {
            if (_tokens[i] != address(0) && _tokenAmounts[i] > 0) {
                campaign.tokenAmounts[_tokens[i]] = _tokenAmounts[i];
                totalFunds += _tokenAmounts[i];
            }
        }
        
        // Update total funds if we have token-specific amounts
        if (totalFunds > 0) {
            campaign.totalFunds = totalFunds;
        }
        
        emit CampaignMigrated(_campaignId, _msgSender());
    }
    
    // Helper function to get V4 campaign migration data
    function getV4MigrationData(uint256 _campaignId) external view returns (
        bool needsMigration,
        bool hasMultipleAdmins,
        bool hasTokenAmounts,
        uint256 adminCount,
        uint256 tokenCount
    ) {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.id != 0, "SEVAS: Campaign does not exist");
        
        // Check if campaign needs migration
        needsMigration = !campaign.campaignAdmins[campaign.admin];
        
        // Count admins (including primary admin)
        adminCount = 1; // Primary admin
        if (campaign.campaignAdmins[campaign.admin]) {
            adminCount = 0; // Already migrated
        }
        
        // Check if we have token-specific amounts
        hasTokenAmounts = campaign.tokenAmounts[nativeToken] > 0 || 
                          campaign.tokenAmounts[cusdToken] > 0;
        
        // Count tokens with balances
        tokenCount = 0;
        if (campaign.tokenAmounts[nativeToken] > 0) tokenCount++;
        if (campaign.tokenAmounts[cusdToken] > 0) tokenCount++;
        
        hasMultipleAdmins = adminCount > 1;
    }
    
    // Batch migration for multiple V4 campaigns
    function batchMigrateV4Campaigns(uint256[] memory _campaignIds) external onlyRole(ADMIN_ROLE) {
        require(_campaignIds.length > 0, "SEVAS: No campaigns to migrate");
        require(_campaignIds.length <= 50, "SEVAS: Max 50 campaigns per batch"); // Gas limit protection
        
        for (uint256 i = 0; i < _campaignIds.length; i++) {
            if (campaigns[_campaignIds[i]].id != 0) {
                Campaign storage campaign = campaigns[_campaignIds[i]];
                
                // Initialize basic migration if not already done
                if (!campaign.campaignAdmins[campaign.admin]) {
                    campaign.campaignAdmins[campaign.admin] = true;
                    emit CampaignAdminAdded(_campaignIds[i], campaign.admin, _msgSender());
                }
                
                // Initialize token amounts if there are existing funds
                if (campaign.totalFunds > 0 && campaign.tokenAmounts[nativeToken] == 0) {
                    campaign.tokenAmounts[nativeToken] = campaign.totalFunds;
                }
                
                emit CampaignMigrated(_campaignIds[i], _msgSender());
            }
        }
    }
    
    // Campaign Funding Functions - REMOVED DUPLICATE
    


    // Pool Management
    function createPool(
        uint256 _poolId,
        uint256 _campaignId,
        string memory _name,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime
    ) external onlyRole(MANAGER_ROLE) campaignExists(_campaignId) whenNotPaused {
        require(_startTime < _endTime, "SEVAS: Invalid time range");
        require(_startTime > block.timestamp, "SEVAS: Start time must be in future");
        require(pools[_poolId].id == 0, "SEVAS: Pool ID already exists");
        
        FundPool storage pool = pools[_poolId];
        pool.id = _poolId;
        pool.campaignId = _campaignId;
        pool.name = _name;
        pool.description = _description;
        pool.startTime = _startTime;
        pool.endTime = _endTime;
        pool.active = true;
        pool.fundsDistributed = false;
        pool.createdAt = block.timestamp;
        pool.officialStatus = OfficialStatus.PENDING;
        
        poolIds.push(_poolId);
        emit PoolCreated(_poolId, _campaignId, _name);
    }

    // Donation Functions
    function donate(
        uint256 _poolId,
        address _token,
        uint256 _amount
    ) external payable nonReentrant poolExists(_poolId) whenNotPaused {
        require(supportedTokens[_token], "SEVAS: Token not supported");
        require(_amount > 0, "SEVAS: Amount must be greater than 0");
        
        FundPool storage pool = pools[_poolId];
        require(block.timestamp >= pool.startTime && block.timestamp <= pool.endTime, "SEVAS: Pool not active");
        
        if (_token == nativeToken) {
            require(msg.value == _amount, "SEVAS: Incorrect CELO amount");
        } else {
            IERC20(_token).safeTransferFrom(_msgSender(), address(this), _amount);
        }
        
        pool.totalDonations += _amount;
        
        emit DonationMade(_poolId, _msgSender(), _token, _amount);
    }

    // Voting Functions
    function vote(
        uint256 _poolId,
        uint256 _projectId,
        address _token,
        uint256 _amount
    ) external payable nonReentrant poolExists(_poolId) projectExists(_projectId) whenNotPaused {
        require(votingTokens[_token], "SEVAS: Only CELO and cUSD can be used for voting");
        
        FundPool storage pool = pools[_poolId];
        require(block.timestamp >= pool.startTime && block.timestamp <= pool.endTime, "SEVAS: Pool not active");
        require(_amount > 0, "SEVAS: Invalid amount");
        
        // CRITICAL: Use broker for token conversion like V4 does
        uint256 celoEquivalent;
        if (_token == nativeToken) {
            require(msg.value == _amount, "SEVAS: Incorrect CELO amount");
            celoEquivalent = _amount; // CELO is 1:1 with itself
        } else if (_token == cusdToken) {
            IERC20(_token).safeTransferFrom(_msgSender(), address(this), _amount);
            // Use broker to get CELO equivalent for cUSD
            celoEquivalent = getTokenToCeloEquivalent(_token, _amount);
        } else {
            revert("SEVAS: Only CELO and cUSD can be used for voting");
        }
        
        pool.totalVotes += celoEquivalent;
        
        // Update campaign funding from votes
        Campaign storage campaign = campaigns[pool.campaignId];
        campaign.totalFunds += celoEquivalent; // Use CELO equivalent for total funds
        campaign.tokenAmounts[_token] += _amount;
        
        // CRITICAL: Populate V4 data structures for backward compatibility
        uint256 campaignId = pool.campaignId;
        
        // Update V4 userVotes mapping
        userVotes[campaignId][_msgSender()][_projectId][_token] += _amount;
        
        // Update V4 participation data
        ProjectParticipation storage participation = projectParticipations[campaignId][_projectId];
        participation.tokenVotes[_token] += _amount;
        participation.voteCount += celoEquivalent; // Use CELO equivalent for vote count
        
        // Update total user votes in campaign
        totalUserVotesInCampaign[campaignId][_msgSender()] += celoEquivalent; // Use CELO equivalent
        
        // Track used tokens in campaign
        if (!isTokenUsedInCampaign[campaignId][_token]) {
            campaignUsedTokens[campaignId].push(_token);
            isTokenUsedInCampaign[campaignId][_token] = true;
        }
        
        userVoteHistory[_msgSender()].push(Vote({
            voter: _msgSender(),
            campaignId: campaignId,
            projectId: _projectId,
            token: _token,
            amount: _amount,
            celoEquivalent: celoEquivalent,
            timestamp: block.timestamp
        }));
        
        emit VoteCast(_msgSender(), campaignId, _projectId, _token, _amount, celoEquivalent);
    }
    
    // Campaign Fund Distribution
    function distributeCampaignFunds(
        uint256 _campaignId,
        uint256[] memory _projectIds,
        uint256[] memory _amounts,
        address _token
    ) external nonReentrant campaignExists(_campaignId) campaignAdmin(_campaignId) whenNotPaused {
        require(_projectIds.length == _amounts.length, "SEVAS: Arrays length mismatch");
        require(_projectIds.length > 0, "SEVAS: No projects to distribute to");
        
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "SEVAS: Campaign must be active");
        require(block.timestamp > campaign.endTime, "SEVAS: Campaign not ended yet");
        
        uint256 totalDistributed = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "SEVAS: Amount must be greater than 0");
            totalDistributed += _amounts[i];
        }
        
        require(totalDistributed <= campaign.totalFunds, "SEVAS: Insufficient campaign funds");
        require(campaign.tokenAmounts[_token] >= totalDistributed, "SEVAS: Insufficient token balance");
        
        // Distribute funds to projects
        for (uint256 i = 0; i < _projectIds.length; i++) {
            require(projects[_projectIds[i]].id != 0, "SEVAS: Project does not exist");
            
            if (_token == nativeToken) {
                payable(projects[_projectIds[i]].owner).transfer(_amounts[i]);
            } else {
                IERC20(_token).safeTransfer(projects[_projectIds[i]].owner, _amounts[i]);
            }
        }
        
        // Update campaign state
        campaign.totalFunds -= totalDistributed;
        campaign.tokenAmounts[_token] -= totalDistributed;
        
        emit CampaignFundsDistributed(_campaignId, _projectIds, _amounts, _token);
    }
    
    // Campaign Admin Withdrawal (Emergency/Admin use)
    function withdrawCampaignFunds(
        uint256 _campaignId,
        address _token,
        uint256 _amount
    ) external nonReentrant campaignExists(_campaignId) campaignAdmin(_campaignId) whenNotPaused {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "SEVAS: Campaign must be active");
        require(_amount > 0, "SEVAS: Amount must be greater than 0");
        require(campaign.tokenAmounts[_token] >= _amount, "SEVAS: Insufficient token balance");
        
        campaign.totalFunds -= _amount;
        campaign.tokenAmounts[_token] -= _amount;
        
        if (_token == nativeToken) {
            payable(_msgSender()).transfer(_amount);
        } else {
            IERC20(_token).safeTransfer(_msgSender(), _amount);
        }
        
        emit CampaignFundsWithdrawn(_campaignId, _msgSender(), _token, _amount);
    }

    // View Functions
    function getProject(uint256 _projectId) external view returns (
        uint256 id,
        address owner,
        string memory name,
        string memory description,
        bool transferrable,
        bool active,
        uint256 createdAt,
        uint256[] memory projectCampaignIds
    ) {
        Project storage project = projects[_projectId];
        return (
            project.id,
            project.owner,
            project.name,
            project.description,
            project.transferrable,
            project.active,
            project.createdAt,
            project.campaignIds
        );
    }
    
    function getCampaign(uint256 _campaignId) external view returns (
        address admin,
        string memory name,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        bool active,
        uint256 totalFunds,
        uint256 createdAt
    ) {
        Campaign storage campaign = campaigns[_campaignId];
        return (
            campaign.admin,
            campaign.name,
            campaign.description,
            campaign.startTime,
            campaign.endTime,
            campaign.active,
            campaign.totalFunds,
            campaign.createdAt
        );
    }
    
    // Note: To get all token balances, call getCampaignTokenBalance for each supported token
    
    function getCampaignTokenBalance(uint256 _campaignId, address _token) external view returns (uint256) {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.id != 0, "SEVAS: Campaign does not exist");
        return campaign.tokenAmounts[_token];
    }
    
    // Campaign Fund Breakdown - Comprehensive view of all funding sources
    function getCampaignFundBreakdown(uint256 _campaignId) external view returns (
        uint256 totalFunds,
        uint256 totalVotes,
        uint256 totalDonations,
        uint256[] memory tokenBalances,
        address[] memory campaignSupportedTokens,
        bool hasActivePools,
        uint256 poolCount
    ) {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.id != 0, "SEVAS: Campaign does not exist");
        
        totalFunds = campaign.totalFunds;
        
        // Count total votes across all pools in this campaign
        totalVotes = 0;
        totalDonations = 0;
        poolCount = 0;
        hasActivePools = false;
        
        for (uint256 i = 0; i < poolIds.length; i++) {
            FundPool storage pool = pools[poolIds[i]];
            if (pool.campaignId == _campaignId) {
                poolCount++;
                totalVotes += pool.totalVotes;
                totalDonations += pool.totalDonations;
                
                if (pool.active && block.timestamp >= pool.startTime && block.timestamp <= pool.endTime) {
                    hasActivePools = true;
                }
            }
        }
        
        // Get token balances for all supported tokens
        uint256 tokenCount = 0;
        address[] memory tempTokens = new address[](10); // Max 10 supported tokens
        uint256[] memory tempBalances = new uint256[](10);
        
        // Check native token (CELO)
        if (campaign.tokenAmounts[nativeToken] > 0) {
            tempTokens[tokenCount] = nativeToken;
            tempBalances[tokenCount] = campaign.tokenAmounts[nativeToken];
            tokenCount++;
        }
        
        // Check cUSD token
        if (campaign.tokenAmounts[cusdToken] > 0) {
            tempTokens[tokenCount] = cusdToken;
            tempBalances[tokenCount] = campaign.tokenAmounts[cusdToken];
            tokenCount++;
        }
        
        // Create properly sized arrays
        campaignSupportedTokens = new address[](tokenCount);
        tokenBalances = new uint256[](tokenCount);
        
        for (uint256 i = 0; i < tokenCount; i++) {
            campaignSupportedTokens[i] = tempTokens[i];
            tokenBalances[i] = tempBalances[i];
        }
    }
    
    function getUserVoteHistory(address _user) external view returns (Vote[] memory) {
        return userVoteHistory[_user];
    }

    // Admin Functions
    function setTokenSupport(address _token, bool _supported) external onlyRole(MANAGER_ROLE) whenNotPaused {
        supportedTokens[_token] = _supported;
    }
    
    function setTokenVoting(address _token, bool _enabled) external onlyRole(MANAGER_ROLE) whenNotPaused {
        require(supportedTokens[_token], "SEVAS: Token must be supported first");
        votingTokens[_token] = _enabled;
    }

    // Receive function for CELO donations
    receive() external payable {
        // Allow direct CELO transfers
    }

    // V4 compatibility view functions - REMOVED DUPLICATE
    
    // REMOVED DUPLICATE getCampaignVotedTokens function
    
    function getProjectCount() external view returns (uint256) { 
        return nextProjectId; 
    }
    
    function getCampaignCount() external view returns (uint256) { 
        return nextCampaignId; 
    }
    
    function isTokenSupported(address _token) external view returns (bool) { 
        return supportedTokens[_token]; 
    }
    
    function getDataStructureVersion(string memory _dataType) external view returns (uint256) { 
        return dataStructureVersions[_dataType]; 
    }
    
    function getSortedProjects(uint256 _campaignId) external view returns (uint256[] memory) {
        return getSortedProjectIdsByCampaign(_campaignId);
    }
    
    function getProjectV4(uint256 _projectId) external view returns (
        uint256 id,
        address owner,
        string memory name,
        string memory description,
        bool transferrable,
        bool active,
        uint256 createdAt,
        uint256[] memory projectCampaignIds
    ) {
        Project storage project = projects[_projectId];
        return (
            project.id,
            project.owner,
            project.name,
            project.description,
            project.transferrable,
            project.active,
            project.createdAt,
            project.campaignIds
        );
    }
    
    function getProjectMetadata(uint256 _projectId) external view returns (
        string memory bio,
        string memory contractInfo,
        string memory additionalData,
        address[] memory contracts
    ) {
        Project storage project = projects[_projectId];
        return (
            project.bio,
            project.contractInfo,
            project.additionalData,
            project.contracts
        );
    }
    
    function getCampaignV4(uint256 _campaignId) external view returns (
        uint256 id,
        address admin,
        string memory name,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        uint256 adminFeePercentage,
        uint256 maxWinners,
        bool useQuadraticDistribution,
        bool useCustomDistribution,
        address payoutToken,
        bool active,
        uint256 totalFunds
    ) {
        Campaign storage campaign = campaigns[_campaignId];
        return (
            campaign.id,
            campaign.admin,
            campaign.name,
            campaign.description,
            campaign.startTime,
            campaign.endTime,
            campaign.adminFeePercentage,
            campaign.maxWinners,
            campaign.useQuadraticDistribution,
            campaign.useCustomDistribution,
            campaign.payoutToken,
            campaign.active,
            campaign.totalFunds
        );
    }
    
    function getCampaignMetadata(uint256 _campaignId) external view returns (
        string memory mainInfo,
        string memory additionalInfo,
        string memory customDistributionData
    ) {
        Campaign storage campaign = campaigns[_campaignId];
        return (
            campaign.mainInfo,
            campaign.additionalInfo,
            campaign.customDistributionData
        );
    }
    
    // REMOVED DUPLICATE getUserVotesForProjectWithToken function
    
    // REMOVED DUPLICATE getUserTotalVotesInCampaign function
    
    // Campaign Pool Management Utilities
    function getCampaignPools(uint256 _campaignId) external view returns (uint256[] memory) {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.id != 0, "SEVAS: Campaign does not exist");
        return campaign.poolIds;
    }
    
    function createAdditionalPool(
        uint256 _campaignId,
        string memory _name,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime
    ) external campaignAdmin(_campaignId) whenNotPaused {
        require(_startTime < _endTime, "SEVAS: Invalid time range");
        require(_startTime > block.timestamp, "SEVAS: Start time must be in future");
        
        // Generate unique pool ID
        uint256 poolId = uint256(keccak256(abi.encodePacked(_campaignId, "ADDITIONAL_POOL", block.timestamp)));
        
        // Ensure pool ID is unique
        while (pools[poolId].id != 0) {
            poolId = uint256(keccak256(abi.encodePacked(poolId, "ADDITIONAL_POOL", block.timestamp)));
        }
        
        FundPool storage pool = pools[poolId];
        pool.id = poolId;
        pool.campaignId = _campaignId;
        pool.name = _name;
        pool.description = _description;
        pool.startTime = _startTime;
        pool.endTime = _endTime;
        pool.active = true;
        pool.fundsDistributed = false;
        pool.createdAt = block.timestamp;
        pool.officialStatus = OfficialStatus.PENDING;
        
        poolIds.push(poolId);
        
        // Link pool to campaign
        Campaign storage campaign = campaigns[_campaignId];
        campaign.poolIds.push(poolId);
        
        emit PoolCreated(poolId, _campaignId, _name);
    }
    
    function getCampaignOverview(uint256 _campaignId) external view returns (
        string memory name,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        bool active,
        uint256 totalFunds,
        uint256 poolCount,
        uint256 projectCount,
        uint256 totalVotes,
        uint256 totalDonations,
        address admin,
        bool autoPoolCreated
    ) {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.id != 0, "SEVAS: Campaign does not exist");
        
        // Count pools
        poolCount = campaign.poolIds.length;
        
        // Count projects
        projectCount = 0;
        for (uint256 i = 0; i < projectIds.length; i++) {
            if (projects[projectIds[i]].campaignParticipation[_campaignId]) {
                projectCount++;
            }
        }
        
        // Count total votes and donations across all pools
        totalVotes = 0;
        totalDonations = 0;
        for (uint256 i = 0; i < campaign.poolIds.length; i++) {
            FundPool storage pool = pools[campaign.poolIds[i]];
            totalVotes += pool.totalVotes;
            totalDonations += pool.totalDonations;
        }
        
        return (
            campaign.name,
            campaign.description,
            campaign.startTime,
            campaign.endTime,
            campaign.active,
            campaign.totalFunds,
            poolCount,
            projectCount,
            totalVotes,
            totalDonations,
            campaign.admin,
            campaign.autoPoolCreated
        );
    }
    
    // REMOVED DUPLICATE getCampaignStats function
    
    // Enhanced Fund Pool System Functions
    function allocateFundsToProject(
        uint256 _poolId,
        uint256 _projectId,
        uint256 _amount,
        address _claimableBy,
        uint256 _claimDelay,
        string memory _reason,
        string memory _metadata
    ) external poolExists(_poolId) projectExists(_projectId) whenNotPaused {
        require(_amount > 0, "SEVAS: Amount must be greater than 0");
        require(_claimableBy != address(0), "SEVAS: Invalid claimable address");
        
        FundPool storage pool = pools[_poolId];
        require(pool.active, "SEVAS: Pool not active");
        require(block.timestamp <= pool.endTime, "SEVAS: Pool ended");
        
        // Check if caller is pool admin or campaign admin
        Campaign storage campaign = campaigns[pool.campaignId];
        require(
            _msgSender() == campaign.admin || 
            campaign.campaignAdmins[_msgSender()] || 
            hasRole(ADMIN_ROLE, _msgSender()),
            "SEVAS: Only pool/campaign admin can allocate funds"
        );
        
        // Check if project is in the campaign
        require(projects[_projectId].campaignParticipation[pool.campaignId], "SEVAS: Project not in campaign");
        
        // Create project pool if it doesn't exist
        if (!projectPoolExists[_projectId][_poolId]) {
            uint256 projectPoolId = nextProjectPoolId;
            nextProjectPoolId++;
            
            ProjectPool storage projectPool = projectPools[projectPoolId];
            projectPool.id = projectPoolId;
            projectPool.projectId = _projectId;
            projectPool.poolId = _poolId;
            projectPool.allocatedAmount = _amount;
            projectPool.claimedAmount = 0;
            projectPool.active = true;
            projectPool.claimable = _claimDelay == 0;
            projectPool.claimableAt = _claimDelay == 0 ? block.timestamp : block.timestamp + _claimDelay;
            projectPool.createdAt = block.timestamp;
            projectPool.claimableBy = _claimableBy;
            projectPool.metadata = _metadata;
            
            // Link to pool and project
            poolProjectPools[_poolId].push(projectPoolId);
            projectProjectPools[_projectId].push(projectPoolId);
            projectPoolExists[_projectId][_poolId] = true;
            
            emit ProjectPoolCreated(projectPoolId, _projectId, _poolId, _amount, _claimableBy);
        } else {
            // Update existing project pool
            uint256[] storage poolPools = poolProjectPools[_poolId];
            for (uint256 i = 0; i < poolPools.length; i++) {
                if (projectPools[poolPools[i]].projectId == _projectId) {
                    ProjectPool storage projectPool = projectPools[poolPools[i]];
                    projectPool.allocatedAmount += _amount;
                    projectPool.claimable = _claimDelay == 0;
                    projectPool.claimableAt = _claimDelay == 0 ? block.timestamp : block.timestamp + _claimDelay;
                    projectPool.metadata = _metadata;
                    
                    emit ProjectPoolUpdated(poolPools[i], projectPool.allocatedAmount, projectPool.claimable, projectPool.claimableAt);
                    break;
                }
            }
        }
        
        // Create fund allocation record
        uint256 allocationId = nextFundAllocationId;
        nextFundAllocationId++;
        
        FundAllocation storage allocation = fundAllocations[allocationId];
        allocation.id = allocationId;
        allocation.poolId = _poolId;
        allocation.projectId = _projectId;
        allocation.amount = _amount;
        allocation.allocatedAt = block.timestamp;
        allocation.allocatedBy = _msgSender();
        allocation.active = true;
        allocation.reason = _reason;
        
        emit FundAllocated(allocationId, _poolId, _projectId, _amount, _reason);
    }
    
    function claimProjectPoolFunds(
        uint256 _projectPoolId,
        address _recipient
    ) external whenNotPaused {
        ProjectPool storage projectPool = projectPools[_projectPoolId];
        require(projectPool.id != 0, "SEVAS: Project pool does not exist");
        require(projectPool.active, "SEVAS: Project pool not active");
        require(projectPool.claimable, "SEVAS: Funds not yet claimable");
        require(block.timestamp >= projectPool.claimableAt, "SEVAS: Claim time not reached");
        require(projectPool.allocatedAmount > projectPool.claimedAmount, "SEVAS: No funds to claim");
        
        // Check if caller is authorized to claim
        require(
            _msgSender() == projectPool.claimableBy || 
            _msgSender() == projects[projectPool.projectId].owner ||
            hasRole(ADMIN_ROLE, _msgSender()),
            "SEVAS: Not authorized to claim"
        );
        
        uint256 claimableAmount = projectPool.allocatedAmount - projectPool.claimedAmount;
        projectPool.claimedAmount = projectPool.allocatedAmount;
        
        // Transfer funds
        FundPool storage pool = pools[projectPool.poolId];
        if (pool.totalDonations > 0) {
            // Transfer from pool donations
            pool.totalDonations -= claimableAmount;
            payable(_recipient).transfer(claimableAmount);
        } else {
            // Transfer from campaign funds
            Campaign storage campaign = campaigns[pool.campaignId];
            campaign.totalFunds -= claimableAmount;
            payable(_recipient).transfer(claimableAmount);
        }
        
        emit ProjectPoolClaimed(_projectPoolId, projectPool.projectId, projectPool.poolId, _recipient, claimableAmount);
    }
    
    function setPoolClaimDelay(
        uint256 _poolId,
        uint256 _claimDelay
    ) external poolExists(_poolId) whenNotPaused {
        FundPool storage pool = pools[_poolId];
        Campaign storage campaign = campaigns[pool.campaignId];
        
        require(
            _msgSender() == campaign.admin || 
            campaign.campaignAdmins[_msgSender()] || 
            hasRole(ADMIN_ROLE, _msgSender()),
            "SEVAS: Only pool/campaign admin can set claim delay"
        );
        
        poolDefaultClaimDelay[_poolId] = _claimDelay;
        emit PoolClaimDelaySet(_poolId, _claimDelay);
    }
    
    function enablePoolMilestones(
        uint256 _poolId,
        bool _enabled
    ) external poolExists(_poolId) whenNotPaused {
        FundPool storage pool = pools[_poolId];
        Campaign storage campaign = campaigns[pool.campaignId];
        
        require(
            _msgSender() == campaign.admin || 
            campaign.campaignAdmins[_msgSender()] || 
            hasRole(ADMIN_ROLE, _msgSender()),
            "SEVAS: Only pool/campaign admin can enable milestones"
        );
        
        poolMilestoneEnabled[_poolId] = _enabled;
        emit PoolMilestoneEnabled(_poolId, _enabled);
    }
    
    function getProjectPoolInfo(uint256 _projectPoolId) external view returns (
        uint256 projectId,
        uint256 poolId,
        uint256 allocatedAmount,
        uint256 claimedAmount,
        bool active,
        bool claimable,
        uint256 claimableAt,
        address claimableBy,
        string memory metadata
    ) {
        ProjectPool storage projectPool = projectPools[_projectPoolId];
        require(projectPool.id != 0, "SEVAS: Project pool does not exist");
        
        return (
            projectPool.projectId,
            projectPool.poolId,
            projectPool.allocatedAmount,
            projectPool.claimedAmount,
            projectPool.active,
            projectPool.claimable,
            projectPool.claimableAt,
            projectPool.claimableBy,
            projectPool.metadata
        );
    }
    
    function getPoolProjectPools(uint256 _poolId) external view returns (uint256[] memory) {
        return poolProjectPools[_poolId];
    }
    
    function getProjectProjectPools(uint256 _projectId) external view returns (uint256[] memory) {
        return projectProjectPools[_projectId];
    }
    
    function getProjectPoolClaimableAmount(uint256 _projectPoolId) external view returns (uint256) {
        ProjectPool storage projectPool = projectPools[_projectPoolId];
        require(projectPool.id != 0, "SEVAS: Project pool does not exist");
        
        if (!projectPool.claimable || block.timestamp < projectPool.claimableAt) {
            return 0;
        }
        
        return projectPool.allocatedAmount - projectPool.claimedAmount;
    }

    // CRITICAL: Missing V4 voting functions
    function voteV4(uint256 _campaignId, uint256 _projectId, address _token, uint256 _amount, bytes32 _bypassCode) external nonReentrant whenNotPaused {
        require(_token != address(celoToken), "SEVAS: Use voteWithCelo for CELO voting");
        _voteWithToken(_campaignId, _projectId, _token, _amount, _bypassCode);
    }

    function voteWithCelo(uint256 _campaignId, uint256 _projectId, bytes32 _bypassCode) external payable nonReentrant whenNotPaused {
        require(msg.value > 0, "SEVAS: Must send CELO to vote");
        _voteWithCelo(_campaignId, _projectId, msg.value, _bypassCode);
    }

    function _voteWithToken(
        uint256 _campaignId, 
        uint256 _projectId, 
        address _token, 
        uint256 _amount, 
        bytes32 _bypassCode
    ) internal {
        Campaign storage campaign = campaigns[_campaignId];
        require(
            campaign.active && 
            block.timestamp >= campaign.startTime && 
            block.timestamp <= campaign.endTime, 
            "SEVAS: Campaign not active or ended"
        );
        require(
            projects[_projectId].campaignParticipation[_campaignId], 
            "SEVAS: Project not in campaign"
        );
        
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        require(
            participation.approved && supportedTokens[_token] && _amount > 0, 
            "SEVAS: Project not approved, token not supported, or invalid amount"
        );
        
        uint256 celoEquivalent = getTokenToCeloEquivalent(_token, _amount);
        
        if (!isTokenUsedInCampaign[_campaignId][_token]) {
            campaignUsedTokens[_campaignId].push(_token);
            isTokenUsedInCampaign[_campaignId][_token] = true;
        }
        
        if (_bypassCode != bypassSecretCode) {
            uint256 maxVoteAmount = campaign.userMaxVoteAmount[_msgSender()];
            if (maxVoteAmount > 0) {
                require(
                    totalUserVotesInCampaign[_campaignId][_msgSender()] + celoEquivalent <= maxVoteAmount, 
                    "SEVAS: Exceeds max vote amount"
                );
            }
        }
        
        // ERC20 token transfer
        IERC20(_token).safeTransferFrom(_msgSender(), address(this), _amount);
        
        _updateVoteData(_campaignId, _projectId, _token, _amount, celoEquivalent);
    }

    function _voteWithCelo(
        uint256 _campaignId, 
        uint256 _projectId, 
        uint256 _amount, 
        bytes32 _bypassCode
    ) internal {
        Campaign storage campaign = campaigns[_campaignId];
        require(
            campaign.active && 
            block.timestamp >= campaign.startTime && 
            block.timestamp <= campaign.endTime, 
            "SEVAS: Campaign not active or ended"
        );
        require(
            projects[_projectId].campaignParticipation[_campaignId], 
            "SEVAS: Project not in campaign"
        );
        
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        require(participation.approved, "SEVAS: Project not approved");
        
        address celoAddress = address(celoToken);
        uint256 celoEquivalent = _amount; // CELO is 1:1 with itself
        
        if (!isTokenUsedInCampaign[_campaignId][celoAddress]) {
            campaignUsedTokens[_campaignId].push(celoAddress);
            isTokenUsedInCampaign[_campaignId][celoAddress] = true;
        }
        
        if (_bypassCode != bypassSecretCode) {
            uint256 maxVoteAmount = campaign.userMaxVoteAmount[_msgSender()];
            if (maxVoteAmount > 0) {
                require(
                    totalUserVotesInCampaign[_campaignId][_msgSender()] + celoEquivalent <= maxVoteAmount, 
                    "SEVAS: Exceeds max vote amount"
                );
            }
        }
        
        // No transfer needed - CELO already received via msg.value
        
        _updateVoteData(_campaignId, _projectId, celoAddress, _amount, celoEquivalent);
    }

    function _updateVoteData(
        uint256 _campaignId, 
        uint256 _projectId, 
        address _token, 
        uint256 _amount, 
        uint256 _celoEquivalent
    ) internal {
        Campaign storage campaign = campaigns[_campaignId];
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        
        userVotes[_campaignId][_msgSender()][_projectId][_token] += _amount;
        totalUserVotesInCampaign[_campaignId][_msgSender()] += _celoEquivalent;
        participation.voteCount += _celoEquivalent;
        participation.tokenVotes[_token] += _amount;
        campaign.tokenAmounts[_token] += _amount;
        campaign.totalFunds += _celoEquivalent;

        userVoteHistory[_msgSender()].push(Vote({
            voter: _msgSender(),
            campaignId: _campaignId,
            projectId: _projectId,
            token: _token,
            amount: _amount,
            celoEquivalent: _celoEquivalent,
            timestamp: block.timestamp
        }));

        emit VoteCast(_msgSender(), _campaignId, _projectId, _token, _amount, _celoEquivalent);
    }

    // CRITICAL: Missing V4 helper functions
    function getTokenToCeloEquivalent(address _token, uint256 _amount) public view returns (uint256) {
        if (_token == address(celoToken)) return _amount;
        TokenExchangeProvider storage provider = tokenExchangeProviders[_token];
        require(provider.active, "SEVAS: No active exchange provider for token");
        return IBroker(mentoTokenBroker).getAmountOut(
            provider.provider, 
            provider.exchangeId, 
            _token, 
            address(celoToken), 
            _amount
        );
    }

    // CRITICAL: Missing V4 helper functions
    function getProjectIdsByCampaign(uint256 _campaignId) internal view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < nextProjectId; i++) {
            if (projects[i].campaignParticipation[_campaignId]) count++;
        }
        uint256[] memory campaignProjectIds = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < nextProjectId; i++) {
            if (projects[i].campaignParticipation[_campaignId]) {
                campaignProjectIds[index++] = i;
            }
        }
        return campaignProjectIds;
    }

    function getSortedProjectIdsByCampaign(uint256 _campaignId) internal view returns (uint256[] memory) {
        uint256[] memory campaignProjectIds = getProjectIdsByCampaign(_campaignId);
        uint256 approvedCount = 0;
        for (uint256 i = 0; i < campaignProjectIds.length; i++) {
            if (projectParticipations[_campaignId][campaignProjectIds[i]].approved) approvedCount++;
        }
        uint256[] memory approvedProjectIds = new uint256[](approvedCount);
        uint256 index = 0;
        for (uint256 i = 0; i < campaignProjectIds.length; i++) {
            if (projectParticipations[_campaignId][campaignProjectIds[i]].approved) {
                approvedProjectIds[index++] = campaignProjectIds[i];
            }
        }
        // Bubble sort by vote count (descending)
        for (uint256 i = 0; i < approvedProjectIds.length; i++) {
            for (uint256 j = i + 1; j < approvedProjectIds.length; j++) {
                if (projectParticipations[_campaignId][approvedProjectIds[j]].voteCount > projectParticipations[_campaignId][approvedProjectIds[i]].voteCount) {
                    (approvedProjectIds[i], approvedProjectIds[j]) = (approvedProjectIds[j], approvedProjectIds[i]);
                }
            }
        }
        return approvedProjectIds;
    }

    function sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    // V6 Quality Control Functions
    function updateProjectStatus(
        uint256 _projectId, 
        OfficialStatus _newStatus, 
        string memory _reason
    ) external onlyRole(ADMIN_ROLE) projectExists(_projectId) {
        Project storage project = projects[_projectId];
        OfficialStatus oldStatus = project.officialStatus;
        project.officialStatus = _newStatus;
        
        emit ProjectStatusUpdated(_projectId, oldStatus, _newStatus, _msgSender(), _reason);
    }

    function updateCampaignStatus(
        uint256 _campaignId, 
        OfficialStatus _newStatus, 
        string memory _reason
    ) external onlyRole(ADMIN_ROLE) campaignExists(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        OfficialStatus oldStatus = campaign.officialStatus;
        campaign.officialStatus = _newStatus;
        
        emit CampaignStatusUpdated(_campaignId, oldStatus, _newStatus, _msgSender(), _reason);
    }

    function updatePoolStatus(
        uint256 _poolId, 
        OfficialStatus _newStatus, 
        string memory _reason
    ) external onlyRole(ADMIN_ROLE) poolExists(_poolId) {
        FundPool storage pool = pools[_poolId];
        OfficialStatus oldStatus = pool.officialStatus;
        pool.officialStatus = _newStatus;
        
        emit PoolStatusUpdated(_poolId, oldStatus, _newStatus, _msgSender(), _reason);
    }

    // Batch status update functions for efficiency
    function batchUpdateProjectStatus(
        uint256[] memory _projectIds, 
        OfficialStatus _newStatus, 
        string memory _reason
    ) external onlyRole(ADMIN_ROLE) {
        for (uint256 i = 0; i < _projectIds.length; i++) {
            require(projects[_projectIds[i]].id != 0, "SEVAS: Project does not exist");
            Project storage project = projects[_projectIds[i]];
            OfficialStatus oldStatus = project.officialStatus;
            project.officialStatus = _newStatus;
            
            emit ProjectStatusUpdated(_projectIds[i], oldStatus, _newStatus, _msgSender(), _reason);
        }
    }

    function batchUpdateCampaignStatus(
        uint256[] memory _campaignIds, 
        OfficialStatus _newStatus, 
        string memory _reason
    ) external onlyRole(ADMIN_ROLE) {
        for (uint256 i = 0; i < _campaignIds.length; i++) {
            require(campaigns[_campaignIds[i]].id != 0, "SEVAS: Campaign does not exist");
            Campaign storage campaign = campaigns[_campaignIds[i]];
            OfficialStatus oldStatus = campaign.officialStatus;
            campaign.officialStatus = _newStatus;
            
            emit CampaignStatusUpdated(_campaignIds[i], oldStatus, _newStatus, _msgSender(), _reason);
        }
    }

    // View functions to get official status
    function getProjectOfficialStatus(uint256 _projectId) external view returns (OfficialStatus) {
        require(projects[_projectId].id != 0, "SEVAS: Project does not exist");
        return projects[_projectId].officialStatus;
    }

    function getCampaignOfficialStatus(uint256 _campaignId) external view returns (OfficialStatus) {
        require(campaigns[_campaignId].id != 0, "SEVAS: Campaign does not exist");
        return campaigns[_campaignId].officialStatus;
    }

    function getPoolOfficialStatus(uint256 _poolId) external view returns (OfficialStatus) {
        require(pools[_poolId].id != 0, "SEVAS: Pool does not exist");
        return pools[_poolId].officialStatus;
    }

    // V4 Fee System Implementation
    function _validateAndCollectFee(
        address _feeToken, 
        uint256 _baseFee, 
        string memory _feeType, 
        uint256 _campaignId
    ) internal {
        require(supportedTokens[_feeToken], "SEVAS: Fee token not supported");
        if (canBypassFees(_campaignId, _msgSender())) return;
        
        uint256 feeAmount;
        if (_feeToken == address(celoToken)) {
            feeAmount = _baseFee;
        } else {
            feeAmount = (IBroker(mentoTokenBroker).getAmountOut(
                tokenExchangeProviders[address(celoToken)].provider, 
                tokenExchangeProviders[address(celoToken)].exchangeId, 
                address(celoToken), 
                _feeToken, 
                _baseFee
            ) * 101) / 100;
        }
        
        collectFee(_feeToken, feeAmount, _feeType);
    }

    function collectFee(address _token, uint256 _amount, string memory _feeType) internal {
        require(supportedTokens[_token], "SEVAS: Token not supported");
        
        if (_token == address(celoToken)) {
            collectFeeNative(_amount, _feeType);
        } else {
            collectFeeERC20(_token, _amount, _feeType);
        }
    }

    function collectFeeNative(uint256 _amount, string memory _feeType) internal {
        require(msg.value >= _amount, "SEVAS: Insufficient CELO sent");
        collectedFees[address(celoToken)] += _amount;
        emit FeeCollected(address(celoToken), _amount, _feeType);
        
        // Refund excess CELO
        if (msg.value > _amount) {
            payable(_msgSender()).transfer(msg.value - _amount);
        }
    }

    function collectFeeERC20(address _token, uint256 _amount, string memory _feeType) internal {
        require(supportedTokens[_token], "SEVAS: Token not supported");
        IERC20(_token).safeTransferFrom(_msgSender(), address(this), _amount);
        collectedFees[_token] += _amount;
        emit FeeCollected(_token, _amount, _feeType);
    }

    // REMOVED DUPLICATE withdrawFees function

    function canBypassFees(uint256 _campaignId, address _user) internal view returns (bool) {
        return superAdmins[_user] || (_campaignId > 0 && campaigns[_campaignId].campaignAdmins[_user]);
    }

    // V4 Token Conversion System
    function convertTokens(
        address _fromToken, 
        address _toToken, 
        uint256 _amount
    ) internal returns (uint256) {
        if (_fromToken == _toToken) return _amount;
        
        TokenExchangeProvider storage provider = tokenExchangeProviders[_fromToken];
        require(provider.active, "SEVAS: No active exchange provider for token");
        
        uint256 expectedAmountOut = IBroker(mentoTokenBroker).getAmountOut(
            provider.provider, 
            provider.exchangeId, 
            _fromToken, 
            _toToken, 
            _amount
        );
        uint256 minAmountOut = expectedAmountOut * 995 / 1000;
        
        if (IERC20(_fromToken).balanceOf(address(this)) < _amount) {
            IERC20(_fromToken).safeTransferFrom(_msgSender(), address(this), _amount);
        }
        
        uint256 receivedAmount = IBroker(mentoTokenBroker).swapIn(
            provider.provider, 
            provider.exchangeId, 
            _fromToken, 
            _toToken, 
            _amount, 
            minAmountOut
        );
        emit TokenConversionSucceeded(_fromToken, _toToken, _amount, receivedAmount);
        return receivedAmount;
    }

    function convertTokensExternal(
        address _fromToken, 
        address _toToken, 
        uint256 _amount
    ) external returns (uint256) {
        require(_msgSender() == address(this), "SEVAS: Unauthorized");
        return convertTokens(_fromToken, _toToken, _amount);
    }

    function adminForceConvertTokens(
        address _fromToken, 
        address _toToken, 
        uint256 _amount
    ) external onlySuperAdmin nonReentrant returns (uint256) {
        require(
            supportedTokens[_fromToken] && supportedTokens[_toToken] && _amount > 0, 
            "SEVAS: Invalid conversion parameters"
        );
        require(
            IERC20(_fromToken).balanceOf(address(this)) >= _amount, 
            "SEVAS: Insufficient token balance"
        );
        
        uint256 beforeBalance = IERC20(_toToken).balanceOf(address(this));
        uint256 convertedAmount = convertTokens(_fromToken, _toToken, _amount);
        uint256 afterBalance = IERC20(_toToken).balanceOf(address(this));
        
        require(afterBalance >= beforeBalance, "SEVAS: Conversion verification failed");
        emit TokenConversionSucceeded(_fromToken, _toToken, _amount, convertedAmount);
        return convertedAmount;
    }

    // V4 Core Functions - Project-Campaign Management
    function addProjectToCampaign(
        uint256 _campaignId, 
        uint256 _projectId, 
        address _feeToken
    ) external payable {
        require(
            campaigns[_campaignId].active && projects[_projectId].active, 
            "SEVAS: Campaign or project not active"
        );
        require(
            block.timestamp < campaigns[_campaignId].endTime, 
            "SEVAS: Campaign has ended"
        );
        require(
            _msgSender() == projects[_projectId].owner || 
            campaigns[_campaignId].campaignAdmins[_msgSender()] || 
            superAdmins[_msgSender()], 
            "SEVAS: Only project owner or campaign admin can add project to campaign"
        );
        require(
            !projects[_projectId].campaignParticipation[_campaignId], 
            "SEVAS: Project already in campaign"
        );
        
        _validateAndCollectFee(_feeToken, projectAdditionFee, "projectAddition", _campaignId);
        
        projects[_projectId].campaignIds.push(_campaignId);
        projects[_projectId].campaignParticipation[_campaignId] = true;
        
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        participation.projectId = _projectId;
        participation.campaignId = _campaignId;
        
        emit ProjectAddedToCampaign(_campaignId, _projectId);
    }

    function removeProjectFromCampaign(uint256 _campaignId, uint256 _projectId) external {
        require(
            _msgSender() == projects[_projectId].owner || 
            campaigns[_campaignId].campaignAdmins[_msgSender()] || 
            superAdmins[_msgSender()], 
            "SEVAS: Only project owner or campaign admin can remove project from campaign"
        );
        require(
            projects[_projectId].campaignParticipation[_campaignId] && 
            projectParticipations[_campaignId][_projectId].voteCount == 0, 
            "SEVAS: Project not in campaign or has votes"
        );
        
        uint256[] storage campaignIds = projects[_projectId].campaignIds;
        for (uint256 i = 0; i < campaignIds.length; i++) {
            if (campaignIds[i] == _campaignId) {
                campaignIds[i] = campaignIds[campaignIds.length - 1];
                campaignIds.pop();
                break;
            }
        }
        projects[_projectId].campaignParticipation[_campaignId] = false;
        emit ProjectRemovedFromCampaign(_campaignId, _projectId);
    }

    // REMOVED DUPLICATE approveProject function

    // V4 Fund Distribution System
    function distributeFunds(uint256 _campaignId) external nonReentrant onlyCampaignAdmin(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(
            campaign.active && block.timestamp > campaign.endTime, 
            "SEVAS: Campaign not ended or already finalized"
        );

        if (campaign.useCustomDistribution) return distributeCustom(_campaignId);

        campaign.active = false;
        address payoutToken = campaign.payoutToken;
        uint256 totalPayoutTokenAmount = campaign.tokenAmounts[payoutToken];
        
        // Convert all non-payout tokens to payout token
        address[] memory votedTokens = getCampaignVotedTokens(_campaignId);
        for (uint256 i = 0; i < votedTokens.length; i++) {
            address token = votedTokens[i];
            if (token != payoutToken && campaign.tokenAmounts[token] > 0) {
                try this.convertTokensExternal(token, payoutToken, campaign.tokenAmounts[token]) returns (uint256 amount) {
                    totalPayoutTokenAmount += amount;
                } catch {
                    emit TokenConversionFailed(_campaignId, token, campaign.tokenAmounts[token]);
                }
            }
        }

        uint256[] memory participatingProjectIds = getProjectIdsByCampaign(_campaignId);
        uint256 totalVotes = 0;
        for (uint256 i = 0; i < participatingProjectIds.length; i++) {
            if (projectParticipations[_campaignId][participatingProjectIds[i]].approved) {
                totalVotes += projectParticipations[_campaignId][participatingProjectIds[i]].voteCount;
            }
        }

        if (totalVotes == 0 || totalPayoutTokenAmount == 0) {
            emit FundsDistributedV4(_campaignId);
            return;
        }

        // Calculate fees
        uint256 platformFeeAmount = (totalPayoutTokenAmount * PLATFORM_FEE) / 100;
        uint256 adminFeeAmount = (totalPayoutTokenAmount * campaign.adminFeePercentage) / 100;
        uint256 remainingFunds = totalPayoutTokenAmount - platformFeeAmount - adminFeeAmount;

        // Transfer fees - handle native CELO vs ERC20
        if (platformFeeAmount > 0) {
            if (payoutToken == address(celoToken)) {
                payable(_msgSender()).transfer(platformFeeAmount);
            } else {
                IERC20(payoutToken).safeTransfer(_msgSender(), platformFeeAmount);
            }
        }
        
        if (adminFeeAmount > 0) {
            if (payoutToken == address(celoToken)) {
                payable(campaign.admin).transfer(adminFeeAmount);
            } else {
                IERC20(payoutToken).safeTransfer(campaign.admin, adminFeeAmount);
            }
        }

        // Distribute to winners
        uint256[] memory sortedProjectIds = getSortedProjectIdsByCampaign(_campaignId);
        uint256 winnersCount = campaign.maxWinners == 0 || campaign.maxWinners >= sortedProjectIds.length ? sortedProjectIds.length : campaign.maxWinners;
        
        uint256 actualWinners = 0;
        for (uint256 i = 0; i < winnersCount && i < sortedProjectIds.length; i++) {
            if (projectParticipations[_campaignId][sortedProjectIds[i]].voteCount > 0) actualWinners++;
            else break;
        }

        if (actualWinners == 0) {
            if (payoutToken == address(celoToken)) {
                payable(_msgSender()).transfer(remainingFunds);
            } else {
                IERC20(payoutToken).safeTransfer(_msgSender(), remainingFunds);
            }
            emit FundsDistributedV4(_campaignId);
            return;
        }

        _distributeToWinners(_campaignId, sortedProjectIds, actualWinners, remainingFunds, payoutToken, campaign.useQuadraticDistribution);
        emit FundsDistributedV4(_campaignId);
    }

    function _distributeToWinners(
        uint256 _campaignId, 
        uint256[] memory sortedProjectIds, 
        uint256 actualWinners, 
        uint256 remainingFunds, 
        address payoutToken, 
        bool useQuadratic
    ) internal {
        if (useQuadratic) {
            uint256[] memory weights = new uint256[](actualWinners);
            uint256 totalWeight = 0;
            for (uint256 i = 0; i < actualWinners; i++) {
                weights[i] = sqrt(projectParticipations[_campaignId][sortedProjectIds[i]].voteCount);
                totalWeight += weights[i];
            }
            for (uint256 i = 0; i < actualWinners; i++) {
                uint256 projectId = sortedProjectIds[i];
                uint256 projectShare = (remainingFunds * weights[i]) / totalWeight;
                _transferProjectFunds(_campaignId, projectId, projectShare, payoutToken);
            }
        } else {
            uint256 totalWinningVotes = 0;
            for (uint256 i = 0; i < actualWinners; i++) {
                totalWinningVotes += projectParticipations[_campaignId][sortedProjectIds[i]].voteCount;
            }
            for (uint256 i = 0; i < actualWinners; i++) {
                uint256 projectId = sortedProjectIds[i];
                uint256 projectShare = (remainingFunds * projectParticipations[_campaignId][sortedProjectIds[i]].voteCount) / totalWinningVotes;
                _transferProjectFunds(_campaignId, projectId, projectShare, payoutToken);
            }
        }
    }

    function _transferProjectFunds(
        uint256 _campaignId, 
        uint256 _projectId, 
        uint256 _amount, 
        address _token
    ) internal {
        if (_amount > 0) {
            projectParticipations[_campaignId][_projectId].fundsReceived += _amount;
            
            if (_token == address(celoToken)) {
                // Native CELO transfer
                payable(projects[_projectId].owner).transfer(_amount);
            } else {
                // ERC20 transfer
                IERC20(_token).safeTransfer(projects[_projectId].owner, _amount);
            }
            
            emit FundsDistributedToProject(_campaignId, _projectId, _amount, _token);
        }
    }

    function distributeCustom(uint256 _campaignId) internal {
        campaigns[_campaignId].active = false;
        emit CustomFundsDistributed(_campaignId, campaigns[_campaignId].customDistributionData);
    }

    function manualDistributeDetailed(
        uint256 _campaignId, 
        CustomDistributionDetails[] memory _distributions, 
        address _token
    ) external onlyCampaignAdmin(_campaignId) nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];
        require(
            !campaign.active || block.timestamp > campaign.endTime, 
            "SEVAS: Campaign not ended"
        );
        require(supportedTokens[_token], "SEVAS: Token not supported");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _distributions.length; i++) {
            totalAmount += _distributions[i].amount;
        }
        
        // Check balance based on token type
        if (_token == address(celoToken)) {
            require(address(this).balance >= totalAmount, "SEVAS: Insufficient CELO funds");
        } else {
            require(IERC20(_token).balanceOf(address(this)) >= totalAmount, "SEVAS: Insufficient funds");
        }
        
        for (uint256 i = 0; i < _distributions.length; i++) {
            CustomDistributionDetails memory dist = _distributions[i];
            require(
                projects[dist.projectId].campaignParticipation[_campaignId], 
                "SEVAS: Project not in campaign"
            );
            
            projectParticipations[_campaignId][dist.projectId].fundsReceived += dist.amount;
            if (dist.amount > 0) {
                if (_token == address(celoToken)) {
                    payable(projects[dist.projectId].owner).transfer(dist.amount);
                } else {
                    IERC20(_token).safeTransfer(projects[dist.projectId].owner, dist.amount);
                }
                emit ProjectFundsDistributedDetailed(
                    _campaignId, 
                    dist.projectId, 
                    dist.amount, 
                    _token, 
                    dist.comment, 
                    dist.jsonData
                );
            }
        }
        emit CustomFundsDistributed(_campaignId, "Detailed distribution completed");
    }

    // V4 Helper Functions - Missing Functions Added
    function getVotedTokensByProject(
        uint256 _campaignId, 
        uint256 _projectId
    ) internal view returns (address[] memory) {
        address[] memory campaignTokens = getCampaignVotedTokens(_campaignId);
        uint256 count = 0;
        for (uint256 i = 0; i < campaignTokens.length; i++) {
            if (projectParticipations[_campaignId][_projectId].tokenVotes[campaignTokens[i]] > 0) count++;
        }
        address[] memory tokenAddresses = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < campaignTokens.length; i++) {
            address token = campaignTokens[i];
            if (projectParticipations[_campaignId][_projectId].tokenVotes[token] > 0) {
                tokenAddresses[index++] = token;
            }
        }
        return tokenAddresses;
    }

    function getExpectedConversionRate(
        address _fromToken, 
        address _toToken, 
        uint256 _amount
    ) external view returns (uint256) {
        if (_fromToken == _toToken) return _amount;
        TokenExchangeProvider storage provider = tokenExchangeProviders[_fromToken];
        require(provider.active, "SEVAS: No active exchange provider for token");
        return IBroker(mentoTokenBroker).getAmountOut(
            provider.provider, 
            provider.exchangeId, 
            _fromToken, 
            _toToken, 
            _amount
        );
    }

    function isCampaignAdmin(uint256 _campaignId, address _admin) external view returns (bool) {
        if (_campaignId >= nextCampaignId) return false;
        return campaigns[_campaignId].admin == _admin || 
               campaigns[_campaignId].campaignAdmins[_admin] || 
               superAdmins[_admin];
    }

    function getTokenExchangeProvider(
        address _token
    ) external view returns (address provider, bytes32 exchangeId, bool active) {
        TokenExchangeProvider storage tokenProvider = tokenExchangeProviders[_token];
        return (tokenProvider.provider, tokenProvider.exchangeId, tokenProvider.active);
    }

    function getParticipation(
        uint256 _campaignId, 
        uint256 _projectId
    ) external view returns (bool approved, uint256 voteCount, uint256 fundsReceived) {
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        return (participation.approved, participation.voteCount, participation.fundsReceived);
    }

    function getUserVotesForProjectWithToken(
        uint256 _campaignId, 
        address _user, 
        uint256 _projectId, 
        address _token
    ) external view returns (uint256) {
        return userVotes[_campaignId][_user][_projectId][_token];
    }

    function getUserTotalVotesInCampaign(uint256 _campaignId, address _user) external view returns (uint256) {
        return totalUserVotesInCampaign[_campaignId][_user];
    }

    function getProjectTokenVotes(
        uint256 _campaignId, 
        uint256 _projectId, 
        address _token
    ) external view returns (uint256) {
        return projectParticipations[_campaignId][_projectId].tokenVotes[_token];
    }

    function getProjectVotedTokensWithAmounts(
        uint256 _campaignId, 
        uint256 _projectId
    ) external view returns (address[] memory tokens, uint256[] memory amounts) {
        address[] memory votedTokens = getVotedTokensByProject(_campaignId, _projectId);
        uint256[] memory tokenAmounts = new uint256[](votedTokens.length);
        for (uint256 i = 0; i < votedTokens.length; i++) {
            tokenAmounts[i] = projectParticipations[_campaignId][_projectId].tokenVotes[votedTokens[i]];
        }
        return (votedTokens, tokenAmounts);
    }

    // CRITICAL: Migration Functions to Preserve V4 Data
    function migrateSuperAdminToAccessControl(address _superAdmin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(superAdmins[_superAdmin], "SEVAS: Address is not a super admin");
        _grantRole(ADMIN_ROLE, _superAdmin);
        _grantRole(MANAGER_ROLE, _superAdmin);
        emit AdminAdded(_superAdmin, _superAdmin, 0, true);
    }

    // CRITICAL: Access Control Bridge - Check both systems
    function hasAccessControl(address _user, bytes32 _role) external view returns (bool) {
        return hasRole(_role, _user) || superAdmins[_user];
    }

    function isSuperAdmin(address _user) external view returns (bool) {
        return superAdmins[_user];
    }

    function addSuperAdmin(address _newSuperAdmin) external onlyRole(ADMIN_ROLE) {
        require(_newSuperAdmin != address(0), "SEVAS: Invalid address");
        require(!superAdmins[_newSuperAdmin], "SEVAS: Already a super admin");
        superAdmins[_newSuperAdmin] = true;
        emit AdminAdded(_newSuperAdmin, _msgSender(), 0, true);
    }

    function removeSuperAdmin(address _superAdmin) external onlyRole(ADMIN_ROLE) {
        require(_superAdmin != _msgSender(), "SEVAS: Cannot remove yourself");
        require(superAdmins[_superAdmin], "SEVAS: Not a super admin");
        superAdmins[_superAdmin] = false;
        emit AdminRemoved(_superAdmin, _msgSender(), 0, true);
    }

    function migrateAllSuperAdminsToAccessControl() external onlyRole(DEFAULT_ADMIN_ROLE) {
        // This would need to be called for each super admin
        // In production, you might want to batch this or use events to track
        emit DataStructureVersionUpdated("admin_system", 6, "Migrated from superAdmins to AccessControl");
    }

    function setBrokerAddress(address _broker) external onlyRole(ADMIN_ROLE) {
        mentoTokenBroker = _broker;
        emit BrokerUpdated(_broker);
    }

    function setCeloToken(address _celoToken) external onlyRole(ADMIN_ROLE) {
        celoToken = IERC20(_celoToken);
    }

    function setBypassSecretCode(bytes32 _newCode) external onlyRole(ADMIN_ROLE) {
        bypassSecretCode = _newCode;
        emit BypassCodeUpdated(_msgSender());
    }

    // CRITICAL: V4 Vote Casting Function - Must populate userVotes mapping
    function castVoteV4(
        uint256 _campaignId,
        uint256 _projectId,
        address _token,
        uint256 _amount
    ) external whenNotPaused activeCampaign(_campaignId) {
        require(_amount > 0, "SEVAS: Vote amount must be greater than 0");
        require(votingTokens[_token], "SEVAS: Token not supported for voting");
        require(projects[_projectId].active, "SEVAS: Project is not active");
        
        // Check if project is participating in campaign
        require(projects[_projectId].campaignParticipation[_campaignId], "SEVAS: Project not participating in campaign");
        
        // CRITICAL: Populate V4 userVotes mapping to preserve data structure
        userVotes[_campaignId][_msgSender()][_projectId][_token] += _amount;
        
        // Update V4 participation data
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        participation.tokenVotes[_token] += _amount;
        participation.voteCount += _amount;
        
        // Update total user votes in campaign
        totalUserVotesInCampaign[_campaignId][_msgSender()] += _amount;
        
        // Track used tokens in campaign
        if (!isTokenUsedInCampaign[_campaignId][_token]) {
            campaignUsedTokens[_campaignId].push(_token);
            isTokenUsedInCampaign[_campaignId][_token] = true;
        }
        
        // Create vote record
        Vote memory newVote = Vote({
            voter: _msgSender(),
            campaignId: _campaignId,
            projectId: _projectId,
            token: _token,
            amount: _amount,
            celoEquivalent: _amount, // Simplified for now
            timestamp: block.timestamp
        });
        
        userVoteHistory[_msgSender()].push(newVote);
        
        emit VoteCast(_msgSender(), _campaignId, _projectId, _token, _amount, _amount);
    }

    // CRITICAL: Original V4 vote function with exact signature (frontends expect this)
    function vote(
        uint256 _campaignId,
        uint256 _projectId,
        address _token,
        uint256 _amount,
        bytes32 _bypassCode
    ) external whenNotPaused activeCampaign(_campaignId) {
        require(_amount > 0, "SEVAS: Vote amount must be greater than 0");
        require(votingTokens[_token], "SEVAS: Token not supported for voting");
        require(projects[_projectId].active, "SEVAS: Project is not active");
        
        // Check if project is participating in campaign
        require(projects[_projectId].campaignParticipation[_campaignId], "SEVAS: Project not participating in campaign");
        
        // CRITICAL: Populate V4 userVotes mapping to preserve data structure
        userVotes[_campaignId][_msgSender()][_projectId][_token] += _amount;
        
        // Update V4 participation data
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        participation.tokenVotes[_token] += _amount;
        participation.voteCount += _amount;
        
        // Update total user votes in campaign
        totalUserVotesInCampaign[_campaignId][_msgSender()] += _amount;
        
        // Track used tokens in campaign
        if (!isTokenUsedInCampaign[_campaignId][_token]) {
            campaignUsedTokens[_campaignId].push(_token);
            isTokenUsedInCampaign[_campaignId][_token] = true;
        }
        
        // Create vote record
        Vote memory newVote = Vote({
            voter: _msgSender(),
            campaignId: _campaignId,
            projectId: _projectId,
            token: _token,
            amount: _amount,
            celoEquivalent: _amount, // Simplified for now
            timestamp: block.timestamp
        });
        
        userVoteHistory[_msgSender()].push(newVote);
        
        emit VoteCast(_msgSender(), _campaignId, _projectId, _token, _amount, _amount);
    }

    // CRITICAL: V4 Campaign Funding Function
    function fundCampaign(
        uint256 _campaignId,
        address _token,
        uint256 _amount
    ) external whenNotPaused activeCampaign(_campaignId) {
        require(_amount > 0, "SEVAS: Funding amount must be greater than 0");
        require(supportedTokens[_token], "SEVAS: Token not supported");
        
        // Transfer tokens from user to contract
        IERC20(_token).safeTransferFrom(_msgSender(), address(this), _amount);
        
        // Update campaign token amounts
        campaigns[_campaignId].tokenAmounts[_token] += _amount;
        campaigns[_campaignId].totalFunds += _amount;
        
        emit CampaignFunded(_campaignId, _msgSender(), _token, _amount);
    }

    // CRITICAL: V4 Project Addition to Campaign
    function addProjectToCampaignV4(
        uint256 _campaignId,
        uint256 _projectId
    ) external campaignAdmin(_campaignId) activeCampaign(_campaignId) projectExists(_projectId) {
        require(!projects[_projectId].campaignParticipation[_campaignId], "SEVAS: Project already participating");
        
        projects[_projectId].campaignParticipation[_campaignId] = true;
        projects[_projectId].campaignIds.push(_campaignId);
        campaigns[_campaignId].poolIds.push(_projectId); // Use projectId as poolId for V4 compatibility
        
        // Initialize participation
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        participation.projectId = _projectId;
        participation.campaignId = _campaignId;
        participation.approved = true;
        participation.voteCount = 0;
        participation.fundsReceived = 0;
        
        emit ProjectAddedToCampaign(_campaignId, _projectId);
    }

    // CRITICAL: V4 Project Approval Function
    function approveProject(
        uint256 _campaignId,
        uint256 _projectId
    ) external campaignAdmin(_campaignId) activeCampaign(_campaignId) {
        require(projects[_projectId].campaignParticipation[_campaignId], "SEVAS: Project not participating in campaign");
        
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        participation.approved = true;
        
        emit ProjectApproved(_campaignId, _projectId);
    }

    // CRITICAL: V4 Funds Distribution Function
    function distributeFundsToProject(
        uint256 _campaignId,
        uint256 _projectId,
        address _token,
        uint256 _amount
    ) external campaignAdmin(_campaignId) activeCampaign(_campaignId) {
        require(_amount > 0, "SEVAS: Amount must be greater than 0");
        require(campaigns[_campaignId].tokenAmounts[_token] >= _amount, "SEVAS: Insufficient campaign funds");
        require(projects[_projectId].campaignParticipation[_campaignId], "SEVAS: Project not participating in campaign");
        
        // Update campaign funds
        campaigns[_campaignId].tokenAmounts[_token] -= _amount;
        campaigns[_campaignId].totalFunds -= _amount;
        
        // Update project participation
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        participation.fundsReceived += _amount;
        
        // Transfer funds to project owner
        IERC20(_token).safeTransfer(projects[_projectId].owner, _amount);
        
        emit FundsDistributedToProject(_campaignId, _projectId, _amount, _token);
    }

    // CRITICAL: V4 Token Exchange Provider Management
    function setTokenExchangeProvider(
        address _token,
        address _provider,
        bytes32 _exchangeId
    ) external onlyRole(ADMIN_ROLE) {
        require(_token != address(0), "SEVAS: Invalid token address");
        require(_provider != address(0), "SEVAS: Invalid provider address");
        
        TokenExchangeProvider storage tokenProvider = tokenExchangeProviders[_token];
        tokenProvider.provider = _provider;
        tokenProvider.exchangeId = _exchangeId;
        tokenProvider.active = true;
        
        emit TokenExchangeProviderSet(_token, _provider, _exchangeId);
    }

    function deactivateTokenExchangeProvider(address _token) external onlyRole(ADMIN_ROLE) {
        TokenExchangeProvider storage tokenProvider = tokenExchangeProviders[_token];
        tokenProvider.active = false;
        
        emit TokenExchangeProviderDeactivated(_token);
    }

    // CRITICAL: V4 Fee Management
    function collectFees(address _token, uint256 _amount, string memory _feeType) external onlyRole(ADMIN_ROLE) {
        collectedFees[_token] += _amount;
        emit FeeCollected(_token, _amount, _feeType);
    }

    function withdrawFees(address _token, address _recipient, uint256 _amount) external onlyRole(ADMIN_ROLE) {
        require(collectedFees[_token] >= _amount, "SEVAS: Insufficient collected fees");
        collectedFees[_token] -= _amount;
        
        IERC20(_token).safeTransfer(_recipient, _amount);
        emit FeeWithdrawn(_token, _recipient, _amount);
    }

    // CRITICAL: V4 Emergency Functions
    function emergencyTokenRecovery(
        address _token,
        address _recipient,
        uint256 _amount
    ) external onlyRole(EMERGENCY_ROLE) {
        bool tokensNeeded = false;
        
        // Check if tokens are needed for active campaigns
        for (uint256 i = 0; i < campaignIds.length; i++) {
            uint256 campaignId = campaignIds[i];
            if (campaigns[campaignId].active && campaigns[campaignId].tokenAmounts[_token] > 0) {
                tokensNeeded = true;
                break;
            }
        }
        
        IERC20(_token).safeTransfer(_recipient, _amount);
        emit EmergencyTokenRecovery(_token, _recipient, _amount, tokensNeeded);
    }

    // CRITICAL: V4 Data Structure Version Management
    function updateDataStructureVersion(
        string memory _dataType,
        uint256 _newVersion,
        string memory _structureDescription
    ) external onlyRole(ADMIN_ROLE) {
        dataStructureVersions[_dataType] = _newVersion;
        emit DataStructureVersionUpdated(_dataType, _newVersion, _structureDescription);
    }

    // CRITICAL: V4 Token Management
    function addSupportedToken(address _token) external onlyRole(ADMIN_ROLE) {
        require(_token != address(0), "SEVAS: Invalid token address");
        require(!supportedTokens[_token], "SEVAS: Token already supported");
        
        supportedTokens[_token] = true;
        supportedTokensList.push(_token);
        
        emit TokenAdded(_token);
    }

    function removeSupportedToken(address _token) external onlyRole(ADMIN_ROLE) {
        require(supportedTokens[_token], "SEVAS: Token not supported");
        
        supportedTokens[_token] = false;
        votingTokens[_token] = false;
        
        // Remove from list (simplified - in production you might want to maintain order)
        for (uint256 i = 0; i < supportedTokensList.length; i++) {
            if (supportedTokensList[i] == _token) {
                supportedTokensList[i] = supportedTokensList[supportedTokensList.length - 1];
                supportedTokensList.pop();
                break;
            }
        }
        
        emit TokenRemoved(_token);
    }

    function addVotingToken(address _token) external onlyRole(ADMIN_ROLE) {
        require(supportedTokens[_token], "SEVAS: Token must be supported first");
        votingTokens[_token] = true;
    }

    function removeVotingToken(address _token) external onlyRole(ADMIN_ROLE) {
        votingTokens[_token] = false;
    }

    // CRITICAL: V4 View Functions for Frontend Compatibility
    function getCampaignVotedTokens(uint256 _campaignId) public view returns (address[] memory) {
        return campaignUsedTokens[_campaignId];
    }

    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokensList;
    }

    function getCampaignTokenAmount(uint256 _campaignId, address _token) external view returns (uint256) {
        return campaigns[_campaignId].tokenAmounts[_token];
    }

    function getProjectCampaignIds(uint256 _projectId) external view returns (uint256[] memory) {
        return projects[_projectId].campaignIds;
    }

    function isProjectParticipatingInCampaign(uint256 _projectId, uint256 _campaignId) external view returns (bool) {
        return projects[_projectId].campaignParticipation[_campaignId];
    }

    // CRITICAL: V4 to V6 Migration Helper
    function migrateV4VotesToPools(uint256 _campaignId) external onlyRole(ADMIN_ROLE) {
        require(campaigns[_campaignId].id != 0, "SEVAS: Campaign does not exist");
        
        // This function would create pools for projects based on V4 participation data
        // Implementation depends on your specific migration strategy
        emit CampaignMigrated(_campaignId, _msgSender());
    }

    // CRITICAL: Missing Core V4 Functions
    function updateFeeAmounts(uint256 _campaignFee, uint256 _projectFee) external onlyRole(ADMIN_ROLE) {
        campaignCreationFee = _campaignFee;
        projectAdditionFee = _projectFee;
        emit FeeAmountUpdated("campaign_creation", campaignCreationFee, _campaignFee);
        emit FeeAmountUpdated("project_addition", projectAdditionFee, _projectFee);
    }

    function createCampaignV4(
        string memory _name,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime,
        string memory _mainInfo,
        string memory _additionalInfo,
        uint256 _adminFeePercentage,
        uint256 _maxWinners,
        bool _useQuadraticDistribution,
        bool _useCustomDistribution,
        string memory _customDistributionData,
        address _payoutToken
    ) external payable whenNotPaused {
        require(msg.value >= campaignCreationFee, "SEVAS: Insufficient campaign creation fee");
        require(_startTime < _endTime, "SEVAS: Invalid time range");
        require(_startTime > block.timestamp, "SEVAS: Start time must be in future");
        
        uint256 campaignId = nextCampaignId;
        nextCampaignId++;
        
        Campaign storage campaign = campaigns[campaignId];
        campaign.id = campaignId;
        campaign.admin = _msgSender();
        campaign.name = _name;
        campaign.description = _description;
        campaign.startTime = _startTime;
        campaign.endTime = _endTime;
        campaign.active = true;
        campaign.totalFunds = 0;
        campaign.createdAt = block.timestamp;
        campaign.campaignAdmins[_msgSender()] = true;
        campaign.autoPoolCreated = false;
        campaign.mainInfo = _mainInfo;
        campaign.additionalInfo = _additionalInfo;
        campaign.adminFeePercentage = _adminFeePercentage;
        campaign.maxWinners = _maxWinners;
        campaign.useQuadraticDistribution = _useQuadraticDistribution;
        campaign.useCustomDistribution = _useCustomDistribution;
        campaign.customDistributionData = _customDistributionData;
        campaign.payoutToken = _payoutToken;
        campaign.officialStatus = OfficialStatus.PENDING;
        
        campaignIds.push(campaignId);
        emit CampaignCreated(campaignId, _name, _startTime, _endTime);
        
        // Automatically create the main fund pool
        _createAutoPool(campaignId, _name, _description, _startTime, _endTime);
    }

    function areTokensNeededForActiveCampaigns(address _token) external view returns (bool) {
        for (uint256 i = 0; i < campaignIds.length; i++) {
            uint256 campaignId = campaignIds[i];
            if (campaigns[campaignId].active && campaigns[campaignId].tokenAmounts[_token] > 0) {
                return true;
            }
        }
        return false;
    }

    function getCampaignFee() external view returns (uint256) {
        return campaignCreationFee;
    }

    function getProjectFee() external view returns (uint256) {
        return projectAdditionFee;
    }

    function getCampaignAdminFeePercentage(uint256 _campaignId) external view returns (uint256) {
        return campaigns[_campaignId].adminFeePercentage;
    }

    function getCampaignMaxWinners(uint256 _campaignId) external view returns (uint256) {
        return campaigns[_campaignId].maxWinners;
    }

    function isCampaignUsingQuadraticDistribution(uint256 _campaignId) external view returns (bool) {
        return campaigns[_campaignId].useQuadraticDistribution;
    }

    function isCampaignUsingCustomDistribution(uint256 _campaignId) external view returns (bool) {
        return campaigns[_campaignId].useCustomDistribution;
    }

    function getCampaignCustomDistributionData(uint256 _campaignId) external view returns (string memory) {
        return campaigns[_campaignId].customDistributionData;
    }

    function getCampaignPayoutToken(uint256 _campaignId) external view returns (address) {
        return campaigns[_campaignId].payoutToken;
    }

    // REMOVED DUPLICATE ADMIN FUNCTIONS - they already exist in the contract

    function addContractAdmin(address _newAdmin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_newAdmin != address(0), "SEVAS: Invalid admin address");
        require(!hasRole(ADMIN_ROLE, _newAdmin), "SEVAS: Already has ADMIN_ROLE");
        
        _grantRole(ADMIN_ROLE, _newAdmin);
        _grantRole(MANAGER_ROLE, _newAdmin);
        _grantRole(OPERATOR_ROLE, _newAdmin);
        
        emit AdminAdded(_newAdmin, _msgSender(), 0, true);
    }

    function removeContractAdmin(address _admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_admin != _msgSender(), "SEVAS: Cannot remove yourself");
        require(hasRole(ADMIN_ROLE, _admin), "SEVAS: Not an admin");
        
        _revokeRole(ADMIN_ROLE, _admin);
        _revokeRole(MANAGER_ROLE, _admin);
        _revokeRole(OPERATOR_ROLE, _admin);
        
        emit AdminRemoved(_admin, _msgSender(), 0, true);
    }

    function addManagerRole(address _newManager) external onlyRole(ADMIN_ROLE) {
        require(_newManager != address(0), "SEVAS: Invalid manager address");
        require(!hasRole(MANAGER_ROLE, _newManager), "SEVAS: Already has MANAGER_ROLE");
        
        _grantRole(MANAGER_ROLE, _newManager);
    }

    function removeManagerRole(address _manager) external onlyRole(ADMIN_ROLE) {
        require(_manager != _msgSender(), "SEVAS: Cannot remove yourself");
        require(hasRole(MANAGER_ROLE, _manager), "SEVAS: Not a manager");
        
        _revokeRole(MANAGER_ROLE, _manager);
    }

    function addOperatorRole(address _newOperator) external onlyRole(ADMIN_ROLE) {
        require(_newOperator != address(0), "SEVAS: Invalid operator address");
        require(!hasRole(OPERATOR_ROLE, _newOperator), "SEVAS: Already has OPERATOR_ROLE");
        
        _grantRole(OPERATOR_ROLE, _newOperator);
    }

    function removeOperatorRole(address _operator) external onlyRole(ADMIN_ROLE) {
        require(_operator != _msgSender(), "SEVAS: Cannot remove yourself");
        require(hasRole(OPERATOR_ROLE, _operator), "SEVAS: Not an operator");
        
        _revokeRole(OPERATOR_ROLE, _operator);
    }

    function getSupportedTokensCount() external view returns (uint256) {
        return supportedTokensList.length;
    }

    function getVotingTokensCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < supportedTokensList.length; i++) {
            if (votingTokens[supportedTokensList[i]]) {
                count++;
            }
        }
        return count;
    }

    function isTokenVotingEnabled(address _token) external view returns (bool) {
        return votingTokens[_token];
    }

    // CRITICAL: Additional V4 View Functions for Frontend Compatibility
    function getProjectParticipation(uint256 _campaignId, uint256 _projectId) external view returns (
        bool approved,
        uint256 voteCount,
        uint256 fundsReceived,
        address[] memory votedTokens,
        uint256[] memory tokenAmounts
    ) {
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        address[] memory tokens = getVotedTokensByProject(_campaignId, _projectId);
        uint256[] memory amounts = new uint256[](tokens.length);
        
        for (uint256 i = 0; i < tokens.length; i++) {
            amounts[i] = participation.tokenVotes[tokens[i]];
        }
        
        return (
            participation.approved,
            participation.voteCount,
            participation.fundsReceived,
            tokens,
            amounts
        );
    }

    function getCampaignStats(uint256 _campaignId) external view returns (
        uint256 totalProjects,
        uint256 approvedProjects,
        uint256 totalVotes,
        uint256 totalFunds,
        address[] memory campaignTokens,
        uint256[] memory tokenBalances
    ) {
        uint256 projectCount = 0;
        uint256 approvedCount = 0;
        uint256 totalVoteCount = 0;
        
        for (uint256 i = 0; i < projectIds.length; i++) {
            uint256 projectId = projectIds[i];
            if (projects[projectId].campaignParticipation[_campaignId]) {
                projectCount++;
                if (projectParticipations[_campaignId][projectId].approved) {
                    approvedCount++;
                    totalVoteCount += projectParticipations[_campaignId][projectId].voteCount;
                }
            }
        }
        
        address[] memory tokens = getCampaignVotedTokens(_campaignId);
        uint256[] memory balances = new uint256[](tokens.length);
        
        for (uint256 i = 0; i < tokens.length; i++) {
            balances[i] = campaigns[_campaignId].tokenAmounts[tokens[i]];
        }
        
        return (
            projectCount,
            approvedCount,
            totalVoteCount,
            campaigns[_campaignId].totalFunds,
            campaignTokens,
            balances
        );
    }

    function getUserVoteSummary(address _user, uint256 _campaignId) external view returns (
        uint256 totalVotes,
        uint256[] memory userProjectIds,
        address[] memory userTokens,
        uint256[] memory amounts
    ) {
        totalVotes = totalUserVotesInCampaign[_campaignId][_user];
        
        // Get unique projects and tokens the user voted for
        uint256[] memory tempProjectIds = new uint256[](100); // Temporary array
        address[] memory tempTokens = new address[](100);
        uint256[] memory tempAmounts = new uint256[](100);
        uint256 count = 0;
        
        for (uint256 i = 0; i < projectIds.length; i++) {
            uint256 projectId = projectIds[i];
            if (projects[projectId].campaignParticipation[_campaignId]) {
                address[] memory campaignTokens = getCampaignVotedTokens(_campaignId);
                for (uint256 j = 0; j < campaignTokens.length; j++) {
                    address token = campaignTokens[j];
                    uint256 amount = userVotes[_campaignId][_user][projectId][token];
                    if (amount > 0) {
                        tempProjectIds[count] = projectId;
                        tempTokens[count] = token;
                        tempAmounts[count] = amount;
                        count++;
                    }
                }
            }
        }
        
        // Create properly sized arrays
        userProjectIds = new uint256[](count);
        userTokens = new address[](count);
        amounts = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            userProjectIds[i] = tempProjectIds[i];
            userTokens[i] = tempTokens[i];
            amounts[i] = tempAmounts[i];
        }
        
        return (totalVotes, userProjectIds, userTokens, amounts);
    }

    function getProjectVoteBreakdown(uint256 _campaignId, uint256 _projectId) external view returns (
        address[] memory voters,
        address[] memory tokens,
        uint256[] memory amounts,
        uint256 totalVotes
    ) {
        // This is a simplified version - in production you might want to store this data more efficiently
        totalVotes = projectParticipations[_campaignId][_projectId].voteCount;
        
        // For now, return empty arrays as this would require additional storage
        // In production, you'd want to track individual votes more efficiently
        voters = new address[](0);
        tokens = new address[](0);
        amounts = new uint256[](0);
        
        return (voters, tokens, amounts, totalVotes);
    }

    // REMOVED DUPLICATE FUNCTIONS - they already exist in the contract
}
