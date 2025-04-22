'use client';
import { useState, useEffect, useMemo } from 'react';
import { useSovereignSeas, Campaign, Project, Vote } from './useSovereignSeas';
import { useCeloSwapperV3, SwapResult } from './useCeloSwapperV3';
import { formatEther, parseEther } from 'viem';

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

// Define a unified vote type that includes both direct CELO votes and token votes
export type VoteSummary = {
  campaignId: bigint;
  projectId: bigint;
  // CELO votes directly through SovereignSeas
  directCeloAmount: bigint;
  // Votes made through tokens (including the CELO equivalent)
  tokenVotes: {
    token: string;
    tokenAddress: string;
    tokenAmount: bigint;
    celoEquivalent: bigint;
    symbol: string;
  }[];
  // Total CELO equivalent (direct + all token votes converted to CELO)
  totalCeloEquivalent: bigint;
};

export type TokenSupport = {
  address: string;
  symbol: string;
  decimals: number;
  name?: string;
  logo?: string;
  isNative?: boolean; // true for CELO
};

export const useVotingSystem = () => {
  // Initialize both hooks
  const sovereignSeas = useSovereignSeas();
  const celoSwapper = useCeloSwapperV3();
  
  // Common states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voteSummaries, setVoteSummaries] = useState<{[key: string]: VoteSummary}>({});
  const [supportedTokens, setSupportedTokens] = useState<TokenSupport[]>([]);
  
  // Constants
  const CELO_ADDRESS = celoSwapper.CELO_ADDRESS;
  
  // Check if both contracts are initialized
  const isInitialized = useMemo(() => 
    sovereignSeas.isInitialized && celoSwapper.isInitialized, 
    [sovereignSeas.isInitialized, celoSwapper.isInitialized]
  );
  
  // Load supported tokens on initialization
  useEffect(() => {
    if (isInitialized) {
      loadSupportedTokens();
    }
  }, [isInitialized]);
  
/**
 * Load all supported tokens including CELO and tokens from the swapper
 */
const loadSupportedTokens = async () => {
  try {
    setIsLoading(true);
    
    // Add CELO as the native token
    const tokens: TokenSupport[] = [{
      address: CELO_ADDRESS,
      symbol: 'CELO',
      decimals: 18,
      name: 'Celo',
      isNative: true
    }];
    
    // Load tokens from swapper
    const swapperTokens = await celoSwapper.loadSupportedTokens();
    
    // Add each swapper token with its metadata
    for (const tokenAddress of swapperTokens) {
      if (tokenAddress.toLowerCase() !== CELO_ADDRESS.toLowerCase()) {
        // Get symbol from swapper, but ensure we have a fallback
        let symbol = celoSwapper.tokenSymbols[tokenAddress];
        let name = symbol;
        
        console.log(`Processing token in useVotingSystem: ${tokenAddress} with symbol from swapper: ${symbol}`);
        
        // If symbol is still undefined, empty, or 'Unknown', use our improved fallback
        if (!symbol || symbol === 'Unknown') {
          console.log(`Symbol missing or unknown for ${tokenAddress}, using fallback`);
          // Use our improved tokenNameFallback function
          const shortAddr = `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`;
          symbol = `Token-${shortAddr}`;
          name = `Token-${shortAddr}`;
          
          // Check for known tokens
          if (tokenAddress.toLowerCase() === '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1'.toLowerCase()) {
            symbol = 'cUSD';
            name = 'Celo Dollar';
          } else if (tokenAddress.toLowerCase() === '0xD046F2C4E5A3B8F7D1C6E9A0B2D4F5F7D1C6E9A0'.toLowerCase()) {
            symbol = 'cEUR';
            name = 'Celo Euro';
          }
        }
        
        console.log(`Final token info for ${tokenAddress}: symbol=${symbol}, name=${name}`);
        
        tokens.push({
          address: tokenAddress,
          symbol: symbol,
          decimals: celoSwapper.tokenDecimals[tokenAddress] || 18,
          name: name
        });
      }
    }
    
    setSupportedTokens(tokens);
    return tokens;
  } catch (error) {
    console.error('Error loading supported tokens:', error);
    setError('Failed to load supported tokens');
    return [];
  } finally {
    setIsLoading(false);
  }
};
  
 /**
 * Smart vote function that selects the appropriate contract based on the token
 * @param token Token address to vote with (use CELO_ADDRESS for direct CELO votes)
 * @param campaignId Campaign ID
 * @param projectId Project ID
 * @param amount Amount to vote with
 * @param slippageInBps Slippage in basis points (for non-CELO tokens)
 */
const vote = async (
  token: string,
  campaignId: bigint | number,
  projectId: bigint | number,
  amount: string,
  slippageInBps: number = 50
) => {
  try {
    setIsLoading(true);
    setError(null);
    
    let txResult;
    
    // If voting with CELO, use the SovereignSeas contract directly
    if (token.toLowerCase() === CELO_ADDRESS.toLowerCase()) {
      // Direct CELO vote
      txResult = await sovereignSeas.vote(campaignId, projectId, amount);
    } else {
      // For any other token, use the swapper
      txResult = await celoSwapper.swapAndVoteToken(token, campaignId, projectId, amount, slippageInBps);
    }
    
    // Wait for the transaction to be confirmed
    // This prevents the UI from changing pages before MetaMask is done
    if (txResult) {
      console.log("Transaction sent, waiting for confirmation...");
      
      // If the transaction returns a hash, wait for it to be mined
      if (typeof txResult === 'string' || txResult.transactionHash) {
        const txHash = typeof txResult === 'string' ? txResult : txResult.transactionHash;
        
        // If we have the publicClient, wait for the transaction to be mined
        if (celoSwapper.publicClient) {
          const receipt = await celoSwapper.publicClient.waitForTransactionReceipt({
            hash: txHash as `0x${string}`,
          });
          console.log("Transaction confirmed:", receipt);
        }
      }
    }
    
    // Refresh vote summaries after voting
    await getUserVoteSummary(campaignId, projectId);
    
    return true;
  } catch (error) {
    console.error('Error voting:', error);
    setError(`Failed to vote: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  } finally {
    setIsLoading(false);
  }
};
  
  
  /**
   * Get a summary of a user's votes for a specific project
   * @param campaignId Campaign ID
   * @param projectId Project ID
   */
  const getUserVoteSummary = async (campaignId: bigint | number, projectId: bigint | number) => {
    try {
      setIsLoading(true);
      
      // Initialize vote summary
      const summary: VoteSummary = {
        campaignId: BigInt(campaignId),
        projectId: BigInt(projectId),
        directCeloAmount: BigInt(0),
        tokenVotes: [],
        totalCeloEquivalent: BigInt(0)
      };
      
      // Get direct CELO votes from SovereignSeas
      summary.directCeloAmount = await sovereignSeas.getUserVotesForProject(campaignId, projectId);
      
      // Add to total CELO equivalent
      summary.totalCeloEquivalent += summary.directCeloAmount;
      
      // Get token votes from swapper for each supported token
      const tokens = await loadSupportedTokens();
      
      for (const token of tokens) {
        // Skip CELO as we already counted direct votes
        if (token.isNative) continue;
        
        const tokenAmount = await celoSwapper.getUserTokenVotes(
          token.address,
          BigInt(campaignId),
          BigInt(projectId)
        );
        
        if (tokenAmount > BigInt(0)) {
          // Get the CELO equivalent (approximately) by querying the expected vote amount
          // Note: This is an approximation since exchange rates change over time
          const { voteAmount } = await celoSwapper.getExpectedVoteAmount(
            token.address,
            formatEther(tokenAmount)
          );
          
          // Apply token name fallback if necessary
          let tokenName = token.name || 'Unknown';
          let tokenSymbol = token.symbol;
          
          if (tokenName.toLowerCase() === 'unknown token' || tokenSymbol.toLowerCase() === 'unknown') {
            const fallback = tokenNameFallback(token.address);
            tokenName = fallback.name;
            tokenSymbol = fallback.symbol;
          }
          
          summary.tokenVotes.push({
            token: tokenName,
            tokenAddress: token.address,
            tokenAmount: tokenAmount,
            celoEquivalent: voteAmount,
            symbol: tokenSymbol
          });
          
          // Add to total CELO equivalent
          summary.totalCeloEquivalent += voteAmount;
        }
      }
      
      // Cache the summary
      setVoteSummaries(prev => ({
        ...prev,
        [`${campaignId}-${projectId}`]: summary
      }));
      
      return summary;
    } catch (error) {
      console.error('Error getting vote summary:', error);
      setError('Failed to get vote summary');
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Get user's total votes across all projects in a campaign
   * @param campaignId Campaign ID
   */
  const getUserCampaignVotes = async (campaignId: bigint | number) => {
    try {
      setIsLoading(true);
      
      // Get total direct CELO votes in the campaign
      const directCeloVotes = await sovereignSeas.getUserTotalVotesInCampaign(campaignId);
      
      // Get projects in the campaign
      const projects = await sovereignSeas.loadProjects(campaignId);
      
      // For each project, get token votes
      let totalTokenVotes: {
        token: string;
        tokenAddress: string;
        tokenAmount: bigint;
        celoEquivalent: bigint;
        symbol: string;
      }[] = [];
      
      let totalCeloEquivalent = directCeloVotes;
      
      for (const project of projects) {
        const summary = await getUserVoteSummary(campaignId, project.id);
        if (summary) {
          // Add token votes to the total, merging by token address
          for (const tokenVote of summary.tokenVotes) {
            const existingIndex = totalTokenVotes.findIndex(
              v => v.tokenAddress.toLowerCase() === tokenVote.tokenAddress.toLowerCase()
            );
            
            if (existingIndex >= 0) {
              // Update existing token entry
              totalTokenVotes[existingIndex].tokenAmount += tokenVote.tokenAmount;
              totalTokenVotes[existingIndex].celoEquivalent += tokenVote.celoEquivalent;
            } else {
              // Add new token entry
              // Apply token name fallback if needed
              let token = tokenVote.token;
              let symbol = tokenVote.symbol;
              
              if (token.toLowerCase() === 'unknown token' || symbol.toLowerCase() === 'unknown') {
                const fallback = tokenNameFallback(tokenVote.tokenAddress);
                token = fallback.name;
                symbol = fallback.symbol;
              }
              
              totalTokenVotes.push({
                ...tokenVote,
                token,
                symbol
              });
            }
          }
          
          // We already counted direct CELO votes once, so we only add token votes' CELO equivalent
          totalCeloEquivalent += summary.totalCeloEquivalent - summary.directCeloAmount;
        }
      }
      
      return {
        campaignId: BigInt(campaignId),
        directCeloAmount: directCeloVotes,
        tokenVotes: totalTokenVotes,
        totalCeloEquivalent
      };
      
    } catch (error) {
      console.error('Error getting campaign votes:', error);
      setError('Failed to get campaign votes');
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Get all user's votes across all campaigns
   */
  const getAllUserVotes = async () => {
    try {
      setIsLoading(true);
      
      // Get all campaigns
      const campaigns = await sovereignSeas.loadCampaigns();
      
      // For each campaign, get user votes
      const allVotes = await Promise.all(
        campaigns.map(campaign => getUserCampaignVotes(campaign.id))
      );
      
      return allVotes.filter(v => v !== null);
    } catch (error) {
      console.error('Error getting all user votes:', error);
      setError('Failed to get all user votes');
      return [];
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Format token amount with symbol
   * @param token Token address
   * @param amount Amount as bigint
   */
  const formatAmount = (token: string, amount: bigint) => {
    const tokenInfo = supportedTokens.find(t => t.address.toLowerCase() === token.toLowerCase());
    if (!tokenInfo) {
      // Apply fallback for unknown tokens
      const fallback = tokenNameFallback(token);
      return `${formatEther(amount)} ${fallback.symbol}`;
    }
    
    // If token has custom decimals, use them
    const formattedAmount = tokenInfo.decimals === 18 
      ? formatEther(amount) 
      : celoSwapper.formatTokenAmount(token, amount);
    
    return `${formattedAmount} ${tokenInfo.symbol}`;
  };
  
  /**
   * Check if a token is supported for voting
   * @param token Token address
   */
  const isTokenSupported = (token: string) => {
    // CELO is always supported
    if (token.toLowerCase() === CELO_ADDRESS.toLowerCase()) return true;
    
    // Check other tokens
    return supportedTokens.some(t => t.address.toLowerCase() === token.toLowerCase());
  };
  
  return {
    
    // Main functionality
    vote,
    getUserVoteSummary,
    getUserCampaignVotes,
    getAllUserVotes,
    
    // Token management
    loadSupportedTokens,
    supportedTokens,
    isTokenSupported,
    
    // Helper functions
    formatAmount,
    
    // State
    isLoading,
    error,
    voteSummaries,
    isInitialized,
    
    // Pass through useful functions from both hooks
    loadCampaigns: sovereignSeas.loadCampaigns,
    loadProjects: sovereignSeas.loadProjects,
    getExpectedVoteAmount: celoSwapper.getExpectedVoteAmount,
    calculateMinCeloAmount: celoSwapper.calculateMinCeloAmount,
    
    // Access to original hooks if needed
    sovereignSeas,
    celoSwapper,
    
    // Constants
    CELO_ADDRESS
  };
};