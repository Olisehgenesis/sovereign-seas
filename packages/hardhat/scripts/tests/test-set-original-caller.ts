#!/usr/bin/env ts-node

import { createPublicClient, createWalletClient, http, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "viem/chains";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config();

async function testSetOriginalCaller() {
  console.log("🧪 Testing setOriginalCaller Mechanism");
  console.log("=====================================");

  // Load deployment
  const deploymentPath = path.join(__dirname, "..", "..", "deployments", "alfajores", "latest.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`❌ Deployment file missing: ${deploymentPath}`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log(`📋 Using deployment: ${deployment.contracts.sovereignSeasV5}`);

  const deployerWallet = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

  // Setup clients
  const publicClient = createPublicClient({
    chain: celoAlfajores,
    transport: http("https://alfajores-forno.celo-testnet.org")
  });

  const deployerClient = createWalletClient({
    chain: celoAlfajores,
    transport: http("https://alfajores-forno.celo-testnet.org"),
    account: deployerWallet,
  });

  console.log(`🏭 Using deployer wallet: ${deployerWallet.address}`);

  try {
    // Get TreasuryModule address
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

    // Test 1: Check original caller before any call
    console.log(`\n1️⃣ Checking original caller before any call...`);
    const getOriginalCallerData = encodeFunctionData({
      abi: [
        {
          "inputs": [],
          "name": "getOriginalCaller",
          "outputs": [{"internalType": "address", "name": "", "type": "address"}],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: "getOriginalCaller",
      args: [],
    });

    const originalCallerResult = await publicClient.readContract({
      address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
      abi: [
        {
          "inputs": [
            {"internalType": "string", "name": "_moduleId", "type": "string"},
            {"internalType": "bytes", "name": "_data", "type": "bytes"}
          ],
          "name": "staticCallModule",
          "outputs": [{"internalType": "bytes", "name": "", "type": "bytes"}],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: "staticCallModule",
      args: ["treasury", getOriginalCallerData],
    });

    const originalCaller = `0x${originalCallerResult.slice(26)}`;
    console.log(`   Original caller: ${originalCaller}`);

    // Test 2: Try to call setOriginalCaller directly on TreasuryModule
    console.log(`\n2️⃣ Testing direct setOriginalCaller call...`);
    try {
      const setOriginalCallerHash = await deployerClient.writeContract({
        address: treasuryModuleAddress as `0x${string}`,
        abi: [
          {
            "inputs": [{"internalType": "address", "name": "_caller", "type": "address"}],
            "name": "setOriginalCaller",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ],
        functionName: "setOriginalCaller",
        args: [deployerWallet.address],
      });
      console.log(`   ✅ Direct setOriginalCaller successful: ${setOriginalCallerHash}`);
    } catch (error) {
      console.log(`   ❌ Direct setOriginalCaller failed: ${error.message}`);
    }

    // Test 3: Check if setOriginalCaller worked
    console.log(`\n3️⃣ Checking original caller after direct setOriginalCaller...`);
    const originalCallerResult2 = await publicClient.readContract({
      address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
      abi: [
        {
          "inputs": [
            {"internalType": "string", "name": "_moduleId", "type": "string"},
            {"internalType": "bytes", "name": "_data", "type": "bytes"}
          ],
          "name": "staticCallModule",
          "outputs": [{"internalType": "bytes", "name": "", "type": "bytes"}],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: "staticCallModule",
      args: ["treasury", getOriginalCallerData],
    });

    const originalCaller2 = `0x${originalCallerResult2.slice(26)}`;
    console.log(`   Original caller after direct set: ${originalCaller2}`);

    // Test 4: Try to call setOriginalCaller via proxy
    console.log(`\n4️⃣ Testing setOriginalCaller via proxy...`);
    try {
      const setOriginalCallerViaProxyData = encodeFunctionData({
        abi: [
          {
            "inputs": [{"internalType": "address", "name": "_caller", "type": "address"}],
            "name": "setOriginalCaller",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ],
        functionName: "setOriginalCaller",
        args: [deployerWallet.address],
      });

      const setOriginalCallerViaProxyHash = await deployerClient.writeContract({
        address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
        abi: [
          {
            "inputs": [
              {"internalType": "string", "name": "_moduleId", "type": "string"},
              {"internalType": "bytes", "name": "_data", "type": "bytes"}
            ],
            "name": "callModule",
            "outputs": [{"internalType": "bytes", "name": "", "type": "bytes"}],
            "stateMutability": "payable",
            "type": "function"
          }
        ],
        functionName: "callModule",
        args: ["treasury", setOriginalCallerViaProxyData],
      });
      console.log(`   ✅ setOriginalCaller via proxy successful: ${setOriginalCallerViaProxyHash}`);
    } catch (error) {
      console.log(`   ❌ setOriginalCaller via proxy failed: ${error.message}`);
    }

    // Test 5: Check original caller after proxy call
    console.log(`\n5️⃣ Checking original caller after proxy setOriginalCaller...`);
    const originalCallerResult3 = await publicClient.readContract({
      address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
      abi: [
        {
          "inputs": [
            {"internalType": "string", "name": "_moduleId", "type": "string"},
            {"internalType": "bytes", "name": "_data", "type": "bytes"}
          ],
          "name": "staticCallModule",
          "outputs": [{"internalType": "bytes", "name": "", "type": "bytes"}],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: "staticCallModule",
      args: ["treasury", getOriginalCallerData],
    });

    const originalCaller3 = `0x${originalCallerResult3.slice(26)}`;
    console.log(`   Original caller after proxy set: ${originalCaller3}`);

    // Test 6: Check effective caller
    console.log(`\n6️⃣ Checking effective caller...`);
    const getEffectiveCallerData = encodeFunctionData({
      abi: [
        {
          "inputs": [],
          "name": "getEffectiveCaller",
          "outputs": [{"internalType": "address", "name": "", "type": "address"}],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: "getEffectiveCaller",
      args: [],
    });

    const effectiveCallerResult = await publicClient.readContract({
      address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
      abi: [
        {
          "inputs": [
            {"internalType": "string", "name": "_moduleId", "type": "string"},
            {"internalType": "bytes", "name": "_data", "type": "bytes"}
          ],
          "name": "staticCallModule",
          "outputs": [{"internalType": "bytes", "name": "", "type": "bytes"}],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: "staticCallModule",
      args: ["treasury", getEffectiveCallerData],
    });

    const effectiveCaller = `0x${effectiveCallerResult.slice(26)}`;
    console.log(`   Effective caller: ${effectiveCaller}`);
    console.log(`   Expected (deployer): ${deployerWallet.address}`);
    console.log(`   Match: ${effectiveCaller.toLowerCase() === deployerWallet.address.toLowerCase()}`);

  } catch (error) {
    console.error(`❌ Test failed:`, error);
    throw error;
  }
}

if (require.main === module) {
  testSetOriginalCaller().catch(console.error);
}
