// hooks/useProjectTipping.ts

import { useWriteContract, useReadContract, useReadContracts } from 'wagmi'
import {useAccount} from 'wagmi'
import type { Address } from 'viem'
import { formatEther, parseEther } from 'viem'
import { tipsABI as abi } from '@/abi/tipsABI' 
import { useState, useEffect, useCallback } from 'react'
import { publicClient } from '@/utils/clients';
import { erc20ABI } from '@/abi/erc20ABI';

// Types for better TypeScript support
export interface TipInfo {
  tipper: Address
  projectId: bigint
  token: Address
  amount: bigint
  celoEquivalent: bigint
  timestamp: bigint
  message: string
}

export interface ProjectTipSummary {
  projectId: bigint
  projectOwner: Address
  projectName: string
  totalTipsInCelo: bigint
  tipperCount: bigint
  tippedTokens: Address[]
  tokenAmounts: bigint[]
  isActive: boolean
}

export interface UserTipSummary {
  user: Address
  totalTippedInCelo: bigint
  projectCount: bigint
  tippedProjectIds: bigint[]
  recentTips: TipInfo[]
}

export interface EnhancedTipInfo extends TipInfo {
  timeAgo?: string
  amountFormatted?: string
  celoEquivalentFormatted?: string
}

export interface EnhancedProjectTipSummary extends ProjectTipSummary {
  totalTipsFormatted?: string
  tokenAmountsFormatted?: string[]
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

// Hook for tipping with ERC20 tokens (updated to include celoEquivalent)
export function useTipProject(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess, data } = useWriteContract()

  const tipProject = async ({
    projectId,
    token,
    amount,
    celoEquivalent,
    message = ''
  }: {
    projectId: bigint
    token: Address
    amount: bigint
    celoEquivalent: bigint
    message?: string
  }) => {
    try {
      writeContract({
        address: contractAddress,
        abi,
        functionName: 'tipProject',
        args: [projectId, token, amount, celoEquivalent, message]
      })

      // Return success - the component will handle the transaction hash from the hook's data property
      return { success: true, hash: '', receipt: null };
    } catch (err) {
      logDebug('Tip Project Error', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error'
      }, 'error')
      throw err
    }
  }

  return {
    tipProject,
    isPending,
    isError,
    error,
    isSuccess,
    data
  }
}

// Hook for tipping with CELO (unchanged)
export function useTipProjectWithCelo(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess, data } = useWriteContract()

  const tipProjectWithCelo = async ({
    projectId,
    amount,
    message = '',
    userAddress
  }: {
    projectId: bigint
    amount: bigint
    message?: string
    userAddress: Address
  }) => {
    try {
      writeContract({
        account: userAddress,
        address: contractAddress,
        abi,
        functionName: 'tipProjectWithCelo',
        args: [projectId, message],
        value: amount
      })

      // Return success - the component will handle the transaction hash from the hook's data property
      return { success: true, hash: '', receipt: null };
    } catch (err) {
      logDebug('Tip Project with CELO Error', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error'
      }, 'error')
      throw err
    }
  }

  return {
    tipProjectWithCelo,
    isPending,
    isError,
    error,
    isSuccess,
    data
  }
}

// Hook for withdrawing tips by project owner
export function useWithdrawTips(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess, data } = useWriteContract()

  const withdrawTips = async ({
    projectId,
    token
  }: {
    projectId: bigint
    token: Address
  }) => {
    try {
      writeContract({
        address: contractAddress,
        abi,
        functionName: 'withdrawTips',
        args: [projectId, token]
      })

      // Return success - the component will handle the transaction hash from the hook's data property
      return { success: true, hash: '', receipt: null };
    } catch (err) {
      logDebug('Withdraw Tips Error', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error'
      }, 'error')
      throw err
    }
  }

  return {
    withdrawTips,
    isPending,
    isError,
    error,
    isSuccess,
    data
  }
}

