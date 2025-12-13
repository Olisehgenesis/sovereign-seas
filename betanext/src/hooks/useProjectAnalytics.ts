import { useMemo, useEffect, useState } from 'react'
import { formatEther, type Address, parseEventLogs } from 'viem'
import { useReadContracts, usePublicClient } from 'wagmi'
import { useAllProjects } from './useProjectMethods'
import { useAllCampaigns } from './useCampaignMethods'
import { contractABI } from '@/abi/seas4ABI'
import { getMainContractAddress } from '@/utils/contractConfig'
import { useDuneAnalytics, type DuneProjectAnalytics } from './useDuneAnalytics'

export interface ProjectAnalytics {
  projectId: bigint
  projectName: string
  totalVotes: bigint // Total money (CELO equivalent) placed on this project across all campaigns
  totalPayout: bigint // Total funds received across all campaigns
  uniqueVoters: number // Number of unique addresses that voted for this project (estimated)
  campaignCount: number // Number of campaigns this project participated in
}

export interface TopProjectsAnalytics {
  topByVotes: ProjectAnalytics[]
  topByUniqueVoters: ProjectAnalytics[]
  topByPayout: ProjectAnalytics[]
  isLoading: boolean
  error: Error | null
}

/**
 * Hook to fetch unique voters from VoteCast events
 * This queries blockchain events to get accurate unique voter counts
 */
function useUniqueVoters(projectIds: bigint[]) {
  const contractAddress = getMainContractAddress()
  const publicClient = usePublicClient()
  const [uniqueVotersMap, setUniqueVotersMap] = useState<Map<string, Set<string>>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!publicClient || projectIds.length === 0) return

    const fetchUniqueVoters = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const votersMap = new Map<string, Set<string>>()
        
        // Initialize map for all projects
        projectIds.forEach(projectId => {
          votersMap.set(projectId.toString(), new Set<string>())
        })

        // Fetch VoteCast events for all projects
        // Note: This fetches all VoteCast events. For better performance with many events,
        // consider: 1) Caching results, 2) Using a subgraph, or 3) Querying per project
        // Since projectId is indexed, we could optimize by querying per project in batches
        const rawLogs = await publicClient.getLogs({
          address: contractAddress,
          event: {
            type: 'event',
            name: 'VoteCast',
            inputs: [
              { indexed: true, name: 'voter', type: 'address' },
              { indexed: true, name: 'campaignId', type: 'uint256' },
              { indexed: true, name: 'projectId', type: 'uint256' },
              { indexed: false, name: 'token', type: 'address' },
              { indexed: false, name: 'amount', type: 'uint256' },
              { indexed: false, name: 'celoEquivalent', type: 'uint256' }
            ]
          },
          fromBlock: 0n,
          toBlock: 'latest'
        } as any)

        // Parse event logs to get typed event data
        const parsedLogs = parseEventLogs({
          abi: contractABI,
          logs: rawLogs,
          eventName: 'VoteCast'
        }) as any

        // Process logs to count unique voters per project
        parsedLogs.forEach((log: any) => {
          if (log.args?.projectId !== undefined && log.args?.voter) {
            const projectId = log.args.projectId.toString()
            const voter = log.args.voter.toLowerCase()
            
            if (votersMap.has(projectId)) {
              votersMap.get(projectId)!.add(voter)
            }
          }
        })

        setUniqueVotersMap(votersMap)
      } catch (err) {
        console.error('Error fetching unique voters:', err)
        setError(err instanceof Error ? err : new Error('Failed to fetch unique voters'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchUniqueVoters()
  }, [publicClient, contractAddress, projectIds.join(',')])

  return { uniqueVotersMap, isLoading, error }
}

/**
 * Hook to get analytics for all projects
 * Aggregates data across all campaigns to provide:
 * - Top 5 projects by total votes (money placed)
 * - Top 5 projects by unique voters (from VoteCast events)
 * - Top 5 projects by total payout
 */
