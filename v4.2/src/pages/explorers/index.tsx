'use client';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { 
  Search,
  Filter,
  Grid,
  List,
  ChevronDown,
  X,
  Loader2,
  Sparkles,
  Calendar,
  MapPin,
  Users,
  Trophy,
  Target,
  Code,
  DollarSign,
  Clock,
  TrendingUp,
  Heart,
  Globe,
  Tag,
  Briefcase,
  Award,
  CheckCircle,
  PlayCircle,
  Menu,
  Settings,
  Zap,
  Rocket,
  Activity,
  Star,
  Eye,
  Plus,
  ArrowRight,
  BarChart3,
  Building2,
  Layers,
  Filter as FilterIcon,
  SortAsc,
  Hash,
  MessageSquare,
  Share2,
  BookOpen,
  Compass,
  Database,
  Network,
  Shield,
  Flame,
  Crown,
  Diamond
} from 'lucide-react';
import { useAllProjects } from '@/hooks/useProjectMethods';
import { useAllCampaigns } from '@/hooks/useCampaignMethods';
import { Address } from 'viem';
import { formatEther } from 'viem';
import { formatIpfsUrl } from '@/utils/imageUtils';

// Get contract address from environment
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_V4 as Address;

interface ProjectMetadata {
  bio?: string;
  contractInfo?: string;
  additionalData?: string;
  category?: string;
  tags?: string[];
  location?: string;
  teamSize?: string;
  coverImage?: string;
  logo?: string;
  [key: string]: any;
}

interface Project {
  id: bigint;
  owner: Address;
  name: string;
  description: string;
  transferrable: boolean;
  active: boolean;
  createdAt: bigint;
  campaignIds: bigint[];
  metadata?: ProjectMetadata;
  contracts?: Address[];
}

interface CampaignMetadata {
  mainInfo?: string;
  additionalInfo?: string;
  customDistributionData?: string;
  type?: string;
  category?: string;
  tags?: string[];
  logo?: string;
  bannerImage?: string;
  [key: string]: any;
}

interface Campaign {
  id: bigint;
  admin: Address;
  name: string;
  description: string;
  startTime: bigint;
  endTime: bigint;
  adminFeePercentage: bigint;
  maxWinners: bigint;
  useQuadraticDistribution: boolean;
  useCustomDistribution: boolean;
  payoutToken: Address;
  active: boolean;
  totalFunds: bigint;
  metadata?: CampaignMetadata;
  status?: 'upcoming' | 'active' | 'ended' | 'paused';
}

type ExplorerItem = (Project | Campaign) & { itemType: 'project' | 'campaign' };

