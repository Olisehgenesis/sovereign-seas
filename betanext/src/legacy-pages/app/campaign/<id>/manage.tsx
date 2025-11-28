import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from '@/utils/nextAdapter';
import { useAccount } from 'wagmi';
import { 
  ArrowLeft, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar, 
  Eye, 
  Github, 
  Globe, 
  AlertTriangle,
  Loader2,
  Award,
  BarChart3,
  UserPlus,
  Settings,
  ListChecks,
  User,
  RotateCcw,
  Calculator,
  DollarSign,
  Target,
  Zap,
  Crown,
  Trophy,
  Database,
  Medal,
  Info,
  Building2,
  Briefcase,
  Edit
} from 'lucide-react';

import { 
  useCampaignDetails, 
  useApproveProject, 
  useAddCampaignAdmin, 
  useDistributeFunds,
  useIsCampaignAdmin,
  useSortedProjects,
  useParticipation,
  useUpdateCampaignMetadata,
  useUpdateCustomDistributionData,
  useRemoveCampaignAdmin
} from '@/hooks/useCampaignMethods';
import FundDonateModal from '@/components/modals/FundDonateModal';

import { 
  useAllProjects, 
  formatProjectForDisplay 
} from '@/hooks/useProjectMethods';

import { 
  usePoolInfo,
  usePoolBalance,
  usePoolStats,
  useAllowedTokens,
  useCampaignToPool,
  useIsSuperAdmin,
  usePoolsOwner,
  useCreatePoolUniversal,
  useCreatePoolERC20,
  useFundPool,
  useDonateToPool,
  useDistribute,
  usePoolFees,
  useSetPoolContractAdminFee,
  useSetCampaignAdminFee,
  useClaimContractAdminFees,
  useRemoveAllowedToken,
  useClosePool,
  useUpdatePoolMetadata
} from '@/hooks/usePools';

import { formatEther, type Address } from 'viem';
import { parseIdParam } from '@/utils/hashids';
import { supportedTokens } from '@/hooks/useSupportedTokens';
import ManualDistributeModal from '@/components/modals/ManualDistributeModal';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
const ENV_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_V4;
const ENV_POOLS_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_POOLS_CONTRACT_ADDRESS;
const CONTRACT_ADDRESS = (ENV_CONTRACT_ADDRESS ?? ZERO_ADDRESS) as Address;
const POOLS_CONTRACT_ADDRESS = (ENV_POOLS_CONTRACT_ADDRESS ?? ZERO_ADDRESS) as Address;
const IS_DEV = process.env.NODE_ENV !== 'production';

// Individual ProjectVotes component for accurate vote tracking
function ProjectVotes({ 
  campaignId, 
  projectId, 
  onVoteCountReceived 
}: { 
  campaignId: bigint; 
  projectId: bigint; 
  onVoteCountReceived?: (projectId: string, voteCount: bigint) => void;
}) {
  const contractAddress = CONTRACT_ADDRESS;

  const { participation, isLoading, error } = useParticipation(
    contractAddress, 
    campaignId, 
    projectId
  );

  useEffect(() => {
    if (participation && onVoteCountReceived) {
      let voteCount: bigint;
      if (Array.isArray(participation)) {
        voteCount = participation[1];
      } else if (typeof participation === 'object' && 'voteCount' in participation) {
        voteCount = participation.voteCount;
      } else {
        voteCount = 0n;
      }
      onVoteCountReceived(projectId.toString(), voteCount);
    }
  }, [participation, projectId, onVoteCountReceived]);

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  if (error || !participation) {
    return <span className="text-sm text-red-500 font-medium">0.0 votes</span>;
  }

  let voteCount: bigint;
  try {
    if (Array.isArray(participation)) {
      voteCount = participation[1];
    } else if (typeof participation === 'object' && 'voteCount' in participation) {
      voteCount = participation.voteCount;
    } else {
      voteCount = 0n;
    }

    const formattedVotes = Number(formatEther(voteCount)).toFixed(1);
    return (
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
        <span className="text-sm font-semibold text-blue-600">{formattedVotes} votes</span>
      </div>
    );
  } catch (error) {
    return <span className="text-sm text-red-500 font-medium">0.0 votes</span>;
  }
}

