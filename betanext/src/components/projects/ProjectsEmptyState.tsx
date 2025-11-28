'use client';

import { Search } from 'lucide-react';

interface ProjectsEmptyStateProps {
  searchTerm: string;
}

export default function ProjectsEmptyState({ searchTerm }: ProjectsEmptyStateProps) {
  return (
    <div className="flex items-center justify-center py-12">
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
          className="relative bg-white border-[0.35em] border-[#a855f7] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2]"
          style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
        >
          {/* Accent Corner */}
          <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#a855f7] rotate-45 z-[1]" />
          <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>

          {/* Title Area */}
          <div 
            className="relative px-[1em] py-[0.8em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
            style={{ 
              background: '#a855f7',
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
              backgroundBlendMode: 'overlay'
            }}
          >
            <h3 className="text-[0.9em]">No Projects Found</h3>
          </div>

          {/* Body */}
          <div className="relative px-[1.2em] py-[1em] z-[2] text-center">
            <div className="text-[#a855f7] mb-4 flex justify-center">
              <Search className="h-12 w-12" />
            </div>
            <h3 className="text-lg font-extrabold text-[#050505] mb-2 uppercase tracking-[0.05em]">No projects found</h3>
            <p className="text-[#050505] text-[0.9em] font-semibold">
              {searchTerm ? 'Try adjusting your search terms' : 'No projects are available at the moment'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

