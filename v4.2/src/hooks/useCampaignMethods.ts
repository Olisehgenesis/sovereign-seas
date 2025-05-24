// hooks/useCampaignMethods.ts

import { useWriteContract, useReadContract, useReadContracts } from 'wagmi'
import { parseEther, formatEther, Address, type Abi } from 'viem'
import { contractABI as abi } from '@/abi/seas4ABI'
import { useState, useEffect, useCallback } from 'react'

// Types for better TypeScript support
export interface CampaignMetadata {
  mainInfo: string
  additionalInfo: string
  customDistributionData: string
}

export interface Campaign {
  id: bigint
  admin: Address
  name: string
  description: string
  startTime: bigint
  endTime: bigint
  adminFeePercentage: bigint
  maxWinners: bigint
  useQuadraticDistribution: boolean
  useCustomDistribution: boolean
  payoutToken: Address
  feeToken: Address
  active: boolean
  totalFunds: bigint
}

export interface CampaignDetails {
  campaign: Campaign
  metadata: CampaignMetadata
}

// Enhanced Campaign interface for the component
export interface EnhancedCampaign {
  id: number
  admin: Address
  name: string
  description: string
  startTime: bigint
  endTime: bigint
  adminFeePercentage: number
  maxWinners: number
  useQuadraticDistribution: boolean
  useCustomDistribution: boolean
  payoutToken: Address
  active: boolean
  totalFunds: bigint
  metadata?: {
    mainInfo: string
    additionalInfo: string
    customDistributionData: string
    [key: string]: any
  }
  status: 'upcoming' | 'active' | 'ended' | 'paused'
  daysRemaining?: number
  fundingProgress?: number
}

export interface Participation {
  approved: boolean
  voteCount: bigint
  fundsReceived: bigint
}

export interface Vote {
  voter: Address
  campaignId: bigint
  projectId: bigint
  token: Address
  amount: bigint
  celoEquivalent: bigint
}

// Add debug logging utility
const logDebug = (section: string, data: any, type: 'info' | 'error' | 'warn' = 'info') => {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    section,
    data
  };

  switch (type) {
    case 'error':
      console.error('🔴', logData);
      break;
    case 'warn':
      console.warn('🟡', logData);
      break;
    default:
      console.log('🟢', logData);
  }
};



const celoToken = import.meta.env.VITE_CELO_TOKEN;
const cusdToken = import.meta.env.VITE_CUSD_TOKEN;

// Fixed hook for creating a new campaign
export function useCreateCampaign(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess, data } = useWriteContract();

  const createCampaign = async ({
    name,
    description,
    mainInfo,
    additionalInfo,
    startTime,
    endTime,
    adminFeePercentage,
    maxWinners,
    useQuadraticDistribution,
    useCustomDistribution,
    customDistributionData,
    payoutToken,
    feeToken,
    feeAmount // Add this parameter
  }: {
    name: string;
    description: string;
    mainInfo: string;
    additionalInfo: string;
    startTime: bigint;
    endTime: bigint;
    adminFeePercentage: bigint;
    maxWinners: bigint;
    useQuadraticDistribution: boolean;
    useCustomDistribution: boolean;
    customDistributionData: string;
    payoutToken: Address;
    feeToken: Address;
    feeAmount: bigint; // The calculated fee amount
  }) => {
    try {
      const params = {
        name,
        descriptionLength: description.length,
        mainInfoLength: mainInfo.length,
        additionalInfoLength: additionalInfo.length,
        startTime: startTime.toString(),
        endTime: endTime.toString(),
        adminFeePercentage: adminFeePercentage.toString(),
        maxWinners: maxWinners.toString(),
        useQuadraticDistribution,
        useCustomDistribution,
        customDistributionDataLength: customDistributionData.length,
        payoutToken,
        feeToken,
        feeAmount: feeAmount.toString()
      }

      console.log("Creating campaign with data: ", params);

      // Check if paying fee in native CELO (assuming CELO token address)
      const isCeloFee = feeToken.toLowerCase() === celoToken.toLowerCase()
      console.log("isCeloFee: ", isCeloFee);
      const result = await writeContract({
        address: contractAddress,
        abi,
        functionName: 'createCampaign',
        args: [
          name,
          description,
          mainInfo,
          additionalInfo,
          startTime,
          endTime,
          adminFeePercentage,
          maxWinners,
          useQuadraticDistribution,
          useCustomDistribution,
          customDistributionData,
          payoutToken,
          feeToken
        ],
        // Include value for native CELO payments
        ...(isCeloFee && { value: feeAmount })
      });

      logDebug('Campaign Creation Success', {
        transactionHash: result,
        timestamp: new Date().toISOString(),
        feeAmount: feeAmount.toString(),
        isCeloFee
      });

      return result;
    } catch (err) {
      logDebug('Campaign Creation Error', {
        error: err,
        message: err.message,
        code: err.code,
        stack: err.stack,
        cause: err.cause
      }, 'error');
      throw err;
    }
  };

  // Log state changes
  useEffect(() => {
    logDebug('Contract Write State Changed', {
      isPending,
      isError,
      isSuccess,
      error: error?.message,
      data
    });
  }, [isPending, isError, isSuccess, error, data]);

  return {
    createCampaign,
    isPending,
    isError,
    error,
    isSuccess,
    data
  };
}

