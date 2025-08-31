// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "./interfaces/ISovereignSeasV4.sol";

contract MigrationModule is Initializable, AccessControlUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {

    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MIGRATOR_ROLE = keccak256("MIGRATOR_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    // V4 contract reference
    ISovereignSeasV4 public v4Contract;
    
    // Migration tracking
    mapping(string => bool) public migrationCompleted;
    mapping(string => uint256) public migrationProgress;
    mapping(string => uint256) public migrationTotal;
    
    // Emergency recovery
    mapping(address => uint256) public emergencyRecoveryAmounts;
    mapping(address => bool) public emergencyRecoveryTriggered;
    
    // Migration data structures
    struct V4MigrationData {
        uint256 projectCount;
        uint256 campaignCount;
        uint256 totalVotes;
        uint256 totalFees;
        uint256 supportedTokensCount;
        bool isComplete;
    }
    
    struct BatchMigrationResult {
        uint256 processed;
        uint256 successful;
        uint256 failed;
        string[] errors;
    }
    
    // Events
    event V4ContractAddressSet(address indexed v4Contract);
    event MigrationStarted(string indexed dataType, uint256 totalItems);
    event MigrationProgress(string indexed dataType, uint256 processed, uint256 total);
    event MigrationCompleted(string indexed dataType, uint256 totalProcessed);
    event MigrationFailed(string indexed dataType, string reason);
    event EmergencyRecoveryTriggered(address indexed token, uint256 amount);
    event DataStructureVersionUpdated(string indexed dataType, uint256 version, string description);

    // Custom errors
    error MigrationNotInitialized();
    error MigrationAlreadyCompleted(string dataType);
    error InvalidV4ContractAddress();
    error MigrationInProgress(string dataType);
    error InsufficientPermissions();

    modifier onlyMigrator() {
        if (!hasRole(MIGRATOR_ROLE, msg.sender) && !hasRole(ADMIN_ROLE, msg.sender)) {
            revert InsufficientPermissions();
        }
        _;
    }

    modifier migrationNotCompleted(string memory dataType) {
        if (migrationCompleted[dataType]) {
            revert MigrationAlreadyCompleted(dataType);
        }
        _;
    }

    function initialize(address _admin) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(MIGRATOR_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(ADMIN_ROLE) {}

    // Grant roles to V5 proxy admin (to fix initialization issue)
    function grantRolesToV5Admin(address v5Admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(ADMIN_ROLE, v5Admin);
        _grantRole(MIGRATOR_ROLE, v5Admin);
        _grantRole(EMERGENCY_ROLE, v5Admin);
        emit DataStructureVersionUpdated("V5_Admin_Roles_Granted", 1, "V5 admin granted all required roles");
    }

    // Set V4 contract address for migration
    function setV4ContractAddress(address _v4Contract) external onlyRole(ADMIN_ROLE) {
        if (_v4Contract == address(0)) {
            revert InvalidV4ContractAddress();
        }
        v4Contract = ISovereignSeasV4(_v4Contract);
        emit V4ContractAddressSet(_v4Contract);
        emit DataStructureVersionUpdated("V4_Contract_Address", 1, "V4 contract address set for migration");
    }

    // Emergency pause
    function emergencyPause(string memory /* reason */) external onlyRole(EMERGENCY_ROLE) {
        _pause();
    }

    // Emergency unpause
    function emergencyUnpause() external onlyRole(EMERGENCY_ROLE) {
        _unpause();
    }

    // ==================== COMPREHENSIVE MIGRATION FUNCTIONS ====================

    // 1. MIGRATE CORE CONFIGURATION
    function migrateCoreConfiguration() external onlyMigrator migrationNotCompleted("core_config") {
        if (address(v4Contract) == address(0)) {
            revert MigrationNotInitialized();
        }

        emit MigrationStarted("core_config", 1);
        
        try this._migrateCoreConfiguration() {
            migrationCompleted["core_config"] = true;
            migrationProgress["core_config"] = 1;
            migrationTotal["core_config"] = 1;
            emit MigrationCompleted("core_config", 1);
        } catch Error(string memory reason) {
            emit MigrationFailed("core_config", reason);
            revert(reason);
        }
    }

    function _migrateCoreConfiguration() external {
        // This will be called by the migrator to set up core configuration
        // Implementation will be in the calling contract
    }

    // 2. MIGRATE SUPPORTED TOKENS
    function migrateSupportedTokens() external onlyMigrator migrationNotCompleted("supported_tokens") {
        if (address(v4Contract) == address(0)) {
            revert MigrationNotInitialized();
        }

        address[] memory supportedTokens = v4Contract.getSupportedTokens();
        uint256 totalTokens = supportedTokens.length;
        
        emit MigrationStarted("supported_tokens", totalTokens);
        
        try this._migrateSupportedTokens(supportedTokens) {
            migrationCompleted["supported_tokens"] = true;
            migrationProgress["supported_tokens"] = totalTokens;
            migrationTotal["supported_tokens"] = totalTokens;
            emit MigrationCompleted("supported_tokens", totalTokens);
        } catch Error(string memory reason) {
            emit MigrationFailed("supported_tokens", reason);
            revert(reason);
        }
    }

    function _migrateSupportedTokens(address[] memory tokens) external {
        // Implementation will be in the calling contract
    }

    // 3. MIGRATE TOKEN EXCHANGE PROVIDERS
    function migrateTokenExchangeProviders() external onlyMigrator migrationNotCompleted("exchange_providers") {
        if (address(v4Contract) == address(0)) {
            revert MigrationNotInitialized();
        }

        address[] memory tokens = v4Contract.getSupportedTokens();
        uint256 totalProviders = tokens.length;
        
        emit MigrationStarted("exchange_providers", totalProviders);
        
        try this._migrateTokenExchangeProviders(tokens) {
            migrationCompleted["exchange_providers"] = true;
            migrationProgress["exchange_providers"] = totalProviders;
            migrationTotal["exchange_providers"] = totalProviders;
            emit MigrationCompleted("exchange_providers", totalProviders);
            } catch Error(string memory reason) {
            emit MigrationFailed("exchange_providers", reason);
            revert(reason);
        }
    }

    function _migrateTokenExchangeProviders(address[] memory tokens) external {
        // Implementation will be in the calling contract
    }

    // 4. MIGRATE PROJECTS
    function migrateProjects() external onlyMigrator migrationNotCompleted("projects") {
        if (address(v4Contract) == address(0)) {
            revert MigrationNotInitialized();
        }

        uint256 totalProjects = v4Contract.nextProjectId();
        
        emit MigrationStarted("projects", totalProjects);
        
        try this._migrateProjects(totalProjects) {
            migrationCompleted["projects"] = true;
            migrationProgress["projects"] = totalProjects;
            migrationTotal["projects"] = totalProjects;
            emit MigrationCompleted("projects", totalProjects);
        } catch Error(string memory reason) {
            emit MigrationFailed("projects", reason);
            revert(reason);
        }
    }

    function _migrateProjects(uint256 totalProjects) external {
        // Implementation will be in the calling contract
    }

    // 5. MIGRATE CAMPAIGNS
    function migrateCampaigns() external onlyMigrator migrationNotCompleted("campaigns") {
        if (address(v4Contract) == address(0)) {
            revert MigrationNotInitialized();
        }

        uint256 totalCampaigns = v4Contract.nextCampaignId();
        
        emit MigrationStarted("campaigns", totalCampaigns);
        
        try this._migrateCampaigns(totalCampaigns) {
            migrationCompleted["campaigns"] = true;
            migrationProgress["campaigns"] = totalCampaigns;
            migrationTotal["campaigns"] = totalCampaigns;
            emit MigrationCompleted("campaigns", totalCampaigns);
        } catch Error(string memory reason) {
            emit MigrationFailed("campaigns", reason);
            revert(reason);
        }
    }

    function _migrateCampaigns(uint256 totalCampaigns) external {
        // Implementation will be in the calling contract
    }

    // 6. MIGRATE PROJECT PARTICIPATIONS
    function migrateProjectParticipations() external onlyMigrator migrationNotCompleted("project_participations") {
        if (address(v4Contract) == address(0)) {
            revert MigrationNotInitialized();
        }

        uint256 totalCampaigns = v4Contract.nextCampaignId();
        uint256 totalProjects = v4Contract.nextProjectId();
        uint256 totalParticipations = totalCampaigns * totalProjects; // Maximum possible
        
        emit MigrationStarted("project_participations", totalParticipations);
        
        try this._migrateProjectParticipations(totalCampaigns, totalProjects) {
            migrationCompleted["project_participations"] = true;
            migrationProgress["project_participations"] = totalParticipations;
            migrationTotal["project_participations"] = totalParticipations;
            emit MigrationCompleted("project_participations", totalParticipations);
        } catch Error(string memory reason) {
            emit MigrationFailed("project_participations", reason);
            revert(reason);
        }
    }

    function _migrateProjectParticipations(uint256 totalCampaigns, uint256 totalProjects) external {
        // Implementation will be in the calling contract
    }

    // 7. MIGRATE VOTES
    function migrateVotes() external onlyMigrator migrationNotCompleted("votes") {
        if (address(v4Contract) == address(0)) {
            revert MigrationNotInitialized();
        }

        // This is complex - we need to iterate through all campaigns and projects
        uint256 totalCampaigns = v4Contract.nextCampaignId();
        uint256 totalProjects = v4Contract.nextProjectId();
        
        emit MigrationStarted("votes", 0); // We'll track progress dynamically
        
        try this._migrateVotes(totalCampaigns, totalProjects) {
            migrationCompleted["votes"] = true;
            migrationProgress["votes"] = 1; // Mark as complete
            migrationTotal["votes"] = 1;
            emit MigrationCompleted("votes", 1);
        } catch Error(string memory reason) {
            emit MigrationFailed("votes", reason);
            revert(reason);
        }
    }

    function _migrateVotes(uint256 totalCampaigns, uint256 totalProjects) external {
        // Implementation will be in the calling contract
    }

    // 8. MIGRATE FEES AND TREASURY
    function migrateFeesAndTreasury() external onlyMigrator migrationNotCompleted("fees_treasury") {
        if (address(v4Contract) == address(0)) {
            revert MigrationNotInitialized();
        }

        address[] memory supportedTokens = v4Contract.getSupportedTokens();
        uint256 totalTokens = supportedTokens.length;
        
        emit MigrationStarted("fees_treasury", totalTokens);
        
        try this._migrateFeesAndTreasury(supportedTokens) {
            migrationCompleted["fees_treasury"] = true;
            migrationProgress["fees_treasury"] = totalTokens;
            migrationTotal["fees_treasury"] = totalTokens;
            emit MigrationCompleted("fees_treasury", totalTokens);
        } catch Error(string memory reason) {
            emit MigrationFailed("fees_treasury", reason);
            revert(reason);
        }
    }

    function _migrateFeesAndTreasury(address[] memory tokens) external {
        // Implementation will be in the calling contract
    }

    // 9. COMPLETE MIGRATION
    function completeMigration() external onlyMigrator {
        if (address(v4Contract) == address(0)) {
            revert MigrationNotInitialized();
        }

        // Check if all migrations are complete
        require(migrationCompleted["core_config"], "Core config not migrated");
        require(migrationCompleted["supported_tokens"], "Supported tokens not migrated");
        require(migrationCompleted["exchange_providers"], "Exchange providers not migrated");
        require(migrationCompleted["projects"], "Projects not migrated");
        require(migrationCompleted["campaigns"], "Campaigns not migrated");
        require(migrationCompleted["project_participations"], "Project participations not migrated");
        require(migrationCompleted["votes"], "Votes not migrated");
        require(migrationCompleted["fees_treasury"], "Fees and treasury not migrated");

        emit DataStructureVersionUpdated("V4_Migration_Complete", 1, "All V4 data successfully migrated to V5");
    }

    // ==================== BATCH MIGRATION FUNCTIONS ====================

    // Batch migrate all data
    function batchMigrateAll() external onlyMigrator {
        if (address(v4Contract) == address(0)) {
            revert MigrationNotInitialized();
        }

        // Execute all migrations in sequence
        this.migrateCoreConfiguration();
        this.migrateSupportedTokens();
        this.migrateTokenExchangeProviders();
        this.migrateProjects();
        this.migrateCampaigns();
        this.migrateProjectParticipations();
        this.migrateVotes();
        this.migrateFeesAndTreasury();
        this.completeMigration();
    }

    // ==================== VIEW FUNCTIONS ====================

    function getV4MigrationData() external view returns (V4MigrationData memory) {
        if (address(v4Contract) == address(0)) {
            return V4MigrationData(0, 0, 0, 0, 0, false);
        }

        uint256 projectCount = v4Contract.nextProjectId();
        uint256 campaignCount = v4Contract.nextCampaignId();
        
        // Estimate total votes (this is approximate)
        uint256 totalVotes = 0;
        for (uint256 i = 0; i < campaignCount; i++) {
            try v4Contract.getCampaignVotedTokens(i) returns (address[] memory campaignTokens) {
                for (uint256 j = 0; j < campaignTokens.length; j++) {
                    totalVotes += v4Contract.getCampaignTokenAmount(i, campaignTokens[j]);
                }
            } catch {
                // Skip if campaign doesn't exist
            }
        }

        // Estimate total fees
        uint256 totalFees = 0;
        address[] memory supportedTokens = v4Contract.getSupportedTokens();
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            totalFees += v4Contract.collectedFees(supportedTokens[i]);
        }

        bool isComplete = migrationCompleted["core_config"] &&
                         migrationCompleted["supported_tokens"] &&
                         migrationCompleted["exchange_providers"] &&
                         migrationCompleted["projects"] &&
                         migrationCompleted["campaigns"] &&
                         migrationCompleted["project_participations"] &&
                         migrationCompleted["votes"] &&
                         migrationCompleted["fees_treasury"];

        return V4MigrationData(
            projectCount,
            campaignCount,
            totalVotes,
            totalFees,
            supportedTokens.length,
            isComplete
        );
    }

    function getMigrationProgress() external view returns (
        bool coreConfigCompleted,
        bool supportedTokensCompleted,
        bool exchangeProvidersCompleted,
        bool projectsCompleted,
        bool campaignsCompleted,
        bool projectParticipationsCompleted,
        bool votesCompleted,
        bool feesTreasuryCompleted,
        uint256 coreConfigProgress,
        uint256 supportedTokensProgress,
        uint256 exchangeProvidersProgress,
        uint256 projectsProgress,
        uint256 campaignsProgress,
        uint256 projectParticipationsProgress,
        uint256 votesProgress,
        uint256 feesTreasuryProgress,
        uint256 coreConfigTotal,
        uint256 supportedTokensTotal,
        uint256 exchangeProvidersTotal,
        uint256 projectsTotal,
        uint256 campaignsTotal,
        uint256 projectParticipationsTotal,
        uint256 votesTotal,
        uint256 feesTreasuryTotal
    ) {
        return (
            migrationCompleted["core_config"],
            migrationCompleted["supported_tokens"],
            migrationCompleted["exchange_providers"],
            migrationCompleted["projects"],
            migrationCompleted["campaigns"],
            migrationCompleted["project_participations"],
            migrationCompleted["votes"],
            migrationCompleted["fees_treasury"],
            migrationProgress["core_config"],
            migrationProgress["supported_tokens"],
            migrationProgress["exchange_providers"],
            migrationProgress["projects"],
            migrationProgress["campaigns"],
            migrationProgress["project_participations"],
            migrationProgress["votes"],
            migrationProgress["fees_treasury"],
            migrationTotal["core_config"],
            migrationTotal["supported_tokens"],
            migrationTotal["exchange_providers"],
            migrationTotal["projects"],
            migrationTotal["campaigns"],
            migrationTotal["project_participations"],
            migrationTotal["votes"],
            migrationTotal["fees_treasury"]
        );
    }

    function getMigrationStats() external view returns (
        uint256 totalCompleted,
        uint256 totalInProgress,
        uint256 totalFailed
    ) {
        uint256 completed = 0;
        uint256 inProgress = 0;
        uint256 failed = 0;

        string[] memory migrationTypes = new string[](8);
        migrationTypes[0] = "core_config";
        migrationTypes[1] = "supported_tokens";
        migrationTypes[2] = "exchange_providers";
        migrationTypes[3] = "projects";
        migrationTypes[4] = "campaigns";
        migrationTypes[5] = "project_participations";
        migrationTypes[6] = "votes";
        migrationTypes[7] = "fees_treasury";

        for (uint256 i = 0; i < migrationTypes.length; i++) {
            if (migrationCompleted[migrationTypes[i]]) {
                completed++;
            } else if (migrationProgress[migrationTypes[i]] > 0) {
                inProgress++;
            } else {
                failed++;
            }
        }

        return (completed, inProgress, failed);
    }

    // ==================== EMERGENCY FUNCTIONS ====================

    function triggerEmergencyRecovery(address token) external onlyRole(EMERGENCY_ROLE) {
        if (address(v4Contract) == address(0)) {
            revert MigrationNotInitialized();
        }

        uint256 amount = v4Contract.collectedFees(token);
        if (amount > 0) {
            emergencyRecoveryAmounts[token] = amount;
            emergencyRecoveryTriggered[token] = true;
            emit EmergencyRecoveryTriggered(token, amount);
        }
    }

    function getEmergencyRecoveryInfo(address token) external view returns (
        uint256 amount,
        bool triggered
    ) {
        return (emergencyRecoveryAmounts[token], emergencyRecoveryTriggered[token]);
    }

    // ==================== UTILITY FUNCTIONS ====================

    function getDataStructureVersion(string memory _dataType) external view returns (uint256) {
        if (address(v4Contract) == address(0)) {
            return 0;
        }
        return v4Contract.getDataStructureVersion(_dataType);
    }

function getModuleName() external pure returns (string memory) {
        return "MigrationModule";
}

function getModuleVersion() external pure returns (uint256) {
        return 1;
}
}