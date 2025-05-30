'use client';

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAccount, useReadContracts } from 'wagmi';
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
  Users,
  UserPlus,
  Settings,
  ListChecks,
  User,
  Sparkles,
  TrendingUp,
  RotateCcw,
  Calculator,
  Play,
  DollarSign,
  Percent,
  Target,
  Zap,
  Crown,
  Trophy,
  Medal,
  Info
} from 'lucide-react';

import { 
  useCampaignDetails, 
  useApproveProject, 
  useAddCampaignAdmin, 
  useDistributeFunds,
  useIsCampaignAdmin,
  useSortedProjects,
  useParticipation 
} from '@/hooks/useCampaignMethods';

import { 
  useAllProjects, 
  formatProjectForDisplay 
} from '@/hooks/useProjectMethods';

import { contractABI as abi } from '@/abi/seas4ABI';
import { Abi } from 'viem';
import { formatEther } from 'viem';

// Custom hook for project participations with better error handling
const useProjectParticipations = (
  contractAddress: `0x${string}`,
  campaignId: bigint,
  projectIds: number[]
) => {
  const participationContracts = projectIds.map(projectId => ({
    address: contractAddress,
    abi,
    functionName: 'getParticipation',
    args: [campaignId, BigInt(projectId)]
  }));

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: participationContracts as unknown as readonly {
      address: `0x${string}`
      abi: Abi
      functionName: string
      args: readonly [bigint, bigint]
    }[],
    query: {
      enabled: !!contractAddress && !!campaignId && projectIds.length > 0,
      staleTime: 0,
      retry: 3,
      retryDelay: 1000
    }
  });

  const participations: Record<number, {
    approved: boolean;
    voteCount: bigint;
    fundsReceived: bigint;
  }> = {};
  
  if (data) {
    projectIds.forEach((projectId, index) => {
      if (data[index]?.result && !data[index]?.error) {
        const result = data[index].result as any[];
        participations[projectId] = {
          approved: result[0],
          voteCount: result[1],
          fundsReceived: result[2]
        };
      } else if (data[index]?.error) {
        console.error(`Error fetching participation for project ${projectId}:`, data[index].error);
      }
    });
  }

  return { participations, isLoading, error, refetch };
};

