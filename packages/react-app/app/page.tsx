'use client';

import { useEffect, useState, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { 
  ArrowRight, 
  Activity, 
  Award, 
  Globe, 
  ChevronRight,
  BarChart,
  Sparkles,
  Lightbulb,
  Rocket,
  Shield,
  Clock,
  Video,
  CheckCircle,
  Wallet,
  Wave,
  Star,
  Anchor,
  Zap,
  CreditCard,
  BarChart2,
  DollarSign,
  ArrowUpRight
} from 'lucide-react';
import Image from 'next/image';
import { useSovereignSeas } from '../hooks/useSovereignSeas';
import React from 'react';

// Featured campaign type
type FeaturedCampaign = {
  id: string;
  name: string;
  description: string;
  logo: string;
  demoVideo: string;
  totalFunds: string;
  isActive: boolean;
  endsIn?: string;
  startsIn?: string;
  startTime?: string|number;
  endTime?: string|number;
};

export default function Home() {
  const router = useRouter();
  const [userAddress, setUserAddress] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const [currentToken, setCurrentToken] = useState(0);
  const tokens = ['CELO', 'cUSD', 'GS', 'GLOdollar'];
  const tokenColors = ['text-green-500', 'text-blue-500', 'text-purple-500', 'text-yellow-500'];
  
  // Stats state
  const [activeCampaigns, setActiveCampaigns] = useState(0);
  const [totalProjects, setTotalProjects] = useState(0);
  const [totalVotes, setTotalVotes] = useState('0');
  const [totalFunds, setTotalFunds] = useState('0');
  const [featuredCampaigns, setFeaturedCampaigns] = useState<FeaturedCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add this state for real-time countdowns
  const [timeNow, setTimeNow] = useState(Math.floor(Date.now() / 1000));

  // Typing animation for tokens
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentToken((prev) => (prev + 1) % tokens.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Add this effect to update the time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeNow(Math.floor(Date.now() / 1000));
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Use the hook to interact with the contract
  const {
    isInitialized,
    loadCampaigns,
    formatTokenAmount,
    loadProjects,
    formatCampaignTime,
    getCampaignTimeRemaining,
    isCampaignActive,
    isSuperAdmin
  } = useSovereignSeas();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      setUserAddress(address);
    }
  }, [address, isConnected]);

  // Load data from the blockchain
  useEffect(() => {
    if (isInitialized) {
      fetchData();
    }
  }, [isInitialized]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const campaigns = await loadCampaigns();
      
      if (Array.isArray(campaigns)) {
        const now = Math.floor(Date.now() / 1000);
        const active = campaigns.filter(c => 
          c.active && 
          Number(c.startTime) <= now && 
          Number(c.endTime) >= now
        );
        
        setActiveCampaigns(active.length);
        
        let projectCount = 0;
        let voteCount = 0;
        let fundCount = 0;
        
        const featured: FeaturedCampaign[] = [];
        
        const sortedCampaigns = [...campaigns].sort((a, b) => 
          Number(b.totalFunds) - Number(a.totalFunds)
        );
        
        const topCampaigns = sortedCampaigns.slice(0, 3);
        
        for (const campaign of campaigns) {
          try {
            const projects = await loadProjects(campaign.id);
            projectCount += projects.length;
            
            for (const project of projects) {
              voteCount += Number(formatTokenAmount(project.voteCount));
            }
            
            fundCount += Number(formatTokenAmount(campaign.totalFunds));
          } catch (error) {
            console.error(`Error loading projects for campaign ${campaign.id}:`, error);
          }
          
          if (topCampaigns.includes(campaign)) {
            const isActive = isCampaignActive(campaign);
            const timeRemaining = getCampaignTimeRemaining(campaign);
            const now = Math.floor(Date.now() / 1000);
            const hasStarted = now >= Number(campaign.startTime);
            
            featured.push({
              id: campaign.id.toString(),
              name: campaign.name,
              description: campaign.description,
              logo: campaign.logo || '',
              demoVideo: campaign.demoVideo || '',
              totalFunds: formatTokenAmount(campaign.totalFunds),
              isActive: isActive,
              endsIn: hasStarted ? `${timeRemaining.days}d ${timeRemaining.hours}h` : undefined,
              startsIn: !hasStarted ? 'Coming Soon' : undefined,
              startTime: Number(campaign.startTime),
              endTime: Number(campaign.endTime)
            });
          }
        }
        
        setTotalProjects(projectCount);
        setTotalVotes(voteCount.toLocaleString());
        setTotalFunds(fundCount.toLocaleString());
        setFeaturedCampaigns(featured);
      }
    } catch (error) {
      console.error('Error fetching campaign data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Navigation functions
  const navigateToCampaigns = () => router.push('/campaigns');
  const navigateToCreateCampaign = () => router.push('/campaign/create');
  const navigateToCampaignDetails = (campaignId: string) => router.push(`/campaign/${campaignId}/dashboard`);
  const navigateToAdmin = () => router.push('/admin');

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-blue-50 to-cyan-50 transition-all duration-300">
      {/* Floating particles background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-gradient-to-r from-blue-400/10 to-indigo-400/10 animate-float-slower blur-2xl"></div>
        <div className="absolute top-1/2 right-1/5 w-48 h-48 rounded-full bg-gradient-to-r from-cyan-400/10 to-blue-400/10 animate-float-slow blur-2xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-40 h-40 rounded-full bg-gradient-to-r from-indigo-400/10 to-purple-400/10 animate-float blur-2xl"></div>
        <div className="absolute top-1/3 right-1/4 w-36 h-36 rounded-full bg-gradient-to-r from-purple-400/10 to-pink-400/10 animate-float-delay-3 blur-2xl"></div>
      </div>
      
      {/* Hero Section with Geometric Elements */}
      <div className="relative overflow-hidden">
        <div className="container mx-auto px-6 py-20 md:py-28 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-1/2 mb-10 md:mb-0 text-center md:text-left">
              <div className="inline-flex items-center px-3 py-1 mb-6 rounded-full bg-blue-100/80 text-blue-700 text-sm font-medium transform hover:scale-105 transition-transform duration-300 animate-pulse-slow backdrop-blur-sm shadow-sm border border-blue-200/50">
                <Sparkles className="h-3.5 w-3.5 mr-1.5 animate-pulse" />
                Multi-Token Governance
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 tracking-tight mb-4 tilt-neon relative">
                Sovereign <span className="text-blue-600 relative">
                  Seas
                  <span className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 transform origin-left"></span>
                </span>
                <span className="absolute -right-4 -top-4 text-4xl animate-pulse-slow text-blue-400">✦</span>
              </h1>
              
              <div className="relative mb-6">
                <p className="text-lg md:text-xl text-gray-600 max-w-lg">
                  A vibrant ecosystem where community voting with 
                  <span className={`font-semibold relative ml-2 ${tokenColors[currentToken]}`}>
                    ${tokens[currentToken]}
                    <span className="absolute right-0 top-0 h-full w-1 bg-current animate-blink"></span>
                  </span>
                  <br />
                  powers the future of blockchain innovation.
                </p>
                
                <div className="mt-4 flex flex-wrap gap-2 items-center">
                  <div className="flex -space-x-1 mr-2">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center ring-2 ring-white text-green-500 text-xs font-bold">C</div>
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center ring-2 ring-white text-blue-500 text-xs font-bold">$</div>
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center ring-2 ring-white text-purple-500 text-xs font-bold">G</div>
                    <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center ring-2 ring-white text-yellow-500 text-xs font-bold">Ⓖ</div>
                  </div>
                  <span className="text-sm text-gray-500">Vote with multiple tokens</span>
                </div>
              </div>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-8">
                <button 
                  onClick={navigateToCampaigns}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center group border border-blue-400/30 animate-float-slow relative overflow-hidden"
                >
                  <Globe className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                  Explore Campaigns
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                </button>
                <button 
                  onClick={navigateToCreateCampaign}
                  className="px-6 py-3 rounded-full bg-white text-blue-600 font-medium border border-blue-200 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center group animate-float-slower relative overflow-hidden"
                >
                  <Rocket className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform duration-300" />
                  Launch Campaign
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-blue-100/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                </button>
              </div>
              
              {isConnected ? (
                <div className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md border border-blue-100 transform hover:scale-105 transition-transform duration-300 animate-pulse-slow">
                  <div className="h-2 w-2 rounded-full bg-blue-400 mr-2 animate-pulse"></div>
                  <span className="text-gray-700 text-sm font-medium">
                    {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                  </span>
                  {isSuperAdmin && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      Admin
                    </span>
                  )}
                </div>
              ) : (
                <div className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md border border-blue-100 transform hover:scale-105 transition-transform duration-300">
                  <Wallet className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="text-gray-500 text-sm">Connect Wallet</span>
                </div>
              )}
            </div>
            
            <div className="md:w-1/2 flex justify-center md:justify-end">
              <div className="relative transform hover:scale-102 transition-transform duration-300 animate-float">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-2xl transform rotate-6 scale-95 opacity-30 blur-sm"></div>
                <div className="relative bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-blue-100">
                  <div className="flex items-center mb-4">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center mr-3 text-white">
                      <Anchor className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">Governance Simplified</h3>
                      <p className="text-sm text-gray-500">Multi-token decision making</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-6 relative">
                    <div className="flex items-center text-sm bg-gradient-to-r from-blue-50 to-indigo-50 p-2 rounded-lg border border-blue-100/50 transform hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                      <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                        <CheckCircle className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <span className="text-gray-700">Multi-token governance voting</span>
                    </div>
                    <div className="flex items-center text-sm bg-gradient-to-r from-blue-50 to-indigo-50 p-2 rounded-lg border border-blue-100/50 transform hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                      <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                        <CheckCircle className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <span className="text-gray-700">Automated fund distribution</span>
                    </div>
                    <div className="flex items-center text-sm bg-gradient-to-r from-blue-50 to-indigo-50 p-2 rounded-lg border border-blue-100/50 transform hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                      <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                        <CheckCircle className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <span className="text-gray-700">Transparent on-chain governance</span>
                    </div>
                    
                    {/* Decorative elements */}
                    <div className="absolute -right-3 -bottom-3 w-20 h-20 rounded-full bg-gradient-to-r from-blue-400/10 to-indigo-400/10 blur-xl"></div>
                  </div>
                  
                  <button 
                    onClick={navigateToCreateCampaign}
                    className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium hover:shadow-lg transition-all flex items-center justify-center group relative overflow-hidden"
                  >
                    Get Started 
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform duration-300" />
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Token Distribution Visualization */}
      <div className="container mx-auto px-6 -mt-4 mb-16">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-lg border border-blue-100 overflow-hidden relative">
          <div className="absolute -inset-px -z-10 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 animate-gradient-x opacity-80"></div>
          
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-4 md:mb-0 md:mr-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                <BarChart2 className="h-5 w-5 mr-2 text-blue-500" />
                Multi-Token Ecosystem
              </h3>
              <p className="text-sm text-gray-600 mb-2">Vote with any supported token in our ecosystem</p>
              
              <div className="flex space-x-2 flex-wrap">
                <div className="flex items-center px-3 py-1 bg-gradient-to-r from-green-100 to-green-200 rounded-full text-green-800 text-sm font-medium border border-green-300/50 shadow-sm transform hover:scale-105 transition-transform duration-300">
                  <div className="w-4 h-4 rounded-full bg-green-500 mr-1.5 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">$</span>
                  </div>
                  CELO
                </div>
                <div className="flex items-center px-3 py-1 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full text-blue-800 text-sm font-medium border border-blue-300/50 shadow-sm transform hover:scale-105 transition-transform duration-300">
                  <div className="w-4 h-4 rounded-full bg-blue-500 mr-1.5 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">$</span>
                  </div>
                  cUSD
                </div>
                <div className="flex items-center px-3 py-1 bg-gradient-to-r from-purple-100 to-purple-200 rounded-full text-purple-800 text-sm font-medium border border-purple-300/50 shadow-sm transform hover:scale-105 transition-transform duration-300">
                  <div className="w-4 h-4 rounded-full bg-purple-500 mr-1.5 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">$</span>
                  </div>
                  GS
                </div>
                <div className="flex items-center px-3 py-1 bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-full text-yellow-800 text-sm font-medium border border-yellow-300/50 shadow-sm transform hover:scale-105 transition-transform duration-300">
                  <div className="w-4 h-4 rounded-full bg-yellow-500 mr-1.5 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">$</span>
                  </div>
                  GLOdollar
                </div>
              </div>
            </div>
            
            <div className="w-full md:w-1/2">
              <div className="flex items-center h-6 rounded-full overflow-hidden bg-gray-100/80 shadow-inner">
                <div className="h-full bg-green-500 flex items-center justify-center relative group overflow-hidden" style={{ width: '45%' }}>
                  <span className="text-xs text-white font-medium px-2 group-hover:scale-110 transition-transform duration-300">CELO</span>
                  <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </div>
                <div className="h-full bg-blue-500 flex items-center justify-center relative group overflow-hidden" style={{ width: '25%' }}>
                  <span className="text-xs text-white font-medium px-2 group-hover:scale-110 transition-transform duration-300">cUSD</span>
                  <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </div>
                <div className="h-full bg-purple-500 flex items-center justify-center relative group overflow-hidden" style={{ width: '20%' }}>
                  <span className="text-xs text-white font-medium px-2 group-hover:scale-110 transition-transform duration-300">GS</span>
                  <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </div>
                <div className="h-full bg-yellow-500 flex items-center justify-center relative group overflow-hidden" style={{ width: '10%' }}>
                  <span className="text-xs text-white font-medium px-1 group-hover:scale-110 transition-transform duration-300">GLO</span>
                  <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </div>
              </div>
              
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <div className="flex items-center">
                  <Star className="h-3 w-3 mr-1 text-green-500" />
                  <span>CELO: 45%</span>
                </div>
                <div className="flex items-center">
                  <Star className="h-3 w-3 mr-1 text-blue-500" />
                  <span>cUSD: 25%</span>
                </div>
                <div className="flex items-center">
                  <Star className="h-3 w-3 mr-1 text-purple-500" />
                  <span>GS: 20%</span>
                </div>
                <div className="flex items-center">
                  <Star className="h-3 w-3 mr-1 text-yellow-500" />
                  <span>GLO: 10%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats Section (Floating Cards) */}
      <div className="container mx-auto px-6 mb-16 relative z-20">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden border border-blue-100 group hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 animate-float-delay-1 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 via-transparent to-indigo-400/5"></div>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-500"></div>
              <div className="p-5 relative">
                <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity duration-500">
                  <Activity className="h-6 w-6 text-blue-500" />
                </div>
                <p className="text-indigo-500 font-medium">Active Campaigns</p>
                <p className="text-3xl font-bold text-gray-800 mt-1 mb-2">{activeCampaigns}</p>
                <div className="w-full h-1 rounded-full bg-blue-100 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width: `${Math.min(100, activeCampaigns * 10)}%` }}></div>
                </div>
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden border border-blue-100 group hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 animate-float-delay-2 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 via-transparent to-indigo-400/5"></div>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-500"></div>
              <div className="p-5 relative">
                <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity duration-500">
                  <Lightbulb className="h-6 w-6 text-blue-500" />
                </div>
                <p className="text-indigo-500 font-medium">Total Projects</p>
                <p className="text-3xl font-bold text-gray-800 mt-1 mb-2">{totalProjects}</p>
                <div className="w-full h-1 rounded-full bg-blue-100 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width: `${Math.min(100, totalProjects * 2)}%` }}></div>
                </div>
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden border border-blue-100 group hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 animate-float-delay-3 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 via-transparent to-indigo-400/5"></div>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-500"></div>
              <div className="p-5 relative">
                <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity duration-500">
                  <Award className="h-6 w-6 text-blue-500" />
                </div>
                <p className="text-indigo-500 font-medium">Total Votes</p>
                <p className="text-3xl font-bold text-gray-800 mt-1 mb-2">{totalVotes}</p>
                <div className="w-full h-1 rounded-full bg-blue-100 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width: "80%" }}></div>
                </div>
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden border border-blue-100 group hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 animate-float-delay-4 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 via-transparent to-indigo-400/5"></div>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-500"></div>
              <div className="p-5 relative">
                <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity duration-500">
                  <DollarSign className="h-6 w-6 text-blue-500" />
                </div>
                <p className="text-indigo-500 font-medium">Total Value</p>
                <p className="text-3xl font-bold text-gray-800 mt-1 mb-2">{totalFunds} <span className="text-sm font-normal text-gray-500">CELO</span></p>
                <div className="w-full h-1 rounded-full bg-blue-100 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width: "70%" }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Featured Campaigns Section */}
      <div className="container mx-auto px-6 pb-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Rocket className="h-5 w-5 text-blue-500 mr-2" />
            Featured Campaigns
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">New</span>
          </h2>
          {featuredCampaigns.length > 0 && (
            <button 
              onClick={navigateToCampaigns}
              className="px-4 py-2 rounded-full text-blue-600 text-sm font-medium hover:bg-blue-50 transition-colors flex items-center group border border-blue-200 shadow-sm hover:shadow-md"
            >
              View All <ArrowRight className="ml-1 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          )}
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Anchor className="h-5 w-5 text-blue-500 animate-pulse" />
              </div>
            </div>
          </div>
        ) : featuredCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredCampaigns.map((campaign, index) => {
              // Calculate time status properly
              const now = Math.floor(Date.now() / 1000);
              const hasStarted = now >= Number(campaign.startTime);
              const hasEnded = now >= Number(campaign.endTime);
              
              // Format CELO amount as whole number
              const celoAmount = Number(campaign.totalFunds).toFixed(0);
              
              // Determine status class and text
              let statusClass = 'bg-gray-200 text-gray-700';
              let statusText = 'Ended';
              let StatusIcon = CheckCircle;
              
              if (!hasStarted) {
                statusClass = 'bg-cyan-400 text-blue-900';
                statusText = 'Coming Soon';
                StatusIcon = Clock;
              } else if (!hasEnded) {
                statusClass = 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white';
                statusText = 'Active';
                StatusIcon = Activity;
              }
              
              return (
                <div 
                  key={campaign.id}
                  onClick={() => navigateToCampaignDetails(campaign.id)}
                  className={`group relative bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-blue-100 hover:shadow-xl hover:-translate-y-3 transition-all duration-500 cursor-pointer`}
                >
                  {/* Enhanced shadow and glow effects */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
                  
                  <div className="h-48 bg-gradient-to-r from-blue-100 to-indigo-100 relative overflow-hidden">
                    {campaign.logo ? (
                      <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${campaign.logo})`, opacity: 0.9 }}></div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center opacity-30">
                        <Anchor className="h-16 w-16 text-blue-500" />
                      </div>
                    )}
                    
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    
                    {campaign.demoVideo && (
                      <div className="absolute top-3 left-3 p-2 bg-white/80 rounded-full text-blue-600 hover:bg-white transition-colors shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 z-10">
                        <Video className="h-4 w-4" />
                      </div>
                    )}
                    
                    {/* Status badge with improved styling */}
                    <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-medium flex items-center shadow-md z-10 ${statusClass}`}>
                      <StatusIcon className="h-3 w-3 mr-1.5" />
                      {statusText}
                    </div>
                    
                    {/* Campaign name overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                      <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-200 transition-colors">{campaign.name}</h3>
                      <div className="flex items-center text-white/80 text-sm">
                        <BarChart className="h-3.5 w-3.5 mr-1.5" />
                        {celoAmount} CELO
                      </div>
                    </div>
                    
                    {/* Time remaining indicator with better formatting */}
                    {!hasStarted && (
                      <div className="absolute bottom-16 left-4 px-3 py-1.5 bg-blue-500/70 text-white text-xs rounded-full backdrop-blur-sm shadow-md flex items-center">
                        <Clock className="h-3 w-3 mr-1.5 animate-pulse" /> 
                        {(() => {
                          const startDiff = Number(campaign.startTime) - now;
                          if (startDiff <= 0) return "Launching soon";
                          
                          const days = Math.floor(startDiff / 86400);
                          const hours = Math.floor((startDiff % 86400) / 3600);
                          const minutes = Math.floor((startDiff % 3600) / 60);
                          
                          return `Launches in ${days}d ${hours}h ${minutes}m`;
                        })()}
                      </div>
                    )}

                    {hasStarted && !hasEnded && campaign.endTime && (
                      <div className="absolute bottom-16 left-4 px-3 py-1.5 bg-indigo-500/70 text-white text-xs rounded-full backdrop-blur-sm shadow-md flex items-center">
                        <Clock className="h-3 w-3 mr-1.5 animate-pulse" /> 
                        {(() => {
                          const endDiff = Number(campaign.endTime) - now;
                          if (endDiff <= 0) return "Ending soon";
                          
                          const days = Math.floor(endDiff / 86400);
                          const hours = Math.floor((endDiff % 86400) / 3600);
                          const minutes = Math.floor((endDiff % 3600) / 60);
                          
                          return `${days}d ${hours}h ${minutes}m remaining`;
                        })()}
                      </div>
                    )}
                    
                    {hasEnded && (
                      <div className="absolute bottom-16 left-4 px-3 py-1.5 bg-gray-500/70 text-white text-xs rounded-full backdrop-blur-sm shadow-md flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1.5" /> Campaign has ended
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 relative">
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{campaign.description}</p>
                    
                    <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md transform group-hover:rotate-45 transition-transform duration-500">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                    
                    {/* Voting tokens for this campaign */}
                    <div className="flex -space-x-1.5">
                      <div className="w-6 h-6 rounded-full bg-green-100 ring-2 ring-white flex items-center justify-center text-green-500 text-xs font-bold">C</div>
                      {(index === 0 || index === 2) && (
                        <div className="w-6 h-6 rounded-full bg-blue-100 ring-2 ring-white flex items-center justify-center text-blue-500 text-xs font-bold">$</div>
                      )}
                      {index === 1 && (
                        <div className="w-6 h-6 rounded-full bg-purple-100 ring-2 ring-white flex items-center justify-center text-purple-500 text-xs font-bold">G</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 text-center border border-blue-100 shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 via-transparent to-indigo-100/50"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 mb-4 text-white">
                <Rocket className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Campaigns Yet</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">Be the first to create a campaign and start your blockchain journey!</p>
              <button 
                onClick={navigateToCreateCampaign}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-xl transition-all inline-flex items-center group relative overflow-hidden"
              >
                <Lightbulb className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                Start a Campaign
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* How It Works - Now with animations and multi-token support */}
      <div className="bg-gradient-to-b from-indigo-50 via-blue-50 to-cyan-50 py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full mb-3">Simple Process</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">How Sovereign Seas Works</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">A seamless multi-token governance platform for blockchain innovation</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line (visible on md screens and up) */}
            <div className="hidden md:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-indigo-300 to-blue-200"></div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-blue-100 relative overflow-hidden group hover:shadow-2xl transition-all hover:-translate-y-2 duration-500">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
              <div className="absolute top-0 right-0 h-24 w-24 bg-blue-100/50 rounded-bl-full opacity-50 group-hover:bg-blue-200/50 transition-colors"></div>
              
              <div className="relative z-10">
                <div className="relative mb-6">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-lg group-hover:scale-110 transition-transform duration-500">1</div>
                  <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4">
                    <Zap className="h-6 w-6 text-blue-500 animate-pulse" />
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center">
                  Create
                  <ArrowRight className="h-4 w-4 ml-2 text-blue-500 opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all duration-500" />
                </h3>
                <p className="text-gray-600 mb-4">Start your own campaign with custom parameters and multiple token support.</p>
                
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center px-2 py-1 bg-blue-50 rounded-full text-blue-700 text-xs">
                    <Rocket className="h-3 w-3 mr-1" />
                    <span>Launch</span>
                  </div>
                  <div className="flex items-center px-2 py-1 bg-blue-50 rounded-full text-blue-700 text-xs">
                    <CreditCard className="h-3 w-3 mr-1" />
                    <span>Multi-Token</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-blue-100 relative overflow-hidden group hover:shadow-2xl transition-all hover:-translate-y-2 duration-500">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
              <div className="absolute top-0 right-0 h-24 w-24 bg-blue-100/50 rounded-bl-full opacity-50 group-hover:bg-blue-200/50 transition-colors"></div>
              
              <div className="relative z-10">
                <div className="relative mb-6">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-lg group-hover:scale-110 transition-transform duration-500">2</div>
                  <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4">
                    <Award className="h-6 w-6 text-blue-500 animate-pulse" />
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center">
                  Vote
                  <ArrowRight className="h-4 w-4 ml-2 text-blue-500 opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all duration-500" />
                </h3>
                <p className="text-gray-600 mb-4">Support initiatives you believe in using CELO, cUSD, GS, or GLOdollar tokens.</p>
                
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center px-2 py-1 bg-green-50 rounded-full text-green-700 text-xs">
                    <DollarSign className="h-3 w-3 mr-1" />
                    <span>CELO</span>
                  </div>
                  <div className="flex items-center px-2 py-1 bg-blue-50 rounded-full text-blue-700 text-xs">
                    <DollarSign className="h-3 w-3 mr-1" />
                    <span>cUSD</span>
                  </div>
                  <div className="flex items-center px-2 py-1 bg-purple-50 rounded-full text-purple-700 text-xs">
                    <DollarSign className="h-3 w-3 mr-1" />
                    <span>GS</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-blue-100 relative overflow-hidden group hover:shadow-2xl transition-all hover:-translate-y-2 duration-500">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
              <div className="absolute top-0 right-0 h-24 w-24 bg-blue-100/50 rounded-bl-full opacity-50 group-hover:bg-blue-200/50 transition-colors"></div>
              
              <div className="relative z-10">
                <div className="relative mb-6">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-lg group-hover:scale-110 transition-transform duration-500">3</div>
                  <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4">
                    <BarChart className="h-6 w-6 text-blue-500 animate-pulse" />
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center">
                  Receive
                  <CheckCircle className="h-4 w-4 ml-2 text-blue-500 opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all duration-500" />
                </h3>
                <p className="text-gray-600 mb-4">Automatic distribution of funds through secure smart contracts.</p>
                
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center px-2 py-1 bg-blue-50 rounded-full text-blue-700 text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    <span>Secure</span>
                  </div>
                  <div className="flex items-center px-2 py-1 bg-blue-50 rounded-full text-blue-700 text-xs">
                    <Activity className="h-3 w-3 mr-1" />
                    <span>Automated</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
