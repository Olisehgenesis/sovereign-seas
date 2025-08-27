import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Address, formatEther } from 'viem';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Github,
  Globe,
  FileText,
  Calendar,
  MapPin,
  CheckCircle,
  ExternalLink,
  Share2,
  Bookmark,
  Users,
  Trophy,
  Shield,
  Copy,
  Twitter,
  Linkedin,
  Mail,
  MessageCircle,
  Link as LinkIcon,
  Award,
  Target,
  Lightbulb,
  Globe2,
  Send,
  BadgeCheck,
  User,
  Terminal,
  X,
  Star,
  Code,
  Video,
  Play,
  TrendingUp,
  Edit,
  Crown,
  Timer,
  Eye,
  Vote,
  Coins,
  Heart,
  Activity,
  BarChart3,
  Gauge,
  Clock,
  Rocket,
  Search,
  Camera,
  Lock,
  Unlock,
  Network,
  Database,
  ChevronRight,
  Bookmark as BookmarkFilled,
  QrCode,
  MoreHorizontal,
  Plus,
  Gift,
  Check,
  BarChart
} from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { useProjectDetails, useProjectCampaigns } from '@/hooks/useProjectMethods';
import { useCampaignDetails } from '@/hooks/useCampaignMethods';
import { formatIpfsUrl } from '@/utils/imageUtils';
import { QRCodeCanvas } from 'qrcode.react';
import TipModal from '@/components/TipModal';
import { useAllTips, useContractStats } from '@/hooks/useProjectTipping';
import { 
  getTokenInfo, 
  getTokenSymbol, 
  getTokenLogo, 
  getTokenColor, 
  formatTokenAmount,
  sortTokensByPriority,
  isCeloToken,
  isStablecoin
} from '@/utils/tokenUtils';

// ==================== TYPES ====================

interface ParsedMetadata {
  tagline?: string;
  category?: string;
  tags?: string[];
  location?: string;
  establishedDate?: string;
  website?: string;
  projectType?: string;
  maturityLevel?: string;
  status?: string;
  openSource?: boolean;
  blockchain?: string;
  smartContracts?: string[];
  techStack?: string[];
  license?: string;
  developmentStage?: string;
  auditReports?: string[];
  kycCompliant?: boolean;
  regulatoryCompliance?: string[];
  logo?: string;
  banner?: string;
  github?: string;
  twitter?: string;
  linkedin?: string;
  documentation?: string;
  teamSize?: string;
  demoUrl?: string;
  teamMembers?: {
    avatar?: string;
    name: string;
    role: string;
    linkedin?: string;
    twitter?: string;
    email?: string;
  }[];
  contactEmail?: string;
}

interface ProjectStats {
  totalFunding: bigint;
  voteCount: number;
  campaignCount: number;
  status: 'active' | 'inactive' | 'pending';
}

interface ShareData {
  title: string;
  text: string;
  url: string;
}

// ==================== UTILITY FUNCTIONS ====================

const parseMetadata = (metadata: any): ParsedMetadata => {
  try {
    if (typeof metadata === 'string') {
      return JSON.parse(metadata);
    }
    return metadata || {};
  } catch {
    return {};
  }
};

