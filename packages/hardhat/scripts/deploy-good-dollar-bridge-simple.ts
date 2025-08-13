#!/usr/bin/env ts-node

import { ethers } from "hardhat";
import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";

config();

// Configuration
const CONFIG = {
  // Celo Mainnet Addresses
  GOOD_DOLLAR_TOKEN: "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A",
  DIRECT_PAYMENTS_FACTORY: "0xb1C7F09156d04BFf6F412447A73a0F72929b6ea4",
  PROVABLE_NFT: "0x251EEBd7d9469bbcc02Ef23c95D902Cbb7fD73B3",
  
  // Deployment Settings
  DEPLOYMENT_FEE: ethers.parseEther("0.01"), // 0.01 CELO
  MAX_BRIDGES_PER_USER: 10,
  
  // Initial Good Dollar Settings
  DEFAULT_POOL_SIZE: ethers.parseEther("1000"), // 1000 G$
  PROJECT_CREATION_REWARD: ethers.parseEther("50"), // 50 G$
  
  // Network
  NETWORK: "celo-mainnet"
};

// Gas optimization settings
const GAS_SETTINGS = {
  gasLimit: 8000000
};

class SimpleGoodDollarBridgeDeploymentManager {
  private deployments: any = {};
  private deployer: any = null;
  private network: any = null;

