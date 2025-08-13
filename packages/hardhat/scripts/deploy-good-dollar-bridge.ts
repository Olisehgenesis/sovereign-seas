#!/usr/bin/env ts-node

import { ethers } from "hardhat";
import { upgrades } from "hardhat";
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
  gasLimit: 8000000,
  maxFeePerGas: ethers.parseUnits("20", "gwei"),
  maxPriorityFeePerGas: ethers.parseUnits("2", "gwei")
};

class GoodDollarBridgeDeploymentManager {
  private deployments: any = {};
  private deployer: any = null;
  private network: any = null;

  async initialize() {
    console.log("🚀 Starting SovereignSeas Good Dollar Bridge Deployment");
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
      const implementation = await upgrades.deployImplementation(BridgeContract, {
        kind: "uups",
        ...GAS_SETTINGS
      });
      
      console.log(`✅ Bridge Implementation deployed: ${implementation}`);
      this.deployments.bridgeImplementation = implementation;
      
      return implementation;
    } catch (error: any) {
      console.error("❌ Bridge Implementation deployment failed:", error.message);
      throw error;
    }
  }

  async deployFactory(bridgeImplementation: string) {
    console.log("🏭 Deploying Factory Contract...");
    
    try {
      const FactoryContract = await ethers.getContractFactory("SovereignSeasGoodDollarBridgeFactory");
      
      console.log("⏳ Deploying factory with proxy...");
      const factory = await upgrades.deployProxy(
        FactoryContract,
        [this.deployer.address, bridgeImplementation],
        {
          kind: "uups",
          initializer: "initialize",
          ...GAS_SETTINGS
        }
      );
      
      await factory.waitForDeployment();
      const factoryAddress = await factory.getAddress();
      console.log(`✅ Factory deployed: ${factoryAddress}`);
      
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

  async fundBridgeWithGoodDollars(bridgeAddress: string, amount: bigint) {
    console.log("💰 Funding Bridge with Good Dollars...");
    
    try {
      // Get Good Dollar contract
      const goodDollarABI = [
        "function transfer(address to, uint256 amount) external returns (bool)",
        "function balanceOf(address account) external view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)"
      ];
      
      const goodDollar = await ethers.getContractAt(goodDollarABI, CONFIG.GOOD_DOLLAR_TOKEN);
      
      // Check deployer's G$ balance
      const balance = await goodDollar.balanceOf(this.deployer.address);
      console.log(`Deployer G$ balance: ${ethers.formatEther(balance)} G$`);
      
      if (balance < amount) {
        console.log(`⚠️  Insufficient G$ balance. Need ${ethers.formatEther(amount)} G$`);
        console.log("   Please fund the deployer address with Good Dollars first");
        return false;
      }
      
      // Transfer G$ to bridge
      console.log(`⏳ Transferring ${ethers.formatEther(amount)} G$ to bridge...`);
      const transferTx = await goodDollar.transfer(bridgeAddress, amount, GAS_SETTINGS);
      await transferTx.wait();
      
      console.log(`✅ Bridge funded with ${ethers.formatEther(amount)} G$`);
      return true;
    } catch (error: any) {
      console.error("❌ Bridge funding failed:", error.message);
      return false;
    }
  }

  async verifyDeployment() {
    console.log("🔍 Verifying Deployment...");
    
    try {
      // Verify factory
      const factory = this.deployments.factoryContract;
      const bridgeImpl = await factory.bridgeImplementation();
      const deploymentFee = await factory.deploymentFee();
      const maxBridges = await factory.maxBridgesPerUser();
      
      console.log("📋 Factory Verification:");
      console.log(`   Bridge Implementation: ${bridgeImpl}`);
      console.log(`   Deployment Fee: ${ethers.formatEther(deploymentFee)} CELO`);
      console.log(`   Max Bridges per User: ${maxBridges.toString()}`);
      
      // Verify bridge if deployed
      if (this.deployments.firstBridgeContract) {
        const bridge = this.deployments.firstBridgeContract;
        const poolSize = await bridge.goodDollarPoolSize();
        const projectReward = await bridge.projectCreationReward();
        const gdBalance = await bridge.getGoodDollarBalance();
        
        console.log("🌉 Bridge Verification:");
        console.log(`   Default Pool Size: ${ethers.formatEther(poolSize)} G$`);
        console.log(`   Project Reward: ${ethers.formatEther(projectReward)} G$`);
        console.log(`   G$ Balance: ${ethers.formatEther(gdBalance)} G$`);
      }
      
      // Verify Good Dollar integration
      const goodDollarBalance = await ethers.provider.getBalance(CONFIG.GOOD_DOLLAR_TOKEN);
      console.log("💎 Good Dollar Integration:");
      console.log(`   G$ Token: ${CONFIG.GOOD_DOLLAR_TOKEN}`);
      console.log(`   Direct Payments Factory: ${CONFIG.DIRECT_PAYMENTS_FACTORY}`);
      console.log(`   Provable NFT: ${CONFIG.PROVABLE_NFT}`);
      
      return true;
    } catch (error: any) {
      console.error("❌ Verification failed:", error.message);
      return false;
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
    const mainFile = path.join(deploymentsDir, `${CONFIG.NETWORK}-good-dollar-bridge-deployment.json`);
    fs.writeFileSync(mainFile, JSON.stringify(deploymentInfo, null, 2));
    
    // Save separate ABI files
    const factoryArtifact = await ethers.getContractFactory("SovereignSeasGoodDollarBridgeFactory");
    const bridgeArtifact = await ethers.getContractFactory("SovereignSeasGoodDollarBridge");
    
    fs.writeFileSync(
      path.join(deploymentsDir, "GoodDollarBridgeFactoryABI.json"),
      JSON.stringify(factoryArtifact.interface.fragments, null, 2)
    );
    
    fs.writeFileSync(
      path.join(deploymentsDir, "GoodDollarBridgeABI.json"),
      JSON.stringify(bridgeArtifact.interface.fragments, null, 2)
    );
    
    // Create deployment summary
    const summary = `
# SovereignSeas Good Dollar Bridge Deployment

## Network: ${this.network.name} (Chain ID: ${this.network.chainId})
## Deployed: ${new Date().toISOString()}

### Contracts:
- **Factory**: ${this.deployments.factory}
- **Bridge Implementation**: ${this.deployments.bridgeImplementation}
${this.deployments.firstBridge ? `- **First Bridge**: ${this.deployments.firstBridge}` : ''}

### Configuration:
- **Good Dollar Token**: ${CONFIG.GOOD_DOLLAR_TOKEN}
- **Direct Payments Factory**: ${CONFIG.DIRECT_PAYMENTS_FACTORY}
- **Deployment Fee**: ${ethers.formatEther(CONFIG.DEPLOYMENT_FEE)} CELO
- **Default Pool Size**: ${ethers.formatEther(CONFIG.DEFAULT_POOL_SIZE)} G$
- **Project Reward**: ${ethers.formatEther(CONFIG.PROJECT_CREATION_REWARD)} G$

### Next Steps:
1. Verify contracts on Celoscan
2. Fund bridges with Good Dollars for project rewards
3. Grant deployer roles to trusted addresses
4. Test project and campaign creation

### Useful Commands:
\`\`\`bash
# Grant deployer role
npx hardhat run scripts/grant-roles.ts --network celo

# Fund bridge with G$
npx hardhat run scripts/fund-bridge.ts --network celo

# Test deployment
npx hardhat run scripts/test-bridge.ts --network celo
\`\`\`
`;
    
    fs.writeFileSync(path.join(deploymentsDir, "GOOD_DOLLAR_BRIDGE_DEPLOYMENT_SUMMARY.md"), summary);
    
    console.log(`✅ Deployment info saved to: ${deploymentsDir}`);
    console.log(`📄 Summary: ${path.join(deploymentsDir, "GOOD_DOLLAR_BRIDGE_DEPLOYMENT_SUMMARY.md")}`);
    
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
  const deploymentManager = new GoodDollarBridgeDeploymentManager();
  
  try {
    // Initialize
    await deploymentManager.initialize();
    
    // Get SovereignSeas address from command line or environment
    const sovereignSeasAddress = process.env.SOVEREIGN_SEAS_ADDRESS || process.argv[2];
    
    if (!sovereignSeasAddress) {
      console.log("⚠️  SovereignSeas address not provided");
      console.log("   Usage: npx hardhat run scripts/deploy-good-dollar-bridge.ts --network celo <SOVEREIGN_SEAS_ADDRESS>");
      console.log("   Or set SOVEREIGN_SEAS_ADDRESS environment variable");
    }
    
    // Deploy bridge implementation
    const bridgeImplementation = await deploymentManager.deployBridgeImplementation();
    
    // Deploy factory
    const factory = await deploymentManager.deployFactory(bridgeImplementation);
    
    // Deploy first bridge if SovereignSeas address provided
    let bridge = null;
    if (sovereignSeasAddress && ethers.isAddress(sovereignSeasAddress)) {
      bridge = await deploymentManager.deployFirstBridge(factory, sovereignSeasAddress);
      
      // Try to fund bridge with Good Dollars
      const fundingAmount = CONFIG.DEFAULT_POOL_SIZE * 5n; // Fund with 5x default pool size
      await deploymentManager.fundBridgeWithGoodDollars(await bridge.getAddress(), fundingAmount);
    }
    
    // Verify deployment
    await deploymentManager.verifyDeployment();
    
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
export { main, GoodDollarBridgeDeploymentManager, CONFIG };

// Run if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
