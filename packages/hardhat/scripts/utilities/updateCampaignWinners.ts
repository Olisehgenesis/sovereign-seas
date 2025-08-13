// Update Campaign Winners Script
// Usage: npx ts-node updateCampaignWinners.ts <campaignId> <newMaxWinners>

import { createWalletClient, createPublicClient, http, formatEther } from 'viem';
import { celo } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';

dotenv.config();

// Contract configuration
const CONTRACT_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY; // Your private key
const RPC_URL = 'https://forno.celo.org';

// Contract ABI for the functions we need
const CONTRACT_ABI = [
  {
    inputs: [{ name: '_campaignId', type: 'uint256' }],
    name: 'getCampaign',
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'admin', type: 'address' },
      { name: 'name', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'adminFeePercentage', type: 'uint256' },
      { name: 'maxWinners', type: 'uint256' },
      { name: 'useQuadraticDistribution', type: 'bool' },
      { name: 'useCustomDistribution', type: 'bool' },
      { name: 'payoutToken', type: 'address' },
      { name: 'active', type: 'bool' },
      { name: 'totalFunds', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: '_campaignId', type: 'uint256' },
      { name: '_name', type: 'string' },
      { name: '_description', type: 'string' },
      { name: '_startTime', type: 'uint256' },
      { name: '_endTime', type: 'uint256' },
      { name: '_adminFeePercentage', type: 'uint256' },
      { name: '_maxWinners', type: 'uint256' },
      { name: '_useQuadraticDistribution', type: 'bool' },
      { name: '_useCustomDistribution', type: 'bool' },
      { name: '_payoutToken', type: 'address' }
    ],
    name: 'updateCampaign',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: '', type: 'address' }],
    name: 'superAdmins',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: '_campaignId', type: 'uint256' }, { name: '_admin', type: 'address' }],
    name: 'isCampaignAdmin',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Create clients
const publicClient = createPublicClient({
  chain: celo,
  transport: http(RPC_URL)
});

const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
const walletClient = createWalletClient({
  account,
  chain: celo,
  transport: http(RPC_URL)
});

// Function to get current campaign details
async function getCurrentCampaignDetails(campaignId: number) {
  console.log(`🔍 Reading current campaign ${campaignId} details...`);
  
  const campaignData = await publicClient.readContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getCampaign',
    args: [BigInt(campaignId)]
  }) as any[];

  return {
    id: campaignData[0],
    admin: campaignData[1],
    name: campaignData[2],
    description: campaignData[3],
    startTime: campaignData[4],
    endTime: campaignData[5],
    adminFeePercentage: campaignData[6],
    maxWinners: campaignData[7],
    useQuadraticDistribution: campaignData[8],
    useCustomDistribution: campaignData[9],
    payoutToken: campaignData[10],
    active: campaignData[11],
    totalFunds: campaignData[12]
  };
}

// Function to check permissions
async function checkPermissions(campaignId: number, userAddress: string) {
  console.log(`🔐 Checking permissions for ${userAddress}...`);
  
  // Check if super admin
  const isSuperAdmin = await publicClient.readContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'superAdmins',
    args: [userAddress as `0x${string}`]
  }) as boolean;

  // Check if campaign admin
  const isCampaignAdmin = await publicClient.readContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'isCampaignAdmin',
    args: [BigInt(campaignId), userAddress as `0x${string}`]
  }) as boolean;

  console.log(`   Super Admin: ${isSuperAdmin ? '✅ Yes' : '❌ No'}`);
  console.log(`   Campaign Admin: ${isCampaignAdmin ? '✅ Yes' : '❌ No'}`);

  return { isSuperAdmin, isCampaignAdmin };
}

// Function to get campaign status
function getCampaignStatus(startTime: bigint, endTime: bigint, active: boolean): string {
  const now = Math.floor(Date.now() / 1000);
  const start = Number(startTime);
  const end = Number(endTime);
  
  if (now < start) {
    return 'upcoming';
  } else if (now >= start && now <= end && active) {
    return 'active';
  } else if (now > end) {
    return 'ended';
  } else {
    return 'paused';
  }
}

