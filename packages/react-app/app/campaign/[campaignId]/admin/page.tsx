'use client';

import { useState, useEffect, useRef } from 'react';
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
  Info,
  Image,
  Video,
  Code,
  UserPlus,
  UserMinus,
  Settings,
  PlusCircle,
  Trash2,
  MousePointerClick,
  History
} from 'lucide-react';
import { useSovereignSeas } from '../../../../hooks/useSovereignSeas';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` 
const CELO_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_CELO_TOKEN_ADDRESS as `0x${string}` 

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
  
  // New states for additional functionality
  const [campaignAdmins, setCampaignAdmins] = useState<string[]>([]);
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [adminToRemove, setAdminToRemove] = useState('');
  const [userVoteHistory, setUserVoteHistory] = useState<any[]>([]);
  const [voteHistoryVisible, setVoteHistoryVisible] = useState(false);
  const [sortedProjects, setSortedProjects] = useState<any[]>([]);
  const [showWinningProjectsPreview, setShowWinningProjectsPreview] = useState(false);
  
  // UI state
  const [projectFilter, setProjectFilter] = useState('pending'); // 'all', 'pending', 'approved'
  const [confirmModal, setConfirmModal] = useState({ visible: false, action: '', projectId: -1 });
  const [distributeFundsModal, setDistributeFundsModal] = useState(false);
  const [adminManagementModal, setAdminManagementModal] = useState(false);
  const [invalidAddressError, setInvalidAddressError] = useState('');
  
  // Refs for form validation
  const adminAddressInputRef = useRef<HTMLInputElement>(null);
  
  // Contract interaction
  const {
    isInitialized,
    loadCampaigns,
    loadProjects,
    getSortedProjects,
    getUserVoteHistory,
    getUserTotalVotesInCampaign,
    getUserVotesForProject,
    approveProject,
    distributeFunds,
    addCampaignAdmin,
    removeCampaignAdmin,
    isCampaignAdmin,
    formatTokenAmount,
    formatCampaignTime,
    getCampaignTimeRemaining,
    isCampaignActive,
    isWritePending,
    isWaitingForTx,
    isTxSuccess,
    isSuperAdmin,
    resetWrite
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
      loadVoteHistory();
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
  
  // Load winning projects preview when toggle is activated
  useEffect(() => {
    if (showWinningProjectsPreview && campaign) {
      loadSortedProjects();
    }
  }, [showWinningProjectsPreview, campaign]);
  
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
          
          // Check if current user is the admin or super admin
          if (address && 
              campaignData.admin.toLowerCase() !== address.toLowerCase() && 
              !isSuperAdmin) {
            
            // Additional check for campaign admin
            const isAdmin = await isCampaignAdmin(Number(campaignId));
            if (!isAdmin) {
              // Not the admin, redirect to regular dashboard
              router.push(`/campaign/${campaignId}/dashboard`);
              return;
            }
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
  
  const loadVoteHistory = async () => {
    try {
      if (address) {
        const history = await getUserVoteHistory();
        
        // Filter to only include votes for this campaign
        const campaignVotes = history.filter(vote => 
          vote.campaignId.toString() === campaignId
        );
        
        setUserVoteHistory(campaignVotes);
      }
    } catch (error) {
      console.error('Error loading vote history:', error);
    }
  };
  
  const loadSortedProjects = async () => {
    try {
      if (campaign) {
        const sorted = await getSortedProjects(Number(campaignId));
        setSortedProjects(sorted);
      }
    } catch (error) {
      console.error('Error loading sorted projects:', error);
      setStatusMessage({
        text: 'Error loading project rankings. Please try again later.',
        type: 'error'
      });
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
  
  // New functions for admin management
  const validateEthereumAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };
  
  const handleAddAdmin = async () => {
    if (!validateEthereumAddress(newAdminAddress)) {
      setInvalidAddressError('Please enter a valid Ethereum address');
      if (adminAddressInputRef.current) {
        adminAddressInputRef.current.focus();
      }
      return;
    }
    
    setInvalidAddressError('');
    
    try {
      await addCampaignAdmin(Number(campaignId), newAdminAddress);
      setStatusMessage({
        text: 'New admin added successfully!',
        type: 'success'
      });
      setNewAdminAddress('');
      setAdminManagementModal(false);
    } catch (error) {
      console.error('Error adding campaign admin:', error);
      setStatusMessage({
        text: 'Error adding admin. Please try again later.',
        type: 'error'
      });
    }
  };
  
  const handleRemoveAdmin = async () => {
    if (!adminToRemove) return;
    
    try {
      await removeCampaignAdmin(Number(campaignId), adminToRemove);
      setStatusMessage({
        text: 'Admin removed successfully!',
        type: 'success'
      });
      setAdminToRemove('');
      setAdminManagementModal(false);
    } catch (error) {
      console.error('Error removing campaign admin:', error);
      setStatusMessage({
        text: 'Error removing admin. Please try again later.',
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
  
  // Check for campaign media
  const hasCampaignMedia = campaign.logo?.trim().length > 0 || campaign.demoVideo?.trim().length > 0;
  
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
                
                {isSuperAdmin && (
                  <span className="px-2 py-0.5 bg-purple-900/50 text-purple-400 text-xs rounded-full border border-purple-500/30 inline-flex items-center">
                    <Shield className="h-3 w-3 mr-1" />
                    Super Admin
                  </span>
                )}
              </div>
              
              <div className="flex items-center">
                <h1 className="text-3xl font-bold mb-2">{campaign.name}</h1>
                
                {/* Media indicators */}
                {hasCampaignMedia && (
                  <div className="flex items-center ml-2 gap-1">
                    {campaign.logo && (
                      <span className="text-blue-400">
                        <Image className="h-4 w-4" />
                      </span>
                    )}
                    {campaign.demoVideo && (
                      <span className="text-red-400">
                        <Video className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                )}
              </div>
              
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
                  <Settings className="h-5 w-5 mr-2" />
                  Edit Campaign
                </button>
                
                {/* New Admin Management Button */}
                <button
                  onClick={() => setAdminManagementModal(true)}
                  className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-colors flex items-center justify-center"
                >
                  <Users className="h-5 w-5 mr-2" />
                  Manage Admins
                </button>
                
                {/* New Vote History Button */}
                <button
                  onClick={() => setVoteHistoryVisible(!voteHistoryVisible)}
                  className="w-full py-3 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-500 transition-colors flex items-center justify-center"
                >
                  <History className="h-5 w-5 mr-2" />
                  {voteHistoryVisible ? 'Hide Vote History' : 'View Vote History'}
                </button>
                
                {/* New Winners Preview Button */}
                {hasStarted && (
                  <button
                    onClick={() => {
                      setShowWinningProjectsPreview(!showWinningProjectsPreview);
                    }}
                    className="w-full py-3 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-500 transition-colors flex items-center justify-center"
                  >
                    <Award className="h-5 w-5 mr-2" />
                    {showWinningProjectsPreview ? 'Hide Rankings' : 'Preview Rankings'}
                  </button>
                )}
                
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
            
            {/* Vote History Section (Conditionally Rendered) */}
            {voteHistoryVisible && (
              <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-6 border border-purple-600/20 mb-6">
                <h2 className="text-xl font-semibold mb-4 text-purple-400 flex items-center">
                  <History className="h-5 w-5 mr-2" />
                  Your Vote History
                </h2>
                
                {userVoteHistory.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-slate-400">You haven't voted in this campaign yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userVoteHistory.map((vote, index) => {
                      const project = allProjects.find(p => p.id.toString() === vote.projectId.toString());
                      return (
                        <div key={index} className="bg-slate-700/40 rounded-lg p-3">
                          <div className="flex items-center mb-1">
                            <MousePointerClick className="h-3.5 w-3.5 text-purple-400 mr-2" />
                            <span className="font-medium">
                              {project ? project.name : `Project #${vote.projectId.toString()}`}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Amount:</span>
                            <span className="text-lime-400 font-medium">
                              {formatTokenAmount(vote.amount)} CELO
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Vote Count:</span>
                            <span className="text-purple-400 font-medium">
                              {vote.voteCount.toString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            
            {/* Project Rankings Preview (Conditionally Rendered) */}
            {showWinningProjectsPreview && (
              <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-6 border border-green-600/20 mb-6">
                <h2 className="text-xl font-semibold mb-4 text-green-400 flex items-center">
                  <Award className="h-5 w-5 mr-2" />
                  Project Rankings
                </h2>
                
                {sortedProjects.length === 0 ? (
                  <div className="text-center py-4">
                    <Loader2 className="h-8 w-8 text-green-500 animate-spin mb-2 mx-auto" />
                    <p className="text-slate-400">Loading project rankings...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedProjects.map((project, index) => (
                      <div 
                        key={project.id.toString()} 
                        className={`bg-slate-700/40 rounded-lg p-3 ${index < Number(campaign.maxWinners) && campaign.maxWinners.toString() !== '0' ? 'border border-green-500/30' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium flex items-center">
                            {index + 1}.{' '}
                            {index < Number(campaign.maxWinners) && campaign.maxWinners.toString() !== '0' && (
                              <Award className="h-3.5 w-3.5 text-yellow-400 ml-1" />
                            )}
                          </span>
                          <span className="text-sm px-2 py-0.5 bg-green-900/50 text-green-400 rounded-full">
                            {formatTokenAmount(project.voteCount)} votes
                          </span>
                        </div>
                        <div className="font-medium text-white">{project.name}</div>
                        <div className="text-xs text-slate-400 truncate mt-1">
                          Owner: {project.owner.slice(0, 6)}...{project.owner.slice(-4)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {campaign.maxWinners.toString() !== '0' && sortedProjects.length > 0 && (
                  <div className="mt-4 p-3 bg-slate-700/40 rounded-lg">
                    <p className="text-sm text-green-300 flex items-start">
                      <Info className="h-4 w-4 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                      Top {campaign.maxWinners.toString()} projects will receive funds based on {campaign.useQuadraticDistribution ? 'quadratic' : 'linear'} distribution.
                    </p>
                    </div>
                )}
              </div>
            )}
            
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
                
                {/* Media Info */}
                {hasCampaignMedia && (
                  <>
                    <div className="border-t border-slate-700 pt-3 mt-3">
                      <span className="text-slate-300 font-medium">Media Content:</span>
                    </div>
                    {campaign.logo && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300 flex items-center">
                          <Image className="h-4 w-4 mr-2 text-blue-400" />
                          Logo:
                        </span>
                        <span className="font-medium text-blue-400">Available</span>
                      </div>
                    )}
                    {campaign.demoVideo && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300 flex items-center">
                          <Video className="h-4 w-4 mr-2 text-red-400" />
                          Demo Video:
                        </span>
                        <span className="font-medium text-red-400">Available</span>
                      </div>
                    )}
                  </>
                )}
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
                          
                          {/* Media indicators */}
                          {(project.logo || project.demoVideo) && (
                            <div className="flex items-center gap-1">
                              {project.logo && (
                                <span className="text-blue-400">
                                  <Image className="h-3.5 w-3.5" />
                                </span>
                              )}
                              {project.demoVideo && (
                                <span className="text-red-400">
                                  <Video className="h-3.5 w-3.5" />
                                </span>
                              )}
                            </div>
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
                          
                          {/* Show contract count if there are any contracts */}
                          {project.contracts && project.contracts.length > 0 && (
                            <span className="text-purple-400 flex items-center">
                              <Code className="h-4 w-4 mr-1" />
                              {project.contracts.length} Contract{project.contracts.length !== 1 ? 's' : ''}
                            </span>
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
      
      {/* Admin Management Modal */}
      {adminManagementModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-lg p-6 relative">
            <button 
              onClick={() => {
                setAdminManagementModal(false);
                setNewAdminAddress('');
                setInvalidAddressError('');
              }} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <XCircle className="h-5 w-5" />
            </button>
            
            <h3 className="text-xl font-bold mb-1">Manage Campaign Admins</h3>
            <p className="text-blue-400 font-medium mb-4">{campaign.name}</p>
            
            <div className="mb-6">
              <h4 className="font-medium text-white mb-3">Add New Admin</h4>
              
              <div className="flex flex-col">
                <label className="text-sm text-slate-300 mb-1">Admin Wallet Address</label>
                <div className="flex">
                  <input
                    ref={adminAddressInputRef}
                    type="text"
                    value={newAdminAddress}
                    onChange={(e) => {
                      setNewAdminAddress(e.target.value);
                      if (invalidAddressError) setInvalidAddressError('');
                    }}
                    placeholder="0x..."
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-l-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddAdmin}
                    disabled={isWritePending || !newAdminAddress}
                    className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-500 disabled:bg-slate-600 disabled:text-slate-400 flex items-center"
                  >
                    {isWritePending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <UserPlus className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {invalidAddressError && (
                  <p className="text-red-400 text-sm mt-1">{invalidAddressError}</p>
                )}
              </div>
            </div>
            
            <div className="mb-4">
              <h4 className="font-medium text-white mb-3">Current Admins</h4>
              
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="mb-2 flex items-center">
                  <Shield className="h-4 w-4 text-yellow-400 mr-2" />
                  <span className="text-yellow-400">Campaign Owner</span>
                </div>
                <div className="flex items-center justify-between bg-slate-700 rounded-lg p-3 mb-2">
                  <span className="font-mono text-white">{campaign.admin}</span>
                </div>
                
                {/* Campaign admins would be listed here */}
                <div className="mt-4 mb-2 flex items-center">
                  <Users className="h-4 w-4 text-blue-400 mr-2" />
                  <span className="text-blue-400">Additional Admins</span>
                </div>
                
                {/* This would be populated from the blockchain */}
                <p className="text-slate-400 text-sm italic">
                  To view all current admins, check the blockchain explorer or use the contract's getCampaignAdmins function.
                </p>
              </div>
            </div>
            
            <div className="mt-4">
              <button
                onClick={() => {
                  setAdminManagementModal(false);
                  setNewAdminAddress('');
                  setInvalidAddressError('');
                }}
                className="w-full py-3 px-6 bg-transparent border border-slate-500 text-slate-300 font-semibold rounded-lg hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
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


