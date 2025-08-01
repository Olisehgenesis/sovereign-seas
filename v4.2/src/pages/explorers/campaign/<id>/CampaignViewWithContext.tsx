// @ts-nocheck

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
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

import { useCampaignContext } from '@/context/CampaignContext';
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
import LocationBadge from '@/components/LocationBadge';
import { getNormalizedLocation } from '@/utils/locationUtils';

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

export default function CampaignViewWithContext() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { address, isConnected } = useAccount();
  
  // Get campaign context
  const campaignId = id ? BigInt(id) : BigInt(0);
  const {
    campaignDetails,
    campaignLoading,
    sortedProjects,
    sortedProjectsLoading,
    isAdmin,
    adminLoading,
    celoAmount,
    cusdAmount,
    totalVotes,
    vote,
    isVotePending,
    canBypassFees,
    approveProject,
    isApprovingProject,
    projectVoteCounts,
    updateProjectVoteCount,
    refetchAllData,
    campaignStatus
  } = useCampaignContext();
  
  // Local state
  const [isMounted, setIsMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'approved' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [expandedDescription, setExpandedDescription] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Campaign status and countdown
  const { hasStarted, hasEnded, isActive, startTime, endTime } = campaignStatus;
  const countdown = useCountdown(startTime, endTime);

  const handleVoteSuccess = async () => {
    setSelectedProject(null);
    setShowVoteModal(false);
    await new Promise(resolve => setTimeout(resolve, 300));
    await refetchAllData();
  };

  const handleVoteSubmitted = () => {
    console.log('Vote transaction submitted - closing modal');
    setShowVoteModal(false);
    setSelectedProject(null);
    window.location.reload();
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
        projectId: projectId.toString(),
        token: token as `0x${string}`,
        amount
      });
    },
    [campaignId, vote]
  );

  // Filter projects based on active tab
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

  // Handle project approval
  const handleApproveProject = async (projectId: bigint) => {
    try {
      await approveProject({
        campaignId,
        projectId
      });
      
      setTimeout(() => {
        refetchAllData();
      }, 2000);
      
    } catch (error) {
      console.error('Error approving project:', error);
    }
  };

  if (!isMounted) return null;

  if (campaignLoading || sortedProjectsLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 flex items-center justify-center relative overflow-hidden">
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

  // Calculate total campaign votes
  const totalCampaignVotes = sortedProjects.reduce((sum, project) => 
    sum + Number(formatEther(project.voteCount || 0n)), 0
  );

  // Get accurate counts for display
  const approvedCount = sortedProjects.filter(p => p.participation?.approved === true).length;
  const pendingCount = sortedProjects.filter(p => p.participation?.approved !== true).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background and content would go here - simplified for brevity */}
      <div className="relative z-10 flex min-h-screen">
        <div className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          <h1 className="text-2xl font-bold text-blue-600 mb-4">
            Campaign: {campaign.name}
          </h1>
          
          <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project, index) => (
              <div key={project.id} className="bg-white rounded-lg p-4 shadow-md">
                <h3 className="font-bold text-gray-800">{project.name}</h3>
                <p className="text-gray-600 text-sm">{project.description}</p>
                <div className="mt-2">
                  <span className="text-blue-600 font-bold">
                    {Number(formatEther(project.voteCount || 0n)).toFixed(1)} votes
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
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
  );
} 