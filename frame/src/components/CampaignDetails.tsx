"use client";

import { useState, useEffect, useMemo } from "react";
import { useAccount } from "wagmi";
import { formatEther, parseEther } from "viem";
import { motion, AnimatePresence } from "framer-motion";
import sdk, { type Context } from "@farcaster/frame-sdk";
import { 
  Trophy, 
  Users, 
  Clock, 
  Vote, 
  Coins, 
  Flame,
  Crown,
  Award,
  Star,
  TrendingUp,
  Calendar,
  Percent,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  StopCircle,
  ChevronRight,
  Heart,
  Share2,
  Bookmark,
  Eye,
  Zap,
  Loader2,
  Search
} from "lucide-react";
import { useCampaignDetails } from "../hooks/useCampaignMethods";
import { useVote } from "../hooks/useVotingMethods";
import { useCampaignProjects, useProjectParticipations } from "../hooks/useProjectMethods";
import { formatIpfsUrl } from "../hooks/utils";
import { CampaignMetadata } from "../hooks/types";
import { storeVote, updateVoteStatus, getVoteStats } from "../services/voteStorage";

// Helper function to safely parse JSON
const safeJsonParse = (jsonString: string, fallback = {}) => {
  try {
    return jsonString ? JSON.parse(jsonString) : fallback;
  } catch (e) {
    console.warn('Failed to parse JSON:', e);
    return fallback;
  }
};

// Helper function to parse campaign metadata
const parseCampaignMetadata = (metadata: CampaignMetadata) => {
  const mainInfo = safeJsonParse(metadata.mainInfo as string);
  const additionalInfo = safeJsonParse(metadata.additionalInfo as string);
  
  return {
    type: mainInfo.type || '',
    category: mainInfo.category || '',
    tags: mainInfo.tags || [],
    logo: mainInfo.logo || additionalInfo.logo || '',
    website: mainInfo.website || '',
    socialLinks: mainInfo.socialLinks || {},
    description: mainInfo.description || '',
    goals: mainInfo.goals || [],
    rewards: mainInfo.rewards || [],
    requirements: mainInfo.requirements || []
  };
};

const contractAddress = "0x0cc096b1cc568a22c1f02dab769881d1afe6161a";

interface CampaignDetailsProps {
  campaignId: number;
}

