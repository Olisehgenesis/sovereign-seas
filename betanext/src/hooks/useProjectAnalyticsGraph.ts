import { useMemo, useEffect, useState } from 'react'
import { formatEther, type Address } from 'viem'
import { useReadContracts } from 'wagmi'
import { useAllProjects } from './useProjectMethods'
import { useAllCampaigns } from './useCampaignMethods'
import { contractABI } from '@/abi/seas4ABI'
import { getMainContractAddress } from '@/utils/contractConfig'

export interface ProjectAnalytics {
  projectId: bigint
  projectName: string
  totalVotes: bigint
  totalPayout: bigint
  uniqueVoters: number
  campaignCount: number
}

export interface TopProjectsAnalytics {
  topByVotes: ProjectAnalytics[]
  topByUniqueVoters: ProjectAnalytics[]
  topByPayout: ProjectAnalytics[]
  isLoading: boolean
  error: Error | null
}

/**
 * GraphQL query to get project vote stats from The Graph
 * Replace SUBGRAPH_URL with your deployed subgraph URL
 */
const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL || ''

const GET_PROJECT_STATS_QUERY = `
  query GetProjectStats {
    projectVoteStats(
      orderBy: totalVotes
      orderDirection: desc
      first: 100
    ) {
      id
      projectId
      totalVotes
      totalPayout
      uniqueVoterCount
      voteCount
    }
  }
`

/**
 * Hook to fetch analytics data from The Graph subgraph
 * This is more efficient than querying events directly - no RPC limits!
 */
export function useProjectAnalyticsGraph() {
  const { getMainContractAddress } = require('@/utils/contractConfig')
  const contractAddress = getMainContractAddress()
  
  // Get all projects for names
  const { projects: allProjects, isLoading: projectsLoading, error: projectsError } = useAllProjects(contractAddress)
  
  // Get all campaigns
  const { campaigns: allCampaigns, isLoading: campaignsLoading, error: campaignsError } = useAllCampaigns(contractAddress)
  
  // Fetch data from The Graph
  const [graphData, setGraphData] = useState<any>(null)
  const [graphLoading, setGraphLoading] = useState(false)
  const [graphError, setGraphError] = useState<Error | null>(null)

  useEffect(() => {
    if (!SUBGRAPH_URL) {
      setGraphError(new Error('Subgraph URL not configured'))
      return
    }

    const fetchGraphData = async () => {
      setGraphLoading(true)
      setGraphError(null)
      
      try {
        const response = await fetch(SUBGRAPH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: GET_PROJECT_STATS_QUERY,
          }),
        })

        if (!response.ok) {
          throw new Error(`GraphQL request failed: ${response.statusText}`)
        }

        const result = await response.json()
        
        if (result.errors) {
          throw new Error(result.errors[0]?.message || 'GraphQL error')
        }

        setGraphData(result.data)
      } catch (err) {
        console.error('Error fetching from subgraph:', err)
        setGraphError(err instanceof Error ? err : new Error('Failed to fetch from subgraph'))
      } finally {
        setGraphLoading(false)
      }
    }

    fetchGraphData()
  }, [])

  // Process analytics data
  const analyticsData = useMemo(() => {
    if (!allProjects || !graphData?.projectVoteStats) {
      return {
        topByVotes: [],
        topByUniqueVoters: [],
        topByPayout: [],
        isLoading: projectsLoading || campaignsLoading || graphLoading,
        error: projectsError || campaignsError || graphError
      } as TopProjectsAnalytics
    }

    // Create map of project names
    const projectNameMap = new Map<string, string>()
    allProjects.forEach(projectDetails => {
      projectNameMap.set(projectDetails.project.id.toString(), projectDetails.project.name)
    })

    // Convert GraphQL data to analytics format
    const allAnalytics: ProjectAnalytics[] = graphData.projectVoteStats.map((stats: any) => {
      const projectId = BigInt(stats.projectId)
      const project = allProjects?.find(p => p.project.id === projectId)
      
      return {
        projectId,
        projectName: projectNameMap.get(stats.projectId) || `Project ${stats.projectId}`,
        totalVotes: BigInt(stats.totalVotes || '0'),
        totalPayout: BigInt(stats.totalPayout || '0'),
        uniqueVoters: Number(stats.uniqueVoterCount || '0'),
        campaignCount: project?.project.campaignIds.length || 0
      }
    })

    // Sort and get top 5
    const topByVotes = [...allAnalytics]
      .sort((a, b) => {
        if (a.totalVotes > b.totalVotes) return -1
        if (a.totalVotes < b.totalVotes) return 1
        return 0
      })
      .slice(0, 5)
      .filter(p => p.totalVotes > 0n)

    const topByUniqueVoters = [...allAnalytics]
      .sort((a, b) => {
        if (a.uniqueVoters > b.uniqueVoters) return -1
        if (a.uniqueVoters < b.uniqueVoters) return 1
        return 0
      })
      .slice(0, 5)
      .filter(p => p.uniqueVoters > 0)

    const topByPayout = [...allAnalytics]
      .sort((a, b) => {
        if (a.totalPayout > b.totalPayout) return -1
        if (a.totalPayout < b.totalPayout) return 1
        return 0
      })
      .slice(0, 5)
      .filter(p => p.totalPayout > 0n)

    return {
      topByVotes,
      topByUniqueVoters,
      topByPayout,
      isLoading: projectsLoading || campaignsLoading || graphLoading,
      error: projectsError || campaignsError || graphError
    } as TopProjectsAnalytics
  }, [
    allProjects,
    graphData,
    projectsLoading,
    campaignsLoading,
    graphLoading,
    projectsError,
    campaignsError,
    graphError
  ])

  return analyticsData
}

