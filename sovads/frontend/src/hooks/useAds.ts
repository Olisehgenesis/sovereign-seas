import { useState, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { sovAdsManagerAbi, address } from '../contract/abi';
import type { Abi } from 'viem';

// Minimal ERC20 ABI for allowance/approve
const erc20Abi: Abi = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
];

// TypeScript interfaces for contract data structures
export interface Campaign {
  id: bigint;
  creator: string;
  token: string;
  amount: bigint;
  startTime: bigint;
  endTime: bigint;
  metadata: string;
  active: boolean;
  spent: bigint;
  paused: boolean;
}

export interface ClaimOrder {
  id: bigint;
  publisher: string;
  campaignId: bigint;
  requestedAmount: bigint;
  approvedAmount: bigint;
  processed: boolean;
  rejected: boolean;
  reason: string;
  createdAt: bigint;
  processedAt: bigint;
}

export interface Publisher {
  wallet: string;
  sites: string[];
  banned: boolean;
  totalEarned: bigint;
  totalClaimed: bigint;
  verified: boolean;
  subscriptionDate: bigint;
}       

export interface UseAdsReturn {
  // Contract state
  campaignCount: bigint | undefined;
  claimOrderCount: bigint | undefined;
  feePercent: bigint | undefined;
  protocolFees: bigint | undefined;
  paused: boolean | undefined;
  
  // Campaign functions
  getCampaign: (campaignId: number) => Promise<Campaign | undefined>;
  getActiveCampaignsCount: () => Promise<bigint | undefined>;
  
  // Publisher functions
  getPublisher: (publisherAddress: string) => Promise<Publisher | undefined>;
  getPublisherSites: (publisherAddress: string) => Promise<string[] | undefined>;
  isPublisher: (address: string) => Promise<boolean | undefined>;
  
  // Claim order functions
  getClaimOrder: (orderId: number) => Promise<ClaimOrder | undefined>;
  
  // Write functions
  createCampaign: (token: string, amount: string, duration: number, metadata: string) => Promise<`0x${string}`>;
  createClaimOrder: (campaignId: number, requestedAmount: string) => Promise<void>;
  subscribePublisher: (sites: string[]) => Promise<void>;
  addSite: (site: string) => Promise<void>;
  removeSite: (siteIndex: number) => Promise<void>;
  
  // Utility functions
  getSupportedTokens: () => Promise<string[] | undefined>;
  isUserBanned: (userAddress: string) => Promise<boolean | undefined>;
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
}

