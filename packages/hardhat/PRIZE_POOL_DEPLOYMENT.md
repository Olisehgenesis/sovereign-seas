# SeasPrizePool Deployment Guide

This guide explains how to deploy and use the SeasPrizePool contract for managing prize distributions in the SovereignSeas ecosystem.

## Overview

The SeasPrizePool contract provides:
- **Universal Pools**: Accept any token (including ETH)
- **ERC20-Specific Pools**: Only accept predefined tokens
- **Campaign Integration**: Works with existing SovereignSeas campaigns
- **Appreciation Pools**: Create pools even for completed campaigns to show appreciation
- **Distribution Methods**: Quadratic and manual distribution
- **Admin Controls**: Token management, freezing, rescue functions
- **Security Features**: Blacklisting, pausing, emergency controls

## Prerequisites

1. **SovereignSeas Contract**: You need a deployed SovereignSeas V4 or V5 contract
2. **Network Access**: Configured network (Alfajores testnet or Celo mainnet)
3. **Private Key**: Set `PRIVATE_KEY` in your environment variables
4. **Sufficient Balance**: At least 0.01 ETH for deployment gas

## Deployment Steps

### 1. Deploy SovereignSeas (if not already deployed)

```bash
# Deploy SovereignSeas V5 with all modules
npx hardhat run scripts/deploy-v5-enhanced.ts --network alfajores
```

### 2. Deploy SeasPrizePool

```bash
# Deploy prize pool contract
npx hardhat run scripts/deploy-prize-pool.ts --network alfajores
```

The script will:
- Automatically detect existing SovereignSeas deployment
- Deploy the SeasPrizePool contract
- Link it to the SovereignSeas contract
- Save deployment information
- Run basic functionality tests

### 3. Verify Deployment

```bash
# Check deployment status
npx hardhat run scripts/prize-pool-manager.ts --network alfajores
```

## Usage Examples

### Appreciation Pools (NEW!)

**Appreciation pools** are a special feature that allows you to create prize pools even for campaigns that have already ended. This is perfect for:

- 🎉 **Post-campaign appreciation**: Thank participants after a campaign ends
- 💝 **Community rewards**: Distribute funds to show appreciation for great work
- 🏆 **Retroactive recognition**: Reward outstanding contributions from past campaigns
- 🤝 **Community building**: Foster ongoing engagement even after campaigns close

**Key Benefits:**
- ✅ Works with completed campaigns
- ✅ Same security and distribution features
- ✅ Special events for tracking appreciation pools
- ✅ Flexible funding and distribution options

### Creating Pools

```typescript
// Universal pool (accepts any token) - for active campaigns
const poolId = await prizePool.createPoolUniversal(
  campaignId, 
  "Universal Prize Pool"
);

// ERC20-specific pool - for active campaigns
const allowedTokens = ["0x...", "0x..."]; // Token addresses
const poolId = await prizePool.createPoolERC20(
  campaignId, 
  allowedTokens, 
  "ERC20 Prize Pool"
);

// Appreciation pools - work even for completed campaigns!
const appreciationPoolId = await prizePool.createAppreciationPoolUniversal(
  completedCampaignId, 
  "Thank you for your amazing work!"
);

const appreciationERC20PoolId = await prizePool.createAppreciationPoolERC20(
  completedCampaignId,
  allowedTokens,
  "Appreciation for outstanding contributions"
);
```

### Funding Pools

```typescript
// Fund with ETH
await prizePool.fundPool(poolId, ethers.ZeroAddress, ethers.parseEther("1.0"));

// Fund with ERC20 token
await prizePool.fundPool(poolId, tokenAddress, ethers.parseEther("100.0"));
```

### Donations

```typescript
// Donate ETH
await prizePool.donateToPool(
  poolId, 
  ethers.ZeroAddress, 
  ethers.parseEther("0.1"),
  "Supporting the project!"
);

// Donate ERC20
await prizePool.donateToPool(
  poolId, 
  tokenAddress, 
  ethers.parseEther("10.0"),
  "Great work!"
);
```

### Distribution

```typescript
// Quadratic distribution (based on vote counts)
await prizePool.distributeQuadratic(poolId);

// Manual distribution
await prizePool.distributeManual(
  poolId,
  projectIds,
  amounts,
  tokenAddress
);
```

## Network Configuration

### Alfajores Testnet (Recommended for testing)

```bash
# Set environment variables
export PRIVATE_KEY="your_private_key_here"
export ALFAJORES_RPC_URL="https://alfajores-forno.celo-testnet.org"

# Deploy to testnet
npx hardhat run scripts/deploy-prize-pool.ts --network alfajores
```

### Celo Mainnet (Production)

```bash
# Set environment variables
export PRIVATE_KEY="your_private_key_here"
export CELO_RPC_URL="https://forno.celo.org"

# Deploy to mainnet
npx hardhat run scripts/deploy-prize-pool.ts --network celo
```

## Contract Verification

After deployment, verify the contract on CeloScan:

```bash
npx hardhat verify --network alfajores <CONTRACT_ADDRESS> <SOVEREIGN_SEAS_ADDRESS>
```

## Deployment Files

Deployment information is saved in:
- `deployments/{network}/latest.json` - Latest deployment
- `deployments/{network}/{timestamp}.json` - Timestamped deployments

## Security Considerations

1. **Private Key Security**: Never commit private keys to version control
2. **Testnet First**: Always test on Alfajores before mainnet deployment
3. **Admin Controls**: Set up proper admin roles and access controls
4. **Emergency Functions**: Understand rescue and pause mechanisms
5. **Token Validation**: Verify token addresses before adding to pools

## Troubleshooting

### Common Issues

1. **"Insufficient balance"**: Ensure you have enough ETH for gas
2. **"No existing SovereignSeas deployment"**: Deploy SovereignSeas first
3. **"Invalid campaign"**: Make sure the campaign exists and is active
4. **"Not campaign admin"**: Ensure you have admin rights for the campaign

### Debug Commands

```bash
# Check contract code
npx hardhat run scripts/check-deployment-state.ts --network alfajores

# Verify contract interaction
npx hardhat run scripts/prize-pool-manager.ts --network alfajores
```

## Integration with Frontend

The deployed contract can be integrated with your frontend using:

1. **Contract ABI**: Available in `artifacts/contracts/SeasPrizePool.sol/SeasPrizePool.json`
2. **TypeScript Types**: Generated in `typechain-types/`
3. **Contract Address**: From deployment files

Example frontend integration:

```typescript
import { ethers } from 'ethers';
import SeasPrizePoolABI from './artifacts/contracts/SeasPrizePool.sol/SeasPrizePool.json';

const provider = new ethers.JsonRpcProvider('https://alfajores-forno.celo-testnet.org');
const prizePool = new ethers.Contract(contractAddress, SeasPrizePoolABI.abi, provider);
```

## Support

For issues or questions:
1. Check the deployment logs for error messages
2. Verify network connectivity and gas prices
3. Ensure all prerequisites are met
4. Review the contract source code for detailed functionality

## Next Steps

After successful deployment:
1. Test pool creation and funding
2. Integrate with your frontend application
3. Set up monitoring and alerts
4. Plan for production deployment on Celo mainnet
