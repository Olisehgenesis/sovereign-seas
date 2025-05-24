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
  PlayCircle
} from 'lucide-react';
import { useAllProjects } from '@/hooks/useProjectMethods';
import { useAllCampaigns } from '@/hooks/useCampaignMethods';
import { Address } from 'viem';
import { formatEther } from 'viem';

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

// Add debug logging utility
const logDebug = (section: string, data: any, type: 'info' | 'error' | 'warn' = 'info') => {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    section,
    data
  };

  switch (type) {
    case 'error':
      console.error('🔴', logData);
      break;
    case 'warn':
      console.warn('🟡', logData);
      break;
    default:
      console.log('🟢', logData);
  }
};

export default function UnifiedExplorer() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'projects' | 'campaigns'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'popular'>('newest');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [filteredItems, setFilteredItems] = useState<ExplorerItem[]>([]);

  // Use hooks for both projects and campaigns
  const { projects, isLoading: projectsLoading, error: projectsError } = useAllProjects(CONTRACT_ADDRESS);
  const { campaigns, isLoading: campaignsLoading, error: campaignsError } = useAllCampaigns(CONTRACT_ADDRESS);

  // Add debug logging for raw data
  useEffect(() => {
    logDebug('Raw Projects Data', {
      projects,
      isLoading: projectsLoading,
      error: projectsError,
      contractAddress: CONTRACT_ADDRESS,
      timestamp: new Date().toISOString()
    });

    if (projectsError) {
      logDebug('Projects Error', {
        error: projectsError,
        message: projectsError.message,
        stack: projectsError.stack
      }, 'error');
    }
  }, [projects, projectsLoading, projectsError]);

  useEffect(() => {
    logDebug('Raw Campaigns Data', {
      campaigns,
      isLoading: campaignsLoading,
      error: campaignsError,
      contractAddress: CONTRACT_ADDRESS,
      timestamp: new Date().toISOString()
    });

    if (campaignsError) {
      logDebug('Campaigns Error', {
        error: campaignsError,
        message: campaignsError.message,
        stack: campaignsError.stack
      }, 'error');
    }
  }, [campaigns, campaignsLoading, campaignsError]);

  // Combined categories for both projects and campaigns
  const categories = [
    'DeFi', 'NFT', 'Gaming', 'Infrastructure', 'DAO', 'Social', 'Identity', 
    'Privacy', 'Analytics', 'Developer Tools', 'Wallet', 'Exchange', 'Lending',
    'Insurance', 'Real Estate', 'Supply Chain', 'Healthcare', 'Education', 
    'Climate', 'Social Impact', 'Research', 'Other'
  ];

  const tags = [
    'Ethereum', 'Polygon', 'Solana', 'Celo', 'Avalanche', 'Arbitrum', 'Optimism',
    'Layer 2', 'Zero Knowledge', 'AI', 'Machine Learning', 'Web3', 'DeFi', 'NFT',
    'Gaming', 'Social', 'DAO', 'Metaverse', 'Innovation', 'Grants', 'Hackathon',
    'Accelerator', 'Bounty', 'Community', 'Open Source'
  ];

  const statusOptions = [
    'Active', 'Inactive', 'Upcoming', 'Ended', 'Paused'
  ];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Enhanced metadata parsing with logging
  const parseProjectMetadata = (projectDetails: any): ProjectMetadata => {
    logDebug('Parsing Project Metadata', {
      input: projectDetails,
      hasMetadata: !!projectDetails.metadata
    });

    let parsedMetadata: ProjectMetadata = {};
    
    try {
      if (projectDetails.metadata?.bio) {
        parsedMetadata.bio = projectDetails.metadata.bio;
      }

      if (projectDetails.metadata?.contractInfo) {
        try {
          const contractInfo = JSON.parse(projectDetails.metadata.contractInfo);
          parsedMetadata = { ...parsedMetadata, ...contractInfo };
          logDebug('Parsed Contract Info', { contractInfo });
        } catch (e) {
          logDebug('Contract Info Parse Error', { error: e }, 'warn');
          parsedMetadata.contractInfo = projectDetails.metadata.contractInfo;
        }
      }

      if (projectDetails.metadata?.additionalData) {
        try {
          const additionalData = JSON.parse(projectDetails.metadata.additionalData);
          parsedMetadata = { ...parsedMetadata, ...additionalData };
          logDebug('Parsed Additional Data', { additionalData });
        } catch (e) {
          logDebug('Additional Data Parse Error', { error: e }, 'warn');
          parsedMetadata.additionalData = projectDetails.metadata.additionalData;
        }
      }
    } catch (e) {
      logDebug('Project Metadata Parse Error', { error: e }, 'error');
    }

    logDebug('Final Parsed Project Metadata', { parsedMetadata });
    return parsedMetadata;
  };

  const parseCampaignMetadata = (campaignDetails: any): CampaignMetadata => {
    logDebug('Parsing Campaign Metadata', {
      input: campaignDetails,
      hasMetadata: !!campaignDetails.metadata
    });

    let parsedMetadata: CampaignMetadata = {};
    
    try {
      if (campaignDetails.metadata?.mainInfo) {
        try {
          const mainInfo = JSON.parse(campaignDetails.metadata.mainInfo);
          parsedMetadata = { ...parsedMetadata, ...mainInfo };
          logDebug('Parsed Main Info', { mainInfo });
        } catch (e) {
          logDebug('Main Info Parse Error', { error: e }, 'warn');
          parsedMetadata.mainInfo = campaignDetails.metadata.mainInfo;
        }
      }

      if (campaignDetails.metadata?.additionalInfo) {
        try {
          const additionalInfo = JSON.parse(campaignDetails.metadata.additionalInfo);
          parsedMetadata = { ...parsedMetadata, ...additionalInfo };
          logDebug('Parsed Additional Info', { additionalInfo });
        } catch (e) {
          logDebug('Additional Info Parse Error', { error: e }, 'warn');
          parsedMetadata.additionalInfo = campaignDetails.metadata.additionalInfo;
        }
      }
    } catch (e) {
      logDebug('Campaign Metadata Parse Error', { error: e }, 'error');
    }

    logDebug('Final Parsed Campaign Metadata', { parsedMetadata });
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

  useEffect(() => {
    if (!projects && !campaigns) {
      logDebug('No Data Available', {
        hasProjects: !!projects,
        hasCampaigns: !!campaigns,
        timestamp: new Date().toISOString()
      }, 'warn');
      return;
    }

    let allItems: ExplorerItem[] = [];

    // Transform projects
    if (projects) {
      logDebug('Starting Project Transformations', {
        projectCount: projects.length,
        timestamp: new Date().toISOString()
      });

      const transformedProjects = projects.map(projectDetails => {
        const parsedMetadata = parseProjectMetadata(projectDetails);
        
        const transformed = {
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

        logDebug('Project Transformation', {
          original: {
            id: projectDetails.project.id.toString(),
            name: projectDetails.project.name
          },
          transformed: {
            id: transformed.id.toString(),
            name: transformed.name,
            active: transformed.active
          }
        });

        return transformed;
      });

      allItems = [...allItems, ...transformedProjects];
      logDebug('Project Transformations Complete', {
        transformedCount: transformedProjects.length,
        totalItems: allItems.length
      });
    }

    // Transform campaigns
    if (campaigns) {
      logDebug('Starting Campaign Transformations', {
        campaignCount: campaigns.length,
        timestamp: new Date().toISOString()
      });

      const transformedCampaigns = campaigns.map(campaignDetails => {
        const parsedMetadata = parseCampaignMetadata(campaignDetails);
        const status = getCampaignStatus(campaignDetails.campaign);
        
        const transformed = {
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

        logDebug('Campaign Transformation', {
          original: {
            id: campaignDetails.campaign.id.toString(),
            name: campaignDetails.campaign.name
          },
          transformed: {
            id: transformed.id.toString(),
            name: transformed.name,
            status: transformed.status
          }
        });

        return transformed;
      });

      allItems = [...allItems, ...transformedCampaigns];
      logDebug('Campaign Transformations Complete', {
        transformedCount: transformedCampaigns.length,
        totalItems: allItems.length
      });
    }

    // Apply filters
    let filtered = [...allItems];
    logDebug('Starting Filtering', {
      initialCount: filtered.length,
      activeTab,
      searchQuery,
      selectedCategories,
      selectedTags,
      selectedStatus
    });

    // Apply tab filter
    if (activeTab !== 'all') {
      filtered = filtered.filter(item => 
        activeTab === 'projects' ? item.itemType === 'project' : item.itemType === 'campaign'
      );
      logDebug('Items count after tab filter', {
        count: filtered.length,
        activeTab
      });
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        (item.metadata?.bio && item.metadata.bio.toLowerCase().includes(query))
      );
      logDebug('Items count after search filter', {
        count: filtered.length,
        searchQuery
      });
    }

    // Apply category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(item => {
        const category = item.metadata?.category;
        return category && selectedCategories.includes(category);
      });
      logDebug('Items count after category filter', {
        count: filtered.length,
        selectedCategories
      });
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(item => {
        const tags = item.metadata?.tags;
        return tags && Array.isArray(tags) && tags.some(tag => selectedTags.includes(tag));
      });
      logDebug('Items count after tag filter', {
        count: filtered.length,
        selectedTags
      });
    }

    // Apply status filter
    if (selectedStatus.length > 0) {
      filtered = filtered.filter(item => {
        if (item.itemType === 'project') {
          const status = item.active ? 'Active' : 'Inactive';
          return selectedStatus.includes(status);
        } else {
          const status = (item as Campaign).status;
          return selectedStatus.includes(status?.charAt(0).toUpperCase() + status?.slice(1) || '');
        }
      });
      logDebug('Items count after status filter', {
        count: filtered.length,
        selectedStatus
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          const aTime = a.itemType === 'project' ? a.createdAt : (a as Campaign).startTime;
          const bTime = b.itemType === 'project' ? b.createdAt : (b as Campaign).startTime;
          return Number(bTime) - Number(aTime);
        case 'oldest':
          const aTimeOld = a.itemType === 'project' ? a.createdAt : (a as Campaign).startTime;
          const bTimeOld = b.itemType === 'project' ? b.createdAt : (b as Campaign).startTime;
          return Number(aTimeOld) - Number(bTimeOld);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'popular':
          if (a.itemType === 'campaign' && b.itemType === 'campaign') {
            return Number((b as Campaign).totalFunds) - Number((a as Campaign).totalFunds);
          }
          return a.campaignIds?.length - b.campaignIds?.length || 0;
        default:
          return 0;
      }
    });

    logDebug('Filtering Complete', {
      finalCount: filtered.length,
      items: filtered.map(item => ({
        type: item.itemType,
        id: item.id.toString(),
        name: item.name,
        active: item.active
      }))
    });

    setFilteredItems(filtered);
  }, [projects, campaigns, activeTab, searchQuery, selectedCategories, selectedTags, selectedStatus, sortBy]);

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
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Data</h2>
          <p className="text-gray-600">{error.message || 'An unknown error occurred'}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="flex items-center space-x-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-xl text-gray-700">Loading explorer...</span>
        </div>
      </div>
    );
  }

  const totalProjects = projects?.length || 0;
  const totalCampaigns = campaigns?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">
              Explore Ecosystem
            </h1>
            <p className="text-gray-600">Discover innovative projects and funding opportunities</p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-1 flex">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'all' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                All ({totalProjects + totalCampaigns})
              </button>
              <button
                onClick={() => setActiveTab('projects')}
                className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center ${
                  activeTab === 'projects' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <Code className="h-4 w-4 mr-2" />
                Projects ({totalProjects})
              </button>
              <button
                onClick={() => setActiveTab('campaigns')}
                className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center ${
                  activeTab === 'campaigns' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <Trophy className="h-4 w-4 mr-2" />
                Campaigns ({totalCampaigns})
              </button>
            </div>
          </div>

          {/* Search and Controls */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects and campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <Filter className="h-5 w-5 text-gray-600" />
                <span>Filters</span>
                <ChevronDown className={`h-4 w-4 text-gray-600 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              
              <div className="flex items-center space-x-2 bg-white rounded-xl border border-gray-200 p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Grid className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white/80 backdrop-blur-sm border-b border-blue-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Categories */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => toggleCategory(category)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedCategories.includes(category)
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
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
                <h3 className="text-sm font-medium text-gray-700 mb-3">Status</h3>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map(status => (
                    <button
                      key={status}
                      onClick={() => toggleStatus(status)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedStatus.includes(status)
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Sort By</h3>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>
            </div>

            {/* Active Filters */}
            {(selectedCategories.length > 0 || selectedTags.length > 0 || selectedStatus.length > 0) && (
              <div className="mt-4 flex items-center space-x-2">
                <span className="text-sm text-gray-600">Active filters:</span>
                <div className="flex flex-wrap gap-2">
                  {selectedCategories.map(category => (
                    <span
                      key={category}
                      className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-700"
                    >
                      {category}
                      <button
                        onClick={() => toggleCategory(category)}
                        className="ml-1 hover:text-blue-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {selectedTags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-700"
                    >
                      {tag}
                      <button
                        onClick={() => toggleTag(tag)}
                        className="ml-1 hover:text-blue-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {selectedStatus.map(status => (
                    <span
                      key={status}
                      className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-700"
                    >
                      {status}
                      <button
                        onClick={() => toggleStatus(status)}
                        className="ml-1 hover:text-blue-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results count */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {filteredItems.length} of {totalProjects + totalCampaigns} items
            {activeTab !== 'all' && ` in ${activeTab}`}
          </p>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No items found</h3>
            <p className="text-gray-600 mb-4">
              {totalProjects + totalCampaigns === 0 
                ? "No projects or campaigns have been created yet." 
                : "No items match your search criteria."}
            </p>
            {(searchQuery || selectedCategories.length > 0 || selectedTags.length > 0 || selectedStatus.length > 0) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}>
            {filteredItems.map(item => (
              <ItemCard 
                key={`${item.itemType}-${item.id.toString()}`} 
                item={item} 
                viewMode={viewMode}
                onClick={() => {
                  if (item.itemType === 'project') {
                    navigate(`/explorer/project/${item.id}`);
                  } else {
                    navigate(`/explorer/campaign/${item.id}`);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Unified Item Card Component
function ItemCard({ 
  item, 
  viewMode, 
  onClick 
}: { 
  item: ExplorerItem; 
  viewMode: 'grid' | 'list'; 
  onClick: () => void;
}) {
  const isProject = item.itemType === 'project';
  const campaign = item as Campaign;
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'text-green-700 bg-green-100';
      case 'upcoming': return 'text-blue-700 bg-blue-100';
      case 'ended': return 'text-gray-700 bg-gray-100';
      case 'paused': return 'text-orange-700 bg-orange-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getIcon = () => {
    if (isProject) return <Code className="h-5 w-5" />;
    
    const campaignType = campaign.metadata?.type;
    switch (campaignType) {
      case 'hackathon': return <Code className="h-5 w-5" />;
      case 'grants_round': return <DollarSign className="h-5 w-5" />;
      case 'accelerator': return <TrendingUp className="h-5 w-5" />;
      case 'bounty': return <Target className="h-5 w-5" />;
      default: return <Trophy className="h-5 w-5" />;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-blue-100 overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer ${
        viewMode === 'list' ? 'flex' : ''
      }`}
    >
      {/* Item Image */}
      <div className={`relative ${viewMode === 'list' ? 'w-48' : 'aspect-video'}`}>
       {item.metadata?.logo || item.metadata?.bannerImage || item.metadata?.coverImage ? (
         <img
           src={item.metadata.logo || item.metadata.bannerImage || item.metadata.coverImage}
           alt={item.name}
           className="w-full h-full object-cover"
         />
       ) : (
         <div className={`w-full h-full bg-gradient-to-br ${
           isProject 
             ? 'from-blue-500 to-indigo-600' 
             : 'from-purple-500 to-pink-600'
         } flex items-center justify-center`}>
           {getIcon()}
           <span className="text-white ml-2">
             {isProject ? 'PROJECT' : 'CAMPAIGN'}
           </span>
         </div>
       )}
       
       {/* Type Badge */}
       <div className="absolute top-4 left-4">
         <span className={`inline-flex items-center px-3 py-1 bg-white/90 backdrop-blur-sm text-sm font-medium rounded-full ${
           isProject ? 'text-blue-700' : 'text-purple-700'
         }`}>
           {getIcon()}
           <span className="ml-1">
             {isProject ? 'Project' : (campaign.metadata?.type?.replace('_', ' ') || 'Campaign')}
           </span>
         </span>
       </div>

       {/* Status Badge */}
       <div className="absolute top-4 right-4">
         <span className={`inline-flex items-center px-2 py-1 bg-white/90 backdrop-blur-sm text-xs font-medium rounded-full ${
           isProject 
             ? getStatusColor(item.active ? 'Active' : 'Inactive')
             : getStatusColor(campaign.status?.charAt(0).toUpperCase() + campaign.status?.slice(1) || 'Unknown')
         }`}>
           {isProject ? (item.active ? 'Active' : 'Inactive') : (campaign.status?.charAt(0).toUpperCase() + campaign.status?.slice(1))}
         </span>
       </div>

       {/* Category Badge */}
       {item.metadata?.category && (
         <div className="absolute bottom-4 left-4">
           <span className="inline-flex items-center px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-xs font-medium rounded-full">
             {item.metadata.category}
           </span>
         </div>
       )}
     </div>

     {/* Item Info */}
     <div className={`p-6 ${viewMode === 'list' ? 'flex-1' : ''}`}>
       <div className="flex items-start justify-between mb-2">
         <h3 className="text-xl font-bold text-gray-800">{item.name}</h3>
         {!isProject && campaign.totalFunds > 0n && (
           <div className="text-right ml-4">
             <p className="text-sm text-gray-500">Raised</p>
             <p className="font-semibold text-green-600">
               {formatEther(campaign.totalFunds)} CELO
             </p>
           </div>
         )}
       </div>

       <p className="text-gray-600 mb-4 line-clamp-2">
         {item.metadata?.bio || item.description}
       </p>

       {/* Campaign specific info */}
       {!isProject && (
         <div className="mb-4 space-y-2">
           <div className="flex items-center justify-between text-sm text-gray-500">
             <div className="flex items-center space-x-1">
               <Calendar className="h-4 w-4" />
               <span>
                 {new Date(Number(campaign.startTime) * 1000).toLocaleDateString()} - 
                 {new Date(Number(campaign.endTime) * 1000).toLocaleDateString()}
               </span>
             </div>
           </div>
           
           {campaign.maxWinners > 0n && (
             <div className="flex items-center space-x-1 text-sm text-gray-500">
               <Award className="h-4 w-4" />
               <span>Max {Number(campaign.maxWinners)} winners</span>
             </div>
           )}

           <div className="flex items-center space-x-1 text-sm text-gray-500">
             <Users className="h-4 w-4" />
             <span>
               {campaign.useQuadraticDistribution ? 'Quadratic' : 
                campaign.useCustomDistribution ? 'Custom' : 'Linear'} distribution
             </span>
           </div>
         </div>
       )}

       {/* Project specific info */}
       {isProject && (
         <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
           {item.metadata?.location && (
             <div className="flex items-center space-x-1">
               <MapPin className="h-4 w-4" />
               <span>{item.metadata.location}</span>
             </div>
           )}
           {item.metadata?.teamSize && (
             <div className="flex items-center space-x-1">
               <Users className="h-4 w-4" />
               <span>{item.metadata.teamSize} members</span>
             </div>
           )}
           <div className="flex items-center space-x-1">
             <Calendar className="h-4 w-4" />
             <span>{new Date(Number(item.createdAt) * 1000).toLocaleDateString()}</span>
           </div>
           {item.campaignIds && item.campaignIds.length > 0 && (
             <div className="flex items-center space-x-1">
               <Trophy className="h-4 w-4" />
               <span>{item.campaignIds.length} campaigns</span>
             </div>
           )}
         </div>
       )}

       {/* Tags */}
       {item.metadata?.tags && Array.isArray(item.metadata.tags) && item.metadata.tags.length > 0 && (
         <div className="flex flex-wrap gap-2">
           {item.metadata.tags.slice(0, 3).map((tag, idx) => (
             <span
               key={idx}
               className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                 isProject 
                   ? 'bg-blue-100 text-blue-700' 
                   : 'bg-purple-100 text-purple-700'
               }`}
             >
               #{tag}
             </span>
           ))}
           {item.metadata.tags.length > 3 && (
             <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
               +{item.metadata.tags.length - 3} more
             </span>
           )}
         </div>
       )}

       {/* Action Indicators */}
       <div className="mt-4 pt-4 border-t border-gray-100">
         <div className="flex items-center justify-between">
           <div className="flex items-center space-x-2 text-sm text-gray-500">
             {isProject ? (
               <>
                 <Code className="h-4 w-4" />
                 <span>View Project</span>
               </>
             ) : (
               <>
                 {campaign.status === 'active' && <PlayCircle className="h-4 w-4 text-green-500" />}
                 {campaign.status === 'upcoming' && <Clock className="h-4 w-4 text-blue-500" />}
                 {campaign.status === 'ended' && <CheckCircle className="h-4 w-4 text-gray-500" />}
                 <span>
                   {campaign.status === 'active' && 'Join Campaign'}
                   {campaign.status === 'upcoming' && 'Coming Soon'}
                   {campaign.status === 'ended' && 'View Results'}
                   {campaign.status === 'paused' && 'Campaign Paused'}
                 </span>
               </>
             )}
           </div>
           
           {!isProject && campaign.status === 'active' && (
             <div className="text-sm text-gray-500">
               {Math.ceil((Number(campaign.endTime) - Date.now() / 1000) / (24 * 60 * 60))} days left
             </div>
           )}
         </div>
       </div>
     </div>
   </div>
 );
}