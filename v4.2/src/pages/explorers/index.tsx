// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search,
  Grid,
  List,
  X,

  MapPin,

  Trophy,
  Code,
  Tag,

  CheckCircle,

  Menu,

  Activity,

  Plus,

  Filter as FilterIcon,
  SortAsc,
  Hash,
  Compass,
  Shield,
  Anchor,
  BarChart,
  ArrowUpRight,
  AlertTriangle,
  Timer
} from 'lucide-react';
import { useAllProjects } from '@/hooks/useProjectMethods';
import { useAllCampaigns } from '@/hooks/useCampaignMethods';
import { Address } from 'viem';
import { formatEther } from 'viem';
import { formatIpfsUrl } from '@/utils/imageUtils';
import { useGeneralPageMetadata } from '@/hooks/usePageMetadata';

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

export default function UnifiedExplorer() {
  const navigate = useNavigate();
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

  // Metadata management
  useGeneralPageMetadata({
    title: 'Explore Projects & Campaigns | Sovereign Seas',
    description: 'Discover and explore innovative blockchain projects and funding campaigns. Filter by category, tags, and status to find what interests you.',
    keywords: 'explore, projects, campaigns, blockchain, funding, discovery, filter, search, Sovereign Seas',
    image: '/og-image.png'
  });

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
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-blue-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md mx-auto border border-red-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">Unable to Load</h2>
            <p className="text-gray-600 mb-6">{error.message || 'Something went wrong'}</p>
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
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Anchor className="h-10 w-10 text-blue-600 animate-pulse" />
            </div>
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
    <div className="relative">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white/90 backdrop-blur-md border-b border-blue-200/50 p-4 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Menu className="h-6 w-6 text-gray-700" />
            </button>
            <div className="flex items-center space-x-2">
              <Anchor className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-800">
                Explorer
              </h1>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 rounded-lg hover:bg-blue-50 transition-colors"
            >
              {viewMode === 'grid' ? <List className="h-5 w-5 text-gray-700" /> : <Grid className="h-5 w-5 text-gray-700" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout Container */}
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:sticky top-0 left-0 z-40 w-80 h-screen bg-white/95 backdrop-blur-xl border-r border-blue-200/50 transition-transform duration-300 ease-in-out lg:block shadow-xl lg:shadow-none overflow-y-auto`}>
          {/* Sidebar Header */}
          <div className="p-6 border-b border-blue-200/50">
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
                className="lg:hidden p-2 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {/* Stats Cards - following original design */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100/50 transform hover:scale-105 transition-transform duration-300">
                <div className="flex items-center space-x-2">
                  <Code className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Projects</span>
                </div>
                <p className="text-lg font-bold text-blue-600 mt-1">{totalProjects}</p>
                <p className="text-xs text-blue-500">{activeProjects} active</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100/50 transform hover:scale-105 transition-transform duration-300">
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
          <div className="p-6 border-b border-blue-200/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects & campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/90 backdrop-blur-sm border border-white/30 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm text-gray-900 placeholder-gray-500 shadow-sm"
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
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      selectedCategories.includes(category)
                        ? 'bg-blue-100/80 text-blue-700 border border-blue-200/50 shadow-sm transform hover:scale-105'
                        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
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
                    className={`px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
                      selectedTags.includes(tag)
                        ? 'bg-blue-100/80 text-blue-700 border border-blue-200/50 shadow-sm transform hover:scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-600'
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
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      selectedStatus.includes(status)
                        ? 'bg-blue-100/80 text-blue-700 border border-blue-200/50 shadow-sm transform hover:scale-105'
                        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
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
                className="w-full px-3 py-2 rounded-lg bg-white/90 backdrop-blur-sm border border-white/30 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm text-gray-900 shadow-sm"
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
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-h-screen">
          {/* Desktop Header */}
          <header className="hidden lg:block bg-white/90 backdrop-blur-md border-b border-blue-200/50 p-6 sticky top-0 z-30 shadow-sm">
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
                <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm rounded-xl border border-blue-200/50 p-1 shadow-sm">
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

         {/* Cool Tab Switcher - following original design */}
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
       </header>

       {/* Content */}
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
               className="hidden md:flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300 font-medium group relative overflow-hidden"
             >
               <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
               <span>Create Project</span>
               <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
             </button>
             <button
               onClick={() => navigate('/create-campaign')}
               className="hidden md:flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300 font-medium group relative overflow-hidden"
             >
               <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
               <span>Create Campaign</span>
               <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
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
               {filteredCampaigns.map((campaign, index) => (
                 <CampaignCard 
                   key={campaign.id.toString()} 
                   campaign={campaign} 
                   viewMode={viewMode}
                   onClick={() => navigate(`/explorer/campaign/${campaign.id}`)}
                   index={index}
                 />
               ))}
             </div>
           )
         )}
       </div>
     </main>
   </div>
 </div>
);
}

