# Campaign Pools with SimpleGoodDollarBridge

## Overview

The `SimpleGoodDollarBridge` contract provides a complete solution for creating campaigns with integrated Good Dollar pools. This system allows you to:

- ✅ Create campaigns with automatic Good Dollar pool creation
- ✅ Add projects to campaigns
- ✅ Distribute Good Dollars based on participation or custom rules
- ✅ Integrate with the Good Dollar ecosystem on Celo

## How It Works

### 1. Campaign Creation with Pools

When you create a campaign, the system automatically:
- Creates a Good Dollar pool for the campaign
- Sets up distribution mechanisms
- Integrates with the DirectPaymentsFactory for pool management

### 2. Pool Integration

Each campaign gets:
- A dedicated Good Dollar pool
- Automatic pool creation via `IDirectPaymentsFactory`
- Configurable pool sizes (100 G$ to 100,000 G$)
- Safety limits and distribution rules

### 3. Project Management

Projects can:
- Be created with Good Dollar rewards
- Join campaigns
- Receive Good Dollars based on participation
- Track membership and voting

## Contract Functions

### Core Functions

```solidity
// Create a project
function createProject(ProjectCreationParams memory params) 
    external returns (uint256 projectId)

// Create a campaign with pool
function createCampaign(CampaignCreationParams memory params) 
    external returns (uint256 campaignId)

// Add project to campaign
function addProjectToCampaign(uint256 _projectId, uint256 _campaignId) 
    external

// Distribute Good Dollars
function distributeGoodDollars(uint256 _campaignId) 
    external onlyOwner
```

### View Functions

```solidity
// Get campaign pool info
function getCampaignPool(uint256 _campaignId) 
    external view returns (CampaignPool memory)

// Get project membership
function getProjectMembership(uint256 _campaignId, uint256 _projectId) 
    external view returns (ProjectMembership memory)

// Get Good Dollar pool address
function getCampaignGoodDollarPool(uint256 _campaignId) 
    external view returns (address)
```

## Usage Examples

### Creating a Campaign with Pools

```typescript
const campaignParams = {
  name: "Climate Innovation Challenge 2024",
  description: "A global challenge to fund climate solutions",
  startTime: Math.floor(Date.now() / 1000),
  endTime: Math.floor(Date.now() / 1000) + 86400 * 90, // 90 days
  maxWinners: 10,
  goodDollarPoolAmount: ethers.parseEther("10000"), // 10,000 G$
  poolProjectId: "climate-challenge-2024",
  poolIpfs: "QmClimateChallenge2024Hash123456789"
};

const campaignId = await bridge.createCampaign(campaignParams);
```

### Adding Projects to Campaign

```typescript
// First create a project
const projectParams = {
  name: "AI for Good - Climate Solutions",
  description: "Developing AI-powered climate tools"
};

const projectId = await bridge.createProject(projectParams);

// Then add to campaign
await bridge.addProjectToCampaign(projectId, campaignId);
```

### Distributing Good Dollars

```typescript
// Wait for campaign to end, then distribute
await bridge.distributeGoodDollars(campaignId);
```

## Pool Configuration

### Pool Settings

- **Minimum Pool Size**: 100 G$
- **Maximum Pool Size**: 100,000 G$
- **Default Pool Size**: 1,000 G$
- **Manager Fee**: 5% (configurable)

### Safety Limits

- **Max Total Per Month**: Pool amount
- **Max Member Per Month**: 10% of pool
- **Max Member Per Day**: ~0.33% of pool

## Distribution Mechanisms

### 1. Equal Distribution
By default, Good Dollars are distributed equally among participating projects.

### 2. Custom Distribution
Set custom percentages for specific projects:

```solidity
function setCustomDistribution(
    uint256 _campaignId,
    uint256[] memory _projectIds,
    uint256[] memory _percentages
) external onlyOwner
```

### 3. Vote-Based Distribution
Future implementation for quadratic voting and weighted distributions.

## Running the Scripts

### Prerequisites

1. Deploy the SimpleGoodDollarBridge contract
2. Fund the bridge with Good Dollars
3. Set up environment variables

### Create Campaign with Pools

```bash
cd packages/hardhat
npx hardhat run scripts/create-campaign-with-pools.ts --network celo
```

### Test the System

```bash
npx hardhat run scripts/test-simple-bridge.ts --network celo
```

## Contract Addresses

### Celo Mainnet

- **Good Dollar Token**: `0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A`
- **DirectPaymentsFactory**: `0xb1C7F09156d04BFf6F412447A73a0F72929b6ea4`
- **SimpleGoodDollarBridge**: `0x8970026D77290AA73FF2c95f80D6a4beEd94284F`

## Key Benefits

1. **Automatic Pool Creation**: No need to manually create pools
2. **Good Dollar Integration**: Seamless integration with Good Dollar ecosystem
3. **Flexible Distribution**: Multiple distribution mechanisms
4. **Scalable Architecture**: Support for multiple campaigns and projects
5. **Security**: Built-in safety limits and access controls

## Next Steps

1. **Fund the Bridge**: Transfer Good Dollars to the bridge contract
2. **Create Campaigns**: Use the script to create your first campaign
3. **Add Projects**: Invite projects to join your campaigns
4. **Monitor Progress**: Track participation and pool performance
5. **Distribute Rewards**: Automatically distribute Good Dollars when campaigns end

## Support

For questions or issues:
- Check the contract code in `contracts/SimpleGoodDollarBridge.sol`
- Review the test scripts for examples
- Check deployment configurations in `deployments/`

---

**Note**: This system is designed to work with the Good Dollar ecosystem on Celo. Make sure you have sufficient Good Dollars in the bridge contract before creating campaigns with pools.
