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
  Filter, 
  ChevronDown, 
  Eye, 
  Github, 
  Globe, 
  FileText, 
  AlertTriangle,
  Loader2,
  Award,
  BarChart3,
  Download,
  Droplets,
  User,
  Users,
  Info
} from 'lucide-react';
import { useSovereignSeas } from '../../../../hooks/useSovereignSeas';

const CONTRACT_ADDRESS = '0x35128A5Ee461943fA6403672b3574346Ba7E4530' as `0x${string}`;
const CELO_TOKEN_ADDRESS = '0x3FC1f6138F4b0F5Da3E1927412Afe5c68ed4527b' as `0x${string}`;


export default function CampaignAdminDashboard() {
  const router = useRouter();
  const { campaignId } = useParams();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  
  // Campaign & Projects data
  const [campaign, setCampaign] = useState<any>(null);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
  
  // UI state
  const [projectFilter, setProjectFilter] = useState('pending'); // 'all', 'pending', 'approved'
  const [confirmModal, setConfirmModal] = useState({ visible: false, action: '', projectId: -1 });
  const [distributeFundsModal, setDistributeFundsModal] = useState(false);
  
  // Contract interaction
  const {
    isInitialized,
    loadCampaigns,
    loadProjects,
    getSortedProjects,
    approveProject,
    distributeFunds,
    formatTokenAmount,
    formatCampaignTime,
    getCampaignTimeRemaining,
    isCampaignActive,
    isWritePending,
    isWaitingForTx,
    isTxSuccess,
  } = useSovereignSeas({
    contractAddress: CONTRACT_ADDRESS,
    celoTokenAddress: CELO_TOKEN_ADDRESS,
  });
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  useEffect(() => {
    if (isInitialized && campaignId) {
      loadCampaignData();
    }
  }, [isInitialized, campaignId, address, isTxSuccess]);
  
  // Reset status message after 5 seconds
  useEffect(() => {
    if (statusMessage.text) {
      const timer = setTimeout(() => {
        setStatusMessage({ text: '', type: '' });
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);
  
  // Update filtered projects when filter or all projects change
  useEffect(() => {
    if (allProjects.length > 0) {
      filterProjects(projectFilter);
    }
  }, [projectFilter, allProjects]);
  
  const loadCampaignData = async () => {
    setLoading(true);
    try {
      // Load all campaigns
      const allCampaigns = await loadCampaigns();
      
      if (Array.isArray(allCampaigns) && allCampaigns.length > 0) {
        // Find this specific campaign by ID
        const campaignData = allCampaigns.find(c => c.id.toString() === campaignId);
        
        if (campaignData) {
          setCampaign(campaignData);
          
          // Check if current user is the admin
          if (address && campaignData.admin.toLowerCase() !== address.toLowerCase()) {
            // Not the admin, redirect to regular dashboard
            router.push(`/campaign/${campaignId}/dashboard`);
            return;
          }
          
          // Load projects
          const projectsData = await loadProjects(Number(campaignId));
          setAllProjects(projectsData);
          filterProjects(projectFilter, projectsData);
        } else {
          setStatusMessage({ 
            text: 'Campaign not found', 
            type: 'error' 
          });
        }
      }
    } catch (error) {
      console.error('Error loading campaign data:', error);
      setStatusMessage({ 
        text: 'Error loading campaign data. Please try again later.', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };
  
  const filterProjects = (filter: string, projects = allProjects) => {
    switch (filter) {
      case 'pending':
        setFilteredProjects(projects.filter(p => !p.approved));
        break;
      case 'approved':
        setFilteredProjects(projects.filter(p => p.approved));
        break;
      case 'all':
      default:
        setFilteredProjects(projects);
        break;
    }
  };
  
  const handleApproveProject = async (projectId: number) => {
    try {
      await approveProject(Number(campaignId), projectId);
      setStatusMessage({ 
        text: 'Project approved successfully!', 
        type: 'success' 
      });
      setConfirmModal({ visible: false, action: '', projectId: -1 });
    } catch (error) {
      console.error('Error approving project:', error);
      setStatusMessage({ 
        text: 'Error approving project. Please try again later.', 
        type: 'error' 
      });
    }
  };
  
  const handleDistributeFunds = async () => {
    try {
      if (campaignId) {
        await distributeFunds(Number(campaignId));
      } else {
        setStatusMessage({ 
          text: 'Invalid campaign ID. Please try again later.', 
          type: 'error' 
        });
      }
      setStatusMessage({ 
        text: 'Funds distributed successfully!', 
        type: 'success' 
      });
      setDistributeFundsModal(false);
    } catch (error) {
      console.error('Error distributing funds:', error);
      setStatusMessage({ 
        text: 'Error distributing funds. Please try again later.', 
        type: 'error' 
      });
    }
  };
  
  if (!isMounted) {
    return null;
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 text-lime-500 animate-spin mb-4" />
          <p className="text-lg text-lime-300">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (!campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="flex flex-col items-center text-center max-w-md mx-auto p-6">
          <XCircle className="h-16 w-16 text-red-400 mb-4" />
          <h1 className="text-2xl font-bold mb-3">Campaign Not Found</h1>
          <p className="text-slate-300 mb-6">The campaign you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => router.push('/campaigns')}
            className="px-6 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-500 transition-colors"
          >
            View All Campaigns
          </button>
        </div>
      </div>
    );
  }
  
  const now = Math.floor(Date.now() / 1000);
  const hasStarted = now >= Number(campaign.startTime);
  const hasEnded = now >= Number(campaign.endTime);
  const isActive = campaign.active;
  const canDistributeFunds = isActive && hasEnded;
  const timeRemaining = getCampaignTimeRemaining(campaign);
  
  // Calculate stats
  const totalProjects = allProjects.length;
  const pendingProjects = allProjects.filter(p => !p.approved).length;
  const approvedProjects = allProjects.filter(p => p.approved).length;
  const totalVotes = allProjects.reduce((sum, project) => sum + Number(formatTokenAmount(project.voteCount)), 0);
  const totalFunds = formatTokenAmount(campaign.totalFunds);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Admin Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <button
                  onClick={() => router.push(`/campaign/${campaignId}/dashboard`)}
                  className="inline-flex items-center text-slate-300 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </button>
                <span className="px-2 py-0.5 bg-yellow-900/50 text-yellow-400 text-xs rounded-full border border-yellow-500/30 inline-flex items-center">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin View
                </span>
              </div>
              
              <h1 className="text-3xl font-bold mb-2">{campaign.name}</h1>
              <p className="text-slate-300 mb-4">{campaign.description}</p>
              
              {/* Campaign Status */}
              <div className="flex flex-wrap gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium inline-flex items-center ${
                  hasStarted && !hasEnded
                    ? 'bg-green-900/50 text-green-400 border border-green-500/30'
                    : hasEnded
                      ? 'bg-slate-700/50 text-slate-300 border border-slate-500/30'
                      : 'bg-yellow-900/50 text-yellow-400 border border-yellow-500/30'
                }`}>
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  {hasEnded ? 'Ended' : hasStarted ? 'Active' : 'Upcoming'}
                </span>
                
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-900/50 text-blue-400 border border-blue-500/30 inline-flex items-center">
                  <Users className="h-3.5 w-3.5 mr-1" />
                  {approvedProjects} Approved / {pendingProjects} Pending
                </span>
                
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-900/50 text-purple-400 border border-purple-500/30 inline-flex items-center">
                  <Award className="h-3.5 w-3.5 mr-1" />
                  {campaign.useQuadraticDistribution ? 'Quadratic' : 'Linear'} Distribution
                </span>
                
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-900/50 text-yellow-400 border border-yellow-500/30 inline-flex items-center">
                  <Droplets className="h-3.5 w-3.5 mr-1" />
                  {totalFunds} CELO
                </span>
              </div>
            </div>
          </div>
          
          {/* Timeline Bar */}
          <div className="mt-8 bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center text-slate-300">
                <Calendar className="h-4 w-4 mr-2" />
                Start: {formatCampaignTime(campaign.startTime)}
              </div>
              <div className="flex items-center text-slate-300">
                <Calendar className="h-4 w-4 mr-2" />
                End: {formatCampaignTime(campaign.endTime)}
              </div>
            </div>
            
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              {hasEnded ? (
                <div className="h-full bg-lime-500 w-full"></div>
              ) : hasStarted ? (
                <div 
                  className="h-full bg-lime-500" 
                  style={{ 
                    width: `${Math.min(
                      100, 
                      ((now - Number(campaign.startTime)) / 
                      (Number(campaign.endTime) - Number(campaign.startTime))) * 100
                    )}%` 
                  }}
                ></div>
              ) : (
                <div className="h-full bg-slate-600 w-0"></div>
              )}
            </div>
            
            {hasStarted && !hasEnded && (
              <div className="mt-2 text-center text-yellow-400">
                Time remaining: {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m
              </div>
            )}
          </div>
        </div>
        
        {/* Status Message */}
        {statusMessage.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            statusMessage.type === 'success' 
              ? 'bg-green-900/30 border border-green-500/40' 
              : 'bg-red-900/30 border border-red-500/40'
          }`}>
            <div className="flex items-start">
              {statusMessage.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-400 mr-3 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
              )}
              <p className={statusMessage.type === 'success' ? 'text-green-300' : 'text-red-300'}>
                {statusMessage.text}
              </p>
            </div>
          </div>
        )}
        
        {/* Main Content Area */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column - Admin Actions & Stats */}
          <div className="lg:w-1/3">
            {/* Admin Actions */}
            <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-6 border border-lime-600/20 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-yellow-400 flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Admin Actions
              </h2>
              
              <div className="space-y-4">
                {canDistributeFunds && (
                  <button
                    onClick={() => setDistributeFundsModal(true)}
                    className="w-full py-3 rounded-lg bg-yellow-500 text-slate-900 font-semibold hover:bg-yellow-400 transition-colors flex items-center justify-center"
                  >
                    <Award className="h-5 w-5 mr-2" />
                    Distribute Funds
                  </button>
                )}
                
                <button
                  onClick={() => router.push(`/campaign/${campaignId}/edit`)}
                  className="w-full py-3 rounded-lg bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-colors flex items-center justify-center"
                >
                  <Globe className="h-5 w-5 mr-2" />
                  Edit Campaign
                </button>
                
                <button
                  onClick={() => router.push(`/campaign/${campaignId}/export`)}
                  className="w-full py-3 rounded-lg bg-transparent border border-slate-500 text-slate-300 font-semibold hover:bg-slate-700 transition-colors flex items-center justify-center"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Export Campaign Data
                </button>
              </div>
              
              {hasEnded && !canDistributeFunds && (
                <div className="mt-4 p-3 bg-slate-700/40 rounded-lg">
                  <p className="text-sm text-slate-300">
                    <AlertTriangle className="h-4 w-4 text-yellow-400 inline mr-1" />
                    Funds have already been distributed for this campaign.
                  </p>
                </div>
              )}
              
              {!hasEnded && (
                <div className="mt-4 p-3 bg-slate-700/40 rounded-lg">
                  <p className="text-sm text-slate-300">
                    <Info className="h-4 w-4 text-blue-400 inline mr-1" />
                    Funds can be distributed after the campaign ends on {formatCampaignTime(campaign.endTime)}.
                  </p>
                </div>
              )}
            </div>
            
            {/* Campaign Stats */}
            <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-6 border border-lime-600/20">
              <h2 className="text-xl font-semibold mb-4 text-yellow-400 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Campaign Stats
              </h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Total Projects:</span>
                  <span className="font-semibold text-white">{totalProjects}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Pending Approval:</span>
                  <span className="font-semibold text-yellow-400">{pendingProjects}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Approved Projects:</span>
                  <span className="font-semibold text-green-400">{approvedProjects}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Total Votes:</span>
                  <span className="font-semibold text-white">{totalVotes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Total Funds:</span>
                  <span className="font-semibold text-lime-400">{totalFunds} CELO</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Admin Fee:</span>
                  <span className="font-semibold text-white">{campaign.adminFeePercentage.toString()}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Platform Fee:</span>
                  <span className="font-semibold text-white">15%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Max Winners:</span>
                  <span className="font-semibold text-white">
                    {campaign.maxWinners.toString() === '0' ? 'All Projects' : campaign.maxWinners.toString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column - Project Management */}
          <div className="lg:w-2/3">
            <div className="bg-slate-800/40 backdrop-blur-md rounded-xl border border-lime-600/20 overflow-hidden">
              <div className="p-6 pb-4 border-b border-slate-700 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <h2 className="text-xl font-semibold text-yellow-400 flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Project Management
                </h2>
                
                {/* Filter Controls */}
                <div className="relative inline-block w-full md:w-auto text-left">
                  <div className="flex">
                    <button
                      onClick={() => setProjectFilter('pending')}
                      className={`px-4 py-2 text-sm rounded-l-lg flex-1 ${
                        projectFilter === 'pending' 
                          ? 'bg-yellow-600 text-white' 
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      Pending ({pendingProjects})
                    </button>
                    <button
                      onClick={() => setProjectFilter('approved')}
                      className={`px-4 py-2 text-sm flex-1 ${
                        projectFilter === 'approved' 
                          ? 'bg-green-600 text-white' 
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      Approved ({approvedProjects})
                    </button>
                    <button
                      onClick={() => setProjectFilter('all')}
                      className={`px-4 py-2 text-sm rounded-r-lg flex-1 ${
                        projectFilter === 'all' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      All ({totalProjects})
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {/* No Projects Message */}
                {filteredProjects.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-slate-400 mb-2">No {projectFilter !== 'all' ? projectFilter : ''} projects found.</p>
                    {projectFilter === 'pending' && (
                      <p className="text-slate-500 text-sm">
                        All projects have been reviewed. Check the "Approved" or "All" tabs.
                      </p>
                    )}
                  </div>
                )}
                
                {/* Project List */}
                {filteredProjects.map((project) => (
                  <div 
                    key={project.id.toString()} 
                    className="bg-slate-700/40 rounded-lg p-5 mb-4 hover:bg-slate-700/60 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className="flex-grow">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                          {project.approved ? (
                            <span className="px-2 py-0.5 bg-green-900/50 text-green-400 text-xs rounded-full border border-green-500/30">
                              Approved
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-yellow-900/50 text-yellow-400 text-xs rounded-full border border-yellow-500/30">
                              Pending Approval
                            </span>
                          )}
                        </div>
                        
                        <p className="text-slate-300 mt-1 mb-3">{project.description}</p>
                        
                        <div className="flex flex-wrap gap-y-2 gap-x-4 text-sm mb-3">
                          {project.githubLink && (
                            <a 
                              href={project.githubLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 flex items-center"
                            >
                              <Github className="h-4 w-4 mr-1" />
                              GitHub
                            </a>
                          )}
                          
                          {project.socialLink && (
                            <a 
                              href={project.socialLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 flex items-center"
                            >
                              <Globe className="h-4 w-4 mr-1" />
                              Social
                            </a>
                          )}
                          
                          {project.testingLink && (
                            <a 
                              href={project.testingLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 flex items-center"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Demo
                            </a>
                          )}
                        </div>
                        
                        <div className="flex items-center text-xs text-slate-400">
                          <User className="h-3 w-3 mr-1" />
                          Submitted by: {project.owner.slice(0, 6)}...{project.owner.slice(-4)}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-start md:items-end">
                        {project.approved && (
                          <div className="bg-slate-800/60 rounded-lg px-4 py-3 text-center min-w-[120px] mb-3">
                            <div className="text-xl font-bold text-lime-400">
                              {formatTokenAmount(project.voteCount)}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">VOTES</div>
                          </div>
                        )}
                        
                        <div className="flex gap-2 w-full md:w-auto">
                          <button
                            onClick={() => router.push(`/campaign/${campaignId}/project/${project.id}`)}
                            className="px-3 py-2 bg-slate-600 text-slate-200 rounded-lg text-sm hover:bg-slate-500 transition-colors flex items-center flex-1 justify-center"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </button>
                          
                          {!project.approved && (
                            <button
                              onClick={() => setConfirmModal({ 
                                visible: true, 
                                action: 'approve', 
                                projectId: Number(project.id) 
                              })}
                              className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-500 transition-colors flex items-center flex-1 justify-center"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Confirm Action Modal */}
      {confirmModal.visible && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-md p-6 relative">
            <button 
              onClick={() => setConfirmModal({ visible: false, action: '', projectId: -1 })} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <XCircle className="h-5 w-5" />
            </button>
            
            <h3 className="text-xl font-bold mb-4">Confirm Action</h3>
            
            {confirmModal.action === 'approve' && (
              <>
                <p className="text-slate-300 mb-6">
                  Are you sure you want to approve this project? Once approved, it will be visible to all users and eligible for voting.
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApproveProject(confirmModal.projectId)}
                    disabled={isWritePending || isWaitingForTx}
                    className="flex-1 py-3 px-6 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-500 transition-colors disabled:bg-slate-500 disabled:text-slate-300"
                  >
                    {isWritePending || isWaitingForTx ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Processing...
                      </div>
                    ) : (
                      'Approve Project'
                    )}
                  </button>
                  
                  <button
                    onClick={() => setConfirmModal({ visible: false, action: '', projectId: -1 })}
                    className="py-3 px-6 bg-transparent border border-slate-500 text-slate-300 font-semibold rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Distribute Funds Modal */}
      {distributeFundsModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-lg p-6 relative">
            <button 
              onClick={() => setDistributeFundsModal(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <XCircle className="h-5 w-5" />
            </button>
            
            <h3 className="text-xl font-bold mb-1">Distribute Campaign Funds</h3>
            <p className="text-yellow-400 font-medium mb-4">{campaign.name}</p>
            
            <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-white mb-2">Distribution Summary</h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-300">Total Funds:</span>
                  <span className="text-lime-400 font-medium">{totalFunds} CELO</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Platform Fee (15%):</span>
                  <span className="text-white">{(Number(totalFunds) * 0.15).toFixed(2)} CELO</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Admin Fee ({campaign.adminFeePercentage.toString()}%):</span>
                  <span className="text-white">{(Number(totalFunds) * Number(campaign.adminFeePercentage) / 100).toFixed(2)} CELO</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-300">Distributable to Projects:</span>
                  <span className="text-white">
                    {(Number(totalFunds) * (1 - 0.15 - Number(campaign.adminFeePercentage) / 100)).toFixed(2)} CELO
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Distribution Method:</span>
                  <span className="text-white">{campaign.useQuadraticDistribution ? 'Quadratic' : 'Linear'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Max Winners:</span>
                  <span className="text-white">
                    {campaign.maxWinners.toString() === '0' ? 'All Projects' : `Top ${campaign.maxWinners.toString()}`}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-900/30 border border-yellow-500/40 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-300 font-medium mb-1">Important</p>
                  <p className="text-yellow-200 text-sm">
                    This action is irreversible. Once funds are distributed, they cannot be reclaimed or redistributed.
                    Make sure all projects have been properly reviewed and approved before proceeding.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleDistributeFunds}
                disabled={isWritePending || isWaitingForTx}
                className="flex-1 py-3 px-6 bg-yellow-500 text-slate-900 font-semibold rounded-lg hover:bg-yellow-400 transition-colors disabled:bg-slate-500 disabled:text-slate-300"
              >
                {isWritePending || isWaitingForTx ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing Distribution...
                  </div>
                ) : (
                  'Distribute Funds Now'
                )}
              </button>
              
              <button
                onClick={() => setDistributeFundsModal(false)}
                className="py-3 px-6 bg-transparent border border-slate-500 text-slate-300 font-semibold rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}