// hooks/useMilestoneFunding.ts

import { useWriteContract, useReadContract, useReadContracts, useAccount, useSendTransaction } from 'wagmi'
import { formatEther, type Address, type Abi } from 'viem'
import { milestoneABI as abi } from '@/abi/milestoneABI'
import { useState, useEffect, useCallback } from 'react'
// Only import logDivviOperation at top level (it doesn't require SDK)
// executeTransactionWithDivvi will be imported lazily in write functions
import { logDivviOperation } from '@/utils/divvi'
import { getCeloTokenAddress } from '@/utils/contractConfig'

// Types for better TypeScript support
export const EntityType = {
  PROJECT: 0,
  CAMPAIGN: 1
} as const

export type EntityType = typeof EntityType[keyof typeof EntityType]

export const GrantStatus = {
  ACTIVE: 0,
  COMPLETED: 1,
  CANCELLED: 2
} as const

export type GrantStatus = typeof GrantStatus[keyof typeof GrantStatus]

export const MilestoneStatus = {
  PENDING: 0,
  SUBMITTED: 1,
  APPROVED: 2,
  REJECTED: 3,
  PAID: 4,
  LOCKED: 5
} as const

export type MilestoneStatus = typeof MilestoneStatus[keyof typeof MilestoneStatus]

export interface Grant {
  id: bigint
  grantee: Address
  linkedEntityId: bigint
  entityType: EntityType
  siteFeePercentage: bigint
  reviewTimeLock: bigint
  milestoneDeadline: bigint
  status: GrantStatus
  createdAt: bigint
  completedAt: bigint
  supportedTokens: Address[]
}

export interface GrantTokenAmounts {
  totalAmount: bigint
  releasedAmount: bigint
  escrowedAmount: bigint
}

export interface Milestone {
  id: bigint
  grantId: bigint
  title: string
  description: string
  evidenceHash: string
  percentage: bigint
  status: MilestoneStatus
  submittedAt: bigint
  reviewDeadline: bigint
  approvedAt: bigint
  approvedBy: Address
  approvalMessage: string
  autoApproved: boolean
  paidAt: bigint
  deadline: bigint
  penaltyPercentage: bigint
  isLocked: boolean
}

export interface MilestoneRejection {
  rejectionMessage: string
  rejectedBy: Address
  rejectedAt: bigint
}

// Enhanced Grant interface for components
export interface EnhancedGrant {
  id: number
  grantee: Address
  linkedEntityId: number
  entityType: EntityType
  siteFeePercentage: number
  reviewTimeLock: bigint
  milestoneDeadline: bigint
  status: GrantStatus
  createdAt: bigint
  completedAt: bigint
  supportedTokens: Address[]
  statusLabel: 'active' | 'completed' | 'cancelled'
  daysRemaining?: number
}

// Add debug logging utility
const logDebug = (section: string, data: any, type: 'info' | 'error' | 'warn' = 'info') => {
  const timestamp = new Date().toISOString()
  const logData = {
    timestamp,
    section,
    data
  }

  switch (type) {
    case 'error':
      console.error('🔴', logData)
      break
    case 'warn':
      console.warn('🟡', logData)
      break
    default:
      console.log('🟢', logData)
  }
}

const celoToken = getCeloTokenAddress()

