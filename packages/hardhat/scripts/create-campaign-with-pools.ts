#!/usr/bin/env ts-node

import { ethers } from "hardhat";
import { config } from "dotenv";

config();

async function main() {
  console.log("🎯 Creating Campaign with Pools using SimpleGoodDollarBridge");
  console.log("=".repeat(60));
  
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
    
    // Step 1: Create a Project
    console.log("\n🚀 Step 1: Creating a Project");
    console.log("-".repeat(40));
    
    const projectParams = {
      name: "AI for Good - Climate Solutions",
      description: "Developing AI-powered tools to combat climate change and promote sustainability"
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
    
    if (!projectCreatedEvent) {
      throw new Error("Project creation event not found");
    }
    
    const parsedLog = bridge.interface.parseLog(projectCreatedEvent as any);
    const projectId = parsedLog?.args[0];
    console.log(`✅ Project created with ID: ${projectId}`);
    
    // Get project info
    const project = await bridge.getProject(projectId);
    console.log(`   Project Owner: ${project.owner}`);
    console.log(`   Project Name: ${project.name}`);
    console.log(`   Project Description: ${project.description}`);
    console.log(`   Project Active: ${project.active}`);
    
    // Step 2: Create a Campaign with Good Dollar Pool
    console.log("\n🎯 Step 2: Creating a Campaign with Good Dollar Pool");
    console.log("-".repeat(50));
    
    const campaignParams = {
      name: "Climate Innovation Challenge 2024",
      description: "A global challenge to fund and support innovative climate solutions using AI and blockchain technology",
      startTime: Math.floor(Date.now() / 1000), // Start now
      endTime: Math.floor(Date.now() / 1000) + 86400 * 90, // End in 90 days
      maxWinners: 10,
      goodDollarPoolAmount: ethers.parseEther("10000"), // 10,000 G$ pool
      poolProjectId: "climate-challenge-2024",
      poolIpfs: "QmClimateChallenge2024Hash123456789"
    };
    
    console.log(`Creating campaign: ${campaignParams.name}`);
    console.log(`Pool Amount: ${ethers.formatEther(campaignParams.goodDollarPoolAmount)} G$`);
    console.log(`Start Time: ${new Date(Number(campaignParams.startTime) * 1000).toISOString()}`);
    console.log(`End Time: ${new Date(Number(campaignParams.endTime) * 1000).toISOString()}`);
    console.log(`Max Winners: ${campaignParams.maxWinners}`);
    
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
    
    if (!campaignCreatedEvent) {
      throw new Error("Campaign creation event not found");
    }
    
    const campaignParsedLog = bridge.interface.parseLog(campaignCreatedEvent as any);
    const campaignId = campaignParsedLog?.args[0];
    console.log(`✅ Campaign created with ID: ${campaignId}`);
    
    // Get campaign info
    const campaign = await bridge.getCampaignPool(campaignId);
    console.log(`\n📋 Campaign Details:`);
    console.log(`   Campaign Name: ${campaign.name}`);
    console.log(`   Campaign Description: ${campaign.description}`);
    console.log(`   Pool Amount: ${ethers.formatEther(campaign.goodDollarAmount)} G$`);
    console.log(`   Start Time: ${new Date(Number(campaign.startTime) * 1000).toISOString()}`);
    console.log(`   End Time: ${new Date(Number(campaign.endTime) * 1000).toISOString()}`);
    console.log(`   Max Winners: ${campaign.maxWinners}`);
    console.log(`   Campaign Active: ${campaign.isActive}`);
    console.log(`   Has Custom Distribution: ${campaign.hasCustomDistribution}`);
    
    // Step 3: Add Project to Campaign
    console.log("\n🔗 Step 3: Adding Project to Campaign");
    console.log("-".repeat(40));
    
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
    
    // Step 4: Check Good Dollar Pool
    console.log("\n💎 Step 4: Checking Good Dollar Pool");
    console.log("-".repeat(40));
    
    const goodDollarPool = await bridge.getCampaignGoodDollarPool(campaignId);
    console.log(`   Good Dollar Pool Address: ${goodDollarPool}`);
    
    // Step 5: Create More Projects and Add to Campaign
    console.log("\n🚀 Step 5: Creating Additional Projects");
    console.log("-".repeat(40));
    
    const additionalProjects = [
      {
        name: "Renewable Energy Grid",
        description: "Smart grid technology for renewable energy distribution"
      },
      {
        name: "Carbon Capture Technology",
        description: "Advanced carbon capture and storage solutions"
      },
      {
        name: "Sustainable Agriculture",
        description: "AI-powered precision agriculture for sustainable food production"
      }
    ];
    
    for (let i = 0; i < additionalProjects.length; i++) {
      const projectData = additionalProjects[i];
      console.log(`\nCreating project ${i + 2}: ${projectData.name}`);
      
      const createProjectTx = await bridge.createProject(projectData);
      const projectReceipt = await createProjectTx.wait();
      
      const projectCreatedEvent = projectReceipt?.logs.find((log: any) => {
        try {
          return bridge.interface.parseLog(log as any)?.name === "ProjectCreated";
        } catch {
          return false;
        }
      });
      
      if (projectCreatedEvent) {
        const parsedLog = bridge.interface.parseLog(projectCreatedEvent as any);
        const additionalProjectId = parsedLog?.args[0];
        console.log(`✅ Project created with ID: ${additionalProjectId}`);
        
        // Add to campaign
        const addProjectTx = await bridge.addProjectToCampaign(additionalProjectId, campaignId);
        await addProjectTx.wait();
        console.log(`✅ Project added to campaign`);
      }
    }
    
    // Final Campaign State
    console.log("\n📊 Final Campaign State:");
    console.log("=".repeat(40));
    const finalCampaign = await bridge.getCampaignPool(campaignId);
    const finalMembers = await bridge.getCampaignProjectMembers(campaignId);
    console.log(`   Campaign Members: ${finalMembers.length}`);
    console.log(`   Campaign Active: ${finalCampaign.isActive}`);
    console.log(`   Pool Amount: ${ethers.formatEther(finalCampaign.goodDollarAmount)} G$`);
    console.log(`   Distributed Amount: ${ethers.formatEther(finalCampaign.distributedAmount)} G$`);
    
    // Final Bridge State
    console.log("\n📊 Final Bridge State:");
    console.log("=".repeat(40));
    const finalGdBalance = await bridge.getGoodDollarBalance();
    const finalProjectCount = await bridge.projectCounter();
    const finalCampaignCount = await bridge.campaignCounter();
    
    console.log(`   Good Dollar Balance: ${ethers.formatEther(finalGdBalance)} G$`);
    console.log(`   Total Projects: ${finalProjectCount}`);
    console.log(`   Total Campaigns: ${finalCampaignCount}`);
    
    console.log("\n🎉 Campaign with Pools Created Successfully!");
    console.log("=".repeat(60));
    console.log("📋 What We Accomplished:");
    console.log("   ✅ Created a project with Good Dollar rewards");
    console.log("   ✅ Created a campaign with a 10,000 G$ pool");
    console.log("   ✅ Added multiple projects to the campaign");
    console.log("   ✅ Integrated with Good Dollar pool system");
    console.log("   ✅ Set up automatic distribution mechanism");
    
    console.log("\n🔮 Next Steps:");
    console.log("   1. Fund the bridge with Good Dollars for rewards");
    console.log("   2. Wait for campaign to end (90 days)");
    console.log("   3. Distribute Good Dollars to winners");
    console.log("   4. Set custom distribution if needed");
    console.log("   5. Monitor pool performance and participation");
    
    console.log("\n💡 Key Features of This System:");
    console.log("   • Automatic Good Dollar pool creation");
    console.log("   • Project membership management");
    console.log("   • Flexible distribution mechanisms");
    console.log("   • Integration with Good Dollar ecosystem");
    console.log("   • Scalable campaign architecture");
    
  } catch (error: any) {
    console.error("💥 Campaign creation failed:", error.message);
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
