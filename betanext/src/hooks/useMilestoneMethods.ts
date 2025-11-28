// hooks/useGrantsMethods.ts

import { useWriteContract, useReadContract, useReadContracts, useAccount, useSendTransaction } from 'wagmi'
import { formatEther, type Address, type Abi } from 'viem'
import { grantsABI as abi } from '@/abi/grantsABI' // You'll need to create this ABI file
import { useState, useEffect, useCallback, useMemo } from 'react'
import { executeTransactionWithDivvi, logDivviOperation } from '@/utils/divvi'

// Types for better TypeScript support
export interface GrantMetadata {
  title: string
  description: string
  requirements: string
  deliverables: string[]
  skills: string[]
  estimatedHours: number
  priority: 'low' | 'medium' | 'high'
  category: string
  eligibility: string
  contact: string
  [key: string]: any
}

export interface MilestoneMetadata {
  title: string
  description: string
  requirements: string
  deliverables: string[]
  percentage: number
  [key: string]: any
}

export interface ClaimMetadata {
  proofDescription: string
  evidenceLinks: string[]
  validationNotes: string
  [key: string]: any
}

export interface Grant {
  id: bigint
  creator: Address
  paymentToken: Address
  totalAmount: bigint
  remainingAmount: bigint
  deadline: bigint
  isSecured: boolean
  active: boolean
  grantType: GrantType
  linkedId: bigint
  metadata: string
  maxValidationTime: bigint
  milestoneCount: bigint
}

export interface Milestone {
  grantId: bigint
  milestoneIndex: bigint
  amount: bigint
  completed: boolean
  claimed: boolean
  completedBy: Address
  completedAt: bigint
  proofData: string
  metadata: string
}

export interface Claim {
  claimant: Address
  grantId: bigint
  milestoneIndex: bigint
  amount: bigint
  status: ClaimStatus
  paid: boolean
  claimedAt: bigint
  submittedAt: bigint
  submissionData: string
  metadata: string
  approvalCount: bigint
  rejectionCount: bigint
}

export const GrantType = {
  MILESTONE: 0,
  BOUNTY: 1,
  ACHIEVEMENT: 2,
  CAMPAIGN_BONUS: 3
} as const;

export type GrantType = typeof GrantType[keyof typeof GrantType];

export const ClaimStatus = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
  AUTO_APPROVED: 3
} as const;

export type ClaimStatus = typeof ClaimStatus[keyof typeof ClaimStatus];

// Enhanced Grant interface for the component
export interface EnhancedGrant {
  id: number
  creator: Address
  paymentToken: Address
  totalAmount: bigint
  remainingAmount: bigint
  deadline: bigint
  isSecured: boolean
  active: boolean
  grantType: GrantType
  linkedId: number
  metadata?: GrantMetadata
  maxValidationTime: bigint
  milestoneCount: number
  status: 'active' | 'expired' | 'completed' | 'cancelled'
  daysRemaining?: number
  fundingProgress?: number
  trustLevel: 'secured' | 'promised'
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

const celoToken = process.env.NEXT_PUBLIC_CELO_TOKEN?.toLowerCase();

// Hook for creating secured grants
export function useCreateSecuredGrant(contractAddress: Address) {
  const { address: user } = useAccount();
  const { isPending, isError, error, isSuccess, data } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  const createSecuredGrant = async ({
    paymentToken,
    totalAmount,
    deadline,
    grantType,
    linkedId,
    metadata,
    milestoneAmounts,
    milestoneMetadata,
    maxValidationTime,
    feeAmount
  }: {
    paymentToken: Address;
    totalAmount: bigint;
    deadline: bigint;
    grantType: GrantType;
    linkedId: bigint;
    metadata: string;
    milestoneAmounts: bigint[];
    milestoneMetadata: string[];
    maxValidationTime: bigint;
    feeAmount: bigint;
  }) => {
    try {
      const params = {
        paymentToken,
        totalAmount: totalAmount.toString(),
        deadline: deadline.toString(),
        grantType,
        linkedId: linkedId.toString(),
        metadata,
        milestoneAmounts: milestoneAmounts.map(amt => amt.toString()),
        milestoneMetadata,
        maxValidationTime: maxValidationTime.toString(),
        feeAmount: feeAmount.toString()
      };

      console.log("Creating secured grant with data: ", params);

      // Check if paying fee in native CELO
      const celoTokenLower = celoToken?.toLowerCase();
      const isCeloPayment = celoTokenLower ? paymentToken.toLowerCase() === celoTokenLower : false;
      const totalValue = isCeloPayment ? totalAmount + feeAmount : feeAmount;

      // Divvi integration - use sendTransactionAsync for referral tracking
      const result = await executeTransactionWithDivvi(
        contractAddress,
        abi,
        'createSecuredGrant',
        [
          paymentToken,
          totalAmount,
          deadline,
          grantType,
          linkedId,
          metadata,
          milestoneAmounts,
          milestoneMetadata,
          maxValidationTime
        ],
        user as Address,
        sendTransactionAsync,
        { value: totalValue }
      );

      logDebug('Secured Grant Creation Success', {
        transactionHash: result,
        timestamp: new Date().toISOString(),
        totalAmount: totalAmount.toString(),
        feeAmount: feeAmount.toString(),
        isCeloPayment
      });

      logDivviOperation('CREATE_SECURED_GRANT', {
        transactionHash: result,
        user: user,
        totalAmount: totalAmount.toString(),
        feeAmount: feeAmount.toString()
      }, 'success');

      return result;
    } catch (err) {
      logDebug('Secured Grant Creation Error', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        code: err instanceof Error ? (err as any).code : undefined,
        stack: err instanceof Error ? err.stack : undefined,
      }, 'error');
      throw err;
    }
  };

