# Project Milestone Implementation Plan

## Overview
This document outlines the implementation plan for adding project milestone functionality to the frontend application.

## Analysis Summary

### Current System Structure

1. **Project View Page** (`beta/src/pages/explorer/project/<id>/page.tsx`)
   - Has tabs: Overview, Campaigns, Technical, Analytics, Admin (owner only)
   - Admin tab has project management actions
   - Uses Tabs component from shadcn/ui

2. **Header Component** (`beta/src/components/layout/Header.tsx`)
   - Has navigation dropdowns (Explorer, Create)
   - Wallet button
   - Contact Us button
   - Mobile menu

3. **Modals** (`beta/src/components/modals/`)
   - Pattern: Use Transition/Dialog from Headless UI
   - Examples: ProjectCampaignsModal, VoteModal, FundDonateModal

4. **Hooks** (`beta/src/hooks/`)
   - Pattern: Custom hooks using wagmi (useWriteContract, useReadContract, useSendTransaction)
   - Example: useMilestoneMethods.ts (for grant milestones)

5. **ABI Location** (`beta/src/abi/milestoneABI.ts`)
   - Contains grant milestone functions
   - Needs to be updated with project milestone functions

## Implementation Tasks

### 1. Update ABI ✅
**File**: `beta/src/abi/milestoneABI.ts`
- Add all new project milestone function ABIs:
  - `createProjectMilestone`
  - `fundProjectMilestone`
  - `claimOpenMilestone`
  - `submitMilestoneEvidence`
  - `approveProjectMilestone`
  - `rejectProjectMilestone`
  - `claimCompletionRewards`
  - `addMilestoneSteward`
  - `removeMilestoneSteward`
  - `cancelProjectMilestone`
  - All view functions (getProjectMilestone, etc.)
  - All events (ProjectMilestoneCreated, etc.)

**Action**: Compile contract or extract ABI from contract artifacts

### 2. Create Project Milestone Hooks ✅
**File**: `beta/src/hooks/useProjectMilestones.ts` (new file)

**Hooks to create**:
- `useCreateProjectMilestone()` - Create milestone
- `useFundProjectMilestone()` - Fund milestone with tokens
- `useClaimOpenMilestone()` - Claim open milestone
- `useSubmitMilestoneEvidence()` - Submit evidence
- `useApproveProjectMilestone()` - Approve milestone
- `useRejectProjectMilestone()` - Reject milestone
- `useClaimCompletionRewards()` - Claim rewards
- `useAddMilestoneSteward()` - Add steward
- `useRemoveMilestoneSteward()` - Remove steward
- `useCancelProjectMilestone()` - Cancel milestone
- `useProjectMilestones()` - Get all milestones for a project
- `useProjectMilestone()` - Get single milestone details
- `useOpenMilestones()` - Get all open milestones (for Tasks page)
- `useUserClaimedMilestones()` - Get user's claimed milestones
- `useCanSubmitMilestone()` - Check if user can submit
- `useCanApproveMilestone()` - Check if user can approve
- `useCanClaimMilestone()` - Check if milestone can be claimed

**Pattern**: Follow useMilestoneMethods.ts structure, use Divvi integration

### 3. Create Milestone Creation Modal ✅
**File**: `beta/src/components/modals/CreateProjectMilestoneModal.tsx` (new file)

**Features**:
- Form fields:
  - Title (required)
  - Description (required)
  - Requirements (required)
  - Milestone Type (INTERNAL, ASSIGNED, OPEN) - radio/select
  - Assigned To (if ASSIGNED type) - address input
  - Deadline (optional) - date picker
  - Required Approvals (default: 1)
  - Allow Site Admin Approval (checkbox)
  - Stewards (optional) - address array input
- Validation
- Submit button
- Loading states
- Success/error handling

**Pattern**: Follow ProjectCampaignsModal.tsx structure

### 4. Add Milestones Tab to Project View ✅
**File**: `beta/src/pages/explorer/project/<id>/page.tsx`

**Changes**:
- Add 'milestones' to TabId type
- Add Milestones tab to tabs array (with badge count)
- Add TabsContent for milestones tab
- Display:
  - List of all project milestones
  - Filter by status (DRAFT, ACTIVE, CLAIMED, SUBMITTED, APPROVED, REJECTED, PAID, CANCELLED)
  - Milestone cards showing:
    - Title, description, type
    - Status badge
    - Assigned to / Claimed by
    - Reward amounts (tokens)
    - Deadline
    - Actions (view, approve, reject, etc.)

### 5. Add Create Milestone Button in Admin Tab ✅
**File**: `beta/src/pages/explorer/project/<id>/page.tsx`

