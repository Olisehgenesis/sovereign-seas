import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores, celo } from 'viem/chains';
import * as dotenv from 'dotenv';
import ubeswapVotingProxyAbi from '../../../artifacts/contracts/UbeswapVotingProxy.sol/UbeswapVotingProxy.json';

dotenv.config();

// Read configuration from environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
const UBESWAP_V2_ROUTER_ADDRESS = process.env.UBESWAP_V2_ROUTER_ADDRESS;
const UBESWAP_V2_FACTORY_ADDRESS = process.env.UBESWAP_V2_FACTORY_ADDRESS;
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS;
const CELO_TOKEN_ADDRESS = process.env.CELO_TOKEN_ADDRESS;

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

if (!UBESWAP_V2_ROUTER_ADDRESS) {
  console.error('Error: UBESWAP_V2_ROUTER_ADDRESS environment variable is required');
  process.exit(1);
}

if (!UBESWAP_V2_FACTORY_ADDRESS) {
  console.error('Error: UBESWAP_V2_FACTORY_ADDRESS environment variable is required');
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
//whuck chain
console.log('chain', chain);
console.log('RPC_URL', RPC_URL);

// Create account and clients for balance check
const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
const publicClient = createPublicClient({
  chain: chain,
  transport: http(RPC_URL)
});

// Read contract bytecode from file
let contractBytecode: string;
try {
  contractBytecode = ubeswapVotingProxyAbi.bytecode;
  // Ensure bytecode starts with '0x'
  if (!contractBytecode.startsWith('0x')) {
    contractBytecode = '0x' + contractBytecode;
  }
} catch (error) {
  console.error('Error reading contract bytecode file:', error);
  console.error('Please make sure your contract is compiled and the bytecode file exists');
  process.exit(1);
}

async function deployUbeswapVotingProxy() {
  try {
    console.log('Deploying UbeswapVotingProxy contract...');
    
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
    console.log(`Ubeswap V2 Router address: ${UBESWAP_V2_ROUTER_ADDRESS}`);
    console.log(`Ubeswap V2 Factory address: ${UBESWAP_V2_FACTORY_ADDRESS}`);
    console.log(`SovereignSeas V4 address: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
    console.log(`CELO token address: ${CELO_TOKEN_ADDRESS}`);
    
    let abi = ubeswapVotingProxyAbi.abi;
    // Check if ABI is valid
    if (!abi || typeof abi !== 'object') {
      throw new Error('Invalid ABI format');
    }

    // Check if bytecode is valid
    if (!contractBytecode || contractBytecode === '0x') {
      throw new Error('Invalid bytecode');
    }
    
    // Deploy contract with constructor arguments
    console.log('Sending deployment transaction...');
    const hash = await walletClient.deployContract({
      abi: ubeswapVotingProxyAbi.abi,
      bytecode: contractBytecode as `0x${string}`,
      args: [
        UBESWAP_V2_ROUTER_ADDRESS as `0x${string}`,
        UBESWAP_V2_FACTORY_ADDRESS as `0x${string}`,
        SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
        CELO_TOKEN_ADDRESS as `0x${string}`
      ]
    });
    
    console.log(`Deployment transaction hash: ${hash}`);
    console.log('Waiting for transaction confirmation...');
    
    // Wait for the transaction to be mined
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (!receipt.contractAddress) {
      throw new Error('Contract deployment failed - no contract address in receipt');
    }
    
    console.log('Contract deployed successfully!');
    console.log(`Contract address: ${receipt.contractAddress}`);
    console.log('');
    console.log('Add this address to your .env file as UBESWAP_VOTING_PROXY_ADDRESS to use it with your application.');
    console.log('');
    console.log('Constructor arguments:');
    console.log(`- Ubeswap V2 Router: ${UBESWAP_V2_ROUTER_ADDRESS}`);
    console.log(`- Ubeswap V2 Factory: ${UBESWAP_V2_FACTORY_ADDRESS}`);
    console.log(`- SovereignSeas V4: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
    console.log(`- CELO Token: ${CELO_TOKEN_ADDRESS}`);
    
    return receipt.contractAddress;
    
  } catch (error) {
    // Print more detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    //   console.error('Stack trace:', error.stack);
    }
  }
}

// Execute deployment
deployUbeswapVotingProxy(); 