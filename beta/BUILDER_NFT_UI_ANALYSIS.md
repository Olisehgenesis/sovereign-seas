# Builder NFT Modal & UI Analysis

## Current Features ✅

1. **Basic Display**
   - Tier badge (Cadet, Navigator, Captain, Legendary)
   - Builder name and headline
   - Skills display (first 3)
   - Stats: Sold, Remaining, Projects
   - Progress bar
   - Fragment price and Flow price

2. **Buy Functionality**
   - Buy button (when not owner and not sold out)
   - Buy modal with amount input
   - Price calculation and total cost display

3. **Status Indicators**
   - Sold out indicator
   - Owner indicator

## Missing Features ❌

### 1. **User Fragment Balance** 🔴 CRITICAL
- **Issue**: Users can't see how many fragments they own
- **Solution**: Add `useBuilderFragmentBalance` hook to display user's balance
- **Location**: Should be shown in stats grid or as a separate section

### 2. **Bid System** 🔴 CRITICAL
- **Issue**: When sold out, users should be able to place bids (secondary market)
- **Missing Features**:
  - "Place Bid" button when sold out
  - Display active bids list
  - For owners: Accept bid functionality
  - For bidders: View/cancel their own bids
  - Bid expiry countdown
- **Hooks Available**: `useBuilderActiveBids` exists but not used

### 3. **Owner Actions** 🔴 CRITICAL
- **Issue**: Owners can't manage their builder slot
- **Missing Features**:
  - Update fragment price button
  - Update flow price button
  - Update metadata button
  - Activate/Deactivate slot toggle
  - Owner actions modal/section
- **Hooks Available**: All actions exist in `useBuilderRewardsActions` but not exposed in UI

### 4. **Metadata Display** 🟡 IMPORTANT
- **Issue**: Limited metadata shown (only name, headline, first 3 skills)
- **Missing Features**:
  - Full description
  - Avatar image
  - Banner image
  - Location
  - Social links (Twitter, LinkedIn, GitHub, etc.)
  - Experience/achievements
  - Specialties (beyond skills)
  - Tags
  - Badges
- **Data Available**: All in `slot.metadata` object

### 5. **Error Handling** 🟡 IMPORTANT
- **Issue**: Errors are only logged to console
- **Missing Features**:
  - Error message display in modal
  - User-friendly error messages
  - Transaction error feedback
  - Validation error display

### 6. **Success Feedback** 🟡 IMPORTANT
- **Issue**: No confirmation after successful purchase
- **Missing Features**:
  - Success toast/notification
  - Transaction hash link
  - Confirmation message
  - Auto-refresh data after transaction

### 7. **Flow Price Explanation** 🟡 IMPORTANT
- **Issue**: Users don't understand what "Flow Price" means
- **Solution**: Add tooltip/help text explaining it's the minimum bid price when sold out

### 8. **Builder's Projects Link** 🟢 NICE TO HAVE
- **Issue**: Can't easily navigate to builder's projects
- **Solution**: Add link/button to view all projects by this builder
- **Data Available**: `slot.projectCount` shows count, but no link to projects

### 9. **View on Explorer** 🟢 NICE TO HAVE
- **Issue**: No way to view NFT on block explorer
- **Solution**: Add "View on Explorer" link with contract address and token ID

### 10. **Fragment Holders** 🟢 NICE TO HAVE
- **Issue**: Can't see who owns fragments
- **Solution**: Display list of fragment holders (if contract supports it)
- **Note**: May require additional contract view function

### 11. **Transaction History** 🟢 NICE TO HAVE
- **Issue**: No history of purchases/bids
- **Solution**: Display recent transactions (from events or subgraph)

### 12. **Buy Modal Improvements** 🟡 IMPORTANT
- **Missing Features**:
  - Close button (X) in modal header
  - Click outside to close
  - Better validation feedback
  - Max button (to buy all remaining)
  - Price change warning if price updates during purchase

### 13. **Inactive Slot Handling** 🟡 IMPORTANT
- **Issue**: No indication if slot is inactive
- **Solution**: Show inactive status and disable buy/bid buttons

### 14. **Loading States** 🟢 NICE TO HAVE
- **Issue**: Limited loading feedback
- **Solution**: Better skeleton loaders, loading states for all async operations

### 15. **Responsive Design** 🟢 NICE TO HAVE
- **Issue**: Modal might not be fully responsive
- **Solution**: Ensure modal works well on mobile devices

## Priority Recommendations

### High Priority (Implement First)
1. User fragment balance display
2. Bid system (place bid, view bids, accept bids)
3. Owner actions (update prices, metadata, activate/deactivate)
4. Error handling and success feedback
5. Flow price explanation

### Medium Priority
6. Full metadata display (avatar, banner, description, socials)
7. Buy modal improvements
8. Inactive slot handling

### Low Priority
9. Builder's projects link
10. View on explorer
11. Transaction history
12. Fragment holders list

## Code Changes Needed

### 1. Add User Balance Display
```typescript
const { balance } = useBuilderFragmentBalance(builderId, userAddress);
```

### 2. Add Bids Display
```typescript
const { bids, isLoading: bidsLoading } = useBuilderActiveBids(builderId);
```

### 3. Add Owner Actions
```typescript
const { 
  updateFragmentPrice, 
  updateFlowPrice, 
  updateMetadataForSlot,
  setBuilderSlotStatus 
} = useBuilderRewardsActions();
```

### 4. Add Error State
```typescript
const [error, setError] = useState<string | null>(null);
const [success, setSuccess] = useState<string | null>(null);
```

### 5. Add More Metadata Display
```typescript
// Display: avatar, banner, description, location, socials, etc.
{slot.metadata?.avatar && <img src={slot.metadata.avatar} />}
{slot.metadata?.description && <p>{slot.metadata.description}</p>}
{slot.metadata?.socials && <SocialLinks socials={slot.metadata.socials} />}
```

## UI/UX Improvements

1. **Modal Enhancements**:
   - Add backdrop click to close
   - Add close button (X)
   - Better spacing and typography
   - Loading states for all buttons

2. **Card Enhancements**:
   - Expandable metadata section
   - Better visual hierarchy
   - More prominent CTA buttons
   - Status badges (active/inactive, sold out, etc.)

3. **Bid System UI**:
   - Bids list modal
   - Bid placement modal
   - Bid acceptance confirmation
   - Bid expiry countdown

4. **Owner Dashboard**:
   - Separate section for owner actions
   - Settings modal
   - Price update forms
   - Metadata editor

