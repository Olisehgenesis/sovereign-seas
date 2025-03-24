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
  Zap,
  Video,
  Image as ImageIcon,
  FileCode,
  Code,
  Laptop,
  Hash
} from 'lucide-react';
import Image from 'next/image';
import { useSovereignSeas } from '../../hooks/useSovereignSeas';

// Campaign type
type Campaign = {
  id: bigint;
  admin: string;
  name: string;
  description: string;
  logo: string;
  demoVideo: string;
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
    isSuperAdmin
  } = useSovereignSeas();

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

  // Navigate to admin
  const navigateToAdmin = () => {
    router.push('/admin');
  };

  // Get status badge color
  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500 text-white';
      case 'upcoming':
        return 'bg-amber-400 text-amber-900';
      case 'ended':
        return 'bg-gray-300 text-gray-700';
      default:
        return 'bg-gray-300 text-gray-700';
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Content */}
        <div className="container mx-auto px-6 py-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center tilt-neon">
                <Hash className="h-7 w-7 text-emerald-600 mr-2" />
                Innovation <span className="text-emerald-600 ml-2">Campaigns</span>
              </h1>
              <p className="text-gray-600 mt-2 max-w-2xl">
                Discover and support impactful tech projects and initiatives. Vote with CELO tokens to fund innovation.
              </p>
            </div>
            
            {/* Quick stats */}
            <div className="flex flex-wrap gap-3">
              <div className="bg-white py-2 px-4 rounded-full border border-gray-200 shadow-sm flex items-center">
                <Zap className="h-4 w-4 text-emerald-500 mr-1.5" />
                <span className="text-sm"><span className="text-emerald-600 font-semibold">{totalActive}</span> Active</span>
              </div>
              <div className="bg-white py-2 px-4 rounded-full border border-gray-200 shadow-sm flex items-center">
                <Clock className="h-4 w-4 text-amber-500 mr-1.5" />
                <span className="text-sm"><span className="text-amber-600 font-semibold">{totalUpcoming}</span> Upcoming</span>
              </div>
              <button 
                onClick={navigateToCreateCampaign}
                className="bg-white py-2 px-4 rounded-full border border-emerald-100 text-emerald-600 flex items-center text-sm hover:bg-emerald-50 transition-colors shadow-sm"
              >
                <PlusCircle className="h-4 w-4 mr-1.5" />
                Create New
              </button>
              {isSuperAdmin && (
                <button 
                  onClick={navigateToAdmin}
                  className="bg-white py-2 px-4 rounded-full border border-purple-100 text-purple-600 flex items-center text-sm hover:bg-purple-50 transition-colors shadow-sm"
                >
                  <Award className="h-4 w-4 mr-1.5" />
                  Admin
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Filter Bar */}
      <div className="container mx-auto px-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-md">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex-grow min-w-[200px]">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-full bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            {/* Quick Filters */}
            <div className="flex space-x-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2.5 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-4 py-2.5 rounded-full text-xs font-medium flex items-center transition-colors ${
                  statusFilter === 'active'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Zap className="h-3.5 w-3.5 mr-1.5" />
                Active
              </button>
              <button
                onClick={() => setStatusFilter('upcoming')}
                className={`px-4 py-2.5 rounded-full text-xs font-medium flex items-center transition-colors ${
                  statusFilter === 'upcoming'
                    ? 'bg-amber-400 text-amber-900 shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Upcoming
              </button>
              <button
                onClick={() => setStatusFilter('ended')}
                className={`px-4 py-2.5 rounded-full text-xs font-medium flex items-center transition-colors ${
                  statusFilter === 'ended'
                    ? 'bg-gray-300 text-gray-700 shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                Ended
              </button>
            </div>
            
            {/* Sort Dropdown */}
            <div className="relative min-w-[160px]">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full appearance-none pl-9 pr-10 py-2.5 rounded-full bg-gray-50 border border-gray-200 text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs"
              >
                <option value="newest">Newest First</option>
                <option value="endingSoon">Ending Soon</option>
                <option value="mostFunded">Most Funded</option>
              </select>
              <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <button 
                onClick={toggleSortDirection}
                className="absolute right-3 top-2.5"
              >
                {sortDirection === 'desc' 
                  ? <ChevronDown className="h-4 w-4 text-gray-400" />
                  : <ChevronUp className="h-4 w-4 text-gray-400" />
                }
              </button>
            </div>
            
            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2.5 rounded-full bg-white border border-gray-200 text-emerald-600 hover:bg-emerald-50 transition-colors text-xs flex items-center shadow-sm"
            >
              <BarChart className="h-3.5 w-3.5 mr-1.5" />
              {showFilters ? 'Hide Filters' : 'More Filters'}
              {showFilters ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
            </button>
          </div>
          
          {/* Advanced Filters - Expanded */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-500 mb-1.5 text-xs">Distribution Method</label>
                <select
                  className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-full bg-gray-50 border border-gray-200 text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs"
                >
                  <option value="all">All Methods</option>
                  <option value="quadratic">Quadratic Distribution</option>
                  <option value="linear">Linear Distribution</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-500 mb-1.5 text-xs">Vote Multiplier</label>
                <select
                  className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-full bg-gray-50 border border-gray-200 text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs"
                >
                  <option value="all">Any Multiplier</option>
                  <option value="1">1x</option>
                  <option value="2">2x</option>
                  <option value="3">3x or more</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-500 mb-1.5 text-xs">Funding Amount</label>
                <select
                  className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-full bg-gray-50 border border-gray-200 text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs"
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
      <div className="container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="text-gray-600 text-sm">
          {loading ? (
            <span className="flex items-center">
              <div className="w-4 h-4 border-t-2 border-emerald-500 rounded-full animate-spin mr-2"></div>
              Loading campaigns...
            </span>
          ) : (
            <span>{filteredCampaigns.length} campaigns found</span>
          )}
        </div>
        
        <button 
          onClick={navigateToCreateCampaign}
          className="text-emerald-600 hover:text-emerald-700 text-sm transition-colors flex items-center"
        >
          <PlusCircle className="h-4 w-4 mr-1.5" />
          Create Campaign
        </button>
      </div>
      
      {/* Campaigns Grid */}
      <div className="container mx-auto px-6 py-4">
        {loading ? (
          // Loading state
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : filteredCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign) => (
              <div 
                key={campaign.id.toString()}
                className="bg-white rounded-xl overflow-hidden border border-gray-200 hover:border-emerald-300 transition-all cursor-pointer shadow-md hover:shadow-lg hover:-translate-y-1 duration-200"
                onClick={() => navigateToCampaign(campaign.id.toString())}
              >
                {/* Campaign Header */}
                <div className="h-28 bg-gradient-to-r from-teal-50 to-emerald-50 relative overflow-hidden">
                  {/* Display campaign logo if available */}
                  {campaign.logo && (
                    <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${campaign.logo})`, opacity: 0.8 }}></div>
                  )}
                  
                  {/* Status Badge */}
                  <div className={`absolute top-3 right-3 px-3 py-1 ${getStatusColor(campaign.status)} text-xs font-medium rounded-full flex items-center shadow-sm`}>
                    {getStatusIcon(campaign.status)}
                    {campaign.status === 'active' 
                      ? 'Active' 
                      : campaign.status === 'upcoming' 
                        ? 'Coming Soon' 
                        : 'Ended'}
                  </div>
                  
                  {/* Media Indicators */}
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    {campaign.demoVideo && (
                      <div className="px-2 py-1 bg-white text-amber-600 text-xs rounded-full flex items-center shadow-sm">
                        <Video className="h-3 w-3 mr-1" />
                        Demo
                      </div>
                    )}
                  </div>
                  
                  {/* Time Remaining */}
                  {campaign.status === 'active' && campaign.timeRemaining && (
                    <div className="absolute bottom-3 right-3 px-3 py-1 bg-white text-gray-700 text-xs rounded-full flex items-center shadow-sm">
                      <Clock className="h-3 w-3 mr-1 text-emerald-500" />
                      {campaign.timeRemaining.days}d {campaign.timeRemaining.hours}h remaining
                    </div>
                  )}
                  
                  {/* Decoration */}
                  <div className="absolute top-4 left-1/2 text-emerald-200">
                    <Laptop className="h-32 w-32" />
                  </div>
                </div>
                
                {/* Campaign Content */}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-1">{campaign.name}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{campaign.description}</p>
                  
                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-xl p-3 flex items-center">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
                        <Droplets className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Total Funds</div>
                        <div className="text-emerald-600 text-sm font-medium">{formatTokenAmount(campaign.totalFunds)} CELO</div>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 flex items-center">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
                        <Code className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Projects</div>
                        <div className="text-gray-800 text-sm font-medium">{campaign.projectCount || 0}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-700 flex items-center">
                      <Tag className="h-3 w-3 mr-1 text-teal-600" />
                      {campaign.useQuadraticDistribution ? 'Quadratic' : 'Linear'} 
                    </div>
                    <div className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-700 flex items-center">
                      <Award className="h-3 w-3 mr-1 text-teal-600" />
                      {campaign.voteMultiplier.toString()}x Votes
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <button 
                    className="w-full py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors flex items-center justify-center shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToCampaign(campaign.id.toString());
                    }}
                  >
                    Explore Campaign <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // No campaigns found
          <div className="bg-white rounded-xl p-8 text-center my-8 border border-gray-200 shadow-md">
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-gray-400" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3 tilt-neon">No Campaigns Found</h3>
            <p className="text-gray-600 mb-6 max-w-lg mx-auto">
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
                className="px-5 py-2.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors mr-3 shadow-sm"
              >
                Reset Filters
              </button>
              <button 
                onClick={navigateToCreateCampaign}
                className="px-5 py-2.5 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 transition-colors flex items-center shadow-sm"
              >
                <PlusCircle className="h-4 w-4 mr-1.5" />
                Create Campaign
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Pagination (if needed) */}
      {filteredCampaigns.length > 12 && (
        <div className="container mx-auto px-6 py-8 flex justify-center">
          <div className="flex space-x-2">
            <button className="px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-xs shadow-sm">
              Previous
            </button>
            <button className="px-4 py-2 rounded-full bg-emerald-500 text-white text-xs shadow-sm">
              1
            </button>
            <button className="px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-xs shadow-sm">
              2
            </button>
            <button className="px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-xs shadow-sm">
              3
            </button>
            <button className="px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-xs shadow-sm">
              Next
            </button>
          </div>
        </div>
      )}
      
      {/* No Wallet Connected Warning */}
      {!isConnected && (
        <div className="container mx-auto px-6 py-4">
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 flex flex-wrap items-center justify-between shadow-sm">
            <p className="text-amber-700 text-sm">
              💡 Connect your wallet to vote for projects and contribute to campaigns
            </p>
            <button className="px-4 py-2 rounded-full bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors text-xs shadow-sm">
              Connect Wallet
            </button>
          </div>
        </div>
      )}
      
      {/* CTA Section */}
      <div className="container mx-auto px-6 py-10">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-100 rounded-xl p-6 border border-emerald-100 shadow-md">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center tilt-neon">
                <Sparkles className="h-5 w-5 text-emerald-500 mr-2" />
                Make an impact through innovation
              </h2>
              <p className="text-gray-600 text-sm">
                Every vote helps fund vital projects. Join our community of innovators today!
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={navigateToCreateCampaign}
                className="px-5 py-2.5 rounded-full bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors text-sm flex items-center shadow-md"
              >
                <PlusCircle className="h-4 w-4 mr-1.5" />
                Start Campaign
              </button>
              <button 
                onClick={() => router.push('/')}
                className="px-5 py-2.5 rounded-full bg-white border border-emerald-200 text-emerald-600 font-medium hover:bg-emerald-50 transition-colors text-sm shadow-sm"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}