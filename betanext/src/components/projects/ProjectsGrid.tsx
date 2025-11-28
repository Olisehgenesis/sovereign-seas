'use client';

import ProjectCard from '@/components/cards/ProjectCard';
import type { Address } from 'viem';

interface ProjectDetails {
  project: {
    id: bigint | string;
    name: string;
    description: string;
    owner: string;
  };
  logo?: string;
  location?: string;
  campaignCount: number;
}

interface ProjectsGridProps {
  projects: ProjectDetails[];
  contractAddress: Address;
}

export default function ProjectsGrid({ projects, contractAddress }: ProjectsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {projects.map((projectDetails) => (
        <ProjectCard
          key={`project-${projectDetails.project.id}`}
          title={projectDetails.project.name}
          description={projectDetails.project.description}
          logo={projectDetails.logo}
          location={projectDetails.location}
          campaignCount={projectDetails.campaignCount}
          projectId={projectDetails.project.id?.toString()}
          projectOwner={projectDetails.project.owner}
          contractAddress={contractAddress}
        />
      ))}
    </div>
  );
}

