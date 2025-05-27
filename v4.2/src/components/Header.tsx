import { Disclosure, Transition } from '@headlessui/react';
import { useEffect, useState } from 'react';
import { useConnect, useAccount, injected } from 'wagmi';
import { Menu, X, ChevronDown, Globe, Award, Settings, PlusCircle, FileCode, Anchor, Wallet, Compass, Ship, BookOpen, User, Bell } from 'lucide-react';
import { usePrivy, useLogin } from '@privy-io/react-auth';
import WalletModal from '@/components/walletModal';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const navigation = [
  { name: 'Explorer', href: '/explorer', icon: Compass },
  { name: 'Campaigns', href: '/campaigns', icon: Globe },
  { name: 'Projects', href: '/projects', icon: Ship },
  { name: 'Docs', href: '/docs', icon: BookOpen },
];

const createOptions = [
  {
    name: 'Launch Campaign',
    href: '/app/campaign/start',
    icon: Ship,
    description: 'Start a new governance campaign',
  },
  {
    name: 'Create Project',
    href: '/app/project/start',
    icon: Compass,
    description: 'Begin a new project',
  }
];

export default function Header() {
  const [hideConnectBtn, setHideConnectBtn] = useState(false);
  const { connect } = useConnect();
  const { isConnected, address } = useAccount();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use Privy hooks for authentication
  const { authenticated, logout, ready } = usePrivy();
  const { login } = useLogin();

  // Handle scroll effect - more subtle than original
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
  
  // Handle wallet connection with Privy login
  const handleLogin = () => {
    console.log(isConnected)
    if (typeof window !== 'undefined' && window.ethereum && window.ethereum.isMiniPay) {
      connect({ connector: injected({ target: 'metaMask' }) });
    } else {
      login({
        loginMethods: ['email', 'wallet', 'google'],
        walletChainType: 'ethereum-only'
      });
    }
  };

  // Function to open wallet modal
  const openWalletModal = () => {
    setWalletModalOpen(true);
    setShowDropdown(false);
  };

  // Function to close wallet modal
  const closeWalletModal = () => {
    setWalletModalOpen(false);
  };

  // Function to abbreviate address
  const abbreviateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };
  
  // Close mobile menu when route changes
  useEffect(() => {
    setShowDropdown(false);
    setShowCreateDropdown(false);
  }, [location.pathname]);

  return (
    <div className="relative z-50">
      <Disclosure as="nav" className={`fixed w-full top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/90 backdrop-blur-md shadow-md border-b border-blue-200/50' 
          : 'bg-white/80 backdrop-blur-sm border-b border-blue-200/30'
      }`}>
        {({ open, close }) => (
          <>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex h-16 items-center justify-between">
                
                {/* Logo - following original design */}
                <Link to="/" className="flex items-center group">
                  <div className="relative h-8 w-8 mr-3">
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 shadow-sm group-hover:shadow-blue-400/30 transition-all duration-300 group-hover:scale-105 flex items-center justify-center">
                      <Anchor className="h-4 w-4 text-white group-hover:rotate-12 transition-transform duration-300" />
                    </div>
                  </div>
                  <span className="text-xl font-bold text-gray-800">
                    Sovereign<span className="text-blue-600 relative">
                      Seas
                      <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-blue-400 to-indigo-500"></span>
                    </span>
                  </span>
                </Link>

                {/* Desktop Navigation - simplified styling */}
                <div className="hidden md:flex items-center space-x-1">
                  {navigation.map((item) => {
                    const NavIcon = item.icon;
                    const isActive = location.pathname === item.href;
                    
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
                          isActive 
                            ? 'bg-blue-100 text-blue-700 shadow-sm' 
                            : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        <NavIcon className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                        {item.name}
                      </Link>
                    );
                  })}
                  
                  {/* Create Dropdown - simplified */}
                  <div className="relative">
                    <button
                      onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                      className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
                        showCreateDropdown 
                          ? 'bg-blue-100 text-blue-700 shadow-sm' 
                          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      <PlusCircle className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                      Create
                      <ChevronDown className={`ml-1 h-3 w-3 transition-transform duration-200 ${showCreateDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    <Transition
                      show={showCreateDropdown}
                      enter="transition ease-out duration-200"
                      enterFrom="transform opacity-0 scale-95 translate-y-1"
                      enterTo="transform opacity-100 scale-100 translate-y-0"
                      leave="transition ease-in duration-150"
                      leaveFrom="transform opacity-100 scale-100 translate-y-0"
                      leaveTo="transform opacity-0 scale-95 translate-y-1"
                    >
                      <div 
                        className="absolute right-0 mt-2 w-72 bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-blue-200/50 py-3 z-50"
                        onMouseLeave={() => setShowCreateDropdown(false)}
                      >
                        {createOptions.map((option) => {
                          const OptionIcon = option.icon;
                          return (
                            <button
                              key={option.name}
                              onClick={() => {
                                navigate(option.href);
                                setShowCreateDropdown(false);
                              }}
                              className="flex items-center w-full px-4 py-3 text-gray-700 hover:bg-blue-50 transition-colors duration-200 group"
                            >
                              <div className="bg-blue-100 p-2.5 rounded-lg mr-4 group-hover:bg-blue-200 transition-colors">
                                <OptionIcon className="h-4 w-4 text-blue-600" />
                              </div>
                              <div className="text-left">
                                <div className="font-semibold text-sm text-gray-900">{option.name}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{option.description}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </Transition>
                  </div>
                </div>

                {/* Right Side Actions - simplified */}
                <div className="flex items-center space-x-2">
                  
                  {/* Authenticated User Actions */}
                  {authenticated && (
                    <>
                      {/* Notifications */}
                      <button className="p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 relative transition-all duration-200 group">
                        <Bell className="h-4 w-4 group-hover:animate-pulse" />
                        <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                      </button>

                      {/* Wallet Button */}
                      <button
                        onClick={openWalletModal}
                        className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 group"
                      >
                        <Wallet className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                        <span className="hidden sm:inline">
                          {address ? abbreviateAddress(address) : 'Wallet'}
                        </span>
                      </button>

                      {/* Profile Button */}
                      <Link
                        to="/app/me"
                        className="p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 group"
                      >
                        <User className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                      </Link>

                      {/* Dashboard Dropdown */}
                      <div className="relative hidden sm:block">
                        <button
                          onClick={() => setShowDropdown(!showDropdown)}
                          className={`p-2 rounded-lg transition-all duration-200 group ${
                            showDropdown 
                              ? 'bg-blue-100 text-blue-700 shadow-sm' 
                              : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                        >
                          <Settings className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                        
                        <Transition
                          show={showDropdown}
                          enter="transition ease-out duration-200"
                          enterFrom="transform opacity-0 scale-95 translate-y-1"
                          enterTo="transform opacity-100 scale-100 translate-y-0"
                          leave="transition ease-in duration-150"
                          leaveFrom="transform opacity-100 scale-100 translate-y-0"
                          leaveTo="transform opacity-0 scale-95 translate-y-1"
                        >
                          <div 
                            className="absolute right-0 mt-2 w-52 bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-blue-200/50 py-3 z-50"
                            onMouseLeave={() => setShowDropdown(false)}
                          >
                            <Link
                              to="/campaign/mycampaigns"
                              className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors duration-200 group"
                              onClick={() => setShowDropdown(false)}
                            >
                              <Globe className="mr-3 h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
                              My Campaigns
                            </Link>
                            <Link
                              to="/votes"
                              className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors duration-200 group"
                              onClick={() => setShowDropdown(false)}
                            >
                              <Award className="mr-3 h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
                              My Votes
                            </Link>
                            <Link
                              to="/myprojects"
                              className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors duration-200 group"
                              onClick={() => setShowDropdown(false)}
                            >
                              <FileCode className="mr-3 h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
                              My Projects
                            </Link>
                            <hr className="my-2 border-gray-100" />
                            <button
                              onClick={() => {
                                logout();
                                setShowDropdown(false);
                              }}
                              className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200 group"
                            >
                              <Settings className="mr-3 h-4 w-4 group-hover:rotate-90 transition-transform" />
                              Logout
                            </button>
                          </div>
                        </Transition>
                      </div>
                    </>
                  )}

                  {/* Connect Wallet Button - following original design */}
                  {!hideConnectBtn && !authenticated && (
                    <button 
                      onClick={handleLogin}
                      disabled={!ready} 
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 relative overflow-hidden group"
                    >
                      Connect Wallet
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                    </button>
                  )}

                  {/* Mobile Menu Button */}
                  <Disclosure.Button className="md:hidden p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200">
                    <span className="sr-only">Open main menu</span>
                    {open ? (
                      <X className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Menu className="h-5 w-5" aria-hidden="true" />
                    )}
                  </Disclosure.Button>
                </div>
              </div>
            </div>

            {/* Mobile Menu - simplified styling */}
            <Disclosure.Panel className="md:hidden bg-white/95 backdrop-blur-md border-t border-blue-200/50 shadow-lg">
              <div className="px-4 py-4 space-y-2">
                {navigation.map((item) => {
                  const NavIcon = item.icon;
                  const isActive = location.pathname === item.href;
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => close()}
                      className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive 
                          ? 'bg-blue-100 text-blue-700 shadow-sm' 
                          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      <NavIcon className="h-4 w-4 mr-3" />
                      {item.name}
                    </Link>
                  );
                })}
                
                {/* Create Options in Mobile */}
                <div className="pt-4 border-t border-blue-200/50">
                  <div className="px-4 py-2 text-xs font-semibold text-blue-600 uppercase tracking-wide">
                    Create New
                  </div>
                  {createOptions.map((option) => {
                    const OptionIcon = option.icon;
                    return (
                      <Link
                        key={option.name}
                        to={option.href}
                        onClick={() => close()}
                        className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                      >
                        <OptionIcon className="h-4 w-4 mr-3" />
                        {option.name}
                      </Link>
                    );
                  })}
                </div>
                
                {/* Mobile User Menu */}
                {authenticated && (
                  <div className="pt-4 border-t border-blue-200/50">
                    <div className="px-4 py-2 text-xs font-semibold text-blue-600 uppercase tracking-wide">
                      Account
                    </div>
                    <Link
                      to="/app/me"
                      onClick={() => close()}
                      className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                    >
                      <User className="h-4 w-4 mr-3" />
                      Profile
                    </Link>
                    <Link
                      to="/campaign/mycampaigns"
                      onClick={() => close()}
                      className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                    >
                      <Globe className="h-4 w-4 mr-3" />
                      My Campaigns
                    </Link>
                    <Link
                      to="/votes"
                      onClick={() => close()}
                      className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                    >
                      <Award className="h-4 w-4 mr-3" />
                      My Votes
                    </Link>
                    <Link
                      to="/myprojects"
                      onClick={() => close()}
                      className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                    >
                      <FileCode className="h-4 w-4 mr-3" />
                      My Projects
                    </Link>
                    <button
                      onClick={() => {
                        openWalletModal();
                        close();
                      }}
                      className="flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                    >
                      <Wallet className="h-4 w-4 mr-3" />
                      My Wallet
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        close();
                      }}
                      className="flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:text-red-200 hover:bg-red-50 transition-all duration-200"
                    >
                      <Settings className="h-4 w-4 mr-3" />
                      Logout
                    </button>
                  </div>
                )}

                {/* Mobile Connect Button */}
                {!hideConnectBtn && !authenticated && (
                  <div className="pt-4 border-t border-blue-200/50">
                    <button 
                      onClick={() => {
                        handleLogin();
                        close();
                      }}
                      disabled={!ready} 
                      className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:shadow-xl transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                    >
                      Connect Wallet
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                    </button>
                  </div>
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