import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores, celo } from 'viem/chains';
import * as dotenv from 'dotenv';
import sovereignVotingGatewayAbi from '../../../artifacts/contracts/SovereignVotingGateway.sol/SovereignVotingGateway.json';

dotenv.config();

// Only need these 2 addresses plus the basics!
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
const UBESWAP_V2_ROUTER_ADDRESS = process.env.UBESWAP_V2_ROUTER_ADDRESS;
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS;

// Determine network
const args = process.argv.slice(2);
const isMainnet = args.includes('--network') && args[args.indexOf('--network') + 1] === 'celo' || 
                  RPC_URL.includes('rpc.ankr.com/celo') || 
                  process.env.NETWORK === 'celo';
const chain = isMainnet ? celo : celoAlfajores;

// Validate required environment variables
if (!PRIVATE_KEY) {
  console.error('❌ Error: PRIVATE_KEY environment variable is required');
  process.exit(1);
}

if (!UBESWAP_V2_ROUTER_ADDRESS) {
  console.error('❌ Error: UBESWAP_V2_ROUTER_ADDRESS environment variable is required');
  process.exit(1);
}

if (!SOVEREIGN_SEAS_V4_ADDRESS) {
  console.error('❌ Error: SOVEREIGN_SEAS_V4_ADDRESS environment variable is required');
  process.exit(1);
}

console.log('🚀 Deploying SovereignVotingGateway...');
console.log('📊 Configuration:');
console.log(`   Network: ${isMainnet ? 'Celo Mainnet' : 'Alfajores Testnet'}`);
console.log(`   RPC URL: ${RPC_URL}`);
console.log(`   Router: ${UBESWAP_V2_ROUTER_ADDRESS}`);
console.log(`   SovereignSeas: ${SOVEREIGN_SEAS_V4_ADDRESS}`);

// Create account and clients
const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
const publicClient = createPublicClient({
  chain: chain,
  transport: http(RPC_URL)
});

const walletClient = createWalletClient({
  account,
  chain: chain,
  transport: http(RPC_URL)
});

// Read contract bytecode
let contractBytecode: string;
try {
  contractBytecode = sovereignVotingGatewayAbi.bytecode;
  if (!contractBytecode.startsWith('0x')) {
    contractBytecode = '0x' + contractBytecode;
  }
} catch (error) {
  console.error('❌ Error reading contract bytecode:', error);
  console.error('   Make sure the contract is compiled first');
  process.exit(1);
}

