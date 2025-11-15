import { useState,  useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { parseIdParam, getCampaignRoute } from '@/utils/hashids';
import { useAccount } from 'wagmi';
import type { Address } from 'viem';
import { formatEther } from 'viem';
import { 
  Globe,
  Calendar,
 
  CheckCircle,
 
  Share2,
  Users,
  Trophy,
 
  Shield,
  Copy,
  Twitter,
  Linkedin,
  Mail,
  MessageCircle,
 
  Send,
  Terminal,
  X,
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
  Activity,
 
  BarChart3,
  Gauge,
  Clock,
  Rocket,
  Search,
  Camera,
  Lock,
  ChevronRight,
  ListChecks,
  Plus,
} from 'lucide-react';
import { Github, Award } from 'lucide-react';

import { useProjectDetails, useProjectCampaigns, useUpdateProjectMetadata } from '@/hooks/useProjectMethods';
import TipModal from '@/components/TipModal';
import DynamicHelmet from '@/components/DynamicHelmet';
import { formatIpfsUrl } from '@/utils/imageUtils';
import ProjectCampaignsModal from '@/components/modals/ProjectCampaignsModal';
import CreateProjectMilestoneModal from '@/components/modals/CreateProjectMilestoneModal';
import PhoneFrame from '@/components/PhoneFrame';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import TruncatedText from '@/components/TruncatedText';
import { useProjectMilestones, ProjectMilestoneStatus, ProjectMilestoneType } from '@/hooks/useProjectMilestones';
import MilestoneActions from '@/components/MilestoneActions';

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

type TabId = 'overview' | 'campaigns' | 'milestones' | 'technical' | 'team' | 'analytics' | 'admin';

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

const ProjectLogo: React.FC<ProjectLogoProps> = ({ logo, name, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-20 h-20 text-2xl',
    lg: 'w-32 h-32 text-4xl'
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
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [showCreateMilestoneModal, setShowCreateMilestoneModal] = useState(false);
  
  // Data
  const contractAddress = import.meta.env.VITE_CONTRACT_V4 as Address;
  const parsedId = parseIdParam(id);
  const projectId = parsedId ? BigInt(parsedId) : BigInt(0);
  const { project, projectCampaigns, isLoading, error, refetch } = useProjectData(projectId, contractAddress);
  const { milestones, isLoading: isLoadingMilestones } = useProjectMilestones(projectId, !!projectId);
  // Raw project details for direct access to metadata strings to avoid data loss on update
  const { projectDetails: rawDetails } = useProjectDetails(contractAddress, projectId);
  const { updateProjectMetadata, isPending: isUpdatingGithub } = useUpdateProjectMetadata(contractAddress);
  const [showSetGithub, setShowSetGithub] = useState<boolean>(false);
  const [newGithub, setNewGithub] = useState<string>('');
  const [githubSaveError, setGithubSaveError] = useState<string>('');
  const [githubSaved, setGithubSaved] = useState<boolean>(false);
  
  // Check if user is owner
  const isOwner = isConnected && address && project && address.toLowerCase() === project.owner?.toLowerCase();
  
  // Constants
  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'campaigns', label: 'Campaigns', icon: Trophy, badge: project?.campaignIds?.length || 0 },
    { id: 'milestones', label: 'Milestones', icon: ListChecks, badge: milestones?.length || 0 },
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

  const normalizedGithub = (() => {
    const value = project?.metadata?.githubRepo?.trim();
    if (!value) return '';
    const hasProtocol = value.startsWith('http://') || value.startsWith('https://');
    const hasGithubDomain = value.includes('github.com');
    const looksLikeSlug = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(value);
    if (hasProtocol) return value;
    if (hasGithubDomain) return `https://${value}`;
    if (looksLikeSlug) return `https://github.com/${value.replace(/\/$/, '')}`;
    return `https://${value}`;
  })();

  const normalizeGithubInput = (value: string) => {
    const trimmed = (value || '').trim();
    if (!trimmed) return '';
    const hasProtocol = trimmed.startsWith('http://') || trimmed.startsWith('https://');
    const hasGithubDomain = trimmed.includes('github.com');
    const looksLikeSlug = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(trimmed);
    if (hasProtocol) return trimmed;
    if (hasGithubDomain) return `https://${trimmed}`;
    if (looksLikeSlug) return `https://github.com/${trimmed.replace(/\/$/, '')}`;
    return `https://${trimmed}`;
  };

  const handleSaveGithub = async () => {
    try {
      setGithubSaveError('');
      setGithubSaved(false);
      const url = normalizeGithubInput(newGithub);
      if (!url) {
        setGithubSaveError('Please enter a valid GitHub URL');
        return;
      }
      // Read current on-chain additionalData JSON string to preserve all fields
      const currentAdditional = rawDetails?.metadata?.additionalData || '{}';
      let additionalObj: any = {};
      try { additionalObj = JSON.parse(currentAdditional); } catch {}
      // Merge github at both normalized links and legacy top-level for compatibility
      additionalObj.githubRepo = url;
      additionalObj.links = {
        ...(additionalObj.links || {}),
        githubRepo: url
      };
      const newAdditionalJson = JSON.stringify(additionalObj);
      await updateProjectMetadata({
        projectId,
        metadataType: 3,
        newData: newAdditionalJson
      });
      setGithubSaved(true);
      setShowSetGithub(false);
      setNewGithub('');
      // Refresh view
      await refetch();
    } catch (e: any) {
      setGithubSaveError(e?.message || 'Failed to save GitHub URL');
    }
  };

  const openVoteModal = (campaignId: string) => {
    navigate(getCampaignRoute(Number(campaignId)));
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
    <>
    {/* Dynamic Metadata */}
    <DynamicHelmet 
      config={{
        title: project?.name || 'Project',
        description: project?.metadata?.tagline || project?.description || 'Discover this innovative project on Sovereign Seas',
        image: project?.metadata?.logo ? formatIpfsUrl(project.metadata.logo) : '/og-image.png',
        url: window.location.href,
        type: 'website'
      }}
    />
    
    <div className="min-h-screen relative overflow-x-hidden">
      {/* New Hero Section */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 items-start">
          {/* Left Part */}
          <div className="space-y-3 sm:space-y-6 mt-[2%] sm:mt-[15%] relative">
            {/* Project Logo - Mobile Only */}
            <div className="absolute top-0 right-0 sm:hidden">
              <div className="border border-gray-300 rounded-full p-1">
                <ProjectLogo 
                  logo={project.metadata?.logo} 
                  name={project.name} 
                  verified={true}
                  size="sm"
                />
              </div>
            </div>

            {/* Quick Links Row: GitHub and KarmaGAP */}
            <div className="mt-2 sm:mt-4 flex items-center gap-2 sm:gap-3">
              {normalizedGithub && (
                <a
                  href={normalizedGithub}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs sm:text-sm transition-colors"
                  title="View GitHub"
                >
                  <Github className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">GitHub</span>
                </a>
              )}
              {project.metadata?.karmaGapProfile && (
                <a
                  href={project.metadata.karmaGapProfile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs sm:text-sm transition-colors"
                  title="View Karma GAP"
                >
                  <Award className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Karma GAP</span>
                </a>
              )}
            </div>

            {/* Project Name and Creator */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mb-2">
              <h1 className="text-sm sm:text-3xl font-bold text-gray-900 capitalize">
                {project.name}
              </h1>
              <span className="text-sm sm:text-2xl text-gray-600 font-bold">
                by {project.metadata?.teamMembers?.[0]?.name || 'Anonymous'}
              </span>
            </div>

            {/* Project Tagline */}
            <p className="text-xs sm:text-xl italic text-gray-800">
              {project.metadata?.tagline || project.description}
            </p>

            {/* Mobile Stats - Hidden on Desktop */}
            <div className="sm:hidden space-y-1">
              {/* CELO Amount */}
              <div className="flex justify-end">
                <div className="text-xs text-blue-600 font-medium">
                  ${projectCampaigns ? 
                    projectCampaigns.filter((c): c is NonNullable<typeof c> => c !== null)
                      .reduce((sum, c) => 
                        sum + parseFloat(formatEther(c.participation?.fundsReceived || 0n)), 0
                      ).toFixed(2) 
                    : '0.00'} CELO received
                </div>
              </div>

              {/* Stats in one line */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Tips: <span className="font-bold text-black">
                    {projectCampaigns ? 
                      projectCampaigns.filter((c): c is NonNullable<typeof c> => c !== null)
                        .reduce((sum, c) => 
                          sum + parseFloat(formatEther(c.participation?.fundsReceived || 0n)), 0
                        ).toFixed(1) 
                      : '0.0'}
                  </span>
                </span>
                <span className="text-gray-600">
                  Campaigns: <span className="font-bold text-black">
                    {project.campaignIds?.length || 0}
                  </span>
                </span>
                <span className="text-gray-600">
                  Votes: <span className="font-bold text-black">
                    {projectCampaigns ? 
                      projectCampaigns.filter((c): c is NonNullable<typeof c> => c !== null)
                        .reduce((sum, c) => 
                          sum + parseFloat(formatEther(c.participation?.voteCount || 0n)), 0
                        ).toFixed(0) 
                      : '0'}
                  </span>
                </span>
              </div>
            </div>

            {/* Project Description - Desktop Only */}
            <div className="hidden sm:block">
              <TruncatedText
                text={project.description}
                maxLength={200}
                className="text-xs sm:text-lg text-gray-600 leading-relaxed"
                showIcon={true}
                expandText="Show more"
                collapseText="Show less"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-row gap-2 sm:gap-4">
              <button 
                onClick={() => setIsTipModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-6 py-1.5 sm:py-3 rounded-full font-medium transition-colors text-xs sm:text-sm flex items-center justify-center flex-1 sm:flex-none"
              >
                <Coins className="h-2.5 w-2.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Tip Project</span>
                <span className="sm:hidden">Tip</span>
              </button>
              {(project.metadata?.website || project.metadata?.demoUrl) && (
                <a
                  href={project.metadata?.website || project.metadata?.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground px-2 sm:px-6 py-1.5 sm:py-3 rounded-full font-medium transition-colors text-xs sm:text-sm flex items-center justify-center flex-1 sm:flex-none"
                >
                  {project.metadata?.website ? (
                    <>
                      <Globe className="h-2.5 w-2.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Visit Project</span>
                      <span className="sm:hidden">Visit</span>
                    </>
                  ) : (
                    <>
                  <Play className="h-2.5 w-2.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Demo Project</span>
                      <span className="sm:hidden">Demo</span>
                    </>
                  )}
                </a>
              )}
            </div>

            {/* Created Date */}
            <div className="mt-1 sm:mt-4">
              <div className="flex items-center gap-1 sm:gap-2 text-gray-600">
                <Calendar className="h-2.5 w-2.5 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm font-medium">
                  Created {formatDate(project.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Right Part - Phone Mockup - Hidden on mobile */}
          <div className="hidden lg:flex justify-center lg:justify-end mt-[10%] relative">
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
        

     
 
        {/* Navigation Tabs - Hidden on Mobile */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabId)} className="mb-2 sm:mb-8">
          <TabsList className="hidden sm:flex bg-white/60 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-2 w-full justify-start h-20">
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
            <TabsContent value="overview" className="space-y-4 sm:space-y-8">
              {/* Mobile: No Card, Desktop: Card */}
              <div className="sm:bg-white/30 sm:backdrop-blur-md sm:rounded-3xl sm:shadow-xl sm:border sm:border-white/20 sm:p-8 sm:p-12 relative">
                {/* Social Media Icons - Top Right Corner */}
                {(project.metadata?.twitter || project.metadata?.linkedin || project.metadata?.discord || 
                  project.metadata?.telegram || project.metadata?.youtube || project.metadata?.instagram || 
                  project.metadata?.contactEmail) && (
                  <div className="absolute top-2 right-2 sm:top-6 sm:right-6 flex gap-1 sm:gap-2">
                    {project.metadata?.twitter && (
                      <a 
                        href={project.metadata.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                        title="Follow on Twitter"
                      >
                        <Twitter className="h-4 w-4 sm:h-5 sm:w-5" />
                      </a>
                    )}
                    
                    {project.metadata?.contactEmail && (
                      <a 
                        href={`mailto:${project.metadata.contactEmail}`}
                        className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gray-500 hover:bg-gray-600 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                        title="Contact via Email"
                      >
                        <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
                      </a>
                    )}
                    
                    {project.metadata?.linkedin && (
                      <a 
                        href={project.metadata.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                        title="Connect on LinkedIn"
                      >
                        <Linkedin className="h-4 w-4 sm:h-5 sm:w-5" />
                        </a>
                      )}
                    
                    {project.metadata?.discord && (
                      <a 
                        href={project.metadata.discord}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-purple-500 hover:bg-purple-600 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                        title="Join Discord"
                      >
                        <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                      </a>
                    )}
                    
                    {project.metadata?.telegram && (
                      <a 
                        href={project.metadata.telegram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-blue-400 hover:bg-blue-500 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                        title="Join Telegram"
                      >
                        <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                      </a>
                    )}

                    {project.metadata?.youtube && (
                      <a 
                        href={project.metadata.youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                        title="Subscribe on YouTube"
                      >
                        <Video className="h-4 w-4 sm:h-5 sm:w-5" />
                      </a>
                    )}

                    {project.metadata?.instagram && (
                      <a 
                        href={project.metadata.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-pink-500 hover:bg-pink-600 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                        title="Follow on Instagram"
                      >
                        <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
                      </a>
                    )}
                  </div>
                )}

                <div className="prose prose-sm sm:prose-lg prose-gray max-w-none">
                  <p className="text-gray-800 leading-relaxed text-sm sm:text-lg mb-3 sm:mb-6">
                    <strong>{project.name}</strong> has participated in <strong>{project.campaignIds?.length || 0} campaign{project.campaignIds?.length === 1 ? '' : 's'}</strong> and has raised <strong>{projectCampaigns ? 
                      projectCampaigns.filter((c): c is NonNullable<typeof c> => c !== null)
                        .reduce((sum, c) => 
                          sum + parseFloat(formatEther(c.participation?.fundsReceived || 0n)), 0
                        ).toFixed(2) 
                      : '0.00'} CELO</strong> in total funding.
                  </p>
                  
                  {project.metadata?.category && project.metadata?.projectType && (
                    <p className="text-gray-800 leading-relaxed text-sm sm:text-lg mb-3 sm:mb-6">
                      It is a <strong>{project.metadata.projectType}</strong> under the <strong>{project.metadata.category}</strong> category.
                    </p>
                  )}
                  
                  {project.metadata?.maturityLevel && (
                    <p className="text-gray-800 leading-relaxed text-sm sm:text-lg mb-3 sm:mb-6">
                      The project has reached a <strong>{project.metadata.maturityLevel}</strong> maturity level.
                    </p>
                  )}
                  
                  {project.metadata?.techStack && project.metadata.techStack.length > 0 && (
                    <p className="text-gray-800 leading-relaxed text-sm sm:text-lg mb-3 sm:mb-6">
                      Built with <strong>{project.metadata.techStack.join(', ')}</strong> technology stack.
                    </p>
                  )}
                  
                  {project.metadata?.keyFeatures && project.metadata.keyFeatures.length > 0 && (
                    <p className="text-gray-800 leading-relaxed text-sm sm:text-lg mb-3 sm:mb-6">
                      <strong>The key features include but are not limited to </strong> {project.metadata.keyFeatures.join(', ')}.
                    </p>
                  )}
                  
                  {project.transferrable !== undefined && (
                    <p className="text-gray-800 leading-relaxed text-sm sm:text-lg mb-3 sm:mb-6">
                      The project is <strong>{project.transferrable ? 'transferrable' : 'non-transferrable'}</strong> and is currently <strong>{project.active ? 'active' : 'inactive'}</strong>.
                    </p>
                  )}
                  
                  {project.metadata?.innovation && (
                    <p className="text-gray-800 leading-relaxed text-sm sm:text-lg mb-3 sm:mb-6">
                      <strong>Innovation:</strong> {project.metadata.innovation}
                    </p>
                  )}
                  
                  {project.metadata?.targetAudience && (
                    <p className="text-gray-800 leading-relaxed text-sm sm:text-lg mb-3 sm:mb-6">
                      <strong>Target Audience:</strong> {project.metadata.targetAudience}
                    </p>
                  )}
                  
                  {project.metadata?.useCases && project.metadata.useCases.length > 0 && (
                    <p className="text-gray-800 leading-relaxed text-sm sm:text-lg mb-3 sm:mb-6">
                      <strong>Use Cases:</strong> {project.metadata.useCases.join(', ')}.
                    </p>
                  )}
                  
                  {project.metadata?.establishedDate && (
                    <p className="text-gray-800 leading-relaxed text-sm sm:text-lg mb-3 sm:mb-6">
                      <strong>Established:</strong> {formatYear(project.metadata.establishedDate)}
                    </p>
                  )}
                  
                  {project.metadata?.milestones && project.metadata.milestones.length > 0 && (
                    <p className="text-gray-800 leading-relaxed text-sm sm:text-lg mb-3 sm:mb-6">
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
            <TabsContent value="campaigns" className="space-y-4 sm:space-y-6">
                {projectCampaigns && projectCampaigns.length > 0 ? (
                  <div className="sm:bg-white/70 sm:backdrop-blur-sm sm:rounded-2xl sm:shadow-lg sm:border sm:border-white/20 sm:p-8">
                    <div className="space-y-4 sm:space-y-6">
                      {projectCampaigns?.filter((campaign): campaign is NonNullable<typeof campaign> => campaign !== null).map((campaign) => {
                        const styling = getCampaignStatusStyling(campaign.status);
                        
                        return (
                          <div
                            key={campaign.id.toString()}
                            className={`p-3 sm:p-6 sm:rounded-xl sm:border ${styling.bgClass} sm:hover:shadow-lg transition-all duration-200 sm:backdrop-blur-sm border-b border-gray-200 sm:border-b-0`}
                          >
                            <div className="flex items-start justify-between mb-3 sm:mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                                  <h3 className="font-bold text-gray-900 text-base sm:text-lg">{campaign.name}</h3>
                                  <div className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 sm:gap-1.5 ${styling.textClass} bg-white/50`}>
                                    <styling.icon className="w-3 h-3" />
                                    {styling.label}
                                  </div>
                                </div>
                                <TruncatedText
                                  text={campaign.description}
                                  maxLength={250}
                                  className="text-gray-600 mb-3 sm:mb-4 leading-relaxed text-sm sm:text-base"
                                  showIcon={true}
                                  expandText="Read more"
                                  collapseText="Read less"
                                />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                              <div className="text-center">
                                <p className="text-xs text-gray-500 mb-1">Total Funds</p>
                                <p className="font-bold text-green-600 text-sm sm:text-lg">
                                  {parseFloat(formatEther(campaign.totalFunds)).toFixed(2)} CELO
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-500 mb-1">Your Votes</p>
                                <p className="font-bold text-blue-600 text-sm sm:text-lg">
                                  {parseFloat(formatEther(campaign.participation?.voteCount || 0n)).toFixed(1)}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-500 mb-1">Max Winners</p>
                                <p className="font-bold text-purple-600 text-sm sm:text-lg">
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
                            
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                              <button
                                onClick={() => navigate(getCampaignRoute(Number(campaign.id)))}
                                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white/80 border border-gray-200 text-gray-700 rounded-lg hover:bg-white hover:shadow-md transition-all duration-200 font-medium text-sm sm:text-base"
                              >
                                <Eye className="h-4 w-4" />
                                View Campaign
                              </button>
                              {campaign.status === 'active' && (
                                <button
                                  onClick={() => openVoteModal(campaign.id.toString())}
                                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md text-sm sm:text-base"
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
                  <div className="sm:bg-white/70 sm:backdrop-blur-sm sm:rounded-2xl sm:shadow-lg sm:border sm:border-white/20 sm:p-12 text-center p-6">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                      <Trophy className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">No Active Campaigns</h3>
                    <p className="text-gray-600 mb-4 sm:mb-6 max-w-md mx-auto text-sm sm:text-base">
                      This project hasn't joined any campaigns yet. Check back later for funding opportunities.
                    </p>
                    <button
                      onClick={() => navigate('/campaigns')}
                      className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-medium text-sm sm:text-base"
                    >
                      <Search className="h-4 w-4" />
                      Browse Campaigns
                    </button>
                  </div>
                )}
            </TabsContent>

            {/* Milestones Tab */}
            <TabsContent value="milestones" className="space-y-4 sm:space-y-6">
              {isLoadingMilestones ? (
                <div className="sm:bg-white/70 sm:backdrop-blur-sm sm:rounded-2xl sm:shadow-lg sm:border sm:border-white/20 sm:p-12 text-center p-6">
                  <div className="flex items-center justify-center">
                    <Clock className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-600">Loading milestones...</span>
                  </div>
                </div>
              ) : milestones && milestones.length > 0 ? (
                <div className="sm:bg-white/70 sm:backdrop-blur-sm sm:rounded-2xl sm:shadow-lg sm:border sm:border-white/20 sm:p-8">
                  <div className="space-y-4 sm:space-y-6">
                    {milestones.map((milestone) => {
                      const statusColors = {
                        [ProjectMilestoneStatus.DRAFT]: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
                        [ProjectMilestoneStatus.ACTIVE]: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Active' },
                        [ProjectMilestoneStatus.CLAIMED]: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Claimed' },
                        [ProjectMilestoneStatus.SUBMITTED]: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Submitted' },
                        [ProjectMilestoneStatus.APPROVED]: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
                        [ProjectMilestoneStatus.REJECTED]: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
                        [ProjectMilestoneStatus.PAID]: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Paid' },
                        [ProjectMilestoneStatus.CANCELLED]: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Cancelled' },
                      };
                      const statusInfo = statusColors[milestone.status] || statusColors[ProjectMilestoneStatus.DRAFT];
                      const typeLabels = {
                        [ProjectMilestoneType.INTERNAL]: 'Internal',
                        [ProjectMilestoneType.ASSIGNED]: 'Assigned',
                        [ProjectMilestoneType.OPEN]: 'Open',
                      };

                      return (
                        <div
                          key={milestone.id.toString()}
                          className="p-4 sm:p-6 rounded-xl border border-gray-200 bg-white/80 hover:shadow-lg transition-all duration-200"
                        >
                          <div className="flex items-start justify-between mb-3 sm:mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                                <h3 className="font-bold text-gray-900 text-base sm:text-lg">{milestone.title}</h3>
                                <div className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.bg} ${statusInfo.text}`}>
                                  {statusInfo.label}
                                </div>
                                <div className="px-2 sm:px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                                  {typeLabels[milestone.milestoneType]}
                                </div>
                              </div>
                              <p className="text-gray-600 mb-2 text-sm sm:text-base">{milestone.description}</p>
                              {milestone.requirements && (
                                <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                                  <p className="text-xs font-semibold text-gray-700 mb-1">Requirements:</p>
                                  <p className="text-xs text-gray-600">{milestone.requirements}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                            {milestone.assignedTo && milestone.assignedTo !== '0x0000000000000000000000000000000000000000' && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Assigned To</p>
                                <p className="font-mono text-xs text-gray-700 break-all">
                                  {milestone.assignedTo.slice(0, 6)}...{milestone.assignedTo.slice(-4)}
                                </p>
                              </div>
                            )}
                            {milestone.claimedBy && milestone.claimedBy !== '0x0000000000000000000000000000000000000000' && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Claimed By</p>
                                <p className="font-mono text-xs text-gray-700 break-all">
                                  {milestone.claimedBy.slice(0, 6)}...{milestone.claimedBy.slice(-4)}
                                </p>
                              </div>
                            )}
                            {milestone.deadline > 0n && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Deadline</p>
                                <p className="text-xs text-gray-700">
                                  {new Date(Number(milestone.deadline) * 1000).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                          </div>

                          {milestone.supportedTokens && milestone.supportedTokens.length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs text-gray-500 mb-2">Rewards:</p>
                              <div className="flex flex-wrap gap-2">
                                {milestone.supportedTokens.map((token, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-mono">
                                    {token.slice(0, 6)}...{token.slice(-4)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Milestone Actions */}
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <MilestoneActions
                              milestone={milestone}
                              projectOwner={project?.owner || '0x0000000000000000000000000000000000000000' as Address}
                              onActionComplete={() => {
                                // Refetch milestones
                                window.location.reload();
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="sm:bg-white/70 sm:backdrop-blur-sm sm:rounded-2xl sm:shadow-lg sm:border sm:border-white/20 sm:p-12 text-center p-6">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <ListChecks className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">No Milestones Yet</h3>
                  <p className="text-gray-600 mb-4 sm:mb-6 max-w-md mx-auto text-sm sm:text-base">
                    {isOwner 
                      ? "Create milestones to track project progress and reward contributors."
                      : "This project hasn't created any milestones yet."}
                  </p>
                  {isOwner && (
                    <button
                      onClick={() => setShowCreateMilestoneModal(true)}
                      className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-medium text-sm sm:text-base"
                    >
                      <Plus className="h-4 w-4" />
                      Create Milestone
                    </button>
                  )}
                </div>
              )}
            </TabsContent>
 
            {/* Technical Tab */}
            <TabsContent value="technical" className="space-y-4 sm:space-y-8">
              {/* Mobile: No Card, Desktop: Card */}
              <div className="sm:bg-white/30 sm:backdrop-blur-md sm:rounded-3xl sm:shadow-xl sm:border sm:border-white/20 sm:p-8 sm:p-12 relative">
                {/* Advanced Stats Button */}
                <div className="absolute top-2 right-2 sm:top-6 sm:right-6">
                  <button
                    onClick={() => setShowAdvancedStats(!showAdvancedStats)}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 text-xs sm:text-sm font-medium"
                  >
                    <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">{showAdvancedStats ? 'Hide Advanced' : 'View Advanced Stats'}</span>
                    <span className="sm:hidden">{showAdvancedStats ? 'Hide' : 'Advanced'}</span>
                  </button>
                </div>

                <div className="prose prose-sm sm:prose-lg prose-gray max-w-none">
                  {/* Project Type Analysis */}
                  {project.metadata?.projectType && (
                    <p className="text-gray-800 leading-relaxed text-sm sm:text-lg mb-3 sm:mb-6">
                      This is a <strong>{project.metadata.projectType}</strong> project
                      {project.metadata?.category && <> in the <strong>{project.metadata.category}</strong> category</>}
                      {project.metadata?.maturityLevel && <> with <strong>{project.metadata.maturityLevel}</strong> maturity level</>}.
                    </p>
                  )}
                  
                  <p className="text-gray-800 leading-relaxed text-sm sm:text-lg mb-3 sm:mb-6">
                    We build on the <strong>{project.metadata?.blockchain || 'blockchain'}</strong> and are currently in the <strong>{project.metadata?.developmentStage || 'development'}</strong> stage. 
                    {project.metadata?.techStack && project.metadata.techStack.length > 0 && (
                      <> We built with <strong>{project.metadata.techStack.join(', ')}</strong> technologies</>
                    )}
                    {project.metadata?.openSource !== undefined && (
                      <> and we are <strong>{project.metadata.openSource ? 'open source' : 'proprietary'}</strong></>
                    )}.
                  </p>
                  
                  <p className="text-gray-800 leading-relaxed text-sm sm:text-lg mb-3 sm:mb-6">
                    The project operates under a <strong>{project.metadata?.license || 'license'}</strong> and we have <strong>{project.metadata?.smartContracts?.length || project.contracts?.length || 0} smart contract{(project.metadata?.smartContracts?.length || project.contracts?.length || 0) === 1 ? '' : 's'}</strong>
                    {project.metadata?.auditReports && project.metadata.auditReports.length > 0 ? (
                      <> and have done <strong>{project.metadata.auditReports.length} security audit{project.metadata.auditReports.length === 1 ? '' : 's'}</strong></>
                    ) : (
                      <> and have <strong>not done security audits</strong></>
                    )}.
                  </p>
                  
                  <p className="text-gray-800 leading-relaxed text-sm sm:text-lg mb-3 sm:mb-6">
                    The project is <strong>{project.metadata?.kycCompliant ? 'KYC compliant' : 'not KYC compliant'}</strong>
                    {project.metadata?.regulatoryCompliance && project.metadata.regulatoryCompliance.length > 0 && (
                      <> but it complies with <strong>{project.metadata.regulatoryCompliance.join(', ')}</strong> regulations</>
                    )}.
                  </p>

                  {/* Advanced Stats Section */}
                  {showAdvancedStats && (
                    <div className="mt-4 sm:mt-8 p-3 sm:p-6 sm:bg-gray-50/50 sm:rounded-2xl sm:border sm:border-gray-200/50">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
                          <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        </div>
                        Advanced Technical Stats
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        {/* Left Side - Tech Stack */}
                        {project.metadata?.techStack && project.metadata.techStack.length > 0 && (
                          <div className="space-y-2 sm:space-y-3">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                              <Code className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                              Technology Stack
                            </h4>
                            <div className="space-y-1 sm:space-y-2">
                              {project.metadata.techStack.map((tech, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2 sm:p-3 sm:bg-white/80 sm:rounded-lg sm:border sm:border-gray-200 border-b border-gray-200 sm:border-b-0">
                                  <span className="text-xs text-gray-500 font-mono">#{idx + 1}</span>
                                  <span className="text-xs sm:text-sm font-medium text-gray-700 flex-1">{tech}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Right Side - Combined Contracts */}
                        {((project.metadata?.smartContracts && project.metadata.smartContracts.length > 0) || 
                          (project.contracts && project.contracts.length > 0)) && (
                          <div className="space-y-2 sm:space-y-3">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                              <Terminal className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                              Smart Contracts
                            </h4>
                            <div className="space-y-1 sm:space-y-2">
                              {/* Combine and deduplicate contracts */}
                              {(() => {
                                const allContracts = [
                                  ...(project.metadata?.smartContracts || []),
                                  ...(project.contracts || [])
                                ];
                                const uniqueContracts = [...new Set(allContracts)];
                                
                                return uniqueContracts.map((contract, idx) => (
                                  <div key={idx} className="flex items-center gap-2 p-2 sm:p-3 sm:bg-white/80 sm:rounded-lg sm:border sm:border-gray-200 border-b border-gray-200 sm:border-b-0">
                                    <span className="text-xs text-gray-500 font-mono">#{idx + 1}</span>
                                    <span className="text-xs sm:text-sm font-mono text-gray-700 break-all flex-1">{contract}</span>
                                    <button
                                      onClick={() => navigator.clipboard.writeText(contract)}
                                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                                      title="Copy address"
                                    >
                                      <Copy className="h-3 w-3 text-gray-500" />
                                    </button>
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Audit Reports */}
                        {project.metadata?.auditReports && project.metadata.auditReports.length > 0 && (
                          <div className="space-y-2 sm:space-y-3">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                              <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                              Security Audit Reports
                            </h4>
                            <div className="space-y-1 sm:space-y-2">
                              {project.metadata.auditReports.map((report, idx) => (
                                <div key={idx} className="p-2 sm:p-3 sm:bg-white/80 sm:rounded-lg sm:border sm:border-gray-200 border-b border-gray-200 sm:border-b-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 font-mono">#{idx + 1}</span>
                                    <span className="text-xs sm:text-sm font-mono text-gray-700 break-all flex-1">{report}</span>
                                    <button
                                      onClick={() => navigator.clipboard.writeText(report)}
                                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                                      title="Copy report URL"
                                    >
                                      <Copy className="h-3 w-3 text-gray-500" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Technical Metrics */}
                        <div className="space-y-2 sm:space-y-3">
                          <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                            <Gauge className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
                            Technical Metrics
                          </h4>
                          <div className="space-y-1 sm:space-y-2">
                            <div className="flex justify-between items-center p-2 sm:p-3 sm:bg-white/80 sm:rounded-lg sm:border sm:border-gray-200 border-b border-gray-200 sm:border-b-0">
                              <span className="text-xs sm:text-sm text-gray-600">Total Contracts</span>
                              <span className="font-semibold text-gray-900 text-xs sm:text-sm">
                                {(() => {
                                  const allContracts = [
                                    ...(project.metadata?.smartContracts || []),
                                    ...(project.contracts || [])
                                  ];
                                  return [...new Set(allContracts)].length;
                                })()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-2 sm:p-3 sm:bg-white/80 sm:rounded-lg sm:border sm:border-gray-200 border-b border-gray-200 sm:border-b-0">
                              <span className="text-xs sm:text-sm text-gray-600">Security Audits</span>
                              <span className="font-semibold text-gray-900 text-xs sm:text-sm">
                                {project.metadata?.auditReports?.length || 0}
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-2 sm:p-3 sm:bg-white/80 sm:rounded-lg sm:border sm:border-gray-200 border-b border-gray-200 sm:border-b-0">
                              <span className="text-xs sm:text-sm text-gray-600">Compliance Items</span>
                              <span className="font-semibold text-gray-900 text-xs sm:text-sm">
                                {project.metadata?.regulatoryCompliance?.length || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
                        <button 
                          onClick={() => navigate(`/app/project/edit/${id}`)}
                          className="w-full flex items-center justify-center gap-2 p-3 bg-white hover:bg-gray-50 rounded-lg border border-red-200 text-red-700 hover:text-red-800 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                          Edit Project Details
                        </button>
                        {!normalizedGithub && (
                          <div className="p-3 bg-white rounded-lg border border-red-200">
                            <p className="text-sm text-red-800 mb-2">GitHub repository not set. Add it now:</p>
                            {!showSetGithub ? (
                              <button
                                onClick={() => setShowSetGithub(true)}
                                className="w-full flex items-center justify-center gap-2 p-2 bg-red-100 hover:bg-red-200 rounded-md text-red-800 transition-colors"
                              >
                                <Github className="h-4 w-4" />
                                Add GitHub URL
                              </button>
                            ) : (
                              <div className="space-y-2">
                                <input
                                  type="url"
                                  value={newGithub}
                                  onChange={(e) => setNewGithub(e.target.value)}
                                  placeholder="https://github.com/org/repo"
                                  className="w-full px-3 py-2 border rounded-md text-sm"
                                />
                                {githubSaveError && <p className="text-xs text-red-600">{githubSaveError}</p>}
                                {githubSaved && <p className="text-xs text-green-600">GitHub URL saved.</p>}
                                <div className="flex gap-2">
                                  <button
                                    onClick={handleSaveGithub}
                                    disabled={isUpdatingGithub}
                                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-60"
                                  >
                                    {isUpdatingGithub ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    onClick={() => setShowSetGithub(false)}
                                    className="px-3 py-2 bg-gray-100 rounded-md text-sm hover:bg-gray-200"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        <button className="w-full flex items-center justify-center gap-2 p-3 bg-white hover:bg-gray-50 rounded-lg border border-red-200 text-red-700 hover:text-red-800 transition-colors">
                   <Trophy className="h-4 w-4" />
                          Manage Campaigns
                        </button>
                        <button className="w-full flex items-center justify-center gap-2 p-3 bg-white hover:bg-gray-50 rounded-lg border border-red-200 text-red-700 hover:text-red-800 transition-colors">
                          <Users className="h-4 w-4" />
                          Manage Team
                        </button>
                        <button 
                          onClick={() => setShowCreateMilestoneModal(true)}
                          className="w-full flex items-center justify-center gap-2 p-3 bg-white hover:bg-gray-50 rounded-lg border border-red-200 text-red-700 hover:text-red-800 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          Create Milestone
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
     <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-gray-200/50 shadow-lg flex justify-around items-center py-1 px-1 md:hidden">
       {tabs.map((tab) => (
         <button
           key={tab.id}
           onClick={() => setActiveTab(tab.id)}
           className={`flex flex-col items-center justify-center flex-1 px-1 py-0.5 transition-all duration-200 ${
             activeTab === tab.id ? 'text-blue-600' : 'text-gray-500'
           }`}
           aria-label={tab.label}
         >
           <div className={`p-1 rounded-full ${activeTab === tab.id ? 'bg-blue-100' : 'bg-gray-100'}`}> 
             <tab.icon className="h-2.5 w-2.5" />
           </div>
           <span className="text-[10px] mt-0.5 font-medium">{tab.label}</span>
           {tab.badge !== undefined && tab.badge > 0 && (
             <span className="bg-blue-100 text-blue-600 text-[8px] px-1 py-0.5 rounded-full font-semibold mt-0.5">
               {tab.badge}
             </span>
           )}
         </button>
       ))}
     </div>
     </div>
   </div>

   {/* Tip Modal */}
   <TipModal
     isOpen={isTipModalOpen}
     onClose={() => setIsTipModalOpen(false)}
     project={{
       id: projectId,
       name: project.name,
       owner: project.owner,
       contractAddress: contractAddress
     }}
     onTipSuccess={() => {
       setIsTipModalOpen(false);
       // Optionally show a success message or refresh data
     }}
   />

   {/* Create Project Milestone Modal */}
   <CreateProjectMilestoneModal
     isOpen={showCreateMilestoneModal}
     onClose={() => setShowCreateMilestoneModal(false)}
     projectId={projectId}
     onSuccess={() => {
       setShowCreateMilestoneModal(false);
       // Milestones will refetch automatically via the hook
     }}
   />
    </>
  );
}