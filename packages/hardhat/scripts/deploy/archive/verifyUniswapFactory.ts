import { createPublicClient, http } from 'viem';
import { celoAlfajores, celo } from 'viem/chains';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();

// Read configuration from environment variables
const RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
const WETH_ADDRESS = process.env.WETH_ADDRESS || '0x471EcE3750Da237f93B8E339c536989b8978a438';
const UNISWAP_FACTORY_ADDRESS = process.env.UNISWAP_FACTORY_ADDRESS;

// Determine the network from command line arguments or environment
const args = process.argv.slice(2);
const isMainnet = args.includes('--network') && args[args.indexOf('--network') + 1] === 'celo' || 
                  RPC_URL.includes('rpc.ankr.com/celo') || 
                  process.env.NETWORK === 'celo';
const chain = isMainnet ? celo : celoAlfajores;

// Validate environment variables
if (!UNISWAP_FACTORY_ADDRESS) {
  console.error('Error: UNISWAP_FACTORY_ADDRESS environment variable is required');
  process.exit(1);
}

async function verifyFactory() {
  try {
    console.log('Verifying Uniswap Factory contract...');
    console.log(`Network: ${isMainnet ? 'Celo Mainnet' : 'Alfajores Testnet'}`);
    console.log(`Factory address: ${UNISWAP_FACTORY_ADDRESS}`);
    console.log(`WETH/CELO address: ${WETH_ADDRESS}`);

    // Build the hardhat verify command
    const targetNetwork = isMainnet ? 'celo' : 'alfajores';
    const constructorArgs = [WETH_ADDRESS];

    const command = `npx hardhat verify --network ${targetNetwork} ${UNISWAP_FACTORY_ADDRESS} ${constructorArgs.join(' ')}`;
    
    console.log(`Executing: ${command}`);
    
    // Execute the hardhat verify command
    execSync(command, { stdio: 'inherit' });

    console.log('Factory contract verified successfully!');
    console.log('');
    console.log('Factory is now verified on CeloScan and ready to use.');
  } catch (error) {
    console.error('Error verifying factory:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Execute verification
verifyFactory(); 