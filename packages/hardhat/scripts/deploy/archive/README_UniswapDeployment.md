# Uniswap & Ubeswap Deployment Scripts

This directory contains deployment and verification scripts for Uniswap and Ubeswap-related contracts in the Sovereign Seas project.

## Overview

This project supports both Uniswap and Ubeswap for token-to-CELO conversions:

- **Uniswap**: Ethereum-native DEX, also available on Celo
- **Ubeswap**: Celo-native DEX, optimized for the Celo ecosystem

For Ubeswap-specific deployment, see [README_UbeswapDeployment.md](./README_UbeswapDeployment.md).

## Available Scripts

### Uniswap V3 Voting Proxy
- **Deploy**: `npm run deploy:uniswap-v3-proxy` (Alfajores) / `npm run deploy:uniswap-v3-proxy:celo` (Mainnet)
- **Verify**: `npm run verify:uniswap-v3-proxy` (Alfajores) / `npm run verify:uniswap-v3-proxy:celo` (Mainnet)
- **Test**: `npm run test:uniswap-v3-proxy` (Alfajores) / `npm run test:uniswap-v3-proxy:celo` (Mainnet)

### Uniswap V2 Voting Proxy (Placeholder)
- **Deploy**: `npm run deploy:uniswap-v2-proxy` (Alfajores) / `npm run deploy:uniswap-v2-proxy:celo` (Mainnet)
- **Verify**: `npm run verify:uniswap-v2-proxy` (Alfajores) / `npm run verify:uniswap-v2-proxy:celo` (Mainnet)

### Uniswap Factory (Placeholder)
- **Deploy**: `npm run deploy:uniswap-factory` (Alfajores) / `npm run deploy:uniswap-factory:celo` (Mainnet)
- **Verify**: `npm run verify:uniswap-factory` (Alfajores) / `npm run verify:uniswap-factory:celo` (Mainnet)

### Ubeswap V2 Voting Proxy
- **Deploy**: `npm run deploy:ubeswap-proxy` (Alfajores) / `npm run deploy:ubeswap-proxy:celo` (Mainnet)
- **Verify**: `npm run verify:ubeswap-proxy` (Alfajores) / `npm run verify:ubeswap-proxy:celo` (Mainnet)
- **Test**: `npm run test:ubeswap-proxy` (Alfajores) / `npm run test:ubeswap-proxy:celo` (Mainnet)

### Batch Operations
- **Deploy All Uniswap**: `npm run deploy:all-uniswap` (Alfajores) / `npm run deploy:all-uniswap:celo` (Mainnet)
- **Verify All Uniswap**: `npm run verify:all-uniswap` (Alfajores) / `npm run verify:all-uniswap:celo` (Mainnet)

## Environment Variables Required

### For Uniswap V3 Voting Proxy
```bash
PRIVATE_KEY=your_private_key_here
CELO_RPC_URL=https://alfajores-forno.celo-testnet.org
UNISWAP_V3_ROUTER_ADDRESS=0x...
UNISWAP_V3_QUOTER_ADDRESS=0x...
SOVEREIGN_SEAS_V4_ADDRESS=0x...
CELO_TOKEN_ADDRESS=0x...
CELO_UNISWAP_V3_VOTING_PROXY_ADDRESS=0x... # For verification
```

### For Uniswap V2 Voting Proxy
```bash
PRIVATE_KEY=your_private_key_here
CELO_RPC_URL=https://alfajores-forno.celo-testnet.org
UNISWAP_V2_ROUTER_ADDRESS=0x...
SOVEREIGN_SEAS_V4_ADDRESS=0x...
CELO_TOKEN_ADDRESS=0x...
UNISWAP_V2_VOTING_PROXY_ADDRESS=0x... # For verification
```

### For Uniswap Factory
```bash
PRIVATE_KEY=your_private_key_here
CELO_RPC_URL=https://alfajores-forno.celo-testnet.org
WETH_ADDRESS=0x471EcE3750Da237f93B8E339c536989b8978a438
UNISWAP_FACTORY_ADDRESS=0x... # For verification
```

