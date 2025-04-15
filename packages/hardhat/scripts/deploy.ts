import { createWalletClient, http, parseEther, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import * as dotenv from 'dotenv';
import celoSwapperV3Abi from '../artifacts/contracts/swapVote.sol/CeloSwapperV3.json';
import { readFileSync } from 'fs';

dotenv.config();

// Read configuration from environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
const BROKER_ADDRESS = process.env.BROKER_ADDRESS;
const SOVEREIGN_SEAS_ADDRESS = process.env.SOVEREIGN_SEAS_ADDRESS || '0x7409a371c705d41a53E1d9F262b788B7C7e168D7';
const EXCHANGE_PROVIDER = process.env.EXCHANGE_PROVIDER;

// Initial tokens configuration - can be expanded with more tokens
const CUSD_ADDRESS = process.env.CUSD_ADDRESS || '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1'; // cUSD on Alfajores
const CUSD_EXCHANGE_ID = process.env.CUSD_EXCHANGE_ID || process.env.EXCHANGE_ID; // Use EXCHANGE_ID as fallback
const CUSD_MIN_AMOUNT = process.env.CUSD_MIN_AMOUNT || '1000000000000000000'; // Default 1 cUSD

// Optional additional tokens - can be configured via env variables
const CEUR_ADDRESS = process.env.CEUR_ADDRESS || '0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F'; // cEUR on Alfajores
const CEUR_EXCHANGE_ID = process.env.CEUR_EXCHANGE_ID;
const CEUR_MIN_AMOUNT = process.env.CEUR_MIN_AMOUNT || '1000000000000000000'; // Default 1 cEUR

// Initialize token arrays
const initialTokens: string[] = [CUSD_ADDRESS];
const initialExchangeIds: string[] = [CUSD_EXCHANGE_ID];
const initialMinAmounts: string[] = [CUSD_MIN_AMOUNT];

// Add cEUR if exchange ID is provided
if (CEUR_EXCHANGE_ID) {
  initialTokens.push(CEUR_ADDRESS);
  initialExchangeIds.push(CEUR_EXCHANGE_ID);
  initialMinAmounts.push(CEUR_MIN_AMOUNT);
}

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

if (!CUSD_EXCHANGE_ID) {
  console.error('Error: CUSD_EXCHANGE_ID or EXCHANGE_ID environment variable is required');
  process.exit(1);
}

// Read contract bytecode from file
let contractBytecode: string;
try {
  contractBytecode = celoSwapperV3Abi.bytecode;
  // Ensure bytecode starts with '0x'
  if (!contractBytecode.startsWith('0x')) {
    contractBytecode = '0x' + contractBytecode;
  }
} catch (error) {
  console.error('Error reading contract bytecode file:', error);
  console.error('Please make sure your contract is compiled and the bytecode file exists');
  process.exit(1);
}

async function deployCeloSwapperV3() {
  try {
    console.log('Deploying CeloSwapperV3 contract...');
    
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
    console.log(`SovereignSeas address: ${SOVEREIGN_SEAS_ADDRESS}`);
    console.log(`Exchange provider: ${EXCHANGE_PROVIDER}`);
    
    // Display initial tokens
    console.log("\nInitial Tokens Configuration:");
    for (let i = 0; i < initialTokens.length; i++) {
      console.log(`Token ${i+1}: ${initialTokens[i]}`);
      console.log(`  Exchange ID: ${initialExchangeIds[i]}`);
      console.log(`  Min Amount: ${initialMinAmounts[i]}`);
    }

    let abi = celoSwapperV3Abi.abi;
    // Check if ABI is valid
    if (!abi || typeof abi !== 'object') {
      throw new Error('Invalid ABI format');
    }
    
    // Convert string arrays to appropriate formats
    const exchangeIdsFormatted = initialExchangeIds.map(id => id as `0x${string}`);
    const minAmountsFormatted = initialMinAmounts.map(amount => BigInt(amount));
    
    // Deploy contract
    console.log('\nSending deployment transaction...');
    const hash = await walletClient.deployContract({
      abi: celoSwapperV3Abi.abi,
      bytecode: contractBytecode as `0x${string}`,
      args: [
        BROKER_ADDRESS as `0x${string}`,
        SOVEREIGN_SEAS_ADDRESS as `0x${string}`,
        EXCHANGE_PROVIDER as `0x${string}`,
        initialTokens.map(addr => addr as `0x${string}`),
        exchangeIdsFormatted,
        minAmountsFormatted
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
    console.log('Add this address to your .env file as SWAPPER_V3_ADDRESS to use it with the swap script.');
    
    return receipt.contractAddress;
    
  } catch (error) {
    console.error('Error deploying contract:', error);
    if (error.message) console.error('Error details:', error.message);
    if (error.cause) console.error('Error cause:', error.cause);
  }
}

// Execute deployment
deployCeloSwapperV3();