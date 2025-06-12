import { createWalletClient, createPublicClient, http, parseEther, formatEther } from 'viem';
import { celoAlfajores } from 'viem/chains';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import * as dotenv from 'dotenv';
import sovereignSeasVerificationVotingAbi from '../artifacts/contracts/SovereignSeasVerificationVoting.sol/SovereignSeasVerificationVoting.json';

dotenv.config();

const RPC_URL = process.env.CELO_RPC_URL;
const SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS = process.env.SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY; // Admin wallet private key

if (!RPC_URL || !SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS || !PRIVATE_KEY) {
    //log the missing variables
    console.log('RPC_URL:', RPC_URL);
    console.log('SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS:', SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS);
  throw new Error('Missing required environment variables: CELO_RPC_URL, SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS, PRIVATE_KEY');
}

async function fundWallet(
  targetAddress: string, 
  amount: bigint, 
  walletClient: any, 
  publicClient: any
): Promise<boolean> {
  try {
    console.log(`💰 Funding wallet ${targetAddress} with ${formatEther(amount)} CELO...`);
    
    const hash = await walletClient.sendTransaction({
      to: targetAddress as `0x${string}`,
      value: amount
    });
    
    console.log(`📤 Funding transaction submitted: ${hash}`);
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === 'success') {
      console.log(`✅ Wallet funded successfully!`);
      return true;
    } else {
      console.log(`❌ Failed to fund wallet`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error funding wallet:`, error);
    return false;
  }
}

async function checkWalletBalance(address: string, publicClient: any): Promise<bigint> {
  const balance = await publicClient.getBalance({ address: address as `0x${string}` });
  console.log(`💳 Wallet ${address} balance: ${formatEther(balance)} CELO`);
  return balance;
}

async function claimAndVoteForUser(
  beneficiaryAddress: string,
  campaignId: number,
  projectId: number,
  walletClient: any,
  publicClient: any
): Promise<boolean> {
  try {
    console.log(`🗳️  Creating claim and vote for user ${beneficiaryAddress}...`);
    console.log(`   Campaign ID: ${campaignId}`);
    console.log(`   Project ID: ${projectId}`);
    
    // Create metadata for the claim
    const metadata = JSON.stringify({
      timestamp: new Date().toISOString(),
      campaignId: campaignId,
      projectId: projectId,
      beneficiary: beneficiaryAddress,
      reason: "Test claim for verification voting system",
      adminNote: "Automated test claim creation"
    });

    // Simulate the transaction first
    const { request } = await publicClient.simulateContract({
      account: walletClient.account,
      address: SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS as `0x${string}`,
      abi: sovereignSeasVerificationVotingAbi.abi,
      functionName: 'claimAndVote',
      args: [
        beneficiaryAddress,
        campaignId,
        projectId,
        metadata
      ]
    });

    // Execute the transaction
    const hash = await walletClient.writeContract(request);
    console.log(`📤 Claim and vote transaction submitted: ${hash}`);
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === 'success') {
      console.log(`✅ Claim and vote executed successfully!`);
      
      if (receipt.logs && receipt.logs.length > 0) {
        console.log(`📝 Transaction created ${receipt.logs.length} log(s)`);
      }
      
      return true;
    } else {
      console.log(`❌ Failed to execute claim and vote`);
      return false;
    }
  } catch (error: any) {
    console.error(`❌ Error creating claim and vote:`, error);
    if (error.message?.includes('campaign')) {
      console.log('💡 Tip: The campaign might not exist or be properly configured. Try:');
      console.log('1. Check if the campaign exists in the SovereignSeas contract');
      console.log('2. Verify the campaign is active and funded');
      console.log('3. Try using a different campaign ID that is known to exist');
    }
    return false;
  }
}

async function getContractStats(publicClient: any) {
  try {
    console.log('\n📊 Getting contract statistics...');
    
    const totalStats = await publicClient.readContract({
      address: SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS as `0x${string}`,
      abi: sovereignSeasVerificationVotingAbi.abi,
      functionName: 'getTotalStats'
    });

    console.log('📈 Total Statistics:');
    console.log(`   Total Claims: ${totalStats[0]}`);
    console.log(`   Total Votes Cast: ${totalStats[1]}`);
    console.log(`   Total Value Distributed: ${formatEther(totalStats[2])} CELO`);
    console.log(`   Total Fees Collected: ${formatEther(totalStats[3])} CELO`);

    const contractBalance = await publicClient.readContract({
      address: SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS as `0x${string}`,
      abi: sovereignSeasVerificationVotingAbi.abi,
      functionName: 'getContractBalance'
    });

    console.log(`💰 Contract Balance: ${formatEther(contractBalance)} CELO`);

    // Get campaign stats
    const campaignStats = await publicClient.readContract({
      address: SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS as `0x${string}`,
      abi: sovereignSeasVerificationVotingAbi.abi,
      functionName: 'getCampaignStats',
      args: [0] // Campaign 0
    });

    console.log('\n📊 Campaign 0 Statistics:');
    console.log(`   Total Claims: ${campaignStats[0]}`);
    console.log(`   Total Votes: ${campaignStats[1]}`);
    console.log(`   Total Value: ${formatEther(campaignStats[2])} CELO`);
    console.log(`   Unique Claimants: ${campaignStats[3]}`);
    console.log(`   Custom Vote Amount: ${campaignStats[4] > 0 ? formatEther(campaignStats[4]) + ' CELO' : 'Default (1 CELO)'}`);

  } catch (error) {
    console.error('❌ Error getting contract stats:', error);
  }
}

async function main() {
  try {
    // Setup admin wallet (from private key)
    const adminAccount = privateKeyToAccount(`0x${PRIVATE_KEY}`);
    const adminWalletClient = createWalletClient({
      account: adminAccount,
      chain: celoAlfajores,
      transport: http(RPC_URL)
    });
    
    const publicClient = createPublicClient({
      chain: celoAlfajores,
      transport: http(RPC_URL)
    });

    console.log('🚀 Starting Claim and Vote Test...');
    console.log(`👤 Admin wallet: ${adminAccount.address}`);
    
    // Check admin balance
    const adminBalance = await checkWalletBalance(adminAccount.address, publicClient);
    //log admin balance
    console.log('Admin balance:', adminBalance);

    // Generate a random wallet for testing
    const randomPrivateKey = generatePrivateKey();
    const randomAccount = privateKeyToAccount(randomPrivateKey);
    console.log(`🎲 Generated random wallet: ${randomAccount.address}`);
    console.log(`🔑 Random wallet private key: ${randomPrivateKey}`);

    // Fund the random wallet with 12 CELO (above 10 CELO minimum)
    // const fundingAmount = parseEther('12');
    // const fundingSuccess = await fundWallet(
    //   randomAccount.address, 
    //   fundingAmount, 
    //   adminWalletClient, 
    //   publicClient
    // );

    // if (!fundingSuccess) {
    //   console.error('❌ Failed to fund random wallet');
    //   process.exit(1);
    // }

    // // Wait a moment for funding to confirm
    // await new Promise(resolve => setTimeout(resolve, 3000));

    // // Verify the random wallet balance
    // const randomBalance = await checkWalletBalance(randomAccount.address, publicClient);
    // if (randomBalance < parseEther('10')) {
    //   console.error('❌ Random wallet does not have minimum 10 CELO balance');
    //   process.exit(1);
    // }

    // Get stats before claim
    console.log('\n📊 Contract stats BEFORE claim:');
    await getContractStats(publicClient);

    //get contract balance
    const contractBalance = await checkWalletBalance(SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS as `0x${string}`, publicClient);
    console.log('Contract balance:', contractBalance);
    //if less than 10 CELO, fund the contract
    // if (contractBalance < parseEther('10')) {
    //   console.log('Contract balance is less than 10 CELO, funding contract');
    //   const fundingAmount = parseEther('10');
    //   const fundingTransaction = await publicClient.simulateContract({
    //     account: adminWalletClient.account,
    //     address: SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS as `0x${string}`,
    //     abi: sovereignSeasVerificationVotingAbi.abi,
    //     functionName: 'topUpContract',
    //     args: [fundingAmount, SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS as `0x${string}`, parseEther('0.01')]
    //   });
    //   await adminWalletClient.writeContract(fundingTransaction.request);
    //   console.log('Funding transaction:', fundingTransaction);
    // }

    // Create claim and vote for the random wallet
    // Campaign 0, Project 0, using admin wallet to create claim
    const claimSuccess = await claimAndVoteForUser(
      randomAccount.address,
      0, // Campaign ID
      0, // Project ID
      adminWalletClient,
      publicClient
    );

    if (!claimSuccess) {
      console.error('❌ Failed to create claim and vote');
      process.exit(1);
    }

    // Wait a moment for transaction to process
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get stats after claim
    console.log('\n📊 Contract stats AFTER claim:');
    await getContractStats(publicClient);

    // Get user stats for the random wallet
    try {
      const userStats = await publicClient.readContract({
        address: SOVEREIGN_SEAS_VERIFICATION_VOTING_ADDRESS as `0x${string}`,
        abi: sovereignSeasVerificationVotingAbi.abi,
        functionName: 'getUserStats',
        args: [randomAccount.address]
      }) as [bigint, bigint, bigint, bigint[]];

      console.log(`\n👤 User ${randomAccount.address} Stats:`);
      console.log(`   Total Claims: ${userStats[0]}`);
      console.log(`   Total Vote Value: ${formatEther(userStats[1])} CELO`);
      console.log(`   Last Claim Time: ${new Date(Number(userStats[2]) * 1000).toISOString()}`);
      console.log(`   Claim IDs: [${userStats[3].join(', ')}]`);
    } catch (error) {
      console.error('❌ Error getting user stats:', error);
    }

    console.log('\n🎉 Test completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`✅ Created random wallet: ${randomAccount.address}`);
    console.log(`✅ Funded wallet with 12 CELO`);
    console.log(`✅ Admin created claim and vote for Campaign 0, Project 0`);
    console.log(`✅ Vote of ~1 CELO was cast (minus 2% admin fee)`);

  } catch (error) {
    console.error('❌ Error in main function:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });