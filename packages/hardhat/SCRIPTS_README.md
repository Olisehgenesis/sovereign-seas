# Sovereign Seas Scripts Documentation

This document describes the consolidated scripts system for the Sovereign Seas project. The scripts have been reorganized to reduce redundancy and provide a cleaner, more maintainable interface.

## Overview

The scripts are now organized into four main categories:
- **Deployment** (`deploy.ts`) - For deploying contracts
- **Verification** (`verify.ts`) - For verifying deployed contracts  
- **Testing** (`test.ts`) - For testing contract functionality
- **Utilities** (`utils.ts`) - For various utility operations

## Directory Structure

```
scripts/
├── deploy.ts          # Consolidated deployment script
├── verify.ts          # Consolidated verification script
├── test.ts            # Consolidated testing script
├── utils.ts           # Consolidated utilities script
├── deploy/            # Deployment scripts
├── verifies/          # Verification scripts
├── tests/             # Testing scripts
└── utilities/         # Utility scripts
```

## Usage

All scripts follow the pattern: `npm run <command> <type> [network]`

### Deployment Commands

```bash
# Deploy specific contract types
npm run deploy:seas                    # Deploy Sovereign Seas contracts
npm run deploy:grants                  # Deploy grants contracts
npm run deploy:claims                  # Deploy claims contracts
npm run deploy:tips                    # Deploy tips contracts
npm run deploy:nft                     # Deploy NFT contracts
npm run deploy:uniswap-proxy           # Deploy Uniswap voting proxy
npm run deploy:uniswap-v3-proxy        # Deploy Uniswap V3 voting proxy
npm run deploy:uniswap-v2-proxy        # Deploy Uniswap V2 voting proxy
npm run deploy:uniswap-factory         # Deploy Uniswap factory
npm run deploy:ubeswap-proxy           # Deploy Ubeswap voting proxy
npm run deploy:good-dollar-voter       # Deploy Good Dollar voter
npm run deploy:sovereign-voting        # Deploy Sovereign voting gateway
npm run deploy:working-proxy           # Deploy working proxy
npm run deploy:all-uniswap             # Deploy all Uniswap contracts

# Deploy to specific network (default: alfajores)
npm run deploy:seas celo               # Deploy to Celo network
npm run deploy:tips sepolia            # Deploy to Sepolia network
npm run deploy:nft base                # Deploy to Base network
```

### Verification Commands

```bash
# Verify specific contract types
npm run verify:seas                    # Verify Sovereign Seas contracts
npm run verify:grants                  # Verify grants contracts
npm run verify:claims                  # Verify claims contracts
npm run verify:nft                     # Verify NFT contracts
npm run verify:tips                    # Verify tips contracts
npm run verify:uniswap-proxy           # Verify Uniswap voting proxy
npm run verify:uniswap-v3-proxy        # Verify Uniswap V3 voting proxy
npm run verify:uniswap-v2-proxy        # Verify Uniswap V2 voting proxy
npm run verify:uniswap-factory         # Verify Uniswap factory
npm run verify:ubeswap-proxy           # Verify Ubeswap voting proxy
npm run verify:good-dollar-voter       # Verify Good Dollar voter
npm run verify:sovereign-voting        # Verify Sovereign voting gateway
npm run verify:working-proxy           # Verify working proxy
npm run verify:all-uniswap             # Verify all Uniswap contracts

# Verify on specific network (default: alfajores)
npm run verify:seas celo               # Verify on Celo network
npm run verify:nft sepolia             # Verify on Sepolia network
```

### Testing Commands

