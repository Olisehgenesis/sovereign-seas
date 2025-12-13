# Complete The Graph Setup Guide for SovSeas Analytics

This is a step-by-step guide to set up The Graph subgraph for your analytics.

## Prerequisites

- Node.js 16+ or pnpm
- Graph CLI installed globally
- The Graph Studio account

## Step 1: Install Graph CLI

```bash
pnpm add -g @graphprotocol/graph-cli
# or
npm install -g @graphprotocol/graph-cli
```

Verify installation:
```bash
graph --version
```

## Step 2: Prepare Your Subgraph

Your subgraph folder already exists! Let's check and update it:

```bash
cd subgraph
```

### 2.1: Copy Contract ABI

```bash
# From project root
cp src/abi/seas4ABI.ts subgraph/abis/SovereignSeas.json
```

**Important**: You need to convert the TypeScript ABI to pure JSON:
- Remove `export const contractABI =`
- Remove TypeScript type annotations
- Keep only the JSON array

Or extract ABI directly:
```bash
# If you have the contract compiled
# Copy the ABI from your contract compilation output
```

### 2.2: Update Contract Address

Edit `subgraph/subgraph.yaml`:
```yaml
source:
  address: "0x0cc096b1cc568a22c1f02dab769881d1afe6161a" # Your actual contract address
  startBlock: 0 # Or the block where contract was deployed (recommended)
```

### 2.3: Verify Schema

Check `subgraph/schema.graphql` - it should have:
- `Vote` entity
- `ProjectVoteStats` entity  
- `CampaignProject` entity

## Step 3: Generate Types

```bash
cd subgraph
graph codegen
```

This generates TypeScript types from your schema.

## Step 4: Build Subgraph

```bash
graph build
```

This compiles your subgraph. Fix any errors that appear.

## Step 5: Create Subgraph on The Graph Studio

1. **Go to**: https://thegraph.com/studio/
2. **Sign in** with GitHub or email
3. **Click "Create a Subgraph"**
4. **Fill in details**:
   - Name: `sovseas-analytics`
   - Network: `Celo`
   - Indexer: Choose (decentralized network is free)
5. **Copy your deploy key** (you'll need this)

## Step 6: Authenticate

```bash
graph auth --studio <YOUR_DEPLOY_KEY>
```

Replace `<YOUR_DEPLOY_KEY>` with the key from Step 5.

## Step 7: Deploy Subgraph

```bash
graph deploy --studio sovseas-analytics
```

This will:
- Upload your subgraph to IPFS
- Start indexing events
- Take a few minutes to sync

## Step 8: Wait for Sync

1. Go back to The Graph Studio dashboard
2. Watch the sync progress
3. Wait until it's fully synced (green status)

## Step 9: Get Subgraph URL

Once synced, you'll see:
- **Query URL**: `https://api.studio.thegraph.com/query/<ID>/sovseas-analytics/<VERSION>`
- Copy this URL

## Step 10: Test Query

In The Graph Studio, go to the "Playground" tab and test:

```graphql
{
  projectVoteStats(
    orderBy: totalVotes
    orderDirection: desc
    first: 5
  ) {
    id
    projectId
    totalVotes
    totalPayout
    uniqueVoterCount
    voteCount
  }
}
```

## Step 11: Add to Environment

Add to your `.env` file:
```env
NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/<ID>/sovseas-analytics/<VERSION>
```

## Step 12: Update Analytics Hook

The hook will automatically use The Graph if the URL is set. Check `src/hooks/useProjectAnalytics.ts` - it should already support subgraph queries.

## Troubleshooting

### "Subgraph not found"
- Make sure you deployed correctly
- Check the subgraph name matches
- Verify you're using the correct network (Celo)

### "No data returned"
- Wait for sync to complete (can take 10-30 minutes)
- Check that events exist in the contract
- Verify contract address is correct

### "Schema errors"
- Run `graph codegen` again
- Check schema.graphql syntax
- Make sure all entities are defined

### "ABI errors"
- Verify ABI file exists at `subgraph/abis/SovereignSeas.json`
- Check ABI is valid JSON (not TypeScript)
- Ensure event signatures match

## Quick Reference

```bash
# Generate types
graph codegen

# Build
graph build

# Deploy
graph deploy --studio sovseas-analytics

# Check status
# (In The Graph Studio dashboard)
```

## Cost

- **Decentralized Network**: Free for public subgraphs ✅
- **Hosted Service**: Free but deprecated
- **Studio Hosted**: Pay-as-you-go (not needed for this)

**Recommendation**: Use the decentralized network (free)!

## Next Steps After Deployment

1. Wait for sync (10-30 minutes)
2. Test queries in Playground
3. Add URL to `.env`
4. Restart your app
5. Analytics will automatically use The Graph!

## Alternative: Use Existing Subgraph

If someone else has already deployed a subgraph for your contract, you can use it directly:

1. Find the subgraph on The Graph Explorer
2. Copy the query URL
3. Add to `.env`
4. Done!

No deployment needed if the subgraph already exists.

