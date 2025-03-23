// components/ActionPanel.jsx
import { Award, Plus, TrendingUp, Download, Settings } from 'lucide-react';

interface ActionPanelProps {
  isActive: boolean;
  campaignId: string;
  canDistributeFunds: boolean;
  fundsDistributed: boolean;
  distributionTableVisible: boolean;
  isAdmin: boolean;
  isWritePending: boolean;
  isWaitingForTx: boolean;
  handleDistributeFunds: () => void;
  setDistributionTableVisible: (visible: boolean) => void;
  router: any; 
}

const ActionPanel: React.FC<ActionPanelProps> = ({
  isActive,
  campaignId,
  canDistributeFunds,
  fundsDistributed,
  distributionTableVisible,
  isAdmin,
  isWritePending,
  isWaitingForTx,
  handleDistributeFunds,
  setDistributionTableVisible,
  router
}) => {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center tilt-neon">
        <Settings className="h-5 w-5 mr-2 text-emerald-500" />
        Actions
      </h2>
      
      <div className="space-y-4">
        {isActive && (
          <button
            onClick={() => router.push(`/campaign/${campaignId}/submit`)}
            className="w-full py-3 rounded-full bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors flex items-center justify-center shadow-md"
          >
            <Plus className="h-5 w-5 mr-2" />
            Submit New Project
          </button>
        )}
        
        {canDistributeFunds && (
          <button
            onClick={handleDistributeFunds}
            disabled={isWritePending || isWaitingForTx}
            className="w-full py-3 rounded-full bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors flex items-center justify-center shadow-md disabled:bg-gray-300 disabled:text-gray-500"
          >
            {isWritePending || isWaitingForTx ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            ) : (
              <>
                <Award className="h-5 w-5 mr-2" />
                Distribute Funds
              </>
            )}
          </button>
        )}
        
        {fundsDistributed && !distributionTableVisible && (
          <button
            onClick={() => setDistributionTableVisible(true)}
            className="w-full py-3 rounded-full bg-teal-500 text-white font-semibold hover:bg-teal-600 transition-colors flex items-center justify-center shadow-md"
          >
            <TrendingUp className="h-5 w-5 mr-2" />
            View Fund Distribution
          </button>
        )}
        
        <button
          onClick={() => router.push(`/campaigns`)}
          className="w-full py-3 rounded-full bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors border border-gray-200 shadow-sm"
        >
          View All Campaigns
        </button>
        
        {isAdmin && (
          <button
            onClick={() => router.push(`/campaign/${campaignId}/export`)}
            className="w-full py-3 rounded-full bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center border border-gray-200 shadow-sm"
          >
            <Download className="h-5 w-5 mr-2" />
            Export Campaign Data
          </button>
        )}
      </div>
    </div>
  );
};

export default ActionPanel;