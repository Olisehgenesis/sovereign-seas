'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { 
  PlusCircle, 
  Settings, 
  Clock, 
  Waves, 
  ArrowRight, 
  CalendarRange, 
  Award, 
  Users,
  Droplets,
  ListFilter,
  Activity,
  CheckCircle,
  TimerIcon,
  X,
  CheckCircle2,
  XCircle,
  PieChart,
  BarChart,
  Edit,
  Copy,
  Trash2
} from 'lucide-react';
import Image from 'next/image';
import { useSovereignSeas } from '../../../hooks/useSovereignSeas';

// Contract addresses - replace with actual addresses
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` || 
  '0x35128A5Ee461943fA6403672b3574346Ba7E4530' as `0x${string}`;
const CELO_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_CELO_TOKEN_ADDRESS as `0x${string}` || 
  '0x3FC1f6138F4b0F5Da3E1927412Afe5c68ed4527b' as `0x${string}`;

// Campaign type definition
type Campaign = {
  id: bigint;
  admin: string;
  name: string;
  description: string;
  startTime: bigint;
  endTime: bigint;
  adminFeePercentage: bigint;
  voteMultiplier: bigint;
  maxWinners: bigint;
  useQuadraticDistribution: boolean;
  active: boolean;
  totalFunds: bigint;
  projectCount?: number;
  status?: 'active' | 'upcoming' | 'ended';
  timeRemaining?: {
    days: number;
    hours: number;
    minutes: number;
  };
  pendingProjects?: number;
  totalVotes?: number;
};

export default function MyCampaigns() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const { address, isConnected } = useAccount();
  
  // Campaign state
  const [myCampaigns, setMyCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'upcoming' | 'ended'>('all');
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  
  // Use the hook to interact with the contract
  const {
    isInitialized,
    loadCampaigns,
    loadProjects,
    formatTokenAmount,
    getCampaignTimeRemaining,
    isCampaignActive,
    distributeFunds,
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
    if (isInitialized && address) {
      fetchUserCampaigns();
    }
  }, [isInitialized, address, isTxSuccess]);

  useEffect(() => {
    filterCampaigns();
  }, [myCampaigns, activeTab]);

  const fetchUserCampaigns = async () => {
    if (!address) return;
    
    setLoading(true);
    try {
      // Load all campaigns
      const allCampaigns = await loadCampaigns();
      
      if (Array.isArray(allCampaigns)) {
        // Filter campaigns where current user is admin
        const userCampaigns = allCampaigns.filter(
          campaign => campaign.admin.toLowerCase() === address.toLowerCase()
        );
        
        // Process campaigns with additional data
        const processedCampaigns = await Promise.all(
          userCampaigns.map(async (campaign) => {
            const now = Math.floor(Date.now() / 1000);
            let status: 'active' | 'upcoming' | 'ended';
            
            if (campaign.active && Number(campaign.startTime) <= now && Number(campaign.endTime) >= now) {
              status = 'active';
            } else if (Number(campaign.startTime) > now) {
              status = 'upcoming';
            } else {
              status = 'ended';
            }
            
            // Load projects for additional stats
            const projects = await loadProjects(campaign.id);
            const pendingProjects = projects.filter(p => !p.approved).length;
            const totalVotes = projects.reduce((sum, project) => sum + Number(formatTokenAmount(project.voteCount)), 0);
            
            // Calculate time remaining
            const timeRemaining = getCampaignTimeRemaining(campaign);
            
            return {
              ...campaign,
              projectCount: projects.length,
              pendingProjects,
              totalVotes,
              status,
              timeRemaining
            };
          })
        );
        
        // Sort by creation date (newest first)
        const sortedCampaigns = processedCampaigns.sort((a, b) => 
          Number(b.id) - Number(a.id)
        );
        
        setMyCampaigns(sortedCampaigns);
      }
    } catch (error) {
      console.error('Error fetching user campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCampaigns = () => {
    if (activeTab === 'all') {
      setFilteredCampaigns(myCampaigns);
    } else {
      setFilteredCampaigns(myCampaigns.filter(campaign => campaign.status === activeTab));
    }
  };

  const handleDistributeFunds = async (campaignId: bigint) => {
    try {
      await distributeFunds(Number(campaignId));
      // Refresh data after distribution
      setTimeout(() => {
        fetchUserCampaigns();
      }, 5000); // Wait for transaction to be mined
    } catch (error) {
      console.error('Error distributing funds:', error);
    }
  };

  const navigateToCreateCampaign = () => {
    router.push('/campaign/create');
  };

  const navigateToCampaignDashboard = (campaignId: string) => {
    router.push(`/campaign/${campaignId}/dashboard`);
  };

  const navigateToCampaignAdmin = (campaignId: string) => {
    router.push(`/campaign/${campaignId}/admin`);
  };
  
  const navigateToEditCampaign = (campaignId: string) => {
    router.push(`/campaign/${campaignId}/edit`);
  };

  const handleDeleteCampaign = (campaign: Campaign) => {
    setCampaignToDelete(campaign);
    setDeleteModalVisible(true);
  };

  const confirmDeleteCampaign = async () => {
    if (!campaignToDelete) return;
    
    try {
      // In a real implementation, you would call a contract method to deactivate the campaign
      // For now, we'll just simulate success and refresh the data
      console.log(`Deleting campaign ${campaignToDelete.id}`);
      setDeleteModalVisible(false);
      setCampaignToDelete(null);
      
      // Refresh campaigns
      await fetchUserCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'active':
        return 'bg-lime-500 text-slate-900';
      case 'upcoming':
        return 'bg-yellow-400 text-slate-900';
      case 'ended':
        return 'bg-slate-600 text-white';
      default:
        return 'bg-slate-700 text-white';
    }
  };

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case 'active':
        return <Activity className="h-4 w-4 mr-1" />;
      case 'upcoming':
        return <Clock className="h-4 w-4 mr-1" />;
      case 'ended':
        return <CheckCircle className="h-4 w-4 mr-1" />;
      default:
        return <Activity className="h-4 w-4 mr-1" />;
    }
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="relative overflow-hidden">
        {/* Background Wave Effect */}
        <div className="absolute inset-0 z-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
            <path fill="#84cc16" fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,149.3C672,149,768,171,864,176C960,181,1056,171,1152,154.7C1248,139,1344,117,1392,106.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
          </svg>
        </div>
        
        {/* Content */}
        <div className="container mx-auto px-6 py-16 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col items-start">
              <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center tracking-tight">
                <Settings className="h-8 w-8 text-lime-500 mr-3" />
                My <span className="text-yellow-400 ml-2">Campaigns</span>
              </h1>
              <p className="text-slate-300 mt-2 max-w-2xl">
                Manage your ocean conservation campaigns, track projects, and distribute funds.
              </p>
            </div>
            
            <button 
              onClick={navigateToCreateCampaign}
              className="px-6 py-3 rounded-full bg-lime-500 text-slate-900 font-semibold hover:bg-lime-400 transition-all flex items-center self-start"
            >
              <PlusCircle className="h-5 w-5 mr-2" />
              Create New Campaign
            </button>
          </div>
        </div>
      </div>
      
      {/* Content Area */}
      <div className="container mx-auto px-6 py-8">
        {!isConnected ? (
          <div className="bg-yellow-500/10 backdrop-blur-md rounded-xl p-8 border border-yellow-500/30 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Users className="h-8 w-8 text-yellow-500" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">Wallet Not Connected</h2>
            <p className="text-slate-300 mb-6 max-w-lg mx-auto">
              Please connect your wallet to view and manage your campaigns. You need to be connected to the same wallet that created the campaigns.
            </p>
            <button className="px-6 py-3 rounded-full bg-yellow-500 text-slate-900 font-semibold hover:bg-yellow-400 transition-all">
              Connect Wallet
            </button>
          </div>
        ) : loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-500"></div>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-4 border border-lime-600/20 mb-8">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-5 py-2 rounded-lg font-medium ${
                    activeTab === 'all'
                      ? 'bg-lime-600 text-white'
                      : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  All Campaigns
                </button>
                <button
                  onClick={() => setActiveTab('active')}
                  className={`px-5 py-2 rounded-lg font-medium ${
                    activeTab === 'active'
                      ? 'bg-lime-600 text-white'
                      : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setActiveTab('upcoming')}
                  className={`px-5 py-2 rounded-lg font-medium ${
                    activeTab === 'upcoming'
                      ? 'bg-lime-600 text-white'
                      : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Upcoming
                </button>
                <button
                  onClick={() => setActiveTab('ended')}
                  className={`px-5 py-2 rounded-lg font-medium ${
                    activeTab === 'ended'
                      ? 'bg-lime-600 text-white'
                      : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Ended
                </button>
              </div>
            </div>
            
            {filteredCampaigns.length === 0 ? (
              <div className="bg-slate-800/30 backdrop-blur-md rounded-xl p-8 text-center my-12">
                <div className="flex justify-center mb-4">
                  <ListFilter className="h-16 w-16 text-slate-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No Campaigns Found</h3>
                <p className="text-slate-300 mb-6">
                  {activeTab === 'all' 
                    ? "You haven't created any campaigns yet."
                    : `You don't have any ${activeTab} campaigns.`}
                </p>
                <button 
                  onClick={navigateToCreateCampaign}
                  className="px-6 py-3 rounded-full bg-lime-500 text-slate-900 font-semibold hover:bg-lime-400 transition-all inline-flex items-center"
                >
                  <PlusCircle className="h-5 w-5 mr-2" />
                  Create Your First Campaign
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredCampaigns.map((campaign) => (
                  <div 
                    key={campaign.id.toString()}
                    className="bg-slate-800/40 backdrop-blur-md rounded-xl border border-lime-600/20 overflow-hidden"
                  >
                    {/* Campaign Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between p-6 border-b border-slate-700/50">
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          <h3 className="text-xl font-bold text-white">{campaign.name}</h3>
                          <span className={`ml-3 px-3 py-1 rounded-full text-xs font-medium inline-flex items-center ${getStatusColor(campaign.status)}`}>
                            {getStatusIcon(campaign.status)}
                            {campaign.status === 'active' ? 'Active' : 
                             campaign.status === 'upcoming' ? 'Upcoming' : 'Ended'}
                          </span>
                        </div>
                        
                        <p className="text-slate-300 mt-1 line-clamp-1">{campaign.description}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
                        <button
                          onClick={() => navigateToCampaignDashboard(campaign.id.toString())}
                          className="px-4 py-2 rounded-lg bg-slate-700/60 text-slate-200 hover:bg-slate-700 transition-colors flex items-center"
                        >
                          <Waves className="h-4 w-4 mr-2" />
                          Dashboard
                        </button>
                        
                        <button
                          onClick={() => navigateToCampaignAdmin(campaign.id.toString())}
                          className="px-4 py-2 rounded-lg bg-lime-600/60 text-white hover:bg-lime-600 transition-colors flex items-center"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Admin Panel
                        </button>
                      </div>
                    </div>
                    
                    {/* Campaign Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 p-6">
                      <div>
                        <h4 className="text-xs text-slate-400 uppercase mb-1 flex items-center">
                          <CalendarRange className="h-3 w-3 mr-1" />
                          Timeline
                        </h4>
                        <div className="text-white">
                          {campaign.status === 'active' && campaign.timeRemaining ? (
                            <span className="text-yellow-400">
                              {campaign.timeRemaining.days}d {campaign.timeRemaining.hours}h remaining
                            </span>
                          ) : campaign.status === 'upcoming' ? (
                            <span>Starts at {new Date(Number(campaign.startTime) * 1000).toLocaleDateString()}</span>
                          ) : (
                            <span>Ended on {new Date(Number(campaign.endTime) * 1000).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-xs text-slate-400 uppercase mb-1 flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          Projects
                        </h4>
                        <div className="text-white">
                          {campaign.projectCount || 0} total 
                          {campaign.pendingProjects ? (
                            <span className="text-yellow-400 ml-1">
                              ({campaign.pendingProjects} pending)
                            </span>
                          ) : null}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-xs text-slate-400 uppercase mb-1 flex items-center">
                          <Droplets className="h-3 w-3 mr-1" />
                          Funds
                        </h4>
                        <div className="text-lime-400">
                          {formatTokenAmount(campaign.totalFunds)} CELO
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-xs text-slate-400 uppercase mb-1 flex items-center">
                          <Award className="h-3 w-3 mr-1" />
                          Distribution
                        </h4>
                        <div className="text-white">
                          {campaign.useQuadraticDistribution ? 'Quadratic' : 'Linear'} 
                          {campaign.maxWinners.toString() !== '0' ? 
                            ` (Top ${campaign.maxWinners.toString()})` : 
                            ' (All Projects)'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Campaign Actions */}
                    <div className="bg-slate-700/30 p-4 border-t border-slate-700/50 flex flex-wrap justify-between items-center gap-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => navigateToEditCampaign(campaign.id.toString())}
                          className="px-3 py-1.5 rounded-lg bg-slate-600 text-slate-200 hover:bg-slate-500 transition-colors text-sm flex items-center"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </button>
                        
                        <button
                          onClick={() => {
                            // Implement clone campaign functionality
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-600 text-slate-200 hover:bg-slate-500 transition-colors text-sm flex items-center"
                        >
                          <Copy className="h-3.5 w-3.5 mr-1.5" />
                          Clone
                        </button>
                        
                        {/* Only show delete for upcoming campaigns that haven't started */}
                        {campaign.status === 'upcoming' && (
                          <button
                            onClick={() => handleDeleteCampaign(campaign)}
                            className="px-3 py-1.5 rounded-lg bg-red-900/50 text-red-300 hover:bg-red-900 transition-colors text-sm flex items-center"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Delete
                          </button>
                        )}
                      </div>
                      
                      <div>
                        {campaign.status === 'ended' && campaign.active && (
                          <button
                            onClick={() => handleDistributeFunds(campaign.id)}
                            disabled={isWritePending || isWaitingForTx}
                            className="px-4 py-2 rounded-lg bg-yellow-500 text-slate-900 font-semibold hover:bg-yellow-400 transition-colors flex items-center disabled:bg-slate-500 disabled:text-slate-300"
                          >
                            {isWritePending || isWaitingForTx ? (
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900 mr-2"></div>
                                Processing...
                              </div>
                            ) : (
                              <>
                                <Award className="h-4 w-4 mr-2" />
                                Distribute Funds
                              </>
                            )}
                          </button>
                        )}
                        
                        {campaign.status === 'ended' && !campaign.active && (
                          <span className="px-4 py-2 rounded-lg bg-green-900/20 text-green-400 border border-green-500/30 flex items-center">
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Funds Distributed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Campaign Stats Summary (when user has campaigns) */}
      {!loading && myCampaigns.length > 0 && (
        <div className="container mx-auto px-6 py-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <BarChart className="h-7 w-7 text-lime-500 mr-3" />
            Campaign Analytics
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-6 border border-lime-600/20 transform hover:-translate-y-1 transition-all">
              <div className="flex items-center mb-2">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center mr-3">
                  <Activity className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <h3 className="text-slate-300 text-sm">Total Campaigns</h3>
                  <p className="text-2xl font-bold text-white">{myCampaigns.length}</p>
                </div>
              </div>
              <div className="flex text-xs mt-2">
                <span className="text-lime-400 mr-3">
                  {myCampaigns.filter(c => c.status === 'active').length} Active
                </span>
                <span className="text-yellow-400 mr-3">
                  {myCampaigns.filter(c => c.status === 'upcoming').length} Upcoming
                </span>
                <span className="text-slate-400">
                  {myCampaigns.filter(c => c.status === 'ended').length} Ended
                </span>
              </div>
            </div>
            
            <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-6 border border-lime-600/20 transform hover:-translate-y-1 transition-all">
              <div className="flex items-center mb-2">
                <div className="w-10 h-10 rounded-full bg-lime-500/20 flex items-center justify-center mr-3">
                  <Users className="h-5 w-5 text-lime-500" />
                </div>
                <div>
                  <h3 className="text-slate-300 text-sm">Total Projects</h3>
                  <p className="text-2xl font-bold text-white">
                    {myCampaigns.reduce((sum, campaign) => sum + (campaign.projectCount || 0), 0)}
                  </p>
                </div>
              </div>
              <div className="flex text-xs mt-2">
                <span className="text-lime-400">
                  {myCampaigns.reduce((sum, campaign) => sum + ((campaign.projectCount || 0) - (campaign.pendingProjects || 0)), 0)} Approved
                </span>
                <span className="text-yellow-400 ml-3">
                  {myCampaigns.reduce((sum, campaign) => sum + (campaign.pendingProjects || 0), 0)} Pending
                </span>
              </div>
            </div>
            
            <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-6 border border-lime-600/20 transform hover:-translate-y-1 transition-all">
              <div className="flex items-center mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mr-3">
                  <Award className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-slate-300 text-sm">Total Votes</h3>
                  <p className="text-2xl font-bold text-white">
                    {myCampaigns.reduce((sum, campaign) => sum + (campaign.totalVotes || 0), 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                Across {myCampaigns.length} campaigns
              </div>
            </div>
            
            <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-6 border border-lime-600/20 transform hover:-translate-y-1 transition-all">
              <div className="flex items-center mb-2">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mr-3">
                  <Droplets className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-slate-300 text-sm">Total Funds</h3>
                  <p className="text-2xl font-bold text-lime-400">
                    {myCampaigns.reduce((sum, campaign) => sum + Number(formatTokenAmount(campaign.totalFunds)), 0).toLocaleString()} CELO
                  </p>
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                Admin fees earned: {myCampaigns.reduce((sum, campaign) => {
                  const funds = Number(formatTokenAmount(campaign.totalFunds));
                  const fee = funds * Number(campaign.adminFeePercentage) / 100;
                  return sum + fee;
                }, 0).toFixed(2)} CELO
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* CTA Section */}
      <div className="py-16">
        <div className="container mx-auto px-6">
          <div className="bg-gradient-to-r from-lime-900/40 to-yellow-900/40 backdrop-blur-md rounded-2xl p-8 border border-lime-500/30">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Ready to launch a new campaign?</h2>
                <p className="text-lime-100">Create your next ocean conservation campaign and start making waves.</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={navigateToCreateCampaign}
                  className="px-6 py-3 rounded-full bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition-all flex items-center"
                >
                  <PlusCircle className="h-5 w-5 mr-2" />
                  Create Campaign
                </button>
                <button 
                  onClick={() => router.push('/campaigns')}
                  className="px-6 py-3 rounded-full bg-transparent border border-lime-400 text-lime-400 font-semibold hover:bg-lime-500/10 transition-all flex items-center"
                >
                  <Waves className="h-5 w-5 mr-2" />
                  Explore Campaigns
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Campaign Modal */}
      {deleteModalVisible && campaignToDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-md p-6 relative">
            <button 
              onClick={() => {
                setDeleteModalVisible(false);
                setCampaignToDelete(null);
              }} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                <Trash2 className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Delete Campaign</h3>
              <p className="text-slate-300">
                Are you sure you want to delete <span className="font-semibold text-white">{campaignToDelete.name}</span>? 
                This action cannot be undone.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={confirmDeleteCampaign}
                className="flex-1 py-3 px-6 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-500 transition-colors"
              >
                Delete Campaign
              </button>
              
              <button
                onClick={() => {
                  setDeleteModalVisible(false);
                  setCampaignToDelete(null);
                }}
                className="flex-1 py-3 px-6 bg-transparent border border-slate-500 text-slate-300 font-semibold rounded-lg hover:bg-slate-700 transition-colors"
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