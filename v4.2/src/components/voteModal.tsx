// components/VoteModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { parseEther } from 'viem';
import { 
  X,
  AlertCircle,
  Loader2,
  Coins,
  Zap,
  Rocket,
  Sparkles,
  Star,
  Trophy,
  Flame,
  Crown
} from 'lucide-react';

interface VoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProject: any;
  onVote: (projectId: bigint, token: string, amount: bigint) => Promise<void>;
  isVoting: boolean;
  gameState: {
    score: number;
    combo: number;
    powerUps: string[];
    achievements: string[];
    votingPower: number;
    isOnFire: boolean;
    soundEnabled: boolean;
  };
}

export default function VoteModal({
  isOpen,
  onClose,
  selectedProject,
  onVote,
  isVoting,
  gameState
}: VoteModalProps) {
  const [voteAmount, setVoteAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('');
  const [error, setError] = useState('');

  // Get token addresses from environment
  const celoTokenAddress = process.env.NEXT_PUBLIC_CELO_TOKEN_ADDRESS || process.env.NEXT_PUBLIC_CELO_TOKEN;
  const cUSDTokenAddress = process.env.NEXT_PUBLIC_CUSD_TOKEN_ADDRESS || process.env.NEXT_PUBLIC_CUSD_TOKEN;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setVoteAmount('');
      setSelectedToken(celoTokenAddress || ''); // Default to CELO
      setError('');
    }
  }, [isOpen, celoTokenAddress]);

  // Calculate vote power (1 CELO = 1 vote, cUSD shows actual amount)
  const calculateVotePower = () => {
    if (!voteAmount) return '0';
    if (selectedToken === celoTokenAddress) {
      return voteAmount; // 1 CELO = 1 vote
    } else {
      return voteAmount; // cUSD shows actual amount
    }
  };

  const handleVote = async () => {
    if (!selectedProject || !voteAmount || !selectedToken) {
      setError('Please select a token and enter an amount');
      return;
    }

    try {
      setError('');
      const amount = parseEther(voteAmount);
      await onVote(BigInt(selectedProject.id), selectedToken, amount);
      onClose();
    } catch (error: any) {
      console.error('Voting error:', error);
      setError(error.message || 'Voting failed! Please try again.');
    }
  };

  if (!isOpen || !selectedProject) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border-4 border-blue-200 relative overflow-hidden">
        {/* Modal header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white relative">
          <div className="absolute top-0 right-0 text-6xl opacity-10">🎮</div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          
          <h3 className="text-2xl font-bold mb-2 flex items-center">
            🚀 Power Up Your Vote!
          </h3>
          <p className="text-blue-100">Supporting: <span className="font-bold">{selectedProject.name}</span></p>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Token selection */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center">
              <Coins className="h-4 w-4 mr-2" />
              💰 Choose Your Currency
            </label>
            
            <div className="grid grid-cols-2 gap-3">
              {/* CELO Token Button */}
              <button
                onClick={() => setSelectedToken(celoTokenAddress || '')}
                className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                  selectedToken === celoTokenAddress
                    ? 'border-blue-500 bg-blue-50 text-blue-700 ring-4 ring-blue-200'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">🪙</div>
                  <div className="font-bold text-sm">CELO</div>
                  <div className="text-xs text-gray-500">Native Token</div>
                  <div className="text-xs text-blue-600 font-medium mt-1">1 CELO = 1 Vote</div>
                </div>
              </button>
              
              {/* cUSD Token Button */}
              <button
                onClick={() => setSelectedToken(cUSDTokenAddress || '')}
                className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                  selectedToken === cUSDTokenAddress
                    ? 'border-blue-500 bg-blue-50 text-blue-700 ring-4 ring-blue-200'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">💵</div>
                  <div className="font-bold text-sm">cUSD</div>
                  <div className="text-xs text-gray-500">Stable Coin</div>
                  <div className="text-xs text-green-600 font-medium mt-1">USD Value</div>
                </div>
              </button>
            </div>
          </div>
          
          {/* Amount input */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              ⚡ Vote Power Amount
            </label>
            <div className="relative">
              <input
                type="number"
                value={voteAmount}
                onChange={(e) => setVoteAmount(e.target.value)}
                placeholder="Enter amount..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all text-lg font-medium"
                step="0.01"
                min="0"
              />
              <div className="absolute right-3 top-3 text-2xl">💎</div>
            </div>
            
            {/* Vote power display */}
            {voteAmount && (
              <div className="mt-2 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-700">
                    {calculateVotePower()} {selectedToken === celoTokenAddress ? 'Votes' : 'cUSD'}
                  </div>
                  <div className="text-sm text-purple-600">
                    {selectedToken === celoTokenAddress ? 'Voting Power' : 'Vote Value'}
                  </div>
                </div>
              </div>
            )}
            
            {/* Quick amount buttons */}
            <div className="flex space-x-2 mt-3">
              {['1', '5', '10', '25'].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setVoteAmount(amount)}
                  className="flex-1 px-3 py-2 bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 rounded-lg transition-colors text-sm font-medium"
                >
                  {amount}
                </button>
              ))}
            </div>
          </div>
          
          {/* Vote button */}
          <button
            onClick={handleVote}
            disabled={isVoting || !voteAmount || !selectedToken}
            className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 group"
          >
            {isVoting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>🚀 Launching Vote...</span>
              </>
            ) : (
              <>
                <Rocket className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                <span>🎯 FIRE VOTE!</span>
                <Sparkles className="h-5 w-5 group-hover:animate-spin" />
              </>
            )}
          </button>
          
          {/* Game stats info */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center space-x-2 mb-2">
              <Star className="h-4 w-4 text-purple-500" />
              <span className="font-bold text-purple-800">🎮 Vote Power-Ups Active!</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center space-x-1">
                <Trophy className="h-3 w-3 text-yellow-500" />
                <span className="text-gray-600">Score: +100 pts</span>
              </div>
              <div className="flex items-center space-x-1">
                <Flame className="h-3 w-3 text-orange-500" />
                <span className="text-gray-600">Combo: {gameState.combo}x</span>
              </div>
              <div className="flex items-center space-x-1">
                <Crown className="h-3 w-3 text-purple-500" />
                <span className="text-gray-600">Rank: Voter</span>
              </div>
              <div className="flex items-center space-x-1">
                <Sparkles className="h-3 w-3 text-blue-500" />
                <span className="text-gray-600">Power: {gameState.votingPower}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}