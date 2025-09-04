#!/usr/bin/env ts-node

import hre from "hardhat";
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "viem/chains";
import * as fs from "fs";
import * as path from "path";

const { ethers } = hre;

interface FundConfig {
  network: string;
  celoAmount: string; // Amount of CELO to send to each wallet
  seasAmount: string; // Amount of SEAS tokens to mint to each wallet
}

class TestWalletFunder {
  private config: FundConfig;
  private deployer: any;
  private publicClient: any;
  private deployerWallet: any;
  private testWallets: any[] = [];
  private seasTokenAddress: string = "";

  constructor(config: FundConfig) {
    this.config = config;
  }

  private async initialize() {
    console.log(`🚀 Starting Test Wallet Funding on ${this.config.network}`);
    console.log(`💰 CELO per wallet: ${this.config.celoAmount}`);
    console.log(`🪙 SEAS per wallet: ${this.config.seasAmount}`);
    
    // Get deployer from hardhat
    const [deployer] = await ethers.getSigners();
    this.deployer = deployer;
    console.log(`📝 Deployer address: ${deployer.address}`);
    
    // Check deployer balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Deployer CELO balance: ${ethers.formatEther(balance)} CELO`);
    
    if (balance < ethers.parseEther("1")) {
      throw new Error("❌ Deployer needs at least 1 CELO to fund test wallets");
    }

    // Setup viem clients
    const rpcUrl = this.config.network === 'alfajores' 
      ? 'https://alfajores-forno.celo-testnet.org'
      : 'https://forno.celo.org';

    this.publicClient = createPublicClient({ 
      chain: celoAlfajores, 
      transport: http(rpcUrl) 
    });

    // Create deployer wallet client for viem
    const deployerPrivateKey = process.env.PRIVATE_KEY;
    if (!deployerPrivateKey) {
      throw new Error("❌ PRIVATE_KEY environment variable not set");
    }
    
    this.deployerWallet = createWalletClient({
      account: privateKeyToAccount(deployerPrivateKey as `0x${string}`),
      chain: celoAlfajores,
      transport: http(rpcUrl)
    });

    // Load test wallets
    const walletsPath = path.join(__dirname, "..", "..", "wallets", `${this.config.network}-wallets.json`);
    if (!fs.existsSync(walletsPath)) {
      throw new Error(`❌ Wallet file missing: ${walletsPath}. Run 'pnpm run test:gen-wallets' first.`);
    }
    
    const walletsData = JSON.parse(fs.readFileSync(walletsPath, "utf8"));
    this.testWallets = walletsData.wallets;
    console.log(`👛 Loaded ${this.testWallets.length} test wallets`);

    // Load SEAS token address from deployment
    const deploymentPath = path.join(__dirname, "..", "..", "deployments", this.config.network, "latest.json");
    if (!fs.existsSync(deploymentPath)) {
      throw new Error(`❌ Deployment file missing: ${deploymentPath}`);
    }
    
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    this.seasTokenAddress = deployment.contracts.seasToken;
    console.log(`🪙 SEAS token address: ${this.seasTokenAddress}`);
  }

