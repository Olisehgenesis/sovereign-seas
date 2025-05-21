import { createWalletClient, http, parseEther, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import * as dotenv from 'dotenv';
import celoSwapperAbi  from '../artifacts/contracts/IBroker.sol/CeloSwapper.json';
import { readFileSync } from 'fs';

dotenv.config();

// Read configuration from environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
const BROKER_ADDRESS = process.env.BROKER_ADDRESS;
const EXCHANGE_PROVIDER = process.env.EXCHANGE_PROVIDER;
const EXCHANGE_ID = process.env.EXCHANGE_ID;

// Validate environment variables
if (!PRIVATE_KEY) {
  console.error('Error: PRIVATE_KEY environment variable is required');
  process.exit(1);
}

if (!BROKER_ADDRESS) {
  console.error('Error: BROKER_ADDRESS environment variable is required');
  process.exit(1);
}

if (!EXCHANGE_PROVIDER) {
  console.error('Error: EXCHANGE_PROVIDER environment variable is required');
  process.exit(1);
}

if (!EXCHANGE_ID) {
  console.error('Error: EXCHANGE_ID environment variable is required');
  process.exit(1);
}

// Read contract bytecode from file (assuming you have a compiled contract)
// Replace this with your actual path to the compiled contract bytecode
let contractBytecode: string;
try {
  contractBytecode = celoSwapperAbi.bytecode;
  // Ensure bytecode starts with '0x'
  if (!contractBytecode.startsWith('0x')) {
    contractBytecode = '0x' + contractBytecode;
  }
} catch (error) {
  console.error('Error reading contract bytecode file:', error);
  console.error('Please make sure your contract is compiled and the bytecode file exists');
  
  process.exit(1);
}

async function deployCeloSwapper() {
  try {
    console.log('Deploying CeloSwapper contract...');
    
    // Create wallet client with private key
    const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
    const walletClient = createWalletClient({
      account,
      chain: celoAlfajores,
      transport: http(RPC_URL)
    });
    
    const publicClient = createPublicClient({
      chain: celoAlfajores,
      transport: http(RPC_URL)
    });
    
    console.log(`Using account: ${account.address}`);
    console.log(`Broker address: ${BROKER_ADDRESS}`);
    console.log(`Exchange provider: ${EXCHANGE_PROVIDER}`);
    console.log(`Exchange ID: ${EXCHANGE_ID}`);

    let abi = celoSwapperAbi.abi;
    // Check if ABI is valid
    if (!abi || typeof abi !== 'object') {
      throw new Error('Invalid ABI format');
    }
    // Check if bytecode is valid
    console.log('abi:', abi);
    
    // Deploy contract
    console.log('Sending deployment transaction...');
    const hash = await walletClient.deployContract({
      abi: celoSwapperAbi.abi,

      bytecode: contractBytecode as `0x${string}`,
      args: [BROKER_ADDRESS as `0x${string}`, EXCHANGE_PROVIDER as `0x${string}`, EXCHANGE_ID as `0x${string}`]
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
    console.log('Add this address to your .env file as SWAPPER_ADDRESS to use it with the swap script.');
    
    return receipt.contractAddress;
    
  } catch (error) {
    console.error('Error deploying contract:', error);
  }
}

// Execute deployment
deployCeloSwapper();