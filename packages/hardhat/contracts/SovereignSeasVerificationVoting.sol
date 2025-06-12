// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ISovereignSeas {
    function superAdmins(address) external view returns (bool);
    function projects(uint256)
        external
        view
        returns (uint256, address, string memory, string memory, bool, bool, uint256, uint256[] memory);
    function campaigns(uint256)
        external
        view
        returns (
            uint256,
            address,
            string memory,
            string memory,
            uint256,
            uint256,
            uint256,
            uint256,
            bool,
            bool,
            address,
            bool,
            uint256
        );
    function isCampaignAdmin(uint256, address) external view returns (bool);
    function supportedTokens(address) external view returns (bool);
    function getTokenToCeloEquivalent(address, uint256) external view returns (uint256);
    function celoToken() external view returns (address);
    function voteWithCelo(uint256 campaignId, uint256 projectId, bytes32 bypassCode) external payable;
}

contract SovereignSeasVerificationVoting is Ownable(msg.sender), ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Reference contracts
    ISovereignSeas public immutable sovereignSeas;

    // Constants
    uint256 public constant DEFAULT_VOTE_AMOUNT = 1 * 1e18; // 1 CELO per verified user
    uint256 public constant MIN_CELO_BALANCE = 10 * 1e18; // 10 CELO minimum balance
    uint256 public constant ADMIN_FEE_PERCENT = 2; // 2% admin fee
    bytes32 public constant BYPASS_CODE = keccak256("SOVEREIGN_SEAS_BYPASS");

    // Settings - configurable by owner
    uint256 public voteAmountPerUser = DEFAULT_VOTE_AMOUNT;
    bool public claimAndVoteEnabled = true;
    uint256 public claimCooldown = 1 minutes; // Minimum time between claims
    bool public strictCampaignValidation = false; // CHANGED: Default to false (relaxed mode)
    bool public continueOnVoteFailure = true; // NEW: Allow continuing even if vote fails

    // Campaign-specific vote amounts (campaignId => amount, 0 = use default)
    mapping(uint256 => uint256) public campaignVoteAmounts;

    // Counters and tracking
    uint256 public totalClaimAndVotes;
    uint256 public totalVotesCast;
    uint256 public totalValueDistributed;
    uint256 public totalFeesCollected;

    // Structs
    struct ClaimAndVoteRecord {
        uint256 id;
        address admin; // Admin who created the claim
        address beneficiary; // Who the vote is for
        uint256 campaignId;
        uint256 projectId;
        uint256 amount;
        uint256 timestamp;
        string metadata; // JSON for verification details, notes, etc.
        bool voteSucceeded; // Track if the actual vote succeeded
    }

    struct CampaignStats {
        uint256 totalClaims;
        uint256 totalVotes;
        uint256 totalValue;
        uint256 uniqueClaimants;
        mapping(address => bool) hasClaimedForCampaign;
        mapping(address => uint256) lastClaimTime;
        mapping(address => uint256[]) userClaims; // Claim IDs for this campaign
    }

    struct UserStats {
        uint256 totalClaims;
        uint256 totalVoteValue;
        uint256 lastClaimTime;
        uint256[] allClaimIds;
        mapping(uint256 => uint256[]) campaignClaims; // campaignId => claimIds
        mapping(uint256 => uint256) projectClaimsCount; // projectId => count
    }

    // Mappings
    mapping(uint256 => ClaimAndVoteRecord) public claimAndVotes;
    mapping(address => uint256[]) public adminClaims; // Claims created by admin
    mapping(address => UserStats) public userStats; // Beneficiary stats
    mapping(uint256 => CampaignStats) public campaignStats;
    mapping(address => bool) public authorizedAdmins; // Admins who can claim for others
    mapping(address => uint256) public adminFeesEarned;

    // Arrays for iteration and analytics
    uint256[] public allClaimAndVoteIds;
    mapping(uint256 => uint256[]) public claimsByCampaign;
    mapping(uint256 => uint256[]) public claimsByProject;
    mapping(address => mapping(uint256 => uint256[])) public userClaimsByProject; // user => projectId => claimIds

    // Events
    event ClaimAndVoteExecuted(
        uint256 indexed claimId,
        address indexed admin,
        address indexed beneficiary,
        uint256 campaignId,
        uint256 projectId,
        uint256 amount,
        bool voteSucceeded // NEW: Include vote success status
    );
    event AdminAdded(address indexed admin, address indexed addedBy);
    event AdminRemoved(address indexed admin, address indexed removedBy);
    event ContractTopUp(address indexed token, uint256 amount, address indexed sender);
    event FeesWithdrawn(address indexed token, uint256 amount, address indexed recipient);
    event SettingsUpdated(string setting, uint256 oldValue, uint256 newValue);
    event CampaignVoteAmountSet(uint256 indexed campaignId, uint256 amount, address indexed admin);
    event EmergencyAction(string action, address indexed actor, string details);
    event ErrorLogged(string errorType, string details, address user, uint256 campaignId);
    event VoteAttempted(uint256 indexed claimId, bool success, string reason); // NEW: Track vote attempts

    // Custom errors for better debugging
    error CampaignNotFound(uint256 campaignId);
    error CampaignNotActive(uint256 campaignId, bool active); // UPDATED: Removed funded parameter
    error AlreadyClaimed(address user, uint256 campaignId);
    error CooldownNotPassed(address user, uint256 timeRemaining);
    error InsufficientBalance(uint256 required, uint256 available);
    error UnauthorizedAdmin(address caller);
    error ClaimingDisabled();

    // Modifiers with relaxed validation
    modifier onlySuperAdmin() {
        if (!sovereignSeas.superAdmins(msg.sender) && owner() != msg.sender) {
            revert UnauthorizedAdmin(msg.sender);
        }
        _;
    }

    modifier onlyAuthorizedAdmin() {
        if (!authorizedAdmins[msg.sender] && !sovereignSeas.superAdmins(msg.sender) && owner() != msg.sender) {
            revert UnauthorizedAdmin(msg.sender);
        }
        _;
    }

    modifier validCampaign(uint256 _campaignId) {
        if (strictCampaignValidation) {
            _validateCampaignRelaxed(_campaignId); // UPDATED: Use relaxed validation
        }
        _;
    }

    modifier claimAndVoteAllowed() {
        if (!claimAndVoteEnabled) {
            revert ClaimingDisabled();
        }
        _;
    }

    modifier cooldownPassed(address _user) {
        uint256 timeRemaining = _getCooldownTimeRemaining(_user);
        if (timeRemaining > 0) {
            revert CooldownNotPassed(_user, timeRemaining);
        }
        _;
    }

    constructor(address _sovereignSeas) {
        require(_sovereignSeas != address(0), "Invalid SovereignSeas address");
        sovereignSeas = ISovereignSeas(_sovereignSeas);

        // Owner is automatically an authorized admin
        authorizedAdmins[msg.sender] = true;
    }

    // =============================================================================
    // UPDATED VALIDATION FUNCTIONS - RELAXED MODE
    // =============================================================================

    // UPDATED: Relaxed validation - only checks if campaign exists and is active, NOT funded
    function _validateCampaignRelaxed(uint256 _campaignId) internal view {
        try sovereignSeas.campaigns(_campaignId) returns (
            uint256,
            address,
            string memory,
            string memory,
            uint256,
            uint256,
            uint256,
            uint256,
            bool active,
            bool,
            address,
            bool, // funded - WE IGNORE THIS NOW
            uint256
        ) {
            if (!active) {
                revert CampaignNotActive(_campaignId, active);
            }
            // REMOVED: funded check - we don't care if campaign is funded
        } catch {
            revert CampaignNotFound(_campaignId);
        }
    }

    function _getCooldownTimeRemaining(address _user) internal view returns (uint256) {
        uint256 lastClaimTime = userStats[_user].lastClaimTime;
        uint256 cooldownEnd = lastClaimTime + claimCooldown;
        
        if (block.timestamp >= cooldownEnd) {
            return 0;
        }
        
        return cooldownEnd - block.timestamp;
    }

    function _validateClaimRequirements(address _beneficiary, uint256 _campaignId) internal view {
        if (campaignStats[_campaignId].hasClaimedForCampaign[_beneficiary]) {
            revert AlreadyClaimed(_beneficiary, _campaignId);
        }
    }

    // =============================================================================
    // UPDATED CLAIM AND VOTE FUNCTION - RELAXED ERROR HANDLING
    // =============================================================================

    /**
     * @notice UPDATED: Claim and vote with relaxed error handling - continues even if vote fails
     */
    function claimAndVote(address _beneficiary, uint256 _campaignId, uint256 _projectId, string memory _metadata)
        external
        onlyAuthorizedAdmin
        validCampaign(_campaignId)
        claimAndVoteAllowed
        cooldownPassed(_beneficiary)
        nonReentrant
        returns (uint256)
    {
        // Validate claim requirements
        _validateClaimRequirements(_beneficiary, _campaignId);

        // Get vote amount for this campaign (0 = use default)
        uint256 voteAmount = campaignVoteAmounts[_campaignId];
        if (voteAmount == 0) {
            voteAmount = voteAmountPerUser;
        }

        // Check contract has sufficient balance
        if (address(this).balance < voteAmount) {
            revert InsufficientBalance(voteAmount, address(this).balance);
        }

        // Create claim record
        uint256 claimId = totalClaimAndVotes++;
        ClaimAndVoteRecord storage claimAndVote = claimAndVotes[claimId];
        claimAndVote.id = claimId;
        claimAndVote.admin = msg.sender;
        claimAndVote.beneficiary = _beneficiary;
        claimAndVote.campaignId = _campaignId;
        claimAndVote.projectId = _projectId;
        claimAndVote.amount = voteAmount;
        claimAndVote.timestamp = block.timestamp;
        claimAndVote.metadata = _metadata;

        // Calculate admin fee
        uint256 adminFee = (voteAmount * ADMIN_FEE_PERCENT) / 100;
        uint256 actualVoteAmount = voteAmount - adminFee;

        // UPDATED: Try to vote with relaxed error handling
        bool voteSucceeded = false;
        string memory voteError = "";

        try sovereignSeas.voteWithCelo{value: actualVoteAmount}(_campaignId, _projectId, BYPASS_CODE) {
            voteSucceeded = true;
            emit VoteAttempted(claimId, true, "Vote succeeded");
        } catch Error(string memory reason) {
            voteError = reason;
            emit ErrorLogged("VoteFailedButContinuing", reason, _beneficiary, _campaignId);
            emit VoteAttempted(claimId, false, reason);
            
            if (!continueOnVoteFailure) {
                revert(reason); // Only revert if strict mode is enabled
            }
        } catch (bytes memory lowLevelData) {
            voteError = lowLevelData.length > 0 ? string(lowLevelData) : "Unknown error";
            emit ErrorLogged("VoteFailedLowLevelButContinuing", voteError, _beneficiary, _campaignId);
            emit VoteAttempted(claimId, false, voteError);
            
            if (!continueOnVoteFailure) {
                revert(voteError); // Only revert if strict mode is enabled
            }
        }

        // Store vote success status
        claimAndVote.voteSucceeded = voteSucceeded;

        // Update tracking data regardless of vote success (for testing/analytics)
        _updateTrackingData(claimId, _beneficiary, _campaignId, _projectId, voteAmount);

        // Transfer admin fee only if vote succeeded (or if we're continuing anyway)
        if (adminFee > 0 && (voteSucceeded || continueOnVoteFailure)) {
            adminFeesEarned[owner()] += adminFee;
            (bool success, ) = payable(owner()).call{value: adminFee}("");
            if (success) {
                totalFeesCollected += adminFee;
            }
        }

        // Update totals
        totalVotesCast++;
        if (voteSucceeded) {
            totalValueDistributed += actualVoteAmount;
        }

        emit ClaimAndVoteExecuted(claimId, msg.sender, _beneficiary, _campaignId, _projectId, actualVoteAmount, voteSucceeded);

        return claimId;
    }

    /**
     * @notice DEPRECATED: Use claimAndVote instead (now has relaxed handling)
     * Keeping this for backward compatibility
     */
    function claimAndVoteRelaxed(address _beneficiary, uint256 _campaignId, uint256 _projectId, string memory _metadata)
        external
        onlyAuthorizedAdmin
        claimAndVoteAllowed
        cooldownPassed(_beneficiary)
        nonReentrant
        returns (uint256)
    {
        // Just call the main function since it's now relaxed
        return this.claimAndVote(_beneficiary, _campaignId, _projectId, _metadata);
    }

    /**
     * @notice Internal function to update all tracking data
     */
    function _updateTrackingData(
        uint256 _claimId,
        address _beneficiary,
        uint256 _campaignId,
        uint256 _projectId,
        uint256 _amount
    ) internal {
        // Update arrays for iteration
        allClaimAndVoteIds.push(_claimId);
        adminClaims[msg.sender].push(_claimId);
        claimsByCampaign[_campaignId].push(_claimId);
        claimsByProject[_projectId].push(_claimId);
        userClaimsByProject[_beneficiary][_projectId].push(_claimId);

        // Update campaign stats
        CampaignStats storage campStats = campaignStats[_campaignId];
        campStats.totalClaims++;
        campStats.totalVotes++;
        campStats.totalValue += _amount;
        campStats.userClaims[_beneficiary].push(_claimId);

        if (!campStats.hasClaimedForCampaign[_beneficiary]) {
            campStats.uniqueClaimants++;
            campStats.hasClaimedForCampaign[_beneficiary] = true;
        }
        campStats.lastClaimTime[_beneficiary] = block.timestamp;

        // Update user stats
        UserStats storage userStat = userStats[_beneficiary];
        userStat.totalClaims++;
        userStat.totalVoteValue += _amount;
        userStat.lastClaimTime = block.timestamp;
        userStat.allClaimIds.push(_claimId);
        userStat.campaignClaims[_campaignId].push(_claimId);
        userStat.projectClaimsCount[_projectId]++;
    }

    // =============================================================================
    // UPDATED ADMIN FUNCTIONS
    // =============================================================================

    /**
     * @notice UPDATED: Set relaxed mode settings
     */
    function updateSettings(
        uint256 _voteAmount, 
        bool _claimAndVoteEnabled, 
        uint256 _claimCooldown,
        bool _strictCampaignValidation,
        bool _continueOnVoteFailure
    ) external onlyOwner {
        require(_voteAmount > 0, "Vote amount must be greater than 0");
        require(_claimCooldown <= 1 days, "Cooldown too long");

        emit SettingsUpdated("voteAmountPerUser", voteAmountPerUser, _voteAmount);
        voteAmountPerUser = _voteAmount;

        claimAndVoteEnabled = _claimAndVoteEnabled;
        
        emit SettingsUpdated("claimCooldown", claimCooldown, _claimCooldown);
        claimCooldown = _claimCooldown;

        strictCampaignValidation = _strictCampaignValidation;
        continueOnVoteFailure = _continueOnVoteFailure;
    }

    /**
     * @notice Toggle whether to continue when votes fail
     */
    function setContinueOnVoteFailure(bool _continue) external onlyOwner {
        continueOnVoteFailure = _continue;
        emit SettingsUpdated("continueOnVoteFailure", _continue ? 0 : 1, _continue ? 1 : 0);
    }

    /**
     * @notice Toggle strict campaign validation (now only checks active, not funded)
     */
    function setStrictCampaignValidation(bool _strict) external onlyOwner {
        strictCampaignValidation = _strict;
        emit SettingsUpdated("strictCampaignValidation", _strict ? 0 : 1, _strict ? 1 : 0);
    }

    // =============================================================================
    // UPDATED VIEW FUNCTIONS
    // =============================================================================

    /**
     * @notice UPDATED: Check campaign status without funded requirement
     */
    function getCampaignValidationStatus(uint256 _campaignId) external view returns (
        bool exists,
        bool active,
        string memory status
    ) {
        try sovereignSeas.campaigns(_campaignId) returns (
            uint256,
            address,
            string memory,
            string memory,
            uint256,
            uint256,
            uint256,
            uint256,
            bool _active,
            bool,
            address,
            bool, // We ignore funded now
            uint256
        ) {
            exists = true;
            active = _active;
            
            if (active) {
                status = "Valid - Campaign is Active";
            } else {
                status = "Invalid - Campaign is Not Active";
            }
        } catch {
            exists = false;
            active = false;
            status = "Campaign Not Found or Error Reading Data";
        }
    }

    /**
     * @notice UPDATED: Check if user can have claim created (relaxed validation)
     */
    function canCreateClaimForUser(address _user, uint256 _campaignId) external view returns (bool, string memory) {
        // Check basic settings
        if (!claimAndVoteEnabled) return (false, "Claim and vote disabled");
        
        // Check if already claimed
        if (campaignStats[_campaignId].hasClaimedForCampaign[_user]) return (false, "Already claimed for campaign");
        
        // Check cooldown
        uint256 timeRemaining = _getCooldownTimeRemaining(_user);
        if (timeRemaining > 0) return (false, string(abi.encodePacked("Cooldown not passed: ", _toString(timeRemaining), " seconds remaining")));

        // Check campaign status only if strict validation is enabled (and only check active, not funded)
        if (strictCampaignValidation) {
            try sovereignSeas.campaigns(_campaignId) returns (
                uint256,
                address,
                string memory,
                string memory,
                uint256,
                uint256,
                uint256,
                uint256,
                bool active,
                bool,
                address,
                bool, // Don't care about funded anymore
                uint256
            ) {
                if (!active) return (false, "Campaign not active");
            } catch {
                return (false, "Campaign not found or error reading campaign data");
            }
        }

        return (true, "Can create claim");
    }

    /**
     * @notice UPDATED: Get claim with vote success status
     */
    function getClaimAndVote(uint256 _claimId) external view returns (
        uint256 id, 
        address admin, 
        address beneficiary, 
        uint256 campaignId, 
        uint256 projectId, 
        uint256 amount, 
        uint256 timestamp, 
        string memory metadata,
        bool voteSucceeded
    ) {
        ClaimAndVoteRecord storage claimAndVote = claimAndVotes[_claimId];
        return (
            claimAndVote.id, 
            claimAndVote.admin, 
            claimAndVote.beneficiary, 
            claimAndVote.campaignId, 
            claimAndVote.projectId, 
            claimAndVote.amount, 
            claimAndVote.timestamp, 
            claimAndVote.metadata,
            claimAndVote.voteSucceeded
        );
    }

    // =============================================================================
    // EXISTING FUNCTIONS (keeping all your original functionality)
    // =============================================================================

    function topUpContract(address _token, uint256 _amount) external payable nonReentrant {
        require(sovereignSeas.supportedTokens(_token), "Token not supported");
        address celoToken = sovereignSeas.celoToken();

        if (_token == celoToken) {
            require(msg.value > 0, "Must send CELO");
        } else {
            require(_amount > 0, "Amount must be greater than 0");
            IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
           
        }

        emit ContractTopUp(_token, _amount > 0 ? _amount : msg.value, msg.sender);
    }

    function withdrawFees(uint256 _amount) external onlyOwner nonReentrant {
        uint256 availableFees = adminFeesEarned[owner()];
        require(availableFees > 0, "No fees available");

        uint256 withdrawAmount = _amount == 0 ? availableFees : _amount;
        require(withdrawAmount <= availableFees, "Insufficient fee balance");

        adminFeesEarned[owner()] -= withdrawAmount;
        (bool success, ) = payable(owner()).call{value: withdrawAmount}("");
        require(success, "Fee withdrawal failed");

        emit FeesWithdrawn(address(0), withdrawAmount, owner());
    }

    function addAuthorizedAdmin(address _admin) external onlySuperAdmin {
        require(_admin != address(0), "Invalid address");
        require(!authorizedAdmins[_admin], "Already authorized admin");
        authorizedAdmins[_admin] = true;
        emit AdminAdded(_admin, msg.sender);
    }

    function removeAuthorizedAdmin(address _admin) external onlySuperAdmin {
        require(authorizedAdmins[_admin], "Not an authorized admin");
        authorizedAdmins[_admin] = false;
        emit AdminRemoved(_admin, msg.sender);
    }

    function setCampaignVoteAmount(uint256 _campaignId, uint256 _amount) external onlyAuthorizedAdmin validCampaign(_campaignId) {
        require(_amount <= voteAmountPerUser * 20, "Amount too high");
        uint256 oldAmount = campaignVoteAmounts[_campaignId];
        campaignVoteAmounts[_campaignId] = _amount;
        emit CampaignVoteAmountSet(_campaignId, _amount, msg.sender);
        emit SettingsUpdated("campaignVoteAmount", oldAmount, _amount);
    }

    function emergencyWithdraw() external onlySuperAdmin {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool success, ) = payable(owner()).call{value: balance}("");
            require(success, "Emergency withdrawal failed");
            emit EmergencyAction("emergencyWithdraw", msg.sender, "All CELO withdrawn");
        }
    }

    function emergencyWithdrawToken(address _token, uint256 _amount) external onlySuperAdmin {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        uint256 withdrawAmount = _amount == 0 ? balance : _amount;

        if (withdrawAmount > 0) {
            IERC20(_token).safeTransfer(owner(), withdrawAmount);
            emit EmergencyAction("emergencyWithdrawToken", msg.sender, "ERC20 tokens withdrawn");
        }
    }

    function getCampaignVoteAmount(uint256 _campaignId) external view returns (uint256 amount) {
        amount = campaignVoteAmounts[_campaignId];
        if (amount == 0) {
            amount = voteAmountPerUser;
        }
        return amount;
    }

    function getCampaignStats(uint256 _campaignId) external view returns (uint256 totalClaims, uint256 totalVotes, uint256 totalValue, uint256 uniqueClaimants, uint256 customVoteAmount) {
        CampaignStats storage stats = campaignStats[_campaignId];
        return (stats.totalClaims, stats.totalVotes, stats.totalValue, stats.uniqueClaimants, campaignVoteAmounts[_campaignId]);
    }

    function getUserStats(address _user) external view returns (uint256 totalClaims, uint256 totalVoteValue, uint256 lastClaimTime, uint256[] memory allClaimIds) {
        UserStats storage stats = userStats[_user];
        return (stats.totalClaims, stats.totalVoteValue, stats.lastClaimTime, stats.allClaimIds);
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getTotalStats() external view returns (uint256 _totalClaimAndVotes, uint256 _totalVotesCast, uint256 _totalValueDistributed, uint256 _totalFeesCollected) {
        return (totalClaimAndVotes, totalVotesCast, totalValueDistributed, totalFeesCollected);
    }

    function getClaimsByCampaign(uint256 _campaignId) external view returns (uint256[] memory) {
        return claimsByCampaign[_campaignId];
    }

    function getClaimsByProject(uint256 _projectId) external view returns (uint256[] memory) {
        return claimsByProject[_projectId];
    }

    function getAdminClaims(address _admin) external view returns (uint256[] memory) {
        return adminClaims[_admin];
    }

    function getUserClaimsForCampaign(address _user, uint256 _campaignId) external view returns (uint256[] memory) {
        return campaignStats[_campaignId].userClaims[_user];
    }

    function getUserClaimsForCampaignFromUserStats(address _user, uint256 _campaignId) external view returns (uint256[] memory) {
        return userStats[_user].campaignClaims[_campaignId];
    }

    function getUserClaimsByProject(address _user, uint256 _projectId) external view returns (uint256[] memory) {
        return userClaimsByProject[_user][_projectId];
    }

    function getUserProjectClaimsCount(address _user, uint256 _projectId) external view returns (uint256) {
        return userStats[_user].projectClaimsCount[_projectId];
    }

    function getAllClaims(uint256 _offset, uint256 _limit) external view returns (uint256[] memory) {
        uint256 totalClaims = allClaimAndVoteIds.length;
        if (_offset >= totalClaims) {
            return new uint256[](0);
        }

        uint256 end = _offset + _limit;
        if (end > totalClaims) {
            end = totalClaims;
        }

        uint256[] memory paginatedClaims = new uint256[](end - _offset);
        for (uint256 i = _offset; i < end; i++) {
            paginatedClaims[i - _offset] = allClaimAndVoteIds[i];
        }

        return paginatedClaims;
    }

    function getClaimsCounts() external view returns (uint256 totalClaims, uint256 totalCampaigns, uint256 totalProjects, uint256 totalUsers) {
        totalClaims = allClaimAndVoteIds.length;

        // Count active campaigns and projects (approximation)
        for (uint256 i = 0; i < 1000; i++) {
            // Check first 1000 campaigns
            if (claimsByCampaign[i].length > 0) totalCampaigns++;
        }

        for (uint256 i = 0; i < 1000; i++) {
            // Check first 1000 projects
            if (claimsByProject[i].length > 0) totalProjects++;
        }

        // Total users would need to be tracked separately for efficiency
        totalUsers = 0; // Would require additional tracking
    }

    function hasUserClaimedForCampaign(address _user, uint256 _campaignId) external view returns (bool) {
        return campaignStats[_campaignId].hasClaimedForCampaign[_user];
    }

    function getUserLastClaimTimeForCampaign(address _user, uint256 _campaignId) external view returns (uint256) {
        return campaignStats[_campaignId].lastClaimTime[_user];
    }

    function getUserProjectAnalytics(address _user) external view returns (uint256[] memory projectIds, uint256[] memory claimCounts) {
        // This would return projects the user has claims for and their counts
        // Implementation would need to track this data more efficiently
        projectIds = new uint256[](0);
        claimCounts = new uint256[](0);
    }

  function _toString(uint256 value) internal pure returns (string memory) {
    if (value == 0) {
        return "0";
    }
    uint256 temp = value;
    uint256 digits;
    while (temp != 0) {
        digits++;
        temp /= 10;
    }
    bytes memory buffer = new bytes(digits);
    while (value != 0) {
        digits -= 1;
        buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
        value /= 10;
    }
    return string(buffer);
}

// =============================================================================
// FALLBACK FUNCTIONS
// =============================================================================

receive() external payable {
    emit ContractTopUp(address(0), msg.value, msg.sender);
}

fallback() external payable {
    emit ContractTopUp(address(0), msg.value, msg.sender);
}
}
