// components/VoteModal.jsx
import { X } from 'lucide-react';

interface VoteModalProps {
  campaign: {
    voteMultiplier: number;
  };
  selectedProject: {
    name: string;
  };
  voteAmount: string;
  setVoteAmount: (value: string) => void;
  handleVote: () => void;
  setVoteModalVisible: (visible: boolean) => void;
  isWritePending: boolean;
  isWaitingForTx: boolean;
}

const VoteModal: React.FC<VoteModalProps> = ({
  campaign,
  selectedProject,
  voteAmount,
  setVoteAmount,
  handleVote,
  setVoteModalVisible,
  isWritePending,
  isWaitingForTx
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6 relative shadow-xl">
        <button 
          onClick={() => setVoteModalVisible(false)} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
        
        <h3 className="text-xl font-bold mb-1 text-gray-800">Vote for Project</h3>
        <p className="text-emerald-600 font-medium mb-4">{selectedProject.name}</p>
        
        <div className="mb-6">
          <label className="block text-gray-600 mb-2">CELO Amount</label>
          <input 
            type="number"
            min="1"
            step="1"
            value={voteAmount}
            onChange={(e) => setVoteAmount(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-800"
            placeholder="Enter amount"
          />
          <p className="mt-2 text-sm text-gray-500">
            Each CELO token is worth {campaign.voteMultiplier.toString()} votes.
            {voteAmount && !isNaN(parseInt(voteAmount)) && parseInt(voteAmount) > 0 && (
              <span className="block mt-1 text-emerald-600">
                Your vote will be worth {parseInt(voteAmount) * Number(campaign.voteMultiplier)} votes.
              </span>
            )}
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleVote}
            disabled={isWritePending || isWaitingForTx || !voteAmount || parseInt(voteAmount) <= 0}
            className="flex-1 py-3 px-6 bg-emerald-500 text-white font-semibold rounded-full hover:bg-emerald-600 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed shadow-md"
          >
            {isWritePending || isWaitingForTx ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            ) : (
              'Confirm Vote'
            )}
          </button>
          
          <button
            onClick={() => setVoteModalVisible(false)}
            className="py-3 px-6 bg-white border border-gray-200 text-gray-700 font-semibold rounded-full hover:bg-gray-50 transition-colors shadow-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoteModal;