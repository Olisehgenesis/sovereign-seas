// components/VoteModal.tsx - Clean Sovereign Seas Version
'use client';

import { useState, useEffect } from 'react';
import { parseEther, formatEther } from 'viem';
import { useAccount, useBalance } from 'wagmi';
import { 
  X,
  AlertCircle,
  Loader2,
  Wallet,
  Zap,
  Check,
  Vote,
  Crown,
  Ship
} from 'lucide-react';

import {useVote} from '@/hooks/useVotingMethods'

interface VoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProject: any;
  campaignId: bigint;
  onVote: (projectId: bigint, token: string, amount: bigint) => Promise<void>;
  isVoting: boolean;
}

export default function VoteModal({
  isOpen,
  onClose,
  selectedProject,
  campaignId,
  isVoting
}: VoteModalProps) {
  const [voteAmount, setVoteAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('');
  const [error, setError] = useState('');
  const [voteSuccess, setVoteSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { vote, voteWithCelo } = useVote(import.meta.env.VITE_CONTRACT_V4);
  const { address } = useAccount();

  // Get token addresses from environment
  const celoTokenAddress = import.meta.env.VITE_CELO_TOKEN;
  const cUSDTokenAddress = import.meta.env.VITE_CUSD_TOKEN;

  // Get wallet balances
  const { data: celoBalance } = useBalance({
    address: address,
    token: celoTokenAddress as `0x${string}`,
  });

  const { data: cusdBalance } = useBalance({
    address: address,
    token: cUSDTokenAddress as `0x${string}`,
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setVoteAmount('');
      setSelectedToken(celoTokenAddress || '');
      setError('');
      setVoteSuccess(false);
      setIsProcessing(false);
    }
  }, [isOpen, celoTokenAddress]);

  const handleVote = async () => {
    if (!selectedProject || !voteAmount || !selectedToken) {
      setError('Please select a token and enter an amount');
      return;
    }

    try {
      setError('');
      setIsProcessing(true);
      const amount = parseEther(voteAmount);
      
      // Check if voting with CELO or ERC20 token
      const isNativeCelo = selectedToken.toLowerCase() === celoTokenAddress?.toLowerCase();
      
      if (isNativeCelo) {
        await voteWithCelo({
          campaignId: campaignId,
          projectId: BigInt(selectedProject.id),
          amount: amount
        });
      } else {
        await vote({
          campaignId: campaignId,
          projectId: BigInt(selectedProject.id),
          token: selectedToken as `0x${string}`,
          amount: amount
        });
      }
      
      setVoteSuccess(true);
      setIsProcessing(false);
      
      // Auto-close after 2 seconds on success
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (error: any) {
      console.error('Voting error:', error);
      setError(error.message || 'Voting failed! Please try again.');
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    // Don't allow closing while processing or voting
    if (isProcessing || isVoting) return;
    onClose();
  };

  const getSelectedBalance = () => {
    if (selectedToken === celoTokenAddress) {
      return celoBalance ? parseFloat(formatEther(celoBalance.value)).toFixed(2) : '0.00';
    } else if (selectedToken === cUSDTokenAddress) {
      return cusdBalance ? parseFloat(formatEther(cusdBalance.value)).toFixed(2) : '0.00';
    }
    return '0.00';
  };

  const getSelectedSymbol = () => {
    if (selectedToken === celoTokenAddress) return 'CELO';
    if (selectedToken === cUSDTokenAddress) return 'cUSD';
    return '';
  };

  if (!isOpen || !selectedProject) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-blue-200 relative overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 text-white relative">
          <button
            onClick={handleClose}
            disabled={isProcessing || isVoting}
            className={`absolute top-3 right-3 text-white hover:text-blue-200 transition-colors p-1 rounded-full hover:bg-white/10 ${
              (isProcessing || isVoting) ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="pr-8">
            <h3 className="text-lg font-bold mb-1 flex items-center">
              <Crown className="h-5 w-5 mr-2 text-yellow-300" />
              Cast Your Vote
            </h3>
            <p className="text-blue-100 text-sm flex items-center">
              <Ship className="h-3 w-3 mr-2" />
              Supporting: <span className="font-semibold ml-1">{selectedProject.name}</span>
            </p>
          </div>
        </div>
        
        <div className="p-6 space-y-5">
          {/* Success State */}
          {voteSuccess && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center rounded-b-2xl">
              <div className="text-center p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="h-6 w-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-emerald-600 mb-2">
                  Vote Cast Successfully! 🎉
                </h4>
                <p className="text-gray-600 text-sm">
                  Your vote has been registered
                </p>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
              <AlertCircle className="h-4 w-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Token selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              Select Token
            </label>
            
            <div className="grid grid-cols-2 gap-3">
              {/* CELO Token */}
              <button
                onClick={() => setSelectedToken(celoTokenAddress || '')}
                disabled={isProcessing || isVoting}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedToken === celoTokenAddress
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                } ${(isProcessing || isVoting) ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <div className="text-center">
                  <img 
                    src="/images/celo.png" 
                    alt="CELO"
                    className="w-8 h-8 mx-auto mb-2"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const nextElement = target.nextElementSibling as HTMLDivElement;
                      if (nextElement) {
                        nextElement.style.display = 'block';
                      }
                    }}
                  />
                  <div className="text-2xl mb-2 hidden">🪙</div>
                  <div className="font-semibold text-sm">CELO</div>
                  <div className="text-xs text-gray-500">
                    Balance: {celoBalance ? parseFloat(formatEther(celoBalance.value)).toFixed(2) : '0.00'}
                  </div>
                </div>
              </button>
              
              {/* cUSD Token */}
              <button
                onClick={() => setSelectedToken(cUSDTokenAddress || '')}
                disabled={isProcessing || isVoting}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedToken === cUSDTokenAddress
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                } ${(isProcessing || isVoting) ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <div className="text-center">
                  <img 
                    src="/images/cusd.png" 
                    alt="cUSD"
                    className="w-8 h-8 mx-auto mb-2"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const nextElement = target.nextElementSibling as HTMLDivElement;
                      if (nextElement) {
                        nextElement.style.display = 'block';
                      }
                    }}
                  />
                  <div className="text-2xl mb-2 hidden">💵</div>
                  <div className="font-semibold text-sm">cUSD</div>
                  <div className="text-xs text-gray-500">
                    Balance: {cusdBalance ? parseFloat(formatEther(cusdBalance.value)).toFixed(2) : '0.00'}
                  </div>
                </div>
              </button>
            </div>
          </div>
          
          {/* Amount input */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-800">
                Vote Amount
              </label>
              {selectedToken && (
                <div className="text-xs text-gray-600 flex items-center">
                  <Wallet className="h-3 w-3 mr-1" />
                  Available: {getSelectedBalance()} {getSelectedSymbol()}
                </div>
              )}
            </div>
            
            <div className="relative">
              <input
                type="number"
                value={voteAmount}
                onChange={(e) => setVoteAmount(e.target.value)}
                placeholder="0.00"
                disabled={isProcessing || isVoting}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                  (isProcessing || isVoting) ? 'cursor-not-allowed opacity-60' : ''
                }`}
                step="0.01"
                min="0"
                max={getSelectedBalance()}
              />
              <button
                onClick={() => setVoteAmount(getSelectedBalance())}
                disabled={isProcessing || isVoting}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 hover:text-blue-700 px-2 py-1 hover:bg-blue-50 rounded transition-colors"
              >
                MAX
              </button>
            </div>
            
            {/* Quick amount buttons */}
            <div className="flex space-x-2 mt-3">
              {['1', '5', '10', '25'].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setVoteAmount(amount)}
                  disabled={isProcessing || isVoting || parseFloat(amount) > parseFloat(getSelectedBalance())}
                  className={`flex-1 px-3 py-2 bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {amount}
                </button>
              ))}
            </div>
          </div>
          
          {/* Vote button */}
          <button
            onClick={handleVote}
            disabled={isProcessing || isVoting || !voteAmount || !selectedToken || voteSuccess || parseFloat(voteAmount) > parseFloat(getSelectedBalance())}
            className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
          >
            {isProcessing || isVoting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Casting Vote...</span>
              </>
            ) : voteSuccess ? (
              <>
                <Check className="h-5 w-5" />
                <span>Vote Cast!</span>
              </>
            ) : (
              <>
                <Vote className="h-5 w-5" />
                <span>Cast Vote</span>
              </>
            )}
          </button>

          {/* Processing status */}
          {(isProcessing || isVoting) && (
            <div className="text-center">
              <p className="text-xs text-blue-600">
                Processing transaction on blockchain...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}