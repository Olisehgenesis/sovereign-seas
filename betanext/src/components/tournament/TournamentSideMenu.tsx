import React from 'react';
import { 
  Trophy, 
  Users, 
  BarChart3, 
  List,
  ChevronRight,
  CheckCircle,
  Clock,
  CalendarClock
} from 'lucide-react';

interface TournamentSideMenuProps {
  currentStage: number;
  stageCount: number;
  activeSection: 'overview' | 'stages' | 'brackets' | 'projects' | 'leaderboard';
  onSectionChange: (section: 'overview' | 'stages' | 'brackets' | 'projects' | 'leaderboard') => void;
  onStageSelect?: (stageNumber: number) => void;
  selectedStage?: number;
}

export function TournamentSideMenu({
  currentStage,
  stageCount,
  activeSection,
  onSectionChange,
  onStageSelect,
  selectedStage
}: TournamentSideMenuProps) {
  const menuItems = [
    { id: 'overview' as const, label: 'Overview', icon: Trophy },
    { id: 'stages' as const, label: 'Voting Stages', icon: CalendarClock },
    { id: 'brackets' as const, label: 'Brackets', icon: BarChart3 },
    { id: 'projects' as const, label: 'Projects', icon: Users },
    { id: 'leaderboard' as const, label: 'Leaderboard', icon: List },
  ];

  const getStageStatus = (stageNum: number) => {
    if (stageNum < currentStage) return 'completed';
    if (stageNum === currentStage) return 'active';
    return 'upcoming';
  };

  return (
    <div className="w-full md:w-64 flex-shrink-0">
      <div className="bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] overflow-hidden sticky top-4">
        {/* Main Navigation */}
        <div className="p-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 mb-1 rounded-[0.3em] transition-all duration-200 font-semibold text-sm ${
                  isActive
                    ? 'bg-[#a855f7] text-white border-[0.15em] border-[#050505] shadow-[0.2em_0.2em_0_#000000]'
                    : 'text-[#050505] hover:bg-gray-50 border-[0.15em] border-transparent hover:border-[#050505]'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4" />}
              </button>
            );
          })}
        </div>

        {/* Stages List (shown when stages section is active) */}
        {activeSection === 'stages' && stageCount > 0 && (
          <div className="border-t-[0.2em] border-[#050505] p-2">
            <div className="text-xs font-bold text-gray-600 uppercase tracking-[0.1em] mb-2 px-2">
              Stages
            </div>
            <div className="space-y-1">
              {Array.from({ length: Math.max(stageCount, currentStage) }, (_, i) => {
                const stageNumber = i + 1;
                const status = getStageStatus(stageNumber);
                const isSelected = selectedStage === stageNumber;
                
                return (
                  <button
                    key={stageNumber}
                    onClick={() => onStageSelect?.(stageNumber)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-[0.3em] text-xs transition-all duration-200 ${
                      isSelected
                        ? 'bg-[#a855f7] text-white border-[0.1em] border-[#050505] shadow-[0.15em_0.15em_0_#000000]'
                        : status === 'active'
                        ? 'bg-green-50 text-green-700 border-[0.1em] border-green-300 hover:bg-green-100'
                        : status === 'completed'
                        ? 'bg-gray-50 text-gray-600 border-[0.1em] border-gray-300 hover:bg-gray-100'
                        : 'bg-blue-50 text-blue-700 border-[0.1em] border-blue-300 hover:bg-blue-100'
                    }`}
                  >
                    {status === 'completed' && <CheckCircle className="w-3 h-3" />}
                    {status === 'active' && <Clock className="w-3 h-3" />}
                    {status === 'upcoming' && <CalendarClock className="w-3 h-3" />}
                    <span className="font-semibold">Stage {stageNumber}</span>
                    {status === 'active' && (
                      <span className="ml-auto text-[0.7em] bg-green-500 text-white px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Brackets List (shown when brackets section is active) */}
        {activeSection === 'brackets' && stageCount > 0 && (
          <div className="border-t-[0.2em] border-[#050505] p-2">
            <div className="text-xs font-bold text-gray-600 uppercase tracking-[0.1em] mb-2 px-2">
              Tournament Brackets
            </div>
            <div className="space-y-1">
              {Array.from({ length: Math.max(stageCount, currentStage) }, (_, i) => {
                const stageNumber = i + 1;
                const status = getStageStatus(stageNumber);
                const isSelected = selectedStage === stageNumber;
                
                return (
                  <button
                    key={stageNumber}
                    onClick={() => onStageSelect?.(stageNumber)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-[0.3em] text-xs transition-all duration-200 ${
                      isSelected
                        ? 'bg-[#a855f7] text-white border-[0.1em] border-[#050505] shadow-[0.15em_0.15em_0_#000000]'
                        : status === 'active'
                        ? 'bg-green-50 text-green-700 border-[0.1em] border-green-300 hover:bg-green-100'
                        : status === 'completed'
                        ? 'bg-gray-50 text-gray-600 border-[0.1em] border-gray-300 hover:bg-gray-100'
                        : 'bg-blue-50 text-blue-700 border-[0.1em] border-blue-300 hover:bg-blue-100'
                    }`}
                  >
                    <BarChart3 className="w-3 h-3" />
                    <span className="font-semibold">Round {stageNumber}</span>
                    {status === 'active' && (
                      <span className="ml-auto text-[0.7em] bg-green-500 text-white px-1.5 py-0.5 rounded">
                        Live
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

