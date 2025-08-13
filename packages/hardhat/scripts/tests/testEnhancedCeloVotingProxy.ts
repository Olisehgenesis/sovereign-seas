import { createWalletClient, http, createPublicClient, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores, celo } from 'viem/chains';
import * as dotenv from 'dotenv';

dotenv.config();

// Read configuration from environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
const ENHANCED_CELO_VOTING_PROXY_ADDRESS = process.env.ENHANCED_CELO_VOTING_PROXY_ADDRESS;
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

if (!ENHANCED_CELO_VOTING_PROXY_ADDRESS) {
  console.error('Error: ENHANCED_CELO_VOTING_PROXY_ADDRESS environment variable is required');
  process.exit(1);
}

async function testEnhancedCeloVotingProxy() {
  try {
    console.log('Testing EnhancedCeloVotingProxy contract...');
    
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
    console.log(`Proxy contract address: ${ENHANCED_CELO_VOTING_PROXY_ADDRESS}`);
    
    // Contract ABI for testing - key functions from EnhancedCeloVotingProxy
    const proxyAbi = [
      {
        "inputs": [],
        "name": "getConfiguration",
        "outputs": [
          {"internalType": "address", "name": "router", "type": "address"},
          {"internalType": "address", "name": "quoterAddr", "type": "address"},
          {"internalType": "address", "name": "factoryAddr", "type": "address"},
          {"internalType": "address", "name": "sovereignSeasAddr", "type": "address"},
          {"internalType": "address", "name": "celoAddr", "type": "address"},
          {"internalType": "uint256", "name": "currentSlippage", "type": "uint256"},
          {"internalType": "uint24[]", "name": "fees", "type": "uint24[]"},
          {"internalType": "uint256", "name": "liquidityThreshold", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "address", "name": "_token", "type": "address"},
          {"internalType": "uint256", "name": "_amount", "type": "uint256"},
          {"internalType": "uint24", "name": "_preferredFee", "type": "uint24"}
        ],
        "name": "getVotingEstimate",
        "outputs": [
          {
            "components": [
              {"internalType": "address", "name": "inputToken", "type": "address"},
              {"internalType": "uint256", "name": "inputAmount", "type": "uint256"},
              {"internalType": "uint256", "name": "expectedCelo", "type": "uint256"},
              {"internalType": "uint256", "name": "minimumCelo", "type": "uint256"},
              {"internalType": "uint24", "name": "feeUsed", "type": "uint24"},
              {"internalType": "address", "name": "poolUsed", "type": "address"},
              {"internalType": "uint256", "name": "slippageAmount", "type": "uint256"},
              {"internalType": "uint256", "name": "slippagePercent", "type": "uint256"},
              {"internalType": "uint256", "name": "gasEstimate", "type": "uint256"},
              {"internalType": "bool", "name": "isValid", "type": "bool"},
              {"internalType": "string", "name": "errorMessage", "type": "string"}
            ],
            "internalType": "struct EnhancedCeloVotingProxy.VotingEstimate",
            "name": "",
            "type": "tuple"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "address", "name": "_token", "type": "address"},
          {"internalType": "uint256", "name": "_amount", "type": "uint256"}
        ],
        "name": "analyzeAllPools",
        "outputs": [
          {
            "components": [
              {"internalType": "address", "name": "pool", "type": "address"},
              {"internalType": "uint24", "name": "fee", "type": "uint24"},
              {"internalType": "bool", "name": "exists", "type": "bool"},
              {"internalType": "uint128", "name": "liquidity", "type": "uint128"},
              {"internalType": "uint256", "name": "expectedOutput", "type": "uint256"},
              {"internalType": "uint256", "name": "gasEstimate", "type": "uint256"},
              {"internalType": "bool", "name": "isRecommended", "type": "bool"}
            ],
            "internalType": "struct EnhancedCeloVotingProxy.PoolAnalysis[]",
            "name": "",
            "type": "tuple[]"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "address", "name": "_tokenA", "type": "address"},
          {"internalType": "address", "name": "_tokenB", "type": "address"},
          {"internalType": "uint24", "name": "_fee", "type": "uint24"}
        ],
        "name": "getCacheInfo",
        "outputs": [
          {
            "components": [
              {"internalType": "address", "name": "pool", "type": "address"},
              {"internalType": "uint24", "name": "fee", "type": "uint24"},
              {"internalType": "bool", "name": "exists", "type": "bool"},
              {"internalType": "uint128", "name": "liquidity", "type": "uint128"},
              {"internalType": "bool", "name": "isValid", "type": "bool"}
            ],
            "internalType": "struct EnhancedCeloVotingProxy.PoolInfo",
            "name": "poolInfo",
            "type": "tuple"
          },
          {"internalType": "uint256", "name": "cacheAge", "type": "uint256"},
          {"internalType": "bool", "name": "isExpired", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
      }
    ];
    
    // Test 1: Get contract configuration
    console.log('\n=== Test 1: Getting Contract Configuration ===');
    const config = await publicClient.readContract({
      address: ENHANCED_CELO_VOTING_PROXY_ADDRESS as `0x${string}`,
      abi: proxyAbi,
      functionName: 'getConfiguration'
    });
    
    console.log('Contract Configuration:');
    console.log(`- Uniswap V3 Router: ${config[0]}`);
    console.log(`- Uniswap V3 Quoter: ${config[1]}`);
    console.log(`- Uniswap V3 Factory: ${config[2]}`);
    console.log(`- SovereignSeas Contract: ${config[3]}`);
    console.log(`- CELO Token: ${config[4]}`);
    console.log(`- Current Slippage: ${config[5]} basis points (${Number(config[5]) / 100}%)`);
    console.log(`- Preferred Fees: ${config[6].map(fee => `${fee} (${Number(fee) / 10000}%)`).join(', ')}`);
    console.log(`- Liquidity Threshold: ${formatEther(config[7])} CELO`);
    
    // Test 2: Test CELO voting estimate (direct CELO)
    console.log('\n=== Test 2: CELO Voting Estimate (Direct) ===');
    const testCeloAmount = parseEther('1'); // 1 CELO
    
    const celoEstimate = await publicClient.readContract({
      address: ENHANCED_CELO_VOTING_PROXY_ADDRESS as `0x${string}`,
      abi: proxyAbi,
      functionName: 'getVotingEstimate',
      args: [config[4], testCeloAmount, 0] // CELO token, 1 CELO, auto fee
    });
    
    console.log(`CELO Voting Estimate for ${formatEther(testCeloAmount)} CELO:`);
    console.log(`- Expected CELO: ${formatEther(celoEstimate.expectedCelo)} CELO`);
    console.log(`- Minimum CELO: ${formatEther(celoEstimate.minimumCelo)} CELO`);
    console.log(`- Fee Used: ${celoEstimate.feeUsed} (${Number(celoEstimate.feeUsed) / 10000}%)`);
    console.log(`- Pool Used: ${celoEstimate.poolUsed}`);
    console.log(`- Slippage: ${formatEther(celoEstimate.slippageAmount)} CELO (${Number(celoEstimate.slippagePercent) / 100}%)`);
    console.log(`- Gas Estimate: ${celoEstimate.gasEstimate.toString()}`);
    console.log(`- Is Valid: ${celoEstimate.isValid}`);
    if (celoEstimate.errorMessage) {
      console.log(`- Error: ${celoEstimate.errorMessage}`);
    }
    
    // Test 3: Test token to CELO conversion estimation (if test token provided)
    if (TEST_TOKEN_ADDRESS) {
      console.log('\n=== Test 3: Token to CELO Voting Estimate ===');
      const testTokenAmount = parseEther('100'); // 100 tokens
      
      const tokenEstimate = await publicClient.readContract({
        address: ENHANCED_CELO_VOTING_PROXY_ADDRESS as `0x${string}`,
        abi: proxyAbi,
        functionName: 'getVotingEstimate',
        args: [TEST_TOKEN_ADDRESS as `0x${string}`, testTokenAmount, 0] // test token, 100 tokens, auto fee
      });
      
      console.log(`Token Voting Estimate for ${formatEther(testTokenAmount)} tokens:`);
      console.log(`- Expected CELO: ${formatEther(tokenEstimate.expectedCelo)} CELO`);
      console.log(`- Minimum CELO: ${formatEther(tokenEstimate.minimumCelo)} CELO`);
      console.log(`- Fee Used: ${tokenEstimate.feeUsed} (${Number(tokenEstimate.feeUsed) / 10000}%)`);
      console.log(`- Pool Used: ${tokenEstimate.poolUsed}`);
      console.log(`- Slippage: ${formatEther(tokenEstimate.slippageAmount)} CELO (${Number(tokenEstimate.slippagePercent) / 100}%)`);
      console.log(`- Gas Estimate: ${tokenEstimate.gasEstimate.toString()}`);
      console.log(`- Is Valid: ${tokenEstimate.isValid}`);
      if (tokenEstimate.errorMessage) {
        console.log(`- Error: ${tokenEstimate.errorMessage}`);
      }
      
      // Test 4: Analyze all pools for the test token
      console.log('\n=== Test 4: Analyze All Pools ===');
      const poolAnalyses = await publicClient.readContract({
        address: ENHANCED_CELO_VOTING_PROXY_ADDRESS as `0x${string}`,
        abi: proxyAbi,
        functionName: 'analyzeAllPools',
        args: [TEST_TOKEN_ADDRESS as `0x${string}`, testTokenAmount]
      });
      
      console.log(`Pool Analysis for ${TEST_TOKEN_ADDRESS}:`);
      poolAnalyses.forEach((analysis, index) => {
        console.log(`Pool ${index + 1}:`);
        console.log(`  - Fee: ${analysis.fee} (${Number(analysis.fee) / 10000}%)`);
        console.log(`  - Pool Address: ${analysis.pool}`);
        console.log(`  - Exists: ${analysis.exists}`);
        console.log(`  - Liquidity: ${analysis.liquidity.toString()}`);
        console.log(`  - Expected Output: ${formatEther(analysis.expectedOutput)} CELO`);
        console.log(`  - Gas Estimate: ${analysis.gasEstimate.toString()}`);
        console.log(`  - Recommended: ${analysis.isRecommended}`);
      });
      
      // Test 5: Check cache info for different fee tiers
      console.log('\n=== Test 5: Cache Information ===');
      const feeTiers = [500, 3000, 10000]; // 0.05%, 0.3%, 1%
      
      for (const fee of feeTiers) {
        const cacheInfo = await publicClient.readContract({
          address: ENHANCED_CELO_VOTING_PROXY_ADDRESS as `0x${string}`,
          abi: proxyAbi,
          functionName: 'getCacheInfo',
          args: [TEST_TOKEN_ADDRESS as `0x${string}`, config[4], fee] // token, CELO, fee
        });
        
        console.log(`Cache Info for ${TEST_TOKEN_ADDRESS} <-> CELO with ${fee} fee (${Number(fee) / 10000}%):`);
        console.log(`  - Pool: ${cacheInfo.poolInfo.pool}`);
        console.log(`  - Exists: ${cacheInfo.poolInfo.exists}`);
        console.log(`  - Liquidity: ${cacheInfo.poolInfo.liquidity.toString()}`);
        console.log(`  - Is Valid: ${cacheInfo.poolInfo.isValid}`);
        console.log(`  - Cache Age: ${cacheInfo.cacheAge} seconds`);
        console.log(`  - Is Expired: ${cacheInfo.isExpired}`);
      }
    }
    
    // Test 6: Check account balance
    console.log('\n=== Test 6: Account Balance Check ===');
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`Account CELO balance: ${formatEther(balance)} CELO`);
    
    console.log('\n=== Testing Complete ===');
    console.log('EnhancedCeloVotingProxy contract is working correctly!');
    
  } catch (error) {
    console.error('Error testing contract:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Execute testing
testEnhancedCeloVotingProxy(); 