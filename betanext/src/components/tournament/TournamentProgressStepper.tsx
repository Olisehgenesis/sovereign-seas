import React from 'react';
import { CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { useStageInfo } from '@/hooks/useTournamentMethods';
import { getTournamentContractAddress } from '@/utils/contractConfig';
import { formatEther } from 'viem';

interface TournamentProgressStepperProps {
  tournamentId: bigint;
  currentStage: number;
  stageCount: number;
  onStageClick?: (stageNumber: number) => void;
  isLoading?: boolean;
}

export function TournamentProgressStepper({
  tournamentId,
  currentStage,
  stageCount,
  onStageClick,
  isLoading
}: TournamentProgressStepperProps) {
  const contractAddress = getTournamentContractAddress();
  
  // Calculate display stage count - show at least current stage + 1, or stageCount
  const displayStageCount = Math.max(stageCount || 1, (currentStage !== undefined ? currentStage + 1 : 1));
  
  // Limit to 4 stages for horizontal stepper (per design guidelines)
  const maxStages = Math.min(displayStageCount, 4);
  
  return (
    <div className="mb-6">
      <nav 
        className="bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] p-4 md:p-6"
        aria-label="Tournament progress stepper"
      >
        <ol className="flex items-center justify-center gap-2 md:gap-4 flex-wrap">
          {Array.from({ length: maxStages }, (_, i) => {
            const stageNumber = i;
            const stageNumberBigInt = BigInt(stageNumber);
            
            return (
              <StageStep
                key={stageNumber}
                tournamentId={tournamentId}
                contractAddress={contractAddress}
                stageNumber={stageNumber}
                stageNumberBigInt={stageNumberBigInt}
                currentStage={currentStage}
                isLast={i === maxStages - 1}
                onClick={() => onStageClick?.(stageNumber)}
                isLoading={isLoading}
              />
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

interface StageStepProps {
  tournamentId: bigint;
  contractAddress: string;
  stageNumber: number;
  stageNumberBigInt: bigint;
  currentStage: number;
  isLast: boolean;
  onClick?: () => void;
  isLoading?: boolean;
}

function StageStep({
  tournamentId,
  contractAddress,
  stageNumber,
  stageNumberBigInt,
  currentStage,
  isLast,
  onClick,
  isLoading
}: StageStepProps) {
  const { stage } = useStageInfo(contractAddress as `0x${string}`, tournamentId, stageNumberBigInt);
  
  const effectiveCurrentStage = currentStage !== undefined ? currentStage : -1;
  const isCurrentStage = stageNumber === effectiveCurrentStage;
  const isPastStage = effectiveCurrentStage >= 0 && stageNumber < effectiveCurrentStage;
  const isFutureStage = effectiveCurrentStage >= 0 && stageNumber > effectiveCurrentStage;
  
  // Determine step status
  let stepStatus: 'success' | 'active' | 'none' | 'error' = 'none';
  if (stage?.finalized) {
    stepStatus = 'success';
  } else if (isCurrentStage && stage?.started) {
    stepStatus = 'active';
  } else if (isFutureStage) {
    stepStatus = 'none';
  }
  
  const isDisabled = isFutureStage && !stage?.started;
  const isClickable = !isDisabled && onClick;
  
  const StepContent = () => (
    <div className="flex flex-col items-center gap-2 min-w-[120px] md:min-w-[160px]">
      {/* Step Circle */}
      <div className="relative">
        {/* Active indicator ring */}
        {isCurrentStage && (
          <div 
            className="absolute inset-0 rounded-full border-2 border-[#050505]"
            style={{
              width: 'calc(100% + 4px)',
              height: 'calc(100% + 4px)',
              top: '-2px',
              left: '-2px',
              opacity: 0.5
            }}
            aria-hidden="true"
          />
        )}
        
        {/* Step Circle */}
        <div
          className={`
            w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center
            border-2 border-[#050505] font-bold text-sm md:text-base
            transition-all duration-200
            ${
              stepStatus === 'success'
                ? 'bg-[#050505] text-white'
                : stepStatus === 'active'
                ? 'bg-[#a855f7] text-white border-[#050505]'
                : 'bg-white text-[#050505]'
            }
            ${isClickable ? 'cursor-pointer hover:scale-110' : ''}
            ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {stepStatus === 'success' ? (
            <CheckCircle className="w-5 h-5 md:w-6 md:h-6" aria-hidden="true" />
          ) : (
            <span>{stageNumber + 1}</span>
          )}
        </div>
      </div>
      
      {/* Step Label Card */}
      <div 
        className={`
          w-full bg-white border-[0.15em] border-[#050505] rounded-[0.3em] 
          shadow-[0.15em_0.15em_0_#000000] p-2 md:p-3 text-center
          transition-all duration-200
          ${isCurrentStage ? 'bg-[#f5f5f5]' : ''}
          ${isClickable ? 'hover:shadow-[0.2em_0.2em_0_#000000] hover:-translate-y-0.5' : ''}
        `}
      >
        <div
          className={`
            text-xs md:text-sm font-bold uppercase tracking-wide
            ${isDisabled ? 'text-gray-700' : 'text-[#050505]'}
            ${isClickable ? 'hover:text-[#a855f7] transition-colors' : ''}
          `}
        >
          Stage {stageNumber + 1}
        </div>
        {stage && (
          <div className="text-[10px] md:text-xs text-gray-600 mt-1">
            {stage.finalized ? (
              <span className="text-gray-600 font-semibold">Completed</span>
            ) : stage.started ? (
              <span className="text-[#a855f7] font-semibold">Active</span>
            ) : (
              <span className="text-gray-500">Upcoming</span>
            )}
          </div>
        )}
        
        {/* Stage Info in Card */}
        {stage && (isCurrentStage || stage.finalized) && (
          <div className="mt-2 pt-2 border-t border-gray-300">
            <div className="text-[10px] text-gray-600 space-y-1">
              {stage.rewardPool > 0n && (
                <div className="font-semibold text-[#050505]">
                  {formatEther(stage.rewardPool)} CELO
                </div>
              )}
              {stage.eliminationPercentage > 0n && (
                <div className="text-xs">
                  {Number(stage.eliminationPercentage)}% elimination
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
  
  // Connector Line (not shown for last step)
  if (isLast) {
    return (
      <li className="flex items-center">
        {isClickable ? (
          <button
            onClick={onClick}
            className="flex flex-col items-center"
            aria-label={`Stage ${stageNumber + 1}${stage?.finalized ? ', completed' : isCurrentStage ? ', current stage' : ', upcoming'}`}
            aria-current={isCurrentStage ? 'step' : undefined}
            aria-disabled={isDisabled}
          >
            <StepContent />
          </button>
        ) : (
          <div
            className="flex flex-col items-center"
            aria-label={`Stage ${stageNumber + 1}${stage?.finalized ? ', completed' : isCurrentStage ? ', current stage' : ', upcoming'}`}
            aria-current={isCurrentStage ? 'step' : undefined}
          >
            <StepContent />
          </div>
        )}
      </li>
    );
  }
  
  return (
    <li className="flex items-center flex-1">
      <div className="flex items-center flex-1">
        {isClickable ? (
          <button
            onClick={onClick}
            className="flex flex-col items-center"
            aria-label={`Stage ${stageNumber + 1}${stage?.finalized ? ', completed' : isCurrentStage ? ', current stage' : ', upcoming'}`}
            aria-current={isCurrentStage ? 'step' : undefined}
            aria-disabled={isDisabled}
          >
            <StepContent />
          </button>
        ) : (
          <div
            className="flex flex-col items-center"
            aria-label={`Stage ${stageNumber + 1}${stage?.finalized ? ', completed' : isCurrentStage ? ', current stage' : ', upcoming'}`}
            aria-current={isCurrentStage ? 'step' : undefined}
          >
            <StepContent />
          </div>
        )}
        
        {/* Progress/Connector Line */}
        <div className="flex-1 mx-2 md:mx-4 h-0.5 relative">
          <div
            className={`
              absolute top-0 left-0 h-full transition-all duration-300
              ${
                stepStatus === 'success' || (isPastStage && stage?.finalized)
                  ? 'bg-[#050505] w-full'
                  : 'bg-gray-300 w-full'
              }
            `}
            style={{ opacity: stepStatus === 'success' ? 0.75 : 1 }}
            aria-hidden="true"
          />
        </div>
      </div>
    </li>
  );
}

