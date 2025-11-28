'use client';

import { ExternalLink } from 'lucide-react';
import { formatIpfsUrl } from '@/utils/imageUtils';

interface ProfileCampaignCardProps {
  campaign: {
    name: string;
    description: string;
    active: boolean;
    startTime?: bigint;
    endTime?: bigint;
    totalFunds?: bigint;
    maxWinners?: bigint;
    metadata?: {
      logo?: string;
      coverImage?: string;
      [key: string]: any;
    };
  };
  onClick: () => void;
}

export const ProfileCampaignCard = ({ campaign, onClick }: ProfileCampaignCardProps) => {
  const campaignLogo = campaign.metadata?.logo || campaign.metadata?.coverImage || null;
  
  const getStatusInfo = () => {
    if (!campaign.startTime || !campaign.endTime) {
      return campaign.active 
        ? { text: 'Active', color: '#10b981', bgColor: '#d1fae5' }
        : { text: 'Ended', color: '#6b7280', bgColor: '#f3f4f6' };
    }
    
    const now = Math.floor(Date.now() / 1000);
    const hasStarted = now >= Number(campaign.startTime);
    const hasEnded = now >= Number(campaign.endTime);
    
    if (hasEnded) {
      return { text: 'Ended', color: '#6b7280', bgColor: '#f3f4f6' };
    }
    if (!hasStarted) {
      return { text: 'Coming Soon', color: '#3b82f6', bgColor: '#dbeafe' };
    }
    return { text: 'Active', color: '#10b981', bgColor: '#d1fae5' };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="group relative w-full">
      <div 
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
          backgroundSize: '0.5em 0.5em'
        }}
      />
      
      <div 
        className="relative bg-white border-[0.3em] border-[#2563eb] rounded-[0.5em] shadow-[0.5em_0.5em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2] group-hover:shadow-[0.6em_0.6em_0_#000000] group-hover:-translate-x-[0.2em] group-hover:-translate-y-[0.2em] cursor-pointer"
        onClick={onClick}
        style={{ boxShadow: 'inset 0 0 0 0.1em rgba(0, 0, 0, 0.05)' }}
      >
        <div className="absolute -top-[0.8em] -right-[0.8em] w-[3em] h-[3em] bg-[#2563eb] rotate-45 z-[1]" />
        <div className="absolute top-[0.3em] right-[0.3em] text-white text-[1em] font-bold z-[2]">★</div>
        
        <div className="relative px-4 py-4 z-[2]">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              {campaignLogo ? (
                <img
                  src={formatIpfsUrl(campaignLogo)}
                  alt={`${campaign.name} logo`}
                  className="w-12 h-12 rounded-[0.3em] object-cover border-[0.15em] border-[#050505]"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div 
                  className="w-12 h-12 bg-[#2563eb] rounded-[0.3em] flex items-center justify-center text-white text-lg font-bold border-[0.15em] border-[#050505]"
                >
                  {campaign.name?.charAt(0)}
                </div>
              )}
              <div>
                <h3 className="font-extrabold text-[#050505] text-lg mb-1">
                  {campaign.name}
                </h3>
                <div 
                  className={`inline-flex px-2 py-1 rounded-[0.3em] text-xs font-bold border-[0.15em]`}
                  style={{
                    color: statusInfo.color,
                    backgroundColor: statusInfo.bgColor,
                    borderColor: statusInfo.color
                  }}
                >
                  {statusInfo.text}
                </div>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-[#050505]" />
          </div>
          
          <p className="text-[#050505] text-sm mb-4 line-clamp-3 leading-relaxed font-semibold">{campaign.description}</p>
          
          <div className="flex items-center justify-between text-sm text-[#050505] mb-4 font-bold">
            {campaign.totalFunds && (
              <span>Funds: {Number(campaign.totalFunds) / 1e18} CELO</span>
            )}
            {campaign.maxWinners && (
              <span>{Number(campaign.maxWinners)} winners</span>
            )}
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="w-full px-4 py-3 bg-[#2563eb] text-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all text-sm font-extrabold uppercase tracking-[0.05em]"
          >
            View Campaign
          </button>
        </div>
      </div>
    </div>
  );
};

