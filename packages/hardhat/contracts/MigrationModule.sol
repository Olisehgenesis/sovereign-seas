// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Interface for main contract communication
interface ISovereignSeasV5 {
    function hasModuleAccess(address _user, bytes32 _role) external view returns (bool);
    function callModule(string memory _moduleName, bytes memory _data) external returns (bytes memory);
}

// Migration data structures
struct V4MigrationData {
    bool needsMigration;
    bool hasMultipleAdmins;
    bool hasTokenAmounts;
    uint256 adminCount;
    uint256 tokenCount;
    address[] existingAdmins;
    address[] tokens;
    uint256[] tokenAmounts;
}

struct BatchMigrationResult {
    uint256 totalProcessed;
    uint256 successfulMigrations;
    uint256 failedMigrations;
    uint256[] failedCampaignIds;
    string[] errorMessages;
}

/**
 * @title MigrationModule - SovereignSeasV5 Migration and Data Management
 * @dev Handles migration from V4 to V5, data structure updates, and emergency recovery
 */
contract MigrationModule is Initializable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;
    
    // State variables
    ISovereignSeasV5 public mainContract;
    
    // V4 contract reference
    address public v4ContractAddress;
    
    // Migration tracking
    mapping(uint256 => bool) public campaignMigrated;
    mapping(uint256 => bool) public projectMigrated;
    mapping(address => bool) public userMigrated;
    mapping(string => uint256) public dataStructureVersions;
    
    // V4 compatibility mappings
    mapping(address => bool) public superAdmins;
    
    // Migration statistics
    uint256 public totalCampaignsMigrated;
    uint256 public totalProjectsMigrated;
    uint256 public totalUsersMigrated;
    
    // Emergency recovery
    mapping(address => uint256) public emergencyRecoveryQueue;
    mapping(address => uint256) public lastEmergencyAction;
    
    // Constants
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    // Events
    event CampaignMigrated(uint256 indexed campaignId, address indexed initiator);
    event ProjectMigrated(uint256 indexed projectId, address indexed initiator);
    event UserMigrated(address indexed user, address indexed initiator);
    event BatchMigrationCompleted(uint256 totalProcessed, uint256 successful, uint256 failed);
    event SuperAdminMigrated(address indexed admin, address indexed initiator);
    event DataStructureVersionUpdated(string dataType, uint256 newVersion, string structureDescription);
    event EmergencyTokenRecovery(address indexed token, address indexed recipient, uint256 amount, bool tokensNeededForActiveCampaigns);
    event MigrationStatusUpdated(string migrationPhase, uint256 progress, uint256 total);
    event V4ContractAddressSet(address indexed v4Contract, address indexed setBy);

    // Modifiers
    modifier onlyMainContract() {
        require(msg.sender == address(mainContract), "MigrationModule: Only main contract can call");
        _;
    }
    
    modifier hasRole(bytes32 role) {
        require(mainContract.hasModuleAccess(msg.sender, role), "MigrationModule: Access denied");
        _;
    }

    function initialize(address _main) external initializer {
        __ReentrancyGuard_init();
        mainContract = ISovereignSeasV5(_main);
        
        // Initialize data structure versions
        dataStructureVersions["projects"] = 5;
        dataStructureVersions["campaigns"] = 5;
        dataStructureVersions["voting"] = 5;
        dataStructureVersions["treasury"] = 5;
    }
    
    // Set V4 contract address for migration
    function setV4ContractAddress(address _v4Contract) external hasRole(ADMIN_ROLE) {
        require(_v4Contract != address(0), "MigrationModule: Invalid V4 contract address");
        v4ContractAddress = _v4Contract;
        emit DataStructureVersionUpdated("V4_Contract_Address", 1, "V4 contract address set for migration");
    }

    // V4 to V5 Migration Functions
    function migrateV4Campaign(uint256 _campaignId) external nonReentrant hasRole(ADMIN_ROLE) {
        require(!campaignMigrated[_campaignId], "MigrationModule: Campaign already migrated");
        
        // Check if campaign exists
        bytes memory campaignData = mainContract.callModule("campaigns", abi.encodeWithSignature("getCampaign(uint256)", _campaignId));
        (uint256 id, address admin, , , , , , , , , , bool active, ) = abi.decode(campaignData, (uint256, address, string, string, uint256, uint256, uint256, uint256, bool, bool, address, bool, uint256));
        require(id != 0, "MigrationModule: Campaign does not exist");
        
        // Basic migration - ensure admin has campaign admin privileges
        bytes memory isCampaignAdminData = mainContract.callModule("campaigns", abi.encodeWithSignature("isCampaignAdmin(uint256,address)", _campaignId, admin));
        bool isAdmin = abi.decode(isCampaignAdminData, (bool));
        
        if (!isAdmin) {
            mainContract.callModule("campaigns", abi.encodeWithSignature("addCampaignAdmin(uint256,address)", _campaignId, admin));
        }
        
        // Mark as migrated
        campaignMigrated[_campaignId] = true;
        totalCampaignsMigrated++;
        
        emit CampaignMigrated(_campaignId, msg.sender);
    }
    
    function migrateV4CampaignFull(
        uint256 _campaignId,
        address[] memory _existingAdmins,
        address[] memory _tokens,
        uint256[] memory _tokenAmounts
    ) external nonReentrant hasRole(ADMIN_ROLE) {
        require(!campaignMigrated[_campaignId], "MigrationModule: Campaign already migrated");
        require(_tokens.length == _tokenAmounts.length, "MigrationModule: Token arrays length mismatch");
        require(_existingAdmins.length > 0, "MigrationModule: Must have at least one admin");
        
        // Verify campaign exists
        bytes memory campaignData = mainContract.callModule("campaigns", abi.encodeWithSignature("getCampaign(uint256)", _campaignId));
        (uint256 id, , , , , , , , , , , , ) = abi.decode(campaignData, (uint256, address, string, string, uint256, uint256, uint256, uint256, bool, bool, address, bool, uint256));
        require(id != 0, "MigrationModule: Campaign does not exist");
        
        // Add all existing V4 campaign admins
        for (uint256 i = 0; i < _existingAdmins.length; i++) {
            if (_existingAdmins[i] != address(0)) {
                bytes memory isCampaignAdminData = mainContract.callModule("campaigns", abi.encodeWithSignature("isCampaignAdmin(uint256,address)", _campaignId, _existingAdmins[i]));
                bool isAdmin = abi.decode(isCampaignAdminData, (bool));
                
                if (!isAdmin) {
                    mainContract.callModule("campaigns", abi.encodeWithSignature("addCampaignAdmin(uint256,address)", _campaignId, _existingAdmins[i]));
                }
            }
        }
        
        // Set token amounts from V4 data
        for (uint256 i = 0; i < _tokens.length; i++) {
            if (_tokens[i] != address(0) && _tokenAmounts[i] > 0) {
                mainContract.callModule("campaigns", abi.encodeWithSignature("fundCampaign(uint256,address,uint256)", _campaignId, _tokens[i], _tokenAmounts[i]));
            }
        }
        
        // Mark as migrated
        campaignMigrated[_campaignId] = true;
        totalCampaignsMigrated++;
        
        emit CampaignMigrated(_campaignId, msg.sender);
    }
    
    function batchMigrateV4Campaigns(uint256[] memory _campaignIds) external nonReentrant hasRole(ADMIN_ROLE) returns (BatchMigrationResult memory result) {
        require(_campaignIds.length > 0, "MigrationModule: No campaigns to migrate");
        require(_campaignIds.length <= 50, "MigrationModule: Max 50 campaigns per batch");
        
        result.totalProcessed = _campaignIds.length;
        result.failedCampaignIds = new uint256[](_campaignIds.length);
        result.errorMessages = new string[](_campaignIds.length);
        
        for (uint256 i = 0; i < _campaignIds.length; i++) {
            try this.migrateV4Campaign(_campaignIds[i]) {
                result.successfulMigrations++;
            } catch Error(string memory reason) {
                result.failedCampaignIds[result.failedMigrations] = _campaignIds[i];
                result.errorMessages[result.failedMigrations] = reason;
                result.failedMigrations++;
            } catch {
                result.failedCampaignIds[result.failedMigrations] = _campaignIds[i];
            result.errorMessages[result.failedMigrations] = "Unknown error during migration";
            result.failedMigrations++;
        }
    }
    
    // Resize arrays to actual failed count
    uint256[] memory actualFailedIds = new uint256[](result.failedMigrations);
    string[] memory actualErrors = new string[](result.failedMigrations);
    
    for (uint256 i = 0; i < result.failedMigrations; i++) {
        actualFailedIds[i] = result.failedCampaignIds[i];
        actualErrors[i] = result.errorMessages[i];
    }
    
    result.failedCampaignIds = actualFailedIds;
    result.errorMessages = actualErrors;
    
    emit BatchMigrationCompleted(result.totalProcessed, result.successfulMigrations, result.failedMigrations);
    return result;
}

