// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SovereignSeasTypes
 * @dev Contains all the types and structs used across the SovereignSeas system
 */
contract SovereignSeasTypes {
    // Campaign types
    enum CampaignType {
        Project,  // Project funding campaign
        Person,   // Person voting campaign
        Poll,     // Simple poll (with optional refunds)
        General   // General purpose voting
    }

    // Vote distribution types
    enum DistributionType {
        Linear,    // Linear distribution based on votes
        Quadratic, // Quadratic distribution based on sqrt(votes)
        Equal,     // Equal distribution among winners
        Winner     // Winner takes all
    }

    // Campaign creation structs to avoid stack too deep errors
    struct CampaignBasicInfo {
        string name;
        string description;
        string logo;
        string demoVideo;
        uint256 startTime;
        uint256 endTime;
        uint256 adminFeePercentage;
    }

    struct CampaignExtendedInfo {
        uint256 voteMultiplier;
        uint256 maxWinners;
        CampaignType campaignType;
        DistributionType distributionType;
        bool refundable;
        bool isPrivate;
    }

    // Campaign struct
    struct Campaign {
        uint256 id;
        address admin;
        string name;
        string description;
        string logo;          
        string demoVideo;     
        uint256 startTime;
        uint256 endTime;
        uint256 adminFeePercentage;
        uint256 voteMultiplier; // 1-5 votes per CELO
        uint256 maxWinners; // Maximum number of winning entities
        CampaignType campaignType;
        DistributionType distributionType;
        bool refundable;      // If true, voters can get refunds after campaign ends if selected
        bool isPrivate;       // If true, only whitelisted addresses can participate
        bool active;
        uint256 totalFunds;
        mapping(address => bool) campaignAdmins; // Multiple admins for a campaign
        mapping(address => bool) whitelistedVoters; // Whitelisted voters for private campaigns
    }

    // Entity struct (can be a project, person, poll option, etc.)
    struct Entity {
        uint256 id;
        uint256 campaignId;
        address payable owner;
        string name;
        string description;
        string[] mediaLinks;      // Array of media links (images, videos, etc.)
        string[] externalLinks;   // Array of external links (github, social, website, etc.)
        address[] contracts;      // Array of associated contract addresses
        bytes extraData;          // Additional data (can be used for specific campaign types)
        bool approved;
        bool active;
        uint256 voteCount;
        uint256 fundsReceived;
    }

    // Vote struct
    struct Vote {
        address voter;
        uint256 campaignId;
        uint256 entityId;
        uint256 amount;
        uint256 voteCount;
        bool refunded;           // Whether the vote has been refunded
    }
    
    // Comment struct
    struct Comment {
        uint256 id;
        address commenter;
        uint256 campaignId;
        uint256 entityId;
        string content;
        uint256 timestamp;
        bool isActive;
    }
}

/**
 * @title SovereignSeasStorage
 * @dev Manages all storage for the SovereignSeas system
 */
