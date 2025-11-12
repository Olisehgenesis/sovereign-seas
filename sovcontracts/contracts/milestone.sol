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

    // State Variables
    uint256 public nextGrantId;
    uint256 public nextMilestoneId;
    uint256 public constant MIN_SITE_FEE = 1;
    uint256 public constant MAX_SITE_FEE = 5;

    // Mappings
    mapping(uint256 => Grant) public grants;
    mapping(uint256 => Milestone) public milestones;
    mapping(uint256 => uint256[]) public grantMilestones; // grantId => milestoneIds[]
    mapping(uint256 => mapping(uint256 => bool)) public grantHasMilestone; // grantId => milestoneId => exists
    mapping(uint256 => address[]) public grantAdmins; // grantId => admins[]
    mapping(uint256 => mapping(address => bool)) public isGrantAdmin; // grantId => admin => isAdmin

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
}

