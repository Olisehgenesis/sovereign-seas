import { useState, useEffect } from 'react';
import { 
  usePublicClient, 
  useWalletClient, 
  useAccount, 
  useReadContract, 
  useWriteContract, 
  useWaitForTransactionReceipt 
} from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { getContract } from 'viem';

// Import ABI
import sovereignSeasAbi from '../abis/SovereignSeas.json';
import celoTokenAbi from '../abis/MockCELO.json';

// Types
export type Campaign = {
  id: bigint;
  admin: string;
  name: string;
  description: string;
  startTime: bigint;
  endTime: bigint;
  adminFeePercentage: bigint;
  voteMultiplier: bigint;
  maxWinners: bigint;
  useQuadraticDistribution: boolean;
  active: boolean;
  totalFunds: bigint;
};

export type Project = {
  id: bigint;
  campaignId: bigint;
  owner: string;
  name: string;
  description: string;
  githubLink: string;
  socialLink: string;
  testingLink: string;
  approved: boolean;
  voteCount: bigint;
  fundsReceived: bigint;
};

export type Vote = {
  voter: string;
  campaignId: bigint;
  projectId: bigint;
  amount: bigint;
  voteCount: bigint;
};

interface SovereignSeasConfig {
  contractAddress: `0x${string}`;
  celoTokenAddress: `0x${string}`;
  chainId?: number;
}

