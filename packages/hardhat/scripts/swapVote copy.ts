import { createWalletClient, formatEther, http, parseUnits, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import * as dotenv from 'dotenv';

import erc20Abi from './abi/erc20.json';
import celoSwapperV2Abi from '../artifacts/contracts/swapVote.sol/CeloSwapperV2.json';

dotenv.config();

// Configuration
const ALFAJORES_RPC = 'https://alfajores-forno.celo-testnet.org';
const CUSD_ADDRESS = '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1'; // cUSD on Alfajores
const SLIPPAGE = 0.005; // 0.5% slippage tolerance (50 basis points)

// Get configuration from environment variables
const SWAPPER_V2_ADDRESS = process.env.SWAPPER_V2_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.CELO_RPC_URL || ALFAJORES_RPC;
const CAMPAIGN_ID = process.env.CAMPAIGN_ID || '1';
const PROJECT_ID = process.env.PROJECT_ID || '1';
const SWAP_AMOUNT = process.env.CUSD_AMOUNT || '2'; // Default to 2 cUSD if not specified

// Validate required environment variables
if (!SWAPPER_V2_ADDRESS) {
  console.error('Error: SWAPPER_V2_ADDRESS environment variable is required');
  process.exit(1);
}

if (!PRIVATE_KEY) {
  console.error('Error: PRIVATE_KEY environment variable is required');
  process.exit(1);
}

async function swapAndVote() {
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
    console.log(`SwapperV2 Contract: ${SWAPPER_V2_ADDRESS}`);
    console.log(`Campaign ID: ${CAMPAIGN_ID}`);
    console.log(`Project ID: ${PROJECT_ID}`);
    console.log(`Swapping ${SWAP_AMOUNT} cUSD to CELO for voting...`);
    
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
    
    // Check cUSD balance
    const cusdBalance = await publicClient.readContract({
      address: CUSD_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address]
    });
    
    console.log(`cUSD Balance: ${formatEther(cusdBalance)} cUSD`);
    
    if (cusdBalance < cusdAmount) {
      console.error(`Error: Insufficient cUSD balance. You need at least ${SWAP_AMOUNT} cUSD.`);
      process.exit(1);
    }
    
    // Check allowance
    const allowance = await publicClient.readContract({
      address: CUSD_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [account.address, SWAPPER_V2_ADDRESS as `0x${string}`]
    });
    
    console.log(`Current cUSD allowance for swapper: ${formatEther(allowance)} cUSD`);
    
    // If allowance is insufficient, approve the swapper to spend cUSD
    if (allowance < cusdAmount) {
      console.log(`Approving swapper to spend ${SWAP_AMOUNT} cUSD...`);
      const approveTxHash = await walletClient.writeContract({
        address: CUSD_ADDRESS as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [SWAPPER_V2_ADDRESS as `0x${string}`, cusdAmount]
      });
      
      console.log(`Approval transaction hash: ${approveTxHash}`);
      console.log('Waiting for approval transaction confirmation...');
      
      await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
      console.log('Approval confirmed!');
    }
    
    // Get expected CELO amount
    const [expectedCelo, voteAmount] = await publicClient.readContract({
      address: SWAPPER_V2_ADDRESS as `0x${string}`,
      abi: celoSwapperV2Abi.abi,
      functionName: 'getExpectedVoteAmount',
      args: [cusdAmount]
    });
    
    console.log(`Expected CELO: ${formatEther(expectedCelo)} CELO`);
    console.log(`Amount to be used for voting: ${formatEther(voteAmount)} CELO`);
    
    // Calculate slippage in basis points (1/100 of a percent)
    const slippageBps = BigInt(Math.floor(SLIPPAGE * 10000));
    
    // Get minimum CELO amount with slippage protection
    const minCeloAmount = await publicClient.readContract({
      address: SWAPPER_V2_ADDRESS as `0x${string}`,
      abi: celoSwapperV2Abi.abi,
      functionName: 'calculateMinCeloAmount',
      args: [cusdAmount, slippageBps]
    });
    
    console.log(`Min CELO (with ${SLIPPAGE * 100}% slippage): ${formatEther(minCeloAmount)}`);
    
    // Execute swap and vote
    console.log('Executing swap and vote...');
    const swapAndVoteTxHash = await walletClient.writeContract({
      address: SWAPPER_V2_ADDRESS as `0x${string}`,
      abi: celoSwapperV2Abi.abi,
      functionName: 'swapAndVote',
      args: [BigInt(CAMPAIGN_ID), BigInt(PROJECT_ID), cusdAmount, minCeloAmount]
    });
    
    console.log(`Swap and vote transaction hash: ${swapAndVoteTxHash}`);
    console.log('Waiting for transaction confirmation...');
    
    // Wait for the transaction to be mined
    const receipt = await publicClient.waitForTransactionReceipt({ hash: swapAndVoteTxHash });
    
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Parse logs to find the SwappedAndVoted event
    const swapEvents = receipt.logs.map(log => {
      try {
        return publicClient.decodeEventLog({
          abi: celoSwapperV2Abi.abi,
          data: log.data,
          topics: log.topics,
        });
      } catch (e) {
        return null;
      }
    }).filter(event => event && event.eventName === 'SwappedAndVoted');
    
    if (swapEvents.length > 0) {
      const event = swapEvents[0];
      console.log('\nTransaction Successful!');
      console.log('--------------------------------------------------');
      console.log(`Successfully swapped ${SWAP_AMOUNT} cUSD for ${formatEther(event.args.celoVoted)} CELO`);
      console.log(`Voted for project ${PROJECT_ID} in campaign ${CAMPAIGN_ID}`);
      
      // Get updated user vote information
      const userCusdVotes = await publicClient.readContract({
        address: SWAPPER_V2_ADDRESS as `0x${string}`,
        abi: celoSwapperV2Abi.abi,
        functionName: 'getUserCusdVotes',
        args: [account.address, BigInt(CAMPAIGN_ID), BigInt(PROJECT_ID)]
      });
      
      console.log(`Total cUSD used for this project so far: ${formatEther(userCusdVotes)} cUSD`);
      console.log('--------------------------------------------------');
    } else {
      console.log("\nTransaction succeeded but couldn't find event data");
      
      // Even if we can't find the event, still show the updated votes
      const userCusdVotes = await publicClient.readContract({
        address: SWAPPER_V2_ADDRESS as `0x${string}`,
        abi: celoSwapperV2Abi.abi,
        functionName: 'getUserCusdVotes',
        args: [account.address, BigInt(CAMPAIGN_ID), BigInt(PROJECT_ID)]
      });
      
      console.log(`Total cUSD used for this project: ${formatEther(userCusdVotes)} cUSD`);
    }
    
  } catch (error) {
    console.error('Error in swap and vote operation:', error);
  }
}

// Execute the swap and vote
swapAndVote();