import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores, celo } from 'viem/chains';
import * as dotenv from 'dotenv';

dotenv.config();

// Read configuration from environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
const WETH_ADDRESS = process.env.WETH_ADDRESS || '0x471EcE3750Da237f93B8E339c536989b8978a438'; // CELO on Celo

// Determine the network from command line arguments or environment
const args = process.argv.slice(2);
const isMainnet = args.includes('--network') && args[args.indexOf('--network') + 1] === 'celo' || 
                  RPC_URL.includes('rpc.ankr.com/celo') || 
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
  transport: http(RPC_URL)
});

async function deployUniswapFactoryInternal() {
  try {
    console.log('Deploying Uniswap Factory contract...');
    
    // Check the wallet balance first
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`Account balance: ${balance} wei`);
    
    // Create wallet client with existing account
    const walletClient = createWalletClient({
      account,
      chain: chain,
      transport: http(RPC_URL)
    });
    
    console.log(`Using account: ${account.address}`);
    console.log(`Network: ${isMainnet ? 'Celo Mainnet' : 'Alfajores Testnet'}`);
    console.log(`WETH/CELO address: ${WETH_ADDRESS}`);
    
    // Note: This is a placeholder for Uniswap Factory deployment
    // You would need to implement the actual factory contract deployment
    console.log('Note: Uniswap Factory deployment script needs to be implemented');
    console.log('This would typically deploy Uniswap V2 Factory or V3 Factory');
    console.log('For production, you would use the official Uniswap factory addresses');
    
    // Example of what the deployment might look like:
    // const factoryAddress = await deployUniswapV2Factory(walletClient, WETH_ADDRESS);
    // console.log(`Factory deployed at: ${factoryAddress}`);
    
    return null;
    
  } catch (error) {
    console.error('Error deploying factory:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Execute deployment
// deployUniswapFactory();

// Export the function for use in other scripts
export async function deployUniswapFactory(network?: string) {
  return await deployUniswapFactoryInternal();
} 