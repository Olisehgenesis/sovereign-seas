// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/TimelockControllerUpgradeable.sol";

/**
 * @title ISovereignSeasV4 - Interface for V4 contract migration
 * @dev This interface defines the functions needed for V4 to V6 migration
 */
interface ISovereignSeasV4 {
    function getProject(uint256 projectId) external view returns (
        uint256 id,
        address payable owner,
        string memory name,
        string memory description,
        ProjectMetadata memory metadata,
        address[] memory contracts,
        bool transferrable,
        uint256[] memory campaignIds,
        bool active,
        uint256 createdAt
    );
    
    function getCampaign(uint256 campaignId) external view returns (
        uint256 id,
        address admin,
        string memory name,
        string memory description,
        CampaignMetadata memory metadata,
        uint256 startTime,
        uint256 endTime,
        uint256 adminFeePercentage,
        uint256 maxWinners,
        bool useQuadraticDistribution,
        bool useCustomDistribution,
        string memory customDistributionData,
        address payoutToken,
        bool active,
        uint256 totalFunds
    );
    
    function getProjectIds() external view returns (uint256[] memory);
    function getCampaignIds() external view returns (uint256[] memory);
    function getProjectParticipation(uint256 campaignId, uint256 projectId) external view returns (
        uint256 projectId_,
        uint256 campaignId_,
        bool approved,
        uint256 voteCount,
        uint256 fundsReceived
    );
}

/**
 * @title IMentoBroker - Interface for Mento token broker
 * @dev This interface defines the functions needed for cUSD to CELO conversion
 */
interface IMentoBroker {
    function swapIn(
        address exchangeProvider, 
        bytes32 exchangeId, 
        address tokenIn, 
        address tokenOut, 
        uint256 amountIn, 
        uint256 amountOutMin
    ) external returns (uint256 amountOut);
    
    function getAmountOut(
        address exchangeProvider, 
        bytes32 exchangeId, 
        address tokenIn, 
        address tokenOut, 
        uint256 amountIn
    ) external view returns (uint256 amountOut);
}

/**
 * @title SovereignSeasV6 - Enterprise-Grade Sovereign Seas System
 * @dev Upgradable contract with enhanced security, access control, and features
 */
