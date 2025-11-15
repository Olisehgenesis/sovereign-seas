// hooks/useProjectMilestones.ts

import { useReadContract, useReadContracts, useAccount, useSendTransaction } from 'wagmi'
import { type Address } from 'viem'
import { milestoneABI as abi } from '@/abi/milestoneABI'
import { useMemo } from 'react'
import { getMilestoneContractAddress } from '@/utils/contractConfig'
import { Interface } from 'ethers'
import { getReferralTag, submitReferral } from '@divvi/referral-sdk'
import { DIVVI_CONSUMER_ADDRESS } from '@/utils/divvi'

// Types
export const ProjectMilestoneType = {
  INTERNAL: 0,
  ASSIGNED: 1,
  OPEN: 2
} as const;

export type ProjectMilestoneType = typeof ProjectMilestoneType[keyof typeof ProjectMilestoneType];

export const ProjectMilestoneStatus = {
  DRAFT: 0,
  ACTIVE: 1,
  CLAIMED: 2,
  SUBMITTED: 3,
  APPROVED: 4,
  REJECTED: 5,
  PAID: 6,
  CANCELLED: 7
} as const;

export type ProjectMilestoneStatus = typeof ProjectMilestoneStatus[keyof typeof ProjectMilestoneStatus];

export interface ProjectMilestone {
  id: bigint
  projectId: bigint
  milestoneType: ProjectMilestoneType
  status: ProjectMilestoneStatus
  assignedTo: Address
  claimedBy: Address
  title: string
  description: string
  requirements: string
  evidenceHash: string
  requiredApprovals: bigint
  allowSiteAdminApproval: boolean
  createdAt: bigint
  deadline: bigint
  claimedAt: bigint
  submittedAt: bigint
  approvedAt: bigint
  paidAt: bigint
  supportedTokens: Address[]
}

export interface ProjectMilestoneTokenDetails {
  tokens: Address[]
  rewardAmounts: bigint[]
  escrowedAmounts: bigint[]
}

// Helper function for logging
const logDebug = (message: string, data?: any, level: 'info' | 'error' | 'warn' = 'info') => {
  if (import.meta.env.DEV) {
    console[level](`[useProjectMilestones] ${message}`, data || '')
  }
}

/**
 * Hook to create a project milestone
 */
export function useCreateProjectMilestone() {
  const { address: user } = useAccount()
  const { sendTransactionAsync, isPending, isError, error, isSuccess, data } = useSendTransaction()

  const createProjectMilestone = async ({
    projectId,
    milestoneType,
    assignedTo,
    title,
    description,
    requirements,
    deadline,
    requiredApprovals,
    allowSiteAdminApproval,
    stewards = []
  }: {
    projectId: bigint
    milestoneType: ProjectMilestoneType
    assignedTo: Address
    title: string
    description: string
    requirements: string
    deadline: bigint
    requiredApprovals: bigint
    allowSiteAdminApproval: boolean
    stewards?: Address[]
  }) => {
    try {
      if (!user) { throw new Error('User wallet not connected') }

      const contractAddress = getMilestoneContractAddress()
      const contractInterface = new Interface(abi)
      const functionData = contractInterface.encodeFunctionData('createProjectMilestone', [
        projectId,
        milestoneType,
        assignedTo,
        title,
        description,
        requirements,
        deadline,
        requiredApprovals,
        allowSiteAdminApproval,
        stewards
      ])

      const referralTag = getReferralTag({ user: user as Address, consumer: DIVVI_CONSUMER_ADDRESS as Address })
      const dataWithSuffix = functionData + referralTag

      const isTestnet = import.meta.env.VITE_ENV === 'testnet'
      const chainId = isTestnet ? 44787 : 42220

      const txHash = await sendTransactionAsync({
        to: contractAddress,
        data: dataWithSuffix as `0x${string}`,
      })

      if (!txHash) { throw new Error('Transaction failed to send') }

      try {
        await submitReferral({ txHash: txHash as `0x${string}`, chainId: chainId })
        logDebug('Divvi referral submitted', { txHash, chainId }, 'info')
      } catch (referralError) {
        console.warn('Divvi referral submission error:', referralError)
      }

      return { success: true, hash: txHash, receipt: null }
    } catch (err) {
      logDebug('Create Project Milestone Error', { error: err, message: err instanceof Error ? err.message : 'Unknown error' }, 'error')
      throw err
    }
  }

  return { createProjectMilestone, isPending, isError, error, isSuccess, data }
}

