#!/usr/bin/env ts-node

import { ethers } from "hardhat";
import { config } from "dotenv";

config();

// Bridge funding script for Good Dollar Bridge
async function main() {
  const args = process.argv.slice(2);
  const action = args[0]; // fund, check, withdraw
  const amount = args[1]; // amount in G$ (e.g., "1000" for 1000 G$)
  const bridgeAddress = args[2]; // specific bridge address (optional)
  
  if (!action) {
    console.log("❌ Missing action");
    console.log("Usage: npx hardhat run scripts/fund-bridge.ts --network celo <action> [amount] [bridge-address]");
    console.log("");
    console.log("Actions:");
    console.log("  fund <amount> [bridge]     - Fund bridge with Good Dollars");
    console.log("  check [bridge]             - Check bridge Good Dollar balance");
    console.log("  withdraw <amount> [bridge] - Withdraw Good Dollars from bridge (admin only)");
    console.log("  list                       - List all deployed bridges");
    console.log("");
    console.log("Examples:");
    console.log("  npx hardhat run scripts/fund-bridge.ts --network celo fund 1000");
    console.log("  npx hardhat run scripts/fund-bridge.ts --network celo check");
    console.log("  npx hardhat run scripts/fund-bridge.ts --network celo fund 500 0x1234...");
    process.exit(1);
  }
  
  try {
    // Get deployer
    const [deployer] = await ethers.getSigners();
    console.log(`🔑 Deployer: ${deployer.address}`);
    
    // Get contract addresses from deployment info
    const deploymentInfo = await getDeploymentInfo();
    if (!deploymentInfo) {
      console.log("❌ No deployment info found. Deploy contracts first.");
      process.exit(1);
    }
    
    const { factory, firstBridge } = deploymentInfo.contracts;
    
    if (action === "list") {
      await listBridges(factory);
      return;
    }
    
    if (action === "check") {
      const targetBridge = bridgeAddress || firstBridge;
      if (!targetBridge) {
        console.log("❌ No bridge address specified and no first bridge found");
        process.exit(1);
      }
      await checkBridgeBalance(targetBridge);
      return;
    }
    
    if (action === "fund") {
      if (!amount) {
        console.log("❌ Amount required for funding");
        process.exit(1);
      }
      
      const targetBridge = bridgeAddress || firstBridge;
      if (!targetBridge) {
        console.log("❌ No bridge address specified and no first bridge found");
        process.exit(1);
      }
      
      const amountInWei = ethers.parseEther(amount);
      await fundBridge(targetBridge, amountInWei);
      return;
    }
    
    if (action === "withdraw") {
      if (!amount) {
        console.log("❌ Amount required for withdrawal");
        process.exit(1);
      }
      
      const targetBridge = bridgeAddress || firstBridge;
      if (!targetBridge) {
        console.log("❌ No bridge address specified and no first bridge found");
        process.exit(1);
      }
      
      const amountInWei = ethers.parseEther(amount);
      await withdrawFromBridge(targetBridge, amountInWei);
      return;
    }
    
    console.log("❌ Unknown action:", action);
    
  } catch (error: any) {
    console.error("💥 Bridge funding failed:", error.message);
    process.exit(1);
  }
}

