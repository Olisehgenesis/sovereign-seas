// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./TournamentCore.sol";

/*//////////////////////////////////////////////////////////////
                    TOURNAMENT VOTING CONTRACT
//////////////////////////////////////////////////////////////*/

contract TournamentVoting is TournamentCore {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _sovseas, address _baseToken) TournamentCore(_sovseas, _baseToken) {}

    /*//////////////////////////////////////////////////////////////
                                VOTING
    //////////////////////////////////////////////////////////////*/

    function voteWithToken(uint256 _tournamentId, uint256 _projectId, address _token, uint256 _amount) external nonReentrant whenNotPaused {
        require(_token != address(baseToken), "Use voteWithCelo for CELO");
        Tournament storage tournament = tournaments[_tournamentId];
        require(_amount >= tournament.config.minVoteAmount, "Amount too small");
        _vote(_tournamentId, _projectId, _token, _amount);
    }

    function voteWithCelo(uint256 _tournamentId, uint256 _projectId) external payable nonReentrant whenNotPaused {
        Tournament storage tournament = tournaments[_tournamentId];
        require(msg.value >= tournament.config.minVoteAmount, "Amount too small");
        _vote(_tournamentId, _projectId, address(baseToken), msg.value);
    }

    function batchVoteWithToken(
        uint256 _tournamentId,
        uint256[] calldata _projectIds,
        address _token,
        uint256[] calldata _amounts
    ) external nonReentrant whenNotPaused {
        require(_token != address(baseToken), "Use batchVoteWithCelo for CELO");
        require(_projectIds.length == _amounts.length, "Arrays length mismatch");
        require(_projectIds.length > 0, "Empty arrays");

        Tournament storage tournament = tournaments[_tournamentId];
        require(_amounts.length <= 50, "Max 50 votes per batch"); // Gas limit protection

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            require(_amounts[i] >= tournament.config.minVoteAmount, "Amount too small");
            totalAmount += _amounts[i];
        }

        // Transfer all tokens at once
        IERC20(_token).safeTransferFrom(msg.sender, address(this), totalAmount);

        uint256 currentStageNumber = getCurrentStageNumber(_tournamentId);
        uint256 successfulVotes = 0;

        for (uint256 i = 0; i < _projectIds.length; i++) {
            try this.batchVoteInternal(_tournamentId, _projectIds[i], _token, _amounts[i], msg.sender) {
                successfulVotes++;
            } catch {
                // Refund failed vote
                IERC20(_token).safeTransfer(msg.sender, _amounts[i]);
            }
        }

        require(successfulVotes > 0, "No votes succeeded");
        emit BatchVoteCast(_tournamentId, currentStageNumber, msg.sender, successfulVotes);
    }

    function batchVoteWithCelo(
        uint256 _tournamentId,
        uint256[] calldata _projectIds
    ) external payable nonReentrant whenNotPaused {
        require(_projectIds.length > 0, "Empty array");
        require(_projectIds.length <= 50, "Max 50 votes per batch");

        Tournament storage tournament = tournaments[_tournamentId];
        uint256 minAmount = tournament.config.minVoteAmount;
        require(msg.value >= minAmount * _projectIds.length, "Insufficient value");

        uint256 amountPerVote = msg.value / _projectIds.length;
        uint256 remainder = msg.value % _projectIds.length;

        uint256 currentStageNumber = getCurrentStageNumber(_tournamentId);
        uint256 successfulVotes = 0;

        for (uint256 i = 0; i < _projectIds.length; i++) {
            uint256 voteAmount = amountPerVote + (i == 0 ? remainder : 0);
            require(voteAmount >= minAmount, "Amount too small");
            
            try this.batchVoteInternal(_tournamentId, _projectIds[i], address(baseToken), voteAmount, msg.sender) {
                successfulVotes++;
            } catch {
                // Refund failed vote
                (bool success, ) = payable(msg.sender).call{value: voteAmount}("");
                require(success, "Refund failed");
            }
        }

        require(successfulVotes > 0, "No votes succeeded");
        emit BatchVoteCast(_tournamentId, currentStageNumber, msg.sender, successfulVotes);
    }

    function batchVoteInternal(
        uint256 _tournamentId,
        uint256 _projectId,
        address _token,
        uint256 _amount,
        address _voter
    ) external {
        require(msg.sender == address(this), "Only internal");
        _voteInternal(_tournamentId, _projectId, _token, _amount, _voter);
    }

    function _vote(uint256 _tournamentId, uint256 _projectId, address _token, uint256 _amount) internal {
        // Transfer tokens if not CELO (for regular votes, batch votes handle transfer themselves)
        if (_token != address(baseToken)) {
            IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        }
        _voteInternal(_tournamentId, _projectId, _token, _amount, msg.sender);
    }

    function _voteInternal(uint256 _tournamentId, uint256 _projectId, address _token, uint256 _amount, address _voter) internal {
        Tournament storage tournament = tournaments[_tournamentId];
        require(tournament.active, "Tournament not active");
        require(sovseas.supportedTokens(_token), "Token not supported");
        
        uint256 currentStageNumber = getCurrentStageNumber(_tournamentId);
        Stage storage stage = tournamentStages[_tournamentId][currentStageNumber];
        
        require(stage.started, "Stage not started");
        require(block.timestamp >= stage.start && block.timestamp <= stage.end, "Stage not active");
        
        ProjectStatus storage status = projectStatus[_tournamentId][_projectId];
        require(status.approved, "Project not approved");
        require(!status.disqualified, "Project disqualified");
        require(!status.eliminated, "Project eliminated");

        // Check max votes per voter
        uint256 voteCount = voterVoteCount[_tournamentId][currentStageNumber][_voter];
        if (tournament.config.maxVotesPerVoter > 0) {
            require(voteCount < tournament.config.maxVotesPerVoter, "Max votes reached");
        }

        // Check if already voted for this project (unless allowed)
        Vote storage existingVote = votes[_tournamentId][currentStageNumber][_projectId][_voter];
        if (!tournament.config.allowSameProjectVote) {
            require(existingVote.timestamp == 0, "Already voted for this project in this stage");
        }

        // Note: Token transfer handled by caller for batch operations

        // Track token usage
        if (!isTokenUsedInStage[_tournamentId][currentStageNumber][_token]) {
            stageUsedTokens[_tournamentId][currentStageNumber].push(_token);
            isTokenUsedInStage[_tournamentId][currentStageNumber][_token] = true;
        }

        // Calculate voting power with diminishing returns and loyalty bonus
        uint256 power = _calculateVotePower(_tournamentId, currentStageNumber, _voter, _amount);

        // Store vote
        existingVote.projectId = _projectId;
        existingVote.power = power;
        existingVote.timestamp = block.timestamp;
        existingVote.token = _token;
        existingVote.amount = _amount;

        // Track voter (first time voting in this stage)
        if (!_hasVotedInStage[_tournamentId][currentStageNumber][_voter]) {
            stageVoters[_tournamentId][currentStageNumber].push(_voter);
            _hasVotedInStage[_tournamentId][currentStageNumber][_voter] = true;
            
            // Update loyalty - count this as a new stage voted in
            voterLoyaltyStages[_tournamentId][_voter]++;
        }

        // Track all projects voted for in this stage
        voterToProjectIds[_tournamentId][currentStageNumber][_voter].push(_projectId);
        voterVoteCount[_tournamentId][currentStageNumber][_voter]++;

        // Update power tracking
        projectPowerPerStage[_tournamentId][currentStageNumber][_projectId] += power;
        voterStagePower[_tournamentId][currentStageNumber][_voter] += power;

        VoterStats storage voterStats = tournamentVoterStats[_tournamentId][_voter];
        voterStats.totalVotes++;
        voterStats.totalPowerUsed += power;

        // Add to stage funding
        uint256 celoEquivalent = sovseas.getTokenToCeloEquivalent(_token, _amount);
        stage.tokenAmounts[_token] += _amount;
        stage.rewardPool += celoEquivalent;

        emit VoteCast(_tournamentId, currentStageNumber, _projectId, _voter, power, _token, _amount);
    }

    /*//////////////////////////////////////////////////////////////
                        VOTE POWER CALCULATION
                        Amount: 80%, Time: 10%, Uniqueness: 10%
                        + Diminishing Returns + Loyalty Bonus
    //////////////////////////////////////////////////////////////*/

    function _calculateVotePower(
        uint256 _tournamentId,
        uint256 _stageNumber,
        address _voter,
        uint256 _amount
    ) internal view returns (uint256) {
        Tournament storage tournament = tournaments[_tournamentId];
        TournamentConfig storage config = tournament.config;
        Stage storage stage = tournamentStages[_tournamentId][_stageNumber];
        VoterStats storage stats = tournamentVoterStats[_tournamentId][_voter];

        // 1. Amount Component (configurable weight)
        uint256 celoEquivalent = sovseas.getTokenToCeloEquivalent(address(baseToken), _amount);
        uint256 amountPower = (celoEquivalent * config.powerWeights.amountWeight) / 100;

        // 2. Time Component (configurable weight and decay)
        uint256 timeElapsed = block.timestamp - stage.start;
        uint256 stageDuration = stage.end - stage.start;
        uint256 timeFactor;
        
        if (timeElapsed < stageDuration / 4) {
            timeFactor = config.timeDecay.earlyBonus; // First 25%
        } else if (timeElapsed < stageDuration / 2) {
            timeFactor = config.timeDecay.midEarlyBonus; // 25-50%
        } else if (timeElapsed < (stageDuration * 3) / 4) {
            timeFactor = config.timeDecay.midLateBonus; // 50-75%
        } else {
            timeFactor = config.timeDecay.lateBonus; // Last 25%
        }
        
        uint256 timePower = (celoEquivalent * config.powerWeights.timeWeight * timeFactor) / 10000;

        // 3. Uniqueness Component (configurable weight)
        uint256 uniqueBonus = stats.uniqueProjectsVoted > 0 ? sqrt(stats.uniqueProjectsVoted) * 10 : 0;
        uint256 uniquenessPower = (celoEquivalent * config.powerWeights.uniquenessWeight * (100 + uniqueBonus)) / 10000;

        // Base power (before diminishing and loyalty)
        uint256 basePower = amountPower + timePower + uniquenessPower;

        // 4. Diminishing Returns - Based on vote count in current stage (configurable)
        uint256 voteCount = voterVoteCount[_tournamentId][_stageNumber][_voter];
        uint256 diminishingFactor = _getDiminishingFactor(voteCount, config.diminishing);
        uint256 powerAfterDiminishing = (basePower * diminishingFactor) / 100;

        // 5. Loyalty Bonus - Based on previous stages voted in
        uint256 loyaltyStages = voterLoyaltyStages[_tournamentId][_voter];
        
        // Loyalty bonus: 2% per previous stage voted in (capped at 50% bonus = 25 stages)
        uint256 loyaltyBonusPercent = loyaltyStages > 25 ? 50 : (loyaltyStages * 2);
        uint256 loyaltyBonus = (powerAfterDiminishing * loyaltyBonusPercent) / 100;

        return powerAfterDiminishing + loyaltyBonus;
    }

    function _getDiminishingFactor(uint256 _voteCount, DiminishingConfig storage _config) internal view returns (uint256) {
        if (_voteCount == 0) return _config.firstVote;
        if (_voteCount == 1) return _config.secondVote;
        if (_voteCount == 2) return _config.thirdVote;
        if (_voteCount == 3) return _config.fourthVote;
        return _config.floorVote;
    }

    /*//////////////////////////////////////////////////////////////
                        STAGE FINALIZATION
    //////////////////////////////////////////////////////////////*/

    function finalizeStage(uint256 _tournamentId) external nonReentrant whenNotPaused {
        Tournament storage tournament = tournaments[_tournamentId];
        require(tournament.active, "Tournament not active");
        
        uint256 currentStageNumber = getCurrentStageNumber(_tournamentId);
        Stage storage stage = tournamentStages[_tournamentId][currentStageNumber];

        require(stage.started, "Stage not started");
        require(block.timestamp > stage.end, "Stage still active");
        require(!stage.finalized, "Already finalized");

        stage.finalized = true;

        // Convert all tokens to payout token
        _convertStageTokens(_tournamentId, currentStageNumber);

        // Distribute rewards
        _distributeRewards(_tournamentId, currentStageNumber);
        
        // Eliminate projects
        uint256 eliminatedCount = _eliminateProjects(_tournamentId, currentStageNumber);

        emit StageFinalized(_tournamentId, currentStageNumber, eliminatedCount);

        // Check if tournament ends
        uint256 remainingProjects = _getApprovedProjectCount(_tournamentId);
        if (remainingProjects <= 1) {
            tournament.active = false;
            if (remainingProjects == 1) {
                uint256 winnerId = _getLastApprovedProject(_tournamentId);
                emit TournamentEnded(_tournamentId, winnerId);
            }
        } else if (tournament.autoProgress) {
            uint256 eliminationPercentage = _getNextEliminationPercentage(remainingProjects);
            _createAndStartStage(_tournamentId, eliminationPercentage, true);
        }
    }

    /*//////////////////////////////////////////////////////////////
                        TOKEN CONVERSION
    //////////////////////////////////////////////////////////////*/

    function _convertStageTokens(uint256 _tournamentId, uint256 _stageNumber) internal {
        Tournament storage tournament = tournaments[_tournamentId];
        Stage storage stage = tournamentStages[_tournamentId][_stageNumber];
        address[] memory usedTokens = stageUsedTokens[_tournamentId][_stageNumber];
        
        address payout = tournament.payoutToken;
        uint256 totalPayoutAmount = stage.tokenAmounts[payout];

        for (uint256 i = 0; i < usedTokens.length; i++) {
            address token = usedTokens[i];
            
            if (token != payout && stage.tokenAmounts[token] > 0) {
                uint256 amount = stage.tokenAmounts[token];
                
                try this.convertTokensExternal(token, payout, amount) returns (uint256 converted) {
                    totalPayoutAmount += converted;
                    stage.tokenAmounts[token] = 0; // Mark as converted
                    emit TokenConverted(_tournamentId, _stageNumber, token, payout, amount, converted);
                } catch Error(string memory reason) {
                    // Track failed conversion
                    stage.failedConversions[token] += amount;
                    emit TokenConversionFailed(_tournamentId, _stageNumber, token, amount, reason);
                } catch {
                    // Generic failure
                    stage.failedConversions[token] += amount;
                    emit TokenConversionFailed(_tournamentId, _stageNumber, token, amount, "Unknown error");
                }
            }
        }

        stage.tokenAmounts[payout] = totalPayoutAmount;
    }

    function convertTokensExternal(address _fromToken, address _toToken, uint256 _amount) external returns (uint256) {
        require(msg.sender == address(this), "Only internal");
        return _convertTokens(_fromToken, _toToken, _amount);
    }

    function _convertTokens(address _fromToken, address _toToken, uint256 _amount) internal returns (uint256) {
        if (_fromToken == _toToken) return _amount;

        (address provider, bytes32 exchangeId, bool active) = sovseas.tokenExchangeProviders(_fromToken);
        require(active, "No active exchange provider");

        address broker = sovseas.mentoTokenBroker();
        
        IERC20 fromToken = IERC20(_fromToken);
        fromToken.forceApprove(broker, _amount);

        uint256 expectedOut = IBroker(broker).getAmountOut(provider, exchangeId, _fromToken, _toToken, _amount);
        uint256 minOut = (expectedOut * 99) / 100;

        uint256 received = IBroker(broker).swapIn(provider, exchangeId, _fromToken, _toToken, _amount, minOut);
        
        return received;
    }

    /*//////////////////////////////////////////////////////////////
                        REWARD DISTRIBUTION
    //////////////////////////////////////////////////////////////*/

    function _distributeRewards(uint256 _tournamentId, uint256 _stageNumber) internal {
        Tournament storage tournament = tournaments[_tournamentId];
        Stage storage stage = tournamentStages[_tournamentId][_stageNumber];
        uint256 totalPayout = stage.tokenAmounts[tournament.payoutToken];

        if (totalPayout == 0) {
            emit RewardsDistributed(_tournamentId, _stageNumber, 0, 0);
            return;
        }

        uint256 voterPool = (totalPayout * tournament.config.voterRewardBps) / 10_000;
        uint256 projectPool = totalPayout - voterPool;

        _distributeProjectRewards(_tournamentId, _stageNumber, projectPool);

        emit RewardsDistributed(_tournamentId, _stageNumber, projectPool, voterPool);
    }

    function _distributeProjectRewards(uint256 _tournamentId, uint256 _stageNumber, uint256 _projectPool) internal {
        if (_projectPool == 0) return;

        Tournament storage tournament = tournaments[_tournamentId];
        uint256[] memory projects = tournamentProjects[_tournamentId];

        // Use configurable precision to avoid rounding to zero
        uint256 PRECISION = tournament.config.qfPrecision;
        uint256 totalRootPower;
        
        for (uint256 i = 0; i < projects.length; i++) {
            uint256 projectId = projects[i];
            ProjectStatus storage status = projectStatus[_tournamentId][projectId];
            if (status.approved && !status.disqualified && !status.eliminated) {
                uint256 power = projectPowerPerStage[_tournamentId][_stageNumber][projectId];
                if (power > 0) {
                    totalRootPower += sqrt(power * PRECISION);
                }
            }
        }

        if (totalRootPower == 0) return;

        // Distribute using quadratic funding with precision
        for (uint256 i = 0; i < projects.length; i++) {
            uint256 projectId = projects[i];
            ProjectStatus storage status = projectStatus[_tournamentId][projectId];
            
            if (status.approved && !status.disqualified && !status.eliminated) {
                uint256 power = projectPowerPerStage[_tournamentId][_stageNumber][projectId];
                if (power > 0) {
                    uint256 rootPower = sqrt(power * PRECISION);
                    uint256 share = (rootPower * _projectPool) / totalRootPower;
                    
                    if (share > 0) {
                        address owner = sovseas.getProjectOwner(projectId);
                        
                        if (tournament.payoutToken == address(baseToken)) {
                            (bool success, ) = payable(owner).call{value: share}("");
                            require(success, "Transfer failed");
                        } else {
                            IERC20(tournament.payoutToken).safeTransfer(owner, share);
                        }
                    }
                }
            }
        }
    }

    function claimVoterReward(uint256 _tournamentId, uint256 _stageNumber) external nonReentrant whenNotPaused {
        Tournament storage tournament = tournaments[_tournamentId];
        Stage storage stage = tournamentStages[_tournamentId][_stageNumber];
        
        require(stage.finalized, "Stage not finalized");
        require(!voterRewardClaimed[_tournamentId][_stageNumber][msg.sender], "Already claimed");

        uint256 voterPower = voterStagePower[_tournamentId][_stageNumber][msg.sender];
        require(voterPower > 0, "No voting power");

        uint256 totalPower = 0;
        uint256[] memory projects = tournamentProjects[_tournamentId];
        for (uint256 i = 0; i < projects.length; i++) {
            totalPower += projectPowerPerStage[_tournamentId][_stageNumber][projects[i]];
        }

        require(totalPower > 0, "No total power");

        // Mark as claimed BEFORE transfer (reentrancy protection)
        voterRewardClaimed[_tournamentId][_stageNumber][msg.sender] = true;

        uint256 totalPayout = stage.tokenAmounts[tournament.payoutToken];
        uint256 voterPool = (totalPayout * tournament.config.voterRewardBps) / 10_000;
        uint256 reward = (voterPool * voterPower) / totalPower;

        if (reward > 0) {
            if (tournament.payoutToken == address(baseToken)) {
                (bool success, ) = payable(msg.sender).call{value: reward}("");
                require(success, "Transfer failed");
            } else {
                IERC20(tournament.payoutToken).safeTransfer(msg.sender, reward);
            }
            
            emit VoterRewardClaimed(_tournamentId, _stageNumber, msg.sender, reward);
        }
    }

    /*//////////////////////////////////////////////////////////////
                        ELIMINATION LOGIC
    //////////////////////////////////////////////////////////////*/

    function _eliminateProjects(uint256 _tournamentId, uint256 _stageNumber) internal returns (uint256) {
        Stage storage stage = tournamentStages[_tournamentId][_stageNumber];
        uint256[] memory projects = tournamentProjects[_tournamentId];
        
        uint256 approvedCount = 0;
        for (uint256 i = 0; i < projects.length; i++) {
            ProjectStatus storage status = projectStatus[_tournamentId][projects[i]];
            if (status.approved && !status.disqualified && !status.eliminated) {
                approvedCount++;
            }
        }

        if (approvedCount <= 1) return 0;

        uint256 eliminateCount = (approvedCount * stage.eliminationPercentage) / 100;
        if (eliminateCount == 0) eliminateCount = 1;
        
        if (approvedCount - eliminateCount < 1) {
            eliminateCount = approvedCount - 1;
        }

        uint256 eliminated = 0;

        for (uint256 e = 0; e < eliminateCount; e++) {
            uint256 lowestProjectId = type(uint256).max; // Use sentinel value instead of 0 to handle project ID 0
            uint256 lowestPower = type(uint256).max;
            bool found = false;

            for (uint256 i = 0; i < projects.length; i++) {
                uint256 projectId = projects[i];
                ProjectStatus storage status = projectStatus[_tournamentId][projectId];
                
                if (status.approved && !status.disqualified && !status.eliminated) {
                    uint256 power = projectPowerPerStage[_tournamentId][_stageNumber][projectId];
                    // Handle tie-breaking: if powers are equal, prefer higher project ID (deterministic)
                    if (power < lowestPower || (power == lowestPower && projectId > lowestProjectId)) {
                        lowestPower = power;
                        lowestProjectId = projectId;
                        found = true;
                    }
                }
            }

            if (found && lowestProjectId != type(uint256).max) {
                ProjectStatus storage status = projectStatus[_tournamentId][lowestProjectId];
                status.approved = false;
                status.eliminated = true;
                status.eliminatedAt = block.timestamp;
                status.eliminatedInStage = _stageNumber;
                
                emit ProjectEliminated(_tournamentId, _stageNumber, lowestProjectId, lowestPower);
                eliminated++;
            }
        }

        return eliminated;
    }

    /*//////////////////////////////////////////////////////////////
                        VOTING VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    // Preview vote power BEFORE voting (accounts for current vote count and loyalty)
    function estimateVotePower(
        uint256 _tournamentId,
        address _voter,
        uint256 _amount
    ) external view returns (uint256) {
        require(tournaments[_tournamentId].active, "Tournament not active");
        
        uint256 currentStageNumber = getCurrentStageNumber(_tournamentId);
        Stage storage stage = tournamentStages[_tournamentId][currentStageNumber];
        require(stage.started, "Stage not started");
        
        // This will use the current vote count (before this vote) for diminishing calculation
        return _calculateVotePower(_tournamentId, currentStageNumber, _voter, _amount);
    }

    // Get voter's vote in a stage (for specific project)
    function getVoterVoteInStage(
        uint256 _tournamentId,
        uint256 _stageNumber,
        uint256 _projectId,
        address _voter
    ) external view returns (
        uint256 projectId,
        uint256 power,
        address token,
        uint256 amount,
        uint256 timestamp
    ) {
        Vote storage v = votes[_tournamentId][_stageNumber][_projectId][_voter];
        if (v.timestamp == 0) return (0, 0, address(0), 0, 0);
        return (v.projectId, v.power, v.token, v.amount, v.timestamp);
    }

    // Get ALL votes by voter in a stage
    function getVoterAllVotesInStage(
        uint256 _tournamentId,
        uint256 _stageNumber,
        address _voter
    ) external view returns (
        uint256[] memory projectIds,
        uint256[] memory powers,
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory timestamps
    ) {
        uint256[] memory votedProjectIds = voterToProjectIds[_tournamentId][_stageNumber][_voter];
        uint256 count = votedProjectIds.length;
        
        projectIds = new uint256[](count);
        powers = new uint256[](count);
        tokens = new address[](count);
        amounts = new uint256[](count);
        timestamps = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            Vote storage v = votes[_tournamentId][_stageNumber][votedProjectIds[i]][_voter];
            projectIds[i] = v.projectId;
            powers[i] = v.power;
            tokens[i] = v.token;
            amounts[i] = v.amount;
            timestamps[i] = v.timestamp;
        }
        
        return (projectIds, powers, tokens, amounts, timestamps);
    }

    // Get vote count for voter in stage
    function getVoterVoteCount(
        uint256 _tournamentId,
        uint256 _stageNumber,
        address _voter
    ) external view returns (uint256) {
        return voterVoteCount[_tournamentId][_stageNumber][_voter];
    }

    // Get next vote diminishing factor
    function getNextVoteDiminishingFactor(
        uint256 _tournamentId,
        uint256 _stageNumber,
        address _voter
    ) external view returns (uint256) {
        uint256 voteCount = voterVoteCount[_tournamentId][_stageNumber][_voter];
        Tournament storage tournament = tournaments[_tournamentId];
        return _getDiminishingFactor(voteCount, tournament.config.diminishing);
    }

    // Get loyalty stages count
    function getVoterLoyaltyStages(
        uint256 _tournamentId,
        address _voter
    ) external view returns (uint256) {
        return voterLoyaltyStages[_tournamentId][_voter];
    }

    // Get all voters in a stage
    function getStageVoters(uint256 _tournamentId, uint256 _stageNumber) 
        external view returns (address[] memory) {
        return stageVoters[_tournamentId][_stageNumber];
    }

    // Get expected project reward
    function getProjectExpectedReward(
        uint256 _tournamentId,
        uint256 _stageNumber,
        uint256 _projectId
    ) external view returns (uint256) {
        Tournament storage tournament = tournaments[_tournamentId];
        Stage storage stage = tournamentStages[_tournamentId][_stageNumber];
        
        if (!stage.finalized) return 0;
        
        uint256 totalPayout = stage.tokenAmounts[tournament.payoutToken];
        if (totalPayout == 0) return 0;
        
        uint256 projectPool = totalPayout - (totalPayout * tournament.config.voterRewardBps) / 10_000;
        
        uint256[] memory projects = tournamentProjects[_tournamentId];
        uint256 PRECISION = tournament.config.qfPrecision;
        uint256 totalRootPower;
        
        for (uint256 i = 0; i < projects.length; i++) {
            uint256 pid = projects[i];
            ProjectStatus storage status = projectStatus[_tournamentId][pid];
            if (status.approved && !status.disqualified && !status.eliminated) {
                uint256 projectPower = projectPowerPerStage[_tournamentId][_stageNumber][pid];
                if (projectPower > 0) {
                    totalRootPower += sqrt(projectPower * PRECISION);
                }
            }
        }
        
        if (totalRootPower == 0) return 0;
        
        uint256 power = projectPowerPerStage[_tournamentId][_stageNumber][_projectId];
        if (power == 0) return 0;
        
        uint256 rootPower = sqrt(power * PRECISION);
        return (rootPower * projectPool) / totalRootPower;
    }

    // Get voter's history (updated for multiple votes per stage)
    function getVoterHistory(uint256 _tournamentId, address _voter) 
        external view returns (
            uint256[] memory stages,
            uint256[][] memory projectIdsPerStage,
            uint256[][] memory powersPerStage,
            uint256[] memory totalPowerPerStage,
            uint256[] memory voteCountsPerStage
        ) {
        uint256 stageCount = tournamentStages[_tournamentId].length;
        
        // Count how many stages voter participated in
        uint256 count = 0;
        for (uint256 i = 0; i < stageCount; i++) {
            if (voterVoteCount[_tournamentId][i][_voter] > 0) {
                count++;
            }
        }
        
        stages = new uint256[](count);
        projectIdsPerStage = new uint256[][](count);
        powersPerStage = new uint256[][](count);
        totalPowerPerStage = new uint256[](count);
        voteCountsPerStage = new uint256[](count);
        
        uint256 index = 0;
        for (uint256 i = 0; i < stageCount; i++) {
            uint256 voteCount = voterVoteCount[_tournamentId][i][_voter];
            if (voteCount > 0) {
                stages[index] = i;
                voteCountsPerStage[index] = voteCount;
                totalPowerPerStage[index] = voterStagePower[_tournamentId][i][_voter];
                
                uint256[] memory votedProjectIds = voterToProjectIds[_tournamentId][i][_voter];
                projectIdsPerStage[index] = new uint256[](voteCount);
                powersPerStage[index] = new uint256[](voteCount);
                
                for (uint256 j = 0; j < voteCount; j++) {
                    Vote storage v = votes[_tournamentId][i][votedProjectIds[j]][_voter];
                    projectIdsPerStage[index][j] = v.projectId;
                    powersPerStage[index][j] = v.power;
                }
                
                index++;
            }
        }
        
        return (stages, projectIdsPerStage, powersPerStage, totalPowerPerStage, voteCountsPerStage);
    }

    // Get unclaimed rewards
    function getUnclaimedRewards(uint256 _tournamentId, address _voter) 
        external view returns (
            uint256[] memory stages,
            uint256[] memory amounts
        ) {
        uint256 stageCount = tournamentStages[_tournamentId].length;
        
        // Count unclaimed stages
        uint256 count = 0;
        for (uint256 i = 0; i < stageCount; i++) {
            Stage storage stage = tournamentStages[_tournamentId][i];
            if (stage.finalized && 
                !voterRewardClaimed[_tournamentId][i][_voter] && 
                voterStagePower[_tournamentId][i][_voter] > 0) {
                count++;
            }
        }
        
        stages = new uint256[](count);
        amounts = new uint256[](count);
        
        uint256 index = 0;
        for (uint256 i = 0; i < stageCount; i++) {
            Stage storage stage = tournamentStages[_tournamentId][i];
            if (stage.finalized && 
                !voterRewardClaimed[_tournamentId][i][_voter] && 
                voterStagePower[_tournamentId][i][_voter] > 0) {
                
                stages[index] = i;
                
                // Calculate reward
                uint256 voterPower = voterStagePower[_tournamentId][i][_voter];
                uint256 totalPower = 0;
                uint256[] memory projects = tournamentProjects[_tournamentId];
                for (uint256 j = 0; j < projects.length; j++) {
                    totalPower += projectPowerPerStage[_tournamentId][i][projects[j]];
                }
                
                if (totalPower > 0) {
                    Tournament storage tournament = tournaments[_tournamentId];
                    uint256 totalPayout = stage.tokenAmounts[tournament.payoutToken];
                    uint256 voterPool = (totalPayout * tournament.config.voterRewardBps) / 10_000;
                    amounts[index] = (voterPool * voterPower) / totalPower;
                }
                
                index++;
            }
        }
        
        return (stages, amounts);
    }

    function getVoterPendingReward(uint256 _tournamentId, uint256 _stageNumber, address _voter) external view returns (uint256) {
        Stage storage stage = tournamentStages[_tournamentId][_stageNumber];
        if (!stage.finalized || voterRewardClaimed[_tournamentId][_stageNumber][_voter]) return 0;

        uint256 voterPower = voterStagePower[_tournamentId][_stageNumber][_voter];
        if (voterPower == 0) return 0;

        uint256 totalPower = 0;
        uint256[] memory projects = tournamentProjects[_tournamentId];
        for (uint256 i = 0; i < projects.length; i++) {
            totalPower += projectPowerPerStage[_tournamentId][_stageNumber][projects[i]];
        }

        if (totalPower == 0) return 0;

        Tournament storage tournament = tournaments[_tournamentId];
        uint256 totalPayout = stage.tokenAmounts[tournament.payoutToken];
        uint256 voterPool = (totalPayout * tournament.config.voterRewardBps) / 10_000;
        return (voterPool * voterPower) / totalPower;
    }

    function hasVoted(uint256 _tournamentId, uint256 _stageNumber, uint256 _projectId, address _voter) external view returns (bool) {
        return votes[_tournamentId][_stageNumber][_projectId][_voter].timestamp > 0;
    }

    function hasVotedInStage(uint256 _tournamentId, uint256 _stageNumber, address _voter) external view returns (bool) {
        return voterVoteCount[_tournamentId][_stageNumber][_voter] > 0;
    }

    /*//////////////////////////////////////////////////////////////
                    ADDITIONAL VIEW FUNCTIONS FOR DEBUGGING
    //////////////////////////////////////////////////////////////*/

    // Check if project ID 0 exists and has issues in a stage
    function checkProjectZeroStatus(uint256 _tournamentId, uint256 _stageNumber) external view returns (
        bool exists,
        bool approved,
        bool eliminated,
        uint256 power,
        bool hasVotes
    ) {
        uint256[] memory projects = tournamentProjects[_tournamentId];
        exists = false;
        
        for (uint256 i = 0; i < projects.length; i++) {
            if (projects[i] == 0) {
                exists = true;
                break;
            }
        }
        
        if (!exists) {
            return (false, false, false, 0, false);
        }
        
        ProjectStatus storage status = projectStatus[_tournamentId][0];
        approved = status.approved;
        eliminated = status.eliminated;
        power = projectPowerPerStage[_tournamentId][_stageNumber][0];
        
        // Check if any votes exist for project 0
        hasVotes = false;
        address[] memory voters = stageVoters[_tournamentId][_stageNumber];
        for (uint256 i = 0; i < voters.length; i++) {
            uint256[] memory votedProjects = voterToProjectIds[_tournamentId][_stageNumber][voters[i]];
            for (uint256 j = 0; j < votedProjects.length; j++) {
                if (votedProjects[j] == 0) {
                    hasVotes = true;
                    break;
                }
            }
            if (hasVotes) break;
        }
        
        return (exists, approved, eliminated, power, hasVotes);
    }

    // Get all projects that would be eliminated if stage is finalized now (preview)
    function previewEliminations(uint256 _tournamentId, uint256 _stageNumber) external view returns (
        uint256[] memory projectIds,
        uint256[] memory powers
    ) {
        Stage storage stage = tournamentStages[_tournamentId][_stageNumber];
        uint256[] memory projects = tournamentProjects[_tournamentId];
        
        uint256 approvedCount = 0;
        for (uint256 i = 0; i < projects.length; i++) {
            ProjectStatus storage status = projectStatus[_tournamentId][projects[i]];
            if (status.approved && !status.disqualified && !status.eliminated) {
                approvedCount++;
            }
        }

        if (approvedCount <= 1) {
            return (new uint256[](0), new uint256[](0));
        }

        uint256 eliminateCount = (approvedCount * stage.eliminationPercentage) / 100;
        if (eliminateCount == 0) eliminateCount = 1;
        
        if (approvedCount - eliminateCount < 1) {
            eliminateCount = approvedCount - 1;
        }

        projectIds = new uint256[](eliminateCount);
        powers = new uint256[](eliminateCount);
        
        // Track which projects are already marked for elimination in preview
        uint256[] memory eliminatedProjectIds = new uint256[](projects.length);
        uint256 eliminatedCount = 0;

        for (uint256 e = 0; e < eliminateCount; e++) {
            uint256 lowestProjectId = type(uint256).max;
            uint256 lowestPower = type(uint256).max;
            bool found = false;

            for (uint256 i = 0; i < projects.length; i++) {
                uint256 projectId = projects[i];
                ProjectStatus storage status = projectStatus[_tournamentId][projectId];
                
                // Check if already marked for elimination
                bool alreadyEliminated = false;
                for (uint256 j = 0; j < eliminatedCount; j++) {
                    if (eliminatedProjectIds[j] == projectId) {
                        alreadyEliminated = true;
                        break;
                    }
                }
                
                if (status.approved && !status.disqualified && !status.eliminated && !alreadyEliminated) {
                    uint256 power = projectPowerPerStage[_tournamentId][_stageNumber][projectId];
                    if (power < lowestPower || (power == lowestPower && projectId > lowestProjectId)) {
                        lowestPower = power;
                        lowestProjectId = projectId;
                        found = true;
                    }
                }
            }

            if (found && lowestProjectId != type(uint256).max) {
                projectIds[e] = lowestProjectId;
                powers[e] = lowestPower;
                eliminatedProjectIds[eliminatedCount] = lowestProjectId;
                eliminatedCount++;
            }
        }

        // Resize arrays if needed
        if (eliminatedCount < eliminateCount) {
            uint256[] memory resizedIds = new uint256[](eliminatedCount);
            uint256[] memory resizedPowers = new uint256[](eliminatedCount);
            for (uint256 i = 0; i < eliminatedCount; i++) {
                resizedIds[i] = projectIds[i];
                resizedPowers[i] = powers[i];
            }
            return (resizedIds, resizedPowers);
        }

        return (projectIds, powers);
    }

    // Get total voting activity for a stage
    function getStageVotingActivity(uint256 _tournamentId, uint256 _stageNumber) external view returns (
        uint256 totalVoters,
        uint256 totalVotes,
        uint256 totalPower,
        uint256 projectsWithVotes
    ) {
        address[] memory voters = stageVoters[_tournamentId][_stageNumber];
        totalVoters = voters.length;
        
        uint256[] memory projects = tournamentProjects[_tournamentId];
        uint256 projectsVoted = 0;
        
        for (uint256 i = 0; i < voters.length; i++) {
            totalVotes += voterVoteCount[_tournamentId][_stageNumber][voters[i]];
        }
        
        for (uint256 i = 0; i < projects.length; i++) {
            uint256 power = projectPowerPerStage[_tournamentId][_stageNumber][projects[i]];
            totalPower += power;
            if (power > 0) {
                projectsVoted++;
            }
        }
        
        projectsWithVotes = projectsVoted;
        
        return (totalVoters, totalVotes, totalPower, projectsWithVotes);
    }
}

