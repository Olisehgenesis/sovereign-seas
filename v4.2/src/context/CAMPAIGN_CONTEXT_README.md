# CampaignContext Implementation

## Overview

The `CampaignContext` provides centralized state management for campaign data, eliminating redundant data fetching and improving performance across the application.

## Key Benefits

1. **Centralized State Management**: All campaign-related data is managed in one place
2. **Reduced Redundant Fetching**: Data is fetched once and shared across components
3. **Better Performance**: Eliminates duplicate API calls and improves user experience
4. **Type Safety**: Full TypeScript support with proper interfaces

## Usage

### 1. Wrap Your Component Tree

```tsx
import { CampaignProvider } from '@/context/CampaignContext';

function App() {
  return (
    <CampaignProvider campaignId={BigInt(campaignId)}>
      <YourCampaignComponents />
    </CampaignProvider>
  );
}
```

### 2. Use the Context in Components

```tsx
import { useCampaignContext } from '@/context/CampaignContext';

function CampaignComponent() {
  const {
    campaignDetails,
    campaignLoading,
    sortedProjects,
    isAdmin,
    totalVotes,
    refetchAllData
  } = useCampaignContext();

  if (campaignLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>{campaignDetails.campaign.name}</h1>
      <div>Total Votes: {totalVotes}</div>
      {sortedProjects.map(project => (
        <div key={project.id}>{project.name}</div>
      ))}
    </div>
  );
}
```

## Available Context Values

### Campaign Data
- `campaignDetails`: Full campaign information
- `campaignLoading`: Loading state for campaign data
- `campaignError`: Error state for campaign data

### Projects Data
- `allProjects`: All projects in the system
- `projectsLoading`: Loading state for projects
- `projectsError`: Error state for projects

### User Data
- `isAdmin`: Whether current user is campaign admin
- `adminLoading`: Loading state for admin check
- `adminError`: Error state for admin check

### Token Amounts
- `celoAmount`: CELO token amount in campaign
- `cusdAmount`: cUSD token amount in campaign

### Voting Data
- `totalVotes`: User's total votes in campaign
- `vote`: Vote function
- `isVotePending`: Vote transaction pending state

### Sorted Projects
- `sortedProjectIds`: Array of sorted project IDs
- `sortedProjectsLoading`: Loading state for sorted projects
- `sortedProjectsError`: Error state for sorted projects

### Project Management
- `canBypassFees`: Whether user can bypass fees
- `approveProject`: Function to approve projects
- `isApprovingProject`: Project approval pending state

### Processed Data
- `campaignProjects`: Projects filtered for this campaign
- `sortedProjects`: Projects sorted by vote count
- `approvedProjectIds`: Set of approved project IDs

### Vote Counts State
- `projectVoteCounts`: Map of project vote counts
- `updateProjectVoteCount`: Function to update vote counts

### Refetch Functions
- `refetchAllData`: Refetch all campaign data
- `refetchSorted`: Refetch sorted projects

### Campaign Status
- `campaignStatus`: Object with campaign timing information
  - `hasStarted`: Whether campaign has started
  - `hasEnded`: Whether campaign has ended
  - `isActive`: Whether campaign is currently active
  - `startTime`: Campaign start timestamp
  - `endTime`: Campaign end timestamp

## Migration from Old Approach

### Before (Old Approach)
```tsx
// Multiple hooks in component
const { campaignDetails, isLoading: campaignLoading } = useCampaignDetails(contractAddress, campaignId);
const { projects: allProjects, isLoading: projectsLoading } = useAllProjects(contractAddress);
const { isAdmin, isLoading: adminLoading } = useIsCampaignAdminCheck(contractAddress, campaignId, address);
// ... many more hooks
```

### After (Context Approach)
```tsx
// Single context hook
const {
  campaignDetails,
  campaignLoading,
  allProjects,
  projectsLoading,
  isAdmin,
  adminLoading
} = useCampaignContext();
```

## Implementation Files

1. **CampaignContext.tsx**: Main context implementation
2. **CampaignViewWithContext.tsx**: Example component using context
3. **CampaignPageWrapper.tsx**: Wrapper component that provides context
4. **main.tsx**: Updated routing to use new wrapper

## Testing

To test the new implementation:

1. Navigate to a campaign page: `/explorer/campaign/{id}`
2. Verify that data loads correctly
3. Check that vote counts update properly
4. Ensure admin functions work as expected
5. Verify that project filtering and sorting work correctly

## Performance Improvements

- **Reduced API Calls**: Data is fetched once and shared
- **Better Caching**: Centralized caching strategy
- **Optimized Re-renders**: Context prevents unnecessary re-renders
- **Memory Efficiency**: Shared state reduces memory usage

## Error Handling

The context includes comprehensive error handling:
- Individual error states for each data type
- Graceful fallbacks for missing data
- Proper loading states for better UX

## Future Enhancements

- Add real-time updates via WebSocket
- Implement optimistic updates for better UX
- Add more granular caching strategies
- Support for multiple campaigns simultaneously 