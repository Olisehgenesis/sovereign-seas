// components/UserActivityPanel.jsx
import { History, MousePointerClick, Wallet } from 'lucide-react';

interface UserActivityPanelProps {
  userVoteStats: {
    totalVotes: number;
    projectCount: number;
  };
  userVoteHistory: {
    projectId: string;
    amount: number;
    voteCount: number;
  }[];
  voteHistoryVisible: boolean;
  setVoteHistoryVisible: (visible: boolean) => void;
  projects: {
    id: string;
    name: string;
  }[];
  formatTokenAmount: (amount: bigint) => string;
}

const UserActivityPanel: React.FC<UserActivityPanelProps> = ({ 
  userVoteStats, 
  userVoteHistory, 
  voteHistoryVisible, 
  setVoteHistoryVisible, 
  projects, 
  formatTokenAmount 
}) => {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center tilt-neon">
        <Wallet className="h-5 w-5 mr-2 text-purple-600" />
        Your Activity
      </h2>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Your Total Votes:</span>
          <span className="font-semibold text-purple-600">{userVoteStats.totalVotes}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Projects Voted:</span>
          <span className="font-semibold text-purple-600">{userVoteStats.projectCount}</span>
        </div>
        
        <button
          onClick={() => setVoteHistoryVisible(!voteHistoryVisible)}
          className="w-full py-2 rounded-full bg-purple-100 text-purple-700 font-medium hover:bg-purple-200 transition-colors flex items-center justify-center mt-2 border border-purple-200 shadow-sm"
        >
          <History className="h-4 w-4 mr-2" />
          {voteHistoryVisible ? 'Hide Vote History' : 'View Vote History'}
        </button>
        
        {/* Vote History (conditionally rendered) */}
        {voteHistoryVisible && (
          <div className="mt-3 space-y-2">
            <h3 className="text-sm font-medium text-purple-700 mb-2">Vote History</h3>
            
            {userVoteHistory.length === 0 ? (
              <p className="text-gray-500 text-sm">You haven't voted in this campaign yet.</p>
            ) : (
              userVoteHistory.map((vote, index) => {
                const project = projects.find(p => p.id.toString() === vote.projectId.toString());
                return (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center mb-1">
                      <MousePointerClick className="h-3.5 w-3.5 text-purple-500 mr-2" />
                      <span className="font-medium">
                        {project ? project.name : `Project #${vote.projectId.toString()}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Amount:</span>
                      <span className="text-emerald-600 font-medium">
                        {formatTokenAmount(BigInt(vote.amount))} CELO
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Vote Count:</span>
                      <span className="text-purple-600 font-medium">
                        {formatTokenAmount(BigInt(vote.voteCount))}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserActivityPanel;