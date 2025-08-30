#!/usr/bin/env ts-node

import { ethers } from "hardhat";
import { config } from "dotenv";

config();

async function main() {
  const args = process.argv.slice(2);
  const network = args[0] || "alfajores";
  const contractAddress = args[1];

  if (!contractAddress) {
    console.error("❌ Please provide the contract address to verify");
    console.log("Usage: ts-node scripts/verify-heyzo.ts <network> <contract-address>");
    process.exit(1);
  }

  console.log(`🔍 Verifying HeyZo contract on ${network} network...`);
  console.log(`📍 Contract address: ${contractAddress}`);

  try {
    // Verify the contract using Hardhat verify
    console.log("🔍 Starting verification process...");
    
    // Use hardhat verify command
    const { exec } = require("child_process");
    const verifyCommand = `npx hardhat verify --network ${network} ${contractAddress}`;
    
    console.log(`🚀 Running: ${verifyCommand}`);
    
    exec(verifyCommand, (error: any, stdout: string, stderr: string) => {
      if (error) {
        console.error("❌ Verification failed:", error);
        console.error("stderr:", stderr);
        process.exit(1);
      }
      
      console.log("✅ Verification successful!");
      console.log("stdout:", stdout);
      
      // Get the CeloScan URL
      let celoscanUrl = "";
      if (network === "alfajores") {
        celoscanUrl = `https://alfajores.celoscan.io/address/${contractAddress}#code`;
      } else if (network === "celo") {
        celoscanUrl = `https://celoscan.io/address/${contractAddress}#code`;
      }
      
      if (celoscanUrl) {
        console.log(`🔗 View contract on CeloScan: ${celoscanUrl}`);
      }
    });
    
  } catch (error) {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
