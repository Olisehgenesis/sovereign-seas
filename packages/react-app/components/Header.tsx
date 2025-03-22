import { Disclosure, Transition } from '@headlessui/react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useConnect, useAccount } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { Menu, X, ChevronDown, Globe, Award, Settings, Home, PlusCircle, Info, Waves, AlertTriangle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useSovereignSeas } from '../hooks/useSovereignSeas';
import { celo } from 'viem/chains';

//get chain id from .env
const CELO_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CELO_CHAIN_ID as string);

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
  const { publicClient, walletClient } = useSovereignSeas({
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`,
    celoTokenAddress: process.env.NEXT_PUBLIC_CELO_TOKEN_ADDRESS as `0x${string}`,
  });

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

  // Function to switch to Celo using the viem wallet client
  const handleSwitchToCelo = async () => {
    if (!walletClient) {
      console.error("Wallet client not available");
      return;
    }
    
    try {
      await walletClient.switchChain({ id: CELO_CHAIN_ID });
      setShowChainAlert(false);
    } catch (error) {
      console.error("Error switching to Celo:", error);
      
      // If chain doesn't exist in the wallet, try to add it
      if ((error as any).code === 4902) { // Chain doesn't exist
        try {
          await walletClient.addChain({
            chain: celo
          });
          // Try switching again after adding
          await walletClient.switchChain({ id: CELO_CHAIN_ID });
        } catch (addError) {
          console.error("Error adding Celo chain:", addError);
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
          <span className="font-medium">This app only supports the Celo network.</span>
          <button 
            onClick={handleSwitchToCelo}
            className="ml-3 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
          >
            Switch to Celo
          </button>
        </div>
      )}

      {/* Shadow element for raised effect */}
      <div className="absolute inset-x-0 h-1.5 bottom-0 translate-y-full bg-gradient-to-b from-black/20 to-transparent pointer-events-none"></div>
      
      <Disclosure as="nav" className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-lime-600/30 shadow-lg sticky top-0 z-50">
        {({ open }) => (
          <>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="relative flex h-14 items-center justify-between">
                <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                  {/* Mobile menu button */}
                  <Disclosure.Button className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white">
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
                  <Link href="/" className="flex items-center">
                    <div className="relative h-8 w-8 mr-2">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-lime-500 to-yellow-500 animate-pulse-slow opacity-40"></div>
                      <div className="absolute inset-0.5 rounded-full bg-slate-900 flex items-center justify-center">
                        <Image 
                          src="/logo.svg" 
                          alt="Sovereign Seas Logo"
                          width={16}
                          height={16}
                          className="h-4 w-4"
                        />
                      </div>
                    </div>
                    <span className="text-xl font-bold text-white">
                      <span className="hidden sm:inline">Sovereign</span> <span className="text-yellow-400">Seas</span>
                    </span>
                  </Link>
                  
                  {/* Desktop Navigation Links */}
                  <div className="hidden sm:ml-8 sm:flex sm:space-x-1">
                    {navigation.map((item) => {
                      const NavIcon = item.icon;
                      const isActive = pathname === item.href || 
                                      (item.href !== '/' && pathname?.startsWith(item.href));
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`
                            px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 flex items-center
                            ${isActive 
                              ? 'bg-lime-600/20 text-lime-400 border border-lime-500/30' 
                              : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'}
                          `}
                        >
                          <NavIcon className="h-3.5 w-3.5 mr-1.5" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
                
                {/* Right side - Connect Wallet & User Menu */}
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
                  {/* Celo Network Badge */}
                  <div className="mr-2 hidden sm:flex items-center rounded-full bg-lime-600/20 text-lime-400 px-2.5 py-0.5 text-xs border border-lime-500/30">
                    <span className="h-2 w-2 rounded-full bg-lime-400 mr-1.5"></span>
                    Celo Only
                  </div>
                  
                  {isConnected && (
                    <div className="relative mr-2">
                      <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="flex items-center bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md py-1 px-2 text-xs transition-colors"
                      >
                        <Waves className="h-3.5 w-3.5 mr-1 text-lime-400" />
                        Dashboard
                        <ChevronDown className={`ml-1 h-3 w-3 transform transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {/* Dropdown Menu */}
                      <Transition
                        show={showDropdown}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <div 
                          className="absolute right-0 mt-1 w-40 bg-slate-800 border border-slate-700 rounded-md shadow-lg py-1 z-50"
                          onMouseLeave={() => setShowDropdown(false)}
                        >
                          <Link
                            href="/campaign/mycampaigns"
                            className="flex items-center px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
                          >
                            <Globe className="mr-1.5 h-3.5 w-3.5 text-lime-500" />
                            My Campaigns
                          </Link>
                          <Link
                            href="/votes"
                            className="flex items-center px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
                          >
                            <Award className="mr-1.5 h-3.5 w-3.5 text-yellow-500" />
                            My Votes
                          </Link>
                        </div>
                      </Transition>
                    </div>
                  )}
                  
                  {!hideConnectBtn && (
                    <div className="custom-connect-button scale-90 origin-right">
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
                                      className="bg-lime-600 hover:bg-lime-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                                    >
                                      Connect Wallet
                                    </button>
                                  );
                                }
                                
                                if (chain.id !== CELO_CHAIN_ID) {
                                  return (
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={handleSwitchToCelo}
                                        className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-slate-900 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                                      >
                                        <AlertTriangle size={16} />
                                        Switch to Celo
                                      </button>
                                    </div>
                                  );
                                }
                                
                                return (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={openAccountModal}
                                      className="flex items-center bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
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

            {/* Mobile menu */}
            <Disclosure.Panel className="sm:hidden">
              <div className="space-y-1 px-3 pt-2 pb-3">
                {/* Mobile Celo Badge */}
                <div className="mb-2 flex items-center justify-center rounded-md bg-lime-600/20 text-lime-400 px-3 py-1.5 text-sm border border-lime-500/30">
                  <span className="h-2 w-2 rounded-full bg-lime-400 mr-1.5"></span>
                  Celo Network Only
                </div>
                
                {navigation.map((item) => {
                  const NavIcon = item.icon;
                  const isActive = pathname === item.href || 
                                 (item.href !== '/' && pathname?.startsWith(item.href));
                  return (
                    <Disclosure.Button
                      key={item.name}
                      as={Link}
                      href={item.href}
                      className={`
                        flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${
                          isActive 
                            ? 'bg-lime-600/20 text-lime-400 border border-lime-500/30' 
                            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                        }
                      `}
                    >
                      <NavIcon className="h-3.5 w-3.5 mr-2" />
                      {item.name}
                    </Disclosure.Button>
                  );
                })}
                
                {isConnected && (
                  <>
                    <div className="mt-3 pt-3 border-t border-slate-700">
                      <div className="px-2 text-xs uppercase text-slate-500 font-semibold">
                        My Account
                      </div>
                      <Disclosure.Button
                        as={Link}
                        href="/campaign/mycampaigns"
                        className="flex items-center mt-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        <Globe className="mr-2 h-3.5 w-3.5 text-lime-500" />
                        My Campaigns
                      </Disclosure.Button>
                      <Disclosure.Button
                        as={Link}
                        href="/votes"
                        className="flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        <Award className="mr-2 h-3.5 w-3.5 text-yellow-500" />
                        My Votes
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