```bash
# Test specific functionality
npm run test:nft                       # Test NFT functionality
npm run test:vote                      # Test voting functionality
npm run test:vote:loose                # Test voting with loose transpilation
npm run test:swap                      # Test swap functionality
npm run test:swap:loose                # Test swap with loose transpilation
npm run test:uniswap-proxy             # Test Uniswap voting proxy
npm run test:uniswap-v3-proxy          # Test Uniswap V3 voting proxy
npm run test:uniswap-v2-proxy          # Test Uniswap V2 voting proxy
npm run test:ubeswap-proxy             # Test Ubeswap voting proxy
npm run test:good-dollar-voter         # Test Good Dollar voter
npm run test:claim-vote                # Test claim vote functionality
npm run test:uniswap-voting            # Test Uniswap voting

# Test on specific network (default: alfajores)
npm run test:nft celo                  # Test NFT on Celo network
npm run test:vote sepolia              # Test voting on Sepolia network
```

### Utility Commands

```bash
# Various utility operations
npm run mint                           # Mint NFTs
npm run withdraw                       # Withdraw funds
npm run vote                           # Execute voting
npm run view-projects                 # View projects
npm run view-campaign                 # View campaign
npm run create-campaign               # Create campaign
npm run end-campaign                  # End campaign
npm run get-campaign                  # Get campaign details
npm run show-votes                    # Show votes
npm run add-tokens                    # Add supported tokens
npm run add-providers                 # Add exchange providers
npm run add-sample                    # Generate sample data
npm run add-custom-sample             # Generate custom sample data
npm run update-winners                # Update campaign winners
npm run claim-vote                    # Claim vote
npm run get-vote-conversion           # Get vote conversion
npm run check-celo-addresses          # Check Celo addresses
npm run sync:abis                     # Sync ABIs

# Run utilities on specific network (default: alfajores)
npm run mint celo                     # Mint on Celo network
npm run withdraw sepolia              # Withdraw on Sepolia network
```

## Network Support

The following networks are supported:
- `alfajores` (default) - Celo testnet
- `celo` - Celo mainnet
- `sepolia` - Ethereum testnet
- `base` - Base mainnet
- `base-sepolia` - Base testnet

## Examples

### Deploy and Verify Workflow

```bash
# 1. Deploy contracts to Celo
npm run deploy:seas celo
npm run deploy:grants celo
npm run deploy:nft celo

# 2. Verify contracts on Celo
npm run verify:seas celo
npm run verify:grants celo
npm run verify:nft celo

# 3. Test functionality
npm run test:nft celo
npm run test:vote celo
```

### Uniswap Deployment

```bash
# Deploy all Uniswap contracts to Celo
npm run deploy:all-uniswap celo

# Verify all Uniswap contracts on Celo
npm run verify:all-uniswap celo

# Test Uniswap functionality
npm run test:uniswap-proxy celo
npm run test:uniswap-v3-proxy celo
npm run test:uniswap-v2-proxy celo
```

### Utility Operations

```bash
# Generate sample data
npm run add-sample

# Create and manage campaigns
npm run create-campaign
npm run view-campaign
npm run end-campaign

# Check system status
npm run check-celo-addresses
npm run sync:abis
```

## Benefits of the New System

1. **Reduced Redundancy**: Eliminated duplicate commands for different networks
2. **Better Organization**: Commands are grouped by functionality
3. **Easier Maintenance**: Single script files instead of many individual commands
4. **Consistent Interface**: All commands follow the same pattern
5. **Network Flexibility**: Easy to specify different networks for any operation
6. **Better Documentation**: Clear categorization and help messages

## Migration from Old Commands

| Old Command | New Command |
|-------------|-------------|
| `npm run deployseas` | `npm run deploy:seas` |
| `npm run deploygrants` | `npm run deploy:grants` |
| `npm run deploynft:celo` | `npm run deploy:nft celo` |
| `npm run verify:seas` | `npm run verify:seas` |
| `npm run testnft` | `npm run test:nft` |
| `npm run mint` | `npm run mint` |
| `npm run withdraw` | `npm run withdraw` |

## Troubleshooting

If you encounter issues:

1. **Check network availability**: Ensure the specified network is configured in hardhat.config.ts
2. **Verify dependencies**: Make sure all required packages are installed
3. **Check environment variables**: Ensure .env file is properly configured
4. **Review script output**: The consolidated scripts provide detailed error messages

## Support

For issues or questions about the scripts, please refer to the project documentation or create an issue in the repository.
