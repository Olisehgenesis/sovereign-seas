'use client';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { 
  Search,
  Filter,
  Grid,
  List,
  ChevronDown,
  X,
  Loader2,
  Sparkles,
  Calendar,
  MapPin,
  Users,
  Trophy,
  Target,
  Code,
  DollarSign,
  Clock,
  TrendingUp,
  Heart,
  Globe,
  Tag,
  Briefcase,
  Award,
  CheckCircle,
  PlayCircle,
  Menu,
  Settings,
  Zap,
  Rocket,
  Activity,
  Star,
  Eye,
  Plus,
  ArrowRight,
  BarChart3,
  Building2,
  Layers,
  Filter as FilterIcon,
  SortAsc,
  Hash,
  MessageSquare,
  Share2,
  BookOpen,
  Compass,
  Database,
  Network,
  Shield,
  Flame,
  Crown,
  Diamond,
  TrendingUpIcon,
  ChevronRight,
  ExternalLink,
  Github,
  Play,
  Wallet,
  Send,
  Vote,
  Coins,
  Timer,
  Bell,
  Home,
  Telescope
} from 'lucide-react';
import { useAllProjects } from '@/hooks/useProjectMethods';
import { useAllCampaigns } from '@/hooks/useCampaignMethods';
import { Address } from 'viem';
import { formatEther } from 'viem';
import { formatIpfsUrl } from '@/utils/imageUtils';

// Get contract address from environment
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_V4 as Address;

interface ParsedProjectMetadata {
  bio?: string;
  tagline?: string;
  category?: string;
  tags?: string[];
  location?: string;
  establishedDate?: string;
  website?: string;
  logo?: string;
  coverImage?: string;
  demoVideo?: string;
  demoUrl?: string;
  githubRepo?: string;
  documentation?: string;
  karmaGapProfile?: string;
  // Social links
  twitter?: string;
  linkedin?: string;
  discord?: string;
  telegram?: string;
  // Team & contact
  teamMembers?: Array<{
    name: string;
    role: string;
    email?: string;
    linkedin?: string;
    twitter?: string;
  }>;
  contactEmail?: string;
  // Technical
  blockchain?: string;
  techStack?: string[];
  keyFeatures?: string[];
  developmentStage?: string;
  license?: string;
  openSource?: boolean;
}

interface ParsedCampaignMetadata {
  bio?: string;
  tagline?: string;
  category?: string;
  type?: string;
  tags?: string[];
  logo?: string;
  bannerImage?: string;
  website?: string;
  description?: string;
  requirements?: string[];
  prizes?: Array<{
    position: string;
    amount: string;
    description: string;
  }>;
  judges?: Array<{
    name: string;
    role: string;
    avatar?: string;
  }>;
  sponsors?: Array<{
    name: string;
    logo: string;
    tier: string;
  }>;
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
  // Parsed metadata
  metadata: ParsedProjectMetadata;
}