/**
 * Hook to fund a project milestone
 */
export function useFundProjectMilestone() {
  const { address: user } = useAccount()
  const { sendTransactionAsync, isPending, isError, error, isSuccess, data } = useSendTransaction()

  const fundProjectMilestone = async ({
    milestoneId,
    tokens,
    amounts,
    value
  }: {
    milestoneId: bigint
    tokens: Address[]
    amounts: bigint[]
    value?: bigint
  }) => {
    try {
      if (!user) { throw new Error('User wallet not connected') }

      const contractAddress = getMilestoneContractAddress()
      const contractInterface = new Interface(abi)
      const functionData = contractInterface.encodeFunctionData('fundProjectMilestone', [
        milestoneId,
        tokens,
        amounts
      ])

      const referralTag = getReferralTag({ user: user as Address, consumer: DIVVI_CONSUMER_ADDRESS as Address })
      const dataWithSuffix = functionData + referralTag

      const isTestnet = import.meta.env.VITE_ENV === 'testnet'
      const chainId = isTestnet ? 44787 : 42220

      const txHash = await sendTransactionAsync({
        to: contractAddress,
        data: dataWithSuffix as `0x${string}`,
        value: value || BigInt(0),
      })

      if (!txHash) { throw new Error('Transaction failed to send') }

      try {
        await submitReferral({ txHash: txHash as `0x${string}`, chainId: chainId })
        logDebug('Divvi referral submitted', { txHash, chainId }, 'info')
      } catch (referralError) {
        console.warn('Divvi referral submission error:', referralError)
      }

      return { success: true, hash: txHash, receipt: null }
    } catch (err) {
      logDebug('Fund Project Milestone Error', { error: err, message: err instanceof Error ? err.message : 'Unknown error' }, 'error')
      throw err
    }
  }

  return { fundProjectMilestone, isPending, isError, error, isSuccess, data }
}

/**
 * Hook to claim an open milestone
 */
export function useClaimOpenMilestone() {
  const { address: user } = useAccount()
  const { sendTransactionAsync, isPending, isError, error, isSuccess, data } = useSendTransaction()

  const claimOpenMilestone = async (milestoneId: bigint) => {
    try {
      if (!user) { throw new Error('User wallet not connected') }

      const contractAddress = getMilestoneContractAddress()
      const contractInterface = new Interface(abi)
      const functionData = contractInterface.encodeFunctionData('claimOpenMilestone', [milestoneId])

      const referralTag = getReferralTag({ user: user as Address, consumer: DIVVI_CONSUMER_ADDRESS as Address })
      const dataWithSuffix = functionData + referralTag

      const isTestnet = import.meta.env.VITE_ENV === 'testnet'
      const chainId = isTestnet ? 44787 : 42220

      const txHash = await sendTransactionAsync({
        to: contractAddress,
        data: dataWithSuffix as `0x${string}`,
      })

      if (!txHash) { throw new Error('Transaction failed to send') }

      try {
        await submitReferral({ txHash: txHash as `0x${string}`, chainId: chainId })
        logDebug('Divvi referral submitted', { txHash, chainId }, 'info')
      } catch (referralError) {
        console.warn('Divvi referral submission error:', referralError)
      }

      return { success: true, hash: txHash, receipt: null }
    } catch (err) {
      logDebug('Claim Open Milestone Error', { error: err, message: err instanceof Error ? err.message : 'Unknown error' }, 'error')
      throw err
    }
  }

  return { claimOpenMilestone, isPending, isError, error, isSuccess, data }
}

/**
 * Hook to submit milestone evidence
 */
export function useSubmitMilestoneEvidence() {
  const { address: user } = useAccount()
  const { sendTransactionAsync, isPending, isError, error, isSuccess, data } = useSendTransaction()

  const submitMilestoneEvidence = async (milestoneId: bigint, evidenceHash: string) => {
    try {
      if (!user) { throw new Error('User wallet not connected') }

      const contractAddress = getMilestoneContractAddress()
      const contractInterface = new Interface(abi)
      const functionData = contractInterface.encodeFunctionData('submitMilestoneEvidence', [
        milestoneId,
        evidenceHash
      ])

      const referralTag = getReferralTag({ user: user as Address, consumer: DIVVI_CONSUMER_ADDRESS as Address })
      const dataWithSuffix = functionData + referralTag

      const isTestnet = import.meta.env.VITE_ENV === 'testnet'
      const chainId = isTestnet ? 44787 : 42220

      const txHash = await sendTransactionAsync({
        to: contractAddress,
        data: dataWithSuffix as `0x${string}`,
      })

      if (!txHash) { throw new Error('Transaction failed to send') }

      try {
        await submitReferral({ txHash: txHash as `0x${string}`, chainId: chainId })
        logDebug('Divvi referral submitted', { txHash, chainId }, 'info')
      } catch (referralError) {
        console.warn('Divvi referral submission error:', referralError)
      }

      return { success: true, hash: txHash, receipt: null }
    } catch (err) {
      logDebug('Submit Milestone Evidence Error', { error: err, message: err instanceof Error ? err.message : 'Unknown error' }, 'error')
      throw err
    }
  }

  return { submitMilestoneEvidence, isPending, isError, error, isSuccess, data }
}

