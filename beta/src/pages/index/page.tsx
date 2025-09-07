import { useState } from 'react';
import { 
  ChevronRight
} from 'lucide-react';
import { useAllProjects } from '@/hooks/useProjectMethods';
import { useAllCampaigns } from '@/hooks/useCampaignMethods';
import ProjectCard from '@/components/cards/ProjectCard';
import CampaignCard from '@/components/cards/CampaignCard';
import { formatEther } from 'viem';
import { useNavigate } from 'react-router-dom';
import TerminalCard from '@/components/TerminalCard';
import { formatIpfsUrl } from '@/utils/imageUtils';
import Stepper from '@/components/ui/stepper';
import { getMainContractAddress } from '@/utils/contractConfig';

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
  const CONTRACT_ADDRESS = getMainContractAddress();
  
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

  // Function to shuffle array and get random items
  const shuffleArray = (array: any[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Get active campaigns first, then random ones
  const getFeaturedCampaigns = () => {
    if (!campaigns) return [];
    
    const activeCampaigns = campaigns.filter(campaignDetails => 
      getCampaignStatus(campaignDetails.campaign) === 'active'
    );
    
    const otherCampaigns = campaigns.filter(campaignDetails => 
      getCampaignStatus(campaignDetails.campaign) !== 'active'
    );
    
    const shuffledOthers = shuffleArray(otherCampaigns);
    const featured = [...activeCampaigns, ...shuffledOthers].slice(0, 2);
    
    return featured;
  };

  // Get random projects
  const getFeaturedProjects = () => {
    if (!projects) return [];
    return shuffleArray(projects).slice(0, 2);
  };

  const featuredCampaigns = getFeaturedCampaigns();
  const featuredProjects = getFeaturedProjects();

  return (
    <div className="relative overflow-hidden">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-8 sm:pb-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left Column */}
          <div className="space-y-2 sm:space-y-4 lg:space-y-8">
            {/* Main Headline */}
            <div className="mt-0">
              <span className="text-lg sm:text-2xl lg:text-4xl font-medium text-gray-600">
                Running a <b>Funding</b> <b>Campaign</b> doesn't get <b>Better</b><br className="hidden sm:block" /> than this
              </span>
              
              {/* CTA Buttons - Side by side on mobile */}
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:gap-4 mt-4 sm:mt-6">
                <button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground px-2 sm:px-5 lg:px-6 py-1.5 sm:py-2.5 lg:py-3 rounded-full font-medium transition-colors text-xs sm:text-sm lg:text-base flex items-center justify-center">
                  Create Project
                  <ChevronRight className="ml-1 sm:ml-2 w-3 h-3 sm:w-4 sm:h-4" />
                </button>
                <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-2 sm:px-5 lg:px-6 py-1.5 sm:py-2.5 lg:py-3 rounded-full font-medium transition-colors text-xs sm:text-sm lg:text-base">
                  Host a Campaign
              </button>
          </div>

              {/* Stats Words - Single line on mobile */}
              <div className="flex items-center justify-between sm:justify-start mt-4 sm:mt-8 space-x-2 sm:space-x-4 lg:space-x-6">
                <div className="text-center">
                  <div className="text-xs sm:text-sm lg:text-base font-medium text-gray-600">
                    Campaigns <span className="font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => navigate('/explorer/campaigns')}>{totalCampaigns}+</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs sm:text-sm lg:text-base font-medium text-gray-600">
                    Projects <span className="font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => navigate('/explorer/projects')}>{totalProjects}+</span>
              </div>
                </div>
                <div className="text-center">
                  <div className="text-xs sm:text-sm lg:text-base font-medium text-gray-600">
                    Celo <span className="font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => navigate('/analytics')}>{(totalCeloWithCorrection / 1000).toFixed(1)}K</span>
                  </div>
                </div>
              </div>
            </div>
              </div>

          {/* Right Column - Terminal Card - Hidden on mobile */}
          <div className="relative mt-8 lg:mt-0 flex justify-center hidden sm:block">
            <TerminalCard
              {...terminalCards[currentFeature]}
              onNext={() => setCurrentFeature((prev) => (prev + 1) % terminalCards.length)}
              onPrevious={() => setCurrentFeature((prev) => (prev - 1 + terminalCards.length) % terminalCards.length)}
            />
          </div>
        </div>
      </div>

      {/* Campaigns & Projects Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <button 
                onClick={() => navigate('/explorer/campaigns')}
                className="text-primary hover:text-primary/80 font-medium flex items-center group text-sm sm:text-base"
              >
                Explore
                <ChevronRight className="ml-1 h-3 w-3 sm:h-4 sm:w-4 text-primary group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            </div>
          </div>
          {/* Desktop: Single grid with both campaigns and projects */}
          <div className="hidden lg:grid grid-cols-4 gap-6">
            {/* Campaign Cards */}
            {featuredCampaigns.map((campaignDetails) => {
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
                  campaignId={campaign.id}
                />
              );
            })}
            
            {/* Project Cards */}
            {featuredProjects.map((projectDetails) => {
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
                  projectId={projectDetails.project.id}
                />
              );
            })}
          </div>

          {/* Mobile: Separated campaigns and projects with View All Projects button between */}
          <div className="lg:hidden">
            {/* Campaign Cards */}
            <div className="grid grid-cols-1 gap-8">
              {featuredCampaigns.map((campaignDetails) => {
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
                    campaignId={campaign.id}
                  />
                );
              })}
            </div>
            
            {/* 2 inch space on Android below campaign cards */}
            <div className="h-8"></div>
            
            {/* View All Projects Button - positioned below second card on Android */}
            <div className="flex justify-center mb-4">
              <button 
                onClick={() => navigate('/explorer/projects')}
                className="text-black hover:text-gray-700 font-medium flex items-center group text-sm"
              >
                View All Projects
                <ChevronRight className="ml-1 h-3 w-3 text-black group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            </div>
            
            {/* Project Cards */}
            <div className="grid grid-cols-1 gap-8">
              {featuredProjects.map((projectDetails) => {
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
                    projectId={projectDetails.project.id}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* How it Works Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
    
        <div className="max-w-5xl mx-auto">
          <Stepper
            steps={[
              {
                stepNumber: 1,
                title: "Create Campaign",
                description: "",
                status: "completed",
                icon: "check"
              },
              {
                stepNumber: 2,
                title: "Projects Join",
                description: "",
                status: "completed",
                icon: "check"
              },
              {
                stepNumber: 3,
                title: "Community Voting",
                description: "",
                status: "active",
                icon: "square"
              },
              {
                stepNumber: 4,
                title: "Fair Distribution",
                description: "",
                status: "inactive",
                icon: "square"
              }
            ]}
            currentStep={2}
            orientation="horizontal"
            style={{
              background: "transparent",
              borderRadius: "0px",
              padding: "0px",
              shadow: "none",
              spacing: "32px",
              connectorColor: "#3b82f6",
              activeConnectorColor: "#3b82f6",
              inactiveConnectorColor: "#9ca3af",
              fontFamily: "Inter, sans-serif",
              fontWeight: "600",
              titleColor: "#111827",
              subtitleColor: "#6b7280"
            }}
          />
        </div>

      </div>

    </div>
  );
};

export default HomePage;