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
}

contract SovereignSeasGrants is Ownable(msg.sender), ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Reference to main contract
    ISovereignSeas public immutable sovereignSeas;
    
    // Constants
    uint256 public constant PLATFORM_FEE = 5; // 5%
    uint256 public constant MAX_VALIDATION_TIME = 30 days; // 1 month default
    uint256 public constant MIN_VALIDATION_TIME = 1 days;
    uint256 public securedGrantCreationFee = 1 * 1e18; // 1 CELO
    uint256 public promisedGrantCreationFee = 2 * 1e18; // 2 CELO
    
    // Settings
    bool public allowPromisedGrants = true;
    uint256 public minPromisedGrantDeposit = 0; // percentage of total amount
    
    // Counters
    uint256 public nextGrantId;
    
    // Enums
    enum GrantType { MILESTONE, BOUNTY, ACHIEVEMENT, CAMPAIGN_BONUS }
    enum ClaimStatus { PENDING, APPROVED, REJECTED, AUTO_APPROVED }
    
    // Structs
    struct Grant {
        uint256 id;
        address creator;
        address paymentToken;
        uint256 totalAmount;
        uint256 remainingAmount;
        uint256 deadline;
        bool isSecured; // true = upfront payment, false = promised
        bool active;
        GrantType grantType;
        uint256 linkedId; // campaignId or projectId if applicable
        string metadata; // JSON for UI display
        uint256 maxValidationTime; // Time allowed for milestone validation
        mapping(address => bool) validators;
        address[] validatorList;
        uint256 milestoneCount;
        mapping(uint256 => Milestone) milestones;
    }
    
    struct Milestone {
        uint256 grantId;
        uint256 milestoneIndex;
        uint256 amount;
        bool completed;
        bool claimed;
        address completedBy;
        uint256 completedAt;
        string proofData; // Evidence/proof metadata
        string metadata; // JSON for milestone details, requirements, deliverables
        mapping(address => Claim) claims;
        address[] claimants;
    }
    
    struct Claim {
        address claimant;
        uint256 grantId;
        uint256 milestoneIndex;
        uint256 amount;
        ClaimStatus status;
        bool paid;
        uint256 claimedAt;
        uint256 submittedAt;
        string submissionData;
        string metadata; // JSON for claim details, proof descriptions, validation notes
        mapping(address => bool) validatedBy;
        mapping(address => bool) approvalVotes;
        uint256 approvalCount;
        uint256 rejectionCount;
    }
    
    // Mappings
    mapping(uint256 => Grant) public grants;
    mapping(address => uint256[]) public userCreatedGrants;
    mapping(address => uint256[]) public userClaims;
    mapping(address => mapping(address => uint256)) public userEarnings; // user => token => amount
    mapping(address => uint256) public collectedFees;
    
    // Arrays for iteration
    uint256[] public allGrantIds;
    mapping(address => uint256[]) public grantsByToken;
    mapping(GrantType => uint256[]) public grantsByType;
    
    // Events
    event GrantCreated(uint256 indexed grantId, address indexed creator, GrantType grantType, bool isSecured, uint256 totalAmount, address token);
    event MilestoneSubmitted(uint256 indexed grantId, uint256 indexed milestoneIndex, address indexed claimant, string submissionData);
    event MilestoneApproved(uint256 indexed grantId, uint256 indexed milestoneIndex, address indexed claimant, address validator);
    event MilestoneRejected(uint256 indexed grantId, uint256 indexed milestoneIndex, address indexed claimant, address validator);
    event MilestoneAutoApproved(uint256 indexed grantId, uint256 indexed milestoneIndex, address indexed claimant, string reason);
    event MilestoneClaimed(uint256 indexed grantId, uint256 indexed milestoneIndex, address indexed claimant, uint256 amount);
    event MilestonePaymentSent(uint256 indexed grantId, uint256 indexed milestoneIndex, address indexed recipient, uint256 amount);
    event ValidatorAdded(uint256 indexed grantId, address indexed validator);
    event ValidatorRemoved(uint256 indexed grantId, address indexed validator);
    event GrantCancelled(uint256 indexed grantId, address indexed canceller);
    event GrantFunded(uint256 indexed grantId, uint256 amount, address token);
    event FeeCollected(address indexed token, uint256 amount, string feeType);
    
    // Modifiers
    modifier onlySuperAdmin() {
        require(sovereignSeas.superAdmins(msg.sender), "Only super admin");
        _;
    }
    
    modifier validGrant(uint256 _grantId) {
        require(_grantId < nextGrantId, "Invalid grant ID");
        require(grants[_grantId].active, "Grant not active");
        _;
    }
    
    modifier onlyGrantCreator(uint256 _grantId) {
        require(grants[_grantId].creator == msg.sender, "Only grant creator");
        _;
    }
    
    modifier onlyGrantValidator(uint256 _grantId) {
        require(grants[_grantId].validators[msg.sender] || sovereignSeas.superAdmins(msg.sender), "Not authorized validator");
        _;
    }
    
    constructor(address _sovereignSeas) {
        require(_sovereignSeas != address(0), "Invalid SovereignSeas address");
        sovereignSeas = ISovereignSeas(_sovereignSeas);
    }
    
    // Grant Creation Functions
    
    function createSecuredGrant(
        address _paymentToken,
        uint256 _totalAmount,
        uint256 _deadline,
        GrantType _grantType,
        uint256 _linkedId,
        string memory _metadata,
        uint256[] memory _milestoneAmounts,
        string[] memory _milestoneMetadata,
        uint256 _maxValidationTime
    ) external payable nonReentrant returns (uint256) {
        require(sovereignSeas.supportedTokens(_paymentToken), "Token not supported");
        require(_totalAmount > 0, "Amount must be greater than 0");
        require(_deadline > block.timestamp, "Invalid deadline");
        require(_maxValidationTime >= MIN_VALIDATION_TIME && _maxValidationTime <= MAX_VALIDATION_TIME, "Invalid validation time");
        require(_milestoneAmounts.length == _milestoneMetadata.length, "Milestone data mismatch");
        
        // Validate milestone amounts sum to total
        uint256 totalMilestoneAmount = 0;
        for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
            require(_milestoneAmounts[i] > 0, "Invalid milestone amount");
            totalMilestoneAmount += _milestoneAmounts[i];
        }
        require(totalMilestoneAmount == _totalAmount, "Milestone amounts don't match total");
        
        // Collect creation fee
        _collectCreationFee(true);
        
        // Transfer grant funds to contract
        if (_paymentToken == sovereignSeas.celoToken()) {
            require(msg.value >= _totalAmount + securedGrantCreationFee, "Insufficient CELO sent");
            if (msg.value > _totalAmount + securedGrantCreationFee) {
                payable(msg.sender).transfer(msg.value - _totalAmount - securedGrantCreationFee);
            }
        } else {
            IERC20(_paymentToken).safeTransferFrom(msg.sender, address(this), _totalAmount);
        }
        
        return _createGrant(_paymentToken, _totalAmount, _deadline, _grantType, _linkedId, _metadata, _milestoneAmounts, _milestoneMetadata, _maxValidationTime, true);
    }
    
    function createPromisedGrant(
        address _paymentToken,
        uint256 _totalAmount,
        uint256 _deadline,
        GrantType _grantType,
        uint256 _linkedId,
        string memory _metadata,
        uint256[] memory _milestoneAmounts,
        string[] memory _milestoneMetadata,
        uint256 _maxValidationTime
    ) external payable nonReentrant returns (uint256) {
        require(allowPromisedGrants, "Promised grants not allowed");
        require(sovereignSeas.supportedTokens(_paymentToken), "Token not supported");
        require(_totalAmount > 0, "Amount must be greater than 0");
        require(_deadline > block.timestamp, "Invalid deadline");
        require(_maxValidationTime >= MIN_VALIDATION_TIME && _maxValidationTime <= MAX_VALIDATION_TIME, "Invalid validation time");
        require(_milestoneAmounts.length == _milestoneMetadata.length, "Milestone data mismatch");
        
        // Validate milestone amounts
        uint256 totalMilestoneAmount = 0;
        for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
            require(_milestoneAmounts[i] > 0, "Invalid milestone amount");
            totalMilestoneAmount += _milestoneAmounts[i];
        }
        require(totalMilestoneAmount == _totalAmount, "Milestone amounts don't match total");
        
        // Collect creation fee
        _collectCreationFee(false);
        
        // Optional minimum deposit for promised grants
        uint256 requiredDeposit = (_totalAmount * minPromisedGrantDeposit) / 100;
        if (requiredDeposit > 0) {
            if (_paymentToken == sovereignSeas.celoToken()) {
                require(msg.value >= requiredDeposit + promisedGrantCreationFee, "Insufficient deposit");
                if (msg.value > requiredDeposit + promisedGrantCreationFee) {
                    payable(msg.sender).transfer(msg.value - requiredDeposit - promisedGrantCreationFee);
                }
            } else {
                IERC20(_paymentToken).safeTransferFrom(msg.sender, address(this), requiredDeposit);
            }
        }
        
        return _createGrant(_paymentToken, _totalAmount, _deadline, _grantType, _linkedId, _metadata, _milestoneAmounts, _milestoneMetadata, _maxValidationTime, false);
    }
    
    function _createGrant(
        address _paymentToken,
        uint256 _totalAmount,
        uint256 _deadline,
        GrantType _grantType,
        uint256 _linkedId,
        string memory _metadata,
        uint256[] memory _milestoneAmounts,
        string[] memory _milestoneMetadata,
        uint256 _maxValidationTime,
        bool _isSecured
    ) internal returns (uint256) {
        uint256 grantId = nextGrantId++;
        Grant storage grant = grants[grantId];
        
        grant.id = grantId;
        grant.creator = msg.sender;
        grant.paymentToken = _paymentToken;
        grant.totalAmount = _totalAmount;
        grant.remainingAmount = _isSecured ? _totalAmount : 0;
        grant.deadline = _deadline;
        grant.isSecured = _isSecured;
        grant.active = true;
        grant.grantType = _grantType;
        grant.linkedId = _linkedId;
        grant.metadata = _metadata;
        grant.maxValidationTime = _maxValidationTime;
        grant.milestoneCount = _milestoneAmounts.length;
        
        // Create milestones
        for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
            Milestone storage milestone = grant.milestones[i];
            milestone.grantId = grantId;
            milestone.milestoneIndex = i;
            milestone.amount = _milestoneAmounts[i];
            milestone.metadata = _milestoneMetadata[i];
        }
        
        // Add grant creator as default validator
        grant.validators[msg.sender] = true;
        grant.validatorList.push(msg.sender);
        
        // Update tracking arrays
        allGrantIds.push(grantId);
        grantsByToken[_paymentToken].push(grantId);
        grantsByType[_grantType].push(grantId);
        userCreatedGrants[msg.sender].push(grantId);
        
        emit GrantCreated(grantId, msg.sender, _grantType, _isSecured, _totalAmount, _paymentToken);
        
        return grantId;
    }
    
    // Milestone Submission and Validation
    
    function submitMilestone(
        uint256 _grantId,
        uint256 _milestoneIndex,
        string memory _submissionData,
        string memory _metadata
    ) external validGrant(_grantId) nonReentrant {
        Grant storage grant = grants[_grantId];
        require(block.timestamp <= grant.deadline, "Grant deadline passed");
        require(_milestoneIndex < grant.milestoneCount, "Invalid milestone index");
        
        Milestone storage milestone = grant.milestones[_milestoneIndex];
        require(!milestone.completed, "Milestone already completed");
        require(milestone.claims[msg.sender].claimant == address(0), "Already submitted");
        
        Claim storage claim = milestone.claims[msg.sender];
        claim.claimant = msg.sender;
        claim.grantId = _grantId;
        claim.milestoneIndex = _milestoneIndex;
        claim.amount = milestone.amount;
        claim.status = ClaimStatus.PENDING;
        claim.submittedAt = block.timestamp;
        claim.submissionData = _submissionData;
        claim.metadata = _metadata;
        
        milestone.claimants.push(msg.sender);
        userClaims[msg.sender].push(_grantId);
        
        emit MilestoneSubmitted(_grantId, _milestoneIndex, msg.sender, _submissionData);
    }
    
    function validateMilestone(
        uint256 _grantId,
        uint256 _milestoneIndex,
        address _claimant,
        bool _approve,
        string memory _feedback
    ) external validGrant(_grantId) onlyGrantValidator(_grantId) nonReentrant {
        Grant storage grant = grants[_grantId];
        Milestone storage milestone = grant.milestones[_milestoneIndex];
        Claim storage claim = milestone.claims[_claimant];
        
        require(claim.claimant != address(0), "No submission found");
        require(claim.status == ClaimStatus.PENDING, "Already validated");
        require(!claim.validatedBy[msg.sender], "Already validated by this validator");
        require(block.timestamp <= claim.submittedAt + grant.maxValidationTime, "Validation period expired");
        
        claim.validatedBy[msg.sender] = true;
        
        if (_approve) {
            claim.approvalVotes[msg.sender] = true;
            claim.approvalCount++;
            emit MilestoneApproved(_grantId, _milestoneIndex, _claimant, msg.sender);
            
            // Auto-approve if majority of validators approve (or single validator)
            if (claim.approvalCount >= (grant.validatorList.length + 1) / 2) {
                claim.status = ClaimStatus.APPROVED;
                milestone.completed = true;
                milestone.completedBy = _claimant;
                milestone.completedAt = block.timestamp;
            }
        } else {
            claim.rejectionCount++;
            emit MilestoneRejected(_grantId, _milestoneIndex, _claimant, msg.sender);
            
            // Auto-reject if majority rejects
            if (claim.rejectionCount >= (grant.validatorList.length + 1) / 2) {
                claim.status = ClaimStatus.REJECTED;
            }
        }
    }
    
    function claimMilestone(
        uint256 _grantId,
        uint256 _milestoneIndex
    ) external validGrant(_grantId) nonReentrant {
        Grant storage grant = grants[_grantId];
        Milestone storage milestone = grant.milestones[_milestoneIndex];
        Claim storage claim = milestone.claims[msg.sender];
        
        require(claim.claimant == msg.sender, "Not your claim");
        require(!claim.paid, "Already paid");
        
        // Check if auto-approval is possible due to validation timeout
        if (claim.status == ClaimStatus.PENDING && 
            block.timestamp > claim.submittedAt + grant.maxValidationTime) {
            claim.status = ClaimStatus.AUTO_APPROVED;
            milestone.completed = true;
            milestone.completedBy = msg.sender;
            milestone.completedAt = block.timestamp;
            emit MilestoneAutoApproved(_grantId, _milestoneIndex, msg.sender, "Validation timeout - auto-approved after 1 month");
        }
        
        require(claim.status == ClaimStatus.APPROVED || claim.status == ClaimStatus.AUTO_APPROVED, "Claim not approved");
        
        // Transfer payment
        _transferMilestonePayment(_grantId, _milestoneIndex, msg.sender);
    }
    
    function sendMilestonePayment(
        uint256 _grantId,
        uint256 _milestoneIndex,
        address _recipient
    ) external payable onlyGrantCreator(_grantId) nonReentrant {
        Grant storage grant = grants[_grantId];
        Milestone storage milestone = grant.milestones[_milestoneIndex];
        Claim storage claim = milestone.claims[_recipient];
        
        require(claim.claimant == _recipient, "Invalid recipient");
        require(!claim.paid, "Already paid");
        require(claim.status == ClaimStatus.APPROVED || claim.status == ClaimStatus.AUTO_APPROVED, "Claim not approved");
        
        // For promised grants, creator needs to send the payment
        if (!grant.isSecured) {
            if (grant.paymentToken == sovereignSeas.celoToken()) {
                require(msg.value >= milestone.amount, "Insufficient CELO sent");
                if (msg.value > milestone.amount) {
                    payable(msg.sender).transfer(msg.value - milestone.amount);
                }
            } else {
                IERC20(grant.paymentToken).safeTransferFrom(msg.sender, address(this), milestone.amount);
            }
            grant.remainingAmount += milestone.amount;
        }
        
        _transferMilestonePayment(_grantId, _milestoneIndex, _recipient);
    }
    
    function _transferMilestonePayment(uint256 _grantId, uint256 _milestoneIndex, address _recipient) internal {
        Grant storage grant = grants[_grantId];
        Milestone storage milestone = grant.milestones[_milestoneIndex];
        Claim storage claim = milestone.claims[_recipient];
        
        require(grant.remainingAmount >= milestone.amount, "Insufficient grant balance");
        
        // Calculate platform fee
        uint256 platformFeeAmount = (milestone.amount * PLATFORM_FEE) / 100;
        uint256 payoutAmount = milestone.amount - platformFeeAmount;
        
        // Update balances
        grant.remainingAmount -= milestone.amount;
        claim.paid = true;
        claim.claimedAt = block.timestamp;
        userEarnings[_recipient][grant.paymentToken] += payoutAmount;
        collectedFees[grant.paymentToken] += platformFeeAmount;
        
        // Transfer tokens
        if (grant.paymentToken == sovereignSeas.celoToken()) {
            payable(_recipient).transfer(payoutAmount);
            payable(owner()).transfer(platformFeeAmount);
        } else {
            IERC20(grant.paymentToken).safeTransfer(_recipient, payoutAmount);
            IERC20(grant.paymentToken).safeTransfer(owner(), platformFeeAmount);
        }
        
        emit MilestoneClaimed(_grantId, _milestoneIndex, _recipient, payoutAmount);
        emit FeeCollected(grant.paymentToken, platformFeeAmount, "milestone");
    }
    
    // Validator Management
    
    function addValidator(uint256 _grantId, address _validator) external onlyGrantCreator(_grantId) {
        require(_validator != address(0), "Invalid validator");
        require(!grants[_grantId].validators[_validator], "Already validator");
        
        grants[_grantId].validators[_validator] = true;
        grants[_grantId].validatorList.push(_validator);
        
        emit ValidatorAdded(_grantId, _validator);
    }
    
    function removeValidator(uint256 _grantId, address _validator) external onlyGrantCreator(_grantId) {
        require(grants[_grantId].validators[_validator], "Not a validator");
        require(_validator != grants[_grantId].creator, "Cannot remove creator");
        
        grants[_grantId].validators[_validator] = false;
        
        // Remove from validator list
        address[] storage validatorList = grants[_grantId].validatorList;
        for (uint256 i = 0; i < validatorList.length; i++) {
            if (validatorList[i] == _validator) {
                validatorList[i] = validatorList[validatorList.length - 1];
                validatorList.pop();
                break;
            }
        }
        
        emit ValidatorRemoved(_grantId, _validator);
    }
    
    // Grant Management
    
    function cancelGrant(uint256 _grantId) external nonReentrant {
        Grant storage grant = grants[_grantId];
        require(msg.sender == grant.creator || sovereignSeas.superAdmins(msg.sender), "Not authorized");
        require(grant.active, "Grant not active");
        
        // Check if any milestones are completed
        bool hasCompletedMilestones = false;
        for (uint256 i = 0; i < grant.milestoneCount; i++) {
            if (grant.milestones[i].completed) {
                hasCompletedMilestones = true;
                break;
            }
        }
        require(!hasCompletedMilestones, "Cannot cancel grant with completed milestones");
        
        grant.active = false;
        
        // Refund remaining amount to creator (for secured grants)
        if (grant.isSecured && grant.remainingAmount > 0) {
            if (grant.paymentToken == sovereignSeas.celoToken()) {
                payable(grant.creator).transfer(grant.remainingAmount);
            } else {
                IERC20(grant.paymentToken).safeTransfer(grant.creator, grant.remainingAmount);
            }
        }
        
        emit GrantCancelled(_grantId, msg.sender);
    }
    
    function fundPromisedGrant(uint256 _grantId) external payable onlyGrantCreator(_grantId) nonReentrant {
        Grant storage grant = grants[_grantId];
        require(!grant.isSecured, "Grant already secured");
        require(grant.active, "Grant not active");
        
        uint256 fundingAmount;
        if (grant.paymentToken == sovereignSeas.celoToken()) {
            fundingAmount = msg.value;
        } else {
            // For ERC20 tokens, we need to specify the amount separately
            revert("Use fundPromisedGrantERC20 for ERC20 tokens");
        }
        
        grant.remainingAmount += fundingAmount;
        
        emit GrantFunded(_grantId, fundingAmount, grant.paymentToken);
    }
    
    function fundPromisedGrantERC20(uint256 _grantId, uint256 _amount) external onlyGrantCreator(_grantId) nonReentrant {
        Grant storage grant = grants[_grantId];
        require(!grant.isSecured, "Grant already secured");
        require(grant.active, "Grant not active");
        require(_amount > 0, "Amount must be greater than 0");
        
        IERC20(grant.paymentToken).safeTransferFrom(msg.sender, address(this), _amount);
        grant.remainingAmount += _amount;
        
        emit GrantFunded(_grantId, _amount, grant.paymentToken);
    }
    
    // Fee Management
    
    function _collectCreationFee(bool _isSecured) internal {
        uint256 feeAmount = _isSecured ? securedGrantCreationFee : promisedGrantCreationFee;
        
        if (!sovereignSeas.superAdmins(msg.sender)) {
            address celoToken = sovereignSeas.celoToken();
            require(msg.value >= feeAmount, "Insufficient creation fee");
            
            collectedFees[celoToken] += feeAmount;
            payable(owner()).transfer(feeAmount);
            
            emit FeeCollected(celoToken, feeAmount, _isSecured ? "securedGrant" : "promisedGrant");
        }
    }
    
    // View Functions
    
    function getGrant(uint256 _grantId) external view returns (
        uint256 id,
        address creator,
        address paymentToken,
        uint256 totalAmount,
        uint256 remainingAmount,
        uint256 deadline,
        bool isSecured,
        bool active,
        GrantType grantType,
        uint256 linkedId,
        string memory metadata,
        uint256 maxValidationTime,
        uint256 milestoneCount
    ) {
        Grant storage grant = grants[_grantId];
        return (
            grant.id,
            grant.creator,
            grant.paymentToken,
            grant.totalAmount,
            grant.remainingAmount,
            grant.deadline,
            grant.isSecured,
            grant.active,
            grant.grantType,
            grant.linkedId,
            grant.metadata,
            grant.maxValidationTime,
            grant.milestoneCount
        );
    }
    
    function getMilestone(uint256 _grantId, uint256 _milestoneIndex) external view returns (
        uint256 grantId,
        uint256 milestoneIndex,
        uint256 amount,
        bool completed,
        bool claimed,
        address completedBy,
        uint256 completedAt,
        string memory proofData,
        string memory metadata
    ) {
        Milestone storage milestone = grants[_grantId].milestones[_milestoneIndex];
        return (
            milestone.grantId,
            milestone.milestoneIndex,
            milestone.amount,
            milestone.completed,
            milestone.claimed,
            milestone.completedBy,
            milestone.completedAt,
            milestone.proofData,
            milestone.metadata
        );
    }
    
    function getClaim(uint256 _grantId, uint256 _milestoneIndex, address _claimant) external view returns (
        address claimant,
        uint256 grantId,
        uint256 milestoneIndex,
        uint256 amount,
        ClaimStatus status,
        bool paid,
        uint256 claimedAt,
        uint256 submittedAt,
        string memory submissionData,
        string memory metadata,
        uint256 approvalCount,
        uint256 rejectionCount
    ) {
        Claim storage claim = grants[_grantId].milestones[_milestoneIndex].claims[_claimant];
        return (
            claim.claimant,
            claim.grantId,
            claim.milestoneIndex,
            claim.amount,
            claim.status,
            claim.paid,
            claim.claimedAt,
            claim.submittedAt,
            claim.submissionData,
            claim.metadata,
            claim.approvalCount,
            claim.rejectionCount
        );
    }
    
    function getAllGrants() external view returns (uint256[] memory) {
        return allGrantIds;
    }
    
    function getGrantsByCreator(address _creator) external view returns (uint256[] memory) {
        return userCreatedGrants[_creator];
    }
    
    function getGrantsByToken(address _token) external view returns (uint256[] memory) {
        return grantsByToken[_token];
    }
    
    function getGrantsByType(GrantType _type) external view returns (uint256[] memory) {
        return grantsByType[_type];
    }
    
    function getActiveGrants() external view returns (uint256[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < allGrantIds.length; i++) {
            if (grants[allGrantIds[i]].active) {
                activeCount++;
            }
        }
        
        uint256[] memory activeGrants = new uint256[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allGrantIds.length; i++) {
            if (grants[allGrantIds[i]].active) {
                activeGrants[index++] = allGrantIds[i];
            }
        }
        
        return activeGrants;
    }
    
    function getSecuredGrants() external view returns (uint256[] memory) {
        uint256 securedCount = 0;
        for (uint256 i = 0; i < allGrantIds.length; i++) {
            if (grants[allGrantIds[i]].isSecured) {
                securedCount++;
            }
        }
        
        uint256[] memory securedGrants = new uint256[](securedCount);
       uint256 index = 0;
       for (uint256 i = 0; i < allGrantIds.length; i++) {
           if (grants[allGrantIds[i]].isSecured) {
               securedGrants[index++] = allGrantIds[i];
           }
       }
       
       return securedGrants;
   }
   
   function getPromisedGrants() external view returns (uint256[] memory) {
       uint256 promisedCount = 0;
       for (uint256 i = 0; i < allGrantIds.length; i++) {
           if (!grants[allGrantIds[i]].isSecured) {
               promisedCount++;
           }
       }
       
       uint256[] memory promisedGrants = new uint256[](promisedCount);
       uint256 index = 0;
       for (uint256 i = 0; i < allGrantIds.length; i++) {
           if (!grants[allGrantIds[i]].isSecured) {
               promisedGrants[index++] = allGrantIds[i];
           }
       }
       
       return promisedGrants;
   }
   
   function getUserClaims(address _user) external view returns (uint256[] memory) {
       return userClaims[_user];
   }
   
   function getUserEarnings(address _user) external view returns (address[] memory tokens, uint256[] memory amounts) {
       // Count how many tokens user has earned
       uint256 tokenCount = 0;
       address[] memory supportedTokens = new address[](20); // Assume max 20 tokens
       
       for (uint256 i = 0; i < allGrantIds.length; i++) {
           address token = grants[allGrantIds[i]].paymentToken;
           if (userEarnings[_user][token] > 0) {
               bool tokenExists = false;
               for (uint256 j = 0; j < tokenCount; j++) {
                   if (supportedTokens[j] == token) {
                       tokenExists = true;
                       break;
                   }
               }
               if (!tokenExists) {
                   supportedTokens[tokenCount] = token;
                   tokenCount++;
               }
           }
       }
       
       tokens = new address[](tokenCount);
       amounts = new uint256[](tokenCount);
       
       for (uint256 i = 0; i < tokenCount; i++) {
           tokens[i] = supportedTokens[i];
           amounts[i] = userEarnings[_user][supportedTokens[i]];
       }
   }
   
   function getGrantValidators(uint256 _grantId) external view returns (address[] memory) {
       return grants[_grantId].validatorList;
   }
   
   function getMilestoneClaimants(uint256 _grantId, uint256 _milestoneIndex) external view returns (address[] memory) {
       return grants[_grantId].milestones[_milestoneIndex].claimants;
   }
   
   function canUserClaimGrant(uint256 _grantId, address _user) external view returns (bool) {
       Grant storage grant = grants[_grantId];
       if (!grant.active || block.timestamp > grant.deadline) {
           return false;
       }
       
       // Check if user has already claimed any milestone
       for (uint256 i = 0; i < grant.milestoneCount; i++) {
           if (grant.milestones[i].claims[_user].paid) {
               return false; // Already claimed a milestone
           }
       }
       
       return true;
   }
   
   function isGrantExpired(uint256 _grantId) external view returns (bool) {
       return block.timestamp > grants[_grantId].deadline;
   }
   
   function getGrantProgress(uint256 _grantId) external view returns (uint256 completed, uint256 total) {
       Grant storage grant = grants[_grantId];
       total = grant.milestoneCount;
       
       for (uint256 i = 0; i < grant.milestoneCount; i++) {
           if (grant.milestones[i].completed) {
               completed++;
           }
       }
   }
   
   function canAutoApproveMilestone(uint256 _grantId, uint256 _milestoneIndex, address _claimant) external view returns (bool) {
       Grant storage grant = grants[_grantId];
       Claim storage claim = grant.milestones[_milestoneIndex].claims[_claimant];
       
       return claim.status == ClaimStatus.PENDING && 
              block.timestamp > claim.submittedAt + grant.maxValidationTime;
   }
   
   function getContractBalance(address _token) external view returns (uint256) {
       if (_token == sovereignSeas.celoToken()) {
           return address(this).balance;
       } else {
           return IERC20(_token).balanceOf(address(this));
       }
   }
   
   function calculatePlatformFee(uint256 _amount) external pure returns (uint256) {
       return (_amount * PLATFORM_FEE) / 100;
   }
   
   function getTotalGrantsCreated() external view returns (uint256) {
       return nextGrantId;
   }
   
   function getTotalAmountDistributed(address _token) external view returns (uint256) {
       uint256 total = 0;
       for (uint256 i = 0; i < allGrantIds.length; i++) {
           Grant storage grant = grants[allGrantIds[i]];
           if (grant.paymentToken == _token) {
               total += (grant.totalAmount - grant.remainingAmount);
           }
       }
       return total;
   }
   
   // Admin Functions
   
   function updatePromisedGrantSettings(bool _allowed, uint256 _minDeposit) external onlyOwner {
       allowPromisedGrants = _allowed;
       minPromisedGrantDeposit = _minDeposit;
   }
   
   function updateCreationFees(uint256 _securedFee, uint256 _promisedFee) external onlyOwner {
       securedGrantCreationFee = _securedFee;
       promisedGrantCreationFee = _promisedFee;
   }
   
   function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
       if (_token == sovereignSeas.celoToken()) {
           payable(owner()).transfer(_amount);
       } else {
           IERC20(_token).safeTransfer(owner(), _amount);
       }
   }
   
   function emergencyPause(uint256 _grantId) external onlySuperAdmin {
       grants[_grantId].active = false;
   }
   
   function emergencyResume(uint256 _grantId) external onlySuperAdmin {
       grants[_grantId].active = true;
   }
   
   // Force approve milestone in emergency situations
   function forceApproveMilestone(uint256 _grantId, uint256 _milestoneIndex, address _claimant) external onlySuperAdmin {
       Grant storage grant = grants[_grantId];
       Milestone storage milestone = grant.milestones[_milestoneIndex];
       Claim storage claim = milestone.claims[_claimant];
       
       require(claim.claimant != address(0), "No submission found");
       
       claim.status = ClaimStatus.APPROVED;
       milestone.completed = true;
       milestone.completedBy = _claimant;
       milestone.completedAt = block.timestamp;
       
       emit MilestoneApproved(_grantId, _milestoneIndex, _claimant, msg.sender);
   }
   
   // Receive function for native CELO
   receive() external payable {}
   
   fallback() external payable {}
}