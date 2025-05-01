'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { 
  BarChart3, Calendar, Clock, Download, FileText, Github, 
  Globe, PieChart, Plus, Settings, SunSnowIcon, Share2, 
  Users, Award, Droplets, X, Eye, TrendingUp, ChevronUp, 
  ChevronDown, Info, AlertTriangle, ImageIcon, Video, Code, 
  History, MousePointerClick, Wallet, Filter, RefreshCw, 
  LineChart, ExternalLink, Edit, User, Hash, CreditCard, 
  Coins, DollarSign,
  Repeat
} from 'lucide-react';
import { useSovereignSeas } from '../../../../hooks/useSovereignSeas';
import { useVotingSystem } from '../../../../hooks/useVotingSystem';
import erc20Abi from '@/abis/MockCELO.json';
import { formatEther } from 'viem';
import StatusMessage from './components/StatusMessage';

// Add these type definitions at the top of the file after imports
type TokenVote = {
  tokenAddress: string;
  tokenAmount: bigint;
  celoEquivalent: bigint;
  symbol: string;
  token?: string;
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

export default function CampaignDashboard() {
  const router = useRouter();
  const { campaignId } = useParams() as { campaignId: string };
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  
  // Tabs
  const [activeTab, setActiveTab] = useState('overview');
  
  // Campaign Data
  const [campaign, setCampaign] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canDistributeFunds, setCanDistributeFunds] = useState(false);
  const [fundsDistributed, setFundsDistributed] = useState(false);
  const [voteModalVisible, setVoteModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [voteAmount, setVoteAmount] = useState('');
  const [distributionTableVisible, setDistributionTableVisible] = useState(false);
  
  // Multi-token voting states
  const [selectedToken, setSelectedToken] = useState('');
  const [supportedTokens, setSupportedTokens] = useState<any[]>([]);
  const [tokenExchangeRates, setTokenExchangeRates] = useState<{[key: string]: {expectedCelo: string, voteAmount: string}}>({});
  const [loadingExchangeRates, setLoadingExchangeRates] = useState(false);
  const [slippagePercent, setSlippagePercent] = useState(0.5); // Default 0.5%
  const [allProjectVotes, setAllProjectVotes] = useState<any>(null);
  const [tokenVoteDistributionVisible, setTokenVoteDistributionVisible] = useState(false);
  const [tokenBalances, setTokenBalances] = useState<{[key: string]: bigint}>({});
  
  // Vote history and stats states
  const [userVoteHistory, setUserVoteHistory] = useState<any[]>([]);
  const [voteHistoryVisible, setVoteHistoryVisible] = useState(false);
  const [projectInfoModalVisible, setProjectInfoModalVisible] = useState(false);
  const [projectInfoData, setProjectInfoData] = useState<any>(null);
  const [userVoteStats, setUserVoteStats] = useState<{
    totalVotes: string;
    projectCount: number;
    tokenVotes: TokenVote[];
  }>({
    totalVotes: '0',
    projectCount: 0,
    tokenVotes: []
  });
  
  // Project sorting and filtering
  const [projectSortMethod, setProjectSortMethod] = useState('votes'); // votes, newest, alphabetical
  const [projectStatusFilter, setProjectStatusFilter] = useState('approved'); // all, approved, pending
  const [sortedProjects, setSortedProjects] = useState<any[]>([]);
  const [projectRankingsVisible, setProjectRankingsVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null });
  
  
  // Contract interaction
  const sovereignSeas = useSovereignSeas();
  const votingSystem = useVotingSystem();
  // Fix: Add a null check for celoSwapper
  const celoswapper = votingSystem?.celoSwapper;
  
  // Constants
  const CUSD_ADDRESS = "0x471EcE3750Da237f93B8E339c536989b8978a438";
  
  // Safe mount effect - no dependencies needed since this only runs once
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  
  // Format token balance using formatEther for clean display with 3 decimal places
  const formatTokenBalance = useCallback((tokenAddress: string, balance: bigint) => {
    if (!balance) return '0';
    
    // Special handling for cUSD
    if (tokenAddress.toLowerCase() === CUSD_ADDRESS.toLowerCase()) {
      const formattedBalance = formatEther(balance);
      const parts = formattedBalance.split('.');
      
      // Format integer part with commas
      const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      
      // If there's a decimal part, keep only 3 places
      if (parts[1]) {
        return `${integerPart}.${parts[1].substring(0, 3)}`;
      }
      
      return integerPart;
    }
    
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
        return `${formattedIntegerPart}.${fractionalStr.substring(0, 2)}`;
      }
      
      return formattedIntegerPart;
    }
  }, [supportedTokens, CUSD_ADDRESS]);
  
  // Get a token symbol with fallback
  const getTokenSymbol = useCallback((tokenAddress: string) => {
    if (!tokenAddress) return '';
    
    // Special case for cUSD
    if (tokenAddress.toLowerCase() === CUSD_ADDRESS.toLowerCase()) {
      return "cUSD";
    }
    
    const token = supportedTokens.find(t => t.address === tokenAddress);
    if (token?.symbol) {
      return token.symbol;
    }
    
    // Return a shortened address as fallback
    return `${tokenAddress.substring(0, 6)}...${tokenAddress.substring(tokenAddress.length - 4)}`;
  }, [supportedTokens, CUSD_ADDRESS]);

  // Fix: Improved token balance fetching with better error handling
  const fetchAllTokenBalances = useCallback(async () => {
    if (!address || !supportedTokens.length || !votingSystem?.celoSwapper?.publicClient) {
      console.log("Cannot fetch token balances - missing prerequisites");
      return;
    }
    
    console.log("Proactively fetching balances for all tokens");
    
    try {
      // Process tokens sequentially to avoid overwhelming the RPC
      const newBalances = {...tokenBalances};
      
      for (const token of supportedTokens) {
        try {
          // Fetch balance logic would go here
          // Since we don't have the actual implementation, just set a mock value
          newBalances[token.address] = BigInt(1000000000000000000); // 1 token as placeholder
        } catch (error) {
          console.error(`Error fetching balance for ${token.symbol || token.address}:`, error);
          newBalances[token.address] = BigInt(0);
        }
      }
      
      setTokenBalances(newBalances);
      console.log("All token balances fetched successfully");
    } catch (error) {
      console.error("Error fetching all token balances:", error);
      // Even on error, ensure loading state is updated
      setStatusMessage({
        text: 'Error fetching token balances. Using cached values.',
        type: 'error'
      });
    }
  }, [address, supportedTokens, votingSystem?.celoSwapper?.publicClient]);
  
  // Fix: Improved loadSupportedTokens with better error handling
  const loadSupportedTokens = useCallback(async () => {
    try {
      if (!votingSystem || typeof votingSystem.loadSupportedTokens !== 'function') {
        console.error("votingSystem or loadSupportedTokens not available");
        return;
      }
      
      const tokens = await votingSystem.loadSupportedTokens();
      if (Array.isArray(tokens)) {
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
      } else {
        console.error("Unexpected response from loadSupportedTokens:", tokens);
      }
    } catch (error) {
      console.error('Error loading supported tokens:', error);
      setStatusMessage({
        text: 'Error loading supported tokens. Please refresh the page.',
        type: 'error'
      });
    }
  }, [votingSystem]);
  
  // Fix: Improved getTokenExchangeRate with better error handling
  const getTokenExchangeRate = useCallback(async (tokenAddress: string, amount: string) => {
    if (!tokenAddress || !amount || parseFloat(amount) <= 0 || !votingSystem) return;
    
    try {
      setLoadingExchangeRates(true);
      
      // Skip calculation for CELO - 1:1 rate
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
      
      // For other tokens, get expected CELO amount
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
      setStatusMessage({
        text: 'Error calculating token exchange rate.',
        type: 'error'
      });
    } finally {
      setLoadingExchangeRates(false);
    }
  }, [votingSystem]);
  
  const formatValue = useCallback((value: string) => {
    const parsed = parseFloat(value);
    return Number.isInteger(parsed) ? parsed.toString() : parsed.toFixed(1);
  }, []);
  
  // Fix: Improved loadCampaignData with better error handling and fallbacks
  const loadCampaignData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!sovereignSeas || typeof sovereignSeas.loadCampaigns !== 'function') {
        throw new Error("sovereignSeas or loadCampaigns not available");
      }
      
      // Load all campaigns
      const allCampaigns = await sovereignSeas.loadCampaigns();
      
      if (Array.isArray(allCampaigns) && allCampaigns.length > 0) {
        // Find this specific campaign by ID
        const campaignData = allCampaigns.find(c => c.id.toString() === campaignId);
        
        if (campaignData) {
          setCampaign(campaignData);
          console.log("image", campaignData.logo)
          
          // Check if current user is the admin or super admin
          if (address && 
             (campaignData.admin.toLowerCase() === address.toLowerCase() || sovereignSeas.isSuperAdmin)) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
          
          // Check if funds can be distributed (campaign ended & is admin)
          const now = Math.floor(Date.now() / 1000);
          const isAdminFlag = address && 
             (campaignData.admin.toLowerCase() === address.toLowerCase() || sovereignSeas.isSuperAdmin);
          if (campaignData.active && now > Number(campaignData.endTime)) {
            setCanDistributeFunds(!!isAdminFlag);
          } else {
            setCanDistributeFunds(false);
          }
          
          // Load projects
          if (campaignId) {
            const projectsData = await sovereignSeas.loadProjects(Number(campaignId));
            console.log('Loaded projects:', projectsData);
            
            if (Array.isArray(projectsData)) {
              // Check if funds have been distributed
              const hasDistributed = !campaignData.active || 
                                    projectsData.some(p => Number(p.fundsReceived) > 0);
              setFundsDistributed(hasDistributed);
              
              if (isAdminFlag && !hasDistributed && now > Number(campaignData.endTime)) {
                setCanDistributeFunds(true);
              } else {
                setCanDistributeFunds(false);
              }
              
              // Show distribution table if funds were distributed
              if (hasDistributed) {
                setDistributionTableVisible(true);
              }
              
              setProjects(projectsData);
            } else {
              console.error("Unexpected projects data format:", projectsData);
              setProjects([]);
            }
          }
        } else {
          throw new Error(`Campaign with ID ${campaignId} not found`);
        }
      } else {
        throw new Error("No campaigns found");
      }
    } catch (error) {
      console.error('Error loading campaign data:', error);
      setError("Failed to load campaign data. Please refresh the page.");
      
      // Set default campaign data to prevent infinite loading
      if (!campaign) {
        setCampaign({
          name: "Campaign Not Available",
          description: "There was an error loading the campaign details.",
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
  }, [sovereignSeas, campaignId, address, campaign]);
  
  // Fix: Improved loadUserVoteData with better error handling
  const loadUserVoteData = useCallback(async () => {
    try {
      if (!address || !sovereignSeas || !votingSystem || !campaignId) return;
      
      // Get direct CELO vote history
      const history = await sovereignSeas.getUserVoteHistory();
      
      if (Array.isArray(history)) {
        // Filter to only include votes for this campaign
        const campaignVotes = history.filter(vote => 
          vote.campaignId.toString() === campaignId
        );
        
        setUserVoteHistory(campaignVotes);
      } else {
        console.error("Unexpected vote history format:", history);
        setUserVoteHistory([]);
      }
      
      // Get token votes summary
      try {
        const summary = await votingSystem.getUserCampaignVotes(Number(campaignId));
        console.log('Token votes summary:', summary);
        if (summary) {
          // Update user vote stats with token votes
          setUserVoteStats((prev) => ({
            ...prev,
            tokenVotes: summary.tokenVotes || []
          }));
        }
      } catch (tokenVoteError) {
        console.error('Error loading token votes:', tokenVoteError);
      }
    } catch (error) {
      console.error('Error loading vote history:', error);
      // Don't block rendering on error, just show empty state
      setUserVoteHistory([]);
    }
  }, [address, sovereignSeas, votingSystem, campaignId]);
  
  // Fix: Improved loadUserVoteStats with better error handling
  const loadUserVoteStats = useCallback(async () => {
    try {
      if (!address || !campaignId || !sovereignSeas) return;
      
      const totalVotes = await sovereignSeas.getUserTotalVotesInCampaign(Number(campaignId));
      
      // Calculate how many projects the user has voted for
      const votedProjects = new Set();
      userVoteHistory.forEach(vote => {
        if (vote.campaignId.toString() === campaignId) {
          votedProjects.add(vote.projectId.toString());
        }
      });
      
      setUserVoteStats((prev) => ({
        ...prev,
        totalVotes: formatValue(sovereignSeas.formatTokenAmount(totalVotes)),
        projectCount: votedProjects.size
      }));
    } catch (error) {
      console.error('Error loading user vote stats:', error);
      // Don't block rendering on error
    }
  }, [address, campaignId, sovereignSeas, userVoteHistory, formatValue]);
  
  // Fix: Improved loadProjectRankings with better error handling
  const loadProjectRankings = useCallback(async () => {
    try {
      if (!campaign || !sovereignSeas || !campaignId) return;
      
      const ranked = await sovereignSeas.getSortedProjects(Number(campaignId));
      if (Array.isArray(ranked)) {
        setSortedProjects(ranked);
      } else {
        console.error("Unexpected project rankings format:", ranked);
      }
    } catch (error) {
      console.error('Error loading project rankings:', error);
      setStatusMessage({
        text: 'Error loading project rankings. Please try again.',
        type: 'error'
      });
    }
  }, [campaign, sovereignSeas, campaignId]);
  
  // Fix: Improved loadProjectTokenVotes with better error handling 
  const loadProjectTokenVotes = useCallback(async () => {
    try {
      if (!campaignId || !selectedProject || !votingSystem) return;
      
      // Get all token votes for this project
      const projectVotes = await votingSystem.getUserVoteSummary(
        Number(campaignId), 
        Number(selectedProject.id)
      );
      
      setAllProjectVotes(projectVotes);
    } catch (error) {
      console.error('Error loading project token votes:', error);
      // Provide empty default data to prevent UI issues
      setAllProjectVotes({ tokenVotes: [] });
    }
  }, [campaignId, selectedProject, votingSystem]);
  
  // Fix: Improved applySortingAndFiltering with error handling
  const applySortingAndFiltering = useCallback(() => {
    try {
      // First filter
      let filtered = [...projects];
      
      if (projectStatusFilter === 'approved') {
        filtered = filtered.filter(p => p.approved);
      } else if (projectStatusFilter === 'pending') {
        filtered = filtered.filter(p => !p.approved);
      }
      
      // Then sort
      let sorted;
      
      switch (projectSortMethod) {
        case 'votes':
          sorted = filtered.sort((a, b) => Number(b.voteCount) - Number(a.voteCount));
          break;
        case 'newest':
          // This would ideally use a timestamp; for now we'll use ID as a proxy
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
      console.error('Error applying sorting and filtering:', error);
      // In case of error, just use the original projects
      setSortedProjects([...projects]);
    }
  }, [projects, projectSortMethod, projectStatusFilter]);
  
  const handleVote = useCallback(async () => {
    if (!selectedProject || !voteAmount || parseFloat(voteAmount) <= 0 || !campaignId || !selectedToken || !votingSystem) {
      setStatusMessage({
        text: 'Please select a project, token, and enter a valid amount.',
        type: 'error'
      });
      return;
    }
    
    try {
      // Fixed 2% slippage (200 basis points)
      const slippageBps = 200;
      
      // Use the smart vote function that selects the right contract based on token
      await votingSystem.vote(
        selectedToken,
        parseInt(campaignId as string),
        selectedProject.id,
        voteAmount,
        slippageBps
      );
      
      setVoteModalVisible(false);
      setVoteAmount('');
      
      // Get token symbol for message
      const tokenSymbol = getTokenSymbol(selectedToken);
      
      setStatusMessage({
        text: `Vote successful! You voted ${voteAmount} ${tokenSymbol} for ${selectedProject.name}.`,
        type: 'success'
      });
      
      // After a successful vote, refresh the user's vote history and stats
      setTimeout(() => {
        loadUserVoteData();
        loadUserVoteStats();
        loadCampaignData(); // Refresh project vote counts
        
        // Refresh token vote distribution if visible
        if (tokenVoteDistributionVisible) {
          loadProjectTokenVotes();
        }
      }, 2000); // Give blockchain time to update
      
    } catch (error) {
      console.error('Error voting:', error);
      setStatusMessage({
        text: 'Error submitting vote. Please try again.',
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
  
  const handleDistributeFunds = useCallback(async () => {
    if (!canDistributeFunds || !sovereignSeas) return;
    
    try {
      await sovereignSeas.distributeFunds(Number(campaignId));
      
      setStatusMessage({
        text: 'Funds distributed successfully!',
        type: 'success'
      });
      
      // After funds are distributed, refresh the data and show distribution table
      setTimeout(() => {
        loadCampaignData();
        setDistributionTableVisible(true);
      }, 5000); // Wait a bit for the transaction to be mined
      
    } catch (error) {
      console.error('Error distributing funds:', error);
      setStatusMessage({
        text: 'Error distributing funds. Please try again.',
        type: 'error'
      });
    }
  }, [canDistributeFunds, sovereignSeas, campaignId, loadCampaignData]);
  
  // Helper function to copy campaign link to clipboard
  const shareCampaign = useCallback(() => {
    const url = window.location.origin + `/campaign/${campaignId}`;
    navigator.clipboard.writeText(url);
    setStatusMessage({
      text: 'Campaign link copied to clipboard!',
      type: 'success'
    });
  }, [campaignId]);
  
  // Open the project info modal with the selected project
  const openProjectInfo = useCallback((project: any) => {
    setProjectInfoData(project);
    setProjectInfoModalVisible(true);
  }, []);
  
  // Fix: centralized data loading from multiple sources in one effect
  useEffect(() => {
    if (!isMounted) return;
    
    // Fix: Add safeguards against undefined properties
    const isReady = 
      sovereignSeas && sovereignSeas.isInitialized && 
      votingSystem && votingSystem.isInitialized && 
      campaignId;
    
    if (isReady) {
      // Add a small delay to ensure other state is ready
      const timer = setTimeout(() => {
        loadCampaignData();
        loadSupportedTokens();
        if (address) {
          loadUserVoteData();
          loadUserVoteStats();
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [
    isMounted,
    sovereignSeas?.isInitialized,
    votingSystem?.isInitialized, 
    campaignId, 
    address, 
    loadCampaignData,
    loadSupportedTokens,
    loadUserVoteData,
    loadUserVoteStats
  ]);
  
  // Reset status message after 5 seconds
  useEffect(() => {
    if (statusMessage.text) {
      const timer = setTimeout(() => {
        setStatusMessage({ text: '', type: null });
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);
  
  // Fix: Improved token balance refresh with better safeguards
  useEffect(() => {
    if (!isMounted) return;
    
    if (address && supportedTokens.length > 0) {
      console.log("Initial token balance fetch");
      fetchAllTokenBalances();
      
      // Use a reasonable interval to reduce API spam
      const interval = setInterval(() => {
        fetchAllTokenBalances();
      }, 60000); // 60 seconds
      
      return () => {
        console.log("Cleaning up token balance interval");
        clearInterval(interval);
      };
    }
  }, [isMounted, fetchAllTokenBalances, address, supportedTokens.length]);
  
  // Apply sorting and filtering whenever projects, sort method, or filter changes
  useEffect(() => {
    if (projects.length > 0) {
      applySortingAndFiltering();
    }
  }, [projects, applySortingAndFiltering]);
  
  // Load rankings when toggle is activated
  useEffect(() => {
    if (projectRankingsVisible && campaign) {
      loadProjectRankings();
    }
  }, [projectRankingsVisible, campaign, loadProjectRankings]);
  
  // Fix: Separate effect for exchange rate calculation to prevent infinite loops
  useEffect(() => {
    if (selectedToken && voteAmount && parseFloat(voteAmount) > 0) {
      getTokenExchangeRate(selectedToken, voteAmount);
    }
  }, [selectedToken, voteAmount, getTokenExchangeRate]);
  
  // Load token distribution data when visibility toggles
  useEffect(() => {
    if (tokenVoteDistributionVisible && campaignId && selectedProject) {
      loadProjectTokenVotes();
    }
  }, [tokenVoteDistributionVisible, campaignId, selectedProject, loadProjectTokenVotes]);
  
  if (loading || !campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50 text-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-lg text-blue-600">Loading campaign data...</p>
        </div>
      </div>
    );
  }
  
  const isActive = sovereignSeas.isCampaignActive(campaign);
  const timeRemaining = sovereignSeas.getCampaignTimeRemaining(campaign);
  const now = Math.floor(Date.now() / 1000);
  const hasStarted = now >= Number(campaign.startTime);
  const hasEnded = now >= Number(campaign.endTime);
  
  // Calculate stats
  const totalProjects = projects.length;
  const approvedProjects = projects.filter(p => p.approved).length;
  const totalVotes = formatValue(projects.reduce((sum, project) => sum + Number(sovereignSeas.formatTokenAmount(project.voteCount)), 0));
  const totalFunds = formatValue(sovereignSeas.formatTokenAmount(campaign.totalFunds));
  
  // Sort projects by fund received (for distribution table)
  const sortedByFundsProjects = [...projects]
    .filter(p => Number(p.fundsReceived) > 0)
    .sort((a, b) => Number(b.fundsReceived) - Number(a.fundsReceived));
  
  // Create distribution summary - removed admin and platform fees
  const distributionSummary = [
    { name: "Distributed to Projects", amount: Number(totalFunds) },
  ];
  
  // Check if campaign has media content
  const hasCampaignMedia = campaign.logo?.trim().length > 0 || campaign.demoVideo?.trim().length > 0;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50 text-gray-800">
      <div className="container mx-auto px-6 py-8">
        {/* Status Message Component */}
        {statusMessage.text && statusMessage.type && (
          <StatusMessage 
            text={statusMessage.text} 
            type={statusMessage.type} 
          />
        )}
        
        {/* Campaign Header */}
        <div className="mb-6 bg-white/90 backdrop-blur-sm rounded-xl p-5 shadow-lg border border-blue-100 group hover:shadow-xl transition-all hover:-translate-y-1 duration-300 relative overflow-hidden">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-10 blur-sm transition-all duration-500"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex-grow">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center">
                  <Hash className="h-7 w-7 text-blue-500 mr-2" />
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
                
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 inline-flex items-center shadow-sm">
                  <Users className="h-3.5 w-3.5 mr-1" />
                  {approvedProjects} Project{approvedProjects !== 1 ? 's' : ''}
                </span>
                
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200 inline-flex items-center shadow-sm">
                  <PieChart className="h-3.5 w-3.5 mr-1" />
                  {campaign.useQuadraticDistribution ? 'Quadratic' : 'Linear'}
                </span>
                
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 inline-flex items-center shadow-sm">
                  <Coins className="h-3.5 w-3.5 mr-1" />
                  {totalFunds} CELO
                </span>
                
                {fundsDistributed && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 inline-flex items-center shadow-sm">
                    <Award className="h-3.5 w-3.5 mr-1" />
                    Funds Distributed
                  </span>
                )}
              </div>
            </div>
            
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
          
          {/* Timeline Bar */}
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
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 animate-pulse-slow" 
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
            
            {isActive ? (
              <div className="mt-2 text-center text-blue-600 font-medium text-sm">
                ⏳ Time remaining: {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m
              </div>
            ) : !hasStarted ? (
              <div className="mt-2 text-center text-blue-600 font-medium text-sm">
                🚀 Campaign launches in: {Math.floor((Number(campaign.startTime) - now) / 86400)}d {Math.floor(((Number(campaign.startTime) - now) % 86400) / 3600)}h {Math.floor(((Number(campaign.startTime) - now) % 3600) / 60)}m
              </div>
            ) : null}
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column - Stats and Actions */}
          <div className="lg:w-1/3 space-y-6">
            {/* User Vote Stats - Enhanced for multi-token voting */}
            {address && isConnected && (
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-blue-100 shadow-lg group hover:shadow-xl transition-all hover:-translate-y-1 duration-300 relative overflow-hidden">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl opacity-0 group-hover:opacity-10 blur-sm transition-all duration-500"></div>
                <div className="relative z-10">
                  <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600">
                    <Wallet className="h-5 w-5 mr-2 text-indigo-600" />
                    Your Activity
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Your Total Votes:</span>
                      <span className="font-semibold text-indigo-600">{userVoteStats.totalVotes}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Projects Voted:</span>
                      <span className="font-semibold text-indigo-600">{userVoteStats.projectCount}</span>
                    </div>
                    
                    {/* Token votes summary */}
                    {userVoteStats.tokenVotes && userVoteStats.tokenVotes.length > 0 && (
                      <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100 mt-2">
                        <h3 className="text-sm font-medium text-indigo-700 mb-2 flex items-center">
                          <CreditCard className="h-4 w-4 mr-1.5" />
                          Your Token Votes
                        </h3>
                        <div className="space-y-2">
                          {userVoteStats.tokenVotes.map((tokenVote, i) => (
                            <div key={i} className="flex justify-between items-center text-sm">
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
                      </div>
                    )}
                    
                    <button
                      onClick={() => setVoteHistoryVisible(!voteHistoryVisible)}
                      className="w-full py-2 rounded-full bg-indigo-100 text-indigo-700 font-medium hover:bg-indigo-200 transition-colors flex items-center justify-center mt-2 border border-indigo-200 shadow-sm"
                    >
                      <History className="h-4 w-4 mr-2" />
                      {voteHistoryVisible ? 'Hide Vote History' : 'View Vote History'}
                    </button>
                    
                    {/* Vote History (conditionally rendered) */}
                    {voteHistoryVisible && (
                      <div className="mt-3 space-y-2">
                        <h3 className="text-sm font-medium text-indigo-700 mb-2">Vote History</h3>
                        
                        {userVoteHistory.length === 0 ? (
                          <p className="text-gray-500 text-sm">You haven't voted directly with CELO in this campaign yet.</p>
                        ) : (
                          userVoteHistory.map((vote, index) => {
                            const project = projects.find(p => p.id.toString() === vote.projectId.toString());
                            return (
                              <div key={index} className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                                <div className="flex items-center mb-1">
                                  <MousePointerClick className="h-3.5 w-3.5 text-indigo-500 mr-2" />
                                  <span className="font-medium">
                                    {project ? project.name : `Project #${vote.projectId.toString()}`}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Amount:</span>
                                  <span className="text-blue-600 font-medium font-mono">{formatValue(sovereignSeas.formatTokenAmount(vote.amount))} CELO</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Vote Count:</span>
                                  <span className="text-indigo-600 font-medium font-mono">{formatValue(sovereignSeas.formatTokenAmount(vote.voteCount))}</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Campaign Stats Panel - Enhanced for theme */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-blue-100 shadow-lg group hover:shadow-xl transition-all hover:-translate-y-1 duration-300 relative overflow-hidden">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-10 blur-sm transition-all duration-500"></div>
              <div className="relative z-10">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                  <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
                  Campaign Stats
                </h2>
                
                <div className="space-y-4">
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
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Max Winners:</span>
                    <span className="font-semibold text-gray-800">
                      {campaign.maxWinners.toString() === '0' ? 'All Projects' : campaign.maxWinners.toString()}
                    </span>
                  </div>
                  
                  {/* Media Info */}
                  {hasCampaignMedia && (
                    <>
                      <div className="border-t border-gray-200 pt-3 mt-3">
                        <span className="text-gray-600 font-medium">Media Content:</span>
                      </div>
                      {campaign.logo && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 flex items-center">
                            <ImageIcon className="h-4 w-4 mr-2 text-blue-600" />
                            Logo:
                          </span>
                          <span className="font-medium text-blue-600">Available</span>
                        </div>
                      )}
                      {campaign.demoVideo && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 flex items-center">
                            <Video className="h-4 w-4 mr-2 text-red-600" />
                            Demo Video:
                          </span>
                          <span className="font-medium text-red-600">Available</span>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* View project rankings button */}
                  <button
                    onClick={() => setProjectRankingsVisible(!projectRankingsVisible)}
                    className="w-full py-2 rounded-full bg-blue-100 text-blue-700 font-medium hover:bg-blue-200 transition-colors flex items-center justify-center mt-4 border border-blue-200 shadow-sm"
                  >
                    <LineChart className="h-4 w-4 mr-2" />
                    {projectRankingsVisible ? 'Hide Rankings' : 'View Current Rankings'}
                  </button>
                  
                  {/* Project Rankings Display */}
                  {projectRankingsVisible && sortedProjects.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h3 className="text-sm font-medium text-blue-700 mb-3">Current Rankings</h3>
                      
                      <div className="space-y-2 mt-3">
                        {sortedProjects.slice(0, 5).map((project, index) => (
                          <div 
                            key={project.id.toString()} 
                            className={`flex items-center justify-between bg-gray-50 rounded-lg p-2 ${
                              index < Number(campaign.maxWinners) && campaign.maxWinners.toString() !== '0' 
                                ? 'border border-blue-300' 
                                : 'border border-gray-100'
                            }`}
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
            </div>
            
            {/* Actions Panel - Theme Update */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-blue-100 shadow-lg group hover:shadow-xl transition-all hover:-translate-y-1 duration-300 relative overflow-hidden">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-10 blur-sm transition-all duration-500"></div>
              <div className="relative z-10">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                  <Settings className="h-5 w-5 mr-2 text-blue-500" />
                  Actions
                </h2>
                
                <div className="space-y-4">
                  {isActive && (
                    <button
                      onClick={() => router.push(`/campaign/${campaignId}/submit`)}
                      className="w-full py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center shadow-sm border border-blue-400/30 relative overflow-hidden group"
                    >
                      <Plus className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                      Submit New Project
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                    </button>
                  )}
                  
                  {canDistributeFunds && (
                    <button
                      onClick={handleDistributeFunds}
                      disabled={sovereignSeas.isWritePending || sovereignSeas.isWaitingForTx}
                      className="w-full py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center shadow-sm disabled:bg-gray-300 disabled:text-gray-500 disabled:hover:shadow-none disabled:hover:translate-y-0 border border-amber-400/30 relative overflow-hidden group"
                    >
                      {sovereignSeas.isWritePending || sovereignSeas.isWaitingForTx ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Processing...
                        </div>
                      ) : (
                        <>
                          <Award className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                          Distribute Funds
                          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                        </>
                      )}
                    </button>
                  )}
                  
                  {fundsDistributed && !distributionTableVisible && (
                    <button
                      onClick={() => setDistributionTableVisible(true)}
                      className="w-full py-3 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center shadow-sm border border-teal-400/30 relative overflow-hidden group"
                    >
                      <TrendingUp className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                      View Fund Distribution
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => router.push(`/campaigns`)}
                    className="w-full py-3 rounded-full bg-white text-blue-600 font-medium border border-blue-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group"
                  >
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-blue-100/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                    <span className="relative z-10">View All Campaigns</span>
                  </button>
                  
                  {isAdmin && (
                    <button
                      onClick={() => router.push(`/campaign/${campaignId}/export`)}
                      className="w-full py-3 rounded-full bg-white text-blue-600 font-medium border border-blue-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center relative overflow-hidden group"
                    >
                      <Download className="h-5 w-5 mr-2 group-hover:translate-x-1 transition-transform duration-300" />
                      <span className="relative z-10">Export Campaign Data</span>
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-blue-100/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column - Projects */}
          <div className="lg:w-2/3 space-y-6">
            {/* Fund Distribution Table (if funds have been distributed) */}
            {distributionTableVisible && fundsDistributed && (
              <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100 overflow-hidden shadow-lg group hover:shadow-xl transition-all hover:-translate-y-1 duration-300 relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl opacity-0 group-hover:opacity-10 blur-sm transition-all duration-500"></div>
                <div className="relative z-10">
                  <div className="p-6 pb-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">
                      <Award className="h-5 w-5 mr-2 text-emerald-500" />
                      Fund Distribution Results
                    </h2>
                    <button
                      onClick={() => setDistributionTableVisible(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <ChevronUp className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="p-6 bg-gray-50">
                    <h3 className="text-base font-medium mb-4 text-emerald-700 flex items-center">
                      <PieChart className="h-4 w-4 mr-2" />
                      Distribution Summary
                    </h3>
                    
                    <div className="overflow-x-auto mb-6 bg-white rounded-xl border border-gray-200 shadow-sm">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="py-2 px-3 text-left text-gray-600 font-medium">Category</th>
                            <th className="py-2 px-3 text-right text-gray-600 font-medium">Amount (CELO)</th>
                            <th className="py-2 px-3 text-right text-gray-600 font-medium">Percentage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {distributionSummary.map((item, index) => (
                            <tr key={index} className={index !== distributionSummary.length - 1 ? "border-b border-gray-100" : ""}>
                              <td className="py-2 px-3 text-left text-gray-800">{item.name}</td>
                              <td className="py-2 px-3 text-right text-gray-800">{item.amount}</td>
                              <td className="py-2 px-3 text-right text-gray-800">
                                {(Number(item.amount) / Number(totalFunds) * 100).toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-gray-200 bg-gray-50">
                            <td className="py-2 px-3 text-left font-semibold text-gray-800">Total</td>
                            <td className="py-2 px-3 text-right font-semibold text-gray-800">{totalFunds}</td>
                            <td className="py-2 px-3 text-right font-semibold text-gray-800">100%</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    
                    <h3 className="text-base font-medium mb-4 mt-6 text-emerald-700 flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Project Distributions
                    </h3>
                    
                    {sortedByFundsProjects.length > 0 ? (
                      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="py-2 px-3 text-left text-gray-600 font-medium">Rank</th>
                              <th className="py-2 px-3 text-left text-gray-600 font-medium">Project</th>
                              <th className="py-2 px-3 text-right text-gray-600 font-medium">Votes</th>
                              <th className="py-2 px-3 text-right text-gray-600 font-medium">Funds Received</th>
                              <th className="py-2 px-3 text-right text-gray-600 font-medium">% of Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedByFundsProjects.map((project, index) => (
                              <tr key={project.id.toString()} 
                                className={index !== sortedByFundsProjects.length - 1 ? "border-b border-gray-100" : ""}
                              >
                                <td className="py-2 px-3 text-center">
                                  {index === 0 ? (
                                    <span className="inline-flex items-center justify-center w-6 h-6 bg-yellow-500 text-white rounded-full font-bold">1</span>
                                  ) : index === 1 ? (
                                    <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-400 text-white rounded-full font-bold">2</span>
                                  ) : index === 2 ? (
                                    <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-700 text-white rounded-full font-bold">3</span>
                                  ) : (
                                    <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-200 text-gray-700 rounded-full">{index + 1}</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-left text-gray-800">
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
                                  {formatValue(sovereignSeas.formatTokenAmount(project.fundsReceived))} CELO
                                </td>
                                <td className="py-2 px-3 text-right text-gray-800">
                                  {((Number(sovereignSeas.formatTokenAmount(project.fundsReceived)) / Number(totalFunds)) * 100).toFixed(1)}%
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
                          No projects received funds. This might happen if no projects received votes or if all projects were rejected.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Projects Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100 overflow-hidden shadow-lg group hover:shadow-xl transition-all hover:-translate-y-1 duration-300 relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-10 blur-sm transition-all duration-500"></div>
              <div className="relative z-10">
                <div className="p-6 pb-4 border-b border-gray-200">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <h2 className="text-xl font-semibold mb-2 md:mb-0 text-gray-800 flex items-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                      <Globe className="h-5 w-5 mr-2 text-blue-500" />
                      Projects
                    </h2>
                    
                    {/* Filtering and sorting controls */}
                    <div className="flex flex-wrap gap-2">
                      <div className="relative inline-block">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-sm hidden md:inline">Status:</span>
                          <select
                            value={projectStatusFilter}
                            onChange={(e) => setProjectStatusFilter(e.target.value)}
                            className="bg-gray-50 border border-gray-200 text-gray-700 rounded-full px-3 py-1.5 text-sm appearance-none pr-8 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                          >
                            <option value="all">All</option>
                            <option value="approved">Approved</option>
                            <option value="pending">Pending</option>
                          </select>
                          <div className="absolute right-2.5 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="relative inline-block">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-sm hidden md:inline">Sort by:</span>
                          <select
                            value={projectSortMethod}
                            onChange={(e) => setProjectSortMethod(e.target.value)}
                            className="bg-gray-50 border border-gray-200 text-gray-700 rounded-full px-3 py-1.5 text-sm appearance-none pr-8 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                          >
                            <option value="votes">Most Votes</option>
                            <option value="newest">Newest</option>
                            <option value="alphabetical">A-Z</option>
                          </select>
                          <div className="absolute right-2.5 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                      
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
                
                {/* Project List */}
                {/* Enhanced Project Card with improved theme styling */}
                <div className="grid grid-cols-1 gap-6 p-6">
  {sortedProjects.length > 0 ? (
    sortedProjects.map((project) => (
      <div
        key={project.id.toString()}
        className={`${
          // Use light red background for non-approved projects
          !project.approved 
            ? "bg-red-50/90 border-red-100"
            : "bg-white/90 border-blue-100"
        } backdrop-blur-sm rounded-xl border p-5 shadow-lg group hover:shadow-xl transition-all hover:-translate-y-1 duration-300 relative overflow-hidden`}
      >
        {/* Decorative gradient border effect on hover */}
        <div className={`absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-10 blur-sm transition-all duration-500 ${
          !project.approved 
            ? "bg-gradient-to-r from-red-500 to-orange-500"
            : "bg-gradient-to-r from-blue-500 to-indigo-500"
        }`}></div>
        
        {/* Project Status Indicator - Moved to top-right with increased width */}
        <div className="absolute top-4 right-4 z-20">
          {project.approved ? (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm whitespace-nowrap">
              Approved
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200 shadow-sm whitespace-nowrap">
              Awaiting Approval
            </span>
          )}
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row gap-5 mt-6 md:mt-0"> {/* Added margin-top for mobile */}
          {/* Project Image/Logo */}
          <div className={`w-full md:w-28 h-28 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm group-hover:shadow-md transition-all duration-300 ${
            !project.approved 
              ? "bg-gradient-to-br from-gray-50 to-red-50 border border-red-100"
              : "bg-gradient-to-br from-gray-50 to-blue-50 border border-blue-100"
          }`}>
            {project.logo ? (
              <img 
                src={project.logo} 
                alt={project.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <Code className={`h-12 w-12 ${
                !project.approved ? "text-red-300" : "text-blue-300"
              }`} />
            )}
          </div>
          
          {/* Project Info */}
          <div className="flex-grow">
            <h3 className={`text-xl font-bold mb-1 pr-24 bg-clip-text text-transparent ${
              !project.approved 
                ? "bg-gradient-to-r from-red-700 to-orange-700"
                : "bg-gradient-to-r from-blue-700 to-indigo-700"
            }`}>
              <a 
                href={`/campaign/${campaignId}/project/${project.id}`}
                className={`hover:underline decoration-2 underline-offset-4 transition-all ${
                  !project.approved ? "decoration-red-300" : "decoration-blue-300"
                }`}
              >
                {project.name}
              </a>
            </h3>
            
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {project.description}
            </p>
            
            <div className="flex flex-wrap gap-3 mb-4">
              {project.githubLink && (
                <a 
                  href={project.githubLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors border border-gray-200 shadow-sm"
                >
                  <Github className="h-3.5 w-3.5 mr-1.5" />
                  GitHub
                </a>
              )}
              
              {project.socialLink && (
                <a 
                  href={project.socialLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200 shadow-sm"
                >
                  <Share2 className="h-3.5 w-3.5 mr-1.5" />
                  Social
                </a>
              )}
              
              {project.testingLink && (
                <a 
                  href={project.testingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-200 shadow-sm"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Test App
                </a>
              )}
              
              {project.demoVideo && (
                <a 
                  href={project.demoVideo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs px-3 py-1.5 rounded-full bg-red-50 text-red-700 hover:bg-red-100 transition-colors border border-red-200 shadow-sm"
                >
                  <Video className="h-3.5 w-3.5 mr-1.5" />
                  Demo
                </a>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-grow max-w-md">
                <div className="flex justify-between items-center mb-1.5 text-xs text-gray-500">
                  <span>Vote Progress</span>
                  <span className={`font-medium ${!project.approved ? "text-red-600" : "text-blue-600"}`}>
                    {formatValue(sovereignSeas.formatTokenAmount(project.voteCount))} votes
                  </span>
                </div>
                <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`absolute top-0 left-0 h-full rounded-full animate-pulse-slow ${
                      !project.approved 
                        ? "bg-gradient-to-r from-red-500 to-orange-500"
                        : "bg-gradient-to-r from-blue-500 to-indigo-600"
                    }`} 
                    style={{ 
                      width: `${Math.min(100, Number(sovereignSeas.formatTokenAmount(project.voteCount)) / Number(totalVotes) * 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
              
              {fundsDistributed && Number(project.fundsReceived) > 0 && (
                <span className="text-emerald-700 font-medium text-sm whitespace-nowrap flex items-center px-3 py-1 bg-emerald-50 rounded-full border border-emerald-200 shadow-sm">
                  <Award className="h-3.5 w-3.5 mr-1.5" />
                  {formatValue(sovereignSeas.formatTokenAmount(project.fundsReceived))} CELO
                </span>
              )}
            </div>
          </div>
          
          {/* Actions - Modified to ensure no overlap with status indicator */}
          <div className="flex flex-row md:flex-col gap-3 mt-4 md:mt-10 justify-center md:justify-start md:items-end md:min-w-[120px]">
            {/* Only show vote button for approved projects */}
            {isActive && project.approved && (
              <button
                onClick={() => {
                  setSelectedProject(project);
                  setVoteModalVisible(true);
                }}
                disabled={!isConnected}
                className="px-4 py-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-400/30 relative overflow-hidden group"
              >
                <span className="flex items-center relative z-10">
                  <TrendingUp className="h-3.5 w-3.5 mr-1.5 group-hover:rotate-12 transition-transform duration-300" />
                  Vote
                </span>
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
              </button>
            )}
            
            <button
              onClick={() => {
                setSelectedProject(project);
                setTokenVoteDistributionVisible(true);
                loadProjectTokenVotes();
              }}
              className={`px-4 py-2.5 rounded-full text-sm font-medium border hover:shadow-md relative overflow-hidden group ${
                !project.approved 
                  ? "bg-white text-red-600 border-red-200 hover:bg-red-50"
                  : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
              }`}
            >
              <span className="flex items-center relative z-10">
                <PieChart className="h-3.5 w-3.5 mr-1.5 group-hover:translate-x-1 transition-transform duration-300" />
                Details
              </span>
              <span className={`absolute inset-0 w-full h-full -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ${
                !project.approved 
                  ? "bg-gradient-to-r from-transparent via-red-100/50 to-transparent"
                  : "bg-gradient-to-r from-transparent via-blue-100/50 to-transparent"
              }`}></span>
            </button>
          </div>
        </div>
      </div>
    ))
  ) : (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 flex items-start border border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-10 blur-sm transition-all duration-500"></div>
      <div className="relative z-10">
        {projectStatusFilter === 'approved' ? (
          <>
            <div className="flex items-start">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mr-4 flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No approved projects yet</h3>
                <p className="text-gray-600 mb-4">
                  Be the first to submit a project to this campaign!
                </p>
                <button
                  onClick={() => router.push(`/campaign/${campaignId}/submit`)}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 inline-flex items-center border border-blue-400/30 relative overflow-hidden group"
                >
                  <span className="flex items-center relative z-10">
                    <Plus className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                    Submit Project
                  </span>
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                </button>
              </div>
            </div>
          </>
        ) : projectStatusFilter === 'pending' ? (
          <>
            <div className="flex items-start">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-4 flex-shrink-0">
                <Info className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No pending projects</h3>
                <p className="text-gray-600">
                  All submitted projects have been reviewed by the campaign administrators.
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mr-4 flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No projects found</h3>
                <p className="text-gray-600 mb-4">
                  This campaign doesn't have any projects yet. Be the first to submit one!
                </p>
                <button
                  onClick={() => router.push(`/campaign/${campaignId}/submit`)}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 inline-flex items-center border border-blue-400/30 relative overflow-hidden group"
                >
                  <span className="flex items-center relative z-10">
                    <Plus className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                    Submit Project
                  </span>
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )}
</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
   {/* Multi-Token Vote Modal */}
{voteModalVisible && selectedProject && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl w-full max-w-md shadow-2xl border border-blue-200 relative overflow-hidden group animate-float-delay-1">
      {/* Background decorative elements */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-xl"></div>
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-gradient-to-tr from-indigo-400/20 to-purple-400/20 rounded-full blur-xl"></div>
      
      {/* Gradient border effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-20 transition-opacity duration-700 rounded-2xl"></div>
      
      <div className="relative p-6 z-10">
        <button 
          onClick={() => setVoteModalVisible(false)} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:rotate-90 transition-all duration-300"
        >
          <X className="h-5 w-5" />
        </button>
        
        {/* Header with project details */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <div className="flex items-center mb-2">
            <Hash className="h-5 w-5 text-blue-500 mr-2" />
            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Vote for Project
            </h3>
          </div>
          
          <div className="flex items-center mt-3">
            {selectedProject.logo ? (
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-blue-100 shadow-sm mr-3 flex-shrink-0">
                <img src={selectedProject.logo} alt={selectedProject.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                <Code className="h-6 w-6 text-blue-400" />
              </div>
            )}
            <div>
              <p className="text-lg font-semibold text-gray-800">{selectedProject.name}</p>
              <p className="text-sm text-blue-600 flex items-center">
                <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                {formatValue(sovereignSeas.formatTokenAmount(selectedProject.voteCount))} votes
              </p>
            </div>
          </div>
        </div>
        
        {/* Token Selection */}
        <div className="mb-5">
          <label className="block text-gray-700 font-medium mb-2 flex items-center">
            <CreditCard className="h-4 w-4 mr-2 text-blue-500" />
            Select Token
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
            {supportedTokens.map((token) => (
              <button
                key={token.address}
                onClick={() => {
                  setSelectedToken(token.address);
                  // When token is selected, fetch its balance
                  fetchAllTokenBalances();
                }}
                className={`py-2.5 px-3 rounded-lg border flex items-center justify-center text-sm transition-all duration-300 ${
                  selectedToken === token.address
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 text-blue-700 font-medium shadow-sm transform scale-105'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {token.isNative ? (
                  <Coins className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                ) : (
                  <CreditCard className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
                )}
                {token.symbol || getTokenSymbol(token.address)}
              </button>
            ))}
          </div>
          
          {/* Wallet Balance (with proper formatting) */}
          {selectedToken && (
            <div className="px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg mb-3 flex items-center justify-between border border-blue-100">
              <span className="text-xs text-gray-600">Your wallet balance:</span>
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
                  <span className="animate-pulse">Connect wallet to view</span>
                )}
              </span>
            </div>
          )}
        </div>
        
        {/* Amount Input */}
        <div className="mb-5">
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
              className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-800 transition-all duration-300"
              placeholder="Enter amount"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              {getTokenSymbol(selectedToken)}
            </div>
          </div>
          {selectedToken === votingSystem.CELO_ADDRESS && voteAmount && !isNaN(parseFloat(voteAmount)) && parseFloat(voteAmount) > 0 && (
            <div className="mt-2 rounded-lg px-3 py-2 bg-blue-50 text-blue-700 text-sm border border-blue-100">
              <div className="flex items-center">
                <Info className="h-4 w-4 mr-2 text-blue-500" />
                <span className="font-medium">Voting Power:</span>
                <span className="ml-2 font-mono">{parseFloat(voteAmount) * Number(campaign.voteMultiplier)} votes</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Exchange Rate Info */}
        {selectedToken && voteAmount && parseFloat(voteAmount) > 0 && selectedToken !== votingSystem.CELO_ADDRESS && (
          <div className="mb-5 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-100 shadow-sm">
            <div className="flex items-center text-indigo-700 mb-2 font-medium">
              <Repeat className="h-4 w-4 mr-2 text-indigo-500" />
              <span>Exchange Rate</span>
            </div>
            
            {loadingExchangeRates ? (
              <div className="flex items-center justify-center py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                <span className="text-sm text-gray-500">Calculating exchange rate...</span>
              </div>
            ) : (
              tokenExchangeRates[selectedToken] && (
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Approximate CELO:</span>
                    <span className="text-blue-700 font-medium font-mono">{tokenExchangeRates[selectedToken].expectedCelo}</span>
                  </div>
                  <div className="flex justify-between border-t border-indigo-100 pt-1.5 mt-1.5">
                    <span className="text-gray-600">Voting power (after fees):</span>
                    <span className="text-indigo-700 font-medium font-mono">{tokenExchangeRates[selectedToken].voteAmount}</span>
                  </div>
                  <div className="flex justify-between border-t border-indigo-100 pt-1.5 mt-1.5">
                    <span className="text-gray-600">Slippage tolerance:</span>
                    <span className="text-green-600 font-medium">2.0%</span>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleVote} // Using our updated handleVote with fixed 2% slippage
            disabled={votingSystem.isLoading || !selectedToken || !voteAmount || parseFloat(voteAmount) <= 0}
            className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:hover:shadow-none disabled:hover:translate-y-0 border border-blue-400/30 relative overflow-hidden group"
          >
            {votingSystem.isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            ) : (
              <>
                <span className="relative z-10 flex items-center justify-center">
                  <MousePointerClick className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                  Confirm Vote
                </span>
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
              </>
            )}
          </button>
          
          <button
            onClick={() => setVoteModalVisible(false)}
            className="py-3 px-6 bg-white text-blue-600 font-medium border border-blue-200 rounded-full hover:bg-blue-50 transition-colors shadow-sm hover:shadow relative overflow-hidden group"
          >
            <span className="relative z-10">Cancel</span>
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-blue-100/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
          </button>
        </div>
      </div>
    </div>
  </div>
)}
      
      {/* Token Vote Distribution Modal */}
      {tokenVoteDistributionVisible && selectedProject && allProjectVotes && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl p-6 relative shadow-xl border border-blue-100">
            <button 
              onClick={() => setTokenVoteDistributionVisible(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
            
            <h3 className="text-xl font-bold mb-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Token Vote Distribution
            </h3>
            <p className="text-blue-600 font-medium mb-4">{selectedProject.name}</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Pie Chart - takes 2 columns on large screens */}
              <div className="lg:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-center">
                <div className="w-full max-w-xs">
                  <TokenVotePieChart projectData={selectedProject} voteSummary={allProjectVotes} />
                </div>
              </div>
              
              {/* Token Vote Table - takes 3 columns on large screens */}
              <div className="lg:col-span-3 bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">CELO Value</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">% of Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {/* CELO Row - Always show this first */}
                      <tr>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                              <Coins className="h-3.5 w-3.5 text-blue-600" />
                            </div>
                            <span className="font-medium text-gray-800">CELO</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-gray-600">
                          {formatValue(sovereignSeas.formatTokenAmount(selectedProject.voteCount))}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-gray-600">
                          {formatValue(sovereignSeas.formatTokenAmount(selectedProject.voteCount))}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                            100%
                          </span>
                        </td>
                      </tr>
                      
                      {/* Display token vote data when available */}
                      {allProjectVotes && allProjectVotes.tokenVotes && 
                       allProjectVotes.tokenVotes.map((tokenVote: TokenVote, index: number) => {
                        // Skip CELO as it's shown above
                        if (tokenVote.tokenAddress.toLowerCase() === votingSystem.CELO_ADDRESS.toLowerCase()) return null;
                        
                        // Calculate percentage of total
                        const totalCeloValue = Number(parseFloat(sovereignSeas.formatTokenAmount(selectedProject.voteCount)));
                        const tokenCeloValue = Number(parseFloat(votingSystem.formatAmount(
                          votingSystem.CELO_ADDRESS, BigInt(tokenVote.celoEquivalent)
                        )));
                        const percentage = ((tokenCeloValue / totalCeloValue) * 100).toFixed(1);
                        
                        // Generate a color based on the index
                        const colors = ["blue", "indigo", "purple", "pink", "cyan"];
                        const colorIndex = index % colors.length;
                        const color = colors[colorIndex];
                        
                        // Get token symbol with fallback
                        const tokenSymbol = tokenVote.symbol || getTokenSymbol(tokenVote.tokenAddress);
                        
                        return (
                          <tr key={tokenVote.tokenAddress}>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className={`h-6 w-6 rounded-full bg-${color}-100 flex items-center justify-center mr-2`}>
                                  <CreditCard className={`h-3.5 w-3.5 text-${color}-600`} />
                                </div>
                                <span className="font-medium text-gray-800">{tokenSymbol}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-gray-600">
                              {formatValue(votingSystem.formatAmount(tokenVote.tokenAddress, BigInt(tokenVote.tokenAmount)))}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-gray-600">
                              {formatValue(votingSystem.formatAmount(votingSystem.CELO_ADDRESS, BigInt(tokenVote.celoEquivalent)))}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-right">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${color}-100 text-${color}-700`}>
                                {percentage}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      
                      {/* Show placeholder row if no token votes data */}
                      {(!allProjectVotes || !allProjectVotes.tokenVotes || 
                        allProjectVotes.tokenVotes.length === 0) && (
                        <tr>
                          <td colSpan={4} className="px-3 py-4 text-center text-sm text-gray-500">
                            No additional token votes recorded for this project yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setTokenVoteDistributionVisible(false)}
                className="px-6 py-2.5 bg-white text-blue-600 font-medium border border-blue-200 rounded-full hover:bg-blue-50 transition-colors shadow-sm"
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

// Helper function to get a color based on index
function getTokenColor(index: number) {
  const colors = ["blue", "indigo", "purple", "pink", "cyan"];
  return colors[index % colors.length];
}

// Token Vote Pie Chart Component
const TokenVotePieChart = ({ projectData, voteSummary }: { projectData: any; voteSummary: ProjectVoteSummary }) => {
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const sovereignSeas = useSovereignSeas();
  const votingSystem = useVotingSystem();
  
  useEffect(() => {
    // Default data if nothing else is available
    let data: ChartDataItem[] = [
      { name: "CELO", value: 100, color: "#3B82F6", percentage: "100" }
    ];
    
    if (projectData && voteSummary && voteSummary.tokenVotes && voteSummary.tokenVotes.length > 0) {
      // Build data from token votes
      const totalCeloValue = Number(parseFloat(sovereignSeas.formatTokenAmount(projectData.voteCount)));
      
      // Start with CELO as the main segment
      data = [
        { 
          name: "CELO", 
          value: totalCeloValue, 
          color: "#3B82F6",
          percentage: "100" 
        }
      ];
      
      // Add other tokens
      voteSummary.tokenVotes.forEach((tokenVote: TokenVote, index: number) => {
        if (tokenVote.tokenAddress.toLowerCase() === votingSystem.CELO_ADDRESS.toLowerCase()) return; // Skip CELO as it's handled above
        
        const tokenCeloValue = Number(parseFloat(votingSystem.formatAmount(
          votingSystem.CELO_ADDRESS, BigInt(tokenVote.celoEquivalent)
        )));
        
        const percentage = ((tokenCeloValue / totalCeloValue) * 100).toFixed(1);
        
        // Color palette
        const colors = ["#4F46E5", "#8B5CF6", "#EC4899", "#06B6D4", "#6366F1"];
        const colorIndex = index % colors.length;
        
        // Use the token symbol or a fallback
        const tokenName = tokenVote.symbol || 
                         (tokenVote.tokenAddress.toLowerCase() === "0x471EcE3750Da237f93B8E339c536989b8978a438" ? 
                          "cUSD" : 
                          `${tokenVote.tokenAddress.slice(0,6)}...${tokenVote.tokenAddress.slice(-4)}`);
        
        data.push({
          name: tokenName,
          value: tokenCeloValue,
          color: colors[colorIndex],
          percentage: percentage
        });
      });
    }
    
    setChartData(data);
  }, [projectData, voteSummary]);
  
  // If no data or React component isn't available, show placeholder
  if (!chartData || chartData.length === 0) {
    return <div className="h-40 flex items-center justify-center text-gray-500">No data available</div>;
  }
  
  return (
    <div className="relative h-64">
      {/* This is a simplified pie chart rendering */}
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Calculate pie slices */}
        {chartData.map((segment, index) => {
          // Simple calculation for pie slices for illustration
          // In a real app, you would use a proper charting library like Recharts
          const total = chartData.reduce((sum, item) => sum + item.value, 0);
          const startAngle = chartData
            .slice(0, index)
            .reduce((sum, item) => sum + (item.value / total) * 360, 0);
          const angle = (segment.value / total) * 360;
          
          // Convert angles to coordinates
          const startRad = (startAngle - 90) * (Math.PI / 180);
          const endRad = (startAngle + angle - 90) * (Math.PI / 180);
          const radius = 80;
          const centerX = 100;
          const centerY = 100;
          
          // Calculate arc path
          const x1 = centerX + radius * Math.cos(startRad);
          const y1 = centerY + radius * Math.sin(startRad);
          const x2 = centerX + radius * Math.cos(endRad);
          const y2 = centerY + radius * Math.sin(endRad);
          
          // Flag for large arc
          const largeArc = angle > 180 ? 1 : 0;
          
          // Create SVG path
          const path = `
            M ${centerX} ${centerY}
            L ${x1} ${y1}
            A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
            Z
          `;
          
          return (
            <path
              key={segment.name}
              d={path}
              fill={segment.color}
              stroke="#fff"
              strokeWidth="1"
              className="hover:opacity-80 transition-opacity cursor-pointer"
            />
          );
        })}
      </svg>
      
      {/* Legend */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-wrap justify-center gap-x-3 gap-y-1">
        {chartData.map((segment, index) => (
          <div key={segment.name} className="flex items-center text-xs">
            <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: segment.color }}></div>
            <span>{segment.name}: {segment.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
                  