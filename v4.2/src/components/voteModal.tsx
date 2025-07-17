'use client';

import { useState, useEffect, useMemo } from 'react';
import { parseEther, formatEther } from 'viem';
import { useAccount } from 'wagmi';
import { 
  X,
  AlertCircle,
  Loader2,
  Wallet,
  Check,
  Vote,
  Crown,
  ChevronDown,
  TrendingUp,
  DollarSign,
  Twitter,
  Share2,
  Info,
  Gift,
  Shield,
  Zap,
  Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useVote } from '@/hooks/useVotingMethods';
import { useTokenToCeloEquivalent } from '@/hooks/useVotingMethods';
import { useGoodDollarVoter } from '@/hooks/useGoodDollarVoter';
import goodDollarLogo from '/images/good.png';
import { publicClient } from '@/utils/clients';

interface VoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProject: any;
  campaignId: bigint;
  isVoting: boolean;
  campaignDetails?: any;
  allProjects?: any[];
  totalCampaignFunds?: number;
  onVoteSuccess?: () => void;
  onVoteSubmitted?: () => void;
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

// API Functions
const claimFreeVote = async (beneficiaryAddress: string, campaignId: bigint | string, projectId: string) => {
  const response = await fetch('https://auth.sovseas.xyz/api/claim-vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      beneficiaryAddress,
      campaignId: campaignId.toString(),
      projectId,
      data: {
        source: 'vote_modal',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        voteType: 'free_claim'
      }
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(data.error || 'Wallet not verified for free voting');
    } else if (response.status === 409) {
      throw new Error(data.error || 'Already claimed vote for this campaign');
    } else {
      throw new Error(data.error || 'Failed to claim free vote');
    }
  }

  return data;
};

