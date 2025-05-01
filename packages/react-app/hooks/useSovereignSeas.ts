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
import sovereignSeasAbi from '../abis/SovereignSeasV2.json';
import { formatIpfsUrl } from '@/app/utils/imageUtils';

// get chain id and contract address from .env
const chainId = process.env.NEXT_PUBLIC_CHAIN_ID ? Number(process.env.NEXT_PUBLIC_CHAIN_ID) : undefined;
const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

// Updated Types
export type Campaign = {
  id: bigint;
  admin: string;
  name: string;
  description: string;
  logo: string;
  demoVideo: string;
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
  logo: string;
  demoVideo: string;
  contracts: string[];
  approved: boolean;
  active: boolean; // New field for active status
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

// Export contract address for use in other components
export const SOVEREIGN_SEAS_ADDRESS = contractAddress;

interface SovereignSeasConfig {
  contractAddress?: `0x${string}`;
  chainId?: number;
}

export const useSovereignSeas = (config?: SovereignSeasConfig) => {
  const { address: walletAddress } = useAccount();
  const publicClient = usePublicClient({
    chainId: config?.chainId || chainId,
  });
  const { data: walletClient } = useWalletClient(
    { chainId: config?.chainId || chainId }
  );
  
  const actualContractAddress = config?.contractAddress || contractAddress;
  
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Contract instance
  const [contract, setContract] = useState<any>(null);
  
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

  // Initialize contract instance
  useEffect(() => {
    if (!publicClient || !actualContractAddress) return;
    
    const sovereignSeasContract = getContract({
      address: actualContractAddress,
      abi: sovereignSeasAbi,
      client: publicClient,
    });
    
    setContract(sovereignSeasContract);
    setIsInitialized(true);
  }, [publicClient, actualContractAddress]);

  // Check if current user is super admin
  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!isInitialized || !publicClient || !walletAddress) {
        setIsSuperAdmin(false);
        return;
      }
    
      try {
        // Check if the walletAddress is a super admin
        const isSuperAdmin = await publicClient.readContract({
          address: actualContractAddress,
          abi: sovereignSeasAbi,
          functionName: 'superAdmins',
          args: [walletAddress],
        }) as boolean;
    
        // Get contract deployer address from environment variable
        const contractDeployer = process.env.NEXT_PUBLIC_CONTRACT_DEPLOYER as string;
        
        // Ensure both addresses are normalized to lowercase for comparison
        const normalizedDeployer = contractDeployer ? contractDeployer.toLowerCase() : '';
        const normalizedWallet = walletAddress ? walletAddress.toLowerCase() : '';
        
        
    
        // Check if walletAddress is either a super admin or the deployer
        const isDeployer = !!normalizedDeployer && !!normalizedWallet && normalizedDeployer === normalizedWallet;
        
     
        
        setIsSuperAdmin(isSuperAdmin || isDeployer);
        
       
    
      } catch (error) {
        console.error('Error checking super admin status:', error);
        setIsSuperAdmin(false);
      }
    };

    checkSuperAdmin();
  }, [isInitialized, walletAddress, actualContractAddress, publicClient]);

  // Load available creation fees
  const loadCreationFees = async () => {
    if (!contract || !publicClient) return BigInt(0);
    
    try {
      setLoadingFees(true);
      
      const fees = await publicClient.readContract({
        address: actualContractAddress,
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
        address: actualContractAddress,
        abi: sovereignSeasAbi,
        functionName: 'withdrawCreationFees',
        args: [amountBigInt],
      });
    } catch (error) {
      console.error('Error withdrawing creation fees:', error);
    }
  };

  // First, let's fix the formatIpfsUrl helper function to handle the "File selected:" case


