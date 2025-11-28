import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface TerminalCardProps {
  id: string;
  title: string;
  subtitle: string;
  description?: string;
  status: {
    text: string;
    indicator: string;
    blinking: boolean;
  };
  branding: {
    logo: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  };
  pagination: {
    current: number;
    total: number;
  };
  style: {
    theme: 'terminal';
    fontFamily: 'monospace';
    backgroundColor: string;
    borderRadius: string;
    shadow: 'multiple';
    stackedEffect: boolean;
  };
  onNext?: () => void;
  onPrevious?: () => void;
}

const TerminalCard: React.FC<TerminalCardProps> = ({
  title,
  subtitle,
  description,
  status,
  branding,
  pagination,
  style,
  onNext,
  onPrevious
}) => {
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    if (status.blinking) {
      const interval = setInterval(() => {
        setIsBlinking(prev => !prev);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [status.blinking]);

  return (
    <div className="group relative w-full max-w-lg mx-auto">
      {/* Pagination Indicator */}
      <div className="absolute -top-12 left-0 flex items-center space-x-3 z-10">
        <div className="w-8 h-8 border-[0.2em] border-[#050505] rounded-full flex items-center justify-center relative overflow-hidden bg-white shadow-[0.15em_0.15em_0_#000000]">
          <div 
            className="absolute inset-0 bg-[#2563eb] rounded-full transition-all duration-300 ease-in-out"
            style={{
              clipPath: `polygon(50% 50%, 50% 0%, ${(pagination.current / pagination.total) * 100}% 0%, ${(pagination.current / pagination.total) * 100}% 100%, 50% 100%)`
            }}
          />
        </div>
        <span className="text-base font-extrabold text-[#050505] uppercase tracking-[0.05em] bg-white px-2 py-1 border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.15em_0.15em_0_#000000]">
          {pagination.current} / {pagination.total}
        </span>
      </div>

      {/* Navigation Buttons - Always visible */}
      <div className="absolute -top-12 right-0 flex space-x-2 z-10">
        {/* Previous Button */}
        <button
          onClick={onPrevious}
          className="w-10 h-10 bg-white border-[0.2em] border-[#050505] rounded-full flex items-center justify-center hover:bg-[#2563eb] shadow-[0.15em_0.15em_0_#000000] hover:shadow-[0.2em_0.2em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all duration-200 group"
        >
          <ChevronLeft className="w-5 h-5 text-[#050505] group-hover:text-white group-hover:-translate-x-0.5 transition-all duration-200" />
        </button>
        
        {/* Next Button */}
        <button
          onClick={onNext}
          className="w-10 h-10 bg-white border-[0.2em] border-[#050505] rounded-full flex items-center justify-center hover:bg-[#2563eb] shadow-[0.15em_0.15em_0_#000000] hover:shadow-[0.2em_0.2em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all duration-200 group"
        >
          <ChevronRight className="w-5 h-5 text-[#050505] group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200" />
        </button>
      </div>

      {/* Pattern Overlays */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
          backgroundSize: '0.5em 0.5em'
        }}
      />
      
      {/* Main Card - Retro Theme */}
      <div 
        className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2] group-hover:shadow-[1em_1em_0_#000000] group-hover:-translate-x-[0.4em] group-hover:-translate-y-[0.4em] group-hover:scale-[1.02] min-h-[280px]"
        style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
      >
        {/* Accent Corner */}
        <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
        <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>

        {/* Title Area */}
        <div 
          className="relative px-[1.4em] py-[1em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
          style={{ 
            background: '#2563eb',
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
            backgroundBlendMode: 'overlay'
          }}
        >
          {/* Branding Logo */}
          <div className={`absolute ${branding.position === 'top-left' ? 'left-[1.4em]' : 'right-[1.4em]'} top-[1em]`}>
            <span className="text-sm font-extrabold text-white tracking-wider">{branding.logo}</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative px-[1.4em] py-[1.5em] z-[2] space-y-4">
          {/* Title and Subtitle */}
          <div className="space-y-2 mt-2">
            <h2 className="text-2xl lg:text-3xl font-extrabold text-[#050505] leading-tight">
              {title}
            </h2>
            <h3 className="text-xl lg:text-2xl font-extrabold text-[#050505] leading-tight">
              {subtitle}
            </h3>
          </div>

          {/* Description */}
          {description && (
            <div className="text-sm text-[#050505] leading-relaxed font-medium">
              {description}
            </div>
          )}

          {/* Status Line */}
          <div className="flex items-center space-x-2 pt-2">
            <div className="inline-flex items-center px-3 py-1.5 bg-[#10b981] border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_#000000]">
              <span className="text-sm font-extrabold text-white uppercase tracking-[0.05em]">
                &gt; {status.text}
              </span>
              <span className={`text-sm font-extrabold text-white ml-1 ${isBlinking ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}>
                {status.indicator}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerminalCard;
