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
  RefreshCw,
  LogOut,
  AlertCircle,
  ChevronDown,
  Check,
} from 'lucide-react';
import { Fragment } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { formatEther, parseUnits } from 'viem';
import { abbreviateAddress } from '@/utils/formatting';
import { usePrivy } from '@privy-io/react-auth';
import { supportedTokens } from '@/hooks/useSupportedTokens';
import { usePublicClient } from 'wagmi';
import { celo, celoAlfajores } from 'viem/chains';
import { QRCodeSVG } from 'qrcode.react';

// Network configuration using viem chains
const networks = [
  {
    id: celo.id.toString(),
    name: celo.name,
    shortName: 'Celo',
    icon: '/images/celo-logo.png',
    chain: celo,
    explorerUrl: celo.blockExplorers?.default.url || 'https://explorer.celo.org',
    color: 'from-green-400 to-emerald-500',
    isActive: true
  },
  {
    id: celoAlfajores.id.toString(),
    name: celoAlfajores.name,
    shortName: 'Alfajores',
    icon: '/images/alfajores-logo.png',
    chain: celoAlfajores,
    explorerUrl: celoAlfajores.blockExplorers?.default.url || 'https://alfajores.celoscan.io',
    color: 'from-yellow-400 to-orange-500',
    isActive: false
  }
];

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
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { logout } = usePrivy();
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'send' | 'receive' | 'add'>('overview');
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sendAddressInput, setSendAddressInput] = useState('');
  const [sendAmountInput, setSendAmountInput] = useState('');
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState(networks[0]);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  
  // Helper function for BigInt exponentiation
  const bigIntPow = (base: bigint, exponent: bigint): bigint => {
    let result = BigInt(1);
    for (let i = BigInt(0); i < exponent; i++) {
      result *= base;
    }
    return result;
  };

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

  const handleLogout = () => {
    logout();
    onClose();
  };

  const switchNetwork = async (network: typeof networks[0]) => {
    setSelectedNetwork(network);
    setShowNetworkDropdown(false);
    
    try {
      if (walletClient) {
        await walletClient.switchChain({ id: parseInt(network.id) });
      }
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  const fetchTokenBalances = async () => {
    if (!address || !publicClient) return;
    
    setIsLoading(true);
    try {
      const balancesPromises = supportedTokens.map(async (token) => {
        try {
          let balance: bigint;
          
          if (!publicClient) {
            return {
              ...token,
              balance: BigInt(0),
              formattedBalance: '0'
            };
          }
          
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
      
      const nonZeroBalances = balances
        .filter(token => token.balance > BigInt(0))
        .sort((a, b) => {
          const aValue = a.balance * bigIntPow(BigInt(10), BigInt(18 - a.decimals));
          const bValue = b.balance * bigIntPow(BigInt(10), BigInt(18 - b.decimals));
          return bValue > aValue ? 1 : -1;
        });
      
      const celoToken = balances.find(token => token.symbol === 'CELO');
      if (celoToken && !nonZeroBalances.some(t => t.symbol === 'CELO')) {
        nonZeroBalances.push(celoToken);
      }
      
      setTokenBalances(nonZeroBalances);
      
      if (!selectedToken && nonZeroBalances.length > 0) {
        setSelectedToken(celoToken?.address || null);
      }
    } catch (error) {
      console.error('Error fetching token balances:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const getTokenLogo = (symbol: string) => {
    const logos: Record<string, string> = {
      'CELO': '/images/celo.png',
      'cUSD': '/images/cusd.png',
      'cEUR': '/images/celo_logo.svg',
      'cREAL': '/images/celo_logo.svg',
    };
    
    return logos[symbol] || '/images/celo_logo.svg';
  };

  const getTokenColor = (symbol: string) => {
    const colors: Record<string, string> = {
      'CELO': 'bg-emerald-500',
      'cUSD': 'bg-blue-500',
      'cEUR': 'bg-indigo-500',
      'cREAL': 'bg-purple-500',
    };
    
    return colors[symbol] || 'bg-gray-500';
  };

  const handleSendTokens = async () => {
    if (!selectedToken || !address || !sendAddressInput || !sendAmountInput || !publicClient || !walletClient) {
      setSendError("Missing required information");
      return;
    }
    
    try {
      setSendError(null);
      setSendSuccess(null);
      setIsSending(true);
      
      if (!sendAddressInput.startsWith('0x') || sendAddressInput.length !== 42) {
        setSendError("Invalid recipient address");
        setIsSending(false);
        return;
      }

      const selectedTokenInfo = supportedTokens.find(t => t.address.toLowerCase() === selectedToken.toLowerCase());
      if (!selectedTokenInfo) {
        setSendError("Invalid token selected");
        setIsSending(false);
        return;
      }

      let parsedAmount: bigint;
      try {
        parsedAmount = parseUnits(sendAmountInput, selectedTokenInfo.decimals);
      } catch (error) {
        setSendError("Invalid amount");
        setIsSending(false);
        return;
      }

      if (selectedTokenInfo.symbol === 'CELO') {
        const tx = await walletClient.sendTransaction({
          to: sendAddressInput as `0x${string}`,
          value: parsedAmount,
        });
        
        const receipt = await publicClient.waitForTransactionReceipt({ 
          hash: tx 
        });
        
        if (receipt.status === 'success') {
          setSendSuccess(`Successfully sent ${sendAmountInput} CELO`);
          setSendAmountInput('');
          setSendAddressInput('');
          fetchTokenBalances();
        } else {
          setSendError("Transaction failed");
        }
      } else {
        const tx = await walletClient.writeContract({
          address: selectedToken as `0x${string}`,
          abi: [{
            name: 'transfer',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'recipient', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            outputs: [{ name: '', type: 'bool' }]
          }],
          functionName: 'transfer',
          args: [sendAddressInput as `0x${string}`, parsedAmount]
        });
        
        const receipt = await publicClient.waitForTransactionReceipt({ 
          hash: tx 
        });
        
        if (receipt.status === 'success') {
          setSendSuccess(`Successfully sent ${sendAmountInput} ${selectedTokenInfo.symbol}`);
          setSendAmountInput('');
          setSendAddressInput('');
          fetchTokenBalances();
        } else {
          setSendError("Transaction failed");
        }
      }
    } catch (error) {
      console.error('Error sending tokens:', error);
      setSendError("Failed to send tokens. Please try again.");
    } finally {
      setIsSending(false);
    }
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
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-full sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-full sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
                
                {/* Header */}
                <div className="bg-gray-500 px-6 py-4 text-white">
                  <div className="flex items-center justify-between">
                    {/* Wallet Icon */}
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-white" />
                    </div>

                    {/* Wallet Address */}
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-white font-mono">
                        {address ? abbreviateAddress(address) : 'Not connected'}
                      </p>
                      {address && (
                        <button onClick={copyToClipboard} className="p-1 hover:bg-white/20 rounded">
                          {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white" />}
                        </button>
                      )}
                    </div>

                    {/* Close Button */}
                    <button
                      onClick={onClose}
                      className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Main Content */}
                <div className="px-6 py-6">
                  {activeView === 'overview' && (
                    <>
                      {/* Network Selector and Action Buttons */}
                      <div className="flex items-center justify-between mb-6">
                        {/* Network Selector */}
                        <div className="relative">
                          <button
                            onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
                            className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-full border border-gray-200 text-sm hover:bg-gray-200 text-gray-700"
                          >
                            <div className={`w-2 h-2 rounded-full ${selectedNetwork.color.includes('green') ? 'bg-green-400' : 'bg-yellow-400'}`} />
                            <span className="font-medium">{selectedNetwork.shortName}</span>
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          
                          {showNetworkDropdown && (
                            <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 min-w-[140px]">
                              {networks.map((network) => (
                                <button
                                  key={network.id}
                                  onClick={() => switchNetwork(network)}
                                  className="flex items-center w-full px-3 py-2 text-sm hover:bg-gray-50"
                                >
                                  <div className={`w-2 h-2 rounded-full mr-2 ${network.color.includes('green') ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                  <span>{network.shortName}</span>
                                  {selectedNetwork.id === network.id && <Check className="w-3 h-3 ml-auto text-blue-600" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-3">
                          <button
                            onClick={() => setActiveView('send')}
                            className="p-3 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
                            title="Send"
                          >
                            <ArrowUpRight className="w-5 h-5 text-gray-600" />
                          </button>
                          <button
                            onClick={() => setActiveView('receive')}
                            className="p-3 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
                            title="Receive"
                          >
                            <ArrowDownLeft className="w-5 h-5 text-gray-600" />
                          </button>
                          <button
                            onClick={() => setActiveView('add')}
                            className="p-3 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
                            title="Add Funds"
                          >
                            <Plus className="w-5 h-5 text-gray-600" />
                          </button>
                        </div>
                      </div>

                      {/* Token List */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">Assets</h3>
                          <button
                            onClick={fetchTokenBalances}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            disabled={isLoading}
                          >
                            <RefreshCw className={`w-4 h-4 text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
                          </button>
                        </div>

                        {isLoading ? (
                          <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                          </div>
                        ) : tokenBalances.length === 0 ? (
                          <div className="text-center py-8">
                            <Coins className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 text-sm">No tokens found</p>
                          </div>
                        ) : (
                          tokenBalances.map((token) => (
                            <div key={token.address} className="flex items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mr-3 overflow-hidden">
                                <img 
                                  src={getTokenLogo(token.symbol)} 
                                  alt={token.symbol}
                                  className="w-8 h-8 object-contain"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const fallback = target.nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'flex';
                                  }}
                                />
                                <div className={`w-8 h-8 rounded-full ${getTokenColor(token.symbol)} flex items-center justify-center text-white font-bold text-xs hidden`}>
                                  {token.symbol.charAt(0)}
                                </div>
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{token.symbol}</h4>
                                <p className="text-sm text-gray-500">{token.name}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">{token.formattedBalance}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}

                  {activeView === 'send' && (
                    <div className="space-y-6">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setActiveView('overview')}
                          className="p-2 hover:bg-gray-100 rounded-full"
                        >
                          <ArrowDownLeft className="w-5 h-5 transform rotate-180" />
                        </button>
                        <h3 className="text-xl font-bold text-gray-900">Send</h3>
                      </div>

                      {sendError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start">
                          <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-700">{sendError}</p>
                        </div>
                      )}

                      {sendSuccess && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start">
                          <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-green-700">{sendSuccess}</p>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Token</label>
                        <div className="grid grid-cols-2 gap-2">
                          {tokenBalances.map((token) => (
                            <button
                              key={token.address}
                              onClick={() => setSelectedToken(token.address)}
                              className={`p-3 rounded-xl border-2 transition-all ${
                                selectedToken === token.address
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mr-2 overflow-hidden">
                                  <img 
                                    src={getTokenLogo(token.symbol)} 
                                    alt={token.symbol}
                                    className="w-6 h-6 object-contain"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const fallback = target.nextElementSibling as HTMLElement;
                                      if (fallback) fallback.style.display = 'flex';
                                    }}
                                  />
                                  <div className={`w-6 h-6 rounded-full ${getTokenColor(token.symbol)} flex items-center justify-center text-white font-bold text-xs hidden`}>
                                    {token.symbol.charAt(0)}
                                  </div>
                                </div>
                                <div className="text-left">
                                  <p className="font-medium text-sm">{token.symbol}</p>
                                  <p className="text-xs text-gray-500">{token.formattedBalance}</p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Recipient</label>
                        <input
                          type="text"
                          value={sendAddressInput}
                          onChange={(e) => setSendAddressInput(e.target.value)}
                          placeholder="0x..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={sendAmountInput}
                            onChange={(e) => setSendAmountInput(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-4 py-3 pr-16 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          {selectedToken && (
                            <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                              <span className="text-gray-500 text-sm">
                                {tokenBalances.find(t => t.address === selectedToken)?.symbol}
                              </span>
                            </div>
                          )}
                        </div>
                        {selectedToken && (
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-sm text-gray-500">
                              Balance: {tokenBalances.find(t => t.address === selectedToken)?.formattedBalance}
                            </span>
                            <button
                              onClick={() => {
                                const token = tokenBalances.find(t => t.address === selectedToken);
                                if (token) setSendAmountInput(token.formattedBalance || '0');
                              }}
                              className="text-sm text-blue-600 font-medium hover:text-blue-700"
                            >
                              MAX
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleSendTokens}
                        disabled={!selectedToken || !sendAddressInput || !sendAmountInput || isSending}
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {isSending ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5 mr-2" />
                            Send
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {activeView === 'receive' && (
                    <div className="space-y-6">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setActiveView('overview')}
                          className="p-2 hover:bg-gray-100 rounded-full"
                        >
                          <ArrowDownLeft className="w-5 h-5 transform rotate-180" />
                        </button>
                        <h3 className="text-xl font-bold text-gray-900">Receive</h3>
                      </div>

                      <div className="text-center">
                        {address && (
                          <>
                            <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-2xl mb-4">
                              <QRCodeSVG value={address} size={180} />
                            </div>
                            <p className="text-sm text-gray-500 mb-2">Your wallet address</p>
                            <div className="bg-gray-50 p-3 rounded-xl mb-4">
                              <p className="text-sm font-mono break-all">{address}</p>
                            </div>
                            <button
                              onClick={copyToClipboard}
                              className="w-full py-3 bg-blue-600 text-white rounded-2xl font-semibold hover:bg-blue-700 flex items-center justify-center"
                            >
                              {copied ? <CheckCircle className="w-5 h-5 mr-2" /> : <Copy className="w-5 h-5 mr-2" />}
                              {copied ? 'Copied!' : 'Copy Address'}
                            </button>
                          </>
                        )}
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                        <p className="text-sm text-yellow-800">
                          <strong>Warning:</strong> Only send {selectedNetwork.shortName} tokens to this address.
                        </p>
                      </div>
                    </div>
                  )}

                  {activeView === 'add' && (
                    <div className="space-y-6">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setActiveView('overview')}
                          className="p-2 hover:bg-gray-100 rounded-full"
                        >
                          <ArrowDownLeft className="w-5 h-5 transform rotate-180" />
                        </button>
                        <h3 className="text-xl font-bold text-gray-900">Add Funds</h3>
                      </div>

                      <div className="space-y-3">
                        <button className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl text-left transition-colors">
                          <div className="flex items-center">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                              <CreditCard className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">Buy with Card</h4>
                              <p className="text-sm text-gray-500">Purchase crypto with debit/credit card</p>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-gray-400 ml-auto" />
                          </div>
                        </button>
                        <a 

                        
                          href="https://fonbank.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl text-left transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mr-4">
                              <svg className="w-6 h-6 text-orange-600" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M4 10h16v8H4zM4 6h16v2H4z" fillOpacity="0.3" />
                                <path d="M6 14h10v1H6z" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">Fonbank</h4>
                              <p className="text-sm text-gray-500">Easy crypto on-ramp</p>
                            </div>
                            <ExternalLink className="w-5 h-5 text-gray-400 ml-auto" />
                          </div>
                        </a>

                        <button 
                          onClick={() => setActiveView('receive')}
                          className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl text-left transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                              <QrCode className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">Receive Crypto</h4>
                              <p className="text-sm text-gray-500">Transfer from another wallet</p>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-gray-400 ml-auto" />
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100">
                  <button
                    onClick={handleLogout}
                    className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-semibold transition-colors flex items-center justify-center"
                  >
                    <LogOut className="w-5 h-5 mr-2" />
                    Disconnect
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default WalletModal;