// Hook for withdrawing all tips by project owner
export function useWithdrawAllTips(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess, data } = useWriteContract()

  const withdrawAllTips = async ({
    projectId
  }: {
    projectId: bigint
  }) => {
    try {
      writeContract({
        address: contractAddress,
        abi,
        functionName: 'withdrawAllTips',
        args: [projectId]
      })

      // Return success - the component will handle the transaction hash from the hook's data property
      return { success: true, hash: '', receipt: null };
    } catch (err) {
      logDebug('Withdraw All Tips Error', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error'
      }, 'error')
      throw err
    }
  }

  return {
    withdrawAllTips,
    isPending,
    isError,
    error,
    isSuccess,
    data
  }
}

// Hook for reading project tip summary
export function useProjectTipSummary(contractAddress: Address, projectId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getProjectTipSummary',
    args: [projectId],
    query: {
      enabled: !!contractAddress && projectId !== undefined
    }
  })

  const summary = data ? {
    projectId: (data as any[])[0] as bigint,
    projectOwner: (data as any[])[1] as Address,
    projectName: (data as any[])[2] as string,
    totalTipsInCelo: (data as any[])[3] as bigint,
    tipperCount: (data as any[])[4] as bigint,
    tippedTokens: (data as any[])[5] as Address[],
    tokenAmounts: (data as any[])[6] as bigint[],
    isActive: (data as any[])[7] as boolean
  } as ProjectTipSummary : null

  return {
    summary,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading user tip summary
export function useUserTipSummary(contractAddress: Address, userAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getUserTipSummary',
    args: [userAddress],
    query: {
      enabled: !!contractAddress && !!userAddress
    }
  })

  const summary = data ? {
    user: (data as any[])[0] as Address,
    totalTippedInCelo: (data as any[])[1] as bigint,
    projectCount: (data as any[])[2] as bigint,
    tippedProjectIds: (data as any[])[3] as bigint[],
    recentTips: (data as any[])[4] as TipInfo[]
  } as UserTipSummary : null

  return {
    summary,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading top tipped projects
export function useTopTippedProjects(contractAddress: Address, limit: number = 10) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getTopTippedProjects',
    args: [BigInt(limit)],
    query: {
      enabled: !!contractAddress && limit > 0
    }
  })

  const result = data ? {
    projectIds: (data as any[])[0] as bigint[],
    tipAmounts: (data as any[])[1] as bigint[]
  } : { projectIds: [], tipAmounts: [] }

  return {
    topProjects: result,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading recent tips
export function useRecentTips(contractAddress: Address, limit: number = 20) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getRecentTips',
    args: [BigInt(limit)],
    query: {
      enabled: !!contractAddress && limit > 0
    }
  })

  return {
    tips: data as TipInfo[] || [],
    isLoading,
    error,
    refetch
  }
}

// Hook for checking if user can tip (updated to include celoEquivalent)
export function useCanUserTipProject(
  contractAddress: Address,
  userAddress: Address,
  projectId: bigint,
  token: Address,
  amount: bigint,
  celoEquivalent: bigint
) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'canUserTipProject',
    args: [userAddress, projectId, token, amount, celoEquivalent],
    query: {
      enabled: !!contractAddress && !!userAddress && projectId !== undefined && !!token && amount > 0n && celoEquivalent > 0n
    }
  })

  const result = data ? {
    canTip: (data as any[])[0] as boolean,
    reason: (data as any[])[1] as string
  } : { canTip: false, reason: '' }

  return {
    canTip: result.canTip,
    reason: result.reason,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading minimum tip amount
export function useMinimumTipAmount(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'minimumTipAmount',
    query: {
      enabled: !!contractAddress
    }
  })

  return {
    minimumTipAmount: data as bigint || 0n,
    minimumTipAmountFormatted: data ? formatEther(data as bigint) : '0',
    isLoading,
    error,
    refetch
  }
}

// Hook for reading platform fee percentage
export function usePlatformFeePercentage(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'PLATFORM_FEE_PERCENTAGE',
    query: {
      enabled: !!contractAddress
    }
  })

  return {
    platformFeePercentage: data as bigint || 0n,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading contract stats
export function useContractStats(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getContractStats',
    query: {
      enabled: !!contractAddress
    }
  })

  const stats = data ? {
    totalTips: (data as any[])[0] as bigint,
    totalProjectsTipped: (data as any[])[1] as bigint,
    totalUniqueUsers: (data as any[])[2] as bigint,
    isEnabled: (data as any[])[3] as boolean,
    minTipAmount: (data as any[])[4] as bigint
  } : null

  return {
    stats,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading all tipped projects
export function useAllTippedProjects(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getAllTippedProjects',
    query: {
      enabled: !!contractAddress
    }
  })

  return {
    projectIds: data as bigint[] || [],
    isLoading,
    error,
    refetch
  }
}

