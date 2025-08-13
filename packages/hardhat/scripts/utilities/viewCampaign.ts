// scripts/viewCampaigns.ts

import { createPublicClient, http, formatEther } from 'viem';
import { celoAlfajores } from 'viem/chains';
import * as dotenv from 'dotenv';
import sovereignSeasV4Abi from '../artifacts/contracts/SovereignSeasV4.sol/SovereignSeasV4.json';

dotenv.config();

const RPC_URL = process.env.CELO_RPC_URL;
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS;

if (!RPC_URL || !SOVEREIGN_SEAS_V4_ADDRESS) {
  throw new Error('Missing required environment variables');
}

function formatCampaignStatus(startTime: bigint, endTime: bigint, isActive: boolean): string {
  const now = Math.floor(Date.now() / 1000);
  const start = Number(startTime);
  const end = Number(endTime);
  
  if (now < start) {
    return '🔜 Upcoming';
  } else if (now >= start && now <= end && isActive) {
    return '🟢 Active';
  } else if (now > end) {
    return '🔴 Ended';
  } else {
    return '⏸️ Paused';
  }
}

function formatDuration(startTime: bigint, endTime: bigint): string {
  const start = new Date(Number(startTime) * 1000);
  const end = new Date(Number(endTime) * 1000);
  const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return `${durationDays} days`;
}

