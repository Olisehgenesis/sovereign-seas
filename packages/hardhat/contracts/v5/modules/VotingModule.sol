// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../base/BaseModule.sol";

/**
 * @title VotingModule - Enhanced with V4 Functionality & Position Tracking
 * @notice Handles voting and project participation in SovereignSeas V5
 * @dev Manages multi-token voting, enhanced quadratic voting, project participation, position tracking, and V4 migration
 */
contract VotingModule is BaseModule {
    using SafeERC20 for IERC20;

    // Voting scheme enum
    enum VotingScheme {
        LINEAR,     // 0 - Linear voting (1 token = 1 vote)
        QUADRATIC,  // 1 - Enhanced quadratic voting with time weighting
        CUSTOM      // 2 - Custom voting scheme
    }

    // Vote struct with enhanced tracking
    struct Vote {
        address voter;
        uint256 campaignId;
        uint256 projectId;
        address token;
        uint256 amount;
        uint256 votingPower;
        uint256 celoEquivalent;
        uint256 timestamp;
        uint256 timeWeight;        // Early voting bonus
        uint256 diversityBonus;    // Unique voter bonus
        bool active;
    }

    // Project Participation struct for V4 compatibility
    struct ProjectParticipation {
        uint256 projectId;
        uint256 campaignId;
        bool approved;
        uint256 voteCount;
        uint256 votingPower;
        uint256 fundsReceived;
        uint256 uniqueVoters;
        uint256 currentPosition;   // Current ranking position
        uint256 previousPosition;  // Previous ranking position
        uint256 positionChange;    // Position change (0=no change, 1=up, 2=down)
        uint256 lastPositionUpdate;
        mapping(address => uint256) tokenVotes;
    }

    // Voting session struct
    struct VotingSession {
        uint256 id;
        uint256 campaignId;
        uint256 startTime;
        uint256 endTime;
        bool active;
        uint256 totalVotes;
        uint256 totalVotingPower;
        VotingScheme scheme;
        mapping(uint256 => uint256) projectVotes;
        mapping(uint256 => uint256) projectVotingPower;
        mapping(address => uint256) voterTotalVotes;
        mapping(address => uint256) voterTotalVotingPower;
    }

    // Voter reputation struct
    struct VoterReputation {
        uint256 reputationScore;
        uint256 totalVotes;
        uint256 successfulVotes;
        uint256 lastVoteTime;
        uint256 consecutiveVotes;
        uint256 earlyVoterBonus;
        mapping(uint256 => bool) votedInCampaigns;
    }

    // Project position tracking
    struct ProjectPosition {
        uint256 projectId;
        uint256 position;
        uint256 votingPower;
        uint256 percentageChange;  // Basis points (10000 = 100%)
        bool isRising;
        uint256 lastUpdate;
    }

    // State variables - Enhanced
    mapping(uint256 => mapping(uint256 => ProjectParticipation)) public projectParticipations;
    mapping(uint256 => mapping(address => mapping(uint256 => mapping(address => Vote)))) public userVotes;
    mapping(uint256 => mapping(address => uint256)) public totalUserVotesInCampaign;
    mapping(uint256 => mapping(uint256 => uint256)) public projectVoteCount;
    mapping(uint256 => mapping(uint256 => uint256)) public projectVotingPower;
    mapping(uint256 => mapping(uint256 => uint256)) public lastProjectUpdateTs;
    mapping(address => Vote[]) public userVoteHistory;
    mapping(uint256 => VotingSession) public votingSessions;
    mapping(address => VoterReputation) public voterReputations;
    
    // Position tracking mappings
    mapping(uint256 => uint256[]) public campaignProjectRankings;
    mapping(uint256 => mapping(uint256 => ProjectPosition)) public projectPositions;
    mapping(uint256 => uint256) public lastRankingUpdate;
    
    // Enhanced voting features
    mapping(address => bool) public votingTokens;
    mapping(uint256 => mapping(address => bool)) public campaignVoterParticipated;
    mapping(uint256 => address[]) public campaignVoters;
    mapping(uint256 => uint256) public campaignTotalVoters;
    mapping(uint256 => mapping(uint256 => uint256)) public projectUniqueVoters;
    
    // Reputation and analytics
    mapping(address => uint256) public voterReputation;
    mapping(uint256 => mapping(address => uint256)) public voterWeight;

    uint256 public nextVotingSessionId;
    uint256 public totalVotes;
    uint256 public totalVotingPower;
    uint256 public activeVotingSessions;

    // Position tracking constants
    uint256 public constant POSITION_UPDATE_INTERVAL = 300; // 5 minutes
    uint256 public constant MAX_POSITION_HISTORY = 100;

    // Enhanced quadratic voting weights
    uint256 public constant AMOUNT_WEIGHT = 6000;      // 60% weight for amount
    uint256 public constant DIVERSITY_WEIGHT = 2000;   // 20% weight for voter diversity
    uint256 public constant TIME_WEIGHT = 2000;        // 20% weight for early voting

    // Events - Enhanced
    event VoteCast(address indexed voter, uint256 indexed campaignId, uint256 indexed projectId, address token, uint256 amount, uint256 votingPower);
    event VoteUpdated(address indexed voter, uint256 indexed campaignId, uint256 indexed projectId, address token, uint256 newAmount, uint256 newVotingPower);
    event VoteRemoved(address indexed voter, uint256 indexed campaignId, uint256 indexed projectId);
    event ProjectAddedToCampaign(uint256 indexed campaignId, uint256 indexed projectId);
    event ProjectRemovedFromCampaign(uint256 indexed campaignId, uint256 indexed projectId);
    event ProjectApproved(uint256 indexed campaignId, uint256 indexed projectId, address indexed approver);
    event ProjectRejected(uint256 indexed campaignId, uint256 indexed projectId, address indexed rejecter);
    event VotingSessionCreated(uint256 indexed sessionId, uint256 indexed campaignId, uint256 startTime, uint256 endTime);
    event VotingSessionEnded(uint256 indexed sessionId, uint256 indexed campaignId);
    event VoterReputationUpdated(address indexed voter, uint256 newReputationScore);
    event VotingStatisticsUpdated(uint256 indexed campaignId, uint256 totalVotes, uint256 totalVotingPower);
    event ProjectTotalsUpdated(
        uint256 indexed campaignId,
        uint256 indexed projectId,
        uint256 voteCount,
        uint256 votingPower,
        uint256 totalVotes,
        uint256 totalVotingPower,
        uint256 timestamp
    );
    
    // New position tracking events
    event ProjectPositionUpdated(
        uint256 indexed campaignId,
        uint256 indexed projectId,
        uint256 oldPosition,
        uint256 newPosition,
        uint256 percentageChange,
        bool isRising
    );
    event CampaignRankingsUpdated(uint256 indexed campaignId, uint256 timestamp);

    function initialize(address _proxy, bytes calldata _data) external override initializer {
        // Initialize base module
        require(_proxy != address(0), "VotingModule: Invalid proxy address");
        
        sovereignSeasProxy = ISovereignSeasV5(_proxy);
        moduleActive = true;

        // Initialize inherited contracts
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        // Set module-specific data
        moduleName = "Enhanced Voting Module";
        moduleDescription = "Handles voting, project participation, position tracking, and V4 migration";
        moduleDependencies = new string[](3);
        moduleDependencies[0] = "projects";
        moduleDependencies[1] = "campaigns";
        moduleDependencies[2] = "treasury";
        
        nextVotingSessionId = 1;
        
        emit ModuleInitialized(getModuleId(), _proxy);
    }

    function getModuleId() public pure override returns (string memory) {
        return "voting";
    }

    function getModuleVersion() public pure override returns (string memory) {
        return "2.1.0";
    }

    // ==================== PROJECT PARTICIPATION MANAGEMENT ====================

    /**
     * @notice Add project to campaign with fee collection
     */
    function addProjectToCampaign(
        uint256 _campaignId,
        uint256 _projectId,
        address _feeToken
    ) external payable whenActive nonReentrant {
        // Verify campaign exists and is active
        bytes memory campaignData = callModule("campaigns", abi.encodeWithSignature("getCampaign(uint256)", _campaignId));
        require(campaignData.length > 0, "VotingModule: Campaign does not exist");

        // Verify project exists and is active  
        bytes memory projectData = callModule("projects", abi.encodeWithSignature("getProject(uint256)", _projectId));
        require(projectData.length > 0, "VotingModule: Project does not exist");

        // Check permissions - project owner or campaign admin
        bool isAuthorized = _checkProjectAdditionPermission(_campaignId, _projectId, msg.sender);
        require(isAuthorized, "VotingModule: Not authorized to add project to campaign");

        // Check if already participating
        require(projectParticipations[_campaignId][_projectId].projectId == 0, "VotingModule: Project already in campaign");

        // Get and validate fee
        bytes memory feeConfigData = callModule("campaigns", abi.encodeWithSignature("getProjectAdditionFeeConfig(uint256)", _campaignId));
        (address requiredFeeToken, uint256 feeAmount) = abi.decode(feeConfigData, (address, uint256));
        
        require(_feeToken == requiredFeeToken, "VotingModule: Invalid fee token");

        // Collect fee through treasury
        if (feeAmount > 0) {
            bytes memory feeValidation = callModule("treasury", abi.encodeWithSignature(
                "validateAndCollectFee(address,uint256,string,uint256,address)",
                _feeToken, feeAmount, "projectAddition", _campaignId, msg.sender
            ));
            require(abi.decode(feeValidation, (bool)), "VotingModule: Fee collection failed");
        }

        // Add project to campaign in projects module
        callModule("projects", abi.encodeWithSignature("addProjectToCampaign(uint256,uint256)", _projectId, _campaignId));

        // Initialize participation with position tracking
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        participation.projectId = _projectId;
        participation.campaignId = _campaignId;
        participation.approved = false;
        participation.voteCount = 0;
        participation.votingPower = 0;
        participation.fundsReceived = 0;
        participation.uniqueVoters = 0;
        participation.currentPosition = 0;
        participation.previousPosition = 0;
        participation.positionChange = 0;
        participation.lastPositionUpdate = block.timestamp;

        // Add to campaign rankings
        campaignProjectRankings[_campaignId].push(_projectId);
        
        // Initialize position tracking
        ProjectPosition storage position = projectPositions[_campaignId][_projectId];
        position.projectId = _projectId;
        position.position = campaignProjectRankings[_campaignId].length;
        position.votingPower = 0;
        position.percentageChange = 0;
        position.isRising = false;
        position.lastUpdate = block.timestamp;

        emit ProjectAddedToCampaign(_campaignId, _projectId);
    }

    /**
     * @notice Remove project from campaign
     */
    function removeProjectFromCampaign(uint256 _campaignId, uint256 _projectId) external whenActive {
        require(projectParticipations[_campaignId][_projectId].projectId != 0, "VotingModule: Project not in campaign");
        require(projectParticipations[_campaignId][_projectId].voteCount == 0, "VotingModule: Project has votes, cannot remove");

        // Check permissions
        bool isAuthorized = _checkProjectAdditionPermission(_campaignId, _projectId, msg.sender);
        require(isAuthorized, "VotingModule: Not authorized to remove project from campaign");

        // Remove from projects module
        callModule("projects", abi.encodeWithSignature("removeProjectFromCampaign(uint256,uint256)", _projectId, _campaignId));

        // Remove from rankings
        _removeFromRankings(_campaignId, _projectId);

        // Clean up participation data
        delete projectParticipations[_campaignId][_projectId];
        delete projectPositions[_campaignId][_projectId];

        emit ProjectRemovedFromCampaign(_campaignId, _projectId);
    }

    /**
     * @notice Approve project for funding (campaign admin only)
     */
    function approveProject(uint256 _campaignId, uint256 _projectId) external whenActive {
        // Check if sender is campaign admin
        bytes memory isAdminData = callModule("campaigns", abi.encodeWithSignature("isCampaignAdmin(uint256,address)", _campaignId, msg.sender));
        bool isCampaignAdmin = abi.decode(isAdminData, (bool));
        require(isCampaignAdmin, "VotingModule: Only campaign admin can approve projects");

        require(projectParticipations[_campaignId][_projectId].projectId != 0, "VotingModule: Project not in campaign");
        require(!projectParticipations[_campaignId][_projectId].approved, "VotingModule: Project already approved");

        projectParticipations[_campaignId][_projectId].approved = true;

        emit ProjectApproved(_campaignId, _projectId, msg.sender);
    }

    // ==================== ENHANCED VOTING FUNCTIONS ====================

    /**
     * @notice Vote with token (enhanced with limits and validation)
     */
    function vote(
        uint256 _campaignId,
        uint256 _projectId,
        address _token,
        uint256 _amount
    ) external payable whenActive nonReentrant {
        require(_token != address(0), "VotingModule: Use voteWithCelo for CELO voting");
        _voteWithToken(_campaignId, _projectId, _token, _amount);
    }

    /**
     * @notice Vote with CELO
     */
    function voteWithCelo(
        uint256 _campaignId,
        uint256 _projectId
    ) external payable whenActive nonReentrant {
        require(msg.value > 0, "VotingModule: Must send CELO to vote");
        _voteWithCelo(_campaignId, _projectId, msg.value);
    }

    /**
     * @notice Internal vote with token logic
     */
    function _voteWithToken(
        uint256 _campaignId,
        uint256 _projectId,
        address _token,
        uint256 _amount
    ) internal {
        // Validate campaign timing and status
        _validateVotingConditions(_campaignId, _projectId);

        // Validate token and amount
        require(votingTokens[_token], "VotingModule: Token not enabled for voting");
        require(_amount > 0, "VotingModule: Invalid vote amount");

        // Get CELO equivalent through treasury
        bytes memory celoEquivData = callModule("treasury", abi.encodeWithSignature("getTokenToCeloEquivalent(address,uint256)", _token, _amount));
        uint256 celoEquivalent = abi.decode(celoEquivData, (uint256));

        // Check vote limits
        _checkVoteLimits(_campaignId, celoEquivalent);

        // Transfer tokens to main contract
        IERC20(_token).safeTransferFrom(msg.sender, address(sovereignSeasProxy), _amount);

        // Update vote data with enhanced calculations
        _updateVoteDataEnhanced(_campaignId, _projectId, _token, _amount, celoEquivalent);

        // Update campaign funding
        callModule("campaigns", abi.encodeWithSignature("fundCampaign(uint256,address,uint256)", _campaignId, _token, _amount));
    }

    /**
     * @notice Internal vote with CELO logic
     */
    function _voteWithCelo(
        uint256 _campaignId,
        uint256 _projectId,
        uint256 _amount
    ) internal {
        // Validate campaign timing and status
        _validateVotingConditions(_campaignId, _projectId);

        // Get CELO token address from treasury
        bytes memory celoTokenData = callModule("treasury", abi.encodeWithSignature("getCeloToken()"));
        address celoToken = abi.decode(celoTokenData, (address));

        require(votingTokens[celoToken], "VotingModule: CELO not enabled for voting");

        uint256 celoEquivalent = _amount; // CELO is 1:1 with itself

        // Check vote limits
        _checkVoteLimits(_campaignId, celoEquivalent);

        // Transfer CELO to main contract
        payable(address(sovereignSeasProxy)).transfer(_amount);

        // Update vote data with enhanced calculations
        _updateVoteDataEnhanced(_campaignId, _projectId, celoToken, _amount, celoEquivalent);

        // Update campaign funding
        callModule("campaigns", abi.encodeWithSignature("fundCampaign(uint256,address,uint256)", _campaignId, celoToken, _amount));
    }

    /**
     * @notice Enhanced vote data update with position tracking
     */
    function _updateVoteDataEnhanced(
        uint256 _campaignId,
        uint256 _projectId,
        address _token,
        uint256 _amount,
        uint256 _celoEquivalent
    ) internal {
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];

        // Calculate enhanced voting power using improved quadratic formula
        uint256 timeWeight = _calculateTimeWeight(_campaignId);
        uint256 diversityWeight = _calculateDiversityWeight(_campaignId, _projectId);
        uint256 votingPower = _calculateEnhancedQuadraticVoting(_amount, timeWeight, diversityWeight);

        // Create or update vote
        Vote storage vote = userVotes[_campaignId][msg.sender][_projectId][_token];
        
        bool isNewVote = !vote.active;
        
        if (vote.active) {
            // Update existing vote - adjust totals
            totalUserVotesInCampaign[_campaignId][msg.sender] = totalUserVotesInCampaign[_campaignId][msg.sender] - vote.amount + _amount;
            participation.voteCount = participation.voteCount - vote.amount + _amount;
            participation.votingPower = participation.votingPower - vote.votingPower + votingPower;
            participation.tokenVotes[_token] = participation.tokenVotes[_token] - vote.amount + _amount;
            totalVotes = totalVotes - vote.amount + _amount;
            totalVotingPower = totalVotingPower - vote.votingPower + votingPower;
            
            // Update vote details
            vote.amount = _amount;
            vote.votingPower = votingPower;
            vote.celoEquivalent = _celoEquivalent;
            vote.timestamp = block.timestamp;
            vote.timeWeight = timeWeight;
            vote.diversityBonus = diversityWeight;
        } else {
            // Create new vote
            vote.voter = msg.sender;
            vote.campaignId = _campaignId;
            vote.projectId = _projectId;
            vote.token = _token;
            vote.amount = _amount;
            vote.votingPower = votingPower;
            vote.celoEquivalent = _celoEquivalent;
            vote.timestamp = block.timestamp;
            vote.timeWeight = timeWeight;
            vote.diversityBonus = diversityWeight;
            vote.active = true;

            // Update totals
            totalUserVotesInCampaign[_campaignId][msg.sender] += _amount;
            participation.voteCount += _amount;
            participation.votingPower += votingPower;
            participation.tokenVotes[_token] += _amount;
            totalVotes += _amount;
            totalVotingPower += votingPower;

            // Track unique voter
            if (!campaignVoterParticipated[_campaignId][msg.sender]) {
                campaignVoterParticipated[_campaignId][msg.sender] = true;
                campaignVoters[_campaignId].push(msg.sender);
                campaignTotalVoters[_campaignId]++;
            }

            // Track project unique voters
            projectUniqueVoters[_campaignId][_projectId]++;
            participation.uniqueVoters = projectUniqueVoters[_campaignId][_projectId];

            // Add to vote history
            userVoteHistory[msg.sender].push(vote);
        }

        // Update voter reputation
        _updateVoterReputation(msg.sender, _campaignId);

        // Update project stats in projects module
        callModule("projects", abi.encodeWithSignature("updateProjectStats(uint256,uint256,uint256)", _projectId, 0, _celoEquivalent));

        // Update project positions
        _updateProjectPositions(_campaignId);

        emit VoteCast(msg.sender, _campaignId, _projectId, _token, _amount, votingPower);
        emit ProjectTotalsUpdated(
            _campaignId,
            _projectId,
            participation.voteCount,
            participation.votingPower,
            totalVotes,
            totalVotingPower,
            block.timestamp
        );
    }

    // ==================== ENHANCED QUADRATIC VOTING CALCULATION ====================

    /**
     * @notice Calculate enhanced quadratic voting power with time and diversity weights
     * @param _amount Token amount voted
     * @param _timeWeight Early voting bonus weight
     * @param _diversityWeight Unique voter diversity weight
     * @return Enhanced voting power
     */
    function _calculateEnhancedQuadraticVoting(
        uint256 _amount,
        uint256 _timeWeight,
        uint256 _diversityWeight
    ) internal pure returns (uint256) {
        // Base quadratic component (60% weight)
        uint256 baseQuadratic = _sqrt(_amount * 1e18) / 1e9; // Normalize for precision
        uint256 amountComponent = (baseQuadratic * AMOUNT_WEIGHT) / 10000;

        // Diversity component (20% weight) - bonus for projects with more unique voters
        uint256 diversityComponent = (_diversityWeight * DIVERSITY_WEIGHT) / 10000;

        // Time component (20% weight) - early voters get bonus
        uint256 timeComponent = (_timeWeight * TIME_WEIGHT) / 10000;

        return amountComponent + diversityComponent + timeComponent;
    }

    /**
     * @notice Calculate time weight for early voting bonus
     * @param _campaignId Campaign ID
     * @return Time weight multiplier
     */
    function _calculateTimeWeight(uint256 _campaignId) internal view returns (uint256) {
        // Get campaign timing from campaigns module
        bytes memory campaignData = callModuleView("campaigns", abi.encodeWithSignature("getCampaignTiming(uint256)", _campaignId));
        if (campaignData.length == 0) return 1000; // Default weight
        
        (uint256 startTime, uint256 endTime) = abi.decode(campaignData, (uint256, uint256));
        
        if (block.timestamp < startTime) return 1500; // 50% bonus for pre-campaign votes
        
        uint256 campaignDuration = endTime - startTime;
        uint256 timeElapsed = block.timestamp - startTime;
        
        if (timeElapsed >= campaignDuration) return 800; // 20% penalty for late votes
        
        // Linear decrease from 150% to 80% over campaign duration
        uint256 timeRatio = (timeElapsed * 10000) / campaignDuration;
        uint256 weight = 1500 - ((timeRatio * 700) / 10000); // 1500 to 800
        
        return weight;
    }

    /**
     * @notice Calculate diversity weight based on project's unique voter count
     * @param _campaignId Campaign ID
     * @param _projectId Project ID
     * @return Diversity weight multiplier
     */
    function _calculateDiversityWeight(uint256 _campaignId, uint256 _projectId) internal view returns (uint256) {
        uint256 uniqueVoters = projectUniqueVoters[_campaignId][_projectId];
        
        // Base weight of 1000 (100%)
        // Bonus increases with more unique voters: +10% per 10 voters, max 200% bonus
        uint256 bonus = (uniqueVoters * 100) / 10; // 10% per 10 voters
        if (bonus > 2000) bonus = 2000; // Cap at 200% bonus
        
        return 1000 + bonus;
    }

    // ==================== PROJECT POSITION TRACKING ====================

    /**
     * @notice Update project positions and rankings
     * @param _campaignId Campaign ID
     */
    function _updateProjectPositions(uint256 _campaignId) internal {
        // Check if enough time has passed since last update
        if (block.timestamp - lastRankingUpdate[_campaignId] < POSITION_UPDATE_INTERVAL) {
            return;
        }
        
        uint256[] memory projectIds = campaignProjectRankings[_campaignId];
        uint256[] memory votingPowers = new uint256[](projectIds.length);
        
        // Get current voting powers
        for (uint256 i = 0; i < projectIds.length; i++) {
            votingPowers[i] = projectParticipations[_campaignId][projectIds[i]].votingPower;
        }
        
        // Sort projects by voting power (bubble sort for simplicity)
        for (uint256 i = 0; i < projectIds.length - 1; i++) {
            for (uint256 j = 0; j < projectIds.length - i - 1; j++) {
                if (votingPowers[j] < votingPowers[j + 1]) {
                    // Swap voting powers
                    uint256 tempPower = votingPowers[j];
                    votingPowers[j] = votingPowers[j + 1];
                    votingPowers[j + 1] = tempPower;
                    
                    // Swap project IDs
                    uint256 tempId = projectIds[j];
                    projectIds[j] = projectIds[j + 1];
                    projectIds[j + 1] = tempId;
                }
            }
        }
        
        // Update positions and calculate changes
        for (uint256 i = 0; i < projectIds.length; i++) {
            uint256 projectId = projectIds[i];
            uint256 newPosition = i + 1;
            
            ProjectParticipation storage participation = projectParticipations[_campaignId][projectId];
            ProjectPosition storage position = projectPositions[_campaignId][projectId];
            
            uint256 oldPosition = participation.currentPosition;
            
            if (oldPosition == 0) oldPosition = newPosition; // First time ranking
            
            // Update positions
            participation.previousPosition = oldPosition;
            participation.currentPosition = newPosition;
            
            // Calculate position change
            if (newPosition < oldPosition) {
                participation.positionChange = 1; // Moved up
                position.isRising = true;
            } else if (newPosition > oldPosition) {
                participation.positionChange = 2; // Moved down
                position.isRising = false;
            } else {
                participation.positionChange = 0; // No change
            }
            
            // Calculate percentage change in voting power
            uint256 oldVotingPower = position.votingPower;
            uint256 newVotingPower = participation.votingPower;
            
            if (oldVotingPower > 0 && newVotingPower != oldVotingPower) {
                if (newVotingPower > oldVotingPower) {
                    position.percentageChange = ((newVotingPower - oldVotingPower) * 10000) / oldVotingPower;
                } else {
                    position.percentageChange = ((oldVotingPower - newVotingPower) * 10000) / oldVotingPower;
                }
            }
            
            // Update position data
            position.position = newPosition;
            position.votingPower = newVotingPower;
            position.lastUpdate = block.timestamp;
            
            participation.lastPositionUpdate = block.timestamp;
            
            emit ProjectPositionUpdated(
                _campaignId,
                projectId,
                oldPosition,
                newPosition,
                position.percentageChange,
                position.isRising
            );
        }
        
        // Update campaign rankings
        campaignProjectRankings[_campaignId] = projectIds;
        lastRankingUpdate[_campaignId] = block.timestamp;
        
        emit CampaignRankingsUpdated(_campaignId, block.timestamp);
    }

    /**
     * @notice Remove project from rankings array
     */
    function _removeFromRankings(uint256 _campaignId, uint256 _projectId) internal {
        uint256[] storage rankings = campaignProjectRankings[_campaignId];
        
        for (uint256 i = 0; i < rankings.length; i++) {
            if (rankings[i] == _projectId) {
                // Move last element to this position
                rankings[i] = rankings[rankings.length - 1];
                rankings.pop();
                break;
            }
        }
    }

    // ==================== VIEW FUNCTIONS - ENHANCED ====================

    /**
    * @notice Get sorted projects by voting power with position data
    */
    function getSortedProjectsWithPositions(uint256 _campaignId) external view returns (
        uint256[] memory projectIds,
        uint256[] memory votingPowers,
        uint256[] memory positions,
        uint256[] memory positionChanges,
        bool[] memory isRising,
        uint256[] memory percentageChanges
    ) {
        uint256[] memory rankings = campaignProjectRankings[_campaignId];
        uint256 length = rankings.length;
        
        projectIds = new uint256[](length);
        votingPowers = new uint256[](length);
        positions = new uint256[](length);
        positionChanges = new uint256[](length);
        isRising = new bool[](length);
        percentageChanges = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            uint256 projectId = rankings[i];
            ProjectParticipation storage participation = projectParticipations[_campaignId][projectId];
            ProjectPosition storage position = projectPositions[_campaignId][projectId];
            
            projectIds[i] = projectId;
            votingPowers[i] = participation.votingPower;
            positions[i] = participation.currentPosition;
            positionChanges[i] = participation.positionChange;
            isRising[i] = position.isRising;
            percentageChanges[i] = position.percentageChange;
        }
        
        return (projectIds, votingPowers, positions, positionChanges, isRising, percentageChanges);
    }

    /**
    * @notice Get project participation details with position tracking
    */
    function getParticipationWithPosition(uint256 _campaignId, uint256 _projectId) external view returns (
        bool approved,
        uint256 voteCount,
        uint256 votingPower,
        uint256 fundsReceived,
        uint256 uniqueVoters,
        uint256 currentPosition,
        uint256 previousPosition,
        uint256 positionChange,
        uint256 percentageChange,
        bool isRising
    ) {
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        ProjectPosition storage position = projectPositions[_campaignId][_projectId];
        
        return (
            participation.approved,
            participation.voteCount,
            participation.votingPower,
            participation.fundsReceived,
            participation.uniqueVoters,
            participation.currentPosition,
            participation.previousPosition,
            participation.positionChange,
            position.percentageChange,
            position.isRising
        );
    }

    /**
    * @notice Get user votes for project with specific token (enhanced)
    */
    function getUserVotesForProjectWithTokenEnhanced(
        uint256 _campaignId,
        address _user,
        uint256 _projectId,
        address _token
    ) external view returns (
        uint256 amount,
        uint256 votingPower,
        uint256 celoEquivalent,
        uint256 timestamp,
        uint256 timeWeight,
        uint256 diversityBonus,
        bool active
    ) {
        Vote storage vote = userVotes[_campaignId][_user][_projectId][_token];
        return (
            vote.amount,
            vote.votingPower,
            vote.celoEquivalent,
            vote.timestamp,
            vote.timeWeight,
            vote.diversityBonus,
            vote.active
        );
    }

    /**
    * @notice Get project position history and trends
    */
    function getProjectPositionTrends(uint256 _campaignId, uint256 _projectId) external view returns (
        uint256 currentPosition,
        uint256 previousPosition,
        uint256 positionChange,
        uint256 percentageChange,
        bool isRising,
        uint256 lastUpdate,
        uint256 trendDirection // 0=stable, 1=rising, 2=falling
    ) {
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        ProjectPosition storage position = projectPositions[_campaignId][_projectId];
        
        uint256 direction = 0;
        if (participation.currentPosition < participation.previousPosition) {
            direction = 1; // Rising
        } else if (participation.currentPosition > participation.previousPosition) {
            direction = 2; // Falling
        }
        
        return (
            participation.currentPosition,
            participation.previousPosition,
            participation.positionChange,
            position.percentageChange,
            position.isRising,
            position.lastUpdate,
            direction
        );
    }

    /**
    * @notice Get campaign rankings with metadata
    */
    function getCampaignRankingsWithMetadata(uint256 _campaignId) external view returns (
        uint256[] memory projectIds,
        uint256[] memory votingPowers,
        uint256[] memory uniqueVoters,
        uint256[] memory positionChanges,
        uint256 lastUpdate,
        uint256 totalProjects
    ) {
        uint256[] memory rankings = campaignProjectRankings[_campaignId];
        uint256 length = rankings.length;
        
        projectIds = new uint256[](length);
        votingPowers = new uint256[](length);
        uniqueVoters = new uint256[](length);
        positionChanges = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            uint256 projectId = rankings[i];
            ProjectParticipation storage participation = projectParticipations[_campaignId][projectId];
            
            projectIds[i] = projectId;
            votingPowers[i] = participation.votingPower;
            uniqueVoters[i] = participation.uniqueVoters;
            positionChanges[i] = participation.positionChange;
        }
        
        return (
            projectIds,
            votingPowers,
            uniqueVoters,
            positionChanges,
            lastRankingUpdate[_campaignId],
            length
        );
    }

    /**
    * @notice Get enhanced voting statistics with position data
    */
    function getEnhancedVotingStatistics(uint256 _campaignId) external view returns (
        uint256 totalVotes,
        uint256 totalVotingPower,
        uint256 uniqueVoters,
        uint256 totalProjects,
        uint256 activeProjects,
        uint256 averageVotingPower,
        uint256 lastUpdate
    ) {
        uint256[] memory rankings = campaignProjectRankings[_campaignId];
        uint256 activeProjectCount = 0;
        uint256 totalProjectVotingPower = 0;
        
        for (uint256 i = 0; i < rankings.length; i++) {
            ProjectParticipation storage participation = projectParticipations[_campaignId][rankings[i]];
            if (participation.approved && participation.votingPower > 0) {
                activeProjectCount++;
                totalProjectVotingPower += participation.votingPower;
            }
        }
        
        uint256 avgVotingPower = activeProjectCount > 0 ? totalProjectVotingPower / activeProjectCount : 0;
        
        return (
            totalVotes,
            totalVotingPower,
            campaignTotalVoters[_campaignId],
            rankings.length,
            activeProjectCount,
            avgVotingPower,
            lastRankingUpdate[_campaignId]
        );
    }

    /**
    * @notice Calculate voting power preview (without casting vote)
    */
    function previewVotingPower(
        uint256 _campaignId,
        uint256 _projectId,
        uint256 _amount
    ) external view returns (
        uint256 votingPower,
        uint256 timeWeight,
        uint256 diversityWeight,
        uint256 breakdown
    ) {
        timeWeight = _calculateTimeWeight(_campaignId);
        diversityWeight = _calculateDiversityWeight(_campaignId, _projectId);
        votingPower = _calculateEnhancedQuadraticVoting(_amount, timeWeight, diversityWeight);
        
        // Breakdown: encode components as single uint256
        // First 16 bits: amount component, next 16: diversity, next 16: time, rest: total
        uint256 amountComponent = (_sqrt(_amount * 1e18) / 1e9 * AMOUNT_WEIGHT) / 10000;
        uint256 diversityComponent = (diversityWeight * DIVERSITY_WEIGHT) / 10000;
        uint256 timeComponent = (timeWeight * TIME_WEIGHT) / 10000;
        
        breakdown = (amountComponent << 48) | (diversityComponent << 32) | (timeComponent << 16) | votingPower;
        
        return (votingPower, timeWeight, diversityWeight, breakdown);
    }

    /**
    * @notice Get user's enhanced vote history with analytics
    */
    function getUserVoteHistoryEnhanced(address _user, uint256 _limit, uint256 _offset) external view returns (
        Vote[] memory votes,
        uint256 totalVotes,
        uint256 totalVotingPower,
        uint256 averageTimeWeight,
        uint256 uniqueCampaigns
    ) {
        Vote[] storage allVotes = userVoteHistory[_user];
        uint256 totalCount = allVotes.length;
        
        if (_offset >= totalCount) {
            return (new Vote[](0), 0, 0, 0, 0);
        }
        
        uint256 endIndex = _offset + _limit;
        if (endIndex > totalCount) {
            endIndex = totalCount;
        }
        
        uint256 returnLength = endIndex - _offset;
        votes = new Vote[](returnLength);
        
        uint256 sumTimeWeights = 0;
        uint256 sumVotingPower = 0;
        uint256 campaignCount = 0;
        
        for (uint256 i = 0; i < returnLength; i++) {
            votes[i] = allVotes[_offset + i];
            if (votes[i].active) {
                sumVotingPower += votes[i].votingPower;
                sumTimeWeights += votes[i].timeWeight;
                
                campaignCount++;
            }
        }
        
        uint256 avgTimeWeight = returnLength > 0 ? sumTimeWeights / returnLength : 0;
        
        return (votes, totalCount, sumVotingPower, avgTimeWeight, campaignCount);
    }

    /**
    * @notice Get project competitor analysis
    */
    function getProjectCompetitorAnalysis(uint256 _campaignId, uint256 _projectId, uint256 _range) external view returns (
        uint256[] memory competitorIds,
        uint256[] memory votingPowerDifferences,
        uint256[] memory positionDifferences,
        uint256 competitiveIndex
    ) {
        ProjectParticipation storage targetProject = projectParticipations[_campaignId][_projectId];
        uint256 targetPosition = targetProject.currentPosition;
        uint256 targetVotingPower = targetProject.votingPower;
        
        if (targetPosition == 0) return (new uint256[](0), new uint256[](0), new uint256[](0), 0);
        
        uint256[] memory rankings = campaignProjectRankings[_campaignId];
        uint256 rangeStart = targetPosition > _range ? targetPosition - _range : 1;
        uint256 rangeEnd = targetPosition + _range;
        if (rangeEnd > rankings.length) rangeEnd = rankings.length;
        
        uint256 competitorCount = 0;
        for (uint256 i = rangeStart; i <= rangeEnd; i++) {
            if (i != targetPosition) competitorCount++;
        }
        
        competitorIds = new uint256[](competitorCount);
        votingPowerDifferences = new uint256[](competitorCount);
        positionDifferences = new uint256[](competitorCount);
        
        uint256 index = 0;
        uint256 totalVotingPowerDiff = 0;
        
        for (uint256 i = rangeStart; i <= rangeEnd; i++) {
            if (i != targetPosition && i <= rankings.length) {
                uint256 competitorId = rankings[i - 1];
                ProjectParticipation storage competitor = projectParticipations[_campaignId][competitorId];
                
                competitorIds[index] = competitorId;
                
                if (competitor.votingPower > targetVotingPower) {
                    votingPowerDifferences[index] = competitor.votingPower - targetVotingPower;
                } else {
                    votingPowerDifferences[index] = targetVotingPower - competitor.votingPower;
                }
                
                if (i > targetPosition) {
                    positionDifferences[index] = i - targetPosition;
                } else {
                    positionDifferences[index] = targetPosition - i;
                }
                
                totalVotingPowerDiff += votingPowerDifferences[index];
                index++;
            }
        }
        
        // Calculate competitive index (0-100, higher = more competitive)
        competitiveIndex = competitorCount > 0 ? (totalVotingPowerDiff * 100) / (targetVotingPower * competitorCount) : 0;
        if (competitiveIndex > 100) competitiveIndex = 100;
        
        return (competitorIds, votingPowerDifferences, positionDifferences, competitiveIndex);
    }

    // ==================== VOTING SESSION MANAGEMENT ====================

    /**
    * @notice Create a voting session with enhanced parameters
    */
    function createVotingSession(
        uint256 _campaignId,
        uint256 _startTime,
        uint256 _endTime,
        VotingScheme _scheme
    ) external whenActive returns (uint256) {
        require(_startTime > block.timestamp, "VotingModule: Start time must be in the future");
        require(_endTime > _startTime, "VotingModule: End time must be after start time");

        uint256 sessionId = nextVotingSessionId++;
        
        VotingSession storage session = votingSessions[sessionId];
        session.id = sessionId;
        session.campaignId = _campaignId;
        session.startTime = _startTime;
        session.endTime = _endTime;
        session.active = true;
        session.scheme = _scheme;

        activeVotingSessions++;

        emit VotingSessionCreated(sessionId, _campaignId, _startTime, _endTime);
        
        return sessionId;
    }

    /**
    * @notice End a voting session
    */
    function endVotingSession(uint256 _sessionId) external whenActive {
        VotingSession storage session = votingSessions[_sessionId];
        require(session.active, "VotingModule: Session is not active");
        require(block.timestamp >= session.endTime, "VotingModule: Session has not ended yet");

        session.active = false;
        activeVotingSessions--;

        emit VotingSessionEnded(_sessionId, session.campaignId);
    }

    /**
    * @notice Remove a vote (enhanced)
    */
    function removeVote(
        uint256 _campaignId,
        uint256 _projectId,
        address _token
    ) external whenActive {
        Vote storage vote = userVotes[_campaignId][msg.sender][_projectId][_token];
        require(vote.active, "VotingModule: No active vote found");

        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];

        // Update totals
        totalUserVotesInCampaign[_campaignId][msg.sender] -= vote.amount;
        participation.voteCount -= vote.amount;
        participation.votingPower -= vote.votingPower;
        participation.tokenVotes[_token] -= vote.amount;
        totalVotes -= vote.amount;
        totalVotingPower -= vote.votingPower;
        lastProjectUpdateTs[_campaignId][_projectId] = block.timestamp;

        // Mark vote as inactive
        vote.active = false;

        // Update project positions
        _updateProjectPositions(_campaignId);

        emit VoteRemoved(msg.sender, _campaignId, _projectId);
        emit ProjectTotalsUpdated(
            _campaignId,
            _projectId,
            participation.voteCount,
            participation.votingPower,
            totalVotes,
            totalVotingPower,
            block.timestamp
        );
    }

    // ==================== V4 MIGRATION FUNCTIONS ====================

    /**
    * @notice Create project participation from V4 migration
    */
    function createProjectParticipationFromV4(
        uint256 _campaignId,
        uint256 _projectId,
        bool _approved,
        uint256 _voteCount,
        uint256 _fundsReceived
    ) external {
        // Check if caller has admin role through proxy
        require(_isAdmin(msg.sender), "VotingModule: Admin role required");
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        participation.projectId = _projectId;
        participation.campaignId = _campaignId;
        participation.approved = _approved;
        participation.voteCount = _voteCount;
        participation.fundsReceived = _fundsReceived;
        participation.currentPosition = 0;
        participation.previousPosition = 0;
        participation.positionChange = 0;

        // Add to campaign rankings for position tracking
        campaignProjectRankings[_campaignId].push(_projectId);
        
        // Initialize position tracking
        ProjectPosition storage position = projectPositions[_campaignId][_projectId];
        position.projectId = _projectId;
        position.position = campaignProjectRankings[_campaignId].length;
        position.votingPower = 0;
        position.percentageChange = 0;
        position.isRising = false;
        position.lastUpdate = block.timestamp;

        if (_approved) {
            emit ProjectApproved(_campaignId, _projectId, msg.sender);
        }
    }

    /**
    * @notice Add vote from V4 migration (enhanced)
    */
    function addVoteFromV4(
        address _voter,
        uint256 _campaignId,
        uint256 _projectId,
        address _token,
        uint256 _amount,
        uint256 _celoEquivalent,
        uint256 _timestamp
    ) external {
        // Check if caller has admin role through proxy
        require(_isAdmin(msg.sender), "VotingModule: Admin role required");
        // Calculate voting power using current enhanced formula
        uint256 timeWeight = 1000; // Default weight for migrated votes
        uint256 diversityWeight = 1000; // Default weight for migrated votes
        uint256 votingPower = _calculateEnhancedQuadraticVoting(_amount, timeWeight, diversityWeight);
        
        // Create vote struct
        Vote memory newVote = Vote({
            voter: _voter,
            campaignId: _campaignId,
            projectId: _projectId,
            token: _token,
            amount: _amount,
            votingPower: votingPower,
            celoEquivalent: _celoEquivalent,
            timestamp: _timestamp > 0 ? _timestamp : block.timestamp,
            timeWeight: timeWeight,
            diversityBonus: diversityWeight,
            active: true
        });

        // Add to user vote history
        userVoteHistory[_voter].push(newVote);

        // Update vote mapping
        userVotes[_campaignId][_voter][_projectId][_token] = newVote;

        // Update totals
        totalUserVotesInCampaign[_campaignId][_voter] += _celoEquivalent;
        projectParticipations[_campaignId][_projectId].voteCount += _amount;
        projectParticipations[_campaignId][_projectId].votingPower += votingPower;

        // Add to campaign voters if not already present
        if (!campaignVoterParticipated[_campaignId][_voter]) {
            campaignVoterParticipated[_campaignId][_voter] = true;
            campaignVoters[_campaignId].push(_voter);
            campaignTotalVoters[_campaignId]++;
        }

        emit VoteCast(_voter, _campaignId, _projectId, _token, _amount, votingPower);
    }

    // ==================== INTERNAL HELPER FUNCTIONS ====================

    function _validateVotingConditions(uint256 _campaignId, uint256 _projectId) internal {
        // Validate campaign timing and status
        bytes memory campaignData = callModule("campaigns", abi.encodeWithSignature("getCampaign(uint256)", _campaignId));
        require(campaignData.length > 0, "VotingModule: Campaign not found");

        // Validate project participation and approval
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        require(participation.projectId != 0, "VotingModule: Project not in campaign");
        require(participation.approved, "VotingModule: Project not approved");
    }

    function _checkProjectAdditionPermission(uint256 _campaignId, uint256 _projectId, address _user) internal returns (bool) {
        // Check if user is project owner
        bytes memory projectData = callModule("projects", abi.encodeWithSignature("getProject(uint256)", _projectId));
        if (projectData.length > 0) {
            (,address owner,,,,,) = abi.decode(projectData, (uint256,address,string,string,bool,bool,uint256));
            if (owner == _user) return true;
        }

        // Check if user is campaign admin
        bytes memory isAdminData = callModule("campaigns", abi.encodeWithSignature("isCampaignAdmin(uint256,address)", _campaignId, _user));
        if (isAdminData.length > 0) {
            bool isAdmin = abi.decode(isAdminData, (bool));
            if (isAdmin) return true;
        }

        // Check if user has admin role through proxy
        return _isAdmin(_user);
    }

    function _checkVoteLimits(uint256 _campaignId, uint256 _celoEquivalent) internal {
        // Get campaign vote limits
        bytes memory campaignData = callModule("campaigns", abi.encodeWithSignature("getCampaignEnhancedInfo(uint256)", _campaignId));
        // Basic validation
        require(_celoEquivalent >= 0.01 ether, "VotingModule: Vote amount too small");

        // Check user-specific max vote amount
        bytes memory userMaxData = callModule("campaigns", abi.encodeWithSignature("getUserMaxVoteAmount(uint256,address)", _campaignId, msg.sender));
        uint256 userMaxVoteAmount = abi.decode(userMaxData, (uint256));

        if (userMaxVoteAmount > 0) {
            uint256 currentUserVotes = totalUserVotesInCampaign[_campaignId][msg.sender];
            require(currentUserVotes + _celoEquivalent <= userMaxVoteAmount, "VotingModule: Exceeds user max vote amount");
        }
    }

    function _updateVoterReputation(address _voter, uint256 _campaignId) internal {
        VoterReputation storage reputation = voterReputations[_voter];
        
        if (!reputation.votedInCampaigns[_campaignId]) {
            reputation.totalVotes++;
            reputation.votedInCampaigns[_campaignId] = true;
        }
        
        reputation.lastVoteTime = block.timestamp;
        reputation.consecutiveVotes++;
        
        // Enhanced reputation calculation with early voter bonus
        uint256 timeWeight = _calculateTimeWeight(_campaignId);
        if (timeWeight > 1200) { // Early voter bonus threshold
            reputation.earlyVoterBonus += 5;
        }
        
        reputation.reputationScore = reputation.totalVotes * 10 + reputation.consecutiveVotes * 5 + reputation.earlyVoterBonus;

        emit VoterReputationUpdated(_voter, reputation.reputationScore);
    }

    /**
    * @notice Improved square root function with better precision
    */
    function _sqrt(uint256 _x) internal pure returns (uint256) {
        if (_x == 0) return 0;
        if (_x <= 3) return 1;
        
        // Use Newton's method for better precision
        uint256 z = (_x + 1) / 2;
        uint256 y = _x;
        
        while (z < y) {
            y = z;
            z = (_x / z + z) / 2;
        }
        
        return y;
    }

    /**
    * @notice Set voting token status
    */
    function setVotingToken(address _token, bool _enabled) external {
        // Check if caller has admin role through proxy
        require(_isAdmin(msg.sender), "VotingModule: Admin role required");
        votingTokens[_token] = _enabled;
    }

    /**
    * @notice Force update project positions (admin only)
    */
    function forceUpdateProjectPositions(uint256 _campaignId) external {
        // Check if caller has admin role through proxy
        require(_isAdmin(msg.sender), "VotingModule: Admin role required");
        _updateProjectPositions(_campaignId);
    }

    /**
    * @notice Get campaign project count
    */
    function getCampaignProjectCount(uint256 _campaignId) external view returns (uint256) {
        return campaignProjectRankings[_campaignId].length;
    }

    /**
    * @notice Check if project is in campaign
    */
    function isProjectInCampaign(uint256 _campaignId, uint256 _projectId) external view returns (bool) {
        return projectParticipations[_campaignId][_projectId].projectId != 0;
    }
    // (keep contract open for cross-module helpers below)
    // ==================== CROSS-MODULE / MIGRATION SUPPORT (ADDED) ====================

    /**
    * @notice Initialize participation for a project in a campaign (admin-only, fee-free)
    */
    function initializeParticipation(uint256 _campaignId, uint256 _projectId) external whenActive {
        // Check if caller has admin role through proxy
        require(_isAdmin(msg.sender), "VotingModule: Admin role required");
        _initializeParticipation(_campaignId, _projectId);
    }

    function _initializeParticipation(uint256 _campaignId, uint256 _projectId) internal {
        require(projectParticipations[_campaignId][_projectId].projectId == 0, "VotingModule: Already initialized");

        // Verify campaign exists
        bytes memory campaignData = callModule("campaigns", abi.encodeWithSignature("getCampaign(uint256)", _campaignId));
        require(campaignData.length > 0, "VotingModule: Campaign not found");

        // Verify project exists
        bytes memory projectData = callModule("projects", abi.encodeWithSignature("getProject(uint256)", _projectId));
        require(projectData.length > 0, "VotingModule: Project not found");

        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        participation.projectId = _projectId;
        participation.campaignId = _campaignId;
        participation.approved = false;
        participation.voteCount = 0;
        participation.votingPower = 0;
        participation.fundsReceived = 0;
        participation.uniqueVoters = 0;
        participation.currentPosition = 0;
        participation.previousPosition = 0;
        participation.positionChange = 0;
        participation.lastPositionUpdate = block.timestamp;

        // Rankings
        campaignProjectRankings[_campaignId].push(_projectId);
        ProjectPosition storage position = projectPositions[_campaignId][_projectId];
        position.projectId = _projectId;
        position.position = campaignProjectRankings[_campaignId].length;
        position.votingPower = 0;
        position.percentageChange = 0;
        position.isRising = false;
        position.lastUpdate = block.timestamp;
    }

    /**
    * @notice Remove all votes for a project in a campaign (super admin only)
    */
    function removeAllProjectVotes(uint256 _campaignId, uint256 _projectId) external whenActive {
        // Check if caller has admin role through proxy
        require(_isAdmin(msg.sender), "VotingModule: Admin role required");
        require(projectParticipations[_campaignId][_projectId].projectId != 0, "VotingModule: Project not in campaign");

        // Reset counts
        uint256 previousVotes = projectParticipations[_campaignId][_projectId].voteCount;
        uint256 previousPower = projectParticipations[_campaignId][_projectId].votingPower;

        projectParticipations[_campaignId][_projectId].voteCount = 0;
        projectParticipations[_campaignId][_projectId].votingPower = 0;

        // Update aggregates if needed
        if (projectVoteCount[_campaignId][_projectId] >= previousVotes) {
            projectVoteCount[_campaignId][_projectId] -= previousVotes;
        } else {
            projectVoteCount[_campaignId][_projectId] = 0;
        }
        if (projectVotingPower[_campaignId][_projectId] >= previousPower) {
            projectVotingPower[_campaignId][_projectId] -= previousPower;
        } else {
            projectVotingPower[_campaignId][_projectId] = 0;
        }

        // Update position tracking
        _updateProjectPositions(_campaignId);
    }

    /**
    * @notice Return quadratic distribution factors for campaign and set of projects
    */
    function getQuadraticFactorsForCampaign(
        uint256 _campaignId,
        uint256[] memory _projectIds
    ) external view returns (uint256[] memory voteCounts, uint256[] memory voterDiversity, uint256[] memory tokenDiversity) {
        voteCounts = new uint256[](_projectIds.length);
        voterDiversity = new uint256[](_projectIds.length);
        tokenDiversity = new uint256[](_projectIds.length);

        // Get allowed tokens list from campaigns module
        bytes memory info = callModuleView("campaigns", abi.encodeWithSignature("getCampaignEnhancedInfo(uint256)", _campaignId));
        // (CampaignType type, bool isERC20, address[] allowedTokens, uint256[] tokenWeights, address feeToken, uint256 feeAmount)
        (,, address[] memory allowedTokens,,,) = abi.decode(info, (uint256, bool, address[], uint256[], address, uint256));

        for (uint256 i = 0; i < _projectIds.length; i++) {
            uint256 pid = _projectIds[i];
            voteCounts[i] = projectVoteCount[_campaignId][pid];
            voterDiversity[i] = projectUniqueVoters[_campaignId][pid];

            // Count tokens with non-zero votes
            uint256 tokenCount = 0;
            for (uint256 t = 0; t < allowedTokens.length; t++) {
                if (projectParticipations[_campaignId][pid].tokenVotes[allowedTokens[t]] > 0) {
                    tokenCount++;
                }
            }
            tokenDiversity[i] = tokenCount;
        }

        return (voteCounts, voterDiversity, tokenDiversity);
    }

    /**
    * @notice Set project participation from V4 migration (admin-only, fee-free)
    */
    function setProjectParticipationFromV4Migration(
    uint256 _campaignId,
    uint256 _projectId,
    bool _approved,
    uint256 _voteCount,
    uint256 _tokenAmount
) external whenActive {
        // Check if caller has admin role through proxy
        require(_isAdmin(msg.sender), "VotingModule: Admin role required");
        // Initialize if missing
        if (projectParticipations[_campaignId][_projectId].projectId == 0) {
            _initializeParticipation(_campaignId, _projectId);
        }
        ProjectParticipation storage p = projectParticipations[_campaignId][_projectId];
        p.approved = _approved;
        p.voteCount = _voteCount;
        p.votingPower = _tokenAmount; // treat as aggregated power when migrating

        projectVoteCount[_campaignId][_projectId] = _voteCount;
        projectVotingPower[_campaignId][_projectId] = _tokenAmount;

        _updateProjectPositions(_campaignId);
    }

    /**
    * @notice Migrate aggregated vote amount for a specific token (no fees)
    */
    function migrateAggregatedVoteFromV4(
    uint256 _campaignId,
    uint256 _projectId,
    address _token,
    uint256 _amount
) external whenActive {
        // Check if caller has admin role through proxy
        require(_isAdmin(msg.sender), "VotingModule: Admin role required");
        require(projectParticipations[_campaignId][_projectId].projectId != 0, "VotingModule: Not initialized");
        projectParticipations[_campaignId][_projectId].tokenVotes[_token] += _amount;
    }

}