export const useAds = (): UseAdsReturn => {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient({ chainId: 11142220 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Contract read hooks for basic state
  const { data: campaignCount } = useReadContract({
    address: address as `0x${string}`,
    abi: sovAdsManagerAbi,
    functionName: 'campaignCount',
    chainId: 11142220,
  });

  const { data: claimOrderCount } = useReadContract({
    address: address as `0x${string}`,
    abi: sovAdsManagerAbi,
    functionName: 'claimOrderCount',
    chainId: 44787,
  });

  const { data: feePercent } = useReadContract({
    address: address as `0x${string}`,
    abi: sovAdsManagerAbi,
    functionName: 'feePercent',
    chainId: 44787,
  });

  const { data: protocolFees } = useReadContract({
    address: address as `0x${string}`,
    abi: sovAdsManagerAbi,
    functionName: 'protocolFees',
    chainId: 44787,
  });

  const { data: paused } = useReadContract({
    address: address as `0x${string}`,
    abi: sovAdsManagerAbi,
    functionName: 'paused',
    chainId: 44787,
  });

  // Write contract hooks
  const { writeContractAsync: writeCreateCampaign } = useWriteContract();

  const { writeContractAsync: writeCreateClaimOrder } = useWriteContract();

  const { writeContractAsync: writeSubscribePublisher } = useWriteContract();

  const { writeContractAsync: writeAddSite } = useWriteContract();

  const { writeContractAsync: writeRemoveSite } = useWriteContract();
  const { writeContractAsync: writeErc20 } = useWriteContract();

  // Helper function to handle contract calls
  const handleContractCall = useCallback(async <T>(
    contractCall: () => Promise<T>,
    operation: string
  ): Promise<T | undefined> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await contractCall();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${operation}`;
      setError(errorMessage);
      console.error(`Error in ${operation}:`, err);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Ensure ERC20 allowance is sufficient, approve if needed
  const ensureAllowance = useCallback(async (
    tokenAddress: string,
    owner: string,
    spender: string,
    requiredAmountWei: bigint
  ): Promise<void> => {
    if (!publicClient) throw new Error('Public client not available');

    const currentAllowance = (await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [owner as `0x${string}`, spender as `0x${string}`],
    })) as bigint;

    if (currentAllowance >= requiredAmountWei) return;

    const approveTx = await writeErc20({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'approve',
      chainId: 44787,
      args: [spender as `0x${string}`, requiredAmountWei],
    });

    await publicClient.waitForTransactionReceipt({ hash: approveTx });
  }, [publicClient, writeErc20]);

  // Read functions
  const getCampaign = useCallback(async (campaignId: number): Promise<Campaign | undefined> => {
    return handleContractCall(async () => {
      if (!publicClient) {
        throw new Error('Public client not available');
      }
      
      const result = await publicClient.readContract({
        address: address as `0x${string}`,
        abi: sovAdsManagerAbi,
        functionName: 'getCampaign',
        args: [BigInt(campaignId)],
      });
      
      return result as Campaign;
    }, 'get campaign');
  }, [publicClient, handleContractCall]);

  const getActiveCampaignsCount = useCallback(async (): Promise<bigint | undefined> => {
    return handleContractCall(async () => {
      if (!publicClient) {
        throw new Error('Public client not available');
      }
      
      const result = await publicClient.readContract({
        address: address as `0x${string}`,
        abi: sovAdsManagerAbi,
        functionName: 'getActiveCampaignsCount',
      });
      
      return result as bigint;
    }, 'get active campaigns count');
  }, [publicClient, handleContractCall]);

  const getPublisher = useCallback(async (publisherAddress: string): Promise<Publisher | undefined> => {
    return handleContractCall(async () => {
      if (!publicClient) {
        throw new Error('Public client not available');
      }
      
      const result = await publicClient.readContract({
        address: address as `0x${string}`,
        abi: sovAdsManagerAbi,
        functionName: 'getPublisher',
        args: [publisherAddress as `0x${string}`],
      });
      
      return result as Publisher;
    }, 'get publisher');
  }, [publicClient, handleContractCall]);

  const getPublisherSites = useCallback(async (publisherAddress: string): Promise<string[] | undefined> => {
    return handleContractCall(async () => {
      if (!publicClient) {
        throw new Error('Public client not available');
      }
      
      const result = await publicClient.readContract({
        address: address as `0x${string}`,
        abi: sovAdsManagerAbi,
        functionName: 'getPublisherSites',
        args: [publisherAddress as `0x${string}`],
      });
      
      return result as string[];
    }, 'get publisher sites');
  }, [publicClient, handleContractCall]);

  const isPublisher = useCallback(async (address: string): Promise<boolean | undefined> => {
    return handleContractCall(async () => {
      if (!publicClient) {
        throw new Error('Public client not available');
      }
      
      const result = await publicClient.readContract({
        address: address as `0x${string}`,
        abi: sovAdsManagerAbi,
        functionName: 'isPublisher',
        args: [address as `0x${string}`],
      });
      
      return result as boolean;
    }, 'check if publisher');
  }, [publicClient, handleContractCall]);

  const getClaimOrder = useCallback(async (orderId: number): Promise<ClaimOrder | undefined> => {
    return handleContractCall(async () => {
      if (!publicClient) {
        throw new Error('Public client not available');
      }
      
      const result = await publicClient.readContract({
        address: address as `0x${string}`,
        abi: sovAdsManagerAbi,
        functionName: 'getClaimOrder',
        args: [BigInt(orderId)],
      });
      
      return result as ClaimOrder;
    }, 'get claim order');
  }, [publicClient, handleContractCall]);

  const getSupportedTokens = useCallback(async (): Promise<string[] | undefined> => {
    return handleContractCall(async () => {
      if (!publicClient) {
        throw new Error('Public client not available');
      }
      
      const result = await publicClient.readContract({
        address: address as `0x${string}`,
        abi: sovAdsManagerAbi,
        functionName: 'getSupportedTokens',
      });
      
      return result as string[];
    }, 'get supported tokens');
  }, [publicClient, handleContractCall]);

  const isUserBanned = useCallback(async (userAddress: string): Promise<boolean | undefined> => {
    return handleContractCall(async () => {
      if (!publicClient) {
        throw new Error('Public client not available');
      }
      
      const result = await publicClient.readContract({
        address: address as `0x${string}`,
        abi: sovAdsManagerAbi,
        functionName: 'isUserBanned',
        args: [userAddress as `0x${string}`],
      });
      
      return result as boolean;
    }, 'check if user banned');
  }, [publicClient, handleContractCall]);

  // Write functions
  const createCampaign = useCallback(async (
    token: string,
    amount: string,
    duration: number,
    metadata: string
  ): Promise<`0x${string}`> => {
    const result = await handleContractCall(async () => {
      if (!writeCreateCampaign) {
        throw new Error('Contract write function not available');
      }
      
      // Check and request allowance for budget
      if (!userAddress) throw new Error('Wallet not connected');
      const amountWei = parseEther(amount);
      await ensureAllowance(
        token,
        userAddress,
        address as `0x${string}`,
        amountWei
      );

      const hash = await writeCreateCampaign({
        address: address as `0x${string}`,
        abi: sovAdsManagerAbi,
        functionName: 'createCampaign',
        chainId: 11142220,
        args: [
          token as `0x${string}`,
          amountWei,
          BigInt(duration),
          metadata
        ],
      });
      
      // Wait for transaction confirmation
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      return hash as `0x${string}`;
    }, 'create campaign');
    if (!result) throw new Error('Failed to create campaign');
    return result as `0x${string}`;
  }, [writeCreateCampaign, publicClient, handleContractCall]);

  const createClaimOrder = useCallback(async (
    campaignId: number,
    requestedAmount: string
  ): Promise<void> => {
    await handleContractCall(async () => {
      if (!writeCreateClaimOrder) {
        throw new Error('Contract write function not available');
      }
      
      const hash = await writeCreateClaimOrder({
        address: address as `0x${string}`,
        abi: sovAdsManagerAbi,
        functionName: 'createClaimOrder',
        chainId: 11142220,
        args: [
          BigInt(campaignId),
          parseEther(requestedAmount)
        ],
      });
      
      // Wait for transaction confirmation
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
    }, 'create claim order');
  }, [writeCreateClaimOrder, publicClient, handleContractCall]);

  const subscribePublisher = useCallback(async (sites: string[]): Promise<void> => {
    await handleContractCall(async () => {
      if (!writeSubscribePublisher) {
        throw new Error('Contract write function not available');
      }
      
      const hash = await writeSubscribePublisher({
        address: address as `0x${string}`,
        abi: sovAdsManagerAbi,
        functionName: 'subscribePublisher',
        chainId: 11142220,
        args: [sites],
      });
      
      // Wait for transaction confirmation
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
    }, 'subscribe publisher');
  }, [writeSubscribePublisher, publicClient, handleContractCall]);

  const addSite = useCallback(async (site: string): Promise<void> => {
    await handleContractCall(async () => {
      if (!writeAddSite) {
        throw new Error('Contract write function not available');
      }
      
      const hash = await writeAddSite({
        address: address as `0x${string}`,
        abi: sovAdsManagerAbi,
        functionName: 'addSite',
        chainId: 11142220,
        args: [site],
      });
      
      // Wait for transaction confirmation
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
    }, 'add site');
  }, [writeAddSite, publicClient, handleContractCall]);

  const removeSite = useCallback(async (siteIndex: number): Promise<void> => {
    await handleContractCall(async () => {
      if (!writeRemoveSite) {
        throw new Error('Contract write function not available');
      }
      
      const hash = await writeRemoveSite({
        address: address as `0x${string}`,
        abi: sovAdsManagerAbi,
        functionName: 'removeSite',
        chainId: 11142220,
        args: [BigInt(siteIndex)],
      });
      
      // Wait for transaction confirmation
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
    }, 'remove site');
  }, [writeRemoveSite, publicClient, handleContractCall]);

  return {
    // Contract state
    campaignCount: campaignCount as bigint | undefined,
    claimOrderCount: claimOrderCount as bigint | undefined,
    feePercent: feePercent as bigint | undefined,
    protocolFees: protocolFees as bigint | undefined,
    paused: paused as boolean | undefined,
    
    // Campaign functions
    getCampaign,
    getActiveCampaignsCount,
    
    // Publisher functions
    getPublisher,
    getPublisherSites,
    isPublisher,
    
    // Claim order functions
    getClaimOrder,
    
    // Write functions
    createCampaign,
    createClaimOrder,
    subscribePublisher,
    addSite,
    removeSite,
    
    // Utility functions
    getSupportedTokens,
    isUserBanned,
    
    // Loading and error states
    isLoading,
    error,
  };
};
