import { useWriteContract, useReadContract, useReadContracts, useSendTransaction, useAccount } from 'wagmi'
import { type Address } from 'viem'
import { bridgeAbi } from '@/abi/bridge'
import { Interface } from "ethers"
import { getReferralTag, submitReferral } from '@divvi/referral-sdk'

// Use fallback address if environment variable is not set
const contractAddress = (import.meta.env.VITE_SIMPLE_BRIDGE_V1 || "0x8970026D77290AA73FF2c95f80D6a4beEd94284F") as Address;

// Divvi Integration - will be generated dynamically with user address
const CONSUMER_ADDRESS = '0x53eaF4CD171842d8144e45211308e5D90B4b0088' as const

// Campaign creation fee: 2 CELO
const CAMPAIGN_CREATION_FEE = 2n * 10n**18n; // 2 CELO in wei

// Types for better TypeScript support
export interface ProjectMetadata {
  bio: string
  contractInfo: string
  additionalData: string
  logo?: string
}

export interface Project {
  id: bigint
  owner: Address
  name: string
  description: string
  transferrable: boolean
  active: boolean
  createdAt: bigint
  campaignIds: bigint[]
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
  active: boolean
  totalFunds: bigint
}

export interface CampaignPool {
  campaignId: bigint
  poolId: bigint
  poolAddress: Address
  totalAmount: bigint
  distributedAmount: bigint
  memberCount: bigint
  isActive: boolean
  createdAt: bigint
}

export interface PoolStats {
  totalMembers: bigint
  totalDistributed: bigint
  remainingBalance: bigint
  averageRewardPerMember: bigint
}

export interface ProjectParticipation {
  projectId: bigint
  campaignId: bigint
  approved: boolean
  voteCount: bigint
  fundsReceived: bigint
}

