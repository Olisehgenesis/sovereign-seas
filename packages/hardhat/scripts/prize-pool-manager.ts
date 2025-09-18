import hre from "hardhat";
import { loadLatestDeployment } from "./utils/deployments";
const { ethers } = hre;

interface PrizePoolManager {
  prizePool: any;
  sovereignSeas: any;
  deployer: any;
}

class PrizePoolManager {
  private publicClient: any;
  private walletClient: any;
  private deployment: any;

  constructor(publicClient: any, walletClient: any, deployment: any) {
    this.publicClient = publicClient;
    this.walletClient = walletClient;
    this.deployment = deployment;
  }

  async initialize() {
    console.log("🏊 Initializing Prize Pool Manager...");
    
    // Get the deployed contracts
    const prizePoolAddress = this.deployment.contracts.seasPrizePool;
    const sovereignSeasAddress = this.deployment.contracts.sovereignSeasV4 || this.deployment.contracts.sovereignSeasV5;
    
    if (!prizePoolAddress) {
      throw new Error("SeasPrizePool not found in deployment");
    }
    
    if (!sovereignSeasAddress) {
      throw new Error("SovereignSeas contract not found in deployment");
    }

    console.log(`   📍 Prize Pool: ${prizePoolAddress}`);
    console.log(`   📍 SovereignSeas: ${sovereignSeasAddress}`);

    // Get contract instances
    this.prizePool = await ethers.getContractAt("SeasPrizePool", prizePoolAddress);
    this.sovereignSeas = await ethers.getContractAt("ISovereignSeasV4", sovereignSeasAddress);
    
    console.log("   ✅ Prize Pool Manager initialized");
  }