export function useProjectAnalytics() {
  const contractAddress = getMainContractAddress()
  
  // Get all projects
  const { projects: allProjects, isLoading: projectsLoading, error: projectsError } = useAllProjects(contractAddress)
  
  // Get all campaigns
  const { campaigns: allCampaigns, isLoading: campaignsLoading, error: campaignsError } = useAllCampaigns(contractAddress)
  
  // Fetch Dune analytics data (votes and unique voters)
  const { data: duneData, isLoading: duneLoading, error: duneError } = useDuneAnalytics()
  
  // Get project IDs for unique voter fetching (fallback if Dune fails)
  const projectIds = useMemo(() => {
    return allProjects?.map(p => p.project.id) || []
  }, [allProjects])
  
  // Fetch unique voters from events (fallback if Dune fails)
  const { uniqueVotersMap, isLoading: votersLoading, error: votersError } = useUniqueVoters(projectIds)
  
  // Build contracts to fetch participation data for all project-campaign combinations
  const participationContracts = useMemo(() => {
    if (!allProjects || !allCampaigns) return []
    
    const contracts: Array<{
      address: Address
      abi: typeof contractABI
      functionName: 'getParticipation'
      args: readonly [bigint, bigint]
    }> = []
    
    // For each project, get participation data for all campaigns it's in
    allProjects.forEach(projectDetails => {
      const projectId = projectDetails.project.id
      projectDetails.project.campaignIds.forEach(campaignId => {
        contracts.push({
          address: contractAddress,
          abi: contractABI as any,
          functionName: 'getParticipation' as const,
          args: [campaignId, projectId] as const
        })
      })
    })
    
    return contracts
  }, [allProjects, allCampaigns, contractAddress])
  
  // Fetch all participation data
  const { data: participationData, isLoading: participationLoading, error: participationError } = useReadContracts({
    contracts: participationContracts as any,
    query: {
      enabled: participationContracts.length > 0,
      retry: 2,
      staleTime: 30000 // Cache for 30 seconds
    }
  })
  
  // Process analytics data
  const analyticsData = useMemo(() => {
    if (!allProjects || !allCampaigns) {
      return {
        topByVotes: [],
        topByUniqueVoters: [],
        topByPayout: [],
        isLoading: projectsLoading || campaignsLoading || participationLoading,
        error: projectsError || campaignsError || participationError
      } as TopProjectsAnalytics
    }
    
    // Initialize analytics map
    const projectAnalyticsMap = new Map<string, {
      projectId: bigint
      projectName: string
      totalVotes: bigint
      totalPayout: bigint
      uniqueVoters: Set<string>
      campaignCount: number
    }>()
    
    // Initialize map with all projects
    allProjects.forEach(projectDetails => {
      const projectId = projectDetails.project.id
      const key = projectId.toString()
      projectAnalyticsMap.set(key, {
        projectId,
        projectName: projectDetails.project.name,
        totalVotes: 0n,
        totalPayout: 0n,
        uniqueVoters: new Set<string>(),
        campaignCount: projectDetails.project.campaignIds.length
      })
    })
    
    // Create a map to store Dune unique voter counts
    const duneVotersCountMap = new Map<string, number>()
    
    // Merge Dune data (votes and unique voters) with project data
    if (duneData && duneData.length > 0) {
      duneData.forEach((duneItem: DuneProjectAnalytics) => {
        const key = duneItem.project_id.toString()
        const analytics = projectAnalyticsMap.get(key)
        
        if (analytics) {
          // Use Dune data for votes (more accurate)
          analytics.totalVotes = BigInt(Math.floor(duneItem.total_votes_celo * 1e18))
          // Store unique voter count for later use
          duneVotersCountMap.set(key, duneItem.unique_voters)
        }
      })
    }
    
    // Process participation data for payouts (still from contract)
    if (participationData && allProjects) {
      let contractIndex = 0
      
      allProjects.forEach(projectDetails => {
        const projectId = projectDetails.project.id
        
        projectDetails.project.campaignIds.forEach(campaignId => {
          const result = participationData[contractIndex]?.result as [boolean, bigint, bigint] | undefined
          
          if (result) {
            const [approved, voteCount, fundsReceived] = result
            const key = projectId.toString()
            const analytics = projectAnalyticsMap.get(key)
            
            if (analytics && approved) {
              // Only update votes if Dune data not available
              if (!duneData || duneData.length === 0) {
                analytics.totalVotes += voteCount
              }
              
              // Always use contract data for payouts
              analytics.totalPayout += fundsReceived
              
              // Get unique voters from events map if Dune data not available
              if (!duneData || duneData.length === 0) {
                const projectVoters = uniqueVotersMap.get(projectId.toString())
                if (projectVoters) {
                  projectVoters.forEach(voter => analytics.uniqueVoters.add(voter))
                }
              }
            }
          }
          
          contractIndex++
        })
      })
    }
    
    // Convert map to array
    const allAnalytics: ProjectAnalytics[] = Array.from(projectAnalyticsMap.values()).map(analytics => {
      const key = analytics.projectId.toString()
      // Use Dune unique voter count if available, otherwise use events count
      const uniqueVotersCount = duneVotersCountMap.get(key) ?? analytics.uniqueVoters.size
      
      return {
        projectId: analytics.projectId,
        projectName: analytics.projectName,
        totalVotes: analytics.totalVotes,
        totalPayout: analytics.totalPayout,
        uniqueVoters: uniqueVotersCount,
        campaignCount: analytics.campaignCount
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
        isLoading: projectsLoading || campaignsLoading || participationLoading || votersLoading || duneLoading,
        error: projectsError || campaignsError || participationError || votersError || duneError
    } as TopProjectsAnalytics
  }, [
    allProjects, 
    allCampaigns, 
    participationData,
    uniqueVotersMap,
    duneData,
    projectsLoading, 
    campaignsLoading, 
    participationLoading,
    votersLoading,
    duneLoading,
    projectsError, 
    campaignsError, 
    participationError,
    votersError,
    duneError
  ])
  
  return analyticsData
}

