'use client';

import { useEffect, useState } from 'react';
import { useConnect, injected } from 'wagmi';
import { Menu, ChevronDown, Globe, Settings, PlusCircle,  Circle, Wallet, Compass, Ship, User, Briefcase, Award, ListChecks, Trophy } from 'lucide-react';
import { usePrivy, useConnectOrCreateWallet } from '@privy-io/react-auth';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import WalletModal from '@/components/modals/walletModal';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavigate } from '@/utils/nextAdapter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ButtonCool } from '@/components/ui/button-cool';


const explorerOptions = [
  { name: 'Projects', href: '/explorer/projects', icon: Ship },
  { name: 'Campaigns', href: '/explorer/campaigns', icon: Globe },
  { name: 'Tournaments', href: '/explorer/tournaments', icon: Trophy },
  { name: 'Grants', href: '/explorer/grants', icon: Award },
  { name: 'Leaderboard', href: '/explorer/leaderboard', icon: Compass },
];

const createOptions = [
  {
    name: 'Start a Campaign',
    href: '/app/campaign/start',
    icon: Ship,
  },
  {
    name: 'Launch a Project',
    href: '/app/project/start',
    icon: Compass,
  },
  {
    name: 'Create a Grant',
    href: '/app/grant/create',
    icon: Award,
  }
];