contract SovereignSeasStorage is SovereignSeasTypes, Ownable {
    // Platform fee (15%)
    uint256 public constant PLATFORM_FEE = 15;

    // Creation fees
    uint256 public constant CAMPAIGN_CREATION_FEE = 2 ether; // 2 CELO
    uint256 public constant ENTITY_CREATION_FEE = 1 ether;  // 1 CELO
    uint256 public constant POLL_CREATION_FEE = 0.5 ether;  // 0.5 CELO
    uint256 public constant COMMENT_FEE = 0.01 ether;      // 0.01 CELO

    // Total accumulated fees
    uint256 public totalCreationFees;

    // Super admins mapping
    mapping(address => bool) public superAdmins;

    // Storage for campaigns
    Campaign[] public campaigns;

    // Make Entity struct accessible outside the contract
    Entity[] public entities;

    // Storage for entities by campaign
    mapping(uint256 => Entity[]) internal campaignEntities;

    // Vote tracking
    mapping(uint256 => mapping(address => mapping(uint256 => uint256))) public userVotes; // campaignId => user => entityId => voteAmount
    mapping(uint256 => mapping(address => uint256)) public totalUserVotesInCampaign; // campaignId => user => totalVotes
    mapping(address => Vote[]) public userVoteHistory;
    
    // Comment storage
    mapping(uint256 => mapping(uint256 => Comment[])) public entityComments; // campaignId => entityId => comments
    mapping(address => Comment[]) public userCommentHistory;

    // Events
    event CampaignCreated(uint256 indexed campaignId, address indexed admin, string name, CampaignType campaignType, bool isPrivate);
    event CampaignUpdated(uint256 indexed campaignId, address indexed updatedBy);
    event CampaignDeactivated(uint256 indexed campaignId, address indexed deactivatedBy);
    event EntitySubmitted(uint256 indexed campaignId, uint256 indexed entityId, address indexed owner);
    event EntityUpdated(uint256 indexed campaignId, uint256 indexed entityId, address indexed updatedBy);
    event EntityApproved(uint256 indexed campaignId, uint256 indexed entityId);
    event EntityDeactivated(uint256 indexed campaignId, uint256 indexed entityId, address indexed deactivatedBy);
    event VoteCast(
        address indexed voter, uint256 indexed campaignId, uint256 indexed entityId, uint256 amount, uint256 voteCount
    );
    event VoteRefunded(address indexed voter, uint256 indexed campaignId, uint256 indexed entityId, uint256 amount);
    event FundsDistributed(uint256 indexed campaignId);
    event SuperAdminAdded(address indexed newSuperAdmin, address indexed addedBy);
    event SuperAdminRemoved(address indexed superAdmin, address indexed removedBy);
    event CampaignAdminAdded(uint256 indexed campaignId, address indexed newAdmin, address indexed addedBy);
    event CampaignAdminRemoved(uint256 indexed campaignId, address indexed admin, address indexed removedBy);
    event CreationFeesWithdrawn(address indexed superAdmin, uint256 amount);
    event VoterWhitelisted(uint256 indexed campaignId, address indexed voter, address indexed whitelistedBy);
    event VoterRemovedFromWhitelist(uint256 indexed campaignId, address indexed voter, address indexed removedBy);
    event CommentAdded(uint256 indexed campaignId, uint256 indexed entityId, uint256 commentId, address indexed commenter);
    event CommentRemoved(uint256 indexed campaignId, uint256 indexed entityId, uint256 commentId, address indexed removedBy);

    /**
     * @dev Constructor adds deployer as super admin
     */
    constructor() Ownable(msg.sender) {
        superAdmins[msg.sender] = true;
    }

    /**
     * @dev Modifier to check if caller is a super admin
     */
    modifier onlySuperAdmin() {
        require(superAdmins[msg.sender], "Only super admin can call this function");
        _;
    }

    /**
     * @dev Modifier to check if caller is a campaign admin
     */
    modifier onlyCampaignAdmin(uint256 _campaignId) {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        require(
            msg.sender == campaigns[_campaignId].admin || 
            campaigns[_campaignId].campaignAdmins[msg.sender] || 
            superAdmins[msg.sender],
            "Only campaign admin or super admin can call this function"
        );
        _;
    }

    /**
     * @dev Add a new super admin
     * @param _newSuperAdmin Address of the new super admin
     */
    function addSuperAdmin(address _newSuperAdmin) external onlySuperAdmin {
        require(_newSuperAdmin != address(0), "Invalid address");
        require(!superAdmins[_newSuperAdmin], "Already a super admin");
        
        superAdmins[_newSuperAdmin] = true;
        emit SuperAdminAdded(_newSuperAdmin, msg.sender);
    }

    /**
     * @dev Remove a super admin
     * @param _superAdmin Address of the super admin to remove
     */
    function removeSuperAdmin(address _superAdmin) external onlySuperAdmin {
        require(_superAdmin != msg.sender, "Cannot remove yourself");
        require(superAdmins[_superAdmin], "Not a super admin");
        
        superAdmins[_superAdmin] = false;
        emit SuperAdminRemoved(_superAdmin, msg.sender);
    }

    /**
     * @dev Withdraw accumulated creation fees (only by super admin)
     */
    function withdrawCreationFees() external onlySuperAdmin {
        uint256 amount = totalCreationFees;
        require(amount > 0, "No fees to withdraw");
        
        totalCreationFees = 0;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Fee withdrawal failed");
        
        emit CreationFeesWithdrawn(msg.sender, amount);
    }

    // Getters
    
    /**
     * @dev Get campaign details by ID
     * @param _campaignId Campaign ID
     * @return id Campaign ID
     * @return admin Campaign admin address
     * @return name Campaign name
     * @return description Campaign description
     * @return logo Campaign logo URL/IPFS hash
     * @return demoVideo Campaign demo video URL/IPFS hash
     * @return startTime Campaign start time (unix timestamp)
     * @return endTime Campaign end time (unix timestamp)
     * @return adminFeePercentage Admin fee percentage
     * @return voteMultiplier Vote multiplier
     * @return maxWinners Maximum number of winning entities
     * @return campaignType Type of campaign
     * @return distributionType Type of distribution
     * @return refundable Whether votes can be refunded
     * @return isPrivate Whether the campaign is private
     * @return active Whether the campaign is active
     * @return totalFunds Total funds in the campaign
     */
    function getCampaign(uint256 _campaignId) external view returns (
        uint256 id,
        address admin,
        string memory name,
        string memory description,
        string memory logo,
        string memory demoVideo,
        uint256 startTime,
        uint256 endTime,
        uint256 adminFeePercentage,
        uint256 voteMultiplier,
        uint256 maxWinners,
        CampaignType campaignType,
        DistributionType distributionType,
        bool refundable,
        bool isPrivate,
        bool active,
        uint256 totalFunds
    ) {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];
        return (
            campaign.id,
            campaign.admin,
            campaign.name,
            campaign.description,
            campaign.logo,
            campaign.demoVideo,
            campaign.startTime,
            campaign.endTime,
            campaign.adminFeePercentage,
            campaign.voteMultiplier,
            campaign.maxWinners,
            campaign.campaignType,
            campaign.distributionType,
            campaign.refundable,
            campaign.isPrivate,
            campaign.active,
            campaign.totalFunds
        );
    }

    /**
     * @dev Get entities for a specific campaign
     * @param _campaignId Campaign ID
     * @return Array of entities
     */
    function getCampaignEntities(uint256 _campaignId) external view returns (Entity[] memory) {
        return campaignEntities[_campaignId];
    }

    /**
     * @dev Check if an address is a campaign admin
     * @param _campaignId Campaign ID
     * @param _admin Address to check
     * @return Boolean indicating if the address is a campaign admin
     */
    function isCampaignAdmin(uint256 _campaignId, address _admin) external view returns (bool) {
        if (_campaignId >= campaigns.length) return false;
        return campaigns[_campaignId].admin == _admin || 
               campaigns[_campaignId].campaignAdmins[_admin] || 
               superAdmins[_admin];
    }
}

/**
 * @title SovereignSeasCampaign
 * @dev Manages campaigns, entities, and admin operations
 */