// Hook for creating a grant
export function useCreateGrant(contractAddress: Address) {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, data } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()

  const createGrant = async ({
    linkedEntityId,
    entityType,
    grantee,
    tokens,
    amounts,
    siteFeePercentage,
    reviewTimeLock,
    milestoneDeadline
  }: {
    linkedEntityId: bigint
    entityType: EntityType
    grantee: Address
    tokens: Address[]
    amounts: bigint[]
    siteFeePercentage: bigint
    reviewTimeLock: bigint
    milestoneDeadline: bigint
  }) => {
    try {
      // Calculate total CELO needed
      let totalCeloNeeded = 0n
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].toLowerCase() === celoToken.toLowerCase()) {
          totalCeloNeeded += amounts[i]
        }
      }

      // Lazy import to avoid loading Divvi SDK for read operations
      const { executeTransactionWithDivvi } = await import('@/utils/divvi')
      const result = await executeTransactionWithDivvi(
        contractAddress,
        abi,
        'createGrant',
        [
          linkedEntityId,
          entityType,
          grantee,
          tokens,
          amounts,
          siteFeePercentage,
          reviewTimeLock,
          milestoneDeadline
        ],
        user as Address,
        sendTransactionAsync,
        { value: totalCeloNeeded }
      )

      logDebug('Grant Creation Success', {
        transactionHash: result,
        timestamp: new Date().toISOString(),
        grantee,
        linkedEntityId: linkedEntityId.toString()
      })

      logDivviOperation('CREATE_GRANT', {
        transactionHash: result,
        user: user,
        grantee,
        linkedEntityId: linkedEntityId.toString()
      }, 'success')

      return result
    } catch (err) {
      logDebug('Grant Creation Error', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error'
      }, 'error')
      throw err
    }
  }

  return {
    createGrant,
    isPending,
    isError,
    error,
    isSuccess,
    data
  }
}

