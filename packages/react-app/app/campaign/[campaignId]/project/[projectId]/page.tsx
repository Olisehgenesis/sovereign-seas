'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { 
  ArrowLeft, 
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
  X,
  Image as ImageIcon,
  Video,
  Code,
  Edit,
  Users,
  ChevronDown,
  ChevronUp,
  Info,
  PieChart,
  LineChart,
  BarChart3,
  Coins,
  History,
  BarChart,
  Hash,
  CreditCard,
  DollarSign,
  Repeat
} from 'lucide-react';
import { useSovereignSeas } from '../../../../../hooks/useSovereignSeas';
import { useVotingSystem } from '../../../../../hooks/useVotingSystem';

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
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [voteSummary, setVoteSummary] = useState<any>(null);
  const [userVoteHistory, setUserVoteHistory] = useState<any[]>([]);
  const [isProjectOwner, setIsProjectOwner] = useState(false);
  const [projectRanking, setProjectRanking] = useState({ rank: 0, totalProjects: 0 });
  
  // Token-related states
  const [supportedTokens, setSupportedTokens] = useState<any[]>([]);
  const [selectedToken, setSelectedToken] = useState('');
  const [tokenBalances, setTokenBalances] = useState<{[key: string]: string}>({});
  const [tokenExchangeRates, setTokenExchangeRates] = useState<{[key: string]: {expectedCelo: string, voteAmount: string}}>({});
  const [loadingExchangeRates, setLoadingExchangeRates] = useState(false);

  // UI states
  const [voteModalVisible, setVoteModalVisible] = useState(false);
  const [voteAmount, setVoteAmount] = useState('');
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [activeMediaType, setActiveMediaType] = useState<string | null>(null);
  const [showContractsSection, setShowContractsSection] = useState(false);
  const [showVoteHistory, setShowVoteHistory] = useState(false);
  const [showProjectStats, setShowProjectStats] = useState(true);
  const [slippagePercent, setSlippagePercent] = useState(0.5); // Default 0.5%
  
  // Media content refs
  const logoRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Contract interaction with both hooks
  const sovereignSeas = useSovereignSeas();
  const votingSystem = useVotingSystem();
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  useEffect(() => {
    if (
      sovereignSeas.isInitialized && 
      votingSystem.isInitialized && 
      campaignId && 
      projectId
    ) {
      loadProjectData();
      loadSupportedTokens();
      if (address) {
        loadUserVoteData();
      }
    }
  }, [
    sovereignSeas.isInitialized,
    votingSystem.isInitialized, 
    campaignId, 
    projectId, 
    address, 
    sovereignSeas.isTxSuccess,
    votingSystem.celoSwapper.isTxSuccess
  ]);
  
  // Clear status message after 5 seconds
  useEffect(() => {
    if (statusMessage.text) {
      const timer = setTimeout(() => {
        setStatusMessage({ text: '', type: '' });
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);
  
  // Handle write errors
  useEffect(() => {
    if (sovereignSeas.writeError) {
      setStatusMessage({
        text: `Transaction error: ${sovereignSeas.writeError.message || 'Please try again.'}`,
        type: 'error'
      });
      sovereignSeas.resetWrite();
    }
    
    if (votingSystem.error) {
      setStatusMessage({
        text: `Error: ${votingSystem.error}`,
        type: 'error'
      });
    }
  }, [sovereignSeas.writeError, votingSystem.error]);
  
  // Update exchange rates when token or amount changes
  useEffect(() => {
    if (selectedToken && voteAmount && parseFloat(voteAmount) > 0) {
      getTokenExchangeRate(selectedToken, voteAmount);
    }
  }, [selectedToken, voteAmount]);

  const loadSupportedTokens = async () => {
    try {
      const tokens = await votingSystem.loadSupportedTokens();
      setSupportedTokens(tokens);
      
      // Set CELO as default selected token
      if (tokens.length > 0) {
        const celoToken = tokens.find(t => t.isNative);
        if (celoToken) {
          setSelectedToken(celoToken.address);
        } else {
          setSelectedToken(tokens[0].address);
        }
      }
    } catch (error) {
      console.error('Error loading supported tokens:', error);
    }
  };
  
  const loadProjectData = async () => {
    setLoading(true);
    try {
      // Load campaign data
      const allCampaigns = await sovereignSeas.loadCampaigns();
      
      if (Array.isArray(allCampaigns) && allCampaigns.length > 0) {
        // Find this specific campaign by ID
        const campaignData = allCampaigns.find(c => c.id.toString() === campaignId);
        
        if (campaignData) {
          setCampaign(campaignData);
          
          // Check if current user is the admin
          if (address) {
            const isAdmin = await sovereignSeas.isCampaignAdmin(Number(campaignId));
            setIsAdmin(isAdmin || campaignData.admin.toLowerCase() === address.toLowerCase());
            setIsSuperAdmin(sovereignSeas.isSuperAdmin);
          }
          
          // Load projects for this campaign
          const projectsData = await sovereignSeas.loadProjects(Number(campaignId));
          
          if (Array.isArray(projectsData) && projectsData.length > 0) {
            // Find the specific project
            const projectData = projectsData.find(p => p.id.toString() === projectId);
            
            if (projectData) {
              setProject(projectData);
              
              // Check if user is project owner
              if (address && projectData.owner.toLowerCase() === address.toLowerCase()) {
                setIsProjectOwner(true);
              }
              
              // Get project ranking
              try {
                const sortedProjects = await sovereignSeas.getSortedProjects(Number(campaignId));
                const projectIndex = sortedProjects.findIndex(p => p.id.toString() === projectId);
                if (projectIndex !== -1) {
                  setProjectRanking({
                    rank: projectIndex + 1,
                    totalProjects: sortedProjects.length
                  });
                }
              } catch (error) {
                console.error('Error getting project ranking:', error);
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
  
  const loadUserVoteData = async () => {
    if (!isConnected || !address || !campaignId || !projectId) return;
    
    try {
      // Get comprehensive vote summary from the unified system
      const summary = await votingSystem.getUserVoteSummary(Number(campaignId), Number(projectId));
      setVoteSummary(summary);
      
      // Get user vote history from SovereignSeas for direct CELO votes
      const history = await sovereignSeas.getUserVoteHistory();
      // Filter for votes on this project
      const projectVotes = history.filter(vote => 
        vote.campaignId.toString() === campaignId && 
        vote.projectId.toString() === projectId
      );
      setUserVoteHistory(projectVotes);
      
    } catch (error) {
      console.error('Error loading user vote data:', error);
    }
  };
  
  const getTokenExchangeRate = async (tokenAddress: string, amount: string) => {
    if (!tokenAddress || !amount || parseFloat(amount) <= 0) return;
    
    try {
      setLoadingExchangeRates(true);
      
      // Skip calculation for CELO - 1:1 rate
      if (tokenAddress.toLowerCase() === votingSystem.CELO_ADDRESS.toLowerCase()) {
        setTokenExchangeRates({
          ...tokenExchangeRates,
          [tokenAddress]: {
            expectedCelo: amount,
            voteAmount: amount
          }
        });
        return;
      }
      
      // For other tokens, get expected CELO amount
      const { expectedCelo, voteAmount } = await votingSystem.celoSwapper.getExpectedVoteAmount(
        tokenAddress,
        amount
      );
      
      setTokenExchangeRates({
        ...tokenExchangeRates,
        [tokenAddress]: {
          expectedCelo: votingSystem.formatAmount(votingSystem.CELO_ADDRESS, expectedCelo),
          voteAmount: votingSystem.formatAmount(votingSystem.CELO_ADDRESS, voteAmount)
        }
      });
    } catch (error) {
      console.error('Error getting token exchange rate:', error);
    } finally {
      setLoadingExchangeRates(false);
    }
  };
  
  const handleVote = async () => {
    if (!selectedToken || !voteAmount || parseFloat(voteAmount) <= 0) return;
    
    try {
      setStatusMessage({ text: 'Processing your vote...', type: 'info' });
      
      // Calculate slippage in basis points
      const slippageBps = Math.floor(slippagePercent * 100);
      
      console.log("Vote parameters:", {
        selectedToken,
        campaignId: Number(campaignId),
        projectId: Number(projectId),
        voteAmount,
        slippageBps
      });
      
      // Use the smart vote function
      await votingSystem.vote(
        selectedToken,
        Number(campaignId),
        Number(projectId),
        voteAmount,
        slippageBps
      );
      
      setVoteModalVisible(false);
      setVoteAmount('');
      setStatusMessage({ 
        text: 'Vote submitted successfully!', 
        type: 'success' 
      });
      
      // Refresh vote data after transaction completes
      setTimeout(() => {
        loadUserVoteData();
        loadProjectData();
      }, 2000);
      
    } catch (error) {
      console.error('Detailed error when voting:', error);
      
      let errorMessage = "Error submitting vote. Please try again.";
      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setStatusMessage({ 
        text: errorMessage, 
        type: 'error' 
      });
    }
  };
  
  const handleApproveProject = async () => {
    if (!isAdmin) return;
    
    try {
      await sovereignSeas.approveProject(Number(campaignId), Number(projectId));
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
    setStatusMessage({ 
      text: 'Project link copied to clipboard!', 
      type: 'success' 
    });
  };
  
  // Open media modal
  const openMediaModal = (type: string) => {
    setActiveMediaType(type);
    setShowMediaModal(true);
  };
  
  if (!isMounted) {
    return null;
  }
  
  if (loading || !campaign || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 text-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 text-emerald-500 animate-spin mb-4" />
          <p className="text-lg text-emerald-600">Loading project details...</p>
        </div>
      </div>
    );
  }
  
  const isActive = sovereignSeas.isCampaignActive(campaign);
  const now = Math.floor(Date.now() / 1000);
  const hasStarted = now >= Number(campaign.startTime);
  const hasEnded = now >= Number(campaign.endTime);
  const canVote = isActive && project.approved && isConnected;
  const timeRemaining = sovereignSeas.getCampaignTimeRemaining(campaign);
  const votingEnded = hasEnded || !campaign.active;
  const hasFundsReceived = Number(project.fundsReceived) > 0;
  
  // Check if project has media and contracts
  const hasMedia = project.logo || project.demoVideo;
  const hasContracts = project.contracts && project.contracts.length > 0;
  
  // Get direct CELO votes
  const directCeloVotes = voteSummary ? voteSummary.directCeloAmount : BigInt(0);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 text-gray-800">
      <div className="container mx-auto px-6 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/campaign/${campaignId}/dashboard`)}
            className="inline-flex items-center text-gray-600 hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaign
          </button>
        </div>
        
        {/* Status Message */}
        {statusMessage.text && (
          <div className={`mb-6 p-4 rounded-xl shadow-sm ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-50 border border-emerald-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-start">
              {statusMessage.type === 'success' ? (
                <ThumbsUp className="h-5 w-5 text-emerald-500 mr-3 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
              )}
              <p className={statusMessage.type === 'success' ? 'text-emerald-700' : 'text-red-700'}>
                {statusMessage.text}
              </p>
            </div>
          </div>
        )}
        
        {/* Project Header */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6 shadow-md">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex-grow">
                {/* Project Title and Approval Status */}
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h1 className="text-2xl font-bold flex items-center tilt-neon text-gray-800">
                    <Hash className="h-7 w-7 text-emerald-500 mr-2" />
                    {project.name}
                  </h1>
                  {project.approved ? (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full border border-emerald-200 inline-flex items-center shadow-sm">
                      <BadgeCheck className="h-3.5 w-3.5 mr-1.5" />
                      Approved
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs rounded-full border border-amber-200 inline-flex items-center shadow-sm">
                      <Clock className="h-3.5 w-3.5 mr-1.5" />
                      Pending Approval
                    </span>
                  )}
                  
                  {hasFundsReceived && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full border border-blue-200 inline-flex items-center shadow-sm">
                      <Coins className="h-3.5 w-3.5 mr-1.5" />
                      Funded: {sovereignSeas.formatTokenAmount(project.fundsReceived)} CELO
                    </span>
                  )}
                  
                  {/* Media indicators */}
                  {hasMedia && (
                    <div className="flex items-center gap-1 ml-1">
                      {project.logo && (
                        <span className="text-blue-600" title="Has Logo">
                          <ImageIcon className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {project.demoVideo && (
                        <span className="text-red-600" title="Has Demo Video">
                          <Video className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Campaign Name */}
                <p className="text-emerald-600 mb-4">
                  Part of <span className="font-medium">{campaign.name}</span>
                </p>
                
                {/* Project Description */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200 shadow-sm">
                  <p className="text-gray-700 whitespace-pre-line">{project.description}</p>
                </div>
                
                {/* Project Links */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {project.githubLink && (
                    <a 
                      href={project.githubLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center bg-white hover:bg-gray-50 transition-colors p-3 rounded-xl text-blue-600 hover:text-blue-700 border border-gray-200 shadow-sm"
                    >
                      <Github className="h-5 w-5 mr-3" />
                      <div>
                        <div className="font-medium">GitHub Repository</div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">
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
                      className="flex items-center bg-white hover:bg-gray-50 transition-colors p-3 rounded-xl text-blue-600 hover:text-blue-700 border border-gray-200 shadow-sm"
                    >
                      <Globe className="h-5 w-5 mr-3" />
                      <div>
                        <div className="font-medium">Karma Gap Profile</div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">
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
                      className="flex items-center bg-white hover:bg-gray-50 transition-colors p-3 rounded-xl text-blue-600 hover:text-blue-700 border border-gray-200 shadow-sm"
                    >
                      <FileText className="h-5 w-5 mr-3" />
                      <div>
                        <div className="font-medium">Demo/Testing</div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">
                          {project.testingLink}
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 ml-auto" />
                    </a>
                  )}
                </div>
                
                {/* Media content section */}
                {hasMedia && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-medium text-emerald-700 flex items-center">
                        <Video className="h-4 w-4 mr-2 text-red-600" />
                        Media Content
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {project.logo && (
                        <div className="bg-white hover:bg-gray-50 transition-colors p-3 rounded-xl cursor-pointer border border-gray-200 shadow-sm"
                             onClick={() => openMediaModal('logo')}>
                          <div className="flex items-center mb-2">
                            <ImageIcon className="h-5 w-5 text-blue-600 mr-2" />
                            <div className="font-medium text-gray-800">Project Logo</div>
                          </div>
                          <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                            <img 
                              src={project.logo} 
                              alt={`${project.name} Logo`} 
                              className="max-w-full max-h-40 object-contain"
                              ref={logoRef}
                              onError={(e) => {
                                e.currentTarget.src = "https://placehold.co/400x300/f1f5f9/64748b?text=Logo%20Unavailable";
                              }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {project.demoVideo && (
                        <div className="bg-white hover:bg-gray-50 transition-colors p-3 rounded-xl cursor-pointer border border-gray-200 shadow-sm"
                             onClick={() => openMediaModal('video')}>
                          <div className="flex items-center mb-2">
                            <Video className="h-5 w-5 text-red-600 mr-2" />
                            <div className="font-medium text-gray-800">Demo Video</div>
                          </div>
                          <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                            <div className="text-gray-500 flex flex-col items-center">
                              <Video className="h-10 w-10 mb-2" />
                              <span>Click to view video</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Contracts section */}
                {hasContracts && (
                  <div className="mb-6">
                    <button 
                      onClick={() => setShowContractsSection(!showContractsSection)}
                      className="flex items-center justify-between w-full mb-3 bg-gray-50 p-3 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200 shadow-sm"
                    >
                      <h3 className="text-lg font-medium text-emerald-700 flex items-center">
                        <Code className="h-4 w-4 mr-2 text-purple-600" />
                        Smart Contracts ({project.contracts?.length || 0})
                      </h3>
                      {showContractsSection ? 
                        <ChevronUp className="h-4 w-4 text-gray-500" /> : 
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      }
                    </button>
                    
                    {showContractsSection && (
                      <div className="space-y-2">
                        {project.contracts.map((contract: string, index: number) => (
                          <div key={index} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-500">Contract {index + 1}</span>
                            </div>
                            <div className="font-mono text-sm bg-gray-50 p-2 rounded-lg break-all border border-gray-100">
                              {contract}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Project Info */}
                <div className="flex flex-wrap gap-y-3 gap-x-6 text-sm">
                  <div className="flex items-center text-gray-600">
                    <User className="h-4 w-4 mr-2 text-gray-500" />
                    Submitted by: <span className="ml-1 font-mono">{project.owner.slice(0, 6)}...{project.owner.slice(-4)}</span>
                  </div>
                  
                  {project.approved && (
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                      Campaign ends: <span className="ml-1">{sovereignSeas.formatCampaignTime(campaign.endTime)}</span>
                    </div>
                  )}
                  
                  {projectRanking.rank > 0 && (
                    <div className="flex items-center text-gray-600">
                      <BarChart3 className="h-4 w-4 mr-2 text-gray-500" />
                      Rank: <span className="ml-1 text-emerald-600 font-medium">{projectRanking.rank}</span> of {projectRanking.totalProjects}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Vote Stats and Actions */}
              <div className="shrink-0 flex flex-col items-center">
                <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-md w-full md:w-auto">
                  <div className="flex flex-col items-center">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
                      <Heart className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="text-3xl font-bold text-gray-800 mb-1">{sovereignSeas.formatTokenAmount(project.voteCount)}</div>
                    <div className="text-sm text-gray-500 mb-4">
                      Total {Number(campaign.voteMultiplier) > 1 ? `(${campaign.voteMultiplier.toString()}x)` : ''} Votes
                    </div>
                    
                    {/* Show unified vote summary */}
                    {voteSummary && (
                      <div className="text-sm mb-4 text-center w-full">
                        {/* Direct CELO votes */}
                        {directCeloVotes > BigInt(0) && (
                          <div className="text-emerald-600 mb-2">
                            You've voted {votingSystem.formatAmount(votingSystem.CELO_ADDRESS, directCeloVotes)} directly
                          </div>
                        )}
                        
                        {/* Token votes */}
                        {voteSummary.tokenVotes && voteSummary.tokenVotes.length > 0 && (
                          <div className="mt-2">
                            <div className="text-blue-600 mb-1">Your token votes:</div>
                            <div className="bg-gray-50 rounded-lg p-2 text-xs border border-gray-100 flex flex-col gap-1.5">
                              {voteSummary.tokenVotes.map((vote, index) => (
                                <div key={index} className="flex justify-between items-center">
                                  <span className="text-gray-600">{vote.symbol}:</span>
                                  <span className="text-blue-600 font-medium">{votingSystem.formatAmount(vote.tokenAddress, vote.tokenAmount)}</span>
                                </div>
                              ))}
                              <div className="border-t border-gray-200 pt-1 mt-1 flex justify-between items-center">
                              <span className="text-gray-600">Total CELO value:</span>
                              <span className="text-emerald-600 font-medium">
                                  {parseFloat(votingSystem.formatAmount(votingSystem.CELO_ADDRESS, voteSummary.totalCeloEquivalent)).toFixed(1)} CELO
                                </span>
                                
                                </div>
                            </div>
                          </div>
                        )}
                        
                        {userVoteHistory.length > 0 && (
                          <button
                            onClick={() => setShowVoteHistory(!showVoteHistory)}
                            className="flex items-center justify-center mt-2 text-xs text-blue-600 hover:text-blue-700"
                          >
                            <History className="h-3 w-3 mr-1" />
                            {showVoteHistory ? 'Hide History' : 'View History'}
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Vote History (conditionally displayed) */}
                    {showVoteHistory && userVoteHistory.length > 0 && (
                      <div className="w-full mb-4 border-t border-gray-200 pt-3">
                        <h4 className="text-sm font-medium text-center text-blue-600 mb-2">Your CELO Vote History</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {userVoteHistory.map((vote, index) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-2 text-xs border border-gray-100">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Amount:</span>
                                <span className="text-emerald-600 font-medium">{sovereignSeas.formatTokenAmount(vote.amount)} CELO</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Votes:</span>
                                <span className="text-gray-800 font-medium">{vote.voteCount.toString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="w-full space-y-3">
                      {canVote && (
                        <button
                          onClick={() => setVoteModalVisible(true)}
                          className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white rounded-full transition-colors flex items-center justify-center shadow-sm"
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Vote with Tokens
                        </button>
                      )}
                      
                      {(isAdmin || isSuperAdmin) && !project.approved && (
                        <button
                          onClick={handleApproveProject}
                          disabled={sovereignSeas.isWritePending || sovereignSeas.isWaitingForTx}
                          className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-full transition-colors flex items-center justify-center shadow-sm disabled:bg-gray-300 disabled:text-gray-500"
                        >
                          {sovereignSeas.isWritePending || sovereignSeas.isWaitingForTx ? (
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
                      
                      {isProjectOwner && !votingEnded && (
                        <button
                          onClick={() => router.push(`/campaign/${campaignId}/project/${projectId}/edit`)}
                          className="w-full py-2.5 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors flex items-center justify-center shadow-sm"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Project
                        </button>
                      )}
                      
                      <button
                        onClick={shareProject}
                        className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 text-gray-700 rounded-full transition-colors flex items-center justify-center border border-gray-200 shadow-sm"
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
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center mr-2">
                <Hash className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="font-medium text-gray-700">Campaign Status:</span>
                <span className={`ml-2 ${
                  hasEnded 
                    ? 'text-gray-500' 
                    : hasStarted 
                      ? 'text-emerald-600' 
                      : 'text-amber-600'
                }`}>
                  {hasEnded ? 'Ended' : hasStarted ? 'Active' : 'Not Started'}
                </span>
              </div>
              
              {hasStarted && !hasEnded && (
                <div className="text-amber-600 text-sm font-medium px-3 py-1 bg-amber-50 rounded-full border border-amber-100 shadow-sm">
                  ⏳ {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m remaining
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Project Statistics */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center tilt-neon">
              <LineChart className="h-5 w-5 mr-2 text-emerald-500" />
              Project Statistics
            </h2>
            <button 
              onClick={() => setShowProjectStats(!showProjectStats)}
              className="text-gray-400 hover:text-gray-600"
            >
              {showProjectStats ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>
          
          {showProjectStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center mb-1">
                  <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                    <BarChart className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-600">Vote Ranking</span>
                </div>
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-gray-800">{projectRanking.rank}</span>
                  <span className="text-gray-500 ml-1">/ {projectRanking.totalProjects}</span>
                </div>
                {projectRanking.rank <= Number(campaign.maxWinners) && Number(campaign.maxWinners) > 0 && (
                  <div className="mt-1 text-xs text-emerald-600">
                    <BadgeCheck className="h-3 w-3 inline mr-1" />
                    Currently in winning position
                  </div>
                )}
              </div>
              
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center mb-1">
                  <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center mr-2">
                    <Heart className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <span className="text-sm text-gray-600">Total Votes</span>
                </div>
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-gray-800">{sovereignSeas.formatTokenAmount(project.voteCount)}</span>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Multiplier: {campaign.voteMultiplier.toString()}x
                </div>
              </div>
              
              {hasFundsReceived && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center mb-1">
                    <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center mr-2">
                      <Coins className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                    <span className="text-sm text-gray-600">Funds Received</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-2xl font-bold text-amber-600">{sovereignSeas.formatTokenAmount(project.fundsReceived)}</span>
                    <span className="text-gray-500 ml-1">CELO</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Campaign Total: {sovereignSeas.formatTokenAmount(campaign.totalFunds)} CELO
                  </div>
                </div>
              )}
              
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center mb-1">
                  <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                    <Users className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-600">Distribution Method</span>
                </div>
                <div className="text-xl font-bold text-gray-800">
                  {campaign.useQuadraticDistribution ? 'Quadratic' : 'Linear'}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Max Winners: {campaign.maxWinners.toString() === '0' ? 'All Projects' : campaign.maxWinners.toString()}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Campaign Info Card */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6 shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center tilt-neon">
            <Hash className="h-5 w-5 mr-2 text-emerald-500" />
            About The Campaign
          </h2>
          
          <p className="text-gray-600 mb-4">{campaign.description}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 shadow-sm">
              <div className="text-sm text-gray-500">Distribution Method</div>
              <div className="font-medium text-gray-800">{campaign.useQuadraticDistribution ? 'Quadratic' : 'Linear'}</div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 shadow-sm">
              <div className="text-sm text-gray-500">Vote Multiplier</div>
              <div className="font-medium text-gray-800">{campaign.voteMultiplier.toString()}x</div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 shadow-sm">
              <div className="text-sm text-gray-500">Max Winners</div>
              <div className="font-medium text-gray-800">
                {campaign.maxWinners.toString() === '0' ? 'All Projects' : `Top ${campaign.maxWinners.toString()}`}
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 shadow-sm">
              <div className="text-sm text-gray-500">Total Funds</div>
              <div className="font-medium text-emerald-600">{sovereignSeas.formatTokenAmount(campaign.totalFunds)} CELO</div>
            </div>
          </div>
          
          <div className="mt-6">
            <button
              onClick={() => router.push(`/campaign/${campaignId}/dashboard`)}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors inline-flex items-center shadow-sm"
            >
              <Globe className="h-4 w-4 mr-2" />
              View All Projects
            </button>
          </div>
        </div>
      </div>
      
      {/* Enhanced Vote Modal with Token Selection */}
      {voteModalVisible && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 relative shadow-lg">
            <button 
              onClick={() => setVoteModalVisible(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
            
            <h3 className="text-xl font-bold mb-1 text-gray-800">Vote for Project</h3>
            <p className="text-emerald-600 font-medium mb-4">{project.name}</p>
            
            {/* Token Selection */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Select Token</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                {supportedTokens.map((token) => (
                  <button
                    key={token.address}
                    onClick={() => setSelectedToken(token.address)}
                    className={`py-2 px-3 rounded-lg border flex items-center justify-center text-sm transition-colors ${
                      selectedToken === token.address
                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {token.isNative ? (
                      <Coins className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                    ) : (
                      <CreditCard className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                    )}
                    {token.symbol}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Amount Input */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Amount</label>
              <div className="relative">
                <input 
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={voteAmount}
                  onChange={(e) => setVoteAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-800"
                  placeholder="Enter amount"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  {supportedTokens.find(t => t.address === selectedToken)?.symbol || ''}
                </div>
              </div>
            </div>
            
            {/* Exchange Rate Info */}
            {selectedToken && voteAmount && parseFloat(voteAmount) > 0 && selectedToken !== votingSystem.CELO_ADDRESS && (
              <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center text-gray-600 mb-2">
                  <Repeat className="h-4 w-4 mr-2 text-blue-500" />
                  <span className="font-medium">Exchange Rate</span>
                </div>
                
                {loadingExchangeRates ? (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-4 w-4 text-blue-500 animate-spin mr-2" />
                    <span className="text-sm text-gray-500">Calculating exchange rate...</span>
                  </div>
                ) : (
                  tokenExchangeRates[selectedToken] && (
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Approximate CELO:</span>
                        <span className="text-blue-600 font-medium">{tokenExchangeRates[selectedToken].expectedCelo}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                        <span className="text-gray-500">Voting power (after fees):</span>
                        <span className="text-emerald-600 font-medium">{tokenExchangeRates[selectedToken].voteAmount}</span>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
            
            {/* Slippage Settings (for non-CELO tokens) */}
            {selectedToken !== votingSystem.CELO_ADDRESS && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-700 font-medium">Slippage Tolerance</label>
                  <span className="text-blue-600 font-medium">{slippagePercent}%</span>
                </div>
                <div className="flex gap-2">
                  {[0.1, 0.5, 1.0, 2.0].map((percent) => (
                    <button
                      key={percent}
                      onClick={() => setSlippagePercent(percent)}
                      className={`flex-1 py-1.5 text-sm rounded-lg transition-colors ${
                        slippagePercent === percent
                          ? 'bg-blue-50 text-blue-700 font-medium border border-blue-200'
                          : 'bg-gray-50 text-gray-600 border border-gray-200'
                      }`}
                    >
                      {percent}%
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Your transaction will revert if the price changes unfavorably by more than this percentage.
                </p>
              </div>
            )}
            
            {/* Vote Information */}
            {selectedToken === votingSystem.CELO_ADDRESS && voteAmount && !isNaN(parseFloat(voteAmount)) && parseFloat(voteAmount) > 0 && (
              <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100 shadow-sm">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-700">
                      Each CELO token is worth {campaign.voteMultiplier.toString()} votes.
                    </p>
                    <p className="text-sm text-blue-700 font-medium mt-1">
                      Your vote will be worth {parseFloat(voteAmount) * Number(campaign.voteMultiplier)} votes.
                    </p>
                    {directCeloVotes > BigInt(0) && (
                      <p className="text-xs text-blue-600 mt-1">
                        You've already voted {votingSystem.formatAmount(votingSystem.CELO_ADDRESS, directCeloVotes)} CELO on this project.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={handleVote}
                disabled={votingSystem.isLoading || !selectedToken || !voteAmount || parseFloat(voteAmount) <= 0}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-500 to-pink-500 text-white font-semibold rounded-full hover:from-blue-600 hover:to-pink-600 transition-colors shadow-md disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                {votingSystem.isLoading ? (
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
                className="py-3 px-6 bg-white border border-gray-200 text-gray-700 font-semibold rounded-full hover:bg-gray-50 transition-colors shadow-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Media Modal */}
      {showMediaModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl p-6 relative shadow-lg">
            <button
              onClick={() => setShowMediaModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
            
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              {activeMediaType === 'logo' ? 'Project Logo' : 'Demo Video'}
            </h3>
            
            <div className="flex items-center justify-center bg-gray-50 rounded-xl p-4 min-h-[300px] border border-gray-200">
              {activeMediaType === 'logo' && project.logo && (
                <img 
                  src={project.logo} 
                  alt={`${project.name} Logo`} 
                  className="max-w-full max-h-[60vh] object-contain rounded-lg"
                  ref={logoRef}
                  onError={(e) => {
                    e.currentTarget.src = "https://placehold.co/600x400/f1f5f9/64748b?text=Logo%20Unavailable";
                  }}
                />
              )}
              
              {activeMediaType === 'video' && project.demoVideo && (
                <div className="w-full">
                  <video 
                    ref={videoRef}
                    src={project.demoVideo}
                    controls
                    autoPlay
                    className="max-w-full max-h-[60vh] mx-auto rounded-lg"
                    onError={() => {
                      setStatusMessage({
                        text: 'Error loading video. Please check the URL or try another format.',
                        type: 'error'
                      });
                      setShowMediaModal(false);
                    }}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-gray-500 text-sm break-all">
                {activeMediaType === 'logo' ? project.logo : project.demoVideo}
              </p>
            </div>
            
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setShowMediaModal(false)}
                className="px-6 py-2.5 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}