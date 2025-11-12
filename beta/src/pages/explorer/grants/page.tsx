import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

// Get contract address from environment - you'll need to add VITE_MILESTONE_CONTRACT to your .env
const MILESTONE_CONTRACT_ADDRESS = (import.meta.env.VITE_MILESTONE_CONTRACT || import.meta.env.VITE_CONTRACT_V4) as Address;

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
      <div className="bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded-lg w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded-lg w-1/2 mb-6"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded-lg"></div>
          <div className="h-4 bg-gray-200 rounded-lg w-5/6"></div>
        </div>
      </div>
    );
  }

  const getStatusBadge = () => {
    switch (grant.status) {
      case 0: // ACTIVE
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Clock className="w-3 h-3 mr-1" />
            Active
          </span>
        );
      case 1: // COMPLETED
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </span>
        );
      case 2: // CANCELLED
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
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
      className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer hover:border-blue-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Grant #{grant.id.toString()}
          </h3>
          <div className="flex items-center gap-2 mb-2">
            {getStatusBadge()}
            <span className="text-xs text-gray-500">
              {grant.entityType === 0 ? 'Project' : 'Campaign'} #{grant.linkedEntityId.toString()}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Grantee:</span>
          <span className="font-mono text-xs text-gray-800">
            {grant.grantee.slice(0, 6)}...{grant.grantee.slice(-4)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Milestones:</span>
          <span className="font-medium text-gray-800">
            {completedMilestones}/{totalMilestones} completed
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Tokens:</span>
          <span className="font-medium text-gray-800">
            {grant.supportedTokens.length} token{grant.supportedTokens.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Created {new Date(Number(grant.createdAt) * 1000).toLocaleDateString()}</span>
          {grant.completedAt > 0n && (
            <span>Completed {new Date(Number(grant.completedAt) * 1000).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GrantsPage() {
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [grantIds, setGrantIds] = useState<bigint[]>([]);
  const [filteredGrantIds, setFilteredGrantIds] = useState<bigint[]>([]);

  // Get grant count
  const { grantCount, isLoading: countLoading, error } = useGrantCount(MILESTONE_CONTRACT_ADDRESS);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-blue-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md mx-auto border border-red-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">Unable to Load Grants</h2>
            <p className="text-gray-600 mb-6">{error.message || 'Something went wrong'}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
            >
              Try Again
            </button>
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
          url: window.location.href,
          type: 'website'
        }}
      />
      
      <div className="min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Grants</h1>
            <p className="text-gray-600">Explore milestone-based funding grants</p>
          </div>

          {/* Search Input */}
          <div className="mb-8 flex justify-end">
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search grants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-4 pr-12 py-2 w-64 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                />
                <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors">
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-6">
            <p className="text-gray-600">
              {countLoading ? 'Loading grants...' : `${filteredGrantIds.length} grant${filteredGrantIds.length !== 1 ? 's' : ''} found`}
            </p>
          </div>

          {/* Grants Grid */}
          {countLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 gap-y-12">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200 p-6 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded-lg w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded-lg w-1/2 mb-6"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded-lg"></div>
                    <div className="h-4 bg-gray-200 rounded-lg w-5/6"></div>
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
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 sm:p-8 text-center border border-blue-100 shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-100/50 via-transparent to-indigo-100/50"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 mb-4 text-white">
                  <Award className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">No Grants Found</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto text-sm sm:text-base">
                  {searchTerm 
                    ? 'No grants match your search criteria. Try adjusting your search terms.'
                    : 'No grants have been created yet. Grants are milestone-based funding opportunities linked to projects or campaigns.'
                  }
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl transition-all inline-flex items-center group relative overflow-hidden"
                  >
                    Clear Search
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

