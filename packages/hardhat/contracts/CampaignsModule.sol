// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

// Interface for main contract communication
interface ISovereignSeasV5 {
    function hasModuleAccess(address _user, bytes32 _role) external view returns (bool);
    function callModule(string memory _moduleName, bytes memory _data) external returns (bytes memory);
}

// Enhanced Campaign struct
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
    uint256 lastUpdated;
    
    // V4 compatibility fields
    string mainInfo;
    string additionalInfo;
    uint256 adminFeePercentage;
    uint256 maxWinners;
    bool useQuadraticDistribution;
    bool useCustomDistribution;
    string customDistributionData;
    address payoutToken;
    
    // Enhanced V5 fields
    OfficialStatus officialStatus;
    mapping(address => bool) campaignAdmins;
    address[] adminList; // List of campaign admins for easy iteration
    mapping(address => uint256) tokenAmounts;
    mapping(address => uint256) userMaxVoteAmount;
    uint256[] poolIds;
    bool autoPoolCreated;
    
    // Campaign metadata
    string websiteUrl;
    string socialMediaHandle;
    string[] tags;
    uint256 totalParticipants;
    uint256 totalProjects;
    bool featuredCampaign;
    uint256 minimumVoteAmount;
    uint256 maximumVoteAmount;
    
    // ERC20 Campaign Configuration
    CampaignType campaignType;
    address[] allowedVotingTokens;
    mapping(address => uint256) tokenWeights; // Weight multiplier (1000 = 1.0x)
    bool isERC20Campaign;
    
    // Project Addition Fee Configuration
    address projectAdditionFeeToken; // Token to pay for adding projects (CELO or campaign token)
    uint256 projectAdditionFeeAmount; // Amount required to add projects
}

// Campaign metadata struct for easier management
struct CampaignMetadata {
    string mainInfo;
    string additionalInfo;
    string customDistributionData;
    string websiteUrl;
    string socialMediaHandle;
    string[] tags;
}

// Official Status Enum
enum OfficialStatus {
    PENDING,        // 0: Default status - awaiting review
    VERIFIED,       // 1: Officially verified and trusted
    FLAGGED,        // 2: Marked for review due to concerns
    SUSPENDED,      // 3: Temporarily suspended from platform
    ARCHIVED        // 4: No longer active but preserved for reference
}

// Campaign Type Enum for ERC20 Support
enum CampaignType {
    STANDARD,       // 0: Standard CELO-based campaign (default)
    HYBRID,         // 1: Both CELO and selected ERC20 tokens allowed
    TOKEN_ONLY      // 2: Only selected ERC20 tokens (no CELO)
}

/**
 * @title CampaignsModule - SovereignSeasV5 Campaigns Management
 * @dev Handles all campaign-related operations with V4 compatibility
 */
