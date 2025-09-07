// @ts-nocheck

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { parseIdParam, getProjectRoute } from '@/utils/hashids';
import { useAccount, useReadContracts } from 'wagmi';
import { formatEther } from 'viem';
import type { Address } from 'viem';
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
  CalendarClock,
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

import { useCampaignDetails, useApproveProject, useAddCampaignAdmin, useDistributeFunds, useIsCampaignAdmin, useSortedProjects, useParticipation } from '@/hooks/useCampaignMethods';
import { contractABI } from '@/abi/seas4ABI';
import VoteModal from '@/components/modals/voteModal';
import AddProjectsToCampaignModal from '@/components/modals/AddProjectsToCampaignModal';
import { useAllProjects, formatProjectForDisplay, useCanBypassFees } from '@/hooks/useProjectMethods';
import {
  useVote,
  useUserTotalVotesInCampaign,
  useCampaignTokenAmount,
} from '@/hooks/useVotingMethods';
import { formatIpfsUrl } from '@/utils/imageUtils';
import LocationBadge from '@/components/LocationBadge';
import { getNormalizedLocation } from '@/utils/locationUtils';
import TruncatedText from '@/components/TruncatedText';
import DynamicHelmet from '@/components/DynamicHelmet';

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


export default function CampaignView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { address, isConnected } = useAccount();
  
  // Move state declarations to the top
  const [isMounted, setIsMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'approved' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [showUnapproved, setShowUnapproved] = useState(false);
  

  const contractAddress = import.meta.env.VITE_CONTRACT_V4;
  const parsedId = parseIdParam(id);
  const campaignId = parsedId ? BigInt(parsedId) : BigInt(0);
  
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
      abi: contractABI,
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
      
      // Get vote count from participation data
      const voteCount = participation ? participation[1] : 0n;
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
  }, [campaignProjectsBasic, participationData, projectIds, approvedProjectIds]);

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

  const handleVoteSubmitted = () => {
    // Close the modal immediately when vote transaction is submitted
    console.log('Vote transaction submitted - closing modal');
    setShowVoteModal(false);
    setSelectedProject(null);
    //reload the page
    window.location.reload();
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-6">
          {/* Modern Loading Animation */}
          <div className="relative">
            <motion.div
              className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Waves className="h-8 w-8 text-blue-600" />
            </motion.div>
        </div>
        
          {/* Loading Text */}
          <div className="text-center space-y-2">
            <motion.h2 
              className="text-2xl font-bold text-gray-800"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              Loading Campaign
            </motion.h2>
            <p className="text-gray-600">
              Preparing the sovereign seas...
            </p>
            </div>
          
          {/* Progress Dots */}
          <div className="flex space-x-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-blue-600 rounded-full"
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut"
                }}
              />
            ))}
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
  const totalCampaignVotes = sortedProjects.length > 0 ? 
    sortedProjects.reduce((sum, project) => 
    sum + Number(formatEther(project.voteCount || 0n)), 0
    ) : 0;

  // Get accurate counts for display
  const approvedCount = sortedProjects.filter(p => p.participation?.approved === true).length;
  const pendingCount = sortedProjects.filter(p => p.participation?.approved !== true).length;

  

    return (
    <>
    {/* Dynamic Metadata */}
    <DynamicHelmet 
      config={{
        title: campaign?.name || 'Campaign',
        description: campaign?.description || `Join this ${campaign?.campaignType || 'funding'} campaign on Sovereign Seas`,
        image: campaign?.logo ? formatIpfsUrl(campaign.logo) : '/og-image.png',
        url: window.location.href,
        type: 'website'
      }}
    />
    
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-r from-blue-400/10 to-indigo-400/10 animate-float blur-3xl"></div>
        <div className="absolute top-1/2 right-1/5 w-80 h-80 rounded-full bg-gradient-to-r from-cyan-400/10 to-blue-400/10 animate-float-delay-1 blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-48 h-48 rounded-full bg-gradient-to-r from-indigo-400/10 to-purple-400/10 animate-float-delay-2 blur-3xl"></div>
                </div>
                
      {/* Mobile Bottom Sheet */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="bg-white/95 backdrop-blur-lg border-t border-gray-200/50 rounded-t-3xl shadow-2xl"
        >
          {/* Drag Handle - 50% smaller */}
          <div className="flex justify-center pt-1.5 pb-1">
            <div className="w-6 h-0.5 bg-gray-300 rounded-full"></div>
                </div>
                
          {/* Campaign Info */}
          <div className="px-3 pb-2">
                  <div className="flex items-center space-x-2">
              {/* Campaign Logo - Circular and 50% smaller */}
              <div className="w-8 h-8 rounded-full overflow-hidden border border-white shadow-md flex-shrink-0">
                {campaignLogo ? (
                  <img 
                    src={formatIpfsUrl(campaignLogo)} 
                    alt={`${campaign.name} logo`}
                    className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      const fallback = target.nextSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold ${campaignLogo ? 'hidden' : 'flex'}`}>
                  {campaign.name?.charAt(0) || '🚀'}
                  </div>
                </div>
                
              {/* Campaign Name and Status - 50% smaller */}
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-bold text-gray-900 truncate">
                  {campaign.name || 'Untitled Campaign'}
                </h1>
                <div className="flex items-center space-x-1 mt-0.5">
                  <div className={`px-1 py-0.5 rounded-full text-xs font-medium ${
                    countdown.phase === 'active' ? 'bg-green-100 text-green-700' : 
                    countdown.phase === 'ended' ? 'bg-gray-100 text-gray-700' : 
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {countdown.phase === 'ended' ? 'Ended' : 
                     countdown.phase === 'active' ? 'Live' : 
                     'Starting Soon'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {totalCampaignVotes.toFixed(1)} votes
                </div>
              </div>
          </div>

              {/* Action Buttons - Increased size by 2 */}
              <div className="flex items-center space-x-1">
                {/* Add Project Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAddProjectModal(true)}
                  className="p-1 bg-blue-100 rounded"
                >
                  <Plus className="h-5 w-5 text-blue-600" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSidebarOpen(true)}
                  className="p-1 bg-gray-100 rounded"
                >
                  <Menu className="h-5 w-5 text-gray-600" />
                </motion.button>

                {isAdmin && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAdminPanel}
                    className="p-1 bg-purple-100 rounded"
                  >
                    <Settings className="h-5 w-5 text-purple-600" />
                  </motion.button>
                )}
                      </div>
                    </div>
                      </div>
        </motion.div>
                    </div>

        <div className="relative z-10">
          {/* Top Podium Section - Moved from right side of hero, shown on mobile */}
          <div className="w-full mb-4 lg:hidden">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="px-4 py-3"
            >
              <div className="flex flex-row items-end justify-center space-x-4">
                {/* Horizontal Podium Divs - Reordered to put 1st in middle, half size */}
                {(() => {
                  // Only show approved projects in the podium
                  const approvedProjects = sortedProjects.filter(p => p.participation?.approved === true);
                  const topThree = approvedProjects.slice(0, 3);
                  // Reorder: 2nd place, 1st place, 3rd place
                  const reordered = [topThree[1], topThree[0], topThree[2]].filter(Boolean);
                  
                  // If no projects, show empty state
                  if (reordered.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center space-y-2 py-6">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <Rocket className="h-4 w-4 text-gray-400" />
                      </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-gray-600">No Projects Yet</p>
                          <p className="text-xs text-gray-500">Projects will appear here once they join the campaign</p>
                    </div>
                  </div>
                    );
                  }
                  
                  return reordered.map((project, index) => {
                      const voteCount = Number(formatEther(project.voteCount || 0n));
                  const projectLogo = getProjectLogo(project);
                  const isApproved = project.participation?.approved === true;
                  
                  // Calculate quadratic matching amount (simplified)
                      const totalWeight = sortedProjects.reduce((sum, p) => 
                        sum + Math.sqrt(Number(formatEther(p.voteCount || 0n))), 0
                      );
                  const quadraticWeight = Math.sqrt(voteCount);
                  const matchingAmount = totalWeight > 0 && campaign?.totalFunds ? 
                    (quadraticWeight / totalWeight) * Number(formatEther(campaign.totalFunds)) * 0.7 : 0;
                  
                  // Podium height and styling based on actual rank - half size
                  // index 0 = 2nd place, index 1 = 1st place, index 2 = 3rd place
                  const actualRank = index === 0 ? 2 : index === 1 ? 1 : 3;
                  const podiumHeight = actualRank === 1 ? 'h-28' : actualRank === 2 ? 'h-24' : 'h-22'; // Half of original
                  const podiumWidth = 'w-22'; // Half of original w-44
                      
                      return (
                    <div key={project.id} className="flex flex-col items-center">
                      {/* Position Badge - Above Card - half size */}
                      <div className="mb-1">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-lg ${
                          actualRank === 1 ? 'bg-gradient-to-br from-blue-500 to-blue-700' :
                          actualRank === 2 ? 'bg-gradient-to-br from-black to-gray-800' :
                          'bg-gradient-to-br from-gray-500 to-gray-700'
                        }`}>
                          {actualRank}
                            </div>
                              </div>

                      {/* Project Logo Above Card - half size */}
                      <div className="w-10 h-10 rounded-lg overflow-hidden mb-1.5 shadow-md border border-white/20">
                        {projectLogo ? (
                          <img 
                            src={formatIpfsUrl(projectLogo)} 
                            alt={`${project.name} logo`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 text-sm lg:text-lg font-bold ${projectLogo ? 'hidden' : 'flex'}`}>
                          {project.name?.charAt(0) || '🚀'}
                              </div>
          </div>

                      {/* Podium Card - half size */}
                      <motion.div
                        whileHover={{ scale: 1.02, y: -2 }}
                        className={`relative ${podiumWidth} ${podiumHeight} bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 overflow-hidden cursor-pointer`}
                        onClick={() => isApproved && isActive ? openVoteModal(project) : null}
                      >
                        {/* Animated Background Gradient */}
                        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-blue-500/10 to-indigo-500/10"></div>
                        
                        {/* Div Body - Votes and Matching - half size */}
                        <div className="relative z-10 p-2 h-full flex flex-col items-center text-center">
                          {/* Vote Amount */}
                          <div className="text-center">
                            <div className="text-sm font-bold text-blue-500">
                              {voteCount.toFixed(1)} <span className="text-xs">votes</span>
                  </div>
                  </div>

                          {/* Matching Amount */}
                          <div className="text-center mt-1">
                            <div className="text-xs font-semibold text-black">
                              ~{matchingAmount.toFixed(1)} CELO
                    </div>
                            <div className="hidden text-xs text-black/50">m</div>
                </div>
            </div>
                      </motion.div>
      </div>
    );
                });
                })()}
              </div>
            </motion.div>
      </div>

        {/* Hero Section and Quadratic Distribution - Full Width */}
        <div className="w-full">
          {/* NEW HERO SECTION - Hidden on mobile, shown on desktop */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="relative mb-4 overflow-hidden hidden lg:block"
          >
            <div className="relative z-10 px-16 py-4 lg:px-24 lg:py-6">
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 lg:gap-4">
                {/* Left Side - Campaign Info */}
                <div className="w-full lg:w-2/5 space-y-4">
                  {/* Campaign Logo and Title */}
                  <div className="flex items-center space-x-6">
                    <div className="relative w-20 h-20 lg:w-24 lg:h-24 flex-shrink-0">
                      {campaignLogo ? (
                        <img 
                          src={formatIpfsUrl(campaignLogo)} 
                          alt={`${campaign.name} logo`}
                          className="w-full h-full rounded-full object-cover border-2 border-gray-200 shadow-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center text-gray-600 text-3xl lg:text-4xl font-bold shadow-lg border-2 border-gray-200 ${campaignLogo ? 'hidden' : 'flex'}`}>
                        {campaign.name?.charAt(0) || '🚀'}
                      </div>
                    </div>

                    <div className="flex-1">
                      <motion.h1 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-xl lg:text-2xl xl:text-3xl font-bold text-black mb-2"
                      >
                        {campaign.name || 'Untitled Campaign'}
                      </motion.h1>
                      
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-sm lg:text-base leading-relaxed"
                      >
                        <TruncatedText
                          text={campaign.description || 'A sovereign funding campaign for innovative projects.'}
                          maxLength={200}
                          className="text-black/80"
                          showIcon={true}
                          expandText="Read more"
                          collapseText="Show less"
                        />
                      </motion.div>
                    </div>
                  </div>

                  {/* Campaign Details */}
                  <div className="flex flex-col sm:flex-row gap-4 text-sm items-center">
                    <span className="text-black/70">
                      <Trophy className="h-4 w-4 inline mr-2 text-yellow-600" />
                      Max Winners: <span className="font-bold text-black">{Number(campaign.maxWinners) || 'All'}</span>
                    </span>
                    <span className="text-black/70">
                      <Target className="h-4 w-4 inline mr-2 text-blue-600" />
                      Distribution: <span className="font-bold text-black">{campaign.useQuadraticDistribution ? 'Quadratic' : 'Linear'}</span>
                    </span>
                    {isAdmin && (
                      <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAdminPanel}
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 px-4 py-2 h-9"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Admin Panel</span>
                      </motion.button>
                    )}
                  </div>

                  {/* User Voting Status Section */}
                  {totalVotes && Number(formatEther(totalVotes)) > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="mt-4 -mr-20 lg:-mr-32"
                    >
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-black">
                          <CalendarClock className="h-4 w-4" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-black">
                            You have voted {Number(formatEther(totalVotes)).toFixed(1)} votes
                          </p>
                          <p className="text-xs text-black/70 mt-1">
                            {totalCampaignVotes > 0 ? ((Number(formatEther(totalVotes)) / totalCampaignVotes) * 100).toFixed(1) : '0.0'}% contribution to total votes
                          </p>
                        </div>
                      </div>
                      
                      {/* Token Logos */}
                      <div className="flex items-center justify-center space-x-4 mt-4">
                        <img 
                          src="/cusd-logo.png" 
                          alt="cUSD" 
                          className="w-8 h-8"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                        <img 
                          src="/celo-logo.png" 
                          alt="CELO" 
                          className="w-8 h-8"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                        <img 
                          src="/good-dollar-logo.png" 
                          alt="Good Dollar" 
                          className="w-8 h-8"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Right Side - Podium Divs */}
                <div className="w-full lg:w-3/5">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-row items-end justify-center space-x-8"
                  >
                    {/* Horizontal Podium Divs - Reordered to put 1st in middle */}
                    {(() => {
                      // Only show approved projects in the podium
                      const approvedProjects = sortedProjects.filter(p => p.participation?.approved === true);
                      const topThree = approvedProjects.slice(0, 3);
                      // Reorder: 2nd place, 1st place, 3rd place
                      const reordered = [topThree[1], topThree[0], topThree[2]].filter(Boolean);
                      
                      // If no projects, show empty state
                      if (reordered.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center space-y-4 py-12">
                            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                              <Rocket className="h-8 w-8 text-gray-400" />
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-semibold text-gray-600">No Projects Yet</p>
                              <p className="text-sm text-gray-500">Projects will appear here once they join the campaign</p>
                            </div>
                          </div>
                        );
                      }
                      
                      return reordered.map((project, index) => {
                      const voteCount = Number(formatEther(project.voteCount || 0n));
                      const projectLogo = getProjectLogo(project);
                      const isApproved = project.participation?.approved === true;
                      
                      // Calculate quadratic matching amount (simplified)
                      const totalWeight = sortedProjects.reduce((sum, p) => 
                        sum + Math.sqrt(Number(formatEther(p.voteCount || 0n))), 0
                      );
                      const quadraticWeight = Math.sqrt(voteCount);
                      const matchingAmount = totalWeight > 0 && campaign?.totalFunds ? 
                        (quadraticWeight / totalWeight) * Number(formatEther(campaign.totalFunds)) * 0.7 : 0;
                      
                      // Podium height and styling based on actual rank
                      // index 0 = 2nd place, index 1 = 1st place, index 2 = 3rd place
                      const actualRank = index === 0 ? 2 : index === 1 ? 1 : 3;
                      const podiumHeight = actualRank === 1 ? 'h-56' : actualRank === 2 ? 'h-48' : 'h-44'; // 10% increase from previous sizes
                      const podiumWidth = 'w-44'; // 35% reduction from w-64 (256px * 0.65 = 166px, closest is w-44 at 176px)
                      
                      return (
                        <div key={project.id} className="flex flex-col items-center">
                          {/* Position Badge - Above Card */}
                          <div className="mb-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-lg ${
                              actualRank === 1 ? 'bg-gradient-to-br from-blue-500 to-blue-700' :
                              actualRank === 2 ? 'bg-gradient-to-br from-black to-gray-800' :
                              'bg-gradient-to-br from-gray-500 to-gray-700'
                            }`}>
                              {actualRank}
                            </div>
                          </div>


                          {/* Project Logo Above Card */}
                          <div className="w-20 h-20 rounded-xl overflow-hidden mb-3 shadow-lg border-2 border-white/20">
                            {projectLogo ? (
                              <img 
                                src={formatIpfsUrl(projectLogo)} 
                                alt={`${project.name} logo`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const fallback = target.nextSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 text-sm lg:text-lg font-bold ${projectLogo ? 'hidden' : 'flex'}`}>
                              {project.name?.charAt(0) || '🚀'}
                            </div>
                          </div>

                          {/* Project Name Above Card */}
                          <h4 className="font-bold text-black text-sm mb-3 line-clamp-1 text-center">
                            {project.name || 'Untitled Project'}
                          </h4>

                          {/* Card */}
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + index * 0.1 }}
                            whileHover={{ scale: 1.02, y: -4 }}
                            className={`relative ${podiumWidth} ${podiumHeight} rounded-t-2xl overflow-hidden`}
                          style={{
                            background: `linear-gradient(135deg, 
                              rgba(59, 130, 246, 0.15) 0%, 
                              rgba(59, 130, 246, 0.08) 30%,
                              rgba(255, 255, 255, 0.1) 70%,
                              rgba(255, 255, 255, 0.05) 100%)`,
                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1),
                                        0 -2px 8px rgba(0,0,0,0.1),
                                        0 -1px 4px rgba(0,0,0,0.05)`,
                            border: `none`,
                          }}
                        >
                          
                          


                          {/* White Base Shadow */}
                          <div 
                            className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-3/4 h-4 rounded-full opacity-40"
                            style={{
                              background: `linear-gradient(to bottom, 
                                rgba(255, 255, 255, 0.6) 0%, 
                                rgba(255, 255, 255, 0.3) 50%,
                                transparent 100%)`,
                              filter: 'blur(6px)'
                            }}
                          />

                          {/* Card Content */}
                          <div className="relative z-10 p-4 h-full flex flex-col items-center text-center">
                            {/* Div Body - Votes and Matching */}
                            <div className="flex-1 flex flex-col justify-center space-y-2 w-full">
                              {/* Vote Amount */}
                              <div className="text-center">
                                <div className="text-4xl font-bold text-blue-500">
                                  {voteCount.toFixed(1)} <span className="text-sm">votes</span>
                                </div>
                              </div>

                              {/* Matching Amount */}
                              <div className="text-center">
                                <div className="text-lg font-semibold text-black">
                                  ~{matchingAmount.toFixed(1)} CELO
                                </div>
                                <div className="text-xs text-black/60">matched</div>
                              </div>
                            </div>
                          </div>
                          </motion.div>
                        </div>
                      );
                    });
                    })()}
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>

                  </div>

        {/* Countdown - Show on both mobile and desktop when campaign hasn't ended */}
        {!hasEnded && (
          <div className="px-4 py-2">
              <div className="text-center">
              <div className="text-lg font-semibold text-gray-700">
                {countdown.days}d {countdown.hours}h {countdown.minutes}m
                  </div>
                  </div>
                </div>
        )}

        {/* Projects Table */}
        <div className="relative z-10 pl-4 pr-0 py-2 lg:py-8 lg:px-24 pb-32 lg:pb-8">
          <div className="bg-transparent overflow-hidden pl-4 pr-0 lg:px-16">
            {/* Table Header with Stats and Toggle */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-2 sm:space-y-0">
              {/* Total Stats - Hidden on mobile */}
              <div className="hidden sm:flex items-center space-x-3 sm:space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Total Projects:</span>
                  <span className="text-sm font-semibold text-gray-800">{sortedProjects.filter(p => p.participation?.approved === true).length}</span>
              </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Total Votes:</span>
                  <span className="text-sm font-semibold text-gray-800">{totalCampaignVotes.toFixed(1)}</span>
            </div>
        </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-1 sm:space-x-2">
                {/* Add Project Button - Hidden on mobile */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAddProjectModal(true)}
                  className="hidden sm:flex items-center space-x-2 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors rounded-lg"
              >
                  <Plus className="h-4 w-4" />
                  <span>Add Project</span>
              </motion.button>

                {/* Toggle for Unapproved Projects - Hidden on mobile */}
                <button
                  onClick={() => setShowUnapproved(!showUnapproved)}
                  className="hidden sm:flex items-center space-x-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 rounded-lg"
                >
                  <span>Unapproved Projects</span>
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                    {sortedProjects.filter(p => p.participation?.approved !== true).length}
                  </span>
                <motion.div
                    animate={{ rotate: showUnapproved ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ArrowLeft className="h-4 w-4" />
                </motion.div>
                </button>
              </div>
            </div>
            
            <div className="flex justify-center">
              <table className="w-full max-w-4xl">
                <thead className="bg-transparent hidden lg:table-header-group">
                  <tr>
                    <th className="px-0.5 py-2 lg:px-2 lg:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                    <th className="px-0.5 py-2 lg:px-2 lg:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                    <th className="px-0.5 py-2 lg:px-2 lg:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vote Participation</th>
                    <th className="px-0.5 py-2 lg:px-2 lg:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Votes</th>
                    <th className={`px-0.5 py-2 lg:px-2 lg:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${!hasEnded ? 'hidden lg:table-cell' : ''}`}>Matching</th>
                    <th className={`px-0.5 py-2 lg:px-2 lg:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${hasEnded ? 'hidden lg:table-cell' : ''}`}>Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {/* Approved Projects */}
                  {(() => {
                    const approvedProjects = sortedProjects.filter(p => p.participation?.approved === true);
                    // Group projects by vote count to assign same position to projects with same votes
                    const positionMap = new Map();
                    let currentPosition = 1;
                    
                    approvedProjects.forEach((project, index) => {
                      const voteCount = Number(formatEther(project.voteCount || 0n));
                      
                      if (index === 0) {
                        // First project always gets position 1
                        positionMap.set(project.id, 1);
                        currentPosition = 1;
                      } else {
                        const prevVoteCount = Number(formatEther(approvedProjects[index - 1].voteCount || 0n));
                        if (voteCount !== prevVoteCount) {
                          // Different vote count, increment position
                          currentPosition = index + 1;
                        }
                        // Same vote count keeps the same position
                        positionMap.set(project.id, currentPosition);
                      }
                    });
                    
                    return approvedProjects.map((project, index) => {
                      const voteCount = Number(formatEther(project.voteCount || 0n));
                      const projectLogo = getProjectLogo(project);
                      const isApproved = project.participation?.approved === true;
                      const position = positionMap.get(project.id);
                    
                    // Calculate percentage of total votes
                    const votePercentage = totalCampaignVotes > 0 ? (voteCount / totalCampaignVotes) * 100 : 0;
                    
                    // Calculate matching amount
                    const totalWeight = sortedProjects.reduce((sum, p) => 
                      sum + Math.sqrt(Number(formatEther(p.voteCount || 0n))), 0
                    );
                    const quadraticWeight = Math.sqrt(voteCount);
                    const matchingAmount = totalWeight > 0 && campaign?.totalFunds ? 
                      (quadraticWeight / totalWeight) * Number(formatEther(campaign.totalFunds)) * 0.7 : 0;
                    
                    return (
                      <tr 
                        key={project.id} 
                        className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                        onClick={() => isApproved && isActive ? openVoteModal(project) : null}
                      >
                        {/* Position */}
                        <td className="px-0.5 py-2 lg:px-2 lg:py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              position === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' :
                              position === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' :
                              position === 3 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {position}
            </div>
                </div>
                        </td>
                        
                        {/* Logo - Hidden on mobile */}
                        <td className="hidden lg:table-cell px-0.5 py-2 lg:px-2 lg:py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 lg:w-12 lg:h-12 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                              {projectLogo ? (
                                <img 
                                  src={formatIpfsUrl(projectLogo)} 
                                  alt={`${project.name} logo`}
                                  className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                              <div className={`w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 text-sm lg:text-lg font-bold ${projectLogo ? 'hidden' : 'flex'}`}>
                                {project.name?.charAt(0) || '🚀'}
                    </div>
                      </div>
                    </div>
                        </td>
                        
                        {/* Vote Participation - Compact on mobile */}
                        <td className="px-0.5 py-2 lg:px-2 lg:py-4 w-1/4">
                          <div className="space-y-1 lg:space-y-2">
                            <div className="flex items-center space-x-1 max-w-[120px] lg:max-w-xs">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(getProjectRoute(Number(project.id)));
                                }}
                                className="text-xs lg:text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors flex-1 text-left"
                              >
                                {project.name || 'Untitled Project'}
                              </button>
                              {project.description && (
                                <div className="hidden lg:block relative group">
                                  <Info className="h-3 w-3 text-gray-400 hover:text-gray-600 cursor-help" />
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap max-w-xs z-10">
                                    {project.description}
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                  </div>
                            </div>
                          )}
                    </div>
                            <div className="hidden lg:flex items-center space-x-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-1.5 lg:h-2">
                                <div 
                                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-1.5 lg:h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(votePercentage, 100)}%` }}
                                ></div>
                  </div>
                              <span className="text-xs text-gray-500 font-medium">
                                {votePercentage.toFixed(1)}%
                        </span>
                      </div>
                          </div>
                        </td>
                        
                        {/* Total Votes - Compact on mobile */}
                        <td className="px-0.5 py-2 lg:px-2 lg:py-4 whitespace-nowrap">
                          <div className="text-xs lg:text-sm font-semibold text-gray-900">
                            {voteCount.toFixed(1)}
                </div>
                          <div className="text-xs text-gray-500">votes</div>
                        </td>
                        
                        {/* Matching - Hidden on mobile if campaign running */}
                        <td className={`px-0.5 py-2 lg:px-2 lg:py-4 whitespace-nowrap ${!hasEnded ? 'hidden lg:table-cell' : ''}`}>
                          <div className="text-xs lg:text-sm font-semibold text-green-600">
                            {matchingAmount.toFixed(2)} CELO
              </div>
                          <div className="text-xs text-gray-500">{hasEnded ? 'funded' : 'estimated'}</div>
                        </td>
                        
                        {/* Vote Button - Hidden on mobile if campaign ended */}
                        <td className={`px-0.5 py-2 lg:px-2 lg:py-4 whitespace-nowrap ${hasEnded ? 'hidden lg:table-cell' : ''}`}>
                          {isActive && isApproved ? (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => openVoteModal(project)}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            >
                              <Vote className="h-4 w-4 mr-1" />
                              Vote
                            </motion.button>
                          ) : !isActive ? (
                            <span className="inline-flex items-center px-3 py-2 text-sm text-gray-500 bg-gray-100 rounded-md">
                              <Clock className="h-4 w-4 mr-1" />
                              {hasEnded ? 'Ended' : 'Pending'}
                  </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-2 text-sm text-gray-500 bg-gray-100 rounded-md">
                              <XCircle className="h-4 w-4 mr-1" />
                              Not Approved
                  </span>
                          )}
                        </td>
                      </tr>
                    );
                  });
                  })()}
                  
                  {/* Unapproved Projects - Hidden by default */}
                  {showUnapproved && sortedProjects.filter(p => p.participation?.approved !== true).map((project, index) => {
                    const voteCount = Number(formatEther(project.voteCount || 0n));
                    const projectLogo = getProjectLogo(project);
                    const isApproved = project.participation?.approved === true;
                    
                    // Calculate percentage of total votes
                    const votePercentage = totalCampaignVotes > 0 ? (voteCount / totalCampaignVotes) * 100 : 0;
                    
                    // Calculate matching amount
                    const totalWeight = sortedProjects.reduce((sum, p) => 
                      sum + Math.sqrt(Number(formatEther(p.voteCount || 0n))), 0
                    );
                    const quadraticWeight = Math.sqrt(voteCount);
                    const matchingAmount = totalWeight > 0 && campaign?.totalFunds ? 
                      (quadraticWeight / totalWeight) * Number(formatEther(campaign.totalFunds)) * 0.7 : 0;

                    return (
                      <tr 
                        key={project.id}
                        className="hover:bg-gray-50/50 transition-colors bg-gray-100/30 cursor-pointer"
                        onClick={() => isApproved && isActive ? openVoteModal(project) : null}
                      >
                        {/* Position - Show dash for unapproved */}
                        <td className="px-0.5 py-2 lg:px-2 lg:py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-sm">
                              -
                            </div>
                          </div>
                        </td>
                        
                        {/* Logo - Hidden on mobile */}
                        <td className="hidden lg:table-cell px-0.5 py-2 lg:px-2 lg:py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 lg:w-12 lg:h-12 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                                {projectLogo ? (
                                <img 
                                    src={formatIpfsUrl(projectLogo)} 
                                    alt={`${project.name} logo`}
                                  className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const fallback = target.nextSibling as HTMLElement;
                                      if (fallback) fallback.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                              <div className={`w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 text-sm lg:text-lg font-bold ${projectLogo ? 'hidden' : 'flex'}`}>
                                    {project.name?.charAt(0) || '🚀'}
                              </div>
                            </div>
                                </div>
                        </td>
                        
                        {/* Vote Participation - Compact on mobile */}
                        <td className="px-0.5 py-2 lg:px-2 lg:py-4 w-1/4">
                          <div className="space-y-1 lg:space-y-2">
                            <div className="flex items-center space-x-1 max-w-[120px] lg:max-w-xs">
                              <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                      navigate(getProjectRoute(Number(project.id)));
                                }}
                                className="text-xs lg:text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors flex-1 text-left"
                              >
                              {project.name || 'Untitled Project'}
                              </button>
                              {project.description && (
                                <div className="hidden lg:block relative group">
                                  <Info className="h-3 w-3 text-gray-400 hover:text-gray-600 cursor-help" />
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap max-w-xs z-10">
                                    {project.description}
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                </div>
                                  </div>
                                )}
                              </div>
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-1.5 lg:h-2">
                                <div 
                                  className="bg-gradient-to-r from-gray-400 to-gray-500 h-1.5 lg:h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(votePercentage, 100)}%` }}
                                ></div>
                            </div>
                              <span className="text-xs text-gray-500 font-medium">
                                {votePercentage.toFixed(1)}%
                              </span>
                            </div>
                        </div>
                        </td>
                        
                        {/* Total Votes - Compact on mobile */}
                        <td className="px-0.5 py-2 lg:px-2 lg:py-4 whitespace-nowrap">
                          <div className="text-xs lg:text-sm font-semibold text-gray-600">
                            {voteCount.toFixed(1)}
          </div>
                          <div className="text-xs text-gray-500">votes</div>
                        </td>
                        
                        {/* Matching - Hidden on mobile if campaign running */}
                        <td className={`px-0.5 py-2 lg:px-2 lg:py-4 whitespace-nowrap ${!hasEnded ? 'hidden lg:table-cell' : ''}`}>
                          <div className="text-xs lg:text-sm font-semibold text-gray-500">
                            -
                          </div>
                          <div className="text-xs text-gray-500">not eligible</div>
                        </td>
                        
                        {/* Action - Hidden on mobile if campaign ended */}
                        <td className={`px-0.5 py-2 lg:px-2 lg:py-4 whitespace-nowrap ${hasEnded ? 'hidden lg:table-cell' : ''}`}>
                          {isAdmin ? (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApproveProject(project.id);
                              }}
                              disabled={isApprovingProject}
                              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded-md transition-colors"
                            >
                              {isApprovingProject ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  Approving...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </>
                              )}
                            </motion.button>
                          ) : (
                            <span className="inline-flex items-center px-3 py-2 text-sm text-gray-500 bg-gray-100 rounded-md">
                              <XCircle className="h-4 w-4 mr-1" />
                              Not Approved
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  
                  {/* Empty State */}
                  {sortedProjects.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center space-y-4">
                          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                            <Rocket className="h-8 w-8 text-gray-400" />
              </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-600">No Projects Yet</h3>
                            <p className="text-sm text-gray-500">Projects will appear here once they join the campaign</p>
            </div>
                </div>
                      </td>
                    </tr>
          )}
                </tbody>
              </table>
              </div>
            </div>
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
          onVoteSubmitted={handleVoteSubmitted}
        />
      )}
    </div>
  </div>
    </>
);
}