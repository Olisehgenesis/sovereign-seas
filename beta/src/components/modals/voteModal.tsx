'use client';

import { useState, useEffect } from 'react';
import { parseEther, formatEther } from 'viem';
import { useAccount } from 'wagmi';
import { 
  AlertCircle,
  Loader2,
  Wallet,
  Check,
  TrendingUp,
  Twitter,
  Share2,
  Gift,
  Shield,
  Zap,
  ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCampaignRoute } from '@/utils/hashids';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { useVote } from '@/hooks/useVotingMethods';
import { useTokenToCeloEquivalent } from '@/hooks/useVotingMethods';
import { useGoodDollarVoter } from '@/hooks/useGoodDollarVoter';
import goodDollarLogo from '/images/good.png';
import { usePublicClient } from 'wagmi';
import { getGoodDollarVoterAddress, getMainContractAddress } from '@/utils/contractConfig';
import { supportedTokens } from '@/hooks/useSupportedTokens';

// Token data - moved inside component to use current environment

// Token Selector Component
interface TokenSelectorProps {
  selectedToken: string;
  onTokenSelect: (tokenAddress: string) => void;
  disabled?: boolean;
  tokenBalances: Array<{
    address: string;
    symbol: string;
    name: string;
    balance: bigint;
    formattedBalance: string;
  }>;
}

