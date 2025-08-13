// scripts/createCampaign.ts

import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { celoAlfajores } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';
import sovereignSeasV4Abi from '../artifacts/contracts/SovereignSeasV4.sol/SovereignSeasV4.json';

dotenv.config();

const RPC_URL = process.env.CELO_RPC_URL;
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CELO_TOKEN_ADDRESS = process.env.CELO_TOKEN_ADDRESS;

if (!RPC_URL || !SOVEREIGN_SEAS_V4_ADDRESS || !PRIVATE_KEY || !CELO_TOKEN_ADDRESS) {
  throw new Error('Missing required environment variables');
}

// Campaign types similar to Gitcoin rounds and hackathons
enum CampaignType {
  GRANTS_ROUND = 'grants_round',
  HACKATHON = 'hackathon',
  ACCELERATOR = 'accelerator',
  BOUNTY = 'bounty',
  COMMUNITY_FUNDING = 'community_funding',
  INNOVATION_CHALLENGE = 'innovation_challenge'
}

interface CampaignData {
  name: string;
  description: string;
  campaignType: CampaignType;
  startDate: Date;
  endDate: Date;
  fundingGoal: string; // Will be converted to startingFunds for demo
  maxParticipants?: number;
  eligibilityCriteria: string[];
  rewards: {
    totalPrizePool: string;
    distribution: string[];
  };
  requirements: string[];
  judgesCriteria: string[];
  additionalInfo: {
    websiteUrl?: string;
    discordUrl?: string;
    twitterUrl?: string;
    submissionGuidelines?: string;
    contactEmail?: string;
  };
  // Contract-specific fields
  adminFeePercentage: number; // 0-30
  maxWinners: number; // 0 for unlimited
  useQuadraticDistribution: boolean;
  useCustomDistribution: boolean;
}

async function createCampaign(campaignData: CampaignData) {
  try {
    console.log('Creating campaign:', campaignData.name);
    
    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
    
    const publicClient = createPublicClient({
      chain: celoAlfajores,
      transport: http(RPC_URL)
    });

    const walletClient = createWalletClient({
      account,
      chain: celoAlfajores,
      transport: http(RPC_URL)
    });

    // Create campaign metadata
    const mainInfo = JSON.stringify({
      type: campaignData.campaignType,
      maxParticipants: campaignData.maxParticipants || 0,
      eligibilityCriteria: campaignData.eligibilityCriteria,
      rewards: campaignData.rewards,
      requirements: campaignData.requirements,
      judgesCriteria: campaignData.judgesCriteria
    });

    const additionalInfo = JSON.stringify({
      version: '1.0.0',
      timestamp: Date.now(),
      creator: account.address,
      startDate: campaignData.startDate.getTime(),
      endDate: campaignData.endDate.getTime(),
      fundingGoal: campaignData.fundingGoal,
      additionalInfo: campaignData.additionalInfo
    });

    const customDistributionData = campaignData.useCustomDistribution 
      ? JSON.stringify({
          distributionType: 'custom',
          note: 'Manual distribution will be implemented by campaign admin'
        })
      : '';
    
    // Convert dates to Unix timestamps
    const startTimeUnix = BigInt(Math.floor(campaignData.startDate.getTime() / 1000));
    const endTimeUnix = BigInt(Math.floor(campaignData.endDate.getTime() / 1000));
    
    console.log('Campaign parameters:');
    console.log('- Name:', campaignData.name);
    console.log('- Start Time:', new Date(Number(startTimeUnix) * 1000).toLocaleString());
    console.log('- End Time:', new Date(Number(endTimeUnix) * 1000).toLocaleString());
    console.log('- Admin Fee:', `${campaignData.adminFeePercentage}%`);
    console.log('- Max Winners:', campaignData.maxWinners || 'Unlimited');
    console.log('- Quadratic Distribution:', campaignData.useQuadraticDistribution);
    console.log('- Custom Distribution:', campaignData.useCustomDistribution);
    console.log('- Payout Token:', CELO_TOKEN_ADDRESS);
    
    // Prepare transaction with all 13 required parameters
    const { request } = await publicClient.simulateContract({
      account,
      address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
      abi: sovereignSeasV4Abi.abi,
      functionName: 'createCampaign',
      args: [
        campaignData.name,                          // string _name
        campaignData.description,                   // string _description  
        mainInfo,                                   // string _mainInfo
        additionalInfo,                             // string _additionalInfo
        startTimeUnix,                             // uint256 _startTime
        endTimeUnix,                               // uint256 _endTime
        BigInt(campaignData.adminFeePercentage),   // uint256 _adminFeePercentage
        BigInt(campaignData.maxWinners),           // uint256 _maxWinners
        campaignData.useQuadraticDistribution,     // bool _useQuadraticDistribution
        campaignData.useCustomDistribution,        // bool _useCustomDistribution
        customDistributionData,                    // string _customDistributionData
        CELO_TOKEN_ADDRESS as `0x${string}`,       // address _payoutToken
        CELO_TOKEN_ADDRESS as `0x${string}`        // address _feeToken
      ]
    });

    // Execute transaction
    const hash = await walletClient.writeContract(request);
    
    console.log('Transaction submitted:', hash);
    console.log('Waiting for confirmation...');
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
      console.log('✅ Campaign created successfully!');
      console.log('Transaction hash:', hash);
      console.log('Block number:', receipt.blockNumber);
      console.log('Gas used:', receipt.gasUsed.toString());
      
      console.log('\n📋 Campaign Summary:');
      console.log('===================');
      console.log(`Name: ${campaignData.name}`);
      console.log(`Type: ${campaignData.campaignType}`);
      console.log(`Start Date: ${campaignData.startDate.toLocaleDateString()}`);
      console.log(`End Date: ${campaignData.endDate.toLocaleDateString()}`);
      console.log(`Duration: ${Math.ceil((campaignData.endDate.getTime() - campaignData.startDate.getTime()) / (1000 * 60 * 60 * 24))} days`);
      console.log(`Prize Pool: ${campaignData.rewards.totalPrizePool} CELO`);
      console.log(`Max Participants: ${campaignData.maxParticipants || 'Unlimited'}`);
      console.log(`Admin Fee: ${campaignData.adminFeePercentage}%`);
      console.log(`Max Winners: ${campaignData.maxWinners || 'Unlimited'}`);
      console.log(`Distribution: ${campaignData.useQuadraticDistribution ? 'Quadratic' : 'Linear'}`);
      
      if (campaignData.additionalInfo.websiteUrl) {
        console.log(`Website: ${campaignData.additionalInfo.websiteUrl}`);
      }
      if (campaignData.additionalInfo.contactEmail) {
        console.log(`Contact: ${campaignData.additionalInfo.contactEmail}`);
      }
    } else {
      console.error('❌ Transaction failed');
    }
    
    return receipt;
    
  } catch (error) {
    console.error('Error creating campaign:', error);
    throw error;
  }
}

