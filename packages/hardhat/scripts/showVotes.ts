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

function formatProgressBar(current: bigint, goal: bigint, width: number = 20): string {
  const percentage = goal > 0n ? Number(current * 100n / goal) : 0;
  const filled = Math.floor((percentage / 100) * width);
  const empty = width - filled;
  
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}] ${percentage.toFixed(1)}%`;
}

async function main() {
  try {
    console.log('🔍 Fetching votes for Project #0 in Campaign #0...\n');
    
    const publicClient = createPublicClient({
      chain: celoAlfajores,
      transport: http(RPC_URL)
    });

    // Get project details
    const projectData = await publicClient.readContract({
      address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
      abi: sovereignSeasV4Abi.abi,
      functionName: 'getProject',
      args: [0n]
    }) as [bigint, string, string, string, boolean, boolean, bigint, bigint[]];

    const [id, owner, name, description, transferrable, active, createdAt, campaignIds] = projectData;

    console.log('📋 Project Details');
    console.log('═'.repeat(40));
    console.log(`🆔 ID: ${id}`);
    console.log(`👤 Owner: ${owner.slice(0, 6)}...${owner.slice(-4)}`);
    console.log(`📝 Name: ${name}`);
    console.log(`📄 Description: ${description}`);
    console.log(`✨ Status: ${active ? '🟢 Active' : '🔴 Inactive'}`);
    console.log(`🕐 Created: ${new Date(Number(createdAt) * 1000).toLocaleString()}`);

    // Get campaign details
    const campaignData = await publicClient.readContract({
      address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
      abi: sovereignSeasV4Abi.abi,
      functionName: 'getCampaign',
      args: [0n]
    }) as [bigint, string, string, string, bigint, bigint, bigint, bigint, boolean, boolean, string, boolean, bigint];

    const [campaignId, admin, campaignName, campaignDesc, startTime, endTime, adminFeePercentage, maxWinners, useQuadraticDistribution, useCustomDistribution, payoutToken, campaignActive, totalFunds] = campaignData;

    console.log('\n🎯 Campaign Details');
    console.log('═'.repeat(40));
    console.log(`🆔 ID: ${campaignId}`);
    console.log(`📝 Name: ${campaignName}`);
    console.log(`📄 Description: ${campaignDesc}`);
    console.log(`👤 Admin: ${admin.slice(0, 6)}...${admin.slice(-4)}`);
    console.log(`✨ Status: ${campaignActive ? '🟢 Active' : '🔴 Inactive'}`);
    console.log(`💰 Total Funds: ${formatEther(totalFunds)} CELO equivalent`);
    console.log(`💸 Admin Fee: ${Number(adminFeePercentage)}%`);
    console.log(`🏆 Max Winners: ${Number(maxWinners) === 0 ? 'Unlimited' : Number(maxWinners)}`);
    console.log(`📊 Distribution: ${useQuadraticDistribution ? 'Quadratic' : useCustomDistribution ? 'Custom' : 'Linear'}`);
    console.log(`💳 Payout Token: ${payoutToken.slice(0, 6)}...${payoutToken.slice(-4)}`);

    // Get participation details
    const participationData = await publicClient.readContract({
      address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
      abi: sovereignSeasV4Abi.abi,
      functionName: 'getParticipation',
      args: [0n, 0n]
    }) as [boolean, bigint, bigint];

    const [approved, voteCount, fundsReceived] = participationData;

    console.log('\n📊 Participation Details');
    console.log('═'.repeat(40));
    console.log(`✅ Approval Status: ${approved ? 'Approved' : 'Pending'}`);
    console.log(`🗳️ Total Vote Count: ${formatEther(voteCount)} CELO equivalent`);
    console.log(`💰 Funds Received: ${formatEther(fundsReceived)} CELO equivalent`);

    // Get voted tokens and their amounts
    const voteData = await publicClient.readContract({
      address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
      abi: sovereignSeasV4Abi.abi,
      functionName: 'getProjectVotedTokensWithAmounts',
      args: [0n, 0n]
    }) as [string[], bigint[]];

    const [tokens, amounts] = voteData;

    console.log('\n💎 Votes by Token');
    console.log('═'.repeat(40));
    if (tokens.length === 0) {
      console.log('No votes recorded yet');
    } else {
      for (let i = 0; i < tokens.length; i++) {
        console.log(`Token ${tokens[i].slice(0, 6)}...${tokens[i].slice(-4)}: ${formatEther(amounts[i])} tokens`);
      }
    }

    // Get campaign metadata for funding goal if available
    try {
      const metadata = await publicClient.readContract({
        address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
        abi: sovereignSeasV4Abi.abi,
        functionName: 'getCampaignMetadata',
        args: [0n]
      }) as [string, string, string];

      const [_, additionalInfo] = metadata;
      if (additionalInfo) {
        const parsedInfo = JSON.parse(additionalInfo) as { fundingGoal?: string };
        if (parsedInfo.fundingGoal) {
          const fundingGoal = parseFloat(parsedInfo.fundingGoal);
          console.log('\n🎯 Funding Progress');
          console.log('═'.repeat(40));
          console.log(`Goal: ${parsedInfo.fundingGoal} CELO`);
          const progress = totalFunds > 0n ? formatProgressBar(totalFunds, BigInt(Math.floor(fundingGoal * 1e18))) : '[░░░░░░░░░░░░░░░░░░░░] 0.0%';
          console.log(`Progress: ${progress}`);
        }
      }
    } catch (e) {
      // Ignore metadata parsing errors
    }

  } catch (error) {
    console.error('Error fetching votes:', error);
    if (error instanceof Error && error.message?.includes('revert')) {
      console.log('Project or campaign does not exist.');
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 