// Project Migration
function migrateV4Project(uint256 _projectId) external nonReentrant hasRole(ADMIN_ROLE) {
    require(!projectMigrated[_projectId], "MigrationModule: Project already migrated");
    
    // Check if project exists
    bytes memory projectData = mainContract.callModule("projects", abi.encodeWithSignature("getProject(uint256)", _projectId));
    (uint256 id, , , , , , , ) = abi.decode(projectData, (uint256, address, string, string, bool, bool, uint256, uint256[]));
    require(id != 0, "MigrationModule: Project does not exist");
    
    // Basic migration - project is already in V5 format
    projectMigrated[_projectId] = true;
    totalProjectsMigrated++;
    
    emit ProjectMigrated(_projectId, msg.sender);
}

function batchMigrateV4Projects(uint256[] memory _projectIds) external nonReentrant hasRole(ADMIN_ROLE) {
    require(_projectIds.length > 0, "MigrationModule: No projects to migrate");
    require(_projectIds.length <= 100, "MigrationModule: Max 100 projects per batch");
    
    uint256 successful = 0;
    for (uint256 i = 0; i < _projectIds.length; i++) {
        if (!projectMigrated[_projectIds[i]]) {
            try this.migrateV4Project(_projectIds[i]) {
                successful++;
            } catch {
                // Continue with next project on failure
            }
        }
    }
    
    emit MigrationStatusUpdated("batch_project_migration", successful, _projectIds.length);
}