/**
 * Hook to approve a project milestone
 */
export function useApproveProjectMilestone() {
  const { address: user } = useAccount()
  const { sendTransactionAsync, isPending, isError, error, isSuccess, data } = useSendTransaction()

  const approveProjectMilestone = async (milestoneId: bigint, message: string) => {
    try {
      if (!user) { throw new Error('User wallet not connected') }

      const contractAddress = getMilestoneContractAddress()
      const contractInterface = new Interface(abi)
      const functionData = contractInterface.encodeFunctionData('approveProjectMilestone', [
        milestoneId,
        message
      ])

      const referralTag = getReferralTag({ user: user as Address, consumer: DIVVI_CONSUMER_ADDRESS as Address })
      const dataWithSuffix = functionData + referralTag

      const isTestnet = import.meta.env.VITE_ENV === 'testnet'
      const chainId = isTestnet ? 44787 : 42220

      const txHash = await sendTransactionAsync({
        to: contractAddress,
        data: dataWithSuffix as `0x${string}`,
      })

      if (!txHash) { throw new Error('Transaction failed to send') }

      try {
        await submitReferral({ txHash: txHash as `0x${string}`, chainId: chainId })
        logDebug('Divvi referral submitted', { txHash, chainId }, 'info')
      } catch (referralError) {
        console.warn('Divvi referral submission error:', referralError)
      }

      return { success: true, hash: txHash, receipt: null }
    } catch (err) {
      logDebug('Approve Project Milestone Error', { error: err, message: err instanceof Error ? err.message : 'Unknown error' }, 'error')
      throw err
    }
  }

  return { approveProjectMilestone, isPending, isError, error, isSuccess, data }
}

/**
 * Hook to reject a project milestone
 */
export function useRejectProjectMilestone() {
  const { address: user } = useAccount()
  const { sendTransactionAsync, isPending, isError, error, isSuccess, data } = useSendTransaction()

  const rejectProjectMilestone = async (milestoneId: bigint, message: string) => {
    try {
      if (!user) { throw new Error('User wallet not connected') }

      const contractAddress = getMilestoneContractAddress()
      const contractInterface = new Interface(abi)
      const functionData = contractInterface.encodeFunctionData('rejectProjectMilestone', [
        milestoneId,
        message
      ])

      const referralTag = getReferralTag({ user: user as Address, consumer: DIVVI_CONSUMER_ADDRESS as Address })
      const dataWithSuffix = functionData + referralTag

      const isTestnet = import.meta.env.VITE_ENV === 'testnet'
      const chainId = isTestnet ? 44787 : 42220

      const txHash = await sendTransactionAsync({
        to: contractAddress,
        data: dataWithSuffix as `0x${string}`,
      })

      if (!txHash) { throw new Error('Transaction failed to send') }

      try {
        await submitReferral({ txHash: txHash as `0x${string}`, chainId: chainId })
        logDebug('Divvi referral submitted', { txHash, chainId }, 'info')
      } catch (referralError) {
        console.warn('Divvi referral submission error:', referralError)
      }

      return { success: true, hash: txHash, receipt: null }
    } catch (err) {
      logDebug('Reject Project Milestone Error', { error: err, message: err instanceof Error ? err.message : 'Unknown error' }, 'error')
      throw err
    }
  }

  return { rejectProjectMilestone, isPending, isError, error, isSuccess, data }
}

/**
 * Hook to claim completion rewards
 */
