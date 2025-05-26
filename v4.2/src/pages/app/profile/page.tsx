'use client';

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useBalance } from 'wagmi';
import { 
  User,
  FileCode,
  Vote,
  Coins,
  Trophy,
  Plus,
  ArrowRight,
  Filter,
  SortAsc,
  ExternalLink,
  Wallet,
  Loader2,
  Activity,
  TrendingUp,
  Star,
  Users,
  Zap,
  DollarSign,
  BarChart3,
  Home,
  Compass,
  CheckCircle,
  AlertCircle,
  Shield,
  QrCode,
  UserCheck,
  Clock,
  X
} from 'lucide-react';
import { useAllProjects } from '@/hooks/useProjectMethods';
import { useAllCampaigns } from '@/hooks/useCampaignMethods';
import { useUserVoteHistory } from '@/hooks/useVotingMethods';
import { Address } from 'viem';
import { formatEther } from 'viem';
import { formatIpfsUrl } from '@/utils/imageUtils';

// Real Self Protocol imports
import SelfQRcodeWrapper, { SelfAppBuilder } from '@selfxyz/qrcode';
import { v4 as uuidv4 } from 'uuid';

// Get contract address from environment
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_V4 as Address;
const CELO_TOKEN = import.meta.env.VITE_CELO_TOKEN as Address;

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: string;
  trend?: number | null;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const StatCard = ({ icon: Icon, label, value, color = 'blue', trend = null, onClick }: StatCardProps) => (
  <div 
    className={`bg-white rounded-lg p-4 shadow-sm border border-gray-200/50 hover:shadow-md transition-all ${onClick ? 'cursor-pointer' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between mb-2">
      <div className={`w-8 h-8 bg-${color}-50 rounded-lg flex items-center justify-center`}>
        <Icon className={`h-4 w-4 text-${color}-600`} />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
          <TrendingUp className="h-3 w-3" />
          <span>{Math.abs(trend)}%</span>
        </div>
      )}
    </div>
    <p className="text-xl font-bold text-gray-900 mb-1">{value}</p>
    <p className="text-xs text-gray-600">{label}</p>
  </div>
);

interface ProjectCardProps {
  project: {
    name: string;
    description: string;
    active: boolean;
    createdAt: bigint;
    campaignIds?: bigint[];
    metadata?: {
      additionalData?: string;
    };
  };
  onClick: () => void;
}

const ProjectCard = ({ project, onClick }: ProjectCardProps) => {
  const parsedMetadata = project.metadata?.additionalData 
    ? JSON.parse(project.metadata.additionalData) 
    : {};

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200/50 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {parsedMetadata.media?.logo ? (
            <img
              src={formatIpfsUrl(parsedMetadata.media.logo)}
              alt={`${project.name} logo`}
              className="w-8 h-8 rounded-lg object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
              {project.name?.charAt(0)}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
              {project.name}
            </h3>
            <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
              project.active ? 'text-green-600 bg-green-50' : 'text-gray-600 bg-gray-50'
            }`}>
              {project.active ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>
        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
      </div>
      
      <p className="text-gray-600 text-xs mb-3 line-clamp-2">{project.description}</p>
      
      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <span>Created {new Date(Number(project.createdAt) * 1000).toLocaleDateString()}</span>
        <span>{project.campaignIds?.length || 0} campaigns</span>
      </div>
      
      <button
        onClick={onClick}
        className="w-full px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium"
      >
        View Project
      </button>
    </div>
  );
};

interface CampaignCardProps {
  campaign: {
    name: string;
    description: string;
    active: boolean;
    startTime: bigint;
    endTime: bigint;
    maxWinners: bigint;
    totalFunds: bigint;
    metadata?: {
      mainInfo?: string;
      logo?: string;
    };
  };
  onClick: () => void;
}

