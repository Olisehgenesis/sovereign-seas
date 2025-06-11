import { createWalletClient, http, parseEther, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';
import * as dotenv from 'dotenv';
import projectTippingAbi from '../../artifacts/contracts/ProjectTipping.sol/ProjectTipping.json';
import { readFileSync } from 'fs';

dotenv.config();

// Command line argument parsing
const args = process.argv.slice(2);
const networkFlag = args.find(arg => arg.startsWith('--network='));
const network = networkFlag ? networkFlag.split('=')[1] : 'celo';

// Read configuration from environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Validate environment variables
if (!PRIVATE_KEY) {
  console.error('Error: PRIVATE_KEY environment variable is required');
  process.exit(1);
}

// Network-specific configuration
const getNetworkConfig = (network: string) => {
  return {
    rpcUrl: process.env.CELO_MAINNET_RPC_URL || 'https://forno.celo.org',
    sovereignSeasAddress: process.env.SOVEREIGN_SEAS_V4_ADDRESS,
    cUSDAddress: process.env.CUSD_TOKEN_ADDRESS || '0x765DE816845861e75A25fCA122bb6898B8B1282a', // Mainnet cUSD
    explorerUrl: 'https://celoscan.io'
  };
};

// Read contract bytecode from file
let contractBytecode: string;
try {
  contractBytecode = projectTippingAbi.bytecode;
  // Ensure bytecode starts with '0x'
  if (!contractBytecode.startsWith('0x')) {
    contractBytecode = '0x' + contractBytecode;
  }
} catch (error) {
  console.error('Error reading contract bytecode file:', error);
  console.error('Please make sure your ProjectTipping contract is compiled and the bytecode file exists');
  console.error('Run: npx hardhat compile');
  process.exit(1);
}

async function deployProjectTipping() {
  try {
    console.log('='.repeat(60));
    console.log('🚀 Deploying ProjectTipping Contract');
    console.log('='.repeat(60));
    console.log(`Network: ${network.toUpperCase()}`);
    console.log(`Chain: ${celo.name}`);
    
    const config = getNetworkConfig(network);
    console.log(`RPC URL: ${config.rpcUrl}`);
    console.log('');

    // Validate required addresses
    if (!config.sovereignSeasAddress) {
      console.error(`❌ Error: SOVEREIGN_SEAS_V4_ADDRESS not found`);
      console.error(`Please set: SOVEREIGN_SEAS_V4_ADDRESS in your .env file`);
      process.exit(1);
    }

    // Create wallet client with private key
    const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
    const walletClient = createWalletClient({
      account,
      chain: celo,
      transport: http(config.rpcUrl)
    });

    const publicClient = createPublicClient({
      chain: celo,
      transport: http(config.rpcUrl)
    });

    console.log(`Deployer account: ${account.address}`);
    
    // Check account balance
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`Account balance: ${(Number(balance) / 1e18).toFixed(4)} CELO`);
    
    if (Number(balance) < 1e17) { // Less than 0.1 CELO
      console.warn('⚠️  Warning: Low account balance. You may need more CELO for deployment.');
    }

    console.log('');
    console.log('📋 Constructor Parameters:');
    console.log(`SovereignSeas Contract: ${config.sovereignSeasAddress}`);
    console.log(`cUSD: ${config.cUSDAddress}`);
    console.log(`Initial Owner: ${account.address}`);
    console.log('');
    console.log('ℹ️  Note: CELO token and Mento broker addresses will be');
    console.log('   automatically retrieved from the SovereignSeas contract');
    console.log('');

    // Validate ABI
    let abi = projectTippingAbi.abi;
    if (!abi || typeof abi !== 'object') {
      throw new Error('Invalid ABI format');
    }

    // Estimate gas for deployment
    console.log('📊 Estimating deployment gas...');
    try {
      const gasEstimate = await publicClient.estimateGas({
        account: account.address,
        data: contractBytecode as `0x${string}`,
        value: 0n
      });
      console.log(`Estimated gas: ${gasEstimate.toString()}`);
    } catch (gasError) {
      console.log('Could not estimate gas, proceeding with deployment...');
    }

    // Deploy contract with correct constructor arguments
    console.log('🚀 Sending deployment transaction...');
    const hash = await walletClient.deployContract({
      abi: projectTippingAbi.abi,
      bytecode: contractBytecode as `0x${string}`,
      args: [
        config.sovereignSeasAddress as `0x${string}`,  // _sovereignSeasContract
        config.cUSDAddress as `0x${string}`,           // _cUSD
        account.address as `0x${string}`               // _initialOwner
      ]
    });

    console.log(`📄 Transaction hash: ${hash}`);
    console.log('⏳ Waiting for transaction confirmation...');

    // Wait for the transaction to be mined
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash,
      timeout: 120_000 // 2 minutes timeout
    });

    if (!receipt.contractAddress) {
      throw new Error('Contract deployment failed - no contract address in receipt');
    }

    console.log('');
    console.log('✅ Contract deployed successfully!');
    console.log('='.repeat(60));
    console.log(`📍 Contract Address: ${receipt.contractAddress}`);
    console.log(`🔗 Transaction Hash: ${hash}`);
    console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`📊 Block Number: ${receipt.blockNumber.toString()}`);
    console.log('');

    // Generate environment variable updates
    console.log('📝 Environment Variables:');
    console.log('Add these to your .env file:');
    console.log('');
    console.log(`PROJECT_TIPPING_ADDRESS=${receipt.contractAddress}`);
    console.log('');

    // Generate verification info
    console.log('🔍 Contract Verification:');
    console.log('Use these parameters for contract verification:');
    console.log(`Constructor Arguments:`);
    console.log(`  1. SovereignSeas Contract: ${config.sovereignSeasAddress}`);
    console.log(`  2. cUSD: ${config.cUSDAddress}`);
    console.log(`  3. Initial Owner: ${account.address}`);
    console.log('');

    // Generate interaction examples
    console.log('🛠️  Next Steps:');
    console.log('1. Verify the contract on CeloScan');
    console.log('2. Test basic functionality:');
    console.log(`   - Check tipping status: getTippingConfig()`);
    console.log(`   - Register campaigns: registerCampaign("campaign_id")`);
    console.log(`   - Test tipping functionality`);
    console.log('3. Configure tipping parameters if needed');
    console.log('4. Register campaigns for tipping');
    console.log('');

    // Network-specific explorer links
    const explorerUrl = `${config.explorerUrl}/address/${receipt.contractAddress}`;
    
    console.log(`🌐 View on Explorer: ${explorerUrl}`);
    console.log('='.repeat(60));

    return receipt.contractAddress;

  } catch (error) {
    console.error('');
    console.error('❌ Error deploying contract:');
    console.error('='.repeat(60));
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      
      // Common error handling
      if (error.message.includes('insufficient funds')) {
        console.error('');
        console.error('💡 Solution: Add more CELO to your account for gas fees');
        console.error(`   Your account: ${privateKeyToAccount(`0x${PRIVATE_KEY}`).address}`);
      } else if (error.message.includes('nonce')) {
        console.error('');
        console.error('💡 Solution: Wait a moment and try again (nonce issue)');
      } else if (error.message.includes('gas')) {
        console.error('');
        console.error('💡 Solution: The contract deployment requires more gas');
        console.error('   Try deploying with a higher gas limit');
      } else if (error.message.includes('revert')) {
        console.error('');
        console.error('💡 Solution: Contract deployment was reverted');
        console.error('   Check that all constructor parameters are valid');
        console.error('   Ensure the SovereignSeas contract address is correct');
      }
      
      if (process.env.DEBUG) {
        console.error('Stack trace:', error.stack);
      }
    }
    
    console.error('='.repeat(60));
    process.exit(1);
  }
}

