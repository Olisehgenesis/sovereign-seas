"use client";

import { useState } from "react";
import { useAllProjects } from "../hooks/useProjectMethods";
import { useAccount } from "wagmi";
import { Button } from "./ui/Button";
import { ProjectDetails } from "../hooks/types";
import { formatIpfsUrl } from "../hooks/utils";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Rocket, 
  Users, 
  Star, 
  Eye, 
  Vote, 
  Coins, 
  Target,
  Flame,
  Crown,
  Award,
  TrendingUp,
  Calendar,
  DollarSign,
  Percent,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  StopCircle,
  ChevronRight,
  Heart,
  Share2,
  Bookmark,
  Globe,
  Github,
  ExternalLink,
  Users2,
  Code,
  Zap,
  Shield,
  Activity
} from "lucide-react";

interface ProjectsListProps {
  contractAddress: `0x${string}`;
  onProjectSelect?: (projectId: number) => void;
  viewMode?: 'grid' | 'list';
}

// Helper function to safely parse JSON
const safeJsonParse = (jsonString: string, fallback = {}) => {
  try {
    return jsonString ? JSON.parse(jsonString) : fallback;
  } catch (e) {
    console.warn('Failed to parse JSON:', e);
    return fallback;
  }
};

// Helper function to parse project metadata
const parseProjectMetadata = (projectDetails: ProjectDetails) => {
  const { project, metadata } = projectDetails;
  
  // Parse the metadata JSON strings
  const bio = safeJsonParse(metadata.bio);
  const contractInfo = safeJsonParse(metadata.contractInfo);
  const additionalData = safeJsonParse(metadata.additionalData);
  
  // Combine all parsed metadata
  const parsedMetadata = {
    tagline: bio.tagline || '',
    category: bio.category || '',
    tags: bio.tags || [],
    location: bio.location || '',
    establishedDate: bio.establishedDate || '',
    website: bio.website || '',
    projectType: bio.projectType || '',
    maturityLevel: bio.maturityLevel || '',
    status: bio.status || '',
    openSource: bio.openSource || false,
    
    blockchain: contractInfo.blockchain || '',
    smartContracts: contractInfo.smartContracts || [],
    techStack: contractInfo.techStack || [],
    license: contractInfo.license || '',
    developmentStage: contractInfo.developmentStage || '',
    auditReports: contractInfo.auditReports || [],
    kycCompliant: contractInfo.kycCompliant || false,
    regulatoryCompliance: contractInfo.regulatoryCompliance || [],
    
    logo: additionalData.logo || bio.logo || '',
    demoVideo: additionalData.demoVideo || '',
    coverImage: additionalData.coverImage || '',
    demoUrl: additionalData.demoUrl || '',
    githubRepo: additionalData.githubRepo || '',
    documentation: additionalData.documentation || '',
    karmaGapProfile: additionalData.karmaGapProfile || '',
    
    twitter: additionalData.twitter || '',
    linkedin: additionalData.linkedin || '',
    discord: additionalData.discord || '',
    telegram: additionalData.telegram || '',
    youtube: additionalData.youtube || '',
    instagram: additionalData.instagram || '',
    
    teamMembers: additionalData.teamMembers || [],
    contactEmail: additionalData.contactEmail || '',
    businessEmail: additionalData.businessEmail || '',
    phone: additionalData.phone || '',
    
    keyFeatures: additionalData.keyFeatures || [],
    innovation: additionalData.innovation || '',
    useCases: additionalData.useCases || [],
    targetAudience: additionalData.targetAudience || '',
    
    milestones: additionalData.milestones || [],
    achievements: additionalData.achievements || [],
    partnerships: additionalData.partnerships || [],
    fundingHistory: additionalData.fundingHistory || [],
    
    userCount: additionalData.userCount || '',
    transactionVolume: additionalData.transactionVolume || '',
    tvl: additionalData.tvl || '',
    revenue: additionalData.revenue || '',
    
    version: additionalData.version || '',
    timestamp: additionalData.timestamp || '',
    creator: additionalData.creator || '',
    lastUpdated: additionalData.lastUpdated || ''
  };

  return {
    ...projectDetails,
    metadata: parsedMetadata
  };
};

