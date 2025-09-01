// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ISovereignSeasV5
 * @notice Main interface for SovereignSeas V5 proxy contract
 * @dev This interface defines the core proxy functionality
 */
interface ISovereignSeasV5 {
    /**
     * @notice Call a function on a specific module
     * @param _moduleId The module identifier
     * @param _data The function call data
     * @return The return data from the module call
     */
    function callModule(string calldata _moduleId, bytes calldata _data) external returns (bytes memory);

    /**
     * @notice Delegate a call to a module (for internal use)
     * @param _moduleId The module identifier
     * @param _data The function call data
     * @return The return data from the module call
     */
    function delegateToModule(string calldata _moduleId, bytes calldata _data) external returns (bytes memory);

    /**
     * @notice Register a new module
     * @param _moduleId The module identifier
     * @param _moduleAddress The module contract address
     * @param _dependencies Array of module dependencies
     */
    function registerModule(string calldata _moduleId, address _moduleAddress, string[] calldata _dependencies) external;

    /**
     * @notice Unregister a module
     * @param _moduleId The module identifier
     */
    function unregisterModule(string calldata _moduleId) external;

    /**
     * @notice Update a module's address
     * @param _moduleId The module identifier
     * @param _newAddress The new module address
     */
    function updateModuleAddress(string calldata _moduleId, address _newAddress) external;

    /**
     * @notice Get a module's address
     * @param _moduleId The module identifier
     * @return The module's contract address
     */
    function getModuleAddress(string calldata _moduleId) external view returns (address);

    /**
     * @notice Check if a module is registered
     * @param _moduleId The module identifier
     * @return True if the module is registered
     */
    function isModuleRegistered(string calldata _moduleId) external view returns (bool);

    /**
     * @notice Get all registered module IDs
     * @return Array of registered module identifiers
     */
    function getRegisteredModules() external view returns (string[] memory);

    /**
     * @notice Get module dependencies
     * @param _moduleId The module identifier
     * @return Array of module dependencies
     */
    function getModuleDependencies(string calldata _moduleId) external view returns (string[] memory);

    /**
     * @notice Check if the system is paused
     * @return True if the system is paused
     */
    function isPaused() external view returns (bool);

    /**
     * @notice Pause the entire system (emergency function)
     * @dev Only callable by emergency role
     */
    function pauseSystem() external;

    /**
     * @notice Unpause the system
     * @dev Only callable by admin role
     */
    function unpauseSystem() external;
}