contract SovereignSeasCampaign is SovereignSeasStorage, ReentrancyGuard {
    /**
     * @dev Add a campaign admin
     * @param _campaignId Campaign ID
     * @param _newAdmin Address of the new campaign admin
     */
    function addCampaignAdmin(uint256 _campaignId, address _newAdmin) external onlyCampaignAdmin(_campaignId) {
        require(_newAdmin != address(0), "Invalid address");
        require(!campaigns[_campaignId].campaignAdmins[_newAdmin], "Already an admin for this campaign");
        
        campaigns[_campaignId].campaignAdmins[_newAdmin] = true;
        emit CampaignAdminAdded(_campaignId, _newAdmin, msg.sender);
    }

    /**
     * @dev Remove a campaign admin
     * @param _campaignId Campaign ID
     * @param _admin Address of the admin to remove
     */
    function removeCampaignAdmin(uint256 _campaignId, address _admin) external onlyCampaignAdmin(_campaignId) {
        require(_admin != campaigns[_campaignId].admin, "Cannot remove primary admin");
        require(campaigns[_campaignId].campaignAdmins[_admin], "Not an admin for this campaign");
        
        campaigns[_campaignId].campaignAdmins[_admin] = false;
        emit CampaignAdminRemoved(_campaignId, _admin, msg.sender);
    }

    /**
     * @dev Create a new campaign - this solution splits the function to prevent stack too deep errors
     * @param _basicInfo Basic campaign information
     * @param _extendedInfo Extended campaign information
     */
    function createCampaign(
        CampaignBasicInfo memory _basicInfo,
        CampaignExtendedInfo memory _extendedInfo
    ) external payable {
        require(_basicInfo.startTime > block.timestamp, "Start time must be in the future");
        require(_basicInfo.endTime > _basicInfo.startTime, "End time must be after start time");
        require(_basicInfo.adminFeePercentage <= 30, "Admin fee too high");
        require(_extendedInfo.voteMultiplier >= 1 && _extendedInfo.voteMultiplier <= 5, "Vote multiplier must be 1-5");
        
        // If it's a poll and refundable, ensure distribution type is Winner
        if (_extendedInfo.campaignType == CampaignType.Poll && _extendedInfo.refundable) {
            require(_extendedInfo.distributionType == DistributionType.Winner, "Refundable polls must use Winner distribution");
        }

        // Collect campaign creation fee
        require(msg.value == CAMPAIGN_CREATION_FEE, "Must send exact campaign creation fee");
        totalCreationFees += CAMPAIGN_CREATION_FEE;

        uint256 campaignId = campaigns.length;
        Campaign storage newCampaign = campaigns.push();
        
        // Set basic info
        newCampaign.id = campaignId;
        newCampaign.admin = msg.sender;
        newCampaign.name = _basicInfo.name;
        newCampaign.description = _basicInfo.description;
        newCampaign.logo = _basicInfo.logo;
        newCampaign.demoVideo = _basicInfo.demoVideo;
        newCampaign.startTime = _basicInfo.startTime;
        newCampaign.endTime = _basicInfo.endTime;
        newCampaign.adminFeePercentage = _basicInfo.adminFeePercentage;
        
        // Set extended info
        newCampaign.voteMultiplier = _extendedInfo.voteMultiplier;
        newCampaign.maxWinners = _extendedInfo.maxWinners;
        newCampaign.campaignType = _extendedInfo.campaignType;
        newCampaign.distributionType = _extendedInfo.distributionType;
        newCampaign.refundable = _extendedInfo.refundable;
        newCampaign.isPrivate = _extendedInfo.isPrivate;
        newCampaign.active = true;
        newCampaign.totalFunds = 0;
        
        // Add creator as campaign admin
        newCampaign.campaignAdmins[msg.sender] = true;
        
        // If private campaign, automatically whitelist the creator
        if (_extendedInfo.isPrivate) {
            newCampaign.whitelistedVoters[msg.sender] = true;
        }

        emit CampaignCreated(campaignId, msg.sender, _basicInfo.name, _extendedInfo.campaignType, _extendedInfo.isPrivate);
    }

    /**
     * @dev Update campaign details (only non-critical parameters)
     * @param _campaignId Campaign ID
     * @param _basicInfo Updated basic campaign information
     */
    function updateCampaign(
        uint256 _campaignId,
        CampaignBasicInfo memory _basicInfo
    ) external onlyCampaignAdmin(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign is not active");
        
        // Can only update start time if campaign hasn't started yet
        if (block.timestamp < campaign.startTime) {
            require(_basicInfo.startTime > block.timestamp, "Start time must be in the future");
            require(_basicInfo.endTime > _basicInfo.startTime, "End time must be after start time");
            campaign.startTime = _basicInfo.startTime;
        } else {
            require(_basicInfo.endTime > block.timestamp, "End time must be in the future");
        }
        
        campaign.name = _basicInfo.name;
        campaign.description = _basicInfo.description;
        campaign.logo = _basicInfo.logo;
        campaign.demoVideo = _basicInfo.demoVideo;
        campaign.endTime = _basicInfo.endTime;
        
        // Admin fee can only be reduced, not increased
        require(_basicInfo.adminFeePercentage <= campaign.adminFeePercentage, "Cannot increase admin fee");
        campaign.adminFeePercentage = _basicInfo.adminFeePercentage;
        
        emit CampaignUpdated(_campaignId, msg.sender);
    }

    /**
     * @dev Deactivate a campaign (only by super admin)
     * @param _campaignId Campaign ID
     */
    function deactivateCampaign(uint256 _campaignId) external onlySuperAdmin {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign already inactive");
        
        // If campaign has funds, check if it's started
        if (campaign.totalFunds > 0) {
            // Only allow deactivation if campaign hasn't started
            require(block.timestamp < campaign.startTime, "Cannot deactivate active campaign with funds");
            
            // Return funds to platform
            (bool success, ) = payable(owner()).call{value: campaign.totalFunds}("");
            require(success, "Transfer to owner failed");
        }
        
        campaign.active = false;
        
        emit CampaignDeactivated(_campaignId, msg.sender);
    }

    /**
     * @dev Submit an entity to a campaign
     * @param _campaignId Campaign ID
     * @param _name Entity name
     * @param _description Entity description
     * @param _mediaLinks Array of media links (IPFS hashes or URLs)
     * @param _externalLinks Array of external links
     * @param _contracts Array of associated contract addresses
     * @param _extraData Additional data specific to the entity type
     */
    function submitEntity(
        uint256 _campaignId,
        string memory _name,
        string memory _description,
        string[] memory _mediaLinks,
        string[] memory _externalLinks,
        address[] memory _contracts,
        bytes memory _extraData
    ) external payable {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign is not active");
        require(block.timestamp < campaign.endTime, "Campaign has ended");

        // Check if the submitter is a campaign admin
        bool isAdmin = (msg.sender == campaign.admin || 
                        campaign.campaignAdmins[msg.sender] || 
                        superAdmins[msg.sender]);

        // Only collect fee if not admin
        if (!isAdmin) {
            require(msg.value == ENTITY_CREATION_FEE, "Must send exact entity creation fee");
            totalCreationFees += ENTITY_CREATION_FEE;
        }

        uint256 entityId = campaignEntities[_campaignId].length;
        Entity memory newEntity = Entity({
            id: entityId,
            campaignId: _campaignId,
            owner: payable(msg.sender),
            name: _name,
            description: _description,
            mediaLinks: _mediaLinks,
            externalLinks: _externalLinks,
            contracts: _contracts,
            extraData: _extraData,
            // Auto-approve if submitted by admin
            approved: isAdmin,
            active: true,
            voteCount: 0,
            fundsReceived: 0
        });
        
        campaignEntities[_campaignId].push(newEntity);

        emit EntitySubmitted(_campaignId, entityId, msg.sender);
    }

    /**
     * @dev Update entity details
     * @param _campaignId Campaign ID
     * @param _entityId Entity ID
     * @param _name New entity name
     * @param _description New entity description
     * @param _mediaLinks New array of media links
     * @param _externalLinks New array of external links
     * @param _contracts New array of contract addresses
     * @param _extraData New additional data
     */
    function updateEntity(
        uint256 _campaignId,
        uint256 _entityId,
        string memory _name,
        string memory _description,
        string[] memory _mediaLinks,
        string[] memory _externalLinks,
        address[] memory _contracts,
        bytes memory _extraData
    ) external {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign is not active");
        require(block.timestamp < campaign.endTime, "Campaign has ended");
        require(_entityId < campaignEntities[_campaignId].length, "Entity does not exist");
        
        Entity storage entity = campaignEntities[_campaignId][_entityId];
        require(msg.sender == entity.owner || campaign.campaignAdmins[msg.sender] || superAdmins[msg.sender], 
                "Only entity owner or admins can update");
        require(entity.active, "Entity is not active");
        
        // Don't allow updates to approved entities with votes to maintain fairness
        if (entity.approved && entity.voteCount > 0) {
            // For approved entities with votes, only allow updating links and media
            entity.mediaLinks = _mediaLinks;
            entity.externalLinks = _externalLinks;
            entity.contracts = _contracts;
            entity.extraData = _extraData;
        } else {
            // For unapproved entities or those without votes, allow full updates
            entity.name = _name;
            entity.description = _description;
            entity.mediaLinks = _mediaLinks;
            entity.externalLinks = _externalLinks;
            entity.contracts = _contracts;
            entity.extraData = _extraData;
        }
        
        emit EntityUpdated(_campaignId, _entityId, msg.sender);
    }

    /**
     * @dev Approve an entity for voting
     * @param _campaignId Campaign ID
     * @param _entityId Entity ID
     */
    function approveEntity(uint256 _campaignId, uint256 _entityId) external onlyCampaignAdmin(_campaignId) {
        require(_entityId < campaignEntities[_campaignId].length, "Entity does not exist");

        Entity storage entity = campaignEntities[_campaignId][_entityId];
        require(!entity.approved, "Entity already approved");
        require(entity.active, "Entity is not active");

        entity.approved = true;

        emit EntityApproved(_campaignId, _entityId);
    }
    
    /**
     * @dev Deactivate an entity
     * @param _campaignId Campaign ID
     * @param _entityId Entity ID
     */
    function deactivateEntity(uint256 _campaignId, uint256 _entityId) external onlyCampaignAdmin(_campaignId) {
        require(_entityId < campaignEntities[_campaignId].length, "Entity does not exist");
        
        Entity storage entity = campaignEntities[_campaignId][_entityId];
        require(entity.active, "Entity is already inactive");
        
        // Can only deactivate entities that haven't received votes
        require(entity.voteCount == 0, "Cannot deactivate entity with votes");
        
        entity.active = false;
        
        emit EntityDeactivated(_campaignId, _entityId, msg.sender);
    }

    /**
     * @dev Add voter to whitelist for private campaign
     * @param _campaignId Campaign ID
     * @param _voter Address of voter to whitelist
     */
    function whitelistVoter(uint256 _campaignId, address _voter) external onlyCampaignAdmin(_campaignId) {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.isPrivate, "Campaign is not private");
        require(!campaign.whitelistedVoters[_voter], "Voter already whitelisted");
        
        campaign.whitelistedVoters[_voter] = true;
        
        emit VoterWhitelisted(_campaignId, _voter, msg.sender);
    }
    
    /**
     * @dev Remove voter from whitelist for private campaign
     * @param _campaignId Campaign ID
     * @param _voter Address of voter to remove from whitelist
     */
    function removeVoterFromWhitelist(uint256 _campaignId, address _voter) external onlyCampaignAdmin(_campaignId) {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.isPrivate, "Campaign is not private");
        require(campaign.whitelistedVoters[_voter], "Voter not whitelisted");
        
        campaign.whitelistedVoters[_voter] = false;
        
        emit VoterRemovedFromWhitelist(_campaignId, _voter, msg.sender);
    }
    
    /**
     * @dev Check if voter is whitelisted for a private campaign
     * @param _campaignId Campaign ID
     * @param _voter Address of voter to check
     * @return Boolean indicating if voter is whitelisted
     */
    function isVoterWhitelisted(uint256 _campaignId, address _voter) external view returns (bool) {
        if (_campaignId >= campaigns.length) return false;
        
        Campaign storage campaign = campaigns[_campaignId];
        if (!campaign.isPrivate) return true; // All voters are implicitly whitelisted for public campaigns
        
        return campaign.whitelistedVoters[_voter];
    }
}

