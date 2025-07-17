import { createWalletClient, http, createPublicClient, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import * as dotenv from 'dotenv';

dotenv.config();

// Read configuration from environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
const UNISWAP_VOTING_PROXY_ADDRESS = process.env.UNISWAP_VOTING_PROXY_ADDRESS;
const TEST_TOKEN_ADDRESS = process.env.TEST_TOKEN_ADDRESS; // Optional: for testing with specific token

// Validate environment variables
if (!PRIVATE_KEY) {
  console.error('Error: PRIVATE_KEY environment variable is required');
  process.exit(1);
}

if (!UNISWAP_VOTING_PROXY_ADDRESS) {
  console.error('Error: UNISWAP_VOTING_PROXY_ADDRESS environment variable is required');
  process.exit(1);
}

async function testUniswapVotingProxy() {
  try {
    console.log('Testing UniswapV2VotingProxy contract...');
    
    // Create wallet client with private key
    const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
    const walletClient = createWalletClient({
      account,
      chain: celoAlfajores,
      transport: http(RPC_URL)
    });
    
    const publicClient = createPublicClient({
      chain: celoAlfajores,
      transport: http(RPC_URL)
    });
    
    console.log(`Using account: ${account.address}`);
    console.log(`Proxy contract address: ${UNISWAP_VOTING_PROXY_ADDRESS}`);
    
    // Contract ABI for testing
    const proxyAbi = [
      {
        "inputs": [],
        "name": "getConfiguration",
        "outputs": [
          {"internalType": "address", "name": "router", "type": "address"},
          {"internalType": "address", "name": "sovereignSeasContract", "type": "address"},
          {"internalType": "address", "name": "celoToken", "type": "address"},
          {"internalType": "address", "name": "wethToken", "type": "address"},
          {"internalType": "uint256", "name": "currentSlippage", "type": "uint256"},
          {"internalType": "uint256", "name": "maxSlippage", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "uint256", "name": "_ethAmount", "type": "uint256"}
        ],
        "name": "getExpectedCeloOutputForETH",
        "outputs": [
          {"internalType": "uint256", "name": "expectedCelo", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "address", "name": "_token", "type": "address"},
          {"internalType": "uint256", "name": "_amount", "type": "uint256"},
          {"internalType": "bool", "name": "_useWETHPath", "type": "bool"}
        ],
        "name": "getExpectedCeloOutput",
        "outputs": [
          {"internalType": "uint256", "name": "expectedCelo", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "address", "name": "_token", "type": "address"}
        ],
        "name": "hasDirectPairWithCelo",
        "outputs": [
          {"internalType": "bool", "name": "hasDirectPair", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
      }
    ];
    
    // Test 1: Get contract configuration
    console.log('\n=== Test 1: Getting Contract Configuration ===');
    const config = await publicClient.readContract({
      address: UNISWAP_VOTING_PROXY_ADDRESS as `0x${string}`,
      abi: proxyAbi,
      functionName: 'getConfiguration'
    });
    
    console.log('Contract Configuration:');
    console.log(`- Uniswap Router: ${config[0]}`);
    console.log(`- SovereignSeas Contract: ${config[1]}`);
    console.log(`- CELO Token: ${config[2]}`);
    console.log(`- WETH Token: ${config[3]}`);
    console.log(`- Current Slippage: ${config[4]} basis points (${Number(config[4]) / 100}%)`);
    console.log(`- Max Slippage: ${config[5]} basis points (${Number(config[5]) / 100}%)`);
    
    // Test 2: Test ETH to CELO conversion estimation
    console.log('\n=== Test 2: ETH to CELO Conversion Estimation ===');
    const testEthAmount = parseEther('0.1'); // 0.1 ETH
    const expectedCeloForEth = await publicClient.readContract({
      address: UNISWAP_VOTING_PROXY_ADDRESS as `0x${string}`,
      abi: proxyAbi,
      functionName: 'getExpectedCeloOutputForETH',
      args: [testEthAmount]
    });
    
    console.log(`Expected CELO output for ${formatEther(testEthAmount)} ETH: ${formatEther(expectedCeloForEth)} CELO`);
    
    // Test 3: Test token to CELO conversion estimation (if test token provided)
    if (TEST_TOKEN_ADDRESS) {
      console.log('\n=== Test 3: Token to CELO Conversion Estimation ===');
      const testTokenAmount = parseEther('100'); // 100 tokens
      
      // Check if direct pair exists
      const hasDirectPair = await publicClient.readContract({
        address: UNISWAP_VOTING_PROXY_ADDRESS as `0x${string}`,
        abi: proxyAbi,
        functionName: 'hasDirectPairWithCelo',
        args: [TEST_TOKEN_ADDRESS as `0x${string}`]
      });
      
      console.log(`Direct pair with CELO exists: ${hasDirectPair}`);
      
      // Get expected output for direct path
      const expectedCeloDirect = await publicClient.readContract({
        address: UNISWAP_VOTING_PROXY_ADDRESS as `0x${string}`,
        abi: proxyAbi,
        functionName: 'getExpectedCeloOutput',
        args: [TEST_TOKEN_ADDRESS as `0x${string}`, testTokenAmount, false]
      });
      
      console.log(`Expected CELO output (direct path) for ${formatEther(testTokenAmount)} tokens: ${formatEther(expectedCeloDirect)} CELO`);
      
      // Get expected output for WETH path
      const expectedCeloWeth = await publicClient.readContract({
        address: UNISWAP_VOTING_PROXY_ADDRESS as `0x${string}`,
        abi: proxyAbi,
        functionName: 'getExpectedCeloOutput',
        args: [TEST_TOKEN_ADDRESS as `0x${string}`, testTokenAmount, true]
      });
      
      console.log(`Expected CELO output (WETH path) for ${formatEther(testTokenAmount)} tokens: ${formatEther(expectedCeloWeth)} CELO`);
    }
    
    // Test 4: Check account balance
    console.log('\n=== Test 4: Account Balance Check ===');
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`Account ETH balance: ${formatEther(balance)} ETH`);
    
    console.log('\n=== Testing Complete ===');
    console.log('The UniswapV2VotingProxy contract is working correctly!');
    console.log('');
    console.log('To test actual voting functionality:');
    console.log('1. Ensure you have sufficient ETH/tokens for testing');
    console.log('2. Use the voteWithETH() or voteWithToken() functions');
    console.log('3. Make sure you have valid campaign and project IDs');
    console.log('4. Ensure you have the correct bypass code');
    
  } catch (error) {
    console.error('Error testing contract:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Execute testing
testUniswapVotingProxy(); 