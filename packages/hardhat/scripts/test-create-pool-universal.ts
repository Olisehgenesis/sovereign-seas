#!/usr/bin/env ts-node

import hre from "hardhat";
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import * as fs from "fs";
import * as path from "path";

const { ethers } = hre;

interface TestConfig {
  network: string;
  poolAddress: string;
  campaignId: number;
  metadata: string;
  privateKey?: string; // Optional private key for testing
}

class CreatePoolUniversalTester {
  private config: TestConfig;
  private publicClient: any;
  private walletClient: any;
  private account: any;

  constructor(config: TestConfig) {
    this.config = config;
  }

  private async initialize() {
    console.log(`🚀 Starting CreatePoolUniversal Test on ${this.config.network}`);
    console.log(`📍 Pool Address: ${this.config.poolAddress}`);
    console.log(`🆔 Campaign ID: ${this.config.campaignId}`);
    console.log(`📝 Metadata: ${this.config.metadata}`);
    
    // Setup viem clients for Celo mainnet
    const rpcUrl = this.config.network === 'celo' 
      ? 'https://forno.celo.org'
      : 'https://alfajores-forno.celo-testnet.org';
    
    this.publicClient = createPublicClient({
      chain: celo,
      transport: http(rpcUrl),
    });

    // If private key is provided, setup wallet client
    if (this.config.privateKey) {
      this.account = privateKeyToAccount(this.config.privateKey as `0x${string}`);
      this.walletClient = createWalletClient({
        account: this.account,
        chain: celo,
        transport: http(rpcUrl),
      });
      console.log(`👤 Account: ${this.account.address}`);
    }

    console.log(`🌐 RPC URL: ${rpcUrl}`);
  }

  private async testCallStatic() {
    console.log("\n🔍 Testing createPoolUniversal with callStatic...");
    
    try {
      // Get the contract ABI from the artifact
      const artifactPath = path.join(__dirname, "../artifacts/contracts/SeasPrizePool.sol/SeasPrizePool.json");
      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
      
      // Create contract instance
      const contract = await hre.ethers.getContractAt(
        "SeasPrizePool", 
        this.config.poolAddress
      ) as any;

      console.log(`📋 Contract loaded successfully`);
      console.log(`🔗 Contract address: ${await contract.getAddress()}`);

      // Test the callStatic method
      const result = await (contract as any).callStatic.createPoolUniversal(
        this.config.campaignId,
        this.config.metadata
      );

      console.log(`✅ CallStatic successful!`);
      console.log(`📊 Result: ${result.toString()}`);
      console.log(`🎯 This would create pool ID: ${result.toString()}`);

    } catch (error: any) {
      console.log(`❌ CallStatic failed:`);
      console.log(`🔍 Error message: ${error.message}`);
      
      if (error.reason) {
        console.log(`📝 Revert reason: ${error.reason}`);
      }
      
      if (error.data) {
        console.log(`📊 Error data: ${error.data}`);
      }
      
      // Try to decode the error if it's a revert
      if (error.code === 'CALL_EXCEPTION') {
        console.log(`🚨 Contract call exception detected`);
        console.log(`💡 This might be due to:`);
        console.log(`   - Insufficient permissions`);
        console.log(`   - Invalid campaign ID`);
        console.log(`   - Contract paused`);
        console.log(`   - Other business logic restrictions`);
      }
    }
  }

  private async testDirectCall() {
    console.log("\n🔍 Testing createPoolUniversal with direct call...");
    
    try {
      // Get the contract ABI from the artifact
      const artifactPath = path.join(__dirname, "../artifacts/contracts/SeasPrizePool.sol/SeasPrizePool.json");
      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
      
      // Create contract instance
      const contract = await hre.ethers.getContractAt(
        "SeasPrizePool", 
        this.config.poolAddress
      ) as any;

      // Try to call the function directly and catch the revert
      try {
        const result = await contract.createPoolUniversal.staticCall(
          this.config.campaignId,
          this.config.metadata
        );
        console.log(`✅ Direct call successful!`);
        console.log(`📊 Result: ${result.toString()}`);
      } catch (callError: any) {
        console.log(`❌ Direct call failed:`);
        console.log(`🔍 Error message: ${callError.message}`);
        
        // Try to extract revert reason
        if (callError.reason) {
          console.log(`📝 Revert reason: ${callError.reason}`);
        }
        
        // Check if it's a specific revert
        if (callError.message.includes('Invalid campaign')) {
          console.log(`🚨 Campaign ID ${this.config.campaignId} is invalid`);
        } else if (callError.message.includes('Not campaign admin')) {
          console.log(`🚨 Caller is not admin for campaign ${this.config.campaignId}`);
        } else if (callError.message.includes('Pool already exists')) {
          console.log(`🚨 Pool already exists for campaign ${this.config.campaignId}`);
        }
      }

    } catch (error: any) {
      console.log(`❌ Direct call setup failed: ${error.message}`);
    }
  }

