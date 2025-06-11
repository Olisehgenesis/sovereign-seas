// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ISovereignSeas {
    function superAdmins(address) external view returns (bool);
    function projects(uint256) external view returns (uint256, address, string memory, string memory, bool, bool, uint256, uint256[] memory);
    function campaigns(uint256) external view returns (uint256, address, string memory, string memory, uint256, uint256, uint256, uint256, bool, bool, address, bool, uint256);
    function isCampaignAdmin(uint256, address) external view returns (bool);
    function supportedTokens(address) external view returns (bool);
    function getTokenToCeloEquivalent(address, uint256) external view returns (uint256);
    function celoToken() external view returns (address);
    function vote(uint256 campaignId, uint256 amount, address token, string memory metadata) external payable;
}

interface IVerificationRegistry {
    function isVerified(address wallet) external view returns (bool);
    function getVerificationDetails(address wallet) external view returns (bool verified, string memory userId, uint256 timestamp);
}

contract SovereignSeasVerificationVoting is Ownable(msg.sender), ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Reference contracts
    ISovereignSeas public immutable sovereignSeas;
    IVerificationRegistry public verificationRegistry;
    
    // Constants
    uint256 public constant DEFAULT_VOTE_AMOUNT = 1 * 1e18; // 1 CELO per verified user
    uint256 public constant MIN_CELO_BALANCE = 10 * 1e18; // 10 CELO minimum balance
    uint256 public constant ADMIN_FEE_PERCENT = 2; // 2% admin fee
    uint256 public constant MAX_CLAIMS_PER_BATCH = 50; // Gas optimization
    
    // Settings - configurable by owner
    uint256 public voteAmountPerUser = DEFAULT_VOTE_AMOUNT;
    bool public claimAndVoteEnabled = true;
    uint256 public claimCooldown = 1 days; // Minimum time between claims
    
    // Campaign-specific vote amounts (campaignId => amount, 0 = use default)
    mapping(uint256 => uint256) public campaignVoteAmounts;
    
    // Counters and tracking
    uint256 public totalClaimAndVotes;
    uint256 public totalVotesCast;
    uint256 public totalValueDistributed;
    uint256 public totalFeesCollected;
    
    // Enums
    enum ClaimStatus { PENDING, APPROVED, REJECTED, FULFILLED }
    
    // Structs
    struct ClaimAndVote {
        uint256 id;
        address admin; // Admin who created the claim
        address beneficiary; // Who the vote is for
        uint256 campaignId;
        uint256 amount;
        ClaimStatus status;
        uint256 createdAt;
        uint256 approvedAt;
        uint256 fulfilledAt;
        address approvedBy;
        address fulfilledBy;
        string metadata; // JSON for verification details, notes, etc.
        string verificationProof; // Self Protocol verification data
    }
    
    struct CampaignStats {
        uint256 totalClaims;
        uint256 totalVotes;
        uint256 totalValue;
        uint256 uniqueClaimants;
        mapping(address => bool) hasClaimedForCampaign;
        mapping(address => uint256) lastClaimTime;
    }
    
    // Mappings
    mapping(uint256 => ClaimAndVote) public claimAndVotes;
    mapping(address => uint256[]) public adminClaims; // Claims created by admin
    mapping(address => uint256[]) public beneficiaryClaims; // Claims for beneficiary
    mapping(uint256 => CampaignStats) public campaignStats;
    mapping(address => bool) public authorizedAdmins; // Admins who can claim for others
    mapping(address => uint256) public userLastClaimTime;
    mapping(address => uint256) public userTotalClaims;
    mapping(address => uint256) public adminFeesEarned;
    
    // Arrays for iteration
    uint256[] public allClaimAndVoteIds;
    uint256[] public pendingClaimAndVoteIds;
    mapping(uint256 => uint256[]) public claimsByCampaign;
    
    // Events
    event ClaimAndVoteCreated(uint256 indexed claimId, address indexed admin, address indexed beneficiary, uint256 campaignId, uint256 amount);
    event ClaimAndVoteApproved(uint256 indexed claimId, address indexed approver, string notes);
    event ClaimAndVoteRejected(uint256 indexed claimId, address indexed rejector, string reason);
    event ClaimAndVoteFulfilled(uint256 indexed claimId, address indexed fulfiller, uint256 campaignId, uint256 amount);
    event VoteCast(uint256 indexed claimId, uint256 indexed campaignId, address indexed beneficiary, uint256 amount);
    event AdminAdded(address indexed admin, address indexed addedBy);
    event AdminRemoved(address indexed admin, address indexed removedBy);
    event ContractTopUp(address indexed token, uint256 amount, address indexed sender);
    event FeesWithdrawn(address indexed token, uint256 amount, address indexed recipient);
    event SettingsUpdated(string setting, uint256 oldValue, uint256 newValue);
    event CampaignVoteAmountSet(uint256 indexed campaignId, uint256 amount, address indexed admin);
    event EmergencyAction(string action, address indexed actor, string details);
    
    // Modifiers
    modifier onlySuperAdmin() {
        require(sovereignSeas.superAdmins(msg.sender) || owner() == msg.sender, "Only super admin");
        _;
    }
    
    modifier onlyAuthorizedAdmin() {
        require(authorizedAdmins[msg.sender] || sovereignSeas.superAdmins(msg.sender) || owner() == msg.sender, "Only authorized admin");
        _;
    }
    
    modifier validCampaign(uint256 _campaignId) {
        // Get campaign data from SovereignSeas
        (,,,,,,,, bool active,,, bool funded,) = sovereignSeas.campaigns(_campaignId);
        require(active && funded, "Campaign not active or funded");
        _;
    }
    
    modifier claimAndVoteAllowed() {
        require(claimAndVoteEnabled, "Claim and vote currently disabled");
        _;
    }
    
    modifier minimumBalance(address _user) {
        require(_user.balance >= MIN_CELO_BALANCE, "Wallet must have at least 10 CELO");
        _;
    }
    
    modifier cooldownPassed(address _user) {
        require(block.timestamp >= userLastClaimTime[_user] + claimCooldown, "Claim cooldown not passed");
        _;
    }
    
    constructor(
        address _sovereignSeas,
        address _verificationRegistry
    ) {
        require(_sovereignSeas != address(0), "Invalid SovereignSeas address");
        require(_verificationRegistry != address(0), "Invalid verification registry");
        
        sovereignSeas = ISovereignSeas(_sovereignSeas);
        verificationRegistry = IVerificationRegistry(_verificationRegistry);
        
        // Owner is automatically an authorized admin
        authorizedAdmins[msg.sender] = true;
    }
    
    // =============================================================================
    // CLAIM AND VOTE CREATION FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Create a claim and vote for a verified user (admin only)
     * @param _beneficiary Who the vote is for (must be verified and have 10+ CELO)
     * @param _campaignId The campaign ID to vote for
     * @param _verificationProof Self Protocol verification proof
     * @param _metadata Additional metadata (JSON)
     */
    function createClaimAndVote(
        address _beneficiary,
        uint256 _campaignId,
        string memory _verificationProof,
        string memory _metadata
    ) external 
        onlyAuthorizedAdmin 
        validCampaign(_campaignId) 
        claimAndVoteAllowed 
        minimumBalance(_beneficiary)
        cooldownPassed(_beneficiary)
        nonReentrant 
        returns (uint256) 
    {
        require(verificationRegistry.isVerified(_beneficiary), "Beneficiary not verified");
        require(!campaignStats[_campaignId].hasClaimedForCampaign[_beneficiary], "Already claimed for this campaign");
        
        return _createClaimAndVote(
            msg.sender,
            _beneficiary,
            _campaignId,
            voteAmountPerUser,
            _verificationProof,
            _metadata
        );
    }
    
    /**
     * @notice Internal function to create claim and vote
     */
    function _createClaimAndVote(
        address _admin,
        address _beneficiary,
        uint256 _campaignId,
        uint256 _amount,
        string memory _verificationProof,
        string memory _metadata
    ) internal returns (uint256) {
        uint256 claimId = totalClaimAndVotes++;
        
        ClaimAndVote storage claimAndVote = claimAndVotes[claimId];
        claimAndVote.id = claimId;
        claimAndVote.admin = _admin;
        claimAndVote.beneficiary = _beneficiary;
        claimAndVote.campaignId = _campaignId;
        claimAndVote.amount = _amount;
        claimAndVote.status = ClaimStatus.PENDING;
        claimAndVote.createdAt = block.timestamp;
        claimAndVote.metadata = _metadata;
        claimAndVote.verificationProof = _verificationProof;
        
        // Update tracking
        allClaimAndVoteIds.push(claimId);
        adminClaims[_admin].push(claimId);
        beneficiaryClaims[_beneficiary].push(claimId);
        claimsByCampaign[_campaignId].push(claimId);
        pendingClaimAndVoteIds.push(claimId);
        
        // Update campaign stats
        campaignStats[_campaignId].totalClaims++;
        if (!campaignStats[_campaignId].hasClaimedForCampaign[_beneficiary]) {
            campaignStats[_campaignId].uniqueClaimants++;
            campaignStats[_campaignId].hasClaimedForCampaign[_beneficiary] = true;
        }
        campaignStats[_campaignId].lastClaimTime[_beneficiary] = block.timestamp;
        
        // Update user tracking
        userLastClaimTime[_beneficiary] = block.timestamp;
        userTotalClaims[_beneficiary]++;
        
        emit ClaimAndVoteCreated(claimId, _admin, _beneficiary, _campaignId, _amount);
        
        return claimId;
    }
    
    // =============================================================================
    // CLAIM AND VOTE MANAGEMENT FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Approve a pending claim and vote
     * @param _claimId The claim ID to approve
     * @param _notes Admin notes for approval
     */
    function approveClaimAndVote(uint256 _claimId, string memory _notes) external onlyAuthorizedAdmin nonReentrant {
        ClaimAndVote storage claimAndVote = claimAndVotes[_claimId];
        require(claimAndVote.status == ClaimStatus.PENDING, "Claim not pending");
        
        claimAndVote.status = ClaimStatus.APPROVED;
        claimAndVote.approvedAt = block.timestamp;
        claimAndVote.approvedBy = msg.sender;
        
        // Remove from pending claims
        _removePendingClaim(_claimId);
        
        emit ClaimAndVoteApproved(_claimId, msg.sender, _notes);
    }
    
    /**
     * @notice Reject a pending claim and vote
     * @param _claimId The claim ID to reject
     * @param _reason Reason for rejection
     */
    function rejectClaimAndVote(uint256 _claimId, string memory _reason) external onlyAuthorizedAdmin nonReentrant {
        ClaimAndVote storage claimAndVote = claimAndVotes[_claimId];
        require(claimAndVote.status == ClaimStatus.PENDING, "Claim not pending");
        
        claimAndVote.status = ClaimStatus.REJECTED;
        
        // Remove from pending claims
        _removePendingClaim(_claimId);
        
        emit ClaimAndVoteRejected(_claimId, msg.sender, _reason);
    }
    
    /**
     * @notice Fulfill an approved claim by casting vote
     * @param _claimId The claim ID to fulfill
     * @param _voteMetadata Metadata for the vote transaction
     */
    function fulfillClaimAndVote(uint256 _claimId, string memory _voteMetadata) external nonReentrant {
        ClaimAndVote storage claimAndVote = claimAndVotes[_claimId];
        require(claimAndVote.status == ClaimStatus.APPROVED, "Claim not approved");
        require(
            authorizedAdmins[msg.sender] || 
            sovereignSeas.superAdmins(msg.sender) ||
            owner() == msg.sender,
            "Not authorized to fulfill"
        );
        
        // Check if campaign is still active
        (,,,,,,,, bool active,,, bool funded,) = sovereignSeas.campaigns(claimAndVote.campaignId);
        require(active && funded, "Campaign no longer active");
        
        // Check contract has sufficient balance
        address celoToken = sovereignSeas.celoToken();
        require(IERC20(celoToken).balanceOf(address(this)) >= claimAndVote.amount, "Insufficient contract balance");
        
        // Calculate admin fee
        uint256 adminFee = (claimAndVote.amount * ADMIN_FEE_PERCENT) / 100;
        uint256 voteAmount = claimAndVote.amount - adminFee;
        
        // Approve CELO spending for SovereignSeas
        IERC20(celoToken).approve(address(sovereignSeas), voteAmount);
        
        // Cast vote through SovereignSeas
        try sovereignSeas.vote(claimAndVote.campaignId, voteAmount, celoToken, _voteMetadata) {
            // Update claim status
            claimAndVote.status = ClaimStatus.FULFILLED;
            claimAndVote.fulfilledAt = block.timestamp;
            claimAndVote.fulfilledBy = msg.sender;
            
            // Update stats
            totalVotesCast++;
            totalValueDistributed += voteAmount;
            totalFeesCollected += adminFee;
            campaignStats[claimAndVote.campaignId].totalVotes++;
            campaignStats[claimAndVote.campaignId].totalValue += voteAmount;
            
            // Transfer admin fee to contract owner
            if (adminFee > 0) {
                adminFeesEarned[owner()] += adminFee;
                IERC20(celoToken).safeTransfer(owner(), adminFee);
            }
            
            emit ClaimAndVoteFulfilled(_claimId, msg.sender, claimAndVote.campaignId, voteAmount);
            emit VoteCast(_claimId, claimAndVote.campaignId, claimAndVote.beneficiary, voteAmount);
            
        } catch Error(string memory reason) {
            revert(string(abi.encodePacked("Vote failed: ", reason)));
        }
    }
    
    /**
     * @notice Batch approve multiple claims
     * @param _claimIds Array of claim IDs to approve
     * @param _notes Admin notes for batch approval
     */
    function batchApproveClaimsAndVotes(uint256[] memory _claimIds, string memory _notes) external onlyAuthorizedAdmin {
        require(_claimIds.length <= MAX_CLAIMS_PER_BATCH, "Too many claims");
        
        for (uint256 i = 0; i < _claimIds.length; i++) {
            ClaimAndVote storage claimAndVote = claimAndVotes[_claimIds[i]];
            if (claimAndVote.status == ClaimStatus.PENDING) {
                claimAndVote.status = ClaimStatus.APPROVED;
                claimAndVote.approvedAt = block.timestamp;
                claimAndVote.approvedBy = msg.sender;
                
                _removePendingClaim(_claimIds[i]);
                emit ClaimAndVoteApproved(_claimIds[i], msg.sender, _notes);
            }
        }
    }
    
    /**
     * @notice Batch fulfill multiple approved claims
     * @param _claimIds Array of claim IDs to fulfill
     * @param _voteMetadata Metadata for votes
     */
    function batchFulfillClaimsAndVotes(uint256[] memory _claimIds, string memory _voteMetadata) external nonReentrant {
        require(_claimIds.length <= MAX_CLAIMS_PER_BATCH, "Too many claims");
        require(
            authorizedAdmins[msg.sender] || 
            sovereignSeas.superAdmins(msg.sender) ||
            owner() == msg.sender,
            "Not authorized for batch fulfill"
        );
        
        for (uint256 i = 0; i < _claimIds.length; i++) {
            try this.fulfillClaimAndVote(_claimIds[i], _voteMetadata) {
                // Claim fulfilled successfully
            } catch {
                // Skip failed claims and continue
                continue;
            }
        }
    }
    
    // =============================================================================
    // CONTRACT FUNDING AND MANAGEMENT
    // =============================================================================
    
    /**
     * @notice Top up contract with CELO or supported tokens
     * @param _token Token address (use CELO token address for CELO)
     * @param _amount Amount to top up (for ERC20 tokens)
     */
    function topUpContract(address _token, uint256 _amount) external payable nonReentrant {
        require(sovereignSeas.supportedTokens(_token), "Token not supported");
        
        address celoToken = sovereignSeas.celoToken();
        
        if (_token == celoToken) {
            require(msg.value > 0, "Must send CELO");
        } else {
            require(_amount > 0, "Amount must be greater than 0");
            IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
            
            // Convert to CELO equivalent using SovereignSeas
            uint256 celoEquivalent = sovereignSeas.getTokenToCeloEquivalent(_token, _amount);
            
            // In a real implementation, you'd swap the token to CELO here
            // For now, we assume the contract handles this conversion
        }
        
        emit ContractTopUp(_token, _amount > 0 ? _amount : msg.value, msg.sender);
    }
    
    /**
     * @notice Withdraw accumulated fees (owner only)
     * @param _token Token to withdraw
     * @param _amount Amount to withdraw
     */
    function withdrawFees(address _token, uint256 _amount) external onlyOwner nonReentrant {
        if (_token == sovereignSeas.celoToken()) {
            require(address(this).balance >= _amount, "Insufficient balance");
            payable(owner()).transfer(_amount);
        } else {
            require(IERC20(_token).balanceOf(address(this)) >= _amount, "Insufficient balance");
            IERC20(_token).safeTransfer(owner(), _amount);
        }
        
        emit FeesWithdrawn(_token, _amount, owner());
    }
    
    /**
     * @notice Emergency withdraw all funds (super admin only)
     * @param _token Token to withdraw (address(0) for native CELO)
     */
    function emergencyWithdraw(address _token) external onlySuperAdmin {
        uint256 amount;
        
        if (_token == address(0) || _token == sovereignSeas.celoToken()) {
            amount = address(this).balance;
            if (amount > 0) {
                payable(owner()).transfer(amount);
            }
        } else {
            amount = IERC20(_token).balanceOf(address(this));
            if (amount > 0) {
                IERC20(_token).safeTransfer(owner(), amount);
            }
        }
        
        emit EmergencyAction("emergencyWithdraw", msg.sender, "Emergency withdrawal executed");
    }
    
    // =============================================================================
    // ADMIN FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Add authorized admin
     */
    function addAuthorizedAdmin(address _admin) external onlySuperAdmin {
        authorizedAdmins[_admin] = true;
        emit AdminAdded(_admin, msg.sender);
    }
    
    /**
     * @notice Remove authorized admin
     */
    function removeAuthorizedAdmin(address _admin) external onlySuperAdmin {
        authorizedAdmins[_admin] = false;
        emit AdminRemoved(_admin, msg.sender);
    }
    
    /**
     * @notice Update contract settings
     */
    function updateSettings(
        uint256 _voteAmount,
        bool _claimAndVoteEnabled,
        uint256 _claimCooldown
    ) external onlyOwner {
        emit SettingsUpdated("voteAmountPerUser", voteAmountPerUser, _voteAmount);
        voteAmountPerUser = _voteAmount;
        
        claimAndVoteEnabled = _claimAndVoteEnabled;
        
        emit SettingsUpdated("claimCooldown", claimCooldown, _claimCooldown);
        claimCooldown = _claimCooldown;
    }
    
    /**
     * @notice Update verification registry
     */
    function updateVerificationRegistry(address _newRegistry) external onlyOwner {
        require(_newRegistry != address(0), "Invalid registry address");
        verificationRegistry = IVerificationRegistry(_newRegistry);
    }
    
    // =============================================================================
    // VIEW FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Get claim and vote details
     */
    function getClaimAndVote(uint256 _claimId) external view returns (
        uint256 id,
        address admin,
        address beneficiary,
        uint256 campaignId,
        uint256 amount,
        ClaimStatus status,
        uint256 createdAt,
        uint256 approvedAt,
        uint256 fulfilledAt,
        address approvedBy,
        address fulfilledBy,
        string memory metadata
    ) {
        ClaimAndVote storage claimAndVote = claimAndVotes[_claimId];
        return (
            claimAndVote.id,
            claimAndVote.admin,
            claimAndVote.beneficiary,
            claimAndVote.campaignId,
            claimAndVote.amount,
            claimAndVote.status,
            claimAndVote.createdAt,
            claimAndVote.approvedAt,
            claimAndVote.fulfilledAt,
            claimAndVote.approvedBy,
            claimAndVote.fulfilledBy,
            claimAndVote.metadata
        );
    }
    
    /**
     * @notice Get all pending claims
     */
    function getPendingClaimsAndVotes() external view returns (uint256[] memory) {
        return pendingClaimAndVoteIds;
    }
    
    /**
     * @notice Get claims by campaign
     */
    function getClaimsByCampaign(uint256 _campaignId) external view returns (uint256[] memory) {
        return claimsByCampaign[_campaignId];
    }
    
    /**
     * @notice Get admin's claims
     */
    function getAdminClaims(address _admin) external view returns (uint256[] memory) {
        return adminClaims[_admin];
    }
    
    /**
     * @notice Get beneficiary's claims
     */
    function getBeneficiaryClaims(address _beneficiary) external view returns (uint256[] memory) {
        return beneficiaryClaims[_beneficiary];
    }
    
    /**
     * @notice Get campaign statistics
     */
    function getCampaignStats(uint256 _campaignId) external view returns (
        uint256 totalClaims,
        uint256 totalVotes,
        uint256 totalValue,
        uint256 uniqueClaimants
    ) {
        CampaignStats storage stats = campaignStats[_campaignId];
        return (
            stats.totalClaims,
            stats.totalVotes,
            stats.totalValue,
            stats.uniqueClaimants
        );
    }
    
    /**
     * @notice Check if user can have claim created for campaign
     */
    function canCreateClaimForUser(address _user, uint256 _campaignId) external view returns (bool, string memory) {
        if (!claimAndVoteEnabled) return (false, "Claim and vote disabled");
        if (!verificationRegistry.isVerified(_user)) return (false, "User not verified");
        if (_user.balance < MIN_CELO_BALANCE) return (false, "User must have at least 10 CELO");
        if (campaignStats[_campaignId].hasClaimedForCampaign[_user]) return (false, "Already claimed for campaign");
        if (block.timestamp < userLastClaimTime[_user] + claimCooldown) return (false, "Cooldown not passed");
        
        // Check campaign status
        (,,,,,,,, bool active,,, bool funded,) = sovereignSeas.campaigns(_campaignId);
        if (!active || !funded) return (false, "Campaign not active or funded");
        
        return (true, "Can create claim");
    }
    
    /**
     * @notice Get contract balance for token
     */
    function getContractBalance(address _token) external view returns (uint256) {
        if (_token == sovereignSeas.celoToken()) {
            return address(this).balance;
        } else {
            return IERC20(_token).balanceOf(address(this));
        }
    }
    
    /**
     * @notice Get total stats
     */
    function getTotalStats() external view returns (
        uint256 _totalClaimAndVotes,
        uint256 _totalVotesCast,
        uint256 _totalValueDistributed,
        uint256 _totalFeesCollected,
        uint256 _pendingClaims
    ) {
        return (
            totalClaimAndVotes,
            totalVotesCast,
            totalValueDistributed,
            totalFeesCollected,
            pendingClaimAndVoteIds.length
        );
    }
    
    // =============================================================================
    // INTERNAL HELPER FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Remove claim from pending claims array
     */
    function _removePendingClaim(uint256 _claimId) internal {
        for (uint256 i = 0; i < pendingClaimAndVoteIds.length; i++) {
            if (pendingClaimAndVoteIds[i] == _claimId) {
                pendingClaimAndVoteIds[i] = pendingClaimAndVoteIds[pendingClaimAndVoteIds.length - 1];
                pendingClaimAndVoteIds.pop();
                break;
            }
        }
    }
    
    // =============================================================================
    // FALLBACK FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Receive function for native CELO deposits
     */
    receive() external payable {
        emit ContractTopUp(sovereignSeas.celoToken(), msg.value, msg.sender);
    }
    
    /**
     * @notice Fallback function
     */
    fallback() external payable {
        emit ContractTopUp(sovereignSeas.celoToken(), msg.value, msg.sender);
    }
}