export default function CampaignManagePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  
  // UI State
  const [activeTab, setActiveTab] = useState('overview');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showRemoveAdminModal, setShowRemoveAdminModal] = useState(false);
  const [showUpdateMetadataModal, setShowUpdateMetadataModal] = useState(false);
  const [showCustomDistributionModal, setShowCustomDistributionModal] = useState(false);
  const [showManualDistributeModal, setShowManualDistributeModal] = useState(false);
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [removeAdminAddress, setRemoveAdminAddress] = useState('');
  const [mainInfo, setMainInfo] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [customDistributionData, setCustomDistributionData] = useState('');
  const [confirmApproval, setConfirmApproval] = useState<{ show: boolean; projectId: bigint | null }>({ show: false, projectId: null });
  
  // Vote count state management (same as index page)
  const [projectVoteCounts, setProjectVoteCounts] = useState<Map<string, bigint>>(new Map());
  
  const contractAddress = CONTRACT_ADDRESS;
  const poolsContractAddress = POOLS_CONTRACT_ADDRESS;
  const parsedId = parseIdParam(id);
  const campaignId = parsedId ? BigInt(parsedId) : BigInt(0);

  // Environment variable validation
  if (IS_DEV) {
    console.log('Environment Variables Debug:', {
      CONTRACT_V4: ENV_CONTRACT_ADDRESS,
      POOLS_CONTRACT_ADDRESS: ENV_POOLS_CONTRACT_ADDRESS,
      hasContractAddress: !!ENV_CONTRACT_ADDRESS,
      hasPoolsContractAddress: !!ENV_POOLS_CONTRACT_ADDRESS,
      contractAddressValid: ENV_CONTRACT_ADDRESS?.startsWith('0x') && ENV_CONTRACT_ADDRESS?.length === 42,
      poolsContractAddressValid: ENV_POOLS_CONTRACT_ADDRESS?.startsWith('0x') && ENV_POOLS_CONTRACT_ADDRESS?.length === 42
    });
  }

  
  // Debug logging for ID parsing (only in development)
  if (IS_DEV) {
  console.log('Campaign Manage - ID Parsing:', {
    originalId: id,
    parsedId,
    campaignId: campaignId.toString(),
    isValidId: parsedId !== null
  });
  }
  
  // Hooks
  const { campaignDetails, isLoading: campaignLoading, error: campaignError } = useCampaignDetails(
    contractAddress as `0x${string}`, 
    campaignId
  );
  
  const { projects: allProjects, isLoading: projectsLoading } = useAllProjects(contractAddress as `0x${string}`);
  
  const { isAdmin } = useIsCampaignAdmin(
    contractAddress as `0x${string}`, 
    campaignId, 
    address as `0x${string}`
  );
  
  const { sortedProjectIds, isLoading: sortedLoading, refetch: refetchSorted } = useSortedProjects(
    contractAddress as `0x${string}`,
    campaignId
  );
  const { createPool: createUniversalPool, isPending: isCreatingUniversal } = useCreatePoolUniversal();
  const { createPool: createERC20Pool, isPending: isCreatingERC20 } = useCreatePoolERC20();
  const { fundPool, isPending: isFunding } = useFundPool();
  const { donate, isPending: isDonating } = useDonateToPool();
  // Removed unused hooks to satisfy linter
  const { distribute: distributePool, isPending: isDistributingPool } = useDistribute();
  const { close: closePoolFunction, isPending: isClosingPool } = useClosePool();
  const { update: updateMetadata, isPending: isUpdatingPoolMetadata } = useUpdatePoolMetadata();

  // Get campaign's pool using the new hook
  const { poolId: campaignPoolId, isLoading: isLoadingPoolId } = useCampaignToPool(campaignId);
  

  // Debug logging for pool identification
  if (IS_DEV) {
    console.log('Pool Identification Debug:', {
      campaignId: campaignId.toString(),
      campaignPoolId: campaignPoolId?.toString(),
      hasPool: campaignPoolId !== undefined && campaignPoolId !== 0n,
      isLoadingPoolId
    });
  }

  // Get pool info if pool exists
  const { poolInfo, isLoading: isLoadingPoolInfo, error: poolInfoError } = usePoolInfo(
    campaignPoolId !== undefined && campaignPoolId !== 0n ? campaignPoolId : 0n
  );

  // Get pool balance if pool exists
  const { balance: poolBalance, isLoading: isLoadingPoolBalance, error: poolBalanceError, refetch: refetchPoolBalance } = usePoolBalance(
    campaignPoolId !== undefined && campaignPoolId !== 0n ? campaignPoolId : 0n
  );

  // Get pool stats if pool exists
  const { stats: poolStats, isLoading: isLoadingPoolStats, error: poolStatsError, refetch: refetchPoolStats } = usePoolStats(
    campaignPoolId !== undefined && campaignPoolId !== 0n ? campaignPoolId : 0n
  );
  const { allowedTokens, error: allowedTokensError } = useAllowedTokens(
    campaignPoolId !== undefined && campaignPoolId !== 0n ? campaignPoolId : 0n
  );

  // Debug logging for pool data loading
  if (IS_DEV) {
    console.log('Pool Data Loading Debug:', {
      poolInfo: poolInfo ? {
        raw: poolInfo,
        isArray: Array.isArray(poolInfo),
        length: Array.isArray(poolInfo) ? poolInfo.length : 'N/A',
        structure: Array.isArray(poolInfo) ? poolInfo.map((item, index: number) => ({ index, type: typeof item, value: item?.toString() })) : {
          id: poolInfo.id?.toString(),
          campaignId: poolInfo.campaignId?.toString(),
          admin: poolInfo.admin,
          poolType: poolInfo.poolType,
          isActive: poolInfo.isActive,
          isPaused: poolInfo.isPaused,
          createdAt: poolInfo.createdAt?.toString(),
          metadata: poolInfo.metadata
        }
      } : null,
      poolBalance: poolBalance ? {
        raw: poolBalance,
        isArray: Array.isArray(poolBalance),
        length: Array.isArray(poolBalance) ? poolBalance.length : 'N/A',
        structure: Array.isArray(poolBalance) ? poolBalance.map((item, index: number) => ({ index, type: typeof item, value: Array.isArray(item) ? `Array(${item.length})` : item?.toString() })) : {
          tokens: poolBalance.tokens,
          balances: poolBalance.balances?.map(b => b.toString())
        }
      } : null,
      poolStats: poolStats ? {
        raw: poolStats,
        isArray: Array.isArray(poolStats),
        length: Array.isArray(poolStats) ? poolStats.length : 'N/A',
        structure: Array.isArray(poolStats) ? poolStats.map((item, index: number) => ({ index, type: typeof item, value: item?.toString() })) : {
          totalValue: poolStats.totalValue?.toString(),
          contributorCount: poolStats.contributorCount?.toString(),
          distributedAmount: poolStats.distributedAmount?.toString(),
          distributionCount: poolStats.distributionCount?.toString()
        }
      } : null,
      allowedTokens: allowedTokens,
      errors: {
        poolInfoError,
        poolBalanceError,
        poolStatsError,
        allowedTokensError
      },
      loading: {
        isLoadingPoolInfo,
        isLoadingPoolBalance,
        isLoadingPoolStats
      }
    });
  }

  // Admin and permission checks
  const { isSuperAdmin } = useIsSuperAdmin(address as `0x${string}`)
  const { owner: poolsOwner } = usePoolsOwner();

  // Pool state
  // Fees & tracking
  const { fees: poolFees } = usePoolFees(
    campaignPoolId !== undefined && campaignPoolId !== 0n ? campaignPoolId : 0n
  );
  const { setFee: setPoolContractFee } = useSetPoolContractAdminFee();
  const { setFee: setCampaignFee } = useSetCampaignAdminFee();
  const { claim: claimContractFees, isPending: isClaimingFees } = useClaimContractAdminFees();
  const { removeToken: removeTrackedToken, isPending: isRemovingToken } = useRemoveAllowedToken();
  const [showCreatePoolModal, setShowCreatePoolModal] = useState(false);

  // Derived flags
  const hasPool = campaignPoolId !== undefined && campaignPoolId !== 0n && !!poolInfo;
  // Normalize pool admin address (tuple/object safe)
  const poolAdminAddress = useMemo(() => {
    // Prefer object key; fallback to tuple index (admin likely at index 5)
    const raw = Array.isArray(poolInfo) ? (poolInfo[5] as any) : (poolInfo as any)?.admin;
    const str = typeof raw === 'string' ? raw : raw?.toString?.();
    return typeof str === 'string' && str.startsWith('0x') ? str : '';
  }, [poolInfo]);
  const isPoolAdmin = !!(poolAdminAddress && address && poolAdminAddress.toLowerCase() === address.toLowerCase());
  const [showFundPoolModal, setShowFundPoolModal] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [poolType, setPoolType] = useState<'universal' | 'erc20'>('universal');
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  
  // Simple pool metadata state
  const [poolName, setPoolName] = useState('');
  const [poolDescription, setPoolDescription] = useState('');

  // Fund pool state
  
  const [fundToken, setFundToken] = useState('0x0000000000000000000000000000000000000000'); // CELO by default
  const [fundTokenList, setFundTokenList] = useState<string[]>(['0x0000000000000000000000000000000000000000']);
  

  useEffect(() => {
    // Populate funding token options similar to vote modal: CELO + pool tokens + allowed tokens
    const tokens = new Set<string>();
    tokens.add('0x0000000000000000000000000000000000000000');
    if (poolBalance?.tokens) {
      poolBalance.tokens.forEach(t => tokens.add(t));
    }
    if (allowedTokens) {
      allowedTokens.forEach(t => tokens.add(t));
    }
    setFundTokenList(Array.from(tokens));
  }, [poolBalance?.tokens, allowedTokens]);

  // Donate state
  const [donateAmount, setDonateAmount] = useState('');
  const [donateToken, setDonateToken] = useState('0x0000000000000000000000000000000000000000'); // CELO by default
  const [donateMessage, setDonateMessage] = useState('');

  // Generate simple metadata as plain string
  const generatePoolMetadata = () => {
    if (!poolName.trim() && !poolDescription.trim()) {
      return "Pool created for campaign";
    }
    if (!poolDescription.trim()) {
      return poolName.trim();
    }
    return `${poolName.trim()}: ${poolDescription.trim()}`;
  };

  // Pool creation functions
  const handleCreateUniversalPool = async () => {
    try {
      setStatusMessage({ text: 'Creating universal pool...', type: 'info' });
      const metadata = generatePoolMetadata();
      console.log('Creating universal pool with:', { campaignId, metadata, type: typeof metadata });
      await createUniversalPool(campaignId, metadata);
      setStatusMessage({ text: 'Universal pool created successfully!', type: 'success' });
      setShowCreatePoolModal(false);
      resetPoolForm();
    } catch (error) {
      console.error('Error creating universal pool:', error);
      setStatusMessage({ text: 'Failed to create universal pool', type: 'error' });
    }
  };

  const handleCreateERC20Pool = async () => {
    try {
      if (selectedTokens.length === 0) {
        setStatusMessage({ text: 'Please select at least one token', type: 'error' });
        return;
      }
      setStatusMessage({ text: 'Creating ERC20 pool...', type: 'info' });
      const metadata = generatePoolMetadata();
      console.log('Creating ERC20 pool with:', { campaignId, selectedTokens, metadata, type: typeof metadata });
      await createERC20Pool(campaignId, selectedTokens as `0x${string}`[], metadata);
      setStatusMessage({ text: 'ERC20 pool created successfully!', type: 'success' });
      setShowCreatePoolModal(false);
      resetPoolForm();
    } catch (error) {
      console.error('Error creating ERC20 pool:', error);
      setStatusMessage({ text: 'Failed to create ERC20 pool', type: 'error' });
    }
  };

  const resetPoolForm = () => {
    setSelectedTokens([]);
    setPoolName('');
    setPoolDescription('');
  };

  // Reset fund pool form
  const resetFundPoolForm = () => {
    setFundToken('0x0000000000000000000000000000000000000000');
  };

  // Reset donate form
  const resetDonateForm = () => {
    setDonateAmount('');
    setDonateToken('0x0000000000000000000000000000000000000000');
    setDonateMessage('');
  };


  // Handle donate to pool
  const handleDonateToPool = async () => {
    if (campaignPoolId === undefined || campaignPoolId === 0n || !donateAmount) return;
    
    try {
      setStatusMessage({ text: 'Making donation...', type: 'info' });
      await donate(
        campaignPoolId,
        donateToken as `0x${string}`,
        BigInt(Math.floor(parseFloat(donateAmount) * 1e18)),
        donateMessage
      );
      setStatusMessage({ text: 'Donation successful!', type: 'success' });
      setShowDonateModal(false);
      resetDonateForm();
    } catch (error) {
      console.error('Error donating to pool:', error);
      setStatusMessage({ text: 'Failed to donate to pool', type: 'error' });
    }
  };

  // Handle update pool metadata
  const handleUpdatePoolMetadata = async () => {
    if (campaignPoolId === undefined || campaignPoolId === 0n || !poolName.trim()) return;
    
    try {
      setStatusMessage({ text: 'Updating pool metadata...', type: 'info' });
      const newMetadata = `${poolName}: ${poolDescription}`;
      await updateMetadata(campaignPoolId, newMetadata);
      setStatusMessage({ text: 'Pool metadata updated successfully!', type: 'success' });
      setShowUpdateMetadataModal(false);
      resetPoolForm();
    } catch (error) {
      console.error('Error updating metadata:', error);
      setStatusMessage({ text: 'Failed to update pool metadata', type: 'error' });
    }
  };

  const approvedProjectIds = useMemo(() => {
    return new Set(sortedProjectIds.map(id => id.toString()));
  }, [sortedProjectIds]);
  
  const { 
    approveProject, 
    isPending: isApprovingProject,
    error: approveError
  } = useApproveProject(contractAddress as `0x${string}`);
  
  const { 
    addCampaignAdmin, 
    isPending: isAddingAdmin 
  } = useAddCampaignAdmin(contractAddress as `0x${string}`);
  
  const { 
    distributeFunds, 
    isPending: isDistributingFunds 
  } = useDistributeFunds(contractAddress as `0x${string}`);

  const { 
    removeCampaignAdmin, 
    isPending: isRemovingAdmin 
  } = useRemoveCampaignAdmin(contractAddress as `0x${string}`);

  const { 
    updateCampaignMetadata, 
    isPending: isUpdatingMetadata 
  } = useUpdateCampaignMetadata(contractAddress as `0x${string}`);

  const { 
    updateCustomDistributionData, 
    isPending: isUpdatingCustomDistribution 
  } = useUpdateCustomDistributionData(contractAddress as `0x${string}`);

  // Vote count update callback (same as index page)
  const updateProjectVoteCount = useCallback((projectId: string, voteCount: bigint) => {
    setProjectVoteCounts(prev => {
      const newMap = new Map(prev);
      newMap.set(projectId, voteCount);
      return newMap;
    });
  }, []);

  // Calculate total campaign votes
  const totalCampaignVotes = useMemo(() => {
    return Array.from(projectVoteCounts.values()).reduce((sum, voteCount) => 
      sum + Number(formatEther(voteCount)), 0
    );
  }, [projectVoteCounts]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (statusMessage.text) {
      const timer = setTimeout(() => {
        setStatusMessage({ text: '', type: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  useEffect(() => {
    if (approveError) {
      console.error('Approval error:', approveError);
      setStatusMessage({ text: `Failed to approve project: ${approveError.message}`, type: 'error' });
    }
  }, [approveError]);

  // Get campaign projects
  const campaignProjects = useMemo(() => {
    return allProjects?.filter(projectDetails => {
      return projectDetails.project.campaignIds.some(cId => Number(cId) === Number(campaignId));
    }) || [];
  }, [allProjects, campaignId]);

  // Filter projects based on current filter
  const filteredProjects = useMemo(() => {
    return campaignProjects.filter(projectDetails => {
      const project = formatProjectForDisplay(projectDetails);
      if (!project) return false;
      
      const isApproved = approvedProjectIds.has(project.id.toString());
      
      if (projectFilter === 'pending') return !isApproved;
      if (projectFilter === 'approved') return isApproved;
      return true;
    });
  }, [campaignProjects, projectFilter, approvedProjectIds]);

  // Calculate project counts
  const totalProjects = campaignProjects.length;
  const approvedProjects = campaignProjects.filter(p => {
    const project = formatProjectForDisplay(p);
    return project && approvedProjectIds.has(project.id.toString());
  }).length;
  const pendingProjects = totalProjects - approvedProjects;

  // Refetch data function
  const refetchAllData = useCallback(() => {
    setProjectVoteCounts(new Map());
    refetchSorted();
  }, [refetchSorted]);

  // Distribution calculation using centralized vote counts
  const calculateDistribution = useCallback((useQuadratic = false) => {
    const allApprovedProjects = campaignProjects.filter(p => {
      const project = formatProjectForDisplay(p);
      if (!project) return false;
      return approvedProjectIds.has(project.id.toString());
    });

    if (allApprovedProjects.length === 0) return [];

    const totalFunds = Number(campaignDetails?.campaign?.totalFunds || 0n) / 1e18;
    const adminFeePercentage = Number(campaignDetails?.campaign?.adminFeePercentage || 0n);
    
    const seasPlatformFee = 15;
    const seasFeeAmount = (totalFunds * seasPlatformFee) / 100;
    const adminFeeAmount = (totalFunds * adminFeePercentage) / 100;
    const availableForProjects = totalFunds - seasFeeAmount - adminFeeAmount;

    // Use centralized vote count state
    const projectsWithVotes = allApprovedProjects.filter(p => {
      const project = formatProjectForDisplay(p);
      if (!project) return false;
      const voteCount = projectVoteCounts.get(project.id.toString()) || 0n;
      return Number(voteCount) > 0;
    });

    let distributions = [];

    if (useQuadratic) {
      // Quadratic distribution
      const weights = projectsWithVotes.map(p => {
        const project = formatProjectForDisplay(p);
        if (!project) return 0;
        const voteCount = projectVoteCounts.get(project.id.toString()) || 0n;
        const voteCountNum = Number(voteCount) / 1e18;
        return Math.sqrt(voteCountNum);
      });
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);

      distributions = allApprovedProjects.map(p => {
        const project = formatProjectForDisplay(p);
        if (!project) return null;
        const voteCount = projectVoteCounts.get(project.id.toString()) || 0n;
        const voteCountNum = Number(voteCount) / 1e18;
        
        if (voteCountNum === 0 || totalWeight === 0) {
          return {
            projectId: project.id,
            projectName: project.name,
            voteCount: voteCountNum,
            weight: 0,
            amount: 0,
            percentage: 0
          };
        }

        const weight = Math.sqrt(voteCountNum);
        const share = (weight / totalWeight) * availableForProjects;
        const percentage = (weight / totalWeight) * 100;

        return {
          projectId: project.id,
          projectName: project.name,
          voteCount: voteCountNum,
          weight,
          amount: share,
          percentage
        };
      }).filter(Boolean);
    } else {
      // Linear distribution
      const totalVotes = projectsWithVotes.reduce((sum, p) => {
        const project = formatProjectForDisplay(p);
        if (!project) return sum;
        const voteCount = projectVoteCounts.get(project.id.toString()) || 0n;
        return sum + (Number(voteCount) / 1e18);
      }, 0);

      distributions = allApprovedProjects.map(p => {
        const project = formatProjectForDisplay(p);
        if (!project) return null;
        const voteCount = projectVoteCounts.get(project.id.toString()) || 0n;
        const voteCountNum = Number(voteCount) / 1e18;
        
        if (voteCountNum === 0 || totalVotes === 0) {
          return {
            projectId: project.id,
            projectName: project.name,
            voteCount: voteCountNum,
            weight: voteCountNum,
            amount: 0,
            percentage: 0
          };
        }

        const share = (voteCountNum / totalVotes) * availableForProjects;
        const percentage = (voteCountNum / totalVotes) * 100;

        return {
          projectId: project.id,
          projectName: project.name,
          voteCount: voteCountNum,
          weight: voteCountNum,
          amount: share,
          percentage
        };
      }).filter(Boolean);
    }

    return distributions
      .filter((dist): dist is NonNullable<typeof dist> => dist !== null)
      .sort((a, b) => b.amount - a.amount);
  }, [campaignProjects, approvedProjectIds, projectVoteCounts, campaignDetails]);

  // Event handlers
  const handleApproveProject = async (projectId: bigint) => {
    if (!isConnected || !address) {
      setStatusMessage({ text: 'Please connect your wallet to approve projects', type: 'error' });
      return;
    }

    if (!isAdmin) {
      setStatusMessage({ text: 'Only campaign admins can approve projects', type: 'error' });
      return;
    }

    try {
      setStatusMessage({ text: 'Submitting approval transaction...', type: 'info' });
      
      await approveProject({
        campaignId,
        projectId
      });
      
      setStatusMessage({ text: 'Project approved successfully!', type: 'success' });
      setConfirmApproval({ show: false, projectId: null });
      
      setTimeout(() => {
        refetchAllData();
      }, 3000);
      
    } catch (error: any) {
      console.error('Error approving project:', error);
      
      let errorMessage = 'Failed to approve project';
      
      if (error?.message) {
        if (error.message.includes('user rejected')) {
          errorMessage = 'Transaction was rejected by user';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for transaction';
        } else if (error.message.includes('Project already approved')) {
          errorMessage = 'Project is already approved';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      setStatusMessage({ text: errorMessage, type: 'error' });
      setConfirmApproval({ show: false, projectId: null });
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminAddress) return;
    
    try {
      await addCampaignAdmin({
        campaignId,
        newAdmin: newAdminAddress as `0x${string}`
      });
      setStatusMessage({ text: 'Admin added successfully!', type: 'success' });
      setShowAdminModal(false);
      setNewAdminAddress('');
    } catch (error: any) {
      console.error('Error adding admin:', error);
      setStatusMessage({ text: `Failed to add admin: ${error.message || 'Unknown error'}`, type: 'error' });
    }
  };

  const handleDistributeFunds = async () => {
    try {
      await distributeFunds({ campaignId });
      setStatusMessage({ text: 'Funds distributed successfully!', type: 'success' });
      setShowDistributeModal(false);
    } catch (error: any) {
      console.error('Error distributing funds:', error);
      setStatusMessage({ text: `Failed to distribute funds: ${error.message || 'Unknown error'}`, type: 'error' });
    }
  };

  const handleRemoveAdmin = async () => {
    if (!removeAdminAddress) return;
    
    try {
      await removeCampaignAdmin({
        campaignId,
        admin: removeAdminAddress as `0x${string}`
      });
      setStatusMessage({ text: 'Admin removed successfully!', type: 'success' });
      setShowRemoveAdminModal(false);
      setRemoveAdminAddress('');
    } catch (error: any) {
      console.error('Error removing admin:', error);
      setStatusMessage({ text: `Failed to remove admin: ${error.message || 'Unknown error'}`, type: 'error' });
    }
  };

  const handleUpdateMetadata = async () => {
    if (!mainInfo && !additionalInfo) return;
    
    try {
      await updateCampaignMetadata({
        campaignId,
        mainInfo: mainInfo || campaignDetails?.metadata?.mainInfo || '',
        additionalInfo: additionalInfo || campaignDetails?.metadata?.additionalInfo || ''
      });
      setStatusMessage({ text: 'Campaign metadata updated successfully!', type: 'success' });
      setShowUpdateMetadataModal(false);
      setMainInfo('');
      setAdditionalInfo('');
    } catch (error: any) {
      console.error('Error updating metadata:', error);
      setStatusMessage({ text: `Failed to update metadata: ${error.message || 'Unknown error'}`, type: 'error' });
    }
  };

  const handleUpdateCustomDistribution = async () => {
    try {
      await updateCustomDistributionData({
        campaignId,
        customDistributionData
      });
      setStatusMessage({ text: 'Custom distribution data updated successfully!', type: 'success' });
      setShowCustomDistributionModal(false);
      setCustomDistributionData('');
    } catch (error: any) {
      console.error('Error updating custom distribution:', error);
      setStatusMessage({ text: `Failed to update custom distribution: ${error.message || 'Unknown error'}`, type: 'error' });
    }
  };

  if (!isMounted) return null;

  if (campaignLoading || projectsLoading || sortedLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
            <Briefcase className="h-6 w-6 text-blue-600 absolute inset-0 m-auto" />
          </div>
          <div className="text-center">
            <p className="text-xl text-slate-700 font-semibold">Loading Campaign Management</p>
            <p className="text-sm text-slate-500 mt-2">Preparing administrative dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle invalid campaign ID
  if (!parsedId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <XCircle className="h-20 w-20 text-red-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-slate-800 mb-4">Invalid Campaign ID</h1>
          <p className="text-slate-600 mb-8">The campaign ID "{id}" is not valid or could not be decoded.</p>
          <button
            onClick={() => navigate('/explorer/campaigns')}
            className="px-8 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors duration-200"
          >
            Browse Campaigns
          </button>
        </div>
      </div>
    );
  }

  if (campaignError || !campaignDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <XCircle className="h-20 w-20 text-red-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-slate-800 mb-4">Campaign Not Found</h1>
          <p className="text-slate-600 mb-8">The campaign you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/explorer/campaigns')}
            className="px-8 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors duration-200"
          >
            Browse Campaigns
          </button>
        </div>
      </div>
    );
  }

  if (!isConnected || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <Shield className="h-20 w-20 text-amber-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-slate-800 mb-4">Access Restricted</h1>
          <p className="text-slate-600 mb-8">You need to be a campaign administrator to access this dashboard.</p>
          <button
            onClick={() => navigate(`/explore/campaign/${id}`)}
            className="px-8 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors duration-200"
          >
            View Campaign
          </button>
        </div>
      </div>
    );
  }

  const campaign = campaignDetails.campaign;
  const now = Math.floor(Date.now() / 1000);
  const startTime = Number(campaign.startTime);
  const endTime = Number(campaign.endTime);
  const hasStarted = now >= startTime;
  const hasEnded = now >= endTime;
  const canDistribute = hasEnded && campaign.active;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Professional Header */}
        <div className="group relative w-full mb-8">
          <div 
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
              backgroundSize: '0.5em 0.5em'
            }}
          />
          
          <div 
            className="relative bg-white border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2]"
            style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
          >
            <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
            <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
            
            <div className="relative px-[1.5em] py-[1.5em] z-[2]">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => navigate(`/explore/campaign/${id}`)}
                    className="inline-flex items-center px-4 py-2 bg-white text-[#050505] border-[0.2em] border-[#050505] rounded-[0.4em] font-extrabold shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all uppercase tracking-[0.05em]"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Campaign
                  </button>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-[#2563eb] border-[0.2em] border-[#050505] rounded-[0.3em] flex items-center justify-center shadow-[0.2em_0.2em_0_#000000]">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-extrabold text-[#050505] uppercase tracking-[0.05em]">Campaign Management</h1>
                      <p className="text-sm text-[#050505] font-semibold">Administrative Dashboard</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 flex-wrap">
                  <button
                    onClick={refetchAllData}
                    disabled={sortedLoading}
                    className="p-2 bg-white border-[0.2em] border-[#050505] rounded-[0.3em] font-extrabold shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all"
                  >
                    <RotateCcw className={`h-4 w-4 text-[#050505] ${sortedLoading ? 'animate-spin' : ''}`} />
                  </button>
                  
                  <button
                    onClick={() => navigate(`/app/campaign/edit/${id}`)}
                    className="px-4 py-2 bg-[#6366f1] text-white border-[0.2em] border-[#050505] rounded-[0.4em] font-extrabold shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all uppercase tracking-[0.05em] flex items-center space-x-2"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit Campaign</span>
                  </button>
                  
                  {canDistribute && (
                    <button
                      onClick={() => setShowDistributeModal(true)}
                      className="px-4 py-2 bg-[#10b981] text-white border-[0.2em] border-[#050505] rounded-[0.4em] font-extrabold shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all uppercase tracking-[0.05em] flex items-center space-x-2"
                    >
                      <Award className="h-4 w-4" />
                      <span>Distribute Funds</span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => setShowSimulateModal(true)}
                    className="px-4 py-2 bg-[#2563eb] text-white border-[0.2em] border-[#050505] rounded-[0.4em] font-extrabold shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all uppercase tracking-[0.05em] flex items-center space-x-2"
                  >
                    <Calculator className="h-4 w-4" />
                    <span>Simulate</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status + Metrics + Actions */}
        <div className="space-y-4 mb-8">
          {/* Status Banner */}
          <div className={`group relative w-full`}>
            <div 
              className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
              style={{
                backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                backgroundSize: '0.5em 0.5em'
              }}
            />
            
            <div 
              className={`relative bg-white border-[0.35em] rounded-[0.6em] shadow-[0.5em_0.5em_0_#000000] overflow-hidden z-[2] p-4`}
              style={{ 
                borderColor: canDistribute ? '#f59e0b' : '#2563eb',
                backgroundColor: canDistribute ? '#fef3c7' : '#dbeafe',
                boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)'
              }}
            >
              <div className="absolute -top-[0.8em] -right-[0.8em] w-[3em] h-[3em] rotate-45 z-[1]" style={{ backgroundColor: canDistribute ? '#f59e0b' : '#2563eb' }} />
              <div className="absolute top-[0.3em] right-[0.3em] text-white text-[1em] font-bold z-[2]">★</div>
              
              <div className="relative z-[2]">
                <h3 className="text-sm font-extrabold text-[#050505] uppercase tracking-[0.05em]">
                  {canDistribute ? 'Campaign has ended — distribution available' : hasStarted ? 'Campaign in progress' : 'Campaign not started'}
                </h3>
                <p className="text-sm text-[#050505] mt-1 font-semibold">
                  {hasEnded ? 'You can distribute funds to approved projects.' : hasStarted ? 'Collect votes and contributions until the deadline.' : 'Configure details before the campaign starts.'}
                </p>
              </div>
            </div>
          </div>



          {/* Grouped Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Primary */}
            {canDistribute && (
              <button onClick={() => setShowDistributeModal(true)} className="px-4 py-2 bg-[#6366f1] text-white border-[0.2em] border-[#050505] rounded-[0.4em] font-extrabold shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all uppercase tracking-[0.05em]">Distribute Funds</button>
            )}
            {pendingProjects > 0 && (
              <button onClick={() => setActiveTab('approval')} className="px-4 py-2 bg-[#2563eb] text-white border-[0.2em] border-[#050505] rounded-[0.4em] font-extrabold shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all uppercase tracking-[0.05em]">Review Projects</button>
            )}
            {campaignPoolId !== undefined && campaignPoolId !== 0n && (
              <button onClick={() => setShowFundPoolModal(true)} className="px-4 py-2 bg-[#10b981] text-white border-[0.2em] border-[#050505] rounded-[0.4em] font-extrabold shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all uppercase tracking-[0.05em]">Fund Pool</button>
            )}

            {/* Secondary */}
            <div className="relative">
              <details className="group">
                <summary className="px-4 py-2 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] font-extrabold shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all uppercase tracking-[0.05em] cursor-pointer">More Actions</summary>
                <div className="absolute z-10 mt-2 w-56 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] p-2 space-y-1">
                  <button onClick={() => {
                    try {
                      const rows: string[] = [];
                      rows.push(['Project ID', 'Name', 'Status'].join(','));
                      (campaignProjects || []).forEach((p: any) => {
                        const proj = formatProjectForDisplay(p);
                        if (!proj) return;
                        const isApproved = approvedProjectIds.has(proj.id.toString());
                        rows.push([proj.id.toString(), (proj.name || '').replace(/,/g, ' '), isApproved ? 'Approved' : 'Pending'].join(','));
                      });
                      const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.setAttribute('download', `campaign_${id}_projects.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    } catch (e) { console.error('Export failed', e); }
                  }} className="w-full text-left px-3 py-2 border-[0.15em] border-[#050505] rounded-[0.3em] font-semibold hover:bg-gray-50 transition-all uppercase tracking-[0.05em]">Export Data</button>
                  <button onClick={() => console.log('Analytics not implemented')} className="w-full text-left px-3 py-2 border-[0.15em] border-[#050505] rounded-[0.3em] font-semibold hover:bg-gray-50 transition-all uppercase tracking-[0.05em]">View Analytics</button>
                  <button onClick={() => console.log('Simulation not implemented')} className="w-full text-left px-3 py-2 border-[0.15em] border-[#050505] rounded-[0.3em] font-semibold hover:bg-gray-50 transition-all uppercase tracking-[0.05em]">Simulate Distribution</button>
                </div>
              </details>
            </div>

            {/* Admin */}
            {(isSuperAdmin || (poolsOwner && address && poolsOwner.toLowerCase() === address.toLowerCase())) && (
              <button onClick={() => setActiveTab('admin')} className="px-4 py-2 bg-[#1f2937] text-white border-[0.2em] border-[#050505] rounded-[0.4em] font-extrabold shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all uppercase tracking-[0.05em]">Admin Controls</button>
            )}
          </div>
        </div>

        {/* Campaign Info Card */}
        <div className="group relative w-full mb-8">
          <div 
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
              backgroundSize: '0.5em 0.5em'
            }}
          />
          
          <div 
            className="relative bg-white border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2]"
            style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
          >
            <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
            <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
            
            <div className="relative px-[1.5em] py-[1.5em] z-[2]">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-4 flex-wrap">
                    <h2 className="text-2xl font-extrabold text-[#050505] uppercase tracking-[0.05em]">{campaign.name}</h2>
                    <span className={`px-3 py-1 border-[0.15em] border-[#050505] rounded-[0.3em] text-sm font-extrabold shadow-[0.1em_0.1em_0_#000000] uppercase tracking-[0.05em] ${
                      hasEnded ? 'bg-gray-100 text-[#050505]' : hasStarted ? 'bg-[#d1fae5] text-[#050505]' : 'bg-[#fef3c7] text-[#050505]'
                    }`}>
                      <Clock className="h-3 w-3 mr-1 inline" />
                      {hasEnded ? 'Ended' : hasStarted ? 'Active' : 'Upcoming'}
                    </span>
                  </div>
                  <p className="text-[#050505] mb-4 font-semibold">{campaign.description}</p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-50 border-[0.15em] border-gray-300 rounded-[0.4em] p-3 shadow-[0.1em_0.1em_0_#000000]">
                      <div className="text-2xl font-extrabold text-[#050505]">{totalProjects}</div>
                      <div className="text-sm text-[#050505] font-semibold">Total Projects</div>
                    </div>
                    <div className="bg-[#d1fae5] border-[0.15em] border-[#10b981] rounded-[0.4em] p-3 shadow-[0.1em_0.1em_0_#000000]">
                      <div className="text-2xl font-extrabold text-[#050505]">{approvedProjects}</div>
                      <div className="text-sm text-[#050505] font-semibold">Approved</div>
                    </div>
                    <div className="bg-[#fef3c7] border-[0.15em] border-[#f59e0b] rounded-[0.4em] p-3 shadow-[0.1em_0.1em_0_#000000]">
                      <div className="text-2xl font-extrabold text-[#050505]">{pendingProjects}</div>
                      <div className="text-sm text-[#050505] font-semibold">Pending</div>
                    </div>
                    <div className="bg-[#dbeafe] border-[0.15em] border-[#2563eb] rounded-[0.4em] p-3 shadow-[0.1em_0.1em_0_#000000]">
                      <div className="text-2xl font-extrabold text-[#050505]">{totalCampaignVotes.toFixed(1)}</div>
                      <div className="text-sm text-[#050505] font-semibold">Total Votes</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pool Information */}
              {campaignPoolId !== undefined && campaignPoolId !== 0n && (
                <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-purple-800 flex items-center">
                      <Trophy className="h-5 w-5 mr-2" />
                      Prize Pool
                    </h3>
                    <span className="text-sm text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                      {poolInfo && poolInfo.metadata ? poolInfo.metadata : `Pool #${campaignPoolId !== undefined && campaignPoolId !== 0n ? campaignPoolId.toString() : 'N/A'}`}
                    </span>
                  </div>
                  
                  {isLoadingPoolBalance || isLoadingPoolStats ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                      <span className="ml-2 text-purple-600">Loading pool data...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg p-3 border border-purple-200">
                        <div className="text-lg font-bold text-purple-800">
                          {(() => {
                            // Build a compact multi-token summary (up to 3 tokens)
                            const tokens = Array.isArray(poolBalance) ? poolBalance[0] : poolBalance?.tokens;
                            const balances = Array.isArray(poolBalance) ? poolBalance[1] : poolBalance?.balances;
                            if (!tokens || !balances || tokens.length === 0) return '0';
                            const items = tokens.slice(0, 3).map((token: string, i: number) => {
                              const tokenInfo = supportedTokens.find(t => t.address.toLowerCase() === token.toLowerCase());
                              const dec = tokenInfo?.decimals ?? 18;
                              const sym = tokenInfo?.symbol ?? 'TOK';
                              const val = Number(balances[i]) / Math.pow(10, dec);
                              return `${val.toFixed(0)} ${sym}`;
                            });
                            const extra = tokens.length > 3 ? ` +${tokens.length - 3} more` : '';
                            return `${items.join(', ')}${extra}`;
                          })()}
                        </div>
                        <div className="text-sm text-purple-600">Pool Balances</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-purple-200">
                        <div className="text-lg font-bold text-purple-800">
                          {(() => {
                            if (!poolStats) return '0';
                            return Array.isArray(poolStats) ? (poolStats[1]?.toString?.() || '0') : (poolStats.contributorCount?.toString() || '0');
                          })()}
                        </div>
                        <div className="text-sm text-purple-600">Contributors</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-purple-200">
                        <div className="text-lg font-bold text-purple-800">
                          {(() => {
                            if (!poolStats) return '0';
                            return Array.isArray(poolStats) ? (poolStats[3]?.toString?.() || '0') : (poolStats.distributionCount?.toString() || '0');
                          })()}
                        </div>
                        <div className="text-sm text-purple-600">Distributions</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Create Pool Button if no pool exists */}
              {!hasPool && (
                <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-center">
                    <Trophy className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">No Prize Pool Yet</h3>
                    <p className="text-slate-600 mb-4">Create a prize pool to allow contributors to fund rewards for this campaign.</p>
                    <button
                      onClick={() => setShowCreatePoolModal(true)}
                      className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 mx-auto"
                    >
                      <Trophy className="h-4 w-4" />
                      <span>Create Prize Pool</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage.text && (
          <div className={`mb-6 p-4 rounded-lg border ${
            statusMessage.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-700' 
              : statusMessage.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            <div className="flex items-start">
              {statusMessage.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
              ) : statusMessage.type === 'error' ? (
                <XCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
              ) : (
                <Info className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
              )}
              <p className="font-medium">{statusMessage.text}</p>
            </div>
          </div>
        )}

        {/* Professional Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
          <div className="border-b border-slate-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'projects', label: 'Projects', icon: ListChecks, count: totalProjects },
                { id: 'pools', label: 'Pools', icon: Database },
                { id: 'simulation', label: 'Distribution', icon: Calculator },
                { id: 'settings', label: 'Settings', icon: Settings },
                { id: 'advanced', label: 'Advanced', icon: Settings }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Analytics Card */}
              <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-800">Campaign Analytics</h3>
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
              <div className="space-y-4">
                {/* Token Selector (allow multiple common tokens) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Token
                  </label>
                  <select
                    value={fundToken}
                    onChange={(e) => setFundToken(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    {fundTokenList.map((t) => (
                      <option key={t} value={t}>
                        {t === '0x0000000000000000000000000000000000000000' ? 'CELO' : `${t.slice(0, 6)}...${t.slice(-4)}`}
                      </option>
                    ))}
                  </select>
                </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Total Votes Cast:</span>
                      <span className="font-semibold text-blue-600">{totalCampaignVotes.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Participation Rate:</span>
                      <span className="font-semibold text-green-600">
                        {totalProjects > 0 ? Math.round((approvedProjects / totalProjects) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Avg Votes/Project:</span>
                      <span className="font-semibold text-indigo-600">
                        {approvedProjects > 0 ? (totalCampaignVotes / approvedProjects).toFixed(1) : '0.0'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financial Overview */}
                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-800">Financial Overview</h3>
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Total Treasury:</span>
                      <span className="font-semibold text-green-600">{Number(campaign.totalFunds) / 1e18} CELO</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-slate-600">Platform Fee (15%):</span>
                     <span className="font-semibold text-blue-600">
                       {((Number(campaign.totalFunds) / 1e18) * 0.15).toFixed(2)} CELO
                     </span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-slate-600">Admin Fee ({Number(campaign.adminFeePercentage)}%):</span>
                     <span className="font-semibold text-orange-600">
                       {((Number(campaign.totalFunds) / 1e18) * (Number(campaign.adminFeePercentage) / 100)).toFixed(2)} CELO
                     </span>
                   </div>
                   <div className="pt-2 border-t border-green-200">
                     <div className="flex justify-between items-center">
                       <span className="text-slate-800 font-medium">Available for Distribution:</span>
                       <span className="font-bold text-green-700">
                         {((Number(campaign.totalFunds) / 1e18) * (1 - 0.15 - Number(campaign.adminFeePercentage) / 100)).toFixed(2)} CELO
                       </span>
                     </div>
                   </div>
                 </div>
               </div>

               {/* Timeline Card */}
              <div className="bg-white rounded-xl p-6 border border-slate-200">
                 <div className="flex items-center justify-between mb-6">
                   <h3 className="text-lg font-semibold text-slate-800">Campaign Timeline</h3>
                   <Calendar className="h-5 w-5 text-purple-600" />
                 </div>
                 <div className="space-y-4">
                   <div>
                     <span className="text-slate-600 text-sm">Start Date:</span>
                     <p className="font-semibold text-slate-800">{new Date(startTime * 1000).toLocaleDateString()}</p>
                     <p className="text-xs text-slate-500">{new Date(startTime * 1000).toLocaleTimeString()}</p>
                   </div>
                   <div>
                     <span className="text-slate-600 text-sm">End Date:</span>
                     <p className="font-semibold text-slate-800">{new Date(endTime * 1000).toLocaleDateString()}</p>
                     <p className="text-xs text-slate-500">{new Date(endTime * 1000).toLocaleTimeString()}</p>
                   </div>
                   <div className="pt-2">
                     <div className="w-full bg-slate-200 rounded-full h-2">
                       <div 
                         className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500" 
                         style={{ 
                           width: hasEnded ? '100%' : hasStarted ? `${Math.min(100, ((now - startTime) / (endTime - startTime)) * 100)}%` : '0%'
                         }}
                       ></div>
                     </div>
                     <p className="text-xs text-slate-500 mt-1">
                       {hasEnded ? 'Campaign completed' : hasStarted ? 'Campaign in progress' : 'Campaign not started'}
                     </p>
                   </div>
                 </div>
               </div>
             </div>
           )}

           {/* Projects Tab */}
           {activeTab === 'projects' && (
             <div>
               {/* Project Filters */}
               <div className="flex items-center justify-between mb-6">
                 <h3 className="text-xl font-semibold text-slate-800">Project Management</h3>
                 <div className="flex space-x-2">
                   {[
                     { id: 'all', label: 'All', count: totalProjects },
                     { id: 'pending', label: 'Pending', count: pendingProjects },
                     { id: 'approved', label: 'Approved', count: approvedProjects }
                   ].map(filter => (
                     <button
                       key={filter.id}
                       onClick={() => setProjectFilter(filter.id)}
                       className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                         projectFilter === filter.id 
                           ? 'bg-blue-600 text-white' 
                           : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                       }`}
                     >
                       {filter.label} ({filter.count})
                     </button>
                   ))}
                 </div>
               </div>

               {/* Projects List */}
               <div className="space-y-4">
                 {filteredProjects.length === 0 ? (
                   <div className="text-center py-12 bg-slate-50 rounded-xl">
                     <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                     <h4 className="text-lg font-semibold text-slate-600 mb-2">No Projects Found</h4>
                     <p className="text-slate-500">No {projectFilter !== 'all' ? projectFilter : ''} projects found in this campaign.</p>
                   </div>
                 ) : (
                   filteredProjects.map((projectDetails) => {
                     const project = formatProjectForDisplay(projectDetails);
                     if (!project) return null;

                     const isApproved = approvedProjectIds.has(project.id.toString());

                     return (
                       <div key={project.id} className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all duration-200 shadow-sm hover:shadow-md">
                         <div className="p-6">
                           <div className="flex flex-col lg:flex-row lg:items-start justify-between">
                             <div className="flex-1">
                               <div className="flex items-start space-x-4 mb-4">
                                  <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                                   {project.name?.charAt(0) || 'P'}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                   <div className="flex items-center space-x-3 mb-2">
                                     <h4 className="text-lg font-semibold text-slate-800 truncate">{project.name}</h4>
                                     <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                       isApproved 
                                         ? 'bg-green-100 text-green-700' 
                                         : 'bg-amber-100 text-amber-700'
                                     }`}>
                                       {isApproved ? (
                                         <div className="flex items-center space-x-1">
                                           <CheckCircle className="h-3 w-3" />
                                           <span>Approved</span>
                                         </div>
                                       ) : (
                                         <div className="flex items-center space-x-1">
                                           <Clock className="h-3 w-3" />
                                           <span>Pending Review</span>
                                         </div>
                                       )}
                                     </span>
                                   </div>
                                   <p className="text-slate-600 text-sm mb-3 line-clamp-2">{project.description}</p>
                                   
                                   {/* Project Metadata */}
                                   <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                                     <span className="flex items-center space-x-1">
                                       <User className="h-3 w-3" />
                                       <span>{project.owner.slice(0, 6)}...{project.owner.slice(-4)}</span>
                                     </span>
                                     {project.additionalDataParsed?.githubRepo && (
                                       <a 
                                         href={project.additionalDataParsed.githubRepo} 
                                         target="_blank" 
                                         rel="noopener noreferrer"
                                         className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                                       >
                                         <Github className="h-3 w-3" />
                                         <span>GitHub</span>
                                       </a>
                                     )}
                                     {project.additionalDataParsed?.website && (
                                       <a 
                                         href={project.additionalDataParsed.website} 
                                         target="_blank" 
                                         rel="noopener noreferrer"
                                         className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                                       >
                                         <Globe className="h-3 w-3" />
                                         <span>Website</span>
                                       </a>
                                     )}
                                   </div>
                                 </div>
                               </div>

                               {/* Vote Display */}
                               <div className="bg-slate-50 rounded-lg p-3 mb-4">
                                 <div className="flex items-center justify-between">
                                   <span className="text-sm font-medium text-slate-600">Current Votes:</span>
                                   <ProjectVotes 
                                     campaignId={campaignId} 
                                     projectId={BigInt(project.id)} 
                                     onVoteCountReceived={updateProjectVoteCount}
                                   />
                                 </div>
                               </div>
                             </div>
                             
                             {/* Action Buttons */}
                             <div className="flex items-center space-x-3 mt-4 lg:mt-0 lg:ml-6">
                               <button
                                 onClick={() => navigate(`/explore/project/${project.id}`)}
                                 className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                               >
                                 <Eye className="h-4 w-4" />
                                 <span>View</span>
                               </button>
                               
                               {!isApproved && (
                                 <button
                                   onClick={() => setConfirmApproval({ show: true, projectId: BigInt(project.id) })}
                                   disabled={isApprovingProject}
                                   className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                 >
                                   {isApprovingProject ? (
                                     <>
                                       <Loader2 className="h-4 w-4 animate-spin" />
                                       <span>Approving...</span>
                                     </>
                                   ) : (
                                     <>
                                       <CheckCircle className="h-4 w-4" />
                                       <span>Approve</span>
                                     </>
                                   )}
                                 </button>
                               )}
                             </div>
                           </div>
                         </div>
                       </div>
                     );
                   })
                 )}
               </div>
             </div>
           )}

           {/* Pools Tab */}
           {activeTab === 'pools' && (
             <div className="space-y-8">
               {/* Pool Management Header */}
               <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                 <div className="flex items-center justify-between">
                   <div>
                     <h3 className="text-xl font-semibold text-slate-800 mb-2">Prize Pool Management</h3>
                     <p className="text-slate-600">Create and manage prize pools for this campaign to distribute rewards to participants.</p>
                   </div>
                   <Database className="h-8 w-8 text-primary" />
                 </div>
               </div>

              {/* Pool Actions (creation) - hide if pool exists */}
              {!hasPool && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Create Universal Pool */}
                 <div className="bg-white rounded-xl border border-slate-200 p-6">
                   <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Database className="h-5 w-5 text-primary" />
                    </div>
                     <h4 className="text-lg font-semibold text-slate-800">Universal Pool</h4>
                   </div>
                   <p className="text-slate-600 mb-4">Create a universal pool that accepts any token for donations and funding.</p>
                   <button
                     onClick={() => {
                       setPoolType('universal');
                       setShowCreatePoolModal(true);
                     }}
                     disabled={isCreatingUniversal}
                     className="w-full px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                   >
                     {isCreatingUniversal ? (
                       <Loader2 className="h-4 w-4 animate-spin" />
                     ) : (
                       <Database className="h-4 w-4" />
                     )}
                     <span>{isCreatingUniversal ? 'Creating...' : 'Create Universal Pool'}</span>
                   </button>
                 </div>

                 {/* Create ERC20 Pool */}
                 <div className="bg-white rounded-xl border border-slate-200 p-6">
                   <div className="flex items-center space-x-3 mb-4">
                     <div className="p-2 bg-green-100 rounded-lg">
                       <Target className="h-5 w-5 text-green-600" />
                     </div>
                     <h4 className="text-lg font-semibold text-slate-800">ERC20 Specific Pool</h4>
                   </div>
                   <p className="text-slate-600 mb-4">Create a pool that only accepts specific ERC20 tokens for donations.</p>
                   <button
                     onClick={() => {
                       setPoolType('erc20');
                       setShowCreatePoolModal(true);
                     }}
                     disabled={isCreatingERC20}
                     className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                   >
                     {isCreatingERC20 ? (
                       <Loader2 className="h-4 w-4 animate-spin" />
                     ) : (
                       <Target className="h-4 w-4" />
                     )}
                     <span>{isCreatingERC20 ? 'Creating...' : 'Create ERC20 Pool'}</span>
                   </button>
                 </div>
              </div>
              )}

             {/* Pool Stats removed per request */}

              {/* Pool Distribution Actions - Only show if pool exists */}
              {hasPool && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h4 className="text-lg font-semibold text-slate-800 mb-6">Pool Distribution</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => {
                        distributePool(campaignPoolId, false);
                      }}
                      disabled={isDistributingPool}
                      className="px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      {isDistributingPool ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Award className="h-4 w-4" />
                      )}
                      <span>{isDistributingPool ? 'Distributing...' : 'Distribute Pool'}</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        distributePool(campaignPoolId, true);
                      }}
                      disabled={isDistributingPool}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      {isDistributingPool ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trophy className="h-4 w-4" />
                      )}
                      <span>{isDistributingPool ? 'Distributing...' : 'Distribute in Sovereign Seas'}</span>
                    </button>

                    <button
                      onClick={() => setShowManualDistributeModal(true)}
                      disabled={isDistributingPool}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Distribute Manual</span>
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 mt-4">
                    Distribute pool funds to approved projects. Choose regular distribution, distribute through Sovereign Seas for enhanced tracking, or manually configure distributions by token and project.
                  </p>
                </div>
              )}

              {/* Super Admin Actions - Only show if user is super admin or contract owner */}
              {(isSuperAdmin || (poolsOwner && address && poolsOwner && poolsOwner.toLowerCase() === address.toLowerCase())) && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h4 className="text-lg font-semibold text-slate-800 mb-6">Super Admin Management</h4>
                  <div className="mb-4 p-3 rounded border border-slate-200">
                    <div className="flex flex-col md:flex-row md:items-end md:space-x-3 space-y-2 md:space-y-0">
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">Claim Contract Fees For Token</label>
                        <input id="claim-token-input" className="px-3 py-2 border rounded w-80 font-mono text-xs" placeholder="0x token address" />
                      </div>
                      <button
                        onClick={async () => {
                          const input = document.getElementById('claim-token-input') as HTMLInputElement | null
                          const token = (input?.value || '') as `0x${string}`
                          if (!token) return
                          try { await claimContractFees(token) } catch (e) { console.error(e) }
                        }}
                        disabled={isClaimingFees}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg"
                      >
                        {isClaimingFees ? 'Claiming...' : 'Claim Contract Fees'}
                      </button>
                    </div>
                  </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Add Super Admin
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="0x..."
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                      <button
                        onClick={() => {
                          // This would need to get the address from the input
                          // addSuperAdmin(address);
                        }}
                        disabled={false}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
                      >
                          <UserPlus className="h-4 w-4" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Remove Super Admin
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="0x..."
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                      <button
                        onClick={() => {
                          // This would need to get the address from the input
                          // removeSuperAdmin(address);
                        }}
                        disabled={false}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
                      >
                          <User className="h-4 w-4" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
                  <p className="text-sm text-slate-600 mt-4">
                    Manage super admin permissions for the pools contract. Super admins can create pools and perform administrative actions.
                  </p>
                </div>
              )}

              {/* Pool Management Section */}
            {hasPool ? (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-lg font-semibold text-slate-800">Pool Management</h4>
                    <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                      Pool #{campaignPoolId?.toString() || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Pool Data - 3/4 width */}
                    <div className="lg:col-span-3">
                      <div className="space-y-6">
                        {/* Pool Information */}
                        <div className="bg-slate-50 rounded-lg p-4">
                          <h5 className="font-semibold text-slate-800 mb-3 flex items-center">
                            <Database className="h-4 w-4 mr-2" />
                            Pool Information
                          </h5>
                          {poolInfoError ? (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <div className="flex items-center">
                                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                                <div>
                                  <p className="text-red-800 font-medium">Error loading pool info</p>
                                  <p className="text-red-600 text-sm mt-1">
                                    {poolInfoError.message || 'Unknown error occurred'}
                                  </p>
                                  <button 
                                    onClick={() => window.location.reload()} 
                                    className="text-red-600 text-sm underline mt-2 hover:text-red-800"
                                  >
                                    Retry
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : isLoadingPoolInfo ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
                              <span className="ml-2 text-slate-600">Loading...</span>
                            </div>
                          ) : poolInfo ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <span className="text-sm text-slate-600">Pool ID:</span>
                                <p className="font-medium text-slate-800">
                                  {Array.isArray(poolInfo) ? poolInfo[0]?.toString() : poolInfo.id?.toString() || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <span className="text-sm text-slate-600">Campaign ID:</span>
                                <p className="font-medium text-slate-800">
                                  {Array.isArray(poolInfo) ? poolInfo[1]?.toString() : poolInfo.campaignId?.toString() || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <span className="text-sm text-slate-600">Pool Type:</span>
                                <p className="font-medium text-slate-800">
                                  {(() => {
                                    const poolType = Array.isArray(poolInfo) ? poolInfo[2] : poolInfo.poolType;
                                    return poolType === 0 ? 'Universal' : 'ERC20 Specific';
                                  })()}
                                </p>
                              </div>
                              <div>
                                <span className="text-sm text-slate-600">Status:</span>
                                <p className="font-medium text-slate-800">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    (() => {
                                      const isActive = Array.isArray(poolInfo) ? poolInfo[3] : poolInfo.isActive;
                                      const isPaused = Array.isArray(poolInfo) ? poolInfo[4] : poolInfo.isPaused;
                                      return isActive 
                                        ? (isPaused ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800')
                                        : 'bg-red-100 text-red-800';
                                    })()
                                  }`}>
                                    {(() => {
                                      const isActive = Array.isArray(poolInfo) ? poolInfo[3] : poolInfo.isActive;
                                      const isPaused = Array.isArray(poolInfo) ? poolInfo[4] : poolInfo.isPaused;
                                      return isActive 
                                        ? (isPaused ? 'Paused' : 'Active')
                                        : 'Inactive';
                                    })()}
                                  </span>
                                </p>
                              </div>
                              <div>
                                <span className="text-sm text-slate-600">Created:</span>
                                <p className="font-medium text-slate-800">
                                  {(() => {
                                    // Prefer object key; fallback to tuple index (createdAt likely at index 6)
                                    const createdAt = Array.isArray(poolInfo) ? poolInfo[6] : poolInfo.createdAt;
                                    return createdAt && Number(createdAt) > 0 
                                      ? new Date(Number(createdAt) * 1000).toLocaleDateString()
                                      : '—';
                                  })()}
                                </p>
                              </div>
                              <div>
                                <span className="text-sm text-slate-600">Admin:</span>
                                <p className="font-medium text-slate-800 font-mono text-xs">
                                  {(() => {
                                    // Prefer object key; fallback to tuple index (admin likely at index 5)
                                    const rawAdmin = Array.isArray(poolInfo) ? poolInfo[5] : poolInfo.admin;
                                    const admin = typeof rawAdmin === 'string' ? rawAdmin : (rawAdmin?.toString?.() ?? '');
                                    return admin && admin.startsWith('0x') && admin.length >= 10
                                      ? `${admin.slice(0, 6)}...${admin.slice(-4)}`
                                      : (admin || 'N/A');
                                  })()}
                                </p>
                              </div>
                              {(() => {
                                const metadata = Array.isArray(poolInfo) ? poolInfo[7] : poolInfo.metadata;
                                return metadata && (
                                  <div className="md:col-span-2">
                                    <span className="text-sm text-slate-600">Metadata:</span>
                                    <p className="font-medium text-slate-800">{metadata}</p>
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            <p className="text-slate-500">Pool information unavailable</p>
                          )}
                        </div>

                        {/* Pool Balance */}
                        <div className="bg-slate-50 rounded-lg p-4">
                          <h5 className="font-semibold text-slate-800 mb-3 flex items-center">
                            <DollarSign className="h-4 w-4 mr-2" />
                            Pool Balance
                          </h5>
                          {poolBalanceError ? (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <div className="flex items-center">
                                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                                <div>
                                  <p className="text-red-800 font-medium">Error loading pool balance</p>
                                  <p className="text-red-600 text-sm mt-1">
                                    {poolBalanceError.message || 'Unknown error occurred'}
                                  </p>
                                  <button 
                                    onClick={() => refetchPoolBalance?.()} 
                                    className="text-red-600 text-sm underline mt-2 hover:text-red-800"
                                  >
                                    Retry
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : isLoadingPoolBalance ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
                              <span className="ml-2 text-slate-600">Loading...</span>
                            </div>
                          ) : (() => {
                            // Handle both array and object formats
                            const tokens = Array.isArray(poolBalance) ? poolBalance[0] : poolBalance?.tokens;
                            const balances = Array.isArray(poolBalance) ? poolBalance[1] : poolBalance?.balances;
                            
                            return tokens && balances ? (
                              <div className="space-y-3">
                                {tokens.length > 0 ? (
                                  tokens.map((token: `0x${string}`, index: number) => {
                                    // Find token info from supported tokens
                                    const tokenInfo = supportedTokens.find(t => 
                                      t.address.toLowerCase() === token.toLowerCase()
                                    );
                                    
                                    const balance = Number(balances[index]);
                                    const formattedBalance = tokenInfo 
                                      ? (balance / Math.pow(10, tokenInfo.decimals)).toFixed(4)
                                      : (balance / 1e18).toFixed(4);
                                    
                                    const tokenName = tokenInfo?.name || 'Unknown Token';
                                    const tokenSymbol = tokenInfo?.symbol || 'UNK';
                                    const tokenAddress = token.slice(0, 6) + '...' + token.slice(-4);
                                    
                                    return (
                                      <div key={index} className="flex justify-between items-center py-3 px-3 bg-white rounded-lg border border-slate-200">
                                        <div className="flex flex-col">
                                          <div className="flex items-center space-x-2">
                                            <span className="font-medium text-slate-800">{tokenName}</span>
                                            <span className="text-sm text-slate-500">({tokenSymbol})</span>
                                          </div>
                                          <span className="text-xs text-slate-400 font-mono">{tokenAddress}</span>
                                        </div>
                                  <div className="flex items-center space-x-3">
                                          <div className="text-right">
                                            <div className="font-semibold text-slate-800">
                                              {formattedBalance}
                                            </div>
                                            <div className="text-xs text-slate-500">{tokenSymbol}</div>
                                          </div>
                                  {isPoolAdmin && balance === 0 && (
                                      <button
                                        onClick={async () => {
                                          try {
                                            await removeTrackedToken(campaignPoolId as bigint, token as `0x${string}`)
                                                  } catch (e) { console.error('Remove token failed:', e) }
                                        }}
                                        disabled={isRemovingToken}
                                        className="px-2 py-1 text-xs rounded bg-red-50 hover:bg-red-100 text-red-700 disabled:opacity-50"
                                      >
                                        Remove
                                      </button>
                                    )}
                                  </div>
                                </div>
                                    );
                                  })
                                ) : (
                                  <div className="text-center py-8">
                                    <DollarSign className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-slate-500">No tokens in pool</p>
                                  </div>
                              )}
                            </div>
                          ) : (
                              <div className="text-center py-8">
                                <DollarSign className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-slate-500">Balance information unavailable</p>
                            </div>
                            );
                          })()}
                        </div>

                        {/* Pool Statistics */}
                        <div className="bg-slate-50 rounded-lg p-4">
                          <h5 className="font-semibold text-slate-800 mb-3 flex items-center">
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Pool Statistics
                          </h5>
                          {poolStatsError ? (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <div className="flex items-center">
                                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                                <div>
                                  <p className="text-red-800 font-medium">Error loading pool statistics</p>
                                  <p className="text-red-600 text-sm mt-1">
                                    {poolStatsError.message || 'Unknown error occurred'}
                                  </p>
                                  <button 
                                    onClick={() => refetchPoolStats?.()} 
                                    className="text-red-600 text-sm underline mt-2 hover:text-red-800"
                                  >
                                    Retry
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : isLoadingPoolStats ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
                              <span className="ml-2 text-slate-600">Loading...</span>
                            </div>
                          ) : poolStats ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="text-center p-4 bg-white rounded-lg border border-slate-200">
                                <div className="text-2xl font-bold text-slate-800 mb-1">
                                  {Array.isArray(poolStats) ? poolStats[1]?.toString() : poolStats.contributorCount?.toString() || '0'}
                                </div>
                                <div className="text-sm text-slate-600">Contributors</div>
                              </div>
                              <div className="text-center p-4 bg-white rounded-lg border border-slate-200">
                                <div className="text-2xl font-bold text-slate-800 mb-1">
                                  {Array.isArray(poolStats) ? poolStats[3]?.toString() : poolStats.distributionCount?.toString() || '0'}
                                </div>
                                <div className="text-sm text-slate-600">Distributions</div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <BarChart3 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                              <p className="text-slate-500">Statistics unavailable</p>
                            </div>
                          )}
                        </div>

                        {/* Pool Fees (Admin Only) */}
                        {isPoolAdmin && (
                          <div className="bg-slate-50 rounded-lg p-4">
                            <h5 className="font-semibold text-slate-800 mb-3 flex items-center">
                              <Settings className="h-4 w-4 mr-2" />
                              Pool Fees
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm text-slate-600 mb-1">Contract Admin Fee (bps)</label>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="number"
                                    min={0}
                                    max={10000}
                                    defaultValue={poolFees?.contractAdminFee ? Number(poolFees.contractAdminFee) : 500}
                                    className="w-28 px-2 py-1 border rounded"
                                    onBlur={async (e) => {
                                      const value = BigInt(e.target.value || '0')
                                      try { 
                                        await setPoolContractFee(campaignPoolId as bigint, value) 
                                      } catch (err) { 
                                        console.error('Set contract fee failed:', err) 
                                      }
                                    }}
                                  />
                                  <span className="text-sm text-slate-500">/ 10000</span>
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm text-slate-600 mb-1">Campaign Admin Fee (bps)</label>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="number"
                                    min={0}
                                    max={10000}
                                    defaultValue={poolFees?.campaignAdminFee ? Number(poolFees.campaignAdminFee) : 0}
                                    className="w-28 px-2 py-1 border rounded"
                                    onBlur={async (e) => {
                                      const value = BigInt(e.target.value || '0')
                                      try { 
                                        await setCampaignFee(campaignPoolId as bigint, value) 
                                      } catch (err) { 
                                        console.error('Set campaign fee failed:', err) 
                                      }
                                    }}
                                  />
                                  <span className="text-sm text-slate-500">/ 10000</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pool Actions - 1/4 width */}
                    <div className="lg:col-span-1">
                      <div className="space-y-4">
                        <h5 className="font-semibold text-slate-800 mb-3 flex items-center">
                          <Settings className="h-4 w-4 mr-2" />
                          Actions
                        </h5>
                        
                        {/* Fund Pool */}
                        <button
                          onClick={() => setShowFundPoolModal(true)}
                          className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                        >
                          <DollarSign className="h-4 w-4" />
                          <span>Fund Pool</span>
                        </button>

                        {/* Donate to Pool */}
                        <button
                          onClick={() => setShowDonateModal(true)}
                          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                        >
                          <UserPlus className="h-4 w-4" />
                          <span>Donate</span>
                        </button>

                        {/* Distribute Pool */}
                        <button
                          onClick={() => distributePool(campaignPoolId, true)}
                          disabled={isDistributingPool || !poolInfo?.isActive || poolInfo?.isPaused}
                          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                        >
                          {isDistributingPool ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trophy className="h-4 w-4" />
                          )}
                          <span>{isDistributingPool ? 'Distributing...' : 'Distribute'}</span>
                        </button>

                        {/* Pool Admin Controls */}
                        {isPoolAdmin && (
                          <>
                            {/* Update Metadata */}
                            <button
                              onClick={() => setShowUpdateMetadataModal(true)}
                              className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                            >
                              <Edit className="h-4 w-4" />
                              <span>Update Info</span>
                            </button>

                            {/* Close Pool */}
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to close this pool? This action cannot be undone.')) {
                                  closePoolFunction(campaignPoolId);
                                }
                              }}
                              disabled={isClosingPool}
                              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                            >
                              {isClosingPool ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                              <span>{isClosingPool ? 'Closing...' : 'Close Pool'}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="text-center py-12 bg-slate-50 rounded-xl">
                    <Database className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-slate-600 mb-2">No Pool Created</h4>
                    <p className="text-slate-500 mb-4">Create a pool to start managing prize distributions for this campaign.</p>
                    <button
                      onClick={() => setShowCreatePoolModal(true)}
                      className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 mx-auto"
                    >
                      <Trophy className="h-4 w-4" />
                      <span>Create Pool</span>
                    </button>
                  </div>
                </div>
              )}
             </div>
           )}

           {/* Distribution Simulation Tab */}
           {activeTab === 'simulation' && (
             <div className="space-y-8">
               {/* Alert if campaign hasn't ended */}
               {!hasEnded && (
                 <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                   <div className="flex items-start">
                     <AlertTriangle className="h-5 w-5 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
                     <div>
                       <p className="font-semibold text-amber-800">Simulation Mode</p>
                       <p className="text-sm text-amber-700 mt-1">
                         This campaign is still active. The distribution shown below is a simulation based on current votes.
                         Actual distribution will occur after the campaign ends.
                       </p>
                     </div>
                   </div>
                 </div>
               )}

               {/* Distribution Methods Comparison */}
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                 {/* Linear Distribution */}
                 <div className="bg-white rounded-xl border border-slate-200 p-6">
                   <div className="flex items-center justify-between mb-6">
                     <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                       <Target className="h-5 w-5 text-blue-600 mr-2" />
                       Linear Distribution
                     </h3>
                     <div className="text-sm text-slate-500">Proportional to votes</div>
                   </div>

                   <div className="space-y-3 max-h-96 overflow-y-auto">
                     {calculateDistribution(false).map((dist, index: number) => (
                       <div key={`linear-${dist.projectId}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                         <div className="flex items-center space-x-3">
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                             index === 0 && dist.amount > 0 ? 'bg-yellow-100 text-yellow-800' :
                             index === 1 && dist.amount > 0 ? 'bg-slate-200 text-slate-800' :
                             index === 2 && dist.amount > 0 ? 'bg-orange-100 text-orange-800' :
                             dist.amount > 0 ? 'bg-blue-100 text-blue-800' :
                             'bg-slate-100 text-slate-400'
                           }`}>
                             {dist.amount > 0 ? (
                               index === 0 ? <Crown className="h-4 w-4" /> :
                               index === 1 ? <Trophy className="h-4 w-4" /> :
                               index === 2 ? <Medal className="h-4 w-4" /> :
                               index + 1
                             ) : '-'}
                           </div>
                           <div>
                             <div className="font-medium text-slate-800 text-sm">{dist.projectName}</div>
                             <div className="text-xs text-slate-600">{dist.voteCount.toFixed(1)} votes</div>
                           </div>
                         </div>
                         <div className="text-right">
                           <div className={`font-bold text-sm ${dist.amount > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                             {dist.amount > 0 ? `${dist.amount.toFixed(2)} CELO` : 'No funding'}
                           </div>
                           <div className="text-xs text-slate-500">
                             {dist.amount > 0 ? `${dist.percentage.toFixed(1)}%` : '0%'}
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>

                 {/* Quadratic Distribution */}
                 <div className="bg-white rounded-xl border border-slate-200 p-6">
                   <div className="flex items-center justify-between mb-6">
                     <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                       <Zap className="h-5 w-5 text-purple-600 mr-2" />
                       Quadratic Distribution
                     </h3>
                     <div className="text-sm text-slate-500">Square root weighting</div>
                   </div>

                   <div className="space-y-3 max-h-96 overflow-y-auto">
                     {calculateDistribution(true).map((dist, index: number) => (
                       <div key={`quadratic-${dist.projectId}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                         <div className="flex items-center space-x-3">
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                             index === 0 && dist.amount > 0 ? 'bg-yellow-100 text-yellow-800' :
                             index === 1 && dist.amount > 0 ? 'bg-slate-200 text-slate-800' :
                             index === 2 && dist.amount > 0 ? 'bg-orange-100 text-orange-800' :
                             dist.amount > 0 ? 'bg-blue-100 text-blue-800' :
                             'bg-slate-100 text-slate-400'
                           }`}>
                             {dist.amount > 0 ? (
                               index === 0 ? <Crown className="h-4 w-4" /> :
                               index === 1 ? <Trophy className="h-4 w-4" /> :
                               index === 2 ? <Medal className="h-4 w-4" /> :
                               index + 1
                             ) : '-'}
                           </div>
                           <div>
                             <div className="font-medium text-slate-800 text-sm">{dist.projectName}</div>
                             <div className="text-xs text-slate-600">
                               {dist.voteCount.toFixed(1)} votes {dist.amount > 0 ? `(√${dist.weight.toFixed(2)})` : ''}
                             </div>
                           </div>
                         </div>
                         <div className="text-right">
                           <div className={`font-bold text-sm ${dist.amount > 0 ? 'text-purple-600' : 'text-slate-400'}`}>
                             {dist.amount > 0 ? `${dist.amount.toFixed(2)} CELO` : 'No funding'}
                           </div>
                           <div className="text-xs text-slate-500">
                             {dist.amount > 0 ? `${dist.percentage.toFixed(1)}%` : '0%'}
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               </div>

               {/* Distribution Method Explanation */}
               <div className="bg-slate-50 rounded-xl p-6">
                 <h4 className="font-semibold text-slate-800 mb-4">Distribution Methods Explained</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="flex items-start space-x-3">
                     <Target className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                     <div>
                       <div className="font-medium text-slate-800 mb-1">Linear Distribution</div>
                       <div className="text-slate-600">
                         Projects receive funding proportional to their total vote amounts. 
                         Higher votes = higher percentage of funds.
                       </div>
                     </div>
                   </div>
                   <div className="flex items-start space-x-3">
                     <Zap className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                     <div>
                       <div className="font-medium text-slate-800 mb-1">Quadratic Distribution</div>
                       <div className="text-slate-600">
                         Vote amounts are square-rooted, reducing the advantage of large individual contributions 
                         and promoting broader community support.
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           )}

           {/* Settings Tab */}
           {activeTab === 'settings' && (
             <div className="space-y-8">
               {/* Campaign Configuration */}
               <div className="bg-white rounded-xl border border-slate-200 p-6">
                 <h3 className="text-lg font-semibold text-slate-800 mb-6">Campaign Configuration</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-4">
                     <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Campaign Name</label>
                       <div className="px-3 py-2 bg-slate-50 rounded-lg text-slate-800">{campaign.name}</div>
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Admin Fee</label>
                       <div className="px-3 py-2 bg-slate-50 rounded-lg text-slate-800">{Number(campaign.adminFeePercentage)}%</div>
                     </div>
                   </div>
                   <div className="space-y-4">
                     <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Max Winners</label>
                       <div className="px-3 py-2 bg-slate-50 rounded-lg text-slate-800">{Number(campaign.maxWinners) || 'Unlimited'}</div>
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Distribution Method</label>
                       <div className="px-3 py-2 bg-slate-50 rounded-lg text-slate-800">
                         {campaign.useQuadraticDistribution ? 'Quadratic Funding' : 'Linear Distribution'}
                       </div>
                     </div>
                   </div>
                 </div>
               </div>

               {/* Admin Management */}
               <div className="bg-white rounded-xl border border-slate-200 p-6">
                 <h3 className="text-lg font-semibold text-slate-800 mb-6">Administrator Management</h3>
                 <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-2">Current Administrator</label>
                     <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                       <Shield className="h-4 w-4 text-blue-600" />
                       <span className="font-mono text-sm text-slate-800">{campaign.admin}</span>
                       <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">Owner</span>
                     </div>
                   </div>
                   
                   <button
                     onClick={() => setShowAdminModal(true)}
                     className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
                   >
                     <UserPlus className="h-4 w-4" />
                     <span>Add Administrator</span>
                   </button>
                 </div>
               </div>

               {/* Fund Distribution */}
               {hasEnded && (
                 <div className="bg-white rounded-xl border border-slate-200 p-6">
                   <h3 className="text-lg font-semibold text-slate-800 mb-6">Fund Distribution</h3>
                   {canDistribute ? (
                     <div className="space-y-4">
                       <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                         <div className="flex items-start">
                           <AlertTriangle className="h-5 w-5 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
                           <div>
                             <p className="font-medium text-amber-800">Ready for Distribution</p>
                             <p className="text-sm text-amber-700 mt-1">
                               The campaign has ended and funds can now be distributed to winning projects.
                               This action cannot be undone.
                             </p>
                           </div>
                         </div>
                       </div>
                       
                       <button
                         onClick={() => setShowDistributeModal(true)}
                         className="px-6 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2"
                       >
                         <Award className="h-4 w-4" />
                         <span>Distribute Funds</span>
                       </button>
                     </div>
                   ) : (
                     <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                       <div className="flex items-start">
                         <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                         <div>
                           <p className="font-medium text-green-800">Funds Distributed</p>
                           <p className="text-sm text-green-700 mt-1">
                             Funds have been successfully distributed to the winning projects.
                           </p>
                         </div>
                       </div>
                     </div>
                   )}
                 </div>
               )}
             </div>
           )}

           {/* Advanced Tab */}
           {activeTab === 'advanced' && (
             <div className="space-y-8">
               {/* Campaign Metadata Management */}
               <div className="bg-white rounded-xl border border-slate-200 p-6">
                 <h3 className="text-lg font-semibold text-slate-800 mb-6">Campaign Metadata Management</h3>
                 <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-2">Main Information</label>
                     <textarea
                       value={mainInfo}
                       onChange={(e) => setMainInfo(e.target.value)}
                       placeholder={campaignDetails?.metadata?.mainInfo || 'Enter main campaign information...'}
                       className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors h-24"
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-2">Additional Information</label>
                     <textarea
                       value={additionalInfo}
                       onChange={(e) => setAdditionalInfo(e.target.value)}
                       placeholder={campaignDetails?.metadata?.additionalInfo || 'Enter additional campaign information...'}
                       className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors h-24"
                     />
                   </div>
                   <button
                     onClick={() => setShowUpdateMetadataModal(true)}
                     className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
                   >
                     <Edit className="h-4 w-4" />
                     <span>Update Metadata</span>
                   </button>
                 </div>
               </div>

               {/* Custom Distribution Management */}
               <div className="bg-white rounded-xl border border-slate-200 p-6">
                 <h3 className="text-lg font-semibold text-slate-800 mb-6">Custom Distribution Management</h3>
                 <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-2">Custom Distribution Data (JSON)</label>
                     <textarea
                       value={customDistributionData}
                       onChange={(e) => setCustomDistributionData(e.target.value)}
                       placeholder={campaignDetails?.metadata?.customDistributionData || 'Enter custom distribution data...'}
                       className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors h-32 font-mono text-sm"
                     />
                   </div>
                   <button
                     onClick={() => setShowCustomDistributionModal(true)}
                     className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
                   >
                     <Settings className="h-4 w-4" />
                     <span>Update Custom Distribution</span>
                   </button>
                 </div>
               </div>

               {/* Advanced Admin Management */}
               <div className="bg-white rounded-xl border border-slate-200 p-6">
                 <h3 className="text-lg font-semibold text-slate-800 mb-6">Advanced Admin Management</h3>
                 <div className="space-y-4">
                   <div className="flex space-x-4">
                     <button
                       onClick={() => setShowAdminModal(true)}
                       className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
                     >
                       <UserPlus className="h-4 w-4" />
                       <span>Add Admin</span>
                     </button>
                     <button
                       onClick={() => setShowRemoveAdminModal(true)}
                       className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
                     >
                       <User className="h-4 w-4" />
                       <span>Remove Admin</span>
                     </button>
                   </div>
                 </div>
               </div>
             </div>
           )}
         </div>
       </div>
     </div>

     {/* Modals */}
     
     {/* Approve Project Confirmation Modal */}
     {confirmApproval.show && (
       <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
         <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
           <div className="flex items-center justify-between mb-6">
             <h3 className="text-xl font-semibold text-slate-800">Confirm Project Approval</h3>
             <button
               onClick={() => setConfirmApproval({ show: false, projectId: null })}
               className="text-slate-400 hover:text-slate-600 transition-colors"
             >
               <XCircle className="h-6 w-6" />
             </button>
           </div>
           
           <p className="text-slate-600 mb-6">
             Are you sure you want to approve this project? Once approved, it will be eligible for voting and funding distribution.
           </p>
           
           <div className="flex space-x-4">
             <button
               onClick={() => {
                 if (confirmApproval.projectId) {
                   handleApproveProject(confirmApproval.projectId);
                 }
               }}
               disabled={isApprovingProject}
               className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
             >
               {isApprovingProject ? (
                 <>
                   <Loader2 className="h-4 w-4 animate-spin" />
                   <span>Approving...</span>
                 </>
               ) : (
                 <>
                   <CheckCircle className="h-4 w-4" />
                   <span>Approve Project</span>
                 </>
               )}
             </button>
             
             <button
               onClick={() => setConfirmApproval({ show: false, projectId: null })}
               className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors duration-200"
             >
               Cancel
             </button>
           </div>
         </div>
       </div>
     )}

     {/* Add Admin Modal */}
     {showAdminModal && (
       <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
         <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
           <div className="flex items-center justify-between mb-6">
             <h3 className="text-xl font-semibold text-slate-800">Add Campaign Administrator</h3>
             <button
               onClick={() => setShowAdminModal(false)}
               className="text-slate-400 hover:text-slate-600 transition-colors"
             >
               <XCircle className="h-6 w-6" />
             </button>
           </div>
           
           <div className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">Administrator Wallet Address</label>
               <input
                 type="text"
                 value={newAdminAddress}
                 onChange={(e) => setNewAdminAddress(e.target.value)}
                 placeholder="0x..."
                 className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
               />
             </div>
             
             <div className="flex space-x-4">
               <button
                 onClick={handleAddAdmin}
                 disabled={isAddingAdmin || !newAdminAddress}
                 className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2"
               >
                 {isAddingAdmin ? (
                   <Loader2 className="h-4 w-4 animate-spin" />
                 ) : (
                   <UserPlus className="h-4 w-4" />
                 )}
                 <span>Add Administrator</span>
               </button>
               
               <button
                 onClick={() => {
                   setShowAdminModal(false);
                   setNewAdminAddress('');
                 }}
                 className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors duration-200"
                 >
                   Cancel
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
  
       {/* Distribute Funds Modal */}
       {showDistributeModal && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-xl font-semibold text-slate-800">Distribute Campaign Funds</h3>
               <button
                 onClick={() => setShowDistributeModal(false)}
                 className="text-slate-400 hover:text-slate-600 transition-colors"
               >
                 <XCircle className="h-6 w-6" />
               </button>
             </div>
             
             <div className="space-y-6">
               {/* Distribution Summary */}
               <div className="bg-slate-50 rounded-lg p-4">
                 <h4 className="font-medium text-slate-800 mb-3">Distribution Summary</h4>
                 <div className="space-y-2 text-sm">
                   <div className="flex justify-between">
                     <span className="text-slate-600">Total Campaign Funds:</span>
                     <span className="font-semibold text-slate-800">{Number(campaign.totalFunds) / 1e18} CELO</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-slate-600">Platform Fee (15%):</span>
                     <span className="font-semibold text-blue-600">
                       -{(Number(campaign.totalFunds) / 1e18 * 0.15).toFixed(2)} CELO
                     </span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-slate-600">Admin Fee ({Number(campaign.adminFeePercentage)}%):</span>
                     <span className="font-semibold text-orange-600">
                       -{(Number(campaign.totalFunds) / 1e18 * Number(campaign.adminFeePercentage) / 100).toFixed(2)} CELO
                     </span>
                   </div>
                   <div className="flex justify-between font-semibold border-t border-slate-200 pt-2">
                     <span className="text-slate-800">Available for Projects:</span>
                     <span className="text-green-600">
                       {(Number(campaign.totalFunds) / 1e18 * (1 - 0.15 - Number(campaign.adminFeePercentage) / 100)).toFixed(2)} CELO
                     </span>
                   </div>
                 </div>
               </div>
               
               {/* Distribution Method Info */}
               <div className="bg-blue-50 rounded-lg p-4">
                 <div className="flex items-start space-x-3">
                   <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                   <div>
                     <p className="font-medium text-blue-800">Distribution Method</p>
                     <p className="text-sm text-blue-700 mt-1">
                       Funds will be distributed using {campaign.useQuadraticDistribution ? 'quadratic funding' : 'linear distribution'} 
                       based on the current vote counts.
                     </p>
                   </div>
                 </div>
               </div>
               
               {/* Warning */}
               <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                 <div className="flex items-start space-x-3">
                   <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                   <div>
                     <p className="font-medium text-amber-800">Important Notice</p>
                     <p className="text-sm text-amber-700 mt-1">
                       This action is irreversible. Funds will be distributed to approved projects based on their vote counts.
                       Please ensure all projects have been properly reviewed and approved.
                     </p>
                   </div>
                 </div>
               </div>
               
               {/* Action Buttons */}
               <div className="flex space-x-4">
                 <button
                   onClick={handleDistributeFunds}
                   disabled={isDistributingFunds}
                   className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 font-medium"
                 >
                   {isDistributingFunds ? (
                     <>
                       <Loader2 className="h-4 w-4 animate-spin" />
                       <span>Distributing...</span>
                     </>
                   ) : (
                     <>
                       <Award className="h-4 w-4" />
                       <span>Distribute Funds</span>
                     </>
                   )}
                 </button>
                 
                 <button
                   onClick={() => setShowDistributeModal(false)}
                   className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors duration-200 font-medium"
                 >
                   Cancel
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
  
       {/* Simulate Distribution Modal */}
       {showSimulateModal && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
           <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl mt-4 sm:mt-8 lg:mt-16 mb-4">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-xl font-semibold text-slate-800 flex items-center">
                 <Calculator className="h-6 w-6 mr-2 text-blue-600" />
                 Distribution Simulator
               </h3>
               <button
                 onClick={() => setShowSimulateModal(false)}
                 className="text-slate-400 hover:text-slate-600 transition-colors"
               >
                 <XCircle className="h-6 w-6" />
               </button>
             </div>
  
             {/* Campaign Status Alert */}
             {!hasEnded && (
               <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                 <div className="flex items-start space-x-3">
                   <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                   <div>
                     <p className="font-medium text-blue-800">Live Simulation</p>
                     <p className="text-sm text-blue-700 mt-1">
                       This campaign is still active. The simulation shows potential distribution based on current votes.
                       Results will change as more votes are cast.
                     </p>
                   </div>
                 </div>
               </div>
             )}
             
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               {/* Campaign Overview */}
               <div className="space-y-6">
                 {/* Fund Breakdown */}
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                   <h4 className="font-medium text-slate-800 mb-4 flex items-center">
                     <DollarSign className="h-4 w-4 mr-2 text-blue-600" />
                     Fund Breakdown
                   </h4>
                   <div className="space-y-3 text-sm">
                     <div className="flex justify-between">
                       <span className="text-slate-600">Total Campaign Funds:</span>
                       <span className="font-semibold text-slate-800">{Number(campaign.totalFunds) / 1e18} CELO</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-slate-600">Platform Fee (15%):</span>
                       <span className="font-semibold text-blue-600">
                         -{(Number(campaign.totalFunds) / 1e18 * 0.15).toFixed(2)} CELO
                       </span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-slate-600">Admin Fee ({Number(campaign.adminFeePercentage)}%):</span>
                       <span className="font-semibold text-orange-600">
                         -{(Number(campaign.totalFunds) / 1e18 * Number(campaign.adminFeePercentage) / 100).toFixed(2)} CELO
                       </span>
                     </div>
                     <div className="border-t border-blue-200 pt-2 flex justify-between font-semibold">
                       <span className="text-slate-800">Available for Projects:</span>
                       <span className="text-green-600">
                         {(Number(campaign.totalFunds) / 1e18 * (1 - 0.15 - Number(campaign.adminFeePercentage) / 100)).toFixed(2)} CELO
                       </span>
                     </div>
                   </div>
                 </div>
  
                 {/* Campaign Statistics */}
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                   <h4 className="font-medium text-slate-800 mb-4 flex items-center">
                     <BarChart3 className="h-4 w-4 mr-2 text-green-600" />
                     Campaign Statistics
                   </h4>
                   <div className="grid grid-cols-2 gap-4 text-sm">
                     <div className="text-center">
                       <div className="text-2xl font-bold text-green-600">{approvedProjects}</div>
                       <div className="text-slate-600">Approved Projects</div>
                     </div>
                     <div className="text-center">
                       <div className="text-2xl font-bold text-blue-600">{totalCampaignVotes.toFixed(1)}</div>
                       <div className="text-slate-600">Total Votes</div>
                     </div>
                   </div>
                 </div>
               </div>
  
               {/* Distribution Methods Comparison */}
               <div className="space-y-6">
                 {/* Linear Distribution Preview */}
                 <div className="bg-white border border-slate-200 rounded-xl p-4">
                   <h4 className="font-medium text-slate-800 mb-4 flex items-center">
                     <Target className="h-4 w-4 mr-2 text-blue-600" />
                     Linear Distribution Preview
                   </h4>
                   <div className="space-y-2 max-h-48 overflow-y-auto">
                     {calculateDistribution(false).slice(0, 5).map((dist, index: number) => (
                       <div key={`linear-preview-${dist.projectId}`} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                         <div className="flex items-center space-x-2">
                           <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                             index === 0 ? 'bg-yellow-100 text-yellow-800' :
                             index === 1 ? 'bg-slate-200 text-slate-800' :
                             index === 2 ? 'bg-orange-100 text-orange-800' :
                             'bg-blue-100 text-blue-800'
                           }`}>
                             {index + 1}
                           </div>
                           <div className="text-sm">
                             <div className="font-medium text-slate-800 truncate max-w-24" title={dist.projectName}>
                               {dist.projectName?.length > 15 ? `${dist.projectName.slice(0, 15)}...` : dist.projectName}
                             </div>
                             <div className="text-xs text-slate-600">{dist.voteCount.toFixed(1)} votes</div>
                           </div>
                         </div>
                         <div className="text-right text-sm">
                           <div className="font-bold text-blue-600">{dist.amount.toFixed(2)} CELO</div>
                           <div className="text-xs text-slate-600">{dist.percentage.toFixed(1)}%</div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
  
                 {/* Quadratic Distribution Preview */}
                 <div className="bg-white border border-slate-200 rounded-xl p-4">
                   <h4 className="font-medium text-slate-800 mb-4 flex items-center">
                     <Zap className="h-4 w-4 mr-2 text-purple-600" />
                     Quadratic Distribution Preview
                   </h4>
                   <div className="space-y-2 max-h-48 overflow-y-auto">
                     {calculateDistribution(true).slice(0, 5).map((dist, index: number) => (
                       <div key={`quadratic-preview-${dist.projectId}`} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                         <div className="flex items-center space-x-2">
                           <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                             index === 0 ? 'bg-yellow-100 text-yellow-800' :
                             index === 1 ? 'bg-slate-200 text-slate-800' :
                             index === 2 ? 'bg-orange-100 text-orange-800' :
                             'bg-blue-100 text-blue-800'
                           }`}>
                             {index + 1}
                           </div>
                           <div className="text-sm">
                             <div className="font-medium text-slate-800 truncate max-w-24" title={dist.projectName}>
                               {dist.projectName?.length > 15 ? `${dist.projectName.slice(0, 15)}...` : dist.projectName}
                             </div>
                             <div className="text-xs text-slate-600">√{dist.weight.toFixed(1)} weight</div>
                           </div>
                         </div>
                         <div className="text-right text-sm">
                           <div className="font-bold text-purple-600">{dist.amount.toFixed(2)} CELO</div>
                           <div className="text-xs text-slate-600">{dist.percentage.toFixed(1)}%</div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               </div>
             </div>
  
             {/* Method Explanation */}
             <div className="mt-8 bg-slate-50 rounded-xl p-6">
               <h4 className="font-medium text-slate-800 mb-4">How Distribution Methods Work</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                 <div className="flex items-start space-x-3">
                   <Target className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                   <div>
                     <div className="font-medium text-slate-800 mb-1">Linear Distribution</div>
                     <div className="text-slate-600">
                       Projects receive funding proportional to their total vote amounts. A project with twice the votes 
                       receives twice the funding share.
                     </div>
                   </div>
                 </div>
                 <div className="flex items-start space-x-3">
                   <Zap className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                   <div>
                     <div className="font-medium text-slate-800 mb-1">Quadratic Distribution</div>
                     <div className="text-slate-600">
                       Vote amounts are square-rooted before distribution calculation, which reduces the influence 
                       of large individual contributions and promotes broader community support.
                     </div>
                   </div>
                 </div>
               </div>
             </div>
  
             {/* Close Button */}
             <div className="mt-8 flex justify-end">
               <button
                 onClick={() => setShowSimulateModal(false)}
                 className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors duration-200"
               >
                 Close Simulator
               </button>
             </div>
           </div>
         </div>
       )}

       {/* Remove Admin Modal */}
       {showRemoveAdminModal && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-xl font-semibold text-slate-800">Remove Campaign Administrator</h3>
               <button
                 onClick={() => setShowRemoveAdminModal(false)}
                 className="text-slate-400 hover:text-slate-600 transition-colors"
               >
                 <XCircle className="h-6 w-6" />
               </button>
             </div>
             
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">Administrator Wallet Address</label>
                 <input
                   type="text"
                   value={removeAdminAddress}
                   onChange={(e) => setRemoveAdminAddress(e.target.value)}
                   placeholder="0x..."
                   className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                 />
               </div>
               
               <div className="flex space-x-4">
                 <button
                   onClick={handleRemoveAdmin}
                   disabled={isRemovingAdmin || !removeAdminAddress}
                   className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2"
                 >
                   {isRemovingAdmin ? (
                     <Loader2 className="h-4 w-4 animate-spin" />
                   ) : (
                     <User className="h-4 w-4" />
                   )}
                   <span>Remove Administrator</span>
                 </button>
                 
                 <button
                   onClick={() => {
                     setShowRemoveAdminModal(false);
                     setRemoveAdminAddress('');
                   }}
                   className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors duration-200"
                 >
                   Cancel
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* Update Metadata Modal */}
       {showUpdateMetadataModal && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-xl font-semibold text-slate-800">Update Campaign Metadata</h3>
               <button
                 onClick={() => setShowUpdateMetadataModal(false)}
                 className="text-slate-400 hover:text-slate-600 transition-colors"
               >
                 <XCircle className="h-6 w-6" />
               </button>
             </div>
             
             <div className="space-y-6">
               <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                 <div className="flex items-start space-x-3">
                   <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                   <div>
                     <p className="font-medium text-blue-800">Metadata Update</p>
                     <p className="text-sm text-blue-700 mt-1">
                       This will update the campaign's main and additional information. Leave fields empty to keep current values.
                     </p>
                   </div>
                 </div>
               </div>
               
               <div className="flex space-x-4">
                 <button
                   onClick={handleUpdateMetadata}
                   disabled={isUpdatingMetadata || (!mainInfo && !additionalInfo)}
                   className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 font-medium"
                 >
                   {isUpdatingMetadata ? (
                     <Loader2 className="h-4 w-4 animate-spin" />
                   ) : (
                     <Edit className="h-4 w-4" />
                   )}
                   <span>Update Metadata</span>
                 </button>
                 
                 <button
                   onClick={() => {
                     setShowUpdateMetadataModal(false);
                     setMainInfo('');
                     setAdditionalInfo('');
                   }}
                   className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors duration-200 font-medium"
                 >
                   Cancel
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* Update Custom Distribution Modal */}
       {showCustomDistributionModal && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-xl font-semibold text-slate-800">Update Custom Distribution</h3>
               <button
                 onClick={() => setShowCustomDistributionModal(false)}
                 className="text-slate-400 hover:text-slate-600 transition-colors"
               >
                 <XCircle className="h-6 w-6" />
               </button>
             </div>
             
             <div className="space-y-6">
               <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                 <div className="flex items-start space-x-3">
                   <Info className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                   <div>
                     <p className="font-medium text-purple-800">Custom Distribution</p>
                     <p className="text-sm text-purple-700 mt-1">
                       This allows you to set custom distribution rules for the campaign. Use JSON format for structured data.
                     </p>
                   </div>
                 </div>
               </div>
               
               <div className="flex space-x-4">
                 <button
                   onClick={handleUpdateCustomDistribution}
                   disabled={isUpdatingCustomDistribution}
                   className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 font-medium"
                 >
                   {isUpdatingCustomDistribution ? (
                     <Loader2 className="h-4 w-4 animate-spin" />
                   ) : (
                     <Settings className="h-4 w-4" />
                   )}
                   <span>Update Custom Distribution</span>
                 </button>
                 
                 <button
                   onClick={() => {
                     setShowCustomDistributionModal(false);
                     setCustomDistributionData('');
                   }}
                   className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors duration-200 font-medium"
                 >
                   Cancel
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* Create Pool Modal */}
       {showCreatePoolModal && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-xl font-semibold text-slate-800">
                 Create {poolType === 'universal' ? 'Universal' : 'ERC20'} Pool
               </h3>
               <button
                 onClick={() => {
                   setShowCreatePoolModal(false);
                   resetPoolForm();
                 }}
                 className="text-slate-400 hover:text-slate-600 transition-colors"
               >
                 <XCircle className="h-6 w-6" />
               </button>
             </div>

             <div className="space-y-6">
               {/* Pool Type Selection */}
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-3">
                   Pool Type
                 </label>
                 <div className="grid grid-cols-2 gap-3">
                   <button
                     onClick={() => setPoolType('universal')}
                     className={`p-4 rounded-lg border-2 transition-colors ${
                       poolType === 'universal'
                         ? 'border-primary bg-primary/10 text-primary'
                         : 'border-slate-200 hover:border-slate-300'
                     }`}
                   >
                     <div className="text-center">
                       <Trophy className="h-8 w-8 mx-auto mb-2" />
                       <div className="font-medium">Universal</div>
                       <div className="text-xs text-slate-600 mt-1">Accepts any token</div>
                     </div>
                   </button>
                   
                   <button
                     onClick={() => setPoolType('erc20')}
                     className={`p-4 rounded-lg border-2 transition-colors ${
                       poolType === 'erc20'
                         ? 'border-primary bg-primary/10 text-primary'
                         : 'border-slate-200 hover:border-slate-300'
                     }`}
                   >
                     <div className="text-center">
                       <Database className="h-8 w-8 mx-auto mb-2" />
                       <div className="font-medium">ERC20 Specific</div>
                       <div className="text-xs text-slate-600 mt-1">Custom token list</div>
                     </div>
                   </button>
                 </div>
               </div>

               {/* Pool Name */}
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">
                   Pool Name
                 </label>
                 <input
                   type="text"
                   value={poolName}
                   onChange={(e) => setPoolName(e.target.value)}
                   placeholder="Enter pool name..."
                   className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                 />
               </div>

               {/* Pool Description */}
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">
                   Pool Description
                 </label>
                 <textarea
                   value={poolDescription}
                   onChange={(e) => setPoolDescription(e.target.value)}
                   placeholder="Describe the purpose and details of this pool..."
                   className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary h-24"
                 />
               </div>

               {/* ERC20 Token Addresses */}
               {poolType === 'erc20' && (
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-2">
                     Token Addresses (0x...)
                   </label>
                   <div className="space-y-2">
                     <div className="flex items-center space-x-2">
                       <input
                         type="text"
                         placeholder="Enter token address (0x...)"
                         className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                         onKeyPress={(e) => {
                           if (e.key === 'Enter') {
                             const value = e.currentTarget.value;
                             if (value && !selectedTokens.includes(value)) {
                               setSelectedTokens([...selectedTokens, value]);
                               e.currentTarget.value = '';
                             }
                           }
                         }}
                       />
                       <button
                         type="button"
                         onClick={() => {
                           const input = document.querySelector('input[placeholder="Enter token address (0x...)"]') as HTMLInputElement;
                           const value = input?.value;
                           if (value && !selectedTokens.includes(value)) {
                             setSelectedTokens([...selectedTokens, value]);
                             input.value = '';
                           }
                         }}
                         className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                       >
                         Add
                       </button>
                     </div>
                     {selectedTokens.length > 0 && (
                       <div className="space-y-1">
                         {selectedTokens.map((token, index: number) => (
                           <div key={index} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg">
                             <span className="text-sm font-mono text-slate-600">{token}</span>
                             <button
                               onClick={() => setSelectedTokens(selectedTokens.filter((_, i) => i !== index))}
                               className="text-red-500 hover:text-red-700"
                             >
                               <XCircle className="h-4 w-4" />
                             </button>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                 </div>
               )}

               <div className="flex space-x-4">
                 <button
                   onClick={poolType === 'universal' ? handleCreateUniversalPool : handleCreateERC20Pool}
                   disabled={
                     (poolType === 'universal' ? isCreatingUniversal : isCreatingERC20) ||
                     !poolName.trim() ||
                     !poolDescription.trim() ||
                     (poolType === 'erc20' && selectedTokens.length === 0)
                   }
                   className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 font-medium"
                 >
                   {(poolType === 'universal' ? isCreatingUniversal : isCreatingERC20) ? (
                     <Loader2 className="h-4 w-4 animate-spin" />
                   ) : (
                     <Database className="h-4 w-4" />
                   )}
                   <span>
                     {(poolType === 'universal' ? isCreatingUniversal : isCreatingERC20) 
                       ? 'Creating...' 
                       : `Create ${poolType === 'universal' ? 'Universal' : 'ERC20'} Pool`
                     }
                   </span>
                 </button>
                 
                 <button
                   onClick={() => {
                     setShowCreatePoolModal(false);
                     resetPoolForm();
                   }}
                   className="px-6 py-3 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg transition-colors duration-200 font-medium"
                 >
                   Cancel
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

      {/* Fund/Donate Modal */}
      <FundDonateModal
        isOpen={showFundPoolModal}
        onClose={() => { setShowFundPoolModal(false); resetFundPoolForm(); }}
        title="Fund Pool"
        isSubmitting={isFunding}
        onConfirm={async (token, amount) => {
          if (campaignPoolId === undefined || campaignPoolId === 0n) return;
          // Force msg.value to amount for testing visibility in wallet/explorer
          const isCelo = token === '0x0000000000000000000000000000000000000000';
          const res = await fundPool(campaignPoolId, token, amount, isCelo ? amount : 0n);
          // Auto-close modal after success
          setShowFundPoolModal(false);
          resetFundPoolForm();
          return res as any;
        }}
      />

       {/* Donate to Pool Modal */}
       {showDonateModal && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-xl font-semibold text-slate-800">Donate to Pool</h3>
               <button
                 onClick={() => {
                   setShowDonateModal(false);
                   resetDonateForm();
                 }}
                 className="text-slate-400 hover:text-slate-600 transition-colors"
               >
                 <XCircle className="h-6 w-6" />
               </button>
             </div>

             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">
                   Amount (CELO)
                 </label>
                 <input
                   type="number"
                   step="0.0001"
                   value={donateAmount}
                   onChange={(e) => setDonateAmount(e.target.value)}
                   placeholder="0.0"
                   className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                 />
               </div>

               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">
                   Message (Optional)
                 </label>
                 <textarea
                   value={donateMessage}
                   onChange={(e) => setDonateMessage(e.target.value)}
                   placeholder="Leave a message with your donation..."
                   className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary h-20"
                 />
               </div>

               <div className="flex space-x-4">
                 <button
                   onClick={handleDonateToPool}
                   disabled={isDonating || !donateAmount}
                   className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 font-medium"
                 >
                   {isDonating ? (
                     <Loader2 className="h-4 w-4 animate-spin" />
                   ) : (
                     <UserPlus className="h-4 w-4" />
                   )}
                   <span>{isDonating ? 'Donating...' : 'Donate'}</span>
                 </button>
                 
                 <button
                   onClick={() => {
                     setShowDonateModal(false);
                     resetDonateForm();
                   }}
                   className="px-6 py-3 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg transition-colors duration-200 font-medium"
                 >
                   Cancel
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* Update Metadata Modal */}
       {showUpdateMetadataModal && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-xl font-semibold text-slate-800">Update Pool Info</h3>
               <button
                 onClick={() => {
                   setShowUpdateMetadataModal(false);
                   resetPoolForm();
                 }}
                 className="text-slate-400 hover:text-slate-600 transition-colors"
               >
                 <XCircle className="h-6 w-6" />
               </button>
             </div>

             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">
                   Pool Name
                 </label>
                 <input
                   type="text"
                   value={poolName}
                   onChange={(e) => setPoolName(e.target.value)}
                   placeholder="Enter pool name..."
                   className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                 />
               </div>

               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">
                   Pool Description
                 </label>
                 <textarea
                   value={poolDescription}
                   onChange={(e) => setPoolDescription(e.target.value)}
                   placeholder="Describe the purpose and details of this pool..."
                   className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary h-24"
                 />
               </div>

               <div className="flex space-x-4">
                 <button
                   onClick={handleUpdatePoolMetadata}
                   disabled={isUpdatingPoolMetadata || !poolName.trim()}
                   className="flex-1 px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 font-medium"
                 >
                   {isUpdatingPoolMetadata ? (
                     <Loader2 className="h-4 w-4 animate-spin" />
                   ) : (
                     <Edit className="h-4 w-4" />
                   )}
                   <span>{isUpdatingPoolMetadata ? 'Updating...' : 'Update Info'}</span>
                 </button>
                 
                 <button
                   onClick={() => {
                     setShowUpdateMetadataModal(false);
                     resetPoolForm();
                   }}
                   className="px-6 py-3 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg transition-colors duration-200 font-medium"
                 >
                   Cancel
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* Manual Distribute Modal */}
       {showManualDistributeModal && hasPool && (
         <ManualDistributeModal
           isOpen={showManualDistributeModal}
           onClose={() => setShowManualDistributeModal(false)}
           poolId={campaignPoolId}
           campaignId={campaignId}
           projectIds={campaignProjects.map(p => p.project.id)}
         />
       )}
     </div>
   );
 }