import { createWalletClient, formatEther, http, parseUnits, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import * as dotenv from 'dotenv';

import erc20Abi  from './abi/erc20.json';
import celoSwapperABI  from '../artifacts/contracts/IBroker.sol/CeloSwapper.json';

dotenv.config();

// Configuration
const ALFAJORES_RPC = 'https://alfajores-forno.celo-testnet.org';
const CUSD_ADDRESS = '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1'; // cUSD on Alfajores
const SWAP_AMOUNT = 2; // 2 cUSD
const SLIPPAGE = 0.05; // 5% slippage tolerance

// Get configuration from environment variables
const SWAPPER_ADDRESS = process.env.SWAPPER_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.CELO_RPC_URL || ALFAJORES_RPC;

const celoSwapperAbi = celoSwapperABI.abi;


if (!SWAPPER_ADDRESS) {
  console.error('Error: SWAPPER_ADDRESS environment variable is required');
  process.exit(1);
}

if (!PRIVATE_KEY) {
  console.error('Error: PRIVATE_KEY environment variable is required');
  process.exit(1);
}

async function swapCusdToCelo() {
  try {
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
    console.log(`SwapperContract: ${SWAPPER_ADDRESS}`);
    console.log(`Swapping ${SWAP_AMOUNT} cUSD to CELO...`);
    
    // Get cUSD decimals
    const cusdDecimals = await publicClient.readContract({
      address: CUSD_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: 'decimals'
    });
    
    // Convert amount to wei based on decimals
    const cusdAmount = parseUnits(
      SWAP_AMOUNT.toString(),
      cusdDecimals as number
    );
    
    // Get expected CELO amount
    const expectedCeloAmount = await publicClient.readContract({
      address: SWAPPER_ADDRESS as `0x${string}`,
      abi: celoSwapperAbi,
      functionName: 'getExpectedCeloAmount',
      args: [cusdAmount]
    });
    
    // Calculate minimum amount with slippage
    const minCeloAmount = BigInt(
      Number(expectedCeloAmount) * (1 - SLIPPAGE)
    );
    
    console.log(`Expected CELO: ${formatEther(expectedCeloAmount)}`);
    console.log(`Min CELO (with ${SLIPPAGE * 100}% slippage): ${formatEther(minCeloAmount)}`);
    
    // Approve cUSD spend
    console.log('Approving cUSD...');
    const approveTxHash = await walletClient.writeContract({
      address: CUSD_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: 'approve',
      args: [SWAPPER_ADDRESS as `0x${string}`, cusdAmount]
    });
    
    console.log(`Approval transaction hash: ${approveTxHash}`);
    console.log('Waiting for approval transaction confirmation...');
    
    // Wait for the approval transaction to be mined
    await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
    console.log('Approval confirmed!');
    
    // Execute swap
    console.log('Executing swap...');
    const swapTxHash = await walletClient.writeContract({
      address: SWAPPER_ADDRESS as `0x${string}`,
      abi: celoSwapperAbi,
      functionName: 'swapCusdToCelo',
      args: [cusdAmount, minCeloAmount]
    });
    
    console.log(`Swap transaction hash: ${swapTxHash}`);
    console.log('Waiting for swap transaction confirmation...');
    
    // Wait for the swap transaction to be mined
    const receipt = await publicClient.waitForTransactionReceipt({ hash: swapTxHash });
    
    console.log('Swap successful!');
    
    // Parse logs to find the SwappedCusdToCelo event
    // Note: This is a simplified approach and may need adjustment based on your contract's events
    const swapEvents = receipt.logs.map(log => {
      try {
        return publicClient.decodeEventLog({
          abi: celoSwapperAbi,
          data: log.data,
          topics: log.topics,
        });
      } catch (e) {
        return null;
      }
    }).filter(event => event && event.eventName === 'SwappedCusdToCelo');
    
    if (swapEvents.length > 0) {
      const celoReceived = swapEvents[0].args.celoReceived;
      console.log(`CELO received: ${formatEther(celoReceived)}`);
    } else {
      console.log("Transaction succeeded but couldn't find CELO amount in events");
    }
    
  } catch (error) {
    console.error('Error executing swap:', error);
  }
}

// Execute the swap
swapCusdToCelo();