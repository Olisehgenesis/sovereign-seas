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

    uint256 public constant PLATFORM_FEE_PERCENT = 10; // 10% fee on refunds
    address payable public platformTreasury; // Address to collect platform fees

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
        address indexed voter,
        uint256 indexed campaignId,
        uint256 indexed entityId,
        uint256 amount,
        uint256 voteCount,
        string voterName,
        address voterWallet
    );
    
    event VoteRefunded(
        address indexed voter,
        uint256 indexed campaignId,
        uint256 indexed entityId,
        uint256 amount
    );

    /**
     * @dev Constructor sets reference to campaign, admin, and treasury contracts
     * @param _campaignContract Address of the campaign contract
     * @param _adminContract Address of the admin contract
     * @param _platformTreasury Address to collect platform fees
     */
    constructor(address _campaignContract, address _adminContract, address payable _platformTreasury) {
        campaignContract = SovSeasCampaign(_campaignContract);
        adminContract = SovSeasAdmin(payable(_adminContract));
        platformTreasury = _platformTreasury; // Set treasury address
    }

    /**
     * @dev Validate campaign and entity for voting
     */
    function _validateVoteRequirements(
        uint256 _campaignId, 
        uint256 _entityId, 
        address _voter
    ) internal view returns (
        uint256 voteMultiplier,
        SovSeasCampaign.Entity memory entity
    ) {
        (
            , , , , , , 
            uint256 startTime, 
            uint256 endTime
        ) = campaignContract.getCampaignBasicInfo(_campaignId);
        
        (
            , , , , , 
            bool refundable,
            bool isPrivate,
            bool active,
            // Add a placeholder for the extra returned value
            // or assign it to a variable if needed
            // Example: bool extraValue
        ) = campaignContract.getCampaignConfigInfo(_campaignId);

        require(active, "Campaign is not active");
        require(block.timestamp >= startTime, "Campaign has not started");
        require(block.timestamp <= endTime, "Campaign has ended");

        if (isPrivate) {
            require(campaignContract.isVoterWhitelisted(_campaignId, _voter), "Not whitelisted for this private campaign");
        }

        entity = campaignContract.getEntity(_campaignId, _entityId);
        require(entity.approved, "Entity is not approved");
        require(entity.active, "Entity is not active");
    }

    /**
     * @dev Record a vote with voter name and wallet
     */
    function _recordVote(
        uint256 _campaignId, 
        uint256 _entityId, 
        uint256 _amount, 
        uint256 _voteCount,
        string memory _voterName,
        address _voterWallet
    ) internal {
        address voterWallet = _voterWallet == address(0) ? msg.sender : _voterWallet; // Default to sender if not set
        
        userVotes[_campaignId][msg.sender][_entityId] += _amount;
        totalUserVotesInCampaign[_campaignId][msg.sender] += _amount;

        campaignContract.updateEntityVoteCount(_campaignId, _entityId, _voteCount);
        campaignContract.updateCampaignFunds(_campaignId, _amount);

        userVoteHistory[msg.sender].push(
            Vote({
                voter: msg.sender,
                voterName: _voterName,
                voterWallet: voterWallet,
                campaignId: _campaignId,
                entityId: _entityId,
                amount: _amount,
                voteCount: _voteCount,
                refunded: false
            })
        );

        emit VoteCast(msg.sender, _campaignId, _entityId, _amount, _voteCount, _voterName, voterWallet);
    }

    /**
     * @dev Vote for an entity using CELO tokens with voter name
     */
    function vote(uint256 _campaignId, uint256 _entityId, string memory _voterName, address _voterWallet) external payable nonReentrant {
        require(msg.value > 0, "Amount must be greater than 0");

        (uint256 voteMultiplier, ) = _validateVoteRequirements(_campaignId, _entityId, msg.sender);
        uint256 voteCount = msg.value * voteMultiplier;

        _recordVote(_campaignId, _entityId, msg.value, voteCount, _voterName, _voterWallet);
    }

    /**
     * @dev Process refund with 10% platform fee
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

        SovSeasCampaign.Entity memory entity = campaignContract.getEntity(_campaignId, vote.entityId);

        if (entity.fundsReceived > 0) {
            uint256 refundAmount = vote.amount;
            uint256 platformFee = (refundAmount * PLATFORM_FEE_PERCENT) / 100;
            uint256 userRefund = refundAmount - platformFee;

            vote.refunded = true;
            emit VoteRefunded(msg.sender, _campaignId, vote.entityId, userRefund);

            (bool feeSent, ) = platformTreasury.call{value: platformFee}("");
            require(feeSent, "Platform fee transfer failed");

            return userRefund;
        }

        return 0;
    }

    /**
     * @dev Request refund for votes
     */
    function requestRefund(uint256 _campaignId, uint256[] memory _voteIndexes) external nonReentrant {
        _validateRefundRequirements(_campaignId);

        uint256 totalRefundAmount = 0;

        for (uint256 i = 0; i < _voteIndexes.length; i++) {
            totalRefundAmount += _processVoteRefund(_voteIndexes[i], _campaignId);
        }

        require(totalRefundAmount > 0, "No refundable votes found");

        (bool success, ) = payable(msg.sender).call{value: totalRefundAmount}("");
        require(success, "Refund transfer failed");
    }

    /**
     * @dev Validate refund requirements
     */
    function _validateRefundRequirements(uint256 _campaignId) internal view {
         (
            , , , , , , 
            uint256 startTime, 
            uint256 endTime
        ) = campaignContract.getCampaignBasicInfo(_campaignId);
        
        (
            , , , , , 
            bool refundable,
            bool isPrivate,
            bool active,
            // Add a placeholder for the extra returned value
            // or assign it to a variable if needed
            // Example: bool extraValue
        ) = campaignContract.getCampaignConfigInfo(_campaignId);

        require(!active, "Campaign must be finalized for refunds");
        require(refundable, "Campaign does not support refunds");
        require(block.timestamp > endTime, "Campaign has not ended");
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