// Empty State Component - following original design
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
   <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 sm:p-8 text-center border border-blue-100 shadow-lg relative overflow-hidden">
     <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 via-transparent to-indigo-100/50"></div>
     <div className="relative z-10">
       <div className="inline-flex items-center justify-center h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 mb-4 text-white">
         {type === 'projects' ? (
           <Code className="h-6 w-6 sm:h-8 sm:w-8" />
         ) : (
           <Trophy className="h-6 w-6 sm:h-8 sm:w-8" />
         )}
       </div>
       <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">
         {hasFilters ? `No ${type} found` : `No ${type} yet`}
       </h3>
       <p className="text-gray-600 mb-6 max-w-md mx-auto text-sm sm:text-base">
         {hasFilters 
           ? `No ${type} match your current filters. Try adjusting your search criteria.`
           : `Be the first to ${type === 'projects' ? 'create a project' : 'start a campaign'} in this ecosystem.`
         }
       </p>
       {hasFilters ? (
         <button
           onClick={onClearFilters}
           className="px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl transition-all inline-flex items-center group relative overflow-hidden"
         >
           Clear Filters
           <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
         </button>
       ) : (
         <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
           <button
             onClick={() => window.location.href = '/create-project'}
             className="px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl transition-all inline-flex items-center group relative overflow-hidden"
           >
             <Code className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
             Create Project
             <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
           </button>
           <button
             onClick={() => window.location.href = '/create-campaign'}
             className="px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium hover:shadow-xl transition-all inline-flex items-center group relative overflow-hidden"
           >
             <Trophy className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
             Start Campaign
             <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
           </button>
         </div>
       )}
     </div>
   </div>
 );
}

