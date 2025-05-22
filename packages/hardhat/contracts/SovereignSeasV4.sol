// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IBroker {
    function swapIn(address exchangeProvider, bytes32 exchangeId, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin) external returns (uint256 amountOut);
    function getAmountOut(address exchangeProvider, bytes32 exchangeId, address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256 amountOut);
    function exchangeProviders(uint256 index) external view returns (address);
}

contract SovereignSeasV4 is Ownable(msg.sender), ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants and Configuration
    IERC20 public celoToken;
    uint256 public constant PLATFORM_FEE = 15;
    uint256 public campaignCreationFee = 2 * 1e18;
    uint256 public projectAdditionFee = 1 * 1e18;
    address public mentoTokenBroker;
    bytes32 private bypassSecretCode;

    // Mappings
    mapping(address => bool) public superAdmins;
    mapping(address => uint256) public collectedFees;
    mapping(address => bool) public supportedTokens;
    mapping(address => TokenExchangeProvider) public tokenExchangeProviders;
    mapping(string => uint256) public dataStructureVersions;
    mapping(uint256 => Project) public projects;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(uint256 => ProjectParticipation)) public projectParticipations;
    mapping(uint256 => mapping(address => mapping(uint256 => mapping(address => uint256)))) public userVotes;
    mapping(uint256 => mapping(address => uint256)) public totalUserVotesInCampaign;
    mapping(address => Vote[]) public userVoteHistory;
    mapping(uint256 => address[]) private campaignUsedTokens;
    mapping(uint256 => mapping(address => bool)) private isTokenUsedInCampaign;

    address[] public supportedTokensList;
    uint256 public nextProjectId;
    uint256 public nextCampaignId;

    // Structs
    struct ProjectMetadata { string bio; string contractInfo; string additionalData; }
    struct CampaignMetadata { string mainInfo; string additionalInfo; }
    struct TokenExchangeProvider { address provider; bytes32 exchangeId; bool active; }

    struct Project {
        uint256 id;
        address payable owner;
        string name;
        string description;
        ProjectMetadata metadata;
        address[] contracts;
        bool transferrable;
        uint256[] campaignIds;
        mapping(uint256 => bool) campaignParticipation;
        bool active;
        uint256 createdAt;
    }

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
        bool useQuadraticDistribution;
        bool useCustomDistribution;
        string customDistributionData;
        address payoutToken;
        bool active;
        uint256 totalFunds;
        mapping(address => uint256) tokenAmounts;
        mapping(address => bool) campaignAdmins;
        mapping(address => uint256) userMaxVoteAmount;
    }

    struct Vote {
        address voter;
        uint256 campaignId;
        uint256 projectId;
        address token;
        uint256 amount;
        uint256 celoEquivalent;
    }

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

    // Events (consolidated similar events)
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event TokenExchangeProviderSet(address indexed token, address indexed provider, bytes32 exchangeId);
    event TokenExchangeProviderDeactivated(address indexed token);
    event BrokerUpdated(address indexed newBroker);
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
    event VoteCast(address indexed voter, uint256 indexed campaignId, uint256 indexed projectId, address token, uint256 amount, uint256 celoEquivalent);
    event FundsDistributed(uint256 indexed campaignId);
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

    // Modifiers
    modifier onlySuperAdmin() { require(superAdmins[msg.sender], "Only super admin can call this function"); _; }
    modifier onlyCampaignAdmin(uint256 _campaignId) {
        require(msg.sender == campaigns[_campaignId].admin || campaigns[_campaignId].campaignAdmins[msg.sender] || superAdmins[msg.sender], "Only campaign admin or super admin can call this function");
        _;
    }
    modifier onlyProjectOwner(uint256 _projectId) { require(projects[_projectId].owner == msg.sender, "Only project owner can call this function"); _; }
    modifier validAddress(address _addr) { require(_addr != address(0), "Invalid address"); _; }
    modifier activeProject(uint256 _projectId) { require(projects[_projectId].active, "Project is not active"); _; }
    modifier activeCampaign(uint256 _campaignId) { require(campaigns[_campaignId].active, "Campaign is not active"); _; }

    constructor(address _celoToken, address _broker) validAddress(_celoToken) validAddress(_broker) {
        celoToken = IERC20(_celoToken);
        mentoTokenBroker = _broker;
        superAdmins[msg.sender] = true;
        supportedTokens[_celoToken] = true;
        emit TokenAdded(_celoToken);
    }

    // Internal helper functions (reduces redundancy)
    function _validateAndCollectFee(address _feeToken, uint256 _baseFee, string memory _feeType, uint256 _campaignId) internal {
        require(supportedTokens[_feeToken], "Fee token not supported");
        if (canBypassFees(_campaignId, msg.sender)) return;
        
        uint256 feeAmount = _feeToken == address(celoToken) ? _baseFee : 
            (IBroker(mentoTokenBroker).getAmountOut(tokenExchangeProviders[address(celoToken)].provider, tokenExchangeProviders[address(celoToken)].exchangeId, address(celoToken), _feeToken, _baseFee) * 101) / 100;
        
        collectFee(_feeToken, feeAmount, _feeType);
    }

    function _setupTokenExchangeProvider(address _token, address _provider, bytes32 _exchangeId, bool _isUpdate) internal {
        require(supportedTokens[_token], "Token not supported");
        
        if (_isUpdate) IERC20(_token).approve(mentoTokenBroker, 0);
        
        tokenExchangeProviders[_token] = TokenExchangeProvider({ provider: _provider, exchangeId: _exchangeId, active: true });
        IERC20(_token).approve(mentoTokenBroker, type(uint256).max);
        
        emit TokenExchangeProviderSet(_token, _provider, _exchangeId);
    }

    function _updateCampaignTime(Campaign storage campaign, uint256 _startTime, uint256 _endTime) internal {
        if (block.timestamp < campaign.startTime) {
            require(_startTime > block.timestamp && _endTime > _startTime, "Invalid time range");
            campaign.startTime = _startTime;
        } else {
            require(_endTime > block.timestamp, "End time must be in the future");
        }
        campaign.endTime = _endTime;
    }

    // Token Management
    function addSupportedToken(address _token) external onlySuperAdmin validAddress(_token) {
        require(!supportedTokens[_token], "Token already supported");
        supportedTokensList.push(_token);
        supportedTokens[_token] = true;
        emit TokenAdded(_token);
    }

    function removeSupportedToken(address _token) external onlySuperAdmin {
        require(supportedTokens[_token] && _token != address(celoToken), "Token not supported or is base CELO");
        supportedTokens[_token] = false;
        emit TokenRemoved(_token);
    }

    function setTokenExchangeProvider(address _token, address _provider, bytes32 _exchangeId) external onlySuperAdmin validAddress(_token) validAddress(_provider) {
        _setupTokenExchangeProvider(_token, _provider, _exchangeId, false);
    }

    function updateTokenExchangeProvider(address _token, address _newProvider, bytes32 _newExchangeId) external onlySuperAdmin validAddress(_token) validAddress(_newProvider) {
        require(tokenExchangeProviders[_token].active, "No active exchange provider for token");
        _setupTokenExchangeProvider(_token, _newProvider, _newExchangeId, true);
    }

    function deactivateTokenExchangeProvider(address _token) external onlySuperAdmin {
        require(tokenExchangeProviders[_token].active, "Provider not active");
        tokenExchangeProviders[_token].active = false;
        IERC20(_token).approve(mentoTokenBroker, 0);
        emit TokenExchangeProviderDeactivated(_token);
    }

    // Admin Management (consolidated functions)
    function addSuperAdmin(address _newSuperAdmin) external onlySuperAdmin validAddress(_newSuperAdmin) {
        require(!superAdmins[_newSuperAdmin], "Already a super admin");
        superAdmins[_newSuperAdmin] = true;
        emit AdminAdded(_newSuperAdmin, msg.sender, 0, true);
    }

    function removeSuperAdmin(address _superAdmin) external onlySuperAdmin {
        require(_superAdmin != msg.sender && superAdmins[_superAdmin], "Cannot remove yourself or not a super admin");
        superAdmins[_superAdmin] = false;
        emit AdminRemoved(_superAdmin, msg.sender, 0, true);
    }

    function addCampaignAdmin(uint256 _campaignId, address _newAdmin) external onlyCampaignAdmin(_campaignId) validAddress(_newAdmin) {
        require(!campaigns[_campaignId].campaignAdmins[_newAdmin], "Already an admin for this campaign");
        campaigns[_campaignId].campaignAdmins[_newAdmin] = true;
        emit AdminAdded(_newAdmin, msg.sender, _campaignId, false);
    }

    function removeCampaignAdmin(uint256 _campaignId, address _admin) external onlyCampaignAdmin(_campaignId) {
        require(_admin != campaigns[_campaignId].admin && campaigns[_campaignId].campaignAdmins[_admin], "Cannot remove primary admin or not an admin");
        campaigns[_campaignId].campaignAdmins[_admin] = false;
        emit AdminRemoved(_admin, msg.sender, _campaignId, false);
    }

    // Configuration Functions
    function updateBroker(address _newBroker) external onlySuperAdmin validAddress(_newBroker) {
        mentoTokenBroker = _newBroker;
        emit BrokerUpdated(_newBroker);
    }

    function setBypassSecretCode(bytes32 _secretCode) external onlySuperAdmin {
        bypassSecretCode = _secretCode;
        emit BypassCodeUpdated(msg.sender);
    }

    function updateFeeAmounts(uint256 _campaignFee, uint256 _projectFee) external onlyOwner {
        uint256 oldCampaignFee = campaignCreationFee;
        uint256 oldProjectFee = projectAdditionFee;
        campaignCreationFee = _campaignFee * 1e18;
        projectAdditionFee = _projectFee * 1e18;
        emit FeeAmountUpdated("campaignCreation", oldCampaignFee, campaignCreationFee);
        emit FeeAmountUpdated("projectAddition", oldProjectFee, projectAdditionFee);
    }

    function updateDataStructureVersion(string memory _dataType, uint256 _newVersion, string memory _structureDescription) external onlySuperAdmin {
        dataStructureVersions[_dataType] = _newVersion;
        emit DataStructureVersionUpdated(_dataType, _newVersion, _structureDescription);
    }

    function setUserMaxVoteAmount(uint256 _campaignId, address _user, uint256 _maxAmount) external onlyCampaignAdmin(_campaignId) {
        campaigns[_campaignId].userMaxVoteAmount[_user] = _maxAmount;
    }

    // Fee Management
    function collectFee(address _token, uint256 _amount, string memory _feeType) internal {
        require(supportedTokens[_token], "Token not supported");
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        collectedFees[_token] += _amount;
        emit FeeCollected(_token, _amount, _feeType);
    }

    function withdrawFees(address _token, address _recipient, uint256 _amount) external onlyOwner validAddress(_recipient) {
        uint256 feeBalance = collectedFees[_token];
        require(feeBalance > 0, "No fees collected for this token");
        uint256 amountToWithdraw = _amount == 0 ? feeBalance : _amount;
        require(amountToWithdraw <= feeBalance, "Insufficient fee balance");
        collectedFees[_token] -= amountToWithdraw;
        IERC20(_token).safeTransfer(_recipient, amountToWithdraw);
        emit FeeWithdrawn(_token, _recipient, amountToWithdraw);
    }

    function canBypassFees(uint256 _campaignId, address _user) internal view returns (bool) {
        return superAdmins[_user] || (_campaignId > 0 && campaigns[_campaignId].campaignAdmins[_user]);
    }

    // Token Conversion
    function getTokenToCeloEquivalent(address _token, uint256 _amount) public view returns (uint256) {
        if (_token == address(celoToken)) return _amount;
        TokenExchangeProvider storage provider = tokenExchangeProviders[_token];
        require(provider.active, "No active exchange provider for token");
        return IBroker(mentoTokenBroker).getAmountOut(provider.provider, provider.exchangeId, _token, address(celoToken), _amount);
    }

    function convertTokens(address _fromToken, address _toToken, uint256 _amount) internal returns (uint256) {
        if (_fromToken == _toToken) return _amount;
        
        TokenExchangeProvider storage provider = tokenExchangeProviders[_fromToken];
        require(provider.active, "No active exchange provider for token");
        
        uint256 expectedAmountOut = IBroker(mentoTokenBroker).getAmountOut(provider.provider, provider.exchangeId, _fromToken, _toToken, _amount);
        uint256 minAmountOut = expectedAmountOut * 995 / 1000;
        
        if (IERC20(_fromToken).balanceOf(address(this)) < _amount) {
            IERC20(_fromToken).safeTransferFrom(msg.sender, address(this), _amount);
        }
        
        uint256 receivedAmount = IBroker(mentoTokenBroker).swapIn(provider.provider, provider.exchangeId, _fromToken, _toToken, _amount, minAmountOut);
        emit TokenConversionSucceeded(_fromToken, _toToken, _amount, receivedAmount);
        return receivedAmount;
    }

    function convertTokensExternal(address _fromToken, address _toToken, uint256 _amount) external returns (uint256) {
        require(msg.sender == address(this), "Unauthorized");
        return convertTokens(_fromToken, _toToken, _amount);
    }

    function adminForceConvertTokens(address _fromToken, address _toToken, uint256 _amount) external onlySuperAdmin nonReentrant returns (uint256) {
        require(supportedTokens[_fromToken] && supportedTokens[_toToken] && _amount > 0, "Invalid conversion parameters");
        require(IERC20(_fromToken).balanceOf(address(this)) >= _amount, "Insufficient token balance");
        
        uint256 beforeBalance = IERC20(_toToken).balanceOf(address(this));
        uint256 convertedAmount = convertTokens(_fromToken, _toToken, _amount);
        uint256 afterBalance = IERC20(_toToken).balanceOf(address(this));
        
        require(afterBalance >= beforeBalance, "Conversion verification failed");
        emit TokenConversionSucceeded(_fromToken, _toToken, _amount, convertedAmount);
        return convertedAmount;
    }

    // Emergency Recovery
    function areTokensNeededForActiveCampaigns(address _token) internal view returns (bool) {
        for (uint256 i = 0; i < nextCampaignId; i++) {
            if (campaigns[i].active && (campaigns[i].payoutToken == _token || isTokenUsedInCampaign[i][_token])) return true;
        }
        return false;
    }

    function emergencyTokenRecovery(address _token, address _recipient, uint256 _amount, bool _forceRecovery) external onlySuperAdmin validAddress(_recipient) {
        bool tokensNeeded = areTokensNeededForActiveCampaigns(_token);
        require(!tokensNeeded || _forceRecovery, "Tokens are needed for active campaigns");
        
        uint256 balance = IERC20(_token).balanceOf(address(this));
        uint256 amountToRecover = _amount == 0 ? balance : _amount;
        require(amountToRecover <= balance, "Insufficient token balance");
        
        IERC20(_token).safeTransfer(_recipient, amountToRecover);
        emit EmergencyTokenRecovery(_token, _recipient, amountToRecover, tokensNeeded);
    }

    // Project Management
    function createProject(string memory _name, string memory _description, string memory _bioPart, string memory _contractInfoPart, string memory _additionalDataPart, address[] memory _contracts, bool _transferrable) external {
        uint256 projectId = nextProjectId++;
        Project storage newProject = projects[projectId];
        newProject.id = projectId;
        newProject.owner = payable(msg.sender);
        newProject.name = _name;
        newProject.description = _description;
        newProject.metadata = ProjectMetadata(_bioPart, _contractInfoPart, _additionalDataPart);
        newProject.contracts = _contracts;
        newProject.transferrable = _transferrable;
        newProject.active = true;
        newProject.createdAt = block.timestamp;
        emit ProjectCreated(projectId, msg.sender);
    }

    function updateProject(uint256 _projectId, string memory _name, string memory _description, string memory _bioPart, string memory _contractInfoPart, string memory _additionalDataPart, address[] memory _contracts) external onlyProjectOwner(_projectId) activeProject(_projectId) {
        Project storage project = projects[_projectId];
        project.name = _name;
        project.description = _description;
        project.metadata = ProjectMetadata(_bioPart, _contractInfoPart, _additionalDataPart);
        project.contracts = _contracts;
        emit ProjectUpdated(_projectId, msg.sender);
    }

    function updateProjectMetadata(uint256 _projectId, uint8 _metadataType, string memory _newData) external onlyProjectOwner(_projectId) activeProject(_projectId) {
        Project storage project = projects[_projectId];
        if (_metadataType == 1) project.metadata.bio = _newData;
        else if (_metadataType == 2) project.metadata.contractInfo = _newData;
        else if (_metadataType == 3) project.metadata.additionalData = _newData;
        else revert("Invalid metadata type");
        emit ProjectUpdated(_projectId, msg.sender);
    }

    function transferProjectOwnership(uint256 _projectId, address payable _newOwner) external onlyProjectOwner(_projectId) validAddress(_newOwner) {
        Project storage project = projects[_projectId];
        require(project.transferrable, "Project is not transferrable");
        address previousOwner = project.owner;
        project.owner = _newOwner;
        emit ProjectOwnershipTransferred(_projectId, previousOwner, _newOwner);
    }

    function addProjectToCampaign(uint256 _campaignId, uint256 _projectId, address _feeToken) external {
        require(campaigns[_campaignId].active && projects[_projectId].active, "Campaign or project not active");
        require(block.timestamp < campaigns[_campaignId].endTime, "Campaign has ended");
        require(msg.sender == projects[_projectId].owner || campaigns[_campaignId].campaignAdmins[msg.sender] || superAdmins[msg.sender], "Only project owner or campaign admin can add project to campaign");
        require(!projects[_projectId].campaignParticipation[_campaignId], "Project already in campaign");
        
        _validateAndCollectFee(_feeToken, projectAdditionFee, "projectAddition", _campaignId);
        
        projects[_projectId].campaignIds.push(_campaignId);
        projects[_projectId].campaignParticipation[_campaignId] = true;
        
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        participation.projectId = _projectId;
        participation.campaignId = _campaignId;
        
        emit ProjectAddedToCampaign(_campaignId, _projectId);
    }

    function removeProjectFromCampaign(uint256 _campaignId, uint256 _projectId) external {
        require(msg.sender == projects[_projectId].owner || campaigns[_campaignId].campaignAdmins[msg.sender] || superAdmins[msg.sender], "Only project owner or campaign admin can remove project from campaign");
        require(projects[_projectId].campaignParticipation[_campaignId] && projectParticipations[_campaignId][_projectId].voteCount == 0, "Project not in campaign or has votes");
        
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

    function approveProject(uint256 _campaignId, uint256 _projectId) external onlyCampaignAdmin(_campaignId) {
        require(projects[_projectId].campaignParticipation[_campaignId], "Project not in campaign");
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        require(!participation.approved, "Project already approved");
        participation.approved = true;
        emit ProjectApproved(_campaignId, _projectId);
    }

    // Campaign Management
    function createCampaign(string memory _name, string memory _description, string memory _mainInfo, string memory _additionalInfo, uint256 _startTime, uint256 _endTime, uint256 _adminFeePercentage, uint256 _maxWinners, bool _useQuadraticDistribution, bool _useCustomDistribution, string memory _customDistributionData, address _payoutToken, address _feeToken) external {
        require(_startTime > block.timestamp && _endTime > _startTime && _adminFeePercentage <= 30, "Invalid campaign parameters");
        require(supportedTokens[_payoutToken], "Payout token not supported");
        
        _validateAndCollectFee(_feeToken, campaignCreationFee, "campaignCreation", 0);

        uint256 campaignId = nextCampaignId++;
        Campaign storage newCampaign = campaigns[campaignId];
        newCampaign.id = campaignId;
        newCampaign.admin = msg.sender;
        newCampaign.name = _name;
        newCampaign.description = _description;
        newCampaign.metadata = CampaignMetadata(_mainInfo, _additionalInfo);
        newCampaign.startTime = _startTime;
        newCampaign.endTime = _endTime;
        newCampaign.adminFeePercentage = _adminFeePercentage;
        newCampaign.maxWinners = _maxWinners;
        newCampaign.useQuadraticDistribution = _useQuadraticDistribution;
        newCampaign.useCustomDistribution = _useCustomDistribution;
        newCampaign.customDistributionData = _customDistributionData;
        newCampaign.payoutToken = _payoutToken;
        newCampaign.active = true;
        newCampaign.campaignAdmins[msg.sender] = true;

        emit CampaignCreated(campaignId, msg.sender, _name);
    }

    function updateCampaign(uint256 _campaignId, string memory _name, string memory _description, uint256 _startTime, uint256 _endTime, uint256 _adminFeePercentage, uint256 _maxWinners, bool _useQuadraticDistribution, bool _useCustomDistribution, address _payoutToken) external onlyCampaignAdmin(_campaignId) activeCampaign(_campaignId) {
        require(supportedTokens[_payoutToken], "Payout token not supported");
        Campaign storage campaign = campaigns[_campaignId];
        
        _updateCampaignTime(campaign, _startTime, _endTime);
        require(_adminFeePercentage <= campaign.adminFeePercentage, "Cannot increase admin fee");
        
        campaign.name = _name;
        campaign.description = _description;
        campaign.adminFeePercentage = _adminFeePercentage;
        campaign.maxWinners = _maxWinners;
        campaign.useQuadraticDistribution = _useQuadraticDistribution;
        campaign.useCustomDistribution = _useCustomDistribution;
        campaign.payoutToken = _payoutToken;
        
        emit CampaignUpdated(_campaignId, msg.sender);
    }

    function updateCampaignMetadata(uint256 _campaignId, string memory _mainInfo, string memory _additionalInfo) external onlyCampaignAdmin(_campaignId) activeCampaign(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        campaign.metadata.mainInfo = _mainInfo;
        campaign.metadata.additionalInfo = _additionalInfo;
        emit CampaignMetadataUpdated(_campaignId, msg.sender);
    }

    function updateCustomDistributionData(uint256 _campaignId, string memory _customDistributionData) external onlyCampaignAdmin(_campaignId) activeCampaign(_campaignId) {
        campaigns[_campaignId].customDistributionData = _customDistributionData;
        emit CampaignUpdated(_campaignId, msg.sender);
    }

    // Voting
    function vote(uint256 _campaignId, uint256 _projectId, address _token, uint256 _amount, bytes32 _bypassCode) external nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active && block.timestamp >= campaign.startTime && block.timestamp <= campaign.endTime, "Campaign not active or ended");
        require(projects[_projectId].campaignParticipation[_campaignId], "Project not in campaign");
        
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        require(participation.approved && supportedTokens[_token] && _amount > 0, "Project not approved, token not supported, or invalid amount");
        
        uint256 celoEquivalent = getTokenToCeloEquivalent(_token, _amount);
        
        if (!isTokenUsedInCampaign[_campaignId][_token]) {
            campaignUsedTokens[_campaignId].push(_token);
            isTokenUsedInCampaign[_campaignId][_token] = true;
        }
        
        if (_bypassCode != bypassSecretCode) {
            uint256 maxVoteAmount = campaign.userMaxVoteAmount[msg.sender];
            if (maxVoteAmount > 0) {
                require(totalUserVotesInCampaign[_campaignId][msg.sender] + celoEquivalent <= maxVoteAmount, "Exceeds max vote amount");
            }
        }
        
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        userVotes[_campaignId][msg.sender][_projectId][_token] += _amount;
        totalUserVotesInCampaign[_campaignId][msg.sender] += celoEquivalent;
        participation.voteCount += celoEquivalent;
        participation.tokenVotes[_token] += _amount;
        campaign.tokenAmounts[_token] += _amount;
        campaign.totalFunds += celoEquivalent;

        userVoteHistory[msg.sender].push(Vote(msg.sender, _campaignId, _projectId, _token, _amount, celoEquivalent));

        emit VoteCast(msg.sender, _campaignId, _projectId, _token, _amount, celoEquivalent);
    }

    // Fund Distribution
    function distributeFunds(uint256 _campaignId) external nonReentrant onlyCampaignAdmin(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active && block.timestamp > campaign.endTime, "Campaign not ended or already finalized");

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
            emit FundsDistributed(_campaignId);
            return;
        }

        // Calculate fees
        uint256 platformFeeAmount = (totalPayoutTokenAmount * PLATFORM_FEE) / 100;
        uint256 adminFeeAmount = (totalPayoutTokenAmount * campaign.adminFeePercentage) / 100;
        uint256 remainingFunds = totalPayoutTokenAmount - platformFeeAmount - adminFeeAmount;

        // Transfer fees
        if (platformFeeAmount > 0) IERC20(payoutToken).safeTransfer(owner(), platformFeeAmount);
        if (adminFeeAmount > 0) IERC20(payoutToken).safeTransfer(campaign.admin, adminFeeAmount);

        // Distribute to winners
        uint256[] memory sortedProjectIds = getSortedProjectIdsByCampaign(_campaignId);
        uint256 winnersCount = campaign.maxWinners == 0 || campaign.maxWinners >= sortedProjectIds.length ? sortedProjectIds.length : campaign.maxWinners;
        
        uint256 actualWinners = 0;
        for (uint256 i = 0; i < winnersCount && i < sortedProjectIds.length; i++) {
            if (projectParticipations[_campaignId][sortedProjectIds[i]].voteCount > 0) actualWinners++;
            else break;
        }

        if (actualWinners == 0) {
            IERC20(payoutToken).safeTransfer(owner(), remainingFunds);
            emit FundsDistributed(_campaignId);
            return;
        }

        _distributeToWinners(_campaignId, sortedProjectIds, actualWinners, remainingFunds, payoutToken, campaign.useQuadraticDistribution);
        emit FundsDistributed(_campaignId);
    }

    function _distributeToWinners(uint256 _campaignId, uint256[] memory sortedProjectIds, uint256 actualWinners, uint256 remainingFunds, address payoutToken, bool useQuadratic) internal {
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

    function _transferProjectFunds(uint256 _campaignId, uint256 _projectId, uint256 _amount, address _token) internal {
        if (_amount > 0) {
            projectParticipations[_campaignId][_projectId].fundsReceived += _amount;
            IERC20(_token).safeTransfer(projects[_projectId].owner, _amount);
            emit FundsDistributedToProject(_campaignId, _projectId, _amount, _token);
        }
    }

    function distributeCustom(uint256 _campaignId) internal {
        campaigns[_campaignId].active = false;
        emit CustomFundsDistributed(_campaignId, campaigns[_campaignId].customDistributionData);
    }

    function manualDistributeDetailed(uint256 _campaignId, CustomDistributionDetails[] memory _distributions, address _token) external onlyCampaignAdmin(_campaignId) nonReentrant {
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
            require(projects[dist.projectId].campaignParticipation[_campaignId], "Project not in campaign");
            
            projectParticipations[_campaignId][dist.projectId].fundsReceived += dist.amount;
            if (dist.amount > 0) {
                IERC20(_token).safeTransfer(projects[dist.projectId].owner, dist.amount);
                emit ProjectFundsDistributedDetailed(_campaignId, dist.projectId, dist.amount, _token, dist.comment, dist.jsonData);
            }
        }
        emit CustomFundsDistributed(_campaignId, "Detailed distribution completed");
    }

    // Internal Helper Functions
    function getProjectIdsByCampaign(uint256 _campaignId) internal view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < nextProjectId; i++) {
            if (projects[i].campaignParticipation[_campaignId]) count++;
        }
        uint256[] memory projectIds = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < nextProjectId; i++) {
            if (projects[i].campaignParticipation[_campaignId]) {
                projectIds[index++] = i;
            }
        }
        return projectIds;
    }

    function getVotedTokensByProject(uint256 _campaignId, uint256 _projectId) internal view returns (address[] memory) {
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

    function getSortedProjectIdsByCampaign(uint256 _campaignId) internal view returns (uint256[] memory) {
        uint256[] memory projectIds = getProjectIdsByCampaign(_campaignId);
        uint256 approvedCount = 0;
        for (uint256 i = 0; i < projectIds.length; i++) {
            if (projectParticipations[_campaignId][projectIds[i]].approved) approvedCount++;
        }
        uint256[] memory approvedProjectIds = new uint256[](approvedCount);
        uint256 index = 0;
        for (uint256 i = 0; i < projectIds.length; i++) {
            if (projectParticipations[_campaignId][projectIds[i]].approved) {
                approvedProjectIds[index++] = projectIds[i];
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

    // View Functions
    function getSupportedTokens() external view returns (address[] memory) { return supportedTokensList; }
    function getCampaignVotedTokens(uint256 _campaignId) public view returns (address[] memory) { return campaignUsedTokens[_campaignId]; }
    function getProjectCount() external view returns (uint256) { return nextProjectId; }
    function getCampaignCount() external view returns (uint256) { return nextCampaignId; }
    function isTokenSupported(address _token) external view returns (bool) { return supportedTokens[_token]; }
    function getDataStructureVersion(string memory _dataType) external view returns (uint256) { return dataStructureVersions[_dataType]; }

    function isCampaignAdmin(uint256 _campaignId, address _admin) external view returns (bool) {
        if (_campaignId >= nextCampaignId) return false;
        return campaigns[_campaignId].admin == _admin || campaigns[_campaignId].campaignAdmins[_admin] || superAdmins[_admin];
    }

    function getSortedProjects(uint256 _campaignId) external view returns (uint256[] memory) {
        return getSortedProjectIdsByCampaign(_campaignId);
    }

    function getTokenExchangeProvider(address _token) external view returns (address provider, bytes32 exchangeId, bool active) {
        TokenExchangeProvider storage tokenProvider = tokenExchangeProviders[_token];
        return (tokenProvider.provider, tokenProvider.exchangeId, tokenProvider.active);
    }

    function getProject(uint256 _projectId) external view returns (uint256 id, address owner, string memory name, string memory description, bool transferrable, bool active, uint256 createdAt, uint256[] memory campaignIds) {
        Project storage project = projects[_projectId];
        return (project.id, project.owner, project.name, project.description, project.transferrable, project.active, project.createdAt, project.campaignIds);
    }

    function getProjectMetadata(uint256 _projectId) external view returns (string memory bio, string memory contractInfo, string memory additionalData, address[] memory contracts) {
        Project storage project = projects[_projectId];
        return (project.metadata.bio, project.metadata.contractInfo, project.metadata.additionalData, project.contracts);
    }

    function getCampaign(uint256 _campaignId) external view returns (uint256 id, address admin, string memory name, string memory description, uint256 startTime, uint256 endTime, uint256 adminFeePercentage, uint256 maxWinners, bool useQuadraticDistribution, bool useCustomDistribution, address payoutToken, bool active, uint256 totalFunds) {
        Campaign storage campaign = campaigns[_campaignId];
        return (campaign.id, campaign.admin, campaign.name, campaign.description, campaign.startTime, campaign.endTime, campaign.adminFeePercentage, campaign.maxWinners, campaign.useQuadraticDistribution, campaign.useCustomDistribution, campaign.payoutToken, campaign.active, campaign.totalFunds);
    }

    function getCampaignMetadata(uint256 _campaignId) external view returns (string memory mainInfo, string memory additionalInfo, string memory customDistributionData) {
        Campaign storage campaign = campaigns[_campaignId];
        return (campaign.metadata.mainInfo, campaign.metadata.additionalInfo, campaign.customDistributionData);
    }

    function getParticipation(uint256 _campaignId, uint256 _projectId) external view returns (bool approved, uint256 voteCount, uint256 fundsReceived) {
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        return (participation.approved, participation.voteCount, participation.fundsReceived);
    }

    function getUserVoteHistory(address _user) external view returns (Vote[] memory) { return userVoteHistory[_user]; }
    function getUserVotesForProjectWithToken(uint256 _campaignId, address _user, uint256 _projectId, address _token) external view returns (uint256) { return userVotes[_campaignId][_user][_projectId][_token]; }
    function getUserTotalVotesInCampaign(uint256 _campaignId, address _user) external view returns (uint256) { return totalUserVotesInCampaign[_campaignId][_user]; }
    function getProjectTokenVotes(uint256 _campaignId, uint256 _projectId, address _token) external view returns (uint256) { return projectParticipations[_campaignId][_projectId].tokenVotes[_token]; }
    function getCampaignTokenAmount(uint256 _campaignId, address _token) external view returns (uint256) { return campaigns[_campaignId].tokenAmounts[_token]; }

    function getProjectVotedTokensWithAmounts(uint256 _campaignId, uint256 _projectId) external view returns (address[] memory tokens, uint256[] memory amounts) {
        address[] memory votedTokens = getVotedTokensByProject(_campaignId, _projectId);
        uint256[] memory tokenAmounts = new uint256[](votedTokens.length);
        for (uint256 i = 0; i < votedTokens.length; i++) {
            tokenAmounts[i] = projectParticipations[_campaignId][_projectId].tokenVotes[votedTokens[i]];
        }
        return (votedTokens, tokenAmounts);
    }

    function getExpectedConversionRate(address _fromToken, address _toToken, uint256 _amount) external view returns (uint256) {
        if (_fromToken == _toToken) return _amount;
        TokenExchangeProvider storage provider = tokenExchangeProviders[_fromToken];
        require(provider.active, "No active exchange provider for token");
        return IBroker(mentoTokenBroker).getAmountOut(provider.provider, provider.exchangeId, _fromToken, _toToken, _amount);
    }
}