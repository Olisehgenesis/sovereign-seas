import { createPublicClient, http } from 'viem';
import type { Address } from 'viem';
import { celoAlfajores } from 'viem/chains';
import { formatEther } from 'viem';
import { contractABI } from '@/abi/seas4ABI';

const publicClient = createPublicClient({
  chain: celoAlfajores,
  transport: http()
});

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_V4 ?? ZERO_ADDRESS) as Address;

export const getProjectVotesByCampaignId = async (campaignId: bigint, projectId: bigint) => {
  try {
    
    // Get participation details
    const participationData = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: 'getParticipation',
      args: [campaignId, projectId]
    }) as [boolean, bigint, bigint];

    const [approved, voteCount, fundsReceived] = participationData;

    console.log('\n📊 Participation Details');
    console.log('═'.repeat(40));
    console.log(`✅ Approval Status: ${approved ? 'Approved' : 'Pending'}`);
    console.log(`🗳️ Total Vote Count: ${formatEther(voteCount)} CELO equivalent`);
    console.log(`💰 Funds Received: ${formatEther(fundsReceived)} CELO equivalent`);

    // Get voted tokens and their amounts
    const voteData = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: 'getProjectVotedTokensWithAmounts',
      args: [campaignId, projectId]
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

    // Return the formatted vote count
    return formatEther(voteCount);

  } catch (error) {
    console.error('Error fetching votes:', error);
    if (error instanceof Error && error.message?.includes('revert')) {
      console.log('⚠️ Project or campaign does not exist.');
    }
    return '0.0';
  }
};
