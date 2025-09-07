# Testnet Configuration Setup

## Environment Variables for Testnet

To use testnet, set these environment variables:

```bash
# Environment Configuration
VITE_ENV=testnet

# Contract Addresses - Mainnet (required)
VITE_CONTRACT_V4=0xYourMainnetContractAddress
VITE_TIP_CONTRACT_V4=0xYourMainnetTipContractAddress
VITE_GOODDOLLAR_VOTER_CONTRACT=0xYourMainnetGoodDollarVoterAddress
VITE_SIMPLE_BRIDGE_V1=0xYourMainnetBridgeAddress

# Contract Addresses - Testnet (optional, falls back to mainnet if not set)
VITE_CONTRACT_V4_TESTNET=0xYourTestnetContractAddress
VITE_TIP_CONTRACT_V4_TESTNET=0xYourTestnetTipContractAddress
VITE_GOODDOLLAR_VOTER_CONTRACT_TESTNET=0xYourTestnetGoodDollarVoterAddress
VITE_SIMPLE_BRIDGE_V1_TESTNET=0xYourTestnetBridgeAddress

# Token Addresses - Mainnet (required)
VITE_CELO_TOKEN=0x471ece3750da237f93b8e339c536989b8978a438
VITE_CUSD_TOKEN=0x765DE816845861e75A25fCA122bb6898B8B1282a
VITE_GOOD_DOLLAR_TOKEN=0xYourMainnetGoodDollarTokenAddress

# Token Addresses - Testnet (optional, falls back to mainnet if not set)
VITE_CELO_TOKEN_TESTNET=0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9
VITE_CUSD_TOKEN_TESTNET=0xYourTestnetCusdTokenAddress
VITE_GOOD_DOLLAR_TOKEN_TESTNET=0xYourTestnetGoodDollarTokenAddress

# Privy Configuration
VITE_PRIVY_APP_ID=your-privy-app-id
VITE_WALLET_CONNECT_ID=your-wallet-connect-id

# Chain Configuration
VITE_CHAIN_ID=42220
```

## Key Testnet Addresses

### CELO Token Addresses
- **Mainnet**: `0x471ece3750da237f93b8e339c536989b8978a438`
- **Testnet (Alfajores)**: `0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9`

### Chain IDs
- **Mainnet (Celo)**: `42220`
- **Testnet (Alfajores)**: `44787`

## How It Works

When `VITE_ENV=testnet`:
1. **Provider**: Automatically uses Alfajores testnet
2. **Contract Addresses**: Uses `*_TESTNET` environment variables if available
3. **Token Addresses**: Uses `*_TESTNET` environment variables if available
4. **Chain Switching**: Automatically switches to Alfajores before transactions
5. **Divvi Referrals**: Uses Alfajores chain ID (44787)

## Testing

1. Set `VITE_ENV=testnet`
2. Set the testnet contract and token addresses
3. Create a campaign - it should use testnet contracts and tokens
4. Check console logs to verify correct addresses are being used

## Fallback Behavior

If testnet-specific addresses are not provided, the system will fall back to mainnet addresses. This ensures the application still works even if testnet addresses are not configured.
