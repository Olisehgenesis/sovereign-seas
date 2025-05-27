// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search,
  Trophy,
  Users,
  Coins,
  Award,
  Calendar,
  AlertTriangle,
  Timer,
  CheckCircle,
  PlayCircle,
  BarChart,
  ArrowUpRight,
  Anchor,
  Activity,
} from 'lucide-react';
import { useAllCampaigns } from '@/hooks/useCampaignMethods';
import { Address } from 'viem';
import { formatEther } from 'viem';
import { formatIpfsUrl } from '@/utils/imageUtils';

// Get contract address from environment
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_V4 as Address;

interface CampaignMetadata {
  mainInfo?: string;
  additionalInfo?: string;
  customDistributionData?: string;
  type?: string;
  category?: string;
  tags?: string[];
  logo?: string;
  bannerImage?: string;
  bio?: string;
  tagline?: string;
  [key: string]: any;
}

interface EnhancedCampaign {
  id: bigint;
  admin: Address;
  name: string;
  description: string;
  startTime: bigint;
  endTime: bigint;
  adminFeePercentage: bigint;
  maxWinners: bigint;
  useQuadraticDistribution: boolean;
  useCustomDistribution: boolean;
  payoutToken: Address;
  active: boolean;
  totalFunds: bigint;
  status: 'upcoming' | 'active' | 'ended' | 'paused';
  metadata: CampaignMetadata;
}



const parseCampaignMetadata = (campaignDetails: any): CampaignMetadata => {
  let parsedMetadata: CampaignMetadata = {};
  
  try {
    if (campaignDetails.metadata?.mainInfo) {
      try {
        const mainInfo = JSON.parse(campaignDetails.metadata.mainInfo);
        parsedMetadata = { ...parsedMetadata, ...mainInfo };
      } catch (e) {
        parsedMetadata.mainInfo = campaignDetails.metadata.mainInfo;
      }
    }

    if (campaignDetails.metadata?.additionalInfo) {
      try {
        const additionalInfo = JSON.parse(campaignDetails.metadata.additionalInfo);
        parsedMetadata = { ...parsedMetadata, ...additionalInfo };
      } catch (e) {
        parsedMetadata.additionalInfo = campaignDetails.metadata.additionalInfo;
      }
    }
  } catch (e) {
    console.warn('Error parsing campaign metadata:', e);
  }

  return parsedMetadata;
};

const getCampaignStatus = (campaign: any): 'upcoming' | 'active' | 'ended' | 'paused' => {
  const now = Math.floor(Date.now() / 1000);
  const start = Number(campaign.startTime);
  const end = Number(campaign.endTime);
  
  if (!campaign.active) return 'paused';
  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'active';
  return 'ended';
};

