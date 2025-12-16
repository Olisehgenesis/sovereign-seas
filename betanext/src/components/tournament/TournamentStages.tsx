import React, { useState } from 'react';
import { Clock, CheckCircle, CalendarClock, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { useStageInfo, useStartScheduledStage, useStartNextStageManually, useTournament } from '@/hooks/useTournamentMethods';
import { getTournamentContractAddress } from '@/utils/contractConfig';
import { formatEther } from 'viem';
import { useAccount } from 'wagmi';
import { ButtonCool } from '@/components/ui/button-cool';

interface TournamentStagesProps {
  tournamentId: bigint;
  currentStage: number;
  stageCount: number;
  stageDuration: number;
  isLoading?: boolean;
}

/**
 * TournamentStages Component
 * 
 * Displays all stages of a tournament. Stages are 0-indexed in the contract:
 * - Stage 0: Created automatically when tournament starts (first stage)
 * - Stage 1, 2, 3...: Subsequent stages created manually or via scheduling
 * 
 * The component displays stages starting from Stage 0 and handles:
 * - Current stage highlighting
 * - Past/completed stages
 * - Future/upcoming stages
 * - Start buttons for stages that can be started
 */
export function TournamentStages({ 
  tournamentId, 
  currentStage, 
  stageCount,
  stageDuration,
  isLoading 
}: TournamentStagesProps) {
  // Initialize expanded stage to current stage (or Stage 0 if no current stage)
  const [expandedStage, setExpandedStage] = useState<number | null>(currentStage !== undefined ? currentStage : 0);

  /**
   * Format a Unix timestamp to a readable date string
   */
  const formatTimestamp = (timestamp: bigint) => {
    if (timestamp === 0n) return 'Not started';
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };

  /**
   * Format duration in seconds to a human-readable string
   */
  const formatDuration = (seconds: number) => {
    const days = seconds / 86400;
    if (days >= 1) return `${days.toFixed(1)} days`;
    const hours = seconds / 3600;
    if (hours >= 1) return `${hours.toFixed(1)} hours`;
    const minutes = seconds / 60;
    return `${minutes.toFixed(0)} minutes`;
  };

  // Calculate how many stages to display
  // Stages are 0-indexed, so if stageCount is 2, we have Stage 0 and Stage 1
  const displayStageCount = Math.max(stageCount || 1, (currentStage !== undefined ? currentStage + 1 : 1));

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4 text-[#050505]">Tournament Stages</h2>
      <div className="space-y-3">
        {/* Render stages starting from Stage 0 (0-indexed) */}
        {Array.from({ length: displayStageCount }, (_, i) => {
          // Stage numbers are 0-indexed: 0, 1, 2, 3...
          const stageNumber = i;
          const stageNumberBigInt = BigInt(stageNumber);
          
          // Determine stage status relative to current stage
          // currentStage is also 0-indexed (0, 1, 2, ...)
          const effectiveCurrentStage = currentStage !== undefined ? currentStage : -1;
          const isCurrentStage = stageNumber === effectiveCurrentStage;
          const isPastStage = effectiveCurrentStage >= 0 && stageNumber < effectiveCurrentStage;
          const isFutureStage = effectiveCurrentStage >= 0 && stageNumber > effectiveCurrentStage;

          return (
            <StageCard
              key={stageNumber}
              tournamentId={tournamentId}
              stageNumber={stageNumberBigInt}
              isCurrent={isCurrentStage}
              isPast={isPastStage}
              isFuture={isFutureStage}
              expanded={expandedStage === stageNumber}
              onToggle={() => setExpandedStage(expandedStage === stageNumber ? null : stageNumber)}
              isLoading={isLoading}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * StageCard Component
 * 
 * Individual stage card displaying stage information and controls.
 * Handles stage 0 and all subsequent stages (0-indexed).
 * 
 * @param stageNumber - 0-indexed stage number (0, 1, 2, ...)
 * @param isCurrent - Whether this is the currently active stage
 * @param isPast - Whether this stage has been completed
 * @param isFuture - Whether this is a future/upcoming stage
 */
function StageCard({ 
  tournamentId, 
  stageNumber, 
  isCurrent, 
  isPast, 
  isFuture,
  expanded,
  onToggle,
  isLoading 
}: {
  tournamentId: bigint;
  stageNumber: bigint; // 0-indexed: 0, 1, 2, ...
  isCurrent: boolean;
  isPast: boolean;
  isFuture: boolean;
  expanded: boolean;
  onToggle: () => void;
  isLoading?: boolean;
}) {
  const { address } = useAccount();
  const contractAddress = getTournamentContractAddress();
  
  // Fetch stage information from contract
  const { stage, isLoading: stageLoading } = useStageInfo(contractAddress, tournamentId, stageNumber);
  const { tournament } = useTournament(contractAddress, tournamentId);
  
  // Hooks for starting stages
  const { startScheduledStage, isPending: isStartingScheduled } = useStartScheduledStage(contractAddress);
  const { startNextStageManually, isPending: isStartingManual } = useStartNextStageManually(contractAddress);

  // Check if current user is the tournament admin
  const isAdmin = address && tournament?.admin && address.toLowerCase() === tournament.admin.toLowerCase();
  
  /**
   * Determine if this stage can be started by the admin
   * 
   * A stage can be started if:
   * 1. User is the tournament admin
   * 2. Stage exists and hasn't started yet
   * 3. Either:
   *    - Stage has a scheduled start time that has passed, OR
   *    - It's the current/next stage that should be started (not started yet)
   * 
   * Note: Stage 0 is created automatically when tournament starts, so it should already be started.
   * Subsequent stages (1, 2, 3...) can be started manually or via scheduling.
   */
  const canStart = isAdmin && stage && !stage.started && (() => {
    // Check if stage has a scheduled start time
    const hasScheduledStart = stage.scheduledStart > 0n;
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const scheduledTimePassed = hasScheduledStart && currentTime >= stage.scheduledStart;
    
    // Check if this is the next stage that should be started
    // - It's marked as current (should start now)
    // - OR it's a future stage that's ready to start (Stage 1+ after Stage 0 is finalized)
    // - Stage hasn't started yet (start === 0n means not started)
    const isNextStageToStart = (isCurrent || isFuture) && stage.start === 0n && tournament?.active;
    
    const result = scheduledTimePassed || isNextStageToStart;
    
    return result;
  })();

  /**
   * Handle starting a stage
   * 
   * Uses different contract functions based on stage type:
   * - startScheduledStage: For stages that were scheduled (have scheduledStart > 0)
   * - startNextStageManually: For manually starting the next stage after current is finalized
   * 
   * Note: Stage 0 is started automatically when tournament starts, so this is for Stage 1+
   */
  const handleStartStage = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card from collapsing when clicking button
    if (!canStart) {
      console.log('Cannot start stage:', { 
        stageNumber: stageNumber.toString(), 
        canStart, 
        isAdmin, 
        stage: !!stage, 
        started: stage?.started 
      });
      return;
    }
    try {
      // If stage has a scheduled start time, use startScheduledStage
      // This is for stages that were created via scheduleNextStage()
      if (stage?.scheduledStart && stage.scheduledStart > 0n) {
        console.log(`Starting scheduled stage ${stageNumber.toString()}...`);
        await startScheduledStage({ tournamentId });
      } else {
        // Otherwise use startNextStageManually
        // This creates and starts the next stage after current stage is finalized
        // Requires: current stage must be finalized
        console.log(`Starting next stage manually (will create stage ${stageNumber.toString()})...`);
        await startNextStageManually({ tournamentId });
      }
      // Refetch data after transaction completes
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      console.error(`Error starting stage ${stageNumber.toString()}:`, error);
      alert(`Failed to start stage: ${error?.message || error?.shortMessage || 'Unknown error'}`);
    }
  };

  /**
   * Get color for stage status indicator
   * - Gray: Past/completed stages
   * - Green: Current/active stage
   * - Blue: Future/upcoming stages
   */
  const getStatusColor = () => {
    if (isPast) return '#6b7280'; // Gray for completed
    if (isCurrent) return '#10b981'; // Green for active
    return '#3b82f6'; // Blue for upcoming
  };

  /**
   * Get human-readable status text for the stage
   */
  const getStatusText = () => {
    if (isPast) return 'Completed';
    if (isCurrent) return stage?.started ? 'Active' : 'Ready to Start';
    return 'Upcoming';
  };

  // Display stage number (0-indexed in contract, but show as "Stage 0", "Stage 1", etc.)
  const displayStageNumber = stageNumber.toString();

  return (
    <div 
      className="bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] overflow-hidden transition-all duration-200 hover:shadow-[0.4em_0.4em_0_#000000]"
      style={{ borderColor: getStatusColor() }}
    >
      <div className="w-full px-4 py-3 flex items-center justify-between">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 flex items-center justify-center border-[0.15em] border-[#050505] rounded-[0.3em] text-white font-bold"
              style={{ backgroundColor: getStatusColor() }}
            >
              {displayStageNumber}
            </div>
            <div className="text-left">
              <div className="font-bold text-[#050505]">Stage {displayStageNumber}</div>
              <div className="text-sm text-gray-600">{getStatusText()}</div>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-[#050505]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#050505]" />
          )}
        </button>
        {/* Show start button inline if ready to start */}
        {canStart && !expanded && (
          <ButtonCool
            onClick={handleStartStage}
            text={isStartingScheduled || isStartingManual ? "Starting..." : "Start"}
            bgColor="#10b981"
            hoverBgColor="#059669"
            borderColor="#050505"
            textColor="#ffffff"
            size="sm"
            disabled={isStartingScheduled || isStartingManual}
            className="ml-2"
          >
            {!isStartingScheduled && !isStartingManual && <Play className="w-3 h-3" />}
          </ButtonCool>
        )}
      </div>

      {expanded && stage && (
        <div className="px-4 py-3 border-t-[0.15em] border-[#050505] bg-gray-50">
          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
            <div>
              <div className="font-semibold text-gray-600">Start Time</div>
              <div className="text-[#050505]">{stage.start > 0n ? new Date(Number(stage.start) * 1000).toLocaleString() : 'Not started'}</div>
            </div>
            <div>
              <div className="font-semibold text-gray-600">End Time</div>
              <div className="text-[#050505]">{stage.end > 0n ? new Date(Number(stage.end) * 1000).toLocaleString() : 'Not ended'}</div>
            </div>
            <div>
              <div className="font-semibold text-gray-600">Reward Pool</div>
              <div className="text-[#050505]">{stage.rewardPool > 0n ? formatEther(stage.rewardPool) : '0'} tokens</div>
            </div>
            <div>
              <div className="font-semibold text-gray-600">Status</div>
              <div className="text-[#050505]">
                {stage.finalized ? 'Finalized' : stage.started ? 'Started' : 'Not Started'}
              </div>
            </div>
            {stage.scheduledStart > 0n && (
              <div>
                <div className="font-semibold text-gray-600">Scheduled Start</div>
                <div className="text-[#050505]">{new Date(Number(stage.scheduledStart) * 1000).toLocaleString()}</div>
              </div>
            )}
          </div>
          {canStart ? (
            <div className="mt-3 pt-3 border-t-[0.1em] border-gray-300">
              <ButtonCool
                onClick={handleStartStage}
                text={isStartingScheduled || isStartingManual ? "Starting..." : "Start Stage"}
                bgColor="#10b981"
                hoverBgColor="#059669"
                borderColor="#050505"
                textColor="#ffffff"
                size="sm"
                disabled={isStartingScheduled || isStartingManual}
              >
                {!isStartingScheduled && !isStartingManual && <Play className="w-3 h-3" />}
              </ButtonCool>
            </div>
          ) : isAdmin && stage && !stage.started && (
            <div className="mt-3 pt-3 border-t-[0.1em] border-gray-300">
              <div className="text-xs text-gray-600">
                {!stage ? 'Stage not found' : 
                 stage.started ? 'Stage already started' :
                 !isAdmin ? 'Only admin can start stages' :
                 'Cannot start stage yet'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
