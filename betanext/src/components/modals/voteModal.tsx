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
import { useNavigate } from '@/utils/nextAdapter';
import { getCampaignRoute } from '@/utils/hashids';
import {
  MobileDialog as Dialog,
  MobileDialogContent as DialogContent,
  MobileDialogDescription as DialogDescription,
  MobileDialogHeader as DialogHeader,
} from '@/components/ui/mobile-dialog';
import { ButtonCool } from '@/components/ui/button-cool';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { useVote } from '@/hooks/useVotingMethods';
import { useTokenToCeloEquivalent } from '@/hooks/useVotingMethods';
import { useGoodDollarVoter } from '@/hooks/useGoodDollarVoter';
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
          '/images/good.png'
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
        className={`w-full h-12 rounded-[0.4em] border-[0.2em] border-[#050505] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all flex items-center justify-between px-4 bg-white font-extrabold ${
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
        <DialogContent className="max-w-md bg-white border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] p-0 relative">
          <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
          <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
          
          <DialogHeader className="relative px-[1.5em] pt-[1.4em] pb-[1em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
            style={{ 
              background: '#2563eb',
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
              backgroundBlendMode: 'overlay'
            }}
          >
            <DialogDescription className="text-white text-xl font-extrabold uppercase tracking-[0.05em]">
              Select Token
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative px-[1.5em] py-[1.5em] space-y-2 z-[2]">
            {tokens.map((token) => (
              <button
                key={token.address}
                onClick={() => {
                  onTokenSelect(token.address);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3 border-[0.2em] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all font-extrabold ${
                  selectedToken === token.address ? 'bg-[#dbeafe] border-[#2563eb] text-[#050505]' : 'bg-white border-[#050505] text-[#050505]'
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
                    <div className="font-extrabold text-[#050505] uppercase tracking-[0.05em]">{token.name}</div>
                    <div className="text-sm text-[#050505] font-semibold">{token.symbol}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-[#050505] font-semibold">Balance</div>
                  <div className="font-extrabold text-[#050505]">{getBalance(token.address)}</div>
                  {selectedToken === token.address && (
                    <Check className="h-4 w-4 text-[#2563eb] mt-1" />
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
    environment: process.env.NEXT_PUBLIC_ENV
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

  // Set default token when modal opens - prioritize CELO
  useEffect(() => {
    if (isOpen && !selectedToken) {
      if (celoToken) {
        setSelectedToken(celoToken.address);
      } else if (goodDollarToken) {
        setSelectedToken(goodDollarToken.address);
      }
    }
  }, [isOpen, celoToken, goodDollarToken]); // Removed selectedToken from deps

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
  }, [selectedToken, voteAmount, goodDollarLoading, goodDollarToken]); // Removed getGoodDollarQuote - should be stable from hook

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

  // Reset on modal close - optimized dependencies
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
  }, [isOpen, goodDollarToken?.address, reset]); // Use goodDollarToken?.address instead of whole object

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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col bg-white border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] p-0 [&>button]:hidden relative">
        {/* Pattern Grid Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-30 z-[1]"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
            backgroundSize: '0.5em 0.5em'
          }}
        />

        {/* Accent Corner */}
        <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
        <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>

        <DialogHeader className="relative px-[1.5em] pt-[1.4em] pb-[1em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2] overflow-hidden"
          style={{ 
            background: '#2563eb',
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
            backgroundBlendMode: 'overlay'
          }}
        >
          <DialogDescription className="text-white text-2xl font-extrabold uppercase tracking-[0.05em]">
            Vote for: <span className="text-yellow-200">{selectedProject.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-[1.5em] pb-0 relative z-[2]">
          
          {/* Success View */}
          {currentView === 'success' && (
            <div className="text-center space-y-6 py-6">
              <div className="relative">
                <div className="w-20 h-20 bg-[#10b981] border-[0.2em] border-[#050505] rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0.3em_0.3em_0_#000000]">
                  <Check className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 text-2xl">🎉</div>
              </div>
              
              <div>
                <h4 className="text-2xl font-extrabold text-[#10b981] mb-2 uppercase tracking-[0.05em]">
                  Vote Cast Successfully!
                </h4>
                <p className="text-[#050505] mb-6 font-semibold">
                  Your vote has been registered for <span className="font-extrabold text-[#2563eb]">{selectedProject.name}</span>
                </p>
              </div>

              <div className="bg-[#dbeafe] border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.5em_0.5em_0_#000000] p-4">
                <h5 className="font-extrabold text-[#050505] mb-3 flex items-center justify-center uppercase tracking-[0.05em]">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Your Support
                </h5>
                <div className="flex gap-3">
                  <a
                    href={`https://twitter.com/intent/tweet?text=Just voted for ${selectedProject.name} on @SovSeas! 🗳️✨ Community funding at its finest! %23CommunityFunding %23SovSeas`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <ButtonCool
                      text="Share"
                      bgColor="#1DA1F2"
                      hoverBgColor="#1a8cd8"
                      textColor="#ffffff"
                      borderColor="#050505"
                      size="md"
                    >
                      <Twitter className="h-4 w-4" />
                    </ButtonCool>
                  </a>
                  <ButtonCool
                    onClick={handleClose}
                    text="Close"
                    bgColor="#ffffff"
                    hoverBgColor="#f3f4f6"
                    textColor="#050505"
                    borderColor="#050505"
                    size="md"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Claim View */}
          {currentView === 'claim' && (
            <div className="space-y-6 py-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#10b981] border-[0.2em] border-[#050505] rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0.3em_0.3em_0_#000000]">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-extrabold text-[#050505] mb-2 uppercase tracking-[0.05em]">Claim Free Vote</h3>
                <p className="text-[#050505] font-semibold">Verified users get one free vote per campaign</p>
              </div>

              {isCheckingEligibility && (
                <div className="bg-[#dbeafe] border-[0.2em] border-[#2563eb] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] p-4 flex items-center">
                  <Loader2 className="h-5 w-5 text-[#2563eb] mr-3 animate-spin" />
                  <span className="text-[#050505] font-extrabold uppercase tracking-[0.05em]">Checking verification status...</span>
                </div>
              )}

              {!isCheckingEligibility && eligibilityStatus.eligible !== undefined && (
                <div className={`border-[0.2em] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] p-4 ${
                  eligibilityStatus.eligible 
                    ? 'bg-[#d1fae5] border-[#10b981]' 
                    : 'bg-[#fee2e2] border-[#ef4444]'
                }`}>
                  <div className="flex items-center mb-2">
                    {eligibilityStatus.eligible ? (
                      <>
                        <Check className="h-5 w-5 text-[#10b981] mr-2" />
                        <span className="font-extrabold text-[#050505] uppercase tracking-[0.05em]">Eligible for Free Vote</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-5 w-5 text-[#ef4444] mr-2" />
                        <span className="font-extrabold text-[#050505] uppercase tracking-[0.05em]">Not Eligible</span>
                      </>
                    )}
                  </div>
                  <p className={`text-sm font-semibold text-[#050505]`}>
                    {eligibilityStatus.reason}
                  </p>
                </div>
              )}

              {claimError && (
                <div className="bg-[#fee2e2] border-[0.2em] border-[#ef4444] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] p-4 flex items-start">
                  <AlertCircle className="h-5 w-5 text-[#ef4444] mr-3 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-extrabold text-[#050505] uppercase tracking-[0.05em]">{claimError}</p>
                </div>
              )}

              {eligibilityStatus.eligible && (
                <div className="bg-[#d1fae5] border-[0.2em] border-[#10b981] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] p-4">
                  <h4 className="font-extrabold text-[#050505] mb-3 flex items-center uppercase tracking-[0.05em]">
                    <Gift className="h-4 w-4 mr-2" />
                    Free Vote Details
                  </h4>
                  <div className="space-y-2 text-sm text-[#050505] font-semibold">
                    <div className="flex justify-between">
                      <span>Vote Amount:</span>
                      <span className="font-extrabold">1.0 CELO</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Project:</span>
                      <span className="font-extrabold">{selectedProject.name}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {!eligibilityStatus.eligible && !isCheckingEligibility && (
                  <ButtonCool
                    onClick={checkClaimEligibility}
                    text="Check Eligibility"
                    bgColor="#2563eb"
                    hoverBgColor="#1d4ed8"
                    textColor="#ffffff"
                    borderColor="#050505"
                    size="md"
                  >
                    <Shield className="h-4 w-4" />
                  </ButtonCool>
                )}
                
                {eligibilityStatus.eligible && (
                  <ButtonCool
                    onClick={handleClaimFreeVote}
                    text={isClaimProcessing ? "Claiming..." : "Claim Now"}
                    bgColor="#10b981"
                    hoverBgColor="#059669"
                    textColor="#ffffff"
                    borderColor="#050505"
                    size="md"
                    disabled={isClaimProcessing}
                  >
                    {isClaimProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                  </ButtonCool>
                )}
                
                <ButtonCool
                  onClick={() => setCurrentView('vote')}
                  text="Back"
                  bgColor="#ffffff"
                  hoverBgColor="#f3f4f6"
                  textColor="#050505"
                  borderColor="#050505"
                  size="md"
                  disabled={isClaimProcessing}
                />
              </div>
            </div>
          )}

          {/* Vote View */}
          {currentView === 'vote' && (
            <div className="space-y-8">
              
              {error && (
                <div className="bg-[#fee2e2] border-[0.2em] border-[#ef4444] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] p-4 flex items-start">
                  <AlertCircle className="h-5 w-5 text-[#ef4444] mr-3 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-extrabold text-[#050505] uppercase tracking-[0.05em]">{error}</p>
                </div>
              )}

              {(isProcessing || isPending) && (
                <div className="bg-[#fef3c7] border-[0.2em] border-[#f59e0b] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] p-4">
                  <div className="flex items-center mb-3">
                    <Loader2 className="h-5 w-5 text-[#f59e0b] mr-3 animate-spin" />
                    <p className="text-sm font-extrabold text-[#050505] uppercase tracking-[0.05em]">Processing transaction...</p>
                  </div>
                  {countdown > 0 && (
                    <div>
                      <p className="text-xs text-[#050505] mb-2 font-semibold">
                        Redirecting to campaign page in {countdown}s if no confirmation
                      </p>
                      <div className="bg-[#fde68a] border-[0.15em] border-[#050505] rounded-full h-2 shadow-[0.1em_0.1em_0_#000000]">
                        <div 
                          className="bg-[#f59e0b] h-2 rounded-full transition-all duration-1000 border-[0.1em] border-[#050505]"
                          style={{ width: `${(countdown / 12) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}


              {/* Amount Input */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-extrabold text-[#050505] uppercase tracking-[0.05em]">
                    Vote Amount
                  </label>
                  {selectedToken && (
                    <div className="text-xs text-[#050505] flex items-center font-semibold">
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
                      className="text-xl font-extrabold h-12 border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] focus:outline-none"
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
                <div className="bg-gray-50 border-[0.2em] border-gray-300 rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] p-3">
                  <div className="text-sm text-[#050505] flex items-center font-semibold">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    <span>≈ {Number(celoEquivalentFormatted).toFixed(2)} CELO voting power</span>
                  </div>
                </div>
              )}
              
              {goodDollarToken && selectedToken === goodDollarToken.address && voteAmount && parseFloat(voteAmount) > 0 && goodDollarEstimate && (
                <div className="bg-gray-50 border-[0.2em] border-gray-300 rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] p-3">
                  <div className="text-sm text-[#050505] flex items-center font-semibold">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    <span>≈ {goodDollarEstimate} CELO voting power</span>
                  </div>
                </div>
              )}
              

            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="p-[1.5em] pt-6 flex justify-end gap-3 border-t-[0.35em] border-[#050505] relative z-[2]">
          <ButtonCool
            onClick={handleClose}
            text="Cancel"
            bgColor="#ffffff"
            hoverBgColor="#f3f4f6"
            textColor="#050505"
            borderColor="#050505"
            size="md"
          />
          <ButtonCool
            onClick={handleVote}
            text={isProcessing || isPending ? "Processing..." : "Cast Vote"}
            bgColor="#2563eb"
            hoverBgColor="#1d4ed8"
            textColor="#ffffff"
            borderColor="#050505"
            size="md"
            disabled={
              isProcessing || 
              isPending || 
              !voteAmount || 
              !selectedToken || 
              parseFloat(voteAmount) > parseFloat(getSelectedBalance()) || 
              parseFloat(voteAmount) <= 0
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}