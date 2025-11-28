'use client';

import { ExternalLink } from 'lucide-react';
import { formatIpfsUrl } from '@/utils/imageUtils';
import { getNormalizedLocation } from '@/utils/locationUtils';
import LocationBadge from '@/components/LocationBadge';

interface ProfileProjectCardProps {
  project: {
    name: string;
    description: string;
    active: boolean;
    createdAt: bigint;
    campaignIds?: bigint[];
    metadata: {
      tagline?: string;
      category?: string;
      tags?: string[];
      location?: string;
      logo?: string;
      coverImage?: string;
      [key: string]: any;
    };
  };
  onClick: () => void;
}

export const ProfileProjectCard = ({ project, onClick }: ProfileProjectCardProps) => {
  const location = getNormalizedLocation(project.metadata);
  const projectLogo = project.metadata.logo || project.metadata.coverImage || null;

  return (
    <div className="group relative w-full">
      <div 
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
          backgroundSize: '0.5em 0.5em'
        }}
      />
      
      <div 
        className="relative bg-white border-[0.3em] border-[#a855f7] rounded-[0.5em] shadow-[0.5em_0.5em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2] group-hover:shadow-[0.6em_0.6em_0_#000000] group-hover:-translate-x-[0.2em] group-hover:-translate-y-[0.2em] cursor-pointer"
        onClick={onClick}
        style={{ boxShadow: 'inset 0 0 0 0.1em rgba(0, 0, 0, 0.05)' }}
      >
        <div className="absolute -top-[0.8em] -right-[0.8em] w-[3em] h-[3em] bg-[#a855f7] rotate-45 z-[1]" />
        <div className="absolute top-[0.3em] right-[0.3em] text-white text-[1em] font-bold z-[2]">★</div>
        
        <div className="relative px-4 py-4 z-[2]">
          <LocationBadge location={location} variant="card" />
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              {projectLogo ? (
                <img
                  src={formatIpfsUrl(projectLogo)}
                  alt={`${project.name} logo`}
                  className="w-12 h-12 rounded-[0.3em] object-cover border-[0.15em] border-[#050505]"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div 
                  className="w-12 h-12 bg-[#a855f7] rounded-[0.3em] flex items-center justify-center text-white text-lg font-bold border-[0.15em] border-[#050505]"
                >
                  {project.name?.charAt(0)}
                </div>
              )}
              <div>
                <h3 className="font-extrabold text-[#050505] text-lg mb-1">
                  {project.name}
                </h3>
                <div 
                  className={`inline-flex px-2 py-1 rounded-[0.3em] text-xs font-bold border-[0.15em] ${
                    project.active ? 'text-[#10b981] bg-[#d1fae5] border-[#10b981]' : 'text-[#050505] bg-gray-100 border-[#050505]'
                  }`}
                >
                  {project.active ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-[#050505]" />
          </div>
          
          <p className="text-[#050505] text-sm mb-4 line-clamp-3 leading-relaxed font-semibold">{project.description}</p>
          
          <div className="flex items-center justify-between text-sm text-[#050505] mb-4 font-bold">
            <span>Created {new Date(Number(project.createdAt) * 1000).toLocaleDateString()}</span>
            <span>{project.campaignIds?.length || 0} campaigns</span>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="w-full px-4 py-3 bg-[#a855f7] text-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all text-sm font-extrabold uppercase tracking-[0.05em]"
          >
            View Project
          </button>
        </div>
      </div>
    </div>
  );
};

