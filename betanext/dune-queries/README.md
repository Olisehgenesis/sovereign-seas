# Dune Analytics Queries for Sovereign Seas

## Contract Information
- **Contract Address**: `0x0cc096b1cc568a22c1f02dab769881d1afe6161a`
- **Network**: Celo Mainnet (Chain ID: 42220)

## How to Use Dune Analytics

### Step-by-Step Guide

1. **Sign Up / Log In**
   - Go to [https://dune.com](https://dune.com)
   - Sign up for a free account (or log in if you have one)

2. **Create a New Query**
   - Click the **"New Query"** button (top right corner)
   - Or go to: https://dune.com/queries

3. **Select Blockchain**
   - In the query editor, look for the blockchain selector (usually at the top)
   - Select **"Celo"** from the dropdown
   - If Celo is not available, you may need to enable it in settings or use a different approach

4. **Paste Your Query**
   - Open `analytics-queries.sql`
   - Copy one of the queries (start with Query 6, 7, or 8 for simplicity)
   - Paste it into the Dune query editor

5. **Run the Query**
   - Click the **"Run"** button (or press Ctrl/Cmd + Enter)
   - Wait for results (may take 10-30 seconds)

6. **View Results**
   - Results will appear in a table below the query editor
   - You can sort, filter, and export the data

7. **Create Visualizations**
   - Click **"New Visualization"** button
   - Choose visualization type:
     - **Table**: Best for detailed data
     - **Bar Chart**: Great for comparing top projects
     - **Line Chart**: For trends over time
   - Configure your chart and save

8. **Save and Share**
   - Click **"Save"** to save your query
   - Give it a descriptive name (e.g., "Top 5 Projects by Votes")
   - You can make it public or keep it private
   - Share the link with others

## Available Queries

### Quick Start Queries (Simplified)
- **Query 6**: Top 5 Projects by Total Votes (simplest)
- **Query 7**: Top 5 Projects by Unique Voters (simplest)
- **Query 8**: Top 5 Projects by Payout (simplest)

### Detailed Queries (With CTEs)
- **Query 1**: Top 5 Projects by Total Votes (detailed)
- **Query 2**: Top 5 Projects by Unique Voters (detailed)
- **Query 3**: Top 5 Projects by Total Payout (detailed)
- **Query 4**: Comprehensive Analytics (all metrics combined)

### Helper Queries
- **Query 5**: Get all event signatures (to verify events are being indexed)

## Event Signatures Used

- **VoteCast**: `0xbc1c66ac49e4d3cd87445bc4fa7fd1461e94122a328d8c4db3dc50bb668f8d82`
  - Event: `VoteCast(address indexed voter, uint256 indexed campaignId, uint256 indexed projectId, address token, uint256 amount, uint256 celoEquivalent)`

- **FundsDistributedToProject**: `0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0`
  - Event: `FundsDistributedToProject(uint256 indexed campaignId, uint256 indexed projectId, uint256 amount, address token)`
  - **Note**: If this signature doesn't work, use Query 5 to find the correct one

## Troubleshooting

### Query Returns No Results
1. Check that Celo is selected as the blockchain
2. Verify the contract address is correct: `0x0cc096b1cc568a22c1f02dab769881d1afe6161a`
3. Try Query 5 first to see if events are being indexed
4. Check if the event signature is correct (use Query 5)

### Event Signature Not Found
1. Run Query 5 to see all available event signatures
2. Look for events with names like "VoteCast" or "FundsDistributed"
3. Update the event_signature in your query

### Query is Slow
- Dune queries can take time, especially for large datasets
- Try adding date filters: `AND block_time >= '2024-01-01'`
- Use the simplified queries (6, 7, 8) which are faster

### Celo Not Available
- If Celo blockchain is not available in Dune:
  1. Check Dune's documentation for supported chains
  2. Contact Dune support to request Celo support
  3. Consider using The Graph subgraph instead

## Tips

1. **Start Simple**: Begin with Query 6, 7, or 8 to verify everything works
2. **Test Event Signatures**: Use Query 5 to verify events are being indexed
3. **Add Filters**: Add date ranges or other filters to speed up queries
4. **Create Dashboards**: Combine multiple queries into a dashboard for better visualization
5. **Export Data**: You can export results as CSV for further analysis

## Example: Creating a Dashboard

1. Create 3 separate queries:
   - Query 6 (Top by Votes)
   - Query 7 (Top by Voters)
   - Query 8 (Top by Payout)

2. Create visualizations for each:
   - Bar charts work great for top 5 lists

3. Create a new Dashboard:
   - Click "New Dashboard"
   - Add your visualizations
   - Arrange them in a grid
   - Share the dashboard link

## Next Steps

Once you have the queries working:
1. Create visualizations for each metric
2. Build a dashboard combining all three
3. Set up automatic refreshes (if available)
4. Share the dashboard with your team

