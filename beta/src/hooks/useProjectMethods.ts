import { useWriteContract, useReadContract, useReadContracts, useAccount, useSendTransaction } from 'wagmi'
import { formatEther, type Address, type Abi, type AbiFunction } from 'viem'
import { contractABI as abi } from '@/abi/seas4ABI'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Interface } from "ethers"
import { getReferralTag, submitReferral } from '@divvi/referral-sdk'

const projectInterface = new Interface(abi)

// Divvi Integration - will be generated dynamically with user address
const CONSUMER_ADDRESS = '0x53eaF4CD171842d8144e45211308e5D90B4b0088' as const

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
  tagline?: string
  transferrable: boolean
  active: boolean
  createdAt: bigint
  campaignIds: bigint[]
  metadata?: ProjectMetadata
  verified?: boolean
}

export interface ProjectDetails {
  project: Project
  metadata: ProjectMetadata
  contracts: Address[]
}

// Enhanced Project interface for the component
export interface EnhancedProject {
  id: number
  owner: Address
  name: string
  description: string
  transferrable: boolean
  active: boolean
  createdAt: bigint
  campaignIds: bigint[]
  metadata?: {
    bio: string
    contractInfo: string
    additionalData: string
    [key: string]: any
  }
  contracts?: Address[]
}

// Hook for creating a new project with Divvi integration
export function useCreateProject(contractAddress: Address) {
  const { address: user } = useAccount()
  const {  isPending, isError, error, isSuccess } = useWriteContract()
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
      const createProjectInterface = new Interface(abi);

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

// Export all the other hooks from your original file
export function useUpdateProject(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const updateProject = async ({
    projectId,
    name,
    description,
    bio,
    contractInfo,
    additionalData,
    contracts
  }: {
    projectId: bigint
    name: string
    description: string
    bio: string
    contractInfo: string
    additionalData: string
    contracts: Address[]
  }) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'updateProject',
        args: [
          projectId,
          name,
          description,
          bio,
          contractInfo,
          additionalData,
          contracts
        ]
      })
    } catch (err) {
      console.error('Error updating project:', err)
      throw err
    }
  }

  return {
    updateProject,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for reading a single project
export function useSingleProject(contractAddress: Address, projectId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getProject',
    args: [projectId],
    query: {
      enabled: !!contractAddress && projectId !== undefined
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

// Hook for updating specific project metadata
export function useUpdateProjectMetadata(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const updateProjectMetadata = async ({
    projectId,
    metadataType,
    newData
  }: {
    projectId: bigint
    metadataType: 1 | 2 | 3 // 1=bio, 2=contractInfo, 3=additionalData
    newData: string
  }) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'updateProjectMetadata',
        args: [projectId, metadataType, newData]
      })
    } catch (err) {
      console.error('Error updating project metadata:', err)
      throw err
    }
  }

  return {
    updateProjectMetadata,
    isPending,
    isError,
    error,
    isSuccess
  }
}

// Hook for transferring project ownership
export function useTransferProjectOwnership(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const transferOwnership = async ({
    projectId,
    newOwner
  }: {
    projectId: bigint
    newOwner: Address
  }) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'transferProjectOwnership',
        args: [projectId, newOwner]
      })
    } catch (err) {
      console.error('Error transferring project ownership:', err)
      throw err
    }
  }

  return {
    transferOwnership,
    isPending,
    isError,
    error,
    isSuccess
  }
}


