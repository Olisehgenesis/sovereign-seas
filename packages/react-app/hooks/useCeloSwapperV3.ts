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
import { parseEther, formatEther, parseUnits } from 'viem';
import { getContract } from 'viem';

// Import ABIs
import celoSwapperV3ABI from '../abis/CeloSwapperV3.json';
import erc20Abi from '../abis/MockCELO.json';

// Get contract address from .env
const chainId = process.env.NEXT_PUBLIC_CHAIN_ID ? Number(process.env.NEXT_PUBLIC_CHAIN_ID) : undefined;
const contractAddress = process.env.NEXT_PUBLIC_SWAPPER_ADDRESS as `0x${string}`;
const celoSwapperV3Abi = celoSwapperV3ABI.abi ;

// CELO and cUSD addresses from .env or defaults
const CELO_ADDRESS = (process.env.NEXT_PUBLIC_CELO_ADDRESS || '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9') as `0x${string}`;
const CUSD_ADDRESS = (process.env.NEXT_PUBLIC_CUSD_ADDRESS || '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1') as `0x${string}`;

// Export contract addresses for use in other components
export const SWAPPER_V3_ADDRESS = contractAddress;

const tokenNameFallback = (address: string) => {
  // Fallback function to get token name if not available
  if (address.toLowerCase() === '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1') {
    return { name: 'cUSD', symbol: 'cUSD' };
  }
  if (address.toLowerCase() === '0xD046F2C4E5A3B8F7D1C6E9A0B2D4F5F7D1C6E9A0') {
    return { name: 'cEUR', symbol: 'cEUR' };
  }
  return { name: 'Unknown Token', symbol: 'Unknown' };
}

// Define Types
export type TokenConfig = {
  supported: boolean;
  exchangeId: string;
  minAmount: bigint;
};

export type SwapResult = {
  user: string;
  token: string;
  campaignId: bigint;
  projectId: bigint;
  tokenAmount: bigint;
  celoSwapped: bigint;
  celoVoted: bigint;
  transactionHash: string;
};

interface CeloSwapperConfig {
  contractAddress?: `0x${string}`;
  chainId?: number;
}

export const useCeloSwapperV3 = (config?: CeloSwapperConfig) => {
  const { address: walletAddress } = useAccount();
  const publicClient = usePublicClient({
    chainId: config?.chainId || chainId,
  });
  const { data: walletClient } = useWalletClient(
    { chainId: config?.chainId || chainId }
  );
  
  const actualContractAddress = config?.contractAddress || contractAddress;
  
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Contract instance
  const [contract, setContract] = useState<any>(null);
  
  // State
  const [supportedTokens, setSupportedTokens] = useState<string[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [serviceFee, setServiceFee] = useState<bigint>(BigInt(0));
  const [truncationThreshold, setTruncationThreshold] = useState<bigint>(BigInt(0));
  const [accumulatedFees, setAccumulatedFees] = useState<{[token: string]: bigint}>({});
  const [loadingFees, setLoadingFees] = useState(false);
  const [tokenSymbols, setTokenSymbols] = useState<{[address: string]: string}>({});
  const [tokenDecimals, setTokenDecimals] = useState<{[address: string]: number}>({});
  const [swapHistory, setSwapHistory] = useState<SwapResult[]>([]);
  
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
    
    const swapperContract = getContract({
      address: actualContractAddress,
      abi: celoSwapperV3Abi,
      client: publicClient,
    });
    
    setContract(swapperContract);
    setIsInitialized(true);
  }, [publicClient, actualContractAddress]);

  // Check if current user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!isInitialized || !publicClient || !walletAddress) {
        setIsAdmin(false);
        return;
      }
    
      try {
        // Check if the walletAddress is an admin
        const isUserAdmin = await publicClient.readContract({
          address: actualContractAddress,
          abi: celoSwapperV3Abi,
          functionName: 'admins',
          args: [walletAddress],
        }) as boolean;
        
        // Also check if the user is the owner
        const owner = await publicClient.readContract({
          address: actualContractAddress,
          abi: celoSwapperV3Abi,
          functionName: 'owner',
        }) as string;
        
        const isOwner = walletAddress.toLowerCase() === owner.toLowerCase();
        
        setIsAdmin(isUserAdmin || isOwner);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, [isInitialized, walletAddress, actualContractAddress, publicClient]);

 // Load supported tokens
