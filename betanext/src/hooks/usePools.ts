import { useReadContract, useReadContracts, useWriteContract, useSendTransaction, useAccount } from 'wagmi'
import type { Address } from 'viem'
import { poolsABI } from '../abi/poolsABI'
import { getReferralTag, submitReferral } from '@divvi/referral-sdk'
import { Interface } from "ethers"
import { useChainSwitch } from './useChainSwitch'

// Divvi Integration - will be generated dynamically with user address
const CONSUMER_ADDRESS = '0x53eaF4CD171842d8144e45211308e5D90B4b0088' as const 

// ==================== TYPES ====================

export const PoolType = {
  UNIVERSAL: 0,
  ERC20_SPECIFIC: 1
} as const

export type PoolType = typeof PoolType[keyof typeof PoolType]

export interface Pool {
  id: bigint
  campaignId: bigint
  admin: Address
  poolType: PoolType
  isActive: boolean
  isPaused: boolean
  createdAt: bigint
  metadata: string
  distributionNonce: bigint
  totalDistributedAmount: bigint
}

export interface PoolInfo {
  id: bigint
  campaignId: bigint
  admin: Address
  poolType: PoolType
  isActive: boolean
  isPaused: boolean
  createdAt: bigint
  metadata: string
}

export interface PoolBalance {
  tokens: Address[]
  balances: bigint[]
}

export interface PoolStats {
  totalValue: bigint
  contributorCount: bigint
  distributedAmount: bigint
  distributionCount: bigint
}

export interface PoolFees {
  contractAdminFee: bigint
  campaignAdminFee: bigint
}

export interface Donation {
  donor: Address
  token: Address
  amount: bigint
  timestamp: bigint
  message: string
}

export interface ClaimRecord {
  recipient: Address
  token: Address
  amount: bigint
  claimTime: bigint
  distributionHash: string
  claimed: boolean
}

export interface ContributorDetails {
  totalContributed: bigint
  contributionCount: bigint
  firstContributionTime: bigint
  tokens: Address[]
  amounts: bigint[]
}

export interface RescueRecord {
  token: Address
  amount: bigint
  recipient: Address
  admin: Address
  timestamp: bigint
  reason: string
}

export interface ScheduledRescue {
  poolId: bigint
  token: Address
  amount: bigint
  recipient: Address
  initiator: Address
  scheduledTime: bigint
  executed: boolean
  cancelled: boolean
}

// ==================== CONTRACT ADDRESS ====================

const POOLS_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_POOLS_CONTRACT_ADDRESS as Address

// Log contract address for debugging
console.log('Pools Contract Address:', POOLS_CONTRACT_ADDRESS)
console.log('Environment Variable:', process.env.NEXT_PUBLIC_POOLS_CONTRACT_ADDRESS)

// ==================== READ HOOKS ====================

// Hook for reading pool information
export function usePoolInfo(poolId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: POOLS_CONTRACT_ADDRESS,
    abi: poolsABI,
    functionName: 'getPoolInfo',
    args: [poolId],
    query: {
      enabled: !!poolId && !!POOLS_CONTRACT_ADDRESS
    }
  })

  return {
    poolInfo: data as PoolInfo | undefined,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading pool balance
export function usePoolBalance(poolId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: POOLS_CONTRACT_ADDRESS,
    abi: poolsABI,
    functionName: 'getPoolBalance',
    args: [poolId],
    query: {
      enabled: !!poolId && !!POOLS_CONTRACT_ADDRESS
    }
  })

  return {
    balance: data as PoolBalance | undefined,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading pool stats
export function usePoolStats(poolId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: POOLS_CONTRACT_ADDRESS,
    abi: poolsABI,
    functionName: 'getPoolStats',
    args: [poolId],
    query: {
      enabled: !!poolId && !!POOLS_CONTRACT_ADDRESS
    }
  })

  return {
    stats: data as PoolStats | undefined,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading pool fees (basis points)
export function usePoolFees(poolId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: POOLS_CONTRACT_ADDRESS,
    abi: poolsABI,
    functionName: 'getPoolFees',
    args: [poolId],
    query: {
      enabled: !!poolId && !!POOLS_CONTRACT_ADDRESS
    }
  })

  return {
    fees: data as PoolFees | undefined,
    isLoading,
    error,
    refetch
  }
}

// Read accumulated contract admin fees for a token
export function useContractAdminFees(token: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: POOLS_CONTRACT_ADDRESS,
    abi: poolsABI,
    functionName: 'getContractAdminFees',
    args: [token],
    query: {
      enabled: !!token && !!POOLS_CONTRACT_ADDRESS
    }
  })

  return {
    amount: data as bigint | undefined,
    isLoading,
    error,
    refetch
  }
}

// Set pool-level contract admin fee (basis points)
export function useSetPoolContractAdminFee() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const setFee = async (poolId: bigint, newFeeBps: bigint) => {
    if (!poolId || poolId === 0n) throw new Error('poolId required')
    if (newFeeBps < 0n || newFeeBps > 10000n) throw new Error('fee must be 0..10000')

    await ensureCorrectChain()
    const poolInterface = new Interface(poolsABI)
    const calldata = poolInterface.encodeFunctionData('setPoolContractAdminFee', [poolId, newFeeBps])

    const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet'
    const celoChainId = isTestnet ? 44787 : 42220

    const referralTag = getReferralTag({ user: user as Address, consumer: CONSUMER_ADDRESS })
    const dataWithSuffix = calldata + referralTag

    const tx = await sendTransactionAsync({ to: POOLS_CONTRACT_ADDRESS, data: dataWithSuffix as `0x${string}` })
    if (!tx) throw new Error('Transaction failed to send')
    try { await submitReferral({ txHash: tx as unknown as `0x${string}`, chainId: celoChainId }) } catch {}
    return tx
  }

  return { setFee, isPending, isError, error, isSuccess, reset }
}