// FIXED: Hook for adding project to campaign
export function useAddProjectToCampaign(contractAddress: Address) {
  const { address: user } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()

  const addProjectToCampaign = async ({
    campaignId,
    projectId,
    feeToken,
    feeAmount = 1000000000000000000n, 
    shouldPayFee = true
  }: {
    campaignId: bigint
    projectId: bigint
    feeToken: Address
    feeAmount?: bigint
    shouldPayFee?: boolean
  }) => {
    try {
      console.log('Parameters:', {
        campaignId,
        projectId,
        feeToken,
        feeAmount
      })

      // Check if fee token is CELO (native token) - no approval needed
      const isCeloToken = feeToken.toLowerCase() === '0x471ece3750da237f93b8e339c536989b8978a438'; // CELO token address
      
      if (!isCeloToken) {
        // Only approve if it's an ERC20 token (not CELO)
        const erc20ABI = [
          {
            "inputs": [
              {"name": "spender", "type": "address"},
              {"name": "amount", "type": "uint256"}
            ],
            "name": "approve",
            "outputs": [{"name": "", "type": "bool"}],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ] as const;

        console.log('Approving ERC20 token...');
        const approveTx = await writeContractAsync({
          address: feeToken,
          abi: erc20ABI,
          functionName: 'approve',
          args: [contractAddress, feeAmount]
        });
        
        console.log('Approve transaction sent:', approveTx);
      } else {
        console.log('Fee token is CELO (native), skipping approval');
      }

      // Encode the addProjectToCampaign function call with Divvi suffix
      const projectData = projectInterface.encodeFunctionData('addProjectToCampaign', [
        campaignId, 
        projectId, 
        feeToken
      ]);

      const isTestnet = import.meta.env.VITE_ENV === 'testnet';
      const celoChainId = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet
      
      // Generate referral tag with user address
      const referralTag = getReferralTag({
        user: user as Address, // The user address making the transaction (required)
        consumer: CONSUMER_ADDRESS, // The address of the consumer making the call
      })

      const dataWithSuffix = projectData + referralTag;

      // Send the main transaction
      // If CELO, include the fee amount as value; if ERC20, value is 0
      const tx = await sendTransactionAsync({
        to: contractAddress,
        data: dataWithSuffix as `0x${string}`,
        value: isCeloToken ? feeAmount : 0n
      });

      if (!tx) {
        throw new Error('Main transaction failed to send');
      }

      console.log('Main transaction sent:', tx);

      // Submit the referral to Divvi
      try {
        await submitReferral({
          txHash: tx as unknown as `0x${string}`,
          chainId: celoChainId
        });
        console.log('Referral submitted successfully');
      } catch (referralError) {
        console.error("Referral submission error:", referralError);
      }

      return tx;
    } catch (err) {
      console.log("should pay fee", shouldPayFee)
      console.error('Error adding project to campaign:', err)
      throw err
    }
  }

  return {
    addProjectToCampaign,
    isPending: false, // You can track state manually if needed
    isError: false,
    error: null,
    isSuccess: false
  }
}

// Hook to check if user can bypass fees
export function useCanBypassFees(contractAddress: Address, campaignId: bigint) {
  const { address: userAddress } = useAccount()

  const { data: isAdmin, isLoading, error } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'isCampaignAdmin',
    args: [campaignId, userAddress as Address],
    query: {
      enabled: !!userAddress && !!contractAddress && campaignId > 0n
    }
  })

  return {
    isAdmin: isAdmin as boolean,
    isLoading,
    error,
    userAddress
  }
}

// Hook to get project addition fee
export function useProjectAdditionFee(contractAddress: Address) {
  const { data, isLoading, error } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'projectAdditionFee',
    query: {
      enabled: !!contractAddress
    }
  })

  return {
    projectAdditionFee: data as bigint,
    projectAdditionFeeFormatted: data ? formatEther(data as bigint) : '0',
    isLoading,
    error
  }
}


// Hook for removing project from campaign
export function useRemoveProjectFromCampaign(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const removeProjectFromCampaign = async ({
    campaignId,
    projectId
  }: {
    campaignId: bigint
    projectId: bigint
  }) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'removeProjectFromCampaign',
        args: [campaignId, projectId]
      })
    } catch (err) {
      console.error('Error removing project from campaign:', err)
      throw err
    }
  }

  return {
    removeProjectFromCampaign,
    isPending,
    isError,
    error,
    isSuccess
  }
}

