import { useConnectOrCreateWallet, useWallets } from "@privy-io/react-auth";

// Get the correct chain ID based on testnet configuration
const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
const CELO_CHAIN_ID = isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet

// Create a custom hook that returns the switchNetwork function
export const useWallet = () => {
  const { wallets, ready } = useWallets();
  const { connectOrCreateWallet } = useConnectOrCreateWallet({
    onSuccess: async ({ wallet }) => {
      console.log('[useWallet] connectOrCreateWallet success. Wallet:', wallet?.address);
    },
    onError: async (error) => {
      console.error('[useWallet] connectOrCreateWallet error:', error);
    }
  });

  const handleSwitchToNetwork = async () => {
    if (!ready) return; // wait until connected wallets are resolved

    if (wallets && wallets.length > 0) {
      const wallet = wallets[0];
      try {
        await wallet.switchChain(CELO_CHAIN_ID);
      } catch (error) {
        console.error("Error switching chain:", error);
      }
    } else {
      // If no wallets are available, trigger Privy's connect-or-create flow
      connectOrCreateWallet();
    }
  };

  const selectConnectedWallet = (desiredAddress?: string) => {
    if (!ready || !wallets || wallets.length === 0) return undefined;
    if (!desiredAddress) return wallets[0];
    const lower = desiredAddress.toLowerCase();
    return wallets.find(w => w.address.toLowerCase() === lower) || wallets[0];
  };

  return { handleSwitchToNetwork, selectConnectedWallet, ready };
};

// For direct reference in the Header component
export const handleSwitchToNetwork = () => {
  // This will be a placeholder function that gets replaced
  console.error("This function needs to be called from within a component using the useWallet hook");
  
  // If used outside a component, try to show a helpful message
  if (typeof window !== 'undefined') {
    alert("Please connect a wallet first before switching networks");
  }
};