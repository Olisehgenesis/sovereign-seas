// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// Interface for all modules
interface IModule {
    function initialize(address _main) external;
    function getModuleName() external pure returns (string memory);
    function getModuleVersion() external pure returns (uint256);
}

/**
 * @title SovereignSeasV5 - Main Proxy Contract
 * @dev Main contract that delegates calls to specialized modules
 * Maintains V4 compatibility while providing modular architecture
 */
contract SovereignSeasV5 is 
    Initializable,
    AccessControlUpgradeable, 
    PausableUpgradeable, 
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    using Address for address;

    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    // Module addresses
    address public projectsModule;
    address public campaignsModule;
    address public treasuryModule;
    address public votingModule;
    address public migrationModule;
    
    // Module registry
    mapping(string => address) public modules;
    mapping(address => bool) public isModule;
    string[] public moduleNames;
    
    // Circuit Breaker
    bool public circuitBreakerTriggered;
    
    // Emergency settings
    uint256 public emergencyWithdrawalDelay;
    mapping(bytes4 => address) public methodToModule;
    
    // Events
    event ModuleRegistered(string moduleName, address moduleAddress);
    event ModuleDeregistered(string moduleName, address moduleAddress);
    event ModuleUpgraded(string moduleName, address oldAddress, address newAddress);
    event CircuitBreakerTriggered(address triggeredBy, string reason);
    event CircuitBreakerReset(address resetBy);
    event FallbackCalled(bytes4 selector, address module);

    // Modifiers
    modifier circuitBreakerCheck() {
        require(!circuitBreakerTriggered, "SovereignSeas: Circuit breaker triggered");
        _;
    }
    
    modifier onlyModule() {
        require(isModule[msg.sender], "SovereignSeas: Only modules can call this function");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _admin) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        
        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(MANAGER_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);
        
        // Initialize settings
        emergencyWithdrawalDelay = 24 hours;
        circuitBreakerTriggered = false;
    }

    // Upgrade Functions (for future proxy upgrades)
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // Module Management
    function registerModule(
        string memory _moduleName, 
        address _moduleAddress
    ) external onlyRole(ADMIN_ROLE) {
        require(_moduleAddress != address(0), "SovereignSeas: Invalid module address");
        require(modules[_moduleName] == address(0), "SovereignSeas: Module already registered");
        
        modules[_moduleName] = _moduleAddress;
        isModule[_moduleAddress] = true;
        moduleNames.push(_moduleName);
        
        // Register core modules in dedicated variables for gas optimization
        if (keccak256(bytes(_moduleName)) == keccak256("projects")) {
            projectsModule = _moduleAddress;
        } else if (keccak256(bytes(_moduleName)) == keccak256("campaigns")) {
            campaignsModule = _moduleAddress;
        } else if (keccak256(bytes(_moduleName)) == keccak256("treasury")) {
            treasuryModule = _moduleAddress;
        } else if (keccak256(bytes(_moduleName)) == keccak256("voting")) {
            votingModule = _moduleAddress;
        } else if (keccak256(bytes(_moduleName)) == keccak256("migration")) {
            migrationModule = _moduleAddress;
        }
        
        // Initialize the module
        IModule(_moduleAddress).initialize(address(this));
        
        emit ModuleRegistered(_moduleName, _moduleAddress);
    }
    
    function upgradeModule(
        string memory _moduleName, 
        address _newModuleAddress
    ) external onlyRole(ADMIN_ROLE) {
        address oldAddress = modules[_moduleName];
        require(oldAddress != address(0), "SovereignSeas: Module not registered");
        require(_newModuleAddress != address(0), "SovereignSeas: Invalid new module address");
        
        modules[_moduleName] = _newModuleAddress;
        isModule[oldAddress] = false;
        isModule[_newModuleAddress] = true;
        
        // Update core module variables
        if (keccak256(bytes(_moduleName)) == keccak256("projects")) {
            projectsModule = _newModuleAddress;
        } else if (keccak256(bytes(_moduleName)) == keccak256("campaigns")) {
            campaignsModule = _newModuleAddress;
        } else if (keccak256(bytes(_moduleName)) == keccak256("treasury")) {
            treasuryModule = _newModuleAddress;
        } else if (keccak256(bytes(_moduleName)) == keccak256("voting")) {
            votingModule = _newModuleAddress;
        } else if (keccak256(bytes(_moduleName)) == keccak256("migration")) {
            migrationModule = _newModuleAddress;
        }
        
        // Initialize the new module
        IModule(_newModuleAddress).initialize(address(this));
        
        emit ModuleUpgraded(_moduleName, oldAddress, _newModuleAddress);
    }
    
    function deregisterModule(string memory _moduleName) external onlyRole(ADMIN_ROLE) {
        address moduleAddress = modules[_moduleName];
        require(moduleAddress != address(0), "SovereignSeas: Module not registered");
        
        modules[_moduleName] = address(0);
        isModule[moduleAddress] = false;
        
        // Remove from moduleNames array
        for (uint256 i = 0; i < moduleNames.length; i++) {
            if (keccak256(bytes(moduleNames[i])) == keccak256(bytes(_moduleName))) {
                moduleNames[i] = moduleNames[moduleNames.length - 1];
                moduleNames.pop();
                break;
            }
        }
        
        emit ModuleDeregistered(_moduleName, moduleAddress);
    }

    // Method routing for gas optimization
    function registerMethodRoute(bytes4 _selector, address _module) external onlyRole(ADMIN_ROLE) {
        require(isModule[_module], "SovereignSeas: Invalid module");
        methodToModule[_selector] = _module;
    }

    // Emergency Functions
    function emergencyPause(string memory /* reason */) external onlyRole(EMERGENCY_ROLE) {
        _pause();
    }
    
    function emergencyUnpause() external onlyRole(EMERGENCY_ROLE) {
        _unpause();
    }
    
    function triggerCircuitBreaker(string memory reason) external onlyRole(EMERGENCY_ROLE) {
        circuitBreakerTriggered = true;
        emit CircuitBreakerTriggered(msg.sender, reason);
    }
    
    function resetCircuitBreaker() external onlyRole(ADMIN_ROLE) {
        circuitBreakerTriggered = false;
        emit CircuitBreakerReset(msg.sender);
    }

    // Module Communication Functions
    function callModule(
        string memory _moduleName, 
        bytes memory _data
    ) external onlyModule returns (bytes memory) {
        address moduleAddress = modules[_moduleName];
        require(moduleAddress != address(0), "SovereignSeas: Module not found");
        
        return moduleAddress.functionCall(_data);
    }
    
    function delegateToModule(
        string memory _moduleName, 
        bytes memory _data
    ) external returns (bytes memory) {
        address moduleAddress = modules[_moduleName];
        require(moduleAddress != address(0), "SovereignSeas: Module not found");
        
        // Use functionCall instead of functionDelegateCall for safety
        // This prevents arbitrary code execution in the proxy context
        return moduleAddress.functionCall(_data);
    }

    // Access Control Bridge Functions
    function hasModuleAccess(address _user, bytes32 _role) external view returns (bool) {
        return hasRole(_role, _user);
    }
    
    function grantModuleRole(address _user, bytes32 _role) external onlyModule {
        _grantRole(_role, _user);
    }
    
    function revokeModuleRole(address _user, bytes32 _role) external onlyModule {
        _revokeRole(_role, _user);
    }

    // View Functions
    function getModule(string memory _moduleName) external view returns (address) {
        return modules[_moduleName];
    }
    
    function getAllModules() external view returns (string[] memory names, address[] memory addresses) {
        names = moduleNames;
        addresses = new address[](moduleNames.length);
        
        for (uint256 i = 0; i < moduleNames.length; i++) {
            addresses[i] = modules[moduleNames[i]];
        }
    }
    
    function getModuleCount() external view returns (uint256) {
        return moduleNames.length;
    }

    // Fallback function for delegating calls to appropriate modules
    fallback() external payable circuitBreakerCheck whenNotPaused {
        bytes4 selector = msg.sig;
        address module = methodToModule[selector];
        
        if (module == address(0)) {
            // Try to route based on method prefix or common patterns
            module = _routeByMethodSignature(selector);
        }
        
        require(module != address(0), "SovereignSeas: Method not found in any module");
        
        emit FallbackCalled(selector, module);
        
        // Use a safer approach: call the module directly and return the result
        // This prevents arbitrary code execution in the proxy context
        (bool success, bytes memory data) = module.call{value: msg.value}(msg.data);
        
        if (!success) {
            // If the call fails, revert with the error data
            if (data.length > 0) {
                assembly {
                    let returndata_size := mload(data)
                    revert(add(32, data), returndata_size)
                }
            } else {
                revert("SovereignSeas: Module call failed");
            }
        }
        
        // Return the data from the module call
        assembly {
            return(add(data, 32), mload(data))
        }
    }
    
    receive() external payable {
        // Allow contract to receive ETH/CELO
    }

    // Internal routing logic
    function _routeByMethodSignature(bytes4 _selector) internal view returns (address) {
        // Route based on method naming conventions
        
        // Project methods
        if (_isProjectMethod(_selector)) {
            return projectsModule;
        }
        
        // Campaign methods
        if (_isCampaignMethod(_selector)) {
            return campaignsModule;
        }
        
        // Treasury methods
        if (_isTreasuryMethod(_selector)) {
            return treasuryModule;
        }
        
        // Voting methods
        if (_isVotingMethod(_selector)) {
            return votingModule;
        }
        
        // Migration methods
        if (_isMigrationMethod(_selector)) {
            return migrationModule;
        }
        
        return address(0);
    }
    
    function _isProjectMethod(bytes4 _selector) internal pure returns (bool) {
        return (
            _selector == bytes4(keccak256("createProject(string,string,string,string,string,address[],bool)")) ||
            _selector == bytes4(keccak256("updateProject(uint256,string,string,string,string,string,address[])")) ||
            _selector == bytes4(keccak256("transferProjectOwnership(uint256,address)")) ||
            _selector == bytes4(keccak256("getProject(uint256)")) ||
            _selector == bytes4(keccak256("getProjectMetadata(uint256)")) ||
            _selector == bytes4(keccak256("editProjectName(uint256,string)")) ||
            _selector == bytes4(keccak256("editProjectDescription(uint256,string)")) ||
            _selector == bytes4(keccak256("updateProjectMetadata(uint256,uint8,string)"))
        );
    }
    
    function _isCampaignMethod(bytes4 _selector) internal pure returns (bool) {
        return (
            _selector == bytes4(keccak256("createCampaign(string,string,string,string,uint256,uint256,uint256,uint256,bool,bool,string,address,address)")) ||
            _selector == bytes4(keccak256("updateCampaign(uint256,string,string,uint256,uint256,uint256,uint256,bool,bool,address)")) ||
            _selector == bytes4(keccak256("getCampaign(uint256)")) ||
            _selector == bytes4(keccak256("getCampaignMetadata(uint256)")) ||
            _selector == bytes4(keccak256("addCampaignAdmin(uint256,address)")) ||
            _selector == bytes4(keccak256("removeCampaignAdmin(uint256,address)")) ||
            _selector == bytes4(keccak256("editCampaignName(uint256,string)")) ||
            _selector == bytes4(keccak256("editCampaignDescription(uint256,string)"))
        );
    }
    
    function _isTreasuryMethod(bytes4 _selector) internal pure returns (bool) {
        return (
            _selector == bytes4(keccak256("withdrawFees(address,address,uint256)")) ||
            _selector == bytes4(keccak256("emergencyWithdraw(address,uint256)")) ||
            _selector == bytes4(keccak256("convertTokens(address,address,uint256)")) ||
            _selector == bytes4(keccak256("addSupportedToken(address)")) ||
            _selector == bytes4(keccak256("removeSupportedToken(address)")) ||
            _selector == bytes4(keccak256("setTokenExchangeProvider(address,address,bytes32)")) ||
            _selector == bytes4(keccak256("distributeFunds(uint256)")) ||
            _selector == bytes4(keccak256("manualDistributeDetailed(uint256,(uint256,uint256,string,bytes)[],address)"))
        );
    }
    
    function _isVotingMethod(bytes4 _selector) internal pure returns (bool) {
        return (
            _selector == bytes4(keccak256("vote(uint256,uint256,address,uint256,bytes32)")) ||
            _selector == bytes4(keccak256("voteWithCelo(uint256,uint256,bytes32)")) ||
            _selector == bytes4(keccak256("getUserVoteHistory(address)")) ||
            _selector == bytes4(keccak256("getUserVotesForProjectWithToken(uint256,address,uint256,address)")) ||
            _selector == bytes4(keccak256("getTotalUserVotesInCampaign(uint256,address)")) ||
            _selector == bytes4(keccak256("getProjectTokenVotes(uint256,uint256,address)")) ||
            _selector == bytes4(keccak256("addProjectToCampaign(uint256,uint256,address)")) ||
            _selector == bytes4(keccak256("removeProjectFromCampaign(uint256,uint256)")) ||
            _selector == bytes4(keccak256("approveProject(uint256,uint256)"))
        );
    }
    
    function _isMigrationMethod(bytes4 _selector) internal pure returns (bool) {
        return (
            _selector == bytes4(keccak256("migrateV4Campaign(uint256)")) ||
            _selector == bytes4(keccak256("migrateV4CampaignFull(uint256,address[],address[],uint256[])")) ||
            _selector == bytes4(keccak256("batchMigrateV4Campaigns(uint256[])")) ||
            _selector == bytes4(keccak256("getV4MigrationData(uint256)")) ||
            _selector == bytes4(keccak256("migrateSuperAdminToAccessControl(address)")) ||
            _selector == bytes4(keccak256("emergencyTokenRecovery(address,address,uint256,bool)"))
        );
    }

    // Admin functions for method routing
    function batchRegisterMethodRoutes(
        bytes4[] memory _selectors, 
        address[] memory _modules
    ) external onlyRole(ADMIN_ROLE) {
        require(_selectors.length == _modules.length, "SovereignSeas: Arrays length mismatch");
        
        for (uint256 i = 0; i < _selectors.length; i++) {
            require(isModule[_modules[i]], "SovereignSeas: Invalid module");
            methodToModule[_selectors[i]] = _modules[i];
        }
    }
    
    function getMethodRoute(bytes4 _selector) external view returns (address) {
        return methodToModule[_selector];
    }
    
    // Contract info
    function getContractVersion() external pure returns (string memory) {
        return "SovereignSeasV5";
    }
    
    function getImplementationVersion() external pure returns (uint256) {
        return 5;
    }
}