// Sample campaign data - modify as needed
const sampleCampaigns: CampaignData[] = [
  {
    name: "Celo DeFi Innovation Grants Round",
    description: "Supporting innovative DeFi projects building on Celo network to enhance financial inclusion and accessibility.",
    campaignType: CampaignType.GRANTS_ROUND,
    startDate: new Date('2025-06-01T00:00:00.000Z'),
    endDate: new Date('2025-07-31T23:59:59.000Z'),
    fundingGoal: "50000", // 50,000 CELO
    maxParticipants: 100,
    eligibilityCriteria: [
      "Must be building on Celo network",
      "Project must focus on financial inclusion",
      "Open source required",
      "Team must have technical expertise"
    ],
    rewards: {
      totalPrizePool: "50000",
      distribution: [
        "1st Place: 20,000 CELO",
        "2nd Place: 15,000 CELO", 
        "3rd Place: 10,000 CELO",
        "Community Choice: 5,000 CELO"
      ]
    },
    requirements: [
      "Working prototype or MVP",
      "Technical documentation",
      "Roadmap for next 12 months",
      "Team member bios"
    ],
    judgesCriteria: [
      "Technical innovation (30%)",
      "Impact potential (25%)",
      "Market fit (20%)",
      "Team execution capability (15%)",
      "Community engagement (10%)"
    ],
    additionalInfo: {
      websiteUrl: "https://grants.celo.org",
      discordUrl: "https://discord.gg/celo",
      twitterUrl: "https://twitter.com/celoorg",
      submissionGuidelines: "All submissions must include a demo video, technical documentation, and pitch deck.",
      contactEmail: "grants@celo.org"
    },
    adminFeePercentage: 5, // 5% admin fee
    maxWinners: 10, // Top 10 projects win
    useQuadraticDistribution: true,
    useCustomDistribution: false
  },
  {
    name: "Web3 Social Impact Hackathon",
    description: "48-hour hackathon focused on building blockchain solutions for social good and environmental sustainability.",
    campaignType: CampaignType.HACKATHON,
    startDate: new Date('2025-07-15T09:00:00.000Z'),
    endDate: new Date('2025-07-17T18:00:00.000Z'),
    fundingGoal: "25000", // 25,000 CELO
    maxParticipants: 200,
    eligibilityCriteria: [
      "Individual developers or teams up to 4 people",
      "Must build during hackathon timeframe",
      "Focus on social impact or sustainability",
      "Any blockchain network allowed"
    ],
    rewards: {
      totalPrizePool: "25000",
      distribution: [
        "Grand Prize: 10,000 CELO",
        "Best Social Impact: 5,000 CELO",
        "Best Technical Innovation: 5,000 CELO",
        "People's Choice: 3,000 CELO",
        "Best New Team: 2,000 CELO"
      ]
    },
    requirements: [
      "Register before hackathon starts",
      "Submit project within 48 hours",
      "Include source code repository",
      "2-minute demo video"
    ],
    judgesCriteria: [
      "Social impact potential (40%)",
      "Technical execution (25%)",
      "Innovation and creativity (20%)",
      "Presentation quality (15%)"
    ],
    additionalInfo: {
      websiteUrl: "https://hackathon.example.com",
      discordUrl: "https://discord.gg/web3hackathon",
      twitterUrl: "https://twitter.com/web3hackathon",
      submissionGuidelines: "Projects must be submitted via GitHub with a working demo and documentation.",
      contactEmail: "hello@web3hackathon.com"
    },
    adminFeePercentage: 3, // 3% admin fee
    maxWinners: 5, // Top 5 winners
    useQuadraticDistribution: false,
    useCustomDistribution: false
  },
  {
    name: "Climate Solutions Accelerator",
    description: "3-month accelerator program for early-stage climate tech startups leveraging blockchain technology.",
    campaignType: CampaignType.ACCELERATOR,
    startDate: new Date('2025-08-01T00:00:00.000Z'),
    endDate: new Date('2025-11-01T23:59:59.000Z'),
    fundingGoal: "100000", // 100,000 CELO
    maxParticipants: 20,
    eligibilityCriteria: [
      "Pre-seed to Series A startups",
      "Climate tech focus required",
      "Blockchain integration planned",
      "Committed to 3-month program"
    ],
    rewards: {
      totalPrizePool: "100000",
      distribution: [
        "Each participant: 3,000 CELO stipend",
        "Demo Day Winner: 15,000 CELO",
        "Community Impact Award: 10,000 CELO",
        "Technical Excellence: 8,000 CELO"
      ]
    },
    requirements: [
      "Detailed business plan",
      "Technical architecture document",
      "Team commitment letter",
      "Climate impact measurement plan"
    ],
    judgesCriteria: [
      "Climate impact potential (35%)",
      "Business model viability (25%)",
      "Technical feasibility (20%)",
      "Team strength (20%)"
    ],
    additionalInfo: {
      websiteUrl: "https://climateaccelerator.org",
      discordUrl: "https://discord.gg/climatetech",
      submissionGuidelines: "Applications must include pitch deck, technical whitepaper, and video interviews.",
      contactEmail: "apply@climateaccelerator.org"
    },
    adminFeePercentage: 8, // 8% admin fee for full program
    maxWinners: 0, // All participants can benefit
    useQuadraticDistribution: false,
    useCustomDistribution: true // Will use custom distribution logic
  }
];

