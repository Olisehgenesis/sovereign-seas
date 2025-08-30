#!/usr/bin/env ts-node

import { ethers } from "hardhat";
import { config } from "dotenv";

config();

async function main() {
  const args = process.argv.slice(2);
  const network = args[0] || "alfajores";

  console.log(`🚀 Deploying HeyZo contract to ${network} network...`);

  try {
    // Get the signer
    const [deployer] = await ethers.getSigners();
    console.log(`📝 Deploying with account: ${deployer.address}`);
    console.log(`💰 Account balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);

    // Deploy the HeyZo contract
    console.log("📦 Deploying HeyZo contract...");
    const HeyZo = await ethers.getContractFactory("HeyZo");
    const heyzo = await HeyZo.deploy();
    
    await heyzo.waitForDeployment();
    const address = await heyzo.getAddress();
    
    console.log(`✅ HeyZo deployed to: ${address}`);
    console.log(`🔗 Contract address: ${address}`);
    
    // Save deployment info
    const deploymentInfo = {
      network,
      contract: "HeyZo",
      address,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      blockNumber: await ethers.provider.getBlockNumber(),
      transactionHash: heyzo.deploymentTransaction()?.hash
    };
    
    console.log("📋 Deployment info:", JSON.stringify(deploymentInfo, null, 2));
    
    // Wait a bit for the transaction to be mined
    console.log("⏳ Waiting for transaction to be mined...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log("🎉 Deployment completed successfully!");
    console.log(`🔍 To verify on CeloScan, run: npx hardhat verify --network ${network} ${address}`);
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
