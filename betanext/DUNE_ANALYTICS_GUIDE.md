# Dune Analytics Setup Guide for SovSeas

Dune Analytics is an online platform that lets you query blockchain data using SQL. It's easier than The Graph for quick analytics!

## Why Dune Analytics?

- ✅ **No setup required** - Just write SQL queries online
- ✅ **Free tier available** - Good for most use cases
- ✅ **Visual dashboards** - Create charts and graphs
- ✅ **No deployment** - Everything runs in the browser
- ✅ **Real-time data** - Queries run against live blockchain data

## Step 1: Create Account

1. Go to https://dune.com
2. Sign up (free account works fine)
3. Verify your email

## Step 2: Create a New Query

1. Click **"New Query"** in the top right
2. Select **"Celo"** as the blockchain network
3. You'll see a SQL editor

## Step 3: Query VoteCast Events

Here's a SQL query to get all VoteCast events:

```sql
-- Get all VoteCast events from your contract
SELECT 
    evt_tx_hash as transaction_hash,
    evt_block_time as timestamp,
    evt_block_number as block_number,
    "voter" as voter_address,
    "campaignId" as campaign_id,
    "projectId" as project_id,
    "token" as token_address,
    "amount" as amount,
    "celoEquivalent" as celo_equivalent
FROM celo.logs
WHERE 
    contract_address = '0x0cc096b1cc568a22c1f02dab769881d1afe6161a' -- Your contract address
    AND topic0 = '0xbc1c66ac49e4d3cd87445bc4fa7fd1461e94122a328d8c4db3dc50bb668f8d82' -- VoteCast event signature
ORDER BY evt_block_time DESC
LIMIT 1000
```

## Step 4: Top 5 Projects by Total Votes

```sql
-- Top 5 projects by total votes (CELO equivalent)
SELECT 
    "projectId" as project_id,
    SUM("celoEquivalent") as total_votes,
    COUNT(DISTINCT "voter") as unique_voters,
    COUNT(*) as vote_count
FROM celo.logs
WHERE 
    contract_address = '0x0cc096b1cc568a22c1f02dab769881d1afe6161a'
    AND topic0 = '0xbc1c66ac49e4d3cd87445bc4fa7fd1461e94122a328d8c4db3dc50bb668f8d82'
GROUP BY "projectId"
ORDER BY total_votes DESC
LIMIT 5
```

## Step 5: Top 5 Projects by Unique Voters

```sql
-- Top 5 projects by unique voters
SELECT 
    "projectId" as project_id,
    COUNT(DISTINCT "voter") as unique_voters,
    SUM("celoEquivalent") as total_votes
FROM celo.logs
WHERE 
    contract_address = '0x0cc096b1cc568a22c1f02dab769881d1afe6161a'
    AND topic0 = '0xbc1c66ac49e4d3cd87445bc4fa7fd1461e94122a328d8c4db3dc50bb668f8d82'
GROUP BY "projectId"
ORDER BY unique_voters DESC
LIMIT 5
```

## Step 6: Top 5 Projects by Payout

```sql
-- Top 5 projects by total payout
SELECT 
    "projectId" as project_id,
    SUM("amount") as total_payout
FROM celo.logs
WHERE 
    contract_address = '0x0cc096b1cc568a22c1f02dab769881d1afe6161a'
    AND topic0 = '0x...' -- FundsDistributedToProject event signature
GROUP BY "projectId"
ORDER BY total_payout DESC
LIMIT 5
```

## Step 7: Get Event Signature

To find the event signature (topic0), you can:

1. **Use Dune's event decoder**: https://dune.com/docs/reference/query-engine/decoding/
2. **Calculate it**: `keccak256("VoteCast(address,uint256,uint256,address,uint256,uint256)")`
3. **Use this tool**: https://emn178.github.io/online-tools/keccak_256.html

