-- ============================================
-- DUNE ANALYTICS QUERIES FOR SOVEREIGN SEAS
-- ============================================
-- 
-- Contract Address: 0x0cc096b1cc568a22c1f02dab769881d1afe6161a
-- Network: Celo Mainnet (Chain ID: 42220)
--
-- HOW TO USE ON DUNE ANALYTICS:
-- ============================================
-- 1. Go to https://dune.com
-- 2. Sign up / Log in (free account works)
-- 3. Click "New Query" button (top right)
-- 4. In the query editor:
--    - Make sure "Celo" is selected as the blockchain (top dropdown)
--    - Paste one of the queries below
-- 5. Click "Run" to execute the query
-- 6. To visualize:
--    - Click "New Visualization"
--    - Choose chart type (Table, Bar Chart, etc.)
--    - Configure your visualization
-- 7. Save your query and add it to a dashboard
-- ============================================

-- ============================================
-- QUERY 1: Top 5 Projects by Total Votes (Money Placed)
-- ============================================
-- This query aggregates all VoteCast events to calculate total votes (CELO equivalent) per project

WITH vote_events AS (
  SELECT
    decoded_log:projectId::bigint AS project_id,
    decoded_log:celoEquivalent::numeric / 1e18 AS celo_equivalent,
    decoded_log:voter::string AS voter_address,
    decoded_log:campaignId::bigint AS campaign_id,
    block_number,
    block_time
  FROM celo.logs
  WHERE 
    contract_address = '0x0cc096b1cc568a22c1f02dab769881d1afe6161a'
    AND event_signature = '0xbc1c66ac49e4d3cd87445bc4fa7fd1461e94122a328d8c4db3dc50bb668f8d82' -- VoteCast(address,uint256,uint256,address,uint256,uint256)
    AND decoded_log:projectId IS NOT NULL
),
project_votes AS (
  SELECT
    project_id,
    SUM(celo_equivalent) AS total_votes_celo,
    COUNT(DISTINCT voter_address) AS unique_voters,
    COUNT(*) AS total_vote_transactions
  FROM vote_events
  GROUP BY project_id
)
SELECT
  project_id,
  total_votes_celo,
  unique_voters,
  total_vote_transactions,
  ROW_NUMBER() OVER (ORDER BY total_votes_celo DESC) AS rank
FROM project_votes
ORDER BY total_votes_celo DESC
LIMIT 5;

-- ============================================
-- QUERY 2: Top 5 Projects by Unique Voters
-- ============================================
-- This query counts distinct voter addresses per project

WITH vote_events AS (
  SELECT
    decoded_log:projectId::bigint AS project_id,
    decoded_log:voter::string AS voter_address,
    decoded_log:celoEquivalent::numeric / 1e18 AS celo_equivalent,
    decoded_log:campaignId::bigint AS campaign_id
  FROM celo.logs
  WHERE 
    contract_address = '0x0cc096b1cc568a22c1f02dab769881d1afe6161a'
    AND event_signature = '0xbc1c66ac49e4d3cd87445bc4fa7fd1461e94122a328d8c4db3dc50bb668f8d82' -- VoteCast(address,uint256,uint256,address,uint256,uint256)
    AND decoded_log:projectId IS NOT NULL
),
unique_voters_per_project AS (
  SELECT
    project_id,
    COUNT(DISTINCT voter_address) AS unique_voter_count,
    SUM(celo_equivalent) AS total_votes_celo
  FROM vote_events
  GROUP BY project_id
)
SELECT
  project_id,
  unique_voter_count,
  total_votes_celo,
  ROW_NUMBER() OVER (ORDER BY unique_voter_count DESC) AS rank
FROM unique_voters_per_project
ORDER BY unique_voter_count DESC
LIMIT 5;

-- ============================================
-- QUERY 3: Top 5 Projects by Total Payout
-- ============================================
-- This query uses FundsDistributedToProject events to track payouts
-- Note: Amounts are in the payout token, may need conversion for non-CELO tokens

WITH payout_events AS (
  SELECT
    decoded_log:projectId::bigint AS project_id,
    decoded_log:amount::numeric / 1e18 AS payout_amount,
    decoded_log:campaignId::bigint AS campaign_id,
    decoded_log:token::string AS payout_token,
    block_number,
    block_time
  FROM celo.logs
  WHERE 
    contract_address = '0x0cc096b1cc568a22c1f02dab769881d1afe6161a'
    AND event_signature = '0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0' -- FundsDistributedToProject(uint256,uint256,uint256,address)
    AND decoded_log:projectId IS NOT NULL
),
project_payouts AS (
  SELECT
    project_id,
    SUM(payout_amount) AS total_payout,
    COUNT(DISTINCT campaign_id) AS campaigns_paid_from,
    COUNT(*) AS payout_transactions,
    -- Get the most common payout token (usually CELO)
    MODE() WITHIN GROUP (ORDER BY payout_token) AS primary_payout_token
  FROM payout_events
  GROUP BY project_id
)
SELECT
  project_id,
  total_payout,
  campaigns_paid_from,
  payout_transactions,
  primary_payout_token,
  ROW_NUMBER() OVER (ORDER BY total_payout DESC) AS rank
FROM project_payouts
ORDER BY total_payout DESC
LIMIT 5;

-- ============================================
-- QUERY 4: Comprehensive Analytics (All Metrics Combined)
-- ============================================
-- This query combines all metrics into one comprehensive view
-- Shows top projects across all three metrics

