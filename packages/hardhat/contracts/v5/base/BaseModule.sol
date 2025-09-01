// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../interfaces/IModule.sol";
import "../interfaces/ISovereignSeasV5.sol";

/**
 * @title BaseModule
 * @notice Base contract for all SovereignSeas V5 modules
 * @dev Provides common functionality without access control conflicts
 * All access control is managed centrally by the proxy
 */
abstract contract BaseModule is 
    IModule,
    Initializable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    // Module state - no access control here
    ISovereignSeasV5 public sovereignSeasProxy;
    bool public moduleActive;
    bool public modulePaused;
    string public moduleName;
    string public moduleDescription;
    string[] public moduleDependencies;

    // Events
    event ModuleInitialized(string indexed moduleId, address indexed proxy);
    event ModuleUpgraded(string indexed moduleId, address indexed newImplementation);

    // Modifiers
    modifier whenActive() {
        require(moduleActive && !modulePaused, "BaseModule: Module is not active");
        _;
    }

    modifier whenNotPaused() {
        require(!modulePaused, "BaseModule: Module is paused");
        _;
    }

    modifier onlyProxyCaller() {
        require(msg.sender == address(sovereignSeasProxy), "BaseModule: Only proxy can call");
        _;
    }

    modifier onlyMainContract() {
        require(msg.sender == address(sovereignSeasProxy), "BaseModule: Only main contract can call");
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

        // Initialize inherited contracts
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
        return moduleActive;
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
     * @notice Set module metadata (only callable by proxy)
     * @param _name Module name
     * @param _description Module description
     * @param _dependencies Array of module dependencies
     */
    function setModuleMetadata(
        string calldata _name,
        string calldata _description,
        string[] calldata _dependencies
    ) external onlyProxyCaller {
        moduleName = _name;
        moduleDescription = _description;
        moduleDependencies = _dependencies;
    }

    /**
     * @notice Deactivate the module (only callable by proxy)
     */
    function deactivate() external onlyProxyCaller {
        moduleActive = false;
    }

    /**
     * @notice Activate the module (only callable by proxy)
     */
    function activate() external onlyProxyCaller {
        moduleActive = true;
    }

    /**
     * @notice Pause the module (only callable by proxy)
     */
    function pause() external onlyProxyCaller {
        modulePaused = true;
    }

    /**
     * @notice Unpause the module (only callable by proxy)
     */
    function unpause() external onlyProxyCaller {
        modulePaused = false;
    }

    /**
     * @notice Call another module through the proxy
     * @param _moduleId The target module identifier
     * @param _data The function call data
     * @return The return data from the module call
     */
    function callModule(string memory _moduleId, bytes memory _data) internal returns (bytes memory) {
        return sovereignSeasProxy.delegateToModule(_moduleId, _data);
    }

    /**
     * @notice View-safe module call helper
     */
    function callModuleView(string memory _moduleId, bytes memory _data) internal view returns (bytes memory) {
        return sovereignSeasProxy.staticCallModule(_moduleId, _data);
    }

    /**
     * @notice Authorize upgrade (UUPS pattern)
     * @dev Only callable by proxy admin
     */
    function _authorizeUpgrade(address newImplementation) internal virtual override {
        // Only proxy can upgrade modules
        require(msg.sender == address(sovereignSeasProxy), "BaseModule: Only proxy can upgrade");
        emit ModuleUpgraded(getModuleId(), newImplementation);
    }

    /**
     * @notice Check if caller has role through proxy
     * @param _role The role to check
     * @param _account The account to check
     * @return True if the account has the role
     */
    function _hasRole(bytes32 _role, address _account) internal view returns (bool) {
        // Delegate role checking to the proxy contract
        try sovereignSeasProxy.hasRole(_role, _account) returns (bool hasRole) {
            return hasRole;
        } catch {
            // If proxy call fails, fall back to basic admin check
            return _account == address(sovereignSeasProxy);
        }
    }

    /**
     * @notice Check if caller has admin role through proxy
     * @param _account The account to check
     * @return True if the account has admin role
     */
    function _isAdmin(address _account) internal view returns (bool) {
        return _hasRole(keccak256("ADMIN_ROLE"), _account);
    }

    /**
     * @notice Check if caller has manager role through proxy
     * @param _account The account to check
     * @return True if the account has manager role
     */
    function _isManager(address _account) internal view returns (bool) {
        return _hasRole(keccak256("MANAGER_ROLE"), _account);
    }

    /**
     * @notice Check if caller has operator role through proxy
     * @param _account The account to check
     * @return True if the account has operator role
     */
    function _isOperator(address _account) internal view returns (bool) {
        return _hasRole(keccak256("OPERATOR_ROLE"), _account);
    }

    /**
     * @notice Check if caller has emergency role through proxy
     * @param _account The account to check
     * @return True if the account has emergency role
     */
    function _isEmergency(address _account) internal view returns (bool) {
        return _hasRole(keccak256("EMERGENCY_ROLE"), _account);
    }
}
