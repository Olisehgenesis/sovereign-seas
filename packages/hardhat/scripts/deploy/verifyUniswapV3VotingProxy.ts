import { createPublicClient, http } from 'viem';
import { celoAlfajores, celo } from 'viem/chains';
import * as dotenv from 'dotenv';
import { run } from 'hardhat';

dotenv.config();

// Read configuration from environment variables
const RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
const UNISWAP_V3_ROUTER_ADDRESS = process.env.UNISWAP_V3_ROUTER_ADDRESS;
const UNISWAP_V3_QUOTER_ADDRESS = process.env.UNISWAP_V3_QUOTER_ADDRESS;
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS;
const CELO_TOKEN_ADDRESS = process.env.CELO_TOKEN_ADDRESS;
const WETH9_ADDRESS = process.env.WETH9_ADDRESS;
const UNISWAP_V3_VOTING_PROXY_ADDRESS = process.env.UNISWAP_V3_VOTING_PROXY_ADDRESS;

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

if (!SOVEREIGN_SEAS_V4_ADDRESS) {
  console.error('Error: SOVEREIGN_SEAS_V4_ADDRESS environment variable is required');
  process.exit(1);
}

if (!CELO_TOKEN_ADDRESS) {
  console.error('Error: CELO_TOKEN_ADDRESS environment variable is required');
  process.exit(1);
}

if (!WETH9_ADDRESS) {
  console.error('Error: WETH9_ADDRESS environment variable is required');
  process.exit(1);
}

if (!UNISWAP_V3_VOTING_PROXY_ADDRESS) {
  console.error('Error: UNISWAP_V3_VOTING_PROXY_ADDRESS environment variable is required');
  process.exit(1);
}

async function verifyContract() {
  try {
    console.log('Verifying UniswapV3VotingProxy contract...');
    console.log(`Network: ${isMainnet ? 'Celo Mainnet' : 'Alfajores Testnet'}`);
    console.log(`Contract address: ${UNISWAP_V3_VOTING_PROXY_ADDRESS}`);
    console.log(`Uniswap V3 Router address: ${UNISWAP_V3_ROUTER_ADDRESS}`);
    console.log(`Uniswap V3 Quoter address: ${UNISWAP_V3_QUOTER_ADDRESS}`);
    console.log(`SovereignSeas V4 address: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
    console.log(`CELO token address: ${CELO_TOKEN_ADDRESS}`);
    console.log(`WETH9 address: ${WETH9_ADDRESS}`);

    await run('verify:verify', {
      address: UNISWAP_V3_VOTING_PROXY_ADDRESS,
      constructorArguments: [
        UNISWAP_V3_ROUTER_ADDRESS,
        UNISWAP_V3_QUOTER_ADDRESS,
        SOVEREIGN_SEAS_V4_ADDRESS,
        CELO_TOKEN_ADDRESS,
        WETH9_ADDRESS
      ],
    });

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