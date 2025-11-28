'use client';

import { Search } from 'lucide-react';

interface ProjectsSearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export default function ProjectsSearchBar({ searchTerm, onSearchChange }: ProjectsSearchBarProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative group">
        <input
          type="text"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-4 pr-12 py-2 w-full sm:w-64 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] focus:shadow-[0.4em_0.4em_0_#000000] focus:-translate-x-[0.1em] focus:-translate-y-[0.1em] transition-all text-sm font-extrabold text-[#050505] placeholder:text-gray-400 uppercase tracking-[0.05em] focus:outline-none"
        />
        <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-[#2563eb] hover:text-[#1d4ed8] transition-colors">
          <Search className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

