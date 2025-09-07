import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Wallet, Check, Gift, TrendingUp, ChevronDown, AlertCircle } from 'lucide-react';
import { useAccount, usePublicClient } from 'wagmi';
import { formatEther } from 'viem';

import { 
  MobileDialog as Dialog,
  MobileDialogContent as DialogContent,
  MobileDialogDescription as DialogDescription,
  MobileDialogHeader as DialogHeader,
} from '@/components/ui/mobile-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supportedTokens } from '@/hooks/useSupportedTokens';

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

const TipModal: React.FC<TipModalProps> = ({ isOpen, onClose, project }) => {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();


  // State
  const [currentView, setCurrentView] = useState<'tip' | 'success'>('tip');
  const [tipAmount, setTipAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [tipStep, setTipStep] = useState<'idle' | 'approving' | 'tipping' | 'done'>('idle');

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

  // Handle tip submission - simplified for demo
  const handleTip = async () => {
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
        setTipStep('tipping');
      
      // Simulate tip processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setTipStep('done');
      setCurrentView('success');
      
      setTimeout(() => {
        handleClose();
      }, 3000);
      
    } catch (error: any) {
      setIsProcessing(false);
      setTipStep('idle');
      
      let errorMessage = 'Tipping failed! Please try again.';
      
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col bg-white p-0 [&>button]:hidden">
        <DialogHeader className="p-6 pb-3">
          {/* Header */}
          <div className="bg-gray-500 p-4 text-white relative overflow-hidden rounded-t-lg -m-6 mb-3">
            <div className="relative z-10">
              <DialogDescription className="text-white text-2xl">
                Tip: <span className="font-semibold text-yellow-200 uppercase">{project.name}</span>
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
                  Tip Sent Successfully!
                </h4>
                <p className="text-gray-600 mb-6">
                  Your tip has been sent to <span className="font-semibold text-blue-600">{project.name}</span>
                </p>
              </div>

              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
                <CardContent className="p-4">
                  <h5 className="font-semibold text-blue-800 mb-3 flex items-center justify-center">
                    <Gift className="h-4 w-4 mr-2" />
                    Thank You!
                  </h5>
                  <p className="text-sm text-blue-700 mb-4">
                    Your support helps fund this amazing project and contributes to the community.
                  </p>
                  <Button
                onClick={handleClose}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Close
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tip View */}
          {currentView === 'tip' && (
            <div className="space-y-8">
              
              {error && (
                <Card className="bg-red-50 border-2 border-red-200">
                  <CardContent className="p-4 flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </CardContent>
                </Card>
              )}

              {(isProcessing || tipStep !== 'idle') && (
                <Card className="bg-amber-50 border-2 border-amber-200">
                  <CardContent className="p-4">
                    <div className="flex items-center mb-3">
                      <Loader2 className="h-5 w-5 text-amber-600 mr-3 animate-spin" />
                      <p className="text-sm font-medium text-amber-800">Processing transaction...</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Amount Input */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-800">
                    Tip Amount
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
                 value={tipAmount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setTipAmount(e.target.value);
                      }}
                 placeholder="0.00"
                      disabled={isProcessing}
                      className="text-xl font-semibold h-12"
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
                <label className="text-sm font-semibold text-gray-800">
                  Message (Optional)
                </label>
                <Input
                 type="text"
                 value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Leave a message for the project..."
                  disabled={isProcessing}
                  className="h-12"
                  maxLength={100}
                />
                <div className="text-xs text-gray-500 text-right">
                  {message.length}/100 characters
             </div>
             </div>

              {/* Token Conversion Info */}
              {selectedToken && tipAmount && parseFloat(tipAmount) > 0 && (
                <Card className="bg-gray-50 border-gray-200">
                  <CardContent className="p-3">
                    <div className="text-sm text-gray-600 flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      <span>≈ {tipAmount} {selectedToken.symbol} tip</span>
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
            onClick={handleTip}
               disabled={
                 isProcessing ||
                 !tipAmount ||
                 !selectedToken ||
              parseFloat(tipAmount) > parseFloat(getSelectedBalance()) || 
              parseFloat(tipAmount) <= 0
            }
            className="w-32 bg-gradient-to-r from-blue-600 to-indigo-700 hover:shadow-lg hover:-translate-y-0.5 text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none h-12 text-base"
          >
            {isProcessing ? (
              <span>Processing...</span>
            ) : (
              <span>Send Tip</span>
            )}
          </Button>
                 </div>
      </DialogContent>
    </Dialog>
 );
};

export default TipModal;