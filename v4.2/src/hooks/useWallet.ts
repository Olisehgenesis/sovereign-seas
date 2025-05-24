import { useLogin, useWallets } from "@privy-io/react-auth";

const CELO_CHAIN_ID = parseInt(import.meta.env.VITE_CHAIN_ID as string);

// Create a custom hook that returns the switchNetwork function
export const useWallet = () => {
  const { wallets } = useWallets();
  const { login } = useLogin(); // Call the hook at the top level of our custom hook
  
  const handleSwitchToNetwork = async () => {
    console.log("wallets", wallets)
    if (wallets && wallets.length > 0) {
      const wallet = wallets[0]; // Or use a more sophisticated selection method
      try {
        await wallet.switchChain(CELO_CHAIN_ID);
      } catch (error) {
        console.error("Error switching chain:", error);
      }
    } else {
      // If no wallets are available, trigger the login flow
      console.log("opening privig ")
      login({
        loginMethods: ['email', 'wallet', 'google'],
        walletChainType: 'ethereum-only'
      });
    }
  };
  
  return { handleSwitchToNetwork };
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