export default function UnifiedExplorer() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'projects' | 'campaigns'>('projects');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'popular'>('newest');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);

  // Use hooks for both projects and campaigns
  const { projects, isLoading: projectsLoading, error: projectsError } = useAllProjects(CONTRACT_ADDRESS);
  const { campaigns, isLoading: campaignsLoading, error: campaignsError } = useAllCampaigns(CONTRACT_ADDRESS);

  // Categories for both projects and campaigns
  const projectCategories = [
    'DeFi', 'NFT', 'Gaming', 'Infrastructure', 'DAO', 'Social', 'Identity', 
    'Privacy', 'Analytics', 'Developer Tools', 'Wallet', 'Exchange', 'Lending',
    'Insurance', 'Real Estate', 'Supply Chain', 'Healthcare', 'Education', 'Other'
  ];

  const campaignCategories = [
    'Grants Round', 'Hackathon', 'Accelerator', 'Bounty Program', 'Contest',
    'Community Round', 'Innovation Challenge', 'Research Fund', 'Social Impact',
    'Climate Action', 'Open Source', 'Education', 'Other'
  ];

  const tags = [
    'Ethereum', 'Polygon', 'Solana', 'Celo', 'Avalanche', 'Arbitrum', 'Optimism',
    'Layer 2', 'Zero Knowledge', 'AI', 'Machine Learning', 'Web3', 'DeFi', 'NFT',
    'Gaming', 'Social', 'DAO', 'Metaverse', 'Innovation', 'Grants', 'Hackathon',
    'Accelerator', 'Bounty', 'Community', 'Open Source'
  ];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Enhanced metadata parsing
  const parseProjectMetadata = (projectDetails: any): ProjectMetadata => {
    let parsedMetadata: ProjectMetadata = {};
    
    try {
      if (projectDetails.metadata?.bio) {
        parsedMetadata.bio = projectDetails.metadata.bio;
      }

      if (projectDetails.metadata?.contractInfo) {
        try {
          const contractInfo = JSON.parse(projectDetails.metadata.contractInfo);
          parsedMetadata = { ...parsedMetadata, ...contractInfo };
        } catch (e) {
          parsedMetadata.contractInfo = projectDetails.metadata.contractInfo;
        }
      }

      if (projectDetails.metadata?.additionalData) {
        try {
          const additionalData = JSON.parse(projectDetails.metadata.additionalData);
          // Handle nested structures
          if (additionalData.media) {
            parsedMetadata.logo = additionalData.media.logo;
            parsedMetadata.coverImage = additionalData.media.coverImage;
          }
          if (additionalData.links) {
            parsedMetadata = { ...parsedMetadata, ...additionalData.links };
          }
          parsedMetadata = { ...parsedMetadata, ...additionalData };
        } catch (e) {
          parsedMetadata.additionalData = projectDetails.metadata.additionalData;
        }
      }
    } catch (e) {
      console.warn('Error parsing project metadata:', e);
    }

    return parsedMetadata;
  };

  const parseCampaignMetadata = (campaignDetails: any): CampaignMetadata => {
    let parsedMetadata: CampaignMetadata = {};
    
    try {
      if (campaignDetails.metadata?.mainInfo) {
        try {
          const mainInfo = JSON.parse(campaignDetails.metadata.mainInfo);
          parsedMetadata = { ...parsedMetadata, ...mainInfo };
        } catch (e) {
          parsedMetadata.mainInfo = campaignDetails.metadata.mainInfo;
        }
      }

      if (campaignDetails.metadata?.additionalInfo) {
        try {
          const additionalInfo = JSON.parse(campaignDetails.metadata.additionalInfo);
          parsedMetadata = { ...parsedMetadata, ...additionalInfo };
        } catch (e) {
          parsedMetadata.additionalInfo = campaignDetails.metadata.additionalInfo;
        }
      }
    } catch (e) {
      console.warn('Error parsing campaign metadata:', e);
    }

    return parsedMetadata;
  };

  const getCampaignStatus = (campaign: Campaign): 'upcoming' | 'active' | 'ended' | 'paused' => {
    const now = Math.floor(Date.now() / 1000);
    const start = Number(campaign.startTime);
    const end = Number(campaign.endTime);
    
    if (now < start) {
      return 'upcoming';
    } else if (now >= start && now <= end && campaign.active) {
      return 'active';
    } else if (now > end) {
      return 'ended';
    } else {
      return 'paused';
    }
  };

  // Filter and transform projects
  useEffect(() => {
    if (!projects) return;

    let transformed = projects.map(projectDetails => {
      const parsedMetadata = parseProjectMetadata(projectDetails);
      
      return {
        id: projectDetails.project.id,
        owner: projectDetails.project.owner,
        name: projectDetails.project.name,
        description: projectDetails.project.description,
        transferrable: projectDetails.project.transferrable,
        active: projectDetails.project.active,
        createdAt: projectDetails.project.createdAt,
        campaignIds: projectDetails.project.campaignIds,
        metadata: parsedMetadata,
        contracts: projectDetails.contracts,
        itemType: 'project' as const
      };
    });

    // Apply filters
    let filtered = [...transformed];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        (item.metadata?.bio && item.metadata.bio.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(item => {
        const category = item.metadata?.category;
        return category && selectedCategories.includes(category);
      });
    }

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(item => {
        const tags = item.metadata?.tags;
        return tags && Array.isArray(tags) && tags.some(tag => selectedTags.includes(tag));
      });
    }

    // Status filter
    if (selectedStatus.length > 0) {
      filtered = filtered.filter(item => {
        const status = item.active ? 'Active' : 'Inactive';
        return selectedStatus.includes(status);
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return Number(b.createdAt) - Number(a.createdAt);
        case 'oldest':
          return Number(a.createdAt) - Number(b.createdAt);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'popular':
          return (b.campaignIds?.length || 0) - (a.campaignIds?.length || 0);
        default:
          return 0;
      }
    });

    setFilteredProjects(filtered);
  }, [projects, searchQuery, selectedCategories, selectedTags, selectedStatus, sortBy]);

  // Filter and transform campaigns
  useEffect(() => {
    if (!campaigns) return;

    let transformed = campaigns.map(campaignDetails => {
      const parsedMetadata = parseCampaignMetadata(campaignDetails);
      const status = getCampaignStatus(campaignDetails.campaign);
      
      return {
        id: campaignDetails.campaign.id,
        admin: campaignDetails.campaign.admin,
        name: campaignDetails.campaign.name,
        description: campaignDetails.campaign.description,
        startTime: campaignDetails.campaign.startTime,
        endTime: campaignDetails.campaign.endTime,
        adminFeePercentage: campaignDetails.campaign.adminFeePercentage,
        maxWinners: campaignDetails.campaign.maxWinners,
        useQuadraticDistribution: campaignDetails.campaign.useQuadraticDistribution,
        useCustomDistribution: campaignDetails.campaign.useCustomDistribution,
        payoutToken: campaignDetails.campaign.payoutToken,
        active: campaignDetails.campaign.active,
        totalFunds: campaignDetails.campaign.totalFunds,
        metadata: parsedMetadata,
        status,
        itemType: 'campaign' as const
      };
    });

    // Apply filters
    let filtered = [...transformed];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        (item.metadata?.bio && item.metadata.bio.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(item => {
        const category = item.metadata?.category;
        return category && selectedCategories.includes(category);
      });
    }

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(item => {
        const tags = item.metadata?.tags;
        return tags && Array.isArray(tags) && tags.some(tag => selectedTags.includes(tag));
      });
    }

    // Status filter
    if (selectedStatus.length > 0) {
      filtered = filtered.filter(item => {
        const status = item.status?.charAt(0).toUpperCase() + item.status?.slice(1) || '';
        return selectedStatus.includes(status);
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return Number(b.startTime) - Number(a.startTime);
        case 'oldest':
          return Number(a.startTime) - Number(b.startTime);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'popular':
          return Number(b.totalFunds) - Number(a.totalFunds);
        default:
          return 0;
      }
    });

    setFilteredCampaigns(filtered);
  }, [campaigns, searchQuery, selectedCategories, selectedTags, selectedStatus, sortBy]);

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const toggleStatus = (status: string) => {
    setSelectedStatus(prev => 
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedTags([]);
    setSelectedStatus([]);
    setSortBy('newest');
  };

  if (!isMounted) {
    return null;
  }

  const isLoading = projectsLoading || campaignsLoading;
  const error = projectsError || campaignsError;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md mx-auto border border-red-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Data</h2>
            <p className="text-gray-600 mb-6">{error.message || 'An unknown error occurred'}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
            <Rocket className="h-10 w-10 text-blue-600 absolute inset-0 m-auto animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading Explorer</h2>
          <p className="text-gray-600">Discovering projects and campaigns...</p>
        </div>
      </div>
    );
  }

  const totalProjects = projects?.length || 0;
  const totalCampaigns = campaigns?.length || 0;
  const activeProjects = filteredProjects.filter(p => p.active).length;
  const activeCampaigns = filteredCampaigns.filter(c => c.status === 'active').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white/90 backdrop-blur-sm border-b border-gray-200 p-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Explorer
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {viewMode === 'grid' ? <List className="h-5 w-5" /> : <Grid className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-80 bg-white/95 backdrop-blur-xl border-r border-gray-200 transition-transform duration-300 ease-in-out lg:block`}>
          
          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Compass className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Explorer</h1>
                  <p className="text-sm text-gray-500">Discover & Fund</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="flex items-center space-x-2">
                  <Code className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Projects</span>
                </div>
                <p className="text-lg font-bold text-blue-600 mt-1">{totalProjects}</p>
                <p className="text-xs text-blue-500">{activeProjects} active</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                <div className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">Campaigns</span>
                </div>
                <p className="text-lg font-bold text-purple-600 mt-1">{totalCampaigns}</p>
                <p className="text-xs text-purple-500">{activeCampaigns} active</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="p-6 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects & campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Categories */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Tag className="h-4 w-4 mr-2 text-gray-600" />
                Categories
              </h3>
              <div className="space-y-2">
                {(activeTab === 'projects' ? projectCategories : campaignCategories).map(category => (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategories.includes(category)
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Hash className="h-4 w-4 mr-2 text-gray-600" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Activity className="h-4 w-4 mr-2 text-gray-600" />
                Status
              </h3>
              <div className="space-y-2">
                {(activeTab === 'projects' 
                  ? ['Active', 'Inactive'] 
                  : ['Active', 'Upcoming', 'Ended', 'Paused']
                ).map(status => (
                  <button
                    key={status}
                    onClick={() => toggleStatus(status)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedStatus.includes(status)
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <SortAsc className="h-4 w-4 mr-2 text-gray-600" />
                Sort By
              </h3>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name (A-Z)</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>

            {/* Clear Filters */}
            {(selectedCategories.length > 0 || selectedTags.length > 0 || selectedStatus.length > 0 || searchQuery) && (
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium border border-red-200"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 lg:ml-0">
          {/* Header */}
          <div className="hidden lg:block bg-white/90 backdrop-blur-sm border-b border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {activeTab === 'projects' ? 'Projects' : 'Campaigns'}
                </h1>
                <p className="text-gray-600">
                  {activeTab === 'projects' 
                    ? 'Discover innovative projects and their journey'
                    : 'Find funding opportunities and join active campaigns'
                  }
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 bg-white rounded-xl border border-gray-200 p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Cool Tab Switcher */}
            <div className="relative">
              <div className="flex bg-gray-100 rounded-2xl p-1 relative">
                <div
                  className={`absolute top-1 bottom-1 bg-white rounded-xl shadow-sm transition-all duration-300 ease-out ${
                    activeTab === 'projects' ? 'left-1 w-[calc(50%-0.25rem)]' : 'left-1/2 w-[calc(50%-0.25rem)]'
                  }`}
                />
                <button
                  onClick={() => setActiveTab('projects')}
                  className={`relative flex-1 flex items-center justify-center space-x-3 py-3 px-6 rounded-xl font-semibold transition-colors duration-300 ${
                    activeTab === 'projects' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Code className="h-5 w-5" />
                  <span>Projects</span>
                  <div className="flex items-center space-x-1 bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                    <span>{totalProjects}</span>
                    {activeProjects > 0 && (
                      <>
                        <div className="w-1 h-1 bg-blue-400 rounded-full" />
                        <span>{activeProjects} active</span>
                        </>
                   )}
                 </div>
               </button>
               <button
                 onClick={() => setActiveTab('campaigns')}
                 className={`relative flex-1 flex items-center justify-center space-x-3 py-3 px-6 rounded-xl font-semibold transition-colors duration-300 ${
                   activeTab === 'campaigns' ? 'text-purple-600' : 'text-gray-600 hover:text-gray-900'
                 }`}
               >
                 <Trophy className="h-5 w-5" />
                 <span>Campaigns</span>
                 <div className="flex items-center space-x-1 bg-purple-100 text-purple-600 px-2 py-1 rounded-full text-xs">
                   <span>{totalCampaigns}</span>
                   {activeCampaigns > 0 && (
                     <>
                       <div className="w-1 h-1 bg-purple-400 rounded-full" />
                       <span>{activeCampaigns} active</span>
                     </>
                   )}
                 </div>
               </button>
             </div>
           </div>
         </div>

         {/* Mobile Tab Switcher */}
         <div className="lg:hidden bg-white/90 backdrop-blur-sm border-b border-gray-200 p-4">
           <div className="relative">
             <div className="flex bg-gray-100 rounded-xl p-1 relative">
               <div
                 className={`absolute top-1 bottom-1 bg-white rounded-lg shadow-sm transition-all duration-300 ease-out ${
                   activeTab === 'projects' ? 'left-1 w-[calc(50%-0.25rem)]' : 'left-1/2 w-[calc(50%-0.25rem)]'
                 }`}
               />
               <button
                 onClick={() => setActiveTab('projects')}
                 className={`relative flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium transition-colors duration-300 ${
                   activeTab === 'projects' ? 'text-blue-600' : 'text-gray-600'
                 }`}
               >
                 <Code className="h-4 w-4" />
                 <span>Projects</span>
                 <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full text-xs">
                   {totalProjects}
                 </span>
               </button>
               <button
                 onClick={() => setActiveTab('campaigns')}
                 className={`relative flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium transition-colors duration-300 ${
                   activeTab === 'campaigns' ? 'text-purple-600' : 'text-gray-600'
                 }`}
               >
                 <Trophy className="h-4 w-4" />
                 <span>Campaigns</span>
                 <span className="bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full text-xs">
                   {totalCampaigns}
                 </span>
               </button>
             </div>
           </div>
         </div>

         {/* Content Area */}
         <div className="p-6">
           {/* Results Info */}
           <div className="mb-6 flex items-center justify-between">
             <div className="flex items-center space-x-4">
               <p className="text-gray-600">
                 {activeTab === 'projects' 
                   ? `${filteredProjects.length} of ${totalProjects} projects`
                   : `${filteredCampaigns.length} of ${totalCampaigns} campaigns`
                 }
               </p>
               {(selectedCategories.length > 0 || selectedTags.length > 0 || selectedStatus.length > 0 || searchQuery) && (
                 <div className="flex items-center space-x-2">
                   <FilterIcon className="h-4 w-4 text-blue-500" />
                   <span className="text-sm text-blue-600 font-medium">Filtered</span>
                 </div>
               )}
             </div>
             
             {/* Quick Actions */}
             <div className="flex items-center space-x-2">
               <button
                 onClick={() => navigate('/create-project')}
                 className="hidden md:flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
               >
                 <Plus className="h-4 w-4" />
                 <span>Create Project</span>
               </button>
               <button
                 onClick={() => navigate('/create-campaign')}
                 className="hidden md:flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
               >
                 <Plus className="h-4 w-4" />
                 <span>Create Campaign</span>
               </button>
             </div>
           </div>

           {/* Content Grid/List */}
           {activeTab === 'projects' ? (
             filteredProjects.length === 0 ? (
               <EmptyState 
                 type="projects"
                 hasFilters={selectedCategories.length > 0 || selectedTags.length > 0 || selectedStatus.length > 0 || searchQuery.length > 0}
                 onClearFilters={clearFilters}
               />
             ) : (
               <div className={viewMode === 'grid' 
                 ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' 
                 : 'space-y-4'
               }>
                 {filteredProjects.map(project => (
                   <ProjectCard 
                     key={project.id.toString()} 
                     project={project} 
                     viewMode={viewMode}
                     onClick={() => navigate(`/explorer/project/${project.id}`)}
                   />
                 ))}
               </div>
             )
           ) : (
             filteredCampaigns.length === 0 ? (
               <EmptyState 
                 type="campaigns"
                 hasFilters={selectedCategories.length > 0 || selectedTags.length > 0 || selectedStatus.length > 0 || searchQuery.length > 0}
                 onClearFilters={clearFilters}
               />
             ) : (
               <div className={viewMode === 'grid' 
                 ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' 
                 : 'space-y-4'
               }>
                 {filteredCampaigns.map(campaign => (
                   <CampaignCard 
                     key={campaign.id.toString()} 
                     campaign={campaign} 
                     viewMode={viewMode}
                     onClick={() => navigate(`/explorer/campaign/${campaign.id}`)}
                   />
                 ))}
               </div>
             )
           )}
         </div>
       </div>
     </div>
   </div>
 );
}

