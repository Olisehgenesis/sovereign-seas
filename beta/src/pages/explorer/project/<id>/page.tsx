import { useState,  useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import type { Address } from 'viem';
import { formatEther } from 'viem';
import { 
  Github,
  Globe,
  FileText,
  Calendar,
  MapPin,
 
  CheckCircle,
 
  ExternalLink,
  Share2,
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
} from 'lucide-react';

import { useProjectDetails, useProjectCampaigns } from '@/hooks/useProjectMethods';
import { formatIpfsUrl } from '@/utils/imageUtils';
import ProjectCampaignsModal from '@/components/ProjectCampaignsModal';
import PhoneFrame from '@/components/PhoneFrame';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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

type TabId = 'overview' | 'campaigns' | 'technical' | 'team' | 'analytics' | 'admin';

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
          className={`${sizeClasses[size]} rounded-full object-cover`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const fallback = target.nextSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
      ) : null}
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold ${logo ? 'hidden' : 'flex'}`}>
        {name?.charAt(0) || 'P'}
      </div>
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
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showCampaignsModal, setShowCampaignsModal] = useState(false);
  
  // Data
  const contractAddress = import.meta.env.VITE_CONTRACT_V4 as Address;
  const projectId = id ? BigInt(id) : BigInt(0);
  const { project, projectCampaigns, isLoading, error } = useProjectData(projectId, contractAddress);
  
  // Check if user is owner
  const isOwner = isConnected && address && project && address.toLowerCase() === project.owner?.toLowerCase();
  
  // Constants
  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'campaigns', label: 'Campaigns', icon: Trophy, badge: project?.campaignIds?.length || 0 },
    { id: 'technical', label: 'Technical', icon: Code },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    ...(isOwner ? [{ id: 'admin' as TabId, label: 'Admin', icon: Crown }] : [])
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

  const openVoteModal = (campaignId: string) => {
    navigate(`/explorer/campaign/${campaignId}`);
  };

 


  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto">
          <div className="text-6xl mb-8">🚀</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Project Not Found</h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            {error ? `Error: ${error.message}` : 'This project doesn\'t exist or has been removed.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* New Hero Section */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Part */}
          <div className="space-y-6 mt-[15%]">
            {/* Project Name and Creator */}
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-4xl font-bold text-gray-900 capitalize">
                {project.name}
              </h1>
              <span className="text-2xl text-gray-600 font-bold">
                by {project.metadata?.teamMembers?.[0]?.name || 'Anonymous'}
              </span>
            </div>

            {/* Project Tagline */}
            <p className="text-2xl italic text-gray-800">
              {project.metadata?.tagline || project.description}
            </p>

            {/* Project Description */}
            <p className="text-lg text-gray-600 leading-relaxed">
              {project.description}
            </p>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-medium transition-colors text-sm flex items-center justify-center">
                <Coins className="h-4 w-4 mr-2" />
                Tip Project
              </button>
              {(project.metadata?.website || project.metadata?.demoUrl) && (
                <a
                  href={project.metadata?.website || project.metadata?.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground px-6 py-3 rounded-full font-medium transition-colors text-sm flex items-center justify-center"
                >
                  {project.metadata?.website ? (
                    <>
                      <Globe className="h-4 w-4 mr-2" />
                      Visit Project
                    </>
                  ) : (
                    <>
                  <Play className="h-4 w-4 mr-2" />
                      Demo Project
                    </>
                  )}
                </a>
              )}
            </div>

            {/* Key Features */}
            {project.metadata?.keyFeatures && project.metadata.keyFeatures.length > 0 && (
              <div className="mt-6">
                <div className="flex flex-wrap gap-4">
                  {project.metadata.keyFeatures.slice(0, 2).map((feature, idx) => (
                    <span
                      key={idx}
                      className="px-6 py-3 bg-gray-100 text-gray-700 text-lg rounded-full"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Created Date */}
            <div className="mt-4">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Created {formatDate(project.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Right Part - Phone Mockup */}
          <div className="flex justify-center lg:justify-end mt-[10%] relative">
            {/* Overlay Card */}
            <div className="absolute top-[80%] left-[40%] transform -translate-x-1/2 z-10 rounded-lg shadow-lg border overflow-hidden w-[75%]">
              <div className="flex items-center justify-between h-full">
                {/* Left half - White background for Contracts */}
                <div className="flex-1 bg-white p-4 flex flex-col items-center">
                  <span className="text-sm font-medium text-gray-700 mb-2">Contracts</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-gray-900">
                      {project.contracts?.length || 0}
                    </span>
                    <TrendingUp className="h-4 w-4 text-black" />
                  </div>
                </div>
                
                {/* Vertical Separator Line */}
                <div className="border-l border-gray-400 h-16"></div>
                
                {/* Right half - Gray background for Milestones */}
                <div className="flex-1 bg-gray-800 p-4 flex flex-col items-center">
                  <span className="text-sm font-medium text-white mb-2">Milestones</span>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-white" />
                    <span className="text-2xl font-bold text-white">
                      {project.metadata?.milestones?.length || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <PhoneFrame src="" alt="Project Preview">
              <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                {/* Phone Content - Project Profile Style */}
                <div className="h-full flex flex-col pt-[-5%]">
                  {/* Header with Project Logo */}
                  <div className="flex items-center justify-end mb-4">
                    <div className="border border-gray-300 rounded-full p-1">
                      <ProjectLogo 
                        logo={project.metadata?.logo} 
                        name={project.name} 
                        verified={true}
                        size="sm"
                      />
                    </div>
                  </div>

                  {/* CELO Amount */}
                  <div className="text-center mb-6">
                    <div className="text-2xl font-bold text-gray-900">
                      ${projectCampaigns ? 
                        projectCampaigns.filter((c): c is NonNullable<typeof c> => c !== null)
                          .reduce((sum, c) => 
                            sum + parseFloat(formatEther(c.participation?.fundsReceived || 0n)), 0
                          ).toFixed(2) 
                        : '0.00'} CELO
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex justify-center mb-4">
                    <div className="flex bg-gray-200 rounded-lg p-1">
                      <button className="px-3 py-1 text-xs font-medium text-white bg-black rounded-md">
                        Analytics
                      </button>
                      <button className="px-3 py-1 text-xs font-medium text-gray-600">
                        Milestones
                      </button>
                      <button className="px-3 py-1 text-xs font-medium text-gray-600">
                        Bio
                      </button>
                    </div>
                  </div>

                  {/* Analytics Content */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tips</span>
                      <span className="font-bold text-black">
                        {projectCampaigns ? 
                          projectCampaigns.filter((c): c is NonNullable<typeof c> => c !== null)
                            .reduce((sum, c) => 
                              sum + parseFloat(formatEther(c.participation?.fundsReceived || 0n)), 0
                            ).toFixed(1) 
                          : '0.0'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Campaigns</span>
                      <span className="font-bold text-black">
                        {project.campaignIds?.length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Votes</span>
                      <span className="font-bold text-black">
                        {projectCampaigns ? 
                          projectCampaigns.filter((c): c is NonNullable<typeof c> => c !== null)
                            .reduce((sum, c) => 
                              sum + parseFloat(formatEther(c.participation?.voteCount || 0n)), 0
                            ).toFixed(0) 
                          : '0'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </PhoneFrame>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Project Header */}
        

     
 
        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabId)} className="mb-6 sm:mb-8">
          <TabsList className="bg-white/60 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-2 w-full justify-start h-20">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-3 px-4 py-4 text-base font-medium whitespace-nowrap data-[state=active]:bg-gray-100 data-[state=active]:text-gray-700 data-[state=active]:border-gray-300 data-[state=active]:shadow-sm h-16 flex-1"
              >
                <div className="p-1.5 rounded-lg bg-gray-100 data-[state=active]:bg-gray-200">
                  <tab.icon className="h-5 w-5" />
                </div>
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="bg-gray-200 text-gray-700 text-sm px-3 py-1 rounded-full font-semibold">
                    {tab.badge}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
 
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-4 sm:gap-8">
          {/* Main Content */}
          <div className="space-y-8">
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-8">
              {/* Single Transparent Card with Professional Description */}
              <div className="bg-white/30 backdrop-blur-md rounded-3xl shadow-xl border border-white/20 p-8 sm:p-12 relative">
                {/* Social Media Icons - Top Right Corner */}
                {(project.metadata?.twitter || project.metadata?.linkedin || project.metadata?.discord || 
                  project.metadata?.telegram || project.metadata?.youtube || project.metadata?.instagram || 
                  project.metadata?.contactEmail) && (
                  <div className="absolute top-6 right-6 flex gap-2">
                    {project.metadata?.twitter && (
                      <a 
                        href={project.metadata.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                        title="Follow on Twitter"
                      >
                        <Twitter className="h-5 w-5" />
                      </a>
                    )}
                    
                    {project.metadata?.contactEmail && (
                      <a 
                        href={`mailto:${project.metadata.contactEmail}`}
                        className="flex items-center justify-center w-10 h-10 bg-gray-500 hover:bg-gray-600 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                        title="Contact via Email"
                      >
                        <Mail className="h-5 w-5" />
                      </a>
                    )}
                    
                    {project.metadata?.linkedin && (
                      <a 
                        href={project.metadata.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                        title="Connect on LinkedIn"
                      >
                        <Linkedin className="h-5 w-5" />
                        </a>
                      )}
                    
                    {project.metadata?.discord && (
                      <a 
                        href={project.metadata.discord}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 bg-purple-500 hover:bg-purple-600 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                        title="Join Discord"
                      >
                        <MessageCircle className="h-5 w-5" />
                      </a>
                    )}
                    
                    {project.metadata?.telegram && (
                      <a 
                        href={project.metadata.telegram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 bg-blue-400 hover:bg-blue-500 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                        title="Join Telegram"
                      >
                        <Send className="h-5 w-5" />
                      </a>
                    )}

                    {project.metadata?.youtube && (
                      <a 
                        href={project.metadata.youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                        title="Subscribe on YouTube"
                      >
                        <Video className="h-5 w-5" />
                      </a>
                    )}

                    {project.metadata?.instagram && (
                      <a 
                        href={project.metadata.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 bg-pink-500 hover:bg-pink-600 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                        title="Follow on Instagram"
                      >
                        <Camera className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                )}

                <div className="prose prose-lg prose-gray max-w-none">
                  <p className="text-gray-800 leading-relaxed text-lg mb-6">
                    <strong>{project.name}</strong> has participated in <strong>{project.campaignIds?.length || 0} campaign{project.campaignIds?.length === 1 ? '' : 's'}</strong> and has raised <strong>{projectCampaigns ? 
                      projectCampaigns.filter((c): c is NonNullable<typeof c> => c !== null)
                        .reduce((sum, c) => 
                          sum + parseFloat(formatEther(c.participation?.fundsReceived || 0n)), 0
                        ).toFixed(2) 
                      : '0.00'} CELO</strong> in total funding.
                  </p>
                  
                  {project.metadata?.category && project.metadata?.projectType && (
                    <p className="text-gray-800 leading-relaxed text-lg mb-6">
                      It is a <strong>{project.metadata.projectType}</strong> under the <strong>{project.metadata.category}</strong> category.
                    </p>
                  )}
                  
                  {project.metadata?.maturityLevel && (
                    <p className="text-gray-800 leading-relaxed text-lg mb-6">
                      The project has reached a <strong>{project.metadata.maturityLevel}</strong> maturity level.
                    </p>
                  )}
                  
                  {project.metadata?.techStack && project.metadata.techStack.length > 0 && (
                    <p className="text-gray-800 leading-relaxed text-lg mb-6">
                      Built with <strong>{project.metadata.techStack.join(', ')}</strong> technology stack.
                    </p>
                  )}
                  
                  {project.transferrable !== undefined && (
                    <p className="text-gray-800 leading-relaxed text-lg mb-6">
                      The project is <strong>{project.transferrable ? 'transferrable' : 'non-transferrable'}</strong> and is currently <strong>{project.active ? 'active' : 'inactive'}</strong>.
                    </p>
                  )}
                  
                  {project.metadata?.innovation && (
                    <p className="text-gray-800 leading-relaxed text-lg mb-6">
                      <strong>Innovation:</strong> {project.metadata.innovation}
                    </p>
                  )}
                  
                  {project.metadata?.targetAudience && (
                    <p className="text-gray-800 leading-relaxed text-lg mb-6">
                      <strong>Target Audience:</strong> {project.metadata.targetAudience}
                    </p>
                  )}
                  
                  {project.metadata?.useCases && project.metadata.useCases.length > 0 && (
                    <p className="text-gray-800 leading-relaxed text-lg mb-6">
                      <strong>Use Cases:</strong> {project.metadata.useCases.join(', ')}.
                    </p>
                  )}
                  
                  {project.metadata?.establishedDate && (
                    <p className="text-gray-800 leading-relaxed text-lg mb-6">
                      <strong>Established:</strong> {formatYear(project.metadata.establishedDate)}
                    </p>
                  )}
                  
                  {project.metadata?.milestones && project.metadata.milestones.length > 0 && (
                    <p className="text-gray-800 leading-relaxed text-lg mb-6">
                      <strong>Current Milestones:</strong> {project.metadata.milestones.filter(m => m.status === 'in-progress').length > 0 ? 
                        project.metadata.milestones.filter(m => m.status === 'in-progress').map(m => m.title).join(', ') + ' in progress' :
                        'No active milestones at this time'
                      }.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
 
            {/* Campaigns Tab */}
            <TabsContent value="campaigns" className="space-y-6">
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
                                  onClick={() => openVoteModal(campaign.id.toString())}
                                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                  Go to Campaign
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
            </TabsContent>
 
            {/* Technical Tab */}
            <TabsContent value="technical" className="space-y-8">
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
            </TabsContent>
 
            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-8">
                {/* Analytics Summary */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-6 mb-4">
                  <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Project Analytics
                  </h3>
                  <p className="text-lg text-gray-700 mb-4 font-serif">
                    {project.name} has participated in <span className="font-bold text-blue-600">{project.campaignIds?.length || 0}</span> campaign{project.campaignIds?.length === 1 ? '' : 's'}, raising a total of <span className="font-bold text-green-600">{projectCampaigns ? projectCampaigns.filter((c): c is NonNullable<typeof c> => c !== null).reduce((sum, c) => sum + parseFloat(formatEther(c.participation?.fundsReceived || 0n)), 0).toFixed(2) : '0.00'} CELO</span> and receiving <span className="font-bold text-purple-600">{projectCampaigns ? projectCampaigns.filter((c): c is NonNullable<typeof c> => c !== null).reduce((sum, c) => sum + parseFloat(formatEther(c.participation?.voteCount || 0n)), 0).toFixed(1) : '0.0'}</span> votes from the community. Dive into the stats below to see how this project is performing!
                  </p>
                  {/* Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
                    <div className="p-4 rounded-xl border bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 text-center shadow-sm">
                      <div className="flex items-center justify-center mb-1"><Trophy className="h-5 w-5 text-blue-500" /></div>
                      <div className="text-2xl font-bold text-blue-700">{project.campaignIds?.length || 0}</div>
                      <div className="text-xs text-blue-700 font-medium">Campaigns</div>
                    </div>
                    <div className="p-4 rounded-xl border bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 text-center shadow-sm">
                      <div className="flex items-center justify-center mb-1"><Coins className="h-5 w-5 text-green-500" /></div>
                      <div className="text-2xl font-bold text-green-700">{projectCampaigns ? projectCampaigns.filter((c): c is NonNullable<typeof c> => c !== null).reduce((sum, c) => sum + parseFloat(formatEther(c.participation?.fundsReceived || 0n)), 0).toFixed(2) : '0.00'} <span className='text-xs'>CELO</span></div>
                      <div className="text-xs text-green-700 font-medium">Total Funding</div>
                    </div>
                    <div className="p-4 rounded-xl border bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 text-center shadow-sm">
                      <div className="flex items-center justify-center mb-1"><Vote className="h-5 w-5 text-purple-500" /></div>
                      <div className="text-2xl font-bold text-purple-700">{projectCampaigns ? projectCampaigns.filter((c): c is NonNullable<typeof c> => c !== null).reduce((sum, c) => sum + parseFloat(formatEther(c.participation?.voteCount || 0n)), 0).toFixed(1) : '0.0'}</div>
                      <div className="text-xs text-purple-700 font-medium">Total Votes</div>
                    </div>
                  </div>
                </div>
                {/* ... existing campaign performance ... */}
            </TabsContent>

            {/* Admin Tab */}
            {isOwner && (
              <TabsContent value="admin" className="space-y-8">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Crown className="h-6 w-6 text-red-600" />
                </div>
                    Admin Actions
              </h3>
              
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl border border-red-200">
                      <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                        <Edit className="h-5 w-5" />
                        Project Management
                      </h4>
                      <div className="space-y-3">
                        <button className="w-full flex items-center justify-center gap-2 p-3 bg-white hover:bg-gray-50 rounded-lg border border-red-200 text-red-700 hover:text-red-800 transition-colors">
                          <Edit className="h-4 w-4" />
                          Edit Project Details
                        </button>
                        <button className="w-full flex items-center justify-center gap-2 p-3 bg-white hover:bg-gray-50 rounded-lg border border-red-200 text-red-700 hover:text-red-800 transition-colors">
                   <Trophy className="h-4 w-4" />
                          Manage Campaigns
                        </button>
                        <button className="w-full flex items-center justify-center gap-2 p-3 bg-white hover:bg-gray-50 rounded-lg border border-red-200 text-red-700 hover:text-red-800 transition-colors">
                          <Users className="h-4 w-4" />
                          Manage Team
                        </button>
             </div>
           </div>

                    <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                      <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Project Settings
                      </h4>
             <div className="space-y-3">
                        <button className="w-full flex items-center justify-center gap-2 p-3 bg-white hover:bg-gray-50 rounded-lg border border-amber-200 text-amber-700 hover:text-amber-800 transition-colors">
                          <Lock className="h-4 w-4" />
                          Transfer Ownership
                        </button>
                        <button className="w-full flex items-center justify-center gap-2 p-3 bg-white hover:bg-gray-50 rounded-lg border border-amber-200 text-amber-700 hover:text-amber-800 transition-colors">
                          <Activity className="h-4 w-4" />
                          Toggle Active Status
                        </button>
                        <button className="w-full flex items-center justify-center gap-2 p-3 bg-red-100 hover:bg-red-200 rounded-lg border border-red-300 text-red-700 hover:text-red-800 transition-colors">
                          <X className="h-4 w-4" />
                          Archive Project
                        </button>
                   </div>
                   </div>
                   </div>
                   </div>
              </TabsContent>
            )}
           </div>
           
         
       </div>
        </Tabs>

     {/* Share Modal */}
     {showShareModal && (
       <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
         <div className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-md shadow-2xl border border-white/20 md:rounded-3xl md:max-w-md md:p-8 p-0 h-full md:h-auto overflow-y-auto transition-all duration-300 mt-4 sm:mt-8 lg:mt-16 mb-4">
           <div className="p-8 md:p-8 p-6">
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

     

     {/* Bottom Navigation for Mobile */}
     <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-gray-200/50 shadow-lg flex justify-around items-center py-2 px-2 md:hidden">
       {tabs.map((tab) => (
         <button
           key={tab.id}
           onClick={() => setActiveTab(tab.id)}
           className={`flex flex-col items-center justify-center flex-1 px-2 py-1 transition-all duration-200 ${
             activeTab === tab.id ? 'text-blue-600' : 'text-gray-500'
           }`}
           aria-label={tab.label}
         >
           <div className={`p-2 rounded-full ${activeTab === tab.id ? 'bg-blue-100' : 'bg-gray-100'}`}> 
             <tab.icon className="h-5 w-5" />
           </div>
           <span className="text-xs mt-1 font-medium">{tab.label}</span>
           {tab.badge !== undefined && tab.badge > 0 && (
             <span className="bg-blue-100 text-blue-600 text-[10px] px-1.5 py-0.5 rounded-full font-semibold mt-0.5">
               {tab.badge}
             </span>
           )}
         </button>
       ))}
     </div>
     </div>
   </div>
 );
}