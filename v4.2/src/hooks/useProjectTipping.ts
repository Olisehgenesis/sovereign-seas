// hooks/useProjectTipping.ts

import { useWriteContract, useReadContract, useReadContracts } from 'wagmi'
import { formatEther, parseEther, Address, type Abi, Hash } from 'viem'
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
  parseUnixTimestamp,
  formatTipValue,
  calculateTipAfterFees,
  validateTipParams
}