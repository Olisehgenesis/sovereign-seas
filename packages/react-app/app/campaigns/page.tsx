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
  XCircle
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
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'upcoming' | 'ended'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'endingSoon' | 'mostFunded'>('newest');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
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
        return 'bg-lime-500 text-slate-900';
      case 'upcoming':
        return 'bg-yellow-400 text-slate-900';
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
        return <Activity className="h-4 w-4 mr-1" />;
      case 'upcoming':
        return <Clock className="h-4 w-4 mr-1" />;
      case 'ended':
        return <CheckCircle className="h-4 w-4 mr-1" />;
      default:
        return <Circle className="h-4 w-4 mr-1" />;
    }
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="relative overflow-hidden">
        {/* Background Wave Effect */}
        <div className="absolute inset-0 z-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
            <path fill="#84cc16" fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,149.3C672,149,768,171,864,176C960,181,1056,171,1152,154.7C1248,139,1344,117,1392,106.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
          </svg>
        </div>
        
        {/* Content */}
        <div className="container mx-auto px-6 py-16 relative z-10">
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            <div className="flex items-center mb-2">
              <Waves className="h-8 w-8 text-lime-500 mr-3" />
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                Explore <span className="text-yellow-400">Campaigns</span>
              </h1>
            </div>
            
            <p className="text-lg text-lime-100 max-w-2xl">
              Browse and join ocean conservation campaigns. Support projects with your votes and help make a difference.
            </p>
            
            <button 
              onClick={navigateToCreateCampaign}
              className="px-6 py-3 rounded-full bg-lime-500 text-slate-900 font-semibold hover:bg-lime-400 transition-all flex items-center"
            >
              Create New Campaign <Waves className="ml-2 h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Filters Section */}
      <div className="container mx-auto px-6 py-8">
        <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-6 border border-lime-600/20">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-grow">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search campaigns by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-700/60 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-lime-500"
                />
                <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
              </div>
            </div>
            
            {/* Status Filter */}
            <div className="w-full lg:w-64">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full appearance-none pl-10 pr-10 py-3 rounded-lg bg-slate-700/60 border border-slate-600 text-white focus:outline-none focus:border-lime-500"
                >
                  <option value="all">All Campaigns</option>
                  <option value="active">Active</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="ended">Ended</option>
                </select>
                <Filter className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                <ChevronDown className="absolute right-3 top-3.5 h-5 w-5 text-slate-400" />
              </div>
            </div>
            
            {/* Sort By */}
            <div className="w-full lg:w-72">
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full appearance-none pl-10 pr-10 py-3 rounded-lg bg-slate-700/60 border border-slate-600 text-white focus:outline-none focus:border-lime-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="endingSoon">Ending Soon</option>
                  <option value="mostFunded">Most Funded</option>
                </select>
                <Calendar className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                <button 
                  onClick={toggleSortDirection}
                  className="absolute right-3 top-3.5"
                >
                  {sortDirection === 'desc' 
                    ? <ChevronDown className="h-5 w-5 text-slate-400" />
                    : <ChevronUp className="h-5 w-5 text-slate-400" />
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Campaigns List */}
      <div className="container mx-auto px-6 py-8">
        {loading ? (
          // Loading state
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-500"></div>
          </div>
        ) : filteredCampaigns.length > 0 ? (
          // Campaigns grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCampaigns.map((campaign) => (
              <div 
                key={campaign.id.toString()}
                className="bg-slate-800/40 backdrop-blur-md rounded-xl overflow-hidden border border-lime-600/20 hover:border-lime-500/50 transition-all cursor-pointer transform hover:-translate-y-1"
                onClick={() => navigateToCampaign(campaign.id.toString())}
              >
                <div className="h-40 bg-gradient-to-r from-lime-600/40 to-yellow-600/40 relative">
                  <div className={`absolute bottom-4 left-4 px-3 py-1 ${getStatusColor(campaign.status)} text-sm font-semibold rounded-full flex items-center`}>
                    {getStatusIcon(campaign.status)}
                    {campaign.status === 'active' 
                      ? 'Active' 
                      : campaign.status === 'upcoming' 
                        ? 'Coming Soon' 
                        : 'Ended'}
                  </div>
                  
                  {campaign.status === 'active' && campaign.timeRemaining && (
                    <div className="absolute bottom-4 right-4 px-3 py-1 bg-slate-800/80 text-white text-sm font-semibold rounded-full flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {campaign.timeRemaining.days}d {campaign.timeRemaining.hours}h
                    </div>
                  )}
                </div>
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-white">{campaign.name}</h3>
                    <div className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
                      ID: {campaign.id.toString()}
                    </div>
                  </div>
                  
                  <p className="text-slate-300 mb-4 line-clamp-2">{campaign.description}</p>
                  
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-lime-400 font-medium flex items-center">
                      <Droplets className="h-4 w-4 mr-1" />
                      {formatTokenAmount(campaign.totalFunds)} CELO
                    </div>
                    <div className="text-slate-400 text-sm flex items-center">
                      <Image 
                        src="/logo.svg" 
                        alt="Projects"
                        width={16}
                        height={16}
                        className="mr-1"
                      />
                      {campaign.projectCount} Projects
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-slate-400">
                      {campaign.useQuadraticDistribution 
                        ? 'Quadratic Distribution' 
                        : 'Linear Distribution'}
                    </div>
                    <div className="text-xs text-slate-400">
                      Vote Multiplier: {campaign.voteMultiplier.toString()}x
                    </div>
                  </div>
                </div>
                
                <div className="px-6 pb-6">
                  <button 
                    className="w-full py-2 rounded-full bg-lime-500/20 text-lime-300 hover:bg-lime-500/30 transition-all text-sm font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToCampaign(campaign.id.toString());
                    }}
                  >
                    View Campaign
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // No campaigns found
          <div className="bg-slate-800/30 backdrop-blur-md rounded-xl p-8 text-center my-12">
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-slate-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Campaigns Found</h3>
            <p className="text-slate-300 mb-6">
              {searchQuery 
                ? `No campaigns match "${searchQuery}". Try a different search term or filter.` 
                : 'No campaigns found with the current filters. Try adjusting your filters or create a new campaign.'}
            </p>
            <button 
              onClick={navigateToCreateCampaign}
              className="px-6 py-3 rounded-full bg-lime-500 text-slate-900 font-semibold hover:bg-lime-400 transition-all inline-flex items-center"
            >
              Create New Campaign <Waves className="ml-2 h-5 w-5" />
            </button>
          </div>
        )}
      </div>
      
      {/* Pagination (if needed) */}
      {filteredCampaigns.length > 0 && filteredCampaigns.length > 12 && (
        <div className="container mx-auto px-6 py-8 flex justify-center">
          <div className="flex space-x-2">
            <button className="px-4 py-2 rounded-lg bg-slate-700/60 text-white hover:bg-slate-700 transition-all">
              Previous
            </button>
            <button className="px-4 py-2 rounded-lg bg-lime-500 text-slate-900 font-semibold">
              1
            </button>
            <button className="px-4 py-2 rounded-lg bg-slate-700/60 text-white hover:bg-slate-700 transition-all">
              2
            </button>
            <button className="px-4 py-2 rounded-lg bg-slate-700/60 text-white hover:bg-slate-700 transition-all">
              Next
            </button>
          </div>
        </div>
      )}
      
      {/* No Wallet Connected Warning */}
      {!isConnected && (
        <div className="container mx-auto px-6 py-8">
          <div className="bg-yellow-500/10 backdrop-blur-md rounded-xl p-6 border border-yellow-500/30 text-center">
            <p className="text-yellow-300 mb-2">
              You are not connected to a wallet. Connect your wallet to interact with campaigns.
            </p>
            <button className="px-4 py-2 rounded-full bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition-all text-sm">
              Connect Wallet
            </button>
          </div>
        </div>
      )}
      
      {/* CTA Section */}
      <div className="py-16">
        <div className="container mx-auto px-6">
          <div className="bg-gradient-to-r from-lime-900/40 to-yellow-900/40 backdrop-blur-md rounded-2xl p-8 border border-lime-500/30">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  Make a splash in ocean conservation
                </h2>
                <p className="text-lime-100">
                  Create your own campaign or contribute to existing ones. Every vote counts!
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={navigateToCreateCampaign}
                  className="px-6 py-3 rounded-full bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition-all"
                >
                  Start a Campaign
                </button>
                <button 
                  onClick={() => router.push('/')}
                  className="px-6 py-3 rounded-full bg-transparent border border-lime-400 text-lime-400 font-semibold hover:bg-lime-500/10 transition-all"
                >
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}