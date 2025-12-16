import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from '@/utils/nextAdapter';
import { 
  Search,
  Trophy,
  AlertTriangle,
} from 'lucide-react';
import { useAllTournaments } from '@/hooks/useTournamentMethods';
import { type Address } from 'viem';
import { formatIpfsUrl } from '@/utils/imageUtils';
import TournamentCard from '@/components/cards/TournamentCard';
import DynamicHelmet from '@/components/DynamicHelmet';
import { ButtonCool } from '@/components/ui/button-cool';
import { getTournamentContractAddress } from '@/utils/contractConfig';

// Get contract address
const CONTRACT_ADDRESS = getTournamentContractAddress();

interface TournamentMetadata {
  name?: string;
  description?: string;
  logo?: string;
  bannerImage?: string;
  [key: string]: any;
}

interface EnhancedTournament {
  id: bigint;
  admin: Address;
  sovseasCampaignId: bigint;
  stageDuration: bigint;
  payoutToken: Address;
  autoProgress: boolean;
  active: boolean;
  disqualifyEnabled: boolean;
  createdAt: bigint;
  status: 'upcoming' | 'active' | 'ended' | 'paused';
  metadata?: TournamentMetadata;
  projectCount?: number;
  stageCount?: number;
  currentStage?: number;
}

const getTournamentStatus = (tournament: any): 'upcoming' | 'active' | 'ended' | 'paused' => {
  if (!tournament.active) return 'paused';
  // For now, we'll determine status based on active flag
  // You can enhance this with stage information later
  return tournament.active ? 'active' : 'ended';
};

