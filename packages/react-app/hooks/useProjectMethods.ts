import { useWriteContract, useReadContract, useReadContracts } from 'wagmi'
import { parseEther, formatEther, Address, type Abi, type AbiFunction } from 'viem'
import { contractABI as abi } from '../abis/contractABI' 
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
const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_V4;

// Hook for creating a new project
export function useCreateProject() {
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
        address: contractAddress as Address,
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

// Hook for updating project details
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
        address: contractAddress as Address,
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
        address: contractAddress as Address,
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
        address: contractAddress as Address,
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
        address: contractAddress as Address,
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
        address: contractAddress as Address,
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

// Hook for reading a single project's basic details
export function useProject(contractAddress: Address, projectId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress as Address,
    abi,
    functionName: 'getProject',
    args: [projectId]
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

// Hook for reading project metadata
export function useProjectMetadata(contractAddress: Address, projectId: bigint) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress as Address,
    abi,
    functionName: 'getProjectMetadata',
    args: [projectId]
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
        address: contractAddress as Address,
        abi,
        functionName: 'getProject',
        args: [projectId]
      },
      {
        address: contractAddress as Address,
        abi,
        functionName: 'getProjectMetadata',
        args: [projectId]
      }
    ]
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

// Hook for reading project count
export function useProjectCount(contractAddress: Address) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress as Address,
    abi,
    functionName: 'getProjectCount'
  })

  return {
    projectCount: data as bigint,
    isLoading,
    error,
    refetch
  }
}

// Hook for reading multiple projects at once
export function useProjects(contractAddress: Address, projectIds: bigint[]) {
  const contracts = projectIds.flatMap(id => [
    {
      address: contractAddress as Address,
      abi,
      functionName: 'getProject',
      args: [id]
    },
    {
      address: contractAddress as Address,
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
    }[]
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

// Hook for reading project participation in a campaign
export function useProjectParticipation(
  contractAddress: Address, 
  campaignId: bigint, 
  projectId: bigint
) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress as Address,
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
    address: contractAddress as Address,
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
    address: contractAddress as Address,
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
        address: contractAddress as Address ,
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