// Hook for reading project with tip info
export function useProjectWithTipInfo(contractAddress: Address, projectId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getProjectWithTipInfo',
    args: [projectId],
    query: {
      enabled: !!contractAddress && projectId !== undefined
    }
  })

  const projectInfo = data ? {
    id: (data as any[])[0] as bigint,
    owner: (data as any[])[1] as Address,
    name: (data as any[])[2] as string,
    description: (data as any[])[3] as string,
    active: (data as any[])[4] as boolean,
    totalTipsInCelo: (data as any[])[5] as bigint,
    tipperCount: (data as any[])[6] as bigint,
    tippedTokens: (data as any[])[7] as Address[]
  } : null

  return {
    projectInfo,
    isLoading,
    error,
    refetch
  }
}

// Hook for ERC20 approval
export function useApproveToken() {
  const { writeContract, isPending, isError, error, isSuccess, data } = useWriteContract();

  const approveToken = async ({
    tokenAddress,
    spender,
    amount,
    account
  }: {
    tokenAddress: Address;
    spender: Address;
    amount: bigint;
    account: Address;
  }) => {
    try {
      writeContract({
        account,
        address: tokenAddress,
        abi: erc20ABI,
        functionName: 'approve',
        args: [spender, amount],
      });
      
      // Return success - the component will handle the transaction hash from the hook's data property
      return { success: true, hash: '', receipt: null };
    } catch (err) {
      throw err;
    }
  };

  return { approveToken, isPending, isError, error, isSuccess, data };
}

// Hook for reading project tipped tokens
export function useProjectTippedTokens(contractAddress: Address, projectId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getProjectTippedTokens',
    args: [projectId],
    query: {
      enabled: !!contractAddress && projectId !== undefined
    }
  })

  return {
    tippedTokens: data as Address[] || [],
    isLoading,
    error,
    refetch
  }
}

// Hook for reading project tipper count
export function useProjectTipperCount(contractAddress: Address, projectId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getProjectTipperCount',
    args: [projectId],
    query: {
      enabled: !!contractAddress && projectId !== undefined
    }
  })

  return {
    tipperCount: data as bigint || 0n,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading project tippers
export function useProjectTippers(contractAddress: Address, projectId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getProjectTippers',
    args: [projectId],
    query: {
      enabled: !!contractAddress && projectId !== undefined
    }
  })

  return {
    tippers: data as Address[] || [],
    isLoading,
    error,
    refetch
  }
}

// Hook for reading project tips by token
export function useProjectTipsByToken(contractAddress: Address, projectId: bigint, token: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getProjectTipsByToken',
    args: [projectId, token],
    query: {
      enabled: !!contractAddress && projectId !== undefined && !!token
    }
  })

  return {
    tipAmount: data as bigint || 0n,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading project total tips in CELO
export function useProjectTotalTipsInCelo(contractAddress: Address, projectId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getProjectTotalTipsInCelo',
    args: [projectId],
    query: {
      enabled: !!contractAddress && projectId !== undefined
    }
  })

  return {
    totalTipsInCelo: data as bigint || 0n,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading user recent tips
export function useUserRecentTips(contractAddress: Address, userAddress: Address, limit: number = 20) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getUserRecentTips',
    args: [userAddress, BigInt(limit)],
    query: {
      enabled: !!contractAddress && !!userAddress && limit > 0
    }
  })

  return {
    tips: data as TipInfo[] || [],
    isLoading,
    error,
    refetch
  }
}

// Hook for reading user tipped projects
export function useUserTippedProjects(contractAddress: Address, userAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getUserTippedProjects',
    args: [userAddress],
    query: {
      enabled: !!contractAddress && !!userAddress
    }
  })

  return {
    projectIds: data as bigint[] || [],
    isLoading,
    error,
    refetch
  }
}

