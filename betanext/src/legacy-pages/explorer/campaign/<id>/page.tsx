// @ts-nocheck

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from '@/utils/nextAdapter';
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
import FundDonateModal from '@/components/modals/FundDonateModal';
import { useCampaignToPool, usePoolBalance, useDonateToPool, useCreatePoolUniversal } from '@/hooks/usePools';
import { supportedTokens } from '@/hooks/useSupportedTokens';
import { useAllProjects, formatProjectForDisplay, useCanBypassFees } from '@/hooks/useProjectMethods';
import { getMainContractAddress } from '@/utils/contractConfig';
import {
  useVote,
  useUserTotalVotesInCampaign,
  useCampaignTokenAmount,
} from '@/hooks/useVotingMethods';
import { formatIpfsUrl, ipfsImageLoader, extractIpfsCid } from '@/utils/imageUtils';
import Image from 'next/image';
import LocationBadge from '@/components/LocationBadge';
import { getNormalizedLocation } from '@/utils/locationUtils';
import TruncatedText from '@/components/TruncatedText';
import DynamicHelmet from '@/components/DynamicHelmet';
import { CampaignHero } from '@/components/campaign/CampaignHero';
import { CampaignPodium } from '@/components/campaign/CampaignPodium';
import { CampaignStats } from '@/components/campaign/CampaignStats';
import { CampaignProjectCard } from '@/components/campaign/CampaignProjectCard';
import { CampaignProjectsTable } from '@/components/campaign/CampaignProjectsTable';
import { CampaignUserVotingStatus } from '@/components/campaign/CampaignUserVotingStatus';
import { CampaignMobileHeader } from '@/components/campaign/CampaignMobileHeader';
import { ButtonCool } from '@/components/ui/button-cool';

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
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [campaignLogoSrc, setCampaignLogoSrc] = useState<string | null>(null);
  

  const contractAddress = getMainContractAddress();
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
  const celoTokenAddress = process.env.NEXT_PUBLIC_CELO_TOKEN;
  const cusdTokenAddress = process.env.NEXT_PUBLIC_CUSD_TOKEN;
  
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

  // Pool-related hooks
  const { poolId: campaignPoolId, isLoading: isLoadingPoolId } = useCampaignToPool(campaignId);
  const { balance: poolBalance, isLoading: isLoadingPoolBalance, error: poolBalanceError } = usePoolBalance(
    campaignPoolId !== undefined && campaignPoolId !== 0n ? campaignPoolId : 0n
  );
  const { donate, isPending: isDonating, error: donateError } = useDonateToPool();
  const { createPool, isPending: isCreatingPool } = useCreatePoolUniversal();

  const handleCreatePool = async () => {
    try {
      await createPool(campaignId, JSON.stringify({ campaignId: campaignId.toString() }));
      // Pool creation will trigger a refetch automatically
    } catch (error) {
      console.error('Error creating pool:', error);
    }
  };

  

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

      // Get approval status from participation data (authoritative source)
      const isApproved = participation ? participation[0] === true : false;
      
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
  }, [campaignProjectsBasic, participationData, projectIds]);

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

  // Compute campaign logo using useMemo to avoid hook order issues
  // Extract CID and use public gateway for reading
  const campaignLogoRaw = useMemo(() => {
    try {
      let logo: string | null = null;
      
      if (campaignDetails?.metadata?.mainInfo) {
        const mainInfo = JSON.parse(campaignDetails.metadata.mainInfo);
        if (mainInfo.logo) logo = mainInfo.logo;
      }
      
      if (!logo && campaignDetails?.metadata?.additionalInfo) {
        const additionalInfo = JSON.parse(campaignDetails.metadata.additionalInfo);
        if (additionalInfo.logo) logo = additionalInfo.logo;
        // Also check media.logo for consistency with campaigns page
        if (!logo && additionalInfo.media?.logo) logo = additionalInfo.media.logo;
      }
      
      // Format the logo URL if it exists - use public gateway for reading
      if (logo) {
        // Extract CID and use public gateway (strips custom gateway URLs)
        return formatIpfsUrl(logo);
      }
    } catch (e) {
      // If JSON parsing fails, return null
      console.warn('Error parsing campaign logo:', e);
    }
    return null;
  }, [campaignDetails?.metadata?.mainInfo, campaignDetails?.metadata?.additionalInfo]);

  // Initialize campaign logo state when raw logo changes
  useEffect(() => {
    if (campaignLogoRaw) {
      setCampaignLogoSrc(campaignLogoRaw);
    } else {
      setCampaignLogoSrc(null);
    }
  }, [campaignLogoRaw]);

  // Fallback function for IPFS gateway errors (similar to CampaignCard)
  // Always extracts CID and uses public gateways
  const getFallbackImageUrl = useCallback((src: string | undefined | null): string | null => {
    if (!src) return null;
    try {
      // Extract CID from any URL format
      const cid = extractIpfsCid(src);
      if (!cid) return null;

      // Always use public gateway for fallback (never use custom authenticated gateways)
      // Try ipfs.io first, then gateway.pinata.cloud as secondary
      const url = new URL(src);
      
      // If already using ipfs.io, try gateway.pinata.cloud
      if (url.hostname === 'ipfs.io') {
        return `https://gateway.pinata.cloud/ipfs/${cid}`;
      }
      
      // For any other gateway (including custom mypinata.cloud), use ipfs.io
      return `https://ipfs.io/ipfs/${cid}`;
    } catch {
      // If URL parsing fails, try to extract CID directly
      const cid = extractIpfsCid(src);
      return cid ? `https://ipfs.io/ipfs/${cid}` : null;
    }
  }, []);
  
  const handleImageError = useCallback((originalSrc: string) => {
    const fallback = getFallbackImageUrl(originalSrc);
    if (fallback && fallback !== originalSrc) {
      console.warn('[CampaignView] Image load failed, attempting fallback', {
        originalSrc,
        fallback,
      });
      setCampaignLogoSrc(fallback);
    } else {
      setCampaignLogoSrc(null);
    }
  }, [getFallbackImageUrl]);

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

  const handleDonateToPool = async (token: `0x${string}`, amount: bigint) => {
    if (!campaignPoolId || campaignPoolId === 0n) {
      throw new Error('No pool found for this campaign');
    }

    try {
      // Call the donate function with pool ID, token, amount, and a message
      const txHash = await donate(
        campaignPoolId,
        token,
        amount,
        `Donation to campaign pool for campaign ${campaignId.toString()}`
      );
      
      return { fundTxHash: txHash };
    } catch (error) {
      console.error('Error donating to pool:', error);
      throw error;
    }
  };

  const handleBackToArena = () => {
    navigate('/explorer/campaigns');
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

  const getProjectLogo = (project: any) => {
    try {
      let logo: string | null = null;
      
      if (project.additionalDataParsed?.logo) {
        logo = project.additionalDataParsed.logo;
      } else if (project.additionalData) {
        const additionalData = JSON.parse(project.additionalData);
        if (additionalData.logo) logo = additionalData.logo;
      }
      
      // Format the logo URL to use public gateway (strips custom gateway URLs)
      if (logo) {
        return formatIpfsUrl(logo);
      }
    } catch (e) {
      console.log('error parsing project logo', e);
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
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-indigo-50 via-blue-50 to-cyan-50">
        <div className="group relative w-full max-w-[22em]">
          {/* Pattern Overlays */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
              backgroundSize: '0.5em 0.5em'
            }}
          />
          
          {/* Main Card */}
          <div 
            className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2]"
            style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
          >
            {/* Accent Corner */}
            <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
            <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>

            {/* Title Area */}
            <div 
              className="relative px-[1.4em] py-[1.4em] text-white font-extrabold text-center border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
              style={{ 
                background: '#2563eb',
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
                backgroundBlendMode: 'overlay'
              }}
            >
              <span className="text-[1.2em]">Loading Campaign</span>
            </div>

            {/* Body */}
            <div className="relative px-[1.5em] py-[1.5em] z-[2] text-center">
              <div className="flex flex-col items-center space-y-4">
                {/* Loading Animation */}
                <div className="relative">
                  <motion.div
                    className="w-16 h-16 border-[0.3em] border-[#050505] border-t-[#2563eb] rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Waves className="h-8 w-8 text-[#2563eb]" />
                  </motion.div>
                </div>
                
                <p className="text-[#050505] text-[0.9em] font-medium">
                  Preparing the sovereign seas...
                </p>
                
                {/* Progress Dots */}
                <div className="flex space-x-2">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-[#2563eb] border-[0.1em] border-[#050505] rounded-full"
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

            {/* Corner Slice */}
            <div className="absolute bottom-0 left-0 w-[1.5em] h-[1.5em] bg-white border-r-[0.25em] border-t-[0.25em] border-[#050505] rounded-tl-[0.5em] z-[1]" />
          </div>
        </div>
      </div>
    );
  }

  if (!campaignDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="group relative w-full max-w-[22em]">
          {/* Pattern Overlays */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
              backgroundSize: '0.5em 0.5em'
            }}
          />
          
          {/* Main Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2] group-hover:shadow-[1em_1em_0_#000000] group-hover:-translate-x-[0.4em] group-hover:-translate-y-[0.4em] group-hover:scale-[1.02]"
            style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
          >
            {/* Accent Corner */}
            <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#00e0b0] rotate-45 z-[1]" />
            <div className="absolute top-[0.4em] right-[0.4em] text-[#050505] text-[1.2em] font-bold z-[2]">★</div>

            {/* Title Area */}
            <div 
              className="relative px-[1.4em] py-[1.4em] text-white font-extrabold text-center border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
              style={{ 
                background: '#2563eb',
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
                backgroundBlendMode: 'overlay'
              }}
            >
              <span className="text-[1.2em]">Campaign Not Found</span>
            </div>

            {/* Body */}
            <div className="relative px-[1.5em] py-[1.5em] z-[2] text-center">
              <div className="text-6xl mb-4">🌊</div>
              <p className="text-[#050505] text-[0.9em] leading-[1.4] font-medium mb-6">
                This campaign doesn't exist in the voting arena.
              </p>
              <ButtonCool
                onClick={handleBackToArena}
                text="Return to Arena"
                bgColor="#2563eb"
                hoverBgColor="#1d4ed8"
                borderColor="#050505"
                textColor="#ffffff"
                size="md"
              >
                <ArrowLeft className="w-4 h-4" />
              </ButtonCool>
            </div>

            {/* Corner Slice */}
            <div className="absolute bottom-0 left-0 w-[1.5em] h-[1.5em] bg-white border-r-[0.25em] border-t-[0.25em] border-[#050505] rounded-tl-[0.5em] z-[1]" />
          </motion.div>
        </div>
      </div>
    );
  }

  const campaign = campaignDetails.campaign;

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
        url: typeof window !== 'undefined' ? window.location.href : '',
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
      <CampaignMobileHeader
        campaignName={campaign.name || 'Untitled Campaign'}
        campaignLogoSrc={campaignLogoSrc}
        countdownPhase={countdown.phase}
        totalCampaignVotes={totalCampaignVotes}
        isAdmin={isAdmin}
        onImageError={handleImageError}
        onAddProject={() => setShowAddProjectModal(true)}
        onMenuClick={() => setSidebarOpen(true)}
        onAdminClick={handleAdminPanel}
      />

        <div className="relative z-10">
          {/* Top Podium Section - Mobile */}
          <div className="w-full mb-4 lg:hidden">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="px-4 py-3"
            >
              <CampaignPodium
                projects={sortedProjects}
                campaignTotalFunds={campaign?.totalFunds}
                getProjectLogo={getProjectLogo}
                isActive={isActive}
                onProjectClick={openVoteModal}
                isMobile={true}
              />
            </motion.div>
          </div>

        {/* Hero Section and Quadratic Distribution - Full Width */}
        <div className="w-full hidden lg:block">
          <div className="relative mb-2 overflow-hidden">
            <div className="relative z-10 px-8 py-2 lg:px-12 lg:py-3">
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-3">
                {/* Left Side - Campaign Info */}
                <div className="w-full lg:w-2/5 space-y-2">
                  <CampaignHero
                    campaign={campaign}
                    campaignLogoSrc={campaignLogoSrc}
                    countdown={countdown}
                    hasEnded={hasEnded}
                    isAdmin={isAdmin}
                    onAdminClick={handleAdminPanel}
                    onImageError={handleImageError}
                  />

                  {/* User Voting Status Section */}
                  {totalVotes && (
                    <CampaignUserVotingStatus
                      totalVotes={totalVotes}
                      totalCampaignVotes={totalCampaignVotes}
                    />
                  )}
                </div>

                {/* Right Side - Podium on Prize Pool Card */}
                <div className="w-full lg:w-3/5">
                  <div className="flex flex-col items-center gap-2">
                    {/* Podium Section */}
                    <CampaignPodium
                      projects={sortedProjects}
                      campaignTotalFunds={campaign?.totalFunds}
                      getProjectLogo={getProjectLogo}
                      isActive={isActive}
                      onProjectClick={openVoteModal}
                      isMobile={false}
                    />

                    {/* Prize Pool Card - Below Podium */}
                    <CampaignStats
                      poolBalance={poolBalance}
                      isLoadingPoolBalance={isLoadingPoolBalance}
                      poolBalanceError={poolBalanceError}
                      supportedTokens={supportedTokens}
                      onDonateClick={() => setShowDonateModal(true)}
                      isDonating={isDonating}
                      isAdmin={isAdmin}
                      onCreatePool={handleCreatePool}
                      campaignPoolId={campaignPoolId}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Projects Table */}
        <CampaignProjectsTable
          projects={sortedProjects}
          totalCampaignVotes={totalCampaignVotes}
          campaignTotalFunds={campaign?.totalFunds}
          hasEnded={hasEnded}
          isActive={isActive}
          isAdmin={isAdmin}
          getProjectLogo={getProjectLogo}
          onVoteClick={openVoteModal}
          onApproveProject={handleApproveProject}
          isApprovingProject={isApprovingProject}
          showUnapproved={showUnapproved}
          onToggleUnapproved={() => setShowUnapproved(!showUnapproved)}
          onAddProject={() => setShowAddProjectModal(true)}
        />

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

      {/* Donate to Pool Modal */}
      {showDonateModal && (
        <FundDonateModal
          isOpen={showDonateModal}
          onClose={() => setShowDonateModal(false)}
          title="Donate to Campaign Pool"
          onConfirm={handleDonateToPool}
          isSubmitting={isDonating}
        />
      )}
    </div>
  </div>
    </>
  );
}