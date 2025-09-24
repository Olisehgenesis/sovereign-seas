import { useMemo } from 'react';
import { Github, Anchor, User, ExternalLink } from 'lucide-react';
import { useAllProjects } from '@/hooks/useProjectMethods';
import type { Address } from 'viem';
import DynamicHelmet from '@/components/DynamicHelmet';
import { getProjectRoute } from '@/utils/hashids';

type TeamMember = {
  name?: string;
  role?: string;
  email?: string;
  linkedin?: string;
  twitter?: string;
};

const LeaderboardPage = () => {
  const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_V4 as Address;

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
          <div className="mb-6 flex items-center gap-2">
            <Anchor className="h-5 w-5 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Anchor Points Leaderboard</h1>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          )}

          {error && (
            <div className="text-center text-red-600">Failed to load projects.</div>
          )}

          {!isLoading && !error && (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GitHub</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creator</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team CEO</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Link</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.map(row => (
                    <tr key={`row-${row.id?.toString()}`}>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{row.name}</span>
                          <span className="text-xs text-gray-500">ID #{row.id?.toString()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {row.github ? (
                          <a href={row.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700">
                            <Github className="h-4 w-4" />
                            <span className="truncate max-w-[220px] align-middle">{row.github.replace(/^https?:\/\//, '')}</span>
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs text-gray-700 break-all">{row.creator}</code>
                      </td>
                      <td className="px-4 py-3">
                        {row.ceoName ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-900 text-sm">{row.ceoName}</span>
                            {row.ceoLinkedIn && (
                              <a href={row.ceoLinkedIn} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 text-xs">LinkedIn</a>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={getProjectRoute(Number(row.id))}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                        >
                          View <ExternalLink className="h-4 w-4" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LeaderboardPage;


