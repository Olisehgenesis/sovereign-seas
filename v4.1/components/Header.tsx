'use client';
import { Disclosure, Transition } from '@headlessui/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useConnect, useAccount, injected } from 'wagmi';
import { Menu, X, ChevronDown, Globe, Award, Settings, Home, PlusCircle, Info, Waves, AlertTriangle, FileCode, Anchor, Wallet } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { celo, celoAlfajores } from 'viem/chains';
import { usePrivy, useLogin, useWallets } from '@privy-io/react-auth';
import WalletModal from '@/components/walletModal';
import { useWallet } from '@/hooks/useWallet';
import { createPublicClient } from 'viem';
import { publicClient, walletClient } from '@/app/utils/clients';

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
  const { isConnected, address } = useAccount();
  const [showDropdown, setShowDropdown] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const pathname = usePathname();
  
  // Use Privy hooks for authentication
  const { authenticated, user, logout, ready } = usePrivy();
  const { login } = useLogin();
  
  // Use the wallet hook to get the switch network function
  const { handleSwitchToNetwork } = useWallet();

  // Check if user is on the correct chain
  // useEffect(() => {
  //   const checkChain = async () => {
  //     if (isConnected && publicClient && walletClient) {
  //       try {
  //         await walletClient.switchChain({
  //           id: getChainConfig().id
  //         });
  //         const chainId = await walletClient.getChainId();
  //         console.log("Current chain ID:", chainId);
  //       } catch (error) {
  //         console.error("Error getting chain ID:", error);
  //       }
  //     }
  //   };
    
  //   checkChain();
    
  //   // Set up interval to periodically check chain
  //   const interval = setInterval(checkChain, 5000);
  //   return () => clearInterval(interval);
  // }, [isConnected, publicClient]);

  // Handle MiniPay connection
  useEffect(() => {
    if (window.ethereum && window.ethereum.isMiniPay) {
      setHideConnectBtn(true);
      connect({ connector: injected({ target: 'metaMask' }) });
    }
  }, [connect]);
  
  // Handle wallet connection with Privy login
  const handleLogin = () => {
    if (typeof window !== 'undefined' && window.ethereum && window.ethereum.isMiniPay) {
      connect({ connector: injected({ target: 'metaMask' }) });
    } else {
      // Use Privy login
      login({
        loginMethods: ['email', 'wallet', 'google'],
        walletChainType: 'ethereum-only'
      });
    }
  };

  // Function to open wallet modal
  const openWalletModal = () => {
    setWalletModalOpen(true);
    setShowDropdown(false); // Close dropdown if open
  };

  // Function to close wallet modal
  const closeWalletModal = () => {
    setWalletModalOpen(false);
  };

  // Function to abbreviate address
  const abbreviateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  // Close mobile menu when route changes
  useEffect(() => {
    setShowDropdown(false);
  }, [pathname]);

  return (
    <div className="relative z-50">
      {/* Shadow element for raised effect - Blue version */}
      <div className="absolute inset-x-0 h-3 bottom-0 translate-y-full bg-gradient-to-b from-blue-800/30 to-transparent pointer-events-none"></div>
      
      {/* Animated wave decoration at the bottom of the header */}
      <div className="absolute left-0 right-0 bottom-0 translate-y-full h-4 wave-border opacity-30 pointer-events-none"></div>
      
      <Disclosure as="nav" className="bg-gradient-to-r from-blue-600 to-blue-500 border-b border-blue-700/30 shadow-xl sticky top-0 z-50">
        {({ open, close }) => (
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
                  {authenticated && (
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
                            onClick={() => setShowDropdown(false)}
                          >
                            <Globe className="mr-1.5 h-4 w-4 text-blue-500 transition-transform duration-300 group-hover:rotate-12" />
                            My Campaigns
                          </Link>
                          <Link
                            href="/votes"
                            className="flex items-center px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors duration-200 hover:text-blue-700 group"
                            onClick={() => setShowDropdown(false)}
                          >
                            <Award className="mr-1.5 h-4 w-4 text-blue-500 transition-transform duration-300 group-hover:rotate-12" />
                            My Votes
                          </Link>
                          <Link
                            href="/myprojects"
                            className="flex items-center px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors duration-200 hover:text-blue-700 group"
                            onClick={() => setShowDropdown(false)}
                          >
                            <FileCode className="mr-1.5 h-4 w-4 text-blue-500 transition-transform duration-300 group-hover:rotate-12" />
                            My Projects
                          </Link>
                          <Link
                            href="#"
                            className="flex items-center w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors duration-200 hover:text-blue-700 group"
                            onClick={(e) => {
                              e.preventDefault();
                              openWalletModal();
                            }}
                          >
                            <Wallet className="mr-1.5 h-4 w-4 text-blue-500 transition-transform duration-300 group-hover:rotate-12" />
                            My Wallet
                          </Link>
                          <Link
                            href="#"
                            className="flex items-center w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors duration-200 hover:text-blue-700 group"
                            onClick={(e) => {
                              logout();
                              setShowDropdown(false);
                            }}
                          >
                            <Settings className="mr-1.5 h-4 w-4 text-blue-500 transition-transform duration-300 group-hover:rotate-12" />
                            Logout
                          </Link>
                        </div>
                      </Transition>
                    </div>
                  )}
                  
                  {!hideConnectBtn && (
                    <div>
                      {!authenticated ? (
                        <button 
                          onClick={handleLogin}
                          disabled={!ready} 
                          className="bg-white text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-xl border border-blue-100 hover:-translate-y-1 animate-float premium-button disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Connect Wallet
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={openWalletModal}
                            className="flex items-center bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border border-white/10 shadow-lg hover:shadow-xl hover:-translate-y-1 premium-button"
                          >
                            <Wallet className="h-4 w-4 mr-2" />
                            {address ? abbreviateAddress(address) : 'My Wallet'}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile menu with enhanced animations */}
            <Disclosure.Panel className="sm:hidden">
              <div className="space-y-1 px-3 pt-2 pb-3">
                {navigation.map((item, index) => {
                  const NavIcon = item.icon;
                  const isActive = pathname === item.href || 
                                 (item.href !== '/' && pathname?.startsWith(item.href));
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => close()}
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
                    </Link>
                  );
                })}
                
                {authenticated && (
                  <>
                    <div className="mt-3 pt-3 border-t border-white/20">
                      <div className="px-2 text-xs uppercase text-white/70 font-semibold">
                        My Account
                      </div>
                      <Link
                        href="/campaign/mycampaigns"
                        onClick={() => close()}
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
                      </Link>
                      <Link
                        href="/votes"
                        onClick={() => close()}
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
                      </Link>
                      <Link
                        href="/myprojects"
                        onClick={() => close()}
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
                      </Link>
                      <Link
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          openWalletModal();
                          close();
                        }}
                        className="flex items-center px-3 py-2 rounded-full text-sm font-medium text-white hover:bg-blue-600/20 transition-all duration-300"
                        style={{
                          animation: 'fadeSlideIn 0.3s ease-out forwards',
                          animationDelay: '0.7s',
                          opacity: 0,
                          transform: 'translateY(10px)'
                        }}
                      >
                        <Wallet className="mr-2 h-4 w-4 text-blue-300" />
                        My Wallet
                      </Link>
                      <Link
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          logout();
                          close();
                        }}
                        className="flex items-center px-3 py-2 rounded-full text-sm font-medium text-white hover:bg-blue-600/20 transition-all duration-300"
                        style={{
                          animation: 'fadeSlideIn 0.3s ease-out forwards',
                          animationDelay: '0.8s',
                          opacity: 0,
                          transform: 'translateY(10px)'
                        }}
                      >
                        <Settings className="mr-2 h-4 w-4 text-blue-300" />
                        Logout
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>

      {/* Wallet Modal */}
      <WalletModal isOpen={walletModalOpen} onClose={closeWalletModal} />
    </div>
  );
}