// Set campaign admin fee (basis points)
export function useSetCampaignAdminFee() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const setFee = async (poolId: bigint, newFeeBps: bigint) => {
    if (!poolId || poolId === 0n) throw new Error('poolId required')
    if (newFeeBps < 0n || newFeeBps > 10000n) throw new Error('fee must be 0..10000')

    await ensureCorrectChain()
    const poolInterface = new Interface(poolsABI)
    const calldata = poolInterface.encodeFunctionData('setCampaignAdminFee', [poolId, newFeeBps])

    const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet'
    const celoChainId = isTestnet ? 44787 : 42220

    const referralTag = getReferralTag({ user: user as Address, consumer: CONSUMER_ADDRESS })
    const dataWithSuffix = calldata + referralTag

    const tx = await sendTransactionAsync({ to: POOLS_CONTRACT_ADDRESS, data: dataWithSuffix as `0x${string}` })
    if (!tx) throw new Error('Transaction failed to send')
    try { await submitReferral({ txHash: tx as unknown as `0x${string}`, chainId: celoChainId }) } catch {}
    return tx
  }

  return { setFee, isPending, isError, error, isSuccess, reset }
}

// Claim accumulated contract admin fees for a token (super admin)
export function useClaimContractAdminFees() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const claim = async (token: Address) => {
    if (!token) throw new Error('token required')
    await ensureCorrectChain()
    const poolInterface = new Interface(poolsABI)
    const calldata = poolInterface.encodeFunctionData('claimContractAdminFees', [token])

    const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet'
    const celoChainId = isTestnet ? 44787 : 42220

    const referralTag = getReferralTag({ user: user as Address, consumer: CONSUMER_ADDRESS })
    const dataWithSuffix = calldata + referralTag

    const tx = await sendTransactionAsync({ to: POOLS_CONTRACT_ADDRESS, data: dataWithSuffix as `0x${string}` })
    if (!tx) throw new Error('Transaction failed to send')
    try { await submitReferral({ txHash: tx as unknown as `0x${string}`, chainId: celoChainId }) } catch {}
    return tx
  }

  return { claim, isPending, isError, error, isSuccess, reset }
}

// Hook for reading pool contributors
export function usePoolContributors(poolId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: POOLS_CONTRACT_ADDRESS,
    abi: poolsABI,
    functionName: 'getPoolContributors',
    args: [poolId],
    query: {
      enabled: !!poolId && !!POOLS_CONTRACT_ADDRESS
    }
  })

  return {
    contributors: data as Address[] | undefined,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading contributor details
export function useContributorDetails(poolId: bigint, contributor: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: POOLS_CONTRACT_ADDRESS,
    abi: poolsABI,
    functionName: 'getContributorDetails',
    args: [poolId, contributor],
    query: {
      enabled: !!poolId && !!contributor && !!POOLS_CONTRACT_ADDRESS
    }
  })

  return {
    details: data as ContributorDetails | undefined,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading pool donations
export function usePoolDonations(poolId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: POOLS_CONTRACT_ADDRESS,
    abi: poolsABI,
    functionName: 'getPoolDonations',
    args: [poolId],
    query: {
      enabled: !!poolId && !!POOLS_CONTRACT_ADDRESS
    }
  })

  return {
    donations: data as Donation[] | undefined,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading user claim history
export function useUserClaimHistory(poolId: bigint, user: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: POOLS_CONTRACT_ADDRESS,
    abi: poolsABI,
    functionName: 'getUserClaimHistory',
    args: [poolId, user],
    query: {
      enabled: !!poolId && !!user && !!POOLS_CONTRACT_ADDRESS
    }
  })

  return {
    claimHistory: data as ClaimRecord[] | undefined,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading user received amount
export function useUserReceivedAmount(poolId: bigint, user: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: POOLS_CONTRACT_ADDRESS,
    abi: poolsABI,
    functionName: 'getUserReceivedAmount',
    args: [poolId, user],
    query: {
      enabled: !!poolId && !!user && !!POOLS_CONTRACT_ADDRESS
    }
  })

  return {
    receivedAmount: data as bigint | undefined,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading pool recipients
export function usePoolRecipients(poolId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: POOLS_CONTRACT_ADDRESS,
    abi: poolsABI,
    functionName: 'getRecipients',
    args: [poolId],
    query: {
      enabled: !!poolId && !!POOLS_CONTRACT_ADDRESS
    }
  })

  return {
    recipients: data as Address[] | undefined,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading allowed tokens
export function useAllowedTokens(poolId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: POOLS_CONTRACT_ADDRESS,
    abi: poolsABI,
    functionName: 'getAllowedTokens',
    args: [poolId],
    query: {
      enabled: !!poolId && !!POOLS_CONTRACT_ADDRESS
    }
  })

  return {
    allowedTokens: data as Address[] | undefined,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading rescue history
export function useRescueHistory(poolId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: POOLS_CONTRACT_ADDRESS,
    abi: poolsABI,
    functionName: 'getRescueHistory',
    args: [poolId],
    query: {
      enabled: !!poolId && !!POOLS_CONTRACT_ADDRESS
    }
  })

  return {
    rescueHistory: data as RescueRecord[] | undefined,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading scheduled rescue
export function useScheduledRescue(scheduleId: string) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: POOLS_CONTRACT_ADDRESS,
    abi: poolsABI,
    functionName: 'getScheduledRescue',
    args: [scheduleId as `0x${string}`],
    query: {
      enabled: !!scheduleId && !!POOLS_CONTRACT_ADDRESS
    }
  })

  return {
    scheduledRescue: data as ScheduledRescue | undefined,
    isLoading,
    error,
    refetch
  }
}

