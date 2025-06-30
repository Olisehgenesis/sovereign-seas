// @ts-nocheck

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { 
  Search,
  MapPin,
  Trophy,
  Code,
  Award,
  CheckCircle,
  ArrowRight, 
  Network,
  Timer,
  Sparkles,
  Star,
  Rocket,
  Activity,
  AlertTriangle,
  Anchor,
  Globe,
  Lightbulb,
  Shield,
  BarChart,
  DollarSign,
  ArrowUpRight,
  Zap,
  CreditCard
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
  id: string;
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

// Helper function to safely convert values to displayable strings
const formatDisplayValue = (value: string | number | bigint): string => {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  return String(value);
};

// Helper function to safely format bigint numbers
const formatBigIntNumber = (value: bigint): string => {
  return Number(value).toLocaleString();
};

// Add this custom hook after the existing hooks
const useCountUp = (end: number, duration: number = 2000) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (inView) {
      setIsVisible(true);
      let startTime: number;
      let animationFrame: number;

      const animate = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        
        setCount(Math.floor(progress * end));

        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate);
        }
      };

      animationFrame = requestAnimationFrame(animate);

      return () => {
        cancelAnimationFrame(animationFrame);
      };
    }
  }, [end, duration, inView]);

  return { count, ref };
};

// ==================== COMPONENTS ====================

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  gradient: string;
}

