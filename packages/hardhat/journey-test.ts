import { createPublicClient, createWalletClient, http, parseEther, encodeFunctionData, decodeFunctionResult } from 'viem';
import { celoAlfajores } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';

// Load deployment, test state, and wallets
const deployment = JSON.parse(fs.readFileSync('deployments/alfajores/latest.json', 'utf8'));
const testState = JSON.parse(fs.readFileSync('tests-state/alfajores.json', 'utf8'));
const walletsData = JSON.parse(fs.readFileSync('wallets/alfajores-wallets.json', 'utf8'));

// Get wallet 3 (index 2 in array)
const wallet3 = walletsData.wallets[2]; // Index 2 for wallet 3
console.log(`👛 Using Wallet 3: ${wallet3.address}`);

// Setup clients
const publicClient = createPublicClient({
  chain: celoAlfajores,
  transport: http('https://alfajores-forno.celo-testnet.org')
});

const account = privateKeyToAccount(wallet3.privateKey as `0x${string}`);

const walletClient = createWalletClient({
  account,
  chain: celoAlfajores,
  transport: http('https://alfajores-forno.celo-testnet.org')
});

// ABIs
const SOVEREIGN_SEAS_V5_ABI = [
  {
    inputs: [
      { name: '_moduleId', type: 'string' },
      { name: '_data', type: 'bytes' }
    ],
    name: 'callModule',
    outputs: [{ name: '', type: 'bytes' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      { name: '_moduleId', type: 'string' },
      { name: '_data', type: 'bytes' }
    ],
    name: 'staticCallModule',
    outputs: [{ name: '', type: 'bytes' }],
    stateMutability: 'view',
    type: 'function'
  }
];

const CAMPAIGNS_MODULE_ABI = [
  {
    inputs: [
      { name: '_name', type: 'string' },
      { name: '_description', type: 'string' },
      { name: '_targetAmount', type: 'uint256' },
      { name: '_duration', type: 'uint256' },
      { name: '_admin', type: 'address' },
      { name: '_distributionMethod', type: 'uint8' },
      { name: '_campaignType', type: 'uint8' },
      { name: '_allowedTokens', type: 'address[]' },
      { name: '_tokenWeights', type: 'uint256[]' },
      { name: '_conversionModes', type: 'bool[]' }
    ],
    name: 'createCampaign',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ name: '_campaignId', type: 'uint256' }],
    name: 'getCampaign',
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'name', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'targetAmount', type: 'uint256' },
      { name: 'currentAmount', type: 'uint256' },
      { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'admin', type: 'address' },
      { name: 'active', type: 'bool' },
      { name: 'distributionMethod', type: 'uint8' },
      { name: 'campaignType', type: 'uint8' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

async function journeyTest() {
  console.log('🚀 Starting Journey Test - Step by Step Testing');
  console.log('================================================');
  
  try {
    // Step 1: Check wallet balance
    console.log('\n📊 Step 1: Checking Wallet 3 Balance');
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`💰 Wallet 3 (${account.address}) balance: ${parseEther(balance.toString())} CELO`);
    
    if (balance < parseEther('0.1')) {
      console.log('❌ Insufficient balance for testing');
      return;
    }
    
    // Step 2: Create a CELO-based campaign
    console.log('\n🏗️ Step 2: Creating CELO-based Campaign');
    
    try {
      // Create a simple campaign using createCampaign with proper struct
      const now = Math.floor(Date.now() / 1000);
      const oneDay = 24 * 60 * 60;
      
      const campaignData = encodeFunctionData({
        abi: CAMPAIGNS_MODULE_ABI,
        functionName: 'createCampaign',
        args: [
          'Journey Test Campaign', // name
          'A test campaign created during journey testing', // description
          {
            mainInfo: 'Journey Test Campaign',
            additionalInfo: 'A test campaign created during journey testing',
            jsonMetadata: JSON.stringify({
              tags: ['test', 'journey'],
              targetAudience: 'testers',
              maxParticipants: 10
            }),
            category: 'Test',
            website: '',
            logo: '',
            banner: '',
            socialLinks: [],
            websiteUrl: '',
            socialMediaHandle: ''
          },
          BigInt(now + 3600), // Start in 1 hour
          BigInt(now + oneDay * 30), // End in 30 days
          50, // 5% admin fee
          3, // Max 3 winners
          1, // Proportional distribution
          '0x0000000000000000000000000000000000000000', // Payout token (zero address for CELO)
          '0x0000000000000000000000000000000000000000' // Fee token (zero address for CELO)
        ]
      });
      
      console.log('📝 Campaign data encoded, sending transaction...');
      const hash = await walletClient.writeContract({
        address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI,
        functionName: 'callModule',
        args: ['campaigns', campaignData],
        value: parseEther('0.1') // Campaign creation fee
      });
      
      console.log(`⏳ Transaction hash: ${hash}`);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`✅ Campaign creation transaction confirmed: ${receipt.status}`);
      
      // Step 3: Read the created campaign
      console.log('\n📖 Step 3: Reading Created Campaign');
      
      // Try to get campaign count first
      const campaignCountData = await publicClient.readContract({
        address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI,
        functionName: 'staticCallModule',
        args: ['campaigns', '0x8c4a2f2c'] // getCampaignCount()
      });
      
      const campaignCount = parseInt((campaignCountData as string).slice(-64), 16);
      console.log(`📊 Total campaigns: ${campaignCount}`);
      
      // Read the latest campaign (assuming it's the one we just created)
      const latestCampaignId = campaignCount - 1;
      console.log(`🔍 Reading campaign ID: ${latestCampaignId}`);
      
      const readCampaignData = encodeFunctionData({
        abi: CAMPAIGNS_MODULE_ABI,
        functionName: 'getCampaign',
        args: [BigInt(latestCampaignId)]
      });
      
      const campaignResult = await publicClient.readContract({
        address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI,
        functionName: 'staticCallModule',
        args: ['campaigns', readCampaignData]
      });
      
      // Decode the result
      const decoded = decodeFunctionResult({
        abi: CAMPAIGNS_MODULE_ABI,
        functionName: 'getCampaign',
        data: campaignResult as `0x${string}`
      });
      
      console.log('📋 Campaign Details:');
      console.log(`   ID: ${(decoded as any)[0]}`);
      console.log(`   Name: "${(decoded as any)[1]}"`);
      console.log(`   Description: "${(decoded as any)[2]}"`);
      console.log(`   Target Amount: ${parseEther((decoded as any)[3].toString())} CELO`);
      console.log(`   Current Amount: ${parseEther((decoded as any)[4].toString())} CELO`);
      console.log(`   Admin: ${(decoded as any)[7]}`);
      console.log(`   Active: ${(decoded as any)[8]}`);
      console.log(`   Distribution Method: ${(decoded as any)[9]}`);
      console.log(`   Campaign Type: ${(decoded as any)[10]}`);
      
      // Verify the admin is wallet 3
      const isCorrectAdmin = (decoded as any)[7].toLowerCase() === account.address.toLowerCase();
      console.log(`✅ Admin verification: ${isCorrectAdmin ? 'CORRECT' : 'INCORRECT'}`);
      
    } catch (error: any) {
      console.log(`❌ Error creating/reading campaign: ${error.message}`);
      console.log('Error details:', error);
    }
    
    console.log('\n🎉 Journey Test - Campaign Creation and Reading Completed!');
    
  } catch (error: any) {
    console.log(`❌ Journey test failed: ${error.message}`);
    console.log('Error details:', error);
  }
}

// Run the journey test
journeyTest();
