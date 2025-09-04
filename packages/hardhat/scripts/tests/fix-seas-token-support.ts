#!/usr/bin/env ts-node

import { createPublicClient, createWalletClient, http, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "viem/chains";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config();    

//using deployer wallet to fix seas token support



async function fixSeasTokenSupport() {
  console.log("🔧 Fixing SEAS Token Support in TreasuryModule");
  console.log("=============================================");

  // Load deployment
  const deploymentPath = path.join(__dirname, "..", "..", "deployments", "alfajores", "latest.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`❌ Deployment file missing: ${deploymentPath}`);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log(`📋 Using deployment: ${deployment.contracts.sovereignSeasV5}`);

  const deployerWallet = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

  // Load wallets
  const walletsPath = path.join(__dirname, "..", "..", "wallets", "alfajores-wallets.json");
  if (!fs.existsSync(walletsPath)) {
    throw new Error(`❌ Wallet file missing: ${walletsPath}. Run generate-wallets first.`);
  }
  const wallets = (JSON.parse(fs.readFileSync(walletsPath, "utf8")) as { wallets: any[] }).wallets;
  console.log(`👛 Loaded ${wallets.length} test wallets`);

  // Setup clients
  const publicClient = createPublicClient({ 
    chain: celoAlfajores, 
    transport: http("https://alfajores-forno.celo-testnet.org") 
  });

  // Use first test wallet (assuming it has admin privileges)
  const testWallet = deployerWallet.address;
  if (!testWallet) {
    throw new Error("❌ No test wallets available");
  }

  const testAccount = deployerWallet;
  const testClient = createWalletClient({
    chain: celoAlfajores,
    transport: http("https://alfajores-forno.celo-testnet.org"),
    account: testAccount,
  });

  console.log(`🏭 Using test wallet: ${testAccount.address}`);

  try {
    // Get TreasuryModule address
    console.log(`📍 Getting TreasuryModule address...`);
    const treasuryModuleAddress = await publicClient.readContract({
      address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
      abi: [
        {
          "inputs": [{"internalType": "string", "name": "_moduleId", "type": "string"}],
          "name": "getModuleAddress",
          "outputs": [{"internalType": "address", "name": "", "type": "address"}],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: "getModuleAddress",
      args: ["treasury"],
    });
    
    console.log(`📍 TreasuryModule address: ${treasuryModuleAddress}`);

    // Check if SEAS token is already supported
    console.log(`🔍 Checking if SEAS token is already supported...`);
    const isSupported = await publicClient.readContract({
      address: treasuryModuleAddress as `0x${string}`,
      abi: [
        {
          "inputs": [{"internalType": "address", "name": "", "type": "address"}],
          "name": "supportedTokens",
          "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: "supportedTokens",
      args: [deployment.contracts.seasToken],
    });

    console.log(`📊 SEAS token supported: ${isSupported}`);

    if (!isSupported) {
      console.log(`➕ Adding SEAS token as supported token...`);
      
      // Add SEAS token as supported token directly to TreasuryModule
      const addTokenHash = await testClient.writeContract({
        address: treasuryModuleAddress as `0x${string}`,
        abi: [
          {
            "inputs": [
              {"internalType": "address", "name": "_token", "type": "address"}
            ],
            "name": "addSupportedToken",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ],
        functionName: "addSupportedToken",
        args: [deployment.contracts.seasToken],
      });
      
      console.log(`⏳ Add supported token transaction: ${addTokenHash}`);
      const addTokenReceipt = await publicClient.waitForTransactionReceipt({ hash: addTokenHash });
      console.log(`✅ SEAS token added as supported token`);
      console.log(`⛽ Gas used: ${addTokenReceipt.gasUsed}`);
    } else {
      console.log(`✅ SEAS token is already supported`);
    }

    // Verify the token is now supported
    console.log(`🔍 Verifying SEAS token is now supported...`);
    const isNowSupported = await publicClient.readContract({
      address: treasuryModuleAddress as `0x${string}`,
      abi: [
        {
          "inputs": [{"internalType": "address", "name": "", "type": "address"}],
          "name": "supportedTokens",
          "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: "supportedTokens",
      args: [deployment.contracts.seasToken],
    });

    console.log(`📊 SEAS token supported after fix: ${isNowSupported}`);

    if (isNowSupported) {
      console.log(`🎉 SUCCESS: SEAS token is now supported in TreasuryModule!`);
    } else {
      console.log(`❌ FAILED: SEAS token is still not supported`);
    }

    // Also check supported tokens list
    console.log(`📋 Getting all supported tokens...`);
    const supportedTokensList = await publicClient.readContract({
      address: treasuryModuleAddress as `0x${string}`,
      abi: [
        {
          "inputs": [],
          "name": "getSupportedTokens",
          "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: "getSupportedTokens",
      args: [],
    });

    console.log(`📋 Supported tokens list:`, supportedTokensList);
    console.log(`📊 Total supported tokens: ${supportedTokensList.length}`);

    // Check if SEAS token is in the list
    const seasTokenInList = supportedTokensList.includes(deployment.contracts.seasToken);
    console.log(`🔍 SEAS token in supported list: ${seasTokenInList}`);

    if (seasTokenInList) {
      console.log(`✅ SUCCESS: SEAS token is in the supported tokens list!`);
    } else {
      console.log(`❌ ISSUE: SEAS token is not in the supported tokens list`);
    }

  } catch (error) {
    console.error(`❌ Failed to fix SEAS token support:`, error);
    console.error(`Error details:`, {
      message: error.message,
      code: error.code,
      cause: error.cause?.message || 'No cause',
      stack: error.stack?.split('\n').slice(0, 5).join('\n')
    });
    throw error;
  }
}

if (require.main === module) {
  fixSeasTokenSupport().catch(console.error);
}
