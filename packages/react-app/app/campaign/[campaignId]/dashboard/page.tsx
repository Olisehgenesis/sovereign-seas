'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { 
  BarChart3, Calendar, Clock, Download, FileText, Github, 
  Globe, PieChart, Plus, Settings, SunSnowIcon, Share2, 
  Users, Award, Droplets, X, Eye, TrendingUp, ChevronUp, 
  ChevronDown, Info, AlertTriangle, ImageIcon, Video, Code, 
  History, MousePointerClick, Wallet, Filter, RefreshCw, 
  LineChart, ExternalLink, Edit, User, Hash
} from 'lucide-react';
import { useSovereignSeas } from '../../../../hooks/useSovereignSeas';
import { Button } from '@headlessui/react';



// Component imports
import StatusMessage from './components/StatusMessage';
import ProjectCard from './components/ProjectCard';
import UserActivityPanel from './components/UserActivityPanel';
import CampaignStatsPanel from './components/CampaignStatsPanel';
import ProjectInfoModal from './components/ProjectInfoModal';
import VoteModal from './components/VoteModal';
import ActionPanel from './components/ActionPanel';
import FundDistributionTable from './components/FundDistributionTable';

export default function CampaignDashboard() {
  const router = useRouter();
  const { campaignId } = useParams() as { campaignId: string };
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
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null });
  
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
    distributeFunds,
    formatTokenAmount,
    formatCampaignTime,
    getCampaignTimeRemaining,
    isCampaignActive,
    isWritePending,
    isWaitingForTx,
    isTxSuccess,
    isSuperAdmin,
    resetWrite,
  } = useSovereignSeas();
  
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
        setStatusMessage({ text: '', type: null });
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 text-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
          <p className="text-lg text-emerald-600">Loading campaign data...</p>
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
  
  // Create distribution summary - removed admin and platform fees
  const distributionSummary = [
    { name: "Distributed to Projects", amount: Number(totalFunds) },
  ];
  
  // Check if campaign has media content
  const hasCampaignMedia = campaign.logo?.trim().length > 0 || campaign.demoVideo?.trim().length > 0;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 text-gray-800">
      <div className="container mx-auto px-6 py-8">
        {/* Status Message Component */}
        {statusMessage.text && statusMessage.type && (
          <StatusMessage 
            text={statusMessage.text} 
            type={statusMessage.type} 
          />
        )}
        
        {/* Campaign Header */}
        {/* Campaign Header */}
