'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { ArrowRight, Anchor, Activity, Award, Droplets, Globe, Waves, Clock } from 'lucide-react';
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
        <div className="container mx-auto px-6 py-24 relative z-10">
          <div className="flex flex-col items-center justify-center text-center space-y-8">
            <div className="flex items-center mb-2">
              <div className="relative h-12 w-12 mr-3">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-lime-500 to-yellow-500 animate-pulse-slow opacity-40"></div>
                <div className="absolute inset-0.5 rounded-full bg-slate-900 flex items-center justify-center">
                  <Image 
                    src="/logo.svg" 
                    alt="Sovereign Seas Logo"
                    width={24}
                    height={24}
                    className="h-6 w-6"
                  />
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                Sovereign <span className="text-yellow-400">Seas</span>
              </h1>
            </div>
            
            <h2 className="text-xl md:text-2xl text-lime-100 max-w-2xl">
              The ocean decides, and the vote rules the tides. A decentralized voting system for impactful ocean conservation projects.
            </h2>
            
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <button 
                onClick={navigateToCampaigns}
                className="px-6 py-3 rounded-full bg-lime-500 text-slate-900 font-semibold hover:bg-lime-400 transition-all flex items-center"
              >
                Explore Campaigns <ArrowRight className="ml-2 h-5 w-5" />
              </button>
              <button 
                onClick={navigateToCreateCampaign}
                className="px-6 py-3 rounded-full bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition-all flex items-center"
              >
                Start a Campaign <Waves className="ml-2 h-5 w-5" />
              </button>
            </div>
            
            {isConnected ? (
              <div className="px-4 py-2 bg-slate-800/60 backdrop-blur-sm rounded-full border border-slate-700 text-lime-300 mt-6">
                Connected: {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
              </div>
            ) : (
              <div className="px-4 py-2 bg-slate-800/60 backdrop-blur-sm rounded-full border border-slate-700 text-yellow-300 mt-6">
                Connect Wallet to Get Started
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Stats Section */}
      <div className="container mx-auto px-6 py-12">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-6 border border-lime-500/20 transform hover:-translate-y-1 transition-all">
              <div className="flex items-center mb-2">
                <Activity className="h-6 w-6 text-lime-500 mr-2" />
                <h3 className="text-white font-semibold">Active Campaigns</h3>
              </div>
              <p className="text-3xl font-bold text-yellow-400">{activeCampaigns}</p>
            </div>
            
            <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-6 border border-lime-500/20 transform hover:-translate-y-1 transition-all">
              <div className="flex items-center mb-2">
                <Globe className="h-6 w-6 text-lime-500 mr-2" />
                <h3 className="text-white font-semibold">Total Projects</h3>
              </div>
              <p className="text-3xl font-bold text-yellow-400">{totalProjects}</p>
            </div>
            
            <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-6 border border-lime-500/20 transform hover:-translate-y-1 transition-all">
              <div className="flex items-center mb-2">
                <Award className="h-6 w-6 text-lime-500 mr-2" />
                <h3 className="text-white font-semibold">Total Votes</h3>
              </div>
              <p className="text-3xl font-bold text-yellow-400">{totalVotes}</p>
            </div>
            
            <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-6 border border-lime-500/20 transform hover:-translate-y-1 transition-all">
              <div className="flex items-center mb-2">
                <Droplets className="h-6 w-6 text-lime-500 mr-2" />
                <h3 className="text-white font-semibold">Total CELO</h3>
              </div>
              <p className="text-3xl font-bold text-yellow-400">{totalFunds}</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Featured Campaigns */}
      <div className="container mx-auto px-6 py-12">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 flex items-center">
          <Waves className="h-7 w-7 text-lime-500 mr-3" />
          Featured Campaigns
        </h2>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-500"></div>
          </div>
        ) : featuredCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredCampaigns.map((campaign, idx) => (
              <div 
                key={campaign.id}
                className="bg-slate-800/40 backdrop-blur-md rounded-xl overflow-hidden border border-lime-600/20 hover:border-lime-500/50 transition-all cursor-pointer"
                onClick={() => navigateToCampaignDetails(campaign.id)}
              >
                <div className="h-40 bg-gradient-to-r from-lime-600/40 to-yellow-600/40 relative">
                  <div className={`absolute bottom-4 left-4 px-3 py-1 ${
                    campaign.isActive 
                      ? 'bg-yellow-400 text-slate-900' 
                      : campaign.startsIn 
                        ? 'bg-slate-300 text-slate-900' 
                        : 'bg-slate-700 text-slate-300'
                  } text-sm font-semibold rounded-full`}>
                    {campaign.isActive 
                      ? 'Active' 
                      : campaign.startsIn 
                        ? 'Coming Soon' 
                        : 'Ended'}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2">{campaign.name}</h3>
                  <p className="text-slate-300 mb-4">{campaign.description}</p>
                  <div className="flex justify-between items-center">
                    {campaign.isActive ? (
                      <div className="text-lime-400 font-medium flex items-center">
                        <Droplets className="h-4 w-4 mr-1" />
                        {campaign.totalFunds} CELO
                      </div>
                    ) : campaign.startsIn ? (
                      <div className="text-slate-400 font-medium flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        Starts soon
                      </div>
                    ) : (
                      <div className="text-slate-400 font-medium flex items-center">
                        <Award className="h-4 w-4 mr-1" />
                        {campaign.totalFunds} CELO
                      </div>
                    )}
                    <button 
                      className="px-4 py-2 rounded-full bg-lime-500/20 text-lime-300 hover:bg-lime-500/30 transition-all text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToCampaignDetails(campaign.id);
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-800/30 backdrop-blur-md rounded-xl p-8 text-center">
            <p className="text-slate-300 mb-4">No campaigns found. Be the first to create a campaign!</p>
            <button 
              onClick={navigateToCreateCampaign}
              className="px-6 py-3 rounded-full bg-lime-500 text-slate-900 font-semibold hover:bg-lime-400 transition-all inline-flex items-center"
            >
              Start a Campaign <Waves className="ml-2 h-5 w-5" />
            </button>
          </div>
        )}
        
        {featuredCampaigns.length > 0 && (
          <div className="flex justify-center mt-10">
            <button 
              onClick={navigateToCampaigns}
              className="px-6 py-3 rounded-full bg-slate-700/50 text-white font-semibold hover:bg-slate-700 transition-all flex items-center"
            >
              View All Campaigns <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </div>
        )}
      </div>
      
      {/* How It Works */}
      <div className="container mx-auto px-6 py-12">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 flex items-center">
          <Image 
            src="/logo.svg" 
            alt="Sovereign Seas Logo"
            width={28}
            height={28}
            className="h-7 w-7 mr-3 text-lime-500"
          />
          How It Works
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="bg-slate-800/30 backdrop-blur-md rounded-xl p-6 border-t-4 border-yellow-400">
            <div className="w-12 h-12 bg-yellow-400 text-slate-900 rounded-full flex items-center justify-center font-bold text-xl mb-4">1</div>
            <h3 className="text-xl font-bold text-white mb-2">Create or Join a Campaign</h3>
            <p className="text-slate-300">Start your own ocean conservation campaign or join existing ones. Set voting rules and funding parameters.</p>
          </div>
          
          <div className="bg-slate-800/30 backdrop-blur-md rounded-xl p-6 border-t-4 border-lime-500">
            <div className="w-12 h-12 bg-lime-500 text-slate-900 rounded-full flex items-center justify-center font-bold text-xl mb-4">2</div>
            <h3 className="text-xl font-bold text-white mb-2">Submit or Vote on Projects</h3>
            <p className="text-slate-300">Submit your conservation project or vote for others using CELO tokens, with each token worth 1-5 votes.</p>
          </div>
          
          <div className="bg-slate-800/30 backdrop-blur-md rounded-xl p-6 border-t-4 border-yellow-400">
            <div className="w-12 h-12 bg-yellow-400 text-slate-900 rounded-full flex items-center justify-center font-bold text-xl mb-4">3</div>
            <h3 className="text-xl font-bold text-white mb-2">Receive Funding</h3>
            <p className="text-slate-300">Winning projects receive funding based on votes. Funds are distributed automatically through smart contracts.</p>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="py-16">
        <div className="container mx-auto px-6">
          <div className="bg-gradient-to-r from-lime-900/40 to-yellow-900/40 backdrop-blur-md rounded-2xl p-8 border border-lime-500/30">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Ready to make an impact?</h2>
                <p className="text-lime-100">Join Sovereign Seas today and help protect our oceans through decentralized voting.</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={navigateToCreateCampaign}
                  className="px-6 py-3 rounded-full bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition-all"
                >
                  Get Started
                </button>
                <button 
                  onClick={navigateToCampaigns}
                  className="px-6 py-3 rounded-full bg-transparent border border-lime-400 text-lime-400 font-semibold hover:bg-lime-500/10 transition-all"
                >
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}