const ScrollAnimationWrapper = ({ children, delay = 0, direction = 'up' }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  const variants = {
    hidden: {
      opacity: 0,
      y: direction === 'up' ? 50 : -50,
      x: direction === 'left' ? 50 : direction === 'right' ? -50 : 0,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: {
        duration: 0.8,
        delay: delay,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
    >
      {children}
    </motion.div>
  );
};

const StatCard = ({ icon: Icon, label, value }: StatCardProps) => {
  const numericValue = typeof value === 'string' ? parseInt(value.replace(/[^0-9]/g, '')) : Number(value);
  const { count, ref } = useCountUp(numericValue);
  
  // Format the value with appropriate suffix
  const formattedValue = typeof value === 'string' && value.includes('K') 
    ? `${count}K`
    : typeof value === 'string' && value.includes('CELO')
    ? `${count} CELO`
    : count.toString();

  return (
    <motion.div
      ref={ref}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden border border-blue-100 group hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 relative"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 via-transparent to-indigo-400/5"></div>
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-500"></div>
      <div className="p-5 relative">
        <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity duration-500">
          <Icon className="h-6 w-6 text-blue-500" />
        </div>
        <p className="text-indigo-500 font-medium">{label}</p>
        <p className="text-3xl font-bold text-gray-800 mt-1 mb-2">{formattedValue}</p>
        <div className="w-full h-1 rounded-full bg-blue-100 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width: "75%" }}></div>
        </div>
      </div>
    </motion.div>
  );
};

const ProjectCard = ({ project }: { project: EnhancedProject }) => {
  const navigate = useNavigate();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={{ scale: 1.02 }}
      onClick={() => navigate(`/explorer/project/${project.id}`)}
      className="group bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-blue-100 overflow-hidden cursor-pointer relative hover:shadow-xl hover:-translate-y-3 transition-all duration-500"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
      
      {/* Project Image */}
      <div className="relative h-40 sm:h-48 bg-gradient-to-r from-blue-100 to-indigo-100 overflow-hidden">
        {project.metadata.logo || project.metadata.coverImage ? (
          <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${formatIpfsUrl(project.metadata.logo ?? project.metadata.coverImage ?? '')})`, opacity: 0.9 }}></div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <Code className="h-16 w-16 text-blue-500" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
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
          <div className="absolute top-3 left-3">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2">
              <div className="flex items-center gap-1">
                <Trophy className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-bold text-gray-900">{project.campaignIds.length}</span>
              </div>
              <p className="text-xs text-gray-600">Campaigns</p>
            </div>
          </div>
        )}

        {/* Project name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-8 z-10">
          <div className="flex justify-between items-start">
            <div className="flex-1 pr-4">
              <h3 className="text-base sm:text-lg font-bold text-white mb-1 group-hover:text-blue-100 transition-colors line-clamp-2">{project.name}</h3>
            </div>
            <div className="flex flex-col items-end text-white/90 text-sm font-medium">
              <div className="flex items-center">
                <BarChart className="h-3.5 w-3.5 mr-1.5" />
                {new Date(Number(project.createdAt) * 1000).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Info */}
      <div className="p-4 relative z-10">
        <p className="text-gray-600 text-xs sm:text-sm mb-4 line-clamp-2">{project.metadata.tagline || project.metadata.bio || project.description}</p>

        {/* Project Meta */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
          {project.metadata.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{project.metadata.location}</span>
            </div>
          )}
          {project.metadata.blockchain && (
            <div className="flex items-center gap-1">
              <Network className="h-3 w-3" />
              <span>{project.metadata.blockchain}</span>
            </div>
          )}
        </div>

        {/* Tags and Action Button in one line */}
        <div className="flex items-center justify-between">
          {/* Tags */}
          {project.metadata.tags && project.metadata.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {project.metadata.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg"
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
          
          {/* Action Button */}
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md transform group-hover:rotate-45 transition-transform duration-500">
            <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const CampaignCard = ({ campaign, index }: { campaign: EnhancedCampaign; index: number }) => {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState('');
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  // Calculate time status properly
  const now = Math.floor(Date.now() / 1000);
  const hasStarted = now >= Number(campaign.startTime);
  const hasEnded = now >= Number(campaign.endTime);
  
  // Format CELO amount as whole number - convert bigint to number safely
  const celoAmount = Math.floor(Number(formatEther(campaign.totalFunds)) || 0).toString();
  
  // Determine status class and text
  let statusClass = 'bg-gray-200 text-gray-700';
  let statusText = 'Ended';
  let StatusIcon = CheckCircle;
  
  if (!hasStarted) {
    statusClass = 'bg-cyan-400 text-blue-900';
    statusText = 'Coming Soon';
    StatusIcon = Timer;
  } else if (!hasEnded) {
    statusClass = 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white';
    statusText = 'Active';
    StatusIcon = Activity;
  }

  // Countdown timer effect
  useEffect(() => {
    if (!hasStarted) {
      const updateCountdown = () => {
        const startTime = Number(campaign.startTime);
        const now = Math.floor(Date.now() / 1000);
        const diff = startTime - now;

        if (diff <= 0) {
          setTimeLeft('Starting...');
          return;
        }

        const days = Math.floor(diff / 86400);
        const hours = Math.floor((diff % 86400) / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;

        setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }
  }, [campaign.startTime, hasStarted]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.8, delay: index * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={{ scale: 1.02 }}
      onClick={() => navigate(`/explorer/campaign/${campaign.id.toString()}`)}
      className="group relative bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-blue-100 hover:shadow-xl hover:-translate-y-3 transition-all duration-500 cursor-pointer"
    >
      {/* Enhanced shadow and glow effects */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
      
      <div className="h-40 sm:h-48 bg-gradient-to-r from-blue-100 to-indigo-100 relative overflow-hidden">
        {campaign.metadata.logo ? (
          <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${formatIpfsUrl(campaign.metadata.logo)})`, opacity: 0.9 }}></div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <Anchor className="h-16 w-16 text-blue-500" />
          </div>
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        
        {/* Status badge with improved styling */}
        <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-medium flex items-center shadow-md z-10 ${statusClass}`}>
          <StatusIcon className="h-3 w-3 mr-1.5" />
          {statusText}
        </div>
        
        {/* Campaign name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <div className="flex justify-between items-start">
            <div className="flex-1 pr-4">
              <h3 className="text-sm sm:text-base font-bold text-white mb-1 group-hover:text-blue-100 transition-colors line-clamp-2">{campaign.name}</h3>
            </div>
            <div className="flex flex-col items-end text-white/90 text-sm font-medium">
              <div className="flex items-center">
                <BarChart className="h-3.5 w-3.5 mr-1.5" />
                {celoAmount} CELO
              </div>
            </div>
          </div>
        </div>
        
        {/* Time remaining indicator with better formatting */}
        {!hasStarted && (
          <div className="absolute top-3 left-3 px-3 py-1.5 bg-blue-500/70 text-white text-xs rounded-full backdrop-blur-sm flex items-center">
            <Timer className="h-3 w-3 mr-1.5 animate-pulse" /> 
            <span className="font-bold">{timeLeft}</span>
          </div>
        )}

        {hasStarted && !hasEnded && campaign.endTime && (
          <div className="absolute top-3 left-3 px-3 py-1.5 bg-indigo-500/70 text-white text-xs rounded-full backdrop-blur-sm flex items-center">
            <Timer className="h-3 w-3 mr-1.5 animate-pulse" /> 
            <span className="font-bold">
              {(() => {
                const endDiff = Number(campaign.endTime) - now;
                if (endDiff <= 0) return "Ending soon";
                
                const days = Math.floor(endDiff / 86400);
                const hours = Math.floor((endDiff % 86400) / 3600);
                
                return `${days}d ${hours}h left`;
              })()}
            </span>
          </div>
        )}
        
        {hasEnded && (
          <div className="absolute top-3 left-3 px-3 py-1.5 bg-gray-500/70 text-white text-xs rounded-full backdrop-blur-sm flex items-center">
            <CheckCircle className="h-3 w-3 mr-1.5" /> 
            <span className="font-bold">Ended</span>
          </div>
        )}
      </div>
      
      <div className="p-4 relative">
        <p className="text-gray-600 text-xs sm:text-sm mb-4 line-clamp-2">{campaign.metadata.bio['tagline'] }</p>
        
        <div className="absolute bottom-4 right-4 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md transform group-hover:rotate-45 transition-transform duration-500">
          <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </div>
        
        {/* Voting tokens for this campaign */}
        <div className="flex -space-x-1.5">
          <div className="w-6 h-6 rounded-full bg-white ring-2 ring-white flex items-center justify-center overflow-hidden">
            <img src="/images/celo.png" alt="CELO" className="w-full h-full object-cover" />
          </div>
          {(index === 0 || index === 2) && (
            <div className="w-6 h-6 rounded-full bg-white ring-2 ring-white flex items-center justify-center overflow-hidden">
              <img src="/images/cusd.png" alt="cUSD" className="w-full h-full object-cover" />
            </div>
          )}
          {index === 1 && (
            <div className="w-6 h-6 rounded-full bg-purple-100 ring-2 ring-white flex items-center justify-center text-purple-500 text-xs font-bold">G</div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ==================== MAIN COMPONENT ====================

export default function HomePage() {
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredProjects, setFeaturedProjects] = useState<EnhancedProject[]>([]);
  const [featuredCampaigns, setFeaturedCampaigns] = useState<EnhancedCampaign[]>([]);
  const [currentToken, setCurrentToken] = useState(0);
  
  const tokens = ['CELO', 'cUSD', 'GS', 'GLOdollar'];
  const tokenColors = ['text-green-500', 'text-blue-500', 'text-purple-500', 'text-yellow-500'];

  // Use hooks for data fetching
  const { projects, isLoading: projectsLoading, error: projectsError } = useAllProjects(CONTRACT_ADDRESS);
  const { campaigns, isLoading: campaignsLoading, error: campaignsError } = useAllCampaigns(CONTRACT_ADDRESS);

  // Typing animation for tokens
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentToken((prev) => (prev + 1) % tokens.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [tokens.length]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Process and set featured projects
  useEffect(() => {
    if (!projects) return;

    const enhanced = projects.map(projectDetails => {
      const parsedMetadata = parseProjectMetadata(projectDetails);
      
      return {
        id: String(projectDetails.project.id),
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
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-blue-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md mx-auto border border-red-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
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
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Anchor className="h-10 w-10 text-blue-600 animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading Ecosystem</h2>
          <p className="text-gray-600">Discovering projects and opportunities...</p>
        </div>
      </div>
    );
  }

  // Safe calculations for stats
  const totalProjects = projects?.length || 0;
  const totalCampaigns = campaigns?.length || 0;
  const totalFunds = featuredCampaigns.reduce((sum, c) => sum + parseFloat(formatEther(c.totalFunds)), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-blue-50 to-cyan-50 transition-all duration-300 pt-20">
      {/* Hero Section with Geometric Elements - following original design */}
     
      
      {/* Token Distribution Visualization - following original design */}
      <ScrollAnimationWrapper>
        <div className="container mx-auto px-4 sm:px-6 -mt-4 mb-16">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-5 shadow-lg border border-blue-100 overflow-hidden relative">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-4 md:mb-0 md:mr-8 w-full md:w-auto">
                <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center justify-center md:justify-start">
                  <BarChart className="h-5 w-5 mr-2 text-blue-500" />
                  Multi-Token  Governance and Voting Ecosystem
                </h3>
                <p className="text-sm text-gray-600 mb-2 text-center md:text-left">Vote with any supported token in our ecosystem</p>
                
                <div className="flex space-x-2 flex-wrap justify-center md:justify-start">
                  <div className="flex items-center px-3 py-1 bg-gradient-to-r from-green-100 to-green-200 rounded-full text-green-800 text-sm font-medium border border-green-300/50 shadow-sm transform hover:scale-105 transition-transform duration-300 mb-2">
                    <div className="w-4 h-4 rounded-full bg-green-500 mr-1.5 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">$</span>
                    </div>
                    CELO
                  </div>
                  <div className="flex items-center px-3 py-1 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full text-blue-800 text-sm font-medium border border-blue-300/50 shadow-sm transform hover:scale-105 transition-transform duration-300 mb-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500 mr-1.5 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">$</span>
                    </div>
                    cUSD
                  </div>
                  <div className="flex items-center px-3 py-1 bg-gradient-to-r from-purple-100 to-purple-200 rounded-full text-purple-800 text-sm font-medium border border-purple-300/50 shadow-sm transform hover:scale-105 transition-transform duration-300 mb-2">
                    <div className="w-4 h-4 rounded-full bg-purple-500 mr-1.5 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">$</span>
                    </div>
                    GS
                  </div>
                  <div className="flex items-center px-3 py-1 bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-full text-yellow-800 text-sm font-medium border border-yellow-300/50 shadow-sm transform hover:scale-105 transition-transform duration-300 mb-2">
                    <div className="w-4 h-4 rounded-full bg-yellow-500 mr-1.5 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">$</span>
                    </div>
                    GLOdollar
                  </div>
                </div>
              </div>
              
              <div className="w-full md:w-1/2">
                <div className="flex items-center h-6 rounded-full overflow-hidden bg-gray-100/80 shadow-inner">
                  <div className="h-full bg-green-500 flex items-center justify-center relative group overflow-hidden" style={{ width: '45%' }}>
                    <span className="text-xs text-white font-medium px-2 group-hover:scale-110 transition-transform duration-300 hidden sm:block">CELO</span>
                    <span className="text-xs text-white font-medium px-1 sm:hidden">C</span>
                  </div>
                  <div className="h-full bg-blue-500 flex items-center justify-center relative group overflow-hidden" style={{ width: '25%' }}>
                    <span className="text-xs text-white font-medium px-2 group-hover:scale-110 transition-transform duration-300 hidden sm:block">cUSD</span>
                    <span className="text-xs text-white font-medium px-1 sm:hidden">$</span>
                  </div>
                  <div className="h-full bg-purple-500 flex items-center justify-center relative group overflow-hidden" style={{ width: '20%' }}>
                    <span className="text-xs text-white font-medium px-2 group-hover:scale-110 transition-transform duration-300 hidden sm:block">GS</span>
                    <span className="text-xs text-white font-medium px-1 sm:hidden">G</span>
                  </div>
                  <div className="h-full bg-yellow-500 flex items-center justify-center relative group overflow-hidden" style={{ width: '10%' }}>
                    <span className="text-xs text-white font-medium px-1 group-hover:scale-110 transition-transform duration-300">GLO</span>
                  </div>
                </div>
                
                <div className="flex justify-between mt-2 text-xs text-gray-500 flex-wrap">
                  <div className="flex items-center">
                    <Star className="h-3 w-3 mr-1 text-green-500" />
                    <span>CELO: 45%</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="h-3 w-3 mr-1 text-blue-500" />
                    <span>cUSD: 25%</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="h-3 w-3 mr-1 text-purple-500" />
                    <span>GS: 20%</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="h-3 w-3 mr-1 text-yellow-500" />
                    <span>GLO: 10%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollAnimationWrapper>
      
      {/* Stats Section (Floating Cards) - following original design */}
      <ScrollAnimationWrapper>
        <div className="container mx-auto px-4 sm:px-6 mb-16 relative z-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <StatCard 
              icon={Activity} 
              label="Active Campaigns" 
              value={totalCampaigns.toString()} 
              gradient="from-blue-500 to-indigo-600"
            />
            <StatCard 
              icon={Lightbulb} 
              label="Total Projects" 
              value={totalProjects.toString()} 
              gradient="from-purple-500 to-pink-600"
            />
            <StatCard 
              icon={Award} 
              label="Total Votes" 
              value="1,247" 
              gradient="from-green-500 to-emerald-600"
            />
            <StatCard 
              icon={DollarSign} 
              label="Total Value" 
              value={`${totalFunds.toFixed(1)}K CELO`} 
              gradient="from-orange-500 to-red-600"
            />
          </div>
        </div>
      </ScrollAnimationWrapper>
      
      {/* Featured Campaigns Section - following original design */}
      <ScrollAnimationWrapper>
        <div className="container mx-auto px-4 sm:px-6 pb-16">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center mb-3 sm:mb-0">
              <Rocket className="h-5 w-5 text-blue-500 mr-2" />
              Featured Campaigns
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">New</span>
            </h2>
            {featuredCampaigns.length > 0 && (
              <button 
                onClick={() => navigate('/campaigns')}
                className="px-4 py-2 rounded-full text-blue-600 text-sm font-medium hover:bg-blue-50 transition-colors flex items-center group border border-blue-200 shadow-sm hover:shadow-md"
              >
                View All <ArrowRight className="ml-1 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            )}
          </div>
          
          {featuredCampaigns.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
              {featuredCampaigns.map((campaign, index) => (
                <CampaignCard key={campaign.id.toString()} campaign={campaign} index={index} />
              ))}
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 sm:p-8 text-center border border-blue-100 shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 via-transparent to-indigo-100/50"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 mb-4 text-white">
                  <Rocket className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">No Campaigns Yet</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto text-sm sm:text-base">Be the first to create a campaign and start your blockchain journey!</p>
                <button 
                  onClick={() => navigate('/app/campaign/start')}
                  className="px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl transition-all inline-flex items-center group relative overflow-hidden"
                >
                  <Lightbulb className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                  Start a Campaign
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                </button>
              </div>
            </div>
          )}
        </div>
      </ScrollAnimationWrapper>

      {/* Featured Projects Section */}
      <ScrollAnimationWrapper>
        <div className="container mx-auto px-4 sm:px-6 pb-16">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center mb-3 sm:mb-0">
              <Code className="h-5 w-5 text-purple-500 mr-2" />
              Featured Projects
              <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">Active</span>
            </h2>
            {featuredProjects.length > 0 && (
              <button 
                onClick={() => navigate('/projects')}
                className="px-4 py-2 rounded-full text-purple-600 text-sm font-medium hover:bg-purple-50 transition-colors flex items-center group border border-purple-200 shadow-sm hover:shadow-md"
              >
                View All <ArrowRight className="ml-1 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            )}
          </div>
          
          {featuredProjects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
              {featuredProjects.map(project => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 sm:p-8 text-center border border-blue-100 shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-100/50 via-transparent to-indigo-100/50"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 mb-4 text-white">
                  <Code className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">No Projects Yet</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto text-sm sm:text-base">Be the first to create an innovative project!</p>
                <button 
                  onClick={() => navigate('/app/project/start')}
                  className="px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium hover:shadow-xl transition-all inline-flex items-center group relative overflow-hidden"
                >
                  <Code className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                  Create Project
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                </button>
              </div>
            </div>
          )}
        </div>
      </ScrollAnimationWrapper>
      
      {/* How It Works Section - following original design */}
      <ScrollAnimationWrapper>
        <div className="bg-gradient-to-b from-indigo-50 via-blue-50 to-cyan-50 py-12 sm:py-16 relative overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-8 sm:mb-12">
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full mb-3">Simple Process</span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-4">How Sovereign Seas Works</h2>
              <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">A seamless multi-token governance platform for blockchain innovation</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 relative">
              {/* Connecting line (visible on md screens and up) */}
              <div className="hidden md:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-indigo-300 to-blue-200"></div>
              
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-xl border border-blue-100 relative overflow-hidden group hover:shadow-2xl transition-all hover:-translate-y-2 duration-500">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
                <div className="absolute top-0 right-0 h-16 sm:h-24 w-16 sm:w-24 bg-blue-100/50 rounded-bl-full opacity-50 group-hover:bg-blue-200/50 transition-colors"></div>
                
                <div className="relative z-10">
                  <div className="relative mb-6">
                    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl sm:text-2xl font-bold mb-4 shadow-lg group-hover:scale-110 transition-transform duration-500">1</div>
                    <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4">
                      <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 animate-pulse" />
                    </div>
                  </div>
                  
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 flex items-center">
                    Create
                    <ArrowRight className="h-4 w-4 ml-2 text-blue-500 opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all duration-500" />
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mb-4">Start your own campaign with custom parameters and multiple token support.</p>
                  
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center px-2 py-1 bg-blue-50 rounded-full text-blue-700 text-xs">
                      <Rocket className="h-3 w-3 mr-1" />
                      <span>Launch</span>
                    </div>
                    <div className="flex items-center px-2 py-1 bg-blue-50 rounded-full text-blue-700 text-xs">
                      <CreditCard className="h-3 w-3 mr-1" />
                      <span>Multi-Token</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-xl border border-blue-100 relative overflow-hidden group hover:shadow-2xl transition-all hover:-translate-y-2 duration-500">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
                <div className="absolute top-0 right-0 h-16 sm:h-24 w-16 sm:w-24 bg-blue-100/50 rounded-bl-full opacity-50 group-hover:bg-blue-200/50 transition-colors"></div>
                
                <div className="relative z-10">
                  <div className="relative mb-6">
                    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl sm:text-2xl font-bold mb-4 shadow-lg group-hover:scale-110 transition-transform duration-500">2</div>
                    <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4">
                      <Award className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 animate-pulse" />
                    </div>
                  </div>
                  
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 flex items-center">
                    Vote
                    <ArrowRight className="h-4 w-4 ml-2 text-blue-500 opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all duration-500" />
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mb-4">Support initiatives you believe in using CELO, cUSD, GS, or GLOdollar tokens.</p>
                 
                 <div className="flex flex-wrap gap-2">
                   <div className="flex items-center px-2 py-1 bg-green-50 rounded-full text-green-700 text-xs">
                     <DollarSign className="h-3 w-3 mr-1" />
                     <span>CELO</span>
                   </div>
                   <div className="flex items-center px-2 py-1 bg-blue-50 rounded-full text-blue-700 text-xs">
                     <DollarSign className="h-3 w-3 mr-1" />
                     <span>cUSD</span>
                   </div>
                   <div className="flex items-center px-2 py-1 bg-purple-50 rounded-full text-purple-700 text-xs">
                     <DollarSign className="h-3 w-3 mr-1" />
                     <span>GS</span>
                   </div>
                 </div>
               </div>
             </div>
             
             <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-xl border border-blue-100 relative overflow-hidden group hover:shadow-2xl transition-all hover:-translate-y-2 duration-500">
               <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
               <div className="absolute top-0 right-0 h-16 sm:h-24 w-16 sm:w-24 bg-blue-100/50 rounded-bl-full opacity-50 group-hover:bg-blue-200/50 transition-colors"></div>
               
               <div className="relative z-10">
                 <div className="relative mb-6">
                   <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl sm:text-2xl font-bold mb-4 shadow-lg group-hover:scale-110 transition-transform duration-500">3</div>
                   <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4">
                     <BarChart className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 animate-pulse" />
                   </div>
                 </div>
                 
                 <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 flex items-center">
                   Receive
                   <CheckCircle className="h-4 w-4 ml-2 text-blue-500 opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all duration-500" />
                 </h3>
                 <p className="text-xs sm:text-sm text-gray-600 mb-4">Automatic distribution of funds through secure smart contracts.</p>
                 
                 <div className="flex flex-wrap gap-2">
                   <div className="flex items-center px-2 py-1 bg-blue-50 rounded-full text-blue-700 text-xs">
                     <Shield className="h-3 w-3 mr-1" />
                     <span>Secure</span>
                   </div>
                   <div className="flex items-center px-2 py-1 bg-blue-50 rounded-full text-blue-700 text-xs">
                     <Activity className="h-3 w-3 mr-1" />
                     <span>Automated</span>
                   </div>
                 </div>
               </div>
             </div>
           </div>
         </div>
       </div>
     </ScrollAnimationWrapper>
   </div>
 );
}