WITH vote_events AS (
  SELECT
    decoded_log:projectId::bigint AS project_id,
    decoded_log:celoEquivalent::numeric / 1e18 AS celo_equivalent,
    decoded_log:voter::string AS voter_address,
    decoded_log:campaignId::bigint AS campaign_id
  FROM celo.logs
  WHERE 
    contract_address = '0x0cc096b1cc568a22c1f02dab769881d1afe6161a'
    AND event_signature = '0xbc1c66ac49e4d3cd87445bc4fa7fd1461e94122a328d8c4db3dc50bb668f8d82' -- VoteCast
    AND decoded_log:projectId IS NOT NULL
),
payout_events AS (
  SELECT
    decoded_log:projectId::bigint AS project_id,
    decoded_log:amount::numeric / 1e18 AS payout_amount
  FROM celo.logs
  WHERE 
    contract_address = '0x0cc096b1cc568a22c1f02dab769881d1afe6161a'
    AND event_signature = '0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0' -- FundsDistributedToProject
    AND decoded_log:projectId IS NOT NULL
),
vote_stats AS (
  SELECT
    project_id,
    SUM(celo_equivalent) AS total_votes_celo,
    COUNT(DISTINCT voter_address) AS unique_voters,
    COUNT(DISTINCT campaign_id) AS campaigns_voted_in,
    COUNT(*) AS total_vote_transactions
  FROM vote_events
  GROUP BY project_id
),
payout_stats AS (
  SELECT
    project_id,
    SUM(payout_amount) AS total_payout,
    COUNT(*) AS payout_transactions
  FROM payout_events
  GROUP BY project_id
)
SELECT
  COALESCE(v.project_id, p.project_id) AS project_id,
  COALESCE(v.total_votes_celo, 0) AS total_votes_celo,
  COALESCE(v.unique_voters, 0) AS unique_voters,
  COALESCE(v.campaigns_voted_in, 0) AS campaigns_voted_in,
  COALESCE(p.total_payout, 0) AS total_payout,
  COALESCE(v.total_vote_transactions, 0) AS total_vote_transactions,
  COALESCE(p.payout_transactions, 0) AS payout_transactions,
  ROW_NUMBER() OVER (ORDER BY COALESCE(v.total_votes_celo, 0) DESC) AS rank_by_votes,
  ROW_NUMBER() OVER (ORDER BY COALESCE(v.unique_voters, 0) DESC) AS rank_by_voters,
  ROW_NUMBER() OVER (ORDER BY COALESCE(p.total_payout, 0) DESC) AS rank_by_payout
FROM vote_stats v
FULL OUTER JOIN payout_stats p ON v.project_id = p.project_id
ORDER BY total_votes_celo DESC;

-- ============================================
-- QUERY 5: Get Event Signatures (Helper Query)
-- ============================================
-- Use this to find all event signatures emitted by the contract

SELECT DISTINCT
  event_signature,
  COUNT(*) as event_count,
  MIN(block_time) as first_seen,
  MAX(block_time) as last_seen
FROM celo.logs
WHERE contract_address = '0x0cc096b1cc568a22c1f02dab769881d1afe6161a'
GROUP BY event_signature
ORDER BY event_count DESC;

-- ============================================
-- QUERY 6: Top 5 Projects by Total Votes (Simplified - No CTEs)
-- ============================================
-- Simpler version for quick testing

SELECT
  decoded_log:projectId::bigint AS project_id,
  SUM(decoded_log:celoEquivalent::numeric / 1e18) AS total_votes_celo,
  COUNT(DISTINCT decoded_log:voter::string) AS unique_voters,
  COUNT(*) AS vote_count
FROM celo.logs
WHERE 
  contract_address = '0x0cc096b1cc568a22c1f02dab769881d1afe6161a'
  AND event_signature = '0xbc1c66ac49e4d3cd87445bc4fa7fd1461e94122a328d8c4db3dc50bb668f8d82'
  AND decoded_log:projectId IS NOT NULL
GROUP BY project_id
ORDER BY total_votes_celo DESC
LIMIT 5;

-- ============================================
-- QUERY 7: Top 5 Projects by Unique Voters (Simplified)
-- ============================================

SELECT
  decoded_log:projectId::bigint AS project_id,
  COUNT(DISTINCT decoded_log:voter::string) AS unique_voters,
  SUM(decoded_log:celoEquivalent::numeric / 1e18) AS total_votes_celo
FROM celo.logs
WHERE 
  contract_address = '0x0cc096b1cc568a22c1f02dab769881d1afe6161a'
  AND event_signature = '0xbc1c66ac49e4d3cd87445bc4fa7fd1461e94122a328d8c4db3dc50bb668f8d82'
  AND decoded_log:projectId IS NOT NULL
GROUP BY project_id
ORDER BY unique_voters DESC
LIMIT 5;

-- ============================================
-- QUERY 8: Top 5 Projects by Payout (Simplified)
-- ============================================

SELECT
  decoded_log:projectId::bigint AS project_id,
  SUM(decoded_log:amount::numeric / 1e18) AS total_payout,
  COUNT(*) AS payout_count
FROM celo.logs
WHERE 
  contract_address = '0x0cc096b1cc568a22c1f02dab769881d1afe6161a'
  AND event_signature = '0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0'
  AND decoded_log:projectId IS NOT NULL
GROUP BY project_id
ORDER BY total_payout DESC
LIMIT 5;

