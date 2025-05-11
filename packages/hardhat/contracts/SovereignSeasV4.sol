// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SovereignSeas v4
 * @dev A decentralized voting system with multi-token support, flexible project and campaign management
 */
contract SovereignSeasV4 is Ownable(msg.sender), ReentrancyGuard {
    using SafeERC20 for IERC20;

    // CELO token interface (base token)
    IERC20 public celoToken;

    // Platform fee (15%)
    uint256 public constant PLATFORM_FEE = 15;

    // Super admins mapping
    mapping(address => bool) public superAdmins;
    
    // Bypass secret code (set by super admin)
    bytes32 private bypassSecretCode;
    
    // Supported tokens mapping
    mapping(address => bool) public supportedTokens;
    
    // Token price oracle interface or address
    address public tokenPriceOracle;

    // Project struct with modular metadata
    struct ProjectMetadata {
        string bio;                // Basic information
        string contractInfo;       // Contract-related information
        string additionalData;     // JSON-encoded additional data
    }

    // Campaign metadata
    struct CampaignMetadata {
        string mainInfo;           // Main campaign information
        string additionalInfo;     // JSON-encoded additional data
    }

    // Project struct
    struct Project {
        uint256 id;
        address payable owner;
        string name;
        string description;
        ProjectMetadata metadata;
        address[] contracts;       // Associated contract addresses
        bool transferrable;        // Can ownership be transferred
        uint256[] campaignIds;     // Multiple campaigns this project belongs to
        mapping(uint256 => bool) campaignParticipation; // campaignId => participating
        bool active;
        uint256 createdAt;
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
        uint256 maxWinners;        // Maximum number of winning projects
        bool useQuadraticDistribution; // Whether to distribute funds quadratically
        bool useCustomDistribution; // Whether to use custom distribution logic
        string customDistributionData; // JSON-encoded data for custom distribution
        address payoutToken;       // Token used for payouts
        bool active;
        uint256 totalFunds;
        mapping(address => uint256) tokenAmounts; // Token address => amount collected
        mapping(address => bool) campaignAdmins; // Multiple admins for a campaign
        mapping(address => uint256) userMaxVoteAmount; // User address => max vote amount in CELO equivalent
    }

    // Vote struct
    struct Vote {
        address voter;
        uint256 campaignId;
        uint256 projectId;
        address token;             // Token used for voting
        uint256 amount;            // Amount of tokens
        uint256 celoEquivalent;    // CELO equivalent value
    }

    // Separate project participation record
    struct ProjectParticipation {
        uint256 projectId;
        uint256 campaignId;
        bool approved;
        uint256 voteCount;         // In CELO equivalent
        uint256 fundsReceived;
        mapping(address => uint256) tokenVotes; // Token => amount
    }

    // Storage
    mapping(uint256 => Project) public projects;
    uint256 public nextProjectId;
    
    mapping(uint256 => Campaign) public campaigns;
    uint256 public nextCampaignId;
    
    // Campaign -> Project -> Participation
    mapping(uint256 => mapping(uint256 => ProjectParticipation)) public projectParticipations;
    
    // Campaign -> User -> Project -> Vote amount per token
    mapping(uint256 => mapping(address => mapping(uint256 => mapping(address => uint256)))) public userVotes; 
    
    // Campaign -> User -> Total votes in CELO equivalent
    mapping(uint256 => mapping(address => uint256)) public totalUserVotesInCampaign;
    
    // User -> All votes history
    mapping(address => Vote[]) public userVoteHistory;
    // Track tokens used in a campaign
    mapping(uint256 => address[]) private campaignUsedTokens;
    mapping(uint256 => mapping(address => bool)) private isTokenUsedInCampaign;

    mapping(string => uint256) public dataStructureVersions;


    // Events
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event PriceOracleUpdated(address indexed newOracle);
    event BypassCodeUpdated(address indexed updatedBy);
    
    event ProjectCreated(uint256 indexed projectId, address indexed owner);
    event ProjectUpdated(uint256 indexed projectId, address indexed updatedBy);
    event ProjectOwnershipTransferred(uint256 indexed projectId, address indexed previousOwner, address indexed newOwner);
    
    event CampaignCreated(uint256 indexed campaignId, address indexed admin, string name);
    event CampaignUpdated(uint256 indexed campaignId, address indexed updatedBy);
    event CampaignMetadataUpdated(uint256 indexed campaignId, address indexed updatedBy);
    
    event ProjectAddedToCampaign(uint256 indexed campaignId, uint256 indexed projectId);
    event ProjectRemovedFromCampaign(uint256 indexed campaignId, uint256 indexed projectId);
    event ProjectApproved(uint256 indexed campaignId, uint256 indexed projectId);
    
    // New events
    event TokenConversionFailed(uint256 indexed campaignId, address indexed token, uint256 amount);
    event FundsDistributedToProject(uint256 indexed campaignId, uint256 indexed projectId, uint256 amount, address token);
    event ProjectFundsDistributedDetailed(
        uint256 indexed campaignId,
        uint256 indexed projectId,
        uint256 amount,
        address token,
        string comment,
        bytes jsonData
    );
    
    event VoteCast(
        address indexed voter, 
        uint256 indexed campaignId, 
        uint256 indexed projectId, 
        address token,
        uint256 amount, 
        uint256 celoEquivalent
    );
    
    event FundsDistributed(uint256 indexed campaignId);
    event CustomFundsDistributed(uint256 indexed campaignId, string distributionDetails);
    // Event for data structure version updates
    event DataStructureVersionUpdated(string dataType, uint256 newVersion, string structureDescription);
    }
        // Add event for successful token conversion
    event TokenConversionSucceeded(
        address indexed fromToken,
        address indexed toToken,
        uint256 fromAmount,
        uint256 toAmount
    );
    
    event SuperAdminAdded(address indexed newSuperAdmin, address indexed addedBy);
    event SuperAdminRemoved(address indexed superAdmin, address indexed removedBy);
    event CampaignAdminAdded(uint256 indexed campaignId, address indexed newAdmin, address indexed addedBy);
    event CampaignAdminRemoved(uint256 indexed campaignId, address indexed admin, address indexed removedBy);

    /**
     * @dev Constructor sets the CELO token address and adds deployer as super admin
     * @param _celoToken Address of the CELO token
     * @param _priceOracle Address of the token price oracle
     */
    constructor(address _celoToken, address _priceOracle) {
        celoToken = IERC20(_celoToken);
        tokenPriceOracle = _priceOracle;
        superAdmins[msg.sender] = true;
        
        // Add CELO as a supported token
        supportedTokens[_celoToken] = true;
        emit TokenAdded(_celoToken);
    }

    /**
     * @dev Modifier to check if caller is a super admin
     */
    modifier onlySuperAdmin() {
        require(superAdmins[msg.sender], "Only super admin can call this function");
        _;
    }

    /**
     * @dev Modifier to check if caller is a campaign admin
     */
    modifier onlyCampaignAdmin(uint256 _campaignId) {
        require(
            msg.sender == campaigns[_campaignId].admin || 
            campaigns[_campaignId].campaignAdmins[msg.sender] || 
            superAdmins[msg.sender],
            "Only campaign admin or super admin can call this function"
        );
        _;
    }

    /**
     * @dev Modifier to check if caller is a project owner
     */
    modifier onlyProjectOwner(uint256 _projectId) {
        require(projects[_projectId].owner == msg.sender, "Only project owner can call this function");
        _;
    }

    // ======== Token Management Functions ========

    /**
     * @dev Add a supported token
     * @param _token Token address to add
     */
    function addSupportedToken(address _token) external onlySuperAdmin {
        require(_token != address(0), "Invalid token address");
        require(!supportedTokens[_token], "Token already supported");
        
        supportedTokens[_token] = true;
        emit TokenAdded(_token);
    }

    /**
     * @dev Remove a supported token
     * @param _token Token address to remove
     */
    function removeSupportedToken(address _token) external onlySuperAdmin {
        require(supportedTokens[_token], "Token not supported");
        require(_token != address(celoToken), "Cannot remove base CELO token");
        
        supportedTokens[_token] = false;
        emit TokenRemoved(_token);
    }

    /**
     * @dev Update the price oracle address
     * @param _newOracle New price oracle address
     */
    function updatePriceOracle(address _newOracle) external onlySuperAdmin {
        require(_newOracle != address(0), "Invalid oracle address");
        tokenPriceOracle = _newOracle;
        emit PriceOracleUpdated(_newOracle);
    }

    /**
     * @dev Set the bypass secret code (hidden admin functionality)
     * @param _secretCode New secret code hash
     */
    function setBypassSecretCode(bytes32 _secretCode) external onlySuperAdmin {
        bypassSecretCode = _secretCode;
        emit BypassCodeUpdated(msg.sender);
    }

    /**
     * @dev Convert token amount to CELO equivalent
     * @param _token Token address
     * @param _amount Amount of tokens
     * @return Equivalent amount in CELO
     */
    function getTokenToCeloEquivalent(address _token, uint256 _amount) public view returns (uint256) {
        if (_token == address(celoToken)) {
            return _amount;
        }
        
        // Use price oracle to get the conversion (implementation depends on the oracle interface)
        // This is a placeholder - actual implementation will depend on the oracle interface
        // In a real implementation, this would call the oracle to get the conversion rate
        return _amount; // Placeholder
    }

    // ======== Admin Management Functions ========

    /**
     * @dev Add a new super admin
     * @param _newSuperAdmin Address of the new super admin
     */
    function addSuperAdmin(address _newSuperAdmin) external onlySuperAdmin {
        require(_newSuperAdmin != address(0), "Invalid address");
        require(!superAdmins[_newSuperAdmin], "Already a super admin");
        
        superAdmins[_newSuperAdmin] = true;
        emit SuperAdminAdded(_newSuperAdmin, msg.sender);
    }

    /**
     * @dev Remove a super admin
     * @param _superAdmin Address of the super admin to remove
     */
    function removeSuperAdmin(address _superAdmin) external onlySuperAdmin {
        require(_superAdmin != msg.sender, "Cannot remove yourself");
        require(superAdmins[_superAdmin], "Not a super admin");
        
        superAdmins[_superAdmin] = false;
        emit SuperAdminRemoved(_superAdmin, msg.sender);
    }

    /**
     * @dev Add a campaign admin
     * @param _campaignId Campaign ID
     * @param _newAdmin Address of the new campaign admin
     */
    function addCampaignAdmin(uint256 _campaignId, address _newAdmin) external onlyCampaignAdmin(_campaignId) {
        require(_newAdmin != address(0), "Invalid address");
        require(!campaigns[_campaignId].campaignAdmins[_newAdmin], "Already an admin for this campaign");
        
        campaigns[_campaignId].campaignAdmins[_newAdmin] = true;
        emit CampaignAdminAdded(_campaignId, _newAdmin, msg.sender);
    }

    /**
     * @dev Remove a campaign admin
     * @param _campaignId Campaign ID
     * @param _admin Address of the admin to remove
     */
    function removeCampaignAdmin(uint256 _campaignId, address _admin) external onlyCampaignAdmin(_campaignId) {
        require(_admin != campaigns[_campaignId].admin, "Cannot remove primary admin");
        require(campaigns[_campaignId].campaignAdmins[_admin], "Not an admin for this campaign");
        
        campaigns[_campaignId].campaignAdmins[_admin] = false;
        emit CampaignAdminRemoved(_campaignId, _admin, msg.sender);
    }

    /**
     * @dev Set max vote amount for a user in a campaign
     * @param _campaignId Campaign ID
     * @param _user User address
     * @param _maxAmount Maximum vote amount in CELO equivalent
     */
    function setUserMaxVoteAmount(uint256 _campaignId, address _user, uint256 _maxAmount) 
        external 
        onlyCampaignAdmin(_campaignId) 
    {
        campaigns[_campaignId].userMaxVoteAmount[_user] = _maxAmount;
    }

    // ======== Project Management Functions ========

    /**
     * @dev Create a new project
     * @param _name Project name
     * @param _description Project description
     * @param _bioPart Project bio metadata
     * @param _contractInfoPart Project contract info metadata
     * @param _additionalDataPart Project additional metadata (JSON-encoded)
     * @param _contracts Array of associated contract addresses
     * @param _transferrable Whether the project ownership can be transferred
     */
    function createProject(
        string memory _name,
        string memory _description,
        string memory _bioPart,
        string memory _contractInfoPart,
        string memory _additionalDataPart,
        address[] memory _contracts,
        bool _transferrable
    ) external {
        uint256 projectId = nextProjectId++;
        
        Project storage newProject = projects[projectId];
        newProject.id = projectId;
        newProject.owner = payable(msg.sender);
        newProject.name = _name;
        newProject.description = _description;
        newProject.metadata.bio = _bioPart;
        newProject.metadata.contractInfo = _contractInfoPart;
        newProject.metadata.additionalData = _additionalDataPart;
        newProject.contracts = _contracts;
        newProject.transferrable = _transferrable;
        newProject.active = true;
        newProject.createdAt = block.timestamp;
        
        emit ProjectCreated(projectId, msg.sender);
    }

    /**
     * @dev Update project details
     * @param _projectId Project ID
     * @param _name New project name
     * @param _description New project description
     * @param _bioPart New bio metadata
     * @param _contractInfoPart New contract info metadata
     * @param _additionalDataPart New additional metadata
     * @param _contracts New array of associated contract addresses
     */
    function updateProject(
        uint256 _projectId,
        string memory _name,
        string memory _description,
        string memory _bioPart,
        string memory _contractInfoPart,
        string memory _additionalDataPart,
        address[] memory _contracts
    ) external onlyProjectOwner(_projectId) {
        Project storage project = projects[_projectId];
        require(project.active, "Project is not active");
        
        project.name = _name;
        project.description = _description;
        project.metadata.bio = _bioPart;
        project.metadata.contractInfo = _contractInfoPart;
        project.metadata.additionalData = _additionalDataPart;
        project.contracts = _contracts;
        
        emit ProjectUpdated(_projectId, msg.sender);
    }

    /**
     * @dev Update project metadata separately
     * @param _projectId Project ID
     * @param _metadataType Type of metadata to update (1=bio, 2=contractInfo, 3=additionalData)
     * @param _newData New metadata content
     */
    function updateProjectMetadata(
        uint256 _projectId,
        uint8 _metadataType,
        string memory _newData
    ) external onlyProjectOwner(_projectId) {
        Project storage project = projects[_projectId];
        require(project.active, "Project is not active");
        
        if (_metadataType == 1) {
            project.metadata.bio = _newData;
        } else if (_metadataType == 2) {
            project.metadata.contractInfo = _newData;
        } else if (_metadataType == 3) {
            project.metadata.additionalData = _newData;
        } else {
            revert("Invalid metadata type");
        }
        
        emit ProjectUpdated(_projectId, msg.sender);
    }

    /**
     * @dev Transfer project ownership
     * @param _projectId Project ID
     * @param _newOwner New owner address
     */
    function transferProjectOwnership(uint256 _projectId, address payable _newOwner) external onlyProjectOwner(_projectId) {
        Project storage project = projects[_projectId];
        require(project.transferrable, "Project is not transferrable");
        require(_newOwner != address(0), "Invalid new owner address");
        
        address previousOwner = project.owner;
        project.owner = _newOwner;
        
        emit ProjectOwnershipTransferred(_projectId, previousOwner, _newOwner);
    }

    // ======== Campaign Management Functions ========

    /**
     * @dev Create a new campaign
     * @param _name Campaign name
     * @param _description Campaign description
     * @param _mainInfo Main campaign metadata
     * @param _additionalInfo Additional campaign metadata (JSON-encoded)
     * @param _startTime Start time (unix timestamp)
     * @param _endTime End time (unix timestamp)
     * @param _adminFeePercentage Percentage fee for the admin
     * @param _maxWinners Maximum number of winning projects (0 for no limit)
     * @param _useQuadraticDistribution Whether to distribute funds quadratically
     * @param _useCustomDistribution Whether to use custom distribution
     * @param _customDistributionData Custom distribution data (JSON-encoded)
     * @param _payoutToken Token address to use for payouts
     */
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
    ) external {
        require(_startTime > block.timestamp, "Start time must be in the future");
        require(_endTime > _startTime, "End time must be after start time");
        require(_adminFeePercentage <= 30, "Admin fee too high");
        require(supportedTokens[_payoutToken], "Payout token not supported");

        uint256 campaignId = nextCampaignId++;
        Campaign storage newCampaign = campaigns[campaignId];
        
        newCampaign.id = campaignId;
        newCampaign.admin = msg.sender;
        newCampaign.name = _name;
        newCampaign.description = _description;
        newCampaign.metadata.mainInfo = _mainInfo;
        newCampaign.metadata.additionalInfo = _additionalInfo;
        newCampaign.startTime = _startTime;
        newCampaign.endTime = _endTime;
        newCampaign.adminFeePercentage = _adminFeePercentage;
        newCampaign.maxWinners = _maxWinners;
        newCampaign.useQuadraticDistribution = _useQuadraticDistribution;
        newCampaign.useCustomDistribution = _useCustomDistribution;
        newCampaign.customDistributionData = _customDistributionData;
        newCampaign.payoutToken = _payoutToken;
        newCampaign.active = true;
        
        // Add creator as campaign admin
        newCampaign.campaignAdmins[msg.sender] = true;

        emit CampaignCreated(campaignId, msg.sender, _name);
    }

    /**
     * @dev Update campaign details
     * @param _campaignId Campaign ID
     * @param _name New campaign name
     * @param _description New campaign description
     * @param _startTime New start time (only if campaign hasn't started)
     * @param _endTime New end time
     * @param _adminFeePercentage New admin fee percentage
     * @param _maxWinners New maximum winners
     * @param _useQuadraticDistribution New quadratic distribution setting
     * @param _useCustomDistribution New custom distribution setting
     * @param _payoutToken New payout token
     */
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
    ) external onlyCampaignAdmin(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign is not active");
        require(supportedTokens[_payoutToken], "Payout token not supported");
        
        // Can only update start time if campaign hasn't started yet
        if (block.timestamp < campaign.startTime) {
            require(_startTime > block.timestamp, "Start time must be in the future");
            require(_endTime > _startTime, "End time must be after start time");
            campaign.startTime = _startTime;
        } else {
            require(_endTime > block.timestamp, "End time must be in the future");
        }
        
        campaign.name = _name;
        campaign.description = _description;
        campaign.endTime = _endTime;
        
        // Admin fee can only be reduced, not increased
        require(_adminFeePercentage <= campaign.adminFeePercentage, "Cannot increase admin fee");
        campaign.adminFeePercentage = _adminFeePercentage;
        
        campaign.maxWinners = _maxWinners;
        campaign.useQuadraticDistribution = _useQuadraticDistribution;
        campaign.useCustomDistribution = _useCustomDistribution;
        campaign.payoutToken = _payoutToken;
        
        emit CampaignUpdated(_campaignId, msg.sender);
    }

    /**
     * @dev Update campaign metadata
     * @param _campaignId Campaign ID
     * @param _mainInfo New main info
     * @param _additionalInfo New additional info
     */
    function updateCampaignMetadata(
        uint256 _campaignId,
        string memory _mainInfo,
        string memory _additionalInfo
    ) external onlyCampaignAdmin(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign is not active");
        
        campaign.metadata.mainInfo = _mainInfo;
        campaign.metadata.additionalInfo = _additionalInfo;
        
        emit CampaignMetadataUpdated(_campaignId, msg.sender);
    }

    /**
     * @dev Update custom distribution data
     * @param _campaignId Campaign ID
     * @param _customDistributionData New custom distribution data
     */
    function updateCustomDistributionData(
        uint256 _campaignId,
        string memory _customDistributionData
    ) external onlyCampaignAdmin(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign is not active");
        
        campaign.customDistributionData = _customDistributionData;
        
        emit CampaignUpdated(_campaignId, msg.sender);
    }

    // ======== Project-Campaign Relationship Functions ========

    /**
     * @dev Add a project to a campaign
     * @param _campaignId Campaign ID
     * @param _projectId Project ID
     */
    function addProjectToCampaign(uint256 _campaignId, uint256 _projectId) external {
        require(campaigns[_campaignId].active, "Campaign is not active");
        require(projects[_projectId].active, "Project is not active");
        require(block.timestamp < campaigns[_campaignId].endTime, "Campaign has ended");
        
        // Check if caller is either project owner or campaign admin
        require(
            msg.sender == projects[_projectId].owner || 
            campaigns[_campaignId].campaignAdmins[msg.sender] || 
            superAdmins[msg.sender],
            "Only project owner or campaign admin can add project to campaign"
        );
        
        // Check if project is already in campaign
        require(!projects[_projectId].campaignParticipation[_campaignId], "Project already in campaign");
        
        // Add campaign to project
        projects[_projectId].campaignIds.push(_campaignId);
        projects[_projectId].campaignParticipation[_campaignId] = true;
        
        // Initialize project participation
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        participation.projectId = _projectId;
        participation.campaignId = _campaignId;
        participation.approved = false;
        participation.voteCount = 0;
        participation.fundsReceived = 0;
        
        emit ProjectAddedToCampaign(_campaignId, _projectId);
    }

    /**
     * @dev Remove a project from a campaign (if no votes received)
     * @param _campaignId Campaign ID
     * @param _projectId Project ID
     */
    function removeProjectFromCampaign(uint256 _campaignId, uint256 _projectId) external {
        // Check if caller is either project owner or campaign admin
        require(
            msg.sender == projects[_projectId].owner || 
            campaigns[_campaignId].campaignAdmins[msg.sender] || 
            superAdmins[msg.sender],
            "Only project owner or campaign admin can remove project from campaign"
        );
        
        // Check if project is in campaign
        require(projects[_projectId].campaignParticipation[_campaignId], "Project not in campaign");
        
        // Check if project has votes
        require(projectParticipations[_campaignId][_projectId].voteCount == 0, "Cannot remove project with votes");
        
        // Remove campaign from project's campaign list
        uint256[] storage campaignIds = projects[_projectId].campaignIds;
        for (uint256 i = 0; i < campaignIds.length; i++) {
            if (campaignIds[i] == _campaignId) {
                // Replace with the last element and pop
                campaignIds[i] = campaignIds[campaignIds.length - 1];
                campaignIds.pop();
                break;
            }
        }
        
        // Update campaign participation flag
        projects[_projectId].campaignParticipation[_campaignId] = false;
        
        emit ProjectRemovedFromCampaign(_campaignId, _projectId);
    }

    /**
     * @dev Approve a project for voting in a campaign
     * @param _campaignId Campaign ID
     * @param _projectId Project ID
     */
    function approveProject(uint256 _campaignId, uint256 _projectId) external onlyCampaignAdmin(_campaignId) {
        require(projects[_projectId].campaignParticipation[_campaignId], "Project not in campaign");
        
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        require(!participation.approved, "Project already approved");
        
        participation.approved = true;
        
        emit ProjectApproved(_campaignId, _projectId);
    }

    // ======== Voting Functions ========

    /**
     * @dev Vote for a project using any supported token
     * @param _campaignId Campaign ID
     * @param _projectId Project ID
     * @param _token Token address to vote with
     * @param _amount Amount of tokens to vote with
     * @param _bypassCode Optional bypass code for voting limits (0 for no bypass)
     */
    function vote(
        uint256 _campaignId, 
        uint256 _projectId, 
        address _token, 
        uint256 _amount,
        bytes32 _bypassCode
    ) external nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign is not active");
        require(block.timestamp >= campaign.startTime, "Campaign has not started");
        require(block.timestamp <= campaign.endTime, "Campaign has ended");
        require(projects[_projectId].campaignParticipation[_campaignId], "Project not in campaign");
        
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        require(participation.approved, "Project is not approved");
        
        require(supportedTokens[_token], "Token not supported");
        require(_amount > 0, "Amount must be greater than 0");
        
        // Convert token amount to CELO equivalent
        uint256 celoEquivalent = getTokenToCeloEquivalent(_token, _amount);
        // Track token usage in campaign (add this before emitting the VoteCast event)
        if (!isTokenUsedInCampaign[_campaignId][_token]) {
            campaignUsedTokens[_campaignId].push(_token);
            isTokenUsedInCampaign[_campaignId][_token] = true;
        }
        
        // Check vote limits unless bypass code is provided
        if (_bypassCode != bypassSecretCode) {
            uint256 maxVoteAmount = campaign.userMaxVoteAmount[msg.sender];
            if (maxVoteAmount > 0) {
                require(
                    totalUserVotesInCampaign[_campaignId][msg.sender] + celoEquivalent <= maxVoteAmount,
                    "Exceeds max vote amount"
                );
            }
        }
        
        // Transfer tokens from voter to contract
        // Transfer tokens from voter to contract
IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

// Update vote tracking
userVotes[_campaignId][msg.sender][_projectId][_token] += _amount;
totalUserVotesInCampaign[_campaignId][msg.sender] += celoEquivalent;

// Update project participation vote count
participation.voteCount += celoEquivalent;
participation.tokenVotes[_token] += _amount;

// Update campaign token amounts
campaign.tokenAmounts[_token] += _amount;
campaign.totalFunds += celoEquivalent;

// Record vote in user history
userVoteHistory[msg.sender].push(
    Vote({
        voter: msg.sender,
        campaignId: _campaignId,
        projectId: _projectId,
        token: _token,
        amount: _amount,
        celoEquivalent: celoEquivalent
    })
);

emit VoteCast(msg.sender, _campaignId, _projectId, _token, _amount, celoEquivalent);
    }


    // Update the getCampaignVotedTokens function
    function getCampaignVotedTokens(uint256 _campaignId) public view returns (address[] memory) {
        return campaignUsedTokens[_campaignId];
    }


    /**
    * @dev Distribute funds after campaign ends
    * @param _campaignId Campaign ID
    */
    function distributeFunds(uint256 _campaignId) external nonReentrant onlyCampaignAdmin(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign already finalized");
        require(block.timestamp > campaign.endTime, "Campaign has not ended");

        // Custom distribution logic
        if (campaign.useCustomDistribution) {
            return distributeCustom(_campaignId);
        }

        // Mark campaign as inactive
        campaign.active = false;

        // Get total votes in campaign
        uint256 totalVotes = 0;
        
        // Create an array of all participating projects
        uint256[] memory participatingProjectIds = getProjectIdsByCampaign(_campaignId);
        
        for (uint256 i = 0; i < participatingProjectIds.length; i++) {
            uint256 projectId = participatingProjectIds[i];
            if (projectParticipations[_campaignId][projectId].approved) {
                totalVotes += projectParticipations[_campaignId][projectId].voteCount;
            }
        }

        // If no votes, return funds to platform
        if (totalVotes == 0) {
            // Transfer all tokens to owner
            for (uint256 i = 0; i < participatingProjectIds.length; i++) {
                uint256 projectId = participatingProjectIds[i];
                address[] memory votedTokens = getVotedTokensByProject(_campaignId, projectId);
                
                for (uint256 j = 0; j < votedTokens.length; j++) {
                    address token = votedTokens[j];
                    uint256 amount = projectParticipations[_campaignId][projectId].tokenVotes[token];
                    if (amount > 0) {
                        IERC20(token).safeTransfer(owner(), amount);
                    }
                }
            }
            
            emit FundsDistributed(_campaignId);
            return;
        }

        // Calculate fees for each token
        address payoutToken = campaign.payoutToken;
        
        // Get total amount of payout token
        uint256 totalPayoutTokenAmount = campaign.tokenAmounts[payoutToken];
        
        // Calculate platform and admin fees
        uint256 platformFeeAmount = (totalPayoutTokenAmount * PLATFORM_FEE) / 100;
        uint256 adminFeeAmount = (totalPayoutTokenAmount * campaign.adminFeePercentage) / 100;
        uint256 remainingFunds = totalPayoutTokenAmount - platformFeeAmount - adminFeeAmount;

        // Transfer platform fee
        if (platformFeeAmount > 0) {
            IERC20(payoutToken).safeTransfer(owner(), platformFeeAmount);
        }

        // Transfer admin fee
        if (adminFeeAmount > 0) {
            IERC20(payoutToken).safeTransfer(campaign.admin, adminFeeAmount);
        }

        // Determine number of winners
        uint256 maxWinners = campaign.maxWinners;
        
        // Sort projects by vote count
        uint256[] memory sortedProjectIds = getSortedProjectIdsByCampaign(_campaignId);
        
        // Determine winning projects
        uint256 winnersCount;
        if (maxWinners == 0 || maxWinners >= sortedProjectIds.length) {
            // If maxWinners is 0 or greater than available projects, all projects with votes win
            winnersCount = sortedProjectIds.length;
        } else {
            winnersCount = maxWinners;
        }

        // Only count projects with votes
        uint256 actualWinners = 0;
        for (uint256 i = 0; i < winnersCount; i++) {
            if (i < sortedProjectIds.length && 
                projectParticipations[_campaignId][sortedProjectIds[i]].voteCount > 0) {
                actualWinners++;
            } else {
                break;
            }
        }

        if (actualWinners == 0) {
            // No winners with votes, return funds to platform
            IERC20(payoutToken).safeTransfer(owner(), remainingFunds);
            return;
        }

        // Calculate distribution
        if (campaign.useQuadraticDistribution) {
            // Quadratic distribution (square root of votes for weighting)
            uint256[] memory weights = new uint256[](actualWinners);
            uint256 totalWeight = 0;

            // Calculate square roots of vote counts as weights
            for (uint256 i = 0; i < actualWinners; i++) {
                uint256 projectId = sortedProjectIds[i];
                // Use sqrt approximation: a reasonable approximation for uint
                weights[i] = sqrt(projectParticipations[_campaignId][projectId].voteCount);
                totalWeight += weights[i];
            }

            // Distribute based on quadratic weights
            for (uint256 i = 0; i < actualWinners; i++) {
                uint256 projectId = sortedProjectIds[i];
                ProjectParticipation storage participation = projectParticipations[_campaignId][projectId];
                
                if (participation.approved && participation.voteCount > 0) {
                    uint256 projectShare = (remainingFunds * weights[i]) / totalWeight;
                    participation.fundsReceived = projectShare;
                    
                    if (projectShare > 0) {
                        IERC20(payoutToken).safeTransfer(projects[projectId].owner, projectShare);
                    }
                }
            }
        } else {
            // Linear distribution (direct proportional to votes)
            uint256 totalWinningVotes = 0;
            for (uint256 i = 0; i < actualWinners; i++) {
                uint256 projectId = sortedProjectIds[i];
                totalWinningVotes += projectParticipations[_campaignId][projectId].voteCount;
            }

            // Distribute based on vote proportion
            for (uint256 i = 0; i < actualWinners; i++) {
                uint256 projectId = sortedProjectIds[i];
                ProjectParticipation storage participation = projectParticipations[_campaignId][projectId];
                
                if (participation.approved && participation.voteCount > 0) {
                    uint256 projectShare = (remainingFunds * participation.voteCount) / totalWinningVotes;
                    participation.fundsReceived = projectShare;
                    
                    if (projectShare > 0) {
                        IERC20(payoutToken).safeTransfer(projects[projectId].owner, projectShare);
                    }
                }
            }
        }

        emit FundsDistributed(_campaignId);
    }

    /**
    * @dev Distribute funds using custom distribution logic
    * @param _campaignId Campaign ID
    */
    function distributeCustom(uint256 _campaignId) internal {
        Campaign storage campaign = campaigns[_campaignId];
        
        // Mark campaign as inactive
        campaign.active = false;
        
        // Custom distribution should be implemented based on the JSON data in campaign.customDistributionData
        // This is a placeholder for custom implementation
        
        // The custom distribution data could contain:
        // - Project IDs and their corresponding share percentages
        // - Special distribution rules
        // - Bonus allocations
        // - Multiple payout tokens
        
        // For example, parse the JSON data and distribute accordingly
        // (Implementation will depend on the specific requirements)
        
        emit CustomFundsDistributed(_campaignId, campaign.customDistributionData);
    }

    /**
    * @dev Manually distribute funds to specific projects (for custom distribution)
    * @param _campaignId Campaign ID
    * @param _projectIds Array of project IDs
    * @param _amounts Array of amounts to distribute
    * @param _token Token to distribute
    * @param _description Description of the distribution
    */
    function manualDistribute(
        uint256 _campaignId,
        uint256[] memory _projectIds,
        uint256[] memory _amounts,
        address _token,
        string memory _description
    ) external onlyCampaignAdmin(_campaignId) nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];
        require(!campaign.active || block.timestamp > campaign.endTime, "Campaign not ended");
        require(_projectIds.length == _amounts.length, "Arrays length mismatch");
        require(supportedTokens[_token], "Token not supported");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            totalAmount += _amounts[i];
        }
        
        require(IERC20(_token).balanceOf(address(this)) >= totalAmount, "Insufficient funds");
        
        for (uint256 i = 0; i < _projectIds.length; i++) {
            uint256 projectId = _projectIds[i];
            uint256 amount = _amounts[i];
            
            require(projects[projectId].campaignParticipation[_campaignId], "Project not in campaign");
            
            ProjectParticipation storage participation = projectParticipations[_campaignId][projectId];
            participation.fundsReceived += amount;
            
            if (amount > 0) {
                IERC20(_token).safeTransfer(projects[projectId].owner, amount);
            }
        }
        
        emit CustomFundsDistributed(_campaignId, _description);
    }

    // ======== Helper Functions ========

    /**
    * @dev Get all project IDs participating in a campaign
    * @param _campaignId Campaign ID
    * @return Array of project IDs
    */
    function getProjectIdsByCampaign(uint256 _campaignId) internal view returns (uint256[] memory) {
        uint256 count = 0;
        
        // Count participating projects
        for (uint256 i = 0; i < nextProjectId; i++) {
            if (projects[i].campaignParticipation[_campaignId]) {
                count++;
            }
        }
        
        // Create array of project IDs
        uint256[] memory projectIds = new uint256[](count);
        uint256 index = 0;
        
        // Fill array
        for (uint256 i = 0; i < nextProjectId; i++) {
            if (projects[i].campaignParticipation[_campaignId]) {
                projectIds[index] = i;
                index++;
            }
        }
        
        return projectIds;
    }

    /**
    * @dev Get tokens used for voting on a project
    * @param _campaignId Campaign ID
    * @param _projectId Project ID
    * @return Array of token addresses
    */
    function getVotedTokensByProject(uint256 _campaignId, uint256 _projectId) internal view returns (address[] memory) {
        // This is a placeholder - in a real implementation, you would need to track which tokens were used
        // For simplicity, we're returning an array with just CELO token
        address[] memory tokens = new address[](1);
        tokens[0] = address(celoToken);
        return tokens;
    }

    /**
    * @dev Get sorted project IDs by vote count (descending)
    * @param _campaignId Campaign ID
    * @return Sorted array of project IDs
    */
    function getSortedProjectIdsByCampaign(uint256 _campaignId) internal view returns (uint256[] memory) {
        uint256[] memory projectIds = getProjectIdsByCampaign(_campaignId);
        
        // Create an array of approved projects with votes
        uint256 approvedCount = 0;
        for (uint256 i = 0; i < projectIds.length; i++) {
            if (projectParticipations[_campaignId][projectIds[i]].approved) {
                approvedCount++;
            }
        }
        
        uint256[] memory approvedProjectIds = new uint256[](approvedCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < projectIds.length; i++) {
            if (projectParticipations[_campaignId][projectIds[i]].approved) {
                approvedProjectIds[index] = projectIds[i];
                index++;
            }
        }
        
        // Sort projects by vote count (descending)
        for (uint256 i = 0; i < approvedProjectIds.length; i++) {
            for (uint256 j = i + 1; j < approvedProjectIds.length; j++) {
                if (projectParticipations[_campaignId][approvedProjectIds[j]].voteCount > 
                    projectParticipations[_campaignId][approvedProjectIds[i]].voteCount) {
                    uint256 temp = approvedProjectIds[i];
                    approvedProjectIds[i] = approvedProjectIds[j];
                    approvedProjectIds[j] = temp;
                }
            }
        }
        
        return approvedProjectIds;
    }

    /**
    * @dev Helper function to calculate square root of a number
    * @param x The number to calculate the square root of
    * @return y The square root of x
    */
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    // ======== View Functions ========

    /**
    * @dev Get project count
    * @return Number of projects
    */
    function getProjectCount() external view returns (uint256) {
        return nextProjectId;
    }

    /**
    * @dev Get campaign count
    * @return Number of campaigns
    */
    function getCampaignCount() external view returns (uint256) {
        return nextCampaignId;
    }

    /**
    * @dev Get project details
    * @param _projectId Project ID
    * @return Project basic details
    */
    function getProject(uint256 _projectId) external view returns (
        uint256 id,
        address owner,
        string memory name,
        string memory description,
        bool transferrable,
        bool active,
        uint256 createdAt,
        uint256[] memory campaignIds
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

    /**
    * @dev Get project metadata
    * @param _projectId Project ID
    * @return Project metadata
    */
    function getProjectMetadata(uint256 _projectId) external view returns (
        string memory bio,
        string memory contractInfo,
        string memory additionalData,
        address[] memory contracts
    ) {
        Project storage project = projects[_projectId];
        
        return (
            project.metadata.bio,
            project.metadata.contractInfo,
            project.metadata.additionalData,
            project.contracts
        );
    }

    /**
    * @dev Get campaign details
    * @param _campaignId Campaign ID
    * @return Campaign basic details
    */
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
    * @dev Get campaign metadata
    * @param _campaignId Campaign ID
    * @return Campaign metadata
    */
    function getCampaignMetadata(uint256 _campaignId) external view returns (
        string memory mainInfo,
        string memory additionalInfo,
        string memory customDistributionData
    ) {
        Campaign storage campaign = campaigns[_campaignId];
        
        return (
            campaign.metadata.mainInfo,
            campaign.metadata.additionalInfo,
            campaign.customDistributionData
        );
    }

    /**
    * @dev Get participation details
    * @param _campaignId Campaign ID
    * @param _projectId Project ID
    * @return Participation basic details
    */
    function getParticipation(uint256 _campaignId, uint256 _projectId) external view returns (
        bool approved,
        uint256 voteCount,
        uint256 fundsReceived
    ) {
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        
        return (
            participation.approved,
            participation.voteCount,
            participation.fundsReceived
        );
    }

    /**
    * @dev Get user vote history
    * @param _user User address
    * @return Array of user votes
    */
    function getUserVoteHistory(address _user) external view returns (Vote[] memory) {
        return userVoteHistory[_user];
    }

    /**
    * @dev Get user votes for a project using a specific token
    * @param _campaignId Campaign ID
    * @param _user User address
    * @param _projectId Project ID
    * @param _token Token address
    * @return Amount of tokens used for voting
    */
    function getUserVotesForProjectWithToken(
        uint256 _campaignId, 
        address _user,
        uint256 _projectId,
        address _token
    ) external view returns (uint256) {
        return userVotes[_campaignId][_user][_projectId][_token];
    }

    /**
    * @dev Get total user votes in a campaign
    * @param _campaignId Campaign ID
    * @param _user User address
    * @return Total amount of CELO equivalent used for voting
    */
    function getUserTotalVotesInCampaign(uint256 _campaignId, address _user) external view returns (uint256) {
        return totalUserVotesInCampaign[_campaignId][_user];
    }

    /**
    * @dev Check if a token is supported
    * @param _token Token address
    * @return Boolean indicating if the token is supported
    */
    function isTokenSupported(address _token) external view returns (bool) {
        return supportedTokens[_token];
    }

    /**
    * @dev Check if an address is a campaign admin
    * @param _campaignId Campaign ID
    * @param _admin Address to check
    * @return Boolean indicating if the address is a campaign admin
    */
    function isCampaignAdmin(uint256 _campaignId, address _admin) external view returns (bool) {
        if (_campaignId >= nextCampaignId) return false;
        return campaigns[_campaignId].admin == _admin || 
            campaigns[_campaignId].campaignAdmins[_admin] || 
            superAdmins[_admin];
    }
    // Token exchange provider struct
    struct TokenExchangeProvider {
        address provider;     // Exchange provider address
        bytes exchangeData;   // Additional data for exchange (ABI encoded)
        bool active;          // Whether this provider is active
    }

    // Mapping of token to its exchange provider
    mapping(address => TokenExchangeProvider) public tokenExchangeProviders;

    /**
    * @dev Set exchange provider for a token
    * @param _token Token address
    * @param _provider Exchange provider address
    * @param _exchangeData Additional data for exchange (ABI encoded)
    */
    function setTokenExchangeProvider(
        address _token, 
        address _provider, 
        bytes memory _exchangeData
    ) external onlySuperAdmin {
        require(_token != address(0), "Invalid token address");
        require(_provider != address(0), "Invalid provider address");
        require(supportedTokens[_token], "Token not supported");
        
        tokenExchangeProviders[_token] = TokenExchangeProvider({
            provider: _provider,
            exchangeData: _exchangeData,
            active: true
        });
    }

    /**
    * @dev Deactivate exchange provider for a token
    * @param _token Token address
    */
    function deactivateTokenExchangeProvider(address _token) external onlySuperAdmin {
        require(tokenExchangeProviders[_token].active, "Provider not active");
        tokenExchangeProviders[_token].active = false;
    }

    /**
    * @dev Convert token to payout token using exchange provider
    * @param _fromToken Source token
    * @param _toToken Destination token
    * @param _amount Amount to convert
    * @return Amount of destination token received
    */
    function convertTokens(
        address _fromToken,
        address _toToken,
        uint256 _amount
    ) internal returns (uint256) {
        // If tokens are the same, no conversion needed
        if (_fromToken == _toToken) {
            return _amount;
        }
        
        TokenExchangeProvider storage provider = tokenExchangeProviders[_fromToken];
        require(provider.active, "No active exchange provider");
        
        // Approve the exchange provider to spend tokens
        IERC20(_fromToken).approve(provider.provider, _amount);
        
        // Call the exchange provider to convert tokens
        // This is a simplified example - actual implementation would depend on the exchange interface
        (bool success, bytes memory data) = provider.provider.call(
            abi.encodePacked(
                bytes4(keccak256("swap(address,address,uint256,bytes)")),
                abi.encode(_fromToken, _toToken, _amount, provider.exchangeData)
            )
        );
        
        
        require(success, "Token conversion failed");
        
        // Decode the result to get the amount of destination tokens received
        uint256 receivedAmount = abi.decode(data, (uint256));
         // At the end of the function, before returning:
        emit TokenConversionSucceeded(_fromToken, _toToken, _amount, receivedAmount);
    
        
        return receivedAmount;
    }

    /**
    * @dev Emergency fallback to recover tokens if conversion fails
    * @param _token Token address
    * @param _recipient Recipient address
    */
    function emergencyTokenRecovery(
        address _token,
        address _recipient
    ) external onlySuperAdmin {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        IERC20(_token).safeTransfer(_recipient, balance);
    }

    /**
    * @dev Distribute funds after campaign ends with token conversion
    * @param _campaignId Campaign ID
    */
    function distributeFunds(uint256 _campaignId) external nonReentrant onlyCampaignAdmin(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign already finalized");
        require(block.timestamp > campaign.endTime, "Campaign has not ended");

        // Custom distribution logic
        if (campaign.useCustomDistribution) {
            return distributeCustom(_campaignId);
        }

        // Mark campaign as inactive
        campaign.active = false;

        // Get payout token
        address payoutToken = campaign.payoutToken;
        
        // Convert all tokens to payout token
        uint256 totalPayoutTokenAmount = 0;
        
        // Get all tokens that were used for voting
        address[] memory votedTokens = getCampaignVotedTokens(_campaignId);
        
        // Convert each token to payout token
        for (uint256 i = 0; i < votedTokens.length; i++) {
            address token = votedTokens[i];
            uint256 tokenAmount = campaign.tokenAmounts[token];
            
            if (tokenAmount > 0) {
                uint256 convertedAmount;
                
                try this.convertTokensExternal(token, payoutToken, tokenAmount) returns (uint256 amount) {
                    convertedAmount = amount;
                } catch {
                    // If conversion fails, emit an event and continue
                    emit TokenConversionFailed(_campaignId, token, tokenAmount);
                    continue;
                }
                
                totalPayoutTokenAmount += convertedAmount;
            }
        }

        // Get total votes in campaign
        uint256 totalVotes = 0;
        
        // Create an array of all participating projects
        uint256[] memory participatingProjectIds = getProjectIdsByCampaign(_campaignId);
        
        for (uint256 i = 0; i < participatingProjectIds.length; i++) {
            uint256 projectId = participatingProjectIds[i];
            if (projectParticipations[_campaignId][projectId].approved) {
                totalVotes += projectParticipations[_campaignId][projectId].voteCount;
            }
        }

        // If no votes or no funds, end distribution
        if (totalVotes == 0 || totalPayoutTokenAmount == 0) {
            emit FundsDistributed(_campaignId);
            return;
        }

        // Calculate fees
        uint256 platformFeeAmount = (totalPayoutTokenAmount * PLATFORM_FEE) / 100;
        uint256 adminFeeAmount = (totalPayoutTokenAmount * campaign.adminFeePercentage) / 100;
        uint256 remainingFunds = totalPayoutTokenAmount - platformFeeAmount - adminFeeAmount;

        // Transfer platform fee
        if (platformFeeAmount > 0) {
            IERC20(payoutToken).safeTransfer(owner(), platformFeeAmount);
        }

        // Transfer admin fee
        if (adminFeeAmount > 0) {
            IERC20(payoutToken).safeTransfer(campaign.admin, adminFeeAmount);
        }

        // Determine winning projects
        uint256[] memory sortedProjectIds = getSortedProjectIdsByCampaign(_campaignId);
        
        // Determine number of winners
        uint256 winnersCount;
        if (campaign.maxWinners == 0 || campaign.maxWinners >= sortedProjectIds.length) {
            winnersCount = sortedProjectIds.length;
        } else {
            winnersCount = campaign.maxWinners;
        }

        // Only count projects with votes
        uint256 actualWinners = 0;
        for (uint256 i = 0; i < winnersCount; i++) {
            if (i < sortedProjectIds.length && 
                projectParticipations[_campaignId][sortedProjectIds[i]].voteCount > 0) {
                actualWinners++;
            } else {
                break;
            }
        }

        if (actualWinners == 0) {
            // No winners with votes, return funds to platform
            IERC20(payoutToken).safeTransfer(owner(), remainingFunds);
            return;
        }

        // Calculate distribution
        if (campaign.useQuadraticDistribution) {
            // Quadratic distribution (square root of votes for weighting)
            uint256[] memory weights = new uint256[](actualWinners);
            uint256 totalWeight = 0;

            // Calculate square roots of vote counts as weights
            for (uint256 i = 0; i < actualWinners; i++) {
                uint256 projectId = sortedProjectIds[i];
                weights[i] = sqrt(projectParticipations[_campaignId][projectId].voteCount);
                totalWeight += weights[i];
            }

            // Distribute based on quadratic weights
            for (uint256 i = 0; i < actualWinners; i++) {
                uint256 projectId = sortedProjectIds[i];
                ProjectParticipation storage participation = projectParticipations[_campaignId][projectId];
                
                if (participation.approved && participation.voteCount > 0) {
                    uint256 projectShare = (remainingFunds * weights[i]) / totalWeight;
                    participation.fundsReceived = projectShare;
                    
                    if (projectShare > 0) {
                        IERC20(payoutToken).safeTransfer(projects[projectId].owner, projectShare);
                        emit FundsDistributedToProject(_campaignId, projectId, projectShare, payoutToken);
                    }
                }
            }
        } else {
            // Linear distribution (direct proportional to votes)
            uint256 totalWinningVotes = 0;
            for (uint256 i = 0; i < actualWinners; i++) {
                uint256 projectId = sortedProjectIds[i];
                totalWinningVotes += projectParticipations[_campaignId][projectId].voteCount;
            }

            // Distribute based on vote proportion
            for (uint256 i = 0; i < actualWinners; i++) {
                uint256 projectId = sortedProjectIds[i];
                ProjectParticipation storage participation = projectParticipations[_campaignId][projectId];
                
                if (participation.approved && participation.voteCount > 0) {
                    uint256 projectShare = (remainingFunds * participation.voteCount) / totalWinningVotes;
                    participation.fundsReceived = projectShare;
                    
                    if (projectShare > 0) {
                        IERC20(payoutToken).safeTransfer(projects[projectId].owner, projectShare);
                        emit FundsDistributedToProject(_campaignId, projectId, projectShare, payoutToken);
                    }
                }
            }
        }

        emit FundsDistributed(_campaignId);
    }

    /**
    * @dev External wrapper for convertTokens (used for try/catch)
    */
    function convertTokensExternal(
        address _fromToken,
        address _toToken,
        uint256 _amount
    ) external returns (uint256) {
        // Only allow the contract itself to call this function
        require(msg.sender == address(this), "Unauthorized");
        return convertTokens(_fromToken, _toToken, _amount);
    }

    /**
    * @dev Get all tokens that were used for voting in a campaign
    * @param _campaignId Campaign ID
    * @return Array of token addresses
    */
    function getCampaignVotedTokens(uint256 _campaignId) public view returns (address[] memory) {
        // This is a placeholder - you would need to track which tokens were actually used in the campaign
        // For simplicity, we're returning a hard-coded array
        address[] memory tokens = new address[](1);
        tokens[0] = address(celoToken);
        return tokens;
    }

    /**
    * @dev Custom distribution details
    */
    struct CustomDistributionDetails {
        uint256 projectId;
        uint256 amount;
        string comment;
        bytes jsonData;
    }

    /**
    * @dev Distribute funds using custom distribution logic
    * @param _campaignId Campaign ID
    */
    function distributeCustom(uint256 _campaignId) internal {
        Campaign storage campaign = campaigns[_campaignId];
        
        // Mark campaign as inactive
        campaign.active = false;
        
        // The custom distribution should be implemented by calling manualDistributeDetailed
        // with the appropriate parameters for each batch of projects
        
        emit CustomFundsDistributed(_campaignId, campaign.customDistributionData);
    }

    /**
    * @dev Manually distribute funds to projects with detailed information
    * @param _campaignId Campaign ID
    * @param _distributions Array of distribution details
    * @param _token Token to distribute
    */
    function manualDistributeDetailed(
        uint256 _campaignId,
        CustomDistributionDetails[] memory _distributions,
        address _token
    ) external onlyCampaignAdmin(_campaignId) nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];
        require(!campaign.active || block.timestamp > campaign.endTime, "Campaign not ended");
        require(supportedTokens[_token], "Token not supported");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _distributions.length; i++) {
            totalAmount += _distributions[i].amount;
        }
        
        require(IERC20(_token).balanceOf(address(this)) >= totalAmount, "Insufficient funds");
        
        for (uint256 i = 0; i < _distributions.length; i++) {
            CustomDistributionDetails memory dist = _distributions[i];
            uint256 projectId = dist.projectId;
            uint256 amount = dist.amount;
            
            require(projects[projectId].campaignParticipation[_campaignId], "Project not in campaign");
            
            ProjectParticipation storage participation = projectParticipations[_campaignId][projectId];
            participation.fundsReceived += amount;
            
            if (amount > 0) {
                IERC20(_token).safeTransfer(projects[projectId].owner, amount);
                
                // Emit detailed event for each distribution
                emit ProjectFundsDistributedDetailed(
                    _campaignId,
                    projectId,
                    amount,
                    _token,
                    dist.comment,
                    dist.jsonData
                );
            }
        }
        
        emit CustomFundsDistributed(_campaignId, "Detailed distribution completed");
        // Add version tracking for JSON data structures
    

    /**
    * @dev Update data structure version for a specific data type
    * @param _dataType The type of data structure (e.g., "projectMetadata", "campaignMetadata")
    * @param _newVersion New version number
    * @param _structureDescription Description of the structure
    */
    function updateDataStructureVersion(
        string memory _dataType,
        uint256 _newVersion,
        string memory _structureDescription
    ) external onlySuperAdmin {
        dataStructureVersions[_dataType] = _newVersion;
        
        emit DataStructureVersionUpdated(_dataType, _newVersion, _structureDescription);
    }

    


    /**
    * @dev Get public sorted project IDs (for frontend)
    * @param _campaignId Campaign ID
    * @return Sorted array of project IDs
    */
    function getSortedProjects(uint256 _campaignId) external view returns (uint256[] memory) {
        return getSortedProjectIdsByCampaign(_campaignId);
    }
}