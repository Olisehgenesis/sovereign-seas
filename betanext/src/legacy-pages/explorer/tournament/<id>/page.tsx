import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from '@/utils/nextAdapter';
import { useAccount } from 'wagmi';
import type { Address } from 'viem';
import { 
  ArrowLeft, 
  Loader2,
} from 'lucide-react';

import { 
  useTournament,
  useTournamentProjects,
  useStageCount,
  useCurrentStageNumber,
  useTournamentConfig,
} from '@/hooks/useTournamentMethods';
import { getTournamentContractAddress } from '@/utils/contractConfig';
import DynamicHelmet from '@/components/DynamicHelmet';
import { ButtonCool } from '@/components/ui/button-cool';
import { TournamentHeader } from '@/components/tournament/TournamentHeader';
import { TournamentStats } from '@/components/tournament/TournamentStats';
import { TournamentStages } from '@/components/tournament/TournamentStages';
import { TournamentLeaderboard } from '@/components/tournament/TournamentLeaderboard';
import { TournamentProjects } from '@/components/tournament/TournamentProjects';
import { TournamentSideMenu } from '@/components/tournament/TournamentSideMenu';
import { TournamentBrackets } from '@/components/tournament/TournamentBrackets';
import { TournamentProgressStepper } from '@/components/tournament/TournamentProgressStepper';

const CONTRACT_ADDRESS = getTournamentContractAddress();

type TournamentSection = 'overview' | 'stages' | 'brackets' | 'projects' | 'leaderboard';

