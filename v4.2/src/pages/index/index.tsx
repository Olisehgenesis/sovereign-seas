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
  CreditCard,
  Gift,
  TrendingUp,
  Users,
  Clock,
  Layers,
  GitCommit,
  Heart,
  Coins,
  ChevronRight,
  Play,
  Vote
} from 'lucide-react';
import { useAllProjects } from '@/hooks/useProjectMethods';
import { useAllCampaigns } from '@/hooks/useCampaignMethods';
import { Address } from 'viem';
import { formatEther } from 'viem';
import { formatIpfsUrl } from '@/utils/imageUtils';
import LocationBadge from '@/components/LocationBadge';
import { getNormalizedLocation } from '@/utils/locationUtils';
import TipModal from '@/components/TipModal';

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

const ScrollingText = ({ words, className = "" }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!words || words.length === 0) return;
    
    const interval = setInterval(() => {
      // Fade out
      setIsVisible(false);
      
      // Change text after fade out
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
        setIsVisible(true);
      }, 300);
      
    }, 3000); // Change every 3 seconds

    return () => clearInterval(interval);
  }, [words]);

  if (!words || words.length === 0) {
    return <span className={className}>Loading...</span>;
  }

  return (
    <div className={`relative ${className}`}>
      <div
        className={`text-blue-600 font-semibold transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {words[currentIndex]}
      </div>
    </div>
  );
};

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

const StatCard = ({ icon: Icon, label, value, trend = null }) => {
  const numericValue = typeof value === 'string' ? parseInt(value.replace(/[^0-9]/g, '')) : Number(value);
  const { count, ref } = useCountUp(numericValue);
  
  const formattedValue = typeof value === 'string' && value.includes('K') 
    ? `${count}K`
    : typeof value === 'string' && value.includes('CELO')
    ? `${count} CELO`
    : count.toString();

  return (
    <motion.div
      ref={ref}
      whileHover={{ scale: 1.02, y: -5 }}
      className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-blue-100/50 relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <Icon className="h-6 w-6" />
          </div>
          {trend && (
            <div className="flex items-center text-emerald-600 text-sm font-medium">
              <TrendingUp className="h-4 w-4 mr-1" />
              {trend}
            </div>
          )}
        </div>
        <div className="mb-2">
          <div className="text-3xl font-bold text-gray-900 mb-1">{formattedValue}</div>
          <div className="text-sm text-gray-600">{label}</div>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transform transition-all duration-1000 ease-out" style={{ width: "75%" }}></div>
        </div>
      </div>
    </motion.div>
  );
};

const FeatureCard = ({ icon: Icon, title, description, gradient, delay = 0 }) => {
  return (
    <ScrollAnimationWrapper delay={delay}>
      <motion.div
        whileHover={{ scale: 1.05, y: -10 }}
        className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-blue-100/50 relative overflow-hidden group h-full"
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-500`}></div>
        <div className="relative z-10">
          <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${gradient} text-white mb-6 shadow-lg`}>
            <Icon className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
          <p className="text-gray-600 leading-relaxed">{description}</p>
        </div>
        <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br from-blue-100/20 to-indigo-100/20 transform translate-x-16 translate-y-16 group-hover:scale-110 transition-transform duration-500"></div>
      </motion.div>
    </ScrollAnimationWrapper>
  );
};

const ProjectCard = ({ project }) => {
  const navigate = useNavigate();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const location = getNormalizedLocation(project.metadata);
  const [showTipModal, setShowTipModal] = useState(false);

  const handleTipClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTipModal(true);
  };

  return (
    <>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 50 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        whileHover={{ scale: 1.02, y: -8 }}
        onClick={() => navigate(`/explorer/project/${project.id}`)}
        className="group bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-100/50 overflow-hidden cursor-pointer relative hover:shadow-2xl transition-all duration-500"
      >
        <LocationBadge location={location} variant="card" />
        
        <div className="relative h-48 bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden">
          {project.metadata.logo || project.metadata.coverImage ? (
            <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${formatIpfsUrl(project.metadata.logo ?? project.metadata.coverImage ?? '')})`, opacity: 0.9 }}></div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Code className="h-20 w-20 text-blue-400/50" />
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          
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

          {project.metadata.category && (
            <div className="absolute bottom-4 left-4">
              <span className="inline-flex items-center px-3 py-1.5 bg-black/70 backdrop-blur-sm text-white text-xs font-semibold rounded-full">
                {project.metadata.category}
              </span>
            </div>
          )}

          {project.campaignIds.length > 0 && (
            <div className="absolute top-4 left-4">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2">
                <div className="flex items-center gap-1">
                  <Trophy className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-bold text-gray-900">{project.campaignIds.length}</span>
                </div>
                <p className="text-xs text-gray-600">Campaigns</p>
              </div>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-100 transition-colors">{project.name}</h3>
          </div>
        </div>

        <div className="p-6">
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.metadata.bio?.tagline || project.description?.tagline}</p>

          <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-4">
            {project.metadata.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{project.metadata.location}</span>
              </div>
            )}
            {project.contracts && project.contracts.length > 0 && (
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                <span>{project.contracts.length} contract{project.contracts.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            {project.metadata.tags && project.metadata.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {project.metadata.tags.slice(0, 2).map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
                {project.metadata.tags.length > 2 && (
                  <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                    +{project.metadata.tags.length - 2}
                  </span>
                )}
              </div>
            )}
            
            <button
              onClick={handleTipClick}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm font-medium rounded-xl hover:shadow-lg transition-all duration-300 transform hover:scale-105"
            >
              <Gift className="h-4 w-4" />
              Tip
            </button>
          </div>
        </div>
      </motion.div>

      {showTipModal && (
        <TipModal
          project={project}
          isOpen={showTipModal}
          onClose={() => setShowTipModal(false)}
          onTipSuccess={() => {
            setShowTipModal(false);
          }}
        />
      )}
    </>
  );
};

const CampaignCard = ({ campaign, index }) => {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState('');
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const now = Math.floor(Date.now() / 1000);
  const hasStarted = now >= Number(campaign.startTime);
  const hasEnded = now >= Number(campaign.endTime);
  
  const celoAmount = Math.floor(Number(formatEther(campaign.totalFunds)) || 0).toString();
  
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

        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
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
      whileHover={{ scale: 1.02, y: -8 }}
      onClick={() => navigate(`/explorer/campaign/${campaign.id.toString()}`)}
      className="group relative bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden shadow-xl border border-blue-100/50 hover:shadow-2xl transition-all duration-500 cursor-pointer"
    >
      <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-50 relative overflow-hidden">
        {campaign.metadata.logo ? (
          <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${formatIpfsUrl(campaign.metadata.logo)})`, opacity: 0.9 }}></div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Rocket className="h-20 w-20 text-blue-400/50" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        
        <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-medium flex items-center shadow-lg backdrop-blur-sm ${statusClass}`}>
          <StatusIcon className="h-3 w-3 mr-1.5" />
          {statusText}
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex justify-between items-end">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-100 transition-colors">{campaign.name}</h3>
            </div>
            <div className="text-white/90 text-sm font-medium">
              <div className="flex items-center">
                <Coins className="h-4 w-4 mr-1.5" />
                {celoAmount} CELO
              </div>
            </div>
          </div>
        </div>
        
        {!hasStarted && (
          <div className="absolute top-4 left-4 px-3 py-1.5 bg-blue-500/80 text-white text-xs rounded-full backdrop-blur-sm flex items-center">
            <Timer className="h-3 w-3 mr-1.5 animate-pulse" /> 
            <span className="font-bold">{timeLeft}</span>
          </div>
        )}
      </div>
      
      <div className="p-6">
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{campaign.metadata.bio?.tagline}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full bg-white ring-2 ring-white flex items-center justify-center overflow-hidden shadow-sm">
              <img src="/images/celo.png" alt="CELO" className="w-full h-full object-cover" />
            </div>
            {(index === 0 || index === 2) && (
              <div className="w-8 h-8 rounded-full bg-white ring-2 ring-white flex items-center justify-center overflow-hidden shadow-sm">
                <img src="/images/cusd.png" alt="cUSD" className="w-full h-full object-cover" />
              </div>
            )}
            {index === 1 && (
              <div className="w-8 h-8 rounded-full bg-purple-100 ring-2 ring-white flex items-center justify-center text-purple-600 text-sm font-bold shadow-sm">G</div>
            )}
          </div>
          
          <div className="flex items-center text-blue-600 hover:text-blue-700 transition-colors">
            <span className="text-sm font-medium mr-1">View</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const EcosystemShowcase = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const slides = [
    {
      id: 0,
      title: "🗳️ Campaign Base Funding",
      description: "Projects join campaigns to receive funding through democratic voting",
      icon: Users,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center px-3 py-2 bg-gradient-to-r from-green-100 to-green-200 rounded-xl text-green-800 font-medium border border-green-300/50 shadow-sm transform hover:scale-105 transition-transform duration-300">
              <div className="w-5 h-5 rounded-full bg-green-500 mr-2 flex items-center justify-center">
                <Trophy className="text-white text-xs" />
              </div>
              <span className="text-sm">Join Campaigns</span>
            </div>
            <div className="flex items-center px-3 py-2 bg-gradient-to-r from-blue-100 to-blue-200 rounded-xl text-blue-800 font-medium border border-blue-300/50 shadow-sm transform hover:scale-105 transition-transform duration-300">
              <div className="w-5 h-5 rounded-full bg-blue-500 mr-2 flex items-center justify-center">
                <Vote className="text-white text-xs" />
              </div>
              <span className="text-sm">Get Voted</span>
            </div>
            <div className="flex items-center px-3 py-2 bg-gradient-to-r from-purple-100 to-purple-200 rounded-xl text-purple-800 font-medium border border-purple-300/50 shadow-sm transform hover:scale-105 transition-transform duration-300">
              <div className="w-5 h-5 rounded-full bg-purple-500 mr-2 flex items-center justify-center">
                <Coins className="text-white text-xs" />
              </div>
              <span className="text-sm">Receive Funding</span>
            </div>
            <div className="flex items-center px-3 py-2 bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-xl text-yellow-800 font-medium border border-yellow-300/50 shadow-sm transform hover:scale-105 transition-transform duration-300">
              <div className="w-5 h-5 rounded-full bg-yellow-500 mr-2 flex items-center justify-center">
                <TrendingUp className="text-white text-xs" />
              </div>
              <span className="text-sm">Grow Project</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
              <span className="text-xs font-medium text-emerald-700">Active Campaigns</span>
              <div className="flex items-center">
                <Activity className="h-4 w-4 text-emerald-600 mr-1" />
                <span className="text-xs font-bold text-emerald-600">12</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-2 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
              <span className="text-xs font-medium text-blue-700">Projects Funded</span>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-blue-600 mr-1" />
                <span className="text-xs font-bold text-blue-600">89</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <span className="text-xs font-medium text-purple-700">Total Funding</span>
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 text-purple-600 mr-1" />
                <span className="text-xs font-bold text-purple-600">2.4M CELO</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 1,
      title: "⛓️ Onchain Voting",
      description: "Transparent, immutable voting system with multi-token support for fair governance decisions",
      icon: CheckCircle,
      content: (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg animate-pulse">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-bounce">
                <span className="text-white text-xs font-bold">✗</span>
              </div>
              <div className="absolute -bottom-1 -left-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-bounce" style={{ animationDelay: '0.5s' }}>
                <span className="text-white text-xs font-bold">✓</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-lg font-bold text-green-600">98%</div>
              <div className="text-xs text-green-700">Transparency</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-lg font-bold text-blue-600">100%</div>
              <div className="text-xs text-blue-700">Immutable</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-lg font-bold text-purple-600">24/7</div>
              <div className="text-xs text-purple-700">Available</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "💝 Project Tipping",
      description: "Support projects directly with any ERC20 token. Show appreciation with instant, borderless tips",
      icon: Gift,
      content: (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-pink-600 flex items-center justify-center shadow-lg animate-bounce">
                <Gift className="h-7 w-7 text-white" />
              </div>
              <div className="absolute -top-3 -right-3 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center animate-ping">
                <Coins className="h-3 w-3 text-yellow-800" />
              </div>
              <div className="absolute -bottom-3 -left-3 w-5 h-5 bg-green-400 rounded-full flex items-center justify-center animate-ping" style={{ animationDelay: '0.3s' }}>
                <Coins className="h-3 w-3 text-green-800" />
              </div>
            </div>
          </div>
          <div className="flex justify-center space-x-3">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-1">
                <span className="text-white text-sm font-bold">$</span>
              </div>
              <span className="text-xs text-gray-600">CELO</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center mb-1">
                <span className="text-white text-sm font-bold">$</span>
              </div>
              <span className="text-xs text-gray-600">cUSD</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center mb-1">
                <span className="text-white text-sm font-bold">$</span>
              </div>
              <span className="text-xs text-gray-600">Any Token</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "🏊‍♂️ Campaign Pools",
      description: "Create funding campaigns with customizable parameters and automated distribution mechanisms",
      icon: Layers,
      content: (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg shadow-lg transform rotate-12 animate-pulse"></div>
              <div className="absolute top-1 left-1 w-12 h-12 bg-gradient-to-br from-teal-400 to-cyan-600 rounded-lg shadow-lg transform -rotate-6 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="absolute top-2 left-2 w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg shadow-lg transform rotate-3 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              <Layers className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-white z-10" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
              <span className="text-xs font-medium text-emerald-700">Custom Parameters</span>
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex items-center justify-between p-2 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200">
              <span className="text-xs font-medium text-teal-700">Auto Distribution</span>
              <CheckCircle className="h-4 w-4 text-teal-600" />
            </div>
            <div className="flex items-center justify-between p-2 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border border-cyan-200">
              <span className="text-xs font-medium text-cyan-700">Smart Contracts</span>
              <CheckCircle className="h-4 w-4 text-cyan-600" />
            </div>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: "🎴 Supporter Cards",
      description: "Digital proof of support with NFT-based cards that showcase your contribution history",
      icon: CreditCard,
      content: (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-16 h-12 bg-gradient-to-br from-orange-400 to-red-600 rounded-lg shadow-lg transform rotate-6 transition-transform duration-500 hover:rotate-0">
                <div className="p-1.5">
                  <div className="w-3 h-3 bg-white/20 rounded-full mb-1"></div>
                  <div className="text-white text-xs font-bold">SUPPORTER</div>
                  <div className="text-white/80 text-xs">NFT #1234</div>
                </div>
              </div>
              <div className="absolute -top-1 -right-1 w-12 h-9 bg-gradient-to-br from-purple-400 to-pink-600 rounded-lg shadow-lg transform -rotate-6 transition-transform duration-500 hover:rotate-0" style={{ animationDelay: '0.2s' }}>
                <div className="p-1.5">
                  <div className="w-2 h-2 bg-white/20 rounded-full mb-1"></div>
                  <div className="text-white text-xs font-bold">VIP</div>
                  <div className="text-white/80 text-xs">NFT #5678</div>
                </div>
              </div>
              <CreditCard className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-white z-10" />
            </div>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 rounded-full text-xs font-medium">
              <Sparkles className="h-3 w-3 mr-1" />
              Unique NFT Cards
            </div>
          </div>
        </div>
      )
    },
    {
      id: 5,
      title: "📊 Progress Tracking",
      description: "Real-time analytics and milestone tracking for projects and campaigns with detailed insights",
      icon: BarChart,
      content: (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative w-24 h-16">
              <div className="absolute bottom-0 left-0 w-4 bg-blue-500 rounded-t-sm animate-pulse" style={{ height: '60%' }}></div>
              <div className="absolute bottom-0 left-6 w-4 bg-green-500 rounded-t-sm animate-pulse" style={{ height: '80%', animationDelay: '0.2s' }}></div>
              <div className="absolute bottom-0 left-12 w-4 bg-purple-500 rounded-t-sm animate-pulse" style={{ height: '40%', animationDelay: '0.4s' }}></div>
              <div className="absolute bottom-0 left-18 w-4 bg-orange-500 rounded-t-sm animate-pulse" style={{ height: '90%', animationDelay: '0.6s' }}></div>
              <div className="absolute bottom-0 left-24 w-4 bg-red-500 rounded-t-sm animate-pulse" style={{ height: '70%', animationDelay: '0.8s' }}></div>
              <BarChart className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-gray-600 z-10" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-200">
              <TrendingUp className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <div className="text-xs font-medium text-blue-700">Real-time</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-lg border border-green-200">
              <Activity className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <div className="text-xs font-medium text-green-700">Analytics</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 6,
      title: "🛡️ Secure & Trustless",
      description: "Built on Celo with battle-tested smart contracts and comprehensive security measures",
      icon: Shield,
      content: (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center shadow-lg animate-pulse">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div className="absolute inset-0 rounded-full border-3 border-indigo-300 animate-ping"></div>
              <div className="absolute inset-0 rounded-full border-3 border-purple-300 animate-ping" style={{ animationDelay: '0.5s' }}></div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
              <span className="text-xs font-medium text-indigo-700">Celo Network</span>
              <CheckCircle className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="flex items-center justify-between p-2 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
              <span className="text-xs font-medium text-purple-700">Audited Contracts</span>
              <CheckCircle className="h-4 w-4 text-purple-600" />
            </div>
            <div className="flex items-center justify-between p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <span className="text-xs font-medium text-blue-700">Zero Trust</span>
              <CheckCircle className="h-4 w-4 text-blue-600" />
            </div>
          </div>
        </div>
      )
    }
  ];

  const nextSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const prevSlide = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const goToSlide = (index: number) => {
    if (isTransitioning || index === currentSlide) return;
    setIsTransitioning(true);
    setCurrentSlide(index);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayRef.current = setInterval(nextSlide, 4500);
    }
    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [isAutoPlaying, currentSlide]);

  // Start auto-play immediately when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAutoPlaying(true);
    }, 1000); // Start after 1 second
    
    return () => clearTimeout(timer);
  }, []);

  const handleMouseEnter = () => setIsAutoPlaying(false);
  const handleMouseLeave = () => setIsAutoPlaying(true);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const currentSlideData = slides[currentSlide];
  const IconComponent = currentSlideData.icon;

  const getSlideBorderColor = (slideIndex: number): string => {
    const colors = [
      '#10B981', // Green for Multi-Token Governance
      '#059669', // Emerald for Onchain Voting
      '#8B5CF6', // Purple for Project Tipping
      '#06B6D4', // Cyan for Campaign Pools
      '#F97316', // Orange for Supporter Cards
      '#3B82F6', // Blue for Progress Tracking
      '#6366F1'  // Indigo for Secure & Trustless
    ];
    return colors[slideIndex % colors.length];
  };

  return (
    <div 
      className="relative bg-white/95 backdrop-blur-sm rounded-3xl p-7 shadow-2xl overflow-hidden group"
      style={{
        border: `2px solid ${getSlideBorderColor(currentSlide)}`,
        boxShadow: `0 0 20px ${getSlideBorderColor(currentSlide)}40, 0 25px 50px -12px rgba(0, 0, 0, 0.25)`
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* TV Screen Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50"></div>
      
      <div className="relative z-10">
        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          disabled={isTransitioning}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 z-20 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-blue-200 flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group-hover:scale-110"
        >
          <ArrowRight className="h-4 w-4 transform rotate-180" />
        </button>
        
        <button
          onClick={nextSlide}
          disabled={isTransitioning}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 z-20 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-blue-200 flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group-hover:scale-110"
        >
          <ArrowRight className="h-4 w-4" />
        </button>

        {/* Slide Content */}
        <div className="relative h-72 flex items-center justify-center">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="text-center w-full"
          >
            {/* Icon */}
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl">
                <IconComponent className="h-7 w-7 text-white" />
              </div>
            </div>
            
            {/* Title */}
            <h4 className="text-lg font-bold text-gray-900 mb-3">
              {currentSlideData.title.replace(/^[^\s]*\s/, '')}
            </h4>
            
            {/* Description */}
            <p className="text-gray-600 mb-5 max-w-sm mx-auto text-sm">
              {currentSlideData.description}
            </p>
            
            {/* Content */}
            <div className="max-w-xs mx-auto">
              {currentSlideData.content}
            </div>
          </motion.div>
        </div>

        {/* Dots Indicator */}
        <div className="flex justify-center space-x-2 mt-5">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'bg-blue-600 scale-125' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>

        {/* Slide Counter */}
        <div className="absolute bottom-3 right-3 text-xs text-gray-500 font-medium">
          {currentSlide + 1} / {slides.length}
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

export default function HomePage() {
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);
  const [featuredProjects, setFeaturedProjects] = useState<EnhancedProject[]>([]);
  const [featuredCampaigns, setFeaturedCampaigns] = useState<EnhancedCampaign[]>([]);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'projects'>('campaigns');

  const { projects, isLoading: projectsLoading, error: projectsError } = useAllProjects(CONTRACT_ADDRESS);
  const { campaigns, isLoading: campaignsLoading, error: campaignsError } = useAllCampaigns(CONTRACT_ADDRESS);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

    const featured = enhanced
     .filter(p => p.active && p.campaignIds.length > 0)
     .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
     .slice(0, 6);

   setFeaturedProjects(featured);
 }, [projects]);

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
     <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
       <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md mx-auto border border-red-200">
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
     <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
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

 const totalProjects = projects?.length || 0;
 const totalCampaigns = campaigns?.length || 0;
 const totalFunds = featuredCampaigns.reduce((sum, c) => sum + parseFloat(formatEther(c.totalFunds)), 0);

 const scrollingWords = [
   "Funding for Projects with Onchain Voting",
   "Funding for Projects with Project Tipping", 
   "Funding for Projects with Campaign Pools (Coming Soon)",
   "Funding for Projects with Project Supporter Cards",
   "Funding for Projects with Track Projects Progress"
 ];

 return (
   <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden">
     {/* Floating Background Elements */}
     <div className="fixed inset-0 overflow-hidden pointer-events-none">
       <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-r from-blue-400/10 to-indigo-400/10 animate-float-slower blur-3xl"></div>
       <div className="absolute top-1/2 right-1/5 w-80 h-80 rounded-full bg-gradient-to-r from-cyan-400/10 to-blue-400/10 animate-float-slow blur-3xl"></div>
       <div className="absolute bottom-1/4 left-1/3 w-72 h-72 rounded-full bg-gradient-to-r from-indigo-400/10 to-purple-400/10 animate-float blur-3xl"></div>
     </div>

     {/* Hero Section */}
     <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
       <div className="max-w-7xl mx-auto">
         <div className="grid lg:grid-cols-2 gap-12 items-center">
           {/* Left Column - Content */}
           <div className="space-y-8">
             <motion.div
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.8 }}
               className="space-y-6"
             >
               <div className="flex items-center space-x-4">
                 <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl">
                   <img src="/images/logo.png" alt="Sovereign Seas" className="w-10 h-10" />
                 </div>
                 <h1 className="text-4xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                   Sovereign Seas
                 </h1>
               </div>
               
               <h2 className="text-2xl lg:text-4xl font-bold text-gray-900 leading-tight">
                 <ScrollingText 
                   words={scrollingWords}
                   className="text-blue-600"
                 />
               </h2>
               
               <p className="text-xl text-gray-600 leading-relaxed max-w-2xl">
                 Decentralized project funding through democratic voting and direct support. 
                 Built on Celo with multi-token governance.
               </p>
             </motion.div>

             <motion.div
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.8, delay: 0.2 }}
               className="flex flex-col sm:flex-row gap-4"
             >
               <button 
                 onClick={() => navigate('/projects')}
                 className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center group relative overflow-hidden"
               >
                 <Rocket className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                 Explore Projects
                 <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
               </button>
               
               <button 
                 onClick={() => navigate('/campaigns')}
                 className="px-8 py-4 rounded-2xl bg-white text-blue-600 font-semibold border-2 border-blue-200 hover:border-blue-300 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center group"
               >
                 <Trophy className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-300" />
                 View Campaigns
               </button>
             </motion.div>

             {/* Quick Stats */}
             <motion.div
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.8, delay: 0.4 }}
               className="flex flex-wrap gap-8 pt-8"
             >
               <div className="text-center">
                 <div className="text-3xl font-bold text-blue-600">{totalProjects}+</div>
                 <div className="text-sm text-gray-600">Projects</div>
               </div>
               <div className="text-center">
                 <div className="text-3xl font-bold text-indigo-600">{totalCampaigns}+</div>
                 <div className="text-sm text-gray-600">Campaigns</div>
               </div>
               <div className="text-center">
                 <div className="text-3xl font-bold text-purple-600">{totalFunds.toFixed(1)}K</div>
                 <div className="text-sm text-gray-600">CELO Raised</div>
               </div>
             </motion.div>
           </div>

           {/* Right Column - Multi-Token Governance Card */}
           <motion.div
             initial={{ opacity: 0, x: 30 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ duration: 0.8, delay: 0.3 }}
             className="relative"
           >
             <EcosystemShowcase />
           </motion.div>
         </div>
       </div>
     </section>

     {/* Stats Section */}
     <ScrollAnimationWrapper>
       <section className="py-20 px-4 sm:px-6 lg:px-8">
         <div className="max-w-7xl mx-auto">
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
             <StatCard 
               icon={Activity} 
               label="Active Campaigns" 
               value="3"
               trend="+12%"
             />
             <StatCard 
               icon={Lightbulb} 
               label="Total Projects" 
               value="36"
               trend="+8%"
             />
             <StatCard 
               icon={Users} 
               label="Community Members" 
               value="1,247"
               trend="+24%"
             />
             <StatCard 
               icon={Coins} 
               label="Total Value Locked" 
               value="16K"
               trend="+15%"
             />
           </div>
         </div>
       </section>
     </ScrollAnimationWrapper>

     {/* Campaigns & Projects Tabs Section */}
     <ScrollAnimationWrapper>
       <section className="py-20 px-4 sm:px-6 lg:px-8">
         <div className="max-w-7xl mx-auto">
           <div className="text-center mb-12">
             <motion.div
               initial={{ opacity: 0, y: 30 }}
               whileInView={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.8 }}
               viewport={{ once: true }}
             >
               <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                 Explore Campaigns & Projects
               </h2>
               <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                 Discover active funding opportunities and innovative projects
               </p>
             </motion.div>
           </div>

           {/* Tabs */}
           <div className="flex justify-center mb-8">
             <div className="flex bg-gray-100 rounded-2xl p-1">
               <button
                 onClick={() => setActiveTab('campaigns')}
                 className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                   activeTab === 'campaigns'
                     ? 'bg-blue-500 text-white shadow-lg'
                     : 'text-gray-600 hover:text-gray-900'
                 }`}
               >
                 Campaigns
               </button>
               <button
                 onClick={() => setActiveTab('projects')}
                 className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                   activeTab === 'projects'
                     ? 'bg-blue-500 text-white shadow-lg'
                     : 'text-gray-600 hover:text-gray-900'
                 }`}
               >
                 Projects
               </button>
             </div>
           </div>

           {/* Content */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {activeTab === 'campaigns' ? (
               // Show 1-2 campaigns max
               featuredCampaigns.slice(0, Math.min(2, featuredCampaigns.length)).map((campaign, index) => (
                 <CampaignCard key={campaign.id.toString()} campaign={campaign} index={index} />
               ))
             ) : (
               // Show 2-3 projects based on active campaigns
               featuredProjects.slice(0, Math.min(3, featuredProjects.length)).map(project => (
                 <ProjectCard key={project.id} project={project} />
               ))
             )}
           </div>

           {/* View All Button */}
           <div className="text-center mt-12">
             <button 
               onClick={() => navigate(activeTab === 'campaigns' ? '/campaigns' : '/projects')}
               className="px-8 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors flex items-center mx-auto group"
             >
               View All {activeTab === 'campaigns' ? 'Campaigns' : 'Projects'}
               <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
             </button>
           </div>
         </div>
       </section>
     </ScrollAnimationWrapper>

     {/* Features Section */}
     <ScrollAnimationWrapper>
       <section className="py-20 px-4 sm:px-6 lg:px-8">
         <div className="max-w-7xl mx-auto">
           <div className="text-center mb-16">
             <motion.div
               initial={{ opacity: 0, y: 30 }}
               whileInView={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.8 }}
               viewport={{ once: true }}
             >
               <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 text-sm font-medium rounded-full mb-4">Platform Features</span>
               <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                 Built for the Future
               </h2>
               <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                 Experience the next generation of decentralized project funding with cutting-edge features
               </p>
             </motion.div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             <FeatureCard
               icon={Award}
               title="Onchain Voting"
               description="Transparent, immutable voting system with multi-token support for fair governance decisions."
               gradient="from-blue-500 to-indigo-600"
               delay={0}
             />
             <FeatureCard
               icon={Gift}
               title="Project Tipping"
               description="Support projects directly with any ERC20 token. Show appreciation with instant, borderless tips."
               gradient="from-purple-500 to-pink-600"
               delay={0.1}
             />
             <FeatureCard
               icon={Layers}
               title="Campaign Pools"
               description="Create funding campaigns with customizable parameters and automated distribution mechanisms."
               gradient="from-emerald-500 to-teal-600"
               delay={0.2}
             />
             <FeatureCard
               icon={CreditCard}
               title="Supporter Cards"
               description="Digital proof of support with NFT-based cards that showcase your contribution history."
               gradient="from-orange-500 to-red-600"
               delay={0.3}
             />
             <FeatureCard
               icon={BarChart}
               title="Progress Tracking"
               description="Real-time analytics and milestone tracking for projects and campaigns with detailed insights."
               gradient="from-cyan-500 to-blue-600"
               delay={0.4}
             />
             <FeatureCard
               icon={Shield}
               title="Secure & Trustless"
               description="Built on Celo with battle-tested smart contracts and comprehensive security measures."
               gradient="from-indigo-500 to-purple-600"
               delay={0.5}
             />
           </div>
         </div>
       </section>
     </ScrollAnimationWrapper>



     {/* CTA Section */}
     <ScrollAnimationWrapper>
       <section className="py-20 px-4 sm:px-6 lg:px-8">
         <div className="max-w-4xl mx-auto">
           <div className="bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 rounded-3xl p-12 text-center text-white relative overflow-hidden">
             <div className="absolute inset-0 bg-black/10"></div>
             <div className="relative z-10">
               <h2 className="text-3xl lg:text-4xl font-bold mb-6">
                 Ready to Shape the Future?
               </h2>
               <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
                 Join our community of builders, supporters, and visionaries creating the decentralized economy
               </p>
               <div className="flex flex-col sm:flex-row gap-4 justify-center">
                 <button 
                   onClick={() => navigate('/app/project/start')}
                   className="px-8 py-4 rounded-2xl bg-white text-blue-600 font-semibold hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center group"
                 >
                   <Lightbulb className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                   Create Project
                 </button>
                 <button 
                   onClick={() => navigate('/app/campaign/start')}
                   className="px-8 py-4 rounded-2xl bg-white/20 backdrop-blur-sm text-white font-semibold border border-white/30 hover:bg-white/30 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center group"
                 >
                   <Rocket className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                   Start Campaign
                 </button>
               </div>
             </div>
           </div>
         </div>
       </section>
     </ScrollAnimationWrapper>
   </div>
 );
}