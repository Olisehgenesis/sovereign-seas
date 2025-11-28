// hooks/useCampaignMethods.ts

import { useReadContract, useWriteContract, useReadContracts, useAccount, useSendTransaction } from 'wagmi';
import { formatEther } from 'viem';
import type { Address, Abi } from 'viem';
import { useState, useEffect, useCallback } from 'react';
import { contractABI as abi } from '@/abi/seas4ABI';
import { getReferralTag, submitReferral } from '@divvi/referral-sdk';
import { Interface } from "ethers";
import { getCeloTokenAddress } from '@/utils/contractConfig';
import { useChainSwitch } from './useChainSwitch';

// Divvi Integration - will be generated dynamically with user address
const CONSUMER_ADDRESS = '0x53eaF4CD171842d8144e45211308e5D90B4b0088' as const

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



const celoToken = getCeloTokenAddress();

// Fixed hook for creating a new campaign
export function useCreateCampaign(contractAddress: Address) {
  const { address: user } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();

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
      console.log('createCampaign - Function called with:');
      console.log('- contractAddress:', contractAddress);
      console.log('- isTestnet:', process.env.NEXT_PUBLIC_ENV === 'testnet');
      console.log('- VITE_CONTRACT_V4:', process.env.NEXT_PUBLIC_CONTRACT_V4);
      console.log('- VITE_CONTRACT_V4_TESTNET:', process.env.NEXT_PUBLIC_CONTRACT_V4_TESTNET);
      console.log('- feeAmount:', feeAmount.toString());
      console.log('- feeToken:', feeToken);
      console.log('- celoToken:', celoToken);

      // Check if paying fee in native CELO (assuming CELO token address)
      const isCeloFee = feeToken.toLowerCase() === celoToken.toLowerCase();
      console.log('- isCeloFee:', isCeloFee);
      
      // Divvi referral integration section
      const createCampaignInterface = new Interface(abi);

      const createCampaignData = createCampaignInterface.encodeFunctionData('createCampaign', [
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
      ]);
      
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet
      
      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = createCampaignData + referralTag;

      // Using sendTransactionAsync to support referral integration
      // The chain context is handled by the Wagmi provider configuration
      const result = await sendTransactionAsync({
        to: contractAddress,
        data: dataWithSuffix as `0x${string}`,
        value: isCeloFee ? feeAmount : 0n
      });

      console.log('createCampaign - Transaction submitted successfully');
      console.log('- Transaction hash:', result);
      console.log('- Value sent:', isCeloFee ? feeAmount.toString() : '0');

      // Submit the referral to Divvi
      try {
        await submitReferral({
          txHash: result as unknown as `0x${string}`,
          chainId: celoChainId
        });
        console.log('Referral submitted successfully');
      } catch (referralError) {
        console.error("Referral submission error:", referralError);
      }

      logDebug('Campaign Creation Success', {
        transactionHash: result,
        timestamp: new Date().toISOString(),
        feeAmount: feeAmount.toString(),
        isCeloFee
      });

      return result;
    } catch (err) {
      console.error('createCampaign - Error occurred:', err);
      logDebug('Campaign Creation Error', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        code: err instanceof Error ? (err as any).code : undefined,
        stack: err instanceof Error ? err.stack : undefined,
        // Remove cause property since it's not supported in the current TypeScript target
      }, 'error');
      throw err;
    }
  };

  return {
    createCampaign,
    isPending: false, // You can track state manually if needed
    isError: false,
    error: null,
    isSuccess: false
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
      celoToken, // CELO token address
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
  const { createCampaign } = useCreateCampaign(contractAddress);
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
    
    console.log('useCreateCampaignWithFees - Fee calculation:');
    console.log('- canBypass:', canBypass);
    console.log('- campaignCreationFee:', campaignCreationFee?.toString());
    console.log('- feeToken:', params.feeToken);
    console.log('- celoToken:', celoToken);
    
    if (!canBypass && campaignCreationFee) {
      // If paying with CELO, use base fee
      if (params.feeToken.toLowerCase() === celoToken.toLowerCase()) {
        feeAmount = campaignCreationFee;
        console.log('- Fee amount set to:', feeAmount.toString());
      } else {
        // For other tokens, you would need to calculate the equivalent amount
        // This requires calling getExpectedConversionRate or similar
        throw new Error('Non-CELO fee payment not implemented in this example');
      }
    } else if (canBypass) {
      console.log('- User can bypass fees, feeAmount remains 0');
    } else {
      console.log('- No campaign creation fee required, feeAmount remains 0');
    }

    console.log('- Final feeAmount:', feeAmount.toString());
    
    return createCampaign({
      ...params,
      feeAmount
    });
  };

  return {
    createCampaignWithFees,
    isPending: false, // You can track state manually if needed
    isError: false,
    error: null,
    isSuccess: false,
    campaignCreationFee,
    canBypass
  };
}

