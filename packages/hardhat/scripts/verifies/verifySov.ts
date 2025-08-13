import { createPublicClient, http } from 'viem';
import { celoAlfajores, celo } from 'viem/chains';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();

// Read configuration from environment variables
const RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
const CELO_TOKEN_ADDRESS = process.env.CELO_TOKEN_ADDRESS;
const MENTO_BROKER_ADDRESS = process.env.MENTO_BROKER_ADDRESS;
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS;

// Get network from command line arguments (supports "--network <name>" or positional)
const args = process.argv.slice(2);
let network = 'alfajores';
const networkFlagIndex = args.findIndex(arg => arg === '--network' || arg === '-n');
if (networkFlagIndex !== -1 && args[networkFlagIndex + 1]) {
  network = args[networkFlagIndex + 1];
} else if (args[0]) {
  network = args[0];
}

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
    console.log(`Verifying SovereignSeasV4 contract on ${network} network...`);
    console.log(`Contract address: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
    console.log(`CELO token address: ${CELO_TOKEN_ADDRESS}`);
    console.log(`Mento broker address: ${MENTO_BROKER_ADDRESS}`);

    // Use hardhat CLI directly with the correct network
    const command = `npx hardhat verify --network ${network} ${SOVEREIGN_SEAS_V4_ADDRESS} "${CELO_TOKEN_ADDRESS}" "${MENTO_BROKER_ADDRESS}"`;
    console.log(`Executing: ${command}`);
    
    execSync(command, { stdio: 'inherit' });

    console.log('Contract verified successfully!');
  } catch (error) {
    console.error('Error verifying contract:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
  }
}

// Execute verification
verifyContract(); 