const loadSupportedTokens = async () => {
  if (!contract || !publicClient) return [];
  
  try {
    setLoadingTokens(true);
    
    const tokenCount = await publicClient.readContract({
      address: actualContractAddress,
      abi: celoSwapperV3Abi,
      functionName: 'getSupportedTokenCount',
    }) as bigint;
    
    const tokensPromises = [];
    for (let i = 0; i < Number(tokenCount); i++) {
      tokensPromises.push(publicClient.readContract({
        address: actualContractAddress,
        abi: celoSwapperV3Abi,
        functionName: 'supportedTokenList',
        args: [BigInt(i)],
      }));
    }
    
    const tokens = await Promise.all(tokensPromises) as string[];
    // Filter out duplicates and invalid addresses
    setSupportedTokens(tokens);
    
    // Load token symbols and decimals with better fallback handling and detailed logging
    console.log('Starting to fetch token symbols and decimals for tokens:', tokens);
    
    const symbolsPromises = tokens.map(token => 
      publicClient.readContract({
        address: token as `0x${string}`,
        abi: erc20Abi,
        functionName: 'symbol',
      }).then(symbol => {
        console.log(`Successfully fetched symbol for ${token}: ${symbol}`);
        return symbol;
      }).catch(error => {
        console.log(`Error fetching symbol for ${token}:`, error);
        console.log(`Using fallback for ${token}`);
        const fallback = tokenNameFallback(token);
        console.log(`Fallback symbol for ${token}: ${fallback.symbol}`);
        return fallback.symbol;
      })
    );
    
    const decimalsPromises = tokens.map(token => 
      publicClient.readContract({
        address: token as `0x${string}`,
        abi: erc20Abi,
        functionName: 'decimals',
      }).then(decimals => {
        console.log(`Successfully fetched decimals for ${token}: ${decimals}`);
        return decimals;
      }).catch(error => {
        console.log(`Error fetching decimals for ${token}:`, error);
        console.log(`Using default 18 decimals for ${token}`);
        return 18;
      })
    );
    
    console.log('Waiting for all symbol and decimal promises to resolve...');
    const symbols = await Promise.all(symbolsPromises) as string[];
    const decimals = await Promise.all(decimalsPromises) as number[];
    
    console.log('All symbols fetched:', symbols);
    console.log('All decimals fetched:', decimals);
    
    const newSymbols: {[address: string]: string} = {};
    const newDecimals: {[address: string]: number} = {};
    
    tokens.forEach((token, index) => {
      // Detailed logging for each token
      console.log(`Processing token ${token} with symbol: ${symbols[index]}`);
      
      // If symbol is still 'Unknown', try the fallback function again
      let symbol = symbols[index];
      if (!symbol || symbol === 'Unknown') {
        console.log(`Symbol for ${token} is still Unknown or empty, using fallback again`);
        const fallback = tokenNameFallback(token);
        symbol = fallback.symbol;
        console.log(`New symbol from fallback: ${symbol}`);
      }
      
      console.log(`Final symbol for ${token}: ${symbol}`);
      newSymbols[token] = symbol;
      newDecimals[token] = decimals[index];
    });
    
    setTokenSymbols(newSymbols);
    setTokenDecimals(newDecimals);
    
    return tokens;
  } catch (error) {
    console.error('Error loading supported tokens:', error);
    return [];
  } finally {
    setLoadingTokens(false);
  }
};

  // Load token configuration
  const getTokenConfig = async (tokenAddress: string) => {
    if (!contract || !publicClient) return null;
    
    try {
      const config = await publicClient.readContract({
        address: actualContractAddress,
        abi: celoSwapperV3Abi,
        functionName: 'supportedTokens',
        args: [tokenAddress as `0x${string}`],
      }) as TokenConfig;
      
      return config;
    } catch (error) {
      console.error(`Error loading token config for ${tokenAddress}:`, error);
      return null;
    }
  };

  // Load accumulated fees for all supported tokens
  const loadAccumulatedFees = async () => {
    if (!contract || !publicClient) return {};
    
    try {
      setLoadingFees(true);
      
      // Load fees for CELO first
      const celoFees = await publicClient.readContract({
        address: actualContractAddress,
        abi: celoSwapperV3Abi,
        functionName: 'getAccumulatedFees',
        args: [CELO_ADDRESS],
      }) as bigint;
      
      const newFees: {[token: string]: bigint} = {
        [CELO_ADDRESS]: celoFees
      };
      
      // Load fees for other supported tokens
      const tokens = await loadSupportedTokens();
      
      const feesPromises = tokens.map(token => 
        publicClient.readContract({
          address: actualContractAddress,
          abi: celoSwapperV3Abi,
          functionName: 'getAccumulatedFees',
          args: [token as `0x${string}`],
        })
      );
      
      const fees = await Promise.all(feesPromises) as bigint[];
      
      tokens.forEach((token, index) => {
        newFees[token] = fees[index];
      });
      
      setAccumulatedFees(newFees);
      return newFees;
    } catch (error) {
      console.error('Error loading accumulated fees:', error);
      return {};
    } finally {
      setLoadingFees(false);
    }
  };

  // Load service fee
  const loadServiceFee = async () => {
    if (!contract || !publicClient) return BigInt(0);
    
    try {
      const fee = await publicClient.readContract({
        address: actualContractAddress,
        abi: celoSwapperV3Abi,
        functionName: 'serviceFee',
      }) as bigint;
      
      setServiceFee(fee);
      return fee;
    } catch (error) {
      console.error('Error loading service fee:', error);
      return BigInt(0);
    }
  };

  // Load truncation threshold
  const loadTruncationThreshold = async () => {
    if (!contract || !publicClient) return BigInt(0);
    
    try {
      const threshold = await publicClient.readContract({
        address: actualContractAddress,
        abi: celoSwapperV3Abi,
        functionName: 'truncationThreshold',
      }) as bigint;
      
      setTruncationThreshold(threshold);
      return threshold;
    } catch (error) {
      console.error('Error loading truncation threshold:', error);
      return BigInt(0);
    }
  };

  const balanceClient = publicClient;

  // Get user token votes
  const getUserTokenVotes = async (token: string, campaignId: bigint | number, projectId: bigint | number) => {
    if (!contract || !publicClient || !walletAddress) return BigInt(0);
    
    try {
      return await publicClient.readContract({
        address: actualContractAddress,
        abi: celoSwapperV3Abi,
        functionName: 'getUserTokenVotes',
        args: [
          walletAddress,
          token as `0x${string}`,
          BigInt(campaignId),
          BigInt(projectId)
        ],
      }) as bigint;
    } catch (error) {
      console.error('Error getting user token votes:', error);
      return BigInt(0);
    }
  };

  // Add a token to supported tokens (admin only)
  const addToken = async (token: string, exchangeId: string, minAmount: string) => {
    if (!walletClient || !isAdmin) return;
    
    try {
      const minAmountBigInt = parseEther(minAmount);
      
      writeContract({
        address: actualContractAddress,
        abi: celoSwapperV3Abi,
        functionName: 'addToken',
        args: [
          token as `0x${string}`,
          exchangeId as `0x${string}`,
          minAmountBigInt
        ],
      });
      
      await loadSupportedTokens();
    } catch (error) {
      console.error('Error adding token:', error);
    }
  };

  // Update a token configuration (admin only)
  const updateToken = async (token: string, exchangeId: string, minAmount: string) => {
    if (!walletClient || !isAdmin) return;
    
    try {
      const minAmountBigInt = parseEther(minAmount);
      
      writeContract({
        address: actualContractAddress,
        abi: celoSwapperV3Abi,
        functionName: 'updateToken',
        args: [
          token as `0x${string}`,
          exchangeId as `0x${string}`,
          minAmountBigInt
        ],
      });
    } catch (error) {
      console.error('Error updating token:', error);
    }
  };

  // Remove a token from supported tokens (admin only)
  const removeToken = async (token: string) => {
    if (!walletClient || !isAdmin) return;
    
    try {
      writeContract({
        address: actualContractAddress,
        abi: celoSwapperV3Abi,
        functionName: 'removeToken',
        args: [token as `0x${string}`],
      });
      
      await loadSupportedTokens();
    } catch (error) {
      console.error('Error removing token:', error);
    }
  };

  // Update service fee (admin only)
  const updateServiceFee = async (newFee: number) => {
    if (!walletClient || !isAdmin) return;
    
    try {
      writeContract({
        address: actualContractAddress,
        abi: celoSwapperV3Abi,
        functionName: 'updateServiceFee',
        args: [BigInt(newFee)],
      });
      
      await loadServiceFee();
    } catch (error) {
      console.error('Error updating service fee:', error);
    }
  };

  // Update truncation threshold (admin only)
  const updateTruncationThreshold = async (newThreshold: string) => {
    if (!walletClient || !isAdmin) return;
    
    try {
      const thresholdBigInt = parseEther(newThreshold);
      
      writeContract({
        address: actualContractAddress,
        abi: celoSwapperV3Abi,
        functionName: 'updateTruncationThreshold',
        args: [thresholdBigInt],
      });
      
      await loadTruncationThreshold();
    } catch (error) {
      console.error('Error updating truncation threshold:', error);
    }
  };

  // Add an admin (owner only)
  const addAdmin = async (newAdmin: string) => {
    if (!walletClient) return;
    
    try {
      // First check if the current user is the owner
      const owner = await publicClient?.readContract({
        address: actualContractAddress,
        abi: celoSwapperV3Abi,
        functionName: 'owner',
      }) as string;
      
      if (walletAddress?.toLowerCase() !== owner.toLowerCase()) {
        console.error('Only the owner can add admins');
        return;
      }
      
      writeContract({
        address: actualContractAddress,
        abi: celoSwapperV3Abi,
        functionName: 'addAdmin',
        args: [newAdmin as `0x${string}`],
      });
    } catch (error) {
      console.error('Error adding admin:', error);
    }
  };

  // Remove an admin (owner only)
  const removeAdmin = async (admin: string) => {
    if (!walletClient) return;
    
    try {
      // First check if the current user is the owner
      const owner = await publicClient?.readContract({
        address: actualContractAddress,
        abi: celoSwapperV3Abi,
        functionName: 'owner',
      }) as string;
      
      if (walletAddress?.toLowerCase() !== owner.toLowerCase()) {
        console.error('Only the owner can remove admins');
        return;
      }
      
      writeContract({
        address: actualContractAddress,
        abi: celoSwapperV3Abi,
        functionName: 'removeAdmin',
        args: [admin as `0x${string}`],
      });
    } catch (error) {
      console.error('Error removing admin:', error);
    }
  };

  // Withdraw accumulated fees (admin only)
  const withdrawFees = async (token: string, to: string, amount: string = "0") => {
    if (!walletClient || !isAdmin) return;
    
    try {
      // If token has decimals other than 18, use those
      const decimals = tokenDecimals[token] || 18;
      const amountBigInt = amount === "0" ? BigInt(0) : parseUnits(amount, decimals);
      
      writeContract({
        address: actualContractAddress,
        abi: celoSwapperV3Abi,
        functionName: 'withdrawFees',
        args: [
          token as `0x${string}`,
          to as `0x${string}`,
          amountBigInt
        ],
      });
      
      await loadAccumulatedFees();
    } catch (error) {
      console.error('Error withdrawing fees:', error);
    }
  };

  // Withdraw ERC20 tokens (admin only)
  const withdrawERC20 = async (token: string, to: string, amount: string) => {
    if (!walletClient || !isAdmin) return;
    
    try {
      // If token has decimals other than 18, use those
      const decimals = tokenDecimals[token] || 18;
      const amountBigInt = parseUnits(amount, decimals);
      
      writeContract({
        address: actualContractAddress,
        abi: celoSwapperV3Abi,
        functionName: 'withdrawERC20',
        args: [
          token as `0x${string}`,
          to as `0x${string}`,
          amountBigInt
        ],
      });
    } catch (error) {
      console.error('Error withdrawing ERC20 tokens:', error);
    }
  };

  // Withdraw CELO (admin only)
  const withdrawCELO = async (to: string, amount: string) => {
    if (!walletClient || !isAdmin) return;
    
    try {
      const amountBigInt = parseEther(amount);
      
      writeContract({
        address: actualContractAddress,
        abi: celoSwapperV3Abi,
        functionName: 'withdrawCELO',
        args: [
          to as `0x${string}`,
          amountBigInt
        ],
      });
    } catch (error) {
      console.error('Error withdrawing CELO:', error);
    }
  };

  // Get expected vote amount
  const getExpectedVoteAmount = async (token: string, tokenAmount: string) => {
    if (!contract || !publicClient) return { expectedCelo: BigInt(0), voteAmount: BigInt(0) };
    
    try {
      // If token has decimals other than 18, use those
      const decimals = tokenDecimals[token] || 18;
      const amountBigInt = parseUnits(tokenAmount, decimals);
      
      const [expectedCelo, voteAmount] = await publicClient.readContract({
        address: actualContractAddress,
        abi: celoSwapperV3Abi,
        functionName: 'getExpectedVoteAmount',
        args: [
          token as `0x${string}`,
          amountBigInt
        ],
      }) as [bigint, bigint];
      
      return { expectedCelo, voteAmount };
    } catch (error) {
      console.error('Error getting expected vote amount:', error);
      return { expectedCelo: BigInt(0), voteAmount: BigInt(0) };
    }
  };

  // Calculate minimum CELO amount based on slippage
  const calculateMinCeloAmount = async (token: string, tokenAmount: string, slippageInBps: number) => {
    if (!contract || !publicClient) return BigInt(0);
    
    try {
      // If token has decimals other than 18, use those
      const decimals = tokenDecimals[token] || 18;
      const amountBigInt = parseUnits(tokenAmount, decimals);
      
      const minCeloAmount = await publicClient.readContract({
        address: actualContractAddress,
        abi: celoSwapperV3Abi,
        functionName: 'calculateMinCeloAmount',
        args: [
          token as `0x${string}`,
          amountBigInt,
          BigInt(slippageInBps)
        ],
      }) as bigint;
      
      return minCeloAmount;
    } catch (error) {
      console.error('Error calculating min CELO amount:', error);
      return BigInt(0);
    }
  };

  // Swap a token and vote with CELO
  // Swap a token and vote with CELO
