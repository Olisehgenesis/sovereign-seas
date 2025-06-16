// @ts-nocheck

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount, useReadContracts } from 'wagmi';
import { formatEther, Address } from 'viem';
import { 
  ArrowLeft, 
  Trophy, 
  Sparkles, 
  Zap, 
  Target,
  Crown,
  Rocket,
  Medal,
  Heart,
  Users,
  Clock,
  Eye,
  Vote,
  Coins,
  BarChart3,
  Award,
  DollarSign,
  Percent,
  Menu,
  Timer,
  Waves,
  Plus,
  CheckCircle,
  XCircle,
  X,
  Loader2,
  Search,
  Settings,
  Shield,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Calculator
} from 'lucide-react';
import { type AbiFunction } from 'viem';

import { useCampaignDetails, useApproveProject, useAddCampaignAdmin, useDistributeFunds, useIsCampaignAdmin, useSortedProjects, useParticipation } from '@/hooks/useCampaignMethods';
import VoteModal from '@/components/voteModal';
import { getProjectVotesByCampaignId } from './voteutils';
import { useAllProjects, formatProjectForDisplay, useAddProjectToCampaign, useCanBypassFees } from '@/hooks/useProjectMethods';
import {
  useVote,
  useUserTotalVotesInCampaign,
  useCampaignTokenAmount,
} from '@/hooks/useVotingMethods';
import { formatIpfsUrl } from '@/utils/imageUtils';

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
}

// Enhanced countdown timer hook that handles "preparing" state
function useCountdown(startTime: number, endTime: number) {
  const [timeLeft, setTimeLeft] = useState({ 
    days: 0, 
    hours: 0, 
    minutes: 0, 
    seconds: 0,
    phase: 'loading' as 'preparing' | 'active' | 'ended' | 'loading'
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      
      if (now < startTime) {
        // Campaign hasn't started yet - show countdown to start
        const difference = startTime - now;
        setTimeLeft({
          days: Math.floor(difference / 86400),
          hours: Math.floor((difference % 86400) / 3600),
          minutes: Math.floor((difference % 3600) / 60),
          seconds: difference % 60,
          phase: 'preparing'
        });
      } else if (now >= startTime && now <= endTime) {
        // Campaign is active - show countdown to end
        const difference = endTime - now;
        setTimeLeft({
          days: Math.floor(difference / 86400),
          hours: Math.floor((difference % 86400) / 3600),
          minutes: Math.floor((difference % 3600) / 60),
          seconds: difference % 60,
          phase: 'active'
        });
      } else {
        // Campaign has ended
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          phase: 'ended'
        });
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, endTime]);

  return timeLeft;
}

// New hook to check if user is campaign admin
function useIsCampaignAdminCheck(contractAddress: Address, campaignId: bigint, userAddress?: Address) {
  const { data, isLoading, error } = useReadContracts({
    contracts: [
      {
        address: contractAddress,
        abi: [{
          inputs: [{ name: 'campaignId', type: 'uint256' }, { name: 'admin', type: 'address' }],
          name: 'isCampaignAdmin',
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'view',
          type: 'function'
        } satisfies AbiFunction],
        functionName: 'isCampaignAdmin',
        args: [campaignId, userAddress || '0x0000000000000000000000000000000000000000']
      }
    ],
    query: {
      enabled: !!contractAddress && !!campaignId && !!userAddress
    }
  });

  return {
    isAdmin: data?.[0]?.result as boolean || false,
    isLoading,
    error
  };
}

// Update ProjectVotes component to handle undefined data better
function ProjectVotes({ 
  campaignId, 
  projectId, 
  onVoteCountReceived 
}: { 
  campaignId: bigint; 
  projectId: bigint; 
  onVoteCountReceived?: (projectId: string, voteCount: bigint) => void;
}) {
  const contractAddress = import.meta.env.VITE_CONTRACT_V4;
  
  // Create unique key for this project's participation data
  const participationKey = `participation-${campaignId.toString()}-${projectId.toString()}`;
  
  // Ensure we're working with bigint values
  const campaignIdBigInt = BigInt(campaignId);
  const projectIdBigInt = BigInt(projectId);

  const { participation, isLoading, error } = useParticipation(
    contractAddress, 
    campaignIdBigInt, 
    projectIdBigInt,
    { 
      cacheKey: participationKey,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      cacheTime: 5 * 60 * 1000,
      staleTime: 30 * 1000,
    }
  );

  // Memoize the vote count calculation
  const voteCount = useMemo(() => {
    if (!participation) return 0n;
    
    if (Array.isArray(participation)) {
      return participation[1];
    } else if (typeof participation === 'object') {
      return participation.voteCount || participation[1] || 0n;
    }
    return 0n;
  }, [participation]);

  // Add effect to report vote count changes only when voteCount changes
  useEffect(() => {
    if (onVoteCountReceived && voteCount !== undefined) {
      onVoteCountReceived(projectId.toString(), voteCount);
    }
  }, [voteCount, projectId, onVoteCountReceived]);

  if (isLoading) {
    return (
      <div className="text-lg font-bold text-gray-600">
        <Loader2 className="h-5 w-5 animate-spin inline" />
      </div>
    );
  }

  if (error) {
    console.error('Error fetching participation for', participationKey, ':', error);
    return <div className="text-lg font-bold text-red-600">Error</div>;
  }

  if (!participation) {
    console.warn('No participation data received for', participationKey);
    return <div className="text-lg font-bold text-gray-600">0.0</div>;
  }

  try {
    if (typeof voteCount !== 'bigint') {
      console.error('Invalid vote count type for', participationKey, ':', typeof voteCount);
      return <div className="text-lg font-bold text-red-600">Invalid Type</div>;
    }

    const formattedVotes = Number(formatEther(voteCount)).toFixed(1);
    return (
      <div className="relative group flex flex-col items-center">
        <div className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 group-hover:from-blue-500 group-hover:to-indigo-500 transition-all duration-300 tracking-tight">
          {formattedVotes}
        </div>
        <div className="text-sm font-medium text-gray-500 mt-1">votes</div>
        <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg opacity-0 group-hover:opacity-100 blur-sm transition-all duration-300 -z-10"></div>
      </div>
    );
  } catch (error) {
    console.error('Error processing participation data for', participationKey, ':', error);
    return <div className="text-lg font-bold text-gray-600">0.0</div>;
  }
}

