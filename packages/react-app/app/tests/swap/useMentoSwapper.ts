'use client';
import { useState, useEffect } from 'react';
import { 
  usePublicClient, 
  useWalletClient, 
  useAccount, 
  useReadContract, 
  useWriteContract, 
  useWaitForTransactionReceipt 
} from 'wagmi';
import { parseEther, formatEther, getContract } from 'viem';

// Import ABIs
import mentoSwapperAbi from '@/abis/testswap.json';
import erc20Abi from '@/abis/MockCELO.json';

// Contract addresses - these should be in your .env file
const SWAPPER_ADDRESS = process.env.NEXT_PUBLIC_MENTO_SWAPPER_ADDRESS as `0x${string}`;
const CUSD_ADDRESS = process.env.NEXT_PUBLIC_CUSD_ADDRESS as `0x${string}`;
// Default to mainnet cUSD if not specified
  

// Slippage tolerance for swaps (5%)
const SLIPPAGE_TOLERANCE = 0.05;

interface MentoSwapperConfig {
  swapperAddress?: `0x${string}`;
  cusdAddress?: `0x${string}`;
  chainId?: number;
}

export const useMentoSwapper = (config?: MentoSwapperConfig) => {
  const { address: walletAddress } = useAccount();
  const publicClient = usePublicClient({
    chainId: config?.chainId,
  });
  const { data: walletClient } = useWalletClient({
    chainId: config?.chainId,
  });
  
  const actualSwapperAddress = config?.swapperAddress || SWAPPER_ADDRESS;
  const actualCusdAddress = config?.cusdAddress || CUSD_ADDRESS;
  
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Contract instances
  const [swapperContract, setSwapperContract] = useState<any>(null);
  const [cusdContract, setCusdContract] = useState<any>(null);
  
  // State
  const [cusdBalance, setCusdBalance] = useState<bigint>(BigInt(0));
  const [celoBalance, setCeloBalance] = useState<bigint>(BigInt(0));
  const [contractCeloBalance, setContractCeloBalance] = useState<bigint>(BigInt(0));
  const [cusdAllowance, setCusdAllowance] = useState<bigint>(BigInt(0));
  const [estimatedCelo, setEstimatedCelo] = useState<bigint>(BigInt(0));
  const [loadingBalances, setLoadingBalances] = useState(false);
  
  // Write state
  const { 
    data: writeData, 
    writeContract, 
    isPending: isWritePending, 
    isSuccess: isWriteSuccess, 
    error: writeError,
    reset: resetWrite 
  } = useWriteContract();

  // Transaction receipt
  const { 
    data: txReceipt, 
    isLoading: isWaitingForTx, 
    isSuccess: isTxSuccess 
  } = useWaitForTransactionReceipt({
    hash: writeData,
  });

  // Initialize contract instances
  useEffect(() => {
    if (!publicClient || !actualSwapperAddress || !actualCusdAddress) return;
    
    try {
      const mentoSwapperContract = getContract({
        address: actualSwapperAddress,
        abi: mentoSwapperAbi,
        client: publicClient,
      });
      
      const cusdTokenContract = getContract({
        address: actualCusdAddress,
        abi: erc20Abi,
        client: publicClient,
      });
      
      setSwapperContract(mentoSwapperContract);
      setCusdContract(cusdTokenContract);
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing contracts:', error);
    }
  }, [publicClient, actualSwapperAddress, actualCusdAddress]);

  // Load balances and allowance
  const loadBalances = async () => {
    if (!isInitialized || !publicClient || !walletAddress) return;
    
    try {
      setLoadingBalances(true);
      
      // Get cUSD balance
      const cusdBalanceResult = await publicClient.readContract({
        address: actualCusdAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [walletAddress],
      }) as bigint;
      setCusdBalance(cusdBalanceResult);
      
      // Get CELO balance
      const celoBalanceResult = await publicClient.getBalance({
        address: walletAddress,
      });
      setCeloBalance(celoBalanceResult);
      
      // Get contract CELO balance
      const contractCeloBalanceResult = await publicClient.readContract({
        address: actualSwapperAddress,
        abi: mentoSwapperAbi,
        functionName: 'getContractCeloBalance',
      }) as bigint;
      setContractCeloBalance(contractCeloBalanceResult);
      
      // Get cUSD allowance
      const allowanceResult = await publicClient.readContract({
        address: actualCusdAddress,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [walletAddress, actualSwapperAddress],
      }) as bigint;
      setCusdAllowance(allowanceResult);
      
    } catch (error) {
      console.error('Error loading balances:', error);
    } finally {
      setLoadingBalances(false);
    }
  };

  // Estimate CELO amount from swap
  const estimateCeloAmount = async (cusdAmount: string) => {
    if (!isInitialized || !publicClient || !cusdAmount) {
      setEstimatedCelo(BigInt(0));
      return BigInt(0);
    }
    
    try {
      const amountInWei = parseEther(cusdAmount);
      
      const estimatedCeloResult = await publicClient.readContract({
        address: actualSwapperAddress,
        abi: mentoSwapperAbi,
        functionName: 'estimateCeloAmount',
        args: [amountInWei],
      }) as bigint;
      
      setEstimatedCelo(estimatedCeloResult);
      return estimatedCeloResult;
    } catch (error) {
      console.error('Error estimating CELO amount:', error);
      setEstimatedCelo(BigInt(0));
      return BigInt(0);
    }
  };

  // Approve cUSD spending
  const approveCusd = async (amount: string) => {
    if (!walletClient || !walletAddress) return;
    
    try {
      const amountInWei = parseEther(amount);
      
      writeContract({
        address: actualCusdAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [actualSwapperAddress, amountInWei],
      });
      
      // The allowance will be updated in the transaction receipt callback
    } catch (error) {
      console.error('Error approving cUSD:', error);
    }
  };

  // Swap cUSD to CELO
  const swapCusdToCelo = async (amount: string) => {
    if (!walletClient || !walletAddress) return;
    
    try {
      const amountInWei = parseEther(amount);
      
      // Calculate min CELO amount with slippage protection
      const estimate = await estimateCeloAmount(amount);
      const minCeloAmount = BigInt(Math.floor(Number(estimate) * (1 - SLIPPAGE_TOLERANCE)));
      
      writeContract({
        address: actualSwapperAddress,
        abi: mentoSwapperAbi,
        functionName: 'swapCUSDtoCELO',
        args: [amountInWei, minCeloAmount],
      });
      
      // Balances will be updated in the transaction receipt callback
    } catch (error) {
      console.error('Error swapping cUSD to CELO:', error);
    }
  };

  // Check if approval is needed for a certain amount
  const needsApproval = (amount: string) => {
    if (!amount) return false;
    
    try {
      const amountInWei = parseEther(amount);
      return cusdAllowance < amountInWei;
    } catch (error) {
      console.error('Error checking if approval is needed:', error);
      return true; // Assume approval is needed on error
    }
  };

  // Format token amounts
  const formatTokenAmount = (amount: bigint) => {
    return formatEther(amount);
  };

  // Update balances and allowances after transactions
  useEffect(() => {
    if (isTxSuccess) {
      loadBalances();
    }
  }, [isTxSuccess]);

  // Initial load
  useEffect(() => {
    if (isInitialized && walletAddress) {
      loadBalances();
    }
  }, [isInitialized, walletAddress]);

  return {
    // Config
    swapperAddress: actualSwapperAddress,
    cusdAddress: actualCusdAddress,
    
    // Clients
    publicClient,
    walletClient,
    
    // Contract state
    isInitialized,
    
    // Balances and allowances
    cusdBalance,
    celoBalance,
    contractCeloBalance,
    cusdAllowance,
    estimatedCelo,
    loadingBalances,
    
    // Transaction state
    isWritePending,
    isWriteSuccess,
    isWaitingForTx,
    isTxSuccess,
    writeError,
    resetWrite,
    txReceipt,
    
    // Read functions
    loadBalances,
    estimateCeloAmount,
    needsApproval,
    
    // Write functions
    approveCusd,
    swapCusdToCelo,
    
    // Helper functions
    formatTokenAmount,
  };
};