// Hook for reading campaign creation fee
export function useCampaignCreationFee(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'campaignCreationFee',
    query: {
      enabled: !!contractAddress
    }
  });

  return {
    campaignCreationFee: data as bigint || 0n,
    campaignCreationFeeFormatted: data ? formatEther(data as bigint) : '0',
    isLoading,
    error,
    refetch
  };
}

// Hook for reading project addition fee
export function useProjectAdditionFee(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'projectAdditionFee',
    query: {
      enabled: !!contractAddress
    }
  });

  return {
    projectAdditionFee: data as bigint || 0n,
    projectAdditionFeeFormatted: data ? formatEther(data as bigint) : '0',
    isLoading,
    error,
    refetch
  };
}

// Hook for calculating fee in different token
export function useCalculateFeeInToken(
  contractAddress: Address, 
  baseFeeAmount: bigint, 
  targetToken: Address
) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getExpectedConversionRate',
    args: [
      '0x471ece3750da237f93b8e339c536989b8978a438', // CELO token address
      targetToken,
      baseFeeAmount
    ],
    query: {
      enabled: !!contractAddress && !!targetToken && baseFeeAmount > 0n
    }
  });

  // Add 1% buffer for slippage as per contract logic
  const feeWithBuffer = data ? (data as bigint * 101n) / 100n : 0n;

  return {
    feeAmount: feeWithBuffer,
    feeAmountFormatted: feeWithBuffer ? formatEther(feeWithBuffer) : '0',
    isLoading,
    error,
    refetch
  };
}

// Hook for checking if user can bypass fees
export function useCanBypassFees(
  contractAddress: Address,
  userAddress: Address,
  campaignId?: bigint
) {
  const [canBypass, setCanBypass] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is super admin
  const { data: isSuperAdmin } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'superAdmins',
    args: [userAddress],
    query: {
      enabled: !!contractAddress && !!userAddress
    }
  });

  // Check if user is campaign admin (if campaignId provided)
  const { data: isCampaignAdmin } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'isCampaignAdmin',
    args: [campaignId || 0n, userAddress],
    query: {
      enabled: !!contractAddress && !!userAddress && campaignId !== undefined
    }
  });

  useEffect(() => {
    const canBypassFees = Boolean(isSuperAdmin) || (campaignId !== undefined && Boolean(isCampaignAdmin));
    setCanBypass(canBypassFees);
    setIsLoading(false);
  }, [isSuperAdmin, isCampaignAdmin, campaignId]);

  return {
    canBypass,
    isLoading
  };
}

// Enhanced hook that includes fee calculation
export function useCreateCampaignWithFees(contractAddress: Address, userAddress: Address) {
  const { createCampaign, isPending, isError, error, isSuccess, data } = useCreateCampaign(contractAddress);
  const { campaignCreationFee } = useCampaignCreationFee(contractAddress);
  const { canBypass } = useCanBypassFees(contractAddress, userAddress);

  const createCampaignWithFees = async (params: {
    name: string;
    description: string;
    mainInfo: string;
    additionalInfo: string;
    startTime: bigint;
    endTime: bigint;
    adminFeePercentage: bigint;
    maxWinners: bigint;
    useQuadraticDistribution: boolean;
    useCustomDistribution: boolean;
    customDistributionData: string;
    payoutToken: Address;
    feeToken: Address;
  }) => {
    let feeAmount = 0n;
    
    if (!canBypass && campaignCreationFee) {
      // If paying with CELO, use base fee
      console.log("params.feeToken: ", params.feeToken);
      if (params.feeToken.toLowerCase() === celoToken.toLowerCase()) {
        feeAmount = campaignCreationFee;
      } else {
        // For other tokens, you would need to calculate the equivalent amount
        // This requires calling getExpectedConversionRate or similar
        throw new Error('Non-CELO fee payment not implemented in this example');
      }
    }

    return createCampaign({
      ...params,
      feeAmount
    });
  };

  return {
    createCampaignWithFees,
    isPending,
    isError,
    error,
    isSuccess,
    data,
    campaignCreationFee,
    canBypass
  };
}