export default function TournamentDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { address } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  const [activeSection, setActiveSection] = useState<TournamentSection>('overview');
  const [selectedStage, setSelectedStage] = useState<number | undefined>(undefined);

  // Parse tournament ID from params
  const tournamentId = useMemo(() => {
    if (!params?.id && params?.id !== '0') return null;
    try {
      const id = BigInt(params.id as string);
      return id;
    } catch {
      return null;
    }
  }, [params?.id]);

  // Fetch tournament data
  const { tournament, isLoading: tournamentLoading, error: tournamentError } = useTournament(
    CONTRACT_ADDRESS,
    tournamentId !== null ? tournamentId : BigInt(0)
  );

  const { projectIds, isLoading: projectsLoading } = useTournamentProjects(
    CONTRACT_ADDRESS,
    tournamentId !== null ? tournamentId : BigInt(0)
  );

  const { stageCount, isLoading: stageCountLoading } = useStageCount(
    CONTRACT_ADDRESS,
    tournamentId !== null ? tournamentId : BigInt(0)
  );

  const { currentStageNumber, isLoading: currentStageLoading } = useCurrentStageNumber(
    CONTRACT_ADDRESS,
    tournamentId !== null ? tournamentId : BigInt(0)
  );

  const { config, isLoading: configLoading } = useTournamentConfig(
    CONTRACT_ADDRESS,
    tournamentId !== null ? tournamentId : BigInt(0)
  );

  const isLoading = tournamentLoading || projectsLoading || stageCountLoading || currentStageLoading || configLoading;
  
  const currentStageNum = Number(currentStageNumber || 0n);
  const stageCountNum = Number(stageCount || 0n);
  const displayStage = selectedStage || currentStageNum || 1;

  // All hooks must be called before any conditional returns
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update selected stage when section changes
  useEffect(() => {
    if (activeSection === 'stages' || activeSection === 'brackets') {
      if (!selectedStage && currentStageNum > 0) {
        setSelectedStage(currentStageNum);
      }
    }
  }, [activeSection, currentStageNum, selectedStage]);

  // Early returns after all hooks
  if (!isMounted) {
    return null;
  }

  if (tournamentId === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Tournament ID</h1>
          <ButtonCool
            onClick={() => navigate('/explorer/tournaments')}
            text="Back to Tournaments"
            bgColor="#a855f7"
            hoverBgColor="#9333ea"
            borderColor="#050505"
            textColor="#ffffff"
            size="md"
          />
        </div>
      </div>
    );
  }

  if (tournamentError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Tournament</h1>
          <p className="text-gray-600 mb-6">{tournamentError.message || 'Something went wrong'}</p>
          <ButtonCool
            onClick={() => navigate('/explorer/tournaments')}
            text="Back to Tournaments"
            bgColor="#a855f7"
            hoverBgColor="#9333ea"
            borderColor="#050505"
            textColor="#ffffff"
            size="md"
          />
        </div>
      </div>
    );
  }

  if (tournamentLoading || !tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#a855f7]" />
      </div>
    );
  }

  const handleStageSelect = (stageNumber: number) => {
    setSelectedStage(stageNumber);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <>
            {/* Tournament Stats */}
            <TournamentStats
              tournament={tournament}
              projectCount={projectIds?.length || 0}
              stageCount={stageCountNum}
              currentStage={currentStageNum}
              isLoading={isLoading}
            />

            {/* Brackets Preview - Show current stage bracket */}
            {currentStageNum > 0 && (
              <div className="mb-6">
                <TournamentBrackets
                  tournamentId={tournament.id}
                  currentStage={currentStageNum}
                  stageCount={stageCountNum}
                  selectedStage={currentStageNum}
                  isLoading={isLoading}
                />
              </div>
            )}

            {/* Projects Grid - Show voting enabled projects */}
            {projectIds && projectIds.length > 0 && (
              <div className="mb-6">
                <TournamentProjects
                  tournamentId={tournament.id}
                  projectIds={projectIds}
                  isLoading={isLoading}
                />
              </div>
            )}

            {/* Tournament Stages Preview */}
            <TournamentStages
              tournamentId={tournament.id}
              currentStage={currentStageNum}
              stageCount={stageCountNum}
              stageDuration={Number(tournament.stageDuration)}
              isLoading={isLoading}
            />
          </>
        );

      case 'stages':
        return (
          <TournamentStages
            tournamentId={tournament.id}
            currentStage={currentStageNum}
            stageCount={stageCountNum}
            stageDuration={Number(tournament.stageDuration)}
            isLoading={isLoading}
          />
        );

      case 'brackets':
        return (
          <TournamentBrackets
            tournamentId={tournament.id}
            currentStage={currentStageNum}
            stageCount={stageCountNum}
            selectedStage={displayStage}
            isLoading={isLoading}
          />
        );

      case 'projects':
        return (
          projectIds && projectIds.length > 0 ? (
            <TournamentProjects
              tournamentId={tournament.id}
              projectIds={projectIds}
              isLoading={isLoading}
            />
          ) : (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4 text-[#050505]">Projects</h2>
              <div className="bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] p-8">
                <div className="text-center text-gray-500">No projects added to this tournament yet</div>
              </div>
            </div>
          )
        );

      case 'leaderboard':
        return (
          currentStageNumber !== undefined && currentStageNumber > 0n ? (
            <TournamentLeaderboard
              tournamentId={tournament.id}
              stageNumber={BigInt(displayStage)}
              isLoading={isLoading}
            />
          ) : (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4 text-[#050505]">Leaderboard</h2>
              <div className="bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] p-8">
                <div className="text-center text-gray-500">No leaderboard data available yet</div>
              </div>
            </div>
          )
        );

      default:
        return null;
    }
  };

  return (
    <>
      <DynamicHelmet 
        config={{
          title: `Tournament #${tournament.id.toString()}`,
          description: `Multi-stage tournament with ${Number(tournament.stageDuration)} second stage duration`,
          image: '/og-image.png',
          url: typeof window !== 'undefined' ? window.location.href : '',
          type: 'website'
        }}
      />
      
      <div className="min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <button
            onClick={() => navigate('/explorer/tournaments')}
            className="mb-6 flex items-center gap-2 text-[#050505] hover:text-[#a855f7] font-bold transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Tournaments
          </button>

          {/* Tournament Header */}
          <TournamentHeader
            tournament={tournament}
            isLoading={isLoading}
            currentStage={currentStageNum}
            onTournamentStarted={() => {
              // Refetch tournament data after starting
              window.location.reload();
            }}
          />

          {/* Progress Stepper - Horizontal with Cards */}
          {tournament.active && stageCountNum > 0 && (
            <TournamentProgressStepper
              tournamentId={tournament.id}
              currentStage={currentStageNum}
              stageCount={stageCountNum}
              onStageClick={(stageNumber) => {
                setSelectedStage(stageNumber);
                setActiveSection('stages');
              }}
              isLoading={isLoading}
            />
          )}

          {/* Main Content with Side Menu */}
          <div className="flex flex-col md:flex-row gap-6 mt-6">
            {/* Side Menu */}
            <TournamentSideMenu
              currentStage={currentStageNum}
              stageCount={stageCountNum}
              activeSection={activeSection}
              onSectionChange={setActiveSection}
              onStageSelect={handleStageSelect}
              selectedStage={displayStage}
            />

            {/* Content Area */}
            <div className="flex-1 min-w-0">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

