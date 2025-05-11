import { createWalletClient, http, createPublicClient, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo, celoAlfajores } from 'viem/chains';
import * as dotenv from 'dotenv';
import celoSwapperV3Abi from '../artifacts/contracts/swapVote.sol/CeloSwapperV3.json';

dotenv.config();

// Environment configuration with defaults
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const USE_TESTNET = process.env.USE_TESTNET === 'true' || false; // Default to testnet for safety
const RPC_URL = process.env.CELO_RPC_URL || (USE_TESTNET 
  ? 'https://alfajores-forno.celo-testnet.org' 
  : 'https://rpc.ankr.com/celo');

// Contract parameters
const BROKER_ADDRESS = process.env.BROKER_ADDRESS;
const SOVEREIGN_SEAS_ADDRESS = process.env.SOVEREIGN_SEAS_ADDRESS || '0x7409a371c705d41a53E1d9F262b788B7C7e168D7';
const EXCHANGE_PROVIDER = process.env.EXCHANGE_PROVIDER;

// Initial tokens configuration
const CUSD_ADDRESS = process.env.CUSD_ADDRESS || '0x765DE816845861e75A25fCA122bb6898B8B1282a'; // cUSD on Alfajores
const CUSD_EXCHANGE_ID = process.env.CUSD_EXCHANGE_ID || process.env.EXCHANGE_ID; // Use EXCHANGE_ID as fallback
const CUSD_MIN_AMOUNT = process.env.CUSD_MIN_AMOUNT || '1000000000000000000'; // Default 1 cUSD

// Optional additional tokens
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

// Validate required environment variables
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

async function deployCeloSwapperV3() {
  try {
    console.log('Deploying CeloSwapperV3 contract...');
    console.log(`Using ${USE_TESTNET ? 'Alfajores Testnet' : 'Celo Mainnet'}`);
    console.log(`RPC URL: ${RPC_URL}`);
    
    // Setup wallet and public clients
    const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
    const chain = USE_TESTNET ? celoAlfajores : celo;
    
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(RPC_URL)
    });
    
    const publicClient = createPublicClient({
      chain,
      transport: http(RPC_URL)
    });
    
    // Check account balance
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`Account: ${account.address}`);
    console.log(`Balance: ${formatEther(balance)} CELO`);
    
    if (balance < BigInt(1e16)) { // Less than 0.01 CELO
      console.error('Warning: Account balance is very low, deployment might fail');
    }
    
    // Log contract parameters
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

    // Read contract bytecode
    let contractBytecode = celoSwapperV3Abi.bytecode;
    if (!contractBytecode.startsWith('0x')) {
      contractBytecode = '0x' + contractBytecode;
    }

    // Format constructor arguments
    const tokensFormatted = initialTokens.map(addr => addr as `0x${string}`);
    const exchangeIdsFormatted = initialExchangeIds.map(id => id as `0x${string}`);
    const minAmountsFormatted = initialMinAmounts.map(amount => BigInt(amount));
    
    // Deploy contract with explicit gas limit (no estimation)
    console.log('\nSending deployment transaction...');
    const deploymentTx = await walletClient.deployContract({
      abi: celoSwapperV3Abi.abi,
      bytecode: contractBytecode as `0x${string}`,
      args: [
        BROKER_ADDRESS as `0x${string}`,
        SOVEREIGN_SEAS_ADDRESS as `0x${string}`,
        EXCHANGE_PROVIDER as `0x${string}`,
        tokensFormatted,
        exchangeIdsFormatted,
        minAmountsFormatted
      ],
     
    });
    
    console.log(`Deployment transaction hash: ${deploymentTx}`);
    console.log('Waiting for transaction confirmation...');
    
    // Wait for the transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash: deploymentTx,
      timeout: 120_000 // 2 minutes timeout
    });
    
    if (!receipt.contractAddress) {
      throw new Error('Contract deployment failed - no contract address in receipt');
    }
    
    console.log('\nContract deployed successfully!');
    console.log(`Contract address: ${receipt.contractAddress}`);
    console.log(`Gas used: ${receipt.gasUsed}`);
    console.log('');
    console.log('Next Steps:');
    console.log('1. Add this address to your .env file as SWAPPER_V3_ADDRESS');
    console.log('2. Run the swap script to test functionality');
    
    return receipt.contractAddress;
    
  } catch (error) {
    console.error('\nError deploying contract:');
    console.error(error.message || error);
    
    if (error.shortMessage) {
      console.error('\nError summary:', error.shortMessage);
    }
    
    if (error.cause) {
      console.error('\nError cause:', error.cause.message || error.cause);
    }
    
    console.log('\nDeployment Debugging Tips:');
    console.log('1. Check all address formats (must be valid 0x addresses)');
    console.log('2. Verify exchange IDs format (must be 0x + 64 hex chars)');
    console.log('3. Ensure you have enough CELO for deployment gas');
    console.log('4. Try deploying on Alfajores testnet first (set USE_TESTNET=true)');
    console.log('5. Check contract constructor for validation requirements');
  }
}

// Execute deployment
deployCeloSwapperV3().catch(console.error);