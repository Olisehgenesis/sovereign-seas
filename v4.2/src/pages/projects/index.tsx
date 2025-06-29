import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search,
  Code,

  MapPin,
  
  Eye,
  AlertTriangle,
  Github,
  
  Trophy,

  Network,
  ExternalLink,
  ArrowUpRight,

  BarChart,
  Shield,

} from 'lucide-react';
import { useAllProjects } from '@/hooks/useProjectMethods';
import { Address } from 'viem';
import { formatIpfsUrl } from '@/utils/imageUtils';
import { useGeneralPageMetadata } from '@/hooks/usePageMetadata';

// Get contract address from environment
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_V4 as Address;

interface ProjectMetadata {
  bio?: {
    tagline?: string;
    [key: string]: any;
  };
  contractInfo?: string;
  additionalData?: string;
  category?: string;
  tags?: string[];
  location?: string;
  teamSize?: string;
  coverImage?: string;
  logo?: string;
  githubRepo?: string;
  website?: string;
  blockchain?: string;
  techStack?: string[];
  [key: string]: any;
}

interface EnhancedProject {
  id: bigint;
  owner: Address;
  name: string;
  description: string;
  transferrable: boolean;
  active: boolean;
  createdAt: bigint;
  campaignIds: bigint[];
  contracts?: Address[];
  metadata: ProjectMetadata;
}

// Utility functions


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

