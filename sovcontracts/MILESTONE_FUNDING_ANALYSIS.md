# Milestone-Based Funding Extension Analysis for SovereignSeas V4

## Executive Summary

This document analyzes the requirements for implementing milestone-based funding as an extension of the existing `SovereignSeasV4` contract. The system will allow grantees to receive funding tied to milestone completion, with escrow, time-locked approvals, and multi-token support.

---

## Current System Analysis

### Existing seas4 Structure

**Key Components:**
- **Projects**: Owned entities with metadata, can participate in campaigns
- **Campaigns**: Funding rounds with voting mechanisms, admin-controlled
- **Voting**: Users vote with tokens, funds distributed based on votes
- **Fees**: Platform fee (15%), Campaign admin fee (up to 30%)
- **Tokens**: Multi-token support with conversion via Mento broker
- **Distribution**: Linear or quadratic based on vote counts

**Relevant Patterns:**
- Admin management (super admins, campaign admins)
- Fee collection and withdrawal
- Token conversion and handling
- Native CELO vs ERC20 handling
- Reentrancy protection

---

## Requirements Breakdown

### Core Requirements

1. **Grant Structure**
   - Grantees can apply for milestone-based funding
   - Grants can be linked to Projects OR Campaigns
   - Funds must be escrowed in contract
   - Multi-token support (one or more ERC20 tokens)

2. **Milestone Management**
   - Grantees submit milestones for approval
   - Each milestone has a percentage of total grant
   - Milestones can be tied to campaign or project
   - Sequential milestone tracking

3. **Approval Workflow**
   - Time-lock for review period
   - Auto-approval if review time passes
   - Manual approval/rejection by admins
   - Required messages for all actions (approve/reject)
   - Track who approved/rejected

4. **Fund Release**
   - Percentage-based payouts per milestone
   - Site fee: 1-5% (configurable per grant)
   - Funds released upon milestone approval
   - Multi-token distribution

5. **Documentation**
   - Milestone completion biodata
   - Transaction history with messages
   - Approver tracking
   - Evidence submission (IPFS hashes)

---

## Architecture Design

### Option 1: Grant as Separate Entity (RECOMMENDED)

**Structure:**
```
Grant (independent entity)
├── Linked to Project OR Campaign
├── Owned by Grantee
├── Managed by Grant Admins (campaign admins or super admins)
└── Contains Milestones
```

**Pros:**
- Clean separation from voting system
- Can exist independently
- Flexible linking (project or campaign)
- Doesn't interfere with existing voting

**Cons:**
- More complex data structures
- Additional mappings needed

### Option 2: Milestones as Campaign Extension

**Structure:**
```
Campaign
├── Voting System (existing)
└── Milestone Grants (new)
    └── Milestones
```

**Pros:**
- Reuses campaign infrastructure
- Simpler integration

**Cons:**
- Conflates two funding models
- Less flexible for project-only grants

**Decision: Option 1 (Grant as Separate Entity)**

---

## Data Structures

### Grant Struct

```solidity
struct Grant {
    uint256 id;
    address grantee;                    // Project owner or grant applicant
    uint256 linkedEntityId;             // Project ID or Campaign ID
    EntityType entityType;              // PROJECT or CAMPAIGN
    address[] supportedTokens;          // Multi-token support
    mapping(address => uint256) totalAmounts;  // Total grant per token
    mapping(address => uint256) releasedAmounts; // Released per token
    mapping(address => uint256) escrowedAmounts; // Escrowed per token
    uint256 siteFeePercentage;          // 1-5%
    uint256 reviewTimeLock;             // Time lock for auto-approval
    GrantStatus status;                 // ACTIVE, COMPLETED, CANCELLED
    address[] grantAdmins;              // Who can approve milestones
    mapping(address => bool) isGrantAdmin;
    uint256 createdAt;
    uint256[] milestoneIds;             // List of milestone IDs
    mapping(uint256 => bool) hasMilestone;
}
```

### Milestone Struct

```solidity
struct Milestone {
    uint256 id;
    uint256 grantId;
    string title;
    string description;
    string evidenceHash;                // IPFS hash for completion proof
    mapping(address => uint256) percentagePerToken; // Percentage per token
    mapping(address => uint256) payoutAmounts;      // Calculated payout per token
    MilestoneStatus status;             // PENDING, SUBMITTED, APPROVED, REJECTED, PAID
    uint256 submittedAt;                // When grantee submitted
    uint256 reviewDeadline;             // Auto-approval deadline
    uint256 approvedAt;                 // When approved
    address approvedBy;                 // Who approved
    string approvalMessage;             // Required message
    string rejectionMessage;            // If rejected
    address rejectedBy;                 // Who rejected
    uint256 rejectedAt;                 // When rejected
    bool autoApproved;                  // True if auto-approved
}
```

### Enums