  return {
    createSecuredGrant,
    isPending,
    isError,
    error,
    isSuccess,
    data
  };
}

// Hook for creating promised grants
export function useCreatePromisedGrant(contractAddress: Address) {
  const { address: user } = useAccount();
  const { isPending, isError, error, isSuccess, data } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  const createPromisedGrant = async ({
    paymentToken,
    totalAmount,
    deadline,
    grantType,
    linkedId,
    metadata,
    milestoneAmounts,
    milestoneMetadata,
    maxValidationTime,
    feeAmount
  }: {
    paymentToken: Address;
    totalAmount: bigint;
    deadline: bigint;
    grantType: GrantType;
    linkedId: bigint;
    metadata: string;
    milestoneAmounts: bigint[];
    milestoneMetadata: string[];
    maxValidationTime: bigint;
    feeAmount: bigint;
  }) => {
    try {
      // Divvi integration - use sendTransactionAsync for referral tracking
      const result = await executeTransactionWithDivvi(
        contractAddress,
        abi,
        'createPromisedGrant',
        [
          paymentToken,
          totalAmount,
          deadline,
          grantType,
          linkedId,
          metadata,
          milestoneAmounts,
          milestoneMetadata,
          maxValidationTime
        ],
        user as Address,
        sendTransactionAsync,
        { value: feeAmount }
      );

      logDebug('Promised Grant Creation Success', {
        transactionHash: result,
        timestamp: new Date().toISOString(),
        totalAmount: totalAmount.toString(),
        feeAmount: feeAmount.toString()
      });

      logDivviOperation('CREATE_PROMISED_GRANT', {
        transactionHash: result,
        user: user,
        totalAmount: totalAmount.toString(),
        feeAmount: feeAmount.toString()
      }, 'success');

      return result;
    } catch (err) {
      logDebug('Promised Grant Creation Error', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error'
      }, 'error');
      throw err;
    }
  };

  return {
    createPromisedGrant,
    isPending,
    isError,
    error,
    isSuccess,
    data
  };
}