const formatAddress = (address: Address): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatDate = (timestamp: bigint): string => {
  return new Date(Number(timestamp) * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
};

// ==================== COMPONENTS ====================

interface ProjectLogoProps {
  logo?: string;
  name: string;
  verified?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ProjectLogo: React.FC<ProjectLogoProps> = ({ logo, name, verified, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-20 h-20 text-2xl',
    lg: 'w-32 h-32 text-4xl'
  };

  const badgeSize = {
    sm: 'w-4 h-4 -top-1 -right-1',
    md: 'w-5 h-5 -top-1 -right-1',
    lg: 'w-6 h-6 -top-2 -right-2'
  };

  return (
    <div className="relative">
      {logo ? (
        <img 
          src={formatIpfsUrl(logo)} 
          alt={`${name} logo`}
          className={`${sizeClasses[size]} rounded-2xl object-cover border-2 border-white shadow-lg ring-1 ring-gray-200`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const fallback = target.nextSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
      ) : null}
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg border-2 border-white ring-1 ring-gray-200 ${logo ? 'hidden' : 'flex'}`}>
        {name?.charAt(0) || 'P'}
      </div>
      {verified && (
        <div className={`absolute ${badgeSize[size]} bg-blue-500 rounded-full p-1 shadow-sm`}>
          <BadgeCheck className="w-full h-full text-white" />
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, className = '', onClick, clickable = false }: {
  icon: any;
  label: string;
  value: string | number | React.ReactNode;
  className?: string;
  onClick?: () => void;
  clickable?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    onClick={onClick}
    className={`flex items-center gap-3 p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200/50 ${className} ${clickable ? 'cursor-pointer hover:bg-white/70 hover:shadow-md transition-all duration-200' : ''}`}
  >
    <div className="p-2 bg-blue-50 rounded-lg">
      <Icon className="w-5 h-5 text-blue-600" />
    </div>
    <div className="flex-1">
      <p className="text-sm text-gray-600 font-medium">{label}</p>
      {typeof value === 'string' || typeof value === 'number' ? (
        <p className="text-lg font-semibold text-gray-900">{value}</p>
      ) : (
        <div className="text-lg font-semibold text-gray-900">{value}</div>
      )}
    </div>
  </motion.div>
);

const ActionButton = ({ 
  icon: Icon, 
  label, 
  onClick, 
  variant = 'default',
  disabled = false 
}: {
  icon: any;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  disabled?: boolean;
}) => {
  const baseClasses = "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const variantClasses = {
    default: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100",
    ghost: "text-gray-600 hover:bg-gray-100 active:bg-gray-200"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
};

const CampaignCard = ({ campaign, onClick }: {
  campaign: any;
  onClick: () => void;
}) => {
  const progress = campaign?.participation?.fundsReceived && campaign?.totalFunds
    ? Number(campaign.participation.fundsReceived) / Number(campaign.totalFunds) * 100
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'ended': return 'bg-gray-100 text-gray-800';
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Activity className="h-3 w-3" />;
      case 'ended': return <CheckCircle className="h-3 w-3" />;
      case 'upcoming': return <Clock className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.02 }}
      className="bg-white rounded-xl border border-gray-200 cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden group"
      onClick={onClick}
    >
      <div className="flex h-24">
        {/* Campaign Image - Left Side */}
        <div className="flex-shrink-0 w-24 h-24 relative overflow-hidden">
          {campaign?.metadata?.logo ? (
            <img
              src={formatIpfsUrl(campaign.metadata.logo)}
              alt={`${campaign?.name || 'Campaign'} logo`}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Trophy className="h-8 w-8 text-white" />
            </div>
          )}
          
          {/* Status badge overlay */}
          <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium flex items-center shadow-md z-10 ${getStatusColor(campaign?.status || 'unknown')}`}>
            {getStatusIcon(campaign?.status || 'unknown')}
          </div>
        </div>

        {/* Campaign Content - Right Side */}
        <div className="flex-1 p-3 flex flex-col justify-between">
          {/* Header */}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">
              {campaign?.name || 'Unnamed Campaign'}
            </h3>
            <p className="text-gray-500 text-xs line-clamp-2 mt-1">
              {campaign?.description || campaign?.metadata?.tagline || campaign?.metadata?.bio || 'No description'}
            </p>
          </div>

          {/* Footer with stats */}
          <div className="flex items-center justify-between text-xs text-gray-600 mt-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Vote className="w-3 h-3" />
                {(Number(campaign?.participation?.voteCount || 0) / 1e18).toFixed(1)}
              </span>
              <span className="flex items-center gap-1 text-gray-600">
                <Coins className="w-3 h-3" />
                {Number(formatEther(campaign?.participation?.fundsReceived || 0n)).toFixed(4)} CELO
              </span>
            </div>
            <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-blue-500 transition-colors" />
          </div>
        </div>
      </div>

      {/* Progress bar at bottom */}
      <div className="px-3 pb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{progress.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div 
            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
};

// ==================== SHARE MODAL COMPONENT ====================

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareData: ShareData;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, shareData }) => {
  const [activeTab, setActiveTab] = useState<'share' | 'qr'>('share');

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log('Share cancelled');
      }
    }
  };

  const shareOptions = [
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'bg-blue-500',
      onClick: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.text)}&url=${encodeURIComponent(shareData.url)}`)
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'bg-blue-700',
      onClick: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareData.url)}`)
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-green-500',
      onClick: () => window.open(`https://wa.me/?text=${encodeURIComponent(shareData.text + ' ' + shareData.url)}`)
    }
  ];

  return (
    <Transition appear show={isOpen} as="div">
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as="div"
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as="div"
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-lg font-semibold text-gray-900">
                    Share Project
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="flex space-x-1 mb-6">
                  <button
                    onClick={() => setActiveTab('share')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      activeTab === 'share' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Share
                  </button>
                  <button
                    onClick={() => setActiveTab('qr')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      activeTab === 'qr' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    QR Code
                  </button>
                </div>

                {activeTab === 'share' ? (
                  <div className="space-y-4">
                    <button
                      onClick={handleNativeShare}
                      className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      <Share2 className="w-5 h-5" />
                      Share via System
                    </button>
                    
                    <div className="grid grid-cols-3 gap-3">
                      {shareOptions.map((option) => (
                        <button
                          key={option.name}
                          onClick={option.onClick}
                          className={`${option.color} text-white p-3 rounded-xl hover:opacity-90 transition-opacity`}
                        >
                          <option.icon className="w-5 h-5 mx-auto mb-1" />
                          <div className="text-xs font-medium">{option.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <QRCodeCanvas
                      value={shareData.url}
                      size={200}
                      className="mx-auto mb-4"
                    />
                    <p className="text-sm text-gray-600">
                      Scan this QR code to share the project
                    </p>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

// ==================== MAIN COMPONENT ====================

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { address: currentUser } = useAccount();
  
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [campaignFilter, setCampaignFilter] = useState<'all' | 'active' | 'ended'>('all');
  const [showTipSuccess, setShowTipSuccess] = useState(false);

  // Contract addresses from environment variables
  const contractAddress = import.meta.env.VITE_CONTRACT_V4 as Address;
  const projectId = id ? BigInt(id) : BigInt(0);
  const tippingContractAddress = import.meta.env.VITE_TIP_CONTRACT_V4 as Address;
  
  // Debug project ID parsing
  useEffect(() => {
    console.log('🔍 Project ID Debug:', {
      rawId: id,
      projectId: projectId.toString(),
      projectIdType: typeof projectId,
      isZero: projectId === BigInt(0),
      isUndefined: projectId === undefined,
      isNull: projectId === null
    });
  }, [id, projectId]);

  const { projectDetails, isLoading, error } = useProjectDetails(contractAddress, projectId);
  const { projectCampaigns, isLoading: campaignsLoading } = useProjectCampaigns(contractAddress, projectId);
  
  // Get campaign metadata for each campaign
  const campaignIds = useMemo(() => {
    if (!projectCampaigns || !Array.isArray(projectCampaigns)) {
      console.log('🔍 CampaignIds: No project campaigns data available', { projectCampaigns });
      return [];
    }
    
    try {
      return projectCampaigns.map(campaign => campaign?.id).filter(Boolean) as bigint[];
    } catch (error) {
      console.error('🔴 Error extracting campaign IDs:', error);
      return [];
    }
  }, [projectCampaigns]);
  
  // Get campaign metadata for each campaign ID
  const campaignMetadataQueries = useMemo(() => {
    if (!campaignIds?.length || !contractAddress) {
      console.log('🔍 CampaignMetadataQueries: Missing required data', { 
        campaignIdsLength: campaignIds?.length, 
        contractAddress: !!contractAddress 
      });
      return [];
    }
    
    try {
      return campaignIds.map(campaignId => 
        useCampaignDetails(contractAddress, campaignId)
      );
    } catch (error) {
      console.error('🔴 Error creating campaign metadata queries:', error);
      return [];
    }
  }, [campaignIds, contractAddress]);
  
  // Combine basic campaign data with metadata
  const enhancedCampaigns = useMemo(() => {
    if (!projectCampaigns || !campaignIds?.length || !campaignMetadataQueries?.length) {
      console.log('🔍 Enhanced Campaigns: Missing data', {
        hasProjectCampaigns: !!projectCampaigns,
        campaignIdsLength: campaignIds?.length,
        queriesLength: campaignMetadataQueries?.length
      });
      return projectCampaigns;
    }
    
    try {
      return projectCampaigns.map((campaign, index) => {
        if (!campaign) return null;
        
        const metadataQuery = campaignMetadataQueries[index];
        // Fix: properly access campaignDetails from the hook result
        const metadata = metadataQuery?.campaignDetails?.metadata;
        
        if (!metadata) {
          console.log(`🔍 Campaign ${index}: No metadata available`, { metadataQuery });
          return campaign;
        }
        
        // Parse metadata to extract logo, banner, etc.
        let parsedMetadata = {};
        try {
          if (metadata.mainInfo) {
            const mainInfo = JSON.parse(metadata.mainInfo);
            parsedMetadata = { ...parsedMetadata, ...mainInfo };
          }
          if (metadata.additionalInfo) {
            const additionalInfo = JSON.parse(metadata.additionalInfo);
            parsedMetadata = { ...parsedMetadata, ...additionalInfo };
          }
        } catch (e) {
          console.warn('Failed to parse campaign metadata:', e);
        }
        
        return {
          ...campaign,
          metadata: parsedMetadata
        };
      }).filter(Boolean);
    } catch (error) {
      console.error('🔴 Error in enhancedCampaigns:', error);
      return projectCampaigns;
    }
  }, [projectCampaigns, campaignIds, campaignMetadataQueries]);
  
  // Use enhanced campaigns if available, fall back to basic campaigns
  const finalProjectCampaigns = enhancedCampaigns || projectCampaigns;
  const finalCampaignsLoading = campaignsLoading || campaignMetadataQueries.some(query => query?.isLoading);
  
  // Tip data hooks using the working approach from debug page
  const { 
    allTips, 
    isLoading: allTipsLoading, 
    error: allTipsError,
    refetch: refetchAllTips 
  } = useAllTips(tippingContractAddress);
  
  const { 
    stats: contractStats, 
    isLoading: statsLoading, 
    error: statsError,
    refetch: refetchStats 
  } = useContractStats(tippingContractAddress);

  // Debug logging for contract addresses and tip data
  useEffect(() => {
    console.log('🔍 Contract Debug:', {
      projectId: projectId.toString(),
      contractAddress,
      tippingContractAddress,
      allTips: allTips?.length || 0,
      allTipsError,
      contractStats,
      statsError
    });
  }, [projectId, contractAddress, tippingContractAddress, allTips, allTipsError, contractStats, statsError]);

  // Filter tips for this specific project from all tips
  const projectTips = useMemo(() => {
    if (!allTips || !projectId) return [];
    
    // Filter tips for this project and validate data structure
    const validTips = allTips
      .filter(tip => {
        // Ensure tip has required properties
        return tip && 
               tip.projectId !== undefined && 
               tip.projectId === projectId && // This will work for both 0 and other IDs
               tip.tipper &&
               tip.token &&
               tip.amount !== undefined &&
               tip.timestamp !== undefined;
      })
      .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
    
    console.log('🔍 Filtered Tips:', {
      totalTips: allTips?.length || 0,
      projectTips: validTips.length,
      projectId: projectId.toString(),
      projectIdType: typeof projectId,
      sampleTip: validTips[0],
      allTipsSample: allTips?.slice(0, 2),
      tipsWithProjectId0: allTips?.filter(tip => tip.projectId === BigInt(0)).length || 0,
      tipsWithCurrentProjectId: allTips?.filter(tip => tip.projectId === projectId).length || 0,
      uniqueTokens: [...new Set(validTips.map(tip => tip.token))],
      tokenDetails: validTips.slice(0, 3).map(tip => ({
        token: tip.token,
        symbol: getTokenInfo(tip.token).symbol,
        name: getTokenInfo(tip.token).name,
        logo: getTokenInfo(tip.token).logo
      }))
    });
    
    return validTips;
  }, [allTips, projectId]);

  // Calculate tip summary from filtered tips
  const tipSummary = useMemo(() => {
    if (!projectTips || !projectTips?.length) return null;
    
    // Calculate total value in actual tokens, not just CELO equivalent
    const totalTipsInCelo = projectTips.reduce((sum, tip) => sum + (tip.celoEquivalent || 0n), 0n);
    const uniqueTippers = new Set(projectTips.map(tip => tip.tipper));
    const tippedTokens = [...new Set(projectTips.map(tip => tip.token))];
    
    // Calculate token amounts for each token
    const tokenAmounts = tippedTokens.map(tokenAddr => {
      const tipsForToken = projectTips.filter(tip => tip.token === tokenAddr);
      return tipsForToken.reduce((sum, tip) => sum + (tip.amount || 0n), 0n);
    });
    
    // Calculate total value in actual tokens for display
    const totalValueInTokens = tippedTokens.reduce((total, tokenAddr, idx) => {
      const amount = tokenAmounts[idx];
      const tokenInfo = getTokenInfo(tokenAddr);
      // For display purposes, we'll show the actual token amounts
      return total + Number(formatEther(amount));
    }, 0);
    
    return {
      totalTipsInCelo,
      totalValueInTokens,
      tipperCount: BigInt(uniqueTippers?.size || 0),
      tippedTokens,
      tokenAmounts,
      projectTips
    };
  }, [projectTips]);

  // Helper function to format time ago
  const getTimeAgo = useCallback((timestamp: bigint): string => {
    const now = Math.floor(Date.now() / 1000);
    const time = Number(timestamp);
    const diff = now - time;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(time * 1000).toLocaleDateString();
  }, []);

  // Helper function to get token symbol (using utility)
  const getTokenSymbolDisplay = useCallback((tokenAddress: Address): string => {
    return getTokenSymbol(tokenAddress);
  }, []);

  // Helper function to render token logo (image or emoji)
  const renderTokenLogo = useCallback((tokenAddress: Address, size: string = 'w-6 h-6') => {
    const tokenInfo = getTokenInfo(tokenAddress);
    const logo = tokenInfo.logo;
    
    // Check if logo is an image path
    if (logo.startsWith('/')) {
      return (
        <img 
          src={logo} 
          alt={tokenInfo.symbol}
          className={`${size} rounded-full object-cover`}
        />
      );
    }
    
    // Otherwise render as emoji
    return (
      <div className={`${size} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
        {logo}
      </div>
    );
  }, []);

  const parsedMetadata = useMemo(() => 
    parseMetadata(projectDetails?.metadata?.additionalData), 
    [projectDetails?.metadata?.additionalData]
  );

  const projectStats = useMemo((): ProjectStats => {
    if (!finalProjectCampaigns || !Array.isArray(finalProjectCampaigns)) {
      console.log('🔍 ProjectStats: No campaigns data available', { finalProjectCampaigns });
      return { totalFunding: 0n, voteCount: 0, campaignCount: 0, status: 'inactive' };
    }
    
    try {
      const totalFunding = finalProjectCampaigns.reduce((sum, campaign) => 
        sum + (campaign?.participation?.fundsReceived || 0n), 0n
      );
      
      const voteCount = finalProjectCampaigns.reduce((sum, campaign) => 
        sum + Number(campaign?.participation?.voteCount || 0), 0
      );
      
      const campaignCount = finalProjectCampaigns?.length || 0;
      const status = projectDetails?.project?.active ? 'active' : 'inactive';
      
      return { totalFunding, voteCount, campaignCount, status };
    } catch (error) {
      console.error('🔴 Error calculating project stats:', error);
      return { totalFunding: 0n, voteCount: 0, campaignCount: 0, status: 'inactive' };
    }
  }, [finalProjectCampaigns, projectDetails]);

  const filteredCampaigns = useMemo(() => {
    if (!finalProjectCampaigns || !Array.isArray(finalProjectCampaigns)) {
      console.log('🔍 FilteredCampaigns: No campaigns data available', { finalProjectCampaigns });
      return [];
    }
    
    try {
      switch (campaignFilter) {
        case 'active':
          return finalProjectCampaigns.filter(campaign => campaign?.status === 'active') || [];
        case 'ended':
          return finalProjectCampaigns.filter(campaign => campaign?.status === 'ended') || [];
        default:
          return finalProjectCampaigns || [];
      }
    } catch (error) {
      console.error('🔴 Error filtering campaigns:', error);
      return [];
    }
  }, [finalProjectCampaigns, campaignFilter]);

  const isOwner = currentUser === projectDetails?.project?.owner;

  const shareData: ShareData = {
    title: projectDetails?.project?.name || 'Project',
    text: `Check out this amazing project: ${projectDetails?.project?.name}`,
    url: window.location.href
  };

  const handleCampaignClick = (campaignId: bigint) => {
    navigate(`/explorers/campaign/${campaignId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded-2xl"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !projectDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="max-w-7xl mx-auto text-center py-20">
          <div className="text-red-500 mb-4">
            <X className="w-16 h-16 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Project Not Found</h1>
          <p className="text-gray-600 mb-6">The project you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Mobile-First Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200/50">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">
                {projectDetails.project.name}
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="p-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* 🚀 Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100"
        >
          <div className="text-center space-y-4">
            {/* Project Logo */}
            <div className="flex justify-center">
              <ProjectLogo
                logo={parsedMetadata.logo}
                name={projectDetails.project.name}
                verified={parsedMetadata.kycCompliant}
                size="lg"
              />
            </div>
            
            {/* Project Name & Tagline */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {projectDetails.project.name}
              </h1>
              <p className="text-gray-600 text-sm leading-relaxed">
                {projectDetails.project.description}
              </p>
            </div>
            
            {/* Action Buttons Stack */}
            <div className="space-y-3 pt-2">
              {parsedMetadata.demoUrl && (
                <button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                  🚀 Try Live Demo
                </button>
              )}
              
              <div className="grid grid-cols-3 gap-3">
                <button className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-medium py-2.5 px-4 rounded-xl hover:from-yellow-500 hover:to-orange-600 transition-all duration-200 shadow-md hover:shadow-lg">
                  ⭐ Vote
                </button>
                <button 
                  onClick={() => setIsTipModalOpen(true)}
                  className="bg-gradient-to-r from-green-400 to-emerald-500 text-white font-medium py-2.5 px-4 rounded-xl hover:from-green-500 hover:to-emerald-600 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  💸 Tip
                </button>
                <button 
                  onClick={() => setIsShareModalOpen(true)}
                  className="bg-gradient-to-r from-purple-400 to-pink-500 text-white font-medium py-2.5 px-4 rounded-xl hover:from-purple-500 hover:to-pink-600 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  🔗 Share
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 📊 Project Snapshot Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">📊 Project Snapshot</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-2xl text-center hover:scale-105 transition-transform duration-200 cursor-pointer">
              <div className="text-2xl mb-1">💰</div>
              <div className="text-sm text-gray-600 mb-1">Funding</div>
              <div className="text-lg font-bold text-blue-700">
                {formatTokenAmount(projectStats.totalFunding, contractAddress)}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-2xl text-center hover:scale-105 transition-transform duration-200 cursor-pointer">
              <div className="text-2xl mb-1">🗳️</div>
              <div className="text-sm text-gray-600 mb-1">Votes</div>
              <div className="text-lg font-bold text-purple-700">
                {projectStats.voteCount.toFixed(1)}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-2xl text-center hover:scale-105 transition-transform duration-200 cursor-pointer">
              <div className="text-2xl mb-1">📦</div>
              <div className="text-sm text-gray-600 mb-1">Campaigns</div>
              <div className="text-lg font-bold text-green-700">
                {projectStats.campaignCount}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-2xl text-center hover:scale-105 transition-transform duration-200 cursor-pointer">
              <div className="text-2xl mb-1">🎁</div>
              <div className="text-sm text-gray-600 mb-1">Tips</div>
              <div className="text-lg font-bold text-orange-700">
                0
              </div>
            </div>
          </div>
        </motion.div>

        {/* 📖 About Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-yellow-50 via-white to-orange-50 rounded-3xl p-6 shadow-xl border border-yellow-100"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-3">📖 About This Project</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            {projectDetails.project.description}
          </p>
          
          {/* Project Details Grid */}
          <div className="space-y-3">
            {parsedMetadata.category && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Target className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Category</div>
                  <div className="font-medium text-gray-900">{parsedMetadata.category}</div>
                </div>
              </div>
            )}
            
            {parsedMetadata.location && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Location</div>
                  <div className="font-medium text-gray-900">{parsedMetadata.location}</div>
                </div>
              </div>
            )}
            
            {parsedMetadata.website && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Globe className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Website</div>
                  <a 
                    href={parsedMetadata.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 hover:text-blue-700"
                  >
                    Visit Site →
                  </a>
                </div>
              </div>
            )}
          </div>
          
          <button className="w-full mt-4 text-blue-600 font-medium hover:text-blue-700 transition-colors">
            Read More →
          </button>
        </motion.div>

        {/* 🚀 Campaigns Feed */}
        {filteredCampaigns.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-bold text-gray-900 px-2">🚀 Active Campaigns</h2>
            
            {filteredCampaigns.map((campaign, index) => {
              if (!campaign) return null;
              
              const campaignMetadata = campaignMetadataQueries[index]?.campaignDetails?.metadata;
              let parsedCampaignMetadata = {};
              
              try {
                if (campaignMetadata?.mainInfo) {
                  parsedCampaignMetadata = JSON.parse(campaignMetadata.mainInfo);
                }
              } catch (e) {
                console.error('Error parsing campaign metadata:', e);
              }
              
              const isTrending = Number(campaign.participation?.voteCount || 0) > 50;
              const progressPercentage = 0; // Simplified progress calculation
              
              return (
                <motion.div
                  key={campaign.id?.toString()}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200 cursor-pointer"
                  onClick={() => handleCampaignClick(campaign.id!)}
                >
                  <div className="flex items-start gap-4">
                    {/* Campaign Logo */}
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                      🚀
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-gray-900 truncate">
                          {campaign.name || `Campaign ${index + 1}`}
                        </h3>
                        {isTrending && (
                          <span className="bg-gradient-to-r from-orange-400 to-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                            🔥 Trending
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-600 text-sm leading-relaxed mb-3 line-clamp-2">
                        {campaign.description || 'No description available'}
                      </p>
                      
                      {/* Stats Row */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="text-xs text-gray-500">Votes</div>
                            <div className="font-bold text-purple-600">
                              {Number(campaign.participation?.voteCount || 0)}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500">Funding</div>
                            <div className="font-bold text-green-600">
                              {formatTokenAmount(campaign.participation?.fundsReceived || 0n, contractAddress)}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1 text-right">
                        {progressPercentage}% funded
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* 👥 Owner & Team Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4">👥 Project Team</h2>
          
          {/* Owner */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
              👑
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900">Project Owner</div>
              <div className="text-sm text-gray-600 mb-2">
                {formatAddress(projectDetails.project.owner)}
              </div>
              <button
                onClick={() => copyToClipboard(projectDetails.project.owner)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy Address
              </button>
            </div>
          </div>
          
          {/* Contact Info */}
          {parsedMetadata.contactEmail && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Contact Email</div>
                <a 
                  href={`mailto:${parsedMetadata.contactEmail}`}
                  className="font-medium text-blue-600 hover:text-blue-700"
                >
                  {parsedMetadata.contactEmail}
                </a>
              </div>
            </div>
          )}
        </motion.div>

        {/* 💸 Support Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-6 shadow-xl border border-green-100"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">💸 Support This Project</h2>
          
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-gray-700 mb-4">
                Be the first to tip this project and unlock the 💎 <strong>supporter badge</strong>!
              </p>
            </div>
            
            <button
              onClick={() => setIsTipModalOpen(true)}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 px-6 rounded-2xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-lg"
            >
              💸 Send Tip
            </button>
            
            <div className="text-center text-sm text-gray-600">
              Every contribution helps bring this project to life! 🌟
            </div>
          </div>
        </motion.div>

        {/* 📊 Charts Section (Collapsible) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100"
        >
          <button className="w-full text-left flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">📊 See Funding & Votes Over Time</h2>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <p className="text-gray-600 text-sm mt-2">
            Track the project's growth and community engagement
          </p>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center py-8"
        >
          <div className="text-gray-500 text-sm mb-2">
            ⚓ SovSeas | © 2025 by Oliseh Genesis
          </div>
          <div className="flex items-center justify-center gap-4 text-sm">
            <a href="#" className="text-blue-600 hover:text-blue-700 transition-colors">Twitter</a>
            <span className="text-gray-300">•</span>
            <a href="#" className="text-blue-600 hover:text-blue-700 transition-colors">GitHub</a>
            <span className="text-gray-300">•</span>
            <a href="#" className="text-blue-600 hover:text-blue-700 transition-colors">Live Demo</a>
          </div>
        </motion.div>
      </div>

      {/* Modals */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareData={shareData}
      />
      
      <TipModal
        isOpen={isTipModalOpen}
        onClose={() => setIsTipModalOpen(false)}
        project={{
          id: projectId,
          name: projectDetails.project.name,
          owner: projectDetails.project.owner,
          contractAddress: contractAddress
        }}
        onTipSuccess={() => setShowTipSuccess(true)}
      />
    </div>
  );
}