export function useClaimCompletionRewards() {
  const { address: user } = useAccount()
  const { sendTransactionAsync, isPending, isError, error, isSuccess, data } = useSendTransaction()

  const claimCompletionRewards = async (milestoneId: bigint) => {
    try {
      if (!user) { throw new Error('User wallet not connected') }

      const contractAddress = getMilestoneContractAddress()
      const contractInterface = new Interface(abi)
      const functionData = contractInterface.encodeFunctionData('claimCompletionRewards', [milestoneId])

      const referralTag = getReferralTag({ user: user as Address, consumer: DIVVI_CONSUMER_ADDRESS as Address })
      const dataWithSuffix = functionData + referralTag

      const isTestnet = import.meta.env.VITE_ENV === 'testnet'
      const chainId = isTestnet ? 44787 : 42220

      const txHash = await sendTransactionAsync({
        to: contractAddress,
        data: dataWithSuffix as `0x${string}`,
      })

      if (!txHash) { throw new Error('Transaction failed to send') }

      try {
        await submitReferral({ txHash: txHash as `0x${string}`, chainId: chainId })
        logDebug('Divvi referral submitted', { txHash, chainId }, 'info')
      } catch (referralError) {
        console.warn('Divvi referral submission error:', referralError)
      }

      return { success: true, hash: txHash, receipt: null }
    } catch (err) {
      logDebug('Claim Completion Rewards Error', { error: err, message: err instanceof Error ? err.message : 'Unknown error' }, 'error')
      throw err
    }
  }

  return { claimCompletionRewards, isPending, isError, error, isSuccess, data }
}

/**
 * Hook to add a milestone steward
 */
export function useAddMilestoneSteward() {
  const { address: user } = useAccount()
  const { sendTransactionAsync, isPending, isError, error, isSuccess, data } = useSendTransaction()

  const addMilestoneSteward = async (milestoneId: bigint, steward: Address) => {
    try {
      if (!user) { throw new Error('User wallet not connected') }

      const contractAddress = getMilestoneContractAddress()
      const contractInterface = new Interface(abi)
      const functionData = contractInterface.encodeFunctionData('addMilestoneSteward', [
        milestoneId,
        steward
      ])

      const referralTag = getReferralTag({ user: user as Address, consumer: DIVVI_CONSUMER_ADDRESS as Address })
      const dataWithSuffix = functionData + referralTag

      const isTestnet = import.meta.env.VITE_ENV === 'testnet'
      const chainId = isTestnet ? 44787 : 42220

      const txHash = await sendTransactionAsync({
        to: contractAddress,
        data: dataWithSuffix as `0x${string}`,
      })

      if (!txHash) { throw new Error('Transaction failed to send') }

      try {
        await submitReferral({ txHash: txHash as `0x${string}`, chainId: chainId })
        logDebug('Divvi referral submitted', { txHash, chainId }, 'info')
      } catch (referralError) {
        console.warn('Divvi referral submission error:', referralError)
      }

      return { success: true, hash: txHash, receipt: null }
    } catch (err) {
      logDebug('Add Milestone Steward Error', { error: err, message: err instanceof Error ? err.message : 'Unknown error' }, 'error')
      throw err
    }
  }

  return { addMilestoneSteward, isPending, isError, error, isSuccess, data }
}

/**
 * Hook to remove a milestone steward
 */
export function useRemoveMilestoneSteward() {
  const { address: user } = useAccount()
  const { sendTransactionAsync, isPending, isError, error, isSuccess, data } = useSendTransaction()

  const removeMilestoneSteward = async (milestoneId: bigint, steward: Address) => {
    try {
      if (!user) { throw new Error('User wallet not connected') }

      const contractAddress = getMilestoneContractAddress()
      const contractInterface = new Interface(abi)
      const functionData = contractInterface.encodeFunctionData('removeMilestoneSteward', [
        milestoneId,
        steward
      ])

      const referralTag = getReferralTag({ user: user as Address, consumer: DIVVI_CONSUMER_ADDRESS as Address })
      const dataWithSuffix = functionData + referralTag

      const isTestnet = import.meta.env.VITE_ENV === 'testnet'
      const chainId = isTestnet ? 44787 : 42220

      const txHash = await sendTransactionAsync({
        to: contractAddress,
        data: dataWithSuffix as `0x${string}`,
      })

      if (!txHash) { throw new Error('Transaction failed to send') }

      try {
        await submitReferral({ txHash: txHash as `0x${string}`, chainId: chainId })
        logDebug('Divvi referral submitted', { txHash, chainId }, 'info')
      } catch (referralError) {
        console.warn('Divvi referral submission error:', referralError)
      }

      return { success: true, hash: txHash, receipt: null }
    } catch (err) {
      logDebug('Remove Milestone Steward Error', { error: err, message: err instanceof Error ? err.message : 'Unknown error' }, 'error')
      throw err
    }
  }

  return { removeMilestoneSteward, isPending, isError, error, isSuccess, data }
}

