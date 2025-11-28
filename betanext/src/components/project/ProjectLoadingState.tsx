'use client';

import { Rocket } from 'lucide-react';

export default function ProjectLoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="group relative w-full max-w-md">
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

          {/* Title Area */}
          <div 
            className="relative px-[1em] py-[0.8em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
            style={{ 
              background: '#2563eb',
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
              backgroundBlendMode: 'overlay'
            }}
          >
            <h3 className="text-[0.9em]">Loading Project</h3>
          </div>

          {/* Body */}
          <div className="relative px-[1.2em] py-[1em] z-[2] text-center">
            <div className="relative mb-8">
              <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
              <Rocket className="h-10 w-10 text-blue-600 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-[#050505] uppercase tracking-[0.05em]">Loading Project</h2>
              <p className="text-[#050505] text-[0.9em] font-semibold">Fetching project details...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

