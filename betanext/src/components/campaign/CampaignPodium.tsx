'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Rocket } from 'lucide-react';
import { formatEther } from 'viem';
import { ipfsImageLoader } from '@/utils/imageUtils';

interface Project {
  id: string | number | bigint;
  name?: string;
  voteCount: bigint;
  participation?: {
    approved: boolean;
    voteCount: bigint;
    fundsReceived: bigint;
  };
}

interface CampaignPodiumProps {
  projects: Project[];
  campaignTotalFunds?: bigint;
  getProjectLogo: (project: Project) => string | null;
  isActive: boolean;
  onProjectClick: (project: Project) => void;
  isMobile?: boolean;
}

export const CampaignPodium: React.FC<CampaignPodiumProps> = ({
  projects,
  campaignTotalFunds,
  getProjectLogo,
  isActive,
  onProjectClick,
  isMobile = false,
}) => {
  // Only show approved projects in the podium
  const approvedProjects = projects.filter(p => p.participation?.approved === true);
  const topThree = approvedProjects.slice(0, 3);
  // Reorder: 2nd place, 1st place, 3rd place
  const reordered = [topThree[1], topThree[0], topThree[2]].filter(Boolean);

  if (reordered.length === 0) {
    return (
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

          {/* Body */}
          <div className="relative px-[1.5em] py-[1.5em] z-[2] text-center">
            <div className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} rounded-full bg-[#2563eb] border-[0.2em] border-[#050505] flex items-center justify-center mx-auto mb-4 shadow-[0.3em_0.3em_0_#000000]`}>
              <Rocket className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-white`} />
            </div>
            <p className={`${isMobile ? 'text-sm' : 'text-lg'} font-extrabold text-[#050505] mb-2`}>No Projects Yet</p>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-[#050505]/70`}>Projects will appear here once they join the campaign</p>
          </div>

          {/* Corner Slice */}
          <div className="absolute bottom-0 left-0 w-[1.5em] h-[1.5em] bg-white border-r-[0.25em] border-t-[0.25em] border-[#050505] rounded-tl-[0.5em] z-[1]" />
        </div>
      </div>
    );
  }

  // Calculate total weight for quadratic matching
  const totalWeight = projects.reduce((sum, p) => 
    sum + Math.sqrt(Number(formatEther(p.voteCount || 0n))), 0
  );

  return (
    <div className={`flex flex-row items-end justify-center ${isMobile ? 'space-x-4' : 'space-x-8'} ${isMobile ? '-mb-0' : '-mb-6'}`}>
      {reordered.map((project, index) => {
        const voteCount = Number(formatEther(project.voteCount || 0n));
        const projectLogo = getProjectLogo(project);
        const isApproved = project.participation?.approved === true;
        
        // Calculate quadratic matching amount
        const quadraticWeight = Math.sqrt(voteCount);
        const matchingAmount = totalWeight > 0 && campaignTotalFunds ? 
          (quadraticWeight / totalWeight) * Number(formatEther(campaignTotalFunds)) * 0.7 : 0;
        
        // Podium height and styling based on actual rank
        // index 0 = 2nd place, index 1 = 1st place, index 2 = 3rd place
        const actualRank = index === 0 ? 2 : index === 1 ? 1 : 3;
        const podiumHeight = isMobile 
          ? (actualRank === 1 ? 'h-24' : actualRank === 2 ? 'h-20' : 'h-18')
          : (actualRank === 1 ? 'h-40' : actualRank === 2 ? 'h-36' : 'h-32');
        const podiumWidth = isMobile ? 'w-20' : 'w-36';
        
        return (
          <div key={project.id?.toString()} className="flex flex-col items-center">
            {/* Position Badge */}
            <div className={isMobile ? 'mb-1' : 'mb-1.5'}>
              <div className={`${isMobile ? 'w-5 h-5 text-[0.6em]' : 'w-8 h-8 text-xs'} rounded-full flex items-center justify-center font-extrabold text-white border-[0.12em] border-[#050505] shadow-[0.15em_0.15em_0_#000000] ${
                actualRank === 1 ? 'bg-[#2563eb]' :
                actualRank === 2 ? 'bg-[#050505]' :
                'bg-[#6b7280]'
              }`}>
                {actualRank}
              </div>
            </div>

            {/* Project Logo */}
            <div className={`${isMobile ? 'w-10 h-10 mb-1' : 'w-16 h-16 mb-2'} rounded-[0.4em] overflow-hidden border-[0.2em] border-[#050505] shadow-[0.25em_0.25em_0_#000000] relative bg-white`}>
              {projectLogo ? (
                <Image
                  loader={ipfsImageLoader}
                  src={projectLogo}
                  alt={`${project.name} logo`}
                  fill
                  className="object-cover"
                  sizes={isMobile ? '40px' : '80px'}
                  unoptimized
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 ${isMobile ? 'text-sm' : 'text-sm lg:text-lg'} font-bold ${projectLogo ? 'hidden' : 'flex'}`}>
                {project.name?.charAt(0) || '🚀'}
              </div>
            </div>

            {/* Project Name - Desktop only */}
            {!isMobile && (
              <h4 className="font-bold text-black text-xs mb-2 line-clamp-1 text-center max-w-[8em]">
                {project.name || 'Untitled Project'}
              </h4>
            )}

            {/* Podium Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              whileHover={{ scale: 1.02, y: isMobile ? -2 : -4 }}
              className={`relative ${podiumWidth} ${podiumHeight} ${isMobile ? 'rounded-[0.4em]' : 'rounded-t-[0.6em]'} overflow-hidden cursor-pointer border-[0.3em] border-[#050505] bg-white`}
              onClick={() => isApproved && isActive ? onProjectClick(project) : null}
              style={{
                boxShadow: `0.4em 0.4em 0 #000000, inset 0 0 0 0.1em rgba(0, 0, 0, 0.05)`,
              }}
            >
              {/* White Base Shadow - Desktop only */}
              {!isMobile && (
                <div 
                  className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-3/4 h-4 rounded-full opacity-40"
                  style={{
                    background: `linear-gradient(to bottom, 
                      rgba(255, 255, 255, 0.6) 0%, 
                      rgba(255, 255, 255, 0.3) 50%,
                      transparent 100%)`,
                    filter: 'blur(6px)'
                  }}
                />
              )}

              {/* Card Content */}
              <div className={`relative z-10 ${isMobile ? 'p-1.5' : 'p-2'} h-full flex flex-col items-center text-center`}>
                <div className="flex-1 flex flex-col justify-center space-y-1 w-full">
                  {/* Vote Amount */}
                  <div className="text-center">
                    <div className={`${isMobile ? 'text-xs' : 'text-2xl'} font-extrabold text-[#2563eb]`}>
                      {voteCount.toFixed(1)} <span className={`${isMobile ? 'text-[0.6em]' : 'text-xs'} font-bold`}>votes</span>
                    </div>
                  </div>

                  {/* Matching Amount */}
                  <div className="text-center">
                    <div className={`${isMobile ? 'text-[0.65em]' : 'text-sm'} font-extrabold text-[#050505]`}>
                      ~{matchingAmount.toFixed(1)} CELO
                    </div>
                    {!isMobile && (
                      <div className="text-[0.65em] font-semibold text-[#050505]/60 uppercase tracking-[0.05em]">matched</div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
};