export default function VoteModal({
  isOpen,
  onClose,
  selectedProject,
  campaignId,
  allProjects = [],
  totalCampaignFunds = 0,
  onVoteSuccess,
  onVoteSubmitted
}: VoteModalProps) {
  // Core state
  const [currentView, setCurrentView] = useState<'vote' | 'claim' | 'success'>('vote');
  const [voteAmount, setVoteAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Claim state
  const [isClaimProcessing, setIsClaimProcessing] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const [eligibilityStatus, setEligibilityStatus] = useState<{
    eligible: boolean;
    reason?: string;
    isVerified?: boolean;
  }>({ eligible: false });

  // Hooks
  const { vote, voteWithCelo, isPending, isSuccess, reset } = useVote(import.meta.env.VITE_CONTRACT_V4);
  const { address } = useAccount();
  const navigate = useNavigate();

  // Token addresses
  const celoTokenAddress = import.meta.env.VITE_CELO_TOKEN;
  const cUSDTokenAddress = import.meta.env.VITE_CUSD_TOKEN;
  const goodDollarTokenAddress = '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A';
  const goodDollarVoterAddress = import.meta.env.VITE_GOODDOLLAR_VOTER_CONTRACT;

  // Token balances
  const [balances, setBalances] = useState<{
    celo: bigint | null;
    cusd: bigint | null;
    goodDollar: bigint | null;
  }>({ celo: null, cusd: null, goodDollar: null });

  // GoodDollar integration
  const {
    getQuote: getGoodDollarQuote,
    swapAndVote: swapAndVoteGoodDollar,
    loading: goodDollarLoading
  } = useGoodDollarVoter({ contractAddress: goodDollarVoterAddress });

  const [goodDollarEstimate, setGoodDollarEstimate] = useState<string>('');

  // CELO equivalent for cUSD
  const { celoEquivalentFormatted } = useTokenToCeloEquivalent(
    import.meta.env.VITE_CONTRACT_V4 as `0x${string}`,
    cUSDTokenAddress as `0x${string}`,
    voteAmount ? parseEther(voteAmount) : 0n
  );

  // Fetch token balances
  useEffect(() => {
    async function fetchBalances() {
      if (!address) return;
      try {
        const [celo, cusd, gs] = await Promise.all([
          publicClient.getBalance({ address: address as `0x${string}` }),
          publicClient.readContract({
            address: cUSDTokenAddress as `0x${string}`,
            abi: [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] }],
            functionName: 'balanceOf',
            args: [address as `0x${string}`]
          }),
          publicClient.readContract({
            address: goodDollarTokenAddress as `0x${string}`,
            abi: [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] }],
            functionName: 'balanceOf',
            args: [address as `0x${string}`]
          })
        ]);
        
        setBalances({ celo: celo as bigint, cusd: cusd as bigint, goodDollar: gs as bigint });
      } catch (e) {
        setBalances({ celo: null, cusd: null, goodDollar: null });
      }
    }
    fetchBalances();
  }, [address, cUSDTokenAddress, goodDollarTokenAddress]);

  // Set default token
  useEffect(() => {
    if (isOpen && !selectedToken) {
      setSelectedToken(goodDollarTokenAddress);
    }
  }, [isOpen, goodDollarTokenAddress]);

  // Ensure default token is CELO when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedToken(celoTokenAddress || '');
    }
  }, [isOpen, celoTokenAddress]);

  // Handle GoodDollar estimates
  useEffect(() => {
    if (selectedToken === goodDollarTokenAddress && voteAmount && !goodDollarLoading) {
      (async () => {
        try {
          const estimate = await getGoodDollarQuote(parseEther(voteAmount));
          setGoodDollarEstimate(formatEther(estimate));
        } catch (e) {
          setGoodDollarEstimate('');
        }
      })();
    }
  }, [selectedToken, voteAmount, getGoodDollarQuote, goodDollarLoading]);

  // Check claim eligibility
  const checkClaimEligibility = async () => {
    if (!address) return;
    
    setIsCheckingEligibility(true);
    setClaimError('');
    
    try {
      const response = await fetch(`https://auth.sovseas.xyz/api/check-wallet?wallet=${encodeURIComponent(address)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check wallet verification');
      }
      
      setEligibilityStatus({
        eligible: data.verified === true,
        reason: data.message || (data.verified ? 'Wallet is verified and eligible' : 'Wallet is not verified'),
        isVerified: data.verified === true
      });
      
    } catch (error: any) {
      setEligibilityStatus({
        eligible: false,
        reason: error.message || 'Unable to verify wallet eligibility'
      });
      setClaimError('Unable to check verification status. Please try again.');
    } finally {
      setIsCheckingEligibility(false);
    }
  };

  // Handle free vote claim
  const handleClaimFreeVote = async () => {
    if (!address || !selectedProject?.id?.toString() || !campaignId?.toString()) {
      setClaimError('Please connect wallet and ensure project and campaign are selected');
      return;
    }

    setIsClaimProcessing(true);
    setClaimError('');

    try {
      await claimFreeVote(address, campaignId, selectedProject.id.toString());
      setCurrentView('success');
      setTimeout(() => {
        handleClose();
        onVoteSuccess?.();
      }, 3000);
    } catch (error: any) {
      let errorMessage = 'Failed to claim free vote. Please try again.';
      
      if (error.message.includes('not verified')) {
        errorMessage = 'Your wallet is not verified. Please verify your wallet with Self Protocol first.';
      } else if (error.message.includes('Already claimed')) {
        errorMessage = 'You have already claimed a free vote for this campaign.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setClaimError(errorMessage);
    } finally {
      setIsClaimProcessing(false);
    }
  };

  // Handle vote submission
  const handleVote = async () => {
    if (!selectedProject || !voteAmount || !selectedToken) {
      setError('Please select a token and enter an amount');
      return;
    }

    const amountValue = parseFloat(voteAmount);
    if (amountValue <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (amountValue > parseFloat(getSelectedBalance())) {
      setError('Insufficient balance for this amount');
      return;
    }

    try {
      setError('');
      setIsProcessing(true);
      
      const amount = parseEther(voteAmount);
      const isNativeCelo = selectedToken.toLowerCase() === celoTokenAddress?.toLowerCase();
      
      let tx;
      if (isNativeCelo) {
        tx = await voteWithCelo({
          campaignId: campaignId,
          projectId: selectedProject.id.toString(),
          amount: amount
        });
      } else if (selectedToken === cUSDTokenAddress) {
        tx = await vote({
          campaignId: campaignId,
          projectId: selectedProject.id.toString(),
          token: selectedToken as `0x${string}`,
          amount: amount
        });
      } else if (selectedToken === goodDollarTokenAddress) {
        const minCeloOut = goodDollarEstimate ? parseEther(goodDollarEstimate) : 0n;
        tx = await swapAndVoteGoodDollar(
          campaignId,
          BigInt(selectedProject.id),
          amount,
          minCeloOut
        );
      }

      onVoteSubmitted?.();
      
    } catch (error: any) {
      setIsProcessing(false);
      setCountdown(0);
      
      let errorMessage = 'Voting failed! Please try again.';
      
      if (error?.message) {
        if (error.message.includes('user rejected')) {
          errorMessage = 'Transaction was rejected. No funds were spent.';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient balance to complete this transaction.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    }
  };

  // Handle vote success
  useEffect(() => {
    if (isSuccess && !isProcessing) return;
    
    if (isSuccess && isProcessing) {
      setCurrentView('success');
      setIsProcessing(false);
      setCountdown(0);
      
      onVoteSuccess?.();
      
      setTimeout(() => {
        handleClose();
      }, 3000);
    }
  }, [isSuccess, isProcessing, onVoteSuccess]);

  // Transaction timeout
  useEffect(() => {
    if (isProcessing && !isSuccess) {
      setCountdown(12);
      
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            onClose();
            navigate(`/explorers/campaign/${campaignId}`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isProcessing, isSuccess, onClose, navigate, campaignId]);

  // Reset on modal close
  useEffect(() => {
    if (!isOpen) {
      setCurrentView('vote');
      setVoteAmount('');
      setSelectedToken(goodDollarTokenAddress);
      setError('');
      setIsProcessing(false);
      setShowTokenDropdown(false);
      setCountdown(0);
      setIsClaimProcessing(false);
      setClaimError('');
      setEligibilityStatus({ eligible: false });
      setIsCheckingEligibility(false);
      setGoodDollarEstimate('');
      reset();
    }
  }, [isOpen, goodDollarTokenAddress, reset]);

  // Utility functions
  const getSelectedBalance = () => {
    if (selectedToken === celoTokenAddress) {
      return balances.celo !== null ? parseFloat(formatEther(balances.celo)).toFixed(2) : '0.00';
    } else if (selectedToken === cUSDTokenAddress) {
      return balances.cusd !== null ? parseFloat(formatEther(balances.cusd)).toFixed(2) : '0.00';
    } else if (selectedToken === goodDollarTokenAddress) {
      return balances.goodDollar !== null ? parseFloat(formatEther(balances.goodDollar)).toFixed(2) : '0.00';
    }
    return '0.00';
  };

  const getSelectedSymbol = () => {
    if (selectedToken === celoTokenAddress) return 'CELO';
    if (selectedToken === cUSDTokenAddress) return 'cUSD';
    if (selectedToken === goodDollarTokenAddress) return 'G$';
    return '';
  };

  // Calculate voting simulation
  const votingSimulation = useMemo(() => {
    if (!voteAmount || !allProjects?.length || !selectedProject) return null;

    const voteValue = parseFloat(voteAmount);
    if (voteValue <= 0) return null;

    let effectiveVoteValue = voteValue;
    if (selectedToken === cUSDTokenAddress) {
      effectiveVoteValue = parseFloat(celoEquivalentFormatted);
    } else if (selectedToken === goodDollarTokenAddress && goodDollarEstimate) {
      effectiveVoteValue = parseFloat(goodDollarEstimate);
    }

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

    const totalQuadraticWeight = simulations.reduce((sum, sim) => sum + sim.quadraticWeight, 0);
    const availableFunds = totalCampaignFunds * 0.7;
    
    simulations.forEach(sim => {
      if (totalQuadraticWeight > 0) {
        sim.estimatedShare = (sim.quadraticWeight / totalQuadraticWeight) * 100;
        sim.estimatedPayout = (sim.quadraticWeight / totalQuadraticWeight) * availableFunds;
      }
    });

    return simulations.find(sim => sim.projectId === selectedProject?.id?.toString());
  }, [voteAmount, allProjects, selectedProject, totalCampaignFunds, selectedToken, celoEquivalentFormatted, cUSDTokenAddress, goodDollarTokenAddress, goodDollarEstimate]);

  const handleClose = () => {
    setCurrentView('vote');
    setVoteAmount('');
    setSelectedToken(goodDollarTokenAddress || '');
    setError('');
    setIsProcessing(false);
    setShowTokenDropdown(false);
    reset();
    onClose();
  };

  if (!isOpen || !selectedProject) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 relative overflow-hidden max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20"></div>
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 z-10"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="relative z-10">
            <div className="flex items-center mb-2">
              <Crown className="h-6 w-6 mr-2 text-yellow-300" />
              <h3 className="text-xl font-bold">Cast Your Vote</h3>
            </div>
            <p className="text-blue-100 text-sm mb-4">
              Supporting: <span className="font-semibold text-yellow-200">{selectedProject.name}</span>
            </p>
            
            {currentView === 'vote' && (
              <button
                onClick={() => setCurrentView('claim')}
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center"
              >
                <Gift className="h-4 w-4 mr-2" />
                Claim Free Vote
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          
          {/* Success View */}
          {currentView === 'success' && (
            <div className="text-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 text-2xl">🎉</div>
              </div>
              
              <div>
                <h4 className="text-2xl font-bold text-emerald-600 mb-2">
                  Vote Cast Successfully!
                </h4>
                <p className="text-gray-600 mb-6">
                  Your vote has been registered for <span className="font-semibold text-blue-600">{selectedProject.name}</span>
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <h5 className="font-semibold text-blue-800 mb-3 flex items-center justify-center">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Your Support
                </h5>
                <div className="flex gap-3">
                  <a
                    href={`https://twitter.com/intent/tweet?text=Just voted for ${selectedProject.name} on @SovSeas! 🗳️✨ Community funding at its finest! %23CommunityFunding %23SovSeas`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#1DA1F2] text-white rounded-xl hover:bg-[#1a8cd8] transition-colors font-medium"
                  >
                    <Twitter className="h-4 w-4" />
                    Share
                  </a>
                  <button
                    onClick={handleClose}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Claim View */}
          {currentView === 'claim' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Claim Free Vote</h3>
                <p className="text-gray-600">Verified users get one free vote per campaign</p>
              </div>

              {isCheckingEligibility && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center">
                  <Loader2 className="h-5 w-5 text-blue-600 mr-3 animate-spin" />
                  <span className="text-blue-700 font-medium">Checking verification status...</span>
                </div>
              )}

              {!isCheckingEligibility && eligibilityStatus.eligible !== undefined && (
                <div className={`border-2 rounded-xl p-4 ${
                  eligibilityStatus.eligible 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center mb-2">
                    {eligibilityStatus.eligible ? (
                      <>
                        <Check className="h-5 w-5 text-green-600 mr-2" />
                        <span className="font-semibold text-green-800">Eligible for Free Vote</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                        <span className="font-semibold text-red-800">Not Eligible</span>
                      </>
                    )}
                  </div>
                  <p className={`text-sm ${
                    eligibilityStatus.eligible ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {eligibilityStatus.reason}
                  </p>
                </div>
              )}

              {claimError && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-red-800">{claimError}</p>
                </div>
              )}

              {eligibilityStatus.eligible && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
                  <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                    <Gift className="h-4 w-4 mr-2" />
                    Free Vote Details
                  </h4>
                  <div className="space-y-2 text-sm text-green-700">
                    <div className="flex justify-between">
                      <span>Vote Amount:</span>
                      <span className="font-semibold">1.0 CELO</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Project:</span>
                      <span className="font-semibold">{selectedProject.name}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {!eligibilityStatus.eligible && !isCheckingEligibility && (
                  <button
                    onClick={checkClaimEligibility}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center font-medium"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Check Eligibility
                  </button>
                )}
                
                {eligibilityStatus.eligible && (
                  <button
                    onClick={handleClaimFreeVote}
                    disabled={isClaimProcessing}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium"
                  >
                    {isClaimProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Claiming...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Claim Now
                      </>
                    )}
                  </button>
                )}
                
                <button
                  onClick={() => setCurrentView('vote')}
                  disabled={isClaimProcessing}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Vote View */}
          {currentView === 'vote' && (
            <div className="space-y-6">
              
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              )}

              {(isProcessing || isPending) && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                  <div className="flex items-center mb-3">
                    <Loader2 className="h-5 w-5 text-amber-600 mr-3 animate-spin" />
                    <p className="text-sm font-medium text-amber-800">Processing transaction...</p>
                  </div>
                  {countdown > 0 && (
                    <div>
                      <p className="text-xs text-amber-700 mb-2">
                        Redirecting to campaign page in {countdown}s if no confirmation
                      </p>
                      <div className="bg-amber-200 rounded-full h-2">
                        <div 
                          className="bg-amber-500 h-2 rounded-full transition-all duration-1000"
                          style={{ width: `${(countdown / 12) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Impact Preview */}
              {votingSimulation && voteAmount && parseFloat(voteAmount) > 0 && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-green-800 flex items-center">
                      <Target className="h-4 w-4 mr-2" />
                      Estimated Impact </h4>
                    <div className="text-sm text-green-600 font-medium">
                      +{selectedToken === cUSDTokenAddress 
                        ? Number(celoEquivalentFormatted).toFixed(2)
                        : selectedToken === goodDollarTokenAddress
                          ? voteAmount // or you could use goodDollarEstimate if you want
                          : parseFloat(voteAmount).toFixed(1)} votes
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/70 rounded-lg p-3">
                      <div className="text-gray-600 text-xs font-medium">New Total Votes</div>
                      <div className="font-bold text-green-700 text-lg">
                        {votingSimulation.totalVotes.toFixed(1)}
                      </div>
                    </div>
                    <div className="bg-white/70 rounded-lg p-3">
                      <div className="text-gray-600 text-xs font-medium">Funding Share</div>
                      <div className="font-bold text-green-700 text-lg">
                        {votingSimulation.estimatedShare.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  {/* Estimated Funding */}
                  {votingSimulation.estimatedPayout > 0 && (
                    <div className="mt-3 bg-white/70 rounded-lg p-3">
                      <div className="text-gray-600 text-xs">Estimated Funding</div>
                      <div className="font-bold text-green-700 flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        {votingSimulation.estimatedPayout.toFixed(1)} CELO
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Token Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  Select Token
                </label>
                
                <div className="relative">
                  <button
                    onClick={() => setShowTokenDropdown(!showTokenDropdown)}
                    disabled={isProcessing || isPending}
                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                      selectedToken
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    } ${(isProcessing || isPending) ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <div className="flex items-center space-x-3">
                      {selectedToken === celoTokenAddress && (
                        <img 
                          src="/images/celo.png" 
                          alt="CELO"
                          className="w-8 h-8 rounded-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      )}
                      {selectedToken === cUSDTokenAddress && (
                        <img 
                          src="/images/cusd.png" 
                          alt="cUSD"
                          className="w-8 h-8 rounded-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      )}
                      {selectedToken === goodDollarTokenAddress && (
                        <img 
                          src={goodDollarLogo} 
                          alt="GoodDollar"
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <div>
                        <div className="font-semibold text-left">
                          {selectedToken === celoTokenAddress ? 'CELO' : 
                           selectedToken === cUSDTokenAddress ? 'cUSD' : 
                           selectedToken === goodDollarTokenAddress ? 'GoodDollar' : 
                           'Select Token'}
                        </div>
                        {selectedToken && (
                          <div className="text-xs text-gray-500 text-left">
                            Balance: {getSelectedBalance()} {getSelectedSymbol()}
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronDown className={`h-5 w-5 transition-transform ${showTokenDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showTokenDropdown && (
                    <div className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl">
                      <div className="p-2">
                        {/* CELO Option */}
                        <button
                          onClick={() => {
                            setSelectedToken(celoTokenAddress || '');
                            setShowTokenDropdown(false);
                          }}
                          className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-blue-50 rounded-lg text-left transition-colors"
                        >
                          <img 
                            src="/images/celo.png" 
                            alt="CELO"
                            className="w-8 h-8 rounded-full"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                          <div>
                            <div className="font-semibold">CELO</div>
                            <div className="text-xs text-gray-500">
                              Balance: {balances.celo !== null ? parseFloat(formatEther(balances.celo)).toFixed(2) : '0.00'}
                            </div>
                          </div>
                        </button>
                        
                        {/* cUSD Option */}
                        <button
                          onClick={() => {
                            setSelectedToken(cUSDTokenAddress || '');
                            setShowTokenDropdown(false);
                          }}
                          className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-blue-50 rounded-lg text-left transition-colors"
                        >
                          <img 
                            src="/images/cusd.png" 
                            alt="cUSD"
                            className="w-8 h-8 rounded-full"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                          <div>
                            <div className="font-semibold">cUSD</div>
                            <div className="text-xs text-gray-500">
                              Balance: {balances.cusd !== null ? parseFloat(formatEther(balances.cusd)).toFixed(2) : '0.00'}
                            </div>
                          </div>
                        </button>
                        
                        {/* GoodDollar Option */}
                        <button
                          onClick={() => {
                            setSelectedToken(goodDollarTokenAddress);
                            setShowTokenDropdown(false);
                          }}
                          className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-blue-50 rounded-lg text-left transition-colors"
                        >
                          <img src={goodDollarLogo} alt="GoodDollar" className="w-8 h-8 rounded-full" />
                          <div>
                            <div className="font-semibold">GoodDollar</div>
                            <div className="text-xs text-gray-500">
                              Balance: {balances.goodDollar !== null ? parseFloat(formatEther(balances.goodDollar)).toFixed(2) : '0.00'}
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Amount Input */}
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
                    disabled={isProcessing || isPending}
                    className={`w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg font-semibold ${
                      (isProcessing || isPending) ? 'cursor-not-allowed opacity-60' : ''
                    }`}
                    step="0.01"
                    min="0"
                    max={getSelectedBalance()}
                  />
                  <button
                    onClick={() => setVoteAmount(getSelectedBalance())}
                    disabled={isProcessing || isPending}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 hover:text-blue-700 px-3 py-1 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                  >
                    MAX
                  </button>
                </div>

                {/* Token Conversion Info */}
                {selectedToken === cUSDTokenAddress && voteAmount && parseFloat(voteAmount) > 0 && (
                  <div className="mt-2 text-sm text-gray-600 flex items-center bg-gray-50 rounded-lg p-2">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    <span>≈ {Number(celoEquivalentFormatted).toFixed(2)} CELO voting power</span>
                  </div>
                )}
                
                {selectedToken === goodDollarTokenAddress && voteAmount && parseFloat(voteAmount) > 0 && goodDollarEstimate && (
                  <div className="mt-2 text-sm text-gray-600 flex items-center bg-gray-50 rounded-lg p-2">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    <span>≈ {goodDollarEstimate} CELO voting power</span>
                  </div>
                )}
                
                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {['1', '5', '10', '25'].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setVoteAmount(amount)}
                      disabled={isProcessing || isPending || parseFloat(amount) > parseFloat(getSelectedBalance())}
                      className={`px-3 py-2 bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {amount}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Main Vote Button */}
                <button
                  onClick={handleVote}
                  disabled={
                    isProcessing || 
                    isPending || 
                    !voteAmount || 
                    !selectedToken || 
                    parseFloat(voteAmount) > parseFloat(getSelectedBalance()) || 
                    parseFloat(voteAmount) <= 0
                  }
                  className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
                >
                  {isProcessing || isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Vote className="h-5 w-5" />
                      <span>
                        Cast Vote • {parseFloat(voteAmount || '0').toFixed(1)} {getSelectedSymbol()}
                        {selectedToken === goodDollarTokenAddress && goodDollarEstimate && (
                          <span className="text-sm opacity-75"> (≈{parseFloat(goodDollarEstimate).toFixed(2)} CELO)</span>
                        )}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Info Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start">
                  <Info className="h-4 w-4 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-700">
                    <p className="font-medium mb-1">Quadratic Voting</p>
                    <p>Your voting power is calculated using quadratic funding - the square root of your contribution amount. This helps ensure fair distribution across all projects.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}