// Hook for submitting milestone
export function useSubmitMilestone(contractAddress: Address) {
  const { address: user } = useAccount();
  const { isPending, isError, error, isSuccess } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  const submitMilestone = async ({
    grantId,
    milestoneIndex,
    submissionData,
    metadata
  }: {
    grantId: bigint;
    milestoneIndex: bigint;
    submissionData: string;
    metadata: string;
  }) => {
    try {
      // Divvi integration - use sendTransactionAsync for referral tracking
      const result = await executeTransactionWithDivvi(
        contractAddress,
        abi,
        'submitMilestone',
        [grantId, milestoneIndex, submissionData, metadata],
        user as Address,
        sendTransactionAsync
      );

      logDivviOperation('SUBMIT_MILESTONE', {
        transactionHash: result,
        user: user,
        grantId: grantId.toString(),
        milestoneIndex: milestoneIndex.toString()
      }, 'success');

      return result;
    } catch (err) {
      console.error('Error submitting milestone:', err);
      throw err;
    }
  };

  return {
    submitMilestone,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for validating milestone
export function useValidateMilestone(contractAddress: Address) {
  const { address: user } = useAccount();
  const { isPending, isError, error, isSuccess } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  const validateMilestone = async ({
    grantId,
    milestoneIndex,
    claimant,
    approve,
    feedback
  }: {
    grantId: bigint;
    milestoneIndex: bigint;
    claimant: Address;
    approve: boolean;
    feedback: string;
  }) => {
    try {
      // Divvi integration - use sendTransactionAsync for referral tracking
      const result = await executeTransactionWithDivvi(
        contractAddress,
        abi,
        'validateMilestone',
        [grantId, milestoneIndex, claimant, approve, feedback],
        user as Address,
        sendTransactionAsync
      );

      logDivviOperation('VALIDATE_MILESTONE', {
        transactionHash: result,
        user: user,
        grantId: grantId.toString(),
        milestoneIndex: milestoneIndex.toString(),
        approve
      }, 'success');

      return result;
    } catch (err) {
      console.error('Error validating milestone:', err);
      throw err;
    }
  };

  return {
    validateMilestone,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for claiming milestone
export function useClaimMilestone(contractAddress: Address) {
  const { address: user } = useAccount();
  const { isPending, isError, error, isSuccess } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  const claimMilestone = async ({
    grantId,
    milestoneIndex
  }: {
    grantId: bigint;
    milestoneIndex: bigint;
  }) => {
    try {
      // Divvi integration - use sendTransactionAsync for referral tracking
      const result = await executeTransactionWithDivvi(
        contractAddress,
        abi,
        'claimMilestone',
        [grantId, milestoneIndex],
        user as Address,
        sendTransactionAsync
      );

      logDivviOperation('CLAIM_MILESTONE', {
        transactionHash: result,
        user: user,
        grantId: grantId.toString(),
        milestoneIndex: milestoneIndex.toString()
      }, 'success');

      return result;
    } catch (err) {
      console.error('Error claiming milestone:', err);
      throw err;
    }
  };

  return {
    claimMilestone,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for sending milestone payment (by grant creator)
export function useSendMilestonePayment(contractAddress: Address) {
  const { address: user } = useAccount();
  const { isPending, isError, error, isSuccess } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  const sendMilestonePayment = async ({
    grantId,
    milestoneIndex,
    recipient,
    paymentAmount
  }: {
    grantId: bigint;
    milestoneIndex: bigint;
    recipient: Address;
    paymentAmount?: bigint; // For promised grants
  }) => {
    try {
      // Divvi integration - use sendTransactionAsync for referral tracking
      const result = await executeTransactionWithDivvi(
        contractAddress,
        abi,
        'sendMilestonePayment',
        [grantId, milestoneIndex, recipient],
        user as Address,
        sendTransactionAsync,
        paymentAmount ? { value: paymentAmount } : {}
      );

      logDivviOperation('SEND_MILESTONE_PAYMENT', {
        transactionHash: result,
        user: user,
        grantId: grantId.toString(),
        milestoneIndex: milestoneIndex.toString(),
        recipient,
        paymentAmount: paymentAmount?.toString()
      }, 'success');

      return result;
    } catch (err) {
      console.error('Error sending milestone payment:', err);
      throw err;
    }
  };

  return {
    sendMilestonePayment,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for adding validator
export function useAddValidator(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();

  const addValidator = async ({
    grantId,
    validator
  }: {
    grantId: bigint;
    validator: Address;
  }) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'addValidator',
        args: [grantId, validator]
      });
    } catch (err) {
      console.error('Error adding validator:', err);
      throw err;
    }
  };

  return {
    addValidator,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for funding promised grant (updated with Divvi integration)
export function useFundPromisedGrant(contractAddress: Address) {
  const { address: user } = useAccount();
  const { isPending, isError, error, isSuccess } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  const fundPromisedGrant = async ({
    grantId,
    amount,
    isERC20 = false
  }: {
    grantId: bigint;
    amount: bigint;
    isERC20?: boolean;
  }) => {
    try {
      if (!user) {
        throw new Error('User wallet not connected');
      }

      // Divvi integration - use executeTransactionWithDivvi utility
      if (isERC20) {
        const result = await executeTransactionWithDivvi(
          contractAddress,
          abi,
          'fundPromisedGrantERC20',
          [grantId, amount],
          user as Address,
          sendTransactionAsync
        );

        logDivviOperation('FUND_PROMISED_GRANT_ERC20', {
          transactionHash: result,
          user: user,
          grantId: grantId.toString(),
          amount: amount.toString()
        }, 'success');

        return result;
      } else {
        const result = await executeTransactionWithDivvi(
          contractAddress,
          abi,
          'fundPromisedGrant',
          [grantId],
          user as Address,
          sendTransactionAsync,
          { value: amount }
        );

        logDivviOperation('FUND_PROMISED_GRANT', {
          transactionHash: result,
          user: user,
          grantId: grantId.toString(),
          amount: amount.toString()
        }, 'success');

        return result;
      }
    } catch (err) {
      console.error('Error funding promised grant:', err);
      throw err;
    }
  };

  return {
    fundPromisedGrant,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for cancelling grant
export function useCancelGrant(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract();

  const cancelGrant = async ({
    grantId
  }: {
    grantId: bigint;
  }) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'cancelGrant',
        args: [grantId]
      });
    } catch (err) {
      console.error('Error cancelling grant:', err);
      throw err;
    }
  };

  return {
    cancelGrant,
    isPending,
    isError,
    error,
    isSuccess
  };
}

// Hook for reading grant creation fees
export function useGrantCreationFees(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: [
      {
        address: contractAddress,
        abi,
        functionName: 'securedGrantCreationFee'
      },
      {
        address: contractAddress,
        abi,
        functionName: 'promisedGrantCreationFee'
      }
    ],
    query: {
      enabled: !!contractAddress
    }
  });

  return {
    securedGrantCreationFee: (data?.[0]?.result as bigint) || 0n,
    promisedGrantCreationFee: (data?.[1]?.result as bigint) || 0n,
    securedFeeFormatted: data?.[0]?.result ? formatEther(data[0].result as bigint) : '0',
    promisedFeeFormatted: data?.[1]?.result ? formatEther(data[1].result as bigint) : '0',
    isLoading,
    error,
    refetch
  };
}

// Hook for reading total grants count
export function useGrantsCount(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getTotalGrantsCreated',
    query: {
      enabled: !!contractAddress
    }
  });

  return {
    grantsCount: data as bigint || 0n,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading a single grant
export function useSingleGrant(contractAddress: Address, grantId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getGrant',
    args: [grantId],
    query: {
      enabled: !!contractAddress && grantId !== undefined
    }
  });

  const grant = data ? {
    id: (data as any[])[0] as bigint,
    creator: (data as any[])[1] as Address,
    paymentToken: (data as any[])[2] as Address,
    totalAmount: (data as any[])[3] as bigint,
    remainingAmount: (data as any[])[4] as bigint,
    deadline: (data as any[])[5] as bigint,
    isSecured: (data as any[])[6] as boolean,
    active: (data as any[])[7] as boolean,
    grantType: (data as any[])[8] as GrantType,
    linkedId: (data as any[])[9] as bigint,
    metadata: (data as any[])[10] as string,
    maxValidationTime: (data as any[])[11] as bigint,
    milestoneCount: (data as any[])[12] as bigint
  } as Grant : null;

  return {
    grant,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading milestone
export function useMilestone(contractAddress: Address, grantId: bigint, milestoneIndex: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getMilestone',
    args: [grantId, milestoneIndex],
    query: {
      enabled: !!contractAddress && grantId !== undefined && milestoneIndex !== undefined
    }
  });

  const milestone = data ? {
    grantId: (data as any[])[0] as bigint,
    milestoneIndex: (data as any[])[1] as bigint,
    amount: (data as any[])[2] as bigint,
    completed: (data as any[])[3] as boolean,
    claimed: (data as any[])[4] as boolean,
    completedBy: (data as any[])[5] as Address,
    completedAt: (data as any[])[6] as bigint,
    proofData: (data as any[])[7] as string,
    metadata: (data as any[])[8] as string
  } as Milestone : null;

  return {
    milestone,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading claim
export function useClaim(contractAddress: Address, grantId: bigint, milestoneIndex: bigint, claimant: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getClaim',
    args: [grantId, milestoneIndex, claimant],
    query: {
      enabled: !!contractAddress && grantId !== undefined && milestoneIndex !== undefined && !!claimant
    }
  });

  const claim = data ? {
    claimant: (data as any[])[0] as Address,
    grantId: (data as any[])[1] as bigint,
    milestoneIndex: (data as any[])[2] as bigint,
    amount: (data as any[])[3] as bigint,
    status: (data as any[])[4] as ClaimStatus,
    paid: (data as any[])[5] as boolean,
    claimedAt: (data as any[])[6] as bigint,
    submittedAt: (data as any[])[7] as bigint,
    submissionData: (data as any[])[8] as string,
    metadata: (data as any[])[9] as string,
    approvalCount: (data as any[])[10] as bigint,
    rejectionCount: (data as any[])[11] as bigint
  } as Claim : null;

  return {
    claim,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading all grants
export function useAllGrants(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getAllGrants',
    query: {
      enabled: !!contractAddress
    }
  });

  return {
    grantIds: (data as bigint[]) || [],
    isLoading,
    error,
    refetch
  };
}

