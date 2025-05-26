'use client';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search,
  Calendar,
  MapPin,
  Users,
  Trophy,
  Code,
  Award,
  CheckCircle,
  PlayCircle,
  ArrowRight,
  BarChart3,
  Building2,
  Layers,
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
  TrendingUp,
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
  Telescope,
  Sparkles,
  Zap,
  Star,
  Eye,
  Plus,
  Rocket,
  Target,
  Lightbulb,
  Activity,
  TrendingUpIcon,
  Clock,
  DollarSign,
  Gift,
  Globe,
  Link,
  AlertTriangle
} from 'lucide-react';
import { useAllProjects } from '@/hooks/useProjectMethods';
import { useAllCampaigns } from '@/hooks/useCampaignMethods';
import { Address } from 'viem';
import { formatEther } from 'viem';
import { formatIpfsUrl } from '@/utils/imageUtils';

// ==================== TYPES ====================

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
  twitter?: string;
  linkedin?: string;
  discord?: string;
  telegram?: string;
  teamMembers?: Array<{
    name: string;
    role: string;
    email?: string;
    linkedin?: string;
    twitter?: string;
  }>;
  contactEmail?: string;
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
  metadata: ParsedCampaignMetadata;
}

// ==================== CONSTANTS ====================

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_V4 as Address;

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const scaleOnHover = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.95 }
};

// ==================== ROADMAP DATA ====================

const roadmapData = [
  {
    version: "V1",
    title: "Proof of Ship",
    status: "completed",
    items: [
      "2-3 successful campaigns launched",
      "Initial user feedback collected",
      "Core voting mechanism implemented"
    ]
  },
  {
    version: "V2",
    title: "Anti-Sybil & Protocol",
    status: "current",
    items: [
      "Self-protocol with 60% testing complete",
      "Good Dollar integration (10% complete)",
      "Enhanced security measures"
    ]
  },
  {
    version: "V3",
    title: "Enhanced Platform",
    status: "active",
    items: [
      "New tested voting system",
      "Projects as moveable entities",
      "Running on Celo mainnet",
      "Multi-token voting (CELO & cUSD)",
      "Complete platform revamp"
    ]
  }
];

// ==================== UTILITY FUNCTIONS ====================

const safeJsonParse = (jsonString: string, fallback = {}) => {
  try {
    return jsonString ? JSON.parse(jsonString) : fallback;
  } catch (e) {
    console.warn('Failed to parse JSON:', e);
    return fallback;
  }
};

const parseProjectMetadata = (projectDetails: any): ParsedProjectMetadata => {
  const { metadata } = projectDetails;
  
  const bioData = safeJsonParse(metadata?.bio || '{}');
  const contractInfo = safeJsonParse(metadata?.contractInfo || '{}');
  const additionalData = safeJsonParse(metadata?.additionalData || '{}');
  
  return {
    tagline: bioData.tagline || '',
    category: bioData.category || '',
    tags: bioData.tags || [],
    location: bioData.location || '',
    establishedDate: bioData.establishedDate || '',
    website: bioData.website || '',
    
    blockchain: contractInfo.blockchain || '',
    techStack: contractInfo.techStack || [],
    license: contractInfo.license || '',
    developmentStage: contractInfo.developmentStage || '',
    openSource: contractInfo.openSource !== undefined ? contractInfo.openSource : true,
    
    logo: additionalData.media?.logo || additionalData.logo || '',
    coverImage: additionalData.media?.coverImage || additionalData.coverImage || '',
    demoVideo: additionalData.media?.demoVideo || additionalData.demoVideo || '',
    
    demoUrl: additionalData.links?.demoUrl || additionalData.demoUrl || '',
    githubRepo: additionalData.links?.githubRepo || additionalData.githubRepo || '',
    documentation: additionalData.links?.documentation || additionalData.documentation || '',
    karmaGapProfile: additionalData.links?.karmaGapProfile || additionalData.karmaGapProfile || '',
    
    twitter: additionalData.links?.twitter || additionalData.social?.twitter || additionalData.twitter || '',
    linkedin: additionalData.links?.linkedin || additionalData.social?.linkedin || additionalData.linkedin || '',
    discord: additionalData.links?.discord || additionalData.social?.discord || additionalData.discord || '',
    telegram: additionalData.links?.telegram || additionalData.social?.telegram || additionalData.telegram || '',
    
    teamMembers: additionalData.teamMembers || [],
    contactEmail: additionalData.contactEmail || '',
    keyFeatures: additionalData.keyFeatures || [],
    
    bio: bioData.bio || metadata?.bio || ''
  };
};