export default function CampaignDetails({ campaignId }: CampaignDetailsProps) {
  const { address } = useAccount();
  const [context, setContext] = useState<Context.FrameContext>();
  
  const [selectedProject, setSelectedProject] = useState<Record<string, unknown> | null>(null);
  const [voteAmount, setVoteAmount] = useState("");
  const [likedProjects, setLikedProjects] = useState<Set<number>>(new Set());
  const [bookmarkedProjects, setBookmarkedProjects] = useState<Set<number>>(new Set());
  const [showVoteForm, setShowVoteForm] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"votes" | "funds" | "name">("votes");
  const [filterApproved, setFilterApproved] = useState(true);

  const { campaignDetails, isLoading, error } = useCampaignDetails(
    contractAddress as `0x${string}`, 
    BigInt(campaignId)
  );

  const { voteWithCelo, isPending, isSuccess, reset } = useVote(contractAddress);

  // Get projects for this campaign
  const { campaignProjects, isLoading: projectsLoading, error: projectsError } = useCampaignProjects(
    contractAddress as `0x${string}`,
    BigInt(campaignId)
  );

  // Get project IDs for participation data - FIXED: Include project ID 0
  const projectIds = useMemo(() => {
    return campaignProjects?.map(project => BigInt(project?.id || 0)) || [];
  }, [campaignProjects]);

  // Get participation data for all projects in this campaign
  const { participations, isLoading: participationsLoading } = useProjectParticipations(
    contractAddress as `0x${string}`,
    BigInt(campaignId),
    projectIds
  );

  // Combine projects with their participation data
  const projects = useMemo(() => {
    if (!campaignProjects || !participations) return [];
    
    const projectsWithData = campaignProjects
      .filter(project => project !== null)
      .map(project => {
        if (!project) return null;
        const participation = participations[project.id.toString()];
        return {
          id: Number(project.id),
          name: project.name,
          description: project.description || project.metadata?.bio || '',
          logo: project.metadata?.logo || '',
          voteCount: participation ? Number(participation.voteCount) : 0,
          fundsReceived: participation ? participation.fundsReceived.toString() : '0',
          approved: participation ? participation.approved : false,
          owner: project.owner
        };
      })
      .filter(project => project !== null) as Array<{
        id: number;
        name: string;
        description: string;
        logo: string;
        voteCount: number;
        fundsReceived: string;
        approved: boolean;
        owner: string;
      }>;

    // Apply filters
    let filteredProjects = projectsWithData;
    
    // Filter by approval status
    if (filterApproved) {
      filteredProjects = filteredProjects.filter(project => project.approved);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredProjects = filteredProjects.filter(project => 
        project.name.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query)
      );
    }
    
    // Sort projects
    switch (sortBy) {
      case "votes":
        return filteredProjects.sort((a, b) => b.voteCount - a.voteCount);
      case "funds":
        return filteredProjects.sort((a, b) => 
          parseFloat(formatEther(BigInt(b.fundsReceived))) - parseFloat(formatEther(BigInt(a.fundsReceived)))
        );
      case "name":
        return filteredProjects.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return filteredProjects.sort((a, b) => b.voteCount - a.voteCount);
    }
  }, [campaignProjects, participations, searchQuery, sortBy, filterApproved]);

  // Get Farcaster context
  useEffect(() => {
    const getContext = async () => {
      try {
        const frameContext = await sdk.context;
        setContext(frameContext);
      } catch (error) {
        console.error("Failed to get Farcaster context:", error);
      }
    };

    getContext();
  }, []);

  if (isLoading) {
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
              <Trophy className="h-6 w-6 text-blue-500 absolute inset-0 m-auto animate-wave" />
            </div>
            <div className="text-center">
              <p className="text-lg text-blue-600 font-semibold">Loading Campaign...</p>
              <p className="text-sm text-gray-600 animate-pulse">Preparing campaign details</p>
            </div>
          </div>
        </div>
      </div>
    );
  } 

  if (error || !campaignDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 flex items-center justify-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-gradient-to-r from-blue-400/20 to-indigo-400/20 animate-float blur-2xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-gradient-to-r from-cyan-400/20 to-blue-400/20 animate-float-delay-1 blur-2xl"></div>
        </div>
        
        <div className="glass-morphism rounded-2xl p-8 shadow-xl relative text-center">
          <div className="text-red-500 mb-4 text-lg font-semibold">Campaign not found</div>
          <button 
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { campaign, metadata } = campaignDetails;
  const parsedMetadata = parseCampaignMetadata(metadata);
  
  const now = Math.floor(Date.now() / 1000);
  const startTime = Number(campaign.startTime);
  const endTime = Number(campaign.endTime);
  const isActive = campaign.active;
  
  let status: string;
  if (!isActive) status = 'paused';
  else if (now < startTime) status = 'upcoming';
  else if (now >= endTime) status = 'ended';
  else status = 'active';

  const canVote = status === 'active' && address;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Flame className="h-5 w-5 text-green-500" />;
      case 'upcoming':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'ended':
        return <StopCircle className="h-5 w-5 text-gray-500" />;
      case 'paused':
        return <Pause className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ended':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Countdown timer component
  const CountdownTimer = ({ endTime }: { endTime: number }) => {
    const [timeLeft, setTimeLeft] = useState<{
      days: number;
      hours: number;
      minutes: number;
      seconds: number;
    }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
      const calculateTimeLeft = () => {
        const now = Math.floor(Date.now() / 1000);
        const difference = endTime - now;

        if (difference > 0) {
          setTimeLeft({
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((difference / 1000 / 60) % 60),
            seconds: Math.floor((difference / 1000) % 60)
          });
        } else {
          setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        }
      };

      calculateTimeLeft();
      const timer = setInterval(calculateTimeLeft, 1000);

      return () => clearInterval(timer);
    }, [endTime]);

    if (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) {
      return <span className="text-red-500 font-semibold">Ended</span>;
    }

    return (
      <div className="flex items-center space-x-2 text-sm">
        <Clock className="h-4 w-4 text-blue-500" />
        <span className="text-gray-700 font-medium">
          {timeLeft.days > 0 && `${timeLeft.days}d `}
          {timeLeft.hours > 0 && `${timeLeft.hours}h `}
          {timeLeft.minutes > 0 && `${timeLeft.minutes}m `}
          {timeLeft.seconds}s
        </span>
      </div>
    );
  };

  const handleVote = async (project: any) => {
    if (!voteAmount || !address) {
      console.error("Missing vote amount or address");
      return;
    }

    try {
      // Close modal immediately
      setShowVoteForm(false);
      setSelectedProject(null);
      
      // Show notification with loader
      setNotificationMessage("Querying new data...");
      setShowNotification(true);
      
      const amount = parseEther(voteAmount);
      
      // Validate parameters before voting - allow project ID 0
      if (campaignId === undefined || campaignId === null || project?.id === undefined || project?.id === null || amount === undefined || amount === null) {
        console.error("Invalid parameters:", { campaignId, projectId: project?.id, amount: amount.toString() });
        throw new Error("Invalid voting parameters");
      }

      console.log("Voting with parameters:", {
        campaignId: BigInt(campaignId),
        projectId: BigInt(project.id),
        amount: amount.toString(),
        voteAmount,
        project
      });

      // Store vote in database first
      const voteId = await storeVote({
        campaignId: Number(campaignId),
        projectId: Number(project.id),
        voterAddress: address,
        amount: voteAmount,
        timestamp: new Date().toISOString()
      });

      // Always use CELO for voting now
      const tx = await voteWithCelo({
        campaignId: BigInt(campaignId),
        projectId: BigInt(project.id),
        amount
      });

      // Update vote status with transaction hash
      if (tx) {
        await updateVoteStatus(voteId, 'confirmed', tx as string);
      }
      
      // Wait a bit for the notification to be visible, then reload
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error("Vote error:", error);
      // Hide notification and show error
      setShowNotification(false);
      alert(`Voting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleLike = (projectId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const handleBookmark = (projectId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const handleShare = (project: any, campaign: any, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Create the cast text with project and campaign details
    const castText = `🚀 Check out this amazing project: ${project.name}!\n\n` +
      `📍 Campaign: ${campaign.name}\n` +
      `💰 Funds Received: ${parseFloat(formatEther(BigInt(project.fundsReceived))).toFixed(1)} CELO\n` +
      `🗳️ Votes: ${parseFloat(formatEther(BigInt(project.voteCount))).toFixed(1)}\n\n` +
      `Vote and support this project on Sovereign Seas! 🌊\n\n` +
      `#SovereignSeas #Funding #Celo #Web3`;
    
    // Create the Farcaster cast intent URL
    const appUrl = `${window.location.origin}/campaign/${campaignId}`;
    const castUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent(appUrl)}`;
    
    // Open the cast intent URL
    window.open(castUrl, '_blank');
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100"
      style={{
        paddingTop: context?.client?.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client?.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client?.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client?.safeAreaInsets?.right ?? 0,
      }}
    >
      {/* Minimal Header */}
      <div className="bg-white/10 backdrop-blur-xl border-b border-blue-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-lg font-bold text-gray-800">{campaign.name}</h1>
            </div>
            
            {/* Status Badge */}
            <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2 border ${
              status === 'active' ? 'bg-green-100 text-green-700 border-green-300' :
              status === 'ended' ? 'bg-gray-100 text-gray-700 border-gray-300' :
              status === 'upcoming' ? 'bg-blue-100 text-blue-700 border-blue-300' :
              'bg-yellow-100 text-yellow-700 border-yellow-300'
            }`}>
              {getStatusIcon(status)}
              <span className="capitalize">{status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Campaign Info - Minimal */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-blue-200/50 mb-8"
        >
          <div className="flex items-center space-x-4">
            {/* Campaign Logo */}
            <div className="flex-shrink-0">
              {parsedMetadata.logo ? (
                <img 
                  src={formatIpfsUrl(parsedMetadata.logo)} 
                  alt={`${campaign.name} logo`}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-blue-200/50"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white text-xl font-bold border-2 border-blue-200/50 ${parsedMetadata.logo ? 'hidden' : ''}`}>
                {campaign.name?.charAt(0) || '🚀'}
              </div>
            </div>

            {/* Campaign Details */}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800 mb-2">{campaign.name}</h2>
              <p className="text-blue-600 text-sm mb-3 line-clamp-2">
                {parsedMetadata.description || campaign.description}
              </p>
              
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {parseFloat(formatEther(campaign.totalFunds)).toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-600">Total Funds</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {Number(campaign.maxWinners)}
                  </div>
                  <div className="text-xs text-gray-600">Max Winners</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {projects.length}
                  </div>
                  <div className="text-xs text-gray-600">Projects</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {campaign.useQuadraticDistribution ? 'Quadratic' : 'Linear'}
                  </div>
                  <div className="text-xs text-gray-600">Distribution</div>
                </div>
              </div>
            </div>
          </div>

          {/* Countdown Timer */}
          {status === 'active' && (
            <div className="mt-4 pt-4 border-t border-blue-200/30">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Campaign ends in:</span>
                <CountdownTimer endTime={endTime} />
              </div>
            </div>
          )}
        </motion.div>

        {/* Projects Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800 flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-500" />
              Projects ({projects.length})
            </h3>
            {canVote && (
              <div className="text-sm text-green-600 flex items-center">
                <Zap className="h-4 w-4 mr-1" />
                Voting is active
              </div>
            )}
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-blue-200/50">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-blue-200/50 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                </div>
              </div>

              {/* Sort Dropdown */}
              <div className="sm:w-48">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "votes" | "funds" | "name")}
                  className="w-full px-3 py-2 bg-white/10 border border-blue-200/50 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="votes">Sort by Votes</option>
                  <option value="funds">Sort by Funds</option>
                  <option value="name">Sort by Name</option>
                </select>
              </div>

              {/* Filter Toggle */}
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={filterApproved}
                    onChange={(e) => setFilterApproved(e.target.checked)}
                    className="rounded border-blue-300 text-blue-600 focus:ring-blue-400"
                  />
                  <span>Approved Only</span>
                </label>
              </div>
            </div>
          </div>

          {projectsLoading || participationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : projectsError ? (
            <div className="text-center py-12">
              <div className="text-red-500 mb-4">Error loading projects</div>
              <div className="text-gray-600 text-sm">{projectsError.message}</div>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-600 mb-4">
                {searchQuery.trim() ? 'No projects match your search' : 'No projects found in this campaign'}
              </div>
              <div className="text-blue-600 text-sm">
                {searchQuery.trim() ? 'Try adjusting your search terms or filters.' : 'Projects will appear here once they are added and approved.'}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-blue-200/50 hover:shadow-lg hover:bg-white/15 transition-all duration-300 group"
                >
                  <div className="flex items-center space-x-4">
                    {/* Project Logo */}
                    <div className="flex-shrink-0 relative">
                      {project.logo ? (
                        <img 
                          src={formatIpfsUrl(project.logo)} 
                          alt={`${project.name} logo`}
                          className="w-12 h-12 rounded-lg object-cover border-2 border-blue-200/50"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold border-2 border-blue-200/50 ${project.logo ? 'hidden' : ''}`}>
                        {project.name?.charAt(0) || '🚀'}
                      </div>
                    </div>

                    {/* Project Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-lg font-bold text-gray-800 truncate">{project.name}</h4>
                          {!project.approved && (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full border border-yellow-300">
                              Pending
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <div className="text-lg font-bold text-blue-600">
                              {parseFloat(formatEther(BigInt(project.voteCount))).toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-600">Votes</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">
                              {parseFloat(formatEther(BigInt(project.fundsReceived))).toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-600">CELO</div>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-3">{project.description}</p>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => handleLike(project.id, e)}
                            className={`p-2 rounded-lg transition-colors border border-transparent ${
                              likedProjects.has(project.id)
                                ? 'text-red-500 bg-red-500/20 border-red-300/50'
                                : 'text-gray-600 hover:text-red-500 hover:bg-red-500/20 hover:border-red-300/50'
                            }`}
                          >
                            <Heart className={`h-4 w-4 ${likedProjects.has(project.id) ? 'fill-current' : ''}`} />
                          </motion.button>
                          
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => handleBookmark(project.id, e)}
                            className={`p-2 rounded-lg transition-colors border border-transparent ${
                              bookmarkedProjects.has(project.id)
                                ? 'text-yellow-500 bg-yellow-500/20 border-yellow-300/50'
                                : 'text-gray-600 hover:text-yellow-500 hover:bg-yellow-500/20 hover:border-yellow-300/50'
                            }`}
                          >
                            <Bookmark className={`h-4 w-4 ${bookmarkedProjects.has(project.id) ? 'fill-current' : ''}`} />
                          </motion.button>
                          
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => handleShare(project, campaign, e)}
                            className="p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-500/20 hover:border-blue-300/50 transition-colors border border-transparent"
                          >
                            <Share2 className="h-4 w-4" />
                          </motion.button>
                        </div>
                        
                        {canVote && project.approved && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              setSelectedProject(project);
                              setShowVoteForm(true);
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all flex items-center space-x-2 border border-blue-400/50"
                          >
                            <Vote className="h-4 w-4" />
                            <span>Vote</span>
                          </motion.button>
                        )}
                        
                        {/* Show why voting is disabled */}
                        {canVote && !project.approved && (
                          <div className="text-xs text-gray-500 bg-gray-100/50 px-2 py-1 rounded">
                            ⏳ Pending Approval
                          </div>
                        )}
                        
                        {!canVote && project.approved && (
                          <div className="text-xs text-gray-500 bg-gray-100/50 px-2 py-1 rounded">
                            🕐 Voting Closed
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Vote Form */}
      {showVoteForm && selectedProject && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setShowVoteForm(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-gradient-to-br from-white/95 to-blue-50/95 backdrop-blur-xl rounded-3xl p-8 border border-blue-200/50 shadow-2xl max-w-md w-full relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-cyan-400/10 to-blue-400/10 rounded-full translate-y-12 -translate-x-12 blur-xl"></div>
            
            {/* Header */}
            <div className="relative z-10 mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🗳️</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Cast Your Vote</h3>
                  <p className="text-sm text-gray-600">Support this amazing project</p>
                </div>
              </div>
              
              {/* Project Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200/50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold">
                    {(selectedProject as any)?.name?.charAt(0) || '🚀'}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">{(selectedProject as any)?.name || 'Project'}</h4>
                    <p className="text-xs text-gray-600 line-clamp-2">{(selectedProject as any)?.description || 'Project description'}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Form */}
            <div className="relative z-10 space-y-6">
              {/* Vote Amount */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <span className="text-xl mr-2">💰</span>
                  Vote Amount (CELO)
                </label>
                
                {/* Preset Amount Buttons */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <button
                    onClick={() => setVoteAmount("1")}
                    className={`py-2 px-3 rounded-lg border-2 transition-all duration-200 font-medium ${
                      voteAmount === "1"
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white/80 text-gray-600 hover:border-green-300 hover:bg-green-50/50'
                    }`}
                  >
                    <span className="text-sm">1 💎</span>
                  </button>
                  <button
                    onClick={() => setVoteAmount("5")}
                    className={`py-2 px-3 rounded-lg border-2 transition-all duration-200 font-medium ${
                      voteAmount === "5"
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white/80 text-gray-600 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <span className="text-sm">5 ⭐</span>
                  </button>
                  <button
                    onClick={() => setVoteAmount("10")}
                    className={`py-2 px-3 rounded-lg border-2 transition-all duration-200 font-medium ${
                      voteAmount === "10"
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 bg-white/80 text-gray-600 hover:border-purple-300 hover:bg-purple-50/50'
                    }`}
                  >
                    <span className="text-sm">10 🏆</span>
                  </button>
                </div>
                
                {/* Custom Amount Input */}
                <div className="relative">
                  <input
                    type="number"
                    value={voteAmount}
                    onChange={(e) => setVoteAmount(e.target.value)}
                    placeholder="Enter custom amount"
                    step="0.1"
                    min="0"
                    className="w-full pl-4 pr-12 py-3 bg-white/80 border border-blue-200/50 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                    💎
                  </div>
                </div>
              </div>

              {/* Project Stats */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 border border-green-200/50">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl mb-1">🎯</div>
                    <div className="text-sm text-gray-600">Current Votes</div>
                    <div className="font-bold text-green-600">
                      {parseFloat(formatEther(BigInt((selectedProject as any)?.voteCount || 0))).toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl mb-1">💸</div>
                    <div className="text-sm text-gray-600">Funds Received</div>
                    <div className="font-bold text-blue-600">
                      {parseFloat(formatEther(BigInt((selectedProject as any)?.fundsReceived || 0))).toFixed(1)} CELO
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowVoteForm(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium border border-gray-200"
                >
                  ❌ Cancel
                </button>
                <button
                  onClick={() => handleVote(selectedProject)}
                  disabled={!voteAmount || isPending}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                >
                  {isPending ? (
                    <>
                      <span className="text-lg">⏳</span>
                      <span>Voting...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-lg">🗳️</span>
                      <span>Vote Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Notification with Loader */}
      {showNotification && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-4 right-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-4 rounded-xl shadow-2xl border border-blue-400/50 backdrop-blur-sm z-50"
        >
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
            <div>
              <div className="font-bold">Processing Vote</div>
              <div className="text-sm opacity-90">{notificationMessage}</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
} 