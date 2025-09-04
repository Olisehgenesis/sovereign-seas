// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IModule
 * @notice Core interface for all SovereignSeas V5 modules
 * @dev All modules must implement this interface for proxy compatibility
 */
interface IModule {
    /**
     * @notice Initialize the module with required parameters
     * @param _proxy The main proxy contract address
     * @param _data Additional initialization data
     */
    function initialize(address _proxy, bytes calldata _data) external;

    /**
     * @notice Get the module's unique identifier
     * @return The module identifier string
     */
    function getModuleId() external pure returns (string memory);

    /**
     * @notice Get the module's version
     * @return The module version string
     */
    function getModuleVersion() external pure returns (string memory);

    /**
     * @notice Check if the module is active
     * @return True if the module is active
     */
    function isActive() external view returns (bool);

    /**
     * @notice Pause the module (emergency function)
     * @dev Only callable by proxy
     */
    function pause() external;

    /**
     * @notice Unpause the module
     * @dev Only callable by proxy
     */
    function unpause() external;

    /**
     * @notice Get module metadata
     * @return name Module name
     * @return description Module description
     * @return dependencies Array of module dependencies
     */
    function getModuleMetadata() external view returns (
        string memory name,
        string memory description,
        string[] memory dependencies
    );

    /**
     * @notice Set the original caller (only callable by proxy)
     * @param _caller The original caller address
     */
    function setOriginalCaller(address _caller) external;

    /**
     * @notice Get the original caller address
     * @return The original caller address
     */
    function getOriginalCaller() external view returns (address);

    /**
     * @notice Get the effective caller (original caller if set, otherwise msg.sender)
     * @return The effective caller address
     */
    function getEffectiveCaller() external view returns (address);

}