const parseCampaignMetadata = (campaignDetails: any): ParsedCampaignMetadata => {
  const { metadata } = campaignDetails;
  
  const mainInfo = safeJsonParse(metadata?.mainInfo || '{}');
  const additionalInfo = safeJsonParse(metadata?.additionalInfo || '{}');
  
  return {
    tagline: mainInfo.tagline || additionalInfo.tagline || '',
    category: mainInfo.category || additionalInfo.category || '',
    type: mainInfo.type || additionalInfo.type || 'campaign',
    tags: mainInfo.tags || additionalInfo.tags || [],
    
    logo: mainInfo.logo || additionalInfo.logo || '',
    bannerImage: mainInfo.bannerImage || additionalInfo.bannerImage || '',
    website: mainInfo.website || additionalInfo.website || '',
    
    requirements: additionalInfo.requirements || [],
    prizes: additionalInfo.prizes || [],
    judges: additionalInfo.judges || [],
    sponsors: additionalInfo.sponsors || [],
    
    bio: mainInfo.bio || additionalInfo.bio || metadata?.mainInfo || ''
  };
};

const getCampaignStatus = (campaign: any): 'upcoming' | 'active' | 'ended' | 'paused' => {
  const now = Math.floor(Date.now() / 1000);
  const start = Number(campaign.startTime);
  const end = Number(campaign.endTime);
  
  if (!campaign.active) return 'paused';
  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'active';
  return 'ended';
};

// ==================== COMPONENTS ====================

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  gradient: string;
}

const StatCard = ({ icon: Icon, label, value, gradient }: StatCardProps) => (
  <motion.div
    className={`relative p-6 rounded-2xl bg-gradient-to-br ${gradient} border border-white/20 backdrop-blur-sm overflow-hidden group`}
    whileHover={{ scale: 1.05, y: -5 }}
    transition={{ type: "spring", stiffness: 300, damping: 30 }}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <Icon className="h-8 w-8 text-white" />
        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
          <Sparkles className="h-5 w-5 text-white animate-pulse" />
        </div>
      </div>
      <div className="text-3xl font-bold text-white mb-2">{value}</div>
      <div className="text-white/90 font-medium">{label}</div>
    </div>
  </motion.div>
);

