/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import sdk, { type Context } from "@farcaster/frame-sdk";
import UserSearch from "./farcaster/SearchUser";
import CampaignsList from "./CampaignsList";
import ProjectsList from "./ProjectsList";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  Rocket, 
  Users, 
  Star, 
  TrendingUp, 
  Heart,
  Zap,
  Crown,
  Sparkles,
  Globe,
  Target,
  Award,
  Flame,
  Waves,
  Activity,
  ChevronRight,
  Search,
  Filter,
  Grid,
  List
} from "lucide-react";

export default function Demo(
  { title }: { title?: string } = { title: "Sovereign Seas" }
) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<Context.FrameContext>();
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'projects' | 'profile'>('campaigns');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');

  const contractAddress = "0x0cc096b1cc568a22c1f02dab769881d1afe6161a";

  useEffect(() => {
    const loadSDK = async () => {
      try {
        
        setIsSDKLoaded(true);
      } catch (error) {
        console.error("Failed to load SDK:", error);
      }
    };

    loadSDK();
  }, []);

  useEffect(() => {
    if (isSDKLoaded) {
      const getContext = async () => {
        try {
          const context = await sdk.getContext();
          setContext(context);
        } catch (error) {
          console.error("Failed to get context:", error);
        }
      };

      getContext();
    }
  }, [isSDKLoaded]);

  const handleCampaignSelect = (campaignId: number) => {
    setSelectedCampaign(campaignId);
    // Navigate to campaign details page
    window.location.href = `/campaign/${campaignId}`;
  };

  const handleProjectSelect = (projectId: number) => {
    setSelectedProject(projectId);
    // Navigate to project details page
    window.location.href = `/project/${projectId}`;
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            x: [0, 100, 0],
            y: [0, -50, 0],
            rotate: [0, 180, 360]
          }}
          transition={{ 
            duration: 20, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-r from-purple-400/20 to-pink-400/20 blur-3xl"
        />
        <motion.div 
          animate={{ 
            x: [0, -100, 0],
            y: [0, 50, 0],
            rotate: [360, 180, 0]
          }}
          transition={{ 
            duration: 25, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-gradient-to-r from-blue-400/20 to-cyan-400/20 blur-3xl"
        />
        <motion.div 
          animate={{ 
            x: [0, 50, 0],
            y: [0, -100, 0],
            rotate: [0, 90, 180]
          }}
          transition={{ 
            duration: 30, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="absolute top-1/2 left-1/2 w-48 h-48 rounded-full bg-gradient-to-r from-emerald-400/20 to-teal-400/20 blur-3xl"
        />
      </div>

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
                <div className="relative">
                  <motion.div 
                    animate={{ 
                      rotate: 360,
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                      scale: { duration: 2, repeat: Infinity, repeatType: "reverse" }
                    }}
                    className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center"
                  >
                    <Waves className="h-6 w-6 text-white" />
                  </motion.div>
                  <motion.div 
                    animate={{ 
                      boxShadow: [
                        "0 0 20px rgba(168, 85, 247, 0.4)",
                        "0 0 40px rgba(168, 85, 247, 0.8)",
                        "0 0 20px rgba(168, 85, 247, 0.4)"
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 blur-lg opacity-50"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200">
                    {title}
                  </h1>
                  <p className="text-xs text-purple-200">Sovereign Funding Platform</p>
                </div>
              </motion.div>

              {/* Search Bar */}
              <div className="hidden md:flex flex-1 max-w-md mx-8">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-300" />
                  <input
                    type="text"
                    placeholder="Search campaigns, projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Connect Button */}
              <div className="flex items-center space-x-4">
                <ConnectButton />
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
                      <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 flex items-center">
                        <Trophy className="h-8 w-8 mr-3 text-purple-400" />
                        Campaign Explorer
                      </h2>
                      <p className="text-purple-200 mt-2">Discover and participate in funding campaigns</p>
                    </div>
                    
                    {/* View Mode Toggle */}
                    <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-xl p-1 border border-white/20">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-all ${
                          viewMode === 'grid' 
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                            : 'text-purple-200 hover:text-white'
                        }`}
                      >
                        <Grid className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-all ${
                          viewMode === 'list' 
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                            : 'text-purple-200 hover:text-white'
                        }`}
                      >
                        <List className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Campaigns List */}
                  <div className={`${
                    viewMode === 'grid' 
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
                      : 'space-y-4'
                  }`}>
                    <CampaignsList 
                      contractAddress={contractAddress} 
                      onCampaignSelect={handleCampaignSelect}
                      viewMode={viewMode}
                    />
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
                      <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 flex items-center">
                        <Rocket className="h-8 w-8 mr-3 text-blue-400" />
                        Project Explorer
                      </h2>
                      <p className="text-blue-200 mt-2">Explore innovative projects seeking funding</p>
                    </div>
                    
                    {/* View Mode Toggle */}
                    <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-xl p-1 border border-white/20">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-all ${
                          viewMode === 'grid' 
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' 
                            : 'text-blue-200 hover:text-white'
                        }`}
                      >
                        <Grid className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-all ${
                          viewMode === 'list' 
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' 
                            : 'text-blue-200 hover:text-white'
                        }`}
                      >
                        <List className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Projects List */}
                  <div className={`${
                    viewMode === 'grid' 
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
                      : 'space-y-4'
                  }`}>
                    <ProjectsList 
                      contractAddress={contractAddress} 
                      onProjectSelect={handleProjectSelect}
                      viewMode={viewMode}
                    />
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
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 flex items-center">
                      <Users className="h-8 w-8 mr-3 text-emerald-400" />
                      My Profile
                    </h2>
                    <p className="text-emerald-200 mt-2">Manage your sovereign identity and activities</p>
                  </div>

                  {/* Profile Content */}
                  <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
                    <div className="text-center">
                      <div className="w-24 h-24 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="h-12 w-12 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Your Sovereign Profile</h3>
                      <p className="text-emerald-200 mb-6">Connect your wallet to view your profile</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg mb-3 mx-auto">
                            <Trophy className="h-6 w-6 text-white" />
                          </div>
                          <h4 className="text-white font-semibold mb-1">Campaigns</h4>
                          <p className="text-purple-200 text-sm">Manage your campaigns</p>
                        </div>
                        
                        <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg mb-3 mx-auto">
                            <Rocket className="h-6 w-6 text-white" />
                          </div>
                          <h4 className="text-white font-semibold mb-1">Projects</h4>
                          <p className="text-blue-200 text-sm">Your project portfolio</p>
                        </div>
                        
                        <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg mb-3 mx-auto">
                            <Heart className="h-6 w-6 text-white" />
                          </div>
                          <h4 className="text-white font-semibold mb-1">Votes</h4>
                          <p className="text-emerald-200 text-sm">Your voting history</p>
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
                      : 'text-purple-200 hover:text-white hover:bg-white/10'
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
    </div>
  );
}