/**
 * Hook to cancel a project milestone
 */
export function useCancelProjectMilestone() {
  const { address: user } = useAccount()
  const { sendTransactionAsync, isPending, isError, error, isSuccess, data } = useSendTransaction()

  const cancelProjectMilestone = async (milestoneId: bigint) => {
    try {
      if (!user) { throw new Error('User wallet not connected') }

      const contractAddress = getMilestoneContractAddress()
      const contractInterface = new Interface(abi)
      const functionData = contractInterface.encodeFunctionData('cancelProjectMilestone', [milestoneId])

      const referralTag = getReferralTag({ user: user as Address, consumer: DIVVI_CONSUMER_ADDRESS as Address })
      const dataWithSuffix = functionData + referralTag

      const isTestnet = import.meta.env.VITE_ENV === 'testnet'
      const chainId = isTestnet ? 44787 : 42220

      const txHash = await sendTransactionAsync({
        to: contractAddress,
        data: dataWithSuffix as `0x${string}`,
      })

      if (!txHash) { throw new Error('Transaction failed to send') }

      try {
        await submitReferral({ txHash: txHash as `0x${string}`, chainId: chainId })
        logDebug('Divvi referral submitted', { txHash, chainId }, 'info')
      } catch (referralError) {
        console.warn('Divvi referral submission error:', referralError)
      }

      return { success: true, hash: txHash, receipt: null }
    } catch (err) {
      logDebug('Cancel Project Milestone Error', { error: err, message: err instanceof Error ? err.message : 'Unknown error' }, 'error')
      throw err
    }
  }

  return { cancelProjectMilestone, isPending, isError, error, isSuccess, data }
}

/**
 * Hook to get a single project milestone
 */
export function useProjectMilestone(milestoneId: bigint | undefined, enabled: boolean = true) {
  const contractAddress = getMilestoneContractAddress()

  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'getProjectMilestone',
    args: milestoneId !== undefined ? [milestoneId] : undefined,
    query: { enabled: enabled && milestoneId !== undefined }
  })

  const milestone: ProjectMilestone | null = useMemo(() => {
    if (!data) return null
    const [
      id, projId, milestoneType, status, assignedTo, claimedBy,
      title, description, requirements, evidenceHash, requiredApprovals,
      allowSiteAdminApproval, createdAt, deadline, claimedAt, submittedAt,
      approvedAt, paidAt, supportedTokens
    ] = data as any

    return {
      id: BigInt(id),
      projectId: BigInt(projId),
      milestoneType: Number(milestoneType) as ProjectMilestoneType,
      status: Number(status) as ProjectMilestoneStatus,
      assignedTo: assignedTo as Address,
      claimedBy: claimedBy as Address,
      title,
      description,
      requirements,
      evidenceHash,
      requiredApprovals: BigInt(requiredApprovals),
      allowSiteAdminApproval,
      createdAt: BigInt(createdAt),
      deadline: BigInt(deadline),
      claimedAt: BigInt(claimedAt),
      submittedAt: BigInt(submittedAt),
      approvedAt: BigInt(approvedAt),
      paidAt: BigInt(paidAt),
      supportedTokens: supportedTokens as Address[]
    }
  }, [data])

  return { milestone, isLoading, error, refetch }
}

/**
 * Hook to get all milestones for a project
 */
