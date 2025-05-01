'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { 
  BarChart3, Calendar, Clock, Download, FileText, Github, 
  Globe, PieChart, Plus, Settings, Share2, 
  Users, Award, X, Eye, TrendingUp, ChevronUp, 
  ChevronDown, Info, AlertTriangle, ImageIcon, Video, Code, 
  History, MousePointerClick, Wallet, Filter, RefreshCw, 
  LineChart, ExternalLink, Edit, User, Hash, CreditCard, 
  Coins, DollarSign, Repeat
} from 'lucide-react';
import { useSovereignSeas } from '@/hooks/useSovereignSeas';
import { useVotingSystem } from '@/hooks/useVotingSystem';
import { formatEther } from 'viem';
import React from 'react';

// Type definitions
type TokenVote = {
  tokenAddress: string;
  tokenAmount: bigint;
  celoEquivalent: bigint;
  symbol: string;
};

type ProjectVoteSummary = {
  tokenVotes: TokenVote[];
};

type ChartDataItem = {
  name: string;
  value: number;
  color: string;
  percentage: string;
};

// Simple status message component
const StatusMessage = ({ text, type }) => (
  <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border max-w-md animate-fade-in flex items-start 
    ${type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
    {type === 'success' ? (
      <Award className="h-5 w-5 mr-2 flex-shrink-0" />
    ) : (
      <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
    )}
    <span>{text}</span>
  </div>
);

export default function CampaignDashboard() {
  const router = useRouter();
  const { campaignId } = useParams();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  
  // States with default values to reduce code
  const [activeTab, setActiveTab] = useState('overview');
  const [campaign, setCampaign] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canDistributeFunds, setCanDistributeFunds] = useState(false);
  const [fundsDistributed, setFundsDistributed] = useState(false);
  const [voteModalVisible, setVoteModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [voteAmount, setVoteAmount] = useState('');
  const [distributionTableVisible, setDistributionTableVisible] = useState(false);
  const [selectedToken, setSelectedToken] = useState('');
  const [supportedTokens, setSupportedTokens] = useState([]);
  const [tokenExchangeRates, setTokenExchangeRates] = useState({});
  const [loadingExchangeRates, setLoadingExchangeRates] = useState(false);
  const [allProjectVotes, setAllProjectVotes] = useState(null);
  const [tokenVoteDistributionVisible, setTokenVoteDistributionVisible] = useState(false);
  const [tokenBalances, setTokenBalances] = useState({});
  const [userVoteHistory, setUserVoteHistory] = useState([]);
  const [voteHistoryVisible, setVoteHistoryVisible] = useState(false);
  const [userVoteStats, setUserVoteStats] = useState({
    totalVotes: '0',
    projectCount: 0,
    tokenVotes: []
  });
  const [projectSortMethod, setProjectSortMethod] = useState('votes');
  const [projectStatusFilter, setProjectStatusFilter] = useState('approved');
  const [sortedProjects, setSortedProjects] = useState([]);
  const [projectRankingsVisible, setProjectRankingsVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: null });
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Hook integrations
  const sovereignSeas = useSovereignSeas();
  const votingSystem = useVotingSystem();
  
  // Constants
  const CUSD_ADDRESS = "0x471EcE3750Da237f93B8E339c536989b8978a438";
  
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);
 
  // Utility formatter with better handling
  const formatValue = useCallback((value) => {
    if (!value) return '0';
    const parsed = parseFloat(value);
    return Number.isInteger(parsed) ? parsed.toString() : parsed.toFixed(1);
  }, []);
  
  // Format token balance - simplified
  const formatTokenBalance = useCallback((tokenAddress, balance) => {
    if (!balance) return '0';
    
    const formattedBalance = formatEther(balance);
    const parts = formattedBalance.split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    
    return parts[1] 
      ? `${integerPart}.${parts[1].substring(0, 2)}`
      : integerPart;
  }, []);
  
  // Get token symbol - simplified
  const getTokenSymbol = useCallback((tokenAddress) => {
    if (!tokenAddress) return '';
    
    if (tokenAddress.toLowerCase() === CUSD_ADDRESS.toLowerCase()) {
      return "cUSD";
    }
    
    const token = supportedTokens.find(t => t.address === tokenAddress);
    if (token?.symbol) return token.symbol;
    
    return `${tokenAddress.substring(0, 6)}...${tokenAddress.substring(tokenAddress.length - 4)}`;
  }, [supportedTokens, CUSD_ADDRESS]);

  // Fetch token balances - simplified
  const fetchAllTokenBalances = useCallback(async () => {
    if (!address || !supportedTokens.length) return;
    
    try {
      const newBalances = {...tokenBalances};
      
      for (const token of supportedTokens) {
        try {
          // Simplified to mock value for demo
          newBalances[token.address] = BigInt(1000000000000000000);
        } catch (error) {
          console.error(`Error fetching balance for ${token.symbol || token.address}:`, error);
          newBalances[token.address] = BigInt(0);
        }
      }
      
      setTokenBalances(newBalances);
    } catch (error) {
      console.error("Error fetching token balances:", error);
      setStatusMessage({
        text: 'Error fetching token balances',
        type: 'error'
      });
    }
  }, [address, supportedTokens, tokenBalances]);

  // Load supported tokens with error handling
  const loadSupportedTokens = useCallback(async () => {
    try {
      if (!votingSystem) return;
      
      const tokens = await votingSystem.loadSupportedTokens();
      if (Array.isArray(tokens)) {
        setSupportedTokens(tokens);
        
        // Set CELO as default
        const celoToken = tokens.find(t => t.isNative);
        setSelectedToken(celoToken ? celoToken.address : tokens[0]?.address);
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
      setStatusMessage({
        text: 'Error loading tokens',
        type: 'error'
      });
    }
  }, [votingSystem]);

  // Get token exchange rate - simplified
  const getTokenExchangeRate = useCallback(async (tokenAddress, amount) => {
    if (!tokenAddress || !amount || parseFloat(amount) <= 0 || !votingSystem) return;
    
    try {
      setLoadingExchangeRates(true);
      
      // CELO has 1:1 rate
      if (tokenAddress.toLowerCase() === votingSystem.CELO_ADDRESS?.toLowerCase()) {
        setTokenExchangeRates(prev => ({
          ...prev,
          [tokenAddress]: {
            expectedCelo: amount,
            voteAmount: amount
          }
        }));
        setLoadingExchangeRates(false);
        return;
      }
      
      // For other tokens
      const { expectedCelo, voteAmount } = await votingSystem.celoSwapper.getExpectedVoteAmount(
        tokenAddress,
        amount
      );
      
      setTokenExchangeRates(prev => ({
        ...prev,
        [tokenAddress]: {
          expectedCelo: formatValue(votingSystem.formatAmount(votingSystem.CELO_ADDRESS, expectedCelo)),
          voteAmount: formatValue(votingSystem.formatAmount(votingSystem.CELO_ADDRESS, voteAmount))
        }
      }));
    } catch (error) {
      console.error('Error getting token exchange rate:', error);
      setStatusMessage({ text: 'Error calculating exchange rate', type: 'error' });
    } finally {
      setLoadingExchangeRates(false);
    }
  }, [votingSystem, formatValue]);
  
  // Load campaign data - simplified
  const loadCampaignData = useCallback(async () => {
    if (!sovereignSeas) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const allCampaigns = await sovereignSeas.loadCampaigns();
      
      if (Array.isArray(allCampaigns) && allCampaigns.length > 0) {
        const campaignData = allCampaigns.find(c => c.id.toString() === campaignId);
        
        if (campaignData) {
          setCampaign(campaignData);
          
          // Check admin status
          setIsAdmin(address && (
            campaignData.admin.toLowerCase() === address.toLowerCase() || 
            sovereignSeas.isSuperAdmin
          ));
          
          // Check distribution status
          const now = Math.floor(Date.now() / 1000);
          const isAdminFlag = address && (
            campaignData.admin.toLowerCase() === address.toLowerCase() || 
            sovereignSeas.isSuperAdmin
          );
          
          setCanDistributeFunds(campaignData.active && now > Number(campaignData.endTime) && isAdminFlag);
          
          // Load projects
          if (campaignId) {
            const projectsData = await sovereignSeas.loadProjects(Number(campaignId));
            
            if (Array.isArray(projectsData)) {
              const hasDistributed = !campaignData.active || 
                                   projectsData.some(p => Number(p.fundsReceived) > 0);
              
              setFundsDistributed(hasDistributed);
              setCanDistributeFunds(isAdminFlag && !hasDistributed && now > Number(campaignData.endTime));
              setDistributionTableVisible(hasDistributed);
              setProjects(projectsData);
              
              // Apply sorting and filtering
              applySortingAndFiltering(projectsData, projectSortMethod, projectStatusFilter);
            }
          }
        } else {
          throw new Error(`Campaign with ID ${campaignId} not found`);
        }
      } else {
        throw new Error("No campaigns found");
      }
    } catch (error) {
      console.error('Error loading campaign:', error);
      setError("Failed to load campaign data");
      
      // Set default data
      if (!campaign) {
        setCampaign({
          name: "Campaign Not Available",
          description: "Error loading details",
          startTime: Date.now() / 1000,
          endTime: (Date.now() / 1000) + 86400,
          totalFunds: "0",
          voteMultiplier: "1",
          maxWinners: "0",
          useQuadraticDistribution: false,
          active: false
        });
      }
    } finally {
      setLoading(false);
    }
  }, [sovereignSeas, campaignId, address, campaign, projectSortMethod, projectStatusFilter]);
  
  // Load user vote data - simplified
  const loadUserVoteData = useCallback(async () => {
    try {
      if (!address || !sovereignSeas || !votingSystem || !campaignId) return;
      
      // Get vote history
      const history = await sovereignSeas.getUserVoteHistory();
      
      if (Array.isArray(history)) {
        setUserVoteHistory(history.filter(vote => vote.campaignId.toString() === campaignId));
      }
      
      // Get token votes
      try {
        const summary = await votingSystem.getUserCampaignVotes(Number(campaignId));
        if (summary) {
          setUserVoteStats(prev => ({
            ...prev,
            tokenVotes: summary.tokenVotes || []
          }));
        }
      } catch (err) {
        console.error('Error loading token votes:', err);
      }
    } catch (error) {
      console.error('Error loading vote history:', error);
      setUserVoteHistory([]);
    }
  }, [address, sovereignSeas, votingSystem, campaignId]);
  
  // Load user vote stats - simplified
  const loadUserVoteStats = useCallback(async () => {
    try {
      if (!address || !campaignId || !sovereignSeas) return;
      
      const totalVotes = await sovereignSeas.getUserTotalVotesInCampaign(Number(campaignId));
      
      // Count voted projects
      const votedProjects = new Set();
      userVoteHistory.forEach(vote => {
        if (vote.campaignId.toString() === campaignId) {
          votedProjects.add(vote.projectId.toString());
        }
      });
      
      setUserVoteStats(prev => ({
        ...prev,
        totalVotes: formatValue(sovereignSeas.formatTokenAmount(totalVotes)),
        projectCount: votedProjects.size
      }));
    } catch (error) {
      console.error('Error loading vote stats:', error);
    }
  }, [address, campaignId, sovereignSeas, userVoteHistory, formatValue]);
  
  // Load project rankings - simplified
  const loadProjectRankings = useCallback(async () => {
    try {
      if (!campaign || !sovereignSeas || !campaignId) return;
      
      const ranked = await sovereignSeas.getSortedProjects(Number(campaignId));
      if (Array.isArray(ranked)) {
        setSortedProjects(ranked);
      }
    } catch (error) {
      console.error('Error loading rankings:', error);
      setStatusMessage({
        text: 'Error loading rankings',
        type: 'error'
      });
    }
  }, [campaign, sovereignSeas, campaignId]);
  
  // Load project token votes - simplified
  const loadProjectTokenVotes = useCallback(async () => {
    try {
      if (!campaignId || !selectedProject || !votingSystem) return;
      
      const projectVotes = await votingSystem.getUserVoteSummary(
        Number(campaignId), 
        Number(selectedProject.id)
      );
      
      setAllProjectVotes(projectVotes);
    } catch (error) {
      console.error('Error loading token votes:', error);
      setAllProjectVotes({ tokenVotes: [] });
    }
  }, [campaignId, selectedProject, votingSystem]);
  
  // Apply sorting and filtering - simplified
  const applySortingAndFiltering = useCallback((
    projectList,
    sortMethod, 
    statusFilter
  ) => {
    try {
      // First filter
      let filtered = [...projectList];
      
      if (statusFilter === 'approved') {
        filtered = filtered.filter(p => p.approved);
      } else if (statusFilter === 'pending') {
        filtered = filtered.filter(p => !p.approved);
      }
      
      // Then sort
      let sorted;
      
      switch (sortMethod) {
        case 'votes':
          sorted = filtered.sort((a, b) => Number(b.voteCount) - Number(a.voteCount));
          break;
        case 'newest':
          sorted = filtered.sort((a, b) => Number(b.id) - Number(a.id));
          break;
        case 'alphabetical':
          sorted = filtered.sort((a, b) => a.name.localeCompare(b.name));
          break;
        default:
          sorted = filtered;
      }
      
      setSortedProjects(sorted);
    } catch (error) {
      console.error('Error applying sorting:', error);
      setSortedProjects([...projectList]);
    }
  }, []);
  
  // Handle vote - simplified
  const handleVote = useCallback(async () => {
    if (!selectedProject || !voteAmount || parseFloat(voteAmount) <= 0 || !campaignId || !selectedToken || !votingSystem) {
      setStatusMessage({
        text: 'Please select project, token, and amount',
        type: 'error'
      });
      return;
    }
    
    try {
      // Fixed 2% slippage
      const slippageBps = 200;
      
      await votingSystem.vote(
        selectedToken,
        parseInt(campaignId),
        selectedProject.id,
        voteAmount,
        slippageBps
      );
      
      setVoteModalVisible(false);
      setVoteAmount('');
      
      setStatusMessage({
        text: `Vote successful! ${voteAmount} ${getTokenSymbol(selectedToken)} for ${selectedProject.name}`,
        type: 'success'
      });
      
      // Refresh data
      setTimeout(() => {
        loadUserVoteData();
        loadUserVoteStats();
        loadCampaignData();
        
        if (tokenVoteDistributionVisible) {
          loadProjectTokenVotes();
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error voting:', error);
      setStatusMessage({
        text: 'Error submitting vote',
        type: 'error'
      });
    }
  }, [
    selectedProject, 
    voteAmount, 
    campaignId, 
    selectedToken, 
    votingSystem, 
    getTokenSymbol, 
    loadUserVoteData, 
    loadUserVoteStats, 
    loadCampaignData, 
    tokenVoteDistributionVisible, 
    loadProjectTokenVotes
  ]);
  
  // Handle fund distribution - simplified
  const handleDistributeFunds = useCallback(async () => {
    if (!canDistributeFunds || !sovereignSeas) return;
    
    try {
      await sovereignSeas.distributeFunds(Number(campaignId));
      
      setStatusMessage({
        text: 'Funds distributed successfully!',
        type: 'success'
      });
      
      setTimeout(() => {
        loadCampaignData();
        setDistributionTableVisible(true);
      }, 2000);
      
    } catch (error) {
      console.error('Error distributing funds:', error);
      setStatusMessage({
        text: 'Error distributing funds',
        type: 'error'
      });
    }
  }, [canDistributeFunds, sovereignSeas, campaignId, loadCampaignData]);
  
  // Share campaign
  const shareCampaign = useCallback(() => {
    const url = window.location.origin + `/campaign/${campaignId}`;
    navigator.clipboard.writeText(url);
    setStatusMessage({
      text: 'Campaign link copied!',
      type: 'success'
    });
  }, [campaignId]);

  // Load token balances when tokens are available
  useEffect(() => {
    if (!isMounted) return;
    
    if (address && supportedTokens.length > 0) {
      const timer = setTimeout(() => fetchAllTokenBalances(), 500);
      return () => clearTimeout(timer);
    }
  }, [isMounted, address, supportedTokens, fetchAllTokenBalances]);
  
  // Centralized data loading
  useEffect(() => {
    if (!isMounted || dataLoaded) return;
    
    const isReady = sovereignSeas?.isInitialized && votingSystem?.isInitialized && campaignId;
    
    if (isReady) {
      let isLoading = false;
      
      const loadData = async () => {
        if (isLoading) return;
        isLoading = true;
        
        try {
          await loadCampaignData();
          await loadSupportedTokens();
          if (address) {
            await loadUserVoteData();
            await loadUserVoteStats();
          }
          setDataLoaded(true);
        } finally {
          isLoading = false;
        }
      };
      
      loadData();
    }
  }, [
    isMounted,
    dataLoaded,
    sovereignSeas?.isInitialized,
    votingSystem?.isInitialized, 
    campaignId, 
    address, 
    loadCampaignData,
    loadSupportedTokens,
    loadUserVoteData,
    loadUserVoteStats
  ]);
  
  // Project filter/sort changes
  useEffect(() => {
    if (projects.length > 0) {
      applySortingAndFiltering(projects, projectSortMethod, projectStatusFilter);
    }
  }, [projects, projectSortMethod, projectStatusFilter, applySortingAndFiltering]);
  
  // Load rankings when toggle is activated
  useEffect(() => {
    if (projectRankingsVisible && campaign && !loading) {
      loadProjectRankings();
    }
  }, [projectRankingsVisible, campaign, loading, loadProjectRankings]);
  
  // Calculate exchange rates
  useEffect(() => {
    if (selectedToken && voteAmount && parseFloat(voteAmount) > 0) {
      const currentRate = tokenExchangeRates[selectedToken];
      const voteAmountFormatted = parseFloat(voteAmount).toString();
      
      if (!currentRate || currentRate.voteAmount !== voteAmountFormatted) {
        const timer = setTimeout(() => getTokenExchangeRate(selectedToken, voteAmount), 500);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedToken, voteAmount, getTokenExchangeRate, tokenExchangeRates]);
  
  // Load token distribution when modal opens
  useEffect(() => {
    if (tokenVoteDistributionVisible && campaignId && selectedProject) {
      loadProjectTokenVotes();
    }
  }, [tokenVoteDistributionVisible, campaignId, selectedProject, loadProjectTokenVotes]);
  
  // Memoized campaign values
  const campaignStats = useMemo(() => {
    if (!campaign || !sovereignSeas) return null;
    
    const now = Math.floor(Date.now() / 1000);
    const isActive = sovereignSeas.isCampaignActive(campaign);
    const timeRemaining = sovereignSeas.getCampaignTimeRemaining(campaign);
    const hasStarted = now >= Number(campaign.startTime);
    const hasEnded = now >= Number(campaign.endTime);
    
    // Calculate stats
    const totalProjects = projects.length;
    const approvedProjects = projects.filter(p => p.approved).length;
    const totalVotes = formatValue(projects.reduce(
      (sum, project) => sum + Number(sovereignSeas.formatTokenAmount(project.voteCount)), 0
    ));
    const totalFunds = formatValue(sovereignSeas.formatTokenAmount(campaign.totalFunds));
    
    return {
      isActive,
      timeRemaining,
      hasStarted,
      hasEnded,
      now,
      totalProjects,
      approvedProjects,
      totalVotes,
      totalFunds
    };
  }, [campaign, sovereignSeas, projects, formatValue]);
  
  // Memoized distribution data
  const distributionData = useMemo(() => {
    if (!projects || !sovereignSeas || !campaignStats) return { sortedByFundsProjects: [], distributionSummary: [] };
    
    // Sort projects by fund received
    const sortedByFundsProjects = [...projects]
      .filter(p => Number(p.fundsReceived) > 0)
      .sort((a, b) => Number(b.fundsReceived) - Number(a.fundsReceived));
    
    // Create distribution summary
    const distributionSummary = [
      { name: "Distributed to Projects", amount: Number(campaignStats.totalFunds) },
    ];
    
    return { sortedByFundsProjects, distributionSummary };
  }, [projects, sovereignSeas, campaignStats]);
  
  // Flag for campaign media
  const hasCampaignMedia = useMemo(() => {
    return campaign && (
      (campaign.logo?.trim().length > 0) || 
      (campaign.demoVideo?.trim().length > 0)
    );
  }, [campaign]);

  // Loading state
  if (loading || !campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-lg text-blue-600">Loading campaign...</p>
        </div>
      </div>
    );
  }
  
  if (!campaignStats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-lg text-blue-600">Processing data...</p>
        </div>
      </div>
    );
  }
  
  const { 
    isActive, timeRemaining, hasStarted, hasEnded, now, 
    totalProjects, approvedProjects, totalVotes, totalFunds 
  } = campaignStats;
  
  const { sortedByFundsProjects, distributionSummary } = distributionData;
  
  // Helper function for token colors
  const getTokenColor = (index) => {
    const colors = ["blue", "indigo", "purple", "pink", "cyan"];
    return colors[index % colors.length];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50 text-gray-800">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Status Message */}
        {statusMessage.text && statusMessage.type && (
          <StatusMessage text={statusMessage.text} type={statusMessage.type} />
        )}
        
        {/* Campaign Header - Simplified */}
        <div className="mb-6 bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-5 shadow-lg border border-blue-100 hover:shadow-xl transition-all">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex-grow">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center">
                  <Hash className="h-6 w-6 text-blue-500 mr-2" />
                  {campaign.name}
                </h1>
                
                {/* Media indicators */}
                {hasCampaignMedia && (
                  <div className="flex items-center gap-1">
                    {campaign.logo && (
                      <span className="text-blue-600" title="Has Logo">
                        <ImageIcon className="h-4 w-4" />
                      </span>
                    )}
                    {campaign.demoVideo && (
                      <span className="text-red-600" title="Has Demo Video">
                        <Video className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              <p className="text-gray-600 text-sm mt-2 mb-3 max-w-3xl">{campaign.description}</p>
              
              <div className="flex flex-wrap gap-2">
                {/* Status badge */}
                <span className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center shadow-sm ${
                  isActive 
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                    : hasEnded 
                      ? 'bg-gray-100 text-gray-700 border border-gray-200'
                      : 'bg-amber-100 text-amber-700 border border-amber-200'
                }`}>
                  {isActive ? '🟢' : hasEnded ? '⚪' : '🟠'}
                  <span className="ml-1">
                    {hasEnded ? 'Ended' : hasStarted ? 'Active' : 'Upcoming'}
                  </span>
                </span>
                
                {/* Projects badge */}
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 inline-flex items-center shadow-sm">
                  <Users className="h-3.5 w-3.5 mr-1" />
                  {approvedProjects} Project{approvedProjects !== 1 ? 's' : ''}
                </span>
                
                {/* Funds badge */}
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 inline-flex items-center shadow-sm">
                <Coins className="h-3.5 w-3.5 mr-1" />
                  {totalFunds} CELO
                </span>
                
                {/* Distribution badge */}
                {fundsDistributed && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 inline-flex items-center shadow-sm">
                    <Award className="h-3.5 w-3.5 mr-1" />
                    Funds Distributed
                  </span>
                )}
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mt-1 md:mt-0">
              <button 
                onClick={shareCampaign}
                className="px-3 py-1.5 rounded-full bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors flex items-center text-xs shadow-sm"
              >
                <Share2 className="h-3.5 w-3.5 mr-1.5" />
                Share
              </button>
              
              {isAdmin && (
                <button 
                  onClick={() => router.push(`/campaign/${campaignId}/admin`)}
                  className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center text-xs shadow-sm"
                >
                  <Settings className="h-3.5 w-3.5 mr-1.5" />
                  Admin
                </button>
              )}
            
              <button 
                onClick={() => router.push(`/campaign/${campaignId}/submit`)}
                className="px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-md transition-all flex items-center text-xs shadow-sm"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Submit Project
              </button>
            </div>
          </div>
          
          {/* Timeline Bar - Simplified */}
          <div className="mt-4 bg-gray-50 rounded-xl p-3 border border-gray-200">
            <div className="flex items-center justify-between mb-2 text-xs text-gray-600">
              <div className="flex items-center">
                <span className="mr-1">🗓️</span>
                Start: {sovereignSeas.formatCampaignTime(campaign.startTime)}
              </div>
              <div className="flex items-center">
                <span className="mr-1">🏁</span>
                End: {sovereignSeas.formatCampaignTime(campaign.endTime)}
              </div>
            </div>
            
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              {hasEnded ? (
                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 w-full"></div>
              ) : hasStarted ? (
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600" 
                  style={{ 
                    width: `${Math.min(
                      100, 
                      ((now - Number(campaign.startTime)) / 
                      (Number(campaign.endTime) - Number(campaign.startTime))) * 100
                    )}%` 
                  }}
                ></div>
              ) : (
                <div className="h-full bg-gray-300 w-0"></div>
              )}
            </div>
            
            {/* Time remaining indicator */}
            {isActive ? (
              <div className="mt-2 text-center text-blue-600 font-medium text-sm">
                ⏳ Time remaining: {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m
              </div>
            ) : !hasStarted ? (
              <div className="mt-2 text-center text-blue-600 font-medium text-sm">
                🚀 Campaign launches in: {Math.floor((Number(campaign.startTime) - now) / 86400)}d {Math.floor(((Number(campaign.startTime) - now) % 86400) / 3600)}h
              </div>
            ) : null}
          </div>
        </div>
        
        {/* Main Content - Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column - Stats & Actions */}
          <div className="lg:w-1/3 space-y-6">
            {/* User Stats - Simplified */}
            {address && isConnected && (
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-5 border border-blue-100 shadow-lg">
                <h2 className="text-lg font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600 flex items-center">
                  <Wallet className="h-5 w-5 mr-2 text-indigo-600" />
                  Your Activity
                </h2>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Votes:</span>
                    <span className="font-semibold text-indigo-600">{userVoteStats.totalVotes}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Projects Voted:</span>
                    <span className="font-semibold text-indigo-600">{userVoteStats.projectCount}</span>
                  </div>
                  
                  {/* Token votes summary */}
                  {userVoteStats.tokenVotes?.length > 0 && (
                    <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100 mt-2">
                      <h3 className="text-sm font-medium text-indigo-700 mb-2 flex items-center">
                        <CreditCard className="h-4 w-4 mr-1.5" />
                        Token Votes
                      </h3>
                      
                      {userVoteStats.tokenVotes.map((tokenVote, i) => (
                        <div key={i} className="flex justify-between items-center text-sm mb-1 last:mb-0">
                          <span className="text-gray-600 flex items-center">
                            <div className={`w-3 h-3 rounded-full bg-${getTokenColor(i)}-400 mr-1.5`}></div>
                            {tokenVote.symbol || getTokenSymbol(tokenVote.tokenAddress)}:
                          </span>
                          <span className="font-medium text-indigo-600">
                            {formatValue(votingSystem.formatAmount(tokenVote.tokenAddress, BigInt(tokenVote.tokenAmount)))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* View history button */}
                  <button
                    onClick={() => setVoteHistoryVisible(!voteHistoryVisible)}
                    className="w-full py-2 rounded-full bg-indigo-100 text-indigo-700 font-medium hover:bg-indigo-200 transition-colors flex items-center justify-center mt-2 border border-indigo-200 shadow-sm"
                  >
                    <History className="h-4 w-4 mr-2" />
                    {voteHistoryVisible ? 'Hide History' : 'View History'}
                  </button>
                  
                  {/* Vote History */}
                  {voteHistoryVisible && (
                    <div className="mt-3 space-y-2">
                      <h3 className="text-sm font-medium text-indigo-700 mb-2">Vote History</h3>
                      
                      {userVoteHistory.length === 0 ? (
                        <p className="text-gray-500 text-sm">No votes yet</p>
                      ) : (
                        userVoteHistory.slice(0, 3).map((vote, index) => {
                          const project = projects.find(p => p.id.toString() === vote.projectId.toString());
                          return (
                            <div key={index} className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                              <div className="flex items-center mb-1">
                                <MousePointerClick className="h-3.5 w-3.5 text-indigo-500 mr-2" />
                                <span className="font-medium truncate">
                                  {project ? project.name : `Project #${vote.projectId}`}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Amount:</span>
                                <span className="text-blue-600 font-medium">{formatValue(sovereignSeas.formatTokenAmount(vote.amount))} CELO</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                      
                      {userVoteHistory.length > 3 && (
                        <button className="text-indigo-600 text-sm hover:underline w-full text-center">
                          View all {userVoteHistory.length} votes
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Campaign Stats - Simplified */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-5 border border-blue-100 shadow-lg">
              <h2 className="text-lg font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
                Campaign Stats
              </h2>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Projects:</span>
                  <span className="font-semibold text-gray-800">{totalProjects}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Approved Projects:</span>
                  <span className="font-semibold text-gray-800">{approvedProjects}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Votes:</span>
                  <span className="font-semibold text-gray-800">{totalVotes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Funds:</span>
                  <span className="font-semibold text-blue-600">{totalFunds} CELO</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Vote Multiplier:</span>
                  <span className="font-semibold text-gray-800">{campaign.voteMultiplier.toString()}x</span>
                </div>
                
                {/* Rankings button */}
                <button
                  onClick={() => setProjectRankingsVisible(!projectRankingsVisible)}
                  className="w-full py-2 rounded-full bg-blue-100 text-blue-700 font-medium hover:bg-blue-200 transition-colors flex items-center justify-center mt-3 border border-blue-200 shadow-sm"
                >
                  <LineChart className="h-4 w-4 mr-2" />
                  {projectRankingsVisible ? 'Hide Rankings' : 'View Rankings'}
                </button>
                
                {/* Top 5 projects */}
                {projectRankingsVisible && sortedProjects.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-blue-700 mb-2">Current Rankings</h3>
                    
                    <div className="space-y-2 mt-2">
                      {sortedProjects.slice(0, 5).map((project, index) => (
                        <div 
                          key={project.id.toString()} 
                          className="flex items-center justify-between bg-gray-50 rounded-lg p-2 border border-gray-100"
                        >
                          <div className="flex items-center">
                            <span className={`w-6 h-6 flex items-center justify-center rounded-full ${
                              index === 0 
                                ? 'bg-yellow-500 text-white' 
                                : index === 1 
                                  ? 'bg-gray-400 text-white' 
                                  : index === 2 
                                    ? 'bg-amber-700 text-white' 
                                    : 'bg-gray-200 text-gray-700'
                            } mr-2 font-bold text-xs`}>
                              {index + 1}
                            </span>
                            <span className="text-sm font-medium truncate max-w-[140px]">
                              {project.name}
                            </span>
                          </div>
                          <span className="text-xs text-blue-600 font-medium">
                            {formatValue(sovereignSeas.formatTokenAmount(project.voteCount))}
                          </span>
                        </div>
                      ))}
                      
                      {sortedProjects.length > 5 && (
                        <button
                          onClick={() => router.push(`/campaign/${campaignId}/leaderboard`)}
                          className="w-full text-center text-sm text-blue-600 hover:text-blue-700 pt-1"
                        >
                          View full leaderboard →
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Actions Panel - Simplified */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-5 border border-blue-100 shadow-lg">
              <h2 className="text-lg font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center">
                <Settings className="h-5 w-5 mr-2 text-blue-500" />
                Actions
              </h2>
              
              <div className="space-y-3">
                {isActive && (
                  <button
                    onClick={() => router.push(`/campaign/${campaignId}/submit`)}
                    className="w-full py-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-lg transition-all flex items-center justify-center shadow-sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Submit New Project
                  </button>
                )}
                
                {canDistributeFunds && (
                  <button
                    onClick={handleDistributeFunds}
                    disabled={sovereignSeas.isWritePending}
                    className="w-full py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:shadow-lg transition-all flex items-center justify-center shadow-sm disabled:bg-gray-300 disabled:text-gray-500"
                  >
                    {sovereignSeas.isWritePending ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      <>
                        <Award className="h-4 w-4 mr-2" />
                        Distribute Funds
                      </>
                    )}
                  </button>
                )}
                
                {fundsDistributed && !distributionTableVisible && (
                  <button
                    onClick={() => setDistributionTableVisible(true)}
                    className="w-full py-2.5 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium hover:shadow-lg transition-all flex items-center justify-center shadow-sm"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Fund Distribution
                  </button>
                )}
                
                <button
                  onClick={() => router.push(`/campaigns`)}
                  className="w-full py-2.5 rounded-full bg-white text-blue-600 font-medium border border-blue-200 hover:bg-blue-50 transition-all"
                >
                  View All Campaigns
                </button>
              </div>
            </div>
          </div>
          
          {/* Right Column - Projects & Distribution */}
          <div className="lg:w-2/3 space-y-6">
            {/* Fund Distribution - Simplified */}
            {distributionTableVisible && fundsDistributed && (
              <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100 overflow-hidden shadow-lg">
                <div className="p-5 pb-3 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center">
                    <Award className="h-5 w-5 mr-2 text-emerald-500" />
                    Fund Distribution
                  </h2>
                  <button
                    onClick={() => setDistributionTableVisible(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ChevronUp className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="p-5 bg-gray-50">
                  {/* Project distributions */}
                  <h3 className="text-base font-medium mb-3 text-emerald-700 flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Project Distributions
                  </h3>
                  
                  {sortedByFundsProjects.length > 0 ? (
                    <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="py-2 px-3 text-left text-gray-600 font-medium">Rank</th>
                            <th className="py-2 px-3 text-left text-gray-600 font-medium">Project</th>
                            <th className="py-2 px-3 text-right text-gray-600 font-medium">Votes</th>
                            <th className="py-2 px-3 text-right text-gray-600 font-medium">Funds</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedByFundsProjects.map((project, index) => (
                            <tr key={project.id.toString()} 
                              className={index !== sortedByFundsProjects.length - 1 ? "border-b border-gray-100" : ""}
                            >
                              <td className="py-2 px-3 text-center">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                                  index < 3 
                                    ? ['bg-yellow-500 text-white', 'bg-gray-400 text-white', 'bg-amber-700 text-white'][index]
                                    : 'bg-gray-200 text-gray-700'
                                } font-bold text-xs`}>
                                  {index + 1}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-left text-gray-800 truncate max-w-[150px]">
                                <a 
                                  className="hover:text-blue-600"
                                  href={`/campaign/${campaignId}/project/${project.id}`}
                                >
                                  {project.name}
                                </a>
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-gray-800">
                                {formatValue(sovereignSeas.formatTokenAmount(project.voteCount))}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-emerald-600">
                                {formatValue(sovereignSeas.formatTokenAmount(project.fundsReceived))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl p-4 flex items-start border border-gray-200 shadow-sm">
                      <Info className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                      <p className="text-gray-600">
                        No projects received funds yet.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Projects Section - Simplified */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100 overflow-hidden shadow-lg">
              <div className="p-5 pb-3 border-b border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <h2 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center">
                    <Globe className="h-5 w-5 mr-2 text-blue-500" />
                    Projects
                  </h2>
                  
                  {/* Controls */}
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={projectStatusFilter}
                      onChange={(e) => setProjectStatusFilter(e.target.value)}
                      className="bg-gray-50 border border-gray-200 text-gray-700 rounded-full px-3 py-1.5 text-sm appearance-none pr-8"
                    >
                      <option value="all">All</option>
                      <option value="approved">Approved</option>
                      <option value="pending">Pending</option>
                    </select>
                    
                    <select
                      value={projectSortMethod}
                      onChange={(e) => setProjectSortMethod(e.target.value)}
                      className="bg-gray-50 border border-gray-200 text-gray-700 rounded-full px-3 py-1.5 text-sm appearance-none pr-8"
                    >
                      <option value="votes">Most Votes</option>
                      <option value="newest">Newest</option>
                      <option value="alphabetical">A-Z</option>
                    </select>
                    
                    <button
                      onClick={() => {
                        loadCampaignData();
                        setStatusMessage({
                          text: 'Projects refreshed',
                          type: 'success'
                        });
                      }}
                      className="bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-full px-3 py-1.5 text-sm inline-flex items-center border border-gray-200"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      Refresh
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Project List - Simplified */}
              <div className="p-5 space-y-4">
                {sortedProjects.length > 0 ? (
                  sortedProjects.map((project) => (
                    <div
                      key={project.id.toString()}
                      className={`${
                        !project.approved 
                          ? "bg-red-50 border-red-100"
                          : "bg-white border-blue-100"
                      } rounded-xl border p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden`}
                    >
                      {/* Status indicator */}
                      <div className="absolute top-3 right-3">
                        {project.approved ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">
                            Approved
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200 shadow-sm">
                            Pending
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-3 pt-1">
                        {/* Project Image */}
                        <div className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          !project.approved 
                            ? "bg-gradient-to-br from-gray-50 to-red-50 border border-red-100"
                            : "bg-gradient-to-br from-gray-50 to-blue-50 border border-blue-100"
                        }`}>
                          {project.logo ? (
                            <img 
                              src={project.logo} 
                              alt={project.name} 
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Code className={`h-8 w-8 ${
                              !project.approved ? "text-red-300" : "text-blue-300"
                            }`} />
                          )}
                        </div>
                        
                        {/* Project Info */}
                        <div className="flex-grow pr-16">
                          <h3 className={`text-lg font-bold mb-1 text-${!project.approved ? 'red' : 'blue'}-700`}>
                            <a 
                              href={`/campaign/${campaignId}/project/${project.id}`}
                              className="hover:underline"
                            >
                              {project.name}
                            </a>
                          </h3>
                          
                          <p className="text-gray-600 text-sm mb-2 line-clamp-1">
                            {project.description}
                          </p>
                          
                          {/* Links - simplified */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {project.githubLink && (
                              <a 
                                href={project.githubLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                              >
                                <Github className="h-3 w-3 mr-1" />
                                GitHub
                              </a>
                            )}
                            
                            {project.demoVideo && (
                              <a 
                                href={project.demoVideo}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                              >
                                <Video className="h-3 w-3 mr-1" />
                                Demo
                              </a>
                            )}
                          </div>
                          
                          {/* Vote progress */}
                          <div>
                            <div className="flex justify-between items-center mb-1 text-xs text-gray-500">
                              <span>Votes</span>
                              <span className={`font-medium ${!project.approved ? "text-red-600" : "text-blue-600"}`}>
                                {formatValue(sovereignSeas.formatTokenAmount(project.voteCount))}
                              </span>
                            </div>
                            <div className="relative w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={!project.approved 
                                  ? "bg-red-500"
                                  : "bg-blue-500"
                                } 
                                style={{ 
                                  width: `${Math.min(100, Number(sovereignSeas.formatTokenAmount(project.voteCount)) / Number(totalVotes) * 100)}%`,
                                  height: '100%' 
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex flex-col gap-2 justify-center">
                          {isActive && project.approved && (
                            <button
                              onClick={() => {
                                setSelectedProject(project);
                                setVoteModalVisible(true);
                              }}
                              disabled={!isConnected}
                              className="px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-medium hover:shadow-md disabled:opacity-50"
                            >
                              <span className="flex items-center">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Vote
                              </span>
                            </button>
                          )}
                          
                          <button
                            onClick={() => {
                              setSelectedProject(project);
                              setTokenVoteDistributionVisible(true);
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                              !project.approved 
                                ? "bg-white text-red-600 border-red-200 hover:bg-red-50"
                                : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                            }`}
                          >
                            <span className="flex items-center">
                              <PieChart className="h-3 w-3 mr-1" />
                              Details
                            </span>
                          </button>
                        </div>
                      </div>
                      {/* End of project card */}
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-xl p-5 flex items-start border border-blue-100 shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mr-4 flex-shrink-0">
                      <AlertTriangle className="h-6 w-6 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">No projects found</h3>
                      <p className="text-gray-600 mb-4">
                        {projectStatusFilter === 'approved' 
                          ? 'No approved projects yet' 
                          : projectStatusFilter === 'pending'
                            ? 'No pending projects'
                            : 'No projects have been submitted yet'}
                      </p>
                      <button
                        onClick={() => router.push(`/campaign/${campaignId}/submit`)}
                        className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium hover:shadow-md inline-flex items-center"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Submit Project
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Multi-Token Vote Modal - Simplified */}
      {voteModalVisible && selectedProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl border border-blue-200 relative">
            <button 
              onClick={() => setVoteModalVisible(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
            
            {/* Header */}
            <div className="p-5 border-b border-gray-200">
              <div className="flex items-center mb-2">
                <Hash className="h-5 w-5 text-blue-500 mr-2" />
                <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  Vote for Project
                </h3>
              </div>
              
              <div className="flex items-center mt-3">
                {selectedProject.logo ? (
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-blue-100 mr-3 flex-shrink-0">
                    <img src={selectedProject.logo} alt={selectedProject.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <Code className="h-5 w-5 text-blue-400" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-800">{selectedProject.name}</p>
                  <p className="text-sm text-blue-600 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {formatValue(sovereignSeas.formatTokenAmount(selectedProject.voteCount))} votes
                  </p>
                </div>
              </div>
            </div>
            
            {/* Form */}
            <div className="p-5">
              {/* Token Selection */}
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2 flex items-center">
                  <CreditCard className="h-4 w-4 mr-2 text-blue-500" />
                  Select Token
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {supportedTokens.map((token) => (
                    <button
                      key={token.address}
                      onClick={() => setSelectedToken(token.address)}
                      className={`py-2 px-3 rounded-lg border flex items-center justify-center text-sm transition-all ${
                        selectedToken === token.address
                          ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {token.isNative ? (
                        <Coins className="h-3.5 w-3.5 mr-1 text-blue-500" />
                      ) : (
                        <CreditCard className="h-3.5 w-3.5 mr-1 text-indigo-500" />
                      )}
                      {token.symbol}
                    </button>
                  ))}
                </div>
                
                {/* Balance */}
                {selectedToken && (
                  <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                    <span className="text-xs text-gray-600">Balance:</span>
                    <span className="text-sm font-medium text-blue-700">
                      {address && selectedToken ? (
                        tokenBalances[selectedToken] !== undefined ? (
                          `${formatTokenBalance(selectedToken, tokenBalances[selectedToken])} ${getTokenSymbol(selectedToken)}`
                        ) : (
                          <span className="flex items-center">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500 mr-2"></div>
                            Loading...
                          </span>
                        )
                      ) : (
                        "Connect wallet to view"
                      )}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Amount Input */}
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2 flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 text-blue-500" />
                  Amount
                </label>
                <div className="relative">
                  <input 
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={voteAmount}
                    onChange={(e) => setVoteAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none text-gray-800"
                    placeholder="Enter amount"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    {getTokenSymbol(selectedToken)}
                  </div>
                </div>
              </div>
              
              {/* Exchange Rate */}
              {selectedToken && voteAmount && parseFloat(voteAmount) > 0 && selectedToken !== votingSystem?.CELO_ADDRESS && (
                <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                  <div className="flex items-center text-indigo-700 mb-2 font-medium">
                    <Repeat className="h-4 w-4 mr-2 text-indigo-500" />
                    <span>Exchange Rate</span>
                  </div>
                  
                  {loadingExchangeRates ? (
                    <div className="flex items-center justify-center py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                      <span className="text-sm text-gray-500">Calculating...</span>
                    </div>
                  ) : (
                    tokenExchangeRates[selectedToken] && (
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">CELO Value:</span>
                          <span className="text-blue-700 font-medium">{tokenExchangeRates[selectedToken].expectedCelo}</span>
                        </div>
                        <div className="flex justify-between border-t border-indigo-100 pt-1 mt-1">
                          <span className="text-gray-600">Voting power:</span>
                          <span className="text-indigo-700 font-medium">{tokenExchangeRates[selectedToken].voteAmount}</span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={handleVote}
                  disabled={votingSystem?.isLoading || !selectedToken || !voteAmount || parseFloat(voteAmount) <= 0}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-full hover:shadow-lg transition-all disabled:bg-gray-300 disabled:text-gray-500 disabled:hover:shadow-none"
                >
                  {votingSystem?.isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    <span className="flex items-center justify-center">
                      <MousePointerClick className="h-4 w-4 mr-2" />
                      Confirm Vote
                    </span>
                  )}
                </button>
                
                <button
                  onClick={() => setVoteModalVisible(false)}
                  className="py-2.5 px-4 bg-white text-blue-600 font-medium border border-blue-200 rounded-full hover:bg-blue-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Token Vote Distribution Modal - Simplified */}
      {tokenVoteDistributionVisible && selectedProject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl p-5 relative shadow-xl border border-blue-100">
            <button 
              onClick={() => setTokenVoteDistributionVisible(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
            
            <h3 className="text-lg font-bold mb-1 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Token Vote Distribution
            </h3>
            <p className="text-blue-600 font-medium mb-4">{selectedProject.name}</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Simplified vote data table */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <h4 className="font-medium text-gray-700 mb-3">Vote Breakdown</h4>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Token</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500">CELO Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* CELO Row */}
                    <tr className="border-b border-gray-100">
                      <td className="px-2 py-2">
                        <div className="flex items-center">
                          <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                            <Coins className="h-3 w-3 text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-800">CELO</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right text-sm text-gray-600">
                        {formatValue(sovereignSeas.formatTokenAmount(selectedProject.voteCount))}
                      </td>
                      <td className="px-2 py-2 text-right text-sm text-gray-600">
                        {formatValue(sovereignSeas.formatTokenAmount(selectedProject.voteCount))}
                      </td>
                    </tr>
                    
                    {/* Other tokens */}
                    {allProjectVotes?.tokenVotes?.map((tokenVote, index) => {
                      if (tokenVote.tokenAddress.toLowerCase() === votingSystem?.CELO_ADDRESS?.toLowerCase()) return null;
                      
                      // Get token info
                      const tokenSymbol = tokenVote.symbol || getTokenSymbol(tokenVote.tokenAddress);
                      const color = getTokenColor(index);
                      
                      return (
                        <tr key={tokenVote.tokenAddress} className="border-b border-gray-100 last:border-b-0">
                          <td className="px-2 py-2">
                            <div className="flex items-center">
                              <div className={`h-5 w-5 rounded-full bg-${color}-100 flex items-center justify-center mr-2`}>
                                <CreditCard className={`h-3 w-3 text-${color}-600`} />
                              </div>
                              <span className="font-medium text-gray-800">{tokenSymbol}</span>
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right text-sm text-gray-600">
                            {formatValue(votingSystem.formatAmount(tokenVote.tokenAddress, BigInt(tokenVote.tokenAmount)))}
                          </td>
                          <td className="px-2 py-2 text-right text-sm text-gray-600">
                            {formatValue(votingSystem.formatAmount(votingSystem.CELO_ADDRESS, BigInt(tokenVote.celoEquivalent)))}
                          </td>
                        </tr>
                      );
                    })}
                    
                    {/* Empty state */}
                    {(!allProjectVotes || !allProjectVotes.tokenVotes || allProjectVotes.tokenVotes.length === 0) && (
                      <tr>
                        <td colSpan={3} className="px-2 py-4 text-center text-sm text-gray-500">
                          No additional token votes recorded
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Simplified pie chart area */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-center">
                <div className="w-full max-w-xs">
                  {/* Simple pie chart visual */}
                  <div className="relative h-40 w-40 mx-auto">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      {/* This would be replaced with real pie chart segments */}
                      <circle cx="50" cy="50" r="40" fill="#3B82F6" />
                      <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="12">
                        CELO 100%
                      </text>
                    </svg>
                  </div>
                  
                  {/* Legend */}
                  <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1">
                    <div className="flex items-center text-xs">
                      <div className="w-3 h-3 rounded-full mr-1 bg-blue-500"></div>
                      <span>CELO: 100%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-5 flex justify-center">
              <button
                onClick={() => setTokenVoteDistributionVisible(false)}
                className="px-5 py-2 bg-white text-blue-600 font-medium border border-blue-200 rounded-full hover:bg-blue-50"
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