'use client';

import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  Wallet, 
  X, 
  Copy, 
  ExternalLink, 
  CheckCircle, 
  Send, 
  QrCode, 
  Plus, 
  CreditCard,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw
} from 'lucide-react';
import { Fragment } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { useCeloSwapperV3 } from '../hooks/useCeloSwapperV3';
import { abbreviateAddress } from '@/utils/formatting';

// Define token types for display
type TokenBalance = {
  symbol: string;
  balance: bigint;
  address: string;
  decimals: number;
  name?: string;
  logo?: string;
  formattedBalance?: string;
};

const WalletModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { address } = useAccount();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'tokens' | 'send' | 'receive' | 'add'>('tokens');
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sendAddressInput, setSendAddressInput] = useState('');
  const [sendAmountInput, setSendAmountInput] = useState('');
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  
  // Helper function for BigInt exponentiation
  const bigIntPow = (base: bigint, exponent: bigint): bigint => {
    let result = BigInt(1);
    for (let i = BigInt(0); i < exponent; i++) {
      result *= base;
    }
    return result;
  };

  // Get the celoSwapper hook
  const celoSwapper = useCeloSwapperV3();

  useEffect(() => {
    if (isOpen && address) {
      fetchTokenBalances();
    }
  }, [isOpen, address]);

  const copyToClipboard = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  const fetchTokenBalances = async () => {
    if (!address || !celoSwapper.publicClient) return;
    
    setIsLoading(true);
    try {
      // Load supported tokens
      await celoSwapper.loadSupportedTokens();
      
      const tokens = [
        {
          symbol: 'CELO',
          address: celoSwapper.CELO_ADDRESS,
          decimals: 18,
          name: 'Celo'
        },
        ...celoSwapper.supportedTokens.filter(t => t.toLowerCase() !== celoSwapper.CELO_ADDRESS.toLowerCase())
          .map(tokenAddress => ({
            symbol: celoSwapper.tokenSymbols[tokenAddress] || 'Unknown',
            address: tokenAddress,
            decimals: celoSwapper.tokenDecimals[tokenAddress] || 18,
            name: celoSwapper.tokenSymbols[tokenAddress] || 'Unknown Token'
          }))
      ];
      
      // Fetch balances for all tokens
      const balancesPromises = tokens.map(async (token) => {
        try {
          let balance: bigint;
          
          if (!celoSwapper.publicClient) {
            return {
              ...token,
              balance: BigInt(0),
              formattedBalance: '0'
            };
          }
          
          if (token.address.toLowerCase() === celoSwapper.CELO_ADDRESS.toLowerCase()) {
            balance = await celoSwapper.publicClient.getBalance({
              address: address as `0x${string}`
            });
          } else {
            balance = await celoSwapper.publicClient.readContract({
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
          
          // Format the balance
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
            ...token,
            balance,
            formattedBalance
          };
        } catch (error) {
          console.error(`Error fetching balance for ${token.symbol}:`, error);
          return {
            ...token,
            balance: BigInt(0),
            formattedBalance: '0'
          };
        }
      });
      
      const balances = await Promise.all(balancesPromises);
      
      // Filter out zero balances and sort by value (highest first)
      const nonZeroBalances = balances
        .filter(token => token.balance > BigInt(0))
        .sort((a, b) => {
          // Normalize to 18 decimals for comparison
          const aValue = a.balance * bigIntPow(BigInt(10), BigInt(18 - a.decimals));
          const bValue = b.balance * bigIntPow(BigInt(10), BigInt(18 - b.decimals));
          return bValue > aValue ? 1 : -1;
        });
      
      // Always include CELO even if zero balance
      const celoToken = balances.find(token => token.address.toLowerCase() === celoSwapper.CELO_ADDRESS.toLowerCase());
      if (celoToken && !nonZeroBalances.some(t => t.address.toLowerCase() === celoSwapper.CELO_ADDRESS.toLowerCase())) {
        nonZeroBalances.push(celoToken);
      }
      
      setTokenBalances(nonZeroBalances);
      
      // Set selected token to CELO by default for sending
      if (!selectedToken && nonZeroBalances.length > 0) {
        setSelectedToken(celoSwapper.CELO_ADDRESS);
      }
    } catch (error) {
      console.error('Error fetching token balances:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTokenLogo = (symbol: string) => {
    // Add token logo mapping here - you can replace with actual logos
    const logos: Record<string, string> = {
      'CELO': 'https://cryptologos.cc/logos/celo-celo-logo.png',
      'cUSD': 'https://cryptologos.cc/logos/celo-dollar-cusd-logo.png',
      'cEUR': 'https://cryptologos.cc/logos/celo-euro-ceur-logo.png',
    };
    
    return logos[symbol] || undefined;
  };

  const getTokenColor = (symbol: string) => {
    // Add token color mapping here
    const colors: Record<string, string> = {
      'CELO': 'from-amber-500 to-amber-300 border-amber-400',
      'cUSD': 'from-emerald-500 to-emerald-300 border-emerald-400',
      'cEUR': 'from-blue-500 to-blue-300 border-blue-400',
    };
    
    const defaultColors = [
      'from-purple-500 to-purple-300 border-purple-400',
      'from-pink-500 to-pink-300 border-pink-400',
      'from-indigo-500 to-indigo-300 border-indigo-400',
      'from-sky-500 to-sky-300 border-sky-400',
      'from-cyan-500 to-cyan-300 border-cyan-400',
    ];
    
    return colors[symbol] || defaultColors[Math.floor(symbol.length % defaultColors.length)];
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 -translate-y-10"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 -translate-y-10"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all border border-blue-100 relative">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:rotate-90 transition-all duration-300"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Wallet header */}
                <div className="flex items-center mb-6">
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <Wallet className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      My Wallet
                    </Dialog.Title>
                    <div className="mt-1 flex items-center">
                      <p className="text-sm text-gray-500 mr-2">
                        {address ? abbreviateAddress(address) : 'Not connected'}
                      </p>
                      {address && (
                        <>
                          <button 
                            onClick={copyToClipboard}
                            className="text-blue-500 hover:text-blue-700 transition-colors p-1"
                            title="Copy address"
                          >
                            {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </button>
                          <a
                            href={`https://explorer.celo.org/address/${address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700 transition-colors p-1 ml-1"
                            title="View on explorer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setActiveTab('tokens')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 ${
                        activeTab === 'tokens'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } transition-colors relative flex items-center`}
                    >
                      <Coins className="h-4 w-4 mr-1.5" />
                      Tokens
                      {activeTab === 'tokens' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 transform scale-x-100 rounded-full"></span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('send')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 ${
                        activeTab === 'send'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } transition-colors relative flex items-center`}
                    >
                      <Send className="h-4 w-4 mr-1.5" />
                      Send
                      {activeTab === 'send' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 transform scale-x-100 rounded-full"></span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('receive')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 ${
                        activeTab === 'receive'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } transition-colors relative flex items-center`}
                    >
                      <QrCode className="h-4 w-4 mr-1.5" />
                      Receive
                      {activeTab === 'receive' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 transform scale-x-100 rounded-full"></span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('add')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 ${
                        activeTab === 'add'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } transition-colors relative flex items-center`}
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      Add Funds
                      {activeTab === 'add' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 transform scale-x-100 rounded-full"></span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Token balances tab */}
                {activeTab === 'tokens' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-semibold text-gray-700">Your Assets</h4>
                      <button 
                        onClick={fetchTokenBalances}
                        className="text-blue-600 hover:text-blue-800 text-xs flex items-center"
                        disabled={isLoading}
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                    </div>
                    
                    {isLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                      </div>
                    ) : tokenBalances.length === 0 ? (
                      <div className="bg-gray-50 rounded-xl p-6 text-center">
                        <CreditCard className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-600 mb-3">No tokens found in your wallet</p>
                        <button
                          onClick={() => setActiveTab('add')}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium transition-colors"
                        >
                          Add Funds
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {tokenBalances.map((token) => (
                          <div 
                            key={token.address} 
                            className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 duration-300 overflow-hidden"
                          >
                            <div className="flex items-center p-4">
                              <div className={`h-10 w-10 rounded-lg bg-gradient-to-b ${getTokenColor(token.symbol)} flex items-center justify-center mr-3 shadow-sm`}>
                                {(() => {
                                  const logoUrl = getTokenLogo(token.symbol);
                                  return logoUrl ? (
                                    <img 
                                      src={logoUrl} 
                                      alt={token.symbol} 
                                      className="h-6 w-6" 
                                    />
                                  ) : (
                                    <span className="text-white font-bold text-sm">
                                      {token.symbol.substring(0, 2)}
                                    </span>
                                  );
                                })()}
                              </div>
                              <div className="flex-grow">
                                <h3 className="font-semibold text-gray-800">{token.symbol}</h3>
                                <p className="text-sm text-gray-500">{token.name}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-800">
                                  {token.formattedBalance}
                                </p>
                                <div className="flex justify-end mt-2 space-x-1">
                                  <button
                                    onClick={() => {
                                      setSelectedToken(token.address);
                                      setActiveTab('send');
                                    }}
                                    className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                                    title="Send"
                                  >
                                    <ArrowUpRight className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedToken(token.address);
                                      setActiveTab('receive');
                                    }}
                                    className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                                    title="Receive"
                                  >
                                    <ArrowDownLeft className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Send tab */}
                {activeTab === 'send' && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Send Tokens</h4>
                    
                    {/* Token selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Token
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {tokenBalances.map((token) => (
                          <button
                            key={token.address}
                            onClick={() => setSelectedToken(token.address)}
                            className={`py-2 px-3 rounded-lg text-sm border flex items-center justify-center transition-colors ${
                              selectedToken === token.address
                                ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <div className={`h-4 w-4 rounded-full bg-gradient-to-b ${getTokenColor(token.symbol)} mr-1.5 flex items-center justify-center`}>
                              {(() => {
                                const logoUrl = getTokenLogo(token.symbol);
                                return logoUrl ? (
                                  <img src={logoUrl} alt={token.symbol} className="h-3 w-3" />
                                ) : (
                                  <span className="text-white font-bold text-[8px]">{token.symbol.substring(0, 1)}</span>
                                );
                              })()}
                            </div>
                            {token.symbol}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Recipient address */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Recipient Address
                      </label>
                      <input
                        type="text"
                        value={sendAddressInput}
                        onChange={(e) => setSendAddressInput(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={sendAmountInput}
                          onChange={(e) => setSendAmountInput(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-16"
                        />
                        {selectedToken && (
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            {tokenBalances.find(t => t.address === selectedToken)?.symbol || ''}
                          </div>
                        )}
                      </div>
                      {selectedToken && (
                        <div className="mt-1 text-xs text-gray-500 flex justify-between">
                          <span>Balance: {tokenBalances.find(t => t.address === selectedToken)?.formattedBalance || '0'}</span>
                          <button 
                            className="text-blue-600"
                            onClick={() => {
                              const token = tokenBalances.find(t => t.address === selectedToken);
                              if (token) {
                                setSendAmountInput(token.formattedBalance || '0');
                              }
                            }}
                          >
                            MAX
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Send button */}
                    <button
                      className="w-full py-2.5 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-colors flex items-center justify-center"
                      onClick={() => {
                        alert("This is a demo - send functionality would be implemented here.");
                        // Here you would implement the actual send logic
                      }}
                      disabled={!selectedToken || !sendAddressInput || !sendAmountInput}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Tokens
                    </button>
                  </div>
                )}

                {/* Receive tab */}
                {activeTab === 'receive' && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Receive Tokens</h4>
                    
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col items-center">
                      {address && (
                        <>
                          <div className="mb-4 bg-white p-3 rounded-lg border border-gray-200">
                            <img
                              src={`https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${address}&choe=UTF-8`}
                              alt="QR Code"
                              className="h-48 w-48"
                            />
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">Your wallet address:</p>
                          <div className="bg-white p-2 rounded-lg border border-gray-200 text-xs font-mono w-full text-center break-all">
                            {address}
                          </div>
                          
                          <button
                            onClick={copyToClipboard}
                            className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium transition-colors flex items-center"
                          >
                            {copied ? <CheckCircle className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
                            {copied ? 'Copied!' : 'Copy Address'}
                          </button>
                        </>
                      )}
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> Only send tokens on the Celo network to this address. 
                        Sending tokens from other blockchains may result in permanent loss.
                      </p>
                    </div>
                  </div>
                )}

                {/* Add Funds tab */}
                {activeTab === 'add' && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Add Funds to Wallet</h4>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 flex items-center">
                        <div className="bg-white rounded-full p-3 mr-4 shadow-sm">
                          <CreditCard className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800 mb-1">Buy Crypto with Card</h3>
                          <p className="text-sm text-gray-600">Purchase CELO or cUSD with your credit/debit card</p>
                        </div>
                      </div>
                      
                      <a 
                        href="https://fonbank.com" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-100 flex items-center hover:shadow-md transition-all duration-300"
                      >
                        <div className="bg-white rounded-full p-3 mr-4 shadow-sm">
                          <svg className="h-6 w-6 text-amber-600" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M4 10h16v8H4zM4 6h16v2H4z" fillOpacity="0.3" />
                            <path d="M6 14h10v1H6z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800 mb-1">Fonbank</h3>
                          <p className="text-sm text-gray-600">Easy, fast, and secure on-ramp to crypto</p>
                        </div>
                        <ExternalLink className="h-4 w-4 ml-auto text-amber-600" />
                      </a>
                      
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100 flex items-center">
                        <div className="bg-white rounded-full p-3 mr-4 shadow-sm">
                          <ArrowDownLeft className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800 mb-1">Receive from Another Wallet</h3>
                          <p className="text-sm text-gray-600">Transfer from an existing crypto wallet</p>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setActiveTab('receive')}
                      className="w-full py-2.5 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-colors flex items-center justify-center"
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Show My Address
                    </button>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default WalletModal;