// Project Card Component - following original design
function ProjectCard({ 
 project, 
 viewMode, 
 onClick 
}: { 
 project: Project; 
 viewMode: 'grid' | 'list'; 
 onClick: () => void;
}) {
 return (
   <div
     onClick={onClick}
     className={`group bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-blue-100 overflow-hidden cursor-pointer relative hover:shadow-xl hover:-translate-y-3 transition-all duration-500 ${
       viewMode === 'list' ? 'flex' : ''
     }`}
   >
     <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
     
     {/* Project Image */}
     <div className={`relative ${viewMode === 'list' ? 'w-48 flex-shrink-0' : 'h-40 sm:h-48'} bg-gradient-to-r from-blue-100 to-indigo-100 overflow-hidden`}>
       {project.metadata?.logo || project.metadata?.coverImage ? (
         <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${formatIpfsUrl(project.metadata?.logo || project.metadata?.coverImage || '')})`, opacity: 0.9 }}></div>
       ) : (
         <div className="absolute inset-0 flex items-center justify-center opacity-30">
           <Code className="h-16 w-16 text-blue-500" />
         </div>
       )}
       
       <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
       
       {/* Status Badge */}
       <div className="absolute top-3 right-3">
         <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm ${
           project.active 
             ? 'bg-emerald-500/90 text-white' 
             : 'bg-gray-500/90 text-white'
         }`}>
           <div className={`w-2 h-2 rounded-full mr-2 ${
             project.active ? 'bg-white animate-pulse' : 'bg-gray-300'
           }`} />
           {project.active ? 'Active' : 'Inactive'}
         </span>
       </div>

       {/* Category Badge */}
       {project.metadata?.category && (
         <div className="absolute bottom-4 left-4">
           <span className="inline-flex items-center px-3 py-1.5 bg-black/70 backdrop-blur-sm text-white text-xs font-semibold rounded-full">
             {project.metadata.category}
           </span>
         </div>
       )}

       {/* Campaigns Count */}
       {project.campaignIds && project.campaignIds.length > 0 && (
         <div className="absolute top-3 left-3">
           <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2">
             <div className="flex items-center gap-1">
               <Trophy className="h-4 w-4 text-purple-600" />
               <span className="text-sm font-bold text-gray-900">{project.campaignIds.length}</span>
             </div>
             <p className="text-xs text-gray-600">Campaigns</p>
           </div>
         </div>
       )}

       {/* Project name overlay */}
       <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
         <h3 className="text-base sm:text-lg font-bold text-white mb-1 group-hover:text-blue-200 transition-colors line-clamp-1">{project.name}</h3>
         <div className="flex items-center text-white/80 text-sm">
           <BarChart className="h-3.5 w-3.5 mr-1.5" />
           {new Date(Number(project.createdAt) * 1000).toLocaleDateString()}
         </div>
       </div>
     </div>

     {/* Project Info */}
     <div className={`p-4 relative z-10 ${viewMode === 'list' ? 'flex-1' : ''}`}>
       <p className="text-gray-600 text-xs sm:text-sm mb-4 line-clamp-2">{project.metadata?.bio["tagline"] || project.description?.tagline}</p>

       {/* Project Meta */}
       <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
         {project.metadata?.location && (
           <div className="flex items-center gap-1">
             <MapPin className="h-3 w-3" />
             <span>{project.metadata.location}</span>
           </div>
         )}
         {project.contracts && project.contracts.length > 0 && (
           <div className="flex items-center gap-1">
             <Shield className="h-3 w-3" />
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
               className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg"
             >
               #{tag}
             </span>
           ))}
           {project.metadata.tags.length > 3 && (
             <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg">
               +{project.metadata.tags.length - 3}
             </span>
           )}
         </div>
       )}

       <div className="absolute bottom-4 right-4 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md transform group-hover:rotate-45 transition-transform duration-500">
         <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4" />
       </div>
       
       {/* Voting tokens for this project */}
       <div className="flex -space-x-1.5">
         <div className="w-6 h-6 rounded-full bg-white ring-2 ring-white flex items-center justify-center overflow-hidden">
           <img src="/images/celo.png" alt="CELO" className="w-full h-full object-cover" />
         </div>
         <div className="w-6 h-6 rounded-full bg-white ring-2 ring-white flex items-center justify-center overflow-hidden">
           <img src="/images/cusd.png" alt="cUSD" className="w-full h-full object-cover" />
         </div>
       </div>
     </div>
   </div>
 );
}