  async initialize() {
    console.log("🚀 Starting SovereignSeas Good Dollar Bridge Deployment (Simple)");
    console.log("=".repeat(60));
    
    // Get deployer
    const [deployer] = await ethers.getSigners();
    this.deployer = deployer;
    this.network = await ethers.provider.getNetwork();
    
    console.log("📋 Deployment Configuration:");
    console.log(`Network: ${this.network.name} (Chain ID: ${this.network.chainId})`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} CELO`);
    console.log("");
    
    // Verify we're on Celo
    if (this.network.chainId !== 42220n) {
      console.warn("⚠️  Warning: Not deploying on Celo Mainnet (Chain ID: 42220)");
      console.log("Current Chain ID:", this.network.chainId);
    }
    
    return true;
  }

  async deployBridgeImplementation() {
    console.log("📦 Deploying Bridge Implementation...");
    
    try {
      const BridgeContract = await ethers.getContractFactory("SovereignSeasGoodDollarBridge");
      
      console.log("⏳ Deploying bridge implementation contract...");
      const implementation = await BridgeContract.deploy(GAS_SETTINGS);
      await implementation.waitForDeployment();
      
      const implementationAddress = await implementation.getAddress();
      console.log(`✅ Bridge Implementation deployed: ${implementationAddress}`);
      this.deployments.bridgeImplementation = implementationAddress;
      
      return implementationAddress;
    } catch (error: any) {
      console.error("❌ Bridge Implementation deployment failed:", error.message);
      throw error;
    }
  }

  async deployFactory(bridgeImplementation: string) {
    console.log("🏭 Deploying Factory Contract...");
    
    try {
      const FactoryContract = await ethers.getContractFactory("SovereignSeasGoodDollarBridgeFactory");
      
      console.log("⏳ Deploying factory contract...");
      const factory = await FactoryContract.deploy(GAS_SETTINGS);
      await factory.waitForDeployment();
      
      const factoryAddress = await factory.getAddress();
      console.log(`✅ Factory deployed: ${factoryAddress}`);
      
      // Initialize factory
      console.log("⚙️  Initializing factory...");
      const initTx = await factory.initialize(this.deployer.address, bridgeImplementation, GAS_SETTINGS);
      await initTx.wait();
      console.log("   ✅ Factory initialized");
      
      // Configure factory settings
      console.log("⚙️  Configuring factory settings...");
      
      if (CONFIG.DEPLOYMENT_FEE > 0n) {
        const tx1 = await factory.updateDeploymentFee(CONFIG.DEPLOYMENT_FEE, GAS_SETTINGS);
        await tx1.wait();
        console.log(`   📝 Deployment fee set: ${ethers.formatEther(CONFIG.DEPLOYMENT_FEE)} CELO`);
      }
      
      if (CONFIG.MAX_BRIDGES_PER_USER !== 10) {
        const tx2 = await factory.updateMaxBridgesPerUser(CONFIG.MAX_BRIDGES_PER_USER, GAS_SETTINGS);
        await tx2.wait();
        console.log(`   📝 Max bridges per user: ${CONFIG.MAX_BRIDGES_PER_USER}`);
      }
      
      this.deployments.factory = factoryAddress;
      this.deployments.factoryContract = factory;
      
      return factory;
    } catch (error: any) {
      console.error("❌ Factory deployment failed:", error.message);
      throw error;
    }
  }

  async deployFirstBridge(factory: any, sovereignSeasAddress: string) {
    console.log("🌉 Deploying First Bridge Instance...");
    
    if (!sovereignSeasAddress) {
      console.log("⚠️  No SovereignSeas address provided, skipping bridge deployment");
      return null;
    }
    
    try {
      const deploymentParams = {
        sovereignSeas: sovereignSeasAddress,
        admin: this.deployer.address,
        network: "celo-mainnet",
        template: "standard",
        description: "Main SovereignSeas Good Dollar Bridge for Celo"
      };
      
      console.log("⏳ Deploying bridge through factory...");
      const deployTx = await factory.deployBridge(deploymentParams, {
        value: CONFIG.DEPLOYMENT_FEE,
        ...GAS_SETTINGS
      });
      
      const receipt = await deployTx.wait();
      
      // Find the BridgeDeployed event
      const bridgeDeployedEvent = receipt?.logs.find(
        (log: any) => {
          try {
            return factory.interface.parseLog(log as any)?.name === "BridgeDeployed";
          } catch {
            return false;
          }
        }
      );
      
      if (!bridgeDeployedEvent) {
        throw new Error("BridgeDeployed event not found");
      }
      
      const parsedLog = factory.interface.parseLog(bridgeDeployedEvent as any);
      const bridgeAddress = parsedLog?.args[0]; // bridge address is first arg
      console.log(`✅ First Bridge deployed: ${bridgeAddress}`);
      
      // Configure bridge settings
      console.log("⚙️  Configuring bridge settings...");
      const bridgeContract = await ethers.getContractAt("SovereignSeasGoodDollarBridge", bridgeAddress);
      
      // Update default settings if different from template
      if (CONFIG.DEFAULT_POOL_SIZE !== ethers.parseEther("1000")) {
        const tx1 = await bridgeContract.updateGoodDollarPoolSize(CONFIG.DEFAULT_POOL_SIZE, GAS_SETTINGS);
        await tx1.wait();
        console.log(`   📝 Default pool size: ${ethers.formatEther(CONFIG.DEFAULT_POOL_SIZE)} G$`);
      }
      
      if (CONFIG.PROJECT_CREATION_REWARD !== ethers.parseEther("50")) {
        const tx2 = await bridgeContract.updateProjectCreationReward(CONFIG.PROJECT_CREATION_REWARD, GAS_SETTINGS);
        await tx2.wait();
        console.log(`   📝 Project reward: ${ethers.formatEther(CONFIG.PROJECT_CREATION_REWARD)} G$`);
      }
      
      this.deployments.firstBridge = bridgeAddress;
      this.deployments.firstBridgeContract = bridgeContract;
      
      return bridgeContract;
    } catch (error: any) {
      console.error("❌ Bridge deployment failed:", error.message);
      throw error;
    }
  }

  async saveDeploymentInfo() {
    console.log("💾 Saving Deployment Information...");
    
    const deploymentInfo = {
      network: {
        name: this.network.name,
        chainId: this.network.chainId.toString(),
        timestamp: new Date().toISOString()
      },
      deployer: this.deployer.address,
      contracts: {
        bridgeImplementation: this.deployments.bridgeImplementation,
        factory: this.deployments.factory,
        firstBridge: this.deployments.firstBridge || null
      },
      configuration: {
        goodDollarToken: CONFIG.GOOD_DOLLAR_TOKEN,
        directPaymentsFactory: CONFIG.DIRECT_PAYMENTS_FACTORY,
        provableNFT: CONFIG.PROVABLE_NFT,
        deploymentFee: CONFIG.DEPLOYMENT_FEE.toString(),
        maxBridgesPerUser: CONFIG.MAX_BRIDGES_PER_USER,
        defaultPoolSize: CONFIG.DEFAULT_POOL_SIZE.toString(),
        projectCreationReward: CONFIG.PROJECT_CREATION_REWARD.toString()
      },
      verification: {
        factoryVerified: false,
        bridgeVerified: false,
        etherscanLinks: {
          factory: `https://celoscan.io/address/${this.deployments.factory}`,
          firstBridge: this.deployments.firstBridge ? `https://celoscan.io/address/${this.deployments.firstBridge}` : null
        }
      }
    };
    
    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    // Save main deployment file
    const mainFile = path.join(deploymentsDir, `${CONFIG.NETWORK}-simple-deployment.json`);
    fs.writeFileSync(mainFile, JSON.stringify(deploymentInfo, null, 2));
    
    console.log(`✅ Deployment info saved to: ${mainFile}`);
    
    return deploymentInfo;
  }

  async printSummary() {
    console.log("");
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));
    console.log(`🏭 Factory Address: ${this.deployments.factory}`);
    console.log(`📦 Implementation: ${this.deployments.bridgeImplementation}`);
    if (this.deployments.firstBridge) {
      console.log(`🌉 First Bridge: ${this.deployments.firstBridge}`);
    }
    console.log("");
    console.log("🔗 Explorer Links:");
    console.log(`   Factory: https://celoscan.io/address/${this.deployments.factory}`);
    if (this.deployments.firstBridge) {
      console.log(`   Bridge: https://celoscan.io/address/${this.deployments.firstBridge}`);
    }
    console.log("");
    console.log("📋 Next Steps:");
    console.log("   1. Verify contracts on Celoscan");
    console.log("   2. Fund bridges with Good Dollars");
    console.log("   3. Grant appropriate roles");
    console.log("   4. Test integration");
    console.log("");
  }
}

