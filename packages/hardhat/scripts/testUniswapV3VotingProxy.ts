import { createWalletClient, http, createPublicClient, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores, celo } from 'viem/chains';
import * as dotenv from 'dotenv';

dotenv.config();

// Read configuration from environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
const UNISWAP_V3_VOTING_PROXY_ADDRESS = process.env.UNISWAP_V3_VOTING_PROXY_ADDRESS;
const TEST_TOKEN_ADDRESS = process.env.TEST_TOKEN_ADDRESS; // Optional: for testing with specific token

// Determine the network from command line arguments or environment
const args = process.argv.slice(2);
const isMainnet = args.includes('--network') && args[args.indexOf('--network') + 1] === 'celo' || 
                  RPC_URL.includes('rpc.ankr.com/celo') || 
                  process.env.NETWORK === 'celo';
const chain = isMainnet ? celo : celoAlfajores;

// Validate environment variables
if (!PRIVATE_KEY) {
  console.error('Error: PRIVATE_KEY environment variable is required');
  process.exit(1);
}

if (!UNISWAP_V3_VOTING_PROXY_ADDRESS) {
  console.error('Error: UNISWAP_V3_VOTING_PROXY_ADDRESS environment variable is required');
  process.exit(1);
}

async function testUniswapV3VotingProxy() {
  try {
    console.log('Testing UniswapV3VotingProxy contract...');
    
    // Create wallet client with private key
    const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
    const walletClient = createWalletClient({
      account,
      chain: chain,
      transport: http(RPC_URL)
    });
    
    const publicClient = createPublicClient({
      chain: chain,
      transport: http(RPC_URL)
    });
    
    console.log(`Using account: ${account.address}`);
    console.log(`Network: ${isMainnet ? 'Celo Mainnet' : 'Alfajores Testnet'}`);
    console.log(`Proxy contract address: ${UNISWAP_V3_VOTING_PROXY_ADDRESS}`);
    
    // Contract ABI for testing
    const proxyAbi = [
      {
        "inputs": [],
        "name": "getConfiguration",
        "outputs": [
          {"internalType": "address", "name": "router", "type": "address"},
          {"internalType": "address", "name": "quoterContract", "type": "address"},
          {"internalType": "address", "name": "sovereignSeasContract", "type": "address"},
          {"internalType": "address", "name": "celoToken", "type": "address"},
          {"internalType": "address", "name": "weth9Token", "type": "address"},
          {"internalType": "uint256", "name": "currentSlippage", "type": "uint256"},
          {"internalType": "uint256", "name": "maxSlippage", "type": "uint256"},
          {"internalType": "uint24[]", "name": "fees", "type": "uint24[]"}
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "uint256", "name": "_ethAmount", "type": "uint256"},
          {"internalType": "uint24", "name": "_preferredFee", "type": "uint24"}
        ],
        "name": "getExpectedCeloOutputForETH",
        "outputs": [
          {"internalType": "uint256", "name": "expectedCelo", "type": "uint256"},
          {"internalType": "uint24", "name": "feeUsed", "type": "uint24"}
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "address", "name": "_token", "type": "address"},
          {"internalType": "uint256", "name": "_amount", "type": "uint256"},
          {"internalType": "uint24", "name": "_preferredFee", "type": "uint24"},
          {"internalType": "bool", "name": "_useMultihop", "type": "bool"}
        ],
        "name": "getExpectedCeloOutput",
        "outputs": [
          {"internalType": "uint256", "name": "expectedCelo", "type": "uint256"},
          {"internalType": "uint24", "name": "feeUsed", "type": "uint24"}
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "address", "name": "_tokenA", "type": "address"},
          {"internalType": "address", "name": "_tokenB", "type": "address"},
          {"internalType": "uint24", "name": "_fee", "type": "uint24"}
        ],
        "name": "poolExists",
        "outputs": [
          {"internalType": "bool", "name": "exists", "type": "bool"}
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ];
    
    // Test 1: Get contract configuration
    console.log('\n=== Test 1: Getting Contract Configuration ===');
    const config = await publicClient.readContract({
      address: UNISWAP_V3_VOTING_PROXY_ADDRESS as `0x${string}`,
      abi: proxyAbi,
      functionName: 'getConfiguration'
    });
    
    console.log('Contract Configuration:');
    console.log(`- Uniswap V3 Router: ${config[0]}`);
    console.log(`- Uniswap V3 Quoter: ${config[1]}`);
    console.log(`- SovereignSeas Contract: ${config[2]}`);
    console.log(`- CELO Token: ${config[3]}`);
    console.log(`- WETH9 Token: ${config[4]}`);
    console.log(`- Current Slippage: ${config[5]} basis points (${Number(config[5]) / 100}%)`);
    console.log(`- Max Slippage: ${config[6]} basis points (${Number(config[6]) / 100}%)`);
    console.log(`- Preferred Fees: ${config[7].map(fee => `${fee} (${Number(fee) / 10000}%)`).join(', ')}`);
    
    // Test 2: Test ETH to CELO conversion estimation
    console.log('\n=== Test 2: ETH to CELO Conversion Estimation ===');
    const testEthAmount = parseEther('0.1'); // 0.1 ETH
    
    // Test with auto fee selection (0)
    const expectedCeloForEth = await publicClient.readContract({
      address: UNISWAP_V3_VOTING_PROXY_ADDRESS as `0x${string}`,
      abi: proxyAbi,
      functionName: 'getExpectedCeloOutputForETH',
      args: [testEthAmount, 0] // 0 for auto fee selection
    });
    
    console.log(`Expected CELO output for ${formatEther(testEthAmount)} ETH (auto fee): ${formatEther(expectedCeloForEth[0])} CELO (Fee: ${expectedCeloForEth[1]})`);
    
    // Test with specific fee (3000 = 0.3%)
    const expectedCeloForEthFixed = await publicClient.readContract({
      address: UNISWAP_V3_VOTING_PROXY_ADDRESS as `0x${string}`,
      abi: proxyAbi,
      functionName: 'getExpectedCeloOutputForETH',
      args: [testEthAmount, 3000] // 0.3% fee
    });
    
    console.log(`Expected CELO output for ${formatEther(testEthAmount)} ETH (0.3% fee): ${formatEther(expectedCeloForEthFixed[0])} CELO (Fee: ${expectedCeloForEthFixed[1]})`);
    
    // Test 3: Test token to CELO conversion estimation (if test token provided)
    if (TEST_TOKEN_ADDRESS) {
      console.log('\n=== Test 3: Token to CELO Conversion Estimation ===');
      const testTokenAmount = parseEther('100'); // 100 tokens
      
      // Test direct path
      const expectedCeloDirect = await publicClient.readContract({
        address: UNISWAP_V3_VOTING_PROXY_ADDRESS as `0x${string}`,
        abi: proxyAbi,
        functionName: 'getExpectedCeloOutput',
        args: [TEST_TOKEN_ADDRESS as `0x${string}`, testTokenAmount, 0, false] // auto fee, direct path
      });
      
      console.log(`Expected CELO output (direct path) for ${formatEther(testTokenAmount)} tokens: ${formatEther(expectedCeloDirect[0])} CELO (Fee: ${expectedCeloDirect[1]})`);
      
      // Test multihop path
      const expectedCeloMultihop = await publicClient.readContract({
        address: UNISWAP_V3_VOTING_PROXY_ADDRESS as `0x${string}`,
        abi: proxyAbi,
        functionName: 'getExpectedCeloOutput',
        args: [TEST_TOKEN_ADDRESS as `0x${string}`, testTokenAmount, 0, true] // auto fee, multihop
      });
      
      console.log(`Expected CELO output (multihop path) for ${formatEther(testTokenAmount)} tokens: ${formatEther(expectedCeloMultihop[0])} CELO (Fee: ${expectedCeloMultihop[1]})`);
      
      // Test pool existence for different fee tiers
      console.log('\n=== Test 4: Pool Existence Check ===');
      const feeTiers = [500, 3000, 10000]; // 0.05%, 0.3%, 1%
      
      for (const fee of feeTiers) {
        const poolExists = await publicClient.readContract({
          address: UNISWAP_V3_VOTING_PROXY_ADDRESS as `0x${string}`,
          abi: proxyAbi,
          functionName: 'poolExists',
          args: [TEST_TOKEN_ADDRESS as `0x${string}`, config[3], fee] // token, CELO, fee
        });
        
        console.log(`Pool exists for ${TEST_TOKEN_ADDRESS} <-> CELO with ${fee} fee (${Number(fee) / 10000}%): ${poolExists}`);
      }
    }
    
    // Test 5: Check account balance
    console.log('\n=== Test 5: Account Balance Check ===');
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`Account ETH balance: ${formatEther(balance)} ETH`);
    
    console.log('\n=== Testing Complete ===');
    console.log('The UniswapV3VotingProxy contract is working correctly!');
    console.log('');
    console.log('Key differences from V2:');
    console.log('- Uses fee tiers (0.05%, 0.3%, 1%) instead of fixed fees');
    console.log('- Supports both direct and multihop routing');
    console.log('- More efficient routing with concentrated liquidity');
    console.log('- Better price discovery and reduced slippage');
    console.log('');
    console.log('To test actual voting functionality:');
    console.log('1. Ensure you have sufficient ETH/tokens for testing');
    console.log('2. Use the voteWithETH() or voteWithToken() functions');
    console.log('3. Make sure you have valid campaign and project IDs');
    console.log('4. Ensure you have the correct bypass code');
    console.log('5. Choose appropriate fee tier (0 for auto-selection)');
    
  } catch (error) {
    console.error('Error testing contract:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Execute testing
testUniswapV3VotingProxy(); 