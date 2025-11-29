'use client';

import { Suspense, useState } from 'react';
import { 
  ChevronRight
} from 'lucide-react';
import { useAllProjects } from '@/hooks/useProjectMethods';
import { useAllCampaigns } from '@/hooks/useCampaignMethods';
import ProjectCard from '@/components/cards/ProjectCard';
import CampaignCard from '@/components/cards/CampaignCard';
import { formatEther } from 'viem';
import { useRouter } from 'next/navigation';
import TerminalCard from '@/components/TerminalCard';
import { formatIpfsUrl } from '@/utils/imageUtils';
import Stepper from '@/components/ui/stepper';
import { getMainContractAddress } from '@/utils/contractConfig';
import EngagementRewardsCard from '@/components/cards/EngagementRewardsCard';
import GlobeCoverage from '@/components/GlobeCoverage';
import { ButtonCool } from '@/components/ui/button-cool';

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

export default function HomePage() {
  const [currentFeature, setCurrentFeature] = useState(0);
  const router = useRouter();
  
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-4 sm:pb-6">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left Column */}
          <div className="space-y-2 sm:space-y-4 lg:space-y-8">
            {/* Main Headline */}
            <div className="mt-0">
              <span className="text-lg sm:text-2xl lg:text-4xl font-extrabold text-[#050505] uppercase tracking-[0.05em]">
                Running a <span className="border-[0.15em] border-[#050505] px-2 py-1 shadow-[0.2em_0.2em_0_#000000] bg-white inline-block">Funding</span> <span className="border-[0.15em] border-[#050505] px-2 py-1 shadow-[0.2em_0.2em_0_#000000] bg-white inline-block">Campaign</span> doesn't get <span className="border-[0.15em] border-[#050505] px-2 py-1 shadow-[0.2em_0.2em_0_#000000] bg-white inline-block">Better</span><br className="hidden sm:block" /> than this
              </span>
              
              {/* CTA Buttons - Side by side on mobile */}
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:gap-4 mt-4 sm:mt-6">
                <ButtonCool 
                  onClick={() => router.push('/app/project/start')}
                  text="Create Project"
                  bgColor="#6b7280"
                  hoverBgColor="#4b5563"
                  borderColor="#050505"
                  textColor="#ffffff"
                  size="md"
                  className="flex items-center justify-center"
                >
                  <ChevronRight className="ml-1 sm:ml-2 w-3 h-3 sm:w-4 sm:h-4" />
                </ButtonCool>
                <ButtonCool 
                  onClick={() => router.push('/app/campaign/start')}
                  text="Host a Campaign"
                  bgColor="#2563eb"
                  hoverBgColor="#1d4ed8"
                  borderColor="#050505"
                  textColor="#ffffff"
                  size="md"
                />
              </div>

              {/* Stats Words - Single line on mobile */}
              <div className="flex items-center justify-between sm:justify-start mt-4 sm:mt-8 space-x-2 sm:space-x-4 lg:space-x-6">
                <div className="text-center border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] bg-white px-3 py-2 hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all cursor-pointer" onClick={() => router.push('/explorer/campaigns')}>
                  <div className="text-xs sm:text-sm lg:text-base font-extrabold text-[#050505] uppercase tracking-[0.05em]">
                    Campaigns <span className="text-[#2563eb]">{totalCampaigns}+</span>
                  </div>
                </div>
                <div className="text-center border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] bg-white px-3 py-2 hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all cursor-pointer" onClick={() => router.push('/explorer/projects')}>
                  <div className="text-xs sm:text-sm lg:text-base font-extrabold text-[#050505] uppercase tracking-[0.05em]">
                    Projects <span className="text-[#a855f7]">{totalProjects}+</span>
                  </div>
                </div>
                <div className="text-center border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] bg-white px-3 py-2 hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all cursor-pointer" onClick={() => router.push('/analytics')}>
                  <div className="text-xs sm:text-sm lg:text-base font-extrabold text-[#050505] uppercase tracking-[0.05em]">
                    Celo <span className="text-[#10b981]">{(totalCeloWithCorrection / 1000).toFixed(1)}K</span>
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

      {/* Floating Engagement Rewards Card - Hidden for now */}
      {/* <div className="fixed z-50 max-w-sm" style={{ bottom: '264px', right: '0%' }}>
        <Suspense fallback={null}>
          <EngagementRewardsCard />
        </Suspense>
      </div> */}

      {/* Campaigns & Projects Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-8 sm:pb-16">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <button 
                onClick={() => router.push('/explorer/campaigns')}
                className="border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] bg-white hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all px-4 py-2 font-extrabold text-[#050505] uppercase tracking-[0.05em] flex items-center group text-sm sm:text-base"
              >
                Explore
                <ChevronRight className="ml-1 h-3 w-3 sm:h-4 sm:w-4 text-[#050505] group-hover:translate-x-1 transition-transform duration-300" />
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
              let rawLogo;
              try {
                const additionalInfo = JSON.parse(campaignDetails.metadata?.additionalInfo || '{}');
                rawLogo = (additionalInfo as any).logo || (additionalInfo as any).media?.logo;
                logo = rawLogo;
                if (logo) {
                  logo = formatIpfsUrl(logo);
                  console.log('[HomePage] Campaign card logo URL', {
                    source: 'desktop',
                    campaignId: campaign.id?.toString?.() ?? campaign.id,
                    rawLogo,
                    formattedLogo: logo,
                  });
                }
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
                  startTime={Number(campaign.startTime)}
                  endTime={Number(campaign.endTime)}
                  totalFunds={campaign.totalFunds}
                  maxWinners={campaign.maxWinners}
                />
              );
            })}
            
            {/* Project Cards */}
            {featuredProjects.map((projectDetails) => {
              let logo, location;
              let rawLogo;
              try {
                const additionalData = JSON.parse(projectDetails.metadata?.additionalData || '{}');
                rawLogo = additionalData.media?.logo || additionalData.logo;
                logo = rawLogo;
                if (logo) {
                  logo = formatIpfsUrl(logo);
                  console.log('[HomePage] Project card logo URL', {
                    source: 'desktop',
                    projectId: projectDetails.project.id?.toString?.() ?? projectDetails.project.id,
                    rawLogo,
                    formattedLogo: logo,
                  });
                }
                
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
                let rawLogo;
                try {
                  const additionalInfo = JSON.parse(campaignDetails.metadata?.additionalInfo || '{}');
                  rawLogo = (additionalInfo as any).logo || (additionalInfo as any).media?.logo;
                  logo = rawLogo;
                  if (logo) {
                    logo = formatIpfsUrl(logo);
                    console.log('[HomePage] Campaign card logo URL', {
                      source: 'mobile',
                      campaignId: campaign.id?.toString?.() ?? campaign.id,
                      rawLogo,
                      formattedLogo: logo,
                    });
                  }
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
                    startTime={Number(campaign.startTime)}
                    endTime={Number(campaign.endTime)}
                    totalFunds={campaign.totalFunds}
                    maxWinners={campaign.maxWinners}
                  />
                );
              })}
            </div>
            
            {/* 2 inch space on Android below campaign cards */}
            <div className="h-8"></div>
            
            {/* View All Projects Button - positioned below second card on Android */}
            <div className="flex justify-center mb-4">
              <button 
                onClick={() => router.push('/explorer/projects')}
                className="border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] bg-white hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all px-4 py-2 font-extrabold text-[#050505] uppercase tracking-[0.05em] flex items-center group text-sm"
              >
                View All Projects
                <ChevronRight className="ml-1 h-3 w-3 text-[#050505] group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            </div>
            
            {/* Project Cards */}
            <div className="grid grid-cols-1 gap-8">
              {featuredProjects.map((projectDetails) => {
                let logo, location;
                let rawLogo;
                try {
                  const additionalData = JSON.parse(projectDetails.metadata?.additionalData || '{}');
                  rawLogo = additionalData.media?.logo || additionalData.logo;
                  logo = rawLogo;
                  if (logo) {
                    logo = formatIpfsUrl(logo);
                    console.log('[HomePage] Project card logo URL', {
                      source: 'mobile',
                      projectId: projectDetails.project.id?.toString?.() ?? projectDetails.project.id,
                      rawLogo,
                      formattedLogo: logo,
                    });
                  }
                  
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

      {/* Coverage Map Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-6 border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.5em_0.5em_0_#000000] bg-white p-6 relative">
          {/* Pattern Grid Overlay */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-30 z-[1]"
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
              backgroundSize: '0.5em 0.5em'
            }}
          />
          {/* Accent Corner */}
          <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
          <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
          
          <div className="relative z-[2]">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#050505] mb-2 uppercase tracking-[0.05em]">Global Coverage</h2>
            <p className="text-[#050505] font-semibold">See where our community spans across the globe</p>
          </div>
        </div>
        <div className="border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.5em_0.5em_0_#000000] bg-white p-4 relative">
          <GlobeCoverage />
        </div>
      </div>

      {/* How it Works Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        <div className="mb-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#050505] mb-2 uppercase tracking-[0.05em]">How It Works</h2>
        </div>
        <div className="max-w-5xl mx-auto border-[0.35em] border-[#a855f7] rounded-[0.6em] shadow-[0.5em_0.5em_0_#000000] bg-white p-6 relative">
          {/* Pattern Grid Overlay */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-30 z-[1]"
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
              backgroundSize: '0.5em 0.5em'
            }}
          />
          {/* Accent Corner */}
          <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#a855f7] rotate-45 z-[1]" />
          <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>
          
          <div className="relative z-[2]">
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
                connectorColor: "#a855f7",
                activeConnectorColor: "#a855f7",
                inactiveConnectorColor: "#9ca3af",
                fontFamily: "Inter, sans-serif",
                fontWeight: "800",
                titleColor: "#050505",
                subtitleColor: "#050505"
              }}
            />
          </div>
        </div>

      </div>

    </div>
  );
}