**Changes**:
- In Admin tab, add "Create Milestone" button
- Opens CreateProjectMilestoneModal
- Only visible to project owner

### 6. Add Tasks Button in Header ✅
**File**: `beta/src/components/layout/Header.tsx`

**Changes**:
- Add "Tasks" button next to Wallet button
- Icon: CheckSquare or ListChecks (from lucide-react)
- Navigate to `/app/tasks` page
- Show badge with count of open milestones (optional)

### 7. Create Tasks Page ✅
**File**: `beta/src/pages/app/tasks/page.tsx` (new file)

**Features**:
- Show all open milestones (status: ACTIVE, type: OPEN)
- Filter/search functionality
- Milestone cards:
  - Project name/link
  - Title, description, requirements
  - Reward amounts
  - Deadline
  - "Claim" button
- Show user's claimed milestones
- Show user's submitted milestones
- Tabs:
  - Available (open milestones)
  - My Claims (claimed by user)
  - My Submissions (submitted by user)

**Route**: Add to `beta/src/main.tsx`:
```tsx
<Route path="/app/tasks" element={<Layout><TasksPage /></Layout>} />
```

### 8. Create Milestone Detail/Management Components ✅
**Files**: 
- `beta/src/components/milestones/MilestoneCard.tsx` (new)
- `beta/src/components/milestones/MilestoneDetailModal.tsx` (new)

**MilestoneCard**:
- Display milestone info
- Status badge
- Actions based on user role
- Click to open detail modal

**MilestoneDetailModal**:
- Full milestone details
- Evidence display (if submitted)
- Approval/rejection interface (for approvers)
- Submit evidence (for assignee)
- Claim rewards (if approved)
- Add/remove stewards (for owner)

### 9. Update Contract Config ✅
**File**: `beta/src/utils/contractConfig.ts`

**Changes**:
- Add function to get milestone contract address:
  ```ts
  export function getMilestoneContractAddress(): `0x${string}`
  ```
- Support testnet/mainnet

### 10. Environment Variables ✅
**File**: `.env` (or env.example)

**Add**:
```
VITE_MILESTONE_CONTRACT_ADDRESS=0x...
VITE_MILESTONE_CONTRACT_ADDRESS_TESTNET=0x...
```

## Implementation Order

1. ✅ Update ABI (extract from compiled contract)
2. ✅ Update contractConfig.ts
3. ✅ Create hooks (useProjectMilestones.ts)
4. ✅ Create CreateProjectMilestoneModal
5. ✅ Add Milestones tab to project view
6. ✅ Add Create Milestone button in admin tab
7. ✅ Create MilestoneCard component
8. ✅ Create MilestoneDetailModal
9. ✅ Add Tasks button to header
10. ✅ Create Tasks page
11. ✅ Add route for Tasks page
12. ✅ Test all functionality

## Key Considerations

1. **Divvi Integration**: All write functions should use Divvi (append referral tag, submit referral)
2. **Mobile Responsiveness**: All new components must be mobile-first
3. **Error Handling**: Proper error messages and loading states
4. **Permissions**: Check user permissions before showing actions
5. **Token Support**: Support multi-token funding (ERC20 + CELO)
6. **IPFS**: Evidence submission uses IPFS hashes
7. **Status Flow**: DRAFT → ACTIVE → CLAIMED → SUBMITTED → APPROVED → PAID

## Files to Create/Modify

### New Files:
- `beta/src/hooks/useProjectMilestones.ts`
- `beta/src/components/modals/CreateProjectMilestoneModal.tsx`
- `beta/src/components/milestones/MilestoneCard.tsx`
- `beta/src/components/milestones/MilestoneDetailModal.tsx`
- `beta/src/pages/app/tasks/page.tsx`

### Modified Files:
- `beta/src/abi/milestoneABI.ts` - Add project milestone functions
- `beta/src/utils/contractConfig.ts` - Add milestone contract address
- `beta/src/pages/explorer/project/<id>/page.tsx` - Add milestones tab, create button
- `beta/src/components/layout/Header.tsx` - Add Tasks button
- `beta/src/main.tsx` - Add Tasks route

## Testing Checklist

- [ ] Create milestone (INTERNAL, ASSIGNED, OPEN)
- [ ] Fund milestone with tokens
- [ ] Claim open milestone
- [ ] Submit evidence
- [ ] Approve milestone
- [ ] Reject milestone
- [ ] Claim rewards
- [ ] Add/remove stewards
- [ ] Cancel milestone
- [ ] View milestones in project tab
- [ ] View open milestones in Tasks page
- [ ] Mobile responsiveness
- [ ] Error handling
- [ ] Loading states
- [ ] Divvi integration

