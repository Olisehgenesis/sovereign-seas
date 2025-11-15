# Divvi Integration Analysis - Voting Methods

## ✅ Functions WITH Divvi Integration

### 1. **useVotingMethods.ts - `vote()` function**
**Status**: ✅ HAS DIVVI
**Implementation**:
- ✅ Imports `getReferralTag` and `submitReferral` from '@divvi/referral-sdk'
- ✅ Generates referral tag with user address
- ✅ Appends referral tag to transaction calldata
- ✅ Submits referral to Divvi after transaction
- ✅ Uses `sendTransactionAsync` for proper wallet prompts
- ✅ Checks testnet/mainnet for chainId

**Code Location**: Lines 167-202

### 2. **useVotingMethods.ts - `voteWithCelo()` function**
**Status**: ✅ HAS DIVVI (with minor issue)
**Implementation**:
- ✅ Generates referral tag with user address
- ✅ Appends referral tag to transaction calldata
- ✅ Submits referral to Divvi after transaction
- ✅ Uses `sendTransactionAsync` for proper wallet prompts
- ⚠️ **ISSUE**: Hardcoded chainId = 42220 (mainnet only)
  - Should check testnet like `vote()` function does

**Code Location**: Lines 209-271

### 3. **useVotingMethods.ts - `batchVote()` function**
**Status**: ✅ HAS DIVVI (indirectly)
**Implementation**:
- ✅ Calls `vote()` and `voteWithCelo()` which have Divvi integration
- ✅ Each vote in the batch will have Divvi tracking

**Code Location**: Lines 273-310

---

## ❌ Functions WITHOUT Divvi Integration

### 1. **useGoodDollarVoter.ts - `swapAndVote()` function**
**Status**: ❌ MISSING DIVVI
**Issues**:
- ❌ Uses `walletClient.writeContract` directly
- ❌ No referral tag generation
- ❌ No referral tag appended to transaction data
- ❌ No Divvi referral submission
- ❌ Missing Divvi imports

**Code Location**: `beta/src/hooks/useGoodDollarVoter.ts` Lines 207-260

**Impact**: GoodDollar swap-and-vote transactions are NOT tracked by Divvi

### 2. **useGoodDollarVoter.ts - `swapAndVoteWithPool()` function**
**Status**: ❌ MISSING DIVVI
**Issues**: Same as `swapAndVote()`

**Code Location**: `beta/src/hooks/useGoodDollarVoter.ts` Lines 262-292

---

## ⚠️ Issues Found

### Issue 1: Hardcoded ChainId in `voteWithCelo()`
**File**: `beta/src/hooks/useVotingMethods.ts`
**Line**: 235
**Problem**: 
```typescript
const celoChainId = 42220; // Celo mainnet chain ID
```
**Should be**:
```typescript
const isTestnet = import.meta.env.VITE_ENV === 'testnet';
const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet
```

**Impact**: Divvi referral submission will fail on testnet

### Issue 2: Missing Divvi in GoodDollar Voting
**File**: `beta/src/hooks/useGoodDollarVoter.ts`
**Problem**: GoodDollar swap-and-vote transactions don't track Divvi referrals

**Impact**: Lost referral tracking for GoodDollar votes

---

## 📊 Summary

| Function | Divvi Integration | Status | Notes |
|----------|------------------|--------|-------|
| `vote()` | ✅ Yes | Working | Properly implemented |
| `voteWithCelo()` | ✅ Yes | ⚠️ Issue | Hardcoded chainId |
| `batchVote()` | ✅ Yes | Working | Uses vote/voteWithCelo |
| `swapAndVote()` | ❌ No | Missing | Needs implementation |
| `swapAndVoteWithPool()` | ❌ No | Missing | Needs implementation |

---

## 🔧 Recommended Fixes

### Fix 1: Update `voteWithCelo()` chainId
```typescript
// Current (Line 235):
const celoChainId = 42220; // Celo mainnet chain ID

// Should be:
const isTestnet = import.meta.env.VITE_ENV === 'testnet';
const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet
```

### Fix 2: Add Divvi to `swapAndVote()` functions
1. Import Divvi SDK:
   ```typescript
   import { getReferralTag, submitReferral } from '@divvi/referral-sdk'
   import { Interface } from 'ethers'
   ```

2. Generate and append referral tag:
   ```typescript
   // Encode function data
   const swapInterface = new Interface(GOOD_DOLLAR_VOTER_ABI)
   const swapData = swapInterface.encodeFunctionData('swapAndVote', [
     campaignId, projectId, gsAmount, minCeloOut, bypassCode
   ])
   
   // Generate referral tag
   const referralTag = getReferralTag({
     user: account as Address,
     consumer: '0x53eaF4CD171842d8144e45211308e5D90B4b0088' as Address,
   })
   
   // Append to transaction data
   const dataWithSuffix = swapData + referralTag
   ```

3. Use `sendTransaction` with modified data instead of `writeContract`

4. Submit referral after transaction

---

## ✅ Verification Checklist

- [x] `vote()` has Divvi integration
- [x] `voteWithCelo()` has Divvi integration (needs chainId fix)
- [x] `batchVote()` has Divvi integration (via vote functions)
- [ ] `swapAndVote()` has Divvi integration ❌
- [ ] `swapAndVoteWithPool()` has Divvi integration ❌
- [ ] All functions use proper chainId detection
- [ ] All functions append referral tag to calldata
- [ ] All functions submit referral after transaction

---

## 🎯 Priority

1. **HIGH**: Fix `voteWithCelo()` chainId issue (breaks testnet)
2. **MEDIUM**: Add Divvi to `swapAndVote()` functions (missing tracking)
3. **LOW**: Review and test all implementations

