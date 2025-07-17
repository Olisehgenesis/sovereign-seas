import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores, celo } from 'viem/chains';
import * as dotenv from 'dotenv';
import goodDollarVoterArtifact from '../../artifacts/contracts/GoodDollarVoter.sol/GoodDollarVoter.json';

dotenv.config();

// Read configuration from environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS || '0x0cC096B1cC568A22C1F02DAB769881d1aFE6161a';

// Determine the network from command line arguments or environment
const args = process.argv.slice(2);
const isMainnet = true;
const chain = isMainnet ? celo : celoAlfajores;

// Contract addresses - these are the actual addresses for GoodDollar and CELO
const GOOD_DOLLAR_ADDRESS = '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A'; // GoodDollar token
const WCELO_ADDRESS = isMainnet ? '0x471EcE3750Da237f93B8E339c536989b8978a438' : '0x471EcE3750Da237f93B8E339c536989b8978a438'; // WCELO
const UNISWAP_V3_POOL = '0x98287d4F15EEdE6517F215b3FcC10480c231E840'; // GS/CELO Uniswap V3 pool (fallback)
const UBESWAP_V2_PAIR = '0x25878951ae130014E827e6f54fd3B4CCa057a7e8'; // GS/CELO Ubeswap V2 pair (primary)
const UNISWAP_V3_GS_CUSD_POOL = '0x11EeA4c62288186239241cE21F54034006C79B3F'; // GS/cUSD pool (final fallback)

// Validate environment variables
if (!PRIVATE_KEY) {
  console.error('Error: PRIVATE_KEY environment variable is required');
  process.exit(1);
}

// Create account and clients for balance check
const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
const publicClient = createPublicClient({
  chain: chain,
  transport: http(RPC_URL)
});