// Similar pattern for addProjectToCampaign
export function useAddProjectToCampaign(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();

  const addProjectToCampaign = async ({
    campaignId,
    projectId,
    feeToken,
    feeAmount
  }: {
    campaignId: bigint;
    projectId: bigint;
    feeToken: Address;
    feeAmount: bigint;
  }) => {
    try {
      const isCeloFee = feeToken.toLowerCase() === celoToken.toLowerCase()                     

      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'addProjectToCampaign',
        args: [campaignId, projectId, feeToken],
        // Include value for native CELO payments
        ...(isCeloFee && { value: feeAmount })
      });
    } catch (err) {
      console.error('Error adding project to campaign:', err);
      throw err;
    }
  };

  return {
    addProjectToCampaign,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Enhanced hook for adding project with fee handling
export function useAddProjectToCampaignWithFees(
  contractAddress: Address, 
  userAddress: Address, 
  campaignId: bigint
) {
  const { addProjectToCampaign, isPending, isError, error, isSuccess } = useAddProjectToCampaign(contractAddress);
  const { projectAdditionFee } = useProjectAdditionFee(contractAddress);
  const { canBypass } = useCanBypassFees(contractAddress, userAddress, campaignId);

  const addProjectWithFees = async (params: {
    campaignId: bigint;
    projectId: bigint;
    feeToken: Address;
  }) => {
    let feeAmount = 0n;
    
    if (!canBypass && projectAdditionFee) {
      // If paying with CELO, use base fee
      if (params.feeToken.toLowerCase() === celoToken.toLowerCase()) {
        feeAmount = projectAdditionFee;
      } else {
        // For other tokens, calculate equivalent amount
        throw new Error('Non-CELO fee payment not implemented in this example');
      }
    }

    return addProjectToCampaign({
      ...params,
      feeAmount
    });
  };

  return {
    addProjectWithFees,
    isPending,
    isError,
    error,
    isSuccess,
    projectAdditionFee,
    canBypass
  };
}





// Hook for creating a new campaign
// Hook for updating campaign
export function useUpdateCampaign(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const updateCampaign = async ({
    campaignId,
    name,
    description,
    startTime,
    endTime,
    adminFeePercentage,
    maxWinners,
    useQuadraticDistribution,
    useCustomDistribution,
    payoutToken
  }: {
    campaignId: bigint
    name: string
    description: string
    startTime: bigint
    endTime: bigint
    adminFeePercentage: bigint
    maxWinners: bigint
    useQuadraticDistribution: boolean
    useCustomDistribution: boolean
    payoutToken: Address
  }) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'updateCampaign',
        args: [
          campaignId,
          name,
          description,
          startTime,
          endTime,
          adminFeePercentage,
          maxWinners,
          useQuadraticDistribution,
          useCustomDistribution,
          payoutToken
        ]
      })
    } catch (err) {
      console.error('Error updating campaign:', err)
      throw err
    }
  }

  return {
    updateCampaign,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for updating campaign metadata
export function useUpdateCampaignMetadata(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const updateCampaignMetadata = async ({
    campaignId,
    mainInfo,
    additionalInfo
  }: {
    campaignId: bigint
    mainInfo: string
    additionalInfo: string
  }) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'updateCampaignMetadata',
        args: [campaignId, mainInfo, additionalInfo]
      })
    } catch (err) {
      console.error('Error updating campaign metadata:', err)
      throw err
    }
  }

  return {
    updateCampaignMetadata,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for updating custom distribution data
export function useUpdateCustomDistributionData(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const updateCustomDistributionData = async ({
    campaignId,
    customDistributionData
  }: {
    campaignId: bigint
    customDistributionData: string
  }) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'updateCustomDistributionData',
        args: [campaignId, customDistributionData]
      })
    } catch (err) {
      console.error('Error updating custom distribution data:', err)
      throw err
    }
  }

  return {
    updateCustomDistributionData,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for adding campaign admin
export function useAddCampaignAdmin(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const addCampaignAdmin = async ({
    campaignId,
    newAdmin
  }: {
    campaignId: bigint
    newAdmin: Address
  }) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'addCampaignAdmin',
        args: [campaignId, newAdmin]
      })
    } catch (err) {
      console.error('Error adding campaign admin:', err)
      throw err
    }
  }

  return {
    addCampaignAdmin,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for removing campaign admin
export function useRemoveCampaignAdmin(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const removeCampaignAdmin = async ({
    campaignId,
    admin
  }: {
    campaignId: bigint
    admin: Address
  }) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'removeCampaignAdmin',
        args: [campaignId, admin]
      })
    } catch (err) {
      console.error('Error removing campaign admin:', err)
      throw err
    }
  }

  return {
    removeCampaignAdmin,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for approving project in campaign
export function useApproveProject(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const approveProject = async ({
    campaignId,
    projectId
  }: {
    campaignId: bigint
    projectId: bigint
  }) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'approveProject',
        args: [campaignId, projectId]
      })
    } catch (err) {
      console.error('Error approving project:', err)
      throw err
    }
  }

  return {
    approveProject,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for voting
export function useVote(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const vote = async ({
    campaignId,
    projectId,
    token,
    amount,
    bypassCode = '0x0000000000000000000000000000000000000000000000000000000000000000'
  }: {
    campaignId: bigint
    projectId: bigint
    token: Address
    amount: bigint
    bypassCode?: string
  }) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'vote',
        args: [campaignId, projectId, token, amount, bypassCode]
      })
    } catch (err) {
      console.error('Error voting:', err)
      throw err
    }
  }

  return {
    vote,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for distributing funds
export function useDistributeFunds(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const distributeFunds = async ({
    campaignId
  }: {
    campaignId: bigint
  }) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'distributeFunds',
        args: [campaignId]
      })
    } catch (err) {
      console.error('Error distributing funds:', err)
      throw err
    }
  }

  return {
    distributeFunds,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for setting user max vote amount
export function useSetUserMaxVoteAmount(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const setUserMaxVoteAmount = async ({
    campaignId,
    user,
    maxAmount
  }: {
    campaignId: bigint
    user: Address
    maxAmount: bigint
  }) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'setUserMaxVoteAmount',
        args: [campaignId, user, maxAmount]
      })
    } catch (err) {
      console.error('Error setting user max vote amount:', err)
      throw err
    }
  }

  return {
    setUserMaxVoteAmount,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for reading campaign count
export function useCampaignCount(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getCampaignCount',
    query: {
      enabled: !!contractAddress
    }
  })

  return {
    campaignCount: data as bigint,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading a single campaign
export function useSingleCampaign(contractAddress: Address, campaignId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getCampaign',
    args: [campaignId],
    query: {
      enabled: !!contractAddress && campaignId !== undefined
    }
  })

  const campaign = data ? {
    id: data[0],
    admin: data[1],
    name: data[2],
    description: data[3],
    startTime: data[4],
    endTime: data[5],
    adminFeePercentage: data[6],
    maxWinners: data[7],
    useQuadraticDistribution: data[8],
    useCustomDistribution: data[9],
    payoutToken: data[10],
    active: data[11],
    totalFunds: data[12]
  } as Campaign : null

  return {
    campaign,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading campaign metadata
export function useCampaignMetadata(contractAddress: Address, campaignId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getCampaignMetadata',
    args: [campaignId],
    query: {
      enabled: !!contractAddress && campaignId !== undefined
    }
  })

  const metadata = data ? {
    mainInfo: data[0],
    additionalInfo: data[1],
    customDistributionData: data[2]
  } : null

  return {
    metadata,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading complete campaign details (combines basic + metadata)
export function useCampaignDetails(contractAddress: Address, campaignId: bigint) {
  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: [
      {
        address: contractAddress,
        abi,
        functionName: 'getCampaign',
        args: [campaignId]
      },
      {
        address: contractAddress,
        abi,
        functionName: 'getCampaignMetadata',
        args: [campaignId]
      }
    ],
    query: {
      enabled: !!contractAddress && campaignId !== undefined
    }
  })

  const campaignDetails: CampaignDetails | null = data && data[0].result && data[1].result ? {
    campaign: {
      id: data[0].result[0],
      admin: data[0].result[1],
      name: data[0].result[2],
      description: data[0].result[3],
      startTime: data[0].result[4],
      endTime: data[0].result[5],
      adminFeePercentage: data[0].result[6],
      maxWinners: data[0].result[7],
      useQuadraticDistribution: data[0].result[8],
      useCustomDistribution: data[0].result[9],
      payoutToken: data[0].result[10],
      active: data[0].result[11],
      totalFunds: data[0].result[12]
    },
    metadata: {
      mainInfo: data[1].result[0],
      additionalInfo: data[1].result[1],
      customDistributionData: data[1].result[2]
    }
  } : null

  return {
    campaignDetails,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading multiple campaigns at once
export function useCampaigns(contractAddress: Address, campaignIds: bigint[]) {
  const contracts = campaignIds.flatMap(id => [
    {
      address: contractAddress,
      abi,
      functionName: 'getCampaign',
      args: [id]
    },
    {
      address: contractAddress,
      abi,
      functionName: 'getCampaignMetadata',
      args: [id]
    }
  ])

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: contracts as unknown as readonly {
      address: Address
      abi: Abi
      functionName: string
      args: readonly [bigint]
    }[],
    query: {
      enabled: !!contractAddress && campaignIds.length > 0
    }
  })

  const campaigns: CampaignDetails[] = []
  
  if (data) {
    for (let i = 0; i < campaignIds.length; i++) {
      const basicIndex = i * 2
      const metadataIndex = i * 2 + 1
      
      if (data[basicIndex]?.result && data[metadataIndex]?.result) {
        campaigns.push({
          campaign: {
            id: data[basicIndex].result[0],
            admin: data[basicIndex].result[1],
            name: data[basicIndex].result[2],
            description: data[basicIndex].result[3],
            startTime: data[basicIndex].result[4],
            endTime: data[basicIndex].result[5],
            adminFeePercentage: data[basicIndex].result[6],
            maxWinners: data[basicIndex].result[7],
            useQuadraticDistribution: data[basicIndex].result[8],
            useCustomDistribution: data[basicIndex].result[9],
            payoutToken: data[basicIndex].result[10],
            active: data[basicIndex].result[11],
            totalFunds: data[basicIndex].result[12]
          },
          metadata: {
            mainInfo: data[metadataIndex].result[0],
            additionalInfo: data[metadataIndex].result[1],
            customDistributionData: data[metadataIndex].result[2]
          }
        })
      }
    }
  }

  return {
    campaigns,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading all campaigns (use with caution for large datasets)
export function useAllCampaigns(contractAddress: Address) {
  const { campaignCount, isLoading: countLoading } = useCampaignCount(contractAddress)
  
  const campaignIds = campaignCount ? 
    Array.from({ length: Number(campaignCount) }, (_, i) => BigInt(i)) : []

  const { campaigns, isLoading: campaignsLoading, error, refetch } = useCampaigns(contractAddress, campaignIds)

  return {
    campaigns,
    isLoading: countLoading || campaignsLoading,
    error,
    refetch
  }
}

// Main hook for campaign methods - following the same pattern as useProject
export function useCampaign(contractAddress: Address, campaignId?: string | number) {
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize the hook
  useEffect(() => {
    if (contractAddress) {
      setIsInitialized(true)
    }
  }, [contractAddress])

  // Get campaign count
  const { campaignCount, isLoading: countLoading, error: countError } = useCampaignCount(contractAddress)

  // Get all campaigns using the useAllCampaigns hook
  const { campaigns: allCampaignsData, isLoading: campaignsLoading, error: campaignsError } = useAllCampaigns(contractAddress)

  // Helper function to determine campaign status
  const getCampaignStatus = useCallback((campaign: Campaign): 'upcoming' | 'active' | 'ended' | 'paused' => {
    const now = Math.floor(Date.now() / 1000)
    const start = Number(campaign.startTime)
    const end = Number(campaign.endTime)
    
    if (now < start) {
      return 'upcoming'
    } else if (now >= start && now <= end && campaign.active) {
      return 'active'
    } else if (now > end) {
      return 'ended'
    } else {
      return 'paused'
    }
  }, [])

  // Helper function to calculate days remaining
  const getDaysRemaining = useCallback((campaign: Campaign): number => {
    const now = Math.floor(Date.now() / 1000)
    const end = Number(campaign.endTime)
    const start = Number(campaign.startTime)
    
    if (now < start) {
      // Days until start
      return Math.ceil((start - now) / (60 * 60 * 24))
    } else if (now <= end) {
      // Days until end
      return Math.ceil((end - now) / (60 * 60 * 24))
    } else {
      return 0
    }
  }, [])

  // Load campaigns function that returns properly formatted data
  const loadCampaigns = useCallback(async (): Promise<EnhancedCampaign[]> => {
    if (!contractAddress || !allCampaignsData) {
      return []
    }

    try {
      const enhancedCampaigns: EnhancedCampaign[] = allCampaignsData.map((campaignDetails, index) => {
        const { campaign, metadata } = campaignDetails
        
        // Parse metadata if available
        let parsedMetadata = { ...metadata }
        try {
          if (metadata.mainInfo) {
            const mainInfo = JSON.parse(metadata.mainInfo)
            parsedMetadata = { ...parsedMetadata, ...mainInfo }
          }
        } catch (e) {
          console.warn('Failed to parse main info for campaign', campaign.id, e)
        }

        try {
          if (metadata.additionalInfo) {
            const additionalInfo = JSON.parse(metadata.additionalInfo)
            parsedMetadata = { ...parsedMetadata, ...additionalInfo }
          }
        } catch (e) {
          console.warn('Failed to parse additional info for campaign', campaign.id, e)
        }

        const status = getCampaignStatus(campaign)
        const daysRemaining = getDaysRemaining(campaign)

        return {
          id: Number(campaign.id),
          admin: campaign.admin,
          name: campaign.name,
          description: campaign.description,
          startTime: campaign.startTime,
          endTime: campaign.endTime,
          adminFeePercentage: Number(campaign.adminFeePercentage),
          maxWinners: Number(campaign.maxWinners),
          useQuadraticDistribution: campaign.useQuadraticDistribution,
          useCustomDistribution: campaign.useCustomDistribution,
          payoutToken: campaign.payoutToken,
          active: campaign.active,
          totalFunds: campaign.totalFunds,
          metadata: parsedMetadata,
          status,
          daysRemaining
        }
      })

      return enhancedCampaigns
    } catch (error) {
      console.error('Error processing campaigns data:', error)
      return []
    }
  }, [contractAddress, allCampaignsData, getCampaignStatus, getDaysRemaining])

  // Format token amount
  const formatTokenAmount = useCallback((amount: bigint | string | number): string => {
    try {
      if (typeof amount === 'string') {
        return formatEther(BigInt(amount))
      }
      if (typeof amount === 'number') {
        return formatEther(BigInt(amount))
      }
      return formatEther(amount)
    } catch (error) {
      console.error('Error formatting token amount:', error)
      return '0'
    }
  }, [])

  const isLoading = countLoading || campaignsLoading
  const error = countError || campaignsError

  return {
    isInitialized,
    loadCampaigns,
    formatTokenAmount,
    getCampaignStatus,
    getDaysRemaining,
    campaignCount: campaignCount ? Number(campaignCount) : 0,
    isLoadingCount: countLoading,
    isLoading,
    error
  }
}

// Hook for reading project participation in a campaign (same as before)
export function useParticipation(
  contractAddress: Address, 
  campaignId: bigint, 
  projectId: bigint
) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getParticipation',
    args: [campaignId, projectId]
  })

  const participation = data ? {
    approved: data[0],
    voteCount: data[1],
    fundsReceived: data[2]
  } : null

  return {
    participation,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading user vote history
export function useUserVoteHistory(contractAddress: Address, user: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getUserVoteHistory',
    args: [user],
    query: {
      enabled: !!contractAddress && !!user
    }
  })

  return {
    voteHistory: data as Vote[] || [],
    isLoading,
    error,
    refetch
  }
}

// Hook for reading user votes for a project with a specific token
export function useUserVotesForProjectWithToken(
  contractAddress: Address,
  campaignId: bigint,
  user: Address,
  projectId: bigint,
  token: Address
) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getUserVotesForProjectWithToken',
    args: [campaignId, user, projectId, token]
  })

  return {
    userVotes: data as bigint,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading total user votes in a campaign
export function useUserTotalVotesInCampaign(
  contractAddress: Address,
  campaignId: bigint,
  user: Address
) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getUserTotalVotesInCampaign',
    args: [campaignId, user],
    query: {
      enabled: !!contractAddress && campaignId !== undefined && !!user
    }
  })

  return {
    totalVotes: data as bigint,
    isLoading,
    error,
    refetch
  }
}

// Hook for checking if address is campaign admin
export function useIsCampaignAdmin(
  contractAddress: Address,
  campaignId: bigint,
  admin: Address
) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'isCampaignAdmin',
    args: [campaignId, admin],
    query: {
      enabled: !!contractAddress && campaignId !== undefined && !!admin
    }
  })

  return {
    isAdmin: data as boolean,
    isLoading,
    error,
    refetch
  }
}

// Hook for getting sorted projects in a campaign
export function useSortedProjects(contractAddress: Address, campaignId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getSortedProjects',
    args: [campaignId],
    query: {
      enabled: !!contractAddress && campaignId !== undefined
    }
  })

  return {
    sortedProjectIds: data as bigint[] || [],
    isLoading,
    error,
    refetch
  }
}

