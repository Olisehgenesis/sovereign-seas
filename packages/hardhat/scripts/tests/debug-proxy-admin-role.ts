#!/usr/bin/env ts-node

import { createPublicClient, createWalletClient, http, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "viem/chains";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config();

async function debugProxyAdminRole() {
  console.log("🔍 Debugging Proxy Admin Role Issue");
  console.log("===================================");

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
    // 1. Check ADMIN_ROLE constant
    console.log(`\n1️⃣ Checking ADMIN_ROLE constant...`);
    const adminRole = await publicClient.readContract({
      address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
      abi: [
        {
          "inputs": [],
          "name": "ADMIN_ROLE",
          "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: "ADMIN_ROLE",
    });
    console.log(`   ADMIN_ROLE: ${adminRole}`);

    // 2. Check if deployer has ADMIN_ROLE
    console.log(`\n2️⃣ Checking if deployer has ADMIN_ROLE...`);
    const hasAdminRole = await publicClient.readContract({
      address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
      abi: [
        {
          "inputs": [
            {"internalType": "bytes32", "name": "role", "type": "bytes32"},
            {"internalType": "address", "name": "account", "type": "address"}
          ],
          "name": "hasRole",
          "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: "hasRole",
      args: [adminRole, deployerWallet.address],
    });
    console.log(`   Deployer has ADMIN_ROLE: ${hasAdminRole}`);

    // 3. Check DEFAULT_ADMIN_ROLE
    console.log(`\n3️⃣ Checking DEFAULT_ADMIN_ROLE...`);
    const defaultAdminRole = await publicClient.readContract({
      address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
      abi: [
        {
          "inputs": [],
          "name": "DEFAULT_ADMIN_ROLE",
          "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: "DEFAULT_ADMIN_ROLE",
    });
    console.log(`   DEFAULT_ADMIN_ROLE: ${defaultAdminRole}`);

    // 4. Check if deployer has DEFAULT_ADMIN_ROLE
    console.log(`\n4️⃣ Checking if deployer has DEFAULT_ADMIN_ROLE...`);
    const hasDefaultAdminRole = await publicClient.readContract({
      address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
      abi: [
        {
          "inputs": [
            {"internalType": "bytes32", "name": "role", "type": "bytes32"},
            {"internalType": "address", "name": "account", "type": "address"}
          ],
          "name": "hasRole",
          "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: "hasRole",
      args: [defaultAdminRole, deployerWallet.address],
    });
    console.log(`   Deployer has DEFAULT_ADMIN_ROLE: ${hasDefaultAdminRole}`);

    // 5. Get TreasuryModule address
    console.log(`\n5️⃣ Getting TreasuryModule address...`);
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
    console.log(`   TreasuryModule address: ${treasuryModuleAddress}`);

    // 6. Test direct call to TreasuryModule (this worked)
    console.log(`\n6️⃣ Testing direct call to TreasuryModule...`);
    try {
      const directCallHash = await deployerClient.writeContract({
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
      console.log(`   ✅ Direct call successful: ${directCallHash}`);
    } catch (error) {
      console.log(`   ❌ Direct call failed: ${error.message}`);
    }

    // 7. Test proxy call to TreasuryModule (this failed)
    console.log(`\n7️⃣ Testing proxy call to TreasuryModule...`);
    try {
      const proxyCallData = encodeFunctionData({
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

      const proxyCallHash = await deployerClient.writeContract({
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
        args: ["treasury", proxyCallData],
      });
      console.log(`   ✅ Proxy call successful: ${proxyCallHash}`);
    } catch (error) {
      console.log(`   ❌ Proxy call failed: ${error.message}`);
    }

    // 8. Check what getEffectiveCaller returns in TreasuryModule
    console.log(`\n8️⃣ Testing getEffectiveCaller in TreasuryModule...`);
    try {
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

      // Decode the result
      const effectiveCaller = `0x${effectiveCallerResult.slice(26)}`; // Remove first 6 bytes (0x + 24 bytes padding)
      console.log(`   Effective caller via proxy: ${effectiveCaller}`);
      console.log(`   Expected caller (deployer): ${deployerWallet.address}`);
      console.log(`   Match: ${effectiveCaller.toLowerCase() === deployerWallet.address.toLowerCase()}`);
    } catch (error) {
      console.log(`   ❌ getEffectiveCaller test failed: ${error.message}`);
    }

    // 9. Check if the effective caller has admin role
    console.log(`\n9️⃣ Checking if effective caller has admin role...`);
    try {
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
      
      // Check if this effective caller has admin role
      const effectiveCallerHasAdminRole = await publicClient.readContract({
        address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
        abi: [
          {
            "inputs": [
              {"internalType": "bytes32", "name": "role", "type": "bytes32"},
              {"internalType": "address", "name": "account", "type": "address"}
            ],
            "name": "hasRole",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
          }
        ],
        functionName: "hasRole",
        args: [adminRole, effectiveCaller as `0x${string}`],
      });
      
      console.log(`   Effective caller: ${effectiveCaller}`);
      console.log(`   Effective caller has ADMIN_ROLE: ${effectiveCallerHasAdminRole}`);
    } catch (error) {
      console.log(`   ❌ Effective caller admin role check failed: ${error.message}`);
    }

  } catch (error) {
    console.error(`❌ Debug failed:`, error);
    throw error;
  }
}

if (require.main === module) {
  debugProxyAdminRole().catch(console.error);
}
