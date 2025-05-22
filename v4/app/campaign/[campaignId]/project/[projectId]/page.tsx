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
  Repeat,
  MousePointerClick,
  Filter,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { useSovereignSeas } from '../../../../../hooks/useSovereignSeas';
import { useVotingSystem } from '../../../../../hooks/useVotingSystem';
import erc20Abi from '@/abis/MockCELO.json';
import { formatEther } from 'viem';

type Campaign = any; // Assuming the Campaign type is imported from somewhere

type TokenSupport = {
  address: string;
  symbol: string;
  decimals: number;
  isNative?: boolean;
};

type TokenBalances = {
  [key: `0x${string}`]: bigint;
};

type TokenBalanceResult = {
  address: `0x${string}`;
  balance: bigint;
};

type Project = any; // Assuming the Project type is imported from somewhere

type VoteSummary = any; // Assuming the VoteSummary type is imported from somewhere

type Vote = any; // Assuming the Vote type is imported from somewhere

type TokenVote = any; // Assuming the TokenVote type is imported from somewhere

// Token Vote Pie Chart Component
const TokenVotePieChart = ({ projectData, voteSummary }: { projectData: any, voteSummary: any }) => {
  if (!projectData || !voteSummary) {
    return <div className="flex items-center justify-center h-48 text-gray-500">No data available</div>;
  }

  // Simple placeholder for the pie chart
  return (
    <div className="flex flex-col items-center">
      <div className="mx-auto h-48 w-48 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border-4 border-white shadow-inner flex items-center justify-center">
        <div className="text-blue-600 font-bold text-2xl">
          {projectData.voteCount ? formatEther(projectData.voteCount).slice(0, 5) : "0"} 
          <div className="text-sm font-normal text-gray-600">CELO votes</div>
        </div>
      </div>
      <p className="mt-4 text-sm text-gray-600">
        Token vote distribution visualization
      </p>
    </div>
  );
};