```solidity
enum EntityType { PROJECT, CAMPAIGN }
enum GrantStatus { ACTIVE, COMPLETED, CANCELLED }
enum MilestoneStatus { PENDING, SUBMITTED, APPROVED, REJECTED, PAID }
```

---

## Workflow Design

### 1. Grant Creation

**Flow:**
1. Admin (campaign admin or super admin) creates grant
2. Links to Project or Campaign
3. Defines supported tokens and amounts
4. Sets site fee (1-5%)
5. Sets review time lock
6. Funds are escrowed immediately

**Function:**
```solidity
function createGrant(
    uint256 _linkedEntityId,
    EntityType _entityType,
    address _grantee,
    address[] memory _tokens,
    uint256[] memory _amounts,
    uint256 _siteFeePercentage,  // 1-5
    uint256 _reviewTimeLock      // in seconds
) external payable
```

### 2. Milestone Submission

**Flow:**
1. Grantee submits milestone
2. Specifies percentage per token
3. Provides evidence hash (IPFS)
4. Milestone status: PENDING → SUBMITTED
5. Review deadline set: `block.timestamp + reviewTimeLock`

**Function:**
```solidity
function submitMilestone(
    uint256 _grantId,
    string memory _title,
    string memory _description,
    string memory _evidenceHash,
    mapping(address => uint256) _percentagePerToken
) external
```

### 3. Milestone Approval/Rejection

**Flow:**
1. Grant admin reviews milestone
2. Can approve or reject
3. Must provide message
4. If approved: funds released, milestone status → APPROVED → PAID
5. If rejected: milestone status → REJECTED, funds remain escrowed

**Functions:**
```solidity
function approveMilestone(
    uint256 _grantId,
    uint256 _milestoneId,
    string memory _message
) external

function rejectMilestone(
    uint256 _grantId,
    uint256 _milestoneId,
    string memory _message
) external
```

### 4. Auto-Approval

**Flow:**
1. Anyone can trigger auto-approval check
2. If `block.timestamp >= reviewDeadline` and status is SUBMITTED
3. Milestone auto-approved
4. Funds released
5. `autoApproved = true`

**Function:**
```solidity
function checkAndAutoApproveMilestone(
    uint256 _grantId,
    uint256 _milestoneId
) external
```

### 5. Fund Release

**Flow:**
1. Calculate payout per token: `totalAmount * percentage / 100`
2. Calculate site fee: `payout * siteFeePercentage / 100`
3. Transfer to grantee: `payout - siteFee`
4. Transfer site fee to platform
5. Update released amounts

---

## Integration Points with seas4

### 1. Admin System
- Reuse `onlyCampaignAdmin` modifier for grant admins
- Grant admins = Campaign admins (if linked to campaign) OR Super admins
- Project owners can be grantees

### 2. Token System
- Reuse `supportedTokens` mapping
- Reuse token conversion logic if needed
- Reuse native CELO handling

### 3. Fee System
- Site fee (1-5%) separate from platform fee (15%)
- Site fee goes to platform owner
- Can coexist with campaign admin fees

### 4. Project/Campaign Linking
- Grants can reference existing projects
- Grants can reference existing campaigns
- No modification to existing Project/Campaign structs needed

---

## Additional Features to Consider

### 1. Milestone Dependencies
- Sequential milestones (must complete in order)
- Parallel milestones (can complete independently)
- Conditional milestones (unlock based on previous)

**Recommendation:** Start with sequential, add dependencies later

### 2. Partial Milestone Payments
- Allow partial approval (e.g., 50% complete = 50% payment)
- Percentage-based partial releases

**Recommendation:** Phase 2 feature

### 3. Milestone Amendments
- Allow grantee to update milestone before submission
- Allow admin to request changes

**Recommendation:** Phase 2 feature

### 4. Grant Cancellation
- Admin can cancel grant
- Refund escrowed funds
- Handle partial completions

**Recommendation:** Include in Phase 1

### 5. Milestone Resubmission
- After rejection, allow resubmission
- Track rejection history

**Recommendation:** Include in Phase 1

### 6. Multi-Signature Approvals
- Require multiple admins to approve
- Threshold-based approvals

**Recommendation:** Phase 2 feature

### 7. Dispute Resolution
- Challenge mechanism for rejections
- Community voting on disputes

**Recommendation:** Phase 3 feature

### 8. Grant Templates
- Predefined milestone structures
- Reusable grant configurations

**Recommendation:** Phase 2 feature

### 9. Analytics & Reporting
- Grant completion rates
- Average time to approval
- Grantee reputation scores

**Recommendation:** Phase 2 feature (view functions)

### 10. Streaming Payments
- Continuous payments during milestone work
- Time-based releases

**Recommendation:** Phase 3 feature

---

## Fee Structure

