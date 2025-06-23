import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatEther } from 'viem';
import {
  BarChart3,
  DollarSign,
  Vote,
  Users,
  CheckCircle,
  Clock,
  Waves,
  Zap,
  Shield,
  Calculator,
  ChevronDown
} from 'lucide-react';

interface CampaignSidebarProps {
  className?: string;
  campaign?: {
    totalFunds: bigint;
  };
  totalCampaignVotes: number;
  celoAmount?: bigint;
  cusdAmount?: bigint;
  totalVotes?: bigint;
  projectsCount: number;
  approvedCount: number;
  pendingCount: number;
  isAdmin: boolean;
  isConnected: boolean;
  isLoading?: boolean;
}

export const CampaignSidebar: React.FC<CampaignSidebarProps> = ({
  className = "",
  campaign,
  totalCampaignVotes = 0,
  celoAmount,
  cusdAmount,
  totalVotes,
  projectsCount = 0,
  approvedCount = 0,
  pendingCount = 0,
  isAdmin = false,
  isConnected = false,
  isLoading = false
}) => {
  const [expandedSections, setExpandedSections] = useState({
    analytics: true,
    tokenOcean: true,
    sovereignPower: true,
    simulator: false
  });

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  // STABLE SIDEBAR DATA - Always computed with fallbacks
  const stableSidebarData = useMemo(() => ({
    totalFunds: campaign ? parseFloat(formatEther(campaign.totalFunds)).toFixed(1) : '0.0',
    totalVotes: totalCampaignVotes.toFixed(1),
    celoAmount: celoAmount ? parseFloat(formatEther(celoAmount)).toFixed(1) : '0.0',
    cusdAmount: cusdAmount ? parseFloat(formatEther(cusdAmount)).toFixed(1) : '0.0',
    userVotes: totalVotes ? parseFloat(formatEther(totalVotes)).toFixed(1) : '0.0',
    projectsCount,
    approvedCount,
    pendingCount,
    isAdmin,
    isConnected
  }), [
    campaign?.totalFunds,
    totalCampaignVotes,
    celoAmount,
    cusdAmount,
    totalVotes,
    projectsCount,
    approvedCount,
    pendingCount,
    isAdmin,
    isConnected
  ]);

  if (isLoading) {
    return (
      <div className={`bg-white/90 backdrop-blur-lg border-r border-blue-100 ${className}`}>
        <div className="p-6 space-y-4">
          <div className="animate-pulse space-y-4">
            <div className="bg-gray-200 rounded-xl h-32"></div>
            <div className="bg-gray-200 rounded-xl h-24"></div>
            <div className="bg-gray-200 rounded-xl h-20"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white/90 backdrop-blur-lg border-r border-blue-100 ${className}`}>
      <div className="p-6 space-y-4">
        {/* Campaign Stats */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
          <button
            onClick={() => toggleSection('analytics')}
            className="w-full flex items-center justify-between mb-3"
          >
            <h3 className="text-sm font-bold text-gray-800 flex items-center">
              <BarChart3 className="h-4 w-4 text-blue-500 mr-2" />
              <span className="text-blue-600">Analytics</span>
            </h3>
            <motion.div
              animate={{ rotate: expandedSections.analytics ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4 text-blue-500" />
            </motion.div>
          </button>
          
          <AnimatePresence>
            {expandedSections.analytics && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-3 text-xs overflow-hidden"
              >
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center">
                    <DollarSign className="h-3 w-3 text-green-500 mr-1" />
                    Treasury
                  </span>
                  <div className="flex items-center space-x-1">
                    <span className="font-bold text-gray-800">{stableSidebarData.totalFunds}</span>
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-green-400 to-green-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">$</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center">
                    <Vote className="h-3 w-3 text-purple-500 mr-1" />
                    Total Votes
                  </span>
                  <span className="font-bold text-purple-600">{stableSidebarData.totalVotes}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center">
                    <Users className="h-3 w-3 text-blue-500 mr-1" />
                    Projects
                  </span>
                  <span className="font-bold text-blue-600">{stableSidebarData.projectsCount}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center">
                    <CheckCircle className="h-3 w-3 text-emerald-500 mr-1" />
                    Approved
                  </span>
                  <span className="font-bold text-emerald-600">{stableSidebarData.approvedCount}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center">
                    <Clock className="h-3 w-3 text-amber-500 mr-1" />
                    Pending
                  </span>
                  <span className="font-bold text-amber-600">{stableSidebarData.pendingCount}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Token Ocean */}
        <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 rounded-xl p-4 border border-cyan-100">
          <button
            onClick={() => toggleSection('tokenOcean')}
            className="w-full flex items-center justify-between mb-3"
          >
            <h3 className="text-sm font-bold text-gray-800 flex items-center">
              <Waves className="h-4 w-4 text-cyan-500 mr-2" />
              <span className="text-cyan-600">Tokens</span>
            </h3>
            <motion.div
              animate={{ rotate: expandedSections.tokenOcean ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4 text-cyan-500" />
            </motion.div>
          </button>
          
          <AnimatePresence>
            {expandedSections.tokenOcean && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-3 text-xs overflow-hidden"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <img 
                      src="/images/celo.png" 
                      alt="CELO"
                      className="w-5 h-5"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const nextElement = target.nextElementSibling as HTMLDivElement;
                        if (nextElement) {
                          nextElement.style.display = 'block';
                        }
                      }}
                    />
                    <div className="text-lg hidden">🪙</div>
                    <span className="text-gray-700 font-medium">CELO</span>
                  </div>
                  <span className="font-bold text-amber-600">{stableSidebarData.celoAmount}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <img 
                      src="/images/cusd.png" 
                      alt="cUSD"
                      className="w-5 h-5"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const nextElement = target.nextElementSibling as HTMLDivElement;
                        if (nextElement) {
                          nextElement.style.display = 'block';
                        }
                      }}
                    />
                    <div className="text-lg hidden">💵</div>
                    <span className="text-gray-700 font-medium">cUSD</span>
                  </div>
                  <span className="font-bold text-emerald-600">{stableSidebarData.cusdAmount}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quadratic Funding Simulator */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
          <button
            onClick={() => toggleSection('simulator')}
            className="w-full flex items-center justify-between mb-3"
          >
            <h3 className="text-sm font-bold text-gray-800 flex items-center">
              <Calculator className="h-4 w-4 text-purple-500 mr-2" />
              <span className="text-purple-600">QF Info</span>
            </h3>
            <motion.div
              animate={{ rotate: expandedSections.simulator ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4 text-purple-500" />
            </motion.div>
          </button>
          
          <AnimatePresence>
            {expandedSections.simulator && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-2 text-xs overflow-hidden"
              >
                <div className="bg-white/70 rounded-lg p-3">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-purple-600 text-xs">1</span>
                      </div>
                      <span className="text-gray-700">Votes are square-rooted</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-purple-600 text-xs">2</span>
                      </div>
                      <span className="text-gray-700">More voters = higher weight</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-purple-600 text-xs">3</span>
                      </div>
                      <span className="text-gray-700">Funds distributed proportionally</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Your Power */}
        {stableSidebarData.isConnected && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
            <button
              onClick={() => toggleSection('sovereignPower')}
              className="w-full flex items-center justify-between mb-3"
            >
              <h3 className="text-sm font-bold text-gray-800 flex items-center">
                <Zap className="h-4 w-4 text-indigo-500 mr-2" />
                <span className="text-indigo-600">Your Power</span>
              </h3>
              <motion.div
                animate={{ rotate: expandedSections.sovereignPower ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4 text-indigo-500" />
              </motion.div>
            </button>
            
            <AnimatePresence>
              {expandedSections.sovereignPower && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-3 text-xs overflow-hidden"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Votes Cast</span>
                    <span className="font-bold text-indigo-600">{stableSidebarData.userVotes}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Status</span>
                    <span className={`font-bold ${Number(totalVotes || 0n) > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                      {Number(totalVotes || 0n) > 0 ? 'Active Voter' : 'Observer'}
                    </span>
                  </div>

                  {stableSidebarData.isAdmin && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Role</span>
                      <span className="font-bold text-purple-600 flex items-center">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};