export default function ProjectDetails() {
  const router = useRouter();
  const { campaignId, projectId } = useParams();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  
  // Data states
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [voteSummary, setVoteSummary] = useState<VoteSummary | null>(null);
  const [userVoteHistory, setUserVoteHistory] = useState<Vote[]>([]);
  const [isProjectOwner, setIsProjectOwner] = useState(false);
  const [projectRanking, setProjectRanking] = useState({ rank: 0, totalProjects: 0 });
  
  // Token-related states
  const [supportedTokens, setSupportedTokens] = useState<TokenSupport[]>([]);
  const [selectedToken, setSelectedToken] = useState('');
  const [tokenBalances, setTokenBalances] = useState<TokenBalances>({});
  const [tokenExchangeRates, setTokenExchangeRates] = useState({});
  const [loadingExchangeRates, setLoadingExchangeRates] = useState(false);
  const [tokenVoteDistributionVisible, setTokenVoteDistributionVisible] = useState(false);
  const [allProjectVotes, setAllProjectVotes] = useState<VoteSummary | null>(null);

  // UI states
  const [voteModalVisible, setVoteModalVisible] = useState(false);
  const [voteAmount, setVoteAmount] = useState('');
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [activeMediaType, setActiveMediaType] = useState<'logo' | 'video' | null>(null);
  const [showContractsSection, setShowContractsSection] = useState(false);
  const [showVoteHistory, setShowVoteHistory] = useState(false);
  const [showProjectStats, setShowProjectStats] = useState(true);
  const [slippagePercent, setSlippagePercent] = useState(0.5); // Default 0.5%
  
  // Media content refs
  const logoRef = useRef(null);
  const videoRef = useRef(null);
  
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

  // Format token balance using formatEther for clean display with 3 decimal places
  const formatTokenBalance = (tokenAddress: string, balance: bigint) => {
    if (!balance) return '0';
    
    const token = supportedTokens.find(t => t.address === tokenAddress);
    
    // Use formatEther for standard 18-decimal tokens
    if (!token || token.decimals === 18) {
      // Format with formatEther and limit to 3 decimal places
      const formattedBalance = formatEther(balance);
      const parts = formattedBalance.split('.');
      
      // Format integer part with commas
      const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      
      // If there's a decimal part, keep only 3 places
      if (parts[1]) {
        return `${integerPart}.${parts[1].substring(0, 3)}`;
      }
      
      return integerPart;
    } else {
      // For tokens with non-standard decimals
      let divisor = BigInt(1);
      for (let i = 0; i < token.decimals; i++) {
          divisor *= BigInt(10);
      }
      const integerPart = balance / divisor;
      const fractionalPart = balance % divisor;
      
      // Format integer part with commas
      const formattedIntegerPart = integerPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      
      // Format to 3 decimal places
      if (fractionalPart > BigInt(0)) {
        const fractionalStr = fractionalPart.toString().padStart(token.decimals, '0');
        return `${formattedIntegerPart}.${fractionalStr.substring(0, 3)}`;
      }
      
      return formattedIntegerPart;
    }
  };

  const fetchAllTokenBalances = async () => {
    if (!address || !supportedTokens.length) return;
    
    try {
      // Process tokens in parallel for faster loading
      const fetchPromises = supportedTokens.map(async (token) => {
        try {
          if (token.address.toLowerCase() === votingSystem.CELO_ADDRESS.toLowerCase()) {
            // Fetch native CELO balance
            if (votingSystem.celoSwapper.publicClient) {
              const balance = await votingSystem.celoSwapper.publicClient.getBalance({
                address: address
              });
              return { address: token.address, balance };
            }
          } else {
            // Fetch ERC20 token balance
            if (votingSystem.celoSwapper.publicClient) {
              const balance = await votingSystem.celoSwapper.publicClient.readContract({
                address: token.address as `0x${string}`,
                abi: erc20Abi,
                functionName: 'balanceOf',
                args: [address]
              });
              return { address: token.address, balance };
            }
          }
          return { address: token.address, balance: BigInt(0) };
        } catch (error) {
          console.error(`Error fetching balance for ${token.symbol}:`, error);
          return { address: token.address, balance: BigInt(0) };
        }
      });

      const results = await Promise.all(fetchPromises);
      
      // Update all balances at once
      const newBalances = (results as (TokenBalanceResult | null)[]).reduce((acc: TokenBalances, result: TokenBalanceResult | null) => {
        if (result) {
          acc[result.address] = result.balance;
        }
        return acc;
      }, {});
      
      setTokenBalances(prev => ({
        ...prev,
        ...newBalances
      }));
    } catch (error) {
      console.error("Error fetching all token balances:", error);
    }
  };
  
  // Add this effect to load balances when supported tokens are available or address changes
  useEffect(() => {
    if (address && supportedTokens.length > 0) {
      fetchAllTokenBalances();
    }
  }, [address, supportedTokens.length]);
  
  // Load token distribution data when visibility toggles
  useEffect(() => {
    if (tokenVoteDistributionVisible && campaignId && projectId) {
      loadProjectTokenVotes();
    }
  }, [tokenVoteDistributionVisible, campaignId, projectId]);

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
  
  // Added getAllProjectVotes function
  const loadProjectTokenVotes = async () => {
    try {
      if (!campaignId || !projectId) return;
      
      // Get vote summary for the project - simulation for now
      // In a real implementation, you would call a function to get all votes for this project
      const summary = await votingSystem.getUserVoteSummary(Number(campaignId), Number(projectId));
      
      setAllProjectVotes(summary);
    } catch (error) {
      console.error('Error loading project token votes:', error);
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
          expectedCelo: formatValue(votingSystem.formatAmount(votingSystem.CELO_ADDRESS, expectedCelo)),
          voteAmount: formatValue(votingSystem.formatAmount(votingSystem.CELO_ADDRESS, voteAmount))
        }
      });
    } catch (error) {
      console.error('Error getting token exchange rate:', error);
    } finally {
      setLoadingExchangeRates(false);
    }
  };
  
  const formatValue = (value: string) => {
    const parsed = parseFloat(value);
    return Number.isInteger(parsed) ? parsed.toString() : parsed.toFixed(1);
  };
  
  const handleVote = async () => {
    if (!selectedToken || !voteAmount || parseFloat(voteAmount) <= 0) return;
    
    try {
      setStatusMessage({ text: 'Processing your vote...', type: 'info' });
      
      // Fixed 2% slippage (200 basis points)
      const slippageBps = 200;
      
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
      
      // Get token symbol for message
      const token = supportedTokens.find(t => t.address === selectedToken);
      const tokenSymbol = token ? token.symbol : 'tokens';
      
      setStatusMessage({ 
        text: `Vote successful! You voted ${voteAmount} ${tokenSymbol} for ${project.name}.`, 
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
  const openMediaModal = (type: 'logo' | 'video') => {
    setActiveMediaType(type);
    setShowMediaModal(true);
  };
  
  if (!isMounted) {
    return null;
  }
  
  if (loading || !campaign || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50 text-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-lg text-blue-600">Loading project details...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50 text-gray-800 relative">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-r from-blue-400/10 to-indigo-400/10 animate-float-slower blur-2xl"></div>
        <div className="absolute top-2/3 right-1/4 w-80 h-80 rounded-full bg-gradient-to-r from-sky-400/10 to-blue-400/10 animate-float-slow blur-2xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 rounded-full bg-gradient-to-r from-indigo-400/10 to-purple-400/10 animate-float blur-2xl"></div>
      </div>
      
      <div className="container mx-auto px-6 py-8 relative z-10">
        {/* Navigation */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/campaign/${campaignId}/dashboard`)}
            className="inline-flex items-center text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaign
          </button>
        </div>
        
        {/* Status Message */}
        {statusMessage.text && (
          <div className={`mb-6 p-4 rounded-xl shadow-lg ${
            statusMessage.type === 'success' || statusMessage.type === 'info'
              ? 'bg-blue-50 border border-blue-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-start">
              {statusMessage.type === 'success' ? (
                <ThumbsUp className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
              ) : statusMessage.type === 'info' ? (
                <Info className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
              )}
              <p className={statusMessage.type === 'success' || statusMessage.type === 'info' ? 'text-blue-700' : 'text-red-700'}>
                {statusMessage.text}
              </p>
            </div>
          </div>
        )}
        
        {/* Project Header */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100 overflow-hidden mb-6 shadow-lg group hover:shadow-xl transition-all hover:-translate-y-1 duration-300 relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-10 blur-sm transition-all duration-500"></div>
          <div className="p-6 relative z-10">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex-grow">
                {/* Project Title and Approval Status */}
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h1 className="text-2xl font-bold flex items-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                    <Hash className="h-7 w-7 text-blue-500 mr-2" />
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
                
                {/* Vote Stats and Actions */}
                <div className="shrink-0 flex flex-col items-center">
                  <div className="bg-white/90 backdrop-blur-sm rounded-xl p-5 border border-blue-100 shadow-lg w-full md:w-auto group hover:shadow-xl transition-all hover:-translate-y-1 duration-300 relative overflow-hidden">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-10 blur-sm transition-all duration-500"></div>
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                        <Heart className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="text-3xl font-bold text-gray-800 mb-1">{formatValue(sovereignSeas.formatTokenAmount(project.voteCount))}</div>
                      <div className="text-sm text-gray-500 mb-4">
                        Total {Number(campaign.voteMultiplier) > 1 ? `(${campaign.voteMultiplier.toString()}x)` : ''} Votes
                      </div>

                      {/* Show unified vote summary */}
                      {voteSummary && (
                        <div className="text-sm mb-4 text-center w-full">
                          {/* Direct CELO votes */}
                          {directCeloVotes > BigInt(0) && (
                            <div className="text-blue-600 mb-2">
                              You've voted {votingSystem.formatAmount(votingSystem.CELO_ADDRESS, directCeloVotes)} directly
                            </div>
                          )}
                          
                          {/* Token votes */}
                          {voteSummary.tokenVotes && voteSummary.tokenVotes.length > 0 && (
                            <div className="mt-2">
                              <div className="text-blue-600 mb-1">Your token votes:</div>
                              <div className="bg-gray-50 rounded-lg p-2 text-xs border border-gray-100 flex flex-col gap-1.5">
                                {voteSummary.tokenVotes.map((vote: TokenVote, index: number) => (
                                  <div key={index} className="flex justify-between items-center">
                                    <span className="text-gray-600">{vote.symbol}:</span>
                                    <span className="text-blue-600 font-medium">{votingSystem.formatAmount(vote.tokenAddress, vote.tokenAmount)}</span>
                                  </div>
                                ))}
                                <div className="border-t border-gray-200 pt-1 mt-1 flex justify-between items-center">
                                  <span className="text-gray-600">Total CELO value:</span>
                                  <span className="text-blue-600 font-medium">
                                    {parseFloat(votingSystem.formatAmount(votingSystem.CELO_ADDRESS, voteSummary.totalCeloEquivalent)).toFixed(2)} CELO
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
                                  <span className="text-blue-600 font-medium">{sovereignSeas.formatTokenAmount(vote.amount)} CELO</span>
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

                      {/* Project Token Votes Button */}
                      <button 
                        onClick={() => {
                          setTokenVoteDistributionVisible(true);
                          loadProjectTokenVotes();
                        }}
                        className="w-full py-2 mb-3 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white text-sm font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center shadow-sm border border-blue-400/30 relative overflow-hidden group"
                      >
                        <span className="relative z-10 flex items-center">
                          <PieChart className="h-4 w-4 mr-1.5 group-hover:rotate-12 transition-transform duration-300" />
                          Token Distribution
                        </span>
                        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                      </button>

                      <div className="w-full space-y-3">
                        {canVote && (
                          <button
                            onClick={() => setVoteModalVisible(true)}
                            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center shadow-sm border border-blue-400/30 relative overflow-hidden group"
                          >
                            <span className="relative z-10 flex items-center">
                              <CreditCard className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                              Vote with Tokens
                            </span>
                            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                          </button>
                        )}
                        
                        {(isAdmin || isSuperAdmin) && !project.approved && (
                          <button
                            onClick={handleApproveProject}
                            disabled={sovereignSeas.isWritePending || sovereignSeas.isWaitingForTx}
                            className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center shadow-sm disabled:bg-gray-300 disabled:text-gray-500 border border-amber-400/30 relative overflow-hidden group"
                          >
                            {sovereignSeas.isWritePending || sovereignSeas.isWaitingForTx ? (
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                Processing...
                              </div>
                            ) : (
                              <>
                                <span className="relative z-10 flex items-center">
                                  <BadgeCheck className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                                  Approve Project
                                </span>
                                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                              </>
                            )}
                          </button>
                        )}

                        {isProjectOwner && !votingEnded && (
                          <button
                            onClick={() => router.push(`/campaign/${campaignId}/project/${projectId}/edit`)}
                            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center shadow-sm border border-blue-400/30 relative overflow-hidden group"
                          >
                            <span className="relative z-10 flex items-center">
                              <Edit className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                              Edit Project
                            </span>
                            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                          </button>
                        )}

                        <button
                          onClick={shareProject}
                          className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 text-gray-700 rounded-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center border border-gray-200 shadow-sm relative overflow-hidden group"
                        >
                          <span className="relative z-10 flex items-center">
                            <Share2 className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform duration-300" />
                            Share Project
                          </span>
                          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-gray-100/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Campaign Name */}
            <p className="text-blue-600 mb-4">
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
                    <div className="text-xs text-gray-500 truncate max-w-xs">
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
                    <div className="font-medium">Social Profile</div>
                    <div className="text-xs text-gray-500 truncate max-w-xs">
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
                    <div className="text-xs text-gray-500 truncate max-w-xs">
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
                  <h3 className="text-lg font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center">
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
                  <h3 className="text-lg font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center">
                    <Code className="h-4 w-4 mr-2 text-indigo-600" />
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
                  Rank: <span className="ml-1 text-blue-600 font-medium">{projectRanking.rank}</span> of {projectRanking.totalProjects}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}