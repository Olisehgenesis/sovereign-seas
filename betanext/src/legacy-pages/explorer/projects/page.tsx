import { useState, useMemo } from 'react';
import { useAllProjects } from '@/hooks/useProjectMethods';
import { formatIpfsUrl } from '@/utils/imageUtils';
import type { Address } from 'viem';
import DynamicHelmet from '@/components/DynamicHelmet';
import ProjectsSearchBar from '@/components/projects/ProjectsSearchBar';
import ProjectsResultsCount from '@/components/projects/ProjectsResultsCount';
import ProjectsEmptyState from '@/components/projects/ProjectsEmptyState';
import ProjectsLoadingState from '@/components/projects/ProjectsLoadingState';
import ProjectsErrorState from '@/components/projects/ProjectsErrorState';
import ProjectsGrid from '@/components/projects/ProjectsGrid';
import { getMainContractAddress } from '@/utils/contractConfig';

const ProjectsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Contract address using getMainContractAddress to support Celo Sepolia
  const CONTRACT_ADDRESS = getMainContractAddress();
  
  // Fetch all projects
  const { projects, isLoading, error } = useAllProjects(CONTRACT_ADDRESS);
  
  // Process and filter projects
  const processedProjects = useMemo(() => {
    if (!projects) return [];
    
    return projects.map(projectDetails => {
      let logo, location;
      try {
        const additionalData = JSON.parse(projectDetails.metadata?.additionalData || '{}');
        logo = additionalData.media?.logo || additionalData.logo;
        if (logo) logo = formatIpfsUrl(logo);
        
        const bioData = JSON.parse(projectDetails.metadata?.bio || '{}');
        location = bioData.location;
      } catch {
        logo = undefined;
        location = undefined;
      }
      
      return {
        ...projectDetails,
        logo,
        location,
        campaignCount: projectDetails.project.campaignIds?.length || 0
      };
    });
  }, [projects]);
  
  // Filter projects
  const filteredProjects = useMemo(() => {
    if (!searchTerm) return processedProjects;
    
    return processedProjects.filter(project => 
      project.project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.location && project.location.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [processedProjects, searchTerm]);
  
  if (isLoading) {
    return <ProjectsLoadingState />;
  }
  
  if (error) {
    return <ProjectsErrorState />;
  }
  
  return (
    <>
    {/* Dynamic Metadata */}
    <DynamicHelmet 
      config={{
        title: 'Projects',
        description: 'Discover innovative blockchain projects on Sov Seas - Explore and support cutting-edge decentralized applications',
        image: '/og-image.png',
        url: typeof window !== 'undefined' ? window.location.href : '',
        type: 'website'
      }}
    />
    
    <div className="min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section with Retro Theme */}
        <div className="mb-8 border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.5em_0.5em_0_#000000] bg-white p-6 relative">
          {/* Pattern Grid Overlay */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-30 z-[1]"
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
              backgroundSize: '0.5em 0.5em'
            }}
          />
          {/* Accent Corner */}
          <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
          <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
          
          <div className="relative z-[2]">
            <h1 className="text-3xl font-extrabold text-[#050505] mb-6 uppercase tracking-[0.05em]">Projects</h1>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <ProjectsResultsCount count={filteredProjects.length} isLoading={isLoading} />
              <div className="flex-1 sm:flex-initial">
                <ProjectsSearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Projects Content */}
        {filteredProjects.length === 0 ? (
          <ProjectsEmptyState searchTerm={searchTerm} />
        ) : (
          <ProjectsGrid projects={filteredProjects} contractAddress={CONTRACT_ADDRESS} />
        )}
      </div>
    </div>
    </>
  );
};

export default ProjectsPage;
