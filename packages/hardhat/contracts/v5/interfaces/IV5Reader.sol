// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IV5Reader - V5 Contract Reader Interface for V4
 * @notice Interface for V4 to read V5 data for new features like pools
 */
interface IV5Reader {
    // Project data
    function getProject(uint256 _projectId) external view returns (
        uint256 id,
        address owner,
        string memory name,
        string memory description,
        string memory bio,
        string memory contractInfo,
        string memory additionalData,
        string memory category,
        bool active,
        uint256 createdAt
    );
    
    // Pool data (new V5 feature)
    function getPool(uint256 _poolId) external view returns (
        uint256 id,
        address creator,
        string memory name,
        string memory description,
        address token,
        uint256 totalLiquidity,
        uint256 totalStaked,
        bool active,
        uint256 createdAt
    );
    
    // Check if ID exists in V5
    function projectExists(uint256 _projectId) external view returns (bool);
    function poolExists(uint256 _poolId) external view returns (bool);
    
    // Get V5 statistics
    function getTotalProjects() external view returns (uint256);
    function getTotalPools() external view returns (uint256);
    function getActiveProjects() external view returns (uint256);
    function getActivePools() external view returns (uint256);
    
    // Get V5 next IDs
    function getNextProjectId() external view returns (uint256);
    function getNextPoolId() external view returns (uint256);
}
