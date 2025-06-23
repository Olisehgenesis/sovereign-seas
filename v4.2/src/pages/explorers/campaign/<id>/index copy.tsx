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

import { useCampaignDetails, useApproveProject,  useSortedProjects, useParticipation } from '@/hooks/useCampaignMethods';
import VoteModal from '@/components/voteModal';
import AddProjectsToCampaignModal from '@/components/AddProjectsToCampaignModal';
import { useAllProjects, formatProjectForDisplay, useCanBypassFees } from '@/hooks/useProjectMethods';
import {
  useVote,
  useUserTotalVotesInCampaign,
  useCampaignTokenAmount,
} from '@/hooks/useVotingMethods';
import { formatIpfsUrl } from '@/utils/imageUtils';
import React from 'react';

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
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center"
      >
        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      </motion.div>
    );
  }

  if (error) {
    console.error('Error fetching participation for', participationKey, ':', error);
    return <div className="text-lg font-bold text-red-500">Error</div>;
  }

  if (!participation) {
    console.warn('No participation data received for', participationKey);
    return <div className="text-lg font-bold text-gray-400">0.0</div>;
  }

  try {
    if (typeof voteCount !== 'bigint') {
      console.error('Invalid vote count type for', participationKey, ':', typeof voteCount);
      return <div className="text-lg font-bold text-red-500">Invalid Type</div>;
    }

    const formattedVotes = Number(formatEther(voteCount)).toFixed(1);
    return (
      <motion.div 
        className="text-center"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {formattedVotes}
        </div>
        <div className="text-xs text-gray-500 font-medium">votes</div>
      </motion.div>
    );
  } catch (error) {
    console.error('Error processing participation data for', participationKey, ':', error);
    return <div className="text-lg font-bold text-gray-400">0.0</div>;
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
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [showApproveHelp, setShowApproveHelp] = useState<string | null>(null);
  
  // Create stable ref for vote count update function
  const updateProjectVoteCount = useCallback((projectId: string, voteCount: bigint) => {
    setProjectVoteCounts(prev => {
      const newMap = new Map(prev);
      newMap.set(projectId, voteCount);
      return newMap;
    });
  }, []);

  const contractAddress = import.meta.env.VITE_CONTRACT_V4;
  const campaignId = id ? BigInt(id) : BigInt(0);
  
  // ALWAYS call all hooks in the same order - moved to top level
  const { campaignDetails, isLoading: campaignLoading } = useCampaignDetails(
    contractAddress,
    campaignId
  );
  
  const { projects: allProjects, isLoading: projectsLoading } = useAllProjects(contractAddress);
  
  // ALWAYS call admin check hook regardless of conditions
  const { isAdmin, isLoading: adminLoading } = useIsCampaignAdminCheck(
    contractAddress, 
    campaignId, 
    address
  );
  
  // ALWAYS call token amount hooks
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
  
  // ALWAYS call voting hooks
  const { totalVotes } = useUserTotalVotesInCampaign(
    contractAddress,
    campaignId,
    address || '0x0000000000000000000000000000000000000000'
  );
  
  const { 
    vote, 
    isPending: isVotePending, 
  } = useVote(contractAddress);

  // ALWAYS call sorted projects hook
  const { sortedProjectIds, isLoading: sortedProjectsLoading, refetch: refetchSorted } = useSortedProjects(
    contractAddress,
    campaignId
  );

  // ALWAYS call project management hooks
  const { isAdmin: canBypassFees } = useCanBypassFees(contractAddress, campaignId);
  const { approveProject, isPending: isApprovingProject } = useApproveProject(contractAddress);

  // Create a Set of approved project IDs for O(1) lookup - MEMOIZED PROPERLY
  const approvedProjectIds = useMemo(() => {
    return new Set(sortedProjectIds.map(id => id.toString()));
  }, [sortedProjectIds]);

  // Data processing logic - STABLE MEMOIZATION
  const campaignProjectsBasic = useMemo(() => {
    if (!allProjects || !campaignId) return [];
    
    const filtered = allProjects.filter(projectDetails => {
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

  // ALWAYS create participation contracts, even if empty
  const participationContracts = useMemo(() => {
    if (projectIds.length === 0) {
      return [];
    }
    
    return projectIds.map(projectId => ({
      address: contractAddress as `0x${string}`,
      abi: [{
        inputs: [{ name: 'campaignId', type: 'uint256' }, { name: 'projectId', type: 'uint256' }],
        name: 'getParticipation',
        outputs: [{ name: '', type: 'tuple' }],
        stateMutability: 'view',
        type: 'function'
      } satisfies AbiFunction],
      functionName: 'getParticipation',
      args: [campaignId, projectId]
    }));
  }, [contractAddress, campaignId, projectIds]);

  // ALWAYS call useReadContracts hook, but conditionally enable it
  const { data: participationData, isLoading: participationLoading, error: participationError, refetch: refetchParticipation } = useReadContracts({
    contracts: participationContracts,
    query: {
      enabled: !!contractAddress && !!campaignId && participationContracts.length > 0,
      retry: 3,
      retryDelay: 1000,
      staleTime: 0 // Always fetch fresh data
    }
  });

  // STABLE CAMPAIGN PROJECTS MEMOIZATION
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

  // STABLE SORTED PROJECTS
  const sortedProjects = useMemo(() => {
    const sorted = [...campaignProjects].sort((a, b) => {
      const aVotes = a.voteCount || 0n;
      const bVotes = b.voteCount || 0n;
      
      const aVotesNum = Number(formatEther(aVotes));
      const bVotesNum = Number(formatEther(bVotes));
      
      return bVotesNum - aVotesNum;
    });
  
    return sorted;
  }, [campaignProjects]);

  // STABLE CALCULATIONS
  const { totalCampaignVotes, approvedCount, pendingCount } = useMemo(() => {
    const totalVotes = sortedProjects.reduce((sum, project) => 
      sum + Number(formatEther(project.voteCount || 0n)), 0
    );
    const approved = sortedProjects.filter(p => p.participation?.approved === true).length;
    const pending = sortedProjects.filter(p => p.participation?.approved !== true).length;
    
    return { 
      totalCampaignVotes: totalVotes,
      approvedCount: approved,
      pendingCount: pending
    };
  }, [sortedProjects]);

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
    setSelectedProject(null);
    setShowVoteModal(false);
    await new Promise(resolve => setTimeout(resolve, 300));
    await refetchAllData();
  };

  const closeVoteModal = () => {
    setShowVoteModal(false);
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

  // STABLE FILTERED PROJECTS
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
     
    // Apply approval status filter
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

  // Handle project approval with refetch
  const handleApproveProject = async (projectId: bigint) => {
    setApproveError(null);
    try {
      await approveProject({
        campaignId,
        projectId
      });
      setTimeout(() => {
        refetchAllData();
      }, 2000);
    } catch (error: any) {
      setApproveError(projectId.toString());
      console.error('Error approving project:', error);
    }
  };

  if (!isMounted) return null;

  if (campaignLoading || projectsLoading || participationLoading || adminLoading || sortedProjectsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/80 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-blue-100"
        >
          <div className="flex flex-col items-center space-y-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full"
            />
            <div className="text-center">
              <p className="text-lg text-blue-600 font-semibold">Loading Campaign...</p>
              <p className="text-sm text-gray-500">Preparing the voting arena</p>
            </div>
          </div>
        </motion.div>
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
 
  // STABLE SIDEBAR DATA - MEMOIZED TO PREVENT BLINKING
  const stableSidebarData = useMemo(() => ({
    totalFunds: parseFloat(formatEther(campaign.totalFunds)).toFixed(1),
    totalVotes: totalCampaignVotes.toFixed(1),
    celoAmount: parseFloat(formatEther(celoAmount || 0n)).toFixed(1),
    cusdAmount: parseFloat(formatEther(cusdAmount || 0n)).toFixed(1),
    userVotes: parseFloat(formatEther(totalVotes || 0n)).toFixed(1),
    projectsCount: sortedProjects.length,
    approvedCount,
    pendingCount,
    isAdmin,
    isConnected
  }), [
    campaign.totalFunds, 
    totalCampaignVotes, 
    celoAmount, 
    cusdAmount, 
    totalVotes, 
    sortedProjects.length, 
    approvedCount, 
    pendingCount,
    isAdmin,
    isConnected
  ]);
 
  // STABLE SIDEBAR COMPONENT - PREVENT RE-RENDERS
  const Sidebar = React.memo(({ className = "" }: { className?: string }) => {
    const [expandedSections, setExpandedSections] = useState({
      analytics: true,
      tokenOcean: true,
      sovereignPower: true,
      simulator: false
    });
 
    const toggleSection = useCallback((section: string) => {
      setExpandedSections(prev => ({
        ...prev,
        [section]: !prev[section]
      }));
    }, []);
 
    return (
      <div className={`bg-white/90 backdrop-blur-lg border-r border-blue-100 ${className}`}>
        <div className="p-6 space-y-4">
          {/* Campaign Stats */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
            <button
              onClick={() => toggleSection('analytics')}
              className="w-full flex items-center justify-between mb-3"
            >
              <h3 className="text-sm font-bold text-gray-800 flex items-center">
                <BarChart3 className="h-4 w-4 text-blue-500 mr-2" />
                <span className="text-blue-600">Analytics</span>
              </h3>
              <motion.div
                animate={{ rotate: expandedSections.analytics ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4 text-blue-500" />
              </motion.div>
            </button>
            
            <AnimatePresence>
              {expandedSections.analytics && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-3 text-xs overflow-hidden"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 flex items-center">
                      <DollarSign className="h-3 w-3 text-green-500 mr-1" />
                      Treasury
                    </span>
                    <div className="flex items-center space-x-1">
                      <span className="font-bold text-gray-800">{stableSidebarData.totalFunds}</span>
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-green-400 to-green-500 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">$</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 flex items-center">
                      <Vote className="h-3 w-3 text-purple-500 mr-1" />
                      Total Votes
                    </span>
                    <span className="font-bold text-purple-600">{stableSidebarData.totalVotes}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 flex items-center">
                      <Users className="h-3 w-3 text-blue-500 mr-1" />
                      Projects
                    </span>
                    <span className="font-bold text-blue-600">{stableSidebarData.projectsCount}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 flex items-center">
                      <CheckCircle className="h-3 w-3 text-emerald-500 mr-1" />
                      Approved
                    </span>
                    <span className="font-bold text-emerald-600">{stableSidebarData.approvedCount}</span>
                 </div>
                 
                 <div className="flex justify-between items-center">
                   <span className="text-gray-600 flex items-center">
                     <Clock className="h-3 w-3 text-amber-500 mr-1" />
                     Pending
                   </span>
                   <span className="font-bold text-amber-600">{stableSidebarData.pendingCount}</span>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
         </div>

         {/* Token Ocean */}
         <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 rounded-xl p-4 border border-cyan-100">
           <button
             onClick={() => toggleSection('tokenOcean')}
             className="w-full flex items-center justify-between mb-3"
           >
             <h3 className="text-sm font-bold text-gray-800 flex items-center">
               <Waves className="h-4 w-4 text-cyan-500 mr-2" />
               <span className="text-cyan-600">Tokens</span>
             </h3>
             <motion.div
               animate={{ rotate: expandedSections.tokenOcean ? 180 : 0 }}
               transition={{ duration: 0.2 }}
             >
               <ChevronDown className="h-4 w-4 text-cyan-500" />
             </motion.div>
           </button>
           
           <AnimatePresence>
             {expandedSections.tokenOcean && (
               <motion.div
                 initial={{ height: 0, opacity: 0 }}
                 animate={{ height: "auto", opacity: 1 }}
                 exit={{ height: 0, opacity: 0 }}
                 transition={{ duration: 0.3 }}
                 className="space-y-3 text-xs overflow-hidden"
               >
                 <div className="flex justify-between items-center">
                   <div className="flex items-center space-x-2">
                     <img 
                       src="/images/celo.png" 
                       alt="CELO"
                       className="w-5 h-5"
                       onError={(e) => {
                         const target = e.target as HTMLImageElement;
                         target.style.display = 'none';
                         const nextElement = target.nextElementSibling as HTMLDivElement;
                         if (nextElement) {
                           nextElement.style.display = 'block';
                         }
                       }}
                     />
                     <div className="text-lg hidden">🪙</div>
                     <span className="text-gray-700 font-medium">CELO</span>
                   </div>
                   <span className="font-bold text-amber-600">{stableSidebarData.celoAmount}</span>
                 </div>
                 
                 <div className="flex justify-between items-center">
                   <div className="flex items-center space-x-2">
                     <img 
                       src="/images/cusd.png" 
                       alt="cUSD"
                       className="w-5 h-5"
                       onError={(e) => {
                         const target = e.target as HTMLImageElement;
                         target.style.display = 'none';
                         const nextElement = target.nextElementSibling as HTMLDivElement;
                         if (nextElement) {
                           nextElement.style.display = 'block';
                         }
                       }}
                     />
                     <div className="text-lg hidden">💵</div>
                     <span className="text-gray-700 font-medium">cUSD</span>
                   </div>
                   <span className="font-bold text-emerald-600">{stableSidebarData.cusdAmount}</span>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
         </div>

         {/* Quadratic Funding Simulator */}
         <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
           <button
             onClick={() => toggleSection('simulator')}
             className="w-full flex items-center justify-between mb-3"
           >
             <h3 className="text-sm font-bold text-gray-800 flex items-center">
               <Calculator className="h-4 w-4 text-purple-500 mr-2" />
               <span className="text-purple-600">QF Info</span>
             </h3>
             <motion.div
               animate={{ rotate: expandedSections.simulator ? 180 : 0 }}
               transition={{ duration: 0.2 }}
             >
               <ChevronDown className="h-4 w-4 text-purple-500" />
             </motion.div>
           </button>
           
           <AnimatePresence>
             {expandedSections.simulator && (
               <motion.div
                 initial={{ height: 0, opacity: 0 }}
                 animate={{ height: "auto", opacity: 1 }}
                 exit={{ height: 0, opacity: 0 }}
                 transition={{ duration: 0.3 }}
                 className="space-y-2 text-xs overflow-hidden"
               >
                 <div className="bg-white/70 rounded-lg p-3">
                   <div className="space-y-2">
                     <div className="flex items-center space-x-2">
                       <div className="w-3 h-3 rounded-full bg-purple-100 flex items-center justify-center">
                         <span className="text-purple-600 text-xs">1</span>
                       </div>
                       <span className="text-gray-700">Votes are square-rooted</span>
                     </div>
                     <div className="flex items-center space-x-2">
                       <div className="w-3 h-3 rounded-full bg-purple-100 flex items-center justify-center">
                         <span className="text-purple-600 text-xs">2</span>
                       </div>
                       <span className="text-gray-700">More voters = higher weight</span>
                     </div>
                     <div className="flex items-center space-x-2">
                       <div className="w-3 h-3 rounded-full bg-purple-100 flex items-center justify-center">
                         <span className="text-purple-600 text-xs">3</span>
                       </div>
                       <span className="text-gray-700">Funds distributed proportionally</span>
                     </div>
                   </div>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
         </div>

         {/* Your Power */}
         {stableSidebarData.isConnected && (
           <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
             <button
               onClick={() => toggleSection('sovereignPower')}
               className="w-full flex items-center justify-between mb-3"
             >
               <h3 className="text-sm font-bold text-gray-800 flex items-center">
                 <Zap className="h-4 w-4 text-indigo-500 mr-2" />
                 <span className="text-indigo-600">Your Power</span>
               </h3>
               <motion.div
                 animate={{ rotate: expandedSections.sovereignPower ? 180 : 0 }}
                 transition={{ duration: 0.2 }}
               >
                 <ChevronDown className="h-4 w-4 text-indigo-500" />
               </motion.div>
             </button>
             
             <AnimatePresence>
               {expandedSections.sovereignPower && (
                 <motion.div
                   initial={{ height: 0, opacity: 0 }}
                   animate={{ height: "auto", opacity: 1 }}
                   exit={{ height: 0, opacity: 0 }}
                   transition={{ duration: 0.3 }}
                   className="space-y-3 text-xs overflow-hidden"
                 >
                   <div className="flex justify-between items-center">
                     <span className="text-gray-600">Votes Cast</span>
                     <span className="font-bold text-indigo-600">{stableSidebarData.userVotes}</span>
                   </div>
                   
                   <div className="flex justify-between items-center">
                     <span className="text-gray-600">Status</span>
                     <span className={`font-bold ${Number(totalVotes || 0n) > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                       {Number(totalVotes || 0n) > 0 ? 'Active Voter' : 'Observer'}
                     </span>
                   </div>

                   {stableSidebarData.isAdmin && (
                     <div className="flex justify-between items-center">
                       <span className="text-gray-600">Role</span>
                       <span className="font-bold text-purple-600 flex items-center">
                         <Shield className="h-3 w-3 mr-1" />
                         Admin
                       </span>
                     </div>
                   )}
                 </motion.div>
               )}
             </AnimatePresence>
           </div>
         )}
       </div>
     </div>
   );
 });

 return (
   <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
     <div className="flex min-h-screen">
       {/* Desktop Sidebar */}
       <Sidebar className="hidden lg:block w-80 sticky top-0 h-screen overflow-y-auto" />

       {/* Mobile Sidebar Overlay */}
       <AnimatePresence>
         {sidebarOpen && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="lg:hidden fixed inset-0 z-50 flex"
           >
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 bg-black/20 backdrop-blur-sm" 
               onClick={() => setSidebarOpen(false)} 
             />
             <motion.div
               initial={{ x: -320 }}
               animate={{ x: 0 }}
               exit={{ x: -320 }}
               transition={{ type: "spring", damping: 30, stiffness: 300 }}
             >
               <Sidebar className="relative w-80 h-full overflow-y-auto" />
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>

       {/* Main Content */}
       <div className="flex-1 p-4 lg:p-8 overflow-x-hidden">
         {/* Header */}
         <motion.div 
           initial={{ y: -20, opacity: 0 }}
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
           className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl shadow-2xl mb-8 overflow-hidden"
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

           <div className="relative z-10 p-6">
             <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
               <div className="flex items-center space-x-4 flex-1">
                 {/* Glowing Campaign Logo */}
                 <motion.div 
                   whileHover={{ scale: 1.1, rotate: 5 }}
                   className="relative w-16 h-16 lg:w-20 lg:h-20 flex-shrink-0"
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
                   <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                     {/* Glowing Campaign Title */}
                     <motion.h1 
                       initial={{ opacity: 0, x: -20 }}
                       animate={{ opacity: 1, x: 0 }}
                       className="text-xl lg:text-2xl xl:text-3xl font-bold text-white truncate"
                       style={{
                         textShadow: '0 0 30px rgba(255,255,255,0.3)'
                       }}
                     >
                       {campaign.name || 'Untitled Campaign'}
                     </motion.h1>
                     
                     {/* Floating Action Buttons */}
                     <div className="flex flex-row gap-2">
                       {isActive && !hasEnded && (
                         <motion.button
                           whileHover={{ scale: 1.05, y: -2 }}
                           whileTap={{ scale: 0.95 }}
                           onClick={() => setShowAddProjectModal(true)}
                           className="px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md text-white text-sm font-medium shadow-xl border border-white/30 flex items-center space-x-2 hover:bg-white/30 transition-all"
                         >
                           <Plus className="h-4 w-4" />
                           <span>Add Project</span>
                         </motion.button>
                       )}

                       {isAdmin && (
                         <motion.button
                           whileHover={{ scale: 1.05, y: -2 }}
                           whileTap={{ scale: 0.95 }}
                           onClick={handleAdminPanel}
                           className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md text-white text-sm font-medium shadow-xl border border-purple-300/30 flex items-center space-x-2 hover:from-purple-500/30 hover:to-pink-500/30 transition-all"
                         >
                           <Settings className="h-4 w-4" />
                           <span>Admin</span>
                         </motion.button>
                       )}
                     </div>
                   </div>
                   
                   {/* Elegant Description Toggle */}
                   {campaign.description && campaign.description.length > 0 && (
                     <motion.div className="mb-3">
                       <motion.button
                         onClick={() => setExpandedDescription(!expandedDescription)}
                         className="w-full text-left group"
                         whileHover={{ scale: 1.01 }}
                       >
                         <p className={`text-sm lg:text-base text-white/90 leading-relaxed ${!expandedDescription ? 'line-clamp-1' : ''}`}>
                           {campaign.description}
                         </p>
                         {campaign.description.length > 100 && (
                           <div className="text-white/70 text-xs font-medium mt-2 flex items-center space-x-1 group-hover:text-white transition-colors">
                             <span>{expandedDescription ? 'Show Less' : 'Show More'}</span>
                             <motion.div
                               animate={{ rotate: expandedDescription ? 180 : 0 }}
                               transition={{ duration: 0.2 }}
                             >
                               <ChevronDown className="h-3 w-3" />
                             </motion.div>
                           </div>
                         )}
                       </motion.button>
                     </motion.div>
                   )}

                   {/* Glowing Campaign Stats */}
                   <div className="flex flex-wrap gap-2">
                     <motion.div 
                       whileHover={{ scale: 1.05 }}
                       className="flex items-center space-x-2 bg-white/10 backdrop-blur-md text-white/90 px-3 py-1.5 rounded-full text-xs font-medium border border-white/20 shadow-lg"
                     >
                       <Trophy className="h-3 w-3" />
                       <span>Max {Number(campaign.maxWinners) || 'All'} Winners</span>
                     </motion.div>
                     
                     <motion.div 
                       whileHover={{ scale: 1.05 }}
                       className="flex items-center space-x-2 bg-white/10 backdrop-blur-md text-white/90 px-3 py-1.5 rounded-full text-xs font-medium border border-white/20 shadow-lg"
                     >
                       <Target className="h-3 w-3" />
                       <span>{campaign.useQuadraticDistribution ? 'Quadratic' : 'Linear'} Distribution</span>
                     </motion.div>
                   </div>
                 </div>
               </div>

               {/* Status & Countdown Section */}
               <div className="flex flex-col items-end space-y-3">
                 {/* Compact Live Countdown */}
                 {countdown.phase !== 'ended' && (
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1 }}
                     className="flex items-center space-x-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 shadow-lg"
                   >
                     <motion.div
                       animate={{ scale: [1, 1.2, 1] }}
                       transition={{ duration: 2, repeat: Infinity }}
                     >
                       <Timer className="h-4 w-4 text-white" />
                     </motion.div>
                     <div className="flex items-center space-x-1 text-sm">
                       <motion.span 
                         animate={{ 
                           boxShadow: [
                             '0 0 10px rgba(255,255,255,0.3)',
                             '0 0 20px rgba(255,255,255,0.6)',
                             '0 0 10px rgba(255,255,255,0.3)'
                           ]
                         }}
                         transition={{ duration: 2, repeat: Infinity }}
                         className="bg-white/20 text-white px-2 py-1 rounded font-mono text-sm font-bold backdrop-blur-sm border border-white/30"
                       >
                         {countdown.days.toString().padStart(2, '0')}
                       </motion.span>
                       <span className="text-white/70 font-bold">:</span>
                       <span className="bg-white/20 text-white px-2 py-1 rounded font-mono text-sm font-bold backdrop-blur-sm border border-white/30">
                         {countdown.hours.toString().padStart(2, '0')}
                       </span>
                       <span className="text-white/70 font-bold">:</span>
                       <span className="bg-white/20 text-white px-2 py-1 rounded font-mono text-sm font-bold backdrop-blur-sm border border-white/30">
                         {countdown.minutes.toString().padStart(2, '0')}
                       </span>
                     </div>
                     <span className="text-white/90 text-xs font-medium">
                       {countdown.phase === 'preparing' ? 'until start' : 'remaining'}
                     </span>
                   </motion.div>
                 )}

                 {/* Glowing Status Badge */}
                 <motion.div
                   initial={{ scale: 0.9 }}
                   animate={{ scale: 1 }}
                   whileHover={{ scale: 1.05 }}
                   className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center space-x-2 backdrop-blur-md border shadow-lg ${
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
                     {countdown.phase === 'active' ? <Flame className="h-4 w-4" /> : 
                      countdown.phase === 'ended' ? <Clock className="h-4 w-4" /> : 
                      <Activity className="h-4 w-4" />}
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

         {/* Projects Section */}
         <motion.div 
           initial={{ y: 20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           transition={{ delay: 0.2 }}
           className="space-y-6"
         >
           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
             <h2 className="text-xl lg:text-2xl font-bold flex items-center">
               <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                 <Rocket className="h-5 w-5 text-blue-500 mr-3 inline" />
                 Voting Leaderboard
               </span>
             </h2>
             
             <div className="text-base font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
               {totalCampaignVotes.toFixed(1)} total votes
             </div>
           </div>

           {/* Filtering and Search */}
           <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-6 mb-8">
             <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 bg-white/80 backdrop-blur-sm rounded-xl p-2 border border-blue-100">
               {[
                 { key: 'all', label: 'All Projects', count: sortedProjects.length, color: 'blue' },
                 { key: 'approved', label: 'Approved', count: approvedCount, color: 'green', icon: CheckCircle },
                 { key: 'pending', label: 'Pending', count: pendingCount, color: 'amber', icon: Clock }
               ].map((tab) => (
                 <motion.button
                   key={tab.key}
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                   onClick={() => setActiveTab(tab.key as any)}
                   className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
                     activeTab === tab.key
                       ? `bg-gradient-to-r ${
                           tab.color === 'blue' ? 'from-blue-500 to-purple-600' :
                           tab.color === 'green' ? 'from-green-500 to-emerald-600' :
                           'from-amber-500 to-orange-600'
                         } text-white shadow-lg`
                         : 'text-gray-600 hover:text-blue-600'
                        }`}
                        >
                       {tab.icon && <tab.icon className="h-4 w-4" />}
                       <span>{tab.label}</span>
                       <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                         activeTab === tab.key 
                           ? 'bg-white/20 text-white' 
                           : `bg-${tab.color}-100 text-${tab.color}-700`
                       }`}>
                         {tab.count}
                       </span>
                     </motion.button>
                   ))}
                 </div>
    
                 {/* Search Input */}
                 <div className="flex-1">
                   <div className="relative">
                     <input
                       type="text"
                       placeholder="Search projects..."
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                       className="w-full px-6 py-3 rounded-xl bg-white/80 backdrop-blur-sm border border-blue-100 focus:border-blue-300 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                     />
                     <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                   </div>
                 </div>
               </div>
    
               {/* Project Grid */}
               <motion.div 
                 layout
                 className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
               >
                 <AnimatePresence>
                   {filteredProjects
                     .filter(project => project.id !== undefined && project.id !== null)
                     .map((project, index) => {
                       const voteCount = Number(formatEther(project.voteCount || 0n));
                       const projectLogo = getProjectLogo(project);
                       const isApproved = project.participation?.approved === true;
                       const voteProgress = Math.min(100, (voteCount / 500) * 100); // Max 500 votes for full border
    
                       return (
                         <motion.div
                           key={project.id}
                           layout
                           initial={{ opacity: 0, y: 20 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, y: -20 }}
                           transition={{ duration: 0.3, delay: index * 0.1 }}
                           whileHover={{ y: -4, scale: 1.02 }}
                           onClick={() => isApproved && isActive ? openVoteModal(project) : null}
                           className={`
                             relative bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 p-6 cursor-pointer border-2 group overflow-hidden
                             ${isApproved && isActive ? 'hover:border-blue-300' : 'border-gray-200'}
                           `}
                           style={{
                             background: `linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)`,
                             borderImage: isApproved ? `linear-gradient(90deg, #10b981 ${voteProgress}%, #e5e7eb ${voteProgress}%) 1` : undefined
                           }}
                         >
                           {/* Vote Progress Border Effect */}
                           {isApproved && (
                             <div 
                               className="absolute inset-0 rounded-2xl pointer-events-none"
                               style={{
                                 background: `conic-gradient(from 0deg, #10b981 ${voteProgress * 3.6}deg, transparent ${voteProgress * 3.6}deg)`,
                                 padding: '2px',
                                 WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                 WebkitMaskComposite: 'xor',
                                 maskComposite: 'exclude'
                               }}
                             />
                           )}
    
                           {/* Position Badge */}
                           <motion.div 
                             initial={{ scale: 0 }}
                             animate={{ scale: 1 }}
                             transition={{ delay: index * 0.1 + 0.2 }}
                             className={`absolute -top-3 -left-3 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-lg z-10 ${
                               index === 0 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                               index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-500' :
                               index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                               'bg-gradient-to-r from-blue-400 to-blue-600'
                             }`}
                           >
                             {index < 3 ? (
                               <span className="text-lg">
                                 {index === 0 ? '👑' : index === 1 ? '🥈' : '🥉'}
                               </span>
                             ) : (
                               <span className="text-sm">{index + 1}</span>
                             )}
                           </motion.div>
    
                           {/* Approval Status */}
                           <div className="absolute top-4 right-4 flex items-center space-x-2">
                             <motion.div
                               initial={{ scale: 0 }}
                               animate={{ scale: 1 }}
                               transition={{ delay: index * 0.1 + 0.3 }}
                               className={`px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1 ${
                                 isApproved 
                                   ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200' 
                                   : 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border border-amber-200'
                               }`}
                             >
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
                             </motion.div>
    
                             {/* Admin Controls */}
                             {isAdmin && !isApproved && project.id !== undefined && project.id !== null && (
                               <div className="flex flex-col items-end space-y-1">
                                 <motion.button
                                   whileHover={{ scale: 1.05 }}
                                   whileTap={{ scale: 0.95 }}
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     handleApproveProject(BigInt(project.id));
                                   }}
                                   disabled={isApprovingProject}
                                   className="px-3 py-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-medium shadow-lg flex items-center space-x-1"
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
                                 </motion.button>
                                 
                                 {/* Help Button */}
                                 <motion.button
                                   whileHover={{ scale: 1.1 }}
                                   whileTap={{ scale: 0.9 }}
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setShowApproveHelp(
                                       project.id !== undefined && project.id !== null
                                         ? (project.id.toString() === showApproveHelp ? null : project.id.toString())
                                         : null
                                     );
                                   }}
                                   className="w-5 h-5 rounded-full bg-white border border-blue-200 hover:bg-blue-50 text-blue-500 flex items-center justify-center text-xs font-bold"
                                 >
                                   ?
                                 </motion.button>
    
                                 {/* Help Text */}
                                 <AnimatePresence>
                                   {(approveError === project.id?.toString() || showApproveHelp === project.id?.toString()) && (
                                     <motion.div
                                       initial={{ opacity: 0, scale: 0.9 }}
                                       animate={{ opacity: 1, scale: 1 }}
                                       exit={{ opacity: 0, scale: 0.9 }}
                                       className="absolute top-full right-0 mt-2 p-3 rounded-lg bg-yellow-50 border border-yellow-300 text-yellow-900 text-xs max-w-xs shadow-lg z-20"
                                     >
                                       <div className="font-bold mb-1 flex items-center">
                                         <span className="mr-1">⚠️</span> Trouble Approving?
                                       </div>
                                       <div>
                                         If you encounter an error, try approving directly from CeloScan.
                                         <br/>
                                         <a href="https://celoscan.io/address/0x0cc096b1cc568a22c1f02dab769881d1afe6161a#writeContract" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                                           Open CeloScan
                                         </a>
                                       </div>
                                     </motion.div>
                                   )}
                                 </AnimatePresence>
                               </div>
                             )}
                           </div>
    
                           {/* Project Content */}
                           <div className="relative z-10 pt-8">
                             <div className="flex items-start space-x-4 mb-4">
                               {/* Project Logo */}
                               <motion.div 
                                 whileHover={{ scale: 1.1 }}
                                 className="relative flex-shrink-0"
                               >
                                 {projectLogo ? (
                                   <img 
                                     src={formatIpfsUrl(projectLogo)} 
                                     alt={`${project.name} logo`}
                                     className="w-16 h-16 rounded-xl object-cover border-2 border-blue-200 shadow-md"
                                     onError={(e) => {
                                       const target = e.target as HTMLImageElement;
                                       target.style.display = 'none';
                                       const fallback = target.nextSibling as HTMLElement;
                                       if (fallback) fallback.style.display = 'flex';
                                     }}
                                   />
                                 ) : null}
                                 <div className={`w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-md border-2 border-blue-200 ${projectLogo ? 'hidden' : 'flex'}`}>
                                   {project.name?.charAt(0) || ''}
                                 </div>
                               </motion.div>
    
                               {/* Project Info */}
                               <div className="flex-1 min-w-0">
                                 <h3 className="font-bold text-gray-800 text-lg truncate group-hover:text-blue-600 transition-colors mb-2">
                                   {project.name || 'Untitled Project'}
                                 </h3>
                                 <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-3">
                                   {project.description}
                                 </p>
                                 
                                 {/* Vote Count Display */}
                                 <div className="mb-4">
                                   {project.id !== undefined && project.id !== null && (
                                     <ProjectVotes 
                                       campaignId={campaignId} 
                                       projectId={BigInt(project.id)} 
                                       onVoteCountReceived={updateProjectVoteCount}
                                     />
                                   )}
                                 </div>
                               </div>
                             </div>
    
                             {/* Action Buttons */}
                             <div className="flex items-center justify-between">
                               <motion.button
                                 whileHover={{ scale: 1.05 }}
                                 whileTap={{ scale: 0.95 }}
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   if (project?.id) {
                                     navigate(`/explorer/project/${project.id}`);
                                   }
                                 }}
                                 className="px-4 py-2 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 text-sm font-medium hover:shadow-md transition-all flex items-center space-x-2"
                               >
                                 <Eye className="h-4 w-4" />
                                 <span>View Details</span>
                               </motion.button>
    
                               {isActive && isApproved && (
                                 <motion.button
                                   whileHover={{ scale: 1.05 }}
                                   whileTap={{ scale: 0.95 }}
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     openVoteModal(project);
                                   }}
                                   className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
                                 >
                                   <Vote className="h-4 w-4" />
                                   <span>Vote</span>
                                 </motion.button>
                               )}
                             </div>
    
                             {/* Vote Progress Bar */}
                             <div className="mt-4">
                               <div className="flex justify-between items-center mb-2">
                                 <span className="text-xs text-gray-500">Vote Progress</span>
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
                           </div>
                         </motion.div>
                       );
                     })}
                 </AnimatePresence>
               </motion.div>
    
               {/* Empty State */}
               {filteredProjects.length === 0 && (
                 <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="text-center py-16 bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-blue-100"
                 >
                   <div className="text-6xl mb-6">🌊</div>
                   <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-3">
                     No Projects Found
                   </h3>
                   <p className="text-gray-600 mb-6">
                     {activeTab === 'approved' ? 'No approved projects in this campaign yet.' :
                      activeTab === 'pending' ? 'No pending projects in this campaign.' :
                      searchTerm ? `No projects match "${searchTerm}"` :
                      'No projects have joined this campaign yet.'}
                   </p>
                   <motion.button
                     whileHover={{ scale: 1.05 }}
                     whileTap={{ scale: 0.95 }}
                     onClick={handleBackToArena}
                     className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium shadow-lg"
                   >
                     <Rocket className="h-4 w-4 mr-2 inline" />
                     Explore Other Campaigns
                   </motion.button>
                 </motion.div>
               )}
             </motion.div>
           </div>
         </div>
    
         {/* Modals */}
         <AnimatePresence>
           {showAddProjectModal && (
             <AddProjectsToCampaignModal
               isOpen={showAddProjectModal}
               onClose={() => setShowAddProjectModal(false)}
               campaignId={campaignId.toString()}
               campaignName={campaignDetails?.campaign?.name || 'Untitled Campaign'}
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
         </AnimatePresence>
       </div>
     );
    }