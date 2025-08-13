// Campaign Details Viewer Script
// Usage: node viewCampaign.js <campaignId>

import { createPublicClient, http, formatEther } from 'viem';
import { celo } from 'viem/chains';

import * as dotenv from 'dotenv';



dotenv.config();

// Contract configuration
const CONTRACT_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS
const RPC_URL = 'https://forno.celo.org'; // Celo mainnet RPC

// Simplified ABI for the functions we need
const CONTRACT_ABI = [
  {
    inputs: [{ name: '_campaignId', type: 'uint256' }],
    name: 'getCampaign',
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'admin', type: 'address' },
      { name: 'name', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'adminFeePercentage', type: 'uint256' },
      { name: 'maxWinners', type: 'uint256' },
      { name: 'useQuadraticDistribution', type: 'bool' },
      { name: 'useCustomDistribution', type: 'bool' },
      { name: 'payoutToken', type: 'address' },
      { name: 'active', type: 'bool' },
      { name: 'totalFunds', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: '_campaignId', type: 'uint256' }],
    name: 'getCampaignMetadata',
    outputs: [
      { name: 'mainInfo', type: 'string' },
      { name: 'additionalInfo', type: 'string' },
      { name: 'customDistributionData', type: 'string' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getCampaignCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Create client
const client = createPublicClient({
  chain: celo,
  transport: http(RPC_URL)
});

// Helper function to safely parse JSON
function safeJsonParse(jsonString: string, fallback: any = {}) {
  try {
    return jsonString ? JSON.parse(jsonString) : fallback;
  } catch (error) {
    console.warn('⚠️  Failed to parse JSON:', error);
    return fallback;
  }
}

// Helper function to determine campaign status
function getCampaignStatus(startTime: bigint, endTime: bigint, active: boolean): string {
  const now = Math.floor(Date.now() / 1000);
  const start = Number(startTime);
  const end = Number(endTime);
  
  if (now < start) {
    return 'upcoming';
  } else if (now >= start && now <= end && active) {
    return 'active';
  } else if (now > end) {
    return 'ended';
  } else {
    return 'paused';
  }
}

// Helper function to format duration
function formatDuration(startTime: bigint, endTime: bigint): string {
  const start = new Date(Number(startTime) * 1000);
  const end = new Date(Number(endTime) * 1000);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays} days`;
}

// Main function to get and log campaign details
async function getCampaignDetails(campaignId: number) {
  try {
    console.log('🔍 Fetching campaign details...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Get basic campaign data
    const campaignData = await client.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'getCampaign',
      args: [BigInt(campaignId)]
    }) as any[];

    // Get campaign metadata
    const metadataData = await client.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'getCampaignMetadata',
      args: [BigInt(campaignId)]
    }) as any[];

    // Parse the data
    const campaign = {
      id: campaignData[0],
      admin: campaignData[1],
      name: campaignData[2],
      description: campaignData[3],
      startTime: campaignData[4],
      endTime: campaignData[5],
      adminFeePercentage: campaignData[6],
      maxWinners: campaignData[7],
      useQuadraticDistribution: campaignData[8],
      useCustomDistribution: campaignData[9],
      payoutToken: campaignData[10],
      active: campaignData[11],
      totalFunds: campaignData[12]
    };

    const metadata = {
      mainInfo: metadataData[0],
      additionalInfo: metadataData[1],
      customDistributionData: metadataData[2]
    };

    // Parse metadata JSON
    const mainInfo = safeJsonParse(metadata.mainInfo);
    const additionalInfo = safeJsonParse(metadata.additionalInfo);

    // Log campaign details
    console.log(`📋 CAMPAIGN #${campaignId} DETAILS`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Basic Information
    console.log('🏷️  BASIC INFORMATION');
    console.log(`   Name: ${campaign.name}`);
    console.log(`   ID: ${campaign.id.toString()}`);
    console.log(`   Admin: ${campaign.admin}`);
    console.log(`   Status: ${getCampaignStatus(campaign.startTime, campaign.endTime, campaign.active).toUpperCase()}`);
    console.log(`   Active: ${campaign.active ? '✅ Yes' : '❌ No'}`);
    console.log(`   Type: ${mainInfo.campaignType || 'Not specified'}`);
    console.log(`   Category: ${mainInfo.category || 'Not specified'}`);
    console.log('');

    // Description
    console.log('📝 DESCRIPTION');
    console.log(`   ${campaign.description || 'No description provided'}`);
    console.log('');

    // Timeline
    console.log('📅 TIMELINE');
    const startDate = new Date(Number(campaign.startTime) * 1000);
    const endDate = new Date(Number(campaign.endTime) * 1000);
    console.log(`   Start: ${startDate.toLocaleString()}`);
    console.log(`   End: ${endDate.toLocaleString()}`);
    console.log(`   Duration: ${formatDuration(campaign.startTime, campaign.endTime)}`);
    console.log('');

    // Financial Details
    console.log('💰 FINANCIAL DETAILS');
    console.log(`   Prize Pool: ${mainInfo.prizePool || '0'} CELO`);
    console.log(`   Total Funds Raised: ${formatEther(campaign.totalFunds)} CELO`);
    console.log(`   Admin Fee: ${campaign.adminFeePercentage.toString()}%`);
    console.log(`   Payout Token: ${campaign.payoutToken}`);
    console.log('');

    // Competition Details
    console.log('🏆 COMPETITION DETAILS');
    console.log(`   Max Winners: ${campaign.maxWinners.toString()}`);
    console.log(`   Max Participants: ${mainInfo.maxParticipants || 'Unlimited'}`);
    console.log(`   Quadratic Distribution: ${campaign.useQuadraticDistribution ? '✅ Yes' : '❌ No'}`);
    console.log(`   Custom Distribution: ${campaign.useCustomDistribution ? '✅ Yes' : '❌ No'}`);
    console.log('');

    // Media & Links
    if (mainInfo.logo || mainInfo.website || mainInfo.videoLink) {
      console.log('🌐 MEDIA & LINKS');
      if (mainInfo.logo) console.log(`   Logo: ${mainInfo.logo}`);
      if (mainInfo.website) console.log(`   Website: ${mainInfo.website}`);
      if (mainInfo.videoLink) console.log(`   Video: ${mainInfo.videoLink}`);
      console.log('');
    }

    // Social Media
    if (additionalInfo.social) {
      console.log('📱 SOCIAL MEDIA');
      if (additionalInfo.social.twitter) console.log(`   Twitter: ${additionalInfo.social.twitter}`);
      if (additionalInfo.social.discord) console.log(`   Discord: ${additionalInfo.social.discord}`);
      if (additionalInfo.social.telegram) console.log(`   Telegram: ${additionalInfo.social.telegram}`);
      console.log('');
    }

    // Contact Information
    if (additionalInfo.contactEmail) {
      console.log('📧 CONTACT');
      console.log(`   Email: ${additionalInfo.contactEmail}`);
      console.log('');
    }

    // Tags
    if (mainInfo.tags && mainInfo.tags.length > 0) {
      console.log('🏷️  TAGS');
      console.log(`   ${mainInfo.tags.join(', ')}`);
      console.log('');
    }

    // Eligibility & Requirements
    if (additionalInfo.eligibilityCriteria && additionalInfo.eligibilityCriteria.length > 0) {
      console.log('✅ ELIGIBILITY CRITERIA');
      additionalInfo.eligibilityCriteria.forEach((criteria: string, index: number) => {
        if (criteria.trim()) console.log(`   ${index + 1}. ${criteria}`);
      });
      console.log('');
    }

    if (additionalInfo.requirements && additionalInfo.requirements.length > 0) {
      console.log('📋 REQUIREMENTS');
      additionalInfo.requirements.forEach((req: string, index: number) => {
        if (req.trim()) console.log(`   ${index + 1}. ${req}`);
      });
      console.log('');
    }

    // Submission Guidelines
    if (additionalInfo.submissionGuidelines) {
      console.log('📤 SUBMISSION GUIDELINES');
      console.log(`   ${additionalInfo.submissionGuidelines}`);
      console.log('');
    }

    // Custom Distribution Data
    if (metadata.customDistributionData) {
      console.log('⚙️  CUSTOM DISTRIBUTION DATA');
      console.log(`   ${metadata.customDistributionData}`);
      console.log('');
    }

    // Raw Data (for debugging)
    console.log('🔧 RAW DATA (for debugging)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Campaign Data:', JSON.stringify({
      ...campaign,
      id: campaign.id.toString(),
      startTime: campaign.startTime.toString(),
      endTime: campaign.endTime.toString(),
      adminFeePercentage: campaign.adminFeePercentage.toString(),
      maxWinners: campaign.maxWinners.toString(),
      totalFunds: campaign.totalFunds.toString()
    }, null, 2));
    console.log('');
    console.log('Metadata:', JSON.stringify(metadata, null, 2));
    console.log('');
    console.log('Parsed Main Info:', JSON.stringify(mainInfo, null, 2));
    console.log('');
    console.log('Parsed Additional Info:', JSON.stringify(additionalInfo, null, 2));

  } catch (error) {
    console.error('❌ Error fetching campaign details:', error);
    
    // Try to get more specific error information
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

// Get total campaign count
async function getCampaignCount() {
  try {
    const count = await client.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'getCampaignCount'
    }) as bigint;
    
    console.log(`📊 Total Campaigns: ${count.toString()}`);
    return Number(count);
  } catch (error) {
    console.error('❌ Error getting campaign count:', error);
    return 0;
  }
}

// Main execution
async function main() {
  const campaignId = process.argv[2];
  
  if (!campaignId) {
    console.log('Usage: node viewCampaign.js <campaignId>');
    console.log('');
    
    // Show available campaigns
    const totalCampaigns = await getCampaignCount();
    if (totalCampaigns > 0) {
      console.log(`Available campaign IDs: 0 to ${totalCampaigns - 1}`);
    }
    return;
  }

  const id = parseInt(campaignId);
  if (isNaN(id) || id < 0) {
    console.error('❌ Invalid campaign ID. Please provide a valid number.');
    return;
  }

  await getCampaignDetails(id);
}

// Export for use as module
export { getCampaignDetails, getCampaignCount };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}