import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores, celo } from 'viem/chains';
import * as dotenv from 'dotenv';
import workingProxyArtifact from '../../artifacts/contracts/WorkingCeloVotingProxy.sol/WorkingCeloVotingProxy.json';

dotenv.config();

// Read configuration from environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org'; // ✅ Added back
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS || '0x0cC096B1cC568A22C1F02DAB769881d1aFE6161a';
const WCELO_ADDRESS = process.env.WCELO_ADDRESS || '0x471EcE3750Da237f93B8E339c536989b8978a438';

// Determine the network from command line arguments or environment
const args = process.argv.slice(2);
const isMainnet = args.includes('--network') && args[args.indexOf('--network') + 1] === 'celo' || 
                  RPC_URL.includes('rpc.ankr.com/celo') || // ✅ Now can check RPC_URL
                  process.env.NETWORK === 'celo';
const chain = isMainnet ? celo : celoAlfajores;

// Validate environment variables
if (!PRIVATE_KEY) {
  console.error('Error: PRIVATE_KEY environment variable is required');
  process.exit(1);
}

// Create account and clients for balance check
const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
const publicClient = createPublicClient({
  chain: chain,
  transport: http(RPC_URL) // ✅ Fixed
});

async function deployWorkingCeloVotingProxyInternal() {
  try {
    console.log('🚀 Deploying WorkingCeloVotingProxy contract...\n');
    
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
      transport: http(RPC_URL) // ✅ Fixed
    });
    
    console.log(`Using account: ${account.address}`);
    console.log(`Network: ${isMainnet ? 'Celo Mainnet' : 'Alfajores Testnet'}`);
    console.log(`RPC URL: ${RPC_URL}`); // ✅ Added for debugging
    console.log(`SovereignSeas V4 address: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
    console.log(`WCELO address: ${WCELO_ADDRESS}`);
    console.log(`Universal Router V1 2: 0x643770E279d5D0733F21d6DC03A8efbABf3255B4 (hardcoded)\n`);
    
    // Deploy the contract
    console.log('📦 Deploying contract...');
    
    const deployHash = await walletClient.deployContract({
      abi: workingProxyArtifact.abi,
      bytecode: workingProxyArtifact.bytecode as `0x${string}`,
      args: [
        SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
        WCELO_ADDRESS as `0x${string}`
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
      console.log(`\n✅ WorkingCeloVotingProxy deployed successfully!`);
      console.log(`📍 Contract Address: ${contractAddress}`);
      console.log(`🔗 View on CeloScan: https://celoscan.io/address/${contractAddress}`);
      console.log(`⛽ Gas used: ${receipt.gasUsed.toLocaleString()}`);
      console.log(`🧾 Block number: ${receipt.blockNumber}`);
      
      // Verify the deployment by calling getConfiguration
      console.log('\n🔍 Verifying deployment...');
      
      const configData = await publicClient.readContract({
        address: contractAddress!,
        abi: workingProxyArtifact.abi,
        functionName: 'getConfiguration'
      });
      
      console.log('✅ Contract Configuration Verified:');
      console.log(`- Universal Router: ${(configData as any[])[0]}`);
      console.log(`- SovereignSeas: ${(configData as any[])[1]}`);
      console.log(`- WCELO: ${(configData as any[])[2]}`);
      console.log(`- Slippage: ${(configData as any[])[3]} (${Number((configData as any[])[3])/100}%)`);
      
      // Check if using the correct Universal Router
      const routerAddress = (configData as any[])[0] as string;
      if (routerAddress.toLowerCase() === '0x643770E279d5D0733F21d6DC03A8efbABf3255B4'.toLowerCase()) {
        console.log('🎯 ✅ Confirmed: Using the WORKING Universal Router V1 2!');
      } else {
        console.log('❌ Warning: Not using the expected Universal Router address');
      }
      
      console.log('\n📋 Next Steps:');
      console.log('1. Update your .env file:');
      console.log(`   ENHANCED_CELO_VOTING_PROXY_ADDRESS=${contractAddress}`);
      console.log('2. Run your voting test script');
      console.log('3. The proxy will automatically route G$ → CELO → Vote');
      
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
      }
    }
    
    return null;
  }
}

// Execute deployment
// deployWorkingCeloVotingProxy()
//   .then((contractAddress) => {
//     if (contractAddress) {
//       console.log('\n🎉 Deployment completed successfully!');
//       process.exit(0);
//     } else {
//       console.log('\n💥 Deployment failed!');
//       process.exit(1);
//     }
//   })
//   .catch((error) => {
//     console.error('💥 Fatal deployment error:', error);
//     process.exit(1);
//   });

// Export the function for use in other scripts
export async function deployWorkingProxy(network?: string) {
  return await deployWorkingCeloVotingProxyInternal();
}