// Hook for getting campaign voted tokens
export function useCampaignVotedTokens(contractAddress: Address, campaignId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getCampaignVotedTokens',
    args: [campaignId],
    query: {
      enabled: !!contractAddress && campaignId !== undefined
    }
  })

  return {
    votedTokens: data as Address[] || [],
    isLoading,
    error,
    refetch
  }
}

// Hook for getting campaign token amount
export function useCampaignTokenAmount(
  contractAddress: Address,
  campaignId: bigint,
  token: Address
) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getCampaignTokenAmount',
    args: [campaignId, token]
  })

  return {
    tokenAmount: data as bigint,
    isLoading,
    error,
    refetch
  }
}

// Utility hook for campaign fee amounts
export function useCampaignFees(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: [
      {
        address: contractAddress,
        abi,
        functionName: 'campaignCreationFee'
      }
    ]
  })

  return {
    campaignCreationFee: data?.[0]?.result ?? 0n,
    campaignCreationFeeFormatted: data?.[0]?.result ? formatEther(data[0].result as bigint) : '0',
    isLoading,
    error,
    refetch
  }
}

// Helper function to parse JSON metadata safely
export function parseCampaignMetadata(jsonString: string) {
  try {
    return JSON.parse(jsonString)
  } catch (error) {
    console.warn('Failed to parse campaign metadata JSON:', error)
    return {}
  }
}

