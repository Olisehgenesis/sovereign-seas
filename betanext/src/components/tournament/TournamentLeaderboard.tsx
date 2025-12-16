import React from 'react';
import { Trophy, Award, Medal, BarChart3 } from 'lucide-react';
import { useLeaderboard } from '@/hooks/useTournamentMethods';
import { getTournamentContractAddress } from '@/utils/contractConfig';
import { formatEther } from 'viem';

interface TournamentLeaderboardProps {
  tournamentId: bigint;
  stageNumber: bigint;
  isLoading?: boolean;
}

export function TournamentLeaderboard({ 
  tournamentId, 
  stageNumber,
  isLoading 
}: TournamentLeaderboardProps) {
  const { leaderboard, isLoading: leaderboardLoading } = useLeaderboard(
    getTournamentContractAddress(),
    tournamentId,
    stageNumber
  );

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Award className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-orange-500" />;
    return <BarChart3 className="w-5 h-5 text-gray-400" />;
  };

  if (leaderboardLoading || isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-[#050505]">Leaderboard</h2>
        <div className="bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] p-4">
          <div className="text-center text-gray-500">Loading leaderboard...</div>
        </div>
      </div>
    );
  }

  if (!leaderboard || leaderboard.projectIds.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-[#050505]">Leaderboard</h2>
        <div className="bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] p-4">
          <div className="text-center text-gray-500">No leaderboard data available yet</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4 text-[#050505]">Leaderboard - Stage {stageNumber.toString()}</h2>
      <div className="bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] overflow-hidden">
        <div className="divide-y divide-gray-200">
          {leaderboard.projectIds.map((projectId, index) => {
            const rank = index + 1;
            const power = leaderboard.powers[index];
            return (
              <div
                key={projectId.toString()}
                className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center">
                    {getRankIcon(rank)}
                  </div>
                  <div>
                    <div className="font-bold text-[#050505]">#{rank}</div>
                    <div className="text-sm text-gray-600">Project #{projectId.toString()}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#050505]">{formatEther(power)}</div>
                  <div className="text-xs text-gray-600">Power</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

