// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./SovSeasAdmin.sol";

/**
 * @title SovereignSeas Campaign Contract
 * @dev Handles campaign creation and management for the SovereignSeas ecosystem
 */
contract SovSeasCampaign is ReentrancyGuard {
    // Reference to admin contract
    SovSeasAdmin public adminContract;
    
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
    
    // Creation parameters struct to reduce stack depth
    struct CampaignCreationParams {
        string name;
        string description;
        string logo;
        string demoVideo;
        uint256 startTime;
        uint256 endTime;
        uint256 adminFeePercentage;
        uint256 voteMultiplier;
        uint256 maxWinners;
        CampaignType campaignType;
        DistributionType distributionType;
        bool refundable;
        bool isPrivate;
    }

    // Entity creation parameters struct to reduce stack depth
    struct EntityCreationParams {
        string name;
        string description;
        string[] mediaLinks;
        string[] externalLinks;
        address[] contracts;
        bytes extraData;
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
    
    // Storage
    Campaign[] public campaigns;
    mapping(uint256 => Entity[]) public campaignEntities;
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
    event CampaignAdminAdded(uint256 indexed campaignId, address indexed newAdmin, address indexed addedBy);
    event CampaignAdminRemoved(uint256 indexed campaignId, address indexed admin, address indexed removedBy);
    event VoterWhitelisted(uint256 indexed campaignId, address indexed voter, address indexed whitelistedBy);
    event VoterRemovedFromWhitelist(uint256 indexed campaignId, address indexed voter, address indexed removedBy);
    event CommentAdded(uint256 indexed campaignId, uint256 indexed entityId, uint256 commentId, address indexed commenter);
    event CommentRemoved(uint256 indexed campaignId, uint256 indexed entityId, uint256 commentId, address indexed removedBy);
    
    /**
     * @dev Constructor sets reference to admin contract
     * @param _adminContract Address of the admin contract
     */
    constructor(address _adminContract) {
        adminContract = SovSeasAdmin(payable(_adminContract));
    }
    
    /**
     * @dev Modifier to check if caller is a super admin
     */
    modifier onlySuperAdmin() {
        require(adminContract.isSuperAdmin(msg.sender), "Only super admin can call this function");
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
            adminContract.isSuperAdmin(msg.sender),
            "Only campaign admin or super admin can call this function"
        );
        _;
    }
    
    /**
     * @dev Collect fee for a given action by forwarding to admin contract
     * @param _feeSignature The function signature to call in the admin contract
     */
    function _collectFee(string memory _feeSignature) internal returns (bool) {
        (bool success,) = address(adminContract).call{value: msg.value}(
            abi.encodeWithSignature(_feeSignature)
        );
        return success;
    }
    
    /**
     * @dev Validates basic campaign creation parameters
     */
    function _validateCampaignParams(CampaignCreationParams memory _params) internal view {
        require(_params.startTime > block.timestamp, "Start time must be in the future");
        require(_params.endTime > _params.startTime, "End time must be after start time");
        require(_params.adminFeePercentage <= 30, "Admin fee too high");
        require(_params.voteMultiplier >= 1 && _params.voteMultiplier <= 5, "Vote multiplier must be 1-5");
        
        // If it's a poll and refundable, ensure distribution type is Winner
        if (_params.campaignType == CampaignType.Poll && _params.refundable) {
            require(_params.distributionType == DistributionType.Winner, "Refundable polls must use Winner distribution");
        }
    }
    
    /**
     * @dev Helper function to initialize a campaign
     */
    function _initializeCampaign(
        uint256 _campaignId, 
        CampaignCreationParams memory _params
    ) internal {
        Campaign storage newCampaign = campaigns[_campaignId];
        
        newCampaign.id = _campaignId;
        newCampaign.admin = msg.sender;
        newCampaign.name = _params.name;
        newCampaign.description = _params.description;
        newCampaign.logo = _params.logo;
        newCampaign.demoVideo = _params.demoVideo;
        newCampaign.startTime = _params.startTime;
        newCampaign.endTime = _params.endTime;
        newCampaign.adminFeePercentage = _params.adminFeePercentage;
        newCampaign.voteMultiplier = _params.voteMultiplier;
        newCampaign.maxWinners = _params.maxWinners;
        newCampaign.campaignType = _params.campaignType;
        newCampaign.distributionType = _params.distributionType;
        newCampaign.refundable = _params.refundable;
        newCampaign.isPrivate = _params.isPrivate;
        newCampaign.active = true;
        newCampaign.totalFunds = 0;
        
        // Add creator as campaign admin
        newCampaign.campaignAdmins[msg.sender] = true;
        
        // If private campaign, automatically whitelist the creator
        if (_params.isPrivate) {
            newCampaign.whitelistedVoters[msg.sender] = true;
        }
    }
    
    /**
     * @dev Create a new campaign using a struct to reduce stack depth
     */
    function createCampaign(
        CampaignCreationParams calldata _params
    ) external payable {
        // Validate parameters
        _validateCampaignParams(_params);

        // Collect fee
        bool feeSuccess = _collectFee("collectCampaignFee()");
        require(feeSuccess, "Fee collection failed");

        // Create campaign
        uint256 campaignId = campaigns.length;
        _initializeCampaign(campaignId, _params);

        // Emit event
        emit CampaignCreated(
            campaignId, 
            msg.sender, 
            _params.name, 
            _params.campaignType, 
            _params.isPrivate
        );
    }

    /**
     * @dev Update campaign details (only non-critical parameters)
     */
    function updateCampaign(
        uint256 _campaignId,
        string memory _name,
        string memory _description,
        string memory _logo,
        string memory _demoVideo,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _adminFeePercentage
    ) external onlyCampaignAdmin(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign is not active");
        
        // Validate time parameters
        _validateCampaignTimeUpdate(campaign, _startTime, _endTime);
        
        // Update campaign details
        _updateCampaignDetails(
            campaign, 
            _name, 
            _description, 
            _logo, 
            _demoVideo, 
            _startTime, 
            _endTime, 
            _adminFeePercentage
        );
        
        emit CampaignUpdated(_campaignId, msg.sender);
    }
    
    /**
     * @dev Helper function to validate campaign time updates
     */
    function _validateCampaignTimeUpdate(
        Campaign storage _campaign,
        uint256 _startTime,
        uint256 _endTime
    ) internal view {
        // Can only update start time if campaign hasn't started yet
        if (block.timestamp < _campaign.startTime) {
            require(_startTime > block.timestamp, "Start time must be in the future");
            require(_endTime > _startTime, "End time must be after start time");
        } else {
            require(_endTime > block.timestamp, "End time must be in the future");
        }
    }
    
    /**
     * @dev Helper function to update campaign details
     */
    function _updateCampaignDetails(
        Campaign storage _campaign,
        string memory _name,
        string memory _description,
        string memory _logo,
        string memory _demoVideo,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _adminFeePercentage
    ) internal {
        _campaign.name = _name;
        _campaign.description = _description;
        _campaign.logo = _logo;
        _campaign.demoVideo = _demoVideo;
        
        // Only update start time if campaign hasn't started
        if (block.timestamp < _campaign.startTime) {
            _campaign.startTime = _startTime;
        }
        
        _campaign.endTime = _endTime;
        
        // Admin fee can only be reduced, not increased
        require(_adminFeePercentage <= _campaign.adminFeePercentage, "Cannot increase admin fee");
        _campaign.adminFeePercentage = _adminFeePercentage;
    }
    
    /**
     * @dev Helper function to check if user is authorized to modify an entity
     */
    function _isAuthorizedForEntity(
        Campaign storage _campaign, 
        Entity storage _entity
    ) internal view returns (bool) {
        return msg.sender == _entity.owner || 
               _campaign.campaignAdmins[msg.sender] || 
               adminContract.isSuperAdmin(msg.sender);
    }
    
    /**
     * @dev Submit an entity to a campaign using a struct to reduce stack depth
     */
    function submitEntity(
        uint256 _campaignId,
        EntityCreationParams calldata _params
    ) external payable {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign is not active");
        require(block.timestamp < campaign.endTime, "Campaign has ended");

        // Check if the submitter is a campaign admin
        bool isAdmin = (msg.sender == campaign.admin || 
                        campaign.campaignAdmins[msg.sender] || 
                        adminContract.isSuperAdmin(msg.sender));

        // Only collect fee if not admin
        if (!isAdmin) {
            bool feeSuccess = _collectFee("collectEntityFee()");
            require(feeSuccess, "Fee collection failed");
        }

        // Create entity
        _createEntity(_campaignId, _params, isAdmin);
    }
    
    /**
     * @dev Helper function to create an entity
     */
    function _createEntity(
        uint256 _campaignId, 
        EntityCreationParams calldata _params,
        bool _autoApprove
    ) internal {
        uint256 entityId = campaignEntities[_campaignId].length;
        
        Entity memory newEntity = Entity({
            id: entityId,
            campaignId: _campaignId,
            owner: payable(msg.sender),
            name: _params.name,
            description: _params.description,
            mediaLinks: _params.mediaLinks,
            externalLinks: _params.externalLinks,
            contracts: _params.contracts,
            extraData: _params.extraData,
            approved: _autoApprove,
            active: true,
            voteCount: 0,
            fundsReceived: 0
        });
        
        campaignEntities[_campaignId].push(newEntity);
        emit EntitySubmitted(_campaignId, entityId, msg.sender);
    }

    /**
     * @dev Update entity details
     */
    function updateEntity(
        uint256 _campaignId,
        uint256 _entityId,
        EntityCreationParams calldata _params
    ) external {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign is not active");
        require(block.timestamp < campaign.endTime, "Campaign has ended");
        require(_entityId < campaignEntities[_campaignId].length, "Entity does not exist");
        
        Entity storage entity = campaignEntities[_campaignId][_entityId];
        require(_isAuthorizedForEntity(campaign, entity), "Not authorized");
        require(entity.active, "Entity is not active");
        
        _updateEntityDetails(entity, _params);
        
        emit EntityUpdated(_campaignId, _entityId, msg.sender);
    }
    
    /**
     * @dev Helper function to update entity details
     */
    function _updateEntityDetails(
        Entity storage _entity,
        EntityCreationParams calldata _params
    ) internal {
        // Don't allow updates to approved entities with votes to maintain fairness
        if (_entity.approved && _entity.voteCount > 0) {
            // For approved entities with votes, only allow updating links and media
            _entity.mediaLinks = _params.mediaLinks;
            _entity.externalLinks = _params.externalLinks;
            _entity.contracts = _params.contracts;
            _entity.extraData = _params.extraData;
        } else {
            // For unapproved entities or those without votes, allow full updates
            _entity.name = _params.name;
            _entity.description = _params.description;
            _entity.mediaLinks = _params.mediaLinks;
            _entity.externalLinks = _params.externalLinks;
            _entity.contracts = _params.contracts;
            _entity.extraData = _params.extraData;
        }
    }

    /**
     * @dev Approve an entity for voting
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
     */
    function deactivateEntity(uint256 _campaignId, uint256 _entityId) external onlyCampaignAdmin(_campaignId) {
        require(_entityId < campaignEntities[_campaignId].length, "Entity does not exist");
        
        Entity storage entity = campaignEntities[_campaignId][_entityId];
        require(entity.active, "Entity is already inactive");
        require(entity.voteCount == 0, "Cannot deactivate entity with votes");
        
        entity.active = false;
        emit EntityDeactivated(_campaignId, _entityId, msg.sender);
    }
    
    /**
     * @dev Deactivate a campaign (only by super admin)
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
            (bool success, ) = payable(address(adminContract)).call{value: campaign.totalFunds}("");
            require(success, "Transfer to admin contract failed");
        }
        
        campaign.active = false;
        emit CampaignDeactivated(_campaignId, msg.sender);
    }
    
    /**
     * @dev Add a campaign admin
     */
    function addCampaignAdmin(uint256 _campaignId, address _newAdmin) external onlyCampaignAdmin(_campaignId) {
        require(_newAdmin != address(0), "Invalid address");
        require(!campaigns[_campaignId].campaignAdmins[_newAdmin], "Already an admin for this campaign");
        
        campaigns[_campaignId].campaignAdmins[_newAdmin] = true;
        emit CampaignAdminAdded(_campaignId, _newAdmin, msg.sender);
    }

    /**
     * @dev Remove a campaign admin
     */
    function removeCampaignAdmin(uint256 _campaignId, address _admin) external onlyCampaignAdmin(_campaignId) {
        require(_admin != campaigns[_campaignId].admin, "Cannot remove primary admin");
        require(campaigns[_campaignId].campaignAdmins[_admin], "Not an admin for this campaign");
        
        campaigns[_campaignId].campaignAdmins[_admin] = false;
        emit CampaignAdminRemoved(_campaignId, _admin, msg.sender);
    }
    
    /**
     * @dev Add voter to whitelist for private campaign
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
     * @dev Batch whitelist multiple voters for a private campaign
     */
    function batchWhitelistVoters(uint256 _campaignId, address[] memory _voters) external onlyCampaignAdmin(_campaignId) {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.isPrivate, "Campaign is not private");
        
        for (uint256 i = 0; i < _voters.length; i++) {
            address voter = _voters[i];
            if (!campaign.whitelistedVoters[voter]) {
                campaign.whitelistedVoters[voter] = true;
                emit VoterWhitelisted(_campaignId, voter, msg.sender);
            }
        }
    }
    
    /**
     * @dev Check if user is admin for comment operations
     */
    function _isAdminForComment(
        Campaign storage _campaign, 
        address _user
    ) internal view returns (bool) {
        return (
            _campaign.admin == _user ||
            _campaign.campaignAdmins[_user] ||
            adminContract.isSuperAdmin(_user)
        );
    }
    
    /**
     * @dev Add a comment to an entity
     */
    function addComment(uint256 _campaignId, uint256 _entityId, string memory _content) external payable {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        require(_entityId < campaignEntities[_campaignId].length, "Entity does not exist");
        require(bytes(_content).length > 0 && bytes(_content).length <= 1000, "Comment length invalid");
        
        Campaign storage campaign = campaigns[_campaignId];
        
        // Check if campaign is private and commenter is whitelisted
        if (campaign.isPrivate) {
            require(campaign.whitelistedVoters[msg.sender], "Not whitelisted for this private campaign");
        }
        
        // Collect comment fee unless commenter is admin
        bool isAdmin = _isAdminForComment(campaign, msg.sender);
        
        if (!isAdmin) {
            bool feeSuccess = _collectFee("collectCommentFee()");
            require(feeSuccess, "Fee collection failed");
        }
        
        _createComment(_campaignId, _entityId, _content);
    }
    
    /**
     * @dev Helper function to create a comment
     */
    function _createComment(
        uint256 _campaignId, 
        uint256 _entityId, 
        string memory _content
    ) internal {
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
     * @dev Remove a comment
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
            _isAdminForComment(campaigns[_campaignId], msg.sender) // Any admin
        );
        
        require(isAuthorized, "Not authorized to remove comment");
        
        comment.isActive = false;
        emit CommentRemoved(_campaignId, _entityId, _commentId, msg.sender);
    }
    
    // --- View Functions ---
    
    /**
     * @dev Check if an address is a campaign admin
     */
    function isCampaignAdmin(uint256 _campaignId, address _admin) external view returns (bool) {
        if (_campaignId >= campaigns.length) return false;
        return campaigns[_campaignId].admin == _admin || 
               campaigns[_campaignId].campaignAdmins[_admin] || 
               adminContract.isSuperAdmin(_admin);
    }
    
    /**
     * @dev Check if voter is whitelisted for a private campaign
     */
    function isVoterWhitelisted(uint256 _campaignId, address _voter) external view returns (bool) {
        if (_campaignId >= campaigns.length) return false;
        
        Campaign storage campaign = campaigns[_campaignId];
        if (!campaign.isPrivate) return true; // All voters are implicitly whitelisted for public campaigns
        
        return campaign.whitelistedVoters[_voter];
    }
    
    /**
     * @dev Check if a campaign is private
     */
    function isCampaignPrivate(uint256 _campaignId) external view returns (bool) {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        return campaigns[_campaignId].isPrivate;
    }
    
    /**
     * @dev Get entity details
     */
    function getEntity(uint256 _campaignId, uint256 _entityId) external view returns (Entity memory) {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        require(_entityId < campaignEntities[_campaignId].length, "Entity does not exist");
        return campaignEntities[_campaignId][_entityId];
    }
    
    /**
     * @dev Get comments for an entity with pagination
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
     */
    function getEntityCommentCount(uint256 _campaignId, uint256 _entityId) external view returns (uint256) {
        require(_campaignId < campaigns.length, "Campaign does not exist");
        require(_entityId < campaignEntities[_campaignId].length, "Entity does not exist");
        
        return entityComments[_campaignId][_entityId].length;
    }
    
    /**
     * @dev Get user's comment history with pagination
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
    
    /**
     * @dev Get basic campaign info
     * This reduces the number of return values to avoid stack too deep errors
     */
    function getCampaignBasicInfo(uint256 _campaignId) external view returns (
        uint256 id,
        address admin,
        string memory name,
        string memory description,
        string memory logo,
        string memory demoVideo,
        uint256 startTime,
        uint256 endTime
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
            campaign.endTime
        );
    }

    /**
     * @dev Get campaign configuration info
     * Split from getCampaign to avoid stack too deep errors
     */
    function getCampaignConfigInfo(uint256 _campaignId) external view returns (
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
     * @dev Get campaign count
     */
    function getCampaignCount() external view returns (uint256) {
        return campaigns.length;
    }

    /**
     * @dev Get entity count for a campaign
     */
    function getEntityCount(uint256 _campaignId) external view returns (uint256) {
        return campaignEntities[_campaignId].length;
    }
    
    /**
     * @dev Update campaign funds (only called by voting contract)
     */
    function updateCampaignFunds(uint256 _campaignId, uint256 _amount) external {
        // This function should only be callable by the voting contract
        // Implementation will depend on the voting contract's address
        campaigns[_campaignId].totalFunds += _amount;
    }
    
    /**
     * @dev Update entity vote count (only called by voting contract)
     */
    function updateEntityVoteCount(uint256 _campaignId, uint256 _entityId, uint256 _voteCount) external {
        // This function should only be callable by the voting contract
        // Implementation will depend on the voting contract's address
        campaignEntities[_campaignId][_entityId].voteCount += _voteCount;
    }
    
    /**
     * @dev Update entity funds received (only called by distribution contract)
     */
    function updateEntityFundsReceived(uint256 _campaignId, uint256 _entityId, uint256 _amount) external {
        // This function should only be callable by the distribution contract
        // Implementation will depend on the distribution contract's address
        campaignEntities[_campaignId][_entityId].fundsReceived += _amount;
    }
}