# Campaign Pools Page

## Overview

This page allows users to create campaigns with integrated Good Dollar pools using the SimpleGoodDollarBridge contract.

## Features

### 1. Project Creation
- Create new projects with names and descriptions
- Projects can receive Good Dollar rewards
- Projects can join campaigns

### 2. Campaign Creation with Pools
- Create campaigns with automatic Good Dollar pool creation
- Set campaign parameters (name, description, start/end dates, max winners)
- Configure pool amounts (100 G$ to 100,000 G$)
- Set pool metadata (project ID, IPFS hash)

### 3. Project-Campaign Management
- Add projects to existing campaigns
- View campaign participation
- Monitor pool distribution

### 4. Real-time Data
- View total projects and campaigns
- Check bridge Good Dollar balance
- Monitor campaign status and participation

## How to Use

### Step 1: Create a Project
1. Fill in the project name and description
2. Click "Create Project"
3. Wait for transaction confirmation

### Step 2: Create a Campaign with Pool
1. Fill in campaign details:
   - Name and description
   - Start and end dates
   - Maximum winners
   - Pool amount in Good Dollars
   - Pool project ID and IPFS hash
2. Click "Create Campaign with Pool"
3. Wait for transaction confirmation

### Step 3: Add Projects to Campaign
1. Select a project from the dropdown
2. Select a campaign from the dropdown
3. Click "Add to Campaign"

## Contract Integration

The page integrates with the SimpleGoodDollarBridge contract deployed at:
`0x8970026D77290AA73FF2c95f80D6a4beEd94284F`

### Key Functions Used
- `createProject()` - Creates new projects
- `createCampaign()` - Creates campaigns with pools
- `addProjectToCampaign()` - Adds projects to campaigns
- `getCampaignPool()` - Retrieves campaign information
- `getProject()` - Retrieves project information

## Environment Variables

Set these in your `.env.local` file:

```bash
VITE_SIMPLE_BRIDGE_V1=0x8970026D77290AA73FF2c95f80D6a4beEd94284F
VITE_GOOD_DOLLAR_TOKEN=0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A
VITE_DIRECT_PAYMENTS_FACTORY=0xb1C7F09156d04BFf6F412447A73a0F72929b6ea4
VITE_NETWORK=celo
VITE_CHAIN_ID=42220
```

## Requirements

- Connected wallet (MetaMask, WalletConnect, etc.)
- Celo network connection
- Sufficient Good Dollars in the bridge contract

## Benefits

1. **Automatic Pool Creation**: No need to manually create pools
2. **Good Dollar Integration**: Seamless integration with Good Dollar ecosystem
3. **User-Friendly Interface**: Simple forms for project and campaign creation
4. **Real-time Updates**: Live data from the blockchain
5. **Flexible Configuration**: Customizable campaign parameters

## Next Steps

1. Fund the bridge contract with Good Dollars
2. Create your first project
3. Create a campaign with a pool
4. Add projects to campaigns
5. Monitor participation and distribution

## Support

For technical issues or questions:
- Check the contract code in `packages/hardhat/contracts/SimpleGoodDollarBridge.sol`
- Review the deployment configuration
- Check the console for error messages
