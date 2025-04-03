'use client';
import { useState, useEffect } from 'react';
import { 
  usePublicClient, 
  useWalletClient, 
  useAccount, 
  useWriteContract, 
  useWaitForTransactionReceipt 
} from 'wagmi';
import { parseEther, formatEther, getContract } from 'viem';

// Import ABIs
import sovSeasAdminAbi from '../abis/SovSeasAdmin.json';

// Get chain ID and contract address from .env
const chainId = process.env.NEXT_PUBLIC_CHAIN_ID ? Number(process.env.NEXT_PUBLIC_CHAIN_ID) : undefined;
const adminContractAddress = process.env.NEXT_PUBLIC_ADMIN_CONTRACT_ADDRESS as `0x${string}`;

// Export contract address for use in other components
export const SOVSEAS_ADMIN_ADDRESS = adminContractAddress;

interface SovSeasAdminConfig {
  contractAddress?: `0x${string}`;
  chainId?: number;
  publicClient?: any;
  walletClient?: any;
}

export const useSovSeasAdmin = (config?: SovSeasAdminConfig) => {
  const { address: walletAddress } = useAccount();
  const defaultPublicClient = usePublicClient({
    chainId: config?.chainId || chainId,
  });
  const { data: defaultWalletClient } = useWalletClient({
    chainId: config?.chainId || chainId,
  });
  
  // Use provided clients or fall back to defaults
  const publicClient = config?.publicClient || defaultPublicClient;
  const walletClient = config?.walletClient || defaultWalletClient;
  
  const actualContractAddress = config?.contractAddress || adminContractAddress;
  
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Contract instance
  const [contract, setContract] = useState<any>(null);
  
  // State
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [creationFees, setCreationFees] = useState<bigint>(BigInt(0));
  const [loadingFees, setLoadingFees] = useState(false);
  
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

  // Initialize contract instance
  useEffect(() => {
    if (!publicClient || !actualContractAddress) return;
    
    const sovSeasAdminContract = getContract({
      address: actualContractAddress,
      abi: sovSeasAdminAbi,
      client: publicClient,
    });
    
    setContract(sovSeasAdminContract);
    setIsInitialized(true);
  }, [publicClient, actualContractAddress]);

  // Check if current user is super admin
  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!isInitialized || !publicClient || !walletAddress) {
        setIsSuperAdmin(false);
        return;
      }
    
      try {
        // Check if the walletAddress is a super admin
        const isSuperAdmin = await publicClient.readContract({
          address: actualContractAddress,
          abi: sovSeasAdminAbi,
          functionName: 'isSuperAdmin',
          args: [walletAddress],
        }) as boolean;
    
        // Get contract deployer address from environment variable
        const contractDeployer = process.env.NEXT_PUBLIC_CONTRACT_DEPLOYER as string;
        
        // Ensure both addresses are normalized to lowercase for comparison
        const normalizedDeployer = contractDeployer ? contractDeployer.toLowerCase() : '';
        const normalizedWallet = walletAddress ? walletAddress.toLowerCase() : '';
        
        // Check if walletAddress is either a super admin or the deployer
        const isDeployer = !!normalizedDeployer && !!normalizedWallet && normalizedDeployer === normalizedWallet;
        
        setIsSuperAdmin(isSuperAdmin || isDeployer);
    
      } catch (error) {
        console.error('Error checking super admin status:', error);
        setIsSuperAdmin(false);
      }
    };

    checkSuperAdmin();
  }, [isInitialized, walletAddress, actualContractAddress, publicClient]);

  // Load available creation fees
  const loadCreationFees = async () => {
    if (!contract || !publicClient) return BigInt(0);
    
    try {
      setLoadingFees(true);
      
      const fees = await publicClient.readContract({
        address: actualContractAddress,
        abi: sovSeasAdminAbi,
        functionName: 'getAvailableCreationFees',
      }) as bigint;
      
      setCreationFees(fees);
      return fees;
    } catch (error) {
      console.error('Error loading creation fees:', error);
      return BigInt(0);
    } finally {
      setLoadingFees(false);
    }
  };

  // Withdraw creation fees (only for super admins)
  const withdrawCreationFees = async (amount: string = "0") => {
    if (!walletClient || !isSuperAdmin) return;
    
    try {
      const amountBigInt = amount === "0" ? BigInt(0) : parseEther(amount);
      
      writeContract({
        address: actualContractAddress,
        abi: sovSeasAdminAbi,
        functionName: 'withdrawCreationFees',
        args: [amountBigInt],
      });
    } catch (error) {
      console.error('Error withdrawing creation fees:', error);
    }
  };

  // Add a new super admin
  const addSuperAdmin = async (newAdminAddress: string) => {
    if (!walletClient || !isSuperAdmin) return;
    
    try {
      writeContract({
        address: actualContractAddress,
        abi: sovSeasAdminAbi,
        functionName: 'addSuperAdmin',
        args: [newAdminAddress],
      });
    } catch (error) {
      console.error('Error adding super admin:', error);
    }
  };

  // Remove a super admin
  const removeSuperAdmin = async (adminAddress: string) => {
    if (!walletClient || !isSuperAdmin) return;
    
    try {
      writeContract({
        address: actualContractAddress,
        abi: sovSeasAdminAbi,
        functionName: 'removeSuperAdmin',
        args: [adminAddress],
      });
    } catch (error) {
      console.error('Error removing super admin:', error);
    }
  };

  // Fee constants from the contract
  const PLATFORM_FEE = 15; // Percentage
  const CAMPAIGN_CREATION_FEE = "2"; // CELO
  const ENTITY_CREATION_FEE = "1"; // CELO
  const POLL_CREATION_FEE = "0.5"; // CELO
  const COMMENT_FEE = "0.01"; // CELO

  // Calculate fees for a given amount
  const calculateFees = async (amount: string, adminFeePercentage: number) => {
    if (!contract || !publicClient) {
      return { platformFee: BigInt(0), adminFee: BigInt(0), remaining: BigInt(0) };
    }
    
    try {
      const amountBigInt = parseEther(amount);
      
      const result = await publicClient.readContract({
        address: actualContractAddress,
        abi: sovSeasAdminAbi,
        functionName: 'calculateFees',
        args: [amountBigInt, BigInt(adminFeePercentage)],
      }) as [bigint, bigint, bigint];
      
      return {
        platformFee: result[0],
        adminFee: result[1],
        remaining: result[2]
      };
    } catch (error) {
      console.error('Error calculating fees:', error);
      return { platformFee: BigInt(0), adminFee: BigInt(0), remaining: BigInt(0) };
    }
  };

  // Format token amounts
  const formatTokenAmount = (amount: bigint) => {
    return formatEther(amount);
  };

  return {
    // Config
    contractAddress: actualContractAddress,
    
    // Clients
    publicClient,
    walletClient,
    
    // Contract state
    isInitialized,
    isSuperAdmin,
    creationFees,
    loadingFees,
    
    // Fee constants
    PLATFORM_FEE,
    CAMPAIGN_CREATION_FEE,
    ENTITY_CREATION_FEE,
    POLL_CREATION_FEE,
    COMMENT_FEE,
    
    // Transaction state
    isWritePending,
    isWriteSuccess,
    isWaitingForTx,
    isTxSuccess,
    writeError,
    resetWrite,
    txReceipt,
    
    // Read functions
    loadCreationFees,
    calculateFees,
    
    // Super Admin functions
    addSuperAdmin,
    removeSuperAdmin,
    withdrawCreationFees,
    
    // Helper functions
    formatTokenAmount,
  };
};