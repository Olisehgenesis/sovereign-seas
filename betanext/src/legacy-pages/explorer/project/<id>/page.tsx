import { useState,  useMemo } from 'react';
import { useNavigate, useParams } from '@/utils/nextAdapter';
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
  Search,
  Camera,
  Lock,
  ChevronRight,
  ListChecks,
  Plus,
} from 'lucide-react';
import { Github, Award } from 'lucide-react';

import { useProjectDetails, useProjectCampaigns, useUpdateProjectMetadata } from '@/hooks/useProjectMethods';
import { getMainContractAddress } from '@/utils/contractConfig';
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
import BuilderSlotCard from '@/components/cards/BuilderSlotCard';
import ProjectLoadingState from '@/components/project/ProjectLoadingState';
import ProjectErrorState from '@/components/project/ProjectErrorState';
import ProjectLogo from '@/components/project/ProjectLogo';
import ProjectShareModal from '@/components/project/ProjectShareModal';
import OverviewTab from '@/components/project/tabs/OverviewTab';
import CampaignsTab from '@/components/project/tabs/CampaignsTab';
import AnalyticsTab from '@/components/project/tabs/AnalyticsTab';
import { formatDate } from '@/components/project/utils';
import type { EnhancedProject, ParsedMetadata, Tab, SharePlatform, TabId } from '@/components/project/types';

// Types are now imported from @/components/project/types

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