// Hook for checking if user can claim from distribution
export function useCanUserClaimFromDistribution(poolId: bigint, user: Address, distributionHash: string) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: POOLS_CONTRACT_ADDRESS,
    abi: poolsABI,
    functionName: 'canUserClaimFromDistribution',
    args: [poolId, user, distributionHash as `0x${string}`],
    query: {
      enabled: !!poolId && !!user && !!distributionHash && !!POOLS_CONTRACT_ADDRESS
    }
  })

  return {
    canClaim: data as boolean | undefined,
    isLoading,
    error,
    refetch
  }
}

// Hook for checking if token is allowed in pool
export function useIsTokenAllowedInPool(poolId: bigint, token: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: POOLS_CONTRACT_ADDRESS,
    abi: poolsABI,
    functionName: 'isTokenAllowedInPool',
    args: [poolId, token],
    query: {
      enabled: !!poolId && !!token && !!POOLS_CONTRACT_ADDRESS
    }
  })

  return {
    isAllowed: data as boolean | undefined,
    isLoading,
    error,
    refetch
  }
}

// Hook for checking if token is frozen in pool
export function useIsTokenFrozenInPool(poolId: bigint, token: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: POOLS_CONTRACT_ADDRESS,
    abi: poolsABI,
    functionName: 'isTokenFrozenInPool',
    args: [poolId, token],
    query: {
      enabled: !!poolId && !!token && !!POOLS_CONTRACT_ADDRESS
    }
  })

  return {
    isFrozen: data as boolean | undefined,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading contract settings
export function usePoolsContractSettings() {
  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: [
      {
        address: POOLS_CONTRACT_ADDRESS,
        abi: poolsABI,
        functionName: 'nextPoolId'
      },
      {
        address: POOLS_CONTRACT_ADDRESS,
        abi: poolsABI,
        functionName: 'rescueDelay'
      },
      {
        address: POOLS_CONTRACT_ADDRESS,
        abi: poolsABI,
        functionName: 'largeRescueThreshold'
      },
      {
        address: POOLS_CONTRACT_ADDRESS,
        abi: poolsABI,
        functionName: 'paused'
      }
    ],
    query: {
      enabled: !!POOLS_CONTRACT_ADDRESS
    }
  })

  const [nextPoolId, rescueDelay, largeRescueThreshold, paused] = data || []

  return {
    settings: data ? {
      nextPoolId: nextPoolId?.result,
      rescueDelay: rescueDelay?.result,
      largeRescueThreshold: largeRescueThreshold?.result,
      paused: paused?.result
    } : null,
    isLoading,
    error,
    refetch
  }
}

// Hook for campaign-to-pool mapping
export function useCampaignToPool(campaignId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: POOLS_CONTRACT_ADDRESS,
    abi: poolsABI,
    functionName: 'campaignToPool',
    args: [campaignId],
    query: {
      enabled: !!campaignId && !!POOLS_CONTRACT_ADDRESS
    }
  })

  return {
    poolId: data as bigint | undefined,
    isLoading,
    error,
    refetch
  }
}

// Hook for super admin status check
export function useIsSuperAdmin(address: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: POOLS_CONTRACT_ADDRESS,
    abi: poolsABI,
    functionName: 'superAdmins',
    args: [address],
    query: {
      enabled: !!address && !!POOLS_CONTRACT_ADDRESS
    }
  })

  return {
    isSuperAdmin: data as boolean | undefined,
    isLoading,
    error,
    refetch
  }
}

// Hook for blacklist status check
export function useIsBlacklisted(address: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: POOLS_CONTRACT_ADDRESS,
    abi: poolsABI,
    functionName: 'blacklistedAddresses',
    args: [address],
    query: {
      enabled: !!address && !!POOLS_CONTRACT_ADDRESS
    }
  })

  return {
    isBlacklisted: data as boolean | undefined,
    isLoading,
    error,
    refetch
  }
}

// Hook for contract owner
export function usePoolsOwner() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: POOLS_CONTRACT_ADDRESS,
    abi: poolsABI,
    functionName: 'owner',
    query: {
      enabled: !!POOLS_CONTRACT_ADDRESS
    }
  })

  return {
    owner: data as Address | undefined,
    isLoading,
    error,
    refetch
  }
}

// Hook for campaign validation
export function useCampaignExists(campaignId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: POOLS_CONTRACT_ADDRESS,
    abi: poolsABI,
    functionName: 'campaignExists',
    args: [campaignId],
    query: {
      enabled: !!campaignId && !!POOLS_CONTRACT_ADDRESS
    }
  })

  return {
    exists: data as boolean | undefined,
    isLoading,
    error,
    refetch
  }
}

// Hook for permission checking
export function useHasCreatePermission(campaignId: bigint, user: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: POOLS_CONTRACT_ADDRESS,
    abi: poolsABI,
    functionName: 'hasCreatePermission',
    args: [campaignId, user],
    query: {
      enabled: !!campaignId && !!user && !!POOLS_CONTRACT_ADDRESS
    }
  })

  return {
    hasPermission: data as boolean | undefined,
    isLoading,
    error,
    refetch
  }
}