// Hook for reading grants by creator
export function useGrantsByCreator(contractAddress: Address, creator: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getGrantsByCreator',
    args: [creator],
    query: {
      enabled: !!contractAddress && !!creator
    }
  });

  return {
    grantIds: (data as bigint[]) || [],
    isLoading,
    error,
    refetch
  };
}

// Hook for reading grants by token
export function useGrantsByToken(contractAddress: Address, token: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getGrantsByToken',
    args: [token],
    query: {
      enabled: !!contractAddress && !!token
    }
  });

  return {
    grantIds: (data as bigint[]) || [],
    isLoading,
    error,
    refetch
  };
}

// Hook for reading grants by type
export function useGrantsByType(contractAddress: Address, grantType: GrantType) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getGrantsByType',
    args: [grantType],
    query: {
      enabled: !!contractAddress && grantType !== undefined
    }
  });

  return {
    grantIds: (data as bigint[]) || [],
    isLoading,
    error,
    refetch
  };
}

// Hook for reading secured grants
export function useSecuredGrants(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getSecuredGrants',
    query: {
      enabled: !!contractAddress
    }
  });

  return {
    securedGrantIds: (data as bigint[]) || [],
    isLoading,
    error,
    refetch
  };
}

// Hook for reading promised grants
export function usePromisedGrants(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getPromisedGrants',
    query: {
      enabled: !!contractAddress
    }
  });

  return {
    promisedGrantIds: (data as bigint[]) || [],
    isLoading,
    error,
    refetch
  };
}