  private async fundWithCELO() {
    console.log(`\n💸 Funding wallets with CELO...`);
    
    const celoAmount = parseEther(this.config.celoAmount);
    let totalFunded = 0;
    
    for (const wallet of this.testWallets) {
      try {
        console.log(`📤 Sending ${this.config.celoAmount} CELO to ${wallet.address}...`);
        
        const txHash = await this.deployerWallet.sendTransaction({
          to: wallet.address as `0x${string}`,
          value: celoAmount
        });
        
        // Wait for transaction to be mined
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });
        
        if (receipt.status === 'success') {
          console.log(`✅ Funded ${wallet.address} with ${this.config.celoAmount} CELO (tx: ${txHash})`);
          totalFunded++;
        } else {
          console.log(`❌ Failed to fund ${wallet.address}`);
        }
        
        // Small delay between transactions
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`❌ Error funding ${wallet.address}: ${error.message}`);
      }
    }
    
    console.log(`\n📊 CELO Funding Summary:`);
    console.log(`   Successfully funded: ${totalFunded}/${this.testWallets.length} wallets`);
    console.log(`   Total CELO sent: ${(totalFunded * parseFloat(this.config.celoAmount)).toFixed(4)} CELO`);
  }

  private async fundWithSEAS() {
    console.log(`\n🪙 Funding wallets with SEAS tokens...`);
    
    const seasAmount = parseEther(this.config.seasAmount);
    let totalFunded = 0;
    
    // Get SEAS token contract
    const seasToken = await ethers.getContractAt("SEASToken", this.seasTokenAddress);
    
    // Check deployer's SEAS balance
    const deployerSeasBalance = await seasToken.balanceOf(this.deployer.address);
    console.log(`🪙 Deployer SEAS balance: ${ethers.formatEther(deployerSeasBalance)} SEAS`);
    
    // Check if deployer has enough SEAS tokens
    const totalSeasNeeded = seasAmount * BigInt(this.testWallets.length);
    if (deployerSeasBalance < totalSeasNeeded) {
      console.log(`⚠️  Deployer needs more SEAS tokens. Minting ${ethers.formatEther(totalSeasNeeded - deployerSeasBalance)} SEAS...`);
      
      try {
        const mintTx = await seasToken.mint(this.deployer.address, totalSeasNeeded - deployerSeasBalance);
        await mintTx.wait();
        console.log(`✅ Minted ${ethers.formatEther(totalSeasNeeded - deployerSeasBalance)} SEAS tokens`);
      } catch (error) {
        console.log(`❌ Failed to mint SEAS tokens: ${error.message}`);
        return;
      }
    }
    
    for (const wallet of this.testWallets) {
      try {
        console.log(`📤 Sending ${this.config.seasAmount} SEAS to ${wallet.address}...`);
        
        const tx = await seasToken.transfer(wallet.address, seasAmount);
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
          console.log(`✅ Funded ${wallet.address} with ${this.config.seasAmount} SEAS (tx: ${tx.hash})`);
          totalFunded++;
        } else {
          console.log(`❌ Failed to fund ${wallet.address} with SEAS`);
        }
        
        // Small delay between transactions
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`❌ Error funding ${wallet.address} with SEAS: ${error.message}`);
      }
    }
    
    console.log(`\n📊 SEAS Funding Summary:`);
    console.log(`   Successfully funded: ${totalFunded}/${this.testWallets.length} wallets`);
    console.log(`   Total SEAS sent: ${(totalFunded * parseFloat(this.config.seasAmount)).toFixed(4)} SEAS`);
  }

  private async checkBalances() {
    console.log(`\n🔍 Checking wallet balances...`);
    
    const seasToken = await ethers.getContractAt("SEASToken", this.seasTokenAddress);
    
    for (const wallet of this.testWallets) {
      try {
        // Check CELO balance
        const celoBalance = await ethers.provider.getBalance(wallet.address);
        
        // Check SEAS balance
        const seasBalance = await seasToken.balanceOf(wallet.address);
        
        console.log(`👛 Wallet ${wallet.index} (${wallet.address}):`);
        console.log(`   CELO: ${ethers.formatEther(celoBalance)} CELO`);
        console.log(`   SEAS: ${ethers.formatEther(seasBalance)} SEAS`);
        
      } catch (error) {
        console.log(`❌ Error checking balance for ${wallet.address}: ${error.message}`);
      }
    }
  }

  async fund() {
    try {
      await this.initialize();
      
      // Fund with CELO
      await this.fundWithCELO();
      
      // Fund with SEAS
      await this.fundWithSEAS();
      
      // Check final balances
      await this.checkBalances();
      
      console.log(`\n🎉 Test wallet funding completed!`);
      console.log(`\n📋 Next Steps:`);
      console.log(`   1. Run comprehensive tests: pnpm run test:real:comprehensive`);
      console.log(`   2. Check test results in test-state/ directory`);
      
    } catch (error) {
      console.error(`❌ Funding failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
💰 Test Wallet Funding Tool

This script funds test wallets with CELO and SEAS tokens from your deployer wallet.

Usage:
  ts-node fund-test-wallets.ts <network> [celo-amount] [seas-amount]

Arguments:
  network      - Network to fund wallets on (alfajores, celo, etc.)
  celo-amount  - Amount of CELO to send to each wallet (default: 2)
  seas-amount  - Amount of SEAS tokens to mint to each wallet (default: 1000)

Examples:
  ts-node fund-test-wallets.ts alfajores
  ts-node fund-test-wallets.ts alfajores 2 1000
  ts-node fund-test-wallets.ts alfajores 5 5000

⚠️  WARNING: This will send real CELO tokens from your deployer wallet!
    Make sure you have sufficient balance and are on the correct network.
    `);
    process.exit(0);
  }

  const network = args[0] || 'alfajores';
  const celoAmount = args[1] || '2';
  const seasAmount = args[2] || '1000';
  
  const config: FundConfig = {
    network,
    celoAmount,
    seasAmount
  };

  const funder = new TestWalletFunder(config);
  await funder.fund();
}

if (require.main === module) {
  main().catch(console.error);
}
