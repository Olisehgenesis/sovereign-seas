# Celo Sepolia Network Configuration

This document describes the Celo Sepolia network setup for testing projects and voting features.

## Environment Variables

To enable Celo Sepolia network, set one of the following environment variables:

```bash
# Option 1: Set the environment to celo-sepolia
NEXT_PUBLIC_ENV=celo-sepolia

# Option 2: Set the network explicitly
NEXT_PUBLIC_NETWORK=celo-sepolia

# Required: Set the contract address for Celo Sepolia
NEXT_PUBLIC_CONTRACT_V4_CELO_SEPOLIA=0x73Ac3CE3358a892f69238C7009CA4da4b0dd1470
```

## Network Details

- **Chain ID**: 11142220
- **Network Name**: Celo Sepolia
- **RPC URL**: https://forno.celo-sepolia.celo-testnet.org
- **Block Explorer**: https://explorer.celo.org/sepolia
- **Contract Address**: 0x73Ac3CE3358a892f69238C7009CA4da4b0dd1470

## Features Enabled

✅ Projects functionality
✅ Voting functionality
❌ Tournament functionality (ignored as requested)

## Wallet Modal

The wallet modal now includes a network switcher that allows users to switch between:
- Celo Mainnet
- Celo Alfajores (Testnet)
- **Celo Sepolia** (New)

Users can switch networks directly from the wallet modal.

## Configuration Files Modified

1. **`src/utils/celoSepolia.ts`** - New file defining Celo Sepolia chain configuration
2. **`src/utils/contractConfig.ts`** - Updated to support Celo Sepolia contract addresses
3. **`src/providers/config.ts`** - Updated wagmi config to include Celo Sepolia
4. **`src/providers/AppProvider.tsx`** - Updated to support Celo Sepolia as default chain
5. **`src/hooks/useChainSwitch.ts`** - Updated to handle Celo Sepolia chain switching
6. **`src/components/modals/walletModal.tsx`** - Added Celo Sepolia to network switcher

## Usage

1. Set the environment variables in your `.env.local` file
2. Restart your development server
3. The app will automatically use Celo Sepolia network
4. Users can switch networks using the wallet modal

## Testing

To test projects and voting on Celo Sepolia:
1. Connect your wallet
2. Switch to Celo Sepolia network using the wallet modal
3. Navigate to projects or voting pages
4. All contract interactions will use the Celo Sepolia contract address