export const useSovereignSeas = ({
  contractAddress,
  celoTokenAddress,
}: SovereignSeasConfig) => {
  const { address: walletAddress } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Contract instances
  const [contract, setContract] = useState<any>(null);
  const [celoToken, setCeloToken] = useState<any>(null);
  
  // State
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  
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

  // Initialize contract instances
  useEffect(() => {
    if (!publicClient || !contractAddress || !celoTokenAddress) return;
    
    const sovereignSeasContract = getContract({
      address: contractAddress,
      abi: sovereignSeasAbi,
      publicClient,
    });
    
    const celoTokenContract = getContract({
      address: celoTokenAddress,
      abi: celoTokenAbi,
      publicClient,
    });
    
    setContract(sovereignSeasContract);
    setCeloToken(celoTokenContract);
    setIsInitialized(true);
  }, [publicClient, contractAddress, celoTokenAddress]);

  // Load all campaigns
  // In hooks/useSovereignSeas.ts
const loadCampaigns = async () => {
  if (!contract || !publicClient) return [];
  
  try {
    setLoadingCampaigns(true);
    
    // For development/testing without a real contract, use mock data
  
    
    const campaignCount = await publicClient.readContract({
      address: contractAddress,
      abi: sovereignSeasAbi,
      functionName: 'getCampaignCount',
    }) as bigint;
    
    const campaignPromises = [];
    for (let i = 0; i < Number(campaignCount); i++) {
      campaignPromises.push(publicClient.readContract({
        address: contractAddress,
        abi: sovereignSeasAbi,
        functionName: 'getCampaign',
        args: [BigInt(i)],
      }));
    }
    
    const campaignResults = await Promise.all(campaignPromises);
    setCampaigns(campaignResults as Campaign[]);
    return campaignResults as Campaign[];  // Make sure to return the results!
  } catch (error) {
    console.error('Error loading campaigns:', error);
    return [];  // Return empty array on error
  } finally {
    setLoadingCampaigns(false);
  }
};

  // Load projects for a specific campaign
  const loadProjects = async (campaignId: bigint | number) => {
    if (!contract || !publicClient) return [];
    
    try {
      const projectCount = await publicClient.readContract({
        address: contractAddress,
        abi: sovereignSeasAbi,
        functionName: 'getProjectCount',
        args: [BigInt(campaignId)],
      }) as bigint;
      
      const projectPromises = [];
      for (let i = 0; i < Number(projectCount); i++) {
        projectPromises.push(publicClient.readContract({
          address: contractAddress,
          abi: sovereignSeasAbi,
          functionName: 'getProject',
          args: [BigInt(campaignId), BigInt(i)],
        }));
      }
      
      const projectResults = await Promise.all(projectPromises);
      return projectResults as Project[];
    } catch (error) {
      console.error(`Error loading projects for campaign ${campaignId}:`, error);
      return [];
    }
  };

  // Get sorted projects for a campaign
  const getSortedProjects = async (campaignId: bigint | number) => {
    if (!contract || !publicClient) return [];
    
    try {
      return await publicClient.readContract({
        address: contractAddress,
        abi: sovereignSeasAbi,
        functionName: 'getSortedProjects',
        args: [BigInt(campaignId)],
      }) as Project[];
    } catch (error) {
      console.error(`Error getting sorted projects for campaign ${campaignId}:`, error);
      return [];
    }
  };

  // Check user's votes
  const getUserVotesForProject = async (campaignId: bigint | number, projectId: bigint | number) => {
    if (!contract || !publicClient || !walletAddress) return BigInt(0);
    
    try {
      return await publicClient.readContract({
        address: contractAddress,
        abi: sovereignSeasAbi,
        functionName: 'getUserVotesForProject',
        args: [BigInt(campaignId), walletAddress, BigInt(projectId)],
      }) as bigint;
    } catch (error) {
      console.error(`Error getting user votes for project ${projectId} in campaign ${campaignId}:`, error);
      return BigInt(0);
    }
  };

  // Get user's total votes in a campaign
  const getUserTotalVotesInCampaign = async (campaignId: bigint | number) => {
    if (!contract || !publicClient || !walletAddress) return BigInt(0);
    
    try {
      return await publicClient.readContract({
        address: contractAddress,
        abi: sovereignSeasAbi,
        functionName: 'getUserTotalVotesInCampaign',
        args: [BigInt(campaignId), walletAddress],
      }) as bigint;
    } catch (error) {
      console.error(`Error getting user total votes in campaign ${campaignId}:`, error);
      return BigInt(0);
    }
  };

  // Get user's vote history
  const getUserVoteHistory = async () => {
    if (!contract || !publicClient || !walletAddress) return [];
    
    try {
      return await publicClient.readContract({
        address: contractAddress,
        abi: sovereignSeasAbi,
        functionName: 'getUserVoteHistory',
        args: [walletAddress],
      }) as Vote[];
    } catch (error) {
      console.error('Error getting user vote history:', error);
      return [];
    }
  };

  // Create a new campaign
  const createCampaign = async (
    name: string,
    description: string,
    startTime: number,
    endTime: number,
    adminFeePercentage: number,
    voteMultiplier: number,
    maxWinners: number,
    useQuadraticDistribution: boolean
  ) => {
    if (!walletClient) return;
    
    try {
      writeContract({
        address: contractAddress,
        abi: sovereignSeasAbi,
        functionName: 'createCampaign',
        args: [
          name, 
          description, 
          BigInt(startTime), 
          BigInt(endTime), 
          BigInt(adminFeePercentage), 
          BigInt(voteMultiplier),
          BigInt(maxWinners),
          useQuadraticDistribution
        ],
      });
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  // Submit a project to a campaign
  const submitProject = async (
    campaignId: bigint | number,
    name: string,
    description: string,
    githubLink: string = '',
    socialLink: string = '',
    testingLink: string = ''
  ) => {
    if (!walletClient) return;
    
    try {
      writeContract({
        address: contractAddress,
        abi: sovereignSeasAbi,
        functionName: 'submitProject',
        args: [
          BigInt(campaignId), 
          name, 
          description, 
          githubLink, 
          socialLink, 
          testingLink
        ],
      });
    } catch (error) {
      console.error('Error submitting project:', error);
    }
  };

  // Approve a project
  const approveProject = async (campaignId: bigint | number, projectId: bigint | number) => {
    if (!walletClient) return;
    
    try {
      writeContract({
        address: contractAddress,
        abi: sovereignSeasAbi,
        functionName: 'approveProject',
        args: [BigInt(campaignId), BigInt(projectId)],
      });
    } catch (error) {
      console.error('Error approving project:', error);
    }
  };

  // Vote for a project
  const vote = async (campaignId: bigint | number, projectId: bigint | number, amount: string) => {
    if (!walletClient) return;
    
    try {
      // First approve token spending
      const amountInWei = parseEther(amount);
      
      await writeContract({
        address: celoTokenAddress,
        abi: celoTokenAbi,
        functionName: 'approve',
        args: [contractAddress, amountInWei],
      });
      
      // Then vote
      writeContract({
        address: contractAddress,
        abi: sovereignSeasAbi,
        functionName: 'vote',
        args: [BigInt(campaignId), BigInt(projectId), amountInWei],
      });
    } catch (error) {
      console.error('Error voting for project:', error);
    }
  };

  // Distribute funds
  const distributeFunds = async (campaignId: bigint | number) => {
    if (!walletClient) return;
    
    try {
      writeContract({
        address: contractAddress,
        abi: sovereignSeasAbi,
        functionName: 'distributeFunds',
        args: [BigInt(campaignId)],
      });
    } catch (error) {
      console.error('Error distributing funds:', error);
    }
  };

  // Check if a campaign is active
  const isCampaignActive = (campaign: Campaign) => {
    const now = Math.floor(Date.now() / 1000);
    return campaign.active && 
           Number(campaign.startTime) <= now && 
           Number(campaign.endTime) >= now;
  };

  // Calculate time remaining for a campaign
  const getCampaignTimeRemaining = (campaign: Campaign) => {
    const now = Math.floor(Date.now() / 1000);
    const endTime = Number(campaign.endTime);
    
    if (now >= endTime) return { days: 0, hours: 0, minutes: 0 };
    
    const secondsRemaining = endTime - now;
    const days = Math.floor(secondsRemaining / 86400);
    const hours = Math.floor((secondsRemaining % 86400) / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);
    
    return { days, hours, minutes };
  };

  // Format campaign start/end times
  const formatCampaignTime = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  // Format token amounts
  const formatTokenAmount = (amount: bigint) => {
    return formatEther(amount);
  };

  return {
    // Contract state
    isInitialized,
    campaigns,
    loadingCampaigns,
    
    // Transaction state
    isWritePending,
    isWriteSuccess,
    isWaitingForTx,
    isTxSuccess,
    writeError,
    resetWrite,
    txReceipt,
    
    // Read functions
    loadCampaigns,
    loadProjects,
    getSortedProjects,
    getUserVotesForProject,
    getUserTotalVotesInCampaign,
    getUserVoteHistory,
    
    // Write functions
    createCampaign,
    submitProject,
    approveProject,
    vote,
    distributeFunds,
    
    // Helper functions
    isCampaignActive,
    getCampaignTimeRemaining,
    formatCampaignTime,
    formatTokenAmount,
  };
};