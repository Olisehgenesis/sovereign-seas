import { useEffect, useState } from 'react';
import { useConnect, injected } from 'wagmi';
import { Menu, ChevronDown, Globe, Settings, PlusCircle,  Circle, Wallet, Compass, Ship, User, Briefcase, Award, ListChecks } from 'lucide-react';
import { usePrivy, useConnectOrCreateWallet } from '@privy-io/react-auth';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import WalletModal from '@/components/modals/walletModal';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useOpenMilestones } from '@/hooks/useProjectMilestones';
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


const explorerOptions = [
  { name: 'Projects', href: '/explorer/projects', icon: Ship },
  { name: 'Campaigns', href: '/explorer/campaigns', icon: Globe },
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
  const location = useLocation();
  
  // Use Privy hooks for authentication
  const { authenticated, logout, ready } = usePrivy();
  
  // Check for open milestones
  const { openMilestones, isLoading: isLoadingTasks } = useOpenMilestones(true);
  const hasTasks = openMilestones && openMilestones.length > 0;
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
  }, [location.pathname]);

  return (
    <div className="relative z-20">
      <header className={`fixed w-full top-0 z-20 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white shadow-sm' 
          : 'bg-transparent'
      }`}>
        <div className="mx-auto max-w-7xl px-6 sm:px-6 lg:px-8 relative z-10">
          <div className={`flex items-center justify-between transition-all duration-300 ${
            isScrolled ? 'h-16' : 'h-20'
          }`}>
            
            {/* Logo */}
            <Link to="/" className="flex items-center group">
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
                  <Button variant="ghost" className="text-gray-600 hover:text-black font-medium">
                    <Compass className="w-4 h-4 mr-2" />
                    Explorer
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 bg-white/95 backdrop-blur-sm">
                  {explorerOptions.map((option) => {
                    const OptionIcon = option.icon;
                    return (
                      <DropdownMenuItem key={option.name} asChild>
                        <Link 
                          to={option.href} 
                          className="flex items-center w-full cursor-pointer"
                        >
                          <OptionIcon className="h-4 w-4 text-gray-500 mr-3" />
                          <span className="font-medium">{option.name}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Tasks direct tab */}
              {hasTasks ? (
                <Link 
                  to="/app/tasks" 
                  className="text-gray-600 hover:text-black font-medium flex items-center"
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  Tasks
                </Link>
              ) : (
                <span className="text-gray-400 font-medium flex items-center cursor-default">
                  <Briefcase className="w-4 h-4 mr-2" />
                  {isLoadingTasks ? 'Loading...' : 'Tasks coming soon'}
                </span>
              )}

              {/* Create Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-gray-600 hover:text-black font-medium">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Create
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white/95 backdrop-blur-sm">
                  {createOptions.map((option) => {
                    const OptionIcon = option.icon;
                    return (
                      <DropdownMenuItem key={option.name} asChild>
                        <Link 
                          to={option.href} 
                          className="flex items-center w-full cursor-pointer"
                        >
                          <OptionIcon className="h-4 w-4 text-gray-500 mr-3" />
                          <span className="font-medium text-sm">{option.name}</span>
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
                    <Button variant="ghost" className="text-gray-600 hover:text-black font-medium">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48 bg-white/95 backdrop-blur-sm">
                    <DropdownMenuItem asChild>
                      <Link to="/app/me" className="flex items-center w-full cursor-pointer">
                        <User className="mr-3 h-4 w-4 text-gray-500" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={logout}
                      className="text-red-600 cursor-pointer"
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
                <Button
                  variant="outline"
                  onClick={() => navigate('/app/tasks')}
                  className="hidden sm:flex border-gray-300 text-black hover:border-gray-400 rounded-full"
                >
                  <ListChecks className="w-4 h-4 mr-2" />
                  <span>Tasks</span>
                </Button>
              )}

              {/* Wallet Button */}
              {authenticated && address ? (
                <Button
                  onClick={openWalletModal}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 py-2 rounded-full"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">{abbreviateAddress(address)}</span>
                </Button>
              ) : !hideConnectBtn && (
                <Button 
                  onClick={() => {
                    console.log('[Header] Connect Wallet button clicked');
                    handleLogin();
                  }}
                  disabled={!ready} 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-3 sm:px-6 py-1.5 sm:py-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-base"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  <span>Connect Wallet</span>
                </Button>
              )}

              {/* Contact Us */}
              <Button
                variant="outline"
                onClick={() => navigate('/contact')}
                className="hidden md:flex border-gray-300 text-black hover:border-gray-400 rounded-full"
              >
                Contact Us
              </Button>

              {/* Mobile Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="md:hidden">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 bg-white/95 backdrop-blur-sm">
                  <div className="py-6">
                    
                    {/* Mobile Logo */}
                    <div className="flex items-center space-x-3 mb-8">
                      <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                        <Circle className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xl font-bold text-black">Sovereign Seas</span>
                    </div>

                    {/* Mobile Navigation */}
                    <div className="space-y-1">
                      
                      {/* Explorer Section */}
                      <div className="py-2">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                          Explorer
                        </h3>
                        {explorerOptions.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.href}
                              to={item.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex items-center px-3 py-2 text-gray-700 hover:text-black hover:bg-gray-50 rounded-lg"
                            >
                              <Icon className="w-5 h-5 mr-3" />
                              {item.name}
                            </Link>
                          );
                        })}
                      </div>

                      {/* Create Section */}
                      <div className="py-2 border-t border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                          Create
                        </h3>
                        {createOptions.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.href}
                              to={item.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex items-center px-3 py-3 text-gray-700 hover:text-black hover:bg-gray-50 rounded-lg"
                            >
                              <Icon className="w-5 h-5 mr-3" />
                              <span className="font-medium text-sm">{item.name}</span>
                            </Link>
                          );
                        })}
                      </div>

                      {/* Other Links */}
                      <div className="py-2 border-t border-gray-100">
                        
                        <Link
                          to="/contact"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center px-3 py-2 text-gray-700 hover:text-black hover:bg-gray-50 rounded-lg"
                        >
                          Contact Us
                        </Link>
                      </div>

                      {/* User Actions */}
                      {authenticated && (
                        <div className="py-2 border-t border-gray-100">
                          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                            Account
                          </h3>
                          <Link
                            to="/app/me"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center px-3 py-2 text-gray-700 hover:text-black hover:bg-gray-50 rounded-lg"
                          >
                            <User className="w-5 h-5 mr-3" />
                            Profile
                          </Link>
                          
                          <Link
                            to="/app/tasks"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center px-3 py-2 text-gray-700 hover:text-black hover:bg-gray-50 rounded-lg"
                          >
                            <ListChecks className="w-5 h-5 mr-3" />
                            Tasks
                          </Link>
                          
                          <button
                            onClick={() => {
                              openWalletModal();
                              setMobileMenuOpen(false);
                            }}
                            className="flex items-center w-full px-3 py-2 text-gray-700 hover:text-black hover:bg-gray-50 rounded-lg"
                          >
                            <Wallet className="w-5 h-5 mr-3" />
                            Wallet
                          </button>
                          
                          <button
                            onClick={() => {
                              logout();
                              setMobileMenuOpen(false);
                            }}
                            className="flex items-center w-full px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                          >
                            <Settings className="w-5 h-5 mr-3" />
                            Logout
                          </button>
                        </div>
                      )}

                      {/* Connect Wallet (Mobile) */}
                      {!authenticated && !hideConnectBtn && (
                        <div className="pt-4 border-t border-gray-100">
                          <Button
                            onClick={() => {
                              console.log('[Header] Mobile Connect Wallet button clicked');
                              handleLogin();
                              setMobileMenuOpen(false);
                            }}
                            disabled={!ready}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 rounded-xl text-xs"
                          >
                            <Wallet className="w-4 h-4 mr-2" />
                            Connect Wallet
                          </Button>
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