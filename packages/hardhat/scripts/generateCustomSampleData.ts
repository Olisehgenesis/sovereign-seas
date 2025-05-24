import { createWalletClient, createPublicClient, http } from 'viem';
import { celoAlfajores } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';
import sovereignSeasV4Abi from '../artifacts/contracts/SovereignSeasV4.sol/SovereignSeasV4.json';
import {
  Project,
  Campaign,
  TeamMember,
  LICENSES,
  PROJECT_TYPES
} from "./conts";

dotenv.config();

const RPC_URL = process.env.CELO_RPC_URL;
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CELO_TOKEN_ADDRESS = process.env.CELO_TOKEN_ADDRESS || "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

if (!RPC_URL || !SOVEREIGN_SEAS_V4_ADDRESS || !PRIVATE_KEY) {
  throw new Error('Missing required environment variables: CELO_RPC_URL, SOVEREIGN_SEAS_V4_ADDRESS, PRIVATE_KEY');
}

const getRandomItem = <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)];

const generateTeamMember = (role: string, index: number): TeamMember => {
  const names = ['Alice Smith', 'Bob Lee', 'Carol White', 'Dan Brown'];
  const name = names[index % names.length];
  return {
    name,
    role,
    email: `${name.toLowerCase().replace(' ', '.')}@project.com`,
    linkedin: `https://linkedin.com/in/${name.toLowerCase().replace(' ', '-')}`,
    twitter: `https://twitter.com/${name.toLowerCase().replace(' ', '_')}`
  };
};

const generateTwoSampleProjects = (): Project[] => [
  {
    name: "OceanGuard",
    tagline: "Protecting marine life with blockchain",
    description: "A platform for tracking and funding ocean conservation projects.",
    category: "DeFi",
    tags: ["ocean", "conservation", "blockchain"],
    location: "Lisbon, Portugal",
    establishedDate: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
    media: {
      logo: "https://example.com/logos/oceanguard.png",
      demoVideo: "https://example.com/demos/oceanguard.mp4"
    },
    links: {
      website: "https://oceanguard.com",
      demoUrl: "https://app.oceanguard.com",
      githubRepo: "https://github.com/oceanguard",
      documentation: "https://docs.oceanguard.com",
      twitter: "https://twitter.com/oceanguard",
      linkedin: "https://linkedin.com/company/oceanguard",
      discord: "https://discord.gg/oceanguard",
      telegram: "https://t.me/oceanguard"
    },
    teamMembers: [
      generateTeamMember('Founder', 0),
      generateTeamMember('CTO', 1)
    ],
    contactEmail: "info@oceanguard.com",
    techStack: ["React", "Solidity", "Node.js"],
    blockchain: "Celo",
    smartContracts: [
      `0x${Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`
    ],
    license: getRandomItem(LICENSES),
    developmentStage: "Beta",
    keyFeatures: ["Donation Tracking", "Impact Reports"],
    innovation: "First platform to use blockchain for real-time ocean project funding.",
    useCases: ["Donations", "Project Tracking"],
    targetAudience: "Environmentalists, NGOs",
    status: "active",
    projectType: getRandomItem(PROJECT_TYPES),
    maturityLevel: "mvp",
    openSource: true,
    transferrable: true
  },
  {
    name: "HarborDAO",
    tagline: "Decentralized governance for port cities",
    description: "A DAO for managing and funding port infrastructure projects.",
    category: "DAO",
    tags: ["dao", "governance", "ports"],
    location: "Singapore",
    establishedDate: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    media: {
      logo: "https://example.com/logos/harbordao.png",
      demoVideo: "https://example.com/demos/harbordao.mp4"
    },
    links: {
      website: "https://harbordao.com",
      demoUrl: "https://app.harbordao.com",
      githubRepo: "https://github.com/harbordao",
      documentation: "https://docs.harbordao.com",
      twitter: "https://twitter.com/harbordao",
      linkedin: "https://linkedin.com/company/harbordao",
      discord: "https://discord.gg/harbordao",
      telegram: "https://t.me/harbordao"
    },
    teamMembers: [
      generateTeamMember('Lead', 2),
      generateTeamMember('Engineer', 3)
    ],
    contactEmail: "contact@harbordao.com",
    techStack: ["Vue.js", "Solidity", "MongoDB"],
    blockchain: "Celo",
    smartContracts: [
      `0x${Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`
    ],
    license: getRandomItem(LICENSES),
    developmentStage: "Testing",
    keyFeatures: ["DAO Governance", "Funding Proposals"],
    innovation: "First DAO for port city infrastructure.",
    useCases: ["Voting", "Funding"],
    targetAudience: "City officials, investors",
    status: "active",
    projectType: getRandomItem(PROJECT_TYPES),
    maturityLevel: "beta",
    openSource: true,
    transferrable: true
  }
];

