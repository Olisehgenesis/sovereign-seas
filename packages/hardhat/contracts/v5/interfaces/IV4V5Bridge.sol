// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IV4V5Bridge - Comprehensive V4-V5 Bridge Interface
 * @notice Smart data resolution between V4 and V5 systems
 */
interface IV4V5Bridge {
    
    // ==================== PROJECT DATA RESOLUTION ====================
    
    /**
     * @notice Get comprehensive project data (V4 first, then V5)
     * @param _projectId Project ID to resolve
     * @return exists True if project exists in either V4 or V5
     * @return isV4Project True if project exists in V4
     * @return isV5Project True if project exists in V5
     * @return v4Data V4 project data (if exists)
     * @return v5Data V5 project data (if exists)
     */
    function getComprehensiveProjectData(uint256 _projectId) external view returns (
        bool exists,
        bool isV4Project,
        bool isV5Project,
        ProjectData memory v4Data,
        ProjectData memory v5Data
    );
    
    /**
     * @notice Get project owner with comprehensive access
     * @param _projectId Project ID
     * @return owner Project owner address
     * @return isV4Owner True if owner from V4
     * @return isV5Owner True if owner from V5
     * @return hasFullAccess True if caller has full access to project data
     */
    function getProjectOwnerWithAccess(uint256 _projectId) external view returns (
        address owner,
        bool isV4Owner,
        bool isV5Owner,
        bool hasFullAccess
    );
    
    // ==================== CAMPAIGN DATA RESOLUTION ====================
    
    /**
     * @notice Get campaign data (V4 only, V5 campaigns not migrated)
     * @param _campaignId Campaign ID
     * @return exists True if campaign exists in V4
     * @return campaignData V4 campaign data
     */
    function getCampaignData(uint256 _campaignId) external view returns (
        bool exists,
        CampaignData memory campaignData
    );
    
    /**
     * @notice Get project participation in campaigns
     * @param _projectId Project ID
     * @return v4Campaigns V4 campaigns this project participated in
     * @return v5Campaigns V5 campaigns this project participated in
     */
    function getProjectCampaignParticipation(uint256 _projectId) external view returns (
        uint256[] memory v4Campaigns,
        uint256[] memory v5Campaigns
    );
    
    // ==================== V5 NEW FEATURES ACCESS ====================
    
    /**
     * @notice Get V5 pools data (new feature)
     * @param _poolId Pool ID
     * @return exists True if pool exists in V5
     * @return poolData V5 pool data
     */
    function getV5PoolData(uint256 _poolId) external view returns (
        bool exists,
        PoolData memory poolData
    );
    
    /**
     * @notice Get all V5 pools for a project
     * @param _projectId Project ID
     * @return pools Array of pool IDs associated with project
     */
    function getProjectV5Pools(uint256 _projectId) external view returns (uint256[] memory pools);
    
    // ==================== COMPREHENSIVE DATA STRUCTS ====================
    
    struct ProjectData {
        uint256 id;
        address owner;
        string name;
        string description;
        string bio;
        string contractInfo;
        string additionalData;
        string category;
        address[] contracts;
        bool transferrable;
        bool active;
        uint256 createdAt;
        uint256 updatedAt;
        uint256 totalFundsRaised;
        uint256 totalVotesReceived;
        bool verified;
        string[] tags;
        string jsonMetadata; // Replaced mapping with JSON string
    }
    
    struct CampaignData {
        uint256 id;
        address admin;
        string name;
        string description;
        uint256 startTime;
        uint256 endTime;
        uint256 adminFeePercentage;
        uint256 maxWinners;
        bool useQuadraticDistribution;
        bool useCustomDistribution;
        string customDistributionData;
        address payoutToken;
        bool active;
        uint256 totalFunds;
        uint256 totalParticipants;
    }
    
    struct PoolData {
        uint256 id;
        address creator;
        string name;
        string description;
        address token;
        uint256 totalLiquidity;
        uint256 totalStaked;
        uint256 apy;
        bool active;
        uint256 createdAt;
        uint256[] associatedProjects;
    }
    
    // ==================== EVENTS ====================
    
    event ProjectDataResolved(uint256 indexed projectId, bool v4Exists, bool v5Exists);
    event CampaignDataResolved(uint256 indexed campaignId, bool v4Exists);
    event PoolDataResolved(uint256 indexed poolId, bool v5Exists);
    event V4V5BridgeInitialized(address indexed v4Contract, address indexed v5Contract);
}
