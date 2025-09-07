import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useAllProjects } from '@/hooks/useProjectMethods';
import ProjectCard from '@/components/cards/ProjectCard';
import { formatIpfsUrl } from '@/utils/imageUtils';
import type { Address } from 'viem';
import DynamicHelmet from '@/components/DynamicHelmet';

const ProjectsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Contract address from environment variable
  const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_V4 as Address;
  
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
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Projects</h2>
            <p className="text-gray-600">There was an error loading the projects. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <>
    {/* Dynamic Metadata */}
    <DynamicHelmet 
      config={{
        title: 'Projects',
        description: 'Discover innovative blockchain projects on Sov Seas - Explore and support cutting-edge decentralized applications',
        image: '/og-image.png',
        url: window.location.href,
        type: 'website'
      }}
    />
    
    <div className="min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Input */}
        <div className="mb-8 flex justify-end">
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-4 pr-12 py-2 w-64 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
              />
              <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            {isLoading ? 'Loading projects...' : `${filteredProjects.length} projects found`}
          </p>
        </div>
        
        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try adjusting your search terms' : 'No projects are available at the moment'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProjects.map((projectDetails) => (
              <ProjectCard
                key={`project-${projectDetails.project.id}`}
                title={projectDetails.project.name}
                description={projectDetails.project.description}
                logo={projectDetails.logo}
                location={projectDetails.location}
                campaignCount={projectDetails.campaignCount}
                projectId={projectDetails.project.id?.toString()}
                projectOwner={projectDetails.project.owner}
                contractAddress={CONTRACT_ADDRESS}
              />
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default ProjectsPage;
