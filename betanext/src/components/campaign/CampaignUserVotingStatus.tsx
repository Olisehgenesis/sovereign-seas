'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { CalendarClock } from 'lucide-react';
import { formatEther } from 'viem';

interface CampaignUserVotingStatusProps {
  totalVotes: bigint;
  totalCampaignVotes: number;
}

export const CampaignUserVotingStatus: React.FC<CampaignUserVotingStatusProps> = ({
  totalVotes,
  totalCampaignVotes,
}) => {
  const userVotes = Number(formatEther(totalVotes));
  const contributionPercentage = totalCampaignVotes > 0 
    ? ((userVotes / totalCampaignVotes) * 100).toFixed(1) 
    : '0.0';

  if (userVotes <= 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="group relative w-full mt-4"
    >
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
        <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#10b981] rotate-45 z-[1]" />
        <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>

        {/* Title Area */}
        <div 
          className="relative px-[1em] py-[0.6em] text-white font-extrabold text-center border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
          style={{ 
            background: '#10b981',
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
            backgroundBlendMode: 'overlay'
          }}
        >
          <span className="text-[0.75em] flex items-center justify-center gap-1.5">
            <CalendarClock className="h-3 w-3" />
            Your Votes
          </span>
        </div>

        {/* Body */}
        <div className="relative px-[1.2em] py-[1em] z-[2]">
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="text-center">
              <p className="text-[1em] font-extrabold text-[#050505] mb-0.5">
                {userVotes.toFixed(1)} Votes
              </p>
              <p className="text-[0.7em] font-semibold text-[#050505]/70">
                {contributionPercentage}% of total
              </p>
            </div>
            
            {/* Token Logos - Compact */}
            <div className="flex items-center justify-center gap-2 mt-1">
              <div className="w-8 h-8 rounded-full border-[0.12em] border-[#050505] flex items-center justify-center overflow-hidden bg-white shadow-[0.15em_0.15em_0_rgba(0,0,0,0.2)]">
                <Image 
                  src="/images/cusd.png" 
                  alt="cUSD" 
                  width={24}
                  height={24}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-8 h-8 rounded-full border-[0.12em] border-[#050505] flex items-center justify-center overflow-hidden bg-white shadow-[0.15em_0.15em_0_rgba(0,0,0,0.2)]">
                <Image 
                  src="/images/celo.png" 
                  alt="CELO" 
                  width={24}
                  height={24}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-8 h-8 rounded-full border-[0.12em] border-[#050505] flex items-center justify-center overflow-hidden bg-white shadow-[0.15em_0.15em_0_rgba(0,0,0,0.2)]">
                <Image 
                  src="/images/good.png" 
                  alt="Good Dollar" 
                  width={24}
                  height={24}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Corner Slice */}
        <div className="absolute bottom-0 left-0 w-[1.5em] h-[1.5em] bg-white border-r-[0.25em] border-t-[0.25em] border-[#050505] rounded-tl-[0.5em] z-[1]" />
      </div>
    </motion.div>
  );
};