const ProjectCard = ({ project }: { project: EnhancedProject }) => {
  const navigate = useNavigate();

  return (
    <motion.div
      onClick={() => navigate(`/projects/${project.id}`)}
      className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden cursor-pointer relative"
      whileHover={{ y: -8, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Project Image */}
      <div className="relative aspect-video overflow-hidden">
        {project.metadata.logo || project.metadata.coverImage ? (
          <img
            src={formatIpfsUrl(project.metadata.logo ?? project.metadata.coverImage ?? '')}
            alt={project.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Code className="h-12 w-12 text-white" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm ${
            project.active 
              ? 'bg-emerald-500/90 text-white' 
              : 'bg-gray-500/90 text-white'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              project.active ? 'bg-white animate-pulse' : 'bg-gray-300'
            }`} />
            {project.active ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Category Badge */}
        {project.metadata.category && (
          <div className="absolute bottom-4 left-4">
            <span className="inline-flex items-center px-3 py-1.5 bg-black/70 backdrop-blur-sm text-white text-xs font-semibold rounded-full">
              {project.metadata.category}
            </span>
          </div>
        )}

        {/* Campaigns Count */}
        {project.campaignIds.length > 0 && (
          <div className="absolute top-4 left-4">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2">
              <div className="flex items-center gap-1">
                <Trophy className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-bold text-gray-900">{project.campaignIds.length}</span>
              </div>
              <p className="text-xs text-gray-600">Campaigns</p>
            </div>
          </div>
        )}
      </div>

      {/* Project Info */}
      <div className="p-6 relative z-10">
        <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-1">
          {project.name}
        </h3>

        <p className="text-gray-600 mb-4 line-clamp-2 leading-relaxed">
          {project.metadata.tagline || project.metadata.bio || project.description}
        </p>

        {/* Project Meta */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
          {project.metadata.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{project.metadata.location}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{new Date(Number(project.createdAt) * 1000).toLocaleDateString()}</span>
          </div>
          {project.metadata.blockchain && (
            <div className="flex items-center gap-1">
              <Network className="h-3 w-3" />
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
                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg"
              >
                #{tag}
              </span>
            ))}
            {project.metadata.tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg">
                +{project.metadata.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Action Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Eye className="h-4 w-4" />
            <span>View Project</span>
          </div>
          <div className="flex items-center gap-2">
            {project.metadata.githubRepo && (
              <a
                href={project.metadata.githubRepo}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
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
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const CampaignCard = ({ campaign }: { campaign: EnhancedCampaign }) => {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return { bg: 'bg-emerald-500/90', text: 'text-white', dot: 'bg-white' };
      case 'upcoming': return { bg: 'bg-blue-500/90', text: 'text-white', dot: 'bg-white' };
      case 'ended': return { bg: 'bg-gray-500/90', text: 'text-white', dot: 'bg-gray-300' };
      case 'paused': return { bg: 'bg-orange-500/90', text: 'text-white', dot: 'bg-white' };
      default: return { bg: 'bg-gray-500/90', text: 'text-white', dot: 'bg-gray-300' };
    }
  };

  const statusColors = getStatusColor(campaign.status);
  const daysLeft = campaign.status === 'active' 
    ? Math.max(0, Math.ceil((Number(campaign.endTime) - Date.now() / 1000) / (24 * 60 * 60)))
    : 0;

  const fundingAmount = parseFloat(formatEther(campaign.totalFunds));

  return (
    <motion.div
      onClick={() => navigate(`/campaigns/${campaign.id}`)}
      className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden cursor-pointer relative"
      whileHover={{ y: -8, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Campaign Image */}
      <div className="relative aspect-video overflow-hidden">
        {campaign.metadata.logo || campaign.metadata.bannerImage ? (
          <img
            src={formatIpfsUrl(campaign.metadata.logo ?? campaign.metadata.bannerImage ?? '')}
            alt={campaign.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Trophy className="h-12 w-12 text-white" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm ${statusColors.bg} ${statusColors.text}`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${statusColors.dot} ${campaign.status === 'active' ? 'animate-pulse' : ''}`} />
            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
          </span>
        </div>

        {/* Type Badge */}
        {campaign.metadata.type && (
          <div className="absolute bottom-4 left-4">
            <span className="inline-flex items-center px-3 py-1.5 bg-black/70 backdrop-blur-sm text-white text-xs font-semibold rounded-full">
              {campaign.metadata.type.replace('_', ' ').split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')}
            </span>
          </div>
        )}

        {/* Prize Pool Overlay */}
        {fundingAmount > 0 && (
          <div className="absolute top-4 left-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2">
              <div className="flex items-center gap-1">
                <Coins className="h-4 w-4 text-green-600" />
                <span className="font-bold text-green-600 text-lg">{fundingAmount.toFixed(1)}</span>
              </div>
              <p className="text-xs text-gray-600">CELO Prize</p>
            </div>
          </div>
        )}

        {/* Days Left */}
        {campaign.status === 'active' && daysLeft > 0 && (
          <div className="absolute bottom-4 right-4">
            <div className="bg-red-500/90 backdrop-blur-sm rounded-lg px-3 py-2 text-white">
              <div className="flex items-center gap-1">
                <Timer className="h-4 w-4" />
                <span className="font-bold text-sm">{daysLeft}d</span>
              </div>
              <p className="text-xs">Left</p>
            </div>
          </div>
        )}
      </div>

      {/* Campaign Info */}
      <div className="p-6 relative z-10">
        <h3 className="text-xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors mb-2 line-clamp-1">
          {campaign.name}
        </h3>

        <p className="text-gray-600 mb-4 line-clamp-2 leading-relaxed">
          {campaign.metadata.tagline || campaign.metadata.bio || campaign.description}
        </p>

        {/* Campaign Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Coins className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Funding</span>
            </div>
            <p className="font-bold text-green-600 text-lg">
              {fundingAmount.toFixed(1)}
            </p>
            <p className="text-xs text-green-700">CELO</p>
          </div>
          <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Award className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Winners</span>
            </div>
            <p className="font-bold text-purple-600 text-lg">
              {campaign.maxWinners > 0n ? Number(campaign.maxWinners) : '∞'}
            </p>
            <p className="text-xs text-purple-700">Max</p>
          </div>
        </div>

        {/* Campaign Timeline */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
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
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
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
                className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-lg"
              >
                #{tag}
              </span>
            ))}
            {campaign.metadata.tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg">
                +{campaign.metadata.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Action Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-600">
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
          <div className="flex items-center gap-2">
            {campaign.metadata.website && (
              <a 
                href={campaign.metadata.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const RoadmapSection = () => (
  <motion.section
    className="py-20 relative overflow-hidden"
    initial="initial"
    whileInView="animate"
    viewport={{ once: true }}
    variants={staggerContainer}
  >
    {/* Background Elements */}
    <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-blue-50" />
    <div className="absolute top-10 left-10 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl animate-pulse" />
    <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
    
    <div className="relative max-w-7xl mx-auto px-6">
      <motion.div className="text-center mb-16" variants={fadeInUp}>
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          Our Journey & Roadmap
        </h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          From proof of concept to a robust multi-token voting platform on Celo
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {roadmapData.map((phase, idx) => (
          <motion.div
            key={phase.version}
            className={`relative p-8 rounded-2xl border-2 ${
              phase.status === 'completed' ? 'bg-green-50 border-green-200' :
           phase.status === 'current' ? 'bg-blue-50 border-blue-200' :
           phase.status === 'active' ? 'bg-purple-50 border-purple-200' :
           'bg-gray-50 border-gray-200'
         } backdrop-blur-sm`}
           variants={fadeInUp}
           whileHover={{ y: -5 }}
           transition={{ delay: idx * 0.1 }}
         >
           {/* Status Badge */}
           <div className={`absolute -top-3 left-6 px-4 py-1 rounded-full text-sm font-semibold ${
             phase.status === 'completed' ? 'bg-green-500 text-white' :
             phase.status === 'current' ? 'bg-blue-500 text-white' :
             phase.status === 'active' ? 'bg-purple-500 text-white' :
             'bg-gray-500 text-white'
           }`}>
             {phase.status === 'completed' ? '✓ Completed' :
              phase.status === 'current' ? '🔄 In Progress' :
              phase.status === 'active' ? '🚀 Live' : 'Planned'}
           </div>

           {/* Version Badge */}
           <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl text-2xl font-bold text-white mb-6 ${
             phase.status === 'completed' ? 'bg-green-500' :
             phase.status === 'current' ? 'bg-blue-500' :
             phase.status === 'active' ? 'bg-purple-500' :
             'bg-gray-500'
           }`}>
             {phase.version}
           </div>

           <h3 className="text-2xl font-bold text-gray-900 mb-4">{phase.title}</h3>

           <ul className="space-y-3">
             {phase.items.map((item, itemIdx) => (
               <li key={itemIdx} className="flex items-start gap-3">
                 <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                   phase.status === 'completed' ? 'bg-green-500' :
                   phase.status === 'current' ? 'bg-blue-500' :
                   phase.status === 'active' ? 'bg-purple-500' :
                   'bg-gray-400'
                 }`} />
                 <span className="text-gray-700 leading-relaxed">{item}</span>
               </li>
             ))}
           </ul>

           {/* Progress Indicator */}
           {phase.status === 'current' && (
             <div className="mt-6">
               <div className="flex items-center justify-between text-sm text-blue-600 mb-2">
                 <span>Progress</span>
                 <span>60%</span>
               </div>
               <div className="w-full bg-blue-100 rounded-full h-2">
                 <motion.div
                   className="bg-blue-500 h-2 rounded-full"
                   initial={{ width: 0 }}
                   animate={{ width: "60%" }}
                   transition={{ duration: 1, delay: 0.5 }}
                 />
               </div>
             </div>
           )}
         </motion.div>
       ))}
     </div>
   </div>
 </motion.section>
);

// ==================== MAIN COMPONENT ====================

export default function HomePage() {
 const navigate = useNavigate();
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
     .slice(0, 6);

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
     .slice(0, 6);

   setFeaturedCampaigns(featured);
 }, [campaigns]);

 if (!isMounted) {
   return null;
 }

 const isLoading = projectsLoading || campaignsLoading;
 const error = projectsError || campaignsError;

 if (error) {
   return (
     <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
       <motion.div 
         className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md mx-auto border border-red-200"
         initial={{ opacity: 0, scale: 0.8 }}
         animate={{ opacity: 1, scale: 1 }}
         transition={{ duration: 0.5 }}
       >
         <div className="text-center">
           <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
             <AlertTriangle className="h-8 w-8 text-red-600" />
           </div>
           <h2 className="text-2xl font-bold text-red-600 mb-4">Unable to Load</h2>
           <p className="text-gray-600 mb-6">{error.message || 'Something went wrong'}</p>
           <motion.button 
             onClick={() => window.location.reload()} 
             className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
           >
             Try Again
           </motion.button>
         </div>
       </motion.div>
     </div>
   );
 }

 if (isLoading) {
   return (
     <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
       <motion.div 
         className="text-center"
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ duration: 0.5 }}
       >
         <div className="relative mb-8">
           <motion.div 
             className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto"
             animate={{ rotate: 360 }}
             transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
           />
           <motion.div
             className="absolute inset-0 flex items-center justify-center"
             animate={{ scale: [1, 1.1, 1] }}
             transition={{ duration: 2, repeat: Infinity }}
           >
             <Home className="h-10 w-10 text-blue-600" />
           </motion.div>
         </div>
         <motion.h2 
           className="text-2xl font-bold text-gray-800 mb-2"
           initial={{ y: 20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           transition={{ delay: 0.2 }}
         >
           Loading Ecosystem
         </motion.h2>
         <motion.p 
           className="text-gray-600"
           initial={{ y: 20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           transition={{ delay: 0.4 }}
         >
           Discovering projects and opportunities...
         </motion.p>
       </motion.div>
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
     {/* Hero Section - Minimal */}
     <motion.section 
       className="relative py-20 px-6"
       initial="initial"
       animate="animate"
       variants={staggerContainer}
     >
       {/* Background Elements */}
       <div className="absolute inset-0 overflow-hidden">
         <motion.div 
           className="absolute top-20 left-20 w-64 h-64 bg-blue-400/5 rounded-full blur-3xl"
           animate={{ 
             scale: [1, 1.2, 1],
             rotate: [0, 180, 360] 
           }}
           transition={{ 
             duration: 20,
             repeat: Infinity,
             ease: "linear"
           }}
         />
         <motion.div 
           className="absolute bottom-20 right-20 w-80 h-80 bg-purple-400/5 rounded-full blur-3xl"
           animate={{ 
             scale: [1.2, 1, 1.2],
             rotate: [360, 180, 0] 
           }}
           transition={{ 
             duration: 25,
             repeat: Infinity,
             ease: "linear"
           }}
         />
       </div>
       
       <div className="relative max-w-6xl mx-auto text-center">
         <motion.div 
           className="inline-flex items-center gap-3 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-white/20 mb-8"
           variants={fadeInUp}
         >
           <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
             <Rocket className="h-4 w-4 text-white" />
           </div>
           <span className="text-gray-700 font-medium">Welcome to Sovereign Seas</span>
         </motion.div>
         
         <motion.h1 
           className="text-5xl md:text-7xl font-bold text-gray-900 mb-6"
           variants={fadeInUp}
         >
           Fund the{' '}
           <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
             Future
           </span>
         </motion.h1>
         
         <motion.p 
           className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed"
           variants={fadeInUp}
         >
           Discover innovative projects, participate in funding campaigns, and shape the next generation of technology on Celo.
         </motion.p>

         {/* Search Bar */}
         <motion.div 
           className="max-w-2xl mx-auto mb-12"
           variants={fadeInUp}
         >
           <div className="relative">
             <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
             <input
               type="text"
               placeholder="Search projects, campaigns, or technologies..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full pl-14 pr-6 py-4 rounded-2xl bg-white/90 backdrop-blur-sm border border-white/30 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-gray-900 placeholder-gray-500 shadow-lg"
             />
           </div>
         </motion.div>

         {/* Action Buttons */}
         <motion.div 
           className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16"
           variants={staggerContainer}
         >
           <motion.button
             onClick={() => navigate('/projects')}
             className="px-8 py-4 bg-white text-blue-600 rounded-2xl font-semibold hover:bg-gray-50 transition-all shadow-lg border border-gray-200 flex items-center gap-3 group"
             variants={scaleOnHover}
           >
             <Code className="h-5 w-5" />
             <span>Explore Projects</span>
             <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
           </motion.button>
           <motion.button
             onClick={() => navigate('/campaigns')}
             className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold hover:shadow-xl transition-all flex items-center gap-3 group"
             variants={scaleOnHover}
           >
             <Trophy className="h-5 w-5" />
             <span>View Campaigns</span>
             <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
           </motion.button>
         </motion.div>

         {/* Stats */}
         <motion.div 
           className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto"
           variants={staggerContainer}
         >
           <StatCard 
             icon={Code} 
             label="Total Projects" 
             value={totalProjects} 
             gradient="from-blue-500 to-indigo-600"
           />
           <StatCard 
             icon={Trophy} 
             label="Active Campaigns" 
             value={totalCampaigns} 
             gradient="from-purple-500 to-pink-600"
           />
           <StatCard 
             icon={Coins} 
             label="CELO Raised" 
             value={`${totalFunds.toFixed(1)}K`} 
             gradient="from-green-500 to-emerald-600"
           />
           <StatCard 
             icon={Activity} 
             label="Live Projects" 
             value={activeProjects + activeCampaigns} 
             gradient="from-orange-500 to-red-600"
           />
         </motion.div>
       </div>
     </motion.section>

     <div className="max-w-7xl mx-auto px-6 pb-20">
       {/* Featured Projects Section */}
       <motion.section 
         className="mb-20"
         initial="initial"
         whileInView="animate"
         viewport={{ once: true }}
         variants={staggerContainer}
       >
         <motion.div 
           className="flex items-center justify-between mb-12"
           variants={fadeInUp}
         >
           <div>
             <h2 className="text-4xl font-bold text-gray-900 mb-4 flex items-center gap-3">
               <Star className="h-8 w-8 text-yellow-500" />
               Featured Projects
             </h2>
             <p className="text-gray-600 text-lg">Innovative projects making waves in the ecosystem</p>
           </div>
           <motion.button
             onClick={() => navigate('/projects')}
             className="flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium group"
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
           >
             <span>View All Projects</span>
             <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
           </motion.button>
         </motion.div>

         {featuredProjects.length > 0 ? (
           <motion.div 
             className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
             variants={staggerContainer}
           >
             {featuredProjects.map(project => (
               <motion.div key={project.id.toString()} variants={fadeInUp}>
                 <ProjectCard project={project} />
               </motion.div>
             ))}
           </motion.div>
         ) : (
           <motion.div 
             className="text-center py-16 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200"
             variants={fadeInUp}
           >
             <Code className="h-16 w-16 text-gray-400 mx-auto mb-6" />
             <h3 className="text-2xl font-semibold text-gray-700 mb-4">No Featured Projects Yet</h3>
             <p className="text-gray-600 mb-8 text-lg">Be the first to create an innovative project</p>
             <motion.button
               onClick={() => navigate('/create-project')}
               className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
             >
               Create Project
             </motion.button>
           </motion.div>
         )}
       </motion.section>

       {/* Featured Campaigns Section */}
       <motion.section 
         className="mb-20"
         initial="initial"
         whileInView="animate"
         viewport={{ once: true }}
         variants={staggerContainer}
       >
         <motion.div 
           className="flex items-center justify-between mb-12"
           variants={fadeInUp}
         >
           <div>
             <h2 className="text-4xl font-bold text-gray-900 mb-4 flex items-center gap-3">
               <Trophy className="h-8 w-8 text-purple-500" />
               Active Campaigns
             </h2>
             <p className="text-gray-600 text-lg">Live funding opportunities and competitions</p>
           </div>
           <motion.button
             onClick={() => navigate('/campaigns')}
             className="flex items-center gap-3 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium group"
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
           >
             <span>View All Campaigns</span>
             <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
           </motion.button>
         </motion.div>

         {featuredCampaigns.length > 0 ? (
           <motion.div 
             className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
             variants={staggerContainer}
           >
             {featuredCampaigns.map(campaign => (
               <motion.div key={campaign.id.toString()} variants={fadeInUp}>
                 <CampaignCard campaign={campaign} />
               </motion.div>
             ))}
           </motion.div>
         ) : (
           <motion.div 
             className="text-center py-16 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200"
             variants={fadeInUp}
           >
             <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-6" />
             <h3 className="text-2xl font-semibold text-gray-700 mb-4">No Active Campaigns</h3>
             <p className="text-gray-600 mb-8 text-lg">Be the first to start a funding campaign</p>
             <motion.button
               onClick={() => navigate('/create-campaign')}
               className="px-8 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
             >
               Start Campaign
             </motion.button>
           </motion.div>
         )}
       </motion.section>

       {/* Roadmap Section */}
       <RoadmapSection />

       {/* Quick Actions Section */}
       <motion.section 
         className="mt-20"
         initial="initial"
         whileInView="animate"
         viewport={{ once: true }}
         variants={staggerContainer}
       >
         <motion.div 
           className="bg-white/80 backdrop-blur-sm rounded-3xl border border-gray-200 p-12 shadow-xl"
           variants={fadeInUp}
         >
           <motion.h2 
             className="text-3xl font-bold text-gray-900 mb-12 text-center"
             variants={fadeInUp}
           >
             Ready to Get Started?
           </motion.h2>
           <motion.div 
             className="grid grid-cols-1 lg:grid-cols-2 gap-8"
             variants={staggerContainer}
           >
             <motion.div 
               className="text-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 group hover:shadow-lg transition-all duration-300"
               variants={fadeInUp}
               whileHover={{ y: -5 }}
             >
               <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                 <Code className="h-10 w-10 text-white" />
               </div>
               <h3 className="text-2xl font-semibold text-gray-900 mb-4">Create a Project</h3>
               <p className="text-gray-600 mb-8 leading-relaxed">Share your innovative idea with the community and attract collaborators</p>
               <motion.button
                 onClick={() => navigate('/create-project')}
                 className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
               >
                 Start Building
               </motion.button>
             </motion.div>
             
             <motion.div 
               className="text-center p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-100 group hover:shadow-lg transition-all duration-300"
               variants={fadeInUp}
               whileHover={{ y: -5 }}
             >
               <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                 <Trophy className="h-10 w-10 text-white" />
               </div>
               <h3 className="text-2xl font-semibold text-gray-900 mb-4">Launch a Campaign</h3>
               <p className="text-gray-600 mb-8 leading-relaxed">Fund innovative projects and discover the next big breakthrough</p>
               <motion.button
                 onClick={() => navigate('/create-campaign')}
                 className="px-8 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
               >
                 Start Funding
               </motion.button>
             </motion.div>
           </motion.div>
         </motion.div>
       </motion.section>
     </div>
   </div>
 );
}