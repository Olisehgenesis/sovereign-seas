'use client';

import { Vote, DollarSign, BarChart3, Trophy } from 'lucide-react';
import { formatEther } from 'viem';
import { ButtonCool } from '@/components/ui/button-cool';
import Image from 'next/image';

interface VoteHistoryItem {
  projectId: bigint;
  campaignId: bigint;
  amount: bigint;
  celoEquivalent: bigint;
  token: string;
}

interface VotesTabProps {
  userMetrics: {
    votes: number;
    totalVoteValue: string;
  };
  voteHistory: VoteHistoryItem[];
  allProjects: Array<{ project: { id: bigint; name: string } }> | undefined;
  allCampaigns: Array<{ campaign: { id: bigint; name: string } }> | undefined;
  CELO_TOKEN: string;
  navigate: (path: string) => void;
  getProjectRoute: (id: number) => string;
  getCampaignRoute: (id: number) => string;
}

export const VotesTab = ({
  userMetrics,
  voteHistory,
  allProjects,
  allCampaigns,
  CELO_TOKEN,
  navigate,
  getProjectRoute,
  getCampaignRoute
}: VotesTabProps) => {
  return (
    <div className="space-y-4">
      {/* Voting Summary */}
      <div className="group relative w-full">
        <div 
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
            backgroundSize: '0.5em 0.5em'
          }}
        />
        
        <div 
          className="relative bg-white border-[0.35em] border-[#10b981] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2]"
          style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
        >
          <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#10b981] rotate-45 z-[1]" />
          <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
          
          <div 
            className="relative px-[1.5em] py-[1.4em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
            style={{ 
              background: '#10b981',
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
              backgroundBlendMode: 'overlay'
            }}
          >
            <h2 className="text-lg font-extrabold text-white">Voting Summary</h2>
          </div>
          
          <div className="relative px-[1.5em] py-[1.5em] z-[2]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-[#d1fae5] border-[0.2em] border-[#10b981] rounded-[0.4em] p-3 shadow-[0.2em_0.2em_0_#000000]">
                <div className="flex items-center gap-2 mb-1">
                  <Vote className="h-4 w-4 text-[#10b981]" />
                  <span className="font-extrabold text-[#065f46] text-sm uppercase tracking-[0.05em]">Total Votes</span>
                </div>
                <p className="text-xl font-extrabold text-[#10b981]">{userMetrics.votes}</p>
              </div>
              
              <div className="bg-[#dbeafe] border-[0.2em] border-[#2563eb] rounded-[0.4em] p-3 shadow-[0.2em_0.2em_0_#000000]">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-[#2563eb]" />
                  <span className="font-extrabold text-[#1e40af] text-sm uppercase tracking-[0.05em]">Total Value</span>
                </div>
                <p className="text-xl font-extrabold text-[#2563eb] flex items-center gap-1">
                  {userMetrics.totalVoteValue} <Image src="/images/celo.png" alt="CELO" width={20} height={20} className="inline-block" />
                </p>
              </div>
              
              <div className="bg-[#f3e8ff] border-[0.2em] border-[#a855f7] rounded-[0.4em] p-3 shadow-[0.2em_0.2em_0_#000000]">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="h-4 w-4 text-[#a855f7]" />
                  <span className="font-extrabold text-[#6b21a8] text-sm uppercase tracking-[0.05em]">Avg. Vote</span>
                </div>
                <p className="text-xl font-extrabold text-[#a855f7] flex items-center gap-1">
                  {userMetrics.votes > 0 ? (Number(userMetrics.totalVoteValue) / userMetrics.votes).toFixed(2) : '0.00'} <Image src="/images/celo.png" alt="CELO" width={20} height={20} className="inline-block" />
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Votes Table */}
      {voteHistory.length > 0 && (
        <div className="group relative w-full">
          <div 
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
              backgroundSize: '0.5em 0.5em'
            }}
          />
          
          <div 
            className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2]"
            style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr 
                    className="bg-[#2563eb] text-white border-b-[0.2em] border-[#050505]"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
                      backgroundBlendMode: 'overlay'
                    }}
                  >
                    <th className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-[0.1em]">Project</th>
                    <th className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-[0.1em]">Campaign</th>
                    <th className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-[0.1em]">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-[0.1em]">CELO Equivalent</th>
                    <th className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-[0.1em]">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {voteHistory.map((vote, index) => {
                    const project = allProjects?.find(p => p.project.id === vote.projectId);
                    const campaign = allCampaigns?.find(c => c.campaign.id === vote.campaignId);
                    
                    return (
                      <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 bg-[#2563eb] rounded-[0.3em] flex items-center justify-center text-white text-sm font-extrabold border-[0.15em] border-[#050505] mr-3">
                              {project?.project.name?.charAt(0) || 'P'}
                            </div>
                            <div>
                              <div className="text-sm font-extrabold text-[#050505]">
                                {project?.project.name || `Project #${vote.projectId}`}
                              </div>
                              <div className="text-xs text-gray-500 font-semibold">
                                ID: {vote.projectId.toString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 bg-[#a855f7] rounded-[0.3em] flex items-center justify-center text-white border-[0.15em] border-[#050505] mr-3">
                              <Trophy className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="text-sm font-extrabold text-[#050505]">
                                {campaign?.campaign.name || `Campaign #${vote.campaignId}`}
                              </div>
                              <div className="text-xs text-gray-500 font-semibold">
                                ID: {vote.campaignId.toString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-sm font-extrabold text-[#10b981]">
                            {formatEther(BigInt(vote.amount))} {vote.token === CELO_TOKEN ? (
                              <Image src="/images/celo.png" alt="CELO" width={16} height={16} className="inline-block" />
                            ) : 'cUSD'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-sm font-extrabold text-[#050505]">
                            {formatEther(BigInt(vote.celoEquivalent))} <Image src="/images/celo.png" alt="CELO" width={16} height={16} className="inline-block" />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => navigate(getProjectRoute(Number(vote.projectId)))}
                              className="px-3 py-1 bg-[#dbeafe] text-[#2563eb] rounded-[0.3em] hover:bg-[#bfdbfe] transition-colors duration-150 text-xs font-extrabold border-[0.15em] border-[#2563eb] shadow-[0.1em_0.1em_0_#000000] uppercase tracking-[0.05em]"
                            >
                              View Project
                            </button>
                            <button
                              onClick={() => navigate(getCampaignRoute(Number(vote.campaignId)))}
                              className="px-3 py-1 bg-[#f3e8ff] text-[#a855f7] rounded-[0.3em] hover:bg-[#e9d5ff] transition-colors duration-150 text-xs font-extrabold border-[0.15em] border-[#a855f7] shadow-[0.1em_0.1em_0_#000000] uppercase tracking-[0.05em]"
                            >
                              View Campaign
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {voteHistory.length === 0 && (
        <div className="group relative w-full">
          <div 
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
              backgroundSize: '0.5em 0.5em'
            }}
          />
          
          <div 
            className="relative bg-white border-[0.35em] border-[#10b981] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2] text-center py-8"
            style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
          >
            <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#10b981] rotate-45 z-[1]" />
            <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
            
            <div className="relative z-[2]">
              <Vote className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-extrabold text-[#050505] mb-2 uppercase tracking-[0.05em]">No Votes Cast Yet</h3>
              <p className="text-gray-600 mb-4 text-sm font-semibold">Start participating by voting on projects you believe in.</p>
              <ButtonCool
                onClick={() => navigate('/explorer/projects')}
                text="Explore Projects"
                bgColor="#10b981"
                hoverBgColor="#059669"
                textColor="#ffffff"
                borderColor="#050505"
                size="md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

