'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { ArrowRight, Anchor, Activity, Award, Droplets, Globe, Waves } from 'lucide-react';

export default function Home() {
  const [userAddress, setUserAddress] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const { address, isConnected } = useAccount();
  
  // Active campaigns example data
  const [activeCampaigns, setActiveCampaigns] = useState(4);
  const [totalProjects, setTotalProjects] = useState(36);
  const [totalVotes, setTotalVotes] = useState('1,284');
  const [totalFunds, setTotalFunds] = useState('24,590');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      setUserAddress(address);
    }
  }, [address, isConnected]);

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
              <Anchor className="h-10 w-10 text-lime-500 mr-2" />
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                Sovereign <span className="text-yellow-400">Seas</span>
              </h1>
            </div>
            
            <h2 className="text-xl md:text-2xl text-lime-100 max-w-2xl">
              The ocean decides, and the vote rules the tides. A decentralized voting system for impactful ocean conservation projects.
            </h2>
            
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <button className="px-6 py-3 rounded-full bg-lime-500 text-slate-900 font-semibold hover:bg-lime-400 transition-all flex items-center">
                Explore Campaigns <ArrowRight className="ml-2 h-5 w-5" />
              </button>
              <button className="px-6 py-3 rounded-full bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition-all flex items-center">
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
      </div>
      
      {/* Featured Campaigns */}
      <div className="container mx-auto px-6 py-12">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 flex items-center">
          <Waves className="h-7 w-7 text-lime-500 mr-3" />
          Featured Campaigns
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Campaign 1 */}
          <div className="bg-slate-800/40 backdrop-blur-md rounded-xl overflow-hidden border border-lime-600/20 hover:border-lime-500/50 transition-all">
            <div className="h-40 bg-gradient-to-r from-lime-600/40 to-yellow-600/40 relative">
              <div className="absolute bottom-4 left-4 px-3 py-1 bg-yellow-400 text-slate-900 text-sm font-semibold rounded-full">
                Active
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-2">Coral Reef Restoration</h3>
              <p className="text-slate-300 mb-4">Restore damaged coral reefs in the Pacific Ocean using innovative techniques.</p>
              <div className="flex justify-between items-center">
                <div className="text-lime-400 font-medium">8,240 CELO</div>
                <button className="px-4 py-2 rounded-full bg-lime-500/20 text-lime-300 hover:bg-lime-500/30 transition-all text-sm">
                  View Details
                </button>
              </div>
            </div>
          </div>
          
          {/* Campaign 2 */}
          <div className="bg-slate-800/40 backdrop-blur-md rounded-xl overflow-hidden border border-lime-600/20 hover:border-lime-500/50 transition-all">
            <div className="h-40 bg-gradient-to-r from-lime-600/40 to-yellow-600/40 relative">
              <div className="absolute bottom-4 left-4 px-3 py-1 bg-yellow-400 text-slate-900 text-sm font-semibold rounded-full">
                Active
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-2">Ocean Cleanup Initiative</h3>
              <p className="text-slate-300 mb-4">Deploy advanced technologies to remove plastic pollution from the Atlantic Ocean.</p>
              <div className="flex justify-between items-center">
                <div className="text-lime-400 font-medium">12,650 CELO</div>
                <button className="px-4 py-2 rounded-full bg-lime-500/20 text-lime-300 hover:bg-lime-500/30 transition-all text-sm">
                  View Details
                </button>
              </div>
            </div>
          </div>
          
          {/* Campaign 3 */}
          <div className="bg-slate-800/40 backdrop-blur-md rounded-xl overflow-hidden border border-lime-600/20 hover:border-lime-500/50 transition-all">
            <div className="h-40 bg-gradient-to-r from-lime-600/40 to-yellow-600/40 relative">
              <div className="absolute bottom-4 left-4 px-3 py-1 bg-slate-300 text-slate-900 text-sm font-semibold rounded-full">
                Coming Soon
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-2">Sustainable Fishing</h3>
              <p className="text-slate-300 mb-4">Promote sustainable fishing practices and protect marine biodiversity worldwide.</p>
              <div className="flex justify-between items-center">
                <div className="text-slate-400 font-medium">Starts in 2 days</div>
                <button className="px-4 py-2 rounded-full bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 transition-all text-sm">
                  Reminder
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center mt-10">
          <button className="px-6 py-3 rounded-full bg-slate-700/50 text-white font-semibold hover:bg-slate-700 transition-all flex items-center">
            View All Campaigns <ArrowRight className="ml-2 h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* How It Works */}
      <div className="container mx-auto px-6 py-12">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 flex items-center">
          <Anchor className="h-7 w-7 text-lime-500 mr-3" />
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
                <button className="px-6 py-3 rounded-full bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition-all">
                  Get Started
                </button>
                <button className="px-6 py-3 rounded-full bg-transparent border border-lime-400 text-lime-400 font-semibold hover:bg-lime-500/10 transition-all">
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