async function getDeploymentInfo() {
  try {
    const fs = require("fs");
    const path = require("path");
    
    const deploymentsDir = path.join(__dirname, "../deployments");
    const files = fs.readdirSync(deploymentsDir);
    
    for (const file of files) {
      if (file.includes("good-dollar-bridge-deployment.json")) {
        const content = fs.readFileSync(path.join(deploymentsDir, file), "utf8");
        return JSON.parse(content);
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

async function listBridges(factoryAddress: string) {
  console.log("🌉 Listing All Deployed Bridges");
  console.log("=".repeat(50));
  
  const factory = await ethers.getContractAt("SovereignSeasGoodDollarBridgeFactory", factoryAddress);
  
  try {
    const allBridges = await factory.getAllBridges();
    const activeBridges = await factory.getActiveBridges();
    
    console.log(`Total Bridges: ${allBridges.length}`);
    console.log(`Active Bridges: ${activeBridges.length}`);
    console.log("");
    
    if (activeBridges.length === 0) {
      console.log("No active bridges found");
      return;
    }
    
    for (let i = 0; i < activeBridges.length; i++) {
      const bridgeAddress = activeBridges[i];
      const bridgeInfo = await factory.getBridgeInfo(bridgeAddress);
      
      console.log(`Bridge ${i + 1}: ${bridgeAddress}`);
      console.log(`   Network: ${bridgeInfo.network}`);
      console.log(`   Template: ${bridgeInfo.template}`);
      console.log(`   Admin: ${bridgeInfo.admin}`);
      console.log(`   Deployed: ${new Date(Number(bridgeInfo.deployedAt) * 1000).toISOString()}`);
      console.log(`   Description: ${bridgeInfo.description}`);
      console.log("");
    }
  } catch (error: any) {
    console.log("❌ Error listing bridges:", error.message);
  }
}

async function checkBridgeBalance(bridgeAddress: string) {
  console.log(`💰 Checking Bridge Balance: ${bridgeAddress}`);
  console.log("=".repeat(50));
  
  try {
    const bridge = await ethers.getContractAt("SovereignSeasGoodDollarBridge", bridgeAddress);
    
    // Get Good Dollar balance
    const gdBalance = await bridge.getGoodDollarBalance();
    console.log(`Good Dollar Balance: ${ethers.formatEther(gdBalance)} G$`);
    
    // Get bridge settings
    const poolSize = await bridge.goodDollarPoolSize();
    const projectReward = await bridge.projectCreationReward();
    
    console.log(`Default Pool Size: ${ethers.formatEther(poolSize)} G$`);
    console.log(`Project Creation Reward: ${ethers.formatEther(projectReward)} G$`);
    
    // Get campaign pools info
    const campaignCount = await bridge.getCampaignCount();
    console.log(`Total Campaigns: ${campaignCount}`);
    
    // Check if bridge has enough funds for a few project rewards
    const minFundsNeeded = projectReward * 10n; // 10 project rewards
    if (gdBalance < minFundsNeeded) {
      console.log(`⚠️  Low funds warning: Need at least ${ethers.formatEther(minFundsNeeded)} G$ for 10 project rewards`);
    } else {
      console.log(`✅ Sufficient funds for at least ${Math.floor(Number(gdBalance) / Number(projectReward))} project rewards`);
    }
    
  } catch (error: any) {
    console.log("❌ Error checking bridge balance:", error.message);
  }
}

async function fundBridge(bridgeAddress: string, amount: bigint) {
  console.log(`💰 Funding Bridge: ${bridgeAddress}`);
  console.log(`Amount: ${ethers.formatEther(amount)} G$`);
  console.log("=".repeat(50));
  
  try {
    // Get Good Dollar contract
    const goodDollarABI = [
      "function transfer(address to, uint256 amount) external returns (bool)",
      "function balanceOf(address account) external view returns (uint256)",
      "function approve(address spender, uint256 amount) external returns (bool)"
    ];
    
    const [deployer] = await ethers.getSigners();
    const goodDollar = await ethers.getContractAt(goodDollarABI, "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A");
    
    // Check deployer's G$ balance
    const balance = await goodDollar.balanceOf(deployer.address);
    console.log(`Deployer G$ balance: ${ethers.formatEther(balance)} G$`);
    
    if (balance < amount) {
      console.log(`❌ Insufficient G$ balance. Need ${ethers.formatEther(amount)} G$`);
      console.log("   Please fund the deployer address with Good Dollars first");
      return;
    }
    
    // Check current bridge balance
    const bridge = await ethers.getContractAt("SovereignSeasGoodDollarBridge", bridgeAddress);
    const currentBalance = await bridge.getGoodDollarBalance();
    console.log(`Current bridge balance: ${ethers.formatEther(currentBalance)} G$`);
    
    // Transfer G$ to bridge
    console.log(`⏳ Transferring ${ethers.formatEther(amount)} G$ to bridge...`);
    const transferTx = await goodDollar.transfer(bridgeAddress, amount);
    await transferTx.wait();
    
    // Check new balance
    const newBalance = await bridge.getGoodDollarBalance();
    console.log(`✅ Bridge funded successfully!`);
    console.log(`New bridge balance: ${ethers.formatEther(newBalance)} G$`);
    
    // Calculate how many project rewards this can fund
    const projectReward = await bridge.projectCreationReward();
    const projectRewardsPossible = newBalance / projectReward;
    console.log(`Can fund approximately ${projectRewardsPossible} project rewards`);
    
  } catch (error: any) {
    console.log("❌ Error funding bridge:", error.message);
  }
}

async function withdrawFromBridge(bridgeAddress: string, amount: bigint) {
  console.log(`💸 Withdrawing from Bridge: ${bridgeAddress}`);
  console.log(`Amount: ${ethers.formatEther(amount)} G$`);
  console.log("=".repeat(50));
  
  try {
    const [deployer] = await ethers.getSigners();
    const bridge = await ethers.getContractAt("SovereignSeasGoodDollarBridge", bridgeAddress);
    
    // Check if deployer has admin role
    const adminRole = await bridge.ADMIN_ROLE();
    const hasAdminRole = await bridge.hasRole(adminRole, deployer.address);
    
    if (!hasAdminRole) {
      console.log("❌ Deployer does not have ADMIN_ROLE");
      console.log("   Only bridge admins can withdraw funds");
      return;
    }
    
    // Check current bridge balance
    const currentBalance = await bridge.getGoodDollarBalance();
    console.log(`Current bridge balance: ${ethers.formatEther(currentBalance)} G$`);
    
    if (currentBalance < amount) {
      console.log(`❌ Insufficient bridge balance. Cannot withdraw ${ethers.formatEther(amount)} G$`);
      return;
    }
    
    // Use emergency recovery function to withdraw Good Dollars
    console.log(`⏳ Withdrawing ${ethers.formatEther(amount)} G$ from bridge...`);
    const withdrawTx = await bridge.emergencyRecovery(
      "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A", // Good Dollar token address
      deployer.address,
      amount
    );
    await withdrawTx.wait();
    
    // Check new balance
    const newBalance = await bridge.getGoodDollarBalance();
    console.log(`✅ Withdrawal successful!`);
    console.log(`New bridge balance: ${ethers.formatEther(newBalance)} G$`);
    
  } catch (error: any) {
    console.log("❌ Error withdrawing from bridge:", error.message);
  }
}

// Error handling
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
