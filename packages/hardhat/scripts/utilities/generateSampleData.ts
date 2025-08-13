import { createWalletClient, createPublicClient, http } from 'viem';
import { celoAlfajores } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';
import sovereignSeasV4Abi from '../artifacts/contracts/SovereignSeasV4.sol/SovereignSeasV4.json';
import {
  Project,
  Campaign,
  TeamMember,
  PROJECT_CATEGORIES,
  BLOCKCHAINS,
  TECH_STACK_OPTIONS,
  LICENSES,
  DEVELOPMENT_STAGES,
  PROJECT_TYPES,
  CAMPAIGN_TYPES,
  CAMPAIGN_STATUSES,
  CAMPAIGN_VISIBILITY
} from "./conts";

dotenv.config();

const RPC_URL = process.env.CELO_RPC_URL;
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
// Add CELO token address - replace with actual CELO token address
const CELO_TOKEN_ADDRESS = process.env.CELO_TOKEN_ADDRESS || "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"; // Celo native token on Alfajores

if (!RPC_URL || !SOVEREIGN_SEAS_V4_ADDRESS || !PRIVATE_KEY) {
  throw new Error('Missing required environment variables: CELO_RPC_URL, SOVEREIGN_SEAS_V4_ADDRESS, PRIVATE_KEY');
}

// Helper function to get random item from array
const getRandomItem = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

