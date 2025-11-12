# Milestone-Based Funding System

## Overview

The Milestone-Based Funding system is a comprehensive grant management solution integrated into SovereignSeas that enables structured, accountable funding for projects and campaigns. It provides escrow functionality, time-locked approvals, multi-token support, and milestone tracking.

## Features

### Core Functionality

- **Grant Creation**: Create grants linked to Projects or Campaigns with multi-token support
- **Milestone Management**: Submit, approve, reject, and track milestones with evidence
- **Escrow System**: Funds are securely held in escrow until milestones are approved
- **Auto-Approval**: Time-locked auto-approval if admins don't review within the deadline
- **Multi-Token Support**: Support for CELO and all ERC20 tokens on Celo
- **Penalty System**: Automatic penalties for late milestone submissions
- **Deadline Management**: Optional deadlines with locking mechanisms

### Grant Types

#### Project Grants
- Linked to a specific project
- Grantee is typically the project owner
- Can be created by anyone
- Super admins are grant admins by default

#### Campaign Grants
- Linked to a specific campaign
- Only campaign admins or super admins can create
- Campaign admins automatically become grant admins
- Grantee should be a project owner participating in the campaign

## Architecture

### Smart Contract

The system is built on the `MilestoneBasedFunding` contract which:
- Integrates with `SovereignSeasV4` for entity validation
- Manages grant and milestone lifecycle
- Handles escrow and fund releases
- Enforces access control and permissions

### Frontend Components

#### Pages
- **Grant Creation** (`/app/grant/create`): Create new grants with validation
- **Grants Explorer** (`/explorer/grants`): Browse all grants
- **Grant Details** (`/explorer/grant/:id`): View grant details, milestones, and funding

#### Hooks
- **`useMilestoneFunding`**: Main hook with all grant and milestone operations
- **`useCreateGrant`**: Create new grants
- **`useSubmitMilestone`**: Submit milestones for approval
- **`useApproveMilestone`**: Approve milestones
- **`useRejectMilestone`**: Reject milestones
- **`useSingleGrant`**: Fetch grant details
- **`useGrantMilestones`**: Get all milestones for a grant
- And many more...

## Workflow

### 1. Grant Creation

1. Navigate to "Create Grant" from the header
2. Select entity type (Project or Campaign)
3. Enter entity ID
4. Grantee address is auto-filled for projects or selectable for campaigns
5. Add funding tokens and amounts
6. Configure grant settings:
   - Site fee percentage (1-5%)
   - Review time lock (days)
   - Optional milestone deadline
7. Submit transaction

**Validation:**
- Project grants: Grantee auto-fills to project owner
- Campaign grants: Shows participating projects for selection
- Warnings displayed if grantee doesn't match expected address

### 2. Milestone Submission

1. Grantee submits milestone with:
   - Title and description
   - Evidence hash (IPFS)
   - Percentage of grant (must sum to ≤100%)
2. Milestone status: `PENDING` → `SUBMITTED`
3. Review deadline set: `block.timestamp + reviewTimeLock`

**Penalties:**
- If submitted after deadline but within 1 month: 5% penalty applied
- After deadline + 1 month: Milestone is locked and cannot be submitted

### 3. Milestone Review

**Manual Approval:**
- Grant admin reviews milestone
- Can approve or reject with required message
- If approved: Funds released immediately
- If rejected: Grantee can resubmit with new evidence

**Auto-Approval:**
- If review deadline passes without action
- Anyone can trigger auto-approval check
- Milestone auto-approved and funds released
- `autoApproved` flag set to `true`

### 4. Fund Release

When a milestone is approved:
1. Calculate payout per token: `(totalAmount * percentage) / 100`
2. Apply penalty if applicable: `payout * (100 - penaltyPercentage) / 100`
3. Calculate site fee: `payout * siteFeePercentage / 100`
4. Transfer to grantee: `payout - siteFee`
5. Transfer site fee to platform owner
6. Update escrow balances
7. Mark milestone as `PAID`

### 5. Grant Completion

Grant is marked as `COMPLETED` when:
- All submitted milestones are paid
- Total milestone percentage equals 100%

## Grant Statuses

