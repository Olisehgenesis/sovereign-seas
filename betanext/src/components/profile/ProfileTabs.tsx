'use client';

import { Home, FileCode, Trophy, Vote, Shield } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: React.ElementType;
  count?: number;
}

interface ProfileTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: Tab[];
}

export const ProfileTabs = ({ activeTab, onTabChange, tabs }: ProfileTabsProps) => {
  return (
    <div className="flex flex-wrap gap-2 mb-8">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-[0.4em] font-extrabold transition-all text-sm relative border-[0.2em] uppercase tracking-[0.05em] ${
            activeTab === tab.id
              ? 'bg-[#2563eb] text-white border-[#050505] shadow-[0.3em_0.3em_0_#000000]'
              : 'bg-white text-[#050505] border-[#050505] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em]'
          }`}
        >
          <tab.icon className="h-4 w-4" />
          {tab.label}
          {tab.count !== undefined && (
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
  );
};