//hook for getting project campaigns

// Hook for reading project count
export function useProjectCount(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getProjectCount',
    query: {
      enabled: !!contractAddress
    }
  })

  return {
    projectCount: data as bigint,
    isLoading,
    error,
    refetch
  }
}

// Hook for fetching multiple project participations at once
export function useProjectParticipations(
  contractAddress: Address,
  campaignId: bigint,
  projectIds: bigint[]
) {


  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: projectIds.map(projectId => ({
      address: contractAddress,
      abi: [{
        inputs: [
          { name: 'campaignId', type: 'uint256' },
          { name: 'projectId', type: 'uint256' }
        ],
        name: 'getParticipation',
        outputs: [
          { name: 'approved', type: 'bool' },
          { name: 'voteCount', type: 'uint256' },
          { name: 'fundsReceived', type: 'uint256' }
        ],
        stateMutability: 'view',
        type: 'function'
      } satisfies AbiFunction],
      functionName: 'getParticipation',
      args: [campaignId, projectId]
    })),
    query: {
      enabled: !!contractAddress && !!campaignId && projectIds.length > 0,
      retry: 3,
      retryDelay: 1000,
      staleTime: 0 // Always fetch fresh data
    }
  });

  // Process the data into a more usable format
  const participations = useMemo(() => {
    if (!data) {
      return {};
    }

    const processed = projectIds.reduce((acc, projectId, index) => {
      const result = data[index]?.result as [boolean, bigint, bigint] | undefined;
      if (result) {
        acc[projectId.toString()] = {
          approved: result[0],
          voteCount: result[1],
          fundsReceived: result[2]
        };
      } else {
      }
      return acc;
    }, {} as Record<string, { approved: boolean; voteCount: bigint; fundsReceived: bigint }>);

    return processed;
  }, [data, projectIds]);

  return {
    participations,
    isLoading,
    error,
    refetch
  };
}

// Hook for getting project campaigns and their status
export function useProjectCampaigns(contractAddress: Address, projectId: bigint) {
  const { data: projectData, isLoading: projectLoading, error: projectError } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getProject',
    args: [projectId],
    query: {
      enabled: !!contractAddress && projectId !== undefined
    }
  })

  const campaignIds = projectData ? (projectData as any[])[7] as bigint[] : []

  // Get campaign details for each campaign ID
  const campaignContracts = campaignIds.map(campaignId => ({
    address: contractAddress,
    abi,
    functionName: 'getCampaign',
    args: [campaignId]
  }))

  // Get participation status for each campaign
  const participationContracts = campaignIds.map(campaignId => ({
    address: contractAddress,
    abi,
    functionName: 'getParticipation',
    args: [campaignId, projectId]
  }))

  const { data: campaignsData, isLoading: campaignsLoading, error: campaignsError } = useReadContracts({
    contracts: [...campaignContracts, ...participationContracts] as unknown as readonly {
      address: Address
      abi: Abi
      functionName: string
      args: readonly [bigint] | readonly [bigint, bigint]
    }[],
    query: {
      enabled: !!contractAddress && campaignIds.length > 0
    }
  })

  const projectCampaigns = campaignIds.map((campaignId, index) => {
    console.log(campaignId)
    const campaignResult = campaignsData?.[index]?.result
    const participationResult = campaignsData?.[index + campaignIds.length]?.result

    if (!campaignResult || !participationResult) return null

    const campaign = {
      id: (campaignResult as any[])[0],
      admin: (campaignResult as any[])[1],
      name: (campaignResult as any[])[2],
      description: (campaignResult as any[])[3],
      startTime: (campaignResult as any[])[4],
      endTime: (campaignResult as any[])[5],
      adminFeePercentage: (campaignResult as any[])[6],
      maxWinners: (campaignResult as any[])[7],
      useQuadraticDistribution: (campaignResult as any[])[8],
      useCustomDistribution: (campaignResult as any[])[9],
      payoutToken: (campaignResult as any[])[10],
      active: (campaignResult as any[])[11],
      totalFunds: (campaignResult as any[])[12]
    }

    const participation = {
      approved: (participationResult as any[])[0],
      voteCount: (participationResult as any[])[1],
      fundsReceived: (participationResult as any[])[2]
    }

    // Determine campaign status
    const now = Math.floor(Date.now() / 1000)
    const startTime = Number(campaign.startTime)
    const endTime = Number(campaign.endTime)
    
    let status: 'upcoming' | 'active' | 'ended' | 'inactive'
    if (!campaign.active) {
      status = 'inactive'
    } else if (now < startTime) {
      status = 'upcoming'
    } else if (now >= startTime && now <= endTime) {
      status = 'active'
    } else {
      status = 'ended'
    }

    return {
      ...campaign,
      participation,
      status,
      isApproved: participation.approved,
      hasVotes: participation.voteCount > 0n,
      hasFundsReceived: participation.fundsReceived > 0n
    }
  }).filter(Boolean)

  return {
    projectCampaigns,
    isLoading: projectLoading || campaignsLoading,
    error: projectError || campaignsError,
    campaignCount: campaignIds.length
  }
}