export default function Header() {
  const [hideConnectBtn, setHideConnectBtn] = useState(false);
  const { connect } = useConnect();
  const { address, walletsReady } = useActiveWallet();
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = usePathname();
  
  // Use Privy hooks for authentication
  const { authenticated, logout, ready } = usePrivy();
  const { connectOrCreateWallet } = useConnectOrCreateWallet({
    onSuccess: async ({ wallet }) => {
      console.log('[Header] connectOrCreateWallet success. Wallet:', wallet?.address);
    },
    onError: async (error) => {
      console.error('[Header] connectOrCreateWallet error:', error);
    }
  });

  // Handle scroll effect - header reduces size when scrolling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle MiniPay connection
  useEffect(() => {
    if (window.ethereum && window.ethereum.isMiniPay) {
      setHideConnectBtn(true);
      connect({ connector: injected({ target: 'metaMask' }) });
    }
  }, [connect]);
  
  // Handle wallet connection with Privy connectOrCreateWallet
  const handleLogin = () => {
    console.log('[Header] handleLogin called. State:', {
      authenticated,
      walletsReady,
      address,
      ready,
      hideConnectBtn
    });
    
    if (authenticated) {
      console.log('[Header] Already authenticated. walletsReady:', walletsReady, 'address:', address);
      if (walletsReady && address) {
        openWalletModal();
        return;
      }
      console.log('[Header] No connected wallets yet. Triggering connectOrCreateWallet.');
      connectOrCreateWallet();
      return;
    }
    
    console.log('[Header] Not authenticated. Checking for MiniPay...');
    if (typeof window !== 'undefined' && (window as any).ethereum && (window as any).ethereum.isMiniPay) {
      console.log('[Header] MiniPay detected, using injected connector');
      connect({ connector: injected({ target: 'metaMask' }) });
    } else {
      console.log('[Header] Using Privy connectOrCreateWallet');
      connectOrCreateWallet();
    }
  };

  // Function to open wallet modal (requires connected wallets to be ready)
  const openWalletModal = () => {
    if (!walletsReady) return;
    setWalletModalOpen(true);
  };

  // Function to close wallet modal
  const closeWalletModal = () => {
    setWalletModalOpen(false);
  };

  // Function to abbreviate address
  const abbreviateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  // Diagnostics
  useEffect(() => {
    console.log('[Header] privy.ready:', ready, 'authenticated:', authenticated);
  }, [ready, authenticated]);
  useEffect(() => {
    console.log('[Header] walletsReady:', walletsReady, 'address:', address);
  }, [walletsReady, address]);

  // Note: When authenticated but with no connected wallets, we should use a link helper.
  // We avoid auto-invoking any flow here to prevent errors when user is already authenticated.
  
  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="relative z-20">
      <header className={`fixed w-full top-0 z-20 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white border-b-[0.3em] border-[#050505] shadow-[0_0.4em_0_#000000]' 
          : 'bg-transparent'
      }`}>
        <div className="mx-auto max-w-7xl px-6 sm:px-6 lg:px-8 relative z-10">
          <div className={`flex items-center justify-between transition-all duration-300 ${
            isScrolled ? 'h-16' : 'h-20'
          }`}>
            
            {/* Logo */}
            <Link href="/" className="flex items-center group">
              <img 
                src="/images/logo_bl.png" 
                alt="Sov Seas" 
                className={`transition-all duration-300 object-contain ${
                  isScrolled ? 'h-16 sm:h-48 w-auto' : 'h-20 sm:h-64 w-auto'
                }`}
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              
              {/* Explorer Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center px-3 py-2 text-[#050505] hover:text-[#2563eb] font-extrabold bg-white border-[0.15em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all duration-200">
                    <Compass className="w-4 h-4 mr-2" />
                    Explorer
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.4em_0.4em_0_#000000] p-1">
                  {explorerOptions.map((option) => {
                    const OptionIcon = option.icon;
                    return (
                      <DropdownMenuItem key={option.name} asChild>
                        <Link 
                          href={option.href} 
                          className="flex items-center w-full cursor-pointer px-3 py-2 rounded-[0.3em] hover:bg-[#2563eb] hover:text-white transition-colors font-semibold"
                        >
                          <OptionIcon className="h-4 w-4 mr-3" />
                          <span>{option.name}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Tasks direct tab */}
              <Link 
                href="/app/tasks" 
                className="flex items-center px-3 py-2 text-[#050505] hover:text-[#2563eb] font-extrabold bg-white border-[0.15em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all duration-200"
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Tasks
              </Link>

              {/* Create Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center px-3 py-2 text-[#050505] hover:text-[#10b981] font-extrabold bg-white border-[0.15em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all duration-200">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Create
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.4em_0.4em_0_#000000] p-1">
                  {createOptions.map((option) => {
                    const OptionIcon = option.icon;
                    return (
                      <DropdownMenuItem key={option.name} asChild>
                        <Link 
                          href={option.href} 
                          className="flex items-center w-full cursor-pointer px-3 py-2 rounded-[0.3em] hover:bg-[#10b981] hover:text-white transition-colors font-semibold"
                        >
                          <OptionIcon className="h-4 w-4 mr-3" />
                          <span className="text-sm">{option.name}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>


              {/* Profile (when authenticated) */}
              {authenticated && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center px-3 py-2 text-[#050505] hover:text-[#a855f7] font-extrabold bg-white border-[0.15em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all duration-200">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.4em_0.4em_0_#000000] p-1">
                    <DropdownMenuItem asChild>
                      <Link href="/app/me" className="flex items-center w-full cursor-pointer px-3 py-2 rounded-[0.3em] hover:bg-[#a855f7] hover:text-white transition-colors font-semibold">
                        <User className="mr-3 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={logout}
                      className="text-[#ef4444] cursor-pointer px-3 py-2 rounded-[0.3em] hover:bg-[#ef4444] hover:text-white transition-colors font-semibold"
                    >
                      <Settings className="mr-3 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              
              {/* Tasks Button */}
              {authenticated && address && (
                <button
                  onClick={() => navigate('/app/tasks')}
                  className="hidden sm:flex items-center px-3 py-2 text-[#050505] hover:text-[#2563eb] font-extrabold bg-white border-[0.15em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all duration-200"
                >
                  <ListChecks className="w-4 h-4 mr-2" />
                  <span>Tasks</span>
                </button>
              )}

              {/* Wallet Button */}
              {authenticated && address ? (
                <ButtonCool
                  onClick={openWalletModal}
                  text={address ? abbreviateAddress(address) : 'Wallet'}
                  bgColor="#2563eb"
                  hoverBgColor="#1d4ed8"
                  borderColor="#050505"
                  textColor="#ffffff"
                  size="sm"
                  className="hidden sm:flex"
                >
                  <Wallet className="w-4 h-4" />
                </ButtonCool>
              ) : !hideConnectBtn && (
                <ButtonCool 
                  onClick={() => {
                    console.log('[Header] Connect Wallet button clicked');
                    handleLogin();
                  }}
                  disabled={!ready}
                  text="Connect Wallet"
                  bgColor="#2563eb"
                  hoverBgColor="#1d4ed8"
                  borderColor="#050505"
                  textColor="#ffffff"
                  size="sm"
                  className="disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Wallet className="w-4 h-4" />
                </ButtonCool>
              )}

              {/* Contact Us */}
              <ButtonCool
                onClick={() => navigate('/contact')}
                text="Contact Us"
                bgColor="#6b7280"
                hoverBgColor="#4b5563"
                borderColor="#050505"
                textColor="#ffffff"
                size="sm"
                className="hidden md:flex"
              />

              {/* Mobile Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <button className="md:hidden flex items-center justify-center w-10 h-10 bg-white border-[0.15em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all duration-200">
                    <Menu className="w-5 h-5 text-[#050505]" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 bg-white border-l-[0.3em] border-[#050505] shadow-[-0.4em_0_0_#000000]">
                  <div className="py-6">
                    
                    {/* Mobile Logo */}
                    <div className="flex items-center space-x-3 mb-8 p-3 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
                      <div className="w-8 h-8 bg-[#2563eb] border-[0.15em] border-[#050505] rounded-full flex items-center justify-center shadow-[0.15em_0.15em_0_#000000]">
                        <Circle className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xl font-extrabold text-[#050505] uppercase tracking-[0.05em]">Sovereign Seas</span>
                    </div>

                    {/* Mobile Navigation */}
                    <div className="space-y-1">
                      
                      {/* Explorer Section */}
                      <div className="py-2">
                        <h3 className="text-xs font-extrabold text-[#050505] uppercase tracking-[0.1em] mb-3 px-2">
                          Explorer
                        </h3>
                        {explorerOptions.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex items-center px-3 py-2 mb-2 text-[#050505] hover:text-white hover:bg-[#2563eb] border-[0.15em] border-[#050505] rounded-[0.4em] shadow-[0.15em_0.15em_0_#000000] hover:shadow-[0.2em_0.2em_0_#000000] transition-all duration-200 font-bold"
                            >
                              <Icon className="w-5 h-5 mr-3" />
                              {item.name}
                            </Link>
                          );
                        })}
                      </div>

                      {/* Create Section */}
                      <div className="py-2 border-t-[0.2em] border-[#050505] mt-4">
                        <h3 className="text-xs font-extrabold text-[#050505] uppercase tracking-[0.1em] mb-3 px-2">
                          Create
                        </h3>
                        {createOptions.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex items-center px-3 py-2 mb-2 text-[#050505] hover:text-white hover:bg-[#10b981] border-[0.15em] border-[#050505] rounded-[0.4em] shadow-[0.15em_0.15em_0_#000000] hover:shadow-[0.2em_0.2em_0_#000000] transition-all duration-200 font-bold text-sm"
                            >
                              <Icon className="w-5 h-5 mr-3" />
                              {item.name}
                            </Link>
                          );
                        })}
                      </div>

                      {/* Other Links */}
                      <div className="py-2 border-t-[0.2em] border-[#050505] mt-4">
                        <Link
                          href="/contact"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center px-3 py-2 text-[#050505] hover:text-white hover:bg-[#6b7280] border-[0.15em] border-[#050505] rounded-[0.4em] shadow-[0.15em_0.15em_0_#000000] hover:shadow-[0.2em_0.2em_0_#000000] transition-all duration-200 font-bold"
                        >
                          Contact Us
                        </Link>
                      </div>

                      {/* User Actions */}
                      {authenticated && (
                        <div className="py-2 border-t-[0.2em] border-[#050505] mt-4">
                          <h3 className="text-xs font-extrabold text-[#050505] uppercase tracking-[0.1em] mb-3 px-2">
                            Account
                          </h3>
                          <Link
                            href="/app/me"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center px-3 py-2 mb-2 text-[#050505] hover:text-white hover:bg-[#a855f7] border-[0.15em] border-[#050505] rounded-[0.4em] shadow-[0.15em_0.15em_0_#000000] hover:shadow-[0.2em_0.2em_0_#000000] transition-all duration-200 font-bold"
                          >
                            <User className="w-5 h-5 mr-3" />
                            Profile
                          </Link>
                          
                          <Link
                            href="/app/tasks"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center px-3 py-2 mb-2 text-[#050505] hover:text-white hover:bg-[#2563eb] border-[0.15em] border-[#050505] rounded-[0.4em] shadow-[0.15em_0.15em_0_#000000] hover:shadow-[0.2em_0.2em_0_#000000] transition-all duration-200 font-bold"
                          >
                            <ListChecks className="w-5 h-5 mr-3" />
                            Tasks
                          </Link>
                          
                          <button
                            onClick={() => {
                              openWalletModal();
                              setMobileMenuOpen(false);
                            }}
                            className="flex items-center w-full px-3 py-2 mb-2 text-[#050505] hover:text-white hover:bg-[#2563eb] border-[0.15em] border-[#050505] rounded-[0.4em] shadow-[0.15em_0.15em_0_#000000] hover:shadow-[0.2em_0.2em_0_#000000] transition-all duration-200 font-bold"
                          >
                            <Wallet className="w-5 h-5 mr-3" />
                            <span>{address ? abbreviateAddress(address) : 'Wallet'}</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              logout();
                              setMobileMenuOpen(false);
                            }}
                            className="flex items-center w-full px-3 py-2 text-white hover:text-white hover:bg-[#ef4444] bg-[#ef4444] border-[0.15em] border-[#050505] rounded-[0.4em] shadow-[0.15em_0.15em_0_#000000] hover:shadow-[0.2em_0.2em_0_#000000] transition-all duration-200 font-bold"
                          >
                            <Settings className="w-5 h-5 mr-3" />
                            Logout
                          </button>
                        </div>
                      )}

                      {/* Connect Wallet (Mobile) */}
                      {!authenticated && !hideConnectBtn && (
                        <div className="pt-4 border-t border-gray-100">
                          <ButtonCool
                            onClick={() => {
                              console.log('[Header] Mobile Connect Wallet button clicked');
                              handleLogin();
                              setMobileMenuOpen(false);
                            }}
                            disabled={!ready}
                            text="Connect Wallet"
                            bgColor="#2563eb"
                            hoverBgColor="#1d4ed8"
                            borderColor="#050505"
                            textColor="#ffffff"
                            size="sm"
                            className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Wallet className="w-4 h-4" />
                          </ButtonCool>
                        </div>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Wallet Modal */}
      <WalletModal isOpen={walletModalOpen} onClose={closeWalletModal} />
    </div>
  );
}