- **ACTIVE**: Grant is active and accepting milestones
- **COMPLETED**: All milestones paid and grant is complete
- **CANCELLED**: Grant cancelled, escrowed funds refunded

## Milestone Statuses

- **PENDING**: Milestone not yet submitted
- **SUBMITTED**: Submitted and awaiting review
- **APPROVED**: Approved but not yet paid
- **REJECTED**: Rejected by admin, can be resubmitted
- **PAID**: Funds released to grantee
- **LOCKED**: Past deadline and cannot be submitted

## Key Features

### Escrow System
- All funds are escrowed when grant is created
- Funds remain in escrow until milestones are approved
- Supports withdrawal before any milestones are submitted

### Time-Locked Approvals
- Configurable review period per grant
- Auto-approval after deadline prevents stalling
- Ensures grantees receive timely payments

### Multi-Token Support
- Support for CELO (native) and ERC20 tokens
- Each grant can have multiple tokens
- Independent tracking per token

### Penalty System
- 5% penalty for late submissions (after deadline, within 1 month)
- Penalty deducted from milestone payout
- Encourages timely milestone completion

### Deadline Management
- Optional deadline for milestone submissions
- After deadline + 30 days: milestones are locked
- Prevents indefinite grant extensions

## Access Control

### Grant Admins
- **Project Grants**: Super admins by default, can add specific admins
- **Campaign Grants**: Campaign admins automatically become grant admins
- Can approve/reject milestones, add funds, cancel grants

### Grantees
- Can submit milestones
- Can resubmit rejected milestones
- Receive funds upon approval

## Integration Points

### With SovereignSeas V4
- Validates project/campaign existence
- Checks entity active status
- Uses campaign admin permissions
- Leverages supported tokens list

### With Frontend
- Header integration: "Grants" tab and "Create Grant" option
- Routing: `/explorer/grants`, `/explorer/grant/:id`, `/app/grant/create`
- Token selector with balance display
- Validation warnings and auto-fill features

## Environment Variables

```env
VITE_MILESTONE_CONTRACT=<milestone_contract_address>
VITE_CONTRACT_V4=<seas4_contract_address>
VITE_CELO_TOKEN=<celo_token_address>
```

## Usage Examples

### Creating a Project Grant

```typescript
const { createGrant } = useCreateGrant(contractAddress);

await createGrant({
  linkedEntityId: BigInt(projectId),
  entityType: EntityType.PROJECT,
  grantee: projectOwnerAddress,
  tokens: [celoToken, cusdToken],
  amounts: [parseEther("100"), parseEther("200")],
  siteFeePercentage: BigInt(2),
  reviewTimeLock: BigInt(7 * 24 * 60 * 60), // 7 days
  milestoneDeadline: 0n // No deadline
});
```

### Submitting a Milestone

```typescript
const { submitMilestone } = useSubmitMilestone(contractAddress);

await submitMilestone({
  grantId: BigInt(grantId),
  title: "Backend Integration",
  description: "Completed API integration",
  evidenceHash: ipfsHash,
  percentage: 30 // 30% of grant
});
```

### Approving a Milestone

```typescript
const { approveMilestone } = useApproveMilestone(contractAddress);

await approveMilestone({
  grantId: BigInt(grantId),
  milestoneId: BigInt(milestoneId),
  message: "Great work! Milestone completed successfully."
});
```

## Security Considerations

- **Reentrancy Protection**: All state-changing functions use `nonReentrant` modifier
- **Access Control**: Strict permission checks for admin functions
- **Input Validation**: All inputs validated before processing
- **Escrow Safety**: Funds held securely until milestones approved
- **Deadline Enforcement**: Lock mechanism prevents abuse

## Future Enhancements

- [ ] Batch milestone operations
- [ ] Grant templates
- [ ] Milestone dependencies
- [ ] Partial milestone approvals
- [ ] Grant analytics dashboard
- [ ] Email notifications for milestones
- [ ] Grant search and filtering

## Contributing

When adding new features:
1. Update the smart contract if needed
2. Add corresponding hooks in `useMilestoneFunding.ts`
3. Update UI components
4. Add tests
5. Update this README

## License

Part of the SovereignSeas project.

