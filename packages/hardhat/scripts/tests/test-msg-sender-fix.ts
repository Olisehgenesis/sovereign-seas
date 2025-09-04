#!/usr/bin/env ts-node

import { createPublicClient, createWalletClient, http, parseEther, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "viem/chains";
import * as fs from "fs";
import * as path from "path";

// Import ABIs from artifacts
const CAMPAIGNS_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "v5", "modules", "CampaignsModule.sol", "CampaignsModule.json"), 
  "utf8"
)).abi;

async function testMsgSenderFix() {
  console.log("🧪 Testing msg.sender Fix");
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
    // Test 1: Create a campaign through the proxy
    console.log(`\n📝 Test 1: Creating campaign through proxy...`);
    
    const campaignMetadata = {
      mainInfo: "Test campaign for msg.sender verification",
      additionalInfo: "This campaign tests if the original caller is preserved",
      jsonMetadata: JSON.stringify({
        tags: ["test", "msg-sender", "proxy"],
        difficulty: "beginner",
        estimatedTime: "1 week"
      }),
      category: "Environment",
      website: "https://test.example.com",
      logo: "",
      banner: "",
      socialLinks: ["https://twitter.com/test"],
      websiteUrl: "https://test.example.com",
      socialMediaHandle: "@test"
    };

    const createCampaignData = encodeFunctionData({
      abi: CAMPAIGNS_MODULE_ABI,
      functionName: "createCampaign",
      args: [
        "Test Campaign - msg.sender Fix",
        "Testing if msg.sender is preserved through proxy calls",
        campaignMetadata,
        Math.floor(Date.now() / 1000) + 3600, // Start in 1 hour
        Math.floor(Date.now() / 1000) + 86400, // End in 24 hours
        50, // 5% admin fee
        10, // Max 10 winners
        1, // PROPORTIONAL distribution
        "0x0000000000000000000000000000000000000000", // CELO token
        "0x0000000000000000000000000000000000000000"  // CELO fee token
      ]
    });

    console.log(`📝 Encoded function data: ${createCampaignData}`);

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
      args: ["campaigns", createCampaignData],
      value: parseEther("0.1"), // Small amount for testing
    });

    console.log(`⏳ Transaction hash: ${hash}`);
    
    // Wait for transaction
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

    // Test 2: Check if we can read the campaign and verify the admin
    console.log(`\n📖 Test 2: Verifying campaign admin...`);
    
    // Get the latest campaign ID (assuming it's the next one)
    const nextCampaignId = await publicClient.readContract({
      address: deployment.contracts.campaignsModule as `0x${string}`,
      abi: CAMPAIGNS_MODULE_ABI,
      functionName: "nextCampaignId",
      args: [],
    });
    
    const campaignId = Number(nextCampaignId) - 1;
    console.log(`📊 Latest campaign ID: ${campaignId}`);

    // Get campaign details
    const campaignDetails = await publicClient.readContract({
      address: deployment.contracts.campaignsModule as `0x${string}`,
      abi: CAMPAIGNS_MODULE_ABI,
      functionName: "getCampaign",
      args: [campaignId],
    }) as [string, string, string, number, boolean, number, number, number];

    console.log(`📋 Campaign Details:`);
    console.log(`   ID: ${campaignId}`);
    console.log(`   Admin: ${campaignDetails[0]}`);
    console.log(`   Name: ${campaignDetails[1]}`);
    console.log(`   Status: ${campaignDetails[3]}`);
    console.log(`   Active: ${campaignDetails[4]}`);

    // Verify that the admin is the original caller, not the proxy
    if (campaignDetails[0].toLowerCase() === testWallet.address.toLowerCase()) {
      console.log(`✅ SUCCESS: Campaign admin is the original caller (${testWallet.address})`);
      console.log(`✅ msg.sender fix is working correctly!`);
    } else {
      console.log(`❌ FAILURE: Campaign admin is ${campaignDetails[0]}, expected ${testWallet.address}`);
      console.log(`❌ msg.sender fix is NOT working - proxy address is being used as admin`);
    }

    // Test 3: Try to update the campaign (should work if msg.sender is preserved)
    console.log(`\n📝 Test 3: Testing campaign update permissions...`);
    
    const updateCampaignData = encodeFunctionData({
      abi: CAMPAIGNS_MODULE_ABI,
      functionName: "updateCampaign",
      args: [
        campaignId,
        "Updated Campaign Name - msg.sender Test",
        "Updated description to test permissions"
      ]
    });

    const updateHash = await walletClient.writeContract({
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
      args: ["campaigns", updateCampaignData],
    });

    console.log(`⏳ Update transaction hash: ${updateHash}`);
    
    // Wait for transaction
    const updateReceipt = await publicClient.waitForTransactionReceipt({ hash: updateHash });
    console.log(`✅ Update transaction confirmed in block ${updateReceipt.blockNumber}`);

    // Verify the update worked
    const updatedCampaignDetails = await publicClient.readContract({
      address: deployment.contracts.campaignsModule as `0x${string}`,
      abi: CAMPAIGNS_MODULE_ABI,
      functionName: "getCampaign",
      args: [campaignId],
    }) as [string, string, string, number, boolean, number, number, number];

    if (updatedCampaignDetails[1] === "Updated Campaign Name - msg.sender Test") {
      console.log(`✅ SUCCESS: Campaign update worked - permissions are correct`);
    } else {
      console.log(`❌ FAILURE: Campaign update failed - permissions issue`);
    }

    console.log(`\n🎉 msg.sender fix test completed!`);

  } catch (error) {
    console.error(`❌ Test failed:`, error);
    
    // Check if it's a permission error
    if (error.message.includes("Only campaign admin") || error.message.includes("Unauthorized")) {
      console.log(`\n🔍 Analysis: This error suggests that msg.sender is still the proxy address, not the original caller.`);
      console.log(`🔧 The fix may need to be deployed or there might be an issue with the implementation.`);
    }
  }
}

if (require.main === module) {
  testMsgSenderFix().catch(console.error);
}
