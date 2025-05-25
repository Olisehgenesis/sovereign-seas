'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  Edit,
  Crown,
  Waves,
  Anchor,
  Ship,
  Timer,
  Eye,
  Vote,
  Coins,
  Heart,
  Activity
} from 'lucide-react';
import { useProjectDetails, useProjectCampaigns } from '@/hooks/useProjectMethods';
import { Address, formatEther } from 'viem';
import ProjectCampaignsModal from '@/components/ProjectCampaignsModal';
import { formatIpfsUrl } from '@/utils/imageUtils';

export default function ProjectView() {
  const router = useRouter();
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
    technical: false,
    campaigns: false
  });
  const [showCampaignsModal, setShowCampaignsModal] = useState(false);
  
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_V4;
  
  // Convert string id to bigint
  const projectId = id ? BigInt(id as string) : BigInt(0);
  
  // Use hooks to get project details and campaigns
  const { projectDetails, isLoading, error, refetch } = useProjectDetails(contractAddress as Address, projectId);
  const { projectCampaigns, isLoading: campaignsLoading } = useProjectCampaigns(contractAddress as Address, projectId);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  useEffect(() => {
    if (projectDetails) {
      // Process the project data
      const { project: projectData, metadata, contracts } = projectDetails;
      
      // Parse metadata
      let enhancedProject = {
        id: Number(projectData.id),
        owner: projectData.owner,
        name: projectData.name,
        description: projectData.description,
        transferrable: projectData.transferrable,
        active: projectData.active,
        createdAt: projectData.createdAt,
        campaignIds: projectData.campaignIds,
        metadata: {
          bio: metadata.bio,
          contractInfo: metadata.contractInfo,
          additionalData: metadata.additionalData
        },
        contracts: contracts
      };

      // Parse additional metadata from JSON strings
      try {
        if (metadata.contractInfo) {
          const contractInfo = JSON.parse(metadata.contractInfo);
          enhancedProject = { ...enhancedProject, ...contractInfo };
        }
      } catch (e) {
        console.warn('Failed to parse contract info:', e);
      }

      try {
        if (metadata.additionalData) {
          const additionalData = JSON.parse(metadata.additionalData);
          enhancedProject.metadata = { ...enhancedProject.metadata, ...additionalData };
        }
      } catch (e) {
        console.warn('Failed to parse additional data:', e);
      }

      setProject(enhancedProject);
    }
  }, [projectDetails]);
  
  const handleShare = async (platform) => {
    const url = window.location.href;
    const text = `Check out ${project?.name} - ${project?.metadata?.bio || project?.description}`;
    
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
    if (!value) return null;
    
    return (
      <div className="flex items-start space-x-3 py-3 border-b border-blue-100 last:border-b-0" key={label}>
        {icon && <div className="text-blue-500 mt-0.5">{icon}</div>}
        <div className="flex-1">
          <dt className="text-sm font-medium text-blue-700">{label}</dt>
          <dd className="text-gray-800 mt-1">
            {typeof value === 'string' && (value.startsWith('http') || value.startsWith('https')) ? (
              
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 flex items-center space-x-1 group"
              >
                <span className="truncate">{value}</span>
                <ExternalLink className="h-3 w-3 flex-shrink-0 group-hover:translate-x-0.5 transition-transform duration-200" />
              </a>
            ) : Array.isArray(value) ? (
              <div className="flex flex-wrap gap-1">
                {value.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full border border-blue-200"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <span>{value}</span>
            )}
          </dd>
        </div>
      </div>
    );
  };

  const getProjectLogo = (project) => {
    try {
      if (project.logo) return project.logo;
      if (project.metadata?.logo) return project.metadata.logo;
      if (project.metadata?.additionalData) {
        const additionalData = JSON.parse(project.metadata.additionalData);
        if (additionalData.logo) return additionalData.logo;
      }
    } catch (e) {
      // If JSON parsing fails, return null
    }
    return null;
  };

  const getCampaignLogo = (campaign) => {
    try {
      if (campaign.metadata?.mainInfo) {
        const mainInfo = JSON.parse(campaign.metadata.mainInfo);
        if (mainInfo.logo) return mainInfo.logo;
      }
      
      if (campaign.metadata?.additionalInfo) {
        const additionalInfo = JSON.parse(campaign.metadata.additionalInfo);
        if (additionalInfo.logo) return additionalInfo.logo;
      }
    } catch (e) {
      // If JSON parsing fails, return null
    }
    return null;
  };

  const getCampaignStatusStyling = (status) => {
    switch (status) {
      case 'active':
        return {
          bgClass: 'bg-gradient-to-r from-emerald-100 to-green-100',
          textClass: 'text-emerald-700',
          badgeClass: 'animate-pulse',
          icon: Activity,
          label: 'Live Voyage'
        };
      case 'ended':
        return {
          bgClass: 'bg-gradient-to-r from-blue-100 to-indigo-100',
          textClass: 'text-blue-700',
          badgeClass: '',
          icon: Trophy,
          label: 'Voyage Complete'
        };
      case 'upcoming':
        return {
          bgClass: 'bg-gradient-to-r from-amber-100 to-yellow-100',
          textClass: 'text-amber-700',
          badgeClass: '',
          icon: Timer,
          label: 'Preparing'
        };
      default:
        return {
          bgClass: 'bg-gray-100',
          textClass: 'text-gray-700',
          badgeClass: '',
          icon: Ship,
          label: 'Anchored'
        };
    }
  };
  
  if (!isMounted) {
    return null;
  }
  
  // Loading state with Sovereign Seas theme
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 flex items-center justify-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-gradient-to-r from-blue-400/20 to-indigo-400/20 animate-float blur-2xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-gradient-to-r from-cyan-400/20 to-blue-400/20 animate-float-delay-1 blur-2xl"></div>
        </div>
        
        <div className="glass-morphism rounded-2xl p-8 shadow-xl relative">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <Waves className="h-6 w-6 text-blue-500 absolute inset-0 m-auto animate-wave" />
            </div>
            <div className="text-center">
              <p className="text-lg text-blue-600 font-semibold">Loading Sovereign Project...</p>
              <p className="text-sm text-gray-600 animate-pulse">Charting the waters</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state or project not found
  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 flex items-center justify-center relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/5 w-40 h-40 rounded-full bg-gradient-to-r from-blue-400/10 to-indigo-400/10 animate-float blur-3xl"></div>
        </div>
        
        <div className="glass-morphism rounded-2xl p-8 shadow-xl max-w-md mx-auto text-center relative">
          <div className="text-6xl mb-6 animate-wave">🌊</div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-4">
            Project Not Found
          </h1>
          <p className="text-gray-600 text-sm mb-6">
            {error ? `Error loading project: ${error.message}` : 'This project doesn\'t exist in the Sovereign Seas.'}
          </p>
          <button
            onClick={() => router.push('/explore')}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center mx-auto group relative overflow-hidden"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
            Return to Arena
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
          </button>
        </div>
      </div>
    );
  }

  const projectLogo = getProjectLogo(project);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Enhanced animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-r from-blue-400/10 to-indigo-400/10 animate-float blur-3xl"></div>
        <div className="absolute top-1/2 right-1/5 w-80 h-80 rounded-full bg-gradient-to-r from-cyan-400/10 to-blue-400/10 animate-float-delay-1 blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-48 h-48 rounded-full bg-gradient-to-r from-indigo-400/10 to-purple-400/10 animate-float-delay-2 blur-3xl"></div>
      </div>
      
      <div className="relative z-10">
        {/* Sovereign Navigation Bar */}
        <div className="glass-morphism border-b border-blue-200/50 p-4 relative">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button
              onClick={() => router.push('/explore')}
              className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-white/80 backdrop-blur-sm rounded-full border border-blue-200 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
              Return to Sovereign Arena
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-blue-100/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
            </button>

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 glass-morphism px-3 py-2 rounded-full shadow-sm animate-float">
                <Crown className="h-3 w-3 text-yellow-500" />
                <span className="text-xs font-bold text-blue-600">Sovereign Project</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Project Header */}
        <div className="glass-morphism mx-4 mt-4 rounded-2xl shadow-xl relative overflow-hidden group hover:shadow-2xl transition-all hover:-translate-y-1 duration-500">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
          
          <div className="relative z-10 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
                {/* Enhanced Project Logo */}
                <div className="animate-float">
                  {projectLogo ? (
                    <img 
                      src={formatIpfsUrl(projectLogo)} 
                      alt={`${project.name} logo`}
                      className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border-4 border-blue-200 shadow-lg group-hover:border-blue-300 transition-colors duration-300"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={`w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg border-4 border-blue-200 group-hover:border-blue-300 transition-colors duration-300 ${projectLogo ? 'hidden' : 'flex'}`}>
                    {project.name.charAt(0)}
                  </div>
                  {project.verified && (
                    <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1">
                      <BadgeCheck className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
                
                {/* Project Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-sm font-medium rounded-full border border-blue-200">
                      <Ship className="h-3 w-3 mr-1" />
                      {project.metadata?.category || project.category || 'Sovereign Project'}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                      project.active 
                        ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      <Anchor className="h-3 w-3 mr-1" />
                      {project.active ? 'Active Voyage' : 'Anchored'}
                    </span>
                    {project.metadata?.tags?.slice(0, 2).map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-1 bg-white/80 backdrop-blur-sm text-gray-700 text-xs font-medium rounded-full border border-gray-200"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  
                  <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">
                    {project.name}
                  </h1>
                  
                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {project.metadata?.bio || project.description}
                  </p>
                  
                  {/* Project Meta Info */}
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    {project.createdAt && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Created {new Date(Number(project.createdAt) * 1000).toLocaleDateString()}</span>
                      </div>
                    )}
                    {project.location && (
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>{project.location}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Trophy className="h-4 w-4" />
                      <span>{project.campaignIds?.length || 0} Active Voyages</span>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setIsBookmarked(!isBookmarked)}
                    className={`p-3 rounded-full transition-all group ${
                      isBookmarked 
                        ? 'bg-blue-500 text-white shadow-lg' 
                        : 'bg-white/90 backdrop-blur-sm text-gray-700 hover:bg-white border border-blue-200'
                    } hover:shadow-xl hover:-translate-y-1 duration-300`}
                  >
                    <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''} group-hover:scale-110 transition-transform duration-200`} />
                  </button>
                  
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="p-3 rounded-full bg-white/90 backdrop-blur-sm text-gray-700 hover:bg-white transition-all border border-blue-200 hover:shadow-xl hover:-translate-y-1 duration-300 group"
                  >
                    <Share2 className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div className="glass-morphism rounded-2xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300 animate-float">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <Scroll className="h-5 w-5 text-blue-500 mr-2" />
                    About This Sovereign Project
                  </h2>
                  <button
                    onClick={() => toggleSection('description')}
                    className="text-blue-500 hover:text-blue-600 transition-colors p-1 rounded-full hover:bg-blue-50"
                  >
                    {expandedSections.description ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>
                
                <div className={`prose prose-blue max-w-none ${expandedSections.description ? '' : 'line-clamp-4'}`}>
                  <p className="text-gray-700 leading-relaxed">
                    {project.description}
                  </p>
                  
                  {project.innovation && expandedSections.description && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
                        <Lightbulb className="h-4 w-4 mr-2" />
                        Innovation Highlights
                      </h4>
                      <p className="text-blue-700">{project.innovation}</p>
                    </div>
                  )}
                  
                  {project.targetAudience && expandedSections.description && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
                      <h4 className="font-semibold text-emerald-800 mb-2 flex items-center">
                        <Target className="h-4 w-4 mr-2" />
                        Target Audience
                      </h4>
                      <p className="text-emerald-700">{project.targetAudience}</p>
                    </div>
                  )}
                </div>
                
                {!expandedSections.description && (
                  <button
                    onClick={() => toggleSection('description')}
                    className="mt-4 text-blue-600 hover:text-blue-700 font-medium transition-colors group flex items-center"
                  >
                    Read more
                    <ChevronDown className="h-4 w-4 ml-1 group-hover:translate-y-0.5 transition-transform duration-200" />
                  </button>
                )}
              </div>

              {/* Active Campaigns Section */}
              {projectCampaigns && projectCampaigns.length > 0 && (
                <div className="glass-morphism rounded-2xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300 animate-float-delay-1">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                      <Trophy className="h-5 w-5 text-blue-500 mr-2 animate-wave" />
                      Active Sovereign Voyages
                    </h2>
                    <span className="text-sm font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                      {projectCampaigns.length} voyage{projectCampaigns.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    {projectCampaigns.slice(0, expandedSections.campaigns ? undefined : 3).map((campaign, index) => {
                      const styling = getCampaignStatusStyling(campaign.status);
                      const campaignLogo = getCampaignLogo(campaign);
                      
                      return (
                        <div
                          key={campaign.id.toString()}
                          className="group glass-morphism rounded-xl p-4 border border-blue-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          {/* Campaign Status Badge */}
                          <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-bold flex items-center space-x-1 ${styling.bgClass} ${styling.textClass} ${styling.badgeClass}`}>
                            <styling.icon className="h-3 w-3" />
                            <span>{styling.label}</span>
                          </div>

                          <div className="flex items-start space-x-4 pr-20">
                            {/* Campaign Logo */}
                            <div className="animate-float-delay-1">
                              {campaignLogo ? (
                                <img 
                                  src={formatIpfsUrl(campaignLogo)} 
                                  alt={`${campaign.name} logo`}
                                  className="w-12 h-12 rounded-lg object-cover border-2 border-blue-200 shadow-md group-hover:border-blue-300 transition-colors duration-300"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div className={`w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-lg font-bold shadow-md border-2 border-blue-200 group-hover:border-blue-300 transition-colors duration-300 ${campaignLogo ? 'hidden' : 'flex'}`}>
                                {campaign.name.charAt(0)}
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-gray-800 text-lg mb-1 group-hover:text-blue-600 transition-colors duration-300">
                                {campaign.name}
                              </h3>
                              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{campaign.description}</p>
                              
                              {/* Campaign Stats */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                <div className="flex items-center space-x-1">
                                  <Coins className="h-3 w-3 text-emerald-500" />
                                  <span className="text-gray-600">Treasury:</span>
                                  <span className="font-bold text-emerald-600">{parseFloat(formatEther(campaign.totalFunds)).toFixed(1)}</span>
                                </div>
                                
                                <div className="flex items-center space-x-1">
                                  <Vote className="h-3 w-3 text-blue-500" />
                                  <span className="text-gray-600">Your Votes:</span>
                                  <span className="font-bold text-blue-600">{parseFloat(formatEther(campaign.participation?.voteCount || 0n)).toFixed(1)}</span>
                                </div>
                                
                                <div className="flex items-center space-x-1">
                                  <Trophy className="h-3 w-3 text-amber-500" />
                                  <span className="text-gray-600">Max Winners:</span>
                                  <span className="font-bold text-amber-600">{Number(campaign.maxWinners) || 'All'}</span>
                                </div>
                                
                                <div className="flex items-center space-x-1">
                                  <Heart className="h-3 w-3 text-red-500" />
                                  <span className="text-gray-600">Status:</span>
                                  <span className={`font-bold ${styling.textClass}`}>
                                    {campaign.participation?.approved ? 'Approved' : 'Pending'}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex space-x-2 mt-4">
                                <button
                                  onClick={() => router.push(`/explore/campaign/${campaign.id}`)}
                                  className="px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center space-x-1 group/btn"
                                >
                                  <Eye className="h-3 w-3 group-hover/btn:scale-110 transition-transform duration-300" />
                                  <span>View Voyage</span>
                                </button>
                                
                                {campaign.status === 'active' && (
                                  <button
                                    onClick={() => router.push(`/explore/campaign/${campaign.id}`)}
                                    className="px-3 py-1.5 rounded-full bg-white text-blue-600 border border-blue-200 text-sm font-medium hover:bg-blue-50 hover:-translate-y-0.5 transition-all duration-300 flex items-center space-x-1"
                                  >
                                    <Sparkles className="h-3 w-3" />
                                    <span>Cast Vote</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {projectCampaigns.length > 3 && (
                    <button
                      onClick={() => toggleSection('campaigns')}
                      className="w-full mt-4 text-blue-600 hover:text-blue-700 font-medium transition-colors py-2 flex items-center justify-center group"
                    >
                      {expandedSections.campaigns ? 'Show less' : `Show all ${projectCampaigns.length} voyages`}
                      <ChevronDown className={`h-4 w-4 ml-1 transition-transform duration-200 ${expandedSections.campaigns ? 'rotate-180' : ''} group-hover:translate-y-0.5`} />
                    </button>
                  )}
                </div>
              )}

              {/* Demo Video/Media */}
              {project.demoVideo && (
                <div className="glass-morphism rounded-2xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300 animate-float-delay-2">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <Video className="h-5 w-5 text-blue-500 mr-2" />
                    Project Demonstration
                  </h2>
                  
                  <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden">
                    <video
                      src={project.demoVideo}
                      className="w-full h-full object-cover"
                      controls
                      poster={project.coverImage}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </div>
              )}
              
               {/* Key Features */}
              {project.metadata?.keyFeatures && (
                <div className="glass-morphism rounded-2xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <Star className="h-5 w-5 text-blue-500 mr-2" />
                    Sovereign Features
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {project.metadata.keyFeatures.slice(0, showAllFeatures ? undefined : 6).map((feature, idx) => (
                      <div key={idx} className="flex items-start space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 group hover:shadow-md transition-all duration-300">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0 group-hover:scale-125 transition-transform duration-300"></div>
                        <span className="text-gray-700 group-hover:text-blue-700 transition-colors duration-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  {project.metadata.keyFeatures.length > 6 && (
                    <button
                      onClick={() => setShowAllFeatures(!showAllFeatures)}
                      className="mt-4 text-blue-600 hover:text-blue-700 font-medium transition-colors group flex items-center"
                    >
                      {showAllFeatures ? 'Show less' : `Show all ${project.metadata.keyFeatures.length} features`}
                      <ChevronDown className={`h-4 w-4 ml-1 transition-transform duration-200 ${showAllFeatures ? 'rotate-180' : ''} group-hover:translate-y-0.5`} />
                    </button>
                  )}
                </div>
              )}
              
              {/* Technical Details */}
              <div className="glass-morphism rounded-2xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <Code className="h-5 w-5 text-blue-500 mr-2" />
                    Technical Specifications
                  </h2>
                  <button
                    onClick={() => toggleSection('technical')}
                    className="text-blue-500 hover:text-blue-600 transition-colors p-1 rounded-full hover:bg-blue-50"
                  >
                    {expandedSections.technical ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>
                
                <div className="space-y-1">
                  {renderMetadataField('Blockchain Network', project.blockchain, <Zap className="h-4 w-4" />)}
                  {renderMetadataField('Development Stage', project.developmentStage, <Award className="h-4 w-4" />)}
                  {renderMetadataField('License', project.license, <Shield className="h-4 w-4" />)}
                  {renderMetadataField('Open Source', project.openSource ? 'Yes' : 'No', <Github className="h-4 w-4" />)}
                  
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
            <div className="space-y-4">
              {/* Project Stats */}
              <div className="glass-morphism rounded-2xl p-4 shadow-lg border border-blue-100 animate-float">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 text-blue-500 mr-2" />
                  Sovereign Stats
                </h3>
                
                <div className="space-y-3">
                  {project.establishedDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        Established
                      </span>
                      <span className="font-semibold text-gray-800">
                        {new Date(project.establishedDate).getFullYear()}
                      </span>
                    </div>
                  )}
                  {project.location && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        Location
                      </span>
                      <span className="font-semibold text-gray-800">{project.location}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center">
                      <Ship className="h-3 w-3 mr-1" />
                      Status
                    </span>
                    <span className={`font-semibold ${project.active ? 'text-emerald-600' : 'text-gray-500'}`}>
                      {project.active ? 'Active Voyage' : 'Anchored'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center">
                      <Trophy className="h-3 w-3 mr-1" />
                      Voyages
                    </span>
                    <span className="font-semibold text-blue-600">{project.campaignIds?.length || 0}</span>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="glass-morphism rounded-2xl p-4 shadow-lg border border-blue-100 animate-float-delay-1">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <LinkIcon className="h-5 w-5 text-blue-500 mr-2" />
                  Navigation Links
                </h3>
                
                <div className="space-y-2">
                  {project.githubRepo && (
                    
                      href={project.githubRepo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-3 bg-gradient-to-r from-gray-50 to-blue-50 hover:from-gray-100 hover:to-blue-100 rounded-xl transition-all duration-300 group border border-gray-200 hover:border-blue-300"
                    >
                      <Github className="h-4 w-4 text-gray-600 group-hover:text-gray-800" />
                      <span className="text-gray-700 group-hover:text-gray-900 font-medium flex-1">Repository</span>
                      <ExternalLink className="h-3 w-3 text-gray-400 group-hover:translate-x-0.5 transition-transform duration-200" />
                    </a>
                  )}
                  
                  {project.website && (
                    
                      href={project.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-3 bg-gradient-to-r from-gray-50 to-blue-50 hover:from-gray-100 hover:to-blue-100 rounded-xl transition-all duration-300 group border border-gray-200 hover:border-blue-300"
                    >
                      <Globe className="h-4 w-4 text-gray-600 group-hover:text-gray-800" />
                      <span className="text-gray-700 group-hover:text-gray-900 font-medium flex-1">Website</span>
                      <ExternalLink className="h-3 w-3 text-gray-400 group-hover:translate-x-0.5 transition-transform duration-200" />
                    </a>
                  )}
                  
                  {project.demoUrl && (
                    
                      href={project.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl transition-all duration-300 group border border-blue-200 hover:border-indigo-300"
                    >
                      <Play className="h-4 w-4 text-blue-600 group-hover:text-blue-700" />
                      <span className="text-blue-700 group-hover:text-blue-800 font-medium flex-1">Live Demo</span>
                      <ExternalLink className="h-3 w-3 text-blue-400 group-hover:translate-x-0.5 transition-transform duration-200" />
                    </a>
                  )}
                  
                  {project.documentation && (
                    
                      href={project.documentation}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-3 bg-gradient-to-r from-gray-50 to-blue-50 hover:from-gray-100 hover:to-blue-100 rounded-xl transition-all duration-300 group border border-gray-200 hover:border-blue-300"
                    >
                      <FileText className="h-4 w-4 text-gray-600 group-hover:text-gray-800" />
                      <span className="text-gray-700 group-hover:text-gray-900 font-medium flex-1">Documentation</span>
                      <ExternalLink className="h-3 w-3 text-gray-400 group-hover:translate-x-0.5 transition-transform duration-200" />
                    </a>
                  )}
                </div>
              </div>
              
              {/* Social Links */}
              {(project.twitter || project.linkedin || project.discord || project.telegram) && (
                <div className="glass-morphism rounded-2xl p-4 shadow-lg border border-blue-100 animate-float-delay-2">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <Globe2 className="h-5 w-5 text-blue-500 mr-2" />
                    Community Waters
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {project.twitter && (
                      
                        href={project.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 rounded-xl transition-all duration-300 group border border-blue-200"
                      >
                        <Twitter className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-700 text-sm font-medium">Twitter</span>
                      </a>
                    )}
                    
                    {project.linkedin && (
                      
                        href={project.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl transition-all duration-300 group border border-blue-200"
                      >
                        <Linkedin className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-700 text-sm font-medium">LinkedIn</span>
                      </a>
                    )}
                    
                    {project.discord && (
                      
                        href={project.discord}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 rounded-xl transition-all duration-300 group border border-purple-200"
                      >
                        <MessageCircle className="h-4 w-4 text-purple-600" />
                        <span className="text-purple-700 text-sm font-medium">Discord</span>
                      </a>
                    )}
                    
                    {project.telegram && (
                      
                        href={project.telegram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 rounded-xl transition-all duration-300 group border border-blue-200"
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
                <div className="glass-morphism rounded-2xl p-4 shadow-lg border border-blue-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                    <Mail className="h-5 w-5 text-blue-500 mr-2" />
                    Contact Harbor
                  </h3>
                  
                    href={`mailto:${project.contactEmail}`}
                    className="flex items-center space-x-3 p-3 bg-gradient-to-r from-gray-50 to-blue-50 hover:from-gray-100 hover:to-blue-100 rounded-xl transition-all duration-300 group border border-gray-200 hover:border-blue-300"
                  >
                    <Mail className="h-4 w-4 text-gray-600 group-hover:text-gray-800" />
                    <span className="text-gray-700 group-hover:text-gray-900 font-medium flex-1">{project.contactEmail}</span>
                  </a>
                </div>
              )}
              
              {/* Team Members */}
              {project.teamMembers && project.teamMembers.filter(m => m.name).length > 0 && (
                <div className="glass-morphism rounded-2xl p-4 shadow-lg border border-blue-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                    <Users className="h-5 w-5 text-blue-500 mr-2" />
                    Crew Members
                  </h3>
                  
                  <div className="space-y-3">
                    {project.teamMembers
                      .filter(member => member.name)
                      .slice(0, showAllTeam ? undefined : 3)
                      .map((member, idx) => (
                        <div key={idx} className="flex items-center space-x-3 p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200 group hover:shadow-md transition-all duration-300">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800 group-hover:text-blue-700 transition-colors duration-300">{member.name}</p>
                            <p className="text-sm text-gray-600">{member.role}</p>
                          </div>
                          {(member.linkedin || member.twitter) && (
                            <div className="flex space-x-2">
                              {member.linkedin && (
                                
                                  href={member.linkedin}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 transition-colors duration-200"
                                >
                                  <Linkedin className="h-4 w-4" />
                                </a>
                              )}
                              {member.twitter && (
                                
                                  href={member.twitter}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 transition-colors duration-200"
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
                        className="w-full text-blue-600 hover:text-blue-700 font-medium transition-colors text-center py-2 group flex items-center justify-center"
                      >
                        {showAllTeam ? 'Show less' : `Show all ${project.teamMembers.filter(m => m.name).length} members`}
                        <ChevronDown className={`h-4 w-4 ml-1 transition-transform duration-200 ${showAllTeam ? 'rotate-180' : ''} group-hover:translate-y-0.5`} />
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Project Owner Actions */}
              {isConnected && address && address.toLowerCase() === project.owner?.toLowerCase() && (
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-4 border border-emerald-200 shadow-lg">
                  <h3 className="text-lg font-bold text-emerald-800 mb-3 flex items-center">
                    <Crown className="h-5 w-5 text-emerald-600 mr-2" />
                    Captain's Control
                  </h3>
                  
                  <div className="space-y-2">
                    <button
                      onClick={() => router.push(`/project/edit/${project.id}`)}
                      className="w-full flex items-center justify-center space-x-2 p-3 bg-white hover:bg-gray-50 rounded-xl transition-colors border border-emerald-200 group"
                    >
                      <Edit className="h-4 w-4 text-emerald-600 group-hover:rotate-12 transition-transform duration-300" />
                      <span className="text-emerald-700 font-medium">Edit Project</span>
                    </button>
                    
                    <button
                      onClick={() => setShowCampaignsModal(true)}
                      className="w-full flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl transition-all duration-300 group relative overflow-hidden"
                    >
                      <Trophy className="h-4 w-4 group-hover:rotate-12 transition-transform duration-300" />
                      <span className="font-medium">Manage Voyages</span>
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Enhanced Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-gradient-to-br from-blue-900/50 via-indigo-900/50 to-purple-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-md">
            {/* Animated background waves */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-r from-blue-400/10 to-cyan-400/10 animate-pulse blur-3xl"></div>
              <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-gradient-to-r from-indigo-400/10 to-blue-400/10 animate-pulse blur-3xl"></div>
            </div>

            <div className="bg-white/95 backdrop-blur-xl rounded-2xl w-full max-w-md shadow-2xl border border-blue-200/50 relative">
              {/* Decorative top border */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500"></div>
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center">
                    <Share2 className="h-5 w-5 text-blue-500 mr-2" />
                    Share Sovereign Project
                  </h3>
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={() => handleShare('twitter')}
                    className="w-full flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 rounded-xl transition-all duration-300 group border border-blue-200"
                  >
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                      <Twitter className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-800">Share on Twitter</p>
                      <p className="text-sm text-gray-600">Spread the word to your fleet</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all duration-200" />
                  </button>
                  
                  <button
                    onClick={() => handleShare('linkedin')}
                    className="w-full flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl transition-all duration-300 group border border-blue-200"
                  >
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                      <Linkedin className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-800">Share on LinkedIn</p>
                      <p className="text-sm text-gray-600">Connect with professionals</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all duration-200" />
                  </button>
                  
                  <button
                    onClick={() => handleShare('copy')}
                    className="w-full flex items-center space-x-3 p-4 bg-gradient-to-r from-gray-50 to-blue-50 hover:from-gray-100 hover:to-blue-100 rounded-xl transition-all duration-300 group border border-gray-200"
                  >
                    <div className="w-10 h-10 bg-gradient-to-r from-gray-500 to-blue-500 rounded-full flex items-center justify-center">
                      <Copy className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-800">Copy Navigation Link</p>
                      <p className="text-sm text-gray-600">
                        {copiedUrl ? 'Link copied to harbor!' : 'Copy project coordinates'}
                      </p>
                    </div>
                    {copiedUrl && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                  </button>
                </div>

                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <div className="flex items-center space-x-2 text-center w-full justify-center">
                    <Waves className="h-4 w-4 text-blue-500 animate-wave" />
                    <p className="text-xs text-blue-600 font-medium">
                      Help {project.name} gain visibility across the Sovereign Seas!
                    </p>
                    <Sparkles className="h-4 w-4 text-blue-500 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      <ProjectCampaignsModal
        isOpen={showCampaignsModal}
        onClose={() => setShowCampaignsModal(false)}
        projectId={project.id.toString()}
      />
  );
}