<div className="mb-6 bg-white rounded-xl p-5 shadow-sm border border-gray-200">
  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
    <div className="flex-grow">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold tilt-neon text-gray-800 flex items-center">
          <Hash className="h-7 w-7 text-emerald-500 mr-2" />
          {campaign.name}
        </h1>
        
        {/* Media indicators */}
        {hasCampaignMedia && (
          <div className="flex items-center gap-1">
            {campaign.logo && (
              <span className="text-blue-600" title="Has Logo">
                <ImageIcon className="h-4 w-4" />
              </span>
            )}
            {campaign.demoVideo && (
              <span className="text-red-600" title="Has Demo Video">
                <Video className="h-4 w-4" />
              </span>
            )}
          </div>
        )}
      </div>
      
      <p className="text-gray-600 text-sm mt-2 mb-3 max-w-3xl">{campaign.description}</p>
      
      <div className="flex flex-wrap gap-2">
        <span className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center shadow-sm ${
          isActive 
            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
            : hasEnded 
              ? 'bg-gray-100 text-gray-700 border border-gray-200'
              : 'bg-amber-100 text-amber-700 border border-amber-200'
        }`}>
          {isActive ? '🟢' : hasEnded ? '⚪' : '🟠'}
          <span className="ml-1">
            {hasEnded ? 'Ended' : hasStarted ? 'Active' : 'Upcoming'}
          </span>
        </span>
        
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700 border border-teal-200 inline-flex items-center shadow-sm">
          👥 {approvedProjects} Project{approvedProjects !== 1 ? 's' : ''}
        </span>
        
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200 inline-flex items-center shadow-sm">
          🧮 {campaign.useQuadraticDistribution ? 'Quadratic' : 'Linear'}
        </span>
        
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200 inline-flex items-center shadow-sm">
          💰 {totalFunds} CELO
        </span>
        
        {fundsDistributed && (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 inline-flex items-center shadow-sm">
            🏆 Funds Distributed
          </span>
        )}
      </div>
    </div>
    
    <div className="flex flex-wrap gap-2 mt-1 md:mt-0">
      <button 
        onClick={shareCampaign}
        className="px-3 py-1.5 rounded-full bg-white text-emerald-600 border border-gray-200 hover:bg-emerald-50 transition-colors flex items-center text-xs shadow-sm"
      >
        <Share2 className="h-3.5 w-3.5 mr-1.5" />
        Share
      </button>
      
      {isAdmin && (
        <button 
          onClick={() => router.push(`/campaign/${campaignId}/admin`)}
          className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center text-xs shadow-sm"
        >
          <Settings className="h-3.5 w-3.5 mr-1.5" />
          Admin
        </button>
      )}
    
      <button 
        onClick={() => router.push(`/campaign/${campaignId}/submit`)}
        className="px-3 py-1.5 rounded-full bg-pink-500 text-white hover:bg-pink-600 transition-colors flex items-center text-xs shadow-sm"
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Submit Project
      </button>
    </div>
  </div>
  
  {/* Timeline Bar */}
  <div className="mt-4 bg-gray-50 rounded-xl p-3 border border-gray-200">
    <div className="flex items-center justify-between mb-2 text-xs text-gray-600">
      <div className="flex items-center">
        <span className="mr-1">🗓️</span>
        Start: {formatCampaignTime(campaign.startTime)}
      </div>
      <div className="flex items-center">
        <span className="mr-1">🏁</span>
        End: {formatCampaignTime(campaign.endTime)}
      </div>
    </div>
    
    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
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
    
    {isActive ? (
      <div className="mt-2 text-center text-amber-600 font-medium text-sm">
        ⏳ Time remaining: {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m
      </div>
    ) : !hasStarted ? (
      <div className="mt-2 text-center text-blue-600 font-medium text-sm">
  🚀 Campaign launches in: {Math.floor((Number(campaign.startTime) - now) / 86400)}d {Math.floor(((Number(campaign.startTime) - now) % 86400) / 3600)}h {Math.floor(((Number(campaign.startTime) - now) % 3600) / 60)}m {Math.floor((Number(campaign.startTime) - now) % 60)}s
</div>
    ) : null}
  </div>
</div>
        
        {/* Main Content Area */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column - Stats and Actions */}
          <div className="lg:w-1/3 space-y-6">
            {/* User Vote Stats - Component */}
            {address && isConnected && (
              <UserActivityPanel
                userVoteStats={userVoteStats}
                userVoteHistory={userVoteHistory}
                voteHistoryVisible={voteHistoryVisible}
                setVoteHistoryVisible={setVoteHistoryVisible}
                projects={projects}
                formatTokenAmount={formatTokenAmount}
              />
            )}
            
            {/* Campaign Stats - Component */}
            <CampaignStatsPanel
              campaign={campaign}
              totalProjects={totalProjects}
              approvedProjects={approvedProjects}
              totalVotes={totalVotes}
              totalFunds={Number(totalFunds)}
              hasCampaignMedia={hasCampaignMedia}
              projectRankingsVisible={projectRankingsVisible}
              setProjectRankingsVisible={setProjectRankingsVisible}
              sortedProjects={sortedProjects}
              campaignId={campaignId}
              formatTokenAmount={formatTokenAmount}
              router={router}
            />
            
            {/* Actions - Component */}
            <ActionPanel
              isActive={isActive}
              campaignId={campaignId}
              canDistributeFunds={canDistributeFunds}
              fundsDistributed={fundsDistributed}
              distributionTableVisible={distributionTableVisible}
              isAdmin={isAdmin}
              isWritePending={isWritePending}
              isWaitingForTx={isWaitingForTx}
              handleDistributeFunds={handleDistributeFunds}
              setDistributionTableVisible={setDistributionTableVisible}
              router={router}
            />
          </div>
          
          {/* Right Column - Projects */}
          <div className="lg:w-2/3 space-y-6">
            {/* Fund Distribution Table (if funds have been distributed) */}
            {distributionTableVisible && fundsDistributed && (
              <FundDistributionTable
                distributionSummary={distributionSummary}
                sortedByFundsProjects={sortedByFundsProjects}
                totalFunds={Number(totalFunds)}
                campaignId={campaignId}
                formatTokenAmount={formatTokenAmount}
                setDistributionTableVisible={setDistributionTableVisible}
              />
            )}
            
            {/* Projects Section */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-md">
              <div className="p-6 pb-4 border-b border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <h2 className="text-xl font-semibold mb-2 md:mb-0 text-gray-800 flex items-center tilt-neon">
                    <Globe className="h-5 w-5 mr-2 text-emerald-500" />
                    Projects
                  </h2>
                  
                  {/* Filtering and sorting controls */}
                  <div className="flex flex-wrap gap-2">
                    <div className="relative inline-block">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm hidden md:inline">Status:</span>
                        <select
                          value={projectStatusFilter}
                          onChange={(e) => setProjectStatusFilter(e.target.value)}
                          className="bg-gray-50 border border-gray-200 text-gray-700 rounded-full px-3 py-1.5 text-sm appearance-none pr-8 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"
                        >
                          <option value="all">All</option>
                          <option value="approved">Approved</option>
                          <option value="pending">Pending</option>
                        </select>
                        <div className="absolute right-2.5 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative inline-block">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm hidden md:inline">Sort by:</span>
                        <select
                          value={projectSortMethod}
                          onChange={(e) => setProjectSortMethod(e.target.value)}
                          className="bg-gray-50 border border-gray-200 text-gray-700 rounded-full px-3 py-1.5 text-sm appearance-none pr-8 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"
                        >
                          <option value="votes">Most Votes</option>
                          <option value="newest">Newest</option>
                          <option value="alphabetical">A-Z</option>
                        </select>
                        <div className="absolute right-2.5 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <ChevronDown className="h-4 w-4 text-gray-400" />
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
                      className="bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-full px-3 py-1.5 text-sm inline-flex items-center border border-gray-200"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      Refresh
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Project List */}
              {projects.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-gray-500 mb-4">No projects have been submitted yet.</p>
                  {isActive && (
                    <button
                      onClick={() => router.push(`/campaign/${campaignId}/submit`)}
                      className="px-6 py-2 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 transition-colors inline-flex items-center shadow-sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Submit the First Project
                    </button>
                  )}
                </div>
              ) : sortedProjects.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-gray-500 mb-4">No projects match the current filter criteria.</p>
                  <button
                    onClick={() => setProjectStatusFilter('all')}
                    className="px-6 py-2 rounded-full bg-white text-gray-700 hover:bg-gray-50 transition-colors inline-flex items-center border border-gray-200 shadow-sm"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Show All Projects
                  </button>
                </div>
              ) : (
                <div className="p-6">
                  <div className="space-y-4">
                    {sortedProjects.map((project, index) => (
                      <ProjectCard
                        key={project.id.toString()}
                        project={project}
                        isActive={isActive}
                        isAdmin={isAdmin}
                        fundsDistributed={fundsDistributed}
                        openProjectInfo={openProjectInfo}
                        setSelectedProject={setSelectedProject}
                        setVoteModalVisible={setVoteModalVisible}
                        approveProject={approveProject}
                        campaignId={campaignId}
                        formatTokenAmount={formatTokenAmount}
                        isWritePending={isWritePending}
                        isWaitingForTx={isWaitingForTx}
                        setStatusMessage={setStatusMessage}
                        loadCampaignData={loadCampaignData}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Project Info Modal */}
      {projectInfoModalVisible && projectInfoData && campaignId && (
        <ProjectInfoModal
          project={projectInfoData}
          isActive={isActive}
          isAdmin={isAdmin}
          isConnected={isConnected}
          address={address || ''}
          campaignId={campaignId}
          formatTokenAmount={formatTokenAmount}
          userVoteHistory={userVoteHistory}
          fundsDistributed={fundsDistributed}
          setSelectedProject={setSelectedProject}
          setVoteModalVisible={setVoteModalVisible}
          setProjectInfoModalVisible={setProjectInfoModalVisible}
        />
      )}
      
      {/* Vote Modal */}
      {voteModalVisible && selectedProject && (
        <VoteModal
          campaign={campaign}
          selectedProject={selectedProject}
          voteAmount={voteAmount}
          setVoteAmount={setVoteAmount}
          handleVote={handleVote}
          setVoteModalVisible={setVoteModalVisible}
          isWritePending={isWritePending}
          isWaitingForTx={isWaitingForTx}
        />
      )}
    </div>
  );
}