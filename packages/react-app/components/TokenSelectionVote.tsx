'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { 
  Award, 
  Coins, 
  X, 
  Loader2, 
  AlertTriangle, 
  ChevronRight,
  Check,
  Wallet,
  ArrowLeft,
  RefreshCw,
  Info
} from 'lucide-react';
import { formatEther } from 'viem';
import { useHookUtils } from '../hooks/useHookUtils';

interface TokenSelectionVoteProps {
  campaignId: number | string;
  projectId: number | string;
  projectName: string;
  voteMultiplier?: number;
  onSuccess?: () => void;
  onClose?: () => void;
}

export default async function TokenSelectionVote({
  campaignId,
  projectId,
  projectName,
  voteMultiplier = 1,
  onSuccess,
  onClose
}: TokenSelectionVoteProps) {
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  
  // Vote states
  const [selectedToken, setSelectedToken] = useState<null | {
    address: string;
    symbol: string;
    type: 'native' | 'stablecoin';
    balance: string;
    insufficientBalance?: boolean;
  }>(null);
  const [showAmountModal, setShowAmountModal] = useState(false);
  const [voteAmount, setVoteAmount] = useState('');
  const [notification, setNotification] = useState({ message: '', type: '' });
  
  // Import our hooks
  const {
    sovereignSeas,
    stableCoinVote,
    isInitialized,
    
    // Enhanced tokens with metrics
    enhancedTokens,
    
    // Actions
    executeVote,
    refreshSelectedTokenData,
    // refreshAllTokens,
  } = useHookUtils();
  
  // Initialize and load tokens
  useEffect(() => {
    setIsMounted(true);
    
    if (isInitialized) {
      // refreshAllTokens();
    }
  }, [isInitialized]);
  
  // Create a combined list of tokens (CELO + stablecoins)
  const combinedTokens = [
    // Add native CELO
    {
      address: 'native',
      symbol: 'CELO',
      name: 'Celo',
      type: 'native',
      balance: isConnected && sovereignSeas.publicClient ? 
        formatEther(await sovereignSeas.publicClient.getBalance({ address }) || BigInt(0)) : 
        '0',
      priceInCelo: '1',
      supported: true,
    },
    // Add supported stablecoins
    ...enhancedTokens.filter(token => token.supported).map(token => ({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      type: 'stablecoin',
      balance: token.balance ? formatEther(token.balance) : '0',
      priceInCelo: token.priceInCelo,
      supported: token.supported,
      insufficientBalance: token.insufficientBalance,
      insufficientAllowance: token.insufficientAllowance,
    })),
  ];
  
  // Handle refreshing balances
  const handleRefreshBalances = async () => {
    // await refreshAllTokens();
    setNotification({ message: 'Balances refreshed!', type: 'success' });
  };
  
  // Handle token selection
  const handleSelectToken = (token: any) => {
    setSelectedToken(token);
    setShowAmountModal(true);
  };
  
  // Handle back from amount modal
  const handleBackToTokens = () => {
    setShowAmountModal(false);
    setVoteAmount('');
  };
  
  // Handle vote submission
  const handleVote = async () => {
    if (!selectedToken || !voteAmount || parseFloat(voteAmount) <= 0) {
      setNotification({ message: 'Please enter a valid amount', type: 'error' });
      return;
    }
    
    try {
      if (selectedToken.type === 'native') {
        // Native CELO vote
        await sovereignSeas.vote(Number(campaignId), Number(projectId), voteAmount);
      } else {
        // Stablecoin vote
        await stableCoinVote.voteWithStableCoin(
          selectedToken.address as `0x${string}`,
          Number(campaignId),
          Number(projectId),
          voteAmount
        );
      }
      
      setNotification({ message: 'Vote submitted successfully!', type: 'success' });
      
      // Close the modal and reset states after a short delay
      setTimeout(() => {
        setShowAmountModal(false);
        setSelectedToken(null);
        setVoteAmount('');
        
        if (onSuccess) {
          onSuccess();
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting vote:', error);
      setNotification({ 
        message: `Error: ${(error as Error).message}`, 
        type: 'error' 
      });
    }
  };
  
  // Calculate vote value based on multiplier and token type
  const calculateVoteValue = () => {
    if (!voteAmount || !selectedToken) return '0';
    
    const amount = parseFloat(voteAmount);
    if (isNaN(amount) || amount <= 0) return '0';
    
    if (selectedToken.type === 'native') {
      // For native CELO, just multiply by vote multiplier
      return (amount * voteMultiplier).toFixed(2);
    } else {
      // For stablecoins, calculate based on their CELO price
      const celoEquivalent = amount * parseFloat(selectedToken.priceInCelo);
      return (celoEquivalent * voteMultiplier).toFixed(2);
    }
  };
  
  // Clear notification after a delay
  useEffect(() => {
    if (notification.message) {
      const timer = setTimeout(() => {
        setNotification({ message: '', type: '' });
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [notification]);
  
  // Get transaction statuses from both hooks
  const isProcessing = 
    sovereignSeas.isWritePending || 
    sovereignSeas.isWaitingForTx || 
    stableCoinVote.isWritePending || 
    stableCoinVote.isWaitingForTx;
  
  if (!isMounted) {
    return null;
  }
  
  return (
    <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-800">Vote for Project</h3>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      {/* Project Info */}
      <div className="bg-gray-50 p-3 mx-4 my-3 rounded-lg border border-gray-100">
        <p className="text-gray-700 font-medium">Voting for</p>
        <p className="text-emerald-600 text-lg font-semibold">{projectName}</p>
      </div>
      
      {/* Notification */}
      {notification.message && (
        <div className={`mx-4 mb-3 p-3 rounded-lg ${
          notification.type === 'error' ? 
            'bg-red-50 border border-red-100 text-red-700' : 
            'bg-emerald-50 border border-emerald-100 text-emerald-700'
        } flex items-start`}>
          {notification.type === 'error' ? (
            <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          ) : (
            <Check className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          )}
          <p className="text-sm">{notification.message}</p>
        </div>
      )}
      
      {!showAmountModal ? (
        /* Token Selection View */
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-800">Select Token for Voting</h4>
            <button 
              onClick={handleRefreshBalances}
              className="text-blue-600 hover:text-blue-700 flex items-center text-sm"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Refresh
            </button>
          </div>
          
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Token
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Votes
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {combinedTokens.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                      Loading available tokens...
                    </td>
                  </tr>
                ) : (
                  combinedTokens.map((token) => (
                    <tr key={token.address} className="hover:bg-gray-50">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-2 ${
                            token.type === 'native' ? 'bg-emerald-100' : 'bg-blue-100'
                          }`}>
                            {token.type === 'native' ? (
                              <Wallet className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Coins className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{token.symbol}</div>
                            <div className="text-xs text-gray-500">{token.type === 'native' ? 'Native' : 'Stablecoin'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right text-sm">
                        <span className="font-medium text-gray-900">{parseFloat(token.balance).toFixed(4)}</span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center text-sm">
                        {token.type === 'native' ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800">
                            {voteMultiplier}x
                          </span>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              {voteMultiplier}x
                            </span>
                            <span className="text-xs text-gray-500 mt-1">
                              1 = {parseFloat(token.priceInCelo).toFixed(2)} CELO
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleSelectToken(token)}
                          disabled={isProcessing || parseFloat(token.balance) <= 0}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            parseFloat(token.balance) <= 0 ?
                              'bg-gray-100 text-gray-400 cursor-not-allowed' :
                              token.type === 'native' ?
                                'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' :
                                'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-sm text-amber-700 mb-4">
            <div className="flex items-start">
              <Info className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
              <p>
                Native CELO votes are processed immediately. Stablecoin voting requires token approval first.
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
          >
            Cancel
          </button>
        </div>
      ) : (
        /* Amount Input View */
        <div className="p-4">
          <button
            onClick={handleBackToTokens}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to token selection
          </button>
          
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4">
            <div className="flex items-center mb-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-2 ${
                selectedToken?.type === 'native' ? 'bg-emerald-100' : 'bg-blue-100'
              }`}>
                {selectedToken?.type === 'native' ? (
                  <Wallet className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Coins className="h-4 w-4 text-blue-600" />
                )}
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  Voting with {selectedToken?.symbol}
                </div>
                <div className="text-xs text-gray-500">
                  Balance: {parseFloat(selectedToken?.balance || '0').toFixed(4)} {selectedToken?.symbol}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Amount to Vote
            </label>
            <div className="relative rounded-lg shadow-sm">
              <input
                type="number"
                min="0"
                step="0.01"
                value={voteAmount}
                onChange={(e) => setVoteAmount(e.target.value)}
                className="block w-full pr-20 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="0.00"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-gray-500">{selectedToken?.symbol}</span>
              </div>
            </div>
            
            {voteAmount && parseFloat(voteAmount) > 0 && (
              <div className="mt-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                <div className="flex flex-col">
                  <div className="flex justify-between text-sm text-blue-700">
                    <span>Vote Value:</span>
                    <span className="font-medium">{calculateVoteValue()} votes</span>
                  </div>
                  {selectedToken?.type === 'stablecoin' && (
                    <div className="flex justify-between text-xs text-blue-600 mt-1">
                      <span>CELO Equivalent:</span>
                      <span>
                        {(parseFloat(voteAmount) * parseFloat(selectedToken?.priceInCelo || '0')).toFixed(4)} CELO
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {parseFloat(voteAmount || '0') > parseFloat(selectedToken?.balance || '0') && (
              <div className="mt-2 text-sm text-red-600 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Insufficient balance
              </div>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleVote}
              disabled={
                isProcessing || 
                !voteAmount || 
                parseFloat(voteAmount) <= 0 || 
                parseFloat(voteAmount) > parseFloat(selectedToken?.balance || '0')
              }
              className={`flex-1 py-3 px-6 rounded-lg flex items-center justify-center ${
                isProcessing || !voteAmount || parseFloat(voteAmount) <= 0 || parseFloat(voteAmount) > parseFloat(selectedToken?.balance || '0')
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : selectedToken?.type === 'native'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
              } transition-colors`}
            >
              {isProcessing ? (
                <div className="flex items-center">
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </div>
              ) : (
                <div className="flex items-center">
                  <Award className="h-5 w-5 mr-2" />
                  Confirm Vote
                </div>
              )}
            </button>
            
            <button
              onClick={handleBackToTokens}
              disabled={isProcessing}
              className="py-3 px-6 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}