For VoteCast:
```
Event: VoteCast(address indexed voter, uint256 indexed campaignId, uint256 indexed projectId, address token, uint256 amount, uint256 celoEquivalent)
Signature: keccak256("VoteCast(address,uint256,uint256,address,uint256,uint256)")
```

## Step 8: Create a Dashboard

1. Click **"New Dashboard"**
2. Add your queries as widgets
3. Customize charts and visualizations
4. Share the dashboard URL

## Step 9: Use Dune API in Your App

Dune provides a REST API to query your saved queries:

1. Go to your query
2. Click **"API"** tab
3. Copy your API key
4. Use the query ID in API calls

### Example API Call:

```typescript
const DUNE_API_KEY = 'your-api-key'
const QUERY_ID = 123456 // Your query ID

const response = await fetch(
  `https://api.dune.com/api/v1/query/${QUERY_ID}/results?api_key=${DUNE_API_KEY}`
)
const data = await response.json()
```

## Step 10: Update Analytics Hook

Create a hook that uses Dune API:

```typescript
// src/hooks/useProjectAnalyticsDune.ts
export function useProjectAnalyticsDune() {
  const DUNE_API_KEY = process.env.NEXT_PUBLIC_DUNE_API_KEY
  const QUERY_ID = process.env.NEXT_PUBLIC_DUNE_QUERY_ID
  
  // Fetch from Dune API
  // Process results
  // Return analytics data
}
```

## Quick Start Commands

1. **Find Event Signature**:
   - Go to: https://emn178.github.io/online-tools/keccak_256.html
   - Input: `VoteCast(address,uint256,uint256,address,uint256,uint256)`
   - Copy the hash (first 66 chars with 0x)

2. **Test Query**:
   - Paste SQL in Dune query editor
   - Click "Run"
   - Check results

3. **Save Query**:
   - Click "Save"
   - Give it a name
   - Copy the query ID

## Tips

- **Use parameters**: Dune supports query parameters for dynamic queries
- **Optimize queries**: Use LIMIT and WHERE clauses to speed up queries
- **Cache results**: Dune caches query results for faster subsequent runs
- **Schedule queries**: Set up scheduled queries for regular updates

## Cost

- **Free tier**: 100,000 query credits/month
- **Pro tier**: $99/month for more credits
- **Enterprise**: Custom pricing

For most analytics use cases, the free tier is sufficient!

## Example: Complete Analytics Query

```sql
-- Complete analytics query for all top projects
WITH vote_stats AS (
    SELECT 
        "projectId" as project_id,
        SUM("celoEquivalent") as total_votes,
        COUNT(DISTINCT "voter") as unique_voters,
        COUNT(*) as vote_count
    FROM celo.logs
    WHERE 
        contract_address = '0x0cc096b1cc568a22c1f02dab769881d1afe6161a'
        AND topic0 = '0xbc1c66ac49e4d3cd87445bc4fa7fd1461e94122a328d8c4db3dc50bb668f8d82'
    GROUP BY "projectId"
),
payout_stats AS (
    SELECT 
        "projectId" as project_id,
        SUM("amount") as total_payout
    FROM celo.logs
    WHERE 
        contract_address = '0x0cc096b1cc568a22c1f02dab769881d1afe6161a'
        AND topic0 = '0x...' -- FundsDistributedToProject signature
    GROUP BY "projectId"
)
SELECT 
    COALESCE(v.project_id, p.project_id) as project_id,
    COALESCE(v.total_votes, 0) as total_votes,
    COALESCE(v.unique_voters, 0) as unique_voters,
    COALESCE(p.total_payout, 0) as total_payout
FROM vote_stats v
FULL OUTER JOIN payout_stats p ON v.project_id = p.project_id
ORDER BY total_votes DESC
```

## Next Steps

1. Create your Dune account
2. Run the example queries
3. Create a dashboard
4. Get API key and integrate into your app
5. Update analytics hook to use Dune API

That's it! Dune is much simpler than The Graph for quick analytics.

