'use client';

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { 
  ArrowLeft, 
  Github,
  Globe,
  FileText,
  Calendar,
  MapPin,
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Share2,
  Bookmark,
  Users,
  Trophy,
  Zap,
  Shield,
  Copy,
  Maximize,
  Twitter,
  Linkedin,
  Mail,
  MessageCircle,
  Link as LinkIcon,
  Sparkles,
  Award,
  Target,
  Lightbulb,
  Building,
  ChevronDown,
  ChevronUp,
  Globe2,
  Send,
  BadgeCheck,
  User,
  Terminal,
  X,
  Star,
  Code,
  Video,
  Play,
  TrendingUp,
  Settings,
  Edit
} from 'lucide-react';
import { useProjectDetails } from '@/hooks/useProjectMethods';
import { Address } from 'viem';
import ProjectCampaignsModal from '@/components/ProjectCampaignsModal';
import { formatIpfsUrl } from '@/utils/imageUtils';

export default function ProjectView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  
  // Project data state
  const [project, setProject] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  // UI State
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [showAllTeam, setShowAllTeam] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    description: false,
    features: false,
    technical: false
  });
  const [showCampaignsModal, setShowCampaignsModal] = useState(false);
  
  const contractAddress = import.meta.env.VITE_CONTRACT_V4;
  
  // Convert string id to bigint
  const projectId = id ? BigInt(id as string) : BigInt(0);
  
  // Use the proper hook to get project details
  const {
    projectDetails,
    isLoading,
    error,
    refetch
  } = useProjectDetails(contractAddress as Address, projectId);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  useEffect(() => {
    if (projectDetails) {
      // Process the project data
      const { project: projectData, metadata, contracts } = projectDetails;
      
      // Initialize enhanced project with basic data
      let enhancedProject = {
        id: Number(projectData.id),
        owner: projectData.owner,
        name: projectData.name,
        description: projectData.description,
        transferrable: projectData.transferrable,
        active: projectData.active,
        createdAt: projectData.createdAt,
        campaignIds: projectData.campaignIds,
        contracts: contracts
      };

      // Parse and merge metadata
      let parsedMetadata = {};
      
      // Parse bio
      if (metadata.bio) {
        try {
          const bioData = JSON.parse(metadata.bio);
          parsedMetadata = { ...parsedMetadata, ...bioData };
        } catch (e) {
          // If not JSON, treat as string
          parsedMetadata.bio = metadata.bio;
        }
      }

      // Parse contractInfo
      if (metadata.contractInfo) {
        try {
          const contractInfo = JSON.parse(metadata.contractInfo);
          parsedMetadata = { ...parsedMetadata, ...contractInfo };
        } catch (e) {
          console.warn('Failed to parse contract info:', e);
        }
      }

      // Parse additionalData
      if (metadata.additionalData) {
        try {
          const additionalData = JSON.parse(metadata.additionalData);
          parsedMetadata = { ...parsedMetadata, ...additionalData };
        } catch (e) {
          console.warn('Failed to parse additional data:', e);
        }
      }

      // Merge all parsed metadata into the project
      enhancedProject = { ...enhancedProject, ...parsedMetadata };
      
      // Ensure arrays are properly formatted
      if (typeof enhancedProject.tags === 'string') {
        try {
          enhancedProject.tags = JSON.parse(enhancedProject.tags);
        } catch (e) {
          enhancedProject.tags = [];
        }
      }
      
      if (typeof enhancedProject.keyFeatures === 'string') {
        try {
          enhancedProject.keyFeatures = JSON.parse(enhancedProject.keyFeatures);
        } catch (e) {
          enhancedProject.keyFeatures = [];
        }
      }
      
      if (typeof enhancedProject.teamMembers === 'string') {
        try {
          enhancedProject.teamMembers = JSON.parse(enhancedProject.teamMembers);
        } catch (e) {
          enhancedProject.teamMembers = [];
        }
      }

      setProject(enhancedProject);
    }
  }, [projectDetails]);
  
  const handleShare = async (platform) => {
    const url = window.location.href;
    const text = `Check out ${project?.name} - ${project?.tagline || project?.description}`;
    
    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'linkedin':
        window.open(`https://linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(url);
          setCopiedUrl(true);
          setTimeout(() => setCopiedUrl(false), 2000);
        } catch (err) {
          console.error('Failed to copy URL:', err);
        }
        break;
      default:
        break;
    }
    setShowShareModal(false);
  };
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  const renderMetadataField = (label, value, icon = null) => {
    if (!value || value === "" || (Array.isArray(value) && value.length === 0)) return null;
    
    return (
      <div className="flex items-start space-x-3 py-3 border-b border-gray-100 last:border-b-0" key={label}>
        {icon && <div className="text-blue-500 mt-0.5">{icon}</div>}
        <div className="flex-1">
          <dt className="text-sm font-medium text-gray-600">{label}</dt>
          <dd className="text-gray-800 mt-1">
            {typeof value === 'string' && (value.startsWith('http') || value.startsWith('https')) ? (
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                <span className="truncate">{value}</span>
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
            ) : Array.isArray(value) ? (
              <div className="flex flex-wrap gap-1">
                {value.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : typeof value === 'boolean' ? (
              <span className={value ? 'text-green-600' : 'text-red-600'}>
                {value ? 'Yes' : 'No'}
              </span>
            ) : (
              <span>{value}</span>
            )}
          </dd>
        </div>
      </div>
    );
  };
  
  if (!isMounted) {
    return null;
  }
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-500"></div>
            <Sparkles className="h-6 w-6 text-blue-500 absolute inset-0 m-auto animate-pulse" />
          </div>
          <p className="text-lg text-blue-600 font-medium">Loading project...</p>
        </div>
      </div>
    );
  }
  
  // Error state or project not found
  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Project Not Found</h1>
          <p className="text-gray-600 mb-6">
            {error ? `Error loading project: ${error.message}` : 'The project you\'re looking for doesn\'t exist or has been removed.'}
          </p>
          <button
            onClick={() => navigate('/projects')}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            Browse All Projects
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Floating background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-gradient-to-r from-blue-400/10 to-indigo-400/10 animate-pulse blur-2xl"></div>
        <div className="absolute top-1/2 right-1/5 w-48 h-48 rounded-full bg-gradient-to-r from-cyan-400/10 to-blue-400/10 animate-pulse blur-2xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-40 h-40 rounded-full bg-gradient-to-r from-indigo-400/10 to-purple-400/10 animate-pulse blur-2xl"></div>
      </div>
      
      <div className="relative z-10">
        {/* Hero Section */}
        <div className="relative">
          {/* Cover Image */}
          {project.coverImage && (
            <div className="h-80 md:h-96 relative overflow-hidden">
              <img
                src={formatIpfsUrl(project.coverImage)}
                alt={`${project.name} cover`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
            </div>
          )}
          
          {/* Navigation */}
          <div className={`absolute top-6 left-6 z-20 ${!project.coverImage ? 'relative bg-transparent pt-6' : ''}`}>
            <button
              onClick={() => navigate('/projects')}
              className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm text-gray-700 hover:text-blue-600 rounded-full transition-all hover:bg-white shadow-lg"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </button>
          </div>
          
          {/* Project Header */}
          <div className={`${project.coverImage ? 'absolute bottom-0 left-0 right-0' : 'relative pt-4'} px-6 md:px-12 pb-8`}>
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row items-start md:items-end space-y-4 md:space-y-0 md:space-x-6">
                {/* Project Logo */}
                <div className="relative">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-white shadow-xl overflow-hidden border-4 border-white/90 backdrop-blur-sm">
                    {project.logo ? (
                      <img
                        src={formatIpfsUrl(project.logo)}
                        alt={`${project.name} logo`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <Sparkles className="h-8 w-8 md:h-12 md:w-12 text-white" />
                      </div>
                    )}
                  </div>
                  {project.verified && (
                    <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1">
                      <BadgeCheck className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
                
                {/* Project Info */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-sm font-medium rounded-full border border-blue-200">
                      {project.category || 'Project'}
                    </span>
                    {project.tags && project.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-1 bg-white/80 backdrop-blur-sm text-gray-700 text-xs font-medium rounded-full border border-gray-200"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  
                  <h1 className={`text-3xl md:text-4xl lg:text-5xl font-bold mb-3 ${project.coverImage ? 'text-white' : 'text-gray-800'}`}>
                    {project.name}
                  </h1>
                  
                  <p className={`text-lg md:text-xl mb-4 ${project.coverImage ? 'text-white/90' : 'text-gray-600'} max-w-3xl`}>
                    {project.tagline || project.description}
                  </p>
                  
                  {/* Project Meta Info */}
                  <div className="flex items-center space-x-6 text-sm">
                    {project.createdAt && (
                      <div className={`flex items-center space-x-1 ${project.coverImage ? 'text-white/80' : 'text-gray-600'}`}>
                        <Calendar className="h-4 w-4" />
                        <span>Created {new Date(Number(project.createdAt) * 1000).toLocaleDateString()}</span>
                      </div>
                    )}
                    {project.location && (
                      <div className={`flex items-center space-x-1 ${project.coverImage ? 'text-white/80' : 'text-gray-600'}`}>
                        <MapPin className="h-4 w-4" />
                        <span>{project.location}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setIsBookmarked(!isBookmarked)}
                    className={`p-3 rounded-full transition-all ${
                      isBookmarked 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white/90 backdrop-blur-sm text-gray-700 hover:bg-white'
                    } shadow-lg hover:shadow-xl hover:-translate-y-1`}
                  >
                    <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
                  </button>
                  
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="p-3 rounded-full bg-white/90 backdrop-blur-sm text-gray-700 hover:bg-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Description */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-blue-100">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                    <FileText className="h-6 w-6 text-blue-500 mr-3" />
                    About This Project
                  </h2>
                  <button
                    onClick={() => toggleSection('description')}
                    className="text-blue-500 hover:text-blue-600 transition-colors"
                  >
                    {expandedSections.description ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>
                
                <div className={`prose prose-blue max-w-none ${expandedSections.description ? '' : 'line-clamp-4'}`}>
                  <p className="text-gray-700 leading-relaxed">
                    {project.description}
                  </p>
                  
                  {project.innovation && expandedSections.description && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
                        <Lightbulb className="h-4 w-4 mr-2" />
                        Innovation Highlights
                      </h4>
                      <p className="text-blue-700">{project.innovation}</p>
                    </div>
                  )}
                  
                  {project.targetAudience && expandedSections.description && (
                    <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-100">
                      <h4 className="font-semibold text-green-800 mb-2 flex items-center">
                        <Target className="h-4 w-4 mr-2" />
                        Target Audience
                      </h4>
                      <p className="text-green-700">{project.targetAudience}</p>
                    </div>
                  )}
                </div>
                
                {!expandedSections.description && (
                  <button
                    onClick={() => toggleSection('description')}
                    className="mt-4 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    Read more...
                  </button>
                )}
              </div>
              
              {/* Demo Video/Media */}
              {project.demoVideo && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-blue-100">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                    <Video className="h-6 w-6 text-blue-500 mr-3" />
                    Project Demo
                  </h2>
                  
                  <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden">
                    <video
                      src={formatIpfsUrl(project.demoVideo)}
                      className="w-full h-full object-cover"
                      controls
                      poster={formatIpfsUrl(project.coverImage)}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </div>
              )}
              
              {/* Key Features */}
              {project.keyFeatures && project.keyFeatures.length > 0 && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-blue-100">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                    <Star className="h-6 w-6 text-blue-500 mr-3" />
                    Key Features
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {project.keyFeatures.slice(0, showAllFeatures ? undefined : 6).map((feature, idx) => (
                      <div key={idx} className="flex items-start space-x-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  {project.keyFeatures.length > 6 && (
                    <button
                      onClick={() => setShowAllFeatures(!showAllFeatures)}
                      className="mt-4 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      {showAllFeatures ? 'Show less' : `Show all ${project.keyFeatures.length} features`}
                    </button>
                  )}
                </div>
              )}
              
              {/* Technical Details */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-blue-100">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                    <Code className="h-6 w-6 text-blue-500 mr-3" />
                    Technical Details
                  </h2>
                  <button
                    onClick={() => toggleSection('technical')}
                    className="text-blue-500 hover:text-blue-600 transition-colors"
                  >
                    {expandedSections.technical ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>
                
                <div className="space-y-1">
                  {renderMetadataField('Blockchain', project.blockchain, <Zap className="h-4 w-4" />)}
                  {renderMetadataField('Development Stage', project.developmentStage, <Award className="h-4 w-4" />)}
                  {renderMetadataField('License', project.license, <Shield className="h-4 w-4" />)}
                  {renderMetadataField('Open Source', project.openSource, <Github className="h-4 w-4" />)}
                  {renderMetadataField('Project Type', project.projectType, <Building className="h-4 w-4" />)}
                  {renderMetadataField('Maturity Level', project.maturityLevel, <TrendingUp className="h-4 w-4" />)}
                  
                  {expandedSections.technical && (
                    <>
                      {renderMetadataField('Technology Stack', project.techStack, <Terminal className="h-4 w-4" />)}
                      {project.contracts && project.contracts.length > 0 && renderMetadataField('Smart Contracts', project.contracts, <Code className="h-4 w-4" />)}
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Sidebar */}
            <div className="space-y-6">
              {/* Project Info */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-blue-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 text-blue-500 mr-2" />
                  Project Info
                </h3>
                
                <div className="space-y-4">
                  {project.establishedDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Established</span>
                      <span className="font-semibold text-gray-800">
                        {new Date(project.establishedDate).getFullYear()}
                      </span>
                    </div>
                  )}
                  {project.location && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Location</span>
                      <span className="font-semibold text-gray-800">{project.location}</span>
                    </div>
                  )}
                  {project.active !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Status</span>
                      <span className={`font-semibold ${project.active ? 'text-green-600' : 'text-gray-500'}`}>
                        {project.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Quick Links */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-blue-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <LinkIcon className="h-5 w-5 text-blue-500 mr-2" />
                  Quick Links
                </h3>
                
                <div className="space-y-3">
                  {project.githubRepo && (
                    <a
                      href={project.githubRepo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
                    >
                      <Github className="h-5 w-5 text-gray-600 group-hover:text-gray-800" />
                      <span className="text-gray-700 group-hover:text-gray-900 font-medium">GitHub Repository</span>
                      <ExternalLink className="h-4 w-4 text-gray-400 ml-auto" />
                    </a>
                  )}
                  
                  {project.website && (
                    <a
                      href={project.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
                    >
                      <Globe className="h-5 w-5 text-gray-600 group-hover:text-gray-800" />
                      <span className="text-gray-700 group-hover:text-gray-900 font-medium">Website</span>
                      <ExternalLink className="h-4 w-4 text-gray-400 ml-auto" />
                    </a>
                  )}
                  
                  {project.demoUrl && (
                    <a
                      href={project.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl transition-colors group border border-blue-100"
                    >
                      <Play className="h-5 w-5 text-blue-600 group-hover:text-blue-700" />
                      <span className="text-blue-700 group-hover:text-blue-800 font-medium">Live Demo</span>
                      <ExternalLink className="h-4 w-4 text-blue-400 ml-auto" />
                    </a>
                  )}
                  
                  {project.documentation && (
                    <a
                      href={project.documentation}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
                    >
                      <FileText className="h-5 w-5 text-gray-600 group-hover:text-gray-800" />
                      <span className="text-gray-700 group-hover:text-gray-900 font-medium">Documentation</span>
                      <ExternalLink className="h-4 w-4 text-gray-400 ml-auto" />
                    </a>
                  )}
                </div>
              </div>
              
              {/* Social Links */}
              {(project.twitter || project.linkedin || project.discord || project.telegram) && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-blue-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <Globe2 className="h-5 w-5 text-blue-500 mr-2" />
                    Community & Social
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {project.twitter && (
                      <a
                        href={project.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group"
                      >
                        <Twitter className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-700 text-sm font-medium">Twitter</span>
                      </a>
                    )}
                    
                    {project.linkedin && (
                      <a
                        href={project.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group"
                      >
                        <Linkedin className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-700 text-sm font-medium">LinkedIn</span>
                      </a>
                    )}
                    
                    {project.discord && (
                        <a
                        href={project.discord}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-2 p-3 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors group"
                      >
                        <MessageCircle className="h-4 w-4 text-purple-600" />
                        <span className="text-purple-700 text-sm font-medium">Discord</span>
                      </a>
                    )}
                    
                    {project.telegram && (
                        <a
                        href={project.telegram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group"
                      >
                        <Send className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-700 text-sm font-medium">Telegram</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
              
              {/* Contact Information */}
              {project.contactEmail && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-blue-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <Mail className="h-5 w-5 text-blue-500 mr-2" />
                    Contact
                  </h3>
                  <a
                    href={`mailto:${project.contactEmail}`}
                    className="flex items-center space-x-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
                  >
                    <Mail className="h-5 w-5 text-gray-600 group-hover:text-gray-800" />
                    <span className="text-gray-700 group-hover:text-gray-900 font-medium">{project.contactEmail}</span>
                  </a>
                </div>
              )}
              
              {/* Team Members */}
              {project.teamMembers && project.teamMembers.filter(m => m.name).length > 0 && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-blue-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <Users className="h-5 w-5 text-blue-500 mr-2" />
                    Team Members
                  </h3>
                  
                  <div className="space-y-4">
                    {project.teamMembers
                      .filter(member => member.name)
                      .slice(0, showAllTeam ? undefined : 3)
                      .map((member, idx) => (
                        <div key={idx} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{member.name}</p>
                            <p className="text-sm text-gray-600">{member.role}</p>
                          </div>
                          {(member.linkedin || member.twitter) && (
                            <div className="flex space-x-2">
                              {member.linkedin && (
                                <a
                                  href={member.linkedin}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <Linkedin className="h-4 w-4" />
                                </a>
                              )}
                              {member.twitter && (
                                <a
                                  href={member.twitter}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <Twitter className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    
                    {project.teamMembers.filter(m => m.name).length > 3 && (
                      <button
                        onClick={() => setShowAllTeam(!showAllTeam)}
                        className="w-full text-blue-600 hover:text-blue-700 font-medium transition-colors text-center py-2"
                      >
                        {showAllTeam ? 'Show less' : `Show all ${project.teamMembers.filter(m => m.name).length} members`}
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Project Owner Actions */}
              {isConnected && address && address.toLowerCase() === project.owner?.toLowerCase() && (
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-200">
                  <h3 className="text-lg font-bold text-emerald-800 mb-4 flex items-center">
                    <Settings className="h-5 w-5 text-emerald-600 mr-2" />
                    Project Management
                  </h3>
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => navigate(`/project/edit/${project.id}`)}
                      className="w-full flex items-center justify-center space-x-2 p-3 bg-white hover:bg-gray-50 rounded-xl transition-colors border border-emerald-200"
                    >
                      <Edit className="h-4 w-4 text-emerald-600" />
                      <span className="text-emerald-700 font-medium">Edit Project</span>
                    </button>
                    
                    <button
                      onClick={() => setShowCampaignsModal(true)}
                      className="w-full flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl transition-colors"
                    >
                      <Trophy className="h-4 w-4" />
                      <span className="font-medium">Manage Campaigns</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">Share Project</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <button
                  onClick={() => handleShare('twitter')}
                  className="w-full flex items-center space-x-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group"
                >
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <Twitter className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-800">Share on Twitter</p>
                    <p className="text-sm text-gray-600">Share with your followers</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                </button>
                
                <button
                  onClick={() => handleShare('linkedin')}
                  className="w-full flex items-center space-x-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group"
                >
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <Linkedin className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-800">Share on LinkedIn</p>
                    <p className="text-sm text-gray-600">Share with professionals</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                </button>
                
                <button
                  onClick={() => handleShare('copy')}
                  className="w-full flex items-center space-x-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
                >
                  <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center">
                    <Copy className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-800">Copy Link</p>
                    <p className="text-sm text-gray-600">
                      {copiedUrl ? 'Link copied!' : 'Copy project URL'}
                    </p>
                  </div>
                  {copiedUrl && <CheckCircle className="h-4 w-4 text-green-500" />}
                </button>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-600 text-center">
                  Help {project.name} gain visibility by sharing it with your network!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Campaigns Modal */}
      <ProjectCampaignsModal
        isOpen={showCampaignsModal}
        onClose={() => setShowCampaignsModal(false)}
        projectId={project.id.toString()}
      />
    </div>
  );
}