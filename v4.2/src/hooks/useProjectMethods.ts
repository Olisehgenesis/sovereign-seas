import { useWriteContract, useReadContract, useReadContracts } from 'wagmi'
import { parseEther, formatEther, Address, type Abi, type AbiFunction } from 'viem'
import { contractABI as abi } from '@/abi/seas4ABI'
import { useState, useEffect, useCallback } from 'react'

// Types for better TypeScript support
export interface ProjectMetadata {
  bio: string
  contractInfo: string
  additionalData: string
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

// Hook for creating a new project
export function useCreateProject(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

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
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'createProject',
        args: [
          name,
          description,
          bio,
          contractInfo,
          additionalData,
          contracts,
          transferrable
        ]
      })
    } catch (err) {
      console.error('Error creating project:', err)
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
    id: data[0],
    owner: data[1],
    name: data[2],
    description: data[3],
    transferrable: data[4],
    active: data[5],
    createdAt: data[6],
    campaignIds: data[7]
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

// Hook for adding project to campaign
export function useAddProjectToCampaign(contractAddress: Address) {
  const { writeContract, isPending, isError, error, isSuccess } = useWriteContract()

  const addProjectToCampaign = async ({
    campaignId,
    projectId,
    feeToken
  }: {
    campaignId: bigint
    projectId: bigint
    feeToken: Address
  }) => {
    try {
      await writeContract({
        address: contractAddress,
        abi,
        functionName: 'addProjectToCampaign',
        args: [campaignId, projectId, feeToken]
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

  const campaignIds = projectData ? projectData[7] as bigint[] : []

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
    contracts: [...campaignContracts, ...participationContracts] as readonly {
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
    const campaignResult = campaignsData?.[index]?.result
    const participationResult = campaignsData?.[index + campaignIds.length]?.result

    if (!campaignResult || !participationResult) return null

    const campaign = {
      id: campaignResult[0],
      admin: campaignResult[1],
      name: campaignResult[2],
      description: campaignResult[3],
      startTime: campaignResult[4],
      endTime: campaignResult[5],
      adminFeePercentage: campaignResult[6],
      maxWinners: campaignResult[7],
      useQuadraticDistribution: campaignResult[8],
      useCustomDistribution: campaignResult[9],
      payoutToken: campaignResult[10],
      active: campaignResult[11],
      totalFunds: campaignResult[12]
    }

    const participation = {
      approved: participationResult[0],
      voteCount: participationResult[1],
      fundsReceived: participationResult[2]
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
    bio: data[0],
    contractInfo: data[1],
    additionalData: data[2],
    contracts: data[3]
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
      id: data[0].result[0],
      owner: data[0].result[1],
      name: data[0].result[2],
      description: data[0].result[3],
      transferrable: data[0].result[4],
      active: data[0].result[5],
      createdAt: data[0].result[6],
      campaignIds: data[0].result[7]
    },
    metadata: {
      bio: data[1].result[0],
      contractInfo: data[1].result[1],
      additionalData: data[1].result[2]
    },
    contracts: data[1].result[3]
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
            id: data[basicIndex].result[0],
            owner: data[basicIndex].result[1],
            name: data[basicIndex].result[2],
            description: data[basicIndex].result[3],
            transferrable: data[basicIndex].result[4],
            active: data[basicIndex].result[5],
            createdAt: data[basicIndex].result[6],
            campaignIds: data[basicIndex].result[7]
          },
          metadata: {
            bio: data[metadataIndex].result[0],
            contractInfo: data[metadataIndex].result[1],
            additionalData: data[metadataIndex].result[2]
          },
          contracts: data[metadataIndex].result[3]
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
export function useProject(contractAddress: Address, projectId?: string | number) {
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
      const enhancedProjects: EnhancedProject[] = allProjectsData.map((projectDetails, index) => {
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
export function useProjectParticipation(
  contractAddress: Address, 
  campaignId: bigint, 
  projectId: bigint
) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getParticipation',
    args: [campaignId, projectId]
  })

  const participation = data ? {
    approved: data[0],
    voteCount: data[1],
    fundsReceived: data[2]
  } : null

  return {
    participation,
    isLoading,
    error,
    refetch
  }
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
    tokens: data[0] as Address[],
    amounts: data[1] as bigint[]
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
  if (!projectDetails) return null

  const { project, metadata } = projectDetails
  
  return {
    ...project,
    ...metadata,
    additionalDataParsed: parseProjectMetadata(metadata.additionalData),
    campaignCount: project.campaignIds.length,
    createdAtDate: new Date(Number(project.createdAt) * 1000),
    isTransferrable: project.transferrable,
    isActive: project.active
  }
}

export default {
  useCreateProject,
  useUpdateProject,
  useUpdateProjectMetadata,
  useTransferProjectOwnership,
  useAddProjectToCampaign,
  useRemoveProjectFromCampaign,
  useProject,
  useProjectMetadata,
  useProjectDetails,
  useProjectCount,
  useProjects,
  useAllProjects,
  useProjectParticipation,
  useProjectTokenVotes,
  useProjectVotedTokensWithAmounts,
  useProjectFees,
  parseProjectMetadata,
  formatProjectForDisplay
}