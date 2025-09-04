#!/usr/bin/env ts-node

import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "viem/chains";
import * as fs from "fs";
import * as path from "path";

async function upgradeProxyWithFixes() {
  console.log("🔄 Upgrading Proxy with msg.sender Fixes");
  console.log("=========================================");

  // Load deployment
  const deploymentPath = path.join(__dirname, "..", "deployments", "alfajores", "latest.json");
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

  try {
    // Step 1: Deploy new proxy implementation with our fixes
    console.log(`\n🔨 Deploying new proxy implementation with fixes...`);
    
    // We need to compile the contracts first
    console.log(`📝 Compiling contracts...`);
    const { execSync } = require('child_process');
    execSync('npx hardhat compile', { stdio: 'inherit' });
    
    // Deploy new implementation
    const proxyFactory = await ethers.getContractFactory("SovereignSeasV5");
    const newImplementation = await proxyFactory.deploy();
    await newImplementation.waitForDeployment();
    
    const newImplementationAddress = await newImplementation.getAddress();
    console.log(`✅ New implementation deployed to: ${newImplementationAddress}`);

    // Step 2: Upgrade the proxy to use the new implementation
    console.log(`\n🔄 Upgrading proxy to new implementation...`);
    
    const hash = await walletClient.writeContract({
      address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
      abi: [{
        name: 'upgradeTo',
        type: 'function',
        inputs: [
          { name: 'newImplementation', type: 'address' }
        ],
        outputs: [],
        stateMutability: 'nonpayable'
      }],
      functionName: 'upgradeTo',
      args: [newImplementationAddress as `0x${string}`]
    });

    console.log(`⏳ Upgrade transaction: ${hash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ Proxy upgraded successfully in block ${receipt.blockNumber}`);

    // Step 3: Test the fix
    console.log(`\n🧪 Testing the msg.sender fix...`);
    
    const testHash = await walletClient.writeContract({
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
      functionName: 'callModule',
      args: ["campaigns", "0x"], // Empty call to test
      value: 0n
    });

    console.log(`⏳ Test transaction: ${testHash}`);
    const testReceipt = await publicClient.waitForTransactionReceipt({ hash: testHash });
    console.log(`✅ Test successful in block ${testReceipt.blockNumber}`);

    console.log(`\n🎉 Proxy upgrade completed successfully!`);
    console.log(`📋 New implementation: ${newImplementationAddress}`);

  } catch (error) {
    console.error(`❌ Upgrade failed:`, error);
  }
}

if (require.main === module) {
  upgradeProxyWithFixes().catch(console.error);
}
