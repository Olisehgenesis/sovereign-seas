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
  History,
  Layers,
  CircleDollarSign,
  PieChart,
  ListChecks,
  ChevronRight
} from 'lucide-react';
import { Campaign, Project, useSovereignSeas, Vote } from '../../../../hooks/useSovereignSeas';

export default function CampaignAdminDashboard() {
  const router = useRouter();
  const { campaignId } = useParams();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  
  // Campaign & Projects data
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
  
  // New states for additional functionality
  const [campaignAdmins, setCampaignAdmins] = useState([]);
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [adminToRemove, setAdminToRemove] = useState('');
  const [userVoteHistory, setUserVoteHistory] = useState<Vote[]>([]);
  const [voteHistoryVisible, setVoteHistoryVisible] = useState(false);
  const [sortedProjects, setSortedProjects] = useState<Project[]>([]);
  const [showWinningProjectsPreview, setShowWinningProjectsPreview] = useState(false);
  
  // UI state
  const [projectFilter, setProjectFilter] = useState('all'); // 'all', 'pending', 'approved'
  const [confirmModal, setConfirmModal] = useState({ visible: false, action: '', projectId: -1 });
  const [distributeFundsModal, setDistributeFundsModal] = useState(false);
  const [adminManagementModal, setAdminManagementModal] = useState(false);
  const [invalidAddressError, setInvalidAddressError] = useState('');
  
  // New state for tabs
  const [activeTab, setActiveTab] = useState('campaign'); // 'campaign', 'distribution', 'projects'
  
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
  } = useSovereignSeas();
  
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

          // Load sorted projects immediately for distribution tab
          const sorted = await getSortedProjects(Number(campaignId));
          setSortedProjects(sorted);
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
  
  const handleApproveProject = async (projectId: number | bigint) => {
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 text-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mb-3" />
          <p className="text-md text-emerald-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (!campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 text-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center text-center max-w-md mx-auto p-5 bg-white rounded-xl shadow-sm">
          <XCircle className="h-12 w-12 text-red-400 mb-3" />
          <h1 className="text-xl font-bold mb-2">Campaign Not Found</h1>
          <p className="text-gray-600 mb-5">The campaign you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => router.push('/campaigns')}
            className="px-5 py-2 bg-emerald-500 text-white text-sm rounded-full hover:bg-emerald-600 transition-all shadow-sm"
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
  
  // Distribution calculations
  const platformFee = Number(totalFunds) * 0.15;
  const adminFee = Number(totalFunds) * Number(campaign.adminFeePercentage) / 100;
  const distributableFunds = Number(totalFunds) * (1 - 0.15 - Number(campaign.adminFeePercentage) / 100);
  
  // Check for campaign media
  const hasCampaignMedia = campaign.logo?.trim().length > 0 || campaign.demoVideo?.trim().length > 0;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 text-gray-800">
      <div className="container mx-auto px-4 py-6">
        {/* Admin Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <button
                  onClick={() => router.push(`/campaign/${campaignId}/dashboard`)}
                  className="inline-flex items-center text-gray-500 hover:text-emerald-600 text-sm"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Back
                </button>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full inline-flex items-center">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin View
                </span>
                
                {isSuperAdmin && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full inline-flex items-center">
                    <Shield className="h-3 w-3 mr-1" />
                    Super Admin
                  </span>
                )}
              </div>
              
              <div className="flex items-center">
                <h1 className="text-2xl font-bold mb-2 tilt-neon">{campaign.name}</h1>
                
                {/* Media indicators */}
                {hasCampaignMedia && (
                  <div className="flex items-center ml-2 gap-1">
                    {campaign.logo && (
                      <span className="text-blue-500">
                        <Image className="h-3.5 w-3.5" />
                      </span>
                    )}
                    {campaign.demoVideo && (
                      <span className="text-red-500">
                        <Video className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              <p className="text-gray-600 mb-3 text-sm">{campaign.description}</p>
              
              {/* Campaign Status */}
              <div className="flex flex-wrap gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center ${
                  hasStarted && !hasEnded
                    ? 'bg-green-100 text-green-700'
                    : hasEnded
                      ? 'bg-gray-100 text-gray-700'
                      : 'bg-amber-100 text-amber-700'
                }`}>
                  <Clock className="h-3 w-3 mr-1" />
                  {hasEnded ? 'Ended' : hasStarted ? 'Active' : 'Upcoming'}
                </span>
                
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 inline-flex items-center">
                  <Users className="h-3 w-3 mr-1" />
                  {approvedProjects} Approved / {pendingProjects} Pending
                </span>
                
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 inline-flex items-center">
                  <Award className="h-3 w-3 mr-1" />
                  {campaign.useQuadraticDistribution ? 'Quadratic' : 'Linear'} Distribution
                </span>
                
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 inline-flex items-center">
                  <Droplets className="h-3 w-3 mr-1" />
                  {totalFunds} CELO
                </span>
              </div>
            </div>
          </div>
          
          {/* Timeline Bar */}
          <div className="mt-6 bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2 text-sm">
              <div className="flex items-center text-gray-600">
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                Start: {formatCampaignTime(campaign.startTime)}
              </div>
              <div className="flex items-center text-gray-600">
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                End: {formatCampaignTime(campaign.endTime)}
              </div>
            </div>
            
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              {hasEnded ? (
                <div className="h-full bg-emerald-500 w-full"></div>
              ) : hasStarted ? (
                <div 
                  className="h-full bg-emerald-500" 
                  style={{ 
                    width: `${Math.min(
                      100, 
                      ((now - Number(campaign.startTime)) / 
                      (Number(campaign.endTime) - Number(campaign.startTime))) * 100
                    )}%` 
                  }}
                ></div>
              ) : (
                <div className="h-full bg-gray-300 w-0"></div>
              )}
            </div>
            
            {hasStarted && !hasEnded && (
              <div className="mt-2 text-center text-amber-600 text-xs font-medium">
                Time remaining: {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m
              </div>
            )}
          </div>
        </div>
        
        {/* Status Message */}
        {statusMessage.text && (
          <div className={`mb-4 p-3 rounded-lg text-sm shadow-sm ${
            statusMessage.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            <div className="flex items-start">
              {statusMessage.type === 'success' ? (
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              )}
              <p>
                {statusMessage.text}
              </p>
            </div>
          </div>
        )}
        
        {/* Tabbed Interface */}
        <div className="mb-5 bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('campaign')}
              className={`flex-1 py-3 px-4 text-sm font-medium ${
                activeTab === 'campaign' 
                  ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center">
                <Layers className="h-4 w-4 mr-2" />
                Campaign Summary
              </div>
            </button>
            <button
              onClick={() => setActiveTab('distribution')}
              className={`flex-1 py-3 px-4 text-sm font-medium ${
                activeTab === 'distribution' 
                  ? 'text-purple-600 border-b-2 border-purple-500 bg-purple-50' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center">
                <CircleDollarSign className="h-4 w-4 mr-2" />
                Distribution Summary
              </div>
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`flex-1 py-3 px-4 text-sm font-medium ${
                activeTab === 'projects' 
                  ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center">
                <ListChecks className="h-4 w-4 mr-2" />
                Project Management
              </div>
            </button>
          </div>
          
          {/* Campaign Summary Tab */}
          {activeTab === 'campaign' && (
            <div className="p-5">
              <div className="flex flex-col lg:flex-row gap-5">
                {/* Admin Actions Panel */}
                <div className="lg:w-1/3">
                  <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm mb-5 hover:shadow-md transition-shadow">
                    <h2 className="text-lg font-semibold mb-4 text-amber-600 flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      Admin Actions
                    </h2>
                    
                    <div className="space-y-3">
                      {canDistributeFunds && (
                        <button
                          onClick={() => setDistributeFundsModal(true)}
                          className="w-full py-2 rounded-full text-sm bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors flex items-center justify-center shadow-sm"
                        >
                          <Award className="h-4 w-4 mr-1.5" />
                          Distribute Funds
                        </button>
                      )}
                      
                      {hasEnded && !canDistributeFunds && (
                        <div className="w-full py-2 rounded-full text-sm bg-gray-100 text-gray-500 font-medium flex items-center justify-center border border-gray-200">
                          <AlertTriangle className="h-4 w-4 mr-1.5 text-amber-500" />
                          Funds Already Distributed
                        </div>
                      )}
                      
                      <button
                        onClick={() => router.push(`/campaign/${campaignId}/edit`)}
                        className="w-full py-2 rounded-full text-sm bg-white text-gray-700 font-medium border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center shadow-sm"
                      >
                        <Settings className="h-4 w-4 mr-1.5" />
                        Edit Campaign
                      </button>
                      
                      <button
                        onClick={() => setAdminManagementModal(true)}
                        className="w-full py-2 rounded-full text-sm bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors flex items-center justify-center shadow-sm"
                      >
                        <Users className="h-4 w-4 mr-1.5" />
                        Manage Admins
                      </button>
                      
                      <button
                        onClick={() => setVoteHistoryVisible(!voteHistoryVisible)}
                        className={`w-full py-2 rounded-full text-sm font-medium transition-colors flex items-center justify-center shadow-sm ${voteHistoryVisible ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
                      >
                        <History className="h-4 w-4 mr-1.5" />
                        {voteHistoryVisible ? 'Hide Vote History' : 'View Vote History'}
                      </button>
                      
                      {hasStarted && (
                        <button
                          onClick={() => {
                            setShowWinningProjectsPreview(!showWinningProjectsPreview);
                          }}
                          className={`w-full py-2 rounded-full text-sm font-medium transition-colors flex items-center justify-center shadow-sm ${showWinningProjectsPreview ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                        >
                          <Award className="h-4 w-4 mr-1.5" />
                          {showWinningProjectsPreview ? 'Hide Rankings' : 'Preview Rankings'}
                        </button>
                      )}
                      
                      <button
                        onClick={() => router.push(`/campaign/${campaignId}/export`)}
                        className="w-full py-2 rounded-full text-sm bg-white text-gray-500 font-medium border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center shadow-sm"
                      >
                        <Download className="h-4 w-4 mr-1.5" />
                        Export Campaign Data
                      </button>
                    </div>
                    
                    {!hasEnded && (
                      <div className="mt-4 p-2.5 bg-blue-50 rounded-lg text-xs">
                        <p className="text-blue-700">
                          <Info className="h-3.5 w-3.5 text-blue-500 inline mr-1" />
                          Funds can be distributed after the campaign ends on {formatCampaignTime(campaign.endTime)}.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Campaign Stats */}
                  <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <h2 className="text-lg font-semibold mb-4 text-emerald-600 flex items-center">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Campaign Stats
                    </h2>
                    
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Total Projects:</span>
                        <span className="font-medium text-gray-800">{totalProjects}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Pending Approval:</span>
                        <span className="font-medium text-amber-600">{pendingProjects}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Approved Projects:</span>
                        <span className="font-medium text-emerald-600">{approvedProjects}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Total Votes:</span>
                        <span className="font-medium text-gray-800">{totalVotes}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Total Funds:</span>
                        <span className="font-medium text-emerald-600">{totalFunds} CELO</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Admin Fee:</span>
                        <span className="font-medium text-gray-800">{campaign.adminFeePercentage.toString()}%</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Platform Fee:</span>
                        <span className="font-medium text-gray-800">15%</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Max Winners:</span>
                        <span className="font-medium text-gray-800">
                          {campaign.maxWinners.toString() === '0' ? 'All Projects' : campaign.maxWinners.toString()}
                        </span>
                      </div>
                      
                      {/* Media Info */}
                      {hasCampaignMedia && (
                        <>
                          <div className="border-t border-gray-100 pt-2.5 mt-2.5">
                            <span className="text-gray-600 font-medium text-sm">Media Content:</span>
                          </div>
                          {campaign.logo && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600 flex items-center">
                                <Image className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                                Logo:
                              </span>
                              <span className="font-medium text-blue-600">Available</span>
                            </div>
                          )}
                          {campaign.demoVideo && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600 flex items-center">
                                <Video className="h-3.5 w-3.5 mr-1.5 text-red-500" />
                                Demo Video:
                              </span>
                              <span className="font-medium text-red-600">Available</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Vote History and Project Ranking */}
                <div className="lg:w-2/3 space-y-5">
                  {/* Vote History Section (Conditionally Rendered) */}
                  {voteHistoryVisible && (
                    <div className="bg-white rounded-xl p-5 border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
                      <h2 className="text-lg font-semibold mb-4 text-purple-600 flex items-center">
                        <History className="h-4 w-4 mr-2" />
                        Your Vote History
                      </h2>
                      
                      {userVoteHistory.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-gray-500 text-sm">You haven't voted in this campaign yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {userVoteHistory.map((vote, index) => {
                            const project = allProjects.find(p => p.id.toString() === vote.projectId.toString());
                            return (
                              <div key={index} className="bg-purple-50 rounded-lg p-2.5 text-sm">
                                <div className="flex items-center mb-1">
                                  <MousePointerClick className="h-3 w-3 text-purple-500 mr-1.5" />
                                  <span className="font-medium text-gray-700">
                                    {project ? project.name : `Project #${vote.projectId.toString()}`}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500">Amount:</span>
                                  <span className="text-emerald-600 font-medium">
                                    {formatTokenAmount(vote.amount)} CELO
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500">Vote Count:</span>
                                  <span className="text-purple-600 font-medium">
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
                    <div className="bg-white rounded-xl p-5 border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
                      <h2 className="text-lg font-semibold mb-4 text-emerald-600 flex items-center">
                        <Award className="h-4 w-4 mr-2" />
                        Project Rankings
                      </h2>
                      
                      {sortedProjects.length === 0 ? (
                        <div className="text-center py-4">
                          <Loader2 className="h-6 w-6 text-emerald-500 animate-spin mb-2 mx-auto" />
                          <p className="text-gray-500 text-sm">Loading project rankings...</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {sortedProjects.map((project, index) => (
                            <div 
                              key={project.id.toString()} 
                              className={`bg-white rounded-lg p-3 shadow-sm ${index < Number(campaign.maxWinners) && campaign.maxWinners.toString() !== '0' ? 'border border-emerald-200 ring-1 ring-emerald-100' : 'border border-gray-100'}`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium flex items-center text-sm">
                                  {index + 1}.{' '}
                                  {index < Number(campaign.maxWinners) && campaign.maxWinners.toString() !== '0' && (
                                    <Award className="h-3 w-3 text-amber-500 ml-1" />
                                  )}
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                                  {formatTokenAmount(project.voteCount)} votes
                                </span>
                              </div>
                              <div className="font-medium text-gray-800 text-sm">{project.name}</div>
                              <div className="text-xs text-gray-500 truncate mt-1">
                                Owner: {project.owner.slice(0, 6)}...{project.owner.slice(-4)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {campaign.maxWinners.toString() !== '0' && sortedProjects.length > 0 && (
                        <div className="mt-4 p-2.5 bg-emerald-50 rounded-lg">
                          <p className="text-xs text-emerald-700 flex items-start">
                            <Info className="h-3.5 w-3.5 text-emerald-500 mr-1.5 flex-shrink-0 mt-0.5" />
                            Top {campaign.maxWinners.toString()} projects will receive funds based on {campaign.useQuadraticDistribution ? 'quadratic' : 'linear'} distribution.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Distribution Summary Tab - IMPROVED */}
          {activeTab === 'distribution' && (
            <div className="p-5">
              <div className="flex flex-col lg:flex-row gap-5">
                {/* Distribution Summary */}
                <div className="lg:w-1/2">
                  <div className="bg-white rounded-xl p-5 border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
                    <h2 className="text-lg font-semibold mb-4 text-purple-600 flex items-center">
                      <CircleDollarSign className="h-4 w-4 mr-2" />
                      Funds Allocation
                    </h2>
                    
                    <div className="space-y-4">
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h3 className="font-medium text-purple-700 mb-3 text-sm">Total Funds: {totalFunds} CELO</h3>
                        
                        <div className="space-y-3">
                          {/* Platform Fee */}
                          <div>
                            <div className="flex justify-between items-center text-xs text-gray-600 mb-1">
                              <span>Platform Fee (15%)</span>
                              <span className="font-medium">{platformFee.toFixed(2)} CELO</span>
                            </div>
                            <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gray-400" 
                                style={{ width: `15%` }}
                              ></div>
                            </div>
                          </div>
                          
                          {/* Admin Fee */}
                          <div>
                            <div className="flex justify-between items-center text-xs text-gray-600 mb-1">
                              <span>Admin Fee ({campaign.adminFeePercentage.toString()}%)</span>
                              <span className="font-medium">{adminFee.toFixed(2)} CELO</span>
                            </div>
                            <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-amber-400" 
                                style={{ width: `${Number(campaign.adminFeePercentage)}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          {/* Project Distribution */}
                          <div>
                            <div className="flex justify-between items-center text-xs text-gray-600 mb-1">
                              <span>Projects ({(100 - 15 - Number(campaign.adminFeePercentage)).toFixed(0)}%)</span>
                              <span className="font-medium">{distributableFunds.toFixed(2)} CELO</span>
                            </div>
                            <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-400" 
                                style={{ width: `${100 - 15 - Number(campaign.adminFeePercentage)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h3 className="font-medium text-blue-700 mb-2 text-sm">Distribution Settings</h3>
                        
                        <div className="space-y-3 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Distribution Method:</span>
                            <span className="font-medium text-gray-800">
                              {campaign.useQuadraticDistribution ? 'Quadratic (√votes)' : 'Linear (proportional to votes)'}
                            </span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-gray-600">Maximum Winners:</span>
                            <span className="font-medium text-gray-800">
                              {campaign.maxWinners.toString() === '0' ? 'All Projects' : `Top ${campaign.maxWinners.toString()}`}
                            </span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span className="text-gray-600">Projects with Votes:</span>
                            <span className="font-medium text-gray-800">
                              {sortedProjects.filter(p => Number(formatTokenAmount(p.voteCount)) > 0).length} of {sortedProjects.length}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {canDistributeFunds && (
                        <div className="p-4 bg-amber-50 rounded-lg text-amber-700 text-sm border border-amber-200">
                          <div className="flex items-start">
                            <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium mb-1">Ready to Distribute Funds</p>
                              <p className="text-xs">
                                The campaign has ended and funds can now be distributed to winning projects.
                                This action cannot be undone.
                              </p>
                              <button
                                onClick={() => setDistributeFundsModal(true)}
                                className="mt-2 px-4 py-1.5 rounded-full text-xs bg-amber-500 text-white hover:bg-amber-600 transition-colors flex items-center shadow-sm"
                              >
                                <Award className="h-3.5 w-3.5 mr-1.5" />
                                Distribute Funds Now
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {hasEnded && !canDistributeFunds && (
                        <div className="p-4 bg-emerald-50 rounded-lg text-emerald-700 text-xs border border-emerald-200">
                          <div className="flex items-start">
                            <CheckCircle className="h-4 w-4 text-emerald-500 mr-2 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium mb-1">Funds Successfully Distributed</p>
                              <p>
                                Funds have been distributed to projects based on the
                                {campaign.useQuadraticDistribution ? ' quadratic ' : ' linear '} 
                                voting results. This action cannot be reversed.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Distribution Visualization with clear table */}
                <div className="lg:w-1/2">
                  <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <h2 className="text-lg font-semibold mb-3 text-gray-700 flex items-center">
                      <PieChart className="h-4 w-4 mr-2" />
                      Funds Breakdown
                    </h2>
                    
                    {/* Donut Chart Visualization */}
                    <div className="relative aspect-square max-w-xs mx-auto mb-4">
                      {/* This would be better with a real chart component, but for now we'll use a CSS visualization */}
                      <div className="w-full h-full rounded-full border-16 border-emerald-300 flex items-center justify-center">
                        <div className="w-3/4 h-3/4 rounded-full border-12 border-amber-300 flex items-center justify-center">
                          <div className="w-1/2 h-1/2 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-700">
                            {totalFunds} CELO
                          </div>
                        </div>
                      </div>
                      
                      {/* Labels */}
                      <div className="absolute bottom-0 right-0 flex flex-col gap-1 text-xs">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-emerald-300 mr-1"></div>
                          <span>Projects: {distributableFunds.toFixed(2)} CELO</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-amber-300 mr-1"></div>
                          <span>Admin: {adminFee.toFixed(2)} CELO</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-gray-300 mr-1"></div>
                          <span>Platform: {platformFee.toFixed(2)} CELO</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Distribution Results Table */}
                    {hasEnded && !canDistributeFunds && sortedProjects.filter(project => Number(formatTokenAmount(project.fundsReceived)) > 0).length > 0 && (
                      <div className="mt-5">
                        <h3 className="font-medium text-gray-700 mb-2 text-sm border-b pb-2">Distribution Results</h3>
                        <div className="overflow-x-auto max-h-80">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Rank
                                </th>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Project
                                </th>
                                <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Votes
                                </th>
                                <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Funds Received
                                </th>
                                <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  %
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 text-xs">
                              {sortedProjects
                                .filter(project => Number(formatTokenAmount(project.fundsReceived)) > 0)
                                .map((project, index) => (
                                  <tr key={project.id.toString()} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <span className="font-medium text-gray-700">{index + 1}</span>
                                        {index < 3 && <Award className="h-3 w-3 text-amber-500 ml-1" />}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                                        {project.name}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-right">
                                      <span className="font-medium text-purple-600">
                                        {formatTokenAmount(project.voteCount)}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-right">
                                      <span className="font-medium text-emerald-600">
                                        {formatTokenAmount(project.fundsReceived)} CELO
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-right">
                                      <span className="text-gray-500">
                                        {(Number(formatTokenAmount(project.fundsReceived)) / distributableFunds * 100).toFixed(1)}%
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                        
                        {/* Summary footer */}
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
                          <div className="flex justify-between font-medium">
                            <span>Total Projects Funded:</span>
                            <span>{sortedProjects.filter(project => Number(formatTokenAmount(project.fundsReceived)) > 0).length}</span>
                          </div>
                          <div className="flex justify-between font-medium mt-1">
                            <span>Total CELO Distributed:</span>
                            <span className="text-emerald-600">
                              {sortedProjects.reduce((sum, project) => sum + Number(formatTokenAmount(project.fundsReceived)), 0).toFixed(2)} CELO
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* If no projects received funds but distribution happened */}
                    {hasEnded && !canDistributeFunds && sortedProjects.filter(project => Number(formatTokenAmount(project.fundsReceived)) > 0).length === 0 && (
                      <div className="mt-4 p-4 bg-amber-50 rounded-lg text-amber-700 text-sm border border-amber-200">
                        <div className="flex items-start">
                          <Info className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium">No Projects Received Funds</p>
                            <p className="text-xs mt-1">
                              Funds have been distributed, but no projects received funds. This may have happened because no 
                              projects received votes or all projects were disqualified.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* If distribution hasn't happened yet, show projected distribution */}
                    {(!hasEnded || canDistributeFunds) && (
                      <div className="mt-3 border-t pt-3">
                        <h3 className="font-medium text-amber-600 mb-2 text-sm flex items-center">
                          <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                          Projected Distribution (Preview)
                        </h3>
                        <p className="text-xs text-gray-500 mb-3">
                          This is an estimate of how funds will be distributed based on current votes.
                          Actual distribution may vary.
                        </p>
                        
                        {sortedProjects.length === 0 ? (
                          <div className="text-center py-4">
                            <p className="text-gray-500 text-xs">No projects with votes yet.</p>
                          </div>
                        ) : (
                          <div className="max-h-64 overflow-y-auto pr-1">
                            {sortedProjects
                              .filter(p => Number(formatTokenAmount(p.voteCount)) > 0)
                              .slice(0, campaign.maxWinners.toString() === '0' ? undefined : Number(campaign.maxWinners))
                              .map((project, index) => {
                                // Calculate estimated share
                                const totalProjectVotes = sortedProjects
                                  .slice(0, campaign.maxWinners.toString() === '0' ? undefined : Number(campaign.maxWinners))
                                  .reduce((sum, p) => sum + Number(formatTokenAmount(p.voteCount)), 0);
                                
                                const projectShare = totalProjectVotes > 0 
                                  ? (Number(formatTokenAmount(project.voteCount)) / totalProjectVotes) * distributableFunds 
                                  : 0;
                                
                                return (
                                  <div 
                                    key={project.id.toString()} 
                                    className="mb-2 bg-gray-50 rounded-lg p-2.5 text-xs"
                                  >
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="font-medium text-gray-700">
                                        {index + 1}. {project.name}
                                      </span>
                                      <span className="text-purple-600 font-medium">
                                        {formatTokenAmount(project.voteCount)} votes
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <div className="flex-grow h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-emerald-400 rounded-full" 
                                          style={{ 
                                            width: `${totalProjectVotes > 0 ? (Number(formatTokenAmount(project.voteCount)) / totalProjectVotes) * 100 : 0}%` 
                                          }}
                                        ></div>
                                      </div>
                                      <span className="text-emerald-600 font-medium min-w-[80px] text-right">
                                        ~{projectShare.toFixed(2)} CELO
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Project Management Tab */}
          {activeTab === 'projects' && (
            <div className="p-5">
              <div className="mb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <h2 className="text-lg font-semibold text-amber-600 flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Project Management
                </h2>
                
                {/* Filter Controls */}
                <div className="relative inline-block w-full md:w-auto text-left">
                  <div className="flex">
                    <button
                      onClick={() => setProjectFilter('pending')}
                      className={`px-3 py-1.5 text-xs rounded-l-full flex-1 shadow-sm ${
                        projectFilter === 'pending' 
                          ? 'bg-amber-500 text-white' 
                          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      Pending ({pendingProjects})
                    </button>
                    <button
                      onClick={() => setProjectFilter('approved')}
                      className={`px-3 py-1.5 text-xs flex-1 shadow-sm ${
                        projectFilter === 'approved' 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-white text-gray-600 border-t border-b border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      Approved ({approvedProjects})
                    </button>
                    <button
                      onClick={() => setProjectFilter('all')}
                      className={`px-3 py-1.5 text-xs rounded-r-full flex-1 shadow-sm ${
                        projectFilter === 'all' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      All ({totalProjects})
                    </button>
                  </div>
                </div>
              </div>
              
              {/* No Projects Message */}
              {filteredProjects.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-gray-500 mb-1 text-sm">No {projectFilter !== 'all' ? projectFilter : ''} projects found.</p>
                  {projectFilter === 'pending' && (
                    <p className="text-gray-400 text-xs">
                      All projects have been reviewed. Check the "Approved" or "All" tabs.
                    </p>
                  )}
                </div>
              )}
              
              {/* Project List */}
              {filteredProjects.map((project) => (
                <div 
                  key={project.id.toString()} 
                  className="bg-white rounded-xl p-4 mb-3 border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex-grow">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-gray-800">{project.name}</h3>
                        {project.approved ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                            Approved
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                            Pending Approval
                          </span>
                        )}
                        
                        {/* Media indicators */}
                        {(project.logo || project.demoVideo) && (
                          <div className="flex items-center gap-1">
                            {project.logo && (
                              <span className="text-blue-500">
                                <Image className="h-3 w-3" />
                              </span>
                            )}
                            {project.demoVideo && (
                              <span className="text-red-500">
                                <Video className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mt-1 mb-2 text-sm">{project.description}</p>
                      
                      <div className="flex flex-wrap gap-y-1.5 gap-x-3 text-xs mb-2">
                        {project.githubLink && (
                          <a 
                            href={project.githubLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 flex items-center"
                          >
                            <Github className="h-3.5 w-3.5 mr-1" />
                            GitHub
                          </a>
                        )}
                        
                        {project.socialLink && (
                          <a 
                            href={project.socialLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 flex items-center"
                          >
                            <Globe className="h-3.5 w-3.5 mr-1" />
                            Social
                          </a>
                        )}
                        
                        {project.testingLink && (
                          <a 
                            href={project.testingLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 flex items-center"
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" />
                            Demo
                          </a>
                        )}
                        
                        {/* Show contract count if there are any contracts */}
                        {project.contracts && project.contracts.length > 0 && (
                          <span className="text-purple-600 flex items-center">
                            <Code className="h-3.5 w-3.5 mr-1" />
                            {project.contracts.length} Contract{project.contracts.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center text-xs text-gray-500">
                        <User className="h-3 w-3 mr-1" />
                        Submitted by: {project.owner.slice(0, 6)}...{project.owner.slice(-4)}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-start md:items-end">
                      {project.approved && (
                        <div className="bg-emerald-50 rounded-lg px-3 py-2 text-center min-w-[100px] mb-2">
                          <div className="text-lg font-bold text-emerald-600">
                          {formatTokenAmount(project.voteCount)}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">VOTES</div>
                        </div>
                      )}
                      
                      <div className="flex gap-2 w-full md:w-auto">
                        <button
                          onClick={() => router.push(`/campaign/${campaignId}/project/${project.id}`)}
                          className="px-3 py-1.5 bg-white text-gray-600 rounded-full text-xs border border-gray-200 hover:bg-gray-50 transition-colors flex items-center flex-1 justify-center shadow-sm"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View
                        </button>
                        
                        {!project.approved && (
                          <button
                            onClick={() => setConfirmModal({ 
                              visible: true, 
                              action: 'approve', 
                              projectId: Number(project.id) 
                            })}
                            className="px-3 py-1.5 bg-emerald-500 text-white rounded-full text-xs hover:bg-emerald-600 transition-colors flex items-center flex-1 justify-center shadow-sm"
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Confirm Action Modal */}
      {confirmModal.visible && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md p-5 relative shadow-lg">
            <button 
              onClick={() => setConfirmModal({ visible: false, action: '', projectId: -1 })} 
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-5 w-5" />
            </button>
            
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Confirm Action</h3>
            
            {confirmModal.action === 'approve' && (
              <>
                <p className="text-gray-600 mb-5 text-sm">
                  Are you sure you want to approve this project? Once approved, it will be visible to all users and eligible for voting.
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApproveProject(confirmModal.projectId)}
                    disabled={isWritePending || isWaitingForTx}
                    className="flex-1 py-2 px-4 bg-emerald-500 text-white text-sm font-medium rounded-full hover:bg-emerald-600 transition-colors disabled:bg-gray-300 disabled:text-gray-500 shadow-sm"
                  >
                    {isWritePending || isWaitingForTx ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        Processing...
                      </div>
                    ) : (
                      'Approve Project'
                    )}
                  </button>
                  
                  <button
                    onClick={() => setConfirmModal({ visible: false, action: '', projectId: -1 })}
                    className="py-2 px-4 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-full hover:bg-gray-50 transition-colors shadow-sm"
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg p-5 relative shadow-lg">
            <button 
              onClick={() => {
                setAdminManagementModal(false);
                setNewAdminAddress('');
                setInvalidAddressError('');
              }} 
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-5 w-5" />
            </button>
            
            <h3 className="text-lg font-semibold mb-1 text-gray-800">Manage Campaign Admins</h3>
            <p className="text-blue-600 font-medium mb-4 text-sm">{campaign.name}</p>
            
            <div className="mb-5">
              <h4 className="font-medium text-gray-700 mb-2 text-sm">Add New Admin</h4>
              
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Admin Wallet Address</label>
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
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-l-lg px-3 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                  />
                  <button
                    onClick={handleAddAdmin}
                    disabled={isWritePending || !newAdminAddress}
                    className="bg-blue-500 text-white px-3 py-2 rounded-r-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500 flex items-center shadow-sm"
                  >
                    {isWritePending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {invalidAddressError && (
                  <p className="text-red-500 text-xs mt-1">{invalidAddressError}</p>
                )}
              </div>
            </div>
            
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2 text-sm">Current Admins</h4>
              
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="mb-2 flex items-center">
                  <Shield className="h-3.5 w-3.5 text-amber-500 mr-1.5" />
                  <span className="text-amber-600 text-xs font-medium">Campaign Owner</span>
                </div>
                <div className="flex items-center justify-between bg-white rounded-lg p-2 mb-2 shadow-sm">
                  <span className="font-mono text-gray-800 text-xs">{campaign.admin}</span>
                </div>
                
                {/* Campaign admins would be listed here */}
                <div className="mt-3 mb-2 flex items-center">
                  <Users className="h-3.5 w-3.5 text-blue-500 mr-1.5" />
                  <span className="text-blue-600 text-xs font-medium">Additional Admins</span>
                </div>
                
                {/* This would be populated from the blockchain */}
                <p className="text-gray-500 text-xs italic">
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
                className="w-full py-2 px-4 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-full hover:bg-gray-50 transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Distribute Funds Modal */}
      {distributeFundsModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg p-5 relative shadow-lg">
            <button 
              onClick={() => setDistributeFundsModal(false)} 
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-5 w-5" />
            </button>
            
            <h3 className="text-lg font-semibold mb-1 text-gray-800">Distribute Campaign Funds</h3>
            <p className="text-amber-600 font-medium mb-4 text-sm">{campaign.name}</p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-5 shadow-sm">
              <h4 className="font-medium text-gray-700 mb-2 text-sm">Distribution Summary</h4>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Funds:</span>
                  <span className="text-emerald-600 font-medium">{totalFunds} CELO</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform Fee (15%):</span>
                  <span className="text-gray-800">{platformFee.toFixed(2)} CELO</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Admin Fee ({campaign.adminFeePercentage.toString()}%):</span>
                  <span className="text-gray-800">{adminFee.toFixed(2)} CELO</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-gray-600">Distributable to Projects:</span>
                  <span className="text-gray-800">
                    {distributableFunds.toFixed(2)} CELO
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Distribution Method:</span>
                  <span className="text-gray-800">{campaign.useQuadraticDistribution ? 'Quadratic' : 'Linear'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Max Winners:</span>
                  <span className="text-gray-800">
                    {campaign.maxWinners.toString() === '0' ? 'All Projects' : `Top ${campaign.maxWinners.toString()}`}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
              <div className="flex items-start">
                <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-700 font-medium mb-1 text-xs">Important</p>
                  <p className="text-amber-600 text-xs">
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
                className="flex-1 py-2 px-4 bg-amber-500 text-white text-sm font-medium rounded-full hover:bg-amber-600 transition-colors disabled:bg-gray-300 disabled:text-gray-500 shadow-sm"
              >
                {isWritePending || isWaitingForTx ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Processing Distribution...
                  </div>
                ) : (
                  'Distribute Funds Now'
                )}
              </button>
              
              <button
                onClick={() => setDistributeFundsModal(false)}
                className="py-2 px-4 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-full hover:bg-gray-50 transition-colors shadow-sm"
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