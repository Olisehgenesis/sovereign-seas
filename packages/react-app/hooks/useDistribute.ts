'use client';
import { useState, useEffect } from 'react';
import { 
  usePublicClient, 
  useWalletClient, 
  useAccount, 
  useWriteContract, 
  useWaitForTransactionReceipt 
} from 'wagmi';
import { getContract } from 'viem';

// Import ABIs
import sovSeasDistributeAbi from '../abis/SovSeasDistribute.json';
import sovSeasCampaignAbi from '../abis/SovSeasCampaign.json';

// Get chain ID and contract addresses from .env
const chainId = process.env.NEXT_PUBLIC_CHAIN_ID ? Number(process.env.NEXT_PUBLIC_CHAIN_ID) : undefined;
const distributeContractAddress = process.env.NEXT_PUBLIC_DISTRIBUTE_CONTRACT_ADDRESS as `0x${string}`;
const campaignContractAddress = process.env.NEXT_PUBLIC_CAMPAIGN_CONTRACT_ADDRESS as `0x${string}`;

// Export contract address for use in other components
export const SOVSEAS_DISTRIBUTE_ADDRESS = distributeContractAddress;

// Import types from campaign hook
import { Entity } from './useSovSeasCampaign';

interface SovSeasDistributeConfig {
  contractAddress?: `0x${string}`;
  campaignContractAddress?: `0x${string}`;
  chainId?: number;
  publicClient?: any;
  walletClient?: any;
}

export const useSovSeasDistribute = (config?: SovSeasDistributeConfig) => {
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
  
  const actualContractAddress = config?.contractAddress || distributeContractAddress;
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
    
    const sovSeasDistributeContract = getContract({
      address: actualContractAddress,
      abi: sovSeasDistributeAbi,
      client: publicClient,
    });
    
    setContract(sovSeasDistributeContract);
    setIsInitialized(true);
  }, [publicClient, actualContractAddress]);

  // Distribute funds for a campaign
  const distributeFunds = async (campaignId: bigint | number) => {
    if (!walletClient) return;
    
    try {
      // Check if user is a campaign admin before distributing funds
      if (actualCampaignAddress && walletAddress) {
        const isAdmin = await publicClient?.readContract({
          address: actualCampaignAddress,
          abi: sovSeasCampaignAbi,
          functionName: 'isCampaignAdmin',
          args: [BigInt(campaignId), walletAddress],
        }) as boolean;
        
        if (!isAdmin) {
          throw new Error('Only campaign admins can distribute funds');
        }
      }
      
      writeContract({
        address: actualContractAddress,
        abi: sovSeasDistributeAbi,
        functionName: 'distributeFunds',
        args: [BigInt(campaignId)],
      });
    } catch (error) {
      console.error('Error distributing funds:', error);
      throw error;
    }
  };

  // Get sorted entities for a campaign
  const getSortedEntities = async (campaignId: bigint | number) => {
    if (!contract || !publicClient) return [];
    
    try {
      return await publicClient.readContract({
        address: actualContractAddress,
        abi: sovSeasDistributeAbi,
        functionName: 'getSortedEntities',
        args: [BigInt(campaignId)],
      }) as Entity[];
    } catch (error) {
      console.error(`Error getting sorted entities for campaign ${campaignId}:`, error);
      return [];
    }
  };

  return {
    // Config
    contractAddress: actualContractAddress,
    
    // Clients
    publicClient,
    walletClient,
    
    // Contract state
    isInitialized,
    
    // Transaction state
    isWritePending,
    isWriteSuccess,
    isWaitingForTx,
    isTxSuccess,
    writeError,
    resetWrite,
    txReceipt,
    
    // Read functions
    getSortedEntities,
    
    // Write functions
    distributeFunds,
  };
};