'use client';
import { useState, useEffect } from 'react';
import { 
  usePublicClient, 
  useWalletClient, 
  useAccount, 
  useWriteContract, 
  useWaitForTransactionReceipt 
} from 'wagmi';
import { parseEther, formatEther, getContract } from 'viem';

// Import ABIs
import sovSeasVoteAbi from '../abis/SovSeasVote.json';
import sovSeasCampaignAbi from '../abis/SovSeasCampaign.json';

// Get chain ID and contract addresses from .env
const chainId = process.env.NEXT_PUBLIC_CHAIN_ID ? Number(process.env.NEXT_PUBLIC_CHAIN_ID) : undefined;
const voteContractAddress = process.env.NEXT_PUBLIC_VOTE_CONTRACT_ADDRESS as `0x${string}`;
const campaignContractAddress = process.env.NEXT_PUBLIC_CAMPAIGN_CONTRACT_ADDRESS as `0x${string}`;

// Export contract address for use in other components
export const SOVSEAS_VOTE_ADDRESS = voteContractAddress;

// Vote type
export type Vote = {
  voter: string;
  voterName: string;
  voterWallet: string;
  campaignId: bigint;
  entityId: bigint;
  amount: bigint;
  voteCount: bigint;
  refunded: boolean;
};

// Platform fee percent
export const PLATFORM_FEE_PERCENT = 10; // 10%

interface SovSeasVoteConfig {
  contractAddress?: `0x${string}`;
  campaignContractAddress?: `0x${string}`;
  chainId?: number;
  publicClient?: any;
  walletClient?: any;
}

