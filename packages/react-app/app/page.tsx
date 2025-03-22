'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { 
  ArrowRight, 
  Activity, 
  Award, 
  Globe, 
  ChevronRight,
  TrendingUp,
  Users,
  BarChart,
  Zap,
  ShieldCheck,
  CheckCircle,
  Shield,
  Video
} from 'lucide-react';
import Image from 'next/image';
import { useSovereignSeas } from '../hooks/useSovereignSeas';

// Contract addresses
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`
const CELO_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_CELO_TOKEN_ADDRESS as `0x${string}` 

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
};

export default function Home() {
  const router = useRouter();
  const [userAddress, setUserAddress] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const { address, isConnected } = useAccount();
  
  // Stats state
  const [activeCampaigns, setActiveCampaigns] = useState(0);
  const [totalProjects, setTotalProjects] = useState(0);
  const [totalVotes, setTotalVotes] = useState('0');
  const [totalFunds, setTotalFunds] = useState('0');
  const [featuredCampaigns, setFeaturedCampaigns] = useState<FeaturedCampaign[]>([]);
  const [loading, setLoading] = useState(true);

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
  } = useSovereignSeas({
    contractAddress: CONTRACT_ADDRESS,
    celoTokenAddress: CELO_TOKEN_ADDRESS,
  });

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
              startsIn: !hasStarted ? formatCampaignTime(campaign.startTime) : undefined
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="container mx-auto px-6 py-16 relative z-10">
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            <div className="flex items-center">
              <div className="relative h-14 w-14 mr-3">
                <div className="absolute inset-0 rounded-full bg-purple-500 animate-pulse-slow opacity-40"></div>
                <div className="absolute inset-0.5 rounded-full bg-gray-900 flex items-center justify-center">
                  <Image 
                    src="/logo.svg" 
                    alt="Sovereign Seas Logo"
                    width={32}
                    height={32}
                    className="h-8 w-8"
                  />
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight">
                Sovereign <span className="text-purple-400">Seas</span>
              </h1>
            </div>
            
            <div className="max-w-2xl">
              <div className="bg-gradient-to-r from-purple-300/10 to-blue-300/10 backdrop-blur-sm rounded-xl p-4 border border-purple-500/20 shadow-lg">
                <h2 className="text-xl md:text-2xl text-purple-100">
                  Decentralized governance and voting system for blockchain projects
                </h2>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <button 
                onClick={navigateToCampaigns}
                className="px-5 py-2.5 rounded-lg bg-purple-500 text-white font-semibold hover:bg-purple-400 transition-all flex items-center shadow-md shadow-purple-500/20 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <Globe className="h-4 w-4 mr-2" />
                Explore Campaigns <ChevronRight className="ml-1 h-4 w-4" />
              </button>
              <button 
                onClick={navigateToCreateCampaign}
                className="px-5 py-2.5 rounded-lg bg-blue-400 text-gray-900 font-semibold hover:bg-blue-300 transition-all flex items-center shadow-md shadow-blue-400/20 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <Activity className="h-4 w-4 mr-2" />
                Start a Campaign <ChevronRight className="ml-1 h-4 w-4" />
              </button>
              {isSuperAdmin && (
                <button 
                  onClick={navigateToAdmin}
                  className="px-5 py-2.5 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-500 transition-all flex items-center shadow-md shadow-gray-500/20 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Admin <ChevronRight className="ml-1 h-4 w-4" />
                </button>
              )}
            </div>
            
            {isConnected ? (
              <div className="px-4 py-1.5 bg-gray-800/60 backdrop-blur-sm rounded-lg border border-gray-700/50 text-purple-300 mt-4 text-sm flex items-center">
                <div className="h-2 w-2 rounded-full bg-purple-400 mr-2 animate-pulse"></div>
                Connected: {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                {isSuperAdmin && (
                  <span className="ml-2 px-1.5 py-0.5 bg-purple-500/30 text-purple-300 text-xs rounded">Admin</span>
                )}
              </div>
            ) : (
              <div className="px-4 py-1.5 bg-gray-800/60 backdrop-blur-sm rounded-lg border border-gray-700/50 text-blue-300 mt-4 text-sm flex items-center">
                <div className="h-2 w-2 rounded-full bg-blue-400 mr-2 animate-pulse"></div>
                Connect Wallet to Get Started
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Stats Section */}
      <div className="container mx-auto px-6 py-6">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <div className="bg-gray-800/30 backdrop-blur-md rounded-xl border border-purple-600/20 overflow-hidden shadow-xl">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-700/30">
              <div className="p-5 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center mb-1.5">
                    <Activity className="h-5 w-5 text-purple-500 mr-2" />
                    <h3 className="text-white font-medium text-sm">Active Campaigns</h3>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">{activeCampaigns}</p>
                </div>
              </div>
              
              <div className="p-5 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center mb-1.5">
                    <Globe className="h-5 w-5 text-purple-500 mr-2" />
                    <h3 className="text-white font-medium text-sm">Total Projects</h3>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">{totalProjects}</p>
                </div>
              </div>
              
              <div className="p-5 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center mb-1.5">
                    <Award className="h-5 w-5 text-purple-500 mr-2" />
                    <h3 className="text-white font-medium text-sm">Total Votes</h3>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">{totalVotes}</p>
                </div>
              </div>
              
              <div className="p-5 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center mb-1.5">
                    <BarChart className="h-5 w-5 text-purple-500 mr-2" />
                    <h3 className="text-white font-medium text-sm">Total CELO</h3>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">{totalFunds}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Featured Campaigns */}
      <div className="container mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center">
            <Activity className="h-5 w-5 text-purple-500 mr-2" />
            Featured Campaigns
          </h2>
          {featuredCampaigns.length > 0 && (
            <button 
              onClick={navigateToCampaigns}
              className="px-3 py-1.5 rounded-full bg-gray-700/50 text-white text-sm hover:bg-gray-700 transition-all flex items-center"
            >
              View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </button>
          )}
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : featuredCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredCampaigns.map((campaign) => (
              <div 
                key={campaign.id}
                className="bg-gray-800/40 backdrop-blur-md rounded-lg overflow-hidden border border-purple-600/20 hover:border-purple-500/50 transition-all cursor-pointer hover:shadow-lg hover:shadow-purple-500/5 hover:-translate-y-1"
                onClick={() => navigateToCampaignDetails(campaign.id)}
              >
                <div className="h-32 bg-gradient-to-r from-purple-600/40 to-blue-600/40 relative">
                  {campaign.logo && (
                    <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${campaign.logo})`, opacity: 0.6 }}></div>
                  )}
                  {campaign.demoVideo && (
                    <div className="absolute top-3 left-3 p-1.5 bg-gray-900/70 rounded-full text-purple-400">
                      <Video className="h-4 w-4" />
                    </div>
                  )}
                  <div className={`absolute top-3 right-3 px-2.5 py-1 ${
                    campaign.isActive 
                      ? 'bg-blue-400 text-gray-900' 
                      : campaign.startsIn 
                        ? 'bg-gray-300 text-gray-900' 
                        : 'bg-gray-700 text-gray-300'
                  } text-xs font-semibold rounded-full flex items-center`}>
                    {campaign.isActive 
                      ? <><Activity className="h-3 w-3 mr-1" /> Active</> 
                      : campaign.startsIn 
                        ? <><Award className="h-3 w-3 mr-1" /> Coming Soon</>
                        : <><CheckCircle className="h-3 w-3 mr-1" /> Ended</>}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-bold text-white mb-1.5 line-clamp-1">{campaign.name}</h3>
                  <p className="text-gray-300 text-sm mb-3 line-clamp-2">{campaign.description}</p>
                  <div className="flex justify-between items-center">
                    <div className="text-purple-400 font-medium flex items-center text-sm">
                      <BarChart className="h-3.5 w-3.5 mr-1" />
                      {campaign.totalFunds} CELO
                    </div>
                    <button 
                      className="px-3 py-1 rounded-md bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-all text-xs flex items-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToCampaignDetails(campaign.id);
                      }}
                    >
                      Details <ChevronRight className="ml-0.5 h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-800/30 backdrop-blur-md rounded-lg p-6 text-center border border-purple-600/20 shadow-lg">
            <p className="text-gray-300 mb-4">No campaigns found. Be the first to create a campaign!</p>
            <button 
              onClick={navigateToCreateCampaign}
              className="px-5 py-2 rounded-lg bg-purple-500 text-white font-semibold hover:bg-purple-400 transition-all inline-flex items-center"
            >
              <Activity className="h-4 w-4 mr-2" />
              Start a Campaign
            </button>
          </div>
        )}
      </div>
      
      {/* How It Works */}
      <div className="container mx-auto px-6 py-10">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center">
          <Image 
            src="/logo.svg" 
            alt="Sovereign Seas Logo"
            width={20}
            height={20}
            className="h-5 w-5 mr-2"
          />
          How It Works
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800/30 backdrop-blur-md rounded-lg p-5 border-l-4 border-blue-400 hover:bg-gray-800/40 transition-all">
            <div className="w-10 h-10 bg-blue-400 text-gray-900 rounded-full flex items-center justify-center font-bold text-lg mb-3 shadow-md shadow-blue-400/20">1</div>
            <h3 className="text-lg font-bold text-white mb-2">Create or Join a Campaign</h3>
            <p className="text-gray-300 text-sm">Start your own campaign or join existing ones. Set governance parameters and funding rules.</p>
          </div>
          
          <div className="bg-gray-800/30 backdrop-blur-md rounded-lg p-5 border-l-4 border-purple-500 hover:bg-gray-800/40 transition-all">
            <div className="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-lg mb-3 shadow-md shadow-purple-500/20">2</div>
            <h3 className="text-lg font-bold text-white mb-2">Submit or Vote on Projects</h3>
            <p className="text-gray-300 text-sm">Submit your blockchain project or vote for others using CELO tokens to support innovation.</p>
          </div>
          
          <div className="bg-gray-800/30 backdrop-blur-md rounded-lg p-5 border-l-4 border-blue-400 hover:bg-gray-800/40 transition-all">
            <div className="w-10 h-10 bg-blue-400 text-gray-900 rounded-full flex items-center justify-center font-bold text-lg mb-3 shadow-md shadow-blue-400/20">3</div>
            <h3 className="text-lg font-bold text-white mb-2">Receive Funding</h3>
            <p className="text-gray-300 text-sm">Winning projects receive funding based on votes. Funds are distributed automatically through smart contracts.</p>
          </div>
        </div>
      </div>
      
      {/* Platform Benefits */}
      <div className="container mx-auto px-6 py-10">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center">
          <TrendingUp className="h-5 w-5 text-purple-500 mr-2" />
          Why Choose Sovereign Seas
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-r from-gray-800/40 to-gray-800/20 backdrop-blur-md rounded-lg p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Zap className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Decentralized Governance</h3>
              <p className="text-gray-300 text-sm">Community-driven voting ensures the most supported projects receive funding, without centralized control.</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-gray-800/40 to-gray-800/20 backdrop-blur-md rounded-lg p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Blockchain Transparency</h3>
              <p className="text-gray-300 text-sm">All votes and fund distributions are recorded on the blockchain, ensuring complete transparency and security.</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-gray-800/40 to-gray-800/20 backdrop-blur-md rounded-lg p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Thriving Ecosystem</h3>
              <p className="text-gray-300 text-sm">Join a growing network of blockchain innovators, projects, and supporters making real-world impact.</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-gray-800/40 to-gray-800/20 backdrop-blur-md rounded-lg p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <BarChart className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Flexible Distribution</h3>
              <p className="text-gray-300 text-sm">Choose between linear or quadratic distribution to ensure fair allocation of funds based on campaign needs.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="py-12">
        <div className="container mx-auto px-6">
          <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 backdrop-blur-md rounded-xl p-6 border border-purple-500/30 shadow-lg">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0 text-center md:text-left">
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Ready to launch your project?</h2>
                <p className="text-purple-100 text-sm md:text-base">Join Sovereign Seas today and leverage decentralized voting for your blockchain initiatives.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={navigateToCreateCampaign}
                  className="px-4 py-2 rounded-lg bg-blue-400 text-gray-900 font-semibold hover:bg-blue-300 transition-all shadow-md shadow-blue-500/20 flex items-center"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Start Campaign
                </button>
                <button 
                  onClick={navigateToCampaigns}
                  className="px-4 py-2 rounded-lg bg-transparent border border-purple-400 text-purple-400 font-semibold hover:bg-purple-500/10 transition-all flex items-center"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Explore Projects
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}