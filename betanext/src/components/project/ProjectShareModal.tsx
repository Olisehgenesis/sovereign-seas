'use client';

import { X, Share2, Twitter, Linkedin, Copy, CheckCircle, ChevronRight } from 'lucide-react';
import type { SharePlatform } from './types';

interface ProjectShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  projectTagline?: string;
  projectDescription: string;
  sharePlatforms: SharePlatform[];
  onShare: (platform: 'twitter' | 'linkedin' | 'copy') => void;
  copiedUrl: boolean;
}

export default function ProjectShareModal({
  isOpen,
  onClose,
  sharePlatforms,
  onShare,
  copiedUrl
}: ProjectShareModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="group relative w-full max-w-md mt-4 sm:mt-8 lg:mt-16 mb-4">
        {/* Pattern Overlays */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-50 transition-opacity duration-[400ms] z-[1]"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
            backgroundSize: '0.5em 0.5em'
          }}
        />
        
        {/* Main Card */}
        <div 
          className="relative bg-white border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2]"
          style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
        >
          {/* Accent Corner */}
          <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
          <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>

          {/* Header */}
          <div 
            className="relative px-[1.5em] py-[1.2em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2] flex items-center justify-between"
            style={{ 
              background: '#2563eb',
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
              backgroundBlendMode: 'overlay'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-[0.3em] border-[0.15em] border-white/30">
                <Share2 className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-extrabold text-white">Share Project</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-[0.3em] transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Body */}
          <div className="relative px-[1.5em] py-[1.5em] z-[2]">
            <div className="space-y-3">
              {sharePlatforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => onShare(platform.id)}
                  className="w-full flex items-center gap-4 p-4 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all group"
                >
                  <div className={`w-12 h-12 ${platform.bgColor} rounded-full flex items-center justify-center border-[0.15em] border-[#050505] shadow-[0.2em_0.2em_0_#000000]`}>
                    <platform.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-extrabold text-[#050505] uppercase tracking-[0.05em]">{platform.name}</p>
                    <p className="text-sm text-gray-600 font-semibold">{platform.description}</p>
                  </div>
                  {platform.id === 'copy' && copiedUrl ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

