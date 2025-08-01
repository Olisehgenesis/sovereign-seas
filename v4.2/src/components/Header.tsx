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

  console.log('Privy Auth State:', { authenticated, ready });
  const { login } = useLogin();

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
  
  // Handle wallet connection with Privy login
  const handleLogin = () => {
    console.log('Login attempt - States:', { 
      isConnected, 
      hasEthereum: typeof window !== 'undefined' && !!window.ethereum,
      isMiniPay: typeof window !== 'undefined' && window.ethereum?.isMiniPay,
      ready
    });
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
          ? 'bg-gradient-to-r from-blue-50/95 via-indigo-50/95 to-purple-50/95 backdrop-blur-md shadow-md border-b border-blue-300/50' 
          : 'bg-gradient-to-r from-blue-50/90 via-indigo-50/90 to-purple-50/90 backdrop-blur-sm border-b border-blue-300/40'
      }`}>
        {({ open, close }) => (
          <>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className={`flex items-center justify-between transition-all duration-300 ${
                isScrolled ? 'h-16' : 'h-20'
              }`}>
                
                {/* Logo - enhanced with more color */}
                <Link to="/" className="flex items-center group">
                  <div className={`relative mr-3 transition-all duration-300 ${
                    isScrolled ? 'h-6 w-6' : 'h-8 w-8'
                  }`}>
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 shadow-lg group-hover:shadow-blue-400/50 transition-all duration-300 group-hover:scale-105 flex items-center justify-center animate-pulse">
                      <Anchor className={`text-white group-hover:rotate-12 transition-all duration-300 ${
                        isScrolled ? 'h-3 w-3' : 'h-4 w-4'
                      }`} />
                    </div>
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-400 to-pink-500 opacity-20 animate-ping"></div>
                  </div>
                  <span className={`font-bold text-gray-800 transition-all duration-300 ${
                    isScrolled ? 'text-lg' : 'text-xl'
                  }`}>
                    Sovereign<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative animate-pulse">
                      Seas
                      <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 animate-pulse"></span>
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
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                          isActive 
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25' 
                            : 'text-gray-600 hover:text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50'
                        }`}
                      >
                        <NavIcon className={`mr-2 group-hover:scale-110 transition-all duration-200 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-blue-600'} ${
                          isScrolled ? 'h-3.5 w-3.5' : 'h-4 w-4'
                        }`} />
                        <span className={`font-semibold transition-all duration-200 ${isActive ? 'text-white' : 'text-blue-600 group-hover:text-indigo-700'} ${
                          isScrolled ? 'text-sm' : 'text-sm'
                        }`}>
                          {item.name}
                        </span>
                        {isActive && (
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full"></div>
                        )}
                      </Link>
                    );
                  })}
                  
                  {/* Create Dropdown - simplified */}
                  <div className="relative">
                    <button
                      onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                      className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                        showCreateDropdown 
                          ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/25' 
                          : 'text-gray-600 hover:text-purple-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50'
                      }`}
                    >
                      <PlusCircle className={`h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-300 ${showCreateDropdown ? 'text-white' : 'text-gray-500 group-hover:text-purple-600'}`} />
                                              <span className={`font-semibold ${showCreateDropdown ? 'text-white' : 'text-purple-600 group-hover:text-pink-700'}`}>
                          Create
                        </span>
                      <ChevronDown className={`ml-1 h-3 w-3 transition-transform duration-200 ${showCreateDropdown ? 'rotate-180' : ''}`} />
                      {showCreateDropdown && (
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-pink-400 to-red-500 rounded-full"></div>
                      )}
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
                      <span className="absolute top-1 right-1 h-2 w-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-ping"></span>
                      </button>

                      {/* Wallet Button */}
                      <button
                        onClick={openWalletModal}
                        className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 group"
                      >
                        <Wallet className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                        <span className="hidden sm:inline font-semibold text-emerald-600 group-hover:text-teal-700">
                          {address ? abbreviateAddress(address) : 'Wallet'}
                        </span>
                      </button>

                      {/* Profile Button */}
                      <Link
                        to="/app/me"
                        className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 group"
                      >
                        <User className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                        <span className="hidden sm:inline font-semibold text-indigo-600 group-hover:text-purple-700">Profile</span>
                      </Link>

                      {/* Logout Button */}
                      <button
                        onClick={() => logout()}
                        className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200 group"
                        title="Logout"
                      >
                        <svg className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="hidden sm:inline font-semibold text-rose-600 group-hover:text-red-700">Logout</span>
                      </button>

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
                      className="flex items-center justify-center px-3 sm:px-4 md:px-6 py-2.5 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 relative overflow-hidden group min-w-[100px] sm:min-w-[120px] md:min-w-[140px] touch-manipulation"
                    >
                      <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 group-hover:scale-110 transition-transform duration-200" />
                      <span className="hidden xs:inline font-bold text-white drop-shadow-sm">Connect</span>
                      <span className="xs:hidden font-bold text-white drop-shadow-sm">Connect</span>
                      <span className="hidden sm:inline ml-1 font-bold text-white drop-shadow-sm">Wallet</span>
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
                      className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                        isActive 
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25' 
                          : 'text-gray-600 hover:text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50'
                      }`}
                    >
                                              <NavIcon className={`h-4 w-4 mr-3 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                        <span className={`font-semibold ${isActive ? 'text-white' : 'text-blue-600'}`}>
                          {item.name}
                        </span>
                      {isActive && (
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full"></div>
                      )}
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
                      className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:shadow-xl transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                    >
                      <Wallet className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                      <span className="font-bold text-white drop-shadow-sm">Connect Wallet</span>
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