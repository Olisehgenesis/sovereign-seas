'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { 
  ArrowLeft, 
  Waves, 
  Calendar, 
  Clock, 
  FileText, 
  Github, 
  Globe, 
  Award,
  User,
  Heart,
  Share2,
  ExternalLink,
  Loader2,
  ThumbsUp,
  AlertTriangle,
  BadgeCheck,
  X
} from 'lucide-react';
import { useSovereignSeas } from '../../../../../hooks/useSovereignSeas';

// Contract addresses - replace with your actual addresses or environment variables
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` || 
  '0x35128A5Ee461943fA6403672b3574346Ba7E4530' as `0x${string}`;
const CELO_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_CELO_TOKEN_ADDRESS as `0x${string}` || 
  '0x3FC1f6138F4b0F5Da3E1927412Afe5c68ed4527b' as `0x${string}`;

export default function ProjectDetails() {
  const router = useRouter();
  const { campaignId, projectId } = useParams();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  
  // Data states
  const [campaign, setCampaign] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userVotes, setUserVotes] = useState<bigint>(BigInt(0));
  
  // UI states
  const [voteModalVisible, setVoteModalVisible] = useState(false);
  const [voteAmount, setVoteAmount] = useState('');
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
  
  // Contract interaction
  const {
    isInitialized,
    loadCampaigns,
    loadProjects,
    approveProject,
    getUserVotesForProject,
    vote,
    formatTokenAmount,
    formatCampaignTime,
    getCampaignTimeRemaining,
    isCampaignActive,
    isWritePending,
    isWaitingForTx,
    isTxSuccess,
    txReceipt,
  } = useSovereignSeas({
    contractAddress: CONTRACT_ADDRESS,
    celoTokenAddress: CELO_TOKEN_ADDRESS,
  });
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  useEffect(() => {
    if (isInitialized && campaignId && projectId) {
      loadProjectData();
    }
  }, [isInitialized, campaignId, projectId, address, isTxSuccess]);
  
  // Clear status message after 5 seconds
  useEffect(() => {
    if (statusMessage.text) {
      const timer = setTimeout(() => {
        setStatusMessage({ text: '', type: '' });
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);
  
  const loadProjectData = async () => {
    setLoading(true);
    try {
      // Load campaign data
      const allCampaigns = await loadCampaigns();
      
      if (Array.isArray(allCampaigns) && allCampaigns.length > 0) {
        // Find this specific campaign by ID
        const campaignData = allCampaigns.find(c => c.id.toString() === campaignId);
        
        if (campaignData) {
          setCampaign(campaignData);
          
          // Check if current user is the admin
          if (address && campaignData.admin.toLowerCase() === address.toLowerCase()) {
            setIsAdmin(true);
          }
          
          // Load projects for this campaign
          const projectsData = await loadProjects(Number(campaignId));
          
          if (Array.isArray(projectsData) && projectsData.length > 0) {
            // Find the specific project
            const projectData = projectsData.find(p => p.id.toString() === projectId);
            
            if (projectData) {
              setProject(projectData);
              
              // Get user votes for this project
              if (isConnected && address) {
                if (campaignId && projectId) {
                  const votes = await getUserVotesForProject(Number(campaignId), Number(projectId));
                  setUserVotes(votes);
                }
                // setUserVotes(votes);
              }
            } else {
              setStatusMessage({ 
                text: 'Project not found', 
                type: 'error' 
              });
            }
          }
        } else {
          setStatusMessage({ 
            text: 'Campaign not found', 
            type: 'error' 
          });
        }
      }
    } catch (error) {
      console.error('Error loading project data:', error);
      setStatusMessage({ 
        text: 'Error loading project data. Please try again later.', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleVote = async () => {
    if (!voteAmount || parseFloat(voteAmount) <= 0) return;
    
    try {
      await vote(Number(campaignId), Number(projectId), BigInt(voteAmount).toString());
      setVoteModalVisible(false);
      setVoteAmount('');
      setStatusMessage({ 
        text: 'Vote submitted successfully!', 
        type: 'success' 
      });
    } catch (error) {
      console.error('Error voting:', error);
      setStatusMessage({ 
        text: 'Error submitting vote. Please try again.', 
        type: 'error' 
      });
    }
  };
  
  const handleApproveProject = async () => {
    if (!isAdmin) return;
    
    try {
      await approveProject(Number(campaignId), Number(projectId));
      setStatusMessage({ 
        text: 'Project approved successfully!', 
        type: 'success' 
      });
    } catch (error) {
      console.error('Error approving project:', error);
      setStatusMessage({ 
        text: 'Error approving project. Please try again.', 
        type: 'error' 
      });
    }
  };
  
  // Helper function to share project link
  const shareProject = () => {
    const url = window.location.origin + `/campaign/${campaignId}/project/${projectId}`;
    navigator.clipboard.writeText(url);
    alert('Project link copied to clipboard!');
  };
  
  if (!isMounted) {
    return null;
  }
  
  if (loading || !campaign || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 text-lime-500 animate-spin mb-4" />
          <p className="text-lg text-lime-300">Loading project details...</p>
        </div>
      </div>
    );
  }
  
  const isActive = isCampaignActive(campaign);
  const now = Math.floor(Date.now() / 1000);
  const hasStarted = now >= Number(campaign.startTime);
  const hasEnded = now >= Number(campaign.endTime);
  const canVote = isActive && project.approved && isConnected;
  const timeRemaining = getCampaignTimeRemaining(campaign);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/campaign/${campaignId}/dashboard`)}
            className="inline-flex items-center text-slate-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaign
          </button>
        </div>
        
        {/* Status Message */}
        {statusMessage.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            statusMessage.type === 'success' 
              ? 'bg-green-900/30 border border-green-500/40' 
              : 'bg-red-900/30 border border-red-500/40'
          }`}>
            <div className="flex items-start">
              {statusMessage.type === 'success' ? (
                <ThumbsUp className="h-5 w-5 text-green-400 mr-3 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
              )}
              <p className={statusMessage.type === 'success' ? 'text-green-300' : 'text-red-300'}>
                {statusMessage.text}
              </p>
            </div>
          </div>
        )}
        
        {/* Project Header */}
        <div className="bg-slate-800/40 backdrop-blur-md rounded-xl border border-lime-600/20 overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-grow">
                {/* Project Title and Approval Status */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold text-white">{project.name}</h1>
                  {project.approved ? (
                    <span className="px-2 py-1 bg-green-900/50 text-green-400 text-xs rounded-full border border-green-500/30 inline-flex items-center">
                      <BadgeCheck className="h-3.5 w-3.5 mr-1" />
                      Approved
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-yellow-900/50 text-yellow-400 text-xs rounded-full border border-yellow-500/30 inline-flex items-center">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      Pending Approval
                    </span>
                  )}
                </div>
                
                {/* Campaign Name */}
                <p className="text-lime-400 mb-4">
                  Part of <span className="font-medium">{campaign.name}</span>
                </p>
                
                {/* Project Description */}
                <div className="bg-slate-700/30 rounded-lg p-4 mb-6">
                  <p className="text-slate-300 whitespace-pre-line">{project.description}</p>
                </div>
                
                {/* Project Links */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {project.githubLink && (
                    <a 
                      href={project.githubLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center bg-slate-700/40 hover:bg-slate-700/60 transition-colors p-3 rounded-lg text-blue-400 hover:text-blue-300"
                    >
                      <Github className="h-5 w-5 mr-3" />
                      <div>
                        <div className="font-medium">GitHub Repository</div>
                        <div className="text-xs text-slate-400 truncate max-w-[200px]">
                          {project.githubLink}
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 ml-auto" />
                    </a>
                  )}
                  
                  {project.socialLink && (
                    <a 
                      href={project.socialLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center bg-slate-700/40 hover:bg-slate-700/60 transition-colors p-3 rounded-lg text-blue-400 hover:text-blue-300"
                    >
                      <Globe className="h-5 w-5 mr-3" />
                      <div>
                        <div className="font-medium">Social Media</div>
                        <div className="text-xs text-slate-400 truncate max-w-[200px]">
                          {project.socialLink}
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 ml-auto" />
                    </a>
                  )}
                  
                  {project.testingLink && (
                    <a 
                      href={project.testingLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center bg-slate-700/40 hover:bg-slate-700/60 transition-colors p-3 rounded-lg text-blue-400 hover:text-blue-300"
                    >
                      <FileText className="h-5 w-5 mr-3" />
                      <div>
                        <div className="font-medium">Demo/Testing</div>
                        <div className="text-xs text-slate-400 truncate max-w-[200px]">
                          {project.testingLink}
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 ml-auto" />
                    </a>
                  )}
                </div>
                
                {/* Project Info */}
                <div className="flex flex-wrap gap-y-3 gap-x-6 text-sm">
                  <div className="flex items-center text-slate-300">
                    <User className="h-4 w-4 mr-2 text-slate-400" />
                    Submitted by: <span className="ml-1 font-mono">{project.owner.slice(0, 6)}...{project.owner.slice(-4)}</span>
                  </div>
                  
                  {project.approved && (
                    <div className="flex items-center text-slate-300">
                      <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                      Campaign ends: <span className="ml-1">{formatCampaignTime(campaign.endTime)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Vote Stats and Actions */}
              <div className="shrink-0 flex flex-col items-center">
                <div className="bg-slate-700/40 backdrop-blur-md rounded-xl p-6 border border-lime-600/20 w-full md:w-auto">
                  <div className="flex flex-col items-center">
                    <Heart className="h-8 w-8 text-lime-500 mb-2" />
                    <div className="text-3xl font-bold text-white mb-1">{formatTokenAmount(project.voteCount)}</div>
                    <div className="text-sm text-slate-400 mb-4">
                      Total {Number(campaign.voteMultiplier) > 1 ? `(${campaign.voteMultiplier.toString()}x)` : ''} Votes
                    </div>
                    
                    {userVotes > BigInt(0) && (
                      <div className="text-sm text-lime-400 mb-4">
                        You've voted {formatTokenAmount(userVotes)} CELO on this project
                      </div>
                    )}
                    
                    <div className="w-full space-y-3">
                      {canVote && (
                        <button
                          onClick={() => setVoteModalVisible(true)}
                          className="w-full py-2 px-4 bg-lime-600 hover:bg-lime-500 text-white rounded-lg transition-colors flex items-center justify-center"
                        >
                          <Award className="h-4 w-4 mr-2" />
                          Vote for Project
                        </button>
                      )}
                      
                      {isAdmin && !project.approved && (
                        <button
                          onClick={handleApproveProject}
                          disabled={isWritePending || isWaitingForTx}
                          className="w-full py-2 px-4 bg-yellow-500 hover:bg-yellow-400 text-slate-900 rounded-lg transition-colors flex items-center justify-center disabled:bg-slate-600 disabled:text-slate-300"
                        >
                          {isWritePending || isWaitingForTx ? (
                            <div className="flex items-center justify-center">
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </div>
                          ) : (
                            <>
                              <BadgeCheck className="h-4 w-4 mr-2" />
                              Approve Project
                            </>
                          )}
                        </button>
                      )}
                      
                      <button
                        onClick={shareProject}
                        className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center justify-center"
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share Project
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Campaign Status Bar */}
          <div className="bg-slate-700/50 px-6 py-3 border-t border-slate-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Waves className="h-5 w-5 text-lime-500 mr-2" />
                <span className="font-medium">Campaign Status:</span>
                <span className={`ml-2 ${
                  hasEnded 
                    ? 'text-slate-400' 
                    : hasStarted 
                      ? 'text-green-400' 
                      : 'text-yellow-400'
                }`}>
                  {hasEnded ? 'Ended' : hasStarted ? 'Active' : 'Not Started'}
                </span>
              </div>
              
              {hasStarted && !hasEnded && (
                <div className="text-yellow-400 text-sm">
                  {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m remaining
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Campaign Info Card */}
        <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-6 border border-lime-600/20 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-yellow-400 flex items-center">
            <Waves className="h-5 w-5 mr-2" />
            About The Campaign
          </h2>
          
          <p className="text-slate-300 mb-4">{campaign.description}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div className="bg-slate-700/30 p-3 rounded-lg">
              <div className="text-sm text-slate-400">Distribution Method</div>
              <div className="font-medium">{campaign.useQuadraticDistribution ? 'Quadratic' : 'Linear'}</div>
            </div>
            
            <div className="bg-slate-700/30 p-3 rounded-lg">
              <div className="text-sm text-slate-400">Vote Multiplier</div>
              <div className="font-medium">{campaign.voteMultiplier.toString()}x</div>
            </div>
            
            <div className="bg-slate-700/30 p-3 rounded-lg">
              <div className="text-sm text-slate-400">Max Winners</div>
              <div className="font-medium">
                {campaign.maxWinners.toString() === '0' ? 'All Projects' : `Top ${campaign.maxWinners.toString()}`}
              </div>
            </div>
            
            <div className="bg-slate-700/30 p-3 rounded-lg">
              <div className="text-sm text-slate-400">Total Funds</div>
              <div className="font-medium text-lime-400">{formatTokenAmount(campaign.totalFunds)} CELO</div>
            </div>
          </div>
          
          <div className="mt-6">
            <button
              onClick={() => router.push(`/campaign/${campaignId}/dashboard`)}
              className="px-4 py-2 bg-lime-600 hover:bg-lime-500 text-white rounded-lg transition-colors inline-flex items-center"
            >
              <Globe className="h-4 w-4 mr-2" />
              View All Projects
            </button>
          </div>
        </div>
      </div>
      
      {/* Vote Modal */}
      {voteModalVisible && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-md p-6 relative">
            <button 
              onClick={() => setVoteModalVisible(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            
            <h3 className="text-xl font-bold mb-1">Vote for Project</h3>
            <p className="text-lime-400 font-medium mb-4">{project.name}</p>
            
            <div className="mb-6">
              <label className="block text-slate-300 mb-2">CELO Amount</label>
              <input 
                type="number"
                min="0.1"
                step="0.1"
                value={voteAmount}
                onChange={(e) => setVoteAmount(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 text-white"
                placeholder="Enter amount"
              />
              <p className="mt-2 text-sm text-slate-400">
                Each CELO token is worth {campaign.voteMultiplier.toString()} votes.
                {voteAmount && !isNaN(parseFloat(voteAmount)) && parseFloat(voteAmount) > 0 && (
                  <span className="block mt-1 text-lime-400">
                    Your vote will be worth {parseFloat(voteAmount) * Number(campaign.voteMultiplier)} votes.
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleVote}
                disabled={isWritePending || isWaitingForTx || !voteAmount || parseFloat(voteAmount) <= 0}
                className="flex-1 py-3 px-6 bg-lime-500 text-slate-900 font-semibold rounded-lg hover:bg-lime-400 transition-colors disabled:bg-slate-500 disabled:text-slate-300 disabled:cursor-not-allowed"
              >
                {isWritePending || isWaitingForTx ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing...
                  </div>
                ) : (
                  'Confirm Vote'
                )}
              </button>
              
              <button
                onClick={() => setVoteModalVisible(false)}
                className="py-3 px-6 bg-transparent border border-slate-500 text-slate-300 font-semibold rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}