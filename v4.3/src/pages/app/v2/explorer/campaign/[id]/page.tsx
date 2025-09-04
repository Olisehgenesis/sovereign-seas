// @ts-nocheck

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount, useReadContracts } from 'wagmi';
import { formatEther } from 'viem';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Trophy, 
  Users, 
  Clock, 
  Eye, 
  Vote, 
  Coins, 
  CheckCircle,
  Plus,
  Search,
  Crown,
  Medal,
  Award,
  BarChart3
} from 'lucide-react';

import { useCampaignDetails, useSortedProjects, useParticipation } from '@/hooks/useCampaignMethods';
import { useAllProjects, formatProjectForDisplay } from '@/hooks/useProjectMethods';
import { useCampaignTokenAmount } from '@/hooks/useVotingMethods';
import VoteModal from '@/components/voteModal';
import AddProjectsToCampaignModal from '@/components/AddProjectsToCampaignModal';
import { formatIpfsUrl } from '@/utils/imageUtils';
import { getNormalizedLocation } from '@/utils/locationUtils';
import LocationBadge from '@/components/LocationBadge';

// Simple ProjectVotes component for v2
function ProjectVotes({ 
  campaignId, 
  projectId, 
  onVoteCountReceived 
}: { 
  campaignId: bigint; 
  projectId: bigint; 
  onVoteCountReceived?: (projectId: string, voteCount: bigint) => void;
}) {
  const contractAddress = import.meta.env.VITE_CONTRACT_V4;
  
  const { participation, isLoading } = useParticipation(
    contractAddress, 
    campaignId, 
    projectId
  );

  const voteCount = useMemo(() => {
    if (!participation) return 0n;
    
    if (Array.isArray(participation)) {
      return participation[1];
    } else if (typeof participation === 'object') {
      return participation.voteCount || participation[1] || 0n;
    }
    return 0n;
  }, [participation]);

  useEffect(() => {
    if (onVoteCountReceived && voteCount !== undefined) {
      onVoteCountReceived(projectId.toString(), voteCount);
    }
  }, [voteCount, projectId, onVoteCountReceived]);

  if (isLoading) {
    return <div className="text-lg font-bold text-gray-600">...</div>;
  }

  return (
    <div className="text-center">
      <div className="text-lg font-bold text-blue-600">
        {Number(formatEther(voteCount)).toFixed(1)}
      </div>
      <div className="text-xs text-gray-500 hidden md:block">votes</div>
    </div>
  );
}

interface Project {
  id: string | number | bigint;
  name?: string;
  description?: string;
  voteCount: bigint;
  participation?: { approved: boolean; fundsReceived: bigint; };
  additionalDataParsed?: any;
  bioDataParsed?: any;
  location?: any;
}