export function useProjectMilestones(projectId: bigint | undefined, enabled: boolean = true) {
  const contractAddress = getMilestoneContractAddress()

  const { data: milestoneIds, isLoading: isLoadingIds, error: idsError } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'getProjectMilestones',
    args: projectId !== undefined ? [projectId] : undefined,
    query: { enabled: enabled && projectId !== undefined }
  })

  const milestoneIdsArray = useMemo(() => {
    if (!milestoneIds) return []
    return (milestoneIds as bigint[])
  }, [milestoneIds])

  // Fetch all milestone details
  const contracts = useMemo(() => {
    if (milestoneIdsArray.length === 0) return []
    return milestoneIdsArray.map((id) => ({
      address: contractAddress as `0x${string}`,
      abi: abi as any,
      functionName: 'getProjectMilestone' as const,
      args: [id] as readonly [bigint]
    }))
  }, [milestoneIdsArray, contractAddress])

  const { data: milestonesData, isLoading: isLoadingMilestones } = useReadContracts({
    contracts: contracts,
    query: { enabled: enabled && contracts.length > 0 }
  })

  const milestones: ProjectMilestone[] = useMemo(() => {
    if (!milestonesData) return []
    return milestonesData.map((data: any) => {
      if (!data || !data.result) return null
      const result = data.result
      const [
        id, projId, milestoneType, status, assignedTo, claimedBy,
        title, description, requirements, evidenceHash, requiredApprovals,
        allowSiteAdminApproval, createdAt, deadline, claimedAt, submittedAt,
        approvedAt, paidAt, supportedTokens
      ] = result

      return {
        id: BigInt(id),
        projectId: BigInt(projId),
        milestoneType: Number(milestoneType) as ProjectMilestoneType,
        status: Number(status) as ProjectMilestoneStatus,
        assignedTo: assignedTo as Address,
        claimedBy: claimedBy as Address,
        title,
        description,
        requirements,
        evidenceHash,
        requiredApprovals: BigInt(requiredApprovals),
        allowSiteAdminApproval,
        createdAt: BigInt(createdAt),
        deadline: BigInt(deadline),
        claimedAt: BigInt(claimedAt),
        submittedAt: BigInt(submittedAt),
        approvedAt: BigInt(approvedAt),
        paidAt: BigInt(paidAt),
        supportedTokens: supportedTokens as Address[]
      }
    }).filter((m: any) => m !== null) as ProjectMilestone[]
  }, [milestonesData])

  return {
    milestones,
    isLoading: isLoadingIds || isLoadingMilestones,
    error: idsError,
    refetch: () => {}
  }
}

/**
 * Hook to get open milestones (for Tasks page)
 */
export function useOpenMilestones(enabled: boolean = true) {
  const contractAddress = getMilestoneContractAddress()

  // Get total milestone count
  const { data: totalCount, isLoading: isLoadingCount } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'getProjectMilestoneCount',
    query: { enabled }
  })

  const count = useMemo(() => {
    if (!totalCount) return 0
    return Number(totalCount)
  }, [totalCount])

  // Fetch all milestones (we'll filter for open ones)
  const contracts = useMemo(() => {
    if (count === 0) return []
    return Array.from({ length: count }, (_, i) => ({
      address: contractAddress as `0x${string}`,
      abi: abi as any,
      functionName: 'getProjectMilestone' as const,
      args: [BigInt(i)] as readonly [bigint]
    }))
  }, [count, contractAddress])

  const { data: milestonesData, isLoading: isLoadingMilestones } = useReadContracts({
    contracts: contracts,
    query: { enabled: enabled && contracts.length > 0 }
  })

  const openMilestones: ProjectMilestone[] = useMemo(() => {
    if (!milestonesData) return []
    return milestonesData
      .map((data: any) => {
        if (!data || !data.result) return null
        const result = data.result
        const [
          id, projectId, milestoneType, status, assignedTo, claimedBy,
          title, description, requirements, evidenceHash, requiredApprovals,
          allowSiteAdminApproval, createdAt, deadline, claimedAt, submittedAt,
          approvedAt, paidAt, supportedTokens
        ] = result

        // Filter for open milestones (OPEN type, ACTIVE status)
        if (Number(milestoneType) !== ProjectMilestoneType.OPEN || Number(status) !== ProjectMilestoneStatus.ACTIVE) {
          return null
        }

        return {
          id: BigInt(id),
          projectId: BigInt(projectId),
          milestoneType: Number(milestoneType) as ProjectMilestoneType,
          status: Number(status) as ProjectMilestoneStatus,
          assignedTo: assignedTo as Address,
          claimedBy: claimedBy as Address,
          title,
          description,
          requirements,
          evidenceHash,
          requiredApprovals: BigInt(requiredApprovals),
          allowSiteAdminApproval,
          createdAt: BigInt(createdAt),
          deadline: BigInt(deadline),
          claimedAt: BigInt(claimedAt),
          submittedAt: BigInt(submittedAt),
          approvedAt: BigInt(approvedAt),
          paidAt: BigInt(paidAt),
          supportedTokens: supportedTokens as Address[]
        }
      })
      .filter((m: any) => m !== null) as ProjectMilestone[]
  }, [milestonesData])

  return {
    openMilestones,
    isLoading: isLoadingCount || isLoadingMilestones,
    error: null,
    refetch: () => {}
  }
}

/**
 * Hook to get all milestones assigned to a user (ASSIGNED type or INTERNAL where user is project owner)
 */