// ==================== WRITE HOOKS ====================

// Hook for creating universal pool
export function useCreatePoolUniversal() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const createPool = async (campaignId: bigint, metadata: string) => {
    if (!campaignId || !metadata) {
      throw new Error('Missing required parameters for creating pool');
    }

    if (!POOLS_CONTRACT_ADDRESS) {
      throw new Error('Pools contract address is not configured. Please set VITE_POOLS_CONTRACT_ADDRESS environment variable.');
    }

    console.log('Creating pool with:', { campaignId, metadata, contractAddress: POOLS_CONTRACT_ADDRESS, metadataType: typeof metadata });

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const createPoolData = poolInterface.encodeFunctionData('createPoolUniversal', [campaignId, metadata]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = createPoolData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in createPoolUniversal:', err)
      throw err
    }
  }

  return {
    createPool,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for creating ERC20 specific pool
export function useCreatePoolERC20() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const createPool = async (campaignId: bigint, allowedTokens: Address[], metadata: string) => {
    if (!campaignId || !allowedTokens || !metadata) {
      throw new Error('Missing required parameters for creating ERC20 pool');
    }

    if (!POOLS_CONTRACT_ADDRESS) {
      throw new Error('Pools contract address is not configured. Please set VITE_POOLS_CONTRACT_ADDRESS environment variable.');
    }

    console.log('Creating ERC20 pool with:', { campaignId, allowedTokens, metadata, contractAddress: POOLS_CONTRACT_ADDRESS });

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const createPoolData = poolInterface.encodeFunctionData('createPoolERC20', [campaignId, allowedTokens, metadata]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = createPoolData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in createPoolERC20:', err)
      throw err
    }
  }

  return {
    createPool,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for creating appreciation pool universal
export function useCreateAppreciationPoolUniversal() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const createPool = async (campaignId: bigint, metadata: string) => {
    if (!campaignId || !metadata) {
      throw new Error('Missing required parameters for creating appreciation pool');
    }

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const createPoolData = poolInterface.encodeFunctionData('createAppreciationPoolUniversal', [campaignId, metadata]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = createPoolData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in createAppreciationPoolUniversal:', err)
      throw err
    }
  }

  return {
    createPool,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for creating appreciation pool ERC20
export function useCreateAppreciationPoolERC20() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const createPool = async (campaignId: bigint, allowedTokens: Address[], metadata: string) => {
    if (!campaignId || !allowedTokens || !metadata) {
      throw new Error('Missing required parameters for creating appreciation ERC20 pool');
    }

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const createPoolData = poolInterface.encodeFunctionData('createAppreciationPoolERC20', [campaignId, allowedTokens, metadata]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = createPoolData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in createAppreciationPoolERC20:', err)
      throw err
    }
  }

  return {
    createPool,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for funding pool
export function useFundPool() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const fundPool = async (poolId: bigint, token: Address, amount: bigint, value?: bigint) => {
    if (!poolId || poolId === 0n || !token || !amount) {
      throw new Error('Missing required parameters for funding pool');
    }

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const fundPoolData = poolInterface.encodeFunctionData('fundPool', [poolId, token, amount]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = fundPoolData + referralTag;

      // If ERC20 token (not CELO), first send approve to token contract
      let approveTxHash: `0x${string}` | undefined;
      if (token.toLowerCase() !== '0x0000000000000000000000000000000000000000') {
        const erc20ApproveAbi = [
          {
            name: 'approve',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'spender', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            outputs: [{ name: '', type: 'bool' }]
          }
        ] as const;
        const erc20Interface = new Interface(erc20ApproveAbi as any);
        const approveCalldata = erc20Interface.encodeFunctionData('approve', [POOLS_CONTRACT_ADDRESS, amount]);
        const approveDataWithSuffix = approveCalldata + referralTag;

        const approveTx = await sendTransactionAsync({
          to: token,
          data: approveDataWithSuffix as `0x${string}`,
        });
        if (!approveTx) {
          throw new Error('Approval transaction failed to send');
        }
        approveTxHash = approveTx as unknown as `0x${string}`;
        try {
          await submitReferral({
            txHash: approveTxHash,
            chainId: celoChainId
          });
        } catch (referralError) {
          console.error('Referral submission error (approve):', referralError);
        }
      }

      // Using sendTransactionAsync to support referral integration
    //log the value 
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
        data: dataWithSuffix as `0x${string}`,
        value: value || 0n
      });
      console.log('value', value);

      if (!tx) {
        throw new Error('Transaction failed to send');
      }

      // Submit the referral to Divvi
      let fundTxHash: `0x${string}` | undefined;
      try {
        fundTxHash = tx as unknown as `0x${string}`;
        await submitReferral({
          txHash: fundTxHash,
          chainId: celoChainId
        });
      } catch (referralError) {
        console.error("Referral submission error:", referralError);
      }
      return { approveTxHash, fundTxHash };
    } catch (err) {
      console.error('❌ Error in fundPool:', err)
      throw err
    }
  }

  return {
    fundPool,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for donating to pool
export function useDonateToPool() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const donate = async (poolId: bigint, token: Address, amount: bigint, message: string, value?: bigint) => {
    if (!poolId || poolId === 0n || !token || !amount || !message) {
      throw new Error('Missing required parameters for donating to pool');
    }

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const donateData = poolInterface.encodeFunctionData('donateToPool', [poolId, token, amount, message]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = donateData + referralTag;

      // If ERC20 token (not CELO), first send approve to token contract
      let approveTxHash: `0x${string}` | undefined;
      if (token.toLowerCase() !== '0x0000000000000000000000000000000000000000') {
        const erc20ApproveAbi = [
          {
            name: 'approve',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'spender', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            outputs: [{ name: '', type: 'bool' }]
          }
        ] as const;
        const erc20Interface = new Interface(erc20ApproveAbi as any);
        const approveCalldata = erc20Interface.encodeFunctionData('approve', [POOLS_CONTRACT_ADDRESS, amount]);
        const approveDataWithSuffix = approveCalldata + referralTag;

        const approveTx = await sendTransactionAsync({
          to: token,
          data: approveDataWithSuffix as `0x${string}`,
        });
        if (!approveTx) {
          throw new Error('Approval transaction failed to send');
        }
        approveTxHash = approveTx as unknown as `0x${string}`;
        try {
          await submitReferral({
            txHash: approveTxHash,
            chainId: celoChainId
          });
        } catch (referralError) {
          console.error('Referral submission error (approve):', referralError);
        }
      }

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
        data: dataWithSuffix as `0x${string}`,
        value: value || 0n
      });

      if (!tx) {
        throw new Error('Transaction failed to send');
      }

      // Submit the referral to Divvi
      let donateTxHash: `0x${string}` | undefined;
      try {
        donateTxHash = tx as unknown as `0x${string}`;
        await submitReferral({
          txHash: donateTxHash,
          chainId: celoChainId
        });
      } catch (referralError) {
        console.error("Referral submission error:", referralError);
      }
      return { approveTxHash, donateTxHash };
    } catch (err) {
      console.error('❌ Error in donateToPool:', err)
      throw err
    }
  }

  return {
    donate,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for batch funding pool
export function useBatchFundPool() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const batchFund = async (poolId: bigint, tokens: Address[], amounts: bigint[], value?: bigint) => {
    if (!poolId || poolId === 0n || !tokens || !amounts) {
      throw new Error('Missing required parameters for batch funding pool');
    }

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const batchFundData = poolInterface.encodeFunctionData('batchFundPool', [poolId, tokens, amounts]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = batchFundData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
        data: dataWithSuffix as `0x${string}`,
        value: value || 0n
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
      console.error('❌ Error in batchFundPool:', err)
      throw err
    }
  }

  return {
    batchFund,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for distributing quadratic
export function useDistributeQuadratic() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const distribute = async (poolId: bigint) => {
    if (!poolId || poolId === 0n) {
      throw new Error('Missing required parameters for distributing quadratic');
    }

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const distributeData = poolInterface.encodeFunctionData('distribute', [poolId, true]); // distributeInSovereignSeas = true for quadratic distribution
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = distributeData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in distributeQuadratic:', err)
      throw err
    }
  }

  return {
    distribute,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for manual distribution
export function useDistributeManual() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const distribute = async (poolId: bigint, projectIds: bigint[], amounts: bigint[], token: Address) => {
    if (!poolId || poolId === 0n || !projectIds || !amounts || !token) {
      throw new Error('Missing required parameters for manual distribution');
    }

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const distributeData = poolInterface.encodeFunctionData('distributeManual', [poolId, projectIds, amounts, token]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = distributeData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in distributeManual:', err)
      throw err
    }
  }

  return {
    distribute,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for adding allowed token
export function useAddAllowedToken() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const addToken = async (poolId: bigint, token: Address) => {
    if (!poolId || poolId === 0n || !token) {
      throw new Error('Missing required parameters for adding allowed token');
    }

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const addTokenData = poolInterface.encodeFunctionData('addAllowedToken', [poolId, token]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = addTokenData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in addAllowedToken:', err)
      throw err
    }
  }

  return {
    addToken,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for removing allowed token
export function useRemoveAllowedToken() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const removeToken = async (poolId: bigint, token: Address) => {
    if (!poolId || poolId === 0n || !token) {
      throw new Error('Missing required parameters for removing allowed token');
    }

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const removeTokenData = poolInterface.encodeFunctionData('removeTrackedToken', [poolId, token]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = removeTokenData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in removeAllowedToken:', err)
      throw err
    }
  }

  return {
    removeToken,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for freezing token
export function useFreezeToken() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const freeze = async (poolId: bigint, token: Address) => {
    if (!poolId || poolId === 0n || !token) {
      throw new Error('Missing required parameters for freezing token');
    }

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const freezeData = poolInterface.encodeFunctionData('freezeToken', [poolId, token]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = freezeData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in freezeToken:', err)
      throw err
    }
  }

  return {
    freeze,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for unfreezing token
export function useUnfreezeToken() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const unfreeze = async (poolId: bigint, token: Address) => {
    if (!poolId || poolId === 0n || !token) {
      throw new Error('Missing required parameters for unfreezing token');
    }

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const unfreezeData = poolInterface.encodeFunctionData('unfreezeToken', [poolId, token]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = unfreezeData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in unfreezeToken:', err)
      throw err
    }
  }

  return {
    unfreeze,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for rescuing tokens
export function useRescueTokens() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const rescue = async (poolId: bigint, token: Address, amount: bigint, recipient: Address, reason: string) => {
    if (!poolId || poolId === 0n || !token || !amount || !recipient || !reason) {
      throw new Error('Missing required parameters for rescuing tokens');
    }

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const rescueData = poolInterface.encodeFunctionData('rescueTokens', [poolId, token, amount, recipient, reason]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = rescueData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in rescueTokens:', err)
      throw err
    }
  }

  return {
    rescue,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for scheduling token rescue
export function useScheduleTokenRescue() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const schedule = async (poolId: bigint, token: Address, amount: bigint, recipient: Address) => {
    if (!poolId || poolId === 0n || !token || !amount || !recipient) {
      throw new Error('Missing required parameters for scheduling token rescue');
    }

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const scheduleData = poolInterface.encodeFunctionData('scheduleTokenRescue', [poolId, token, amount, recipient]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = scheduleData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in scheduleTokenRescue:', err)
      throw err
    }
  }

  return {
    schedule,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for executing scheduled rescue
export function useExecuteScheduledRescue() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const execute = async (scheduleId: string) => {
    if (!scheduleId) {
      throw new Error('Missing required parameters for executing scheduled rescue');
    }

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const executeData = poolInterface.encodeFunctionData('executeScheduledRescue', [scheduleId as `0x${string}`]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = executeData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in executeScheduledRescue:', err)
      throw err
    }
  }

  return {
    execute,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for cancelling scheduled rescue
export function useCancelScheduledRescue() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const cancel = async (scheduleId: string) => {
    if (!scheduleId) {
      throw new Error('Missing required parameters for cancelling scheduled rescue');
    }

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const cancelData = poolInterface.encodeFunctionData('cancelScheduledRescue', [scheduleId as `0x${string}`]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = cancelData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in cancelScheduledRescue:', err)
      throw err
    }
  }

  return {
    cancel,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for pausing pool
export function usePausePool() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const pause = async (poolId: bigint, reason: string) => {
    if (!poolId || poolId === 0n || !reason) {
      throw new Error('Missing required parameters for pausing pool');
    }

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const pauseData = poolInterface.encodeFunctionData('pausePool', [poolId, reason]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = pauseData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in pausePool:', err)
      throw err
    }
  }

  return {
    pause,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for unpausing pool
export function useUnpausePool() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const unpause = async (poolId: bigint) => {
    if (!poolId || poolId === 0n) {
      throw new Error('Missing required parameters for unpausing pool');
    }

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const unpauseData = poolInterface.encodeFunctionData('unpausePool', [poolId]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = unpauseData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in unpausePool:', err)
      throw err
    }
  }

  return {
    unpause,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for closing pool
export function useClosePool() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const close = async (poolId: bigint) => {
    if (!poolId || poolId === 0n) {
      throw new Error('Missing required parameters for closing pool');
    }

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const closeData = poolInterface.encodeFunctionData('closePool', [poolId]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = closeData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in closePool:', err)
      throw err
    }
  }

  return {
    close,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for updating pool metadata
export function useUpdatePoolMetadata() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const update = async (poolId: bigint, newMetadata: string) => {
    if (!poolId || poolId === 0n || !newMetadata) {
      throw new Error('Missing required parameters for updating pool metadata');
    }

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const updateData = poolInterface.encodeFunctionData('updatePoolMetadata', [poolId, newMetadata]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = updateData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in updatePoolMetadata:', err)
      throw err
    }
  }

  return {
    update,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for transferring pool admin
export function useTransferPoolAdmin() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const transfer = async (poolId: bigint, newAdmin: Address) => {
    if (!poolId || poolId === 0n || !newAdmin) {
      throw new Error('Missing required parameters for transferring pool admin');
    }

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const transferData = poolInterface.encodeFunctionData('transferPoolAdmin', [poolId, newAdmin]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = transferData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in transferPoolAdmin:', err)
      throw err
    }
  }

  return {
    transfer,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// ==================== UTILITY FUNCTIONS ====================

// Error handling utility
export function handlePoolsError(error: any): { message: string; code?: string; details?: any } {
  if (error?.message?.includes('Only pool admin')) {
    return { message: 'Only pool administrators can perform this action', code: 'UNAUTHORIZED' }
  }
  
  if (error?.message?.includes('Invalid or inactive pool')) {
    return { message: 'Pool does not exist or is not active', code: 'INVALID_POOL' }
  }
  
  if (error?.message?.includes('Token not valid for pool')) {
    return { message: 'This token is not allowed in this pool', code: 'INVALID_TOKEN' }
  }
  
  if (error?.message?.includes('Token is frozen')) {
    return { message: 'This token is currently frozen in the pool', code: 'TOKEN_FROZEN' }
  }
  
  if (error?.message?.includes('Pool is paused')) {
    return { message: 'This pool is currently paused', code: 'POOL_PAUSED' }
  }
  
  if (error?.message?.includes('Address blacklisted')) {
    return { message: 'This address is blacklisted', code: 'ADDRESS_BLACKLISTED' }
  }
  
  if (error?.message?.includes('Insufficient')) {
    return { message: 'Insufficient balance for this operation', code: 'INSUFFICIENT_BALANCE' }
  }
  
  if (error?.message?.includes('Amount must be greater than 0')) {
    return { message: 'Amount must be greater than zero', code: 'INVALID_AMOUNT' }
  }
  
  return { message: 'An unknown error occurred', details: error }
}

// Format pool type for display
export function formatPoolType(poolType: PoolType): string {
  switch (poolType) {
    case PoolType.UNIVERSAL:
      return 'Universal'
    case PoolType.ERC20_SPECIFIC:
      return 'ERC20 Specific'
    default:
      return 'Unknown'
  }
}

// Format amount for display
export function formatPoolAmount(amount: bigint, decimals: number = 18): string {
  const divisor = BigInt(10 ** decimals)
  const wholePart = amount / divisor
  const fractionalPart = amount % divisor
  
  if (fractionalPart === 0n) {
    return wholePart.toString()
  }
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0')
  const trimmedFractional = fractionalStr.replace(/0+$/, '')
  
  if (trimmedFractional === '') {
    return wholePart.toString()
  }
  
  return `${wholePart}.${trimmedFractional}`
}

// Calculate pool distribution percentage
export function calculateDistributionPercentage(amount: bigint, total: bigint): number {
  if (total === 0n) return 0
  return Number((amount * 10000n) / total) / 100 // Returns percentage with 2 decimal places
}


// Hook for the new distribute function
export function useDistribute() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const distribute = async (poolId: bigint, distributeInSovereignSeas: boolean = false) => {
    if (!poolId || poolId === 0n) {
      throw new Error('Missing required parameters for distributing pool');
    }

    if (!POOLS_CONTRACT_ADDRESS) {
      throw new Error('Pools contract address is not configured. Please set VITE_POOLS_CONTRACT_ADDRESS environment variable.');
    }

    console.log('Distributing pool:', { poolId, distributeInSovereignSeas, contractAddress: POOLS_CONTRACT_ADDRESS });

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const distributeData = poolInterface.encodeFunctionData('distribute', [poolId, distributeInSovereignSeas]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = distributeData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in distribute:', err)
      throw err
    }
  }

  return {
    distribute,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for adding super admin
export function useAddSuperAdmin() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const addSuperAdmin = async (admin: Address) => {
    if (!admin) {
      throw new Error('Missing required parameters for adding super admin');
    }

    if (!POOLS_CONTRACT_ADDRESS) {
      throw new Error('Pools contract address is not configured. Please set VITE_POOLS_CONTRACT_ADDRESS environment variable.');
    }

    console.log('Adding super admin:', { admin, contractAddress: POOLS_CONTRACT_ADDRESS });

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const addSuperAdminData = poolInterface.encodeFunctionData('addSuperAdmin', [admin]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = addSuperAdminData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in addSuperAdmin:', err)
      throw err
    }
  }

  return {
    addSuperAdmin,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for removing super admin
export function useRemoveSuperAdmin() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const removeSuperAdmin = async (admin: Address) => {
    if (!admin) {
      throw new Error('Missing required parameters for removing super admin');
    }

    if (!POOLS_CONTRACT_ADDRESS) {
      throw new Error('Pools contract address is not configured. Please set VITE_POOLS_CONTRACT_ADDRESS environment variable.');
    }

    console.log('Removing super admin:', { admin, contractAddress: POOLS_CONTRACT_ADDRESS });

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const removeSuperAdminData = poolInterface.encodeFunctionData('removeSuperAdmin', [admin]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = removeSuperAdminData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in removeSuperAdmin:', err)
      throw err
    }
  }

  return {
    removeSuperAdmin,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for blacklisting address
export function useBlacklistAddress() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const blacklist = async (address: Address) => {
    if (!address) {
      throw new Error('Missing required parameters for blacklisting address');
    }

    if (!POOLS_CONTRACT_ADDRESS) {
      throw new Error('Pools contract address is not configured. Please set VITE_POOLS_CONTRACT_ADDRESS environment variable.');
    }

    console.log('Blacklisting address:', { address, contractAddress: POOLS_CONTRACT_ADDRESS });

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const blacklistData = poolInterface.encodeFunctionData('blacklistAddress', [address]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = blacklistData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in blacklistAddress:', err)
      throw err
    }
  }

  return {
    blacklist,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for unblacklisting address
export function useUnblacklistAddress() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const unblacklist = async (address: Address) => {
    if (!address) {
      throw new Error('Missing required parameters for unblacklisting address');
    }

    if (!POOLS_CONTRACT_ADDRESS) {
      throw new Error('Pools contract address is not configured. Please set VITE_POOLS_CONTRACT_ADDRESS environment variable.');
    }

    console.log('Unblacklisting address:', { address, contractAddress: POOLS_CONTRACT_ADDRESS });

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const unblacklistData = poolInterface.encodeFunctionData('unblacklistAddress', [address]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = unblacklistData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in unblacklistAddress:', err)
      throw err
    }
  }

  return {
    unblacklist,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for emergency pause
export function useEmergencyPause() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const emergencyPause = async () => {
    if (!POOLS_CONTRACT_ADDRESS) {
      throw new Error('Pools contract address is not configured. Please set VITE_POOLS_CONTRACT_ADDRESS environment variable.');
    }

    console.log('Emergency pausing contract:', { contractAddress: POOLS_CONTRACT_ADDRESS });

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const emergencyPauseData = poolInterface.encodeFunctionData('emergencyPause', []);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = emergencyPauseData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in emergencyPause:', err)
      throw err
    }
  }

  return {
    emergencyPause,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for emergency unpause
export function useEmergencyUnpause() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const emergencyUnpause = async () => {
    if (!POOLS_CONTRACT_ADDRESS) {
      throw new Error('Pools contract address is not configured. Please set VITE_POOLS_CONTRACT_ADDRESS environment variable.');
    }

    console.log('Emergency unpausing contract:', { contractAddress: POOLS_CONTRACT_ADDRESS });

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const emergencyUnpauseData = poolInterface.encodeFunctionData('emergencyUnpause', []);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = emergencyUnpauseData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in emergencyUnpause:', err)
      throw err
    }
  }

  return {
    emergencyUnpause,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for setting rescue delay
export function useSetRescueDelay() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const setDelay = async (newDelay: bigint) => {
    if (!newDelay) {
      throw new Error('Missing required parameters for setting rescue delay');
    }

    if (!POOLS_CONTRACT_ADDRESS) {
      throw new Error('Pools contract address is not configured. Please set VITE_POOLS_CONTRACT_ADDRESS environment variable.');
    }

    console.log('Setting rescue delay:', { newDelay, contractAddress: POOLS_CONTRACT_ADDRESS });

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const setDelayData = poolInterface.encodeFunctionData('setRescueDelay', [newDelay]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = setDelayData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in setRescueDelay:', err)
      throw err
    }
  }

  return {
    setDelay,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// Hook for setting large rescue threshold
export function useSetLargeRescueThreshold() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess, reset } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const { ensureCorrectChain } = useChainSwitch()

  const setThreshold = async (newThreshold: bigint) => {
    if (!newThreshold) {
      throw new Error('Missing required parameters for setting large rescue threshold');
    }

    if (!POOLS_CONTRACT_ADDRESS) {
      throw new Error('Pools contract address is not configured. Please set VITE_POOLS_CONTRACT_ADDRESS environment variable.');
    }

    console.log('Setting large rescue threshold:', { newThreshold, contractAddress: POOLS_CONTRACT_ADDRESS });

    try {
      // Ensure we're on the correct chain before making the transaction
      await ensureCorrectChain();

      // Divvi referral integration section
      const poolInterface = new Interface(poolsABI);
      const setThresholdData = poolInterface.encodeFunctionData('setLargeRescueThreshold', [newThreshold]);
      const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = setThresholdData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: POOLS_CONTRACT_ADDRESS,
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
      console.error('❌ Error in setLargeRescueThreshold:', err)
      throw err
    }
  }

  return {
    setThreshold,
    isPending,
    isError,
    error,
    isSuccess,
    reset
  }
}

// ==================== MAIN HOOK ====================

// Main usePools hook that provides access to all functionality
export const usePools = () => {
  return {
    // Read hooks
    usePoolInfo,
    usePoolBalance,
    usePoolStats,
    usePoolContributors,
    useContributorDetails,
    usePoolDonations,
    useUserClaimHistory,
    useUserReceivedAmount,
    usePoolRecipients,
    useAllowedTokens,
    useRescueHistory,
    useScheduledRescue,
    useCanUserClaimFromDistribution,
    useIsTokenAllowedInPool,
    useIsTokenFrozenInPool,
    usePoolsContractSettings,
    useCampaignToPool,
    useIsSuperAdmin,
    useIsBlacklisted,
    usePoolsOwner,
    useCampaignExists,
    useHasCreatePermission,
    
    // Write hooks
    useCreatePoolUniversal,
    useCreatePoolERC20,
    useCreateAppreciationPoolUniversal,
    useCreateAppreciationPoolERC20,
    useFundPool,
    useDonateToPool,
    useBatchFundPool,
    useDistributeQuadratic,
    useDistributeManual,
    useAddAllowedToken,
    useRemoveAllowedToken,
    useFreezeToken,
    useUnfreezeToken,
    useRescueTokens,
    useScheduleTokenRescue,
    useExecuteScheduledRescue,
    useCancelScheduledRescue,
    usePausePool,
    useUnpausePool,
    useClosePool,
    useUpdatePoolMetadata,
    useTransferPoolAdmin,
    useDistribute,
    useAddSuperAdmin,
    useRemoveSuperAdmin,
    useBlacklistAddress,
    useUnblacklistAddress,
    useEmergencyPause,
    useEmergencyUnpause,
    useSetRescueDelay,
    useSetLargeRescueThreshold,
    
    // Utility functions
    handlePoolsError,
    formatPoolType,
    formatPoolAmount,
    calculateDistributionPercentage,
    
    // Contract address
    contractAddress: POOLS_CONTRACT_ADDRESS
  }
}

// Export individual hooks for convenience
export default {
  usePoolInfo,
  usePoolBalance,
  usePoolStats,
  usePoolContributors,
  useContributorDetails,
  usePoolDonations,
  useUserClaimHistory,
  useUserReceivedAmount,
  usePoolRecipients,
  useAllowedTokens,
  useRescueHistory,
  useScheduledRescue,
  useCanUserClaimFromDistribution,
  useIsTokenAllowedInPool,
  useIsTokenFrozenInPool,
  usePoolsContractSettings,
  useCampaignToPool,
  useIsSuperAdmin,
  useIsBlacklisted,
  usePoolsOwner,
  useCampaignExists,
  useHasCreatePermission,
  useCreatePoolUniversal,
  useCreatePoolERC20,
  useCreateAppreciationPoolUniversal,
  useCreateAppreciationPoolERC20,
  useFundPool,
  useDonateToPool,
  useBatchFundPool,
  useDistributeQuadratic,
  useDistributeManual,
  useAddAllowedToken,
  useRemoveAllowedToken,
  useFreezeToken,
  useUnfreezeToken,
  useRescueTokens,
  useScheduleTokenRescue,
  useExecuteScheduledRescue,
  useCancelScheduledRescue,
  usePausePool,
  useUnpausePool,
  useClosePool,
  useUpdatePoolMetadata,
  useTransferPoolAdmin,
  useDistribute,
  useAddSuperAdmin,
  useRemoveSuperAdmin,
  useBlacklistAddress,
  useUnblacklistAddress,
  useEmergencyPause,
  useEmergencyUnpause,
  useSetRescueDelay,
  useSetLargeRescueThreshold,
  handlePoolsError,
  formatPoolType,
  formatPoolAmount,
  calculateDistributionPercentage,
  usePools
}