  async createUniversalPool(campaignId: bigint, metadata: string = "Universal Prize Pool") {
    console.log(`🏗️ Creating universal pool for campaign ${campaignId}...`);
    
    try {
      const tx = await this.prizePool.createPoolUniversal(campaignId, metadata);
      const receipt = await tx.wait();
      
      // Get the pool ID from the event
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.prizePool.interface.parseLog(log);
          return parsed?.name === "PoolCreated";
        } catch {
          return false;
        }
      });
      
      if (event) {
        const parsed = this.prizePool.interface.parseLog(event);
        const poolId = parsed?.args.poolId;
        console.log(`   ✅ Universal pool created with ID: ${poolId}`);
        return poolId;
      } else {
        console.log("   ⚠️ Pool created but couldn't extract pool ID from event");
        return null;
      }
    } catch (error) {
      console.error(`   ❌ Failed to create universal pool:`, error);
      throw error;
    }
  }

  async createAppreciationPoolUniversal(campaignId: bigint, metadata: string = "Appreciation Prize Pool") {
    console.log(`🎉 Creating appreciation universal pool for campaign ${campaignId}...`);
    console.log(`   💝 This works even for completed campaigns!`);
    
    try {
      const tx = await this.prizePool.createAppreciationPoolUniversal(campaignId, metadata);
      const receipt = await tx.wait();
      
      // Get the pool ID from the event
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.prizePool.interface.parseLog(log);
          return parsed?.name === "AppreciationPoolCreated";
        } catch {
          return false;
        }
      });
      
      if (event) {
        const parsed = this.prizePool.interface.parseLog(event);
        const poolId = parsed?.args.poolId;
        console.log(`   ✅ Appreciation universal pool created with ID: ${poolId}`);
        return poolId;
      } else {
        console.log("   ⚠️ Pool created but couldn't extract pool ID from event");
        return null;
      }
    } catch (error) {
      console.error(`   ❌ Failed to create appreciation universal pool:`, error);
      throw error;
    }
  }

  async createERC20Pool(campaignId: bigint, allowedTokens: string[], metadata: string = "ERC20 Prize Pool") {
    console.log(`🏗️ Creating ERC20 pool for campaign ${campaignId}...`);
    console.log(`   📋 Allowed tokens: ${allowedTokens.join(", ")}`);
    
    try {
      const tx = await this.prizePool.createPoolERC20(campaignId, allowedTokens, metadata);
      const receipt = await tx.wait();
      
      // Get the pool ID from the event
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.prizePool.interface.parseLog(log);
          return parsed?.name === "PoolCreated";
        } catch {
          return false;
        }
      });
      
      if (event) {
        const parsed = this.prizePool.interface.parseLog(event);
        const poolId = parsed?.args.poolId;
        console.log(`   ✅ ERC20 pool created with ID: ${poolId}`);
        return poolId;
      } else {
        console.log("   ⚠️ Pool created but couldn't extract pool ID from event");
        return null;
      }
    } catch (error) {
      console.error(`   ❌ Failed to create ERC20 pool:`, error);
      throw error;
    }
  }

  async fundPool(poolId: bigint, tokenAddress: string, amount: bigint) {
    console.log(`💰 Funding pool ${poolId} with ${ethers.formatEther(amount)} tokens...`);
    
    try {
      let tx;
      if (tokenAddress === ethers.ZeroAddress) {
        // ETH funding
        tx = await this.prizePool.fundPool(poolId, tokenAddress, amount, { value: amount });
      } else {
        // ERC20 funding
        tx = await this.prizePool.fundPool(poolId, tokenAddress, amount);
      }
      
      await tx.wait();
      console.log(`   ✅ Pool funded successfully`);
    } catch (error) {
      console.error(`   ❌ Failed to fund pool:`, error);
      throw error;
    }
  }

  async donateToPool(poolId: bigint, tokenAddress: string, amount: bigint, message: string = "Donation") {
    console.log(`💝 Donating to pool ${poolId}...`);
    
    try {
      let tx;
      if (tokenAddress === ethers.ZeroAddress) {
        // ETH donation
        tx = await this.prizePool.donateToPool(poolId, tokenAddress, amount, message, { value: amount });
      } else {
        // ERC20 donation
        tx = await this.prizePool.donateToPool(poolId, tokenAddress, amount, message);
      }
      
      await tx.wait();
      console.log(`   ✅ Donation successful`);
    } catch (error) {
      console.error(`   ❌ Failed to donate:`, error);
      throw error;
    }
  }

  async getPoolInfo(poolId: bigint) {
    console.log(`📊 Getting pool ${poolId} information...`);
    
    try {
      const poolInfo = await this.prizePool.getPoolInfo(poolId);
      console.log(`   📋 Pool Info:`);
      console.log(`      ID: ${poolInfo.id}`);
      console.log(`      Campaign ID: ${poolInfo.campaignId}`);
      console.log(`      Admin: ${poolInfo.admin}`);
      console.log(`      Pool Type: ${poolInfo.poolType}`);
      console.log(`      Active: ${poolInfo.isActive}`);
      console.log(`      Paused: ${poolInfo.isPaused}`);
      console.log(`      Created: ${new Date(Number(poolInfo.createdAt) * 1000).toISOString()}`);
      console.log(`      Metadata: ${poolInfo.metadata}`);
      
      return poolInfo;
    } catch (error) {
      console.error(`   ❌ Failed to get pool info:`, error);
      throw error;
    }
  }

  async getPoolBalance(poolId: bigint) {
    console.log(`💰 Getting pool ${poolId} balance...`);
    
    try {
      const [tokens, balances] = await this.prizePool.getPoolBalance(poolId);
      console.log(`   💰 Pool Balances:`);
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const balance = balances[i];
        const tokenName = token === ethers.ZeroAddress ? "ETH" : token;
        console.log(`      ${tokenName}: ${ethers.formatEther(balance)}`);
      }
      
      return { tokens, balances };
    } catch (error) {
      console.error(`   ❌ Failed to get pool balance:`, error);
      throw error;
    }
  }

  async distributeQuadratic(poolId: bigint) {
    console.log(`🎯 Distributing pool ${poolId} using quadratic distribution...`);
    
    try {
      const tx = await this.prizePool.distributeQuadratic(poolId);
      await tx.wait();
      console.log(`   ✅ Quadratic distribution completed`);
    } catch (error) {
      console.error(`   ❌ Failed to distribute:`, error);
      throw error;
    }
  }

  async getRecipients(poolId: bigint) {
    console.log(`👥 Getting recipients for pool ${poolId}...`);
    
    try {
      const recipients = await this.prizePool.getRecipients(poolId);
      console.log(`   👥 Recipients (${recipients.length}):`);
      recipients.forEach((recipient, index) => {
        console.log(`      ${index + 1}. ${recipient}`);
      });
      
      return recipients;
    } catch (error) {
      console.error(`   ❌ Failed to get recipients:`, error);
      throw error;
    }
  }
}

async function main() {
  console.log("🏊 Prize Pool Manager");
  console.log("===================");
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "hardhat" : network.name;
  console.log(`🌐 Network: ${networkName}`);
  
  // Load deployment
  let deployment;
  try {
    const deploymentResult = loadLatestDeployment(networkName);
    if (!deploymentResult) {
      throw new Error("No deployment found");
    }
    deployment = deploymentResult.record;
    console.log(`📋 Loaded deployment from: ${deploymentResult.path}`);
  } catch (error) {
    console.error("❌ Failed to load deployment:", error.message);
    console.log("💡 Make sure to deploy the prize pool first using: npx hardhat run scripts/deploy-prize-pool.ts --network <network>");
    return;
  }
  
  // Initialize manager
  const manager = new PrizePoolManager(null, null, deployment);
  await manager.initialize();
  
  console.log("\n🎯 Prize Pool Manager ready!");
  console.log("💡 You can now use the manager to interact with your prize pools.");
  
  // Example usage (uncomment to test):
  /*
  try {
    // Create a universal pool for campaign 0
    const poolId = await manager.createUniversalPool(0n, "Test Universal Pool");
    
    // Fund the pool with 1 ETH
    await manager.fundPool(poolId, ethers.ZeroAddress, ethers.parseEther("1.0"));
    
    // Get pool info
    await manager.getPoolInfo(poolId);
    
    // Get pool balance
    await manager.getPoolBalance(poolId);
    
  } catch (error) {
    console.error("❌ Example usage failed:", error);
  }
  */
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Manager initialization failed:", error);
    process.exit(1);
  });
