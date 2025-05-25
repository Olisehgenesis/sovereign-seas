'use client';

import { useState, useEffect } from 'react';
import {  useNavigate, useParams } from 'react-router-dom';
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
  Building2,
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
  Activity,
  Scroll,
  Plus,
  BarChart3,
  Gauge,
  Clock,
  Users2,
  Rocket,
  Search,
  Filter,
  SortDesc,
  Grid3X3,
  List,
  TrendingUpIcon,
  DollarSign,
  PieChart,
  LineChart,
  Camera,
  Upload,
  Download,
  AlertCircle,
  Info,
  Verified,
  Lock,
  Unlock,
  Network,
  Database,
  Server,
  Cloud,
  Tag,
  Hash,
  ArrowRight,
  ArrowUpRight,
  Check,
  Minus,
  Wallet,
  ChevronRight,
  Layers,
  Box,
  Package,
  Binary,
  Cpu,
  HardDrive
} from 'lucide-react';
import { useProjectDetails, useProjectCampaigns } from '@/hooks/useProjectMethods';
import { Address, formatEther } from 'viem';
import ProjectCampaignsModal from '@/components/ProjectCampaignsModal';
import { formatIpfsUrl } from '@/utils/imageUtils';

export default function ProjectView() {
  const { id } = useParams();
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  
  // Project data state
  const [project, setProject] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  // UI State
  const [activeTab, setActiveTab] = useState('overview');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showCampaignsModal, setShowCampaignsModal] = useState(false);
  
  const contractAddress = import.meta.env.VITE_CONTRACT_V4;
  const projectId = id ? BigInt(id as string) : BigInt(0);
  
  // Use hooks to get project details and campaigns
  const { projectDetails, isLoading, error, refetch } = useProjectDetails(contractAddress as Address, projectId);
  const { projectCampaigns, isLoading: campaignsLoading } = useProjectCampaigns(contractAddress as Address, projectId);
  
  // Helper function to safely parse JSON
  const safeJsonParse = (jsonString, fallback = {}) => {
    try {
      return jsonString ? JSON.parse(jsonString) : fallback;
    } catch (e) {
      console.warn('Failed to parse JSON:', e);
      return fallback;
    }
  };

  useEffect(() => {
    if (projectDetails) {
      const { project: projectData, metadata, contracts } = projectDetails;
      
      // Parse the metadata JSON strings
      const bioData = safeJsonParse(metadata.bio);
      const contractInfo = safeJsonParse(metadata.contractInfo);
      const additionalData = safeJsonParse(metadata.additionalData);
      
      // Create enhanced project object with properly structured data
      const enhancedProject = {
        // Basic project data from contract
        id: Number(projectData.id),
        owner: projectData.owner,
        name: projectData.name,
        description: projectData.description,
        transferrable: projectData.transferrable,
        active: projectData.active,
        createdAt: projectData.createdAt,
        campaignIds: projectData.campaignIds,
        contracts: contracts,
        
        // Parsed metadata from bio (basic project info)
        tagline: bioData.tagline || '',
        category: bioData.category || '',
        tags: bioData.tags || [],
        location: bioData.location || '',
        establishedDate: bioData.establishedDate || '',
        website: bioData.website || '',
        projectType: bioData.projectType || '',
        maturityLevel: bioData.maturityLevel || '',
        status: bioData.status || 'active',
        openSource: bioData.openSource !== undefined ? bioData.openSource : true,
        
        // Parsed metadata from contractInfo (technical details)
        blockchain: contractInfo.blockchain || '',
        smartContracts: contractInfo.smartContracts || [],
        techStack: contractInfo.techStack || [],
        license: contractInfo.license || '',
        developmentStage: contractInfo.developmentStage || '',
        auditReports: contractInfo.auditReports || [],
        kycCompliant: contractInfo.kycCompliant || false,
        regulatoryCompliance: contractInfo.regulatoryCompliance || [],
        
        // Parsed metadata from additionalData (everything else)
        // Media
        logo: additionalData.media?.logo || additionalData.logo || '',
        demoVideo: additionalData.media?.demoVideo || additionalData.demoVideo || '',
        coverImage: additionalData.media?.coverImage || '',
        
        // Links
        demoUrl: additionalData.links?.demoUrl || additionalData.demoUrl || '',
        githubRepo: additionalData.links?.githubRepo || additionalData.githubRepo || '',
        documentation: additionalData.links?.documentation || additionalData.documentation || '',
        karmaGapProfile: additionalData.links?.karmaGapProfile || additionalData.karmaGapProfile || '',
        
        // Social Media (check both nested and flat structure)
        twitter: additionalData.links?.twitter || additionalData.social?.twitter || additionalData.twitter || '',
        linkedin: additionalData.links?.linkedin || additionalData.social?.linkedin || additionalData.linkedin || '',
        discord: additionalData.links?.discord || additionalData.social?.discord || additionalData.discord || '',
        telegram: additionalData.links?.telegram || additionalData.social?.telegram || additionalData.telegram || '',
        youtube: additionalData.links?.youtube || additionalData.social?.youtube || additionalData.youtube || '',
        instagram: additionalData.links?.instagram || additionalData.social?.instagram || additionalData.instagram || '',
        
        // Team & Contact
        teamMembers: additionalData.teamMembers || [],
        contactEmail: additionalData.contactEmail || '',
        businessEmail: additionalData.businessEmail || '',
        phone: additionalData.phone || '',
        
        // Features & Innovation
        keyFeatures: additionalData.keyFeatures || [],
        innovation: additionalData.innovation || '',
        useCases: additionalData.useCases || [],
        targetAudience: additionalData.targetAudience || '',
        
        // Milestones & Metrics
        milestones: additionalData.milestones || [],
        launchDate: additionalData.launchDate || '',
        userCount: additionalData.userCount || '',
        transactionVolume: additionalData.transactionVolume || '',
        tvl: additionalData.tvl || '',
        
        // Raw metadata for debugging
        metadata: {
          bio: metadata.bio,
          contractInfo: metadata.contractInfo,
          additionalData: metadata.additionalData
        }
      };

      console.log('Enhanced Project:', enhancedProject); // Debug log
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

  const getCampaignStatusStyling = (status) => {
    switch (status) {
      case 'active':
        return {
          bgClass: 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200',
          textClass: 'text-emerald-700',
          badgeClass: 'bg-emerald-500',
          icon: Activity,
          label: 'Active'
        };
      case 'ended':
        return {
          bgClass: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200',
          textClass: 'text-blue-700',
          badgeClass: 'bg-blue-500',
          icon: Trophy,
          label: 'Completed'
        };
      case 'upcoming':
        return {
          bgClass: 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200',
          textClass: 'text-amber-700',
          badgeClass: 'bg-amber-500',
          icon: Timer,
          label: 'Upcoming'
        };
      default:
        return {
          bgClass: 'bg-gray-50 border-gray-200',
          textClass: 'text-gray-700',
          badgeClass: 'bg-gray-500',
          icon: Ship,
          label: 'Inactive'
        };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <Rocket className="h-8 w-8 text-blue-600 absolute inset-0 m-auto animate-pulse" />
          </div>
          <p className="text-xl text-gray-700 font-semibold">Loading Project...</p>
          <p className="text-gray-500 mt-2">Fetching project details</p>
        </div>
      </div>
    );
  }
  
  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-6">🚀</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Project Not Found</h1>
          <p className="text-gray-600 mb-8">
            {error ? `Error: ${error.message}` : 'This project doesn\'t exist or has been removed.'}
          </p>
          <button
            onClick={() => navigate('/explore')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center mx-auto"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'campaigns', label: 'Campaigns', icon: Trophy, badge: project.campaignIds?.length || 0 },
    { id: 'technical', label: 'Technical', icon: Code },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/explore')}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </button>

            <div className="flex items-center space-x-3">
              {/* Status Badge */}
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${project.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                {project.active ? '🟢 Active' : '⚪ Inactive'}
              </div>

              {/* Action Buttons */}
              <button
                onClick={() => setIsBookmarked(!isBookmarked)}
                className={`p-2 rounded-lg transition-colors ${
                  isBookmarked 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>
              
              <button
                onClick={() => setShowShareModal(true)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Project Header */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-8 mb-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            {/* Project Logo & Basic Info */}
            <div className="flex items-center gap-6">
              <div className="relative">
                {project.logo ? (
                  <img 
                    src={formatIpfsUrl(project.logo)} 
                    alt={`${project.name} logo`}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-gray-200 shadow-sm"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-sm border-2 border-gray-200 ${project.logo ? 'hidden' : 'flex'}`}>
                  {project.name?.charAt(0) || 'P'}
                </div>
                {project.verified && (
                  <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-1">
                    <BadgeCheck className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                  {project.category && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {project.category}
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-lg mb-3 max-w-2xl">
                  {project.tagline || project.description}
                </p>
                
                {/* Project Meta */}
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  {project.createdAt && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Created {new Date(Number(project.createdAt) * 1000).toLocaleDateString()}</span>
                    </div>
                  )}
                  {project.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{project.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Trophy className="h-4 w-4" />
                    <span>{project.campaignIds?.length || 0} Campaigns</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tags */}
            {project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 lg:ml-auto">
                {project.tags.slice(0, 4).map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
                {project.tags.length > 4 && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                    +{project.tags.length - 4} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 mb-8">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Description */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    About This Project
                  </h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">{project.description}</p>
                  </div>
                  
                  {project.innovation && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        Innovation Highlights
                      </h4>
                      <p className="text-blue-800">{project.innovation}</p>
                    </div>
                  )}
                  
                  {project.targetAudience && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-100">
                      <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Target Audience
                      </h4>
                      <p className="text-green-800">{project.targetAudience}</p>
                    </div>
                  )}
                </div>

                {/* Key Features */}
                {project.keyFeatures && project.keyFeatures.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Star className="h-5 w-5 text-blue-600" />
                      Key Features
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {project.keyFeatures.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Demo Video */}
                {project.demoVideo && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Video className="h-5 w-5 text-blue-600" />
                      Project Demo
                    </h2>
                    <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                      
                        <a  href={project.demoVideo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Play className="h-5 w-5" />
                        Watch Demo
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'campaigns' && (
              <div className="space-y-6">
                {projectCampaigns && projectCampaigns.length > 0 ? (
                  <>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-blue-600" />
                          Active Campaigns
                        </h2>
                        <span className="text-sm text-gray-500">
                          {projectCampaigns.length} campaign{projectCampaigns.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      <div className="space-y-4">
                        {projectCampaigns.map((campaign, index) => {
                          const styling = getCampaignStatusStyling(campaign.status);
                          
                          return (
                            <div
                              key={campaign.id.toString()}
                              className={`p-4 rounded-lg border ${styling.bgClass} hover:shadow-md transition-all duration-200`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-gray-900 mb-1">{campaign.name}</h3>
                                  <p className="text-sm text-gray-600 mb-3">{campaign.description}</p>
                                </div>
                                <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${styling.textClass}`}>
                                  <div className={`w-2 h-2 rounded-full ${styling.badgeClass}`}></div>
                                  {styling.label}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Total Funds:</span>
                                  <p className="font-semibold text-green-600">
                                    {parseFloat(formatEther(campaign.totalFunds)).toFixed(2)} CELO
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Your Votes:</span>
                                  <p className="font-semibold text-blue-600">
                                    {parseFloat(formatEther(campaign.participation?.voteCount || 0n)).toFixed(1)}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Max Winners:</span>
                                  <p className="font-semibold text-purple-600">
                                    {Number(campaign.maxWinners) || 'All'}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Status:</span>
                                  <p className={`font-semibold ${
                                    campaign.participation?.approved ? 'text-green-600' : 'text-amber-600'
                                  }`}>
                                    {campaign.participation?.approved ? 'Approved' : 'Pending'}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex gap-2 mt-4">
                                <button
                                  onClick={() => navigate(`/campaigns/${campaign.id}`)}
                                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                                >
                                  <Eye className="h-3 w-3" />
                                  View Campaign
                                </button>
                                {campaign.status === 'active' && (
                                  <button
                                    onClick={() => navigate(`/campaigns/${campaign.id}`)}
                                    className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                                  >
                                    <Vote className="h-3 w-3" />
                                    Vote
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-8 text-center">
                    <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Campaigns</h3>
                    <p className="text-gray-600">This project hasn't joined any campaigns yet.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'technical' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <Code className="h-5 w-5 text-blue-600" />
                    Technical Specifications
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {project.blockchain && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Network className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-gray-900">Blockchain</span>
                        </div>
                        <p className="text-gray-700">{project.blockchain}</p>
                      </div>
                    )}
                    
                    {project.developmentStage && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Gauge className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-gray-900">Development Stage</span>
                       </div>
                       <p className="text-gray-700">{project.developmentStage}</p>
                     </div>
                   )}
                   
                   {project.license && (
                     <div className="p-4 bg-gray-50 rounded-lg">
                       <div className="flex items-center gap-2 mb-2">
                         <Shield className="h-4 w-4 text-purple-600" />
                         <span className="font-medium text-gray-900">License</span>
                       </div>
                       <p className="text-gray-700">{project.license}</p>
                     </div>
                   )}
                   
                   <div className="p-4 bg-gray-50 rounded-lg">
                     <div className="flex items-center gap-2 mb-2">
                       <Heart className="h-4 w-4 text-red-600" />
                       <span className="font-medium text-gray-900">Open Source</span>
                     </div>
                     <p className="text-gray-700">{project.openSource ? 'Yes' : 'No'}</p>
                   </div>
                 </div>
                 
                 {/* Tech Stack */}
                 {project.techStack && project.techStack.length > 0 && (
                   <div className="mt-6">
                     <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                       <Code className="h-4 w-4 text-blue-600" />
                       Technology Stack
                     </h3>
                     <div className="flex flex-wrap gap-2">
                       {project.techStack.map((tech, idx) => (
                         <span
                           key={idx}
                           className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                         >
                           {tech}
                         </span>
                       ))}
                     </div>
                   </div>
                 )}
                 
                 {/* Smart Contracts */}
                 {project.smartContracts && project.smartContracts.length > 0 && (
                   <div className="mt-6">
                     <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                       <Terminal className="h-4 w-4 text-green-600" />
                       Smart Contracts
                     </h3>
                     <div className="space-y-2">
                       {project.smartContracts.map((contract, idx) => (
                         <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg font-mono text-sm">
                           <Terminal className="h-4 w-4 text-gray-500 flex-shrink-0" />
                           <span className="text-gray-700 break-all">{contract}</span>
                           <button
                             onClick={() => navigator.clipboard.writeText(contract)}
                             className="ml-auto p-1 hover:bg-gray-200 rounded transition-colors"
                           >
                             <Copy className="h-3 w-3 text-gray-500" />
                           </button>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 {/* Additional contracts from blockchain */}
                 {project.contracts && project.contracts.length > 0 && (
                   <div className="mt-6">
                     <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                       <Database className="h-4 w-4 text-indigo-600" />
                       Registered Contracts
                     </h3>
                     <div className="space-y-2">
                       {project.contracts.map((contract, idx) => (
                         <div key={idx} className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg font-mono text-sm border border-indigo-100">
                           <Database className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                           <span className="text-indigo-700 break-all">{contract}</span>
                           <button
                             onClick={() => navigator.clipboard.writeText(contract)}
                             className="ml-auto p-1 hover:bg-indigo-200 rounded transition-colors"
                           >
                             <Copy className="h-3 w-3 text-indigo-500" />
                           </button>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
               </div>
             </div>
           )}

           {activeTab === 'team' && (
             <div className="space-y-6">
               <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-6">
                 <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                   <Users className="h-5 w-5 text-blue-600" />
                   Team Members
                 </h2>
                 
                 {project.teamMembers && project.teamMembers.length > 0 ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {project.teamMembers.map((member, idx) => (
                       <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                         <div className="flex items-start gap-3">
                           <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                             <User className="h-6 w-6 text-white" />
                           </div>
                           <div className="flex-1 min-w-0">
                             <h3 className="font-semibold text-gray-900 truncate">{member.name}</h3>
                             <p className="text-sm text-gray-600 mb-3">{member.role}</p>
                             <div className="flex gap-2">
                               {member.linkedin && (
                                 
                                   <a  href={member.linkedin}
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   className="text-blue-600 hover:text-blue-700 transition-colors"
                                   title="LinkedIn Profile"
                                 >
                                   <Linkedin className="h-4 w-4" />
                                 </a>
                               )}
                               {member.twitter && (
                                 
                                  <a  href={member.twitter}
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   className="text-blue-400 hover:text-blue-500 transition-colors"
                                   title="Twitter Profile"
                                 >
                                   <Twitter className="h-4 w-4" />
                                 </a>
                               )}
                               {member.email && (
                                 
                                   <a  href={`mailto:${member.email}`}
                                   className="text-gray-600 hover:text-gray-700 transition-colors"
                                   title={`Email ${member.name}`}
                                 >
                                   <Mail className="h-4 w-4" />
                                 </a>
                               )}
                             </div>
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="text-center py-8">
                     <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                     <p className="text-gray-600">No team information available</p>
                   </div>
                 )}
               </div>
             </div>
           )}

           {activeTab === 'analytics' && (
             <div className="space-y-6">
               <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-6">
                 <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                   <BarChart3 className="h-5 w-5 text-blue-600" />
                   Project Analytics
                 </h2>
                 
                 {/* Analytics Cards */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                   <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                     <div className="flex items-center gap-2 mb-2">
                       <Trophy className="h-5 w-5 text-blue-600" />
                       <span className="font-medium text-blue-900">Total Campaigns</span>
                     </div>
                     <p className="text-2xl font-bold text-blue-600">{project.campaignIds?.length || 0}</p>
                   </div>
                   
                   <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                     <div className="flex items-center gap-2 mb-2">
                       <Coins className="h-5 w-5 text-green-600" />
                       <span className="font-medium text-green-900">Total Funds</span>
                     </div>
                     <p className="text-2xl font-bold text-green-600">
                       {projectCampaigns ? 
                         projectCampaigns.reduce((sum, campaign) => 
                           sum + parseFloat(formatEther(campaign.totalFunds || 0n)), 0
                         ).toFixed(2) 
                         : '0.00'
                       } CELO
                     </p>
                   </div>
                   
                   <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                     <div className="flex items-center gap-2 mb-2">
                       <Vote className="h-5 w-5 text-purple-600" />
                       <span className="font-medium text-purple-900">Total Votes</span>
                     </div>
                     <p className="text-2xl font-bold text-purple-600">
                       {projectCampaigns ? 
                         projectCampaigns.reduce((sum, campaign) => 
                           sum + parseFloat(formatEther(campaign.participation?.voteCount || 0n)), 0
                         ).toFixed(1)
                         : '0.0'
                       }
                     </p>
                   </div>
                 </div>
                 
                 {/* Campaign Performance */}
                 {projectCampaigns && projectCampaigns.length > 0 && (
                   <div>
                     <h3 className="font-medium text-gray-900 mb-4">Campaign Performance</h3>
                     <div className="space-y-3">
                       {projectCampaigns.map((campaign, idx) => (
                         <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                           <div className="flex-1">
                             <p className="font-medium text-gray-900">{campaign.name}</p>
                             <p className="text-sm text-gray-600 capitalize">{campaign.status}</p>
                           </div>
                           <div className="text-right">
                             <p className="font-semibold text-green-600">
                               {parseFloat(formatEther(campaign.totalFunds || 0n)).toFixed(2)} CELO
                             </p>
                             <p className="text-sm text-gray-600">
                               {parseFloat(formatEther(campaign.participation?.voteCount || 0n)).toFixed(1)} votes
                             </p>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
               </div>
             </div>
           )}
         </div>

         {/* Sidebar */}
         <div className="space-y-6">
           {/* Project Stats */}
           <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-6">
             <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
               <TrendingUp className="h-5 w-5 text-blue-600" />
               Project Stats
             </h3>
             
             <div className="space-y-4">
               {project.establishedDate && (
                 <div className="flex items-center justify-between">
                   <span className="text-gray-600 flex items-center gap-1">
                     <Calendar className="h-4 w-4" />
                     Established
                   </span>
                   <span className="font-medium text-gray-900">
                     {new Date(project.establishedDate).getFullYear()}
                   </span>
                 </div>
               )}
               
               {project.location && (
                 <div className="flex items-center justify-between">
                   <span className="text-gray-600 flex items-center gap-1">
                     <MapPin className="h-4 w-4" />
                     Location
                   </span>
                   <span className="font-medium text-gray-900">{project.location}</span>
                 </div>
               )}
               
               <div className="flex items-center justify-between">
                 <span className="text-gray-600 flex items-center gap-1">
                   <Activity className="h-4 w-4" />
                   Status
                 </span>
                 <span className={`font-medium ${project.active ? 'text-green-600' : 'text-gray-500'}`}>
                   {project.active ? 'Active' : 'Inactive'}
                 </span>
               </div>
               
               <div className="flex items-center justify-between">
                 <span className="text-gray-600 flex items-center gap-1">
                   <Trophy className="h-4 w-4" />
                   Campaigns
                 </span>
                 <span className="font-medium text-blue-600">{project.campaignIds?.length || 0}</span>
               </div>
               
               <div className="flex items-center justify-between">
                 <span className="text-gray-600 flex items-center gap-1">
                   <Lock className="h-4 w-4" />
                   Transferrable
                 </span>
                 <span className={`font-medium ${project.transferrable ? 'text-green-600' : 'text-red-600'}`}>
                   {project.transferrable ? 'Yes' : 'No'}
                 </span>
               </div>
             </div>
           </div>

           {/* Quick Links */}
           <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-6">
             <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
               <LinkIcon className="h-5 w-5 text-blue-600" />
               Quick Links
             </h3>
             
             <div className="space-y-3">
               {project.website && (
                 
                   <a  href={project.website}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                 >
                   <Globe className="h-5 w-5 text-gray-600" />
                   <span className="text-gray-700 group-hover:text-gray-900 font-medium flex-1">Website</span>
                   <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                 </a>
               )}

               {project.githubRepo && (
                 
                   <a  href={project.githubRepo}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                 >
                   <Github className="h-5 w-5 text-gray-600" />
                   <span className="text-gray-700 group-hover:text-gray-900 font-medium flex-1">GitHub</span>
                   <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                 </a>
               )}
               
               {project.demoUrl && (
                 
                   <a  href={project.demoUrl}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group border border-blue-100"
                 >
                   <Play className="h-5 w-5 text-blue-600" />
                   <span className="text-blue-700 group-hover:text-blue-800 font-medium flex-1">Live Demo</span>
                   <ExternalLink className="h-4 w-4 text-blue-400 group-hover:text-blue-600" />
                 </a>
               )}
               
               {project.documentation && (
                 
                   <a  href={project.documentation}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                 >
                   <FileText className="h-5 w-5 text-gray-600" />
                   <span className="text-gray-700 group-hover:text-gray-900 font-medium flex-1">Documentation</span>
                   <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                 </a>
               )}

               {/* Karma GAP Profile with special styling */}
               {project.karmaGapProfile && (
                 
                   <a  href={project.karmaGapProfile}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 rounded-lg transition-colors group border border-purple-200"
                 >
                   <Award className="h-5 w-5 text-purple-600" />
                   <span className="text-purple-700 group-hover:text-purple-800 font-medium flex-1">Karma GAP Profile</span>
                   <ExternalLink className="h-4 w-4 text-purple-400 group-hover:text-purple-600" />
                 </a>
               )}
             </div>
           </div>
           
           {/* Social Links */}
           {(project.twitter || project.linkedin || project.discord || project.telegram || project.youtube || project.instagram) && (
             <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-6">
               <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                 <Globe2 className="h-5 w-5 text-blue-600" />
                 Social Media
               </h3>
               
               <div className="grid grid-cols-2 gap-3">
                 {project.twitter && (
                   
                     <a  href={project.twitter}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="flex items-center justify-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-blue-600 hover:text-blue-700"
                   >
                     <Twitter className="h-4 w-4" />
                     <span className="text-sm font-medium">Twitter</span>
                   </a>
                 )}
                 
                 {project.linkedin && (
                   
                     <a  href={project.linkedin}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="flex items-center justify-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-blue-600 hover:text-blue-700"
                   >
                     <Linkedin className="h-4 w-4" />
                     <span className="text-sm font-medium">LinkedIn</span>
                   </a>
                 )}
                 
                 {project.discord && (
                   
                     <a  href={project.discord}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="flex items-center justify-center gap-2 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-purple-600 hover:text-purple-700"
                   >
                     <MessageCircle className="h-4 w-4" />
                     <span className="text-sm font-medium">Discord</span>
                   </a>
                 )}
                 
                 {project.telegram && (
                   
                     <a  href={project.telegram}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="flex items-center justify-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-blue-600 hover:text-blue-700"
                   >
                     <Send className="h-4 w-4" />
                     <span className="text-sm font-medium">Telegram</span>
                   </a>
                 )}

                 {project.youtube && (
                   
                     <a  href={project.youtube}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="flex items-center justify-center gap-2 p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-red-600 hover:text-red-700"
                   >
                     <Video className="h-4 w-4" />
                     <span className="text-sm font-medium">YouTube</span>
                   </a>
                 )}

                 {project.instagram && (
                   
                     <a  href={project.instagram}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="flex items-center justify-center gap-2 p-3 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors text-pink-600 hover:text-pink-700"
                   >
                     <Camera className="h-4 w-4" />
                     <span className="text-sm font-medium">Instagram</span>
                   </a>
                 )}
               </div>
             </div>
           )}
           
           {/* Contact Information */}
           {project.contactEmail && (
             <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-6">
               <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                 <Mail className="h-5 w-5 text-blue-600" />
                 Contact
               </h3>
               
               
                 <a  href={`mailto:${project.contactEmail}`}
                 className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
               >
                 <Mail className="h-5 w-5 text-gray-600" />
                 <span className="text-gray-700 group-hover:text-gray-900 font-medium flex-1 break-all">
                   {project.contactEmail}
                 </span>
               </a>
             </div>
           )}
           
           {/* Project Owner Actions */}
           {isConnected && address && address.toLowerCase() === project.owner?.toLowerCase() && (
             <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
               <h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
                 <Crown className="h-5 w-5 text-green-600" />
                 Owner Controls
               </h3>
               
               <div className="space-y-3">
                 <button
                   onClick={() => navigate(`/project/edit/${project.id}`)}
                   className="w-full flex items-center justify-center gap-2 p-3 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-green-200 text-green-700 hover:text-green-800"
                 >
                   <Edit className="h-4 w-4" />
                   <span className="font-medium">Edit Project</span>
                 </button>
                 
                 <button
                   onClick={() => setShowCampaignsModal(true)}
                   className="w-full flex items-center justify-center gap-2 p-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
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
         <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
           <div className="p-6">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                 <Share2 className="h-5 w-5 text-blue-600" />
                 Share Project
               </h3>
               <button
                 onClick={() => setShowShareModal(false)}
                 className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
               >
                 <X className="h-5 w-5" />
               </button>
             </div>
             
             <div className="space-y-3">
               <button
                 onClick={() => handleShare('twitter')}
                 className="w-full flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
               >
                 <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                   <Twitter className="h-5 w-5 text-white" />
                 </div>
                 <div className="flex-1 text-left">
                   <p className="font-medium text-gray-900">Share on Twitter</p>
                   <p className="text-sm text-gray-600">Share with your followers</p>
                 </div>
                 <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
               </button>
               
               <button
                 onClick={() => handleShare('linkedin')}
                 className="w-full flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
               >
                 <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                   <Linkedin className="h-5 w-5 text-white" />
                 </div>
                 <div className="flex-1 text-left">
                   <p className="font-medium text-gray-900">Share on LinkedIn</p>
                   <p className="text-sm text-gray-600">Share with professionals</p>
                 </div>
                 <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
               </button>
               
               <button
                 onClick={() => handleShare('copy')}
                 className="w-full flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
               >
                 <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center">
                   <Copy className="h-5 w-5 text-white" />
                 </div>
                 <div className="flex-1 text-left">
                   <p className="font-medium text-gray-900">Copy Link</p>
                   <p className="text-sm text-gray-600">
                     {copiedUrl ? 'Link copied!' : 'Copy project URL'}
                   </p>
                 </div>
                 {copiedUrl && <CheckCircle className="h-4 w-4 text-green-500" />}
               </button>
             </div>
           </div>
         </div>
       </div>
     )}

     <ProjectCampaignsModal
       isOpen={showCampaignsModal}
       onClose={() => setShowCampaignsModal(false)}
       projectId={project?.id?.toString()}
     />
   </div>
 );
}