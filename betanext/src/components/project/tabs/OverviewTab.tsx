'use client';

import { Twitter, Linkedin, Mail, MessageCircle, Send, Video, Camera } from 'lucide-react';
import TruncatedText from '@/components/TruncatedText';
import BuilderSlotCard from '@/components/cards/BuilderSlotCard';
import { formatEther } from 'viem';
import { formatYear } from '../utils';
import type { EnhancedProject } from '../types';

interface OverviewTabProps {
  project: EnhancedProject;
  projectCampaigns: any[];
}

export default function OverviewTab({ project, projectCampaigns }: OverviewTabProps) {
  return (
    <>
      {/* Overview Content */}
      <div className="group relative">
        <div 
          className="absolute inset-0 pointer-events-none opacity-30 z-[1]"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
            backgroundSize: '0.5em 0.5em'
          }}
        />
        <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
        <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
        <div className="relative bg-white border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] p-4 sm:p-8 z-[2]"
          style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
        >
          {/* Header strip */}
          <div 
            className="mb-4 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em]"
            style={{ 
              background: '#2563eb',
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
              backgroundBlendMode: 'overlay'
            }}
          >
            <span className="text-sm sm:text-base">Project Overview</span>
          </div>

          {/* Social Media Icons - Top Right Corner */}
          {(project.metadata?.twitter || project.metadata?.linkedin || project.metadata?.discord || 
            project.metadata?.telegram || project.metadata?.youtube || project.metadata?.instagram || 
            project.metadata?.contactEmail) && (
            <div className="absolute top-2 right-2 sm:top-6 sm:right-6 flex gap-1 sm:gap-2">
              {project.metadata?.twitter && (
                <a 
                  href={project.metadata.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                  title="Follow on Twitter"
                >
                  <Twitter className="h-4 w-4 sm:h-5 sm:w-5" />
                </a>
              )}
              
              {project.metadata?.contactEmail && (
                <a 
                  href={`mailto:${project.metadata.contactEmail}`}
                  className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gray-500 hover:bg-gray-600 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                  title="Contact via Email"
                >
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
                </a>
              )}
              
              {project.metadata?.linkedin && (
                <a 
                  href={project.metadata.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                  title="Connect on LinkedIn"
                >
                  <Linkedin className="h-4 w-4 sm:h-5 sm:w-5" />
                </a>
              )}
              
              {project.metadata?.discord && (
                <a 
                  href={project.metadata.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-purple-500 hover:bg-purple-600 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                  title="Join Discord"
                >
                  <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                </a>
              )}
              
              {project.metadata?.telegram && (
                <a 
                  href={project.metadata.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-blue-400 hover:bg-blue-500 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                  title="Join Telegram"
                >
                  <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                </a>
              )}

              {project.metadata?.youtube && (
                <a 
                  href={project.metadata.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                  title="Subscribe on YouTube"
                >
                  <Video className="h-4 w-4 sm:h-5 sm:w-5" />
                </a>
              )}

              {project.metadata?.instagram && (
                <a 
                  href={project.metadata.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-pink-500 hover:bg-pink-600 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                  title="Follow on Instagram"
                >
                  <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
                </a>
              )}
            </div>
          )}

          <div className="prose prose-sm sm:prose-lg prose-gray max-w-none">
            <p className="text-gray-800 leading-relaxed text-sm sm:text-lg mb-3 sm:mb-6">
              <strong>{project.name}</strong> has participated in <strong>{project.campaignIds?.length || 0} campaign{project.campaignIds?.length === 1 ? '' : 's'}</strong> and has raised               <strong className="inline-flex items-center gap-1">
                {projectCampaigns ? 
                  projectCampaigns.filter((c): c is NonNullable<typeof c> => c !== null)
                    .reduce((sum, c) => 
                      sum + parseFloat(formatEther(c.participation?.fundsReceived || 0n)), 0
                    ).toFixed(2) 
                  : '0.00'} <img src="/images/celo.png" alt="CELO" width={16} height={16} className="inline-block" />
              </strong> in total funding.
            </p>

            {/* Technical / metadata details in a retro info box */}
            <div className="mt-4 p-4 sm:p-5 bg-[#f9fafb] border-[0.2em] border-[#050505] rounded-[0.5em] shadow-[0.3em_0.3em_0_#000000] space-y-3">
              {project.metadata?.category && project.metadata?.projectType && (
                <p className="text-gray-800 leading-relaxed text-sm sm:text-base font-semibold">
                  It is a <strong>{project.metadata.projectType}</strong> under the{' '}
                  <strong>{project.metadata.category}</strong> category.
                </p>
              )}
              
              {project.metadata?.maturityLevel && (
                <p className="text-gray-800 leading-relaxed text-sm sm:text-base font-semibold">
                  Maturity level: <strong>{project.metadata.maturityLevel}</strong>.
                </p>
              )}
              
              {project.metadata?.techStack && project.metadata.techStack.length > 0 && (
                <p className="text-gray-800 leading-relaxed text-sm sm:text-base font-semibold">
                  Built with <strong>{project.metadata.techStack.join(', ')}</strong> stack.
                </p>
              )}
              
              {project.metadata?.keyFeatures && project.metadata.keyFeatures.length > 0 && (
                <p className="text-gray-800 leading-relaxed text-sm sm:text-base font-semibold">
                  <strong>Key features:</strong> {project.metadata.keyFeatures.join(', ')}.
                </p>
              )}
              
              {project.transferrable !== undefined && (
                <p className="text-gray-800 leading-relaxed text-sm sm:text-base font-semibold">
                  The project is <strong>{project.transferrable ? 'transferrable' : 'non-transferrable'}</strong> and is currently{' '}
                  <strong>{project.active ? 'active' : 'inactive'}</strong>.
                </p>
              )}
              
              {project.metadata?.innovation && (
                <p className="text-gray-800 leading-relaxed text-sm sm:text-base font-semibold">
                  <strong>Innovation:</strong> {project.metadata.innovation}
                </p>
              )}
              
              {project.metadata?.targetAudience && (
                <p className="text-gray-800 leading-relaxed text-sm sm:text-base font-semibold">
                  <strong>Target audience:</strong> {project.metadata.targetAudience}
                </p>
              )}
              
              {project.metadata?.useCases && project.metadata.useCases.length > 0 && (
                <p className="text-gray-800 leading-relaxed text-sm sm:text-base font-semibold">
                  <strong>Use cases:</strong> {project.metadata.useCases.join(', ')}.
                </p>
              )}
              
              {project.metadata?.establishedDate && (
                <p className="text-gray-800 leading-relaxed text-sm sm:text-base font-semibold">
                  <strong>Established:</strong> {formatYear(project.metadata.establishedDate)}
                </p>
              )}
              
              {project.metadata?.milestones && project.metadata.milestones.length > 0 && (
                <p className="text-gray-800 leading-relaxed text-sm sm:text-base font-semibold">
                  <strong>Current milestones:</strong>{' '}
                  {project.metadata.milestones.filter(m => m.status === 'in-progress').length > 0
                    ? project.metadata.milestones
                        .filter(m => m.status === 'in-progress')
                        .map(m => m.title)
                        .join(', ') + ' in progress'
                    : 'No active milestones at this time'}
                  .
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Builder Rewards NFT Card */}
      {project?.owner && (
        <div className="group relative">
          <div 
            className="hidden sm:block absolute inset-0 pointer-events-none opacity-30 z-[1]"
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
              backgroundSize: '0.5em 0.5em'
            }}
          />
          <div className="hidden sm:block absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#a855f7] rotate-45 z-[1]" />
          <div className="hidden sm:block absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
          <div className="relative bg-white sm:border-[0.35em] sm:border-[#a855f7] sm:rounded-[0.6em] sm:shadow-[0.5em_0.5em_0_#000000] sm:p-8 z-[2]">
            <BuilderSlotCard 
              ownerAddress={project.owner}
            />
          </div>
        </div>
      )}
    </>
  );
}

