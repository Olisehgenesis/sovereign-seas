import React from 'react';
import { Trophy, Users, Award, BarChart3 } from 'lucide-react';
import type { Tournament } from '@/hooks/useTournamentMethods';

interface TournamentStatsProps {
  tournament: Tournament;
  projectCount: number;
  stageCount: number;
  currentStage: number;
  isLoading?: boolean;
}

export function TournamentStats({ 
  tournament, 
  projectCount, 
  stageCount, 
  currentStage,
  isLoading 
}: TournamentStatsProps) {
  const stats = [
    {
      label: 'Projects',
      value: projectCount.toString(),
      icon: Users,
      color: '#a855f7'
    },
    {
      label: 'Total Stages',
      value: stageCount.toString(),
      icon: BarChart3,
      color: '#a855f7'
    },
    {
      label: 'Current Stage',
      value: currentStage > 0 ? currentStage.toString() : 'Not Started',
      icon: Award,
      color: '#a855f7'
    },
    {
      label: 'Campaign ID',
      value: tournament.sovseasCampaignId.toString(),
      icon: Trophy,
      color: '#a855f7'
    }
  ];

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="group relative bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] p-4 transition-all duration-200 hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em]"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 flex items-center justify-center border-[0.15em] border-[#050505] rounded-[0.3em]"
                  style={{ backgroundColor: stat.color }}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {stat.label}
                  </div>
                  <div className="text-lg font-bold text-[#050505]">
                    {isLoading ? '...' : stat.value}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

