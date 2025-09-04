// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IV4Reader - Enhanced V4 Contract Reader Interface
 * @notice Interface for reading V4 contract data to prevent ID conflicts
 */
interface IV4Reader {
    // Project data
    function nextProjectId() external view returns (uint256);
    function projects(uint256) external view returns (
        uint256 id,
        address payable owner,
        string memory name,
        string memory description,
        string memory bioPart,
        string memory contractInfoPart,
        string memory additionalDataPart,
        bool transferrable,
        bool active,
        uint256 createdAt
    );
    
    // Campaign data
    function nextCampaignId() external view returns (uint256);
    function campaigns(uint256) external view returns (
        uint256 id,
        address admin,
        string memory name,
        string memory description,
        string memory mainInfo,
        string memory additionalInfo,
        uint256 startTime,
        uint256 endTime,
        uint256 adminFeePercentage,
        uint256 maxWinners,
        bool useQuadraticDistribution,
        bool useCustomDistribution,
        string memory customDistributionData,
        address payoutToken,
        bool active
    );
    
    // Check if ID exists
    function projectExists(uint256 _projectId) external view returns (bool);
    function campaignExists(uint256 _campaignId) external view returns (bool);
    
    // Get all existing IDs
    function getAllProjectIds() external view returns (uint256[] memory);
    function getAllCampaignIds() external view returns (uint256[] memory);
    
    // Get max used IDs
    function getMaxUsedProjectId() external view returns (uint256);
    function getMaxUsedCampaignId() external view returns (uint256);
}