// Similar pattern for addProjectToCampaign
export function useAddProjectToCampaign(contractAddress: Address) {
  const { address: user } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();

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
      const isCeloFee = feeToken.toLowerCase() === celoToken.toLowerCase();
      
      // Divvi referral integration section
      const addProjectInterface = new Interface(abi);

      const addProjectData = addProjectInterface.encodeFunctionData('addProjectToCampaign', [
        campaignId, 
        projectId, 
        feeToken
      ]);
      
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet
      
      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = addProjectData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const result = await sendTransactionAsync({
        to: contractAddress,
        data: dataWithSuffix as `0x${string}`,
        value: isCeloFee ? feeAmount : 0n
      });

      // Submit the referral to Divvi
      try {
        await submitReferral({
          txHash: result as unknown as `0x${string}`,
          chainId: celoChainId
        });
        console.log('Referral submitted successfully');
      } catch (referralError) {
        console.error("Referral submission error:", referralError);
      }
    } catch (err) {
      console.error('Error adding project to campaign:', err);
      throw err;
    }
  };

  return {
    addProjectToCampaign,
    isPending: false, // You can track state manually if needed
    isError: false,
    error: null,
    isSuccess: false
  };
}

// Enhanced hook for adding project with fee handling
export function useAddProjectToCampaignWithFees(
  contractAddress: Address, 
  userAddress: Address, 
  campaignId: bigint
) {
  const { addProjectToCampaign } = useAddProjectToCampaign(contractAddress);
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
    isPending: false, // You can track state manually if needed
    isError: false,
    error: null,
    isSuccess: false,
    projectAdditionFee,
    canBypass
  };
}





// Hook for creating a new campaign
// Hook for updating campaign
export function useUpdateCampaign(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()
  const { ensureCorrectChain } = useChainSwitch()

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
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain()
      
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
  const { ensureCorrectChain } = useChainSwitch()

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
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain()
      
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
  const { ensureCorrectChain } = useChainSwitch()

  const updateCustomDistributionData = async ({
    campaignId,
    customDistributionData
  }: {
    campaignId: bigint
    customDistributionData: string
  }) => {
    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain()
      
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
    id: (data as any[])[0] as bigint,
    admin: (data as any[])[1] as Address,
    name: (data as any[])[2] as string,
    description: (data as any[])[3] as string,
    startTime: (data as any[])[4] as bigint,
    endTime: (data as any[])[5] as bigint,
    adminFeePercentage: (data as any[])[6] as bigint,
    maxWinners: (data as any[])[7] as bigint,
    useQuadraticDistribution: (data as any[])[8] as boolean,
    useCustomDistribution: (data as any[])[9] as boolean,
    payoutToken: (data as any[])[10] as Address,
    feeToken: (data as any[])[13] as Address,
    active: (data as any[])[11] as boolean,
    totalFunds: (data as any[])[12] as bigint
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
    mainInfo: (data as any[])[0] as string,
    additionalInfo: (data as any[])[1] as string,
    customDistributionData: (data as any[])[2] as string
  } : null

  return {
    metadata,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading complete campaign details
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
      id: (data[0].result as any[])[0] as bigint,
      admin: (data[0].result as any[])[1] as Address,
      name: (data[0].result as any[])[2] as string,
      description: (data[0].result as any[])[3] as string,
      startTime: (data[0].result as any[])[4] as bigint,
      endTime: (data[0].result as any[])[5] as bigint,
      adminFeePercentage: (data[0].result as any[])[6] as bigint,
      maxWinners: (data[0].result as any[])[7] as bigint,
      useQuadraticDistribution: (data[0].result as any[])[8] as boolean,
      useCustomDistribution: (data[0].result as any[])[9] as boolean,
      payoutToken: (data[0].result as any[])[10] as Address,
      feeToken: (data[0].result as any[])[13] as Address,
      active: (data[0].result as any[])[11] as boolean,
      totalFunds: (data[0].result as any[])[12] as bigint
    },
    metadata: {
      mainInfo: (data[1].result as any[])[0] as string,
      additionalInfo: (data[1].result as any[])[1] as string,
      customDistributionData: (data[1].result as any[])[2] as string
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
            id: (data[basicIndex].result as any[])[0] as bigint,
            admin: (data[basicIndex].result as any[])[1] as Address,
            name: (data[basicIndex].result as any[])[2] as string,
            description: (data[basicIndex].result as any[])[3] as string,
            startTime: (data[basicIndex].result as any[])[4] as bigint,
            endTime: (data[basicIndex].result as any[])[5] as bigint,
            adminFeePercentage: (data[basicIndex].result as any[])[6] as bigint,
            maxWinners: (data[basicIndex].result as any[])[7] as bigint,
            useQuadraticDistribution: (data[basicIndex].result as any[])[8] as boolean,
            useCustomDistribution: (data[basicIndex].result as any[])[9] as boolean,
            payoutToken: (data[basicIndex].result as any[])[10] as Address,
            feeToken: (data[basicIndex].result as any[])[13] as Address,
            active: (data[basicIndex].result as any[])[11] as boolean,
            totalFunds: (data[basicIndex].result as any[])[12] as bigint
          },
          metadata: {
            mainInfo: (data[metadataIndex].result as any[])[0] as string,
            additionalInfo: (data[metadataIndex].result as any[])[1] as string,
            customDistributionData: (data[metadataIndex].result as any[])[2] as string
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
  console.log('contractAddress', contractAddress)
  console.log('campaignId', campaignId)

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
        console.log('index', index )
        console.log('campaignDetails', campaignDetails)
        
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
    approved: (data as any[])[0] as boolean,
    voteCount: (data as any[])[1] as bigint,
    fundsReceived: (data as any[])[2] as bigint
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