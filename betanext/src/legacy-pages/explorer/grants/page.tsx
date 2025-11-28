import { useState, useEffect } from 'react';
import { useNavigate } from '@/utils/nextAdapter';
import { 
  Search,
  Award,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useGrantCount, useMultipleMilestones, useSingleGrant, useGrantMilestones } from '@/hooks/useMilestoneFunding';
import { type Address } from 'viem';
import DynamicHelmet from '@/components/DynamicHelmet';
import { ButtonCool } from '@/components/ui/button-cool';

// Get contract address from environment - you'll need to add VITE_MILESTONE_CONTRACT to your .env
const MILESTONE_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_MILESTONE_CONTRACT || process.env.NEXT_PUBLIC_CONTRACT_V4) as Address;

interface GrantCardProps {
  grantId: bigint;
  onClick: () => void;
}

function GrantCard({ grantId, onClick }: GrantCardProps) {
  const { grant, isLoading } = useSingleGrant(MILESTONE_CONTRACT_ADDRESS, grantId);
  const { milestoneIds } = useGrantMilestones(MILESTONE_CONTRACT_ADDRESS, grantId);
  const { milestones } = useMultipleMilestones(MILESTONE_CONTRACT_ADDRESS, milestoneIds);

  if (isLoading || !grant) {
    return (
      <div className="group relative w-full max-w-[22em]">
        <div className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] overflow-hidden animate-pulse">
          <div className="px-[1.4em] py-[1.4em] bg-[#a855f7] border-b-[0.35em] border-[#050505]">
            <div className="h-6 bg-purple-300 rounded w-3/4"></div>
          </div>
          <div className="px-[1.5em] py-[1.5em]">
            <div className="h-4 bg-gray-200 rounded-lg w-1/2 mb-6"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded-lg"></div>
              <div className="h-4 bg-gray-200 rounded-lg w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = () => {
    switch (grant.status) {
      case 0: // ACTIVE
        return (
          <span className="bg-white text-[#050505] text-[0.6em] font-extrabold px-[0.8em] py-[0.4em] border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_#000000] uppercase tracking-[0.1em] rotate-[3deg] inline-flex items-center gap-1">
            <Clock className="w-[0.8em] h-[0.8em]" />
            Active
          </span>
        );
      case 1: // COMPLETED
        return (
          <span className="bg-white text-[#050505] text-[0.6em] font-extrabold px-[0.8em] py-[0.4em] border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_#000000] uppercase tracking-[0.1em] rotate-[3deg] inline-flex items-center gap-1">
            <CheckCircle className="w-[0.8em] h-[0.8em]" />
            Completed
          </span>
        );
      case 2: // CANCELLED
        return (
          <span className="bg-white text-[#050505] text-[0.6em] font-extrabold px-[0.8em] py-[0.4em] border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_#000000] uppercase tracking-[0.1em] rotate-[3deg] inline-flex items-center gap-1">
            <XCircle className="w-[0.8em] h-[0.8em]" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const completedMilestones = milestones.filter(m => m.status === 4).length; // PAID status
  const totalMilestones = milestones.length;

  return (
    <div
      onClick={onClick}
      className="group relative w-full max-w-[22em] cursor-pointer"
    >
      {/* Pattern Overlays */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
          backgroundSize: '0.5em 0.5em'
        }}
      />
      
      {/* Dots Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-[400ms] z-[1]"
        style={{
          backgroundImage: 'radial-gradient(#cfcfcf 1px, transparent 1px)',
          backgroundSize: '1em 1em',
          backgroundPosition: '-0.5em -0.5em'
        }}
      />

      {/* Main Card */}
      <div 
        className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden origin-center z-[2] group-hover:shadow-[1em_1em_0_#000000] group-hover:-translate-x-[0.4em] group-hover:-translate-y-[0.4em] group-hover:scale-[1.02] active:translate-x-[0.1em] active:translate-y-[0.1em] active:scale-[0.98] active:shadow-[0.5em_0.5em_0_#000000]"
        style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
      >
        {/* Accent Corner */}
        <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#a855f7] rotate-45 z-[1]" />
        <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>

        {/* Title Area */}
        <div 
          className="relative px-[1.4em] py-[1.4em] text-white font-extrabold flex justify-between items-center border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2] overflow-hidden"
          style={{ 
            background: '#a855f7',
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
            backgroundBlendMode: 'overlay'
          }}
        >
          <span className="flex-1 pr-2 break-words text-[0.9em]">
            Grant #{grant.id.toString()}
          </span>
          {getStatusBadge()}
        </div>

        {/* Body */}
        <div className="relative px-[1.5em] py-[1.5em] z-[2]">
          <div className="mb-3">
            <span className="text-[0.7em] font-extrabold text-[#050505] uppercase tracking-[0.05em]">
              {grant.entityType === 0 ? 'Project' : 'Campaign'} #{grant.linkedEntityId.toString()}
            </span>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-[0.85em]">
              <span className="font-semibold text-[#050505]">Grantee:</span>
              <span className="font-mono text-[0.75em] text-[#050505] bg-gray-100 px-2 py-1 border-[0.1em] border-[#050505] rounded-[0.2em]">
                {grant.grantee.slice(0, 6)}...{grant.grantee.slice(-4)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[0.85em]">
              <span className="font-semibold text-[#050505]">Milestones:</span>
              <span className="font-extrabold text-[#050505]">
                {completedMilestones}/{totalMilestones} completed
              </span>
            </div>
            <div className="flex items-center justify-between text-[0.85em]">
              <span className="font-semibold text-[#050505]">Tokens:</span>
              <span className="font-extrabold text-[#050505]">
                {grant.supportedTokens.length} token{grant.supportedTokens.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t-[0.15em] border-[#050505]">
            <div className="flex items-center justify-between text-[0.65em] text-[#050505] font-medium">
              <span>Created {new Date(Number(grant.createdAt) * 1000).toLocaleDateString()}</span>
              {grant.completedAt > 0n && (
                <span>Completed {new Date(Number(grant.completedAt) * 1000).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute w-[2.5em] h-[2.5em] bg-[#a855f7] border-[0.15em] border-[#050505] rounded-[0.3em] rotate-45 -bottom-[1.2em] right-[2em] z-0 transition-transform duration-300 group-hover:rotate-[55deg] group-hover:scale-110" />
        <div className="absolute bottom-0 left-0 w-[1.5em] h-[1.5em] bg-white border-r-[0.25em] border-t-[0.25em] border-[#050505] rounded-tl-[0.5em] z-[1]" />
      </div>
    </div>
  );
}

export default function GrantsPage() {
  const navigate = useNavigate();
  const [isMounted] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [grantIds, setGrantIds] = useState<bigint[]>([]);
  const [filteredGrantIds, setFilteredGrantIds] = useState<bigint[]>([]);

  // Get grant count
  const { grantCount, isLoading: countLoading, error } = useGrantCount(MILESTONE_CONTRACT_ADDRESS);

  // Generate grant IDs from count
  useEffect(() => {
    if (grantCount && grantCount > 0n) {
      const ids = Array.from({ length: Number(grantCount) }, (_, i) => BigInt(i));
      setGrantIds(ids);
      setFilteredGrantIds(ids);
    } else {
      setGrantIds([]);
      setFilteredGrantIds([]);
    }
  }, [grantCount]);

  // Filter grants (for now, we'll filter by ID since we don't have full grant data loaded)
  useEffect(() => {
    if (!searchTerm) {
      setFilteredGrantIds(grantIds);
      return;
    }

    // For now, just filter by ID match
    // In a real implementation, you'd want to load grant data and filter by grantee, entity, etc.
    const query = searchTerm.toLowerCase();
    const filtered = grantIds.filter(id => 
      id.toString().includes(query)
    );
    setFilteredGrantIds(filtered);
  }, [searchTerm, grantIds]);

  if (!isMounted) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
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
              <span className="text-[1.2em]">Unable to Load Grants</span>
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
      <DynamicHelmet 
        config={{
          title: 'Grants',
          description: 'Explore milestone-based grants on Sov Seas - Track funding progress and milestone completion',
          image: '/og-image.png',
        url: typeof window !== 'undefined' ? window.location.href : '',
          type: 'website'
        }}
      />
      
      <div className="min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-block bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] px-[1.5em] py-[1em] mb-4">
              <h1 className="text-3xl font-extrabold text-[#050505] mb-2 uppercase tracking-[0.05em]">Grants</h1>
              <p className="text-[#050505] font-semibold text-[0.9em]">Explore milestone-based funding grants</p>
            </div>
          </div>

          {/* Search Input */}
          <div className="mb-8 flex justify-end">
            <div className="flex items-center gap-2">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Search grants..."
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
                {countLoading ? 'Loading grants...' : `${filteredGrantIds.length} grant${filteredGrantIds.length !== 1 ? 's' : ''} found`}
              </p>
            </div>
          </div>

          {/* Grants Grid */}
          {countLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 gap-y-12">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="group relative w-full max-w-[22em]">
                  <div className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] overflow-hidden animate-pulse">
                    <div className="px-[1.4em] py-[1.4em] bg-[#a855f7] border-b-[0.35em] border-[#050505]">
                      <div className="h-6 bg-purple-300 rounded w-3/4"></div>
                    </div>
                    <div className="px-[1.5em] py-[1.5em]">
                      <div className="h-4 bg-gray-200 rounded-lg w-1/2 mb-6"></div>
                      <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded-lg"></div>
                        <div className="h-4 bg-gray-200 rounded-lg w-5/6"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredGrantIds.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 gap-y-12">
              {filteredGrantIds.map((grantId) => (
                <GrantCard
                  key={grantId.toString()}
                  grantId={grantId}
                  onClick={() => navigate(`/explorer/grant/${grantId.toString()}`)}
                />
              ))}
            </div>
          ) : (
            <div className="group relative w-full max-w-[28em] mx-auto">
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
                <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>

                {/* Title Area */}
                <div 
                  className="relative px-[1.4em] py-[1.4em] text-white font-extrabold text-center border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
                  style={{ 
                    background: '#a855f7',
                    backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
                    backgroundBlendMode: 'overlay'
                  }}
                >
                  <span className="text-[1.2em]">No Grants Found</span>
                </div>

                {/* Body */}
                <div className="relative px-[1.5em] py-[1.5em] z-[2] text-center">
                  <div className="inline-flex items-center justify-center h-16 w-16 border-[0.15em] border-[#050505] rounded-full bg-[#a855f7] mb-4 shadow-[0.2em_0.2em_0_#000000]">
                    <Award className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-[#050505] text-[0.95em] leading-[1.4] font-medium mb-6 max-w-md mx-auto">
                    {searchTerm 
                      ? 'No grants match your search criteria. Try adjusting your search terms.'
                      : 'No grants have been created yet. Grants are milestone-based funding opportunities linked to projects or campaigns.'
                    }
                  </p>
                  {searchTerm && (
                    <ButtonCool
                      onClick={() => setSearchTerm('')}
                      text="Clear Search"
                      bgColor="#a855f7"
                      hoverBgColor="#9333ea"
                      borderColor="#050505"
                      textColor="#ffffff"
                      size="md"
                    />
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

