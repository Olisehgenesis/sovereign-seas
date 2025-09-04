import { useState } from 'react';
import { 
  Play,
  ChevronRight,
  Trophy,
  Code,
  Activity,
  Coins,
  Globe,
  MapPin,
  Timer,
  CheckCircle
} from 'lucide-react';
import { useAllProjects } from '@/hooks/useProjectMethods';
import { useAllCampaigns } from '@/hooks/useCampaignMethods';
import { formatEther } from 'viem';
import type { Address } from 'viem';
import { useNavigate } from 'react-router-dom';
import TerminalCard from '@/components/TerminalCard';
import { formatIpfsUrl } from '@/utils/imageUtils';

// Helper function to determine campaign status
const getCampaignStatus = (campaign: any): 'upcoming' | 'active' | 'ended' | 'paused' => {
  const now = Math.floor(Date.now() / 1000);
  const start = Number(campaign.startTime);
  const end = Number(campaign.endTime);
  
  if (!campaign.active) return 'paused';
  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'active';
  return 'ended';
};

const HomePage = () => {
  const [currentFeature, setCurrentFeature] = useState(0);
  const navigate = useNavigate();
  
  // Contract address from environment variable
  const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_V4 as Address;
  
  // Fetch data using hooks
  const { projects } = useAllProjects(CONTRACT_ADDRESS);
  const { campaigns } = useAllCampaigns(CONTRACT_ADDRESS);
  
  // Calculate stats
  const totalProjects = projects?.length || 0;
  const totalCampaigns = campaigns?.length || 0;
  const totalCeloRaised = campaigns?.reduce((sum, campaignDetails) => {
    return sum + parseFloat(formatEther(campaignDetails.campaign.totalFunds));
  }, 0) || 0;
  
  // Correction value for proof of ship 1 and 2
  const correctionValue = 3000; // CELO correction for proof of ship
  const totalCeloWithCorrection = totalCeloRaised + correctionValue;
  
  const terminalCards = [
    {
      id: "card_1",
      title: "🗳️ Onchain Voting",
      subtitle: "Transparent Governance.",
      description: "Transparent, immutable voting system with multi-token support. Every vote is recorded on-chain and tamper proof.",
      status: {
        text: "READY TO VOTE",
        indicator: "_",
        blinking: true
      },
      branding: {
        logo: "::ss",
        position: "top-left" as const
      },
      pagination: {
        current: 1,
        total: 4
      },
      style: {
        theme: "terminal" as const,
        fontFamily: "monospace" as const,
        backgroundColor: "#f5f5f5",
        borderRadius: "12px",
        shadow: "multiple" as const,
        stackedEffect: true
      }
    },
    {
      id: "card_2",
      title: "💝 Project Tipping",
      subtitle: "Direct Support.",
      description: "Support projects directly with any ERC20 token. Show appreciation with instant, borderless tips that go directly to project creators.",
      status: {
        text: "SEND TIPS NOW",
        indicator: "_",
        blinking: true
      },
      branding: {
        logo: "::ss",
        position: "top-left" as const
      },
      pagination: {
        current: 2,
        total: 4
      },
      style: {
        theme: "terminal" as const,
        fontFamily: "monospace" as const,
        backgroundColor: "#f5f5f5",
        borderRadius: "12px",
        shadow: "multiple" as const,
        stackedEffect: true
      }
    },
    {
      id: "card_3",
      title: "🎣 Project Fishing",
      subtitle: "Discover & Earn.",
      description: "Discover new projects, buy their supporter cards & earn exclusive benefits. Fish for the best opportunities in our ecosystem.",
      status: {
        text: "START FISHING",
        indicator: "_",
        blinking: true
      },
      branding: {
        logo: "::ss",
        position: "top-left" as const
      },
      pagination: {
        current: 3,
        total: 4
      },
      style: {
        theme: "terminal" as const,
        fontFamily: "monospace" as const,
        backgroundColor: "#f5f5f5",
        borderRadius: "12px",
        shadow: "multiple" as const,
        stackedEffect: true
      }
    },
    {
      id: "card_4",
      title: "🚀 Campaign Pools",
      subtitle: "Funding Campaigns.",
      description: "Create funding campaigns with customizable parameters and automated distribution mechanisms. Built for the future of decentralized funding.",
      status: {
        text: "CREATE CAMPAIGN",
        indicator: "_",
        blinking: true
      },
      branding: {
        logo: "::ss",
        position: "top-left" as const
      },
      pagination: {
        current: 4,
        total: 4
      },
      style: {
        theme: "terminal" as const,
        fontFamily: "monospace" as const,
        backgroundColor: "#f5f5f5",
        borderRadius: "12px",
        shadow: "multiple" as const,
        stackedEffect: true
      }
    }
  ];

  // Removed automatic card rotation - cards now only change on manual navigation

  return (
    <div className="bg-gray-50 relative overflow-hidden" style={{
      backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.1) 1px, transparent 0)`,
      backgroundSize: '20px 20px'
    }}>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 pt-16 sm:pt-20 pb-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left Column */}
          <div className="space-y-6 lg:space-y-8 -ml-8 lg:-ml-12">
            {/* Main Headline */}
            <div className="-mt-8">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-medium text-gray-600">
                Running a <b>Funding</b> <b>Campaign</b> doesn't get <b>Better</b><br /> than this
              </span>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6">
                <button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 rounded-full font-medium transition-colors text-xs sm:text-sm lg:text-base flex items-center justify-center">
                  Create Project
                  <ChevronRight className="ml-1.5 sm:ml-2 w-3 h-3 sm:w-4 sm:h-4" />
                </button>
                <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 rounded-full font-medium transition-colors text-xs sm:text-sm lg:text-base">
                  Host a Campaign
                </button>
              </div>
              
              {/* Stats Words */}
              <div className="flex items-center mt-8 space-x-4 sm:space-x-6">
                <div className="text-center">
                  <div className="text-sm sm:text-base font-medium text-gray-600">
                    Campaigns Hosted <span className="font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => navigate('/explorer/campaigns')}>{totalCampaigns}+</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm sm:text-base font-medium text-gray-600">
                    Projects Created <span className="font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => navigate('/explorer/projects')}>{totalProjects}+</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm sm:text-base font-medium text-gray-600">
                    Celo Raised <span className="font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => navigate('/analytics')}>{(totalCeloWithCorrection / 1000).toFixed(1)}K</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Terminal Card */}
          <div className="relative mt-12 lg:mt-0 flex justify-center">
            <TerminalCard
              {...terminalCards[currentFeature]}
              onNext={() => setCurrentFeature((prev) => (prev + 1) % terminalCards.length)}
              onPrevious={() => setCurrentFeature((prev) => (prev - 1 + terminalCards.length) % terminalCards.length)}
            />
          </div>
        </div>
      </div>

      {/* Campaigns & Projects Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center">
              <Trophy className="h-6 w-6 text-blue-500 mr-2" />
              Campaigns & Projects
            </h3>
            <div className="flex gap-4">
              <button 
                onClick={() => navigate('/explorer/campaigns')}
                className="text-blue-600 hover:text-blue-700 font-medium flex items-center group"
              >
                View All Campaigns
                <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
              <button 
                onClick={() => navigate('/explorer/projects')}
                className="text-purple-600 hover:text-purple-700 font-medium flex items-center group"
              >
                View All Projects
                <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            </div>
                  </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Campaign Cards */}
            {campaigns && campaigns.slice(0, 2).map((campaignDetails, index) => {
              const campaign = campaignDetails.campaign;
              const status = getCampaignStatus(campaign);
              
              let statusClass = 'bg-gray-200 text-gray-700';
              let statusText = 'Ended';
              let StatusIcon = CheckCircle;
              
              if (status === 'upcoming') {
                statusClass = 'bg-cyan-400 text-blue-900';
                statusText = 'Coming Soon';
                StatusIcon = Timer;
              } else if (status === 'active') {
                statusClass = 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white';
                statusText = 'Active';
                StatusIcon = Activity;
              } else if (status === 'paused') {
                statusClass = 'bg-gray-200 text-gray-700';
                statusText = 'Ended';
                StatusIcon = CheckCircle;
              }
              
              return (
                <div key={`campaign-${campaign.id}`} className="group relative bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden shadow-xl border-2 border-blue-300 hover:shadow-2xl transition-all duration-500 cursor-pointer">
                  <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-50 relative overflow-hidden">
                    {/* Colored Header Bar */}
                    <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center px-4 z-10">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-white" />
                        <span className="text-white text-sm font-semibold tracking-wide">CAMPAIGN</span>
                </div>
              </div>

                                        {/* Campaign Logo or Background */}
                    {(() => {
                      try {
                        const additionalInfo = JSON.parse(campaignDetails.metadata?.additionalInfo || '{}');
                        const logo = (additionalInfo as any).logo || (additionalInfo as any).media?.logo;
                        return logo ? (
                          <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${formatIpfsUrl(logo)})`, opacity: 0.9 }}></div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Trophy className="h-20 w-20 text-blue-400/50" />
                          </div>
                        );
                      } catch {
                        return (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Trophy className="h-20 w-20 text-blue-400/50" />
                          </div>
                        );
                      }
                    })()}
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    
                    {/* Global Flag Badge for Campaigns */}
                    <div className="absolute right-3 top-[55%] z-20 flex items-center justify-center w-9 h-9 rounded-lg bg-white shadow-lg shadow-blue-300/40 border border-blue-200 text-xs font-semibold text-blue-700 backdrop-blur-md transform rotate-3 scale-105 hover:scale-110 transition-all duration-300">
                      <Globe className="w-5 h-5 drop-shadow" />
                    </div>

                    <div className="absolute top-16 right-4 flex flex-col gap-2">
                      <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center shadow-lg backdrop-blur-sm ${statusClass}`}>
                        <StatusIcon className="h-3 w-3 mr-1.5" />
                        {statusText}
                      </div>
              </div>

                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <div className="flex justify-between items-end">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-100 transition-colors">{campaign.name}</h3>
                        </div>
                        <div className="text-white/90 text-sm font-medium">
                          <div className="flex items-center">
                            <Coins className="h-4 w-4 mr-1.5" />
                            {Math.floor(Number(formatEther(campaign.totalFunds)) || 0)} CELO
                          </div>
                        </div>
                      </div>
                </div>
              </div>

                  <div className="p-6">
                    <div className="mb-4">
                      <h4 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
                        {campaign.name}
                      </h4>
                      <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">
                        {campaign.description || 'No description available'}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full bg-white ring-2 ring-white flex items-center justify-center overflow-hidden shadow-sm">
                          <img src="/images/celo.png" alt="CELO" className="w-full h-full object-cover" />
                        </div>
                        {(index === 0 || index === 2) && (
                          <div className="w-8 h-8 rounded-full bg-white ring-2 ring-white flex items-center justify-center overflow-hidden shadow-sm">
                            <img src="/images/cusd.png" alt="cUSD" className="w-full h-full object-cover" />
                          </div>
                        )}
              </div>

                      <div className="flex items-center text-blue-600 hover:text-blue-700 transition-colors">
                        <span className="text-sm font-medium mr-1">View</span>
                        <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Project Cards */}
            {projects && projects.slice(0, 2).map((projectDetails) => (
              <div key={`project-${projectDetails.project.id}`} className="group bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border-2 border-purple-300 overflow-hidden cursor-pointer relative hover:shadow-2xl transition-all duration-500">
                <div className="relative h-48 bg-gradient-to-br from-purple-50 to-indigo-50 overflow-hidden">
                  {/* Project Logo or Background */}
                  {(() => {
                    try {
                      const additionalData = JSON.parse(projectDetails.metadata?.additionalData || '{}');
                      const logo = additionalData.media?.logo || additionalData.logo;
                      return logo ? (
                        <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${formatIpfsUrl(logo)})`, opacity: 0.9 }}></div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Code className="h-20 w-20 text-purple-400/50" />
                        </div>
                      );
                    } catch {
                      return (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Code className="h-20 w-20 text-purple-400/50" />
                        </div>
                      );
                    }
                  })()}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm bg-purple-500/90 text-white shadow-lg">
                      <Code className="h-3 w-3 mr-1.5" />
                      Project
                    </span>
                  </div>

                  {projectDetails.project.campaignIds && projectDetails.project.campaignIds.length > 0 && (
                    <div className="absolute top-4 left-4">
                      <div className="bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg border border-white/20">
                        <div className="flex items-center gap-1.5">
                          <Trophy className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-bold text-gray-900">{projectDetails.project.campaignIds.length}</span>
                        </div>
                        <p className="text-xs text-gray-600 font-medium">Campaigns</p>
                      </div>
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-100 transition-colors">{projectDetails.project.name}</h3>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                    {projectDetails.project.description}
                  </p>

                  <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-4">
                    {(() => {
                      try {
                        const bioData = JSON.parse(projectDetails.metadata?.bio || '{}');
                        const location = bioData.location;
                        return location ? (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-lg">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <span className="text-xs font-medium">{location}</span>
                          </div>
                        ) : null;
                      } catch {
                        return null;
                      }
                    })()}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 rounded-full bg-white ring-2 ring-white flex items-center justify-center overflow-hidden shadow-sm">
                        <img src="/images/celo.png" alt="CELO" className="w-full h-full object-cover" />
              </div>
            </div>

                    <div className="flex items-center text-purple-600 hover:text-purple-700 transition-colors">
                      <span className="text-sm font-medium mr-1">View</span>
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left - NFT Card */}
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border inline-block">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">Voting</div>
                  <div className="font-bold text-base sm:text-lg">See how it works</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-1 sm:space-y-2">
              <div className="text-base sm:text-lg font-bold text-black">Funding is everywhere.</div>
              <div className="text-base sm:text-lg text-gray-600">The overview.</div>
            </div>
            
            {/* Sticky Note */}
            <div className="bg-white border-l-4 border-gray-300 pl-3 sm:pl-4 py-1.5 sm:py-2 inline-block transform -rotate-1">
              <div className="text-xs sm:text-sm font-medium">NFT</div>
            </div>
          </div>

          {/* Right - Team Section */}
          <div className="space-y-4 sm:space-y-6 mt-8 lg:mt-0">
            <div className="inline-block">
              <div className="bg-white border border-gray-300 rounded-full px-3 sm:px-4 py-1.5 sm:py-2">
                <span className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">TEAM</span>
              </div>
            </div>
            
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
              Our team is passionate about sharing their knowledge and experience with others. 
              We are always available to offers.
            </p>
            
            {/* Avatar Group */}
            <div className="flex -space-x-1 sm:-space-x-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full border-2 border-white"></div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full border-2 border-white"></div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full border-2 border-white"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;