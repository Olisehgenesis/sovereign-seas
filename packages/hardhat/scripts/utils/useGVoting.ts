import { createWalletClient, createPublicClient, http, parseUnits, parseAbi, GetContractReturnType } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores, celo, Chain } from 'viem/chains';
import { getContract } from 'viem';

// You may want to import ABIs from your artifacts or pass them as parameters
import goodDollarVoterArtifact from '../../artifacts/contracts/GoodDollarVoter.sol/GoodDollarVoter.json';

const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function allowance(address owner, address spender) public view returns (uint256)',
  'function balanceOf(address owner) public view returns (uint256)',
  'function decimals() public view returns (uint8)',
  'function symbol() public view returns (string)',
  'function name() public view returns (string)'
]);

export type UseGVotingParams = {
  privateKey: string;
  rpcUrl: string;
  goodDollarVoterAddress: string;
  goodDollarAddress: string;
  campaignId: number;
  projectId: number;
  amount: bigint; // in wei
  minCusdOut: bigint; // in wei
  bypassCode?: string;
  chainId?: number;
  goodDollarVoterAbi?: any;
};

export async function useGVoting({
  privateKey,
  rpcUrl,
  goodDollarVoterAddress,
  goodDollarAddress,
  campaignId,
  projectId,
  amount,
  minCusdOut,
  bypassCode = '0x0000000000000000000000000000000000000000000000000000000000000000',
  chainId = 42220, // default to Celo mainnet
  goodDollarVoterAbi = goodDollarVoterArtifact.abi
}: UseGVotingParams) {
  // Select chain
  const chain: Chain = chainId === 42220 ? celo : celoAlfajores;
  const account = privateKeyToAccount(`0x${privateKey}`);
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

  // Check contract code
  const contractCode = await publicClient.getBytecode({ address: goodDollarVoterAddress as `0x${string}` });
  if (!contractCode || contractCode === '0x') throw new Error('GoodDollarVoter contract not found at this address!');

  // GoodDollar token contract
  const goodDollarContract = getContract({
    address: goodDollarAddress as `0x${string}`,
    abi: ERC20_ABI,
    client: publicClient
  });

  // Check balance and allowance
  const [balance, allowance] = await Promise.all([
    goodDollarContract.read.balanceOf([account.address]),
    goodDollarContract.read.allowance([account.address, goodDollarVoterAddress as `0x${string}`])
  ]);
  if (balance < amount) throw new Error('Insufficient GoodDollar balance');

  // Approve if needed
  if (allowance < amount) {
    const approveHash = await walletClient.writeContract({
      address: goodDollarAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [goodDollarVoterAddress as `0x${string}`, amount * 2n],
      gas: 100000n
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
  }

  // GoodDollarVoter contract
  const voterContract = getContract({
    address: goodDollarVoterAddress as `0x${string}`,
    abi: goodDollarVoterAbi,
    client: publicClient
  });

  // Simulate transaction
  await publicClient.simulateContract({
    account: account.address,
    address: goodDollarVoterAddress as `0x${string}`,
    abi: goodDollarVoterAbi,
    functionName: 'swapAndVote',
    args: [
      BigInt(campaignId),
      BigInt(projectId),
      amount,
      minCusdOut,
      bypassCode as `0x${string}`
    ]
  });

  // Execute transaction
  const voteHash = await walletClient.writeContract({
    address: goodDollarVoterAddress as `0x${string}`,
    abi: goodDollarVoterAbi,
    functionName: 'swapAndVote',
    args: [
      BigInt(campaignId),
      BigInt(projectId),
      amount,
      minCusdOut,
      bypassCode as `0x${string}`
    ],
    gas: 1000000n
  });

  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash: voteHash, timeout: 120000 });
  return receipt;
} 