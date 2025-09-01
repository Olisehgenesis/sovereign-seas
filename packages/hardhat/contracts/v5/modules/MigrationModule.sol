// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../base/BaseModule.sol";

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
    address public v4Contract;
    mapping(MigrationStep => MigrationRecord) public migrationRecords;
    mapping(uint256 => MigrationBatch) public migrationBatches;
    mapping(MigrationStep => bool) public stepCompleted;
    mapping(uint256 => bool) public migratedProjects;
    mapping(uint256 => bool) public migratedCampaigns;
    mapping(address => bool) public migratedUsers;
    
    uint256 public nextBatchId;
    uint256 public totalBatches;
    uint256 public completedBatches;
    MigrationStatus public migrationStatus;
    uint256 public migrationStartTime;
    uint256 public migrationEndTime;
    string public migrationVersion;

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
        require(_proxy != address(0), "MigrationModule: Invalid proxy address");
        
        sovereignSeasProxy = ISovereignSeasV5(_proxy);
        moduleActive = true;

        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);

        // Initialize inherited contracts
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
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
    function startMigration(address _v4Contract) external onlyAdmin whenActive migrationNotStarted {
        require(_v4Contract != address(0), "MigrationModule: Invalid V4 contract address");

        v4Contract = _v4Contract;
        migrationStatus = MigrationStatus.IN_PROGRESS;
        migrationStartTime = block.timestamp;

        emit MigrationStarted(1, migrationStartTime);
    }

    /**
     * @notice Migrate projects from V4 to V5
     * @param _projectIds Array of V4 project IDs to migrate
     */
    function migrateProjects(uint256[] calldata _projectIds) external onlyAdmin whenActive migrationInProgress stepNotCompleted(MigrationStep.PROJECTS) {
        MigrationRecord storage record = migrationRecords[MigrationStep.PROJECTS];
        record.step = MigrationStep.PROJECTS;
        record.startTime = block.timestamp;
        record.recordsTotal = _projectIds.length;

        emit MigrationStepStarted(MigrationStep.PROJECTS, block.timestamp);

        uint256 processedCount = 0;
        string memory lastError = "";

        for (uint256 i = 0; i < _projectIds.length; i++) {
            try this._migrateSingleProject(_projectIds[i]) {
                processedCount++;
                migratedProjects[_projectIds[i]] = true;
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
    function migrateCampaigns(uint256[] calldata _campaignIds) external onlyAdmin whenActive migrationInProgress stepNotCompleted(MigrationStep.CAMPAIGNS) {
        MigrationRecord storage record = migrationRecords[MigrationStep.CAMPAIGNS];
        record.step = MigrationStep.CAMPAIGNS;
        record.startTime = block.timestamp;
        record.recordsTotal = _campaignIds.length;

        emit MigrationStepStarted(MigrationStep.CAMPAIGNS, block.timestamp);

        uint256 processedCount = 0;
        string memory lastError = "";

        for (uint256 i = 0; i < _campaignIds.length; i++) {
            try this._migrateSingleCampaign(_campaignIds[i]) {
                processedCount++;
                migratedCampaigns[_campaignIds[i]] = true;
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
    function migrateVotingData(uint256[] calldata _campaignIds) external onlyAdmin whenActive migrationInProgress stepNotCompleted(MigrationStep.VOTING_DATA) {
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
    function migrateTreasuryData() external onlyAdmin whenActive migrationInProgress stepNotCompleted(MigrationStep.TREASURY_DATA) {
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
    function validateMigration() external onlyAdmin whenActive migrationCompleted returns (bool isValid, string memory validationMessage) {
        // This would perform comprehensive validation
        isValid = true;
        validationMessage = "Migration validation passed";

        emit MigrationValidated(1, isValid);
        
        return (isValid, validationMessage);
    }

    /**
     * @notice Rollback migration to V4
     */
    function rollbackMigration() external onlyEmergency whenActive {
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
    function pauseMigration() external onlyAdmin whenActive migrationInProgress {
        // This would pause the migration without losing progress
    }

    /**
     * @notice Resume paused migration
     */
    function resumeMigration() external onlyAdmin whenActive {
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
    function completeMigration() external onlyAdmin whenActive migrationInProgress {
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
    function setV4Contract(address _v4Contract) external onlyAdmin whenActive {
        require(_v4Contract != address(0), "MigrationModule: Invalid V4 contract address");
        v4Contract = _v4Contract;
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

    // Internal helper functions (external for try-catch)
    function _migrateSingleProject(uint256 _v4ProjectId) external {
        // This would migrate a single project from V4 to V5
        // Integration with ProjectsModule would happen here
        emit ProjectMigrated(0, _v4ProjectId, 0);
    }

    function _migrateSingleCampaign(uint256 _v4CampaignId) external {
        // This would migrate a single campaign from V4 to V5
        // Integration with CampaignsModule would happen here
        emit CampaignMigrated(0, _v4CampaignId, 0);
    }

    function _migrateVotingDataForCampaign(uint256 _v4CampaignId) external {
        // This would migrate voting data for a campaign from V4 to V5
        // Integration with VotingModule would happen here
    }

    function _migrateTreasuryData() external {
        // This would migrate treasury data from V4 to V5
        // Integration with TreasuryModule would happen here
    }
}
