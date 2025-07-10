import { createWalletClient, http, parseEther, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo, celoAlfajores } from 'viem/chains';
import * as dotenv from 'dotenv';
import sovereignSeasNFTAbi from '../../artifacts/contracts/SovereignSeasNFT.sol/SovereignSeasNFT.json';
import { readFileSync } from 'fs';

dotenv.config();

// Read configuration from environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const networkArg = process.argv.find(arg => arg.startsWith('--network='));
const NETWORK = networkArg ? networkArg.split('=')[1] : (process.env.NETWORK || 'celo');
const IS_ALFAJORES = NETWORK === 'alfajores';
const CHAIN = IS_ALFAJORES ? celoAlfajores : celo;
const DEFAULT_RPC = IS_ALFAJORES ? 'https://alfajores-forno.celo-testnet.org' : 'https://rpc.ankr.com/celo';
const RPC_URL = process.env.CELO_RPC_URL || DEFAULT_RPC;
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS;

// NFT Contract Configuration
const NFT_NAME = process.env.NFT_NAME || "Sovereign Seas NFT";
const NFT_SYMBOL = process.env.NFT_SYMBOL || "SSNFT";

// Validate environment variables
if (!PRIVATE_KEY) {
  console.error('Error: PRIVATE_KEY environment variable is required');
  process.exit(1);
}

if (!SOVEREIGN_SEAS_V4_ADDRESS) {
  console.error('Error: SOVEREIGN_SEAS_V4_ADDRESS environment variable is required');
  console.error('Please deploy SovereignSeasV4 first and add its address to your .env file');
  process.exit(1);
}

// Read contract bytecode from file
let contractBytecode: string;
try {
  contractBytecode = sovereignSeasNFTAbi.bytecode;
  // Ensure bytecode starts with '0x'
  if (!contractBytecode.startsWith('0x')) {
    contractBytecode = '0x' + contractBytecode;
  }
} catch (error) {
  console.error('Error reading contract bytecode file:', error);
  console.error('Please make sure your contract is compiled and the bytecode file exists');
  process.exit(1);
}

async function deploySovereignSeasNFT() {
  try {
    console.log(`Deploying SovereignSeasNFT contract to ${IS_ALFAJORES ? 'Celo Alfajores Testnet' : 'Celo Mainnet'}...`);
    
    // Create wallet client with private key
    const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
    const walletClient = createWalletClient({
      account,
      chain: CHAIN,
      transport: http(RPC_URL)
    });
    
    const publicClient = createPublicClient({
      chain: CHAIN,
      transport: http(RPC_URL)
    });
    
    console.log(`Using account: ${account.address}`);
    console.log(`SovereignSeasV4 address: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
    console.log(`NFT Name: ${NFT_NAME}`);
    console.log(`NFT Symbol: ${NFT_SYMBOL}`);
    console.log(`Network: ${IS_ALFAJORES ? 'Celo Alfajores Testnet' : 'Celo Mainnet'}`);
    
    let abi = sovereignSeasNFTAbi.abi;
    // Check if ABI is valid
    if (!abi || typeof abi !== 'object') {
      throw new Error('Invalid ABI format');
    }

    // Check if bytecode is valid
    if (!contractBytecode || contractBytecode === '0x') {
      throw new Error('Invalid bytecode - contract may not be compiled');
    }
    
    // Deploy contract with constructor arguments
    console.log('Sending deployment transaction...');
    const hash = await walletClient.deployContract({
      abi: sovereignSeasNFTAbi.abi,
      bytecode: contractBytecode as `0x${string}`,
      args: [
        SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`, 
        NFT_NAME,
        NFT_SYMBOL
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
    console.log('=== Deployment Summary ===');
    console.log(`Network: ${IS_ALFAJORES ? 'Celo Alfajores Testnet' : 'Celo Mainnet'}`);
    console.log(`Contract: SovereignSeasNFT`);
    console.log(`Address: ${receipt.contractAddress}`);
    console.log(`Transaction Hash: ${hash}`);
    console.log(`Block Number: ${receipt.blockNumber}`);
    console.log('');
    console.log('Add this address to your .env file as SOVEREIGN_SEAS_NFT_ADDRESS to use it with your application.');
    console.log('');
    console.log('=== Next Steps ===');
    console.log('1. Add SOVEREIGN_SEAS_NFT_ADDRESS to your .env file');
    console.log(`2. Run verification script: pnpm ${IS_ALFAJORES ? 'verify:test' : 'verify:nft:celo'}`);
    console.log('3. Test minting functions');
    console.log(`4. View on CeloScan: https://${IS_ALFAJORES ? 'alfajores.' : ''}celoscan.io/address/${receipt.contractAddress}`);
    
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
deploySovereignSeasNFT(); 