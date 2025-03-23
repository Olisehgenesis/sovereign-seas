'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { 
  BarChart3, 
  Plus, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp,
  ExternalLink,
  Github,
  Globe,
  Edit,
  Award,
  Video,
  Image,
  FileCode,
  PieChart,
  Users,
  Droplets,
  Activity,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  X,
  Calendar,
  BarChart
} from 'lucide-react';
import { useSovereignSeas } from '../../hooks/useSovereignSeas';

// Contract addresses - replace with actual addresses
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` || 
  '0x35128A5Ee461943fA6403672b3574346Ba7E4530' as `0x${string}`;
const CELO_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_CELO_TOKEN_ADDRESS as `0x${string}` || 
  '0x3FC1f6138F4b0F5Da3E1927412Afe5c68ed4527b' as `0x${string}`;

// Project type
type Project = {
  id: bigint;
  campaignId: bigint;
  owner: string;
  name: string;
  description: string;
  githubLink: string;
  socialLink: string;
  testingLink: string;
  logo: string;
  demoVideo: string;
  contracts: string[];
  approved: boolean;
  voteCount: bigint;
  fundsReceived: bigint;
  // Additional fields
  campaignName?: string;
  campaignStatus?: 'active' | 'upcoming' | 'ended';
  totalVotes?: string;
  fundingStatus?: 'pending' | 'funded' | 'not-funded';
  hasMediaContent?: boolean;
  submissionDate?: Date;
};

// Campaign type
type Campaign = {
  id: bigint;
  admin: string;
  name: string;
  description: string;
  logo: string;
  demoVideo: string;
  startTime: bigint;
  endTime: bigint;
  adminFeePercentage: bigint;
  voteMultiplier: bigint;
  maxWinners: bigint;
  useQuadraticDistribution: boolean;
  active: boolean;
  totalFunds: bigint;
};

export default function MyProjects() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const { address, isConnected } = useAccount();
  
  // State
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalFunding, setTotalFunding] = useState('0');
  const [pendingApproval, setPendingApproval] = useState(0);
  const [activeProjects, setActiveProjects] = useState(0);
  const [totalVotes, setTotalVotes] = useState('0');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'upcoming' | 'ended' | 'pending' | 'approved'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'votes' | 'funds'>('recent');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectDetailsOpen, setProjectDetailsOpen] = useState(false);
  
  // Filtered projects
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  
  // Use the hook to interact with the contract
  const {
    isInitialized,
    loadCampaigns,
    loadProjects,
    formatTokenAmount,
    isCampaignActive,
  } = useSovereignSeas({
    contractAddress: CONTRACT_ADDRESS,
    celoTokenAddress: CELO_TOKEN_ADDRESS,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isInitialized && address) {
      fetchUserProjects();
    }
  }, [isInitialized, address]);

  useEffect(() => {
    if (myProjects.length > 0) {
      applyFiltersAndSort();
    }
  }, [myProjects, searchQuery, filterStatus, sortBy, sortDirection]);

  const fetchUserProjects = async () => {
    if (!address) return;
    
    setLoading(true);
    try {
      // Get all campaigns first
      const campaigns = await loadCampaigns();
      
      if (!Array.isArray(campaigns) || campaigns.length === 0) {
        setLoading(false);
        return;
      }
      
      // Create a map of campaign IDs to names for quick lookup
      const campaignMap = new Map();
      campaigns.forEach(campaign => {
        campaignMap.set(campaign.id.toString(), campaign);
      });
      
      let userProjects: Project[] = [];
      let totalFundingReceived = 0;
      let pendingApprovalCount = 0;
      let activeProjectsCount = 0;
      let totalProjectVotes = 0;
      
      // For each campaign, check if the user has submitted projects
      for (const campaign of campaigns) {
        const projects = await loadProjects(campaign.id);
        
        if (Array.isArray(projects) && projects.length > 0) {
          // Filter projects owned by the current user
          const userOwnedProjects = projects.filter(
            project => project.owner.toLowerCase() === address.toLowerCase()
          );
          
          if (userOwnedProjects.length > 0) {
            // Check if campaign is active
            const campaignData = campaignMap.get(campaign.id.toString());
            const isActive = isCampaignActive(campaignData);
            let campaignStatus: 'active' | 'upcoming' | 'ended';
            
            const now = Math.floor(Date.now() / 1000);
            if (campaignData.active && Number(campaignData.startTime) <= now && Number(campaignData.endTime) >= now) {
              campaignStatus = 'active';
            } else if (Number(campaignData.startTime) > now) {
              campaignStatus = 'upcoming';
            } else {
              campaignStatus = 'ended';
            }
            
            // Process each project
            for (const project of userOwnedProjects) {
              const projectVotes = Number(formatTokenAmount(project.voteCount));
              totalProjectVotes += projectVotes;
              
              const fundingReceived = Number(formatTokenAmount(project.fundsReceived));
              totalFundingReceived += fundingReceived;
              
              if (!project.approved) {
                pendingApprovalCount++;
              }
              
              if (campaignStatus === 'active' && project.approved) {
                activeProjectsCount++;
              }
              
              // Determine funding status
              let fundingStatus: 'pending' | 'funded' | 'not-funded';
              if (Number(project.fundsReceived) > 0) {
                fundingStatus = 'funded';
              } else if (campaignStatus === 'ended') {
                fundingStatus = 'not-funded';
              } else {
                fundingStatus = 'pending';
              }
              
              // Check if project has media content
              const hasMediaContent = 
                project.logo?.trim().length > 0 || 
                project.demoVideo?.trim().length > 0;
              
              // Generate a simulated submission date (in a real app, this would come from the blockchain)
              const submissionDate = new Date();
              submissionDate.setDate(submissionDate.getDate() - (Math.floor(Math.random() * 60))); // Random date within last 60 days
              
              // Add enhanced project data
              userProjects.push({
                ...project,
                campaignName: campaignData.name,
                campaignStatus,
                fundingStatus,
                hasMediaContent,
                totalVotes: formatTokenAmount(project.voteCount),
                submissionDate
              });
            }
          }
        }
      }
      
      // Sort projects by submission date (newest first)
      userProjects.sort((a, b) => {
        if (a.submissionDate && b.submissionDate) {
          return b.submissionDate.getTime() - a.submissionDate.getTime();
        }
        return 0;
      });
      
      // Update state with processed data
      setMyProjects(userProjects);
      setFilteredProjects(userProjects);
      setTotalFunding(totalFundingReceived.toFixed(2));
      setPendingApproval(pendingApprovalCount);
      setActiveProjects(activeProjectsCount);
      setTotalVotes(totalProjectVotes.toFixed(2));
      
    } catch (error) {
      console.error('Error fetching user projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...myProjects];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(project => 
        project.name?.toLowerCase().includes(query) || 
        project.campaignName?.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'approved') {
        filtered = filtered.filter(project => project.approved);
      } else if (filterStatus === 'pending') {
        filtered = filtered.filter(project => !project.approved);
      } else {
        filtered = filtered.filter(project => project.campaignStatus === filterStatus);
      }
    }
    
    // Apply sorting
    filtered = sortProjects(filtered);
    
    setFilteredProjects(filtered);
  };

  const sortProjects = (projects: Project[]) => {
    const sorted = [...projects];
    const direction = sortDirection === 'asc' ? 1 : -1;
    
    switch (sortBy) {
      case 'recent':
        return sorted.sort((a, b) => {
          if (!a.submissionDate || !b.submissionDate) return 0;
          return direction * (a.submissionDate.getTime() - b.submissionDate.getTime());
        });
      case 'votes':
        return sorted.sort((a, b) => {
          const aVotes = a.voteCount ? Number(formatTokenAmount(a.voteCount)) : 0;
          const bVotes = b.voteCount ? Number(formatTokenAmount(b.voteCount)) : 0;
          return direction * (aVotes - bVotes);
        });
      case 'funds':
        return sorted.sort((a, b) => {
          const aFunds = a.fundsReceived ? Number(formatTokenAmount(a.fundsReceived)) : 0;
          const bFunds = b.fundsReceived ? Number(formatTokenAmount(b.fundsReceived)) : 0;
          return direction * (aFunds - bFunds);
        });
      default:
        return sorted;
    }
  };

  const toggleSortDirection = () => {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  };

  const handleViewProjectDetails = (project: Project) => {
    setSelectedProject(project);
    setProjectDetailsOpen(true);
  };

  const navigateToCampaign = (campaignId: string) => {
    router.push(`/campaign/${campaignId}/dashboard`);
  };

  const navigateToProject = (campaignId: string, projectId: string) => {
    router.push(`/campaign/${campaignId}/project/${projectId}`);
  };

  const navigateToEditProject = (campaignId: string, projectId: string) => {
    router.push(`/campaign/${campaignId}/project/${projectId}/edit`);
  };

  const navigateToSubmitProject = () => {
    router.push('/campaigns?action=submit');
  };

  // Format date for display
  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Unknown';
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status badge styling
  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500 text-white';
      case 'upcoming':
        return 'bg-amber-400 text-amber-900';
      case 'ended':
        return 'bg-gray-300 text-gray-700';
      default:
        return 'bg-gray-300 text-gray-700';
    }
  };

  // Get approval badge styling
  const getApprovalBadge = (approved: boolean) => {
    return approved
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-amber-100 text-amber-700';
  };

  // Get funding status badge styling
  const getFundingBadge = (status: string | undefined) => {
    switch (status) {
      case 'funded':
        return 'bg-emerald-100 text-emerald-700';
      case 'not-funded':
        return 'bg-red-100 text-red-700';
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 text-gray-800">
      {/* Header */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 z-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
            <path fill="#10b981" fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,149.3C672,149,768,171,864,176C960,181,1056,171,1152,154.7C1248,139,1344,117,1392,106.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
          </svg>
        </div>
        
        {/* Content */}
        <div className="container mx-auto px-6 py-12 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col items-start">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 flex items-center tracking-tight tilt-neon">
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center mr-3 shadow-sm">
                  <FileCode className="h-5 w-5 text-emerald-600" />
                </div>
                My <span className="text-emerald-600 ml-2">Projects</span>
              </h1>
              <p className="text-gray-600 mt-2 max-w-2xl">
                Track the status, votes, and funding for all the projects you've submitted.
              </p>
            </div>
            
            <button 
              onClick={navigateToSubmitProject}
              className="px-5 py-2.5 rounded-full bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-all flex items-center shadow-sm text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Submit New Project
            </button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {!isConnected ? (
          <div className="bg-white rounded-xl p-8 border border-amber-200 text-center shadow-sm">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center shadow-sm">
              <Users className="h-6 w-6 text-amber-500" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-3">Wallet Not Connected</h2>
            <p className="text-gray-600 mb-6 max-w-lg mx-auto">
              Please connect your wallet to view your projects and track their performance.
            </p>
            <button className="px-5 py-2.5 rounded-full bg-amber-500 text-white font-medium hover:bg-amber-600 transition-all shadow-sm text-sm">
              Connect Wallet
            </button>
          </div>
        ) : loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : myProjects.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center my-12 shadow-sm border border-gray-100">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                <FileCode className="h-8 w-8 text-gray-400" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Projects Found</h3>
            <p className="text-gray-600 mb-6">
              You haven't submitted any projects yet. Start by finding a campaign and submitting your project.
            </p>
            <button 
              onClick={navigateToSubmitProject}
              className="px-5 py-2.5 rounded-full bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-all inline-flex items-center shadow-sm text-sm"
            >
              <BarChart3 className="h-4 w-4 mr-1.5" />
              Explore Campaigns
            </button>
          </div>
        ) : (
          <>
            {/* Project Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
                    <FileCode className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-gray-500 text-xs">Total Projects</h3>
                    <p className="text-xl font-bold text-gray-800">{myProjects.length}</p>
                  </div>
                </div>
                <div className="flex text-xs mt-2">
                  <span className="text-emerald-600 mr-3">
                    {myProjects.filter(p => p.approved).length} Approved
                  </span>
                  <span className="text-amber-600">
                    {pendingApproval} Pending
                  </span>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mr-3">
                    <Activity className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-gray-500 text-xs">Active Projects</h3>
                    <p className="text-xl font-bold text-gray-800">{activeProjects}</p>
                  </div>
                </div>
                <div className="flex text-xs mt-2">
                  <span className="text-amber-600">
                    in live campaigns
                  </span>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                    <Droplets className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-gray-500 text-xs">Total Votes</h3>
                    <p className="text-xl font-bold text-gray-800">{totalVotes} CELO</p>
                  </div>
                </div>
                <div className="flex text-xs mt-2">
                  <span className="text-gray-500">
                    across all projects
                  </span>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <Award className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-gray-500 text-xs">Funding Received</h3>
                    <p className="text-xl font-bold text-emerald-600">{totalFunding} CELO</p>
                  </div>
                </div>
                <div className="flex text-xs mt-2">
                  <span className="text-gray-500">
                    {myProjects.filter(p => Number(p.fundsReceived) > 0).length} funded projects
                  </span>
                </div>
              </div>
            </div>
            
            {/* Project List */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow mb-8 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-emerald-600 flex items-center">
                  <FileCode className="h-4 w-4 mr-2" />
                  Your Projects
                </h2>
                
                {/* Filters and search */}
                <div className="flex flex-col lg:flex-row gap-3 mt-4">
                  {/* Search */}
                  <div className="flex-grow">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search projects or campaigns..."
                        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                      />
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  
                  {/* Status Filter */}
                  <div className="w-full lg:w-48">
                    <div className="relative">
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="w-full appearance-none pl-9 pr-8 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                      >
                        <option value="all">All Projects</option>
                        <option value="approved">Approved</option>
                        <option value="pending">Pending Approval</option>
                        <option value="active">Active Campaigns</option>
                        <option value="ended">Ended Campaigns</option>
                      </select>
                      <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  
                  {/* Sort By */}
                  <div className="w-full lg:w-48">
                    <div className="relative">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="w-full appearance-none pl-9 pr-8 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                      >
                        <option value="recent">Most Recent</option>
                        <option value="votes">Most Votes</option>
                        <option value="funds">Most Funding</option>
                      </select>
                      <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <button 
                        onClick={toggleSortDirection}
                        className="absolute right-3 top-2.5"
                      >
                        {sortDirection === 'desc' 
                          ? <ChevronDown className="h-4 w-4 text-gray-400" />
                          : <ChevronUp className="h-4 w-4 text-gray-400" />
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {filteredProjects.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500 text-sm">No projects found matching your filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-3 text-left text-gray-500 font-medium">Project</th>
                        <th className="p-3 text-left text-gray-500 font-medium">Campaign</th>
                        <th className="p-3 text-center text-gray-500 font-medium">Status</th>
                        <th className="p-3 text-center text-gray-500 font-medium">Approval</th>
                        <th className="p-3 text-right text-gray-500 font-medium">Votes</th>
                        <th className="p-3 text-right text-gray-500 font-medium">Funding</th>
                        <th className="p-3 text-center text-gray-500 font-medium">Media</th>
                        <th className="p-3 text-right text-gray-500 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProjects.map((project) => (
                        <tr key={`${project.campaignId.toString()}-${project.id.toString()}`} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="p-3 text-gray-800 font-medium">
                            <div className="flex flex-col">
                              <span>{project.name}</span>
                              <span className="text-xs text-gray-500">{formatDate(project.submissionDate)}</span>
                            </div>
                          </td>
                          <td className="p-3 text-gray-600">
                            <button
                              onClick={() => navigateToCampaign(project.campaignId.toString())}
                              className="hover:text-emerald-600 transition-colors"
                            >
                              {project.campaignName || `Campaign #${project.campaignId.toString()}`}
                            </button>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(project.campaignStatus)}`}>
                              {project.campaignStatus}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${getApprovalBadge(project.approved)}`}>
                              {project.approved ? 'Approved' : 'Pending'}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono text-emerald-600 text-sm">
                            {project.totalVotes} CELO
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-monotext-sm">
                                {formatTokenAmount(project.fundsReceived)} CELO
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full mt-1 ${getFundingBadge(project.fundingStatus)}`}>
                                {project.fundingStatus}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex justify-center gap-1">
                              {project.logo && (
                                <span className="text-blue-500">
                                  <Image className="h-3.5 w-3.5" />
                                </span>
                              )}
                              {project.demoVideo && (
                                <span className="text-red-500">
                                  <Video className="h-3.5 w-3.5" />
                                </span>
                              )}
                              {!project.logo && !project.demoVideo && (
                                <span className="text-gray-400 text-xs">None</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => navigateToProject(project.campaignId.toString(), project.id.toString())}
                                className="px-2.5 py-1 bg-white text-gray-600 rounded-full hover:bg-gray-100 transition-colors text-xs inline-flex items-center border border-gray-200 shadow-sm"
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View
                              </button>
                              
                              <button
                                onClick={() => navigateToEditProject(project.campaignId.toString(), project.id.toString())}
                                className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200 transition-colors text-xs inline-flex items-center border border-emerald-200 shadow-sm"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Project Details Modal */}
      {projectDetailsOpen && selectedProject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-2xl p-5 relative max-h-[90vh] overflow-y-auto shadow-lg">
            <button 
              onClick={() => setProjectDetailsOpen(false)} 
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
                <FileCode className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">{selectedProject.name}</h3>
                <div className="flex items-center text-sm text-gray-500">
                  <span>Campaign: {selectedProject.campaignName}</span>
                  <span className="mx-2">•</span>
                  <span>ID: {selectedProject.id.toString()}</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-xs text-gray-500 mb-2">Campaign Status</h4>
                <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(selectedProject.campaignStatus)}`}>
                  {selectedProject.campaignStatus}
                </span>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-xs text-gray-500 mb-2">Approval Status</h4>
                <span className={`px-2 py-0.5 rounded-full text-xs ${getApprovalBadge(selectedProject.approved)}`}>
                  {selectedProject.approved ? 'Approved' : 'Pending Approval'}
                </span>
                {!selectedProject.approved && (
                  <p className="text-xs text-amber-600 mt-2">
                    Your project is waiting for campaign admin approval before users can vote for it.
                  </p>
                )}
              </div>
            </div>
            
            <p className="text-gray-700 mb-5 text-sm">{selectedProject.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-xs text-gray-500 mb-2">Votes Received</h4>
                <div className="text-2xl font-bold text-emerald-600 mb-1">
                  {selectedProject.totalVotes} CELO
                </div>
                <div className="flex items-center text-xs text-gray-600">
                  <Activity className="h-3 w-3 mr-1" />
                  <span>from voters supporting your project</span>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-xs text-gray-500 mb-2">Funding Status</h4>
                <div className="flex items-center mb-1">
                  <div className="text-lg font-bold">
                    {selectedProject.fundingStatus === 'funded' ? (
                      <span className="text-emerald-600">Funded</span>
                    ) : selectedProject.fundingStatus === 'not-funded' ? (
                      <span className="text-red-600">Not Funded</span>
                    ) : (
                      <span className="text-amber-600">Pending</span>
                    )}
                  </div>
                  <div className="ml-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getFundingBadge(selectedProject.fundingStatus)}`}>
                      {formatTokenAmount(selectedProject.fundsReceived)} CELO
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-600">
                  {selectedProject.fundingStatus === 'funded' ? (
                    <div className="flex items-center">
                      <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                      <span>Funds have been distributed to you</span>
                    </div>
                  ) : selectedProject.fundingStatus === 'not-funded' ? (
                    <div className="flex items-center">
                      <XCircle className="h-3 w-3 mr-1 text-red-600" />
                      <span>Campaign has ended without funding</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1 text-amber-600" />
                      <span>Campaign is still in progress</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Media Content */}
            {(selectedProject.logo || selectedProject.demoVideo) && (
              <div className="mb-5">
                <h4 className="text-xs text-gray-500 mb-2">Media Content</h4>
                <div className="flex flex-wrap gap-3">
                  {selectedProject.logo && (
                    <div className="bg-gray-50 rounded-lg p-2.5 flex items-center">
                      <Image className="h-3.5 w-3.5 mr-2 text-blue-500" />
                      <span className="text-xs text-gray-700">Project Logo Available</span>
                    </div>
                  )}
                  
                  {selectedProject.demoVideo && (
                    <div className="bg-gray-50 rounded-lg p-2.5 flex items-center">
                      <Video className="h-3.5 w-3.5 mr-2 text-red-500" />
                      <span className="text-xs text-gray-700">Demo Video Available</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Contract Addresses */}
            {selectedProject.contracts && selectedProject.contracts.length > 0 && (
              <div className="mb-5">
                <h4 className="text-xs text-gray-500 mb-2">Contract Addresses</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  <ul className="space-y-1">
                    {selectedProject.contracts.map((contract, index) => (
                      <li key={index} className="text-xs text-gray-600 font-mono truncate">
                        {contract}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {/* External Links */}
            <div className="flex flex-wrap gap-3 mb-5">
              {selectedProject.githubLink && (
                <a 
                  href={selectedProject.githubLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white text-gray-700 rounded-full hover:bg-gray-50 transition-colors text-xs inline-flex items-center border border-gray-200 shadow-sm"
                >
                  <Github className="h-3.5 w-3.5 mr-1.5" />
                  GitHub Repository
                </a>
              )}
              
              {selectedProject.socialLink && (
                <a 
                  href={selectedProject.socialLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white text-gray-700 rounded-full hover:bg-gray-50 transition-colors text-xs inline-flex items-center border border-gray-200 shadow-sm"
                >
                  <Globe className="h-3.5 w-3.5 mr-1.5" />
                  Social Media
                </a>
              )}
              
              {selectedProject.testingLink && (
                <a 
                  href={selectedProject.testingLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white text-gray-700 rounded-full hover:bg-gray-50 transition-colors text-xs inline-flex items-center border border-gray-200 shadow-sm"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Demo/Testing
                </a>
              )}
            </div>
            
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => navigateToEditProject(selectedProject.campaignId.toString(), selectedProject.id.toString())}
                className="px-4 py-2 bg-white text-emerald-600 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors text-xs inline-flex items-center shadow-sm"
              >
                <Edit className="h-3.5 w-3.5 mr-1.5" />
                Edit Project
              </button>
              
              <button
                onClick={() => navigateToProject(selectedProject.campaignId.toString(), selectedProject.id.toString())}
                className="px-4 py-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors text-xs inline-flex items-center shadow-sm"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                View Project Details
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* CTA Section */}
      <div className="py-12">
        <div className="container mx-auto px-6">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100 shadow-sm">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2 tilt-neon">Ready to submit a new project?</h2>
                <p className="text-emerald-700 text-sm">Explore active campaigns and share your innovative solutions.</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={navigateToSubmitProject}
                  className="px-5 py-2.5 rounded-full bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-all flex items-center shadow-sm text-sm"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Submit New Project
                </button>
                <button 
                  onClick={() => router.push('/campaigns')}
                  className="px-5 py-2.5 rounded-full bg-white text-emerald-600 border border-gray-200 font-medium hover:bg-gray-50 transition-all flex items-center shadow-sm text-sm"
                >
                  <BarChart className="h-4 w-4 mr-1.5" />
                  Explore Campaigns
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}