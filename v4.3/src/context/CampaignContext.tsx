import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { Address, formatEther } from 'viem';
import { 
  useCampaignDetails, 
  useAllProjects, 
  useIsCampaignAdmin, 
  useCampaignTokenAmount, 
  useUserTotalVotesInCampaign, 
  useVote, 
  useSortedProjects, 
  useCanBypassFees, 
  useApproveProject,
  useParticipation,
  formatProjectForDisplay
} from '@/hooks/useCampaignMethods';
import { useAllProjects as fetchAllProjects } from '@/hooks/useProjectMethods';

interface Project {
  voteCount: bigint;
  voteCountFormatted: string;
  participation: { approved: boolean; voteCount: bigint; fundsReceived: bigint; } | null;
  additionalDataParsed?: any;
  campaignCount?: number;
  verified?: boolean;
  name?: string;
  id?: string | number | bigint;
  description?: string;
  location?: any;
  metadata?: any;
}

interface CampaignContextType {
  // Campaign data
  campaignDetails: any;
  campaignLoading: boolean;
  campaignError: any;
  
  // Projects data
  allProjects: any[];
  projectsLoading: boolean;
  projectsError: any;
  
  // User data
  isAdmin: boolean;
  adminLoading: boolean;
  adminError: any;
  
  // Token amounts
  celoAmount: bigint;
  cusdAmount: bigint;
  
  // Voting data
  totalVotes: bigint;
  vote: any;
  isVotePending: boolean;
  
  // Sorted projects
  sortedProjectIds: bigint[];
  sortedProjectsLoading: boolean;
  sortedProjectsError: any;
  
  // Project management
  canBypassFees: boolean;
  approveProject: any;
  isApprovingProject: boolean;
  
  // Processed data
  campaignProjects: Project[];
  sortedProjects: Project[];
  approvedProjectIds: Set<string>;
  
  // Vote counts state
  projectVoteCounts: Map<string, bigint>;
  updateProjectVoteCount: (projectId: string, voteCount: bigint) => void;
  
  // Refetch functions
  refetchAllData: () => Promise<void>;
  refetchSorted: () => void;
  