// Hook for reading user claims
export function useUserClaims(contractAddress: Address, user: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getUserClaims',
    args: [user],
    query: {
      enabled: !!contractAddress && !!user
    }
  });

  return {
    userClaimIds: (data as bigint[]) || [],
    isLoading,
    error,
    refetch
  };
}

// Hook for reading user earnings
export function useUserEarnings(contractAddress: Address, user: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getUserEarnings',
    args: [user],
    query: {
      enabled: !!contractAddress && !!user
    }
  });

  const earnings = data ? {
    tokens: (data as any[])[0] as Address[],
    amounts: (data as any[])[1] as bigint[]
  } : { tokens: [], amounts: [] };

  return {
    earnings,
    isLoading,
    error,
    refetch
  };
}

// Hook for checking if milestone can be auto-approved
export function useCanAutoApproveMilestone(
  contractAddress: Address,
  grantId: bigint,
  milestoneIndex: bigint,
  claimant: Address
) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'canAutoApproveMilestone',
    args: [grantId, milestoneIndex, claimant],
    query: {
      enabled: !!contractAddress && grantId !== undefined && milestoneIndex !== undefined && !!claimant
    }
  });

  return {
    canAutoApprove: data as boolean,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading grant validators
export function useGrantValidators(contractAddress: Address, grantId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getGrantValidators',
    args: [grantId],
    query: {
      enabled: !!contractAddress && grantId !== undefined
    }
  });

  return {
    validators: (data as Address[]) || [],
    isLoading,
    error,
    refetch
  };
}

// Hook for reading milestone claimants
export function useMilestoneClaimants(contractAddress: Address, grantId: bigint, milestoneIndex: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getMilestoneClaimants',
    args: [grantId, milestoneIndex],
    query: {
      enabled: !!contractAddress && grantId !== undefined && milestoneIndex !== undefined
    }
  });

  return {
    claimants: (data as Address[]) || [],
    isLoading,
    error,
    refetch
  };
}

