# Tournament Contract Analysis

## Overview
Analysis of the tournament creation script, contract structure, and UI integration to identify why tournaments aren't showing in the UI.

## Contract Addresses

From `contracts.md`:
- **SeasV4 (Celo Sepolia)**: `0x73Ac3CE3358a892f69238C7009CA4da4b0dd1470`
- **Tournament (Celo Sepolia)**: `0x00242eBD746962a79c9726e5B81c474bDc6091e0`

## Tournament Creation Script Analysis

### Script: `create-tournament-with-projects.ts`

**What it does:**
1. ✅ Creates a tournament with:
   - `sovseasCampaignId`: 0 (not tied to campaign)
   - `stageDuration`: 3600 seconds (1 hour)
   - `payoutToken`: CELO token address
   - `autoProgress`: false (manual progression)
   - `disqualifyEnabled`: true

2. ✅ Adds projects (IDs 0-18, 19 projects total) to the tournament
3. ✅ Approves all projects

**Important Notes:**
- Tournament is created but **NOT STARTED** by the script
- Stages are **NOT created** until tournament is started
- When tournament starts, Stage 0 is automatically created with 20% elimination percentage

## Contract Structure Analysis

### Tournament Lifecycle

1. **Creation** (`createTournament`):
   - Tournament ID assigned (`nextTournamentId++`)
   - `active = false`
   - No stages created yet
   - Projects can be added/removed

2. **Starting** (`startTournament`):
   - Sets `active = true`
   - Creates Stage 0 automatically
   - Requires at least 2 approved projects
   - Stage 0 starts immediately with 20% elimination

3. **Stages**:
   - Created dynamically as tournament progresses
   - Stage 0 created on `startTournament()`
   - Subsequent stages created via:
     - `startNextStageManually()` (manual)
     - `scheduleNextStage()` + `startScheduledStage()` (scheduled)
     - Auto-progression (if `autoProgress = true`)

### Stage Structure

```solidity
struct Stage {
    uint256 stageNumber;
    uint256 start;              // When stage started (0 if not started)
    uint256 end;                 // When stage ends
    uint256 scheduledStart;      // Scheduled start time (0 if not scheduled)
    uint256 rewardPool;          // Total rewards in stage
    uint256 eliminationPercentage; // % of projects to eliminate
    bool finalized;              // Whether stage is finalized
    bool started;                // Whether stage has started
}
```

**Key Points:**
- Stages exist in `tournamentStages[tournamentId]` array
- Stage count = `tournamentStages[tournamentId].length`
- Current stage = last started stage
- Stages are indexed starting from 0

## UI Integration Analysis

### How UI Fetches Tournaments

**File**: `betanext/src/hooks/useTournamentMethods.ts`

```typescript
export function useAllTournaments(contractAddress: Address) {
  // 1. Get nextTournamentId
  const { nextTournamentId } = useNextTournamentId(contractAddress);
  
  // 2. Generate tournament IDs from 0 to nextTournamentId - 1
  const tournamentIds = nextTournamentId !== undefined 
    ? Array.from({ length: Number(nextTournamentId) }, (_, i) => BigInt(i))
    : [];
  
  // 3. Fetch all tournaments
  const { data } = useReadContracts({
    contracts: tournamentIds.map(tournamentId => ({
      address: contractAddress,
      abi,
      functionName: 'tournaments',
      args: [tournamentId]
    }))
  });
  
  // 4. Parse results
  // ...
}
```

### Contract Address Resolution

**File**: `betanext/src/utils/contractConfig.ts`

```typescript
export function getTournamentContractAddress(): `0x${string}` {
  if (isCeloSepolia) {
    return process.env.NEXT_PUBLIC_TOURNAMENT_CONTRACT_ADDRESS_TESTNET || 
           process.env.NEXT_PUBLIC_TOURNAMENT_CONTRACT_ADDRESS || 
           '0x00242eBD746962a79c9726e5B81c474bDc6091e0'; // Fallback
  }
  // ...
}
```

## Why Tournaments Aren't Showing in UI

### Potential Issues

1. **Contract Address Mismatch**
   - ✅ Contract address in `contracts.md`: `0x00242eBD746962a79c9726e5B81c474bDc6091e0`
   - ✅ UI fallback address: `0x00242eBD746962a79c9726e5B81c474bDc6091e0` (matches)
   - ⚠️ **Check**: Environment variable might be set incorrectly