export function useUserAssignedMilestones(userAddress: Address | undefined, enabled: boolean = true) {
  const contractAddress = getMilestoneContractAddress()

  // Get total milestone count
  const { data: totalCount, isLoading: isLoadingCount } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'getProjectMilestoneCount',
    query: { enabled: enabled && !!userAddress }
  })

  const count = useMemo(() => {
    if (!totalCount) return 0
    return Number(totalCount)
  }, [totalCount])

  // Fetch all milestones
  const contracts = useMemo(() => {
    if (count === 0 || !userAddress) return []
    return Array.from({ length: count }, (_, i) => ({
      address: contractAddress as `0x${string}`,
      abi: abi as any,
      functionName: 'getProjectMilestone' as const,
      args: [BigInt(i)] as readonly [bigint]
    }))
  }, [count, contractAddress, userAddress])

  const { data: milestonesData, isLoading: isLoadingMilestones } = useReadContracts({
    contracts: contracts,
    query: { enabled: enabled && contracts.length > 0 && !!userAddress }
  })

  const assignedMilestones: ProjectMilestone[] = useMemo(() => {
    if (!milestonesData || !userAddress) return []
    return milestonesData
      .map((data: any) => {
        if (!data || !data.result) return null
        const result = data.result
        const [
          id, projectId, milestoneType, status, assignedTo, claimedBy,
          title, description, requirements, evidenceHash, requiredApprovals,
          allowSiteAdminApproval, createdAt, deadline, claimedAt, submittedAt,
          approvedAt, paidAt, supportedTokens
        ] = result

        const milestone = {
          id: BigInt(id),
          projectId: BigInt(projectId),
          milestoneType: Number(milestoneType) as ProjectMilestoneType,
          status: Number(status) as ProjectMilestoneStatus,
          assignedTo: assignedTo as Address,
          claimedBy: claimedBy as Address,
          title,
          description,
          requirements,
          evidenceHash,
          requiredApprovals: BigInt(requiredApprovals),
          allowSiteAdminApproval,
          createdAt: BigInt(createdAt),
          deadline: BigInt(deadline),
          claimedAt: BigInt(claimedAt),
          submittedAt: BigInt(submittedAt),
          approvedAt: BigInt(approvedAt),
          paidAt: BigInt(paidAt),
          supportedTokens: supportedTokens as Address[]
        }

        // Filter for milestones assigned to this user
        const isAssigned = milestone.assignedTo?.toLowerCase() === userAddress.toLowerCase()
        const isClaimedByUser = milestone.claimedBy?.toLowerCase() === userAddress.toLowerCase()
        
        if (isAssigned || isClaimedByUser) {
          return milestone
        }
        return null
      })
      .filter((m: any) => m !== null) as ProjectMilestone[]
  }, [milestonesData, userAddress])

  return {
    milestones: assignedMilestones,
    isLoading: isLoadingCount || isLoadingMilestones,
    error: null,
    refetch: () => {}
  }
}

/**
 * Hook to get user's claimed milestones
 */
export function useUserClaimedMilestones(userAddress: Address | undefined, enabled: boolean = true) {
  const contractAddress = getMilestoneContractAddress()

  const { data: milestoneIds, isLoading, error } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'getUserClaimedMilestones',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: enabled && !!userAddress }
  })

  const milestoneIdsArray = useMemo(() => {
    if (!milestoneIds) return []
    return (milestoneIds as bigint[])
  }, [milestoneIds])

  // Fetch milestone details
  const contracts = useMemo(() => {
    if (milestoneIdsArray.length === 0) return []
    return milestoneIdsArray.map((id) => ({
      address: contractAddress as `0x${string}`,
      abi: abi as any,
      functionName: 'getProjectMilestone' as const,
      args: [id] as readonly [bigint]
    }))
  }, [milestoneIdsArray, contractAddress])

  const { data: milestonesData, isLoading: isLoadingMilestones } = useReadContracts({
    contracts: contracts,
    query: { enabled: enabled && contracts.length > 0 }
  })

  const milestones: ProjectMilestone[] = useMemo(() => {
    if (!milestonesData) return []
    return milestonesData.map((data: any) => {
      if (!data || !data.result) return null
      const result = data.result
      const [
        id, projectId, milestoneType, status, assignedTo, claimedBy,
        title, description, requirements, evidenceHash, requiredApprovals,
        allowSiteAdminApproval, createdAt, deadline, claimedAt, submittedAt,
        approvedAt, paidAt, supportedTokens
      ] = result

      return {
        id: BigInt(id),
        projectId: BigInt(projectId),
        milestoneType: milestoneType as ProjectMilestoneType,
        status: status as ProjectMilestoneStatus,
        assignedTo: assignedTo as Address,
        claimedBy: claimedBy as Address,
        title,
        description,
        requirements,
        evidenceHash,
        requiredApprovals: BigInt(requiredApprovals),
        allowSiteAdminApproval,
        createdAt: BigInt(createdAt),
        deadline: BigInt(deadline),
        claimedAt: BigInt(claimedAt),
        submittedAt: BigInt(submittedAt),
        approvedAt: BigInt(approvedAt),
        paidAt: BigInt(paidAt),
        supportedTokens: supportedTokens as Address[]
      }
    }).filter((m: any) => m !== null) as ProjectMilestone[]
  }, [milestonesData])

  return { milestones, isLoading: isLoading || isLoadingMilestones, error, refetch: () => {} }
}