contract CampaignsModule is Initializable, ReentrancyGuardUpgradeable {
    
    // State variables
    ISovereignSeasV5 public mainContract;
    
    mapping(uint256 => Campaign) public campaigns;
    uint256[] public campaignIds;
    uint256 public nextCampaignId;
    
    // Enhanced indexing
    mapping(address => uint256[]) public adminCampaigns;
    mapping(string => uint256[]) public campaignsByTag;
    mapping(OfficialStatus => uint256[]) public campaignsByStatus;
    mapping(uint256 => mapping(string => bool)) public campaignHasTag;
    
    // V4 compatibility tracking
    mapping(uint256 => address[]) private campaignUsedTokens;
    mapping(uint256 => mapping(address => bool)) private isTokenUsedInCampaign;
    
    // Time-based indexing
    mapping(uint256 => uint256[]) public campaignsByMonth; // timestamp => campaignIds
    mapping(bool => uint256[]) public campaignsByActiveStatus; // active => campaignIds
    
    // ERC20 Campaign tracking
    mapping(uint256 => uint256[]) public campaignsByType; // CampaignType => campaignIds
    mapping(address => uint256[]) public campaignsByToken; // token => campaignIds that allow this token
    
    // Constants
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    
    // Events
    event CampaignCreated(uint256 indexed campaignId, address indexed admin, string name, uint256 startTime, uint256 endTime);
    event CampaignUpdated(uint256 indexed campaignId, address indexed updatedBy);
    event CampaignMetadataUpdated(uint256 indexed campaignId, address indexed updatedBy);
    event CampaignStatusUpdated(uint256 indexed campaignId, OfficialStatus oldStatus, OfficialStatus newStatus, address indexed updatedBy, string reason);
    event CampaignAdminAdded(uint256 indexed campaignId, address indexed newAdmin, address indexed addedBy);
    event CampaignAdminRemoved(uint256 indexed campaignId, address indexed admin, address indexed removedBy);
    event CampaignFunded(uint256 indexed campaignId, address indexed funder, address indexed token, uint256 amount);
    event CampaignFundsDistributed(uint256 indexed campaignId, uint256[] projectIds, uint256[] amounts, address token);
    
    // ERC20 Campaign Events
    event CampaignTypeUpdated(uint256 indexed campaignId, CampaignType oldType, CampaignType newType, address indexed updatedBy);
    event CampaignTokensUpdated(uint256 indexed campaignId, address[] tokens, uint256[] weights, address indexed updatedBy);
    event CampaignTokenWeightUpdated(uint256 indexed campaignId, address indexed token, uint256 oldWeight, uint256 newWeight, address indexed updatedBy);
    event ProjectAdditionFeeUpdated(uint256 indexed campaignId, address indexed oldToken, address indexed newToken, uint256 oldAmount, uint256 newAmount, address updatedBy);
    event CampaignFundsWithdrawn(uint256 indexed campaignId, address indexed withdrawer, address indexed token, uint256 amount);
    event CampaignTagAdded(uint256 indexed campaignId, string tag);
    event CampaignTagRemoved(uint256 indexed campaignId, string tag);
    event CampaignFeatured(uint256 indexed campaignId, bool featured, address indexed updatedBy);
    event UserMaxVoteAmountSet(uint256 indexed campaignId, address indexed user, uint256 maxAmount);

    // Modifiers
    modifier onlyMainContract() {
        require(msg.sender == address(mainContract), "CampaignsModule: Only main contract can call");
        _;
    }
    
    modifier hasRole(bytes32 role) {
        require(mainContract.hasModuleAccess(msg.sender, role), "CampaignsModule: Access denied");
        _;
    }
    
    modifier campaignExists(uint256 _campaignId) {
        require(campaigns[_campaignId].id != 0, "CampaignsModule: Campaign does not exist");
        _;
    }
    
    modifier activeCampaign(uint256 _campaignId) {
        require(campaigns[_campaignId].active, "CampaignsModule: Campaign is not active");
        _;
    }
    
    modifier campaignAdmin(uint256 _campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(
            msg.sender == campaign.admin || 
            campaign.campaignAdmins[msg.sender] || 
            mainContract.hasModuleAccess(msg.sender, ADMIN_ROLE),
            "CampaignsModule: Only campaign admin or platform admin can call"
        );
        _;
    }

    function initialize(address _main) external initializer {
        __ReentrancyGuard_init();
        mainContract = ISovereignSeasV5(_main);
        nextCampaignId = 0;
    }

    // Campaign Creation Functions
    function _createCampaign(
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
        address _admin
    ) internal returns (uint256) {
        require(_startTime < _endTime, "CampaignsModule: Invalid time range");
        require(_startTime > block.timestamp, "CampaignsModule: Start time must be in future");
        require(bytes(_name).length > 0, "CampaignsModule: Name cannot be empty");
        require(_adminFeePercentage <= 30, "CampaignsModule: Admin fee too high");

        uint256 campaignId = nextCampaignId;
        nextCampaignId++;
        
        Campaign storage campaign = campaigns[campaignId];
        campaign.id = campaignId;
        campaign.admin = _admin;
        campaign.name = _name;
        campaign.description = _description;
        campaign.mainInfo = _mainInfo;
        campaign.additionalInfo = _additionalInfo;
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
        campaign.createdAt = block.timestamp;
        campaign.lastUpdated = block.timestamp;
        campaign.officialStatus = OfficialStatus.PENDING;
        campaign.campaignAdmins[_admin] = true;
        campaign.autoPoolCreated = false;
        campaign.featuredCampaign = false;
        campaign.minimumVoteAmount = 0;
        campaign.maximumVoteAmount = type(uint256).max;
        
        // Update indexes
        campaignIds.push(campaignId);
        adminCampaigns[_admin].push(campaignId);
        campaignsByStatus[OfficialStatus.PENDING].push(campaignId);
        campaignsByActiveStatus[true].push(campaignId);
        
        // Index by month for analytics
        uint256 monthTimestamp = (_startTime / 30 days) * 30 days;
        campaignsByMonth[monthTimestamp].push(campaignId);
        
        emit CampaignCreated(campaignId, _admin, _name, _startTime, _endTime);
        
        return campaignId;
    }

    function createCampaign(
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
    ) external nonReentrant hasRole(MANAGER_ROLE) returns (uint256) {
        return _createCampaign(
            _name,
            _description,
            _mainInfo,
            _additionalInfo,
            _startTime,
            _endTime,
            _adminFeePercentage,
            _maxWinners,
            _useQuadraticDistribution,
            _useCustomDistribution,
            _customDistributionData,
            _payoutToken,
            msg.sender
        );
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
    ) external nonReentrant returns (uint256) {
        return _createCampaign(
            _name,
            _description,
            _mainInfo,
            _additionalInfo,
            _startTime,
            _endTime,
            _adminFeePercentage,
            _maxWinners,
            _useQuadraticDistribution,
            _useCustomDistribution,
            _customDistributionData,
            _payoutToken,
            msg.sender
        );
    }
    
    /**
     * @dev Create ERC20-based campaign with token configuration
     */
    function createERC20Campaign(
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
        CampaignType _campaignType,
        address[] memory _allowedTokens,
        uint256[] memory _tokenWeights,
        address _projectAdditionFeeToken,
        uint256 _projectAdditionFeeAmount
    ) external nonReentrant hasRole(MANAGER_ROLE) returns (uint256) {
        require(_allowedTokens.length == _tokenWeights.length, "CampaignsModule: Arrays length mismatch");
        require(_allowedTokens.length > 0, "CampaignsModule: Must specify at least one token");
        
        // Validate campaign type
        require(_campaignType != CampaignType.STANDARD, "CampaignsModule: Use createCampaign for standard campaigns");
        
        // Validate tokens and weights
        for (uint256 i = 0; i < _allowedTokens.length; i++) {
            require(_allowedTokens[i] != address(0), "CampaignsModule: Invalid token address");
            require(_tokenWeights[i] > 0, "CampaignsModule: Token weight must be positive");
            
            // For TOKEN_ONLY campaigns, ensure CELO is not included
            if (_campaignType == CampaignType.TOKEN_ONLY) {
                // Get CELO token address from treasury
                bytes memory celoTokenData = mainContract.callModule("treasury", abi.encodeWithSignature("getCeloToken()"));
                address celoToken = abi.decode(celoTokenData, (address));
                require(_allowedTokens[i] != celoToken, "CampaignsModule: CELO not allowed in TOKEN_ONLY campaigns");
            }
        }
        
        // Validate project addition fee configuration
        require(_projectAdditionFeeToken != address(0), "CampaignsModule: Invalid project addition fee token");
        require(_projectAdditionFeeAmount > 0, "CampaignsModule: Project addition fee must be positive");
        
        // For TOKEN_ONLY campaigns, project addition fee must be in allowed tokens
        if (_campaignType == CampaignType.TOKEN_ONLY) {
            bool tokenAllowed = false;
            for (uint256 i = 0; i < _allowedTokens.length; i++) {
                if (_allowedTokens[i] == _projectAdditionFeeToken) {
                    tokenAllowed = true;
                    break;
                }
            }
            require(tokenAllowed, "CampaignsModule: Project addition fee token must be in allowed tokens");
        }
        
        uint256 campaignId = _createCampaign(
            _name,
            _description,
            _mainInfo,
            _additionalInfo,
            _startTime,
            _endTime,
            _adminFeePercentage,
            _maxWinners,
            _useQuadraticDistribution,
            _useCustomDistribution,
            _customDistributionData,
            _payoutToken,
            msg.sender
        );
        
        // Configure ERC20 settings
        Campaign storage campaign = campaigns[campaignId];
        campaign.campaignType = _campaignType;
        campaign.isERC20Campaign = true;
        
        // Set allowed tokens and weights
        for (uint256 i = 0; i < _allowedTokens.length; i++) {
            campaign.allowedVotingTokens.push(_allowedTokens[i]);
            campaign.tokenWeights[_allowedTokens[i]] = _tokenWeights[i];
            
            // Index by token
            campaignsByToken[_allowedTokens[i]].push(campaignId);
        }
        
        // Set project addition fee configuration
        campaign.projectAdditionFeeToken = _projectAdditionFeeToken;
        campaign.projectAdditionFeeAmount = _projectAdditionFeeAmount;
        
        // Index by campaign type
        campaignsByType[uint256(_campaignType)].push(campaignId);
        
        emit CampaignTokensUpdated(campaignId, _allowedTokens, _tokenWeights, msg.sender);
        
        return campaignId;
    }

    // Campaign Update Functions
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
    ) external campaignAdmin(_campaignId) activeCampaign(_campaignId) {
        require(_startTime < _endTime, "CampaignsModule: Invalid time range");
        
        Campaign storage campaign = campaigns[_campaignId];
        
        // Time update validation
        if (block.timestamp < campaign.startTime) {
            require(_startTime > block.timestamp, "CampaignsModule: Start time must be in future");
            campaign.startTime = _startTime;
        } else {
            require(_endTime > block.timestamp, "CampaignsModule: End time must be in future");
        }
        
        require(_adminFeePercentage <= campaign.adminFeePercentage, "CampaignsModule: Cannot increase admin fee");
        
        campaign.name = _name;
        campaign.description = _description;
        campaign.endTime = _endTime;
        campaign.adminFeePercentage = _adminFeePercentage;
        campaign.maxWinners = _maxWinners;
        campaign.useQuadraticDistribution = _useQuadraticDistribution;
        campaign.useCustomDistribution = _useCustomDistribution;
        campaign.payoutToken = _payoutToken;
        campaign.lastUpdated = block.timestamp;
        
        emit CampaignUpdated(_campaignId, msg.sender);
    }
    
    function updateCampaignMetadata(
        uint256 _campaignId,
        string memory _mainInfo,
        string memory _additionalInfo
    ) external campaignAdmin(_campaignId) activeCampaign(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        campaign.mainInfo = _mainInfo;
        campaign.additionalInfo = _additionalInfo;
        campaign.lastUpdated = block.timestamp;
        
        emit CampaignMetadataUpdated(_campaignId, msg.sender);
    }
    
    function updateCustomDistributionData(
        uint256 _campaignId,
        string memory _customDistributionData
    ) external campaignAdmin(_campaignId) activeCampaign(_campaignId) {
        campaigns[_campaignId].customDistributionData = _customDistributionData;
        campaigns[_campaignId].lastUpdated = block.timestamp;
        
        emit CampaignUpdated(_campaignId, msg.sender);
    }

    // Quick Edit Functions
    function editCampaignName(uint256 _campaignId, string memory _newName) external campaignAdmin(_campaignId) {
        require(bytes(_newName).length > 0, "CampaignsModule: Name cannot be empty");
        campaigns[_campaignId].name = _newName;
        campaigns[_campaignId].lastUpdated = block.timestamp;
        emit CampaignUpdated(_campaignId, msg.sender);
    }
    
    function editCampaignDescription(uint256 _campaignId, string memory _newDescription) external campaignAdmin(_campaignId) {
        campaigns[_campaignId].description = _newDescription;
        campaigns[_campaignId].lastUpdated = block.timestamp;
        emit CampaignUpdated(_campaignId, msg.sender);
    }
    
    function editCampaignEndTime(uint256 _campaignId, uint256 _newEndTime) external campaignAdmin(_campaignId) {
        require(_newEndTime > block.timestamp, "CampaignsModule: End time must be in future");
        require(_newEndTime > campaigns[_campaignId].startTime, "CampaignsModule: End time must be after start time");
        
        campaigns[_campaignId].endTime = _newEndTime;
        campaigns[_campaignId].lastUpdated = block.timestamp;
        emit CampaignUpdated(_campaignId, msg.sender);
    }
    
    function setCampaignWebsite(uint256 _campaignId, string memory _websiteUrl) external campaignAdmin(_campaignId) {
        campaigns[_campaignId].websiteUrl = _websiteUrl;
        campaigns[_campaignId].lastUpdated = block.timestamp;
        emit CampaignUpdated(_campaignId, msg.sender);
    }
    
    function setCampaignSocialMedia(uint256 _campaignId, string memory _socialMediaHandle) external campaignAdmin(_campaignId) {
        campaigns[_campaignId].socialMediaHandle = _socialMediaHandle;
        campaigns[_campaignId].lastUpdated = block.timestamp;
        emit CampaignUpdated(_campaignId, msg.sender);
    }
    
    function setCampaignVoteLimits(
        uint256 _campaignId, 
        uint256 _minimumVoteAmount, 
        uint256 _maximumVoteAmount
    ) external campaignAdmin(_campaignId) {
        require(_minimumVoteAmount <= _maximumVoteAmount, "CampaignsModule: Invalid vote limits");
        
        campaigns[_campaignId].minimumVoteAmount = _minimumVoteAmount;
        campaigns[_campaignId].maximumVoteAmount = _maximumVoteAmount;
        campaigns[_campaignId].lastUpdated = block.timestamp;
        emit CampaignUpdated(_campaignId, msg.sender);
    }
    
    // ERC20 Campaign Management Functions
    function updateCampaignType(
        uint256 _campaignId,
        CampaignType _newType
    ) external campaignAdmin(_campaignId) activeCampaign(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        CampaignType oldType = campaign.campaignType;
        
        require(_newType != oldType, "CampaignsModule: Same campaign type");
        
        // Validate type change
        if (_newType == CampaignType.TOKEN_ONLY) {
            // Ensure no CELO tokens in allowed tokens
            bytes memory celoTokenData = mainContract.callModule("treasury", abi.encodeWithSignature("getCeloToken()"));
            address celoToken = abi.decode(celoTokenData, (address));
            
            for (uint256 i = 0; i < campaign.allowedVotingTokens.length; i++) {
                require(campaign.allowedVotingTokens[i] != celoToken, "CampaignsModule: CELO not allowed in TOKEN_ONLY campaigns");
            }
        }
        
        campaign.campaignType = _newType;
        campaign.lastUpdated = block.timestamp;
        
        // Update indexing
        if (oldType != CampaignType.STANDARD) {
            // Remove from old type index
            _removeFromArray(campaignsByType[uint256(oldType)], _campaignId);
        }
        if (_newType != CampaignType.STANDARD) {
            // Add to new type index
            campaignsByType[uint256(_newType)].push(_campaignId);
        }
        
        emit CampaignTypeUpdated(_campaignId, oldType, _newType, msg.sender);
    }
    
    function updateCampaignTokens(
        uint256 _campaignId,
        address[] memory _newTokens,
        uint256[] memory _newWeights
    ) external campaignAdmin(_campaignId) activeCampaign(_campaignId) {
        require(_newTokens.length == _newWeights.length, "CampaignsModule: Arrays length mismatch");
        require(_newTokens.length > 0, "CampaignsModule: Must specify at least one token");
        
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.isERC20Campaign, "CampaignsModule: Not an ERC20 campaign");
        
        // Validate tokens and weights
        for (uint256 i = 0; i < _newTokens.length; i++) {
            require(_newTokens[i] != address(0), "CampaignsModule: Invalid token address");
            require(_newWeights[i] > 0, "CampaignsModule: Token weight must be positive");
            
            // For TOKEN_ONLY campaigns, ensure CELO is not included
            if (campaign.campaignType == CampaignType.TOKEN_ONLY) {
                bytes memory celoTokenData = mainContract.callModule("treasury", abi.encodeWithSignature("getCeloToken()"));
                address celoToken = abi.decode(celoTokenData, (address));
                require(_newTokens[i] != celoToken, "CampaignsModule: CELO not allowed in TOKEN_ONLY campaigns");
            }
        }
        
        // Remove old token indexing
        for (uint256 i = 0; i < campaign.allowedVotingTokens.length; i++) {
            _removeFromArray(campaignsByToken[campaign.allowedVotingTokens[i]], _campaignId);
        }
        
        // Clear old tokens and weights
        delete campaign.allowedVotingTokens;
        
        // Set new tokens and weights
        for (uint256 i = 0; i < _newTokens.length; i++) {
            campaign.allowedVotingTokens.push(_newTokens[i]);
            campaign.tokenWeights[_newTokens[i]] = _newWeights[i];
            
            // Index by token
            campaignsByToken[_newTokens[i]].push(_campaignId);
        }
        
        campaign.lastUpdated = block.timestamp;
        emit CampaignTokensUpdated(_campaignId, _newTokens, _newWeights, msg.sender);
    }
    
    function updateTokenWeight(
        uint256 _campaignId,
        address _token,
        uint256 _newWeight
    ) external campaignAdmin(_campaignId) activeCampaign(_campaignId) {
        require(_newWeight > 0, "CampaignsModule: Token weight must be positive");
        
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.isERC20Campaign, "CampaignsModule: Not an ERC20 campaign");
        require(campaign.tokenWeights[_token] > 0, "CampaignsModule: Token not configured for campaign");
        
        uint256 oldWeight = campaign.tokenWeights[_token];
        campaign.tokenWeights[_token] = _newWeight;
        campaign.lastUpdated = block.timestamp;
        
        emit CampaignTokenWeightUpdated(_campaignId, _token, oldWeight, _newWeight, msg.sender);
    }
    
    function updateProjectAdditionFee(
        uint256 _campaignId,
        address _newToken,
        uint256 _newAmount
    ) external campaignAdmin(_campaignId) activeCampaign(_campaignId) {
        require(_newToken != address(0), "CampaignsModule: Invalid token address");
        require(_newAmount > 0, "CampaignsModule: Fee amount must be positive");
        
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.isERC20Campaign, "CampaignsModule: Not an ERC20 campaign");
        
        // For TOKEN_ONLY campaigns, ensure the new token is in allowed tokens
        if (campaign.campaignType == CampaignType.TOKEN_ONLY) {
            bool tokenAllowed = false;
            for (uint256 i = 0; i < campaign.allowedVotingTokens.length; i++) {
                if (campaign.allowedVotingTokens[i] == _newToken) {
                    tokenAllowed = true;
                    break;
                }
            }
            require(tokenAllowed, "CampaignsModule: Project addition fee token must be in allowed tokens");
        }
        
        address oldToken = campaign.projectAdditionFeeToken;
        uint256 oldAmount = campaign.projectAdditionFeeAmount;
        
        campaign.projectAdditionFeeToken = _newToken;
        campaign.projectAdditionFeeAmount = _newAmount;
        campaign.lastUpdated = block.timestamp;
        
        emit ProjectAdditionFeeUpdated(_campaignId, oldToken, _newToken, oldAmount, _newAmount, msg.sender);
    }

    // Campaign Admin Management
    function addCampaignAdmin(uint256 _campaignId, address _newAdmin) external campaignAdmin(_campaignId) {
        require(_newAdmin != address(0), "CampaignsModule: Invalid admin address");
        require(!campaigns[_campaignId].campaignAdmins[_newAdmin], "CampaignsModule: Already an admin");
        
        campaigns[_campaignId].campaignAdmins[_newAdmin] = true;
        campaigns[_campaignId].lastUpdated = block.timestamp;
        
        emit CampaignAdminAdded(_campaignId, _newAdmin, msg.sender);
    }
    
    function removeCampaignAdmin(uint256 _campaignId, address _admin) external campaignAdmin(_campaignId) {
        require(_admin != campaigns[_campaignId].admin, "CampaignsModule: Cannot remove primary admin");
        require(campaigns[_campaignId].campaignAdmins[_admin], "CampaignsModule: Not an admin");
        
        campaigns[_campaignId].campaignAdmins[_admin] = false;
        campaigns[_campaignId].lastUpdated = block.timestamp;
        
        // Remove from admin list
        address[] storage adminList = campaigns[_campaignId].adminList;
        for (uint256 i = 0; i < adminList.length; i++) {
            if (adminList[i] == _admin) {
                adminList[i] = adminList[adminList.length - 1];
                adminList.pop();
                break;
            }
        }
        
        emit CampaignAdminRemoved(_campaignId, _admin, msg.sender);
    }
    
    function getCampaignAdmins(uint256 _campaignId) external view returns (address[] memory) {
        return campaigns[_campaignId].adminList;
    }

    // Tag Management
    function addCampaignTag(uint256 _campaignId, string memory _tag) external campaignAdmin(_campaignId) {
        require(!campaignHasTag[_campaignId][_tag], "CampaignsModule: Tag already exists");
        
        campaigns[_campaignId].tags.push(_tag);
        campaignHasTag[_campaignId][_tag] = true;
        campaignsByTag[_tag].push(_campaignId);
        campaigns[_campaignId].lastUpdated = block.timestamp;
        
        emit CampaignTagAdded(_campaignId, _tag);
    }
    
    function removeCampaignTag(uint256 _campaignId, string memory _tag) external campaignAdmin(_campaignId) {
        require(campaignHasTag[_campaignId][_tag], "CampaignsModule: Tag does not exist");
        
        // Remove from campaign tags array
        string[] storage tags = campaigns[_campaignId].tags;
        for (uint256 i = 0; i < tags.length; i++) {
            if (keccak256(bytes(tags[i])) == keccak256(bytes(_tag))) {
                tags[i] = tags[tags.length - 1];
                tags.pop();
                break;
            }
        }
        
        campaignHasTag[_campaignId][_tag] = false;
        campaigns[_campaignId].lastUpdated = block.timestamp;
        
        emit CampaignTagRemoved(_campaignId, _tag);
    }

    // User Vote Limits
    function setUserMaxVoteAmount(
        uint256 _campaignId,
        address _user,
        uint256 _maxAmount
    ) external campaignAdmin(_campaignId) {
        campaigns[_campaignId].userMaxVoteAmount[_user] = _maxAmount;
        campaigns[_campaignId].lastUpdated = block.timestamp;
        
        emit UserMaxVoteAmountSet(_campaignId, _user, _maxAmount);
    }

    // Campaign Funding Functions
    function fundCampaign(
        uint256 _campaignId,
        address _token,
        uint256 _amount
    ) external onlyMainContract {
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
    
    function updateCampaignStats(
        uint256 _campaignId,
        uint256 _participantCount,
        uint256 _projectCount
    ) external onlyMainContract {
        campaigns[_campaignId].totalParticipants = _participantCount;
        campaigns[_campaignId].totalProjects = _projectCount;
        campaigns[_campaignId].lastUpdated = block.timestamp;
    }

    // Admin Functions
    function updateCampaignStatus(
        uint256 _campaignId,
        OfficialStatus _newStatus,
        string memory _reason
    ) external hasRole(ADMIN_ROLE) campaignExists(_campaignId) {
        _updateCampaignStatus(_campaignId, _newStatus, _reason, msg.sender);
    }

    function _updateCampaignStatus(
        uint256 _campaignId,
        OfficialStatus _newStatus,
        string memory _reason,
        address _updatedBy
    ) internal {
        Campaign storage campaign = campaigns[_campaignId];
        OfficialStatus oldStatus = campaign.officialStatus;

        // Remove from old status array
        _removeCampaignFromStatus(oldStatus, _campaignId);

        campaign.officialStatus = _newStatus;
        campaign.lastUpdated = block.timestamp;

        // Add to new status array
        campaignsByStatus[_newStatus].push(_campaignId);

        emit CampaignStatusUpdated(_campaignId, oldStatus, _newStatus, _updatedBy, _reason);
    }
    
    function setCampaignFeatured(uint256 _campaignId, bool _featured) external hasRole(ADMIN_ROLE) campaignExists(_campaignId) {
        campaigns[_campaignId].featuredCampaign = _featured;
        campaigns[_campaignId].lastUpdated = block.timestamp;
        emit CampaignFeatured(_campaignId, _featured, msg.sender);
    }

    function batchUpdateCampaignStatus(
        uint256[] memory _campaignIds,
        OfficialStatus _newStatus,
        string memory _reason
    ) external hasRole(ADMIN_ROLE) {
        for (uint256 i = 0; i < _campaignIds.length; i++) {
            if (campaigns[_campaignIds[i]].id != 0) {
                _updateCampaignStatus(_campaignIds[i], _newStatus, _reason, msg.sender);
            }
        }
    }

    // Campaign State Management
    function deactivateCampaign(uint256 _campaignId) external campaignAdmin(_campaignId) {
        campaigns[_campaignId].active = false;
        campaigns[_campaignId].lastUpdated = block.timestamp;
        
        // Update active status index
        _removeCampaignFromActiveStatus(true, _campaignId);
        campaignsByActiveStatus[false].push(_campaignId);
        
        emit CampaignUpdated(_campaignId, msg.sender);
    }
    
    function reactivateCampaign(uint256 _campaignId) external hasRole(ADMIN_ROLE) {
        require(block.timestamp < campaigns[_campaignId].endTime, "CampaignsModule: Campaign has ended");
        
        campaigns[_campaignId].active = true;
        campaigns[_campaignId].lastUpdated = block.timestamp;
        
        // Update active status index
        _removeCampaignFromActiveStatus(false, _campaignId);
        campaignsByActiveStatus[true].push(_campaignId);
        
        emit CampaignUpdated(_campaignId, msg.sender);
    }

    // View Functions
    function getCampaign(uint256 _campaignId) external view returns (
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
    
    /**
     * @dev Get ERC20 campaign configuration
     */
    function getERC20CampaignConfig(uint256 _campaignId) external view returns (
        CampaignType campaignType,
        bool isERC20Campaign,
        address[] memory allowedTokens,
        uint256[] memory tokenWeights,
        address projectAdditionFeeToken,
        uint256 projectAdditionFeeAmount
    ) {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.id != 0, "CampaignsModule: Campaign does not exist");
        
        allowedTokens = campaign.allowedVotingTokens;
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
     * @dev Get campaigns by type
     */
    function getCampaignsByType(CampaignType _type) external view returns (uint256[] memory) {
        return campaignsByType[uint256(_type)];
    }
    
    /**
     * @dev Get campaigns that allow a specific token
     */
    function getCampaignsByToken(address _token) external view returns (uint256[] memory) {
        return campaignsByToken[_token];
    }
    
    /**
     * @dev Check if a token is allowed for voting in a campaign
     */
    function isTokenAllowedForCampaign(uint256 _campaignId, address _token) external view returns (bool) {
        Campaign storage campaign = campaigns[_campaignId];
        if (!campaign.isERC20Campaign) return false;
        
        return campaign.tokenWeights[_token] > 0;
    }
    
    /**
     * @dev Get token weight for a campaign
     */
    function getTokenWeight(uint256 _campaignId, address _token) external view returns (uint256) {
        Campaign storage campaign = campaigns[_campaignId];
        if (!campaign.isERC20Campaign) return 0;
        
        return campaign.tokenWeights[_token];
    }
    
    /**
     * @dev Get project addition fee configuration for a campaign
     */
    function getProjectAdditionFeeConfig(uint256 _campaignId) external view returns (
        address feeToken,
        uint256 feeAmount
    ) {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.id != 0, "CampaignsModule: Campaign does not exist");
        
        if (campaign.isERC20Campaign) {
            // ERC20 campaigns have custom fee configuration
            return (campaign.projectAdditionFeeToken, campaign.projectAdditionFeeAmount);
        } else {
            // Standard campaigns use global fee from TreasuryModule
            bytes memory feeData = mainContract.callModule("treasury", abi.encodeWithSignature("getProjectAdditionFee()"));
            uint256 globalFee = abi.decode(feeData, (uint256));
            
            // Get CELO token address
            bytes memory celoTokenData = mainContract.callModule("treasury", abi.encodeWithSignature("getCeloToken()"));
            address celoToken = abi.decode(celoTokenData, (address));
            
            return (celoToken, globalFee);
        }
    }
    
    /**
     * @dev Get campaign with pool status from PoolsModule
     */
    function getCampaignWithPoolStatus(uint256 _campaignId) external returns (
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
        uint256 totalFunds,
        uint256 totalPools,
        uint256 poolTotalFunds,
        uint256 poolTotalVotes,
        bool hasActivePools
    ) {
        Campaign storage campaign = campaigns[_campaignId];
        
        // Get pool status from PoolsModule
        uint256 totalPools = 0;
        uint256 poolTotalFunds = 0;
        uint256 poolTotalVotes = 0;
        bool hasActivePools = false;
        
        try mainContract.callModule("pools", abi.encodeWithSignature("getCampaignPoolStatus(uint256)", _campaignId)) returns (bytes memory poolData) {
            (uint256 pools, uint256 funds, uint256 votes, bool active) = abi.decode(poolData, (uint256, uint256, uint256, bool));
            totalPools = pools;
            poolTotalFunds = funds;
            poolTotalVotes = votes;
            hasActivePools = active;
        } catch {
            // Pool data not available
        }
        
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
            campaign.totalFunds,
            totalPools,
            poolTotalFunds,
            poolTotalVotes,
            hasActivePools
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
    
    function getCampaignEnhancedInfo(uint256 _campaignId) external view returns (
        OfficialStatus officialStatus,
        string memory websiteUrl,
        string memory socialMediaHandle,
        string[] memory tags,
        uint256 totalParticipants,
        uint256 totalProjects,
        bool featuredCampaign,
        uint256 minimumVoteAmount,
        uint256 maximumVoteAmount,
        uint256 lastUpdated
    ) {
        Campaign storage campaign = campaigns[_campaignId];
        return (
            campaign.officialStatus,
            campaign.websiteUrl,
            campaign.socialMediaHandle,
            campaign.tags,
            campaign.totalParticipants,
            campaign.totalProjects,
            campaign.featuredCampaign,
            campaign.minimumVoteAmount,
            campaign.maximumVoteAmount,
            campaign.lastUpdated
        );
    }
    
    function getCampaignsByAdmin(address _admin) external view returns (uint256[] memory) {
        return adminCampaigns[_admin];
    }
    
    function getCampaignsByTag(string memory _tag) external view returns (uint256[] memory) {
        return campaignsByTag[_tag];
    }
    
    function getCampaignsByStatus(OfficialStatus _status) external view returns (uint256[] memory) {
        return campaignsByStatus[_status];
    }
    
    function getActiveCampaigns() external view returns (uint256[] memory) {
        return campaignsByActiveStatus[true];
    }
    
    function getInactiveCampaigns() external view returns (uint256[] memory) {
        return campaignsByActiveStatus[false];
    }
    
    function getFeaturedCampaigns() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < campaignIds.length; i++) {
            if (campaigns[campaignIds[i]].featuredCampaign && campaigns[campaignIds[i]].active) {
                count++;
            }
        }
        
        uint256[] memory featured = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < campaignIds.length; i++) {
            if (campaigns[campaignIds[i]].featuredCampaign && campaigns[campaignIds[i]].active) {
                featured[index++] = campaignIds[i];
            }
        }
        
        return featured;
    }
    
    function getCampaignCount() external view returns (uint256) {
        return nextCampaignId;
    }
    
    function getAllCampaignIds() external view returns (uint256[] memory) {
        return campaignIds;
    }

    // V4 Compatibility Functions
    function getCampaignVotedTokens(uint256 _campaignId) external view returns (address[] memory) {
        return campaignUsedTokens[_campaignId];
    }
    
    function getCampaignTokenAmount(uint256 _campaignId, address _token) external view returns (uint256) {
        return campaigns[_campaignId].tokenAmounts[_token];
    }
    
    function isCampaignAdmin(uint256 _campaignId, address _admin) external view returns (bool) {
        if (_campaignId >= nextCampaignId) return false;
        return campaigns[_campaignId].admin == _admin || 
               campaigns[_campaignId].campaignAdmins[_admin] || 
               mainContract.hasModuleAccess(_admin, ADMIN_ROLE);
    }
    
    function getUserMaxVoteAmount(uint256 _campaignId, address _user) external view returns (uint256) {
        return campaigns[_campaignId].userMaxVoteAmount[_user];
    }

    // Search and Filter Functions
    function searchCampaignsByName(string memory _searchTerm) external view returns (uint256[] memory) {
        uint256[] memory results = new uint256[](campaignIds.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < campaignIds.length; i++) {
            uint256 campaignId = campaignIds[i];
            if (_containsIgnoreCase(campaigns[campaignId].name, _searchTerm)) {
                results[count++] = campaignId;
            }
        }
        
        // Resize array
        uint256[] memory finalResults = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            finalResults[i] = results[i];
        }
        
        return finalResults;
    }
    
    function getCampaignsByTimeRange(uint256 _startTime, uint256 _endTime) external view returns (uint256[] memory) {
        uint256[] memory results = new uint256[](campaignIds.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < campaignIds.length; i++) {
            uint256 campaignId = campaignIds[i];
            Campaign storage campaign = campaigns[campaignId];
            
            // Check if campaign overlaps with time range
            if (campaign.startTime <= _endTime && campaign.endTime >= _startTime) {
                results[count++] = campaignId;
            }
        }
        
        // Resize array
        uint256[] memory finalResults = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            finalResults[i] = results[i];
        }
        
        return finalResults;
    }
    
    function getCampaignsByMonth(uint256 _monthTimestamp) external view returns (uint256[] memory) {
        return campaignsByMonth[_monthTimestamp];
    }

    // Analytics Functions
    function getCampaignAnalytics(uint256 _campaignId) external view returns (
        uint256 totalFunds,
        uint256 totalParticipants,
        uint256 totalProjects,
        uint256 totalTokenTypes,
        uint256 daysRemaining,
        bool isActive,
        bool hasEnded
    ) {
        Campaign storage campaign = campaigns[_campaignId];
        
        totalFunds = campaign.totalFunds;
        totalParticipants = campaign.totalParticipants;
        totalProjects = campaign.totalProjects;
        totalTokenTypes = campaignUsedTokens[_campaignId].length;
        
        isActive = campaign.active && 
                   block.timestamp >= campaign.startTime && 
                   block.timestamp <= campaign.endTime;
        
        hasEnded = block.timestamp > campaign.endTime;
        
        if (!hasEnded && block.timestamp < campaign.endTime) {
            daysRemaining = (campaign.endTime - block.timestamp) / 1 days;
        } else {
            daysRemaining = 0;
        }
    }
    
    function getPlatformAnalytics() external view returns (
        uint256 totalCampaigns,
        uint256 activeCampaigns,
        uint256 totalFundsRaised,
        uint256 featuredCampaignsCount
    ) {
        totalCampaigns = campaignIds.length;
        activeCampaigns = campaignsByActiveStatus[true].length;
        
        for (uint256 i = 0; i < campaignIds.length; i++) {
            totalFundsRaised += campaigns[campaignIds[i]].totalFunds;
            if (campaigns[campaignIds[i]].featuredCampaign) {
                featuredCampaignsCount++;
            }
        }
    }

    // Internal helper functions
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
    
    function _removeCampaignFromActiveStatus(bool _active, uint256 _campaignId) internal {
        uint256[] storage campaigns = campaignsByActiveStatus[_active];
        for (uint256 i = 0; i < campaigns.length; i++) {
            if (campaigns[i] == _campaignId) {
                campaigns[i] = campaigns[campaigns.length - 1];
                campaigns.pop();
                break;
            }
        }
    }
    
    function _containsIgnoreCase(string memory _str, string memory _searchTerm) internal pure returns (bool) {
        bytes memory strBytes = bytes(_str);
        bytes memory searchBytes = bytes(_searchTerm);
        
        if (searchBytes.length > strBytes.length) return false;
        if (searchBytes.length == 0) return true;
        
        for (uint256 i = 0; i <= strBytes.length - searchBytes.length; i++) {
            bool found = true;
            for (uint256 j = 0; j < searchBytes.length; j++) {
                bytes1 strChar = strBytes[i + j];
                bytes1 searchChar = searchBytes[j];
                
                // Convert to lowercase for comparison
                if (strChar >= 0x41 && strChar <= 0x5A) strChar = bytes1(uint8(strChar) + 32);
                if (searchChar >= 0x41 && searchChar <= 0x5A) searchChar = bytes1(uint8(searchChar) + 32);
                
                if (strChar != searchChar) {
                    found = false;
                    break;
                }
            }
            if (found) return true;
        }
        return false;
    }

    // ==================== MIGRATION FUNCTIONS ====================
    
    // Create campaign from V4 migration data
    function createCampaignFromV4(
        uint256 _v4CampaignId,
        address _admin,
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
        bool _active,
        uint256 _totalFunds,
        uint256 _createdAt
    ) external onlyMainContract returns (uint256) {
        require(_v4CampaignId >= 0, "CampaignsModule: Invalid V4 campaign ID");
        require(_admin != address(0), "CampaignsModule: Invalid admin address");
        require(bytes(_name).length > 0, "CampaignsModule: Name cannot be empty");
        
        uint256 campaignId = nextCampaignId;
        nextCampaignId++;
        
        Campaign storage campaign = campaigns[campaignId];
        campaign.id = campaignId;
        campaign.admin = _admin;
        campaign.name = _name;
        campaign.description = _description;
        campaign.mainInfo = _mainInfo;
        campaign.additionalInfo = _additionalInfo;
        campaign.startTime = _startTime;
        campaign.endTime = _endTime;
        campaign.adminFeePercentage = _adminFeePercentage;
        campaign.maxWinners = _maxWinners;
        campaign.useQuadraticDistribution = _useQuadraticDistribution;
        campaign.useCustomDistribution = _useCustomDistribution;
        campaign.customDistributionData = _customDistributionData;
        campaign.payoutToken = _payoutToken;
        campaign.active = _active;
        campaign.totalFunds = _totalFunds;
        campaign.createdAt = _createdAt > 0 ? _createdAt : block.timestamp;
        campaign.lastUpdated = block.timestamp;
        campaign.officialStatus = OfficialStatus.PENDING;
        
        // Add to campaign arrays
        campaignIds.push(campaignId);
        adminCampaigns[_admin].push(campaignId);
        campaignsByActiveStatus[_active].push(campaignId);
        
        // Set default values for V5 fields
        campaign.autoPoolCreated = false;
        campaign.featuredCampaign = false;
        campaign.minimumVoteAmount = 0;
        campaign.maximumVoteAmount = type(uint256).max;
        
        emit CampaignCreated(campaignId, _admin, _name, _startTime, _endTime);
        
        return campaignId;
    }
    
    // Set campaign token amounts from V4 migration
    function setCampaignTokenAmountsFromV4(
        uint256 _campaignId,
        address[] memory _tokens,
        uint256[] memory _amounts
    ) external onlyMainContract campaignExists(_campaignId) {
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
    
    // Set user max vote amounts from V4 migration
    function setUserMaxVoteAmountsFromV4(
        uint256 _campaignId,
        address[] memory _users,
        uint256[] memory _maxAmounts
    ) external onlyMainContract campaignExists(_campaignId) {
        require(_users.length == _maxAmounts.length, "CampaignsModule: Array length mismatch");
        
        for (uint256 i = 0; i < _users.length; i++) {
            if (_users[i] != address(0) && _maxAmounts[i] > 0) {
                campaigns[_campaignId].userMaxVoteAmount[_users[i]] = _maxAmounts[i];
            }
        }
    }
    
    // Set campaign admins from V4 migration
    function setCampaignAdminsFromV4(
        uint256 _campaignId,
        address[] memory _admins
    ) external onlyMainContract campaignExists(_campaignId) {
        for (uint256 i = 0; i < _admins.length; i++) {
            if (_admins[i] != address(0)) {
                campaigns[_campaignId].campaignAdmins[_admins[i]] = true;
                emit CampaignAdminAdded(_campaignId, _admins[i], msg.sender);
            }
        }
    }
    
    // Set next campaign ID for V4 migration (to preserve IDs)
    function setNextCampaignId(uint256 _nextId) external onlyMainContract {
        require(_nextId >= nextCampaignId, "CampaignsModule: Can only increase nextCampaignId");
        nextCampaignId = _nextId;
    }

    // Module info
    function getModuleName() external pure returns (string memory) {
        return "campaigns";
    }
    
    function getModuleVersion() external pure returns (uint256) {
        return 5;
    }
    
    // ==================== HELPER FUNCTIONS ====================
    
    /**
     * @dev Remove an element from an array by value
     */
    function _removeFromArray(uint256[] storage _array, uint256 _value) internal {
        for (uint256 i = 0; i < _array.length; i++) {
            if (_array[i] == _value) {
                _array[i] = _array[_array.length - 1];
                _array.pop();
                break;
            }
        }
    }
}