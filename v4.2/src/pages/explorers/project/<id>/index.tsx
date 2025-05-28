'use client';

import { useState,  useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Address, formatEther } from 'viem';
import { 
  ArrowLeft, 
  Github,
  Globe,
  FileText,
  Calendar,
  MapPin,
 
  CheckCircle,
 
  ExternalLink,
  Share2,
  Bookmark,
  Users,
  Trophy,
 
  Shield,
  Copy,
  Twitter,
  Linkedin,
  Mail,
  MessageCircle,
  Link as LinkIcon,
 
  Award,
  Target,
  Lightbulb,

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
 
  Edit,
  Crown,
  Timer,
  Eye,
  Vote,
  Coins,
  Heart,
  Activity,
 
  BarChart3,
  Gauge,
  Clock,
  Rocket,
  Search,
  Camera,
  Lock,
  Unlock,
  Network,
  Database,
  ChevronRight,
  Bookmark as BookmarkFilled
} from 'lucide-react';

import { useProjectDetails, useProjectCampaigns } from '@/hooks/useProjectMethods';
import { formatIpfsUrl } from '@/utils/imageUtils';
import ProjectCampaignsModal from '@/components/ProjectCampaignsModal';

// ==================== TYPES ====================

interface ParsedMetadata {
  // Basic info
  tagline?: string;
  category?: string;
  tags?: string[];
  location?: string;
  establishedDate?: string;
  website?: string;
  projectType?: string;
  maturityLevel?: string;
  status?: string;
  openSource?: boolean;
  
  // Technical
  blockchain?: string;
  smartContracts?: string[];
  techStack?: string[];
  license?: string;
  developmentStage?: string;
  auditReports?: string[];
  kycCompliant?: boolean;
  regulatoryCompliance?: string[];
  
  // Media & Links
  logo?: string;
  demoVideo?: string;
  coverImage?: string;
  demoUrl?: string;
  githubRepo?: string;
  documentation?: string;
  karmaGapProfile?: string;
  
  // Social
  twitter?: string;
  linkedin?: string;
  discord?: string;
  telegram?: string;
  youtube?: string;
  instagram?: string;
  
  // Team & Contact
  teamMembers?: TeamMember[];
  contactEmail?: string;
  businessEmail?: string;
  phone?: string;
  
  // Features
  keyFeatures?: string[];
  innovation?: string;
  useCases?: string[];
  targetAudience?: string;
  
  // Metrics
  milestones?: Milestone[];
  launchDate?: string;
  userCount?: string;
  transactionVolume?: string;
  tvl?: string;
}

interface TeamMember {
  name: string;
  role: string;
  email: string;
  linkedin: string;
  twitter: string;
  avatar: string;
}

interface Milestone {
  title: string;
  description: string;
  targetDate: string;
  status: 'planned' | 'in-progress' | 'completed';
}

interface EnhancedProject {
  // Core blockchain data
  id: bigint;
  owner: Address;
  name: string;
  description: string;
  transferrable: boolean;
  active: boolean;
  createdAt: bigint;
  campaignIds: bigint[];
  contracts?: Address[];
  
  // Parsed metadata
  metadata?: ParsedMetadata;
}

