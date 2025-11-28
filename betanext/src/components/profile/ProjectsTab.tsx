'use client';

import { Filter, SortAsc, FileCode } from 'lucide-react';
import { ButtonCool } from '@/components/ui/button-cool';
import { ProfileProjectCard } from './ProfileProjectCard';

interface Project {
  id: bigint;
  name: string;
  description: string;
  active: boolean;
  createdAt: bigint;
  campaignIds?: bigint[];
  metadata: any;
}

interface ProjectsTabProps {
  filteredProjects: Project[];
  filter: string;
  sortBy: string;
  onFilterChange: (filter: string) => void;
  onSortChange: (sort: string) => void;
  navigate: (path: string) => void;
  getProjectRoute: (id: number) => string;
}

export const ProjectsTab = ({
  filteredProjects,
  filter,
  sortBy,
  onFilterChange,
  onSortChange,
  navigate,
  getProjectRoute
}: ProjectsTabProps) => {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="group relative w-full">
        <div 
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
            backgroundSize: '0.5em 0.5em'
          }}
        />
        
        <div 
          className="relative bg-white border-[0.35em] border-[#a855f7] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2]"
          style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
        >
          <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#a855f7] rotate-45 z-[1]" />
          <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
          
          <div className="relative px-[1.5em] py-[1.5em] z-[2]">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-[#050505]" />
                <select
                  value={filter}
                  onChange={(e) => onFilterChange(e.target.value)}
                  className="px-3 py-2 border-[0.2em] border-[#050505] rounded-[0.4em] text-sm font-semibold bg-white shadow-[0.2em_0.2em_0_#000000] focus:outline-none focus:ring-0"
                >
                  <option value="all">All Projects</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <SortAsc className="h-4 w-4 text-[#050505]" />
                <select
                  value={sortBy}
                  onChange={(e) => onSortChange(e.target.value)}
                  className="px-3 py-2 border-[0.2em] border-[#050505] rounded-[0.4em] text-sm font-semibold bg-white shadow-[0.2em_0.2em_0_#000000] focus:outline-none focus:ring-0"
                >
                  <option value="recent">Most Recent</option>
                  <option value="name">Name A-Z</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((project) => (
          <ProfileProjectCard
            key={project.id.toString()}
            project={project}
            onClick={() => navigate(getProjectRoute(Number(project.id)))}
          />
        ))}
        
        {filteredProjects.length === 0 && (
          <div className="col-span-full group relative w-full">
            <div 
              className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
              style={{
                backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                backgroundSize: '0.5em 0.5em'
              }}
            />
            
            <div 
              className="relative bg-white border-[0.35em] border-[#a855f7] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2] text-center py-8"
              style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
            >
              <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#a855f7] rotate-45 z-[1]" />
              <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
              
              <div className="relative z-[2]">
                <FileCode className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-extrabold text-[#050505] mb-2 uppercase tracking-[0.05em]">No Projects Found</h3>
                <p className="text-gray-600 mb-4 text-sm font-semibold">
                  {filter === 'all' 
                    ? "You haven't created any projects yet." 
                    : `No ${filter} projects found.`
                  }
                </p>
                <ButtonCool
                  onClick={() => navigate('/app/project/start')}
                  text="Create Project"
                  bgColor="#a855f7"
                  hoverBgColor="#9333ea"
                  textColor="#ffffff"
                  borderColor="#050505"
                  size="md"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

