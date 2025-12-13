'use client'

import { useProjectAnalytics } from '@/hooks/useProjectAnalytics'
import { formatEther } from 'viem'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Trophy, TrendingUp, Users, DollarSign, Loader2 } from 'lucide-react'

export default function AnalyticsPage() {
  const router = useRouter()
  const { topByVotes, topByUniqueVoters, topByPayout, isLoading, error } = useProjectAnalytics()

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="border-[0.2em] border-red-500 rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] bg-white p-6">
          <h2 className="text-xl font-extrabold text-[#050505] mb-2">Error Loading Analytics</h2>
          <p className="text-[#050505]">{error.message || 'Failed to load analytics data'}</p>
        </div>
      </div>
    )
  }

  const formatAmount = (amount: bigint) => {
    const formatted = formatEther(amount)
    const num = parseFloat(formatted)
    if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K`
    }
    return num.toFixed(4)
  }

  const ProjectRankCard = ({ 
    project, 
    rank, 
    value, 
    valueLabel, 
    icon: Icon 
  }: { 
    project: { projectId: bigint; projectName: string; totalVotes: bigint; totalPayout: bigint; uniqueVoters: number }
    rank: number
    value: string | number
    valueLabel: string
    icon: typeof Trophy
  }) => (
    <Card 
      className="border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] bg-white p-4 hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all cursor-pointer"
      onClick={() => router.push(`/explorer/project/${project.projectId}`)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#050505] text-white flex items-center justify-center font-extrabold text-sm">
            {rank}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-[#050505] text-sm sm:text-base uppercase tracking-[0.05em] truncate">
              {project.projectName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Icon className="w-4 h-4 text-[#050505]" />
              <span className="text-xs sm:text-sm font-semibold text-[#050505]">
                {value} {valueLabel}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#050505] uppercase tracking-[0.05em] mb-2">
          Project Analytics
        </h1>
        <p className="text-[#050505] font-semibold">
          Top performing projects across the platform
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#050505]" />
          <span className="ml-3 text-[#050505] font-semibold">Loading analytics...</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top 5 by Votes */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-[#2563eb]" />
              <h2 className="text-2xl font-extrabold text-[#050505] uppercase tracking-[0.05em]">
                Top 5 Projects by Total Votes
              </h2>
            </div>
            <p className="text-sm text-[#050505] mb-4 font-semibold">
              Projects with the most money (CELO equivalent) placed on them across all campaigns
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topByVotes.length > 0 ? (
                topByVotes.map((project, index) => (
                  <ProjectRankCard
                    key={project.projectId.toString()}
                    project={project}
                    rank={index + 1}
                    value={formatAmount(project.totalVotes)}
                    valueLabel="CELO"
                    icon={TrendingUp}
                  />
                ))
              ) : (
                <div className="col-span-full border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] bg-white p-6 text-center">
                  <p className="text-[#050505] font-semibold">No projects with votes yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Top 5 by Unique Voters */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Users className="w-6 h-6 text-[#a855f7]" />
              <h2 className="text-2xl font-extrabold text-[#050505] uppercase tracking-[0.05em]">
                Top 5 Projects by Unique Voters
              </h2>
            </div>
            <p className="text-sm text-[#050505] mb-4 font-semibold">
              Projects with the most unique addresses voting for them
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topByUniqueVoters.length > 0 ? (
                topByUniqueVoters.map((project, index) => (
                  <ProjectRankCard
                    key={project.projectId.toString()}
                    project={project}
                    rank={index + 1}
                    value={project.uniqueVoters}
                    valueLabel="voters"
                    icon={Users}
                  />
                ))
              ) : (
                <div className="col-span-full border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] bg-white p-6 text-center">
                  <p className="text-[#050505] font-semibold">No voting data available yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Top 5 by Payout */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-[#10b981]" />
              <h2 className="text-2xl font-extrabold text-[#050505] uppercase tracking-[0.05em]">
                Top 5 Projects by Total Payout
              </h2>
            </div>
            <p className="text-sm text-[#050505] mb-4 font-semibold">
              Projects that have received the most funding across all campaigns
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topByPayout.length > 0 ? (
                topByPayout.map((project, index) => (
                  <ProjectRankCard
                    key={project.projectId.toString()}
                    project={project}
                    rank={index + 1}
                    value={formatAmount(project.totalPayout)}
                    valueLabel="CELO"
                    icon={DollarSign}
                  />
                ))
              ) : (
                <div className="col-span-full border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] bg-white p-6 text-center">
                  <p className="text-[#050505] font-semibold">No payout data available yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

