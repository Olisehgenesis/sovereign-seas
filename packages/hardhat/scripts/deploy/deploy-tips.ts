import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores, celo } from 'viem/chains';
import * as dotenv from 'dotenv';
import projectTippingArtifact from '../../artifacts/contracts/ProjectTipping.sol/ProjectTipping.json';

dotenv.config();

// Read configuration from environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS || '0x0cC096B1cC568A22C1F02DAB769881d1aFE6161a';

// Determine the network from command line arguments or environment
const args = process.argv.slice(2);
const isMainnet = true; 
const chain = isMainnet ? celo : celoAlfajores;

// Validate environment variables
if (!PRIVATE_KEY) {
  console.error('Error: PRIVATE_KEY environment variable is required');
  process.exit(1);
}

if (!SOVEREIGN_SEAS_V4_ADDRESS) {
  console.error('Error: SOVEREIGN_SEAS_V4_ADDRESS environment variable is required');
  process.exit(1);
}

// Create account and clients for balance check
const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
const publicClient = createPublicClient({
  chain: chain,
  transport: http(RPC_URL)
});

async function deployProjectTipping() {
  try {
    console.log('🚀 Deploying ProjectTipping contract...\n');
    
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
    console.log(`SovereignSeas V4 address: ${SOVEREIGN_SEAS_V4_ADDRESS}\n`);
    
    // Verify SovereignSeas contract exists
    console.log('🔍 Verifying SovereignSeas V4 contract...');
    try {
      const code = await publicClient.getBytecode({ address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}` });
      if (!code || code === '0x') {
        throw new Error('SovereignSeas V4 contract not found at the specified address');
      }
      console.log('✅ SovereignSeas V4 contract verified');
    } catch (error) {
      console.error('❌ Failed to verify SovereignSeas V4 contract:', error);
      process.exit(1);
    }
    
    // Deploy the contract
    console.log('📦 Deploying ProjectTipping contract...');
    
    const deployHash = await walletClient.deployContract({
      abi: projectTippingArtifact.abi,
      bytecode: projectTippingArtifact.bytecode as `0x${string}`,
      args: [
        SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`
      ],
      gas: 4000000n // 4M gas limit for deployment (larger contract)
    });
    
    console.log(`Deploy transaction hash: ${deployHash}`);
    console.log('⏳ Waiting for deployment confirmation...');
    
    // Wait for the transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash: deployHash,
      timeout: 120000 // 2 minute timeout for larger contract
    });
    
    if (receipt.status === 'success') {
      const contractAddress = receipt.contractAddress;
      console.log(`\n✅ ProjectTipping deployed successfully!`);
      console.log(`📍 Contract Address: ${contractAddress}`);
      console.log(`🔗 View on CeloScan: https://${isMainnet ? 'celoscan.io' : 'alfajores.celoscan.io'}/address/${contractAddress}`);
      console.log(`⛽ Gas used: ${receipt.gasUsed.toLocaleString()}`);
      console.log(`🧾 Block number: ${receipt.blockNumber}`);
      
      // Verify the deployment by reading contract state
      console.log('\n🔍 Verifying deployment...');
      
      try {
        // Check sovereign seas address
        const sovereignSeasAddress = await publicClient.readContract({
          address: contractAddress!,
          abi: projectTippingArtifact.abi,
          functionName: 'sovereignSeas'
        });
        
        // Check CELO token address
        const celoTokenAddress = await publicClient.readContract({
          address: contractAddress!,
          abi: projectTippingArtifact.abi,
          functionName: 'celoToken'
        });
        
        // Check tipping status
        const tippingEnabled = await publicClient.readContract({
          address: contractAddress!,
          abi: projectTippingArtifact.abi,
          functionName: 'tippingEnabled'
        });
        
        // Check minimum tip amount
        const minimumTipAmount = await publicClient.readContract({
          address: contractAddress!,
          abi: projectTippingArtifact.abi,
          functionName: 'minimumTipAmount'
        });
        
        // Check platform fee
        const platformFee = await publicClient.readContract({
          address: contractAddress!,
          abi: projectTippingArtifact.abi,
          functionName: 'PLATFORM_FEE_PERCENTAGE'
        });
        
        console.log('✅ Contract Configuration Verified:');
        console.log(`- SovereignSeas V4: ${sovereignSeasAddress}`);
        console.log(`- CELO Token: ${celoTokenAddress}`);
        console.log(`- Tipping Enabled: ${tippingEnabled}`);
        console.log(`- Minimum Tip: ${Number(minimumTipAmount as bigint) / 1e18} CELO`);
        console.log(`- Platform Fee: ${platformFee}%`);
        
        // Verify SovereignSeas connection
        if ((sovereignSeasAddress as string).toLowerCase() === SOVEREIGN_SEAS_V4_ADDRESS.toLowerCase()) {
          console.log('🎯 ✅ Confirmed: Connected to the correct SovereignSeas V4 contract!');
        } else {
          console.log('❌ Warning: SovereignSeas address mismatch');
        }
        
        // Test getting project count from SovereignSeas
        try {
          const projectCount = await publicClient.readContract({
            address: contractAddress!,
            abi: projectTippingArtifact.abi,
            functionName: 'sovereignSeas'
          });
          
          // Call getProjectCount through the interface
          const sovereignSeasContract = {
            address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
            abi: [
              {
                "inputs": [],
                "name": "getProjectCount",
                "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
              }
            ]
          };
          
          const totalProjects = await publicClient.readContract({
            ...sovereignSeasContract,
            functionName: 'getProjectCount'
          });
          
          console.log(`- Total Projects in SovereignSeas: ${totalProjects}`);
          
        } catch (error) {
          console.log('⚠️  Could not verify project count (this is normal if no projects exist yet)');
        }
        
      } catch (error) {
        console.error('❌ Error verifying contract configuration:', error);
      }
      
      console.log('\n📋 Contract Features:');
      console.log('💰 Tip projects in any supported token (ERC20 or native CELO)');
      console.log('📊 Track tips per project and user');
      console.log('🏆 Project leaderboards and analytics');
      console.log('💸 Project owners can withdraw tips');
      console.log('🔒 2% platform fee on all tips');
      console.log('⚡ Real-time tip tracking and history');
      
      console.log('\n📋 Next Steps:');
      console.log('1. Update your .env file:');
      console.log(`   PROJECT_TIPPING_ADDRESS=${contractAddress}`);
      console.log('2. Test tipping functionality:');
      console.log('   - Use tipProjectWithCelo() for CELO tips');
      console.log('   - Use tipProject() for ERC20 token tips');
      console.log('3. Project owners can withdraw tips using:');
      console.log('   - withdrawTips() for specific tokens');
      console.log('   - withdrawAllTips() for all tokens');
      console.log('4. Use view functions for analytics:');
      console.log('   - getProjectTipSummary()');
      console.log('   - getUserTipSummary()');
      console.log('   - getTopTippedProjects()');
      
      console.log('\n🔧 Admin Functions (Contract Owner):');
      console.log('- withdrawPlatformFees() - Collect platform fees');
      console.log('- toggleTipping() - Enable/disable tipping');
      console.log('- setMinimumTipAmount() - Adjust minimum tip');
      console.log('- emergencyWithdraw() - Emergency recovery');
      
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
        console.error('💡 Solution: Check constructor parameters and SovereignSeas contract address');
      } else if (error.message.includes('SovereignSeas')) {
        console.error('💡 Solution: Verify SOVEREIGN_SEAS_V4_ADDRESS is correct and deployed');
      }
    }
    
    return null;
  }
}

// Execute deployment
deployProjectTipping()
  .then((contractAddress) => {
    if (contractAddress) {
      console.log('\n🎉 ProjectTipping deployment completed successfully!');
      console.log('🚀 Ready to start tipping projects!');
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