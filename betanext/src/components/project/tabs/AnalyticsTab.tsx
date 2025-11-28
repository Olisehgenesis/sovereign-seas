'use client';

import { BarChart3, Trophy, Coins, Vote } from 'lucide-react';
import { formatEther } from 'viem';
import type { EnhancedProject } from '../types';
import Image from 'next/image';

interface AnalyticsTabProps {
  project: EnhancedProject;
  projectCampaigns: any[];
}

export default function AnalyticsTab({ project, projectCampaigns }: AnalyticsTabProps) {
  const totalFunding = projectCampaigns 
    ? projectCampaigns.filter((c): c is NonNullable<typeof c> => c !== null)
        .reduce((sum, c) => sum + parseFloat(formatEther(c.participation?.fundsReceived || 0n)), 0)
    : 0;
  
  const totalVotes = projectCampaigns 
    ? projectCampaigns.filter((c): c is NonNullable<typeof c> => c !== null)
        .reduce((sum, c) => sum + parseFloat(formatEther(c.participation?.voteCount || 0n)), 0)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-[#2563eb]/10 rounded-[0.4em] border-[0.2em] border-[#2563eb]">
          <BarChart3 className="h-6 w-6 text-[#2563eb]" />
        </div>
        <h3 className="text-2xl font-extrabold text-[#050505] uppercase tracking-[0.05em]">Project Analytics</h3>
      </div>
      
      <p className="text-lg text-[#050505] mb-6 font-semibold leading-relaxed">
        {project.name} has participated in <span className="font-extrabold text-[#2563eb]">{project.campaignIds?.length || 0}</span> campaign{project.campaignIds?.length === 1 ? '' : 's'}, raising a total of <span className="font-extrabold text-[#10b981] flex items-center gap-1 inline-flex">{totalFunding.toFixed(2)} <Image src="/images/celo.png" alt="CELO" width={16} height={16} className="inline-block" /></span> and receiving <span className="font-extrabold text-[#a855f7]">{totalVotes.toFixed(1)}</span> votes from the community.
      </p>
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="group/stat relative bg-white border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.4em_0.4em_0_#000000] p-6 text-center hover:shadow-[0.5em_0.5em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all">
          <div className="absolute -top-[0.8em] -right-[0.8em] w-[3em] h-[3em] bg-[#2563eb] rotate-45 z-[1]" />
          <div className="absolute top-[0.3em] right-[0.3em] text-white text-[1em] font-bold z-[2]">★</div>
          <div className="relative z-[2]">
            <div className="flex items-center justify-center mb-2"><Trophy className="h-6 w-6 text-[#2563eb]" /></div>
            <div className="text-3xl font-extrabold text-[#2563eb] mb-1">{project.campaignIds?.length || 0}</div>
            <div className="text-sm text-[#050505] font-extrabold uppercase tracking-[0.05em]">Campaigns</div>
          </div>
        </div>
        <div className="group/stat relative bg-white border-[0.35em] border-[#10b981] rounded-[0.6em] shadow-[0.4em_0.4em_0_#000000] p-6 text-center hover:shadow-[0.5em_0.5em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all">
          <div className="absolute -top-[0.8em] -right-[0.8em] w-[3em] h-[3em] bg-[#10b981] rotate-45 z-[1]" />
          <div className="absolute top-[0.3em] right-[0.3em] text-white text-[1em] font-bold z-[2]">★</div>
          <div className="relative z-[2]">
            <div className="flex items-center justify-center mb-2"><Coins className="h-6 w-6 text-[#10b981]" /></div>
            <div className="text-3xl font-extrabold text-[#10b981] mb-1 flex items-center justify-center gap-1">
              {totalFunding.toFixed(2)} <Image src="/images/celo.png" alt="CELO" width={24} height={24} className="inline-block" />
            </div>
            <div className="text-sm text-[#050505] font-extrabold uppercase tracking-[0.05em]">Total Funding</div>
          </div>
        </div>
        <div className="group/stat relative bg-white border-[0.35em] border-[#a855f7] rounded-[0.6em] shadow-[0.4em_0.4em_0_#000000] p-6 text-center hover:shadow-[0.5em_0.5em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all">
          <div className="absolute -top-[0.8em] -right-[0.8em] w-[3em] h-[3em] bg-[#a855f7] rotate-45 z-[1]" />
          <div className="absolute top-[0.3em] right-[0.3em] text-white text-[1em] font-bold z-[2]">★</div>
          <div className="relative z-[2]">
            <div className="flex items-center justify-center mb-2"><Vote className="h-6 w-6 text-[#a855f7]" /></div>
            <div className="text-3xl font-extrabold text-[#a855f7] mb-1">{totalVotes.toFixed(1)}</div>
            <div className="text-sm text-[#050505] font-extrabold uppercase tracking-[0.05em]">Total Votes</div>
          </div>
        </div>
      </div>
    </div>
  );
}