const getCampaignTiming = () => {
  const now = new Date();
  const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 40, 0);
  const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 8, 0, 0);
  return {
    startTime: Math.floor(startTime.getTime() / 1000),
    endTime: Math.floor(endTime.getTime() / 1000),
    startDateString: startTime.toISOString(),
    endDateString: endTime.toISOString()
  };
};

const getCampaignTimingAt1125 = () => {
  const now = new Date();
  const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 40, 0);
  const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 8, 0, 0);
  return {
    startTime: Math.floor(startTime.getTime() / 1000),
    endTime: Math.floor(endTime.getTime() / 1000),
    startDateString: startTime.toISOString(),
    endDateString: endTime.toISOString()
  };
};

const generateCustomCampaigns = (projects: Project[]): Campaign[] => {
  const timing1 = getCampaignTiming();
  const timing2 = getCampaignTimingAt1125();
  return [
    {
      id: "campaign-1",
      name: "Ocean Conservation Fund",
      tagline: "Support marine life projects",
      description: "Funding for innovative ocean conservation initiatives.",
      type: "fundraising",
      status: "active",
      visibility: "public",
      startDate: timing1.startDateString,
      endDate: timing1.endDateString,
      media: {
        banner: "https://example.com/banners/ocean.png",
        thumbnail: "https://example.com/thumbnails/ocean.png",
        gallery: [
          "https://example.com/gallery/ocean-1.png",
          "https://example.com/gallery/ocean-2.png"
        ],
        video: "https://example.com/videos/ocean.mp4"
      },
      links: {
        website: "https://oceanguard.com",
        socialMedia: {
          twitter: "https://twitter.com/oceanguard",
          discord: "https://discord.gg/oceanguard",
          telegram: "https://t.me/oceanguard",
          linkedin: "https://linkedin.com/company/oceanguard"
        },
        documentation: "https://docs.oceanguard.com",
        resources: []
      },
      goals: ["Fund 5 new projects", "Expand to 3 new regions"],
      targetAmount: 20000,
      raisedAmount: 0,
      currency: "CELO",
      milestones: [],
      projectId: "",
      projectName: "",
      teamMembers: projects[0].teamMembers,
      contactEmail: projects[0].contactEmail,
      tags: ["ocean", "conservation"],
      location: "Lisbon, Portugal",
      requirements: [],
      benefits: [],
      risks: [],
      metrics: { views: 0, contributors: 0, engagement: 0, conversionRate: 0 }
    },
    {
      id: "campaign-2",
      name: "Port City DAO Launch",
      tagline: "Empowering port communities",
      description: "Kickstarting decentralized governance for port cities.",
      type: "fundraising",
      status: "active",
      visibility: "public",
      startDate: timing2.startDateString,
      endDate: timing2.endDateString,
      media: {
        banner: "https://example.com/banners/port.png",
        thumbnail: "https://example.com/thumbnails/port.png",
        gallery: [
          "https://example.com/gallery/port-1.png",
          "https://example.com/gallery/port-2.png"
        ],
        video: "https://example.com/videos/port.mp4"
      },
      links: {
        website: "https://harbordao.com",
        socialMedia: {
          twitter: "https://twitter.com/harbordao",
          discord: "https://discord.gg/harbordao",
          telegram: "https://t.me/harbordao",
          linkedin: "https://linkedin.com/company/harbordao"
        },
        documentation: "https://docs.harbordao.com",
        resources: []
      },
      goals: ["DAO setup", "First infrastructure vote"],
      targetAmount: 30000,
      raisedAmount: 0,
      currency: "CELO",
      milestones: [],
      projectId: "",
      projectName: "",
      teamMembers: projects[1].teamMembers,
      contactEmail: projects[1].contactEmail,
      tags: ["dao", "governance"],
      location: "Singapore",
      requirements: [],
      benefits: [],
      risks: [],
      metrics: { views: 0, contributors: 0, engagement: 0, conversionRate: 0 }
    }
  ];
};

