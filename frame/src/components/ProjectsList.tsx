"use client";

import { useState } from "react";
import { useAllProjects } from "../hooks/useProjectMethods";
import { useAccount } from "wagmi";
import { Button } from "./ui/Button";
import { ProjectDetails } from "../hooks/types";
import { formatIpfsUrl } from "../hooks/utils";
import { motion } from "framer-motion";
import { 
  
  ChevronRight,
  Heart,
  Bookmark,
 
  Github,
  ExternalLink,
  Users2,
  Code,
  Shield,
  MapPin,
  Network,
  BarChart,
  ArrowUpRight,
  Trophy,
  CheckCircle,
  Share2
} from "lucide-react";
import { Address } from "viem";

interface ProjectMetadata {
  bio?: {
    tagline?: string;
    [key: string]: unknown;
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
  [key: string]: unknown;
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

interface ProjectsListProps {
  contractAddress: `0x${string}`;
  onProjectSelect?: (projectId: number) => void;
  viewMode?: 'list';
}


// Enhanced project metadata parsing
const parseProjectMetadata = (projectDetails: ProjectDetails): EnhancedProject => {
  let parsedMetadata: ProjectMetadata = {};
  
  try {
    if (projectDetails.metadata?.bio) {
      try {
        parsedMetadata.bio = JSON.parse(projectDetails.metadata.bio);
      } catch {
        parsedMetadata.bio = { tagline: projectDetails.metadata.bio };
      }
    }

    if (projectDetails.metadata?.contractInfo) {
      try {
        const contractInfo = JSON.parse(projectDetails.metadata.contractInfo);
        parsedMetadata = { ...parsedMetadata, ...contractInfo };
      } catch {
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
      } catch {
        parsedMetadata.additionalData = projectDetails.metadata.additionalData;
      }
    }
  } catch {
    console.warn('Error parsing project metadata');
  }

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
  };
};

// Enhanced Project Card Component


export default function ProjectsList({ contractAddress, onProjectSelect, viewMode = 'list' }: ProjectsListProps) {
  const { address } = useAccount();
  const { projects, isLoading, error } = useAllProjects(contractAddress);

  console.log("Projects", projects);
  const [likedProjects, setLikedProjects] = useState<Set<number>>(new Set());
  const [bookmarkedProjects, setBookmarkedProjects] = useState<Set<number>>(new Set());

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const handleLike = (projectId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const handleBookmark = (projectId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const handleShare = (project: any, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Create the cast text with project details
    const castText = `🚀 Check out this amazing project: ${project.name}!\n\n` +
      `📍 ${project.metadata?.bio?.tagline || project.description || 'Amazing project on Sovereign Seas'}\n` +
      `🔗 View on Sovereign Seas and support this project! 🌊\n\n` +
      `#SovereignSeas #Funding #Celo #Web3`;
    
    // Create the Farcaster cast intent URL
    const appUrl = `${window.location.origin}/project/${project.id}`;
    const castUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent(appUrl)}`;
    
    // Open the cast intent URL
    window.open(castUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">Error loading projects</div>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🚀</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">No Projects Found</h3>
        <p className="text-blue-600">Be the first to create a project!</p>
      </div>
    );
  }

  // Process projects to enhanced format
  const enhancedProjects = projects.map(projectDetails => parseProjectMetadata(projectDetails));

  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {enhancedProjects.map((project, index) => (
          <motion.div
            key={Number(project.id)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            onClick={() => onProjectSelect?.(Number(project.id))}
            className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-gray-300/30 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:bg-white/15 group"
          >
            <div className="flex items-center space-x-6">
              {/* Project Logo */}
              <div className="relative flex-shrink-0">
                {project.metadata.logo ? (
                  <img 
                    src={formatIpfsUrl(project.metadata.logo)} 
                    alt={`${project.name} logo`}
                    className="w-16 h-16 rounded-xl object-cover border-2 border-white/30"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white text-xl font-bold border-2 border-white/30 ${project.metadata.logo ? 'hidden' : 'flex'}`}>
                  {project.name?.charAt(0) || '🚀'}
                </div>
              </div>

              {/* Project Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                      {project.name || 'Untitled Project'}
                    </h3>
                    <p className="text-blue-600 text-sm line-clamp-2 mt-1">
                      {project.metadata?.bio?.tagline || project.description || 'No description available'}
                    </p>
                  </div>
                  
                  {/* Status Badge */}
                  <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 ml-4">
                    <CheckCircle className="h-4 w-4" />
                    <span>{project.active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>

                {/* Project Stats */}
                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Users2 className="h-4 w-4" />
                    <span>{String(project.metadata.userCount || 'N/A')} Users</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Code className="h-4 w-4" />
                    <span>{project.metadata.blockchain || 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Shield className="h-4 w-4" />
                    <span>{project.contracts?.length || 0} contracts</span>
                  </div>
                </div>

                {/* Tags */}
                {project.metadata.tags && project.metadata.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {project.metadata.tags.slice(0, 3).map((tag: string, tagIndex: number) => (
                      <span
                        key={tagIndex}
                        className="px-2 py-1 bg-blue-500/20 text-blue-600 text-xs rounded-full border border-blue-400/30"
                      >
                        {tag}
                      </span>
                    ))}
                    {project.metadata.tags.length > 3 && (
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-600 text-xs rounded-full border border-blue-400/30">
                        +{project.metadata.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => handleLike(Number(project.id), e)}
                  className={`p-2 rounded-lg transition-colors ${
                    likedProjects.has(Number(project.id))
                      ? 'text-red-500 bg-red-500/20'
                      : 'text-gray-600 hover:text-red-500 hover:bg-red-500/20'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${likedProjects.has(Number(project.id)) ? 'fill-current' : ''}`} />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => handleBookmark(Number(project.id), e)}
                  className={`p-2 rounded-lg transition-colors ${
                    bookmarkedProjects.has(Number(project.id))
                      ? 'text-yellow-500 bg-yellow-500/20'
                      : 'text-gray-600 hover:text-yellow-500 hover:bg-yellow-500/20'
                  }`}
                >
                  <Bookmark className={`h-4 w-4 ${bookmarkedProjects.has(Number(project.id)) ? 'fill-current' : ''}`} />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => handleShare(project, e)}
                  className="p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-500/20 transition-colors"
                >
                  <Share2 className="h-4 w-4" />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 transition-all"
                >
                  <ChevronRight className="h-4 w-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  // Grid View
  return (
    <div className="space-y-4">
      {enhancedProjects.map((project, index) => (
        <motion.div
          key={Number(project.id)}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ scale: 1.02, y: -2 }}
          onClick={() => onProjectSelect?.(Number(project.id))}
          className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-gray-300/30 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:bg-white/15 group"
        >
          <div className="flex items-center space-x-6">
            {/* Project Logo */}
            <div className="relative flex-shrink-0">
              {project.metadata.logo ? (
                <img 
                  src={formatIpfsUrl(project.metadata.logo)} 
                  alt={`${project.name} logo`}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-white/30"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white text-xl font-bold border-2 border-white/30 ${project.metadata.logo ? 'hidden' : 'flex'}`}>
                {project.name?.charAt(0) || '🚀'}
              </div>
            </div>

            {/* Project Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                    {project.name || 'Untitled Project'}
                  </h3>
                  <p className="text-blue-600 text-sm line-clamp-2 mt-1">
                    {project.metadata?.bio?.tagline || project.description || 'No description available'}
                  </p>
                </div>
                
                {/* Status Badge */}
                <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 ml-4">
                  <CheckCircle className="h-4 w-4" />
                  <span>{project.active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>

              {/* Project Stats */}
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Users2 className="h-4 w-4" />
                  <span>{String(project.metadata.userCount || 'N/A')} Users</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <Code className="h-4 w-4" />
                  <span>{project.metadata.blockchain || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <Shield className="h-4 w-4" />
                  <span>{project.contracts?.length || 0} contracts</span>
                </div>
              </div>

              {/* Tags */}
              {project.metadata.tags && project.metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {project.metadata.tags.slice(0, 3).map((tag: string, tagIndex: number) => (
                    <span
                      key={tagIndex}
                      className="px-2 py-1 bg-blue-500/20 text-blue-600 text-xs rounded-full border border-blue-400/30"
                    >
                      {tag}
                    </span>
                  ))}
                  {project.metadata.tags.length > 3 && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-600 text-xs rounded-full border border-blue-400/30">
                      +{project.metadata.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => handleLike(Number(project.id), e)}
                className={`p-2 rounded-lg transition-colors ${
                  likedProjects.has(Number(project.id))
                    ? 'text-red-500 bg-red-500/20'
                    : 'text-gray-600 hover:text-red-500 hover:bg-red-500/20'
                }`}
              >
                <Heart className={`h-4 w-4 ${likedProjects.has(Number(project.id)) ? 'fill-current' : ''}`} />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => handleBookmark(Number(project.id), e)}
                className={`p-2 rounded-lg transition-colors ${
                  bookmarkedProjects.has(Number(project.id))
                    ? 'text-yellow-500 bg-yellow-500/20'
                    : 'text-gray-600 hover:text-yellow-500 hover:bg-yellow-500/20'
                }`}
              >
                <Bookmark className={`h-4 w-4 ${bookmarkedProjects.has(Number(project.id)) ? 'fill-current' : ''}`} />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => handleShare(project, e)}
                className="p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-500/20 transition-colors"
              >
                <Share2 className="h-4 w-4" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
} 