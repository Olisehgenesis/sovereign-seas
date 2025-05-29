'use client';

import { useState, useEffect, useMemo } from 'react';
import { parseEther, formatEther } from 'viem';
import { useAccount, useBalance } from 'wagmi';
import { 
  X,
  AlertCircle,
  Loader2,
  Wallet,
  Check,
  Vote,
  Crown,
  Ship,
  Calculator,
  ChevronDown,
  ChevronUp,
  TrendingUp,

  Target,
  DollarSign,
  Twitter,
  Share2
} from 'lucide-react';

import { useVote } from '@/hooks/useVotingMethods';
import { useTokenToCeloEquivalent } from '@/hooks/useVotingMethods';

interface VoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProject: any;
  campaignId: bigint;
  isVoting: boolean;
  campaignDetails?: any;
  allProjects?: any[];
  totalCampaignFunds?: number;
}

interface ProjectVoteSimulation {
  projectId: string;
  currentVotes: number;
  newVotes: number;
  totalVotes: number;
  quadraticWeight: number;
  estimatedShare: number;
  estimatedPayout: number;
}

export default function VoteModal({
  isOpen,
  onClose,
  selectedProject,
  campaignId,
  isVoting,
  campaignDetails,
  allProjects = [],
  totalCampaignFunds = 0
}: VoteModalProps) {
  const [voteAmount, setVoteAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('');
  const [error, setError] = useState('');
  const [voteSuccess, setVoteSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMatchingSimulator, setShowMatchingSimulator] = useState(false);
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);
  
  const { vote, voteWithCelo, isPending, isSuccess } = useVote(import.meta.env.VITE_CONTRACT_V4);
  const { address } = useAccount();
  console.log(campaignDetails);

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

  // Get CELO equivalent for cUSD votes
  const { celoEquivalentFormatted } = useTokenToCeloEquivalent(
    import.meta.env.VITE_CONTRACT_V4 as `0x${string}`,
    cUSDTokenAddress as `0x${string}`,
    voteAmount ? parseEther(voteAmount) : 0n
  );

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setVoteAmount('');
      setSelectedToken(celoTokenAddress || '');
      setError('');
      setVoteSuccess(false);
      setIsProcessing(false);
      setShowMatchingSimulator(false);
      setShowTokenDropdown(false);
    }
  }, [isOpen, celoTokenAddress]);

  // Calculate quadratic voting simulation
  const votingSimulation = useMemo(() => {
    if (!voteAmount || !allProjects?.length || !selectedProject) {
      return null;
    }

    const voteValue = parseFloat(voteAmount);
    if (voteValue <= 0) return null;

    // Convert cUSD amount to CELO equivalent for simulation
    const effectiveVoteValue = selectedToken === cUSDTokenAddress 
      ? parseFloat(celoEquivalentFormatted) 
      : voteValue;

    // Create simulation data for all projects
    const simulations: ProjectVoteSimulation[] = allProjects.map(project => {
      const currentVotes = Number(formatEther(project.voteCount || 0n));
      const isSelectedProject = project.id === selectedProject.id;
      const newVotes = isSelectedProject ? effectiveVoteValue : 0;
      const totalVotes = currentVotes + newVotes;
      
      return {
        projectId: project.id?.toString() || '',
        currentVotes,
        newVotes,
        totalVotes,
        quadraticWeight: Math.sqrt(totalVotes),
        estimatedShare: 0,
        estimatedPayout: 0
      };
    });

    // Calculate total quadratic weight
    const totalQuadraticWeight = simulations.reduce((sum, sim) => sum + sim.quadraticWeight, 0);

    // Calculate estimated shares and payouts
    const availableFunds = totalCampaignFunds * 0.7; // Assuming 30% total fees (15% platform + 15% admin average)
    
    simulations.forEach(sim => {
      if (totalQuadraticWeight > 0) {
        sim.estimatedShare = (sim.quadraticWeight / totalQuadraticWeight) * 100;
        sim.estimatedPayout = (sim.quadraticWeight / totalQuadraticWeight) * availableFunds;
      }
    });

    // Sort by total votes descending
    simulations.sort((a, b) => b.totalVotes - a.totalVotes);

    return simulations;
  }, [voteAmount, allProjects, selectedProject, totalCampaignFunds, selectedToken, celoEquivalentFormatted]);

  const selectedProjectSimulation = useMemo(() => {
    return votingSimulation?.find(sim => sim.projectId === selectedProject?.id?.toString());
  }, [votingSimulation, selectedProject]);

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

      // Wait for transaction to be mined
      if (isSuccess) {
        setVoteSuccess(true);
        setIsProcessing(false);
        
        // Auto-close after 2 seconds on success
        setTimeout(() => {
          onClose();
        }, 2000);
      }
      
    } catch (error: any) {
      console.error('Voting error:', error);
      setError(error.message || 'Voting failed! Please try again.');
      setIsProcessing(false);
    }
  };

  // Update processing state based on transaction status
  useEffect(() => {
    if (isPending) {
      setIsProcessing(true);
    } else if (isSuccess) {
      setVoteSuccess(true);
      setIsProcessing(false);
      
      // Auto-close after 2 seconds on success
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  }, [isPending, isSuccess, onClose]);

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
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-blue-200 relative overflow-hidden max-h-[90vh] overflow-y-auto">
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
              Supporting: <span className="font-semibold ml-1 text-yellow-200">{selectedProject.name}</span>
            </p>
          </div>
        </div>
        
        <div className="p-6 space-y-5">
          {/* Success State */}
          {voteSuccess && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-b-2xl">
              <div className="text-center p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="h-6 w-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-emerald-600 mb-2">
                  Vote Cast Successfully! 🎉
                </h4>
                <p className="text-gray-600 text-sm mb-6">
                  Your vote has been registered for <span className="font-semibold">{selectedProject.name}</span>
                </p>

                {/* Share Section */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100 max-w-sm">
                  <h5 className="font-semibold text-blue-800 mb-3 flex items-center justify-center">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Your Support
                  </h5>
                  <p className="text-sm text-blue-600 mb-4">
                    Hey, this is what Community Funding is all about! I just voted for {selectedProject.name} on @SovSeas
                  </p>
                  <div className="flex gap-2">
                    <a
                      href={`https://twitter.com/intent/tweet?text=Hey, this is what Community Funding is all about! I just voted for ${selectedProject.name} on @SovSeas`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#1DA1F2] text-white rounded-lg hover:bg-[#1a8cd8] transition-colors"
                    >
                      <Twitter className="h-4 w-4" />
                      Share on Twitter
                    </a>
                    <button
                      onClick={onClose}
                      className="flex-1 px-4 py-2 bg-white border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
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

          {/* Estimated Impact Section */}
          {selectedProjectSimulation && voteAmount && parseFloat(voteAmount) > 0 && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-green-800 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Estimated Impact
                </h4>
                <div className="text-sm text-green-600 font-medium">
                  +{selectedToken === cUSDTokenAddress 
                    ? Number(celoEquivalentFormatted).toFixed(2)
                    : parseFloat(voteAmount).toFixed(1)} votes
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white/70 rounded-lg p-3">
                  <div className="text-gray-600 text-xs">New Total Votes</div>
                  <div className="font-bold text-green-700">
                    {selectedProjectSimulation.totalVotes.toFixed(1)}
                  </div>
                </div>
                <div className="bg-white/70 rounded-lg p-3">
                  <div className="text-gray-600 text-xs">Est. Payout Share</div>
                  <div className="font-bold text-green-700">
                    {selectedProjectSimulation.estimatedShare.toFixed(1)}%
                  </div>
                </div>
              </div>
              
              {selectedProjectSimulation.estimatedPayout > 0 && (
                <div className="mt-3 bg-white/70 rounded-lg p-3">
                  <div className="text-gray-600 text-xs">Estimated Funding</div>
                  <div className="font-bold text-green-700 flex items-center">
                    <DollarSign className="h-4 w-4 mr-1" />
                    {selectedProjectSimulation.estimatedPayout.toFixed(1)} CELO
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Matching Simulator Toggle */}
          <div className="border border-blue-200 rounded-lg">
            <button
              onClick={() => setShowMatchingSimulator(!showMatchingSimulator)}
              className="w-full p-3 flex items-center justify-between text-left hover:bg-blue-50 transition-colors rounded-lg"
            >
              <div className="flex items-center">
                <Calculator className="h-4 w-4 text-blue-600 mr-2" />
                <span className="font-medium text-blue-800">Quadratic Matching Simulator</span>
              </div>
              {showMatchingSimulator ? (
                <ChevronUp className="h-4 w-4 text-blue-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-blue-600" />
              )}
            </button>
            
            {showMatchingSimulator && votingSimulation && (
              <div className="border-t border-blue-200 p-4 bg-blue-50/50">
                <div className="mb-4">
                  <h5 className="font-semibold text-blue-800 mb-2 flex items-center">
                    <Target className="h-4 w-4 mr-2" />
                    Vote Distribution Simulation
                  </h5>
                  <p className="text-xs text-blue-600 mb-3">
                    Shows how funds would be distributed using quadratic voting (√votes)
                  </p>
                </div>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {votingSimulation.slice(0, 8).map((sim, index) => {
                    const isSelected = sim.projectId === selectedProject.id?.toString();
                    return (
                      <div
                        key={sim.projectId}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                          isSelected 
                            ? 'bg-green-100 border border-green-300' 
                            : 'bg-white border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-400 text-yellow-800' :
                            index === 1 ? 'bg-gray-400 text-gray-800' :
                            index === 2 ? 'bg-orange-400 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="truncate">
                            <div className={`font-medium truncate ${isSelected ? 'text-green-800' : 'text-gray-800'}`}>
                              {allProjects.find(p => p.id?.toString() === sim.projectId)?.name || `Project ${sim.projectId}`}
                            </div>
                            <div className="text-gray-600">
                              {sim.currentVotes.toFixed(1)} → {sim.totalVotes.toFixed(1)} votes
                              {sim.newVotes > 0 && (
                                <span className="text-green-600 font-medium"> (+{sim.newVotes.toFixed(1)})</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={`font-bold ${isSelected ? 'text-green-700' : 'text-gray-700'}`}>
                            {sim.estimatedShare.toFixed(1)}%
                          </div>
                          <div className="text-gray-600">
                            {sim.estimatedPayout.toFixed(1)} CELO
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="text-xs text-blue-600">
                    <strong>Note:</strong> Estimates based on current votes and quadratic distribution. 
                    Actual payouts depend on final campaign results and may include fees.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Token selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">
              Select Token
            </label>
            
            <div className="relative">
              <button
                onClick={() => setShowTokenDropdown(!showTokenDropdown)}
                disabled={isProcessing || isVoting}
                className={`w-full p-3 rounded-lg border-2 transition-all flex items-center justify-between ${
                  selectedToken
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                } ${(isProcessing || isVoting) ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  {selectedToken === celoTokenAddress ? (
                    <img 
                      src="/images/celo.png" 
                      alt="CELO"
                      className="w-6 h-6"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const nextElement = target.nextElementSibling as HTMLDivElement;
                        if (nextElement) {
                          nextElement.style.display = 'block';
                        }
                      }}
                    />
                  ) : selectedToken === cUSDTokenAddress ? (
                    <img 
                      src="/images/cusd.png" 
                      alt="cUSD"
                      className="w-6 h-6"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const nextElement = target.nextElementSibling as HTMLDivElement;
                        if (nextElement) {
                          nextElement.style.display = 'block';
                        }
                      }}
                    />
                  ) : null}
                  <div className="text-2xl hidden">🪙</div>
                  <span className="font-medium">
                    {selectedToken === celoTokenAddress ? 'CELO' : 
                     selectedToken === cUSDTokenAddress ? 'cUSD' : 
                     'Select Token'}
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${showTokenDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showTokenDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setSelectedToken(celoTokenAddress || '');
                        setShowTokenDropdown(false);
                      }}
                      className="w-full px-4 py-2 flex items-center space-x-3 hover:bg-blue-50 text-left"
                    >
                      <img 
                        src="/images/celo.png" 
                        alt="CELO"
                        className="w-6 h-6"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const nextElement = target.nextElementSibling as HTMLDivElement;
                          if (nextElement) {
                            nextElement.style.display = 'block';
                          }
                        }}
                      />
                      <div className="text-2xl hidden">🪙</div>
                      <div>
                        <div className="font-medium">CELO</div>
                        <div className="text-xs text-gray-500">
                          Balance: {celoBalance ? parseFloat(formatEther(celoBalance.value)).toFixed(2) : '0.00'}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedToken(cUSDTokenAddress || '');
                        setShowTokenDropdown(false);
                      }}
                      className="w-full px-4 py-2 flex items-center space-x-3 hover:bg-blue-50 text-left"
                    >
                      <img 
                        src="/images/cusd.png" 
                        alt="cUSD"
                        className="w-6 h-6"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const nextElement = target.nextElementSibling as HTMLDivElement;
                          if (nextElement) {
                            nextElement.style.display = 'block';
                          }
                        }}
                      />
                      <div className="text-2xl hidden">💵</div>
                      <div>
                        <div className="font-medium">cUSD</div>
                        <div className="text-xs text-gray-500">
                          Balance: {cusdBalance ? parseFloat(formatEther(cusdBalance.value)).toFixed(2) : '0.00'}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
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

            {/* Show CELO equivalent when voting with cUSD */}
            {selectedToken === cUSDTokenAddress && voteAmount && parseFloat(voteAmount) > 0 && (
              <div className="mt-2 text-xs text-gray-600 flex items-center">
                <span className="mr-1">≈</span>
                <span>{Number(celoEquivalentFormatted).toFixed(2)} CELO</span>
              </div>
            )}
            
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
                <span>Cast Vote for {selectedProject.name}</span>
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