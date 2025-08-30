// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract ProjectManager is AccessControlUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    
    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    // Structs
    struct Project {
        uint256 id;
        address payable owner;
        string name;
        string description;
        bool active;
        uint256 createdAt;
        string bio;
        string contractInfo;
        string additionalData;
        address[] contracts;
        bool transferrable;
        uint256[] campaignIds;
        mapping(uint256 => bool) campaignParticipation;
        uint8 officialStatus; // 0=unofficial, 1=official, 2=verified
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
        mapping(address => bool) campaignAdmins;
        mapping(address => uint256) tokenAmounts;
        bool autoPoolCreated;
        uint256[] poolIds;
        mapping(address => uint256) userMaxVoteAmount;
        string mainInfo;
        string additionalInfo;
        uint256 adminFeePercentage;
        uint256 maxWinners;
        bool useQuadraticDistribution;
        bool useCustomDistribution;
        string customDistributionData;
        address payoutToken;
        uint8 officialStatus;
    }
    
    // State variables
    mapping(uint256 => Project) public projects;
    mapping(uint256 => Campaign) public campaigns;
    uint256 public projectCount;
    uint256 public campaignCount;
    
    // Events
    event ProjectCreated(uint256 indexed projectId, address indexed owner, string name);
    event ProjectUpdated(uint256 indexed projectId);
    event ProjectOwnershipTransferred(uint256 indexed projectId, address indexed newOwner);
    event CampaignCreated(uint256 indexed campaignId, address indexed admin, string name);
    event CampaignUpdated(uint256 indexed campaignId);
    event CampaignAdminAdded(uint256 indexed campaignId, address indexed admin);
    event CampaignAdminRemoved(uint256 indexed campaignId, address indexed admin);
    
    // Modifiers
    modifier projectExists(uint256 _projectId) {
        require(_projectId > 0 && _projectId <= projectCount, "Project does not exist");
        _;
    }
    
    modifier campaignExists(uint256 _campaignId) {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Campaign does not exist");
        _;
    }
    
    modifier onlyProjectOwner(uint256 _projectId) {
        require(projects[_projectId].owner == _msgSender(), "Only project owner can call this function");
        _;
    }
    
    modifier onlyCampaignAdmin(uint256 _campaignId) {
        require(
            campaigns[_campaignId].admin == _msgSender() || 
            campaigns[_campaignId].campaignAdmins[_msgSender()],
            "Only campaign admin can call this function"
        );
        _;
    }
    
    // Initialization
    function initialize(address _admin) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(MANAGER_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);
        
        projectCount = 0;
        campaignCount = 0;
    }
    
    // Project Management Functions
    function createProjectV6(
        string memory _name,
        string memory _description,
        string memory _bio,
        string memory _contractInfo,
        string memory _additionalData,
        address[] memory _contracts,
        bool _transferrable
    ) external whenNotPaused returns (uint256) {
        projectCount++;
        uint256 projectId = projectCount;
        
        projects[projectId] = Project({
            id: projectId,
            owner: payable(_msgSender()),
            name: _name,
            description: _description,
            active: true,
            createdAt: block.timestamp,
            bio: _bio,
            contractInfo: _contractInfo,
            additionalData: _additionalData,
            contracts: _contracts,
            transferrable: _transferrable,
            campaignIds: new uint256[](0),
            officialStatus: 0
        });
        
        emit ProjectCreated(projectId, _msgSender(), _name);
        return projectId;
    }
    
    function updateProject(
        uint256 _projectId,
        string memory _name,
        string memory _description,
        string memory _bio,
        string memory _contractInfo,
        string memory _additionalData,
        address[] memory _contracts,
        bool _transferrable
    ) external projectExists(_projectId) onlyProjectOwner(_projectId) whenNotPaused {
        Project storage project = projects[_projectId];
        project.name = _name;
        project.description = _description;
        project.bio = _bio;
        project.contractInfo = _contractInfo;
        project.additionalData = _additionalData;
        project.contracts = _contracts;
        project.transferrable = _transferrable;
        
        emit ProjectUpdated(_projectId);
    }
    
    function transferProjectOwnership(uint256 _projectId, address _newOwner) 
        external projectExists(_projectId) onlyProjectOwner(_projectId) whenNotPaused {
        require(_newOwner != address(0), "New owner cannot be zero address");
        projects[_projectId].owner = payable(_newOwner);
        emit ProjectOwnershipTransferred(_projectId, _newOwner);
    }
    
    // Campaign Management Functions
    function createCampaignV6(
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
    ) external whenNotPaused returns (uint256) {
        require(_startTime > block.timestamp, "Start time must be in the future");
        require(_endTime > _startTime, "End time must be after start time");
        require(_adminFeePercentage <= 1000, "Admin fee cannot exceed 10%");
        
        campaignCount++;
        uint256 campaignId = campaignCount;
        
        campaigns[campaignId] = Campaign({
            id: campaignId,
            admin: _msgSender(),
            name: _name,
            description: _description,
            startTime: _startTime,
            endTime: _endTime,
            active: true,
            totalFunds: 0,
            createdAt: block.timestamp,
            autoPoolCreated: false,
            poolIds: new uint256[](0),
            mainInfo: _mainInfo,
            additionalInfo: _additionalInfo,
            adminFeePercentage: _adminFeePercentage,
            maxWinners: _maxWinners,
            useQuadraticDistribution: _useQuadraticDistribution,
            useCustomDistribution: _useCustomDistribution,
            customDistributionData: _customDistributionData,
            payoutToken: _payoutToken,
            officialStatus: 0
        });
        
        campaigns[campaignId].campaignAdmins[_msgSender()] = true;
        
        emit CampaignCreated(campaignId, _msgSender(), _name);
        return campaignId;
    }
    
    function updateCampaign(
        uint256 _campaignId,
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
    ) external campaignExists(_campaignId) onlyCampaignAdmin(_campaignId) whenNotPaused {
        Campaign storage campaign = campaigns[_campaignId];
        
        if (_startTime > 0) {
            require(_startTime > block.timestamp, "Start time must be in the future");
            campaign.startTime = _startTime;
        }
        
        if (_endTime > 0) {
            require(_endTime > campaign.startTime, "End time must be after start time");
            campaign.endTime = _endTime;
        }
        
        if (bytes(_name).length > 0) campaign.name = _name;
        if (bytes(_description).length > 0) campaign.description = _description;
        if (bytes(_mainInfo).length > 0) campaign.mainInfo = _mainInfo;
        if (bytes(_additionalInfo).length > 0) campaign.additionalInfo = _additionalInfo;
        if (_adminFeePercentage > 0) {
            require(_adminFeePercentage <= 1000, "Admin fee cannot exceed 10%");
            campaign.adminFeePercentage = _adminFeePercentage;
        }
        if (_maxWinners > 0) campaign.maxWinners = _maxWinners;
        if (_payoutToken != address(0)) campaign.payoutToken = _payoutToken;
        
        campaign.useQuadraticDistribution = _useQuadraticDistribution;
        campaign.useCustomDistribution = _useCustomDistribution;
        if (bytes(_customDistributionData).length > 0) {
            campaign.customDistributionData = _customDistributionData;
        }
        
        emit CampaignUpdated(_campaignId);
    }
    
    function addCampaignAdmin(uint256 _campaignId, address _newAdmin) 
        external campaignExists(_campaignId) onlyCampaignAdmin(_campaignId) whenNotPaused {
        require(_newAdmin != address(0), "New admin cannot be zero address");
        require(!campaigns[_campaignId].campaignAdmins[_newAdmin], "Already an admin");
        
        campaigns[_campaignId].campaignAdmins[_newAdmin] = true;
        emit CampaignAdminAdded(_campaignId, _newAdmin);
    }
    
    function removeCampaignAdmin(uint256 _campaignId, address _admin) 
        external campaignExists(_campaignId) onlyCampaignAdmin(_campaignId) whenNotPaused {
        require(_admin != campaigns[_campaignId].admin, "Cannot remove main admin");
        require(campaigns[_campaignId].campaignAdmins[_admin], "Not an admin");
        
        campaigns[_campaignId].campaignAdmins[_admin] = false;
        emit CampaignAdminRemoved(_campaignId, _admin);
    }
    
    // Enhanced View Functions
    function getProjectV4(uint256 _projectId) external view projectExists(_projectId) returns (
        uint256 id,
        address payable owner,
        string memory name,
        string memory description,
        bool active,
        uint256 createdAt,
        string memory bio,
        string memory contractInfo,
        string memory additionalData,
        address[] memory contracts,
        bool transferrable
    ) {
        Project storage project = projects[_projectId];
        return (
            project.id,
            project.owner,
            project.name,
            project.description,
            project.active,
            project.createdAt,
            project.bio,
            project.contractInfo,
            project.additionalData,
            project.contracts,
            project.transferrable
        );
    }
    
    function getProjectMetadata(uint256 _projectId) external view projectExists(_projectId) returns (
        string memory name,
        string memory description,
        string memory bio,
        string memory contractInfo,
        string memory additionalData,
        address[] memory contracts,
        bool transferrable
    ) {
        Project storage project = projects[_projectId];
        return (
            project.name,
            project.description,
            project.bio,
            project.contractInfo,
            project.additionalData,
            project.contracts,
            project.transferrable
        );
    }
    
    function getCampaignV4(uint256 _campaignId) external view campaignExists(_campaignId) returns (
        uint256 id,
        address admin,
        string memory name,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        bool active,
        uint256 totalFunds,
        uint256 createdAt,
        string memory mainInfo,
        string memory additionalInfo,
        uint256 adminFeePercentage,
        uint256 maxWinners,
        bool useQuadraticDistribution,
        bool useCustomDistribution,
        string memory customDistributionData,
        address payoutToken
    ) {
        Campaign storage campaign = campaigns[_campaignId];
        return (
            campaign.id,
            campaign.admin,
            campaign.name,
            campaign.description,
            campaign.startTime,
            campaign.endTime,
            campaign.active,
            campaign.totalFunds,
            campaign.createdAt,
            campaign.mainInfo,
            campaign.additionalInfo,
            campaign.adminFeePercentage,
            campaign.maxWinners,
            campaign.useQuadraticDistribution,
            campaign.useCustomDistribution,
            campaign.customDistributionData,
            campaign.payoutToken
        );
    }
    
    function getCampaignMetadata(uint256 _campaignId) external view campaignExists(_campaignId) returns (
        string memory name,
        string memory description,
        string memory mainInfo,
        string memory additionalInfo,
        uint256 adminFeePercentage,
        uint256 maxWinners,
        bool useQuadraticDistribution,
        bool useCustomDistribution,
        string memory customDistributionData,
        address payoutToken
    ) {
        Campaign storage campaign = campaigns[_campaignId];
        return (
            campaign.name,
            campaign.description,
            campaign.mainInfo,
            campaign.additionalInfo,
            campaign.adminFeePercentage,
            campaign.maxWinners,
            campaign.useQuadraticDistribution,
            campaign.useCustomDistribution,
            campaign.customDistributionData,
            campaign.payoutToken
        );
    }
    
    function getCampaignPools(uint256 _campaignId) external view campaignExists(_campaignId) returns (uint256[] memory) {
        return campaigns[_campaignId].poolIds;
    }
    
    function getCampaignOverview(uint256 _campaignId) external view campaignExists(_campaignId) returns (
        uint256 id,
        address admin,
        string memory name,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        bool active,
        uint256 totalFunds,
        uint256 createdAt,
        bool autoPoolCreated,
        uint256[] memory poolIds,
        string memory mainInfo,
        string memory additionalInfo,
        uint256 adminFeePercentage,
        uint256 maxWinners,
        bool useQuadraticDistribution,
        bool useCustomDistribution,
        string memory customDistributionData,
        address payoutToken,
        uint8 officialStatus,
        uint256 totalProjects,
        uint256 totalVotes
    ) {
        Campaign storage campaign = campaigns[_campaignId];
        
        // These would need to be calculated or tracked separately
        uint256 totalProjects = 0;
        uint256 totalVotes = 0;
        
        return (
            campaign.id,
            campaign.admin,
            campaign.name,
            campaign.description,
            campaign.startTime,
            campaign.endTime,
            campaign.active,
            campaign.totalFunds,
            campaign.createdAt,
            campaign.autoPoolCreated,
            campaign.poolIds,
            campaign.mainInfo,
            campaign.additionalInfo,
            campaign.adminFeePercentage,
            campaign.maxWinners,
            campaign.useQuadraticDistribution,
            campaign.useCustomDistribution,
            campaign.customDistributionData,
            campaign.payoutToken,
            campaign.officialStatus,
            totalProjects,
            totalVotes
        );
    }
    
    // Status Management Functions
    function updateProjectStatus(uint256 _projectId, uint8 _status) external onlyRole(ADMIN_ROLE) projectExists(_projectId) {
        require(_status <= 2, "Invalid status");
        projects[_projectId].officialStatus = _status;
        emit ProjectUpdated(_projectId);
    }
    
    function updateCampaignStatus(uint256 _campaignId, uint8 _status) external onlyRole(ADMIN_ROLE) campaignExists(_campaignId) {
        require(_status <= 2, "Invalid status");
        campaigns[_campaignId].officialStatus = _status;
        emit CampaignUpdated(_campaignId);
    }
    
    function batchUpdateProjectStatus(uint256[] memory _projectIds, uint8 _status) external onlyRole(ADMIN_ROLE) {
        require(_status <= 2, "Invalid status");
        for (uint256 i = 0; i < _projectIds.length; i++) {
            if (_projectIds[i] > 0 && _projectIds[i] <= projectCount) {
                projects[_projectIds[i]].officialStatus = _status;
                emit ProjectUpdated(_projectIds[i]);
            }
        }
    }
    
    function batchUpdateCampaignStatus(uint256[] memory _campaignIds, uint8 _status) external onlyRole(ADMIN_ROLE) {
        require(_status <= 2, "Invalid status");
        for (uint256 i = 0; i < _campaignIds.length; i++) {
            if (_campaignIds[i] > 0 && _campaignIds[i] <= campaignCount) {
                campaigns[_campaignIds[i]].officialStatus = _status;
                emit CampaignUpdated(_campaignIds[i]);
            }
        }
    }
    
    // Quick Edit Functions
    function editProjectName(uint256 _projectId, string memory _newName) external onlyProjectOwner(_projectId) {
        projects[_projectId].name = _newName;
        emit ProjectUpdated(_projectId);
    }
    
    function editProjectDescription(uint256 _projectId, string memory _newDescription) external onlyProjectOwner(_projectId) {
        projects[_projectId].description = _newDescription;
        emit ProjectUpdated(_projectId);
    }
    
    function editProjectBio(uint256 _projectId, string memory _newBio) external onlyProjectOwner(_projectId) {
        projects[_projectId].bio = _newBio;
        emit ProjectUpdated(_projectId);
    }
    
    function editProjectContractInfo(uint256 _projectId, string memory _newContractInfo) external onlyProjectOwner(_projectId) {
        projects[_projectId].contractInfo = _newContractInfo;
        emit ProjectUpdated(_projectId);
    }
    
    function editProjectAdditionalData(uint256 _projectId, string memory _newAdditionalData) external onlyProjectOwner(_projectId) {
        projects[_projectId].additionalData = _newAdditionalData;
        emit ProjectUpdated(_projectId);
    }
    
    function editProjectContracts(uint256 _projectId, address[] memory _newContracts) external onlyProjectOwner(_projectId) {
        projects[_projectId].contracts = _newContracts;
        emit ProjectUpdated(_projectId);
    }
    
    function editProjectTransferrability(uint256 _projectId, bool _transferrable) external onlyProjectOwner(_projectId) {
        projects[_projectId].transferrable = _transferrable;
        emit ProjectUpdated(_projectId);
    }
    
    function editCampaignEndTime(uint256 _campaignId, uint256 _newEndTime) external onlyCampaignAdmin(_campaignId) {
        require(_newEndTime > block.timestamp, "End time must be in the future");
        campaigns[_campaignId].endTime = _newEndTime;
        emit CampaignUpdated(_campaignId);
    }
    
    function editCampaignName(uint256 _campaignId, string memory _newName) external onlyCampaignAdmin(_campaignId) {
        campaigns[_campaignId].name = _newName;
        emit CampaignUpdated(_campaignId);
    }
    
    function editCampaignDescription(uint256 _campaignId, string memory _newDescription) external onlyCampaignAdmin(_campaignId) {
        campaigns[_campaignId].description = _newDescription;
        emit CampaignUpdated(_campaignId);
    }
    
    function updateCustomDistributionData(uint256 _campaignId, string memory _newData) external onlyCampaignAdmin(_campaignId) {
        campaigns[_campaignId].customDistributionData = _newData;
        emit CampaignUpdated(_campaignId);
    }
    
    function setUserMaxVoteAmount(uint256 _campaignId, address _user, uint256 _maxAmount) external onlyCampaignAdmin(_campaignId) {
        campaigns[_campaignId].userMaxVoteAmount[_user] = _maxAmount;
    }
    
    // V4 Compatibility Functions
    function createProjectV4(
        string memory _name,
        string memory _description,
        string memory _bio,
        string memory _contractInfo,
        string memory _additionalData,
        address[] memory _contracts,
        bool _transferrable
    ) external whenNotPaused returns (uint256) {
        return createProjectV6(_name, _description, _bio, _contractInfo, _additionalData, _contracts, _transferrable);
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
    ) external whenNotPaused returns (uint256) {
        return createCampaignV6(_name, _description, _startTime, _endTime, _mainInfo, _additionalInfo, _adminFeePercentage, _maxWinners, _useQuadraticDistribution, _useCustomDistribution, _customDistributionData, _payoutToken);
    }
    
    // Data Structure Version Management
    mapping(string => uint256) public dataStructureVersions;
    
    function getDataStructureVersion(string memory _dataType) external view returns (uint256) {
        return dataStructureVersions[_dataType];
    }
    
    function updateDataStructureVersion(
        string memory _dataType,
        uint256 _newVersion,
        string memory _structureDescription
    ) external onlyRole(ADMIN_ROLE) {
        dataStructureVersions[_dataType] = _newVersion;
        // Event would be emitted here
    }
    
    // Enhanced Access Control
    function addContractAdmin(address _newAdmin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(ADMIN_ROLE, _newAdmin);
    }
    
    function removeContractAdmin(address _admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_admin != _msgSender(), "Cannot remove self");
        _revokeRole(ADMIN_ROLE, _admin);
    }
    
    function addManagerRole(address _newManager) external onlyRole(ADMIN_ROLE) {
        _grantRole(MANAGER_ROLE, _newManager);
    }
    
    function removeManagerRole(address _manager) external onlyRole(ADMIN_ROLE) {
        _revokeRole(MANAGER_ROLE, _manager);
    }
    
    function addOperatorRole(address _newOperator) external onlyRole(ADMIN_ROLE) {
        _grantRole(MANAGER_ROLE, _newOperator);
    }
    
    function removeOperatorRole(address _operator) external onlyRole(ADMIN_ROLE) {
        _revokeRole(MANAGER_ROLE, _operator);
    }
    
    // View Functions
    function getProject(uint256 _projectId) external view projectExists(_projectId) returns (
        uint256 id,
        address payable owner,
        string memory name,
        string memory description,
        bool active,
        uint256 createdAt,
        string memory bio,
        string memory contractInfo,
        string memory additionalData,
        address[] memory contracts,
        bool transferrable,
        uint8 officialStatus
    ) {
        Project storage project = projects[_projectId];
        return (
            project.id,
            project.owner,
            project.name,
            project.description,
            project.active,
            project.createdAt,
            project.bio,
            project.contractInfo,
            project.additionalData,
            project.contracts,
            project.transferrable,
            project.officialStatus
        );
    }
    
    function getCampaign(uint256 _campaignId) external view campaignExists(_campaignId) returns (
        uint256 id,
        address admin,
        string memory name,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        bool active,
        uint256 totalFunds,
        uint256 createdAt,
        bool autoPoolCreated,
        uint256[] memory poolIds,
        string memory mainInfo,
        string memory additionalInfo,
        uint256 adminFeePercentage,
        uint256 maxWinners,
        bool useQuadraticDistribution,
        bool useCustomDistribution,
        string memory customDistributionData,
        address payoutToken,
        uint8 officialStatus
    ) {
        Campaign storage campaign = campaigns[_campaignId];
        return (
            campaign.id,
            campaign.admin,
            campaign.name,
            campaign.description,
            campaign.startTime,
            campaign.endTime,
            campaign.active,
            campaign.totalFunds,
            campaign.createdAt,
            campaign.autoPoolCreated,
            campaign.poolIds,
            campaign.mainInfo,
            campaign.additionalInfo,
            campaign.adminFeePercentage,
            campaign.maxWinners,
            campaign.useQuadraticDistribution,
            campaign.useCustomDistribution,
            campaign.customDistributionData,
            campaign.payoutToken,
            campaign.officialStatus
        );
    }
    
    function getProjectCount() external view returns (uint256) {
        return projectCount;
    }
    
    function getCampaignCount() external view returns (uint256) {
        return campaignCount;
    }
    
    function isCampaignAdmin(uint256 _campaignId, address _user) external view returns (bool) {
        return campaigns[_campaignId].campaignAdmins[_user] || campaigns[_campaignId].admin == _user;
    }
    
    // UUPS Upgrade Functions
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
    
    // Emergency Functions
    function emergencyPause() external onlyRole(EMERGENCY_ROLE) {
        _pause();
    }
    
    function emergencyUnpause() external onlyRole(EMERGENCY_ROLE) {
        _unpause();
    }
}