// Hook for reading project metadata
export function useProjectMetadata(contractAddress: Address, projectId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getProjectMetadata',
    args: [projectId],
    query: {
      enabled: !!contractAddress && projectId !== undefined
    }
  })

  const metadata = data ? {
    bio: (data as any[])[0],
    contractInfo: (data as any[])[1],
    additionalData: (data as any[])[2],
    contracts: (data as any[])[3]
  } : null

  return {
    metadata,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading complete project details (combines basic + metadata)
export function useProjectDetails(contractAddress: Address, projectId: bigint) {
  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: [
      {
        address: contractAddress,
        abi,
        functionName: 'getProject',
        args: [projectId]
      },
      {
        address: contractAddress,
        abi,
        functionName: 'getProjectMetadata',
        args: [projectId]
      }
    ],
    query: {
      enabled: !!contractAddress && projectId !== undefined
    }
  })

  const projectDetails: ProjectDetails | null = data && data[0].result && data[1].result ? {
    project: {
      id: (data[0].result as any[])[0],
      owner: (data[0].result as any[])[1],
      name: (data[0].result as any[])[2],
      description: (data[0].result as any[])[3],
      transferrable: (data[0].result as any[])[4],
      active: (data[0].result as any[])[5],
      createdAt: (data[0].result as any[])[6],
      campaignIds: (data[0].result as any[])[7]
    },
    metadata: {
      bio: (data[1].result as any[])[0],
      contractInfo: (data[1].result as any[])[1],
      additionalData: (data[1].result as any[])[2]
    },
    contracts: (data[1].result as any[])[3]
  } : null

  return {
    projectDetails,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading multiple projects at once
export function useProjects(contractAddress: Address, projectIds: bigint[]) {

  const contracts = projectIds.flatMap(id => [
    {
      address: contractAddress,
      abi,
      functionName: 'getProject',
      args: [id]
    },
    {
      address: contractAddress,
      abi,
      functionName: 'getProjectMetadata',
      args: [id]
    }
  ])


  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: contracts as unknown as readonly {
      address: Address
      abi: Abi
      functionName: string
      args: readonly [bigint]
    }[],
    query: {
      enabled: !!contractAddress && projectIds.length > 0
    }
  })


  const projects: ProjectDetails[] = []
  
  if (data) {
    for (let i = 0; i < projectIds.length; i++) {
      const basicIndex = i * 2
      const metadataIndex = i * 2 + 1
      
      if (data[basicIndex]?.result && data[metadataIndex]?.result) {
        projects.push({
          project: {
            id: (data[basicIndex].result as any[])[0],
            owner: (data[basicIndex].result as any[])[1],
            name: (data[basicIndex].result as any[])[2],
            description: (data[basicIndex].result as any[])[3],
            transferrable: (data[basicIndex].result as any[])[4],
            active: (data[basicIndex].result as any[])[5],
            createdAt: (data[basicIndex].result as any[])[6],
            campaignIds: (data[basicIndex].result as any[])[7]
          },
          metadata: {
            bio: (data[metadataIndex].result as any[])[0],
            contractInfo: (data[metadataIndex].result as any[])[1],
            additionalData: (data[metadataIndex].result as any[])[2]
          },
          contracts: (data[metadataIndex].result as any[])[3]
        })
      }
    }
  }

  return {
    projects,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading all projects (use with caution for large datasets)
export function useAllProjects(contractAddress: Address) {
  const { projectCount, isLoading: countLoading } = useProjectCount(contractAddress)
  
  
  const projectIds = projectCount ? 
    Array.from({ length: Number(projectCount) }, (_, i) => BigInt(i)) : []

  const { projects, isLoading: projectsLoading, error, refetch } = useProjects(contractAddress, projectIds)

  return {
    projects,
    isLoading: countLoading || projectsLoading,
    error,
    refetch
  }
}

// Main hook for project methods - FIXED VERSION
export function useProject(contractAddress: Address) {
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize the hook
  useEffect(() => {
    if (contractAddress) {
      setIsInitialized(true)
    }
  }, [contractAddress])

  // Get project count
  const { projectCount, isLoading: countLoading, error: countError } = useProjectCount(contractAddress)

  // Get all projects using the useAllProjects hook
  const { projects: allProjectsData, isLoading: projectsLoading, error: projectsError } = useAllProjects(contractAddress)

  // Load projects function that returns properly formatted data
  const loadProjects = useCallback(async (): Promise<EnhancedProject[]> => {
    if (!contractAddress || !allProjectsData) {
      return []
    }

    try {
      const enhancedProjects: EnhancedProject[] = allProjectsData.map((projectDetails) => {
        const { project, metadata, contracts } = projectDetails
        
        // Parse additional metadata if available
        let parsedMetadata = { ...metadata }
        try {
          if (metadata.additionalData) {
            const additionalData = JSON.parse(metadata.additionalData)
            parsedMetadata = { ...parsedMetadata, ...additionalData }
          }
        } catch (e) {
          console.warn('Failed to parse additional metadata for project', project.id, e)
        }

        // Parse contractInfo if it's JSON
        try {
          if (metadata.contractInfo) {
            const contractInfo = JSON.parse(metadata.contractInfo)
            parsedMetadata = { ...parsedMetadata, ...contractInfo }
          }
        } catch (e) {
          console.warn('Failed to parse contract info for project', project.id, e)
        }

        return {
          id: Number(project.id),
          owner: project.owner,
          name: project.name,
          description: project.description,
          transferrable: project.transferrable,
          active: project.active,
          createdAt: project.createdAt,
          campaignIds: project.campaignIds,
          metadata: parsedMetadata,
          contracts: contracts
        }
      })

      return enhancedProjects
    } catch (error) {
      console.error('Error processing projects data:', error)
      return []
    }
  }, [contractAddress, allProjectsData])

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

  const isLoading = countLoading || projectsLoading
  const error = countError || projectsError

  return {
    isInitialized,
    loadProjects,
    formatTokenAmount,
    projectCount: projectCount ? Number(projectCount) : 0,
    isLoadingCount: countLoading,
    isLoading,
    error
  }
}

// Hook for reading project participation in a campaign
export function useProjectParticipation(contractAddress: Address, campaignId: bigint, projectId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi: abi, // Make sure you import the abi
    functionName: 'getParticipation',
    args: [campaignId, projectId],
    query: {
      enabled: !!contractAddress && campaignId !== undefined && projectId !== undefined
    }
  });

  return {
    participation: data ? {
      approved: (data as any[])[0],
      voteCount: (data as any[])[1],
      fundsReceived: (data as any[])[2]
    } : null,
    isLoading,
    error,
    refetch
  };
}