export default function ProjectsList({ contractAddress, onProjectSelect, viewMode = 'grid' }: ProjectsListProps) {
  const { address } = useAccount();
  const { projects, isLoading, error } = useAllProjects(contractAddress);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
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
    const url = `${window.location.origin}/explorers/project/${project.id}`;
    navigator.clipboard.writeText(url);
    // You could add a toast notification here
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
        <h3 className="text-xl font-bold text-blue-200 mb-2">No Projects Found</h3>
        <p className="text-blue-300">Be the first to create a project!</p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {projects.map((projectDetails, index) => {
          const enhancedProject = parseProjectMetadata(projectDetails);
          const { metadata } = enhancedProject;
          
          console.log("Project Metadata", metadata);
          console.log("Project Logo URL", metadata.logo);
          
          return (
            <motion.div
              key={Number(enhancedProject.id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              onClick={() => onProjectSelect?.(Number(enhancedProject.id))}
              className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:bg-white/15 group"
            >
              <div className="flex items-center space-x-6">
                {/* Project Logo */}
                <div className="relative flex-shrink-0">
                  {metadata.logo ? (
                    <img 
                      src={formatIpfsUrl(metadata.logo)} 
                      alt={`${enhancedProject.name} logo`}
                      className="w-16 h-16 rounded-xl object-cover border-2 border-white/30"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={`w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white text-xl font-bold border-2 border-white/30 ${metadata.logo ? 'hidden' : 'flex'}`}>
                    {enhancedProject.name?.charAt(0) || '🚀'}
                  </div>
                </div>

                {/* Project Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white truncate group-hover:text-blue-200 transition-colors">
                        {enhancedProject.name || 'Untitled Project'}
                      </h3>
                      <p className="text-blue-200 text-sm line-clamp-2 mt-1">
                        {metadata.tagline || enhancedProject.description || 'No description available'}
                      </p>
                    </div>
                    
                    {/* Status Badge */}
                    <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 ml-4">
                      <CheckCircle className="h-4 w-4" />
                      <span>Active</span>
                    </div>
                  </div>

                  {/* Project Stats */}
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2 text-blue-200">
                      <Users2 className="h-4 w-4" />
                      <span>{metadata.userCount || 'N/A'} Users</span>
                    </div>
                    <div className="flex items-center space-x-2 text-blue-200">
                      <Code className="h-4 w-4" />
                      <span>{metadata.blockchain || 'N/A'}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-blue-200">
                      <Shield className="h-4 w-4" />
                      <span>{metadata.kycCompliant ? 'KYC Verified' : 'Not Verified'}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {metadata.tags && metadata.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {metadata.tags.slice(0, 3).map((tag: string, tagIndex: number) => (
                        <span
                          key={tagIndex}
                          className="px-2 py-1 bg-blue-500/20 text-blue-200 text-xs rounded-full border border-blue-400/30"
                        >
                          {tag}
                        </span>
                      ))}
                      {metadata.tags.length > 3 && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-200 text-xs rounded-full border border-blue-400/30">
                          +{metadata.tags.length - 3} more
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
                    onClick={(e) => handleLike(Number(enhancedProject.id), e)}
                    className={`p-2 rounded-lg transition-colors ${
                      likedProjects.has(Number(enhancedProject.id))
                        ? 'text-red-500 bg-red-500/20'
                        : 'text-blue-200 hover:text-red-500 hover:bg-red-500/20'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${likedProjects.has(Number(enhancedProject.id)) ? 'fill-current' : ''}`} />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => handleBookmark(Number(enhancedProject.id), e)}
                    className={`p-2 rounded-lg transition-colors ${
                      bookmarkedProjects.has(Number(enhancedProject.id))
                        ? 'text-yellow-500 bg-yellow-500/20'
                        : 'text-blue-200 hover:text-yellow-500 hover:bg-yellow-500/20'
                    }`}
                  >
                    <Bookmark className={`h-4 w-4 ${bookmarkedProjects.has(Number(enhancedProject.id)) ? 'fill-current' : ''}`} />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => handleShare(enhancedProject, e)}
                    className="p-2 rounded-lg text-blue-200 hover:text-blue-400 hover:bg-blue-500/20 transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg transition-all"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  }

  // Grid View
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((projectDetails, index) => {
        const enhancedProject = parseProjectMetadata(projectDetails);
        const { metadata } = enhancedProject;
        
        console.log("Project Metadata", metadata);
        console.log("Project Logo URL", metadata.logo);
        
        return (
          <motion.div
            key={Number(enhancedProject.id)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05, y: -8 }}
            onClick={() => onProjectSelect?.(Number(enhancedProject.id))}
            className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:bg-white/15 group relative overflow-hidden"
          >
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Status Badge */}
            <div className="absolute top-4 right-4 z-10">
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                <CheckCircle className="h-4 w-4" />
                <span>Active</span>
              </div>
            </div>

            {/* Project Logo */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                {metadata.logo ? (
                  <img 
                    src={formatIpfsUrl(metadata.logo)} 
                    alt={`${enhancedProject.name} logo`}
                    className="w-20 h-20 rounded-xl object-cover border-2 border-white/30 group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`w-20 h-20 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold border-2 border-white/30 group-hover:scale-110 transition-transform duration-300 ${metadata.logo ? 'hidden' : 'flex'}`}>
                  {enhancedProject.name?.charAt(0) || '🚀'}
                </div>
              </div>
            </div>

            {/* Project Info */}
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-200 transition-colors">
                {enhancedProject.name || 'Untitled Project'}
              </h3>
              <p className="text-blue-200 text-sm line-clamp-3">
                {metadata.tagline || enhancedProject.description || 'No description available'}
              </p>
            </div>

            {/* Project Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-300">
                  {metadata.userCount || 'N/A'}
                </div>
                <div className="text-xs text-blue-200">Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-300">
                  {metadata.blockchain || 'N/A'}
                </div>
                <div className="text-xs text-blue-200">Blockchain</div>
              </div>
            </div>

            {/* Tags */}
            {metadata.tags && metadata.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 justify-center">
                {metadata.tags.slice(0, 3).map((tag: string, tagIndex: number) => (
                  <span
                    key={tagIndex}
                    className="px-2 py-1 bg-blue-500/20 text-blue-200 text-xs rounded-full border border-blue-400/30"
                  >
                    {tag}
                  </span>
                ))}
                {metadata.tags.length > 3 && (
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-200 text-xs rounded-full border border-blue-400/30">
                    +{metadata.tags.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => handleLike(Number(enhancedProject.id), e)}
                  className={`p-2 rounded-lg transition-colors ${
                    likedProjects.has(Number(enhancedProject.id))
                      ? 'text-red-500 bg-red-500/20'
                      : 'text-blue-200 hover:text-red-500 hover:bg-red-500/20'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${likedProjects.has(Number(enhancedProject.id)) ? 'fill-current' : ''}`} />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => handleBookmark(Number(enhancedProject.id), e)}
                  className={`p-2 rounded-lg transition-colors ${
                    bookmarkedProjects.has(Number(enhancedProject.id))
                      ? 'text-yellow-500 bg-yellow-500/20'
                      : 'text-blue-200 hover:text-yellow-500 hover:bg-yellow-500/20'
                  }`}
                >
                  <Bookmark className={`h-4 w-4 ${bookmarkedProjects.has(Number(enhancedProject.id)) ? 'fill-current' : ''}`} />
                </motion.button>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all flex items-center space-x-2"
              >
                <span className="text-sm font-medium">Explore</span>
                <ChevronRight className="h-4 w-4" />
              </motion.button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
} 