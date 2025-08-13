import { createWalletClient, createPublicClient, http, parseUnits, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores, celo } from 'viem/chains';
import * as dotenv from 'dotenv';
import { getContract } from 'viem';
import workingProxyArtifact from '../artifacts/contracts/WorkingCeloVotingProxy.sol/WorkingCeloVotingProxy.json';

const workingProxyAbi = workingProxyArtifact.abi;

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
const ENHANCED_CELO_VOTING_PROXY_ADDRESS = process.env.ENHANCED_CELO_VOTING_PROXY_ADDRESS;
const G_TOKEN_ADDRESS = '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A';

const CAMPAIGN_ID = 1;
const PROJECT_ID = 0;
const AMOUNT = parseUnits('1', 18); // Start with 1 G$ for testing
const BYPASS_CODE = '0x0000000000000000000000000000000000000000000000000000000000000000';

const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function allowance(address owner, address spender) public view returns (uint256)',
  'function balanceOf(address owner) public view returns (uint256)',
  'function decimals() public view returns (uint8)',
  'function symbol() public view returns (string)'
]);

const SOVEREIGN_SEAS_ABI = parseAbi([
  'function getCampaign(uint256) external view returns (uint256 id, address admin, string memory name, string memory description, uint256 startTime, uint256 endTime, uint256 adminFeePercentage, uint256 maxWinners, bool useQuadraticDistribution, bool useCustomDistribution, address payoutToken, bool active, uint256 totalFunds)',
  'function getProject(uint256) external view returns (uint256 id, address owner, string memory name, string memory description, bool transferrable, bool active, uint256 createdAt, uint256[] memory campaignIds)',
  'function getParticipation(uint256, uint256) external view returns (bool approved, uint256 voteCount, uint256 fundsReceived)'
]);

const args = process.argv.slice(2);
const isMainnet = args.includes('--network') && args[args.indexOf('--network') + 1] === 'celo' ||
  RPC_URL.includes('rpc.ankr.com/celo') ||
  process.env.NETWORK === 'celo';
const chain = isMainnet ? celo : celoAlfajores;

if (!PRIVATE_KEY || !ENHANCED_CELO_VOTING_PROXY_ADDRESS) {
  console.error('Missing PRIVATE_KEY or ENHANCED_CELO_VOTING_PROXY_ADDRESS in env');
  process.exit(1);
}

