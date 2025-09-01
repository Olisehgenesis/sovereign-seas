// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../base/BaseModule.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Interface for main contract communication
interface IProxyInterface {
    function hasModuleAccess(address _user, bytes32 _role) external view returns (bool);
    function callModule(string memory _moduleName, bytes memory _data) external returns (bytes memory);
}

// Project status enum - unified from both contracts
enum ProjectStatus {
    PENDING,        // 0: Default status - awaiting review
    VERIFIED,       // 1: Officially verified and trusted
    FLAGGED,        // 2: Marked for review due to concerns
    SUSPENDED,      // 3: Temporarily suspended from platform
    ARCHIVED        // 4: No longer active but preserved for reference
}

// Alias for backward compatibility
enum OfficialStatus {
    PENDING,
    VERIFIED,
    FLAGGED,
    SUSPENDED,
    ARCHIVED
}

/**
 * @title ProjectsModule - Enhanced SovereignSeasV5 Projects Management
 * @notice Manages projects submitted by users in SovereignSeas V5
 * @dev Handles project creation, updates, ownership transfers, and status management with V4 compatibility
 * All access control is managed centrally by the proxy
 */
contract ProjectsModule is BaseModule {
    using SafeERC20 for IERC20;

    // Project metadata struct - JSON-based for flexibility
    struct ProjectMetadata {
        string bio;
        string contractInfo;
        string additionalData;
        string jsonMetadata; // JSON string containing flexible metadata
        string category;
        string website;
        string github;
        string twitter;
        string discord;
        string websiteUrl;        // V5 compatibility
        string socialMediaHandle; // V5 compatibility
    }

    // Enhanced Project struct with quality control
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
        ProjectStatus status;
        bool active;
        uint256 createdAt;
        uint256 updatedAt;
        
        // V5 Enhanced fields
        uint256 totalFundsRaised;
        uint256 totalVotesReceived;
        bool verified;
        uint256 lastUpdated;
        
        // Multiple ownership support
        mapping(address => bool) owners;
        address[] ownerList;
    }
    
    // State variables
    mapping(uint256 => Project) public projects;
    mapping(address => uint256[]) public projectsByOwner;
    mapping(string => uint256[]) public projectsByCategory;
    mapping(ProjectStatus => uint256[]) public projectsByStatus;
    
    // Enhanced indexing
    uint256[] public projectIds;
    mapping(address => bool) public verifiedOwners;
    
    uint256 public nextProjectId;
    uint256 public totalProjects;
    uint256 public verifiedProjects;
    uint256 public activeProjects;

    // Dynamic fee configuration
    uint256 public projectCreationFee = 0.5e18; // Default 0.5 CELO
    address public projectCreationFeeToken; // Token for project creation fee
    bool public feesEnabled = true;

    // Events
    event ProjectCreated(uint256 indexed projectId, address indexed owner, string name);
    event ProjectUpdated(uint256 indexed projectId, address indexed updatedBy);
    event ProjectOwnershipTransferred(uint256 indexed projectId, address indexed previousOwner, address indexed newOwner);
    event ProjectStatusChanged(uint256 indexed projectId, ProjectStatus oldStatus, ProjectStatus newStatus);
    event ProjectStatusUpdated(uint256 indexed projectId, ProjectStatus oldStatus, ProjectStatus newStatus, address indexed updatedBy, string reason);
    event ProjectMetadataUpdated(uint256 indexed projectId, address indexed updatedBy);
    event ProjectAddedToCampaign(uint256 indexed projectId, uint256 indexed campaignId);
    event ProjectRemovedFromCampaign(uint256 indexed projectId, uint256 indexed campaignId);
    event ProjectTagged(uint256 indexed projectId, string tag);
    event ProjectUntagged(uint256 indexed projectId, string tag);
    event ProjectTagAdded(uint256 indexed projectId, string tag);
    event ProjectTagRemoved(uint256 indexed projectId, string tag);
    event ProjectVerified(uint256 indexed projectId, address indexed verifiedBy);
    event ProjectStatsUpdated(uint256 indexed projectId, uint256 totalFundsRaised, uint256 totalVotesReceived);
    event ProjectCreatedFromV4(uint256 indexed projectId, address indexed owner, string name, uint256 indexed v4ProjectId);
    event ProjectOwnerAdded(uint256 indexed projectId, address indexed newOwner, address indexed addedBy);
    event ProjectOwnerRemoved(uint256 indexed projectId, address indexed owner, address indexed removedBy);
    event ProjectCreationFeeUpdated(uint256 oldFee, uint256 newFee, address indexed updatedBy);
    event ProjectCreationFeeTokenUpdated(address oldToken, address newToken, address indexed updatedBy);
    event ProjectFeesToggled(bool newFeesEnabled, address indexed updatedBy);

    // Modifiers
    modifier projectExists(uint256 _projectId) {
        require(projects[_projectId].id != 0, "ProjectsModule: Project does not exist");
        _;
    }

    modifier onlyProjectOwner(uint256 _projectId) {
        require(
            projects[_projectId].owner == msg.sender || 
            projects[_projectId].owners[msg.sender], 
            "ProjectsModule: Only project owner can call this function"
        );
        _;
    }

    modifier onlyVerifiedProject(uint256 _projectId) {
        require(projects[_projectId].status == ProjectStatus.VERIFIED, "ProjectsModule: Project is not verified");
        _;
    }

    modifier onlyActiveProject(uint256 _projectId) {
        require(projects[_projectId].active, "ProjectsModule: Project is not active");
        _;
    }

    modifier activeProject(uint256 _projectId) {
        require(projects[_projectId].active, "ProjectsModule: Project is not active");
        _;
    }

    /**
     * @notice Initialize the ProjectsModule
     * @param _proxy The main proxy contract address
     * @param _data Additional initialization data
     */
    function initialize(address _proxy, bytes calldata _data) external override initializer {
        // Initialize base module
        require(_proxy != address(0), "ProjectsModule: Invalid proxy address");
        
        sovereignSeasProxy = ISovereignSeasV5(_proxy);
        moduleActive = true;

        // Initialize inherited contracts
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        // Set module-specific data
        moduleName = "Projects Module";
        moduleDescription = "Manages project creation, updates, and lifecycle";
        moduleDependencies = new string[](0);
        
        nextProjectId = 1;
        
        emit ModuleInitialized(getModuleId(), _proxy);
    }

    /**
     * @notice Get the module's unique identifier
     * @return The module identifier string
     */
    function getModuleId() public pure override returns (string memory) {
        return "projects";
    }

    /**
     * @notice Get the module's version
     * @return The module version string
     */
    function getModuleVersion() public pure override returns (string memory) {
        return "5.0.0";
    }

    /**
     * @notice Create a new project with fee
     * @param _name Project name
     * @param _description Project description
     * @param _metadata Project metadata
     * @param _contracts Array of contract addresses
     * @param _transferrable Whether the project is transferrable
     * @return The new project ID
     */
    function createProject(
        string calldata _name,
        string calldata _description,
        ProjectMetadata calldata _metadata,
        address[] calldata _contracts,
        bool _transferrable
    ) external payable whenActive nonReentrant returns (uint256) {
        require(bytes(_name).length > 0, "ProjectsModule: Project name cannot be empty");
        require(bytes(_description).length > 0, "ProjectsModule: Project description cannot be empty");
        
        // Check if fees are enabled and collect dynamic project creation fee
        if (feesEnabled && projectCreationFee > 0) {
            require(msg.value == projectCreationFee, "ProjectsModule: Must send exact fee amount for project creation");
        } else {
            require(msg.value == 0, "ProjectsModule: No fee required for project creation");
        }

        uint256 projectId = nextProjectId++;
        
        Project storage project = projects[projectId];
        project.id = projectId;
        project.owner = payable(msg.sender);
        project.owners[msg.sender] = true;
        project.ownerList.push(msg.sender);
        project.name = _name;
        project.description = _description;
        project.metadata = _metadata;
        project.contracts = _contracts;
        project.transferrable = _transferrable;
        project.status = ProjectStatus.PENDING;
        project.active = true;
        project.createdAt = block.timestamp;
        project.updatedAt = block.timestamp;
        project.lastUpdated = block.timestamp;

        // Add to indexes
        projectIds.push(projectId);
        projectsByOwner[msg.sender].push(projectId);

        // Add to category - SAFE VERSION
        if (bytes(_metadata.category).length > 0 && bytes(_metadata.category).length < 50) {
            projectsByCategory[_metadata.category].push(projectId);
        }

        projectsByStatus[ProjectStatus.PENDING].push(projectId);

        totalProjects++;
        activeProjects++;

        // Transfer fee to treasury
        _transferCreationFeeToTreasury();

        emit ProjectCreated(projectId, msg.sender, _name);
        
        return projectId;
    }

    /**
     * @notice Create project from V4 migration (NO FEE REQUIRED)
     */
    function createProjectFromV4Migration(
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
        
        uint256 projectId = nextProjectId++;
        
        Project storage project = projects[projectId];
        project.id = projectId;
        project.owner = _owner;
        project.owners[_owner] = true;
        project.ownerList.push(_owner);
        project.name = _name;
        project.description = _description;
        project.metadata.bio = _bio;
        project.metadata.contractInfo = _contractInfo;
        project.metadata.additionalData = _additionalData;
        project.contracts = _contracts;
        project.transferrable = _transferrable;
        project.active = _active;
        project.createdAt = _createdAt > 0 ? _createdAt : block.timestamp;
        project.updatedAt = block.timestamp;
        project.lastUpdated = block.timestamp;
        project.status = ProjectStatus.PENDING;
        
        // Add to indexes
        projectIds.push(projectId);
        projectsByOwner[_owner].push(projectId);
        projectsByStatus[ProjectStatus.PENDING].push(projectId);

        totalProjects++;
        if (_active) activeProjects++;
        
        emit ProjectCreatedFromV4(projectId, _owner, _name, _v4ProjectId);
        return projectId;
    }

    /**
     * @notice Update project information
     */
    function updateProject(
        uint256 _projectId,
        string calldata _name,
        string calldata _description
    ) external projectExists(_projectId) onlyProjectOwner(_projectId) whenActive {
        require(bytes(_name).length > 0, "ProjectsModule: Project name cannot be empty");
        require(bytes(_description).length > 0, "ProjectsModule: Project description cannot be empty");

        Project storage project = projects[_projectId];
        project.name = _name;
        project.description = _description;
        project.updatedAt = block.timestamp;
        project.lastUpdated = block.timestamp;

        emit ProjectUpdated(_projectId, msg.sender);
    }

    /**
     * @notice Update project metadata
     */
    function updateProjectMetadata(
        uint256 _projectId,
        ProjectMetadata calldata _metadata
    ) external projectExists(_projectId) onlyProjectOwner(_projectId) whenActive {
        Project storage project = projects[_projectId];
        
        // Remove from old category
        if (bytes(project.metadata.category).length > 0) {
            _removeFromCategory(_projectId, project.metadata.category);
        }

        // Update metadata
        project.metadata = _metadata;
        project.updatedAt = block.timestamp;
        project.lastUpdated = block.timestamp;

        // Add to new category
        if (bytes(_metadata.category).length > 0) {
            projectsByCategory[_metadata.category].push(_projectId);
        }

        emit ProjectMetadataUpdated(_projectId, msg.sender);
    }

    /**
     * @notice Update project JSON metadata (admin only)
     * @dev Allows admins to update the JSON metadata for flexible expansion
     */
    function updateProjectJsonMetadata(
        uint256 _projectId,
        string calldata _jsonMetadata
    ) external {
        require(_isAdmin(msg.sender), "ProjectsModule: Admin role required");
        require(bytes(_jsonMetadata).length > 0, "ProjectsModule: JSON metadata cannot be empty");
        require(bytes(_jsonMetadata).length < 10000, "ProjectsModule: JSON metadata too large"); // 10KB limit
        
        projects[_projectId].metadata.jsonMetadata = _jsonMetadata;
        projects[_projectId].lastUpdated = block.timestamp;
        
        emit ProjectMetadataUpdated(_projectId, msg.sender);
    }

    /**
     * @notice Get project JSON metadata
     * @param _projectId The project ID
     * @return JSON metadata string
     */
    function getProjectJsonMetadata(uint256 _projectId) external view projectExists(_projectId) returns (string memory) {
        return projects[_projectId].metadata.jsonMetadata;
    }

    /**
     * @notice Search projects by JSON metadata content
     * @param _query Search query to look for in JSON metadata
     * @return Array of project IDs matching the query
     */
    function searchProjectsByJsonMetadata(string calldata _query) external view returns (uint256[] memory) {
        uint256[] memory results = new uint256[](totalProjects);
        uint256 resultCount = 0;
        
        for (uint256 i = 1; i < nextProjectId; i++) {
            if (projects[i].id != 0) {
                string memory jsonMetadata = projects[i].metadata.jsonMetadata;
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
     * @notice Get projects by metadata field value
     * @param _fieldName The JSON field name to search
     * @param _fieldValue The value to search for
     * @return Array of project IDs with matching field value
     */
    function getProjectsByMetadataField(
        string calldata _fieldName,
        string calldata _fieldValue
    ) external view returns (uint256[] memory) {
        uint256[] memory results = new uint256[](totalProjects);
        uint256 resultCount = 0;
        
        for (uint256 i = 1; i < nextProjectId; i++) {
            if (projects[i].id != 0) {
                string memory jsonMetadata = projects[i].metadata.jsonMetadata;
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

    // ==================== PROJECT MANAGEMENT FUNCTIONS ====================

    /**
     * @notice Transfer project ownership
     */
    function transferProjectOwnership(
        uint256 _projectId,
        address payable _newOwner
    ) external projectExists(_projectId) onlyProjectOwner(_projectId) whenActive {
        require(_newOwner != address(0), "ProjectsModule: Invalid new owner address");
        require(projects[_projectId].transferrable, "ProjectsModule: Project is not transferrable");

        Project storage project = projects[_projectId];
        address previousOwner = project.owner;
        
        // Remove from previous owner's projects
        _removeFromOwnerProjects(previousOwner, _projectId);
        
        // Add to new owner's projects
        projectsByOwner[_newOwner].push(_projectId);
        
        project.owner = _newOwner;
        project.updatedAt = block.timestamp;
        project.lastUpdated = block.timestamp;

        emit ProjectOwnershipTransferred(_projectId, previousOwner, _newOwner);
    }

    /**
     * @notice Set project status (admin only)
     */
    function setProjectStatus(
        uint256 _projectId,
        ProjectStatus _status
    ) external projectExists(_projectId) whenActive {
        // Check if caller has admin role through proxy
        require(_isAdmin(msg.sender), "ProjectsModule: Admin role required");
        Project storage project = projects[_projectId];
        ProjectStatus oldStatus = project.status;
        
        // Remove from old status array
        _removeProjectFromStatus(oldStatus, _projectId);
        
        // Update counts
        if (oldStatus == ProjectStatus.VERIFIED) {
            verifiedProjects--;
        }
        if (oldStatus == ProjectStatus.PENDING || oldStatus == ProjectStatus.VERIFIED) {
            activeProjects--;
        }
        
        if (_status == ProjectStatus.VERIFIED) {
            verifiedProjects++;
        }
        if (_status == ProjectStatus.PENDING || _status == ProjectStatus.VERIFIED) {
            activeProjects++;
        }
        
        project.status = _status;
        project.updatedAt = block.timestamp;
        project.lastUpdated = block.timestamp;

        // Add to new status array
        projectsByStatus[_status].push(_projectId);

        emit ProjectStatusChanged(_projectId, oldStatus, _status);
    }

    /**
     * @notice Update project status with reason (admin only)
     */
    function updateProjectStatus(
        uint256 _projectId,
        ProjectStatus _newStatus,
        string memory _reason
    ) external projectExists(_projectId) {
        // Check if caller has admin role through proxy
        require(_isAdmin(msg.sender), "ProjectsModule: Admin role required");
        Project storage project = projects[_projectId];
        ProjectStatus oldStatus = project.status;
        
        // Remove from old status array
        _removeProjectFromStatus(oldStatus, _projectId);
        
        project.status = _newStatus;
        project.lastUpdated = block.timestamp;
        
        // Add to new status array
        projectsByStatus[_newStatus].push(_projectId);
        
        emit ProjectStatusUpdated(_projectId, oldStatus, _newStatus, msg.sender, _reason);
    }

    /**
     * @notice Verify project (admin only)
     */
    function verifyProject(uint256 _projectId) external projectExists(_projectId) {
        // Check if caller has admin role through proxy
        require(_isAdmin(msg.sender), "ProjectsModule: Admin role required");
        projects[_projectId].verified = true;
        projects[_projectId].status = ProjectStatus.VERIFIED;
        projects[_projectId].lastUpdated = block.timestamp;
        
        // Update owner as verified
        verifiedOwners[projects[_projectId].owner] = true;
        
        emit ProjectVerified(_projectId, msg.sender);
    }

    /**
     * @notice Add project to campaign
     */
    function addProjectToCampaign(
        uint256 _projectId,
        uint256 _campaignId
    ) external projectExists(_projectId) onlyVerifiedProject(_projectId) whenActive {
        Project storage project = projects[_projectId];
        require(!project.campaignParticipation[_campaignId], "ProjectsModule: Project already in campaign");
        
        project.campaignIds.push(_campaignId);
        project.campaignParticipation[_campaignId] = true;
        project.updatedAt = block.timestamp;
        project.lastUpdated = block.timestamp;

        emit ProjectAddedToCampaign(_projectId, _campaignId);
    }

    /**
     * @notice Remove project from campaign
     */
    function removeProjectFromCampaign(
        uint256 _projectId,
        uint256 _campaignId
    ) external projectExists(_projectId) onlyProjectOwner(_projectId) whenActive {
        Project storage project = projects[_projectId];
        require(project.campaignParticipation[_campaignId], "ProjectsModule: Project not in campaign");
        
        // Remove from campaign IDs array
        for (uint256 i = 0; i < project.campaignIds.length; i++) {
            if (project.campaignIds[i] == _campaignId) {
                project.campaignIds[i] = project.campaignIds[project.campaignIds.length - 1];
                project.campaignIds.pop();
                break;
            }
        }
        
        project.campaignParticipation[_campaignId] = false;
        project.updatedAt = block.timestamp;
        project.lastUpdated = block.timestamp;

        emit ProjectRemovedFromCampaign(_projectId, _campaignId);
    }

    /**
     * @notice Update project stats (called by other modules)
     */
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

    /**
     * @notice Add project owner
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
     * @notice Remove project owner
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
     * @notice Add project tag
     */
    function addProjectTag(uint256 _projectId, string memory _tag) external onlyProjectOwner(_projectId) {
        // This function is no longer needed as tags are stored in metadata.json
        // Keeping it for now, but it will not modify the metadata.tags array.
        // If the intent was to add tags to the metadata, this function would need to be updated.
        // For now, it's a placeholder.
        // require(!projectHasTag[_projectId][_tag], "ProjectsModule: Tag already exists");
        
        // projects[_projectId].metadata.tags.push(_tag);
        // projectHasTag[_projectId][_tag] = true;
        // projectsByTag[_tag].push(_projectId);
        projects[_projectId].lastUpdated = block.timestamp;
        
        // emit ProjectTagAdded(_projectId, _tag);
    }
    
    /**
     * @notice Remove project tag
     */
    function removeProjectTag(uint256 _projectId, string memory _tag) external onlyProjectOwner(_projectId) {
        // This function is no longer needed as tags are stored in metadata.json
        // Keeping it for now, but it will not modify the metadata.tags array.
        // If the intent was to remove tags from the metadata, this function would need to be updated.
        // For now, it's a placeholder.
        // require(projectHasTag[_projectId][_tag], "ProjectsModule: Tag does not exist");
        
        // // Remove from project tags array
        // string[] storage tags = projects[_projectId].metadata.tags;
        // for (uint256 i = 0; i < tags.length; i++) {
        //     if (keccak256(bytes(tags[i])) == keccak256(bytes(_tag))) {
        //         tags[i] = tags[tags.length - 1];
        //         tags.pop();
        //         break;
        //     }
        // }
        
        // projectHasTag[_projectId][_tag] = false;
        projects[_projectId].lastUpdated = block.timestamp;
        
        // emit ProjectTagRemoved(_projectId, _tag);
    }

    // ==================== VIEW FUNCTIONS ====================

    /**
     * @notice Get project information
     */
    function getProject(uint256 _projectId) external view projectExists(_projectId) returns (
        address owner,
        string memory name,
        string memory description,
        ProjectStatus status,
        bool active,
        uint256 createdAt,
        uint256 updatedAt
    ) {
        Project storage project = projects[_projectId];
        return (
            project.owner,
            project.name,
            project.description,
            project.status,
            project.active,
            project.createdAt,
            project.updatedAt
        );
    }

    /**
     * @notice Get project with pool status from PoolsModule
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
        
        try sovereignSeasProxy.callModule("pools", abi.encodeWithSignature("getProjectPoolStatus(uint256)", _projectId)) returns (bytes memory poolData) {
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

    /**
     * @notice Get project metadata
     */
    function getProjectMetadata(uint256 _projectId) external view projectExists(_projectId) returns (ProjectMetadata memory metadata) {
        return projects[_projectId].metadata;
    }

    /**
     * @notice Get projects by owner
     */
    function getProjectsByOwner(address _owner) external view returns (uint256[] memory) {
        return projectsByOwner[_owner];
    }

    /**
     * @notice Get projects by category
     */
    function getProjectsByCategory(string calldata _category) external view returns (uint256[] memory) {
        return projectsByCategory[_category];
    }

    /**
     * @notice Get projects by tag
     */
    function getProjectsByTag(string calldata _tag) external view returns (uint256[] memory) {
        // This function is no longer needed as tags are stored in metadata.json
        // Keeping it for now, but it will return an empty array.
        return new uint256[](0);
    }

    /**
     * @notice Get projects by status
     */
    function getProjectsByStatus(ProjectStatus _status) external view returns (uint256[] memory) {
        return projectsByStatus[_status];
    }

    /**
     * @notice Get project count
     */
    function getProjectCount() external view returns (uint256) {
        return totalProjects;
    }

    /**
     * @notice Check if address is project owner
     */
    function isProjectOwner(uint256 _projectId, address _owner) external view returns (bool) {
        return projects[_projectId].owners[_owner] || projects[_projectId].owner == _owner;
    }
    
    /**
     * @notice Get all project owners
     */
    function getProjectOwners(uint256 _projectId) external view returns (address[] memory) {
        return projects[_projectId].ownerList;
    }

    /**
     * @notice Search projects by name (partial match)
     */
    function searchProjects(string calldata _query) external view returns (uint256[] memory) {
        uint256[] memory results = new uint256[](totalProjects);
        uint256 resultCount = 0;
        
        for (uint256 i = 1; i < nextProjectId; i++) {
            if (projects[i].id != 0) {
                if (_containsString(projects[i].name, _query) || _containsString(projects[i].description, _query)) {
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
     * @notice Search projects by name with case insensitive matching
     */
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

    /**
     * @notice Get all project IDs
     */
    function getAllProjectIds() external view returns (uint256[] memory) {
        return projectIds;
    }

    /**
     * @notice Get active projects
     */
    function getActiveProjects() external view returns (uint256[] memory) {
        uint256[] memory results = new uint256[](activeProjects);
        uint256 count = 0;
        
        for (uint256 i = 0; i < projectIds.length; i++) {
            uint256 projectId = projectIds[i];
            if (projects[projectId].active) {
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

    // ==================== V4 MIGRATION FUNCTIONS ====================

    /**
     * @notice Create project from V4 data (enhanced version)
     */
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
        uint256 _createdAt,
        string memory _category
    ) external onlyMainContract returns (uint256) {
        require(_v4ProjectId >= 0, "ProjectsModule: Invalid V4 project ID");
        require(_owner != address(0), "ProjectsModule: Invalid owner address");
        require(bytes(_name).length > 0, "ProjectsModule: Name cannot be empty");
        
        uint256 projectId = nextProjectId++;
        
        Project storage project = projects[projectId];
        project.id = projectId;
        project.owner = _owner;
        project.owners[_owner] = true;
        project.ownerList.push(_owner);
        project.name = _name;
        project.description = _description;
        project.metadata.bio = _bio;
        project.metadata.contractInfo = _contractInfo;
        project.metadata.additionalData = _additionalData;
        project.metadata.category = _category;
        project.contracts = _contracts;
        project.transferrable = _transferrable;
        project.active = _active;
        project.createdAt = _createdAt > 0 ? _createdAt : block.timestamp;
        project.updatedAt = block.timestamp;
        project.lastUpdated = block.timestamp;
        project.status = ProjectStatus.PENDING;
        
        // Add to indexes
        projectIds.push(projectId);
        projectsByOwner[_owner].push(projectId);
        projectsByStatus[ProjectStatus.PENDING].push(projectId);

        // Add to category
        if (bytes(_category).length > 0) {
            projectsByCategory[_category].push(projectId);
        }

        totalProjects++;
        if (_active) activeProjects++;
        
        emit ProjectCreatedFromV4(projectId, _owner, _name, _v4ProjectId);
        return projectId;
    }



    // ==================== INTERNAL HELPER FUNCTIONS ====================

    /**
     * @notice Remove project from owner's project list
     */
    function _removeFromOwnerProjects(address _owner, uint256 _projectId) internal {
        uint256[] storage ownerProjects = projectsByOwner[_owner];
        for (uint256 i = 0; i < ownerProjects.length; i++) {
            if (ownerProjects[i] == _projectId) {
                ownerProjects[i] = ownerProjects[ownerProjects.length - 1];
                ownerProjects.pop();
                break;
            }
        }
    }

    /**
     * @notice Remove project from category
     */
    function _removeFromCategory(uint256 _projectId, string memory _category) internal {
        uint256[] storage categoryProjects = projectsByCategory[_category];
        for (uint256 i = 0; i < categoryProjects.length; i++) {
            if (categoryProjects[i] == _projectId) {
                categoryProjects[i] = categoryProjects[categoryProjects.length - 1];
                categoryProjects.pop();
                break;
            }
        }
    }

    /**
     * @notice Remove project from tag
     */
    function _removeFromTag(uint256 _projectId, string memory _tag) internal {
        // This function is no longer needed as tags are stored in metadata.json
        // Keeping it for now, but it will not modify the metadata.tags array.
        // If the intent was to remove tags from the metadata, this function would need to be updated.
        // For now, it's a placeholder.
        // uint256[] storage tagProjects = projectsByTag[_tag];
        // for (uint256 i = 0; i < tagProjects.length; i++) {
        //     if (tagProjects[i] == _projectId) {
        //         tagProjects[i] = tagProjects[tagProjects.length - 1];
        //         tagProjects.pop();
        //         break;
        //     }
        // }
    }

    /**
     * @notice Remove project from status array
     */
    function _removeProjectFromStatus(ProjectStatus _status, uint256 _projectId) internal {
        uint256[] storage statusProjects = projectsByStatus[_status];
        for (uint256 i = 0; i < statusProjects.length; i++) {
            if (statusProjects[i] == _projectId) {
                statusProjects[i] = statusProjects[statusProjects.length - 1];
                statusProjects.pop();
                break;
            }
        }
    }

    /**
     * @notice Check if string contains substring (case sensitive)
     */
    function _containsString(string memory _source, string memory _query) internal pure returns (bool) {
        bytes memory sourceBytes = bytes(_source);
        bytes memory queryBytes = bytes(_query);
        
        if (queryBytes.length == 0) return true;
        if (sourceBytes.length < queryBytes.length) return false;
        
        for (uint256 i = 0; i <= sourceBytes.length - queryBytes.length; i++) {
            bool found = true;
            for (uint256 j = 0; j < queryBytes.length; j++) {
                if (sourceBytes[i + j] != queryBytes[j]) {
                    found = false;
                    break;
                }
            }
            if (found) return true;
        }
        return false;
    }

    /**
     * @notice Check if string contains substring (case insensitive)
     */
    function _containsIgnoreCase(string memory _source, string memory _query) internal pure returns (bool) {
        bytes memory sourceBytes = bytes(_toLower(_source));
        bytes memory queryBytes = bytes(_toLower(_query));
        
        if (queryBytes.length == 0) return true;
        if (sourceBytes.length < queryBytes.length) return false;
        
        for (uint256 i = 0; i <= sourceBytes.length - queryBytes.length; i++) {
            bool found = true;
            for (uint256 j = 0; j < queryBytes.length; j++) {
                if (sourceBytes[i + j] != queryBytes[j]) {
                    found = false;
                    break;
                }
            }
            if (found) return true;
        }
        return false;
    }

    /**
     * @notice Convert string to lowercase
     */
    function _toLower(string memory _str) internal pure returns (string memory) {
        bytes memory strBytes = bytes(_str);
        bytes memory lowerBytes = new bytes(strBytes.length);
        
        for (uint256 i = 0; i < strBytes.length; i++) {
            if (strBytes[i] >= 0x41 && strBytes[i] <= 0x5A) {
                // Convert A-Z to a-z
                lowerBytes[i] = bytes1(uint8(strBytes[i]) + 32);
            } else {
                lowerBytes[i] = strBytes[i];
            }
        }
        
        return string(lowerBytes);
    }

    /**
     * @notice Transfer creation fee to treasury module
     */
    function _transferCreationFeeToTreasury() internal {
        uint256 feeAmount = 0.5 ether;
        
        // Get treasury module address
        address treasuryModule = sovereignSeasProxy.getModuleAddress("treasury");
        require(treasuryModule != address(0), "ProjectsModule: Treasury module not found");
        
        // Call treasury module directly with CELO value
        bytes memory treasuryData = abi.encodeWithSignature(
            "collectFee(address,uint256,string)",
            msg.sender,
            feeAmount,
            "project_creation"
        );
        
        (bool success, ) = treasuryModule.call{value: feeAmount}(treasuryData);
        if (!success) {
            // If treasury module fails, keep the fee in this contract
            // It can be collected later by admin
        }
    }

    /**
     * @notice Authorize upgrade (required by UUPSUpgradeable)
     */
    function _authorizeUpgrade(address newImplementation) internal override {
        // Only proxy can upgrade modules
        require(msg.sender == address(sovereignSeasProxy), "ProjectsModule: Only proxy can upgrade");
    }

    /**
     * @notice Emergency pause function
     */
    function emergencyPause() external {
        // Check if caller has emergency role through proxy
        require(_isEmergency(msg.sender), "ProjectsModule: Emergency role required");
        modulePaused = true;
    }

    /**
     * @notice Emergency unpause function
     */
    function emergencyUnpause() external {
        // Check if caller has emergency role through proxy
        require(_isEmergency(msg.sender), "ProjectsModule: Emergency role required");
        modulePaused = false;
    }

    // ==================== PROJECT PARTICIPATION SYSTEM ====================

    /**
     * @notice Request project participation in campaign
     * @param _projectId The project ID
     * @param _campaignId The campaign ID
     */
    function requestCampaignParticipation(uint256 _projectId, uint256 _campaignId) external onlyProjectOwner(_projectId) whenActive {
        require(projects[_projectId].status == ProjectStatus.VERIFIED, "ProjectsModule: Project must be verified");
        
        // Call CampaignsModule to request participation
        bytes memory participationData = abi.encodeWithSignature(
            "requestProjectParticipation(uint256,uint256)",
            _campaignId,
            _projectId
        );
        
        sovereignSeasProxy.callModule("campaigns", participationData);
    }

    /**
     * @notice Approve project participation (called by campaign admin or contract admin)
     * @param _projectId The project ID
     * @param _campaignId The campaign ID
     * @param _approved Whether to approve or deny
     */
    function approveProjectParticipation(uint256 _projectId, uint256 _campaignId, bool _approved) external {
        // Check if caller is campaign admin or contract admin
        bytes memory adminCheckData = abi.encodeWithSignature(
            "isCampaignAdminOrContractAdmin(uint256,address)",
            _campaignId,
            msg.sender
        );
        
        bytes memory result = sovereignSeasProxy.callModule("campaigns", adminCheckData);
        bool isAuthorized = abi.decode(result, (bool));
        require(isAuthorized, "ProjectsModule: Not authorized to approve participation");
        
        // Only verified projects can be approved for participation
        require(projects[_projectId].status == ProjectStatus.VERIFIED, "ProjectsModule: Project must be verified");
        
        if (_approved) {
            // Add project to campaign
            projects[_projectId].campaignIds.push(_campaignId);
            projects[_projectId].campaignParticipation[_campaignId] = true;
            projects[_projectId].lastUpdated = block.timestamp;
            
            emit ProjectAddedToCampaign(_projectId, _campaignId);
        }
        
        // Call CampaignsModule to finalize approval
        bytes memory approvalData = abi.encodeWithSignature(
            "finalizeProjectParticipationApproval(uint256,uint256,bool)",
            _campaignId,
            _projectId,
            _approved
        );
        
        sovereignSeasProxy.callModule("campaigns", approvalData);
    }

    /**
     * @notice Set project verification status (only contract admin)
     * @param _projectId The project ID
     * @param _verified Whether project is officially verified
     */
    function setProjectVerification(uint256 _projectId, bool _verified) external projectExists(_projectId) {
        // Check if caller has admin role through proxy
        require(_isAdmin(msg.sender), "ProjectsModule: Admin role required");
        projects[_projectId].verified = _verified;
        
        if (_verified) {
            projects[_projectId].status = ProjectStatus.VERIFIED;
            verifiedProjects++;
            verifiedOwners[projects[_projectId].owner] = true;
        } else {
            if (projects[_projectId].status == ProjectStatus.VERIFIED) {
                verifiedProjects--;
            }
            projects[_projectId].status = ProjectStatus.PENDING;
        }
        
        projects[_projectId].lastUpdated = block.timestamp;
        emit ProjectVerified(_projectId, msg.sender);
    }

    /**
     * @notice Suspend project (only contract admin) - projects are only denied if flagged/suspended/deleted
     * @param _projectId The project ID
     * @param _reason Reason for suspension
     */
    function suspendProject(uint256 _projectId, string memory _reason) external projectExists(_projectId) {
        // Check if caller has admin role through proxy
        require(_isAdmin(msg.sender), "ProjectsModule: Admin role required");
        ProjectStatus oldStatus = projects[_projectId].status;
        projects[_projectId].status = ProjectStatus.SUSPENDED;
        projects[_projectId].active = false;
        projects[_projectId].lastUpdated = block.timestamp;
        
        if (oldStatus == ProjectStatus.VERIFIED) {
            verifiedProjects--;
        }
        activeProjects--;
        
        emit ProjectStatusChanged(_projectId, oldStatus, ProjectStatus.SUSPENDED);
    }

    /**
     * @notice Flag project for review (only contract admin)
     * @param _projectId The project ID
     * @param _reason Reason for flagging
     */
    function flagProject(uint256 _projectId, string memory _reason) external projectExists(_projectId) {
        // Check if caller has admin role through proxy
        require(_isAdmin(msg.sender), "ProjectsModule: Admin role required");
        ProjectStatus oldStatus = projects[_projectId].status;
        projects[_projectId].status = ProjectStatus.FLAGGED;
        projects[_projectId].lastUpdated = block.timestamp;
        
        emit ProjectStatusChanged(_projectId, oldStatus, ProjectStatus.FLAGGED);
    }

    /**
     * @notice Remove votes from project (only super admin)
     * @param _projectId The project ID
     * @param _campaignId The campaign ID
     */
    function removeProjectVotes(uint256 _projectId, uint256 _campaignId) external {
        // Check if caller has admin role through proxy
        require(_isAdmin(msg.sender), "ProjectsModule: Admin role required");
        // Call VotingModule to remove all votes for this project in this campaign
        bytes memory removeVotesData = abi.encodeWithSignature(
            "removeAllProjectVotes(uint256,uint256)",
            _campaignId,
            _projectId
        );
        
        sovereignSeasProxy.callModule("voting", removeVotesData);
    }

    /**
     * @notice Check if project can participate in campaigns
     * @param _projectId The project ID
     * @return canParticipate Whether project can participate
     */
    function canProjectParticipate(uint256 _projectId) external view projectExists(_projectId) returns (bool canParticipate) {
        Project storage project = projects[_projectId];
        
        // Project can participate if:
        // 1. It's verified OR pending (not flagged/suspended/archived)
        // 2. It's active
        // 3. Owner is not banned
        
        canParticipate = (
            (project.status == ProjectStatus.VERIFIED || project.status == ProjectStatus.PENDING) &&
            project.active &&
            project.owner != address(0)
        );
        
        return canParticipate;
    }

    /**
     * @notice Get project participation status in campaign
     * @param _projectId The project ID
     * @param _campaignId The campaign ID
     * @return isParticipating Whether project is participating
     * @return approvalStatus Approval status
     */
    function getProjectParticipationStatus(uint256 _projectId, uint256 _campaignId) external view projectExists(_projectId) returns (
        bool isParticipating,
        string memory approvalStatus
    ) {
        isParticipating = projects[_projectId].campaignParticipation[_campaignId];
        
        if (isParticipating) {
            if (projects[_projectId].status == ProjectStatus.VERIFIED) {
                approvalStatus = "approved_verified";
            } else {
                approvalStatus = "approved_pending";
            }
        } else {
            if (projects[_projectId].status == ProjectStatus.FLAGGED) {
                approvalStatus = "denied_flagged";
            } else if (projects[_projectId].status == ProjectStatus.SUSPENDED) {
                approvalStatus = "denied_suspended";
            } else if (!projects[_projectId].active) {
                approvalStatus = "denied_inactive";
            } else {
                approvalStatus = "not_requested";
            }
        }
        
        return (isParticipating, approvalStatus);
    }

    // ==================== MIGRATION SUPPORT FUNCTIONS ====================

    /**
     * @notice Create project from V4 migration with category support
     * @param _v4ProjectId V4 project ID for reference
     * @param _owner Project owner address
     * @param _name Project name
     * @param _description Project description
     * @param _bio Project bio
     * @param _contractInfo Contract information
     * @param _additionalData Additional project data
     * @param _contracts Array of contract addresses
     * @param _transferrable Whether project is transferrable
     * @param _active Whether project is active
     * @param _createdAt Creation timestamp
     * @param _category Project category
     * @return The new V5 project ID
     */
    function createProjectFromV4Migration(
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
        uint256 _createdAt,
        string memory _category
    ) external onlyMainContract returns (uint256) {
        require(_owner != address(0), "ProjectsModule: Invalid owner address");
        require(bytes(_name).length > 0, "ProjectsModule: Name cannot be empty");
        
        uint256 projectId = nextProjectId++;
        
        Project storage project = projects[projectId];
        project.id = projectId;
        project.owner = _owner;
        project.owners[_owner] = true;
        project.ownerList.push(_owner);
        project.name = _name;
        project.description = _description;
        project.metadata.bio = _bio;
        project.metadata.contractInfo = _contractInfo;
        project.metadata.additionalData = _additionalData;
        project.metadata.category = _category;
        project.contracts = _contracts;
        project.transferrable = _transferrable;
        project.active = _active;
        project.createdAt = _createdAt > 0 ? _createdAt : block.timestamp;
        project.updatedAt = block.timestamp;
        project.lastUpdated = block.timestamp;
        project.status = ProjectStatus.PENDING; // Migrated projects start as pending
        
        // Add to indexes
        projectIds.push(projectId);
        projectsByOwner[_owner].push(projectId);
        projectsByStatus[ProjectStatus.PENDING].push(projectId);

        // Add to category
        if (bytes(_category).length > 0) {
            projectsByCategory[_category].push(projectId);
        }

        totalProjects++;
        if (_active) activeProjects++;
        
        // NO FEE FOR MIGRATION
        emit ProjectCreatedFromV4(projectId, _owner, _name, _v4ProjectId);
        return projectId;
    }

    /**
     * @notice Set project campaign participation from V4 migration
     * @param _projectId V5 project ID
     * @param _campaignIds Array of V4 campaign IDs (will be mapped to V5)
     */
    function setProjectCampaignParticipationFromV4(
        uint256 _projectId,
        uint256[] memory _campaignIds
    ) external onlyMainContract projectExists(_projectId) {
        Project storage project = projects[_projectId];
        
        // Note: Campaign IDs need to be mapped from V4 to V5 by the migration module
        // This function assumes the mapping has already been done
        for (uint256 i = 0; i < _campaignIds.length; i++) {
            uint256 campaignId = _campaignIds[i];
            if (!project.campaignParticipation[campaignId]) {
                project.campaignIds.push(campaignId);
                project.campaignParticipation[campaignId] = true;
            }
        }
        
        project.lastUpdated = block.timestamp;
    }

    // ==================== ADMIN FUNCTIONS ====================

    /**
     * @notice Update project creation fee (admin only)
     */
    function updateProjectCreationFee(uint256 _newFee) external {
        require(_isAdmin(msg.sender), "ProjectsModule: Admin role required");
        require(_newFee >= 0, "ProjectsModule: Fee cannot be negative");
        
        uint256 oldFee = projectCreationFee;
        projectCreationFee = _newFee;
        
        emit ProjectCreationFeeUpdated(oldFee, _newFee, msg.sender);
    }

    /**
     * @notice Update project creation fee token (admin only)
     */
    function updateProjectCreationFeeToken(address _newToken) external {
        require(_isAdmin(msg.sender), "ProjectsModule: Admin role required");
        require(_newToken != address(0), "ProjectsModule: Invalid token address");
        
        address oldToken = projectCreationFeeToken;
        projectCreationFeeToken = _newToken;
        
        emit ProjectCreationFeeTokenUpdated(oldToken, _newToken, msg.sender);
    }

    /**
     * @notice Toggle project creation fees (admin only)
     */
    function toggleProjectCreationFees(bool _feesEnabled) external {
        require(_isAdmin(msg.sender), "ProjectsModule: Admin role required");
        
        bool oldFeesEnabled = feesEnabled;
        feesEnabled = _feesEnabled;
        
        emit ProjectFeesToggled(_feesEnabled, msg.sender);
    }

    /**
     * @notice Set project creation fee to zero for testing (admin only)
     */
    function setZeroProjectCreationFeeForTesting() external {
        require(_isAdmin(msg.sender), "ProjectsModule: Admin role required");
        
        uint256 oldFee = projectCreationFee;
        projectCreationFee = 0;
        
        emit ProjectCreationFeeUpdated(oldFee, 0, msg.sender);
    }

    /**
     * @notice Set project creation fee to 0.1 CELO for testing (admin only)
     */
    function setTestProjectCreationFee() external {
        require(_isAdmin(msg.sender), "ProjectsModule: Admin role required");
        
        uint256 oldFee = projectCreationFee;
        projectCreationFee = 0.1e18; // 0.1 CELO
        
        emit ProjectCreationFeeUpdated(oldFee, projectCreationFee, msg.sender);
    }
}