// Main deployment function
async function main() {
  const deploymentManager = new SimpleGoodDollarBridgeDeploymentManager();
  
  try {
    // Initialize
    await deploymentManager.initialize();
    
    // Get SovereignSeas address from command line or environment
    const sovereignSeasAddress = process.env.SOVEREIGN_SEAS_ADDRESS || process.argv[2];
    
    if (!sovereignSeasAddress) {
      console.log("⚠️  SovereignSeas address not provided");
      console.log("   Usage: npx hardhat run scripts/deploy-good-dollar-bridge-simple.ts --network celo <SOVEREIGN_SEAS_ADDRESS>");
      console.log("   Or set SOVEREIGN_SEAS_ADDRESS environment variable");
      console.log("   Continuing with factory deployment only...");
    }
    
    // Deploy bridge implementation
    const bridgeImplementation = await deploymentManager.deployBridgeImplementation();
    
    // Deploy factory
    const factory = await deploymentManager.deployFactory(bridgeImplementation);
    
    // Deploy first bridge if SovereignSeas address provided
    if (sovereignSeasAddress && ethers.isAddress(sovereignSeasAddress)) {
      await deploymentManager.deployFirstBridge(factory, sovereignSeasAddress);
    }
    
    // Save deployment information
    await deploymentManager.saveDeploymentInfo();
    
    // Print summary
    await deploymentManager.printSummary();
    
  } catch (error: any) {
    console.error("💥 Deployment failed:", error);
    process.exit(1);
  }
}

// Error handling
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
  process.exit(1);
});

// Export for testing
export { main, SimpleGoodDollarBridgeDeploymentManager, CONFIG };

// Run if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