// Hook for creating a new project with Divvi integration
export function useCreateProject() {
  const { address: user } = useAccount()
  const { isPending, isError, error, isSuccess } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()

  const createProject = async ({
    name,
    description,
    bio,
    contractInfo,
    additionalData,
    contracts = [],
    transferrable = true
  }: {
    name: string
    description: string
    bio: string
    contractInfo: string
    additionalData: string
    contracts?: Address[]
    transferrable?: boolean
  }) => {
    try {
      // Divvi referral integration section
      const createProjectInterface = new Interface(bridgeAbi);

      const createProjectData = createProjectInterface.encodeFunctionData('createProject', [
        name,
        description,
        bio,
        contractInfo,
        additionalData,
        contracts,
        transferrable
      ]);
      
      const isTestnet = import.meta.env.VITE_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet
      
      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = createProjectData + referralTag;

      // Using sendTransactionAsync to support referral integration
      const tx = await sendTransactionAsync({
        to: contractAddress as `0x${string}`,
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
      console.error('❌ Error in createProject:', err)
      throw err
    }
  }

  return {
    createProject,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for creating a campaign with Good Dollar pool
export function useCreateCampaign() {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

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
    goodDollarPoolAmount,
    poolProjectId,
    poolIpfs,
    feeAmount
  }: {
    name: string
    description: string
    mainInfo: string
    additionalInfo: string
    startTime: bigint
    endTime: bigint
    adminFeePercentage: bigint
    maxWinners: bigint
    useQuadraticDistribution: boolean
    useCustomDistribution: boolean
    customDistributionData: string
    payoutToken: Address
    feeToken: Address
    goodDollarPoolAmount: bigint
    poolProjectId: string
    poolIpfs: string
    feeAmount?: bigint
  }) => {
    try {
      // Validate contract address
      if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('Invalid contract address. Please check your environment variables.');
      }

      // Use writeContract directly for better integration
      // Default to 2 CELO fee if not specified
      const feeToSend = feeAmount || CAMPAIGN_CREATION_FEE;
      
      console.log('Creating campaign with bridge contract:', {
        contractAddress,
        feeToSend: (Number(feeToSend) / 1e18).toFixed(6) + ' CELO',
        name,
        description: description.substring(0, 50) + '...'
      });
      
      await writeContract({
        address: contractAddress as Address,
        abi: bridgeAbi,
        functionName: 'createCampaign',
        args: [
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
          goodDollarPoolAmount,
          poolProjectId,
          poolIpfs
        ],
        value: feeToSend
      });
      
    } catch (err) {
      console.error('❌ Error in createCampaign:', err)
      console.error('Contract address used:', contractAddress)
      console.error('Fee amount:', feeAmount ? (Number(feeAmount) / 1e18).toFixed(6) + ' CELO' : 'Not specified')
      throw err
    }
  }

  return {
    createCampaign,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for adding project to campaign
export function useAddProjectToCampaign() {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const addProjectToCampaign = async ({
    campaignId,
    projectId,
    feeToken,
    feeAmount
  }: {
    campaignId: bigint
    projectId: bigint
    feeToken: Address
    feeAmount?: bigint
  }) => {
    try {
      await writeContract({
        address: contractAddress as Address,
        abi: bridgeAbi,
        functionName: 'addProjectToCampaign',
        args: [campaignId, projectId, feeToken],
        value: feeAmount || BigInt(0)
      })
    } catch (err) {
      console.error('Error adding project to campaign:', err)
      throw err
    }
  }

  return {
    addProjectToCampaign,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for approving projects
export function useApproveProject() {
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
        address: contractAddress as Address,
        abi: bridgeAbi,
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

// Hook for voting with tokens
export function useVote() {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const vote = async ({
    campaignId,
    projectId,
    token,
    amount,
    bypassCode
  }: {
    campaignId: bigint
    projectId: bigint
    token: Address
    amount: bigint
    bypassCode: string
  }) => {
    try {
      await writeContract({
        address: contractAddress as Address,
        abi: bridgeAbi,
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

// Hook for voting with CELO
export function useVoteWithCelo() {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const voteWithCelo = async ({
    campaignId,
    projectId,
    bypassCode,
    amount
  }: {
    campaignId: bigint
    projectId: bigint
    bypassCode: string
    amount: bigint
  }) => {
    try {
      await writeContract({
        address: contractAddress as Address,
        abi: bridgeAbi,
        functionName: 'voteWithCelo',
        args: [campaignId, projectId, bypassCode],
        value: amount
      })
    } catch (err) {
      console.error('Error voting with CELO:', err)
      throw err
    }
  }

  return {
    voteWithCelo,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for distributing funds
export function useDistributeFunds() {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const distributeFunds = async ({
    campaignId
  }: {
    campaignId: bigint
  }) => {
    try {
      await writeContract({
        address: contractAddress as Address,
        abi: bridgeAbi,
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

// Hook for creating Good Dollar pool for campaign
export function useCreatePoolForCampaign() {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const createPoolForCampaign = async ({
    campaignId,
    poolAmount,
    projectId,
    ipfs
  }: {
    campaignId: bigint
    poolAmount: bigint
    projectId: string
    ipfs: string
  }) => {
    try {
      await writeContract({
        address: contractAddress as Address,
        abi: bridgeAbi,
        functionName: 'createPoolForCampaign',
        args: [campaignId, poolAmount, projectId, ipfs]
      })
    } catch (err) {
      console.error('Error creating pool for campaign:', err)
      throw err
    }
  }

  return {
    createPoolForCampaign,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for adding members to pool
export function useAddMemberToPool() {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const addMemberToPool = async ({
    campaignId,
    member
  }: {
    campaignId: bigint
    member: Address
  }) => {
    try {
      await writeContract({
        address: contractAddress as Address,
        abi: bridgeAbi,
        functionName: 'addMemberToPool',
        args: [campaignId, member]
      })
    } catch (err) {
      console.error('Error adding member to pool:', err)
      throw err
    }
  }

  return {
    addMemberToPool,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for removing members from pool
export function useRemoveMemberFromPool() {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const removeMemberFromPool = async ({
    campaignId,
    member
  }: {
    campaignId: bigint
    member: Address
  }) => {
    try {
      await writeContract({
        address: contractAddress as Address,
        abi: bridgeAbi,
        functionName: 'removeMemberFromPool',
        args: [campaignId, member]
      })
    } catch (err) {
      console.error('Error removing member from pool:', err)
      throw err
    }
  }

  return {
    removeMemberFromPool,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for custom reward distribution
export function useDistributeCustomRewards() {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const distributeCustomRewards = async ({
    campaignId,
    recipients,
    amounts,
    eventUris
  }: {
    campaignId: bigint
    recipients: Address[]
    amounts: bigint[]
    eventUris: string[]
  }) => {
    try {
      await writeContract({
        address: contractAddress as Address,
        abi: bridgeAbi,
        functionName: 'distributeCustomRewards',
        args: [campaignId, recipients, amounts, eventUris]
      })
    } catch (err) {
      console.error('Error distributing custom rewards:', err)
      throw err
    }
  }

  return {
    distributeCustomRewards,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for funding bridge
export function useFundBridge() {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const fundBridge = async ({
    amount
  }: {
    amount: bigint
  }) => {
    try {
      await writeContract({
        address: contractAddress as Address,
        abi: bridgeAbi,
        functionName: 'fundBridge',
        args: [amount]
      })
    } catch (err) {
      console.error('Error funding bridge:', err)
      throw err
    }
  }

  return {
    fundBridge,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for emergency withdrawal
export function useEmergencyWithdraw() {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const emergencyWithdraw = async ({
    token,
    amount,
    recipient
  }: {
    token: Address
    amount: bigint
    recipient: Address
  }) => {
    try {
      await writeContract({
        address: contractAddress as Address,
        abi: bridgeAbi,
        functionName: 'emergencyWithdraw',
        args: [token, amount, recipient]
      })
    } catch (err) {
      console.error('Error emergency withdrawing:', err)
      throw err
    }
  }

  return {
    emergencyWithdraw,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for updating Good Dollar settings
export function useUpdateGoodDollarSettings() {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const updateGoodDollarSettings = async ({
    defaultPoolSize,
    projectCreationReward,
    membershipReward,
    distributionReward
  }: {
    defaultPoolSize: bigint
    projectCreationReward: bigint
    membershipReward: bigint
    distributionReward: bigint
  }) => {
    try {
      await writeContract({
        address: contractAddress as Address,
        abi: bridgeAbi,
        functionName: 'updateGoodDollarSettings',
        args: [defaultPoolSize, projectCreationReward, membershipReward, distributionReward]
      })
    } catch (err) {
      console.error('Error updating Good Dollar settings:', err)
      throw err
    }
  }

  return {
    updateGoodDollarSettings,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for updating manager fee
export function useUpdateManagerFee() {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const updateManagerFee = async ({
    newFeeBps
  }: {
    newFeeBps: number
  }) => {
    try {
      await writeContract({
        address: contractAddress as Address,
        abi: bridgeAbi,
        functionName: 'updateManagerFee',
        args: [newFeeBps]
      })
    } catch (err) {
      console.error('Error updating manager fee:', err)
      throw err
    }
  }

  return {
    updateManagerFee,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for pausing/unpausing contract
export function usePauseContract() {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const pause = async () => {
    try {
      await writeContract({
        address: contractAddress as Address,
        abi: bridgeAbi,
        functionName: 'pause'
      })
    } catch (err) {
      console.error('Error pausing contract:', err)
      throw err
    }
  }

  const unpause = async () => {
    try {
      await writeContract({
        address: contractAddress as Address,
        abi: bridgeAbi,
        functionName: 'unpause'
      })
    } catch (err) {
      console.error('Error unpausing contract:', err)
      throw err
    }
  }

  return {
    pause,
    unpause,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for reading project count
export function useProjectCount() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress as Address,
    abi: bridgeAbi,
    functionName: 'getProjectCount',
    query: {
      enabled: !!contractAddress
    }
  })

  return {
    projectCount: data,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading campaign count
export function useCampaignCount() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress as Address,
    abi: bridgeAbi,
    functionName: 'getCampaignCount',
    query: {
      enabled: !!contractAddress
    }
  })

  return {
    campaignCount: data,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading a single project
export function useProject(projectId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress as Address,
    abi: bridgeAbi,
    functionName: 'getProject',
    args: [projectId],
    query: {
      enabled: !!contractAddress && !!projectId
    }
  })

  const project = data ? {
    id: (data as any[])[0],
    owner: (data as any[])[1],
    name: (data as any[])[2],
    description: (data as any[])[3],
    transferrable: (data as any[])[4],
    active: (data as any[])[5],
    createdAt: (data as any[])[6],
    campaignIds: (data as any[])[7]
  } as Project : null

  return {
    project,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading a single campaign
export function useCampaign(campaignId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress as Address,
    abi: bridgeAbi,
    functionName: 'getCampaign',
    args: [campaignId],
    query: {
      enabled: !!contractAddress && !!campaignId
    }
  })

  const campaign = data ? {
    id: (data as any[])[0],
    admin: (data as any[])[1],
    name: (data as any[])[2],
    description: (data as any[])[3],
    startTime: (data as any[])[4],
    endTime: (data as any[])[5],
    adminFeePercentage: (data as any[])[6],
    maxWinners: (data as any[])[7],
    useQuadraticDistribution: (data as any[])[8],
    useCustomDistribution: (data as any[])[9],
    payoutToken: (data as any[])[10],
    active: (data as any[])[11],
    totalFunds: (data as any[])[12]
  } as Campaign : null

  return {
    campaign,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading campaign pool
export function useCampaignPool(campaignId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress as Address,
    abi: bridgeAbi,
    functionName: 'getCampaignPool',
    args: [campaignId],
    query: {
      enabled: !!contractAddress && !!campaignId
    }
  })

  const pool = data ? {
    campaignId: (data as any[])[0],
    poolId: (data as any[])[1],
    poolAddress: (data as any[])[2],
    totalAmount: (data as any[])[3],
    distributedAmount: (data as any[])[4],
    memberCount: (data as any[])[5],
    isActive: (data as any[])[6],
    createdAt: (data as any[])[7]
  } as CampaignPool : null

  return {
    pool,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading campaign members
export function useCampaignMembers(campaignId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress as Address,
    abi: bridgeAbi,
    functionName: 'getCampaignMembers',
    args: [campaignId],
    query: {
      enabled: !!contractAddress && !!campaignId
    }
  })

  return {
    members: data || [],
    isLoading,
    error,
    refetch
  }
}

// Hook for reading pool stats
export function usePoolStats(campaignId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress as Address,
    abi: bridgeAbi,
    functionName: 'getPoolStats',
    args: [campaignId],
    query: {
      enabled: !!contractAddress && !!campaignId
    }
  })

  const stats = data ? {
    totalMembers: (data as any[])[0],
    totalDistributed: (data as any[])[1],
    remainingBalance: (data as any[])[2],
    averageRewardPerMember: (data as any[])[3]
  } as PoolStats : null

  return {
    stats,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading project participation
export function useProjectParticipation(campaignId: bigint, projectId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress as Address,
    abi: bridgeAbi,
    functionName: 'getProjectParticipation',
    args: [campaignId, projectId],
    query: {
      enabled: !!contractAddress && !!campaignId && !!projectId
    }
  })

  const participation = data ? {
    projectId: (data as any[])[0],
    campaignId: (data as any[])[1],
    approved: (data as any[])[2],
    voteCount: (data as any[])[3],
    fundsReceived: (data as any[])[4]
  } as ProjectParticipation : null

  return {
    participation,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading sorted projects
export function useSortedProjects(campaignId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress as Address,
    abi: bridgeAbi,
    functionName: 'getSortedProjects',
    args: [campaignId],
    query: {
      enabled: !!contractAddress && !!campaignId
    }
  })

  return {
    sortedProjects: data || [],
    isLoading,
    error,
    refetch
  }
}

// Hook for reading member reward
export function useMemberReward(campaignId: bigint, member: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress as Address,
    abi: bridgeAbi,
    functionName: 'getMemberReward',
    args: [campaignId, member],
    query: {
      enabled: !!contractAddress && !!campaignId && !!member
    }
  })

  return {
    reward: data,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading pool balance
export function usePoolBalance(campaignId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress as Address,
    abi: bridgeAbi,
    functionName: 'getPoolBalance',
    args: [campaignId],
    query: {
      enabled: !!contractAddress && !!campaignId
    }
  })

  return {
    balance: data,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading bridge Good Dollar balance
export function useBridgeGoodDollarBalance() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress as Address,
    abi: bridgeAbi,
    functionName: 'getBridgeGoodDollarBalance',
    query: {
      enabled: !!contractAddress
    }
  })

  return {
    balance: data,
    isLoading,
    error,
    refetch
  }
}

// Hook for checking if campaign has Good Dollar pool
export function useHasGoodDollarPool(campaignId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress as Address,
    abi: bridgeAbi,
    functionName: 'hasGoodDollarPool',
    args: [campaignId],
    query: {
      enabled: !!contractAddress && !!campaignId
    }
  })

  return {
    hasPool: data,
    isLoading,
    error,
    refetch
  }
}

// Hook for checking if address is campaign admin
export function useIsCampaignAdmin(campaignId: bigint, admin: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress as Address,
    abi: bridgeAbi,
    functionName: 'isCampaignAdmin',
    args: [campaignId, admin],
    query: {
      enabled: !!contractAddress && !!campaignId && !!admin
    }
  })

  return {
    isAdmin: data,
    isLoading,
    error,
    refetch
  }
}

// Hook for checking if address is pool member
export function useIsPoolMember(campaignId: bigint, member: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress as Address,
    abi: bridgeAbi,
    functionName: 'isPoolMember',
    args: [campaignId, member],
    query: {
      enabled: !!contractAddress && !!campaignId && !!member
    }
  })

  return {
    isMember: data,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading total member rewards
export function useTotalMemberRewards(member: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress as Address,
    abi: bridgeAbi,
    functionName: 'getTotalMemberRewards',
    args: [member],
    query: {
      enabled: !!contractAddress && !!member
    }
  })

  return {
    totalRewards: data,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading contract settings
export function useContractSettings() {
  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: [
      {
        address: contractAddress as Address,
        abi: bridgeAbi,
        functionName: 'defaultPoolSize'
      },
      {
        address: contractAddress as Address,
        abi: bridgeAbi,
        functionName: 'projectCreationReward'
      },
      {
        address: contractAddress as Address,
        abi: bridgeAbi,
        functionName: 'membershipReward'
      },
      {
        address: contractAddress as Address,
        abi: bridgeAbi,
        functionName: 'distributionReward'
      },
      {
        address: contractAddress as Address,
        abi: bridgeAbi,
        functionName: 'managerFeeBps'
      }
    ],
    query: {
      enabled: !!contractAddress
    }
  })

  const [defaultPoolSize, projectCreationReward, membershipReward, distributionReward, managerFeeBps] = data || []

  return {
    settings: data ? {
      defaultPoolSize: defaultPoolSize?.result,
      projectCreationReward: projectCreationReward?.result,
      membershipReward: membershipReward?.result,
      distributionReward: distributionReward?.result,
      managerFeeBps: managerFeeBps?.result
    } : null,
    isLoading,
    error,
    refetch
  }
}

// Main useBridge hook that provides access to all functionality
export const useBridge = () => {
  return {
    // Write hooks
    useCreateProject,
    useCreateCampaign,
    useAddProjectToCampaign,
    useApproveProject,
    useVote,
    useVoteWithCelo,
    useDistributeFunds,
    useCreatePoolForCampaign,
    useAddMemberToPool,
    useRemoveMemberFromPool,
    useDistributeCustomRewards,
    useFundBridge,
    useEmergencyWithdraw,
    useUpdateGoodDollarSettings,
    useUpdateManagerFee,
    usePauseContract,
    
    // Read hooks
    useProjectCount,
    useCampaignCount,
    useProject,
    useCampaign,
    useCampaignPool,
    useCampaignMembers,
    usePoolStats,
    useProjectParticipation,
    useSortedProjects,
    useMemberReward,
    usePoolBalance,
    useBridgeGoodDollarBalance,
    useHasGoodDollarPool,
    useIsCampaignAdmin,
    useIsPoolMember,
    useTotalMemberRewards,
    useContractSettings,
    
    // Contract address
    contractAddress
  }
}
    