  // Campaign status
  campaignStatus: {
    hasStarted: boolean;
    hasEnded: boolean;
    isActive: boolean;
    startTime: number;
    endTime: number;
  };
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

interface CampaignProviderProps {
  children: ReactNode;
  campaignId: bigint;
}

export const CampaignProvider = ({ children, campaignId }: CampaignProviderProps) => {
  const { address, isConnected } = useAccount();
  
  // State for vote counts
  const [projectVoteCounts, setProjectVoteCounts] = useState<Map<string, bigint>>(new Map());
  
  const contractAddress = import.meta.env.VITE_CONTRACT_V4;
  const celoTokenAddress = import.meta.env.VITE_CELO_TOKEN;
  const cusdTokenAddress = import.meta.env.VITE_CUSD_TOKEN;
  
  // Campaign details
  const { campaignDetails, isLoading: campaignLoading, error: campaignError } = useCampaignDetails(
    contractAddress,
    campaignId
  );
  
  // All projects
  const { projects: allProjects, isLoading: projectsLoading, error: projectsError } = fetchAllProjects(contractAddress);
  
  // Admin check
  const { isAdmin, isLoading: adminLoading, error: adminError } = useIsCampaignAdmin(
    contractAddress, 
    campaignId, 
    address || '0x0000000000000000000000000000000000000000'
  );
  
  // Token amounts
  const { tokenAmount: celoAmount } = useCampaignTokenAmount(
    contractAddress,
    campaignId,
    celoTokenAddress
  );
  
  const { tokenAmount: cusdAmount } = useCampaignTokenAmount(
    contractAddress,
    campaignId,
    cusdTokenAddress
  );
  
  // Voting data
  const { totalVotes } = useUserTotalVotesInCampaign(
    contractAddress,
    campaignId,
    address || '0x0000000000000000000000000000000000000000'
  );
  
  const { vote, isPending: isVotePending } = useVote(contractAddress);
  
  // Sorted projects
  const { sortedProjectIds, isLoading: sortedProjectsLoading, error: sortedProjectsError, refetch: refetchSorted } = useSortedProjects(
    contractAddress,
    campaignId
  );
  
  // Project management
  const { isAdmin: canBypassFees } = useCanBypassFees(contractAddress, campaignId);
  const { approveProject, isPending: isApprovingProject } = useApproveProject(contractAddress);
  
  // Create a Set of approved project IDs for O(1) lookup
  const approvedProjectIds = useMemo(() => {
    return new Set(sortedProjectIds.map(id => id.toString()));
  }, [sortedProjectIds]);
  
  // Update function for vote counts
  const updateProjectVoteCount = useCallback((projectId: string, voteCount: bigint) => {
    setProjectVoteCounts(prev => {
      const newMap = new Map(prev);
      newMap.set(projectId, voteCount);
      return newMap;
    });
  }, []);
  
  // Data processing logic
  const campaignProjectsBasic = useMemo(() => {
    const filtered = allProjects?.filter(projectDetails => {
      const formatted = formatProjectForDisplay(projectDetails);
      const hasCampaign = projectDetails.project.campaignIds.some(cId => Number(cId) === Number(campaignId));
      return formatted && hasCampaign;
    }).map(formatProjectForDisplay).filter(Boolean) || [];
    
    return filtered;
  }, [allProjects, campaignId]);
  
  const projectIds = useMemo(() => {
    const ids = campaignProjectsBasic
      .filter((project): project is NonNullable<typeof project> => project != null && project.id !== undefined)
      .map(project => BigInt(project.id));
    
    return ids;
  }, [campaignProjectsBasic]);
  
  // Processed campaign projects
  const campaignProjects = useMemo(() => {
    if (!campaignProjectsBasic.length) {
      return [];
    }
    
    // Create a mapping of projectId -> participationData index
    const projectIdToParticipationIndex = new Map();
    projectIds.forEach((projectId, index) => {
      projectIdToParticipationIndex.set(projectId.toString(), index);
    });
    
    const projects = campaignProjectsBasic.map((project) => {
      const projectIdStr = project.id?.toString();
      
      // Get approval status from sortedProjectIds (the authoritative source)
      const isApproved = approvedProjectIds.has(projectIdStr || '');
      
      // Get vote count from centralized state
      const voteCount = projectIdStr ? projectVoteCounts.get(projectIdStr) || 0n : 0n;
      
      return {
        ...project,
        voteCount,
        voteCountFormatted: formatEther(voteCount),
        participation: {
          approved: isApproved,
          voteCount: voteCount,
          fundsReceived: 0n // This would need to be fetched separately if needed
        }
      };
    });
    
    return projects;
  }, [campaignProjectsBasic, approvedProjectIds, projectVoteCounts]);
  
  // Sorted projects
  const sortedProjects = useMemo(() => {
    // Sort all projects by vote count (descending)
    const sorted = [...campaignProjects].sort((a, b) => {
      const aVotes = a.voteCount || 0n;
      const bVotes = b.voteCount || 0n;
      
      // Convert to number for comparison (safe for vote counts)
      const aVotesNum = Number(formatEther(aVotes));
      const bVotesNum = Number(formatEther(bVotes));
      
      return bVotesNum - aVotesNum; // Descending order
    });
    
    return sorted;
  }, [campaignProjects]);
  
  // Campaign status
  const campaignStatus = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    const startTime = Number(campaignDetails?.campaign?.startTime || 0);
    const endTime = Number(campaignDetails?.campaign?.endTime || 0);
    const hasStarted = now >= startTime;
    const hasEnded = now >= endTime;
    const isActive = hasStarted && !hasEnded && campaignDetails?.campaign?.active;
    
    return {
      hasStarted,
      hasEnded,
      isActive,
      startTime,
      endTime
    };
  }, [campaignDetails]);
  
  // Refetch function
  const refetchAllData = useCallback(async () => {
    await Promise.all([
      refetchSorted()
    ]);
  }, [refetchSorted]);
  
  const contextValue: CampaignContextType = {
    // Campaign data
    campaignDetails,
    campaignLoading,
    campaignError,
    
    // Projects data
    allProjects,
    projectsLoading,
    projectsError,
    
    // User data
    isAdmin,
    adminLoading,
    adminError,
    
    // Token amounts
    celoAmount: celoAmount || 0n,
    cusdAmount: cusdAmount || 0n,
    
    // Voting data
    totalVotes: totalVotes || 0n,
    vote,
    isVotePending,
    
    // Sorted projects
    sortedProjectIds,
    sortedProjectsLoading,
    sortedProjectsError,
    
    // Project management
    canBypassFees,
    approveProject,
    isApprovingProject,
    
    // Processed data
    campaignProjects,
    sortedProjects,
    approvedProjectIds,
    
    // Vote counts state
    projectVoteCounts,
    updateProjectVoteCount,
    
    // Refetch functions
    refetchAllData,
    refetchSorted,
    
    // Campaign status
    campaignStatus
  };
  
  return (
    <CampaignContext.Provider value={contextValue}>
      {children}
    </CampaignContext.Provider>
  );
};

// Custom hook to use the CampaignContext
export const useCampaignContext = () => {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error('useCampaignContext must be used within a CampaignProvider');
  }
  return context;
}; 