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
  Waves,
  Award,
  Droplets,
  X
} from 'lucide-react';
import { useSovereignSeas } from '../../../../hooks/useSovereignSeas';

// Placeholder for the contract addresses - replace with your actual addresses
const CONTRACT_ADDRESS = '0x35128A5Ee461943fA6403672b3574346Ba7E4530' as `0x${string}`;
const CELO_TOKEN_ADDRESS = '0x3FC1f6138F4b0F5Da3E1927412Afe5c68ed4527b' as `0x${string}`;

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
  });
  
  // Contract interaction
  const {
    isInitialized,
    loadCampaigns,
    loadProjects,
    getSortedProjects,
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
          
          // Check if current user is the admin
          if (address && campaignData.admin.toLowerCase() === address.toLowerCase()) {
            setIsAdmin(true);
          }
          
          // Check if funds can be distributed (campaign ended & is admin)
          const now = Math.floor(Date.now() / 1000);
          if (campaignData.active && now > Number(campaignData.endTime)) {
            setCanDistributeFunds(isAdmin);
          }
          
          // Load projects - THIS IS THE MISSING PART
          const projectsData = await loadProjects(campaignId);
          // or if you want sorted projects:
          // const projectsData = await getSortedProjects(campaignId);
          setProjects(projectsData);
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
  
 
  
  const handleVote = async () => {
    if (!selectedProject || !voteAmount || parseFloat(voteAmount) <= 0) return;
    
    try {
      await vote(campaignId, selectedProject.id, voteAmount);
      setVoteModalVisible(false);
      setVoteAmount('');
    } catch (error) {
      console.error('Error voting:', error);
    }
  };
  
  const handleSubmitProject = async (e) => {
    e.preventDefault();
    
    if (!newProject.name || !newProject.description) return;
    
    try {
      await submitProject(
        campaignId,
        newProject.name,
        newProject.description,
        newProject.githubLink,
        newProject.socialLink,
        newProject.testingLink
      );
      setSubmitModalVisible(false);
      setNewProject({
        name: '',
        description: '',
        githubLink: '',
        socialLink: '',
        testingLink: '',
      });
    } catch (error) {
      console.error('Error submitting project:', error);
    }
  };
  
  const handleDistributeFunds = async () => {
    if (!canDistributeFunds) return;
    
    try {
      await distributeFunds(campaignId);
    } catch (error) {
      console.error('Error distributing funds:', error);
    }
  };
  
  // Helper function to copy campaign link to clipboard
  const shareCampaign = () => {
    const url = window.location.origin + `/campaign/${campaignId}`;
    navigator.clipboard.writeText(url);
    alert('Campaign link copied to clipboard!');
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
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Campaign Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center">
                <Waves className="h-8 w-8 text-lime-500 mr-3" />
                {campaign.name}
              </h1>
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
                  onClick={() => router.push(`/campaign/${campaignId}/settings`)}
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
                
                {isAdmin && hasEnded && campaign.active && (
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
            <div className="bg-slate-800/40 backdrop-blur-md rounded-xl border border-lime-600/20 overflow-hidden">
              <div className="p-6 pb-0">
                <h2 className="text-xl font-semibold mb-4 text-yellow-400 flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Projects
                </h2>
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
              ) : (
                <div className="p-6">
                  {projects.map((project, index) => (
                    <div 
                      key={project.id.toString()} 
                      className={`bg-slate-700/40 rounded-lg p-5 hover:bg-slate-700/60 transition-colors ${
                        index !== projects.length - 1 ? 'mb-4' : ''
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-grow">
                          <div className="flex items-start">
                            <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                            {!project.approved && (
                              <span className="ml-2 px-2 py-0.5 bg-orange-900/50 text-orange-400 text-xs rounded-full border border-orange-500/30">
                                Pending Approval
                              </span>
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
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-start md:items-end">
                          <div className="bg-slate-800/60 rounded-lg px-4 py-3 text-center min-w-[120px]">
                            <div className="text-xl font-bold text-lime-400">
                              {formatTokenAmount(project.voteCount)}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">VOTES</div>
                          </div>
                          
                          {isActive && project.approved && (
                            <button
                              onClick={() => {
                                setSelectedProject(project);
                                setVoteModalVisible(true);
                              }}
                              className="mt-3 px-4 py-2 bg-lime-600/60 hover:bg-lime-600 text-white rounded-lg text-sm transition-colors w-full"
                            >
                              Vote for Project
                            </button>
                          )}
                          
                          {isAdmin && !project.approved && (
                            <button
                              onClick={async () => {
                                try {
                                  // Call your approveProject function
                                  // from useSovereignSeas hook
                                  await approveProject(campaignId, project.id);
                                } catch (error) {
                                  console.error('Error approving project:', error);
                                }
                              }}
                              disabled={isWritePending || isWaitingForTx}
                              className="mt-3 px-4 py-2 bg-yellow-500/60 hover:bg-yellow-500 text-white rounded-lg text-sm transition-colors w-full disabled:bg-slate-500"
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