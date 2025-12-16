import React, { useState } from 'react';
import { Trophy, Activity, Clock, Users, Play } from 'lucide-react';
import type { Tournament } from '@/hooks/useTournamentMethods';
import { ButtonCool } from '@/components/ui/button-cool';
import { useAccount } from 'wagmi';
import { isAddressEqual } from 'viem';
import StartTournamentModal from '@/components/modals/StartTournamentModal';

interface TournamentHeaderProps {
  tournament: Tournament;
  isLoading?: boolean;
  currentStage?: number;
  onTournamentStarted?: () => void;
}

export function TournamentHeader({ tournament, isLoading, currentStage = 0, onTournamentStarted }: TournamentHeaderProps) {
  const { address } = useAccount();
  const [showStartModal, setShowStartModal] = useState(false);

  const isAdmin = address && isAddressEqual(address, tournament.admin);
  const hasNotStarted = !tournament.active && currentStage === 0;

  const getStatusInfo = () => {
    if (!tournament.active) {
      if (currentStage === 0) {
        return { text: 'Not Started', color: '#3b82f6', bgColor: '#dbeafe' };
      }
      return { text: 'Paused', color: '#6b7280', bgColor: '#f3f4f6' };
    }
    return { text: 'Active', color: '#10b981', bgColor: '#d1fae5' };
  };

  const statusInfo = getStatusInfo();

  const handleStartSuccess = () => {
    setShowStartModal(false);
    setTimeout(() => {
      onTournamentStarted?.();
    }, 2000);
  };

  const formatDuration = (seconds: bigint) => {
    const days = Number(seconds) / 86400;
    if (days >= 1) return `${days.toFixed(1)} days`;
    const hours = Number(seconds) / 3600;
    if (hours >= 1) return `${hours.toFixed(1)} hours`;
    const minutes = Number(seconds) / 60;
    return `${minutes.toFixed(0)} minutes`;
  };

  return (
    <div className="group relative w-full mb-8">
      {/* Pattern Overlays */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
          backgroundSize: '0.5em 0.5em'
        }}
      />
      
      {/* Main Card */}
      <div 
        className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2]"
        style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
      >
        {/* Accent Corner */}
        <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#a855f7] rotate-45 z-[1]" />
        <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">⚔</div>

        {/* Title Area */}
        <div 
          className="relative px-[1.4em] py-[1.4em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
          style={{ 
            background: statusInfo.color || '#a855f7',
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
            backgroundBlendMode: 'overlay'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8" />
              <h1 className="text-2xl">Tournament #{tournament.id.toString()}</h1>
            </div>
            <span 
              className="bg-white text-[#050505] text-[0.7em] font-extrabold px-[0.8em] py-[0.4em] border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_#000000] uppercase tracking-[0.1em]"
            >
              {statusInfo.text}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="relative px-[1.5em] py-[1.5em] z-[2]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Stage Duration */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 border-[0.15em] border-[#050505] rounded-[0.4em]">
              <div className="w-10 h-10 flex items-center justify-center bg-[#a855f7] border-[0.15em] border-[#050505] rounded-[0.3em]">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-600 uppercase">Stage Duration</div>
                <div className="text-sm font-bold text-[#050505]">{formatDuration(tournament.stageDuration)}</div>
              </div>
            </div>

            {/* Auto Progress */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 border-[0.15em] border-[#050505] rounded-[0.4em]">
              <div className="w-10 h-10 flex items-center justify-center bg-[#a855f7] border-[0.15em] border-[#050505] rounded-[0.3em]">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-600 uppercase">Auto Progress</div>
                <div className="text-sm font-bold text-[#050505]">{tournament.autoProgress ? 'Enabled' : 'Disabled'}</div>
              </div>
            </div>

            {/* Disqualify Enabled */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 border-[0.15em] border-[#050505] rounded-[0.4em]">
              <div className="w-10 h-10 flex items-center justify-center bg-[#a855f7] border-[0.15em] border-[#050505] rounded-[0.3em]">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-600 uppercase">Disqualify</div>
                <div className="text-sm font-bold text-[#050505]">{tournament.disqualifyEnabled ? 'Enabled' : 'Disabled'}</div>
              </div>
            </div>
          </div>

          {/* Start Tournament Button (Admin Only) */}
          {isAdmin && hasNotStarted && (
            <div className="mt-4 flex justify-center">
              <ButtonCool
                onClick={() => setShowStartModal(true)}
                text="Start Tournament"
                bgColor="#10b981"
                hoverBgColor="#059669"
                borderColor="#050505"
                textColor="#ffffff"
                size="md"
              >
                <Play className="w-4 h-4" />
              </ButtonCool>
            </div>
          )}
        </div>

        {/* Corner Slice */}
        <div className="absolute bottom-0 left-0 w-[1.5em] h-[1.5em] bg-white border-r-[0.25em] border-t-[0.25em] border-[#050505] rounded-tl-[0.5em] z-[1]" />
      </div>

      {/* Start Tournament Modal */}
      <StartTournamentModal
        isOpen={showStartModal}
        onClose={() => setShowStartModal(false)}
        tournament={tournament}
        onSuccess={handleStartSuccess}
      />
    </div>
  );
}

