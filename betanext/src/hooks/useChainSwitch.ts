import { useSwitchChain, useAccount, useChainId } from 'wagmi';
import { celo, celoAlfajores } from 'wagmi/chains';
import { celoSepolia } from '@/utils/celoSepolia';
import { getCurrentChainId, isTestnetEnvironment } from '@/utils/contractConfig';

/**
 * Hook for handling chain switching with proper testnet support
 */
export function useChainSwitch() {
  const { switchChain, isPending: isSwitching, error: switchError } = useSwitchChain();
  const { isConnected } = useAccount();
  const currentChainId = useChainId();
  
  const isTestnet = isTestnetEnvironment();
  const targetChainId = getCurrentChainId();
  
  // Determine target chain based on environment
  const getTargetChain = () => {
    if (targetChainId === celoSepolia.id) {
      return celoSepolia;
    }
    return isTestnet ? celoAlfajores : celo;
  };
  
  const targetChain = getTargetChain();
  
  /**
   * Check if the wallet is on the correct chain
   */
  const isOnCorrectChain = currentChainId === targetChainId;
  
  /**
   * Switch to the correct chain based on environment
   */
  const switchToCorrectChain = async () => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }
    
    if (isOnCorrectChain) {
      console.log(`Already on correct chain: ${targetChain.name} (${targetChainId})`);
      return;
    }
    
    console.log(`Switching from chain ${currentChainId} to ${targetChain.name} (${targetChainId})`);
    
    try {
      await switchChain({ chainId: targetChainId });
      console.log(`Successfully switched to ${targetChain.name}`);
    } catch (error) {
      console.error('Failed to switch chain:', error);
      throw error;
    }
  };
  
  /**
   * Ensure the wallet is on the correct chain before making a transaction
   */
  const ensureCorrectChain = async () => {
    if (!isOnCorrectChain) {
      await switchToCorrectChain();
    }
  };
  
  return {
    isOnCorrectChain,
    isSwitching,
    switchError,
    targetChain,
    targetChainId,
    currentChainId,
    switchToCorrectChain,
    ensureCorrectChain
  };
}
