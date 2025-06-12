import { createPublicClient, http } from 'viem';
import { celoAlfajores } from 'viem/chains';
import * as dotenv from 'dotenv';
import { run } from 'hardhat';

dotenv.config();

// Read configuration from environment variables
const RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS;
const SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS = process.env.SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS;

// Validate environment variables
if (!SOVEREIGN_SEAS_V4_ADDRESS) {
  console.error('Error: SOVEREIGN_SEAS_V4_ADDRESS environment variable is required');
  console.error('This is the main SovereignSeas contract address used in constructor');
  process.exit(1);
}

if (!SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS) {
  console.error('Error: SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS environment variable is required');
  console.error('This is the address of the deployed VerificationVoting contract to verify');
  process.exit(1);
}

async function verifyVerificationVotingContract() {
  try {
    console.log('🔍 Verifying SovereignSeasVerificationVoting contract...');
    console.log(`📍 Contract address: ${SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS}`);
    console.log(`🔗 SovereignSeas main contract: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
    console.log('');

    // Create public client to check if contract exists
    const publicClient = createPublicClient({
      chain: celoAlfajores,
      transport: http(RPC_URL)
    });

    // Verify the contract exists at the given address
    const bytecode = await publicClient.getBytecode({
      address: SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS as `0x${string}`
    });

    if (!bytecode || bytecode === '0x') {
      console.error('❌ No contract found at the specified address');
      console.error('Please make sure the contract is deployed and the address is correct');
      process.exit(1);
    }

    console.log('✅ Contract found at address, proceeding with verification...');
    console.log('');

    // Verify the contract with Hardhat
    await run('verify:verify', {
      address: SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS,
      constructorArguments: [
        SOVEREIGN_SEAS_V4_ADDRESS
      ],
    });

    console.log('');
    console.log('🎉 Contract verified successfully!');
    console.log(`🔗 View on Celo Explorer: https://explorer.celo.org/alfajores/address/${SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS}`);
    console.log('');
    console.log('📋 Constructor arguments used:');
    console.log(`   sovereignSeas: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
    
  } catch (error) {
    console.error('❌ Error verifying contract:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      
      // Check for common verification errors
      if (error.message.includes('Already Verified')) {
        console.log('ℹ️  This contract is already verified!');
        console.log(`🔗 View on Celo Explorer: https://explorer.celo.org/alfajores/address/${SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS}`);
      } else if (error.message.includes('Constructor arguments')) {
        console.error('');
        console.error('💡 Troubleshooting tips:');
        console.error('1. Make sure SOVEREIGN_SEAS_V4_ADDRESS is correct');
        console.error('2. Verify the main SovereignSeas contract is deployed');
        console.error('3. Check that the constructor arguments match deployment');
      } else if (error.message.includes('Contract source code')) {
        console.error('');
        console.error('💡 Troubleshooting tips:');
        console.error('1. Make sure the contract is compiled');
        console.error('2. Check that the source code matches exactly');
        console.error('3. Ensure Solidity version matches');
      }
    }
  }
}

// Execute verification
verifyVerificationVotingContract();