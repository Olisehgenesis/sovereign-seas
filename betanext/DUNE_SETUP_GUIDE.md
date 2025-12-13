# Dune Analytics Setup Guide for Sovereign Seas

This guide explains how to set up Dune Analytics queries to track project analytics for Sovereign Seas.

## 📋 Prerequisites

1. **Dune Analytics Account**
   - Go to [https://dune.com](https://dune.com)
   - Sign up for a free account
   - Verify your email

2. **Contract Information**
   - Your contract address (from `NEXT_PUBLIC_CONTRACT_V4`)
   - Network: Celo Mainnet (Chain ID: 42220)

## 🚀 Step-by-Step Setup

### Step 1: Create a New Query

1. Log in to Dune Analytics
2. Click **"New Query"** button (top right)
3. Select **"Celo"** as the blockchain
4. You'll see a SQL editor

### Step 2: Get Your Contract Address

Find your contract address from your environment variables:
- Mainnet: `NEXT_PUBLIC_CONTRACT_V4`
- Testnet: `NEXT_PUBLIC_CONTRACT_V4_TESTNET`

### Step 3: Get Event Signatures

First, run this query to find all event signatures from your contract:

```sql
SELECT DISTINCT
  event_signature,
  event_name,
  COUNT(*) as event_count
FROM celo.logs
WHERE contract_address = 'YOUR_CONTRACT_ADDRESS_HERE'
GROUP BY event_signature, event_name
ORDER BY event_count DESC;
```

**Important**: Replace `YOUR_CONTRACT_ADDRESS_HERE` with your actual contract address.

This will show you:
- `VoteCast` event signature
- `FundsDistributedToProject` event signature
- Other events from your contract

### Step 4: Run the Analytics Queries

Copy and paste the queries from `dune-queries/analytics-queries.sql` into Dune, replacing:
- `CONTRACT_ADDRESS` with your actual contract address
- Event signatures with the ones you found in Step 3

## 📊 Available Queries

### Query 1: Top 5 Projects by Total Votes
Shows projects with the most money (CELO equivalent) placed on them.

**What it shows:**
- Project ID
- Total votes in CELO
- Unique voters count
- Total vote transactions
- Rank

### Query 2: Top 5 Projects by Unique Voters
Shows projects with the most unique addresses voting for them.

**What it shows:**
- Project ID
- Unique voter count
- Total votes in CELO
- Rank

### Query 3: Top 5 Projects by Total Payout
Shows projects that received the most funding.

**What it shows:**
- Project ID
- Total payout in CELO
- Number of campaigns paid from
- Number of payout transactions
- Rank

### Query 4: Comprehensive Analytics (All Metrics)
Combines all metrics into one view.

**What it shows:**
- All metrics from queries 1-3
- Rankings for each metric
- Complete project analytics

## 🔧 Customizing Queries

### Change the Limit
To show top 10 instead of top 5, change:
```sql
LIMIT 5;
```
to:
```sql
LIMIT 10;
```

### Filter by Date Range
Add a date filter:
```sql
WHERE 
  contract_address = 'CONTRACT_ADDRESS'
  AND event_signature = '0x...'
  AND block_time >= '2024-01-01'  -- Start date
  AND block_time <= '2024-12-31'  -- End date
```

### Filter by Campaign
Add campaign filter:
```sql
AND decoded_log:campaignId::bigint = 1  -- Specific campaign ID
```

## 📈 Creating Dashboards

1. **Save Your Queries**
   - Click "Save" after creating each query
   - Give them descriptive names:
     - "Top 5 Projects by Votes"
     - "Top 5 Projects by Unique Voters"
     - "Top 5 Projects by Payout"

2. **Create a Dashboard**
   - Click "New Dashboard"
   - Add your saved queries as widgets
   - Arrange them in a grid
   - Add titles and descriptions

3. **Make it Public** (Optional)
   - Click "Share" on your dashboard
   - Copy the public URL
   - Embed it in your app or share it

## 🔗 Integrating with Your App

### Option 1: Use Dune API

1. **Get API Key**
   - Go to your Dune profile settings
   - Generate an API key

2. **Query Dune from Your App**
   ```typescript
   const response = await fetch('https://api.dune.com/api/v1/query/{query_id}/results', {
     headers: {
       'X-Dune-API-Key': 'YOUR_API_KEY'
     }
   })
   const data = await response.json()
   ```

### Option 2: Embed Dashboard

1. **Get Embed Code**
   - Open your dashboard
   - Click "Share" → "Embed"
   - Copy the iframe code

2. **Add to Your App**
   ```tsx
   <iframe 
     src="YOUR_DUNE_DASHBOARD_URL" 
     width="100%" 
     height="600"
   />
   ```

## 🎯 Quick Start Checklist

- [ ] Create Dune account
- [ ] Get contract address from environment
- [ ] Run event signature query
- [ ] Copy VoteCast event signature
- [ ] Copy FundsDistributedToProject event signature
- [ ] Run Query 1 (Top by Votes)
- [ ] Run Query 2 (Top by Voters)
- [ ] Run Query 3 (Top by Payout)
- [ ] Save all queries
- [ ] Create dashboard
- [ ] (Optional) Set up API integration

## 💡 Tips

1. **Performance**: Dune queries can be slow for large datasets. Use date filters to speed them up.

2. **Caching**: Dune caches query results. Results update every few minutes automatically.

3. **Visualizations**: Click "Visualize" on any query to create charts and graphs.

4. **Alerts**: Set up alerts to notify you when certain thresholds are reached.

5. **Export**: Export query results as CSV for further analysis.

## 🐛 Troubleshooting

### "No results found"
- Check that your contract address is correct
- Verify you're querying Celo mainnet (not testnet)
- Check if events have been emitted (contract might be new)

### "Event signature not found"
- Run the event signature query first
- Make sure you're using the correct signature format (with 0x prefix)

### "Query timeout"
- Add date filters to reduce data scope
- Use LIMIT to reduce result set
- Check Dune status page for service issues

## 📚 Additional Resources

- [Dune Documentation](https://docs.dune.com)
- [Dune SQL Reference](https://docs.dune.com/queries/dune-sql-reference)
- [Celo on Dune](https://dune.com/docs/data-tables/chain-data/celo)

## 🔄 Updating Your App

Once you have Dune queries working, you can:

1. **Replace event queries** with Dune API calls (faster, no RPC limits)
2. **Use Dune dashboards** for admin views
3. **Set up automated reports** via Dune alerts
4. **Create custom analytics** beyond what's in the contract

---

**Need Help?**
- Check Dune's Discord: [https://discord.gg/dune](https://discord.gg/dune)
- Review Dune's query examples: [https://dune.com/browse/dashboards](https://dune.com/browse/dashboards)