// Display usage information
function displayUsage() {
  console.log('ProjectTipping Contract Deployment');
  console.log('');
  console.log('Usage:');
  console.log('  npm run deploy:tipping');
  console.log('');
  console.log('Network:');
  console.log('  celo       - Celo Mainnet (default)');
  console.log('');
  console.log('Environment Variables Required:');
  console.log('  PRIVATE_KEY                  - Deployer private key');
  console.log('  SOVEREIGN_SEAS_V4_ADDRESS    - SovereignSeas contract address');
  console.log('');
  console.log('Optional Environment Variables:');
  console.log('  CELO_MAINNET_RPC_URL         - Custom Celo mainnet RPC');
  console.log('  CELO_MAINNET_CUSD_ADDRESS    - Custom cUSD address (default: 0x765DE816845861e75A25fCA122bb6898B8B1282a)');
  console.log('');
  console.log('Note: CELO token and Mento broker addresses are');
  console.log('      automatically retrieved from the SovereignSeas contract');
  console.log('');
}

// Check if help was requested
if (args.includes('--help') || args.includes('-h')) {
  displayUsage();
  process.exit(0);
}

// Execute deployment
console.log('Starting ProjectTipping deployment...');
console.log(`Selected network: ${network}`);
console.log('');

deployProjectTipping();