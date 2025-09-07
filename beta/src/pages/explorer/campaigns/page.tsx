import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search,
  Trophy,
  AlertTriangle,
} from 'lucide-react';
import { useAllCampaigns } from '@/hooks/useCampaignMethods';
import { type Address } from 'viem';
import { formatIpfsUrl } from '@/utils/imageUtils';
import CampaignCard from '@/components/cards/CampaignCard';
import DynamicHelmet from '@/components/DynamicHelmet';

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


export default function CampaignsPage() {
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

    // Apply search filter only
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

    // Sort by newest (default)
    filtered.sort((a, b) => {
      return Number(b.startTime) - Number(a.startTime);
    });

    setProcessedCampaigns(filtered);
  }, [campaigns, searchTerm]);

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
    <>
    {/* Dynamic Metadata */}
    <DynamicHelmet 
      config={{
        title: 'Campaigns',
        description: 'Explore funding campaigns on Sov Seas - Support innovative projects through community voting',
        image: '/og-image.png',
        url: window.location.href,
        type: 'website'
      }}
    />
    
    <div className="min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Input */}
        <div className="mb-8 flex justify-end">
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-4 pr-12 py-2 w-64 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
              />
              <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <Search className="h-4 w-4" />
              </button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 gap-y-12">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 gap-y-12">
            {processedCampaigns.map((campaign) => {
              let logo;
              try {
                logo = campaign.metadata.logo;
                if (logo) logo = formatIpfsUrl(logo);
              } catch {
                logo = undefined;
              }
              
              return (
                <CampaignCard
                  key={campaign.id.toString()}
                  title={campaign.name}
                  description={campaign.metadata.tagline || campaign.metadata.bio || campaign.description}
                  logo={logo}
                  status={campaign.status}
                  className="border-blue-300 scale-75"
                  campaignId={campaign.id.toString()}
                  descriptionTruncateSize={96}
                  startTime={Number(campaign.startTime)}
                  endTime={Number(campaign.endTime)}
                />
              );
            })}
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
                {searchTerm 
                  ? 'No campaigns match your search criteria. Try adjusting your search terms.'
                  : 'Be the first to start a funding campaign and shape the future of blockchain innovation!'
                }
              </p>
              {searchTerm ? (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl transition-all inline-flex items-center group relative overflow-hidden"
                >
                  Clear Search
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
    </>
  );
}