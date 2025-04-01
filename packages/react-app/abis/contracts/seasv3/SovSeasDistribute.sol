// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./SovSeasCampaign.sol";
import "./SovSeasAdmin.sol";

/**
 * @title SovereignSeas Distribution Contract
 * @dev Handles fund distribution and utility functions for the SovereignSeas ecosystem
 */
contract SovSeasDistribute is ReentrancyGuard {
    // Reference to campaign and admin contracts
    SovSeasCampaign public campaignContract;
    SovSeasAdmin public adminContract;
    
    // Events
    event FundsDistributed(uint256 indexed campaignId);
    
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
     * @dev Modifier to check if caller is a campaign admin
     */
    modifier onlyCampaignAdmin(uint256 _campaignId) {
        require(campaignContract.isCampaignAdmin(_campaignId, msg.sender), 
                "Only campaign admin can call this function");
        _;
    }
    
    /**
     * @dev Distributes funds after campaign ends
     * @param _campaignId Campaign ID
     */
    function distributeFunds(uint256 _campaignId) external nonReentrant onlyCampaignAdmin(_campaignId) {
        // Validate campaign status and calculate fees
        (
            address campaignAdmin,
            uint256 adminFeePercentage,
            uint256 maxWinners,
            SovSeasCampaign.DistributionType distributionType,
            bool active,
            uint256 totalFunds
        ) = _validateCampaignAndGetConfig(_campaignId);
        
        // Get sorted entities
        SovSeasCampaign.Entity[] memory sortedEntities = getSortedEntities(_campaignId);
        
        // If no votes, return funds to platform
        if (sortedEntities.length == 0 || sortedEntities[0].voteCount == 0) {
            _returnFundsToPlatform(totalFunds);
            emit FundsDistributed(_campaignId);
            return;
        }

        // Calculate fees
        (uint256 platformFeeAmount, uint256 adminFeeAmount, uint256 remainingFunds) = 
            adminContract.calculateFees(totalFunds, adminFeePercentage);

        // Transfer fees
        _transferFees(platformFeeAmount, adminFeeAmount, campaignAdmin);

        // Determine number of winners and distribute funds
        uint256 actualWinners = _getActualWinnerCount(sortedEntities, maxWinners);

        if (actualWinners == 0) {
            // No winners with votes, return funds to platform
            _returnFundsToPlatform(remainingFunds);
            emit FundsDistributed(_campaignId);
            return;
        }

        // Distribute funds based on distribution type
        _distributeFundsByType(
            _campaignId, 
            sortedEntities, 
            actualWinners, 
            remainingFunds, 
            distributionType
        );

        emit FundsDistributed(_campaignId);
    }
    /**
     * @dev Validates campaign status and returns configuration info
     */
    function _validateCampaignAndGetConfig(uint256 _campaignId) internal view returns (
        address campaignAdmin,
        uint256 adminFeePercentage,
        uint256 maxWinners,
        SovSeasCampaign.DistributionType distributionType,
        bool active,
        uint256 totalFunds
    ) {
        // Get campaign basic info
        uint256 endTime;
        {
            uint256 id;
            string memory name;
            string memory description;
            string memory logo;
            string memory demoVideo;
            uint256 startTime;
            
            (id, campaignAdmin, name, description, logo, demoVideo, startTime, endTime) = 
                campaignContract.getCampaignBasicInfo(_campaignId);
        }
        
        // Get campaign config info
        {
            uint256 voteMultiplier;
            SovSeasCampaign.CampaignType campaignType;
            bool refundable;
            bool isPrivate;
            
            (adminFeePercentage, voteMultiplier, maxWinners, campaignType, distributionType, 
            refundable, isPrivate, active, totalFunds) = 
                campaignContract.getCampaignConfigInfo(_campaignId);
        }
        
        require(active, "Campaign already finalized");
        require(
            block.timestamp > endTime || adminContract.isSuperAdmin(msg.sender), 
            "Campaign has not ended or caller is not super admin"
        );
    }
    
 
    /**
     * @dev Returns funds to platform
     */
    function _returnFundsToPlatform(uint256 _amount) internal {
        (bool success, ) = payable(address(adminContract)).call{value: _amount}("");
        require(success, "Transfer to admin contract failed");
    }
    
    /**
     * @dev Transfers platform and admin fees
     */
    function _transferFees(
        uint256 _platformFeeAmount, 
        uint256 _adminFeeAmount, 
        address _campaignAdmin
    ) internal {
        // Transfer platform fee
        (bool platformFeeSuccess, ) = payable(address(adminContract)).call{value: _platformFeeAmount}("");
        require(platformFeeSuccess, "Platform fee transfer failed");

        // Transfer admin fee
        (bool adminFeeSuccess, ) = payable(_campaignAdmin).call{value: _adminFeeAmount}("");
        require(adminFeeSuccess, "Admin fee transfer failed");
    }
    
    /**
     * @dev Calculates actual winner count based on maxWinners and vote counts
     */
    function _getActualWinnerCount(
        SovSeasCampaign.Entity[] memory _sortedEntities, 
        uint256 _maxWinners
    ) internal pure returns (uint256) {
        // Determine number of winners
        uint256 winnersCount;
        if (_maxWinners == 0 || _maxWinners >= _sortedEntities.length) {
            // If maxWinners is 0 or greater than available entities, all entities with votes win
            winnersCount = _sortedEntities.length;
        } else {
            winnersCount = _maxWinners;
        }

        // Only count entities with votes
        uint256 actualWinners = 0;
        for (uint256 i = 0; i < winnersCount; i++) {
            if (i < _sortedEntities.length && _sortedEntities[i].voteCount > 0) {
                actualWinners++;
            } else {
                break;
            }
        }
        
        return actualWinners;
    }
    
    /**
     * @dev Distributes funds based on the selected distribution type
     */
    function _distributeFundsByType(
        uint256 _campaignId,
        SovSeasCampaign.Entity[] memory _sortedEntities,
        uint256 _actualWinners,
        uint256 _remainingFunds,
        SovSeasCampaign.DistributionType _distributionType
    ) internal {
        if (_distributionType == SovSeasCampaign.DistributionType.Quadratic) {
            distributeQuadratic(_campaignId, _sortedEntities, _actualWinners, _remainingFunds);
        } else if (_distributionType == SovSeasCampaign.DistributionType.Equal) {
            distributeEqual(_campaignId, _sortedEntities, _actualWinners, _remainingFunds);
        } else if (_distributionType == SovSeasCampaign.DistributionType.Winner) {
            distributeWinnerTakesAll(_campaignId, _sortedEntities, _remainingFunds);
        } else {
            // Default to Linear distribution
            distributeLinear(_campaignId, _sortedEntities, _actualWinners, _remainingFunds);
        }
    }
    
    /**
     * @dev Helper function to transfer funds to an entity owner
     */
    function _transferFundsToEntity(
        uint256 _campaignId,
        uint256 _entityId,
        address payable _owner,
        uint256 _amount
    ) internal {
        // Update entity funds received in campaign contract
        campaignContract.updateEntityFundsReceived(_campaignId, _entityId, _amount);
        
        // Transfer funds to entity owner
        (bool success, ) = _owner.call{value: _amount}("");
        require(success, "Transfer to entity owner failed");
    }
    
    /**
     * @dev Distribute funds using quadratic voting formula
     */
    function distributeQuadratic(
        uint256 _campaignId, 
        SovSeasCampaign.Entity[] memory sortedEntities, 
        uint256 actualWinners,
        uint256 remainingFunds
    ) internal {
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
            uint256 entityShare = (remainingFunds * weights[i]) / totalWeight;
            _transferFundsToEntity(
                _campaignId, 
                sortedEntities[i].id, 
                sortedEntities[i].owner, 
                entityShare
            );
        }
    }
    
    /**
     * @dev Distribute funds equally among winners
     */
    function distributeEqual(
        uint256 _campaignId, 
        SovSeasCampaign.Entity[] memory sortedEntities, 
        uint256 actualWinners,
        uint256 remainingFunds
    ) internal {
        // Equal distribution - each winner gets the same amount
        if (actualWinners > 0) {
            uint256 sharePerWinner = remainingFunds / actualWinners;
            
            for (uint256 i = 0; i < actualWinners; i++) {
                _transferFundsToEntity(
                    _campaignId, 
                    sortedEntities[i].id, 
                    sortedEntities[i].owner, 
                    sharePerWinner
                );
            }
        } else {
            // No winners, return funds to platform
            _returnFundsToPlatform(remainingFunds);
        }
    }
    
    /**
     * @dev Helper to calculate shares for tied entities
     */
    function _calculateTiedShares(
        SovSeasCampaign.Entity[] memory _sortedEntities,
        uint256 _lastPosition,
        uint256 _tiedCount,
        uint256 _remainingFunds
    ) internal pure returns (
        uint256 totalVotesForDefiniteWinners,
        uint256 remainingForTied
    ) {
        // Calculate total votes for definite winners (those not tied)
        totalVotesForDefiniteWinners = 0;
        for (uint256 i = 0; i < _lastPosition; i++) {
            totalVotesForDefiniteWinners += _sortedEntities[i].voteCount;
        }
        
        // Calculate share for each definite winner and sum up
        uint256 allocatedFunds = 0;
        for (uint256 i = 0; i < _lastPosition; i++) {
            uint256 entityShare = 
                (_remainingFunds * _sortedEntities[i].voteCount) / totalVotesForDefiniteWinners;
            allocatedFunds += entityShare;
        }
        
        // Calculate remaining funds for tied entities
        remainingForTied = _remainingFunds - allocatedFunds;
    }
    
    /**
     * @dev Distribute funds linearly based on vote counts
     */
    function distributeLinear(
        uint256 _campaignId, 
        SovSeasCampaign.Entity[] memory sortedEntities, 
        uint256 actualWinners,
        uint256 remainingFunds
    ) internal {
        if (actualWinners == 0) {
            // No winners, return funds to platform
            _returnFundsToPlatform(remainingFunds);
            return;
        }
        
        // First, check if there are entities with tied votes at the cutoff position
        uint256 lastPosition = actualWinners - 1;
        uint256 cutoffVotes = 0;
        uint256 tiedCount = 1; // At least the last winner is in this position
        
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
        
        // Handle distribution based on whether there are ties
        if (tiedCount > 1) {
            // Calculate shares for definite winners and tied entities
            (uint256 totalWinningVotes, uint256 remainingForTied) = 
                _calculateTiedShares(sortedEntities, lastPosition, tiedCount, remainingFunds);
            
            // Distribute to definite winners
            for (uint256 i = 0; i < lastPosition; i++) {
                uint256 entityShare = (remainingFunds * sortedEntities[i].voteCount) / totalWinningVotes;
                _transferFundsToEntity(
                    _campaignId, 
                    sortedEntities[i].id, 
                    sortedEntities[i].owner, 
                    entityShare
                );
            }
            
            // Divide the remaining portion equally among tied entities
            uint256 tieShare = remainingForTied / tiedCount;
            
            // Distribute to tied entities at the cutoff position
            for (uint256 i = lastPosition; i < lastPosition + tiedCount; i++) {
                if (i < sortedEntities.length) {
                    _transferFundsToEntity(
                        _campaignId, 
                        sortedEntities[i].id, 
                        sortedEntities[i].owner, 
                        tieShare
                    );
                }
            }
        } else {
            // No ties, proceed with normal distribution
            uint256 totalWinningVotes = 0;
            for (uint256 i = 0; i < actualWinners; i++) {
                totalWinningVotes += sortedEntities[i].voteCount;
            }
            
            for (uint256 i = 0; i < actualWinners; i++) {
                uint256 entityShare = (remainingFunds * sortedEntities[i].voteCount) / totalWinningVotes;
                _transferFundsToEntity(
                    _campaignId, 
                    sortedEntities[i].id, 
                    sortedEntities[i].owner, 
                    entityShare
                );
            }
        }
    }
    
    /**
     * @dev Distribute funds using winner-takes-all approach
     */
    function distributeWinnerTakesAll(
        uint256 _campaignId, 
        SovSeasCampaign.Entity[] memory sortedEntities,
        uint256 remainingFunds
    ) internal {
        // Winner takes all - only the top entity gets funds
        if (sortedEntities.length > 0 && sortedEntities[0].voteCount > 0) {
            _transferFundsToEntity(
                _campaignId, 
                sortedEntities[0].id, 
                sortedEntities[0].owner, 
                remainingFunds
            );
        } else {
            // No valid winner, return funds to platform
            _returnFundsToPlatform(remainingFunds);
        }
    }
    
    /**
     * @dev Helper function to create a fixed-size array from a variable-size one
     */
    function _createFixedSizeArray(
        SovSeasCampaign.Entity[] memory _sourceArray, 
        uint256 _validCount
    ) internal pure returns (SovSeasCampaign.Entity[] memory) {
        SovSeasCampaign.Entity[] memory result = new SovSeasCampaign.Entity[](_validCount);
        
        for (uint256 i = 0; i < _validCount; i++) {
            result[i] = _sourceArray[i];
        }
        
        return result;
    }
    
    /**
     * @dev Get sorted entities for a campaign (by vote count, descending)
     * @param _campaignId Campaign ID
     * @return Sorted array of entities
     */
    function getSortedEntities(uint256 _campaignId) public view returns (SovSeasCampaign.Entity[] memory) {
        uint256 entityCount = campaignContract.getEntityCount(_campaignId);
        
        // Create an array to store approved and active entities
        SovSeasCampaign.Entity[] memory entitiesWithVotes = new SovSeasCampaign.Entity[](entityCount);
        uint256 validCount = 0;
        
        // Get all entities and filter for approved and active ones
        for (uint256 i = 0; i < entityCount; i++) {
            SovSeasCampaign.Entity memory entity = campaignContract.getEntity(_campaignId, i);
            if (entity.approved && entity.active) {
                entitiesWithVotes[validCount] = entity;
                validCount++;
            }
        }
        
        // Create a properly sized array for the valid entities
        SovSeasCampaign.Entity[] memory validEntities = _createFixedSizeArray(entitiesWithVotes, validCount);
        
        // Sort entities by vote count (descending)
        _sortEntitiesByVotes(validEntities);
        
        return validEntities;
    }
    
    /**
     * @dev Sorts entities by vote count in descending order
     */
    function _sortEntitiesByVotes(SovSeasCampaign.Entity[] memory _entities) internal pure {
        uint256 length = _entities.length;
        
        for (uint256 i = 0; i < length; i++) {
            for (uint256 j = i + 1; j < length; j++) {
                if (_entities[j].voteCount > _entities[i].voteCount) {
                    SovSeasCampaign.Entity memory temp = _entities[i];
                    _entities[i] = _entities[j];
                    _entities[j] = temp;
                }
            }
        }
    }
    
    /**
     * @dev Helper function to calculate square root of a number
     * @param x The number to calculate the square root of
     * @return y The square root of x
     */
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}