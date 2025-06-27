/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useCallback } from "react";
import sdk, { type Context } from "@farcaster/frame-sdk";
import CampaignsList from "./CampaignsList";
import ProjectsList from "./ProjectsList";
import CampaignDetails from "./CampaignDetails";
import ErrorBoundary from "./ErrorBoundary";
import ErrorToast from "./ErrorToast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  Rocket, 
  Users, 
  Star, 
  Heart,
  Waves,
  Activity,
  ChevronRight,
  Search,
  ArrowLeft,
  Wallet,
  X,
  LogOut,
  Settings,
  Menu,
  Timer,
  Plus,
  Loader2,
  Shield,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Calculator,
  Info,
  Clock,
  Vote,
  Medal
} from "lucide-react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";

export default function Demo(
  { title }: { title?: string } = { title: "Sovereign Seas" }
) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<Context.FrameContext>();
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'projects' | 'profile'>('campaigns');
  const [searchTerm, setSearchTerm] = useState('');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [isInFarcaster, setIsInFarcaster] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const contractAddress = "0x0cc096b1cc568a22c1f02dab769881d1afe6161a";

  // SDK initialization with Mini App detection
  useEffect(() => {
    const loadSDK = async () => {
      try {
        // Check if running in Mini App by checking the context
        const frameContext = await sdk.context;
        setContext(frameContext);
        
        const miniAppStatus = frameContext?.client?.clientFid !== undefined;
        setIsMiniApp(miniAppStatus);
        setIsInFarcaster(miniAppStatus);
        
        if (miniAppStatus) {
          // Call ready to dismiss Farcaster's loading screen
          await sdk.actions.ready();
        }
        
        setIsSDKLoaded(true);
      } catch (error) {
        console.error("Failed to load SDK:", error);
        // Still set as loaded to avoid infinite loading
        setIsSDKLoaded(true);
      }
    };

    loadSDK();
  }, []);

  // Auto-connect logic for Farcaster Mini App users
  useEffect(() => {
    if (isSDKLoaded && isMiniApp && isInFarcaster && !isConnected) {
      // Directly connect with Farcaster frame connector without showing modal
      const farcasterConnector = connectors.find((c) => c.id === 'farcasterFrame');
      if (farcasterConnector) {
        connect({ connector: farcasterConnector });
      } else {
        // Fallback to injected wallet
        connect({ connector: injected() });
      }
    }
  }, [isSDKLoaded, isMiniApp, isInFarcaster, isConnected, connect, connectors]);

  // Handle wallet connection state
  useEffect(() => {
    if (isMiniApp && isInFarcaster) {
      // In Farcaster Mini App, never show connect modal - connect directly
      setShowConnectModal(false);
    } else if (!isConnected) {
      // Outside Farcaster or regular web, show connect modal if not connected
      setShowConnectModal(true);
    } else {
      setShowConnectModal(false);
    }
  }, [isConnected, isMiniApp, isInFarcaster]);

  // Debug modal visibility
  useEffect(() => {
    console.log('Modal visibility changed:', showConnectModal);
  }, [showConnectModal]);

  const handleCampaignSelect = useCallback((campaignId: number) => {
    setSelectedCampaign(campaignId);
  }, []);

  const handleBackToMain = useCallback(() => {
    setSelectedCampaign(null);
    setSelectedProject(null);
  }, []);

  const handleProjectSelect = useCallback((projectId: number) => {
    setSelectedProject(projectId);
  }, []);

  const showError = useCallback((message: string) => {
    setErrorMessage(message);
  }, []);

  const hideError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const handleConnectWallet = useCallback(() => {
    console.log('Available connectors:', connectors);
    console.log('Is Mini App:', isMiniApp);
    console.log('Is in Farcaster:', isInFarcaster);
    
    try {
      if (isMiniApp && isInFarcaster) {
        // Direct Farcaster connection - no modal, no QR codes
        const farcasterConnector = connectors.find((c) => c.id === 'farcasterFrame');
        console.log('Farcaster connector:', farcasterConnector);
        if (farcasterConnector) {
          connect({ connector: farcasterConnector });
        } else {
          // Fallback to first available connector
          const firstConnector = connectors[0];
          console.log('Using first connector:', firstConnector);
          if (firstConnector) {
            connect({ connector: firstConnector });
          }
        }
      } else {
        // For regular web, try MetaMask first, then fallback to first available
        const metaMaskConnector = connectors.find((c) => c.id === 'metaMask');
        console.log('MetaMask connector:', metaMaskConnector);
        if (metaMaskConnector) {
          connect({ connector: metaMaskConnector });
        } else {
          const firstConnector = connectors[0];
          console.log('Using first connector:', firstConnector);
          if (firstConnector) {
            connect({ connector: firstConnector });
          }
        }
      }
      setShowConnectModal(false);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      showError('Failed to connect wallet. Please try again.');
    }
  }, [isMiniApp, isInFarcaster, connect, connectors, showError]);

  const handleDisconnect = useCallback(() => {
    disconnect();
    setShowProfileDropdown(false);
  }, [disconnect]);

  const handleCloseApp = useCallback(() => {
    if (isMiniApp && isInFarcaster) {
      sdk.actions.close();
    }
  }, [isMiniApp, isInFarcaster]);

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'campaigns':
        return <Trophy className="h-5 w-5" />;
      case 'projects':
        return <Rocket className="h-5 w-5" />;
      case 'profile':
        return <Users className="h-5 w-5" />;
      default:
        return <Star className="h-5 w-5" />;
    }
  };

  const getTabColor = (tab: string) => {
    switch (tab) {
      case 'campaigns':
        return 'from-purple-500 to-pink-500';
      case 'projects':
        return 'from-blue-500 to-cyan-500';
      case 'profile':
        return 'from-emerald-500 to-teal-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  // Connect Wallet Modal
  const ConnectWalletModal = () => {
    console.log('ConnectWalletModal rendering, showConnectModal:', showConnectModal);
    return (
      <AnimatePresence>
        {showConnectModal && (
          <motion.div 
            className="fixed inset-0 bg-gradient-to-br from-stone-900/20 via-amber-900/20 to-orange-900/20 backdrop-blur-lg flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-gradient-to-br from-stone-50 to-amber-50/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 w-full max-w-sm mx-4 shadow-2xl border-2 border-amber-200/60 relative overflow-hidden"
              initial={{ scale: 0.8, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: -50, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="relative text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl">
                  <Wallet className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                
                <h3 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-amber-700 via-orange-700 to-red-700 bg-clip-text text-transparent mb-3">
                  🔗 Connect & Explore!
                </h3>
                
                <p className="text-stone-600 text-sm sm:text-base mb-6 sm:mb-8">
                  {isMiniApp && isInFarcaster 
                    ? '🎮 Connect your wallet to start your sovereign funding adventure!' 
                    : '🎮 Connect your Celo wallet to explore campaigns and vote on projects!'
                  }
                </p>
                
                {isMiniApp && isInFarcaster ? (
                  <div className="space-y-3">
                    <button
                      onClick={handleConnectWallet}
                      className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white py-3 sm:py-4 rounded-2xl font-bold hover:shadow-2xl transition-all mb-3"
                    >
                      🎯 Connect with Farcaster
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => {
                        console.log('Modal connect button clicked');
                        handleConnectWallet();
                      }}
                      className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white py-3 sm:py-4 rounded-2xl font-bold hover:shadow-2xl transition-all mb-4"
                    >
                      🚀 Connect Wallet
                    </button>
                  </div>
                )}
                
                <button
                  onClick={() => setShowConnectModal(false)}
                  className="w-full text-stone-500 py-2 text-sm hover:text-stone-600 transition-colors"
                >
                  ⏰ Maybe later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  const handleSwitchToCelo = useCallback(async () => {
    try {
      // Celo mainnet chain ID is 42220
      await switchChain({ chainId: 42220 });
    } catch (error) {
      console.error('Failed to switch to Celo:', error);
      showError('Failed to switch to Celo network. Please try again.');
    }
  }, [switchChain, showError]);

  const isCeloNetwork = chainId === 42220;

  // Loading screen for SDK
  if (!isSDKLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 flex items-center justify-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-gradient-to-r from-blue-400/20 to-indigo-400/20 animate-float blur-2xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-gradient-to-r from-cyan-400/20 to-blue-400/20 animate-float-delay-1 blur-2xl"></div>
        </div>
        
        <div className="glass-morphism rounded-2xl p-8 shadow-xl relative">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <Waves className="h-6 w-6 text-blue-500 absolute inset-0 m-auto animate-wave" />
            </div>
            <div className="text-center">
              <p className="text-lg text-blue-600 font-semibold">Loading Sovereign Seas...</p>
              <p className="text-sm text-gray-600 animate-pulse">Preparing your funding adventure</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If a campaign is selected, show campaign details
  if (selectedCampaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100">
        {/* Minimal Header */}
        <div className="bg-white/10 backdrop-blur-xl border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={handleBackToMain}
                  className="p-2 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-white/10"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-white" />
                  </div>
                  <h1 className="text-lg font-bold text-gray-800">Campaign Details</h1>
                </div>
              </div>
              
              {/* Connect/Profile Button */}
              <div className="flex items-center space-x-2">
                {/* Chain Indicator */}
                {isConnected && (
                  <div className="flex items-center space-x-2">
                    {chainId === 42220 ? (
                      <div className="flex items-center space-x-2 px-3 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-green-700 text-sm font-medium">Celo</span>
                      </div>
                    ) : (
                      <button
                        onClick={handleSwitchToCelo}
                        className="flex items-center space-x-2 px-3 py-2 bg-orange-500/20 border border-orange-500/30 rounded-lg hover:bg-orange-500/30 transition-all"
                      >
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-orange-700 text-sm font-medium">Switch to Celo</span>
                      </button>
                    )}
                  </div>
                )}
                
                {isConnected ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                      className="flex items-center space-x-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                    >
                      <Wallet className="h-4 w-4 text-blue-600" />
                      <span className="text-blue-600 text-sm font-medium">
                        {address?.slice(0, 6)}...{address?.slice(-4)}
                      </span>
                    </button>
                    
                    {showProfileDropdown && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white/10 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 py-2 z-10">
                        <button className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-white/10 transition-colors">
                          <Settings className="w-4 h-4 mr-3" />
                          ⚙️ Settings
                        </button>
                        <button 
                          onClick={handleDisconnect}
                          className="flex items-center w-full px-4 py-3 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          <LogOut className="w-4 h-4 mr-3" />
                          🔌 Disconnect
                        </button>
                        {isMiniApp && isInFarcaster && (
                          <button 
                            onClick={handleCloseApp}
                            className="flex items-center w-full px-4 py-3 text-sm text-orange-400 hover:bg-orange-500/20 transition-colors"
                          >
                            <X className="w-4 h-4 mr-3" />
                            ❌ Close App
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      console.log('Header connect button clicked');
                      if (isMiniApp && isInFarcaster) {
                        // Direct Farcaster connection without modal
                        handleConnectWallet();
                      } else {
                        setShowConnectModal(true);
                      }
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-lg transition-all"
                  >
                    <Wallet className="h-4 w-4 text-white" />
                    <span className="text-white text-sm font-medium">Connect</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Campaign Details Component */}
        {selectedCampaign && (
          <ErrorBoundary>
            <CampaignDetails campaignId={selectedCampaign} />
          </ErrorBoundary>
        )}
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100"
      style={{
        paddingTop: context?.client?.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client?.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client?.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client?.safeAreaInsets?.right ?? 0,
      }}
    >
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Enhanced Header */}
        <motion.header 
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/10 backdrop-blur-xl border-b border-white/20 sticky top-0 z-50"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo and Title */}
              <motion.div 
                className="flex items-center space-x-3"
                whileHover={{ scale: 1.05 }}
              >
                <div>
                  <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                    {title}
                  </h1>
                  <p className="text-xs text-blue-500">Sovereign Funding Platform</p>
                </div>
              </motion.div>

              {/* Search Bar */}
              <div className="hidden md:flex flex-1 max-w-md mx-8">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-400" />
                  <input
                    type="text"
                    placeholder="Search campaigns, projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-gray-800 placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Connect/Profile Button */}
              <div className="flex items-center space-x-4">
                {/* Chain Indicator */}
                {isConnected && (
                  <div className="flex items-center space-x-2">
                    {chainId === 42220 ? (
                      <div className="flex items-center space-x-2 px-3 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-green-700 text-sm font-medium">Celo</span>
                      </div>
                    ) : (
                      <button
                        onClick={handleSwitchToCelo}
                        className="flex items-center space-x-2 px-3 py-2 bg-orange-500/20 border border-orange-500/30 rounded-lg hover:bg-orange-500/30 transition-all"
                      >
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-orange-700 text-sm font-medium">Switch to Celo</span>
                      </button>
                    )}
                  </div>
                )}
                
                {isConnected ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                      className="flex items-center space-x-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                    >
                      <Wallet className="h-4 w-4 text-blue-600" />
                      <span className="text-blue-600 text-sm font-medium">
                        {address?.slice(0, 6)}...{address?.slice(-4)}
                      </span>
                    </button>
                    
                    {showProfileDropdown && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white/10 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 py-2 z-10">
                        <button className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-white/10 transition-colors">
                          <Settings className="w-4 h-4 mr-3" />
                          ⚙️ Settings
                        </button>
                        <button 
                          onClick={handleDisconnect}
                          className="flex items-center w-full px-4 py-3 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          <LogOut className="w-4 h-4 mr-3" />
                          🔌 Disconnect
                        </button>
                        {isMiniApp && isInFarcaster && (
                          <button 
                            onClick={handleCloseApp}
                            className="flex items-center w-full px-4 py-3 text-sm text-orange-400 hover:bg-orange-500/20 transition-colors"
                          >
                            <X className="w-4 h-4 mr-3" />
                            ❌ Close App
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      console.log('Header connect button clicked');
                      if (isMiniApp && isInFarcaster) {
                        // Direct Farcaster connection without modal
                        handleConnectWallet();
                      } else {
                        setShowConnectModal(true);
                      }
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-lg transition-all"
                  >
                    <Wallet className="h-4 w-4 text-white" />
                    <span className="text-white text-sm font-medium">Connect</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <main className="flex-1 relative">
          {/* Content Area */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === 'campaigns' && (
                <motion.div
                  key="campaigns"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Campaigns Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center">
                        <Trophy className="h-8 w-8 mr-3 text-blue-500" />
                        Campaign Explorer
                      </h2>
                      <p className="text-blue-600 mt-2">Discover and participate in funding campaigns</p>
                    </div>
                  </div>

                  {/* Campaigns List */}
                  <div className="space-y-4">
                    <ErrorBoundary>
                      <CampaignsList 
                        contractAddress={contractAddress} 
                        onCampaignSelect={handleCampaignSelect}
                        viewMode="list"
                      />
                    </ErrorBoundary>
                  </div>
                </motion.div>
              )}

              {activeTab === 'projects' && (
                <motion.div
                  key="projects"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Projects Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center">
                        <Rocket className="h-8 w-8 mr-3 text-blue-500" />
                        Project Explorer
                      </h2>
                      <p className="text-blue-600 mt-2">Explore innovative projects seeking funding</p>
                    </div>
                  </div>

                  {/* Projects List */}
                  <div className="space-y-4">
                    <ErrorBoundary>
                      <ProjectsList 
                        contractAddress={contractAddress} 
                        onProjectSelect={handleProjectSelect}
                        viewMode="list"
                      />
                    </ErrorBoundary>
                  </div>
                </motion.div>
              )}

              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Profile Header */}
                  <div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center">
                      <Users className="h-8 w-8 mr-3 text-blue-500" />
                      My Profile
                    </h2>
                    <p className="text-blue-600 mt-2">Manage your sovereign identity and activities</p>
                  </div>

                  {/* Profile Content */}
                  <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
                    <div className="text-center">
                      <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="h-12 w-12 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">Your Sovereign Profile</h3>
                      <p className="text-blue-600 mb-6">Connect your wallet to view your profile</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg mb-3 mx-auto">
                            <Trophy className="h-6 w-6 text-white" />
                          </div>
                          <h4 className="text-gray-800 font-semibold mb-1">Campaigns</h4>
                          <p className="text-blue-600 text-sm">Manage your campaigns</p>
                        </div>
                        
                        <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg mb-3 mx-auto">
                            <Rocket className="h-6 w-6 text-white" />
                          </div>
                          <h4 className="text-gray-800 font-semibold mb-1">Projects</h4>
                          <p className="text-blue-600 text-sm">Your project portfolio</p>
                        </div>
                        
                        <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg mb-3 mx-auto">
                            <Heart className="h-6 w-6 text-white" />
                          </div>
                          <h4 className="text-gray-800 font-semibold mb-1">Votes</h4>
                          <p className="text-blue-600 text-sm">Your voting history</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Enhanced Bottom Navigation */}
        <motion.nav 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/10 backdrop-blur-xl border-t border-white/20 sticky bottom-0 z-50"
        >
          <div className="max-w-md mx-auto px-4">
            <div className="flex items-center justify-around py-4">
              {(['campaigns', 'projects', 'profile'] as const).map((tab) => (
                <motion.button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex flex-col items-center space-y-1 p-3 rounded-xl transition-all duration-300 ${
                    activeTab === tab
                      ? `bg-gradient-to-r ${getTabColor(tab)} text-white shadow-lg`
                      : 'text-blue-600 hover:text-blue-700 hover:bg-white/10'
                  }`}
                >
                  <motion.div
                    animate={activeTab === tab ? { 
                      scale: [1, 1.2, 1],
                      rotate: [0, 10, -10, 0]
                    } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    {getTabIcon(tab)}
                  </motion.div>
                  <span className="text-xs font-medium capitalize">{tab}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.nav>
      </div>

      {/* Connect Wallet Modal */}
      {showConnectModal && <ConnectWalletModal />}

      {/* Error Toast */}
      <ErrorToast
        message={errorMessage || ''}
        isVisible={!!errorMessage}
        onClose={hideError}
        duration={5000}
      />
    </div>
  );
}