// Super Admin Migration
function migrateSuperAdminToAccessControl(address _superAdmin) external hasRole(ADMIN_ROLE) {
    require(superAdmins[_superAdmin], "MigrationModule: Address is not a super admin");
    
    // Grant access control roles
    mainContract.callModule("main", abi.encodeWithSignature("grantModuleRole(address,bytes32)", _superAdmin, ADMIN_ROLE));
    
    emit SuperAdminMigrated(_superAdmin, msg.sender);
}

function addSuperAdmin(address _newSuperAdmin) external hasRole(ADMIN_ROLE) {
    require(_newSuperAdmin != address(0), "MigrationModule: Invalid address");
    require(!superAdmins[_newSuperAdmin], "MigrationModule: Already a super admin");
    
    superAdmins[_newSuperAdmin] = true;
}

function removeSuperAdmin(address _superAdmin) external hasRole(ADMIN_ROLE) {
    require(_superAdmin != msg.sender, "MigrationModule: Cannot remove yourself");
    require(superAdmins[_superAdmin], "MigrationModule: Not a super admin");
    
    superAdmins[_superAdmin] = false;
}

// Data Structure Version Management
function updateDataStructureVersion(
    string memory _dataType,
    uint256 _newVersion,
    string memory _structureDescription
) external hasRole(ADMIN_ROLE) {
    dataStructureVersions[_dataType] = _newVersion;
    emit DataStructureVersionUpdated(_dataType, _newVersion, _structureDescription);
}

function getDataStructureVersion(string memory _dataType) external view returns (uint256) {
    return dataStructureVersions[_dataType];
}

// Emergency Recovery Functions
function emergencyTokenRecovery(
    address _token,
    address _recipient,
    uint256 _amount,
    bool _forceRecovery
) external hasRole(EMERGENCY_ROLE) nonReentrant {
    require(_recipient != address(0), "MigrationModule: Invalid recipient address");
    
    bool tokensNeeded = _areTokensNeededForActiveCampaigns(_token);
    require(!tokensNeeded || _forceRecovery, "MigrationModule: Tokens needed for active campaigns");
    
    uint256 balance;
    uint256 amountToRecover;
    
    // Get CELO token address from treasury
    bytes memory supportedTokensData = mainContract.callModule("treasury", abi.encodeWithSignature("getSupportedTokens()"));
    address[] memory supportedTokens = abi.decode(supportedTokensData, (address[]));
    address celoToken = supportedTokens.length > 0 ? supportedTokens[0] : address(0);
    
    if (_token == celoToken) {
        balance = address(mainContract).balance;
        amountToRecover = _amount == 0 ? balance : _amount;
        require(amountToRecover <= balance, "MigrationModule: Insufficient CELO balance");
        payable(_recipient).transfer(amountToRecover);
    } else {
        balance = IERC20(_token).balanceOf(address(mainContract));
        amountToRecover = _amount == 0 ? balance : _amount;
        require(amountToRecover <= balance, "MigrationModule: Insufficient token balance");
        IERC20(_token).safeTransferFrom(address(mainContract), _recipient, amountToRecover);
    }
    
    // Track emergency recovery
    emergencyRecoveryQueue[_token] += amountToRecover;
    lastEmergencyAction[_token] = block.timestamp;
    
    emit EmergencyTokenRecovery(_token, _recipient, amountToRecover, tokensNeeded);
}