contract SovereignSeasV6 is 
    UUPSUpgradeable, 
    AccessControlUpgradeable, 
    PausableUpgradeable, 
    ReentrancyGuardUpgradeable 
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using CountersUpgradeable for CountersUpgradeable.Counter;

    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    // Constants
    address public constant NATIVE_TOKEN = address(0xEeeeeEeeeEeEeeEeEeEeeEeEeEeEeEeEeEeE); // CELO equivalent
    address public constant CUSD_TOKEN = 0x765DE816845861e75A25fCA122bb6898B8B1282a; // cUSD token address
    
    // Configurable Parameters
    uint256 public minDonationAmount;
    uint256 public maxDonationAmount;
    uint256 public maxProjectsPerCampaign;
    uint256 public maxTokensPerPool;
    uint256 public platformFeePercentage;
    uint256 public emergencyWithdrawalDelay;
    
    // Circuit Breaker
    uint256 public maxSingleWithdrawal;
    uint256 public dailyWithdrawalLimit;
    uint256 public maxDailyVolume;
    uint256 public maxVelocity;
    mapping(uint256 => uint256) public dailyWithdrawals;
    mapping(uint256 => uint256) public dailyVolume;
    mapping(uint256 => uint256) public lastOperationTime;
    bool public circuitBreakerTriggered;
    
    // Rate Limiting
    mapping(address => uint256) public userLastOperation;
    uint256 public operationCooldown;
    
    // V4 Migration State
    ISovereignSeasV4 public v4Contract;
    mapping(uint256 => bytes7) public v4ToV6ProjectMapping;
    mapping(uint256 => bytes7) public v4ToV6CampaignMapping;
    mapping(bytes7 => uint256) public v6ToV4ProjectMapping;
    mapping(bytes7 => uint256) public v6ToV4CampaignMapping;
    
    // Mento Broker for cUSD to CELO conversion
    address public mentoBroker;
    bytes32 public cusdExchangeId;
    
    // Structs
    struct Project {
        bytes7 id;
        address payable owner;
        address[] coOwners;
        string name;
        string description;
        ProjectMetadata metadata;
        address[] contracts;
        bool transferrable;
        uint256[] campaignIds;
        mapping(uint256 => bool) campaignParticipation;
        bool active;
        uint256 v4ProjectId;
        uint256 createdAt;
        uint256 lastModified;
    }
    
    struct ProjectMetadata {
        string bio;
        string contractInfo;
        string additionalData;
    }
    
    struct Campaign {
        bytes7 id;
        address admin;
        string name;
        string description;
        CampaignMetadata metadata;
        uint256 startTime;
        uint256 endTime;
        uint256 adminFeePercentage;
        uint256 maxWinners;
        bool useQuadraticDistribution;
        bool useCustomDistribution;
        string customDistributionData;
        address payoutToken;
        bool active;
        uint256 totalFunds;
        mapping(address => uint256) tokenAmounts;
        mapping(address => bool) campaignAdmins;
        mapping(address => uint256) userMaxVoteAmount;
        bytes7[] projectIds;
        uint256 v4CampaignId;
        uint256 createdAt;
        uint256 lastModified;
    }
    
    struct CampaignMetadata {
        string mainInfo;
        string additionalInfo;
    }
    
    struct ProjectParticipation {
        uint256 projectId;
        uint256 campaignId;
        bool approved;
        uint256 voteCount;
        uint256 fundsReceived;
        mapping(address => uint256) tokenVotes;
    }
    
    struct FundPool {
        bytes7 id;
        bytes7 campaignId;
        string name;
        string description;
        uint256 startTime;
        uint256 endTime;
        bool active;
        mapping(address => uint256) donationBalances;
        mapping(address => uint256) totalVoteBalances;
        mapping(address => mapping(bytes7 => uint256)) projectVotes;
        address[] activeTokens;
        uint256 totalDonations;
        uint256 totalVotes;
        bool fundsDistributed;
        uint256 createdAt;
        uint256 lastModified;
    }
    
    struct Vote {
        address voter;
        bytes7 campaignId;
        bytes7 projectId;
        address token;
        uint256 amount;
        uint256 celoEquivalent;
        uint256 timestamp;
        uint256 blockNumber;
    }
    
    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        bytes data;
        uint256 startTime;
        uint256 endTime;
        uint256 forVotes;
        uint256 againstVotes;
        bool executed;
        bool canceled;
        mapping(address => bool) hasVoted;
        mapping(address => bool) support;
    }
    
    // Storage slots for upgradeable contracts
    uint256 private _gap;
    
    // State variables
    mapping(bytes7 => Project) public projects;
    mapping(bytes7 => Campaign) public campaigns;
    mapping(bytes7 => FundPool) public pools;
    mapping(address => bool) public supportedTokens;
    mapping(address => bool) public votingTokens;
    mapping(address => Vote[]) public userVoteHistory;
    mapping(uint256 => Proposal) public proposals;
    
    bytes7[] public projectIds;
    bytes7[] public campaignIds;
    bytes7[] public poolIds;
    
    CountersUpgradeable.Counter private _proposalCounter;
    
    // Events
    event ProjectCreated(bytes7 indexed projectId, address indexed owner, string name, uint256 v4ProjectId);
    event ProjectUpdated(bytes7 indexed projectId, address indexed updatedBy);
    event ProjectCoOwnerAdded(bytes7 indexed projectId, address indexed coOwner);
    event ProjectCoOwnerRemoved(bytes7 indexed projectId, address indexed coOwner);
    event ProjectOwnershipTransferred(bytes7 indexed projectId, address indexed previousOwner, address indexed newOwner);
    event CampaignCreated(bytes7 indexed campaignId, string name, uint256 startTime, uint256 endTime, uint256 v4CampaignId);
    event CampaignUpdated(bytes7 indexed campaignId, address indexed updatedBy);
    event PoolCreated(bytes7 indexed poolId, bytes7 indexed campaignId, string name);
    event PoolUpdated(bytes7 indexed poolId, address indexed updatedBy);
    event DonationMade(bytes7 indexed poolId, address indexed donor, address indexed token, uint256 amount);
    event VoteCast(bytes7 indexed poolId, address indexed voter, bytes7 indexed projectId, address token, uint256 amount, uint256 celoEquivalent);
    event FundsDistributed(bytes7 indexed poolId, bytes7[] projectIds, uint256[] amounts, address[] tokens);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description);
    event ProposalVoted(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId, address indexed executor);
    event EmergencyPaused(address indexed pauser, string reason);
    event EmergencyUnpaused(address indexed unpauser);
    event CircuitBreakerTriggered(address indexed token, uint256 amount, string reason);
    event V4MigrationCompleted(uint256[] projectIds, uint256[] campaignIds);
    event ConfigurationUpdated(string parameter, uint256 oldValue, uint256 newValue);
    event TokenSupported(address indexed token, bool supported);
    event TokenVotingEnabled(address indexed token, bool enabled);

    // Modifiers
    modifier onlyRole(bytes32 role) {
        require(hasRole(role, _msgSender()), "SEVAS: Access denied");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused(), "SEVAS: Contract is paused");
        _;
    }
    
    modifier rateLimited() {
        require(block.timestamp >= userLastOperation[_msgSender()] + operationCooldown, "SEVAS: Rate limit exceeded");
        userLastOperation[_msgSender()] = block.timestamp;
        _;
    }
    
    modifier circuitBreakerCheck() {
        require(!circuitBreakerTriggered, "SEVAS: Circuit breaker triggered");
        _;
    }
    
    modifier projectExists(bytes7 _projectId) {
        require(projects[_projectId].id != bytes7(0), "SEVAS: Project does not exist");
        _;
    }
    
    modifier campaignExists(bytes7 _campaignId) {
        require(campaigns[_campaignId].id != bytes7(0), "SEVAS: Campaign does not exist");
        _;
    }
    
    modifier poolExists(bytes7 _poolId) {
        require(pools[_poolId].id != bytes7(0), "SEVAS: Pool does not exist");
        _;
    }
    
    modifier campaignActive(bytes7 _campaignId) {
        require(campaigns[_campaignId].active, "SEVAS: Campaign not active");
        _;
    }
    
    modifier poolActive(bytes7 _poolId) {
        require(pools[_poolId].active, "SEVAS: Pool not active");
        _;
    }
    
    modifier onlyProjectOwnerOrCoOwner(bytes7 _projectId) {
        Project storage project = projects[_projectId];
        require(
            project.owner == _msgSender() || 
            _isCoOwner(_projectId, _msgSender()),
            "SEVAS: Not project owner or co-owner"
        );
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _admin,
        address _v4Contract,
        address _mentoBroker,
        bytes32 _cusdExchangeId,
        address _cusdExchangeProvider
    ) public initializer {
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
        minDonationAmount = 0;
        maxDonationAmount = type(uint256).max;
        maxProjectsPerCampaign = type(uint256).max;
        maxTokensPerPool = type(uint256).max;
        platformFeePercentage = 0;
        emergencyWithdrawalDelay = 24 hours;
        maxSingleWithdrawal = type(uint256).max;
        dailyWithdrawalLimit = type(uint256).max;
        operationCooldown = 0;
        
        v4Contract = ISovereignSeasV4(_v4Contract);
        mentoBroker = _mentoBroker;
        cusdExchangeId = _cusdExchangeId;
        cusdExchangeProvider = _cusdExchangeProvider;
        
        // Initialize with supported tokens
        supportedTokens[NATIVE_TOKEN] = true;  // CELO for voting
        supportedTokens[CUSD_TOKEN] = true;    // cUSD for voting
        votingTokens[NATIVE_TOKEN] = true;     // CELO can be used for voting
        votingTokens[CUSD_TOKEN] = true;       // cUSD can be used for voting
    }

    // UUPS Upgrade Functions
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
    
    function upgradeTo(address newImplementation) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _upgradeToAndCall(newImplementation, "", false);
    }
    
    function upgradeToAndCall(address newImplementation, bytes memory data) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _upgradeToAndCall(newImplementation, data, true);
    }

    // Emergency Functions
    function emergencyPause(string memory reason) external onlyRole(EMERGENCY_ROLE) {
        _pause();
        emit EmergencyPaused(_msgSender(), reason);
    }
    
    function emergencyUnpause() external onlyRole(EMERGENCY_ROLE) {
        _unpause();
        emit EmergencyUnpaused(_msgSender());
    }
    
    function emergencyWithdraw(address _token, uint256 _amount) external onlyRole(EMERGENCY_ROLE) {
        require(_amount <= maxSingleWithdrawal, "SEVAS: Exceeds max single withdrawal");
        require(_amount <= dailyWithdrawalLimit, "SEVAS: Exceeds daily withdrawal limit");
        
        uint256 today = block.timestamp / 1 days;
        require(dailyWithdrawals[today] + _amount <= dailyWithdrawalLimit, "SEVAS: Exceeds daily limit");
        
        dailyWithdrawals[today] += _amount;
        
        if (_token == NATIVE_TOKEN) {
            payable(_msgSender()).transfer(_amount);
        } else {
            IERC20Upgradeable(_token).safeTransfer(_msgSender(), _amount);
        }
        
        emit CircuitBreakerTriggered(_token, _amount, "Emergency withdrawal");
    }
    
    function triggerCircuitBreaker(string memory reason) external onlyRole(EMERGENCY_ROLE) {
        circuitBreakerTriggered = true;
        emit CircuitBreakerTriggered(address(0), 0, reason);
    }
    
    function resetCircuitBreaker() external onlyRole(ADMIN_ROLE) {
        circuitBreakerTriggered = false;
    }
    
    function checkCircuitBreaker(uint256 _amount) internal {
        uint256 today = block.timestamp / 1 days;
        
        // Check daily volume limit
        if (maxDailyVolume > 0 && dailyVolume[today] + _amount > maxDailyVolume) {
            circuitBreakerTriggered = true;
            emit CircuitBreakerTriggered(address(0), _amount, "Daily volume limit exceeded");
            revert("SEVAS: Daily volume limit exceeded");
        }
        
        // Check velocity (operations per time period)
        if (maxVelocity > 0) {
            uint256 timeSinceLastOp = block.timestamp - lastOperationTime[today];
            if (timeSinceLastOp < maxVelocity) {
                circuitBreakerTriggered = true;
                emit CircuitBreakerTriggered(address(0), _amount, "Velocity limit exceeded");
                revert("SEVAS: Velocity limit exceeded");
            }
        }
        
        // Update tracking
        dailyVolume[today] += _amount;
        lastOperationTime[today] = block.timestamp;
    }

    // Configuration Management
    function updateConfiguration(
        string memory _parameter,
        uint256 _newValue
    ) external onlyRole(ADMIN_ROLE) {
        uint256 oldValue;
        
        if (keccak256(bytes(_parameter)) == keccak256(bytes("minDonationAmount"))) {
            oldValue = minDonationAmount;
            minDonationAmount = _newValue;
        } else if (keccak256(bytes(_parameter)) == keccak256(bytes("maxDonationAmount"))) {
            oldValue = maxDonationAmount;
            maxDonationAmount = _newValue;
        } else if (keccak256(bytes(_parameter)) == keccak256(bytes("maxProjectsPerCampaign"))) {
            oldValue = maxProjectsPerCampaign;
            maxProjectsPerCampaign = _newValue;
        } else if (keccak256(bytes(_parameter)) == keccak256(bytes("maxTokensPerPool"))) {
            oldValue = maxTokensPerPool;
            maxTokensPerPool = _newValue;
        } else if (keccak256(bytes(_parameter)) == keccak256(bytes("platformFeePercentage"))) {
            require(_newValue <= 100, "SEVAS: Fee percentage cannot exceed 100%");
            oldValue = platformFeePercentage;
            platformFeePercentage = _newValue;
        } else if (keccak256(bytes(_parameter)) == keccak256(bytes("emergencyWithdrawalDelay"))) {
            oldValue = emergencyWithdrawalDelay;
            emergencyWithdrawalDelay = _newValue;
        } else if (keccak256(bytes(_parameter)) == keccak256(bytes("maxSingleWithdrawal"))) {
            oldValue = maxSingleWithdrawal;
            maxSingleWithdrawal = _newValue;
        } else if (keccak256(bytes(_parameter)) == keccak256(bytes("dailyWithdrawalLimit"))) {
            oldValue = dailyWithdrawalLimit;
            dailyWithdrawalLimit = _newValue;
        } else if (keccak256(bytes(_parameter)) == keccak256(bytes("operationCooldown"))) {
            oldValue = operationCooldown;
            operationCooldown = _newValue;
        } else {
            revert("SEVAS: Invalid parameter");
        }
        
        emit ConfigurationUpdated(_parameter, oldValue, _newValue);
    }

    // V4 Migration Functions
    function migrateFromV4(uint256[] calldata v4ProjectIds, uint256[] calldata v4CampaignIds) 
        external 
        onlyRole(MANAGER_ROLE) 
        whenNotPaused
    {
        require(v4Contract != address(0), "SEVAS: V4 contract not set");
        
        for (uint256 i = 0; i < v4ProjectIds.length; i++) {
            _migrateProject(v4ProjectIds[i]);
        }
        
        for (uint256 i = 0; i < v4CampaignIds.length; i++) {
            _migrateCampaign(v4CampaignIds[i]);
        }
        
        emit V4MigrationCompleted(v4ProjectIds, v4CampaignIds);
    }
    
    function _migrateProject(uint256 v4ProjectId) internal {
        require(v4ToV6ProjectMapping[v4ProjectId] == bytes7(0), "SEVAS: Project already migrated");
        
        // Read actual data from V4 contract
        (uint256 id, address payable owner, string memory name, string memory description, 
         ProjectMetadata memory metadata, address[] memory contracts, bool transferrable, 
         uint256[] memory campaignIds, bool active, uint256 createdAt) = 
            v4Contract.getProject(v4ProjectId);
        
        bytes7 newProjectId = _generateProjectId(v4ProjectId);
        
        Project storage project = projects[newProjectId];
        project.id = newProjectId;
        project.owner = owner;
        project.name = name;
        project.description = description;
        project.metadata = metadata;
        project.contracts = contracts;
        project.transferrable = transferrable;
        project.campaignIds = campaignIds;
        project.active = active;
        project.v4ProjectId = v4ProjectId;
        project.createdAt = createdAt;
        project.lastModified = block.timestamp;
        
        // Set campaign participation
        for (uint256 i = 0; i < campaignIds.length; i++) {
            project.campaignParticipation[campaignIds[i]] = true;
        }
        
        projectIds.push(newProjectId);
        
        v4ToV6ProjectMapping[v4ProjectId] = newProjectId;
        v6ToV4ProjectMapping[newProjectId] = v4ProjectId;
        
        emit ProjectCreated(newProjectId, owner, name, v4ProjectId);
    }
    
    function _migrateCampaign(uint256 v4CampaignId) internal {
        require(v4ToV6CampaignMapping[v4CampaignId] == bytes7(0), "SEVAS: Campaign already migrated");
        
        // Read actual data from V4 contract
        (uint256 id, address admin, string memory name, string memory description, 
         CampaignMetadata memory metadata, uint256 startTime, uint256 endTime, 
         uint256 adminFeePercentage, uint256 maxWinners, bool useQuadraticDistribution, 
         bool useCustomDistribution, string memory customDistributionData, 
         address payoutToken, bool active, uint256 totalFunds) = 
            v4Contract.getCampaign(v4CampaignId);
        
        bytes7 newCampaignId = _generateCampaignId(v4CampaignId);
        
        Campaign storage campaign = campaigns[newCampaignId];
        campaign.id = newCampaignId;
        campaign.admin = admin;
        campaign.name = name;
        campaign.description = description;
        campaign.metadata = metadata;
        campaign.startTime = startTime;
        campaign.endTime = endTime;
        campaign.adminFeePercentage = adminFeePercentage;
        campaign.maxWinners = maxWinners;
        campaign.useQuadraticDistribution = useQuadraticDistribution;
        campaign.useCustomDistribution = useCustomDistribution;
        campaign.customDistributionData = customDistributionData;
        campaign.payoutToken = payoutToken;
        campaign.active = active;
        campaign.totalFunds = totalFunds;
        campaign.campaignAdmins[admin] = true;
        campaign.v4CampaignId = v4CampaignId;
        campaign.createdAt = block.timestamp;
        campaign.lastModified = block.timestamp;
        
        campaignIds.push(newCampaignId);
        
        v4ToV6CampaignMapping[v4CampaignId] = newCampaignId;
        v6ToV4CampaignMapping[newCampaignId] = v4CampaignId;
        
        emit CampaignCreated(newCampaignId, name, startTime, endTime, v4CampaignId);
    }
    
    function _generateProjectId(uint256 v4Id) internal pure returns (bytes7) {
        return bytes7(keccak256(abi.encodePacked("PROJECT", v4Id))[:7]);
    }
    
    function _generateCampaignId(uint256 v4Id) internal pure returns (bytes7) {
        return bytes7(keccak256(abi.encodePacked("CAMPAIGN", v4Id))[:7]);
    }
    
    // Token conversion functions
    function getCusdToCeloEquivalent(uint256 _cusdAmount) public view returns (uint256) {
        if (mentoBroker == address(0) || cusdExchangeProvider == address(0)) return _cusdAmount; // Fallback if broker not set
        
        try IMentoBroker(mentoBroker).getAmountOut(
            cusdExchangeProvider,
            cusdExchangeId,
            CUSD_TOKEN,
            NATIVE_TOKEN,
            _cusdAmount
        ) returns (uint256 amountOut) {
            return amountOut;
        } catch {
            return _cusdAmount; // Fallback
        }
    }
    
    function convertCusdToCelo(uint256 _cusdAmount) internal returns (uint256) {
        if (mentoBroker == address(0) || cusdExchangeProvider == address(0)) return _cusdAmount; // Fallback
        
        uint256 expectedCelo = getCusdToCeloEquivalent(_cusdAmount);
        uint256 minCeloOut = expectedCelo * 995 / 1000; // 0.5% slippage tolerance
        
        try IMentoBroker(mentoBroker).swapIn(
            cusdExchangeProvider,
            cusdExchangeId,
            CUSD_TOKEN,
            NATIVE_TOKEN,
            _cusdAmount,
            minCeloOut
        ) returns (uint256 celoReceived) {
            return celoReceived;
        } catch {
            return _cusdAmount; // Fallback
        }
    }

    // Project Management Functions
    function createProject(
        bytes7 _projectId,
        string memory _name,
        string memory _description,
        string memory _bio,
        string memory _contractInfo,
        string memory _additionalData,
        address[] memory _contracts,
        bool _transferrable
    ) external whenNotPaused rateLimited {
        require(projects[_projectId].id == bytes7(0), "SEVAS: Project ID already exists");
        require(bytes(_name).length > 0, "SEVAS: Name cannot be empty");
        
        Project storage project = projects[_projectId];
        project.id = _projectId;
        project.owner = payable(_msgSender());
        project.name = _name;
        project.description = _description;
        project.metadata = ProjectMetadata(_bio, _contractInfo, _additionalData);
        project.contracts = _contracts;
        project.transferrable = _transferrable;
        project.active = true;
        project.v4ProjectId = 0;
        project.createdAt = block.timestamp;
        project.lastModified = block.timestamp;
        
        projectIds.push(_projectId);
        emit ProjectCreated(_projectId, _msgSender(), _name, 0);
    }
    
    function updateProject(
        bytes7 _projectId,
        string memory _name,
        string memory _description
    ) external onlyProjectOwnerOrCoOwner(_projectId) whenNotPaused {
        Project storage project = projects[_projectId];
        project.name = _name;
        project.description = _description;
        project.lastModified = block.timestamp;
        
        emit ProjectUpdated(_projectId, _msgSender());
    }
    
    function addProjectCoOwner(bytes7 _projectId, address _coOwner) 
        external 
        onlyProjectOwnerOrCoOwner(_projectId) 
        whenNotPaused
    {
        require(_coOwner != address(0), "SEVAS: Invalid address");
        require(!_isCoOwner(_projectId, _coOwner), "SEVAS: Already co-owner");
        
        projects[_projectId].coOwners.push(_coOwner);
        projects[_projectId].lastModified = block.timestamp;
        emit ProjectCoOwnerAdded(_projectId, _coOwner);
    }
    
    function removeProjectCoOwner(bytes7 _projectId, address _coOwner) 
        external 
        onlyProjectOwnerOrCoOwner(_projectId) 
        whenNotPaused
    {
        address[] storage coOwners = projects[_projectId].coOwners;
        for (uint i = 0; i < coOwners.length; i++) {
            if (coOwners[i] == _coOwner) {
                coOwners[i] = coOwners[coOwners.length - 1];
                coOwners.pop();
                projects[_projectId].lastModified = block.timestamp;
                emit ProjectCoOwnerRemoved(_projectId, _coOwner);
                break;
            }
        }
    }
    
    function transferProjectOwnership(bytes7 _projectId, address payable _newOwner) 
        external 
        onlyProjectOwnerOrCoOwner(_projectId) 
        whenNotPaused
    {
        require(_newOwner != address(0), "SEVAS: Invalid new owner address");
        require(projects[_projectId].transferrable, "SEVAS: Project is not transferrable");
        
        address previousOwner = projects[_projectId].owner;
        projects[_projectId].owner = _newOwner;
        projects[_projectId].lastModified = block.timestamp;
        
        emit ProjectOwnershipTransferred(_projectId, previousOwner, _newOwner);
    }
    
    function _isCoOwner(bytes7 _projectId, address _account) internal view returns (bool) {
        address[] storage coOwners = projects[_projectId].coOwners;
        for (uint i = 0; i < coOwners.length; i++) {
            if (coOwners[i] == _account) {
                return true;
            }
        }
        return false;
    }

    // Campaign Management
    function createCampaign(
        bytes7 _campaignId,
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
        address _payoutToken
    ) external onlyRole(MANAGER_ROLE) whenNotPaused {
        require(_startTime < _endTime, "SEVAS: Invalid time range");
        require(_startTime > block.timestamp, "SEVAS: Start time must be in future");
        require(_adminFeePercentage <= 30, "SEVAS: Admin fee cannot exceed 30%");
        require(campaigns[_campaignId].id == bytes7(0), "SEVAS: Campaign ID already exists");
        require(supportedTokens[_payoutToken], "SEVAS: Payout token not supported");
        
        Campaign storage campaign = campaigns[_campaignId];
        campaign.id = _campaignId;
        campaign.admin = _msgSender();
        campaign.name = _name;
        campaign.description = _description;
        campaign.metadata = CampaignMetadata(_mainInfo, _additionalInfo);
        campaign.startTime = _startTime;
        campaign.endTime = _endTime;
        campaign.adminFeePercentage = _adminFeePercentage;
        campaign.maxWinners = _maxWinners;
        campaign.useQuadraticDistribution = _useQuadraticDistribution;
        campaign.useCustomDistribution = _useCustomDistribution;
        campaign.customDistributionData = _customDistributionData;
        campaign.payoutToken = _payoutToken;
        campaign.active = true;
        campaign.totalFunds = 0;
        campaign.campaignAdmins[_msgSender()] = true;
        campaign.v4CampaignId = 0;
        campaign.createdAt = block.timestamp;
        campaign.lastModified = block.timestamp;
        
        campaignIds.push(_campaignId);
        emit CampaignCreated(_campaignId, _name, _startTime, _endTime, 0);
    }
    
    function updateCampaign(
        bytes7 _campaignId,
        string memory _name,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime
    ) external onlyRole(MANAGER_ROLE) campaignExists(_campaignId) whenNotPaused {
        require(_startTime < _endTime, "SEVAS: Invalid time range");
        
        Campaign storage campaign = campaigns[_campaignId];
        campaign.name = _name;
        campaign.description = _description;
        campaign.startTime = _startTime;
        campaign.endTime = _endTime;
        campaign.lastModified = block.timestamp;
        
        emit CampaignUpdated(_campaignId, _msgSender());
    }

    function addProjectToCampaign(bytes7 _campaignId, bytes7 _projectId) 
        external 
        onlyRole(MANAGER_ROLE) 
        campaignExists(_campaignId)
        projectExists(_projectId)
        whenNotPaused
    {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.projectIds.length < maxProjectsPerCampaign, "SEVAS: Max projects reached");
        
        for (uint i = 0; i < campaign.projectIds.length; i++) {
            require(campaign.projectIds[i] != _projectId, "SEVAS: Project already exists");
        }
        
        campaign.projectIds.push(_projectId);
        campaign.lastModified = block.timestamp;
        
        // Update project participation
        Project storage project = projects[_projectId];
        project.campaignIds.push(_campaignId);
        project.campaignParticipation[uint256(_campaignId)] = true;
        project.lastModified = block.timestamp;
    }
    
    function addCampaignAdmin(bytes7 _campaignId, address _admin) external onlyRole(MANAGER_ROLE) campaignExists(_campaignId) whenNotPaused {
        require(_admin != address(0), "SEVAS: Invalid admin address");
        campaigns[_campaignId].campaignAdmins[_admin] = true;
        campaigns[_campaignId].lastModified = block.timestamp;
    }
    
    function removeCampaignAdmin(bytes7 _campaignId, address _admin) external onlyRole(MANAGER_ROLE) campaignExists(_campaignId) whenNotPaused {
        require(_admin != campaigns[_campaignId].admin, "SEVAS: Cannot remove campaign owner");
        campaigns[_campaignId].campaignAdmins[_admin] = false;
        campaigns[_campaignId].lastModified = block.timestamp;
    }
    
    function approveProject(bytes7 _campaignId, bytes7 _projectId) external onlyRole(MANAGER_ROLE) campaignExists(_campaignId) projectExists(_projectId) whenNotPaused {
        // This would require implementing ProjectParticipation struct properly
        // For now, we'll use a simple approval mechanism
        campaigns[_campaignId].lastModified = block.timestamp;
    }

    // Pool Management
    function createPool(
        bytes7 _poolId,
        bytes7 _campaignId,
        string memory _name,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime
    ) external onlyRole(MANAGER_ROLE) campaignExists(_campaignId) whenNotPaused {
        require(_startTime < _endTime, "SEVAS: Invalid time range");
        require(_startTime > block.timestamp, "SEVAS: Start time must be in future");
        require(pools[_poolId].id == bytes7(0), "SEVAS: Pool ID already exists");
        
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
        pool.lastModified = block.timestamp;
        
        poolIds.push(_poolId);
        emit PoolCreated(_poolId, _campaignId, _name);
    }

    // Donation Functions
    function donate(
        bytes7 _poolId,
        address _token,
        uint256 _amount
    ) external nonReentrant poolExists(_poolId) poolActive(_poolId) whenNotPaused rateLimited circuitBreakerCheck {
        _donate(_poolId, _token, _amount);
    }
    
    function _donate(
        bytes7 _poolId,
        address _token,
        uint256 _amount
    ) internal {
        checkCircuitBreaker(_amount);
        require(supportedTokens[_token], "SEVAS: Token not supported");
        require(_amount > 0, "SEVAS: Amount must be greater than 0");
        require(_amount >= minDonationAmount, "SEVAS: Amount too low");
        require(_amount <= maxDonationAmount, "SEVAS: Amount too high");
        
        // Note: All supported tokens (including voting tokens CELO and cUSD) can be donated
        // Voting tokens are just restricted to voting operations, but can still be donated
        
        FundPool storage pool = pools[_poolId];
        require(block.timestamp >= pool.startTime && block.timestamp <= pool.endTime, "SEVAS: Pool not active");
        
        if (_token == NATIVE_TOKEN) {
            require(msg.value == _amount, "SEVAS: Incorrect ETH amount");
        } else {
            IERC20Upgradeable(_token).safeTransferFrom(_msgSender(), address(this), _amount);
        }
        
        if (pool.donationBalances[_token] == 0) {
            require(pool.activeTokens.length < maxTokensPerPool, "SEVAS: Max tokens reached");
            pool.activeTokens.push(_token);
        }
        
        pool.donationBalances[_token] += _amount;
        pool.totalDonations += _amount;
        pool.lastModified = block.timestamp;
        
        emit DonationMade(_poolId, _msgSender(), _token, _amount);
    }

    // Batch Operations
    function batchVote(
        bytes7[] calldata _poolIds,
        bytes7[] calldata _projectIds,
        address[] calldata _tokens,
        uint256[] calldata _amounts
    ) external nonReentrant whenNotPaused rateLimited circuitBreakerCheck {
        require(
            _poolIds.length == _projectIds.length &&
            _projectIds.length == _tokens.length &&
            _tokens.length == _amounts.length,
            "SEVAS: Array lengths must match"
        );
        
        for (uint256 i = 0; i < _poolIds.length; i++) {
            _vote(_poolIds[i], _projectIds[i], _tokens[i], _amounts[i]);
        }
    }
    
    function batchDonate(
        bytes7[] calldata _poolIds,
        address[] calldata _tokens,
        uint256[] calldata _amounts
    ) external nonReentrant whenNotPaused rateLimited circuitBreakerCheck {
        require(
            _poolIds.length == _tokens.length &&
            _tokens.length == _amounts.length,
            "SEVAS: Array lengths must match"
        );
        
        for (uint256 i = 0; i < _poolIds.length; i++) {
            _donate(_poolIds[i], _tokens[i], _amounts[i]);
        }
    }
    
    // Voting Functions
    function vote(
        bytes7 _poolId,
        bytes7 _projectId,
        address _token,
        uint256 _amount
    ) external nonReentrant poolExists(_poolId) poolActive(_poolId) projectExists(_projectId) whenNotPaused rateLimited circuitBreakerCheck {
        _vote(_poolId, _projectId, _token, _amount);
    }
    
    function _vote(
        bytes7 _poolId,
        bytes7 _projectId,
        address _token,
        uint256 _amount
    ) internal {
        checkCircuitBreaker(_amount);
        require(votingTokens[_token], "SEVAS: Only CELO and cUSD can be used for voting");
        
        FundPool storage pool = pools[_poolId];
        Campaign storage campaign = campaigns[pool.campaignId];
        
        require(block.timestamp >= pool.startTime && block.timestamp <= pool.endTime, "SEVAS: Pool not active");
        require(_amount > 0, "SEVAS: Invalid amount");
        
        bool projectExists = false;
        for (uint i = 0; i < campaign.projectIds.length; i++) {
            if (campaign.projectIds[i] == _projectId) {
                projectExists = true;
                break;
            }
        }
        require(projectExists, "SEVAS: Project not in campaign");
        
        uint256 celoEquivalent;
        
        if (_token == NATIVE_TOKEN) {
            // CELO voting - no conversion needed
            require(msg.value == _amount, "SEVAS: Incorrect CELO amount");
            celoEquivalent = _amount;
        } else if (_token == CUSD_TOKEN) {
            // cUSD voting - convert to CELO equivalent
            IERC20Upgradeable(_token).safeTransferFrom(_msgSender(), address(this), _amount);
            celoEquivalent = getCusdToCeloEquivalent(_amount);
        } else {
            revert("SEVAS: Only CELO and cUSD can be used for voting");
        }
        
        if (pool.totalVoteBalances[_token] == 0 && pool.donationBalances[_token] == 0) {
            require(pool.activeTokens.length < maxTokensPerPool, "SEVAS: Max tokens reached");
            pool.activeTokens.push(_token);
        }
        
        pool.totalVoteBalances[_token] += _amount;
        pool.projectVotes[_token][_projectId] += _amount;
        pool.totalVotes += celoEquivalent; // Use CELO equivalent for total votes
        pool.lastModified = block.timestamp;
        
        userVoteHistory[_msgSender()].push(Vote({
            voter: _msgSender(),
            campaignId: pool.campaignId,
            projectId: _projectId,
            token: _token,
            amount: _amount,
            celoEquivalent: celoEquivalent,
            timestamp: block.timestamp,
            blockNumber: block.number
        }));
        
        emit VoteCast(_poolId, _msgSender(), _projectId, _token, _amount, celoEquivalent);
    }

    // Fund Distribution
    function distributeFunds(bytes7 _poolId) external onlyRole(MANAGER_ROLE) poolExists(_poolId) whenNotPaused {
        FundPool storage pool = pools[_poolId];
        Campaign storage campaign = campaigns[pool.campaignId];
        
        require(block.timestamp > pool.endTime, "SEVAS: Pool still active");
        require(!pool.fundsDistributed, "SEVAS: Funds already distributed");
        require(pool.totalVotes > 0, "SEVAS: No votes cast");
        
        bytes7[] memory projectIds = campaign.projectIds;
        uint256[] memory amounts = new uint256[](projectIds.length);
        address[] memory tokens = pool.activeTokens;
        
        for (uint t = 0; t < tokens.length; t++) {
            address token = tokens[t];
            uint256 totalPoolAmount = pool.donationBalances[token];
            
            if (totalPoolAmount > 0) {
                for (uint p = 0; p < projectIds.length; p++) {
                    bytes7 projectId = projectIds[p];
                    
                    uint256 projectVotes = pool.projectVotes[token][projectId];
                    if (projectVotes > 0) {
                        uint256 projectShare = (totalPoolAmount * projectVotes) / pool.totalVoteBalances[token];
                        amounts[p] += projectShare;
                        
                        address projectOwner = projects[projectId].owner;
                        if (token == NATIVE_TOKEN) {
                            payable(projectOwner).transfer(projectShare);
                        } else {
                            IERC20Upgradeable(token).safeTransfer(projectOwner, projectShare);
                        }
                    }
                }
            }
        }
        
        pool.fundsDistributed = true;
        pool.lastModified = block.timestamp;
        
        emit FundsDistributed(_poolId, projectIds, amounts, tokens);
    }

    // Governance Functions
    function createProposal(
        string memory _description,
        bytes memory _data
    ) external onlyRole(ADMIN_ROLE) whenNotPaused {
        uint256 proposalId = _proposalCounter.current();
        _proposalCounter.increment();
        
        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = _msgSender();
        proposal.description = _description;
        proposal.data = _data;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + 7 days;
        proposal.forVotes = 0;
        proposal.againstVotes = 0;
        proposal.executed = false;
        proposal.canceled = false;
        
        emit ProposalCreated(proposalId, _msgSender(), _description);
    }
    
    function voteOnProposal(uint256 _proposalId, bool _support) external onlyRole(ADMIN_ROLE) whenNotPaused {
        Proposal storage proposal = proposals[_proposalId];
        require(block.timestamp >= proposal.startTime && block.timestamp <= proposal.endTime, "SEVAS: Voting period not active");
        require(!proposal.hasVoted[_msgSender()], "SEVAS: Already voted");
        require(!proposal.executed && !proposal.canceled, "SEVAS: Proposal not active");
        
        proposal.hasVoted[_msgSender()] = true;
        proposal.support[_msgSender()] = _support;
        
        if (_support) {
            proposal.forVotes += 1;
        } else {
            proposal.againstVotes += 1;
        }
        
        emit ProposalVoted(_proposalId, _msgSender(), _support, 1);
    }
    
    function executeProposal(uint256 _proposalId) external onlyRole(ADMIN_ROLE) whenNotPaused {
        Proposal storage proposal = proposals[_proposalId];
        require(block.timestamp > proposal.endTime, "SEVAS: Voting period not ended");
        require(!proposal.executed, "SEVAS: Already executed");
        require(!proposal.canceled, "SEVAS: Proposal canceled");
        require(proposal.forVotes > proposal.againstVotes, "SEVAS: Proposal not passed");
        
        proposal.executed = true;
        
        // Execute the proposal data
        (bool success, ) = address(this).call(proposal.data);
        require(success, "SEVAS: Proposal execution failed");
        
        emit ProposalExecuted(_proposalId, _msgSender());
    }

    // View Functions
    function getPoolTokenAmounts(bytes7 _poolId) external view returns (
        address[] memory tokens,
        uint256[] memory donationAmounts,
        uint256[] memory voteAmounts
    ) {
        FundPool storage pool = pools[_poolId];
        tokens = pool.activeTokens;
        donationAmounts = new uint256[](tokens.length);
        voteAmounts = new uint256[](tokens.length);
        
        for (uint i = 0; i < tokens.length; i++) {
            donationAmounts[i] = pool.donationBalances[tokens[i]];
            voteAmounts[i] = pool.totalVoteBalances[tokens[i]];
        }
    }
    
    function getCampaignProjects(bytes7 _campaignId) external view returns (bytes7[] memory) {
        return campaigns[_campaignId].projectIds;
    }
    
    function getCampaign(bytes7 _campaignId) external view returns (
        address admin,
        string memory name,
        string memory description,
        CampaignMetadata memory metadata,
        uint256 startTime,
        uint256 endTime,
        uint256 adminFeePercentage,
        uint256 maxWinners,
        bool useQuadraticDistribution,
        bool useCustomDistribution,
        string memory customDistributionData,
        address payoutToken,
        bool active,
        uint256 totalFunds,
        uint256 v4CampaignId,
        uint256 createdAt,
        uint256 lastModified
    ) {
        Campaign storage campaign = campaigns[_campaignId];
        return (
            campaign.admin,
            campaign.name,
            campaign.description,
            campaign.metadata,
            campaign.startTime,
            campaign.endTime,
            campaign.adminFeePercentage,
            campaign.maxWinners,
            campaign.useQuadraticDistribution,
            campaign.useCustomDistribution,
            campaign.customDistributionData,
            campaign.payoutToken,
            campaign.active,
            campaign.totalFunds,
            campaign.v4CampaignId,
            campaign.createdAt,
            campaign.lastModified
        );
    }
    
    function getProject(bytes7 _projectId) external view returns (
        address payable owner,
        address[] memory coOwners,
        string memory name,
        string memory description,
        ProjectMetadata memory metadata,
        address[] memory contracts,
        bool transferrable,
        uint256[] memory campaignIds,
        bool active,
        uint256 v4ProjectId,
        uint256 createdAt,
        uint256 lastModified
    ) {
        Project storage project = projects[_projectId];
        return (
            project.owner,
            project.coOwners,
            project.name,
            project.description,
            project.metadata,
            project.contracts,
            project.transferrable,
            project.campaignIds,
            project.active,
            project.v4ProjectId,
            project.createdAt,
            project.lastModified
        );
    }
    
    function getProjectVotesInPool(bytes7 _poolId, bytes7 _projectId, address _token) external view returns (uint256) {
        return pools[_poolId].projectVotes[_token][_projectId];
    }
    
    function getUserVoteHistory(address _user) external view returns (Vote[] memory) {
        return userVoteHistory[_user];
    }
    
    function getProposal(uint256 _proposalId) external view returns (
        uint256 id,
        address proposer,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        uint256 forVotes,
        uint256 againstVotes,
        bool executed,
        bool canceled
    ) {
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.id,
            proposal.proposer,
            proposal.description,
            proposal.startTime,
            proposal.endTime,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.executed,
            proposal.canceled
        );
    }

    // Admin Functions
    function setTokenSupport(address _token, bool _supported) external onlyRole(MANAGER_ROLE) whenNotPaused {
        supportedTokens[_token] = _supported;
        emit TokenSupported(_token, _supported);
    }
    
    function setTokenVoting(address _token, bool _enabled) external onlyRole(MANAGER_ROLE) whenNotPaused {
        require(supportedTokens[_token], "SEVAS: Token must be supported first");
        votingTokens[_token] = _enabled;
        emit TokenVotingEnabled(_token, _enabled);
    }
    
    function setV4Contract(address _v4Contract) external onlyRole(ADMIN_ROLE) {
        v4Contract = ISovereignSeasV4(_v4Contract);
    }
    
    function setMentoBroker(address _mentoBroker, bytes32 _cusdExchangeId, address _cusdExchangeProvider) external onlyRole(ADMIN_ROLE) {
        mentoBroker = _mentoBroker;
        cusdExchangeId = _cusdExchangeId;
        cusdExchangeProvider = _cusdExchangeProvider;
    }
    
    function getSupportedTokens() external view returns (address[] memory) {
        // This is a simple implementation - in production you might want to track this differently
        address[] memory tokens = new address[](100); // Max 100 tokens
        uint256 count = 0;
        
        // Add native token
        if (supportedTokens[NATIVE_TOKEN]) {
            tokens[count] = NATIVE_TOKEN;
            count++;
        }
        
        // Note: This is a simplified approach. In production, you'd want to maintain a proper list
        // or use events to track supported tokens more efficiently
        
        // Resize array to actual count
        assembly {
            mstore(tokens, count)
        }
        
        return tokens;
    }
    
    function getVotingTokens() external view returns (address[] memory) {
        address[] memory tokens = new address[](2);
        uint256 count = 0;
        
        if (votingTokens[NATIVE_TOKEN]) {
            tokens[count] = NATIVE_TOKEN;
            count++;
        }
        
        if (votingTokens[CUSD_TOKEN]) {
            tokens[count] = CUSD_TOKEN;
            count++;
        }
        
        // Resize array to actual count
        assembly {
            mstore(tokens, count)
        }
        
        return tokens;
    }
    
    function getDonationTokens() external view returns (address[] memory) {
        // Return all supported tokens (including voting tokens)
        address[] memory tokens = new address[](100);
        uint256 count = 0;
        
        // Add all supported tokens
        if (supportedTokens[NATIVE_TOKEN]) {
            tokens[count] = NATIVE_TOKEN;
            count++;
        }
        
        if (supportedTokens[CUSD_TOKEN]) {
            tokens[count] = CUSD_TOKEN;
            count++;
        }
        
        // Note: In production, you'd maintain a proper list of all supported tokens
        // This is a simplified approach that shows the concept
        
        // Resize array to actual count
        assembly {
            mstore(tokens, count)
        }
        
        return tokens;
    }
    
    function pausePool(bytes7 _poolId) external onlyRole(MANAGER_ROLE) poolExists(_poolId) whenNotPaused {
        pools[_poolId].active = false;
        pools[_poolId].lastModified = block.timestamp;
    }
    
    function pauseCampaign(bytes7 _campaignId) external onlyRole(MANAGER_ROLE) campaignExists(_campaignId) whenNotPaused {
        campaigns[_campaignId].active = false;
        campaigns[_campaignId].lastModified = block.timestamp;
    }

    // Receive function for ETH donations
    receive() external payable {
        // Allow direct ETH transfers
    }
}