// Campaign Card Component
const CampaignCard = ({ campaign }: { campaign: EnhancedCampaign }) => {
  const navigate = useNavigate();

  // Calculate time status properly
  const now = Math.floor(Date.now() / 1000);
  const hasStarted = now >= Number(campaign.startTime);
  const hasEnded = now >= Number(campaign.endTime);
  
  // Format CELO amount as whole number
  const celoAmount = Number(formatEther(campaign.totalFunds)).toFixed(0);
  
  // Determine status class and text
  let statusClass = 'bg-gray-200 text-gray-700';
  let statusText = 'Ended';
  let StatusIcon = CheckCircle;
  
  if (!hasStarted) {
    statusClass = 'bg-cyan-400 text-blue-900';
    statusText = 'Coming Soon';
    StatusIcon = Timer;
  } else if (!hasEnded) {
    statusClass = 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white';
    statusText = 'Active';
    StatusIcon = Activity;
  }

  return (
    <div
      onClick={() => navigate(`/explorer/campaign/${campaign.id.toString()}`)}
      className="group relative bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-blue-100 hover:shadow-xl hover:-translate-y-3 transition-all duration-500 cursor-pointer"
    >
      {/* Enhanced shadow and glow effects */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
      
      <div className="relative h-40 sm:h-48 bg-gradient-to-r from-blue-100 to-indigo-100 overflow-hidden">
        {campaign.metadata.logo ? (
          <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${formatIpfsUrl(campaign.metadata.logo)})`, opacity: 0.9 }}></div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <Anchor className="h-16 w-16 text-blue-500" />
          </div>
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        
        {/* Status badge with improved styling */}
        <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-medium flex items-center shadow-md z-10 ${statusClass}`}>
          <StatusIcon className="h-3 w-3 mr-1.5" />
          {statusText}
        </div>
        
        {/* Campaign name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <h3 className="text-base sm:text-lg font-bold text-white mb-1 group-hover:text-blue-200 transition-colors line-clamp-1">{campaign.name}</h3>
          <div className="flex items-center text-white/80 text-sm">
            <BarChart className="h-3.5 w-3.5 mr-1.5" />
            {celoAmount} CELO
          </div>
        </div>
        
        {/* Prize Pool Overlay */}
        {campaign.totalFunds > 0n && (
          <div className="absolute top-3 left-3">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1">
              <p className="text-xs text-gray-600">Prize Pool</p>
              <p className="font-bold text-green-600 text-sm">
                {parseFloat(formatEther(campaign.totalFunds)).toFixed(1)} CELO
              </p>
            </div>
          </div>
        )}
        
        {/* Time remaining indicator */}
        {!hasStarted && (
          <div className="absolute bottom-16 left-4 px-3 py-1.5 bg-blue-500/70 text-white text-xs rounded-full backdrop-blur-sm shadow-md flex items-center">
            <Timer className="h-3 w-3 mr-1.5 animate-pulse" /> 
            Coming Soon
          </div>
        )}

        {hasStarted && !hasEnded && campaign.endTime && (
          <div className="absolute bottom-16 left-4 px-3 py-1.5 bg-indigo-500/70 text-white text-xs rounded-full backdrop-blur-sm shadow-md flex items-center">
            <Timer className="h-3 w-3 mr-1.5 animate-pulse" /> 
            {(() => {
              const endDiff = Number(campaign.endTime) - now;
              if (endDiff <= 0) return "Ending soon";
              
              const days = Math.floor(endDiff / 86400);
              const hours = Math.floor((endDiff % 86400) / 3600);
              
              return `${days}d ${hours}h left`;
            })()}
          </div>
        )}
        
        {hasEnded && (
          <div className="absolute bottom-16 left-4 px-3 py-1.5 bg-gray-500/70 text-white text-xs rounded-full backdrop-blur-sm shadow-md flex items-center">
            <CheckCircle className="h-3 w-3 mr-1.5" /> Ended
          </div>
        )}
      </div>
      
      <div className="p-4 relative">
        <p className="text-gray-600 text-xs sm:text-sm mb-4 line-clamp-2">{campaign.metadata.tagline || campaign.metadata.bio || campaign.description}</p>
        
        {/* Campaign Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Coins className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Funding</span>
            </div>
            <p className="font-bold text-green-600 text-lg">
              {parseFloat(formatEther(campaign.totalFunds)).toFixed(1)}
            </p>
            <p className="text-xs text-green-700">CELO</p>
          </div>
          <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Award className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Winners</span>
            </div>
            <p className="font-bold text-purple-600 text-lg">
              {campaign.maxWinners > 0n ? campaign.maxWinners.toString() : '∞'}
            </p>
            <p className="text-xs text-purple-700">Max</p>
          </div>
        </div>

        {/* Campaign Timeline */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>
              {new Date(Number(campaign.startTime) * 1000).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })} - {new Date(Number(campaign.endTime) * 1000).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>
              {campaign.useQuadraticDistribution ? 'Quadratic' : 
               campaign.useCustomDistribution ? 'Custom' : 'Linear'}
            </span>
          </div>
        </div>

        {/* Tags */}
        {campaign.metadata.tags && campaign.metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {campaign.metadata.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-lg"
              >
                #{tag}
              </span>
            ))}
            {campaign.metadata.tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg">
                +{campaign.metadata.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Action Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {campaign.status === 'active' && <PlayCircle className="h-4 w-4 text-green-500" />}
            {campaign.status === 'upcoming' && <Timer className="h-4 w-4 text-blue-500" />}
            {campaign.status === 'ended' && <CheckCircle className="h-4 w-4 text-gray-500" />}
            {campaign.status === 'paused' && <Timer className="h-4 w-4 text-gray-500" />}
            <span>
              {campaign.status === 'active' && 'Join Campaign'}
              {campaign.status === 'upcoming' && 'Coming Soon'}
              {campaign.status === 'ended' && 'View Results'}
              {campaign.status === 'paused' && 'Campaign Paused'}
            </span>
          </div>
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md transform group-hover:rotate-45 transition-transform duration-500">
            <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </div>
        </div>
        
        {/* Voting tokens for this campaign */}
        <div className="flex -space-x-1.5 mt-4">
          <div className="w-6 h-6 rounded-full bg-green-100 ring-2 ring-white flex items-center justify-center text-green-500 text-xs font-bold">C</div>
          <div className="w-6 h-6 rounded-full bg-blue-100 ring-2 ring-white flex items-center justify-center text-blue-500 text-xs font-bold">$</div>
        </div>
      </div>
    </div>
  );
};

export default function CampaignsPage() {
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [processedCampaigns, setProcessedCampaigns] = useState<EnhancedCampaign[]>([]);

  // Get campaigns data
  const { campaigns, isLoading, error } = useAllCampaigns(CONTRACT_ADDRESS);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Process campaigns data
  useEffect(() => {
    if (!campaigns) return;

    const enhanced = campaigns.map(campaignDetails => {
      const parsedMetadata = parseCampaignMetadata(campaignDetails);
      const status = getCampaignStatus(campaignDetails.campaign);
      
      return {
        id: campaignDetails.campaign.id,
        admin: campaignDetails.campaign.admin,
        name: campaignDetails.campaign.name,
        description: campaignDetails.campaign.description,
        startTime: campaignDetails.campaign.startTime,
        endTime: campaignDetails.campaign.endTime,
        adminFeePercentage: campaignDetails.campaign.adminFeePercentage,
        maxWinners: campaignDetails.campaign.maxWinners,
        useQuadraticDistribution: campaignDetails.campaign.useQuadraticDistribution,
        useCustomDistribution: campaignDetails.campaign.useCustomDistribution,
        payoutToken: campaignDetails.campaign.payoutToken,
        active: campaignDetails.campaign.active,
        totalFunds: campaignDetails.campaign.totalFunds,
        status,
        metadata: parsedMetadata
      } as EnhancedCampaign;
    });

    // Apply filters and sorting
    let filtered = [...enhanced];

    // Search filter
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(campaign => 
        campaign.name.toLowerCase().includes(query) ||
        campaign.description.toLowerCase().includes(query) ||
        (campaign.metadata.bio && campaign.metadata.bio.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return Number(b.startTime) - Number(a.startTime);
        case 'oldest':
          return Number(a.startTime) - Number(b.startTime);
        case 'funds':
          return Number(b.totalFunds) - Number(a.totalFunds);
        case 'participants':
          return Number(b.maxWinners) - Number(a.maxWinners);
        default:
          return 0;
      }
    });

    setProcessedCampaigns(filtered);
  }, [campaigns, searchTerm, statusFilter, sortBy]);

  if (!isMounted) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-blue-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md mx-auto border border-red-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">Unable to Load Campaigns</h2>
            <p className="text-gray-600 mb-6">{error.message || 'Something went wrong'}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-blue-50 to-cyan-50 transition-all duration-300">
      {/* Floating particles background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-gradient-to-r from-blue-400/10 to-indigo-400/10 animate-float-slower blur-2xl"></div>
        <div className="absolute top-1/2 right-1/5 w-48 h-48 rounded-full bg-gradient-to-r from-cyan-400/10 to-blue-400/10 animate-float-slow blur-2xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-40 h-40 rounded-full bg-gradient-to-r from-indigo-400/10 to-purple-400/10 animate-float blur-2xl"></div>
        <div className="absolute top-1/3 right-1/4 w-36 h-36 rounded-full bg-gradient-to-r from-purple-400/10 to-pink-400/10 animate-float-delay-3 blur-2xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
      

        {/* Search and Filter Section */}
        <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/30 shadow-lg">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/90 backdrop-blur-sm border border-white/30 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-900 placeholder-gray-500 shadow-sm"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 rounded-xl bg-white/90 backdrop-blur-sm border border-white/30 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-900 shadow-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="upcoming">Upcoming</option>
                <option value="ended">Ended</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 rounded-xl bg-white/90 backdrop-blur-sm border border-white/30 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-900 shadow-sm"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="funds">Most Funded</option>
                <option value="participants">Most Participants</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            {isLoading ? 'Loading campaigns...' : `${processedCampaigns.length} campaigns found`}
          </p>
        </div>

        {/* Campaigns Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-6 bg-gray-200 rounded-lg w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded-lg w-1/2 mb-6"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded-lg"></div>
                  <div className="h-4 bg-gray-200 rounded-lg w-5/6"></div>
                </div>
              </div>
            ))}
          </div>
        ) : processedCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processedCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id.toString()} campaign={campaign} />
            ))}
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 sm:p-8 text-center border border-blue-100 shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-100/50 via-transparent to-indigo-100/50"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 mb-4 text-white">
                <Trophy className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">No Campaigns Found</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto text-sm sm:text-base">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No campaigns match your current filters. Try adjusting your search criteria.'
                  : 'Be the first to start a funding campaign and shape the future of blockchain innovation!'
                }
              </p>
              {searchTerm || statusFilter !== 'all' ? (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  className="px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl transition-all inline-flex items-center group relative overflow-hidden"
                >
                  Clear Filters
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                </button>
              ) : (
                <button
                  onClick={() => navigate('/app/campaigns/start')}
                  className="px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium hover:shadow-xl transition-all inline-flex items-center group relative overflow-hidden"
                >
                  <Trophy className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                  Start Campaign
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}