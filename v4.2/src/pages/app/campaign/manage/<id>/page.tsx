// @ts-nocheck

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  useParticipation 
} from '@/hooks/useCampaignMethods';

import { 
  useAllProjects, 
  formatProjectForDisplay 
} from '@/hooks/useProjectMethods';

import { formatEther } from 'viem';

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
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [confirmApproval, setConfirmApproval] = useState<{ show: boolean; projectId: bigint | null }>({ show: false, projectId: null });
  
  // Vote count state management (same as index page)
  const [projectVoteCounts, setProjectVoteCounts] = useState<Map<string, bigint>>(new Map());
  
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

  if (campaignError || !campaignDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <XCircle className="h-20 w-20 text-red-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-slate-800 mb-4">Campaign Not Found</h1>
          <p className="text-slate-600 mb-8">The campaign you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/explore')}
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Professional Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/explore/campaign/${id}`)}
              className="inline-flex items-center px-4 py-2 bg-white text-slate-700 hover:text-blue-600 rounded-lg border border-slate-200 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaign
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Campaign Management</h1>
                <p className="text-sm text-slate-500">Administrative Dashboard</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={refetchAllData}
              disabled={sortedLoading}
              className="p-2 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <RotateCcw className={`h-4 w-4 text-slate-600 ${sortedLoading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={() => navigate(`/app/campaign/edit/${id}`)}
              className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors duration-200 flex items-center space-x-2"
            >
              <Edit className="h-4 w-4" />
              <span>Edit Campaign</span>
            </button>
            
            {canDistribute && (
              <button
                onClick={() => setShowDistributeModal(true)}
                className="px-6 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2"
              >
                <Award className="h-4 w-4" />
                <span>Distribute Funds</span>
              </button>
            )}
            
            <button
              onClick={() => setShowSimulateModal(true)}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
            >
              <Calculator className="h-4 w-4" />
              <span>Simulate</span>
            </button>
          </div>
        </div>

        {/* Campaign Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-4">
                <h2 className="text-2xl font-bold text-slate-800">{campaign.name}</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  hasEnded ? 'bg-slate-100 text-slate-700' : hasStarted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  <Clock className="h-3 w-3 mr-1 inline" />
                  {hasEnded ? 'Ended' : hasStarted ? 'Active' : 'Upcoming'}
                </span>
              </div>
              <p className="text-slate-600 mb-4">{campaign.description}</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-slate-800">{totalProjects}</div>
                  <div className="text-sm text-slate-600">Total Projects</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-600">{approvedProjects}</div>
                  <div className="text-sm text-slate-600">Approved</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-amber-600">{pendingProjects}</div>
                  <div className="text-sm text-slate-600">Pending</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-600">{Number(campaign.totalFunds) / 1e18}</div>
                  <div className="text-sm text-slate-600">CELO Treasury</div>
                </div>
              </div>
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
                { id: 'simulation', label: 'Distribution', icon: Calculator },
                { id: 'settings', label: 'Settings', icon: Settings }
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
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-800">Campaign Analytics</h3>
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="space-y-4">
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
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
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
               <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
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
                                 <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
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
                     {calculateDistribution(false).map((dist, index) => (
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
                     {calculateDistribution(true).map((dist, index) => (
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
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
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
                 <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
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
                 <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
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
                     {calculateDistribution(false).slice(0, 5).map((dist, index) => (
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
                     {calculateDistribution(true).slice(0, 5).map((dist, index) => (
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
     </div>
   );
  }