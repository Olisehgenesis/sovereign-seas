import { createPublicClient, http } from 'viem';
import { celoAlfajores, celo } from 'viem/chains';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();

// Read configuration from environment variables
const RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
const UNISWAP_V3_ROUTER_ADDRESS = process.env.UNISWAP_V3_ROUTER_ADDRESS;
const UNISWAP_V3_QUOTER_ADDRESS = process.env.UNISWAP_V3_QUOTER_ADDRESS;
const UNISWAP_V3_FACTORY_ADDRESS = process.env.UNISWAP_V3_FACTORY_ADDRESS;
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS;
const CELO_TOKEN_ADDRESS = process.env.CELO_TOKEN_ADDRESS;
const ENHANCED_CELO_VOTING_PROXY_ADDRESS = process.env.ENHANCED_CELO_VOTING_PROXY_ADDRESS;

// Determine the network from command line arguments or environment
const args = process.argv.slice(2);
const isMainnet = args.includes('--network') && args[args.indexOf('--network') + 1] === 'celo' || 
                  RPC_URL.includes('rpc.ankr.com/celo') || 
                  process.env.NETWORK === 'celo';
const chain = isMainnet ? celo : celoAlfajores;

// Validate environment variables
if (!UNISWAP_V3_ROUTER_ADDRESS) {
  console.error('Error: UNISWAP_V3_ROUTER_ADDRESS environment variable is required');
  process.exit(1);
}

if (!UNISWAP_V3_QUOTER_ADDRESS) {
  console.error('Error: UNISWAP_V3_QUOTER_ADDRESS environment variable is required');
  process.exit(1);
}

if (!UNISWAP_V3_FACTORY_ADDRESS) {
  console.error('Error: UNISWAP_V3_FACTORY_ADDRESS environment variable is required');
  process.exit(1);
}

if (!SOVEREIGN_SEAS_V4_ADDRESS) {
  console.error('Error: SOVEREIGN_SEAS_V4_ADDRESS environment variable is required');
  process.exit(1);
}

if (!CELO_TOKEN_ADDRESS) {
  console.error('Error: CELO_TOKEN_ADDRESS environment variable is required');
  process.exit(1);
}

if (!ENHANCED_CELO_VOTING_PROXY_ADDRESS) {
  console.error('Error: ENHANCED_CELO_VOTING_PROXY_ADDRESS environment variable is required');
  process.exit(1);
}

async function verifyContract() {
  try {
    console.log('Verifying EnhancedCeloVotingProxy contract...');
    console.log(`Network: ${isMainnet ? 'Celo Mainnet' : 'Alfajores Testnet'}`);
    console.log(`Contract address: ${ENHANCED_CELO_VOTING_PROXY_ADDRESS}`);
    console.log(`Uniswap V3 Router address: ${UNISWAP_V3_ROUTER_ADDRESS}`);
    console.log(`Uniswap V3 Quoter address: ${UNISWAP_V3_QUOTER_ADDRESS}`);
    console.log(`Uniswap V3 Factory address: ${UNISWAP_V3_FACTORY_ADDRESS}`);
    console.log(`SovereignSeas V4 address: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
    console.log(`CELO token address: ${CELO_TOKEN_ADDRESS}`);

    // Build the hardhat verify command
    const targetNetwork = isMainnet ? 'celo' : 'alfajores';
    const constructorArgs = [
      UNISWAP_V3_ROUTER_ADDRESS,
      UNISWAP_V3_QUOTER_ADDRESS,
      UNISWAP_V3_FACTORY_ADDRESS,
      SOVEREIGN_SEAS_V4_ADDRESS,
      CELO_TOKEN_ADDRESS
    ];

    const command = `npx hardhat verify --network ${targetNetwork} ${ENHANCED_CELO_VOTING_PROXY_ADDRESS} ${constructorArgs.join(' ')}`;
    
    console.log(`Executing: ${command}`);
    
    // Execute the hardhat verify command
    execSync(command, { stdio: 'inherit' });

    console.log('Contract verified successfully!');
    console.log('');
    console.log('Contract is now verified on CeloScan and ready to use.');
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