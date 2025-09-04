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
    <div className="relative w-full max-w-lg mx-auto">
      {/* Pagination Indicator */}
      <div className="absolute -top-12 left-0 flex items-center space-x-3">
        <div className="w-8 h-8 border-2 border-black rounded-full flex items-center justify-center relative overflow-hidden">
          <div 
            className="absolute inset-0 bg-black rounded-full transition-all duration-300 ease-in-out"
            style={{
              clipPath: `polygon(50% 50%, 50% 0%, ${(pagination.current / pagination.total) * 100}% 0%, ${(pagination.current / pagination.total) * 100}% 100%, 50% 100%)`
            }}
          />
        </div>
        <span className="text-base font-mono text-black font-medium">
          {pagination.current} / {pagination.total}
        </span>
      </div>

      {/* Navigation Buttons - Always visible */}
      <div className="absolute -top-12 right-0 flex space-x-2">
        {/* Previous Button */}
        <button
          onClick={onPrevious}
          className="w-10 h-10 border-2 border-black rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all duration-200 group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform duration-200" />
        </button>
        
        {/* Next Button */}
        <button
          onClick={onNext}
          className="w-10 h-10 border-2 border-black rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all duration-200 group"
        >
          <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform duration-200" />
        </button>
      </div>

      {/* Card Stack - Enhanced stacked effect */}
      <div className="relative transform transition-all duration-300 hover:scale-105">
        {/* Third shadow layer - furthest back */}
        <div className="absolute inset-0 bg-gray-400 rounded-2xl transform translate-x-3 translate-y-3 transition-all duration-300" />
        
        {/* Second shadow layer */}
        <div className="absolute inset-0 bg-gray-300 rounded-2xl transform translate-x-2 translate-y-2 transition-all duration-300" />
        
        {/* First shadow layer - closest to main card */}
        <div className="absolute inset-0 bg-gray-200 rounded-2xl transform translate-x-1 translate-y-1 transition-all duration-300" />
        
        {/* Main Card - Bigger and more prominent */}
        <div 
          className="relative bg-white border-2 border-black rounded-2xl p-8 font-mono transition-all duration-300 hover:shadow-lg min-h-[280px]"
          style={{
            backgroundColor: style.backgroundColor,
            borderRadius: style.borderRadius
          }}
        >
          {/* Branding Logo */}
          <div className={`absolute ${branding.position === 'top-left' ? 'top-6 left-6' : 'top-6 right-6'}`}>
            <span className="text-lg font-bold text-black tracking-wider">{branding.logo}</span>
          </div>

          {/* Main Content */}
          <div className="mt-12 space-y-6">
            {/* Title and Subtitle */}
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-black leading-tight tracking-tight">
                {title}
              </h2>
              <h3 className="text-2xl font-bold text-black leading-tight tracking-tight">
                {subtitle}
              </h3>
            </div>

            {/* Description */}
            {description && (
              <div className="text-sm text-gray-700 leading-relaxed font-mono">
                {description}
              </div>
            )}

            {/* Status Line */}
            <div className="flex items-center space-x-2">
              <span className="text-base font-mono text-black font-medium">
                &gt; {status.text}
              </span>
              <span className={`text-base font-mono text-black font-medium ${isBlinking ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}>
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
