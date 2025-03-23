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
  Image
} from 'lucide-react';
import { useSovereignSeas } from '../../../hooks/useSovereignSeas';

// Contract addresses - replace with actual addresses
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000000';
const CELO_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_CELO_TOKEN_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000000';

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
        return 'bg-emerald-500 text-white';
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 text-gray-800">
      {/* Header */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 z-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
            <path fill="#10b981" fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,149.3C672,149,768,171,864,176C960,181,1056,171,1152,154.7C1248,139,1344,117,1392,106.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
          </svg>
        </div>
        
        {/* Content */}
        <div className="container mx-auto px-6 py-12 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col items-start">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 flex items-center tracking-tight tilt-neon">
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center mr-3 shadow-sm">
                  <Settings className="h-5 w-5 text-emerald-600" />
                </div>
                My <span className="text-emerald-600 ml-2">Campaigns</span>
              </h1>
              <p className="text-gray-600 mt-2 max-w-2xl">
                Manage your campaigns, track projects, and distribute funds to innovative solutions.
              </p>
            </div>
            
            <button 
              onClick={navigateToCreateCampaign}
              className="px-5 py-2.5 rounded-full bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-all flex items-center shadow-sm text-sm"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create New Campaign
            </button>
          </div>
          
          {isSuperAdmin && (
            <div className="mt-4 bg-amber-50 text-amber-700 px-4 py-2 rounded-full inline-flex items-center text-sm border border-amber-100 shadow-sm">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Super Admin Access Enabled
            </div>
          )}
        </div>
      </div>
      
      {/* Content Area */}
      <div className="container mx-auto px-6 py-8">
        {!isConnected ? (
          <div className="bg-white rounded-xl p-8 border border-amber-200 text-center shadow-sm">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center shadow-sm">
              <Users className="h-6 w-6 text-amber-500" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-3">Wallet Not Connected</h2>
            <p className="text-gray-600 mb-6 max-w-lg mx-auto">
              Please connect your wallet to view and manage your campaigns. You need to be connected to the same wallet that created the campaigns.
            </p>
            <button className="px-5 py-2.5 rounded-full bg-amber-500 text-white font-medium hover:bg-amber-600 transition-all shadow-sm text-sm">
              Connect Wallet
            </button>
          </div>
        ) : loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 mb-8 shadow-sm">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-5 py-2 rounded-lg font-medium text-sm ${
                    activeTab === 'all'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } transition-colors`}
                >
                  All Campaigns
                </button>
                <button
                  onClick={() => setActiveTab('active')}
                  className={`px-5 py-2 rounded-lg font-medium text-sm ${
                    activeTab === 'active'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } transition-colors`}
                >
                  Active
                </button>
                <button
                  onClick={() => setActiveTab('upcoming')}
                  className={`px-5 py-2 rounded-lg font-medium text-sm ${
                    activeTab === 'upcoming'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } transition-colors`}
                >
                  Upcoming
                </button>
                <button
                  onClick={() => setActiveTab('ended')}
                  className={`px-5 py-2 rounded-lg font-medium text-sm ${
                    activeTab === 'ended'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } transition-colors`}
                >
                  Ended
                </button>
              </div>
            </div>
            
            {filteredCampaigns.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center my-12 shadow-sm border border-gray-100">
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                    <ListFilter className="h-8 w-8 text-gray-400" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No Campaigns Found</h3>
                <p className="text-gray-600 mb-6">
                  {activeTab === 'all' 
                    ? "You haven't created any campaigns yet."
                    : `You don't have any ${activeTab} campaigns.`}
                </p>
                <button 
                  onClick={navigateToCreateCampaign}
                  className="px-5 py-2.5 rounded-full bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-all inline-flex items-center shadow-sm text-sm"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Your First Campaign
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredCampaigns.map((campaign) => (
                  <div 
                    key={campaign.id.toString()}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Campaign Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between p-6 border-b border-gray-100">
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          <h3 className="text-xl font-bold text-gray-800">{campaign.name}</h3>
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
                          className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center text-sm shadow-sm"
                        >
                          <BarChart className="h-4 w-4 mr-2" />
                          Dashboard
                        </button>
                        
                        <button
                          onClick={() => navigateToCampaignAdmin(campaign.id.toString())}
                          className="px-4 py-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors flex items-center text-sm shadow-sm"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Admin Panel
                        </button>
                      </div>
                    </div>
                    
                    {/* Campaign Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 p-6">
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
                          <Droplets className="h-3 w-3 mr-1" />
                          Funds
                        </h4>
                        <div className="text-emerald-600">
                          {formatTokenAmount(campaign.totalFunds)} CELO
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
                    <div className="bg-gray-50 p-4 border-t border-gray-100 flex flex-wrap justify-between items-center gap-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => navigateToEditCampaign(campaign.id.toString())}
                          className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm flex items-center shadow-sm"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </button>
                        
                        <button
                          onClick={() => {
                            // Implement clone campaign functionality
                          }}
                          className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm flex items-center shadow-sm"
                        >
                          <Copy className="h-3.5 w-3.5 mr-1.5" />
                          Clone
                        </button>
                        
                        {/* Only show delete for upcoming campaigns that haven't started */}
                        {campaign.status === 'upcoming' && (
                          <button
                            onClick={() => handleDeleteCampaign(campaign)}
                            className="px-3 py-1.5 rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition-colors text-sm flex items-center shadow-sm"
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
                            className="px-4 py-2 rounded-full bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors flex items-center shadow-sm text-sm disabled:bg-gray-300 disabled:text-gray-500"
                          >
                            {isWritePending || isWaitingForTx ? (
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
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
        <div className="container mx-auto px-6 py-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center mr-3 shadow-sm">
              <BarChart className="h-4 w-4 text-emerald-600" />
            </div>
            Campaign Analytics
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-center mb-2">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mr-3">
                  <Activity className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-gray-500 text-xs">Total Campaigns</h3>
                  <p className="text-xl font-bold text-gray-800">{myCampaigns.length}</p>
                </div>
              </div>
              <div className="flex text-xs mt-2">
                <span className="text-emerald-600 mr-3">
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
            
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-center mb-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
                  <Users className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-gray-500 text-xs">Total Funds</h3>
                  <p className="text-xl font-bold text-emerald-600">
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
      )}
      
      {/* CTA Section */}
      <div className="py-12">
        <div className="container mx-auto px-6">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100 shadow-sm">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2 tilt-neon">Ready to launch a new campaign?</h2>
                <p className="text-emerald-700 text-sm">Create your next funding campaign and support innovative solutions.</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={navigateToCreateCampaign}
                  className="px-5 py-2.5 rounded-full bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-all flex items-center shadow-sm text-sm"
                >
                  <PlusCircle className="h-4 w-4 mr-1.5" />
                  Create Campaign
                </button>
                <button 
                  onClick={() => router.push('/campaigns')}
                  className="px-5 py-2.5 rounded-full bg-white text-emerald-600 border border-gray-200 font-medium hover:bg-gray-50 transition-all flex items-center shadow-sm text-sm"
                >
                  <BarChart className="h-4 w-4 mr-1.5" />
                  Explore Campaigns
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Campaign Modal */}
      {deleteModalVisible && campaignToDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md p-6 relative shadow-lg">
            <button 
              onClick={() => {
                setDeleteModalVisible(false);
                setCampaignToDelete(null);
              }} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <Trash2 className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Campaign</h3>
              <p className="text-gray-600">
                Are you sure you want to delete <span className="font-semibold text-gray-800">{campaignToDelete.name}</span>? 
                This action cannot be undone.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={confirmDeleteCampaign}
                className="flex-1 py-2.5 px-5 bg-red-500 text-white font-medium rounded-full hover:bg-red-600 transition-colors shadow-sm"
              >
                Delete Campaign
              </button>
              
              <button
                onClick={() => {
                  setDeleteModalVisible(false);
                  setCampaignToDelete(null);
                }}
                className="flex-1 py-2.5 px-5 bg-white border border-gray-200 text-gray-700 font-medium rounded-full hover:bg-gray-50 transition-colors shadow-sm"
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