// Migration Data Analysis
function getV4MigrationData(uint256 _campaignId) external returns (
    bool needsMigration,
    bool hasMultipleAdmins,
    bool hasTokenAmounts,
    uint256 adminCount,
    uint256 tokenCount
) {
    // Check if campaign exists
    try mainContract.callModule("campaigns", abi.encodeWithSignature("getCampaign(uint256)", _campaignId)) returns (bytes memory campaignData) {
        (uint256 id, address admin, , , , , , , , , , , ) = abi.decode(campaignData, (uint256, address, string, string, uint256, uint256, uint256, uint256, bool, bool, address, bool, uint256));
        require(id != 0, "MigrationModule: Campaign does not exist");
        
        needsMigration = !campaignMigrated[_campaignId];
        
        // Check if primary admin has campaign admin privileges
        bytes memory isCampaignAdminData = mainContract.callModule("campaigns", abi.encodeWithSignature("isCampaignAdmin(uint256,address)", _campaignId, admin));
        bool primaryAdminHasAccess = abi.decode(isCampaignAdminData, (bool));
        
        if (!primaryAdminHasAccess) {
            needsMigration = true;
        }
        
        adminCount = 1; // At least the primary admin
        
        // Check for token amounts
        try mainContract.callModule("campaigns", abi.encodeWithSignature("getCampaignVotedTokens(uint256)", _campaignId)) returns (bytes memory tokensData) {
            address[] memory tokens = abi.decode(tokensData, (address[]));
            tokenCount = tokens.length;
            hasTokenAmounts = tokenCount > 0;
        } catch {
            tokenCount = 0;
            hasTokenAmounts = false;
        }
        
        hasMultipleAdmins = adminCount > 1;
    } catch {
        revert("MigrationModule: Campaign does not exist");
    }
}

function getMigrationProgress() external returns (
    uint256 totalCampaigns,
    uint256 migratedCampaigns,
    uint256 totalProjects,
    uint256 migratedProjects,
    uint256 totalUsers,
    uint256 migratedUsers,
    uint256 overallProgressPercentage
) {
    // Get total campaigns count
    bytes memory campaignCountData = mainContract.callModule("campaigns", abi.encodeWithSignature("getCampaignCount()"));
    totalCampaigns = abi.decode(campaignCountData, (uint256));
    
    // Get total projects count
    bytes memory projectCountData = mainContract.callModule("projects", abi.encodeWithSignature("getProjectCount()"));
    totalProjects = abi.decode(projectCountData, (uint256));
    
    migratedCampaigns = totalCampaignsMigrated;
    migratedProjects = totalProjectsMigrated;
    migratedUsers = totalUsersMigrated;
    
    // Calculate overall progress
    uint256 totalItems = totalCampaigns + totalProjects + totalUsers;
    uint256 migratedItems = migratedCampaigns + migratedProjects + migratedUsers;
    
    if (totalItems > 0) {
        overallProgressPercentage = (migratedItems * 100) / totalItems;
    }
}

// Batch Migration Status Check
function checkMigrationStatus(uint256[] memory _campaignIds) external view returns (
    bool[] memory migrationStatus,
    uint256 totalMigrated,
    uint256 totalPending
) {
    migrationStatus = new bool[](_campaignIds.length);
    
    for (uint256 i = 0; i < _campaignIds.length; i++) {
        migrationStatus[i] = campaignMigrated[_campaignIds[i]];
        if (migrationStatus[i]) {
            totalMigrated++;
        } else {
            totalPending++;
        }
    }
}