function formatProgressBar(current: bigint, goal: bigint, width: number = 20): string {
  const percentage = goal > 0n ? Number(current * 100n / goal) : 0;
  const filled = Math.floor((percentage / 100) * width);
  const empty = width - filled;
  
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}] ${percentage.toFixed(1)}%`;
}

function formatTimeRemaining(startTime: bigint, endTime: bigint, isActive: boolean): string {
  const now = Math.floor(Date.now() / 1000);
  const start = Number(startTime);
  const end = Number(endTime);
  
  if (now < start) {
    const timeUntilStart = start - now;
    const daysUntilStart = Math.ceil(timeUntilStart / (60 * 60 * 24));
    return `⏰ Starts in: ${daysUntilStart} days`;
  } else if (now >= start && now <= end && isActive) {
    const timeRemaining = end - now;
    const daysRemaining = Math.ceil(timeRemaining / (60 * 60 * 24));
    return `⏰ Time remaining: ${daysRemaining} days`;
  } else {
    return '⏰ Campaign ended';
  }
}

async function viewCampaigns() {
  try {
    console.log('🔍 Fetching campaigns from SovereignSeasV4 contract...\n');
    
    const publicClient = createPublicClient({
      chain: celoAlfajores,
      transport: http(RPC_URL)
    });

    // Get total number of campaigns
    const campaignCount = await publicClient.readContract({
      address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
      abi: sovereignSeasV4Abi.abi,
      functionName: 'getCampaignCount'
    });

    console.log(`📊 Total Campaigns: ${campaignCount}\n`);

    if (Number(campaignCount) === 0) {
      console.log('No campaigns found. Create your first campaign using the createCampaign script!');
      console.log('\nTo create a campaign, run:');
      console.log('npm run create-grants-round    # Creates a grants round');
      console.log('npm run create-hackathon      # Creates a hackathon');
      console.log('npm run create-accelerator    # Creates an accelerator program');
      return;
    }

    // Get details for each campaign  
    for (let i = 0; i < Number(campaignCount); i++) {
      try {
        const campaign = await publicClient.readContract({
          address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
          abi: sovereignSeasV4Abi.abi,
          functionName: 'getCampaign',
          args: [i]
        });

        // Parse campaign data based on the contract's getCampaign function
        const id = campaign[0] as bigint;
        const admin = campaign[1] as string;
        const name = campaign[2] as string;
        const description = campaign[3] as string;
        const startTime = campaign[4] as bigint;
        const endTime = campaign[5] as bigint;
        const adminFeePercentage = campaign[6] as bigint;
        const maxWinners = campaign[7] as bigint;
        const useQuadraticDistribution = campaign[8] as boolean;
        const useCustomDistribution = campaign[9] as boolean;
        const payoutToken = campaign[10] as string;
        const isActive = campaign[11] as boolean;
        const totalFunds = campaign[12] as bigint;

        // Get campaign metadata
        const metadata = await publicClient.readContract({
          address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
          abi: sovereignSeasV4Abi.abi,
          functionName: 'getCampaignMetadata',
          args: [i]
        });

        const mainInfo = metadata[0] as string;
        const additionalInfo = metadata[1] as string;
        const customDistributionData = metadata[2] as string;

        // Parse metadata if available
        let parsedMainInfo: any = {};
        let parsedAdditionalInfo: any = {};
        
        try {
          if (mainInfo) {
            parsedMainInfo = JSON.parse(mainInfo);
          }
        } catch (e) {
          console.warn(`Could not parse main info for campaign ${i}`);
        }

        try {
          if (additionalInfo) {
            parsedAdditionalInfo = JSON.parse(additionalInfo);
          }
        } catch (e) {
          console.warn(`Could not parse additional info for campaign ${i}`);
        }

        const status = formatCampaignStatus(startTime, endTime, isActive);
        const duration = formatDuration(startTime, endTime);
        const timeInfo = formatTimeRemaining(startTime, endTime, isActive);
        
        console.log(`🎯 Campaign #${i}: ${name}`);
        console.log('═'.repeat(60));
        console.log(`📝 Description: ${description}`);
        console.log(`👨‍💼 Creator: ${admin.slice(0, 6)}...${admin.slice(-4)}`);
        console.log(`🏷️  Type: ${parsedMainInfo.type || 'Not specified'}`);
        console.log(`📅 Start: ${new Date(Number(startTime) * 1000).toLocaleString()}`);
        console.log(`📅 End: ${new Date(Number(endTime) * 1000).toLocaleString()}`);
        console.log(`⏱️  Duration: ${duration}`);
        console.log(`📊 Status: ${status}`);
        console.log(`${timeInfo}`);
        console.log(`💰 Total Funds Collected: ${formatEther(totalFunds)} CELO`);
        console.log(`💸 Admin Fee: ${Number(adminFeePercentage)}%`);
        console.log(`🏆 Max Winners: ${Number(maxWinners) === 0 ? 'Unlimited' : Number(maxWinners)}`);
        console.log(`📊 Distribution Type: ${useQuadraticDistribution ? 'Quadratic' : useCustomDistribution ? 'Custom' : 'Linear'}`);
        console.log(`💳 Payout Token: ${payoutToken.slice(0, 6)}...${payoutToken.slice(-4)}`);
        
        // Display reward information from main info
        if (parsedMainInfo.rewards) {
          console.log(`🏆 Total Prize Pool: ${parsedMainInfo.rewards.totalPrizePool} CELO`);
          if (parsedMainInfo.rewards.distribution && parsedMainInfo.rewards.distribution.length > 0) {
            console.log(`🎁 Prize Distribution:`);
            parsedMainInfo.rewards.distribution.forEach((prize: string, idx: number) => {
              console.log(`   ${idx + 1}. ${prize}`);
            });
          }
        }
        
        // Display eligibility criteria
        if (parsedMainInfo.eligibilityCriteria && parsedMainInfo.eligibilityCriteria.length > 0) {
          console.log(`✅ Eligibility Criteria:`);
          parsedMainInfo.eligibilityCriteria.forEach((criteria: string) => {
            console.log(`   • ${criteria}`);
          });
        }
        
        // Display requirements
        if (parsedMainInfo.requirements && parsedMainInfo.requirements.length > 0) {
          console.log(`📋 Requirements:`);
          parsedMainInfo.requirements.forEach((requirement: string) => {
            console.log(`   • ${requirement}`);
          });
        }
        
        // Display judging criteria
        if (parsedMainInfo.judgesCriteria && parsedMainInfo.judgesCriteria.length > 0) {
          console.log(`⚖️  Judging Criteria:`);
          parsedMainInfo.judgesCriteria.forEach((criteria: string) => {
            console.log(`   • ${criteria}`);
          });
        }
        
        // Display additional info and links
        if (parsedAdditionalInfo.additionalInfo) {
          const info = parsedAdditionalInfo.additionalInfo;
          console.log(`🔗 Links & Contact:`);
          if (info.websiteUrl) console.log(`   🌐 Website: ${info.websiteUrl}`);
          if (info.discordUrl) console.log(`   💬 Discord: ${info.discordUrl}`);
          if (info.twitterUrl) console.log(`   🐦 Twitter: ${info.twitterUrl}`);
          if (info.contactEmail) console.log(`   📧 Contact: ${info.contactEmail}`);
          if (info.submissionGuidelines) {
            console.log(`   📝 Submission Guidelines: ${info.submissionGuidelines}`);
          }
        }
        
        // Display participant limits
        if (parsedMainInfo.maxParticipants && parsedMainInfo.maxParticipants > 0) {
          console.log(`🎯 Max Participants: ${parsedMainInfo.maxParticipants}`);
        }

        // Display creation info
        if (parsedAdditionalInfo.timestamp) {
          console.log(`🕐 Created: ${new Date(parsedAdditionalInfo.timestamp).toLocaleString()}`);
        }

        // Display funding goal if available
        if (parsedAdditionalInfo.fundingGoal) {
          const fundingGoal = parseFloat(parsedAdditionalInfo.fundingGoal);
          const currentFunding = parseFloat(formatEther(totalFunds));
          const progress = totalFunds > 0n ? formatProgressBar(totalFunds, BigInt(Math.floor(fundingGoal * 1e18))) : '[░░░░░░░░░░░░░░░░░░░░] 0.0%';
          console.log(`🎯 Funding Goal: ${parsedAdditionalInfo.fundingGoal} CELO`);
          console.log(`📈 Funding Progress: ${progress}`);
        }

        // Display custom distribution info if applicable
        if (useCustomDistribution && customDistributionData) {
          try {
            const customData = JSON.parse(customDistributionData);
            console.log(`🔧 Custom Distribution: ${customData.note || 'Custom logic implemented'}`);
          } catch (e) {
            console.log(`🔧 Custom Distribution: Enabled`);
          }
        }
        
        console.log('\n');
        
      } catch (error) {
        console.error(`Error fetching campaign ${i}:`, error);
        console.log('\n');
      }
    }
    
    // Summary statistics
    console.log('📈 Campaign Summary');
    console.log('═'.repeat(40));
    
    let activeCampaigns = 0;
    let upcomingCampaigns = 0;
    let endedCampaigns = 0;
    let totalFunding = 0n;
    let totalGoals = 0n;
    
    for (let i = 0; i < Number(campaignCount); i++) {
      try {
        const campaign = await publicClient.readContract({
          address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
          abi: sovereignSeasV4Abi.abi,
          functionName: 'getCampaign',
          args: [i]
        });
        
        const startTime = Number(campaign[4]);
        const endTime = Number(campaign[5]);
        const isActive = campaign[11] as boolean;
        const currentFunding = campaign[12] as bigint;
        
        const now = Math.floor(Date.now() / 1000);
        
        if (now < startTime) {
          upcomingCampaigns++;
        } else if (now >= startTime && now <= endTime && isActive) {
          activeCampaigns++;
        } else {
          endedCampaigns++;
        }
        
        totalFunding += currentFunding;
        
        // Try to get funding goal from metadata
        try {
          const metadata = await publicClient.readContract({
            address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
            abi: sovereignSeasV4Abi.abi,
            functionName: 'getCampaignMetadata',
            args: [i]
          });
          
          const additionalInfo = metadata[1] as string;
          if (additionalInfo) {
            const parsedInfo = JSON.parse(additionalInfo);
            if (parsedInfo.fundingGoal) {
              totalGoals += BigInt(Math.floor(parseFloat(parsedInfo.fundingGoal) * 1e18));
            }
          }
        } catch (e) {
          // Ignore metadata parsing errors for summary
        }
        
      } catch (error) {
        console.warn(`Could not process campaign ${i} for summary`);
      }
    }
    
    console.log(`🟢 Active: ${activeCampaigns}`);
    console.log(`🔜 Upcoming: ${upcomingCampaigns}`);
    console.log(`🔴 Ended: ${endedCampaigns}`);
    console.log(`💰 Total Funding Raised: ${formatEther(totalFunding)} CELO`);
    
    if (totalGoals > 0n) {
      console.log(`🎯 Total Funding Goals: ${formatEther(totalGoals)} CELO`);
      const overallProgress = Number(totalFunding * 100n / totalGoals);
      console.log(`📊 Overall Funding Progress: ${overallProgress.toFixed(1)}%`);
      console.log(`📊 Progress Bar: ${formatProgressBar(totalFunding, totalGoals, 30)}`);
    }

  } catch (error) {
    console.error('Error viewing campaigns:', error);
  }
}

