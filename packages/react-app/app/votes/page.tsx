'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { 
  Award, 
  BarChart3, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Droplets, 
  ExternalLink, 
  Filter, 
  PieChart, 
  Search, 
  TrendingUp, 
  Waves, 
  Users,
  Vote,
  Activity,
  Github,
  Globe
} from 'lucide-react';
import Image from 'next/image';
import { useSovereignSeas } from '../../hooks/useSovereignSeas';

// Contract addresses - replace with actual addresses
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` || 
  '0x35128A5Ee461943fA6403672b3574346Ba7E4530' as `0x${string}`;
const CELO_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_CELO_TOKEN_ADDRESS as `0x${string}` || 
  '0x3FC1f6138F4b0F5Da3E1927412Afe5c68ed4527b' as `0x${string}`;

// Vote history type
type VoteRecord = {
  voter: string;
  campaignId: bigint;
  projectId: bigint;
  amount: bigint;
  voteCount: bigint;
  // Additional info we'll fetch
  campaignName?: string;
  projectName?: string;
  timestamp?: number; // We'll simulate this
  status?: 'active' | 'upcoming' | 'ended';
};

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
  approved: boolean;
  voteCount: bigint;
  fundsReceived: bigint;
  // Additional fields
  myVotes?: bigint;
  myVotePercentage?: number;
  fundingStatus?: 'pending' | 'funded' | 'not-funded';
};

// Campaign type
type Campaign = {
  id: bigint;
  admin: string;
  name: string;
  description: string;
  startTime: bigint;
  endTime: bigint;
  adminFeePercentage: bigint;
  voteMultiplier: bigint;
  maxWinners: bigint;
  useQuadraticDistribution: boolean;
  active: boolean;
  totalFunds: bigint;
};

export default function MyVotes() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const { address, isConnected } = useAccount();
  
  // State
  const [voteHistory, setVoteHistory] = useState<VoteRecord[]>([]);
  const [projectsVotedFor, setProjectsVotedFor] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalVoted, setTotalVoted] = useState('0');
  const [activeVotes, setActiveVotes] = useState('0');
  const [endedVotes, setEndedVotes] = useState('0');
  const [totalCampaignsVoted, setTotalCampaignsVoted] = useState(0);
  const [topCampaigns, setTopCampaigns] = useState<{id: bigint, name: string, votes: number}[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'ended'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'amount' | 'votes'>('recent');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectDetailsOpen, setProjectDetailsOpen] = useState(false);
  
  // Filtered vote history
  const [filteredVotes, setFilteredVotes] = useState<VoteRecord[]>([]);
  
  // Use the hook to interact with the contract
  const {
    isInitialized,
    loadCampaigns,
    loadProjects,
    getUserVoteHistory,
    getUserVotesForProject,
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
      fetchUserVotingData();
    }
  }, [isInitialized, address]);

  useEffect(() => {
    if (voteHistory.length > 0) {
      applyFiltersAndSort();
    }
  }, [voteHistory, searchQuery, filterStatus, sortBy, sortDirection]);

  const fetchUserVotingData = async () => {
    if (!address) return;
    
    setLoading(true);
    try {
      // Get all campaigns
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
      
      // Get user's vote history
      const votes = await getUserVoteHistory();
      
      if (!votes || votes.length === 0) {
        setLoading(false);
        return;
      }
      
      // Fetch project data for each vote to get project names
      const projectsMap = new Map();
      const votedProjects: Project[] = [];
      let totalVotesAmount = 0;
      let activeVotesAmount = 0;
      let endedVotesAmount = 0;
      const campaignsVotedIn = new Set();
      const campaignVoteTotals = new Map();
      
      // Process each vote to add additional info
      const processedVotes = await Promise.all(
        votes.map(async (vote) => {
          const campaignId = vote.campaignId.toString();
          const campaign = campaignMap.get(campaignId);
          campaignsVotedIn.add(campaignId);
          
          // Keep track of votes per campaign
          if (!campaignVoteTotals.has(campaignId)) {
            campaignVoteTotals.set(campaignId, {
              id: vote.campaignId,
              name: campaign?.name || `Campaign #${campaignId}`,
              votes: 0
            });
          }
          const campaignTotal = campaignVoteTotals.get(campaignId);
          campaignTotal.votes += Number(formatTokenAmount(vote.amount));
          campaignVoteTotals.set(campaignId, campaignTotal);
          
          // If we haven't loaded the projects for this campaign yet, do so
          if (!projectsMap.has(campaignId)) {
            const campaignProjects = await loadProjects(Number(vote.campaignId));
            if (campaignProjects) {
              projectsMap.set(campaignId, campaignProjects);
            }
          }
          
          // Find the project info
          const projectList = projectsMap.get(campaignId) || [];
          const project = projectList.find((p: { id: { toString: () => string; }; }) => p.id.toString() === vote.projectId.toString());
          
          // Add the vote amount to our running totals
          const voteAmount = Number(formatTokenAmount(vote.amount));
          totalVotesAmount += voteAmount;
          
          // Determine if the campaign is active
          let status: 'active' | 'upcoming' | 'ended' = 'ended';
          if (campaign) {
            const isActive = isCampaignActive(campaign);
            if (isActive) {
              status = 'active';
              activeVotesAmount += voteAmount;
            } else {
              endedVotesAmount += voteAmount;
            }
          }
          
          // Generate a timestamp (simulated since it's not in the contract)
          // In a real implementation, you'd get this from event logs or a timestamp in the contract
          const now = Math.floor(Date.now() / 1000);
          const randomPastTime = now - Math.floor(Math.random() * 2592000); // Random time in the last 30 days
          
          // If this is a project we haven't processed yet for our project list
          if (project && !votedProjects.some(p => p.id.toString() === project.id.toString() && p.campaignId.toString() === campaignId)) {
            // Get my total votes for this project
            // We don't pass address here because the function already uses walletAddress internally
            const myVotes = await getUserVotesForProject(Number(vote.campaignId), Number(vote.projectId));
            
            // Calculate my vote percentage of the total
            const myVotePercentage = Number(myVotes) > 0 && Number(project.voteCount) > 0 
              ? (Number(myVotes) / Number(project.voteCount) * 100)
              : 0;
            
            // Determine if project was funded (simulated)
            const fundingStatus = Number(project.fundsReceived) > 0 
              ? 'funded' 
              : status === 'ended' ? 'not-funded' : 'pending';
            
            votedProjects.push({
              ...project,
              myVotes,
              myVotePercentage,
              fundingStatus
            });
          }
          
          return {
            ...vote,
            campaignName: campaign?.name || `Campaign #${campaignId}`,
            projectName: project?.name || `Project #${vote.projectId.toString()}`,
            timestamp: randomPastTime,
            status
          };
        })
      );
      
      // Set all our derived state
      setVoteHistory(processedVotes);
      setFilteredVotes(processedVotes);
      setProjectsVotedFor(votedProjects);
      setTotalVoted(totalVotesAmount.toFixed(2));
      setActiveVotes(activeVotesAmount.toFixed(2));
      setEndedVotes(endedVotesAmount.toFixed(2));
      setTotalCampaignsVoted(campaignsVotedIn.size);
      
      // Set top campaigns by vote amount
      const topCampaignsList = Array.from(campaignVoteTotals.values())
        .sort((a, b) => b.votes - a.votes)
        .slice(0, 3);
      setTopCampaigns(topCampaignsList);
      
    } catch (error) {
      console.error('Error fetching vote history:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...voteHistory];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(vote => 
        vote.campaignName?.toLowerCase().includes(query) || 
        vote.projectName?.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(vote => vote.status === filterStatus);
    }
    
    // Apply sorting
    filtered = sortVotes(filtered);
    
    setFilteredVotes(filtered);
  };

  const sortVotes = (votes: VoteRecord[]) => {
    const sorted = [...votes];
    const direction = sortDirection === 'asc' ? 1 : -1;
    
    switch (sortBy) {
      case 'recent':
        return sorted.sort((a, b) => {
          if (!a.timestamp || !b.timestamp) return 0;
          return direction * (a.timestamp - b.timestamp);
        });
      case 'amount':
        return sorted.sort((a, b) => {
          return direction * (Number(formatTokenAmount(a.amount)) - Number(formatTokenAmount(b.amount)));
        });
      case 'votes':
        return sorted.sort((a, b) => {
          return direction * (Number(a.voteCount) - Number(b.voteCount));
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

  // Format date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="relative overflow-hidden">
        {/* Background Wave Effect */}
        <div className="absolute inset-0 z-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
            <path fill="#84cc16" fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,149.3C672,149,768,171,864,176C960,181,1056,171,1152,154.7C1248,139,1344,117,1392,106.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
          </svg>
        </div>
        
        {/* Content */}
        <div className="container mx-auto px-6 py-16 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col items-start">
              <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center tracking-tight">
                <Vote className="h-8 w-8 text-lime-500 mr-3" />
                My <span className="text-yellow-400 ml-2">Votes</span>
              </h1>
              <p className="text-slate-300 mt-2 max-w-2xl">
                Track your voting history and impact across all campaigns and projects.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {!isConnected ? (
          <div className="bg-yellow-500/10 backdrop-blur-md rounded-xl p-8 border border-yellow-500/30 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Users className="h-8 w-8 text-yellow-500" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">Wallet Not Connected</h2>
            <p className="text-slate-300 mb-6 max-w-lg mx-auto">
              Please connect your wallet to view your voting history and statistics.
            </p>
            <button className="px-6 py-3 rounded-full bg-yellow-500 text-slate-900 font-semibold hover:bg-yellow-400 transition-all">
              Connect Wallet
            </button>
          </div>
        ) : loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-500"></div>
          </div>
        ) : voteHistory.length === 0 ? (
          <div className="bg-slate-800/30 backdrop-blur-md rounded-xl p-8 text-center my-12">
            <div className="flex justify-center mb-4">
              <Vote className="h-16 w-16 text-slate-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Votes Found</h3>
            <p className="text-slate-300 mb-6">
              You haven't voted in any campaigns yet. Explore campaigns and support projects you believe in.
            </p>
            <button 
              onClick={() => router.push('/campaigns')}
              className="px-6 py-3 rounded-full bg-lime-500 text-slate-900 font-semibold hover:bg-lime-400 transition-all inline-flex items-center"
            >
              <Waves className="h-5 w-5 mr-2" />
              Explore Campaigns
            </button>
          </div>
        ) : (
          <>
            {/* Voting Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-6 border border-lime-600/20 transform hover:-translate-y-1 transition-all">
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-lime-500/20 flex items-center justify-center mr-3">
                    <Droplets className="h-5 w-5 text-lime-500" />
                  </div>
                  <div>
                    <h3 className="text-slate-300 text-sm">Total Voted</h3>
                    <p className="text-2xl font-bold text-lime-400">{totalVoted} CELO</p>
                  </div>
                </div>
                <div className="flex text-xs mt-2">
                  <span className="text-slate-300">
                    Across {projectsVotedFor.length} project{projectsVotedFor.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              
              <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-6 border border-lime-600/20 transform hover:-translate-y-1 transition-all">
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center mr-3">
                    <Activity className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <h3 className="text-slate-300 text-sm">Active Votes</h3>
                    <p className="text-2xl font-bold text-white">{activeVotes} CELO</p>
                  </div>
                </div>
                <div className="flex text-xs mt-2">
                  <span className="text-yellow-400">
                    in pending campaigns
                  </span>
                </div>
              </div>
              
              <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-6 border border-lime-600/20 transform hover:-translate-y-1 transition-all">
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mr-3">
                    <Calendar className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="text-slate-300 text-sm">Ended Votes</h3>
                    <p className="text-2xl font-bold text-white">{endedVotes} CELO</p>
                  </div>
                </div>
                <div className="flex text-xs mt-2">
                  <span className="text-slate-400">
                    in completed campaigns
                  </span>
                </div>
              </div>
              
              <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-6 border border-lime-600/20 transform hover:-translate-y-1 transition-all">
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mr-3">
                    <PieChart className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-slate-300 text-sm">Campaigns Voted</h3>
                    <p className="text-2xl font-bold text-white">{totalCampaignsVoted}</p>
                  </div>
                </div>
                <div className="flex text-xs mt-2">
                  <span className="text-slate-400">
                    {voteHistory.length} total votes
                  </span>
                </div>
              </div>
            </div>
            
            {/* Top Campaigns */}
            {topCampaigns.length > 0 && (
              <div className="bg-slate-800/40 backdrop-blur-md rounded-xl p-6 border border-lime-600/20 mb-8">
                <h2 className="text-xl font-semibold mb-4 text-yellow-400 flex items-center">
                  <Award className="h-5 w-5 mr-2" />
                  Your Top Campaigns
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {topCampaigns.map((campaign, index) => (
                    <div 
                      key={campaign.id.toString()}
                      className="bg-slate-700/30 rounded-lg p-4 cursor-pointer hover:bg-slate-700/50 transition-colors"
                      onClick={() => navigateToCampaign(campaign.id.toString())}
                    >
                      <div className="flex items-center mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                          index === 0 ? 'bg-yellow-500 text-slate-900' :
                          index === 1 ? 'bg-slate-400 text-slate-900' :
                          'bg-amber-700 text-white'
                        }`}>
                          <span className="font-bold">{index + 1}</span>
                        </div>
                        <h3 className="font-semibold text-white line-clamp-1">{campaign.name}</h3>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300 text-sm">Your contribution:</span>
                        <span className="text-lime-400 font-medium">{campaign.votes.toFixed(2)} CELO</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Projects Section */}
            <div className="bg-slate-800/40 backdrop-blur-md rounded-xl border border-lime-600/20 overflow-hidden mb-8">
              <div className="p-6 border-b border-slate-700/50">
                <h2 className="text-xl font-semibold text-yellow-400 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Projects You've Supported
                </h2>
              </div>
              
              {projectsVotedFor.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-slate-400">No projects found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-700/30">
                        <th className="p-4 text-left text-slate-300 font-medium">Project</th>
                        <th className="p-4 text-left text-slate-300 font-medium">Campaign</th>
                        <th className="p-4 text-right text-slate-300 font-medium">Your Votes</th>
                        <th className="p-4 text-right text-slate-300 font-medium">Your %</th>
                        <th className="p-4 text-center text-slate-300 font-medium">Status</th>
                        <th className="p-4 text-right text-slate-300 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectsVotedFor.map((project) => (
                        <tr key={`${project.campaignId}-${project.id}`} className="border-t border-slate-700/30 hover:bg-slate-700/20">
                          <td className="p-4 text-white font-medium">{project.name}</td>
                          <td className="p-4 text-slate-300">
                            <button
                              onClick={() => navigateToCampaign(project.campaignId.toString())}
                              className="hover:text-lime-300 transition-colors"
                            >
                              Campaign #{project.campaignId.toString()}
                            </button>
                          </td>
                          <td className="p-4 text-right font-mono text-lime-400">
                            {formatTokenAmount(project.myVotes || BigInt(0))} CELO
                          </td>
                          <td className="p-4 text-right text-white">
                            {(project.myVotePercentage || 0).toFixed(1)}%
                          </td>
                          <td className="p-4 text-center">
                            {project.fundingStatus === 'funded' ? (
                              <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded-full text-xs border border-green-600/30">
                                Funded
                              </span>
                            ) : project.fundingStatus === 'not-funded' ? (
                              <span className="px-2 py-1 bg-red-900/30 text-red-400 rounded-full text-xs border border-red-600/30">
                                Not Funded
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded-full text-xs border border-yellow-600/30">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleViewProjectDetails(project)}
                              className="px-3 py-1 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors text-sm"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Vote History */}
            <div className="bg-slate-800/40 backdrop-blur-md rounded-xl border border-lime-600/20 overflow-hidden">
              <div className="p-6 border-b border-slate-700/50">
                <h2 className="text-xl font-semibold mb-4 text-yellow-400 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Voting History
                </h2>
                
                {/* Filters and search */}
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-grow">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search campaigns or projects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-700/60 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-lime-500"
                      />
                      <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                    </div>
                  </div>
                  
                  {/* Status Filter */}
                  <div className="w-full lg:w-48">
                    <div className="relative">
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="w-full appearance-none pl-10 pr-10 py-2 rounded-lg bg-slate-700/60 border border-slate-600 text-white focus:outline-none focus:border-lime-500"
                      >
                        <option value="all">All Votes</option>
                        <option value="active">Active</option>
                        <option value="ended">Ended</option>
                      </select>
                      <Filter className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                      <ChevronDown className="absolute right-3 top-2.5 h-5 w-5 text-slate-400" />
                    </div>
                  </div>
                  
                  {/* Sort By */}
                  <div className="w-full lg:w-56">
                    <div className="relative">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="w-full appearance-none pl-10 pr-10 py-2 rounded-lg bg-slate-700/60 border border-slate-600 text-white focus:outline-none focus:border-lime-500"
                      >
                        <option value="recent">Most Recent</option>
                        <option value="amount">Amount (CELO)</option>
                        <option value="votes">Vote Count</option>
                      </select>
                      <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                      <button 
                        onClick={toggleSortDirection}
                        className="absolute right-3 top-2.5"
                      >
                        {sortDirection === 'desc' 
                          ? <ChevronDown className="h-5 w-5 text-slate-400" />
                          : <ChevronUp className="h-5 w-5 text-slate-400" />
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {filteredVotes.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-slate-400">No voting history found matching your filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-700/30">
                        <th className="p-4 text-left text-slate-300 font-medium">Date</th>
                        <th className="p-4 text-left text-slate-300 font-medium">Project</th>
                        <th className="p-4 text-left text-slate-300 font-medium">Campaign</th>
                        <th className="p-4 text-right text-slate-300 font-medium">Amount</th>
                        <th className="p-4 text-right text-slate-300 font-medium">Votes</th>
                        <th className="p-4 text-center text-slate-300 font-medium">Status</th>
                        <th className="p-4 text-right text-slate-300 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVotes.map((vote, index) => (
                        <tr key={index} className="border-t border-slate-700/30 hover:bg-slate-700/20">
                          <td className="p-4 text-slate-300">
                            {vote.timestamp ? formatDate(vote.timestamp) : 'N/A'}
                          </td>
                          <td className="p-4 text-white font-medium">{vote.projectName}</td>
                          <td className="p-4 text-slate-300">
                            <button
                              onClick={() => navigateToCampaign(vote.campaignId.toString())}
                              className="hover:text-lime-300 transition-colors"
                            >
                              {vote.campaignName}
                            </button>
                          </td>
                          <td className="p-4 text-right font-mono text-lime-400">
                            {formatTokenAmount(vote.amount)} CELO
                          </td>
                          <td className="p-4 text-right font-mono text-white">
                            {vote.voteCount.toString()}
                          </td>
                          <td className="p-4 text-center">
                            {vote.status === 'active' ? (
                              <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded-full text-xs border border-green-600/30">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-slate-700/60 text-slate-300 rounded-full text-xs border border-slate-600/50">
                                Ended
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => navigateToProject(vote.campaignId.toString(), vote.projectId.toString())}
                              className="px-3 py-1 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors text-sm inline-flex items-center"
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1" />
                              View
                            </button>
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setProjectDetailsOpen(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
            
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 rounded-full bg-lime-600/30 flex items-center justify-center mr-3">
                <Award className="h-5 w-5 text-lime-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{selectedProject.name}</h3>
                <p className="text-slate-400 text-sm">Project ID: {selectedProject.id.toString()}</p>
              </div>
            </div>
            
            <p className="text-slate-300 mb-6">{selectedProject.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h4 className="text-sm text-slate-400 mb-2">Your Contribution</h4>
                <div className="flex flex-col">
                  <div className="text-2xl font-bold text-lime-400 mb-1">
                    {formatTokenAmount(selectedProject.myVotes || BigInt(0))} CELO
                  </div>
                  <div className="text-sm text-white">
                    {selectedProject.myVotePercentage?.toFixed(2)}% of total votes
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h4 className="text-sm text-slate-400 mb-2">Project Status</h4>
                <div className="flex flex-col">
                  <div className="text-lg font-bold mb-1">
                    {selectedProject.fundingStatus === 'funded' ? (
                      <span className="text-green-400">Funded</span>
                    ) : selectedProject.fundingStatus === 'not-funded' ? (
                      <span className="text-red-400">Not Funded</span>
                    ) : (
                      <span className="text-yellow-400">Pending</span>
                    )}
                  </div>
                  {selectedProject.fundingStatus === 'funded' && (
                    <div className="text-sm text-white">
                      Received: {formatTokenAmount(selectedProject.fundsReceived)} CELO
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* External Links */}
            <div className="flex flex-wrap gap-3 mb-6">
              {selectedProject.githubLink && (
                <a 
                  href={selectedProject.githubLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors text-sm inline-flex items-center"
                >
                  <Github className="h-4 w-4 mr-2" />
                  GitHub Repository
                </a>
              )}
              
              {selectedProject.socialLink && (
                <a 
                  href={selectedProject.socialLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors text-sm inline-flex items-center"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Social Media
                </a>
              )}
              
              {selectedProject.testingLink && (
                <a 
                  href={selectedProject.testingLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors text-sm inline-flex items-center"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Demo/Testing
                </a>
              )}
            </div>
            
            <div className="flex justify-end mt-4">
              <button
                onClick={() => navigateToProject(selectedProject.campaignId.toString(), selectedProject.id.toString())}
                className="px-5 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-500 transition-colors text-sm inline-flex items-center"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Project Details
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* CTA Section */}
      <div className="py-16">
        <div className="container mx-auto px-6">
          <div className="bg-gradient-to-r from-lime-900/40 to-yellow-900/40 backdrop-blur-md rounded-2xl p-8 border border-lime-500/30">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Ready to support more projects?</h2>
                <p className="text-lime-100">Explore campaigns and vote for projects you believe in.</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => router.push('/campaigns')}
                  className="px-6 py-3 rounded-full bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition-all flex items-center"
                >
                  <Waves className="h-5 w-5 mr-2" />
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