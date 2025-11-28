'use client';

interface ProjectsResultsCountProps {
  count: number;
  isLoading: boolean;
}

export default function ProjectsResultsCount({ count, isLoading }: ProjectsResultsCountProps) {
  return (
    <div className="mb-6">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
        <span className="text-[#050505] text-sm font-extrabold uppercase tracking-[0.05em]">
          {isLoading ? 'Loading projects...' : `${count} projects found`}
        </span>
      </div>
    </div>
  );
}

