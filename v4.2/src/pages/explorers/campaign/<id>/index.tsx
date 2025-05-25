'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount, useWriteContract } from 'wagmi';
import { 
  ArrowLeft, 
  Trophy, 
  Sparkles, 
  Zap, 
  Target,
  Star,
  Gift,
  Crown,
  Flame,
  Rocket,
  Diamond,
  Medal,
  Heart,
  ThumbsUp,
  TrendingUp,
  Users,
  Calendar,
  Clock,
  Eye,
  Vote,
  Coins,
  Wallet,
  ChevronRight,
  Plus,
  Minus,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Volume2,
  VolumeX,
  Settings,
  Info,
  BarChart3,
  PieChart,
  Activity,
  FileText,
  Globe,
  ExternalLink,
  Share2,
  Bookmark,
  Shield,
  Copy,
  Maximize,
  Twitter,
  Linkedin,
  Mail,
  MessageCircle,
  Link as LinkIcon,
  Award,
  Lightbulb,
  Building,
  ChevronDown,
  ChevronUp,
  Globe2,
  Send,
  BadgeCheck,
  User,
  Terminal,
  Code,
  Video,
  Play,
  Edit,
  DollarSign
} from 'lucide-react';

import { 
  useCampaignDetails 
} from '@/hooks/useCampaignMethods';

import VoteModal from '@/components/voteModal';

import { 
  useAllProjects, 
  formatProjectForDisplay 
} from '@/hooks/useProjectMethods';

import {
  useVote,
  useVotingManager,
  useSupportedTokens,
  useUserTotalVotesInCampaign,
  VoteAllocation
} from '@/hooks/useVotingMethods';
import { parseEther } from 'viem';
import { erc20ABI } from '@/abi/erc20ABI';

// Gamification constants
const VOTE_REACTIONS = ['🚀', '⭐', '💎', '🔥', '💪', '🎯', '⚡', '🏆'];
const POWER_UP_EFFECTS = ['✨', '💫', '🌟', '⚡', '🔥', '💥'];
const ACHIEVEMENT_SOUNDS = {
  vote: '🎵',
  combo: '🎶',
  powerUp: '🎸',
  achievement: '🎺'
};

interface GameState {
  score: number;
  combo: number;
  powerUps: string[];
  achievements: string[];
  votingPower: number;
  isOnFire: boolean;
  soundEnabled: boolean;
}