const swapAndVoteToken = async (
    token: string,
    campaignId: bigint | number,
    projectId: bigint | number,
    tokenAmount: string,
    slippageInBps: number = 50 // Default 0.5%
  ) => {
    if (!walletClient || !publicClient) {
      console.error("Wallet client or public client not available");
      throw new Error("Wallet not connected");
    }
  
    try {
      // Log all parameters for debugging
      console.log("Swap parameters:", {
        token,
        campaignId,
        projectId,
        tokenAmount,
        slippageInBps
      });
  
      // Make sure token is a valid address
      if (!token || !token.startsWith('0x')) {
        console.error("Invalid token address:", token);
        throw new Error("Invalid token address");
      }
  
      // Make sure campaign and project IDs are valid
      if (campaignId === undefined || projectId === undefined) {
        console.error("Invalid campaign or project ID:", { campaignId, projectId });
        throw new Error("Invalid campaign or project ID");
      }
  
      // Make sure token amount is a valid number
      if (!tokenAmount || isNaN(parseFloat(tokenAmount)) || parseFloat(tokenAmount) <= 0) {
        console.error("Invalid token amount:", tokenAmount);
        throw new Error("Invalid token amount");
      }
  
      // If token has decimals other than 18, use those
      const decimals = tokenDecimals[token] || 18;
      const amountBigInt = parseUnits(tokenAmount, decimals);
      
      // Calculate minimum CELO amount with slippage protection
      const minCeloAmount = await calculateMinCeloAmount(token, tokenAmount, slippageInBps);
      
      console.log("Calculated min CELO amount:", minCeloAmount.toString());
      const approveTx = await writeContract({
        address: token as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [actualContractAddress, amountBigInt],
      });
   
      const swapTx = await writeContract({
        address: actualContractAddress,
        abi: celoSwapperV3Abi,
        functionName: 'swapAndVoteToken',
        args: [
          token as `0x${string}`,
          campaignId,
          projectId,
          amountBigInt,
          minCeloAmount
        ],
      });
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash: swapTx as `0x${string}` });
      console.log("Swap transaction confirmed:", receipt);
      
      // Parse logs to find SwappedAndVoted event
      const events = receipt.logs.map(log => {
        try {
          return publicClient.decodeEventLog({
            abi: celoSwapperV3Abi,
            data: log.data,
            topics: log.topics,
          });
        } catch (e) {
          return null;
        }
      }).filter(event => event && event.eventName === 'SwappedAndVoted');
      
      if (events.length > 0) {
        const event = events[0];
        const result: SwapResult = {
          user: event.args.user,
          token: event.args.token,
          campaignId: event.args.campaignId,
          projectId: event.args.projectId,
          tokenAmount: event.args.tokenAmount,
          celoSwapped: event.args.celoSwapped,
          celoVoted: event.args.celoVoted,
          transactionHash: receipt.transactionHash
        };
        
        // Add to swap history
        setSwapHistory(prev => [result, ...prev]);
        
        return result;
      }
      
      console.log("Transaction succeeded but no SwappedAndVoted event found");
      return {
        user: walletAddress || "",
        token: token,
        campaignId: BigInt(campaignId),
        projectId: BigInt(projectId),
        tokenAmount: amountBigInt,
        celoSwapped: BigInt(0),
        celoVoted: BigInt(0),
        transactionHash: receipt.transactionHash
      } as SwapResult;
      
    } catch (error) {
      console.error('Error details in swapping and voting:', error);
      
      // Try to get a more descriptive error message
      let errorMessage = "Error swapping and voting";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }
      
      throw new Error(errorMessage);
    }
  };

  // The simplified cUSD swap and vote function for backwards compatibility
  const swapAndVote = async (
    campaignId: bigint | number,
    projectId: bigint | number,
    cusdAmount: string,
    slippageInBps: number = 50
  ) => {
    // Just call swapAndVoteToken with cUSD address
    return swapAndVoteToken(CUSD_ADDRESS, campaignId, projectId, cusdAmount, slippageInBps);
  };

  // Format token amount based on token decimals
  const formatTokenAmount = (token: string, amount: bigint) => {
    const decimals = tokenDecimals[token] || 18;
    
    // Use a basic formatting approach
    const amountStr = amount.toString();
    
    if (decimals === 0) return amountStr;
    
    if (amountStr.length <= decimals) {
      return '0.' + '0'.repeat(decimals - amountStr.length) + amountStr;
    } else {
      const intPart = amountStr.slice(0, amountStr.length - decimals);
      const fracPart = amountStr.slice(amountStr.length - decimals);
      return intPart + '.' + fracPart;
    }
  };

  // Check if a token is supported
  const isTokenSupported = async (token: string) => {
    if (!contract || !publicClient) return false;
    
    try {
      return await publicClient.readContract({
        address: actualContractAddress,
        abi: celoSwapperV3Abi,
        functionName: 'isTokenSupported',
        args: [token as `0x${string}`],
      }) as boolean;
    } catch (error) {
      console.error('Error checking if token is supported:', error);
      return false;
    }
  };

  return {
    // Config
    contractAddress: actualContractAddress,
    
    // Clients
    publicClient,
    walletClient,
    
    // Contract state
    isInitialized,
    supportedTokens,
    loadingTokens,
    isAdmin,
    serviceFee,
    truncationThreshold,
    accumulatedFees,
    loadingFees,
    tokenSymbols,
    tokenDecimals,
    swapHistory,
    
    // Token addresses
    CELO_ADDRESS,
    CUSD_ADDRESS,
    
    // Transaction state
    isWritePending,
    isWriteSuccess,
    isWaitingForTx,
    isTxSuccess,
    writeError,
    resetWrite,
    txReceipt,
    
    // Read functions
    loadSupportedTokens,
    getTokenConfig,
    loadAccumulatedFees,
    loadServiceFee,
    loadTruncationThreshold,
    getUserTokenVotes,
    getExpectedVoteAmount,
    calculateMinCeloAmount,
    isTokenSupported,
    
    // Admin functions
    addToken,
    updateToken,
    removeToken,
    updateServiceFee,
    updateTruncationThreshold,
    addAdmin,
    removeAdmin,
    withdrawFees,
    withdrawERC20,
    withdrawCELO,
    
    // User functions
    swapAndVoteToken,
    swapAndVote, // Simplified cUSD version
    
    // Helper functions
    formatTokenAmount,
    balanceClient
  
  };
};