export default function CampaignPage() {
  // Add Material Symbols CSS
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=thumbs_up_double';
    document.head.appendChild(link);
    
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const navigate = useNavigate();
  const { id } = useParams();
  const { address, isConnected } = useAccount();
  
  // State
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'approved' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [projectVoteCounts, setProjectVoteCounts] = useState<Map<string, bigint>>(new Map());
  
  const contractAddress = import.meta.env.VITE_CONTRACT_V4;
  const campaignId = id ? BigInt(id) : BigInt(0);
  
  // Data hooks
  const { campaignDetails, isLoading: campaignLoading } = useCampaignDetails(contractAddress, campaignId);
  const { projects: allProjects, isLoading: projectsLoading } = useAllProjects(contractAddress);
  const { sortedProjectIds, isLoading: sortedLoading } = useSortedProjects(contractAddress, campaignId);
  
  // Token amounts
  const celoTokenAddress = import.meta.env.VITE_CELO_TOKEN;
  const cusdTokenAddress = import.meta.env.VITE_CUSD_TOKEN;
  
  const { tokenAmount: celoAmount } = useCampaignTokenAmount(contractAddress, campaignId, celoTokenAddress);
  const { tokenAmount: cusdAmount } = useCampaignTokenAmount(contractAddress, campaignId, cusdTokenAddress);
  
  // Process projects
  const campaignProjects = useMemo(() => {
    if (!allProjects?.length) return [];
    
    return allProjects
      .filter(project => project.project.campaignIds.some(cId => Number(cId) === Number(campaignId)))
      .map(formatProjectForDisplay)
      .filter(Boolean)
      .map(project => ({
        ...project,
        voteCount: 0n, // Will be updated with real data
        participation: {
          approved: sortedProjectIds.includes(BigInt(project.id || 0)),
          fundsReceived: 0n
        }
      })) as Project[];
  }, [allProjects, campaignId, sortedProjectIds]);



  // Update projects with real vote data
  const projectsWithVotes = useMemo(() => {
    if (!campaignProjects.length) return campaignProjects;
    
    return campaignProjects.map((project) => {
      const projectIdStr = project.id?.toString();
      const voteCount = projectIdStr ? projectVoteCounts.get(projectIdStr) || 0n : 0n;
      
      // Normalize location data
      let location = null;
      if (project.location) {
        location = getNormalizedLocation({ location: project.location });
      } else if (project.additionalDataParsed) {
        location = getNormalizedLocation(project.additionalDataParsed);
      } else if (project.bioDataParsed) {
        location = getNormalizedLocation(project.bioDataParsed);
      }
      
      return {
        ...project,
        voteCount,
        location,
        participation: {
          ...project.participation,
          fundsReceived: 0n
        }
      };
    });
  }, [campaignProjects, projectVoteCounts]);
  
  // Filtered projects
  const filteredProjects = useMemo(() => {
    let filtered = [...projectsWithVotes];
    
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(project => 
        project.name?.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query)
      );
    }
    
    switch (activeTab) {
      case 'approved':
        filtered = filtered.filter(project => project.participation?.approved);
        break;
      case 'pending':
        filtered = filtered.filter(project => !project.participation?.approved);
        break;
    }
    
    return filtered.sort((a, b) => Number(b.voteCount) - Number(a.voteCount));
  }, [projectsWithVotes, activeTab, searchTerm]);
  
  // Helper functions
  const getCampaignLogo = () => {
    try {
      if (campaignDetails?.metadata?.mainInfo) {
        const mainInfo = JSON.parse(campaignDetails.metadata.mainInfo);
        if (mainInfo.logo) return mainInfo.logo;
      }
      
      if (campaignDetails?.metadata?.additionalInfo) {
        const additionalInfo = JSON.parse(campaignDetails.metadata.additionalInfo);
        if (additionalInfo.logo) return additionalInfo.logo;
      }
    } catch (e) {
      // If JSON parsing fails, return null
    }
    return null;
  };

  const getProjectLogo = (project: any) => {
    try {
      if (project.additionalDataParsed?.logo) return project.additionalDataParsed.logo;
      
      if (project.additionalData) {
        const additionalData = JSON.parse(project.additionalData);
        if (additionalData.logo) return additionalData.logo;
      }
    } catch (e) {
      console.log('error', e);
    }
    return null;
  };

  // Campaign status
  const now = Math.floor(Date.now() / 1000);
  const startTime = Number(campaignDetails?.campaign?.startTime || 0);
  const endTime = Number(campaignDetails?.campaign?.endTime || 0);
  const isActive = now >= startTime && now < endTime && campaignDetails?.campaign?.active;
  const hasEnded = now >= endTime;
  
  // Countdown
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const targetTime = now < startTime ? startTime : endTime;
      const difference = targetTime - now;
      
      if (difference > 0) {
        setCountdown({
          days: Math.floor(difference / 86400),
          hours: Math.floor((difference % 86400) / 3600),
          minutes: Math.floor((difference % 3600) / 60),
          seconds: difference % 60
        });
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [startTime, endTime]);
  
  // Handlers
  const updateProjectVoteCount = useCallback((projectId: string, voteCount: bigint) => {
    setProjectVoteCounts(prev => {
      const newMap = new Map(prev);
      newMap.set(projectId, voteCount);
      return newMap;
    });
  }, []);

  const openVoteModal = (project: Project) => {
    setSelectedProject(project);
    setShowVoteModal(true);
  };
  
  const closeVoteModal = () => {
    setShowVoteModal(false);
    setSelectedProject(null);
  };

  const getPositionStyling = (index: number) => {
    switch (index) {
      case 0: return { bg: 'from-yellow-400 to-amber-500', badge: '👑' };
      case 1: return { bg: 'from-gray-300 to-slate-500', badge: '🥈' };
      case 2: return { bg: 'from-orange-400 to-amber-600', badge: '🥉' };
      default: return { bg: 'from-blue-400 to-indigo-600', badge: `${index + 1}` };
    }
  };
  
  if (campaignLoading || projectsLoading || sortedLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-600 font-medium">Loading campaign...</p>
        </div>
      </div>
    );
  }
  
  if (!campaignDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Campaign Not Found</h1>
          <button
            onClick={() => navigate('/explore')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 inline mr-2" />
            Back to Explore
          </button>
        </div>
      </div>
    );
  }
  
  const campaign = campaignDetails.campaign;
  const totalFunds = parseFloat(formatEther(campaign.totalFunds));
  const approvedCount = filteredProjects.filter(p => p.participation?.approved).length;
  const pendingCount = filteredProjects.filter(p => !p.participation?.approved).length;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Enhanced Header with Better Visual Hierarchy */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
          <button
            onClick={() => navigate('/explore')}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Explore</span>
          </button>
          
          {/* Consolidated Stats with Icons */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">{filteredProjects.length}</div>
                <div className="text-xs text-gray-500 font-medium">Projects</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                <Coins className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">{totalFunds.toFixed(1)}</div>
                <div className="text-xs text-gray-500 font-medium">CELO</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Enhanced Campaign Header - Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-8 overflow-hidden relative"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-50"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              {/* Left: Campaign Info */}
              <div className="flex items-start space-x-4 flex-1">
                {getCampaignLogo() ? (
                  <img 
                    src={formatIpfsUrl(getCampaignLogo()!)} 
                    alt={`${campaign.name} logo`}
                    className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg ${getCampaignLogo() ? 'hidden' : 'flex'}`}>
                  {campaign.name?.charAt(0) || '🚀'}
                </div>
                
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">{campaign.name}</h1>
                  {campaign.description && (
                    <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
                      {campaign.description.length > 150 
                        ? `${campaign.description.substring(0, 150)}...` 
                        : campaign.description
                      }
                    </p>
                  )}
                </div>
              </div>
            
              {/* Right: Status & Actions */}
              <div className="flex flex-col items-end space-y-4">
                <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  hasEnded ? 'bg-gray-100 text-gray-700' :
                  isActive ? 'bg-green-100 text-green-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {hasEnded ? 'Campaign Ended' : isActive ? '🟢 Active Now' : '⏰ Starting Soon'}
                </div>
                
                {!hasEnded && (
                  <button
                    onClick={() => setShowAddProjectModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 text-sm font-semibold flex items-center shadow-lg hover:shadow-xl"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Project
                  </button>
                )}
              </div>
            </div>
            
            {/* Enhanced Stats Row with Progress Bar */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium text-gray-700">
                      {countdown.days > 0 ? `${countdown.days}d ` : ''}
                      {countdown.hours.toString().padStart(2, '0')}:{countdown.minutes.toString().padStart(2, '0')}:{countdown.seconds.toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    <span className="text-sm font-medium text-gray-700">{campaign.maxWinners.toString()} winners</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium text-gray-700">
                      {campaign.useQuadraticDistribution ? 'Quadratic' : 'Linear'}
                    </span>
                  </div>
                </div>
                
                {/* Campaign Progress Bar */}
                <div className="flex-1 max-w-md">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Campaign Progress</span>
                    <span>{Math.round(((now - startTime) / (endTime - startTime)) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Math.max(0, ((now - startTime) / (endTime - startTime)) * 100))}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Enhanced Filters Section */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Filter Tabs */}
            <div className="flex bg-gray-50 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === 'all' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>All Projects</span>
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">
                    {filteredProjects.length}
                  </span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === 'approved' 
                    ? 'bg-white text-green-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Approved</span>
                  <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-xs font-medium">
                    {approvedCount}
                  </span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === 'pending' 
                    ? 'bg-white text-amber-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Pending</span>
                  <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full text-xs font-medium">
                    {pendingCount}
                  </span>
                </span>
              </button>
            </div>
            
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search projects by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pl-10 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Table-like Cards Layout */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Table Header - Hidden on mobile */}
          <div className="hidden md:block bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-4 px-6 py-4">
              <div className="col-span-1 text-xs font-semibold text-gray-600 uppercase tracking-wider">Pos</div>
              <div className="col-span-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Project</div>
              <div className="col-span-2 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Votes</div>
              <div className="col-span-2 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Status</div>
              <div className="col-span-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Actions</div>
            </div>
          </div>
          
          {/* Projects List */}
          <div className="divide-y divide-gray-100">
            <AnimatePresence>
              {filteredProjects.map((project, index) => {
                const isApproved = project.participation?.approved;
                const canVote = isActive && isApproved;
                const voteCount = Number(formatEther(project.voteCount));
                const projectLogo = getProjectLogo(project);
                
                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => navigate(`/v2/explorer/project/${project.id}`)}
                    className={`group cursor-pointer hover:bg-gray-50 transition-colors ${
                      index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                    }`}
                  >
                                         <div className="grid grid-cols-12 gap-4 items-center px-4 py-4">
                                               {/* Position - Always visible */}
                        <div className="col-span-2 md:col-span-1">
                          <div className="text-center">
                            <span className={`text-lg font-bold ${
                              index === 0 ? 'text-yellow-600' :
                              index === 1 ? 'text-gray-600' :
                              index === 2 ? 'text-orange-600' :
                              'text-gray-700'
                            }`}>
                              {index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                            </span>
                          </div>
                        </div>
                       
                       {/* Project Info - Always visible */}
                       <div className="col-span-6 md:col-span-4">
                         <div className="flex items-center space-x-3">
                           {/* Project Image with Location Badge */}
                           <div className="relative flex-shrink-0">
                             {projectLogo ? (
                               <img 
                                 src={formatIpfsUrl(projectLogo)} 
                                 alt={`${project.name} logo`}
                                 className="w-12 h-12 rounded-lg object-cover border-2 border-gray-200"
                                 onError={(e) => {
                                   const target = e.target as HTMLImageElement;
                                   target.style.display = 'none';
                                   const fallback = target.nextSibling as HTMLElement;
                                   if (fallback) fallback.style.display = 'flex';
                                 }}
                               />
                             ) : null}
                             <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold text-sm ${projectLogo ? 'hidden' : 'flex'}`}>
                               {project.name?.charAt(0) || '🚀'}
                             </div>
                             
                             {/* Location Badge on Image */}
                             {project.location && (
                               <div className="absolute -bottom-2 -right-2">
                                 <LocationBadge location={project.location} variant="card" />
                               </div>
                             )}
                           </div>
                           
                                                       {/* Project Details */}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors break-words">
                                {project.name || 'Untitled Project'}
                              </h3>
                              <p className="text-xs text-gray-500 hidden md:block">
                                {(project.description || 'No description available').length > 100 
                                  ? `${(project.description || 'No description available').substring(0, 100)}...` 
                                  : (project.description || 'No description available')
                                }
                              </p>
                            </div>
                         </div>
                       </div>
                       
                       {/* Votes - Always visible */}
                       <div className="col-span-2 text-center">
                         {project.id !== undefined && project.id !== null ? (
                           <ProjectVotes 
                             campaignId={campaignId} 
                             projectId={BigInt(project.id)} 
                             onVoteCountReceived={updateProjectVoteCount}
                           />
                         ) : (
                           <div className="text-lg font-bold text-gray-600">0.0</div>
                         )}
                       </div>
                       
                       {/* Status - Hidden on mobile */}
                       <div className="col-span-2 text-center hidden md:block">
                         <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                           isApproved 
                             ? 'bg-green-100 text-green-800' 
                             : 'bg-yellow-100 text-yellow-800'
                         }`}>
                           {isApproved ? (
                             <>
                               <CheckCircle className="h-3 w-3 mr-1" />
                               Approved
                             </>
                           ) : (
                             <>
                               <Clock className="h-3 w-3 mr-1" />
                               Pending
                             </>
                           )}
                         </div>
                       </div>
                       
                                               {/* Actions - Always visible */}
                        <div className="col-span-2 md:col-span-3 flex items-center justify-end space-x-2">
                          {/* Vote Button - Only show when applicable */}
                          {canVote && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openVoteModal(project);
                              }}
                              className="px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 text-white text-xs font-medium shadow-lg transition-all duration-300 flex items-center justify-center space-x-1 border border-blue-400/50 group relative overflow-hidden whitespace-nowrap"
                            >
                              <motion.div
                                animate={{ 
                                  x: ['-100%', '200%'],
                                  opacity: [0, 0.5, 0]
                                }}
                                transition={{ 
                                  duration: 2, 
                                  repeat: Infinity, 
                                  delay: index * 0.3,
                                  ease: "easeInOut"
                                }}
                                className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                              />
                              <Vote className="h-3 w-3 relative z-10 group-hover:scale-110 transition-transform duration-200" />
                              <span className="relative z-10">Vote</span>
                            </button>
                          )}
                          
                          {/* Arrow Icon - Always visible */}
                          <div className="text-gray-400 group-hover:text-blue-500 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                     </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          
          {/* Empty State */}
          {filteredProjects.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🌊</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Projects Found</h3>
              <p className="text-gray-600 mb-6 px-4">
                {searchTerm ? `No projects match "${searchTerm}"` : 'No projects have joined this campaign yet.'}
              </p>
              <button
                onClick={() => navigate('/explore')}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Explore Other Campaigns
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Modals */}
      <AddProjectsToCampaignModal
        isOpen={showAddProjectModal}
        onClose={() => setShowAddProjectModal(false)}
        campaignId={campaignId.toString()}
        campaignName={campaign.name || 'Untitled Campaign'}
        onSuccess={() => window.location.reload()}
      />
      
      {showVoteModal && selectedProject && (
        <VoteModal
          isOpen={showVoteModal}
          onClose={closeVoteModal}
          selectedProject={selectedProject}
          campaignId={campaignId}
          isVoting={false}
          campaignDetails={campaignDetails}
          allProjects={filteredProjects}
          totalCampaignFunds={totalFunds}
          onVoteSuccess={() => {
            closeVoteModal();
            window.location.reload();
          }}
          onVoteSubmitted={() => {
            closeVoteModal();
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
