// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Interface for SovereignSeasV4
 */
interface ISovereignSeasV4 {
    function nextProjectId() external view returns (uint256);
    function nextCampaignId() external view returns (uint256);
    function getProject(uint256 _projectId) external view returns (
        uint256 id,
        address owner,
        string memory name,
        string memory description,
        bool transferrable,
        bool active,
        uint256 createdAt,
        uint256[] memory campaignIds
    );
    function getCampaign(uint256 _campaignId) external view returns (
        uint256 id,
        address admin,
        string memory name,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        uint256 adminFeePercentage,
        uint256 maxWinners,
        bool useQuadraticDistribution,
        bool useCustomDistribution,
        address payoutToken,
        bool active,
        uint256 totalFunds
    );
    function supportedTokens(address _token) external view returns (bool);
    function superAdmins(address _admin) external view returns (bool);
    function isCampaignAdmin(uint256 _campaignId, address _admin) external view returns (bool);
    function celoToken() external view returns (IERC20);
    function owner() external view returns (address);
}

/**
 * @title MilestoneBasedFunding
 * @dev Contract for milestone-based grant funding that interacts with deployed SovereignSeasV4
 * Supports escrow, time-locked approvals, and multi-token grants
 */
contract MilestoneBasedFunding is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Interface to deployed seas4 contract
    ISovereignSeasV4 public seas4Contract;
    IERC20 public celoToken;
    
    // Fee tracking (separate from seas4)
    mapping(address => uint256) public collectedFees;

    // Enums
    enum EntityType { PROJECT, CAMPAIGN }
    enum GrantStatus { ACTIVE, COMPLETED, CANCELLED }
    enum MilestoneStatus { PENDING, SUBMITTED, APPROVED, REJECTED, PAID, LOCKED }
    enum ProjectMilestoneType { INTERNAL, ASSIGNED, OPEN }
    enum ProjectMilestoneStatus { DRAFT, ACTIVE, CLAIMED, SUBMITTED, APPROVED, REJECTED, PAID, CANCELLED }

    // State Variables
    uint256 public nextGrantId;
    uint256 public nextMilestoneId;
    uint256 public nextProjectMilestoneId;
    uint256 public constant MIN_SITE_FEE = 1;
    uint256 public constant MAX_SITE_FEE = 5;
    uint256 public projectMilestonePlatformFee = 2; // 2% platform fee for project milestones (0-100)

    // Mappings
    mapping(uint256 => Grant) public grants;
    mapping(uint256 => Milestone) public milestones;
    mapping(uint256 => uint256[]) public grantMilestones; // grantId => milestoneIds[]
    mapping(uint256 => mapping(uint256 => bool)) public grantHasMilestone; // grantId => milestoneId => exists
    mapping(uint256 => address[]) public grantAdmins; // grantId => admins[]
    mapping(uint256 => mapping(address => bool)) public isGrantAdmin; // grantId => admin => isAdmin
    
    // Project Milestone Mappings
    mapping(uint256 => ProjectMilestone) public projectMilestones;
    mapping(uint256 => uint256[]) public projectMilestoneIds; // projectId => milestoneIds[]
    mapping(uint256 => mapping(uint256 => bool)) public projectHasMilestone; // projectId => milestoneId => exists
    mapping(uint256 => address[]) public milestoneStewards; // milestoneId => stewards[]
    mapping(uint256 => mapping(address => bool)) public isMilestoneSteward; // milestoneId => steward => isSteward
    mapping(address => uint256[]) public userClaimedMilestones; // user => milestoneIds[]
    mapping(address => mapping(uint256 => bool)) public hasUserClaimedMilestone; // user => milestoneId => hasClaimed

    // Structs
    struct Grant {
        uint256 id;
        address grantee;
        uint256 linkedEntityId;
        EntityType entityType;
        address[] supportedTokens;
        mapping(address => uint256) totalAmounts;
        mapping(address => uint256) releasedAmounts;
        mapping(address => uint256) escrowedAmounts;
        uint256 siteFeePercentage; // 1-5%
        uint256 reviewTimeLock; // in seconds
        uint256 milestoneDeadline; // Deadline for milestone submissions (0 = no deadline)
        GrantStatus status;
        uint256 createdAt;
        uint256 completedAt;
    }

    struct Milestone {
        uint256 id;
        uint256 grantId;
        string title;
        string description;
        string evidenceHash; // IPFS hash
        uint256 percentage; // Percentage of grant (same for all tokens)
        mapping(address => uint256) payoutAmounts; // Calculated payout per token
        MilestoneStatus status;
        uint256 submittedAt;
        uint256 reviewDeadline;
        uint256 approvedAt;
        address approvedBy;
        string approvalMessage;
        string rejectionMessage;
        address rejectedBy;
        uint256 rejectedAt;
        bool autoApproved;
        uint256 paidAt;
        uint256 deadline; // Deadline for this milestone submission
        uint256 penaltyPercentage; // Penalty applied (0-100)
        bool isLocked; // True if milestone is locked out
    }

    struct ProjectMilestone {
        uint256 id;
        uint256 projectId;
        ProjectMilestoneType milestoneType;
        ProjectMilestoneStatus status;
        
        // Assignment
        address assignedTo;              // For ASSIGNED type
        address claimedBy;               // For OPEN type (who claimed it)
        
        // Content
        string title;
        string description;
        string requirements;             // What needs to be done
        string evidenceHash;             // IPFS hash of submitted evidence
        
        // Funding
        address[] supportedTokens;
        mapping(address => uint256) rewardAmounts;  // Reward per token
        mapping(address => uint256) escrowedAmounts;
        
        // Approval
        address[] approvers;             // Project owner + stewards
        mapping(address => bool) isApprover;
        mapping(address => bool) hasApproved;
        uint256 requiredApprovals;       // How many approvals needed (default: 1)
        bool allowSiteAdminApproval;     // Can site admin approve?
        
        // Timestamps
        uint256 createdAt;
        uint256 deadline;                // 0 = no deadline
        uint256 claimedAt;
        uint256 submittedAt;
        uint256 approvedAt;
        uint256 paidAt;
        
        // Metadata
        string approvalMessage;
        string rejectionMessage;
        address approvedBy;
        address rejectedBy;
        uint256 rejectedAt;
    }

    // Events
    event GrantCreated(
        uint256 indexed grantId,
        uint256 indexed linkedEntityId,
        EntityType entityType,
        address indexed grantee,
        address[] tokens,
        uint256[] amounts,
        uint256 siteFeePercentage,
        uint256 reviewTimeLock
    );

    event MilestoneSubmitted(
        uint256 indexed grantId,
        uint256 indexed milestoneId,
        address indexed grantee,
        string title,
        string evidenceHash,
        uint256 percentage
    );

    event MilestoneApproved(
        uint256 indexed grantId,
        uint256 indexed milestoneId,
        address indexed approver,
        string message,
        bool autoApproved
    );

    event MilestoneRejected(
        uint256 indexed grantId,
        uint256 indexed milestoneId,
        address indexed rejector,
        string message
    );

    event MilestoneFundsReleased(
        uint256 indexed grantId,
        uint256 indexed milestoneId,
        address indexed grantee,
        address token,
        uint256 amount,
        uint256 siteFee
    );

    event FundsAddedToGrant(
        uint256 indexed grantId,
        address indexed token,
        uint256 amount,
        address addedBy
    );

    event FundsWithdrawnFromGrant(
        uint256 indexed grantId,
        address indexed token,
        uint256 amount,
        address recipient,
        address withdrawnBy
    );

    event MilestonePenaltyApplied(
        uint256 indexed grantId,
        uint256 indexed milestoneId,
        uint256 penaltyPercentage,
        string reason
    );

    event MilestoneLocked(
        uint256 indexed grantId,
        uint256 indexed milestoneId,
        string reason
    );

    event GrantCancelled(
        uint256 indexed grantId,
        address indexed cancelledBy,
        address[] tokens,
        uint256[] refundedAmounts
    );

    event GrantCompleted(
        uint256 indexed grantId,
        address indexed grantee,
        uint256 completedAt
    );

    event GrantAdminAdded(
        uint256 indexed grantId,
        address indexed admin,
        address indexed addedBy
    );

    event GrantAdminRemoved(
        uint256 indexed grantId,
        address indexed admin,
        address indexed removedBy
    );

    event MilestoneResubmitted(
        uint256 indexed grantId,
        uint256 indexed milestoneId,
        string newEvidenceHash
    );

    event FeeCollected(
        address indexed token,
        uint256 amount,
        string feeType
    );

    // Project Milestone Events
    event ProjectMilestoneCreated(
        uint256 indexed projectId,
        uint256 indexed milestoneId,
        ProjectMilestoneType milestoneType,
        address indexed assignedTo,
        string title
    );

    event ProjectMilestoneFunded(
        uint256 indexed milestoneId,
        address indexed token,
        uint256 amount,
        address indexed funder
    );

    event OpenMilestoneClaimed(
        uint256 indexed milestoneId,
        address indexed claimedBy
    );

    event ProjectMilestoneEvidenceSubmitted(
        uint256 indexed milestoneId,
        address indexed submitter,
        string evidenceHash
    );

    event ProjectMilestoneApproved(
        uint256 indexed milestoneId,
        address indexed approver,
        string message
    );

    event ProjectMilestoneRejected(
        uint256 indexed milestoneId,
        address indexed rejector,
        string message
    );

    event ProjectMilestoneRewardsClaimed(
        uint256 indexed milestoneId,
        address indexed recipient,
        address indexed token,
        uint256 amount
    );

    event ProjectMilestoneCancelled(
        uint256 indexed milestoneId,
        address indexed cancelledBy
    );

    event MilestoneStewardAdded(
        uint256 indexed milestoneId,
        address indexed steward,
        address indexed addedBy
    );

    event MilestoneStewardRemoved(
        uint256 indexed milestoneId,
        address indexed steward,
        address indexed removedBy
    );

    // Modifiers
    modifier onlyGrantAdmin(uint256 _grantId) {
        require(
            isGrantAdmin[_grantId][msg.sender] || 
            seas4Contract.superAdmins(msg.sender) ||
            _isCampaignAdminForGrant(_grantId),
            "Only grant admin can call this function"
        );
        _;
    }

    modifier onlyGrantee(uint256 _grantId) {
        require(grants[_grantId].grantee == msg.sender, "Only grantee can call this function");
        _;
    }

    modifier validGrant(uint256 _grantId) {
        require(_grantId < nextGrantId, "Grant does not exist");
        require(grants[_grantId].status == GrantStatus.ACTIVE, "Grant is not active");
        _;
    }

    modifier validMilestone(uint256 _milestoneId) {
        require(_milestoneId < nextMilestoneId, "Milestone does not exist");
        _;
    }

    modifier validSiteFee(uint256 _fee) {
        require(_fee >= MIN_SITE_FEE && _fee <= MAX_SITE_FEE, "Site fee must be between 1-5%");
        _;
    }

    modifier onlyProjectOwner(uint256 _projectId) {
        (, address projectOwner,,,,,,) = seas4Contract.getProject(_projectId);
        require(projectOwner == msg.sender, "Only project owner can call this function");
        _;
    }

    modifier validProjectMilestone(uint256 _milestoneId) {
        require(_milestoneId < nextProjectMilestoneId, "Project milestone does not exist");
        _;
    }

    modifier onlyProjectMilestoneApprover(uint256 _milestoneId) {
        ProjectMilestone storage pm = projectMilestones[_milestoneId];
        require(
            pm.isApprover[msg.sender] || 
            (pm.allowSiteAdminApproval && seas4Contract.superAdmins(msg.sender)),
            "Not authorized to approve this milestone"
        );
        _;
    }

    constructor(address _seas4Contract) Ownable(msg.sender) validAddress(_seas4Contract) {
        seas4Contract = ISovereignSeasV4(_seas4Contract);
        celoToken = seas4Contract.celoToken();
    }
    
    /**
     * @dev Update the seas4 contract address (only owner)
     */
    function updateSeas4Contract(address _seas4Contract) external onlyOwner validAddress(_seas4Contract) {
        seas4Contract = ISovereignSeasV4(_seas4Contract);
        celoToken = seas4Contract.celoToken();
    }
    
    modifier validAddress(address _addr) {
        require(_addr != address(0), "Invalid address");
        _;
    }

    /**
     * @dev Check if caller is campaign admin for campaign-linked grants
     */
    function _isCampaignAdminForGrant(uint256 _grantId) internal view returns (bool) {
        Grant storage grant = grants[_grantId];
        if (grant.entityType == EntityType.CAMPAIGN) {
            return seas4Contract.isCampaignAdmin(grant.linkedEntityId, msg.sender);
        }
        return false;
    }

    /**
     * @dev Create a new grant with escrowed funds
     * @param _linkedEntityId Project ID or Campaign ID
     * @param _entityType PROJECT or CAMPAIGN
     * @param _grantee Address receiving the grant
     * @param _tokens Array of token addresses
     * @param _amounts Array of amounts per token (must match _tokens length)
     * @param _siteFeePercentage Site fee percentage (1-5)
     * @param _reviewTimeLock Time lock in seconds for auto-approval
     * @param _milestoneDeadline Deadline for milestone submissions (0 = no deadline)
     */
    function createGrant(
        uint256 _linkedEntityId,
        EntityType _entityType,
        address _grantee,
        address[] memory _tokens,
        uint256[] memory _amounts,
        uint256 _siteFeePercentage,
        uint256 _reviewTimeLock,
        uint256 _milestoneDeadline
    ) external payable validAddress(_grantee) validSiteFee(_siteFeePercentage) nonReentrant {
        require(_tokens.length == _amounts.length && _tokens.length > 0, "Invalid tokens/amounts");
        require(_reviewTimeLock > 0, "Review time lock must be greater than 0");

        // Validate entity exists
        if (_entityType == EntityType.PROJECT) {
            require(_linkedEntityId < seas4Contract.nextProjectId(), "Project does not exist");
            (,,,,, bool active,,) = seas4Contract.getProject(_linkedEntityId);
            require(active, "Project is not active");
        } else {
            require(_linkedEntityId < seas4Contract.nextCampaignId(), "Campaign does not exist");
            (,,,,,,,,,,, bool active,) = seas4Contract.getCampaign(_linkedEntityId);
            require(active, "Campaign is not active");
            // Only campaign admins or super admins can create campaign-linked grants
            require(
                seas4Contract.isCampaignAdmin(_linkedEntityId, msg.sender) || seas4Contract.superAdmins(msg.sender),
                "Only campaign admin can create campaign-linked grant"
            );
        }

        uint256 grantId = nextGrantId++;
        Grant storage newGrant = grants[grantId];
        newGrant.id = grantId;
        newGrant.grantee = _grantee;
        newGrant.linkedEntityId = _linkedEntityId;
        newGrant.entityType = _entityType;
        newGrant.siteFeePercentage = _siteFeePercentage;
        newGrant.reviewTimeLock = _reviewTimeLock;
        newGrant.milestoneDeadline = _milestoneDeadline; // 0 means no deadline
        newGrant.status = GrantStatus.ACTIVE;
        newGrant.createdAt = block.timestamp;

        // Calculate total CELO needed
        uint256 totalCeloNeeded = 0;
        for (uint256 i = 0; i < _tokens.length; i++) {
            if (_tokens[i] == address(celoToken)) {
                totalCeloNeeded += _amounts[i];
            }
        }

        // Validate CELO sent if needed
        if (totalCeloNeeded > 0) {
            require(msg.value >= totalCeloNeeded, "Insufficient CELO sent");
        } else {
            require(msg.value == 0, "CELO sent but not needed");
        }

        // Set up tokens and escrow funds
        uint256 celoTransferred = 0;
        for (uint256 i = 0; i < _tokens.length; i++) {
            address token = _tokens[i];
            uint256 amount = _amounts[i];
            
            require(seas4Contract.supportedTokens(token), "Token not supported");
            require(amount > 0, "Amount must be greater than 0");

            newGrant.supportedTokens.push(token);
            newGrant.totalAmounts[token] = amount;
            newGrant.escrowedAmounts[token] = amount;

            // Escrow funds
            if (token == address(celoToken)) {
                celoTransferred += amount;
            } else {
                IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
            }
        }

        // Refund excess CELO if any
        if (msg.value > celoTransferred) {
            payable(msg.sender).transfer(msg.value - celoTransferred);
        }

        // Set grant admins
        if (_entityType == EntityType.CAMPAIGN) {
            // Campaign admins become grant admins
            (, address campaignAdmin,,,,,,,,,,,) = seas4Contract.getCampaign(_linkedEntityId);
            grantAdmins[grantId].push(campaignAdmin);
            isGrantAdmin[grantId][campaignAdmin] = true;
            
            // Add other campaign admins
            // Note: We can't iterate campaign admins, so we'll add them as needed via addGrantAdmin
        } else {
            // For project grants, super admins are grant admins by default
            // Can add specific admins later
        }

        emit GrantCreated(
            grantId,
            _linkedEntityId,
            _entityType,
            _grantee,
            _tokens,
            _amounts,
            _siteFeePercentage,
            _reviewTimeLock
        );
        // Note: milestoneDeadline is not in event to maintain backward compatibility
    }

    /**
     * @dev Add a grant admin
     */
    function addGrantAdmin(uint256 _grantId, address _admin) external onlyGrantAdmin(_grantId) validAddress(_admin) {
        require(!isGrantAdmin[_grantId][_admin], "Already a grant admin");
        grantAdmins[_grantId].push(_admin);
        isGrantAdmin[_grantId][_admin] = true;
        emit GrantAdminAdded(_grantId, _admin, msg.sender);
    }

    /**
     * @dev Remove a grant admin
     */
    function removeGrantAdmin(uint256 _grantId, address _admin) external onlyGrantAdmin(_grantId) {
        require(isGrantAdmin[_grantId][_admin], "Not a grant admin");
        require(_admin != msg.sender, "Cannot remove yourself");
        isGrantAdmin[_grantId][_admin] = false;
        emit GrantAdminRemoved(_grantId, _admin, msg.sender);
    }

    /**
     * @dev Submit a milestone for approval
     * @param _grantId Grant ID
     * @param _title Milestone title
     * @param _description Milestone description
     * @param _evidenceHash IPFS hash of evidence
     * @param _percentage Percentage of grant (must sum to <= 100% across all milestones)
     */
    function submitMilestone(
        uint256 _grantId,
        string memory _title,
        string memory _description,
        string memory _evidenceHash,
        uint256 _percentage
    ) external onlyGrantee(_grantId) validGrant(_grantId) {
        require(_percentage > 0 && _percentage <= 100, "Invalid percentage");
        require(bytes(_title).length > 0, "Title required");
        require(bytes(_evidenceHash).length > 0, "Evidence hash required");

        // Check total percentage doesn't exceed 100%
        uint256 totalPercentage = _percentage;
        uint256[] memory milestoneIds = grantMilestones[_grantId];
        for (uint256 i = 0; i < milestoneIds.length; i++) {
            Milestone storage ms = milestones[milestoneIds[i]];
            if (ms.status == MilestoneStatus.PENDING || 
                ms.status == MilestoneStatus.SUBMITTED || 
                ms.status == MilestoneStatus.APPROVED ||
                ms.status == MilestoneStatus.PAID) {
                totalPercentage += ms.percentage;
            }
        }
        require(totalPercentage <= 100, "Total milestone percentage exceeds 100%");

        Grant storage grant = grants[_grantId];
        
        // Check if milestone should be locked (1 month past deadline)
        uint256 currentDeadline = grant.milestoneDeadline > 0 ? grant.milestoneDeadline : type(uint256).max;
        uint256 oneMonth = 30 days;
        
        if (grant.milestoneDeadline > 0 && block.timestamp > grant.milestoneDeadline + oneMonth) {
            // Milestone is locked out - cannot submit
            revert("Milestone submission deadline has passed and milestone is locked");
        }

        uint256 milestoneId = nextMilestoneId++;
        Milestone storage newMilestone = milestones[milestoneId];
        newMilestone.id = milestoneId;
        newMilestone.grantId = _grantId;
        newMilestone.title = _title;
        newMilestone.description = _description;
        newMilestone.evidenceHash = _evidenceHash;
        newMilestone.percentage = _percentage;
        newMilestone.deadline = currentDeadline;
        newMilestone.submittedAt = block.timestamp;
        newMilestone.reviewDeadline = block.timestamp + grant.reviewTimeLock;
        
        // Check if submitted late and apply penalty
        uint256 penaltyPercentage = 0;
        if (grant.milestoneDeadline > 0 && block.timestamp > grant.milestoneDeadline) {
            // Submitted after deadline but within 1 month - apply 5% penalty
            if (block.timestamp <= grant.milestoneDeadline + oneMonth) {
                penaltyPercentage = 5;
                newMilestone.penaltyPercentage = penaltyPercentage;
                emit MilestonePenaltyApplied(_grantId, milestoneId, penaltyPercentage, "Submitted after deadline");
            }
        }
        
        newMilestone.status = MilestoneStatus.SUBMITTED;

        // Calculate payout amounts per token (with penalty deduction if applicable)
        for (uint256 i = 0; i < grant.supportedTokens.length; i++) {
            address token = grant.supportedTokens[i];
            uint256 basePayout = (grant.totalAmounts[token] * _percentage) / 100;
            // Apply penalty: reduce payout by penalty percentage
            uint256 payout = penaltyPercentage > 0 
                ? (basePayout * (100 - penaltyPercentage)) / 100 
                : basePayout;
            newMilestone.payoutAmounts[token] = payout;
        }

        grantMilestones[_grantId].push(milestoneId);
        grantHasMilestone[_grantId][milestoneId] = true;

        emit MilestoneSubmitted(
            _grantId,
            milestoneId,
            grant.grantee,
            _title,
            _evidenceHash,
            _percentage
        );
    }

    /**
     * @dev Approve a milestone and release funds
     * @param _grantId Grant ID
     * @param _milestoneId Milestone ID
     * @param _message Approval message (required)
     */
    function approveMilestone(
        uint256 _grantId,
        uint256 _milestoneId,
        string memory _message
    ) external onlyGrantAdmin(_grantId) validGrant(_grantId) validMilestone(_milestoneId) nonReentrant {
        require(bytes(_message).length > 0, "Approval message required");
        require(grantHasMilestone[_grantId][_milestoneId], "Milestone not part of grant");

        Milestone storage milestone = milestones[_milestoneId];
        require(milestone.status == MilestoneStatus.SUBMITTED, "Milestone not submitted");
        require(milestone.grantId == _grantId, "Milestone grant mismatch");

        milestone.status = MilestoneStatus.APPROVED;
        milestone.approvedAt = block.timestamp;
        milestone.approvedBy = msg.sender;
        milestone.approvalMessage = _message;
        milestone.autoApproved = false;

        _releaseMilestoneFunds(_grantId, _milestoneId);

        emit MilestoneApproved(_grantId, _milestoneId, msg.sender, _message, false);
    }

    /**
     * @dev Reject a milestone
     * @param _grantId Grant ID
     * @param _milestoneId Milestone ID
     * @param _message Rejection message (required)
     */
    function rejectMilestone(
        uint256 _grantId,
        uint256 _milestoneId,
        string memory _message
    ) external onlyGrantAdmin(_grantId) validGrant(_grantId) validMilestone(_milestoneId) {
        require(bytes(_message).length > 0, "Rejection message required");
        require(grantHasMilestone[_grantId][_milestoneId], "Milestone not part of grant");

        Milestone storage milestone = milestones[_milestoneId];
        require(milestone.status == MilestoneStatus.SUBMITTED, "Milestone not submitted");
        require(milestone.grantId == _grantId, "Milestone grant mismatch");

        milestone.status = MilestoneStatus.REJECTED;
        milestone.rejectedAt = block.timestamp;
        milestone.rejectedBy = msg.sender;
        milestone.rejectionMessage = _message;

        emit MilestoneRejected(_grantId, _milestoneId, msg.sender, _message);
    }

    /**
     * @dev Check and auto-approve milestone if review deadline passed
     * @param _grantId Grant ID
     * @param _milestoneId Milestone ID
     */
    function checkAndAutoApproveMilestone(
        uint256 _grantId,
        uint256 _milestoneId
    ) external validGrant(_grantId) validMilestone(_milestoneId) nonReentrant {
        require(grantHasMilestone[_grantId][_milestoneId], "Milestone not part of grant");

        Milestone storage milestone = milestones[_milestoneId];
        require(milestone.status == MilestoneStatus.SUBMITTED, "Milestone not submitted");
        require(milestone.grantId == _grantId, "Milestone grant mismatch");
        require(block.timestamp >= milestone.reviewDeadline, "Review deadline not reached");

        milestone.status = MilestoneStatus.APPROVED;
        milestone.approvedAt = block.timestamp;
        milestone.approvedBy = address(0); // Auto-approved
        milestone.approvalMessage = "Auto-approved after review deadline";
        milestone.autoApproved = true;

        _releaseMilestoneFunds(_grantId, _milestoneId);

        emit MilestoneApproved(_grantId, _milestoneId, address(0), "Auto-approved after review deadline", true);
    }

    /**
     * @dev Resubmit a rejected milestone
     * @param _grantId Grant ID
     * @param _milestoneId Milestone ID
     * @param _newEvidenceHash New IPFS hash
     */
    function resubmitMilestone(
        uint256 _grantId,
        uint256 _milestoneId,
        string memory _newEvidenceHash
    ) external onlyGrantee(_grantId) validGrant(_grantId) validMilestone(_milestoneId) {
        require(bytes(_newEvidenceHash).length > 0, "Evidence hash required");
        require(grantHasMilestone[_grantId][_milestoneId], "Milestone not part of grant");

        Milestone storage milestone = milestones[_milestoneId];
        require(milestone.status == MilestoneStatus.REJECTED, "Milestone not rejected");
        require(milestone.grantId == _grantId, "Milestone grant mismatch");

        milestone.status = MilestoneStatus.SUBMITTED;
        milestone.evidenceHash = _newEvidenceHash;
        milestone.submittedAt = block.timestamp;
        milestone.reviewDeadline = block.timestamp + grants[_grantId].reviewTimeLock;
        // Clear rejection data
        milestone.rejectedBy = address(0);
        milestone.rejectedAt = 0;
        milestone.rejectionMessage = "";

        emit MilestoneResubmitted(_grantId, _milestoneId, _newEvidenceHash);
        emit MilestoneSubmitted(
            _grantId,
            _milestoneId,
            grants[_grantId].grantee,
            milestone.title,
            _newEvidenceHash,
            milestone.percentage
        );
    }

    /**
     * @dev Internal function to release milestone funds
     */
    function _releaseMilestoneFunds(uint256 _grantId, uint256 _milestoneId) internal {
        Milestone storage milestone = milestones[_milestoneId];
        Grant storage grant = grants[_grantId];

        require(milestone.status == MilestoneStatus.APPROVED, "Milestone not approved");

        bool fundsReleased = false;
        for (uint256 i = 0; i < grant.supportedTokens.length; i++) {
            address token = grant.supportedTokens[i];
            uint256 payout = milestone.payoutAmounts[token];
            
            if (payout > 0 && grant.escrowedAmounts[token] >= payout) {
                fundsReleased = true;
                
                // Calculate site fee
                uint256 siteFee = (payout * grant.siteFeePercentage) / 100;
                uint256 granteeAmount = payout - siteFee;

                // Update grant tracking
                grant.escrowedAmounts[token] -= payout;
                grant.releasedAmounts[token] += payout;

                // Transfer to grantee
                if (token == address(celoToken)) {
                    payable(grant.grantee).transfer(granteeAmount);
                } else {
                    IERC20(token).safeTransfer(grant.grantee, granteeAmount);
                }

                // Collect site fee
                if (siteFee > 0) {
                    address platformOwner = seas4Contract.owner();
                    if (token == address(celoToken)) {
                        // Site fee goes to platform owner
                        payable(platformOwner).transfer(siteFee);
                    } else {
                        IERC20(token).safeTransfer(platformOwner, siteFee);
                    }
                    collectedFees[token] += siteFee;
                    emit FeeCollected(token, siteFee, "milestoneSiteFee");
                }

                emit MilestoneFundsReleased(
                    _grantId,
                    _milestoneId,
                    grant.grantee,
                    token,
                    granteeAmount,
                    siteFee
                );
            }
        }

        // Mark milestone as paid if funds were released
        if (fundsReleased) {
            milestone.status = MilestoneStatus.PAID;
            milestone.paidAt = block.timestamp;
        }

        // Check if grant is completed
        _checkGrantCompletion(_grantId);
    }

    /**
     * @dev Add funds to an existing grant
     * @param _grantId Grant ID
     * @param _tokens Array of token addresses
     * @param _amounts Array of amounts per token
     */
    function addFundsToGrant(
        uint256 _grantId,
        address[] memory _tokens,
        uint256[] memory _amounts
    ) external payable validGrant(_grantId) nonReentrant {
        require(_tokens.length == _amounts.length && _tokens.length > 0, "Invalid tokens/amounts");
        Grant storage grant = grants[_grantId];
        require(grant.status == GrantStatus.ACTIVE, "Grant must be active");

        // Calculate total CELO needed
        uint256 totalCeloNeeded = 0;
        for (uint256 i = 0; i < _tokens.length; i++) {
            if (_tokens[i] == address(celoToken)) {
                totalCeloNeeded += _amounts[i];
            }
        }

        // Validate CELO sent if needed
        if (totalCeloNeeded > 0) {
            require(msg.value >= totalCeloNeeded, "Insufficient CELO sent");
        }

        uint256 celoTransferred = 0;
        for (uint256 i = 0; i < _tokens.length; i++) {
            address token = _tokens[i];
            uint256 amount = _amounts[i];
            
            require(seas4Contract.supportedTokens(token), "Token not supported");
            require(amount > 0, "Amount must be greater than 0");

            // Check if token is already in grant, if not add it
            bool tokenExists = false;
            for (uint256 j = 0; j < grant.supportedTokens.length; j++) {
                if (grant.supportedTokens[j] == token) {
                    tokenExists = true;
                    break;
                }
            }
            
            if (!tokenExists) {
                grant.supportedTokens.push(token);
            }

            // Add to totals and escrow
            grant.totalAmounts[token] += amount;
            grant.escrowedAmounts[token] += amount;

            // Escrow funds
            if (token == address(celoToken)) {
                celoTransferred += amount;
            } else {
                IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
            }

            emit FundsAddedToGrant(_grantId, token, amount, msg.sender);
        }

        // Refund excess CELO
        if (msg.value > celoTransferred) {
            payable(msg.sender).transfer(msg.value - celoTransferred);
        }
    }

    /**
     * @dev Withdraw funds from a grant (only grant admin, before milestones are submitted)
     * @param _grantId Grant ID
     * @param _token Token address
     * @param _amount Amount to withdraw
     * @param _recipient Address to receive the funds
     */
    function withdrawFundsFromGrant(
        uint256 _grantId,
        address _token,
        uint256 _amount,
        address _recipient
    ) external onlyGrantAdmin(_grantId) validGrant(_grantId) validAddress(_recipient) nonReentrant {
        Grant storage grant = grants[_grantId];
        require(grant.status == GrantStatus.ACTIVE, "Grant must be active");
        
        // Check that no milestones have been submitted yet
        require(grantMilestones[_grantId].length == 0, "Cannot withdraw funds after milestones are submitted");
        
        require(grant.escrowedAmounts[_token] >= _amount, "Insufficient escrowed funds");
        require(_amount > 0, "Amount must be greater than 0");

        // Update escrowed amounts
        grant.escrowedAmounts[_token] -= _amount;
        grant.totalAmounts[_token] -= _amount;

        // Transfer funds
        if (_token == address(celoToken)) {
            payable(_recipient).transfer(_amount);
        } else {
            IERC20(_token).safeTransfer(_recipient, _amount);
        }

        emit FundsWithdrawnFromGrant(_grantId, _token, _amount, _recipient, msg.sender);
    }

    /**
     * @dev Check if all milestones are paid and mark grant as completed
     */
    function _checkGrantCompletion(uint256 _grantId) internal {
        Grant storage grant = grants[_grantId];
        if (grant.status != GrantStatus.ACTIVE) return;

        uint256[] memory milestoneIds = grantMilestones[_grantId];
        bool allPaid = true;
        uint256 totalPercentage = 0;

        for (uint256 i = 0; i < milestoneIds.length; i++) {
            Milestone storage ms = milestones[milestoneIds[i]];
            if (ms.status == MilestoneStatus.PAID) {
                totalPercentage += ms.percentage;
            } else if (ms.status == MilestoneStatus.SUBMITTED || ms.status == MilestoneStatus.APPROVED) {
                allPaid = false;
                break;
            }
        }

        // Grant is completed if all submitted milestones are paid AND total percentage is 100%
        if (allPaid && milestoneIds.length > 0 && totalPercentage == 100) {
            grant.status = GrantStatus.COMPLETED;
            grant.completedAt = block.timestamp;
            emit GrantCompleted(_grantId, grant.grantee, block.timestamp);
        }
    }

    /**
     * @dev Cancel a grant and refund escrowed funds
     * @param _grantId Grant ID
     * @param _refundTo Address to refund to (must be grant creator or super admin)
     */
    function cancelGrant(
        uint256 _grantId,
        address _refundTo
    ) external onlyGrantAdmin(_grantId) validAddress(_refundTo) nonReentrant {
        Grant storage grant = grants[_grantId];
        require(grant.status == GrantStatus.ACTIVE, "Grant not active");

        grant.status = GrantStatus.CANCELLED;

        address[] memory tokens = grant.supportedTokens;
        uint256[] memory refundedAmounts = new uint256[](tokens.length);

        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            uint256 refundAmount = grant.escrowedAmounts[token];
            
            if (refundAmount > 0) {
                grant.escrowedAmounts[token] = 0;
                refundedAmounts[i] = refundAmount;

                if (token == address(celoToken)) {
                    payable(_refundTo).transfer(refundAmount);
                } else {
                    IERC20(token).safeTransfer(_refundTo, refundAmount);
                }
            }
        }

        emit GrantCancelled(_grantId, msg.sender, tokens, refundedAmounts);
    }

    // View Functions

    /**
     * @dev Get grant details
     */
    function getGrant(uint256 _grantId) external view returns (
        uint256 id,
        address grantee,
        uint256 linkedEntityId,
        EntityType entityType,
        uint256 siteFeePercentage,
        uint256 reviewTimeLock,
        uint256 milestoneDeadline,
        GrantStatus status,
        uint256 createdAt,
        uint256 completedAt,
        address[] memory supportedTokens
    ) {
        Grant storage grant = grants[_grantId];
        return (
            grant.id,
            grant.grantee,
            grant.linkedEntityId,
            grant.entityType,
            grant.siteFeePercentage,
            grant.reviewTimeLock,
            grant.milestoneDeadline,
            grant.status,
            grant.createdAt,
            grant.completedAt,
            grant.supportedTokens
        );
    }

    /**
     * @dev Get grant token amounts
     */
    function getGrantTokenAmounts(uint256 _grantId, address _token) external view returns (
        uint256 totalAmount,
        uint256 releasedAmount,
        uint256 escrowedAmount
    ) {
        Grant storage grant = grants[_grantId];
        return (
            grant.totalAmounts[_token],
            grant.releasedAmounts[_token],
            grant.escrowedAmounts[_token]
        );
    }

    /**
     * @dev Get milestone details
     */
    function getMilestone(uint256 _milestoneId) external view returns (
        uint256 id,
        uint256 grantId,
        string memory title,
        string memory description,
        string memory evidenceHash,
        uint256 percentage,
        MilestoneStatus status,
        uint256 submittedAt,
        uint256 reviewDeadline,
        uint256 approvedAt,
        address approvedBy,
        string memory approvalMessage,
        bool autoApproved,
        uint256 paidAt,
        uint256 deadline,
        uint256 penaltyPercentage,
        bool isLocked
    ) {
        Milestone storage milestone = milestones[_milestoneId];
        return (
            milestone.id,
            milestone.grantId,
            milestone.title,
            milestone.description,
            milestone.evidenceHash,
            milestone.percentage,
            milestone.status,
            milestone.submittedAt,
            milestone.reviewDeadline,
            milestone.approvedAt,
            milestone.approvedBy,
            milestone.approvalMessage,
            milestone.autoApproved,
            milestone.paidAt,
            milestone.deadline,
            milestone.penaltyPercentage,
            milestone.isLocked
        );
    }

    /**
     * @dev Get milestone payout amount for a token
     */
    function getMilestonePayout(uint256 _milestoneId, address _token) external view returns (uint256) {
        return milestones[_milestoneId].payoutAmounts[_token];
    }

    /**
     * @dev Get milestone rejection details
     */
    function getMilestoneRejection(uint256 _milestoneId) external view returns (
        string memory rejectionMessage,
        address rejectedBy,
        uint256 rejectedAt
    ) {
        Milestone storage milestone = milestones[_milestoneId];
        return (
            milestone.rejectionMessage,
            milestone.rejectedBy,
            milestone.rejectedAt
        );
    }

    /**
     * @dev Get all milestone IDs for a grant
     */
    function getGrantMilestones(uint256 _grantId) external view returns (uint256[] memory) {
        return grantMilestones[_grantId];
    }

    /**
     * @dev Get grant admins
     */
    function getGrantAdmins(uint256 _grantId) external view returns (address[] memory) {
        return grantAdmins[_grantId];
    }

    /**
     * @dev Get grant count
     */
    function getGrantCount() external view returns (uint256) {
        return nextGrantId;
    }

    /**
     * @dev Get milestone count
     */
    function getMilestoneCount() external view returns (uint256) {
        return nextMilestoneId;
    }

    /**
     * @dev Check if milestone can be auto-approved
     */
    function canAutoApproveMilestone(uint256 _milestoneId) external view returns (bool) {
        Milestone storage milestone = milestones[_milestoneId];
        return (
            milestone.status == MilestoneStatus.SUBMITTED &&
            block.timestamp >= milestone.reviewDeadline
        );
    }

    // ============ PROJECT MILESTONE FUNCTIONS ============

    /**
     * @dev Create a new project milestone
     * @param _projectId Project ID (must exist in SovSeas)
     * @param _milestoneType INTERNAL, ASSIGNED, or OPEN
     * @param _assignedTo Address for ASSIGNED type (ignored for INTERNAL/OPEN)
     * @param _title Milestone title
     * @param _description Milestone description
     * @param _requirements What needs to be done
     * @param _deadline Deadline timestamp (0 = no deadline)
     * @param _requiredApprovals Number of approvals needed (default: 1)
     * @param _allowSiteAdminApproval Can site admin approve?
     * @param _stewards Array of steward addresses (optional)
     */
    function createProjectMilestone(
        uint256 _projectId,
        ProjectMilestoneType _milestoneType,
        address _assignedTo,
        string memory _title,
        string memory _description,
        string memory _requirements,
        uint256 _deadline,
        uint256 _requiredApprovals,
        bool _allowSiteAdminApproval,
        address[] memory _stewards
    ) external onlyProjectOwner(_projectId) {
        require(_projectId < seas4Contract.nextProjectId(), "Project does not exist");
        (,,,,, bool active,,) = seas4Contract.getProject(_projectId);
        require(active, "Project is not active");
        require(bytes(_title).length > 0, "Title required");
        require(_requiredApprovals > 0, "Required approvals must be > 0");

        uint256 milestoneId = nextProjectMilestoneId++;
        ProjectMilestone storage pm = projectMilestones[milestoneId];
        pm.id = milestoneId;
        pm.projectId = _projectId;
        pm.milestoneType = _milestoneType;
        pm.status = ProjectMilestoneStatus.DRAFT;
        pm.title = _title;
        pm.description = _description;
        pm.requirements = _requirements;
        pm.deadline = _deadline;
        pm.requiredApprovals = _requiredApprovals;
        pm.allowSiteAdminApproval = _allowSiteAdminApproval;
        pm.createdAt = block.timestamp;

        // Set assignment based on type
        (, address projectOwner,,,,,,) = seas4Contract.getProject(_projectId);
        if (_milestoneType == ProjectMilestoneType.INTERNAL) {
            pm.assignedTo = projectOwner;
        } else if (_milestoneType == ProjectMilestoneType.ASSIGNED) {
            require(_assignedTo != address(0), "Assigned address required");
            pm.assignedTo = _assignedTo;
        }
        // OPEN type: assignedTo remains address(0) until claimed

        // Add project owner as approver
        pm.approvers.push(projectOwner);
        pm.isApprover[projectOwner] = true;

        // Add stewards as approvers
        for (uint256 i = 0; i < _stewards.length; i++) {
            if (_stewards[i] != address(0) && !pm.isApprover[_stewards[i]]) {
                pm.approvers.push(_stewards[i]);
                pm.isApprover[_stewards[i]] = true;
                milestoneStewards[milestoneId].push(_stewards[i]);
                isMilestoneSteward[milestoneId][_stewards[i]] = true;
            }
        }

        projectMilestoneIds[_projectId].push(milestoneId);
        projectHasMilestone[_projectId][milestoneId] = true;

        emit ProjectMilestoneCreated(_projectId, milestoneId, _milestoneType, pm.assignedTo, _title);
    }

    /**
     * @dev Fund a project milestone with tokens
     * @param _milestoneId Milestone ID
     * @param _tokens Array of token addresses
     * @param _amounts Array of amounts per token
     */
    function fundProjectMilestone(
        uint256 _milestoneId,
        address[] memory _tokens,
        uint256[] memory _amounts
    ) external payable validProjectMilestone(_milestoneId) nonReentrant {
        require(_tokens.length == _amounts.length && _tokens.length > 0, "Invalid tokens/amounts");
        
        ProjectMilestone storage pm = projectMilestones[_milestoneId];
        require(
            pm.status == ProjectMilestoneStatus.DRAFT || pm.status == ProjectMilestoneStatus.ACTIVE,
            "Milestone not in fundable state"
        );

        // Calculate total CELO needed
        uint256 totalCeloNeeded = 0;
        for (uint256 i = 0; i < _tokens.length; i++) {
            if (_tokens[i] == address(celoToken)) {
                totalCeloNeeded += _amounts[i];
            }
        }

        // Validate CELO sent if needed
        if (totalCeloNeeded > 0) {
            require(msg.value >= totalCeloNeeded, "Insufficient CELO sent");
        }

        uint256 celoTransferred = 0;
        for (uint256 i = 0; i < _tokens.length; i++) {
            address token = _tokens[i];
            uint256 amount = _amounts[i];
            
            require(seas4Contract.supportedTokens(token), "Token not supported");
            require(amount > 0, "Amount must be greater than 0");

            // Check if token already exists
            bool tokenExists = false;
            for (uint256 j = 0; j < pm.supportedTokens.length; j++) {
                if (pm.supportedTokens[j] == token) {
                    tokenExists = true;
                    break;
                }
            }
            
            if (!tokenExists) {
                pm.supportedTokens.push(token);
            }

            // Add to rewards and escrow
            pm.rewardAmounts[token] += amount;
            pm.escrowedAmounts[token] += amount;

            // Escrow funds
            if (token == address(celoToken)) {
                celoTransferred += amount;
            } else {
                IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
            }

            emit ProjectMilestoneFunded(_milestoneId, token, amount, msg.sender);
        }

        // Refund excess CELO
        if (msg.value > celoTransferred) {
            payable(msg.sender).transfer(msg.value - celoTransferred);
        }

        // Activate milestone if it was in DRAFT
        if (pm.status == ProjectMilestoneStatus.DRAFT) {
            pm.status = ProjectMilestoneStatus.ACTIVE;
        }
    }

    /**
     * @dev Claim an open milestone
     * @param _milestoneId Milestone ID
     */
    function claimOpenMilestone(uint256 _milestoneId) external validProjectMilestone(_milestoneId) {
        ProjectMilestone storage pm = projectMilestones[_milestoneId];
        require(pm.milestoneType == ProjectMilestoneType.OPEN, "Not an open milestone");
        require(pm.status == ProjectMilestoneStatus.ACTIVE, "Milestone not active");
        require(pm.claimedBy == address(0), "Milestone already claimed");

        pm.claimedBy = msg.sender;
        pm.assignedTo = msg.sender;
        pm.status = ProjectMilestoneStatus.CLAIMED;
        pm.claimedAt = block.timestamp;

        if (!hasUserClaimedMilestone[msg.sender][_milestoneId]) {
            userClaimedMilestones[msg.sender].push(_milestoneId);
            hasUserClaimedMilestone[msg.sender][_milestoneId] = true;
        }

        emit OpenMilestoneClaimed(_milestoneId, msg.sender);
    }

    /**
     * @dev Submit evidence for milestone completion
     * @param _milestoneId Milestone ID
     * @param _evidenceHash IPFS hash of evidence
     */
    function submitMilestoneEvidence(
        uint256 _milestoneId,
        string memory _evidenceHash
    ) external validProjectMilestone(_milestoneId) {
        require(bytes(_evidenceHash).length > 0, "Evidence hash required");
        
        ProjectMilestone storage pm = projectMilestones[_milestoneId];
        
        // Check if user is authorized to submit
        if (pm.milestoneType == ProjectMilestoneType.OPEN) {
            require(pm.claimedBy == msg.sender, "Only claimer can submit");
            require(pm.status == ProjectMilestoneStatus.CLAIMED, "Milestone not claimed");
        } else {
            require(pm.assignedTo == msg.sender, "Only assigned user can submit");
            require(
                pm.status == ProjectMilestoneStatus.ACTIVE || pm.status == ProjectMilestoneStatus.REJECTED,
                "Invalid status for submission"
            );
        }

        pm.evidenceHash = _evidenceHash;
        pm.status = ProjectMilestoneStatus.SUBMITTED;
        pm.submittedAt = block.timestamp;

        // Reset approvals
        for (uint256 i = 0; i < pm.approvers.length; i++) {
            pm.hasApproved[pm.approvers[i]] = false;
        }

        emit ProjectMilestoneEvidenceSubmitted(_milestoneId, msg.sender, _evidenceHash);
    }

    /**
     * @dev Approve a project milestone
     * @param _milestoneId Milestone ID
     * @param _message Approval message
     */
    function approveProjectMilestone(
        uint256 _milestoneId,
        string memory _message
    ) external onlyProjectMilestoneApprover(_milestoneId) validProjectMilestone(_milestoneId) {
        ProjectMilestone storage pm = projectMilestones[_milestoneId];
        require(pm.status == ProjectMilestoneStatus.SUBMITTED, "Milestone not submitted");
        require(!pm.hasApproved[msg.sender], "Already approved");

        // Mark as approved (only if not site admin, site admin approval is separate)
        if (pm.isApprover[msg.sender]) {
            pm.hasApproved[msg.sender] = true;
        }

        // Count approvals
        uint256 approvalCount = 0;
        for (uint256 i = 0; i < pm.approvers.length; i++) {
            if (pm.hasApproved[pm.approvers[i]]) {
                approvalCount++;
            }
        }

        // Site admin approval counts as 1 if enabled
        if (pm.allowSiteAdminApproval && seas4Contract.superAdmins(msg.sender)) {
            approvalCount++;
        }

        if (approvalCount >= pm.requiredApprovals) {
            pm.status = ProjectMilestoneStatus.APPROVED;
            pm.approvedAt = block.timestamp;
            pm.approvedBy = msg.sender;
            pm.approvalMessage = _message;
            
            // Release funds
            _releaseProjectMilestoneFunds(_milestoneId);
        }

        emit ProjectMilestoneApproved(_milestoneId, msg.sender, _message);
    }

    /**
     * @dev Reject a project milestone
     * @param _milestoneId Milestone ID
     * @param _message Rejection message
     */
    function rejectProjectMilestone(
        uint256 _milestoneId,
        string memory _message
    ) external onlyProjectMilestoneApprover(_milestoneId) validProjectMilestone(_milestoneId) {
        require(bytes(_message).length > 0, "Rejection message required");
        
        ProjectMilestone storage pm = projectMilestones[_milestoneId];
        require(pm.status == ProjectMilestoneStatus.SUBMITTED, "Milestone not submitted");

        pm.status = ProjectMilestoneStatus.REJECTED;
        pm.rejectedBy = msg.sender;
        pm.rejectedAt = block.timestamp;
        pm.rejectionMessage = _message;

        // Reset approvals
        for (uint256 i = 0; i < pm.approvers.length; i++) {
            pm.hasApproved[pm.approvers[i]] = false;
        }

        emit ProjectMilestoneRejected(_milestoneId, msg.sender, _message);
    }

    /**
     * @dev Claim completion rewards for an approved milestone
     * @param _milestoneId Milestone ID
     */
    function claimCompletionRewards(uint256 _milestoneId) external validProjectMilestone(_milestoneId) nonReentrant {
        ProjectMilestone storage pm = projectMilestones[_milestoneId];
        require(pm.status == ProjectMilestoneStatus.APPROVED, "Milestone not approved");
        
        address recipient = pm.milestoneType == ProjectMilestoneType.OPEN ? pm.claimedBy : pm.assignedTo;
        require(recipient == msg.sender, "Only milestone assignee can claim rewards");

        _releaseProjectMilestoneFunds(_milestoneId);
    }

    /**
     * @dev Internal function to release project milestone funds
     */
    function _releaseProjectMilestoneFunds(uint256 _milestoneId) internal {
        ProjectMilestone storage pm = projectMilestones[_milestoneId];
        
        if (pm.status != ProjectMilestoneStatus.APPROVED) {
            return;
        }

        address recipient = pm.milestoneType == ProjectMilestoneType.OPEN ? pm.claimedBy : pm.assignedTo;
        require(recipient != address(0), "No recipient for milestone");

        bool fundsReleased = false;
        for (uint256 i = 0; i < pm.supportedTokens.length; i++) {
            address token = pm.supportedTokens[i];
            uint256 reward = pm.rewardAmounts[token];
            
            if (reward > 0 && pm.escrowedAmounts[token] >= reward) {
                fundsReleased = true;
                
                // Calculate platform fee
                uint256 platformFee = (reward * projectMilestonePlatformFee) / 100;
                uint256 recipientAmount = reward - platformFee;

                // Update escrowed amounts
                pm.escrowedAmounts[token] -= reward;

                // Transfer to recipient
                if (token == address(celoToken)) {
                    payable(recipient).transfer(recipientAmount);
                } else {
                    IERC20(token).safeTransfer(recipient, recipientAmount);
                }

                // Collect platform fee
                if (platformFee > 0) {
                    address platformOwner = seas4Contract.owner();
                    if (token == address(celoToken)) {
                        payable(platformOwner).transfer(platformFee);
                    } else {
                        IERC20(token).safeTransfer(platformOwner, platformFee);
                    }
                    collectedFees[token] += platformFee;
                    emit FeeCollected(token, platformFee, "projectMilestoneFee");
                }

                emit ProjectMilestoneRewardsClaimed(_milestoneId, recipient, token, recipientAmount);
            }
        }

        // Mark as paid if funds were released
        if (fundsReleased) {
            pm.status = ProjectMilestoneStatus.PAID;
            pm.paidAt = block.timestamp;
        }
    }

    /**
     * @dev Add a steward to a milestone
     * @param _milestoneId Milestone ID
     * @param _steward Steward address
     */
    function addMilestoneSteward(
        uint256 _milestoneId,
        address _steward
    ) external validProjectMilestone(_milestoneId) validAddress(_steward) {
        ProjectMilestone storage pm = projectMilestones[_milestoneId];
        (, address projectOwner,,,,,,) = seas4Contract.getProject(pm.projectId);
        require(projectOwner == msg.sender, "Only project owner can add stewards");
        require(!pm.isApprover[_steward], "Already an approver");

        pm.approvers.push(_steward);
        pm.isApprover[_steward] = true;
        milestoneStewards[_milestoneId].push(_steward);
        isMilestoneSteward[_milestoneId][_steward] = true;

        emit MilestoneStewardAdded(_milestoneId, _steward, msg.sender);
    }

    /**
     * @dev Remove a steward from a milestone
     * @param _milestoneId Milestone ID
     * @param _steward Steward address
     */
    function removeMilestoneSteward(
        uint256 _milestoneId,
        address _steward
    ) external validProjectMilestone(_milestoneId) {
        ProjectMilestone storage pm = projectMilestones[_milestoneId];
        (, address projectOwner,,,,,,) = seas4Contract.getProject(pm.projectId);
        require(projectOwner == msg.sender, "Only project owner can remove stewards");
        require(isMilestoneSteward[_milestoneId][_steward], "Not a steward");

        pm.isApprover[_steward] = false;
        isMilestoneSteward[_milestoneId][_steward] = false;

        emit MilestoneStewardRemoved(_milestoneId, _steward, msg.sender);
    }

    /**
     * @dev Cancel a project milestone and refund funds
     * @param _milestoneId Milestone ID
     */
    function cancelProjectMilestone(uint256 _milestoneId) external validProjectMilestone(_milestoneId) nonReentrant {
        ProjectMilestone storage pm = projectMilestones[_milestoneId];
        (, address projectOwner,,,,,,) = seas4Contract.getProject(pm.projectId);
        require(projectOwner == msg.sender, "Only project owner can cancel");
        require(
            pm.status == ProjectMilestoneStatus.DRAFT || 
            pm.status == ProjectMilestoneStatus.ACTIVE ||
            pm.status == ProjectMilestoneStatus.REJECTED,
            "Cannot cancel milestone in current state"
        );

        pm.status = ProjectMilestoneStatus.CANCELLED;

        // Refund all escrowed funds to project owner
        for (uint256 i = 0; i < pm.supportedTokens.length; i++) {
            address token = pm.supportedTokens[i];
            uint256 refundAmount = pm.escrowedAmounts[token];
            
            if (refundAmount > 0) {
                pm.escrowedAmounts[token] = 0;

                if (token == address(celoToken)) {
                    payable(projectOwner).transfer(refundAmount);
                } else {
                    IERC20(token).safeTransfer(projectOwner, refundAmount);
                }
            }
        }

        emit ProjectMilestoneCancelled(_milestoneId, msg.sender);
    }

    /**
     * @dev Update platform fee for project milestones (only owner)
     */
    function setProjectMilestonePlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 10, "Fee cannot exceed 10%");
        projectMilestonePlatformFee = _fee;
    }

    // ============ PROJECT MILESTONE VIEW FUNCTIONS ============

    /**
     * @dev Get project milestone details
     */
    function getProjectMilestone(uint256 _milestoneId) external view returns (
        uint256 id,
        uint256 projectId,
        ProjectMilestoneType milestoneType,
        ProjectMilestoneStatus status,
        address assignedTo,
        address claimedBy,
        string memory title,
        string memory description,
        string memory requirements,
        string memory evidenceHash,
        uint256 requiredApprovals,
        bool allowSiteAdminApproval,
        uint256 createdAt,
        uint256 deadline,
        uint256 claimedAt,
        uint256 submittedAt,
        uint256 approvedAt,
        uint256 paidAt,
        address[] memory supportedTokens
    ) {
        ProjectMilestone storage pm = projectMilestones[_milestoneId];
        return (
            pm.id,
            pm.projectId,
            pm.milestoneType,
            pm.status,
            pm.assignedTo,
            pm.claimedBy,
            pm.title,
            pm.description,
            pm.requirements,
            pm.evidenceHash,
            pm.requiredApprovals,
            pm.allowSiteAdminApproval,
            pm.createdAt,
            pm.deadline,
            pm.claimedAt,
            pm.submittedAt,
            pm.approvedAt,
            pm.paidAt,
            pm.supportedTokens
        );
    }

    /**
     * @dev Get project milestone reward amount for a token
     */
    function getProjectMilestoneReward(uint256 _milestoneId, address _token) external view returns (uint256) {
        return projectMilestones[_milestoneId].rewardAmounts[_token];
    }

    /**
     * @dev Get project milestone escrowed amount for a token
     */
    function getProjectMilestoneEscrowed(uint256 _milestoneId, address _token) external view returns (uint256) {
        return projectMilestones[_milestoneId].escrowedAmounts[_token];
    }

    /**
     * @dev Get all milestone IDs for a project
     */
    function getProjectMilestones(uint256 _projectId) external view returns (uint256[] memory) {
        return projectMilestoneIds[_projectId];
    }

    /**
     * @dev Get milestone approvers
     */
    function getMilestoneApprovers(uint256 _milestoneId) external view returns (address[] memory) {
        return projectMilestones[_milestoneId].approvers;
    }

    /**
     * @dev Check if address has approved milestone
     */
    function hasApprovedMilestone(uint256 _milestoneId, address _approver) external view returns (bool) {
        return projectMilestones[_milestoneId].hasApproved[_approver];
    }

    /**
     * @dev Get approval count for milestone
     */
    function getMilestoneApprovalCount(uint256 _milestoneId) external view returns (uint256) {
        ProjectMilestone storage pm = projectMilestones[_milestoneId];
        uint256 count = 0;
        for (uint256 i = 0; i < pm.approvers.length; i++) {
            if (pm.hasApproved[pm.approvers[i]]) {
                count++;
            }
        }
        return count;
    }

    /**
     * @dev Get milestone stewards
     */
    function getMilestoneStewards(uint256 _milestoneId) external view returns (address[] memory) {
        return milestoneStewards[_milestoneId];
    }

    /**
     * @dev Get milestones claimed by a user
     */
    function getUserClaimedMilestones(address _user) external view returns (uint256[] memory) {
        return userClaimedMilestones[_user];
    }

    /**
     * @dev Get project milestone count
     */
    function getProjectMilestoneCount() external view returns (uint256) {
        return nextProjectMilestoneId;
    }

    /**
     * @dev Check if user can submit milestone
     */
    function canSubmitMilestone(uint256 _milestoneId, address _user) external view returns (bool) {
        ProjectMilestone storage pm = projectMilestones[_milestoneId];
        
        if (pm.milestoneType == ProjectMilestoneType.OPEN) {
            return pm.claimedBy == _user && pm.status == ProjectMilestoneStatus.CLAIMED;
        } else {
            return pm.assignedTo == _user && 
                   (pm.status == ProjectMilestoneStatus.ACTIVE || pm.status == ProjectMilestoneStatus.REJECTED);
        }
    }

    /**
     * @dev Check if user can approve milestone
     */
    function canApproveMilestone(uint256 _milestoneId, address _user) external view returns (bool) {
        ProjectMilestone storage pm = projectMilestones[_milestoneId];
        return (pm.isApprover[_user] || (pm.allowSiteAdminApproval && seas4Contract.superAdmins(_user))) &&
               pm.status == ProjectMilestoneStatus.SUBMITTED &&
               !pm.hasApproved[_user];
    }

    /**
     * @dev Check if milestone can be claimed (for open milestones)
     */
    function canClaimMilestone(uint256 _milestoneId) external view returns (bool) {
        ProjectMilestone storage pm = projectMilestones[_milestoneId];
        return pm.milestoneType == ProjectMilestoneType.OPEN &&
               pm.status == ProjectMilestoneStatus.ACTIVE &&
               pm.claimedBy == address(0);
    }

    /**
     * @dev Get project milestone approval details
     */
    function getProjectMilestoneApproval(uint256 _milestoneId) external view returns (
        string memory approvalMessage,
        address approvedBy,
        uint256 approvedAt
    ) {
        ProjectMilestone storage pm = projectMilestones[_milestoneId];
        return (pm.approvalMessage, pm.approvedBy, pm.approvedAt);
    }

    /**
     * @dev Get project milestone rejection details
     */
    function getProjectMilestoneRejection(uint256 _milestoneId) external view returns (
        string memory rejectionMessage,
        address rejectedBy,
        uint256 rejectedAt
    ) {
        ProjectMilestone storage pm = projectMilestones[_milestoneId];
        return (pm.rejectionMessage, pm.rejectedBy, pm.rejectedAt);
    }

    /**
     * @dev Get all supported tokens for a milestone with their amounts
     */
    function getProjectMilestoneTokenDetails(uint256 _milestoneId) external view returns (
        address[] memory tokens,
        uint256[] memory rewardAmounts,
        uint256[] memory escrowedAmounts
    ) {
        ProjectMilestone storage pm = projectMilestones[_milestoneId];
        uint256 length = pm.supportedTokens.length;
        tokens = new address[](length);
        rewardAmounts = new uint256[](length);
        escrowedAmounts = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            address token = pm.supportedTokens[i];
            tokens[i] = token;
            rewardAmounts[i] = pm.rewardAmounts[token];
            escrowedAmounts[i] = pm.escrowedAmounts[token];
        }

        return (tokens, rewardAmounts, escrowedAmounts);
    }
}