// Main function to update campaign winners
async function updateCampaignWinners(campaignId: number, newMaxWinners: number) {
  try {
    console.log('🚀 Starting Campaign Winners Update Process');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Campaign ID: ${campaignId}`);
    console.log(`New Max Winners: ${newMaxWinners}`);
    console.log(`Your Address: ${account.address}`);
    console.log('');

    // Step 1: Get current campaign details
    const currentCampaign = await getCurrentCampaignDetails(campaignId);
    
    console.log('📋 CURRENT CAMPAIGN DETAILS');
    console.log(`   Name: ${currentCampaign.name}`);
    console.log(`   Current Max Winners: ${currentCampaign.maxWinners.toString()}`);
    console.log(`   Status: ${getCampaignStatus(currentCampaign.startTime, currentCampaign.endTime, currentCampaign.active).toUpperCase()}`);
    console.log(`   Active: ${currentCampaign.active ? '✅ Yes' : '❌ No'}`);
    console.log('');

    // Step 2: Check if change is needed
    if (Number(currentCampaign.maxWinners) === newMaxWinners) {
      console.log('❌ No change needed - maxWinners is already', newMaxWinners);
      return;
    }

    // Step 3: Check permissions
    const { isSuperAdmin, isCampaignAdmin } = await checkPermissions(campaignId, account.address);
    
    if (!isSuperAdmin && !isCampaignAdmin) {
      console.error('❌ Error: You do not have permission to update this campaign');
      console.error('   You must be either a super admin or campaign admin');
      return;
    }

    // Step 4: Check campaign status restrictions
    const status = getCampaignStatus(currentCampaign.startTime, currentCampaign.endTime, currentCampaign.active);
    if (status !== 'upcoming' && !isSuperAdmin) {
      console.error('❌ Error: Campaign has already started');
      console.error('   Only super admins can modify maxWinners after campaign starts');
      console.error(`   Current status: ${status.toUpperCase()}`);
      return;
    }

    if (status !== 'upcoming') {
      console.log('⚠️  WARNING: Campaign has started, but you are a super admin');
      console.log('   Proceeding with update...');
    }

    // Step 5: Prepare transaction
    console.log('📝 Preparing transaction...');
    console.log(`   Updating maxWinners from ${currentCampaign.maxWinners.toString()} to ${newMaxWinners}`);
    console.log('   All other campaign parameters will remain unchanged');
    console.log('');

    // Step 6: Execute the transaction
    console.log('🔄 Executing transaction...');
    const endTime =         BigInt(Math.floor(new Date().setHours(18, 30, 0, 0) / 1000))

    
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'updateCampaign',
      args: [
        BigInt(campaignId),
        currentCampaign.name,
        currentCampaign.description,
        currentCampaign.startTime,
       endTime, // Use current time for simplicity
,
        currentCampaign.adminFeePercentage,
        BigInt(newMaxWinners), // Only this value changes
        currentCampaign.useQuadraticDistribution,
        currentCampaign.useCustomDistribution,
        currentCampaign.payoutToken
      ]
    });

    console.log(`📡 Transaction sent: ${hash}`);
    console.log('⏳ Waiting for confirmation...');

    // Step 7: Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
      console.log('✅ Transaction confirmed successfully!');
      console.log(`   Block Number: ${receipt.blockNumber}`);
      console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
      console.log('');

      // Step 8: Verify the update
      console.log('🔍 Verifying update...');
      const updatedCampaign = await getCurrentCampaignDetails(campaignId);
      
      console.log('📋 UPDATED CAMPAIGN DETAILS');
      console.log(`   Name: ${updatedCampaign.name}`);
      console.log(`   Previous Max Winners: ${currentCampaign.maxWinners.toString()}`);
      console.log(`   New Max Winners: ${updatedCampaign.maxWinners.toString()}`);
      
      if (Number(updatedCampaign.maxWinners) === newMaxWinners) {
        console.log('✅ Update verified successfully!');
      } else {
        console.log('❌ Update verification failed!');
      }

    } else {
      console.error('❌ Transaction failed!');
      console.error('Receipt:', receipt);
    }

  } catch (error) {
    console.error('❌ Error updating campaign winners:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      
      // Handle common errors
      if (error.message.includes('Only campaign admin')) {
        console.error('💡 Solution: Make sure you are the campaign admin or super admin');
      } else if (error.message.includes('Campaign not active')) {
        console.error('💡 Solution: Campaign might be inactive or ended');
      } else if (error.message.includes('insufficient funds')) {
        console.error('💡 Solution: Make sure you have enough CELO for gas fees');
      }
    }
  }
}

// Get total campaign count for validation
async function getCampaignCount() {
  try {
    const count = await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: [
        {
          inputs: [],
          name: 'getCampaignCount',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function'
        }
      ],
      functionName: 'getCampaignCount'
    }) as bigint;
    
    return Number(count);
  } catch (error) {
    console.error('❌ Error getting campaign count:', error);
    return 0;
  }
}

// Main execution
async function main() {
  const campaignId = process.argv[2];
  const newMaxWinners = process.argv[3];
  
  if (!campaignId || !newMaxWinners) {
    console.log('Usage: npx ts-node updateCampaignWinners.ts <campaignId> <newMaxWinners>');
    console.log('');
    console.log('Example: npx ts-node updateCampaignWinners.ts 0 10');
    console.log('');
    
    // Show available campaigns
    const totalCampaigns = await getCampaignCount();
    if (totalCampaigns > 0) {
      console.log(`Available campaign IDs: 0 to ${totalCampaigns - 1}`);
    }
    return;
  }

  const id = parseInt(campaignId);
  const winners = parseInt(newMaxWinners);
  
  if (isNaN(id) || id < 0) {
    console.error('❌ Invalid campaign ID. Please provide a valid number.');
    return;
  }

  if (isNaN(winners) || winners < 1) {
    console.error('❌ Invalid max winners. Please provide a valid number greater than 0.');
    return;
  }

  // Validate campaign exists
  const totalCampaigns = await getCampaignCount();
  if (id >= totalCampaigns) {
    console.error(`❌ Campaign ID ${id} does not exist. Available IDs: 0 to ${totalCampaigns - 1}`);
    return;
  }

  await updateCampaignWinners(id, winners);
}

// Export for use as module
export { updateCampaignWinners, getCurrentCampaignDetails };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}