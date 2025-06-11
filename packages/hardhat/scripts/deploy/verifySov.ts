import { createPublicClient, http } from 'viem';
import { celoAlfajores } from 'viem/chains';
import * as dotenv from 'dotenv';
import { run } from 'hardhat';

dotenv.config();

// Read configuration from environment variables
const RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
const CELO_TOKEN_ADDRESS = process.env.CELO_TOKEN_ADDRESS;
const MENTO_BROKER_ADDRESS = process.env.MENTO_BROKER_ADDRESS;
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS;

// Validate environment variables
if (!CELO_TOKEN_ADDRESS) {
  console.error('Error: CELO_TOKEN_ADDRESS environment variable is required');
  process.exit(1);
}

if (!MENTO_BROKER_ADDRESS) {
  console.error('Error: MENTO_BROKER_ADDRESS environment variable is required');
  process.exit(1);
}

if (!SOVEREIGN_SEAS_V4_ADDRESS) {
  console.error('Error: SOVEREIGN_SEAS_V4_ADDRESS environment variable is required');
  process.exit(1);
}

async function verifyContract() {
  try {
    console.log('Verifying SovereignSeasV4 contract...');
    console.log(`Contract address: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
    console.log(`CELO token address: ${CELO_TOKEN_ADDRESS}`);
    console.log(`Mento broker address: ${MENTO_BROKER_ADDRESS}`);

    await run('verify:verify', {
      address: SOVEREIGN_SEAS_V4_ADDRESS,
      constructorArguments: [
        CELO_TOKEN_ADDRESS,
        MENTO_BROKER_ADDRESS
      ],
    });

    console.log('Contract verified successfully!');
  } catch (error) {
    console.error('Error verifying contract:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Execute verification
verifyContract(); 