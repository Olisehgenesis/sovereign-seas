# Ubeswap Deployment Scripts

This directory contains deployment and verification scripts for Ubeswap-related contracts in the Sovereign Seas project.

## Available Scripts

### Ubeswap V2 Voting Proxy
- **Deploy**: `npm run deploy:ubeswap-proxy` (Alfajores) / `npm run deploy:ubeswap-proxy:celo` (Mainnet)
- **Verify**: `npm run verify:ubeswap-proxy` (Alfajores) / `npm run verify:ubeswap-proxy:celo` (Mainnet)
- **Test**: `npm run test:ubeswap-proxy` (Alfajores) / `npm run test:ubeswap-proxy:celo` (Mainnet)

## Environment Variables Required

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
- **Ubeswap V2 Router**: `0xE3D8bd6Aed4F5bc0a19D39c3e1eAbE9f8D018520`

### Testnet (Alfajores)
- **CELO Token**: `0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9`
- **Ubeswap V2 Router**: `0xE3D8bd6Aed4F5bc0a19D39c3e1eAbE9f8D018520`

## Usage Examples

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

### Ubeswap V2 Voting Proxy
- **Ubeswap V2 Router**: For executing swaps
- **SovereignSeas V4**: For voting functionality
- **CELO Token**: Native token for voting

## Contract Features

The UbeswapVotingProxy contract provides the following features:

1. **Token-to-CELO Conversion**: Convert any ERC20 token to CELO via Ubeswap V2
2. **Automatic Voting**: Vote with converted CELO in SovereignSeas campaigns
3. **Route Optimization**: Automatically find the best swap route (direct or via WETH)
4. **Slippage Protection**: Configurable slippage tolerance (default 3%)
5. **Dust Collection**: Collect small amounts that are below threshold
6. **WETH Routing**: Optional routing through WETH for tokens without direct CELO pairs

## Constructor Parameters

1. **`_ubeswapRouter`**: Ubeswap V2 Router address
   - Alfajores: `0xE3D8bd6Aed4F5bc0a19D39c3e1eAbE9f8D018520`
   - Mainnet: `0xE3D8bd6Aed4F5bc0a19D39c3e1eAbE9f8D018520`

2. **`_sovereignSeas`**: SovereignSeas V4 contract address
   - Deploy or use existing SovereignSeas contract

3. **`_celo`**: CELO token address
   - Alfajores: `0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9`
   - Mainnet: `0x471EcE3750Da237f93B8E339c536989b8978a438`

## Default Settings

- **Slippage Tolerance**: 3% (300 basis points)
- **Maximum Slippage**: 10% (1000 basis points)
- **Swap Deadline**: 5 minutes
- **Dust Threshold**: 0.001 CELO equivalent
- **WETH Routing**: Disabled by default (can be enabled if needed)

## Usage Examples

### Voting with ERC20 Token

```solidity
// First approve the proxy to spend your tokens
token.approve(proxyAddress, amount);

// Then vote with tokens
proxy.voteWithToken(
    campaignId,
    projectId,
    tokenAddress,
    amount,
    bypassCode,
    useWETHPath
);
```

### Getting Expected Output

```solidity
// Get expected CELO output for token (direct route)
uint256 expectedCelo = proxy.getExpectedCeloOutput(
    tokenAddress,
    amount,
    false
);

// Get expected CELO output for token (WETH route)
uint256 expectedCelo = proxy.getExpectedCeloOutput(
    tokenAddress,
    amount,
    true
);
```

### Getting Comprehensive Estimate

```solidity
// Get detailed voting estimate
VotingEstimate memory estimate = proxy.getVotingEstimate(
    tokenAddress,
    amount,
    useWETHPath
);
```

## Notes

1. **Environment Variables**: Make sure all required environment variables are set before running any script.

2. **Network Selection**: Scripts automatically detect the network based on RPC URL or command line arguments.

3. **Verification**: Verification scripts use Hardhat's verify plugin and require the contract to be deployed first.

4. **Testing**: Test scripts are available for the V2 voting proxy to verify functionality.

5. **Ubeswap vs Uniswap**: Ubeswap is the native DEX on Celo, while Uniswap is also available. This proxy uses Ubeswap V2 for token swaps.

## Troubleshooting

### Common Issues

1. **Insufficient Balance**: Ensure your account has enough CELO for deployment gas fees.

2. **Invalid Addresses**: Double-check all contract addresses in your environment variables.

3. **Network Issues**: Verify your RPC URL is correct and accessible.

4. **Compilation Errors**: Run `npm run compile` before deploying to ensure contracts are compiled.

5. **No Liquidity**: Some tokens may not have liquidity on Ubeswap. Check if the token has a trading pair with CELO.

### Error Messages

- `PRIVATE_KEY environment variable is required`: Set your private key in .env file
- `Invalid router address`: Check UBESWAP_V2_ROUTER_ADDRESS in .env
- `Contract deployment failed`: Check gas fees and account balance
- `Verification failed`: Ensure contract is deployed and constructor arguments are correct
- `No valid route found`: Token may not have liquidity on Ubeswap

## Security Considerations

1. **Private Keys**: Never commit private keys to version control
2. **Environment Files**: Use .env files for sensitive data
3. **Test First**: Always test on Alfajores before mainnet deployment
4. **Verify Contracts**: Always verify contracts after deployment for transparency
5. **Slippage Protection**: The contract includes slippage protection to prevent MEV attacks
6. **Reentrancy Protection**: Contract uses OpenZeppelin's ReentrancyGuard
7. **Ownership**: Contract is Ownable for administrative functions

## Comparison with Uniswap

| Feature | Ubeswap V2 | Uniswap V2 | Uniswap V3 |
|---------|------------|------------|------------|
| Native to Celo | ✅ Yes | ❌ No | ❌ No |
| Router Address | `0xE3D8bd6Aed4F5bc0a19D39c3e1eAbE9f8D018520` | Varies | Varies |
| Liquidity | Celo-focused | Ethereum-focused | Ethereum-focused |
| Gas Costs | Lower on Celo | Higher on Ethereum | Higher on Ethereum |
| Token Support | Celo ecosystem | Ethereum ecosystem | Ethereum ecosystem |

## Next Steps

1. **Deploy**: Use the deployment scripts to deploy the contract
2. **Verify**: Verify the contract on CeloScan for transparency
3. **Test**: Run the test script to ensure functionality
4. **Integrate**: Use the contract in your dApp for token-to-CELO voting
5. **Monitor**: Monitor the contract for any issues or optimizations needed 