export default function CampaignView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { address, isConnected } = useAccount();
  
  // Move state declarations to the top
  const [isMounted, setIsMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projectVoteCounts, setProjectVoteCounts] = useState<Map<string, bigint>>(new Map());
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'approved' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [expandedDescription, setExpandedDescription] = useState(false);
  
  // Add update function for vote counts
  const updateProjectVoteCount = useCallback((projectId: string, voteCount: bigint) => {
    setProjectVoteCounts(prev => {
      const newMap = new Map(prev);
      newMap.set(projectId, voteCount);
      return newMap;
    });
  }, []); // Empty dependency array since it only uses setState

  const contractAddress = import.meta.env.VITE_CONTRACT_V4;
  const campaignId = id ? BigInt(id) : BigInt(0);
  
  // FIXED: Always call all hooks in the same order - moved to top level
  const { campaignDetails, isLoading: campaignLoading } = useCampaignDetails(
    contractAddress,
    campaignId
  );
  
  const { projects: allProjects, isLoading: projectsLoading } = useAllProjects(contractAddress);
  
  // FIXED: Always call admin check hook regardless of conditions
  const { isAdmin, isLoading: adminLoading } = useIsCampaignAdminCheck(
    contractAddress, 
    campaignId, 
    address
  );
  
  // FIXED: Always call token amount hooks
  const celoTokenAddress = import.meta.env.VITE_CELO_TOKEN;
  const cusdTokenAddress = import.meta.env.VITE_CUSD_TOKEN;
  
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
  
  // FIXED: Always call voting hooks
  const { totalVotes } = useUserTotalVotesInCampaign(
    contractAddress,
    campaignId,
    address || '0x0000000000000000000000000000000000000000'
  );
  
  const { 
    vote, 
    isPending: isVotePending, 
  } = useVote(contractAddress);

  // FIXED: Always call sorted projects hook
  const { sortedProjectIds, isLoading: sortedProjectsLoading, refetch: refetchSorted } = useSortedProjects(
    contractAddress,
    campaignId
  );

  // FIXED: Always call project management hooks
  const { addProjectToCampaign, isPending: isAddingProject } = useAddProjectToCampaign(contractAddress);
  const { isAdmin: canBypassFees } = useCanBypassFees(contractAddress, campaignId);
  const { approveProject, isPending: isApprovingProject } = useApproveProject(contractAddress);

  // Create a Set of approved project IDs for O(1) lookup
  const approvedProjectIds = useMemo(() => {
    return new Set(sortedProjectIds.map(id => id.toString()));
  }, [sortedProjectIds]);

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

  // FIXED: Always create participation contracts, even if empty
  const participationContracts = useMemo(() => {
    if (projectIds.length === 0) {
      return [];
    }
    
    return projectIds.map(projectId => ({
      address: contractAddress as `0x${string}`,
      abi: [{
        inputs: [{ name: 'campaignId', type: 'uint250' }, { name: 'projectId', type: 'uint250' }],
        name: 'getParticipation',
        outputs: [{ name: '', type: 'tuple' }],
        stateMutability: 'view',
        type: 'function'
      } satisfies AbiFunction],
      functionName: 'getParticipation',
      args: [campaignId, projectId]
    }));
  }, [contractAddress, campaignId, projectIds]);

 
  // FIXED: Always call useReadContracts hook, but conditionally enable it
  const { data: participationData, isLoading: participationLoading, error: participationError, refetch: refetchParticipation } = useReadContracts({
    contracts: participationContracts,
    query: {
      enabled: !!contractAddress && !!campaignId && participationContracts.length > 0,
      retry: 3,
      retryDelay: 1000,
      staleTime: 0 // Always fetch fresh data
    }
  });

  

  // Add effect to log when participation data changes
  
  // FIXED: Updated campaignProjects to use correct vote count mapping
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
      
      // Get the correct participation data using project ID mapping
      const participationIndex = projectIdToParticipationIndex.get(projectIdStr);
      const participation = participationIndex !== undefined 
        ? participationData?.[participationIndex]?.result as [boolean, bigint, bigint] | undefined 
        : undefined;

      // Get approval status from sortedProjectIds (the authoritative source)
      const isApproved = approvedProjectIds.has(projectIdStr || '');
      
      // Get vote count from centralized state
      const voteCount = projectIdStr ? projectVoteCounts.get(projectIdStr) || 0n : 0n;
      const fundsReceived = participation ? participation[2] : 0n;
      
      return {
        ...project,
        voteCount,
        voteCountFormatted: formatEther(voteCount),
        participation: {
          approved: isApproved,
          voteCount: voteCount,
          fundsReceived: fundsReceived
        }
      };
    });

    return projects;
  }, [campaignProjectsBasic, participationData, projectIds, approvedProjectIds, projectVoteCounts]);

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


  // const sortedProjects = useMemo(() => {
  //   // Sort all projects by vote count (descending)
  //   const sorted = [...campaignProjects].sort((a, b) => {
  //     const aVotes = a.voteCount || 0n;
  //     const bVotes = b.voteCount || 0n;
  //     return aVotes > bVotes ? -1 : aVotes < bVotes ? 1 : 0;
  //   });

  //   return sorted;
  // }, [campaignProjects]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Campaign status and countdown - only calculate if campaign details exist
  const now = Math.floor(Date.now() / 1000);
  const startTime = Number(campaignDetails?.campaign?.startTime || 0);
  const endTime = Number(campaignDetails?.campaign?.endTime || 0);
  const hasStarted = now >= startTime;
  const hasEnded = now >= endTime;
  const isActive = hasStarted && !hasEnded && campaignDetails?.campaign?.active;
  
  // Use enhanced countdown hook
  const countdown = useCountdown(startTime, endTime);

  const handleVoteSuccess = async () => {
    // First set selectedProject to null to prevent re-rendering with old data
    setSelectedProject(null);
    // Then close the modal
    setShowVoteModal(false);
    // Wait for state updates to complete
    await new Promise(resolve => setTimeout(resolve, 300));
    // Finally refetch data
    await refetchAllData();
  };

  const closeVoteModal = () => {
    setShowVoteModal(false);
    // Clear selected project immediately to prevent re-rendering
    setSelectedProject(null);
  };

  const openVoteModal = (project: Project) => {
    setSelectedProject(project);
    setShowVoteModal(true);
  };

  const handleBackToArena = () => {
    navigate('/explore');
  };

  const handleAdminPanel = () => {
    navigate(`/app/campaign/manage/${id}`);
  };

  // Refetch function that updates both data sources
  const refetchAllData = useCallback(async () => {
   
    await Promise.all([
      refetchParticipation(),
      refetchSorted()
    ]);
   
  }, [refetchParticipation, refetchSorted]);

  const getPositionStyling = (index: number) => {
    switch (index) {
      case 0:
        return {
          bgGradient: 'from-yellow-400 via-yellow-500 to-amber-500',
          borderColor: 'border-yellow-400',
          shadowColor: 'shadow-yellow-500/30',
          iconColor: 'text-yellow-600',
          icon: Crown,
          badge: '👑',
          rank: '1st',
          glowColor: 'shadow-yellow-400/50'
        };
      case 1:
        return {
          bgGradient: 'from-gray-300 via-gray-400 to-slate-500',
          borderColor: 'border-gray-400',
          shadowColor: 'shadow-gray-500/30',
          iconColor: 'text-gray-600',
          icon: Medal,
          badge: '🥈',
          rank: '2nd',
          glowColor: 'shadow-gray-400/50'
        };
      case 2:
        return {
          bgGradient: 'from-orange-400 via-orange-500 to-amber-600',
          borderColor: 'border-orange-400',
          shadowColor: 'shadow-orange-500/30',
          iconColor: 'text-orange-600',
          icon: Award,
          badge: '🥉',
          rank: '3rd',
          glowColor: 'shadow-orange-400/50'
        };
      default:
        return {
          bgGradient: 'from-blue-50 to-indigo-50',
          borderColor: 'border-blue-200',
          shadowColor: 'shadow-blue-300/20',
          iconColor: 'text-blue-600',
          icon: Target,
          badge: `${index + 1}`,
          rank: `${index + 1}${getOrdinalSuffix(index + 1)}`,
          glowColor: 'shadow-blue-400/30'
        };
    }
  };

  // Helper function to get ordinal suffix
  const getOrdinalSuffix = (n: number): string => {
    const j = n % 10;
    const k = n % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  const getCampaignLogo = () => {
    try {
      if (campaignDetails?.metadata?.mainInfo) {
        const mainInfo = JSON.parse(campaignDetails.metadata.mainInfo);
        if (mainInfo.logo) return mainInfo.logo;
      }
      
      if (campaignDetails?.metadata?.additionalInfo) {
        const additionalInfo = JSON.parse(campaignDetails.metadata.additionalInfo);
        if (additionalInfo.logo) return additionalInfo.logo;
      }
    } catch (e) {
      // If JSON parsing fails, return null
    }
    return null;
  };

  const getProjectLogo = (project: any) => {
    try {
      if (project.additionalDataParsed?.logo) return project.additionalDataParsed.logo;
      
      if (project.additionalData) {
        const additionalData = JSON.parse(project.additionalData);
        if (additionalData.logo) return additionalData.logo;
      }
    } catch (e) {
      console.log('error', e);
    }
    return null;
  };

  const handleVote = useCallback((projectId: bigint, token: string, amount: bigint) => {
    return vote({ campaignId, projectId, token: token as `0x${string}`, amount });
  }, [campaignId, vote]);

  // FIXED: Filter projects based on active tab using the correct approval logic
  const filteredProjects = useMemo(() => {
    

    let filtered = [...sortedProjects];
    
    // Apply search filter
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(project => 
        project.name?.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query) ||
        (project.metadata?.bio && project.metadata.bio.toLowerCase().includes(query))
      );
    }
     
    // FIXED: Apply approval status filter using the correct logic
    switch (activeTab) {
      case 'approved':
        filtered = filtered.filter(project => 
          project.participation?.approved === true
        );
        break;
      case 'pending':
        filtered = filtered.filter(project => 
          project.participation?.approved !== true
        );
        break;
      default:
        break;
    }
    
    
    
    return filtered;
  }, [sortedProjects, activeTab, searchTerm]);

  // Add handler for adding project to campaign
  const handleAddToCampaign = async (projectId: bigint) => {
    if (!isConnected || !address) {
      setError('Please connect your wallet to add projects to campaigns.');
      return;
    }

    try {
      setError(null);
      
      const feeToken = import.meta.env.VITE_CELO_TOKEN;
      
      await addProjectToCampaign({
        campaignId,
        projectId,
        feeToken,
        shouldPayFee: !canBypassFees
      });
      
      setShowAddProjectModal(false);
      // Refetch data after adding project
      setTimeout(() => {
        refetchAllData();
      }, 2000);
      
    } catch (err: any) {
      console.error('Error adding project to campaign:', err);
      
      let errorMessage = 'Failed to add project to campaign. Please try again.';
      
      if (err?.message) {
        if (err.message.includes('user rejected')) {
          errorMessage = 'Transaction was rejected. No fees were charged.';
        } else if (err.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient CELO balance to pay the fee.';
        } else if (err.message.includes('Campaign has ended')) {
          errorMessage = 'This campaign has already ended.';
        } else if (err.message.includes('Project already in campaign')) {
          errorMessage = 'This project is already participating in this campaign.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    }
  };

  // Handle project approval with refetch
  const handleApproveProject = async (projectId: bigint) => {
    try {
      await approveProject({
        campaignId,
        projectId
      });
      
      // Refetch data after approval
      setTimeout(() => {
        refetchAllData();
      }, 2000); // Wait for transaction to be mined
      
    } catch (error) {
      console.error('Error approving project:', error);
    }
  };

  if (!isMounted) return null;

  if (campaignLoading || projectsLoading || participationLoading || adminLoading || sortedProjectsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 flex items-center justify-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-gradient-to-r from-blue-400/20 to-indigo-400/20 animate-float blur-2xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-gradient-to-r from-cyan-400/20 to-blue-400/20 animate-float-delay-1 blur-2xl"></div>
        </div>
        
        <div className="glass-morphism rounded-2xl p-8 shadow-xl relative">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <Waves className="h-6 w-6 text-blue-500 absolute inset-0 m-auto animate-wave" />
            </div>
            <div className="text-center">
              <p className="text-lg text-blue-600 font-semibold">Loading Sovereign Seas...</p>
              <p className="text-sm text-gray-600 animate-pulse">Preparing the campaign arena</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!campaignDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/5 w-40 h-40 rounded-full bg-gradient-to-r from-blue-400/10 to-indigo-400/10 animate-float blur-3xl"></div>
        </div>
        
        <div className="glass-morphism rounded-2xl p-8 shadow-xl max-w-md mx-auto text-center relative">
          <div className="text-6xl mb-6 animate-wave">🌊</div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-4">
            Campaign Not Found
          </h1>
          <p className="text-gray-600 text-sm mb-6">This campaign doesn't exist in the Sovereign Seas.</p>
          <button
            onClick={handleBackToArena}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
            Return to Arena
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
          </button>
        </div>
      </div>
    );
  }

  const campaign = campaignDetails.campaign;
  const campaignLogo = getCampaignLogo();

  // Calculate total campaign votes (rounded to 1 decimal place)
  const totalCampaignVotes = sortedProjects.reduce((sum, project) => 
    sum + Number(formatEther(project.voteCount || 0n)), 0
  );

  // Get accurate counts for display
  const approvedCount = sortedProjects.filter(p => p.participation?.approved === true).length;
  const pendingCount = sortedProjects.filter(p => p.participation?.approved !== true).length;

  // Sidebar Component with enhanced analytics
  const Sidebar = ({ className = "" }) => {
    const [expandedSections, setExpandedSections] = useState({
      analytics: true,
      tokenOcean: true,
      sovereignPower: true,
      simulator: true
    });

    const toggleSection = (section: string) => {
      setExpandedSections(prev => ({
        ...prev,
        [section]: !prev[section]
      }));
    };

    return (
      <div className={`glass-morphism ${className} relative`}>
        <div className="p-6 space-y-6">
          {/* Campaign Stats */}
          <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 rounded-xl p-4 border border-blue-200/50">
            <button
              onClick={() => toggleSection('analytics')}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="text-sm font-bold text-gray-800 flex items-center">
                <BarChart3 className="h-4 w-4 text-blue-500 mr-2" />
                <span className="text-blue-600">Campaign Analytics</span>
              </h3>
              {expandedSections.analytics ? (
                <ChevronUp className="h-4 w-4 text-blue-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-blue-500" />
              )}
            </button>
            
            {expandedSections.analytics && (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center">
                    <DollarSign className="h-3 w-3 text-blue-500 mr-1" />
                    Total Treasury
                  </span>
                  <div className="flex items-center space-x-1">
                    <span className="font-bold text-gray-800">{parseFloat(formatEther(campaign.totalFunds)).toFixed(1)}</span>
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-green-400 to-green-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">$</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center">
                    <Vote className="h-3 w-3 text-indigo-500 mr-1" />
                    Total Votes
                  </span>
                  <span className="font-bold text-indigo-600">{totalCampaignVotes.toFixed(1)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center">
                    <Users className="h-3 w-3 text-cyan-500 mr-1" />
                    Active Projects
                  </span>
                  <span className="font-bold text-cyan-600">{sortedProjects.length}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center">
                    <CheckCircle className="h-3 w-3 text-emerald-500 mr-1" />
                    Approved
                  </span>
                  <span className="font-bold text-emerald-600">{approvedCount}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center">
                    <Clock className="h-3 w-3 text-amber-500 mr-1" />
                    Pending
                  </span>
                  <span className="font-bold text-amber-600">{pendingCount}</span>
                </div>
              </div>
            )}
          </div>

          {/* Token Ocean */}
          <div className="bg-gradient-to-br from-emerald-50/80 to-cyan-50/80 rounded-xl p-4 border border-cyan-200/50">
            <button
              onClick={() => toggleSection('tokenOcean')}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="text-sm font-bold text-gray-800 flex items-center">
                <Waves className="h-4 w-4 text-cyan-500 mr-2" />
                <span className="text-cyan-600">Token Ocean</span>
              </h3>
              {expandedSections.tokenOcean ? (
                <ChevronUp className="h-4 w-4 text-cyan-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-cyan-500" />
              )}
            </button>
            
            {expandedSections.tokenOcean && (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <img 
                      src="/images/celo.png" 
                      alt="CELO"
                      className="w-6 h-6"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const nextElement = target.nextElementSibling as HTMLDivElement;
                        if (nextElement) {
                          nextElement.style.display = 'block';
                        }
                      }}
                    />
                    <div className="text-2xl hidden">🪙</div>
                    <span className="text-gray-700 font-medium">CELO</span>
                  </div>
                  <span className="font-bold text-amber-600">{parseFloat(formatEther(celoAmount || 0n)).toFixed(1)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <img 
                      src="/images/cusd.png" 
                      alt="cUSD"
                      className="w-6 h-6"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const nextElement = target.nextElementSibling as HTMLDivElement;
                        if (nextElement) {
                          nextElement.style.display = 'block';
                        }
                      }}
                    />
                    <div className="text-2xl hidden">💵</div>
                    <span className="text-gray-700 font-medium">cUSD</span>
                  </div>
                  <span className="font-bold text-emerald-600">{parseFloat(formatEther(cusdAmount || 0n)).toFixed(1)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Quadratic Funding Simulator */}
          <div className="bg-gradient-to-br from-purple-50/80 to-pink-50/80 rounded-xl p-4 border border-purple-200/50">
            <button
              onClick={() => toggleSection('simulator')}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="text-sm font-bold text-gray-800 flex items-center">
                <Calculator className="h-4 w-4 text-purple-500 mr-2" />
                <span className="text-purple-600">Quadratic Simulator</span>
              </h3>
              {expandedSections.simulator ? (
                <ChevronUp className="h-4 w-4 text-purple-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-purple-500" />
              )}
            </button>
            
            {expandedSections.simulator && (
              <div className="space-y-3 text-xs">
                <div className="bg-white/70 rounded-lg p-3">
                  <div className="text-gray-600 text-xs mb-2">How Quadratic Funding Works</div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-purple-600 text-xs">1</span>
                      </div>
                      <span className="text-gray-700">Votes are square-rooted</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-purple-600 text-xs">2</span>
                      </div>
                      <span className="text-gray-700">More unique voters = higher weight</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-purple-600 text-xs">3</span>
                      </div>
                      <span className="text-gray-700">Funds distributed proportionally</span>
                    </div>
                  </div>
                </div>

                {/* Enhanced Quadratic Simulator Table */}
                <div className="bg-white/70 rounded-lg p-3">
                  <div className="text-gray-600 text-xs mb-2">Current Distribution</div>
                  <div className="space-y-2">
                    {sortedProjects.map((project, index) => {
                      const voteCount = Number(formatEther(project.voteCount || 0n));
                      const quadraticWeight = Math.sqrt(voteCount);
                      const totalWeight = sortedProjects.reduce((sum, p) => 
                        sum + Math.sqrt(Number(formatEther(p.voteCount || 0n))), 0
                      );
                      const estimatedShare = totalWeight > 0 ? (quadraticWeight / totalWeight) * 100 : 0;
                      const estimatedPayout = (quadraticWeight / totalWeight) * Number(formatEther(campaign.totalFunds)) * 0.7;
                      
                      return (
                        <div
                          key={project.id}
                          className="flex items-center justify-between p-2 rounded-lg text-xs bg-white border border-gray-200"
                        >
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                              index === 0 ? 'bg-yellow-400 text-yellow-800' :
                              index === 1 ? 'bg-gray-400 text-gray-800' :
                              index === 2 ? 'bg-orange-400 text-orange-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {index + 1}
                            </div>
                            <div className="truncate">
                              <div className="font-medium truncate text-gray-800">
                                {project.name || `Project ${project.id}`}
                              </div>
                              <div className="text-gray-600">
                                {voteCount.toFixed(1)} votes
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-bold text-purple-600">
                              {estimatedShare.toFixed(1)}%
                            </div>
                            <div className="text-gray-600">
                              {estimatedPayout.toFixed(1)} CELO
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Your Sovereign Power */}
          {isConnected && (
            <div className="bg-gradient-to-br from-indigo-50/80 to-purple-50/80 rounded-xl p-4 border border-indigo-200/50">
              <button
                onClick={() => toggleSection('sovereignPower')}
                className="w-full flex items-center justify-between mb-4"
              >
                <h3 className="text-sm font-bold text-gray-800 flex items-center">
                  <Zap className="h-4 w-4 text-indigo-500 mr-2" />
                  <span className="text-indigo-600">Your Sovereign Power</span>
                </h3>
                {expandedSections.sovereignPower ? (
                  <ChevronUp className="h-4 w-4 text-indigo-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-indigo-500" />
                )}
              </button>
              
              {expandedSections.sovereignPower && (
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Votes Cast</span>
                    <span className="font-bold text-indigo-600">{parseFloat(formatEther(totalVotes || 0n)).toFixed(1)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Influence</span>
                    <span className={`font-bold ${Number(totalVotes || 0n) > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                      {Number(totalVotes || 0n) > 0 ? 'Active Sovereign' : 'Observer'}
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Role</span>
                      <span className="font-bold text-purple-600 flex items-center">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Enhanced animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-r from-blue-400/10 to-indigo-400/10 animate-float blur-3xl"></div>
        <div className="absolute top-1/2 right-1/5 w-80 h-80 rounded-full bg-gradient-to-r from-cyan-400/10 to-blue-400/10 animate-float-delay-1 blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-48 h-48 rounded-full bg-gradient-to-r from-indigo-400/10 to-purple-400/10 animate-float-delay-2 blur-3xl"></div>
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Desktop Sidebar */}
        <Sidebar className="hidden lg:block w-80" />

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-blue-900/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <Sidebar className="relative w-80 h-full overflow-y-auto" />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 p-4 lg:p-6">
          {/* Enhanced Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                onClick={handleBackToArena}
                className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-white/80 backdrop-blur-sm rounded-full border border-blue-200 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
              >
                <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
                <span className="hidden sm:inline">Return to Arena</span>
                <span className="sm:hidden">Back</span>
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-blue-100/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
              </button>

              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 bg-white/80 backdrop-blur-sm rounded-full border border-blue-200 hover:shadow-lg transition-all gradient-border"
              >
                <Menu className="h-4 w-4 text-blue-600" />
              </button>

              {/* Refresh Button */}
              <button
                onClick={refetchAllData}
                disabled={participationLoading || sortedProjectsLoading}
                className="p-2 bg-white/80 backdrop-blur-sm rounded-full border border-blue-200 hover:shadow-lg transition-all gradient-border flex items-center space-x-2"
              >
                <RotateCcw className={`h-4 w-4 text-blue-600 ${(participationLoading || sortedProjectsLoading) ? 'animate-spin' : ''}`} />
                <span className="text-sm text-blue-600 hidden sm:inline">
                  {(participationLoading || sortedProjectsLoading) ? 'Refreshing...' : 'Refresh'}
                </span>
              </button>
            </div>
            
            <div className="flex items-center space-x-2 text-xs w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex items-center space-x-2 glass-morphism px-3 py-2 rounded-full shadow-sm animate-float">
                <Users className="h-3 w-3 text-blue-500" />
                <span className="font-bold text-blue-600">{sortedProjects.length}</span>
                <span className="text-gray-600 hidden sm:inline">Projects</span>
              </div>
              
              <div className="flex items-center space-x-2 glass-morphism px-3 py-2 rounded-full shadow-sm animate-float-delay-1">
                <Coins className="h-3 w-3 text-emerald-500" />
                <span className="font-bold text-emerald-600">{parseFloat(formatEther(campaign.totalFunds)).toFixed(1)}</span>
                <span className="text-gray-600 hidden sm:inline">CELO</span>
              </div>

              {/* Admin indicator */}
              {isAdmin && (
                <div className="flex items-center space-x-2 glass-morphism px-3 py-2 rounded-full shadow-sm animate-float-delay-2 bg-gradient-to-r from-purple-100 to-pink-100 border-purple-200">
                  <Shield className="h-3 w-3 text-purple-500" />
                  <span className="font-bold text-purple-600 hidden sm:inline">Admin</span>
                </div>
              )}
            </div>
          </div>

          {/* Redesigned Compact Campaign Header */}
          <div className="glass-morphism rounded-xl p-4 shadow-xl mb-6 relative overflow-hidden group hover:shadow-2xl transition-all hover:-translate-y-1 duration-500">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
            
            <div className="relative z-10">
              {/* Top Row - Campaign Title and Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-3 sm:space-y-0 sm:space-x-3">
                  {/* Enhanced Campaign Logo - Bigger size */}
                  <div className="animate-float w-24 h-24 sm:w-32 sm:h-32">
                    {campaignLogo ? (
                      <img 
                        src={formatIpfsUrl(campaignLogo)} 
                        alt={`${campaign.name} logo`}
                        className="w-full h-full rounded-xl object-cover border-2 border-blue-200 shadow-md group-hover:border-blue-300 transition-colors duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-3xl font-bold shadow-md border-2 border-blue-200 group-hover:border-blue-300 transition-colors duration-300 ${campaignLogo ? 'hidden' : 'flex'}`}>
                      {campaign.name?.charAt(0) || ''}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <h1 className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 truncate">
                        {campaign.name || 'Untitled Campaign'}
                      </h1>
                      
                      {/* Enhanced Add to Campaign Button - Only show if active and not ended */}
                      {isActive && !hasEnded && (
                        <button
                          onClick={() => setShowAddProjectModal(true)}
                          className="px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center space-x-2 group relative overflow-hidden w-full sm:w-auto justify-center"
                        >
                          <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
                          <span>Add Project</span>
                          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                        </button>
                      )}

                      {/* Admin Panel Button */}
                      {isAdmin && (
                        <button
                          onClick={handleAdminPanel}
                          className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 text-white text-sm font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center space-x-2 group relative overflow-hidden w-full sm:w-auto justify-center"
                        >
                          <Settings className="h-4 w-4 group-hover:rotate-12 transition-transform duration-300" />
                          <span>Admin Panel</span>
                          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                        </button>
                      )}
                    </div>
                    
                    {/* Enhanced Description with Collapse/Expand */}
                    <div className="mt-2">
                      <div className="relative">
                        <p className={`text-sm text-gray-600 ${!expandedDescription ? 'line-clamp-2' : ''}`}>
                          {campaign.description}
                        </p>
                        {campaign.description && campaign.description.length > 100 && (
                          <button
                            onClick={() => setExpandedDescription(!expandedDescription)}
                            className="text-blue-600 text-xs font-medium mt-1 hover:text-blue-700 transition-colors duration-300 flex items-center space-x-1"
                          >
                            <span>{expandedDescription ? 'Show Less' : 'Show More'}</span>
                            {expandedDescription ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Status Badge - Mobile Responsive */}
                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1 justify-center sm:justify-start ${
                  countdown.phase === 'active' ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 animate-pulse' : 
                  countdown.phase === 'ended' ? 'bg-gray-100 text-gray-700' : 
                  'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700'
                }`}>
                  <Clock className="h-3 w-3" />
                  <span>
                    {countdown.phase === 'ended' ? 'Voyage Complete' : 
                     countdown.phase === 'active' ? 'LIVE VOYAGE' : 
                     'Preparing Launch'}
                  </span>
                </span>
              </div>

              {/* Middle Row - Compact Stats */}
              <div className="flex flex-wrap gap-2 mb-3">
                <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium border border-blue-200/50 shadow-sm">
                  <Trophy className="h-3 w-3" />
                  <span>Max {Number(campaign.maxWinners) || 'All'} Winners</span>
                </div>
                
                <div className="flex items-center space-x-2 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium border border-purple-200/50 shadow-sm">
                  <Target className="h-3 w-3" />
                  <span>{campaign.useQuadraticDistribution ? 'Quadratic Flow' : 'Linear Tide'}</span>
                </div>
              </div>

              {/* Enhanced Countdown Timer */}
              {countdown.phase !== 'ended' && (
                <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm rounded-lg p-3 border border-blue-200/50">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Timer className="h-4 w-4 text-blue-500 animate-wave" />
                    <div className="flex items-center space-x-1">
                      <div className="text-center">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-2 py-1 rounded-md font-mono text-sm font-bold shadow-md">
                          {countdown.days.toString().padStart(2, '0')}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">D</div>
                      </div>
                      <div className="text-blue-500 font-bold">:</div>
                      <div className="text-center">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-2 py-1 rounded-md font-mono text-sm font-bold shadow-md">
                          {countdown.hours.toString().padStart(2, '0')}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">H</div>
                      </div>
                      <div className="text-blue-500 font-bold">:</div>
                      <div className="text-center">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-2 py-1 rounded-md font-mono text-sm font-bold shadow-md">
                          {countdown.minutes.toString().padStart(2, '0')}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">M</div>
                      </div>
                      <div className="text-blue-500 font-bold">:</div>
                      <div className="text-center">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-2 py-1 rounded-md font-mono text-sm font-bold shadow-md animate-pulse">
                          {countdown.seconds.toString().padStart(2, '0')}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">S</div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                      {countdown.phase === 'preparing' ? 'Until Launch' : 'Until Voyage Ends'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Projects Leaderboard */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
              <h2 className="text-xl font-bold flex items-center">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                  <Rocket className="h-5 w-5 text-blue-500 mr-2 inline animate-wave" />
                  Sovereign Leaderboard
                </span>
              </h2>
              
              <div className="text-sm font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                {totalCampaignVotes.toFixed(1)} total votes cast
              </div>
            </div>

            {/* FIXED: Enhanced Project Filtering Tabs with correct counts */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 bg-white/80 backdrop-blur-sm rounded-lg p-1 border border-blue-200">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                    activeTab === 'all'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  All Projects ({sortedProjects.length})
                </button>
                <button
                  onClick={() => setActiveTab('approved')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
                    activeTab === 'approved'
                      ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-emerald-600'
                  }`}
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Approved</span>
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-bold">
                    {approvedCount}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
                    activeTab === 'pending'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-amber-600'
                  }`}
                >
                  <Clock className="h-4 w-4" />
                  <span>Pending</span>
                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold">
                    {pendingCount}
                  </span>
                </button>
              </div>

              {/* Search Input */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-blue-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-300"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Project List */}
            {filteredProjects.map((project, index) => {
              const styling = getPositionStyling(index);
              const voteCount = Number(formatEther(project.voteCount || 0n));
              const projectLogo = getProjectLogo(project);
              const isApproved = project.participation?.approved === true;

              return (
                <div
                  key={project.id}
                  onClick={() => isApproved && isActive ? openVoteModal(project) : null}
                  className={`
                    group glass-morphism rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 p-3 relative overflow-hidden cursor-pointer
                    hover:-translate-y-2 gradient-border animate-float
                    ${index < 3 ? 'bg-gradient-to-br from-white/90 to-white/80' : 'bg-white/80'}
                    ${isApproved && isActive ? 'hover:ring-2 hover:ring-blue-400' : ''}
                  `}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Enhanced Position Badge */}
                  <div className={`absolute -top-2 -left-2 w-12 h-12 rounded-full bg-gradient-to-r ${styling.bgGradient} shadow-xl ${styling.glowColor} flex items-center justify-center font-bold text-lg border-4 border-white transform group-hover:scale-110 transition-transform duration-300 z-10`}>
                    {index < 3 ? (
                      <div className="flex items-center justify-center w-full h-full">
                        <span className="text-xl text-white">{styling.badge}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full h-full">
                        <span className="text-lg text-blue-900">{index + 1}</span>
                      </div>
                    )}
                  </div>

                  {/* Position Badge Glow Effect */}
                  <div className={`absolute -top-2 -left-2 w-12 h-12 rounded-full ${styling.glowColor} blur-xl opacity-50 animate-pulse`}></div>

                  {/* FIXED: Approval Status Badge and Admin Controls */}
                  <div className="absolute top-2 right-2 flex items-center space-x-1">
                    {/* Approval Status Badge */}
                    <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                      isApproved 
                        ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 border border-emerald-200' 
                        : 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border border-amber-200'
                    }`}>
                      {isApproved ? (
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="h-2.5 w-2.5" />
                          <span>Approved</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-2.5 w-2.5" />
                          <span>Pending</span>
                        </div>
                      )}
                    </div>

                    {/* Admin Approve Button */}
                    {isAdmin && !isApproved && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApproveProject(BigInt(project.id));
                        }}
                        disabled={isApprovingProject}
                        className="px-2 py-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-medium hover:shadow-lg transition-all duration-300 flex items-center space-x-1"
                      >
                        {isApprovingProject ? (
                          <>
                            <Loader2 className="h-2.5 animate-spin" />
                            <span>Approving...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-2.5 w-2.5" />
                            <span>Approve</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 pl-6">
                    {/* Project Logo - Scaled down */}
                    <div className="animate-float-delay-1 relative">
                      {projectLogo ? (
                        <img 
                          src={formatIpfsUrl(projectLogo)} 
                          alt={`${project.name} logo`}
                          className="w-16 h-16 rounded-lg object-cover border-2 border-blue-200 shadow-md group-hover:border-blue-300 group-hover:shadow-lg transition-all duration-300"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-md border-2 border-blue-200 group-hover:border-blue-300 group-hover:shadow-lg transition-all duration-300 ${projectLogo ? 'hidden' : 'flex'}`}>
                        {project.name?.charAt(0) || ''}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Enhanced Vote Display - Moved to top */}
                      <div className="relative mb-1">
                        <div className="transform hover:scale-105 transition-transform duration-300">
                          <ProjectVotes 
                            campaignId={campaignId} 
                            projectId={BigInt(project.id)} 
                            onVoteCountReceived={updateProjectVoteCount}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-gray-800 text-base truncate group-hover:text-blue-600 transition-colors duration-300">
                            {project.name || 'Untitled Project'}
                          </h3>
                          <p className="text-xs text-gray-600 line-clamp-1">{project.description}</p>
                        </div>

                        {/* Action Button - Repositioned for mobile */}
                        {isActive && isApproved && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openVoteModal(project);
                            }}
                            className={`
                              px-4 py-2 rounded-xl text-white font-medium shadow-lg transition-all duration-300 
                              hover:shadow-xl hover:-translate-y-1 flex items-center space-x-2 text-sm group/btn relative overflow-hidden
                              bg-gradient-to-br from-blue-900/90 to-indigo-900/90 backdrop-blur-sm
                              border border-blue-400/20 w-full sm:w-auto justify-center
                            `}
                          >
                            <div className="relative z-10 flex items-center space-x-2">
                              <Vote className="h-4 w-4 group-hover/btn:rotate-12 transition-transform duration-300" />
                              <span>Cast Vote</span>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                          </button>
                        )}
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mt-1">
                        <div 
                          className={`h-full bg-gradient-to-r ${styling.bgGradient} transition-all duration-1000 rounded-full relative`}
                          style={{ width: `${Math.min(75, (voteCount / (totalCampaignVotes || 1)) * 100)}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                        </div>
                      </div>
                    </div>

                    {/* Explore Arrow Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (project?.id) {
                          navigate(`/explorer/project/${project.id}`);
                        }
                      }}
                      className="absolute bottom-2 right-2 p-1.5 rounded-full bg-white/80 text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-all duration-300 group/arrow"
                    >
                      <ArrowLeft className="h-3 w-3 transform rotate-180 group-hover/arrow:translate-x-1 transition-transform duration-300" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Enhanced Empty State */}
          {filteredProjects.length === 0 && (
            <div className="text-center py-16 glass-morphism rounded-2xl shadow-xl">
              <div className="text-6xl mb-6 animate-wave">🌊</div>
              <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-3">
                The Seas Await
              </h3>
              <p className="text-gray-600">
                {activeTab === 'approved' ? 'No approved projects in this campaign yet.' :
                 activeTab === 'pending' ? 'No pending projects in this campaign.' :
                 searchTerm ? `No projects match "${searchTerm}"` :
                 'No projects have joined this sovereign voyage yet.'}
              </p>
              <div className="mt-6">
                <button
                  onClick={handleBackToArena}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center">
                    <Rocket className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                    Explore Other Campaigns
                  </span>
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add Projects Modal */}
        {showAddProjectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddProjectModal(false)} />
            <div className="relative bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                  Add Projects to Campaign
                </h3>
                <button
                  onClick={() => setShowAddProjectModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-300"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Project List */}
              <div className="space-y-4">
                {allProjects?.filter(project => {
                  const formatted = formatProjectForDisplay(project);
                  return formatted && !project.project.campaignIds.some(cId => Number(cId) === Number(campaignId));
                }).map(project => {
                  const formatted = formatProjectForDisplay(project);
                  if (!formatted) return null;

                  return (
                    <div
                      key={formatted.id}
                      className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 hover:border-blue-300 transition-all duration-300"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold">
                          {formatted.name?.charAt(0) || ''}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800">{formatted.name}</h4>
                          <p className="text-sm text-gray-600 line-clamp-1">{formatted.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddToCampaign(BigInt(formatted.id))}
                        disabled={isAddingProject}
                        className={`px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center space-x-2 ${
                          isAddingProject ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isAddingProject ? (
                          <>
                            <Loader2 className="h-4 animate-spin" />
                            <span>Adding...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}

                {allProjects?.filter(project => {
                  const formatted = formatProjectForDisplay(project);
                  return formatted && !project.project.campaignIds.some(cId => Number(cId) === Number(campaignId));
                }).length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📋</div>
                    <h4 className="text-lg font-bold text-gray-800 mb-2">No Available Projects</h4>
                    <p className="text-gray-600 text-sm">All existing projects are already part of this campaign.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {showVoteModal && selectedProject && (
        <VoteModal
          isOpen={showVoteModal}
          onClose={closeVoteModal}
          selectedProject={selectedProject}
          campaignId={campaignId}
          isVoting={isVotePending}
          campaignDetails={campaignDetails}
          allProjects={sortedProjects}
          totalCampaignFunds={totalCampaignVotes}
          onVoteSuccess={handleVoteSuccess}
        />
      )}

    </div>
  </div>
);
}