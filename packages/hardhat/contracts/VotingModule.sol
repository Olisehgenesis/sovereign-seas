// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Interface for main contract communication
interface ISovereignSeasV5 {
    function hasModuleAccess(address _user, bytes32 _role) external view returns (bool);
    function callModule(string memory _moduleName, bytes memory _data) external returns (bytes memory);
}

// Vote struct
struct Vote {
    address voter;
    uint256 campaignId;
    uint256 projectId;
    address token;
    uint256 amount;
    uint256 celoEquivalent;
    uint256 timestamp;
}

// Project Participation struct for V4 compatibility
struct ProjectParticipation {
    uint256 projectId;
    uint256 campaignId;
    bool approved;
    uint256 voteCount;
    uint256 fundsReceived;
    mapping(address => uint256) tokenVotes;
}

/**
 * @title VotingModule - SovereignSeasV5 Voting and Participation Management
 * @dev Handles all voting operations, project participation, and V4 compatibility
 */
contract VotingModule is Initializable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;
    
    // State variables
    ISovereignSeasV5 public mainContract;
    
    // V4 compatibility mappings
    mapping(uint256 => mapping(uint256 => ProjectParticipation)) public projectParticipations;
    mapping(uint256 => mapping(address => mapping(uint256 => mapping(address => uint256)))) public userVotes;
    mapping(uint256 => mapping(address => uint256)) public totalUserVotesInCampaign;
    mapping(address => Vote[]) public userVoteHistory;
    
    // Enhanced voting features
    mapping(address => bool) public votingTokens;
    mapping(uint256 => mapping(address => bool)) public campaignVoterParticipated;
    mapping(uint256 => address[]) public campaignVoters;
    mapping(uint256 => uint256) public campaignTotalVoters;
    
    // Voting settings
    mapping(address => uint256) public voterReputation;
    mapping(uint256 => mapping(address => uint256)) public voterWeight;
    
    // Constants
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    
    // Events
    event VoteCast(address indexed voter, uint256 indexed campaignId, uint256 indexed projectId, address token, uint256 amount, uint256 celoEquivalent);
    event ProjectAddedToCampaign(uint256 indexed campaignId, uint256 indexed projectId);
    event ProjectRemovedFromCampaign(uint256 indexed campaignId, uint256 indexed projectId);
    event ProjectApproved(uint256 indexed campaignId, uint256 indexed projectId);
    event VoterReputationUpdated(address indexed voter, uint256 oldReputation, uint256 newReputation);
    event VoterWeightSet(uint256 indexed campaignId, address indexed voter, uint256 weight);

    // Modifiers
    modifier onlyMainContract() {
        require(msg.sender == address(mainContract), "VotingModule: Only main contract can call");
        _;
    }
    
    modifier hasRole(bytes32 role) {
        require(mainContract.hasModuleAccess(msg.sender, role), "VotingModule: Access denied");
        _;
    }
    
    modifier campaignExists(uint256 _campaignId) {
        // Verify campaign exists through campaigns module
        bytes memory campaignData = mainContract.callModule("campaigns", abi.encodeWithSignature("getCampaign(uint256)", _campaignId));
        (uint256 id, , , , , , , , , , , , ) = abi.decode(campaignData, (uint256, address, string, string, uint256, uint256, uint256, uint256, bool, bool, address, bool, uint256));
        require(id != 0, "VotingModule: Campaign does not exist");
        _;
    }
    
    modifier projectExists(uint256 _projectId) {
        // Verify project exists through projects module
        bytes memory projectData = mainContract.callModule("projects", abi.encodeWithSignature("getProject(uint256)", _projectId));
        (uint256 id, , , , , , , ) = abi.decode(projectData, (uint256, address, string, string, bool, bool, uint256, uint256[]));
        require(id != 0, "VotingModule: Project does not exist");
        _;
    }

    function initialize(address _main) external initializer {
        __ReentrancyGuard_init();
        mainContract = ISovereignSeasV5(_main);
    }

    // Voting Token Management
    function setVotingToken(address _token, bool _enabled) external hasRole(ADMIN_ROLE) {
        votingTokens[_token] = _enabled;
    }
    


    // Project Participation Management
    function addProjectToCampaign(
        uint256 _campaignId,
        uint256 _projectId,
        address _feeToken
    ) external payable nonReentrant campaignExists(_campaignId) projectExists(_projectId) {
        
        // Verify campaign is active and project is active
        bytes memory campaignData = mainContract.callModule("campaigns", abi.encodeWithSignature("getCampaign(uint256)", _campaignId));
        (, , , , , uint256 endTime, , , , , , bool active, ) = abi.decode(campaignData, (uint256, address, string, string, uint256, uint256, uint256, uint256, bool, bool, address, bool, uint256));
        require(active && block.timestamp < endTime, "VotingModule: Campaign not active or ended");
        
        bytes memory projectData = mainContract.callModule("projects", abi.encodeWithSignature("getProject(uint256)", _projectId));
        (, address owner, , , , bool projectActive, , ) = abi.decode(projectData, (uint256, address, string, string, bool, bool, uint256, uint256[]));
        require(projectActive, "VotingModule: Project not active");
        
        // Check permissions
        bool isAuthorized = msg.sender == owner;
        if (!isAuthorized) {
            bytes memory isCampaignAdminData = mainContract.callModule("campaigns", abi.encodeWithSignature("isCampaignAdmin(uint256,address)", _campaignId, msg.sender));
            isAuthorized = abi.decode(isCampaignAdminData, (bool));
        }
        if (!isAuthorized) {
            isAuthorized = mainContract.hasModuleAccess(msg.sender, ADMIN_ROLE);
        }
        require(isAuthorized, "VotingModule: Not authorized to add project to campaign");
        
        // Check if already participating
        require(projectParticipations[_campaignId][_projectId].projectId == 0, "VotingModule: Project already in campaign");
        
        // Validate and collect fee
        bytes memory feeData = mainContract.callModule("treasury", abi.encodeWithSignature("getFeeStructure()"));
        (, , uint256 projectAdditionFee, , ) = abi.decode(feeData, (uint256, uint256, uint256, uint256, bool));
        
        mainContract.callModule("treasury", abi.encodeWithSignature("validateAndCollectFee(address,uint256,string,uint256,address)", _feeToken, projectAdditionFee, "projectAddition", _campaignId, msg.sender));
        
        // Add project to campaign
        mainContract.callModule("projects", abi.encodeWithSignature("addProjectToCampaign(uint256,uint256)", _projectId, _campaignId));
        
        // Initialize participation
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        participation.projectId = _projectId;
        participation.campaignId = _campaignId;
        participation.approved = false;
        participation.voteCount = 0;
        participation.fundsReceived = 0;
        
        emit ProjectAddedToCampaign(_campaignId, _projectId);
    }
    
    function removeProjectFromCampaign(uint256 _campaignId, uint256 _projectId) external campaignExists(_campaignId) projectExists(_projectId) {
        
        // Check permissions
        bytes memory projectData = mainContract.callModule("projects", abi.encodeWithSignature("getProject(uint256)", _projectId));
        (, address owner, , , , , , ) = abi.decode(projectData, (uint256, address, string, string, bool, bool, uint256, uint256[]
        ));
        
        bool isAuthorized = msg.sender == owner;
        if (!isAuthorized) {
            bytes memory isCampaignAdminData = mainContract.callModule("campaigns", abi.encodeWithSignature("isCampaignAdmin(uint256,address)", _campaignId, msg.sender));
            isAuthorized = abi.decode(isCampaignAdminData, (bool));
        }
        if (!isAuthorized) {
            isAuthorized = mainContract.hasModuleAccess(msg.sender, ADMIN_ROLE);
        }
        require(isAuthorized, "VotingModule: Not authorized to remove project from campaign");
        
        // Check if project has votes
        require(projectParticipations[_campaignId][_projectId].voteCount == 0, "VotingModule: Project has votes, cannot remove");
        
        // Remove from projects module
        mainContract.callModule("projects", abi.encodeWithSignature("removeProjectFromCampaign(uint256,uint256)", _projectId, _campaignId));
        
        // Clean up participation data
        delete projectParticipations[_campaignId][_projectId];
        
        emit ProjectRemovedFromCampaign(_campaignId, _projectId);
    }
    
    function approveProject(uint256 _campaignId, uint256 _projectId) external campaignExists(_campaignId) {
        // Check if sender is campaign admin
        bytes memory isCampaignAdminData = mainContract.callModule("campaigns", abi.encodeWithSignature("isCampaignAdmin(uint256,address)", _campaignId, msg.sender));
        bool isCampaignAdmin = abi.decode(isCampaignAdminData, (bool));
        require(isCampaignAdmin, "VotingModule: Only campaign admin can approve projects");
        
        // Check if project is in campaign
        require(projectParticipations[_campaignId][_projectId].projectId != 0, "VotingModule: Project not in campaign");
        require(!projectParticipations[_campaignId][_projectId].approved, "VotingModule: Project already approved");
        
        projectParticipations[_campaignId][_projectId].approved = true;
        
        emit ProjectApproved(_campaignId, _projectId);
    }

    // Voting Functions
    function vote(
        uint256 _campaignId,
        uint256 _projectId,
        address _token,
        uint256 _amount
    ) external payable nonReentrant campaignExists(_campaignId) projectExists(_projectId) {
        require(_token != address(0), "VotingModule: Use voteWithCelo for CELO voting");
        _voteWithToken(_campaignId, _projectId, _token, _amount);
    }
    
    function voteWithCelo(
        uint256 _campaignId,
        uint256 _projectId
    ) external payable nonReentrant campaignExists(_campaignId) projectExists(_projectId) {
        require(msg.value > 0, "VotingModule: Must send CELO to vote");
        _voteWithCelo(_campaignId, _projectId, msg.value);
    }

    function _voteWithToken(
        uint256 _campaignId,
        uint256 _projectId,
        address _token,
        uint256 _amount
    ) internal {
        // Validate campaign timing and status
        bytes memory campaignData = mainContract.callModule("campaigns", abi.encodeWithSignature("getCampaign(uint256)", _campaignId));
        (, , , , uint256 startTime, uint256 endTime, , , , , , bool active, ) = abi.decode(campaignData, (uint256, address, string, string, uint256, uint256, uint256, uint256, bool, bool, address, bool, uint256));
        
        require(active, "VotingModule: Campaign not active");
        require(block.timestamp >= startTime && block.timestamp <= endTime, "VotingModule: Campaign not in voting period");
        
        // Validate project participation and approval
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        require(participation.projectId != 0, "VotingModule: Project not in campaign");
        require(participation.approved, "VotingModule: Project not approved");
        
        // Validate token and amount
        require(votingTokens[_token], "VotingModule: Token not enabled for voting");
        require(_amount > 0, "VotingModule: Invalid vote amount");
        
        // Get CELO equivalent through treasury
        bytes memory celoEquivData = mainContract.callModule("treasury", abi.encodeWithSignature("getTokenToCeloEquivalent(address,uint256)", _token, _amount));
        uint256 celoEquivalent = abi.decode(celoEquivData, (uint256));
        
        // Check vote limits
        _checkVoteLimits(_campaignId, celoEquivalent);
        
        // Transfer tokens to main contract
        IERC20(_token).safeTransferFrom(msg.sender, address(mainContract), _amount);
        
        // Update vote data
        _updateVoteData(_campaignId, _projectId, _token, _amount, celoEquivalent);
        
        // Update campaign funding
        mainContract.callModule("campaigns", abi.encodeWithSignature("fundCampaign(uint256,address,uint256)", _campaignId, _token, _amount));
    }
    
    function _voteWithCelo(
        uint256 _campaignId,
        uint256 _projectId,
        uint256 _amount
    ) internal {
        // Validate campaign timing and status
        bytes memory campaignData = mainContract.callModule("campaigns", abi.encodeWithSignature("getCampaign(uint256)", _campaignId));
        (, , , , uint256 startTime, uint256 endTime, , , , , address payoutToken, bool active, ) = abi.decode(campaignData, (uint256, address, string, string, uint256, uint256, uint256, uint256, bool, bool, address, bool, uint256));
        
        require(active, "VotingModule: Campaign not active");
        require(block.timestamp >= startTime && block.timestamp <= endTime, "VotingModule: Campaign not in voting period");
        
        // Validate project participation and approval
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        require(participation.projectId != 0, "VotingModule: Project not in campaign");
        require(participation.approved, "VotingModule: Project not approved");
        
        // Get CELO token address from treasury
        bytes memory supportedTokensData = mainContract.callModule("treasury", abi.encodeWithSignature("getSupportedTokens()"));
        address[] memory supportedTokens = abi.decode(supportedTokensData, (address[]));
        address celoToken = supportedTokens[0]; // Assume first token is CELO
        
        require(votingTokens[celoToken], "VotingModule: CELO not enabled for voting");
        
        uint256 celoEquivalent = _amount; // CELO is 1:1 with itself
        
        // Check vote limits
        _checkVoteLimits(_campaignId, celoEquivalent);
        
        // Transfer CELO to main contract
        payable(address(mainContract)).transfer(_amount);
        
        // Update vote data
        _updateVoteData(_campaignId, _projectId, celoToken, _amount, celoEquivalent);
        
        // Update campaign funding
        mainContract.callModule("campaigns", abi.encodeWithSignature("fundCampaign(uint256,address,uint256)", _campaignId, celoToken, _amount));
    }
    
    function _checkVoteLimits(uint256 _campaignId, uint256 _celoEquivalent) internal {
        
        // Check campaign vote limits
        bytes memory campaignEnhancedData = mainContract.callModule("campaigns", abi.encodeWithSignature("getCampaignEnhancedInfo(uint256)", _campaignId));
        (, , , , , , , uint256 minimumVoteAmount, uint256 maximumVoteAmount, ) = abi.decode(campaignEnhancedData, (uint8, string, string, string[], uint256, uint256, bool, uint256, uint256, uint256));
        
        require(_celoEquivalent >= minimumVoteAmount, "VotingModule: Vote amount below minimum");
        require(_celoEquivalent <= maximumVoteAmount, "VotingModule: Vote amount above maximum");
        
        // Check user-specific max vote amount
        bytes memory userMaxData = mainContract.callModule("campaigns", abi.encodeWithSignature("getUserMaxVoteAmount(uint256,address)", _campaignId, msg.sender));
        uint256 userMaxVoteAmount = abi.decode(userMaxData, (uint256));
        
        if (userMaxVoteAmount > 0) {
            uint256 currentUserVotes = totalUserVotesInCampaign[_campaignId][msg.sender];
            require(currentUserVotes + _celoEquivalent <= userMaxVoteAmount, "VotingModule: Exceeds user max vote amount");
        }
    }
    
    function _updateVoteData(
        uint256 _campaignId,
        uint256 _projectId,
        address _token,
        uint256 _amount,
        uint256 _celoEquivalent
    ) internal {
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        
        // Update user votes mapping
        userVotes[_campaignId][msg.sender][_projectId][_token] += _amount;
        totalUserVotesInCampaign[_campaignId][msg.sender] += _celoEquivalent;
        
        // Update participation data
        participation.voteCount += _celoEquivalent;
        participation.tokenVotes[_token] += _amount;
        
        // Track voter participation
        if (!campaignVoterParticipated[_campaignId][msg.sender]) {
            campaignVoterParticipated[_campaignId][msg.sender] = true;
            campaignVoters[_campaignId].push(msg.sender);
            campaignTotalVoters[_campaignId]++;
        }
        
        // Update voter reputation
        voterReputation[msg.sender] += _celoEquivalent / 1e18; // 1 point per CELO equivalent
        
        // Create vote record
        userVoteHistory[msg.sender].push(Vote({
            voter: msg.sender,
            campaignId: _campaignId,
            projectId: _projectId,
            token: _token,
            amount: _amount,
            celoEquivalent: _celoEquivalent,
            timestamp: block.timestamp
        }));
        
        // Update project stats
        mainContract.callModule("projects", abi.encodeWithSignature("updateProjectStats(uint256,uint256,uint256)", _projectId, 0, _celoEquivalent));
        
        emit VoteCast(msg.sender, _campaignId, _projectId, _token, _amount, _celoEquivalent);
    }

    // Reputation and Weight Management
    function setVoterWeight(uint256 _campaignId, address _voter, uint256 _weight) external hasRole(ADMIN_ROLE) {
        voterWeight[_campaignId][_voter] = _weight;
        emit VoterWeightSet(_campaignId, _voter, _weight);
    }
    
    function updateVoterReputation(address _voter, uint256 _newReputation) external hasRole(ADMIN_ROLE) {
        uint256 oldReputation = voterReputation[_voter];
        voterReputation[_voter] = _newReputation;
        emit VoterReputationUpdated(_voter, oldReputation, _newReputation);
    }

    // View Functions
    function getParticipation(uint256 _campaignId, uint256 _projectId) external view returns (
        bool approved,
        uint256 voteCount,
        uint256 fundsReceived
    ) {
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        return (participation.approved, participation.voteCount, participation.fundsReceived);
    }
    
    /**
     * @dev Get participation with pool status from PoolsModule
     */
    function getParticipationWithPoolStatus(uint256 _campaignId, uint256 _projectId) external returns (
        bool approved,
        uint256 voteCount,
        uint256 fundsReceived,
        bool hasPool,
        uint256 poolTotalFunded,
        uint256 poolTotalClaimed
    ) {
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        
        // Get pool status from PoolsModule
        bool hasPool = false;
        uint256 poolTotalFunded = 0;
        uint256 poolTotalClaimed = 0;
        
        try mainContract.callModule("pools", abi.encodeWithSignature("getProjectPoolStatus(uint256)", _projectId)) returns (bytes memory poolData) {
            (bool exists, uint256 funded, uint256 claimed, , , ) = abi.decode(poolData, (bool, uint256, uint256, bool, uint256, uint256));
            hasPool = exists;
            poolTotalFunded = funded;
            poolTotalClaimed = claimed;
        } catch {
            // Pool data not available
        }
        
        return (
            participation.approved,
            participation.voteCount,
            participation.fundsReceived,
            hasPool,
            poolTotalFunded,
            poolTotalClaimed
        );
    }
    
    function getUserVotesForProjectWithToken(
        uint256 _campaignId,
        address _user,
        uint256 _projectId,
        address _token
    ) external view returns (uint256) {
        return userVotes[_campaignId][_user][_projectId][_token];
    }
    
    function getUserTotalVotesInCampaign(uint256 _campaignId, address _user) external view returns (uint256) {
        return totalUserVotesInCampaign[_campaignId][_user];
    }
    
    function getProjectTokenVotes(uint256 _campaignId, uint256 _projectId, address _token) external view returns (uint256) {
        return projectParticipations[_campaignId][_projectId].tokenVotes[_token];
    }
    
    function getUserVoteHistory(address _user) external view returns (Vote[] memory) {
        return userVoteHistory[_user];
    }
    
    function getCampaignVoters(uint256 _campaignId) external view returns (address[] memory) {
        return campaignVoters[_campaignId];
    }
    
    function getCampaignTotalVoters(uint256 _campaignId) external view returns (uint256) {
        return campaignTotalVoters[_campaignId];
    }
    
    function getVoterReputation(address _voter) external view returns (uint256) {
        return voterReputation[_voter];
    }
    
    function getVoterWeight(uint256 _campaignId, address _voter) external view returns (uint256) {
        return voterWeight[_campaignId][_voter];
    }

    // Project sorting and analytics
    function getSortedProjects(uint256 _campaignId) external returns (uint256[] memory) {
        return _getSortedProjectIdsByCampaign(_campaignId);
    }
    
    function getProjectIdsByCampaign(uint256 _campaignId) external returns (uint256[] memory) {
        // Get all project IDs from projects module
        bytes memory allProjectsData = mainContract.callModule("projects", abi.encodeWithSignature("getAllProjectIds()"));
        uint256[] memory allProjectIds = abi.decode(allProjectsData, (uint256[]));
        
        uint256 count = 0;
        for (uint256 i = 0; i < allProjectIds.length; i++) {
            if (projectParticipations[_campaignId][allProjectIds[i]].projectId != 0) {
                count++;
            }
        }
        
        uint256[] memory campaignProjectIds = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < allProjectIds.length; i++) {
            if (projectParticipations[_campaignId][allProjectIds[i]].projectId != 0) {
                campaignProjectIds[index++] = allProjectIds[i];
            }
        }
        
        return campaignProjectIds;
    }
    
    function getProjectVotedTokensWithAmounts(
        uint256 _campaignId,
        uint256 _projectId
    ) external returns (address[] memory tokens, uint256[] memory amounts) {
        // Get campaign voted tokens
        bytes memory campaignTokensData = mainContract.callModule("campaigns", abi.encodeWithSignature("getCampaignVotedTokens(uint256)", _campaignId));
        address[] memory campaignTokens = abi.decode(campaignTokensData, (address[]));
        
        uint256 count = 0;
        for (uint256 i = 0; i < campaignTokens.length; i++) {
            if (projectParticipations[_campaignId][_projectId].tokenVotes[campaignTokens[i]] > 0) {
                count++;
            }
        }
        
        tokens = new address[](count);
        amounts = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < campaignTokens.length; i++) {
            address token = campaignTokens[i];
            uint256 amount = projectParticipations[_campaignId][_projectId].tokenVotes[token];
            if (amount > 0) {
                tokens[index] = token;
                amounts[index] = amount;
                index++;
            }
        }
        
        return (tokens, amounts);
    }

    // Internal helper functions
    function _getSortedProjectIdsByCampaign(uint256 _campaignId) internal returns (uint256[] memory) {
        uint256[] memory campaignProjectIds = _getProjectIdsByCampaignInternal(_campaignId);
        
        // Filter for approved projects only
        uint256 approvedCount = 0;
        for (uint256 i = 0; i < campaignProjectIds.length; i++) {
            if (projectParticipations[_campaignId][campaignProjectIds[i]].approved) {
                approvedCount++;
            }
        }
        
        uint256[] memory approvedProjects = new uint256[](approvedCount);
        uint256 index = 0;
        for (uint256 i = 0; i < campaignProjectIds.length; i++) {
            if (projectParticipations[_campaignId][campaignProjectIds[i]].approved) {
                approvedProjects[index++] = campaignProjectIds[i];
            }
        }
        
        return approvedProjects;
    }
    
    // Get project IDs by campaign (internal version)
    function _getProjectIdsByCampaignInternal(uint256 _campaignId) internal returns (uint256[] memory) {
        // Get all project IDs from projects module
        bytes memory allProjectsData = mainContract.callModule("projects", abi.encodeWithSignature("getAllProjectIds()"));
        uint256[] memory allProjectIds = abi.decode(allProjectsData, (uint256[]));
        
        uint256 count = 0;
        for (uint256 i = 0; i < allProjectIds.length; i++) {
            if (projectParticipations[_campaignId][allProjectIds[i]].projectId != 0) {
                count++;
            }
        }
        
        uint256[] memory campaignProjectIds = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < allProjectIds.length; i++) {
            if (projectParticipations[_campaignId][allProjectIds[i]].projectId != 0) {
                campaignProjectIds[index++] = allProjectIds[i];
            }
        }
        
        return campaignProjectIds;
    }
    
    // Get unique voters count for a project in a campaign
    function getProjectUniqueVoters(
        uint256 _campaignId,
        uint256 _projectId
    ) external view returns (uint256) {
        // Count unique voters for this project
        uint256 uniqueVoters = 0;
        address[] memory campaignVotersList = campaignVoters[_campaignId];
        
        for (uint256 i = 0; i < campaignVotersList.length; i++) {
            address voter = campaignVotersList[i];
            if (userVotes[_campaignId][voter][_projectId][address(0)] > 0 || // CELO votes
                userVotes[_campaignId][voter][_projectId][address(1)] > 0) { // Any token votes
                uniqueVoters++;
            }
        }
        
        return uniqueVoters;
    }

    // Analytics Functions
    function getCampaignVotingAnalytics(uint256 _campaignId) external returns (
        uint256 totalVotes,
        uint256 totalVoters,
        uint256 totalProjects,
        uint256 approvedProjects,
        uint256 averageVotePerProject,
        address topVoter
    ) {
        uint256[] memory campaignProjectIds = _getProjectIdsByCampaignInternal(_campaignId);
        
        totalProjects = campaignProjectIds.length;
        totalVoters = campaignTotalVoters[_campaignId];
        
        for (uint256 i = 0; i < campaignProjectIds.length; i++) {
            ProjectParticipation storage participation = projectParticipations[_campaignId][campaignProjectIds[i]];
            totalVotes += participation.voteCount;
            if (participation.approved) {
                approvedProjects++;
            }
        }
        
        if (approvedProjects > 0) {
            averageVotePerProject = totalVotes / approvedProjects;
        }
        
        // Find top voter (simplified - could be optimized with additional tracking)
        uint256 maxVotes = 0;
        address[] memory voters = campaignVoters[_campaignId];
        for (uint256 i = 0; i < voters.length; i++) {
            uint256 voterTotal = totalUserVotesInCampaign[_campaignId][voters[i]];
            if (voterTotal > maxVotes) {
                maxVotes = voterTotal;
                topVoter = voters[i];
            }
        }
    }
    
    function getUserVotingAnalytics(address _user) external view returns (
        uint256 totalVotesCast,
        uint256 campaignsParticipated,
        uint256 reputation,
        uint256 totalVoteHistory
    ) {
        reputation = voterReputation[_user];
        totalVoteHistory = userVoteHistory[_user].length;
        
        // Count unique campaigns and total votes
        Vote[] storage votes = userVoteHistory[_user];
        uint256[] memory seenCampaigns = new uint256[](votes.length);
        uint256 seenCount = 0;

        for (uint256 i = 0; i < votes.length; i++) {
            totalVotesCast += votes[i].celoEquivalent;
            bool alreadyCounted = false;
            for (uint256 j = 0; j < seenCount; j++) {
                if (seenCampaigns[j] == votes[i].campaignId) {
                    alreadyCounted = true;
                    break;
                }
            }
            if (!alreadyCounted) {
                seenCampaigns[seenCount] = votes[i].campaignId;
                seenCount++;
            }
        }
        campaignsParticipated = seenCount;
    }

    // ==================== MIGRATION FUNCTIONS ====================
    
    // Create project participation from V4 migration
    function createProjectParticipationFromV4(
        uint256 _campaignId,
        uint256 _projectId,
        bool _approved,
        uint256 _voteCount,
        uint256 _fundsReceived
    ) external onlyMainContract {
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        participation.projectId = _projectId;
        participation.campaignId = _campaignId;
        participation.approved = _approved;
        participation.voteCount = _voteCount;
        participation.fundsReceived = _fundsReceived;
        
        if (_approved) {
            emit ProjectApproved(_campaignId, _projectId);
        }
    }
    
    // Set project token votes from V4 migration
    function setProjectTokenVotesFromV4(
        uint256 _campaignId,
        uint256 _projectId,
        address[] memory _tokens,
        uint256[] memory _amounts
    ) external onlyMainContract {
        require(_tokens.length == _amounts.length, "VotingModule: Array length mismatch");
        
        ProjectParticipation storage participation = projectParticipations[_campaignId][_projectId];
        
        for (uint256 i = 0; i < _tokens.length; i++) {
            if (_tokens[i] != address(0) && _amounts[i] > 0) {
                participation.tokenVotes[_tokens[i]] = _amounts[i];
            }
        }
    }
    
    // Add vote from V4 migration
    function addVoteFromV4(
        address _voter,
        uint256 _campaignId,
        uint256 _projectId,
        address _token,
        uint256 _amount,
        uint256 _celoEquivalent,
        uint256 _timestamp
    ) external onlyMainContract {
        // Create vote struct
        Vote memory newVote = Vote({
            voter: _voter,
            campaignId: _campaignId,
            projectId: _projectId,
            token: _token,
            amount: _amount,
            celoEquivalent: _celoEquivalent,
            timestamp: _timestamp > 0 ? _timestamp : block.timestamp
        });
        
        // Add to user vote history
        userVoteHistory[_voter].push(newVote);
        
        // Update user votes mapping
        userVotes[_campaignId][_voter][_projectId][_token] = _amount;
        
        // Update total user votes in campaign
        totalUserVotesInCampaign[_campaignId][_voter] += _celoEquivalent;
        
        // Add to campaign voters if not already present
        if (!campaignVoterParticipated[_campaignId][_voter]) {
            campaignVoterParticipated[_campaignId][_voter] = true;
            campaignVoters[_campaignId].push(_voter);
            campaignTotalVoters[_campaignId]++;
        }
        
        emit VoteCast(_voter, _campaignId, _projectId, _token, _amount, _celoEquivalent);
    }
    
    // Batch add votes from V4 migration
    function batchAddVotesFromV4(
        address[] memory _voters,
        uint256[] memory _campaignIds,
        uint256[] memory _projectIds,
        address[] memory _tokens,
        uint256[] memory _amounts,
        uint256[] memory _celoEquivalents,
        uint256[] memory _timestamps
    ) external onlyMainContract {
        require(_voters.length == _campaignIds.length && 
                _voters.length == _projectIds.length && 
                _voters.length == _tokens.length && 
                _voters.length == _amounts.length && 
                _voters.length == _celoEquivalents.length && 
                _voters.length == _timestamps.length, 
                "VotingModule: Array length mismatch");
        
        for (uint256 i = 0; i < _voters.length; i++) {
            this.addVoteFromV4(
                _voters[i],
                _campaignIds[i],
                _projectIds[i],
                _tokens[i],
                _amounts[i],
                _celoEquivalents[i],
                _timestamps[i]
            );
        }
    }
    
    // Set user max vote amount from V4 migration
    function setUserMaxVoteAmountFromV4(
        uint256 _campaignId,
        address _user,
        uint256 _maxAmount
    ) external onlyMainContract {
        if (_maxAmount > 0) {
            // This would need to be coordinated with CampaignsModule
            // For now, we'll just track it here
            voterWeight[_campaignId][_user] = _maxAmount;
        }
    }

    // Module info
    function getModuleName() external pure returns (string memory) {
        return "voting";
    }
    
    function getModuleVersion() external pure returns (uint256) {
        return 5;
    }
}