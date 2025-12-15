'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  X, 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  Crown, 
  Ship, 

  Trophy, 
  Coins,
  Timer,
  Sparkles,
  DollarSign,
  Info,

  Calendar,
  Activity,
  Clock,

  Target,
  Filter,
  Search,
  SortDesc,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Flame,
  BarChart3
} from 'lucide-react';
import { useProjectCampaigns, useAddProjectToCampaign } from '@/hooks/useProjectMethods';
import { useAllCampaigns } from '@/hooks/useCampaignMethods';
import { formatEther } from 'viem';
import type { Address } from 'viem';
import { formatIpfsUrl } from '@/utils/imageUtils';
import { useAccount } from 'wagmi';
import { getMainContractAddress } from '@/utils/contractConfig';

// ==================== TYPES ====================

interface ProjectCampaignsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

interface CampaignStatus {
  id: 'upcoming' | 'active' | 'ended' | 'inactive';
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface FilterOption {
  id: string;
  label: string;
  count: number;
}

interface SortOption {
  id: 'name' | 'treasury' | 'startTime' | 'endTime';
  label: string;
}

// ==================== CONSTANTS ====================

const PARTICIPATION_FEE = '1.0'; // 1 CELO
const contractAddress = getMainContractAddress();

const campaignStatuses: Record<string, CampaignStatus> = {
  upcoming: {
    id: 'upcoming',
    label: 'Launching Soon',
    bgClass: 'bg-gradient-to-r from-amber-50 to-orange-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
    icon: Timer
  },
  active: {
    id: 'active',
    label: 'Live Campaign',
    bgClass: 'bg-gradient-to-r from-emerald-50 to-green-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
    icon: Flame
  },
  ended: {
    id: 'ended',
    label: 'Mission Complete',
    bgClass: 'bg-gradient-to-r from-blue-50 to-indigo-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
    icon: Trophy
  },
  inactive: {
    id: 'inactive',
    label: 'Inactive',
    bgClass: 'bg-gray-50',
    textClass: 'text-gray-600',
    borderClass: 'border-gray-200',
    icon: Clock
  }
};

const sortOptions: SortOption[] = [
  { id: 'name', label: 'Campaign Name' },
  { id: 'treasury', label: 'Prize Pool' },
  { id: 'startTime', label: 'Start Date' },
  { id: 'endTime', label: 'End Date' }
];

// ==================== UTILITY FUNCTIONS ====================

const getCampaignStatus = (campaign: any): string => {
  const now = Math.floor(Date.now() / 1000);
  const startTime = Number(campaign.startTime);
  const endTime = Number(campaign.endTime);
  
  if (!campaign.active) return 'inactive';
  if (now < startTime) return 'upcoming';
  if (now >= startTime && now <= endTime) return 'active';
  return 'ended';
};

const getCampaignLogo = (campaign: any): string | null => {
  try {
    if (campaign.metadata?.mainInfo) {
      const mainInfo = JSON.parse(campaign.metadata.mainInfo);
      if (mainInfo.logo) return mainInfo.logo;
    }
    
    if (campaign.metadata?.additionalInfo) {
      const additionalInfo = JSON.parse(campaign.metadata.additionalInfo);
      if (additionalInfo.logo) return additionalInfo.logo;
    }
  } catch (e) {
    console.warn('Failed to parse campaign metadata:', e);
  }
  return null;
};

const formatTimeRemaining = (timestamp: bigint): string => {
  const now = Math.floor(Date.now() / 1000);
  const diff = Number(timestamp) - now;
  
  if (diff <= 0) return 'Ended';
  
  const days = Math.floor(diff / (24 * 60 * 60));
  const hours = Math.floor((diff % (24 * 60 * 60)) / (60 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  return 'Soon';
};

// ==================== COMPONENTS ====================

interface CampaignCardProps {
  campaign: any;
  onJoin: (campaignId: string) => void;
  isLoading: boolean;
  isJoined?: boolean;
}

const CampaignCard: React.FC<CampaignCardProps> = ({ campaign, onJoin, isLoading, isJoined = false }) => {
  const status = getCampaignStatus(campaign);
  const statusConfig = campaignStatuses[status];
  const logo = getCampaignLogo(campaign);
  const timeRemaining = status === 'active' ? formatTimeRemaining(campaign.endTime) : null;

  return (
    <div className={`group relative bg-white border-[0.35em] rounded-[0.6em] shadow-[0.5em_0.5em_0_#000000] transition-all duration-[400ms] hover:shadow-[0.7em_0.7em_0_#000000] hover:-translate-x-[0.2em] hover:-translate-y-[0.2em] overflow-hidden ${
      isJoined ? 'border-[#10b981] bg-[#d1fae5]' : 'border-[#050505]'
    }`}
    style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
    >
      {/* Status Badge */}
      <div className={`absolute top-3 right-3 px-2 py-1 border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.1em_0.1em_0_#000000] text-xs font-extrabold flex items-center gap-1 uppercase tracking-[0.05em] ${statusConfig.bgClass} ${statusConfig.textClass}`}>
        <statusConfig.icon className="w-3 h-3" />
        {statusConfig.label}
      </div>

      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          {/* Campaign Logo */}
          <div className="relative flex-shrink-0">
            {logo ? (
              <img 
                src={formatIpfsUrl(logo)} 
                alt={`${campaign.name} logo`}
                className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div className={`w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center text-white text-sm font-semibold ${logo ? 'hidden' : 'flex'}`}>
              {campaign.name?.charAt(0) || 'C'}
            </div>
            {isJoined && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-[#050505] text-base mb-1 group-hover:text-[#050505] transition-colors truncate uppercase tracking-[0.05em]">
              {campaign.name}
            </h3>
            <p className="text-[#050505] text-sm leading-relaxed line-clamp-2 mb-2 font-semibold">
              {campaign.description}
            </p>
            
            {timeRemaining && status === 'active' && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#fee2e2] text-[#050505] border-[0.15em] border-[#ef4444] rounded-[0.3em] shadow-[0.1em_0.1em_0_#000000] text-xs font-extrabold uppercase tracking-[0.05em]">
                <Clock className="w-3 h-3" />
                {timeRemaining} left
              </div>
            )}
          </div>
        </div>
        
        {/* Campaign Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 bg-gray-50 border-[0.15em] border-gray-300 rounded-[0.4em] shadow-[0.1em_0.1em_0_#000000]">
            <div className="flex items-center gap-1.5 mb-1">
              <Coins className="w-3 h-3 text-[#050505]" />
              <span className="text-xs text-[#050505] font-extrabold uppercase tracking-[0.05em]">Prize Pool</span>
            </div>
            <p className="font-extrabold text-[#050505] text-sm">
              {parseFloat(formatEther(campaign.totalFunds || 0n)).toFixed(1)} CELO
            </p>
          </div>
          
          <div className="p-3 bg-gray-50 border-[0.15em] border-gray-300 rounded-[0.4em] shadow-[0.1em_0.1em_0_#000000]">
            <div className="flex items-center gap-1.5 mb-1">
              <Trophy className="w-3 h-3 text-[#050505]" />
              <span className="text-xs text-[#050505] font-extrabold uppercase tracking-[0.05em]">Max Winners</span>
            </div>
            <p className="font-extrabold text-[#050505] text-sm">
              {Number(campaign.maxWinners) || 'All'}
            </p>
          </div>
        </div>

        {/* Timeline Info */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{new Date(Number(campaign.startTime) * 1000).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Timer className="w-3 h-3" />
            <span>{new Date(Number(campaign.endTime) * 1000).toLocaleDateString()}</span>
          </div>
        </div>
        
        {/* Action Button */}
        {isJoined ? (
          <div className="flex items-center justify-center gap-2 p-2.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
            <CheckCircle className="w-4 h-4" />
            <span className="font-medium text-sm">Participating</span>
          </div>
        ) : (
          <button
            onClick={() => onJoin(campaign.id.toString())}
            disabled={isLoading || status === 'ended' || status === 'inactive'}
            className="w-full p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Joining...</span>
              </>
            ) : status === 'ended' ? (
              <>
                <Clock className="w-4 h-4" />
                <span>Campaign Ended</span>
              </>
            ) : status === 'inactive' ? (
              <>
                <AlertCircle className="w-4 h-4" />
                <span>Inactive</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Join Campaign</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

const FeeNotice: React.FC = () => (
  <div className="bg-[#fef3c7] border-[0.2em] border-[#f59e0b] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] p-4 mb-6">
    <div className="flex items-start gap-3">
      <div className="p-1.5 bg-[#fde68a] border-[0.15em] border-[#f59e0b] rounded-[0.3em] shadow-[0.1em_0.1em_0_#000000]">
        <DollarSign className="w-4 h-4 text-[#050505]" />
      </div>
      <div className="flex-1">
        <h4 className="font-extrabold text-[#050505] text-sm mb-1 uppercase tracking-[0.05em]">
          Participation Fee: {PARTICIPATION_FEE} CELO
        </h4>
        <p className="text-[#050505] text-sm leading-relaxed font-semibold">
          Required to prevent spam and ensure serious participation. Fees contribute to prize pools.
        </p>
      </div>
    </div>
  </div>
);

// ==================== MAIN COMPONENT ====================

const ProjectCampaignsModal: React.FC<ProjectCampaignsModalProps> = ({ isOpen, onClose, projectId }) => {
  const { address, isConnected } = useAccount();
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption['id']>('name');

  // Hooks
  const { projectCampaigns, isLoading: isLoadingProjectCampaigns, error: hookError } = useProjectCampaigns(
    contractAddress,
    BigInt(projectId)
  );

  const { campaigns: allCampaigns, isLoading: isLoadingCampaigns } = useAllCampaigns(contractAddress);
  
  const { addProjectToCampaign, isPending: isAddingProject } = useAddProjectToCampaign(contractAddress);

  // Effects
  useEffect(() => {
    if (hookError) {
      setError('Failed to load campaigns. Please try again.');
    }
  }, [hookError]);

  // Computed values
  const availableCampaigns = useMemo(() => {
    if (!allCampaigns) return [];
    
    return allCampaigns.filter(campaignDetails => {
      const campaignId = Number(campaignDetails.campaign.id);
      return !projectCampaigns?.filter((pc): pc is NonNullable<typeof pc> => pc !== null).some(pc => Number(pc.id) === campaignId);
    });
  }, [allCampaigns, projectCampaigns]);

  const filteredAndSortedCampaigns = useMemo(() => {
    let filtered = availableCampaigns;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(campaign => 
        campaign.campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.campaign.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => 
        getCampaignStatus(campaign.campaign) === statusFilter
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.campaign.name.localeCompare(b.campaign.name);
        case 'treasury':
          return Number(b.campaign.totalFunds) - Number(a.campaign.totalFunds);
        case 'startTime':
          return Number(a.campaign.startTime) - Number(b.campaign.startTime);
        case 'endTime':
          return Number(a.campaign.endTime) - Number(b.campaign.endTime);
        default:
          return 0;
      }
    });

    return filtered;
  }, [availableCampaigns, searchTerm, statusFilter, sortBy]);

  const filterOptions: FilterOption[] = useMemo(() => {
    const statusCounts = availableCampaigns.reduce((acc, campaign) => {
      const status = getCampaignStatus(campaign.campaign);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { id: 'all', label: 'All', count: availableCampaigns.length },
      { id: 'active', label: 'Live', count: statusCounts.active || 0 },
      { id: 'upcoming', label: 'Upcoming', count: statusCounts.upcoming || 0 },
      { id: 'ended', label: 'Ended', count: statusCounts.ended || 0 }
    ];
  }, [availableCampaigns]);

  // Handlers
  const handleAddToCampaign = async (campaignId: string) => {
    if (!isConnected || !address) {
      setError('Please connect your wallet to join campaigns.');
      return;
    }

    try {
      setError(null);
      
      const campaign = allCampaigns?.find((c) => Number(c.campaign.id) === Number(campaignId));
      
      const feeTokenAddress = (campaign?.campaign.payoutToken ||
                             process.env.NEXT_PUBLIC_CELO_TOKEN_ADDRESS ||
                             contractAddress) as Address;
      
      await addProjectToCampaign({
        campaignId: BigInt(campaignId),
        projectId: BigInt(projectId),
        feeToken: feeTokenAddress
      });
      
    } catch (err: any) {
      console.error('Error adding project to campaign:', err);
      
      let errorMessage = 'Failed to join campaign. Please try again.';
      
      if (err?.message) {
        if (err.message.includes('user rejected')) {
          errorMessage = 'Transaction was rejected. No fees were charged.';
        } else if (err.message.includes('insufficient funds')) {
          errorMessage = `Insufficient CELO balance. You need at least ${PARTICIPATION_FEE} CELO to join.`;
        } else if (err.message.includes('Campaign has ended')) {
          errorMessage = 'This campaign has already ended.';
        } else if (err.message.includes('Project already in campaign')) {
          errorMessage = 'Your project is already participating in this campaign.';
        } else if (err.message.includes('Fee token not supported')) {
          errorMessage = 'The fee token is not supported for this campaign.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    }
  };

  const isLoading = isLoadingProjectCampaigns || isLoadingCampaigns;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-[0.6em] bg-white border-[0.35em] border-[#a855f7] shadow-[0.7em_0.7em_0_#000000] transition-all max-h-[90vh] flex flex-col relative">
                {/* Pattern Grid Overlay */}
                <div 
                  className="absolute inset-0 pointer-events-none opacity-30 z-[1]"
                  style={{
                    backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                    backgroundSize: '0.5em 0.5em'
                  }}
                />

                {/* Accent Corner */}
                <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#a855f7] rotate-45 z-[1]" />
                <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>

                {/* Header */}
                <div className="relative flex items-center justify-between px-[1.5em] py-[1.4em] border-b-[0.35em] border-[#050505] z-[2]"
                  style={{ 
                    background: '#a855f7',
                    backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
                    backgroundBlendMode: 'overlay'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 border-[0.15em] border-white/30 rounded-[0.3em]">
                      <Crown className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-white uppercase tracking-[0.05em]">Campaign Manager</h3>
                      <p className="text-white/90 text-sm font-semibold">Manage your project's campaign participation</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-white hover:text-white/80 transition-colors p-1 border-[0.15em] border-white/30 rounded-[0.3em] hover:bg-white/20"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-[1.5em] relative z-[2]">
                  {/* Fee Notice */}
                  <FeeNotice />

                  {/* Current Campaigns Section */}
                  {projectCampaigns && projectCampaigns.length > 0 && (
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <Ship className="h-4 w-4 text-emerald-600" />
                        <h4 className="text-lg font-semibold text-gray-900">Active Participations</h4>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                          {projectCampaigns.length}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {projectCampaigns?.filter((campaign): campaign is NonNullable<typeof campaign> => campaign !== null).map((campaign) => (
                          <div key={Number(campaign.id)} className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="relative">
                                {getCampaignLogo(campaign) ? (
                                  <img 
                                    src={formatIpfsUrl(getCampaignLogo(campaign)!)} 
                                    alt={`${campaign.name} logo`}
                                    className="w-10 h-10 rounded-lg object-cover border border-emerald-200"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const fallback = target.nextSibling as HTMLElement;
                                      if (fallback) fallback.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div className={`w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white text-sm font-semibold ${getCampaignLogo(campaign) ? 'hidden' : 'flex'}`}>
                                  {campaign.name?.charAt(0) || 'C'}
                                </div>
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                  <CheckCircle className="w-2.5 h-2.5 text-white" />
                                </div>
                              </div>
                              
                              <div className="flex-1">
                                <h5 className="font-semibold text-emerald-900 text-sm mb-0.5">{campaign.name}</h5>
                                <p className="text-emerald-700 text-xs flex items-center gap-1">
                                  <Activity className="w-3 h-3" />
                                  Participating
                                </p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div className="text-center p-2 bg-white/60 rounded">
                                <p className="text-xs text-emerald-600 mb-0.5">Your Votes</p>
                                <p className="font-semibold text-emerald-800 text-sm">
                                  {parseFloat(formatEther(campaign.participation?.voteCount || 0n)).toFixed(1)}
                                </p>
                              </div>
                              <div className="text-center p-2 bg-white/60 rounded">
                                <p className="text-xs text-emerald-600 mb-0.5">Status</p>
                                <p className={`font-semibold text-xs ${
                                  campaign.participation?.approved ? 'text-emerald-700' : 'text-amber-700'
                                }`}>
                                  {campaign.participation?.approved ? 'Approved' : 'Pending'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
 
                  {/* Error Message */}
                  {error && (
                    <div className="bg-[#fee2e2] border-[0.2em] border-[#ef4444] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-4 w-4 text-[#ef4444] mt-0.5" />
                        <div>
                          <p className="font-extrabold text-[#050505] text-sm mb-1 uppercase tracking-[0.05em]">Transaction Failed</p>
                          <p className="text-[#050505] text-sm font-semibold">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Loading State */}
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-[#a855f7] mb-4" />
                      <h4 className="text-lg font-extrabold text-[#050505] mb-2 uppercase tracking-[0.05em]">Loading Campaigns</h4>
                      <p className="text-[#050505] font-semibold">Discovering available opportunities...</p>
                    </div>
                  ) : availableCampaigns.length === 0 ? (
                    <div className="bg-gray-50 border-[0.2em] border-gray-300 rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] p-8 text-center">
                      <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-extrabold text-[#050505] mb-2 uppercase tracking-[0.05em]">
                        {allCampaigns?.length === 0 ? 'No Campaigns Available' : 'All Campaigns Joined!'}
                      </h4>
                      <p className="text-[#050505] mb-6 font-semibold">
                        {allCampaigns?.length === 0 
                          ? 'No campaigns are currently available. Be the first to create one!' 
                          : 'Congratulations! Your project is participating in all available campaigns.'}
                      </p>
                      <button
                        onClick={() => {/* TODO: Navigate to create campaign */}}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#1f2937] text-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all font-extrabold uppercase tracking-[0.05em]"
                      >
                        <Sparkles className="h-4 w-4" />
                        Create New Campaign
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Search and Filters */}
                      <div className="bg-gray-50 border-[0.2em] border-gray-300 rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] p-4">
                        <div className="flex flex-col lg:flex-row gap-3">
                          {/* Search */}
                          <div className="flex-1">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#050505]" />
                              <input
                                type="text"
                                placeholder="Search campaigns..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] focus:outline-none text-sm font-semibold"
                              />
                            </div>
                          </div>
                          
                          {/* Status Filter */}
                          <div className="flex gap-1">
                            {filterOptions.map((option) => (
                              <button
                                key={option.id}
                                onClick={() => setStatusFilter(option.id)}
                                className={`px-3 py-2 border-[0.2em] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all font-extrabold uppercase tracking-[0.05em] text-sm flex items-center gap-1.5 ${
                                  statusFilter === option.id
                                    ? 'bg-[#1f2937] text-white border-[#050505]'
                                    : 'bg-white text-[#050505] hover:bg-gray-100 border-[#050505]'
                                }`}
                              >
                                {option.label}
                                <span className={`px-1.5 py-0.5 text-xs rounded-[0.3em] border-[0.1em] font-extrabold ${
                                  statusFilter === option.id
                                    ? 'bg-white/20 text-white border-white/30'
                                    : 'bg-gray-100 text-[#050505] border-[#050505]'
                                }`}>
                                  {option.count}
                                </span>
                              </button>
                            ))}
                          </div>
                          
                          {/* Sort */}
                          <div className="relative">
                            <select
                              value={sortBy}
                              onChange={(e) => setSortBy(e.target.value as SortOption['id'])}
                              className="appearance-none pl-3 pr-8 py-2 border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] focus:outline-none text-sm bg-white font-semibold"
                              >
                              {sortOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                  Sort by {option.label}
                                </option>
                              ))}
                            </select>
                            <SortDesc className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>
 
                      {/* Available Campaigns Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-slate-600" />
                          <h4 className="text-lg font-semibold text-gray-900">Available Campaigns</h4>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <BarChart3 className="h-4 w-4" />
                          <span>{filteredAndSortedCampaigns.length} found</span>
                        </div>
                      </div>
                      
                      {/* Campaign Grid */}
                      {filteredAndSortedCampaigns.length === 0 ? (
                        <div className="text-center py-8">
                          <Filter className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <h5 className="text-base font-medium text-gray-600 mb-1">No campaigns match your criteria</h5>
                          <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {filteredAndSortedCampaigns.map((campaignDetails) => (
                            <CampaignCard
                              key={Number(campaignDetails.campaign.id)}
                              campaign={campaignDetails.campaign}
                              onJoin={handleAddToCampaign}
                              isLoading={isAddingProject}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
 
                {/* Footer */}
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Info className="h-4 w-4" />
                      <span>Participation fees help maintain campaign quality and boost prize pools</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors font-medium text-sm"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => {/* TODO: Navigate to campaigns page */}}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all duration-200 font-medium flex items-center gap-2 text-sm"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Browse All
                      </button>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
 };
 
 export default ProjectCampaignsModal;