### Current seas4 Fees
- Platform fee: 15% (fixed)
- Campaign admin fee: 0-30% (configurable)
- Campaign creation fee: 2 CELO
- Project addition fee: 1 CELO

### New Milestone Fees
- **Site fee**: 1-5% per milestone payout (configurable per grant)
- **Grant creation fee**: TBD (could reuse campaign creation fee or separate)

### Fee Distribution
```
Milestone Payout = 100 tokens
Site Fee (3%) = 3 tokens → Platform owner
Grantee Receives = 97 tokens
```

---

## Security Considerations

### 1. Reentrancy Protection
- Use `nonReentrant` modifier on all fund transfer functions
- Already implemented in seas4

### 2. Access Control
- Strict admin checks
- Grantee verification
- Entity ownership validation

### 3. Time Lock Validation
- Prevent manipulation of review deadlines
- Ensure auto-approval triggers correctly

### 4. Fund Escrow
- Verify funds are escrowed before milestone submission
- Prevent double-spending
- Track escrowed vs released amounts

### 5. Percentage Validation
- Ensure milestone percentages don't exceed 100%
- Validate per-token percentages

---

## Gas Optimization

### 1. Storage Optimization
- Use mappings instead of arrays where possible
- Pack structs efficiently
- Cache frequently accessed values

### 2. Batch Operations
- Batch milestone approvals
- Batch fund releases

### 3. View Functions
- Separate view functions for read operations
- Minimize storage reads in loops

---

## Events Design

```solidity
event GrantCreated(
    uint256 indexed grantId,
    uint256 indexed linkedEntityId,
    EntityType entityType,
    address indexed grantee,
    address[] tokens,
    uint256[] amounts
);

event MilestoneSubmitted(
    uint256 indexed grantId,
    uint256 indexed milestoneId,
    address indexed grantee,
    string evidenceHash
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

event GrantCancelled(
    uint256 indexed grantId,
    address indexed cancelledBy,
    address[] tokens,
    uint256[] refundedAmounts
);
```

---

## Questions to Clarify

### 1. Grant Creation Authority
- **Q:** Who can create grants?
  - **A:** Campaign admins (for campaign-linked grants) OR Super admins (for any grant)?

### 2. Grant Funding Source
- **Q:** Where do grant funds come from?
  - **A:** External deposits by grant creator? Campaign funds? Separate funding pool?

### 3. Milestone Percentage Validation
- **Q:** Can milestones have different percentages per token?
  - **A:** Yes, each token can have different percentage allocation per milestone

### 4. Site Fee Configuration
- **Q:** Can site fee be different per grant?
  - **A:** Yes, 1-5% configurable per grant

### 5. Review Time Lock
- **Q:** Same time lock for all milestones in a grant?
  - **A:** Yes, set at grant creation, applies to all milestones

### 6. Grant Completion
- **Q:** When is a grant considered complete?
  - **A:** When all milestones are APPROVED and PAID

### 7. Partial Grant Completion
- **Q:** What happens if grantee doesn't complete all milestones?
  - **A:** Remaining escrowed funds can be refunded or redistributed (admin decision)

### 8. Milestone Order
- **Q:** Must milestones be completed in order?
  - **A:** Phase 1: Sequential only. Phase 2: Add parallel/conditional support

### 9. Grant Modification
- **Q:** Can grants be modified after creation?
  - **A:** Phase 1: No. Phase 2: Add amendment functionality

### 10. Integration with Voting
- **Q:** Can a project receive both voting funds and milestone grants?
  - **A:** Yes, they are independent systems

---

## Implementation Phases

### Phase 1: Core Functionality (MVP)
- Grant creation and escrow
- Milestone submission
- Manual approval/rejection with messages
- Auto-approval after time lock
- Fund release with site fee
- Multi-token support
- Grant cancellation
- Milestone resubmission

### Phase 2: Enhanced Features
- Milestone dependencies (parallel/conditional)
- Partial milestone payments
- Milestone amendments
- Multi-signature approvals
- Grant templates
- Analytics view functions

### Phase 3: Advanced Features
- Dispute resolution
- Streaming payments
- Reputation system
- Impact metrics

---

## Recommended Next Steps

1. **Review this analysis** and confirm architecture decisions
2. **Clarify questions** listed above
3. **Finalize data structures** based on feedback
4. **Implement Phase 1** core functionality
5. **Test thoroughly** with various scenarios
6. **Deploy and iterate** based on usage

---

## Conclusion

The milestone-based funding system will extend SovereignSeas V4 with a flexible, secure, and transparent grant management system. By using a separate Grant entity that can link to Projects or Campaigns, we maintain clean separation while leveraging existing infrastructure for tokens, admins, and fees.

The time-locked auto-approval mechanism ensures timely processing while maintaining accountability through required messages and approver tracking. Multi-token support and configurable site fees provide flexibility for various grant scenarios.

**Ready to proceed with implementation once questions are clarified.**

