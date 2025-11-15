'use client';

import { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { 
  ListChecks, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Globe,
  User,
  ArrowRight,
  Coins,
  Calendar,
  AlertCircle,
  ArrowUpDown
} from 'lucide-react';
import { useOpenMilestones, useUserClaimedMilestones, useUserAssignedMilestones, useClaimOpenMilestone, ProjectMilestoneType, ProjectMilestoneStatus } from '@/hooks/useProjectMilestones';
import { formatEther } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useProjectMilestoneTokenDetails } from '@/hooks/useProjectMilestones';
import { supportedTokens } from '@/hooks/useSupportedTokens';
import { getMainContractAddress } from '@/utils/contractConfig';
import MilestoneActions from '@/components/MilestoneActions';
import { useProjectDetails } from '@/hooks/useProjectMethods';
import type { Address } from 'viem';

type SortOption = 'newest' | 'oldest' | 'reward-high' | 'reward-low' | 'deadline-soon' | 'deadline-late';
type FilterOption = 'all' | 'open' | 'claimed' | 'submitted' | 'approved' | 'rejected';

export default function TasksPage() {
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'open' | 'my-tasks' | 'pending' | 'completed'>('open');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [statusFilter, setStatusFilter] = useState<FilterOption>('all');

  // Fetch open milestones
  const { openMilestones, isLoading: isLoadingOpen } = useOpenMilestones(isConnected);
  
  // Fetch user's claimed milestones
  const { milestones: claimedMilestones, isLoading: isLoadingClaimed } = useUserClaimedMilestones(
    address as Address | undefined,
    isConnected && !!address
  );

  // Fetch all milestones assigned to user
  const { milestones: assignedMilestones, isLoading: isLoadingAssigned } = useUserAssignedMilestones(
    address as Address | undefined,
    isConnected && !!address
  );

  // Combine claimed and assigned milestones for "My Tasks"
  const myTasks = useMemo(() => {
    const all = [...(assignedMilestones || []), ...(claimedMilestones || [])];
    // Remove duplicates by ID
    const unique = new Map();
    all.forEach(m => unique.set(m.id.toString(), m));
    return Array.from(unique.values());
  }, [assignedMilestones, claimedMilestones]);

  // Pending tasks (assigned/claimed but not submitted)
  const pendingTasks = useMemo(() => {
    return myTasks.filter(m => 
      m.status === ProjectMilestoneStatus.ACTIVE ||
      m.status === ProjectMilestoneStatus.CLAIMED
    );
  }, [myTasks]);

  // Completed tasks (approved or paid)
  const completedTasks = useMemo(() => {
    return myTasks.filter(m => 
      m.status === ProjectMilestoneStatus.APPROVED ||
      m.status === ProjectMilestoneStatus.PAID
    );
  }, [myTasks]);

  // Filter and sort available milestones
  const filteredOpenMilestones = useMemo(() => {
    if (!openMilestones) return [];
    
    let filtered = [...openMilestones];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query) ||
        m.requirements.toLowerCase().includes(query)
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      const statusMap: Record<FilterOption, ProjectMilestoneStatus | null> = {
        'all': null,
        'open': ProjectMilestoneStatus.ACTIVE,
        'claimed': ProjectMilestoneStatus.CLAIMED,
        'submitted': ProjectMilestoneStatus.SUBMITTED,
        'approved': ProjectMilestoneStatus.APPROVED,
        'rejected': ProjectMilestoneStatus.REJECTED
      };
      const targetStatus = statusMap[statusFilter];
      if (targetStatus !== null) {
        filtered = filtered.filter(m => m.status === targetStatus);
      }
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return Number(b.createdAt - a.createdAt);
        case 'oldest':
          return Number(a.createdAt - b.createdAt);
        case 'deadline-soon':
          if (a.deadline === 0n && b.deadline === 0n) return 0;
          if (a.deadline === 0n) return 1;
          if (b.deadline === 0n) return -1;
          return Number(a.deadline - b.deadline);
        case 'deadline-late':
          if (a.deadline === 0n && b.deadline === 0n) return 0;
          if (a.deadline === 0n) return 1;
          if (b.deadline === 0n) return -1;
          return Number(b.deadline - a.deadline);
        case 'reward-high':
        case 'reward-low':
          // This would require fetching token details for all, so we'll skip for now
          // Could be enhanced later
          return 0;
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [openMilestones, searchQuery, statusFilter, sortBy]);


  if (!isConnected || !address) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">
            Please connect your wallet to view and claim available tasks.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ListChecks className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            </div>
            Tasks & Milestones
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Browse open milestones, claim tasks, and track your progress
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-white/60 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-2">
            <TabsTrigger value="open" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Open Tasks</span>
              <span className="sm:hidden">Open</span>
              {filteredOpenMilestones.length > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                  {filteredOpenMilestones.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="my-tasks" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">My Tasks</span>
              <span className="sm:hidden">Mine</span>
              {myTasks.length > 0 && (
                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                  {myTasks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Pending</span>
              <span className="sm:hidden">Pending</span>
              {pendingTasks.length > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                  {pendingTasks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Completed</span>
              <span className="sm:hidden">Done</span>
              {completedTasks.length > 0 && (
                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                  {completedTasks.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Open Tasks Tab */}
          <TabsContent value="open" className="space-y-4">
            {/* Search and Filters */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search milestones..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
              
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-600" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as FilterOption)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="claimed">Claimed</option>
                    <option value="submitted">Submitted</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-gray-600" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="deadline-soon">Deadline Soonest</option>
                    <option value="deadline-late">Deadline Latest</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Milestones List */}
            {isLoadingOpen ? (
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Loading available milestones...</p>
              </div>
            ) : filteredOpenMilestones.length > 0 ? (
              <div className="space-y-4">
                {filteredOpenMilestones.map((milestone) => (
                  <MilestoneCard
                    key={milestone.id.toString()}
                    milestone={milestone}
                    onClaim={() => {}}
                    onView={() => navigate(`/explorer/project/${milestone.projectId}`)}
                    showActions={true}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12 text-center">
                <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Open Tasks</h3>
                <p className="text-gray-600">
                  {searchQuery ? 'No tasks match your search.' : "More tasks coming soon! Check back later or create a project to add milestones."}
                </p>
              </div>
            )}
          </TabsContent>

          {/* My Tasks Tab */}
          <TabsContent value="my-tasks" className="space-y-4">
            {isLoadingAssigned || isLoadingClaimed ? (
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Loading your tasks...</p>
              </div>
            ) : myTasks.length > 0 ? (
              <div className="space-y-4">
                {myTasks.map((milestone) => (
                  <MilestoneCard
                    key={milestone.id.toString()}
                    milestone={milestone}
                    onClaim={() => {}}
                    onView={() => navigate(`/explorer/project/${milestone.projectId}`)}
                    showActions={true}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12 text-center">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Tasks Assigned</h3>
                <p className="text-gray-600">
                  You don't have any tasks assigned yet. Browse open tasks to claim one!
                </p>
              </div>
            )}
          </TabsContent>

          {/* Pending Tasks Tab */}
          <TabsContent value="pending" className="space-y-4">
            {isLoadingAssigned || isLoadingClaimed ? (
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Loading pending tasks...</p>
              </div>
            ) : pendingTasks.length > 0 ? (
              <div className="space-y-4">
                {pendingTasks.map((milestone) => (
                  <MilestoneCard
                    key={milestone.id.toString()}
                    milestone={milestone}
                    onClaim={() => {}}
                    onView={() => navigate(`/explorer/project/${milestone.projectId}`)}
                    showActions={true}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Pending Tasks</h3>
                <p className="text-gray-600">
                  You don't have any pending tasks. All your tasks are either completed or submitted!
                </p>
              </div>
            )}
          </TabsContent>

          {/* Completed Tasks Tab */}
          <TabsContent value="completed" className="space-y-4">
            {isLoadingAssigned || isLoadingClaimed ? (
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Loading completed tasks...</p>
              </div>
            ) : completedTasks.length > 0 ? (
              <div className="space-y-4">
                {completedTasks.map((milestone) => (
                  <MilestoneCard
                    key={milestone.id.toString()}
                    milestone={milestone}
                    onClaim={() => {}}
                    onView={() => navigate(`/explorer/project/${milestone.projectId}`)}
                    showActions={true}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12 text-center">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Completed Tasks</h3>
                <p className="text-gray-600">
                  Complete your pending tasks to see them here!
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Milestone Card Component
function MilestoneCard({
  milestone,
  onClaim,
  onView,
  showActions = false
}: {
  milestone: any;
  onClaim: () => void;
  onView: () => void;
  showActions?: boolean;
}) {
  const { claimOpenMilestone, isPending: isClaiming } = useClaimOpenMilestone();
  const { tokenDetails } = useProjectMilestoneTokenDetails(milestone.id, !!milestone.id);
  const contractAddress = getMainContractAddress();
  const { projectDetails } = useProjectDetails(contractAddress, milestone.projectId);
  const projectOwner = projectDetails?.project?.owner || '0x0000000000000000000000000000000000000000' as Address;
  
  const statusConfig: Record<ProjectMilestoneStatus, { bg: string; text: string; label: string; icon: typeof Clock }> = {
    [ProjectMilestoneStatus.DRAFT]: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft', icon: Clock },
    [ProjectMilestoneStatus.ACTIVE]: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Active', icon: Clock },
    [ProjectMilestoneStatus.CLAIMED]: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Claimed', icon: User },
    [ProjectMilestoneStatus.SUBMITTED]: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Submitted', icon: CheckCircle },
    [ProjectMilestoneStatus.APPROVED]: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved', icon: CheckCircle },
    [ProjectMilestoneStatus.REJECTED]: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected', icon: XCircle },
    [ProjectMilestoneStatus.PAID]: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Paid', icon: CheckCircle },
    [ProjectMilestoneStatus.CANCELLED]: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Cancelled', icon: XCircle },
  };
  const statusInfo = statusConfig[milestone.status as ProjectMilestoneStatus] || statusConfig[ProjectMilestoneStatus.DRAFT];
  const StatusIcon = statusInfo.icon;

  const typeLabels: Record<ProjectMilestoneType, string> = {
    [ProjectMilestoneType.INTERNAL]: 'Internal',
    [ProjectMilestoneType.ASSIGNED]: 'Assigned',
    [ProjectMilestoneType.OPEN]: 'Open',
  };

  const handleClaim = async () => {
    try {
      await claimOpenMilestone(milestone.id);
      onClaim();
    } catch (error) {
      console.error('Failed to claim milestone:', error);
    }
  };

  const canClaim = milestone.milestoneType === ProjectMilestoneType.OPEN && 
                   milestone.status === ProjectMilestoneStatus.ACTIVE &&
                   milestone.claimedBy === '0x0000000000000000000000000000000000000000';

  // Get token symbols
  const getTokenSymbol = (tokenAddress: Address) => {
    const token = supportedTokens.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
    return token?.symbol || `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`;
  };

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-xl font-bold text-gray-900">{milestone.title}</h3>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${statusInfo.bg} ${statusInfo.text}`}>
              <StatusIcon className="w-3 h-3" />
              {statusInfo.label}
            </div>
            <div className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
              {typeLabels[milestone.milestoneType as ProjectMilestoneType]}
            </div>
          </div>
          <p className="text-gray-600 mb-3">{milestone.description}</p>
          {milestone.requirements && (
            <div className="p-3 bg-gray-50 rounded-lg mb-3">
              <p className="text-xs font-semibold text-gray-700 mb-1">Requirements:</p>
              <p className="text-sm text-gray-600">{milestone.requirements}</p>
            </div>
          )}
        </div>
      </div>

      {/* Rewards */}
      {tokenDetails && tokenDetails.tokens.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs font-semibold text-gray-700 mb-2">Rewards:</p>
          <div className="flex flex-wrap gap-2">
            {tokenDetails.tokens.map((token, idx) => {
              const amount = tokenDetails.rewardAmounts[idx];
              const symbol = getTokenSymbol(token);
              return (
                <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-white rounded text-xs font-semibold">
                  <Coins className="h-3 w-3 text-blue-600" />
                  <span>{formatEther(amount)} {symbol}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 text-sm">
        {milestone.deadline > 0n && (
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>Deadline: {new Date(Number(milestone.deadline) * 1000).toLocaleDateString()}</span>
          </div>
        )}
        {milestone.assignedTo && milestone.assignedTo !== '0x0000000000000000000000000000000000000000' && (
          <div className="flex items-center gap-2 text-gray-600">
            <User className="h-4 w-4" />
            <span className="font-mono text-xs">
              {milestone.assignedTo.slice(0, 6)}...{milestone.assignedTo.slice(-4)}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {showActions ? (
          <MilestoneActions
            milestone={milestone}
            projectOwner={projectOwner}
            onActionComplete={() => {
              // Refetch data if needed
              window.location.reload();
            }}
            showViewButton={true}
            onView={onView}
          />
        ) : (
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onView}
              className="flex-1"
            >
              View Project
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            {canClaim && (
              <Button
                onClick={handleClaim}
                disabled={isClaiming}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Claiming...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Claim Task
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

