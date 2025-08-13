import { createWalletClient, http, parseEther, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores, celo } from 'viem/chains';
import * as dotenv from 'dotenv';
import sovereignSeasV4Abi from '../../../artifacts/contracts/SovereignSeasV4.sol/SovereignSeasV4.json';
import { readFileSync } from 'fs';

dotenv.config();

// Read configuration from environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
const CELO_TOKEN_ADDRESS = process.env.CELO_TOKEN_ADDRESS;
const MENTO_BROKER_ADDRESS = process.env.MENTO_BROKER_ADDRESS;

// Validate environment variables
if (!PRIVATE_KEY) {
  console.error('Error: PRIVATE_KEY environment variable is required');
  process.exit(1);
}

if (!CELO_TOKEN_ADDRESS) {
  console.error('Error: CELO_TOKEN_ADDRESS environment variable is required');
  process.exit(1);
}

if (!MENTO_BROKER_ADDRESS) {
  console.error('Error: MENTO_BROKER_ADDRESS environment variable is required');
  process.exit(1);
}

// Read contract bytecode from file
let contractBytecode: string;
try {
  contractBytecode = sovereignSeasV4Abi.bytecode;
  // Ensure bytecode starts with '0x'
  if (!contractBytecode.startsWith('0x')) {
    contractBytecode = '0x' + contractBytecode;
  }
} catch (error) {
  console.error('Error reading contract bytecode file:', error);
  console.error('Please make sure your contract is compiled and the bytecode file exists');
  process.exit(1);
}

async function deploySovereignSeasV4(network?: string) {
  try {
    // Determine the network and chain
    const isMainnet = network === 'celo' || network === 'mainnet';
    const chain = isMainnet ? celo : celoAlfajores;
    const rpcUrl = isMainnet ? (process.env.CELO_MAINNET_RPC_URL || 'https://rpc.ankr.com/celo') : RPC_URL;
    
    console.log(`Deploying SovereignSeasV4 contract to ${isMainnet ? 'Celo Mainnet' : 'Celo Alfajores Testnet'}...`);
    
    // Create wallet client with private key
    const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
    const walletClient = createWalletClient({
      account,
      chain: chain,
      transport: http(rpcUrl)
    });
    
    const publicClient = createPublicClient({
      chain: chain,
      transport: http(rpcUrl)
    });
    
    console.log(`Using account: ${account.address}`);
    console.log(`Network: ${isMainnet ? 'Celo Mainnet' : 'Celo Alfajores Testnet'}`);
    console.log(`RPC URL: ${rpcUrl}`);
    console.log(`CELO token address: ${CELO_TOKEN_ADDRESS}`);
    console.log(`Mento broker address: ${MENTO_BROKER_ADDRESS}`);
    
    let abi = sovereignSeasV4Abi.abi;
    // Check if ABI is valid
    if (!abi || typeof abi !== 'object') {
      throw new Error('Invalid ABI format');
    }

    // Check if bytecode is valid
   
    
    // Deploy contract with constructor arguments (CELO token address and Mento broker address)
    console.log('Sending deployment transaction...');
    const hash = await walletClient.deployContract({
      abi: sovereignSeasV4Abi.abi,
      bytecode: contractBytecode as `0x${string}`,
      args: [
        CELO_TOKEN_ADDRESS as `0x${string}`, 
        MENTO_BROKER_ADDRESS as `0x${string}`
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
    console.log('Add this address to your .env file as SOVEREIGN_SEAS_V4_ADDRESS to use it with your application.');
    
    return receipt.contractAddress;
    
  } catch (error) {
    console.error('Error deploying contract:', error);
    // Print more detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Execute deployment
// deploySovereignSeasV4();

// Export the function for use in other scripts
export async function deploySov(network?: string) {
  return await deploySovereignSeasV4(network);
}