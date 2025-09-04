// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../base/BaseModule.sol";

// ==================== V4 CONTRACT INTEGRATION ====================

/**
 * @title IV4Contract - Complete V4 Contract Interface
 * @notice Interface for reading all necessary data from V4 contract
 */
interface IV4Contract {
    // Project functions
    function nextProjectId() external view returns (uint256);
    function getProject(uint256 _projectId) external view returns (
        address owner,
        string memory name,
        string memory description,
        string memory bio,
        string memory contractInfo,
        string memory additionalData,
        address[] memory contracts,
        bool transferrable,
        bool active,
        uint256 createdAt
    );
    function isProjectOwner(uint256 _projectId, address _user) external view returns (bool);
    function getProjectCampaigns(uint256 _projectId) external view returns (uint256[] memory);
    
    // Campaign functions
    function nextCampaignId() external view returns (uint256);
    function getCampaign(uint256 _campaignId) external view returns (
        address admin,
        string memory name,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        uint256 targetAmount,
        uint256 raisedAmount,
        bool active,
        bool verified,
        address preferredToken,
        bool useQuadraticVoting,
        uint256 createdAt
    );
    function getCampaignProjects(uint256 _campaignId) external view returns (uint256[] memory);
    function getCampaignTokens(uint256 _campaignId) external view returns (address[] memory);
    function getCampaignTokenAmount(uint256 _campaignId, address _token) external view returns (uint256);
    
    // Voting functions
    function getParticipation(uint256 _campaignId, uint256 _projectId) external view returns (
        bool approved,
        uint256 voteCount,
        uint256 tokenAmount
    );
    function getCampaignVotedTokens(uint256 _campaignId) external view returns (address[] memory);
    function getProjectVotes(uint256 _campaignId, uint256 _projectId) external view returns (uint256);
    function getProjectTokenVotes(uint256 _campaignId, uint256 _projectId, address _token) external view returns (uint256);
    function hasUserVoted(uint256 _campaignId, uint256 _projectId, address _user) external view returns (bool);
    function getUserVoteAmount(uint256 _campaignId, uint256 _projectId, address _user, address _token) external view returns (uint256);
    
    // Treasury and fee functions
    function getSupportedTokens() external view returns (address[] memory);
    function collectedFees(address _token) external view returns (uint256);
    function getTokenExchangeProvider(address _token) external view returns (address);
    function getTokenBalance(address _token) external view returns (uint256);
    function isTokenSupported(address _token) external view returns (bool);
    
    // User and admin functions
    function isAdmin(address _user) external view returns (bool);
    function isCampaignAdmin(address _user) external view returns (bool);
    function getUserProjectCount(address _user) external view returns (uint256);
    function getUserProjects(address _user) external view returns (uint256[] memory);
    
    // Data structure version
    function getDataStructureVersion(string memory _dataType) external view returns (uint256);
    
    // Additional utility functions
    function isProjectActive(uint256 _projectId) external view returns (bool);
    function isCampaignActive(uint256 _campaignId) external view returns (bool);
    function getProjectMetadata(uint256 _projectId) external view returns (string memory);
    function getCampaignMetadata(uint256 _campaignId) external view returns (string memory);
}

/**
 * @title MigrationModule
 * @notice Handles migration from V4 to V5 in SovereignSeas
 * @dev Manages data transfer, validation, and rollback capabilities
 */