interface CampaignStatus {
  bgClass: string;
  textClass: string;
  badgeClass: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

type TabId = 'overview' | 'campaigns' | 'technical' | 'team' | 'analytics';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface SharePlatform {
  id: 'twitter' | 'linkedin' | 'copy';
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  textColor: string;
  description: string;
}

// ==================== HOOKS ====================

const useProjectData = (projectId: bigint, contractAddress: Address) => {
  const { projectDetails, isLoading, error, refetch } = useProjectDetails(contractAddress, projectId);
  const { projectCampaigns, isLoading: campaignsLoading } = useProjectCampaigns(contractAddress, projectId);

  const safeJsonParse = (jsonString: string, fallback = {}) => {
    try {
      return jsonString ? JSON.parse(jsonString) : fallback;
    } catch (e) {
      console.warn('Failed to parse JSON:', e);
      return fallback;
    }
  };

  const enhancedProject = useMemo((): EnhancedProject | null => {
    if (!projectDetails) return null;

    const { project: projectData, metadata, contracts } = projectDetails;
    
    // Parse the metadata JSON strings
    const bioData = safeJsonParse(metadata.bio);
    const contractInfo = safeJsonParse(metadata.contractInfo);
    const additionalData = safeJsonParse(metadata.additionalData);
    
    // Combine all parsed metadata
    const parsedMetadata: ParsedMetadata = {
      // From bio
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
      
      // From contractInfo
      blockchain: contractInfo.blockchain || '',
      smartContracts: contractInfo.smartContracts || [],
      techStack: contractInfo.techStack || [],
      license: contractInfo.license || '',
      developmentStage: contractInfo.developmentStage || '',
      auditReports: contractInfo.auditReports || [],
      kycCompliant: contractInfo.kycCompliant || false,
      regulatoryCompliance: contractInfo.regulatoryCompliance || [],
      
      // From additionalData - Media
      logo: additionalData.media?.logo || additionalData.logo || '',
      demoVideo: additionalData.media?.demoVideo || additionalData.demoVideo || '',
      coverImage: additionalData.media?.coverImage || '',
      
      // Links
      demoUrl: additionalData.links?.demoUrl || additionalData.demoUrl || '',
      githubRepo: additionalData.links?.githubRepo || additionalData.githubRepo || '',
      documentation: additionalData.links?.documentation || additionalData.documentation || '',
      karmaGapProfile: additionalData.links?.karmaGapProfile || additionalData.karmaGapProfile || '',
      
      // Social Media
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
      
      // Features
      keyFeatures: additionalData.keyFeatures || [],
      innovation: additionalData.innovation || '',
      useCases: additionalData.useCases || [],
      targetAudience: additionalData.targetAudience || '',
      
      // Metrics
      milestones: additionalData.milestones || [],
      launchDate: additionalData.launchDate || '',
      userCount: additionalData.userCount || '',
      transactionVolume: additionalData.transactionVolume || '',
      tvl: additionalData.tvl || '',
    };

    return {
      id: projectData.id,
      owner: projectData.owner,
      name: projectData.name,
      description: projectData.description,
      transferrable: projectData.transferrable,
      active: projectData.active,
      createdAt: projectData.createdAt,
      campaignIds: projectData.campaignIds,
      contracts,
      metadata: parsedMetadata,
    };
  }, [projectDetails]);

  return {
    project: enhancedProject,
    projectCampaigns,
    isLoading: isLoading || campaignsLoading,
    error,
    refetch
  };
};

// ==================== UTILITIES ====================

const getCampaignStatusStyling = (status: string): CampaignStatus => {
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
        icon: Clock,
        label: 'Inactive'
      };
  }
};

const formatDate = (timestamp: bigint): string => {
  return new Date(Number(timestamp) * 1000).toLocaleDateString();
};

const formatYear = (dateString: string): string => {
  return new Date(dateString).getFullYear().toString();
};

// ==================== COMPONENTS ====================

interface ProjectLogoProps {
  logo?: string;
  name: string;
  verified?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ProjectLogo: React.FC<ProjectLogoProps> = ({ logo, name, verified, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-20 h-20 text-2xl',
    lg: 'w-32 h-32 text-4xl'
  };

  const badgeSize = {
    sm: 'w-4 h-4 -top-1 -right-1',
    md: 'w-5 h-5 -top-1 -right-1',
    lg: 'w-6 h-6 -top-2 -right-2'
  };

  return (
    <div className="relative">
      {logo ? (
        <img 
          src={formatIpfsUrl(logo)} 
          alt={`${name} logo`}
          className={`${sizeClasses[size]} rounded-2xl object-cover border-2 border-white shadow-lg ring-1 ring-gray-200`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const fallback = target.nextSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
      ) : null}
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg border-2 border-white ring-1 ring-gray-200 ${logo ? 'hidden' : 'flex'}`}>
        {name?.charAt(0) || 'P'}
      </div>
      {verified && (
        <div className={`absolute ${badgeSize[size]} bg-blue-500 rounded-full p-1 shadow-sm`}>
          <BadgeCheck className="w-full h-full text-white" />
        </div>
      )}
    </div>
  );
};

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'purple' | 'amber' | 'red';
  trend?: {
    direction: 'up' | 'down';
    value: string;
  };
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, color, trend }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  };

  const iconColors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
  };

  return (
    <div className={`p-6 rounded-xl border ${colorClasses[color]} backdrop-blur-sm`}>
      <div className="flex items-center justify-between mb-3">
        <Icon className={`h-6 w-6 ${iconColors[color]}`} />
        {trend && (
          <div className={`flex items-center text-xs font-medium ${
            trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend.direction === 'up' ? '↗' : '↘'} {trend.value}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium opacity-80">{label}</p>
      </div>
    </div>
  );
};

interface SectionHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon: Icon, title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-6">
    <div>
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>
        {title}
      </h2>
      {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
    </div>
    {action}
  </div>
);

// ==================== MAIN COMPONENT ====================

export default function ProjectView() {
  const { id } = useParams<{ id: string }>();
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  
  // State
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showCampaignsModal, setShowCampaignsModal] = useState(false);
  
  // Data
  const contractAddress = import.meta.env.VITE_CONTRACT_V4 as Address;
  const projectId = id ? BigInt(id) : BigInt(0);
  const { project, projectCampaigns, isLoading, error } = useProjectData(projectId, contractAddress);
  
  // Constants
  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'campaigns', label: 'Campaigns', icon: Trophy, badge: project?.campaignIds?.length || 0 },
    { id: 'technical', label: 'Technical', icon: Code },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  const sharePlatforms: SharePlatform[] = [
    {
      id: 'twitter',
      name: 'Twitter',
      icon: Twitter,
      bgColor: 'bg-blue-500',
      textColor: 'text-blue-600',
      description: 'Share with your followers'
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: Linkedin,
      bgColor: 'bg-blue-600',
      textColor: 'text-blue-600',
      description: 'Share with professionals'
    },
    {
      id: 'copy',
      name: 'Copy Link',
      icon: Copy,
      bgColor: 'bg-gray-500',
      textColor: 'text-gray-600',
      description: copiedUrl ? 'Link copied!' : 'Copy project URL'
    }
  ];

