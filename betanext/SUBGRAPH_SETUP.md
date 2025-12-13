# The Graph Subgraph Setup Guide

This guide explains how to set up a subgraph to index vote events and provide analytics data.

## Why Use The Graph?

- ✅ **No RPC limits** - Pre-indexed data, no block range restrictions
- ✅ **Fast queries** - Optimized GraphQL queries
- ✅ **Scalable** - Handles large datasets efficiently
- ✅ **Reliable** - No rate limiting issues

## Step 1: Install Graph CLI

```bash
npm install -g @graphprotocol/graph-cli
# or
pnpm add -g @graphprotocol/graph-cli
```

## Step 2: Initialize Subgraph

```bash
graph init --studio sovseas-analytics
```

Or manually create the subgraph structure:

```
subgraph/
├── schema.graphql
├── subgraph.yaml
├── package.json
└── src/
    └── mapping.ts
```

## Step 3: Schema Definition

Create `subgraph/schema.graphql`:

```graphql
type Vote @entity {
  id: ID!
  voter: Bytes! # address
  campaignId: BigInt!
  projectId: BigInt!
  token: Bytes! # address
  amount: BigInt!
  celoEquivalent: BigInt!
  timestamp: BigInt!
  blockNumber: BigInt!
  transactionHash: Bytes!
}

type ProjectVoteStats @entity {
  id: ID! # projectId
  projectId: BigInt!
  totalVotes: BigInt! # Sum of celoEquivalent
  totalPayout: BigInt!
  uniqueVoters: [Bytes!]! # Array of unique voter addresses
  uniqueVoterCount: BigInt!
  voteCount: BigInt! # Number of votes
  lastUpdated: BigInt!
}

type CampaignProject @entity {
  id: ID! # campaignId-projectId
  campaignId: BigInt!
  projectId: BigInt!
  voteCount: BigInt!
  fundsReceived: BigInt!
}
```

## Step 4: Subgraph Manifest

Create `subgraph/subgraph.yaml`:

```yaml
specVersion: 0.0.5
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum
    name: SovereignSeas
    network: celo
    source:
      address: "0x0cc096b1cc568a22c1f02dab769881d1afe6161a" # Your contract address
      abi: SovereignSeas
      startBlock: 0 # Or the block where contract was deployed
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - Vote
        - ProjectVoteStats
        - CampaignProject
      abis:
        - name: SovereignSeas
          file: ./abis/SovereignSeas.json
      eventHandlers:
        - event: VoteCast(indexed address,indexed uint256,indexed uint256,address,uint256,uint256)
          handler: handleVoteCast
        - event: FundsDistributedToProject(indexed uint256,indexed uint256,uint256,address)
          handler: handleFundsDistributed
      file: ./src/mapping.ts
```

## Step 5: Mapping Code

Create `subgraph/src/mapping.ts`:

```typescript
import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import { VoteCast, FundsDistributedToProject } from "../generated/SovereignSeas/SovereignSeas"
import { Vote, ProjectVoteStats, CampaignProject } from "../generated/schema"

export function handleVoteCast(event: VoteCast): void {
  // Create vote entity
  let voteId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let vote = new Vote(voteId)
  vote.voter = event.params.voter
  vote.campaignId = event.params.campaignId
  vote.projectId = event.params.projectId
  vote.token = event.params.token
  vote.amount = event.params.amount
  vote.celoEquivalent = event.params.celoEquivalent
  vote.timestamp = event.block.timestamp
  vote.blockNumber = event.block.number
  vote.transactionHash = event.transaction.hash
  vote.save()

  // Update project vote stats
  let projectId = event.params.projectId.toString()
  let stats = ProjectVoteStats.load(projectId)
  
  if (stats == null) {
    stats = new ProjectVoteStats(projectId)
    stats.projectId = event.params.projectId
    stats.totalVotes = BigInt.fromI32(0)
    stats.totalPayout = BigInt.fromI32(0)
    stats.uniqueVoters = []
    stats.uniqueVoterCount = BigInt.fromI32(0)
    stats.voteCount = BigInt.fromI32(0)
  }

  // Update totals
  stats.totalVotes = stats.totalVotes.plus(event.params.celoEquivalent)
  stats.voteCount = stats.voteCount.plus(BigInt.fromI32(1))
  
  // Check if voter is unique
  let voterAddress = event.params.voter.toHexString()
  let isUnique = true
  for (let i = 0; i < stats.uniqueVoters.length; i++) {
    if (stats.uniqueVoters[i].toHexString() == voterAddress) {
      isUnique = false
      break
    }
  }
  
  if (isUnique) {
    stats.uniqueVoters.push(event.params.voter)
    stats.uniqueVoterCount = stats.uniqueVoterCount.plus(BigInt.fromI32(1))
  }
  
  stats.lastUpdated = event.block.timestamp
  stats.save()

  // Update campaign-project relationship
  let campaignProjectId = event.params.campaignId.toString() + "-" + event.params.projectId.toString()
  let campaignProject = CampaignProject.load(campaignProjectId)
  
  if (campaignProject == null) {
    campaignProject = new CampaignProject(campaignProjectId)
    campaignProject.campaignId = event.params.campaignId
    campaignProject.projectId = event.params.projectId
    campaignProject.voteCount = BigInt.fromI32(0)
    campaignProject.fundsReceived = BigInt.fromI32(0)
  }
  
  campaignProject.voteCount = campaignProject.voteCount.plus(event.params.celoEquivalent)
  campaignProject.save()
}

export function handleFundsDistributed(event: FundsDistributedToProject): void {
  let projectId = event.params.projectId.toString()
  let stats = ProjectVoteStats.load(projectId)
  
  if (stats != null) {
    stats.totalPayout = stats.totalPayout.plus(event.params.amount)
    stats.lastUpdated = event.block.timestamp
    stats.save()
  }

  // Update campaign-project
  let campaignProjectId = event.params.campaignId.toString() + "-" + event.params.projectId.toString()
  let campaignProject = CampaignProject.load(campaignProjectId)
  
  if (campaignProject != null) {
    campaignProject.fundsReceived = campaignProject.fundsReceived.plus(event.params.amount)
    campaignProject.save()
  }
}
```

## Step 6: Deploy Subgraph

1. **Create account on The Graph Studio**: https://thegraph.com/studio/

2. **Authenticate**:
```bash
graph auth --studio <DEPLOY_KEY>
```

3. **Build subgraph**:
```bash
cd subgraph
graph codegen
graph build
```

4. **Deploy**:
```bash
graph deploy --studio sovseas-analytics
```

5. **Get your subgraph URL** from The Graph Studio dashboard

## Step 7: Query from Frontend

Install GraphQL client:
```bash
pnpm add @apollo/client graphql
```

## Step 8: Update Analytics Hook

See the implementation in `src/hooks/useProjectAnalyticsGraph.ts` (created below)

## Alternative: Use Hosted Service

If you prefer the hosted service (deprecated but still works):

1. Go to https://thegraph.com/hosted-service/
2. Create a subgraph
3. Deploy using:
```bash
graph deploy --node <NODE_URL> --ipfs <IPFS_URL> <SUBGRAPH_NAME>
```

## Cost Considerations

- **Hosted Service**: Free but deprecated
- **Studio (Decentralized)**: Free for public subgraphs
- **Studio (Hosted)**: Pay-as-you-go pricing

For this use case, the decentralized network (free) should work fine!

