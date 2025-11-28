import { useMemo } from 'react';
import { Github, Anchor, User, ExternalLink } from 'lucide-react';
import { useAllProjects } from '@/hooks/useProjectMethods';
import type { Address } from 'viem';
import DynamicHelmet from '@/components/DynamicHelmet';
import { getProjectRoute } from '@/utils/hashids';
import { ButtonCool } from '@/components/ui/button-cool';

type TeamMember = {
  name?: string;
  role?: string;
  email?: string;
  linkedin?: string;
  twitter?: string;
};

const LeaderboardPage = () => {
  const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_V4 as Address;

  const { projects, isLoading, error } = useAllProjects(CONTRACT_ADDRESS);

  const rows = useMemo(() => {
    if (!projects) return [];

    return projects.map(pd => {
      // Safe parse helpers
      const safeParse = (s: string | undefined) => {
        try { return s ? JSON.parse(s) : {}; } catch { return {}; }
      };

      const additional = safeParse(pd.metadata?.additionalData);
      const bio = safeParse(pd.metadata?.bio);
      const contractInfo = safeParse(pd.metadata?.contractInfo);

      // Normalize GitHub URL from metadata like other pages, with robust fallbacks
      const rawGithub: string | undefined = (
        additional?.links?.githubRepo ||
        additional?.links?.github ||
        additional?.githubRepo ||
        additional?.github ||
        bio?.githubRepo ||
        bio?.github ||
        contractInfo?.githubRepo ||
        contractInfo?.github
      );
      let github: string | undefined = undefined;
      if (typeof rawGithub === 'string' && rawGithub.trim().length > 0) {
        const value = rawGithub.trim();
        const hasProtocol = value.startsWith('http://') || value.startsWith('https://');
        const hasGithubDomain = value.includes('github.com');
        const looksLikeSlug = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(value);
        if (hasProtocol) {
          github = value;
        } else if (hasGithubDomain) {
          github = `https://${value}`;
        } else if (looksLikeSlug) {
          github = `https://github.com/${value.replace(/\/$/, '')}`;
        } else {
          github = `https://${value}`;
        }
      }
      const creator: string = additional?.creator || pd.project.owner || '';

      const teamMembers: TeamMember[] = additional?.teamMembers || [];
      const ceo = teamMembers.find(m => (m?.role || '').toLowerCase().includes('ceo'))
        || teamMembers.find(m => (m?.role || '').toLowerCase().includes('founder'))
        || teamMembers[0];

      return {
        id: pd.project.id,
        name: pd.project.name,
        owner: pd.project.owner,
        github,
        creator,
        ceoName: ceo?.name,
        ceoLinkedIn: ceo?.linkedin,
        location: bio?.location,
      };
    });
  }, [projects]);

  return (
    <>
      <DynamicHelmet 
        config={{
          title: 'Anchor Points — Leaderboard',
          description: 'Sovereign Seas Anchor Points: discover projects and their core team at a glance.',
          image: '/og-image.png',
          url: typeof window !== 'undefined' ? window.location.href : '',
          type: 'website'
        }}
      />

      <div className="min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-block bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] px-[1.5em] py-[1em]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-[1.4em] h-[1.4em] flex items-center justify-center bg-[#2563eb] border-[0.12em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_rgba(0,0,0,0.2)]">
                  <Anchor className="w-[0.9em] h-[0.9em] text-white" />
                </div>
                <h1 className="text-2xl font-extrabold text-[#050505] uppercase tracking-[0.05em]">Anchor Points Leaderboard</h1>
              </div>
              <p className="text-[#050505] font-semibold text-[0.9em]">Discover projects and their core team at a glance</p>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center h-48">
              <div className="relative bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] px-8 py-6">
                <div className="animate-spin rounded-full h-10 w-10 border-b-[0.2em] border-[#2563eb] border-t-transparent"></div>
              </div>
            </div>
          )}

          {error && (
            <div className="group relative w-full max-w-[22em] mx-auto">
              <div className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] overflow-hidden z-[2]">
                <div 
                  className="relative px-[1.4em] py-[1.4em] text-white font-extrabold text-center border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
                  style={{ 
                    background: '#ef4444',
                    backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
                    backgroundBlendMode: 'overlay'
                  }}
                >
                  <span className="text-[1.2em]">Error</span>
                </div>
                <div className="relative px-[1.5em] py-[1.5em] z-[2] text-center">
                  <p className="text-[#050505] text-[0.95em] font-medium">Failed to load projects.</p>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !error && (
            <div className="group relative w-full">
              {/* Pattern Overlays */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-30 transition-opacity duration-[400ms] z-[1]"
                style={{
                  backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                  backgroundSize: '0.5em 0.5em'
                }}
              />
              
              {/* Main Table Container */}
              <div 
                className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] overflow-hidden z-[2]"
                style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
              >
                {/* Accent Corner */}
                <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
                <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>

                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th 
                          className="px-4 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider border-b-[0.2em] border-[#050505]"
                          style={{ 
                            background: '#2563eb',
                            backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
                            backgroundBlendMode: 'overlay'
                          }}
                        >
                          Project
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider border-b-[0.2em] border-[#050505]"
                          style={{ 
                            background: '#2563eb',
                            backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
                            backgroundBlendMode: 'overlay'
                          }}
                        >
                          GitHub
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider border-b-[0.2em] border-[#050505]"
                          style={{ 
                            background: '#2563eb',
                            backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
                            backgroundBlendMode: 'overlay'
                          }}
                        >
                          Creator
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider border-b-[0.2em] border-[#050505]"
                          style={{ 
                            background: '#2563eb',
                            backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
                            backgroundBlendMode: 'overlay'
                          }}
                        >
                          Team CEO
                        </th>
                        <th 
                          className="px-4 py-3 text-right text-xs font-extrabold text-white uppercase tracking-wider border-b-[0.2em] border-[#050505]"
                          style={{ 
                            background: '#2563eb',
                            backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
                            backgroundBlendMode: 'overlay'
                          }}
                        >
                          Link
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {rows.map((row, index) => (
                        <tr 
                          key={`row-${row.id?.toString()}`}
                          className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        >
                          <td className="px-4 py-3 border-b-[0.1em] border-[#050505]">
                            <div className="flex flex-col">
                              <span className="font-extrabold text-[#050505] text-[0.9em]">{row.name}</span>
                              <span className="text-xs text-[#050505] font-medium">ID #{row.id?.toString()}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 border-b-[0.1em] border-[#050505]">
                            {row.github ? (
                              <a 
                                href={row.github} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1 text-[#2563eb] hover:text-[#1d4ed8] font-semibold text-[0.85em] transition-colors"
                              >
                                <Github className="h-4 w-4" />
                                <span className="truncate max-w-[220px] align-middle">{row.github.replace(/^https?:\/\//, '')}</span>
                              </a>
                            ) : (
                              <span className="text-gray-400 text-sm font-medium">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 border-b-[0.1em] border-[#050505]">
                            <code className="text-xs text-[#050505] break-all font-mono bg-gray-100 px-2 py-1 border-[0.1em] border-[#050505] rounded-[0.2em]">{row.creator}</code>
                          </td>
                          <td className="px-4 py-3 border-b-[0.1em] border-[#050505]">
                            {row.ceoName ? (
                              <div className="flex items-center gap-2">
                                <div className="w-[1.2em] h-[1.2em] flex items-center justify-center bg-[#2563eb] border-[0.1em] border-[#050505] rounded-[0.2em]">
                                  <User className="h-[0.8em] w-[0.8em] text-white" />
                                </div>
                                <span className="text-[#050505] text-sm font-extrabold">{row.ceoName}</span>
                                {row.ceoLinkedIn && (
                                  <a 
                                    href={row.ceoLinkedIn} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-[#2563eb] hover:text-[#1d4ed8] text-xs font-semibold"
                                  >
                                    LinkedIn
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm font-medium">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right border-b-[0.1em] border-[#050505]">
                            <a
                              href={getProjectRoute(Number(row.id))}
                              className="inline-flex items-center gap-1 text-[#2563eb] hover:text-[#1d4ed8] font-extrabold text-[0.85em] transition-colors"
                            >
                              View <ExternalLink className="h-4 w-4" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Corner Slice */}
                <div className="absolute bottom-0 left-0 w-[1.5em] h-[1.5em] bg-white border-r-[0.25em] border-t-[0.25em] border-[#050505] rounded-tl-[0.5em] z-[1]" />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LeaderboardPage;