// Hook for reading project token votes
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
    args: [campaignId, projectId, token]
  })

  return {
    tokenVotes: data as bigint,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading project voted tokens with amounts
export function useProjectVotedTokensWithAmounts(
  contractAddress: Address,
  campaignId: bigint,
  projectId: bigint
) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getProjectVotedTokensWithAmounts',
    args: [campaignId, projectId]
  })

  const tokenData = data ? {
    tokens: (data as any[])[0] as Address[],
    amounts: (data as any[])[1] as bigint[]
  } : null

  return {
    tokenData,
    isLoading,
    error,
    refetch
  }
}

// Utility hook for project fee amounts
export function useProjectFees(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: [
      {
        address: contractAddress,
        abi,
        functionName: 'projectAdditionFee'
      }
    ]
  })

  return {
    projectAdditionFee: data?.[0]?.result ?? 0n,
    projectAdditionFeeFormatted: data?.[0]?.result ? formatEther(data[0].result as bigint) : '0',
    isLoading,
    error,
    refetch
  }
}

// Helper function to parse JSON metadata safely
export function parseProjectMetadata(jsonString: string) {
  try {
    return JSON.parse(jsonString)
  } catch (error) {
    console.warn('Failed to parse project metadata JSON:', error)
    return {}
  }
}

