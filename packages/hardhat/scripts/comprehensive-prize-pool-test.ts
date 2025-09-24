import hre from "hardhat";
import { loadLatestDeployment } from "./utils/deployments";
const { ethers } = hre;

interface TestResults {
  campaignId?: bigint;
  projectIds: bigint[];
  poolId?: bigint;
  distributionHash?: string;
}

class ComprehensivePrizePoolTest {
  private deployment: any;
  private sovereignSeas: any;
  private prizePool: any;
  private celoToken: any;
  private deployer: any;
  private results: TestResults;

  constructor() {
    this.results = { projectIds: [] };
  }

  async initialize() {
    console.log("🚀 Initializing Comprehensive Prize Pool Test...");
    console.log("================================================");

    // Get network info
    const network = await ethers.provider.getNetwork();
    const networkName = network.name === "unknown" ? "hardhat" : network.name;
    console.log(`🌐 Network: ${networkName}`);

    // Load deployment
    try {
      const deploymentResult = loadLatestDeployment(networkName);
      if (!deploymentResult) {
        throw new Error("No deployment found");
      }
      this.deployment = deploymentResult.record;
      console.log(`📋 Loaded deployment from: ${deploymentResult.path}`);
    } catch (error) {
      console.error("❌ Failed to load deployment:", error.message);
      console.log("💡 Make sure to deploy the contracts first using: npx hardhat run scripts/deploy-prize-pool.ts --network <network>");
      throw error;
    }

    // Get signers
    [this.deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${this.deployer.address}`);

    // Get contract instances
    const sovereignSeasAddress = this.deployment.contracts.sovereignSeasV4 || this.deployment.contracts.sovereignSeasV5;
    const prizePoolAddress = this.deployment.contracts.seasPrizePool;
    const celoTokenAddress = this.deployment.contracts.celoToken || "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9"; // CELO token address

    if (!sovereignSeasAddress) {
      throw new Error("SovereignSeas contract not found in deployment");
    }
    if (!prizePoolAddress) {
      throw new Error("SeasPrizePool contract not found in deployment");
    }

    console.log(`🏛️ SovereignSeas: ${sovereignSeasAddress}`);
    console.log(`🏊 Prize Pool: ${prizePoolAddress}`);
    console.log(`💰 CELO Token: ${celoTokenAddress}`);

    this.sovereignSeas = await ethers.getContractAt("ISovereignSeasV4", sovereignSeasAddress);
    this.prizePool = await ethers.getContractAt("SeasPrizePool", prizePoolAddress);
    this.celoToken = await ethers.getContractAt("IERC20", celoTokenAddress);

    console.log("✅ Initialization complete");
  }

  async createCampaign(): Promise<bigint> {
    console.log("\n📢 Creating Test Campaign...");
    console.log("============================");

    try {
      const startTime = Math.floor(Date.now() / 1000) + 60; // Start in 1 minute
      const endTime = startTime + (7 * 24 * 60 * 60); // End in 7 days
      const campaignCreationFee = ethers.parseEther("0.1"); // 0.1 CELO fee

      // Check if we have enough CELO for the fee
      const balance = await this.celoToken.balanceOf(this.deployer.address);
      console.log(`💰 Deployer CELO balance: ${ethers.formatEther(balance)} CELO`);
      
      if (balance < campaignCreationFee) {
        console.log(`⚠️ Insufficient CELO balance. Need ${ethers.formatEther(campaignCreationFee)} CELO for campaign creation fee.`);
        console.log("💡 Please fund the deployer account with CELO tokens.");
        throw new Error("Insufficient CELO balance for campaign creation");
      }

      // Approve the fee payment
      console.log("🔐 Approving campaign creation fee...");
      const approveTx = await this.celoToken.approve(this.sovereignSeas.target, campaignCreationFee);
      await approveTx.wait();

      const tx = await this.sovereignSeas.createCampaign(
        "Test Prize Pool Campaign", // name
        "A campaign to test the prize pool functionality", // description
        "Main campaign information", // mainInfo
        "Additional campaign details", // additionalInfo
        startTime, // startTime
        endTime, // endTime
        5, // adminFeePercentage (5%)
        10, // maxWinners
        true, // useQuadraticDistribution
        false, // useCustomDistribution
        "", // customDistributionData
        this.celoToken.target, // payoutToken (CELO)
        this.celoToken.target, // feeToken (CELO)
        { value: 0 } // No ETH value needed since we're using CELO token
      );

      const receipt = await tx.wait();
      console.log(`✅ Campaign creation transaction: ${tx.hash}`);

      // Extract campaign ID from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.sovereignSeas.interface.parseLog(log);
          return parsed?.name === "CampaignCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = this.sovereignSeas.interface.parseLog(event);
        const campaignId = parsed?.args.campaignId;
        this.results.campaignId = campaignId;
        console.log(`🎯 Campaign created with ID: ${campaignId}`);
        console.log(`   📅 Start: ${new Date(Number(startTime) * 1000).toISOString()}`);
        console.log(`   📅 End: ${new Date(Number(endTime) * 1000).toISOString()}`);
        return campaignId;
      } else {
        throw new Error("Could not extract campaign ID from event");
      }
    } catch (error) {
      console.error("❌ Failed to create campaign:", error);
      throw error;
    }
  }

  async createProjects(): Promise<bigint[]> {
    console.log("\n🏗️ Creating Test Projects...");
    console.log("=============================");

    const projectIds: bigint[] = [];

    try {
      // Create Project 1
      console.log("📝 Creating Project 1...");
      const tx1 = await this.sovereignSeas.createProject(
        "Ocean Cleanup Initiative", // name
        "A project focused on cleaning up ocean plastic waste using innovative technology", // description
        "We are a team of environmental scientists and engineers dedicated to ocean conservation.", // bioPart
        "Smart contracts for transparent fund allocation and impact tracking", // contractInfoPart
        "Additional project metadata and technical specifications", // additionalDataPart
        [], // contracts (empty for now)
        true // transferrable
      );

      const receipt1 = await tx1.wait();
      const event1 = receipt1.logs.find(log => {
        try {
          const parsed = this.sovereignSeas.interface.parseLog(log);
          return parsed?.name === "ProjectCreated";
        } catch {
          return false;
        }
      });

      if (event1) {
        const parsed = this.sovereignSeas.interface.parseLog(event1);
        const projectId1 = parsed?.args.projectId;
        projectIds.push(projectId1);
        console.log(`   ✅ Project 1 created with ID: ${projectId1}`);
      }

      // Create Project 2
      console.log("📝 Creating Project 2...");
      const tx2 = await this.sovereignSeas.createProject(
        "Marine Biodiversity Research", // name
        "Research project studying marine biodiversity and ecosystem health in coral reefs", // description
        "Our research team specializes in marine biology and conservation science.", // bioPart
        "Blockchain-based data collection and sharing platform for research findings", // contractInfoPart
        "Research methodology and expected outcomes", // additionalDataPart
        [], // contracts (empty for now)
        true // transferrable
      );

      const receipt2 = await tx2.wait();
      const event2 = receipt2.logs.find(log => {
        try {
          const parsed = this.sovereignSeas.interface.parseLog(log);
          return parsed?.name === "ProjectCreated";
        } catch {
          return false;
        }
      });

      if (event2) {
        const parsed = this.sovereignSeas.interface.parseLog(event2);
        const projectId2 = parsed?.args.projectId;
        projectIds.push(projectId2);
        console.log(`   ✅ Project 2 created with ID: ${projectId2}`);
      }

      this.results.projectIds = projectIds;
      console.log(`🎯 Created ${projectIds.length} projects successfully`);
      return projectIds;
    } catch (error) {
      console.error("❌ Failed to create projects:", error);
      throw error;
    }
  }

  async addProjectsToCampaign(campaignId: bigint, projectIds: bigint[]): Promise<void> {
    console.log("\n🔗 Adding Projects to Campaign...");
    console.log("==================================");

    try {
      const projectAdditionFee = ethers.parseEther("0.05"); // 0.05 CELO fee per project

      // Check balance for project addition fees
      const balance = await this.celoToken.balanceOf(this.deployer.address);
      const totalFee = projectAdditionFee * BigInt(projectIds.length);
      console.log(`💰 Required fee for ${projectIds.length} projects: ${ethers.formatEther(totalFee)} CELO`);
      
      if (balance < totalFee) {
        console.log(`⚠️ Insufficient CELO balance. Need ${ethers.formatEther(totalFee)} CELO for project addition fees.`);
        throw new Error("Insufficient CELO balance for project addition");
      }

      // Approve the total fee
      console.log("🔐 Approving project addition fees...");
      const approveTx = await this.celoToken.approve(this.sovereignSeas.target, totalFee);
      await approveTx.wait();

      for (let i = 0; i < projectIds.length; i++) {
        const projectId = projectIds[i];
        console.log(`📝 Adding Project ${projectId} to Campaign ${campaignId}...`);
        
        const tx = await this.sovereignSeas.addProjectToCampaign(
          campaignId,
          projectId,
          this.celoToken.target, // feeToken
          { value: 0 }
        );

        await tx.wait();
        console.log(`   ✅ Project ${projectId} added to campaign`);
      }

      console.log(`🎯 Successfully added ${projectIds.length} projects to campaign`);
    } catch (error) {
      console.error("❌ Failed to add projects to campaign:", error);
      throw error;
    }
  }

  async approveProjects(campaignId: bigint, projectIds: bigint[]): Promise<void> {
    console.log("\n🔐 Approving Projects in Campaign...");
    console.log("====================================");

    try {
      for (let i = 0; i < projectIds.length; i++) {
        const projectId = projectIds[i];
        console.log(`✅ Approving Project ${projectId} in Campaign ${campaignId}...`);
        
        const tx = await this.sovereignSeas.approveProject(campaignId, projectId);
        await tx.wait();
        console.log(`   ✅ Project ${projectId} approved`);
      }

      console.log(`🎯 Successfully approved ${projectIds.length} projects`);
    } catch (error) {
      console.error("❌ Failed to approve projects:", error);
      throw error;
    }
  }

  async createPrizePool(campaignId: bigint): Promise<bigint> {
    console.log("\n🏊 Creating Prize Pool...");
    console.log("========================");

    try {
      const tx = await this.prizePool.createPoolUniversal(
        campaignId,
        "Test Prize Pool for Campaign"
      );

      const receipt = await tx.wait();
      console.log(`✅ Prize pool creation transaction: ${tx.hash}`);

      // Extract pool ID from event
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
        this.results.poolId = poolId;
        console.log(`🎯 Prize pool created with ID: ${poolId}`);
        return poolId;
      } else {
        throw new Error("Could not extract pool ID from event");
      }
    } catch (error) {
      console.error("❌ Failed to create prize pool:", error);
      throw error;
    }
  }

  async fundPool(poolId: bigint): Promise<void> {
    console.log("\n💰 Funding Prize Pool with 5 CELO...");
    console.log("====================================");

    try {
      const fundingAmount = ethers.parseEther("5.0"); // 5 CELO
      
      // Check balance
      const balance = await this.celoToken.balanceOf(this.deployer.address);
      console.log(`💰 Deployer CELO balance: ${ethers.formatEther(balance)} CELO`);
      
      if (balance < fundingAmount) {
        console.log(`⚠️ Insufficient CELO balance. Need ${ethers.formatEther(fundingAmount)} CELO to fund the pool.`);
        throw new Error("Insufficient CELO balance for pool funding");
      }

      // Approve the funding amount
      console.log("🔐 Approving CELO transfer for pool funding...");
      const approveTx = await this.celoToken.approve(this.prizePool.target, fundingAmount);
      await approveTx.wait();

      // Fund the pool
      console.log(`💸 Funding pool ${poolId} with ${ethers.formatEther(fundingAmount)} CELO...`);
      const tx = await this.prizePool.fundPool(
        poolId,
        this.celoToken.target, // CELO token address
        fundingAmount
      );

      await tx.wait();
      console.log(`✅ Pool funded successfully with ${ethers.formatEther(fundingAmount)} CELO`);

      // Verify the funding
      const [tokens, balances] = await this.prizePool.getPoolBalance(poolId);
      console.log("📊 Pool balance after funding:");
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const balance = balances[i];
        const tokenName = token === ethers.ZeroAddress ? "ETH" : "CELO";
        console.log(`   ${tokenName}: ${ethers.formatEther(balance)}`);
      }
    } catch (error) {
      console.error("❌ Failed to fund pool:", error);
      throw error;
    }
  }

  async distributeFunds(poolId: bigint): Promise<void> {
    console.log("\n🎯 Distributing Funds to Projects...");
    console.log("=====================================");

    try {
      // First, let's check if we can distribute (campaign should be ended)
      console.log("⏰ Checking distribution eligibility...");
      
      // Get campaign info to check end time
      const campaignId = this.results.campaignId!;
      const campaignInfo = await this.sovereignSeas.campaigns(campaignId);
      const endTime = campaignInfo.endTime;
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      
      console.log(`   📅 Campaign end time: ${new Date(Number(endTime) * 1000).toISOString()}`);
      console.log(`   📅 Current time: ${new Date(Number(currentTime) * 1000).toISOString()}`);
      
      if (currentTime < endTime) {
        console.log("⚠️ Campaign has not ended yet. Distribution requires campaign to be completed.");
        console.log("💡 For testing purposes, we'll try manual distribution instead...");
        
        // Try manual distribution
        await this.manualDistribution(poolId);
        return;
      }

      // Try quadratic distribution
      console.log("🎯 Attempting quadratic distribution...");
      const tx = await this.prizePool.distributeQuadratic(poolId);
      const receipt = await tx.wait();
      
      console.log(`✅ Distribution transaction: ${tx.hash}`);
      
      // Extract distribution hash from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.prizePool.interface.parseLog(log);
          return parsed?.name === "DistributionCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = this.prizePool.interface.parseLog(event);
        this.results.distributionHash = parsed?.args.distributionHash;
        console.log(`🎯 Distribution completed with hash: ${this.results.distributionHash}`);
      }

      // Check final balances
      await this.checkFinalBalances(poolId);
    } catch (error) {
      console.error("❌ Failed to distribute funds:", error);
      console.log("💡 Trying manual distribution as fallback...");
      await this.manualDistribution(poolId);
    }
  }

  async manualDistribution(poolId: bigint): Promise<void> {
    console.log("\n🎯 Manual Distribution Fallback...");
    console.log("==================================");

    try {
      const projectIds = this.results.projectIds;
      const amounts = [ethers.parseEther("2.5"), ethers.parseEther("2.5")]; // Split 5 CELO equally
      
      console.log(`📋 Distributing to ${projectIds.length} projects:`);
      for (let i = 0; i < projectIds.length; i++) {
        console.log(`   Project ${projectIds[i]}: ${ethers.formatEther(amounts[i])} CELO`);
      }

      const tx = await this.prizePool.distributeManual(
        poolId,
        projectIds,
        amounts,
        this.celoToken.target
      );

      await tx.wait();
      console.log(`✅ Manual distribution completed: ${tx.hash}`);
      
      // Check final balances
      await this.checkFinalBalances(poolId);
    } catch (error) {
      console.error("❌ Manual distribution also failed:", error);
      throw error;
    }
  }

  async checkFinalBalances(poolId: bigint): Promise<void> {
    console.log("\n📊 Final Balance Check...");
    console.log("========================");

    try {
      const [tokens, balances] = await this.prizePool.getPoolBalance(poolId);
      console.log("💰 Final pool balances:");
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const balance = balances[i];
        const tokenName = token === ethers.ZeroAddress ? "ETH" : "CELO";
        console.log(`   ${tokenName}: ${ethers.formatEther(balance)}`);
      }

      // Check recipient balances
      const recipients = await this.prizePool.getRecipients(poolId);
      console.log(`👥 Recipients (${recipients.length}):`);
      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        const receivedAmount = await this.prizePool.getUserReceivedAmount(poolId, recipient);
        console.log(`   ${i + 1}. ${recipient}: ${ethers.formatEther(receivedAmount)} CELO`);
      }
    } catch (error) {
      console.error("❌ Failed to check final balances:", error);
    }
  }

  async runCompleteTest(): Promise<void> {
    console.log("🚀 Starting Comprehensive Prize Pool Test");
    console.log("==========================================");
    console.log("This test will demonstrate the complete flow:");
    console.log("1. Create a campaign");
    console.log("2. Create two projects");
    console.log("3. Add projects to campaign");
    console.log("4. Approve projects");
    console.log("5. Create a prize pool");
    console.log("6. Fund pool with 5 CELO");
    console.log("7. Distribute funds to projects");
    console.log("");

    try {
      // Step 1: Create campaign
      const campaignId = await this.createCampaign();
      
      // Step 2: Create projects
      const projectIds = await this.createProjects();
      
      // Step 3: Add projects to campaign
      await this.addProjectsToCampaign(campaignId, projectIds);
      
      // Step 4: Approve projects
      await this.approveProjects(campaignId, projectIds);
      
      // Step 5: Create prize pool
      const poolId = await this.createPrizePool(campaignId);
      
      // Step 6: Fund pool
      await this.fundPool(poolId);
      
      // Step 7: Distribute funds
      await this.distributeFunds(poolId);

      console.log("\n🎉 Test Completed Successfully!");
      console.log("===============================");
      console.log(`📊 Test Results:`);
      console.log(`   Campaign ID: ${this.results.campaignId}`);
      console.log(`   Project IDs: ${this.results.projectIds.join(", ")}`);
      console.log(`   Pool ID: ${this.results.poolId}`);
      console.log(`   Distribution Hash: ${this.results.distributionHash || "Manual distribution"}`);
      
    } catch (error) {
      console.error("\n❌ Test Failed:", error);
      throw error;
    }
  }
}

async function main() {
  const test = new ComprehensivePrizePoolTest();
  
  try {
    await test.initialize();
    await test.runCompleteTest();
  } catch (error) {
    console.error("❌ Test execution failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("\n✅ All tests completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test execution failed:", error);
    process.exit(1);
  });
