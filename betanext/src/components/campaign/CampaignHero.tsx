'use client';

import React from 'react';
import Image from 'next/image';
import { Trophy, Target, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { ipfsImageLoader } from '@/utils/imageUtils';
import TruncatedText from '@/components/TruncatedText';
import { ButtonCool } from '@/components/ui/button-cool';

interface CampaignHeroProps {
  campaign: {
    name: string;
    description: string;
    maxWinners: bigint;
    useQuadraticDistribution: boolean;
  };
  campaignLogoSrc: string | null;
  countdown: {
    days: number;
    hours: number;
    minutes: number;
    phase: 'preparing' | 'active' | 'ended' | 'loading';
  };
  hasEnded: boolean;
  isAdmin: boolean;
  onAdminClick: () => void;
  onImageError: (src: string) => void;
}

export const CampaignHero: React.FC<CampaignHeroProps> = ({
  campaign,
  campaignLogoSrc,
  countdown,
  hasEnded,
  isAdmin,
  onAdminClick,
  onImageError,
}) => {
  return (
    <div className="group relative w-full">
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
          className="relative px-[1em] py-[0.8em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
          style={{ 
            background: '#2563eb',
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
            backgroundBlendMode: 'overlay'
          }}
        >
          <div className="flex items-center space-x-3">
            {/* Campaign Logo */}
            <div className="relative w-12 h-12 flex-shrink-0 border-[0.25em] border-white rounded-full shadow-[0.25em_0.25em_0_#000000] overflow-hidden">
              {campaignLogoSrc ? (
                <Image
                  loader={ipfsImageLoader}
                  src={campaignLogoSrc}
                  alt={`${campaign.name} logo`}
                  fill
                  className="object-cover"
                  sizes="48px"
                  unoptimized
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    onImageError(target.src);
                  }}
                />
              ) : (
                <div className="w-full h-full bg-white flex items-center justify-center text-[#2563eb] text-xl font-bold">
                  {campaign.name?.charAt(0) || '🚀'}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-base lg:text-lg font-extrabold text-white break-words"
                style={{ lineHeight: '1.2' }}
              >
                {campaign.name || 'Untitled Campaign'}
              </motion.h1>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="relative px-[1.2em] py-[1em] z-[2]">
          {/* Description - Compact */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-3"
          >
            <TruncatedText
              text={campaign.description || 'A sovereign funding campaign for innovative projects.'}
              maxLength={120}
              className="text-[#050505] text-[0.8em] leading-[1.3] font-medium"
              showIcon={true}
              expandText="Read more"
              collapseText="Show less"
            />
          </motion.div>

          {/* Campaign Details - Compact */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex items-center gap-[0.5em]">
              <div className="w-[1.2em] h-[1.2em] flex items-center justify-center bg-[#2563eb] border-[0.12em] border-[#050505] rounded-[0.3em] shadow-[0.15em_0.15em_0_rgba(0,0,0,0.2)]">
                <Trophy className="w-[0.8em] h-[0.8em] text-white" />
              </div>
              <span className="text-[0.75em] font-semibold text-[#050505]">
                Winners: <span className="font-bold">{Number(campaign.maxWinners) || 'All'}</span>
              </span>
            </div>
            <div className="flex items-center gap-[0.5em]">
              <div className="w-[1.2em] h-[1.2em] flex items-center justify-center bg-[#2563eb] border-[0.12em] border-[#050505] rounded-[0.3em] shadow-[0.15em_0.15em_0_rgba(0,0,0,0.2)]">
                <Target className="w-[0.8em] h-[0.8em] text-white" />
              </div>
              <span className="text-[0.75em] font-semibold text-[#050505]">
                {campaign.useQuadraticDistribution ? 'Quadratic' : 'Linear'}
              </span>
            </div>
          </div>

          {/* Admin Button & Countdown Row */}
          {(isAdmin || !hasEnded) && (
            <div className="flex items-center justify-between gap-2">
              {isAdmin && (
                <ButtonCool
                  onClick={onAdminClick}
                  text="Admin"
                  bgColor="#2563eb"
                  hoverBgColor="#1d4ed8"
                  borderColor="#050505"
                  textColor="#ffffff"
                  size="sm"
                >
                  <Settings className="w-3 h-3" />
                </ButtonCool>
              )}
              
              {/* Countdown - Compact */}
              {!hasEnded && (
                <div className={`p-2 bg-[#dbeafe] border-[0.15em] border-[#2563eb] rounded-[0.4em] shadow-[0.15em_0.15em_0_#000000] ${isAdmin ? 'flex-1' : 'w-full'}`}>
                  <div className="text-[1.1em] font-extrabold text-[#2563eb] tracking-tight text-center">
                    {countdown.days}d {countdown.hours}h {countdown.minutes}m
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
