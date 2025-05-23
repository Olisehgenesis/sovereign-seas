'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  FileText, 
  AlertTriangle,
  Loader2,
  Award,
  BarChart3,
  Users,
  Info,
  Image,
  Video,
  Code,
  UserPlus,
  Settings,
  History,
  Layers,
  CircleDollarSign,
  ListChecks,
  User,
  Sparkles,
  TrendingUp,
  Filter,
  Plus
} from 'lucide-react';

import { 
  useCampaignDetails, 
  useApproveProject, 
  useAddCampaignAdmin, 
  useDistributeFunds,
  useIsCampaignAdmin,
  useSortedProjects 
} from '@/hooks/useCampaignMethods';

import { 
  useAllProjects, 
  formatProjectForDisplay 
} from '@/hooks/useProjectMethods';

export default function CampaignManagePage() {
  const router = useRouter();
  const { id } = useParams();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  
  // UI State
  const [activeTab, setActiveTab] = useState('overview');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [confirmApproval, setConfirmApproval] = useState({ show: false, projectId: null });
  
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_V4;
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
  
  const { sortedProjectIds } = useSortedProjects(contractAddress as `0x${string}`, campaignId);
  
  const { 
    approveProject, 
    isPending: isApprovingProject 
  } = useApproveProject(contractAddress as `0x${string}`);
  
  const { 
    addCampaignAdmin, 
    isPending: isAddingAdmin 
  } = useAddCampaignAdmin(contractAddress as `0x${string}`);
  
  const { 
    distributeFunds, 
    isPending: isDistributingFunds 
  } = useDistributeFunds(contractAddress as `0x${string}`);

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

  // Filter projects for this campaign
  const campaignProjects = allProjects?.filter(projectDetails => {
    return projectDetails.project.campaignIds.some(cId => Number(cId) === Number(campaignId));
  }) || [];

  const filteredProjects = campaignProjects.filter(projectDetails => {
    const project = formatProjectForDisplay(projectDetails);
    if (projectFilter === 'pending') return !project?.approved;
    if (projectFilter === 'approved') return project?.approved;
    return true;
  });

  const handleApproveProject = async (projectId: bigint) => {
    try {
      await approveProject({
        campaignId,
        projectId
      });
      setStatusMessage({ text: 'Project approved successfully!', type: 'success' });
      setConfirmApproval({ show: false, projectId: null });
    } catch (error) {
      console.error('Error approving project:', error);
      setStatusMessage({ text: 'Failed to approve project', type: 'error' });
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
    } catch (error) {
      console.error('Error adding admin:', error);
      setStatusMessage({ text: 'Failed to add admin', type: 'error' });
    }
  };

  const handleDistributeFunds = async () => {
    try {
      await distributeFunds({ campaignId });
      setStatusMessage({ text: 'Funds distributed successfully!', type: 'success' });
      setShowDistributeModal(false);
    } catch (error) {
      console.error('Error distributing funds:', error);
      setStatusMessage({ text: 'Failed to distribute funds', type: 'error' });
    }
  };

  if (!isMounted) return null;

  if (campaignLoading || projectsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-500"></div>
            <Sparkles className="h-6 w-6 text-blue-500 absolute inset-0 m-auto animate-pulse" />
          </div>
          <p className="text-lg text-blue-600 font-medium">Loading campaign management...</p>
        </div>
      </div>
    );
  }

  if (campaignError || !campaignDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Campaign Not Found</h1>
          <p className="text-gray-600 mb-6">The campaign you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => router.push('/explore')}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            Browse Campaigns
          </button>
        </div>
      </div>
    );
  }

  if (!isConnected || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <Shield className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You need to be a campaign admin to access this page.</p>
          <button
            onClick={() => router.push(`/explore/campaign/${id}`)}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            View Campaign
          </button>
        </div>
      </div>
    );
  }

  const campaign = campaignDetails.campaign;
  const metadata = campaignDetails.metadata;
  
  // Calculate stats
  const totalProjects = campaignProjects.length;
  const pendingProjects = campaignProjects.filter(p => !formatProjectForDisplay(p)?.approved).length;
  const approvedProjects = campaignProjects.filter(p => formatProjectForDisplay(p)?.approved).length;
  
  // Campaign status
  const now = Math.floor(Date.now() / 1000);
  const startTime = Number(campaign.startTime);
  const endTime = Number(campaign.endTime);
  const hasStarted = now >= startTime;
  const hasEnded = now >= endTime;
  const canDistribute = hasEnded && campaign.active;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Floating background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-gradient-to-r from-blue-400/10 to-indigo-400/10 animate-pulse blur-2xl"></div>
        <div className="absolute top-1/2 right-1/5 w-48 h-48 rounded-full bg-gradient-to-r from-cyan-400/10 to-blue-400/10 animate-pulse blur-2xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-40 h-40 rounded-full bg-gradient-to-r from-indigo-400/10 to-purple-400/10 animate-pulse blur-2xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push(`/explore/campaign/${id}`)}
              className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm text-gray-700 hover:text-blue-600 rounded-full transition-all hover:bg-white shadow-lg border border-blue-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaign
            </button>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <span className="text-lg font-semibold text-gray-800">Campaign Management</span>
            </div>
          </div>
        </div>

        {/* Campaign Info Header */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-blue-100 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-800">{campaign.name}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  hasEnded ? 'bg-gray-100 text-gray-700' : hasStarted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  <Clock className="h-3 w-3 mr-1 inline" />
                  {hasEnded ? 'Ended' : hasStarted ? 'Active' : 'Upcoming'}
                </span>
              </div>
              <p className="text-gray-600 mb-3">{campaign.description}</p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                  <Users className="h-3 w-3 mr-1" />
                  {approvedProjects} Approved / {pendingProjects} Pending
                </span>
                <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {Number(campaign.totalFunds) / 1e18} CELO
                </span>
              </div>
            </div>
            
            {canDistribute && (
              <div className="mt-4 md:mt-0">
                <button
                  onClick={() => setShowDistributeModal(true)}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center"
                >
                  <Award className="h-4 w-4 mr-2" />
                  Distribute Funds
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status Message */}
        {statusMessage.text && (
          <div className={`mb-6 p-4 rounded-xl shadow-lg ${
            statusMessage.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
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

        {/* Tabs */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-100 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
                activeTab === 'overview' 
                  ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50' 
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                Overview
              </div>
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
                activeTab === 'projects' 
                  ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50' 
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center">
                <ListChecks className="h-4 w-4 mr-2" />
                Projects ({totalProjects})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
                activeTab === 'settings' 
                  ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50' 
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
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
                <div className="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Campaign Stats</h3>
                    <BarChart3 className="h-5 w-5 text-blue-500" />
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
                      <span className="font-semibold text-blue-600">{Number(campaign.totalFunds) / 1e18} CELO</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Timeline</h3>
                    <Calendar className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-600 text-sm">Start Date:</span>
                      <p className="font-semibold">{new Date(startTime * 1000).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 text-sm">End Date:</span>
                      <p className="font-semibold">{new Date(endTime * 1000).toLocaleDateString()}</p>
                    </div>
                    <div className="pt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                          style={{ 
                            width: hasEnded ? '100%' : hasStarted ? `${Math.min(100, ((now - startTime) / (endTime - startTime)) * 100)}%` : '0%'
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Quick Actions</h3>
                    <Sparkles className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowAdminModal(true)}
                      className="w-full px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors flex items-center"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Admin
                    </button>
                    <button
                      onClick={() => router.push(`/explore/campaign/${id}/edit`)}
                      className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors flex items-center"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Campaign
                    </button>
                    {canDistribute && (
                      <button
                        onClick={() => setShowDistributeModal(true)}
                        className="w-full px-4 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors flex items-center"
                      >
                        <Award className="h-4 w-4 mr-2" />
                        Distribute Funds
                      </button>
                    )}
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
                        projectFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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

                      return (
                        <div key={project.id} className="bg-white rounded-xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300">
                          <div className="flex flex-col md:flex-row md:items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="text-lg font-semibold text-gray-800">{project.name}</h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  project.approved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {project.approved ? 'Approved' : 'Pending'}
                                </span>
                              </div>
                              <p className="text-gray-600 mb-3">{project.description}</p>
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span className="flex items-center">
                                  <User className="h-3 w-3 mr-1" />
                                  {project.owner.slice(0, 6)}...{project.owner.slice(-4)}
                                </span>
                                {project.githubRepo && (
                                  <a 
                                    href={project.githubRepo} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center text-blue-600 hover:text-blue-700"
                                  >
                                    <Github className="h-3 w-3 mr-1" />
                                    GitHub
                                  </a>
                                )}
                                {project.website && (
                                  <a 
                                    href={project.website} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center text-blue-600 hover:text-blue-700"
                                  >
                                    <Globe className="h-3 w-3 mr-1" />
                                    Website
                                  </a>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3 mt-4 md:mt-0">
                              <button
                                onClick={() => router.push(`/explore/project/${project.id}`)}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors flex items-center"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </button>
                              
                              {!project.approved && (
                                <button
                                  onClick={() => setConfirmApproval({ show: true, projectId: BigInt(project.id) })}
                                  disabled={isApprovingProject}
                                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center disabled:opacity-50"
                                >
                                  {isApprovingProject ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                  )}
                                  Approve
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

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
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
                      onClick={() => router.push(`/explore/campaign/${id}/edit`)}
                      className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Campaign
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Admin Management</h3>
                  <p className="text-gray-600 mb-4">Add additional administrators to help manage this campaign.</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Current Admin</label>
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Shield className="h-4 w-4 text-blue-500" />
                        <span className="font-mono text-sm">{campaign.admin}</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Owner</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setShowAdminModal(true)}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add New Admin
                    </button>
                  </div>
                </div>

                {hasEnded && (
                  <div className="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
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

      {/* Modals */}
      
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
                onClick={() => confirmApproval.projectId && handleApproveProject(confirmApproval.projectId)}
                disabled={isApprovingProject}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isApprovingProject ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Approve Project
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={handleAddAdmin}
                  disabled={isAddingAdmin || !newAdminAddress}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {isAddingAdmin ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
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

      {/* Distribute Funds Modal */}
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
                    <span className="text-gray-600">Platform Fee (15%):</span>
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
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
    </div>
  );
}