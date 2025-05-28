// @ts-nocheck

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Search
} from 'lucide-react';
import { type AbiFunction } from 'viem';

import { useCampaignDetails, useApproveProject, useAddCampaignAdmin, useDistributeFunds, useIsCampaignAdmin } from '@/hooks/useCampaignMethods';
import VoteModal from '@/components/voteModal';
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

// Countdown Timer Hook
function useCountdown(endTime: number) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const difference = endTime - now;

      if (difference > 0) {
        setTimeLeft({
          hours: Math.floor(difference / 3600),
          minutes: Math.floor((difference % 3600) / 60),
          seconds: difference % 60
        });
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  return timeLeft;
}

export default function CampaignView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // UI state
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'verified' | 'unverified'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const contractAddress = import.meta.env.VITE_CONTRACT_V4;
  const campaignId = id ? BigInt(id) : BigInt(0);
  
  // All hooks remain the same...
  const { campaignDetails, isLoading: campaignLoading } = useCampaignDetails(
    contractAddress,
    campaignId
  );
  
  const { projects: allProjects, isLoading: projectsLoading } = useAllProjects(contractAddress);
  
  
  // Get token amounts for CELO and cUSD
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
  
  const { totalVotes } = useUserTotalVotesInCampaign(
    contractAddress,
    campaignId,
    address || '0x0000000000000000000000000000000000000000'
  );
  
  const { 
    vote, 
    isPending: isVoting, 
  } = useVote(contractAddress);
  
  

  // Data processing logic remains the same...
  const campaignProjectsBasic = useMemo(() => {
    return allProjects?.filter(projectDetails => {
      const formatted = formatProjectForDisplay(projectDetails);
      return formatted && projectDetails.project.campaignIds.some(cId => Number(cId) === Number(campaignId));
    }).map(formatProjectForDisplay).filter(Boolean) || [];
  }, [allProjects, campaignId]);

  const projectIds = useMemo(() => 
    campaignProjectsBasic
      .filter((project): project is NonNullable<typeof project> => project != null && project.id !== undefined)
      .map(project => BigInt(project.id)), 
    [campaignProjectsBasic]
  );

  const participationContracts = projectIds.map(projectId => ({
    address: contractAddress as `0x${string}`,
    abi: [{
      inputs: [{ name: 'projectId', type: 'uint256' }],
      name: 'getParticipation',
      outputs: [{ name: '', type: 'tuple' }],
      stateMutability: 'view',
      type: 'function'
    } satisfies AbiFunction],
    functionName: 'getParticipation',
    args: [projectId]
  }));

  const { data: participationData, isLoading: participationLoading } = useReadContracts({
    contracts: participationContracts,
    query: {
      enabled: !!contractAddress && !!campaignId && projectIds.length > 0
    }
  });

  const campaignProjects = useMemo(() => {
    if (!campaignProjectsBasic.length || !participationData) return [];

    return campaignProjectsBasic.map((project, index) => {
      const participation = participationData[index]?.result as [boolean, bigint, bigint] | undefined;
      const voteCount = participation ? participation[1] : 0n;
      
      return {
        ...project,
        voteCount,
        voteCountFormatted: formatEther(voteCount),
        participation: participation ? {
          approved: participation[0],
          voteCount: participation[1],
          fundsReceived: participation[2]
        } : null
      };
    });
  }, [campaignProjectsBasic, participationData]);

  const sortedProjects = useMemo(() => {
    return [...campaignProjects].sort((a, b) => {
      const aVotes = Number(a.voteCount || 0n);
      const bVotes = Number(b.voteCount || 0n);
      return bVotes - aVotes;
    });
  }, [campaignProjects]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Campaign status and countdown
  const now = Math.floor(Date.now() / 1000);
  const startTime = Number(campaignDetails?.campaign?.startTime || 0);
  const endTime = Number(campaignDetails?.campaign?.endTime || 0);
  const hasStarted = now >= startTime;
  const hasEnded = now >= endTime;
  const isActive = hasStarted && !hasEnded && campaignDetails?.campaign?.active;
  
  // Use countdown hook
  const countdown = useCountdown(endTime);

  const openVoteModal = (project: Project) => {
    setSelectedProject(project);
    setShowVoteModal(true);
  };

  const closeVoteModal = () => {
    setShowVoteModal(false);
    setSelectedProject(null);
  };

  const handleBackToArena = () => {
    navigate('/explore');
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
          badge: `#${index + 1}`,
          rank: `${index + 1}th`,
          glowColor: 'shadow-blue-400/30'
        };
    }
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
      // If JSON parsing fails, return null
    }
    //log teh logo
    console.log('project.additionalDataParsed', project.additionalDataParsed);
    console.log('project.additionalData', project.metadata);

    console.log('project', project);
    return null;
  };

  const handleVote = useCallback((projectId: bigint, token: string, amount: bigint) => {
    return vote({ campaignId, projectId, token: token as `0x${string}`, amount });
  }, [campaignId, vote]);

  // Filter projects based on active tab and search term
  const filteredProjects = useMemo(() => {
    // First get all projects in the campaign
    const campaignProjects = allProjects?.filter(projectDetails => {
      const formatted = formatProjectForDisplay(projectDetails);
      return formatted && projectDetails.project.campaignIds.some(cId => 
        Number(cId) === Number(campaignId)
      );
    }).map(formatProjectForDisplay).filter(Boolean) || [];
    
    // Then apply search and verification filters
    let filtered = [...campaignProjects];
    
    // Apply search filter
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(project => 
        project.name?.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query) ||
        (project.metadata?.bio && project.metadata.bio.toLowerCase().includes(query))
      );
    }
    
    // Apply verification filter
    switch (activeTab) {
      case 'verified':
        filtered = filtered.filter(project => project.verified);
        break;
      case 'unverified':
        filtered = filtered.filter(project => !project.verified);
        break;
      default:
        break;
    }
    
    // Sort by vote count
    return filtered.sort((a, b) => {
      const aVotes = Number(a.voteCount || 0n);
      const bVotes = Number(b.voteCount || 0n);
      return bVotes - aVotes;
    });
  }, [allProjects, campaignId, activeTab, searchTerm]);

  // Add hooks for project management
  const { addProjectToCampaign, isPending: isAddingProject } = useAddProjectToCampaign(contractAddress);
  const { isAdmin } = useCanBypassFees(contractAddress, campaignId);
  
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
        shouldPayFee: !isAdmin
      });
      
      setShowAddProjectModal(false);
      // Reload the page to show updated project list
      window.location.reload();
      
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

  if (!isMounted) return null;

  if (campaignLoading || projectsLoading || participationLoading) {
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
            className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center mx-auto group relative overflow-hidden"
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

  // Sovereign Seas Themed Sidebar Component
  const Sidebar = ({ className = "" }) => (
    <div className={`glass-morphism ${className} relative overflow-hidden`}>
      {/* Decorative wave pattern */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
      
      <div className="p-6 sticky top-4 space-y-6">
        {/* Campaign Stats */}
        <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 rounded-xl p-4 border border-blue-200/50 shadow-sm animate-float">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
            <BarChart3 className="h-4 w-4 text-blue-500 mr-2" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Campaign Analytics
            </span>
          </h3>
          
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center group">
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
                <Percent className="h-3 w-3 text-amber-500 mr-1" />
                Platform Fee
              </span>
              <span className="font-bold text-amber-600">{Number(campaign.adminFeePercentage)}%</span>
            </div>
          </div>
        </div>

        {/* Token Ocean */}
        <div className="bg-gradient-to-br from-emerald-50/80 to-cyan-50/80 rounded-xl p-4 border border-cyan-200/50 shadow-sm animate-float-delay-1">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
            <Waves className="h-4 w-4 text-cyan-500 mr-2" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 to-blue-600">
              Token Ocean
            </span>
          </h3>
          
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 flex items-center justify-center animate-shimmer">
                  <img 
                    src="/images/celo.png" 
                    alt="CELO"
                    className="w-4 h-4"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div className="text-white text-xs font-bold hidden">🪙</div>
                </div>
                <span className="text-gray-700 font-medium">CELO</span>
              </div>
              <span className="font-bold text-amber-600">{parseFloat(formatEther(celoAmount || 0n)).toFixed(1)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 flex items-center justify-center">
                  <img 
                    src="/images/cusd.png" 
                    alt="cUSD"
                    className="w-4 h-4"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div className="text-white text-xs font-bold hidden">$</div>
                </div>
                <span className="text-gray-700 font-medium">cUSD</span>
              </div>
              <span className="font-bold text-emerald-600">{parseFloat(formatEther(cusdAmount || 0n)).toFixed(1)}</span>
            </div>
            
            {/* Animated progress wave */}
            <div className="pt-2">
              <div className="text-xs text-gray-500 mb-2">Token Distribution</div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow-400 via-emerald-400 to-cyan-400 w-full relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Your Sovereign Power */}
        {isConnected && (
          <div className="bg-gradient-to-br from-indigo-50/80 to-purple-50/80 rounded-xl p-4 border border-indigo-200/50 shadow-sm animate-float-delay-2 relative overflow-hidden">
            <div className="absolute -top-1 -right-1 w-8 h-8 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-md"></div>
            
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
              <Zap className="h-4 w-4 text-indigo-500 mr-2" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                Your Sovereign Power
              </span>
            </h3>
            
            <div className="space-y-3 text-xs relative z-10">
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
            </div>
            
            {isActive && (
              <button
                onClick={() => {
                  if (sortedProjects.length > 0) {
                    openVoteModal(sortedProjects[0]);
                  }
                }}
                className="w-full mt-4 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center">
                  <Sparkles className="h-3 w-3 mr-1 group-hover:rotate-12 transition-transform duration-300" />
                  Cast Your Vote
                </span>
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
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
            </div>
            
            <div className="flex items-center space-x-2 text-xs">
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
            </div>
          </div>

          {/* Redesigned Compact Campaign Header */}
          <div className="glass-morphism rounded-xl p-4 shadow-xl mb-6 relative overflow-hidden group hover:shadow-2xl transition-all hover:-translate-y-1 duration-500">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
            
            <div className="relative z-10">
              {/* Top Row - Campaign Title and Status */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {/* Compact Campaign Logo */}
                  <div className="animate-float">
                    {campaignLogo ? (
                      <img 
                        src={formatIpfsUrl(campaignLogo)} 
                        alt={`${campaign.name} logo`}
                        className="w-12 h-12 rounded-lg object-cover border-2 border-blue-200 shadow-md group-hover:border-blue-300 transition-colors duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={`w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-md border-2 border-blue-200 group-hover:border-blue-300 transition-colors duration-300 ${campaignLogo ? 'hidden' : 'flex'}`}>
                      {campaign.name?.charAt(0) || ''}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 truncate">
                        {campaign.name || 'Untitled Campaign'}
                      </h1>
                      
                      {/* Enhanced Add to Campaign Button */}
                      {isActive && (
                        <button
                          onClick={() => setShowAddProjectModal(true)}
                          className="px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center space-x-2 group relative overflow-hidden"
                        >
                          <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
                          <span>Add to Campaign</span>
                          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-1">{campaign.description}</p>
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1 ${
                  isActive ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 animate-pulse' : 
                  hasEnded ? 'bg-gray-100 text-gray-700' : 
                  'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700'
                }`}>
                  <Clock className="h-3 w-3" />
                  <span>{hasEnded ? 'Voyage Complete' : isActive ? 'LIVE VOYAGE' : 'Preparing'}</span>
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

              {/* Enhanced Countdown Timer (Only when active) */}
              {isActive && !hasEnded && (
                <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm rounded-lg p-3 border border-blue-200/50">
                  <div className="flex items-center justify-center space-x-3">
                    <Timer className="h-4 w-4 text-blue-500 animate-wave" />
                    <div className="flex items-center space-x-1">
                      <div className="text-center">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-2 py-1 rounded-md font-mono text-sm font-bold shadow-md">
                          {Math.floor(countdown.hours / 24).toString().padStart(2, '0')}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">D</div>
                      </div>
                      <div className="text-blue-500 font-bold">:</div>
                      <div className="text-center">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-2 py-1 rounded-md font-mono text-sm font-bold shadow-md">
                          {(countdown.hours % 24).toString().padStart(2, '0')}
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
                      Until Voyage Ends
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Projects Leaderboard */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
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

            {/* Project Filtering Tabs */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex space-x-2 bg-white/80 backdrop-blur-sm rounded-lg p-1 border border-blue-200">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                    activeTab === 'all'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  All Projects
                </button>
                <button
                  onClick={() => setActiveTab('verified')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
                    activeTab === 'verified'
                      ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-emerald-600'
                  }`}
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Verified</span>
                </button>
                <button
                  onClick={() => setActiveTab('unverified')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
                    activeTab === 'unverified'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-amber-600'
                  }`}
                >
                  <XCircle className="h-4 w-4" />
                  <span>Unverified</span>
                </button>
              </div>

              {/* Search Input */}
              <div className="flex-1 max-w-md">
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
              const percentage = totalCampaignVotes > 0 ? ((voteCount / totalCampaignVotes) * 100).toFixed(1) : '0.0';
              const projectLogo = getProjectLogo(project);

              return (
                <div
                  key={project.id}
                  className={`
                    group glass-morphism rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 p-4 relative overflow-hidden
                    hover:-translate-y-2 gradient-border animate-float
                  `}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Enhanced Position Badge */}
                  <div className={`absolute -top-2 -left-2 w-10 h-10 rounded-full bg-gradient-to-r ${styling.bgGradient} shadow-lg ${styling.glowColor} flex items-center justify-center text-white font-bold text-sm border-2 border-white transform group-hover:scale-110 transition-transform duration-300`}>
                    {index < 3 ? styling.badge.split('')[0] : index + 1}
                  </div>

                  {/* Animated background glow for top 3 */}
                  {index < 3 && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${styling.bgGradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-xl`}></div>
                  )}

                  <div className="relative z-10 flex items-center space-x-4 pl-6">
                    {/* Enhanced Project Logo with Fallback */}
                    <div className="animate-float-delay-1 relative">
                      {projectLogo ? (
                        <img 
                          src={formatIpfsUrl(projectLogo)} 
                          alt={`${project.name} logo`}
                          className="w-12 h-12 rounded-lg object-cover border-2 border-blue-200 shadow-md group-hover:border-blue-300 group-hover:shadow-lg transition-all duration-300"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-lg font-bold shadow-md border-2 border-blue-200 group-hover:border-blue-300 group-hover:shadow-lg transition-all duration-300 ${projectLogo ? 'hidden' : 'flex'}`}>
                        {project.name?.charAt(0) || ''}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-800 text-lg truncate group-hover:text-blue-600 transition-colors duration-300">
                          {project.name || 'Untitled Project'}
                        </h3>
                        <div className="text-right ml-4">
                          <div className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                            {voteCount.toFixed(1)}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center justify-end">
                            <Heart className="h-3 w-3 mr-1 text-red-400" />
                            {percentage}%
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3 line-clamp-1">{project.description}</p>
                      
                      {/* Enhanced Progress Bar */}
                      <div className="mb-3">
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${styling.bgGradient} transition-all duration-1000 rounded-full relative`}
                            style={{ width: `${Math.min(100, parseFloat(percentage))}%` }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Enhanced Action Buttons */}
                      <div className="flex space-x-2">
                        {isActive && (
                          project.participation?.approved ? (
                            <button
                              onClick={() => openVoteModal(project)}
                              className={`
                                px-4 py-2 rounded-full text-white font-medium shadow-md transition-all duration-300 
                                hover:shadow-xl hover:-translate-y-1 flex items-center space-x-2 text-sm group/btn relative overflow-hidden
                                bg-gradient-to-r ${styling.bgGradient}
                              `}
                            >
                              <Vote className="h-3 w-3 group-hover/btn:rotate-12 transition-transform duration-300" />
                              <span>Cast Vote</span>
                              <Sparkles className="h-3 w-3 group-hover/btn:rotate-180 transition-transform duration-500" />
                              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></span>
                            </button>
                          ) : (
                            <div className="px-4 py-2 rounded-full bg-gray-100 text-gray-600 font-medium flex items-center space-x-2 text-sm">
                              <Clock className="h-3 w-3" />
                              <span>Not Yet Approved</span>
                            </div>
                          )
                        )}
                        
                        <button
                          onClick={() => project?.id ? navigate(`/explorer/project/${project.id.toString()}`) : null}
                          className="px-4 py-2 rounded-full bg-white text-blue-600 font-medium border border-blue-200 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center space-x-2 text-sm group/btn relative overflow-hidden"
                        >
                          <Eye className="h-3 w-3 group-hover/btn:scale-110 transition-transform duration-300" />
                          <span>Explore</span>
                          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-blue-100/50 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></span>
                        </button>
                      </div>
                    </div>

                    {/* Enhanced Winner Badge */}
                    {index < Number(campaign.maxWinners) && hasEnded && voteCount > 0 && (
                      <div className="absolute top-3 right-3 bg-gradient-to-r from-emerald-400 to-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse border border-emerald-300">
                        🏆 Sovereign Winner
                      </div>
                    )}
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
              <p className="text-gray-600">No projects have joined this sovereign voyage yet.</p>
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
                            <Loader2 className="h-4 w-4 animate-spin" />
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
          