export default function CampaignView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  
  // Game state
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    combo: 0,
    powerUps: [],
    achievements: [],
    votingPower: 100,
    isOnFire: false,
    soundEnabled: true
  });
  
  // UI state
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [voteAmount, setVoteAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<string[]>([]);
  const [shakeEffect, setShakeEffect] = useState(false);
  const [glowEffect, setGlowEffect] = useState('');
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '', emoji: '' });
  const [showStats, setShowStats] = useState(false);
  const [votingAllocations, setVotingAllocations] = useState<VoteAllocation[]>([]);
  const [expandedSections, setExpandedSections] = useState({
    description: false,
    goals: false,
    technical: false
  });
  
  const contractAddress = import.meta.env.VITE_CONTRACT_V4;
  const campaignId = id ? BigInt(id as string) : BigInt(0);
  
  // Hooks
  const { campaignDetails, isLoading: campaignLoading } = useCampaignDetails(
    contractAddress as `0x${string}`, 
    campaignId
  );
  
  const { projects: allProjects, isLoading: projectsLoading } = useAllProjects(contractAddress as `0x${string}`);
  
  const { supportedTokens } = useSupportedTokens(contractAddress as `0x${string}`);
  
  const { totalVotes } = useUserTotalVotesInCampaign(
    contractAddress as `0x${string}`,
    campaignId,
    address as `0x${string}`
  );
  
  const { 
    vote, 
    batchVote, 
    isPending: isVoting, 
    isSuccess: voteSuccess,
    error: voteError 
  } = useVote(contractAddress as `0x${string}`);
  
  const {
    votingState,
    formatTokenAmount,
    parseTokenAmount,
    getProjectVoteAllocation,
    setProjectVoteAllocation,
    clearAllAllocations
  } = useVotingManager(contractAddress as `0x${string}`, campaignId, address);

  const { writeContract: writeERC20 } = useWriteContract();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    console.log('Supported Tokens:', supportedTokens);
  }, [supportedTokens]);

  const isTokenSupported = (token: string) => {
    return supportedTokens?.includes(token as `0x${string}`);
  };

  // Filter projects for this campaign
  const campaignProjects = allProjects?.filter(projectDetails => {
    const formatted = formatProjectForDisplay(projectDetails);
    return formatted && projectDetails.project.campaignIds.some(cId => Number(cId) === Number(campaignId));
  }).map(formatProjectForDisplay).filter(Boolean) || [];

  // Game effects
  const triggerFloatingEmoji = useCallback((emoji: string) => {
    setFloatingEmojis(prev => [...prev, emoji]);
    setTimeout(() => {
      setFloatingEmojis(prev => prev.slice(1));
    }, 2000);
  }, []);

  const triggerShakeEffect = useCallback(() => {
    setShakeEffect(true);
    setTimeout(() => setShakeEffect(false), 500);
  }, []);

  const triggerGlowEffect = useCallback((color: string) => {
    setGlowEffect(color);
    setTimeout(() => setGlowEffect(''), 1000);
  }, []);

  const playSound = useCallback((type: keyof typeof ACHIEVEMENT_SOUNDS) => {
    if (gameState.soundEnabled) {
      triggerFloatingEmoji(ACHIEVEMENT_SOUNDS[type]);
    }
  }, [gameState.soundEnabled, triggerFloatingEmoji]);

  // Handle vote success
  useEffect(() => {
    if (voteSuccess) {
      setGameState(prev => ({
        ...prev,
        score: prev.score + 100,
        combo: prev.combo + 1,
        isOnFire: prev.combo > 3
      }));
      
      triggerFloatingEmoji(VOTE_REACTIONS[Math.floor(Math.random() * VOTE_REACTIONS.length)]);
      triggerGlowEffect('green');
      setShowConfetti(true);
      playSound('vote');
      
      setTimeout(() => setShowConfetti(false), 3000);
      
      setStatusMessage({
        text: 'Vote cast successfully! 🎉',
        type: 'success',
        emoji: '🚀'
      });
      
      setShowVoteModal(false);
      setVoteAmount('');
    }
  }, [voteSuccess, triggerFloatingEmoji, triggerGlowEffect, playSound]);

  // Handle vote error
  useEffect(() => {
    if (voteError) {
      triggerShakeEffect();
      triggerFloatingEmoji('💥');
      setStatusMessage({
        text: 'Vote failed! Try again 😤',
        type: 'error',
        emoji: '⚠️'
      });
    }
  }, [voteError, triggerShakeEffect, triggerFloatingEmoji]);

  // Clear status message
  useEffect(() => {
    if (statusMessage.text) {
      const timer = setTimeout(() => {
        setStatusMessage({ text: '', type: '', emoji: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const approveToken = async (token: `0x${string}`, amount: bigint) => {
    try {
      await writeERC20({
        address: token,
        abi: erc20ABI,
        functionName: 'approve',
        args: [contractAddress as `0x${string}`, amount]
      });
      return true;
    } catch (error) {
      console.error('Error approving token:', error);
      return false;
    }
  };

  const handleVote = async (projectId: bigint, token: string, amount: bigint) => {
    try {
      // Then proceed with voting
      await vote({
        campaignId,
        projectId,
        token: token as `0x${string}`,
        amount
      });
    } catch (error) {
      console.error('Voting error:', error);
      setStatusMessage({
        text: 'Voting failed! Please try again.',
        type: 'error',
        emoji: '⚠️'
      });
    }
  };

  const openVoteModal = (project: any) => {
    setSelectedProject(project);
    setShowVoteModal(true);
    triggerFloatingEmoji('🎯');
    playSound('powerUp');
  };

  const closeVoteModal = () => {
    setShowVoteModal(false);
    setSelectedProject(null);
    setVoteAmount('');
    setSelectedToken('');
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleBackToArena = () => {
    navigate('/explore');
  };

  if (!isMounted) return null;

  if (campaignLoading || projectsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 relative">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 rounded-full animate-spin border-t-blue-500"></div>
            <Sparkles className="h-8 w-8 text-blue-500 absolute inset-0 m-auto animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-xl text-blue-600 font-medium mb-2">🎮 Loading Campaign Arena...</p>
            <p className="text-sm text-gray-500">Preparing your voting experience</p>
          </div>
        </div>
      </div>
    );
  }

  if (!campaignDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-4">😞</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Campaign Not Found</h1>
          <p className="text-gray-600 mb-6">This campaign doesn't exist or has been removed from the arena.</p>
          <button
            onClick={handleBackToArena}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            🏠 Back to Arena
          </button>
        </div>
      </div>
    );
  }

  const campaign = campaignDetails.campaign;
  
  // Campaign status
  const now = Math.floor(Date.now() / 1000);
  const startTime = Number(campaign.startTime);
  const endTime = Number(campaign.endTime);
  const hasStarted = now >= startTime;
  const hasEnded = now >= endTime;
  const isActive = hasStarted && !hasEnded && campaign.active;

  return (
    <div className={`min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 relative overflow-hidden ${shakeEffect ? 'animate-pulse' : ''}`}>
      {/* Floating background elements with extra game effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-gradient-to-r from-blue-400/20 to-indigo-400/20 animate-float blur-2xl"></div>
        <div className="absolute top-1/2 right-1/5 w-48 h-48 rounded-full bg-gradient-to-r from-cyan-400/20 to-blue-400/20 animate-float-slow blur-2xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-40 h-40 rounded-full bg-gradient-to-r from-indigo-400/20 to-purple-400/20 animate-float-slower blur-2xl"></div>
        
        {/* Floating emojis */}
        {floatingEmojis.map((emoji, index) => (
          <div
            key={index}
            className="absolute text-4xl animate-bounce pointer-events-none"
            style={{
              left: `${Math.random() * 80 + 10}%`,
              top: `${Math.random() * 80 + 10}%`,
              animationDuration: '2s',
              animationTimingFunction: 'ease-out'
            }}
          >
            {emoji}
          </div>
        ))}
      </div>

      {/* Confetti effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: '1s'
              }}
            >
              {POWER_UP_EFFECTS[Math.floor(Math.random() * POWER_UP_EFFECTS.length)]}
            </div>
          ))}
        </div>
      )}

      <div className="relative z-10 container mx-auto px-4 py-6">
        {/* Header with game elements */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToArena}
              className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm text-gray-700 hover:text-blue-600 rounded-full transition-all hover:bg-white shadow-lg border border-blue-100 hover:scale-105"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              🏠 Back to Arena
            </button>
          </div>
          
          {/* Game stats bar */}
          <div className="flex items-center space-x-4">
            <div className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-blue-100">
              <div className="flex items-center space-x-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span className="font-medium text-gray-800">{gameState.score}</span>
              </div>
            </div>
            
            {gameState.combo > 0 && (
              <div className="bg-gradient-to-r from-orange-400 to-red-500 text-white rounded-full px-4 py-2 shadow-lg animate-pulse">
                <div className="flex items-center space-x-2">
                  <Flame className="h-4 w-4" />
                  <span className="font-bold">{gameState.combo}x</span>
                </div>
              </div>
            )}
            
            <button
              onClick={() => setGameState(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
              className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-blue-100 hover:scale-105 transition-all"
            >
              {gameState.soundEnabled ? <Volume2 className="h-4 w-4 text-blue-500" /> : <VolumeX className="h-4 w-4 text-gray-400" />}
            </button>
          </div>
        </div>

        {/* Status message with game styling */}
        {statusMessage.text && (
          <div className={`mb-6 p-4 rounded-2xl shadow-xl backdrop-blur-sm border-2 ${
            statusMessage.type === 'success' 
              ? 'bg-green-50/90 border-green-300 text-green-800' 
              : 'bg-red-50/90 border-red-300 text-red-800'
          } ${glowEffect === 'green' ? 'ring-4 ring-green-300 animate-pulse' : ''}`}>
            <div className="flex items-center">
              <span className="text-2xl mr-3">{statusMessage.emoji}</span>
              <p className="font-medium">{statusMessage.text}</p>
            </div>
          </div>
        )}

        {/* Campaign header with game elements */}
        <div className={`bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-blue-100 mb-8 relative overflow-hidden ${glowEffect ? `ring-4 ring-${glowEffect}-300` : ''}`}>
          <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-bl-full"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-3">
                  <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                    🏆 {campaign.name}
                  </h1>
                  <span className={`px-4 py-2 rounded-full text-sm font-bold flex items-center space-x-2 ${
                    isActive ? 'bg-green-100 text-green-700 animate-pulse' : 
                    hasEnded ? 'bg-gray-100 text-gray-700' : 
                    'bg-amber-100 text-amber-700'
                  }`}>
                    <Clock className="h-4 w-4" />
                    <span>{hasEnded ? '🏁 Ended' : isActive ? '🔥 LIVE' : '⏳ Coming Soon'}</span>
                  </span>
                </div>
                
                <p className="text-gray-600 mb-4 text-lg">{campaign.description}</p>
                
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-2 rounded-full">
                    <Coins className="h-4 w-4" />
                    <span className="font-medium">{Number(campaign.totalFunds) / 1e18} CELO Pool</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 bg-purple-100 text-purple-800 px-3 py-2 rounded-full">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">{campaignProjects.length} Projects</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 bg-emerald-100 text-emerald-800 px-3 py-2 rounded-full">
                    <Trophy className="h-4 w-4" />
                    <span className="font-medium">Max {Number(campaign.maxWinners) || 'All'} Winners</span>
                  </div>
                </div>
              </div>
              
              {isActive && (
                <div className="mt-6 md:mt-0">
                  <button
                    onClick={() => setShowStats(true)}
                    className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center space-x-2 hover:scale-105"
                  >
                    <BarChart3 className="h-5 w-5" />
                    <span>📊 Battle Stats</span>
                  </button>
                </div>
              )}
            </div>
            
            {/* Progress bar with game styling */}
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-1000 relative"
                style={{ 
                  width: hasEnded ? '100%' : isActive ? `${Math.min(100, ((now - startTime) / (endTime - startTime)) * 100)}%` : '0%'
                }}
              >
                <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Projects grid with game cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaignProjects.map((project, index) => (
            <div
              key={project.id}
              className="group bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-blue-100 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 relative overflow-hidden"
            >
              {/* Card glow effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
              
              {/* Ranking badge */}
              <div className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                #{index + 1}
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                    {project.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-sm text-gray-500">🚀 Project #{project.id}</p>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-4 line-clamp-3">{project.description}</p>
                
                {/* Project stats */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                      <Heart className="h-3 w-3" />
                      <span>{formatTokenAmount(project.voteCount || 0n)} votes</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => navigate(`/explore/project/${project.id}`)}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <Eye className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
                
                {/* Action buttons */}
                <div className="flex space-x-2">
                  {isActive && (
                    <button
                      onClick={() => openVoteModal(project)}
                      className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center space-x-2 group"
                    >
                      <Vote className="h-4 w-4 group-hover:rotate-12 transition-transform" />
                      <span>🗳️ Vote</span>
                      <Sparkles className="h-4 w-4 group-hover:animate-spin" />
                    </button>
                  )}
                  
                  {!isActive && (
                    <div className="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-500 font-medium flex items-center justify-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>{hasEnded ? '🏁 Voting Ended' : '⏳ Voting Soon'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vote Modal */}
      <VoteModal
        isOpen={showVoteModal}
        onClose={closeVoteModal}
        selectedProject={selectedProject}
        onVote={handleVote}
        isVoting={isVoting}
        gameState={gameState}
      />

      {/* Stats Modal */}
      {showStats && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border-4 border-purple-200 relative overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Stats header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 text-white relative">
              <div className="absolute top-0 right-0 text-6xl opacity-10">📊</div>
              <button
                onClick={() => setShowStats(false)}
                className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
              
              <h3 className="text-2xl font-bold mb-2 flex items-center">
                📊 Battle Arena Stats
              </h3>
              <p className="text-purple-100">Real-time campaign analytics</p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Personal stats */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-blue-500" />
                  🎮 Your Game Stats
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{gameState.score}</div>
                    <div className="text-sm text-gray-600">🏆 Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{gameState.combo}</div>
                    <div className="text-sm text-gray-600">🔥 Combo</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{formatTokenAmount(totalVotes)}</div>
                    <div className="text-sm text-gray-600">💰 Total Votes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{gameState.achievements.length}</div>
                    <div className="text-sm text-gray-600">🏅 Achievements</div>
                  </div>
                </div>
              </div>
              
              {/* Campaign leaderboard */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-200">
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
                  🏆 Project Leaderboard
                </h4>
                <div className="space-y-3">
                  {campaignProjects
                    .sort((a, b) => Number(b.voteCount || 0n) - Number(a.voteCount || 0n))
                    .slice(0, 5)
                    .map((project, index) => (
                      <div key={project.id} className="flex items-center space-x-4 p-3 bg-white rounded-xl border border-gray-200">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                          index === 0 ? 'bg-yellow-500' : 
                          index === 1 ? 'bg-gray-400' : 
                          index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{project.name}</div>
                          <div className="text-sm text-gray-500">
                            {formatTokenAmount(project.voteCount || 0n)} votes
                          </div>
                        </div>
                        <div className="text-2xl">
                          {index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              
              {/* Achievement showcase */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <Medal className="h-5 w-5 mr-2 text-green-500" />
                  🏅 Available Achievements
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 p-3 bg-white rounded-xl border border-gray-200">
                    <div className="text-2xl">🚀</div>
                    <div>
                      <div className="font-medium text-gray-800">First Vote</div>
                      <div className="text-sm text-gray-500">Cast your first vote</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-white rounded-xl border border-gray-200">
                    <div className="text-2xl">🔥</div>
                    <div>
                      <div className="font-medium text-gray-800">On Fire</div>
                      <div className="text-sm text-gray-500">5 votes in a row</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-white rounded-xl border border-gray-200">
                    <div className="text-2xl">💎</div>
                    <div>
                      <div className="font-medium text-gray-800">Diamond Hands</div>
                      <div className="text-sm text-gray-500">Vote 100+ CELO/cUSD</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-white rounded-xl border border-gray-200">
                    <div className="text-2xl">👑</div>
                    <div>
                      <div className="font-medium text-gray-800">Kingmaker</div>
                      <div className="text-sm text-gray-500">Vote for winning project</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game achievement notifications */}
      {gameState.achievements.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40">
          {gameState.achievements.slice(-3).map((achievement, index) => (
            <div
              key={index}
              className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-4 rounded-2xl shadow-2xl mb-2 animate-bounce"
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">🏆</div>
                <div>
                  <div className="font-bold">Achievement Unlocked!</div>
                  <div className="text-sm opacity-90">{achievement}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Power-up effects overlay */}
      {gameState.isOnFire && (
        <div className="fixed inset-0 pointer-events-none z-30">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10 animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl animate-bounce">
            🔥
          </div>
        </div>
      )}
    </div>
  );
}