// The rest of the script (on-chain functions and main) is copied from generateSampleData.ts, but only uses the two projects and two campaigns, and adds both projects to the first campaign.

async function createProjectOnChain(project: Project, walletClient: any, publicClient: any) {
  try {
    console.log(`Creating project: ${project.name}`);
    const bioPart = JSON.stringify({
      tagline: project.tagline,
      category: project.category,
      media: project.media,
      links: project.links,
      teamMembers: project.teamMembers,
      contactEmail: project.contactEmail
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
      tags: project.tags,
      location: project.location,
      establishedDate: project.establishedDate,
      status: project.status,
      projectType: project.projectType,
      maturityLevel: project.maturityLevel,
      openSource: project.openSource
    });
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
    // Use campaign's start and end time from ISO string
    const startTime = Math.floor(new Date(campaign.startDate).getTime() / 1000);
    const endTime = Math.floor(new Date(campaign.endDate).getTime() / 1000);
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
        startTime,
        endTime,
        5,
        3,
        true,
        false,
        '',
        CELO_TOKEN_ADDRESS,
        CELO_TOKEN_ADDRESS
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
        campaignIndex,
        projectIndex,
        CELO_TOKEN_ADDRESS
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
    console.log('🚀 Generating custom sample data for SovereignSeas...');
    const projects = generateTwoSampleProjects();
    console.log(`\n📊 Generated ${projects.length} projects`);
    // Create projects on chain
    console.log('\n🏗️  Creating projects on chain...');
    let successfulProjects = 0;
    for (let i = 0; i < projects.length; i++) {
      console.log(`Attempting to create project ${i + 1}: ${projects[i].name}`);
      const success = await createProjectOnChain(projects[i], walletClient, publicClient);
      if (success) successfulProjects++;
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    console.log(`\n✅ Successfully created ${successfulProjects}/${projects.length} projects`);
    
    // Create campaigns
    console.log('\n🎯 Creating campaigns on chain...');
    const campaigns = generateCustomCampaigns(projects);
    let successfulCampaigns = 0;
    for (let i = 0; i < campaigns.length; i++) {
      const success = await createCampaignOnChain(campaigns[i], walletClient, publicClient);
      if (success) successfulCampaigns++;
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    console.log(`\n✅ Successfully created ${successfulCampaigns}/${campaigns.length} campaigns`);
    
    // Add both projects to the first campaign (campaign index 0)
    console.log('\n🔗 Adding both projects to the first campaign...');
    for (let i = 0; i < projects.length; i++) {
      await addProjectToCampaign(i, 0, walletClient, publicClient);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('\n🎉 Custom sample data generation completed successfully!');
    console.log('\n📈 Summary:');
    console.log(`   • ${successfulProjects} projects created`);
    console.log(`   • ${successfulCampaigns} campaigns created`);
    console.log(`   • Both projects are added and approved in the first campaign`);
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