async function viewCampaignById(campaignId: number) {
  try {
    console.log(`🔍 Fetching campaign #${campaignId}...\n`);
    
    const publicClient = createPublicClient({
      chain: celoAlfajores,
      transport: http(RPC_URL)
    });

    // Check if campaign exists
    const campaignCount = await publicClient.readContract({
      address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
      abi: sovereignSeasV4Abi.abi,
      functionName: 'getCampaignCount'
    });

    if (campaignId >= Number(campaignCount)) {
      console.log(`Campaign #${campaignId} does not exist. Total campaigns: ${campaignCount}`);
      return;
    }

    const campaign = await publicClient.readContract({
      address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
      abi: sovereignSeasV4Abi.abi,
      functionName: 'getCampaign',
      args: [campaignId]
    });

    // Parse campaign data
    const id = campaign[0] as bigint;
    const admin = campaign[1] as string;
    const name = campaign[2] as string;
    const description = campaign[3] as string;
    const startTime = campaign[4] as bigint;
    const endTime = campaign[5] as bigint;
    const adminFeePercentage = campaign[6] as bigint;
    const maxWinners = campaign[7] as bigint;
    const useQuadraticDistribution = campaign[8] as boolean;
    const useCustomDistribution = campaign[9] as boolean;
    const payoutToken = campaign[10] as string;
    const isActive = campaign[11] as boolean;
    const totalFunds = campaign[12] as bigint;

    // Get metadata
    const metadata = await publicClient.readContract({
      address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
      abi: sovereignSeasV4Abi.abi,
      functionName: 'getCampaignMetadata',
      args: [campaignId]
    });

    const mainInfo = metadata[0] as string;
    const additionalInfo = metadata[1] as string;
    const customDistributionData = metadata[2] as string;

    // Display detailed campaign information
    console.log(`🎯 Campaign #${campaignId}: ${name}`);
    console.log('═'.repeat(60));
    console.log(`📝 Description: ${description}`);
    console.log(`👨‍💼 Admin: ${admin}`);
    console.log(`📅 Period: ${new Date(Number(startTime) * 1000).toLocaleString()} - ${new Date(Number(endTime) * 1000).toLocaleString()}`);
    console.log(`📊 Status: ${formatCampaignStatus(startTime, endTime, isActive)}`);
    console.log(`${formatTimeRemaining(startTime, endTime, isActive)}`);
    console.log(`💰 Total Funds: ${formatEther(totalFunds)} CELO`);
    console.log(`💸 Admin Fee: ${Number(adminFeePercentage)}%`);
    console.log(`🏆 Max Winners: ${Number(maxWinners) === 0 ? 'Unlimited' : Number(maxWinners)}`);
    console.log(`📊 Distribution: ${useQuadraticDistribution ? 'Quadratic' : useCustomDistribution ? 'Custom' : 'Linear'}`);
    console.log(`💳 Payout Token: ${payoutToken}`);

    // Parse and display metadata
    try {
      if (mainInfo) {
        const parsedMainInfo = JSON.parse(mainInfo);
        console.log(`\n📋 Campaign Details:`);
        if (parsedMainInfo.type) console.log(`🏷️  Type: ${parsedMainInfo.type}`);
        if (parsedMainInfo.maxParticipants) console.log(`👥 Max Participants: ${parsedMainInfo.maxParticipants}`);
        
        if (parsedMainInfo.rewards) {
          console.log(`\n🏆 Rewards:`);
          console.log(`   Total Pool: ${parsedMainInfo.rewards.totalPrizePool} CELO`);
          if (parsedMainInfo.rewards.distribution) {
            console.log(`   Distribution:`);
            parsedMainInfo.rewards.distribution.forEach((prize: string, idx: number) => {
              console.log(`     ${idx + 1}. ${prize}`);
            });
          }
        }

        if (parsedMainInfo.eligibilityCriteria && parsedMainInfo.eligibilityCriteria.length > 0) {
          console.log(`\n✅ Eligibility:`);
          parsedMainInfo.eligibilityCriteria.forEach((criteria: string) => {
            console.log(`   • ${criteria}`);
          });
        }

        if (parsedMainInfo.requirements && parsedMainInfo.requirements.length > 0) {
          console.log(`\n📋 Requirements:`);
          parsedMainInfo.requirements.forEach((req: string) => {
            console.log(`   • ${req}`);
          });
        }

        if (parsedMainInfo.judgesCriteria && parsedMainInfo.judgesCriteria.length > 0) {
          console.log(`\n⚖️  Judging Criteria:`);
          parsedMainInfo.judgesCriteria.forEach((criteria: string) => {
            console.log(`   • ${criteria}`);
          });
        }
      }
    } catch (e) {
      console.warn('Could not parse main campaign info');
    }

    try {
      if (additionalInfo) {
        const parsedAdditionalInfo = JSON.parse(additionalInfo);
        if (parsedAdditionalInfo.additionalInfo) {
          const info = parsedAdditionalInfo.additionalInfo;
          console.log(`\n🔗 Links & Contact:`);
          if (info.websiteUrl) console.log(`   🌐 Website: ${info.websiteUrl}`);
          if (info.discordUrl) console.log(`   💬 Discord: ${info.discordUrl}`);
          if (info.twitterUrl) console.log(`   🐦 Twitter: ${info.twitterUrl}`);
          if (info.contactEmail) console.log(`   📧 Email: ${info.contactEmail}`);
          if (info.submissionGuidelines) {
            console.log(`   📝 Guidelines: ${info.submissionGuidelines}`);
          }
        }
        if (parsedAdditionalInfo.timestamp) {
          console.log(`\n🕐 Created: ${new Date(parsedAdditionalInfo.timestamp).toLocaleString()}`);
        }
        if (parsedAdditionalInfo.fundingGoal) {
          const fundingGoal = parseFloat(parsedAdditionalInfo.fundingGoal);
          const progress = totalFunds > 0n ? formatProgressBar(totalFunds, BigInt(Math.floor(fundingGoal * 1e18))) : '[░░░░░░░░░░░░░░░░░░░░] 0.0%';
          console.log(`\n🎯 Funding Goal: ${parsedAdditionalInfo.fundingGoal} CELO`);
          console.log(`📈 Progress: ${progress}`);
        }
      }
    } catch (e) {
      console.warn('Could not parse additional campaign info');
    }

    if (useCustomDistribution && customDistributionData) {
      console.log(`\n🔧 Custom Distribution:`);
      try {
        const customData = JSON.parse(customDistributionData);
        console.log(`   ${JSON.stringify(customData, null, 2)}`);
      } catch (e) {
        console.log(`   ${customDistributionData}`);
      }
    }
    
  } catch (error) {
    console.error(`Error viewing campaign ${campaignId}:`, error);
    if (error.message?.includes('revert')) {
      console.log(`Campaign #${campaignId} does not exist.`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length > 0 && args[0] === '--id') {
    const campaignId = parseInt(args[1]);
    if (isNaN(campaignId) || campaignId < 0) {
      console.error('Please provide a valid campaign ID (0 or greater)');
      console.log('\nUsage: npm run view-campaign -- --id 0');
      process.exit(1);
    }
    await viewCampaignById(campaignId);
  } else {
    await viewCampaigns();
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });