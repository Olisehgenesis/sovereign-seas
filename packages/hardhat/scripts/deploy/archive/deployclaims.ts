import { createWalletClient, http, parseEther, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo, celoAlfajores } from 'viem/chains';
import * as dotenv from 'dotenv';
import sovereignSeasVerificationVotingAbi from '../../../artifacts/contracts/SovereignSeasVerificationVoting.sol/SovereignSeasVerificationVoting.json';
import { readFileSync } from 'fs';

dotenv.config();

// Read configuration from environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const testnetmode = process.env.TESTNET_ENV_MODE;


if (testnetmode === 'true') {
  console.log('Testnet mode is enabled');
} else {
  console.log('Testnet mode is disabled');
}


const RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
const SOVEREIGN_SEAS_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS; // The main SovereignSeas contract

// Validate environment variables
if (!PRIVATE_KEY) {
  console.error('Error: PRIVATE_KEY environment variable is required');
  process.exit(1);
}

if (!SOVEREIGN_SEAS_ADDRESS) {
  console.error('Error: SOVEREIGN_SEAS_V4_ADDRESS environment variable is required');
  console.error('Please deploy the main SovereignSeas contract first');
  process.exit(1);
}

// Read contract bytecode from file
let contractBytecode: string;
try {
  contractBytecode = sovereignSeasVerificationVotingAbi.bytecode;
  // Ensure bytecode starts with '0x'
  if (!contractBytecode.startsWith('0x')) {
    contractBytecode = '0x' + contractBytecode;
  }
} catch (error) {
  console.error('Error reading contract bytecode file:', error);
  console.error('Please make sure your contract is compiled and the bytecode file exists');
  process.exit(1);
}

async function deploySovereignSeasVerificationVoting() {
  try {
    console.log('Deploying SovereignSeasVerificationVoting contract...');
    
    // Create wallet client with private key
    const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
    const walletClient = createWalletClient({
      account,
      chain: testnetmode === 'true' ? celoAlfajores : celo,
      transport: http(RPC_URL)
    });
    
    const publicClient = createPublicClient({
      chain: testnetmode === 'true' ? celoAlfajores : celo ,
      transport: http(RPC_URL)
    });
    
    console.log(`Using account: ${account.address}`);
    console.log(`SovereignSeas main contract: ${SOVEREIGN_SEAS_ADDRESS}`);
    
    let abi = sovereignSeasVerificationVotingAbi.abi;
    // Check if ABI is valid
    if (!abi || typeof abi !== 'object') {
      throw new Error('Invalid ABI format');
    }

    // Check account balance
    const balance = await publicClient.getBalance({ 
      address: account.address 
    });
    console.log(`Account balance: ${balance} wei (${parseFloat(balance.toString()) / 1e18} CELO)`);
    
    if (balance < parseEther('0.01')) {
      console.warn('Warning: Low account balance. Make sure you have enough CELO for deployment gas costs.');
    }
    
    // Deploy contract with constructor arguments (only SovereignSeas address)
    console.log('Sending deployment transaction...');
    const hash = await walletClient.deployContract({
      abi: sovereignSeasVerificationVotingAbi.abi,
      bytecode: contractBytecode as `0x${string}`,
      args: [
        SOVEREIGN_SEAS_ADDRESS as `0x${string}`
      ]
    });
    
    console.log(`Deployment transaction hash: ${hash}`);
    console.log('Waiting for transaction confirmation...');
    
    // Wait for the transaction to be mined
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (!receipt.contractAddress) {
      throw new Error('Contract deployment failed - no contract address in receipt');
    }
    
    console.log('✅ Contract deployed successfully!');
    console.log(`📍 Contract address: ${receipt.contractAddress}`);
    console.log(`⛽ Gas used: ${receipt.gasUsed}`);
    console.log(`🔗 Transaction hash: ${receipt.transactionHash}`);
    console.log('');
    console.log('📝 Add this to your .env file:');
    console.log(`SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS=${receipt.contractAddress}`);
    console.log('');
    console.log('🔧 Next steps:');
    console.log('1. Add authorized admins using addAuthorizedAdmin()');
    console.log('2. Fund the contract with CELO for voting');
    console.log('3. Set campaign-specific vote amounts if needed');
    console.log('4. Start creating claims and votes!');
    
    return receipt.contractAddress;
    
  } catch (error) {
    console.error('❌ Error deploying contract:', error);
    // Print more detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Execute deployment
deploySovereignSeasVerificationVoting();