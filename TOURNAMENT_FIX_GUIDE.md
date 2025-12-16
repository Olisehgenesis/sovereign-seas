# Tournament UI Fix Guide

## Problem Summary
Tournaments are created successfully via script, but not showing in the UI.

## Root Cause Analysis

### ✅ What's Working
1. Tournament creation script executes successfully
2. Contract address matches: `0x00242eBD746962a79c9726e5B81c474bDc6091e0`
3. Contract structure is correct (stages are created when tournament starts)
4. UI hooks are properly implemented

### ❌ Likely Issues

1. **Environment Variable Not Set**
   - UI needs `NEXT_PUBLIC_ENV=celo-sepolia` or `NEXT_PUBLIC_NETWORK=celo-sepolia`
   - Without this, UI might use wrong contract address

2. **Network Mismatch**
   - UI must be connected to Celo Sepolia (chain ID: 11142220)
   - Wrong network = wrong contract address

3. **nextTournamentId Returns 0**
   - If contract address is wrong, `nextTournamentId` will be 0
   - This causes `useAllTournaments` to return empty array

## Quick Fix Steps

### Step 1: Verify Environment Variables

Create or update `.env.local` in `betanext/` directory:

```bash
# Required for Celo Sepolia
NEXT_PUBLIC_ENV=celo-sepolia
# OR
NEXT_PUBLIC_NETWORK=celo-sepolia

# Tournament contract address (optional, has fallback)
NEXT_PUBLIC_TOURNAMENT_CONTRACT_ADDRESS=0x00242eBD746962a79c9726e5B81c474bDc6091e0
NEXT_PUBLIC_TOURNAMENT_CONTRACT_ADDRESS_TESTNET=0x00242eBD746962a79c9726e5B81c474bDc6091e0
```

### Step 2: Restart Development Server

```bash
cd betanext
pnpm dev
```

### Step 3: Verify Contract Address in Browser Console

Open browser console and check:
```javascript
// Should log the contract address selection
// Look for: "Tournament Contract Address Selection (Celo Sepolia)"
```

### Step 4: Check Network Connection

1. Connect wallet to Celo Sepolia
2. Verify chain ID is `11142220`
3. Check RPC endpoint is correct

### Step 5: Test Contract Read

Add this temporarily to `betanext/src/legacy-pages/explorer/tournaments/page.tsx`:

```typescript
// Add after line 57
console.log('Debug Info:', {
  contractAddress: CONTRACT_ADDRESS,
  tournaments,
  isLoading,
  error,
  nextTournamentId: // You'll need to add useNextTournamentId hook
});
```

## Debugging Checklist

- [ ] Environment variable `NEXT_PUBLIC_ENV` or `NEXT_PUBLIC_NETWORK` is set to `celo-sepolia`
- [ ] Development server restarted after setting env vars
- [ ] Wallet connected to Celo Sepolia (chain ID: 11142220)
- [ ] Contract address in console matches `0x00242eBD746962a79c9726e5B81c474bDc6091e0`
- [ ] `nextTournamentId` is greater than 0
- [ ] Tournament was actually created (check transaction hash)
- [ ] No RPC errors in browser console

## Understanding Stages

### When Stages Are Created

1. **Tournament Created**: No stages yet
2. **Tournament Started**: Stage 0 created automatically
3. **Stage Finalized**: Next stage can be created manually or automatically

### Stage Information

- **Stage Count**: `getStageCount(tournamentId)` - Total stages created
- **Current Stage**: `getCurrentStageNumber(tournamentId)` - Active stage number
- **Stage Info**: `getStageInfo(tournamentId, stageNumber)` - Full details

### Important Notes

- Stages are **NOT** created when tournament is created
- Stages are created when tournament is **STARTED**
- Stage 0 is created automatically on `startTournament()`
- Subsequent stages require manual creation or auto-progression

## Verification Commands

### Check if Tournament Exists On-Chain

```bash
# Using cast (Foundry)
cast call 0x00242eBD746962a79c9726e5B81c474bDc6091e0 "nextTournamentId()" --rpc-url https://celo-sepolia.infura.io/v3/YOUR_KEY

# Should return number > 0 if tournaments exist
```

### Check Specific Tournament

```bash
# Get tournament 0
cast call 0x00242eBD746962a79c9726e5B81c474bDc6091e0 "tournaments(uint256)" 0 --rpc-url https://celo-sepolia.infura.io/v3/YOUR_KEY
```

## Expected Behavior

### After Tournament Creation (Not Started)
- ✅ Tournament appears in list
- ✅ `active = false`
- ✅ `stageCount = 0`
- ✅ `currentStageNumber = 0`

### After Tournament Started
- ✅ `active = true`
- ✅ `stageCount = 1` (Stage 0 created)
- ✅ `currentStageNumber = 0`
- ✅ Stage 0 is active and accepting votes

## If Still Not Working

1. **Check Browser Console**
   - Look for contract address logs
   - Check for RPC errors
   - Verify network connection

2. **Verify Contract Deployment**
   - Check block explorer: https://sepolia.celoscan.io/address/0x00242eBD746962a79c9726e5B81c474bDc6091e0
   - Verify contract code exists
   - Check recent transactions

3. **Test Contract Read Directly**
   - Use wagmi devtools or browser console
   - Call `nextTournamentId()` directly
   - Call `tournaments(0)` to get first tournament

4. **Check ABI**
   - Verify `betanext/src/abi/tounament.ts` matches deployed contract
   - Check function signatures

## Summary

The most likely issue is **missing environment variable** for network detection. Set `NEXT_PUBLIC_ENV=celo-sepolia` and restart the dev server.

Stages are correctly implemented - they're created when tournament starts, not when tournament is created.