export const useSovSeasVote = (config?: SovSeasVoteConfig) => {
  const { address: walletAddress } = useAccount();
  const defaultPublicClient = usePublicClient({
    chainId: config?.chainId || chainId,
  });
  const { data: defaultWalletClient } = useWalletClient({
    chainId: config?.chainId || chainId,
  });
  
  // Use provided clients or fall back to defaults
  const publicClient = config?.publicClient || defaultPublicClient;
  const walletClient = config?.walletClient || defaultWalletClient;
  
  const actualContractAddress = config?.contractAddress || voteContractAddress;
  const actualCampaignAddress = config?.campaignContractAddress || campaignContractAddress;
  
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Contract instance
  const [contract, setContract] = useState<any>(null);
  
  // Write state
  const { 
    data: writeData, 
    writeContract, 
    isPending: isWritePending, 
    isSuccess: isWriteSuccess, 
    error: writeError,
    reset: resetWrite 
  } = useWriteContract();

  // Transaction receipt
  const { 
    data: txReceipt, 
    isLoading: isWaitingForTx, 
    isSuccess: isTxSuccess 
  } = useWaitForTransactionReceipt({
    hash: writeData,
  });

  // Initialize contract instance
  useEffect(() => {
    if (!publicClient || !actualContractAddress) return;
    
    const sovSeasVoteContract = getContract({
      address: actualContractAddress,
      abi: sovSeasVoteAbi,
      client: publicClient,
    });
    
    setContract(sovSeasVoteContract);
    setIsInitialized(true);
  }, [publicClient, actualContractAddress]);

  // Vote for an entity
  const vote = async (
    campaignId: bigint | number, 
    entityId: bigint | number, 
    amount: string, 
    voterName: string = '', 
    voterWallet: string = ''
  ) => {
    if (!walletClient) return;
    
    try {
      // Before voting, check if the campaign is private and if the user is whitelisted
      if (actualCampaignAddress) {
        // First check if the campaign is private
        const isCampaignPrivate = await publicClient?.readContract({
          address: actualCampaignAddress,
          abi: sovSeasCampaignAbi,
          functionName: 'isCampaignPrivate',
          args: [BigInt(campaignId)],
        }) as boolean;
        
        // If private, check if user is whitelisted
        if (isCampaignPrivate && walletAddress) {
          const isWhitelisted = await publicClient?.readContract({
            address: actualCampaignAddress,
            abi: sovSeasCampaignAbi,
            functionName: 'isVoterWhitelisted',
            args: [BigInt(campaignId), walletAddress],
          }) as boolean;
          
          if (!isWhitelisted) {
            throw new Error('You are not whitelisted for this private campaign');
          }
        }
      }
      
      const amountInWei = parseEther(amount);
      const voterWalletAddress = voterWallet ? voterWallet as `0x${string}` : '0x0000000000000000000000000000000000000000';
      
      writeContract({
        address: actualContractAddress,
        abi: sovSeasVoteAbi,
        functionName: 'vote',
        args: [
          BigInt(campaignId), 
          BigInt(entityId), 
          voterName || 'Anonymous', 
          voterWalletAddress
        ],
        value: amountInWei
      });
    } catch (error) {
      console.error('Error voting for entity:', error);
      throw error;
    }
  };

  // Request refund for votes in a refundable campaign
  const requestRefund = async (campaignId: bigint | number, voteIndexes: number[]) => {
    if (!walletClient) return;
    
    try {
      writeContract({
        address: actualContractAddress,
        abi: sovSeasVoteAbi,
        functionName: 'requestRefund',
        args: [BigInt(campaignId), voteIndexes.map(index => BigInt(index))],
      });
    } catch (error) {
      console.error('Error requesting refund:', error);
    }
  };

  // Get votes for an entity from a user
  const getUserVotesForEntity = async (
    campaignId: bigint | number, 
    entityId: bigint | number, 
    userAddress: string = walletAddress || ''
  ) => {
    if (!contract || !publicClient || !userAddress) return BigInt(0);
    
    try {
      return await publicClient.readContract({
        address: actualContractAddress,
        abi: sovSeasVoteAbi,
        functionName: 'getUserVotesForEntity',
        args: [BigInt(campaignId), userAddress, BigInt(entityId)],
      }) as bigint;
    } catch (error) {
      console.error(`Error getting user votes for entity ${entityId} in campaign ${campaignId}:`, error);
      return BigInt(0);
    }
  };

  // Get user's total votes in a campaign
  const getUserTotalVotesInCampaign = async (
    campaignId: bigint | number,
    userAddress: string = walletAddress || ''
  ) => {
    if (!contract || !publicClient || !userAddress) return BigInt(0);
    
    try {
      return await publicClient.readContract({
        address: actualContractAddress,
        abi: sovSeasVoteAbi,
        functionName: 'getUserTotalVotesInCampaign',
        args: [BigInt(campaignId), userAddress],
      }) as bigint;
    } catch (error) {
      console.error(`Error getting user total votes in campaign ${campaignId}:`, error);
      return BigInt(0);
    }
  };

  // Get user's vote history
  const getUserVoteHistory = async (userAddress: string = walletAddress || '') => {
    if (!contract || !publicClient || !userAddress) return [];
    
    try {
      return await publicClient.readContract({
        address: actualContractAddress,
        abi: sovSeasVoteAbi,
        functionName: 'getUserVoteHistory',
        args: [userAddress],
      }) as Vote[];
    } catch (error) {
      console.error('Error getting user vote history:', error);
      return [];
    }
  };

  // Get user's vote history with pagination
  const getUserVoteHistoryPaginated = async (
    userAddress: string = walletAddress || '',
    startIndex: number = 0,
    count: number = 10
  ) => {
    if (!contract || !publicClient || !userAddress) return [];
    
    try {
      return await publicClient.readContract({
        address: actualContractAddress,
        abi: sovSeasVoteAbi,
        functionName: 'getUserVoteHistoryPaginated',
        args: [userAddress, BigInt(startIndex), BigInt(count)],
      }) as Vote[];
    } catch (error) {
      console.error('Error getting paginated user vote history:', error);
      return [];
    }
  };

  // Get total number of votes for a user
  const getUserVoteCount = async (userAddress: string = walletAddress || '') => {
    if (!contract || !publicClient || !userAddress) return BigInt(0);
    
    try {
      return await publicClient.readContract({
        address: actualContractAddress,
        abi: sovSeasVoteAbi,
        functionName: 'getUserVoteCount',
        args: [userAddress],
      }) as bigint;
    } catch (error) {
      console.error('Error getting user vote count:', error);
      return BigInt(0);
    }
  };

  // Calculate refund amount after platform fee
  const calculateRefundAmount = (originalAmount: bigint) => {
    const platformFee = (originalAmount * BigInt(PLATFORM_FEE_PERCENT)) / BigInt(100);
    return originalAmount - platformFee;
  };

  // Format token amounts
  const formatTokenAmount = (amount: bigint) => {
    return formatEther(amount);
  };

  return {
    // Config
    contractAddress: actualContractAddress,
    
    // Clients
    publicClient,
    walletClient,
    
    // Contract state
    isInitialized,
    PLATFORM_FEE_PERCENT,
    
    // Transaction state
    isWritePending,
    isWriteSuccess,
    isWaitingForTx,
    isTxSuccess,
    writeError,
    resetWrite,
    txReceipt,
    
    // Read functions
    getUserVotesForEntity,
    getUserTotalVotesInCampaign,
    getUserVoteHistory,
    getUserVoteHistoryPaginated,
    getUserVoteCount,
    
    // Write functions
    vote,
    requestRefund,
    
    // Helper functions
    calculateRefundAmount,
    formatTokenAmount,
  };
};