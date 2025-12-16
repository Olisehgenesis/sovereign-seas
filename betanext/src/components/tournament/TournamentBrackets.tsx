import React, { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { useLeaderboard, useStageInfo, useStageCount } from '@/hooks/useTournamentMethods';
import { getTournamentContractAddress } from '@/utils/contractConfig';
import { formatEther } from 'viem';
import { useProjects } from '@/hooks/useProjectMethods';
import { getMainContractAddress } from '@/utils/contractConfig';
import { formatIpfsUrl } from '@/utils/imageUtils';
import Image from 'next/image';
import { ipfsImageLoader } from '@/utils/imageUtils';

interface TournamentBracketsProps {
  tournamentId: bigint;
  currentStage: number;
  stageCount: number;
  selectedStage?: number;
  isLoading?: boolean;
}

export function TournamentBrackets({
  tournamentId,
  currentStage,
  stageCount,
  selectedStage,
  isLoading
}: TournamentBracketsProps) {
  // Fix: Handle stage 0 correctly - use selectedStage if provided, otherwise use currentStage (which can be 0)
  const displayStage = selectedStage !== undefined ? selectedStage : currentStage;
  const contractAddress = getTournamentContractAddress();
  const mainContractAddress = getMainContractAddress();
  
  const { leaderboard, isLoading: leaderboardLoading } = useLeaderboard(
    contractAddress,
    tournamentId,
    BigInt(displayStage)
  );

  const { stage, isLoading: stageLoading } = useStageInfo(
    contractAddress,
    tournamentId,
    BigInt(displayStage)
  );

  // Fetch project details for all projects in leaderboard
  const projectIds = useMemo(() => leaderboard?.projectIds || [], [leaderboard]);
  const { projects, isLoading: projectsLoading } = useProjects(mainContractAddress, projectIds);

  // Create a map of projectId -> project details
  const projectMap = useMemo(() => {
    const map = new Map();
    if (projects) {
      projects.forEach(project => {
        map.set(project.project.id.toString(), project);
      });
    }
    return map;
  }, [projects]);

  // Helper to get project name and logo
  const getProjectInfo = (projectId: bigint) => {
    const project = projectMap.get(projectId.toString());
    if (!project) {
      return { name: `P${projectId.toString()}`, logo: null };
    }
    
    let logo = null;
    try {
      const additionalData = JSON.parse(project.metadata?.additionalData || '{}');
      const rawLogo = additionalData.media?.logo || additionalData.logo;
      logo = rawLogo ? formatIpfsUrl(rawLogo) : null;
    } catch {
      logo = null;
    }
    
    return {
      name: project.project?.name || `P${projectId.toString()}`,
      logo
    };
  };

  // Calculate bracket structure - retro playoff style
  // Each stage should show its own bracket with projects that are still in the tournament at that stage
  const calculateBracketStructure = useMemo(() => {
    if (!leaderboard || leaderboard.projectIds.length === 0) return [];
    
    const bracketTours: Array<Array<Array<[number, number]>>> = [];
    const allProjects = leaderboard.projectIds;
    
    // For each stage, show only ONE round (the current stage's matchups)
    // The bracket should match the number of projects at this stage
    const pairsInRound = Math.ceil(allProjects.length / 2);
    const groups: Array<Array<[number, number]>> = [];
    
    // Group pairs (2 pairs per group for better layout)
    for (let i = 0; i < pairsInRound; i += 2) {
      const group: Array<[number, number]> = [];
      
      // First pair
      const pair1Left = i * 2;
      const pair1Right = pair1Left + 1;
      if (pair1Left < allProjects.length) {
        group.push([pair1Left, pair1Right < allProjects.length ? pair1Right : -1]);
      }
      
      // Second pair (if exists)
      if (i + 1 < pairsInRound) {
        const pair2Left = (i + 1) * 2;
        const pair2Right = pair2Left + 1;
        if (pair2Left < allProjects.length) {
          group.push([pair2Left, pair2Right < allProjects.length ? pair2Right : -1]);
        }
      }
      
      if (group.length > 0) {
        groups.push(group);
      }
    }
    
    // Only one round per stage - the bracket matches the current stage's projects
    if (groups.length > 0) {
      bracketTours.push(groups);
    }
    
    return bracketTours;
  }, [leaderboard, displayStage]);

  if (isLoading || leaderboardLoading || stageLoading || projectsLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4 text-[#050505] uppercase tracking-[0.05em]">Tournament Brackets</h2>
        <div className="bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] p-8">
          <div className="text-center text-gray-500">Loading brackets...</div>
        </div>
      </div>
    );
  }

  if (!leaderboard || leaderboard.projectIds.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4 text-[#050505] uppercase tracking-[0.05em]">Tournament Brackets - Stage {displayStage}</h2>
        <div className="bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] p-8">
          <div className="text-center text-gray-500">No bracket data available for this stage</div>
        </div>
      </div>
    );
  }

  const bracketTours = calculateBracketStructure;

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold mb-4 text-[#050505] uppercase tracking-[0.05em]">
        Tournament Brackets - Stage {displayStage}
      </h2>
      
      {/* Stage Info - Compact */}
      {stage && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <div className="bg-white border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.15em_0.15em_0_#000000] p-2">
            <div className="text-[10px] font-semibold text-gray-600 uppercase">Status</div>
            <div className="text-sm font-bold text-[#050505]">
              {stage.finalized ? 'Finalized' : stage.started ? 'Active' : 'Not Started'}
            </div>
          </div>
          <div className="bg-white border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.15em_0.15em_0_#000000] p-2">
            <div className="text-[10px] font-semibold text-gray-600 uppercase">Reward Pool</div>
            <div className="text-sm font-bold text-[#050505]">
              {stage.rewardPool > 0n ? formatEther(stage.rewardPool) : '0'}
            </div>
          </div>
          <div className="bg-white border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.15em_0.15em_0_#000000] p-2">
            <div className="text-[10px] font-semibold text-gray-600 uppercase">Elimination %</div>
            <div className="text-sm font-bold text-[#050505]">
              {Number(stage.eliminationPercentage)}%
            </div>
          </div>
          <div className="bg-white border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.15em_0.15em_0_#000000] p-2">
            <div className="text-[10px] font-semibold text-gray-600 uppercase">Projects</div>
            <div className="text-sm font-bold text-[#050505]">
              {leaderboard.projectIds.length}
            </div>
          </div>
        </div>
      )}

      {/* Retro Playoff Bracket */}
      <div className="bg-[#f5f5f5] border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] p-4 overflow-x-auto">
        <div className="playoff-table-content" style={{ display: 'flex', padding: '10px', fontFamily: 'sans-serif', minWidth: '600px' }}>
          {bracketTours.map((tour, tourIdx) => {
            const isFinalRound = tourIdx === bracketTours.length - 1;
            
            return (
              <div 
                key={tourIdx} 
                className="playoff-table-tour"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexDirection: 'column',
                  justifyContent: 'space-around',
                  position: 'relative'
                }}
              >
                {tour.map((group, groupIdx) => (
                  <div
                    key={groupIdx}
                    className="playoff-table-group"
                    style={{
                      paddingRight: isFinalRound ? '0' : '11px',
                      paddingLeft: tourIdx === 0 ? '0' : '10px',
                      marginBottom: '10px',
                      position: 'relative',
                      overflow: 'hidden',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      flexDirection: 'column',
                      justifyContent: 'space-around'
                    }}
                  >
                    {group.map((pair, pairIdx) => {
                      const [leftIdx, rightIdx] = pair;
                      const leftProjectId = leftIdx >= 0 ? leaderboard.projectIds[leftIdx] : null;
                      const rightProjectId = rightIdx >= 0 ? leaderboard.projectIds[rightIdx] : null;
                      const leftPower = leftIdx >= 0 ? leaderboard.powers[leftIdx] : 0n;
                      const rightPower = rightIdx >= 0 ? leaderboard.powers[rightIdx] : 0n;
                      
                      const leftInfo = leftProjectId ? getProjectInfo(leftProjectId) : null;
                      const rightInfo = rightProjectId ? getProjectInfo(rightProjectId) : null;
                      
                      return (
                        <div
                          key={pairIdx}
                          className="playoff-table-pair"
                          style={{
                            position: 'relative',
                            border: '1px solid #050505',
                            backgroundColor: 'white',
                            width: '160px',
                            marginBottom: '10px',
                            boxShadow: '0.15em 0.15em 0 #000000'
                          }}
                        >
                          {/* Connector line to right */}
                          {!isFinalRound && (
                            <>
                              <div
                                style={{
                                  content: '""',
                                  position: 'absolute',
                                  top: '13px',
                                  right: '-12px',
                                  width: '12px',
                                  height: '1px',
                                  backgroundColor: '#050505',
                                  zIndex: 2
                                }}
                              />
                              <div
                                style={{
                                  content: '""',
                                  position: 'absolute',
                                  width: '2px',
                                  height: '1000px',
                                  backgroundColor: '#f5f5f5',
                                  right: '-12px',
                                  zIndex: 1,
                                  ...(pairIdx % 2 === 0 ? { bottom: '14px' } : { top: '14px' })
                                }}
                              />
                            </>
                          )}
                          
                          {/* Left player */}
                          <div
                            className="playoff-table-left-player"
                            style={{
                              minHeight: '32px',
                              padding: '4px 5px',
                              borderBottom: '1px solid #050505',
                              fontSize: '10px',
                              fontWeight: 'bold',
                              color: '#050505',
                              backgroundColor: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {leftInfo ? (
                              <>
                                {leftInfo.logo ? (
                                  <div className="w-5 h-5 rounded-full border-[0.1em] border-[#050505] overflow-hidden flex-shrink-0">
                                    <Image
                                      loader={ipfsImageLoader}
                                      src={leftInfo.logo}
                                      alt={leftInfo.name}
                                      width={20}
                                      height={20}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-[0.1em] border-[#050505] bg-[#a855f7] flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-[8px] font-bold">{leftInfo.name.charAt(0).toUpperCase()}</span>
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="truncate">{leftInfo.name}</div>
                                  <div className="text-[8px] text-gray-600">{formatEther(leftPower)}</div>
                                </div>
                              </>
                            ) : '—'}
                          </div>
                          
                          {/* Right player */}
                          <div
                            className="playoff-table-right-player"
                            style={{
                              minHeight: '32px',
                              padding: '4px 5px',
                              marginTop: '-1px',
                              borderTop: '1px solid #050505',
                              fontSize: '10px',
                              fontWeight: 'bold',
                              color: '#050505',
                              backgroundColor: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {rightInfo ? (
                              <>
                                {rightInfo.logo ? (
                                  <div className="w-5 h-5 rounded-full border-[0.1em] border-[#050505] overflow-hidden flex-shrink-0">
                                    <Image
                                      loader={ipfsImageLoader}
                                      src={rightInfo.logo}
                                      alt={rightInfo.name}
                                      width={20}
                                      height={20}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-[0.1em] border-[#050505] bg-[#a855f7] flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-[8px] font-bold">{rightInfo.name.charAt(0).toUpperCase()}</span>
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="truncate">{rightInfo.name}</div>
                                  <div className="text-[8px] text-gray-600">{formatEther(rightPower)}</div>
                                </div>
                              </>
                            ) : '—'}
                          </div>
                          
                          {/* Connector line from left */}
                          {tourIdx > 0 && !isFinalRound && (
                            <div
                              style={{
                                content: '""',
                                position: 'absolute',
                                bottom: '13px',
                                left: '-12px',
                                width: '12px',
                                height: '1px',
                                backgroundColor: '#050505',
                                zIndex: 2
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Vertical connector line */}
                    {!isFinalRound && (
                      <div
                        style={{
                          content: '""',
                          position: 'absolute',
                          top: '14px',
                          bottom: '15px',
                          right: '0px',
                          width: '1px',
                          backgroundColor: '#050505',
                          zIndex: 1
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