async function main() {
  try {
    // Choose which campaign to create (0, 1, or 2)
    const campaignIndex = process.argv[2] ? parseInt(process.argv[2]) : 0;
    
    if (campaignIndex < 0 || campaignIndex >= sampleCampaigns.length) {
      console.error(`Invalid campaign index. Choose 0-${sampleCampaigns.length - 1}`);
      console.log('\nAvailable campaigns:');
      sampleCampaigns.forEach((campaign, index) => {
        console.log(`${index}: ${campaign.name} (${campaign.campaignType})`);
      });
      process.exit(1);
    }
    
    const campaign = sampleCampaigns[campaignIndex];
    
    console.log(`\n🚀 Creating Campaign: ${campaign.name}`);
    console.log(`📋 Type: ${campaign.campaignType}`);
    console.log(`💰 Prize Pool: ${campaign.rewards.totalPrizePool} CELO`);
    console.log(`📅 Duration: ${campaign.startDate.toLocaleDateString()} - ${campaign.endDate.toLocaleDateString()}`);
    console.log(`⚖️  Admin Fee: ${campaign.adminFeePercentage}%`);
    console.log(`🏆 Max Winners: ${campaign.maxWinners || 'Unlimited'}`);
    console.log(`📊 Distribution: ${campaign.useQuadraticDistribution ? 'Quadratic' : campaign.useCustomDistribution ? 'Custom' : 'Linear'}\n`);
    
    await createCampaign(campaign);
    
  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });