import { createWalletClient, formatEther, http, parseUnits, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';
import * as dotenv from 'dotenv';

import erc20Abi from './abi/erc20.json';
import celoSwapperV3Abi from '../artifacts/contracts/swapVote.sol/CeloSwapperV3.json';

dotenv.config();

// Configuration
const ALFAJORES_RPC = 'https://forno.celo-testnet.org';
const SLIPPAGE = 0.005; // 0.5% slippage tolerance (50 basis points)

// Get configuration from environment variables
const SWAPPER_V3_ADDRESS = process.env.newswapper;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.CELO_RPC_URL || ALFAJORES_RPC;
const CAMPAIGN_ID =2;
const PROJECT_ID = 6;
const TOKEN_ADDRESS = process.env.cUSD_ADDRESS ; // Default to cUSD
const TOKEN_AMOUNT = process.env.TOKEN_AMOUNT || '1'; // Default to 2 tokens

// Validate required environment variables
if (!SWAPPER_V3_ADDRESS) {
  console.error('Error: SWAPPER_V3_ADDRESS environment variable is required');
  process.exit(1);
}

if (!PRIVATE_KEY) {
  console.error('Error: PRIVATE_KEY environment variable is required');
  process.exit(1);
}

async function swapAndVoteToken() {
  try {
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
    console.log(`SwapperV3 Contract: ${SWAPPER_V3_ADDRESS}`);
    console.log(`Campaign ID: ${CAMPAIGN_ID}`);
    console.log(`Project ID: ${PROJECT_ID}`);
    console.log(`Token address: ${TOKEN_ADDRESS}`);
    console.log(`Token amount: ${TOKEN_AMOUNT}`);
    
    // Check if token is supported
    const isSupported = await publicClient.readContract({
      address: SWAPPER_V3_ADDRESS as `0x${string}`,
      abi: celoSwapperV3Abi.abi,
      functionName: 'isTokenSupported',
      args: [TOKEN_ADDRESS as `0x${string}`]
    });
    
    if (!isSupported) {
      console.error(`Error: Token ${TOKEN_ADDRESS} is not supported by the swapper contract`);
      
      // Get list of supported tokens for better error message
      const tokenCount = await publicClient.readContract({
        address: SWAPPER_V3_ADDRESS as `0x${string}`,
        abi: celoSwapperV3Abi.abi,
        functionName: 'getSupportedTokenCount'
      });
      
      console.log(`\nSupported tokens (${tokenCount}):`);
      for (let i = 0; i < Number(tokenCount); i++) {
        const tokenAddress = await publicClient.readContract({
          address: SWAPPER_V3_ADDRESS as `0x${string}`,
          abi: celoSwapperV3Abi.abi,
          functionName: 'supportedTokenList',
          args: [BigInt(i)]
        });
        console.log(`- ${tokenAddress}`);
      }
      
      process.exit(1);
    }
    
    // Get token decimals
    const tokenDecimals = await publicClient.readContract({
      address: TOKEN_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: 'decimals'
    });
    
    // Get token symbol
    let tokenSymbol;
    try {
      tokenSymbol = await publicClient.readContract({
        address: TOKEN_ADDRESS as `0x${string}`,
        abi: erc20Abi,
        functionName: 'symbol'
      });
    } catch (error) {
      tokenSymbol = 'Unknown';
    }
    
    // Convert amount to wei based on decimals
    const tokenAmount = parseUnits(
      TOKEN_AMOUNT.toString(),
      tokenDecimals as number
    );
    
    console.log(`Token symbol: ${tokenSymbol}`);
    console.log(`Token decimals: ${tokenDecimals}`);
    console.log(`Swapping ${TOKEN_AMOUNT} ${tokenSymbol} to CELO for voting...`);
    
    // Check token balance
    const tokenBalance = await publicClient.readContract({
      address: TOKEN_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address]
    });
    
    console.log(`${tokenSymbol} Balance: ${formatEther(tokenBalance)} ${tokenSymbol}`);
    
    if (tokenBalance < tokenAmount) {
      console.error(`Error: Insufficient ${tokenSymbol} balance. You need at least ${TOKEN_AMOUNT} ${tokenSymbol}.`);
      process.exit(1);
    }
    
    // Check allowance
    const allowance = await publicClient.readContract({
      address: TOKEN_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [account.address, SWAPPER_V3_ADDRESS as `0x${string}`]
    });
    
    console.log(`Current ${tokenSymbol} allowance for swapper: ${formatEther(allowance)} ${tokenSymbol}`);
    
    // If allowance is insufficient, approve the swapper to spend token
    if (allowance < tokenAmount) {
      console.log(`Approving swapper to spend ${TOKEN_AMOUNT} ${tokenSymbol}...`);
      const approveTxHash = await walletClient.writeContract({
        address: TOKEN_ADDRESS as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [SWAPPER_V3_ADDRESS as `0x${string}`, tokenAmount]
      });
      
      console.log(`Approval transaction hash: ${approveTxHash}`);
      console.log('Waiting for approval transaction confirmation...');
      
      await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
      console.log('Approval confirmed!');
    }
    
    // Get expected CELO amount
    const [expectedCelo, voteAmount] = await publicClient.readContract({
      address: SWAPPER_V3_ADDRESS as `0x${string}`,
      abi: celoSwapperV3Abi.abi,
      functionName: 'getExpectedVoteAmount',
      args: [TOKEN_ADDRESS as `0x${string}`, tokenAmount]
    });
    
    console.log(`Expected CELO: ${formatEther(expectedCelo)} CELO`);
    console.log(`Amount to be used for voting: ${formatEther(voteAmount)} CELO`);
    
    // Calculate slippage in basis points (1/100 of a percent)
    const slippageBps = BigInt(Math.floor(SLIPPAGE * 10000));
    
    // Get minimum CELO amount with slippage protection
    const minCeloAmount = await publicClient.readContract({
      address: SWAPPER_V3_ADDRESS as `0x${string}`,
      abi: celoSwapperV3Abi.abi,
      functionName: 'calculateMinCeloAmount',
      args: [TOKEN_ADDRESS as `0x${string}`, tokenAmount, slippageBps]
    });
    
    console.log(`Min CELO (with ${SLIPPAGE * 100}% slippage): ${formatEther(minCeloAmount)}`);
    
    // Execute swap and vote
    console.log('Executing swap and vote...');
    const swapAndVoteTxHash = await walletClient.writeContract({
      address: SWAPPER_V3_ADDRESS as `0x${string}`,
      abi: celoSwapperV3Abi.abi,
      functionName: 'swapAndVoteToken',
      args: [
        TOKEN_ADDRESS as `0x${string}`,
        BigInt(CAMPAIGN_ID), 
        BigInt(PROJECT_ID), 
        tokenAmount, 
        minCeloAmount
      ]
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
          abi: celoSwapperV3Abi.abi,
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
      console.log(`Successfully swapped ${formatEther(event.args.tokenAmount)} ${tokenSymbol} for ${formatEther(event.args.celoVoted)} CELO`);
      console.log(`Voted for project ${PROJECT_ID} in campaign ${CAMPAIGN_ID}`);
      
      // Get updated user vote information
      const userTokenVotes = await publicClient.readContract({
        address: SWAPPER_V3_ADDRESS as `0x${string}`,
        abi: celoSwapperV3Abi.abi,
        functionName: 'getUserTokenVotes',
        args: [account.address, TOKEN_ADDRESS as `0x${string}`, BigInt(CAMPAIGN_ID), BigInt(PROJECT_ID)]
      });
      
      console.log(`Total ${tokenSymbol} used for this project so far: ${formatEther(userTokenVotes)} ${tokenSymbol}`);
      console.log('--------------------------------------------------');
    } else {
      console.log("\nTransaction succeeded but couldn't find event data");
      
      // Even if we can't find the event, still show the updated votes
      const userTokenVotes = await publicClient.readContract({
        address: SWAPPER_V3_ADDRESS as `0x${string}`,
        abi: celoSwapperV3Abi.abi,
        functionName: 'getUserTokenVotes',
        args: [account.address, TOKEN_ADDRESS as `0x${string}`, BigInt(CAMPAIGN_ID), BigInt(PROJECT_ID)]
      });
      
      console.log(`Total ${tokenSymbol} used for this project: ${formatEther(userTokenVotes)} ${tokenSymbol}`);
    }
    
  } catch (error) {
    console.error('Error in swap and vote operation:', error);
    if (error.message) console.error('Error details:', error.message);
    if (error.cause) console.error('Error cause:', error.cause);
  }
}

// Execute the swap and vote
swapAndVoteToken();