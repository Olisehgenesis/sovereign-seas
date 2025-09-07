import { useState, useCallback } from 'react';
import { 
  parseAbi
} from 'viem';
import type { Address, Hash, TransactionReceipt } from 'viem';
import { usePublicClient, useWalletClient, useAccount } from 'wagmi';

// Contract ABIs
const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function allowance(address owner, address spender) public view returns (uint256)',
  'function balanceOf(address owner) public view returns (uint256)',
  'function decimals() public view returns (uint8)',
  'function symbol() public view returns (string)',
  'function name() public view returns (string)'
]);

const GOOD_DOLLAR_VOTER_ABI = parseAbi([
  'function swapAndVote(uint256 _campaignId, uint256 _projectId, uint256 _gsAmount, uint256 _minCeloOut, bytes32 _bypassCode) external',
  'function swapAndVoteWithPool(uint256 _campaignId, uint256 _projectId, uint256 _gsAmount, uint256 _minCeloOut, uint256 _poolId, bytes32 _bypassCode) external',
  'function getQuote(uint256 _gsAmount) external view returns (uint256 estimatedCelo)',
  'function getQuoteForPool(uint256 _gsAmount, uint256 _poolId) public view returns (uint256 estimatedCelo)',
  'function isOperational() external view returns (bool)',
  'function getActivePools() external view returns (uint256[] memory activePoolIds)',
  'function sovereignSeas() external view returns (address)',
  'function poolCount() external view returns (uint256)',
  'function defaultPoolId() external view returns (uint256)',
  'function GOOD_DOLLAR() external view returns (address)',
  'function CELO() external view returns (address)',
  'function UBESWAP_V2_ROUTER() external view returns (address)',
  'function MIN_LIQUIDITY_THRESHOLD() external view returns (uint256)'
]);

// Types
interface TokenInfo {
  balance: bigint;
  allowance: bigint;
  symbol: string;
  name: string;
  decimals: number;
}

interface ContractInfo {
  isOperational: boolean;
  sovereignSeas: Address;
  poolCount: bigint;
  defaultPoolId: bigint;
  goodDollar: Address;
  celo: Address;
  ubeswapRouter: Address;
  minLiquidityThreshold: bigint;
}

interface UseGoodDollarVoterConfig {
  contractAddress: Address;
}

interface UseGoodDollarVoterReturn {
  contractInfo: ContractInfo | null;
  tokenInfo: TokenInfo | null;
  loading: boolean;
  error: string | null;
  
  swapAndVote: (campaignId: bigint, projectId: bigint, gsAmount: bigint, minCeloOut: bigint, bypassCode?: string) => Promise<Hash>;
  swapAndVoteWithPool: (campaignId: bigint, projectId: bigint, gsAmount: bigint, minCeloOut: bigint, poolId: bigint, bypassCode?: string) => Promise<Hash>;
  getQuote: (gsAmount: bigint) => Promise<bigint>;
  getQuoteForPool: (gsAmount: bigint, poolId: bigint) => Promise<bigint>;
  approveGoodDollar: (amount: bigint) => Promise<Hash>;
  getActivePools: () => Promise<bigint[]>;
  refreshTokenInfo: () => Promise<void>;
  waitForTransaction: (hash: Hash) => Promise<TransactionReceipt>;
  refresh: () => Promise<void>;
}

const GOOD_DOLLAR_ADDRESS = '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A';