// Empty State Component
function EmptyState({ 
 type, 
 hasFilters, 
 onClearFilters 
}: { 
 type: 'projects' | 'campaigns';
 hasFilters: boolean;
 onClearFilters: () => void;
}) {
 return (
   <div className="text-center py-16">
     <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
       {type === 'projects' ? (
         <Code className="h-12 w-12 text-gray-400" />
       ) : (
         <Trophy className="h-12 w-12 text-gray-400" />
       )}
     </div>
     <h3 className="text-2xl font-bold text-gray-900 mb-2">
       {hasFilters ? `No ${type} found` : `No ${type} yet`}
     </h3>
     <p className="text-gray-600 mb-6 max-w-md mx-auto">
       {hasFilters 
         ? `No ${type} match your current filters. Try adjusting your search criteria.`
         : `Be the first to ${type === 'projects' ? 'create a project' : 'start a campaign'} in this ecosystem.`
       }
     </p>
     {hasFilters ? (
       <button
         onClick={onClearFilters}
         className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
       >
         Clear Filters
       </button>
     ) : (
       <div className="flex items-center justify-center space-x-4">
         <button
           onClick={() => window.location.href = '/create-project'}
           className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
         >
           Create Project
         </button>
         <button
           onClick={() => window.location.href = '/create-campaign'}
           className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
         >
           Start Campaign
         </button>
       </div>
     )}
   </div>
 );
}

