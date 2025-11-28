import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Wallet, Check, Gift, TrendingUp, ChevronDown, AlertCircle } from 'lucide-react';
import { useAccount, usePublicClient, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther, type Address } from 'viem';

import { 
  MobileDialog as Dialog,
  MobileDialogContent as DialogContent,
  MobileDialogDescription as DialogDescription,
  MobileDialogHeader as DialogHeader,
} from '@/components/ui/mobile-dialog';
import { ButtonCool } from '@/components/ui/button-cool';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supportedTokens } from '@/hooks/useSupportedTokens';
import { useTipProject, useTipProjectWithCelo, useApproveToken } from '@/hooks/useProjectTipping';
import { getTippingContractAddress, getCeloTokenAddress } from '@/utils/contractConfig';
import { erc20ABI } from '@/abi/erc20ABI';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: bigint;
    name: string;
    owner: string;
    contractAddress: string;
  };
  onTipSuccess?: () => void;
}


// Token Selector Component (same as vote modal)
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
          '/images/celo_logo.svg'
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

const TipModal: React.FC<TipModalProps> = ({ isOpen, onClose, project, onTipSuccess }) => {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();
  
  // Contract addresses
  const tippingContractAddress = getTippingContractAddress();
  const celoTokenAddress = getCeloTokenAddress();
  
  // State
  const [currentView, setCurrentView] = useState<'tip' | 'success'>('tip');
  const [tipAmount, setTipAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [tipStep, setTipStep] = useState<'idle' | 'approving' | 'tipping' | 'done'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  
  // Tipping hooks
  const { tipProject, isPending: isTipPending, error: tipError } = useTipProject(tippingContractAddress);
  const { tipProjectWithCelo, isPending: isCeloTipPending, error: celoTipError } = useTipProjectWithCelo(tippingContractAddress);
  const { approveToken, isPending: isApprovePending, data: approveTxHash } = useApproveToken();
  
  // Wait for transaction receipts
  const { isLoading: isTipConfirming, isSuccess: isTipConfirmed } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}` | undefined,
    query: {
      enabled: !!txHash
    }
  });
  
  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash,
    query: {
      enabled: !!approveTxHash
    }
  });

  // Token balances - using same structure as wallet modal
  const [tokenBalances, setTokenBalances] = useState<Array<{
    address: string;
    symbol: string;
    name: string;
    balance: bigint;
    formattedBalance: string;
  }>>([]);

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
      if (!userAddress || !publicClient) {
        console.log('No wallet address connected or public client');
        return;
      }
      console.log('Fetching balances for address:', userAddress);
      
      try {
        const balancesPromises = supportedTokens.map(async (token) => {
          try {
            let balance: bigint;
            
            if (token.symbol === 'CELO') {
              balance = await publicClient.getBalance({
                address: userAddress as `0x${string}`
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
                args: [userAddress as `0x${string}`]
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
        setTokenBalances(balances);
      } catch (e) {
        console.error('Balance fetch error:', e);
        setTokenBalances([]);
      }
    }
    fetchBalances();
  }, [userAddress, publicClient]);

  // Set default token
  useEffect(() => {
    if (isOpen && !selectedToken && supportedTokens.length > 0) {
      setSelectedToken(supportedTokens[0]);
    }
  }, [isOpen, selectedToken]);

  // Utility functions
  const getSelectedBalance = () => {
    const tokenBalance = tokenBalances.find(tb => tb.address.toLowerCase() === selectedToken?.address?.toLowerCase());
    return tokenBalance ? tokenBalance.formattedBalance : '0.00';
  };

  const getSelectedSymbol = () => {
    const tokenBalance = tokenBalances.find(tb => tb.address.toLowerCase() === selectedToken?.address?.toLowerCase());
    return tokenBalance ? tokenBalance.symbol : '';
  };

  // Check if token is CELO
  const isCeloToken = useCallback(() => {
    if (!selectedToken) return false;
    return selectedToken.address.toLowerCase() === celoTokenAddress.toLowerCase() || selectedToken.symbol === 'CELO';
  }, [selectedToken, celoTokenAddress]);

  // Handle tip submission with actual contract calls
  const handleTip = async () => {
    if (!userAddress) {
      setError('Please connect your wallet');
      return;
    }

    if (!selectedToken || !tipAmount) {
      setError('Please select a token and enter an amount');
      return;
    }

    const amountValue = parseFloat(tipAmount);
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
      
      const amount = parseEther(tipAmount);
      const isCelo = isCeloToken();
      
      // For ERC20 tokens, check and handle approval first
      if (!isCelo) {
        if (!publicClient) {
          setError('Unable to connect to blockchain. Please try again.');
          setIsProcessing(false);
          return;
        }
        
        setTipStep('approving');
        
        // Check current allowance
        const currentAllowance = await publicClient.readContract({
          address: selectedToken.address as Address,
          abi: erc20ABI,
          functionName: 'allowance',
          args: [userAddress as Address, tippingContractAddress]
        }) as bigint;

        // If allowance is insufficient, approve
        if (currentAllowance < amount) {
          approveToken({
            tokenAddress: selectedToken.address as Address,
            spender: tippingContractAddress,
            amount: amount,
            account: userAddress as Address
          });
          
          // Wait for approval to be confirmed before proceeding
          // This will be handled by the useEffect that watches isApproveConfirmed
          return;
        }
      }
      
      setTipStep('tipping');
      
      let resultTxHash: string | null = null;
      
      if (isCelo) {
        // For CELO, use tipProjectWithCelo
        // This will trigger the wallet prompt and return transaction hash
        const result = await tipProjectWithCelo({
          projectId: project.id,
          amount: amount,
          message: message || '',
          userAddress: userAddress as Address
        });
        resultTxHash = result.hash || null;
      } else {
        // For ERC20 tokens, use tipProject
        // Note: celoEquivalent is the same as amount for simplicity
        // In production, you might want to calculate actual CELO equivalent
        const result = await tipProject({
          projectId: project.id,
          token: selectedToken.address as Address,
          amount: amount,
          celoEquivalent: amount, // Using same value for simplicity
          message: message || ''
        });
        resultTxHash = result.hash || null;
      }
      
      if (resultTxHash) {
        setTxHash(resultTxHash);
      }
      
    } catch (error: any) {
      setIsProcessing(false);
      setTipStep('idle');
      
      let errorMessage = 'Tipping failed! Please try again.';
      
      if (error?.message) {
        if (error.message.includes('user rejected') || error.message.includes('User rejected')) {
          errorMessage = 'Transaction was rejected. No funds were spent.';
        } else if (error.message.includes('insufficient funds') || error.message.includes('insufficient balance')) {
          errorMessage = 'Insufficient balance to complete this transaction.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    }
  };

  // Handle approval confirmation and proceed with tip
  useEffect(() => {
    const proceedWithTip = async () => {
      if (isApproveConfirmed && tipStep === 'approving' && !isCeloToken() && selectedToken && tipAmount) {
        // Approval confirmed, now proceed with tip
        const amount = parseEther(tipAmount);
        setTipStep('tipping');
        
        try {
          const result = await tipProject({
            projectId: project.id,
            token: selectedToken.address as Address,
            amount: amount,
            celoEquivalent: amount,
            message: message || ''
          });
          
          if (result.hash) {
            setTxHash(result.hash);
          }
        } catch (error) {
          console.error('Error sending tip after approval:', error);
          setIsProcessing(false);
          setTipStep('idle');
        }
      }
    };
    
    proceedWithTip();
  }, [isApproveConfirmed, tipStep, tipAmount, selectedToken, project.id, message, isCeloToken, tipProject]);

  // Note: Divvi referral is now handled in the hooks themselves
  // The referral tag is appended to transaction data and submitted automatically

  // Handle transaction success
  useEffect(() => {
    if (isTipConfirmed && txHash) {
      setTipStep('done');
      setCurrentView('success');
      setIsProcessing(false);
      
      // Call success callback
      if (onTipSuccess) {
        onTipSuccess();
      }
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        handleClose();
      }, 3000);
    }
  }, [isTipConfirmed, txHash, onTipSuccess]);

  // Handle errors from hooks
  useEffect(() => {
    if (tipError || celoTipError) {
      const error = tipError || celoTipError;
      setIsProcessing(false);
      setTipStep('idle');
      
      let errorMessage = 'Tipping failed! Please try again.';
      if (error?.message) {
        if (error.message.includes('user rejected') || error.message.includes('User rejected')) {
          errorMessage = 'Transaction was rejected. No funds were spent.';
        } else if (error.message.includes('insufficient funds') || error.message.includes('insufficient balance')) {
          errorMessage = 'Insufficient balance to complete this transaction.';
        } else {
          errorMessage = error.message;
        }
      }
      setError(errorMessage);
    }
  }, [tipError, celoTipError]);

  // Update processing state based on transaction states
  useEffect(() => {
    const isAnyPending = isTipPending || isCeloTipPending || isApprovePending || isTipConfirming || isApproveConfirming;
    setIsProcessing(isAnyPending);
    
    if (isApprovePending || isApproveConfirming) {
      setTipStep('approving');
    } else if (isTipPending || isCeloTipPending || isTipConfirming) {
      setTipStep('tipping');
    }
  }, [isTipPending, isCeloTipPending, isApprovePending, isTipConfirming, isApproveConfirming]);

  // Reset on modal close
  useEffect(() => {
    if (!isOpen) {
      setCurrentView('tip');
      setTipAmount('');
      setSelectedToken(null);
      setMessage('');
      setError('');
      setIsProcessing(false);
      setTipStep('idle');
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isOpen || !project) return null;

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
            Tip: <span className="text-yellow-200">{project.name}</span>
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
                  Tip Sent Successfully!
                </h4>
                <p className="text-[#050505] mb-6 font-semibold">
                  Your tip has been sent to <span className="font-extrabold text-[#2563eb]">{project.name}</span>
                </p>
              </div>

              <div className="bg-[#dbeafe] border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.5em_0.5em_0_#000000] p-4">
                <h5 className="font-extrabold text-[#050505] mb-3 flex items-center justify-center uppercase tracking-[0.05em]">
                  <Gift className="h-4 w-4 mr-2" />
                  Thank You!
                </h5>
                <p className="text-sm text-[#050505] mb-4 font-semibold">
                  Your support helps fund this amazing project and contributes to the community.
                </p>
                <ButtonCool
                  onClick={handleClose}
                  text="Close"
                  bgColor="#2563eb"
                  hoverBgColor="#1d4ed8"
                  textColor="#ffffff"
                  borderColor="#050505"
                  size="md"
                />
              </div>
            </div>
          )}

          {/* Tip View */}
          {currentView === 'tip' && (
            <div className="space-y-8">
              
              {error && (
                <div className="bg-[#fee2e2] border-[0.2em] border-[#ef4444] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] p-4 flex items-start">
                  <AlertCircle className="h-5 w-5 text-[#ef4444] mr-3 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-extrabold text-[#050505] uppercase tracking-[0.05em]">{error}</p>
                </div>
              )}

              {(isProcessing || tipStep !== 'idle') && (
                <div className="bg-[#fef3c7] border-[0.2em] border-[#f59e0b] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] p-4">
                  <div className="flex items-center mb-3">
                    <Loader2 className="h-5 w-5 text-[#f59e0b] mr-3 animate-spin" />
                    <p className="text-sm font-extrabold text-[#050505] uppercase tracking-[0.05em]">
                      {tipStep === 'approving' ? 'Approving token...' : 
                       tipStep === 'tipping' ? 'Sending tip...' : 
                       'Processing transaction...'}
                    </p>
                  </div>
                  {txHash && (
                    <p className="text-xs text-[#050505] mt-2 font-semibold">
                      Transaction: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                    </p>
                  )}
                </div>
              )}

              {/* Amount Input */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-extrabold text-[#050505] uppercase tracking-[0.05em]">
                    Tip Amount
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
                      value={tipAmount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setTipAmount(e.target.value);
                      }}
                      placeholder="0.00"
                      disabled={isProcessing}
                      className="text-xl font-extrabold h-12 border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] focus:outline-none"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="w-48">
                    <TokenSelector 
                      selectedToken={selectedToken?.address || ''}
                      onTokenSelect={(address) => {
                        const token = supportedTokens.find(t => t.address === address);
                        setSelectedToken(token || null);
                      }}
                      disabled={isProcessing}
                      tokenBalances={tokenBalances}
                    />
                  </div>
                </div>
              </div>

              {/* Message Input */}
              <div className="space-y-2">
                <label className="text-sm font-extrabold text-[#050505] uppercase tracking-[0.05em]">
                  Message (Optional)
                </label>
                <Input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Leave a message for the project..."
                  disabled={isProcessing}
                  className="h-12 border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] focus:outline-none font-semibold"
                  maxLength={100}
                />
                <div className="text-xs text-[#050505] text-right font-semibold">
                  {message.length}/100 characters
                </div>
              </div>

              {/* Token Conversion Info */}
              {selectedToken && tipAmount && parseFloat(tipAmount) > 0 && (
                <div className="bg-gray-50 border-[0.2em] border-gray-300 rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] p-3">
                  <div className="text-sm text-[#050505] flex items-center font-semibold">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    <span>≈ {tipAmount} {selectedToken.symbol} tip</span>
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
            onClick={handleTip}
            text={isProcessing ? (tipStep === 'approving' ? 'Approving...' : 'Sending...') : 'Send Tip'}
            bgColor="#2563eb"
            hoverBgColor="#1d4ed8"
            textColor="#ffffff"
            borderColor="#050505"
            size="md"
            disabled={
              isProcessing ||
              !tipAmount ||
              !selectedToken ||
              !userAddress ||
              parseFloat(tipAmount) > parseFloat(getSelectedBalance()) || 
              parseFloat(tipAmount) <= 0
            }
          >
            {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
          </ButtonCool>
        </div>
      </DialogContent>
    </Dialog>
 );
};

export default TipModal;