  private async testWithViem() {
    console.log("\n🔍 Testing createPoolUniversal with Viem...");
    
    try {
      // Get the contract ABI from the artifact
      const artifactPath = path.join(__dirname, "../artifacts/contracts/SeasPrizePool.sol/SeasPrizePool.json");
      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
      
      // Simulate the call using viem
      const result = await this.publicClient.simulateContract({
        address: this.config.poolAddress as `0x${string}`,
        abi: artifact.abi,
        functionName: 'createPoolUniversal',
        args: [BigInt(this.config.campaignId), this.config.metadata],
        account: this.account?.address,
      });

      console.log(`✅ Viem simulation successful!`);
      console.log(`📊 Result: ${result.result.toString()}`);
      console.log(`🎯 This would create pool ID: ${result.result.toString()}`);

    } catch (error: any) {
      console.log(`❌ Viem simulation failed:`);
      console.log(`🔍 Error message: ${error.message}`);
      
      if (error.shortMessage) {
        console.log(`📝 Short message: ${error.shortMessage}`);
      }
      
      if (error.details) {
        console.log(`📊 Error details: ${error.details}`);
      }
      
      // Try to extract revert reason from viem error
      if (error.message && error.message.includes('revert')) {
        const revertMatch = error.message.match(/revert (.+)/);
        if (revertMatch) {
          console.log(`🚨 Revert reason: ${revertMatch[1]}`);
        }
      }
    }
  }

  private async checkContractState() {
    console.log("\n🔍 Checking contract state...");
    
    try {
      const contract = await hre.ethers.getContractAt(
        "SeasPrizePool", 
        this.config.poolAddress
      ) as any;

      // Check if contract is paused
      try {
        const paused = await contract.paused();
        console.log(`⏸️  Contract paused: ${paused}`);
      } catch (error) {
        console.log(`ℹ️  Could not check pause status (function might not exist)`);
      }

      // Check owner
      try {
        const owner = await contract.owner();
        console.log(`👑 Contract owner: ${owner}`);
      } catch (error) {
        console.log(`ℹ️  Could not check owner (function might not exist)`);
      }

      // Check total pools count
      try {
        const totalPools = await contract.totalPools();
        console.log(`📊 Total pools: ${totalPools.toString()}`);
      } catch (error) {
        console.log(`ℹ️  Could not check total pools (function might not exist)`);
      }

    } catch (error: any) {
      console.log(`❌ Error checking contract state: ${error.message}`);
    }
  }

  async run() {
    try {
      await this.initialize();
      await this.checkContractState();
      await this.testCallStatic();
      await this.testDirectCall();
      await this.testWithViem();
      
      console.log("\n✅ Test completed successfully!");
      
    } catch (error: any) {
      console.error(`❌ Test failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  // Default configuration
  const config: TestConfig = {
    network: 'celo',
    poolAddress: '0x080c99F069148a87e8e655372e460bFEa9A7BBB3',
    campaignId: 1, // Default campaign ID
    metadata: '{"name": "Test Pool", "description": "A test pool for createPoolUniversal"}',
  };

  // Parse command line arguments
  if (args.length > 0) {
    config.campaignId = parseInt(args[0]) || config.campaignId;
  }
  
  if (args.length > 1) {
    config.metadata = args[1];
  }
  
  if (args.length > 2) {
    config.privateKey = args[2];
  }

  console.log("🎯 CreatePoolUniversal Test Script");
  console.log("=====================================");
  console.log(`📋 Configuration:`);
  console.log(`   Network: ${config.network}`);
  console.log(`   Pool Address: ${config.poolAddress}`);
  console.log(`   Campaign ID: ${config.campaignId}`);
  console.log(`   Metadata: ${config.metadata}`);
  console.log(`   Private Key: ${config.privateKey ? 'Provided' : 'Not provided (read-only test)'}`);
  console.log("");

  const tester = new CreatePoolUniversalTester(config);
  await tester.run();
}

// Usage information
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🎯 CreatePoolUniversal Test Script

Usage:
  ts-node scripts/test-create-pool-universal.ts [campaignId] [metadata] [privateKey]

Arguments:
  campaignId    Campaign ID to use (default: 1)
  metadata      JSON metadata string (default: test metadata)
  privateKey    Private key for wallet operations (optional, for read-only testing)

Examples:
  # Basic test with default values
  ts-node scripts/test-create-pool-universal.ts

  # Test with specific campaign ID
  ts-node scripts/test-create-pool-universal.ts 123

  # Test with custom metadata
  ts-node scripts/test-create-pool-universal.ts 123 '{"name": "My Pool", "description": "Custom pool"}'

  # Test with private key (for actual transaction simulation)
  ts-node scripts/test-create-pool-universal.ts 123 '{"name": "My Pool"}' 0x1234...

Notes:
  - This script tests the createPoolUniversal function on Celo mainnet
  - Pool address is hardcoded to: 0x080c99F069148a87e8e655372e460bFEa9A7BBB3
  - Uses both ethers callStatic and viem simulation for comprehensive testing
  - Shows detailed error information including revert reasons
`);
  process.exit(0);
}

// Run the script
main().catch((error) => {
  console.error(`❌ Script failed: ${error.message}`);
  process.exit(1);
});