export default function TournamentsPage() {
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Get tournaments data
  const { tournaments, isLoading, error } = useAllTournaments(CONTRACT_ADDRESS);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Process tournaments data using useMemo to prevent infinite loops
  const processedTournaments = useMemo(() => {
    if (!tournaments) return [];

    const enhanced = tournaments.map(tournament => {
      const status = getTournamentStatus(tournament);
      
      return {
        id: tournament.id,
        admin: tournament.admin,
        sovseasCampaignId: tournament.sovseasCampaignId,
        stageDuration: tournament.stageDuration,
        payoutToken: tournament.payoutToken,
        autoProgress: tournament.autoProgress,
        active: tournament.active,
        disqualifyEnabled: tournament.disqualifyEnabled,
        createdAt: tournament.createdAt,
        status,
        projectCount: 0, // TODO: Fetch actual project counts
        stageCount: 0, // TODO: Fetch actual stage counts
        currentStage: 0 // TODO: Fetch current stage
      } as EnhancedTournament;
    });

    // Apply search filter only
    let filtered = [...enhanced];

    // Search filter
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(tournament => 
        tournament.id.toString().includes(query) ||
        tournament.sovseasCampaignId.toString().includes(query)
      );
    }

    // Sort by newest (default)
    filtered.sort((a, b) => {
      return Number(b.createdAt) - Number(a.createdAt);
    });

    return filtered;
  }, [tournaments, searchTerm]);

  if (!isMounted) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-blue-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="group relative w-full max-w-[22em]">
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
            <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#ef4444] rotate-45 z-[1]" />
            <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">⚠</div>

            {/* Title Area */}
            <div 
              className="relative px-[1.4em] py-[1.4em] text-white font-extrabold text-center border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
              style={{ 
                background: '#ef4444',
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
                backgroundBlendMode: 'overlay'
              }}
            >
              <span className="text-[1.2em]">Unable to Load Tournaments</span>
            </div>

            {/* Body */}
            <div className="relative px-[1.5em] py-[1.5em] z-[2] text-center">
              <div className="w-16 h-16 bg-red-100 border-[0.15em] border-[#050505] rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0.2em_0.2em_0_#000000]">
                <AlertTriangle className="h-8 w-8 text-[#ef4444]" />
              </div>
              <p className="text-[#050505] text-[0.95em] leading-[1.4] font-medium mb-6">{error.message || 'Something went wrong'}</p>
              <ButtonCool
                onClick={() => window.location.reload()}
                text="Try Again"
                bgColor="#ef4444"
                hoverBgColor="#dc2626"
                borderColor="#050505"
                textColor="#ffffff"
                size="md"
              />
            </div>

            {/* Corner Slice */}
            <div className="absolute bottom-0 left-0 w-[1.5em] h-[1.5em] bg-white border-r-[0.25em] border-t-[0.25em] border-[#050505] rounded-tl-[0.5em] z-[1]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    {/* Dynamic Metadata */}
    <DynamicHelmet 
      config={{
        title: 'Tournaments',
        description: 'Explore competitive tournaments on Sov Seas - Compete for rewards through multi-stage voting',
        image: '/og-image.png',
        url: typeof window !== 'undefined' ? window.location.href : '',
        type: 'website'
      }}
    />
    
    <div className="min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Input */}
        <div className="mb-8 flex justify-end">
          <div className="flex items-center gap-2">
            <div className="relative group">
              <input
                type="text"
                placeholder="Search tournaments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-4 pr-12 py-2 w-64 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:outline-none focus:shadow-[0.4em_0.4em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] transition-all duration-200 text-sm font-medium text-[#050505] placeholder:text-gray-400"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <Search className="h-4 w-4 text-[#050505]" />
              </div>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <div className="inline-block bg-white border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_#000000] px-[1em] py-[0.5em]">
            <p className="text-[#050505] text-[0.9em] font-bold uppercase tracking-[0.05em]">
              {isLoading ? 'Loading tournaments...' : `${processedTournaments.length} tournaments found`}
            </p>
          </div>
        </div>

        {/* Tournaments Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 gap-y-12">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="group relative w-full max-w-[22em]">
                <div className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] overflow-hidden animate-pulse">
                  <div className="px-[1.4em] py-[1.4em] bg-[#a855f7] border-b-[0.35em] border-[#050505]">
                    <div className="h-6 bg-purple-300 rounded w-3/4"></div>
                  </div>
                  <div className="px-[1.5em] py-[1.5em]">
                    <div className="h-24 bg-gray-200 rounded-full mb-4 mx-auto w-24"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : processedTournaments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 gap-y-12">
            {processedTournaments.map((tournament) => {
              const tournamentId = tournament.id?.toString ? tournament.id.toString() : String(tournament.id);
              
              return (
                <TournamentCard
                  key={tournament.id.toString()}
                  title={`Tournament #${tournament.id.toString()}`}
                  description={`Multi-stage tournament with ${tournament.stageDuration ? formatDuration(tournament.stageDuration) : 'N/A'} stage duration`}
                  status={tournament.status}
                  className="border-purple-300"
                  tournamentId={tournamentId}
                  descriptionTruncateSize={96}
                  createdAt={Number(tournament.createdAt)}
                  stageDuration={tournament.stageDuration}
                  projectCount={tournament.projectCount}
                  stageCount={tournament.stageCount}
                  currentStage={tournament.currentStage}
                />
              );
            })}
          </div>
        ) : (
          <div className="group relative w-full max-w-[22em] mx-auto">
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
              className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2] group-hover:shadow-[1em_1em_0_#000000] group-hover:-translate-x-[0.4em] group-hover:-translate-y-[0.4em] group-hover:scale-[1.02]"
              style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
            >
              {/* Accent Corner */}
              <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#00e0b0] rotate-45 z-[1]" />
              <div className="absolute top-[0.4em] right-[0.4em] text-[#050505] text-[1.2em] font-bold z-[2]">★</div>

              {/* Title Area */}
              <div 
                className="relative px-[1.4em] py-[1.4em] text-white font-extrabold text-center border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
                style={{ 
                  background: '#a855f7',
                  backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
                  backgroundBlendMode: 'overlay'
                }}
              >
                <span className="text-[1.2em]">No Tournaments Found</span>
              </div>

              {/* Body */}
              <div className="relative px-[1.5em] py-[1.5em] z-[2] text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 bg-[#a855f7] border-[0.15em] border-[#050505] rounded-full mb-4 shadow-[0.2em_0.2em_0_#000000]">
                  <Trophy className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-[1.1em] font-bold text-[#050505] mb-2">No Tournaments Found</h3>
                <p className="text-[#050505] text-[0.9em] leading-[1.4] font-medium mb-6 max-w-md mx-auto">
                  {searchTerm 
                    ? 'No tournaments match your search criteria. Try adjusting your search terms.'
                    : 'Be the first to create a tournament and compete for rewards!'
                  }
                </p>
                {searchTerm ? (
                  <ButtonCool
                    onClick={() => setSearchTerm('')}
                    text="Clear Search"
                    bgColor="#a855f7"
                    hoverBgColor="#9333ea"
                    borderColor="#050505"
                    textColor="#ffffff"
                    size="md"
                  />
                ) : (
                  <ButtonCool
                    onClick={() => navigate('/explorer/campaigns')}
                    text="View Campaigns"
                    bgColor="#a855f7"
                    hoverBgColor="#9333ea"
                    borderColor="#050505"
                    textColor="#ffffff"
                    size="md"
                  >
                    <Trophy className="w-4 h-4" />
                  </ButtonCool>
                )}
              </div>

              {/* Corner Slice */}
              <div className="absolute bottom-0 left-0 w-[1.5em] h-[1.5em] bg-white border-r-[0.25em] border-t-[0.25em] border-[#050505] rounded-tl-[0.5em] z-[1]" />
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

// Helper function to format duration
const formatDuration = (seconds: bigint) => {
  const days = Number(seconds) / 86400;
  if (days >= 1) return `${days.toFixed(0)}d`;
  const hours = Number(seconds) / 3600;
  if (hours >= 1) return `${hours.toFixed(0)}h`;
  const minutes = Number(seconds) / 60;
  return `${minutes.toFixed(0)}m`;
};

