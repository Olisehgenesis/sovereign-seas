// useVotingMethods.tsx - FIXED VERSION
import { useWriteContract, useReadContract, useSendTransaction } from 'wagmi'
import { parseEther, formatEther, Address } from 'viem'
import { contractABI as abi } from '@/abi/seas4ABI'
import { useState, useEffect, useCallback } from 'react'
import { Interface } from "ethers";
import { erc20ABI } from "@/abi/erc20ABI"
import { AbiFunction } from 'viem'
import { getDataSuffix, submitReferral } from '@divvi/referral-sdk'
// Types for voting functionality
export interface Vote {
  voter: Address
  campaignId: bigint
  projectId: bigint
  token: Address
  amount: bigint
  celoEquivalent: bigint
}

export interface VoteAllocation {
  projectId: bigint
  token: Address
  amount: bigint
  percentage?: number
}

export interface VotingStats {
  totalVotes: bigint
  totalProjects: number
  userTotalVotes: bigint
  userMaxVoteAmount: bigint
  remainingVoteAmount: bigint
}

// Get token addresses from environment
// Divvi Integration 
const dataSuffix = getDataSuffix({
  consumer: '0x53eaF4CD171842d8144e45211308e5D90B4b0088',
  providers: ['0x5f0a55FaD9424ac99429f635dfb9bF20c3360Ab8', '0x6226ddE08402642964f9A6de844ea3116F0dFc7e'],
})

// Custom hook for token approval
export function useApproveToken() {
  const { writeContract, isPending, isError, error, isSuccess, reset } = useWriteContract()

  const approveToken = async (token: `0x${string}`, amount: bigint, contractAddress: Address) => {
    await writeContract({
      address: token,
      abi: erc20ABI,
      functionName: 'approve',
      args: [contractAddress as `0x${string}`, amount]
    })
  }

  return {
    approveToken,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook to verify CELO token address
export function useVerifyCeloToken(contractAddress: Address) {
  const { data: celoToken, isLoading, error } = useReadContract({
    address: contractAddress,
    abi: [{
      inputs: [],
      name: 'celoToken',
      outputs: [{ name: '', type: 'address' }],
      stateMutability: 'view',
      type: 'function'
    } satisfies AbiFunction],
    functionName: 'celoToken',
    query: {
      enabled: !!contractAddress
    }
  }) as { data: Address | undefined; isLoading: boolean; error: Error | null };

  const envCeloToken = import.meta.env.VITE_CELO_TOKEN;
  const isMatching = celoToken?.toLowerCase() === envCeloToken?.toLowerCase();

  console.log('🔍 CELO Token Verification:', {
    contractCeloToken: celoToken,
    envCeloToken,
    isMatching,
    error
  });

  return {
    celoToken,
    envCeloToken,
    isMatching,
    isLoading,
    error
  };
}

// Hook for voting functionality - FIXED to include voteWithCelo
export function useVote(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { approveToken } = useApproveToken()
  const [votingStats, setVotingStats] = useState<VotingStats | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const { celoToken, isMatching } = useVerifyCeloToken(contractAddress)
  const {
    sendTransactionAsync
  } = useSendTransaction()

  console.log('setVote, setVotingStats', setVotingStats)
  console.log('setIsCalculating', setIsCalculating)

  // FIXED version for ERC20 tokens
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
    console.log('🎯 Vote called with:', {
      campaignId: campaignId.toString(),
      projectId: projectId.toString(),
      token,
      amount: amount.toString(),
      isCeloToken: token.toLowerCase() === celoToken?.toLowerCase()
    });

    try {
      console.log('Voting with ERC20 token:', token, 'for amount:', amount);

      // For ERC20 tokens - approve first, then call vote function
      await approveToken(token, amount, contractAddress);
      // Wait for approval confirmation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Divvi referral integration section
      const voteInterface = new Interface(abi);

      const voteData = voteInterface.encodeFunctionData('vote', [campaignId, projectId,
        token, amount, bypassCode as `0x${string}`]);
      const celoChainId = 42220; // Celo mainnet chain ID

      const dataWithSuffix = voteData + dataSuffix;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: contractAddress,
        data: dataWithSuffix as `0x${string}`,
      });

      if (!tx) {
        throw new Error('Transaction failed to send');
      }
      /**
       * const tx = await writeContract({
       *   address: contractAddress,
       *   abi,
       *   functionName: 'vote', // ✅ Use the ERC20 vote function
       *   args: [campaignId, projectId, token, amount, bypassCode as `0x${string}`]
       * });
       */

      // Submit the referral to Divvi
      try {
        await submitReferral({
          txHash: tx as unknown as `0x${string}`,
          chainId: celoChainId
        });

      } catch (referralError) {
        console.error("Referral submission error:", referralError);
      }
      console.log('✅ Vote transaction submitted:', tx);
      return tx;
    } catch (err) {
      console.error('❌ Error in vote:', err)
      throw err
    }
  }

  // NEW: Separate function for CELO voting
  const voteWithCelo = async ({
    campaignId,
    projectId,
    amount,
    bypassCode = '0x0000000000000000000000000000000000000000000000000000000000000000'
  }: {
    campaignId: bigint
    projectId: bigint
    amount: bigint
    bypassCode?: string
  }) => {
    console.log('🎯 VoteWithCelo called with:', {
      campaignId: campaignId.toString(),
      projectId: projectId.toString(),
      amount: amount.toString(),
      celoToken
    });

    try {
      console.log('Voting with native CELO:', amount.toString());

      const tx = await writeContract({
        address: contractAddress,
        abi,
        functionName: 'voteWithCelo', // ✅ Use the CELO-specific function
        args: [campaignId, projectId, bypassCode as `0x${string}`],
        value: amount // Send CELO as msg.value
      });

      console.log('✅ VoteWithCelo transaction submitted:', tx);
      return tx;
    } catch (err) {
      console.error('❌ Error in voteWithCelo:', err)
      throw err
    }
  }

  const batchVote = async ({
    campaignId,
    votes,
    bypassCode = '0x0000000000000000000000000000000000000000000000000000000000000000'
  }: {
    campaignId: bigint
    votes: VoteAllocation[]
    bypassCode?: string
  }) => {
    try {
      // Execute votes sequentially to avoid nonce issues
      for (const voteAllocation of votes) {
        const isNativeCelo = voteAllocation.token.toLowerCase() === celoToken?.toLowerCase();

        if (isNativeCelo) {
          await voteWithCelo({
            campaignId,
            projectId: voteAllocation.projectId,
            amount: voteAllocation.amount,
            bypassCode
          })
        } else {
          await vote({
            campaignId,
            projectId: voteAllocation.projectId,
            token: voteAllocation.token,
            amount: voteAllocation.amount,
            bypassCode
          })
        }

        // Small delay between votes to ensure proper transaction ordering
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } catch (err) {
      console.error('Error batch voting:', err)
      throw err
    }
  }

  return {
    vote,
    voteWithCelo, // ✅ Export the new function
    batchVote,
    isPending,
    isError,
    error,
    isSuccess,
    reset,
    votingStats,
    isCalculating,
    celoToken,
    isMatching
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

  const voteHistory = data as Vote[] || []

  return {
    voteHistory,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading user votes for a specific project with a token
export function useUserVotesForProject(
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
    args: [campaignId, user, projectId, token],
    query: {
      enabled: !!contractAddress && campaignId !== undefined && !!user && projectId !== undefined && !!token
    }
  })

  return {
    userVotes: data as bigint || 0n,
    userVotesFormatted: data ? formatEther(data as bigint) : '0',
    isLoading,
    error,
    refetch
  }
}

// Hook for reading user's total votes in a campaign
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
    totalVotes: data as bigint || 0n,
    totalVotesFormatted: data ? formatEther(data as bigint) : '0',
    isLoading,
    error,
    refetch
  }
}

