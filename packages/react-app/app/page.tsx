'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { 
  ArrowRight, 
  Anchor, 
  Activity, 
  Award, 
  Droplets, 
  Globe, 
  Waves, 
  Clock, 
  ChevronRight,
  TrendingUp,
  Users,
  BarChart,
  Zap,
  ShieldCheck,
  CheckCircle
} from 'lucide-react';
import Image from 'next/image';
import { useSovereignSeas } from '../hooks/useSovereignSeas';

// Contract addresses - replace with actual addresses
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` || 
  '0x35128A5Ee461943fA6403672b3574346Ba7E4530' as `0x${string}`;
const CELO_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_CELO_TOKEN_ADDRESS as `0x${string}` || 
  '0x3FC1f6138F4b0F5Da3E1927412Afe5c68ed4527b' as `0x${string}`;

// Featured campaign type
type FeaturedCampaign = {
  id: string;
  name: string;
  description: string;
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
      // Fetch all campaigns
      const campaigns = await loadCampaigns();
      
      if (Array.isArray(campaigns)) {
        // Process campaign data for stats
        const now = Math.floor(Date.now() / 1000);
        const active = campaigns.filter(c => 
          c.active && 
          Number(c.startTime) <= now && 
          Number(c.endTime) >= now
        );
        
        setActiveCampaigns(active.length);
        
        // Load projects for each campaign to count total projects and votes
        let projectCount = 0;
        let voteCount = 0;
        let fundCount = 0;
        
        // Process campaigns for featured section
        const featured: FeaturedCampaign[] = [];
        
        // Sort campaigns by total funds
        const sortedCampaigns = [...campaigns].sort((a, b) => 
          Number(b.totalFunds) - Number(a.totalFunds)
        );
        
        // Take up to 3 campaigns for featured section
        const topCampaigns = sortedCampaigns.slice(0, 3);
        
        for (const campaign of campaigns) {
          try {
            // Each campaign's projects
            const projects = await loadProjects(campaign.id);
            projectCount += projects.length;
            
            // Sum up votes and funds
            for (const project of projects) {
              voteCount += Number(formatTokenAmount(project.voteCount));
            }
            
            fundCount += Number(formatTokenAmount(campaign.totalFunds));
          } catch (error) {
            console.error(`Error loading projects for campaign ${campaign.id}:`, error);
          }
          
          // Process for featured campaigns
          if (topCampaigns.includes(campaign)) {
            const isActive = isCampaignActive(campaign);
            const timeRemaining = getCampaignTimeRemaining(campaign);
            const now = Math.floor(Date.now() / 1000);
            const hasStarted = now >= Number(campaign.startTime);
            
            featured.push({
              id: campaign.id.toString(),
              name: campaign.name,
              description: campaign.description,
              totalFunds: formatTokenAmount(campaign.totalFunds),
              isActive: isActive,
              endsIn: hasStarted ? `${timeRemaining.days}d ${timeRemaining.hours}h` : undefined,
              startsIn: !hasStarted ? formatCampaignTime(campaign.startTime) : undefined
            });
          }
        }
        
        // Update state with calculated values
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

  // Functions to navigate
  const navigateToCampaigns = () => {
    router.push('/campaigns');
  };

  const navigateToCreateCampaign = () => {
    router.push('/campaign/create');
  };

  const navigateToCampaignDetails = (campaignId: string) => {
    router.push(`/campaign/${campaignId}/dashboard`);
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Wave Effect */}
        <div className="absolute inset-0 z-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
            <path fill="#84cc16" fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,149.3C672,149,768,171,864,176C960,181,1056,171,1152,154.7C1248,139,1344,117,1392,106.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
          </svg>
        </div>
        <div className="absolute inset-0 z-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
            <path fill="#eab308" fillOpacity="1" d="M0,256L48,261.3C96,267,192,277,288,266.7C384,256,480,224,576,213.3C672,203,768,213,864,213.3C960,213,1056,203,1152,181.3C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
          </svg>
        </div>
        
        {/* Content */}
        <div className="container mx-auto px-6 py-16 md:py-20 relative z-10">
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            <div className="flex items-center">
              <div className="relative h-14 w-14 mr-3">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-lime-500 to-yellow-500 animate-pulse-slow opacity-40"></div>
                <div className="absolute inset-0.5 rounded-full bg-slate-900 flex items-center justify-center">
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
                Sovereign <span className="text-yellow-400">Seas</span>
              </h1>
            </div>
            
            <div className="max-w-2xl">
              <div className="bg-gradient-to-r from-lime-300/10 to-yellow-300/10 backdrop-blur-sm rounded-xl p-4 border border-lime-500/20 shadow-lg">
                <h2 className="text-xl md:text-2xl text-lime-100">
                  The ocean decides, and the vote rules the tides. A decentralized voting system for impactful ocean conservation projects.
                </h2>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <button 
                onClick={navigateToCampaigns}
                className="px-5 py-2.5 rounded-lg bg-lime-500 text-slate-900 font-semibold hover:bg-lime-400 transition-all flex items-center shadow-md shadow-lime-500/20 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <Globe className="h-4 w-4 mr-2" />
                Explore Campaigns <ChevronRight className="ml-1 h-4 w-4" />
              </button>
              <button 
                onClick={navigateToCreateCampaign}
                className="px-5 py-2.5 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition-all flex items-center shadow-md shadow-yellow-400/20 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <Waves className="h-4 w-4 mr-2" />
                Start a Campaign <ChevronRight className="ml-1 h-4 w-4" />
              </button>
            </div>
            
            {isConnected ? (
              <div className="px-4 py-1.5 bg-slate-800/60 backdrop-blur-sm rounded-lg border border-slate-700/50 text-lime-300 mt-4 text-sm flex items-center">
                <div className="h-2 w-2 rounded-full bg-lime-400 mr-2 animate-pulse"></div>
                Connected: {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
              </div>
            ) : (
              <div className="px-4 py-1.5 bg-slate-800/60 backdrop-blur-sm rounded-lg border border-slate-700/50 text-yellow-300 mt-4 text-sm flex items-center">
                <div className="h-2 w-2 rounded-full bg-yellow-400 mr-2 animate-pulse"></div>
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
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-lime-500"></div>
          </div>
        ) : (
          <div className="bg-slate-800/30 backdrop-blur-md rounded-xl border border-lime-600/20 overflow-hidden shadow-xl">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-700/30">
              <div className="p-5 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center mb-1.5">
                    <Activity className="h-5 w-5 text-lime-500 mr-2" />
                    <h3 className="text-white font-medium text-sm">Active Campaigns</h3>
                  </div>
                  <p className="text-2xl font-bold text-yellow-400">{activeCampaigns}</p>
                </div>
                <div className="absolute bottom-0 right-0 text-lime-500/10">
                  <Activity className="h-20 w-20" />
                </div>
              </div>
              
              <div className="p-5 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center mb-1.5">
                    <Globe className="h-5 w-5 text-lime-500 mr-2" />
                    <h3 className="text-white font-medium text-sm">Total Projects</h3>
                  </div>
                  <p className="text-2xl font-bold text-yellow-400">{totalProjects}</p>
                </div>
                <div className="absolute bottom-0 right-0 text-lime-500/10">
                  <Globe className="h-20 w-20" />
                </div>
              </div>
              
              <div className="p-5 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center mb-1.5">
                    <Award className="h-5 w-5 text-lime-500 mr-2" />
                    <h3 className="text-white font-medium text-sm">Total Votes</h3>
                  </div>
                  <p className="text-2xl font-bold text-yellow-400">{totalVotes}</p>
                </div>
                <div className="absolute bottom-0 right-0 text-lime-500/10">
                  <Award className="h-20 w-20" />
                </div>
              </div>
              
              <div className="p-5 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center mb-1.5">
                    <Droplets className="h-5 w-5 text-lime-500 mr-2" />
                    <h3 className="text-white font-medium text-sm">Total CELO</h3>
                  </div>
                  <p className="text-2xl font-bold text-yellow-400">{totalFunds}</p>
                </div>
                <div className="absolute bottom-0 right-0 text-lime-500/10">
                  <Droplets className="h-20 w-20" />
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
            <Waves className="h-5 w-5 text-lime-500 mr-2" />
            Featured Campaigns
          </h2>
          {featuredCampaigns.length > 0 && (
            <button 
              onClick={navigateToCampaigns}
              className="px-3 py-1.5 rounded-full bg-slate-700/50 text-white text-sm hover:bg-slate-700 transition-all flex items-center"
            >
              View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </button>
          )}
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-lime-500"></div>
          </div>
        ) : featuredCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredCampaigns.map((campaign, idx) => (
              <div 
                key={campaign.id}
                className="bg-slate-800/40 backdrop-blur-md rounded-lg overflow-hidden border border-lime-600/20 hover:border-lime-500/50 transition-all cursor-pointer hover:shadow-lg hover:shadow-lime-500/5 hover:-translate-y-1"
                onClick={() => navigateToCampaignDetails(campaign.id)}
              >
                <div className="h-32 bg-gradient-to-r from-lime-600/40 to-yellow-600/40 relative">
                  <div className={`absolute top-3 right-3 px-2.5 py-1 ${
                    campaign.isActive 
                      ? 'bg-yellow-400 text-slate-900' 
                      : campaign.startsIn 
                        ? 'bg-slate-300 text-slate-900' 
                        : 'bg-slate-700 text-slate-300'
                  } text-xs font-semibold rounded-full flex items-center`}>
                    {campaign.isActive 
                      ? <><Activity className="h-3 w-3 mr-1" /> Active</> 
                      : campaign.startsIn 
                        ? <><Clock className="h-3 w-3 mr-1" /> Coming Soon</>
                        : <><CheckCircle className="h-3 w-3 mr-1" /> Ended</>}
                  </div>
                  {campaign.isActive && campaign.endsIn && (
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-slate-900/70 backdrop-blur-sm text-white text-xs rounded-full">
                      <Clock className="h-3 w-3 inline mr-1" /> {campaign.endsIn} remaining
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-bold text-white mb-1.5 line-clamp-1">{campaign.name}</h3>
                  <p className="text-slate-300 text-sm mb-3 line-clamp-2">{campaign.description}</p>
                  <div className="flex justify-between items-center">
                    {campaign.isActive ? (
                      <div className="text-lime-400 font-medium flex items-center text-sm">
                        <Droplets className="h-3.5 w-3.5 mr-1" />
                        {campaign.totalFunds} CELO
                      </div>
                    ) : campaign.startsIn ? (
                      <div className="text-slate-400 font-medium flex items-center text-sm">
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        Starts soon
                      </div>
                    ) : (
                      <div className="text-slate-400 font-medium flex items-center text-sm">
                        <Award className="h-3.5 w-3.5 mr-1" />
                        {campaign.totalFunds} CELO
                      </div>
                    )}
                    <button 
                      className="px-3 py-1 rounded-md bg-lime-500/20 text-lime-300 hover:bg-lime-500/30 transition-all text-xs flex items-center"
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
          <div className="bg-slate-800/30 backdrop-blur-md rounded-lg p-6 text-center border border-lime-600/20 shadow-lg">
            <p className="text-slate-300 mb-4">No campaigns found. Be the first to create a campaign!</p>
            <button 
              onClick={navigateToCreateCampaign}
              className="px-5 py-2 rounded-lg bg-lime-500 text-slate-900 font-semibold hover:bg-lime-400 transition-all inline-flex items-center"
            >
              <Waves className="h-4 w-4 mr-2" />
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
            className="h-5 w-5 mr-2 text-lime-500"
          />
          How It Works
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/30 backdrop-blur-md rounded-lg p-5 border-l-4 border-yellow-400 hover:bg-slate-800/40 transition-all">
            <div className="w-10 h-10 bg-yellow-400 text-slate-900 rounded-full flex items-center justify-center font-bold text-lg mb-3 shadow-md shadow-yellow-400/20">1</div>
            <h3 className="text-lg font-bold text-white mb-2">Create or Join a Campaign</h3>
            <p className="text-slate-300 text-sm">Start your own ocean conservation campaign or join existing ones. Set voting rules and funding parameters.</p>
          </div>
          
          <div className="bg-slate-800/30 backdrop-blur-md rounded-lg p-5 border-l-4 border-lime-500 hover:bg-slate-800/40 transition-all">
            <div className="w-10 h-10 bg-lime-500 text-slate-900 rounded-full flex items-center justify-center font-bold text-lg mb-3 shadow-md shadow-lime-500/20">2</div>
            <h3 className="text-lg font-bold text-white mb-2">Submit or Vote on Projects</h3>
            <p className="text-slate-300 text-sm">Submit your conservation project or vote for others using CELO tokens, with each token worth 1-5 votes.</p>
          </div>
          
          <div className="bg-slate-800/30 backdrop-blur-md rounded-lg p-5 border-l-4 border-yellow-400 hover:bg-slate-800/40 transition-all">
            <div className="w-10 h-10 bg-yellow-400 text-slate-900 rounded-full flex items-center justify-center font-bold text-lg mb-3 shadow-md shadow-yellow-400/20">3</div>
            <h3 className="text-lg font-bold text-white mb-2">Receive Funding</h3>
            <p className="text-slate-300 text-sm">Winning projects receive funding based on votes. Funds are distributed automatically through smart contracts.</p>
          </div>
        </div>
      </div>
      
      {/* Features Highlights */}
      <div className="container mx-auto px-6 py-10">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center">
          <TrendingUp className="h-5 w-5 text-lime-500 mr-2" />
          Why Choose Sovereign Seas
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-r from-slate-800/40 to-slate-800/20 backdrop-blur-md rounded-lg p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-lime-500/20 flex items-center justify-center flex-shrink-0">
              <Zap className="h-5 w-5 text-lime-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Decentralized Decision Making</h3>
              <p className="text-slate-300 text-sm">Community-driven voting ensures the most supported projects receive funding, without centralized control.</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-slate-800/40 to-slate-800/20 backdrop-blur-md rounded-lg p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Transparent & Secure</h3>
              <p className="text-slate-300 text-sm">All votes and fund distributions are recorded on the blockchain, ensuring complete transparency and security.</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-slate-800/40 to-slate-800/20 backdrop-blur-md rounded-lg p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Community Powered</h3>
              <p className="text-slate-300 text-sm">Join a growing network of ocean conservationists, project owners, and supporters making real-world impact.</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-slate-800/40 to-slate-800/20 backdrop-blur-md rounded-lg p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-lime-500/20 flex items-center justify-center flex-shrink-0">
              <BarChart className="h-5 w-5 text-lime-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Flexible Distribution Models</h3>
              <p className="text-slate-300 text-sm">Choose between linear or quadratic distribution to ensure fair allocation of funds based on campaign needs.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="py-12">
        <div className="container mx-auto px-6">
          <div className="bg-gradient-to-r from-lime-900/40 to-yellow-900/40 backdrop-blur-md rounded-xl p-6 border border-lime-500/30 shadow-lg">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0 text-center md:text-left">
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Ready to make an impact?</h2>
                <p className="text-lime-100 text-sm md:text-base">Join Sovereign Seas today and help protect our oceans through decentralized voting.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={navigateToCreateCampaign}
                  className="px-4 py-2 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition-all shadow-md shadow-yellow-500/20 flex items-center"
                >
                  <Waves className="h-4 w-4 mr-2" />
                  Start Campaign
                </button>
                <button 
                  onClick={navigateToCampaigns}
                  className="px-4 py-2 rounded-lg bg-transparent border border-lime-400 text-lime-400 font-semibold hover:bg-lime-500/10 transition-all flex items-center"
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