/**
 * Hook to get milestone token details
 */
export function useProjectMilestoneTokenDetails(milestoneId: bigint | undefined, enabled: boolean = true) {
  const contractAddress = getMilestoneContractAddress()

  const { data, isLoading, error } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'getProjectMilestoneTokenDetails',
    args: milestoneId !== undefined ? [milestoneId] : undefined,
    query: { enabled: enabled && milestoneId !== undefined }
  })

  const tokenDetails: ProjectMilestoneTokenDetails | null = useMemo(() => {
    if (!data) return null
    const [tokens, rewardAmounts, escrowedAmounts] = data as any
    return {
      tokens: tokens as Address[],
      rewardAmounts: (rewardAmounts as bigint[]).map((a: bigint) => BigInt(a)),
      escrowedAmounts: (escrowedAmounts as bigint[]).map((a: bigint) => BigInt(a))
    }
  }, [data])

  return { tokenDetails, isLoading, error }
}

/**
 * Hook to check if user can submit milestone
 */
export function useCanSubmitMilestone(milestoneId: bigint | undefined, userAddress: Address | undefined, enabled: boolean = true) {
  const contractAddress = getMilestoneContractAddress()

  const { data, isLoading, error } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'canSubmitMilestone',
    args: milestoneId !== undefined && userAddress ? [milestoneId, userAddress] : undefined,
    query: { enabled: enabled && milestoneId !== undefined && !!userAddress }
  })

  return { canSubmit: data as boolean || false, isLoading, error }
}

/**
 * Hook to check if user can approve milestone
 */
export function useCanApproveMilestone(milestoneId: bigint | undefined, userAddress: Address | undefined, enabled: boolean = true) {
  const contractAddress = getMilestoneContractAddress()

  const { data, isLoading, error } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'canApproveMilestone',
    args: milestoneId !== undefined && userAddress ? [milestoneId, userAddress] : undefined,
    query: { enabled: enabled && milestoneId !== undefined && !!userAddress }
  })

  return { canApprove: data as boolean || false, isLoading, error }
}

/**
 * Hook to check if milestone can be claimed
 */
export function useCanClaimMilestone(milestoneId: bigint | undefined, enabled: boolean = true) {
  const contractAddress = getMilestoneContractAddress()

  const { data, isLoading, error } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'canClaimMilestone',
    args: milestoneId !== undefined ? [milestoneId] : undefined,
    query: { enabled: enabled && milestoneId !== undefined }
  })

  return { canClaim: data as boolean || false, isLoading, error }
}

/**
 * Hook to get milestone approval count
 */
export function useGetMilestoneApprovalCount(milestoneId: bigint | undefined, enabled: boolean = true) {
  const contractAddress = getMilestoneContractAddress()

  const { data, isLoading, error } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'getMilestoneApprovalCount',
    args: milestoneId !== undefined ? [milestoneId] : undefined,
    query: { enabled: enabled && milestoneId !== undefined }
  })

  return { approvalCount: data ? Number(data) : 0, isLoading, error }
}

/**
 * Hook to get milestone approvers
 */
export function useGetMilestoneApprovers(milestoneId: bigint | undefined, enabled: boolean = true) {
  const contractAddress = getMilestoneContractAddress()

  const { data, isLoading, error } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'getMilestoneApprovers',
    args: milestoneId !== undefined ? [milestoneId] : undefined,
    query: { enabled: enabled && milestoneId !== undefined }
  })

  return { approvers: (data as Address[]) || [], isLoading, error }
}