// Hook for getting token to CELO equivalent
export function useTokenToCeloEquivalent(
  contractAddress: Address,
  token: Address,
  amount: bigint
) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getTokenToCeloEquivalent',
    args: [token, amount],
    query: {
      enabled: !!contractAddress && !!token && amount !== undefined
    }
  })

  return {
    celoEquivalent: data as bigint || 0n,
    celoEquivalentFormatted: data ? formatEther(data as bigint) : '0',
    isLoading,
    error,
    refetch
  }
}

// Hook for getting project token votes
export function useProjectTokenVotes(
  contractAddress: Address,
  campaignId: bigint,
  projectId: bigint,
  token: Address
) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getProjectTokenVotes',
    args: [campaignId, projectId, token],
    query: {
      enabled: !!contractAddress && campaignId !== undefined && projectId !== undefined && !!token
    }
  })

  return {
    tokenVotes: data as bigint || 0n,
    tokenVotesFormatted: data ? formatEther(data as bigint) : '0',
    isLoading,
    error,
    refetch
  }
}

// Hook for getting project voted tokens with amounts
export function useProjectVotedTokensWithAmounts(
  contractAddress: Address,
  campaignId: bigint,
  projectId: bigint
) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getProjectVotedTokensWithAmounts',
    args: [campaignId, projectId],
    query: {
      enabled: !!contractAddress && campaignId !== undefined && projectId !== undefined
    }
  })

  type TokenData = [Address[], bigint[]]
  const tokenData = data ? {
    tokens: (data as TokenData)[0],
    amounts: (data as TokenData)[1]
  } : { tokens: [], amounts: [] }

  return {
    tokens: tokenData.tokens,
    amounts: tokenData.amounts,
    tokenData,
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
    args: [campaignId, token],
    query: {
      enabled: !!contractAddress && campaignId !== undefined && !!token
    }
  })

  return {
    tokenAmount: data as bigint || 0n,
    tokenAmountFormatted: data ? formatEther(data as bigint) : '0',
    isLoading,
    error,
    refetch
  }
}

