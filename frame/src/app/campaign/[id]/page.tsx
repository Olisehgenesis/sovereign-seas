"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useAccount } from "wagmi";
import { formatEther, parseEther } from "viem";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  Users, 
  Clock, 
  Vote, 
  Coins, 
  Target,
  Flame,
  Crown,
  Award,
  Star,
  TrendingUp,
  Calendar,
  DollarSign,
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
  ArrowLeft,
  Eye,
  Zap,
  Loader2
} from "lucide-react";
import { useCampaignDetails } from "../../../hooks/useCampaignMethods";
import { useVote, useTokenToCeloEquivalent } from "../../../hooks/useVotingMethods";
import { useCampaignProjects, useProjectParticipations } from "../../../hooks/useProjectMethods";
import { formatIpfsUrl } from "../../../hooks/utils";

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
const parseCampaignMetadata = (metadata: any) => {
  const mainInfo = safeJsonParse(metadata.mainInfo);
  const additionalInfo = safeJsonParse(metadata.additionalInfo);
  
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
const celoTokenAddress = "0x471EcE3750Da237f93B8E339c536989b8978a438";
const cUSDTokenAddress = "0x765de816845861e75a25fca122bb6898b8b1282a";

export default function CampaignPage() {
  const params = useParams();
  const campaignId = params.id as string;
  const { address } = useAccount();
  
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [voteAmount, setVoteAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState(celoTokenAddress);
  const [likedProjects, setLikedProjects] = useState<Set<number>>(new Set());
  const [bookmarkedProjects, setBookmarkedProjects] = useState<Set<number>>(new Set());
  const [showVoteForm, setShowVoteForm] = useState(false);

  const { campaignDetails, isLoading, error } = useCampaignDetails(
    contractAddress as `0x${string}`, 
    BigInt(campaignId)
  );

  const { vote, voteWithCelo, isPending, isSuccess, reset } = useVote(contractAddress);
  const { celoEquivalentFormatted } = useTokenToCeloEquivalent(
    contractAddress as `0x${string}`,
    cUSDTokenAddress as `0x${string}`,
    voteAmount ? parseEther(voteAmount) : 0n
  );

  // Get projects for this campaign
  const { campaignProjects, isLoading: projectsLoading, error: projectsError } = useCampaignProjects(
    contractAddress as `0x${string}`,
    BigInt(campaignId)
  );

  // Get project IDs for participation data
  const projectIds = useMemo(() => {
    return campaignProjects?.map(project => BigInt(project?.id || 0)).filter(id => id > 0n) || [];
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
      .filter(project => project !== null && project.approved) as any[]; // Only show approved projects

    // Sort by vote count in descending order
    return projectsWithData.sort((a, b) => b.voteCount - a.voteCount);
  }, [campaignProjects, participations]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error || !campaignDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">Campaign not found</div>
          <button 
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
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

  const handleVote = async (project: any) => {
    if (!voteAmount || !address) return;

    try {
      const amount = parseEther(voteAmount);
      
      if (selectedToken === celoTokenAddress) {
        await voteWithCelo({
          campaignId: BigInt(campaignId),
          projectId: BigInt(project.id),
          amount
        });
      } else {
        await vote({
          campaignId: BigInt(campaignId),
          projectId: BigInt(project.id),
          token: selectedToken as `0x${string}`,
          amount
        });
      }
    } catch (error) {
      console.error("Vote error:", error);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => window.history.back()}
                className="p-2 rounded-lg text-purple-200 hover:text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-lg font-bold text-white">Campaign Details</h1>
              </div>
            </div>
            
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(status)}`}>
              {getStatusIcon(status)}
              <span className="capitalize">{status}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Campaign Info */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 mb-8"
        >
          <div className="flex items-start space-x-6">
            {/* Campaign Logo */}
            <div className="flex-shrink-0">
              {parsedMetadata.logo ? (
                <img 
                  src={formatIpfsUrl(parsedMetadata.logo)} 
                  alt={`${campaign.name} logo`}
                  className="w-24 h-24 rounded-xl object-cover border-2 border-white/30"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold border-2 border-white/30">
                  {campaign.name?.charAt(0) || '🚀'}
                </div>
              )}
            </div>

            {/* Campaign Details */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{campaign.name}</h1>
              <p className="text-purple-200 mb-4">
                {parsedMetadata.description || campaign.description}
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-300">
                    {parseFloat(formatEther(campaign.totalFunds)).toFixed(1)}
                  </div>
                  <div className="text-xs text-purple-200">Total Funds</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-300">
                    {Number(campaign.maxWinners)}
                  </div>
                  <div className="text-xs text-purple-200">Max Winners</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-300">
                    {projects.length}
                  </div>
                  <div className="text-xs text-purple-200">Projects</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-300">
                    {campaign.useQuadraticDistribution ? 'Quadratic' : 'Linear'}
                  </div>
                  <div className="text-xs text-purple-200">Distribution</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Projects Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Users className="h-6 w-6 mr-2 text-purple-400" />
              Projects ({projects.length})
            </h2>
            {canVote && (
              <div className="text-sm text-purple-200">
                <Zap className="h-4 w-4 inline mr-1" />
                Voting is active
              </div>
            )}
          </div>

          {projectsLoading || participationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
          ) : projectsError ? (
            <div className="text-center py-12">
              <div className="text-red-500 mb-4">Error loading projects</div>
              <div className="text-purple-200 text-sm">{projectsError.message}</div>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-purple-200 mb-4">No projects found in this campaign</div>
              <div className="text-purple-300 text-sm">Projects will appear here once they are added and approved.</div>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20 hover:shadow-lg hover:bg-white/15 transition-all duration-300 group"
                >
                  <div className="flex items-center space-x-4">
                    {/* Project Logo */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold border-2 border-white/30">
                        {project.name?.charAt(0) || '🚀'}
                      </div>
                    </div>

                    {/* Project Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold text-white truncate">{project.name}</h3>
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <div className="text-lg font-bold text-blue-300">
                              {parseFloat(formatEther(BigInt(project.voteCount))).toFixed(1)}
                            </div>
                            <div className="text-xs text-blue-200">Votes</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-300">
                              {parseFloat(formatEther(BigInt(project.fundsReceived))).toFixed(1)}
                            </div>
                            <div className="text-xs text-green-200">CELO</div>
                          </div>
                        </div>
                      </div>
                      <p className="text-purple-200 text-sm line-clamp-2 mb-3">{project.description}</p>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => handleLike(project.id, e)}
                            className={`p-2 rounded-lg transition-colors ${
                              likedProjects.has(project.id)
                                ? 'text-red-500 bg-red-500/20'
                                : 'text-purple-200 hover:text-red-500 hover:bg-red-500/20'
                            }`}
                          >
                            <Heart className={`h-4 w-4 ${likedProjects.has(project.id) ? 'fill-current' : ''}`} />
                          </motion.button>
                          
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => handleBookmark(project.id, e)}
                            className={`p-2 rounded-lg transition-colors ${
                              bookmarkedProjects.has(project.id)
                                ? 'text-yellow-500 bg-yellow-500/20'
                                : 'text-purple-200 hover:text-yellow-500 hover:bg-yellow-500/20'
                            }`}
                          >
                            <Bookmark className={`h-4 w-4 ${bookmarkedProjects.has(project.id) ? 'fill-current' : ''}`} />
                          </motion.button>
                        </div>
                        
                        {canVote && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setSelectedProject(project);
                              setShowVoteForm(true);
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all flex items-center space-x-2"
                          >
                            <Vote className="h-4 w-4" />
                            <span className="text-sm font-medium">Vote</span>
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Vote Form */}
        {showVoteForm && selectedProject && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowVoteForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-4">Vote for {selectedProject.name}</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    Vote Amount
                  </label>
                  <input
                    type="number"
                    value={voteAmount}
                    onChange={(e) => setVoteAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    Token
                  </label>
                  <select
                    value={selectedToken}
                    onChange={(e) => setSelectedToken(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value={celoTokenAddress}>CELO</option>
                    <option value={cUSDTokenAddress}>cUSD</option>
                  </select>
                </div>

                {selectedToken === cUSDTokenAddress && celoEquivalentFormatted && (
                  <div className="text-sm text-purple-200">
                    CELO equivalent: {celoEquivalentFormatted} CELO
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowVoteForm(false)}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleVote(selectedProject)}
                    disabled={!voteAmount || isPending}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Voting...
                      </>
                    ) : (
                      'Vote'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Success Message */}
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg"
          >
            Vote submitted successfully!
          </motion.div>
        )}
      </div>
    </div>
  );
} 