'use client';

import { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useNavigate } from '@/utils/nextAdapter';
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
import { ButtonCool } from '@/components/ui/button-cool';
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
        <div className="group relative w-full max-w-md">
          <div 
            className="absolute inset-0 pointer-events-none opacity-50 transition-opacity duration-[400ms] z-[1]"
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
              backgroundSize: '0.5em 0.5em'
            }}
          />
          
          <div 
            className="relative bg-white border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] overflow-hidden z-[2] text-center p-8"
            style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
          >
            <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
            <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
            
            <div className="relative z-[2]">
              <AlertCircle className="h-12 w-12 text-[#2563eb] mx-auto mb-4" />
              <h2 className="text-2xl font-extrabold text-[#050505] mb-2 uppercase tracking-[0.05em]">Connect Your Wallet</h2>
              <p className="text-[#050505] mb-6 font-semibold">
                Please connect your wallet to view and claim available tasks.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="group relative w-full mb-8">
          <div 
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
              backgroundSize: '0.5em 0.5em'
            }}
          />
          
          <div 
            className="relative bg-white border-[0.35em] border-[#10b981] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2] group-hover:shadow-[1em_1em_0_#000000] group-hover:-translate-x-[0.4em] group-hover:-translate-y-[0.4em]"
            style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
          >
            <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#10b981] rotate-45 z-[1]" />
            <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
            
            <div 
              className="relative px-[1.5em] py-[1.4em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
              style={{ 
                background: '#10b981',
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
                backgroundBlendMode: 'overlay'
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-[0.3em] flex items-center justify-center border-[0.15em] border-white/30">
                  <ListChecks className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Tasks & Milestones</h1>
                  <p className="text-white/90 text-sm font-semibold mt-1">
                    Browse open milestones, claim tasks, and track your progress
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'open', label: 'Open Tasks', icon: Globe, count: filteredOpenMilestones.length, color: '#2563eb' },
            { id: 'my-tasks', label: 'My Tasks', icon: User, count: myTasks.length, color: '#a855f7' },
            { id: 'pending', label: 'Pending', icon: Clock, count: pendingTasks.length, color: '#f59e0b' },
            { id: 'completed', label: 'Completed', icon: CheckCircle, count: completedTasks.length, color: '#10b981' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-[0.4em] font-extrabold transition-all text-sm relative border-[0.2em] uppercase tracking-[0.05em] ${
                activeTab === tab.id
                  ? 'bg-[#2563eb] text-white border-[#050505] shadow-[0.3em_0.3em_0_#000000]'
                  : 'bg-white text-[#050505] border-[#050505] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em]'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              {tab.count > 0 && (
                <span 
                  className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-extrabold border-[0.15em] ${
                    activeTab === tab.id
                      ? 'bg-white text-[#2563eb] border-[#050505] shadow-[0.15em_0.15em_0_#000000]'
                      : 'bg-[#2563eb] text-white border-[#050505] shadow-[0.15em_0.15em_0_#000000]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        
        {/* Tab Content */}
        <div className="space-y-4">

          {/* Open Tasks Tab */}
          {activeTab === 'open' && (
            <div className="space-y-4">
              {/* Search and Filters */}
              <div className="group relative w-full">
                <div 
                  className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
                  style={{
                    backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                    backgroundSize: '0.5em 0.5em'
                  }}
                />
                
                <div 
                  className="relative bg-white border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2]"
                  style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
                >
                  <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
                  <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
                  
                  <div className="relative px-[1.5em] py-[1.5em] z-[2] space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#050505]" />
                      <Input
                        type="text"
                        placeholder="Search milestones..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-12 border-[0.2em] border-[#050505] rounded-[0.4em] font-semibold focus:outline-none"
                      />
                    </div>
                    
                    {/* Filters */}
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-[#050505]" />
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value as FilterOption)}
                          className="px-3 py-2 border-[0.2em] border-[#050505] rounded-[0.4em] text-sm font-semibold bg-white shadow-[0.2em_0.2em_0_#000000] focus:outline-none"
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
                        <ArrowUpDown className="h-4 w-4 text-[#050505]" />
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as SortOption)}
                          className="px-3 py-2 border-[0.2em] border-[#050505] rounded-[0.4em] text-sm font-semibold bg-white shadow-[0.2em_0.2em_0_#000000] focus:outline-none"
                        >
                          <option value="newest">Newest First</option>
                          <option value="oldest">Oldest First</option>
                          <option value="deadline-soon">Deadline Soonest</option>
                          <option value="deadline-late">Deadline Latest</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Milestones List */}
              {isLoadingOpen ? (
                <div className="group relative w-full">
                  <div 
                    className="absolute inset-0 pointer-events-none opacity-50 transition-opacity duration-[400ms] z-[1]"
                    style={{
                      backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                      backgroundSize: '0.5em 0.5em'
                    }}
                  />
                  
                  <div 
                    className="relative bg-white border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] overflow-hidden z-[2] text-center p-12"
                    style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
                  >
                    <Loader2 className="h-8 w-8 animate-spin text-[#2563eb] mx-auto mb-4" />
                    <p className="text-[#050505] font-semibold">Loading available milestones...</p>
                  </div>
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
                <div className="group relative w-full">
                  <div 
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
                    style={{
                      backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                      backgroundSize: '0.5em 0.5em'
                    }}
                  />
                  
                  <div 
                    className="relative bg-white border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] overflow-hidden z-[2] text-center py-12"
                    style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
                  >
                    <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
                    <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
                    
                    <div className="relative z-[2]">
                      <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-extrabold text-[#050505] mb-2 uppercase tracking-[0.05em]">No Open Tasks</h3>
                      <p className="text-[#050505] font-semibold">
                        {searchQuery ? 'No tasks match your search.' : "More tasks coming soon! Check back later or create a project to add milestones."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* My Tasks Tab */}
          {activeTab === 'my-tasks' && (
            <div className="space-y-4">
              {isLoadingAssigned || isLoadingClaimed ? (
                <div className="group relative w-full">
                  <div 
                    className="absolute inset-0 pointer-events-none opacity-50 transition-opacity duration-[400ms] z-[1]"
                    style={{
                      backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                      backgroundSize: '0.5em 0.5em'
                    }}
                  />
                  
                  <div 
                    className="relative bg-white border-[0.35em] border-[#a855f7] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] overflow-hidden z-[2] text-center p-12"
                    style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
                  >
                    <Loader2 className="h-8 w-8 animate-spin text-[#a855f7] mx-auto mb-4" />
                    <p className="text-[#050505] font-semibold">Loading your tasks...</p>
                  </div>
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
                <div className="group relative w-full">
                  <div 
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
                    style={{
                      backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                      backgroundSize: '0.5em 0.5em'
                    }}
                  />
                  
                  <div 
                    className="relative bg-white border-[0.35em] border-[#a855f7] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] overflow-hidden z-[2] text-center py-12"
                    style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
                  >
                    <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#a855f7] rotate-45 z-[1]" />
                    <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
                    
                    <div className="relative z-[2]">
                      <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-extrabold text-[#050505] mb-2 uppercase tracking-[0.05em]">No Tasks Assigned</h3>
                      <p className="text-[#050505] font-semibold">
                        You don't have any tasks assigned yet. Browse open tasks to claim one!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pending Tasks Tab */}
          {activeTab === 'pending' && (
            <div className="space-y-4">
              {isLoadingAssigned || isLoadingClaimed ? (
                <div className="group relative w-full">
                  <div 
                    className="absolute inset-0 pointer-events-none opacity-50 transition-opacity duration-[400ms] z-[1]"
                    style={{
                      backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                      backgroundSize: '0.5em 0.5em'
                    }}
                  />
                  
                  <div 
                    className="relative bg-white border-[0.35em] border-[#f59e0b] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] overflow-hidden z-[2] text-center p-12"
                    style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
                  >
                    <Loader2 className="h-8 w-8 animate-spin text-[#f59e0b] mx-auto mb-4" />
                    <p className="text-[#050505] font-semibold">Loading pending tasks...</p>
                  </div>
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
                <div className="group relative w-full">
                  <div 
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
                    style={{
                      backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                      backgroundSize: '0.5em 0.5em'
                    }}
                  />
                  
                  <div 
                    className="relative bg-white border-[0.35em] border-[#f59e0b] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] overflow-hidden z-[2] text-center py-12"
                    style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
                  >
                    <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#f59e0b] rotate-45 z-[1]" />
                    <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
                    
                    <div className="relative z-[2]">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-extrabold text-[#050505] mb-2 uppercase tracking-[0.05em]">No Pending Tasks</h3>
                      <p className="text-[#050505] font-semibold">
                        You don't have any pending tasks. All your tasks are either completed or submitted!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Completed Tasks Tab */}
          {activeTab === 'completed' && (
            <div className="space-y-4">
              {isLoadingAssigned || isLoadingClaimed ? (
                <div className="group relative w-full">
                  <div 
                    className="absolute inset-0 pointer-events-none opacity-50 transition-opacity duration-[400ms] z-[1]"
                    style={{
                      backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                      backgroundSize: '0.5em 0.5em'
                    }}
                  />
                  
                  <div 
                    className="relative bg-white border-[0.35em] border-[#10b981] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] overflow-hidden z-[2] text-center p-12"
                    style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
                  >
                    <Loader2 className="h-8 w-8 animate-spin text-[#10b981] mx-auto mb-4" />
                    <p className="text-[#050505] font-semibold">Loading completed tasks...</p>
                  </div>
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
                <div className="group relative w-full">
                  <div 
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
                    style={{
                      backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                      backgroundSize: '0.5em 0.5em'
                    }}
                  />
                  
                  <div 
                    className="relative bg-white border-[0.35em] border-[#10b981] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] overflow-hidden z-[2] text-center py-12"
                    style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
                  >
                    <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#10b981] rotate-45 z-[1]" />
                    <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
                    
                    <div className="relative z-[2]">
                      <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-extrabold text-[#050505] mb-2 uppercase tracking-[0.05em]">No Completed Tasks</h3>
                      <p className="text-[#050505] font-semibold">
                        Complete your pending tasks to see them here!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
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

  const statusColorMap: Record<ProjectMilestoneStatus, string> = {
    [ProjectMilestoneStatus.DRAFT]: '#6b7280',
    [ProjectMilestoneStatus.ACTIVE]: '#2563eb',
    [ProjectMilestoneStatus.CLAIMED]: '#a855f7',
    [ProjectMilestoneStatus.SUBMITTED]: '#f59e0b',
    [ProjectMilestoneStatus.APPROVED]: '#10b981',
    [ProjectMilestoneStatus.REJECTED]: '#ef4444',
    [ProjectMilestoneStatus.PAID]: '#10b981',
    [ProjectMilestoneStatus.CANCELLED]: '#6b7280',
  };
  
  const statusColor = statusColorMap[milestone.status as ProjectMilestoneStatus] || '#6b7280';

  return (
    <div className="group relative w-full">
      <div 
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
          backgroundSize: '0.5em 0.5em'
        }}
      />
      
      <div 
        className="relative bg-white border-[0.35em] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2] group-hover:shadow-[1em_1em_0_#000000] group-hover:-translate-x-[0.4em] group-hover:-translate-y-[0.4em] group-hover:scale-[1.02]"
        style={{ 
          borderColor: statusColor,
          boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)'
        }}
      >
        <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] rotate-45 z-[1]" style={{ backgroundColor: statusColor }} />
        <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
        
        <div className="relative px-[1.5em] py-[1.5em] z-[2]">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h3 className="text-xl font-extrabold text-[#050505] uppercase tracking-[0.05em]">{milestone.title}</h3>
                <span 
                  className="bg-white text-[#050505] text-[0.6em] font-extrabold px-[0.8em] py-[0.4em] border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_#000000] uppercase tracking-[0.1em] rotate-[3deg] transition-all duration-300 group-hover:rotate-[-2deg] group-hover:scale-110"
                  style={{ borderColor: statusColor, backgroundColor: statusInfo.bg.replace('bg-', '').includes('blue') ? '#dbeafe' : statusInfo.bg.replace('bg-', '').includes('green') ? '#d1fae5' : statusInfo.bg.replace('bg-', '').includes('purple') ? '#f3e8ff' : '#f3f4f6' }}
                >
                  {statusInfo.label}
                </span>
                <span className="bg-white text-[#050505] text-[0.6em] font-extrabold px-[0.8em] py-[0.4em] border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_#000000] uppercase tracking-[0.1em] rotate-[-3deg]">
                  {typeLabels[milestone.milestoneType as ProjectMilestoneType]}
                </span>
              </div>
              <p className="text-[#050505] mb-3 font-semibold">{milestone.description}</p>
              {milestone.requirements && (
                <div className="p-3 bg-gray-50 border-[0.15em] border-gray-200 rounded-[0.4em] mb-3 shadow-[0.1em_0.1em_0_#000000]">
                  <p className="text-xs font-extrabold text-[#050505] mb-1 uppercase tracking-[0.05em]">Requirements:</p>
                  <p className="text-sm text-[#050505] font-semibold">{milestone.requirements}</p>
                </div>
              )}
            </div>
          </div>

          {/* Rewards */}
          {tokenDetails && tokenDetails.tokens.length > 0 && (
            <div className="mb-4 p-3 bg-[#dbeafe] border-[0.15em] border-[#2563eb] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
              <p className="text-xs font-extrabold text-[#050505] mb-2 uppercase tracking-[0.05em]">Rewards:</p>
              <div className="flex flex-wrap gap-2">
                {tokenDetails.tokens.map((token, idx) => {
                  const amount = tokenDetails.rewardAmounts[idx];
                  const symbol = getTokenSymbol(token);
                  return (
                    <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-white border-[0.15em] border-[#2563eb] rounded-[0.3em] text-xs font-extrabold shadow-[0.1em_0.1em_0_#000000]">
                      <Coins className="h-3 w-3 text-[#2563eb]" />
                      <span className="text-[#050505]">{formatEther(amount)} {symbol}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 text-sm">
            {milestone.deadline > 0n && (
              <div className="flex items-center gap-2 text-[#050505] font-semibold">
                <Calendar className="h-4 w-4" />
                <span>Deadline: {new Date(Number(milestone.deadline) * 1000).toLocaleDateString()}</span>
              </div>
            )}
            {milestone.assignedTo && milestone.assignedTo !== '0x0000000000000000000000000000000000000000' && (
              <div className="flex items-center gap-2 text-[#050505] font-semibold">
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
                  window.location.reload();
                }}
                showViewButton={true}
                onView={onView}
              />
            ) : (
              <div className="flex gap-3">
                <ButtonCool
                  onClick={onView}
                  text="View Project"
                  bgColor="#2563eb"
                  hoverBgColor="#1d4ed8"
                  textColor="#ffffff"
                  borderColor="#050505"
                  size="sm"
                >
                  <ArrowRight className="w-4 h-4" />
                </ButtonCool>
                {canClaim && (
                  <ButtonCool
                    onClick={handleClaim}
                    text={isClaiming ? "Claiming..." : "Claim Task"}
                    bgColor="#10b981"
                    hoverBgColor="#059669"
                    textColor="#ffffff"
                    borderColor="#050505"
                    size="sm"
                    disabled={isClaiming}
                  >
                    {isClaiming ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                  </ButtonCool>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

