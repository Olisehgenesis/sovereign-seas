// @ts-nocheck

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount, useReadContracts } from 'wagmi';
import { formatEther, Address } from 'viem';
import { motion, AnimatePresence } from 'framer-motion';
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
  Calculator,
  TrendingUp,
  Star,
  Info,
  Flame,
  Activity
} from 'lucide-react';
import { type AbiFunction } from 'viem';

import { useCampaignDetails, useApproveProject, useAddCampaignAdmin, useDistributeFunds, useIsCampaignAdmin, useSortedProjects, useParticipation } from '@/hooks/useCampaignMethods';
import VoteModal from '@/components/voteModal';
import AddProjectsToCampaignModal from '@/components/AddProjectsToCampaignModal';
import { getProjectVotesByCampaignId } from './voteutils';
import { useAllProjects, formatProjectForDisplay, useCanBypassFees } from '@/hooks/useProjectMethods';
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

  const handleVote = useCallback(
    (projectId: bigint, token: string, amount: bigint) => {
      return vote({
        campaignId,
        projectId: projectId.toString(), // <- as string
        token: token as `0x${string}`,
        amount
      });
    },
    [campaignId, vote]
  );
  

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-lg rounded-2xl p-8 shadow-xl max-w-md mx-auto text-center border border-blue-100"
        >
          <div className="text-6xl mb-6">🌊</div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
            Campaign Not Found
          </h1>
          <p className="text-gray-600 text-sm mb-6">This campaign doesn't exist in the voting arena.</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleBackToArena}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium shadow-lg"
          >
            <ArrowLeft className="h-4 w-4 mr-2 inline" />
            Return to Arena
          </motion.button>
        </motion.div>
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

        {/* Main Content - Improved spacing and padding */}
        <div className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          {/* Enhanced Header with better spacing */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
          >
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBackToArena}
                className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-white/80 backdrop-blur-sm rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-all"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Arena</span>
                <span className="sm:hidden">Back</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 bg-white/80 backdrop-blur-sm rounded-xl border border-blue-200 shadow-sm"
              >
                <Menu className="h-4 w-4 text-blue-600" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={refetchAllData}
                disabled={participationLoading || sortedProjectsLoading}
                className="p-2 bg-white/80 backdrop-blur-sm rounded-xl border border-blue-200 shadow-sm flex items-center space-x-2"
              >
                <motion.div
                  animate={{ rotate: (participationLoading || sortedProjectsLoading) ? 360 : 0 }}
                  transition={{ duration: 1, repeat: (participationLoading || sortedProjectsLoading) ? Infinity : 0, ease: "linear" }}
                >
                  <RotateCcw className="h-4 w-4 text-blue-600" />
                </motion.div>
                <span className="text-sm text-blue-600 hidden sm:inline">
                  {(participationLoading || sortedProjectsLoading) ? 'Refreshing...' : 'Refresh'}
                </span>
              </motion.button>
            </div>
            
            <div className="flex items-center space-x-2 text-xs">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-3 py-2 rounded-xl shadow-sm border border-blue-100"
              >
                <Users className="h-3 w-3 text-blue-500" />
                <span className="font-bold text-blue-600">{sortedProjects.length}</span>
                <span className="text-gray-600 hidden sm:inline">Projects</span>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-3 py-2 rounded-xl shadow-sm border border-green-100"
              >
                <Coins className="h-3 w-3 text-green-500" />
                <span className="font-bold text-green-600">{parseFloat(formatEther(campaign.totalFunds)).toFixed(1)}</span>
                <span className="text-gray-600 hidden sm:inline">CELO</span>
              </motion.div>

              {isAdmin && (
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center space-x-2 bg-gradient-to-r from-purple-100 to-pink-100 px-3 py-2 rounded-xl shadow-sm border border-purple-200"
                >
                  <Shield className="h-3 w-3 text-purple-500" />
                  <span className="font-bold text-purple-600 hidden sm:inline">Admin</span>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* COOL COMPACT CAMPAIGN HEADER */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="relative bg-gradient-to-r from-blue-400 via-blue-300 to-indigo-400 rounded-2xl shadow-2xl mb-8 overflow-hidden"
          >
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent"></div>
              <motion.div 
                animate={{ 
                  backgroundPosition: ['0% 0%', '100% 100%'],
                }}
                transition={{ 
                  duration: 20,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  ease: 'linear'
                }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                style={{
                  backgroundSize: '200% 200%'
                }}
              />
            </div>

            <div className="relative z-10 p-6 lg:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center space-x-4 lg:space-x-6 flex-1">
                  {/* Glowing Campaign Logo */}
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="relative w-20 h-20 lg:w-24 lg:h-24 flex-shrink-0"
                  >
                    <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl animate-pulse"></div>
                    {campaignLogo ? (
                      <img 
                        src={formatIpfsUrl(campaignLogo)} 
                        alt={`${campaign.name} logo`}
                        className="relative w-full h-full rounded-2xl object-cover border-2 border-white/30 shadow-2xl backdrop-blur-sm"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={`relative w-full h-full bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white text-2xl lg:text-3xl font-bold shadow-2xl border-2 border-white/30 ${campaignLogo ? 'hidden' : 'flex'}`}>
                      <motion.span
                        animate={{ 
                          textShadow: [
                            '0 0 20px rgba(255,255,255,0.5)',
                            '0 0 30px rgba(255,255,255,0.8)',
                            '0 0 20px rgba(255,255,255,0.5)'
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        {campaign.name?.charAt(0) || '🚀'}
                      </motion.span>
                    </div>
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:gap-4 mb-3 lg:mb-4">
                      {/* Glowing Campaign Title */}
                      <motion.h1 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-2xl lg:text-3xl xl:text-4xl font-bold text-white truncate"
                        style={{
                          textShadow: '0 0 30px rgba(255,255,255,0.3)',
                          fontSize: '1.5rem',
                          lineHeight: '1.2',
                          fontWeight: '700',
                          letterSpacing: '-0.025em'
                        }}
                      >
                        {campaign.name || 'Untitled Campaign'}
                      </motion.h1>
                      
                      {/* Floating Action Buttons */}
                      <div className="flex flex-row gap-3">
                        {!hasEnded && (
                          <motion.button
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowAddProjectModal(true)}
                            className="px-4 py-2 lg:px-6 lg:py-3 rounded-xl bg-white/20 backdrop-blur-md text-white text-sm lg:text-base font-medium shadow-xl border border-white/30 flex items-center space-x-2 hover:bg-white/30 transition-all"
                          >
                            <Plus className="h-4 w-4 lg:h-5 lg:w-5" />
                            <span>Add Project</span>
                          </motion.button>
                        )}

                        {isAdmin && (
                          <motion.button
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleAdminPanel}
                            className="px-4 py-2 lg:px-6 lg:py-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md text-white text-sm lg:text-base font-medium shadow-xl border border-purple-300/30 flex items-center space-x-2 hover:from-purple-500/30 hover:to-pink-500/30 transition-all"
                          >
                            <Settings className="h-4 w-4 lg:h-5 lg:w-5" />
                            <span>Admin</span>
                          </motion.button>
                        )}
                      </div>
                    </div>
                    
                    {/* Elegant Description Toggle */}
                    {campaign.description && campaign.description.length > 0 && (
                      <motion.div className="mb-3 lg:mb-4">
                        <motion.button
                          onClick={() => setExpandedDescription(!expandedDescription)}
                          className="w-full text-left group"
                          whileHover={{ scale: 1.01 }}
                        >
                          <p className={`text-sm lg:text-base text-white/90 leading-relaxed ${!expandedDescription ? 'line-clamp-1' : ''}`}>
                            {campaign.description}
                          </p>
                          {campaign.description.length > 100 && (
                            <div className="text-white/70 text-sm font-medium mt-2 flex items-center space-x-1 group-hover:text-white transition-colors">
                              <span>{expandedDescription ? 'Show Less' : 'Show More'}</span>
                              <motion.div
                                animate={{ rotate: expandedDescription ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </motion.div>
                            </div>
                          )}
                        </motion.button>
                      </motion.div>
                    )}

                    {/* Glowing Campaign Stats */}
                    <div className="flex flex-wrap gap-2 lg:gap-3">
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className="flex items-center space-x-2 bg-white/10 backdrop-blur-md text-white/90 px-3 lg:px-4 py-2 lg:py-2.5 rounded-full text-sm lg:text-base font-medium border border-white/20 shadow-lg"
                      >
                        <Trophy className="h-4 w-4 lg:h-5 lg:w-5" />
                        <span>Max {Number(campaign.maxWinners) || 'All'} Winners</span>
                      </motion.div>
                      
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className="flex items-center space-x-2 bg-white/10 backdrop-blur-md text-white/90 px-3 lg:px-4 py-2 lg:py-2.5 rounded-full text-sm lg:text-base font-medium border border-white/20 shadow-lg"
                      >
                        <Target className="h-4 w-4 lg:h-5 lg:w-5" />
                        <span>{campaign.useQuadraticDistribution ? 'Quadratic' : 'Linear'} Distribution</span>
                      </motion.div>
                    </div>
                  </div>
                </div>

                {/* Status & Countdown Section */}
                <div className="flex flex-col items-end space-y-3 lg:space-y-4">
                  {/* Compact Live Countdown */}
                  {countdown.phase !== 'ended' && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center space-x-3 bg-white/10 backdrop-blur-md px-4 lg:px-6 py-2 lg:py-3 rounded-xl border border-white/20 shadow-lg"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Timer className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                      </motion.div>
                      <div className="flex items-center space-x-1 text-sm lg:text-base">
                        <motion.span 
                          animate={{ 
                            boxShadow: [
                              '0 0 10px rgba(255,255,255,0.3)',
                              '0 0 20px rgba(255,255,255,0.6)',
                              '0 0 10px rgba(255,255,255,0.3)'
                            ]
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="bg-white/20 text-white px-2 lg:px-3 py-1 lg:py-1.5 rounded font-mono text-sm lg:text-base font-bold backdrop-blur-sm border border-white/30"
                        >
                          {countdown.days.toString().padStart(2, '0')}
                        </motion.span>
                        <span className="text-white/70 font-bold">:</span>
                        <span className="bg-white/20 text-white px-2 lg:px-3 py-1 lg:py-1.5 rounded font-mono text-sm lg:text-base font-bold backdrop-blur-sm border border-white/30">
                          {countdown.hours.toString().padStart(2, '0')}
                        </span>
                        <span className="text-white/70 font-bold">:</span>
                        <span className="bg-white/20 text-white px-2 lg:px-3 py-1 lg:py-1.5 rounded font-mono text-sm lg:text-base font-bold backdrop-blur-sm border border-white/30">
                          {countdown.minutes.toString().padStart(2, '0')}
                        </span>
                      </div>
                      <span className="text-white/90 text-sm font-medium">
                        {countdown.phase === 'preparing' ? 'until start' : 'remaining'}
                      </span>
                    </motion.div>
                  )}

                  {/* Glowing Status Badge */}
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    className={`px-4 lg:px-6 py-2 lg:py-3 rounded-xl text-sm lg:text-base font-bold flex items-center space-x-2 backdrop-blur-md border shadow-lg ${
                      countdown.phase === 'active' ? 'bg-green-500/20 text-green-100 border-green-400/30' : 
                      countdown.phase === 'ended' ? 'bg-gray-500/20 text-gray-100 border-gray-400/30' : 
                      'bg-amber-500/20 text-amber-100 border-amber-400/30'
                    }`}
                  >
                    <motion.div
                      animate={{ 
                        scale: countdown.phase === 'active' ? [1, 1.2, 1] : 1,
                        rotate: countdown.phase === 'active' ? [0, 10, -10, 0] : 0
                      }}
                      transition={{ 
                        duration: countdown.phase === 'active' ? 2 : 0,
                        repeat: countdown.phase === 'active' ? Infinity : 0
                      }}
                    >
                      {countdown.phase === 'active' ? <Flame className="h-4 w-4 lg:h-5 lg:w-5" /> : 
                       countdown.phase === 'ended' ? <Clock className="h-4 w-4 lg:h-5 lg:w-5" /> : 
                       <Activity className="h-4 w-4 lg:h-5 lg:w-5" />}
                    </motion.div>
                    <span>
                      {countdown.phase === 'ended' ? 'Campaign Ended' : 
                       countdown.phase === 'active' ? 'LIVE NOW' : 
                       'Starting Soon'}
                    </span>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Enhanced Projects Leaderboard with better spacing */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl lg:text-3xl font-bold flex items-center">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                  <Rocket className="h-6 w-6 text-blue-500 mr-3 inline animate-wave" />
                  Sovereign Leaderboard
                </span>
              </h2>
              
              <div className="text-lg font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                {totalCampaignVotes.toFixed(1)} total votes cast
              </div>
            </div>

            {/* Enhanced Project Filtering Tabs with better spacing */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-6 mb-8">
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 bg-white/80 backdrop-blur-sm rounded-lg p-2 border border-blue-200">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-6 py-3 rounded-md text-sm font-medium transition-all duration-300 ${
                    activeTab === 'all'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  All Projects ({sortedProjects.length})
                </button>
                <button
                  onClick={() => setActiveTab('approved')}
                  className={`px-6 py-3 rounded-md text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
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
                  className={`px-6 py-3 rounded-md text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
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

              {/* Search Input with better spacing */}
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-6 py-3 rounded-full bg-white/80 backdrop-blur-sm border border-blue-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-300 text-base"
                  />
                  <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Project List with Grid Layout */}
            <motion.div 
              layout
              className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            >
              <AnimatePresence>
                {filteredProjects
                  .filter(project => project.id !== undefined && project.id !== null)
                  .map((project, index) => {
                    const voteCount = Number(formatEther(project.voteCount || 0n));
                    const projectLogo = getProjectLogo(project);
                    const isApproved = project.participation?.approved === true;
                    const voteProgress = Math.min(100, (voteCount / 500) * 100);

                    return (
                      <motion.div
                        key={project.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        onClick={() => isApproved && isActive ? openVoteModal(project) : null}
                        className={`
                          relative bg-white/90 backdrop-blur-lg rounded-xl shadow-lg transition-all duration-300 p-4 cursor-pointer border-2 group overflow-hidden
                          ${isApproved && isActive ? 'border-blue-300' : 'border-gray-200'}
                          ${isApproved && isActive ? 'hover:border-blue-400' : ''}
                        `}
                      >
                        {/* Position Badge - Top Left */}
                        <div className={`absolute -top-2 -left-2 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-lg z-20 border-2 border-white ${
                          index === 0 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                          index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-500' :
                          index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                          'bg-gradient-to-r from-blue-400 to-blue-600'
                        }`}>
                          {index < 3 ? (
                            <span className="text-sm">
                              {index === 0 ? '👑' : index === 1 ? '🥈' : '🥉'}
                            </span>
                          ) : (
                            <span className="text-xs font-bold">{index + 1}</span>
                          )}
                        </div>

                        {/* Approval Status - Top Right */}
                        <div className="absolute top-2 right-2 z-20">
                          <div className={`px-2 py-1 rounded-full text-xs font-bold flex items-center space-x-1 ${
                            isApproved 
                              ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200' 
                              : 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border border-amber-200'
                          }`}>
                            {isApproved ? (
                              <>
                                <CheckCircle className="h-3 w-3" />
                                <span>Approved</span>
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3" />
                                <span>Pending</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Admin Approve Button - Below Approval Status */}
                        {isAdmin && !isApproved && project.id !== undefined && project.id !== null && (
                          <div className="absolute top-12 right-2 z-20">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApproveProject(BigInt(project.id));
                              }}
                              disabled={isApprovingProject}
                              className="px-2 py-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-medium shadow-lg flex items-center space-x-1"
                            >
                              {isApprovingProject ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  <span>Approving...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-3 w-3" />
                                  <span>Approve</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {/* Project Content */}
                        <div className="relative z-10 pt-6">
                          {/* Project Logo - Centered and Bigger */}
                          <div className="flex justify-center mb-4">
                            <div className="relative">
                              {projectLogo ? (
                                <img 
                                  src={formatIpfsUrl(projectLogo)} 
                                  alt={`${project.name} logo`}
                                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border-2 border-blue-200 shadow-md"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const fallback = target.nextSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div className={`w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-md border-2 border-blue-200 ${projectLogo ? 'hidden' : 'flex'}`}>
                                {project.name?.charAt(0) || ''}
                              </div>
                            </div>
                          </div>

                          {/* Project Info */}
                          <div className="text-center mb-4">
                            <h3 className="font-bold text-gray-800 text-base sm:text-lg truncate mb-2">
                              {project.name || 'Untitled Project'}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 leading-relaxed mb-3">
                              {project.description}
                            </p>
                            
                            {/* Vote Count Display */}
                            <div className="mb-3">
                              {project.id !== undefined && project.id !== null && (
                                <ProjectVotes 
                                  campaignId={campaignId} 
                                  projectId={BigInt(project.id)} 
                                  onVoteCountReceived={updateProjectVoteCount}
                                />
                              )}
                            </div>
                          </div>

                          {/* Vote Progress Bar */}
                          <div className="mb-4">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-gray-500">Progress</span>
                              <span className="text-xs text-gray-500">{voteProgress.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${voteProgress}%` }}
                                transition={{ duration: 1, delay: index * 0.1 }}
                                className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full relative"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                              </motion.div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col space-y-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (project?.id) {
                                  navigate(`/explorer/project/${project.id}`);
                                }
                              }}
                              className="w-full px-3 py-2 rounded-lg bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 text-sm font-medium transition-all flex items-center justify-center space-x-2"
                            >
                              <Eye className="h-4 w-4" />
                              <span>View Details</span>
                            </button>

                            {isActive && isApproved && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openVoteModal(project);
                                }}
                                className="w-full px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium shadow-lg transition-all flex items-center justify-center space-x-2"
                              >
                                <Vote className="h-4 w-4" />
                                <span>Vote</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </AnimatePresence>
            </motion.div>
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
          <AddProjectsToCampaignModal
            isOpen={showAddProjectModal}
            onClose={() => setShowAddProjectModal(false)}
            campaignId={campaignId.toString()}
            campaignName={campaign.name || 'Untitled Campaign'}
            onSuccess={refetchAllData}
          />
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