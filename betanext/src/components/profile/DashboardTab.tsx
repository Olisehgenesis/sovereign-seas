'use client';

import { Plus, Trophy, Compass, TrendingUp, Star, Users, Zap, BarChart3 } from 'lucide-react';
import { formatEther } from 'viem';
import { StatCard } from './StatCard';
import { ButtonCool } from '@/components/ui/button-cool';

interface DashboardTabProps {
  navigate: (path: string) => void;
  userMetrics: {
    totalVoteValue: string;
    votes: number;
  };
  userProjects: Array<{ active: boolean }>;
  userCampaigns: Array<{ active: boolean }>;
  voteHistory: Array<{
    projectId: bigint;
    amount: bigint;
    token: string;
  }>;
  allProjects: Array<{ project: { id: bigint; name: string } }> | undefined;
  CELO_TOKEN: string;
}

export const DashboardTab = ({
  navigate,
  userMetrics,
  userProjects,
  userCampaigns,
  voteHistory,
  allProjects,
  CELO_TOKEN
}: DashboardTabProps) => {
  return (
    <div className="space-y-8">
      {/* Quick Actions */}
      <div className="group relative w-full mb-6">
        <div 
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
            backgroundSize: '0.5em 0.5em'
          }}
        />
        
        <div 
          className="relative bg-white border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2]"
          style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
        >
          <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
          <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
          
          <div 
            className="relative px-[1.5em] py-[1.4em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
            style={{ 
              background: '#2563eb',
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
              backgroundBlendMode: 'overlay'
            }}
          >
            <h2 className="text-lg font-extrabold text-white">Quick Actions</h2>
          </div>
          
          <div className="relative px-[1.5em] py-[1.5em] z-[2]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  title: 'New Project',
                  subtitle: 'Start building',
                  icon: Plus,
                  borderColor: '#2563eb',
                  bgColor: '#dbeafe',
                  action: () => navigate('/app/project/start')
                },
                {
                  title: 'New Campaign',
                  subtitle: 'Launch funding',
                  icon: Trophy,
                  borderColor: '#a855f7',
                  bgColor: '#f3e8ff',
                  action: () => navigate('/app/campaign/start')
                },
                {
                  title: 'Explore',
                  subtitle: 'Discover projects',
                  icon: Compass,
                  borderColor: '#10b981',
                  bgColor: '#d1fae5',
                  action: () => navigate('/explorer/campaigns')
                }
              ].map((action) => (
                <button
                  key={action.title}
                  onClick={action.action}
                  className="group/btn relative w-full"
                >
                  <div 
                    className="relative bg-white border-[0.25em] rounded-[0.4em] shadow-[0.4em_0.4em_0_#000000] transition-all overflow-hidden group-hover/btn:shadow-[0.5em_0.5em_0_#000000] group-hover/btn:-translate-x-[0.2em] group-hover/btn:-translate-y-[0.2em]"
                    style={{ 
                      borderColor: action.borderColor,
                      boxShadow: 'inset 0 0 0 0.1em rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    <div className="flex items-center gap-3 p-4" style={{ backgroundColor: action.bgColor }}>
                      <div 
                        className="w-10 h-10 rounded-[0.3em] flex items-center justify-center text-white border-[0.15em] border-[#050505]"
                        style={{ backgroundColor: action.borderColor }}
                      >
                        <action.icon className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-extrabold text-[#050505] uppercase tracking-[0.05em]">{action.title}</h3>
                        <p className="text-xs text-[#050505] font-semibold">{action.subtitle}</p>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={TrendingUp} 
          label="Total Value" 
          value={`${userMetrics.totalVoteValue} CELO`} 
          color="green"
        />
        <StatCard 
          icon={Star} 
          label="Avg. Vote" 
          value={`${userMetrics.votes > 0 ? (Number(userMetrics.totalVoteValue) / userMetrics.votes).toFixed(2) : '0.00'} CELO`} 
          color="yellow"
        />
        <StatCard 
          icon={Users} 
          label="Active Projects" 
          value={userProjects.filter(p => p.active).length}
          color="purple"
        />
        <StatCard 
          icon={Zap} 
          label="Active Campaigns" 
          value={userCampaigns.filter(c => c.active).length}
          color="blue"
        />
      </div>

      {/* Visual Analytics Section */}
      <div className="group relative w-full">
        <div 
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
            backgroundSize: '0.5em 0.5em'
          }}
        />
        
        <div 
          className="relative bg-white border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2]"
          style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
        >
          <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
          <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
          
          <div 
            className="relative px-[1.5em] py-[1.4em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
            style={{ 
              background: '#2563eb',
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
              backgroundBlendMode: 'overlay'
            }}
          >
            <h2 className="text-lg font-extrabold text-white">Analytics Overview</h2>
          </div>
          
          <div className="relative px-[1.5em] py-[1.5em] z-[2]">
            {/* Progress Bars */}
            <div className="space-y-4 mb-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[#050505] font-semibold">Project Completion</span>
                  <span className="font-extrabold text-[#2563eb]">
                    {userProjects.filter(p => p.active).length}/{userProjects.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 border-[0.1em] border-[#050505]">
                  <div 
                    className="bg-[#2563eb] h-3 rounded-full transition-all duration-200"
                    style={{ width: `${userProjects.length > 0 ? (userProjects.filter(p => p.active).length / userProjects.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[#050505] font-semibold">Campaign Success Rate</span>
                  <span className="font-extrabold text-[#a855f7]">
                    {userCampaigns.filter(c => c.active).length}/{userCampaigns.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 border-[0.1em] border-[#050505]">
                  <div 
                    className="bg-[#a855f7] h-3 rounded-full transition-all duration-200"
                    style={{ width: `${userCampaigns.length > 0 ? (userCampaigns.filter(c => c.active).length / userCampaigns.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[#050505] font-semibold">Voting Activity</span>
                  <span className="font-extrabold text-[#10b981]">{userMetrics.votes} votes</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 border-[0.1em] border-[#050505]">
                  <div 
                    className="bg-[#10b981] h-3 rounded-full transition-all duration-200"
                    style={{ width: `${Math.min(userMetrics.votes * 10, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Visual Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#dbeafe] border-[0.2em] border-[#2563eb] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#2563eb] font-semibold">Total Value</p>
                    <p className="text-xl font-extrabold text-[#050505]">{userMetrics.totalVoteValue} CELO</p>
                  </div>
                  <div className="w-10 h-10 bg-[#2563eb] rounded-[0.3em] flex items-center justify-center border-[0.15em] border-[#050505]">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-[#f3e8ff] border-[0.2em] border-[#a855f7] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#a855f7] font-semibold">Avg. Vote</p>
                    <p className="text-xl font-extrabold text-[#050505]">
                      {userMetrics.votes > 0 ? (Number(userMetrics.totalVoteValue) / userMetrics.votes).toFixed(2) : '0.00'} CELO
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-[#a855f7] rounded-[0.3em] flex items-center justify-center border-[0.15em] border-[#050505]">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="group relative w-full">
        <div 
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
            backgroundSize: '0.5em 0.5em'
          }}
        />
        
        <div 
          className="relative bg-white border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2]"
          style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
        >
          <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
          <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
          
          <div 
            className="relative px-[1.5em] py-[1.4em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
            style={{ 
              background: '#2563eb',
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
              backgroundBlendMode: 'overlay'
            }}
          >
            <h2 className="text-lg font-extrabold text-white">Recent Activity</h2>
          </div>
          
          <div className="relative px-[1.5em] py-[1.5em] z-[2]">
            <div className="space-y-3">
              {voteHistory.slice(0, 3).map((vote, index) => {
                const project = allProjects?.find(p => p.project.id === vote.projectId);
                
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 border-[0.15em] border-gray-200 rounded-[0.4em] hover:bg-gray-100 transition-colors duration-150"
                  >
                    <div className="w-2 h-2 bg-[#2563eb] rounded-full border-[0.1em] border-[#050505]"></div>
                    <div className="flex-1">
                      <span className="text-sm text-[#050505] font-semibold">
                        Voted {formatEther(BigInt(vote.amount))} {vote.token === CELO_TOKEN ? 'CELO' : 'cUSD'} on{' '}
                        <span className="font-extrabold">{project?.project.name || `Project #${vote.projectId}`}</span>
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 font-semibold">
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
              {voteHistory.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm font-semibold">
                  No recent activity
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

