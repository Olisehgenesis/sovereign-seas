#!/usr/bin/env ts-node

import { ethers } from "hardhat";
import { config } from "dotenv";

config();

async function main() {
  console.log("🔍 Checking SimpleGoodDollarBridge State");
  console.log("=".repeat(50));
  
  try {
    // Get deployer
    const [deployer] = await ethers.getSigners();
    console.log(`🔑 Deployer: ${deployer.address}`);
    
    // Get deployment info
    const deploymentInfo = await getDeploymentInfo();
    if (!deploymentInfo) {
      console.log("❌ No deployment info found. Deploy the contract first.");
      process.exit(1);
    }
    
    const bridgeAddress = deploymentInfo.contract;
    console.log(`🌉 Bridge Address: ${bridgeAddress}`);
    
    // Get bridge contract
    const bridge = await ethers.getContractAt("SimpleGoodDollarBridge", bridgeAddress);
    
    // Check contract state
    console.log("\n📊 Contract State:");
    console.log("-".repeat(30));
    
    const gdBalance = await bridge.getGoodDollarBalance();
    const projectReward = await bridge.projectCreationReward();
    const poolSize = await bridge.goodDollarPoolSize();
    const projectCount = await bridge.projectCounter();
    const campaignCount = await bridge.campaignCounter();
    
    console.log(`   Good Dollar Balance: ${ethers.formatEther(gdBalance)} G$`);
    console.log(`   Project Creation Reward: ${ethers.formatEther(projectReward)} G$`);
    console.log(`   Default Pool Size: ${ethers.formatEther(poolSize)} G$`);
    console.log(`   Total Projects: ${projectCount}`);
    console.log(`   Total Campaigns: ${campaignCount}`);
    
    // Check if there are any campaigns
    if (campaignCount > 0) {
      console.log("\n🎯 Existing Campaigns:");
      console.log("-".repeat(30));
      
      for (let i = 0; i < campaignCount; i++) {
        try {
          const campaign = await bridge.getCampaignPool(i);
          console.log(`\n   Campaign ${i}:`);
          console.log(`     Name: ${campaign.name}`);
          console.log(`     Description: ${campaign.description}`);
          console.log(`     Pool Amount: ${ethers.formatEther(campaign.goodDollarAmount)} G$`);
          console.log(`     Start Time: ${new Date(Number(campaign.startTime) * 1000).toISOString()}`);
          console.log(`     End Time: ${new Date(Number(campaign.endTime) * 1000).toISOString()}`);
          console.log(`     Max Winners: ${campaign.maxWinners}`);
          console.log(`     Active: ${campaign.isActive}`);
          console.log(`     Members: ${campaign.participatingProjects.length}`);
          
          // Get Good Dollar pool address
          const goodDollarPool = await bridge.getCampaignGoodDollarPool(i);
          console.log(`     Good Dollar Pool: ${goodDollarPool}`);
          
          // Check if campaign has ended
          const now = Math.floor(Date.now() / 1000);
          if (now > campaign.endTime) {
            console.log(`     Status: ENDED`);
            if (campaign.distributedAmount > 0) {
              console.log(`     Distributed: ${ethers.formatEther(campaign.distributedAmount)} G$`);
            } else {
              console.log(`     Distributed: NOT YET DISTRIBUTED`);
            }
          } else if (now < campaign.startTime) {
            console.log(`     Status: NOT STARTED`);
          } else {
            console.log(`     Status: ACTIVE`);
          }
          
        } catch (error) {
          console.log(`   Campaign ${i}: Error reading campaign data`);
        }
      }
    }
    
    // Check if there are any projects
    if (projectCount > 0) {
      console.log("\n🚀 Existing Projects:");
      console.log("-".repeat(30));
      
      for (let i = 0; i < projectCount; i++) {
        try {
          const project = await bridge.getProject(i);
          console.log(`\n   Project ${i}:`);
          console.log(`     Name: ${project.name}`);
          console.log(`     Description: ${project.description}`);
          console.log(`     Owner: ${project.owner}`);
          console.log(`     Active: ${project.active}`);
          console.log(`     Created: ${new Date(Number(project.createdAt) * 1000).toISOString()}`);
          
          // Get user projects
          const userProjects = await bridge.getUserProjects(project.owner);
          console.log(`     Total Projects by Owner: ${userProjects.length}`);
          
        } catch (error) {
          console.log(`   Project ${i}: Error reading project data`);
        }
      }
    }
    
    // Check contract configuration
    console.log("\n⚙️ Contract Configuration:");
    console.log("-".repeat(30));
    
    const goodDollarToken = await bridge.GOOD_DOLLAR_TOKEN();
    const directPaymentsFactory = await bridge.DIRECT_PAYMENTS_FACTORY();
    const minAmount = await bridge.MIN_GOOD_DOLLAR_AMOUNT();
    const maxAmount = await bridge.MAX_GOOD_DOLLAR_AMOUNT();
    
    console.log(`   Good Dollar Token: ${goodDollarToken}`);
    console.log(`   Direct Payments Factory: ${directPaymentsFactory}`);
    console.log(`   Min Pool Amount: ${ethers.formatEther(minAmount)} G$`);
    console.log(`   Max Pool Amount: ${ethers.formatEther(maxAmount)} G$`);
    
    // Check if contract is paused
    try {
      const paused = await bridge.paused();
      console.log(`   Contract Paused: ${paused}`);
    } catch (error) {
      console.log(`   Contract Paused: Unable to check`);
    }
    
    console.log("\n✅ Bridge state check completed!");
    
  } catch (error: any) {
    console.error("💥 Error checking bridge state:", error.message);
    throw error;
  }
}

async function getDeploymentInfo() {
  try {
    const fs = require("fs");
    const path = require("path");
    
    const deploymentsDir = path.join(__dirname, "../deployments");
    const deploymentFile = path.join(deploymentsDir, "simple-bridge-deployment.json");
    
    if (fs.existsSync(deploymentFile)) {
      const content = fs.readFileSync(deploymentFile, "utf8");
      return JSON.parse(content);
    }
    
    return null;
  } catch (error) {
    return null;
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