// Helper function to format project for display
export function formatProjectForDisplay(projectDetails: ProjectDetails) {
  if (!projectDetails) {
    return null;
  }

  const { project, metadata } = projectDetails;
  
  try {
    // Parse the bio data to extract location and other fields
    const bioData = parseProjectMetadata(metadata.bio || '{}');
    const contractInfo = parseProjectMetadata(metadata.contractInfo || '{}');
    const additionalData = parseProjectMetadata(metadata.additionalData || '{}');
    
    const formatted = {
      ...project,
      ...metadata,
      // Extract location from bio data
      location: bioData.location || '',
      // Parse all metadata fields
      additionalDataParsed: additionalData,
      bioDataParsed: bioData,
      contractInfoParsed: contractInfo,
      campaignCount: project.campaignIds.length,
      createdAtDate: new Date(Number(project.createdAt) * 1000),
      isTransferrable: project.transferrable,
      isActive: project.active
    };

    return formatted;
  } catch (error) {
    console.error('Error formatting project:', error);
    return null;
  }
}

// Hook for getting projects filtered by campaign ID
export function useCampaignProjects(contractAddress: Address, campaignId: bigint) {
  const { projects: allProjects, isLoading, error } = useAllProjects(contractAddress);

  const campaignProjects = useMemo(() => {
    return allProjects?.filter(projectDetails => {
      const formatted = formatProjectForDisplay(projectDetails);
      return formatted && projectDetails.project.campaignIds.some(cId => 
        Number(cId) === Number(campaignId)
      );
    }).map(formatProjectForDisplay).filter(Boolean) || [];
  }, [allProjects, campaignId]);

  return {
    campaignProjects,
    isLoading,
    error
  };
}

export default {
  useCreateProject,
  useUpdateProject,
  useUpdateProjectMetadata,
  useTransferProjectOwnership,
  useAddProjectToCampaign,
  useCanBypassFees,
  useRemoveProjectFromCampaign,
  useProject,
  useProjectMetadata,
  useProjectDetails,
  useProjectParticipations,
  useProjectCount,
  useProjects,
  useAllProjects,
  useProjectParticipation,
  useProjectTokenVotes,
  useProjectVotedTokensWithAmounts,
  useProjectFees,
  parseProjectMetadata,
  formatProjectForDisplay,
  useCampaignProjects
}