const TokenSelector: React.FC<TokenSelectorProps> = ({ selectedToken, onTokenSelect, disabled, tokenBalances }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Token data - using supportedTokens from hook (same as wallet modal)
  const tokens = supportedTokens.map(token => ({
    address: token.address,
    name: token.name,
    symbol: token.symbol,
    logo: token.symbol === 'CELO' ? '/images/celo.png' : 
          token.symbol === 'cUSD' ? '/images/cusd.png' : 
          goodDollarLogo
  }));
  
  const selectedTokenData = tokens.find(token => token.address === selectedToken);
  
  const getBalance = (tokenAddress: string) => {
    const tokenBalance = tokenBalances.find(tb => tb.address.toLowerCase() === tokenAddress.toLowerCase());
    return tokenBalance ? tokenBalance.formattedBalance : '0.00';
  };

  return (
    <>
      {/* Token Button */}
      <button
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className={`w-full h-12 rounded-xl border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 transition-colors flex items-center justify-between px-4 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        {selectedTokenData ? (
          <div className="flex items-center space-x-3">
            <img 
              src={selectedTokenData.logo} 
              alt={selectedTokenData.symbol}
              className="w-6 h-6 rounded-full"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            <span className="font-semibold text-gray-900">{selectedTokenData.symbol}</span>
          </div>
        ) : (
          <span className="font-semibold text-gray-500">Select token</span>
        )}
        <ChevronDown className="h-5 w-5 text-gray-400" />
      </button>

      {/* Token Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
          </DialogHeader>
          
          <div className="mt-4 space-y-2">
            {tokens.map((token) => (
              <button
                key={token.address}
                onClick={() => {
                  onTokenSelect(token.address);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                  selectedToken === token.address ? 'bg-blue-50 border border-blue-200' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <img 
                    src={token.logo} 
                    alt={token.symbol}
                    className="w-8 h-8 rounded-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">{token.name}</div>
                    <div className="text-sm text-gray-500">{token.symbol}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Balance</div>
                  <div className="font-semibold text-gray-900">{getBalance(token.address)}</div>
                  {selectedToken === token.address && (
                    <Check className="h-4 w-4 text-blue-600 mt-1" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

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

// interface ProjectVoteSimulation {
//   projectId: string;
//   currentVotes: number;
//   newVotes: number;
//   totalVotes: number;
//   quadraticWeight: number;
//   estimatedShare: number;
//   estimatedPayout: number;
// }

// API Functions
const claimFreeVote = async (beneficiaryAddress: string, campaignId: bigint | string, projectId: string) => {
  const response = await fetch('https://selfauth.vercel.app/api/claim-vote', {
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
  onVoteSuccess,
  onVoteSubmitted
}: VoteModalProps) {
  // Core state
  const [currentView, setCurrentView] = useState<'vote' | 'claim' | 'success'>('vote');
  const [voteAmount, setVoteAmount] = useState('1');
  const [percentage, setPercentage] = useState([10]);
  const [selectedToken, setSelectedToken] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
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
  const { vote, voteWithCelo, isPending, isSuccess, reset } = useVote(getMainContractAddress());
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const navigate = useNavigate();

  // Token addresses - using supportedTokens
  const celoToken = supportedTokens.find(t => t.symbol === 'CELO');
  const cUSDToken = supportedTokens.find(t => t.symbol === 'cUSD');
  const goodDollarToken = supportedTokens.find(t => t.symbol === 'G$');
  const goodDollarVoterAddress = getGoodDollarVoterAddress();
  
  // Debug: Log token addresses to verify they're using testnet
  console.log('Token addresses:', {
    celo: celoToken?.address,
    cusd: cUSDToken?.address,
    goodDollar: goodDollarToken?.address,
    environment: import.meta.env.VITE_ENV
  });

  // Token balances - using same structure as wallet modal
  const [tokenBalances, setTokenBalances] = useState<Array<{
    address: string;
    symbol: string;
    name: string;
    balance: bigint;
    formattedBalance: string;
  }>>([]);

  // GoodDollar integration
  const {
    getQuote: getGoodDollarQuote,
    swapAndVote: swapAndVoteGoodDollar,
    loading: goodDollarLoading
  } = useGoodDollarVoter({ contractAddress: goodDollarVoterAddress });

  const [goodDollarEstimate, setGoodDollarEstimate] = useState<string>('');

  // CELO equivalent for cUSD
  const { celoEquivalentFormatted } = useTokenToCeloEquivalent(
    getMainContractAddress(),
    cUSDToken?.address as `0x${string}` || '0x0000000000000000000000000000000000000000' as `0x${string}`,
    voteAmount ? parseEther(voteAmount) : 0n
  );

  // Helper function for BigInt exponentiation (same as wallet modal)
  const bigIntPow = (base: bigint, exponent: bigint): bigint => {
    let result = BigInt(1);
    for (let i = BigInt(0); i < exponent; i++) {
      result *= base;
    }
    return result;
  };

  // Fetch token balances - using same logic as wallet modal
  useEffect(() => {
    async function fetchBalances() {
      if (!address || !publicClient) {
        console.log('No wallet address connected or public client');
        return;
      }
      console.log('Fetching balances for address:', address);
      
      try {
        const balancesPromises = supportedTokens.map(async (token) => {
          try {
            let balance: bigint;
            
            if (token.symbol === 'CELO') {
              balance = await publicClient.getBalance({
                address: address as `0x${string}`
              });
            } else {
              balance = await publicClient.readContract({
                address: token.address as `0x${string}`,
                abi: [{
                  name: 'balanceOf',
                  type: 'function',
                  stateMutability: 'view',
                  inputs: [{ name: 'account', type: 'address' }],
                  outputs: [{ name: '', type: 'uint256' }]
                }],
                functionName: 'balanceOf',
                args: [address as `0x${string}`]
              });
            }
            
            let formattedBalance: string;
            if (token.decimals === 18) {
              const fullBalance = formatEther(balance);
              const parts = fullBalance.split('.');
              formattedBalance = parts[0] + (parts[1] ? ('.' + parts[1].substring(0, 3)) : '');
            } else {
              const divisor = bigIntPow(BigInt(10), BigInt(token.decimals));
              const integerPart = balance / divisor;
              const fractionalPart = balance % divisor;
              const fractionalStr = fractionalPart.toString().padStart(token.decimals, '0');
              formattedBalance = `${integerPart}.${fractionalStr.substring(0, 3)}`;
            }
            
            return {
              address: token.address,
              symbol: token.symbol,
              name: token.name,
              balance,
              formattedBalance
            };
          } catch (error) {
            console.error(`Error fetching balance for ${token.symbol}:`, error);
            return {
              address: token.address,
              symbol: token.symbol,
              name: token.name,
              balance: BigInt(0),
              formattedBalance: '0'
            };
          }
        });
        
        const balances = await Promise.all(balancesPromises);
        
        console.log('Balance fetch results:', balances.map(b => ({
          symbol: b.symbol,
          balance: b.balance.toString(),
          formatted: b.formattedBalance
        })));
        
        setTokenBalances(balances);
      } catch (e) {
        console.error('Balance fetch error:', e);
        setTokenBalances([]);
      }
    }
    fetchBalances();
  }, [address, publicClient]);

  // Set default token
  useEffect(() => {
    if (isOpen && !selectedToken && goodDollarToken) {
      setSelectedToken(goodDollarToken.address);
    }
  }, [isOpen, goodDollarToken]);

  // Ensure default token is CELO when modal opens
  useEffect(() => {
    if (isOpen && celoToken) {
      setSelectedToken(celoToken.address);
    }
  }, [isOpen, celoToken]);

  // Handle GoodDollar estimates
  useEffect(() => {
    if (goodDollarToken && selectedToken === goodDollarToken.address && voteAmount && !goodDollarLoading) {
      (async () => {
        try {
          const estimate = await getGoodDollarQuote(parseEther(voteAmount));
          setGoodDollarEstimate(formatEther(estimate));
        } catch (e) {
          setGoodDollarEstimate('');
        }
      })();
    }
  }, [selectedToken, voteAmount, getGoodDollarQuote, goodDollarLoading, goodDollarToken]);

  // Check claim eligibility
  const checkClaimEligibility = async () => {
    if (!address) return;
    
    setIsCheckingEligibility(true);
    setClaimError('');
    
    try {
      const response = await fetch(`https://selfauth.vercel.app/api/check-wallet?wallet=${encodeURIComponent(address.toLowerCase())}`, {
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
      const isNativeCelo = celoToken && selectedToken.toLowerCase() === celoToken.address.toLowerCase();
      
      if (isNativeCelo) {
        await voteWithCelo({
          campaignId: campaignId,
          projectId: selectedProject.id.toString(),
          amount: amount
        });
      } else if (cUSDToken && selectedToken === cUSDToken.address) {
        await vote({
          campaignId: campaignId,
          projectId: selectedProject.id.toString(),
          token: selectedToken as `0x${string}`,
          amount: amount
        });
      } else if (goodDollarToken && selectedToken === goodDollarToken.address) {
        const minCeloOut = goodDollarEstimate ? parseEther(goodDollarEstimate) : 0n;
        await swapAndVoteGoodDollar(
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
    if (isSuccess && !isPending) {
      setCurrentView('success');
      setIsProcessing(false);
      setCountdown(0);
      
      onVoteSuccess?.();
      
      setTimeout(() => {
        handleClose();
      }, 3000);
    }
  }, [isSuccess, isPending, onVoteSuccess]);

  // Transaction timeout
  useEffect(() => {
    if (isPending && !isSuccess) {
      setCountdown(12);
      
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            onClose();
            navigate(getCampaignRoute(Number(campaignId)));
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isPending, isSuccess, onClose, navigate, campaignId]);

  // Reset on modal close
  useEffect(() => {
    if (!isOpen) {
      setCurrentView('vote');
      setVoteAmount('1');
      setPercentage([10]);
      setSelectedToken(goodDollarToken?.address || '');
      setError('');
      setIsProcessing(false);
      setCountdown(0);
      setIsClaimProcessing(false);
      setClaimError('');
      setEligibilityStatus({ eligible: false });
      setIsCheckingEligibility(false);
      setGoodDollarEstimate('');
      reset();
    }
  }, [isOpen, goodDollarToken, reset]);

  // Utility functions
  const getSelectedBalance = () => {
    const tokenBalance = tokenBalances.find(tb => tb.address.toLowerCase() === selectedToken.toLowerCase());
    return tokenBalance ? tokenBalance.formattedBalance : '0.00';
  };

  const getSelectedSymbol = () => {
    const tokenBalance = tokenBalances.find(tb => tb.address.toLowerCase() === selectedToken.toLowerCase());
    return tokenBalance ? tokenBalance.symbol : '';
  };

  // Calculate voting simulation (currently unused but kept for future features)
  // TODO: Implement voting simulation feature

  const handleClose = () => {
    setCurrentView('vote');
    setVoteAmount('1');
    setPercentage([10]);
      setSelectedToken(goodDollarToken?.address || '');
    setError('');
    setIsProcessing(false);
    reset();
    onClose();
  };

  if (!isOpen || !selectedProject) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col bg-white p-0 [&>button]:hidden">
        <DialogHeader className="p-6 pb-3">
          {/* Header */}
          <div className="bg-gray-500 p-4 text-white relative overflow-hidden rounded-t-lg -m-6 mb-3">
            <div className="relative z-10">
              <DialogDescription className="text-white text-2xl">
                Vote for: <span className="font-semibold text-yellow-200 uppercase">{selectedProject.name}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 pb-0">
          
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

              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
                <CardContent className="p-4">
                  <h5 className="font-semibold text-blue-800 mb-3 flex items-center justify-center">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Your Support
                  </h5>
                  <div className="flex gap-3">
                    <Button asChild className="flex-1 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white">
                      <a
                        href={`https://twitter.com/intent/tweet?text=Just voted for ${selectedProject.name} on @SovSeas! 🗳️✨ Community funding at its finest! %23CommunityFunding %23SovSeas`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Twitter className="h-4 w-4 mr-2" />
                        Share
                      </a>
                    </Button>
                    <Button
                      onClick={handleClose}
                      variant="outline"
                      className="flex-1"
                    >
                      Close
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4 flex items-center">
                    <Loader2 className="h-5 w-5 text-blue-600 mr-3 animate-spin" />
                    <span className="text-blue-700 font-medium">Checking verification status...</span>
                  </CardContent>
                </Card>
              )}

              {!isCheckingEligibility && eligibilityStatus.eligible !== undefined && (
                <Card className={`border-2 ${
                  eligibilityStatus.eligible 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <CardContent className="p-4">
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
                  </CardContent>
                </Card>
              )}

              {claimError && (
                <Card className="bg-red-50 border-2 border-red-200">
                  <CardContent className="p-4 flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-red-800">{claimError}</p>
                  </CardContent>
                </Card>
              )}

              {eligibilityStatus.eligible && (
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
                  <CardContent className="p-4">
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
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-3">
                {!eligibilityStatus.eligible && !isCheckingEligibility && (
                  <Button
                    onClick={checkClaimEligibility}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Check Eligibility
                  </Button>
                )}
                
                {eligibilityStatus.eligible && (
                  <Button
                    onClick={handleClaimFreeVote}
                    disabled={isClaimProcessing}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg text-white"
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
                  </Button>
                )}
                
                <Button
                  onClick={() => setCurrentView('vote')}
                  disabled={isClaimProcessing}
                  variant="outline"
                >
                  Back
                </Button>
              </div>
            </div>
          )}

          {/* Vote View */}
          {currentView === 'vote' && (
            <div className="space-y-8">
              
              {error && (
                <Card className="bg-red-50 border-2 border-red-200">
                  <CardContent className="p-4 flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </CardContent>
                </Card>
              )}

              {(isProcessing || isPending) && (
                <Card className="bg-amber-50 border-2 border-amber-200">
                  <CardContent className="p-4">
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
                  </CardContent>
                </Card>
              )}


              {/* Amount Input */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
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
                
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="number"
                      value={voteAmount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setVoteAmount(e.target.value);
                        const balance = parseFloat(getSelectedBalance());
                        if (balance > 0) {
                          const newPercentage = (parseFloat(e.target.value) / balance) * 100;
                          setPercentage([Math.min(100, Math.max(0, Math.round(newPercentage)))]);
                        }
                      }}
                      placeholder="0.00"
                      disabled={isProcessing || isPending}
                      className="text-xl font-semibold h-12"
                      step="0.01"
                      min="0"
                      max={getSelectedBalance()}
                    />
                  </div>
                  <div className="w-48">
                    <TokenSelector 
                      selectedToken={selectedToken}
                      onTokenSelect={setSelectedToken}
                      disabled={isProcessing || isPending}
                      tokenBalances={tokenBalances}
                    />
                  </div>
                </div>

                {/* Percentage Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Percentage of balance</span>
                    <span className="font-semibold text-blue-600">{percentage[0]}%</span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={percentage[0]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const value = parseInt(e.target.value);
                        setPercentage([value]);
                        const balance = parseFloat(getSelectedBalance());
                        const newAmount = (balance * value) / 100;
                        setVoteAmount(newAmount.toFixed(2));
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider relative z-10"
                      disabled={isProcessing || isPending}
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage[0]}%, #e5e7eb ${percentage[0]}%, #e5e7eb 100%)`
                      }}
                    />
                    {/* Slider marks */}
                    <div className="absolute top-0 left-0 w-full h-2 pointer-events-none">
                      <div className="relative h-full">
                        {/* Mark at 5% */}
                        <div className="absolute top-0 w-1 h-2 bg-gray-400 rounded-full" style={{ left: '5%', transform: 'translateX(-50%)' }}></div>
                        {/* Mark at 25% */}
                        <div className="absolute top-0 w-1 h-2 bg-gray-400 rounded-full" style={{ left: '25%', transform: 'translateX(-50%)' }}></div>
                        {/* Mark at 50% */}
                        <div className="absolute top-0 w-1 h-2 bg-gray-400 rounded-full" style={{ left: '50%', transform: 'translateX(-50%)' }}></div>
                        {/* Mark at 75% */}
                        <div className="absolute top-0 w-1 h-2 bg-gray-400 rounded-full" style={{ left: '75%', transform: 'translateX(-50%)' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0%</span>
                    <span>5%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
              
              {/* Token Conversion Info */}
              {cUSDToken && selectedToken === cUSDToken.address && voteAmount && parseFloat(voteAmount) > 0 && (
                <Card className="bg-gray-50 border-gray-200">
                  <CardContent className="p-3">
                    <div className="text-sm text-gray-600 flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      <span>≈ {Number(celoEquivalentFormatted).toFixed(2)} CELO voting power</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {goodDollarToken && selectedToken === goodDollarToken.address && voteAmount && parseFloat(voteAmount) > 0 && goodDollarEstimate && (
                <Card className="bg-gray-50 border-gray-200">
                  <CardContent className="p-3">
                    <div className="text-sm text-gray-600 flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      <span>≈ {goodDollarEstimate} CELO voting power</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              

            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="p-8 pt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            size="default"
            className="w-24 h-12 text-base"
          >
            Cancel
          </Button>
          <Button
            onClick={handleVote}
            disabled={
              isProcessing || 
              isPending || 
              !voteAmount || 
              !selectedToken || 
              parseFloat(voteAmount) > parseFloat(getSelectedBalance()) || 
              parseFloat(voteAmount) <= 0
            }
            className="w-32 bg-gradient-to-r from-blue-600 to-indigo-700 hover:shadow-lg hover:-translate-y-0.5 text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none h-12 text-base"
          >
            {isProcessing || isPending ? (
              <span>Processing...</span>
            ) : (
              <span>Cast Vote</span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}