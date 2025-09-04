import { useState } from 'react';
import { 
  ChevronRight,
  Trophy
} from 'lucide-react';
import { useAllProjects } from '@/hooks/useProjectMethods';
import { useAllCampaigns } from '@/hooks/useCampaignMethods';
import ProjectCard from '@/components/cards/ProjectCard';
import CampaignCard from '@/components/cards/CampaignCard';
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
    <div className="relative overflow-hidden">
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
              <Trophy className="h-6 w-6 text-black mr-2" />
              Campaigns & Projects
            </h3>
            <div className="flex gap-4">
              <button 
                onClick={() => navigate('/explorer/projects')}
                className="text-black hover:text-gray-700 font-medium flex items-center group"
              >
                View All Projects
                <ChevronRight className="ml-1 h-4 w-4 text-black group-hover:translate-x-1 transition-transform duration-300" />
              </button>
              <button 
                onClick={() => navigate('/explorer/campaigns')}
                className="text-primary hover:text-primary/80 font-medium flex items-center group"
              >
                View All Campaigns
                <ChevronRight className="ml-1 h-4 w-4 text-primary group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            </div>
                  </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Campaign Cards */}
            {campaigns && campaigns.slice(0, 2).map((campaignDetails) => {
              const campaign = campaignDetails.campaign;
              const status = getCampaignStatus(campaign);
              
              let logo;
              try {
                const additionalInfo = JSON.parse(campaignDetails.metadata?.additionalInfo || '{}');
                logo = (additionalInfo as any).logo || (additionalInfo as any).media?.logo;
                if (logo) logo = formatIpfsUrl(logo);
              } catch {
                logo = undefined;
              }
              
              return (
                <CampaignCard
                  key={`campaign-${campaign.id}`}
                  title={campaign.name}
                  description={campaign.description || 'No description available'}
                  logo={logo}
                  status={status}
                  className="border-blue-300"
                />
              );
            })}
            
            {/* Project Cards */}
            {projects && projects.slice(0, 2).map((projectDetails) => {
              let logo, location;
              try {
                const additionalData = JSON.parse(projectDetails.metadata?.additionalData || '{}');
                logo = additionalData.media?.logo || additionalData.logo;
                if (logo) logo = formatIpfsUrl(logo);
                
                const bioData = JSON.parse(projectDetails.metadata?.bio || '{}');
                location = bioData.location;
              } catch {
                logo = undefined;
                location = undefined;
              }
              
              return (
                <ProjectCard
                  key={`project-${projectDetails.project.id}`}
                  title={projectDetails.project.name}
                  description={projectDetails.project.description}
                  logo={logo}
                  location={location}
                  campaignCount={projectDetails.project.campaignIds?.length || 0}
                  className="border-purple-300"
                />
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
};

export default HomePage;