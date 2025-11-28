'use client';

import React from 'react';
import Image from 'next/image';
import { Vote, Clock, XCircle, CheckCircle, MapPin, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatEther } from 'viem';
import { useNavigate } from '@/utils/nextAdapter';
import { getProjectRoute } from '@/utils/hashids';
import { ipfsImageLoader } from '@/utils/imageUtils';
import { capitalizeWords } from '@/utils/textUtils';

interface Project {
  id: string | number | bigint;
  name?: string;
  description?: string;
  voteCount: bigint;
  participation?: {
    approved: boolean;
    voteCount: bigint;
    fundsReceived: bigint;
  };
  location?: string;
  campaignCount?: number;
}

interface CampaignProjectCardProps {
  project: Project;
  position: number;
  votePercentage: number;
  matchingAmount: number;
  isActive: boolean;
  isApproved: boolean;
  getProjectLogo: (project: Project) => string | null;
  onVoteClick: (project: Project) => void;
  className?: string;
}

export const CampaignProjectCard: React.FC<CampaignProjectCardProps> = ({
  project,
  position,
  votePercentage,
  matchingAmount,
  isActive,
  isApproved,
  getProjectLogo,
  onVoteClick,
  className = '',
}) => {
  const navigate = useNavigate();
  const voteCount = Number(formatEther(project.voteCount || 0n));
  const projectLogo = getProjectLogo(project);

  const handleProjectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(getProjectRoute(Number(project.id)));
  };

  return (
    <div className={`group relative w-full max-w-[22em] ${className} cursor-pointer`}>
      {/* Pattern Grid Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
          backgroundSize: '0.5em 0.5em'
        }}
      />
      
      {/* Dots Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-[400ms] z-[1]"
        style={{
          backgroundImage: 'radial-gradient(#cfcfcf 1px, transparent 1px)',
          backgroundSize: '1em 1em',
          backgroundPosition: '-0.5em -0.5em'
        }}
      />

      {/* Main Card */}
      <div 
        className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden origin-center z-[2] group-hover:shadow-[1em_1em_0_#000000] group-hover:-translate-x-[0.4em] group-hover:-translate-y-[0.4em] group-hover:scale-[1.02] active:translate-x-[0.1em] active:translate-y-[0.1em] active:scale-[0.98] active:shadow-[0.5em_0.5em_0_#000000]"
        style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
      >
        {/* Accent Corner - Blue for campaign projects */}
        <div 
          className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#4d61ff] rotate-45 z-[1]"
        />
        <div className="absolute top-[0.4em] right-[0.4em] text-[#050505] text-[1.2em] font-bold z-[2]">★</div>

        {/* Title Area */}
        <div 
          className="relative px-[1.4em] py-[1.4em] text-white font-extrabold flex justify-between items-center border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2] overflow-hidden"
          style={{ 
            background: '#4d61ff',
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
            backgroundBlendMode: 'overlay'
          }}
        >
          <span className="flex-1 pr-2 break-words text-sm lg:text-base">
            {capitalizeWords(project.name || 'Untitled Project')}
          </span>
          <span 
            className="bg-white text-[#050505] text-[0.6em] font-extrabold px-[0.8em] py-[0.4em] border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_#000000] uppercase tracking-[0.1em] rotate-[3deg] transition-all duration-300 group-hover:rotate-[-2deg] group-hover:scale-110 group-hover:shadow-[0.25em_0.25em_0_#000000] flex-shrink-0 ml-2"
          >
            #{position}
          </span>
        </div>

        {/* Card Body */}
        <div className="relative px-[1.5em] py-[1.5em] z-[2]">
          {/* Image Area */}
          <div className="flex justify-center mb-[1.5em] -mt-[2em]">
            <div className="w-[6em] h-[6em] rounded-full border-[0.4em] border-white shadow-[0_0.5em_1em_rgba(0,0,0,0.2),0.3em_0.3em_0_#000000] overflow-hidden bg-[#4d61ff] transition-all duration-300 group-hover:scale-110 group-hover:rotate-[5deg] group-hover:shadow-[0_0.7em_1.5em_rgba(0,0,0,0.3),0.4em_0.4em_0_#000000]">
              {projectLogo ? (
                <Image
                  loader={ipfsImageLoader}
                  src={projectLogo}
                  alt={project.name || 'Project'}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Trophy className="h-12 w-12 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {project.description && (
            <div className="mb-[1.5em] text-[#050505] text-[0.95em] leading-[1.4] font-medium line-clamp-2">
              {project.description}
            </div>
          )}

          {/* Vote Stats */}
          <div className="grid grid-cols-2 gap-[1em] mb-[1.5em]">
            {/* Vote Count */}
            <div className="flex items-center gap-[0.6em] transition-transform duration-200 hover:translate-x-[0.3em]">
              <div className="w-[1.4em] h-[1.4em] flex items-center justify-center bg-[#4d61ff] border-[0.12em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_rgba(0,0,0,0.2)] transition-all duration-200 hover:bg-[#5e70ff] hover:rotate-[-5deg]">
                <Vote className="w-[0.9em] h-[0.9em] text-white" />
              </div>
              <div>
                <div className="text-[0.85em] font-semibold text-[#050505]">{voteCount.toFixed(1)}</div>
                <div className="text-[0.7em] text-[#050505]/70">votes</div>
              </div>
            </div>

            {/* Vote Percentage */}
            <div className="flex items-center gap-[0.6em] transition-transform duration-200 hover:translate-x-[0.3em]">
              <div className="w-[1.4em] h-[1.4em] flex items-center justify-center bg-[#4d61ff] border-[0.12em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_rgba(0,0,0,0.2)] transition-all duration-200 hover:bg-[#5e70ff] hover:rotate-[-5deg]">
                <Trophy className="w-[0.9em] h-[0.9em] text-white" />
              </div>
              <div>
                <div className="text-[0.85em] font-semibold text-[#050505]">{votePercentage.toFixed(1)}%</div>
                <div className="text-[0.7em] text-[#050505]/70">of total</div>
              </div>
            </div>

            {/* Matching Amount */}
            {matchingAmount > 0 && (
              <div className="flex items-center gap-[0.6em] transition-transform duration-200 hover:translate-x-[0.3em] col-span-2">
                <div className="w-[1.4em] h-[1.4em] flex items-center justify-center bg-[#10b981] border-[0.12em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_rgba(0,0,0,0.2)] transition-all duration-200 hover:bg-[#059669] hover:rotate-[-5deg]">
                  <Trophy className="w-[0.9em] h-[0.9em] text-white" />
                </div>
                <div>
                  <div className="text-[0.85em] font-semibold text-[#050505]">~{matchingAmount.toFixed(2)} CELO</div>
                  <div className="text-[0.7em] text-[#050505]/70">matched</div>
                </div>
              </div>
            )}
          </div>

          {/* Card Actions */}
          <div className="flex justify-between items-center mt-[1.5em] pt-[1.2em] border-t-[0.15em] border-dashed border-black/15 relative">
            <div className="absolute -top-[0.8em] left-1/2 -translate-x-1/2 rotate-90 bg-white px-[0.5em] text-[1em] text-black/40">✂</div>
            
            {/* Project Info */}
            <button
              onClick={handleProjectClick}
              className="relative text-[1.2em] font-extrabold text-[#050505] bg-white hover:text-[#4d61ff] transition-colors"
            >
              <div className="block text-[0.5em] font-semibold text-black/60 mb-[0.2em]">Project</div>
              <div className="text-[1em] font-bold">#{project.id || 'N/A'}</div>
            </button>

            {/* Vote Button */}
            {isActive && isApproved ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onVoteClick(project);
                }}
                className="relative bg-[#4d61ff] text-white text-[0.9em] font-bold px-[1.2em] py-[0.7em] border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] cursor-pointer transition-all duration-200 overflow-hidden uppercase tracking-[0.05em] hover:bg-[#5e70ff] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] hover:shadow-[0.4em_0.4em_0_#000000] active:translate-x-[0.1em] active:translate-y-[0.1em] active:shadow-[0.15em_0.15em_0_#000000]"
                style={{ pointerEvents: 'auto' }}
              >
                <span className="relative z-10 flex items-center gap-1">
                  <Vote className="w-4 h-4" />
                  Vote
                </span>
                <div 
                  className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-[left] duration-[600ms] hover:left-full"
                />
              </button>
            ) : !isActive ? (
              <span className="relative bg-gray-300 text-gray-600 text-[0.9em] font-bold px-[1.2em] py-[0.7em] border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] uppercase tracking-[0.05em] flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Ended
              </span>
            ) : (
              <span className="relative bg-gray-300 text-gray-600 text-[0.9em] font-bold px-[1.2em] py-[0.7em] border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] uppercase tracking-[0.05em] flex items-center gap-1">
                <XCircle className="w-4 h-4" />
                Pending
              </span>
            )}
          </div>
        </div>

        {/* Accent Shape */}
        <div className="absolute w-[2.5em] h-[2.5em] bg-[#4d61ff] border-[0.15em] border-[#050505] rounded-[0.3em] rotate-45 -bottom-[1.2em] right-[2em] z-0 transition-transform duration-300 group-hover:rotate-[55deg] group-hover:scale-110" />

        {/* Corner Slice */}
        <div className="absolute bottom-0 left-0 w-[1.5em] h-[1.5em] bg-white border-r-[0.25em] border-t-[0.25em] border-[#050505] rounded-tl-[0.5em] z-[1]" />
      </div>
    </div>
  );
};

