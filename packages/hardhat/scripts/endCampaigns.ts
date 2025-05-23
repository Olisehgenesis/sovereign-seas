import { createWalletClient, createPublicClient, http } from 'viem';
import { celoAlfajores } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';
import sovereignSeasV4Abi from '../artifacts/contracts/SovereignSeasV4.sol/SovereignSeasV4.json';

dotenv.config();

const RPC_URL = process.env.CELO_RPC_URL;
const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CELO_TOKEN_ADDRESS = process.env.CELO_TOKEN_ADDRESS || "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

if (!RPC_URL || !SOVEREIGN_SEAS_V4_ADDRESS || !PRIVATE_KEY) {
  throw new Error('Missing required environment variables: CELO_RPC_URL, SOVEREIGN_SEAS_V4_ADDRESS, PRIVATE_KEY');
}

async function endCampaign(campaignId: number, walletClient: any, publicClient: any) {
  try {
    console.log(`Ending campaign ${campaignId}...`);
    
    // Get current campaign data
    const campaign = await publicClient.readContract({
      address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
      abi: sovereignSeasV4Abi.abi,
      functionName: 'campaigns',
      args: [campaignId]
    });

    console.log('Current campaign data:', campaign);

    // Set end time to 18:14
    const now = new Date();
    const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 14, 0);
    const endTimeUnix = Math.floor(endTime.getTime() / 1000);

    // Ensure all required fields are present and have default values if undefined
    const campaignData = {
      name: campaign.name || '',
      description: campaign.description || '',
      startTime: campaign.startTime || 0n,
      adminFeePercentage: campaign.adminFeePercentage || 0n,
      maxWinners: campaign.maxWinners || 0n,
      useQuadraticDistribution: campaign.useQuadraticDistribution || false,
      useCustomDistribution: campaign.useCustomDistribution || false,
      payoutToken: campaign.payoutToken || CELO_TOKEN_ADDRESS
    };

    console.log('Prepared campaign data:', campaignData);

    // Update campaign with new end time
    const { request } = await publicClient.simulateContract({
      account: walletClient.account,
      address: SOVEREIGN_SEAS_V4_ADDRESS as `0x${string}`,
      abi: sovereignSeasV4Abi.abi,
      functionName: 'updateCampaign',
      args: [
        campaignId,
        campaignData.name,
        campaignData.description,
        campaignData.startTime,
        endTimeUnix,
        campaignData.adminFeePercentage,
        campaignData.maxWinners,
        campaignData.useQuadraticDistribution,
        campaignData.useCustomDistribution,
        campaignData.payoutToken
      ]
    });

    const hash = await walletClient.writeContract(request);
    console.log(`Campaign end time update transaction submitted: ${hash}`);
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === 'success') {
      console.log(`✅ Campaign ${campaignId} will end at 18:14!`);
      return true;
    } else {
      console.log(`❌ Failed to update campaign ${campaignId} end time`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating campaign ${campaignId}:`, error);
    return false;
  }
}

async function main() {
  try {
    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: celoAlfajores,
      transport: http(RPC_URL)
    });
    const publicClient = createPublicClient({
      chain: celoAlfajores,
      transport: http(RPC_URL)
    });

    console.log('🚀 Setting campaign end times to 18:14...');
    
    // End campaigns 0 and 1
    for (let i = 0; i <= 1; i++) {
      await endCampaign(i, walletClient, publicClient);
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds between transactions
    }

    console.log('\n🎉 Campaign end times updated successfully!');
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