import { Disclosure, Transition } from '@headlessui/react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useConnect, useAccount } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { Menu, X, ChevronDown, Globe, Award, Settings, Home, PlusCircle, Info, Waves, AlertTriangle, FileCode, Anchor } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useSovereignSeas } from '../hooks/useSovereignSeas';
import { celo, celoAlfajores } from 'viem/chains';

// Get chain values from environment variables
const CELO_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID as string);
const CHAIN_NAME = process.env.NEXT_PUBLIC_CHAIN_NAME || 'Celo';
const IS_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET === 'true';

// Determine which chain to use based on environment variables
const getChainConfig = () => {
  if (IS_TESTNET) {
    return celoAlfajores;
  }
  return celo;
};

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Campaigns', href: '/campaigns', icon: Globe },
  { name: 'Create', href: '/campaign/create', icon: PlusCircle },
  { name: 'About', href: '/about', icon: Info },
];

export default function Header() {
  const [hideConnectBtn, setHideConnectBtn] = useState(false);
  const { connect } = useConnect();
  const { isConnected } = useAccount();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showChainAlert, setShowChainAlert] = useState(false);
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const pathname = usePathname();
  
  // Use the sovereign seas hook to get the clients
  const { publicClient, walletClient } = useSovereignSeas();

  // Check if user is on the correct chain
  useEffect(() => {
    const checkChain = async () => {
      if (isConnected && publicClient) {
        try {
          // Get the current chain from the public client
          const chainId = await publicClient.getChainId();
          setCurrentChainId(chainId);
          
          if (chainId !== CELO_CHAIN_ID) {
            setShowChainAlert(true);
          } else {
            setShowChainAlert(false);
          }
          console.log("Current chain ID:", chainId);
        } catch (error) {
          console.error("Error getting chain ID:", error);
        }
      }
    };
    
    checkChain();
    
    // Set up interval to periodically check chain
    const interval = setInterval(checkChain, 5000);
    return () => clearInterval(interval);
  }, [isConnected, publicClient]);

  // Handle MiniPay connection
  useEffect(() => {
    if (window.ethereum && window.ethereum.isMiniPay) {
      setHideConnectBtn(true);
      connect({ connector: injected({ target: 'metaMask' }) });
    }
  }, [connect]);

  // Function to switch to the correct chain using the viem wallet client
  const handleSwitchToNetwork = async () => {
    if (!walletClient) {
      console.error("Wallet client not available");
      return;
    }
    
    try {
      await walletClient.switchChain({ id: CELO_CHAIN_ID });
      setShowChainAlert(false);
    } catch (error) {
      console.error(`Error switching to ${CHAIN_NAME}:`, error);
      
      // If chain doesn't exist in the wallet, try to add it
      if ((error as any).code === 4902) { // Chain doesn't exist
        try {
          const chainConfig = getChainConfig();
          
          await walletClient.addChain({
            chain: chainConfig
          });
          // Try switching again after adding
          await walletClient.switchChain({ id: CELO_CHAIN_ID });
        } catch (addError) {
          console.error(`Error adding ${CHAIN_NAME} chain:`, addError);
        }
      }
    }
  };

  return (
    <div className="relative z-50">
      {/* Chain Warning Alert */}
      {showChainAlert && (
        <div className="bg-amber-500 text-slate-900 py-2 px-4 flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <span className="font-medium">This app only supports the {CHAIN_NAME} network{IS_TESTNET ? ' (Testnet)' : ''}.</span>
          <button 
            onClick={handleSwitchToNetwork}
            className="ml-3 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1 rounded-full text-sm font-medium transition-colors"
          >
            Switch to {CHAIN_NAME}
          </button>
        </div>
      )}

      {/* Shadow element for raised effect - Blue version */}
      <div className="absolute inset-x-0 h-3 bottom-0 translate-y-full bg-gradient-to-b from-blue-800/30 to-transparent pointer-events-none"></div>
      
      {/* Animated wave decoration at the bottom of the header */}
      <div className="absolute left-0 right-0 bottom-0 translate-y-full h-4 wave-border opacity-30 pointer-events-none"></div>
      
      <Disclosure as="nav" className="bg-gradient-to-r from-blue-600 to-blue-500 border-b border-blue-700/30 shadow-xl sticky top-0 z-50">
        {({ open }) => (
          <>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="relative flex h-16 items-center justify-between">
                <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                  {/* Mobile menu button with ripple effect */}
                  <Disclosure.Button className="inline-flex items-center justify-center rounded-full p-2 text-white hover:bg-blue-600/30 transition-all duration-300 transform active:scale-95 relative overflow-hidden premium-button">
                    <span className="sr-only">Open main menu</span>
                    {open ? (
                      <X className="block h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Menu className="block h-5 w-5" aria-hidden="true" />
                    )}
                  </Disclosure.Button>
                </div>
                
                {/* Logo and desktop navigation */}
                <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
                  <Link href="/" className="flex items-center group">
                    <div className="relative h-10 w-10 mr-2 animate-float-slow">
                      <div className="absolute inset-0 rounded-full bg-white/30 animate-pulse-blue"></div>
                      <div className="absolute inset-0.5 rounded-full bg-white flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300">
                        <Anchor className="h-5 w-5 text-blue-500" />
                      </div>
                    </div>
                    <span className="text-xl font-bold text-white tilt-neon relative">
                      <span className="hidden sm:inline opacity-90 group-hover:opacity-100 transition-opacity">Sovereign</span> 
                      <span className="text-white group-hover:text-sky-100 transition-colors">Seas</span>
                      <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white/30 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                    </span>
                  </Link>
                  
                  {/* Desktop Navigation Links */}
                  <div className="hidden sm:ml-8 sm:flex sm:space-x-2">
                    {navigation.map((item, index) => {
                      const NavIcon = item.icon;
                      const isActive = pathname === item.href || 
                                      (item.href !== '/' && pathname?.startsWith(item.href));
                      const animationDelay = `${index * 0.1}s`;
                      
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          style={{ animationDelay }}
                          className={`
                            px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center relative
                            ${isActive 
                              ? 'bg-white text-blue-700 shadow-md transform hover:-translate-y-1' 
                              : 'text-white hover:bg-blue-600/20 hover:-translate-y-1'}
                            animate-float-delay-${index+1}
                          `}
                        >
                          <NavIcon className={`h-4 w-4 mr-1.5 ${isActive ? 'text-blue-500' : ''} transition-transform group-hover:rotate-3`} />
                          <span className={isActive ? 'font-semibold' : ''}>
                            {item.name}
                          </span>
                          
                          {/* Active indicator */}
                          {isActive && (
                            <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-glow-blue"></span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
                
                {/* Right side - Connect Wallet & User Menu */}
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
                  {/* Network Badge */}
                  <div className="mr-2 hidden sm:flex items-center rounded-full bg-white/20 text-white px-3 py-1 text-xs border border-white/10 shadow-inner animate-float-delay-4">
                    <span className="h-2 w-2 rounded-full bg-blue-200 mr-1.5 animate-pulse"></span>
                    {CHAIN_NAME} {IS_TESTNET ? 'Testnet' : ''}
                  </div>
                  
                  {isConnected && (
                    <div className="relative mr-2">
                      <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="flex items-center bg-white/20 hover:bg-white/30 text-white rounded-full py-1.5 px-3 text-sm transition-all duration-300 border border-white/10 shadow-md hover:shadow-xl hover:-translate-y-1 premium-button"
                      >
                        <Waves className="h-4 w-4 mr-1.5 animate-float-slow" />
                        Dashboard
                        <ChevronDown className={`ml-1 h-3 w-3 transform transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {/* Dropdown Menu with enhanced animation */}
                      <Transition
                        show={showDropdown}
                        enter="transition ease-out duration-200"
                        enterFrom="transform opacity-0 scale-95 translate-y-2"
                        enterTo="transform opacity-100 scale-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="transform opacity-100 scale-100 translate-y-0"
                        leaveTo="transform opacity-0 scale-95 translate-y-2"
                      >
                        <div 
                          className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-2xl py-1 z-50 border border-blue-100 water-card"
                          onMouseLeave={() => setShowDropdown(false)}
                        >
                          <Link
                            href="/campaign/mycampaigns"
                            className="flex items-center px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors duration-200 hover:text-blue-700 group"
                          >
                            <Globe className="mr-1.5 h-4 w-4 text-blue-500 transition-transform duration-300 group-hover:rotate-12" />
                            My Campaigns
                          </Link>
                          <Link
                            href="/votes"
                            className="flex items-center px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors duration-200 hover:text-blue-700 group"
                          >
                            <Award className="mr-1.5 h-4 w-4 text-blue-500 transition-transform duration-300 group-hover:rotate-12" />
                            My Votes
                          </Link>
                          <Link
                            href="/myprojects"
                            className="flex items-center px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors duration-200 hover:text-blue-700 group"
                          >
                            <FileCode className="mr-1.5 h-4 w-4 text-blue-500 transition-transform duration-300 group-hover:rotate-12" />
                            My Projects
                          </Link>
                        </div>
                      </Transition>
                    </div>
                  )}
                  
                  {!hideConnectBtn && (
                    <div className="custom-connect-button">
                      <ConnectButton.Custom>
                        {({
                          account,
                          chain,
                          openAccountModal,
                          openChainModal,
                          openConnectModal,
                          mounted,
                        }) => {
                          const ready = mounted;
                          const connected = ready && account && chain;
                          
                          return (
                            <div
                              {...(!ready && {
                                'aria-hidden': true,
                                style: {
                                  opacity: 0,
                                  pointerEvents: 'none',
                                  userSelect: 'none',
                                },
                              })}
                            >
                              {(() => {
                                if (!connected) {
                                  return (
                                    <button 
                                      onClick={openConnectModal} 
                                      className="bg-white text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-xl border border-blue-100 hover:-translate-y-1 animate-float premium-button"
                                    >
                                      Connect Wallet
                                    </button>
                                  );
                                }
                                
                                if (chain.id !== CELO_CHAIN_ID) {
                                  return (
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={handleSwitchToNetwork}
                                        className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-white px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-xl border border-amber-400 hover:-translate-y-1 premium-button"
                                      >
                                        <AlertTriangle size={16} />
                                        Switch to {CHAIN_NAME}
                                      </button>
                                    </div>
                                  );
                                }
                                
                                return (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={openAccountModal}
                                      className="flex items-center bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border border-white/10 shadow-lg hover:shadow-xl hover:-translate-y-1 premium-button"
                                    >
                                      {account.displayName}
                                    </button>
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        }}
                      </ConnectButton.Custom>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile menu with enhanced animations */}
            <Disclosure.Panel className="sm:hidden">
              <div className="space-y-1 px-3 pt-2 pb-3">
                {/* Mobile Network Badge */}
                <div className="mb-3 flex items-center justify-center rounded-full bg-white/20 text-white px-3 py-1.5 text-sm border border-white/10 shadow-inner">
                  <span className="h-2 w-2 rounded-full bg-blue-200 mr-1.5 animate-pulse"></span>
                  {CHAIN_NAME} {IS_TESTNET ? 'Testnet' : ''} Only
                </div>
                
                {navigation.map((item, index) => {
                  const NavIcon = item.icon;
                  const isActive = pathname === item.href || 
                                 (item.href !== '/' && pathname?.startsWith(item.href));
                  return (
                    <Disclosure.Button
                      key={item.name}
                      as={Link}
                      href={item.href}
                      className={`
                        flex items-center px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 relative
                        ${isActive 
                          ? 'bg-white text-blue-700 shadow-lg' 
                          : 'text-white hover:bg-blue-600/20'
                        }
                      `}
                      style={{
                        animationDelay: `${index * 0.1}s`,
                        animation: 'fadeSlideIn 0.3s ease-out forwards',
                        opacity: 0,
                        transform: 'translateY(10px)'
                      }}
                    >
                      <NavIcon className={`h-4 w-4 mr-2 ${isActive ? 'text-blue-500' : ''}`} />
                      {item.name}
                      
                      {/* Active indicator */}
                      {isActive && (
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-glow-blue"></span>
                      )}
                    </Disclosure.Button>
                  );
                })}
                
                {isConnected && (
                  <>
                    <div className="mt-3 pt-3 border-t border-white/20">
                      <div className="px-2 text-xs uppercase text-white/70 font-semibold">
                        My Account
                      </div>
                      <Disclosure.Button
                        as={Link}
                        href="/campaign/mycampaigns"
                        className="flex items-center mt-1.5 px-3 py-2 rounded-full text-sm font-medium text-white hover:bg-blue-600/20 transition-all duration-300"
                        style={{
                          animation: 'fadeSlideIn 0.3s ease-out forwards',
                          animationDelay: '0.4s',
                          opacity: 0,
                          transform: 'translateY(10px)'
                        }}
                      >
                        <Globe className="mr-2 h-4 w-4 text-blue-300" />
                        My Campaigns
                      </Disclosure.Button>
                      <Disclosure.Button
                        as={Link}
                        href="/votes"
                        className="flex items-center px-3 py-2 rounded-full text-sm font-medium text-white hover:bg-blue-600/20 transition-all duration-300"
                        style={{
                          animation: 'fadeSlideIn 0.3s ease-out forwards',
                          animationDelay: '0.5s',
                          opacity: 0,
                          transform: 'translateY(10px)'
                        }}
                      >
                        <Award className="mr-2 h-4 w-4 text-blue-300" />
                        My Votes
                      </Disclosure.Button>
                      <Disclosure.Button
                        as={Link}
                        href="/myprojects"
                        className="flex items-center px-3 py-2 rounded-full text-sm font-medium text-white hover:bg-blue-600/20 transition-all duration-300"
                        style={{
                          animation: 'fadeSlideIn 0.3s ease-out forwards',
                          animationDelay: '0.6s',
                          opacity: 0,
                          transform: 'translateY(10px)'
                        }}
                      >
                        <FileCode className="mr-2 h-4 w-4 text-blue-300" />
                        My Projects
                      </Disclosure.Button>
                    </div>
                  </>
                )}
              </div>
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>
    </div>
  );
}