// Hook for submitting a milestone
export function useSubmitMilestone(contractAddress: Address) {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()

  const submitMilestone = async ({
    grantId,
    title,
    description,
    evidenceHash,
    percentage
  }: {
    grantId: bigint
    title: string
    description: string
    evidenceHash: string
    percentage: bigint
  }) => {
    try {
      // Lazy import to avoid loading Divvi SDK for read operations
      const { executeTransactionWithDivvi } = await import('@/utils/divvi')
      const result = await executeTransactionWithDivvi(
        contractAddress,
        abi,
        'submitMilestone',
        [grantId, title, description, evidenceHash, percentage],
        user as Address,
        sendTransactionAsync
      )

      logDivviOperation('SUBMIT_MILESTONE', {
        transactionHash: result,
        user: user,
        grantId: grantId.toString(),
        milestoneTitle: title
      }, 'success')

      return result
    } catch (err) {
      console.error('Error submitting milestone:', err)
      throw err
    }
  }

  return {
    submitMilestone,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for approving a milestone
export function useApproveMilestone(contractAddress: Address) {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()

  const approveMilestone = async ({
    grantId,
    milestoneId,
    message
  }: {
    grantId: bigint
    milestoneId: bigint
    message: string
  }) => {
    try {
      // Lazy import to avoid loading Divvi SDK for read operations
      const { executeTransactionWithDivvi } = await import('@/utils/divvi')
      const result = await executeTransactionWithDivvi(
        contractAddress,
        abi,
        'approveMilestone',
        [grantId, milestoneId, message],
        user as Address,
        sendTransactionAsync
      )

      logDivviOperation('APPROVE_MILESTONE', {
        transactionHash: result,
        user: user,
        grantId: grantId.toString(),
        milestoneId: milestoneId.toString()
      }, 'success')

      return result
    } catch (err) {
      console.error('Error approving milestone:', err)
      throw err
    }
  }

  return {
    approveMilestone,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for rejecting a milestone
export function useRejectMilestone(contractAddress: Address) {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()

  const rejectMilestone = async ({
    grantId,
    milestoneId,
    message
  }: {
    grantId: bigint
    milestoneId: bigint
    message: string
  }) => {
    try {
      // Lazy import to avoid loading Divvi SDK for read operations
      const { executeTransactionWithDivvi } = await import('@/utils/divvi')
      const result = await executeTransactionWithDivvi(
        contractAddress,
        abi,
        'rejectMilestone',
        [grantId, milestoneId, message],
        user as Address,
        sendTransactionAsync
      )

      logDivviOperation('REJECT_MILESTONE', {
        transactionHash: result,
        user: user,
        grantId: grantId.toString(),
        milestoneId: milestoneId.toString()
      }, 'success')

      return result
    } catch (err) {
      console.error('Error rejecting milestone:', err)
      throw err
    }
  }

  return {
    rejectMilestone,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for auto-approving a milestone
export function useCheckAndAutoApproveMilestone(contractAddress: Address) {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()

  const checkAndAutoApproveMilestone = async ({
    grantId,
    milestoneId
  }: {
    grantId: bigint
    milestoneId: bigint
  }) => {
    try {
      // Lazy import to avoid loading Divvi SDK for read operations
      const { executeTransactionWithDivvi } = await import('@/utils/divvi')
      const result = await executeTransactionWithDivvi(
        contractAddress,
        abi,
        'checkAndAutoApproveMilestone',
        [grantId, milestoneId],
        user as Address,
        sendTransactionAsync
      )

      logDivviOperation('AUTO_APPROVE_MILESTONE', {
        transactionHash: result,
        user: user,
        grantId: grantId.toString(),
        milestoneId: milestoneId.toString()
      }, 'success')

      return result
    } catch (err) {
      console.error('Error auto-approving milestone:', err)
      throw err
    }
  }

  return {
    checkAndAutoApproveMilestone,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for resubmitting a milestone
export function useResubmitMilestone(contractAddress: Address) {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()

  const resubmitMilestone = async ({
    grantId,
    milestoneId,
    newEvidenceHash
  }: {
    grantId: bigint
    milestoneId: bigint
    newEvidenceHash: string
  }) => {
    try {
      // Lazy import to avoid loading Divvi SDK for read operations
      const { executeTransactionWithDivvi } = await import('@/utils/divvi')
      const result = await executeTransactionWithDivvi(
        contractAddress,
        abi,
        'resubmitMilestone',
        [grantId, milestoneId, newEvidenceHash],
        user as Address,
        sendTransactionAsync
      )

      logDivviOperation('RESUBMIT_MILESTONE', {
        transactionHash: result,
        user: user,
        grantId: grantId.toString(),
        milestoneId: milestoneId.toString()
      }, 'success')

      return result
    } catch (err) {
      console.error('Error resubmitting milestone:', err)
      throw err
    }
  }

  return {
    resubmitMilestone,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for adding funds to a grant
export function useAddFundsToGrant(contractAddress: Address) {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()

  const addFundsToGrant = async ({
    grantId,
    tokens,
    amounts
  }: {
    grantId: bigint
    tokens: Address[]
    amounts: bigint[]
  }) => {
    try {
      // Calculate total CELO needed
      let totalCeloNeeded = 0n
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].toLowerCase() === celoToken.toLowerCase()) {
          totalCeloNeeded += amounts[i]
        }
      }

      // Lazy import to avoid loading Divvi SDK for read operations
      const { executeTransactionWithDivvi } = await import('@/utils/divvi')
      const result = await executeTransactionWithDivvi(
        contractAddress,
        abi,
        'addFundsToGrant',
        [grantId, tokens, amounts],
        user as Address,
        sendTransactionAsync,
        { value: totalCeloNeeded }
      )

      logDivviOperation('ADD_FUNDS_TO_GRANT', {
        transactionHash: result,
        user: user,
        grantId: grantId.toString()
      }, 'success')

      return result
    } catch (err) {
      console.error('Error adding funds to grant:', err)
      throw err
    }
  }

  return {
    addFundsToGrant,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for withdrawing funds from a grant
export function useWithdrawFundsFromGrant(contractAddress: Address) {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()

  const withdrawFundsFromGrant = async ({
    grantId,
    token,
    amount,
    recipient
  }: {
    grantId: bigint
    token: Address
    amount: bigint
    recipient: Address
  }) => {
    try {
      // Lazy import to avoid loading Divvi SDK for read operations
      const { executeTransactionWithDivvi } = await import('@/utils/divvi')
      const result = await executeTransactionWithDivvi(
        contractAddress,
        abi,
        'withdrawFundsFromGrant',
        [grantId, token, amount, recipient],
        user as Address,
        sendTransactionAsync
      )

      logDivviOperation('WITHDRAW_FUNDS_FROM_GRANT', {
        transactionHash: result,
        user: user,
        grantId: grantId.toString(),
        token,
        amount: amount.toString()
      }, 'success')

      return result
    } catch (err) {
      console.error('Error withdrawing funds from grant:', err)
      throw err
    }
  }

  return {
    withdrawFundsFromGrant,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for cancelling a grant
export function useCancelGrant(contractAddress: Address) {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()

  const cancelGrant = async ({
    grantId,
    refundTo
  }: {
    grantId: bigint
    refundTo: Address
  }) => {
    try {
      // Lazy import to avoid loading Divvi SDK for read operations
      const { executeTransactionWithDivvi } = await import('@/utils/divvi')
      const result = await executeTransactionWithDivvi(
        contractAddress,
        abi,
        'cancelGrant',
        [grantId, refundTo],
        user as Address,
        sendTransactionAsync
      )

      logDivviOperation('CANCEL_GRANT', {
        transactionHash: result,
        user: user,
        grantId: grantId.toString(),
        refundTo
      }, 'success')

      return result
    } catch (err) {
      console.error('Error cancelling grant:', err)
      throw err
    }
  }

  return {
    cancelGrant,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for adding a grant admin
export function useAddGrantAdmin(contractAddress: Address) {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()

  const addGrantAdmin = async ({
    grantId,
    admin
  }: {
    grantId: bigint
    admin: Address
  }) => {
    try {
      // Lazy import to avoid loading Divvi SDK for read operations
      const { executeTransactionWithDivvi } = await import('@/utils/divvi')
      const result = await executeTransactionWithDivvi(
        contractAddress,
        abi,
        'addGrantAdmin',
        [grantId, admin],
        user as Address,
        sendTransactionAsync
      )

      logDivviOperation('ADD_GRANT_ADMIN', {
        transactionHash: result,
        user: user,
        grantId: grantId.toString(),
        admin
      }, 'success')

      return result
    } catch (err) {
      console.error('Error adding grant admin:', err)
      throw err
    }
  }

  return {
    addGrantAdmin,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for removing a grant admin
export function useRemoveGrantAdmin(contractAddress: Address) {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()

  const removeGrantAdmin = async ({
    grantId,
    admin
  }: {
    grantId: bigint
    admin: Address
  }) => {
    try {
      // Lazy import to avoid loading Divvi SDK for read operations
      const { executeTransactionWithDivvi } = await import('@/utils/divvi')
      const result = await executeTransactionWithDivvi(
        contractAddress,
        abi,
        'removeGrantAdmin',
        [grantId, admin],
        user as Address,
        sendTransactionAsync
      )

      logDivviOperation('REMOVE_GRANT_ADMIN', {
        transactionHash: result,
        user: user,
        grantId: grantId.toString(),
        admin
      }, 'success')

      return result
    } catch (err) {
      console.error('Error removing grant admin:', err)
      throw err
    }
  }

  return {
    removeGrantAdmin,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Read Hooks

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
  })

  const grant = data ? {
    id: (data as unknown as any[])[0] as bigint,
    grantee: (data as unknown as any[])[1] as Address,
    linkedEntityId: (data as unknown as any[])[2] as bigint,
    entityType: (data as unknown as any[])[3] as EntityType,
    siteFeePercentage: (data as unknown as any[])[4] as bigint,
    reviewTimeLock: (data as unknown as any[])[5] as bigint,
    milestoneDeadline: (data as unknown as any[])[6] as bigint,
    status: (data as unknown as any[])[7] as GrantStatus,
    createdAt: (data as unknown as any[])[8] as bigint,
    completedAt: (data as unknown as any[])[9] as bigint,
    supportedTokens: (data as unknown as any[])[10] as Address[]
  } as Grant : null

  return {
    grant,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading grant token amounts
export function useGrantTokenAmounts(contractAddress: Address, grantId: bigint, token: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getGrantTokenAmounts',
    args: [grantId, token],
    query: {
      enabled: !!contractAddress && grantId !== undefined && !!token
    }
  })

  const tokenAmounts = data ? {
    totalAmount: (data as unknown as any[])[0] as bigint,
    releasedAmount: (data as unknown as any[])[1] as bigint,
    escrowedAmount: (data as unknown as any[])[2] as bigint
  } as GrantTokenAmounts : null

  return {
    tokenAmounts,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading a single milestone
export function useSingleMilestone(contractAddress: Address, milestoneId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getMilestone',
    args: [milestoneId],
    query: {
      enabled: !!contractAddress && milestoneId !== undefined
    }
  })

  const milestone = data ? {
    id: (data as unknown as any[])[0] as bigint,
    grantId: (data as unknown as any[])[1] as bigint,
    title: (data as unknown as any[])[2] as string,
    description: (data as unknown as any[])[3] as string,
    evidenceHash: (data as unknown as any[])[4] as string,
    percentage: (data as unknown as any[])[5] as bigint,
    status: (data as unknown as any[])[6] as MilestoneStatus,
    submittedAt: (data as unknown as any[])[7] as bigint,
    reviewDeadline: (data as unknown as any[])[8] as bigint,
    approvedAt: (data as unknown as any[])[9] as bigint,
    approvedBy: (data as unknown as any[])[10] as Address,
    approvalMessage: (data as unknown as any[])[11] as string,
    autoApproved: (data as unknown as any[])[12] as boolean,
    paidAt: (data as unknown as any[])[13] as bigint,
    deadline: (data as unknown as any[])[14] as bigint,
    penaltyPercentage: (data as unknown as any[])[15] as bigint,
    isLocked: (data as unknown as any[])[16] as boolean
  } as Milestone : null

  return {
    milestone,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading milestone payout
export function useMilestonePayout(contractAddress: Address, milestoneId: bigint, token: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getMilestonePayout',
    args: [milestoneId, token],
    query: {
      enabled: !!contractAddress && milestoneId !== undefined && !!token
    }
  })

  return {
    payout: data as bigint || 0n,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading milestone rejection details
export function useMilestoneRejection(contractAddress: Address, milestoneId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getMilestoneRejection',
    args: [milestoneId],
    query: {
      enabled: !!contractAddress && milestoneId !== undefined
    }
  })

  const rejection = data ? {
    rejectionMessage: (data as unknown as any[])[0] as string,
    rejectedBy: (data as unknown as any[])[1] as Address,
    rejectedAt: (data as unknown as any[])[2] as bigint
  } as MilestoneRejection : null

  return {
    rejection,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading grant milestones
export function useGrantMilestones(contractAddress: Address, grantId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getGrantMilestones',
    args: [grantId],
    query: {
      enabled: !!contractAddress && grantId !== undefined
    }
  })

  return {
    milestoneIds: (data as bigint[]) || [],
    isLoading,
    error,
    refetch
  }
}

// Hook for reading grant admins
export function useGrantAdmins(contractAddress: Address, grantId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getGrantAdmins',
    args: [grantId],
    query: {
      enabled: !!contractAddress && grantId !== undefined
    }
  })

  return {
    admins: (data as Address[]) || [],
    isLoading,
    error,
    refetch
  }
}

// Hook for reading grant count
export function useGrantCount(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getGrantCount',
    query: {
      enabled: !!contractAddress
    }
  })

  return {
    grantCount: data as bigint || 0n,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading milestone count
export function useMilestoneCount(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getMilestoneCount',
    query: {
      enabled: !!contractAddress
    }
  })

  return {
    milestoneCount: data as bigint || 0n,
    isLoading,
    error,
    refetch
  }
}

// Hook for checking if milestone can be auto-approved
export function useCanAutoApproveMilestone(contractAddress: Address, milestoneId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'canAutoApproveMilestone',
    args: [milestoneId],
    query: {
      enabled: !!contractAddress && milestoneId !== undefined
    }
  })

  return {
    canAutoApprove: data as boolean || false,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading multiple milestones
export function useMultipleMilestones(contractAddress: Address, milestoneIds: bigint[]) {
  const contracts = milestoneIds.map(id => ({
    address: contractAddress,
    abi,
    functionName: 'getMilestone',
    args: [id]
  }))

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: contracts as unknown as readonly {
      address: Address
      abi: Abi
      functionName: string
      args: readonly [bigint]
    }[],
    query: {
      enabled: !!contractAddress && milestoneIds.length > 0
    }
  })

  const milestones: Milestone[] = []

  if (data) {
    for (let i = 0; i < milestoneIds.length; i++) {
      if (data[i]?.result) {
        const result = data[i].result as unknown as any[]
        milestones.push({
          id: result[0] as bigint,
          grantId: result[1] as bigint,
          title: result[2] as string,
          description: result[3] as string,
          evidenceHash: result[4] as string,
          percentage: result[5] as bigint,
          status: result[6] as MilestoneStatus,
          submittedAt: result[7] as bigint,
          reviewDeadline: result[8] as bigint,
          approvedAt: result[9] as bigint,
          approvedBy: result[10] as Address,
          approvalMessage: result[11] as string,
          autoApproved: result[12] as boolean,
          paidAt: result[13] as bigint,
          deadline: result[14] as bigint,
          penaltyPercentage: result[15] as bigint,
          isLocked: result[16] as boolean
        })
      }
    }
  }

  return {
    milestones,
    isLoading,
    error,
    refetch
  }
}

// Main hook for milestone funding methods
export function useMilestoneFunding(contractAddress: Address) {
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize the hook
  useEffect(() => {
    if (contractAddress) {
      setIsInitialized(true)
    }
  }, [contractAddress])

  // Get grant count
  const { grantCount, isLoading: countLoading, error: countError } = useGrantCount(contractAddress)

  // Helper function to get grant status label
  const getGrantStatusLabel = useCallback((status: GrantStatus): 'active' | 'completed' | 'cancelled' => {
    switch (status) {
      case GrantStatus.ACTIVE:
        return 'active'
      case GrantStatus.COMPLETED:
        return 'completed'
      case GrantStatus.CANCELLED:
        return 'cancelled'
      default:
        return 'active'
    }
  }, [])

  // Helper function to get milestone status label
  const getMilestoneStatusLabel = useCallback((status: MilestoneStatus): string => {
    switch (status) {
      case MilestoneStatus.PENDING:
        return 'pending'
      case MilestoneStatus.SUBMITTED:
        return 'submitted'
      case MilestoneStatus.APPROVED:
        return 'approved'
      case MilestoneStatus.REJECTED:
        return 'rejected'
      case MilestoneStatus.PAID:
        return 'paid'
      case MilestoneStatus.LOCKED:
        return 'locked'
      default:
        return 'unknown'
    }
  }, [])

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

  const isLoading = countLoading
  const error = countError

  return {
    isInitialized,
    formatTokenAmount,
    getGrantStatusLabel,
    getMilestoneStatusLabel,
    grantCount: grantCount ? Number(grantCount) : 0,
    isLoadingCount: countLoading,
    isLoading,
    error
  }
}

// Helper function to format grant for display
export function formatGrantForDisplay(grant: Grant): EnhancedGrant | null {
  if (!grant) return null

  return {
    id: Number(grant.id),
    grantee: grant.grantee,
    linkedEntityId: Number(grant.linkedEntityId),
    entityType: grant.entityType,
    siteFeePercentage: Number(grant.siteFeePercentage),
    reviewTimeLock: grant.reviewTimeLock,
    milestoneDeadline: grant.milestoneDeadline,
    status: grant.status,
    createdAt: grant.createdAt,
    completedAt: grant.completedAt,
    supportedTokens: grant.supportedTokens,
    statusLabel: grant.status === GrantStatus.ACTIVE ? 'active' : 
                 grant.status === GrantStatus.COMPLETED ? 'completed' : 'cancelled'
  }
}

export default {
  useCreateGrant,
  useSubmitMilestone,
  useApproveMilestone,
  useRejectMilestone,
  useCheckAndAutoApproveMilestone,
  useResubmitMilestone,
  useAddFundsToGrant,
  useWithdrawFundsFromGrant,
  useCancelGrant,
  useAddGrantAdmin,
  useRemoveGrantAdmin,
  useSingleGrant,
  useGrantTokenAmounts,
  useSingleMilestone,
  useMilestonePayout,
  useMilestoneRejection,
  useGrantMilestones,
  useGrantAdmins,
  useGrantCount,
  useMilestoneCount,
  useCanAutoApproveMilestone,
  useMultipleMilestones,
  useMilestoneFunding,
  formatGrantForDisplay
}

