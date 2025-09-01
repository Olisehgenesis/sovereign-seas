// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../interfaces/IModule.sol";
import "../interfaces/ISovereignSeasV5.sol";

/**
 * @title BaseModule
 * @notice Base contract for all SovereignSeas V5 modules
 * @dev Provides common functionality like access control, pausing, and proxy integration
 */
abstract contract BaseModule is 
    IModule,
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

    // Module state
    ISovereignSeasV5 public sovereignSeasProxy;
    bool public moduleActive;
    string public moduleName;
    string public moduleDescription;
    string[] public moduleDependencies;

    // Events
    event ModuleInitialized(string indexed moduleId, address indexed proxy);
    event ModulePaused(string indexed moduleId, address indexed by);
    event ModuleUnpaused(string indexed moduleId, address indexed by);
    event ModuleUpgraded(string indexed moduleId, address indexed newImplementation);

    // Modifiers

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "BaseModule: Admin role required");
        _;
    }

    modifier onlyManager() {
        require(hasRole(MANAGER_ROLE, msg.sender), "BaseModule: Manager role required");
        _;
    }

    modifier onlyOperator() {
        require(hasRole(OPERATOR_ROLE, msg.sender), "BaseModule: Operator role required");
        _;
    }

    modifier onlyEmergency() {
        require(hasRole(EMERGENCY_ROLE, msg.sender), "BaseModule: Emergency role required");
        _;
    }

    modifier whenActive() {
        require(moduleActive && !paused(), "BaseModule: Module is not active");
        _;
    }

    /**
     * @notice Initialize the base module
     * @param _proxy The main proxy contract address
     * @param _data Additional initialization data
     */
    function initialize(address _proxy, bytes calldata _data) external virtual override initializer {
        require(_proxy != address(0), "BaseModule: Invalid proxy address");
        
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

        emit ModuleInitialized(getModuleId(), _proxy);
    }

    /**
     * @notice Get the module's unique identifier
     * @return The module identifier string
     */
    function getModuleId() public pure virtual override returns (string memory);

    /**
     * @notice Get the module's version
     * @return The module version string
     */
    function getModuleVersion() public pure virtual override returns (string memory);

    /**
     * @notice Check if the module is active
     * @return True if the module is active
     */
    function isActive() public view override returns (bool) {
        return moduleActive && !paused();
    }

    /**
     * @notice Pause the module (emergency function)
     * @dev Only callable by emergency role
     */
    function pause() external override onlyEmergency {
        _pause();
        emit ModulePaused(getModuleId(), msg.sender);
    }

    /**
     * @notice Unpause the module
     * @dev Only callable by admin role
     */
    function unpause() external override onlyAdmin {
        _unpause();
        emit ModuleUnpaused(getModuleId(), msg.sender);
    }

    /**
     * @notice Get module metadata
     * @return name Module name
     * @return description Module description
     * @return dependencies Array of module dependencies
     */
    function getModuleMetadata() external view override returns (
        string memory name,
        string memory description,
        string[] memory dependencies
    ) {
        return (moduleName, moduleDescription, moduleDependencies);
    }

    /**
     * @notice Set module metadata
     * @param _name Module name
     * @param _description Module description
     * @param _dependencies Array of module dependencies
     */
    function setModuleMetadata(
        string calldata _name,
        string calldata _description,
        string[] calldata _dependencies
    ) external onlyAdmin {
        moduleName = _name;
        moduleDescription = _description;
        moduleDependencies = _dependencies;
    }

    /**
     * @notice Deactivate the module
     * @dev Only callable by admin role
     */
    function deactivate() external onlyAdmin {
        moduleActive = false;
    }

    /**
     * @notice Activate the module
     * @dev Only callable by admin role
     */
    function activate() external onlyAdmin {
        moduleActive = true;
    }

    /**
     * @notice Call another module through the proxy
     * @param _moduleId The target module identifier
     * @param _data The function call data
     * @return The return data from the module call
     */
    function callModule(string calldata _moduleId, bytes calldata _data) internal returns (bytes memory) {
        return sovereignSeasProxy.delegateToModule(_moduleId, _data);
    }

    /**
     * @notice Authorize upgrade (UUPS pattern)
     * @dev Only callable by admin role
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {
        emit ModuleUpgraded(getModuleId(), newImplementation);
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
