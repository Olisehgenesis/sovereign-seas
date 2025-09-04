#!/usr/bin/env ts-node

import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "viem/chains";
import * as fs from "fs";
import * as path from "path";

async function debugModuleInitialization() {
  console.log("🔍 Debugging Module Initialization");
  console.log("==================================");

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
  const testWallet = wallets[0];
  const account = privateKeyToAccount(testWallet.privateKey);
  
  console.log(`👤 Using wallet: ${testWallet.address}`);

  const publicClient = createPublicClient({ 
    chain: celoAlfajores, 
    transport: http("https://alfajores-forno.celo-testnet.org") 
  });

  const walletClient = createWalletClient({
    chain: celoAlfajores,
    transport: http("https://alfajores-forno.celo-testnet.org"),
    account,
  });

  // Test each module
  const modules = [
    { id: "projects", name: "ProjectsModule", address: deployment.contracts.projectsModule },
    { id: "campaigns", name: "CampaignsModule", address: deployment.contracts.campaignsModule },
    { id: "voting", name: "VotingModule", address: deployment.contracts.votingModule },
    { id: "treasury", name: "TreasuryModule", address: deployment.contracts.treasuryModule },
    { id: "pools", name: "PoolsModule", address: deployment.contracts.poolsModule },
    { id: "migration", name: "MigrationModule", address: deployment.contracts.migrationModule }
  ];

  for (const module of modules) {
    console.log(`\n📝 Testing ${module.name}:`);
    console.log(`   Address: ${module.address}`);

    try {
      // Test 1: Check if module is active
      console.log(`   🔍 Checking if module is active...`);
      const isActive = await publicClient.readContract({
        address: module.address as `0x${string}`,
        abi: [{
          name: 'isActive',
          type: 'function',
          inputs: [],
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'view'
        }],
        functionName: 'isActive'
      });
      console.log(`   📊 isActive: ${isActive}`);

      // Test 2: Check if module has proxy set
      console.log(`   🔍 Checking if proxy is set...`);
      const proxyAddress = await publicClient.readContract({
        address: module.address as `0x${string}`,
        abi: [{
          name: 'sovereignSeasProxy',
          type: 'function',
          inputs: [],
          outputs: [{ name: '', type: 'address' }],
          stateMutability: 'view'
        }],
        functionName: 'sovereignSeasProxy'
      });
      console.log(`   📊 Proxy address: ${proxyAddress}`);
      console.log(`   📊 Expected proxy: ${deployment.contracts.sovereignSeasV5}`);
      console.log(`   📊 Proxy matches: ${proxyAddress.toLowerCase() === deployment.contracts.sovereignSeasV5.toLowerCase()}`);

      // Test 3: Try to call a simple function
      console.log(`   🔍 Testing simple function call...`);
      try {
        const moduleId = await publicClient.readContract({
          address: module.address as `0x${string}`,
          abi: [{
            name: 'getModuleId',
            type: 'function',
            inputs: [],
            outputs: [{ name: '', type: 'string' }],
            stateMutability: 'view'
          }],
          functionName: 'getModuleId'
        });
        console.log(`   📊 Module ID: ${moduleId}`);
      } catch (error: any) {
        console.log(`   ❌ Function call failed: ${error.message}`);
      }

      // Test 4: Try to initialize through proxy
      console.log(`   🔍 Testing initialization through proxy...`);
      try {
        const hash = await walletClient.writeContract({
          address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
          abi: [{
            name: 'initializeModule',
            type: 'function',
            inputs: [
              { name: '_moduleId', type: 'string' },
              { name: '_data', type: 'bytes' }
            ],
            outputs: [{ name: '', type: 'bool' }],
            stateMutability: 'nonpayable'
          }],
          functionName: 'initializeModule',
          args: [module.id, '0x']
        });
        console.log(`   📝 Initialization transaction: ${hash}`);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log(`   ✅ Initialization successful!`);
      } catch (error: any) {
        console.log(`   ❌ Initialization failed: ${error.message}`);
      }

    } catch (error: any) {
      console.log(`   ❌ Error testing module: ${error.message}`);
    }
  }

  console.log(`\n🎉 Module initialization debugging completed!`);
}

if (require.main === module) {
  debugModuleInitialization().catch(console.error);
}
