'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Droplets, 
  Waves, 
  ChevronDown, 
  ChevronUp,
  Activity,
  Circle,
  CheckCircle,
  XCircle,
  TrendingUp,
  BarChart,
  Sparkles,
  Globe,
  Award,
  ArrowRight,
  HeartOff,
  Tag,
  PlusCircle,
  Zap
} from 'lucide-react';
import Image from 'next/image';
import { useSovereignSeas } from '../../hooks/useSovereignSeas';

// Contract addresses - replace with actual addresses
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` || 
  '0x35128A5Ee461943fA6403672b3574346Ba7E4530' as `0x${string}`;
const CELO_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_CELO_TOKEN_ADDRESS as `0x${string}` || 
  '0x3FC1f6138F4b0F5Da3E1927412Afe5c68ed4527b' as `0x${string}`;

// Campaign type
type Campaign = {
  id: bigint;
  admin: string;
  name: string;
  description: string;
  startTime: bigint;
  endTime: bigint;
  adminFeePercentage: bigint;
  voteMultiplier: bigint;
  maxWinners: bigint;
  useQuadraticDistribution: boolean;
  active: boolean;
  totalFunds: bigint;
  projectCount?: number;
  status?: 'active' | 'upcoming' | 'ended';
  timeRemaining?: {
    days: number;
    hours: number;
    minutes: number;
  };
};

export default function Campaigns() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const { address, isConnected } = useAccount();
  
  // Campaigns state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalActive, setTotalActive] = useState(0);
  const [totalUpcoming, setTotalUpcoming] = useState(0);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'upcoming' | 'ended'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'endingSoon' | 'mostFunded'>('newest');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  
  // Use the hook to interact with the contract
  const {
    isInitialized,
    loadCampaigns,
    loadProjects,
    formatTokenAmount,
    getCampaignTimeRemaining,
    isCampaignActive,
  } = useSovereignSeas({
    contractAddress: CONTRACT_ADDRESS,
    celoTokenAddress: CELO_TOKEN_ADDRESS,
  });

  // Initialize component
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load data from blockchain when initialized
  useEffect(() => {
    if (isInitialized) {
      fetchCampaigns();
    }
  }, [isInitialized]);

  // Apply filters when campaigns or filter criteria change
  useEffect(() => {
    applyFilters();
  }, [campaigns, searchQuery, statusFilter, sortBy, sortDirection]);

  // Fetch all campaigns
  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const campaignsData = await loadCampaigns();
      
      if (Array.isArray(campaignsData)) {
        // Process campaigns to add additional metadata
        const now = Math.floor(Date.now() / 1000);
        const processedCampaigns = await Promise.all(
          campaignsData.map(async (campaign) => {
            // Determine status
            let status: 'active' | 'upcoming' | 'ended';
            if (campaign.active && Number(campaign.startTime) <= now && Number(campaign.endTime) >= now) {
              status = 'active';
            } else if (Number(campaign.startTime) > now) {
              status = 'upcoming';
            } else {
              status = 'ended';
            }
            
            // Get project count
            const projects = await loadProjects(campaign.id);
            
            // Calculate time remaining
            const timeRemaining = getCampaignTimeRemaining(campaign);
            
            return {
              ...campaign,
              projectCount: projects.length,
              status,
              timeRemaining
            };
          })
        );
        
        // Set stats
        setTotalActive(processedCampaigns.filter(c => c.status === 'active').length);
        setTotalUpcoming(processedCampaigns.filter(c => c.status === 'upcoming').length);
        
        setCampaigns(processedCampaigns);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and sorting to campaigns
  const applyFilters = () => {
    let filtered = [...campaigns];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        campaign => 
          campaign.name.toLowerCase().includes(query) || 
          campaign.description.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === statusFilter);
    }
    
    // Apply sorting
    filtered = sortCampaigns(filtered, sortBy, sortDirection);
    
    setFilteredCampaigns(filtered);
  };

  // Sort campaigns based on criteria
  const sortCampaigns = (campaignsToSort: Campaign[], sortCriteria: string, direction: 'asc' | 'desc') => {
    const sorted = [...campaignsToSort];
    
    const multiplier = direction === 'asc' ? 1 : -1;
    
    switch (sortCriteria) {
      case 'newest':
        sorted.sort((a, b) => 
          multiplier * (Number(a.startTime) - Number(b.startTime))
        );
        break;
      case 'endingSoon':
        // Active campaigns first, then sort by end time
        sorted.sort((a, b) => {
          if (a.status === 'active' && b.status !== 'active') return -1 * multiplier;
          if (a.status !== 'active' && b.status === 'active') return 1 * multiplier;
          return multiplier * (Number(a.endTime) - Number(b.endTime));
        });
        break;
      case 'mostFunded':
        sorted.sort((a, b) => 
          multiplier * (Number(b.totalFunds) - Number(a.totalFunds))
        );
        break;
      default:
        break;
    }
    
    return sorted;
  };

  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  };

  // Navigate to campaign details
  const navigateToCampaign = (campaignId: string) => {
    router.push(`/campaign/${campaignId}/dashboard`);
  };

  // Navigate to create campaign
  const navigateToCreateCampaign = () => {
    router.push('/campaign/create');
  };

  // Get status badge color
  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500 text-slate-900';
      case 'upcoming':
        return 'bg-amber-400 text-slate-900';
      case 'ended':
        return 'bg-slate-600 text-white';
      default:
        return 'bg-slate-700 text-white';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case 'active':
        return <Zap className="h-3.5 w-3.5 mr-1" />;
      case 'upcoming':
        return <Clock className="h-3.5 w-3.5 mr-1" />;
      case 'ended':
        return <CheckCircle className="h-3.5 w-3.5 mr-1" />;
      default:
        return <Circle className="h-3.5 w-3.5 mr-1" />;
    }
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated Background Effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-20 left-10 w-64 h-64 bg-lime-500/10 rounded-full filter blur-3xl animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-500/10 rounded-full filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-teal-500/10 rounded-full filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>
        
        {/* Content */}
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center">
                <Globe className="h-7 w-7 text-lime-500 mr-2" />
                Ocean Conservation <span className="text-yellow-400 ml-2">Campaigns</span> 🌊
              </h1>
              <p className="text-slate-300 mt-2 max-w-2xl">
                Discover and support impactful projects dedicated to protecting our oceans. Vote with CELO tokens to make waves of change.
              </p>
            </div>
            
            {/* Quick stats */}
            <div className="flex flex-wrap gap-3">
              <div className="bg-slate-800/40 backdrop-blur-sm py-1.5 px-3 rounded-lg border border-lime-500/20 flex items-center">
                <Zap className="h-4 w-4 text-emerald-500 mr-1.5" />
                <span className="text-sm"><span className="text-emerald-400 font-semibold">{totalActive}</span> Active</span>
              </div>
              <div className="bg-slate-800/40 backdrop-blur-sm py-1.5 px-3 rounded-lg border border-lime-500/20 flex items-center">
                <Clock className="h-4 w-4 text-amber-400 mr-1.5" />
                <span className="text-sm"><span className="text-amber-400 font-semibold">{totalUpcoming}</span> Upcoming</span>
              </div>
              <button 
                onClick={navigateToCreateCampaign}
                className="bg-slate-800/40 backdrop-blur-sm py-1.5 px-3 rounded-lg border border-lime-500/20 text-lime-400 flex items-center text-sm hover:bg-lime-500/10 transition-colors"
              >
                <PlusCircle className="h-4 w-4 mr-1.5" />
                Create New
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filter Bar - Compact Version */}
      <div className="container mx-auto px-4">
        <div className="bg-slate-800/40 backdrop-blur-md rounded-lg p-3 border border-lime-600/20 shadow-lg">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="flex-grow min-w-[200px]">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-md bg-slate-700/60 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-lime-500 text-sm"
                />
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>
            
            {/* Quick Filters */}
            <div className="flex space-x-1">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-2 rounded-md text-xs font-medium ${
                  statusFilter === 'all'
                    ? 'bg-lime-600 text-white'
                    : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-2 rounded-md text-xs font-medium flex items-center ${
                  statusFilter === 'active'
                    ? 'bg-emerald-600/70 text-white'
                    : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Zap className="h-3 w-3 mr-1" />
                Active
              </button>
              <button
                onClick={() => setStatusFilter('upcoming')}
                className={`px-3 py-2 rounded-md text-xs font-medium flex items-center ${
                  statusFilter === 'upcoming'
                    ? 'bg-amber-600/70 text-white'
                    : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Clock className="h-3 w-3 mr-1" />
                Upcoming
              </button>
              <button
                onClick={() => setStatusFilter('ended')}
                className={`px-3 py-2 rounded-md text-xs font-medium flex items-center ${
                  statusFilter === 'ended'
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Ended
              </button>
            </div>
            
            {/* Sort Dropdown */}
            <div className="relative min-w-[140px]">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full appearance-none pl-8 pr-8 py-2 rounded-md bg-slate-700/60 border border-slate-600 text-white focus:outline-none focus:border-lime-500 text-xs"
              >
                <option value="newest">Newest First</option>
                <option value="endingSoon">Ending Soon</option>
                <option value="mostFunded">Most Funded</option>
              </select>
              <Filter className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <button 
                onClick={toggleSortDirection}
                className="absolute right-2.5 top-2.5"
              >
                {sortDirection === 'desc' 
                  ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  : <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                }
              </button>
            </div>
            
            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-2 rounded-md bg-slate-700/60 text-slate-300 hover:bg-slate-700 transition-colors text-xs flex items-center"
            >
              <BarChart className="h-3.5 w-3.5 mr-1.5" />
              {showFilters ? 'Hide Filters' : 'More Filters'}
              {showFilters ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
            </button>
          </div>
          
          {/* Advanced Filters - Expanded */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-slate-700/50 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 text-xs">Distribution Method</label>
                <select
                  className="w-full appearance-none pl-3 pr-8 py-2 rounded-md bg-slate-700/60 border border-slate-600 text-white focus:outline-none focus:border-lime-500 text-xs"
                >
                  <option value="all">All Methods</option>
                  <option value="quadratic">Quadratic Distribution</option>
                  <option value="linear">Linear Distribution</option>
                </select>
              </div>
              
              <div>
                <label className="block text-slate-400 mb-1 text-xs">Vote Multiplier</label>
                <select
                  className="w-full appearance-none pl-3 pr-8 py-2 rounded-md bg-slate-700/60 border border-slate-600 text-white focus:outline-none focus:border-lime-500 text-xs"
                >
                  <option value="all">Any Multiplier</option>
                  <option value="1">1x</option>
                  <option value="2">2x</option>
                  <option value="3">3x or more</option>
                </select>
              </div>
              
              <div>
                <label className="block text-slate-400 mb-1 text-xs">Funding Amount</label>
                <select
                  className="w-full appearance-none pl-3 pr-8 py-2 rounded-md bg-slate-700/60 border border-slate-600 text-white focus:outline-none focus:border-lime-500 text-xs"
                >
                  <option value="all">Any Amount</option>
                  <option value="low">Less than 100 CELO</option>
                  <option value="medium">100-1000 CELO</option>
                  <option value="high">1000+ CELO</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Results Count + Create Button */}
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="text-slate-300 text-sm">
          {loading ? (
            <span className="flex items-center">
              <div className="w-4 h-4 border-t-2 border-lime-500 rounded-full animate-spin mr-2"></div>
              Loading campaigns...
            </span>
          ) : (
            <span>{filteredCampaigns.length} campaigns found</span>
          )}
        </div>
        
        <button 
          onClick={navigateToCreateCampaign}
          className="text-lime-400 hover:text-lime-300 text-sm transition-colors flex items-center"
        >
          <PlusCircle className="h-4 w-4 mr-1.5" />
          Create Campaign
        </button>
      </div>
      
      {/* Campaigns Grid */}
      <div className="container mx-auto px-4 py-4">
        {loading ? (
          // Loading state
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-500"></div>
          </div>
        ) : filteredCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCampaigns.map((campaign) => (
              <div 
                key={campaign.id.toString()}
                className="bg-slate-800/40 backdrop-blur-md rounded-lg overflow-hidden border border-slate-700 hover:border-lime-500/50 transition-all cursor-pointer shadow-lg hover:shadow-lime-500/5"
                onClick={() => navigateToCampaign(campaign.id.toString())}
              >
                {/* Campaign Header */}
                <div className="h-28 bg-gradient-to-r from-slate-700/80 to-slate-700/40 relative overflow-hidden">
                  {/* Status Badge */}
                  <div className={`absolute top-3 right-3 px-2 py-0.5 ${getStatusColor(campaign.status)} text-xs font-medium rounded-md flex items-center`}>
                    {getStatusIcon(campaign.status)}
                    {campaign.status === 'active' 
                      ? 'Active' 
                      : campaign.status === 'upcoming' 
                        ? 'Coming Soon' 
                        : 'Ended'}
                  </div>
                  
                  {/* Campaign ID */}
                  <div className="absolute top-3 left-3 px-2 py-0.5 bg-slate-800/80 backdrop-blur-sm text-xs text-slate-400 rounded-md">
                    ID: {campaign.id.toString()}
                  </div>
                  
                  {/* Time Remaining */}
                  {campaign.status === 'active' && campaign.timeRemaining && (
                    <div className="absolute bottom-3 right-3 px-2 py-0.5 bg-slate-900/80 backdrop-blur-sm text-white text-xs rounded-md flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {campaign.timeRemaining.days}d {campaign.timeRemaining.hours}h remaining
                    </div>
                  )}
                  
                  {/* Decoration */}
                  <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-gradient-to-r from-lime-500/20 to-yellow-500/20 blur-xl"></div>
                  <div className="absolute top-4 left-1/2 text-lime-500/10">
                    <Waves className="h-32 w-32" />
                  </div>
                </div>
                
                {/* Campaign Content */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">{campaign.name}</h3>
                  <p className="text-slate-300 text-xs mb-3 line-clamp-2">{campaign.description}</p>
                  
                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-slate-700/30 rounded-md p-2 flex items-center">
                      <Droplets className="h-3.5 w-3.5 text-lime-500 mr-1.5" />
                      <div>
                        <div className="text-xs text-slate-400">Total Funds</div>
                        <div className="text-lime-400 text-sm font-medium">{formatTokenAmount(campaign.totalFunds)} CELO</div>
                      </div>
                    </div>
                    <div className="bg-slate-700/30 rounded-md p-2 flex items-center">
                      <Globe className="h-3.5 w-3.5 text-lime-500 mr-1.5" />
                      <div>
                        <div className="text-xs text-slate-400">Projects</div>
                        <div className="text-white text-sm font-medium">{campaign.projectCount || 0}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <div className="px-2 py-0.5 bg-slate-700/50 rounded-md text-xs text-slate-300 flex items-center">
                      <Tag className="h-3 w-3 mr-1 text-yellow-500" />
                      {campaign.useQuadraticDistribution ? 'Quadratic' : 'Linear'} 
                    </div>
                    <div className="px-2 py-0.5 bg-slate-700/50 rounded-md text-xs text-slate-300 flex items-center">
                      <Award className="h-3 w-3 mr-1 text-yellow-500" />
                      {campaign.voteMultiplier.toString()}x Votes
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <button 
                    className="w-full py-1.5 rounded-md bg-gradient-to-r from-lime-600/60 to-lime-500/60 hover:from-lime-600 hover:to-lime-500 text-white text-xs font-medium transition-all flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToCampaign(campaign.id.toString());
                    }}
                  >
                    Explore Campaign <ArrowRight className="ml-1.5 h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // No campaigns found
          <div className="bg-slate-800/30 backdrop-blur-md rounded-lg p-8 text-center my-8 border border-slate-700">
            <div className="flex justify-center mb-4">
              <XCircle className="h-14 w-14 text-slate-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Campaigns Found</h3>
            <p className="text-slate-300 mb-6 max-w-lg mx-auto">
              {searchQuery 
                ? `No campaigns match "${searchQuery}". Try a different search term or filter.` 
                : 'No campaigns found with the current filters. Try adjusting your filters or create a new campaign.'}
            </p>
            <div className="flex justify-center">
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setSortBy('newest');
                }}
                className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-all mr-3"
              >
                Reset Filters
              </button>
              <button 
                onClick={navigateToCreateCampaign}
                className="px-4 py-2 rounded-lg bg-lime-600 text-white hover:bg-lime-500 transition-all flex items-center"
              >
                <PlusCircle className="h-4 w-4 mr-1.5" />
                Create Campaign
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Pagination (if needed) - Simplified */}
      {filteredCampaigns.length > 12 && (
        <div className="container mx-auto px-4 py-6 flex justify-center">
          <div className="flex space-x-1.5">
            <button className="px-3 py-1.5 rounded-md bg-slate-700 text-white hover:bg-slate-600 transition-all text-xs">
              Previous
            </button>
            <button className="px-3 py-1.5 rounded-md bg-lime-600 text-white text-xs">
              1
            </button>
            <button className="px-3 py-1.5 rounded-md bg-slate-700 text-white hover:bg-slate-600 transition-all text-xs">
              2
            </button>
            <button className="px-3 py-1.5 rounded-md bg-slate-700 text-white hover:bg-slate-600 transition-all text-xs">
              3
            </button>
            <button className="px-3 py-1.5 rounded-md bg-slate-700 text-white hover:bg-slate-600 transition-all text-xs">
              Next
            </button>
          </div>
        </div>
      )}
      
      {/* No Wallet Connected Warning - Subtle */}
      {!isConnected && (
        <div className="container mx-auto px-4 py-4">
          <div className="bg-yellow-500/10 backdrop-blur-md rounded-lg p-3 border border-yellow-500/20 flex flex-wrap items-center justify-between">
            <p className="text-yellow-300 text-sm">
              💡 Connect your wallet to vote for projects and contribute to campaigns
            </p>
            <button className="px-3 py-1.5 rounded-md bg-yellow-500 text-slate-900 font-medium hover:bg-yellow-400 transition-all text-xs">
              Connect Wallet
            </button>
          </div>
        </div>
      )}
      
      {/* CTA Section - Compact */}
      <div className="container mx-auto px-4 py-10">
        <div className="bg-gradient-to-r from-lime-900/30 to-yellow-900/30 backdrop-blur-md rounded-lg p-5 border border-lime-500/20 shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h2 className="text-xl font-bold text-white mb-2 flex items-center">
                <Sparkles className="h-5 w-5 text-yellow-400 mr-2" />
                Make waves in ocean conservation 🌊
              </h2>
              <p className="text-lime-100 text-sm">
                Every vote helps fund vital projects. Join our community of changemakers today!
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={navigateToCreateCampaign}
                className="px-4 py-2 rounded-lg bg-yellow-500 text-slate-900 font-medium hover:bg-yellow-400 transition-all text-sm flex items-center shadow-md shadow-yellow-500/20"
              >
                <PlusCircle className="h-4 w-4 mr-1.5" />
                Start Campaign
              </button>
              <button 
                onClick={() => router.push('/')}
                className="px-4 py-2 rounded-lg bg-transparent border border-lime-400 text-lime-400 font-medium hover:bg-lime-500/10 transition-all text-sm"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Category Highlights (Optional) */}
      
    </div>
  );
}