// Utilities and components are now imported from @/components/project




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
  
  // Data - Use getMainContractAddress to handle testnet/mainnet properly
  const contractAddress = getMainContractAddress();
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
  
  // Check if user is owner - More defensive check with proper address comparison
  const isOwner = useMemo(() => {
    // Early return if not connected or no address
    if (!isConnected || !address) {
      return false;
    }
    
    // Early return if project data is still loading or not available
    if (isLoading || !project) {
      return false;
    }
    
    // Early return if project owner is not available
    if (!project.owner) {
      console.warn('[ProjectView] Project owner is undefined', { projectId, project });
      return false;
    }
    
    // Normalize both addresses to lowercase for comparison
    const normalizedUserAddress = address.toLowerCase().trim();
    const normalizedOwnerAddress = project.owner.toLowerCase().trim();
    
    // Debug logging (can be removed in production)
    if (normalizedUserAddress === normalizedOwnerAddress) {
      console.log('[ProjectView] Owner match confirmed', {
        userAddress: normalizedUserAddress,
        ownerAddress: normalizedOwnerAddress,
        projectId: projectId.toString()
      });
    } else {
      console.log('[ProjectView] Owner mismatch', {
        userAddress: normalizedUserAddress,
        ownerAddress: normalizedOwnerAddress,
        projectId: projectId.toString(),
        addressesMatch: normalizedUserAddress === normalizedOwnerAddress
      });
    }
    
    return normalizedUserAddress === normalizedOwnerAddress;
  }, [isConnected, address, project, isLoading, projectId]);
  
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
    return <ProjectLoadingState />;
  }
  
  // Error state
  if (error || !project) {
    return <ProjectErrorState error={error || undefined} />;
  }

  return (
    <>
    {/* Dynamic Metadata */}
    <DynamicHelmet 
      config={{
        title: project?.name || 'Project',
        description: project?.metadata?.tagline || project?.description || 'Discover this innovative project on Sovereign Seas',
        image: project?.metadata?.logo ? formatIpfsUrl(project.metadata.logo) : '/og-image.png',
        url: typeof window !== 'undefined' ? window.location.href : '',
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
                <div className="text-xs text-blue-600 font-medium flex items-center gap-1">
                  {projectCampaigns ? 
                    projectCampaigns.filter((c): c is NonNullable<typeof c> => c !== null)
                      .reduce((sum, c) => 
                        sum + parseFloat(formatEther(c.participation?.fundsReceived || 0n)), 0
                      ).toFixed(2) 
                    : '0.00'} <img src="/images/celo.png" alt="CELO" width={12} height={12} className="inline-block" /> received
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
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-2 sm:px-6 py-1.5 sm:py-3 border-[0.2em] border-[#050505] rounded-[0.4em] font-extrabold shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all text-xs sm:text-sm flex items-center justify-center flex-1 sm:flex-none uppercase tracking-[0.05em]"
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
                  className="bg-white hover:bg-gray-50 text-[#050505] px-2 sm:px-6 py-1.5 sm:py-3 border-[0.2em] border-[#050505] rounded-[0.4em] font-extrabold shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all text-xs sm:text-sm flex items-center justify-center flex-1 sm:flex-none uppercase tracking-[0.05em]"
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
                    <div className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
                      {projectCampaigns ? 
                        projectCampaigns.filter((c): c is NonNullable<typeof c> => c !== null)
                          .reduce((sum, c) => 
                            sum + parseFloat(formatEther(c.participation?.fundsReceived || 0n)), 0
                          ).toFixed(2) 
                        : '0.00'} <img src="/images/celo.png" alt="CELO" width={24} height={24} className="inline-block" />
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
          <TabsList className="hidden sm:flex bg-transparent p-0 w-full justify-start gap-3 mb-6">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-4 px-6 py-5 text-base font-extrabold whitespace-nowrap data-[state=active]:bg-[#2563eb] data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-[#050505] border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] data-[state=active]:shadow-[0.3em_0.3em_0_#000000] data-[state=active]:hover:shadow-[0.4em_0.4em_0_#000000] data-[state=inactive]:hover:shadow-[0.3em_0.3em_0_#000000] data-[state=active]:hover:-translate-x-[0.1em] data-[state=active]:hover:-translate-y-[0.1em] data-[state=inactive]:hover:-translate-x-[0.1em] data-[state=inactive]:hover:-translate-y-[0.1em] min-h-[4.5rem] flex-1 uppercase tracking-[0.05em] transition-all"
              >
                <div className="p-2 rounded-lg bg-white/20 data-[state=active]:bg-white/30 data-[state=inactive]:bg-[#2563eb]/10 border-[0.15em] data-[state=active]:border-white/50 data-[state=inactive]:border-[#2563eb]/30">
                  <tab.icon className="h-6 w-6" />
                </div>
                <span className="text-lg">{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="bg-white/80 data-[state=active]:bg-white/80 data-[state=inactive]:bg-[#2563eb]/10 text-[#050505] data-[state=active]:text-[#050505] data-[state=inactive]:text-[#2563eb] text-sm px-3 py-1.5 rounded-full font-extrabold border-[0.15em] border-[#050505] data-[state=active]:border-[#050505] data-[state=inactive]:border-[#2563eb] shadow-[0.1em_0.1em_0_#000000]">
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
              <OverviewTab project={project} projectCampaigns={projectCampaigns || []} />
            </TabsContent>
 
            {/* Campaigns Tab */}
            <TabsContent value="campaigns" className="space-y-6 sm:space-y-8">
              <CampaignsTab campaigns={projectCampaigns || []} contractAddress={contractAddress} />
            </TabsContent>

            {/* Milestones Tab */}
            <TabsContent value="milestones" className="space-y-6 sm:space-y-8">
              {isLoadingMilestones ? (
                <div className="group relative">
                  <div 
                    className="hidden sm:block absolute inset-0 pointer-events-none opacity-30 z-[1]"
                    style={{
                      backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                      backgroundSize: '0.5em 0.5em'
                    }}
                  />
                  <div className="hidden sm:block absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
                  <div className="hidden sm:block absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
                  <div className="relative bg-white sm:border-[0.35em] sm:border-[#2563eb] sm:rounded-[0.6em] sm:shadow-[0.5em_0.5em_0_#000000] sm:p-12 text-center p-6 z-[2]">
                    <div className="flex items-center justify-center">
                      <Clock className="h-6 w-6 animate-spin text-[#2563eb]" />
                      <span className="ml-2 text-[#050505] font-extrabold uppercase tracking-[0.05em]">Loading milestones...</span>
                    </div>
                  </div>
                </div>
              ) : milestones && milestones.length > 0 ? (
                <div className="group relative">
                  <div 
                    className="hidden sm:block absolute inset-0 pointer-events-none opacity-30 z-[1]"
                    style={{
                      backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                      backgroundSize: '0.5em 0.5em'
                    }}
                  />
                  <div className="hidden sm:block absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#a855f7] rotate-45 z-[1]" />
                  <div className="hidden sm:block absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
                  <div className="relative bg-white sm:border-[0.35em] sm:border-[#a855f7] sm:rounded-[0.6em] sm:shadow-[0.5em_0.5em_0_#000000] sm:p-8 z-[2]">
                    <h2 className="text-2xl font-extrabold text-[#050505] mb-6 uppercase tracking-[0.05em] flex items-center gap-3">
                      <ListChecks className="h-6 w-6 text-[#a855f7]" />
                      Project Milestones ({milestones.length})
                    </h2>
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
                          className="group/item relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.4em_0.4em_0_#000000] hover:shadow-[0.5em_0.5em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all duration-200 p-4 sm:p-6"
                          style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
                        >
                          <div className="absolute -top-[0.8em] -right-[0.8em] w-[3em] h-[3em] bg-[#a855f7] rotate-45 z-[1]" />
                          <div className="absolute top-[0.3em] right-[0.3em] text-white text-[1em] font-bold z-[2]">★</div>
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
                </div>
              ) : (
                <div className="group relative">
                  <div 
                    className="hidden sm:block absolute inset-0 pointer-events-none opacity-30 z-[1]"
                    style={{
                      backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                      backgroundSize: '0.5em 0.5em'
                    }}
                  />
                  <div className="hidden sm:block absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#a855f7] rotate-45 z-[1]" />
                  <div className="hidden sm:block absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
                  <div className="relative bg-white sm:border-[0.35em] sm:border-[#a855f7] sm:rounded-[0.6em] sm:shadow-[0.5em_0.5em_0_#000000] sm:p-12 text-center p-6 z-[2]">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-[#a855f7]/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 border-[0.2em] border-[#a855f7]">
                      <ListChecks className="h-8 w-8 sm:h-12 sm:w-12 text-[#a855f7]" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-[#050505] mb-2 sm:mb-3 uppercase tracking-[0.05em]">No Milestones Yet</h3>
                    <p className="text-[#050505] mb-4 sm:mb-6 max-w-md mx-auto text-sm sm:text-base font-semibold">
                      {isOwner 
                        ? "Create milestones to track project progress and reward contributors."
                        : "This project hasn't created any milestones yet."}
                    </p>
                    {isOwner && (
                      <button
                        onClick={() => setShowCreateMilestoneModal(true)}
                        className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-[#2563eb] text-white border-[0.2em] border-[#050505] rounded-[0.4em] font-extrabold shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all uppercase tracking-[0.05em]"
                      >
                        <Plus className="h-4 w-4" />
                        Create Milestone
                      </button>
                    )}
                  </div>
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
            <TabsContent value="analytics" className="space-y-6 sm:space-y-8">
              <AnalyticsTab project={project} projectCampaigns={projectCampaigns || []} />
            </TabsContent>

            {/* Admin Tab */}
            {isOwner && (
              <TabsContent value="admin" className="space-y-8">
                <div className="group relative w-full">
                  <div 
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
                    style={{
                      backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                      backgroundSize: '0.5em 0.5em'
                    }}
                  />
                  
                  <div 
                    className="relative bg-white border-[0.35em] border-[#ef4444] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2]"
                    style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
                  >
                    <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#ef4444] rotate-45 z-[1]" />
                    <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
                    
                    <div 
                      className="relative px-[1.5em] py-[1.4em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
                      style={{ 
                        background: '#ef4444',
                        backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
                        backgroundBlendMode: 'overlay'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-[0.3em] flex items-center justify-center border-[0.15em] border-white/30">
                          <Crown className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="text-2xl font-extrabold text-white">Admin Actions</h3>
                      </div>
                    </div>
                    
                    <div className="relative px-[1.5em] py-[1.5em] z-[2]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="group/item relative">
                          <div 
                            className="absolute inset-0 pointer-events-none opacity-0 group-hover/item:opacity-50 transition-opacity duration-[400ms] z-[1]"
                            style={{
                              backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                              backgroundSize: '0.5em 0.5em'
                            }}
                          />
                          
                          <div 
                            className="relative bg-white border-[0.35em] border-[#ef4444] rounded-[0.6em] shadow-[0.5em_0.5em_0_#000000] overflow-hidden z-[2] p-6"
                            style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
                          >
                            <div className="absolute -top-[0.8em] -right-[0.8em] w-[3em] h-[3em] bg-[#ef4444] rotate-45 z-[1]" />
                            <div className="absolute top-[0.3em] right-[0.3em] text-white text-[1em] font-bold z-[2]">★</div>
                            
                            <div className="relative z-[2]">
                              <h4 className="font-extrabold text-[#050505] mb-3 flex items-center gap-2 uppercase tracking-[0.05em]">
                                <Edit className="h-5 w-5" />
                                Project Management
                              </h4>
                              <div className="space-y-3">
                                <button 
                                  onClick={() => navigate(`/app/project/edit/${id}`)}
                                  className="w-full flex items-center justify-center gap-2 p-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] text-[#050505] font-extrabold shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all uppercase tracking-[0.05em]"
                                >
                                  <Edit className="h-4 w-4" />
                                  Edit Project Details
                                </button>
                                {!normalizedGithub && (
                                  <div className="p-3 bg-gray-50 border-[0.15em] border-gray-300 rounded-[0.4em] shadow-[0.1em_0.1em_0_#000000]">
                                    <p className="text-sm text-[#050505] mb-2 font-semibold">GitHub repository not set. Add it now:</p>
                                    {!showSetGithub ? (
                                      <button
                                        onClick={() => setShowSetGithub(true)}
                                        className="w-full flex items-center justify-center gap-2 p-2 bg-[#ef4444] text-white border-[0.15em] border-[#050505] rounded-[0.3em] font-extrabold shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all uppercase tracking-[0.05em]"
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
                                          className="w-full px-3 py-2 border-[0.2em] border-[#050505] rounded-[0.3em] text-sm font-semibold shadow-[0.1em_0.1em_0_#000000] focus:outline-none"
                                        />
                                        {githubSaveError && <p className="text-xs text-[#ef4444] font-semibold">{githubSaveError}</p>}
                                        {githubSaved && <p className="text-xs text-[#10b981] font-semibold">GitHub URL saved.</p>}
                                        <div className="flex gap-2">
                                          <button
                                            onClick={handleSaveGithub}
                                            disabled={isUpdatingGithub}
                                            className="flex-1 px-3 py-2 bg-[#2563eb] text-white border-[0.15em] border-[#050505] rounded-[0.3em] text-sm font-extrabold shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all disabled:opacity-60 uppercase tracking-[0.05em]"
                                          >
                                            {isUpdatingGithub ? 'Saving...' : 'Save'}
                                          </button>
                                          <button
                                            onClick={() => setShowSetGithub(false)}
                                            className="px-3 py-2 bg-white border-[0.15em] border-[#050505] rounded-[0.3em] text-sm font-extrabold shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all uppercase tracking-[0.05em]"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                <button className="w-full flex items-center justify-center gap-2 p-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] text-[#050505] font-extrabold shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all uppercase tracking-[0.05em]">
                                  <Trophy className="h-4 w-4" />
                                  Manage Campaigns
                                </button>
                                <button className="w-full flex items-center justify-center gap-2 p-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] text-[#050505] font-extrabold shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all uppercase tracking-[0.05em]">
                                  <Users className="h-4 w-4" />
                                  Manage Team
                                </button>
                                <button 
                                  onClick={() => setShowCreateMilestoneModal(true)}
                                  className="w-full flex items-center justify-center gap-2 p-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] text-[#050505] font-extrabold shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all uppercase tracking-[0.05em]"
                                >
                                  <Plus className="h-4 w-4" />
                                  Create Milestone
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="group/item relative">
                          <div 
                            className="absolute inset-0 pointer-events-none opacity-0 group-hover/item:opacity-50 transition-opacity duration-[400ms] z-[1]"
                            style={{
                              backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                              backgroundSize: '0.5em 0.5em'
                            }}
                          />
                          
                          <div 
                            className="relative bg-white border-[0.35em] border-[#f59e0b] rounded-[0.6em] shadow-[0.5em_0.5em_0_#000000] overflow-hidden z-[2] p-6"
                            style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
                          >
                            <div className="absolute -top-[0.8em] -right-[0.8em] w-[3em] h-[3em] bg-[#f59e0b] rotate-45 z-[1]" />
                            <div className="absolute top-[0.3em] right-[0.3em] text-white text-[1em] font-bold z-[2]">★</div>
                            
                            <div className="relative z-[2]">
                              <h4 className="font-extrabold text-[#050505] mb-3 flex items-center gap-2 uppercase tracking-[0.05em]">
                                <Shield className="h-5 w-5" />
                                Project Settings
                              </h4>
                              <div className="space-y-3">
                                <button className="w-full flex items-center justify-center gap-2 p-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] text-[#050505] font-extrabold shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all uppercase tracking-[0.05em]">
                                  <Lock className="h-4 w-4" />
                                  Transfer Ownership
                                </button>
                                <button className="w-full flex items-center justify-center gap-2 p-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] text-[#050505] font-extrabold shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all uppercase tracking-[0.05em]">
                                  <Activity className="h-4 w-4" />
                                  Toggle Active Status
                                </button>
                                <button className="w-full flex items-center justify-center gap-2 p-3 bg-[#ef4444] text-white border-[0.2em] border-[#050505] rounded-[0.4em] font-extrabold shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all uppercase tracking-[0.05em]">
                                  <X className="h-4 w-4" />
                                  Archive Project
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
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
     <ProjectShareModal
       isOpen={showShareModal}
       onClose={() => setShowShareModal(false)}
       projectName={project.name}
       projectTagline={project.metadata?.tagline}
       projectDescription={project.description}
       sharePlatforms={sharePlatforms}
       onShare={handleShare}
       copiedUrl={copiedUrl}
     />

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