// Then modify your loadCampaigns function:
const loadCampaigns = async () => {
  if (!contract || !publicClient) return [];
  
  try {
    setLoadingCampaigns(true);
    
    const campaignCount = await publicClient.readContract({
      address: actualContractAddress,
      abi: sovereignSeasAbi,
      functionName: 'getCampaignCount',
    }) as bigint;
    
    const campaignPromises = [];
    for (let i = 0; i < Number(campaignCount); i++) {
      campaignPromises.push(publicClient.readContract({
        address: actualContractAddress,
        abi: sovereignSeasAbi,
        functionName: 'getCampaign',
        args: [BigInt(i)],
      }));
    }
    
    const campaignResults = await Promise.all(campaignPromises);
    
    //don't return campaigns whose ids are in spam
    const spam: bigint[] = process.env.NEXT_PUBLIC_SPAM_CAMPAIGNS 
      ? process.env.NEXT_PUBLIC_SPAM_CAMPAIGNS.split(',').map((id: string) => BigInt(id)) 
      : [];

    const formattedCampaigns = await (await Promise.all(
      campaignResults.map(async (result: any) => {
        return {
          id: result[0],
          admin: result[1],
          name: result[2],
          description: result[3],
          logo: await formatIpfsUrl(result[4]), // Await the logo URL
          demoVideo: await formatIpfsUrl(result[5]), // Await the demo video URL
          startTime: result[6],
          endTime: result[7],
          adminFeePercentage: result[8],
          voteMultiplier: result[9],
          maxWinners: result[10],
          useQuadraticDistribution: result[11],
          active: result[12],
          totalFunds: result[13]
        } as Campaign;
      })
    )).filter((campaign: { id: bigint; }) => !spam.includes(campaign.id));
    
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
      address: actualContractAddress,
      abi: sovereignSeasAbi,
      functionName: 'getProjectCount',
      args: [BigInt(campaignId)],
    }) as bigint;
    
    const projectPromises = [];
    for (let i = 0; i < Number(projectCount); i++) {
      projectPromises.push(publicClient.readContract({
        address: actualContractAddress,
        abi: sovereignSeasAbi,
        functionName: 'getProject',
        args: [BigInt(campaignId), BigInt(i)],
      }));
    }
    
    const projectResults = await Promise.all(projectPromises);
    
    // Format the IPFS links in project data
    return await Promise.all(
      (projectResults as Project[]).map(async (project: Project) => {
        console.log("project logo", project.logo);
        return {
          ...project,
          // Await the formatted IPFS URLs
          logo: await formatIpfsUrl(project.logo),
          demoVideo: await formatIpfsUrl(project.demoVideo),
          githubLink: await formatIpfsUrl(project.githubLink),
        };
      })
    ) as Project[];
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
        address: actualContractAddress,
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
        address: actualContractAddress,
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
        address: actualContractAddress,
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
        address: actualContractAddress,
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
        address: actualContractAddress,
        abi: sovereignSeasAbi,
        functionName: 'getUserVoteHistory',
        args: [walletAddress],
      }) as Vote[];
    } catch (error) {
      console.error('Error getting user vote history:', error);
      return [];
    }
  };

  // Vote for a project (updated for native token)
  const vote = async (campaignId: bigint | number, projectId: bigint | number, amount: string) => {
    if (!walletClient || !publicClient) return;
    
    try {
      const amountInWei = parseEther(amount);
      
      // Direct vote with native token (no approval needed)
      writeContract({
        address: actualContractAddress,
        abi: sovereignSeasAbi,
        functionName: 'vote',
        args: [BigInt(campaignId), BigInt(projectId)],
        value: amountInWei
      });
      
      await publicClient.waitForTransactionReceipt({ hash: writeData as `0x${string}` });
    } catch (error) {
      console.error('Error voting for project:', error);
    }
  };

  // Add a new super admin
  const addSuperAdmin = async (newAdminAddress: string) => {
    if (!walletClient || !isSuperAdmin || !publicClient) return;
    
    try {
      writeContract({
        address: actualContractAddress,
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
        address: actualContractAddress,
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
        address: actualContractAddress,
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
        address: actualContractAddress,
        abi: sovereignSeasAbi,
        functionName: 'removeCampaignAdmin',
        args: [BigInt(campaignId), adminAddress],
      });
      await publicClient.waitForTransactionReceipt({ hash: writeData as `0x${string}` });
    } catch (error) {
      console.error('Error removing campaign admin:', error);
    }
  };

  // Create a new campaign (updated for native token)
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
      // Create the campaign with native token fee
      const campaignFee = parseEther(CAMPAIGN_CREATION_FEE);
      
      writeContract({
        address: actualContractAddress,
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
        value: campaignFee
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
        address: actualContractAddress,
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

  // Submit a project to a campaign (updated for native token)
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
      // Submit the project with native token fee
      const projectFee = parseEther(PROJECT_CREATION_FEE);
      
      // Check if the user is a campaign admin
      const isAdmin = await isCampaignAdmin(campaignId);
      
      writeContract({
        address: actualContractAddress,
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
        // Only send value if not an admin
        value: isAdmin ? BigInt(0) : projectFee
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
        address: actualContractAddress,
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
        address: actualContractAddress,
        abi: sovereignSeasAbi,
        functionName: 'approveProject',
        args: [BigInt(campaignId), BigInt(projectId)],
      });
      await publicClient.waitForTransactionReceipt({ hash: writeData as `0x${string}` });
    } catch (error) {
      console.error('Error approving project:', error);
    }
  };

  // Deactivate a project (new function)
  const deactivateProject = async (campaignId: bigint | number, projectId: bigint | number) => {
    if (!walletClient || !publicClient) return;
    
    try {
      writeContract({
        address: actualContractAddress,
        abi: sovereignSeasAbi,
        functionName: 'deactivateProject',
        args: [BigInt(campaignId), BigInt(projectId)],
      });
      await publicClient.waitForTransactionReceipt({ hash: writeData as `0x${string}` });
    } catch (error) {
      console.error('Error deactivating project:', error);
    }
  };

  // Deactivate a campaign (new function)
  const deactivateCampaign = async (campaignId: bigint | number) => {
    if (!walletClient || !publicClient || !isSuperAdmin) return;
    
    try {
      writeContract({
        address: actualContractAddress,
        abi: sovereignSeasAbi,
        functionName: 'deactivateCampaign',
        args: [BigInt(campaignId)],
      });
      await publicClient.waitForTransactionReceipt({ hash: writeData as `0x${string}` });
    } catch (error) {
      console.error('Error deactivating campaign:', error);
    }
  };

  // Distribute funds
  const distributeFunds = async (campaignId: bigint | number) => {
    if (!walletClient || !publicClient) return;
    
    try {
      writeContract({
        address: actualContractAddress,
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
    // Config
    contractAddress: actualContractAddress,
    
    // Clients
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
    deactivateCampaign,
    
    // Campaign Admin functions
    addCampaignAdmin,
    removeCampaignAdmin,
    
    // Write functions
    createCampaign,
    updateCampaign,
    submitProject,
    updateProject,
    approveProject,
    deactivateProject,
    vote,
    distributeFunds,
    
    // Helper functions
    isCampaignActive,
    getCampaignTimeRemaining,
    formatCampaignTime,
    formatTokenAmount,
  };
};