// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./SovSeasCampaign.sol";
import "./SovSeasAdmin.sol";

/**
 * @title SovereignSeas Voting Contract
 * @dev Handles voting for entities in campaigns and vote history
 */
contract SovSeasVote is ReentrancyGuard {
    // Reference to campaign and admin contracts
    SovSeasCampaign public campaignContract;
    SovSeasAdmin public adminContract;
    
    // Vote struct
    struct Vote {
    address voter;
    string voterName;
    address voterWallet;
    uint256 campaignId;
    uint256 entityId;
    uint256 amount;
    uint256 voteCount;
    bool refunded;
}

    
    // Storage
    mapping(uint256 => mapping(address => mapping(uint256 => uint256))) public userVotes; // campaignId => user => entityId => voteAmount
    mapping(uint256 => mapping(address => uint256)) public totalUserVotesInCampaign; // campaignId => user => totalVotes
    mapping(address => Vote[]) public userVoteHistory;
    
    // Events
    event VoteCast(
        address indexed voter, uint256 indexed campaignId, uint256 indexed entityId, uint256 amount, uint256 voteCount
    );
    event VoteRefunded(address indexed voter, uint256 indexed campaignId, uint256 indexed entityId, uint256 amount);
    
    /**
     * @dev Constructor sets reference to campaign and admin contracts
     * @param _campaignContract Address of the campaign contract
     * @param _adminContract Address of the admin contract
     */
    constructor(address _campaignContract, address _adminContract) {
        campaignContract = SovSeasCampaign(_campaignContract);
        adminContract = SovSeasAdmin(payable(_adminContract));
    }
    
    /**
     * @dev Helper function to validate campaign for voting
     * @param _campaignId Campaign ID
     * @param _entityId Entity ID
     * @param _voter Voter address
     */
    // For the _validateVoteRequirements function:
function _validateVoteRequirements(
    uint256 _campaignId, 
    uint256 _entityId, 
    address _voter
) internal view returns (
    uint256 voteMultiplier,
    SovSeasCampaign.Entity memory entity
) {
    // Get campaign basic info
    (
        , // id
        , // admin
        , // name
        , // description
        , // logo
        , // demoVideo
        uint256 startTime, 
        uint256 endTime
    ) = campaignContract.getCampaignBasicInfo(_campaignId);
    
    (
    , , , , , 
    bool refundable,
    bool isPrivate, // <--- This was missing
    bool active,
    
    ) = campaignContract.getCampaignConfigInfo(_campaignId);

    
    // Rest of the function...

        require(active, "Campaign is not active");
        require(block.timestamp >= startTime, "Campaign has not started");
        require(block.timestamp <= endTime, "Campaign has ended");
        
        // Check if campaign is private and voter is whitelisted
        if (isPrivate) {
            require(campaignContract.isVoterWhitelisted(_campaignId, _voter), "Not whitelisted for this private campaign");
        }
        
        // Check if entity exists, is approved and active
        entity = campaignContract.getEntity(_campaignId, _entityId);
        require(entity.approved, "Entity is not approved");
        require(entity.active, "Entity is not active");
    }
    
    /**
     * @dev Helper function to record a vote
     * @param _campaignId Campaign ID
     * @param _entityId Entity ID
     * @param _amount Vote amount
     * @param _voteCount Calculated vote count
     */
    function _recordVote(
        uint256 _campaignId, 
        uint256 _entityId, 
        uint256 _amount, 
        uint256 _voteCount
    ) internal {
        // Update vote tracking
        userVotes[_campaignId][msg.sender][_entityId] += _amount;
        totalUserVotesInCampaign[_campaignId][msg.sender] += _amount;

        // Update entity vote count in campaign contract
        campaignContract.updateEntityVoteCount(_campaignId, _entityId, _voteCount);
        
        // Update campaign total funds in campaign contract
        campaignContract.updateCampaignFunds(_campaignId, _amount);

        // Record vote in user history
        userVoteHistory[msg.sender].push(
            Vote({
                voter: msg.sender,
                campaignId: _campaignId,
                entityId: _entityId,
                amount: _amount,
                voteCount: _voteCount,
                refunded: false
            })
        );

        emit VoteCast(msg.sender, _campaignId, _entityId, _amount, _voteCount);
    }
    
    /**
     * @dev Vote for an entity using native CELO tokens
     * @param _campaignId Campaign ID
     * @param _entityId Entity ID
     */
    function vote(uint256 _campaignId, uint256 _entityId) external payable nonReentrant {
        require(msg.value > 0, "Amount must be greater than 0");
        
        // Validate vote requirements
        (uint256 voteMultiplier, ) = _validateVoteRequirements(_campaignId, _entityId, msg.sender);

        // Calculate vote count based on vote multiplier
        uint256 voteCount = msg.value * voteMultiplier;
        
        // Record the vote
        _recordVote(_campaignId, _entityId, msg.value, voteCount);
    }
    
    /**
     * @dev Helper function to validate refund requirements
     * @param _campaignId Campaign ID
     */
    function _validateRefundRequirements(uint256 _campaignId) internal view {
        // Get campaign config info
        (
            , , , , , 
            bool refundable,
            ,
            bool active,
            
        ) = campaignContract.getCampaignConfigInfo(_campaignId);
        
        // Get end time from basic info
        (
            , , , , , , 
            , 
            uint256 endTime
        ) = campaignContract.getCampaignBasicInfo(_campaignId);
        
        require(!active, "Campaign must be finalized for refunds");
        require(refundable, "Campaign does not support refunds");
        require(block.timestamp > endTime, "Campaign has not ended");
    }
    
    /**
     * @dev Process refund for a single vote
     * @param _voteIndex Index of vote in user's history
     * @param _campaignId Campaign ID to validate
     * @return Amount to refund if eligible, 0 otherwise
     */
    function _processVoteRefund(
        uint256 _voteIndex, 
        uint256 _campaignId
    ) internal returns (uint256) {
        require(_voteIndex < userVoteHistory[msg.sender].length, "Invalid vote index");
        
        Vote storage vote = userVoteHistory[msg.sender][_voteIndex];
        if (vote.campaignId != _campaignId || vote.refunded) {
            return 0;
        }
        
        // Only refund if the vote was for a winning entity in Poll campaigns
        SovSeasCampaign.Entity memory entity = campaignContract.getEntity(_campaignId, vote.entityId);
        
        // Check if the entity received funds (which means it was a winner)
        if (entity.fundsReceived > 0) {
            vote.refunded = true;
            emit VoteRefunded(msg.sender, _campaignId, vote.entityId, vote.amount);
            return vote.amount;
        }
        
        return 0;
    }
    
    /**
     * @dev Request refund for votes in a refundable campaign
     * @param _campaignId Campaign ID
     * @param _voteIndexes Array of vote indexes in user's history to refund
     */
    function requestRefund(uint256 _campaignId, uint256[] memory _voteIndexes) external nonReentrant {
        // Validate refund requirements
        _validateRefundRequirements(_campaignId);
        
        uint256 totalRefundAmount = 0;
        
        // Process each vote for refund
        for (uint256 i = 0; i < _voteIndexes.length; i++) {
            totalRefundAmount += _processVoteRefund(_voteIndexes[i], _campaignId);
        }
        
        require(totalRefundAmount > 0, "No refundable votes found");
        
        // Send the refund
        (bool success, ) = payable(msg.sender).call{value: totalRefundAmount}("");
        require(success, "Refund transfer failed");
    }
    
    /**
     * @dev Get votes for an entity from a user
     * @param _campaignId Campaign ID
     * @param _user User address
     * @param _entityId Entity ID
     * @return Amount of CELO tokens used for voting
     */
    function getUserVotesForEntity(uint256 _campaignId, address _user, uint256 _entityId)
        external
        view
        returns (uint256)
    {
        return userVotes[_campaignId][_user][_entityId];
    }

    /**
     * @dev Get total votes for a user in a campaign
     * @param _campaignId Campaign ID
     * @param _user User address
     * @return Total amount of CELO tokens used for voting
     */
    function getUserTotalVotesInCampaign(uint256 _campaignId, address _user) external view returns (uint256) {
        return totalUserVotesInCampaign[_campaignId][_user];
    }

    /**
     * @dev Get user vote history
     * @param _user User address
     * @return Array of user votes
     */
    function getUserVoteHistory(address _user) external view returns (Vote[] memory) {
        return userVoteHistory[_user];
    }
    
    /**
     * @dev Helper function for pagination
     * @param _total Total items
     * @param _startIndex Start index
     * @param _count Requested count
     * @return Actual count to use
     */
    function _calculatePaginationCount(
        uint256 _total, 
        uint256 _startIndex, 
        uint256 _count
    ) internal pure returns (uint256) {
        // Handle out-of-bounds start index
        if (_startIndex >= _total) {
            return 0;
        }
        
        // Calculate actual count (don't go past end of array)
        if (_startIndex + _count > _total) {
            return _total - _startIndex;
        }
        
        return _count;
    }
    
    /**
     * @dev Get user vote history with pagination
     * @param _user User address
     * @param _startIndex Start index for pagination
     * @param _count Number of votes to retrieve
     * @return Array of user votes
     */
    function getUserVoteHistoryPaginated(
        address _user, 
        uint256 _startIndex, 
        uint256 _count
    ) external view returns (Vote[] memory) {
        uint256 totalVotes = userVoteHistory[_user].length;
        uint256 actualCount = _calculatePaginationCount(totalVotes, _startIndex, _count);
        
        if (actualCount == 0) {
            Vote[] memory emptyArray = new Vote[](0);
            return emptyArray;
        }
        
        Vote[] memory result = new Vote[](actualCount);
        for (uint256 i = 0; i < actualCount; i++) {
            result[i] = userVoteHistory[_user][_startIndex + i];
        }
        
        return result;
    }
    
    /**
     * @dev Get total number of votes for a user
     * @param _user User address
     * @return Number of votes
     */
    function getUserVoteCount(address _user) external view returns (uint256) {
        return userVoteHistory[_user].length;
    }
}