async function testWorkingProxy() {
  console.log('🚀 Testing Working Celo Voting Proxy...\n');

  const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(RPC_URL)
  });

  const publicClient = createPublicClient({
    chain,
    transport: http(RPC_URL)
  });

  console.log(`Account: ${account.address}`);
  console.log(`Network: ${chain.name}`);
  console.log(`Working Proxy: ${ENHANCED_CELO_VOTING_PROXY_ADDRESS}`);
  console.log(`G Token: ${G_TOKEN_ADDRESS}\n`);

  // Check G$ token
  const gTokenContract = getContract({
    address: G_TOKEN_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    client: publicClient
  });

  const [balance, allowance, symbol] = await Promise.all([
    gTokenContract.read.balanceOf([account.address]),
    gTokenContract.read.allowance([account.address, ENHANCED_CELO_VOTING_PROXY_ADDRESS as `0x${string}`]),
    gTokenContract.read.symbol()
  ]);

  console.log(`${symbol} Token Status:`);
  console.log(`- Balance: ${Number(balance) / 1e18} ${symbol}`);
  console.log(`- Allowance: ${Number(allowance) / 1e18} ${symbol}`);
  console.log(`- Amount to vote: ${Number(AMOUNT) / 1e18} ${symbol}\n`);

  if (balance < AMOUNT) {
    console.error(`❌ Insufficient ${symbol} balance!`);
    return;
  }

  // Check Working Proxy configuration
  const proxyContract = getContract({
    address: ENHANCED_CELO_VOTING_PROXY_ADDRESS as `0x${string}`,
    abi: workingProxyAbi,
    client: publicClient
  });

  const config = await proxyContract.read.getConfiguration();
  console.log('✅ Working Proxy Configuration:');
  console.log(`- Universal Router: ${config[0]}`);
  console.log(`- SovereignSeas: ${config[1]}`);
  console.log(`- WCELO: ${config[2]}`);
  console.log(`- Slippage: ${config[3]} (${Number(config[3])/100}%)\n`);

  // Verify this is the working Universal Router
  if ((config[0] as string).toLowerCase() === '0x643770E279d5D0733F21d6DC03A8efbABf3255B4'.toLowerCase()) {
    console.log('🎯 ✅ Confirmed: Using the WORKING Universal Router V1 2!\n');
  } else {
    console.error('❌ Warning: Not using the proven working Universal Router!');
  }

  // Check SovereignSeas campaign and project
  const sovereignSeasContract = getContract({
    address: config[1] as `0x${string}`,
    abi: SOVEREIGN_SEAS_ABI,
    client: publicClient
  });

  // Quick campaign check
  try {
    const campaign = await sovereignSeasContract.read.getCampaign([BigInt(CAMPAIGN_ID)]);
    console.log(`📋 Campaign ${CAMPAIGN_ID}: ${campaign[2]} - Active: ${campaign[11]}`);
    
    const project = await sovereignSeasContract.read.getProject([BigInt(PROJECT_ID)]);
    console.log(`🏗️ Project ${PROJECT_ID}: ${project[2]} - Active: ${project[5]}`);
    
    const participation = await sovereignSeasContract.read.getParticipation([BigInt(CAMPAIGN_ID), BigInt(PROJECT_ID)]);
    console.log(`✅ Project approved for campaign: ${participation[0]}\n`);
    
    if (!campaign[11] || !project[5] || !participation[0]) {
      console.error('❌ Campaign/Project not ready for voting');
      return;
    }
  } catch (error) {
    console.error('❌ Error checking campaign/project:', error);
    return;
  }

  // Test swap estimate
  try {
    const estimate = await proxyContract.read.getSwapEstimate([G_TOKEN_ADDRESS as `0x${string}`, AMOUNT]);
    console.log('📊 Swap Estimate:');
    console.log(`- Estimated CELO: ${Number(estimate[0]) / 1e18} CELO`);
    console.log(`- Can Swap: ${estimate[1]}\n`);
  } catch (error) {
    console.log('⚠️ Could not get swap estimate (this is OK for testing)\n');
  }

  // Approve if needed
  if (allowance < AMOUNT) {
    console.log('⏳ Approving G$ tokens...');
    const approveHash = await walletClient.writeContract({
      address: G_TOKEN_ADDRESS as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [ENHANCED_CELO_VOTING_PROXY_ADDRESS as `0x${string}`, AMOUNT * 2n]
    });
    
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    console.log('✅ Approval confirmed\n');
  }

  // Execute the vote
  console.log('🗳️ Executing vote with Working Proxy...');
  console.log('📋 Process: G$ → Universal Router V1 2 → CELO → SovereignSeas Vote\n');

  try {
    // Simulate first
    // console.log('🧪 Simulating transaction...');
    // await publicClient.simulateContract({
    //   account: account.address,
    //   address: ENHANCED_CELO_VOTING_PROXY_ADDRESS as `0x${string}`,
    //   abi: workingProxyAbi,
    //   functionName: 'voteWithToken',
    //   args: [CAMPAIGN_ID, PROJECT_ID, G_TOKEN_ADDRESS, AMOUNT, BYPASS_CODE]
    // });

    // console.log('✅ Simulation successful! Executing...\n');

    const voteHash = await walletClient.writeContract({
      address: ENHANCED_CELO_VOTING_PROXY_ADDRESS as `0x${string}`,
      abi: workingProxyAbi,
      functionName: 'voteWithToken',
      args: [CAMPAIGN_ID, PROJECT_ID, G_TOKEN_ADDRESS, AMOUNT, BYPASS_CODE],
      gas: 1000000n
    });

    console.log(`🎉 Vote transaction: ${voteHash}`);
    console.log(`🔗 CeloScan: https://celoscan.io/tx/${voteHash}\n`);

    const receipt = await publicClient.waitForTransactionReceipt({ hash: voteHash });
    
    if (receipt.status === 'success') {
      console.log('🎯 SUCCESS! G$ → CELO → Vote completed!');
      console.log(`⛽ Gas used: ${receipt.gasUsed.toLocaleString()}`);
    } else {
      console.log('❌ Transaction failed');
    }

  } catch (error: any) {
    console.error('❌ Transaction failed:');
    
    if (error.cause?.reason) {
      console.error(`Reason: ${error.cause.reason}`);
    }
    
    console.error('🔧 Try:');
    console.error('- Smaller amount (0.1 G$ instead of 1)');
    console.error('- Check liquidity on Uniswap');
    console.error('- Verify router is working');
  }
}

async function main() {
  // Check if contract exists
  const publicClient = createPublicClient({
    chain,
    transport: http(RPC_URL)
  });

  const code = await publicClient.getBytecode({
    address: ENHANCED_CELO_VOTING_PROXY_ADDRESS as `0x${string}`
  });
  
  if (!code || code === '0x') {
    console.error('❌ Working proxy not deployed at this address!');
    process.exit(1);
  }
  
  console.log('✅ Working proxy contract found\n');
  await testWorkingProxy();
}

main().catch(console.error);