'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Vote, Clock, XCircle, CheckCircle, Loader2, Plus, ArrowLeft, Info, Rocket, Grid3x3, List } from 'lucide-react';
import { formatEther } from 'viem';
import { useNavigate } from '@/utils/nextAdapter';
import { getProjectRoute } from '@/utils/hashids';
import { ipfsImageLoader } from '@/utils/imageUtils';
import { ButtonCool } from '@/components/ui/button-cool';

interface Project {
  id: string | number | bigint;
  name?: string;
  description?: string;
  voteCount: bigint;
  participation?: {
    approved: boolean;
    voteCount: bigint;
    fundsReceived: bigint;
  };
}

interface CampaignProjectsTableProps {
  projects: Project[];
  totalCampaignVotes: number;
  campaignTotalFunds?: bigint;
  hasEnded: boolean;
  isActive: boolean;
  isAdmin: boolean;
  getProjectLogo: (project: Project) => string | null;
  onVoteClick: (project: Project) => void;
  onApproveProject: (projectId: bigint) => void;
  isApprovingProject: boolean;
  showUnapproved: boolean;
  onToggleUnapproved: () => void;
  onAddProject: () => void;
}

export const CampaignProjectsTable: React.FC<CampaignProjectsTableProps> = ({
  projects,
  totalCampaignVotes,
  campaignTotalFunds,
  hasEnded,
  isActive,
  isAdmin,
  getProjectLogo,
  onVoteClick,
  onApproveProject,
  isApprovingProject,
  showUnapproved,
  onToggleUnapproved,
  onAddProject,
}) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = React.useState<'table' | 'grid' | 'list'>('table');

  // Separate approved and unapproved projects
  const approvedProjects = projects.filter(p => p.participation?.approved === true);
  const unapprovedProjects = projects.filter(p => p.participation?.approved !== true);

  // Create position map for approved projects
  const positionMap = new Map();
  let currentPosition = 1;
  
  approvedProjects.forEach((project, index) => {
    const voteCount = Number(formatEther(project.voteCount || 0n));
    
    if (index === 0) {
      positionMap.set(project.id, 1);
      currentPosition = 1;
    } else {
      const prevVoteCount = Number(formatEther(approvedProjects[index - 1].voteCount || 0n));
      if (voteCount !== prevVoteCount) {
        currentPosition = index + 1;
      }
      positionMap.set(project.id, currentPosition);
    }
  });

  return (
    <div className="relative z-10 pl-4 pr-0 py-2 lg:py-8 lg:px-24 pb-32 lg:pb-8">
      <div className="bg-transparent overflow-hidden pl-4 pr-0 lg:px-16">
        {/* Table Header with Stats and Toggle */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-2 sm:space-y-0">
          {/* Total Stats - Hidden on mobile */}
          <div className="hidden sm:flex items-center space-x-3 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Total Projects:</span>
              <span className="text-sm font-semibold text-gray-800">{approvedProjects.length}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Total Votes:</span>
              <span className="text-sm font-semibold text-gray-800">{totalCampaignVotes.toFixed(1)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`px-2 py-1 rounded-l-[0.3em] transition-all ${
                  viewMode === 'table' 
                    ? 'bg-[#2563eb] text-white shadow-[0.15em_0.15em_0_#000000]' 
                    : 'text-[#050505] hover:bg-gray-100'
                }`}
                title="Table View"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2 py-1 transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-[#2563eb] text-white shadow-[0.15em_0.15em_0_#000000]' 
                    : 'text-[#050505] hover:bg-gray-100'
                }`}
                title="Grid View"
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-2 py-1 rounded-r-[0.3em] transition-all ${
                  viewMode === 'list' 
                    ? 'bg-[#2563eb] text-white shadow-[0.15em_0.15em_0_#000000]' 
                    : 'text-[#050505] hover:bg-gray-100'
                }`}
                title="List View"
              >
                <ArrowLeft className="h-4 w-4 rotate-90" />
              </button>
            </div>

            {/* Add Project Button - Hidden on mobile and when campaign ended */}
            {!hasEnded && (
              <div className="hidden sm:block">
                <ButtonCool
                  onClick={onAddProject}
                  text="Add Project"
                  bgColor="#2563eb"
                  hoverBgColor="#1d4ed8"
                  borderColor="#050505"
                  textColor="#ffffff"
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                </ButtonCool>
              </div>
            )}

            {/* Toggle for Unapproved Projects - Hidden on mobile */}
            {unapprovedProjects.length > 0 && (
              <button
                onClick={onToggleUnapproved}
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-bold text-[#050505] bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all duration-200"
              >
                <span>Unapproved Projects</span>
                <span className="bg-[#2563eb] text-white text-xs font-extrabold px-2 py-1 border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.15em_0.15em_0_#000000]">
                  {unapprovedProjects.length}
                </span>
                <motion.div
                  animate={{ rotate: showUnapproved ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ArrowLeft className="h-4 w-4" />
                </motion.div>
              </button>
            )}
          </div>
        </div>
        
        {/* Render based on view mode - only one view at a time */}
        {viewMode === 'table' && (
          <div className="flex justify-center">
            <table className="w-full max-w-4xl">
            <thead className="bg-transparent hidden lg:table-header-group">
              <tr>
                <th className="px-0.5 py-2 lg:px-2 lg:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-0.5 py-2 lg:px-2 lg:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vote Participation</th>
                <th className="px-0.5 py-2 lg:px-2 lg:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Votes</th>
                <th className={`px-0.5 py-2 lg:px-2 lg:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${!hasEnded ? 'hidden lg:table-cell' : ''}`}>Matching</th>
                <th className={`px-0.5 py-2 lg:px-2 lg:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${hasEnded ? 'hidden lg:table-cell' : ''}`}>Action</th>
                <th className="px-0.5 py-2 lg:px-2 lg:py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50">
              {/* Approved Projects */}
              {approvedProjects.map((project) => {
                const voteCount = Number(formatEther(project.voteCount || 0n));
                const projectLogo = getProjectLogo(project);
                const isApproved = project.participation?.approved === true;
                const position = positionMap.get(project.id);
                
                // Calculate percentage of total votes
                const votePercentage = totalCampaignVotes > 0 ? (voteCount / totalCampaignVotes) * 100 : 0;
                
                // Calculate matching amount
                const totalWeight = projects.reduce((sum, p) => 
                  sum + Math.sqrt(Number(formatEther(p.voteCount || 0n))), 0
                );
                const quadraticWeight = Math.sqrt(voteCount);
                const matchingAmount = totalWeight > 0 && campaignTotalFunds ? 
                  (quadraticWeight / totalWeight) * Number(formatEther(campaignTotalFunds)) * 0.7 : 0;
                
                return (
                  <tr 
                    key={project.id} 
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => isApproved && isActive ? onVoteClick(project) : null}
                  >
                    {/* Logo - Hidden on mobile */}
                    <td className="hidden lg:table-cell px-0.5 py-2 lg:px-2 lg:py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 lg:w-12 lg:h-12 rounded-lg overflow-hidden border border-gray-200 shadow-sm relative">
                          {projectLogo ? (
                            <Image
                              loader={ipfsImageLoader}
                              src={projectLogo}
                              alt={`${project.name} logo`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 1024px) 32px, 48px"
                              unoptimized
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = target.nextSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 text-sm lg:text-lg font-bold ${projectLogo ? 'hidden' : 'flex'}`}>
                            {project.name?.charAt(0) || '🚀'}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Vote Participation - Compact on mobile */}
                    <td className="px-0.5 py-2 lg:px-2 lg:py-4 w-1/4">
                      <div className="space-y-1 lg:space-y-2">
                        <div className="flex items-center space-x-1 max-w-[120px] lg:max-w-xs">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(getProjectRoute(Number(project.id)));
                            }}
                            className="text-xs lg:text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors flex-1 text-left"
                          >
                            {project.name || 'Untitled Project'}
                          </button>
                          {project.description && (
                            <div className="hidden lg:block relative group">
                              <Info className="h-3 w-3 text-gray-400 hover:text-gray-600 cursor-help" />
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap max-w-xs z-10">
                                {project.description}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="hidden lg:flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5 lg:h-2">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-1.5 lg:h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(votePercentage, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500 font-medium">
                            {votePercentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </td>
                    
                    {/* Total Votes - Compact on mobile */}
                    <td className="px-0.5 py-2 lg:px-2 lg:py-4 whitespace-nowrap">
                      <div className="text-xs lg:text-sm font-semibold text-gray-900">
                        {voteCount.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-500">votes</div>
                    </td>
                    
                    {/* Matching - Hidden on mobile if campaign running */}
                    <td className={`px-0.5 py-2 lg:px-2 lg:py-4 whitespace-nowrap ${!hasEnded ? 'hidden lg:table-cell' : ''}`}>
                      <div className="text-xs lg:text-sm font-semibold text-green-600">
                        {matchingAmount.toFixed(2)} CELO
                      </div>
                      <div className="text-xs text-gray-500">{hasEnded ? 'funded' : 'estimated'}</div>
                    </td>
                    
                    {/* Vote Button - Hidden on mobile if campaign ended */}
                    <td className={`px-0.5 py-2 lg:px-2 lg:py-4 whitespace-nowrap ${hasEnded ? 'hidden lg:table-cell' : ''}`}>
                      {isActive && isApproved ? (
                        <ButtonCool
                          onClick={(e) => {
                            e.stopPropagation();
                            onVoteClick(project);
                          }}
                          text="Vote"
                          bgColor="#2563eb"
                          hoverBgColor="#1d4ed8"
                          borderColor="#050505"
                          textColor="#ffffff"
                          size="sm"
                        >
                          <Vote className="w-4 h-4" />
                        </ButtonCool>
                      ) : !isActive ? (
                        <span className="inline-flex items-center px-3 py-2 text-sm font-bold text-[#050505] bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
                          <Clock className="h-4 w-4 mr-1" />
                          {hasEnded ? 'Ended' : 'Pending'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-2 text-sm font-bold text-[#050505] bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
                          <XCircle className="h-4 w-4 mr-1" />
                          Not Approved
                        </span>
                      )}
                    </td>
                    
                    {/* Position on right */}
                    <td className="px-0.5 py-2 lg:px-2 lg:py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end">
                        <div className={`px-3 py-1 border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_#000000] flex items-center justify-center font-extrabold text-xs uppercase tracking-[0.05em] ${
                          position === 1 ? 'bg-[#f59e0b] text-white' :
                          position === 2 ? 'bg-[#6b7280] text-white' :
                          position === 3 ? 'bg-[#f97316] text-white' :
                          'bg-white text-[#050505]'
                        }`}>
                          {`No ${position}`}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {/* Unapproved Projects - Hidden by default */}
              {showUnapproved && unapprovedProjects.map((project) => {
                const voteCount = Number(formatEther(project.voteCount || 0n));
                const projectLogo = getProjectLogo(project);
                const isApproved = project.participation?.approved === true;
                
                // Calculate percentage of total votes
                const votePercentage = totalCampaignVotes > 0 ? (voteCount / totalCampaignVotes) * 100 : 0;
                
                return (
                  <tr 
                    key={project.id}
                    className="hover:bg-gray-50/50 transition-colors bg-gray-100/30 cursor-pointer"
                    onClick={() => isApproved && isActive ? onVoteClick(project) : null}
                  >
                    {/* Logo - Hidden on mobile */}
                    <td className="hidden lg:table-cell px-0.5 py-2 lg:px-2 lg:py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 lg:w-12 lg:h-12 rounded-lg overflow-hidden border border-gray-200 shadow-sm relative">
                          {projectLogo ? (
                            <Image
                              loader={ipfsImageLoader}
                              src={projectLogo}
                              alt={`${project.name} logo`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 1024px) 32px, 48px"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = target.nextSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 text-sm lg:text-lg font-bold ${projectLogo ? 'hidden' : 'flex'}`}>
                            {project.name?.charAt(0) || '🚀'}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Vote Participation - Compact on mobile */}
                    <td className="px-0.5 py-2 lg:px-2 lg:py-4 w-1/4">
                      <div className="space-y-1 lg:space-y-2">
                        <div className="flex items-center space-x-1 max-w-[120px] lg:max-w-xs">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(getProjectRoute(Number(project.id)));
                            }}
                            className="text-xs lg:text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors flex-1 text-left"
                          >
                            {project.name || 'Untitled Project'}
                          </button>
                          {project.description && (
                            <div className="hidden lg:block relative group">
                              <Info className="h-3 w-3 text-gray-400 hover:text-gray-600 cursor-help" />
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap max-w-xs z-10">
                                {project.description}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5 lg:h-2">
                            <div 
                              className="bg-gradient-to-r from-gray-400 to-gray-500 h-1.5 lg:h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(votePercentage, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500 font-medium">
                            {votePercentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </td>
                    
                    {/* Total Votes - Compact on mobile */}
                    <td className="px-0.5 py-2 lg:px-2 lg:py-4 whitespace-nowrap">
                      <div className="text-xs lg:text-sm font-semibold text-gray-600">
                        {voteCount.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-500">votes</div>
                    </td>
                    
                    {/* Matching - Hidden on mobile if campaign running */}
                    <td className={`px-0.5 py-2 lg:px-2 lg:py-4 whitespace-nowrap ${!hasEnded ? 'hidden lg:table-cell' : ''}`}>
                      <div className="text-xs lg:text-sm font-semibold text-gray-500">
                        -
                      </div>
                      <div className="text-xs text-gray-500">not eligible</div>
                    </td>
                    
                    {/* Action - Hidden on mobile if campaign ended */}
                    <td className={`px-0.5 py-2 lg:px-2 lg:py-4 whitespace-nowrap ${hasEnded ? 'hidden lg:table-cell' : ''}`}>
                      {isAdmin ? (
                        <ButtonCool
                          onClick={(e) => {
                            e.stopPropagation();
                            onApproveProject(BigInt(Number(project.id)));
                          }}
                          disabled={isApprovingProject}
                          text={isApprovingProject ? 'Approving...' : 'Approve'}
                          bgColor="#10b981"
                          hoverBgColor="#059669"
                          borderColor="#050505"
                          textColor="#ffffff"
                          size="sm"
                        >
                          {isApprovingProject ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </ButtonCool>
                      ) : (
                        <span className="inline-flex items-center px-3 py-2 text-sm font-bold text-[#050505] bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
                          <XCircle className="h-4 w-4 mr-1" />
                          Not Approved
                        </span>
                      )}
                    </td>
                    
                    {/* Position on right for unapproved */}
                    <td className="px-0.5 py-2 lg:px-2 lg:py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end">
                        <div className="px-2 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs">
                          {`No -`}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {/* Empty State */}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                        <Rocket className="h-8 w-8 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-600">No Projects Yet</h3>
                        <p className="text-sm text-gray-500">Projects will appear here once they join the campaign</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        )}

        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {approvedProjects.map((project) => {
              const voteCount = Number(formatEther(project.voteCount || 0n));
              const projectLogo = getProjectLogo(project);
              const position = positionMap.get(project.id);
              
              return (
                <div
                  key={project.id}
                  className="group relative w-full cursor-pointer"
                  onClick={() => isActive && project.participation?.approved ? onVoteClick(project) : null}
                >
                  {/* Pattern Overlays */}
                  <div 
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
                    style={{
                      backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                      backgroundSize: '0.5em 0.5em'
                    }}
                  />
                  
                  {/* Main Card */}
                  <div 
                    className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2] group-hover:shadow-[1em_1em_0_#000000] group-hover:-translate-x-[0.4em] group-hover:-translate-y-[0.4em] group-hover:scale-[1.02]"
                    style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
                  >
                    {/* Accent Corner */}
                    <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#a855f7] rotate-45 z-[1]" />
                    <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>

                    {/* Title Area */}
                    <div 
                      className="relative px-[1em] py-[0.8em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
                      style={{ 
                        background: '#a855f7',
                        backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
                        backgroundBlendMode: 'overlay'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-[0.4em] overflow-hidden border-[0.2em] border-white shadow-[0.2em_0.2em_0_#000000] relative bg-white">
                          {projectLogo ? (
                            <Image
                              loader={ipfsImageLoader}
                              src={projectLogo}
                              alt={`${project.name} logo`}
                              fill
                              className="object-cover"
                              sizes="48px"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full bg-white flex items-center justify-center text-[#a855f7] text-xl font-bold">
                              {project.name?.charAt(0) || '🚀'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-extrabold text-white truncate">{project.name || 'Untitled Project'}</h3>
                        </div>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="relative px-[1.2em] py-[1em] z-[2]">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[0.8em] font-semibold text-[#050505]">Votes:</span>
                          <span className="text-[1.1em] font-extrabold text-[#a855f7]">{voteCount.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[0.8em] font-semibold text-[#050505]">Position:</span>
                          <span className={`px-2 py-1 border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.15em_0.15em_0_#000000] text-xs font-extrabold uppercase ${
                            position === 1 ? 'bg-[#f59e0b] text-white' :
                            position === 2 ? 'bg-[#6b7280] text-white' :
                            position === 3 ? 'bg-[#f97316] text-white' :
                            'bg-white text-[#050505]'
                          }`}>
                            #{position}
                          </span>
                        </div>
                        {isActive && project.participation?.approved && (
                          <ButtonCool
                            onClick={(e) => {
                              e.stopPropagation();
                              onVoteClick(project);
                            }}
                            text="Vote"
                            bgColor="#2563eb"
                            hoverBgColor="#1d4ed8"
                            borderColor="#050505"
                            textColor="#ffffff"
                            size="sm"
                            className="w-full"
                          >
                            <Vote className="w-4 h-4" />
                          </ButtonCool>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

        {viewMode === 'list' && (
          <div className="mt-8 space-y-4">
            {approvedProjects.map((project) => {
              const voteCount = Number(formatEther(project.voteCount || 0n));
              const projectLogo = getProjectLogo(project);
              const position = positionMap.get(project.id);
              const votePercentage = totalCampaignVotes > 0 ? (voteCount / totalCampaignVotes) * 100 : 0;
              const totalWeight = projects.reduce((sum, p) => 
                sum + Math.sqrt(Number(formatEther(p.voteCount || 0n))), 0
              );
              const quadraticWeight = Math.sqrt(voteCount);
              const matchingAmount = totalWeight > 0 && campaignTotalFunds ? 
                (quadraticWeight / totalWeight) * Number(formatEther(campaignTotalFunds)) * 0.7 : 0;
              
              return (
                <div
                  key={project.id}
                  className="group relative w-full cursor-pointer"
                  onClick={() => isActive && project.participation?.approved ? onVoteClick(project) : null}
                >
                  {/* Pattern Overlays */}
                  <div 
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
                    style={{
                      backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                      backgroundSize: '0.5em 0.5em'
                    }}
                  />
                  
                  {/* Main Card - Horizontal */}
                  <div 
                    className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2] group-hover:shadow-[1em_1em_0_#000000] group-hover:-translate-x-[0.4em] group-hover:-translate-y-[0.4em] group-hover:scale-[1.01]"
                    style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
                  >
                    {/* Accent Corner */}
                    <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#a855f7] rotate-45 z-[1]" />
                    <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>

                    <div className="flex flex-col lg:flex-row">
                      {/* Left Side - Logo and Info */}
                      <div className="flex items-center gap-4 p-4 flex-1">
                        <div className="w-16 h-16 rounded-[0.4em] overflow-hidden border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] relative bg-white flex-shrink-0">
                          {projectLogo ? (
                            <Image
                              loader={ipfsImageLoader}
                              src={projectLogo}
                              alt={`${project.name} logo`}
                              fill
                              className="object-cover"
                              sizes="64px"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full bg-[#a855f7] flex items-center justify-center text-white text-2xl font-bold">
                              {project.name?.charAt(0) || '🚀'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-extrabold text-[#050505] mb-1">{project.name || 'Untitled Project'}</h3>
                          {project.description && (
                            <p className="text-sm text-[#050505]/70 line-clamp-2">{project.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Right Side - Stats and Actions */}
                      <div className="flex items-center gap-4 p-4 border-t-[0.35em] lg:border-t-0 lg:border-l-[0.35em] border-[#050505] bg-[#f9fafb]">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-xs font-semibold text-[#050505] uppercase">Votes</span>
                          <span className="text-xl font-extrabold text-[#a855f7]">{voteCount.toFixed(1)}</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-xs font-semibold text-[#050505] uppercase">Position</span>
                          <span className={`px-3 py-1 border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_#000000] text-sm font-extrabold uppercase ${
                            position === 1 ? 'bg-[#f59e0b] text-white' :
                            position === 2 ? 'bg-[#6b7280] text-white' :
                            position === 3 ? 'bg-[#f97316] text-white' :
                            'bg-white text-[#050505]'
                          }`}>
                            #{position}
                          </span>
                        </div>
                        {isActive && project.participation?.approved && (
                          <ButtonCool
                            onClick={(e) => {
                              e.stopPropagation();
                              onVoteClick(project);
                            }}
                            text="Vote"
                            bgColor="#2563eb"
                            hoverBgColor="#1d4ed8"
                            borderColor="#050505"
                            textColor="#ffffff"
                            size="sm"
                          >
                            <Vote className="w-4 h-4" />
                          </ButtonCool>
                        )}
                      </div>
                    </div>

                    {/* Corner Slice */}
                    <div className="absolute bottom-0 left-0 w-[1.5em] h-[1.5em] bg-white border-r-[0.25em] border-t-[0.25em] border-[#050505] rounded-tl-[0.5em] z-[1]" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

