'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface ButtonCoolProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  borderColor?: string;
  bgColor?: string;
  textColor?: string;
  hoverBgColor?: string;
  shadowColor?: string;
  text: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

const ButtonCool: React.FC<ButtonCoolProps> = ({
  borderColor = '#050505',
  bgColor = '#4d61ff',
  textColor = '#ffffff',
  hoverBgColor,
  shadowColor = '#000000',
  text,
  size = 'md',
  className,
  children,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Calculate hover color if not provided (slightly lighter)
  const defaultHoverBg = hoverBgColor || adjustBrightness(bgColor, 20);
  
  // Size variants
  const sizeClasses = {
    sm: 'text-[0.75em] px-[1em] py-[0.5em]',
    md: 'text-[0.9em] px-[1.2em] py-[0.7em]',
    lg: 'text-[1em] px-[1.5em] py-[0.9em]'
  };

  return (
    <button
      className={cn(
        'relative font-bold border-[0.2em] rounded-[0.4em] cursor-pointer transition-all duration-200 overflow-hidden uppercase tracking-[0.05em]',
        'hover:-translate-x-[0.1em] hover:-translate-y-[0.1em]',
        'active:translate-x-[0.1em] active:translate-y-[0.1em]',
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: isHovered ? defaultHoverBg : bgColor,
        color: textColor,
        borderColor: borderColor,
        boxShadow: isHovered 
          ? `0.4em 0.4em 0 ${shadowColor}` 
          : `0.3em 0.3em 0 ${shadowColor}`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={(e) => {
        e.currentTarget.style.boxShadow = `0.15em 0.15em 0 ${shadowColor}`;
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.boxShadow = isHovered 
          ? `0.4em 0.4em 0 ${shadowColor}` 
          : `0.3em 0.3em 0 ${shadowColor}`;
      }}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {text}
        {children}
      </span>
      <div 
        className={cn(
          "absolute top-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-[left] duration-[600ms] pointer-events-none",
          isHovered ? "left-full" : "-left-full"
        )}
      />
    </button>
  );
};

// Helper function to adjust color brightness
function adjustBrightness(color: string, percent: number): string {
  try {
    // Remove # if present
    const hex = color.replace('#', '');
    
    // Convert to RGB
    const num = parseInt(hex, 16);
    if (isNaN(num)) return color; // Return original if invalid
    
    const r = Math.min(255, Math.max(0, (num >> 16) + percent));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
    
    // Convert back to hex
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  } catch {
    return color; // Return original if error
  }
}

export { ButtonCool };