// Campaign Card Component - following original design
function CampaignCard({ 
 campaign, 
 viewMode, 
 onClick,
 index 
}: { 
 campaign: Campaign; 
 viewMode: 'grid' | 'list'; 
 onClick: () => void;
 index: number;
}) {
 // Calculate time status properly
 const now = Math.floor(Date.now() / 1000);
 const hasStarted = now >= Number(campaign.startTime);
 const hasEnded = now >= Number(campaign.endTime);
 
 // Format CELO amount as whole number
 const celoAmount = Number(formatEther(campaign.totalFunds)).toFixed(0);
 
 // Determine status class and text
 let statusClass = 'bg-gray-200 text-gray-700';
 let statusText = 'Ended';
 let StatusIcon = CheckCircle;
 
 if (!hasStarted) {
   statusClass = 'bg-cyan-400 text-blue-900';
   statusText = 'Coming Soon';
   StatusIcon = Timer;
 } else if (!hasEnded) {
   statusClass = 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white';
   statusText = 'Active';
   StatusIcon = Activity;
 }

 return (
   <div
     onClick={onClick}
     className={`group relative bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-blue-100 hover:shadow-xl hover:-translate-y-3 transition-all duration-500 cursor-pointer ${
       viewMode === 'list' ? 'flex' : ''
     }`}
   >
     {/* Enhanced shadow and glow effects */}
     <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
     
     <div className={`relative ${viewMode === 'list' ? 'w-48 flex-shrink-0' : 'h-40 sm:h-48'} bg-gradient-to-r from-blue-100 to-indigo-100 overflow-hidden`}>
       {campaign.metadata?.logo ? (
         <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${formatIpfsUrl(campaign.metadata.logo)})`, opacity: 0.9 }}></div>
       ) : (
         <div className="absolute inset-0 flex items-center justify-center opacity-30">
           <Anchor className="h-16 w-16 text-blue-500" />
         </div>
       )}
       
       {/* Overlay gradient */}
       <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
       
       {/* Status badge with improved styling */}
       <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-medium flex items-center shadow-md z-10 ${statusClass}`}>
         <StatusIcon className="h-3 w-3 mr-1.5" />
         {statusText}
       </div>
       
       {/* Campaign name overlay */}
       <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
         <h3 className="text-base sm:text-lg font-bold text-white mb-1 group-hover:text-blue-200 transition-colors line-clamp-1">{campaign.name as string}</h3>
         <div className="flex items-center text-white/80 text-sm">
           <BarChart className="h-3.5 w-3.5 mr-1.5" />
           {String(celoAmount)} CELO
         </div>
       </div>
       
       {/* Time remaining indicator with better formatting */}
       {!hasStarted && (
         <div className="absolute bottom-16 left-4 px-3 py-1.5 bg-blue-500/70 text-white text-xs rounded-full backdrop-blur-sm shadow-md flex items-center">
           <Timer className="h-3 w-3 mr-1.5 animate-pulse" /> 
           Coming Soon
         </div>
       )}

       {hasStarted && !hasEnded && campaign.endTime && (
         <div className="absolute bottom-16 left-4 px-3 py-1.5 bg-indigo-500/70 text-white text-xs rounded-full backdrop-blur-sm shadow-md flex items-center">
           <Timer className="h-3 w-3 mr-1.5 animate-pulse" /> 
           {(() => {
             const endDiff = Number(campaign.endTime) - now;
             if (endDiff <= 0) return "Ending soon";
             
             const days = Math.floor(endDiff / 86400);
             const hours = Math.floor((endDiff % 86400) / 3600);
             
             return `${days}d ${hours}h left`;
           })()}
         </div>
       )}
       
       {hasEnded && (
         <div className="absolute bottom-16 left-4 px-3 py-1.5 bg-gray-500/70 text-white text-xs rounded-full backdrop-blur-sm shadow-md flex items-center">
           <CheckCircle className="h-3 w-3 mr-1.5" /> Ended
         </div>
       )}
     </div>
     
     <div className={`p-4 relative ${viewMode === 'list' ? 'flex-1' : ''}`}>
       <p className="text-gray-600 text-xs sm:text-sm mb-4 line-clamp-2">{campaign.metadata?.bio || campaign.description}</p>
       
       <div className="absolute bottom-4 right-4 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md transform group-hover:rotate-45 transition-transform duration-500">
         <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4" />
       </div>
       
       {/* Voting tokens for this campaign */}
       <div className="flex -space-x-1.5">
         <div className="w-6 h-6 rounded-full bg-white ring-2 ring-white flex items-center justify-center overflow-hidden">
           <img src="/images/celo.png" alt="CELO" className="w-full h-full object-cover" />
         </div>
         {(index === 0 || index === 2) && (
           <div className="w-6 h-6 rounded-full bg-white ring-2 ring-white flex items-center justify-center overflow-hidden">
             <img src="/images/cusd.png" alt="cUSD" className="w-full h-full object-cover" />
           </div>
         )}
         {index === 1 && (
           <div className="w-6 h-6 rounded-full bg-purple-100 ring-2 ring-white flex items-center justify-center text-purple-500 text-xs font-bold">G</div>
         )}
       </div>
     </div>
   </div>
 );
}