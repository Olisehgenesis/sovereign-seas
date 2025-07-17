import { createWalletClient, http, parseEther, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';
import * as dotenv from 'dotenv';
import sovereignSeasGrantsAbi from '../../../artifacts/contracts/SovereignSeasGrants.sol/SovereignSeasGrants.json';
import { readFileSync } from 'fs';

dotenv.config();

// Read configuration from environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS; // Main contract address

// Validate environment variables
if (!PRIVATE_KEY) {
  console.error('Error: PRIVATE_KEY environment variable is required');
  process.exit(1);
}

if (!SOVEREIGN_SEAS_V4_ADDRESS) {
  console.error('Error: SOVEREIGN_SEAS_V4_ADDRESS environment variable is required');
  console.error('Please deploy SovereignSeasV4 contract first and add its address to .env file');
  process.exit(1);
}

// Read contract bytecode from file
let contractBytecode: string;
try {
  contractBytecode = sovereignSeasGrantsAbi.bytecode;
  // Ensure bytecode starts with '0x'
  if (!contractBytecode.startsWith('0x')) {
    contractBytecode = '0x' + contractBytecode;
  }
} catch (error) {
  console.error('Error reading contract bytecode file:', error);
  console.error('Please make sure your SovereignSeasGrants contract is compiled and the bytecode file exists');
  process.exit(1);
}

async function deploySovereignSeasGrants() {
  try {
    console.log('Deploying SovereignSeasGrants contract...');
    
    // Create wallet client with private key
    const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
    const walletClient = createWalletClient({
      account,
      chain: celo,
      transport: http(RPC_URL)
    });
    
    const publicClient = createPublicClient({
      chain: celo,
      transport: http(RPC_URL)
    });
    
    console.log(`Using account: ${account.address}`);
    console.log(`SovereignSeas V4 contract address: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
    console.log(`Chain: Celo Alfajores Testnet`);
    console.log(`RPC URL: ${RPC_URL}`);
    
    let abi = sovereignSeasGrantsAbi.abi;
    // Check if ABI is valid
    if (!abi || typeof abi !== 'object') {
      throw new Error('Invalid ABI format');
    }

    // Check account balance
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`Account balance: ${balance} wei (${parseEther(balance.toString())} CELO)`);
    
    if (balance < parseEther('0.1')) {
      console.warn('Warning: Account balance is low. You might need more CELO for deployment.');
    }
    
    // Deploy contract with constructor arguments (SovereignSeas V4 contract address)
    console.log('Sending deployment transaction...');
    const hash = await walletClient.deployContract({
      abi: sovereignSeasGrantsAbi.abi,
      bytecode: contractBytecode as `0x${string}`,
      args: [
        SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`
      ]
    });
    
    console.log(`Deployment transaction hash: ${hash}`);
    console.log('Waiting for transaction confirmation...');
    
    // Wait for the transaction to be mined
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (!receipt.contractAddress) {
      throw new Error('Contract deployment failed - no contract address in receipt');
    }
    
    console.log('✅ SovereignSeasGrants contract deployed successfully!');
    console.log(`📍 Contract address: ${receipt.contractAddress}`);
    console.log(`⛽ Gas used: ${receipt.gasUsed}`);
    console.log(`🧾 Transaction hash: ${hash}`);
    console.log('');
    
    // Verify the deployment by calling a view function
    console.log('🔍 Verifying deployment...');
    try {
      const result = await publicClient.readContract({
        address: receipt.contractAddress,
        abi: sovereignSeasGrantsAbi.abi,
        functionName: 'getTotalGrantsCreated'
      });
      console.log(`✅ Verification successful! Total grants created: ${result}`);
    } catch (verifyError) {
      console.warn('⚠️  Deployment verification failed, but contract was deployed:', verifyError);
    }
    
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Add this address to your .env file as SOVEREIGN_SEAS_GRANTS_ADDRESS');
    console.log('2. Update your frontend to use the new grants contract');
    console.log('3. Test the contract functions on Alfajores testnet');
    console.log('');
    console.log(`Environment variable to add:`);
    console.log(`SOVEREIGN_SEAS_GRANTS_ADDRESS=${receipt.contractAddress}`);
    
    return receipt.contractAddress;
    
  } catch (error) {
    console.error('❌ Error deploying contract:', error);
    // Print more detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    // Common troubleshooting tips
    console.log('');
    console.log('🔧 Troubleshooting Tips:');
    console.log('1. Ensure you have enough CELO in your account for gas fees');
    console.log('2. Check that SOVEREIGN_SEAS_V4_ADDRESS is correct and the contract is deployed');
    console.log('3. Make sure your contract is compiled (run: npx hardhat compile)');
    console.log('4. Verify your PRIVATE_KEY is correct and has sufficient permissions');
    console.log('5. Check network connectivity to Celo Alfajores');
  }
}

// Execute deployment
deploySovereignSeasGrants();