'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Users
} from 'lucide-react';
import { useAllProjects } from '@/hooks/useProjectMethods';
import { Address } from 'viem';

// Get contract address from environment
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_V4 as Address;

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

export default function ExplorerPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);

  // Use the useAllProjects hook
  const { projects, isLoading, error } = useAllProjects(CONTRACT_ADDRESS);

  // Available categories and tags
  const categories = [
    'DeFi',
    'NFT',
    'Gaming',
    'Infrastructure',
    'Social',
    'DAO',
    'Metaverse',
    'Education',
    'Other'
  ];

  const tags = [
    'Ethereum',
    'Polygon',
    'Solana',
    'Avalanche',
    'Arbitrum',
    'Optimism',
    'Layer 2',
    'Zero Knowledge',
    'AI',
    'Machine Learning',
    'Web3',
    'DeFi',
    'NFT',
    'Gaming',
    'Social',
    'DAO',
    'Metaverse'
  ];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Helper function to safely parse JSON metadata
  const parseMetadata = (projectDetails: any): ProjectMetadata => {
    let parsedMetadata: ProjectMetadata = {};
    
    try {
      // Parse bio
      if (projectDetails.metadata?.bio) {
        parsedMetadata.bio = projectDetails.metadata.bio;
      }

      // Parse contractInfo if it's JSON
      if (projectDetails.metadata?.contractInfo) {
        try {
          const contractInfo = JSON.parse(projectDetails.metadata.contractInfo);
          parsedMetadata = { ...parsedMetadata, ...contractInfo };
        } catch {
          // If not JSON, just store as string
          parsedMetadata.contractInfo = projectDetails.metadata.contractInfo;
        }
      }

      // Parse additionalData if it's JSON
      if (projectDetails.metadata?.additionalData) {
        try {
          const additionalData = JSON.parse(projectDetails.metadata.additionalData);
          parsedMetadata = { ...parsedMetadata, ...additionalData };
        } catch {
          // If not JSON, just store as string
          parsedMetadata.additionalData = projectDetails.metadata.additionalData;
        }
      }
    } catch (e) {
      console.warn('Error parsing metadata:', e);
    }

    return parsedMetadata;
  };

  useEffect(() => {
    if (!projects) return;
    console.log("Raw projects from hook:", projects);

    // Transform projects to include parsed metadata
    const transformedProjects = projects.map(projectDetails => {
      const parsedMetadata = parseMetadata(projectDetails);
      
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
        contracts: projectDetails.contracts
      };
    });

    console.log("Transformed projects:", transformedProjects);

    let filtered = [...transformedProjects];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(project => 
        project.name.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query) ||
        (project.metadata?.bio && project.metadata.bio.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(project => {
        const category = project.metadata?.category;
        return category && selectedCategories.includes(category);
      });
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(project => {
        const tags = project.metadata?.tags;
        return tags && Array.isArray(tags) && tags.some(tag => selectedTags.includes(tag));
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return Number(b.createdAt) - Number(a.createdAt);
        case 'oldest':
          return Number(a.createdAt) - Number(b.createdAt);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    setFilteredProjects(filtered);
  }, [projects, searchQuery, selectedCategories, selectedTags, sortBy]);

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

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedTags([]);
    setSortBy('newest');
  };

  if (!isMounted) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Projects</h2>
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
          <span className="text-xl text-gray-700">Loading projects...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects..."
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

              {/* Sort */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Sort By</h3>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'name')}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Active Filters */}
            {(selectedCategories.length > 0 || selectedTags.length > 0) && (
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
            Showing {filteredProjects.length} of {projects?.length || 0} projects
          </p>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No projects found</h3>
            <p className="text-gray-600 mb-4">
              {projects?.length === 0 
                ? "No projects have been created yet." 
                : "No projects match your search criteria."}
            </p>
            {(searchQuery || selectedCategories.length > 0 || selectedTags.length > 0) && (
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
            {filteredProjects.map(project => (
              <ProjectCard 
                key={project.id.toString()} 
                project={project} 
                viewMode={viewMode}
                onClick={() => router.push(`/explorer/project/${project.id}`)}
              />
            ))}
          </div>
        )}
      </div>
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
  return (
    <div
      onClick={onClick}
      className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-blue-100 overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer ${
        viewMode === 'list' ? 'flex' : ''
      }`}
    >
      {/* Project Image */}
      <div className={`relative ${viewMode === 'list' ? 'w-48' : 'aspect-video'}`}>
        {project.metadata?.coverImage ? (
          <img
            src={project.metadata.coverImage}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
        )}
        {project.metadata?.category && (
          <div className="absolute top-4 left-4">
            <span className="inline-flex items-center px-3 py-1 bg-white/90 backdrop-blur-sm text-blue-700 text-sm font-medium rounded-full">
              {project.metadata.category}
            </span>
          </div>
        )}
        <div className="absolute top-4 right-4">
          <span className={`inline-flex items-center px-2 py-1 bg-white/90 backdrop-blur-sm text-xs font-medium rounded-full ${
            project.active ? 'text-green-700' : 'text-gray-700'
          }`}>
            {project.active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Project Info */}
      <div className={`p-6 ${viewMode === 'list' ? 'flex-1' : ''}`}>
        <h3 className="text-xl font-bold text-gray-800 mb-2">{project.name}</h3>
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
          {project.metadata?.teamSize && (
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>{project.metadata.teamSize} members</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>{new Date(Number(project.createdAt) * 1000).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Tags */}
        {project.metadata?.tags && Array.isArray(project.metadata.tags) && project.metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {project.metadata.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full"
              >
                #{tag}
              </span>
            ))}
            {project.metadata.tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                +{project.metadata.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}