// Project Card Component
const ProjectCard = ({ project }: { project: EnhancedProject }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/explorer/project/${project.id.toString()}`)}
      className="group bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-blue-100 overflow-hidden cursor-pointer relative hover:shadow-xl hover:-translate-y-3 transition-all duration-500"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
      
      {/* Project Image */}
      <div className="relative h-40 sm:h-48 bg-gradient-to-r from-blue-100 to-indigo-100 overflow-hidden">
        {project.metadata.logo || project.metadata.coverImage ? (
          <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${formatIpfsUrl(project.metadata.logo ?? project.metadata.coverImage ?? '')})`, opacity: 0.9 }}></div>
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
        {project.metadata.category && (
          <div className="absolute bottom-4 left-4">
            <span className="inline-flex items-center px-3 py-1.5 bg-black/70 backdrop-blur-sm text-white text-xs font-semibold rounded-full">
              {project.metadata.category}
            </span>
          </div>
        )}

        {/* Campaigns Count */}
        {project.campaignIds.length > 0 && (
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
      <div className="p-4 relative z-10">
        <p className="text-gray-600 text-xs sm:text-sm mb-4 line-clamp-2 ">{project.metadata?.bio?.tagline || project.description}</p>

        {/* Project Meta */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
          {project.metadata.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{project.metadata.location}</span>
            </div>
          )}
          {project.metadata.blockchain && (
            <div className="flex items-center gap-1">
              <Network className="h-3 w-3" />
              <span>{project.metadata.blockchain}</span>
            </div>
          )}
          {project.contracts && project.contracts.length > 0 && (
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              <span>{project.contracts.length} contract{project.contracts.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Tech Stack */}
        {project.metadata.techStack && project.metadata.techStack.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {project.metadata.techStack.slice(0, 3).map((tech, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg"
              >
                {tech}
              </span>
            ))}
            {project.metadata.techStack.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg">
                +{project.metadata.techStack.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Tags */}
        {project.metadata.tags && project.metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {project.metadata.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-lg"
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

        {/* Action Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Eye className="h-4 w-4" />
            <span>View Project</span>
          </div>
          <div className="flex items-center gap-2">
            {project.metadata.githubRepo && (
              <a
                href={project.metadata.githubRepo}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
              >
                <Github className="h-4 w-4" />
              </a>
            )}
            {project.metadata.website && (
              <a 
                href={project.metadata.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md transform group-hover:rotate-45 transition-transform duration-500">
              <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </div>
          </div>
        </div>
        
        {/* Voting tokens for this project */}
        <div className="flex -space-x-1.5 mt-4">
          <div className="w-6 h-6 rounded-full bg-green-100 ring-2 ring-white flex items-center justify-center text-green-500 text-xs font-bold">C</div>
          <div className="w-6 h-6 rounded-full bg-blue-100 ring-2 ring-white flex items-center justify-center text-blue-500 text-xs font-bold">$</div>
        </div>
      </div>
    </div>
  );
};

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [processedProjects, setProcessedProjects] = useState<EnhancedProject[]>([]);

  // Get projects data
  const { projects, isLoading, error } = useAllProjects(CONTRACT_ADDRESS);

  // Metadata management
  useGeneralPageMetadata({
    title: 'Projects | Sovereign Seas',
    description: 'Discover innovative blockchain projects across DeFi, NFT, Gaming, Infrastructure, and more. Browse projects by category and find opportunities to support.',
    keywords: 'projects, blockchain, DeFi, NFT, Gaming, Infrastructure, DAO, Social, Identity, Privacy, Analytics, Developer Tools, Sovereign Seas',
    image: '/og-image.png'
  });

  const categories = [
    'DeFi', 'NFT', 'Gaming', 'Infrastructure', 'DAO', 'Social', 'Identity', 
    'Privacy', 'Analytics', 'Developer Tools', 'Wallet', 'Exchange', 'Lending',
    'Insurance', 'Real Estate', 'Supply Chain', 'Healthcare', 'Education', 'Other'
  ];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Process projects data
  useEffect(() => {
    if (!projects) return;

    const enhanced = projects.map(projectDetails => {
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
        contracts: projectDetails.contracts,
        metadata: parsedMetadata
      } as EnhancedProject;
    });

    // Apply filters and sorting
    let filtered = [...enhanced];

    // Search filter
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(project => 
        project.name.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query) ||
        (project.metadata.bio && project.metadata.bio.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(project => 
        project.metadata.category && project.metadata.category.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return Number(b.createdAt) - Number(a.createdAt);
        case 'oldest':
          return Number(a.createdAt) - Number(b.createdAt);
        case 'popular':
          return (b.campaignIds?.length || 0) - (a.campaignIds?.length || 0);
        case 'campaigns':
          return (b.campaignIds?.length || 0) - (a.campaignIds?.length || 0);
        default:
          return 0;
      }
    });

    setProcessedProjects(filtered);
  }, [projects, searchTerm, categoryFilter, sortBy]);

  if (!isMounted) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-blue-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md mx-auto border border-red-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">Unable to Load Projects</h2>
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-blue-50 to-cyan-50 transition-all duration-300">
      {/* Floating particles background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-gradient-to-r from-blue-400/10 to-indigo-400/10 animate-float-slower blur-2xl"></div>
        <div className="absolute top-1/2 right-1/5 w-48 h-48 rounded-full bg-gradient-to-r from-cyan-400/10 to-blue-400/10 animate-float-slow blur-2xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-40 h-40 rounded-full bg-gradient-to-r from-indigo-400/10 to-purple-400/10 animate-float blur-2xl"></div>
        <div className="absolute top-1/3 right-1/4 w-36 h-36 rounded-full bg-gradient-to-r from-purple-400/10 to-pink-400/10 animate-float-delay-3 blur-2xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
       

        {/* Search and Filter Section */}
        <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/30 shadow-lg">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/90 backdrop-blur-sm border border-white/30 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-900 placeholder-gray-500 shadow-sm"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-3 rounded-xl bg-white/90 backdrop-blur-sm border border-white/30 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-900 shadow-sm"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category.toLowerCase()}>{category}</option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 rounded-xl bg-white/90 backdrop-blur-sm border border-white/30 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-900 shadow-sm"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="popular">Most Popular</option>
                <option value="campaigns">Most Campaigns</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            {isLoading ? 'Loading projects...' : `${processedProjects.length} projects found`}
          </p>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-6 bg-gray-200 rounded-lg w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded-lg w-1/2 mb-6"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded-lg"></div>
                  <div className="h-4 bg-gray-200 rounded-lg w-5/6"></div>
                </div>
              </div>
            ))}
          </div>
        ) : processedProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processedProjects.map((project) => (
              <ProjectCard key={project.id.toString()} project={project} />
            ))}
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 sm:p-8 text-center border border-blue-100 shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 via-transparent to-indigo-100/50"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 mb-4 text-white">
                <Code className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">No Projects Found</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto text-sm sm:text-base">
                {searchTerm || categoryFilter !== 'all' 
                  ? 'No projects match your current filters. Try adjusting your search criteria.'
                  : 'Be the first to create an innovative project and shape the future of blockchain!'
                }
              </p>
              {searchTerm || categoryFilter !== 'all' ? (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setCategoryFilter('all');
                  }}
                  className="px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl transition-all inline-flex items-center group relative overflow-hidden"
                >
                  Clear Filters
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                </button>
              ) : (
                <button
                  onClick={() => navigate('/app/project/start')}
                  className="px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl transition-all inline-flex items-center group relative overflow-hidden"
                >
                  <Code className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                  Create Project
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}