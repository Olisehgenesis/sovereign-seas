// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ISovereignSeasV4 {
    // Core Configuration
    function celoToken() external view returns (address);
    function PLATFORM_FEE() external view returns (uint256);
    function campaignCreationFee() external view returns (uint256);
    function projectAdditionFee() external view returns (uint256);
    function mentoTokenBroker() external view returns (address);
    
    // Counters
    function nextProjectId() external view returns (uint256);
    function nextCampaignId() external view returns (uint256);
    
    // Admin & Fees
    function superAdmins(address admin) external view returns (bool);
    function collectedFees(address token) external view returns (uint256);
    
    // Token Support
    function supportedTokens(address token) external view returns (bool);
    function getSupportedTokens() external view returns (address[] memory);
    
    // Token Exchange Providers
    function getTokenExchangeProvider(address token) external view returns (
        address provider, 
        bytes32 exchangeId, 
        bool active
    );
    
    // Projects
    function getProject(uint256 projectId) external view returns (
        uint256 id,
        address owner,
        string memory name,
        string memory description,
        bool transferrable,
        bool active,
        uint256 createdAt,
        uint256[] memory campaignIds
    );
    
    function getProjectMetadata(uint256 projectId) external view returns (
        string memory bio,
        string memory contractInfo,
        string memory additionalData,
        address[] memory contracts
    );
    
    // Campaigns
    function getCampaign(uint256 campaignId) external view returns (
        uint256 id,
        address admin,
        string memory name,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        uint256 adminFeePercentage,
        uint256 maxWinners,
        bool useQuadraticDistribution,
        bool useCustomDistribution,
        address payoutToken,
        bool active,
        uint256 totalFunds
    );
    
    function getCampaignMetadata(uint256 campaignId) external view returns (
        string memory mainInfo,
        string memory additionalInfo,
        string memory customDistributionData
    );
    
    // Campaign Admins
    function isCampaignAdmin(uint256 campaignId, address admin) external view returns (bool);
    
    // Project Participation
    function getParticipation(uint256 campaignId, uint256 projectId) external view returns (
        bool approved,
        uint256 voteCount,
        uint256 fundsReceived
    );
    
    // Votes
    function getUserVoteHistory(address user) external view returns (Vote[] memory);
    function getUserVotesForProjectWithToken(uint256 campaignId, address user, uint256 projectId, address token) external view returns (uint256);
    function getUserTotalVotesInCampaign(uint256 campaignId, address user) external view returns (uint256);
    function getProjectTokenVotes(uint256 campaignId, uint256 projectId, address token) external view returns (uint256);
    
    // Campaign Token Data
    function getCampaignVotedTokens(uint256 campaignId) external view returns (address[] memory);
    function getCampaignTokenAmount(uint256 campaignId, address token) external view returns (uint256);
    function getUserMaxVoteAmount(uint256 campaignId, address user) external view returns (uint256);
    
    // Project Participation Details
    function getProjectVotedTokensWithAmounts(uint256 campaignId, uint256 projectId) external view returns (
        address[] memory tokens,
        uint256[] memory amounts
    );
    
    // Sorted Projects
    function getSortedProjects(uint256 campaignId) external view returns (uint256[] memory);
    
    // Data Structure Versions
    function getDataStructureVersion(string memory dataType) external view returns (uint256);
    
    // Structs for return values
    struct Vote {
        address voter;
        uint256 campaignId;
        uint256 projectId;
        address token;
        uint256 amount;
        uint256 celoEquivalent;
    }
    
    struct TokenExchangeProvider {
        address provider;
        bytes32 exchangeId;
        bool active;
    }
}
