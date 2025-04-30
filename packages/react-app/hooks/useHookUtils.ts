import { usePublicClient } from 'wagmi';

export const useHookUtils = () => {
  const publicClient = usePublicClient();

  return {
    sovereignSeas: {
      publicClient,
      isWritePending: false,
      isWaitingForTx: false,
      vote: async () => {},
    },
    stableCoinVote: {
      isWritePending: false,
      isWaitingForTx: false,
      voteWithStableCoin: async () => {},
    },
    isInitialized: true,
    enhancedTokens: [],
  };
}; 