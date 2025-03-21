'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { 
  BarChart3, 
  Calendar, 
  Clock, 
  Download, 
  FileText, 
  Github, 
  Globe, 
  PieChart, 
  Plus, 
  Settings, 
  Share2, 
  Users, 
  BarChart,
  Award,
  Droplets,
  X,
  Eye,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  Info,
  AlertTriangle,
  Image as ImageIcon,
  Video,
  Code,
  History,
  MousePointerClick,
  Wallet,
  Filter,
  RefreshCw,
  TrendingDown,
  LineChart
} from 'lucide-react';
import { useSovereignSeas } from '../../../../hooks/useSovereignSeas';

// Placeholder for the contract addresses - replace with your actual addresses
// Contract addresses - replace with actual addresses
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` 
const CELO_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_CELO_TOKEN_ADDRESS as `0x${string}` 

export default function CampaignDashboard() {
  const router = useRouter();
  const { campaignId } = useParams();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  
  // Tabs
  const [activeTab, setActiveTab] = useState('overview');
  
  // Campaign Data
  const [campaign, setCampaign] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canDistributeFunds, setCanDistributeFunds] = useState(false);
  const [fundsDistributed, setFundsDistributed] = useState(false);
  const [voteModalVisible, setVoteModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [voteAmount, setVoteAmount] = useState('');
  const [submitModalVisible, setSubmitModalVisible] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    githubLink: '',
    socialLink: '',
    testingLink: '',
    logo: '',          // Added field
    demoVideo: '',     // Added field
    contracts: [''],   // Added field
  });
  const [distributionTableVisible, setDistributionTableVisible] = useState(false);
  
  // New states for enhanced functionality
  const [userVoteHistory, setUserVoteHistory] = useState<any[]>([]);
  const [voteHistoryVisible, setVoteHistoryVisible] = useState(false);
  const [projectInfoModalVisible, setProjectInfoModalVisible] = useState(false);
  const [projectInfoData, setProjectInfoData] = useState<any>(null);
  const [userVoteStats, setUserVoteStats] = useState<any>({
    totalVotes: 0,
    projectCount: 0
  });
  const [projectSortMethod, setProjectSortMethod] = useState('votes'); // votes, newest, alphabetical
  const [projectStatusFilter, setProjectStatusFilter] = useState('approved'); // all, approved, pending
  const [sortedProjects, setSortedProjects] = useState<any[]>([]);
  const [projectRankingsVisible, setProjectRankingsVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
  
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
    vote,
    submitProject,
    distributeFunds,
    formatTokenAmount,
    formatCampaignTime,
    getCampaignTimeRemaining,
    isCampaignActive,
    isWritePending,
    isWaitingForTx,
    isTxSuccess,
    isSuperAdmin, // Added to check for super admin access
    resetWrite,
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
      if (address) {
        loadUserVoteHistory();
        loadUserVoteStats();
      }
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
  
  // Apply sorting and filtering whenever projects, sort method, or filter changes
  useEffect(() => {
    if (projects.length > 0) {
      applySortingAndFiltering();
    }
  }, [projects, projectSortMethod, projectStatusFilter]);
  
  // Load rankings when toggle is activated
  useEffect(() => {
    if (projectRankingsVisible && campaign) {
      loadProjectRankings();
    }
  }, [projectRankingsVisible, campaign]);
  
  const loadCampaignData = async () => {
    setLoading(true);
    try {
      // Load all campaigns
      const allCampaigns = await loadCampaigns();
      
      // Ensure allCampaigns is an array before using .find()
      if (Array.isArray(allCampaigns) && allCampaigns.length > 0) {
        // Find this specific campaign by ID
        const campaignData = allCampaigns.find(c => c.id.toString() === campaignId);
        
        if (campaignData) {
          setCampaign(campaignData);
          
          // Check if current user is the admin or super admin
          if (address && 
             (campaignData.admin.toLowerCase() === address.toLowerCase() || isSuperAdmin)) {
            setIsAdmin(true);
          }
          
          // Check if funds can be distributed (campaign ended & is admin)
          const now = Math.floor(Date.now() / 1000);
          if (campaignData.active && now > Number(campaignData.endTime)) {
            setCanDistributeFunds(isAdmin);
          }
          
          // Load projects
          if (campaignId) {
            const projectsData = await loadProjects(Number(campaignId));
            
            // Check if funds have been distributed
            const hasDistributed = !campaignData.active || 
                                  projectsData.some(p => Number(p.fundsReceived) > 0);
            setFundsDistributed(hasDistributed);
            setCanDistributeFunds(isAdmin && !hasDistributed && now > Number(campaignData.endTime));
            
            // Show distribution table if funds were distributed
            if (hasDistributed) {
              setDistributionTableVisible(true);
            }
            
            setProjects(projectsData);
          } else {
            console.error('Campaign ID is undefined');
          }
       
        } else {
          console.error('Campaign not found');
        }
      } else {
        console.log('No campaigns available or still loading');
      }
    } catch (error) {
      console.error('Error loading campaign data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadUserVoteHistory = async () => {
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
  
  const loadUserVoteStats = async () => {
    try {
      if (address && campaignId) {
        const totalVotes = await getUserTotalVotesInCampaign(Number(campaignId));
        
        // Calculate how many projects the user has voted for
        const votedProjects = new Set();
        userVoteHistory.forEach(vote => {
          if (vote.campaignId.toString() === campaignId) {
            votedProjects.add(vote.projectId.toString());
          }
        });
        
        setUserVoteStats({
          totalVotes: formatTokenAmount(totalVotes),
          projectCount: votedProjects.size
        });
      }
    } catch (error) {
      console.error('Error loading user vote stats:', error);
    }
  };
  
  const loadProjectRankings = async () => {
    try {
      if (campaign) {
        const ranked = await getSortedProjects(Number(campaignId));
        setSortedProjects(ranked);
      }
    } catch (error) {
      console.error('Error loading project rankings:', error);
      setStatusMessage({
        text: 'Error loading project rankings. Please try again.',
        type: 'error'
      });
    }
  };
  
  const applySortingAndFiltering = () => {
    // First filter
    let filtered = [...projects];
    
    if (projectStatusFilter === 'approved') {
      filtered = filtered.filter(p => p.approved);
    } else if (projectStatusFilter === 'pending') {
      filtered = filtered.filter(p => !p.approved);
    }
    
    // Then sort
    let sorted;
    
    switch (projectSortMethod) {
      case 'votes':
        sorted = filtered.sort((a, b) => Number(b.voteCount) - Number(a.voteCount));
        break;
      case 'newest':
        // This would ideally use a timestamp; for now we'll use ID as a proxy
        sorted = filtered.sort((a, b) => Number(b.id) - Number(a.id));
        break;
      case 'alphabetical':
        sorted = filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        sorted = filtered;
    }
    
    setSortedProjects(sorted);
  };
  
  const handleVote = async () => {
    if (!selectedProject || !voteAmount || parseFloat(voteAmount) <= 0 || !campaignId) return;
    
    try {
      await vote(Number(campaignId), selectedProject.id, Number(voteAmount).toString());
      setVoteModalVisible(false);
      setVoteAmount('');
      setStatusMessage({
        text: `Vote successful! You voted ${voteAmount} CELO for ${selectedProject.name}.`,
        type: 'success'
      });
      
      // After a successful vote, refresh the user's vote history and stats
      setTimeout(() => {
        loadUserVoteHistory();
        loadUserVoteStats();
        loadCampaignData(); // Refresh project vote counts
      }, 2000); // Give blockchain time to update
      
    } catch (error) {
      console.error('Error voting:', error);
      setStatusMessage({
        text: 'Error submitting vote. Please try again.',
        type: 'error'
      });
    }
  };
  
  const handleSubmitProject = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    
    if (!newProject.name || !newProject.description) return;
    
    try {
      // Filter out empty contract addresses
      const contracts = newProject.contracts.filter(c => c.trim() !== '');
      
      await submitProject(
        Number(campaignId),
        newProject.name,
        newProject.description,
        newProject.githubLink,
        newProject.socialLink,
        newProject.testingLink,
        newProject.logo,         // Added field
        newProject.demoVideo,    // Added field
        contracts                // Added field
      );
      setSubmitModalVisible(false);
      setNewProject({
        name: '',
        description: '',
        githubLink: '',
        socialLink: '',
        testingLink: '',
        logo: '',
        demoVideo: '',
        contracts: [''],
      });
      
      setStatusMessage({
        text: 'Project submitted successfully! It will be available after admin approval.',
        type: 'success'
      });
      
      // Refresh the project list after submission
      setTimeout(() => {
        loadCampaignData();
      }, 2000); // Give blockchain time to update
      
    } catch (error) {
      console.error('Error submitting project:', error);
      setStatusMessage({
        text: 'Error submitting project. Please try again.',
        type: 'error'
      });
    }
  };
  
  const handleDistributeFunds = async () => {
    if (!canDistributeFunds) return;
    
    try {
      await distributeFunds(Number(campaignId));
      
      setStatusMessage({
        text: 'Funds distributed successfully!',
        type: 'success'
      });
      
      // After funds are distributed, refresh the data and show distribution table
      setTimeout(() => {
        loadCampaignData();
        setDistributionTableVisible(true);
      }, 5000); // Wait a bit for the transaction to be mined
      
    } catch (error) {
      console.error('Error distributing funds:', error);
      setStatusMessage({
        text: 'Error distributing funds. Please try again.',
        type: 'error'
      });
    }
  };
  
  // Add/remove contract field in new project form
  const handleAddContract = () => {
    setNewProject({
      ...newProject,
      contracts: [...newProject.contracts, '']
    });
  };
  
  const handleRemoveContract = (index: number) => {
    const updatedContracts = [...newProject.contracts];
    updatedContracts.splice(index, 1);
    setNewProject({
      ...newProject,
      contracts: updatedContracts.length ? updatedContracts : ['']
    });
  };
  
  const handleContractChange = (index: number, value: string) => {
    const updatedContracts = [...newProject.contracts];
    updatedContracts[index] = value;
    setNewProject({
      ...newProject,
      contracts: updatedContracts
    });
  };
  
  // Helper function to copy campaign link to clipboard
  const shareCampaign = () => {
    const url = window.location.origin + `/campaign/${campaignId}`;
    navigator.clipboard.writeText(url);
    setStatusMessage({
      text: 'Campaign link copied to clipboard!',
      type: 'success'
    });
  };
  
  // Open the project info modal with the selected project
  const openProjectInfo = (project: any) => {
    setProjectInfoData(project);
    setProjectInfoModalVisible(true);
  };
  
  if (!isMounted) {
    return null;
  }
  
  if (loading || !campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-500 mb-4"></div>
          <p className="text-lg text-lime-300">Loading campaign data...</p>
        </div>
      </div>
    );
  }
  
  const isActive = isCampaignActive(campaign);
  const timeRemaining = getCampaignTimeRemaining(campaign);
  const now = Math.floor(Date.now() / 1000);
  const hasStarted = now >= Number(campaign.startTime);
  const hasEnded = now >= Number(campaign.endTime);
  
  // Calculate stats
  const totalProjects = projects.length;
  const approvedProjects = projects.filter(p => p.approved).length;
  const totalVotes = projects.reduce((sum, project) => sum + Number(formatTokenAmount(project.voteCount)), 0);
  const totalFunds = formatTokenAmount(campaign.totalFunds);
  
  // Sort projects by fund received (for distribution table)
  const sortedByFundsProjects = [...projects]
    .filter(p => Number(p.fundsReceived) > 0)
    .sort((a, b) => Number(b.fundsReceived) - Number(a.fundsReceived));
  
  // Calculate distribution fees
  const platformFeeAmount = Number(totalFunds) * 0.15; // 15% platform fee
  const adminFeeAmount = Number(totalFunds) * Number(campaign.adminFeePercentage) / 100;
  const distributedToProjects = Number(totalFunds) - platformFeeAmount - adminFeeAmount;
  
  // Create distribution summary
  const distributionSummary = [
    { name: "Platform Fee (15%)", amount: platformFeeAmount.toFixed(2) },
    { name: `Admin Fee (${campaign.adminFeePercentage}%)`, amount: adminFeeAmount.toFixed(2) },
    { name: "Distributed to Projects", amount: distributedToProjects.toFixed(2) },
  ];
  
  // Check if campaign has media content
  const hasCampaignMedia = campaign.logo?.trim().length > 0 || campaign.demoVideo?.trim().length > 0;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Status Message */}
        {statusMessage.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            statusMessage.type === 'success' 
              ? 'bg-green-900/30 border border-green-500/40' 
              : 'bg-red-900/30 border border-red-500/40'
          }`}>
            <div className="flex items-start">
              {statusMessage.type === 'success' ? (
                <Info className="h-5 w-5 text-green-400 mr-3 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
              )}
              <p className={statusMessage.type === 'success' ? 'text-green-300' : 'text-red-300'}>
                {statusMessage.text}
              </p>
            </div>
          </div>
        )}
        
        {/* Campaign Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center">
                <h1 className="text-3xl font-bold flex items-center">
                  <BarChart className="h-8 w-8 text-lime-500 mr-3" />
                  {campaign.name}
                </h1>
                
                {/* Media indicators */}
                {hasCampaignMedia && (
                  <div className="flex items-center ml-3 gap-1">
                    {campaign.logo && (
                      <span className="text-blue-400" title="Has Logo">
                        <ImageIcon className="h-5 w-5" />
                      </span>
                    )}
                    {campaign.demoVideo && (
                      <span className="text-red-400" title="Has Demo Video">
                        <Video className="h-5 w-5" />
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              <p className="text-slate-300 mt-2 mb-4">{campaign.description}</p>
              
              <div className="flex flex-wrap gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium inline-flex items-center ${
                  isActive 
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
                  {approvedProjects} Project{approvedProjects !== 1 ? 's' : ''}
                </span>
                
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-900/50 text-purple-400 border border-purple-500/30 inline-flex items-center">
                  <Award className="h-3.5 w-3.5 mr-1" />
                  {campaign.useQuadraticDistribution ? 'Quadratic' : 'Linear'} Distribution
                </span>
                
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-900/50 text-yellow-400 border border-yellow-500/30 inline-flex items-center">
                  <Droplets className="h-3.5 w-3.5 mr-1" />
                  {totalFunds} CELO
                </span>
                
                {fundsDistributed && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-900/50 text-green-400 border border-green-500/30 inline-flex items-center">
                    <Award className="h-3.5 w-3.5 mr-1" />
                    Funds Distributed
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={shareCampaign}
                className="px-4 py-2 rounded-lg bg-slate-700/60 text-slate-200 hover:bg-slate-700 transition-colors flex items-center"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </button>
              
              {isAdmin && (
                <button 
                  onClick={() => router.push(`/campaign/${campaignId}/admin`)}
                  className="px-4 py-2 rounded-lg bg-lime-600/60 text-white hover:bg-lime-600 transition-colors flex items-center"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Admin Panel
                </button>
              )}
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
            
            {isActive && (
              <div className="mt-2 text-center text-yellow-400">
                Time remaining: {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m
              </div>
            )}
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column - Stats and Actions */}
          <div className="lg:w-1/3">
            {/* User Vote Stats - New Component */}
            {address && isConnected && (
              <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-6 border border-purple-600/20 mb-6">
                <h2 className="text-xl font-semibold mb-4 text-purple-400 flex items-center">
                  <Wallet className="h-5 w-5 mr-2" />
                  Your Activity
                </h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Your Total Votes:</span>
                    <span className="font-semibold text-purple-400">{userVoteStats.totalVotes}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Projects Voted:</span>
                    <span className="font-semibold text-purple-400">{userVoteStats.projectCount}</span>
                  </div>
                  
                  <button
                    onClick={() => setVoteHistoryVisible(!voteHistoryVisible)}
                    className="w-full py-2 rounded-lg bg-purple-600/30 text-purple-300 font-medium hover:bg-purple-600/50 transition-colors flex items-center justify-center mt-2"
                  >
                    <History className="h-4 w-4 mr-2" />
                    {voteHistoryVisible ? 'Hide Vote History' : 'View Vote History'}
                  </button>
                  
                  {/* Vote History (conditionally rendered) */}
                  {voteHistoryVisible && (
                    <div className="mt-3 space-y-2">
                      <h3 className="text-sm font-medium text-purple-300 mb-2">Vote History</h3>
                      
                      {userVoteHistory.length === 0 ? (
                        <p className="text-slate-400 text-sm">You haven't voted in this campaign yet.</p>
                      ) : (
                        userVoteHistory.map((vote, index) => {
                          const project = projects.find(p => p.id.toString() === vote.projectId.toString());
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
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Campaign Stats */}
            <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-6 border border-lime-600/20 mb-6">
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
                  <span className="text-slate-300">Approved Projects:</span>
                  <span className="font-semibold text-white">{approvedProjects}</span>
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
                  <span className="text-slate-300">Vote Multiplier:</span>
                  <span className="font-semibold text-white">{campaign.voteMultiplier.toString()}x</span>
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
                          <ImageIcon className="h-4 w-4 mr-2 text-blue-400" />
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
                
                {/* View project rankings button */}
                <button
                  onClick={() => setProjectRankingsVisible(!projectRankingsVisible)}
                  className="w-full py-2 rounded-lg bg-blue-600/30 text-blue-300 font-medium hover:bg-blue-600/50 transition-colors flex items-center justify-center mt-4"
                >
                  <LineChart className="h-4 w-4 mr-2" />
                  {projectRankingsVisible ? 'Hide Rankings' : 'View Current Rankings'}
                </button>
                
                {/* Project Rankings Display */}
                {projectRankingsVisible && sortedProjects.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <h3 className="text-sm font-medium text-blue-300 mb-2">Current Rankings</h3>
                    
                    <div className="space-y-2 mt-3">
                      {sortedProjects.slice(0, 5).map((project, index) => (
                        <div 
                          key={project.id.toString()} 
                          className={`flex items-center justify-between bg-slate-700/40 rounded-lg p-2 ${
                            index < Number(campaign.maxWinners) && campaign.maxWinners.toString() !== '0' 
                              ? 'border border-green-500/30' 
                              : ''
                          }`}
                        >
                          <div className="flex items-center">
                            <span className={`w-6 h-6 flex items-center justify-center rounded-full ${
                              index === 0 
                                ? 'bg-yellow-500 text-slate-900' 
                                : index === 1 
                                  ? 'bg-slate-400 text-slate-900' 
                                  : index === 2 
                                    ? 'bg-amber-700 text-white' 
                                    : 'bg-slate-700 text-slate-300'
                            } mr-2 font-bold text-xs`}>
                              {index + 1}
                            </span>
                            <span className="text-sm font-medium truncate max-w-[140px]">
                              {project.name}
                            </span>
                          </div>
                          <span className="text-xs text-lime-400 font-medium">
                            {formatTokenAmount(project.voteCount)}
                          </span>
                        </div>
                      ))}
                      
                      {sortedProjects.length > 5 && (
                        <button
                          onClick={() => router.push(`/campaign/${campaignId}/leaderboard`)}
                          className="w-full text-center text-sm text-blue-400 hover:text-blue-300 pt-1"
                        >
                          View full leaderboard →
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-6 border border-lime-600/20">
              <h2 className="text-xl font-semibold mb-4 text-yellow-400 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Actions
              </h2>
              
              <div className="space-y-4">
                {isActive && (
                  <button
                    onClick={() => setSubmitModalVisible(true)}
                    className="w-full py-3 rounded-lg bg-lime-600 text-white font-semibold hover:bg-lime-500 transition-colors flex items-center justify-center"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Submit New Project
                  </button>
                )}
                
                {canDistributeFunds && (
                  <button
                    onClick={handleDistributeFunds}
                    disabled={isWritePending || isWaitingForTx}
                    className="w-full py-3 rounded-lg bg-yellow-500 text-slate-900 font-semibold hover:bg-yellow-400 transition-colors flex items-center justify-center disabled:bg-slate-500 disabled:text-slate-300"
                  >
                    {isWritePending || isWaitingForTx ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-900 mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      <>
                        <Award className="h-5 w-5 mr-2" />
                        Distribute Funds
                      </>
                    )}
                  </button>
                )}
                
                {fundsDistributed && !distributionTableVisible && (
                  <button
                    onClick={() => setDistributionTableVisible(true)}
                    className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-colors flex items-center justify-center"
                  >
                    <TrendingUp className="h-5 w-5 mr-2" />
                    View Fund Distribution
                  </button>
                )}
                
                <button
                  onClick={() => router.push(`/campaigns`)}
                  className="w-full py-3 rounded-lg bg-transparent border border-slate-500 text-slate-300 font-semibold hover:bg-slate-700 transition-colors"
                >
                  View All Campaigns
                </button>
                
                {isAdmin && (
                  <button
                    onClick={() => router.push(`/campaign/${campaignId}/export`)}
                    className="w-full py-3 rounded-lg bg-transparent border border-slate-500 text-slate-300 font-semibold hover:bg-slate-700 transition-colors flex items-center justify-center"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Export Campaign Data
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Column - Projects */}
          <div className="lg:w-2/3">
            {/* Fund Distribution Table (if funds have been distributed) */}
            {distributionTableVisible && fundsDistributed && (
              <div className="bg-slate-800/40 backdrop-blur-md rounded-xl border border-lime-600/20 overflow-hidden mb-6">
                <div className="p-6 pb-4 border-b border-slate-700 flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-yellow-400 flex items-center">
                    <Award className="h-5 w-5 mr-2" />
                    Fund Distribution Results
                  </h2>
                  <button
                    onClick={() => setDistributionTableVisible(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <ChevronUp className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="p-6 bg-slate-800/30">
                  <h3 className="text-base font-medium mb-3 text-lime-300 flex items-center">
                    <PieChart className="h-4 w-4 mr-2" />
                    Distribution Summary
                  </h3>
                  
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="py-2 px-3 text-left text-slate-300 font-medium">Category</th>
                          <th className="py-2 px-3 text-right text-slate-300 font-medium">Amount (CELO)</th>
                          <th className="py-2 px-3 text-right text-slate-300 font-medium">Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {distributionSummary.map((item, index) => (
                          <tr key={index} className={index !== distributionSummary.length - 1 ? "border-b border-slate-700/50" : ""}>
                            <td className="py-2 px-3 text-left text-white">{item.name}</td>
                            <td className="py-2 px-3 text-right text-white">{item.amount}</td>
                            <td className="py-2 px-3 text-right text-white">
                              {(Number(item.amount) / Number(totalFunds) * 100).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-600">
                          <td className="py-2 px-3 text-left font-semibold text-white">Total</td>
                          <td className="py-2 px-3 text-right font-semibold text-white">{totalFunds}</td>
                          <td className="py-2 px-3 text-right font-semibold text-white">100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  
                  <h3 className="text-base font-medium mb-3 mt-6 text-lime-300 flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Project Distributions
                  </h3>
                  
                  {sortedByFundsProjects.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-slate-700">
                            <th className="py-2 px-3 text-left text-slate-300 font-medium">Rank</th>
                            <th className="py-2 px-3 text-left text-slate-300 font-medium">Project</th>
                            <th className="py-2 px-3 text-right text-slate-300 font-medium">Votes</th>
                            <th className="py-2 px-3 text-right text-slate-300 font-medium">Funds Received</th>
                            <th className="py-2 px-3 text-right text-slate-300 font-medium">% of Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedByFundsProjects.map((project, index) => (
                            <tr key={project.id.toString()} 
                              className={index !== sortedByFundsProjects.length - 1 ? "border-b border-slate-700/50" : ""}
                            >
                              <td className="py-2 px-3 text-center">
                                {index === 0 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 bg-yellow-500 text-slate-900 rounded-full font-bold">1</span>
                                ) : index === 1 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 bg-slate-400 text-slate-900 rounded-full font-bold">2</span>
                                ) : index === 2 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-700 text-white rounded-full font-bold">3</span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-6 h-6 bg-slate-700 text-slate-300 rounded-full">{index + 1}</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-left text-white">
                                <a 
                                  className="hover:text-lime-300"
                                  href={`/campaign/${campaignId}/project/${project.id}`}
                                >
                                  {project.name}
                                </a>
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-white">
                                {formatTokenAmount(project.voteCount)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-lime-400">
                                {formatTokenAmount(project.fundsReceived)} CELO
                              </td>
                              <td className="py-2 px-3 text-right text-white">
                                {(Number(formatTokenAmount(project.fundsReceived)) / Number(totalFunds) * 100).toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-slate-700/30 rounded-lg p-4 flex items-start">
                      <Info className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
                      <p className="text-slate-300">
                        No projects received funds. This might happen if no projects received votes or if all projects were rejected.
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="p-4 bg-slate-700/30 border-t border-slate-700">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-300">
                      The fund distribution is executed according to the {campaign.useQuadraticDistribution ? 'quadratic' : 'linear'} model. 
                      {campaign.useQuadraticDistribution ? 
                        ' With quadratic distribution, funds are allocated based on the square root of votes, creating a more equitable distribution compared to a direct proportional model.' : 
                        ' With linear distribution, funds are allocated in direct proportion to the number of votes received.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-slate-800/40 backdrop-blur-md rounded-xl border border-lime-600/20 overflow-hidden">
              <div className="p-6 pb-4 border-b border-slate-700">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <h2 className="text-xl font-semibold mb-2 md:mb-0 text-yellow-400 flex items-center">
                    <Globe className="h-5 w-5 mr-2" />
                    Projects
                  </h2>
                  
                  {/* New filtering and sorting controls */}
                  <div className="flex flex-wrap gap-2">
                    <div className="relative inline-block">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-sm hidden md:inline">Status:</span>
                        <select
                          value={projectStatusFilter}
                          onChange={(e) => setProjectStatusFilter(e.target.value)}
                          className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-1.5 text-sm appearance-none pr-8 focus:ring-2 focus:ring-lime-500 focus:outline-none"
                        >
                          <option value="all">All</option>
                          <option value="approved">Approved</option>
                          <option value="pending">Pending</option>
                        </select>
                        <div className="absolute right-2.5 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative inline-block">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-sm hidden md:inline">Sort by:</span>
                        <select
                          value={projectSortMethod}
                          onChange={(e) => setProjectSortMethod(e.target.value)}
                          className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-1.5 text-sm appearance-none pr-8 focus:ring-2 focus:ring-lime-500 focus:outline-none"
                        >
                          <option value="votes">Most Votes</option>
                          <option value="newest">Newest</option>
                          <option value="alphabetical">A-Z</option>
                        </select>
                        <div className="absolute right-2.5 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        loadCampaignData();
                        setStatusMessage({
                          text: 'Projects refreshed',
                          type: 'success'
                        });
                      }}
                      className="bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg px-3 py-1.5 text-sm inline-flex items-center"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      Refresh
                    </button>
                  </div>
                </div>
              </div>
              
              {projects.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-slate-400 mb-4">No projects have been submitted yet.</p>
                  {isActive && (
                    <button
                      onClick={() => setSubmitModalVisible(true)}
                      className="px-6 py-2 rounded-lg bg-lime-600/60 text-white hover:bg-lime-600 transition-colors inline-flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Submit the First Project
                    </button>
                  )}
                </div>
              ) : sortedProjects.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-slate-400 mb-4">No projects match the current filter criteria.</p>
                  <button
                    onClick={() => setProjectStatusFilter('all')}
                    className="px-6 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors inline-flex items-center"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Show All Projects
                  </button>
                </div>
              ) : (
                <div className="p-6">
                  {sortedProjects.map((project, index) => (
                    <div 
                      key={project.id.toString()} 
                      className={`bg-slate-700/40 rounded-lg p-5 hover:bg-slate-700/60 transition-colors ${
                        index !== sortedProjects.length - 1 ? 'mb-4' : ''
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-grow">
                          <div className="flex items-start flex-wrap gap-2">
                            <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                            {!project.approved && (
                              <span className="px-2 py-0.5 bg-orange-900/50 text-orange-400 text-xs rounded-full border border-orange-500/30">
                                Pending Approval
                              </span>
                            )}
                            {fundsDistributed && Number(project.fundsReceived) > 0 && (
                              <span className="px-2 py-0.5 bg-green-900/50 text-green-400 text-xs rounded-full border border-green-500/30">
                                Funded: {formatTokenAmount(project.fundsReceived)} CELO
                              </span>
                            )}
                            
                            {/* Media indicators */}
                            {(project.logo || project.demoVideo) && (
                              <div className="flex items-center gap-1">
                                {project.logo && (
                                  <span className="text-blue-400">
                                    <ImageIcon className="h-3.5 w-3.5" />
                                  </span>
                                )}
                                {project.demoVideo && (
                                  <span className="text-red-400">
                                    <Video className="h-3.5 w-3.5"  />
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <p className="text-slate-300 mt-1 mb-3">{project.description}</p>
                          
                          <div className="flex flex-wrap gap-y-2 gap-x-4 text-sm">
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
                        </div>
                        
                        <div className="flex flex-col items-start md:items-end">
                          <div className="bg-slate-800/60 rounded-lg px-4 py-3 text-center min-w-[120px]">
                            <div className="text-xl font-bold text-lime-400">
                              {formatTokenAmount(project.voteCount)}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">VOTES</div>
                          </div>
                          
                          <div className="flex gap-2 mt-3 w-full md:w-auto">
                            <button
                              onClick={() => openProjectInfo(project)}
                              className="px-3 py-2 bg-slate-600 text-slate-200 rounded-lg text-sm hover:bg-slate-500 transition-colors flex items-center flex-1 justify-center"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </button>
                            
                            {isActive && project.approved && (
                              <button
                                onClick={() => {
                                  setSelectedProject(project);
                                  setVoteModalVisible(true);
                                }}
                                className="px-3 py-2 bg-lime-600/60 hover:bg-lime-600 text-white rounded-lg text-sm transition-colors flex items-center flex-1 justify-center"
                              >
                                <Award className="h-4 w-4 mr-1" />
                                Vote
                              </button>
                            )}
                          </div>
                          
                          {isAdmin && !project.approved && (
                            <button
                              onClick={async () => {
                                try {
                                  await approveProject(Number(campaignId), project.id);
                                  setStatusMessage({
                                    text: `Project "${project.name}" approved successfully!`,
                                    type: 'success'
                                  });
                                  setTimeout(() => {
                                    loadCampaignData();
                                  }, 2000);
                                } catch (error) {
                                  console.error('Error approving project:', error);
                                  setStatusMessage({
                                    text: 'Error approving project. Please try again.',
                                    type: 'error'
                                  });
                                }
                              }}
                              disabled={isWritePending || isWaitingForTx}
                              className="mt-2 w-full px-4 py-2 bg-yellow-500/60 hover:bg-yellow-500 text-white rounded-lg text-sm transition-colors disabled:bg-slate-500"
                            >
                              Approve Project
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Project Info Modal */}
      {projectInfoModalVisible && projectInfoData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setProjectInfoModalVisible(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold">{projectInfoData.name}</h3>
              
              {!projectInfoData.approved && (
                <span className="px-2 py-0.5 bg-orange-900/50 text-orange-400 text-xs rounded-full border border-orange-500/30">
                  Pending Approval
                </span>
              )}
              
              {fundsDistributed && Number(projectInfoData.fundsReceived) > 0 && (
                <span className="px-2 py-0.5 bg-green-900/50 text-green-400 text-xs rounded-full border border-green-500/30">
                  Funded: {formatTokenAmount(projectInfoData.fundsReceived)} CELO
                </span>
              )}
            </div>
            
            <div className="flex flex-col md:flex-row gap-6 mb-6">
              <div className="md:w-2/3">
                <div className="rounded-lg bg-slate-700/40 p-4 mb-4">
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Description</h4>
                  <p className="text-white">{projectInfoData.description}</p>
                </div>
                
                {projectInfoData.contracts && projectInfoData.contracts.length > 0 && (
                  <div className="rounded-lg bg-slate-700/40 p-4 mb-4">
                    <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center">
                      <Code className="h-4 w-4 mr-1 text-purple-400" />
                      Contract Addresses
                    </h4>
                    <div className="space-y-2">
                      {projectInfoData.contracts.map((contract: string, idx: number) => (
                        <div key={idx} className="font-mono text-sm text-white bg-slate-800 p-2 rounded break-all">
                          {contract}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Links Section */}
                <div className="rounded-lg bg-slate-700/40 p-4">
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Links</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {projectInfoData.githubLink && (
                        <a 
                          href={projectInfoData.githubLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-400 hover:text-blue-300 py-2 px-3 bg-slate-800/50 rounded-lg"
                        >
                          <Github className="h-5 w-5 mr-2" />
                          GitHub Repository
                        </a>
                      )}
                      
                      {projectInfoData.socialLink && (
                        <a 
                          href={projectInfoData.socialLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-400 hover:text-blue-300 py-2 px-3 bg-slate-800/50 rounded-lg"
                        >
                          <Globe className="h-5 w-5 mr-2" />
                          Social Media
                        </a>
                      )}
                      
                      {projectInfoData.testingLink && (
                        <a 
                          href={projectInfoData.testingLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-400 hover:text-blue-300 py-2 px-3 bg-slate-800/50 rounded-lg"
                        >
                          <FileText className="h-5 w-5 mr-2" />
                          Demo / Testing
                        </a>
                      )}
                      
                      {projectInfoData.logo && (
                        <a 
                          href={projectInfoData.logo} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-400 hover:text-blue-300 py-2 px-3 bg-slate-800/50 rounded-lg"
                        >
                          <ImageIcon className="h-5 w-5 mr-2" />
                          Project Logo
                        </a>
                      )}
                      
                      {projectInfoData.demoVideo && (
                        <a 
                          href={projectInfoData.demoVideo} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-400 hover:text-blue-300 py-2 px-3 bg-slate-800/50 rounded-lg"
                        >
                          <Video className="h-5 w-5 mr-2" />
                          Demo Video
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="md:w-1/3">
                <div className="rounded-lg bg-slate-700/40 p-4 mb-4">
                  <h4 className="text-sm font-medium text-slate-300 mb-3">Vote Statistics</h4>
                  <div className="bg-slate-800/60 rounded-lg px-4 py-5 text-center mb-3">
                    <div className="text-2xl font-bold text-lime-400">
                      {formatTokenAmount(projectInfoData.voteCount)}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">TOTAL VOTES</div>
                  </div>
                  
                  {address && isConnected && (
                    <div className="bg-slate-800/60 rounded-lg px-4 py-3 text-center">
                      <div className="text-lg font-bold text-purple-400 flex items-center justify-center">
                        <History className="h-4 w-4 mr-1" />
                        <span id="user-vote-count">
                          {/* This would be filled in after loading user's votes for this project */}
                          {userVoteHistory
                            .filter(v => v.projectId.toString() === projectInfoData.id.toString())
                            .reduce((sum, v) => sum + Number(formatTokenAmount(v.voteCount)), 0)
                          }
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">YOUR VOTES</div>
                    </div>
                  )}
                </div>
                
                <div className="rounded-lg bg-slate-700/40 p-4">
                  <h4 className="text-sm font-medium text-slate-300 mb-3">Project Info</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Owner:</span>
                      <span className="text-sm font-mono text-white">
                        {`${projectInfoData.owner.slice(0, 6)}...${projectInfoData.owner.slice(-4)}`}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Status:</span>
                      <span className={`text-sm ${projectInfoData.approved ? 'text-green-400' : 'text-orange-400'}`}>
                        {projectInfoData.approved ? 'Approved' : 'Pending Approval'}
                      </span>
                    </div>
                    
                    {fundsDistributed && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-400">Funds Received:</span>
                        <span className="text-sm text-lime-400">
                          {formatTokenAmount(projectInfoData.fundsReceived)} CELO
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {isActive && projectInfoData.approved && (
                  <button
                    onClick={() => {
                      setSelectedProject(projectInfoData);
                      setVoteModalVisible(true);
                      setProjectInfoModalVisible(false);
                    }}
                    className="w-full py-3 rounded-lg bg-lime-600 text-white font-semibold hover:bg-lime-500 transition-colors mt-4 flex items-center justify-center"
                  >
                    <Award className="h-5 w-5 mr-2" />
                    Vote for this Project
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex">
              <button
                onClick={() => setProjectInfoModalVisible(false)}
                className="flex-1 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
       
      )}
      
      {/* Vote Modal */}
      {voteModalVisible && selectedProject && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-md p-6 relative">
            <button 
              onClick={() => setVoteModalVisible(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            
            <h3 className="text-xl font-bold mb-1">Vote for Project</h3>
            <p className="text-lime-400 font-medium mb-4">{selectedProject.name}</p>
            
            <div className="mb-6">
              <label className="block text-slate-300 mb-2">CELO Amount</label>
              <input 
                type="number"
                min="0.1"
                step="0.1"
                value={voteAmount}
                onChange={(e) => setVoteAmount(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 text-white"
                placeholder="Enter amount"
              />
              <p className="mt-2 text-sm text-slate-400">
                Each CELO token is worth {campaign.voteMultiplier.toString()} votes.
                {voteAmount && !isNaN(parseFloat(voteAmount)) && parseFloat(voteAmount) > 0 && (
                  <span className="block mt-1 text-lime-400">
                    Your vote will be worth {parseFloat(voteAmount) * Number(campaign.voteMultiplier)} votes.
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleVote}
                disabled={isWritePending || isWaitingForTx || !voteAmount || parseFloat(voteAmount) <= 0}
                className="flex-1 py-3 px-6 bg-lime-500 text-slate-900 font-semibold rounded-lg hover:bg-lime-400 transition-colors disabled:bg-slate-500 disabled:text-slate-300 disabled:cursor-not-allowed"
              >
                {isWritePending || isWaitingForTx ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-900 mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  'Confirm Vote'
                )}
              </button>
              
              <button
                onClick={() => setVoteModalVisible(false)}
                className="py-3 px-6 bg-transparent border border-slate-500 text-slate-300 font-semibold rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Submit Project Modal */}
      {submitModalVisible && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setSubmitModalVisible(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            
            <h3 className="text-xl font-bold mb-1">Submit New Project</h3>
            <p className="text-lime-400 font-medium mb-4">{campaign.name}</p>
            
            <form onSubmit={handleSubmitProject}>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-slate-300 mb-2">Project Name</label>
                  <input 
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 text-white"
                    placeholder="Enter project name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-slate-300 mb-2">Description</label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 text-white h-24"
                    placeholder="Describe your project"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-slate-300 mb-2">GitHub Link (Optional)</label>
                  <input 
                    type="url"
                    value={newProject.githubLink}
                    onChange={(e) => setNewProject({...newProject, githubLink: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 text-white"
                    placeholder="https://github.com/yourusername/yourproject"
                  />
                </div>
                
                <div>
                  <label className="block text-slate-300 mb-2">Social Media Link (Optional)</label>
                  <input 
                    type="url"
                    value={newProject.socialLink}
                    onChange={(e) => setNewProject({...newProject, socialLink: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 text-white"
                    placeholder="https://twitter.com/yourproject"
                  />
                </div>
                
                <div>
                  <label className="block text-slate-300 mb-2">Demo/Testing Link (Optional)</label>
                  <input 
                    type="url"
                    value={newProject.testingLink}
                    onChange={(e) => setNewProject({...newProject, testingLink: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 text-white"
                    placeholder="https://demo.yourproject.com"
                  />
                </div>
                
                {/* New fields for logo and demo video */}
                <div>
                  <label className="block text-slate-300 mb-2">Logo URL (Optional)</label>
                  <input 
                    type="url"
                    value={newProject.logo}
                    onChange={(e) => setNewProject({...newProject, logo: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 text-white"
                    placeholder="https://example.com/logo.png or IPFS hash"
                  />
                </div>
                
                <div>
                  <label className="block text-slate-300 mb-2">Demo Video URL (Optional)</label>
                  <input 
                    type="url"
                    value={newProject.demoVideo}
                    onChange={(e) => setNewProject({...newProject, demoVideo: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 text-white"
                    placeholder="https://example.com/demo.mp4 or IPFS hash"
                  />
                </div>
                
                {/* Contract addresses */}
                <div>
                  <label className="flex justify-between items-center text-slate-300 mb-2">
                    <span>Contract Addresses (Optional)</span>
                    <button
                      type="button"
                      onClick={handleAddContract}
                      className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded"
                    >
                      + Add Contract
                    </button>
                  </label>
                  
                  {newProject.contracts.map((contract, index) => (
                    <div key={index} className="flex mb-2">
                      <input 
                        type="text"
                        value={contract}
                        onChange={(e) => handleContractChange(index, e.target.value)}
                        className="flex-grow px-4 py-2 rounded-l-lg bg-slate-700 border border-slate-600 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 text-white"
                        placeholder="0x..."
                      />
                      {newProject.contracts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveContract(index)}
                          className="bg-slate-600 hover:bg-slate-500 text-slate-300 px-3 py-2 rounded-r-lg"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-slate-400 mt-1">
                    Add the addresses of any contracts associated with this project.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isWritePending || isWaitingForTx || !newProject.name || !newProject.description}
                  className="flex-1 py-3 px-6 bg-lime-500 text-slate-900 font-semibold rounded-lg hover:bg-lime-400 transition-colors disabled:bg-slate-500 disabled:text-slate-300 disabled:cursor-not-allowed"
                >
                  {isWritePending || isWaitingForTx ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-900 mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    'Submit Project'
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => setSubmitModalVisible(false)}
                  className="py-3 px-6 bg-transparent border border-slate-500 text-slate-300 font-semibold rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}