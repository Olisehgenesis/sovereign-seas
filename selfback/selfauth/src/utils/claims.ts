import { createWalletClient, createPublicClient, http, parseEther, formatEther } from 'viem';
import { celo, celoAlfajores } from 'viem/chains';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import * as dotenv from 'dotenv';
import {abi}  from './abi';

dotenv.config();

const RPC_URL = process.env.CELO_RPC_URL;
const SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS = process.env.SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY; 

const testnetEnabled=process.env.TESTNET_ENABLED === 'true' 
const chain=testnetEnabled ? celoAlfajores : celo

const rpcUrl=testnetEnabled ? process.env.CELO_RPC_URL_TESTNET : process.env.CELO_RPC_URL

const walletClient = createWalletClient({
  account: privateKeyToAccount(`0x${PRIVATE_KEY}` as `0x${string}`),
  chain: chain,
  transport: http(rpcUrl)
});
const publicClient = createPublicClient({
  chain: chain,
  transport: http(rpcUrl)
});

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    transactionHash?: string;
}

async function claimAndVoteForUser(
  beneficiaryAddress: string,
  campaignId: number,
  projectId: number,  
  data: any
): Promise<ApiResponse<null>> {
  try {
    
    
    // Create metadata for the claim
    const metadataObj = {
      timestamp: new Date().toISOString(),
      campaignId: campaignId,
      projectId: projectId,
      beneficiary: beneficiaryAddress,
      ...data
    };
    const metadata = JSON.stringify(metadataObj);

    // Simulate the transaction first
    const { request } = await publicClient.simulateContract({
      account: walletClient.account,
      address: SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS as `0x${string}`,
      abi: abi,
      functionName: 'claimAndVote',
      args: [
        beneficiaryAddress,
        campaignId,
        projectId,
        metadata
      ]
    });

    // Execute the transaction
    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === 'success') {
      
      return {
        success: true,
        transactionHash: hash,
        data: null
      };
    } else {
      return {
        success: false,
        error: 'Transaction failed'
      };
    }
  } catch (error: any) {
    console.error(`❌ Error creating claim and vote:`, error);
    return {
      success: false,
      error: error.message || 'Error creating claim and vote'
    };
  }
}

async function getContractStats(): Promise<ApiResponse<any>> {
  try {
    console.log('\n📊 Getting contract statistics...');
    
    const totalStats = await publicClient.readContract({
      address: SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS as `0x${string}`,
      abi: abi,
      functionName: 'getTotalStats'
    });
    return {
      success: true,
      data: totalStats
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error getting contract stats'
    };
  }
}

async function getCampaignStats(campaignId: number): Promise<ApiResponse<any>> {
  try {
    // Get campaign stats
    const campaignStats = await publicClient.readContract({
      address: SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS as `0x${string}`,
      abi: abi,
      functionName: 'getCampaignStats',
      args: [campaignId] // Campaign 0
    });
    return {
      success: true,
      data: campaignStats
    };
  } catch (error: any) {
    console.error('❌ Error getting campaign stats:', error);
    return {
      success: false,
      error: error.message || 'Error getting campaign stats'
    };
  }
}

async function getProjectStats( projectId: number): Promise<ApiResponse<any>> {
  try {
    const projectStats = await publicClient.readContract({
      address: SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS as `0x${string}`,
      abi: abi,
      functionName: 'getProjectStats',
      args: [projectId]
    });
    return {
      success: true,
      data: projectStats
    };
  } catch (error: any) { 
    return {
      success: false,
      error: error.message || 'Error getting project stats'
    };
  }
}

async function walletBalance( address: string): Promise<ApiResponse<string>> {
  try {
    const balance = await publicClient.getBalance({ address: address as `0x${string}` });
    return {
      success: true,
      data: formatEther(balance)
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error getting wallet balance'
    };
  }
}

async function getContractBalance(): Promise<ApiResponse<string>> {
  try {
    const balance = await publicClient.getBalance({ address: SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS as `0x${string}` });
    return {
      success: true,
      data: formatEther(balance)
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error getting contract balance'
    };
  }
}



export {
  claimAndVoteForUser,
  getContractStats,
  getCampaignStats,
  getProjectStats,
  walletBalance,
  getContractBalance
};
