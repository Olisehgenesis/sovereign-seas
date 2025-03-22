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
  BarChart,
  Sparkles,
  Lightbulb,
  Rocket,
  Shield,
  Clock,
  Video,
  CheckCircle,
  ArrowUp,
  Wallet
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
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-teal-50">
      {/* Hero Section with Geometric Elements */}
      <div className="relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-teal-100 opacity-60 blur-xl"></div>
        <div className="absolute top-40 -left-10 w-40 h-40 rounded-full bg-emerald-100 opacity-50 blur-xl"></div>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-green-100 opacity-40 blur-xl"></div>
        
        <div className="container mx-auto px-6 py-16 md:py-24 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-1/2 mb-10 md:mb-0 text-center md:text-left">
              <div className="inline-flex items-center px-3 py-1 mb-6 rounded-full bg-teal-100 text-teal-700 text-sm font-medium">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Decentralized Governance
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 tracking-tight mb-4 tilt-neon">
                Sovereign <span className="text-emerald-500">Seas</span>
              </h1>
              
              <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-lg">
                A vibrant ecosystem where community voting powers the future of blockchain innovation.
              </p>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-8">
                <button 
                  onClick={navigateToCampaigns}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 text-white font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-center"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Explore Campaigns
                </button>
                <button 
                  onClick={navigateToCreateCampaign}
                  className="px-6 py-3 rounded-full bg-white text-emerald-600 font-medium border border-emerald-200 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center"
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  Launch Campaign
                </button>
              </div>
              
              {isConnected ? (
                <div className="inline-flex items-center px-4 py-2 bg-white rounded-full shadow-sm border border-emerald-100">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></div>
                  <span className="text-gray-700 text-sm font-medium">
                    {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                  </span>
                  {isSuperAdmin && (
                    <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                      Admin
                    </span>
                  )}
                </div>
              ) : (
                <div className="inline-flex items-center px-4 py-2 bg-white rounded-full shadow-sm border border-emerald-100">
                  <Wallet className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="text-gray-500 text-sm">Connect Wallet</span>
                </div>
              )}
            </div>
            
            <div className="md:w-1/2 flex justify-center md:justify-end">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-teal-200 to-emerald-200 rounded-2xl transform rotate-6 scale-95 opacity-30 blur-sm"></div>
                <div className="relative bg-white p-6 rounded-2xl shadow-lg border border-emerald-100">
                  <div className="flex items-center mb-4">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
                      <Image 
                        src="/logo.svg" 
                        alt="Sovereign Seas Logo"
                        width={24}
                        height={24}
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">Governance Simplified</h3>
                      <p className="text-sm text-gray-500">Community-driven decision making</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm">
                      <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                      </div>
                      <span className="text-gray-600">Transparent voting on the blockchain</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                      </div>
                      <span className="text-gray-600">Automated fund distribution</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                      </div>
                      <span className="text-gray-600">Full control over campaign parameters</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={navigateToCreateCampaign}
                    className="w-full py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center"
                  >
                    Get Started <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats Section (Floating Cards) */}
      <div className="container mx-auto px-6 -mt-10 relative z-20">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-md border border-emerald-50 hover:shadow-lg transition-shadow">
              <div className="flex items-start">
                <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <Activity className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Active Campaigns</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{activeCampaigns}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-md border border-emerald-50 hover:shadow-lg transition-shadow">
              <div className="flex items-start">
                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <Lightbulb className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Total Projects</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{totalProjects}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-md border border-emerald-50 hover:shadow-lg transition-shadow">
              <div className="flex items-start">
                <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <Award className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Total Votes</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{totalVotes}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-md border border-emerald-50 hover:shadow-lg transition-shadow">
              <div className="flex items-start">
                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center mr-3 flex-shrink-0">
                  <BarChart className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Total CELO</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{totalFunds}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Featured Campaigns */}
      <div className="container mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Rocket className="h-5 w-5 text-emerald-500 mr-2" />
            Featured Campaigns
          </h2>
          {featuredCampaigns.length > 0 && (
            <button 
              onClick={navigateToCampaigns}
              className="px-4 py-2 rounded-full text-emerald-600 text-sm font-medium hover:bg-emerald-50 transition-colors flex items-center"
            >
              View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </button>
          )}
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : featuredCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredCampaigns.map((campaign) => (
              <div 
                key={campaign.id}
                onClick={() => navigateToCampaignDetails(campaign.id)}
                className="group relative bg-white rounded-xl overflow-hidden shadow-md border border-emerald-50 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer"
              >
                <div className="h-40 bg-gradient-to-r from-teal-100 to-emerald-100 relative overflow-hidden">
                  {campaign.logo ? (
                    <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${campaign.logo})`, opacity: 0.9 }}></div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center opacity-30">
                      <Image 
                        src="/logo.svg" 
                        alt="Sovereign Seas Logo"
                        width={60}
                        height={60}
                      />
                    </div>
                  )}
                  
                  {campaign.demoVideo && (
                    <div className="absolute top-3 left-3 p-1.5 bg-white/80 rounded-full text-emerald-600 hover:bg-white transition-colors">
                      <Video className="h-4 w-4" />
                    </div>
                  )}
                  
                  <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium flex items-center ${
                    campaign.isActive 
                      ? 'bg-emerald-500 text-white' 
                      : campaign.startsIn 
                        ? 'bg-yellow-400 text-yellow-900' 
                        : 'bg-gray-200 text-gray-700'
                  }`}>
                    {campaign.isActive ? (
                      <><Activity className="h-3 w-3 mr-1" /> Active</>
                    ) : campaign.startsIn ? (
                      <><Clock className="h-3 w-3 mr-1" /> Coming Soon</>
                    ) : (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Ended</>
                    )}
                  </div>
                  
                  {campaign.isActive && campaign.endsIn && (
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/50 text-white text-xs rounded-full backdrop-blur-sm">
                      <Clock className="h-3 w-3 inline mr-1" /> {campaign.endsIn} remaining
                    </div>
                  )}
                </div>
                
                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-emerald-600 transition-colors">{campaign.name}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{campaign.description}</p>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-emerald-600 font-medium flex items-center text-sm">
                      <BarChart className="h-3.5 w-3.5 mr-1" />
                      {campaign.totalFunds} CELO
                    </div>
                    <button 
                      className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToCampaignDetails(campaign.id);
                      }}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-8 text-center border border-emerald-100 shadow-md">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-4">
              <Rocket className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Campaigns Yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">Be the first to create a campaign and start your blockchain journey!</p>
            <button 
              onClick={navigateToCreateCampaign}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 text-white font-medium hover:shadow-lg transition-all inline-flex items-center"
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              Start a Campaign
            </button>
          </div>
        )}
      </div>
      
      {/* How It Works */}
      <div className="bg-gradient-to-b from-teal-50 to-emerald-50 py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">How Sovereign Seas Works</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">A simple three-step process to participate in decentralized governance</p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8 items-stretch">
            <div className="md:w-1/3 bg-white rounded-xl p-6 shadow-md border border-emerald-50 relative overflow-hidden group hover:shadow-xl transition-all">
              <div className="absolute top-0 right-0 h-20 w-20 bg-teal-100 rounded-bl-full opacity-30 group-hover:bg-teal-200 transition-colors"></div>
              <div className="relative">
                <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center mb-4 group-hover:bg-teal-200 transition-colors">
                  <span className="text-teal-700 text-xl font-bold">1</span>
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 mb-3">Create or Join</h3>
                <p className="text-gray-600 mb-4">Start your own campaign with custom parameters or join existing ones that align with your interests.</p>
                
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center text-sm text-gray-500">
                    <CheckCircle className="h-4 w-4 text-teal-500 mr-2" />
                    Set funding goals
                  </div>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <CheckCircle className="h-4 w-4 text-teal-500 mr-2" />
                    Define voting rules
                  </div>
                </div>
              </div>
            </div>
            
            <div className="md:w-1/3 bg-white rounded-xl p-6 shadow-md border border-emerald-50 relative overflow-hidden group hover:shadow-xl transition-all">
              <div className="absolute top-0 right-0 h-20 w-20 bg-emerald-100 rounded-bl-full opacity-30 group-hover:bg-emerald-200 transition-colors"></div>
              <div className="relative">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mb-4 group-hover:bg-emerald-200 transition-colors">
                  <span className="text-emerald-700 text-xl font-bold">2</span>
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 mb-3">Submit & Vote</h3>
                <p className="text-gray-600 mb-4">Submit your blockchain project or vote for initiatives you believe in using CELO tokens.</p>
                
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center text-sm text-gray-500">
                    <CheckCircle className="h-4 w-4 text-emerald-500 mr-2" />
                    Transparent voting
                  </div>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <CheckCircle className="h-4 w-4 text-emerald-500 mr-2" />
                    Token-based allocation
                  </div>
                </div>
              </div>
            </div>
            
            <div className="md:w-1/3 bg-white rounded-xl p-6 shadow-md border border-emerald-50 relative overflow-hidden group hover:shadow-xl transition-all">
              <div className="absolute top-0 right-0 h-20 w-20 bg-teal-100 rounded-bl-full opacity-30 group-hover:bg-teal-200 transition-colors"></div>
              <div className="relative">
                <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center mb-4 group-hover:bg-teal-200 transition-colors">
                  <span className="text-teal-700 text-xl font-bold">3</span>
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 mb-3">Receive Funding</h3>
                <p className="text-gray-600 mb-4">Winning projects receive automatic distribution of funds through secure smart contracts.</p>
                
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center text-sm text-gray-500">
                    <CheckCircle className="h-4 w-4 text-teal-500 mr-2" />
                    Automated payouts
                  </div>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <CheckCircle className="h-4 w-4 text-teal-500 mr-2" />
                    Immutable records
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="bg-white rounded-2xl p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-full">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100 rounded-full -mr-20 -mt-20 opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-teal-100 rounded-full -ml-20 -mb-20 opacity-40"></div>
          </div>
          
          <div className="relative flex flex-col md:flex-row items-center">
            <div className="md:w-2/3 md:pr-6 mb-8 md:mb-0">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">Ready to Transform Blockchain Governance?</h2>
              <p className="text-gray-600 mb-0">Join Sovereign Seas today and be part of the decentralized revolution that's shaping the future of project funding.</p>
            </div>
            
            <div className="md:w-1/3 flex flex-wrap gap-3 justify-center md:justify-end">
              <button 
                onClick={navigateToCreateCampaign}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 text-white font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-center"
              >
                <Rocket className="h-4 w-4 mr-2" />
                Launch Campaign
              </button>
              <button 
                onClick={navigateToCampaigns}
                className="px-5 py-3 rounded-xl bg-white text-gray-700 font-medium border border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center"
              >
                <Globe className="h-4 w-4 mr-2" />
                Explore Projects
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer with Animated Elements */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-500 py-12 relative overflow-hidden">
        {/* Decorative waves */}
        <div className="absolute top-0 left-0 right-0 h-6 bg-white" style={{ 
          borderRadius: '0 0 100% 100%',
          transform: 'scaleX(1.5)'
        }}></div>
        
        <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white opacity-10"></div>
        <div className="absolute top-10 right-10 w-16 h-16 rounded-full bg-white opacity-10"></div>
        <div className="absolute bottom-20 right-40 w-12 h-12 rounded-full bg-white opacity-10"></div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-6 md:mb-0">
              <div className="bg-white h-10 w-10 rounded-full flex items-center justify-center mr-3 shadow-md">
                <Image 
                  src="/logo.svg" 
                  alt="Sovereign Seas Logo"
                  width={24}
                  height={24}
                />
              </div>
              <h2 className="text-white text-xl font-bold">Sovereign Seas</h2>
            </div>
            
            <div className="flex gap-6 items-center">
              <button onClick={navigateToCampaigns} className="text-white hover:text-teal-100 transition-colors">
                Campaigns
              </button>
              <button onClick={navigateToCreateCampaign} className="text-white hover:text-teal-100 transition-colors">
                Create
              </button>
              {isSuperAdmin && (
                <button onClick={navigateToAdmin} className="text-white hover:text-teal-100 transition-colors">
                  Admin
                </button>
              )}
              <a href="#" className="flex items-center justify-center h-9 w-9 bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white">
                <ArrowUp className="h-4 w-4" />
              </a>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <p className="text-teal-100 text-sm">© 2025 Sovereign Seas | Powered by CELO</p>
          </div>
        </div>
      </div>
    </div>
  );
}