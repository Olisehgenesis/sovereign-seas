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
import { publicClient } from '@/utils/clients';
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

// Tab configuration
const tabs = [
  { id: 'tokens', label: 'Assets', icon: Coins },
  { id: 'send', label: 'Send', icon: Send },
  { id: 'receive', label: 'Receive', icon: QrCode },
  { id: 'add', label: 'Add Funds', icon: Plus }
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
  const { logout } = usePrivy();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'tokens' | 'send' | 'receive' | 'add'>('tokens');
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
    
    // Add actual network switching logic here using wagmi
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
      // Fetch balances for all supported tokens
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
      const celoToken = balances.find(token => token.symbol === 'CELO');
      if (celoToken && !nonZeroBalances.some(t => t.symbol === 'CELO')) {
        nonZeroBalances.push(celoToken);
      }
      
      setTokenBalances(nonZeroBalances);
      
      // Set selected token to CELO by default for sending
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
    // Token logo mapping using images folder
    const logos: Record<string, string> = {
      'CELO': '/images/celo-token.png',
      'cUSD': '/images/cusd-token.png',
      'cEUR': '/images/ceur-token.png',
      'cREAL': '/images/creal-token.png',
    };
    
    return logos[symbol] || '/images/default-token.png';
  };

  const getTokenColor = (symbol: string) => {
    // Add token color mapping here
    const colors: Record<string, string> = {
      'CELO': 'from-green-400 to-emerald-500',
      'cUSD': 'from-blue-400 to-blue-500',
      'cEUR': 'from-indigo-400 to-indigo-500',
      'cREAL': 'from-purple-400 to-purple-500',
    };
    
    const defaultColors = [
      'from-gray-400 to-gray-500',
      'from-pink-400 to-pink-500',
      'from-cyan-400 to-cyan-500',
      'from-orange-400 to-orange-500',
    ];
    
    return colors[symbol] || defaultColors[Math.floor(symbol.length % defaultColors.length)];
  };

  // Function to handle sending tokens
  const handleSendTokens = async () => {
    if (!selectedToken || !address || !sendAddressInput || !sendAmountInput || !publicClient || !walletClient) {
      setSendError("Missing required information");
      return;
    }
    
    try {
      setSendError(null);
      setSendSuccess(null);
      setIsSending(true);
      
      // Validate address
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

      // Parse amount
      let parsedAmount: bigint;
      try {
        parsedAmount = parseUnits(sendAmountInput, selectedTokenInfo.decimals);
      } catch (error) {
        setSendError("Invalid amount");
        setIsSending(false);
        return;
      }

      // Execute transaction based on token type
      if (selectedTokenInfo.symbol === 'CELO') {
        // Native CELO transfer
        const tx = await walletClient.sendTransaction({
          to: sendAddressInput as `0x${string}`,
          value: parsedAmount,
        });
        
        // Wait for transaction
        const receipt = await publicClient.waitForTransactionReceipt({ 
          hash: tx 
        });
        
        if (receipt.status === 'success') {
          setSendSuccess(`Successfully sent ${sendAmountInput} CELO to ${abbreviateAddress(sendAddressInput)}`);
          // Reset form
          setSendAmountInput('');
          setSendAddressInput('');
          // Refresh balances
          fetchTokenBalances();
        } else {
          setSendError("Transaction failed");
        }
      } else {
        // ERC20 token transfer
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
        
        // Wait for transaction
        const receipt = await publicClient.waitForTransactionReceipt({ 
          hash: tx 
        });
        
        if (receipt.status === 'success') {
          setSendSuccess(`Successfully sent ${sendAmountInput} ${selectedTokenInfo.symbol} to ${abbreviateAddress(sendAddressInput)}`);
          // Reset form
          setSendAmountInput('');
          setSendAddressInput('');
          // Refresh balances
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-3xl bg-white/95 backdrop-blur-xl shadow-2xl transition-all border border-blue-100/50 relative">
                
                {/* Header */}
                <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 py-8 text-white">
                  {/* Close button */}
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all duration-300"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  {/* Network Switcher */}
                  <div className="relative mb-6">
                    <button
                      onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
                      className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium hover:bg-white/20 transition-all duration-300"
                    >
                      <img 
                        src={selectedNetwork.icon} 
                        alt={selectedNetwork.shortName} 
                        className="h-5 w-5 mr-2 rounded-full"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                      <span className="mr-2">{selectedNetwork.shortName}</span>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${showNetworkDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    <Transition
                      show={showNetworkDropdown}
                      enter="transition ease-out duration-200"
                      enterFrom="transform opacity-0 scale-95 translate-y-1"
                      enterTo="transform opacity-100 scale-100 translate-y-0"
                      leave="transition ease-in duration-150"
                      leaveFrom="transform opacity-100 scale-100 translate-y-0"
                      leaveTo="transform opacity-0 scale-95 translate-y-1"
                    >
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-blue-100/50 py-2 z-50">
                        {networks.map((network) => (
                          <button
                            key={network.id}
                            onClick={() => switchNetwork(network)}
                            className="flex items-center w-full px-4 py-3 text-gray-700 hover:bg-blue-50/80 transition-all duration-300 group"
                          >
                            <img 
                              src={network.icon} 
                              alt={network.shortName} 
                              className="h-6 w-6 mr-3 rounded-full"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div className="text-left">
                              <div className="font-medium">{network.shortName}</div>
                              <div className="text-xs text-gray-500">{network.name}</div>
                            </div>
                            {selectedNetwork.id === network.id && (
                              <Check className="h-4 w-4 ml-auto text-blue-600" />
                            )}
                          </button>
                        ))}
                      </div>
                    </Transition>
                  </div>

                  {/* Wallet Info */}
                  <div className="flex items-start">
                    <div className="relative">
                      <div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-4 border border-white/30">
                        <Wallet className="h-8 w-8 text-white" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
                        <div className="h-2 w-2 bg-white rounded-full"></div>
                      </div>
                    </div>
                    <div className="flex-grow">
                      <Dialog.Title as="h3" className="text-xl font-bold mb-2">
                        My Wallet
                      </Dialog.Title>
                      <div className="flex items-center">
                        <p className="text-white/90 text-sm font-mono mr-2">
                          {address ? abbreviateAddress(address) : 'Not connected'}
                        </p>
                        {address && (
                          <div className="flex items-center space-x-1">
                            <button 
                              onClick={copyToClipboard}
                              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300"
                              title="Copy address"
                            >
                              {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </button>
                            <a
                              href={`${selectedNetwork.explorerUrl}/address/${address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300"
                              title="View on explorer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content Area */}
                <div className="flex">
                  {/* Vertical Sidebar Tabs */}
                  <div className="w-20 bg-gray-50/80 backdrop-blur-sm border-r border-gray-100">
                    <div className="flex flex-col py-4">
                      {tabs.map((tab) => {
                        const TabIcon = tab.icon;
                        const isActive = activeTab === tab.id;
                        
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`relative flex flex-col items-center justify-center px-3 py-4 text-xs font-medium transition-all duration-300 group ${
                              isActive 
                                ? 'text-blue-600 bg-blue-50/80' 
                                : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50/50'
                            }`}
                          >
                            {isActive && (
                              <div className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-r-full"></div>
                            )}
                            <TabIcon className={`h-6 w-6 mb-1 transition-all duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                            <span className="leading-tight">{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 p-6">
                    {/* Token balances tab */}
                    {activeTab === 'tokens' && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-lg font-bold text-gray-800">Assets</h4>
                          <button 
                            onClick={fetchTokenBalances}
                            className="flex items-center px-3 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full text-sm font-medium transition-all duration-300"
                            disabled={isLoading}
                          >
                            <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                          </button>
                        </div>
                        
                        {isLoading ? (
                          <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                          </div>
                        ) : tokenBalances.length === 0 ? (
                          <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl p-8 text-center">
                            <div className="h-16 w-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                              <CreditCard className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="text-gray-600 mb-4 font-medium">No tokens found</p>
                            <button
                              onClick={() => setActiveTab('add')}
                              className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full font-medium hover:shadow-lg transition-all duration-300"
                            >
                              Add Funds
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {tokenBalances.map((token) => (
                              <div 
                                key={token.address} 
                                className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 overflow-hidden"
                              >
                                <div className="flex items-center p-4">
                                  <div className="relative">
                                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${getTokenColor(token.symbol)} flex items-center justify-center shadow-sm`}>
                                      <img 
                                        src={getTokenLogo(token.symbol)} 
                                        alt={token.symbol} 
                                        className="h-8 w-8 rounded-lg"
                                        onError={(e) => {
                                          (e.currentTarget as HTMLElement).style.display = 'none';
                                          (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block';
                                        }}
                                      />
                                      <span className="text-white font-bold text-sm hidden">
                                        {token.symbol.substring(0, 2)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex-grow ml-4">
                                    <h3 className="font-bold text-gray-800">{token.symbol}</h3>
                                    <p className="text-sm text-gray-500">{token.name}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-gray-800 text-lg">
                                      {token.formattedBalance}
                                    </p>
                                    <div className="flex justify-end mt-2 space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                      <button
                                        onClick={() => {
                                          setSelectedToken(token.address);
                                          setActiveTab('send');
                                        }}
                                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-300"
                                        title="Send"
                                      >
                                        <ArrowUpRight className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedToken(token.address);
                                          setActiveTab('receive');
                                        }}
                                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-300"
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
                      <div className="space-y-6">
                        <h4 className="text-lg font-bold text-gray-800">Send Tokens</h4>
                        
                        {/* Status messages */}
                        {sendError && (
                          <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-start">
                            <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700 font-medium">{sendError}</p>
                          </div>
                        )}
                        
                        {sendSuccess && (
                          <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-start">
                            <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-green-700 font-medium">{sendSuccess}</p>
                          </div>
                        )}
                        
                        {/* Token selection */}
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-3">
                            Select Token
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            {tokenBalances.map((token) => (
                              <button
                                key={token.address}
                                onClick={() => setSelectedToken(token.address)}
                                className={`p-4 rounded-2xl border-2 flex items-center transition-all duration-300 ${
                                  selectedToken === token.address
                                    ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-lg scale-105'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                                }`}
                              >
                                <img 
                                  src={getTokenLogo(token.symbol)} 
                                  alt={token.symbol} 
                                  className="h-8 w-8 mr-3 rounded-lg"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                />
                                <div className="text-left">
                                  <div className="font-bold">{token.symbol}</div>
                                  <div className="text-xs opacity-70">{token.formattedBalance}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Recipient address */}
                        <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Amount
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={sendAmountInput}
                              onChange={(e) => setSendAmountInput(e.target.value)}
                              placeholder="0.00"
                              className="w-full px-4 py-3 pr-20 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm"
                            />
                            {selectedToken && (
                              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                <span className="text-gray-500 font-medium">
                                  {tokenBalances.find(t => t.address === selectedToken)?.symbol || ''}
                                </span>
                              </div>
                            )}
                          </div>
                          {selectedToken && (
                            <div className="mt-2 flex justify-between items-center text-sm">
                              <span className="text-gray-500">
                                Balance: {tokenBalances.find(t => t.address === selectedToken)?.formattedBalance || '0'}
                              </span>
                              <button 
                                className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full font-medium hover:bg-blue-200 transition-colors duration-300"
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
                          className={`w-full py-4 mt-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-bold transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl hover:-translate-y-1 ${isSending ? 'opacity-70 cursor-not-allowed' : ''}`}
                          onClick={handleSendTokens}
                          disabled={!selectedToken || !sendAddressInput || !sendAmountInput || isSending}
                        >
                          {isSending ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <Send className="h-5 w-5 mr-3" />
                              Send Tokens
                            </>
                          )}
                        </button>
                        
                        {/* Transaction tips */}
                        <div className="bg-blue-50/80 backdrop-blur-sm p-4 rounded-2xl border border-blue-100">
                          <p className="text-sm text-blue-700">
                            <strong>💡 Tip:</strong> Double-check the recipient address before sending. Blockchain transactions cannot be reversed.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Receive tab */}
                    {activeTab === 'receive' && (
                      <div className="space-y-6">
                        <h4 className="text-lg font-bold text-gray-800">Receive Tokens</h4>
                        
                        <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 p-6 rounded-3xl border border-gray-100 flex flex-col items-center">
                          {address && (
                            <>
                              <div className="mb-6 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                                <QRCodeSVG
                                  value={address}
                                  size={192}
                                  level="H"
                                  includeMargin={true}
                                  className="rounded-xl"
                                />
                              </div>
                              
                              <p className="text-sm font-medium text-gray-600 mb-3">Your wallet address:</p>
                              <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-gray-200 text-sm font-mono w-full text-center break-all mb-4">
                                {address}
                              </div>
                              
                              <button
                                onClick={copyToClipboard}
                                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-bold transition-all duration-300 flex items-center shadow-lg hover:shadow-xl hover:-translate-y-1"
                              >
                                {copied ? <CheckCircle className="h-5 w-5 mr-2" /> : <Copy className="h-5 w-5 mr-2" />}
                                {copied ? 'Copied!' : 'Copy Address'}
                              </button>
                            </>
                          )}
                        </div>
                        
                        <div className="bg-blue-50/80 backdrop-blur-sm p-4 rounded-2xl border border-blue-100">
                          <p className="text-sm text-blue-800">
                            <strong>⚠️ Important:</strong> Only send tokens on the {selectedNetwork.shortName} network to this address. 
                            Sending tokens from other blockchains may result in permanent loss.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Add Funds tab */}
                    {activeTab === 'add' && (
                      <div className="space-y-6">
                        <h4 className="text-lg font-bold text-gray-800">Add Funds</h4>
                        
                        <div className="space-y-4">
                          <div className="group bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-3xl border border-blue-100 hover:shadow-lg transition-all duration-300 cursor-pointer">
                            <div className="flex items-center">
                              <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                                <CreditCard className="h-7 w-7 text-white" />
                              </div>
                              <div className="flex-grow">
                                <h3 className="font-bold text-gray-800 mb-1">Buy Crypto with Card</h3>
                                <p className="text-sm text-gray-600">Purchase CELO or cUSD with your credit/debit card</p>
                              </div>
                              <ArrowUpRight className="h-5 w-5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>
                          </div>
                          
                          <a 
                            href="https://fonbank.com" 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-3xl border border-amber-100 hover:shadow-lg transition-all duration-300"
                          >
                            <div className="flex items-center">
                              <div className="h-14 w-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                                <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M4 10h16v8H4zM4 6h16v2H4z" fillOpacity="0.3" />
                                  <path d="M6 14h10v1H6z" />
                                </svg>
                              </div>
                              <div className="flex-grow">
                                <h3 className="font-bold text-gray-800 mb-1">Fonbank</h3>
                                <p className="text-sm text-gray-600">Easy, fast, and secure on-ramp to crypto</p>
                              </div>
                              <ExternalLink className="h-5 w-5 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>
                          </a>
                          
                          <div className="group bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-3xl border border-green-100 hover:shadow-lg transition-all duration-300 cursor-pointer">
                            <div className="flex items-center">
                              <div className="h-14 w-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                                <ArrowDownLeft className="h-7 w-7 text-white" />
                              </div>
                              <div className="flex-grow">
                                <h3 className="font-bold text-gray-800 mb-1">Receive from Another Wallet</h3>
                                <p className="text-sm text-gray-600">Transfer from an existing crypto wallet</p>
                              </div>
                              <ArrowUpRight className="h-5 w-5 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => setActiveTab('receive')}
                          className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-bold transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl hover:-translate-y-1"
                        >
                          <QrCode className="h-5 w-5 mr-3" />
                          Show My Address
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50/80 backdrop-blur-sm border-t border-gray-100">
                  <button
                    onClick={handleLogout}
                    className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center border border-red-100"
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    Disconnect Wallet
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