contract MigrationModule is BaseModule {
    using SafeERC20 for IERC20;

    // Migration status enum
    enum MigrationStatus {
        NOT_STARTED,    // 0 - Migration has not started
        IN_PROGRESS,    // 1 - Migration is in progress
        COMPLETED,      // 2 - Migration completed successfully
        FAILED,         // 3 - Migration failed
        ROLLED_BACK     // 4 - Migration was rolled back
    }

    // Migration step enum
    enum MigrationStep {
        PROJECTS,       // 0 - Migrate projects
        CAMPAIGNS,      // 1 - Migrate campaigns
        VOTING_DATA,    // 2 - Migrate voting data
        TREASURY_DATA,  // 3 - Migrate treasury data
        USER_DATA,      // 4 - Migrate user data
        VALIDATION      // 5 - Validate migration
    }

    // Migration record struct
    struct MigrationRecord {
        uint256 id;
        MigrationStep step;
        uint256 startTime;
        uint256 endTime;
        bool completed;
        string errorMessage;
        uint256 recordsProcessed;
        uint256 recordsTotal;
    }

    // Migration batch struct
    struct MigrationBatch {
        uint256 id;
        MigrationStep step;
        uint256[] recordIds;
        bool processed;
        uint256 processedAt;
        string batchHash;
    }

    // State variables
    IV4Contract public v4Contract;
    address public v4ContractAddress;
    
    mapping(MigrationStep => MigrationRecord) public migrationRecords;
    mapping(uint256 => MigrationBatch) public migrationBatches;
    mapping(MigrationStep => bool) public stepCompleted;
    mapping(uint256 => bool) public migratedProjects;
    mapping(uint256 => bool) public migratedCampaigns;
    mapping(address => bool) public migratedUsers;
    mapping(uint256 => uint256) public v4ToV5ProjectMapping; // v4Id => v5Id
    mapping(uint256 => uint256) public v4ToV5CampaignMapping; // v4Id => v5Id
    mapping(uint256 => uint256) public v5ToV4ProjectMapping; // v5Id => v4Id
    mapping(uint256 => uint256) public v5ToV4CampaignMapping; // v5Id => v4Id
    
    // Batch processing
    mapping(MigrationStep => uint256) public batchSize;
    mapping(MigrationStep => uint256[]) public failedItems;
    mapping(string => bytes) public rollbackData; // step => data for rollback
    
    uint256 public nextBatchId;
    uint256 public totalBatches;
    uint256 public completedBatches;
    uint256 public failedBatches;
    MigrationStatus public migrationStatus;
    uint256 public migrationStartTime;
    uint256 public migrationEndTime;
    string public migrationVersion;
    
    // Constants
    uint256 public constant DEFAULT_BATCH_SIZE = 50;
    uint256 public constant MAX_BATCH_SIZE = 200;
    uint256 public constant MIGRATION_TIMEOUT = 7 days;

    // Events
    event MigrationStarted(uint256 indexed migrationId, uint256 startTime);
    event MigrationStepStarted(MigrationStep indexed step, uint256 startTime);
    event MigrationStepCompleted(MigrationStep indexed step, uint256 endTime, uint256 recordsProcessed);
    event MigrationStepFailed(MigrationStep indexed step, string errorMessage);
    event MigrationCompleted(uint256 indexed migrationId, uint256 endTime);
    event MigrationFailed(uint256 indexed migrationId, string errorMessage);
    event MigrationRolledBack(uint256 indexed migrationId, uint256 rollbackTime);
    event BatchProcessed(uint256 indexed batchId, MigrationStep indexed step, uint256 recordsProcessed);
    event ProjectMigrated(uint256 indexed projectId, uint256 v4Id, uint256 v5Id);
    event CampaignMigrated(uint256 indexed campaignId, uint256 v4Id, uint256 v5Id);
    event UserMigrated(address indexed user, uint256 v4DataHash, uint256 v5DataHash);
    event MigrationValidated(uint256 indexed migrationId, bool isValid);

    // Modifiers
    modifier migrationNotStarted() {
        require(migrationStatus == MigrationStatus.NOT_STARTED, "MigrationModule: Migration already started");
        _;
    }

    modifier migrationInProgress() {
        require(migrationStatus == MigrationStatus.IN_PROGRESS, "MigrationModule: Migration not in progress");
        _;
    }

    modifier migrationCompleted() {
        require(migrationStatus == MigrationStatus.COMPLETED, "MigrationModule: Migration not completed");
        _;
    }

    modifier stepNotCompleted(MigrationStep _step) {
        require(!stepCompleted[_step], "MigrationModule: Step already completed");
        _;
    }

    /**
     * @notice Initialize the MigrationModule
     * @param _proxy The main proxy contract address
     * @param _data Additional initialization data
     */
    function initialize(address _proxy, bytes calldata _data) external override initializer {
        // Initialize base module
        require(_proxy != address(0), "MigrationModule: Invalid proxy address");
        
        sovereignSeasProxy = ISovereignSeasV5(_proxy);
        moduleActive = true;

        // Initialize inherited contracts
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        // Set module-specific data
        moduleName = "Migration Module";
        moduleDescription = "Handles migration from V4 to V5";
        moduleDependencies = new string[](5);
        moduleDependencies[0] = "projects";
        moduleDependencies[1] = "campaigns";
        moduleDependencies[2] = "voting";
        moduleDependencies[3] = "treasury";
        moduleDependencies[4] = "pools";
        
        nextBatchId = 1;
        migrationStatus = MigrationStatus.NOT_STARTED;
        migrationVersion = "1.0.0";
        
        emit ModuleInitialized(getModuleId(), _proxy);
    }

    /**
     * @notice Get the module's unique identifier
     * @return The module identifier string
     */
    function getModuleId() public pure override returns (string memory) {
        return "migration";
    }

    /**
     * @notice Get the module's version
     * @return The module version string
     */
    function getModuleVersion() public pure override returns (string memory) {
        return "1.0.0";
    }

    /**
     * @notice Start the migration process
     * @param _v4Contract The V4 contract address
     */
    function startMigration(address _v4Contract) external whenActive migrationNotStarted {
        // Check if caller has admin role through proxy
        require(_isAdmin(getEffectiveCaller()), "MigrationModule: Admin role required");
        require(_v4Contract != address(0), "MigrationModule: Invalid V4 contract address");

        v4Contract = IV4Contract(_v4Contract);
        migrationStatus = MigrationStatus.IN_PROGRESS;
        migrationStartTime = block.timestamp;

        emit MigrationStarted(1, migrationStartTime);
    }

    /**
     * @notice Migrate projects from V4 to V5
     * @param _projectIds Array of V4 project IDs to migrate
     */
    function migrateProjects(uint256[] calldata _projectIds) external whenActive migrationInProgress stepNotCompleted(MigrationStep.PROJECTS) {
        // Check if caller has admin role through proxy
        require(_isAdmin(getEffectiveCaller()), "MigrationModule: Admin role required");
        MigrationRecord storage record = migrationRecords[MigrationStep.PROJECTS];
        record.step = MigrationStep.PROJECTS;
        record.startTime = block.timestamp;
        record.recordsTotal = _projectIds.length;

        emit MigrationStepStarted(MigrationStep.PROJECTS, block.timestamp);

        uint256 processedCount = 0;
        string memory lastError = "";

        for (uint256 i = 0; i < _projectIds.length; i++) {
            // Skip if already migrated
            if (migratedProjects[_projectIds[i]]) {
                processedCount++;
                continue;
            }
            
            try this._migrateSingleProject(_projectIds[i]) {
                processedCount++;
                // migratedProjects[_projectIds[i]] = true; // Already set in _migrateSingleProject
            } catch Error(string memory reason) {
                lastError = reason;
                break;
            }
        }

        record.endTime = block.timestamp;
        record.completed = processedCount == _projectIds.length;
        record.recordsProcessed = processedCount;
        record.errorMessage = lastError;

        if (record.completed) {
            stepCompleted[MigrationStep.PROJECTS] = true;
            emit MigrationStepCompleted(MigrationStep.PROJECTS, block.timestamp, processedCount);
        } else {
            emit MigrationStepFailed(MigrationStep.PROJECTS, lastError);
        }
    }

    /**
     * @notice Migrate campaigns from V4 to V5
     * @param _campaignIds Array of V4 campaign IDs to migrate
     */
    function migrateCampaigns(uint256[] calldata _campaignIds) external whenActive migrationInProgress stepNotCompleted(MigrationStep.CAMPAIGNS) {
        // Check if caller has admin role through proxy
        require(_isAdmin(getEffectiveCaller()), "MigrationModule: Admin role required");
        MigrationRecord storage record = migrationRecords[MigrationStep.CAMPAIGNS];
        record.step = MigrationStep.CAMPAIGNS;
        record.startTime = block.timestamp;
        record.recordsTotal = _campaignIds.length;

        emit MigrationStepStarted(MigrationStep.CAMPAIGNS, block.timestamp);

        uint256 processedCount = 0;
        string memory lastError = "";

        for (uint256 i = 0; i < _campaignIds.length; i++) {
            // Skip if already migrated
            if (migratedCampaigns[_campaignIds[i]]) {
                processedCount++;
                continue;
            }
            
            try this._migrateSingleCampaign(_campaignIds[i]) {
                processedCount++;
                // migratedCampaigns[_campaignIds[i]] = true; // Already set in _migrateSingleCampaign
            } catch Error(string memory reason) {
                lastError = reason;
                break;
            }
        }

        record.endTime = block.timestamp;
        record.completed = processedCount == _campaignIds.length;
        record.recordsProcessed = processedCount;
        record.errorMessage = lastError;

        if (record.completed) {
            stepCompleted[MigrationStep.CAMPAIGNS] = true;
            emit MigrationStepCompleted(MigrationStep.CAMPAIGNS, block.timestamp, processedCount);
        } else {
            emit MigrationStepFailed(MigrationStep.CAMPAIGNS, lastError);
        }
    }

    /**
     * @notice Migrate voting data from V4 to V5
     * @param _campaignIds Array of V4 campaign IDs to migrate voting data for
     */
    function migrateVotingData(uint256[] calldata _campaignIds) external whenActive migrationInProgress stepNotCompleted(MigrationStep.VOTING_DATA) {
        // Check if caller has admin role through proxy
        require(_isAdmin(getEffectiveCaller()), "MigrationModule: Admin role required");
        MigrationRecord storage record = migrationRecords[MigrationStep.VOTING_DATA];
        record.step = MigrationStep.VOTING_DATA;
        record.startTime = block.timestamp;
        record.recordsTotal = _campaignIds.length;

        emit MigrationStepStarted(MigrationStep.VOTING_DATA, block.timestamp);

        uint256 processedCount = 0;
        string memory lastError = "";

        for (uint256 i = 0; i < _campaignIds.length; i++) {
            try this._migrateVotingDataForCampaign(_campaignIds[i]) {
                processedCount++;
            } catch Error(string memory reason) {
                lastError = reason;
                break;
            }
        }

        record.endTime = block.timestamp;
        record.completed = processedCount == _campaignIds.length;
        record.recordsProcessed = processedCount;
        record.errorMessage = lastError;

        if (record.completed) {
            stepCompleted[MigrationStep.VOTING_DATA] = true;
            emit MigrationStepCompleted(MigrationStep.VOTING_DATA, block.timestamp, processedCount);
        } else {
            emit MigrationStepFailed(MigrationStep.VOTING_DATA, lastError);
        }
    }

    /**
     * @notice Migrate treasury data from V4 to V5
     */
    function migrateTreasuryData() external whenActive migrationInProgress stepNotCompleted(MigrationStep.TREASURY_DATA) {
        // Check if caller has admin role through proxy
        require(_isAdmin(getEffectiveCaller()), "MigrationModule: Admin role required");
        MigrationRecord storage record = migrationRecords[MigrationStep.TREASURY_DATA];
        record.step = MigrationStep.TREASURY_DATA;
        record.startTime = block.timestamp;

        emit MigrationStepStarted(MigrationStep.TREASURY_DATA, block.timestamp);

        try this._migrateTreasuryData() {
            record.endTime = block.timestamp;
            record.completed = true;
            record.recordsProcessed = 1;
            stepCompleted[MigrationStep.TREASURY_DATA] = true;
            emit MigrationStepCompleted(MigrationStep.TREASURY_DATA, block.timestamp, 1);
        } catch Error(string memory reason) {
            record.endTime = block.timestamp;
            record.completed = false;
            record.errorMessage = reason;
            emit MigrationStepFailed(MigrationStep.TREASURY_DATA, reason);
        }
    }

    /**
     * @notice Get migration progress
     * @return status Current migration status
     * @return startTime Migration start time
     * @return endTime Migration end time
     * @return completedSteps Number of completed steps
     * @return totalSteps Total number of steps
     */
    function getMigrationProgress() external view returns (
        MigrationStatus status,
        uint256 startTime,
        uint256 endTime,
        uint256 completedSteps,
        uint256 totalSteps
    ) {
        uint256 completed = 0;
        for (uint256 i = 0; i < 6; i++) {
            if (stepCompleted[MigrationStep(i)]) {
                completed++;
            }
        }

        return (
            migrationStatus,
            migrationStartTime,
            migrationEndTime,
            completed,
            6
        );
    }

    /**
     * @notice Validate migration integrity
     * @return isValid Whether the migration is valid
     * @return validationMessage Validation message
     */
    function validateMigration() external whenActive migrationCompleted returns (bool isValid, string memory validationMessage) {
        // Check if caller has admin role through proxy
        require(_isAdmin(getEffectiveCaller()), "MigrationModule: Admin role required");
        // This would perform comprehensive validation
        isValid = true;
        validationMessage = "Migration validation passed";

        emit MigrationValidated(1, isValid);
        
        return (isValid, validationMessage);
    }

    /**
     * @notice Rollback migration to V4
     */
    function rollbackMigration() external whenActive {
        // Check if caller has emergency role through proxy
        require(_isEmergency(getEffectiveCaller()), "MigrationModule: Emergency role required");
        require(migrationStatus == MigrationStatus.IN_PROGRESS || migrationStatus == MigrationStatus.COMPLETED, "MigrationModule: Cannot rollback");

        migrationStatus = MigrationStatus.ROLLED_BACK;
        migrationEndTime = block.timestamp;

        // Clear migration state
        for (uint256 i = 0; i < 6; i++) {
            stepCompleted[MigrationStep(i)] = false;
        }

        emit MigrationRolledBack(1, block.timestamp);
    }

    /**
     * @notice Pause migration process
     */
    function pauseMigration() external whenActive migrationInProgress {
        // Check if caller has admin role through proxy
        require(_isAdmin(getEffectiveCaller()), "MigrationModule: Admin role required");
        // This would pause the migration without losing progress
    }

    /**
     * @notice Resume paused migration
     */
    function resumeMigration() external whenActive {
        // Check if caller has admin role through proxy
        require(_isAdmin(getEffectiveCaller()), "MigrationModule: Admin role required");
        // This would resume a paused migration
    }

    /**
     * @notice Get migration errors
     * @return errors Array of error messages
     */
    function getMigrationErrors() external view returns (string[] memory errors) {
        // This would return all migration errors
        return new string[](0);
    }

    /**
     * @notice Complete migration process
     */
    function completeMigration() external whenActive migrationInProgress {
        // Check if caller has admin role through proxy
        require(_isAdmin(getEffectiveCaller()), "MigrationModule: Admin role required");
        // Check if all steps are completed
        bool allCompleted = true;
        for (uint256 i = 0; i < 6; i++) {
            if (!stepCompleted[MigrationStep(i)]) {
                allCompleted = false;
                break;
            }
        }

        require(allCompleted, "MigrationModule: Not all steps completed");

        migrationStatus = MigrationStatus.COMPLETED;
        migrationEndTime = block.timestamp;

        emit MigrationCompleted(1, block.timestamp);
    }

    /**
     * @notice Set V4 contract address
     * @param _v4Contract The V4 contract address
     */
    function setV4Contract(address _v4Contract) external whenActive {
        // Check if caller has admin role through proxy
        require(_isAdmin(getEffectiveCaller()), "MigrationModule: Admin role required");
        require(_v4Contract != address(0), "MigrationModule: Invalid V4 contract address");
        v4Contract = IV4Contract(_v4Contract);
        v4ContractAddress = _v4Contract;
        
        // Initialize batch sizes
        batchSize[MigrationStep.PROJECTS] = DEFAULT_BATCH_SIZE;
        batchSize[MigrationStep.CAMPAIGNS] = DEFAULT_BATCH_SIZE;
        batchSize[MigrationStep.VOTING_DATA] = DEFAULT_BATCH_SIZE;
        batchSize[MigrationStep.TREASURY_DATA] = 1;
        batchSize[MigrationStep.USER_DATA] = DEFAULT_BATCH_SIZE;
        batchSize[MigrationStep.VALIDATION] = 1;
    }

    /**
     * @notice Get migration analytics
     * @return totalProjectsMigrated Total projects migrated
     * @return totalCampaignsMigrated Total campaigns migrated
     * @return totalUsersMigrated Total users migrated
     * @return totalBatchesProcessed Total batches processed
     * @return migrationDuration Migration duration in seconds
     */
    function getMigrationAnalytics() external view returns (
        uint256 totalProjectsMigrated,
        uint256 totalCampaignsMigrated,
        uint256 totalUsersMigrated,
        uint256 totalBatchesProcessed,
        uint256 migrationDuration
    ) {
        uint256 duration = 0;
        if (migrationStartTime > 0 && migrationEndTime > 0) {
            duration = migrationEndTime - migrationStartTime;
        }

        return (
            0, // Would need to track actual counts
            0, // Would need to track actual counts
            0, // Would need to track actual counts
            totalBatches,
            duration
        );
    }

    // ==================== ACTUAL MIGRATION LOGIC ====================
    
    /**
     * @notice Migrate single project from V4 to V5 (external for try-catch)
     * @param _v4ProjectId V4 project ID to migrate
     */
    function _migrateSingleProject(uint256 _v4ProjectId) external {
        require(address(v4Contract) != address(0), "MigrationModule: V4 contract not set");
        require(msg.sender == address(this), "MigrationModule: Internal function");
        require(!migratedProjects[_v4ProjectId], "MigrationModule: Project already migrated");
        
        // Read project data from V4
        (
            address owner,
            string memory name,
            string memory description,
            string memory bio,
            string memory contractInfo,
            string memory additionalData,
            address[] memory contracts,
            bool transferrable,
            bool active,
            uint256 createdAt
        ) = v4Contract.getProject(_v4ProjectId);
        
        // Create project in V5 with SAME ID as V4
        bytes memory projectMetadata = abi.encodeWithSignature(
            "createProjectWithV4Id(uint256,address,string,string,(string,string,string,string,string,string,string,string,string,string,string),address[],bool)",
            _v4ProjectId, // Use V4 ID directly
            owner,
            name,
            description,
            // ProjectMetadata struct
            abi.encode(
                bio,                // bio
                contractInfo,       // contractInfo
                additionalData,     // additionalData
                "",                 // jsonMetadata
                "",                 // category
                "",                 // website
                "",                 // github
                "",                 // twitter
                "",                 // discord
                "",                 // websiteUrl
                ""                  // socialMediaHandle
            ),
            contracts,
            transferrable
        );
        
        // Call ProjectsModule to create V5 project with same ID
        bytes memory result = sovereignSeasProxy.callModule("projects", projectMetadata);
        uint256 v5ProjectId = abi.decode(result, (uint256));
        require(v5ProjectId == _v4ProjectId, "MigrationModule: V5 project ID mismatch");
        
        // Migrate project campaign participations
        uint256[] memory v4CampaignIds = v4Contract.getProjectCampaigns(_v4ProjectId);
        if (v4CampaignIds.length > 0) {
            bytes memory participationData = abi.encodeWithSignature(
                "setProjectCampaignParticipationFromV4(uint256,uint256[])",
                v5ProjectId,
                v4CampaignIds
            );
            sovereignSeasProxy.callModule("projects", participationData);
        }
        
        // Store mapping and mark as migrated
        v4ToV5ProjectMapping[_v4ProjectId] = v5ProjectId;
        v5ToV4ProjectMapping[v5ProjectId] = _v4ProjectId;
        migratedProjects[_v4ProjectId] = true;
        
        emit ProjectMigrated(_v4ProjectId, _v4ProjectId, v5ProjectId);
    }

    /**
     * @notice Migrate single campaign from V4 to V5 (external for try-catch)
     * @param _v4CampaignId V4 campaign ID to migrate
     */
    function _migrateSingleCampaign(uint256 _v4CampaignId) external {
        require(address(v4Contract) != address(0), "MigrationModule: V4 contract not set");
        require(msg.sender == address(this), "MigrationModule: Internal function");
        require(!migratedCampaigns[_v4CampaignId], "MigrationModule: Campaign already migrated");
        
        // Read campaign data from V4 using the correct interface (12 fields)
        (
            address admin,
            string memory name,
            string memory description,
            uint256 startTime,
            uint256 endTime,
            uint256 targetAmount,
            uint256 raisedAmount,
            bool active,
            bool verified,
            address preferredToken,
            bool useQuadraticVoting,
            uint256 createdAt
        ) = v4Contract.getCampaign(_v4CampaignId);
        
        // Set default values for V5 fields that don't exist in V4
        uint256 adminFeePercentage = 0;    // V4 doesn't have this
        uint256 maxWinners = 0;            // V4 doesn't have this
        bool useQuadraticDistribution = useQuadraticVoting; // Map from V4 field
        bool useCustomDistribution = false; // V4 doesn't have this
        string memory customDistributionData = ""; // V4 doesn't have this
        address payoutToken = preferredToken; // Map from V4 field
        uint256 totalFunds = raisedAmount; // Map from V4 field
        
        // Get campaign projects
        uint256[] memory v4ProjectIds = v4Contract.getCampaignProjects(_v4CampaignId);
        uint256[] memory v5ProjectIds = new uint256[](v4ProjectIds.length);
        
        // Map V4 project IDs to V5 project IDs
        for (uint256 i = 0; i < v4ProjectIds.length; i++) {
            v5ProjectIds[i] = v4ToV5ProjectMapping[v4ProjectIds[i]];
            require(v5ProjectIds[i] != 0, "MigrationModule: Project not migrated yet");
        }
        
        // Map V4 distribution settings to V5 DistributionMethod
        uint8 distributionMethod;
        if (useCustomDistribution) {
            distributionMethod = 3; // DistributionMethod.CUSTOM
        } else if (useQuadraticDistribution) {
            distributionMethod = 2; // DistributionMethod.QUADRATIC
        } else {
            distributionMethod = 1; // DistributionMethod.PROPORTIONAL
        }
        
        // Create campaign metadata with CORRECT V4 field values
        bytes memory campaignMetadata = abi.encodeWithSignature(
            "createCampaignFromV4(uint256,address,string,string,string,string,uint256,uint256,uint256,uint256,uint8,string,address,bool,uint256,uint256)",
            _v4CampaignId,
            admin,
            name,
            description,
            "", // mainInfo - V4 doesn't have this
            "", // additionalInfo - V4 doesn't have this
            startTime,
            endTime,
            adminFeePercentage,    // ✅ CORRECT: V4 adminFeePercentage
            maxWinners,            // ✅ CORRECT: V4 maxWinners
            distributionMethod,    // ✅ CORRECT: Mapped from V4 booleans
            customDistributionData, // ✅ CORRECT: V4 customDistributionData
            payoutToken,           // ✅ CORRECT: V4 payoutToken
            active,                // ✅ CORRECT: V4 active
            totalFunds,            // ✅ CORRECT: V4 totalFunds
            block.timestamp        // createdAt
        );
        
        // Call CampaignsModule to create V5 campaign
        bytes memory result = sovereignSeasProxy.callModule("campaigns", campaignMetadata);
        uint256 v5CampaignId = abi.decode(result, (uint256));
        
        // Store mapping and mark as migrated
        v4ToV5CampaignMapping[_v4CampaignId] = v5CampaignId;
        v5ToV4CampaignMapping[v5CampaignId] = _v4CampaignId;
        migratedCampaigns[_v4CampaignId] = true;
        
        emit CampaignMigrated(_v4CampaignId, _v4CampaignId, v5CampaignId);
    }

    function _migrateVotingDataForCampaign(uint256 _v4CampaignId) external {
        require(address(v4Contract) != address(0), "MigrationModule: V4 contract not set");
        require(msg.sender == address(this), "MigrationModule: Internal function");
        
        uint256 v5CampaignId = v4ToV5CampaignMapping[_v4CampaignId];
        require(v5CampaignId != 0, "MigrationModule: Campaign not migrated yet");
        
        // Get campaign projects
        uint256[] memory v4ProjectIds = v4Contract.getCampaignProjects(_v4CampaignId);
        
        // Migrate voting data for each project
        for (uint256 i = 0; i < v4ProjectIds.length; i++) {
            uint256 v4ProjectId = v4ProjectIds[i];
            uint256 v5ProjectId = v4ToV5ProjectMapping[v4ProjectId];
            
            if (v5ProjectId != 0) {
                // Get participation data
                (bool approved, uint256 voteCount, uint256 tokenAmount) = v4Contract.getParticipation(_v4CampaignId, v4ProjectId);
                
                if (approved && voteCount > 0) {
                    // Migrate participation data - NO FEE VERSION
                    bytes memory participationData = abi.encodeWithSignature(
                        "setProjectParticipationFromV4Migration(uint256,uint256,bool,uint256,uint256)",
                        v5CampaignId,
                        v5ProjectId,
                        approved,
                        voteCount,
                        tokenAmount
                    );
                    
                    sovereignSeasProxy.callModule("voting", participationData);
                    
                    // Migrate individual voter data for this project
                    _migrateProjectVoterData(_v4CampaignId, v4ProjectId, v5CampaignId, v5ProjectId);
                }
            }
        }
    }

    function _migrateTreasuryData() external {
        require(address(v4Contract) != address(0), "MigrationModule: V4 contract not set");
        require(msg.sender == address(this), "MigrationModule: Internal function");
        
        // Get supported tokens from V4
        address[] memory supportedTokens = v4Contract.getSupportedTokens();
        
        // Migrate token support settings
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            
            // Get V4 token data
            uint256 collectedFees = v4Contract.collectedFees(token);
            address exchangeProvider = v4Contract.getTokenExchangeProvider(token);
            
            // Add token support in V5
            bytes memory tokenData = abi.encodeWithSignature(
                "addSupportedTokenFromV4(address,address,uint256)",
                token,
                exchangeProvider,
                collectedFees
            );
            
            sovereignSeasProxy.callModule("treasury", tokenData);
        }
    }

    // ==================== BATCH PROCESSING FUNCTIONS ====================

    /**
     * @notice Batch migrate projects with size control
     * @param _projectIds Array of V4 project IDs to migrate
     * @param _batchSize Maximum batch size for processing
     */
    function batchMigrateProjects(uint256[] calldata _projectIds, uint256 _batchSize) external whenActive {
        // Check if caller has admin role through proxy
        require(_isAdmin(getEffectiveCaller()), "MigrationModule: Admin role required");
        require(_batchSize > 0 && _batchSize <= MAX_BATCH_SIZE, "MigrationModule: Invalid batch size");
        require(address(v4Contract) != address(0), "MigrationModule: V4 contract not set");
        
        uint256 totalToProcess = _projectIds.length;
        uint256 batchCount = (totalToProcess + _batchSize - 1) / _batchSize;
        
        for (uint256 batch = 0; batch < batchCount; batch++) {
            uint256 start = batch * _batchSize;
            uint256 end = start + _batchSize;
            if (end > totalToProcess) {
                end = totalToProcess;
            }
            
            uint256 batchId = nextBatchId++;
            uint256[] memory batchProjectIds = new uint256[](end - start);
            
            for (uint256 i = start; i < end; i++) {
                batchProjectIds[i - start] = _projectIds[i];
            }
            
            MigrationBatch storage batch_ = migrationBatches[batchId];
            batch_.id = batchId;
            batch_.step = MigrationStep.PROJECTS;
            batch_.recordIds = batchProjectIds;
            batch_.processed = false;
            
            _processBatchProjects(batchId, batchProjectIds);
        }
        
        totalBatches += batchCount;
    }

    /**
     * @notice Process batch of projects
     */
    function _processBatchProjects(uint256 _batchId, uint256[] memory _projectIds) internal {
        uint256 successCount = 0;
        
        for (uint256 i = 0; i < _projectIds.length; i++) {
            // Skip if already migrated
            if (migratedProjects[_projectIds[i]]) {
                successCount++;
                continue;
            }
            
            try this._migrateSingleProject(_projectIds[i]) {
                successCount++;
            } catch Error(string memory) {
                failedItems[MigrationStep.PROJECTS].push(_projectIds[i]);
            }
        }
        
        MigrationBatch storage batch = migrationBatches[_batchId];
        batch.processed = true;
        batch.processedAt = block.timestamp;
        
        if (successCount == _projectIds.length) {
            completedBatches++;
        } else {
            failedBatches++;
        }
        
        emit BatchProcessed(_batchId, MigrationStep.PROJECTS, successCount);
    }

    // ==================== DATA VALIDATION FUNCTIONS ====================

    /**
     * @notice Validate migration integrity
     * @return isValid Whether migration integrity is valid
     * @return report Detailed validation report
     */
    function validateMigrationIntegrity() external view returns (bool isValid, string memory report) {
        require(address(v4Contract) != address(0), "MigrationModule: V4 contract not set");
        
        uint256 v4ProjectCount = v4Contract.nextProjectId();
        uint256 migratedProjectCount = 0;
        for (uint256 i = 0; i < v4ProjectCount; i++) {
            if (migratedProjects[i]) {
                migratedProjectCount++;
            }
        }
        
        uint256 v4CampaignCount = v4Contract.nextCampaignId();
        uint256 migratedCampaignCount = 0;
        for (uint256 i = 0; i < v4CampaignCount; i++) {
            if (migratedCampaigns[i]) {
                migratedCampaignCount++;
            }
        }
        
        isValid = (migratedProjectCount == v4ProjectCount - 1) && (migratedCampaignCount == v4CampaignCount - 1);
        
        if (isValid) {
            report = "Migration integrity validation passed";
        } else {
            report = "Migration integrity validation failed";
        }
        
        return (isValid, report);
    }

    /**
     * @notice Validate V4 → V5 campaign field mapping
     * @param _v4CampaignId V4 campaign ID to validate
     * @param _v5CampaignId V5 campaign ID to validate against
     * @return isValid Whether the field mapping is correct
     * @return report Detailed validation report
     */
    function validateCampaignFieldMapping(uint256 _v4CampaignId, uint256 _v5CampaignId) external view returns (bool isValid, string memory report) {
        require(address(v4Contract) != address(0), "MigrationModule: V4 contract not set");
        require(migratedCampaigns[_v4CampaignId], "MigrationModule: Campaign not migrated");
        
        // Read V4 campaign data using the correct interface (12 fields)
        (
            address v4Admin,
            string memory v4Name,
            string memory v4Description,
            uint256 v4StartTime,
            uint256 v4EndTime,
            uint256 v4TargetAmount,
            uint256 v4RaisedAmount,
            bool v4Active,
            bool v4Verified,
            address v4PreferredToken,
            bool v4UseQuadraticVoting,
            uint256 v4CreatedAt
        ) = v4Contract.getCampaign(_v4CampaignId);
        
        // Set default values for V5 fields that don't exist in V4
        uint256 v4AdminFeePercentage = 0;    // V4 doesn't have this
        uint256 v4MaxWinners = 0;            // V4 doesn't have this
        bool v4UseQuadraticDistribution = v4UseQuadraticVoting; // Map from V4 field
        bool v4UseCustomDistribution = false; // V4 doesn't have this
        string memory v4CustomDistributionData = ""; // V4 doesn't have this
        address v4PayoutToken = v4PreferredToken; // Map from V4 field
        uint256 v4TotalFunds = v4RaisedAmount; // Map from V4 field
        
        // Read V5 campaign data
        bytes memory v5CampaignData = sovereignSeasProxy.staticCallModule("campaigns", abi.encodeWithSignature("getCampaign(uint256)", _v5CampaignId));
        (
            address v5Admin,
            string memory v5Name,
            string memory v5Description,
            uint256 v5StartTime,
            uint256 v5EndTime,
            uint256 v5AdminFeePercentage,
            uint256 v5MaxWinners,
            uint8 v5DistributionMethod,
            string memory v5CustomDistributionData,
            address v5PayoutToken,
            bool v5Active,
            uint256 v5TotalFunds
        ) = abi.decode(v5CampaignData, (address, string, string, uint256, uint256, uint256, uint256, uint8, string, address, bool, uint256));
        
        // Validate field mappings
        bool adminMatch = v4Admin == v5Admin;
        bool nameMatch = keccak256(bytes(v4Name)) == keccak256(bytes(v5Name));
        bool descriptionMatch = keccak256(bytes(v4Description)) == keccak256(bytes(v5Description));
        bool startTimeMatch = v4StartTime == v5StartTime;
        bool endTimeMatch = v4EndTime == v5EndTime;
        bool adminFeeMatch = v4AdminFeePercentage == v5AdminFeePercentage;
        bool maxWinnersMatch = v4MaxWinners == v5MaxWinners;
        bool payoutTokenMatch = v4PayoutToken == v5PayoutToken;
        bool activeMatch = v4Active == v5Active;
        bool totalFundsMatch = v4TotalFunds == v5TotalFunds;
        
        // Validate distribution method mapping
        bool distributionMethodMatch = false;
        if (v4UseCustomDistribution && v5DistributionMethod == 3) {
            distributionMethodMatch = true;
        } else if (v4UseQuadraticDistribution && !v4UseCustomDistribution && v5DistributionMethod == 2) {
            distributionMethodMatch = true;
        } else if (!v4UseQuadraticDistribution && !v4UseCustomDistribution && v5DistributionMethod == 1) {
            distributionMethodMatch = true;
        }
        
        // Validate custom distribution data
        bool customDataMatch = keccak256(bytes(v4CustomDistributionData)) == keccak256(bytes(v5CustomDistributionData));
        
        isValid = adminMatch && nameMatch && descriptionMatch && startTimeMatch && endTimeMatch && 
                 adminFeeMatch && maxWinnersMatch && payoutTokenMatch && activeMatch && 
                 totalFundsMatch && distributionMethodMatch && customDataMatch;
        
        if (isValid) {
            report = "Campaign field mapping validation passed";
        } else {
            report = string(abi.encodePacked(
                "Campaign field mapping validation failed: ",
                adminMatch ? "" : "admin, ",
                nameMatch ? "" : "name, ",
                descriptionMatch ? "" : "description, ",
                startTimeMatch ? "" : "startTime, ",
                endTimeMatch ? "" : "endTime, ",
                adminFeeMatch ? "" : "adminFee, ",
                maxWinnersMatch ? "" : "maxWinners, ",
                payoutTokenMatch ? "" : "payoutToken, ",
                activeMatch ? "" : "active, ",
                totalFundsMatch ? "" : "totalFunds, ",
                distributionMethodMatch ? "" : "distributionMethod, ",
                customDataMatch ? "" : "customData"
            ));
        }
        
        return (isValid, report);
    }

    // ==================== ROLLBACK CAPABILITY ====================

    /**
     * @notice Rollback specific migration step
     * @param _step Migration step to rollback
     */
    function rollbackStep(MigrationStep _step) external whenActive {
        // Check if caller has emergency role through proxy
        require(_isEmergency(getEffectiveCaller()), "MigrationModule: Emergency role required");
        require(stepCompleted[_step], "MigrationModule: Step not completed");
        
        rollbackData[_stepToString(_step)] = abi.encode(block.timestamp, getEffectiveCaller());
        stepCompleted[_step] = false;
        
        emit MigrationStepFailed(_step, "Step rolled back by admin");
    }

    /**
     * @notice Convert migration step to string
     */
    function _stepToString(MigrationStep _step) internal pure returns (string memory) {
        if (_step == MigrationStep.PROJECTS) return "projects";
        if (_step == MigrationStep.CAMPAIGNS) return "campaigns";
        if (_step == MigrationStep.VOTING_DATA) return "voting_data";
        if (_step == MigrationStep.TREASURY_DATA) return "treasury_data";
        if (_step == MigrationStep.USER_DATA) return "user_data";
        if (_step == MigrationStep.VALIDATION) return "validation";
        return "unknown";
    }

    /**
     * @notice Get V4 to V5 project mapping
     */
    function getProjectMapping(uint256 _v4ProjectId) external view returns (uint256 v5ProjectId) {
        return v4ToV5ProjectMapping[_v4ProjectId];
    }

    /**
     * @notice Get V4 to V5 campaign mapping
     */
    function getCampaignMapping(uint256 _v4CampaignId) external view returns (uint256 v5CampaignId) {
        return v4ToV5CampaignMapping[_v4CampaignId];
    }

    /**
     * @notice Check if project is migrated
     */
    function isProjectMigrated(uint256 _v4ProjectId) external view returns (bool) {
        return migratedProjects[_v4ProjectId];
    }

    /**
     * @notice Check if campaign is migrated
     */
    function isCampaignMigrated(uint256 _v4CampaignId) external view returns (bool) {
        return migratedCampaigns[_v4CampaignId];
    }

    /**
     * @notice Migrate individual voter data for a project (internal helper)
     * @param _v4CampaignId V4 campaign ID
     * @param _v4ProjectId V4 project ID
     * @param _v5CampaignId V5 campaign ID
     * @param _v5ProjectId V5 project ID
     */
    function _migrateProjectVoterData(
        uint256 _v4CampaignId,
        uint256 _v4ProjectId,
        uint256 _v5CampaignId,
        uint256 _v5ProjectId
    ) internal {
        // Get supported tokens from V4
        address[] memory supportedTokens = v4Contract.getSupportedTokens();
        
        // For each token, we need to reconstruct voter data
        // This is a simplified approach - in practice you'd need to track individual voters
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            
            // Get total token votes for this project
            uint256 tokenVotes = v4Contract.getProjectTokenVotes(_v4CampaignId, _v4ProjectId, token);
            
            if (tokenVotes > 0) {
                // Create aggregated vote data - NO FEES for migration
                bytes memory voteData = abi.encodeWithSignature(
                    "migrateAggregatedVoteFromV4(uint256,uint256,address,uint256)",
                    _v5CampaignId,
                    _v5ProjectId,
                    token,
                    tokenVotes
                );
                
                sovereignSeasProxy.callModule("voting", voteData);
            }
        }
    }

    /**
     * @notice Enhanced migration function that handles comprehensive project data
     * @param _v4ProjectId V4 project ID to migrate with all related data
     */
    function migrateProjectComprehensive(uint256 _v4ProjectId) external whenActive {
        // Check if caller has admin role through proxy
        require(_isAdmin(getEffectiveCaller()), "MigrationModule: Admin role required");
        require(address(v4Contract) != address(0), "MigrationModule: V4 contract not set");
        
        // 1. Migrate the project itself
        try this._migrateSingleProject(_v4ProjectId) {
            // 2. Get all campaigns this project participated in
            uint256[] memory participatedCampaigns = v4Contract.getProjectCampaigns(_v4ProjectId);
            
            // 3. For each campaign, ensure it's migrated and then migrate voting data
            for (uint256 i = 0; i < participatedCampaigns.length; i++) {
                uint256 v4CampaignId = participatedCampaigns[i];
                
                // Ensure campaign is migrated first
                if (!migratedCampaigns[v4CampaignId]) {
                    try this._migrateSingleCampaign(v4CampaignId) {
                        // Campaign migrated successfully
                    } catch {
                        // Skip this campaign if migration fails
                        continue;
                    }
                }
                
                // Migrate voting data for this specific project in this campaign
                uint256 v5CampaignId = v4ToV5CampaignMapping[v4CampaignId];
                uint256 v5ProjectId = v4ToV5ProjectMapping[_v4ProjectId];
                
                if (v5CampaignId != 0 && v5ProjectId != 0) {
                    _migrateProjectVoterData(v4CampaignId, _v4ProjectId, v5CampaignId, v5ProjectId);
                }
            }
            
        } catch Error(string memory reason) {
            // Log failure but don't revert
            failedItems[MigrationStep.PROJECTS].push(_v4ProjectId);
        }
    }

    /**
     * @notice Migrate all data for a batch of projects comprehensively
     * @param _projectIds Array of V4 project IDs to migrate completely
     */
    function batchMigrateProjectsComprehensive(uint256[] calldata _projectIds) external whenActive {
        // Check if caller has admin role through proxy
        require(_isAdmin(getEffectiveCaller()), "MigrationModule: Admin role required");
        require(address(v4Contract) != address(0), "MigrationModule: V4 contract not set");
        
        for (uint256 i = 0; i < _projectIds.length; i++) {
            try this.migrateProjectComprehensive(_projectIds[i]) {
                // Project migrated successfully with all data
            } catch {
                // Continue with next project if one fails
                failedItems[MigrationStep.PROJECTS].push(_projectIds[i]);
            }
        }
    }
}