/**
 * @title SovereignSeasInteraction
 * @dev Manages voting, comments, and distribution mechanisms
 */
contract SovereignSeasInteraction is SovereignSeasCampaign {
    /**
     * @dev Vote for an entity using native CELO tokens
     * @param _campaignId Campaign ID
     * @param _entityId Entity ID
     */
    function vote(uint256 _campaignId, uint256 _entityId) external payable nonReentrant {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign is not active");
        require(block.timestamp >= campaign.startTime, "Campaign has not started");
        require(block.timestamp <= campaign.endTime, "Campaign has ended");
        require(_entityId < campaignEntities[_campaignId].length, "Entity does not exist");
        
        // Check if campaign is private and voter is whitelisted
        if (campaign.isPrivate) {
            require(campaign.whitelistedVoters[msg.sender], "Not whitelisted for this private campaign");
        }

        Entity storage entity = campaignEntities[_campaignId][_entityId];
        require(entity.approved, "Entity is not approved");
        require(entity.active, "Entity is not active");
        require(msg.value > 0, "Amount must be greater than 0");

        uint256 amount = msg.value;

        // Calculate vote count based on vote multiplier
        uint256 voteCount = amount * campaign.voteMultiplier;

        // Update vote tracking
        userVotes[_campaignId][msg.sender][_entityId] += amount;
        totalUserVotesInCampaign[_campaignId][msg.sender] += amount;

        // Update entity vote count
        entity.voteCount += voteCount;

        // Update campaign total funds
        campaign.totalFunds += amount;

        // Record vote in user history
        userVoteHistory[msg.sender].push(
            Vote({
                voter: msg.sender,
                campaignId: _campaignId,
                entityId: _entityId,
                amount: amount,
                voteCount: voteCount,
                refunded: false
            })
        );

        emit VoteCast(msg.sender, _campaignId, _entityId, amount, voteCount);
    }

    /**
     * @dev Request refund for votes in a refundable campaign
     * @param _campaignId Campaign ID
     * @param _voteIndexes Array of vote indexes in user's history to refund
     */
    function requestRefund(uint256 _campaignId, uint256[] memory _voteIndexes) external nonReentrant {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];
        require(!campaign.active, "Campaign must be finalized for refunds");
        require(campaign.refundable, "Campaign does not support refunds");
        require(block.timestamp > campaign.endTime, "Campaign has not ended");
        
        uint256 totalRefundAmount = 0;
        
        for (uint256 i = 0; i < _voteIndexes.length; i++) {
            uint256 voteIndex = _voteIndexes[i];
            require(voteIndex < userVoteHistory[msg.sender].length, "Invalid vote index");
            Vote storage userVote = userVoteHistory[msg.sender][voteIndex];
            require(userVote.campaignId == _campaignId, "Vote is not for this campaign");
            require(!userVote.refunded, "Vote already refunded");
            
            // Only refund if the vote was for a winning entity in Poll campaigns
            if (campaign.campaignType == CampaignType.Poll) {
                Entity memory entity = campaignEntities[_campaignId][userVote.entityId];
                // Check if the entity received funds (which means it was a winner)
                if (entity.fundsReceived > 0) {
                    userVote.refunded = true;
                    totalRefundAmount += userVote.amount;
                }
            }
        }
        
        require(totalRefundAmount > 0, "No refundable votes found");
        
        (bool success, ) = payable(msg.sender).call{value: totalRefundAmount}("");
        require(success, "Refund transfer failed");
        
        for (uint256 i = 0; i < _voteIndexes.length; i++) {
            emit VoteRefunded(msg.sender, _campaignId, userVoteHistory[msg.sender][_voteIndexes[i]].entityId, 
                userVoteHistory[msg.sender][_voteIndexes[i]].amount);
        }
    }

    /**
     * @dev Distribute funds after campaign ends
     * @param _campaignId Campaign ID
     */
    function distributeFunds(uint256 _campaignId) external nonReentrant onlyCampaignAdmin(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign already finalized");
        require(block.timestamp > campaign.endTime || superAdmins[msg.sender], "Campaign has not ended or caller is not super admin");

        // Mark campaign as inactive
        campaign.active = false;

        // Get total votes in campaign
        uint256 totalVotes = 0;
        for (uint256 i = 0; i < campaignEntities[_campaignId].length; i++) {
            if (campaignEntities[_campaignId][i].approved && campaignEntities[_campaignId][i].active) {
                totalVotes += campaignEntities[_campaignId][i].voteCount;
            }
        }

        // If no votes, return funds to platform
        if (totalVotes == 0) {
            (bool success, ) = payable(owner()).call{value: campaign.totalFunds}("");
            require(success, "Transfer to owner failed");
            emit FundsDistributed(_campaignId);
            return;
        }

        // Calculate fees
        uint256 platformFeeAmount = (campaign.totalFunds * PLATFORM_FEE) / 100;
        uint256 adminFeeAmount = (campaign.totalFunds * campaign.adminFeePercentage) / 100;
        uint256 remainingFunds = campaign.totalFunds - platformFeeAmount - adminFeeAmount;

        // Transfer platform fee
        (bool platformFeeSuccess, ) = payable(owner()).call{value: platformFeeAmount}("");
        require(platformFeeSuccess, "Platform fee transfer failed");

        // Transfer admin fee
        (bool adminFeeSuccess, ) = payable(campaign.admin).call{value: adminFeeAmount}("");
        require(adminFeeSuccess, "Admin fee transfer failed");

        // Get sorted entities
        Entity[] memory sortedEntities = getSortedEntitiesByCampaign(_campaignId);

        // Determine number of winners
        uint256 winnersCount;
        if (campaign.maxWinners == 0 || campaign.maxWinners >= sortedEntities.length) {
            // If maxWinners is 0 or greater than available entities, all entities with votes win
            winnersCount = sortedEntities.length;
        } else {
            winnersCount = campaign.maxWinners;
        }

        // Only count entities with votes
        uint256 actualWinners = 0;
        for (uint256 i = 0; i < winnersCount; i++) {
            if (i < sortedEntities.length && sortedEntities[i].voteCount > 0) {
                actualWinners++;
            } else {
                break;
            }
        }

        if (actualWinners == 0) {
            // No winners with votes, return funds to platform
            (bool returnSuccess, ) = payable(owner()).call{value: remainingFunds}("");
            require(returnSuccess, "Transfer to owner failed");
            return;
        }

        // Distribute funds based on distribution type
        if (campaign.distributionType == DistributionType.Quadratic) {
            distributeQuadratic(_campaignId, sortedEntities, actualWinners, remainingFunds);
        } else if (campaign.distributionType == DistributionType.Equal) {
            distributeEqual(_campaignId, sortedEntities, actualWinners, remainingFunds);
        } else if (campaign.distributionType == DistributionType.Winner) {
            distributeWinnerTakesAll(_campaignId, sortedEntities, remainingFunds);
        } else {
            // Default to Linear distribution
            distributeLinear(_campaignId, sortedEntities, actualWinners, remainingFunds);
        }

        emit FundsDistributed(_campaignId);
    }

    /**
     * @dev Add a comment to an entity
     * @param _campaignId Campaign ID
     * @param _entityId Entity ID
     * @param _content Comment content
     */
    function addComment(uint256 _campaignId, uint256 _entityId, string memory _content) external payable {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        require(_entityId < campaignEntities[_campaignId].length, "Entity does not exist");
        require(bytes(_content).length > 0 && bytes(_content).length <= 1000, "Comment length invalid");
        
        // Check if campaign is private and commenter is whitelisted
        Campaign storage campaign = campaigns[_campaignId];
        if (campaign.isPrivate) {
            require(campaign.whitelistedVoters[msg.sender], "Not whitelisted for this private campaign");
        }
        
        // Collect comment fee unless commenter is admin
        bool isAdmin = (
            campaign.admin == msg.sender ||
            campaign.campaignAdmins[msg.sender] ||
            superAdmins[msg.sender]
        );
        
        if (!isAdmin) {
            require(msg.value == COMMENT_FEE, "Must send exact comment fee");
            totalCreationFees += COMMENT_FEE;
        }
        
        uint256 commentId = entityComments[_campaignId][_entityId].length;
        
        Comment memory newComment = Comment({
            id: commentId,
            commenter: msg.sender,
            campaignId: _campaignId,
            entityId: _entityId,
            content: _content,
            timestamp: block.timestamp,
            isActive: true
        });
        
        entityComments[_campaignId][_entityId].push(newComment);
        userCommentHistory[msg.sender].push(newComment);
        
        emit CommentAdded(_campaignId, _entityId, commentId, msg.sender);
    }
    
    /**
     * @dev Remove a comment (only by comment author, campaign admin, or super admin)
     * @param _campaignId Campaign ID
     * @param _entityId Entity ID
     * @param _commentId Comment ID
     */
    function removeComment(uint256 _campaignId, uint256 _entityId, uint256 _commentId) external {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        require(_entityId < campaignEntities[_campaignId].length, "Entity does not exist");
        require(_commentId < entityComments[_campaignId][_entityId].length, "Comment does not exist");
        
        Comment storage comment = entityComments[_campaignId][_entityId][_commentId];
        require(comment.isActive, "Comment already removed");
        
        // Check if caller is authorized to remove comment
        bool isAuthorized = (
            comment.commenter == msg.sender || // Comment author
            campaigns[_campaignId].admin == msg.sender || // Campaign admin
            campaigns[_campaignId].campaignAdmins[msg.sender] || // Campaign admin
            superAdmins[msg.sender] // Super admin
        );
        
        require(isAuthorized, "Not authorized to remove comment");
        
        comment.isActive = false;
        
        emit CommentRemoved(_campaignId, _entityId, _commentId, msg.sender);
    }
    
    /**
     * @dev Get comments for an entity
     * @param _campaignId Campaign ID
     * @param _entityId Entity ID
     * @param _startIndex Start index for pagination
     * @param _count Number of comments to retrieve
     * @return Array of comments
     */
    function getEntityComments(
        uint256 _campaignId, 
        uint256 _entityId, 
        uint256 _startIndex, 
        uint256 _count
    ) external view returns (Comment[] memory) {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        require(_entityId < campaignEntities[_campaignId].length, "Entity does not exist");
        
        uint256 totalComments = entityComments[_campaignId][_entityId].length;
        
        // Handle out-of-bounds start index
        if (_startIndex >= totalComments) {
            Comment[] memory emptyArray = new Comment[](0);
            return emptyArray;
        }
        
        // Calculate actual count (don't go past end of array)
        uint256 actualCount = _count;
        if (_startIndex + _count > totalComments) {
            actualCount = totalComments - _startIndex;
        }
        
        Comment[] memory result = new Comment[](actualCount);
        for (uint256 i = 0; i < actualCount; i++) {
            result[i] = entityComments[_campaignId][_entityId][_startIndex + i];
        }
        
        return result;
    }
    
    /**
     * @dev Get total number of comments for an entity
     * @param _campaignId Campaign ID
     * @param _entityId Entity ID
     * @return Number of comments
     */
    function getEntityCommentCount(uint256 _campaignId, uint256 _entityId) external view returns (uint256) {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        require(_entityId < campaignEntities[_campaignId].length, "Entity does not exist");
        
        return entityComments[_campaignId][_entityId].length;
    }
    
    /**
     * @dev Get user's comment history
     * @param _user User address
     * @param _startIndex Start index for pagination
     * @param _count Number of comments to retrieve
     * @return Array of comments
     */
    function getUserCommentHistory(
        address _user, 
        uint256 _startIndex, 
        uint256 _count
    ) external view returns (Comment[] memory) {
        uint256 totalComments = userCommentHistory[_user].length;
        
        // Handle out-of-bounds start index
        if (_startIndex >= totalComments) {
            Comment[] memory emptyArray = new Comment[](0);
            return emptyArray;
        }
        
        // Calculate actual count (don't go past end of array)
        uint256 actualCount = _count;
        if (_startIndex + _count > totalComments) {
            actualCount = totalComments - _startIndex;
        }
        
        Comment[] memory result = new Comment[](actualCount);
        for (uint256 i = 0; i < actualCount; i++) {
            result[i] = userCommentHistory[_user][_startIndex + i];
        }
        
        return result;
    }

    // Internal distribution methods

    /**
     * @dev Helper to get square root for quadratic voting
     * @param x Number to get square root of
     * @return y Square root of x
     */
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    /**
     * @dev Distribute funds using quadratic voting formula
     */
    function distributeQuadratic(
        uint256 _campaignId, 
        Entity[] memory sortedEntities, 
        uint256 actualWinners,
        uint256 remainingFunds
    ) private {
        // Quadratic distribution (square root of votes for weighting)
        uint256[] memory weights = new uint256[](actualWinners);
        uint256 totalWeight = 0;

        // Calculate square roots of vote counts as weights
        for (uint256 i = 0; i < actualWinners; i++) {
            weights[i] = sqrt(sortedEntities[i].voteCount);
            totalWeight += weights[i];
        }

        // Distribute based on quadratic weights
        for (uint256 i = 0; i < actualWinners; i++) {
            Entity storage entity = campaignEntities[_campaignId][sortedEntities[i].id];
            if (entity.approved && entity.active && entity.voteCount > 0) {
                uint256 entityShare = (remainingFunds * weights[i]) / totalWeight;
                entity.fundsReceived = entityShare;
                (bool success, ) = entity.owner.call{value: entityShare}("");
                require(success, "Transfer to entity owner failed");
            }
        }
    }
    
    /**
     * @dev Distribute funds equally among winners
     * @param _campaignId Campaign ID
     * @param sortedEntities Sorted array of entities
     * @param actualWinners Number of winners
     * @param remainingFunds Remaining funds to distribute
     */
    function distributeEqual(
        uint256 _campaignId, 
        Entity[] memory sortedEntities, 
        uint256 actualWinners,
        uint256 remainingFunds
    ) private {
        // Equal distribution - each winner gets the same amount
        if (actualWinners > 0) {
            uint256 sharePerWinner = remainingFunds / actualWinners;
            
            for (uint256 i = 0; i < actualWinners; i++) {
                Entity storage entity = campaignEntities[_campaignId][sortedEntities[i].id];
                if (entity.approved && entity.active && entity.voteCount > 0) {
                    entity.fundsReceived = sharePerWinner;
                    (bool success, ) = entity.owner.call{value: sharePerWinner}("");
                    require(success, "Transfer to entity owner failed");
                }
            }
        } else {
            // No winners, return funds to platform
            (bool success, ) = payable(owner()).call{value: remainingFunds}("");
            require(success, "Transfer to owner failed");
        }
    }
    
    /**
     * @dev Winner takes all distribution
     * @param _campaignId Campaign ID
     * @param sortedEntities Sorted array of entities
     * @param remainingFunds Remaining funds to distribute
     */
    function distributeWinnerTakesAll(
        uint256 _campaignId, 
        Entity[] memory sortedEntities,
        uint256 remainingFunds
    ) private {
        // Winner takes all - only the entity with the most votes receives funds
        if (sortedEntities.length > 0 && sortedEntities[0].voteCount > 0) {
            Entity storage entity = campaignEntities[_campaignId][sortedEntities[0].id];
            if (entity.approved && entity.active) {
                entity.fundsReceived = remainingFunds;
                (bool success, ) = entity.owner.call{value: remainingFunds}("");
                require(success, "Transfer to entity owner failed");
            }
        } else {
            // No entities with votes, return funds to platform
            (bool success, ) = payable(owner()).call{value: remainingFunds}("");
            require(success, "Transfer to owner failed");
        }
    }
    
    /**
     * @dev Distribute funds linearly based on vote counts
     * @param _campaignId Campaign ID
     * @param sortedEntities Sorted array of entities
     * @param actualWinners Number of winners
     * @param remainingFunds Remaining funds to distribute
     */
    function distributeLinear(
        uint256 _campaignId, 
        Entity[] memory sortedEntities, 
        uint256 actualWinners,
        uint256 remainingFunds
    ) private {
        if (actualWinners == 0) {
            // No winners, return funds to platform
            (bool success, ) = payable(owner()).call{value: remainingFunds}("");
            require(success, "Transfer to owner failed");
            return;
        }
        
        // First, check if there are entities with tied votes at the cutoff position
        uint256 lastPosition = actualWinners - 1;
        uint256 tiedCount = 1; // At least the last winner is in this position
        uint256 cutoffVotes = 0;
        
        if (actualWinners > 0 && actualWinners < sortedEntities.length) {
            cutoffVotes = sortedEntities[lastPosition].voteCount;
            
            // Count additional entities that have the same votes as the last position
            for (uint256 i = actualWinners; i < sortedEntities.length; i++) {
                if (sortedEntities[i].voteCount == cutoffVotes) {
                    tiedCount++;
                } else {
                    break; // No more tied entities
                }
            }
        }
        
        // Total winning votes (excluding ties if needed)
        uint256 totalWinningVotes = 0;
        for (uint256 i = 0; i < lastPosition; i++) {
            totalWinningVotes += sortedEntities[i].voteCount;
        }
        
        // Handle distribution based on whether there are ties
        if (tiedCount > 1) {
            // There are tied entities at the cutoff position
            
            // Calculate share for definite winners (positions 0 to lastPosition-1)
            for (uint256 i = 0; i < lastPosition; i++) {
                Entity storage entity = campaignEntities[_campaignId][sortedEntities[i].id];
                if (entity.approved && entity.active && entity.voteCount > 0) {
                    uint256 entityShare = (remainingFunds * entity.voteCount) / totalWinningVotes;
                    entity.fundsReceived = entityShare;
                    (bool success, ) = entity.owner.call{value: entityShare}("");
                    require(success, "Transfer to entity owner failed");
                }
            }
            
            // Calculate remaining funds after paying definite winners
            uint256 remainingForTied = remainingFunds;
            for (uint256 i = 0; i < lastPosition; i++) {
                remainingForTied -= (remainingFunds * sortedEntities[i].voteCount) / totalWinningVotes;
            }
            
            // Divide the remaining portion equally among tied entities
            uint256 tieShare = remainingForTied / tiedCount;
            
            // Distribute to tied entities at the cutoff position
            for (uint256 i = lastPosition; i < lastPosition + tiedCount; i++) {
                if (i < sortedEntities.length) {
                    Entity storage entity = campaignEntities[_campaignId][sortedEntities[i].id];
                    if (entity.approved && entity.active && entity.voteCount > 0) {
                        entity.fundsReceived = tieShare;
                        (bool success, ) = entity.owner.call{value: tieShare}("");
                        require(success, "Transfer to entity owner failed");
                    }
                }
            }
        } else {
            // No ties, proceed with normal distribution
            totalWinningVotes += cutoffVotes; // Add last position votes
            
            for (uint256 i = 0; i < actualWinners; i++) {
                Entity storage entity = campaignEntities[_campaignId][sortedEntities[i].id];
                if (entity.approved && entity.active && entity.voteCount > 0) {
                    uint256 entityShare = (remainingFunds * entity.voteCount) / totalWinningVotes;
                    entity.fundsReceived = entityShare;
                    (bool success, ) = entity.owner.call{value: entityShare}("");
                    require(success, "Transfer to entity owner failed");
                }
            }
        }
    }

    /**
     * @dev Get entities for a campaign sorted by vote count
     * @param _campaignId Campaign ID
     * @return Sorted array of entities
     */
    function getSortedEntitiesByCampaign(uint256 _campaignId) internal view returns (Entity[] memory) {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        
        // Count approved and active entities with votes
        uint256 count = 0;
        for (uint256 i = 0; i < campaignEntities[_campaignId].length; i++) {
            Entity memory entity = campaignEntities[_campaignId][i];
            if (entity.approved && entity.active) {
                count++;
            }
        }
        
        // Create array of approved and active entities
        Entity[] memory entities = new Entity[](count);
        uint256 j = 0;
        for (uint256 i = 0; i < campaignEntities[_campaignId].length; i++) {
            Entity memory entity = campaignEntities[_campaignId][i];
            if (entity.approved && entity.active) {
                entities[j] = entity;
                j++;
            }
        }
        
        // Sort entities by vote count (descending)
        for (uint256 i = 0; i < entities.length; i++) {
            for (uint256 k = i + 1; k < entities.length; k++) {
                if (entities[k].voteCount > entities[i].voteCount) {
                    Entity memory temp = entities[i];
                    entities[i] = entities[k];
                    entities[k] = temp;
                }
            }
        }
        
        return entities;
    }
}

/**
 * @title SovereignSeasV3
 * @dev Main contract combining all functionality
 */
contract SovereignSeasV3 is SovereignSeasInteraction {
    // Constructor inherits from parent contracts
}