### For Ubeswap V2 Voting Proxy
```bash
PRIVATE_KEY=your_private_key_here
CELO_RPC_URL=https://alfajores-forno.celo-testnet.org
UBESWAP_V2_ROUTER_ADDRESS=0xE3D8bd6Aed4F5bc0a19D39c3e1eAbE9f8D018520
SOVEREIGN_SEAS_V4_ADDRESS=0x...
CELO_TOKEN_ADDRESS=0x...
UBESWAP_VOTING_PROXY_ADDRESS=0x... # For verification
```

## Celo Network Addresses

### Mainnet (Celo)
- **CELO Token**: `0x471EcE3750Da237f93B8E339c536989b8978a438`
- **Uniswap V3 Router**: `0x5615CDAb10dc425a742d643d949a7F474C01abc4`
- **Uniswap V3 Quoter**: `0x82825d0554fA07e7fcA3b1C4B66B4c9C3c1d3C3d`
- **Ubeswap V2 Router**: `0xE3D8bd6Aed4F5bc0a19D39c3e1eAbE9f8D018520`

### Testnet (Alfajores)
- **CELO Token**: `0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9`
- **Uniswap V3 Router**: `0x5615CDAb10dc425a742d643d949a7F474C01abc4`
- **Uniswap V3 Quoter**: `0x82825d0554fA07e7fcA3b1C4B66B4c9C3c1d3C3d`
- **Ubeswap V2 Router**: `0xE3D8bd6Aed4F5bc0a19D39c3e1eAbE9f8D018520`

## Usage Examples

### Deploy Uniswap V3 Voting Proxy to Alfajores
```bash
npm run deploy:uniswap-v3-proxy
```

### Deploy Uniswap V3 Voting Proxy to Celo Mainnet
```bash
npm run deploy:uniswap-v3-proxy:celo
```

### Verify Uniswap V3 Voting Proxy on CeloScan
```bash
npm run verify:uniswap-v3-proxy:celo
```

### Test Uniswap V3 Voting Proxy
```bash
npm run test:uniswap-v3-proxy
```

### Deploy Ubeswap V2 Voting Proxy to Alfajores
```bash
npm run deploy:ubeswap-proxy
```

### Deploy Ubeswap V2 Voting Proxy to Celo Mainnet
```bash
npm run deploy:ubeswap-proxy:celo
```

### Verify Ubeswap V2 Voting Proxy on CeloScan
```bash
npm run verify:ubeswap-proxy:celo
```

### Test Ubeswap V2 Voting Proxy
```bash
npm run test:ubeswap-proxy
```

## Contract Dependencies

### Uniswap V3 Voting Proxy
- **Uniswap V3 Router**: For executing swaps
- **Uniswap V3 Quoter**: For getting price quotes
- **SovereignSeas V4**: For voting functionality
- **CELO Token**: Native token for voting

### Uniswap V2 Voting Proxy (Future)
- **Uniswap V2 Router**: For executing swaps
- **SovereignSeas V4**: For voting functionality
- **CELO Token**: Native token for voting

## Notes

1. **V2 and Factory Scripts**: These are currently placeholders. The actual contracts need to be implemented before these scripts can be used.

2. **Environment Variables**: Make sure all required environment variables are set before running any script.

3. **Network Selection**: Scripts automatically detect the network based on RPC URL or command line arguments.

4. **Verification**: Verification scripts use Hardhat's verify plugin and require the contract to be deployed first.

5. **Testing**: Test scripts are available for the V3 voting proxy to verify functionality.

## Troubleshooting

### Common Issues

1. **Insufficient Balance**: Ensure your account has enough CELO for deployment gas fees.

2. **Invalid Addresses**: Double-check all contract addresses in your environment variables.

3. **Network Issues**: Verify your RPC URL is correct and accessible.

4. **Compilation Errors**: Run `npm run compile` before deploying to ensure contracts are compiled.

### Error Messages

- `PRIVATE_KEY environment variable is required`: Set your private key in .env file
- `Invalid router address`: Check UNISWAP_V3_ROUTER_ADDRESS in .env
- `Contract deployment failed`: Check gas fees and account balance
- `Verification failed`: Ensure contract is deployed and constructor arguments are correct

## Security Considerations

1. **Private Keys**: Never commit private keys to version control
2. **Environment Files**: Use .env files for sensitive data
3. **Test First**: Always test on Alfajores before mainnet deployment
4. **Verify Contracts**: Always verify contracts after deployment for transparency 