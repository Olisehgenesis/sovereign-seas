// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../base/BaseModule.sol";

/**
 * @title CampaignsModule
 * @notice Manages funding campaigns in SovereignSeas V5
 * @dev Handles campaign creation, configuration, and lifecycle management with V4 compatibility
 */
contract CampaignsModule is BaseModule {
    using SafeERC20 for IERC20;

    // Campaign status enum
    enum CampaignStatus {
        DRAFT,      // 0 - Campaign is in draft mode
        ACTIVE,     // 1 - Campaign is active and accepting votes
        PAUSED,     // 2 - Campaign is paused
        COMPLETED,  // 3 - Campaign has ended and funds distributed
        CANCELLED   // 4 - Campaign was cancelled
    }

    // Distribution method enum
    enum DistributionMethod {
        EQUAL,          // 0 - Equal distribution to all projects
        PROPORTIONAL,   // 1 - Proportional to vote percentages
        QUADRATIC,      // 2 - Quadratic distribution (rewards diversity)
        CUSTOM          // 3 - Custom distribution rules
    }

    // Campaign Type Enum for ERC20 Support
    enum CampaignType {
        STANDARD,       // 0: Standard CELO-based campaign (default)
        HYBRID,         // 1: Both CELO and selected ERC20 tokens allowed
        TOKEN_ONLY      // 2: Only selected ERC20 tokens (no CELO)
    }

    // Official Status Enum
    enum OfficialStatus {
        PENDING,        // 0: Default status - awaiting review
        VERIFIED,       // 1: Officially verified and trusted
        FLAGGED,        // 2: Marked for review due to concerns
        SUSPENDED,      // 3: Temporarily suspended from platform
        ARCHIVED        // 4: No longer active but preserved for reference
    }

    // Campaign struct
    struct Campaign {
        uint256 id;
        address admin;
        string name;
        string description;
        CampaignMetadata metadata;
        uint256 startTime;
        uint256 endTime;
        uint256 adminFeePercentage;
        uint256 maxWinners;
        DistributionMethod distributionMethod;
        string customDistributionData;
        address payoutToken;
        address feeToken;
        CampaignStatus status;
        bool active;
        uint256 totalFunds;
        uint256 projectAdditionFee;
        uint256 votingFee;
        uint256 createdAt;
        uint256 lastUpdated;
        
        // Enhanced V5 fields
        OfficialStatus officialStatus;
        mapping(address => uint256) tokenAmounts;
        mapping(address => bool) campaignAdmins;
        mapping(address => uint256) userMaxVoteAmount;
        mapping(address => bool) allowedVotingTokens;
        mapping(address => uint256) tokenWeights;
        uint256[] poolIds;
        bool autoPoolCreated;
        
        // Campaign metadata fields
        uint256 totalParticipants;
        uint256 totalProjects;
        bool featuredCampaign;
        uint256 minimumVoteAmount;
        uint256 maximumVoteAmount;
        
        // ERC20 Campaign Configuration
        CampaignType campaignType;
        bool isERC20Campaign;
        address[] allowedVotingTokensList; // Array for easy iteration
        
        // Project Addition Fee Configuration
        address projectAdditionFeeToken; // Token to pay for adding projects (CELO or campaign token)
        uint256 projectAdditionFeeAmount; // Amount required to add projects
    }

    // Campaign metadata struct - JSON-based for flexibility
    struct CampaignMetadata {
        string mainInfo;
        string additionalInfo;
        string jsonMetadata; // JSON string containing flexible metadata
        string category;
        string website;
        string logo;
        string banner;
        string[] socialLinks;
        string websiteUrl;
        string socialMediaHandle;
    }

    // State variables
    mapping(uint256 => Campaign) public campaigns;
    mapping(address => uint256[]) public campaignsByAdmin;
    mapping(string => uint256[]) public campaignsByCategory;
    
    uint256 public nextCampaignId;
    uint256 public totalCampaigns;
    uint256 public activeCampaigns;
    uint256 public completedCampaigns;

    // Enhanced indexing
    mapping(OfficialStatus => uint256[]) public campaignsByStatus;
    
    // V4 compatibility tracking
    mapping(uint256 => address[]) private campaignUsedTokens;
    mapping(uint256 => mapping(address => bool)) private isTokenUsedInCampaign;
    
    // Time-based indexing
    mapping(uint256 => uint256[]) public campaignsByMonth; // timestamp => campaignIds
    mapping(bool => uint256[]) public campaignsByActiveStatus; // active => campaignIds
    
    // ERC20 Campaign tracking
    mapping(uint256 => uint256[]) public campaignsByType; // CampaignType => campaignIds
    mapping(address => uint256[]) public campaignsByToken; // token => campaignIds that allow this token

    // Events
    event CampaignCreated(uint256 indexed campaignId, address indexed admin, string name);
    event CampaignUpdated(uint256 indexed campaignId, address indexed updatedBy);
    event CampaignStatusChanged(uint256 indexed campaignId, CampaignStatus oldStatus, CampaignStatus newStatus);
    event CampaignMetadataUpdated(uint256 indexed campaignId, address indexed updatedBy);
    event CampaignAdminAdded(uint256 indexed campaignId, address indexed admin);
    event CampaignAdminRemoved(uint256 indexed campaignId, address indexed admin);
    event VotingTokensSet(uint256 indexed campaignId, address[] tokens);
    event TokenWeightsSet(uint256 indexed campaignId, address[] tokens, uint256[] weights);
    event CampaignFeesSet(uint256 indexed campaignId, uint256 projectAdditionFee, uint256 votingFee);
    event AdminFundingAdded(uint256 indexed campaignId, address indexed admin, uint256 amount, address token);
    event CampaignTokenSet(uint256 indexed campaignId, address indexed token);
    event FeeTokenSet(uint256 indexed campaignId, address indexed token);
    
    // Enhanced events
    event CampaignStatusUpdated(uint256 indexed campaignId, OfficialStatus oldStatus, OfficialStatus newStatus, address indexed updatedBy, string reason);
    event CampaignTypeUpdated(uint256 indexed campaignId, CampaignType oldType, CampaignType newType, address indexed updatedBy);
    event CampaignTokensUpdated(uint256 indexed campaignId, address[] tokens, uint256[] weights, address indexed updatedBy);
    event CampaignTokenWeightUpdated(uint256 indexed campaignId, address indexed token, uint256 oldWeight, uint256 newWeight, address indexed updatedBy);
    event ProjectAdditionFeeUpdated(uint256 indexed campaignId, address indexed oldToken, address indexed newToken, uint256 oldAmount, uint256 newAmount, address updatedBy);
    event CampaignFunded(uint256 indexed campaignId, address indexed funder, address indexed token, uint256 amount);
    event CampaignTagAdded(uint256 indexed campaignId, string tag);
    event CampaignTagRemoved(uint256 indexed campaignId, string tag);
    event CampaignFeatured(uint256 indexed campaignId, bool featured, address indexed updatedBy);
    event UserMaxVoteAmountSet(uint256 indexed campaignId, address indexed user, uint256 maxAmount);
    event GlobalCampaignFeesUpdated(uint256 adminFeePercentage, address defaultFeeToken);
    event GlobalProjectAdditionFeesUpdated(address defaultProjectAdditionFeeToken, uint256 defaultProjectAdditionFeeAmount);
    event AllFeesSetToZeroForTesting();
    event AllFeesSetToTestAmounts(uint256 testFeeAmount);

    // Modifiers
    modifier campaignExists(uint256 _campaignId) {
        require(campaigns[_campaignId].id != 0, "CampaignsModule: Campaign does not exist");
        _;
    }

    modifier onlyCampaignAdmin(uint256 _campaignId) {
        require(
            campaigns[_campaignId].admin == msg.sender || 
            campaigns[_campaignId].campaignAdmins[msg.sender] || 
            _isAdmin(msg.sender),
            "CampaignsModule: Only campaign admin can call this function"
        );
        _;
    }

    modifier onlyCampaignOwner(uint256 _campaignId) {
        require(campaigns[_campaignId].admin == msg.sender, "CampaignsModule: Only campaign owner can call this function");
        _;
    }

    modifier onlyActiveCampaign(uint256 _campaignId) {
        require(campaigns[_campaignId].active, "CampaignsModule: Campaign is not active");
        _;
    }

    modifier onlyDraftCampaign(uint256 _campaignId) {
        require(campaigns[_campaignId].status == CampaignStatus.DRAFT, "CampaignsModule: Campaign is not in draft mode");
        _;
    }

    /**
     * @notice Initialize the CampaignsModule
     * @param _proxy The main proxy contract address
     * @param _data Additional initialization data
     */
    function initialize(address _proxy, bytes calldata _data) external override initializer {
        // Initialize base module
        require(_proxy != address(0), "CampaignsModule: Invalid proxy address");
        
        sovereignSeasProxy = ISovereignSeasV5(_proxy);
        moduleActive = true;

        // Initialize inherited contracts
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        // Set module-specific data
        moduleName = "Campaigns Module";
        moduleDescription = "Manages funding campaigns and their lifecycle";
        moduleDependencies = new string[](1);
        moduleDependencies[0] = "projects";
        
        nextCampaignId = 1;
        
        emit ModuleInitialized(getModuleId(), _proxy);
    }

    /**
     * @notice Get the module's unique identifier
     * @return The module identifier string
     */
    function getModuleId() public pure override returns (string memory) {
        return "campaigns";
    }

    /**
     * @notice Get the module's version
     * @return The module version string
     */
    function getModuleVersion() public pure override returns (string memory) {
        return "1.0.0";
    }

    /**
     * @notice Create a new campaign (anyone can create, no verification required)
     */
    function createCampaign(
        string calldata _name,
        string calldata _description,
        CampaignMetadata calldata _metadata,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _adminFeePercentage,
        uint256 _maxWinners,
        DistributionMethod _distributionMethod,
        address _payoutToken,
        address _feeToken
    ) external whenActive returns (uint256) {
        require(bytes(_name).length > 0, "CampaignsModule: Campaign name cannot be empty");
        require(bytes(_description).length > 0, "CampaignsModule: Campaign description cannot be empty");
        require(_startTime > block.timestamp, "CampaignsModule: Start time must be in the future");
        require(_endTime > _startTime, "CampaignsModule: End time must be after start time");
        require(_adminFeePercentage <= 1000, "CampaignsModule: Admin fee cannot exceed 10%");
        require(_maxWinners > 0, "CampaignsModule: Max winners must be greater than 0");

        return _createCampaignInternal(
            _name,
            _description,
            _metadata,
            _startTime,
            _endTime,
            _adminFeePercentage,
            _maxWinners,
            _distributionMethod,
            "",
            _payoutToken,
            _feeToken,
            msg.sender,
            CampaignType.STANDARD,
            new address[](0),
            new uint256[](0),
            address(0),
            0
        );
    }

    /**
     * @notice Create ERC20-based campaign with token configuration
     */
    function createERC20Campaign(
        string calldata _name,
        string calldata _description,
        CampaignMetadata calldata _metadata,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _adminFeePercentage,
        uint256 _maxWinners,
        DistributionMethod _distributionMethod,
        string calldata _customDistributionData,
        address _payoutToken,
        address _feeToken,
        CampaignType _campaignType,
        address[] calldata _allowedTokens,
        uint256[] calldata _tokenWeights,
        address _projectAdditionFeeToken,
        uint256 _projectAdditionFeeAmount
    ) external whenActive returns (uint256) {
        require(_allowedTokens.length == _tokenWeights.length, "CampaignsModule: Arrays length mismatch");
        require(_allowedTokens.length > 0, "CampaignsModule: Must specify at least one token");
        require(_campaignType != CampaignType.STANDARD, "CampaignsModule: Use createCampaign for standard campaigns");
        
        // Validate tokens and weights
        for (uint256 i = 0; i < _allowedTokens.length; i++) {
            require(_allowedTokens[i] != address(0), "CampaignsModule: Invalid token address");
            require(_tokenWeights[i] > 0, "CampaignsModule: Token weight must be positive");
        }
        
        require(_projectAdditionFeeToken != address(0), "CampaignsModule: Invalid project addition fee token");
        require(_projectAdditionFeeAmount > 0, "CampaignsModule: Project addition fee must be positive");

        return _createCampaignInternal(
            _name,
            _description,
            _metadata,
            _startTime,
            _endTime,
            _adminFeePercentage,
            _maxWinners,
            _distributionMethod,
            _customDistributionData,
            _payoutToken,
            _feeToken,
            msg.sender,
            _campaignType,
            _allowedTokens,
            _tokenWeights,
            _projectAdditionFeeToken,
            _projectAdditionFeeAmount
        );
    }

    /**
     * @notice Internal function to create campaigns
     */
    function _createCampaignInternal(
        string memory _name,
        string memory _description,
        CampaignMetadata memory _metadata,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _adminFeePercentage,
        uint256 _maxWinners,
        DistributionMethod _distributionMethod,
        string memory _customDistributionData,
        address _payoutToken,
        address _feeToken,
        address _admin,
        CampaignType _campaignType,
        address[] memory _allowedTokens,
        uint256[] memory _tokenWeights,
        address _projectAdditionFeeToken,
        uint256 _projectAdditionFeeAmount
    ) internal returns (uint256) {
        uint256 campaignId = nextCampaignId++;
        
        Campaign storage campaign = campaigns[campaignId];
        campaign.id = campaignId;
        campaign.admin = _admin;
        campaign.name = _name;
        campaign.description = _description;
        campaign.metadata = _metadata;
        campaign.startTime = _startTime;
        campaign.endTime = _endTime;
        campaign.adminFeePercentage = _adminFeePercentage;
        campaign.maxWinners = _maxWinners;
        campaign.distributionMethod = _distributionMethod;
        campaign.customDistributionData = _customDistributionData;
        campaign.payoutToken = _payoutToken;
        campaign.feeToken = _feeToken;
        campaign.status = CampaignStatus.DRAFT;
        campaign.active = true;
        campaign.createdAt = block.timestamp;
        campaign.lastUpdated = block.timestamp;
        campaign.officialStatus = OfficialStatus.PENDING;

        // ERC20 Campaign Configuration
        campaign.campaignType = _campaignType;
        campaign.isERC20Campaign = _campaignType != CampaignType.STANDARD;
        campaign.projectAdditionFeeToken = _projectAdditionFeeToken;
        campaign.projectAdditionFeeAmount = _projectAdditionFeeAmount;

        // Set allowed tokens and weights for ERC20 campaigns
        if (_campaignType != CampaignType.STANDARD) {
            for (uint256 i = 0; i < _allowedTokens.length; i++) {
                campaign.allowedVotingTokens[_allowedTokens[i]] = true;
                campaign.tokenWeights[_allowedTokens[i]] = _tokenWeights[i];
                campaign.allowedVotingTokensList.push(_allowedTokens[i]);
                
                // Index by token
                campaignsByToken[_allowedTokens[i]].push(campaignId);
            }
            
            // Index by campaign type
            campaignsByType[uint256(_campaignType)].push(campaignId);
        }

        // Add to admin's campaigns
        campaignsByAdmin[_admin].push(campaignId);

        // Add to category - SAFE VERSION
        if (bytes(_metadata.category).length > 0 && bytes(_metadata.category).length < 50) {
            campaignsByCategory[_metadata.category].push(campaignId);
        }

        // Index by status and activity
        campaignsByStatus[OfficialStatus.PENDING].push(campaignId);
        campaignsByActiveStatus[true].push(campaignId);
        
        // Index by month for analytics
        uint256 monthTimestamp = (_startTime / 30 days) * 30 days;
        campaignsByMonth[monthTimestamp].push(campaignId);

        totalCampaigns++;
        activeCampaigns++;

        emit CampaignCreated(campaignId, _admin, _name);
        
        return campaignId;
    }

    /**
     * @notice Update campaign information
     */
    function updateCampaign(
        uint256 _campaignId,
        string calldata _name,
        string calldata _description
    ) external campaignExists(_campaignId) onlyCampaignAdmin(_campaignId) whenActive {
        require(bytes(_name).length > 0, "CampaignsModule: Campaign name cannot be empty");
        require(bytes(_description).length > 0, "CampaignsModule: Campaign description cannot be empty");

        Campaign storage campaign = campaigns[_campaignId];
        campaign.name = _name;
        campaign.description = _description;
        campaign.lastUpdated = block.timestamp;

        emit CampaignUpdated(_campaignId, msg.sender);
    }

    /**
     * @notice Update campaign metadata
     */
    function updateCampaignMetadata(
        uint256 _campaignId,
        CampaignMetadata calldata _metadata
    ) external campaignExists(_campaignId) onlyCampaignAdmin(_campaignId) whenActive {
        Campaign storage campaign = campaigns[_campaignId];
        
        // Remove from old category
        if (bytes(campaign.metadata.category).length > 0) {
            _removeFromCategory(_campaignId, campaign.metadata.category);
        }

        // Update metadata
        campaign.metadata = _metadata;
        campaign.lastUpdated = block.timestamp;

        // Add to new category - SAFE VERSION
        if (bytes(_metadata.category).length > 0 && bytes(_metadata.category).length < 50) {
            campaignsByCategory[_metadata.category].push(_campaignId);
        }

        emit CampaignMetadataUpdated(_campaignId, msg.sender);
    }

    /**
     * @notice Update campaign tokens configuration for ERC20 campaigns
     */
    function updateCampaignTokens(
        uint256 _campaignId,
        address[] calldata _newTokens,
        uint256[] calldata _newWeights
    ) external campaignExists(_campaignId) onlyCampaignAdmin(_campaignId) onlyActiveCampaign(_campaignId) {
        require(_newTokens.length == _newWeights.length, "CampaignsModule: Arrays length mismatch");
        require(_newTokens.length > 0, "CampaignsModule: Must specify at least one token");
        
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.isERC20Campaign, "CampaignsModule: Not an ERC20 campaign");
        
        // Validate tokens and weights
        for (uint256 i = 0; i < _newTokens.length; i++) {
            require(_newTokens[i] != address(0), "CampaignsModule: Invalid token address");
            require(_newWeights[i] > 0, "CampaignsModule: Token weight must be positive");
        }
        
        // Remove old token indexing
        for (uint256 i = 0; i < campaign.allowedVotingTokensList.length; i++) {
            address token = campaign.allowedVotingTokensList[i];
            _removeFromArray(campaignsByToken[token], _campaignId);
            campaign.allowedVotingTokens[token] = false;
            campaign.tokenWeights[token] = 0;
        }
        
        // Clear old tokens list
        delete campaign.allowedVotingTokensList;
        
        // Set new tokens and weights
        for (uint256 i = 0; i < _newTokens.length; i++) {
            campaign.allowedVotingTokens[_newTokens[i]] = true;
            campaign.tokenWeights[_newTokens[i]] = _newWeights[i];
            campaign.allowedVotingTokensList.push(_newTokens[i]);
            
            // Index by token
            campaignsByToken[_newTokens[i]].push(_campaignId);
        }
        
        campaign.lastUpdated = block.timestamp;
        emit CampaignTokensUpdated(_campaignId, _newTokens, _newWeights, msg.sender);
    }

    /**
     * @notice Set campaign status
     */
    function setCampaignStatus(
        uint256 _campaignId,
        CampaignStatus _status
    ) external campaignExists(_campaignId) onlyCampaignAdmin(_campaignId) whenActive {
        Campaign storage campaign = campaigns[_campaignId];
        CampaignStatus oldStatus = campaign.status;
        
        // Validate status transition
        require(_isValidStatusTransition(oldStatus, _status), "CampaignsModule: Invalid status transition");
        
        campaign.status = _status;
        campaign.lastUpdated = block.timestamp;

        // Update counts
        if (_status == CampaignStatus.COMPLETED) {
            completedCampaigns++;
        }

        emit CampaignStatusChanged(_campaignId, oldStatus, _status);
    }

    /**
     * @notice Update campaign official status (admin only)
     */
    function updateCampaignOfficialStatus(
        uint256 _campaignId,
        OfficialStatus _newStatus,
        string calldata _reason
    ) external campaignExists(_campaignId) whenActive {
        // Check if caller has admin role through proxy
        require(_isAdmin(msg.sender), "CampaignsModule: Admin role required");
        Campaign storage campaign = campaigns[_campaignId];
        OfficialStatus oldStatus = campaign.officialStatus;

        // Remove from old status array
        _removeCampaignFromStatus(oldStatus, _campaignId);

        campaign.officialStatus = _newStatus;
        campaign.lastUpdated = block.timestamp;

        // Add to new status array
        campaignsByStatus[_newStatus].push(_campaignId);

        emit CampaignStatusUpdated(_campaignId, oldStatus, _newStatus, msg.sender, _reason);
    }

    /**
     * @notice Set user maximum vote amount
     */
    function setUserMaxVoteAmount(
        uint256 _campaignId,
        address _user,
        uint256 _maxAmount
    ) external campaignExists(_campaignId) onlyCampaignAdmin(_campaignId) {
        campaigns[_campaignId].userMaxVoteAmount[_user] = _maxAmount;
        campaigns[_campaignId].lastUpdated = block.timestamp;
        
        emit UserMaxVoteAmountSet(_campaignId, _user, _maxAmount);
    }

    /**
     * @notice Add campaign admin
     */
    function addCampaignAdmin(
        uint256 _campaignId,
        address _admin
    ) external campaignExists(_campaignId) onlyCampaignOwner(_campaignId) whenActive {
        require(_admin != address(0), "CampaignsModule: Invalid admin address");
        require(!campaigns[_campaignId].campaignAdmins[_admin], "CampaignsModule: Admin already exists");

        campaigns[_campaignId].campaignAdmins[_admin] = true;
        campaigns[_campaignId].lastUpdated = block.timestamp;
        emit CampaignAdminAdded(_campaignId, _admin);
    }

    /**
     * @notice Remove campaign admin
     */
    function removeCampaignAdmin(
        uint256 _campaignId,
        address _admin
    ) external campaignExists(_campaignId) onlyCampaignOwner(_campaignId) whenActive {
        require(campaigns[_campaignId].campaignAdmins[_admin], "CampaignsModule: Admin does not exist");

        campaigns[_campaignId].campaignAdmins[_admin] = false;
        campaigns[_campaignId].lastUpdated = block.timestamp;
        emit CampaignAdminRemoved(_campaignId, _admin);
    }

    /**
     * @notice Set featured campaign status (admin only)
     */
    function setCampaignFeatured(uint256 _campaignId, bool _featured) external campaignExists(_campaignId) whenActive {
        // Check if caller has admin role through proxy
        require(_isAdmin(msg.sender), "CampaignsModule: Admin role required");
        campaigns[_campaignId].featuredCampaign = _featured;
        campaigns[_campaignId].lastUpdated = block.timestamp;
        emit CampaignFeatured(_campaignId, _featured, msg.sender);
    }

    /**
     * @notice Fund campaign (internal use by other modules)
     */
    function fundCampaign(
        uint256 _campaignId,
        address _token,
        uint256 _amount
    ) external {
        // Check if caller has admin role through proxy
        require(_isAdmin(msg.sender), "CampaignsModule: Admin role required");
        Campaign storage campaign = campaigns[_campaignId];
        
        campaign.tokenAmounts[_token] += _amount;
        campaign.totalFunds += _amount;
        campaign.lastUpdated = block.timestamp;
        
        // Track used tokens for V4 compatibility
        if (!isTokenUsedInCampaign[_campaignId][_token]) {
            campaignUsedTokens[_campaignId].push(_token);
            isTokenUsedInCampaign[_campaignId][_token] = true;
        }
        
        emit CampaignFunded(_campaignId, tx.origin, _token, _amount);
    }

    // ==================== V4 MIGRATION FUNCTIONS ====================
    
    /**
     * @notice Create campaign from V4 migration data
     */
    function createCampaignFromV4(
        uint256 _v4CampaignId,
        address _admin,
        string calldata _name,
        string calldata _description,
        string calldata _mainInfo,
        string calldata _additionalInfo,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _adminFeePercentage,
        uint256 _maxWinners,
        bool _useQuadraticDistribution,
        bool _useCustomDistribution,
        string calldata _customDistributionData,
        address _payoutToken,
        bool _active,
        uint256 _totalFunds,
        uint256 _createdAt
    ) external returns (uint256) {
        // Check if caller has admin role through proxy
        require(_isAdmin(msg.sender), "CampaignsModule: Admin role required");
        require(_v4CampaignId >= 0, "CampaignsModule: Invalid V4 campaign ID");
        require(_admin != address(0), "CampaignsModule: Invalid admin address");
        require(bytes(_name).length > 0, "CampaignsModule: Name cannot be empty");
        
        uint256 campaignId = nextCampaignId++;
        
        Campaign storage campaign = campaigns[campaignId];
        campaign.id = campaignId;
        campaign.admin = _admin;
        campaign.name = _name;
        campaign.description = _description;
        campaign.metadata.mainInfo = _mainInfo;
        campaign.metadata.additionalInfo = _additionalInfo;
        campaign.startTime = _startTime;
        campaign.endTime = _endTime;
        campaign.adminFeePercentage = _adminFeePercentage;
        campaign.maxWinners = _maxWinners;
        campaign.distributionMethod = _useQuadraticDistribution ? DistributionMethod.QUADRATIC : DistributionMethod.PROPORTIONAL;
        campaign.customDistributionData = _customDistributionData;
        campaign.payoutToken = _payoutToken;
        campaign.active = _active;
        campaign.totalFunds = _totalFunds;
        campaign.createdAt = _createdAt > 0 ? _createdAt : block.timestamp;
        campaign.lastUpdated = block.timestamp;
        campaign.officialStatus = OfficialStatus.PENDING;
        campaign.status = CampaignStatus.DRAFT;
        
        // Add to indexes
        campaignsByAdmin[_admin].push(campaignId);
        campaignsByActiveStatus[_active].push(campaignId);
        campaignsByStatus[OfficialStatus.PENDING].push(campaignId);
        
       totalCampaigns++;
        if (_active) activeCampaigns++;
        
        emit CampaignCreated(campaignId, _admin, _name);
        
        return campaignId;
    }
    
    /**
     * @notice Set campaign token amounts from V4 migration
     */
    function setCampaignTokenAmountsFromV4(
        uint256 _campaignId,
        address[] calldata _tokens,
        uint256[] calldata _amounts
    ) external campaignExists(_campaignId) {
        // Check if caller has admin role through proxy
        require(_isAdmin(msg.sender), "CampaignsModule: Admin role required");
        require(_tokens.length == _amounts.length, "CampaignsModule: Array length mismatch");
        
        for (uint256 i = 0; i < _tokens.length; i++) {
            if (_tokens[i] != address(0) && _amounts[i] > 0) {
                campaigns[_campaignId].tokenAmounts[_tokens[i]] = _amounts[i];
                
                // Add to campaign used tokens if not already present
                if (!isTokenUsedInCampaign[_campaignId][_tokens[i]]) {
                    campaignUsedTokens[_campaignId].push(_tokens[i]);
                    isTokenUsedInCampaign[_campaignId][_tokens[i]] = true;
                }
            }
        }
    }

    // ==================== VIEW FUNCTIONS ====================

    /**
     * @notice Get campaign information
     */
    function getCampaign(uint256 _campaignId) external view campaignExists(_campaignId) returns (
        address admin,
        string memory name,
        string memory description,
        CampaignStatus status,
        bool active,
        uint256 startTime,
        uint256 endTime,
        uint256 totalFunds
    ) {
        Campaign storage campaign = campaigns[_campaignId];
        return (
            campaign.admin,
            campaign.name,
            campaign.description,
            campaign.status,
            campaign.active,
            campaign.startTime,
            campaign.endTime,
            campaign.totalFunds
        );
    }

    /**
     * @notice Get ERC20 campaign configuration
     */
    function getERC20CampaignConfig(uint256 _campaignId) external view campaignExists(_campaignId) returns (
        CampaignType campaignType,
        bool isERC20Campaign,
        address[] memory allowedTokens,
        uint256[] memory tokenWeights,
        address projectAdditionFeeToken,
        uint256 projectAdditionFeeAmount
    ) {
        Campaign storage campaign = campaigns[_campaignId];
        
        allowedTokens = campaign.allowedVotingTokensList;
        tokenWeights = new uint256[](allowedTokens.length);
        
        for (uint256 i = 0; i < allowedTokens.length; i++) {
            tokenWeights[i] = campaign.tokenWeights[allowedTokens[i]];
        }
        
        return (
            campaign.campaignType,
            campaign.isERC20Campaign,
            allowedTokens,
            tokenWeights,
            campaign.projectAdditionFeeToken,
            campaign.projectAdditionFeeAmount
        );
    }

    /**
     * @notice Get campaign metadata
     */
    function getCampaignMetadata(uint256 _campaignId) external view campaignExists(_campaignId) returns (CampaignMetadata memory metadata) {
        return campaigns[_campaignId].metadata;
    }

    // ==================== CROSS-MODULE HELPERS (ADDED) ====================

    function isCampaignAdmin(uint256 _campaignId, address _user) external view returns (bool) {
        Campaign storage c = campaigns[_campaignId];
        if (c.id == 0) return false;
        return c.admin == _user || c.campaignAdmins[_user] || _isAdmin(_user);
    }

    function isCampaignAdminOrContractAdmin(uint256 _campaignId, address _user) external view returns (bool) {
        Campaign storage c = campaigns[_campaignId];
        if (c.id == 0) return false;
        return c.admin == _user || c.campaignAdmins[_user] || _isAdmin(_user) || _isAdmin(_user);
    }

    function requestProjectParticipation(uint256 _campaignId, uint256 _projectId) external whenActive campaignExists(_campaignId) {
        // Only project owner can request - validated in ProjectsModule. Here we just acknowledge.
        Campaign storage c = campaigns[_campaignId];
        require(c.active, "CampaignsModule: Campaign not active");
        // No state to store here; VotingModule will initialize participation when approved.
    }

    function finalizeProjectParticipationApproval(uint256 _campaignId, uint256 _projectId, bool _approved) external whenActive campaignExists(_campaignId) {
        // Only campaign admin or contract admin should be able to finalize; validated via proxy caller in ProjectsModule
        if (_approved) {
            // Initialize participation in VotingModule
            callModule("voting", abi.encodeWithSignature("initializeParticipation(uint256,uint256)", _campaignId, _projectId));
            callModule("voting", abi.encodeWithSignature("approveProject(uint256,uint256)", _campaignId, _projectId));
        }
    }

    /**
     * @notice Get campaigns by admin
     */
    function getCampaignsByAdmin(address _admin) external view returns (uint256[] memory) {
        return campaignsByAdmin[_admin];
    }

    /**
     * @notice Get campaigns by category
     */
    function getCampaignsByCategory(string calldata _category) external view returns (uint256[] memory) {
        return campaignsByCategory[_category];
    }

    /**
     * @notice Get campaigns by tag
     */
    function getCampaignsByTag(string calldata _tag) external view returns (uint256[] memory) {
        // Removed tag-based indexing, so this function will always return empty
        return new uint256[](0);
    }

    /**
     * @notice Get campaigns by type
     */
    function getCampaignsByType(CampaignType _type) external view returns (uint256[] memory) {
        return campaignsByType[uint256(_type)];
    }

    /**
     * @notice Get campaigns that allow a specific token
     */
    function getCampaignsByToken(address _token) external view returns (uint256[] memory) {
        return campaignsByToken[_token];
    }

    /**
     * @notice Get campaigns by official status
     */
    function getCampaignsByStatus(OfficialStatus _status) external view returns (uint256[] memory) {
        return campaignsByStatus[_status];
    }

    /**
     * @notice Get campaign with pool status
     */
    function getCampaignWithPoolStatus(uint256 _campaignId) external view campaignExists(_campaignId) returns (
        uint256 id,
        address admin,
        string memory name,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        uint256 totalFunds,
        uint256 totalPools,
        uint256 poolTotalFunds,
        bool hasActivePools
    ) {
        Campaign storage campaign = campaigns[_campaignId];
        
        // Get pool status from PoolsModule if available
        uint256 totalPools = campaign.poolIds.length;
        uint256 poolTotalFunds = 0;
        bool hasActivePools = false;
        
        // In a real implementation, you'd query the pools module here
        // For now, using stored pool data
        
        return (
            campaign.id,
            campaign.admin,
            campaign.name,
            campaign.description,
            campaign.startTime,
            campaign.endTime,
            campaign.totalFunds,
            totalPools,
            poolTotalFunds,
            hasActivePools
        );
    }

    /**
     * @notice Get campaigns using custom fee tokens vs default fees
     * @return customFeeCampaigns Array of campaign IDs using custom fee tokens
     * @return defaultFeeCampaigns Array of campaign IDs using default fees
     */
    function getCampaignsByFeeType() external view returns (
        uint256[] memory customFeeCampaigns,
        uint256[] memory defaultFeeCampaigns
    ) {
        uint256 customCount = 0;
        uint256 defaultCount = 0;
        
        // First pass: count campaigns by fee type
        for (uint256 i = 1; i < nextCampaignId; i++) {
            if (campaigns[i].id != 0) {
                if (campaigns[i].projectAdditionFeeToken != address(0)) {
                    customCount++;
                } else {
                    defaultCount++;
                }
            }
        }
        
        // Second pass: populate arrays
        customFeeCampaigns = new uint256[](customCount);
        defaultFeeCampaigns = new uint256[](defaultCount);
        
        uint256 customIndex = 0;
        uint256 defaultIndex = 0;
        
        for (uint256 i = 1; i < nextCampaignId; i++) {
            if (campaigns[i].id != 0) {
                if (campaigns[i].projectAdditionFeeToken != address(0)) {
                    customFeeCampaigns[customIndex++] = i;
                } else {
                    defaultFeeCampaigns[defaultIndex++] = i;
                }
            }
        }
        
        return (customFeeCampaigns, defaultFeeCampaigns);
    }

    /**
     * @notice Get campaign fee configuration
     * @param _campaignId The campaign ID
     * @return adminFeePercentage Admin fee percentage
     * @return feeToken Fee token address
     * @return projectAdditionFeeToken Project addition fee token
     * @return projectAdditionFeeAmount Project addition fee amount
     * @return votingFee Voting fee amount
     * @return usesCustomFees Whether campaign uses custom fee tokens
     */
    function getCampaignFeeConfig(uint256 _campaignId) external view campaignExists(_campaignId) returns (
        uint256 adminFeePercentage,
        address feeToken,
        address projectAdditionFeeToken,
        uint256 projectAdditionFeeAmount,
        uint256 votingFee,
        bool usesCustomFees
    ) {
        Campaign storage campaign = campaigns[_campaignId];
        return (
            campaign.adminFeePercentage,
            campaign.feeToken,
            campaign.projectAdditionFeeToken,
            campaign.projectAdditionFeeAmount,
            campaign.votingFee,
            campaign.projectAdditionFeeToken != address(0)
        );
    }

    /**
     * @notice Update specific campaign fees (admin only)
     */
    function updateCampaignFees(
        uint256 _campaignId,
        uint256 _adminFeePercentage,
        address _feeToken,
        uint256 _projectAdditionFeeAmount,
        uint256 _votingFee
    ) external campaignExists(_campaignId) onlyCampaignAdmin(_campaignId) whenActive {
        Campaign storage campaign = campaigns[_campaignId];
        
        // Validate fees
        require(_adminFeePercentage <= 1000, "CampaignsModule: Admin fee cannot exceed 10%");
        require(_projectAdditionFeeAmount >= 0, "CampaignsModule: Project addition fee must be non-negative");
        require(_votingFee >= 0, "CampaignsModule: Voting fee must be non-negative");

        // Update fees
        campaign.adminFeePercentage = _adminFeePercentage;
        campaign.feeToken = _feeToken;
        campaign.projectAdditionFeeAmount = _projectAdditionFeeAmount;
        campaign.votingFee = _votingFee;
        campaign.lastUpdated = block.timestamp;

        emit CampaignFeesSet(_campaignId, _projectAdditionFeeAmount, _votingFee);
    }

    /**
     * @notice Update project addition fee token (admin only)
     */
    function updateProjectAdditionFeeToken(uint256 _campaignId, address _newToken) external campaignExists(_campaignId) onlyCampaignAdmin(_campaignId) whenActive {
        Campaign storage campaign = campaigns[_campaignId];
        require(_newToken != address(0), "CampaignsModule: Invalid fee token");
        campaign.projectAdditionFeeToken = _newToken;
        campaign.lastUpdated = block.timestamp;
        emit FeeTokenSet(_campaignId, _newToken);
    }

    /**
     * @notice Update project addition fee amount (admin only)
     */
    function updateProjectAdditionFeeAmount(uint256 _campaignId, uint256 _newAmount) external campaignExists(_campaignId) onlyCampaignAdmin(_campaignId) whenActive {
        Campaign storage campaign = campaigns[_campaignId];
        require(_newAmount >= 0, "CampaignsModule: Fee amount must be non-negative");
        campaign.projectAdditionFeeAmount = _newAmount;
        campaign.lastUpdated = block.timestamp;
    }

    /**
     * @notice Update voting fee amount (admin only)
     */
    function updateVotingFee(uint256 _campaignId, uint256 _newAmount) external campaignExists(_campaignId) onlyCampaignAdmin(_campaignId) whenActive {
        Campaign storage campaign = campaigns[_campaignId];
        require(_newAmount >= 0, "CampaignsModule: Fee amount must be non-negative");
        campaign.votingFee = _newAmount;
        campaign.lastUpdated = block.timestamp;
    }

    /**
     * @notice Get user max vote amount
     */
    function getUserMaxVoteAmount(uint256 _campaignId, address _user) external view returns (uint256) {
        return campaigns[_campaignId].userMaxVoteAmount[_user];
    }

    /**
     * @notice Check if token is allowed for voting in campaign
     */
    function isTokenAllowedForCampaign(uint256 _campaignId, address _token) external view returns (bool) {
        Campaign storage campaign = campaigns[_campaignId];
        
        // CELO is always allowed for all campaigns
        if (_token == address(0)) return true;
        
        // For ERC20 campaigns, check if token is in allowed list
        if (campaign.isERC20Campaign) {
            return campaign.allowedVotingTokens[_token];
        }
        
        // For standard campaigns, only CELO is allowed
        return false;
    }

    /**
     * @notice Get token weight for campaign
     */
    function getTokenWeight(uint256 _campaignId, address _token) external view returns (uint256) {
        Campaign storage campaign = campaigns[_campaignId];
        
        // CELO has default weight of 1 (100%)
        if (_token == address(0)) return 1e18; // 1 with 18 decimals
        
        // For ERC20 campaigns, return the configured weight
        if (campaign.isERC20Campaign) {
            return campaign.tokenWeights[_token];
        }
        
        // For standard campaigns, only CELO is supported
        return 0;
    }

    /**
     * @notice Get campaign token balance
     */
    function getCampaignTokenBalance(uint256 _campaignId, address _token) external view campaignExists(_campaignId) returns (uint256) {
        return campaigns[_campaignId].tokenAmounts[_token];
    }

    /**
     * @notice Get campaign used tokens (V4 compatibility)
     */
    function getCampaignVotedTokens(uint256 _campaignId) external view returns (address[] memory) {
        return campaignUsedTokens[_campaignId];
    }

    /**
     * @notice Get campaign performance analytics
     */
    function getCampaignPerformance(uint256 _campaignId) external view campaignExists(_campaignId) returns (
        uint256 totalFunds,
        uint256 totalProjects,
        uint256 totalVotes,
        uint256 daysRemaining
    ) {
        Campaign storage campaign = campaigns[_campaignId];
        
        uint256 remaining = 0;
        if (campaign.endTime > block.timestamp) {
            remaining = (campaign.endTime - block.timestamp) / 1 days;
        }
        
        return (
            campaign.totalFunds,
            campaign.totalProjects,
            0, // Would need to query voting module for total votes
            remaining
        );
    }

    /**
     * @notice Get featured campaigns
     */
    function getFeaturedCampaigns() external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // Count featured campaigns
        for (uint256 i = 1; i < nextCampaignId; i++) {
            if (campaigns[i].featuredCampaign && campaigns[i].active) {
                count++;
            }
        }
        
        uint256[] memory featured = new uint256[](count);
        uint256 index = 0;
        
        // Fill featured campaigns array
        for (uint256 i = 1; i < nextCampaignId; i++) {
            if (campaigns[i].featuredCampaign && campaigns[i].active) {
                featured[index++] = i;
            }
        }
        
        return featured;
    }

    /**
     * @notice Get active campaigns
     */
    function getActiveCampaigns() external view returns (uint256[] memory) {
        return campaignsByActiveStatus[true];
    }

    // ==================== INTERNAL HELPER FUNCTIONS ====================

    function _removeFromCategory(uint256 _campaignId, string memory _category) internal {
        uint256[] storage categoryCampaigns = campaignsByCategory[_category];
        for (uint256 i = 0; i < categoryCampaigns.length; i++) {
            if (categoryCampaigns[i] == _campaignId) {
                categoryCampaigns[i] = categoryCampaigns[categoryCampaigns.length - 1];
                categoryCampaigns.pop();
                break;
            }
        }
    }

    function _removeFromTag(uint256 _campaignId, string memory _tag) internal {
        // Removed tag-based indexing, so this function is no longer needed
    }

    function _removeCampaignFromStatus(OfficialStatus _status, uint256 _campaignId) internal {
        uint256[] storage campaigns = campaignsByStatus[_status];
        for (uint256 i = 0; i < campaigns.length; i++) {
            if (campaigns[i] == _campaignId) {
                campaigns[i] = campaigns[campaigns.length - 1];
                campaigns.pop();
                break;
            }
        }
    }

    function _removeFromArray(uint256[] storage _array, uint256 _value) internal {
        for (uint256 i = 0; i < _array.length; i++) {
            if (_array[i] == _value) {
                _array[i] = _array[_array.length - 1];
                _array.pop();
                break;
            }
        }
    }

    function _isValidStatusTransition(CampaignStatus _oldStatus, CampaignStatus _newStatus) internal pure returns (bool) {
        if (_oldStatus == CampaignStatus.DRAFT) {
            return _newStatus == CampaignStatus.ACTIVE || _newStatus == CampaignStatus.CANCELLED;
        } else if (_oldStatus == CampaignStatus.ACTIVE) {
            return _newStatus == CampaignStatus.PAUSED || _newStatus == CampaignStatus.COMPLETED || _newStatus == CampaignStatus.CANCELLED;
        } else if (_oldStatus == CampaignStatus.PAUSED) {
            return _newStatus == CampaignStatus.ACTIVE || _newStatus == CampaignStatus.CANCELLED;
        }
        return false;
    }

    // ==================== ADMIN FUNCTIONS ====================

    /**
     * @notice Update campaign fees globally (admin only)
     * @dev Only affects campaigns using default fees. Campaigns with custom fee tokens are unaffected.
     */
    function updateGlobalCampaignFees(
        uint256 _adminFeePercentage,
        address _defaultFeeToken
    ) external {
        // Check if caller has admin role through proxy
        require(_isAdmin(msg.sender), "CampaignsModule: Admin role required");
        require(_adminFeePercentage <= 1000, "CampaignsModule: Admin fee cannot exceed 10%");
        require(_defaultFeeToken != address(0), "CampaignsModule: Invalid fee token");
        
        // Update only campaigns that are using default fees (not custom fee tokens)
        for (uint256 i = 1; i < nextCampaignId; i++) {
            if (campaigns[i].id != 0 && campaigns[i].projectAdditionFeeToken == address(0)) {
                campaigns[i].adminFeePercentage = _adminFeePercentage;
                campaigns[i].feeToken = _defaultFeeToken;
            }
        }
        
        emit GlobalCampaignFeesUpdated(_adminFeePercentage, _defaultFeeToken);
    }

    /**
     * @notice Update project addition fees globally (admin only)
     * @dev Only affects campaigns using default fees. Campaigns with custom fee tokens are unaffected.
     */
    function updateGlobalProjectAdditionFees(
        address _defaultProjectAdditionFeeToken,
        uint256 _defaultProjectAdditionFeeAmount
    ) external {
        // Check if caller has admin role through proxy
        require(_isAdmin(msg.sender), "CampaignsModule: Admin role required");
        require(_defaultProjectAdditionFeeToken != address(0), "CampaignsModule: Invalid fee token");
        require(_defaultProjectAdditionFeeAmount >= 0, "CampaignsModule: Fee amount must be non-negative");
        
        // Update only campaigns that are using default fees (not custom fee tokens)
        for (uint256 i = 1; i < nextCampaignId; i++) {
            if (campaigns[i].id != 0 && campaigns[i].projectAdditionFeeToken == address(0)) {
                campaigns[i].projectAdditionFeeToken = _defaultProjectAdditionFeeToken;
                campaigns[i].projectAdditionFeeAmount = _defaultProjectAdditionFeeAmount;
            }
        }
        
        emit GlobalProjectAdditionFeesUpdated(_defaultProjectAdditionFeeToken, _defaultProjectAdditionFeeAmount);
    }

    /**
     * @notice Set all fees to zero for testing (admin only)
     * @dev Only affects campaigns using default fees. Campaigns with custom fee tokens are unaffected.
     */
    function setZeroFeesForTesting() external {
        // Check if caller has admin role through proxy
        require(_isAdmin(msg.sender), "CampaignsModule: Admin role required");
        
        // Update only campaigns that are using default fees (not custom fee tokens)
        for (uint256 i = 1; i < nextCampaignId; i++) {
            if (campaigns[i].id != 0 && campaigns[i].projectAdditionFeeToken == address(0)) {
                campaigns[i].adminFeePercentage = 0;
                campaigns[i].projectAdditionFeeAmount = 0;
                campaigns[i].votingFee = 0;
            }
        }
        
        emit AllFeesSetToZeroForTesting();
    }

    /**
     * @notice Set all fees to 0.1 CELO for testing (admin only)
     * @dev Only affects campaigns using default fees. Campaigns with custom fee tokens are unaffected.
     */
    function setTestFees() external {
        // Check if caller has admin role through proxy
        require(_isAdmin(msg.sender), "CampaignsModule: Admin role required");
        
        uint256 testFeeAmount = 0.1e18; // 0.1 CELO
        
        // Update only campaigns that are using default fees (not custom fee tokens)
        for (uint256 i = 1; i < nextCampaignId; i++) {
            if (campaigns[i].id != 0 && campaigns[i].projectAdditionFeeToken == address(0)) {
                campaigns[i].adminFeePercentage = 50; // 5%
                campaigns[i].projectAdditionFeeAmount = testFeeAmount;
                campaigns[i].votingFee = testFeeAmount;
            }
        }
        
        emit AllFeesSetToTestAmounts(testFeeAmount);
    }

    /**
     * @notice Update campaign JSON metadata (admin only)
     * @dev Allows admins to update the JSON metadata for flexible expansion
     */
    function updateCampaignJsonMetadata(
        uint256 _campaignId,
        string calldata _jsonMetadata
    ) external {
        require(_isAdmin(msg.sender), "CampaignsModule: Admin role required");
        require(bytes(_jsonMetadata).length > 0, "CampaignsModule: JSON metadata cannot be empty");
        require(bytes(_jsonMetadata).length < 10000, "CampaignsModule: JSON metadata too large"); // 10KB limit
        
        campaigns[_campaignId].metadata.jsonMetadata = _jsonMetadata;
        campaigns[_campaignId].lastUpdated = block.timestamp;
        
        emit CampaignMetadataUpdated(_campaignId, msg.sender);
    }

    /**
     * @notice Get campaign JSON metadata
     * @param _campaignId The campaign ID
     * @return JSON metadata string
     */
    function getCampaignJsonMetadata(uint256 _campaignId) external view campaignExists(_campaignId) returns (string memory) {
        return campaigns[_campaignId].metadata.jsonMetadata;
    }

    /**
     * @notice Search campaigns by JSON metadata content
     * @param _query Search query to look for in JSON metadata
     * @return Array of campaign IDs matching the query
     */
    function searchCampaignsByJsonMetadata(string calldata _query) external view returns (uint256[] memory) {
        uint256[] memory results = new uint256[](totalCampaigns);
        uint256 resultCount = 0;
        
        for (uint256 i = 1; i < nextCampaignId; i++) {
            if (campaigns[i].id != 0) {
                string memory jsonMetadata = campaigns[i].metadata.jsonMetadata;
                if (bytes(jsonMetadata).length > 0 && _containsString(jsonMetadata, _query)) {
                    results[resultCount] = i;
                    resultCount++;
                }
            }
        }
        
        // Resize array to actual results
        uint256[] memory finalResults = new uint256[](resultCount);
        for (uint256 i = 0; i < resultCount; i++) {
            finalResults[i] = results[i];
        }
        
        return finalResults;
    }

    /**
     * @notice Get campaigns by metadata field value
     * @param _fieldName The JSON field name to search
     * @param _fieldValue The value to search for
     * @return Array of campaign IDs with matching field value
     */
    function getCampaignsByMetadataField(
        string calldata _fieldName,
        string calldata _fieldValue
    ) external view returns (uint256[] memory) {
        uint256[] memory results = new uint256[](totalCampaigns);
        uint256 resultCount = 0;
        
        for (uint256 i = 1; i < nextCampaignId; i++) {
            if (campaigns[i].id != 0) {
                string memory jsonMetadata = campaigns[i].metadata.jsonMetadata;
                if (bytes(jsonMetadata).length > 0) {
                    // Simple search for field:value pattern in JSON
                    string memory searchPattern = string(abi.encodePacked('"', _fieldName, '":"', _fieldValue, '"'));
                    if (_containsString(jsonMetadata, searchPattern)) {
                        results[resultCount] = i;
                        resultCount++;
                    }
                }
            }
        }
        
        // Resize array to actual results
        uint256[] memory finalResults = new uint256[](resultCount);
        for (uint256 i = 0; i < resultCount; i++) {
            finalResults[i] = results[i];
        }
        
        return finalResults;
    }

    /**
     * @notice Validate JSON metadata format
     * @param _jsonMetadata The JSON string to validate
     * @return isValid Whether the JSON is valid
     */
    function validateJsonMetadata(string calldata _jsonMetadata) external pure returns (bool isValid) {
        // Basic JSON validation - check for balanced braces and quotes
        uint256 braceCount = 0;
        uint256 quoteCount = 0;
        bool inString = false;
        
        for (uint256 i = 0; i < bytes(_jsonMetadata).length; i++) {
            bytes1 char = bytes(_jsonMetadata)[i];
            
            if (char == '"' && (i == 0 || bytes(_jsonMetadata)[i-1] != '\\')) {
                inString = !inString;
                quoteCount++;
            } else if (!inString) {
                if (char == '{') {
                    braceCount++;
                } else if (char == '}') {
                    if (braceCount == 0) return false; // Unmatched closing brace
                    braceCount--;
                }
            }
        }
        
        return braceCount == 0 && quoteCount % 2 == 0;
    }

    /**
     * @notice Internal helper function to check if a string contains a substring
     * @param _source The source string to search in
     * @param _query The substring to search for
     * @return contains Whether the source contains the query
     */
    function _containsString(string memory _source, string memory _query) internal pure returns (bool contains) {
        bytes memory sourceBytes = bytes(_source);
        bytes memory queryBytes = bytes(_query);
        
        if (queryBytes.length > sourceBytes.length) {
            return false;
        }
        
        for (uint256 i = 0; i <= sourceBytes.length - queryBytes.length; i++) {
            bool found = true;
            for (uint256 j = 0; j < queryBytes.length; j++) {
                if (sourceBytes[i + j] != queryBytes[j]) {
                    found = false;
                    break;
                }
            }
            if (found) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * @notice Update specific campaign fees (admin only)
     */
}