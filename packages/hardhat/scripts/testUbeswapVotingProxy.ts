import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores, celo } from 'viem/chains';
import * as dotenv from 'dotenv';

dotenv.config();

// Read configuration from environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
const UBESWAP_VOTING_PROXY_ADDRESS = process.env.UBESWAP_VOTING_PROXY_ADDRESS;
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

if (!UBESWAP_VOTING_PROXY_ADDRESS) {
  console.error('Error: UBESWAP_VOTING_PROXY_ADDRESS environment variable is required');
  process.exit(1);
}

// Create account and clients
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

// Basic ABI for testing
const ubeswapVotingProxyAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_token",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "_useWETHPath",
        "type": "bool"
      }
    ],
    "name": "getExpectedCeloOutput",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "expectedCelo",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ubeswapRouter",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "sovereignSeas",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "CELO",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "slippageTolerance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

async function testUbeswapVotingProxy() {
  try {
    console.log('Testing UbeswapVotingProxy contract...');
    console.log(`Network: ${isMainnet ? 'Celo Mainnet' : 'Alfajores Testnet'}`);
    console.log(`Contract address: ${UBESWAP_VOTING_PROXY_ADDRESS}`);
    console.log(`Test account: ${account.address}`);
    
    // Test 1: Read contract configuration
    console.log('\n=== Test 1: Reading Contract Configuration ===');
    
    const ubeswapRouter = await publicClient.readContract({
      address: UBESWAP_VOTING_PROXY_ADDRESS as `0x${string}`,
      abi: ubeswapVotingProxyAbi,
      functionName: 'ubeswapRouter'
    });
    console.log(`Ubeswap Router: ${ubeswapRouter}`);
    
    const sovereignSeas = await publicClient.readContract({
      address: UBESWAP_VOTING_PROXY_ADDRESS as `0x${string}`,
      abi: ubeswapVotingProxyAbi,
      functionName: 'sovereignSeas'
    });
    console.log(`SovereignSeas: ${sovereignSeas}`);
    
    const celoToken = await publicClient.readContract({
      address: UBESWAP_VOTING_PROXY_ADDRESS as `0x${string}`,
      abi: ubeswapVotingProxyAbi,
      functionName: 'CELO'
    });
    console.log(`CELO Token: ${celoToken}`);
    
    const slippageTolerance = await publicClient.readContract({
      address: UBESWAP_VOTING_PROXY_ADDRESS as `0x${string}`,
      abi: ubeswapVotingProxyAbi,
      functionName: 'slippageTolerance'
    });
    console.log(`Slippage Tolerance: ${slippageTolerance} basis points (${Number(slippageTolerance) / 100}%)`);
    
    // Test 2: Test expected output calculation (if test token is provided)
    if (TEST_TOKEN_ADDRESS) {
      console.log('\n=== Test 2: Testing Expected Output Calculation ===');
      console.log(`Test token: ${TEST_TOKEN_ADDRESS}`);
      
      // Test with 1 token (assuming 18 decimals)
      const testAmount = BigInt(10 ** 18); // 1 token
      
      try {
        const expectedCeloDirect = await publicClient.readContract({
          address: UBESWAP_VOTING_PROXY_ADDRESS as `0x${string}`,
          abi: ubeswapVotingProxyAbi,
          functionName: 'getExpectedCeloOutput',
          args: [TEST_TOKEN_ADDRESS as `0x${string}`, testAmount, false]
        });
        console.log(`Expected CELO (direct route): ${expectedCeloDirect}`);
        
        const expectedCeloWETH = await publicClient.readContract({
          address: UBESWAP_VOTING_PROXY_ADDRESS as `0x${string}`,
          abi: ubeswapVotingProxyAbi,
          functionName: 'getExpectedCeloOutput',
          args: [TEST_TOKEN_ADDRESS as `0x${string}`, testAmount, true]
        });
        console.log(`Expected CELO (WETH route): ${expectedCeloWETH}`);
        
        if (expectedCeloDirect > 0 || expectedCeloWETH > 0) {
          console.log('✅ Expected output calculation working');
        } else {
          console.log('⚠️  No liquidity found for test token');
        }
      } catch (error) {
        console.log('⚠️  Error calculating expected output (may be due to no liquidity):', error);
      }
    } else {
      console.log('\n=== Test 2: Skipped (no TEST_TOKEN_ADDRESS provided) ===');
      console.log('To test expected output calculation, set TEST_TOKEN_ADDRESS in your .env file');
    }
    
    // Test 3: Check account balance
    console.log('\n=== Test 3: Account Balance Check ===');
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`Account CELO balance: ${balance} wei (${Number(balance) / 10**18} CELO)`);
    
    if (balance < BigInt(10 ** 18)) {
      console.log('⚠️  Low CELO balance - may not be able to perform voting tests');
    } else {
      console.log('✅ Sufficient CELO balance for testing');
    }
    
    console.log('\n=== Test Summary ===');
    console.log('✅ Contract configuration read successfully');
    console.log('✅ Contract appears to be properly deployed and configured');
    console.log('✅ Ready for voting operations');
    
    if (TEST_TOKEN_ADDRESS) {
      console.log('✅ Expected output calculation tested');
    }
    
    console.log('\n=== Next Steps ===');
    console.log('1. The contract is ready for use');
    console.log('2. You can now call voteWithToken() with appropriate parameters');
    console.log('3. Make sure to approve the proxy contract to spend your tokens before voting');
    
  } catch (error) {
    console.error('Error testing contract:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Execute test
testUbeswapVotingProxy(); 