async function deploySovereignVotingGateway() {
  try {
    // Check wallet balance
    const balance = await publicClient.getBalance({ address: account.address });
    const balanceInCelo = Number(balance) / 1e18;
    console.log(`💰 Account balance: ${balanceInCelo.toFixed(6)} CELO`);
    
    if (balanceInCelo < 0.1) {
      console.warn('⚠️  Warning: Low CELO balance. Deployment may fail.');
    }
    
    console.log(`📝 Deploying from account: ${account.address}`);
    
    // Validate ABI and bytecode
    if (!sovereignVotingGatewayAbi.abi || typeof sovereignVotingGatewayAbi.abi !== 'object') {
      throw new Error('Invalid ABI format');
    }

    if (!contractBytecode || contractBytecode === '0x') {
      throw new Error('Invalid bytecode');
    }
    
    console.log('📤 Sending deployment transaction...');
    
    // Deploy with only 2 constructor arguments!
    const hash = await walletClient.deployContract({
      abi: sovereignVotingGatewayAbi.abi,
      bytecode: contractBytecode as `0x${string}`,
      args: [
        UBESWAP_V2_ROUTER_ADDRESS as `0x${string}`,
        SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`
      ]
    });
    
    console.log(`⏳ Transaction hash: ${hash}`);
    console.log('⏳ Waiting for confirmation...');
    
    // Wait for deployment
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash,
      timeout: 120_000 // 2 minutes timeout
    });
    
    if (!receipt.contractAddress) {
      throw new Error('Deployment failed - no contract address in receipt');
    }
    
    console.log('');
    console.log('🎉 CONTRACT DEPLOYED SUCCESSFULLY!');
    console.log('📋 Deployment Summary:');
    console.log(`   Contract Address: ${receipt.contractAddress}`);
    console.log(`   Block Number: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toLocaleString()}`);
    console.log(`   Transaction Hash: ${hash}`);
    console.log('');
    console.log('🔧 Configuration:');
    console.log(`   Router: ${UBESWAP_V2_ROUTER_ADDRESS}`);
    console.log(`   SovereignSeas: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
    console.log('   Factory: Will be auto-discovered after initialization ⏳');
    console.log('   WETH: Will be auto-discovered after initialization ⏳');
    console.log('   CELO: Native token ✅');
    console.log('');
    console.log('🚨 IMPORTANT: Contract needs initialization!');
    console.log(`   Call initialize() function on: ${receipt.contractAddress}`);
    console.log('   This will auto-discover factory and WETH addresses');
    console.log('');
    
    // Now try to initialize the contract
    console.log('🔄 Attempting to initialize the contract...');
    
    try {
      const initHash = await walletClient.writeContract({
        address: receipt.contractAddress as `0x${string}`,
        abi: sovereignVotingGatewayAbi.abi,
        functionName: 'initialize'
      });
      
      console.log(`⏳ Initialization transaction: ${initHash}`);
      console.log('⏳ Waiting for initialization confirmation...');
      
      const initReceipt = await publicClient.waitForTransactionReceipt({ hash: initHash });
      
      console.log('');
      console.log('🎉 CONTRACT INITIALIZED SUCCESSFULLY!');
      console.log('✅ Factory and WETH addresses auto-discovered');
      console.log('✅ Contract is ready for use');
      console.log('');
      
    } catch (initError) {
      console.log('');
      console.log('⚠️  Auto-initialization failed, but deployment succeeded!');
      console.log('   You can manually call initialize() later');
      console.log(`   Initialization error: ${initError}`);
      console.log('');
    }
    
    console.log('💡 Next Steps:');
    console.log('   1. Add contract address to your .env:');
    console.log(`      SOVEREIGN_VOTING_GATEWAY=${receipt.contractAddress}`);
    console.log('   2. Verify the contract on block explorer');
    console.log('   3. Test with a small token amount first');
    console.log('');
    console.log('🎯 Key Features:');
    console.log('   ✅ Safe deployment (no external calls in constructor)');
    console.log('   ✅ Post-deployment initialization');
    console.log('   ✅ Handles CELO as native currency');
    console.log('   ✅ Route caching for gas optimization');
    console.log('   ✅ Comprehensive quote system');
    console.log('   ✅ Built-in slippage protection');
    console.log('   ✅ Emergency recovery functions');
    
    return receipt.contractAddress;
    
  } catch (error) {
    console.error('');
    console.error('❌ DEPLOYMENT FAILED');
    
    if (error instanceof Error) {
      console.error(`   Error: ${error.message}`);
      
      // Common error messages and solutions
      if (error.message.includes('insufficient funds')) {
        console.error('   💡 Solution: Add more CELO to your wallet');
      } else if (error.message.includes('nonce')) {
        console.error('   💡 Solution: Wait a moment and try again');
      } else if (error.message.includes('gas')) {
        console.error('   💡 Solution: Network congestion, try again later');
      } else if (error.message.includes('revert')) {
        console.error('   💡 Solution: Check constructor parameters');
      }
      
      if (error.stack) {
        console.error('   Stack trace:', error.stack);
      }
    }
    
    process.exit(1);
  }
}

// Execute deployment
console.log('🏁 Starting deployment...');
deploySovereignVotingGateway()
  .then(() => {
    console.log('🏆 Deployment completed successfully!');
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });