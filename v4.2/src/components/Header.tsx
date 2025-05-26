
import { Disclosure, Transition } from '@headlessui/react';
import { useEffect, useState } from 'react';
import { useConnect, useAccount, injected } from 'wagmi';
import { Menu, X, ChevronDown, Globe, Award, Settings,  PlusCircle,  FileCode, Anchor, Wallet, Compass, Ship, BookOpen,User, Bell } from 'lucide-react';
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
  


  // Handle scroll effect
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
      <Disclosure as="nav" className={`fixed w-full top-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100' 
          : 'bg-transparent'
      }`}>
        {({ open, close }) => (
          <>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex h-16 items-center justify-between">
                
                {/* Logo */}
                <Link to="/" className="flex items-center group">
                  <div className="relative h-8 w-8 mr-3">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300"></div>
                    <div className="absolute inset-0.5 rounded-full bg-white flex items-center justify-center">
                      <Anchor className="h-4 w-4 text-blue-500 group-hover:rotate-12 transition-transform duration-300" />
                    </div>
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Sovereign<span className="text-blue-500">Seas</span>
                  </span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center space-x-1">
                  {navigation.map((item) => {
                    const NavIcon = item.icon;
                    const isActive = location.pathname === item.href;
                    
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
                          isActive 
                            ? 'bg-blue-50 text-blue-600' 
                            : isScrolled 
                              ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50' 
                              : 'text-white/90 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <NavIcon className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                        {item.name}
                      </Link>
                    );
                  })}
                  
                  {/* Create Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                      className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
                        showCreateDropdown 
                          ? 'bg-blue-50 text-blue-600' 
                          : isScrolled 
                            ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50' 
                            : 'text-white/90 hover:text-white hover:bg-white/10'
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
                        className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50"
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
                              className="flex items-center w-full px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors duration-200 group"
                            >
                              <div className="bg-blue-100 p-2 rounded-lg mr-3 group-hover:bg-blue-200 transition-colors">
                                <OptionIcon className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium text-sm">{option.name}</div>
                                <div className="text-xs text-gray-500">{option.description}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </Transition>
                  </div>
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center space-x-3">
                  
                  {/* Authenticated User Actions */}
                  {authenticated && (
                    <>
                      {/* Notifications */}
                      <button className={`p-2 rounded-lg transition-all duration-200 ${
                        isScrolled 
                          ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50' 
                          : 'text-white/90 hover:text-white hover:bg-white/10'
                      }`}>
                        <Bell className="h-5 w-5" />
                      </button>

                      {/* Wallet Button */}
                      <button
                        onClick={openWalletModal}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isScrolled 
                            ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50' 
                            : 'text-white/90 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <Wallet className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">
                          {address ? abbreviateAddress(address) : 'Wallet'}
                        </span>
                      </button>

                      {/* Profile Button */}
                      <Link
                        to="/app/me"
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          isScrolled 
                            ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50' 
                            : 'text-white/90 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <User className="h-5 w-5" />
                      </Link>

                      {/* Dashboard Dropdown */}
                      <div className="relative hidden sm:block">
                        <button
                          onClick={() => setShowDropdown(!showDropdown)}
                          className={`p-2 rounded-lg transition-all duration-200 ${
                            showDropdown 
                              ? 'bg-blue-50 text-blue-600' 
                              : isScrolled 
                                ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50' 
                                : 'text-white/90 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <Settings className="h-5 w-5" />
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
                            className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50"
                            onMouseLeave={() => setShowDropdown(false)}
                          >
                            <Link
                              to="/campaign/mycampaigns"
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                              onClick={() => setShowDropdown(false)}
                            >
                              <Globe className="mr-3 h-4 w-4 text-gray-400" />
                              My Campaigns
                            </Link>
                            <Link
                              to="/votes"
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                              onClick={() => setShowDropdown(false)}
                            >
                              <Award className="mr-3 h-4 w-4 text-gray-400" />
                              My Votes
                            </Link>
                            <Link
                              to="/myprojects"
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                              onClick={() => setShowDropdown(false)}
                            >
                              <FileCode className="mr-3 h-4 w-4 text-gray-400" />
                              My Projects
                            </Link>
                            <hr className="my-2 border-gray-100" />
                            <button
                              onClick={() => {
                                logout();
                                setShowDropdown(false);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                            >
                              <Settings className="mr-3 h-4 w-4" />
                              Logout
                            </button>
                          </div>
                        </Transition>
                      </div>
                    </>
                  )}

                  {/* Connect Wallet Button */}
                  {!hideConnectBtn && !authenticated && (
                    <button 
                      onClick={handleLogin}
                      disabled={!ready} 
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Connect Wallet
                    </button>
                  )}

                  {/* Mobile Menu Button */}
                  <Disclosure.Button className="md:hidden p-2 rounded-lg transition-all duration-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
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

            {/* Mobile Menu */}
            <Disclosure.Panel className="md:hidden bg-white border-t border-gray-100">
              <div className="px-4 py-3 space-y-1">
                {navigation.map((item) => {
                  const NavIcon = item.icon;
                  const isActive = location.pathname === item.href;
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => close()}
                      className={`flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive 
                          ? 'bg-blue-50 text-blue-600' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <NavIcon className="h-4 w-4 mr-3" />
                      {item.name}
                    </Link>
                  );
                })}
                
                {/* Create Options in Mobile */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Create New
                  </div>
                  {createOptions.map((option) => {
                    const OptionIcon = option.icon;
                    return (
                      <Link
                        key={option.name}
                        to={option.href}
                        onClick={() => close()}
                        className="flex items-center px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200"
                      >
                        <OptionIcon className="h-4 w-4 mr-3 text-gray-400" />
                        {option.name}
                      </Link>
                    );
                  })}
                </div>
                
                {/* Mobile User Menu */}
                {authenticated && (
                  <div className="pt-3 border-t border-gray-100">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Account
                    </div>
                    <Link
                      to="/app/me"
                      onClick={() => close()}
                      className="flex items-center px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200"
                    >
                      <User className="h-4 w-4 mr-3 text-gray-400" />
                      Profile
                    </Link>
                    <Link
                      to="/campaign/mycampaigns"
                      onClick={() => close()}
                      className="flex items-center px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200"
                    >
                      <Globe className="h-4 w-4 mr-3 text-gray-400" />
                      My Campaigns
                    </Link>
                    <Link
                      to="/votes"
                      onClick={() => close()}
                      className="flex items-center px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200"
                    >
                      <Award className="h-4 w-4 mr-3 text-gray-400" />
                      My Votes
                    </Link>
                    <Link
                      to="/myprojects"
                      onClick={() => close()}
                      className="flex items-center px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200"
                    >
                      <FileCode className="h-4 w-4 mr-3 text-gray-400" />
                      My Projects
                    </Link>
                    <button
                      onClick={() => {
                        openWalletModal();
                        close();
                      }}
                      className="flex items-center w-full px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200"
                    >
                      <Wallet className="h-4 w-4 mr-3 text-gray-400" />
                      My Wallet
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        close();
                      }}
                      className="flex items-center w-full px-3 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200"
                    >
                      <Settings className="h-4 w-4 mr-3" />
                      Logout
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