  // Handlers
  const handleShare = async (platform: 'twitter' | 'linkedin' | 'copy') => {
    const url = window.location.href;
    const text = `Check out ${project?.name} - ${project?.metadata?.tagline || project?.description}`;
    
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
    }
    setShowShareModal(false);
  };

  const isOwner = isConnected && address && project && address.toLowerCase() === project.owner?.toLowerCase();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <Rocket className="h-10 w-10 text-blue-600 absolute inset-0 m-auto animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Loading Project</h2>
            <p className="text-gray-600">Fetching project details...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto">
          <div className="text-6xl mb-8">🚀</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Project Not Found</h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            {error ? `Error: ${error.message}` : 'This project doesn\'t exist or has been removed.'}
          </p>
          <button
            onClick={() => navigate('/explore')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Sticky Navigation */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/explore')}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50 font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Projects
            </button>

            <div className="flex items-center gap-3">
              {/* Status Badge */}
              <div className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${
                project.active 
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                  : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}>
                <div className={`w-2 h-2 rounded-full ${project.active ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>
                {project.active ? 'Active' : 'Inactive'}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1">
                <button
                  onClick={() => setIsBookmarked(!isBookmarked)}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    isBookmarked 
                      ? 'bg-blue-100 text-blue-600 shadow-sm' 
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                >
                  {isBookmarked ? <BookmarkFilled className="h-4 w-4 fill-current" /> : <Bookmark className="h-4 w-4" />}
                </button>
                
                <button
                  onClick={() => setShowShareModal(true)}
                  className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-all duration-200"
                  title="Share project"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Header */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 mb-8">
          <div className="flex flex-col lg:flex-row items-start gap-8">
            {/* Left: Logo & Basic Info */}
            <div className="flex items-start gap-6 flex-1">
              <ProjectLogo 
                logo={project.metadata?.logo} 
                name={project.name} 
                verified={true}
                size="lg"
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h1 className="text-4xl font-bold text-gray-900 tracking-tight">{project.name}</h1>
                      {project.metadata?.category && (
                        <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
                          {project.metadata.category}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xl text-gray-600 mb-6 leading-relaxed">
                      {project.metadata?.tagline || project.description}
                    </p>
                    
                    {/* Project Meta */}
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        <span>Created {formatDate(project.createdAt)}</span>
                      </div>
                      {project.metadata?.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" />
                          <span>{project.metadata.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Trophy className="h-4 w-4" />
                        <span>{project.campaignIds?.length || 0} Campaigns</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right: Tags & Actions */}
            <div className="flex flex-col items-end gap-4">
              {/* Tags */}
              {project.metadata?.tags && project.metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-end">
                  {project.metadata.tags.slice(0, 4).map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full border border-gray-200 hover:bg-gray-200 transition-colors"
                    >
                      #{tag}
                    </span>
                  ))}
                  {project.metadata.tags.length > 4 && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full border border-gray-200">
                      +{project.metadata.tags.length - 4} more
                    </span>
                  )}
                </div>
              )}
              
              {/* Quick Action CTA */}
              {project.metadata?.demoUrl && (
                <a
                  href={project.metadata.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Play className="h-4 w-4" />
                  Try Live Demo
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Trophy}
            label="Active Campaigns"
            value={project.campaignIds?.length || 0}
            color="blue"
          />
          <StatCard
            icon={Coins}
            label="Total Funding"
            value={`${projectCampaigns ? 
              projectCampaigns.filter((campaign): campaign is NonNullable<typeof campaign> => campaign !== null)
                .reduce((sum, campaign) => 
                  sum + parseFloat(formatEther(campaign.totalFunds || 0n)), 0
                ).toFixed(2) 
              : '0.00'} CELO`}
            color="green"
          />
          <StatCard
            icon={Vote}
            label="Total Votes"
            value={projectCampaigns ? 
              projectCampaigns.filter((campaign): campaign is NonNullable<typeof campaign> => campaign !== null)
                .reduce((sum, campaign) => 
                  sum + parseFloat(formatEther(campaign.participation?.voteCount || 0n)), 0
                ).toFixed(1)
              : '0.0'
            }
            color="purple"
          />
          <StatCard
            icon={Activity}
            label="Project Status"
            value={project.active ? 'Active' : 'Inactive'}
            color={project.active ? 'green' : 'amber'}
          />
        </div>
 
        {/* Navigation Tabs */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 mb-8 overflow-hidden">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-8 py-4 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap min-w-0 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50/50'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${
                  activeTab === tab.id ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <tab.icon className="h-4 w-4" />
                </div>
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full font-semibold">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
 
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                {/* About Section */}
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
                  <SectionHeader 
                    icon={FileText}
                    title="About This Project"
                    subtitle="Learn more about the project's mission and goals"
                  />
                  
                  <div className="prose prose-lg prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed text-lg mb-6">
                      {project.description}
                    </p>
                  </div>
                  
                  {/* Innovation & Target Audience Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    {project.metadata?.innovation && (
                      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Lightbulb className="h-5 w-5 text-blue-600" />
                          </div>
                          <h4 className="font-semibold text-blue-900">Innovation Highlights</h4>
                        </div>
                        <p className="text-blue-800 leading-relaxed">{project.metadata.innovation}</p>
                      </div>
                    )}
                    
                    {project.metadata?.targetAudience && (
                      <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Target className="h-5 w-5 text-green-600" />
                          </div>
                          <h4 className="font-semibold text-green-900">Target Audience</h4>
                        </div>
                        <p className="text-green-800 leading-relaxed">{project.metadata.targetAudience}</p>
                      </div>
                    )}
                  </div>
                </div>
 
                {/* Key Features */}
                {project.metadata?.keyFeatures && project.metadata.keyFeatures.length > 0 && (
                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
                    <SectionHeader 
                      icon={Star}
                      title="Key Features"
                      subtitle="What makes this project special"
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {project.metadata.keyFeatures.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-4 p-4 bg-gray-50/80 rounded-xl border border-gray-100 hover:bg-gray-100/80 transition-colors">
                          <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-gray-700 leading-relaxed">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
 
                {/* Demo Video */}
                {project.metadata?.demoVideo && (
                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
                    <SectionHeader 
                      icon={Video}
                      title="Project Demo"
                      subtitle="See the project in action"
                    />
                    
                    <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center border border-gray-200 overflow-hidden">
                      <a  
                        href={project.metadata.demoVideo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-8 py-4 bg-white/90 text-gray-800 rounded-xl hover:bg-white transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-gray-200"
                      >
                        <div className="p-2 bg-red-100 rounded-lg">
                          <Play className="h-6 w-6 text-red-600" />
                        </div>
                        <span className="font-semibold">Watch Demo Video</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                )}
              </>
            )}
 
            {/* Campaigns Tab */}
            {activeTab === 'campaigns' && (
              <div className="space-y-6">
                {projectCampaigns && projectCampaigns.length > 0 ? (
                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
                    <SectionHeader 
                      icon={Trophy}
                      title="Campaign Participation"
                      subtitle={`Participating in ${projectCampaigns.length} campaign${projectCampaigns.length !== 1 ? 's' : ''}`}
                    />
                    
                    <div className="space-y-6">
                      {projectCampaigns?.filter((campaign): campaign is NonNullable<typeof campaign> => campaign !== null).map((campaign) => {
                        const styling = getCampaignStatusStyling(campaign.status);
                        
                        return (
                          <div
                            key={campaign.id.toString()}
                            className={`p-6 rounded-xl border ${styling.bgClass} hover:shadow-lg transition-all duration-200 backdrop-blur-sm`}
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-bold text-gray-900 text-lg">{campaign.name}</h3>
                                  <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${styling.textClass} bg-white/50`}>
                                    <styling.icon className="w-3 h-3" />
                                    {styling.label}
                                  </div>
                                </div>
                                <p className="text-gray-600 mb-4 leading-relaxed">{campaign.description}</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                              <div className="text-center">
                                <p className="text-xs text-gray-500 mb-1">Total Funds</p>
                                <p className="font-bold text-green-600 text-lg">
                                  {parseFloat(formatEther(campaign.totalFunds)).toFixed(2)} CELO
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-500 mb-1">Your Votes</p>
                                <p className="font-bold text-blue-600 text-lg">
                                  {parseFloat(formatEther(campaign.participation?.voteCount || 0n)).toFixed(1)}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-500 mb-1">Max Winners</p>
                                <p className="font-bold text-purple-600 text-lg">
                                  {Number(campaign.maxWinners) || 'All'}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-500 mb-1">Approval</p>
                                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                                  campaign.participation?.approved 
                                    ? 'bg-green-100 text-green-700 border border-green-200' 
                                    : 'bg-amber-100 text-amber-700 border border-amber-200'
                                }`}>
                                  {campaign.participation?.approved ? (
                                    <>
                                      <CheckCircle className="w-3 h-3" />
                                      Approved
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="w-3 h-3" />
                                      Pending
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-3">
                              <button
                                onClick={() => navigate(`/explorer/campaign/${campaign.id.toString()}`)}
                                className="flex items-center gap-2 px-4 py-2 bg-white/80 border border-gray-200 text-gray-700 rounded-lg hover:bg-white hover:shadow-md transition-all duration-200 font-medium"
                              >
                                <Eye className="h-4 w-4" />
                                View Campaign
                              </button>
                              {campaign.status === 'active' && (
                                <button
                                  onClick={() => navigate(`/explorer/campaign/${campaign.id.toString()}`)}
                                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                                >
                                  <Vote className="h-4 w-4" />
                                  Vote Now
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12 text-center">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Trophy className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">No Active Campaigns</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      This project hasn't joined any campaigns yet. Check back later for funding opportunities.
                    </p>
                    <button
                      onClick={() => navigate('/campaigns')}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-medium"
                    >
                      <Search className="h-4 w-4" />
                      Browse Campaigns
                    </button>
                  </div>
                )}
              </div>
            )}
 
            {/* Technical Tab */}
            {activeTab === 'technical' && (
              <div className="space-y-8">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
                  <SectionHeader 
                    icon={Code}
                    title="Technical Specifications"
                    subtitle="Architecture and implementation details"
                  />
                  
                  {/* Tech Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {project.metadata?.blockchain && (
                      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Network className="h-5 w-5 text-blue-600" />
                          </div>
                          <span className="font-semibold text-blue-900">Blockchain</span>
                        </div>
                        <p className="text-blue-800 font-medium">{project.metadata.blockchain}</p>
                      </div>
                    )}
                    
                    {project.metadata?.developmentStage && (
                      <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Gauge className="h-5 w-5 text-green-600" />
                          </div>
                          <span className="font-semibold text-green-900">Development Stage</span>
                        </div>
                        <p className="text-green-800 font-medium">{project.metadata.developmentStage}</p>
                      </div>
                    )}
                    
                    {project.metadata?.license && (
                      <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <Shield className="h-5 w-5 text-purple-600" />
                          </div>
                          <span className="font-semibold text-purple-900">License</span>
                        </div>
                        <p className="text-purple-800 font-medium">{project.metadata.license}</p>
                      </div>
                    )}
                    
                    <div className="p-6 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl border border-red-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <Heart className="h-5 w-5 text-red-600" />
                        </div>
                        <span className="font-semibold text-red-900">Open Source</span>
                      </div>
                      <p className="text-red-800 font-medium">{project.metadata?.openSource ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                  
                  {/* Tech Stack */}
                  {project.metadata?.techStack && project.metadata.techStack.length > 0 && (
                    <div className="mb-8">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Code className="h-4 w-4 text-blue-600" />
                        </div>
                        Technology Stack
                      </h3>
                      <div className="flex flex-wrap gap-3">
                        {project.metadata.techStack.map((tech, idx) => (
                          <span
                            key={idx}
                            className="px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-full text-sm font-medium border border-blue-200 hover:from-blue-200 hover:to-indigo-200 transition-colors"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Smart Contracts */}
                  {project.metadata?.smartContracts && project.metadata.smartContracts.length > 0 && (
                    <div className="mb-8">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Terminal className="h-4 w-4 text-green-600" />
                        </div>
                        Smart Contracts
                      </h3>
                      <div className="space-y-3">
                        {project.metadata.smartContracts.map((contract, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-4 bg-gray-50/80 rounded-xl border border-gray-200 font-mono text-sm group hover:bg-gray-100/80 transition-colors">
                            <div className="p-1.5 bg-gray-200 rounded-lg">
                              <Terminal className="h-4 w-4 text-gray-600" />
                            </div>
                            <span className="text-gray-700 break-all flex-1">{contract}</span>
                            <button
                              onClick={() => navigator.clipboard.writeText(contract)}
                              className="p-2 hover:bg-gray-200 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              title="Copy address"
                            >
                              <Copy className="h-4 w-4 text-gray-500" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
 
                  {/* Registered Contracts */}
                  {project.contracts && project.contracts.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <Database className="h-4 w-4 text-indigo-600" />
                        </div>
                        Registered Contracts
                      </h3>
                      <div className="space-y-3">
                        {project.contracts.map((contract, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-4 bg-indigo-50/80 rounded-xl border border-indigo-200 font-mono text-sm group hover:bg-indigo-100/80 transition-colors">
                            <div className="p-1.5 bg-indigo-200 rounded-lg">
                              <Database className="h-4 w-4 text-indigo-600" />
                            </div>
                            <span className="text-indigo-700 break-all flex-1">{contract}</span>
                            <button
                              onClick={() => navigator.clipboard.writeText(contract)}
                              className="p-2 hover:bg-indigo-200 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              title="Copy address"
                            >
                              <Copy className="h-4 w-4 text-indigo-500" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
 
            {/* Team Tab */}
            {activeTab === 'team' && (
              <div className="space-y-8">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
                  <SectionHeader 
                    icon={Users}
                    title="Team Members"
                    subtitle="Meet the people behind the project"
                  />
                  
                  {project.metadata?.teamMembers && project.metadata.teamMembers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {project.metadata.teamMembers.map((member, idx) => (
                        <div key={idx} className="p-6 bg-gray-50/80 rounded-xl border border-gray-200 hover:bg-gray-100/80 transition-colors">
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                              <User className="h-8 w-8 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-gray-900 text-lg mb-1 truncate">{member.name}</h3>
                              <p className="text-gray-600 mb-4 font-medium">{member.role}</p>
                              <div className="flex gap-3">
                                {member.linkedin && (
                                  <a 
                                    href={member.linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                    title="LinkedIn Profile"
                                  >
                                    <Linkedin className="h-4 w-4" />
                                  </a>
                                )}
                                {member.twitter && (
                                  <a 
                                    href={member.twitter}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                    title="Twitter Profile"
                                  >
                                    <Twitter className="h-4 w-4" />
                                  </a>
                                )}
                                {member.email && (
                                  <a 
                                    href={`mailto:${member.email}`}
                                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
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
                    <div className="text-center py-12">
                      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Users className="h-12 w-12 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3">No Team Information</h3>
                      <p className="text-gray-600">Team details haven't been provided for this project yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
 
            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-8">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
                  <SectionHeader 
                    icon={BarChart3}
                    title="Project Analytics"
                    subtitle="Performance metrics and insights"
                  />
                  
                  {/* Analytics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatCard
                      icon={Trophy}
                      label="Total Campaigns"
                      value={project.campaignIds?.length || 0}
                      color="blue"
                    />
                    <StatCard
                      icon={Coins}
                      label="Total Funds"
                      value={`${projectCampaigns ? 
                        projectCampaigns.filter((campaign): campaign is NonNullable<typeof campaign> => campaign !== null)
                          .reduce((sum, campaign) => 
                            sum + parseFloat(formatEther(campaign.totalFunds || 0n)), 0
                          ).toFixed(2) 
                        : '0.00'} CELO`}
                      color="green"
                    />
                    <StatCard
                      icon={Vote}
                      label="Total Votes"
                      value={projectCampaigns ? 
                        projectCampaigns.filter((campaign): campaign is NonNullable<typeof campaign> => campaign !== null)
                          .reduce((sum, campaign) => 
                            sum + parseFloat(formatEther(campaign.participation?.voteCount || 0n)), 0
                          ).toFixed(1)
                        : '0.0'
                      }
                      color="purple"
                    />
                  </div>
                  
                  {/* Campaign Performance */}
                  {projectCampaigns && projectCampaigns.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <TrendingUp className="h-4 w-4 text-purple-600" />
                        </div>
                        Campaign Performance
                      </h3>
                      <div className="space-y-4">
                        {projectCampaigns?.filter((campaign): campaign is NonNullable<typeof campaign> => campaign !== null).map((campaign, idx) => (
                          <div key={idx} className="flex items-center gap-6 p-6 bg-gray-50/80 rounded-xl border border-gray-200 hover:bg-gray-100/80 transition-colors">
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 mb-1">{campaign.name}</h4>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                                  campaign.status === 'active' ? 'bg-green-100 text-green-700' :
                                  campaign.status === 'ended' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {campaign.status}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600 text-xl">
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
          <div className="space-y-8">
            {/* Project Stats */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
              <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
                Project Stats
              </h3>
              
              <div className="space-y-6">
                {project.metadata?.establishedDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Established
                    </span>
                    <span className="font-semibold text-gray-900">
                      {formatYear(project.metadata.establishedDate)}
                    </span>
                  </div>
                )}
                
                {project.metadata?.location && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </span>
                    <span className="font-semibold text-gray-900">{project.metadata.location}</span>
                    </div>
               )}
               
               <div className="flex items-center justify-between">
                 <span className="text-gray-600 flex items-center gap-2">
                   <Activity className="h-4 w-4" />
                   Status
                 </span>
                 <span className={`font-semibold ${project.active ? 'text-green-600' : 'text-gray-500'}`}>
                   {project.active ? 'Active' : 'Inactive'}
                 </span>
               </div>
               
               <div className="flex items-center justify-between">
                 <span className="text-gray-600 flex items-center gap-2">
                   <Trophy className="h-4 w-4" />
                   Campaigns
                 </span>
                 <span className="font-semibold text-blue-600">{project.campaignIds?.length || 0}</span>
               </div>
               
               <div className="flex items-center justify-between">
                 <span className="text-gray-600 flex items-center gap-2">
                   {project.transferrable ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                   Transferrable
                 </span>
                 <span className={`font-semibold ${project.transferrable ? 'text-green-600' : 'text-red-600'}`}>
                   {project.transferrable ? 'Yes' : 'No'}
                 </span>
               </div>
             </div>
           </div>

           {/* Quick Links */}
           <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
             <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-3">
               <div className="p-2 bg-green-100 rounded-lg">
                 <LinkIcon className="h-4 w-4 text-green-600" />
               </div>
               Quick Links
             </h3>
             
             <div className="space-y-3">
               {project.metadata?.website && (
                 <a 
                   href={project.metadata.website}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="flex items-center gap-3 p-4 bg-gray-50/80 hover:bg-gray-100/80 rounded-xl transition-all duration-200 group border border-gray-200"
                 >
                   <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                     <Globe className="h-4 w-4 text-blue-600" />
                   </div>
                   <span className="text-gray-700 group-hover:text-gray-900 font-medium flex-1">Website</span>
                   <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                 </a>
               )}

               {project.metadata?.githubRepo && (
                 <a 
                   href={project.metadata.githubRepo}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="flex items-center gap-3 p-4 bg-gray-50/80 hover:bg-gray-100/80 rounded-xl transition-all duration-200 group border border-gray-200"
                 >
                   <div className="p-2 bg-gray-800 rounded-lg group-hover:bg-gray-900 transition-colors">
                     <Github className="h-4 w-4 text-white" />
                   </div>
                   <span className="text-gray-700 group-hover:text-gray-900 font-medium flex-1">GitHub</span>
                   <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                 </a>
               )}
               
               {project.metadata?.demoUrl && (
                 <a 
                   href={project.metadata.demoUrl}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl transition-all duration-200 group border border-blue-200"
                 >
                   <div className="p-2 bg-blue-500 rounded-lg group-hover:bg-blue-600 transition-colors">
                     <Play className="h-4 w-4 text-white" />
                   </div>
                   <span className="text-blue-700 group-hover:text-blue-800 font-medium flex-1">Live Demo</span>
                   <ExternalLink className="h-4 w-4 text-blue-400 group-hover:text-blue-600 transition-colors" />
                 </a>
               )}
               
               {project.metadata?.documentation && (
                 <a 
                   href={project.metadata.documentation}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="flex items-center gap-3 p-4 bg-gray-50/80 hover:bg-gray-100/80 rounded-xl transition-all duration-200 group border border-gray-200"
                 >
                   <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                     <FileText className="h-4 w-4 text-green-600" />
                   </div>
                   <span className="text-gray-700 group-hover:text-gray-900 font-medium flex-1">Documentation</span>
                   <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                 </a>
               )}

               {project.metadata?.karmaGapProfile && (
                 <a 
                   href={project.metadata.karmaGapProfile}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-xl transition-all duration-200 group border border-purple-200"
                 >
                   <div className="p-2 bg-purple-500 rounded-lg group-hover:bg-purple-600 transition-colors">
                     <Award className="h-4 w-4 text-white" />
                   </div>
                   <span className="text-purple-700 group-hover:text-purple-800 font-medium flex-1">Karma GAP</span>
                   <ExternalLink className="h-4 w-4 text-purple-400 group-hover:text-purple-600 transition-colors" />
                 </a>
               )}
             </div>
           </div>
           
           {/* Social Links */}
           {(project.metadata?.twitter || project.metadata?.linkedin || project.metadata?.discord || 
             project.metadata?.telegram || project.metadata?.youtube || project.metadata?.instagram) && (
             <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
               <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-3">
                 <div className="p-2 bg-purple-100 rounded-lg">
                   <Globe2 className="h-4 w-4 text-purple-600" />
                 </div>
                 Social Media
               </h3>
               
               <div className="grid grid-cols-2 gap-3">
                 {project.metadata?.twitter && (
                   <a 
                     href={project.metadata.twitter}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="flex items-center justify-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all duration-200 text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300"
                   >
                     <Twitter className="h-4 w-4" />
                     <span className="text-sm font-medium">Twitter</span>
                   </a>
                 )}
                 
                 {project.metadata?.linkedin && (
                   <a 
                     href={project.metadata.linkedin}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="flex items-center justify-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all duration-200 text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300"
                   >
                     <Linkedin className="h-4 w-4" />
                     <span className="text-sm font-medium">LinkedIn</span>
                   </a>
                 )}
                 
                 {project.metadata?.discord && (
                   <a 
                     href={project.metadata.discord}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="flex items-center justify-center gap-2 p-3 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all duration-200 text-purple-600 hover:text-purple-700 border border-purple-200 hover:border-purple-300"
                   >
                     <MessageCircle className="h-4 w-4" />
                     <span className="text-sm font-medium">Discord</span>
                   </a>
                 )}
                 
                 {project.metadata?.telegram && (
                   <a 
                     href={project.metadata.telegram}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="flex items-center justify-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all duration-200 text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300"
                   >
                     <Send className="h-4 w-4" />
                     <span className="text-sm font-medium">Telegram</span>
                   </a>
                 )}

                 {project.metadata?.youtube && (
                   <a 
                     href={project.metadata.youtube}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="flex items-center justify-center gap-2 p-3 bg-red-50 hover:bg-red-100 rounded-xl transition-all duration-200 text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300"
                   >
                     <Video className="h-4 w-4" />
                     <span className="text-sm font-medium">YouTube</span>
                   </a>
                 )}

                 {project.metadata?.instagram && (
                   <a 
                     href={project.metadata.instagram}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="flex items-center justify-center gap-2 p-3 bg-pink-50 hover:bg-pink-100 rounded-xl transition-all duration-200 text-pink-600 hover:text-pink-700 border border-pink-200 hover:border-pink-300"
                   >
                     <Camera className="h-4 w-4" />
                     <span className="text-sm font-medium">Instagram</span>
                   </a>
                 )}
               </div>
             </div>
           )}
           
           {/* Contact Information */}
           {project.metadata?.contactEmail && (
             <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
               <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-3">
                 <div className="p-2 bg-amber-100 rounded-lg">
                   <Mail className="h-4 w-4 text-amber-600" />
                 </div>
                 Contact
               </h3>
               
               <a 
                 href={`mailto:${project.metadata.contactEmail}`}
                 className="flex items-center gap-3 p-4 bg-gray-50/80 hover:bg-gray-100/80 rounded-xl transition-all duration-200 group border border-gray-200"
               >
                 <div className="p-2 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors">
                   <Mail className="h-4 w-4 text-amber-600" />
                 </div>
                 <span className="text-gray-700 group-hover:text-gray-900 font-medium flex-1 break-all">
                   {project.metadata.contactEmail}
                 </span>
               </a>
             </div>
           )}
           
           {/* Project Owner Actions */}
           {isOwner && (
             <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-6 shadow-lg">
               <h3 className="font-bold text-green-900 mb-6 flex items-center gap-3">
                 <div className="p-2 bg-green-200 rounded-lg">
                   <Crown className="h-4 w-4 text-green-700" />
                 </div>
                 Owner Controls
               </h3>
               
               <div className="space-y-3">
                 <button
                   onClick={() => navigate(`/app/project/edit/${project.id}`)}
                   className="w-full flex items-center justify-center gap-2 p-4 bg-white hover:bg-gray-50 rounded-xl transition-all duration-200 border border-green-200 text-green-700 hover:text-green-800 font-medium shadow-sm hover:shadow-md"
                 >
                   <Edit className="h-4 w-4" />
                   Edit Project
                 </button>
                 
                 <button
                   onClick={() => setShowCampaignsModal(true)}
                   className="w-full flex items-center justify-center gap-2 p-4 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                 >
                   <Trophy className="h-4 w-4" />
                   Manage Campaigns
                 </button>
               </div>
             </div>
           )}
         </div>
       </div>
     </div>

     {/* Share Modal */}
     {showShareModal && (
       <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
         <div className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-md shadow-2xl border border-white/20">
           <div className="p-8">
             <div className="flex items-center justify-between mb-8">
               <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                 <div className="p-2 bg-blue-100 rounded-lg">
                   <Share2 className="h-5 w-5 text-blue-600" />
                 </div>
                 Share Project
               </h3>
               <button
                 onClick={() => setShowShareModal(false)}
                 className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
               >
                 <X className="h-5 w-5" />
               </button>
             </div>
             
             <div className="space-y-4">
               {sharePlatforms.map((platform) => (
                 <button
                   key={platform.id}
                   onClick={() => handleShare(platform.id)}
                   className="w-full flex items-center gap-4 p-4 bg-gray-50/80 hover:bg-gray-100/80 rounded-xl transition-all duration-200 group border border-gray-200"
                 >
                   <div className={`w-12 h-12 ${platform.bgColor} rounded-full flex items-center justify-center shadow-sm`}>
                     <platform.icon className="h-5 w-5 text-white" />
                   </div>
                   <div className="flex-1 text-left">
                     <p className="font-semibold text-gray-900">{platform.name}</p>
                     <p className="text-sm text-gray-600">{platform.description}</p>
                   </div>
                   {platform.id === 'copy' && copiedUrl ? (
                     <CheckCircle className="h-5 w-5 text-green-500" />
                   ) : (
                     <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                   )}
                 </button>
               ))}
             </div>
           </div>
         </div>
       </div>
     )}

     {/* Project Campaigns Modal */}
     <ProjectCampaignsModal
       isOpen={showCampaignsModal}
       onClose={() => setShowCampaignsModal(false)}
       projectId={project?.id?.toString()}
     />
   </div>
 );
}