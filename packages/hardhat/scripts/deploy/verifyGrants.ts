import { createPublicClient, http } from 'viem';
import { celo } from 'viem/chains';
import * as dotenv from 'dotenv';
import { run } from 'hardhat';

dotenv.config();

// Read configuration from environment variables
const RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS;
const SOVEREIGN_SEAS_GRANTS_ADDRESS = process.env.SOVEREIGN_SEAS_GRANTS_ADDRESS;

// Validate environment variables
if (!SOVEREIGN_SEAS_V4_ADDRESS) {
  console.error('Error: SOVEREIGN_SEAS_V4_ADDRESS environment variable is required');
  console.error('This should be the address of your main SovereignSeas V4 contract');
  process.exit(1);
}

if (!SOVEREIGN_SEAS_GRANTS_ADDRESS) {
  console.error('Error: SOVEREIGN_SEAS_GRANTS_ADDRESS environment variable is required');
  console.error('This should be the address of your deployed SovereignSeas Grants contract');
  process.exit(1);
}

async function verifyGrantsContract() {
  try {
    console.log('🔍 Verifying SovereignSeasGrants contract...');
    console.log(`📍 Grants contract address: ${SOVEREIGN_SEAS_GRANTS_ADDRESS}`);
    console.log(`🔗 Main contract address: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
    console.log(`🌐 Network: Celo Alfajores Testnet`);
    console.log('');

    // Create public client to verify contract exists
    const publicClient = createPublicClient({
      chain: celo,
      transport: http(RPC_URL)
    });

    // Check if contract exists at the given address
    console.log('📋 Checking contract deployment...');
    const bytecode = await publicClient.getBytecode({ 
      address: SOVEREIGN_SEAS_GRANTS_ADDRESS as `0x${string}` 
    });
    
    if (!bytecode || bytecode === '0x') {
      throw new Error(`No contract found at address ${SOVEREIGN_SEAS_GRANTS_ADDRESS}`);
    }
    
    console.log('✅ Contract found at specified address');
    console.log('');

    // Verify the contract on the block explorer
    console.log('🚀 Starting verification process...');
    await run('verify:verify', {
      address: SOVEREIGN_SEAS_GRANTS_ADDRESS,
      constructorArguments: [
        SOVEREIGN_SEAS_V4_ADDRESS
      ],
      contract: "contracts/SovereignSeasGrants.sol:SovereignSeasGrants"
    });

    console.log('✅ SovereignSeasGrants contract verified successfully!');
    console.log('');
    console.log('🎉 Verification completed! Your contract is now verified on the block explorer.');
    console.log(`🔗 You can view it at: https://alfajores.celoscan.io/address/${SOVEREIGN_SEAS_GRANTS_ADDRESS}`);
    
  } catch (error) {
    console.error('❌ Error verifying contract:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      
      // Handle common verification errors
      if (error.message.includes('Already Verified')) {
        console.log('ℹ️  Contract is already verified on the block explorer');
      } else if (error.message.includes('does not have bytecode')) {
        console.error('🚨 Contract not found at the specified address. Please check:');
        console.error('1. The contract address is correct');
        console.error('2. The contract was successfully deployed');
        console.error('3. You are on the correct network (Alfajores)');
      } else if (error.message.includes('Compilation failed')) {
        console.error('🚨 Contract compilation failed. Please check:');
        console.error('1. Your contract compiles locally (npx hardhat compile)');
        console.error('2. All dependencies are properly installed');
        console.error('3. Contract source code matches deployed bytecode');
      }
    }
    
    console.log('');
    console.log('🔧 Troubleshooting Tips:');
    console.log('1. Ensure the contract was deployed successfully');
    console.log('2. Check that constructor arguments match deployment');
    console.log('3. Make sure you are on the correct network');
    console.log('4. Verify your hardhat.config.js has the correct API keys');
    console.log('5. Try running: npx hardhat clean && npx hardhat compile');
  }
}

// Also verify the main SovereignSeas contract if needed
async function verifyMainContract() {
  const CELO_TOKEN_ADDRESS = process.env.CELO_TOKEN_ADDRESS;
  const MENTO_BROKER_ADDRESS = process.env.MENTO_BROKER_ADDRESS;
  
  if (!CELO_TOKEN_ADDRESS || !MENTO_BROKER_ADDRESS) {
    console.log('ℹ️  Skipping main contract verification (missing CELO_TOKEN_ADDRESS or MENTO_BROKER_ADDRESS)');
    return;
  }
  
  try {
    console.log('🔍 Verifying main SovereignSeasV4 contract...');
    console.log(`📍 Contract address: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
    console.log(`🪙 CELO token address: ${CELO_TOKEN_ADDRESS}`);
    console.log(`🏦 Mento broker address: ${MENTO_BROKER_ADDRESS}`);

    await run('verify:verify', {
      address: SOVEREIGN_SEAS_V4_ADDRESS,
      constructorArguments: [
        CELO_TOKEN_ADDRESS,
        MENTO_BROKER_ADDRESS
      ],
      contract: "contracts/SovereignSeasV4.sol:SovereignSeasV4"
    });

    console.log('✅ SovereignSeasV4 contract verified successfully!');
  } catch (error) {
    console.log('ℹ️  Main contract verification skipped or failed:', error instanceof Error ? error.message : error);
  }
}

// Execute verification
async function main() {
  console.log('🚀 Starting contract verification process...');
  console.log('');
  
  // Verify main contract first (optional)
  await verifyMainContract();
  console.log('');
  
  // Verify grants contract
  await verifyGrantsContract();
}

main();