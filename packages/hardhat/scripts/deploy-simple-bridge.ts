#!/usr/bin/env ts-node

import { ethers } from "hardhat";
import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";

//use this contrcat fro test 
const SOVEREIGN_SEAS_ADDRESS=0x59dda5c6baca06b9939d6acf04765eafae1f6a9f

config();

async function main() {
  console.log("🚀 Deploying Simple Good Dollar Bridge...");
  console.log("=".repeat(50));
  
  try {
    // Get deployer
    const [deployer] = await ethers.getSigners();
    console.log(`🔑 Deployer: ${deployer.address}`);
    console.log(`💰 Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} CELO`);
    
    // Deploy the contract
    console.log("📦 Deploying SimpleGoodDollarBridge...");
    const SimpleBridge = await ethers.getContractFactory("SimpleGoodDollarBridge");
    const bridge = await SimpleBridge.deploy();
    await bridge.waitForDeployment();
    
    const bridgeAddress = await bridge.getAddress();
    console.log(`✅ SimpleGoodDollarBridge deployed to: ${bridgeAddress}`);
    
    // Save deployment info
    const deploymentInfo = {
      network: "celo",
      deployer: deployer.address,
      contract: bridgeAddress,
      timestamp: new Date().toISOString(),
      configuration: {
        goodDollarToken: "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A",
        directPaymentsFactory: "0xb1C7F09156d04BFf6F412447A73a0F72929b6ea4",
        defaultPoolSize: "1000000000000000000000", // 1000 G$
        projectCreationReward: "50000000000000000000" // 50 G$
      }
    };
    
    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    // Save deployment file
    const deploymentFile = path.join(deploymentsDir, "simple-bridge-deployment.json");
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    
    console.log(`💾 Deployment info saved to: ${deploymentFile}`);
    console.log("");
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(50));
    console.log(`🌉 Bridge Address: ${bridgeAddress}`);
    console.log(`🔗 Explorer: https://celoscan.io/address/${bridgeAddress}`);
    console.log("");
    console.log("📋 Next Steps:");
    console.log("   1. Fund the bridge with Good Dollars");
    console.log("   2. Create projects and campaigns");
    console.log("   3. Test the functionality");
    
    return bridgeAddress;
    
  } catch (error: any) {
    console.error("💥 Deployment failed:", error.message);
    throw error;
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
