# UniswapV2VotingProxy Deployment Guide

This guide explains how to deploy and verify the UniswapV2VotingProxy contract on the Celo network.

## Overview

The UniswapV2VotingProxy contract allows users to vote in SovereignSeas campaigns using any ERC20 token by automatically converting them to CELO via Uniswap V2 swaps.

## Prerequisites

1. **Environment Setup**
   - Node.js and npm/pnpm installed
   - Hardhat configured for Celo network
   - CeloScan API key for contract verification

2. **Required Environment Variables**
   Create a `.env` file in the project root with the following variables:

   ```env
   # Deployment Configuration
   PRIVATE_KEY=your_private_key_here
   CELO_RPC_URL=https://alfajores-forno.celo-testnet.org  # For testnet
   # or https://rpc.ankr.com/celo for mainnet
   
   # Contract Addresses
   UNISWAP_V2_ROUTER_ADDRESS=0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D  # Example
   SOVEREIGN_SEAS_V4_ADDRESS=your_sovereign_seas_contract_address
   CELO_TOKEN_ADDRESS=0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9  # Alfajores testnet
   # or 0x471EcE3750Da237f93B8E339c536989b8978a438 for mainnet
   
   # API Keys
   CELOSCAN_API_KEY=your_celoscan_api_key
   
   # Optional: For testing
   TEST_TOKEN_ADDRESS=your_test_token_address
   ```

## Deployment Steps

### 1. Compile the Contract

First, ensure the contract is compiled:

```bash
npx hardhat compile
```

### 2. Deploy the Contract

Run the deployment script:

```bash
# For Alfajores testnet
npx hardhat run scripts/deploy/deployUniswapVotingProxy.ts --network alfajores

# For Celo mainnet
npx hardhat run scripts/deploy/deployUniswapVotingProxy.ts --network celo
```

The script will:
- Validate all required environment variables
- Deploy the contract with the specified constructor arguments
- Display the deployed contract address
- Show constructor arguments for verification

### 3. Update Environment Variables

After successful deployment, add the contract address to your `.env` file:

```env
UNISWAP_VOTING_PROXY_ADDRESS=your_deployed_contract_address
```

### 4. Verify the Contract

Run the verification script:

```bash
# For Alfajores testnet
npx hardhat run scripts/deploy/verifyUniswapVotingProxy.ts --network alfajores

# For Celo mainnet
npx hardhat run scripts/deploy/verifyUniswapVotingProxy.ts --network celo
```

### 5. Test the Contract

Run the test script to verify functionality:

```bash
npx hardhat run scripts/testUniswapVotingProxy.ts --network alfajores
```

## Contract Configuration

### Constructor Parameters

1. **`_uniswapRouter`**: Uniswap V2 Router address
   - Alfajores: `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D`
   - Mainnet: Check Uniswap documentation for Celo mainnet

2. **`_sovereignSeas`**: SovereignSeas V4 contract address
   - Deploy or use existing SovereignSeas contract

3. **`_celo`**: CELO token address
   - Alfajores: `0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9`
   - Mainnet: `0x471EcE3750Da237f93B8E339c536989b8978a438`

### Default Settings

- **Slippage Tolerance**: 3% (300 basis points)
- **Maximum Slippage**: 10% (1000 basis points)
- **Swap Deadline**: 5 minutes

## Usage Examples

### Voting with ETH

```solidity
// Vote with 0.1 ETH
proxy.voteWithETH(
    campaignId,
    projectId,
    bypassCode
){value: 0.1 ether};
```

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
// Get expected CELO output for ETH
uint256 expectedCelo = proxy.getExpectedCeloOutputForETH(0.1 ether);

// Get expected CELO output for token
uint256 expectedCelo = proxy.getExpectedCeloOutput(
    tokenAddress,
    amount,
    useWETHPath
);
```

## Security Considerations

1. **Slippage Protection**: The contract includes configurable slippage tolerance to protect against MEV attacks
2. **Reentrancy Protection**: Uses OpenZeppelin's ReentrancyGuard
3. **Ownership Control**: Only the owner can update slippage tolerance and recover stuck tokens
4. **Emergency Recovery**: Owner can recover stuck tokens in emergency situations

## Troubleshooting

### Common Issues

1. **"Invalid router address"**
   - Ensure the Uniswap V2 Router address is correct for your network

2. **"No CELO received from conversion"**
   - Check if the token has sufficient liquidity on Uniswap
   - Verify the swap path (direct vs WETH path)

3. **"Slippage tolerance too high"**
   - The slippage tolerance cannot exceed 10%

4. **Verification fails**
   - Ensure constructor arguments match exactly
   - Check that the contract is compiled with the same settings

### Network-Specific Notes

- **Alfajores Testnet**: Use for testing and development
- **Celo Mainnet**: Use for production deployment
- **Gas Fees**: Celo uses a different gas model than Ethereum

## Support

For issues or questions:
1. Check the contract source code in `contracts/UniswapV2VotingProxy.sol`
2. Review the test script for usage examples
3. Verify all environment variables are set correctly
4. Ensure sufficient balance for deployment and testing 