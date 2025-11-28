'use client';

import { useNavigate } from '@/utils/nextAdapter';
import { getCampaignRoute } from '@/utils/hashids';
import { formatEther } from 'viem';
import { Trophy, Search } from 'lucide-react';
import CampaignCard from '@/components/cards/CampaignCard';
import { formatIpfsUrl } from '@/utils/imageUtils';
import { useCampaignMetadata } from '@/hooks/useCampaignMethods';
import type { Address } from 'viem';

interface Campaign {
  id: bigint;
  name: string;
  description: string;
  startTime: bigint;
  endTime: bigint;
  active: boolean;
  totalFunds: bigint;
  maxWinners: bigint;
  participation?: {
    voteCount: bigint;
    fundsReceived: bigint;
  };
}

interface CampaignsTabProps {
  campaigns: (Campaign | null)[];
  contractAddress: Address;
}

export default function CampaignsTab({ campaigns, contractAddress }: CampaignsTabProps) {
  const navigate = useNavigate();
  const validCampaigns = campaigns.filter((c): c is Campaign => c !== null);

  const getCampaignStatus = (campaign: Campaign): 'upcoming' | 'active' | 'ended' | 'paused' => {
    const now = Math.floor(Date.now() / 1000);
    const start = Number(campaign.startTime);
    const end = Number(campaign.endTime);
    if (!campaign.active) return 'paused';
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'active';
    return 'ended';
  };

  if (validCampaigns.length === 0) {
    return (
      <div className="group relative">
        <div 
          className="hidden sm:block absolute inset-0 pointer-events-none opacity-30 z-[1]"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
            backgroundSize: '0.5em 0.5em'
          }}
        />
        <div className="hidden sm:block absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#a855f7] rotate-45 z-[1]" />
        <div className="hidden sm:block absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
        <div className="relative bg-white sm:border-[0.35em] sm:border-[#a855f7] sm:rounded-[0.6em] sm:shadow-[0.5em_0.5em_0_#000000] sm:p-12 text-center p-6 z-[2]">
          <div className="w-16 h-16 sm:w-24 sm:h-24 bg-[#a855f7]/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 border-[0.2em] border-[#a855f7]">
            <Trophy className="h-8 w-8 sm:h-12 sm:w-12 text-[#a855f7]" />
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-[#050505] mb-2 sm:mb-3 uppercase tracking-[0.05em]">No Active Campaigns</h3>
          <p className="text-[#050505] mb-4 sm:mb-6 max-w-md mx-auto text-sm sm:text-base font-semibold">
            This project hasn't joined any campaigns yet. Check back later for funding opportunities.
          </p>
          <button
            onClick={() => navigate('/explorer/campaigns')}
            className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-[#2563eb] text-white border-[0.2em] border-[#050505] rounded-[0.4em] font-extrabold shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all uppercase tracking-[0.05em]"
          >
            <Search className="h-4 w-4" />
            Browse Campaigns
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <div 
        className="hidden sm:block absolute inset-0 pointer-events-none opacity-30 z-[1]"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
          backgroundSize: '0.5em 0.5em'
        }}
      />
      <div className="hidden sm:block absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#10b981] rotate-45 z-[1]" />
      <div className="hidden sm:block absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
      <div className="relative bg-white sm:border-[0.35em] sm:border-[#10b981] sm:rounded-[0.6em] sm:shadow-[0.5em_0.5em_0_#000000] sm:p-8 z-[2]">
        <h2 className="text-2xl font-extrabold text-[#050505] mb-6 uppercase tracking-[0.05em] flex items-center gap-3">
          <Trophy className="h-6 w-6 text-[#10b981]" />
          Project Campaigns ({validCampaigns.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {validCampaigns.map((campaign) => {
            const status = getCampaignStatus(campaign);
            
            return (
              <CampaignCardWithLogo
                key={campaign.id.toString()}
                campaign={campaign}
                status={status}
                contractAddress={contractAddress}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Component to fetch and format campaign logo
function CampaignCardWithLogo({ 
  campaign, 
  status, 
  contractAddress 
}: { 
  campaign: Campaign; 
  status: 'upcoming' | 'active' | 'ended' | 'paused';
  contractAddress: Address;
}) {
  const { metadata, isLoading } = useCampaignMetadata(contractAddress, campaign.id);

  let logo: string | undefined;
  
  if (!isLoading && metadata) {
    try {
      if (metadata.mainInfo) {
        const mainInfo = JSON.parse(metadata.mainInfo);
        if (mainInfo.logo) logo = formatIpfsUrl(mainInfo.logo);
      }
      
      if (!logo && metadata.additionalInfo) {
        const additionalInfo = JSON.parse(metadata.additionalInfo);
        if (additionalInfo.logo) logo = formatIpfsUrl(additionalInfo.logo);
        if (!logo && additionalInfo.media?.logo) logo = formatIpfsUrl(additionalInfo.media.logo);
      }
    } catch (e) {
      console.warn('Failed to parse campaign logo:', e);
    }
  }

  return (
    <CampaignCard
      title={campaign.name}
      description={campaign.description || 'No description available'}
      logo={logo}
      status={status}
      campaignId={campaign.id?.toString()}
      startTime={Number(campaign.startTime)}
      endTime={Number(campaign.endTime)}
      totalFunds={campaign.totalFunds}
      maxWinners={campaign.maxWinners}
      totalVotes={parseFloat(formatEther(campaign.participation?.voteCount || 0n))}
    />
  );
}

