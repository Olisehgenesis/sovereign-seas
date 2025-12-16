'use client';

import { useState, useEffect, useMemo } from 'react';
import { Trophy, Plus, Trash2, AlertCircle, CheckCircle, Users, TrendingDown, Clock, Calendar } from 'lucide-react';
import { ButtonCool } from '@/components/ui/button-cool';
import { 
  MobileDialog as Dialog,
  MobileDialogContent as DialogContent,
  MobileDialogHeader as DialogHeader,
  MobileDialogDescription as DialogDescription,
} from '@/components/ui/mobile-dialog';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import type { Tournament } from '@/hooks/useTournamentMethods';
import { useStartTournament, useScheduleNextStage, useTournamentProjects, useApprovedProjects } from '@/hooks/useTournamentMethods';
import { getTournamentContractAddress } from '@/utils/contractConfig';

interface StageConfig {
  eliminationPercentage: number;
  estimatedRemaining: number;
  scheduleForFuture: boolean;
  scheduledStartDateTime: string; // ISO datetime string
  scheduledStartTimestamp?: bigint; // Unix timestamp in seconds
}

interface StartTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  onSuccess?: () => void;
}

export default function StartTournamentModal({
  isOpen,
  onClose,
  tournament,
  onSuccess
}: StartTournamentModalProps) {
  const contractAddress = getTournamentContractAddress();
  const { approvedProjectIds, isLoading: approvedLoading } = useApprovedProjects(contractAddress, tournament.id);
  const { startTournament, isPending: isStarting, isSuccess: startSuccess } = useStartTournament(contractAddress);
  const { scheduleNextStage, isPending: isScheduling } = useScheduleNextStage(contractAddress);

  // Calculate default scheduled time for each stage (after previous stage ends)
  const getDefaultScheduledTime = (stageIndex: number): string => {
    const now = new Date();
    // Stage 0 starts immediately, so stage 1 starts after stage duration
    const stageDurationMs = Number(tournament.stageDuration) * 1000;
    const defaultTime = new Date(now.getTime() + (stageIndex * stageDurationMs) + stageDurationMs);
    return defaultTime.toISOString().slice(0, 16); // Format for datetime-local input
  };

  const [stages, setStages] = useState<StageConfig[]>([
    { 
      eliminationPercentage: 20, 
      estimatedRemaining: 0,
      scheduleForFuture: false,
      scheduledStartDateTime: getDefaultScheduledTime(0)
    }
  ]);
  const [error, setError] = useState('');

  const approvedCount = approvedProjectIds?.length || 0;

  // Calculate remaining projects after each stage
  const calculateRemaining = useMemo(() => {
    let remaining = approvedCount;
    return stages.map(stage => {
      const eliminated = Math.floor(remaining * (stage.eliminationPercentage / 100));
      remaining = Math.max(remaining - eliminated, 0);
      return remaining;
    });
  }, [stages, approvedCount]);

  // Update estimated remaining for each stage - recalculate when stages change
  useEffect(() => {
    let remaining = approvedCount;
    setStages(prev => prev.map((stage) => {
      const eliminated = Math.floor(remaining * (stage.eliminationPercentage / 100));
      remaining = Math.max(remaining - eliminated, 0);
      return {
        ...stage,
        estimatedRemaining: remaining
      };
    }));
  }, [approvedCount, stages.length, stages.map(s => s.eliminationPercentage).join(',')]);

  // Validate stages
  const validation = useMemo(() => {
    if (approvedCount < 2) {
      return {
        valid: false,
        message: 'Need at least 2 approved projects to start tournament'
      };
    }

    const finalRemaining = calculateRemaining[calculateRemaining.length - 1];
    if (finalRemaining < 2) {
      return {
        valid: false,
        message: 'At least 2 projects must remain after all eliminations'
      };
    }

    // Check if any stage eliminates too many
    const tooAggressive = stages.some((stage, index) => {
      const remaining = index === 0 
        ? approvedCount 
        : calculateRemaining[index - 1];
      const eliminated = Math.floor(remaining * (stage.eliminationPercentage / 100));
      return remaining - eliminated < 2 && remaining > 2;
    });

    if (tooAggressive) {
      return {
        valid: false,
        message: 'One or more stages would eliminate too many projects'
      };
    }

    // Validate scheduled times are in the future
    const now = Math.floor(Date.now() / 1000);
    const invalidSchedule = stages.some((stage, index) => {
      if (!stage.scheduleForFuture || index === 0) return false; // Stage 0 starts immediately
      if (!stage.scheduledStartTimestamp) return true;
      return stage.scheduledStartTimestamp <= BigInt(now);
    });

    if (invalidSchedule) {
      return {
        valid: false,
        message: 'Scheduled start times must be in the future'
      };
    }

    return { valid: true, message: '' };
  }, [approvedCount, stages, calculateRemaining]);

  const handleAddStage = () => {
    const lastRemaining = calculateRemaining[calculateRemaining.length - 1];
    if (lastRemaining <= 2) {
      setError('Cannot add more stages - not enough projects remaining');
      return;
    }
    
    // Suggest a safe percentage (20-30%)
    const suggestedPercentage = lastRemaining <= 4 ? 25 : 20;
    setStages([...stages, { 
      eliminationPercentage: suggestedPercentage, 
      estimatedRemaining: 0,
      scheduleForFuture: false,
      scheduledStartDateTime: getDefaultScheduledTime(stages.length)
    }]);
    setError('');
  };

  const handleRemoveStage = (index: number) => {
    if (stages.length === 1) {
      setError('At least one stage is required');
      return;
    }
    // Remove stage and recalculate remaining projects
    const newStages = stages.filter((_, i) => i !== index);
    setStages(newStages);
    setError('');
  };

  const handlePercentageChange = (index: number, value: number[]) => {
    const newStages = [...stages];
    newStages[index].eliminationPercentage = value[0];
    setStages(newStages);
    setError('');
  };

  const handleScheduleToggle = (index: number, schedule: boolean) => {
    const newStages = [...stages];
    newStages[index].scheduleForFuture = schedule;
    if (!schedule) {
      newStages[index].scheduledStartTimestamp = undefined;
    } else {
      // Convert datetime-local string to Unix timestamp
      const date = new Date(newStages[index].scheduledStartDateTime);
      newStages[index].scheduledStartTimestamp = BigInt(Math.floor(date.getTime() / 1000));
    }
    setStages(newStages);
    setError('');
  };

  const handleDateTimeChange = (index: number, dateTimeString: string) => {
    const newStages = [...stages];
    newStages[index].scheduledStartDateTime = dateTimeString;
    // Convert datetime-local string to Unix timestamp
    const date = new Date(dateTimeString);
    newStages[index].scheduledStartTimestamp = BigInt(Math.floor(date.getTime() / 1000));
    setStages(newStages);
    setError('');
  };

  // Calculate estimated start times for each stage
  const getEstimatedStartTime = (stageIndex: number): string => {
    if (stageIndex === 0) {
      return 'Immediately';
    }

    const stage = stages[stageIndex];
    if (!stage.scheduleForFuture) {
      return 'After previous stage ends';
    }

    if (stage.scheduledStartDateTime) {
      const date = new Date(stage.scheduledStartDateTime);
      return date.toLocaleString();
    }

    return 'Not set';
  };

  const handleStart = async () => {
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    setError('');
    try {
      // Start tournament (creates stage 0 automatically)
      await startTournament({ tournamentId: tournament.id });
      
      // Wait for transaction to be mined
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Schedule future stages if configured
      // Note: We can only schedule after stage 0 is finalized, so we'll need to
      // schedule these stages later when the previous stage is finalized.
      // For now, we just start the tournament and stages will be scheduled manually
      // or through the UI when previous stages finalize.
      
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err?.shortMessage || err?.message || 'Failed to start tournament');
    }
  };

  useEffect(() => {
    if (startSuccess) {
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    }
  }, [startSuccess, onSuccess, onClose]);

  // Calculate bracket structure - playoff style (memoized for performance)
  const calculateBracketStructure = useMemo(() => {
    const bracketTours: Array<Array<Array<[number, number]>>> = [];
    
    // Build rounds from stages - use current stages array
    stages.forEach((stage, stageIdx) => {
      const projectsBefore = stageIdx === 0 ? approvedCount : calculateRemaining[stageIdx - 1];
      
      // Only create bracket if we have projects
      if (projectsBefore <= 0) return;
      
      // Create pairs for this round
      const pairsInRound = Math.ceil(projectsBefore / 2);
      const groups: Array<Array<[number, number]>> = [];
      
      // Group pairs (2 pairs per group for better layout)
      for (let i = 0; i < pairsInRound; i += 2) {
        const group: Array<[number, number]> = [];
        
        // First pair
        const pair1Left = i * 2;
        const pair1Right = pair1Left + 1;
        if (pair1Left < projectsBefore) {
          group.push([pair1Left, pair1Right < projectsBefore ? pair1Right : -1]);
        }
        
        // Second pair (if exists)
        if (i + 1 < pairsInRound) {
          const pair2Left = (i + 1) * 2;
          const pair2Right = pair2Left + 1;
          if (pair2Left < projectsBefore) {
            group.push([pair2Left, pair2Right < projectsBefore ? pair2Right : -1]);
          }
        }
        
        if (group.length > 0) {
          groups.push(group);
        }
      }
      
      if (groups.length > 0) {
        bracketTours.push(groups);
      }
    });
    
    return bracketTours;
  }, [stages, approvedCount, calculateRemaining]);

  if (!isOpen) return null;

  // Bracket visualization component - Retro Playoff Style
  const BracketVisualization = () => {
    const bracketTours = calculateBracketStructure;
    
    // Don't render if no stages
    if (stages.length === 0) {
      return (
        <div className="h-full flex items-center justify-center p-2" style={{ backgroundColor: '#f5f5f5' }}>
          <div className="text-xs font-bold text-[#050505] uppercase tracking-wider" style={{ fontFamily: 'sans-serif' }}>
            Add stages to see bracket
          </div>
        </div>
      );
    }
    
    return (
      <div className="h-full overflow-auto p-2" style={{ backgroundColor: '#f5f5f5' }}>
        <div className="text-xs font-bold text-[#050505] uppercase mb-2 text-center tracking-wider" style={{ fontFamily: 'sans-serif' }}>
          Tournament Bracket
        </div>
        <div className="playoff-table-content" style={{ display: 'flex', padding: '10px', fontFamily: 'sans-serif' }}>
          {bracketTours.map((tour, tourIdx) => {
            const projectsBefore = tourIdx === 0 ? approvedCount : calculateRemaining[tourIdx - 1];
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
                      const leftProject = leftIdx >= 0 ? `P${leftIdx + 1}` : '';
                      const rightProject = rightIdx >= 0 ? `P${rightIdx + 1}` : '';
                      
                      return (
                        <div
                          key={pairIdx}
                          className="playoff-table-pair"
                          style={{
                            position: 'relative',
                            border: '1px solid #050505',
                            backgroundColor: 'white',
                            width: '120px',
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
                              minHeight: '20px',
                              padding: '3px 5px',
                              borderBottom: '1px solid #050505',
                              fontSize: '10px',
                              fontWeight: 'bold',
                              color: '#050505',
                              backgroundColor: 'white'
                            }}
                          >
                            {leftProject || '—'}
                          </div>
                          
                          {/* Right player */}
                          <div
                            className="playoff-table-right-player"
                            style={{
                              minHeight: '20px',
                              padding: '3px 5px',
                              marginTop: '-1px',
                              borderTop: '1px solid #050505',
                              fontSize: '10px',
                              fontWeight: 'bold',
                              color: '#050505',
                              backgroundColor: 'white'
                            }}
                          >
                            {rightProject || '—'}
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
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden bg-white border-[0.35em] border-[#10b981] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] p-0 [&>button]:hidden relative">
        {/* Pattern Grid Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-30 z-[1]"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
            backgroundSize: '0.5em 0.5em'
          }}
        />

        {/* Accent Corner */}
        <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#10b981] rotate-45 z-[1]" />
        <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">⚔</div>

        <DialogHeader className="relative px-[1em] pt-[1em] pb-[0.8em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2] overflow-hidden"
          style={{ 
            background: '#10b981',
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
            backgroundBlendMode: 'overlay'
          }}
        >
          <div className="relative z-10 flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            <DialogDescription className="text-white text-lg font-extrabold uppercase tracking-[0.05em]">
              Start Tournament #{tournament.id.toString()}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Two Column Layout */}
        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-0 z-[2] h-[calc(90vh-80px)]">
          {/* Left Side - Configuration */}
          <div className="overflow-y-auto px-[1em] pb-[1em] space-y-3 border-r-[0.2em] border-gray-300">
            {/* Tournament Info - Compact */}
            <div className="grid grid-cols-2 gap-2 pt-3">
              <div className="flex items-center gap-2 p-2 bg-gray-50 border-[0.15em] border-[#050505] rounded-[0.3em]">
                <div className="w-6 h-6 flex items-center justify-center bg-[#10b981] border-[0.1em] border-[#050505] rounded-[0.2em]">
                  <Users className="w-3 h-3 text-white" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-gray-600 uppercase">Projects</div>
                  <div className="text-sm font-bold text-[#050505]">
                    {approvedLoading ? '...' : approvedCount}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 border-[0.15em] border-[#050505] rounded-[0.3em]">
                <div className="w-6 h-6 flex items-center justify-center bg-[#a855f7] border-[0.1em] border-[#050505] rounded-[0.2em]">
                  <TrendingDown className="w-3 h-3 text-white" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-gray-600 uppercase">Stages</div>
                  <div className="text-sm font-bold text-[#050505]">{stages.length}</div>
                </div>
              </div>
            </div>

            {/* Stages Configuration */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#050505] uppercase tracking-[0.05em]">Stages</h3>
                <button
                  onClick={handleAddStage}
                  disabled={calculateRemaining[calculateRemaining.length - 1] <= 2}
                  className="px-2 py-1 text-xs font-bold bg-[#a855f7] text-white border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.15em_0.15em_0_#000000] hover:shadow-[0.2em_0.2em_0_#000000] hover:-translate-x-[0.05em] hover:-translate-y-[0.05em] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-3 h-3 inline mr-1" />
                  Add
                </button>
              </div>

              {stages.map((stage, index) => {
                const remainingBefore = index === 0 ? approvedCount : calculateRemaining[index - 1];
                const remainingAfter = calculateRemaining[index];
                const eliminated = remainingBefore - remainingAfter;

                return (
                  <div 
                    key={index}
                    className="p-2 bg-white border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.15em_0.15em_0_#000000]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 flex items-center justify-center bg-[#a855f7] text-white text-xs font-bold border-[0.1em] border-[#050505] rounded-[0.2em]">
                          {index}
                        </div>
                        <span className="text-sm font-bold text-[#050505]">Stage {index}</span>
                      </div>
                      {stages.length > 1 && (
                        <button
                          onClick={() => handleRemoveStage(index)}
                          className="p-1 hover:bg-red-50 rounded-[0.2em] transition-colors"
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {/* Elimination Percentage - Compact */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-[#050505] uppercase tracking-[0.05em]">
                            Elim %
                          </label>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={stage.eliminationPercentage}
                              onChange={(e) => {
                                const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                handlePercentageChange(index, [value]);
                              }}
                              className="w-12 h-6 text-xs text-center border-[0.1em] border-[#050505] rounded-[0.2em] font-bold"
                              min="0"
                              max="100"
                            />
                            <span className="text-xs font-bold text-[#050505]">%</span>
                          </div>
                        </div>
                        <Slider
                          value={[stage.eliminationPercentage]}
                          onValueChange={(value) => handlePercentageChange(index, value)}
                          min={0}
                          max={index === stages.length - 1 && remainingBefore <= 4 ? 50 : 50}
                          step={1}
                          className="w-full h-2"
                        />
                      </div>

                      {/* Schedule Timing - Compact */}
                      {index > 0 && (
                        <div className="pt-1 border-t-[0.1em] border-gray-300">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold text-[#050505] uppercase flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Timing
                            </label>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleScheduleToggle(index, false)}
                                className={`px-1.5 py-0.5 text-[10px] font-bold rounded-[0.2em] border-[0.1em] border-[#050505] transition-all ${
                                  !stage.scheduleForFuture
                                    ? 'bg-[#10b981] text-white shadow-[0.1em_0.1em_0_#000000]'
                                    : 'bg-white text-[#050505] hover:bg-gray-50'
                                }`}
                              >
                                Now
                              </button>
                              <button
                                type="button"
                                onClick={() => handleScheduleToggle(index, true)}
                                className={`px-1.5 py-0.5 text-[10px] font-bold rounded-[0.2em] border-[0.1em] border-[#050505] transition-all ${
                                  stage.scheduleForFuture
                                    ? 'bg-[#a855f7] text-white shadow-[0.1em_0.1em_0_#000000]'
                                    : 'bg-white text-[#050505] hover:bg-gray-50'
                                }`}
                              >
                                Later
                              </button>
                            </div>
                          </div>
                          
                          {stage.scheduleForFuture && (
                            <div className="mt-1">
                              <Input
                                type="datetime-local"
                                value={stage.scheduledStartDateTime}
                                onChange={(e) => handleDateTimeChange(index, e.target.value)}
                                min={new Date(Date.now() + Number(tournament.stageDuration) * 1000).toISOString().slice(0, 16)}
                                className="w-full h-7 text-xs border-[0.1em] border-[#050505] rounded-[0.2em] font-bold"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Projects Before/After - Compact */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1 border-t-[0.1em] border-gray-300">
                        <div className="text-center p-1 bg-gray-50 rounded-[0.2em]">
                          <div className="text-[9px] font-semibold text-gray-600 uppercase">Before</div>
                          <div className="text-xs font-bold text-[#050505]">{remainingBefore}</div>
                        </div>
                        <div className="text-center p-1 bg-gray-50 rounded-[0.2em]">
                          <div className="text-[9px] font-semibold text-gray-600 uppercase">After</div>
                          <div className={`text-xs font-bold ${remainingAfter < 2 ? 'text-red-600' : 'text-[#050505]'}`}>
                            {remainingAfter}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Validation Messages - Compact */}
            {error && (
              <div className="p-2 bg-red-50 border-[0.15em] border-red-300 rounded-[0.3em] shadow-[0.15em_0.15em_0_#000000]">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3 text-red-600" />
                  <span className="text-xs font-bold text-red-700">{error}</span>
                </div>
              </div>
            )}

            {!validation.valid && !error && (
              <div className="p-2 bg-yellow-50 border-[0.15em] border-yellow-300 rounded-[0.3em] shadow-[0.15em_0.15em_0_#000000]">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3 text-yellow-600" />
                  <span className="text-xs font-bold text-yellow-700">{validation.message}</span>
                </div>
              </div>
            )}

            {/* Summary - Compact */}
            {validation.valid && (
              <div className="p-2 bg-green-50 border-[0.15em] border-green-300 rounded-[0.3em] shadow-[0.15em_0.15em_0_#000000]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-bold text-green-700">
                    Ready! Final: {calculateRemaining[calculateRemaining.length - 1]} projects
                  </span>
                </div>
              </div>
            )}

            {/* Actions - Compact */}
            <div className="flex justify-between gap-2 pt-3 border-t-[0.2em] border-[#050505] sticky bottom-0 bg-white pb-2">
              <button
                onClick={onClose}
                disabled={isStarting}
                className="px-3 py-1.5 text-xs font-bold bg-white text-[#050505] border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.15em_0.15em_0_#000000] hover:shadow-[0.2em_0.2em_0_#000000] hover:-translate-x-[0.05em] hover:-translate-y-[0.05em] transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStart}
                disabled={!validation.valid || isStarting || isScheduling}
                className="px-3 py-1.5 text-xs font-bold bg-[#10b981] text-white border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.15em_0.15em_0_#000000] hover:shadow-[0.2em_0.2em_0_#000000] hover:-translate-x-[0.05em] hover:-translate-y-[0.05em] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStarting || isScheduling ? "Starting..." : "Start"}
              </button>
            </div>
          </div>

          {/* Right Side - Bracket Visualization */}
          <div className="border-l-[0.2em] border-gray-300 overflow-auto" style={{ backgroundColor: '#f5f5f5' }}>
            <BracketVisualization />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