// Project Card Component
function ProjectCard({ 
 project, 
 viewMode, 
 onClick 
}: { 
 project: Project; 
 viewMode: 'grid' | 'list'; 
 onClick: () => void;
}) {
 const totalFunds = project.campaignIds ? project.campaignIds.length * 1000 : 0; // Mock calculation
 
 return (
   <div
     onClick={onClick}
     className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer group ${
       viewMode === 'list' ? 'flex' : ''
     }`}
   >
     {/* Project Image */}
     <div className={`relative ${viewMode === 'list' ? 'w-48 flex-shrink-0' : 'aspect-video'}`}>
       {project.metadata?.logo || project.metadata?.coverImage ? (
         <img
           src={formatIpfsUrl(project.metadata.logo || project.metadata.coverImage)}
           alt={project.name}
           className="w-full h-full object-cover"
         />
       ) : (
         <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
           <Code className="h-8 w-8 text-white" />
         </div>
       )}
       
       {/* Status Badge */}
       <div className="absolute top-3 right-3">
         <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
           project.active 
             ? 'bg-green-100 text-green-700' 
             : 'bg-gray-100 text-gray-700'
         }`}>
           <div className={`w-1.5 h-1.5 rounded-full mr-1 ${
             project.active ? 'bg-green-500' : 'bg-gray-500'
           }`} />
           {project.active ? 'Active' : 'Inactive'}
         </span>
       </div>

       {/* Category Badge */}
       {project.metadata?.category && (
         <div className="absolute bottom-3 left-3">
           <span className="inline-flex items-center px-2 py-1 bg-black/70 backdrop-blur-sm text-white text-xs font-medium rounded-full">
             {project.metadata.category}
           </span>
         </div>
       )}
     </div>

     {/* Project Info */}
     <div className={`p-6 ${viewMode === 'list' ? 'flex-1' : ''}`}>
       <div className="flex items-start justify-between mb-3">
         <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
           {project.name}
         </h3>
         {project.campaignIds && project.campaignIds.length > 0 && (
           <div className="text-right ml-4">
             <p className="text-sm text-gray-500">Campaigns</p>
             <p className="font-semibold text-blue-600">{project.campaignIds.length}</p>
           </div>
         )}
       </div>

       <p className="text-gray-600 mb-4 line-clamp-2">
         {project.metadata?.bio || project.description}
       </p>

       {/* Project Meta */}
       <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
         {project.metadata?.location && (
           <div className="flex items-center space-x-1">
             <MapPin className="h-4 w-4" />
             <span>{project.metadata.location}</span>
           </div>
         )}
         <div className="flex items-center space-x-1">
           <Calendar className="h-4 w-4" />
           <span>{new Date(Number(project.createdAt) * 1000).toLocaleDateString()}</span>
         </div>
         {project.contracts && project.contracts.length > 0 && (
           <div className="flex items-center space-x-1">
             <Shield className="h-4 w-4" />
             <span>{project.contracts.length} contract{project.contracts.length !== 1 ? 's' : ''}</span>
           </div>
         )}
       </div>

       {/* Tags */}
       {project.metadata?.tags && Array.isArray(project.metadata.tags) && project.metadata.tags.length > 0 && (
         <div className="flex flex-wrap gap-2 mb-4">
           {project.metadata.tags.slice(0, 3).map((tag, idx) => (
             <span
               key={idx}
               className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full"
             >
               #{tag}
             </span>
           ))}
           {project.metadata.tags.length > 3 && (
             <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
               +{project.metadata.tags.length - 3}
             </span>
           )}
         </div>
       )}

       {/* Action Footer */}
       <div className="flex items-center justify-between pt-4 border-t border-gray-100">
         <div className="flex items-center space-x-2 text-sm text-gray-600">
           <Eye className="h-4 w-4" />
           <span>View Project</span>
         </div>
         <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
       </div>
     </div>
   </div>
 );
}