const CampaignCard = ({ campaign, onClick }: CampaignCardProps) => {
  const parsedMetadata = campaign.metadata?.mainInfo 
    ? JSON.parse(campaign.metadata.mainInfo) 
    : {};

  const getStatus = () => {
    const now = Math.floor(Date.now() / 1000);
    const start = Number(campaign.startTime);
    const end = Number(campaign.endTime);
    
    if (!campaign.active) return 'inactive';
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'active';
    return 'ended';
  };

  const status = getStatus();
  const statusColors = {
    active: 'text-green-600 bg-green-50',
    ended: 'text-gray-600 bg-gray-50',
    upcoming: 'text-blue-600 bg-blue-50',
    inactive: 'text-red-600 bg-red-50'
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200/50 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {parsedMetadata.logo ? (
            <img
              src={formatIpfsUrl(parsedMetadata.logo)}
              alt={`${campaign.name} logo`}
              className="w-8 h-8 rounded-lg object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Trophy className="h-4 w-4" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900 text-sm group-hover:text-purple-600 transition-colors">
              {campaign.name}
            </h3>
            <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </div>
          </div>
        </div>
        <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
      </div>
      
      <p className="text-gray-600 text-xs mb-3 line-clamp-2">{campaign.description}</p>
      
      <div className="space-y-1 mb-3">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Total Funds</span>
          <span className="font-medium">{formatEther(BigInt(campaign.totalFunds))} CELO</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Max Winners</span>
          <span className="text-gray-900">{campaign.maxWinners.toString()}</span>
        </div>
      </div>
      
      <button
        onClick={onClick}
        className="w-full px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors text-xs font-medium"
      >
        View Campaign
      </button>
    </div>
  );
};

interface VoteCardProps {
  vote: {
    projectId: bigint;
    campaignId: bigint;
    amount: bigint;
    token: string;
    celoEquivalent: bigint;
    metadata?: {
      mainInfo?: string;
    };
  };
  onViewProject: (projectId: bigint) => void;
  onViewCampaign: (campaignId: bigint) => void;
}

const VoteCard = ({ vote, onViewProject, onViewCampaign }: VoteCardProps) => {
  const parsedMetadata = vote.metadata?.mainInfo 
    ? JSON.parse(vote.metadata.mainInfo) 
    : {};

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200/50 hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center text-white">
            <Vote className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">
              Project #{vote.projectId.toString()}
            </h3>
            <p className="text-xs text-gray-600">
              Campaign #{vote.campaignId.toString()}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-green-600">
            {formatEther(BigInt(vote.amount))} {vote.token === CELO_TOKEN ? 'CELO' : 'cUSD'}
          </p>
          <p className="text-xs text-gray-600">
            {formatEther(BigInt(vote.celoEquivalent))} CELO equiv.
          </p>
        </div>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={() => onViewProject(vote.projectId)}
          className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium"
        >
          View Project
        </button>
        <button
          onClick={() => onViewCampaign(vote.campaignId)}
          className="flex-1 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors text-xs font-medium"
        >
          View Campaign
        </button>
      </div>
    </div>
  );
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [isVerified, setIsVerified] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Generate userId for Self Protocol using UUID
  useEffect(() => {
    if (!userId) {
      // Generate a proper UUID for Self Protocol
      const newUserId = uuidv4();
      setUserId(newUserId);
      console.log('Generated userId:', newUserId);
    }
  }, [userId]);

  // Get user's CELO balance
  const { data: celoBalance } = useBalance({
    address,
    token: CELO_TOKEN,
  });

  // Fetch user's data
  const { projects: allProjects, isLoading: projectsLoading } = useAllProjects(CONTRACT_ADDRESS);
  const { campaigns: allCampaigns, isLoading: campaignsLoading } = useAllCampaigns(CONTRACT_ADDRESS);
  const { voteHistory, isLoading: votesLoading } = useUserVoteHistory(CONTRACT_ADDRESS, address as Address);

  // Filter user's data
  const userProjects = allProjects?.filter(project => 
    project.project.owner?.toLowerCase() === address?.toLowerCase()
  ) || [];

  const userCampaigns = allCampaigns?.filter(campaign => 
    campaign.campaign.admin?.toLowerCase() === address?.toLowerCase()
  ) || [];

  // Calculate user metrics including verification status
  const userMetrics = useMemo(() => {
    const totalVotes = voteHistory?.length || 0;
    const totalVoteValue = voteHistory?.reduce((sum, vote) => 
      sum + (Number(formatEther(vote.celoEquivalent || 0n))), 0
    ) || 0;

    return {
      projects: userProjects.length,
      campaigns: userCampaigns.length,
      votes: totalVotes,
      totalVoteValue: totalVoteValue.toFixed(2),
      balance: celoBalance ? Number(formatEther(celoBalance.value)).toFixed(2) : '0.00',
      isVerified
    };
  }, [userProjects, userCampaigns, voteHistory, celoBalance, isVerified]);

  // Filter and sort data
  const filteredProjects = useMemo(() => {
    let filtered = [...userProjects];

    if (filter !== 'all') {
      filtered = filtered.filter(project => project.project.active === (filter === 'active'));
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.project.name || '').localeCompare(b.project.name || '');
        case 'recent':
        default:
          return Number(b.project.createdAt || 0) - Number(a.project.createdAt || 0);
      }
    });
  }, [userProjects, filter, sortBy]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm mx-auto p-6 bg-white rounded-lg shadow-sm">
          <Wallet className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Connect Your Wallet</h1>
          <p className="text-gray-600 mb-4 text-sm">Please connect your wallet to view your profile.</p>
        </div>
      </div>
    );
  }

  if (projectsLoading || campaignsLoading || votesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-sm">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xl font-bold">
                  {address?.slice(2, 4).toUpperCase()}
                </div>
                {isVerified && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-gray-900">Profile Dashboard</h1>
                  {isVerified ? (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-full">
                      <Shield className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-medium text-green-700">Verified</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowVerification(true)}
                      className="flex items-center gap-1 px-2 py-1 bg-yellow-50 hover:bg-yellow-100 rounded-full transition-colors"
                    >
                      <Shield className="h-4 w-4 text-yellow-600" />
                      <span className="text-xs font-medium text-yellow-700">Verify Identity</span>
                    </button>
                  )}
                </div>
                <p className="text-gray-600 text-sm font-mono bg-gray-50 px-2 py-1 rounded">
                  {address}
                </p>
                {!isVerified && (
                  <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                    <strong>V3 Preview:</strong> Anti-Sybil verification coming soon
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-1 lg:ml-auto">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <StatCard icon={FileCode} label="Projects" value={userMetrics.projects} color="blue" />
                <StatCard icon={Trophy} label="Campaigns" value={userMetrics.campaigns} color="purple" />
                <StatCard icon={Vote} label="Votes Cast" value={userMetrics.votes} color="green" />
                <StatCard icon={Coins} label="Balance" value={`${userMetrics.balance} CELO`} color="amber" />
                <StatCard 
                  icon={Shield} 
                  label="Identity" 
                  value={isVerified ? "Verified" : "Unverified"} 
                  color={isVerified ? "green" : "yellow"} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Home },
            { id: 'projects', label: 'Projects', icon: FileCode },
            { id: 'campaigns', label: 'Campaigns', icon: Trophy },
            { id: 'votes', label: 'Votes', icon: Vote },
            { id: 'identity', label: 'Identity', icon: Shield }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => navigate('/app/project/start')}
                  className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 text-sm">Create Project</h3>
                    <p className="text-xs text-gray-600">Start a new project</p>
                  </div>
                </button>
                
                <button
                  onClick={() => navigate('/app/campaign/start')}
                  className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors group"
                >
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 text-sm">Launch Campaign</h3>
                    <p className="text-xs text-gray-600">Start funding campaign</p>
                  </div>
                </button>
                
                <button
                  onClick={() => navigate('/explore')}
                  className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors group"
                >
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white">
                    <Compass className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 text-sm">Explore</h3>
                    <p className="text-xs text-gray-600">Discover projects</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                icon={TrendingUp} 
                label="Total Vote Value" 
                value={`${userMetrics.totalVoteValue} CELO`} 
                color="green"
              />
              <StatCard 
                icon={Star} 
                label="Avg. Vote" 
                value={`${userMetrics.votes > 0 ? (Number(userMetrics.totalVoteValue) / userMetrics.votes).toFixed(2) : '0.00'} CELO`} 
                color="yellow"
              />
              <StatCard 
                icon={Users} 
                label="Active Projects" 
                value={userProjects.filter(p => p.project.active).length}
                color="purple"
              />
              <StatCard 
                icon={Zap} 
                label="Active Campaigns" 
                value={userCampaigns.filter(c => c.campaign.active).length}
                color="blue"
              />
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Projects</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <SortAsc className="h-4 w-4 text-gray-500" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="recent">Most Recent</option>
                    <option value="name">Name A-Z</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.project.id.toString()}
                  project={project.project}
                  onClick={() => navigate(`/explorers/project/${project.project.id}`)}
                />
              ))}
              
              {filteredProjects.length === 0 && (
                <div className="col-span-full text-center py-8 bg-white rounded-lg border border-gray-200">
                  <FileCode className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Projects Found</h3>
                  <p className="text-gray-600 mb-4 text-sm">
                    {filter === 'all' 
                      ? "You haven't created any projects yet." 
                      : `No ${filter} projects found.`
                    }
                  </p>
                  <button
                    onClick={() => navigate('/app/project/start')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Create Project
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userCampaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.campaign.id.toString()}
                  campaign={campaign.campaign}
                  onClick={() => navigate(`/explorers/campaign/${campaign.campaign.id}`)}
                />
              ))}
              
              {userCampaigns.length === 0 && (
                <div className="col-span-full text-center py-8 bg-white rounded-lg border border-gray-200">
                  <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Campaigns Found</h3>
                  <p className="text-gray-600 mb-4 text-sm">You haven't created any campaigns yet.</p>
                  <button
                    onClick={() => navigate('/app/campaign/start')}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                  >
                    Launch Campaign
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Votes Tab */}
        {activeTab === 'votes' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Voting Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Vote className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-900 text-sm">Total Votes</span>
                  </div>
                  <p className="text-xl font-bold text-green-600">{userMetrics.votes}</p>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900 text-sm">Total Value</span>
                  </div>
                  <p className="text-xl font-bold text-blue-600">{userMetrics.totalVoteValue} CELO</p>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-purple-900 text-sm">Avg. Vote</span>
                  </div>
                  <p className="text-xl font-bold text-purple-600">
                    {userMetrics.votes > 0 ? (Number(userMetrics.totalVoteValue) / userMetrics.votes).toFixed(2) : '0.00'} CELO
                  </p>
                </div>
              </div>
            </div>

            {/* Votes List */}
            <div className="space-y-3">
              {voteHistory.map((vote, index) => (
                <VoteCard
                  key={index}
                  vote={vote}
                  onViewProject={(projectId) => navigate(`/explorers/project/${projectId}`)}
                  onViewCampaign={(campaignId) => navigate(`/explorers/campaign/${campaignId}`)}
                />
              ))}
              
              {voteHistory.length === 0 && (
               <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
               <Vote className="h-12 w-12 text-gray-400 mx-auto mb-3" />
               <h3 className="text-lg font-semibold text-gray-900 mb-2">No Votes Cast Yet</h3>
               <p className="text-gray-600 mb-4 text-sm">Start participating by voting on projects you believe in.</p>
               <button
                 onClick={() => navigate('/explore')}
                 className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
               >
                 Explore Projects
               </button>
             </div>
           )}
         </div>
       </div>
     )}

     {/* Identity Tab */}
     {activeTab === 'identity' && (
       <div className="space-y-6">
         {/* Identity Status */}
         <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
           <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-3">
               <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                 isVerified ? 'bg-green-50' : 'bg-yellow-50'
               }`}>
                 <Shield className={`h-6 w-6 ${
                   isVerified ? 'text-green-600' : 'text-yellow-600'
                 }`} />
               </div>
               <div>
                 <h2 className="text-lg font-bold text-gray-900">
                   Identity Verification
                 </h2>
                 <p className="text-sm text-gray-600">
                   {isVerified ? 'Your identity has been verified' : 'Verify your identity for enhanced security'}
                 </p>
               </div>
             </div>
             {isVerified && (
               <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
                 <CheckCircle className="h-4 w-4 text-green-600" />
                 <span className="text-sm font-medium text-green-700">Verified</span>
               </div>
             )}
           </div>

           {!isVerified && (
             <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
               <div className="flex items-start gap-3">
                 <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                 <div>
                   <h3 className="font-semibold text-amber-800 mb-1">
                     V3 Preview: Anti-Sybil Future
                   </h3>
                   <p className="text-sm text-amber-700 mb-3">
                     With the upcoming V3 release, identity verification through Self Protocol will help prevent Sybil attacks and ensure fair participation in campaigns and voting.
                   </p>
                   <ul className="text-sm text-amber-700 space-y-1">
                     <li>• Enhanced voting integrity</li>
                     <li>• Reduced spam and fake accounts</li>
                     <li>• Increased trust in project funding</li>
                     <li>• Better reputation system</li>
                   </ul>
                 </div>
               </div>
             </div>
           )}

           {/* Verification Actions */}
           <div className="space-y-4">
             {!isVerified ? (
               <button
                 onClick={() => setShowVerification(true)}
                 className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
               >
                 <UserCheck className="h-5 w-5" />
                 Start Identity Verification
               </button>
             ) : (
               <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                 <div className="flex items-center gap-3">
                   <CheckCircle className="h-6 w-6 text-green-600" />
                   <div>
                     <h3 className="font-semibold text-green-800">Identity Verified</h3>
                     <p className="text-sm text-green-700">
                       Your account is verified and ready for V3 features
                     </p>
                   </div>
                 </div>
               </div>
             )}
           </div>

           {/* Benefits */}
           <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="p-4 bg-blue-50 rounded-lg">
               <h4 className="font-semibold text-blue-800 mb-2">Enhanced Security</h4>
               <p className="text-sm text-blue-700">
                 Protect your account and participate in verified-only campaigns
               </p>
             </div>
             <div className="p-4 bg-purple-50 rounded-lg">
               <h4 className="font-semibold text-purple-800 mb-2">Reputation Building</h4>
               <p className="text-sm text-purple-700">
                 Build trust within the community with verified identity
               </p>
             </div>
           </div>
         </div>
       </div>
     )}

     {/* Verification Modal */}
     {showVerification && userId && (
       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
         <div className="bg-white rounded-lg p-6 max-w-md w-full">
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-bold text-gray-900">Verify Identity</h3>
             <button
               onClick={() => setShowVerification(false)}
               className="text-gray-400 hover:text-gray-600"
             >
               <X className="h-5 w-5" />
             </button>
           </div>
           
           <p className="text-sm text-gray-600 mb-6">
             Scan the QR code with the Self app to verify your identity. This will enable enhanced features and anti-Sybil protection in V3.
           </p>
           
           <div className="flex justify-center mb-6">
             <SelfQRcodeWrapper
               selfApp={new SelfAppBuilder({
                 appName: "Sovereign Seas",
                 scope: "sovereign-seas-v3",
                 endpoint: "https://api.sovereignseas.com/verify",
                 endpointType: "https",
                 userId: userId || uuidv4(),
                 logoBase64: "", // Empty string or your base64 logo
               }).build()}
               onSuccess={() => {
                 console.log('Identity verified successfully for:', userId);
                 setIsVerified(true);
                 setShowVerification(false);
                
               }}
              
               size={250}
             />
           </div>
           
           <div className="text-center space-y-2">
             <p className="text-xs text-gray-500">
               User ID: {userId.substring(0, 8)}...{userId.substring(userId.length - 6)}
             </p>
             <p className="text-xs text-blue-600">
               Download the Self app to scan this QR code
             </p>
           </div>
         </div>
       </div>
     )}
   </div>
 </div>
);
}