// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/ISovereignSeasV5.sol";
import "./interfaces/IModule.sol";

/**
 * @title SovereignSeasV5
 * @notice Main proxy contract for SovereignSeas V5 modular architecture
 * @dev Uses UUPS upgradeable pattern with module routing system
 */
contract SovereignSeasV5 is 
    ISovereignSeasV5,
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    // Module management
    mapping(string => address) public modules;
    mapping(string => string[]) public moduleDependencies;
    mapping(string => bool) public moduleActive;
    string[] public registeredModules;

    // Circuit breaker
    bool public systemPaused;

    // Events
    event ModuleRegistered(string indexed moduleId, address indexed moduleAddress);
    event ModuleUnregistered(string indexed moduleId);
    event ModuleUpdated(string indexed moduleId, address indexed newAddress);
    event SystemPaused(address indexed by);
    event SystemUnpaused(address indexed by);
    event ModuleCall(string indexed moduleId, address indexed caller, bytes data);
    event ModuleCallResult(string indexed moduleId, bool success, bytes result);

    // Modifiers
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "SovereignSeasV5: Admin role required");
        _;
    }

    modifier onlyManager() {
        require(hasRole(MANAGER_ROLE, msg.sender), "SovereignSeasV5: Manager role required");
        _;
    }

    modifier onlyOperator() {
        require(hasRole(OPERATOR_ROLE, msg.sender), "SovereignSeasV5: Operator role required");
        _;
    }

    modifier onlyEmergency() {
        require(hasRole(EMERGENCY_ROLE, msg.sender), "SovereignSeasV5: Emergency role required");
        _;
    }

    modifier whenSystemNotPaused() {
        require(!systemPaused, "SovereignSeasV5: System is paused");
        _;
    }

    modifier moduleExists(string calldata _moduleId) {
        require(modules[_moduleId] != address(0), "SovereignSeasV5: Module does not exist");
        _;
    }

    modifier moduleActiveModifier(string calldata _moduleId) {
        require(moduleActive[_moduleId], "SovereignSeasV5: Module is not active");
        _;
    }

    /**
     * @notice Initialize the SovereignSeas V5 proxy
     * @param _admin The initial admin address
     */
    function initialize(address _admin) external initializer {
        require(_admin != address(0), "SovereignSeasV5: Invalid admin address");

        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(MANAGER_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);

        // Initialize inherited contracts
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
    }

    /**
     * @notice Call a function on a specific module
     * @param _moduleId The module identifier
     * @param _data The function call data
     * @return The return data from the module call
     */
    function callModule(string calldata _moduleId, bytes calldata _data) 
        external 
        override 
        whenNotPaused 
        moduleExists(_moduleId) 
        moduleActiveModifier(_moduleId) 
        nonReentrant 
        returns (bytes memory) 
    {
        emit ModuleCall(_moduleId, msg.sender, _data);

        address moduleAddress = modules[_moduleId];
        bool success;
        bytes memory result;

        // Delegate call to the module
        (success, result) = moduleAddress.delegatecall(_data);

        emit ModuleCallResult(_moduleId, success, result);

        if (!success) {
            // Revert with the error from the module
            assembly {
                revert(add(result, 32), mload(result))
            }
        }

        return result;
    }

    /**
     * @notice Delegate a call to a module (for internal use)
     * @param _moduleId The module identifier
     * @param _data The function call data
     * @return The return data from the module call
     */
    function delegateToModule(string calldata _moduleId, bytes calldata _data) 
        external 
        override 
        whenNotPaused 
        moduleExists(_moduleId) 
        moduleActiveModifier(_moduleId) 
        returns (bytes memory) 
    {
        address moduleAddress = modules[_moduleId];
        bool success;
        bytes memory result;

        // Delegate call to the module
        (success, result) = moduleAddress.delegatecall(_data);

        if (!success) {
            // Revert with the error from the module
            assembly {
                revert(add(result, 32), mload(result))
            }
        }

        return result;
    }

    /**
     * @notice Register a new module
     * @param _moduleId The module identifier
     * @param _moduleAddress The module contract address
     * @param _dependencies Array of module dependencies
     */
    function registerModule(
        string calldata _moduleId, 
        address _moduleAddress, 
        string[] calldata _dependencies
    ) external onlyAdmin {
        require(_moduleAddress != address(0), "SovereignSeasV5: Invalid module address");
        require(modules[_moduleId] == address(0), "SovereignSeasV5: Module already exists");

        // Verify dependencies exist
        for (uint256 i = 0; i < _dependencies.length; i++) {
            require(modules[_dependencies[i]] != address(0), "SovereignSeasV5: Dependency does not exist");
        }

        modules[_moduleId] = _moduleAddress;
        moduleDependencies[_moduleId] = _dependencies;
        moduleActive[_moduleId] = true;
        registeredModules.push(_moduleId);

        emit ModuleRegistered(_moduleId, _moduleAddress);
    }

    /**
     * @notice Unregister a module
     * @param _moduleId The module identifier
     */
    function unregisterModule(string calldata _moduleId) external onlyAdmin moduleExists(_moduleId) {
        // Check if other modules depend on this module
        for (uint256 i = 0; i < registeredModules.length; i++) {
            string[] memory deps = moduleDependencies[registeredModules[i]];
            for (uint256 j = 0; j < deps.length; j++) {
                require(
                    keccak256(bytes(deps[j])) != keccak256(bytes(_moduleId)),
                    "SovereignSeasV5: Module has dependencies"
                );
            }
        }

        delete modules[_moduleId];
        delete moduleDependencies[_moduleId];
        delete moduleActive[_moduleId];

        // Remove from registered modules array
        for (uint256 i = 0; i < registeredModules.length; i++) {
            if (keccak256(bytes(registeredModules[i])) == keccak256(bytes(_moduleId))) {
                registeredModules[i] = registeredModules[registeredModules.length - 1];
                registeredModules.pop();
                break;
            }
        }

        emit ModuleUnregistered(_moduleId);
    }

    /**
     * @notice Update a module's address
     * @param _moduleId The module identifier
     * @param _newAddress The new module address
     */
    function updateModuleAddress(string calldata _moduleId, address _newAddress) 
        external 
        onlyAdmin 
        moduleExists(_moduleId) 
    {
        require(_newAddress != address(0), "SovereignSeasV5: Invalid module address");
        
        address oldAddress = modules[_moduleId];
        modules[_moduleId] = _newAddress;

        emit ModuleUpdated(_moduleId, _newAddress);
    }

    /**
     * @notice Get a module's address
     * @param _moduleId The module identifier
     * @return The module's contract address
     */
    function getModuleAddress(string calldata _moduleId) external view override returns (address) {
        return modules[_moduleId];
    }

    /**
     * @notice Check if a module is registered
     * @param _moduleId The module identifier
     * @return True if the module is registered
     */
    function isModuleRegistered(string calldata _moduleId) external view override returns (bool) {
        return modules[_moduleId] != address(0);
    }

    /**
     * @notice Get all registered module IDs
     * @return Array of registered module identifiers
     */
    function getRegisteredModules() external view override returns (string[] memory) {
        return registeredModules;
    }

    /**
     * @notice Get module dependencies
     * @param _moduleId The module identifier
     * @return Array of module dependencies
     */
    function getModuleDependencies(string calldata _moduleId) external view override returns (string[] memory) {
        return moduleDependencies[_moduleId];
    }

    /**
     * @notice Check if the system is paused
     * @return True if the system is paused
     */
    function isPaused() external view override returns (bool) {
        return systemPaused;
    }

    /**
     * @notice Pause the entire system (emergency function)
     * @dev Only callable by emergency role
     */
    function pauseSystem() external override onlyEmergency {
        systemPaused = true;
        emit SystemPaused(msg.sender);
    }

    /**
     * @notice Unpause the system
     * @dev Only callable by admin role
     */
    function unpauseSystem() external override onlyAdmin {
        systemPaused = false;
        emit SystemUnpaused(msg.sender);
    }

    /**
     * @notice Set module active status
     * @param _moduleId The module identifier
     * @param _active The active status
     */
    function setModuleActive(string calldata _moduleId, bool _active) external onlyAdmin moduleExists(_moduleId) {
        moduleActive[_moduleId] = _active;
    }

    /**
     * @notice Authorize upgrade (UUPS pattern)
     * @dev Only callable by admin role
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {
        // Upgrade logic here if needed
    }

    /**
     * @notice Fallback function for automatic module routing
     * @dev Routes calls to appropriate modules based on function signature
     */
    fallback() external whenNotPaused {
        // Extract function selector from calldata
        bytes4 selector = msg.sig;
        
        // Route to appropriate module based on function selector
        // This is a simplified routing - in practice, you'd have a more sophisticated mapping
        string memory moduleId = _getModuleForSelector(selector);
        
        if (bytes(moduleId).length > 0 && modules[moduleId] != address(0) && moduleActive[moduleId]) {
            address moduleAddress = modules[moduleId];
            
            // Delegate call to the module
            (bool success, bytes memory result) = moduleAddress.delegatecall(msg.data);
            
            if (success) {
                assembly {
                    return(add(result, 32), mload(result))
                }
            } else {
                assembly {
                    revert(add(result, 32), mload(result))
                }
            }
        } else {
            revert("SovereignSeasV5: Function not found or module not available");
        }
    }

    /**
     * @notice Get the module for a given function selector
     * @param _selector The function selector
     * @return The module identifier
     */
    function _getModuleForSelector(bytes4 _selector) internal pure returns (string memory) {
        // This is a simplified mapping - in practice, you'd have a comprehensive mapping
        // of function selectors to module IDs
        
        // Example mappings (these would be expanded based on actual function signatures)
        if (_selector == bytes4(keccak256("createProject(string,string,string)"))) {
            return "projects";
        } else if (_selector == bytes4(keccak256("createCampaign(string,string,uint256,uint256)"))) {
            return "campaigns";
        } else if (_selector == bytes4(keccak256("vote(uint256,uint256,address,uint256)"))) {
            return "voting";
        } else if (_selector == bytes4(keccak256("collectFee(address,uint256,string)"))) {
            return "treasury";
        } else if (_selector == bytes4(keccak256("distributeFunds(uint256)"))) {
            return "pools";
        } else if (_selector == bytes4(keccak256("migrateProject(uint256)"))) {
            return "migration";
        }
        
        return "";
    }

    /**
     * @notice Grant role to address
     * @param _role The role to grant
     * @param _account The account to grant the role to
     */
    function grantRole(bytes32 _role, address _account) public override onlyAdmin {
        super.grantRole(_role, _account);
    }

    /**
     * @notice Revoke role from address
     * @param _role The role to revoke
     * @param _account The account to revoke the role from
     */
    function revokeRole(bytes32 _role, address _account) public override onlyAdmin {
        super.revokeRole(_role, _account);
    }

    /**
     * @notice Check if the contract supports an interface
     * @param interfaceId The interface ID to check
     * @return True if the interface is supported
     */
    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
