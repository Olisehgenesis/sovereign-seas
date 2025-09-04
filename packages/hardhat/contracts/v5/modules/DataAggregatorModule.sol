// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../base/BaseModule.sol";
import "../interfaces/IV4Reader.sol";

/**
 * @title DataAggregatorModule - V5 Data Aggregator with Smart ID Management
 * @notice Single source of truth for all data queries, handling V4/V5 resolution seamlessly
 * @dev This contract aggregates data from both V4 and V5, provides smart ID management,
 *      and handles migration data tracking with status codes
 */
contract DataAggregatorModule is BaseModule {
    
    // ==================== V4 CONTRACT INTEGRATION ====================
    
    // V4 Contract Reference
    IV4Reader public v4Reader;
    address public v4ContractAddress;
    bool public v4IntegrationEnabled;
    
    // Smart ID Management
    uint256 public v5ProjectIdStart = 100; // V5 projects start from 100
    uint256 public v5CampaignIdStart = 100; // V5 campaigns start from 100
    uint256 public v4MaxProjectId; // Highest project ID used in V4
    uint256 public v4MaxCampaignId; // Highest campaign ID used in V4
    
    // Migration Status Enum
    enum MigrationStatus {
        V4_ONLY,        // 0: Project exists only in V4
        MIGRATED,       // 1: Project migrated from V4 to V5
        V5_ONLY         // 2: Project created directly in V5
    }
    
    // Migration Data Structure
    struct MigrationData {
        MigrationStatus status;
        uint256 v4Id;           // Original V4 ID (if applicable)
        uint256 v5Id;           // V5 ID (if applicable)
        address migratedBy;     // Who performed the migration
        uint256 migratedAt;     // When migration occurred
        address newAdmin;       // New admin for migrated projects (if different)
    }
    
    // ==================== DATA STRUCTURES ====================
    
    struct ProjectResponse {
        bool isV4;                    // True if project exists in V4
        bool isV5;                    // True if project exists in V5
        uint256 id;
        address owner;
        string name;
        string description;
        string bio;
        string contractInfo;
        string additionalData;
        string category;
        address[] contracts;
        bool transferrable;
        bool active;
        uint256 createdAt;
        uint256 updatedAt;
        uint256 totalFundsRaised;     // V5 only, 0 for V4
        uint256 totalVotesReceived;   // V5 only, 0 for V4
        bool verified;                // V5 only, false for V4
        string[] tags;                // V5 only, empty for V4
        bool canUpgradeToV5;          // True if V4 project can be upgraded
        MigrationData migrationData;  // Migration status and data
    }
    
    struct CampaignResponse {
        bool isV4;                    // True if campaign exists in V4
        bool isV5;                    // True if campaign exists in V5
        uint256 id;
        address admin;
        string name;
        string description;
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
        uint256 totalParticipants;
        uint256 pools;                // V5 only, 0 for V4
        bool canUpgradeToV5;          // True if V4 campaign can be upgraded
        MigrationData migrationData;  // Migration status and data
    }
    
    struct ParticipationResponse {
        bool isV4;                    // True if participation is from V4
        bool isV5;                    // True if participation is from V5
        uint256 campaignId;
        uint256 projectId;
        address user;
        uint256 totalVotes;
        uint256 totalVotingPower;
        uint256 fundsContributed;
        bool active;
        uint256 lastVoteTime;
        uint256[] poolStakes;         // V5 only, empty for V4
    }
    
    struct PoolResponse {
        bool isV5;                    // Always true, pools are V5 only
        uint256 id;
        address creator;
        string name;
        string description;
        address token;
        uint256 totalLiquidity;
        uint256 totalStaked;
        uint256 apy;
        bool active;
        uint256 createdAt;
        uint256[] associatedProjects;
    }
    
    // ==================== STATE VARIABLES ====================
    
    // Migration tracking
    mapping(uint256 => MigrationData) public projectMigrationData;
    mapping(uint256 => MigrationData) public campaignMigrationData;
    mapping(uint256 => uint256) public v4ToV5ProjectMapping;
    mapping(uint256 => uint256) public v5ToV4ProjectMapping;
    mapping(uint256 => uint256) public v4ToV5CampaignMapping;
    mapping(uint256 => uint256) public v5ToV4CampaignMapping;
    
    // Statistics
    uint256 public totalV4Projects;
    uint256 public totalV5Projects;
    uint256 public totalV4Campaigns;
    uint256 public totalV5Campaigns;
    uint256 public totalMigratedProjects;
    uint256 public totalMigratedCampaigns;
    
    // ==================== EVENTS ====================
    
    event V4IntegrationEnabled(address indexed v4Contract);
    event V4IntegrationDisabled();
    event ProjectMigratedToV5(uint256 indexed projectId, address indexed owner, address indexed newAdmin);
    event CampaignMigratedToV5(uint256 indexed campaignId, address indexed admin, address indexed newAdmin);
    event DataAggregated(uint256 indexed id, string dataType, bool v4Exists, bool v5Exists);
    event SmartIdGenerated(uint256 indexed id, string dataType, bool isV5);
    event V4MaxIdsUpdated(uint256 maxProjectId, uint256 maxCampaignId);
    
    // ==================== INITIALIZATION ====================
    
    function initialize(address _proxy, bytes calldata _data) external override initializer {
        require(_proxy != address(0), "DataAggregator: Invalid proxy address");
        
        sovereignSeasProxy = ISovereignSeasV5(_proxy);
        moduleActive = true;

        // Initialize inherited contracts
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        moduleName = "Data Aggregator Module";
        moduleDescription = "Aggregates data from V4 and V5 systems with smart ID management";
        moduleDependencies = new string[](2);
        moduleDependencies[0] = "projects";
        moduleDependencies[1] = "campaigns";
        
        v4IntegrationEnabled = false;
        v4MaxProjectId = 0;
        v4MaxCampaignId = 0;
        totalV4Projects = 0;
        totalV5Projects = 0;
        totalV4Campaigns = 0;
        totalV5Campaigns = 0;
        totalMigratedProjects = 0;
        totalMigratedCampaigns = 0;
        
        emit ModuleInitialized(getModuleId(), _proxy);
    }
    
    // ==================== V4 INTEGRATION ====================
    
    /**
     * @notice Enable V4 integration
     * @param _v4ContractAddress Address of the V4 contract
     */
    function enableV4Integration(address _v4ContractAddress) external onlyMainContract {
        require(_v4ContractAddress != address(0), "DataAggregator: Invalid V4 contract address");
        
        v4Reader = IV4Reader(_v4ContractAddress);
        v4ContractAddress = _v4ContractAddress;
        v4IntegrationEnabled = true;
        
        // Count V4 projects and campaigns and get max IDs
        _countV4Data();
        
        emit V4IntegrationEnabled(_v4ContractAddress);
    }
    
    /**
     * @notice Disable V4 integration
     */
    function disableV4Integration() external onlyMainContract {
        v4IntegrationEnabled = false;
        v4ContractAddress = address(0);
        v4Reader = IV4Reader(address(0));
        
        emit V4IntegrationDisabled();
    }
    
    /**
     * @notice Count V4 data and get max IDs
     */
    function _countV4Data() internal {
        if (!v4IntegrationEnabled || address(v4Reader) == address(0)) {
            return;
        }
        
        try v4Reader.nextProjectId() returns (uint256 v4ProjectCount) {
            totalV4Projects = v4ProjectCount;
        } catch {
            totalV4Projects = 0;
        }
        
        try v4Reader.nextCampaignId() returns (uint256 v4CampaignCount) {
            totalV4Campaigns = v4CampaignCount;
        } catch {
            totalV4Campaigns = 0;
        }
        
        // Get max used IDs
        try v4Reader.getMaxUsedProjectId() returns (uint256 maxProjectId) {
            v4MaxProjectId = maxProjectId;
        } catch {
            v4MaxProjectId = 0;
        }
        
        try v4Reader.getMaxUsedCampaignId() returns (uint256 maxCampaignId) {
            v4MaxCampaignId = maxCampaignId;
        } catch {
            v4MaxCampaignId = 0;
        }
        
        emit V4MaxIdsUpdated(v4MaxProjectId, v4MaxCampaignId);
    }
    
    // ==================== SMART ID MANAGEMENT ====================
    
    /**
     * @notice Generate next available V5 project ID
     * @return nextId The next available V5 project ID
     */
    function generateNextV5ProjectId() external view returns (uint256 nextId) {
        require(v4IntegrationEnabled, "DataAggregator: V4 integration not enabled");
        
        // Start from v5ProjectIdStart (100) and find next available ID
        nextId = v5ProjectIdStart;
        
        // Check if ID conflicts with V4
        while (nextId <= v4MaxProjectId) {
            nextId++;
        }
        
        // Check if ID is already used in V5 (would need to query ProjectsModule)
        // For now, assume it's available
        return nextId;
    }
    
    /**
     * @notice Generate next available V5 campaign ID
     * @return nextId The next available V5 campaign ID
     */
    function generateNextV5CampaignId() external view returns (uint256 nextId) {
        require(v4IntegrationEnabled, "DataAggregator: V4 integration not enabled");
        
        // Start from v5CampaignIdStart (100) and find next available ID
        nextId = v5CampaignIdStart;
        
        // Check if ID conflicts with V4
        while (nextId <= v4MaxCampaignId) {
            nextId++;
        }
        
        // Check if ID is already used in V5 (would need to query CampaignsModule)
        // For now, assume it's available
        return nextId;
    }
    
    /**
     * @notice Check if project ID is available for V5
     * @param _projectId Project ID to check
     * @return available True if ID is available for V5
     */
    function isProjectIdAvailableForV5(uint256 _projectId) external view returns (bool available) {
        if (!v4IntegrationEnabled) {
            return true; // If no V4 integration, all IDs are available
        }
        
        // Check if ID exists in V4
        try v4Reader.projectExists(_projectId) returns (bool v4Exists) {
            if (v4Exists) {
                return false; // ID exists in V4
            }
        } catch {
            // V4 not available, assume available
        }
        
        // Check if ID is already migrated
        if (projectMigrationData[_projectId].status == MigrationStatus.MIGRATED) {
            return false; // Already migrated
        }
        
        return true;
    }
    
    /**
     * @notice Check if campaign ID is available for V5
     * @param _campaignId Campaign ID to check
     * @return available True if ID is available for V5
     */
    function isCampaignIdAvailableForV5(uint256 _campaignId) external view returns (bool available) {
        if (!v4IntegrationEnabled) {
            return true; // If no V4 integration, all IDs are available
        }
        
        // Check if ID exists in V4
        try v4Reader.campaignExists(_campaignId) returns (bool v4Exists) {
            if (v4Exists) {
                return false; // ID exists in V4
            }
        } catch {
            // V4 not available, assume available
        }
        
        // Check if ID is already migrated
        if (campaignMigrationData[_campaignId].status == MigrationStatus.MIGRATED) {
            return false; // Already migrated
        }
        
        return true;
    }
    
    // ==================== PROJECT DATA AGGREGATION ====================
    
    /**
     * @notice Get project data with smart resolution
     * @param _projectId Project ID
     * @return response Aggregated project response
     */
    function getProjectData(uint256 _projectId) external view returns (ProjectResponse memory response) {
        return _getProjectData(_projectId);
    }
    
    /**
     * @notice Get user votes across V4 and V5
     * @param _user User address
     * @return v4Votes V4 votes data
     * @return v5Votes V5 votes data
     */
    function getUserVotes(address _user) external view returns (
        uint256[] memory v4Votes,
        uint256[] memory v5Votes
    ) {
        // This would aggregate votes from both V4 and V5
        // Implementation depends on voting module interfaces
        v4Votes = new uint256[](0);
        v5Votes = new uint256[](0);
    }
    
    /**
     * @notice Get user participation across V4 and V5
     * @param _user User address
     * @return v4Participation V4 participation data
     * @return v5Participation V5 participation data
     */
    function getUserParticipation(address _user) external view returns (
        ParticipationResponse[] memory v4Participation,
        ParticipationResponse[] memory v5Participation
    ) {
        // This would aggregate participation from both V4 and V5
        // Implementation depends on participation module interfaces
        v4Participation = new ParticipationResponse[](0);
        v5Participation = new ParticipationResponse[](0);
    }
    
    /**
     * @notice Internal function to get project data
     * @param _projectId Project ID
     * @return response Project response
     */
    function _getProjectData(uint256 _projectId) internal view returns (ProjectResponse memory response) {
        response.id = _projectId;
        response.isV4 = false;
        response.isV5 = false;
        response.canUpgradeToV5 = false;
        
        // Get migration data
        response.migrationData = projectMigrationData[_projectId];
        
        // Check V4 first
        if (v4IntegrationEnabled && address(v4Reader) != address(0)) {
            try v4Reader.projectExists(_projectId) returns (bool v4Exists) {
                if (v4Exists) {
                    response.isV4 = true;
                    response.canUpgradeToV5 = response.migrationData.status != MigrationStatus.MIGRATED;
                    
                    // Get V4 project data
                    (
                        uint256 id,
                        address payable owner,
                        string memory name,
                        string memory description,
                        string memory bioPart,
                        string memory contractInfoPart,
                        string memory additionalDataPart,
                        bool transferrable,
                        bool active,
                        uint256 createdAt
                    ) = v4Reader.projects(_projectId);
                    
                    response.owner = owner;
                    response.name = name;
                    response.description = description;
                    response.bio = bioPart;
                    response.contractInfo = contractInfoPart;
                    response.additionalData = additionalDataPart;
                    response.transferrable = transferrable;
                    response.active = active;
                    response.createdAt = createdAt;
                    response.updatedAt = createdAt;
                    
                    // V4 defaults
                    response.category = "";
                    response.contracts = new address[](0);
                    response.totalFundsRaised = 0;
                    response.totalVotesReceived = 0;
                    response.verified = false;
                    response.tags = new string[](0);
                }
            } catch {
                // V4 contract not available
            }
        }
        
        // Check V5 (if not migrated from V4)
        if (!response.isV4 || response.migrationData.status == MigrationStatus.MIGRATED) {
            try this._getV5ProjectData(_projectId) returns (ProjectResponse memory v5Response) {
                if (v5Response.isV5) {
                    response.isV5 = true;
                    
                    // Merge V5 data (V5 takes precedence if both exist)
                    if (!response.isV4) {
                        response.owner = v5Response.owner;
                        response.name = v5Response.name;
                        response.description = v5Response.description;
                        response.bio = v5Response.bio;
                        response.contractInfo = v5Response.contractInfo;
                        response.additionalData = v5Response.additionalData;
                        response.category = v5Response.category;
                        response.contracts = v5Response.contracts;
                        response.transferrable = v5Response.transferrable;
                        response.active = v5Response.active;
                        response.createdAt = v5Response.createdAt;
                        response.updatedAt = v5Response.updatedAt;
                    }
                    
                    // V5 specific fields
                    response.totalFundsRaised = v5Response.totalFundsRaised;
                    response.totalVotesReceived = v5Response.totalVotesReceived;
                    response.verified = v5Response.verified;
                    response.tags = v5Response.tags;
                }
            } catch {
                // V5 project not found
            }
        }
        
        return response;
    }
    
    /**
     * @notice Get V5 project data (external for try-catch)
     * @param _projectId Project ID
     * @return response V5 project response
     */
    function _getV5ProjectData(uint256 _projectId) external view returns (ProjectResponse memory response) {
        // This would call the V5 ProjectsModule
        // For now, return empty response
        response.id = _projectId;
        response.isV5 = false;
        return response;
    }
    
    // ==================== CAMPAIGN DATA AGGREGATION ====================
    
    /**
     * @notice Get campaign data (V4 only for now)
     * @param _campaignId Campaign ID
     * @return response Campaign response
     */
    function getCampaignData(uint256 _campaignId) external view returns (CampaignResponse memory response) {
        return _getCampaignData(_campaignId);
    }
    
    /**
     * @notice Internal function to get campaign data
     * @param _campaignId Campaign ID
     * @return response Campaign response
     */
    function _getCampaignData(uint256 _campaignId) internal view returns (CampaignResponse memory response) {
        response.id = _campaignId;
        response.isV4 = false;
        response.isV5 = false;
        response.canUpgradeToV5 = false;
        
        // Check V4 first
        if (v4IntegrationEnabled && address(v4Reader) != address(0)) {
            try v4Reader.campaignExists(_campaignId) returns (bool v4Exists) {
                if (v4Exists) {
                    response.isV4 = true;
                    // Check if campaign is migrated by querying the migration module
                    response.canUpgradeToV5 = !_isCampaignMigrated(_campaignId);
                    
                    // Get V4 campaign data
                    (
                        uint256 id,
                        address admin,
                        string memory name,
                        string memory description,
                        string memory mainInfo,
                        string memory additionalInfo,
                        uint256 startTime,
                        uint256 endTime,
                        uint256 adminFeePercentage,
                        uint256 maxWinners,
                        bool useQuadraticDistribution,
                        bool useCustomDistribution,
                        string memory customDistributionData,
                        address payoutToken,
                        bool active
                    ) = v4Reader.campaigns(_campaignId);
                    
                    response.admin = admin;
                    response.name = name;
                    response.description = description;
                    response.startTime = startTime;
                    response.endTime = endTime;
                    response.adminFeePercentage = adminFeePercentage;
                    response.maxWinners = maxWinners;
                    response.useQuadraticDistribution = useQuadraticDistribution;
                    response.useCustomDistribution = useCustomDistribution;
                    response.customDistributionData = customDistributionData;
                    response.payoutToken = payoutToken;
                    response.active = active;
                    
                    // V4 defaults
                    response.totalFunds = 0;
                    response.totalParticipants = 0;
                    response.pools = 0;
                }
            } catch {
                // V4 contract not available
            }
        }
        
        // Check V5 (if not migrated from V4)
        if (!response.isV4 || _isCampaignMigrated(_campaignId)) {
            try this._getV5CampaignData(_campaignId) returns (CampaignResponse memory v5Response) {
                if (v5Response.isV5) {
                    response.isV5 = true;
                    
                    // Merge V5 data
                    if (!response.isV4) {
                        response.admin = v5Response.admin;
                        response.name = v5Response.name;
                        response.description = v5Response.description;
                        response.startTime = v5Response.startTime;
                        response.endTime = v5Response.endTime;
                        response.adminFeePercentage = v5Response.adminFeePercentage;
                        response.maxWinners = v5Response.maxWinners;
                        response.useQuadraticDistribution = v5Response.useQuadraticDistribution;
                        response.useCustomDistribution = v5Response.useCustomDistribution;
                        response.customDistributionData = v5Response.customDistributionData;
                        response.payoutToken = v5Response.payoutToken;
                        response.active = v5Response.active;
                    }
                    
                    // V5 specific fields
                    response.totalFunds = v5Response.totalFunds;
                    response.totalParticipants = v5Response.totalParticipants;
                    response.pools = v5Response.pools;
                }
            } catch {
                // V5 campaign not found
            }
        }
        
        return response;
    }
    
    /**
     * @notice Get V5 campaign data (external for try-catch)
     * @param _campaignId Campaign ID
     * @return response V5 campaign response
     */
    function _getV5CampaignData(uint256 _campaignId) external view returns (CampaignResponse memory response) {
        // This would call the V5 CampaignsModule
        // For now, return empty response
        response.id = _campaignId;
        response.isV5 = false;
        return response;
    }
    
    // ==================== MIGRATION FUNCTIONS ====================
    
    /**
     * @notice Admin migrate project from V4 to V5 with new admin
     * @param _projectId Project ID to migrate
     * @param _newAdmin New admin for the migrated project
     */
    function adminMigrateProject(uint256 _projectId, address _newAdmin) external onlyMainContract {
        require(v4IntegrationEnabled, "DataAggregator: V4 integration not enabled");
        require(_newAdmin != address(0), "DataAggregator: Invalid new admin address");
        require(projectMigrationData[_projectId].status != MigrationStatus.MIGRATED, "DataAggregator: Project already migrated");
        
        // Check if project exists in V4
        ProjectResponse memory v4Project = _getProjectData(_projectId);
        require(v4Project.isV4, "DataAggregator: Project not found in V4");
        
        // Update migration data
        projectMigrationData[_projectId] = MigrationData({
            status: MigrationStatus.MIGRATED,
            v4Id: _projectId,
            v5Id: _projectId, // Same ID
            migratedBy: getEffectiveCaller(),
            migratedAt: block.timestamp,
            newAdmin: _newAdmin
        });
        
        totalMigratedProjects++;
        
        // Create V5 project with same ID and new admin
        _createV5ProjectFromV4(_projectId, v4Project, _newAdmin);
        
        emit ProjectMigratedToV5(_projectId, v4Project.owner, _newAdmin);
    }
    
    /**
     * @notice Initialize V5 for a project (migrate from V4) - user initiated
     * @param _projectId Project ID to migrate
     */
    function initializeV5(uint256 _projectId) external {
        require(v4IntegrationEnabled, "DataAggregator: V4 integration not enabled");
        require(projectMigrationData[_projectId].status != MigrationStatus.MIGRATED, "DataAggregator: Project already migrated");
        
        // Check if project exists in V4
        ProjectResponse memory v4Project = _getProjectData(_projectId);
        require(v4Project.isV4, "DataAggregator: Project not found in V4");
        require(v4Project.owner == getEffectiveCaller(), "DataAggregator: Only project owner can migrate");
        
        // Update migration data
        projectMigrationData[_projectId] = MigrationData({
            status: MigrationStatus.MIGRATED,
            v4Id: _projectId,
            v5Id: _projectId, // Same ID
            migratedBy: getEffectiveCaller(),
            migratedAt: block.timestamp,
            newAdmin: v4Project.owner // Keep same admin
        });
        
        totalMigratedProjects++;
        
        // Create V5 project with same ID
        _createV5ProjectFromV4(_projectId, v4Project, v4Project.owner);
        
        emit ProjectMigratedToV5(_projectId, v4Project.owner, v4Project.owner);
    }
    
    /**
     * @notice Create V5 project from V4 data
     * @param _projectId Project ID
     * @param _v4Project V4 project data
     * @param _newAdmin New admin for the project
     */
    function _createV5ProjectFromV4(uint256 _projectId, ProjectResponse memory _v4Project, address _newAdmin) internal {
        // Call the V5 ProjectsModule to create project with same ID
        // This would use the createProjectWithV4Id function from ProjectsModule
        bytes memory callData = abi.encodeWithSignature(
            "createProjectWithV4Id(uint256,address,string,string,(string,string,string,string,string,string,string,string,string,string),address[],bool)",
            _projectId,
            _newAdmin,
            _v4Project.name,
            _v4Project.description,
            _v4Project.bio,
            _v4Project.contractInfo,
            _v4Project.additionalData,
            _v4Project.category,
            _v4Project.contracts,
            _v4Project.transferrable
        );
        
        callModule("projects", callData);
    }
    
    // ==================== UTILITY FUNCTIONS ====================
    
    /**
     * @notice Get migration data for a project
     * @param _projectId Project ID
     * @return migrationData Migration data
     */
    function getProjectMigrationData(uint256 _projectId) external view returns (MigrationData memory migrationData) {
        return projectMigrationData[_projectId];
    }
    
    /**
     * @notice Get migration data for a campaign
     * @param _campaignId Campaign ID
     * @return migrationData Migration data
     */
    function getCampaignMigrationData(uint256 _campaignId) external view returns (MigrationData memory migrationData) {
        return campaignMigrationData[_campaignId];
    }
    
    /**
     * @notice Check if project is V4 only
     * @param _projectId Project ID
     * @return isV4Only True if project exists only in V4
     */
    function isProjectV4Only(uint256 _projectId) external view returns (bool isV4Only) {
        return projectMigrationData[_projectId].status == MigrationStatus.V4_ONLY;
    }
    
    /**
     * @notice Check if project is migrated
     * @param _projectId Project ID
     * @return isMigrated True if project is migrated
     */
    function isProjectMigrated(uint256 _projectId) external view returns (bool isMigrated) {
        return projectMigrationData[_projectId].status == MigrationStatus.MIGRATED;
    }
    
    /**
     * @notice Check if project is V5 only
     * @param _projectId Project ID
     * @return isV5Only True if project exists only in V5
     */
    function isProjectV5Only(uint256 _projectId) external view returns (bool isV5Only) {
        return projectMigrationData[_projectId].status == MigrationStatus.V5_ONLY;
    }
    
    /**
     * @notice Get all V4 project IDs
     * @return v4ProjectIds Array of V4 project IDs
     */
    function getAllV4ProjectIds() external view returns (uint256[] memory v4ProjectIds) {
        if (!v4IntegrationEnabled || address(v4Reader) == address(0)) {
            return new uint256[](0);
        }
        
        try v4Reader.getAllProjectIds() returns (uint256[] memory ids) {
            return ids;
        } catch {
            return new uint256[](0);
        }
    }
    
    /**
     * @notice Get all V4 campaign IDs
     * @return v4CampaignIds Array of V4 campaign IDs
     */
    function getAllV4CampaignIds() external view returns (uint256[] memory v4CampaignIds) {
        if (!v4IntegrationEnabled || address(v4Reader) == address(0)) {
            return new uint256[](0);
        }
        
        try v4Reader.getAllCampaignIds() returns (uint256[] memory ids) {
            return ids;
        } catch {
            return new uint256[](0);
        }
    }
    
    // ==================== INTERNAL HELPER FUNCTIONS ====================
    
    /**
     * @notice Check if campaign is migrated from V4
     * @param _campaignId Campaign ID
     * @return isMigrated Whether campaign is migrated
     */
    function _isCampaignMigrated(uint256 _campaignId) internal view returns (bool isMigrated) {
        // Query migration module to check if campaign is migrated
        try this._queryMigrationModule("isCampaignMigrated", abi.encode(_campaignId)) returns (bytes memory result) {
            isMigrated = abi.decode(result, (bool));
        } catch {
            isMigrated = false;
        }
    }
    
    /**
     * @notice Query migration module for migration status
     * @param _functionName Function name to call
     * @param _data Encoded function parameters
     * @return result Encoded function result
     */
    function _queryMigrationModule(string memory _functionName, bytes memory _data) external view returns (bytes memory result) {
        // This function will be called by the main contract to query migration status
        // The actual implementation will be handled by the main contract
        return abi.encode(false); // Default to not migrated
    }
    
    /**
     * @notice Get module identifier
     * @return Module identifier
     */
    function getModuleId() public pure override returns (string memory) {
        return "dataAggregator";
    }
    
    /**
     * @notice Get module version
     * @return Module version
     */
    function getModuleVersion() public pure override returns (string memory) {
        return "1.0.0";
    }
}