// Hook for reading user tips to specific project
export function useUserTipsToProject(contractAddress: Address, userAddress: Address, projectId: bigint, token: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getUserTipsToProject',
    args: [userAddress, projectId, token],
    query: {
      enabled: !!contractAddress && !!userAddress && projectId !== undefined && !!token
    }
  })

  return {
    tipAmount: data as bigint || 0n,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading total tips count
export function useTotalTipsCount(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getTotalTipsCount',
    query: {
      enabled: !!contractAddress
    }
  })

  return {
    totalTipsCount: data as bigint || 0n,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading platform fee balance
export function usePlatformFeeBalance(contractAddress: Address, token: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getPlatformFeeBalance',
    args: [token],
    query: {
      enabled: !!contractAddress && !!token
    }
  })

  return {
    feeBalance: data as bigint || 0n,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading tipping status
export function useTippingStatus(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'tippingEnabled',
    query: {
      enabled: !!contractAddress
    }
  })

  return {
    isEnabled: data as boolean || false,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading CELO token address
export function useCeloTokenAddress(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'celoToken',
    query: {
      enabled: !!contractAddress
    }
  })

  return {
    celoTokenAddress: data as Address,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading sovereign seas contract address
export function useSovereignSeasAddress(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'sovereignSeas',
    query: {
      enabled: !!contractAddress
    }
  })

  return {
    sovereignSeasAddress: data as Address,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading collected fees
export function useCollectedFees(contractAddress: Address, token: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'collectedFees',
    args: [token],
    query: {
      enabled: !!contractAddress && !!token
    }
  })

  return {
    collectedFees: data as bigint || 0n,
    isLoading,
    error,
    refetch
  }
}

// Hook for checking if project has been tipped
export function useHasBeenTipped(contractAddress: Address, projectId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'hasBeenTipped',
    args: [projectId],
    query: {
      enabled: !!contractAddress && projectId !== undefined
    }
  })

  return {
    hasBeenTipped: data as boolean || false,
    isLoading,
    error,
    refetch
  }
}

// Hook for checking if user has tipped project
export function useHasUserTippedProject(contractAddress: Address, userAddress: Address, projectId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'hasUserTippedProject',
    args: [userAddress, projectId],
    query: {
      enabled: !!contractAddress && !!userAddress && projectId !== undefined
    }
  })

  return {
    hasTipped: data as boolean || false,
    isLoading,
    error,
    refetch
  }
}

// Hook for checking if user is project tipper
export function useIsProjectTipper(contractAddress: Address, projectId: bigint, userAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'isProjectTipper',
    args: [projectId, userAddress],
    query: {
      enabled: !!contractAddress && projectId !== undefined && !!userAddress
    }
  })

  return {
    isTipper: data as boolean || false,
    isLoading,
    error,
    refetch
  }
}

// Hook for checking if token has been tipped to project
export function useIsTokenTippedToProject(contractAddress: Address, projectId: bigint, token: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'isTokenTippedToProject',
    args: [projectId, token],
    query: {
      enabled: !!contractAddress && projectId !== undefined && !!token
    }
  })

  return {
    isTokenTipped: data as boolean || false,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading all tips
export function useAllTips(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getAllTips',
    query: {
      enabled: !!contractAddress
    }
  })

  return {
    allTips: data as TipInfo[] || [],
    isLoading,
    error,
    refetch
  }
}

// Hook for emergency withdrawal
export function useEmergencyWithdraw(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess, data } = useWriteContract()

  const emergencyWithdraw = async ({
    token,
    recipient,
    amount
  }: {
    token: Address
    recipient: Address
    amount: bigint
  }) => {
    try {
      writeContract({
        address: contractAddress,
        abi,
        functionName: 'emergencyWithdraw',
        args: [token, recipient, amount]
      })

      return { success: true, hash: '', receipt: null };
    } catch (err) {
      logDebug('Emergency Withdraw Error', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error'
      }, 'error')
      throw err
    }
  }

  return {
    emergencyWithdraw,
    isPending,
    isError,
    error,
    isSuccess,
    data
  }
}

