import { Address } from 'viem';

import { useReadContracts } from 'wagmi';

export function useProjectVoteDetails(contractAddress: Address, campaignId: bigint, projectId: bigint) {
  const { data, isLoading, error } = useReadContracts({
    contracts: [
      {
        address: contractAddress,
        abi: [{
          inputs: [
            { name: 'campaignId', type: 'uint256' },
            { name: 'projectId', type: 'uint256' }
          ],
          name: 'getParticipation',
          outputs: [
            { name: 'approved', type: 'bool' },
            { name: 'voteCount', type: 'uint256' },
            { name: 'fundsReceived', type: 'uint256' }
          ],
          stateMutability: 'view',
          type: 'function'
        }],
        functionName: 'getParticipation',
        args: [campaignId, projectId]
      },
      {
        address: contractAddress,
        abi: [{
          inputs: [
            { name: 'campaignId', type: 'uint256' },
            { name: 'projectId', type: 'uint256' }
          ],
          name: 'getProjectVotedTokensWithAmounts',
          outputs: [
            { name: 'tokens', type: 'address[]' },
            { name: 'amounts', type: 'uint256[]' }
          ],
          stateMutability: 'view',
          type: 'function'
        }],
        functionName: 'getProjectVotedTokensWithAmounts',
        args: [campaignId, projectId]
      }
    ],
    query: {
      enabled: !!contractAddress && !!campaignId && !!projectId
    }
  });

  const [participationData, voteData] = data || [];

  return {
    voteDetails: data ? {
      approved: participationData?.result?.[0] as boolean,
      voteCount: participationData?.result?.[1] as bigint,
      fundsReceived: participationData?.result?.[2] as bigint,
      tokenVotes: (voteData?.result?.[0] as string[] || []).map((token, i) => ({
        token,
        amount: (voteData?.result?.[1] as bigint[] || [])[i]
      }))
    } : null,
    isLoading,
    error
  };
} 