// Main hook for grant methods - following the same pattern as useCampaign
export function useGrants(contractAddress: Address) {
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize the hook
  useEffect(() => {
    if (contractAddress) {
      setIsInitialized(true);
    }
  }, [contractAddress]);

  // Get grants count
  const { grantsCount, isLoading: countLoading, error: countError } = useGrantsCount(contractAddress);

  // Get all grant IDs
  const { grantIds: allGrantIds, isLoading: grantIdsLoading, error: grantIdsError } = useAllGrants(contractAddress);

  // Helper function to determine grant status
  const getGrantStatus = useCallback((grant: Grant): 'active' | 'expired' | 'completed' | 'cancelled' => {
    const now = Math.floor(Date.now() / 1000);
    const deadline = Number(grant.deadline);
    
    if (!grant.active) {
      return 'cancelled';
    } else if (grant.remainingAmount === 0n) {
      return 'completed';
    } else if (now > deadline) {
      return 'expired';
    } else {
      return 'active';
    }
  }, []);

  // Helper function to calculate days remaining
  const getDaysRemaining = useCallback((grant: Grant): number => {
    const now = Math.floor(Date.now() / 1000);
    const deadline = Number(grant.deadline);
    
    if (now >= deadline) {
      return 0;
    } else {
      return Math.ceil((deadline - now) / (60 * 60 * 24));
    }
  }, []);

  // Helper function to calculate funding progress
  const getFundingProgress = useCallback((grant: Grant): number => {
    if (grant.totalAmount === 0n) return 0;
    const distributed = grant.totalAmount - grant.remainingAmount;
    return Number((distributed * 100n) / grant.totalAmount);
  }, []);

  // Load grants function that returns properly formatted data
  const loadGrants = useCallback(async (): Promise<EnhancedGrant[]> => {
    if (!contractAddress || !allGrantIds.length) {
      return [];
    }

    try {
      // You would typically batch read all grants here
      // For now, returning empty array as example
      const enhancedGrants: EnhancedGrant[] = [];

      return enhancedGrants;
    } catch (error) {
      console.error('Error processing grants data:', error);
      return [];
    }
  }, [contractAddress, allGrantIds]);

  // Format token amount
  const formatTokenAmount = useCallback((amount: bigint | string | number): string => {
    try {
      if (typeof amount === 'string') {
        return formatEther(BigInt(amount));
      }
      if (typeof amount === 'number') {
        return formatEther(BigInt(amount));
      }
      return formatEther(amount);
    } catch (error) {
      console.error('Error formatting token amount:', error);
      return '0';
    }
  }, []);

  const isLoading = countLoading || grantIdsLoading;
  const error = countError || grantIdsError;

  return {
    isInitialized,
    loadGrants,
    formatTokenAmount,
    getGrantStatus,
    getDaysRemaining,
    getFundingProgress,
    grantsCount: grantsCount ? Number(grantsCount) : 0,
    allGrantIds,
    isLoadingCount: countLoading,
    isLoading,
    error
  };
}

// Helper function to parse JSON metadata safely
export function parseGrantMetadata(jsonString: string): GrantMetadata {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to parse grant metadata JSON:', error);
    return {} as GrantMetadata;
  }
}

// Helper function to parse milestone metadata
export function parseMilestoneMetadata(jsonString: string): MilestoneMetadata {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('Failed to parse milestone metadata JSON:', error);
      return {} as MilestoneMetadata;
    }
   }
   
   // Helper function to parse claim metadata
   export function parseClaimMetadata(jsonString: string): ClaimMetadata {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('Failed to parse claim metadata JSON:', error);
      return {} as ClaimMetadata;
    }
   }
   
   // Helper function to format grant for display
   export function formatGrantForDisplay(grant: Grant) {
    if (!grant) return null;
   
    return {
      ...grant,
      metadataParsed: parseGrantMetadata(grant.metadata),
      deadline: new Date(Number(grant.deadline) * 1000),
      isActive: grant.active,
      totalAmountFormatted: formatEther(grant.totalAmount),
      remainingAmountFormatted: formatEther(grant.remainingAmount),
      trustLevel: grant.isSecured ? 'secured' : 'promised',
      grantTypeName: getGrantTypeName(grant.grantType)
    };
   }
   
   // Helper function to get grant type name
   export function getGrantTypeName(grantType: GrantType): string {
    switch (grantType) {
      case GrantType.MILESTONE:
        return 'Milestone Grant';
      case GrantType.BOUNTY:
        return 'Bounty Grant';
      case GrantType.ACHIEVEMENT:
        return 'Achievement Grant';
      case GrantType.CAMPAIGN_BONUS:
        return 'Campaign Bonus';
      default:
        return 'Unknown Grant Type';
    }
   }
   
   // Helper function to get claim status name
   export function getClaimStatusName(status: ClaimStatus): string {
    switch (status) {
      case ClaimStatus.PENDING:
        return 'Pending Review';
      case ClaimStatus.APPROVED:
        return 'Approved';
      case ClaimStatus.REJECTED:
        return 'Rejected';
      case ClaimStatus.AUTO_APPROVED:
        return 'Auto-Approved';
      default:
        return 'Unknown Status';
    }
   }
   
   // Hook for enhanced grant creation with fee calculation
   export function useCreateGrantWithFees(contractAddress: Address) {
    const { createSecuredGrant, isPending: securedPending, isError: securedError, error: securedErr, isSuccess: securedSuccess, data: securedData } = useCreateSecuredGrant(contractAddress);
    const { createPromisedGrant, isPending: promisedPending, isError: promisedError, error: promisedErr, isSuccess: promisedSuccess, data: promisedData } = useCreatePromisedGrant(contractAddress);
    const { securedGrantCreationFee, promisedGrantCreationFee } = useGrantCreationFees(contractAddress);
   
    const createGrantWithFees = async (params: {
      paymentToken: Address;
      totalAmount: bigint;
      deadline: bigint;
      grantType: GrantType;
      linkedId: bigint;
      metadata: string;
      milestoneAmounts: bigint[];
      milestoneMetadata: string[];
      maxValidationTime: bigint;
      isSecured: boolean;
    }) => {
      const feeAmount = params.isSecured ? securedGrantCreationFee : promisedGrantCreationFee;
   
      if (params.isSecured) {
        return createSecuredGrant({
          ...params,
          feeAmount
        });
      } else {
        return createPromisedGrant({
          ...params,
          feeAmount
        });
      }
    };
   
    return {
      createGrantWithFees,
      isPending: securedPending || promisedPending,
      isError: securedError || promisedError,
      error: securedErr || promisedErr,
      isSuccess: securedSuccess || promisedSuccess,
      data: securedData || promisedData,
      securedGrantCreationFee,
      promisedGrantCreationFee
    };
   }
   
   // Hook for batch reading multiple grants
   export function useMultipleGrants(contractAddress: Address, grantIds: bigint[]) {
    const contracts = grantIds.map(id => ({
      address: contractAddress,
      abi,
      functionName: 'getGrant',
      args: [id]
    }));
   
    const { data, isLoading, error, refetch } = useReadContracts({
      contracts: contracts as unknown as readonly {
        address: Address;
        abi: Abi;
        functionName: string;
        args: readonly [bigint];
      }[],
      query: {
        enabled: !!contractAddress && grantIds.length > 0
      }
    });
   
    const grants: Grant[] = [];
    
    if (data) {
      for (let i = 0; i < grantIds.length; i++) {
        if (data[i]?.result) {
          const result = data[i].result as any[];
          grants.push({
            id: result[0] as bigint,
            creator: result[1] as Address,
            paymentToken: result[2] as Address,
            totalAmount: result[3] as bigint,
            remainingAmount: result[4] as bigint,
            deadline: result[5] as bigint,
            isSecured: result[6] as boolean,
            active: result[7] as boolean,
            grantType: result[8] as GrantType,
            linkedId: result[9] as bigint,
            metadata: result[10] as string,
            maxValidationTime: result[11] as bigint,
            milestoneCount: result[12] as bigint
          });
        }
      }
    }
   
    return {
      grants,
      isLoading,
      error,
      refetch
    };
   }
   
   // Hook for getting grants with enhanced filtering
   export function useFilteredGrants(contractAddress: Address, filters: {
    grantType?: GrantType;
    isSecured?: boolean;
    creator?: Address;
    token?: Address;
    status?: 'active' | 'expired' | 'completed' | 'cancelled';
   }) {
    const { grantIds: allGrantIds, isLoading: idsLoading } = useAllGrants(contractAddress);
    const { grants: allGrants, isLoading: grantsLoading } = useMultipleGrants(contractAddress, allGrantIds);
   
    const filteredGrants = useMemo(() => {
      if (!allGrants.length) return [];
   
      return allGrants.filter(grant => {
        // Filter by grant type
        if (filters.grantType !== undefined && grant.grantType !== filters.grantType) {
          return false;
        }
   
        // Filter by secured/promised
        if (filters.isSecured !== undefined && grant.isSecured !== filters.isSecured) {
          return false;
        }
   
        // Filter by creator
        if (filters.creator && grant.creator.toLowerCase() !== filters.creator.toLowerCase()) {
          return false;
        }
   
        // Filter by token
        if (filters.token && grant.paymentToken.toLowerCase() !== filters.token.toLowerCase()) {
          return false;
        }
   
        // Filter by status
        if (filters.status) {
          const now = Math.floor(Date.now() / 1000);
          const deadline = Number(grant.deadline);
          
          switch (filters.status) {
            case 'active':
              if (!grant.active || now > deadline || grant.remainingAmount === 0n) return false;
              break;
            case 'expired':
              if (grant.active && now <= deadline) return false;
              break;
            case 'completed':
              if (grant.remainingAmount !== 0n) return false;
              break;
            case 'cancelled':
              if (grant.active) return false;
              break;
          }
        }
   
        return true;
      });
    }, [allGrants, filters]);
   
    return {
      filteredGrants,
      isLoading: idsLoading || grantsLoading,
      totalCount: allGrants.length,
      filteredCount: filteredGrants.length
    };
   }
   
   // Hook for grant statistics
   export function useGrantStatistics(contractAddress: Address) {
    const { grantIds } = useAllGrants(contractAddress);
    const { grants } = useMultipleGrants(contractAddress, grantIds);
   
    const statistics = useMemo(() => {
      if (!grants.length) {
        return {
          totalGrants: 0,
          securedGrants: 0,
          promisedGrants: 0,
          activeGrants: 0,
          completedGrants: 0,
          expiredGrants: 0,
          totalValue: 0n,
          totalDistributed: 0n
        };
      }
   
      const now = Math.floor(Date.now() / 1000);
      let securedGrants = 0;
      let promisedGrants = 0;
      let activeGrants = 0;
      let completedGrants = 0;
      let expiredGrants = 0;
      let totalValue = 0n;
      let totalDistributed = 0n;
   
      grants.forEach(grant => {
        if (grant.isSecured) securedGrants++;
        else promisedGrants++;
   
        const deadline = Number(grant.deadline);
        if (!grant.active) {
          // Cancelled grants
        } else if (grant.remainingAmount === 0n) {
          completedGrants++;
        } else if (now > deadline) {
          expiredGrants++;
        } else {
          activeGrants++;
        }
   
        totalValue += grant.totalAmount;
        totalDistributed += (grant.totalAmount - grant.remainingAmount);
      });
   
      return {
        totalGrants: grants.length,
        securedGrants,
        promisedGrants,
        activeGrants,
        completedGrants,
        expiredGrants,
        totalValue,
        totalDistributed
      };
    }, [grants]);
   
    return statistics;
   }
   
   export default {
    useCreateSecuredGrant,
    useCreatePromisedGrant,
    useSubmitMilestone,
    useValidateMilestone,
    useClaimMilestone,
    useSendMilestonePayment,
    useAddValidator,
    useFundPromisedGrant,
    useCancelGrant,
    useGrantCreationFees,
    useGrantsCount,
    useSingleGrant,
    useMilestone,
    useClaim,
    useAllGrants,
    useGrantsByCreator,
    useGrantsByToken,
    useGrantsByType,
    useSecuredGrants,
    usePromisedGrants,
    useUserClaims,
    useUserEarnings,
    useCanAutoApproveMilestone,
    useGrantValidators,
    useMilestoneClaimants,
    useGrants,
    useCreateGrantWithFees,
    useMultipleGrants,
    useFilteredGrants,
    useGrantStatistics,
    parseGrantMetadata,
    parseMilestoneMetadata,
    parseClaimMetadata,
    formatGrantForDisplay,
    getGrantTypeName,
    getClaimStatusName
   };