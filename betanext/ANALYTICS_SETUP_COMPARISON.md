# Analytics Setup: The Graph vs Dune Analytics

## Quick Comparison

| Feature | The Graph | Dune Analytics |
|---------|-----------|----------------|
| **Setup Time** | 30-60 minutes | 5-10 minutes |
| **Difficulty** | Medium (requires deployment) | Easy (just SQL) |
| **Cost** | Free (decentralized) | Free tier available |
| **RPC Limits** | ✅ No limits | ✅ No limits |
| **Real-time** | ✅ Yes (indexed) | ✅ Yes (live queries) |
| **Maintenance** | Low (auto-syncs) | None (managed) |
| **Best For** | Production apps | Quick analytics |

## Recommendation

**For Quick Setup**: Use **Dune Analytics** - it's faster and easier
**For Production**: Use **The Graph** - more reliable and scalable

## Option 1: Dune Analytics (Easier) ⭐ Recommended for Quick Start

### Steps:
1. Go to https://dune.com and sign up
2. Create a new query
3. Select "Celo" network
4. Paste this SQL:

```sql
-- Top 5 Projects by Total Votes
SELECT 
    "projectId" as project_id,
    SUM("celoEquivalent") as total_votes,
    COUNT(DISTINCT "voter") as unique_voters
FROM celo.logs
WHERE 
    contract_address = '0x0cc096b1cc568a22c1f02dab769881d1afe6161a'
    AND topic0 = '0xbc1c66ac49e4d3cd87445bc4fa7fd1461e94122a328d8c4db3dc50bb668f8d82'
GROUP BY "projectId"
ORDER BY total_votes DESC
LIMIT 5
```

5. Save the query
6. Get API key from Dune dashboard
7. Add to `.env`:
   ```
   NEXT_PUBLIC_DUNE_API_KEY=your-key
   NEXT_PUBLIC_DUNE_QUERY_ID=your-query-id
   ```

**Time**: ~10 minutes ⚡

See `DUNE_ANALYTICS_GUIDE.md` for complete instructions.

## Option 2: The Graph (More Robust)

### Steps:
1. Install Graph CLI: `pnpm add -g @graphprotocol/graph-cli`
2. Go to https://thegraph.com/studio/
3. Create subgraph
4. Copy deploy key
5. Run:
   ```bash
   cd subgraph
   graph codegen
   graph build
   graph auth --studio <KEY>
   graph deploy --studio sovseas-analytics
   ```
6. Wait for sync (10-30 min)
7. Copy subgraph URL
8. Add to `.env`:
   ```
   NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/...
   ```

**Time**: ~30-60 minutes

See `THE_GRAPH_COMPLETE_GUIDE.md` for complete instructions.

## Current Implementation

The analytics hook (`useProjectAnalytics`) automatically:
- ✅ Uses The Graph if `NEXT_PUBLIC_SUBGRAPH_URL` is set
- ✅ Falls back to event queries with RPC fallbacks
- ✅ Estimates unique voters if events fail

**No code changes needed** - just set the environment variable!

## Which Should You Choose?

### Choose Dune if:
- You want quick results
- You're comfortable with SQL
- You want to explore data interactively
- You don't need to deploy anything

### Choose The Graph if:
- You want a production-ready solution
- You need guaranteed uptime
- You want automatic indexing
- You're building for scale

## Both Options Work!

The analytics hook supports both. Just set the appropriate environment variable and it will automatically use that data source.

