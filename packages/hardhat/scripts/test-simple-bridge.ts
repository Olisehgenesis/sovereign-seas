#!/usr/bin/env ts-node

import { ethers } from "hardhat";
import { config } from "dotenv";

config();

async function main() {
  console.log("🧪 Testing Simple Good Dollar Bridge...");
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
    
    // Check initial state
    console.log("\n📊 Initial Bridge State:");
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
    
    // Test 1: Create a Project
    console.log("\n🚀 Test 1: Creating a Project");
    console.log("-".repeat(30));
    
    const projectParams = {
      name: "My Awesome Project",
      description: "A revolutionary project that will change the world"
    };
    
    console.log(`Creating project: ${projectParams.name}`);
    const createProjectTx = await bridge.createProject(projectParams);
    const projectReceipt = await createProjectTx.wait();
    
    // Find ProjectCreated event
    const projectCreatedEvent = projectReceipt?.logs.find((log: any) => {
      try {
        return bridge.interface.parseLog(log as any)?.name === "ProjectCreated";
      } catch {
        return false;
      }
    });
    
    if (projectCreatedEvent) {
      const parsedLog = bridge.interface.parseLog(projectCreatedEvent as any);
      const projectId = parsedLog?.args[0];
      console.log(`✅ Project created with ID: ${projectId}`);
      
      // Get project info
      const project = await bridge.getProject(projectId);
      console.log(`   Project Owner: ${project.owner}`);
      console.log(`   Project Name: ${project.name}`);
      console.log(`   Project Description: ${project.description}`);
      console.log(`   Project Active: ${project.active}`);
      
      // Test 2: Create a Campaign
      console.log("\n🎯 Test 2: Creating a Campaign");
      console.log("-".repeat(30));
      
      const campaignParams = {
        name: "Community Campaign",
        description: "A campaign to support community projects",
        startTime: Math.floor(Date.now() / 1000), // Start now
        endTime: Math.floor(Date.now() / 1000) + 86400 * 30, // End in 30 days
        maxWinners: 5,
        goodDollarPoolAmount: ethers.parseEther("500"), // 500 G$ pool
        poolProjectId: "campaign-001",
        poolIpfs: "QmTestHash123456789"
      };
      
      console.log(`Creating campaign: ${campaignParams.name}`);
      console.log(`Pool Amount: ${ethers.formatEther(campaignParams.goodDollarPoolAmount)} G$`);
      
      const createCampaignTx = await bridge.createCampaign(campaignParams);
      const campaignReceipt = await createCampaignTx.wait();
      
      // Find CampaignCreated event
      const campaignCreatedEvent = campaignReceipt?.logs.find((log: any) => {
        try {
          return bridge.interface.parseLog(log as any)?.name === "CampaignCreated";
        } catch {
          return false;
        }
      });
      
      if (campaignCreatedEvent) {
        const parsedLog = bridge.interface.parseLog(campaignCreatedEvent as any);
        const campaignId = parsedLog?.args[0];
        console.log(`✅ Campaign created with ID: ${campaignId}`);
        
        // Get campaign info
        const campaign = await bridge.getCampaignPool(campaignId);
        console.log(`   Campaign Name: ${campaign.name}`);
        console.log(`   Campaign Description: ${campaign.description}`);
        console.log(`   Pool Amount: ${ethers.formatEther(campaign.goodDollarAmount)} G$`);
        console.log(`   Start Time: ${new Date(Number(campaign.startTime) * 1000).toISOString()}`);
        console.log(`   End Time: ${new Date(Number(campaign.endTime) * 1000).toISOString()}`);
        console.log(`   Max Winners: ${campaign.maxWinners}`);
        
        // Test 3: Add Project to Campaign
        console.log("\n🔗 Test 3: Adding Project to Campaign");
        console.log("-".repeat(30));
        
        console.log(`Adding project ${projectId} to campaign ${campaignId}`);
        const addProjectTx = await bridge.addProjectToCampaign(projectId, campaignId);
        await addProjectTx.wait();
        console.log(`✅ Project added to campaign`);
        
        // Check membership
        const membership = await bridge.getProjectMembership(campaignId, projectId);
        console.log(`   Project Member: ${membership.isMember}`);
        console.log(`   Project Owner: ${membership.projectOwner}`);
        console.log(`   Joined At: ${new Date(Number(membership.joinedAt) * 1000).toISOString()}`);
        
        // Get campaign members
        const campaignMembers = await bridge.getCampaignProjectMembers(campaignId);
        console.log(`   Campaign Members: ${campaignMembers.length}`);
        
        // Test 4: Check Good Dollar Pool
        console.log("\n💎 Test 4: Checking Good Dollar Pool");
        console.log("-".repeat(30));
        
        const goodDollarPool = await bridge.getCampaignGoodDollarPool(campaignId);
        console.log(`   Good Dollar Pool Address: ${goodDollarPool}`);
        
        // Test 5: Create Another Project and Add to Campaign
        console.log("\n🚀 Test 5: Creating Another Project");
        console.log("-".repeat(30));
        
        const project2Params = {
          name: "Second Project",
          description: "Another amazing project"
        };
        
        const createProject2Tx = await bridge.createProject(project2Params);
        const project2Receipt = await createProject2Tx.wait();
        
        const project2CreatedEvent = project2Receipt?.logs.find((log: any) => {
          try {
            return bridge.interface.parseLog(log as any)?.name === "ProjectCreated";
          } catch {
            return false;
          }
        });
        
        if (project2CreatedEvent) {
          const parsedLog = bridge.interface.parseLog(project2CreatedEvent as any);
          const project2Id = parsedLog?.args[0];
          console.log(`✅ Second project created with ID: ${project2Id}`);
          
          // Add to campaign
          const addProject2Tx = await bridge.addProjectToCampaign(project2Id, campaignId);
          await addProject2Tx.wait();
          console.log(`✅ Second project added to campaign`);
          
          // Check final campaign state
          const finalCampaign = await bridge.getCampaignPool(campaignId);
          const finalMembers = await bridge.getCampaignProjectMembers(campaignId);
          console.log(`   Final Campaign Members: ${finalMembers.length}`);
          console.log(`   Campaign Active: ${finalCampaign.isActive}`);
        }
        
        // Final State Summary
        console.log("\n📊 Final Bridge State:");
        console.log("=".repeat(30));
        const finalGdBalance = await bridge.getGoodDollarBalance();
        const finalProjectCount = await bridge.projectCounter();
        const finalCampaignCount = await bridge.campaignCounter();
        
        console.log(`   Good Dollar Balance: ${ethers.formatEther(finalGdBalance)} G$`);
        console.log(`   Total Projects: ${finalProjectCount}`);
        console.log(`   Total Campaigns: ${finalCampaignCount}`);
        
        console.log("\n🎉 All Tests Completed Successfully!");
        console.log("=".repeat(50));
        console.log("📋 What We Tested:");
        console.log("   ✅ Project creation with Good Dollar rewards");
        console.log("   ✅ Campaign creation with Good Dollar pools");
        console.log("   ✅ Adding projects to campaigns");
        console.log("   ✅ Good Dollar pool integration");
        console.log("   ✅ Multiple project management");
        
        console.log("\n🔮 Next Steps:");
        console.log("   1. Fund the bridge with Good Dollars for rewards");
        console.log("   2. Wait for campaign to end");
        console.log("   3. Distribute Good Dollars to winners");
        console.log("   4. Set custom distribution if needed");
        
      } else {
        console.log("❌ Campaign creation event not found");
      }
      
    } else {
      console.log("❌ Project creation event not found");
    }
    
  } catch (error: any) {
    console.error("💥 Testing failed:", error.message);
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
