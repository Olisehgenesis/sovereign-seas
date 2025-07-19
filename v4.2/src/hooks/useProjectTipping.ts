// hooks/useProjectTipping.ts

import { useWriteContract, useReadContract, useReadContracts } from 'wagmi'
import { formatEther, parseEther, Address, type Abi } from 'viem'
import { tipsABI as abi } from '@/abi/tipsABI' 
import { useState, useEffect, useCallback } from 'react'

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

export interface TokenTipSummary {
  token: Address
  totalAmount: bigint
  totalAmountInCelo: bigint
  tipCount: bigint
  uniqueProjectCount: bigint
  tippedProjectIds: bigint[]
}

export interface GlobalStats {
  totalTips: bigint
  totalProjectsTipped: bigint
  totalUniqueUsers: bigint
  totalTokensUsed: bigint
  totalValueInCelo: bigint
  totalPlatformFeesInCelo: bigint
  isEnabled: boolean
  minTipAmount: bigint
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


// Hook for tipping with ERC20 tokens
export function useTipProject(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess, data } = useWriteContract()

  const tipProject = async ({
    projectId,
    token,
    amount,
    message = ''
  }: {
    projectId: bigint
    token: Address
    amount: bigint
    message?: string
  }) => {
    try {
      const result = await writeContract({
        address: contractAddress,
        abi,
        functionName: 'tipProject',
        args: [projectId, token, amount, message]
      })

      logDebug('Tip Project Success', {
        transactionHash: result,
        projectId: projectId.toString(),
        token,
        amount: amount.toString(),
        message
      })

      return result
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

// Hook for tipping with CELO
export function useTipProjectWithCelo(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess, data } = useWriteContract()

  const tipProjectWithCelo = async ({
    projectId,
    amount,
    message = ''
  }: {
    projectId: bigint
    amount: bigint
    message?: string
  }) => {
    try {
      const result = await writeContract({
        address: contractAddress,
        abi,
        functionName: 'tipProjectWithCelo',
        args: [projectId, message],
        value: amount
      })

      logDebug('Tip Project with CELO Success', {
        transactionHash: result,
        projectId: projectId.toString(),
        amount: amount.toString(),
        message
      })

      return result
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
      const result = await writeContract({
        address: contractAddress,
        abi,
        functionName: 'withdrawTips',
        args: [projectId, token]
      })

      logDebug('Withdraw Tips Success', {
        transactionHash: result,
        projectId: projectId.toString(),
        token
      })

      return result
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
      const result = await writeContract({
        address: contractAddress,
        abi,
        functionName: 'withdrawAllTips',
        args: [projectId]
      })

      logDebug('Withdraw All Tips Success', {
        transactionHash: result,
        projectId: projectId.toString()
      })

      return result
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

// Hook for reading token tip summary
export function useTokenTipSummary(contractAddress: Address, token: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getTokenTipSummary',
    args: [token],
    query: {
      enabled: !!contractAddress && !!token
    }
  })

  const summary = data ? {
    token: (data as any[])[0] as Address,
    totalAmount: (data as any[])[1] as bigint,
    totalAmountInCelo: (data as any[])[2] as bigint,
    tipCount: (data as any[])[3] as bigint,
    uniqueProjectCount: (data as any[])[4] as bigint,
    tippedProjectIds: (data as any[])[5] as bigint[]
  } as TokenTipSummary : null

  return {
    summary,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading global stats
export function useGlobalStats(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getGlobalStats',
    query: {
      enabled: !!contractAddress
    }
  })

  const stats = data ? {
    totalTips: (data as any[])[0] as bigint,
    totalProjectsTipped: (data as any[])[1] as bigint,
    totalUniqueUsers: (data as any[])[2] as bigint,
    totalTokensUsed: (data as any[])[3] as bigint,
    totalValueInCelo: (data as any[])[4] as bigint,
    totalPlatformFeesInCelo: (data as any[])[5] as bigint,
    isEnabled: (data as any[])[6] as boolean,
    minTipAmount: (data as any[])[7] as bigint
  } as GlobalStats : null

  return {
    stats,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading all tipped tokens
export function useAllTippedTokens(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getAllTippedTokens',
    query: {
      enabled: !!contractAddress
    }
  })

  return {
    tokens: data as Address[] || [],
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

// Hook for reading top tokens by volume
export function useTopTokensByVolume(contractAddress: Address, limit: number = 10) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getTopTokensByVolume',
    args: [BigInt(limit)],
    query: {
      enabled: !!contractAddress && limit > 0
    }
  })

  const result = data ? {
    tokens: (data as any[])[0] as Address[],
    amounts: (data as any[])[1] as bigint[]
  } : { tokens: [], amounts: [] }

  return {
    topTokens: result,
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

// Hook for paginated tips
export function useTipsPaginated(
  contractAddress: Address, 
  offset: number = 0, 
  limit: number = 20
) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getTipsPaginated',
    args: [BigInt(offset), BigInt(limit)],
    query: {
      enabled: !!contractAddress && offset >= 0 && limit > 0
    }
  })

  const result = data ? {
    tips: (data as any[])[0] as TipInfo[],
    totalCount: (data as any[])[1] as bigint
  } : { tips: [], totalCount: 0n }

  return {
    paginatedTips: result,
    isLoading,
    error,
    refetch
  }
}

// Hook for checking if user can tip
export function useCanUserTipProject(
  contractAddress: Address,
  userAddress: Address,
  projectId: bigint,
  token: Address,
  amount: bigint
) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'canUserTipProject',
    args: [userAddress, projectId, token, amount],
    query: {
      enabled: !!contractAddress && !!userAddress && projectId !== undefined && !!token && amount > 0n
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

// Hook for reading tips by time range
export function useTipsByTimeRange(
  contractAddress: Address,
  startTime: bigint,
  endTime: bigint
) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getTipsByTimeRange',
    args: [startTime, endTime],
    query: {
      enabled: !!contractAddress && startTime !== undefined && endTime !== undefined && startTime <= endTime
    }
  })

  return {
    tips: data as TipInfo[] || [],
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

// Main hook for project tipping - following the same pattern as useCampaign
export function useProjectTipping(contractAddress: Address) {
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize the hook
  useEffect(() => {
    if (contractAddress) {
      setIsInitialized(true)
    }
  }, [contractAddress])

  // Get global stats
  const { stats: globalStats, isLoading: statsLoading, error: statsError } = useGlobalStats(contractAddress)

  // Get all tipped tokens
  const { tokens: allTippedTokens, isLoading: tokensLoading, error: tokensError } = useAllTippedTokens(contractAddress)

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
      console.error('Error formatting tip amount:', error)
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
      // This would typically aggregate data from multiple sources
      const dashboardData = {
        globalStats,
        allTippedTokens,
        minimumTipAmount,
        platformFeePercentage
      }

      logDebug('Dashboard Data Loaded', dashboardData)
      return dashboardData
    } catch (error) {
      logDebug('Error loading dashboard data', error, 'error')
      throw error
    }
  }, [contractAddress, globalStats, allTippedTokens, minimumTipAmount, platformFeePercentage])

  const isLoading = statsLoading || tokensLoading || minTipLoading || feeLoading
  const error = statsError || tokensError

  return {
    isInitialized,
    loadDashboardData,
    formatTipAmount,
    getTimeAgo,
    calculatePlatformFee,
    getNetTipAmount,
    enhanceTipInfo,
    enhanceProjectSummary,
    globalStats,
    allTippedTokens,
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

// Export all hooks for convenient importing
export default {
  useTipProject,
  useTipProjectWithCelo,
  useWithdrawTips,
  useWithdrawAllTips,
  useProjectTipSummary,
  useUserTipSummary,
  useTokenTipSummary,
  useGlobalStats,
  useAllTippedTokens,
  useTopTippedProjects,
  useTopTokensByVolume,
  useRecentTips,
  useTipsPaginated,
  useCanUserTipProject,
  useTipsByTimeRange,
  useMinimumTipAmount,
  usePlatformFeePercentage,
  useProjectTipping,
  parseUnixTimestamp,
  formatTipValue,
  calculateTipAfterFees
}