// Hook for getting supported tokens
export function useSupportedTokens(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getSupportedTokens',
    query: {
      enabled: !!contractAddress
    }
  })

  return {
    supportedTokens: data as Address[] || [],
    isLoading,
    error,
    refetch
  }
}

// Hook for checking if token is supported
export function useIsTokenSupported(contractAddress: Address, token: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'isTokenSupported',
    args: [token],
    query: {
      enabled: !!contractAddress && !!token
    }
  })

  return {
    isSupported: data as boolean || false,
    isLoading,
    error,
    refetch
  }
}

// Comprehensive voting management hook
export function useVotingManager(contractAddress: Address, campaignId: bigint, user?: Address) {
  const [votingState, setVotingState] = useState({
    isInitialized: false,
    hasVoted: false,
    canVote: false,
    votingPower: 0n,
    allocations: [] as VoteAllocation[]
  })

  // Get user's voting history for this campaign
  const { voteHistory, isLoading: historyLoading } = useUserVoteHistory(
    contractAddress,
    user as Address
  )

  // Get user's total votes in this campaign
  const { totalVotes, isLoading: totalVotesLoading } = useUserTotalVotesInCampaign(
    contractAddress,
    campaignId,
    user as Address
  )

  // Get supported tokens
  const { supportedTokens, isLoading: tokensLoading } = useSupportedTokens(contractAddress)

  // Get campaign voted tokens
  const { votedTokens, isLoading: campaignTokensLoading } = useCampaignVotedTokens(
    contractAddress,
    campaignId
  )

  // Filter vote history for this campaign
  const campaignVoteHistory = voteHistory.filter(vote =>
    vote.campaignId === campaignId
  )

  // Calculate voting statistics
  const calculateVotingStats = useCallback(async () => {
    if (!user || !campaignId) return

    const hasVotedInCampaign = campaignVoteHistory.length > 0
    const totalUserVotes = totalVotes

    setVotingState(prev => ({
      ...prev,
      isInitialized: true,
      hasVoted: hasVotedInCampaign,
      canVote: true, // This would need campaign timing checks
      votingPower: totalUserVotes
    }))
  }, [user, campaignId, campaignVoteHistory.length, totalVotes])

  useEffect(() => {
    calculateVotingStats()
  }, [calculateVotingStats])

  // Helper function to format token amount
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

  // Helper function to parse token amount
  const parseTokenAmount = useCallback((amount: string): bigint => {
    try {
      return parseEther(amount)
    } catch (error) {
      console.error('Error parsing token amount:', error)
      return 0n
    }
  }, [])

  // Helper function to get vote allocation for a project
  const getProjectVoteAllocation = useCallback((projectId: bigint, token: Address): bigint => {
    const allocation = votingState.allocations.find(
      a => a.projectId === projectId && a.token === token
    )
    return allocation?.amount || 0n
  }, [votingState.allocations])

  // Helper function to set vote allocation for a project
  const setProjectVoteAllocation = useCallback((projectId: bigint, token: Address, amount: bigint) => {
    setVotingState(prev => ({
      ...prev,
      allocations: prev.allocations.filter(
        a => !(a.projectId === projectId && a.token === token)
      ).concat(amount > 0n ? [{ projectId, token, amount }] : [])
    }))
  }, [])

  // Helper function to clear all allocations
  const clearAllAllocations = useCallback(() => {
    setVotingState(prev => ({
      ...prev,
      allocations: []
    }))
  }, [])

  // Helper function to get total allocated amount for a token
  const getTotalAllocatedAmount = useCallback((token: Address): bigint => {
    return votingState.allocations
      .filter(a => a.token === token)
      .reduce((sum, a) => sum + a.amount, 0n)
  }, [votingState.allocations])

  const isLoading = historyLoading || totalVotesLoading || tokensLoading || campaignTokensLoading

  return {
    // State
    votingState,
    isLoading,

    // Data
    campaignVoteHistory,
    supportedTokens,
    votedTokens,
    totalVotes,

    // Helpers
    formatTokenAmount,
    parseTokenAmount,
    getProjectVoteAllocation,
    setProjectVoteAllocation,
    clearAllAllocations,
    getTotalAllocatedAmount,

    // Actions
    calculateVotingStats
  }
}

// Main export
export default {
  useVote,
  useUserVoteHistory,
  useUserVotesForProject,
  useUserTotalVotesInCampaign,
  useTokenToCeloEquivalent,
  useProjectTokenVotes,
  useProjectVotedTokensWithAmounts,
  useCampaignVotedTokens,
  useCampaignTokenAmount,
  useSupportedTokens,
  useIsTokenSupported,
  useVotingManager
}