// Campaign Card Component
function CampaignCard({ 
 campaign, 
 viewMode, 
 onClick 
}: { 
 campaign: Campaign; 
 viewMode: 'grid' | 'list'; 
 onClick: () => void;
}) {
 const getStatusColor = (status: string) => {
   switch (status) {
     case 'active': return { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' };
     case 'upcoming': return { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' };
     case 'ended': return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' };
     case 'paused': return { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' };
     default: return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' };
   }
 };

 const statusColors = getStatusColor(campaign.status || 'paused');
 const daysLeft = campaign.status === 'active' 
   ? Math.ceil((Number(campaign.endTime) - Date.now() / 1000) / (24 * 60 * 60))
   : 0;

 return (
   <div
     onClick={onClick}
     className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer group ${
       viewMode === 'list' ? 'flex' : ''
     }`}
   >
     {/* Campaign Image */}
     <div className={`relative ${viewMode === 'list' ? 'w-48 flex-shrink-0' : 'aspect-video'}`}>
       {campaign.metadata?.logo || campaign.metadata?.bannerImage ? (
         <img
           src={formatIpfsUrl(campaign.metadata.logo || campaign.metadata.bannerImage)}
           alt={campaign.name}
           className="w-full h-full object-cover"
         />
       ) : (
         <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
           <Trophy className="h-8 w-8 text-white" />
         </div>
       )}
       
       {/* Status Badge */}
       <div className="absolute top-3 right-3">
         <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}>
           <div className={`w-1.5 h-1.5 rounded-full mr-1 ${statusColors.dot}`} />
           {campaign.status?.charAt(0).toUpperCase() + campaign.status?.slice(1)}
         </span>
       </div>

       {/* Type Badge */}
       {campaign.metadata?.type && (
         <div className="absolute bottom-3 left-3">
           <span className="inline-flex items-center px-2 py-1 bg-black/70 backdrop-blur-sm text-white text-xs font-medium rounded-full">
             {campaign.metadata.type.replace('_', ' ')}
           </span>
         </div>
       )}

       {/* Prize Pool */}
       {campaign.totalFunds > 0n && (
         <div className="absolute top-3 left-3">
           <div className="bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1">
             <p className="text-xs text-gray-600">Prize Pool</p>
             <p className="font-bold text-green-600 text-sm">
               {parseFloat(formatEther(campaign.totalFunds)).toFixed(1)} CELO
             </p>
           </div>
         </div>
       )}
     </div>

     {/* Campaign Info */}
     <div className={`p-6 ${viewMode === 'list' ? 'flex-1' : ''}`}>
       <div className="flex items-start justify-between mb-3">
         <h3 className="text-xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
           {campaign.name}
         </h3>
         {campaign.status === 'active' && daysLeft > 0 && (
           <div className="text-right ml-4">
             <p className="text-sm text-gray-500">Time Left</p>
             <p className="font-semibold text-orange-600">{daysLeft}d</p>
           </div>
         )}
       </div>

       <p className="text-gray-600 mb-4 line-clamp-2">
         {campaign.metadata?.bio || campaign.description}
       </p>

       {/* Campaign Stats */}
       <div className="grid grid-cols-2 gap-4 mb-4">
         <div className="text-center p-3 bg-gray-50 rounded-lg">
           <div className="flex items-center justify-center space-x-1 mb-1">
             <DollarSign className="h-4 w-4 text-green-600" />
             <span className="text-sm font-medium text-gray-600">Raised</span>
           </div>
           <p className="font-bold text-green-600">
             {parseFloat(formatEther(campaign.totalFunds)).toFixed(1)} CELO
           </p>
         </div>
         <div className="text-center p-3 bg-gray-50 rounded-lg">
           <div className="flex items-center justify-center space-x-1 mb-1">
             <Award className="h-4 w-4 text-purple-600" />
             <span className="text-sm font-medium text-gray-600">Winners</span>
           </div>
           <p className="font-bold text-purple-600">
             {campaign.maxWinners > 0n ? Number(campaign.maxWinners) : 'All'}
           </p>
         </div>
       </div>

       {/* Campaign Meta */}
       <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
         <div className="flex items-center space-x-1">
           <Calendar className="h-4 w-4" />
           <span>
             {new Date(Number(campaign.startTime) * 1000).toLocaleDateString()} - 
             {new Date(Number(campaign.endTime) * 1000).toLocaleDateString()}
           </span>
         </div>
         <div className="flex items-center space-x-1">
           <Users className="h-4 w-4" />
           <span>
             {campaign.useQuadraticDistribution ? 'Quadratic' : 
              campaign.useCustomDistribution ? 'Custom' : 'Linear'} distribution
           </span>
         </div>
       </div>

       {/* Tags */}
       {campaign.metadata?.tags && Array.isArray(campaign.metadata.tags) && campaign.metadata.tags.length > 0 && (
         <div className="flex flex-wrap gap-2 mb-4">
           {campaign.metadata.tags.slice(0, 3).map((tag, idx) => (
             <span
               key={idx}
               className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full"
             >
               #{tag}
             </span>
           ))}
           {campaign.metadata.tags.length > 3 && (
             <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
               +{campaign.metadata.tags.length - 3}
             </span>
           )}
         </div>
       )}

       {/* Action Footer */}
       <div className="flex items-center justify-between pt-4 border-t border-gray-100">
         <div className="flex items-center space-x-2 text-sm text-gray-600">
           {campaign.status === 'active' && <PlayCircle className="h-4 w-4 text-green-500" />}
           {campaign.status === 'upcoming' && <Clock className="h-4 w-4 text-blue-500" />}
           {campaign.status === 'ended' && <CheckCircle className="h-4 w-4 text-gray-500" />}
           <span>
             {campaign.status === 'active' && 'Join Campaign'}
             {campaign.status === 'upcoming' && 'Coming Soon'}
             {campaign.status === 'ended' && 'View Results'}
             {campaign.status === 'paused' && 'Campaign Paused'}
           </span>
         </div>
         <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
       </div>
     </div>
   </div>
 );
}