export const useGoodDollarVoter = (config: UseGoodDollarVoterConfig): UseGoodDollarVoterReturn => {
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address: account } = useAccount();

  // Contract instances

  // Load contract info
  const loadContractInfo = useCallback(async () => {
    try {
      const [
        isOperational,
        sovereignSeas,
        poolCount,
        defaultPoolId,
        goodDollar,
        celo,
        ubeswapRouter,
        minLiquidityThreshold
      ] = await Promise.all([
        publicClient?.readContract({
          address: config.contractAddress,
          abi: GOOD_DOLLAR_VOTER_ABI,
          functionName: 'isOperational'
        }),
        publicClient?.readContract({
          address: config.contractAddress,
          abi: GOOD_DOLLAR_VOTER_ABI,
          functionName: 'sovereignSeas'
        }),
        publicClient?.readContract({
          address: config.contractAddress,
          abi: GOOD_DOLLAR_VOTER_ABI,
          functionName: 'poolCount'
        }),
        publicClient?.readContract({
          address: config.contractAddress,
          abi: GOOD_DOLLAR_VOTER_ABI,
          functionName: 'defaultPoolId'
        }),
        publicClient?.readContract({
          address: config.contractAddress,
          abi: GOOD_DOLLAR_VOTER_ABI,
          functionName: 'GOOD_DOLLAR'
        }),
        publicClient?.readContract({
          address: config.contractAddress,
          abi: GOOD_DOLLAR_VOTER_ABI,
          functionName: 'CELO'
        }),
        publicClient?.readContract({
          address: config.contractAddress,
          abi: GOOD_DOLLAR_VOTER_ABI,
          functionName: 'UBESWAP_V2_ROUTER'
        }),
        publicClient?.readContract({
          address: config.contractAddress,
          abi: GOOD_DOLLAR_VOTER_ABI,
          functionName: 'MIN_LIQUIDITY_THRESHOLD'
        })
      ]);

      setContractInfo({
        isOperational: isOperational as boolean,
        sovereignSeas: sovereignSeas as Address,
        poolCount: poolCount as bigint,
        defaultPoolId: defaultPoolId as bigint,
        goodDollar: goodDollar as Address,
        celo: celo as Address,
        ubeswapRouter: ubeswapRouter as Address,
        minLiquidityThreshold: minLiquidityThreshold as bigint
      });
    } catch (err) {
      setError(`Failed to load contract info: ${err}`);
    }
  }, [publicClient, config.contractAddress]);

  // Load token info
  const loadTokenInfo = useCallback(async () => {
    if (!account) return;

    try {
      const [balance, allowance, symbol, name, decimals] = await Promise.all([
        publicClient?.readContract({
          address: GOOD_DOLLAR_ADDRESS as Address,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [account]
        }),
        publicClient?.readContract({
          address: GOOD_DOLLAR_ADDRESS as Address,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [account, config.contractAddress]
        }),
        publicClient?.readContract({
          address: GOOD_DOLLAR_ADDRESS as Address,
          abi: ERC20_ABI,
          functionName: 'symbol'
        }),
        publicClient?.readContract({
          address: GOOD_DOLLAR_ADDRESS as Address,
          abi: ERC20_ABI,
          functionName: 'name'
        }),
        publicClient?.readContract({
          address: GOOD_DOLLAR_ADDRESS as Address,
          abi: ERC20_ABI,
          functionName: 'decimals'
        })
      ]);

      setTokenInfo({
        balance: balance as bigint,
        allowance: allowance as bigint,
        symbol: symbol as string,
        name: name as string,
        decimals: decimals as number
      });
    } catch (err) {
      setError(`Failed to load token info: ${err}`);
    }
  }, [account, publicClient, config.contractAddress]);

  // Main swap and vote function
  const swapAndVote = useCallback(async (
    campaignId: bigint,
    projectId: bigint,
    gsAmount: bigint,
    minCeloOut: bigint,
    bypassCode: string = '0x0000000000000000000000000000000000000000000000000000000000000000'
  ): Promise<Hash> => {
    if (!walletClient) throw new Error('Wallet not connected');

    setLoading(true);
    setError(null);

    try {
      // Check current allowance first
      const currentAllowance = await publicClient?.readContract({
        address: GOOD_DOLLAR_ADDRESS as Address,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [account as Address, config.contractAddress]
      });

      // Approve if needed
      if (!currentAllowance || currentAllowance < gsAmount) {
        console.log('Approving GoodDollar tokens...');
        const approveHash = await walletClient.writeContract({
          address: GOOD_DOLLAR_ADDRESS as Address,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [config.contractAddress, gsAmount * 2n], // Approve 2x for multiple transactions
          gas: 100000n
        });
        
        // Wait for approval to be confirmed
        await publicClient?.waitForTransactionReceipt({ hash: approveHash });
        console.log('Approval confirmed');
      }

      // Execute swap and vote
      const hash = await walletClient.writeContract({
        address: config.contractAddress,
        abi: GOOD_DOLLAR_VOTER_ABI,
        functionName: 'swapAndVote',
        args: [campaignId, projectId, gsAmount, minCeloOut, bypassCode as `0x${string}`],
        gas: 1000000n
      });

      return hash;
    } catch (err) {
      setError(`Swap and vote failed: ${err}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [walletClient, publicClient, account, config.contractAddress]);

  // Swap and vote with pool
  const swapAndVoteWithPool = useCallback(async (
    campaignId: bigint,
    projectId: bigint,
    gsAmount: bigint,
    minCeloOut: bigint,
    poolId: bigint,
    bypassCode: string = '0x0000000000000000000000000000000000000000000000000000000000000000'
  ): Promise<Hash> => {
    if (!walletClient) throw new Error('Wallet not connected');

    setLoading(true);
    setError(null);

    try {
      const hash = await walletClient.writeContract({
        address: config.contractAddress,
        abi: GOOD_DOLLAR_VOTER_ABI,
        functionName: 'swapAndVoteWithPool',
        args: [campaignId, projectId, gsAmount, minCeloOut, poolId, bypassCode as `0x${string}`],
        gas: 1000000n
      });

      return hash;
    } catch (err) {
      setError(`Swap and vote with pool failed: ${err}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [walletClient, config.contractAddress]);

  // Get quote
  const getQuote = useCallback(async (gsAmount: bigint): Promise<bigint> => {
    try {
      const data = await publicClient?.readContract({
        address: config.contractAddress,
        abi: GOOD_DOLLAR_VOTER_ABI,
        functionName: 'getQuote',
        args: [gsAmount]
      });
      
      if (typeof data !== 'bigint') {
        throw new Error('Invalid quote data');
      }
      return data;
    } catch (err) {
      setError(`Get quote failed: ${err}`);
      throw err;
    }
  }, [publicClient, config.contractAddress]);

  // Get quote for pool
  const getQuoteForPool = useCallback(async (gsAmount: bigint, poolId: bigint): Promise<bigint> => {
    try {
      const data = await publicClient?.readContract({
        address: config.contractAddress,
        abi: GOOD_DOLLAR_VOTER_ABI,
        functionName: 'getQuoteForPool',
        args: [gsAmount, poolId]
      });
      
      if (typeof data !== 'bigint') {
        throw new Error('Invalid quote data');
      }
      return data;
    } catch (err) {
      setError(`Get quote for pool failed: ${err}`);
      throw err;
    }
  }, [publicClient, config.contractAddress]);

  // Approve GoodDollar
  const approveGoodDollar = useCallback(async (amount: bigint): Promise<Hash> => {
    if (!walletClient) throw new Error('Wallet not connected');

    setLoading(true);
    setError(null);

    try {
      const hash = await walletClient.writeContract({
        address: GOOD_DOLLAR_ADDRESS as Address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [config.contractAddress, amount],
        gas: 100000n
      });

      return hash;
    } catch (err) {
      setError(`Approve failed: ${err}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [walletClient, config.contractAddress]);

  // Get active pools
  const getActivePools = useCallback(async (): Promise<bigint[]> => {
    try {
      const data = await publicClient?.readContract({
        address: config.contractAddress,
        abi: GOOD_DOLLAR_VOTER_ABI,
        functionName: 'getActivePools'
      });
      
      return data as bigint[];
    } catch (err) {
      setError(`Get active pools failed: ${err}`);
      throw err;
    }
  }, [publicClient, config.contractAddress]);

  // Wait for transaction
  const waitForTransaction = useCallback(async (hash: Hash): Promise<TransactionReceipt> => {
    try {
      const receipt = await publicClient?.waitForTransactionReceipt({ 
        hash,
        timeout: 120000 // 2 minute timeout
      });

      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }
      return receipt;
    } catch (err) {
      setError(`Transaction wait failed: ${err}`);
      throw err;
    }
  }, [publicClient]);

  // Refresh token info
  const refreshTokenInfo = useCallback(async () => {
    await loadTokenInfo();
  }, [loadTokenInfo]);

  // Refresh all data
  const refresh = useCallback(async () => {
    await Promise.all([
      loadContractInfo(),
      loadTokenInfo()
    ]);
  }, [loadContractInfo, loadTokenInfo]);

  return {
    contractInfo,
    tokenInfo,
    loading,
    error,
    swapAndVote,
    swapAndVoteWithPool,
    getQuote,
    getQuoteForPool,
    approveGoodDollar,
    getActivePools,
    refreshTokenInfo,
    waitForTransaction,
    refresh
  };
};