// Migration Validation
function validateMigrationIntegrity(uint256 _campaignId) external returns (
    bool isValid,
    string[] memory issues
) {
    string[] memory tempIssues = new string[](10);
    uint256 issueCount = 0;
    
    // Check if campaign exists
    try mainContract.callModule("campaigns", abi.encodeWithSignature("getCampaign(uint256)", _campaignId)) returns (bytes memory campaignData) {
        (uint256 id, address admin, , , , , , , , , , bool active, ) = abi.decode(campaignData, (uint256, address, string, string, uint256, uint256, uint256, uint256, bool, bool, address, bool, uint256));
        
        if (id == 0) {
            tempIssues[issueCount++] = "Campaign does not exist";
        }
        
        // Check admin access
        bytes memory isCampaignAdminData = mainContract.callModule("campaigns", abi.encodeWithSignature("isCampaignAdmin(uint256,address)", _campaignId, admin));
        bool hasAdminAccess = abi.decode(isCampaignAdminData, (bool));
        
        if (!hasAdminAccess) {
            tempIssues[issueCount++] = "Primary admin lacks campaign admin privileges";
        }
        
        // Check if marked as migrated but has issues
        if (campaignMigrated[_campaignId] && issueCount > 0) {
            tempIssues[issueCount++] = "Marked as migrated but has integrity issues";
        }
        
        // Check project participation integrity
        bytes memory projectIdsData = mainContract.callModule("voting", abi.encodeWithSignature("getProjectIdsByCampaign(uint256)", _campaignId));
        uint256[] memory projectIds = abi.decode(projectIdsData, (uint256[]));
        
        for (uint256 i = 0; i < projectIds.length; i++) {
            bytes memory isParticipatingData = mainContract.callModule("projects", abi.encodeWithSignature("isProjectParticipatingInCampaign(uint256,uint256)", projectIds[i], _campaignId));
            bool isParticipating = abi.decode(isParticipatingData, (bool));
            
            if (!isParticipating) {
                tempIssues[issueCount++] = "Project participation mismatch detected";
                break;
            }
        }
        
    } catch {
        tempIssues[issueCount++] = "Failed to validate campaign data";
    }
    
    isValid = issueCount == 0;
    
    // Create properly sized issues array
    issues = new string[](issueCount);
    for (uint256 i = 0; i < issueCount; i++) {
        issues[i] = tempIssues[i];
    }
}

// Internal Helper Functions
function _areTokensNeededForActiveCampaigns(address _token) internal returns (bool) {
    try mainContract.callModule("campaigns", abi.encodeWithSignature("getActiveCampaigns()")) returns (bytes memory activeCampaignsData) {
        uint256[] memory activeCampaigns = abi.decode(activeCampaignsData, (uint256[]));
        
        for (uint256 i = 0; i < activeCampaigns.length; i++) {
            bytes memory tokenAmountData = mainContract.callModule("campaigns", abi.encodeWithSignature("getCampaignTokenAmount(uint256,address)", activeCampaigns[i], _token));
            uint256 tokenAmount = abi.decode(tokenAmountData, (uint256));
            
            if (tokenAmount > 0) {
                return true;
            }
        }
    } catch {
        // If we can't check, assume tokens are needed for safety
        return true;
    }
    
    return false;
}

// Migration Cleanup
function cleanupFailedMigration(uint256 _campaignId) external hasRole(ADMIN_ROLE) {
    // Reset migration status for retry
    campaignMigrated[_campaignId] = false;
    if (totalCampaignsMigrated > 0) {
        totalCampaignsMigrated--;
    }
    
    emit MigrationStatusUpdated("cleanup", _campaignId, 0);
}

function resetMigrationStats() external hasRole(ADMIN_ROLE) {
    totalCampaignsMigrated = 0;
    totalProjectsMigrated = 0;
    totalUsersMigrated = 0;
    
    emit MigrationStatusUpdated("stats_reset", 0, 0);
}

// View Functions
function isCampaignMigrated(uint256 _campaignId) external view returns (bool) {
    return campaignMigrated[_campaignId];
}

function isProjectMigrated(uint256 _projectId) external view returns (bool) {
    return projectMigrated[_projectId];
}

function isUserMigrated(address _user) external view returns (bool) {
    return userMigrated[_user];
}

function isSuperAdmin(address _user) external view returns (bool) {
    return superAdmins[_user];
}

function getMigrationStats() external view returns (
    uint256 campaigns,
    uint256 projects,
    uint256 users
) {
    return (totalCampaignsMigrated, totalProjectsMigrated, totalUsersMigrated);
}

function getEmergencyRecoveryInfo(address _token) external view returns (
    uint256 totalRecovered,
    uint256 lastActionTimestamp
) {
    return (emergencyRecoveryQueue[_token], lastEmergencyAction[_token]);
}

// Module info
function getModuleName() external pure returns (string memory) {
    return "migration";
}

function getModuleVersion() external pure returns (uint256) {
    return 5;
}
}