interface EnhancedCampaign {
  id: bigint;
  admin: Address;
  name: string;
  description: string;
  startTime: bigint;
  endTime: bigint;
  adminFeePercentage: bigint;
  maxWinners: bigint;
  useQuadraticDistribution: boolean;
  useCustomDistribution: boolean;
  payoutToken: Address;
  active: boolean;
  totalFunds: bigint;
  status: 'upcoming' | 'active' | 'ended' | 'paused';
  // Parsed metadata
  metadata: ParsedCampaignMetadata;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredProjects, setFeaturedProjects] = useState<EnhancedProject[]>([]);
  const [featuredCampaigns, setFeaturedCampaigns] = useState<EnhancedCampaign[]>([]);

  // Use hooks for data fetching
  const { projects, isLoading: projectsLoading, error: projectsError } = useAllProjects(CONTRACT_ADDRESS);
  const { campaigns, isLoading: campaignsLoading, error: campaignsError } = useAllCampaigns(CONTRACT_ADDRESS);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Safe JSON parsing utility
  const safeJsonParse = (jsonString: string, fallback = {}) => {
    try {
      return jsonString ? JSON.parse(jsonString) : fallback;
    } catch (e) {
      console.warn('Failed to parse JSON:', e);
      return fallback;
    }
  };

  // Enhanced project metadata parsing
  const parseProjectMetadata = (projectDetails: any): ParsedProjectMetadata => {
    const { metadata } = projectDetails;
    
    // Parse bio data (basic project info)
    const bioData = safeJsonParse(metadata?.bio || '{}');
    
    // Parse contract info (technical details)
    const contractInfo = safeJsonParse(metadata?.contractInfo || '{}');
    
    // Parse additional data (everything else)
    const additionalData = safeJsonParse(metadata?.additionalData || '{}');
    
    return {
      // From bio
      tagline: bioData.tagline || '',
      category: bioData.category || '',
      tags: bioData.tags || [],
      location: bioData.location || '',
      establishedDate: bioData.establishedDate || '',
      website: bioData.website || '',
      
      // From contract info
      blockchain: contractInfo.blockchain || '',
      techStack: contractInfo.techStack || [],
      license: contractInfo.license || '',
      developmentStage: contractInfo.developmentStage || '',
      openSource: contractInfo.openSource !== undefined ? contractInfo.openSource : true,
      
      // From additional data - handle nested structures
      logo: additionalData.media?.logo || additionalData.logo || '',
      coverImage: additionalData.media?.coverImage || additionalData.coverImage || '',
      demoVideo: additionalData.media?.demoVideo || additionalData.demoVideo || '',
      
      // Links - handle both nested and flat structures
      demoUrl: additionalData.links?.demoUrl || additionalData.demoUrl || '',
      githubRepo: additionalData.links?.githubRepo || additionalData.githubRepo || '',
      documentation: additionalData.links?.documentation || additionalData.documentation || '',
      karmaGapProfile: additionalData.links?.karmaGapProfile || additionalData.karmaGapProfile || '',
      
      // Social media - handle nested social object
      twitter: additionalData.links?.twitter || additionalData.social?.twitter || additionalData.twitter || '',
      linkedin: additionalData.links?.linkedin || additionalData.social?.linkedin || additionalData.linkedin || '',
      discord: additionalData.links?.discord || additionalData.social?.discord || additionalData.discord || '',
      telegram: additionalData.links?.telegram || additionalData.social?.telegram || additionalData.telegram || '',
      
      // Team and contact
      teamMembers: additionalData.teamMembers || [],
      contactEmail: additionalData.contactEmail || '',
      
      // Features
      keyFeatures: additionalData.keyFeatures || [],
      
      // Fallback bio
      bio: bioData.bio || metadata?.bio || ''
    };
  };

  // Enhanced campaign metadata parsing
  const parseCampaignMetadata = (campaignDetails: any): ParsedCampaignMetadata => {
    const { metadata } = campaignDetails;
    
    // Parse main info
    const mainInfo = safeJsonParse(metadata?.mainInfo || '{}');
    
    // Parse additional info
    const additionalInfo = safeJsonParse(metadata?.additionalInfo || '{}');
    
    return {
      // Basic info
      tagline: mainInfo.tagline || additionalInfo.tagline || '',
      category: mainInfo.category || additionalInfo.category || '',
      type: mainInfo.type || additionalInfo.type || 'campaign',
      tags: mainInfo.tags || additionalInfo.tags || [],
      
      // Media
      logo: mainInfo.logo || additionalInfo.logo || '',
      bannerImage: mainInfo.bannerImage || additionalInfo.bannerImage || '',
      website: mainInfo.website || additionalInfo.website || '',
      
      // Campaign specific
      requirements: additionalInfo.requirements || [],
      prizes: additionalInfo.prizes || [],
      judges: additionalInfo.judges || [],
      sponsors: additionalInfo.sponsors || [],
      
      // Fallback bio
      bio: mainInfo.bio || additionalInfo.bio || metadata?.mainInfo || ''
    };
  };

  // Get campaign status
  const getCampaignStatus = (campaign: any): 'upcoming' | 'active' | 'ended' | 'paused' => {
    const now = Math.floor(Date.now() / 1000);
    const start = Number(campaign.startTime);
    const end = Number(campaign.endTime);
    
    if (!campaign.active) return 'paused';
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'active';
    return 'ended';
  };

  // Process and set featured projects
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

    // Get featured projects (active ones with campaigns, sorted by newest)
    const featured = enhanced
      .filter(p => p.active && p.campaignIds.length > 0)
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
      .slice(0, 6); // Show top 6 featured projects

    setFeaturedProjects(featured);
  }, [projects]);

  // Process and set featured campaigns
  useEffect(() => {
    if (!campaigns) return;

    const enhanced = campaigns.map(campaignDetails => {
      const parsedMetadata = parseCampaignMetadata(campaignDetails);
      const status = getCampaignStatus(campaignDetails.campaign);
      
      return {
        id: campaignDetails.campaign.id,
        admin: campaignDetails.campaign.admin,
        name: campaignDetails.campaign.name,
        description: campaignDetails.campaign.description,
        startTime: campaignDetails.campaign.startTime,
        endTime: campaignDetails.campaign.endTime,
        adminFeePercentage: campaignDetails.campaign.adminFeePercentage,
        maxWinners: campaignDetails.campaign.maxWinners,
        useQuadraticDistribution: campaignDetails.campaign.useQuadraticDistribution,
        useCustomDistribution: campaignDetails.campaign.useCustomDistribution,
        payoutToken: campaignDetails.campaign.payoutToken,
        active: campaignDetails.campaign.active,
        totalFunds: campaignDetails.campaign.totalFunds,
        status,
        metadata: parsedMetadata
      } as EnhancedCampaign;
    });

    // Get featured campaigns (active and upcoming ones with funds, sorted by total funds)
    const featured = enhanced
      .filter(c => ['active', 'upcoming'].includes(c.status))
      .sort((a, b) => Number(b.totalFunds) - Number(a.totalFunds))
      .slice(0, 6); // Show top 6 featured campaigns

    setFeaturedCampaigns(featured);
  }, [campaigns]);

  if (!isMounted) {
    return null;
  }

  const isLoading = projectsLoading || campaignsLoading;
  const error = projectsError || campaignsError;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md mx-auto border border-red-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">Unable to Load</h2>
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
            <Home className="h-10 w-10 text-blue-600 absolute inset-0 m-auto animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading Ecosystem</h2>
          <p className="text-gray-600">Discovering projects and opportunities...</p>
        </div>
      </div>
    );
  }

  const totalProjects = projects?.length || 0;
  const totalCampaigns = campaigns?.length || 0;
  const activeProjects = featuredProjects.length;
  const activeCampaigns = featuredCampaigns.filter(c => c.status === 'active').length;
  const totalFunds = featuredCampaigns.reduce((sum, c) => sum + parseFloat(formatEther(c.totalFunds)), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-black/10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: '20px 20px'
          }} />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-16 lg:py-24">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-6">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Rocket className="h-6 w-6 text-white" />
              </div>
              <span className="text-white/90 font-medium">Welcome to the Ecosystem</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
              Discover & Fund
              <span className="block bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent">
                Innovation
              </span>
            </h1>
            
            <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
              Explore cutting-edge projects, join funding campaigns, and be part of the next wave of technological breakthroughs.
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects, campaigns, or technologies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/95 backdrop-blur-sm border border-white/20 focus:border-white focus:ring-4 focus:ring-white/20 transition-all text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-12">
              <button
                onClick={() => navigate('/projects')}
                className="px-8 py-4 bg-white text-blue-600 rounded-2xl font-semibold hover:bg-gray-50 transition-all hover:scale-105 shadow-lg flex items-center space-x-2"
              >
                <Code className="h-5 w-5" />
                <span>Explore Projects</span>
              </button>
              <button
                onClick={() => navigate('/campaigns')}
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-2xl font-semibold hover:bg-white/20 transition-all hover:scale-105 flex items-center space-x-2"
              >
                <Trophy className="h-5 w-5" />
                <span>View Campaigns</span>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">{totalProjects}</div>
                <div className="text-white/70 text-sm">Total Projects</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">{totalCampaigns}</div>
                <div className="text-white/70 text-sm">Active Campaigns</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">{totalFunds.toFixed(1)}</div>
                <div className="text-white/70 text-sm">CELO Raised</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">{activeProjects + activeCampaigns}</div>
                <div className="text-white/70 text-sm">Active Items</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Featured Projects Section */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                <Star className="h-8 w-8 text-yellow-500 mr-3" />
                Featured Projects
              </h2>
              <p className="text-gray-600">Innovative projects making waves in the ecosystem</p>
            </div>
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              <span>View All Projects</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {featuredProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProjects.map(project => (
                <ProjectCard key={project.id.toString()} project={project} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
              <Code className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Featured Projects Yet</h3>
              <p className="text-gray-600 mb-6">Be the first to create an innovative project</p>
              <button
                onClick={() => navigate('/create-project')}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
              >
                Create Project
              </button>
            </div>
          )}
        </div>

        {/* Featured Campaigns Section */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                <Trophy className="h-8 w-8 text-purple-500 mr-3" />
                Featured Campaigns
              </h2>
              <p className="text-gray-600">Active funding opportunities and competitions</p>
            </div>
            <button
              onClick={() => navigate('/campaigns')}
              className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
            >
              <span>View All Campaigns</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {featuredCampaigns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredCampaigns.map(campaign => (
                <CampaignCard key={campaign.id.toString()} campaign={campaign} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
              <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Featured Campaigns Yet</h3>
              <p className="text-gray-600 mb-6">Be the first to start a funding campaign</p>
              <button
                onClick={() => navigate('/create-campaign')}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
              >
                Start Campaign
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions Section */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Ready to Get Started?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-100">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Code className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Create a Project</h3>
              <p className="text-gray-600 mb-4">Share your innovative idea with the community and attract collaborators</p>
              <button
                onClick={() => navigate('/create-project')}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
              >
                Start Building
              </button>
            </div>
            
            <div className="text-center p-6 bg-purple-50 rounded-xl border border-purple-100">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Launch a Campaign</h3>
              <p className="text-gray-600 mb-4">Fund innovative projects and discover the next big breakthrough</p>
              <button
                onClick={() => navigate('/create-campaign')}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
              >
                Start Funding
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Project Card Component
function ProjectCard({ project }: { project: EnhancedProject }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/projects/${project.id}`)}
      className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer group"
    >
      {/* Project Image */}
      <div className="relative aspect-video">
        {project.metadata.logo || project.metadata.coverImage ? (
          <img
            src={formatIpfsUrl(project.metadata.logo || project.metadata.coverImage)}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Code className="h-12 w-12 text-white" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            project.active 
              ? 'bg-green-100 text-green-700' 
              : 'bg-gray-100 text-gray-700'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full mr-1 ${
              project.active ? 'bg-green-500' : 'bg-gray-500'
            }`} />
            {project.active ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Category Badge */}
        {project.metadata.category && (
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center px-2 py-1 bg-black/70 backdrop-blur-sm text-white text-xs font-medium rounded-full">
              {project.metadata.category}
            </span>
          </div>
        )}
      </div>

      {/* Project Info */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
            {project.name}
          </h3>
          {project.campaignIds.length > 0 && (
            <div className="text-right ml-4">
              <p className="text-sm text-gray-500">Campaigns</p>
              <p className="font-semibold text-blue-600">{project.campaignIds.length}</p>
            </div>
          )}
        </div>

        <p className="text-gray-600 mb-4 line-clamp-2">
          {project.metadata.tagline || project.metadata.bio || project.description}
        </p>

        {/* Project Meta */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
          {project.metadata.location && (
            <div className="flex items-center space-x-1">
              <MapPin className="h-4 w-4" />
              <span>{project.metadata.location}</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>{new Date(Number(project.createdAt) * 1000).toLocaleDateString()}</span>
          </div>
          {project.metadata.blockchain && (
            <div className="flex items-center space-x-1">
              <Network className="h-4 w-4" />
              <span>{project.metadata.blockchain}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {project.metadata.tags && project.metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {project.metadata.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full"
              >
                #{tag}
              </span>
            ))}
            {project.metadata.tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full"
              >
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
          <div className="flex items-center space-x-2">
            {project.metadata.githubRepo && (
              <a
              
                href={project.metadata.githubRepo}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
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
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
 }
 
 // Enhanced Campaign Card Component
 function CampaignCard({ campaign }: { campaign: EnhancedCampaign }) {
  const navigate = useNavigate();
 
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' };
      case 'upcoming': return { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' };
      case 'ended': return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' };
      case 'paused': return { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' };
    }
  };
 
  const statusColors = getStatusColor(campaign.status);
  const daysLeft = campaign.status === 'active' 
    ? Math.max(0, Math.ceil((Number(campaign.endTime) - Date.now() / 1000) / (24 * 60 * 60)))
    : 0;
 
  const fundingAmount = parseFloat(formatEther(campaign.totalFunds));
 
  return (
    <div
      onClick={() => navigate(`/campaigns/${campaign.id}`)}
      className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer group"
    >
      {/* Campaign Image */}
      <div className="relative aspect-video">
        {campaign.metadata.logo || campaign.metadata.bannerImage ? (
          <img
            src={formatIpfsUrl(campaign.metadata.logo || campaign.metadata.bannerImage)}
            alt={campaign.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Trophy className="h-12 w-12 text-white" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}>
            <div className={`w-1.5 h-1.5 rounded-full mr-1 ${statusColors.dot}`} />
            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
          </span>
        </div>
 
        {/* Type Badge */}
        {campaign.metadata.type && (
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center px-2 py-1 bg-black/70 backdrop-blur-sm text-white text-xs font-medium rounded-full">
              {campaign.metadata.type.replace('_', ' ').split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')}
            </span>
          </div>
        )}
 
        {/* Prize Pool Overlay */}
        {fundingAmount > 0 && (
          <div className="absolute top-3 left-3">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
              <p className="text-xs text-gray-600 font-medium">Prize Pool</p>
              <p className="font-bold text-green-600 text-lg">
                {fundingAmount.toFixed(1)} CELO
              </p>
            </div>
          </div>
        )}
      </div>
 
      {/* Campaign Info */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
            {campaign.name}
          </h3>
          {campaign.status === 'active' && daysLeft > 0 && (
            <div className="text-right ml-4">
              <p className="text-sm text-gray-500">Days Left</p>
              <p className="font-semibold text-orange-600">{daysLeft}d</p>
            </div>
          )}
        </div>
 
        <p className="text-gray-600 mb-4 line-clamp-2">
          {campaign.metadata.tagline || campaign.metadata.bio || campaign.description}
        </p>
 
        {/* Campaign Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Coins className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Funding</span>
            </div>
            <p className="font-bold text-green-600 text-lg">
              {fundingAmount.toFixed(1)}
            </p>
            <p className="text-xs text-gray-500">CELO</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Award className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">Winners</span>
            </div>
            <p className="font-bold text-purple-600 text-lg">
              {campaign.maxWinners > 0n ? Number(campaign.maxWinners) : '∞'}
            </p>
            <p className="text-xs text-gray-500">Max</p>
          </div>
        </div>
 
        {/* Campaign Timeline */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(Number(campaign.startTime) * 1000).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })} - {new Date(Number(campaign.endTime) * 1000).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4" />
            <span>
              {campaign.useQuadraticDistribution ? 'Quadratic' : 
               campaign.useCustomDistribution ? 'Custom' : 'Linear'}
            </span>
          </div>
        </div>
 
        {/* Tags */}
        {campaign.metadata.tags && campaign.metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {campaign.metadata.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full"
              >
                #{tag}
              </span>
            ))}
            {campaign.metadata.tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                +{campaign.metadata.tags.length - 3}
              </span>
            )}
          </div>
        )}
 
        {/* Action Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            {campaign.status === 'active' && <PlayCircle className="h-4 w-4 text-green-500" />}
            {campaign.status === 'upcoming' && <Timer className="h-4 w-4 text-blue-500" />}
            {campaign.status === 'ended' && <CheckCircle className="h-4 w-4 text-gray-500" />}
            <span>
              {campaign.status === 'active' && 'Join Campaign'}
              {campaign.status === 'upcoming' && 'Coming Soon'}
              {campaign.status === 'ended' && 'View Results'}
              {campaign.status === 'paused' && 'Campaign Paused'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {campaign.metadata.website && (
              <a 
              
                href={campaign.metadata.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
 }