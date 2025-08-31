# SovereignSeas V5 Proxy Deployment Guide

## Overview

This guide explains how to deploy the SovereignSeas V5 proxy architecture, which consists of:
- **SovereignSeasV5Proxy**: Main proxy contract that routes all calls
- **ProjectsModule**: Handles project management
- **CampaignsModule**: Handles campaign management  
- **VotingModule**: Handles voting and participation
- **TreasuryModule**: Handles financial operations
- **MigrationModule**: Handles V4 to V5 migrations

## Prerequisites

1. **Environment Setup**
   ```bash
   # Install dependencies
   npm install
   
   # Set up environment variables
   cp .env.example .env
   # Edit .env with your private key and API keys
   ```

2. **Required Environment Variables**
   ```bash
   PRIVATE_KEY=your_private_key_here
   CELOSCAN_API_KEY=your_celoscan_api_key_here
   ```

## Deployment Steps

### 1. Deploy to Testnet (Alfajores)

```bash
# Deploy the entire V5 proxy system
npx hardhat run scripts/deploy-v5-proxy.ts --network alfajores
```

### 2. Deploy to Mainnet (Celo)

```bash
# Deploy to mainnet (make sure you have sufficient CELO)
npx hardhat run scripts/deploy-v5-proxy.ts --network celo
```

## What the Deployment Script Does

1. **Deploys all modules** in the correct order
2. **Deploys the proxy contract** 
3. **Initializes the proxy** with the deployer as admin
4. **Registers all modules** with the proxy
5. **Tests basic functionality** to ensure everything works
6. **Verifies role assignments** and permissions

## Post-Deployment Steps

### 1. Verify Contracts on Block Explorer

```bash
# Verify all contracts (replace addresses with your deployed addresses)
npx hardhat verify --network alfajores CONTRACT_ADDRESS
```

### 2. Test the Deployment

```bash
# Update the verification script with your contract addresses
# Then run the verification
npx hardhat run scripts/verify-v5-deployment.ts --network alfajores
```

### 3. Configure Treasury Parameters

After deployment, you may want to configure:
- Platform fee percentages
- Slippage tolerance
- Supported tokens
- Exchange providers

## Contract Addresses

After deployment, save these addresses for future reference:

```json
{
  "projectsModule": "0x...",
  "campaignsModule": "0x...", 
  "votingModule": "0x...",
  "treasuryModule": "0x...",
  "migrationModule": "0x...",
  "sovereignSeasV5Proxy": "0x..."
}
```

## Key Features

### Enhanced Quadratic Voting
- Accounts for number of voters
- Voter diversity bonuses
- Preview distribution functionality

### Improved Security
- No bypass secret codes
- Configurable parameters instead of magic numbers
- Proper role-based access control

### Modular Architecture
- Each module has focused responsibilities
- Easier to maintain and upgrade
- Smaller attack surface per contract

## Troubleshooting

### Common Issues

1. **"Insufficient funds"**
   - Ensure your account has enough CELO for deployment
   - Testnet: Get CELO from faucet
   - Mainnet: Ensure sufficient balance

2. **"Contract verification failed"**
   - Check that all modules are deployed
   - Verify the proxy is properly initialized
   - Ensure all modules are registered

3. **"Function not found"**
   - Check that the function routing is working
   - Verify module registration
   - Check function signatures match

### Getting Help

- Check the deployment logs for specific error messages
- Verify contract addresses are correct
- Ensure all prerequisites are met

## Next Steps

After successful deployment:

1. **Test advanced features** like quadratic voting and preview distribution
2. **Configure treasury parameters** for your use case
3. **Set up frontend integration** using the proxy contract address
4. **Monitor contract performance** and gas usage
5. **Plan upgrades** using the UUPS upgrade pattern

## Security Considerations

- **Keep private keys secure** and never commit them to version control
- **Test thoroughly** on testnet before mainnet deployment
- **Monitor contract activity** after deployment
- **Have emergency procedures** ready (circuit breaker, emergency roles)
- **Regular security audits** of the modular architecture

---

**Note**: This deployment creates a production-ready V5 proxy system. Make sure to test thoroughly and have proper security measures in place before using with real funds.
