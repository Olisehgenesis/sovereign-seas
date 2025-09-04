#!/usr/bin/env ts-node

import { createPublicClient, createWalletClient, http, parseEther, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "viem/chains";
import * as fs from "fs";
import * as path from "path";

async function testSimpleMsgSender() {
  console.log("🧪 Simple msg.sender Test");
  console.log("=========================");

  // Load deployment
  const deploymentPath = path.join(__dirname, "..", "..", "deployments", "alfajores", "latest.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`❌ Deployment file missing: ${deploymentPath}`);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log(`📋 Using deployment: ${deployment.contracts.sovereignSeasV5}`);

  // Load wallets
  const walletsPath = path.join(__dirname, "..", "..", "wallets", "alfajores-wallets.json");
  if (!fs.existsSync(walletsPath)) {
    throw new Error(`❌ Wallet file missing: ${walletsPath}. Run generate-wallets first.`);
  }
  const wallets = (JSON.parse(fs.readFileSync(walletsPath, "utf8")) as { wallets: any[] }).wallets;
  console.log(`👛 Loaded ${wallets.length} test wallets`);

  const publicClient = createPublicClient({ 
    chain: celoAlfajores, 
    transport: http("https://alfajores-forno.celo-testnet.org") 
  });

  // Use first wallet for testing
  const testWallet = wallets[0];
  const account = privateKeyToAccount(testWallet.privateKey);
  
  console.log(`👤 Testing with wallet: ${testWallet.address}`);

  const walletClient = createWalletClient({
    chain: celoAlfajores,
    transport: http("https://alfajores-forno.celo-testnet.org"),
    account,
  });

  try {
    // Test 1: Check if we can call a simple view function through the proxy
    console.log(`\n📖 Test 1: Testing simple view function through proxy...`);
    
    // Try to get the next campaign ID through the proxy
    const getNextCampaignIdData = encodeFunctionData({
      abi: [{
        "inputs": [],
        "name": "nextCampaignId",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      }],
      functionName: "nextCampaignId",
      args: []
    });

    console.log(`📝 Calling nextCampaignId through proxy...`);

    const result = await publicClient.readContract({
      address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
      abi: [{
        name: 'staticCallModule',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { name: '_moduleId', type: 'string' },
          { name: '_data', type: 'bytes' }
        ],
        outputs: [{ name: '', type: 'bytes' }]
      }],
      functionName: "staticCallModule",
      args: ["campaigns", getNextCampaignIdData]
    });

    console.log(`✅ Proxy call successful! Result: ${result}`);

    // Test 2: Try to create a simple campaign with minimal data
    console.log(`\n📝 Test 2: Creating simple campaign through proxy...`);
    
    const simpleCampaignData = encodeFunctionData({
      abi: [{
        "inputs": [
          {"internalType": "string", "name": "_name", "type": "string"},
          {"internalType": "string", "name": "_description", "type": "string"},
          {"internalType": "tuple", "name": "_metadata", "type": "tuple", "components": [
            {"internalType": "string", "name": "mainInfo", "type": "string"},
            {"internalType": "string", "name": "additionalInfo", "type": "string"},
            {"internalType": "string", "name": "jsonMetadata", "type": "string"},
            {"internalType": "string", "name": "category", "type": "string"},
            {"internalType": "string", "name": "website", "type": "string"},
            {"internalType": "string", "name": "logo", "type": "string"},
            {"internalType": "string", "name": "banner", "type": "string"},
            {"internalType": "string[]", "name": "socialLinks", "type": "string[]"},
            {"internalType": "string", "name": "websiteUrl", "type": "string"},
            {"internalType": "string", "name": "socialMediaHandle", "type": "string"}
          ]},
          {"internalType": "uint256", "name": "_startTime", "type": "uint256"},
          {"internalType": "uint256", "name": "_endTime", "type": "uint256"},
          {"internalType": "uint256", "name": "_adminFeePercentage", "type": "uint256"},
          {"internalType": "uint256", "name": "_maxWinners", "type": "uint256"},
          {"internalType": "uint8", "name": "_distributionMethod", "type": "uint8"},
          {"internalType": "address", "name": "_payoutToken", "type": "address"},
          {"internalType": "address", "name": "_feeToken", "type": "address"}
        ],
        "name": "createCampaign",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
      }],
      functionName: "createCampaign",
      args: [
        "Simple Test Campaign",
        "A simple test campaign",
        {
          mainInfo: "Simple test",
          additionalInfo: "Additional info",
          jsonMetadata: "{}",
          category: "Test",
          website: "",
          logo: "",
          banner: "",
          socialLinks: [],
          websiteUrl: "",
          socialMediaHandle: ""
        },
        BigInt(Math.floor(Date.now() / 1000) + 3600), // Start in 1 hour
        BigInt(Math.floor(Date.now() / 1000) + 86400), // End in 24 hours
        BigInt(50), // 5% admin fee
        BigInt(5), // Max 5 winners
        1, // PROPORTIONAL distribution
        "0x0000000000000000000000000000000000000000", // CELO token
        "0x0000000000000000000000000000000000000000"  // CELO fee token
      ]
    });

    console.log(`📝 Attempting to create campaign...`);

    const hash = await walletClient.writeContract({
      address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
      abi: [{
        name: 'callModule',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
          { name: '_moduleId', type: 'string' },
          { name: '_data', type: 'bytes' }
        ],
        outputs: [{ name: '', type: 'bytes' }]
      }],
      functionName: "callModule",
      args: ["campaigns", simpleCampaignData],
      value: parseEther("0.01"), // Small amount
    });

    console.log(`⏳ Transaction hash: ${hash}`);
    
    // Wait for transaction
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

    // Test 3: Check the campaign was created and verify admin
    console.log(`\n📖 Test 3: Verifying campaign admin...`);
    
    // Get the campaign ID (should be the next one)
    const nextCampaignId = await publicClient.readContract({
      address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
      abi: [{
        name: 'staticCallModule',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { name: '_moduleId', type: 'string' },
          { name: '_data', type: 'bytes' }
        ],
        outputs: [{ name: '', type: 'bytes' }]
      }],
      functionName: "staticCallModule",
      args: ["campaigns", getNextCampaignIdData]
    });

    const campaignId = Number(nextCampaignId) - 1;
    console.log(`📊 Campaign ID: ${campaignId}`);

    // Get campaign admin
    const getCampaignAdminData = encodeFunctionData({
      abi: [{
        "inputs": [{"internalType": "uint256", "name": "_campaignId", "type": "uint256"}],
        "name": "campaigns",
        "outputs": [
          {"internalType": "uint256", "name": "id", "type": "uint256"},
          {"internalType": "address", "name": "admin", "type": "address"},
          {"internalType": "string", "name": "name", "type": "string"},
          {"internalType": "string", "name": "description", "type": "string"}
        ],
        "stateMutability": "view",
        "type": "function"
      }],
      functionName: "campaigns",
      args: [BigInt(campaignId)]
    });

    const campaignData = await publicClient.readContract({
      address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
      abi: [{
        name: 'staticCallModule',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { name: '_moduleId', type: 'string' },
          { name: '_data', type: 'bytes' }
        ],
        outputs: [{ name: '', type: 'bytes' }]
      }],
      functionName: "staticCallModule",
      args: ["campaigns", getCampaignAdminData]
    });

    // Decode the result to get the admin address
    const decoded = decodeFunctionResult({
      abi: [{
        "inputs": [{"internalType": "uint256", "name": "_campaignId", "type": "uint256"}],
        "name": "campaigns",
        "outputs": [
          {"internalType": "uint256", "name": "id", "type": "uint256"},
          {"internalType": "address", "name": "admin", "type": "address"},
          {"internalType": "string", "name": "name", "type": "string"},
          {"internalType": "string", "name": "description", "type": "string"}
        ],
        "stateMutability": "view",
        "type": "function"
      }],
      functionName: "campaigns",
      data: campaignData
    }) as [bigint, string, string, string];

    const campaignAdmin = decoded[1];
    console.log(`📋 Campaign Admin: ${campaignAdmin}`);
    console.log(`👤 Original Caller: ${testWallet.address}`);

    // Verify that the admin is the original caller, not the proxy
    if (campaignAdmin.toLowerCase() === testWallet.address.toLowerCase()) {
      console.log(`✅ SUCCESS: Campaign admin is the original caller!`);
      console.log(`✅ msg.sender fix is working correctly!`);
    } else {
      console.log(`❌ FAILURE: Campaign admin is ${campaignAdmin}, expected ${testWallet.address}`);
      console.log(`❌ msg.sender fix is NOT working - proxy address is being used as admin`);
    }

    console.log(`\n🎉 Simple msg.sender test completed!`);

  } catch (error) {
    console.error(`❌ Test failed:`, error);
    
    // Check if it's a permission error
    if (error.message.includes("Only campaign admin") || error.message.includes("Unauthorized")) {
      console.log(`\n🔍 Analysis: This error suggests that msg.sender is still the proxy address, not the original caller.`);
      console.log(`🔧 The fix may need to be deployed or there might be an issue with the implementation.`);
    } else if (error.message.includes("execution reverted")) {
      console.log(`\n🔍 Analysis: Transaction reverted. This could be due to:`);
      console.log(`   1. Module not properly initialized`);
      console.log(`   2. Missing permissions`);
      console.log(`   3. Invalid function parameters`);
      console.log(`   4. Our msg.sender fix not working correctly`);
    }
  }
}

// Import decodeFunctionResult
import { decodeFunctionResult } from "viem";

if (require.main === module) {
  testSimpleMsgSender().catch(console.error);
}
