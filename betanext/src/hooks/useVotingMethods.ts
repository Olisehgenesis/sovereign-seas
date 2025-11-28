// useVotingMethods.tsx - FIXED VERSION
import { useWriteContract, useReadContract, useSendTransaction, useAccount, usePublicClient } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import type { Address } from 'viem'
import { contractABI as abi } from '@/abi/seas4ABI'
import { useState, useEffect, useCallback } from 'react'
import { Interface } from "ethers";
import { erc20ABI } from "@/abi/erc20ABI"

import { getReferralTag, submitReferral } from '@divvi/referral-sdk'
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

// Divvi Integration - will be generated dynamically with user address
const CONSUMER_ADDRESS = '0x53eaF4CD171842d8144e45211308e5D90B4b0088' as const

// Custom hook for token approval - FIXED to use sendTransactionAsync for proper wallet prompts
export function useApproveToken() {
  const { sendTransactionAsync, isPending, isError, error, isSuccess, reset, data } = useSendTransaction()
  const { address: user } = useAccount()

  const approveToken = async (token: `0x${string}`, amount: bigint, contractAddress: Address): Promise<string> => {
    if (!user) {
      throw new Error('User wallet not connected')
    }

    // Encode approval function data
    const approveInterface = new Interface(erc20ABI)
    const approveData = approveInterface.encodeFunctionData('approve', [
      contractAddress as `0x${string}`,
      amount
    ])

    // Send transaction - this will trigger wallet prompt
    const txHash = await sendTransactionAsync({
      to: token,
      data: approveData as `0x${string}`,
    })

    if (!txHash) {
      throw new Error('Approval transaction failed to send')
    }

    return txHash
  }

  return {
    approveToken,
    isPending,
    isError,
    error,
    isSuccess,
    reset,
    data // Transaction hash
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
    }],
    functionName: 'celoToken',
    query: {
      enabled: !!contractAddress
    }
  }) as { data: Address | undefined; isLoading: boolean; error: Error | null };

  const envCeloToken = process.env.NEXT_PUBLIC_CELO_TOKEN;
  const isMatching = celoToken?.toLowerCase() === envCeloToken?.toLowerCase();



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
  const { address: user } = useAccount()
  const {  isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { approveToken } = useApproveToken()
  const { celoToken, isMatching } = useVerifyCeloToken(contractAddress)
  const publicClient = usePublicClient()

  const {
    sendTransactionAsync
  } = useSendTransaction()

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
    if (!campaignId || !projectId || !token || !amount) {
      throw new Error('Missing required parameters for voting');
    }

    if (!user) {
      throw new Error('User wallet not connected');
    }

    try {
      // For ERC20 tokens - check allowance first
      if (publicClient) {
        const currentAllowance = await publicClient.readContract({
          address: token,
          abi: erc20ABI,
          functionName: 'allowance',
          args: [user as Address, contractAddress]
        }) as bigint;

        // If allowance is insufficient, approve
        if (currentAllowance < amount) {
          await approveToken(token, amount, contractAddress);
          // Note: The approval transaction hash is returned, but we proceed with vote
          // The vote transaction will fail if approval isn't confirmed yet
          // In a production app, you might want to wait for approval confirmation here
        }
      } else {
        // Fallback: always approve if we can't check allowance
        await approveToken(token, amount, contractAddress);
      }

      // Divvi referral integration section
      const voteInterface = new Interface(abi);

      const voteData = voteInterface.encodeFunctionData('vote', [campaignId, projectId,
        token, amount, bypassCode as `0x${string}`]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = voteData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: contractAddress,
        data: dataWithSuffix as `0x${string}`,
      });

      if (!tx) {
        throw new Error('Transaction failed to send');
      }

      // Submit the referral to Divvi
      try {
        await submitReferral({
          txHash: tx as unknown as `0x${string}`,
          chainId: celoChainId
        });
      } catch (referralError) {
        console.error("Referral submission error:", referralError);
      }
      return tx;
    } catch (err) {
      console.error('❌ Error in vote:', err)
      throw err
    }
  }

  // NEW: Updated voteWithCelo function with Divvi integration
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
  if (!campaignId || !projectId || !amount) {
    throw new Error('Missing required parameters for CELO voting');
  }

  try {

    // Divvi referral integration section
    const voteInterface = new Interface(abi);

    const voteWithCeloData = voteInterface.encodeFunctionData('voteWithCelo', [
      campaignId, 
      projectId, 
      bypassCode as `0x${string}`
    ]);
    const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
    const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

    // Generate referral tag with user address
    const referralTag = getReferralTag({
      user: user as Address, // The user address making the transaction (required)
      consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
    })

    const dataWithSuffix = voteWithCeloData + referralTag;

    // Using sendTransactionAsync to support referral integration
    const tx = await sendTransactionAsync({
      to: contractAddress,
      data: dataWithSuffix as `0x${string}`,
      value: amount // Send CELO as msg.value
    });

    if (!tx) {
      throw new Error('Transaction failed to send');
    }

    // Submit the referral to Divvi
    try {
      await submitReferral({
        txHash: tx as unknown as `0x${string}`,
        chainId: celoChainId
      });
    } catch (referralError) {
      console.error("Referral submission error:", referralError);
    }

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
    voteWithCelo,
    batchVote,
    isPending,
    isError,
    error,
    isSuccess,
    reset,
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