// Hook for withdrawing platform fees
export function useWithdrawPlatformFees(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess, data } = useWriteContract()

  const withdrawPlatformFees = async ({
    token,
    recipient,
    amount
  }: {
    token: Address
    recipient: Address
    amount: bigint
  }) => {
    try {
      writeContract({
        address: contractAddress,
        abi,
        functionName: 'withdrawPlatformFees',
        args: [token, recipient, amount]
      })

      return { success: true, hash: '', receipt: null };
    } catch (err) {
      logDebug('Withdraw Platform Fees Error', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error'
      }, 'error')
      throw err
    }
  }

  return {
    withdrawPlatformFees,
    isPending,
    isError,
    error,
    isSuccess,
    data
  }
}

// Hook for toggling tipping status
export function useToggleTipping(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess, data } = useWriteContract()

  const toggleTipping = async () => {
    try {
      writeContract({
        address: contractAddress,
        abi,
        functionName: 'toggleTipping'
      })

      return { success: true, hash: '', receipt: null };
    } catch (err) {
      logDebug('Toggle Tipping Error', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error'
      }, 'error')
      throw err
    }
  }

  return {
    toggleTipping,
    isPending,
    isError,
    error,
    isSuccess,
    data
  }
}

// Hook for setting minimum tip amount
export function useSetMinimumTipAmount(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess, data } = useWriteContract()

  const setMinimumTipAmount = async ({
    newMinimum
  }: {
    newMinimum: bigint
  }) => {
    try {
      writeContract({
        address: contractAddress,
        abi,
        functionName: 'setMinimumTipAmount',
        args: [newMinimum]
      })

      return { success: true, hash: '', receipt: null };
    } catch (err) {
      logDebug('Set Minimum Tip Amount Error', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error'
      }, 'error')
      throw err
    }
  }

  return {
    setMinimumTipAmount,
    isPending,
    isError,
    error,
    isSuccess,
    data
  }
}

// Hook for reading owner address
export function useOwner(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'owner',
    query: {
      enabled: !!contractAddress
    }
  })

  return {
    owner: data as Address,
    isLoading,
    error,
    refetch
  }
}

// Hook for transferring ownership
export function useTransferOwnership(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess, data } = useWriteContract()

  const transferOwnership = async ({
    newOwner
  }: {
    newOwner: Address
  }) => {
    try {
      writeContract({
        address: contractAddress,
        abi,
        functionName: 'transferOwnership',
        args: [newOwner]
      })

      return { success: true, hash: '', receipt: null };
    } catch (err) {
      logDebug('Transfer Ownership Error', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error'
      }, 'error')
      throw err
    }
  }

  return {
    transferOwnership,
    isPending,
    isError,
    error,
    isSuccess,
    data
  }
}

// Hook for renouncing ownership
export function useRenounceOwnership(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess, data } = useWriteContract()

  const renounceOwnership = async () => {
    try {
      writeContract({
        address: contractAddress,
        abi,
        functionName: 'renounceOwnership'
      })

      return { success: true, hash: '', receipt: null };
    } catch (err) {
      logDebug('Renounce Ownership Error', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error'
      }, 'error')
      throw err
    }
  }

  return {
    renounceOwnership,
    isPending,
    isError,
    error,
    isSuccess,
    data
  }
}

