'use client';

import { Trophy } from 'lucide-react';
import { ButtonCool } from '@/components/ui/button-cool';
import { ProfileCampaignCard } from './ProfileCampaignCard';

interface Campaign {
  id: bigint;
  name: string;
  description: string;
  active: boolean;
  startTime?: bigint;
  endTime?: bigint;
  totalFunds?: bigint;
  maxWinners?: bigint;
  metadata?: any;
}

interface CampaignsTabProps {
  userCampaigns: Campaign[];
  navigate: (path: string) => void;
  getCampaignRoute: (id: number) => string;
}

export const CampaignsTab = ({
  userCampaigns,
  navigate,
  getCampaignRoute
}: CampaignsTabProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {userCampaigns.map((campaign) => (
          <ProfileCampaignCard
            key={campaign.id.toString()}
            campaign={campaign}
            onClick={() => navigate(getCampaignRoute(Number(campaign.id)))}
          />
        ))}
        
        {userCampaigns.length === 0 && (
          <div className="col-span-full group relative w-full">
            <div 
              className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
              style={{
                backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                backgroundSize: '0.5em 0.5em'
              }}
            />
            
            <div 
              className="relative bg-white border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2] text-center py-8"
              style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
            >
              <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
              <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
              
              <div className="relative z-[2]">
                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-extrabold text-[#050505] mb-2 uppercase tracking-[0.05em]">No Campaigns Found</h3>
                <p className="text-gray-600 mb-4 text-sm font-semibold">You haven't created any campaigns yet.</p>
                <ButtonCool
                  onClick={() => navigate('/app/campaign/start')}
                  text="Launch Campaign"
                  bgColor="#2563eb"
                  hoverBgColor="#1d4ed8"
                  textColor="#ffffff"
                  borderColor="#050505"
                  size="md"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

