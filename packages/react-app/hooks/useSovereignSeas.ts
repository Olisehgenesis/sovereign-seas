'use client';
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
// get chain id from .env
const chainId = process.env.NEXT_PUBLIC_CHAIN_ID ? Number(process.env.NEXT_PUBLIC_CHAIN_ID) : undefined;

// Updated Types
export type Campaign = {
  id: bigint;
  admin: string;
  name: string;
  description: string;
  logo: string;          // New field
  demoVideo: string;     // New field
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
  logo: string;          // New field
  demoVideo: string;     // New field
  contracts: string[];   // New field
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

// Fee constants
export const CAMPAIGN_CREATION_FEE = "2";
export const PROJECT_CREATION_FEE = "1";

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
  const publicClient = usePublicClient({
    chainId: chainId,
  });
  const { data: walletClient } = useWalletClient(
    { chainId: chainId }
  );
  
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Contract instances
  const [contract, setContract] = useState<any>(null);
  const [celoToken, setCeloToken] = useState<any>(null);
  
  // State
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [creationFees, setCreationFees] = useState<bigint>(BigInt(0));
  const [loadingFees, setLoadingFees] = useState(false);
  
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
      client: publicClient,
    });
    
    const celoTokenContract = getContract({
      address: celoTokenAddress,
      abi: celoTokenAbi,
      client: publicClient,
    });
    
    setContract(sovereignSeasContract);
    setCeloToken(celoTokenContract);
    setIsInitialized(true);
  }, [publicClient, contractAddress, celoTokenAddress]);

  // Check if current user is super admin
  useEffect(() => {
   // Replace the existing checkSuperAdmin function with this updated version
   const checkSuperAdmin = async () => {
    if (!isInitialized || !publicClient || !walletAddress) {
      setIsSuperAdmin(false);
      return;
    }
  
    try {
      // Check if the walletAddress is a super admin
      const isSuperAdmin = await publicClient.readContract({
        address: contractAddress,
        abi: sovereignSeasAbi,
        functionName: 'superAdmins',
        args: [walletAddress],
      }) as boolean;
  
      // Get contract deployer address from environment variable
      const contractDeployer = process.env.NEXT_PUBLIC_CONTRACT_DEPLOYER as string;
      
      // Ensure both addresses are normalized to lowercase for comparison
      const normalizedDeployer = contractDeployer ? contractDeployer.toLowerCase() : '';
      const normalizedWallet = walletAddress ? walletAddress.toLowerCase() : '';
      
      console.log("Normalized deployer:", normalizedDeployer);
      console.log("Normalized wallet:", normalizedWallet);
      console.log("Are they equal?", normalizedDeployer === normalizedWallet);
  
      // Check if walletAddress is either a super admin or the deployer
      const isDeployer = !!normalizedDeployer && !!normalizedWallet && normalizedDeployer === normalizedWallet;
      
      console.log("isSuperAdmin:", isSuperAdmin);
      console.log("isDeployer:", isDeployer);
      
      setIsSuperAdmin(isSuperAdmin || isDeployer);
      
      console.log("Final isSuperAdmin value:", isSuperAdmin || isDeployer);
  
    } catch (error) {
      console.error('Error checking super admin status:', error);
      setIsSuperAdmin(false);
    }
  };

    checkSuperAdmin();
  }, [isInitialized, walletAddress, contractAddress, publicClient]);

  // Load available creation fees
  const loadCreationFees = async () => {
    if (!contract || !publicClient) return BigInt(0);
    
    try {
      setLoadingFees(true);
      
      const fees = await publicClient.readContract({
        address: contractAddress,
        abi: sovereignSeasAbi,
        functionName: 'getAvailableCreationFees',
      }) as bigint;
      
      setCreationFees(fees);
      return fees;
    } catch (error) {
      console.error('Error loading creation fees:', error);
      return BigInt(0);
    } finally {
      setLoadingFees(false);
    }
  };

  // Withdraw creation fees (only for super admins)
  const withdrawCreationFees = async (amount: string = "0") => {
    if (!walletClient || !isSuperAdmin) return;
    
    try {
      const amountBigInt = amount === "0" ? BigInt(0) : parseEther(amount);
      
      writeContract({
        address: contractAddress,
        abi: sovereignSeasAbi,
        functionName: 'withdrawCreationFees',
        args: [amountBigInt],
      });
    } catch (error) {
      console.error('Error withdrawing creation fees:', error);
    }
  };

  // Load all campaigns
  const loadCampaigns = async () => {
    if (!contract || !publicClient) return [];
    
    try {
      setLoadingCampaigns(true);
      
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
      
      // Transform the results to match the Campaign type
      // Since getCampaign now returns multiple values instead of a struct
      //dont returncampaigns whose ids are in spam
      //cast next public spam camapins from .env to list of bigints

      const spam: bigint[] = process.env.NEXT_PUBLIC_SPAM_CAMPAIGNS ? process.env.NEXT_PUBLIC_SPAM_CAMPAIGNS.split(',').map((id: string) => BigInt(id)) : [];

      const formattedCampaigns = campaignResults.map((result: any) => {
        return {
          id: result[0],
          admin: result[1],
          name: result[2],
          description: result[3],
          logo: result[4],
          demoVideo: result[5],
          startTime: result[6],
          endTime: result[7],
          adminFeePercentage: result[8],
          voteMultiplier: result[9],
          maxWinners: result[10],
          useQuadraticDistribution: result[11],
          active: result[12],
          totalFunds: result[13]
        } as Campaign;
      });
      //remove spam campaigns
      for (let i = 0; i < formattedCampaigns.length; i++) {
        if(spam.includes(formattedCampaigns[i].id)){
          formattedCampaigns.splice(i, 1);
        }
      }
      
      setCampaigns(formattedCampaigns);
      return formattedCampaigns;
    } catch (error) {
      console.error('Error loading campaigns:', error);
      return [];
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

  // Check if user is a campaign admin
  const isCampaignAdmin = async (campaignId: bigint | number) => {
    if (!contract || !publicClient || !walletAddress) return false;
    
    try {
      return await publicClient.readContract({
        address: contractAddress,
        abi: sovereignSeasAbi,
        functionName: 'isCampaignAdmin',
        args: [BigInt(campaignId), walletAddress],
      }) as boolean;
    } catch (error) {
      console.error(`Error checking if user is campaign admin for campaign ${campaignId}:`, error);
      return false;
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

  // Super Admin Functions

  // Vote for a project
  const vote = async (campaignId: bigint | number, projectId: bigint | number, amount: string) => {
    if (!walletClient) return;
    if (!publicClient) {
      console.error('Public client not initialized');
      return;
    }
 
    
    try {
      // First approve token spending
      const amountInWei = parseEther(amount);
      
      await writeContract({
        address: celoTokenAddress,
        abi: celoTokenAbi,
        functionName: 'approve',
        args: [contractAddress, amountInWei],
      });
      // await publicClient.waitForTransactionReceipt({ hash: writeData  as "0x${string}"});
      
      // Then vote
      writeContract({
        address: contractAddress,
        abi: sovereignSeasAbi,
        functionName: 'vote',
        args: [BigInt(campaignId), BigInt(projectId), amountInWei],
      });
      await publicClient.waitForTransactionReceipt({ hash: writeData  as "0x${string}"});
    } catch (error) {
      console.error('Error voting for project:', error);
    }
  };

 


// Add a new super admin
const addSuperAdmin = async (newAdminAddress: string) => {
  if (!walletClient || !isSuperAdmin || !publicClient) return;
  
  try {
    writeContract({
      address: contractAddress,
      abi: sovereignSeasAbi,
      functionName: 'addSuperAdmin',
      args: [newAdminAddress],
    });
    await publicClient.waitForTransactionReceipt({ hash: writeData as `0x${string}` });
  } catch (error) {
    console.error('Error adding super admin:', error);
  }
};

// Remove a super admin
const removeSuperAdmin = async (adminAddress: string) => {
  if (!walletClient || !isSuperAdmin || !publicClient) return;
  
  try {
    writeContract({
      address: contractAddress,
      abi: sovereignSeasAbi,
      functionName: 'removeSuperAdmin',
      args: [adminAddress],
    });
    await publicClient.waitForTransactionReceipt({ hash: writeData as `0x${string}` });
  } catch (error) {
    console.error('Error removing super admin:', error);
  }
};

// Add a campaign admin
const addCampaignAdmin = async (campaignId: bigint | number, newAdminAddress: string) => {
  if (!walletClient || !publicClient) return;
  
  try {
    writeContract({
      address: contractAddress,
      abi: sovereignSeasAbi,
      functionName: 'addCampaignAdmin',
      args: [BigInt(campaignId), newAdminAddress],
    });
    await publicClient.waitForTransactionReceipt({ hash: writeData as `0x${string}` });
  } catch (error) {
    console.error('Error adding campaign admin:', error);
  }
};

// Remove a campaign admin
const removeCampaignAdmin = async (campaignId: bigint | number, adminAddress: string) => {
  if (!walletClient || !publicClient) return;
  
  try {
    writeContract({
      address: contractAddress,
      abi: sovereignSeasAbi,
      functionName: 'removeCampaignAdmin',
      args: [BigInt(campaignId), adminAddress],
    });
    await publicClient.waitForTransactionReceipt({ hash: writeData as `0x${string}` });
  } catch (error) {
    console.error('Error removing campaign admin:', error);
  }
};

// Create a new campaign
const createCampaign = async (
  name: string,
  description: string,
  logo: string,
  demoVideo: string,
  startTime: number,
  endTime: number,
  adminFeePercentage: number,
  voteMultiplier: number,
  maxWinners: number,
  useQuadraticDistribution: boolean
) => {
  if (!walletClient || !publicClient) return;
  
  try {
    // First approve token spending for the campaign creation fee
    const campaignFee = parseEther(CAMPAIGN_CREATION_FEE);
    
    await writeContract({
      address: celoTokenAddress,
      abi: celoTokenAbi,
      functionName: 'approve',
      args: [contractAddress, campaignFee],
    });

    
    // Then create the campaign
    writeContract({
      address: contractAddress,
      abi: sovereignSeasAbi,
      functionName: 'createCampaign',
      args: [
        name, 
        description,
        logo,
        demoVideo,
        BigInt(startTime), 
        BigInt(endTime), 
        BigInt(adminFeePercentage), 
        BigInt(voteMultiplier),
        BigInt(maxWinners),
        useQuadraticDistribution
      ],
    });
    await publicClient.waitForTransactionReceipt({ hash: writeData as `0x${string}` });
  } catch (error) {
    console.error('Error creating campaign:', error);
  }
};

// Update a campaign
const updateCampaign = async (
  campaignId: bigint | number,
  name: string,
  description: string,
  logo: string,
  demoVideo: string,
  startTime: number,
  endTime: number,
  adminFeePercentage: number
) => {
  if (!walletClient || !publicClient) return;
  
  try {
    writeContract({
      address: contractAddress,
      abi: sovereignSeasAbi,
      functionName: 'updateCampaign',
      args: [
        BigInt(campaignId),
        name, 
        description,
        logo,
        demoVideo,
        BigInt(startTime), 
        BigInt(endTime), 
        BigInt(adminFeePercentage)
      ],
    });
    await publicClient.waitForTransactionReceipt({ hash: writeData as `0x${string}` });
  } catch (error) {
    console.error('Error updating campaign:', error);
  }
};

// Submit a project to a campaign
const submitProject = async (
  campaignId: bigint | number,
  name: string,
  description: string,
  githubLink: string = '',
  socialLink: string = '',
  testingLink: string = '',
  logo: string = '',
  demoVideo: string = '',
  contracts: string[] = []
) => {
  if (!walletClient || !publicClient) return;
  
  try {
    // First approve token spending for the project creation fee
    const projectFee = parseEther(PROJECT_CREATION_FEE);
    
    await writeContract({
      address: celoTokenAddress,
      abi: celoTokenAbi,
      functionName: 'approve',
      args: [contractAddress, projectFee],
    });
    
    // Then submit the project
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
        testingLink,
        logo,
        demoVideo,
        contracts
      ],
    });
    await publicClient.waitForTransactionReceipt({ hash: writeData as `0x${string}` });
  } catch (error) {
    console.error('Error submitting project:', error);
  }
};

// Update a project
const updateProject = async (
  campaignId: bigint | number,
  projectId: bigint | number,
  name: string,
  description: string,
  githubLink: string = '',
  socialLink: string = '',
  testingLink: string = '',
  logo: string = '',
  demoVideo: string = '',
  contracts: string[] = []
) => {
  if (!walletClient || !publicClient) return;
  
  try {
    writeContract({
      address: contractAddress,
      abi: sovereignSeasAbi,
      functionName: 'updateProject',
      args: [
        BigInt(campaignId),
        BigInt(projectId),
        name, 
        description, 
        githubLink, 
        socialLink, 
        testingLink,
        logo,
        demoVideo,
        contracts
      ],
    });
    await publicClient.waitForTransactionReceipt({ hash: writeData as `0x${string}` });
  } catch (error) {
    console.error('Error updating project:', error);
  }
};

// Approve a project
const approveProject = async (campaignId: bigint | number, projectId: bigint | number) => {
  if (!walletClient || !publicClient) return;
  
  try {
    writeContract({
      address: contractAddress,
      abi: sovereignSeasAbi,
      functionName: 'approveProject',
      args: [BigInt(campaignId), BigInt(projectId)],
    });
    await publicClient.waitForTransactionReceipt({ hash: writeData as `0x${string}` });
  } catch (error) {
    console.error('Error approving project:', error);
  }
};

// Distribute funds
const distributeFunds = async (campaignId: bigint | number) => {
  if (!walletClient || !publicClient) return;
  
  try {
    writeContract({
      address: contractAddress,
      abi: sovereignSeasAbi,
      functionName: 'distributeFunds',
      args: [BigInt(campaignId)],
    });
    await publicClient.waitForTransactionReceipt({ hash: writeData as `0x${string}` });
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
    //clients
    publicClient,
    walletClient,
    
    // Contract state
    isInitialized,
    campaigns,
    loadingCampaigns,
    isSuperAdmin,
    creationFees,
    loadingFees,
    
    // Fee constants
    CAMPAIGN_CREATION_FEE,
    PROJECT_CREATION_FEE,
    
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
    loadCreationFees,
    getSortedProjects,
    getUserVotesForProject,
    getUserTotalVotesInCampaign,
    getUserVoteHistory,
    isCampaignAdmin,
    
    // Super Admin functions
    addSuperAdmin,
    removeSuperAdmin,
    withdrawCreationFees,
    
    // Campaign Admin functions
    addCampaignAdmin,
    removeCampaignAdmin,
    
    // Write functions
    createCampaign,
    updateCampaign,
    submitProject,
    updateProject,
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