2. **Network/Chain Mismatch**
   - UI checks `isCeloSepolia` based on `NEXT_PUBLIC_ENV` or `NEXT_PUBLIC_NETWORK`
   - If not set to `'celo-sepolia'`, wrong contract address might be used
   - ⚠️ **Check**: Verify environment variables

3. **nextTournamentId Returns 0**
   - If `nextTournamentId` is 0 or undefined, no tournaments will be fetched
   - This happens if:
     - Contract address is wrong
     - Network is wrong
     - Contract hasn't been deployed
     - No tournaments created yet
   - ⚠️ **Check**: Verify `nextTournamentId` value

4. **Tournament Data Parsing Issues**
   - The hook expects specific data structure from contract
   - If contract returns different structure, parsing fails
   - ⚠️ **Check**: Verify contract ABI matches contract

5. **Tournament Filtering**
   - UI might filter out inactive tournaments
   - ⚠️ **Check**: Review tournament list page filtering logic

## Stages Analysis

### When Stages Are Created

1. **Stage 0**: Created automatically when `startTournament()` is called
   - Elimination: 20%
   - Starts immediately
   - Duration: `tournament.stageDuration`

2. **Subsequent Stages**: Created via:
   - `startNextStageManually()` - Creates and starts immediately
   - `scheduleNextStage()` - Creates but doesn't start (scheduled)
   - Auto-progression (if enabled) - Creates and starts automatically

### Stage Information Available

The contract provides these view functions:
- `getStageCount(tournamentId)` - Total number of stages
- `getCurrentStageNumber(tournamentId)` - Current active stage
- `getStageInfo(tournamentId, stageNumber)` - Full stage details
- `getStageStatus(tournamentId, stageNumber)` - Stage status (active/ended/finalized)

## Debugging Steps

### 1. Verify Contract Address
```bash
# Check environment variables
echo $NEXT_PUBLIC_TOURNAMENT_CONTRACT_ADDRESS
echo $NEXT_PUBLIC_TOURNAMENT_CONTRACT_ADDRESS_TESTNET
echo $NEXT_PUBLIC_ENV
echo $NEXT_PUBLIC_NETWORK
```

### 2. Check nextTournamentId
```javascript
// In browser console or add to UI temporarily
const contractAddress = '0x00242eBD746962a79c9726e5B81c474bDc6091e0';
// Call contract: nextTournamentId()
```

### 3. Verify Network Connection
- Ensure wallet is connected to Celo Sepolia (chain ID: 11142220)
- Check RPC endpoint is correct

### 4. Check Tournament Creation
- Verify tournament was actually created on-chain
- Check transaction hash from script output
- Verify on block explorer: https://sepolia.celoscan.io/

### 5. Test Contract Read
```javascript
// Try reading a specific tournament
// tournaments(0) should return tournament data if tournament ID 0 exists
```

## Recommendations

### Immediate Fixes

1. **Set Environment Variables**
   ```bash
   NEXT_PUBLIC_TOURNAMENT_CONTRACT_ADDRESS=0x00242eBD746962a79c9726e5B81c474bDc6091e0
   NEXT_PUBLIC_ENV=celo-sepolia
   # OR
   NEXT_PUBLIC_NETWORK=celo-sepolia
   ```

2. **Verify Tournament Was Created**
   - Check script output for tournament ID
   - Verify on block explorer
   - Confirm `nextTournamentId` increased

3. **Check Browser Console**
   - Look for contract address selection logs
   - Check for RPC errors
   - Verify network connection

### Code Improvements

1. **Add Better Error Handling**
   - Log contract address being used
   - Log `nextTournamentId` value
   - Show error messages in UI

2. **Add Debug Mode**
   - Display contract address in UI (dev mode)
   - Show `nextTournamentId` value
   - Show network information

3. **Verify ABI**
   - Ensure `tournamentABI` matches deployed contract
   - Check function signatures

## Summary

**The tournament creation script works correctly** - it creates tournaments and adds projects.

**The issue is likely:**
1. Environment variable configuration (contract address or network)
2. Network mismatch (UI not connected to Celo Sepolia)
3. Contract address not matching between script and UI
4. `nextTournamentId` returning 0 (no tournaments found)

**Stages are correctly implemented** - they're created when tournament starts, not when tournament is created.

**Next Steps:**
1. Verify environment variables are set correctly
2. Check browser console for errors
3. Verify network connection (Celo Sepolia)
4. Check `nextTournamentId` value
5. Verify tournament was actually created on-chain

