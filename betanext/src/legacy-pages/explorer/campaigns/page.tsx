import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from '@/utils/nextAdapter';
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
import { ButtonCool } from '@/components/ui/button-cool';

// Get contract address from environment
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_V4 as Address;

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

  // Get campaigns data
  const { campaigns, isLoading, error } = useAllCampaigns(CONTRACT_ADDRESS);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Process campaigns data using useMemo to prevent infinite loops
  const processedCampaigns = useMemo(() => {
    if (!campaigns) return [];

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

    return filtered;
  }, [campaigns, searchTerm]);

  if (!isMounted) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-blue-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="group relative w-full max-w-[22em]">
          {/* Pattern Overlays */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
              backgroundSize: '0.5em 0.5em'
            }}
          />
          
          {/* Main Card */}
          <div 
            className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2]"
            style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
          >
            {/* Accent Corner */}
            <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#ef4444] rotate-45 z-[1]" />
            <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">⚠</div>

            {/* Title Area */}
            <div 
              className="relative px-[1.4em] py-[1.4em] text-white font-extrabold text-center border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
              style={{ 
                background: '#ef4444',
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
                backgroundBlendMode: 'overlay'
              }}
            >
              <span className="text-[1.2em]">Unable to Load Campaigns</span>
            </div>

            {/* Body */}
            <div className="relative px-[1.5em] py-[1.5em] z-[2] text-center">
              <div className="w-16 h-16 bg-red-100 border-[0.15em] border-[#050505] rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0.2em_0.2em_0_#000000]">
                <AlertTriangle className="h-8 w-8 text-[#ef4444]" />
              </div>
              <p className="text-[#050505] text-[0.95em] leading-[1.4] font-medium mb-6">{error.message || 'Something went wrong'}</p>
              <ButtonCool
                onClick={() => window.location.reload()}
                text="Try Again"
                bgColor="#ef4444"
                hoverBgColor="#dc2626"
                borderColor="#050505"
                textColor="#ffffff"
                size="md"
              />
            </div>

            {/* Corner Slice */}
            <div className="absolute bottom-0 left-0 w-[1.5em] h-[1.5em] bg-white border-r-[0.25em] border-t-[0.25em] border-[#050505] rounded-tl-[0.5em] z-[1]" />
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
        url: typeof window !== 'undefined' ? window.location.href : '',
        type: 'website'
      }}
    />
    
    <div className="min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Input */}
        <div className="mb-8 flex justify-end">
          <div className="flex items-center gap-2">
            <div className="relative group">
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-4 pr-12 py-2 w-64 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:outline-none focus:shadow-[0.4em_0.4em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] transition-all duration-200 text-sm font-medium text-[#050505] placeholder:text-gray-400"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <Search className="h-4 w-4 text-[#050505]" />
              </div>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <div className="inline-block bg-white border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_#000000] px-[1em] py-[0.5em]">
            <p className="text-[#050505] text-[0.9em] font-bold uppercase tracking-[0.05em]">
              {isLoading ? 'Loading campaigns...' : `${processedCampaigns.length} campaigns found`}
            </p>
          </div>
        </div>

        {/* Campaigns Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 gap-y-12">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="group relative w-full max-w-[22em]">
                <div className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] overflow-hidden animate-pulse">
                  <div className="px-[1.4em] py-[1.4em] bg-[#2563eb] border-b-[0.35em] border-[#050505]">
                    <div className="h-6 bg-blue-300 rounded w-3/4"></div>
                  </div>
                  <div className="px-[1.5em] py-[1.5em]">
                    <div className="h-24 bg-gray-200 rounded-full mb-4 mx-auto w-24"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded"></div>
                    </div>
                  </div>
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
              
              // Ensure campaignId is properly converted to string
              const campaignId = campaign.id?.toString ? campaign.id.toString() : String(campaign.id);
              
              console.log('[CampaignsPage] Rendering campaign card:', { 
                id: campaign.id, 
                campaignId, 
                name: campaign.name 
              });
              
              return (
                <CampaignCard
                  key={campaign.id.toString()}
                  title={campaign.name}
                  description={campaign.metadata.tagline || campaign.metadata.bio || campaign.description}
                  logo={logo}
                  status={campaign.status}
                  className="border-blue-300"
                  campaignId={campaignId}
                  descriptionTruncateSize={96}
                  startTime={Number(campaign.startTime)}
                  endTime={Number(campaign.endTime)}
                  totalFunds={campaign.totalFunds}
                  maxWinners={campaign.maxWinners}
                  totalVotes={0} // TODO: Fetch actual vote counts
                  projectCount={0} // TODO: Fetch actual project counts
                />
              );
            })}
          </div>
        ) : (
          <div className="group relative w-full max-w-[22em] mx-auto">
            {/* Pattern Overlays */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
              style={{
                backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                backgroundSize: '0.5em 0.5em'
              }}
            />
            
            {/* Main Card */}
            <div 
              className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2] group-hover:shadow-[1em_1em_0_#000000] group-hover:-translate-x-[0.4em] group-hover:-translate-y-[0.4em] group-hover:scale-[1.02]"
              style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
            >
              {/* Accent Corner */}
              <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#00e0b0] rotate-45 z-[1]" />
              <div className="absolute top-[0.4em] right-[0.4em] text-[#050505] text-[1.2em] font-bold z-[2]">★</div>

              {/* Title Area */}
              <div 
                className="relative px-[1.4em] py-[1.4em] text-white font-extrabold text-center border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
                style={{ 
                  background: '#2563eb',
                  backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
                  backgroundBlendMode: 'overlay'
                }}
              >
                <span className="text-[1.2em]">No Campaigns Found</span>
              </div>

              {/* Body */}
              <div className="relative px-[1.5em] py-[1.5em] z-[2] text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 bg-[#2563eb] border-[0.15em] border-[#050505] rounded-full mb-4 shadow-[0.2em_0.2em_0_#000000]">
                  <Trophy className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-[1.1em] font-bold text-[#050505] mb-2">No Campaigns Found</h3>
                <p className="text-[#050505] text-[0.9em] leading-[1.4] font-medium mb-6 max-w-md mx-auto">
                  {searchTerm 
                    ? 'No campaigns match your search criteria. Try adjusting your search terms.'
                    : 'Be the first to start a funding campaign and shape the future of blockchain innovation!'
                  }
                </p>
                {searchTerm ? (
                  <ButtonCool
                    onClick={() => setSearchTerm('')}
                    text="Clear Search"
                    bgColor="#2563eb"
                    hoverBgColor="#1d4ed8"
                    borderColor="#050505"
                    textColor="#ffffff"
                    size="md"
                  />
                ) : (
                  <ButtonCool
                    onClick={() => navigate('/app/campaign/start')}
                    text="Start Campaign"
                    bgColor="#2563eb"
                    hoverBgColor="#1d4ed8"
                    borderColor="#050505"
                    textColor="#ffffff"
                    size="md"
                  >
                    <Trophy className="w-4 h-4" />
                  </ButtonCool>
                )}
              </div>

              {/* Corner Slice */}
              <div className="absolute bottom-0 left-0 w-[1.5em] h-[1.5em] bg-white border-r-[0.25em] border-t-[0.25em] border-[#050505] rounded-tl-[0.5em] z-[1]" />
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}