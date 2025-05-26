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
  Waves, 
  Trophy, 
  Coins,
  Users,
  Timer,
  Sparkles,
  Anchor,
  DollarSign,
  Info,
  Shield,
  Zap,
  Star,
  Eye,
  Calendar,
  MapPin,
  TrendingUp,
  Activity,
  Clock,
  Banknote,
  Wallet,
  ArrowRight,
  Gift,
  Target,
  Filter,
  Search,
  SortDesc,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Award,
  Flame,
  BookOpen,
  BarChart3
} from 'lucide-react';
import { useProjectCampaigns, useAddProjectToCampaign } from '@/hooks/useProjectMethods';
import { useAllCampaigns } from '@/hooks/useCampaignMethods';
import { formatEther, Address } from 'viem';
import { formatIpfsUrl } from '@/utils/imageUtils';
import { useAccount } from 'wagmi';

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
const contractAddress = import.meta.env.VITE_CONTRACT_V4 as Address;

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
    <div className={`group relative bg-white/95 backdrop-blur-sm rounded-2xl border-2 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden ${
      isJoined ? 'border-emerald-300 bg-gradient-to-br from-emerald-50/50 to-green-50/50' : statusConfig.borderClass
    }`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-4 right-4 w-32 h-32 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-4 left-4 w-24 h-24 bg-gradient-to-tr from-purple-400 to-pink-500 rounded-full blur-2xl"></div>
      </div>

      {/* Status Badge */}
      <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm border ${statusConfig.bgClass} ${statusConfig.textClass} ${statusConfig.borderClass}`}>
        <statusConfig.icon className="w-3 h-3" />
        {statusConfig.label}
      </div>

      <div className="relative p-6">
        <div className="flex items-start gap-4 mb-6">
          {/* Campaign Logo */}
          <div className="relative">
            {logo ? (
              <img 
                src={formatIpfsUrl(logo)} 
                alt={`${campaign.name} logo`}
                className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-md group-hover:shadow-lg transition-shadow duration-300"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div className={`w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-md border-2 border-white ${logo ? 'hidden' : 'flex'}`}>
              {campaign.name?.charAt(0) || 'C'}
            </div>
            {isJoined && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                <CheckCircle className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-blue-600 transition-colors duration-300 truncate">
              {campaign.name}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-3">
              {campaign.description}
            </p>
            
            {timeRemaining && status === 'active' && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                <Clock className="w-3 h-3" />
                {timeRemaining} left
              </div>
            )}
          </div>
        </div>
        
        {/* Campaign Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3 bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg border border-emerald-100">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-emerald-700 font-medium">Prize Pool</span>
            </div>
            <p className="font-bold text-emerald-800 text-lg">
              {parseFloat(formatEther(campaign.totalFunds || 0n)).toFixed(1)} CELO
            </p>
          </div>
          
          <div className="p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-100">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-purple-700 font-medium">Max Winners</span>
            </div>
            <p className="font-bold text-purple-800 text-lg">
              {Number(campaign.maxWinners) || 'All'}
            </p>
          </div>
        </div>

        {/* Timeline Info */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-6">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Starts: {new Date(Number(campaign.startTime) * 1000).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Timer className="w-3 h-3" />
            <span>Ends: {new Date(Number(campaign.endTime) * 1000).toLocaleDateString()}</span>
          </div>
        </div>
        
        {/* Action Button */}
        {isJoined ? (
          <div className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 rounded-xl border border-emerald-200">
            <CheckCircle className="w-4 h-4" />
            <span className="font-semibold">Already Participating</span>
          </div>
        ) : (
          <button
            onClick={() => onJoin(campaign.id.toString())}
            disabled={isLoading || status === 'ended' || status === 'inactive'}
            className="w-full p-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 group/btn relative overflow-hidden shadow-md hover:shadow-lg"
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
                <Plus className="w-4 h-4 group-hover/btn:rotate-90 transition-transform duration-300" />
                <span>Join Campaign</span>
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-300" />
              </>
            )}
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></span>
          </button>
        )}
      </div>
    </div>
  );
};

const FeeNotice: React.FC = () => (
  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 mb-8">
    <div className="flex items-start gap-4">
      <div className="p-3 bg-amber-100 rounded-xl">
        <DollarSign className="w-6 h-6 text-amber-600" />
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-amber-900 text-lg mb-2 flex items-center gap-2">
          Participation Fee
          <Info className="w-4 h-4 text-amber-600" />
        </h4>
        <p className="text-amber-800 mb-4 leading-relaxed">
          Joining a campaign requires a <span className="font-bold">{PARTICIPATION_FEE} CELO</span> participation fee to prevent spam and ensure serious participation.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg border border-amber-100">
            <Shield className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-900 text-sm">Anti-Spam Protection</p>
              <p className="text-amber-700 text-xs">Ensures quality participation</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg border border-amber-100">
            <Gift className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-900 text-sm">Boosts Prize Pool</p>
              <p className="text-amber-700 text-xs">Fees contribute to rewards</p>
            </div>
          </div>
        </div>
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
      { id: 'all', label: 'All Campaigns', count: availableCampaigns.length },
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
      
      const feeTokenAddress = campaign?.campaign.payoutToken || 
                             import.meta.env.VITE_CELO_TOKEN_ADDRESS || 
                             contractAddress;
      
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
          <div className="fixed inset-0 bg-gradient-to-br from-blue-900/60 via-indigo-900/60 to-purple-900/60 backdrop-blur-sm" />
        </Transition.Child>

        {/* Animated background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gradient-to-r from-blue-400/10 to-cyan-400/10 animate-pulse blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-gradient-to-r from-indigo-400/10 to-purple-400/10 animate-pulse blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-gradient-to-r from-purple-400/10 to-pink-400/10 animate-pulse blur-3xl"></div>
        </div>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 -translate-y-10"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 -translate-y-10"
            >
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-3xl bg-white/95 backdrop-blur-xl text-left align-middle shadow-2xl transition-all border border-blue-200/50 relative max-h-[90vh] flex flex-col">
                {/* Decorative elements */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 via-purple-500 to-pink-500"></div>
                <div className="absolute top-2 left-6 w-4 h-4 bg-blue-400 rounded-full animate-pulse"></div>
                <div className="absolute top-2 right-20 w-3 h-3 bg-purple-400 rounded-full animate-pulse delay-100"></div>
                <div className="absolute top-4 right-32 w-2 h-2 bg-pink-400 rounded-full animate-pulse delay-200"></div>
                
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-6 right-6 z-10 text-gray-400 hover:text-gray-600 hover:rotate-90 transition-all duration-300 p-2 rounded-full hover:bg-gray-100/80 backdrop-blur-sm"
                >
                  <X className="h-6 w-6" />
                </button>

                {/* Header */}
                <div className="p-8 pb-6">
                  <Dialog.Title className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                      <Crown className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                        Campaign Manager
                      </h3>
                      <p className="text-gray-600 text-lg">Manage your project's campaign participation</p>
                    </div>
                  </Dialog.Title>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-8 pb-8">
                  {/* Fee Notice */}
                  <FeeNotice />

                  {/* Current Campaigns Section */}
                  {projectCampaigns && projectCampaigns.length > 0 && (
                    <div className="mb-10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <Ship className="h-5 w-5 text-emerald-600" />
                        </div>
                        <h4 className="text-2xl font-bold text-gray-900">Active Participations</h4>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                          {projectCampaigns.length} campaign{projectCampaigns.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {projectCampaigns?.filter((campaign): campaign is NonNullable<typeof campaign> => campaign !== null).map((campaign) => (
                          <div key={Number(campaign.id)} className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border-2 border-emerald-200 shadow-sm hover:shadow-md transition-all duration-300">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="relative">
                                {getCampaignLogo(campaign) ? (
                                  <img 
                                    src={formatIpfsUrl(getCampaignLogo(campaign)!)} 
                                    alt={`${campaign.name} logo`}
                                    className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-200 shadow-sm"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const fallback = target.nextSibling as HTMLElement;
                                      if (fallback) fallback.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div className={`w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center text-white font-bold shadow-sm border-2 border-emerald-200 ${getCampaignLogo(campaign) ? 'hidden' : 'flex'}`}>
                                  {campaign.name?.charAt(0) || 'C'}
                                </div>
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white">
                                  <CheckCircle className="w-3 h-3 text-white" />
                                </div>
                              </div>
                              
                              <div className="flex-1">
                                <h5 className="font-bold text-emerald-900 text-lg mb-1">{campaign.name}</h5>
                                <p className="text-emerald-700 text-sm capitalize flex items-center gap-1">
                                  <Activity className="w-3 h-3" />
                                  {campaign.status} • Participating
                                </p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-3 bg-white/60 rounded-lg">
                                <p className="text-xs text-emerald-600 mb-1">Your Votes</p>
                                <p className="font-bold text-emerald-800">
                                  {parseFloat(formatEther(campaign.participation?.voteCount || 0n)).toFixed(1)}
                                </p>
                              </div>
                              <div className="text-center p-3 bg-white/60 rounded-lg">
                                <p className="text-xs text-emerald-600 mb-1">Status</p>
                                <p className={`font-bold text-sm ${
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
                    <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl p-6 mb-8 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <p className="font-bold text-red-900 mb-2">Transaction Failed</p>
                          <p className="text-red-700 leading-relaxed">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}
 
                  {/* Loading State */}
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="relative mb-6">
                        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        <Waves className="h-8 w-8 text-blue-600 absolute inset-0 m-auto animate-pulse" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 mb-2">Loading Campaigns</h4>
                      <p className="text-gray-600">Discovering available opportunities...</p>
                    </div>
                  ) : availableCampaigns.length === 0 ? (
                    <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-12 text-center border-2 border-gray-200">
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Trophy className="h-12 w-12 text-blue-500" />
                      </div>
                      <h4 className="text-2xl font-bold text-gray-900 mb-4">
                        {allCampaigns?.length === 0 ? 'No Campaigns Available' : 'All Campaigns Joined!'}
                      </h4>
                      <p className="text-gray-600 mb-8 text-lg leading-relaxed max-w-md mx-auto">
                        {allCampaigns?.length === 0 
                          ? 'No campaigns are currently available. Be the first to create one!' 
                          : 'Congratulations! Your project is participating in all available campaigns.'}
                      </p>
                      <button
                        onClick={() => {/* TODO: Navigate to create campaign */}}
                        className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-full font-semibold transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden"
                      >
                        <Sparkles className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                        Create New Campaign
                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Search and Filters */}
                      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex flex-col lg:flex-row gap-4">
                          {/* Search */}
                          <div className="flex-1">
                            <div className="relative">
                              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search campaigns..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 bg-white/80"
                              />
                            </div>
                          </div>
                          
                          {/* Status Filter */}
                          <div className="flex gap-2 flex-wrap">
                            {filterOptions.map((option) => (
                              <button
                                key={option.id}
                                onClick={() => setStatusFilter(option.id)}
                                className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
                                  statusFilter === option.id
                                    ? 'bg-blue-500 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {option.label}
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                  statusFilter === option.id
                                    ? 'bg-white/20 text-white'
                                    : 'bg-gray-200 text-gray-600'
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
                              className="appearance-none pl-4 pr-10 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 bg-white/80 font-medium"
                            >
                              {sortOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                  Sort by {option.label}
                                </option>
                              ))}
                            </select>
                            <SortDesc className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>
 
                      {/* Available Campaigns Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Target className="h-5 w-5 text-blue-600" />
                          </div>
                          <h4 className="text-2xl font-bold text-gray-900">Available Campaigns</h4>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <BarChart3 className="h-4 w-4" />
                          <span>{filteredAndSortedCampaigns.length} campaign{filteredAndSortedCampaigns.length !== 1 ? 's' : ''} found</span>
                        </div>
                      </div>
                      
                      {/* Campaign Grid */}
                      {filteredAndSortedCampaigns.length === 0 ? (
                        <div className="text-center py-12">
                          <Filter className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                          <h5 className="text-lg font-semibold text-gray-600 mb-2">No campaigns match your criteria</h5>
                          <p className="text-gray-500">Try adjusting your search or filters</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                <div className="border-t border-gray-200 bg-gray-50/80 backdrop-blur-sm p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Info className="h-4 w-4" />
                      <span>Participation fees help maintain campaign quality and boost prize pools</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => {/* TODO: Navigate to campaigns page */}}
                        className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-medium flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Browse All Campaigns
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