// Helper function to format campaign for display
export function formatCampaignForDisplay(campaignDetails: CampaignDetails) {
  if (!campaignDetails) return null

  const { campaign, metadata } = campaignDetails
  
  return {
    ...campaign,
    ...metadata,
    mainInfoParsed: parseCampaignMetadata(metadata.mainInfo),
    additionalInfoParsed: parseCampaignMetadata(metadata.additionalInfo),
    customDistributionDataParsed: parseCampaignMetadata(metadata.customDistributionData),
    startDate: new Date(Number(campaign.startTime) * 1000),
    endDate: new Date(Number(campaign.endTime) * 1000),
    isActive: campaign.active,
    totalFundsFormatted: formatEther(campaign.totalFunds)
  }
}

export default {
  useCreateCampaign,
  useUpdateCampaign,
  useUpdateCampaignMetadata,
  useUpdateCustomDistributionData,
  useAddCampaignAdmin,
  useRemoveCampaignAdmin,
  useApproveProject,
  useVote,
  useDistributeFunds,
  useSetUserMaxVoteAmount,
  useCampaign,
  useCampaignMetadata,
  useCampaignDetails,
  useCampaignCount,
  useCampaigns,
  useAllCampaigns,
  useSingleCampaign,
  useParticipation,
  useUserVoteHistory,
  useUserVotesForProjectWithToken,
  useUserTotalVotesInCampaign,
  useIsCampaignAdmin,
  useSortedProjects,
  useCampaignVotedTokens,
  useCampaignTokenAmount,
  useCampaignFees,
  parseCampaignMetadata,
  formatCampaignForDisplay
}