// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

// Interface for main contract communication
interface ISovereignSeasV5 {
    function hasModuleAccess(address _user, bytes32 _role) external view returns (bool);
    function callModule(string memory _moduleName, bytes memory _data) external returns (bytes memory);
}

// Official Status Enum for Quality Control
enum OfficialStatus {
    PENDING,        // 0: Default status - awaiting review
    VERIFIED,       // 1: Officially verified and trusted
    FLAGGED,        // 2: Marked for review due to concerns
    SUSPENDED,      // 3: Temporarily suspended from platform
    ARCHIVED        // 4: No longer active but preserved for reference
}

/**
 * @title ProjectsModule - SovereignSeasV5 Projects Management
 * @dev Handles all project-related operations with V4 compatibility
 */
contract ProjectsModule is Initializable, ReentrancyGuardUpgradeable {
    
    // Enhanced Project struct with quality control
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
        
        // V5 Enhanced fields
        OfficialStatus officialStatus;
        uint256 totalFundsRaised;
        uint256 totalVotesReceived;
        string[] tags;
        string websiteUrl;
        string socialMediaHandle;
        bool verified;
        uint256 lastUpdated;
        
        // Multiple ownership support
        mapping(address => bool) owners;
        address[] ownerList;
    }
    
    // State variables
    ISovereignSeasV5 public mainContract;
    
    mapping(uint256 => Project) public projects;
    uint256[] public projectIds;
    uint256 public nextProjectId;
    
    // Enhanced indexing
    mapping(address => uint256[]) public ownerProjects;
    mapping(string => uint256[]) public projectsByTag;
    mapping(OfficialStatus => uint256[]) public projectsByStatus;
    
    // Search and filter mappings
    mapping(uint256 => mapping(string => bool)) public projectHasTag;
    mapping(address => bool) public verifiedOwners;
    
    // Constants
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    
    // Events
    event ProjectCreated(uint256 indexed projectId, address indexed owner, string name);
    event ProjectUpdated(uint256 indexed projectId, address indexed updatedBy);
    event ProjectOwnershipTransferred(uint256 indexed projectId, address indexed previousOwner, address indexed newOwner);
    event ProjectStatusUpdated(uint256 indexed projectId, OfficialStatus oldStatus, OfficialStatus newStatus, address indexed updatedBy, string reason);
    event ProjectVerified(uint256 indexed projectId, address indexed verifiedBy);
    event ProjectTagAdded(uint256 indexed projectId, string tag);
    event ProjectTagRemoved(uint256 indexed projectId, string tag);
    event ProjectStatsUpdated(uint256 indexed projectId, uint256 totalFundsRaised, uint256 totalVotesReceived);

    // Modifiers
    modifier onlyMainContract() {
        require(msg.sender == address(mainContract), "ProjectsModule: Only main contract can call");
        _;
    }
    
    modifier hasRole(bytes32 role) {
        require(mainContract.hasModuleAccess(msg.sender, role), "ProjectsModule: Access denied");
        _;
    }
    
    modifier onlyProjectOwner(uint256 _projectId) {
        require(projects[_projectId].owners[msg.sender] || projects[_projectId].owner == msg.sender, "ProjectsModule: Only project owner can call");
        _;
    }
    
    modifier projectExists(uint256 _projectId) {
        require(_projectId < nextProjectId, "ProjectsModule: Project does not exist");
        _;
    }
    
    modifier activeProject(uint256 _projectId) {
        require(projects[_projectId].active, "ProjectsModule: Project is not active");
        _;
    }

    function initialize(address _main) external initializer {
        __ReentrancyGuard_init();
        mainContract = ISovereignSeasV5(_main);
        nextProjectId = 0;
    }

    // Project Creation Functions
    function createProject(
        string memory _name,
        string memory _description,
        string memory _bio,
        string memory _contractInfo,
        string memory _additionalData,
        address[] memory _contracts,
        bool _transferrable
    ) external payable nonReentrant returns (uint256) {
        require(bytes(_name).length > 0, "ProjectsModule: Name cannot be empty");
        require(bytes(_description).length > 0, "ProjectsModule: Description cannot be empty");
        
        // Collect 0.5 CELO project creation fee
        require(msg.value == 0.5 ether, "ProjectsModule: Must send exactly 0.5 CELO for project creation");
        
        uint256 projectId = nextProjectId;
        nextProjectId++;
        
        Project storage newProject = projects[projectId];
        newProject.id = projectId;
        newProject.owner = payable(msg.sender);
        newProject.owners[msg.sender] = true;
        newProject.ownerList.push(msg.sender);
        newProject.name = _name;
        newProject.description = _description;
        newProject.bio = _bio;
        newProject.contractInfo = _contractInfo;
        newProject.additionalData = _additionalData;
        newProject.contracts = _contracts;
        newProject.transferrable = _transferrable;
        newProject.active = true;
        newProject.createdAt = block.timestamp;
        newProject.lastUpdated = block.timestamp;
        newProject.officialStatus = OfficialStatus.PENDING;
        newProject.totalFundsRaised = 0;
        newProject.totalVotesReceived = 0;
        newProject.verified = false;
        
        // Update indexes
        projectIds.push(projectId);
        ownerProjects[msg.sender].push(projectId);
        projectsByStatus[OfficialStatus.PENDING].push(projectId);
        
        // Transfer fee to treasury
        _transferCreationFeeToTreasury();
        
        emit ProjectCreated(projectId, msg.sender, _name);
        return projectId;
    }
    
    /**
     * @dev Create project from V4 migration (NO FEE REQUIRED)
     */
    function createProjectFromV4Migration(
        uint256 _v4ProjectId,
        address _owner,
        string memory _name,
        string memory _description,
        string memory _bio,
        string memory _contractInfo,
        string memory _additionalData,
        address[] memory _contracts,
        bool _transferrable,
        bool _active,
        uint256 _createdAt
    ) external onlyMainContract returns (uint256) {
        require(_v4ProjectId >= 0, "ProjectsModule: Invalid V4 project ID");
        require(_owner != address(0), "ProjectsModule: Invalid owner address");
        require(bytes(_name).length > 0, "ProjectsModule: Name cannot be empty");
        
        uint256 projectId = nextProjectId;
        nextProjectId++;
        
        Project storage newProject = projects[projectId];
        newProject.id = projectId;
        newProject.owner = payable(_owner);
        newProject.name = _name;
        newProject.description = _description;
        newProject.bio = _bio;
        newProject.contractInfo = _contractInfo;
        newProject.additionalData = _additionalData;
        newProject.contracts = _contracts;
        newProject.transferrable = _transferrable;
        newProject.active = _active;
        newProject.createdAt = _createdAt > 0 ? _createdAt : block.timestamp;
        newProject.lastUpdated = block.timestamp;
        newProject.officialStatus = OfficialStatus.PENDING;
        newProject.totalFundsRaised = 0;
        newProject.totalVotesReceived = 0;
        newProject.verified = false;
        
        // Update indexes
        projectIds.push(projectId);
        ownerProjects[_owner].push(projectId);
        projectsByStatus[OfficialStatus.PENDING].push(projectId);
        
        emit ProjectCreatedFromV4(projectId, _owner, _name, _v4ProjectId);
        return projectId;
    }

   
    // Project Update Functions
    function updateProject(
        uint256 _projectId,
        string memory _name,
        string memory _description,
        string memory _bio,
        string memory _contractInfo,
        string memory _additionalData,
        address[] memory _contracts
    ) external onlyProjectOwner(_projectId) activeProject(_projectId) {
        Project storage project = projects[_projectId];
        project.name = _name;
        project.description = _description;
        project.bio = _bio;
        project.contractInfo = _contractInfo;
        project.additionalData = _additionalData;
        project.contracts = _contracts;
        project.lastUpdated = block.timestamp;
        
        emit ProjectUpdated(_projectId, msg.sender);
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
        else revert("ProjectsModule: Invalid metadata type");
        
        project.lastUpdated = block.timestamp;
        emit ProjectUpdated(_projectId, msg.sender);
    }
    
    // Quick edit functions
    function editProjectName(uint256 _projectId, string memory _newName) external onlyProjectOwner(_projectId) {
        require(bytes(_newName).length > 0, "ProjectsModule: Name cannot be empty");
        projects[_projectId].name = _newName;
        projects[_projectId].lastUpdated = block.timestamp;
        emit ProjectUpdated(_projectId, msg.sender);
    }
    
    function editProjectDescription(uint256 _projectId, string memory _newDescription) external onlyProjectOwner(_projectId) {
        require(bytes(_newDescription).length > 0, "ProjectsModule: Description cannot be empty");
        projects[_projectId].description = _newDescription;
        projects[_projectId].lastUpdated = block.timestamp;
        emit ProjectUpdated(_projectId, msg.sender);
    }
    
    function editProjectBio(uint256 _projectId, string memory _newBio) external onlyProjectOwner(_projectId) {
        projects[_projectId].bio = _newBio;
        projects[_projectId].lastUpdated = block.timestamp;
        emit ProjectUpdated(_projectId, msg.sender);
    }
    
    function editProjectContractInfo(uint256 _projectId, string memory _newContractInfo) external onlyProjectOwner(_projectId) {
        projects[_projectId].contractInfo = _newContractInfo;
        projects[_projectId].lastUpdated = block.timestamp;
        emit ProjectUpdated(_projectId, msg.sender);
    }
    
    function editProjectAdditionalData(uint256 _projectId, string memory _newAdditionalData) external onlyProjectOwner(_projectId) {
        projects[_projectId].additionalData = _newAdditionalData;
        projects[_projectId].lastUpdated = block.timestamp;
        emit ProjectUpdated(_projectId, msg.sender);
    }
    
    function editProjectContracts(uint256 _projectId, address[] memory _newContracts) external onlyProjectOwner(_projectId) {
        projects[_projectId].contracts = _newContracts;
        projects[_projectId].lastUpdated = block.timestamp;
        emit ProjectUpdated(_projectId, msg.sender);
    }
    
    function editProjectTransferrability(uint256 _projectId, bool _transferrable) external onlyProjectOwner(_projectId) {
        projects[_projectId].transferrable = _transferrable;
        projects[_projectId].lastUpdated = block.timestamp;
        emit ProjectUpdated(_projectId, msg.sender);
    }

    // V5 Enhanced functions
    function setProjectWebsite(uint256 _projectId, string memory _websiteUrl) external onlyProjectOwner(_projectId) {
        projects[_projectId].websiteUrl = _websiteUrl;
        projects[_projectId].lastUpdated = block.timestamp;
        emit ProjectUpdated(_projectId, msg.sender);
    }
    
    function setProjectSocialMedia(uint256 _projectId, string memory _socialMediaHandle) external onlyProjectOwner(_projectId) {
        projects[_projectId].socialMediaHandle = _socialMediaHandle;
        projects[_projectId].lastUpdated = block.timestamp;
        emit ProjectUpdated(_projectId, msg.sender);
    }

    // Project Ownership Management
    function transferProjectOwnership(
        uint256 _projectId,
        address payable _newOwner
    ) external onlyProjectOwner(_projectId) projectExists(_projectId) {
        require(_newOwner != address(0), "ProjectsModule: Invalid new owner address");
        
        Project storage project = projects[_projectId];
        require(project.transferrable, "ProjectsModule: Project is not transferrable");
        
        address previousOwner = project.owner;
        project.owner = _newOwner;
        project.lastUpdated = block.timestamp;
        
        // Update owner indexes
        _removeProjectFromOwner(previousOwner, _projectId);
        ownerProjects[_newOwner].push(_projectId);
        
        emit ProjectOwnershipTransferred(_projectId, previousOwner, _newOwner);
    }

    // Tag Management
    function addProjectTag(uint256 _projectId, string memory _tag) external onlyProjectOwner(_projectId) {
        require(!projectHasTag[_projectId][_tag], "ProjectsModule: Tag already exists");
        
        projects[_projectId].tags.push(_tag);
        projectHasTag[_projectId][_tag] = true;
        projectsByTag[_tag].push(_projectId);
        projects[_projectId].lastUpdated = block.timestamp;
        
        emit ProjectTagAdded(_projectId, _tag);
    }
    
    function removeProjectTag(uint256 _projectId, string memory _tag) external onlyProjectOwner(_projectId) {
        require(projectHasTag[_projectId][_tag], "ProjectsModule: Tag does not exist");
        
        // Remove from project tags array
        string[] storage tags = projects[_projectId].tags;
        for (uint256 i = 0; i < tags.length; i++) {
            if (keccak256(bytes(tags[i])) == keccak256(bytes(_tag))) {
                tags[i] = tags[tags.length - 1];
                tags.pop();
                break;
            }
        }
        
        projectHasTag[_projectId][_tag] = false;
        projects[_projectId].lastUpdated = block.timestamp;
        
        emit ProjectTagRemoved(_projectId, _tag);
    }

    // Campaign Participation Management
    function addProjectToCampaign(uint256 _projectId, uint256 _campaignId) external onlyMainContract {
        require(!projects[_projectId].campaignParticipation[_campaignId], "ProjectsModule: Already participating");
        
        projects[_projectId].campaignIds.push(_campaignId);
        projects[_projectId].campaignParticipation[_campaignId] = true;
        projects[_projectId].lastUpdated = block.timestamp;
    }
    
    function removeProjectFromCampaign(uint256 _projectId, uint256 _campaignId) external onlyMainContract {
        require(projects[_projectId].campaignParticipation[_campaignId], "ProjectsModule: Not participating");
        
        // Remove from campaignIds array
        uint256[] storage campaignIds = projects[_projectId].campaignIds;
        for (uint256 i = 0; i < campaignIds.length; i++) {
            if (campaignIds[i] == _campaignId) {
                campaignIds[i] = campaignIds[campaignIds.length - 1];
                campaignIds.pop();
                break;
            }
        }
        
        projects[_projectId].campaignParticipation[_campaignId] = false;
        projects[_projectId].lastUpdated = block.timestamp;
    }

    // Admin Functions
    function updateProjectStatus(
        uint256 _projectId,
        OfficialStatus _newStatus,
        string memory _reason
    ) external hasRole(ADMIN_ROLE) projectExists(_projectId) {
        Project storage project = projects[_projectId];
        OfficialStatus oldStatus = project.officialStatus;
        
        // Remove from old status array
        _removeProjectFromStatus(oldStatus, _projectId);
        
        project.officialStatus = _newStatus;
        project.lastUpdated = block.timestamp;
        
        // Add to new status array
        projectsByStatus[_newStatus].push(_projectId);
        
        emit ProjectStatusUpdated(_projectId, oldStatus, _newStatus, msg.sender, _reason);
    }
    
    function verifyProject(uint256 _projectId) external hasRole(ADMIN_ROLE) projectExists(_projectId) {
        projects[_projectId].verified = true;
        projects[_projectId].officialStatus = OfficialStatus.VERIFIED;
        projects[_projectId].lastUpdated = block.timestamp;
        
        // Update owner as verified
        verifiedOwners[projects[_projectId].owner] = true;
        
        emit ProjectVerified(_projectId, msg.sender);
    }
    
    function batchUpdateProjectStatus(
        uint256[] memory _projectIds,
        OfficialStatus _newStatus,
        string memory _reason
    ) external hasRole(ADMIN_ROLE) {
        for (uint256 i = 0; i < _projectIds.length; i++) {
            if (projects[_projectIds[i]].id != 0) {
                Project storage project = projects[_projectIds[i]];
                OfficialStatus oldStatus = project.officialStatus;
                
                // Remove from old status array
                _removeProjectFromStatus(oldStatus, _projectIds[i]);
                
                project.officialStatus = _newStatus;
                project.lastUpdated = block.timestamp;
                
                // Add to new status array
                projectsByStatus[_newStatus].push(_projectIds[i]);
                
                emit ProjectStatusUpdated(_projectIds[i], oldStatus, _newStatus, msg.sender, _reason);
            }
        }
    }

    // Stats Update (called by other modules)
    function updateProjectStats(
        uint256 _projectId,
        uint256 _fundsRaised,
        uint256 _votesReceived
    ) external onlyMainContract {
        projects[_projectId].totalFundsRaised += _fundsRaised;
        projects[_projectId].totalVotesReceived += _votesReceived;
        projects[_projectId].lastUpdated = block.timestamp;
        
        emit ProjectStatsUpdated(_projectId, projects[_projectId].totalFundsRaised, projects[_projectId].totalVotesReceived);
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
     * @dev Get project with pool status from PoolsModule
     */
    function getProjectWithPoolStatus(uint256 _projectId) external returns (
        uint256 id,
        address owner,
        string memory name,
        string memory description,
        bool transferrable,
        bool active,
        uint256 createdAt,
        uint256[] memory campaignIds,
        bool hasPool,
        uint256 totalFunded,
        uint256 totalClaimed
    ) {
        Project storage project = projects[_projectId];
        
        // Get pool status from PoolsModule
        bool hasPool = false;
        uint256 totalFunded = 0;
        uint256 totalClaimed = 0;
        
        try mainContract.callModule("pools", abi.encodeWithSignature("getProjectPoolStatus(uint256)", _projectId)) returns (bytes memory poolData) {
            (bool exists, uint256 funded, uint256 claimed, , , ) = abi.decode(poolData, (bool, uint256, uint256, bool, uint256, uint256));
            hasPool = exists;
            totalFunded = funded;
            totalClaimed = claimed;
        } catch {
            // Pool data not available
        }
        
        return (
            project.id,
            project.owner,
            project.name,
            project.description,
            project.transferrable,
            project.active,
            project.createdAt,
            project.campaignIds,
            hasPool,
            totalFunded,
            totalClaimed
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
    
    function getProjectEnhancedInfo(uint256 _projectId) external view returns (
        OfficialStatus officialStatus,
        uint256 totalFundsRaised,
        uint256 totalVotesReceived,
        string[] memory tags,
        string memory websiteUrl,
        string memory socialMediaHandle,
        bool verified,
        uint256 lastUpdated
    ) {
        Project storage project = projects[_projectId];
        return (
            project.officialStatus,
            project.totalFundsRaised,
            project.totalVotesReceived,
            project.tags,
            project.websiteUrl,
            project.socialMediaHandle,
            project.verified,
            project.lastUpdated
        );
    }
    
    function getProjectsByOwner(address _owner) external view returns (uint256[] memory) {
        return ownerProjects[_owner];
    }
    
    function getProjectsByTag(string memory _tag) external view returns (uint256[] memory) {
        return projectsByTag[_tag];
    }
    
    function getProjectsByStatus(OfficialStatus _status) external view returns (uint256[] memory) {
        return projectsByStatus[_status];
    }
    
    function getProjectCount() external view returns (uint256) {
        return nextProjectId;
    }
    
    function isProjectParticipatingInCampaign(uint256 _projectId, uint256 _campaignId) external view returns (bool) {
        return projects[_projectId].campaignParticipation[_campaignId];
    }
    
    function getAllProjectIds() external view returns (uint256[] memory) {
        return projectIds;
    }

    // Search and Filter Functions
    function getActiveProjects() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < projectIds.length; i++) {
            if (projects[projectIds[i]].active) count++;
        }
        
        uint256[] memory activeProjectIds = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < projectIds.length; i++) {
            if (projects[projectIds[i]].active) {
                activeProjectIds[index++] = projectIds[i];
            }
        }
        
        return activeProjectIds;
    }
    
    function getVerifiedProjects() external view returns (uint256[] memory) {
        return projectsByStatus[OfficialStatus.VERIFIED];
    }
    
    function searchProjectsByName(string memory _searchTerm) external view returns (uint256[] memory) {
        uint256[] memory results = new uint256[](projectIds.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < projectIds.length; i++) {
            uint256 projectId = projectIds[i];
            if (_containsIgnoreCase(projects[projectId].name, _searchTerm)) {
                results[count++] = projectId;
            }
        }
        
        // Resize array
        uint256[] memory finalResults = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            finalResults[i] = results[i];
        }
        
        return finalResults;
    }

    // Internal helper functions
    function _removeProjectFromOwner(address _owner, uint256 _projectId) internal {
        uint256[] storage projects = ownerProjects[_owner];
        for (uint256 i = 0; i < projects.length; i++) {
            if (projects[i] == _projectId) {
                projects[i] = projects[projects.length - 1];
                projects.pop();
                break;
            }
        }
    }
    
    function _removeProjectFromStatus(OfficialStatus _status, uint256 _projectId) internal {
        uint256[] storage projects = projectsByStatus[_status];
        for (uint256 i = 0; i < projects.length; i++) {
            if (projects[i] == _projectId) {
                projects[i] = projects[projects.length - 1];
                projects.pop();
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
    
    // Create project from V4 migration data (NO FEE REQUIRED)
    function createProjectFromV4(
        uint256 _v4ProjectId,
        address payable _owner,
        string memory _name,
        string memory _description,
        string memory _bio,
        string memory _contractInfo,
        string memory _additionalData,
        address[] memory _contracts,
        bool _transferrable,
        bool _active,
        uint256 _createdAt
    ) external onlyMainContract returns (uint256) {
        require(_v4ProjectId >= 0, "ProjectsModule: Invalid V4 project ID");
        require(_owner != address(0), "ProjectsModule: Invalid owner address");
        require(bytes(_name).length > 0, "ProjectsModule: Name cannot be empty");
        
        uint256 projectId = nextProjectId;
        nextProjectId++;
        
        Project storage project = projects[projectId];
        project.id = projectId;
        project.owner = _owner;
        project.name = _name;
        project.description = _description;
        project.bio = _bio;
        project.contractInfo = _contractInfo;
        project.additionalData = _additionalData;
        project.contracts = _contracts;
        project.transferrable = _transferrable;
        project.active = _active;
        project.createdAt = _createdAt > 0 ? _createdAt : block.timestamp;
        project.lastUpdated = block.timestamp;
        project.officialStatus = OfficialStatus.PENDING;
        project.totalFundsRaised = 0;
        project.totalVotesReceived = 0;
        project.verified = false;
        
        // Add to project arrays
        projectIds.push(projectId);
        ownerProjects[_owner].push(projectId);
        projectsByStatus[OfficialStatus.PENDING].push(projectId);
        
        emit ProjectCreatedFromV4(projectId, _owner, _name, _v4ProjectId);
        
        return projectId;
    }
    
    // Set project campaign participation from V4 migration
    function setProjectCampaignParticipationFromV4(
        uint256 _projectId,
        uint256[] memory _campaignIds
    ) external onlyMainContract {
        require(projects[_projectId].id != 0, "ProjectsModule: Project does not exist");
        
        Project storage project = projects[_projectId];
        project.campaignIds = _campaignIds;
        
        // Set campaign participation mapping
        for (uint256 i = 0; i < _campaignIds.length; i++) {
            project.campaignParticipation[_campaignIds[i]] = true;
        }
    }
    
    // Set next project ID for V4 migration (to preserve IDs)
    function setNextProjectId(uint256 _nextId) external onlyMainContract {
        require(_nextId >= nextProjectId, "ProjectsModule: Can only increase nextProjectId");
        nextProjectId = _nextId;
    }

    // ==================== FEE MANAGEMENT ====================
    
    /**
     * @dev Transfer project creation fee to treasury
     */
    function _transferCreationFeeToTreasury() internal {
        // Transfer 0.5 CELO to treasury module
        mainContract.callModule("treasury", abi.encodeWithSignature("collectFee(address,uint256,string,uint256,address)", address(0), 0.5 ether, "project_creation", 0, msg.sender));
    }
    
    // Module info
    function getModuleName() external pure returns (string memory) {
        return "projects";
    }
    
    // ==================== OWNER MANAGEMENT ====================
    
    /**
     * @dev Add project owner
     */
    function addProjectOwner(uint256 _projectId, address _newOwner) external onlyProjectOwner(_projectId) {
        require(_newOwner != address(0), "ProjectsModule: Invalid owner address");
        require(!projects[_projectId].owners[_newOwner], "ProjectsModule: Already an owner");
        
        projects[_projectId].owners[_newOwner] = true;
        projects[_projectId].ownerList.push(_newOwner);
        projects[_projectId].lastUpdated = block.timestamp;
        
        emit ProjectOwnerAdded(_projectId, _newOwner, msg.sender);
    }
    
    /**
     * @dev Remove project owner
     */
    function removeProjectOwner(uint256 _projectId, address _owner) external onlyProjectOwner(_projectId) {
        require(_owner != projects[_projectId].owner, "ProjectsModule: Cannot remove primary owner");
        require(projects[_projectId].owners[_owner], "ProjectsModule: Not an owner");
        
        projects[_projectId].owners[_owner] = false;
        projects[_projectId].lastUpdated = block.timestamp;
        
        // Remove from owner list
        address[] storage ownerList = projects[_projectId].ownerList;
        for (uint256 i = 0; i < ownerList.length; i++) {
            if (ownerList[i] == _owner) {
                ownerList[i] = ownerList[ownerList.length - 1];
                ownerList.pop();
                break;
            }
        }
        
        emit ProjectOwnerRemoved(_projectId, _owner, msg.sender);
    }
    
    /**
     * @dev Check if address is project owner
     */
    function isProjectOwner(uint256 _projectId, address _owner) external view returns (bool) {
        return projects[_projectId].owners[_owner];
    }
    
    /**
     * @dev Get all project owners
     */
    function getProjectOwners(uint256 _projectId) external view returns (address[] memory) {
        return projects[_projectId].ownerList;
    }
    
    function getModuleVersion() external pure returns (uint256) {
        return 5;
    }
    
    // ==================== EVENTS ====================
    
    event ProjectCreatedFromV4(uint256 indexed projectId, address indexed owner, string name, uint256 indexed v4ProjectId);
    event ProjectOwnerAdded(uint256 indexed projectId, address indexed newOwner, address indexed addedBy);
    event ProjectOwnerRemoved(uint256 indexed projectId, address indexed owner, address indexed removedBy);
    
    // ==================== RECEIVE FUNCTION ====================
    
    /**
     * @dev Receive function for native CELO payments
     */
    receive() external payable {
        // Accept CELO payments for project creation fees
    }
}