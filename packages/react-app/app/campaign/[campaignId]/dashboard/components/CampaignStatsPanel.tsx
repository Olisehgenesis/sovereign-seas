// components/CampaignStatsPanel.jsx
import { BarChart3, ImageIcon, Video, LineChart } from 'lucide-react';

interface CampaignStatsPanelProps {
  campaign: {
    voteMultiplier: number;
    maxWinners: number | string;
    logo?: string;
    demoVideo?: string;
  };
  totalProjects: number;
  approvedProjects: number;
  totalVotes: number;
  totalFunds: number;
  hasCampaignMedia: boolean;
  projectRankingsVisible: boolean;
  setProjectRankingsVisible: (visible: boolean) => void;
  sortedProjects: { id: number; name: string; voteCount: number }[];
  campaignId: string;
  formatTokenAmount: (amount: bigint) => string;
  router: { push: (url: string) => void };
}

const CampaignStatsPanel: React.FC<CampaignStatsPanelProps> = ({
  campaign,
  totalProjects,
  approvedProjects,
  totalVotes,
  totalFunds,
  hasCampaignMedia,
  projectRankingsVisible,
  setProjectRankingsVisible,
  sortedProjects,
  campaignId,
  formatTokenAmount,
  router
}) => {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center tilt-neon">
        <BarChart3 className="h-5 w-5 mr-2 text-emerald-500" />
        Campaign Stats
      </h2>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total Projects:</span>
          <span className="font-semibold text-gray-800">{totalProjects}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Approved Projects:</span>
          <span className="font-semibold text-gray-800">{approvedProjects}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total Votes:</span>
          <span className="font-semibold text-gray-800">{totalVotes}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total Funds:</span>
          <span className="font-semibold text-emerald-600">{totalFunds} CELO</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Vote Multiplier:</span>
          <span className="font-semibold text-gray-800">{campaign.voteMultiplier.toString()}x</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Max Winners:</span>
          <span className="font-semibold text-gray-800">
            {campaign.maxWinners.toString() === '0' ? 'All Projects' : campaign.maxWinners.toString()}
          </span>
        </div>
        
        {/* Media Info */}
        {hasCampaignMedia && (
          <>
            <div className="border-t border-gray-200 pt-3 mt-3">
              <span className="text-gray-600 font-medium">Media Content:</span>
            </div>
            {campaign.logo && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600 flex items-center">
                  <ImageIcon className="h-4 w-4 mr-2 text-blue-600" />
                  Logo:
                </span>
                <span className="font-medium text-blue-600">Available</span>
              </div>
            )}
            {campaign.demoVideo && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600 flex items-center">
                  <Video className="h-4 w-4 mr-2 text-red-600" />
                  Demo Video:
                </span>
                <span className="font-medium text-red-600">Available</span>
              </div>
            )}
          </>
        )}
        
        {/* View project rankings button */}
        <button
          onClick={() => setProjectRankingsVisible(!projectRankingsVisible)}
          className="w-full py-2 rounded-full bg-teal-100 text-teal-700 font-medium hover:bg-teal-200 transition-colors flex items-center justify-center mt-4 border border-teal-200 shadow-sm"
        >
          <LineChart className="h-4 w-4 mr-2" />
          {projectRankingsVisible ? 'Hide Rankings' : 'View Current Rankings'}
        </button>
        
        {/* Project Rankings Display */}
        {projectRankingsVisible && sortedProjects.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-teal-700 mb-3">Current Rankings</h3>
            
            <div className="space-y-2 mt-3">
              {sortedProjects.slice(0, 5).map((project, index) => (
                <div 
                  key={project.id.toString()} 
                  className={`flex items-center justify-between bg-gray-50 rounded-lg p-2 ${
                    index < Number(campaign.maxWinners) && campaign.maxWinners.toString() !== '0' 
                      ? 'border border-emerald-300' 
                      : 'border border-gray-100'
                  }`}
                >
                  <div className="flex items-center">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full ${
                      index === 0 
                        ? 'bg-yellow-500 text-white' 
                        : index === 1 
                          ? 'bg-gray-400 text-white' 
                          : index === 2 
                            ? 'bg-amber-700 text-white' 
                            : 'bg-gray-200 text-gray-700'
                    } mr-2 font-bold text-xs`}>
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium truncate max-w-[140px]">
                      {project.name}
                    </span>
                  </div>
                  <span className="text-xs text-emerald-600 font-medium">
                    {formatTokenAmount(project.voteCount)}
                  </span>
                </div>
              ))}
              
              {sortedProjects.length > 5 && (
                <button
                  onClick={() => router.push(`/campaign/${campaignId}/leaderboard`)}
                  className="w-full text-center text-sm text-teal-600 hover:text-teal-700 pt-1"
                >
                  View full leaderboard →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignStatsPanel;