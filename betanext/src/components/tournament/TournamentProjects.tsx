import React, { useState, useMemo } from 'react';
import { Users, CheckCircle, XCircle, AlertCircle, Vote } from 'lucide-react';
import { useProjectStatus, useProjectPower, useCurrentStageNumber, useStageStatus } from '@/hooks/useTournamentMethods';
import { getTournamentContractAddress } from '@/utils/contractConfig';
import { useNavigate } from '@/utils/nextAdapter';
import { getProjectRoute } from '@/utils/hashids';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { ButtonCool } from '@/components/ui/button-cool';
import TournamentVoteModal from '@/components/modals/TournamentVoteModal';
import { useProjects } from '@/hooks/useProjectMethods';
import { getMainContractAddress } from '@/utils/contractConfig';
import { formatIpfsUrl } from '@/utils/imageUtils';
import Image from 'next/image';
import { ipfsImageLoader } from '@/utils/imageUtils';

interface TournamentProjectsProps {
  tournamentId: bigint;
  projectIds: bigint[];
  isLoading?: boolean;
}

export function TournamentProjects({ 
  tournamentId, 
  projectIds,
  isLoading 
}: TournamentProjectsProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4 text-[#050505] uppercase tracking-[0.05em]">Projects</h2>
        <div className="bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] p-4">
          <div className="text-center text-gray-500">Loading projects...</div>
        </div>
      </div>
    );
  }

  if (!projectIds || projectIds.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4 text-[#050505] uppercase tracking-[0.05em]">Projects</h2>
        <div className="bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] p-4">
          <div className="text-center text-gray-500">No projects added to this tournament yet</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold mb-4 text-[#050505] uppercase tracking-[0.05em]">Projects ({projectIds.length})</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {projectIds.map((projectId) => (
          <ProjectCard
            key={projectId.toString()}
            tournamentId={tournamentId}
            projectId={projectId}
          />
        ))}
      </div>
    </div>
  );
}

function ProjectCard({ tournamentId, projectId }: { tournamentId: bigint; projectId: bigint }) {
  const navigate = useNavigate();
  const { address } = useAccount();
  const contractAddress = getTournamentContractAddress();
  const mainContractAddress = getMainContractAddress();
  const { status, isLoading } = useProjectStatus(contractAddress, tournamentId, projectId);
  const { currentStageNumber } = useCurrentStageNumber(contractAddress, tournamentId);
  const { power } = useProjectPower(contractAddress, tournamentId, currentStageNumber || 0n, projectId);
  const { status: stageStatus } = useStageStatus(contractAddress, tournamentId, currentStageNumber || 0n);
  const { projects, isLoading: projectsLoading } = useProjects(mainContractAddress, [projectId]);
  
  const [showVoteModal, setShowVoteModal] = useState(false);

  const projectDetails = useMemo(() => {
    if (!projects || projects.length === 0) return null;
    return projects[0];
  }, [projects]);

  const projectLogo = useMemo(() => {
    if (!projectDetails?.metadata) return null;
    try {
      const additionalData = JSON.parse(projectDetails.metadata.additionalData || '{}');
      const logo = additionalData.media?.logo || additionalData.logo;
      return logo ? formatIpfsUrl(logo) : null;
    } catch {
      return null;
    }
  }, [projectDetails]);

  const projectName = projectDetails?.project?.name || `Project #${projectId.toString()}`;

  const canVote = stageStatus?.active && status?.approved && !status?.disqualified && !status?.eliminated && address;

  const getStatusIcon = () => {
    if (status?.disqualified) return <XCircle className="w-4 h-4 text-red-500" />;
    if (status?.eliminated) return <AlertCircle className="w-4 h-4 text-orange-500" />;
    if (status?.approved) return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <Users className="w-4 h-4 text-gray-400" />;
  };

  const getStatusText = () => {
    if (status?.disqualified) return 'Disqualified';
    if (status?.eliminated) return 'Eliminated';
    if (status?.approved) return 'Approved';
    return 'Pending';
  };

  return (
    <>
      <div className="bg-white border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.15em_0.15em_0_#000000] p-3 transition-all duration-200 hover:shadow-[0.2em_0.2em_0_#000000] hover:-translate-x-[0.05em] hover:-translate-y-[0.05em]">
        <div className="flex items-center gap-3 mb-2">
          {/* Project Logo */}
          {projectLogo ? (
            <div className="w-12 h-12 rounded-full border-[0.15em] border-[#050505] overflow-hidden flex-shrink-0 bg-gray-100">
              <Image
                loader={ipfsImageLoader}
                src={projectLogo}
                alt={projectName}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                onError={() => {}}
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full border-[0.15em] border-[#050505] bg-[#a855f7] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">{projectName.charAt(0).toUpperCase()}</span>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div 
              onClick={() => navigate(getProjectRoute(Number(projectId)))}
              className="font-bold text-sm text-[#050505] cursor-pointer hover:text-[#a855f7] truncate"
              title={projectName}
            >
              {projectName}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="text-xs text-gray-600">{getStatusText()}</div>
              {getStatusIcon()}
            </div>
          </div>
        </div>
        
        {/* Power Display */}
        {power !== undefined && (
          <div className="mb-2 p-2 bg-gray-50 border-[0.1em] border-gray-300 rounded-[0.2em]">
            <div className="text-[10px] font-semibold text-gray-600 uppercase">Power</div>
            <div className="text-sm font-bold text-[#050505]">{formatEther(power)}</div>
          </div>
        )}
        
        {/* Vote Button */}
        {canVote && (
          <ButtonCool
            onClick={(e) => {
              e.stopPropagation();
              setShowVoteModal(true);
            }}
            text="Vote"
            bgColor="#a855f7"
            hoverBgColor="#9333ea"
            borderColor="#050505"
            textColor="#ffffff"
            size="sm"
            className="w-full mt-2"
          >
            <Vote className="w-3 h-3" />
          </ButtonCool>
        )}
        
        {status?.disqualificationReason && (
          <div className="text-[10px] text-red-600 mt-2">
            {status.disqualificationReason}
          </div>
        )}
      </div>
      
      <TournamentVoteModal
        isOpen={showVoteModal}
        onClose={() => setShowVoteModal(false)}
        tournamentId={tournamentId}
        projectId={projectId}
        onVoteSuccess={() => {
          setShowVoteModal(false);
          // Refetch data
          window.location.reload();
        }}
      />
    </>
  );
}