// Main hook for project tipping
export function useProjectTipping(contractAddress: Address) {
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize the hook
  useEffect(() => {
    if (contractAddress) {
      setIsInitialized(true)
    }
  }, [contractAddress])

  // Get contract stats
  const { stats: contractStats, isLoading: statsLoading, error: statsError } = useContractStats(contractAddress)

  // Get all tipped projects
  const { projectIds: allTippedProjects, isLoading: projectsLoading, error: projectsError } = useAllTippedProjects(contractAddress)

  // Get minimum tip amount
  const { minimumTipAmount, isLoading: minTipLoading } = useMinimumTipAmount(contractAddress)

  // Get platform fee percentage
  const { platformFeePercentage, isLoading: feeLoading } = usePlatformFeePercentage(contractAddress)

  // Helper function to format time ago
  const getTimeAgo = useCallback((timestamp: bigint): string => {
    const now = Math.floor(Date.now() / 1000)
    const time = Number(timestamp)
    const diff = now - time

    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
    return new Date(time * 1000).toLocaleDateString()
  }, [])

  // Helper function to format tip amount
  const formatTipAmount = useCallback((amount: bigint): string => {
    try {
      return formatEther(amount)
    } catch (error) {
      return '0'
    }
  }, [])

  // Helper function to calculate platform fee
  const calculatePlatformFee = useCallback((amount: bigint): bigint => {
    if (!platformFeePercentage) return 0n
    return (amount * platformFeePercentage) / 100n
  }, [platformFeePercentage])

  // Helper function to get net tip amount (after platform fee)
  const getNetTipAmount = useCallback((amount: bigint): bigint => {
    const fee = calculatePlatformFee(amount)
    return amount - fee
  }, [calculatePlatformFee])

  // Enhanced tip formatting
  const enhanceTipInfo = useCallback((tip: TipInfo): EnhancedTipInfo => {
    return {
      ...tip,
      timeAgo: getTimeAgo(tip.timestamp),
      amountFormatted: formatTipAmount(tip.amount),
      celoEquivalentFormatted: formatTipAmount(tip.celoEquivalent)
    }
  }, [getTimeAgo, formatTipAmount])

  // Enhanced project summary formatting
  const enhanceProjectSummary = useCallback((summary: ProjectTipSummary): EnhancedProjectTipSummary => {
    return {
      ...summary,
      totalTipsFormatted: formatTipAmount(summary.totalTipsInCelo),
      tokenAmountsFormatted: summary.tokenAmounts.map(amount => formatTipAmount(amount))
    }
  }, [formatTipAmount])

  // Load dashboard data function
  const loadDashboardData = useCallback(async () => {
    if (!contractAddress) {
      throw new Error('Contract address not provided')
    }

    try {
      const dashboardData = {
        contractStats,
        allTippedProjects,
        minimumTipAmount,
        platformFeePercentage
      }

      logDebug('Dashboard Data Loaded', dashboardData)
      return dashboardData
    } catch (error) {
      logDebug('Error loading dashboard data', error, 'error')
      throw error
    }
  }, [contractAddress, contractStats, allTippedProjects, minimumTipAmount, platformFeePercentage])

  const isLoading = statsLoading || projectsLoading || minTipLoading || feeLoading
  const error = statsError || projectsError

  return {
    isInitialized,
    loadDashboardData,
    formatTipAmount,
    getTimeAgo,
    calculatePlatformFee,
    getNetTipAmount,
    enhanceTipInfo,
    enhanceProjectSummary,
    contractStats,
    allTippedProjects,
    minimumTipAmount,
    platformFeePercentage,
    isLoading,
    error
  }
}

// Utility functions
export function parseUnixTimestamp(timestamp: bigint): Date {
  return new Date(Number(timestamp) * 1000)
}

export function formatTipValue(amount: bigint, decimals: number = 18): string {
  try {
    return formatEther(amount)
  } catch {
    return '0'
  }
}

export function calculateTipAfterFees(amount: bigint, feePercentage: bigint): {
  netAmount: bigint
  feeAmount: bigint
} {
  const feeAmount = (amount * feePercentage) / 100n
  const netAmount = amount - feeAmount
  return { netAmount, feeAmount }
}

