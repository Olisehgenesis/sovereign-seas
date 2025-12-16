// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/*//////////////////////////////////////////////////////////////
                        EXTERNAL INTERFACES
//////////////////////////////////////////////////////////////*/

interface ISovereignSeas {
    function getSortedProjects(uint256 campaignId) external view returns (uint256[] memory);
    function getProjectOwner(uint256 projectId) external view returns (address);
    function mentoTokenBroker() external view returns (address);
    function getTokenToCeloEquivalent(address _token, uint256 _amount) external view returns (uint256);
    function supportedTokens(address _token) external view returns (bool);
    function tokenExchangeProviders(address _token) external view returns (address provider, bytes32 exchangeId, bool active);
}

interface IBroker {
    function swapIn(address exchangeProvider, bytes32 exchangeId, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin) external returns (uint256 amountOut);
    function getAmountOut(address exchangeProvider, bytes32 exchangeId, address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256 amountOut);
}

/*//////////////////////////////////////////////////////////////
                    TOURNAMENT CORE CONTRACT
//////////////////////////////////////////////////////////////*/

contract TournamentCore is ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                                CONFIG
    //////////////////////////////////////////////////////////////*/

    // Default values (used if not specified)
    uint256 public constant DEFAULT_AMOUNT_WEIGHT = 80;
    uint256 public constant DEFAULT_TIME_WEIGHT = 10;
    uint256 public constant DEFAULT_UNIQUENESS_WEIGHT = 10;
    uint256 public constant DEFAULT_VOTER_REWARD_BPS = 1000; // 10%
    uint256 public constant DEFAULT_MIN_VOTE_AMOUNT = 0.01 ether;
    uint256 public constant DEFAULT_QF_PRECISION = 1e18;

    ISovereignSeas public immutable sovseas;
    IERC20 public immutable baseToken; // CELO token

    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/

    struct PowerWeights {
        uint256 amountWeight;      // Amount component weight (default: 80)
        uint256 timeWeight;         // Time component weight (default: 10)
        uint256 uniquenessWeight;  // Uniqueness component weight (default: 10)
    }

    struct DiminishingConfig {
        uint256 firstVote;   // First vote power % (default: 100)
        uint256 secondVote;  // Second vote power % (default: 80)
        uint256 thirdVote;   // Third vote power % (default: 64)
        uint256 fourthVote;  // Fourth vote power % (default: 51)
        uint256 floorVote;   // Floor (5+) vote power % (default: 40)
    }

    struct TimeDecayConfig {
        uint256 earlyBonus;      // 0-25% of stage: bonus % (default: 100)
        uint256 midEarlyBonus;    // 25-50% of stage: bonus % (default: 75)
        uint256 midLateBonus;     // 50-75% of stage: bonus % (default: 50)
        uint256 lateBonus;        // 75-100% of stage: bonus % (default: 25)
    }

    struct TournamentConfig {
        PowerWeights powerWeights;
        DiminishingConfig diminishing;
        TimeDecayConfig timeDecay;
        uint256 voterRewardBps;      // Voter reward % in basis points (default: 1000 = 10%)
        uint256 minVoteAmount;       // Minimum vote amount (default: 0.01 ether)
        uint256 qfPrecision;         // Quadratic funding precision (default: 1e18)
        uint256 maxVotesPerVoter;    // Max votes per voter per stage (0 = unlimited, default: 0)
        bool allowSameProjectVote;   // Allow voting for same project multiple times (default: false)
    }

    struct Tournament {
        uint256 id;
        address admin;
        uint256 sovseasCampaignId;   // Optional: 0 if not tied to campaign
        uint256 stageDuration;
        address payoutToken;
        bool autoProgress;
        bool active;
        bool disqualifyEnabled;
        uint256 createdAt;
        TournamentConfig config;
    }

    struct Stage {
        uint256 stageNumber;
        uint256 start;
        uint256 end;
        uint256 scheduledStart;
        uint256 rewardPool;
        uint256 eliminationPercentage;
        bool finalized;
        bool started;
        mapping(address => uint256) tokenAmounts;
        mapping(address => uint256) failedConversions; // Track failed conversions
    }

    struct Vote {
        uint256 projectId;
        uint256 power;
        uint256 timestamp;
        address token;
        uint256 amount;
    }

    struct VoterStats {
        uint256 totalPowerUsed;
        uint256 totalVotes;
        uint256 uniqueProjectsVoted; // NEW: Track unique projects
    }

    struct ProjectStatus {
        bool approved;
        bool disqualified;
        bool eliminated;
        uint256 approvedAt;
        uint256 eliminatedAt;
        uint256 eliminatedInStage;
        string disqualificationReason;
    }

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    uint256 public nextTournamentId = 1; // Start from 1 instead of 0
    
    mapping(uint256 => Tournament) public tournaments;
    mapping(uint256 => uint256[]) public tournamentProjects;
    mapping(uint256 => mapping(uint256 => ProjectStatus)) public projectStatus;
    
    mapping(uint256 => Stage[]) public tournamentStages;
    mapping(uint256 => mapping(uint256 => mapping(uint256 => uint256))) public projectPowerPerStage;
    mapping(uint256 => mapping(uint256 => mapping(uint256 => mapping(address => Vote)))) public votes;
    
    // NEW: Better vote tracking - Multiple votes per stage
    mapping(uint256 => mapping(uint256 => mapping(address => uint256[]))) public voterToProjectIds; // tournamentId => stageId => voter => projectIds[]
    mapping(uint256 => mapping(uint256 => address[])) internal stageVoters; // Track all voters in a stage
    mapping(uint256 => mapping(uint256 => mapping(address => uint256))) public voterVoteCount; // Count votes per voter per stage
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) internal _hasVotedInStage; // Track if voter has voted at least once in stage

    // Loyalty tracking - stages voted in per tournament
    mapping(uint256 => mapping(address => uint256)) public voterLoyaltyStages; // tournamentId => voter => count of stages voted in

    mapping(uint256 => mapping(address => VoterStats)) public tournamentVoterStats;
    mapping(uint256 => mapping(uint256 => mapping(address => uint256))) public voterStagePower;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public voterRewardClaimed;
    
    mapping(uint256 => mapping(uint256 => address[])) internal stageUsedTokens;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) internal isTokenUsedInStage;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event TournamentCreated(uint256 indexed tournamentId, address indexed admin, uint256 sovseasCampaignId, uint256 stageDuration, address payoutToken);
    event TournamentStarted(uint256 indexed tournamentId);
    event TournamentPaused(uint256 indexed tournamentId);
    event TournamentUnpaused(uint256 indexed tournamentId);
    event StageScheduled(uint256 indexed tournamentId, uint256 stageNumber, uint256 scheduledStart);
    event StageStarted(uint256 indexed tournamentId, uint256 stageNumber, uint256 eliminationPercentage, bool autoStarted);
    event VoteCast(uint256 indexed tournamentId, uint256 stageNumber, uint256 indexed projectId, address indexed voter, uint256 power, address token, uint256 amount);
    event StageFinalized(uint256 indexed tournamentId, uint256 stageNumber, uint256 eliminatedCount);
    event ProjectEliminated(uint256 indexed tournamentId, uint256 stageNumber, uint256 indexed projectId, uint256 finalPower);
    event ProjectDisqualified(uint256 indexed tournamentId, uint256 indexed projectId, string reason);
    event ProjectApproved(uint256 indexed tournamentId, uint256 indexed projectId);
    event RewardsDistributed(uint256 indexed tournamentId, uint256 stageNumber, uint256 projectRewards, uint256 voterRewards);
    event StageFunded(uint256 indexed tournamentId, uint256 stageNumber, address token, uint256 amount, uint256 celoEquivalent);
    event TokenConverted(uint256 indexed tournamentId, uint256 stageNumber, address fromToken, address toToken, uint256 fromAmount, uint256 toAmount);
    event TokenConversionFailed(uint256 indexed tournamentId, uint256 stageNumber, address fromToken, uint256 amount, string reason);
    event VoterRewardClaimed(uint256 indexed tournamentId, uint256 stageNumber, address indexed voter, uint256 amount);
    event TournamentEnded(uint256 indexed tournamentId, uint256 winnerId);
    event ProjectAdded(uint256 indexed tournamentId, uint256 indexed projectId);
    event ProjectRemoved(uint256 indexed tournamentId, uint256 indexed projectId);
    event BatchVoteCast(uint256 indexed tournamentId, uint256 stageNumber, address indexed voter, uint256 voteCount);

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _sovseas, address _baseToken) {
        require(_sovseas != address(0) && _baseToken != address(0), "Invalid addresses");
        sovseas = ISovereignSeas(_sovseas);
        baseToken = IERC20(_baseToken);
    }

    /*//////////////////////////////////////////////////////////////
                          TOURNAMENT CREATION
    //////////////////////////////////////////////////////////////*/

    function createTournament(
        uint256 _sovseasCampaignId,
        uint256 _stageDuration,
        address _payoutToken,
        bool _autoProgress,
        bool _disqualifyEnabled
    ) external returns (uint256) {
        // Use default config
        TournamentConfig memory defaultConfig = TournamentConfig({
            powerWeights: PowerWeights({
                amountWeight: DEFAULT_AMOUNT_WEIGHT,
                timeWeight: DEFAULT_TIME_WEIGHT,
                uniquenessWeight: DEFAULT_UNIQUENESS_WEIGHT
            }),
            diminishing: DiminishingConfig({
                firstVote: 100,
                secondVote: 80,
                thirdVote: 64,
                fourthVote: 51,
                floorVote: 40
            }),
            timeDecay: TimeDecayConfig({
                earlyBonus: 100,
                midEarlyBonus: 75,
                midLateBonus: 50,
                lateBonus: 25
            }),
            voterRewardBps: DEFAULT_VOTER_REWARD_BPS,
            minVoteAmount: DEFAULT_MIN_VOTE_AMOUNT,
            qfPrecision: DEFAULT_QF_PRECISION,
            maxVotesPerVoter: 0, // Unlimited
            allowSameProjectVote: false
        });

        return _createTournament(
            _sovseasCampaignId,
            _stageDuration,
            _payoutToken,
            _autoProgress,
            _disqualifyEnabled,
            defaultConfig
        );
    }

    function createTournamentAdvanced(
        uint256 _sovseasCampaignId,
        uint256 _stageDuration,
        address _payoutToken,
        bool _autoProgress,
        bool _disqualifyEnabled,
        PowerWeights memory _powerWeights,
        DiminishingConfig memory _diminishing,
        TimeDecayConfig memory _timeDecay,
        uint256 _voterRewardBps,
        uint256 _minVoteAmount,
        uint256 _qfPrecision,
        uint256 _maxVotesPerVoter,
        bool _allowSameProjectVote
    ) external returns (uint256) {
        // Validate power weights sum to 100
        require(
            _powerWeights.amountWeight + _powerWeights.timeWeight + _powerWeights.uniquenessWeight == 100,
            "Power weights must sum to 100"
        );

        // Validate voter reward BPS (0-50%)
        require(_voterRewardBps <= 5000, "Voter reward max 50%");

        TournamentConfig memory config = TournamentConfig({
            powerWeights: _powerWeights,
            diminishing: _diminishing,
            timeDecay: _timeDecay,
            voterRewardBps: _voterRewardBps,
            minVoteAmount: _minVoteAmount,
            qfPrecision: _qfPrecision,
            maxVotesPerVoter: _maxVotesPerVoter,
            allowSameProjectVote: _allowSameProjectVote
        });

        return _createTournament(
            _sovseasCampaignId,
            _stageDuration,
            _payoutToken,
            _autoProgress,
            _disqualifyEnabled,
            config
        );
    }

    function _createTournament(
        uint256 _sovseasCampaignId,
        uint256 _stageDuration,
        address _payoutToken,
        bool _autoProgress,
        bool _disqualifyEnabled,
        TournamentConfig memory _config
    ) internal returns (uint256) {
        require(_stageDuration >= 1 hours && _stageDuration <= 30 days, "Invalid stage duration");
        require(sovseas.supportedTokens(_payoutToken), "Payout token not supported");

        uint256 tournamentId = nextTournamentId++;
        Tournament storage tournament = tournaments[tournamentId];
        
        tournament.id = tournamentId;
        tournament.admin = msg.sender;
        tournament.sovseasCampaignId = _sovseasCampaignId; // Can be 0 if not tied to campaign
        tournament.stageDuration = _stageDuration;
        tournament.payoutToken = _payoutToken;
        tournament.autoProgress = _autoProgress;
        tournament.active = false;
        tournament.disqualifyEnabled = _disqualifyEnabled;
        tournament.createdAt = block.timestamp;
        tournament.config = _config;

        // Fetch projects from campaign if campaign ID is provided
        if (_sovseasCampaignId > 0) {
            uint256[] memory projectIds = sovseas.getSortedProjects(_sovseasCampaignId);
            for (uint256 i = 0; i < projectIds.length; i++) {
                tournamentProjects[tournamentId].push(projectIds[i]);
            }
        }

        emit TournamentCreated(tournamentId, msg.sender, _sovseasCampaignId, _stageDuration, _payoutToken);
        
        return tournamentId;
    }

    /*//////////////////////////////////////////////////////////////
                          EMERGENCY CONTROLS
    //////////////////////////////////////////////////////////////*/

    function pauseTournament(uint256 _tournamentId) external {
        Tournament storage tournament = tournaments[_tournamentId];
        require(msg.sender == tournament.admin, "Only admin");
        require(tournament.active, "Not active");
        
        _pause();
        emit TournamentPaused(_tournamentId);
    }

    function unpauseTournament(uint256 _tournamentId) external {
        Tournament storage tournament = tournaments[_tournamentId];
        require(msg.sender == tournament.admin, "Only admin");
        
        _unpause();
        emit TournamentUnpaused(_tournamentId);
    }

    /*//////////////////////////////////////////////////////////////
                          PROJECT APPROVAL
    //////////////////////////////////////////////////////////////*/

    function approveProject(uint256 _tournamentId, uint256 _projectId) external {
        Tournament storage tournament = tournaments[_tournamentId];
        require(msg.sender == tournament.admin, "Only admin");
        require(_isProjectInTournament(_tournamentId, _projectId), "Project not in tournament");
        
        if (tournament.active) {
            uint256 currentStageArrayIndex = getCurrentStageNumber(_tournamentId);
            if (currentStageArrayIndex != type(uint256).max) {
                Stage storage currentStage = tournamentStages[_tournamentId][currentStageArrayIndex];
                require(currentStage.stageNumber == 1, "Can only approve during stage 1");
                require(!currentStage.finalized, "Stage 1 already finalized");
            }
        }

        ProjectStatus storage status = projectStatus[_tournamentId][_projectId];
        require(!status.approved, "Already approved");
        require(!status.disqualified, "Project disqualified");

        status.approved = true;
        status.approvedAt = block.timestamp;

        emit ProjectApproved(_tournamentId, _projectId);
    }

    function approveMultipleProjects(uint256 _tournamentId, uint256[] calldata _projectIds) external {
        Tournament storage tournament = tournaments[_tournamentId];
        require(msg.sender == tournament.admin, "Only admin");

        for (uint256 i = 0; i < _projectIds.length; i++) {
            uint256 projectId = _projectIds[i];
            if (_isProjectInTournament(_tournamentId, projectId) && 
                !projectStatus[_tournamentId][projectId].approved &&
                !projectStatus[_tournamentId][projectId].disqualified) {
                
                projectStatus[_tournamentId][projectId].approved = true;
                projectStatus[_tournamentId][projectId].approvedAt = block.timestamp;
                emit ProjectApproved(_tournamentId, projectId);
            }
        }
    }

    function disqualifyProject(uint256 _tournamentId, uint256 _projectId, string calldata _reason) external {
        Tournament storage tournament = tournaments[_tournamentId];
        require(msg.sender == tournament.admin, "Only admin");
        require(tournament.disqualifyEnabled, "Disqualification disabled");
        require(_isProjectInTournament(_tournamentId, _projectId), "Project not in tournament");

        ProjectStatus storage status = projectStatus[_tournamentId][_projectId];
        require(!status.disqualified, "Already disqualified");

        status.disqualified = true;
        status.disqualificationReason = _reason;

        emit ProjectDisqualified(_tournamentId, _projectId, _reason);
    }

    /*//////////////////////////////////////////////////////////////
                        PROJECT MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    function addProject(uint256 _tournamentId, uint256 _projectId) external {
        Tournament storage tournament = tournaments[_tournamentId];
        require(msg.sender == tournament.admin, "Only admin");
        require(!tournament.active, "Cannot add projects after start");
        require(!_isProjectInTournament(_tournamentId, _projectId), "Project already in tournament");

        tournamentProjects[_tournamentId].push(_projectId);
        emit ProjectAdded(_tournamentId, _projectId);
    }

    function addCampaignProjects(uint256 _tournamentId, uint256 _campaignId) external {
        Tournament storage tournament = tournaments[_tournamentId];
        require(msg.sender == tournament.admin, "Only admin");
        require(!tournament.active, "Cannot add projects after start");

        uint256[] memory projectIds = sovseas.getSortedProjects(_campaignId);
        uint256 added = 0;
        
        for (uint256 i = 0; i < projectIds.length; i++) {
            if (!_isProjectInTournament(_tournamentId, projectIds[i])) {
                tournamentProjects[_tournamentId].push(projectIds[i]);
                added++;
                emit ProjectAdded(_tournamentId, projectIds[i]);
            }
        }

        require(added > 0, "No new projects added");
    }

    function addProjectsBatch(uint256 _tournamentId, uint256[] calldata _projectIds) external {
        Tournament storage tournament = tournaments[_tournamentId];
        require(msg.sender == tournament.admin, "Only admin");
        require(!tournament.active, "Cannot add projects after start");

        uint256 added = 0;
        for (uint256 i = 0; i < _projectIds.length; i++) {
            if (!_isProjectInTournament(_tournamentId, _projectIds[i])) {
                tournamentProjects[_tournamentId].push(_projectIds[i]);
                added++;
                emit ProjectAdded(_tournamentId, _projectIds[i]);
            }
        }

        require(added > 0, "No new projects added");
    }

    function removeProject(uint256 _tournamentId, uint256 _projectId) external {
        Tournament storage tournament = tournaments[_tournamentId];
        require(msg.sender == tournament.admin, "Only admin");
        require(!tournament.active, "Cannot remove projects after start");
        require(_isProjectInTournament(_tournamentId, _projectId), "Project not in tournament");

        uint256[] storage projects = tournamentProjects[_tournamentId];
        for (uint256 i = 0; i < projects.length; i++) {
            if (projects[i] == _projectId) {
                projects[i] = projects[projects.length - 1];
                projects.pop();
                emit ProjectRemoved(_tournamentId, _projectId);
                return;
            }
        }
    }

    function removeProjectsBatch(uint256 _tournamentId, uint256[] calldata _projectIds) external {
        Tournament storage tournament = tournaments[_tournamentId];
        require(msg.sender == tournament.admin, "Only admin");
        require(!tournament.active, "Cannot remove projects after start");

        uint256 removed = 0;
        uint256[] storage projects = tournamentProjects[_tournamentId];
        
        for (uint256 j = 0; j < _projectIds.length; j++) {
            uint256 projectId = _projectIds[j];
            for (uint256 i = 0; i < projects.length; i++) {
                if (projects[i] == projectId) {
                    projects[i] = projects[projects.length - 1];
                    projects.pop();
                    removed++;
                    emit ProjectRemoved(_tournamentId, projectId);
                    break;
                }
            }
        }

        require(removed > 0, "No projects removed");
    }

    function batchApproveProjects(uint256 _tournamentId, uint256[] calldata _projectIds) external {
        Tournament storage tournament = tournaments[_tournamentId];
        require(msg.sender == tournament.admin, "Only admin");

        if (tournament.active) {
            uint256 currentStageArrayIndex = getCurrentStageNumber(_tournamentId);
            if (currentStageArrayIndex != type(uint256).max) {
                Stage storage currentStage = tournamentStages[_tournamentId][currentStageArrayIndex];
                require(currentStage.stageNumber == 1, "Can only approve during stage 1");
                require(!currentStage.finalized, "Stage 1 already finalized");
            }
        }

        uint256 approved = 0;
        for (uint256 i = 0; i < _projectIds.length; i++) {
            uint256 projectId = _projectIds[i];
            if (_isProjectInTournament(_tournamentId, projectId) && 
                !projectStatus[_tournamentId][projectId].approved &&
                !projectStatus[_tournamentId][projectId].disqualified) {
                
                projectStatus[_tournamentId][projectId].approved = true;
                projectStatus[_tournamentId][projectId].approvedAt = block.timestamp;
                emit ProjectApproved(_tournamentId, projectId);
                approved++;
            }
        }

        require(approved > 0, "No projects approved");
    }

    /*//////////////////////////////////////////////////////////////
                          TOURNAMENT START
    //////////////////////////////////////////////////////////////*/

    function startTournament(uint256 _tournamentId) external {
        Tournament storage tournament = tournaments[_tournamentId];
        require(msg.sender == tournament.admin, "Only admin");
        require(!tournament.active, "Already started");
        
        uint256 approvedCount = _getApprovedProjectCount(_tournamentId);
        require(approvedCount >= 2, "Need at least 2 approved projects");

        tournament.active = true;

        _createAndStartStage(_tournamentId, 20, false);

        emit TournamentStarted(_tournamentId);
    }

    /*//////////////////////////////////////////////////////////////
                          STAGE MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    function _createAndStartStage(uint256 _tournamentId, uint256 _eliminationPercentage, bool _isAutoStart) internal {
        Tournament storage tournament = tournaments[_tournamentId];
        uint256 stageArrayIndex = tournamentStages[_tournamentId].length;
        uint256 stageNumber = stageArrayIndex + 1; // Stages start from 1, not 0
        
        tournamentStages[_tournamentId].push();
        Stage storage newStage = tournamentStages[_tournamentId][stageArrayIndex];
        
        newStage.stageNumber = stageNumber;
        newStage.start = block.timestamp;
        newStage.end = block.timestamp + tournament.stageDuration;
        newStage.scheduledStart = 0;
        newStage.rewardPool = 0;
        newStage.eliminationPercentage = _eliminationPercentage;
        newStage.finalized = false;
        newStage.started = true;

        emit StageStarted(_tournamentId, stageNumber, _eliminationPercentage, _isAutoStart);
    }

    function scheduleNextStage(uint256 _tournamentId, uint256 _scheduledStart, uint256 _eliminationPercentage) external {
        Tournament storage tournament = tournaments[_tournamentId];
        require(msg.sender == tournament.admin, "Only admin");
        require(tournament.active, "Tournament not active");
        
        // Allow scheduling even if current stage is not finalized (earlier creation)
        // Just check that tournament is active
        require(_scheduledStart > block.timestamp, "Must be future time");

        uint256 stageArrayIndex = tournamentStages[_tournamentId].length;
        uint256 stageNumber = stageArrayIndex + 1; // Stages start from 1
        tournamentStages[_tournamentId].push();
        Stage storage nextStage = tournamentStages[_tournamentId][stageArrayIndex];
        
        nextStage.stageNumber = stageNumber;
        nextStage.scheduledStart = _scheduledStart;
        nextStage.start = 0;
        nextStage.end = 0;
        nextStage.eliminationPercentage = _eliminationPercentage;
        nextStage.started = false;

        emit StageScheduled(_tournamentId, stageNumber, _scheduledStart);
    }

    function startScheduledStage(uint256 _tournamentId) external {
        Tournament storage tournament = tournaments[_tournamentId];
        require(tournament.active, "Tournament not active");
        
        uint256 currentStageArrayIndex = getCurrentStageNumber(_tournamentId);
        require(currentStageArrayIndex < tournamentStages[_tournamentId].length - 1, "No scheduled stage");
        
        uint256 nextStageArrayIndex = currentStageArrayIndex + 1;
        Stage storage nextStage = tournamentStages[_tournamentId][nextStageArrayIndex];
        
        require(!nextStage.started, "Already started");
        require(nextStage.scheduledStart > 0, "Not scheduled");
        require(block.timestamp >= nextStage.scheduledStart, "Too early");

        nextStage.start = block.timestamp;
        nextStage.end = block.timestamp + tournament.stageDuration;
        nextStage.started = true;

        emit StageStarted(_tournamentId, nextStage.stageNumber, nextStage.eliminationPercentage, false);
    }

    function startNextStageManually(uint256 _tournamentId) external {
        Tournament storage tournament = tournaments[_tournamentId];
        require(msg.sender == tournament.admin, "Only admin");
        require(tournament.active, "Tournament not active");
        
        // Allow starting next stage even if current stage is not finalized (earlier creation)
        // Just ensure we have enough projects
        uint256 approvedCount = _getApprovedProjectCount(_tournamentId);
        require(approvedCount >= 2, "Need at least 2 projects to continue");

        uint256 eliminationPercentage = _getNextEliminationPercentage(approvedCount);
        
        _createAndStartStage(_tournamentId, eliminationPercentage, false);
    }

    function _getNextEliminationPercentage(uint256 _remainingProjects) internal pure returns (uint256) {
        if (_remainingProjects <= 2) return 50;
        if (_remainingProjects <= 4) return 40;
        if (_remainingProjects <= 10) return 30;
        return 20;
    }

    /*//////////////////////////////////////////////////////////////
                          STAGE FUNDING
    //////////////////////////////////////////////////////////////*/

    function fundStageWithToken(uint256 _tournamentId, uint256 _stageNumber, address _token, uint256 _amount) external nonReentrant whenNotPaused {
        Tournament storage tournament = tournaments[_tournamentId];
        require(tournament.active, "Tournament not active");
        require(sovseas.supportedTokens(_token), "Token not supported");
        require(_stageNumber < tournamentStages[_tournamentId].length, "Invalid stage");
        
        Stage storage stage = tournamentStages[_tournamentId][_stageNumber];
        require(!stage.finalized, "Stage finalized");

        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        if (!isTokenUsedInStage[_tournamentId][_stageNumber][_token]) {
            stageUsedTokens[_tournamentId][_stageNumber].push(_token);
            isTokenUsedInStage[_tournamentId][_stageNumber][_token] = true;
        }

        stage.tokenAmounts[_token] += _amount;
        uint256 celoEquivalent = sovseas.getTokenToCeloEquivalent(_token, _amount);
        stage.rewardPool += celoEquivalent;

        emit StageFunded(_tournamentId, _stageNumber, _token, _amount, celoEquivalent);
    }

    function fundStageWithCelo(uint256 _tournamentId, uint256 _stageNumber) external payable nonReentrant whenNotPaused {
        Tournament storage tournament = tournaments[_tournamentId];
        require(tournament.active, "Tournament not active");
        require(msg.value > 0, "No CELO sent");
        require(_stageNumber < tournamentStages[_tournamentId].length, "Invalid stage");
        
        Stage storage stage = tournamentStages[_tournamentId][_stageNumber];
        require(!stage.finalized, "Stage finalized");

        address celoAddress = address(baseToken);
        
        if (!isTokenUsedInStage[_tournamentId][_stageNumber][celoAddress]) {
            stageUsedTokens[_tournamentId][_stageNumber].push(celoAddress);
            isTokenUsedInStage[_tournamentId][_stageNumber][celoAddress] = true;
        }

        stage.tokenAmounts[celoAddress] += msg.value;
        stage.rewardPool += msg.value;

        emit StageFunded(_tournamentId, _stageNumber, celoAddress, msg.value, msg.value);
    }

    /*//////////////////////////////////////////////////////////////
                            HELPERS
    //////////////////////////////////////////////////////////////*/

    function _isProjectInTournament(uint256 _tournamentId, uint256 _projectId) internal view returns (bool) {
        uint256[] memory projects = tournamentProjects[_tournamentId];
        for (uint256 i = 0; i < projects.length; i++) {
            if (projects[i] == _projectId) return true;
        }
        return false;
    }

    function _getApprovedProjectCount(uint256 _tournamentId) internal view returns (uint256) {
        uint256[] memory projects = tournamentProjects[_tournamentId];
        uint256 count = 0;
        for (uint256 i = 0; i < projects.length; i++) {
            ProjectStatus storage status = projectStatus[_tournamentId][projects[i]];
            if (status.approved && !status.disqualified && !status.eliminated) {
                count++;
            }
        }
        return count;
    }

    function _getLastApprovedProject(uint256 _tournamentId) internal view returns (uint256) {
        uint256[] memory projects = tournamentProjects[_tournamentId];
        for (uint256 i = 0; i < projects.length; i++) {
            ProjectStatus storage status = projectStatus[_tournamentId][projects[i]];
            if (status.approved && !status.disqualified && !status.eliminated) {
                return projects[i];
            }
        }
        return 0;
    }

    function sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getCurrentStageNumber(uint256 _tournamentId) public view returns (uint256) {
        // Returns array index (0-based) of current stage, not stage number (1-based)
        uint256 stageCount = tournamentStages[_tournamentId].length;
        if (stageCount == 0) return type(uint256).max; // No stages yet
        
        for (uint256 i = stageCount - 1; i >= 0; i--) {
            if (tournamentStages[_tournamentId][i].started) {
                return i;
            }
            if (i == 0) break;
        }
        return type(uint256).max; // No started stage
    }
    
    function getCurrentStageNumberDisplay(uint256 _tournamentId) public view returns (uint256) {
        // Returns actual stage number (1-based) for display
        uint256 arrayIndex = getCurrentStageNumber(_tournamentId);
        if (arrayIndex == type(uint256).max) return 0;
        return tournamentStages[_tournamentId][arrayIndex].stageNumber;
    }

    function getTournamentProjects(uint256 _tournamentId) external view returns (uint256[] memory) {
        return tournamentProjects[_tournamentId];
    }

    function getApprovedProjects(uint256 _tournamentId) external view returns (uint256[] memory) {
        uint256[] memory allProjects = tournamentProjects[_tournamentId];
        uint256 approvedCount = _getApprovedProjectCount(_tournamentId);
        
        uint256[] memory approved = new uint256[](approvedCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allProjects.length; i++) {
            ProjectStatus storage status = projectStatus[_tournamentId][allProjects[i]];
            if (status.approved && !status.disqualified && !status.eliminated) {
                approved[index++] = allProjects[i];
            }
        }
        
        return approved;
    }

    function getStageInfo(uint256 _tournamentId, uint256 _stageNumber) external view returns (
        uint256 stageNumber,
        uint256 start,
        uint256 end,
        uint256 scheduledStart,
        uint256 rewardPool,
        uint256 eliminationPercentage,
        bool finalized,
        bool started
    ) {
        // _stageNumber can be either array index (0-based) or stage number (1-based)
        // Try as array index first
        if (_stageNumber < tournamentStages[_tournamentId].length) {
            Stage storage stage = tournamentStages[_tournamentId][_stageNumber];
            return (
                stage.stageNumber,
                stage.start,
                stage.end,
                stage.scheduledStart,
                stage.rewardPool,
                stage.eliminationPercentage,
                stage.finalized,
                stage.started
            );
        }
        // If not found, try as stage number (1-based)
        uint256 stageCount = tournamentStages[_tournamentId].length;
        for (uint256 i = 0; i < stageCount; i++) {
            if (tournamentStages[_tournamentId][i].stageNumber == _stageNumber) {
                Stage storage stage = tournamentStages[_tournamentId][i];
                return (
                    stage.stageNumber,
                    stage.start,
                    stage.end,
                    stage.scheduledStart,
                    stage.rewardPool,
                    stage.eliminationPercentage,
                    stage.finalized,
                    stage.started
                );
            }
        }
        revert("Stage not found");
    }

    function getStageTokenAmount(uint256 _tournamentId, uint256 _stageNumber, address _token) external view returns (uint256) {
        return tournamentStages[_tournamentId][_stageNumber].tokenAmounts[_token];
    }

    function getStageFailedConversions(uint256 _tournamentId, uint256 _stageNumber, address _token) external view returns (uint256) {
        return tournamentStages[_tournamentId][_stageNumber].failedConversions[_token];
    }

    function getStageUsedTokens(uint256 _tournamentId, uint256 _stageNumber) external view returns (address[] memory) {
        return stageUsedTokens[_tournamentId][_stageNumber];
    }

    function getProjectPower(uint256 _tournamentId, uint256 _stageNumber, uint256 _projectId) external view returns (uint256) {
        return projectPowerPerStage[_tournamentId][_stageNumber][_projectId];
    }

    function getProjectStatus(uint256 _tournamentId, uint256 _projectId) external view returns (
        bool approved,
        bool disqualified,
        bool eliminated,
        uint256 approvedAt,
        uint256 eliminatedAt,
        uint256 eliminatedInStage,
        string memory disqualificationReason
    ) {
        ProjectStatus storage status = projectStatus[_tournamentId][_projectId];
        return (
            status.approved,
            status.disqualified,
            status.eliminated,
            status.approvedAt,
            status.eliminatedAt,
            status.eliminatedInStage,
            status.disqualificationReason
        );
    }

    function getStageCount(uint256 _tournamentId) external view returns (uint256) {
        return tournamentStages[_tournamentId].length;
    }

    function getTournamentConfig(uint256 _tournamentId) external view returns (
        PowerWeights memory powerWeights,
        DiminishingConfig memory diminishing,
        TimeDecayConfig memory timeDecay,
        uint256 voterRewardBps,
        uint256 minVoteAmount,
        uint256 qfPrecision,
        uint256 maxVotesPerVoter,
        bool allowSameProjectVote
    ) {
        Tournament storage tournament = tournaments[_tournamentId];
        TournamentConfig storage config = tournament.config;
        return (
            config.powerWeights,
            config.diminishing,
            config.timeDecay,
            config.voterRewardBps,
            config.minVoteAmount,
            config.qfPrecision,
            config.maxVotesPerVoter,
            config.allowSameProjectVote
        );
    }

    function getStageStatus(uint256 _tournamentId, uint256 _stageNumber) 
        external view returns (
            bool active,
            bool ended,
            bool finalized,
            uint256 timeRemaining
        ) {
        if (_stageNumber >= tournamentStages[_tournamentId].length) {
            return (false, false, false, 0);
        }
        
        Stage storage stage = tournamentStages[_tournamentId][_stageNumber];
        
        if (!stage.started) {
            return (false, false, false, 0);
        }
        
        active = block.timestamp >= stage.start && block.timestamp <= stage.end;
        ended = block.timestamp > stage.end;
        finalized = stage.finalized;
        timeRemaining = ended ? 0 : stage.end - block.timestamp;
        
        return (active, ended, finalized, timeRemaining);
    }

    function canFinalizeStage(uint256 _tournamentId, uint256 _stageNumber) 
        external view returns (bool) {
        if (!tournaments[_tournamentId].active) return false;
        if (_stageNumber >= tournamentStages[_tournamentId].length) return false;
        
        Stage storage stage = tournamentStages[_tournamentId][_stageNumber];
        return stage.started && block.timestamp > stage.end && !stage.finalized;
    }

    function getLeaderboard(uint256 _tournamentId, uint256 _stageNumber) external view returns (
        uint256[] memory projectIds,
        uint256[] memory powers
    ) {
        uint256[] memory allProjects = tournamentProjects[_tournamentId];
        uint256 approvedCount = _getApprovedProjectCount(_tournamentId);
        
        projectIds = new uint256[](approvedCount);
        powers = new uint256[](approvedCount);
        
        uint256 index = 0;
        for (uint256 i = 0; i < allProjects.length; i++) {
            uint256 projectId = allProjects[i];
            ProjectStatus storage status = projectStatus[_tournamentId][projectId];
            if (status.approved && !status.disqualified && !status.eliminated) {
                projectIds[index] = projectId;
                powers[index] = projectPowerPerStage[_tournamentId][_stageNumber][projectId];
                index++;
            }
        }
        
        // Bubble sort by power (descending)
        for (uint256 i = 0; i < projectIds.length; i++) {
            for (uint256 j = i + 1; j < projectIds.length; j++) {
                if (powers[j] > powers[i]) {
                    (projectIds[i], projectIds[j]) = (projectIds[j], projectIds[i]);
                    (powers[i], powers[j]) = (powers[j], powers[i]);
                }
            }
        }
        
        return (projectIds, powers);
    }

    /*//////////////////////////////////////////////////////////////
                        ADDITIONAL VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    // Get total power for a stage (useful for checking if voting occurred)
    function getStageTotalPower(uint256 _tournamentId, uint256 _stageNumber) external view returns (uint256) {
        uint256[] memory projects = tournamentProjects[_tournamentId];
        uint256 totalPower = 0;
        for (uint256 i = 0; i < projects.length; i++) {
            totalPower += projectPowerPerStage[_tournamentId][_stageNumber][projects[i]];
        }
        return totalPower;
    }

    // Get all stage numbers for a tournament
    function getTournamentStageNumbers(uint256 _tournamentId) external view returns (uint256[] memory) {
        uint256 stageCount = tournamentStages[_tournamentId].length;
        uint256[] memory stageNumbers = new uint256[](stageCount);
        for (uint256 i = 0; i < stageCount; i++) {
            stageNumbers[i] = tournamentStages[_tournamentId][i].stageNumber;
        }
        return stageNumbers;
    }

    // Get stage array index from stage number
    function getStageArrayIndex(uint256 _tournamentId, uint256 _stageNumber) external view returns (uint256) {
        uint256 stageCount = tournamentStages[_tournamentId].length;
        for (uint256 i = 0; i < stageCount; i++) {
            if (tournamentStages[_tournamentId][i].stageNumber == _stageNumber) {
                return i;
            }
        }
        revert("Stage not found");
    }

    // Get all projects with their powers for a stage
    function getStageProjectPowers(uint256 _tournamentId, uint256 _stageNumber) external view returns (
        uint256[] memory projectIds,
        uint256[] memory powers
    ) {
        uint256[] memory allProjects = tournamentProjects[_tournamentId];
        uint256 approvedCount = _getApprovedProjectCount(_tournamentId);
        
        projectIds = new uint256[](approvedCount);
        powers = new uint256[](approvedCount);
        
        uint256 index = 0;
        for (uint256 i = 0; i < allProjects.length; i++) {
            uint256 projectId = allProjects[i];
            ProjectStatus storage status = projectStatus[_tournamentId][projectId];
            if (status.approved && !status.disqualified && !status.eliminated) {
                projectIds[index] = projectId;
                powers[index] = projectPowerPerStage[_tournamentId][_stageNumber][projectId];
                index++;
            }
        }
        
        return (projectIds, powers);
    }

    // Check if a project has zero power in a stage (useful for debugging)
    function hasProjectZeroPower(uint256 _tournamentId, uint256 _stageNumber, uint256 _projectId) external view returns (bool) {
        return projectPowerPerStage[_tournamentId][_stageNumber][_projectId] == 0;
    }

    // Get all projects with zero power in a stage
    function getProjectsWithZeroPower(uint256 _tournamentId, uint256 _stageNumber) external view returns (uint256[] memory) {
        uint256[] memory allProjects = tournamentProjects[_tournamentId];
        uint256[] memory zeroPowerProjects = new uint256[](allProjects.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < allProjects.length; i++) {
            uint256 projectId = allProjects[i];
            ProjectStatus storage status = projectStatus[_tournamentId][projectId];
            if (status.approved && !status.disqualified && !status.eliminated) {
                if (projectPowerPerStage[_tournamentId][_stageNumber][projectId] == 0) {
                    zeroPowerProjects[count] = projectId;
                    count++;
                }
            }
        }
        
        // Resize array
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = zeroPowerProjects[i];
        }
        
        return result;
    }

    // Get stage by stage number (1-based) instead of array index
    function getStageByNumber(uint256 _tournamentId, uint256 _stageNumber) external view returns (
        uint256 stageNumber,
        uint256 start,
        uint256 end,
        uint256 scheduledStart,
        uint256 rewardPool,
        uint256 eliminationPercentage,
        bool finalized,
        bool started
    ) {
        uint256 stageCount = tournamentStages[_tournamentId].length;
        for (uint256 i = 0; i < stageCount; i++) {
            if (tournamentStages[_tournamentId][i].stageNumber == _stageNumber) {
                Stage storage stage = tournamentStages[_tournamentId][i];
                return (
                    stage.stageNumber,
                    stage.start,
                    stage.end,
                    stage.scheduledStart,
                    stage.rewardPool,
                    stage.eliminationPercentage,
                    stage.finalized,
                    stage.started
                );
            }
        }
        revert("Stage not found");
    }

    receive() external payable {}
}