// Add ProjectVotes component
function ProjectVotes({ 
  campaignId, 
  projectId, 
  onVoteCountReceived 
}: { 
  campaignId: bigint; 
  projectId: bigint; 
  onVoteCountReceived?: (projectId: string, voteCount: bigint) => void;
}) {
  const contractAddress = import.meta.env.VITE_CONTRACT_V4;

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
    return <span className="text-sm text-gray-500">Loading...</span>;
  }

  if (error || !participation) {
    return <span className="text-sm text-red-500">0.0 votes</span>;
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
    return <span className="text-sm font-medium text-purple-600">{formattedVotes} votes</span>;
  } catch (error) {
    return <span className="text-sm text-red-500">0.0 votes</span>;
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
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [confirmApproval, setConfirmApproval] = useState<{ show: boolean; projectId: bigint | null }>({ show: false, projectId: null });
  
  const contractAddress = import.meta.env.VITE_CONTRACT_V4;
  const campaignId = id ? BigInt(id as string) : BigInt(0);
  
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

  const approvedProjectIds = new Set(sortedProjectIds.map(id => id.toString()));
  
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

  const [projectVoteCounts, setProjectVoteCounts] = useState<Map<string, bigint>>(new Map());

  // Add vote count update callback
  const updateProjectVoteCount = useCallback((projectId: string, voteCount: bigint) => {
    setProjectVoteCounts(prev => {
      const newMap = new Map(prev);
      newMap.set(projectId, voteCount);
      return newMap;
    });
  }, []);

  // Calculate totalCampaignVotes before using it in useEffect
  const totalCampaignVotes = Array.from(projectVoteCounts.values()).reduce((sum, voteCount) => 
    sum + Number(formatEther(voteCount)), 0
  );

  // Add debug useEffect
  useEffect(() => {
    console.log('Current project vote counts:', Object.fromEntries(projectVoteCounts));
    console.log('Total campaign votes:', totalCampaignVotes);
  }, [projectVoteCounts, totalCampaignVotes]);

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

  const campaignProjects = allProjects?.filter(projectDetails => {
    return projectDetails.project.campaignIds.some(cId => Number(cId) === Number(campaignId));
  }) || [];

  const projectIds = campaignProjects.map(p => Number(formatProjectForDisplay(p)?.id)).filter(Boolean);
  const { participations, isLoading: participationsLoading, refetch: refetchParticipations } = useProjectParticipations(
    contractAddress,
    campaignId,
    projectIds
  );

  const filteredProjects = campaignProjects.filter(projectDetails => {
    const project = formatProjectForDisplay(projectDetails);
    if (!project) return false;
    
    const isApproved = approvedProjectIds.has(project.id.toString());
    
    if (projectFilter === 'pending') return !isApproved;
    if (projectFilter === 'approved') return isApproved;
    return true;
  });

  const totalProjects = campaignProjects.length;
  const approvedProjects = campaignProjects.filter(p => {
    const project = formatProjectForDisplay(p);
    return project && approvedProjectIds.has(project.id.toString());
  }).length;
  const pendingProjects = totalProjects - approvedProjects;

  const refetchAllData = () => {
    setProjectVoteCounts(new Map());
    refetchParticipations();
    refetchSorted();
  };

  // Update calculateDistribution function
  const calculateDistribution = (useQuadratic = false) => {
    // Get all approved projects (including those with 0 votes)
    const allApprovedProjects = campaignProjects.filter(p => {
      const project = formatProjectForDisplay(p);
      if (!project) return false;
      return approvedProjectIds.has(project.id.toString());
    });

    if (allApprovedProjects.length === 0) return [];

    const totalFunds = Number(campaignDetails?.campaign?.totalFunds || 0n) / 1e18;
    const adminFeePercentage = Number(campaignDetails?.campaign?.adminFeePercentage || 0n);
    
    // Include Seas platform fee (15%) + admin fee
    const seasPlatformFee = 15; // 15% platform fee
    const seasFeeAmount = (totalFunds * seasPlatformFee) / 100;
    const adminFeeAmount = (totalFunds * adminFeePercentage) / 100;
    const availableForProjects = totalFunds - seasFeeAmount - adminFeeAmount;

    // Use actual vote counts from state instead of participation data
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
  };

  const handleApproveProject = async (projectId: bigint) => {
    console.log('Starting approval process for project:', projectId.toString());
    
    if (!isConnected || !address) {
      setStatusMessage({ text: 'Please connect your wallet to approve projects', type: 'error' });
      return;
    }

    if (!isAdmin) {
      setStatusMessage({ text: 'Only campaign admins can approve projects', type: 'error' });
      return;
    }

    try {
      console.log('Calling approveProject function...');
      setStatusMessage({ text: 'Approval transaction initiated...', type: 'info' });
      
      const result = await approveProject({
        campaignId,
        projectId
      });
      
      console.log('Approval transaction result:', result);
      setStatusMessage({ text: 'Project approved successfully! Transaction submitted.', type: 'success' });
      setConfirmApproval({ show: false, projectId: null });
      
      setTimeout(() => {
        console.log('Refetching data after approval...');
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

  if (!isMounted) return null;

  if (campaignLoading || projectsLoading || participationsLoading || sortedLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-200 rounded-full animate-spin border-t-purple-500"></div>
            <Sparkles className="h-6 w-6 text-purple-500 absolute inset-0 m-auto animate-pulse" />
          </div>
          <p className="text-lg text-purple-600 font-medium">Loading campaign management...</p>
        </div>
      </div>
    );
  }

  if (campaignError || !campaignDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Campaign Not Found</h1>
          <p className="text-gray-600 mb-6">The campaign you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/explore')}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            Browse Campaigns
          </button>
        </div>
      </div>
    );
  }

  if (!isConnected || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <Shield className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You need to be a campaign admin to access this page.</p>
          <button
            onClick={() => navigate(`/explore/campaign/${id}`)}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Enhanced floating background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-r from-purple-400/10 to-indigo-400/10 animate-pulse blur-3xl"></div>
        <div className="absolute top-1/2 right-1/5 w-80 h-80 rounded-full bg-gradient-to-r from-pink-400/10 to-purple-400/10 animate-pulse blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-56 h-56 rounded-full bg-gradient-to-r from-indigo-400/10 to-blue-400/10 animate-pulse blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/explore/campaign/${id}`)}
              className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm text-gray-700 hover:text-purple-600 rounded-full transition-all hover:bg-white shadow-lg border border-purple-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaign
            </button>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-purple-500" />
              <span className="text-lg font-semibold text-gray-800">Campaign Management</span>
            </div>
            
            <button
              onClick={refetchAllData}
              disabled={participationsLoading || sortedLoading}
              className="p-2 bg-white/90 backdrop-blur-sm rounded-full border border-purple-100 hover:shadow-lg transition-all flex items-center space-x-2"
            >
              <RotateCcw className={`h-4 w-4 text-purple-600 ${(participationsLoading || sortedLoading) ? 'animate-spin' : ''}`} />
              <span className="text-sm text-purple-600 hidden sm:inline">
                {(participationsLoading || sortedLoading) ? 'Refreshing...' : 'Refresh'}
              </span>
            </button>
          </div>
        </div>

        {/* Enhanced Campaign Info Header */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-purple-100 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  {campaign.name}
                </h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  hasEnded ? 'bg-gray-100 text-gray-700' : hasStarted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  <Clock className="h-3 w-3 mr-1 inline" />
                  {hasEnded ? 'Ended' : hasStarted ? 'Active' : 'Upcoming'}
                </span>
              </div>
              <p className="text-gray-600 mb-3">{campaign.description}</p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                  <Users className="h-3 w-3 mr-1" />
                  {approvedProjects} Approved / {pendingProjects} Pending
                </span>
                <span className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-medium rounded-full">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {Number(campaign.totalFunds) / 1e18} CELO
                </span>
              </div>
            </div>
            
            <div className="mt-4 md:mt-0 flex flex-col space-y-2">
              {/* Simulate Distribution Button - Always visible */}
              <button
                onClick={() => setShowSimulateModal(true)}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Simulate Distribution
              </button>
              
              {/* Actual Distribution Button - Only if campaign has ended */}
              {canDistribute && (
                <button
                  onClick={() => setShowDistributeModal(true)}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center"
                >
                  <Award className="h-4 w-4 mr-2" />
                  Distribute Funds
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage.text && (
          <div className={`mb-6 p-4 rounded-xl shadow-lg ${
            statusMessage.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : statusMessage.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-blue-50 border border-blue-200 text-blue-700'
          }`}>
            <div className="flex items-start">
              {statusMessage.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
              )}
              <p>{statusMessage.text}</p>
            </div>
          </div>
        )}

        {/* Enhanced Tabs */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-100 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-4 px-6 text-sm font-medium transition-all duration-300 ${
                activeTab === 'overview' 
                  ? 'text-purple-600 border-b-2 border-purple-500 bg-purple-50' 
                  : 'text-gray-600 hover:text-purple-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                Overview
              </div>
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`flex-1 py-4 px-6 text-sm font-medium transition-all duration-300 ${
                activeTab === 'projects' 
                  ? 'text-purple-600 border-b-2 border-purple-500 bg-purple-50' 
                  : 'text-gray-600 hover:text-purple-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center">
                <ListChecks className="h-4 w-4 mr-2" />
                Projects ({totalProjects})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('simulation')}
              className={`flex-1 py-4 px-6 text-sm font-medium transition-all duration-300 ${
                activeTab === 'simulation' 
                  ? 'text-purple-600 border-b-2 border-purple-500 bg-purple-50' 
                  : 'text-gray-600 hover:text-purple-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center">
                <Calculator className="h-4 w-4 mr-2" />
                Distribution Simulator
              </div>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-4 px-6 text-sm font-medium transition-all duration-300 ${
                activeTab === 'settings' 
                  ? 'text-purple-600 border-b-2 border-purple-500 bg-purple-50' 
                  : 'text-gray-600 hover:text-purple-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </div>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-lg border border-purple-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Campaign Stats</h3>
                    <BarChart3 className="h-5 w-5 text-purple-500" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Projects:</span>
                      <span className="font-semibold">{totalProjects}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pending:</span>
                      <span className="font-semibold text-amber-600">{pendingProjects}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Approved:</span>
                      <span className="font-semibold text-green-600">{approvedProjects}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Funds:</span>
                      <span className="font-semibold text-purple-600">{Number(campaign.totalFunds) / 1e18} CELO</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-lg border border-purple-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Vote Statistics</h3>
                    <Trophy className="h-5 w-5 text-purple-500" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Votes Cast:</span>
                      <span className="font-semibold text-purple-600">{totalCampaignVotes.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Projects with Votes:</span>
                      <span className="font-semibold text-green-600">
                        {Array.from(projectVoteCounts.values()).filter(votes => Number(votes) > 0).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Highest Vote Count:</span>
                      <span className="font-semibold text-blue-600">
                        {Math.max(...Array.from(projectVoteCounts.values()).map(v => Number(formatEther(v)))).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-lg border border-purple-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Timeline</h3>
                    <Calendar className="h-5 w-5 text-purple-500" />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-600 text-sm">Start Date:</span>
                      <p className="font-semibold">{new Date(startTime * 1000).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 text-sm">End Date:</span>
                      <p className="font-semibold">{new Date(endTime * 1000).toLocaleString()}</p>
                    </div>
                    <div className="pt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full transition-all duration-300" 
                          style={{ 
                            width: hasEnded ? '100%' : hasStarted ? `${Math.min(100, ((now - startTime) / (endTime - startTime)) * 100)}%` : '0%'
                          }}
                        ></div>
                      </div>
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
                  <h3 className="text-lg font-semibold text-gray-800">Project Management</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setProjectFilter('all')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        projectFilter === 'all' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      All ({totalProjects})
                    </button>
                    <button
                      onClick={() => setProjectFilter('pending')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        projectFilter === 'pending' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Pending ({pendingProjects})
                    </button>
                    <button
                      onClick={() => setProjectFilter('approved')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        projectFilter === 'approved' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Approved ({approvedProjects})
                    </button>
                  </div>
                </div>

                {/* Projects List */}
                <div className="space-y-4">
                  {filteredProjects.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No {projectFilter !== 'all' ? projectFilter : ''} projects found.</p>
                    </div>
                  ) : (
                    filteredProjects.map((projectDetails) => {
                      const project = formatProjectForDisplay(projectDetails);
                      if (!project) return null;

                      const isApproved = approvedProjectIds.has(project.id.toString());
                      const voteCount = projectVoteCounts.get(project.id.toString()) || 0n;

                      return (
                        <div key={project.id} className="bg-white rounded-xl p-6 shadow-lg border border-purple-100 hover:shadow-xl transition-all duration-300">
                          <div className="flex flex-col md:flex-row md:items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="text-lg font-semibold text-gray-800">{project.name}</h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  isApproved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {isApproved ? (
                                    <div className="flex items-center space-x-1">
                                      <CheckCircle className="h-3 w-3" />
                                      <span>Approved</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-1">
                                      <Clock className="h-3 w-3" />
                                      <span>Pending</span>
                                    </div>
                                  )}
                                </span>
                              </div>
                              <p className="text-gray-600 mb-3">{project.description}</p>
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span className="flex items-center">
                                  <User className="h-3 w-3 mr-1" />
                                  {project.owner.slice(0, 6)}...{project.owner.slice(-4)}
                                </span>
                                {project.additionalDataParsed?.githubRepo && (
                                  <a 
                                    href={project.additionalDataParsed.githubRepo} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center text-purple-600 hover:text-purple-700"
                                  >
                                    <Github className="h-3 w-3 mr-1" />
                                    GitHub
                                  </a>
                                )}
                                {project.additionalDataParsed?.website && (
                                  <a 
                                    href={project.additionalDataParsed.website} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center text-purple-600 hover:text-purple-700"
                                  >
                                    <Globe className="h-3 w-3 mr-1" />
                                    Website
                                  </a>
                                )}
                                {voteCount > 0 && (
                                  <span className="flex items-center text-indigo-600">
                                    <Award className="h-3 w-3 mr-1" />
                                    <ProjectVotes 
                                      campaignId={campaignId} 
                                      projectId={BigInt(project.id)} 
                                      onVoteCountReceived={updateProjectVoteCount}
                                    />
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3 mt-4 md:mt-0">
                              <button
                                onClick={() => navigate(`/explore/project/${project.id}`)}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors flex items-center"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </button>
                              
                              {!isApproved && (
                                <button
                                  onClick={() => {
                                    console.log('Approve button clicked for project:', project.id);
                                    setConfirmApproval({ show: true, projectId: BigInt(project.id) });
                                  }}
                                  disabled={isApprovingProject}
                                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isApprovingProject ? (
                                    <>
                                      <Loader2 className="h-4 animate-spin mr-2" />
                                      <span>Approving...</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      <span>Approve</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* NEW: Distribution Simulation Tab */}
            {activeTab === 'simulation' && (
              <div className="space-y-6">
                {/* Alert if campaign hasn't ended */}
                {!hasEnded && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-start">
                      <AlertTriangle className="h-5 w-5 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800">Demo Distribution Preview</p>
                        <p className="text-sm text-amber-700 mt-1">
                          This campaign is still active. The distribution shown below is a simulation based on current votes.
                          Actual distribution will occur after the campaign ends.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-xl p-6 shadow-lg border border-purple-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-800">Distribution Simulator</h3>
                    <Calculator className="h-6 w-6 text-purple-500" />
                  </div>

                  {/* Distribution Method Selection */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Distribution Method</h4>
                    <div className="flex space-x-4">
                      <div className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        !campaign.useQuadraticDistribution 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <div className="flex items-center space-x-2">
                          <Target className="h-5 w-5 text-purple-500" />
                          <span className="font-medium">Linear Distribution</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Proportional to vote amounts</p>
                      </div>
                      <div className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        campaign.useQuadraticDistribution 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <div className="flex items-center space-x-2">
                          <Zap className="h-5 w-5 text-purple-500" />
                          <span className="font-medium">Quadratic Distribution</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Square root of vote amounts</p>
                      </div>
                    </div>
                  </div>

                  {/* Fee Breakdown */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-3">Fee Breakdown</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Campaign Funds:</span>
                        <span className="font-medium">{Number(campaign.totalFunds) / 1e18} CELO</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Seas Platform Fee (15%):</span>
                        <span className="font-medium text-blue-600">
                          -{(Number(campaign.totalFunds) / 1e18 * 0.15).toFixed(2)} CELO
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Admin Fee ({Number(campaign.adminFeePercentage)}%):</span>
                        <span className="font-medium text-orange-600">
                          -{(Number(campaign.totalFunds) / 1e18 * Number(campaign.adminFeePercentage) / 100).toFixed(2)} CELO
                        </span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-medium">
                        <span className="text-gray-800">Available for Projects:</span>
                        <span className="text-green-600">
                          {(Number(campaign.totalFunds) / 1e18 * (1 - 0.15 - Number(campaign.adminFeePercentage) / 100)).toFixed(2)} CELO
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Distribution Results */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-800">Projected Distribution - All Approved Projects</h4>
                    
                    {/* Linear Distribution */}
                    <div className="mb-6">
                      <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                        <Target className="h-4 w-4 mr-2" />
                        Linear Distribution
                      </h5>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {calculateDistribution(false)
                          .filter((dist): dist is NonNullable<typeof dist> => dist !== null)
                          .map((dist, index) => (
                          <div key={`linear-${dist.projectId}`} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                index === 0 && dist.amount > 0 ? 'bg-yellow-100 text-yellow-800' :
                                index === 1 && dist.amount > 0 ? 'bg-gray-100 text-gray-800' :
                                index === 2 && dist.amount > 0 ? 'bg-orange-100 text-orange-800' :
                                dist.amount > 0 ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-50 text-gray-400'
                              }`}>
                                {dist.amount > 0 ? (
                                  index === 0 ? <Crown className="h-4 w-4" /> :
                                  index === 1 ? <Trophy className="h-4 w-4" /> :
                                  index === 2 ? <Medal className="h-4 w-4" /> :
                                  index + 1
                                ) : '-'}
                              </div>
                              <div>
                                <div className="font-medium text-gray-800">{dist.projectName}</div>
                                <div className="text-sm text-gray-600">{dist.voteCount.toFixed(1)} votes</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold ${dist.amount > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                                {dist.amount > 0 ? `${dist.amount.toFixed(2)} CELO` : 'No funding'}
                              </div>
                              <div className="text-sm text-gray-600">
                                {dist.amount > 0 ? `${dist.percentage.toFixed(1)}%` : '0%'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quadratic Distribution */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                        <Zap className="h-4 w-4 mr-2" />
                        Quadratic Distribution
                      </h5>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {calculateDistribution(true)
                          .filter((dist): dist is NonNullable<typeof dist> => dist !== null)
                          .map((dist, index) => (
                          <div key={`quadratic-${dist.projectId}`} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                index === 0 && dist.amount > 0 ? 'bg-yellow-100 text-yellow-800' :
                                index === 1 && dist.amount > 0 ? 'bg-gray-100 text-gray-800' :
                                index === 2 && dist.amount > 0 ? 'bg-orange-100 text-orange-800' :
                                dist.amount > 0 ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-50 text-gray-400'
                              }`}>
                                {dist.amount > 0 ? (
                                  index === 0 ? <Crown className="h-4 w-4" /> :
                                  index === 1 ? <Trophy className="h-4 w-4" /> :
                                  index === 2 ? <Medal className="h-4 w-4" /> :
                                  index + 1
                                ) : '-'}
                              </div>
                              <div>
                                <div className="font-medium text-gray-800">{dist.projectName}</div>
                                <div className="text-sm text-gray-600">
                                  {dist.voteCount.toFixed(1)} votes {dist.amount > 0 ? `(√${dist.weight.toFixed(2)} weight)` : ''}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold ${dist.amount > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                                {dist.amount > 0 ? `${dist.amount.toFixed(2)} CELO` : 'No funding'}
                              </div>
                              <div className="text-sm text-gray-600">
                                {dist.amount > 0 ? `${dist.percentage.toFixed(1)}%` : '0%'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 shadow-lg border border-purple-100">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Campaign Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name</label>
                      <p className="text-gray-900">{campaign.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Admin Fee</label>
                      <p className="text-gray-900">{Number(campaign.adminFeePercentage)}%</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Winners</label>
                      <p className="text-gray-900">{Number(campaign.maxWinners) || 'Unlimited'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Distribution Method</label>
                      <p className="text-gray-900">{campaign.useQuadraticDistribution ? 'Quadratic' : 'Linear'}</p>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <button
                      onClick={() => navigate(`/explore/campaign/${id}/edit`)}
                      className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Campaign
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-lg border border-purple-100">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Admin Management</h3>
                  <p className="text-gray-600 mb-4">Add additional administrators to help manage this campaign.</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Current Admin</label>
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Shield className="h-4 w-4 text-purple-500" />
                        <span className="font-mono text-sm">{campaign.admin}</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Owner</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setShowAdminModal(true)}
                      className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add New Admin
                    </button>
                  </div>
                </div>

                {hasEnded && (
                  <div className="bg-white rounded-xl p-6 shadow-lg border border-purple-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Fund Distribution</h3>
                    {canDistribute ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                          <div className="flex items-start">
                            <AlertTriangle className="h-5 w-5 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-amber-800">Ready to Distribute</p>
                              <p className="text-sm text-amber-700 mt-1">
                                The campaign has ended and funds can now be distributed to winning projects.
                                This action cannot be undone.
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => setShowDistributeModal(true)}
                          className="px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center"
                        >
                          <Award className="h-4 w-4 mr-2" />
                          Distribute Funds Now
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
          </div>
        </div>
      </div>

      {/* Enhanced Modals */}
      
      {/* Approve Project Confirmation Modal */}
      {confirmApproval.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Confirm Approval</h3>
              <button
                onClick={() => setConfirmApproval({ show: false, projectId: null })}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to approve this project? Once approved, it will be visible to voters and eligible for funding.
            </p>
            
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  console.log('Confirm approval clicked');
                  if (confirmApproval.projectId) {
                    handleApproveProject(confirmApproval.projectId);
                  }
                }}
                disabled={isApprovingProject}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isApprovingProject ? (
                  <>
                    <Loader2 className="h-4 animate-spin mr-2" />
                    <span>Approving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span>Approve Project</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => setConfirmApproval({ show: false, projectId: null })}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Add Campaign Admin</h3>
              <button
                onClick={() => setShowAdminModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin Wallet Address</label>
                <input
                  type="text"
                  value={newAdminAddress}
                  onChange={(e) => setNewAdminAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                />
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={handleAddAdmin}
                  disabled={isAddingAdmin || !newAdminAddress}
                  className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {isAddingAdmin ? (
                    <Loader2 className="h-4 animate-spin mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  Add Admin
                </button>
                
                <button
                  onClick={() => {
                    setShowAdminModal(false);
                    setNewAdminAddress('');
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Distribute Funds Modal */}
      {showDistributeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Distribute Campaign Funds</h3>
              <button
                onClick={() => setShowDistributeModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-3">Distribution Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Funds:</span>
                    <span className="font-medium">{Number(campaign.totalFunds) / 1e18} CELO</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Seas Platform Fee (15%):</span>
                    <span className="font-medium">{(Number(campaign.totalFunds) / 1e18 * 0.15).toFixed(2)} CELO</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Admin Fee ({Number(campaign.adminFeePercentage)}%):</span>
                    <span className="font-medium">{(Number(campaign.totalFunds) / 1e18 * Number(campaign.adminFeePercentage) / 100).toFixed(2)} CELO</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-2">
                    <span className="text-gray-800">To Projects:</span>
                    <span className="text-green-600">{(Number(campaign.totalFunds) / 1e18 * (1 - 0.15 - Number(campaign.adminFeePercentage) / 100)).toFixed(2)} CELO</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 mb-1">Warning</p>
                    <p className="text-sm text-amber-700">
                      This action is irreversible. Funds will be distributed to winning projects based on their vote counts.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={handleDistributeFunds}
                  disabled={isDistributingFunds}
                  className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {isDistributingFunds ? (
                    <Loader2 className="h-4 animate-spin mr-2" />
                  ) : (
                    <Award className="h-4 w-4 mr-2" />
                  )}
                  Distribute Now
                </button>
                
                <button
                  onClick={() => setShowDistributeModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Simulate Distribution Modal */}
      {showSimulateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800 flex items-center">
                <Calculator className="h-6 w-6 mr-2 text-purple-500" />
                Distribution Simulator
              </h3>
              <button
                onClick={() => setShowSimulateModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {/* Alert if campaign hasn't ended */}
            {!hasEnded && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">Live Simulation</p>
                    <p className="text-sm text-blue-700 mt-1">
                      This campaign is still active. The simulation below shows potential distribution based on current votes.
                      Results will change as more votes are cast.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Campaign Overview */}
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-purple-500" />
                    Fund Breakdown
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Campaign Funds:</span>
                      <span className="font-medium">{Number(campaign.totalFunds) / 1e18} CELO</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Seas Platform Fee (15%):</span>
                      <span className="font-medium text-blue-600">
                        -{(Number(campaign.totalFunds) / 1e18 * 0.15).toFixed(2)} CELO
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Admin Fee ({Number(campaign.adminFeePercentage)}%):</span>
                      <span className="font-medium text-orange-600">
                        -{(Number(campaign.totalFunds) / 1e18 * Number(campaign.adminFeePercentage) / 100).toFixed(2)} CELO
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-medium">
                      <span className="text-gray-800">Available for Projects:</span>
                      <span className="text-green-600">
                        {(Number(campaign.totalFunds) / 1e18 * (1 - 0.15 - Number(campaign.adminFeePercentage) / 100)).toFixed(2)} CELO
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg p-4 border border-cyan-200">
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                    <BarChart3 className="h-4 w-4 mr-2 text-cyan-500" />
                    Campaign Stats
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-cyan-600">{approvedProjects}</div>
                      <div className="text-gray-600">Approved Projects</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {calculateDistribution(false).reduce((sum, d) => sum + d.voteCount, 0).toFixed(1)}
                      </div>
                      <div className="text-gray-600">Total Votes</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Distribution Methods Comparison */}
              <div className="space-y-6">
                {/* Linear Distribution */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                    <Target className="h-4 w-4 mr-2 text-green-500" />
                    Linear Distribution
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {calculateDistribution(false)
                      .filter((dist): dist is NonNullable<typeof dist> => dist !== null)
                      .map((dist, index) => (
                      <div key={`linear-${dist.projectId}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center space-x-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800' :
                            index === 1 ? 'bg-gray-100 text-gray-800' :
                            index === 2 ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="text-sm">
                            <div className="font-medium text-gray-800 truncate" title={dist.projectName}>
                              {dist.projectName?.length > 15 ? `${dist.projectName.slice(0, 15)}...` : dist.projectName}
                            </div>
                            <div className="text-xs text-gray-600">{dist.voteCount.toFixed(1)} votes</div>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-bold text-green-600">{dist.amount.toFixed(2)}</div>
                          <div className="text-sm text-gray-600">
                            {dist.percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quadratic Distribution */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                    <Zap className="h-4 w-4 mr-2 text-purple-500" />
                    Quadratic Distribution
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {calculateDistribution(true)
                      .filter((dist): dist is NonNullable<typeof dist> => dist !== null)
                      .map((dist, index) => (
                      <div key={`quadratic-${dist.projectId}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center space-x-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800' :
                            index === 1 ? 'bg-gray-100 text-gray-800' :
                            index === 2 ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="text-sm">
                            <div className="font-medium text-gray-800 truncate" title={dist.projectName}>
                              {dist.projectName?.length > 15 ? `${dist.projectName.slice(0, 15)}...` : dist.projectName}
                            </div>
                            <div className="text-xs text-gray-600">√{dist.weight.toFixed(1)} weight</div>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-bold text-purple-600">{dist.amount.toFixed(2)}</div>
                          <div className="text-sm text-gray-600">
                            {dist.percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Method Explanation */}
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2">Distribution Methods Explained</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start space-x-2">
                  <Target className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-800">Linear Distribution</div>
                    <div className="text-gray-600">Projects receive funding proportional to their total vote amounts. Higher votes = higher percentage of funds.</div>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Zap className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-800">Quadratic Distribution</div>
                    <div className="text-gray-600">Vote amounts are square-rooted, reducing the advantage of large individual contributions and promoting broader community support.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSimulateModal(false)}
                className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
              >
                Close Simulator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}