// Helper function to validate tip parameters
export function validateTipParams({
  projectId,
  token,
  amount,
  celoEquivalent,
  minimumTipAmount
}: {
  projectId: bigint
  token: Address
  amount: bigint
  celoEquivalent: bigint
  minimumTipAmount: bigint
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!projectId || projectId < 0n) {
    errors.push('Invalid project ID')
  }

  if (!token || token === '0x0000000000000000000000000000000000000000') {
    errors.push('Invalid token address')
  }

  if (!amount || amount <= 0n) {
    errors.push('Amount must be greater than 0')
  }

  if (!celoEquivalent || celoEquivalent <= 0n) {
    errors.push('CELO equivalent must be greater than 0')
  }

  if (celoEquivalent < minimumTipAmount) {
    errors.push('Tip amount below minimum required')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Enhanced utility functions
export function getTokenDisplayName(tokenAddress: Address): string {
  if (tokenAddress === '0x0000000000000000000000000000000000000000') return 'CELO';
  
  // Common token addresses on Celo
  const knownTokens: { [key: string]: string } = {
    '0x765DE816845861e75A25fCA122bb6898B8B1282a': 'cUSD',
    '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73': 'cEUR',
    '0xE919F65739c26a42616b7b8eedC6b5524d1e3aC4': 'cREAL'
  };
  
  return knownTokens[tokenAddress] || 'ERC20';
}

export function formatTokenAmount(amount: bigint, tokenAddress: Address, decimals: number = 18): string {
  try {
    if (tokenAddress === '0x0000000000000000000000000000000000000000') {
      return `${formatEther(amount)} CELO`;
    }
    return `${formatEther(amount)} ${getTokenDisplayName(tokenAddress)}`;
  } catch {
    return '0';
  }
}

export function calculateTipStatistics(tips: TipInfo[]): {
  totalTips: bigint;
  totalCELOEquivalent: bigint;
  uniqueTippers: number;
  uniqueProjects: number;
  uniqueTokens: number;
  averageTip: bigint;
  largestTip: bigint;
  smallestTip: bigint;
} {
  if (tips.length === 0) {
    return {
      totalTips: 0n,
      totalCELOEquivalent: 0n,
      uniqueTippers: 0,
      uniqueProjects: 0,
      uniqueTokens: 0,
      averageTip: 0n,
      largestTip: 0n,
      smallestTip: 0n
    };
  }

  const totalTips = tips.reduce((sum, tip) => sum + tip.amount, 0n);
  const totalCELOEquivalent = tips.reduce((sum, tip) => sum + tip.celoEquivalent, 0n);
  const uniqueTippers = new Set(tips.map(tip => tip.tipper)).size;
  const uniqueProjects = new Set(tips.map(tip => tip.projectId)).size;
  const uniqueTokens = new Set(tips.map(tip => tip.token)).size;
  const averageTip = totalTips / BigInt(tips.length);
  const largestTip = tips.reduce((max, tip) => tip.amount > max ? tip.amount : max, 0n);
  const smallestTip = tips.reduce((min, tip) => tip.amount < min ? tip.amount : min, largestTip);

  return {
    totalTips,
    totalCELOEquivalent,
    uniqueTippers,
    uniqueProjects,
    uniqueTokens,
    averageTip,
    largestTip,
    smallestTip
  };
}

export function groupTipsByProject(tips: TipInfo[]): Map<string, TipInfo[]> {
  const grouped = new Map<string, TipInfo[]>();
  
  tips.forEach(tip => {
    const projectId = tip.projectId.toString();
    if (!grouped.has(projectId)) {
      grouped.set(projectId, []);
    }
    grouped.get(projectId)!.push(tip);
  });
  
  return grouped;
}

export function groupTipsByToken(tips: TipInfo[]): Map<string, TipInfo[]> {
  const grouped = new Map<string, TipInfo[]>();
  
  tips.forEach(tip => {
    const token = tip.token;
    if (!grouped.has(token)) {
      grouped.set(token, []);
    }
    grouped.get(token)!.push(tip);
  });
  
  return grouped;
}

export function groupTipsByTipper(tips: TipInfo[]): Map<string, TipInfo[]> {
  const grouped = new Map<string, TipInfo[]>();
  
  tips.forEach(tip => {
    const tipper = tip.tipper;
    if (!grouped.has(tipper)) {
      grouped.set(tipper, []);
    }
    grouped.get(tipper)!.push(tip);
  });
  
  return grouped;
}

export function sortTipsByAmount(tips: TipInfo[], ascending: boolean = false): TipInfo[] {
  return [...tips].sort((a, b) => {
    if (ascending) {
      return Number(a.amount - b.amount);
    }
    return Number(b.amount - a.amount);
  });
}

export function sortTipsByTimestamp(tips: TipInfo[], ascending: boolean = false): TipInfo[] {
  return [...tips].sort((a, b) => {
    if (ascending) {
      return Number(a.timestamp - b.timestamp);
    }
    return Number(b.timestamp - a.timestamp);
  });
}

export function filterTipsByDateRange(tips: TipInfo[], startDate: Date, endDate: Date): TipInfo[] {
  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);
  
  return tips.filter(tip => {
    const tipTimestamp = Number(tip.timestamp);
    return tipTimestamp >= startTimestamp && tipTimestamp <= endTimestamp;
  });
}

export function filterTipsByAmount(tips: TipInfo[], minAmount: bigint, maxAmount: bigint): TipInfo[] {
  return tips.filter(tip => tip.amount >= minAmount && tip.amount <= maxAmount);
}

export function filterTipsByProject(tips: TipInfo[], projectId: bigint): TipInfo[] {
  return tips.filter(tip => tip.projectId === projectId);
}

export function filterTipsByToken(tips: TipInfo[], token: Address): TipInfo[] {
  return tips.filter(tip => tip.token === token);
}

export function filterTipsByTipper(tips: TipInfo[], tipper: Address): TipInfo[] {
  return tips.filter(tip => tip.tipper === tipper);
}

// Enhanced validation functions
export function validateTipAmount(amount: bigint, minimumAmount: bigint): { isValid: boolean; error?: string } {
  if (amount <= 0n) {
    return { isValid: false, error: 'Tip amount must be greater than 0' };
  }
  
  if (amount < minimumAmount) {
    return { isValid: false, error: `Tip amount must be at least ${formatEther(minimumAmount)} CELO` };
  }
  
  return { isValid: true };
}

export function validateProjectId(projectId: bigint): { isValid: boolean; error?: string } {
  if (projectId === undefined || projectId < 0n) {
    return { isValid: false, error: 'Invalid project ID' };
  }
  
  return { isValid: true };
}

export function validateTokenAddress(token: Address): { isValid: boolean; error?: string } {
  if (!token || token === '0x0000000000000000000000000000000000000000') {
    return { isValid: false, error: 'Invalid token address' };
  }
  
  return { isValid: true };
}

export function validateUserAddress(userAddress: Address): { isValid: boolean; error?: string } {
  if (!userAddress) {
    return { isValid: false, error: 'User address is required' };
  }
  
  if (userAddress === '0x0000000000000000000000000000000000000000') {
    return { isValid: false, error: 'Invalid user address' };
  }
  
  return { isValid: true };
}

// Enhanced error handling utility
export function handleContractError(error: any): { message: string; code?: string; details?: any } {
  if (typeof error === 'string') {
    return { message: error };
  }
  
  if (error?.message) {
    return { message: error.message, details: error };
  }
  
  if (error?.error?.message) {
    return { message: error.error.message, details: error.error };
  }
  
  if (error?.reason) {
    return { message: error.reason, details: error };
  }
  
  return { message: 'An unknown error occurred', details: error };
}

// Export all hooks for convenient importing
export default {
  useTipProject,
  useTipProjectWithCelo,
  useWithdrawTips,
  useWithdrawAllTips,
  useProjectTipSummary,
  useUserTipSummary,
  useTopTippedProjects,
  useRecentTips,
  useCanUserTipProject,
  useMinimumTipAmount,
  usePlatformFeePercentage,
  useContractStats,
  useAllTippedProjects,
  useProjectWithTipInfo,
  useProjectTipping,
  useApproveToken,
  useProjectTippedTokens,
  useProjectTipperCount,
  useProjectTippers,
  useProjectTipsByToken,
  useProjectTotalTipsInCelo,
  useUserRecentTips,
  useUserTippedProjects,
  useUserTipsToProject,
  useTotalTipsCount,
  usePlatformFeeBalance,
  useTippingStatus,
  useCeloTokenAddress,
  useSovereignSeasAddress,
  useCollectedFees,
  useHasBeenTipped,
  useHasUserTippedProject,
  useIsProjectTipper,
  useIsTokenTippedToProject,
  useAllTips,
  useEmergencyWithdraw,
  useWithdrawPlatformFees,
  useToggleTipping,
  useSetMinimumTipAmount,
  useOwner,
  useTransferOwnership,
  useRenounceOwnership,
  parseUnixTimestamp,
  formatTipValue,
  calculateTipAfterFees,
  validateTipParams,
  getTokenDisplayName,
  formatTokenAmount,
  calculateTipStatistics,
  groupTipsByProject,
  groupTipsByToken,
  groupTipsByTipper,
  sortTipsByAmount,
  sortTipsByTimestamp,
  filterTipsByDateRange,
  filterTipsByAmount,
  filterTipsByProject,
  filterTipsByToken,
  filterTipsByTipper,
  validateTipAmount,
  validateProjectId,
  validateTokenAddress,
  validateUserAddress,
  handleContractError
}