async function deployGoodDollarVoter() {
  try {
    console.log('🚀 Deploying GoodDollarVoter contract...\n');
    
    // Check the wallet balance first
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`Account balance: ${Number(balance) / 1e18} CELO`);
    
    if (balance < 1000000000000000000n) { // Less than 1 CELO
      console.warn('⚠️  Warning: Low CELO balance for gas fees');
    }
    
    // Create wallet client with existing account
    const walletClient = createWalletClient({
      account,
      chain: chain,
      transport: http(RPC_URL)
    });
    
    console.log(`Using account: ${account.address}`);
    console.log(`Network: ${isMainnet ? 'Celo Mainnet' : 'Alfajores Testnet'}`);
    console.log(`RPC URL: ${RPC_URL}`);
    console.log(`SovereignSeas V4 address: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
    console.log(`GoodDollar address: ${GOOD_DOLLAR_ADDRESS}`);
    console.log(`WCELO address: ${WCELO_ADDRESS}`);
    console.log(`Ubeswap V2 GS/CELO Pair: ${UBESWAP_V2_PAIR}`);
    console.log(`Uniswap V3 GS/CELO Pool: ${UNISWAP_V3_POOL} (fallback)`);
    console.log(`Uniswap V3 GS/cUSD Pool: ${UNISWAP_V3_GS_CUSD_POOL} (final fallback)\n`);
    
    // Verify the Ubeswap V2 pair exists and has the correct tokens
    console.log('🔍 Verifying Ubeswap V2 pair...');
    try {
      const pairContract = {
        address: UBESWAP_V2_PAIR as `0x${string}`,
        abi: [
          {
            "inputs": [],
            "name": "token0",
            "outputs": [{"internalType": "address", "name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
          },
          {
            "inputs": [],
            "name": "token1", 
            "outputs": [{"internalType": "address", "name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
          },
          {
            "inputs": [],
            "name": "getReserves",
            "outputs": [
              {"internalType": "uint112", "name": "reserve0", "type": "uint112"},
              {"internalType": "uint112", "name": "reserve1", "type": "uint112"},
              {"internalType": "uint32", "name": "blockTimestampLast", "type": "uint32"}
            ],
            "stateMutability": "view",
            "type": "function"
          }
        ]
      };
      
      const [token0, token1, reserves] = await Promise.all([
        publicClient.readContract({
          ...pairContract,
          functionName: 'token0'
        }),
        publicClient.readContract({
          ...pairContract,
          functionName: 'token1'
        }),
        publicClient.readContract({
          ...pairContract,
          functionName: 'getReserves'
        })
      ]);
      
      // Type assertions to fix 'unknown' errors from lint
      const token0Address = token0 as string;
      const token1Address = token1 as string;
      const reservesArray = reserves as [bigint, bigint, number];

      console.log(`Pair token0: ${token0Address}`);
      console.log(`Pair token1: ${token1Address}`);
      console.log(`Reserves: ${Number(reservesArray[0]) / 1e18} / ${Number(reservesArray[1]) / 1e18}`);

      const hasCorrectTokens = 
        (token0Address.toLowerCase() === GOOD_DOLLAR_ADDRESS.toLowerCase() && token1Address.toLowerCase() === WCELO_ADDRESS.toLowerCase()) ||
        (token0Address.toLowerCase() === WCELO_ADDRESS.toLowerCase() && token1Address.toLowerCase() === GOOD_DOLLAR_ADDRESS.toLowerCase());
      
      if (hasCorrectTokens) {
        console.log('✅ Ubeswap V2 pair has correct tokens (GS/CELO)\n');
      } else {
        console.warn('⚠️ Ubeswap V2 pair tokens do not match expected GS/CELO');
        console.warn('Expected: GS and CELO');
        console.warn(`Got: ${token0} and ${token1}`);
        console.warn('Continuing with deployment - fallback routes available\n');
      }
    } catch (error) {
      console.warn('⚠️ Could not verify Ubeswap V2 pair:', error);
      console.warn('Continuing with deployment - fallback routes available\n');
    }
    
    // Deploy the contract
    console.log('📦 Deploying GoodDollarVoter contract...');
    
    const deployHash = await walletClient.deployContract({
      abi: goodDollarVoterArtifact.abi,
      bytecode: goodDollarVoterArtifact.bytecode as `0x${string}`,
      args: [
        SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`
      ],
      gas: 3000000n // 3M gas limit for deployment
    });
    
    console.log(`Deploy transaction hash: ${deployHash}`);
    console.log('⏳ Waiting for deployment confirmation...');
    
    // Wait for the transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash: deployHash,
      timeout: 60000 // 1 minute timeout
    });
    
    if (receipt.status === 'success') {
      const contractAddress = receipt.contractAddress;
      console.log(`\n✅ GoodDollarVoter deployed successfully!`);
      console.log(`📍 Contract Address: ${contractAddress}`);
      console.log(`🔗 View on CeloScan: https://celoscan.io/address/${contractAddress}`);
      console.log(`⛽ Gas used: ${receipt.gasUsed.toLocaleString()}`);
      console.log(`🧾 Block number: ${receipt.blockNumber}`);
      
      // Verify the deployment by checking if it's operational
      console.log('\n🔍 Verifying deployment...');
      
      try {
        const isOperational = await publicClient.readContract({
          address: contractAddress!,
          abi: goodDollarVoterArtifact.abi,
          functionName: 'isOperational'
        });
        
        console.log(`✅ Contract operational status: ${isOperational}`);
        
        // Get contract addresses
        const [sovereignSeas, goodDollar, celo, pool] = await Promise.all([
          publicClient.readContract({
            address: contractAddress!,
            abi: goodDollarVoterArtifact.abi,
            functionName: 'sovereignSeas'
          }),
          publicClient.readContract({
            address: contractAddress!,
            abi: goodDollarVoterArtifact.abi,
            functionName: 'goodDollar'
          }),
          publicClient.readContract({
            address: contractAddress!,
            abi: goodDollarVoterArtifact.abi,
            functionName: 'celo'
          }),
          publicClient.readContract({
            address: contractAddress!,
            abi: goodDollarVoterArtifact.abi,
            functionName: 'pool'
          })
        ]);
        
        console.log('✅ Contract Configuration Verified:');
        console.log(`- SovereignSeas: ${sovereignSeas}`);
        console.log(`- GoodDollar: ${goodDollar}`);
        console.log(`- CELO: ${celo}`);
        console.log(`- Uniswap Pool: ${pool}`);
        
      } catch (error) {
        console.error('⚠️ Could not verify all contract functions (this may be normal)');
      }
      
      console.log('\n📋 Next Steps:');
      console.log('1. Update your .env file:');
      console.log(`   GOOD_DOLLAR_VOTER_ADDRESS=${contractAddress}`);
      console.log('2. Run the verification script:');
      console.log(`   npm run verify:good-dollar-voter`);
      console.log('3. Run the test script:');
      console.log(`   npm run test:good-dollar-voter`);
      console.log('4. The proxy will automatically route GS → CELO → Vote');
      
      return contractAddress;
      
    } else {
      console.error('❌ Deployment failed!');
      console.error('Transaction was reverted');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error deploying contract:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      
      // Provide helpful error messages
      if (error.message.includes('insufficient funds')) {
        console.error('💡 Solution: Add more CELO to your wallet for gas fees');
      } else if (error.message.includes('nonce')) {
        console.error('💡 Solution: Wait a moment and try again (nonce issue)');
      } else if (error.message.includes('gas')) {
        console.error('💡 Solution: Try increasing the gas limit');
      } else if (error.message.includes('revert')) {
        console.error('💡 Solution: Check constructor parameters and contract dependencies');
      } else if (error.message.includes('LOK')) {
        console.error('💡 Solution: Uniswap pool may be locked, try again later');
      }
    }
    
    return null;
  }
}

// Execute deployment
deployGoodDollarVoter()
  .then((contractAddress) => {
    if (contractAddress) {
      console.log('\n🎉 Deployment completed successfully!');
      process.exit(0);
    } else {
      console.log('\n💥 Deployment failed!');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('💥 Fatal deployment error:', error);
    process.exit(1);
  });