// Helper function to get random items from array
const getRandomItems = <T>(array: T[], count: number): T[] => {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Generate specific date/time for campaigns
const getCampaignTiming = () => {
  const now = new Date();
  // Set start time to today at midday (12:00 PM)
  const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  // Set end time to 3 days later at midday
  const endTime = new Date(startTime.getTime() + (3 * 24 * 60 * 60 * 1000));
  
  return {
    startTime: Math.floor(startTime.getTime() / 1000),
    endTime: Math.floor(endTime.getTime() / 1000),
    startDateString: startTime.toISOString(),
    endDateString: endTime.toISOString()
  };
};

// Generate a realistic team member
const generateTeamMember = (role: string, index: number): TeamMember => {
  const names = ['Alex Johnson', 'Sarah Chen', 'Marcus Rodriguez', 'Emily Davis', 'David Kim', 'Lisa Thompson'];
  const name = names[index % names.length];
  
  return {
    name,
    role,
    email: `${name.toLowerCase().replace(' ', '.')}@project.com`,
    linkedin: `https://linkedin.com/in/${name.toLowerCase().replace(' ', '-')}`,
    twitter: `https://twitter.com/${name.toLowerCase().replace(' ', '_')}`
  };
};

// Generate realistic sample projects
const generateSampleProjects = (): Project[] => {
  const projectData = [
    {
      name: "CeloSwap DEX",
      tagline: "Next-generation decentralized exchange on Celo",
      description: "A high-performance AMM DEX with innovative liquidity mining and cross-chain capabilities, designed specifically for the Celo ecosystem.",
      category: "DeFi" as const,
      techStack: ["React", "Next.js", "Solidity", "Web3.js", "Node.js"],
      keyFeatures: ["Automated Market Making", "Liquidity Mining Rewards", "Cross-chain Bridge", "Gas-efficient Trading"],
      innovation: "Revolutionary liquidity aggregation algorithm that reduces slippage by 40%",
      useCases: ["Token Swapping", "Liquidity Provision", "Yield Farming", "Cross-chain Trading"]
    },
    {
      name: "GreenImpact DAO",
      tagline: "Community-driven environmental impact platform",
      description: "A decentralized autonomous organization focused on funding and tracking environmental restoration projects through blockchain transparency.",
      category: "DAO" as const,
      techStack: ["Vue.js", "Solidity", "IPFS", "Hardhat", "PostgreSQL"],
      keyFeatures: ["Transparent Voting", "Impact Tracking", "Carbon Credit NFTs", "Community Governance"],
      innovation: "First DAO to integrate real-world environmental impact verification with blockchain voting",
      useCases: ["Environmental Funding", "Impact Verification", "Community Governance", "Carbon Trading"]
    },
    {
      name: "CeloID Identity",
      tagline: "Self-sovereign identity solution for Celo users",
      description: "A comprehensive digital identity platform that gives users complete control over their personal data while enabling seamless KYC compliance.",
      category: "Identity" as const,
      techStack: ["React", "Rust", "Solidity", "Web3.js", "MongoDB"],
      keyFeatures: ["Self-Sovereign Identity", "Zero-Knowledge Proofs", "KYC Compliance", "Biometric Authentication"],
      innovation: "Advanced zero-knowledge proof system for privacy-preserving identity verification",
      useCases: ["Identity Verification", "KYC Compliance", "Access Control", "Privacy Protection"]
    }
  ];

  return projectData.map((data, index) => ({
    name: data.name,
    tagline: data.tagline,
    description: data.description,
    category: data.category,
    tags: ['web3', 'celo', 'blockchain', data.category.toLowerCase()],
    location: getRandomItem(['San Francisco, USA', 'Berlin, Germany', 'Singapore', 'Remote']),
    establishedDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    media: {
      logo: `https://example.com/logos/${data.name.toLowerCase().replace(/\s+/g, '-')}.png`,
      demoVideo: `https://example.com/demos/${data.name.toLowerCase().replace(/\s+/g, '-')}.mp4`
    },
    links: {
      website: `https://${data.name.toLowerCase().replace(/\s+/g, '')}.com`,
      demoUrl: `https://app.${data.name.toLowerCase().replace(/\s+/g, '')}.com`,
      githubRepo: `https://github.com/${data.name.toLowerCase().replace(/\s+/g, '-')}`,
      documentation: `https://docs.${data.name.toLowerCase().replace(/\s+/g, '')}.com`,
      twitter: `https://twitter.com/${data.name.toLowerCase().replace(/\s+/g, '')}`,
      linkedin: `https://linkedin.com/company/${data.name.toLowerCase().replace(/\s+/g, '-')}`,
      discord: `https://discord.gg/${data.name.toLowerCase().replace(/\s+/g, '')}`,
      telegram: `https://t.me/${data.name.toLowerCase().replace(/\s+/g, '')}`
    },
    teamMembers: [
      generateTeamMember('Founder & CEO', index * 3),
      generateTeamMember('CTO', index * 3 + 1),
      generateTeamMember('Lead Developer', index * 3 + 2)
    ],
    contactEmail: `hello@${data.name.toLowerCase().replace(/\s+/g, '')}.com`,
    techStack: data.techStack as any[],
    blockchain: 'Celo' as const,
    smartContracts: [`0x${Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`],
    license: getRandomItem(LICENSES),
    developmentStage: getRandomItem(['Beta', 'Production', 'Testing']),
    keyFeatures: data.keyFeatures,
    innovation: data.innovation,
    useCases: data.useCases,
    targetAudience: 'DeFi users, developers, and crypto enthusiasts',
    status: 'active' as const,
    projectType: getRandomItem(PROJECT_TYPES),
    maturityLevel: getRandomItem(['mvp', 'beta', 'production']),
    openSource: true,
    transferrable: true
  }));
};

// Generate realistic campaigns
const generateSampleCampaigns = (projects: Project[]): Campaign[] => {
  const timing = getCampaignTiming();
  
  const campaignData = [
    {
      name: "DEX Development Fund",
      tagline: "Help us build the future of DeFi on Celo",
      description: "Support the development of advanced trading features and cross-chain integration for CeloSwap DEX.",
      targetAmount: 50000,
      goals: ["Complete AMM v2 implementation", "Launch cross-chain bridge", "Implement advanced trading features", "Security audit and testing"]
    },
    {
      name: "Environmental Impact Initiative",
      tagline: "Fund real-world environmental projects",
      description: "Vote to allocate funds to verified environmental restoration projects tracked through our transparent DAO system.",
      targetAmount: 75000,
      goals: ["Fund 10 reforestation projects", "Deploy impact tracking system", "Launch carbon credit marketplace", "Build community partnerships"]
    },
    {
      name: "Identity Platform Launch",
      tagline: "Privacy-first identity for everyone",
      description: "Support the launch of CeloID's self-sovereign identity platform with zero-knowledge proof technology.",
      targetAmount: 30000,
      goals: ["Complete ZK-proof implementation", "Mobile app development", "KYC compliance integration", "Community onboarding"]
    }
  ];

  return campaignData.map((data, index) => ({
    id: `campaign-${index + 1}`,
    name: data.name,
    tagline: data.tagline,
    description: data.description,
    type: 'fundraising' as const,
    status: 'active' as const,
    visibility: 'public' as const,
    startDate: timing.startDateString,
    endDate: timing.endDateString,
    media: {
      banner: `https://example.com/banners/${data.name.toLowerCase().replace(/\s+/g, '-')}.png`,
      thumbnail: `https://example.com/thumbnails/${data.name.toLowerCase().replace(/\s+/g, '-')}.png`,
      gallery: [
        `https://example.com/gallery/${data.name.toLowerCase().replace(/\s+/g, '-')}-1.png`,
        `https://example.com/gallery/${data.name.toLowerCase().replace(/\s+/g, '-')}-2.png`
      ],
      video: `https://example.com/videos/${data.name.toLowerCase().replace(/\s+/g, '-')}.mp4`
    },
    links: {
      website: projects[index].links.website,
      socialMedia: {
        twitter: projects[index].links.twitter,
        discord: projects[index].links.discord,
        telegram: projects[index].links.telegram,
        linkedin: projects[index].links.linkedin
      },
      documentation: projects[index].links.documentation,
      resources: [`${projects[index].links.website}/campaign-resources`]
    },
    goals: data.goals,
    targetAmount: data.targetAmount,
    raisedAmount: Math.floor(data.targetAmount * Math.random() * 0.3), // 0-30% raised
    currency: 'CELO',
    milestones: [
      {
        title: 'Phase 1: Foundation',
        description: 'Establish core infrastructure and team',
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'in_progress' as const,
        deliverables: ['Smart contract deployment', 'Frontend MVP', 'Documentation']
      },
      {
        title: 'Phase 2: Development',
        description: 'Build core features and functionality',
        dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending' as const,
        deliverables: ['Feature implementation', 'Testing suite', 'Security audit']
      }
    ],
    projectId: `project-${index}`,
    projectName: projects[index].name,
    teamMembers: projects[index].teamMembers,
    contactEmail: projects[index].contactEmail,
    tags: ['fundraising', 'celo', 'web3', projects[index].category.toLowerCase()],
    location: projects[index].location,
    requirements: ['CELO wallet (Valora/MetaMask)', 'Minimum 1 CELO to participate'],
    benefits: ['Early access to platform', 'Governance tokens', 'Community recognition', 'Exclusive updates'],
    risks: ['Development delays', 'Market volatility', 'Regulatory changes'],
    metrics: {
      views: Math.floor(Math.random() * 5000) + 1000,
      contributors: Math.floor(Math.random() * 200) + 50,
      engagement: Math.floor(Math.random() * 2000) + 500,
      conversionRate: Math.random() * 0.05 + 0.02
    }
  }));
};

async function createProjectOnChain(project: Project, walletClient: any, publicClient: any) {
  try {
    console.log(`Creating project: ${project.name}`);
    
    // Prepare project metadata
    const bioPart = JSON.stringify({
      tagline: project.tagline,
      category: project.category,
      tags: project.tags,
      location: project.location,
      establishedDate: project.establishedDate,
      teamMembers: project.teamMembers,
      contactEmail: project.contactEmail,
      media: project.media,
      links: project.links
    });

    const contractInfoPart = JSON.stringify({
      techStack: project.techStack,
      blockchain: project.blockchain,
      smartContracts: project.smartContracts,
      license: project.license,
      developmentStage: project.developmentStage
    });

    const additionalDataPart = JSON.stringify({
      keyFeatures: project.keyFeatures,
      innovation: project.innovation,
      useCases: project.useCases,
      targetAudience: project.targetAudience,
      status: project.status,
      projectType: project.projectType,
      maturityLevel: project.maturityLevel,
      openSource: project.openSource
    });

    // Create project on chain
    const { request } = await publicClient.simulateContract({
      account: walletClient.account,
      address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
      abi: sovereignSeasV4Abi.abi,
      functionName: 'createProject',
      args: [
        project.name,
        project.description,
        bioPart,
        contractInfoPart,
        additionalDataPart,
        project.smartContracts,
        project.transferrable
      ]
    });

    const hash = await walletClient.writeContract(request);
    console.log(`Project creation transaction submitted: ${hash}`);
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === 'success') {
      console.log(`✅ Project ${project.name} created successfully!`);
      return true;
    } else {
      console.log(`❌ Failed to create project ${project.name}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error creating project ${project.name}:`, error);
    return false;
  }
}

async function createCampaignOnChain(campaign: Campaign, walletClient: any, publicClient: any) {
  try {
    console.log(`Creating campaign: ${campaign.name}`);
    
    const timing = getCampaignTiming();
    
    // Prepare campaign metadata
    const mainInfo = JSON.stringify({
      tagline: campaign.tagline,
      type: campaign.type,
      visibility: campaign.visibility,
      media: campaign.media,
      links: campaign.links,
      goals: campaign.goals,
      targetAmount: campaign.targetAmount,
      currency: campaign.currency,
      milestones: campaign.milestones
    });

    const additionalInfo = JSON.stringify({
      teamMembers: campaign.teamMembers,
      contactEmail: campaign.contactEmail,
      tags: campaign.tags,
      location: campaign.location,
      requirements: campaign.requirements,
      benefits: campaign.benefits,
      risks: campaign.risks,
      metrics: campaign.metrics
    });

    // Create campaign on chain
    const { request } = await publicClient.simulateContract({
      account: walletClient.account,
      address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
      abi: sovereignSeasV4Abi.abi,
      functionName: 'createCampaign',
      args: [
        campaign.name,
        campaign.description,
        mainInfo,
        additionalInfo,
        timing.startTime,
        timing.endTime,
        5, // adminFeePercentage (5%)
        3, // maxWinners
        true, // useQuadraticDistribution
        false, // useCustomDistribution
        '', // customDistributionData
        CELO_TOKEN_ADDRESS, // payoutToken (CELO)
        CELO_TOKEN_ADDRESS // feeToken (CELO)
      ]
    });

    const hash = await walletClient.writeContract(request);
    console.log(`Campaign creation transaction submitted: ${hash}`);
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === 'success') {
      console.log(`✅ Campaign ${campaign.name} created successfully!`);
      return true;
    } else {
      console.log(`❌ Failed to create campaign ${campaign.name}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error creating campaign ${campaign.name}:`, error);
    return false;
  }
}

async function addProjectToCampaign(projectIndex: number, campaignIndex: number, walletClient: any, publicClient: any) {
  try {
    console.log(`Adding project ${projectIndex} to campaign ${campaignIndex}`);
    
    const { request } = await publicClient.simulateContract({
      account: walletClient.account,
      address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
      abi: sovereignSeasV4Abi.abi,
      functionName: 'addProjectToCampaign',
      args: [
        campaignIndex, // campaignId
        projectIndex,  // projectId
        CELO_TOKEN_ADDRESS // feeToken
      ]
    });

    const hash = await walletClient.writeContract(request);
    console.log(`Add project to campaign transaction submitted: ${hash}`);
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === 'success') {
      console.log(`✅ Project ${projectIndex} added to campaign ${campaignIndex} successfully!`);
      
      // Approve the project
      const { request: approveRequest } = await publicClient.simulateContract({
        account: walletClient.account,
        address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
        abi: sovereignSeasV4Abi.abi,
        functionName: 'approveProject',
        args: [campaignIndex, projectIndex]
      });

      const approveHash = await walletClient.writeContract(approveRequest);
      const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
      
      if (approveReceipt.status === 'success') {
        console.log(`✅ Project ${projectIndex} approved in campaign ${campaignIndex}!`);
      }
      
      return true;
    } else {
      console.log(`❌ Failed to add project ${projectIndex} to campaign ${campaignIndex}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error adding project to campaign:`, error);
    return false;
  }
}

async function main() {
  try {
    // Setup wallet and public clients
    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: celoAlfajores,
      transport: http(RPC_URL)
    });

    const publicClient = createPublicClient({
      chain: celoAlfajores,
      transport: http(RPC_URL)
    });

    console.log('🚀 Generating sample data for SovereignSeas...');
    console.log(`📅 Campaigns will start: ${getCampaignTiming().startDateString}`);
    console.log(`📅 Campaigns will end: ${getCampaignTiming().endDateString}`);
    
    // Generate sample projects and campaigns
    const projects = generateSampleProjects();
    const campaigns = generateSampleCampaigns(projects);
    
    console.log(`\n📊 Generated ${projects.length} projects and ${campaigns.length} campaigns`);
    
    // Create projects on chain
    console.log('\n🏗️  Creating projects on chain...');
    let successfulProjects = 0;
    for (let i = 0; i < projects.length; i++) {
      const success = await createProjectOnChain(projects[i], walletClient, publicClient);
      if (success) successfulProjects++;
      // Add delay between transactions
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log(`\n✅ Successfully created ${successfulProjects}/${projects.length} projects`);
    
    // Create campaigns on chain
    console.log('\n🎯 Creating campaigns on chain...');
    let successfulCampaigns = 0;
    for (let i = 0; i < campaigns.length; i++) {
      const success = await createCampaignOnChain(campaigns[i], walletClient, publicClient);
      if (success) successfulCampaigns++;
      // Add delay between transactions
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log(`\n✅ Successfully created ${successfulCampaigns}/${campaigns.length} campaigns`);
    
    // Add projects to campaigns and approve them
    console.log('\n🔗 Adding projects to campaigns...');
    for (let i = 0; i < Math.min(projects.length, campaigns.length); i++) {
      await addProjectToCampaign(i, i, walletClient, publicClient);
      // Add delay between transactions
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log('\n🎉 Sample data generation completed successfully!');
    console.log('\n📈 Summary:');
    console.log(`   • ${successfulProjects} projects created`);
    console.log(`   • ${successfulCampaigns} campaigns created`);
    console.log(`   • All campaigns start at midday today`);
    console.log(`   • All campaigns end in 3 days`);
    console.log(`   • Projects are automatically added and approved in campaigns`);
    
  } catch (error) {
    console.error('❌ Error in main function:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });