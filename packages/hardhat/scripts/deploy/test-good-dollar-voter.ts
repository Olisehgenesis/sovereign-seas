import { createWalletClient, createPublicClient, http, parseUnits, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores, celo } from 'viem/chains';
import * as dotenv from 'dotenv';
import { getContract } from 'viem';
import goodDollarVoterArtifact from '../artifacts/contracts/GoodDollarVoter.sol/GoodDollarVoter.json';

const goodDollarVoterAbi = goodDollarVoterArtifact.abi;

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
const GOOD_DOLLAR_VOTER_ADDRESS = process.env.GOOD_DOLLAR_VOTER_ADDRESS;
const GOOD_DOLLAR_ADDRESS = '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A'; // GoodDollar token

const CAMPAIGN_ID = 1;
const PROJECT_ID = 0;
const AMOUNT = parseUnits('1', 18); // Start with 1 G$ for testing
const MIN_CELO_OUT = parseUnits('0.001', 18); // Minimum CELO to receive (adjust based on current rates)
const BYPASS_CODE = '0x0000000000000000000000000000000000000000000000000000000000000000';

const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function allowance(address owner, address spender) public view returns (uint256)',
  'function balanceOf(address owner) public view returns (uint256)',
  'function decimals() public view returns (uint8)',
  'function symbol() public view returns (string)',
  'function name() public view returns (string)'
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

if (!PRIVATE_KEY || !GOOD_DOLLAR_VOTER_ADDRESS) {
  console.error('Missing PRIVATE_KEY or GOOD_DOLLAR_VOTER_ADDRESS in env');
  console.error('Required environment variables:');
  console.error('- PRIVATE_KEY=your_private_key');
  console.error('- GOOD_DOLLAR_VOTER_ADDRESS=0x... (from deployment)');
  process.exit(1);
}

async function testGoodDollarVoter() {
  console.log('🚀 Testing GoodDollarVoter Contract...\n');

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
  console.log(`GoodDollarVoter: ${GOOD_DOLLAR_VOTER_ADDRESS}`);
  console.log(`GoodDollar Token: ${GOOD_DOLLAR_ADDRESS}\n`);

  // Check if contract exists
  const contractCode = await publicClient.getBytecode({
    address: GOOD_DOLLAR_VOTER_ADDRESS as `0x${string}`
  });
  
  if (!contractCode || contractCode === '0x') {
    console.error('❌ GoodDollarVoter contract not found at this address!');
    console.error('Make sure you deployed it first: npm run deploy:good-dollar-voter');
    return;
  }
  
  console.log('✅ GoodDollarVoter contract found\n');

  // Check GoodDollar token
  const goodDollarContract = getContract({
    address: GOOD_DOLLAR_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    client: publicClient
  });

  let balance, allowance, symbol, name;
  try {
    [balance, allowance, symbol, name] = await Promise.all([
      goodDollarContract.read.balanceOf([account.address]),
      goodDollarContract.read.allowance([account.address, GOOD_DOLLAR_VOTER_ADDRESS as `0x${string}`]),
      goodDollarContract.read.symbol(),
      goodDollarContract.read.name()
    ]);
  } catch (error) {
    console.error('❌ Error reading GoodDollar token:', error);
    console.error('Make sure the GoodDollar token address is correct');
    return;
  }

  console.log(`${name} (${symbol}) Token Status:`);
  console.log(`- Balance: ${Number(balance) / 1e18} ${symbol}`);
  console.log(`- Allowance: ${Number(allowance) / 1e18} ${symbol}`);
  console.log(`- Amount to vote: ${Number(AMOUNT) / 1e18} ${symbol}\n`);

  if (balance < AMOUNT) {
    console.error(`❌ Insufficient ${symbol} balance!`);
    console.error(`You need at least ${Number(AMOUNT) / 1e18} ${symbol} to test`);
    console.error('💡 Get GoodDollar tokens from their faucet or exchange');
    return;
  }

  // Check GoodDollarVoter configuration
  const voterContract = getContract({
    address: GOOD_DOLLAR_VOTER_ADDRESS as `0x${string}`,
    abi: goodDollarVoterAbi,
    client: publicClient
  });

  let isOperational, sovereignSeas, pool, celo, goodDollar;
  try {
    [isOperational, sovereignSeas, pool, celo, goodDollar] = await Promise.all([
      voterContract.read.isOperational(),
      voterContract.read.sovereignSeas(),
      voterContract.read.pool(),
      voterContract.read.celo(),
      voterContract.read.goodDollar()
    ]);
  } catch (error) {
    console.error('❌ Error reading GoodDollarVoter config:', error);
    return;
  }

  console.log('✅ GoodDollarVoter Configuration:');
  console.log(`- Operational: ${isOperational}`);
  console.log(`- SovereignSeas: ${sovereignSeas}`);
  console.log(`- Uniswap Pool: ${pool}`);
  console.log(`- CELO Token: ${celo}`);
  console.log(`- GoodDollar Token: ${goodDollar}\n`);

  if (!isOperational) {
    console.error('❌ Contract is not operational!');
    console.error('This could mean:');
    console.error('- Uniswap pool is locked');
    console.error('- Pool has no liquidity');
    console.error('- Pool configuration issue');
    return;
  }

  // Check SovereignSeas campaign and project
  const sovereignSeasContract = getContract({
    address: sovereignSeas as `0x${string}`,
    abi: SOVEREIGN_SEAS_ABI,
    client: publicClient
  });

  console.log('🔍 Checking SovereignSeas campaign and project...');
  try {
    const campaign = await sovereignSeasContract.read.getCampaign([BigInt(CAMPAIGN_ID)]);
    console.log(`📋 Campaign ${CAMPAIGN_ID}: ${campaign[2]} - Active: ${campaign[11]}`);
    
    const project = await sovereignSeasContract.read.getProject([BigInt(PROJECT_ID)]);
    console.log(`🏗️ Project ${PROJECT_ID}: ${project[2]} - Active: ${project[5]}`);
    
    const participation = await sovereignSeasContract.read.getParticipation([BigInt(CAMPAIGN_ID), BigInt(PROJECT_ID)]);
    console.log(`✅ Project approved for campaign: ${participation[0]}\n`);
    
    if (!campaign[11] || !project[5] || !participation[0]) {
      console.error('❌ Campaign/Project not ready for voting');
      console.error('Make sure:');
      console.error('- Campaign is active');
      console.error('- Project is active');
      console.error('- Project is approved for the campaign');
      return;
    }
  } catch (error) {
    console.error('❌ Error checking campaign/project:', error);
    console.error('Make sure CAMPAIGN_ID and PROJECT_ID are correct');
    return;
  }

  // Test quote functionality
  try {
    console.log('📊 Getting swap quote...');
    const quote = await voterContract.read.getQuote([AMOUNT]);
    console.log(`- Estimated CELO output: ${Number(quote) / 1e18} CELO`);
    
    if (quote === 0n) {
      console.warn('⚠️ Quote returned 0 - this might indicate liquidity issues');
    }
    
    // Adjust MIN_CELO_OUT based on quote if needed
    if (quote > 0n && MIN_CELO_OUT > quote) {
      console.warn(`⚠️ MIN_CELO_OUT (${Number(MIN_CELO_OUT) / 1e18}) is higher than quote (${Number(quote) / 1e18})`);
      console.warn('Consider lowering MIN_CELO_OUT or increasing AMOUNT');
    }
    console.log('');
  } catch (error) {
    console.log('⚠️ Could not get quote (this may be normal for some pools)\n');
  }

  // Approve GoodDollar if needed
  if (allowance < AMOUNT) {
    console.log('⏳ Approving GoodDollar tokens...');
    try {
      const approveHash = await walletClient.writeContract({
        address: GOOD_DOLLAR_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [GOOD_DOLLAR_VOTER_ADDRESS as `0x${string}`, AMOUNT * 2n], // Approve 2x for multiple tests
        gas: 100000n
      });
      
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
      console.log('✅ Approval confirmed\n');
    } catch (error) {
      console.error('❌ Failed to approve tokens:', error);
      return;
    }
  } else {
    console.log('✅ Sufficient allowance already exists\n');
  }

  // Execute the swap and vote
  console.log('🗳️ Executing GoodDollar → CELO → Vote...');
  console.log('📋 Process: GS → Uniswap V3 → WCELO → SovereignSeas Vote\n');

  try {
    // Test simulation first (optional, comment out if causing issues)
    console.log('🧪 Simulating transaction...');
    await publicClient.simulateContract({
      account: account.address,
      address: GOOD_DOLLAR_VOTER_ADDRESS as `0x${string}`,
      abi: goodDollarVoterAbi,
      functionName: 'swapAndVote',
      args: [
        BigInt(CAMPAIGN_ID),
        BigInt(PROJECT_ID), 
        AMOUNT,
        MIN_CELO_OUT,
        BYPASS_CODE as `0x${string}`
      ]
    });

    console.log('✅ Simulation successful! Executing...\n');

    const voteHash = await walletClient.writeContract({
      address: GOOD_DOLLAR_VOTER_ADDRESS as `0x${string}`,
      abi: goodDollarVoterAbi,
      functionName: 'swapAndVote',
      args: [
        BigInt(CAMPAIGN_ID),
        BigInt(PROJECT_ID),
        AMOUNT,
        MIN_CELO_OUT,
        BYPASS_CODE as `0x${string}`
      ],
      gas: 1500000n // Higher gas limit for complex transaction
    });

    console.log(`🎉 Vote transaction submitted: ${voteHash}`);
    console.log(`🔗 CeloScan: https://celoscan.io/tx/${voteHash}\n`);

    console.log('⏳ Waiting for confirmation...');
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash: voteHash,
      timeout: 120000 // 2 minute timeout
    });
    
    if (receipt.status === 'success') {
      console.log('🎯 SUCCESS! GoodDollar → CELO → Vote completed!');
      console.log(`⛽ Gas used: ${receipt.gasUsed.toLocaleString()}`);
      console.log(`📦 Block: ${receipt.blockNumber}`);
      
      // Check for SwapAndVote event
      const logs = receipt.logs;
      console.log(`📊 Transaction generated ${logs.length} events`);
      
      // Check new balance
      const newBalance = await goodDollarContract.read.balanceOf([account.address]);
      const spent = balance - newBalance;
      console.log(`💰 GoodDollar spent: ${Number(spent) / 1e18} ${symbol}`);
      
    } else {
      console.log('❌ Transaction failed');
      console.log('Check the transaction on CeloScan for more details');
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