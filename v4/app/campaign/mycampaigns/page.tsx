'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { 
  PlusCircle, 
  Settings, 
  Clock, 
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
  Trash2,
  Video,
  Image,
  Hash,
  Coins
} from 'lucide-react';
import { useSovereignSeas } from '../../../hooks/useSovereignSeas';


// Campaign type definition
type Campaign = {
  id: bigint;
  admin: string;
  name: string;
  description: string;
  logo: string;           // Added field
  demoVideo: string;      // Added field
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
  hasMediaContent?: boolean; // Added to track if campaign has media
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
    isSuperAdmin,  // Added from hook
  } = useSovereignSeas();

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
        // Include campaigns where user is super admin
        const userCampaigns = allCampaigns.filter(
          campaign => campaign.admin.toLowerCase() === address.toLowerCase() || isSuperAdmin
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
            
            // Check if campaign has media content
            const hasMediaContent = campaign.logo?.trim().length > 0 || campaign.demoVideo?.trim().length > 0;
            
            return {
              ...campaign,
              projectCount: projects.length,
              pendingProjects,
              totalVotes,
              status,
              timeRemaining,
              hasMediaContent
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
        return 'bg-blue-500 text-white';
      case 'upcoming':
        return 'bg-amber-400 text-amber-900';
      case 'ended':
        return 'bg-gray-300 text-gray-700';
      default:
        return 'bg-gray-300 text-gray-700';
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
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50 text-gray-800 relative">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-r from-blue-400/10 to-indigo-400/10 animate-float-slower blur-2xl"></div>
        <div className="absolute top-2/3 right-1/4 w-80 h-80 rounded-full bg-gradient-to-r from-sky-400/10 to-blue-400/10 animate-float-slow blur-2xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 rounded-full bg-gradient-to-r from-indigo-400/10 to-purple-400/10 animate-float blur-2xl"></div>
      </div>
      
      {/* Header */}
      <div className="relative overflow-hidden z-10">
        {/* Background Pattern */}
        <div className="absolute inset-0 z-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
            <path fill="#3B82F6" fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,149.3C672,149,768,171,864,176C960,181,1056,171,1152,154.7C1248,139,1344,117,1392,106.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
          </svg>
        </div>
        
        {/* Content */}
        <div className="container mx-auto px-6 py-12 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col items-start">
              <h1 className="text-3xl md:text-4xl font-bold flex items-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3 shadow-sm">
                  <Settings className="h-5 w-5 text-blue-600" />
                </div>
                My <span className="ml-2">Campaigns</span>
              </h1>
              <p className="text-gray-600 mt-2 max-w-2xl">
                Manage your campaigns, track projects, and distribute funds to innovative solutions.
              </p>
            </div>
            
            <button 
              onClick={navigateToCreateCampaign}
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center shadow-sm text-sm border border-blue-400/30 relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center">
                <PlusCircle className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                Create New Campaign
              </span>
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
            </button>
          </div>
          
          {isSuperAdmin && (
            <div className="mt-4 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full inline-flex items-center text-sm border border-indigo-100 shadow-sm">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Super Admin Access Enabled
            </div>
          )}
        </div>
      </div>
      
      {/* Content Area */}
      <div className="container mx-auto px-6 py-8 relative z-10">
        {!isConnected ? (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 border border-blue-100 text-center shadow-lg group hover:shadow-xl transition-all hover:-translate-y-2 duration-300 relative overflow-hidden">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-10 blur-sm transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center shadow-sm">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700 mb-3">Wallet Not Connected</h2>
              <p className="text-gray-600 mb-6 max-w-lg mx-auto">
                Please connect your wallet to view and manage your campaigns. You need to be connected to the same wallet that created the campaigns.
              </p>
              <button className="px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 shadow-sm text-sm border border-blue-400/30 relative overflow-hidden group">
                <span className="relative z-10">Connect Wallet</span>
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-blue-100 mb-8 shadow-lg group hover:shadow-xl transition-all duration-300 relative overflow-hidden">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-10 blur-sm transition-all duration-500"></div>
              <div className="relative z-10 flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-5 py-2 rounded-lg font-medium text-sm ${
                    activeTab === 'all'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } transition-colors`}
                >
                  All Campaigns
                </button>
                <button
                  onClick={() => setActiveTab('active')}
                  className={`px-5 py-2 rounded-lg font-medium text-sm ${
                    activeTab === 'active'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } transition-colors`}
                >
                  Active
                </button>
                <button
                  onClick={() => setActiveTab('upcoming')}
                  className={`px-5 py-2 rounded-lg font-medium text-sm ${
                    activeTab === 'upcoming'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } transition-colors`}
                >
                  Upcoming
                </button>
                <button
                  onClick={() => setActiveTab('ended')}
                  className={`px-5 py-2 rounded-lg font-medium text-sm ${
                    activeTab === 'ended'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } transition-colors`}
                >
                  Ended
                </button>
              </div>
            </div>
            
            {filteredCampaigns.length === 0 ? (
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 text-center my-12 shadow-lg border border-blue-100 group hover:shadow-xl transition-all hover:-translate-y-2 duration-300 relative overflow-hidden">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-10 blur-sm transition-all duration-500"></div>
                <div className="relative z-10">
                  <div className="flex justify-center mb-4">
                    <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center">
                      <ListFilter className="h-8 w-8 text-blue-400" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700 mb-2">No Campaigns Found</h3>
                  <p className="text-gray-600 mb-6">
                    {activeTab === 'all' 
                      ? "You haven't created any campaigns yet."
                      : `You don't have any ${activeTab} campaigns.`}
                  </p>
                  <button 
                    onClick={navigateToCreateCampaign}
                    className="px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 inline-flex items-center shadow-sm text-sm border border-blue-400/30 relative overflow-hidden group"
                  >
                    <span className="relative z-10 flex items-center">
                      <PlusCircle className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                      Create Your First Campaign
                    </span>
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredCampaigns.map((campaign) => (
                  <div 
                    key={campaign.id.toString()}
                    className="bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100 overflow-hidden shadow-lg group hover:shadow-xl transition-all hover:-translate-y-1 duration-300 relative"
                  >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-10 blur-sm transition-all duration-500"></div>
                    {/* Campaign Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between p-6 border-b border-gray-100 relative z-10">
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">{campaign.name}</h3>
                          <span className={`ml-3 px-3 py-1 rounded-full text-xs font-medium inline-flex items-center ${getStatusColor(campaign.status)}`}>
                            {getStatusIcon(campaign.status)}
                            {campaign.status === 'active' ? 'Active' : 
                             campaign.status === 'upcoming' ? 'Upcoming' : 'Ended'}
                          </span>
                          
                          {campaign.hasMediaContent && (
                            <div className="ml-2 flex">
                              {campaign.logo && (
                                <span className="text-xs text-blue-500 flex items-center ml-1">
                                  <Image className="h-3 w-3 mr-1" />
                                </span>
                              )}
                              {campaign.demoVideo && (
                                <span className="text-xs text-red-500 flex items-center ml-1">
                                  <Video className="h-3 w-3 mr-1" />
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <p className="text-gray-600 mt-1 line-clamp-1">{campaign.description}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
                        <button
                          onClick={() => navigateToCampaignDashboard(campaign.id.toString())}
                          className="px-4 py-2 rounded-lg bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors flex items-center text-sm shadow-sm"
                        >
                          <BarChart className="h-4 w-4 mr-2" />
                          Dashboard
                        </button>
                        
                        <button
                          onClick={() => navigateToCampaignAdmin(campaign.id.toString())}
                          className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-md transition-all flex items-center text-sm shadow-sm"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Admin Panel
                        </button>
                      </div>
                    </div>
                    
                    {/* Campaign Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 p-6 relative z-10">
                      <div>
                        <h4 className="text-xs text-gray-500 uppercase mb-1 flex items-center">
                          <CalendarRange className="h-3 w-3 mr-1" />
                          Timeline
                        </h4>
                        <div className="text-gray-800">
                          {campaign.status === 'active' && campaign.timeRemaining ? (
                            <span className="text-amber-600">
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
                        <h4 className="text-xs text-gray-500 uppercase mb-1 flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          Projects
                        </h4>
                        <div className="text-gray-800">
                          {campaign.projectCount || 0} total 
                          {campaign.pendingProjects ? (
                            <span className="text-amber-600 ml-1">
                              ({campaign.pendingProjects} pending)
                            </span>
                          ) : null}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-xs text-gray-500 uppercase mb-1 flex items-center">
                          <Coins className="h-3 w-3 mr-1" />
                          Funds
                        </h4>
                        <div className="text-blue-600">
                          {parseFloat(formatTokenAmount(campaign.totalFunds)).toFixed(2)} CELO
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-xs text-gray-500 uppercase mb-1 flex items-center">
                          <Award className="h-3 w-3 mr-1" />
                          Distribution
                        </h4>
                        <div className="text-gray-800">
                          {campaign.useQuadraticDistribution ? 'Quadratic' : 'Linear'} 
                          {campaign.maxWinners.toString() !== '0' ? 
                            ` (Top ${campaign.maxWinners.toString()})` : 
                            ' (All Projects)'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Campaign Actions */}
                    <div className="bg-gray-50 p-4 border-t border-gray-100 flex flex-wrap justify-between items-center gap-4 relative z-10">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => navigateToEditCampaign(campaign.id.toString())}
                          className="px-3 py-1.5 rounded-full bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors text-sm flex items-center shadow-sm group"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1.5 group-hover:rotate-12 transition-transform duration-300" />
                          Edit
                        </button>
                        
                        <button
                          onClick={() => {
                            // Implement clone campaign functionality
                          }}
                          className="px-3 py-1.5 rounded-full bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors text-sm flex items-center shadow-sm group"
                        >
                          <Copy className="h-3.5 w-3.5 mr-1.5 group-hover:rotate-12 transition-transform duration-300" />
                          Clone
                        </button>
                        
                        {/* Only show delete for upcoming campaigns that haven't started */}
                        {campaign.status === 'upcoming' && (
                          <button
                            onClick={() => handleDeleteCampaign(campaign)}
                            className="px-3 py-1.5 rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition-colors text-sm flex items-center shadow-sm group"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5 group-hover:rotate-12 transition-transform duration-300" />
                            Delete
                          </button>
                        )}
                      </div>
                      
                      <div>
                        {campaign.status === 'ended' && campaign.active && (
                          <button
                            onClick={() => handleDistributeFunds(campaign.id)}
                            disabled={isWritePending || isWaitingForTx}
                            className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center shadow-sm text-sm disabled:bg-gray-300 disabled:text-gray-500 disabled:hover:shadow-none disabled:hover:translate-y-0 border border-amber-400/30 relative overflow-hidden group"
                          >
                            {isWritePending || isWaitingForTx ? (
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                Processing...
                              </div>
                            ) : (
                              <>
                                <span className="relative z-10 flex items-center">
                                  <Award className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                                  Distribute Funds
                                </span>
                                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                              </>
                            )}
                          </button>
                        )}
                        
                        {campaign.status === 'ended' && !campaign.active && (
                          <span className="px-4 py-2 rounded-full bg-green-50 text-green-700 border border-green-200 flex items-center text-sm shadow-sm">
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
        <div className="container mx-auto px-6 py-12 relative z-10">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-6 flex items-center">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 shadow-sm">
              <BarChart className="h-4 w-4 text-blue-600" />
            </div>
            Campaign Analytics
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-5 border border-blue-100 shadow-lg group hover:shadow-xl transition-all hover:-translate-y-2 duration-300 relative overflow-hidden">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-10 blur-sm transition-all duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <Activity className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-gray-500 text-xs">Total Campaigns</h3>
                    <p className="text-xl font-bold text-gray-800">{myCampaigns.length}</p>
                  </div>
                </div>
                <div className="flex text-xs mt-2">
                  <span className="text-blue-600 mr-3">
                    {myCampaigns.filter(c => c.status === 'active').length} Active
                  </span>
                  <span className="text-amber-600 mr-3">
                    {myCampaigns.filter(c => c.status === 'upcoming').length} Upcoming
                  </span>
                  <span className="text-gray-500">
                    {myCampaigns.filter(c => c.status === 'ended').length} Ended
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-5 border border-blue-100 shadow-lg group hover:shadow-xl transition-all hover:-translate-y-2 duration-300 relative overflow-hidden">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-10 blur-sm transition-all duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <Coins className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-gray-500 text-xs">Total Funds</h3>
                    <p className="text-xl font-bold text-blue-600">
                      {myCampaigns.reduce((sum, campaign) => sum + Number(formatTokenAmount(campaign.totalFunds)), 0).toFixed(2)} CELO
                    </p>
                  </div>
                </div>
                <div className="text-xs mt-2 text-gray-500">
                  Admin fees earned: {myCampaigns.reduce((sum, campaign) => {
                    const funds = Number(formatTokenAmount(campaign.totalFunds));
                    const fee = funds * Number(campaign.adminFeePercentage) / 100;
                    return sum + fee;
                  }, 0).toFixed(2)} CELO
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* CTA Section */}
      <div className="py-12 relative z-10">
        <div className="container mx-auto px-6">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-blue-100 shadow-lg group hover:shadow-xl transition-all hover:-translate-y-2 duration-300 relative overflow-hidden">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-10 blur-sm transition-all duration-500"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0">
                <h2 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">Ready to launch a new campaign?</h2>
                <p className="text-blue-700 text-sm">Create your next funding campaign and support innovative solutions.</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={navigateToCreateCampaign}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center shadow-sm text-sm border border-blue-400/30 relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center">
                    <PlusCircle className="h-4 w-4 mr-1.5 group-hover:rotate-12 transition-transform duration-300" />
                    Create Campaign
                  </span>
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                </button>
                <button 
                  onClick={() => router.push('/campaigns')}
                  className="px-5 py-2.5 rounded-full bg-white text-blue-600 border border-blue-200 font-medium hover:bg-blue-50 transition-all flex items-center shadow-sm text-sm relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center">
                    <BarChart className="h-4 w-4 mr-1.5 group-hover:translate-x-1 transition-transform duration-300" />
                    Explore Campaigns
                  </span>
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-blue-100/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Campaign Modal */}
      {deleteModalVisible && campaignToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl w-full max-w-md p-6 relative shadow-xl border border-blue-100 group animate-float-delay-1">
            <button 
              onClick={() => {
                setDeleteModalVisible(false);
                setCampaignToDelete(null);
              }} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:rotate-90 transition-all duration-300"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 animate-float-delay-2">
                <Trash2 className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-pink-600 mb-2">Delete Campaign</h3>
              <p className="text-gray-600">
                Are you sure you want to delete <span className="font-semibold text-gray-800">{campaignToDelete.name}</span>? 
                This action cannot be undone.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={confirmDeleteCampaign}
                className="flex-1 py-2.5 px-5 bg-gradient-to-r from-red-500 to-pink-600 text-white font-medium rounded-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 shadow-sm border border-red-400/30 relative overflow-hidden group"
              >
                <span className="relative z-10">Delete Campaign</span>
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
              </button>
              
              <button
                onClick={() => {
                  setDeleteModalVisible(false);
                  setCampaignToDelete(null);
                }}
                className="flex-1 py-2.5 px-5 bg-white border border-gray-200 text-gray-700 font-medium rounded-full hover:bg-gray-50 transition-colors shadow-sm relative overflow-hidden group"
              >
                <span className="relative z-10">Cancel</span>
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-gray-100/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}