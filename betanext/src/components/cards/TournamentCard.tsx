import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Trophy, CheckCircle, Timer, Activity, Users, Clock, Award, Vote } from 'lucide-react';
import { useNavigate } from '@/utils/nextAdapter';
import { capitalizeWords } from '@/utils/textUtils';
import { ipfsImageLoader } from '@/utils/imageUtils';
import { formatEther } from 'viem';

interface TournamentCardProps {
  title: string;
  description: string;
  logo?: string;
  status?: 'upcoming' | 'active' | 'ended' | 'paused';
  className?: string;
  tournamentId?: string;
  descriptionTruncateSize?: number;
  createdAt?: number;
  stageDuration?: bigint;
  projectCount?: number;
  stageCount?: number;
  currentStage?: number;
}

const TournamentCard: React.FC<TournamentCardProps> = ({
  title,
  description,
  logo,
  status = 'active',
  className = '',
  tournamentId,
  descriptionTruncateSize = 40,
  createdAt,
  stageDuration,
  projectCount = 0,
  stageCount = 0,
  currentStage = 0
}) => {
  const navigate = useNavigate();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);

  const getStatusInfo = () => {
    switch (currentStatus) {
      case 'upcoming':
        return { text: 'Coming Soon', color: '#3b82f6', bgColor: '#dbeafe' };
      case 'active':
        return { text: 'Active', color: '#10b981', bgColor: '#d1fae5' };
      case 'ended':
      case 'paused':
      default:
        return { text: 'Ended', color: '#6b7280', bgColor: '#f3f4f6' };
    }
  };

  const statusInfo = getStatusInfo();
  
  // Calculate dynamic title font size based on length
  const titleLength = title.length;
  const calculateTitleSize = () => {
    const preferredSize = Math.max(0.7, Math.min(1.4, 1.4 - (titleLength - 5) * 0.015));
    return `clamp(0.7em, ${preferredSize}em, 1.4em)`;
  };

  const titleFontSize = calculateTitleSize();

  useEffect(() => {
    if (!logo) {
      setImageSrc(undefined);
      return;
    }
    setImageSrc(logo);
  }, [logo]);

  // Try a secondary IPFS gateway if the first image URL fails
  const getFallbackImageUrl = (src: string | undefined | null): string | null => {
    if (!src) return null;
    try {
      const url = new URL(src);
      const parts = url.pathname.split('/');
      const ipfsIndex = parts.findIndex((p) => p === 'ipfs');
      const cid = ipfsIndex !== -1 ? parts[ipfsIndex + 1] : null;
      if (!cid) return null;

      if (url.hostname === 'inner-salmon-leopard.myfilebase.com') {
        return `https://gateway.pinata.cloud/ipfs/${cid}`;
      }
      if (url.hostname === 'gateway.pinata.cloud') {
        return `https://ipfs.io/ipfs/${cid}`;
      }
      if (url.hostname === 'ipfs.io') {
        return `https://gateway.pinata.cloud/ipfs/${cid}`;
      }

      return `https://ipfs.io/ipfs/${cid}`;
    } catch {
      return null;
    }
  };

  const handleCardClick = () => {
    if (tournamentId) {
      navigate(`/explorer/tournament/${tournamentId}`);
    } else {
      console.warn('Tournament card clicked but no tournamentId provided');
    }
  };

  // Format stage duration
  const formatDuration = (seconds: bigint | undefined) => {
    if (!seconds) return 'N/A';
    const days = Number(seconds) / 86400;
    if (days >= 1) return `${days.toFixed(0)}d`;
    const hours = Number(seconds) / 3600;
    if (hours >= 1) return `${hours.toFixed(0)}h`;
    const minutes = Number(seconds) / 60;
    return `${minutes.toFixed(0)}m`;
  };

  return (
    <div
      className={`group relative w-full max-w-[22em] ${className} cursor-pointer`}
      onClick={handleCardClick}
      style={{ pointerEvents: 'auto' }}
    >
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
        {/* Accent Corner */}
        <div 
          className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#a855f7] rotate-45 z-[1]"
        />
        <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">⚔</div>

        {/* Title Area */}
        <div 
          className="relative px-[1.4em] py-[1.4em] text-white font-extrabold flex justify-between items-center border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2] overflow-hidden"
          style={{ 
            background: statusInfo.color || '#a855f7',
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
            backgroundBlendMode: 'overlay'
          }}
        >
          <span 
            className="flex-1 pr-2 break-words"
            style={{ 
              fontSize: titleFontSize,
              lineHeight: '1.2',
              wordBreak: 'break-word',
              overflowWrap: 'break-word'
            }}
          >
            {capitalizeWords(title)}
          </span>
          <span 
            className="bg-white text-[#050505] text-[0.6em] font-extrabold px-[0.8em] py-[0.4em] border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_#000000] uppercase tracking-[0.1em] rotate-[3deg] transition-all duration-300 group-hover:rotate-[-2deg] group-hover:scale-110 group-hover:shadow-[0.25em_0.25em_0_#000000] flex-shrink-0 ml-2"
          >
            {statusInfo.text}
          </span>
        </div>

        {/* Card Body */}
        <div className="relative px-[1.5em] py-[1.5em] z-[2]">
          {/* Image Area */}
          <div className="flex justify-center mb-[1.5em] -mt-[2em]">
            <div className="w-[6em] h-[6em] rounded-full border-[0.4em] border-white shadow-[0_0.5em_1em_rgba(0,0,0,0.2),0.3em_0.3em_0_#000000] overflow-hidden bg-[#a855f7] transition-all duration-300 group-hover:scale-110 group-hover:rotate-[5deg] group-hover:shadow-[0_0.7em_1.5em_rgba(0,0,0,0.3),0.4em_0.4em_0_#000000]">
              {imageSrc ? (
                <Image
                  loader={ipfsImageLoader}
                  src={imageSrc}
                  alt={title}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  onError={(event) => {
                    const originalSrc = event.currentTarget.src;
                    const fallback = getFallbackImageUrl(originalSrc);
                    if (fallback && fallback !== originalSrc) {
                      setImageSrc(fallback);
                    } else {
                      setImageSrc(undefined);
                    }
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
          <div className="mb-[1.5em] text-[#050505] text-[0.95em] leading-[1.4] font-medium line-clamp-3">
            {description.length > descriptionTruncateSize 
              ? `${description.substring(0, descriptionTruncateSize)}...` 
              : description}
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-[1em] mb-[1.5em]">
            {/* Stage Duration */}
            {stageDuration && (
              <div className="flex items-center gap-[0.6em] transition-transform duration-200 hover:translate-x-[0.3em]">
                <div className="w-[1.4em] h-[1.4em] flex items-center justify-center bg-[#a855f7] border-[0.12em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_rgba(0,0,0,0.2)] transition-all duration-200 hover:bg-[#9333ea] hover:rotate-[-5deg]">
                  <Clock className="w-[0.9em] h-[0.9em] text-white" />
                </div>
                <span className="text-[0.85em] font-semibold text-[#050505]">{formatDuration(stageDuration)}</span>
              </div>
            )}

            {/* Status */}
            <div className="flex items-center gap-[0.6em] transition-transform duration-200 hover:translate-x-[0.3em]">
              <div className="w-[1.4em] h-[1.4em] flex items-center justify-center bg-[#a855f7] border-[0.12em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_rgba(0,0,0,0.2)] transition-all duration-200 hover:bg-[#9333ea] hover:rotate-[-5deg]">
                <Activity className="w-[0.9em] h-[0.9em] text-white" />
              </div>
              <span className="text-[0.85em] font-semibold text-[#050505]">{statusInfo.text}</span>
            </div>

            {/* Project Count */}
            {projectCount > 0 && (
              <div className="flex items-center gap-[0.6em] transition-transform duration-200 hover:translate-x-[0.3em]">
                <div className="w-[1.4em] h-[1.4em] flex items-center justify-center bg-[#a855f7] border-[0.12em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_rgba(0,0,0,0.2)] transition-all duration-200 hover:bg-[#9333ea] hover:rotate-[-5deg]">
                  <Users className="w-[0.9em] h-[0.9em] text-white" />
                </div>
                <span className="text-[0.85em] font-semibold text-[#050505]">{projectCount} Projects</span>
              </div>
            )}

            {/* Current Stage */}
            {currentStage > 0 && (
              <div className="flex items-center gap-[0.6em] transition-transform duration-200 hover:translate-x-[0.3em]">
                <div className="w-[1.4em] h-[1.4em] flex items-center justify-center bg-[#a855f7] border-[0.12em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_rgba(0,0,0,0.2)] transition-all duration-200 hover:bg-[#9333ea] hover:rotate-[-5deg]">
                  <Award className="w-[0.9em] h-[0.9em] text-white" />
                </div>
                <span className="text-[0.85em] font-semibold text-[#050505]">Stage {currentStage}</span>
              </div>
            )}
          </div>

          {/* Card Actions */}
          <div className="flex justify-between items-center mt-[1.5em] pt-[1.2em] border-t-[0.15em] border-dashed border-black/15 relative">
            <div className="absolute -top-[0.8em] left-1/2 -translate-x-1/2 rotate-90 bg-white px-[0.5em] text-[1em] text-black/40">✂</div>
            
            {/* Tournament Badge */}
            <div className="relative text-[1.2em] font-extrabold text-[#050505] bg-white">
              <div className="flex items-center gap-1">
                <Trophy className="w-[1em] h-[1em] text-[#a855f7]" />
                <span className="text-[0.8em]">Tournament</span>
              </div>
            </div>

            {/* Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
              className="relative bg-[#a855f7] text-white text-[0.9em] font-bold px-[1.2em] py-[0.7em] border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] cursor-pointer transition-all duration-200 overflow-hidden uppercase tracking-[0.05em] hover:bg-[#9333ea] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] hover:shadow-[0.4em_0.4em_0_#000000] active:translate-x-[0.1em] active:translate-y-[0.1em] active:shadow-[0.15em_0.15em_0_#000000]"
              style={{ pointerEvents: 'auto' }}
            >
              <span className="relative z-10">View</span>
              <div 
                className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-[left] duration-[600ms] hover:left-full"
              />
            </button>
          </div>
        </div>

        {/* Accent Shape */}
        <div className="absolute w-[2.5em] h-[2.5em] bg-[#a855f7] border-[0.15em] border-[#050505] rounded-[0.3em] rotate-45 -bottom-[1.2em] right-[2em] z-0 transition-transform duration-300 group-hover:rotate-[55deg] group-hover:scale-110" />

        {/* Corner Slice */}
        <div className="absolute bottom-0 left-0 w-[1.5em] h-[1.5em] bg-white border-r-[0.25em] border-t-[0.25em] border-[#050505] rounded-tl-[0.5em] z-[1]" />

        {/* Stamp */}
        <div className="absolute bottom-[1.5em] left-[1.5em] w-[4em] h-[4em] flex items-center justify-center border-[0.15em] border-black/30 rounded-full rotate-[-15deg] opacity-20 z-[1]">
          <span className="text-[0.6em] font-extrabold uppercase tracking-[0.05em]">Tournament</span>
        </div>
      </div>
    </div>
  );
};

export default TournamentCard;

