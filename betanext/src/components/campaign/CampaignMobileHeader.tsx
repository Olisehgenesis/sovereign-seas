'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Plus, Menu, Settings } from 'lucide-react';
import { ipfsImageLoader } from '@/utils/imageUtils';
import { ButtonCool } from '@/components/ui/button-cool';

interface CampaignMobileHeaderProps {
  campaignName: string;
  campaignLogoSrc: string | null;
  countdownPhase: 'preparing' | 'active' | 'ended' | 'loading';
  totalCampaignVotes: number;
  isAdmin: boolean;
  onImageError: (src: string) => void;
  onAddProject: () => void;
  onMenuClick: () => void;
  onAdminClick: () => void;
}

export const CampaignMobileHeader: React.FC<CampaignMobileHeaderProps> = ({
  campaignName,
  campaignLogoSrc,
  countdownPhase,
  totalCampaignVotes,
  isAdmin,
  onImageError,
  onAddProject,
  onMenuClick,
  onAdminClick,
}) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="bg-white border-t-[0.35em] border-[#050505] rounded-t-[0.6em] shadow-[0_-0.7em_0_#000000]"
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-12 h-1 bg-[#050505] rounded-full"></div>
        </div>
        
        {/* Campaign Info */}
        <div className="px-4 pb-3">
          <div className="flex items-center space-x-3 mb-3">
            {/* Campaign Logo */}
            <div className="w-10 h-10 rounded-full overflow-hidden border-[0.2em] border-[#050505] shadow-[0.2em_0.2em_0_#000000] flex-shrink-0 relative bg-white">
              {campaignLogoSrc ? (
                <Image
                  loader={ipfsImageLoader}
                  src={campaignLogoSrc}
                  alt={`${campaignName} logo`}
                  fill
                  className="object-cover"
                  sizes="40px"
                  unoptimized
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    onImageError(target.src);
                  }}
                />
              ) : (
                <div className="w-full h-full bg-[#2563eb] flex items-center justify-center text-white text-xs font-bold">
                  {campaignName?.charAt(0) || '🚀'}
                </div>
              )}
            </div>
            
            {/* Campaign Name and Status */}
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-extrabold text-[#050505] truncate uppercase tracking-[0.05em]">
                {campaignName || 'Untitled Campaign'}
              </h1>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`bg-white text-[#050505] text-[0.6em] font-extrabold px-[0.6em] py-[0.3em] border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.15em_0.15em_0_#000000] uppercase tracking-[0.1em] ${
                  countdownPhase === 'active' ? 'bg-[#10b981] text-white' : 
                  countdownPhase === 'ended' ? 'bg-[#6b7280] text-white' : 
                  'bg-[#f59e0b] text-white'
                }`}>
                  {countdownPhase === 'ended' ? 'Ended' : 
                   countdownPhase === 'active' ? 'Live' : 
                   'Starting Soon'}
                </span>
                <span className="text-[0.7em] font-bold text-[#050505]">
                  {totalCampaignVotes.toFixed(1)} votes
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <ButtonCool
              onClick={onAddProject}
              text="Add"
              bgColor="#2563eb"
              hoverBgColor="#1d4ed8"
              borderColor="#050505"
              textColor="#ffffff"
              size="sm"
            >
              <Plus className="w-3 h-3" />
            </ButtonCool>

            <ButtonCool
              onClick={onMenuClick}
              text="Menu"
              bgColor="#6b7280"
              hoverBgColor="#4b5563"
              borderColor="#050505"
              textColor="#ffffff"
              size="sm"
            >
              <Menu className="w-3 h-3" />
            </ButtonCool>

            {isAdmin && (
              <ButtonCool
                onClick={onAdminClick}
                text="Admin"
                bgColor="#a855f7"
                hoverBgColor="#9333ea"
                borderColor="#050505"
                textColor="#ffffff"
                size="sm"
              >
                <Settings className="w-3 h-3" />
              </ButtonCool>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

