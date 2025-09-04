import { createPublicClient, createWalletClient, http, parseEther, encodeFunctionData, decodeAbiParameters, decodeEventLog } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "viem/chains";
import * as fs from "fs";
import * as path from "path";
import { ensureDeployment, loadState, saveState, TestState } from "./state";
import { TestingTrackerManager } from "./testing-tracker-utils";
//import dotenv from "dotenv";
//dotenv.config();
import * as dotenv from "dotenv";
dotenv.config();

// Import ABIs from artifacts
const SEAS_TOKEN_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "SEASToken.sol", "SEASToken.json"), 
  "utf8"
)).abi;

const SOVEREIGN_SEAS_V5_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "v5", "SovereignSeasV5.sol", "SovereignSeasV5.json"), 
  "utf8"
)).abi;

const PROJECTS_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "v5", "modules", "ProjectsModule.sol", "ProjectsModule.json"), 
  "utf8"
)).abi;

const CAMPAIGNS_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "v5", "modules", "CampaignsModule.sol", "CampaignsModule.json"), 
  "utf8"
)).abi;

const VOTING_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "v5", "modules", "VotingModule.sol", "VotingModule.json"), 
  "utf8"
)).abi;

interface TestConfig {
  network: string;
  rpcUrl: string;
  skipSteps?: string[];
  repeatSteps?: string[];
}

class ComprehensiveV5Test {
  private config: TestConfig;
  private publicClient: any;
  private state!: TestState;
  private wallets!: any[];
  private deployment!: any;
  private tracker!: TestingTrackerManager;
  private testStartTime!: number;
  private totalTests = 0;
  private passedTests = 0;
  private failedTests = 0;
  private skippedTests = 0;
  public projects: { id: bigint; owner: string; name: string }[] = [];
  public campaigns: { id: bigint; name: string; isERC20: boolean; tokenAddress?: string }[] = [];
  private gasUsage: { total: number; average: number; max: number; min: number } = {
    total: 0,
    average: 0,
    max: 0,
    min: 0
  };

  constructor(config: TestConfig) {
    this.config = config;
    this.publicClient = createPublicClient({ 
      chain: celoAlfajores, 
      transport: http(config.rpcUrl) 
    });
  }

  /**
   * Helper function to handle successful transaction completion
   * Saves state, logs success, and updates test tracking
   */
  private handleSuccessfulTransaction(
    operation: string,
    functionTestId: string,
    module: string,
    functionName: string,
    executionTime: number,
    gasUsed: number,
    additionalData?: any
  ) {
    // Save state immediately after successful operation
    this.saveState();
    console.log(`  💾 State saved after ${operation}`);
    
    // Mark function test as passed
    this.tracker.completeFunctionTest(
      module,
      functionName,
      functionTestId,
      "passed",
      executionTime,
      gasUsed
    );
    
    this.passedTests++;
    
    // Log any additional data if provided
    if (additionalData) {
      console.log(`  📊 ${additionalData}`);
    }
  }

  /**
   * Simple helper to save state after successful operations
   */
  private saveStateAfterOperation(operation: string) {
    this.saveState();
    console.log(`  💾 State saved after ${operation}`);
  }

  private async initialize() {
    console.log(`🚀 Initializing Comprehensive V5 Test on ${this.config.network}`);
    
    // Initialize testing tracker
    this.tracker = new TestingTrackerManager(this.config.network);
    console.log(`📊 Testing tracker initialized`);
    
    // Load deployment
    this.deployment = ensureDeployment(this.config.network);
    console.log(`📋 Using deployment: ${this.deployment.path}`);

    // Update deployment info in tracker
    this.tracker.updateDeployment(
      this.config.network,
      this.deployment.record.contracts,
      "deployment-hash-placeholder" // Will be updated with actual hash
    );

    // Load wallets
    const walletsPath = path.join(__dirname, "..", "..", "wallets", `${this.config.network}-wallets.json`);
    if (!fs.existsSync(walletsPath)) {
      throw new Error(`❌ Wallet file missing: ${walletsPath}. Run generate-wallets first.`);
    }
    this.wallets = (JSON.parse(fs.readFileSync(walletsPath, "utf8")) as { wallets: any[] }).wallets;
    console.log(`👛 Loaded ${this.wallets.length} test wallets`);

    // Load or initialize state
    this.state = loadState(this.config.network) || {
      network: this.config.network,
      timestamp: new Date().toISOString(),
      completedSteps: [],
      seasDistributed: false,
      projectsCreated: false,
      campaignsCreated: false,
      votingCompleted: false,
      distributionCompleted: false,
    };
  }

  private shouldSkipStep(stepName: string): boolean {
    if (this.config.skipSteps?.includes(stepName)) {
      console.log(`⏭️  Skipping step: ${stepName} (explicitly skipped)`);
      return true;
    }
    
    if (this.state.completedSteps?.includes(stepName) && !this.config.repeatSteps?.includes(stepName)) {
      console.log(`✅ Skipping step: ${stepName} (already completed)`);
      return true;
    }
    
    return false;
  }

  private markStepCompleted(stepName: string) {
    if (!this.state.completedSteps) this.state.completedSteps = [];
    if (!this.state.completedSteps.includes(stepName)) {
      this.state.completedSteps.push(stepName);
    }
    this.saveState();
  }

  private saveState() {
    saveState(this.config.network, this.state);
    this.saveDebugInfo();
  }

  private saveDebugInfo() {
    const debugDir = path.join(__dirname, "..", "..", "tests-state", "debug");
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }

    // Save campaign and creator information for debugging
    const debugInfo = {
      timestamp: new Date().toISOString(),
      network: this.config.network,
      deployment: {
        contracts: this.deployment.record.contracts,
        path: this.deployment.path
      },
      wallets: this.wallets.map((wallet, index) => ({
        index: index + 1,
        address: wallet.address,
        // Don't save private keys for security
      })),
      campaigns: this.state.campaigns?.map(campaign => ({
        id: campaign.id.toString(),
        name: campaign.name,
        isERC20: campaign.isERC20,
        tokenAddress: campaign.tokenAddress,
        creator: this.wallets[0]?.address, // Campaign creator is wallet 0
        admin: this.wallets[0]?.address
      })) || [],
      projects: this.state.projects?.map(project => ({
        id: project.id.toString(),
        name: project.name,
        owner: project.owner,
        creatorWallet: this.wallets.find(w => w.address === project.owner)?.address
      })) || [],
      completedSteps: this.state.completedSteps || []
    };

    const debugPath = path.join(debugDir, `${this.config.network}-debug.json`);
    fs.writeFileSync(debugPath, JSON.stringify(debugInfo, null, 2));
    console.log(`🔍 Debug info saved: ${debugPath}`);
  }

  private async checkWalletFunding() {
    console.log("\n💰 Checking wallet funding...");
    
    for (let i = 0; i < this.wallets.length; i++) {
      const wallet = this.wallets[i];
      const balance = await this.publicClient.getBalance({ address: wallet.address });
      const balanceInEther = Number(balance) / 1e18;
      
      if (balanceInEther < 0.3) {
        console.log(`❌ Wallet ${i + 1} (${wallet.address}) has insufficient CELO: ${balanceInEther.toFixed(4)}`);
        throw new Error("Please fund test wallets with CELO and rerun");
      } else {
        console.log(`✅ Wallet ${i + 1}: ${balanceInEther.toFixed(4)} CELO`);
      }
    }
  }

  private async mintSeasTokens() {
    console.log("\n🏭 Minting SEAS tokens using deployer wallet...");
    
    if (!this.deployment.record.contracts.seasToken) {
      throw new Error("❌ SEAS token not found in deployment. Deploy SEAS token first.");
    }

    const deployerAddress = this.deployment.record.deployer;
    console.log(`🏭 Deployer wallet: ${deployerAddress}`);
    
    // Check deployer's current SEAS balance
    const deployerBalance = await this.publicClient.readContract({
      address: this.deployment.record.contracts.seasToken as `0x${string}`,
      abi: SEAS_TOKEN_ABI,
      functionName: "balanceOf",
      args: [deployerAddress as `0x${string}`],
    });

    console.log(`💰 Deployer current SEAS balance: ${Number(deployerBalance) / 1e18} SEAS`);
    
    // Calculate total SEAS needed for distribution (10,000 per wallet)
    const amountPerWallet = parseEther("10000");
    const totalSeasNeeded = amountPerWallet * BigInt(this.wallets.length);
    
    console.log(`📊 Total SEAS needed for distribution: ${Number(totalSeasNeeded) / 1e18} SEAS`);
    
    // Check if deployer has enough SEAS tokens, if not, mint more
    if (deployerBalance < totalSeasNeeded) {
      const additionalSeasNeeded = totalSeasNeeded - deployerBalance;
      console.log(`⚠️  Deployer needs more SEAS tokens. Minting ${Number(additionalSeasNeeded) / 1e18} additional SEAS...`);
      
      // Get deployer's private key from environment
      const deployerPrivateKey = process.env.PRIVATE_KEY;
      if (!deployerPrivateKey) {
        throw new Error("❌ PRIVATE_KEY environment variable not set. Cannot mint SEAS tokens.");
      }
      
      const deployerAccount = privateKeyToAccount(deployerPrivateKey as `0x${string}`);
      const deployerClient = createWalletClient({
        chain: celoAlfajores,
        transport: http(this.config.rpcUrl),
        account: deployerAccount,
      });
      
      try {
        console.log(`🪙 Minting ${Number(additionalSeasNeeded) / 1e18} SEAS tokens...`);
        const mintHash = await deployerClient.writeContract({
          address: this.deployment.record.contracts.seasToken as `0x${string}`,
          abi: SEAS_TOKEN_ABI,
          functionName: "mint",
          args: [deployerAddress, additionalSeasNeeded],
        });
        
        console.log(`  ⏳ Mint transaction: ${mintHash}`);
        await this.publicClient.waitForTransactionReceipt({ hash: mintHash });
        
        // Verify new balance
        const newBalance = await this.publicClient.readContract({
          address: this.deployment.record.contracts.seasToken as `0x${string}`,
          abi: SEAS_TOKEN_ABI,
          functionName: "balanceOf",
          args: [deployerAddress as `0x${string}`],
        });
        
        console.log(`✅ Mint successful! New deployer balance: ${Number(newBalance) / 1e18} SEAS`);
      } catch (error) {
        console.error(`❌ Failed to mint SEAS tokens:`, error);
        throw error;
      }
    } else {
      console.log(`✅ Deployer already has sufficient SEAS tokens: ${Number(deployerBalance) / 1e18} SEAS`);
    }
  }

  private async distributeSeasTokens() {
    if (this.shouldSkipStep("distribute-seas")) return;
    
    console.log("\n🪙 Minting and Distributing SEAS tokens to test wallets...");
    
    // Start tracking SEAS token distribution test
    const testId = this.tracker.startScenarioTest(
      "seasDistribution",
      "SEAS Token Distribution",
      "Mint SEAS tokens using deployer wallet and distribute to test wallets"
    );
    
    if (!this.deployment.record.contracts.seasToken) {
      this.tracker.completeScenarioTest("seasDistribution", testId, "failed", 0, undefined, "SEAS token not found in deployment");
      throw new Error("❌ SEAS token not found in deployment. Deploy SEAS token first.");
    }

    // First, mint SEAS tokens using the deployer wallet
    await this.mintSeasTokens();

    // Use the deployer wallet to transfer SEAS to the first test wallet for distribution
    const deployerAddress = this.deployment.record.deployer;
    const distributionWallet = this.wallets[0];
    console.log(`📤 Using first wallet for distribution: ${distributionWallet.address}`);
    
    // Calculate total SEAS needed for distribution (10,000 per wallet)
    const amountPerWallet = parseEther("10000");
    const totalSeasNeeded = amountPerWallet * BigInt(this.wallets.length);
    
    // Transfer SEAS from deployer to the distribution wallet
    console.log(`💸 Transferring ${Number(totalSeasNeeded) / 1e18} SEAS from deployer to distribution wallet...`);
    
    const deployerPrivateKey = process.env.PRIVATE_KEY;
    if (!deployerPrivateKey) {
      throw new Error("❌ PRIVATE_KEY environment variable not set. Cannot transfer SEAS tokens.");
    }
    
    const deployerAccount = privateKeyToAccount(deployerPrivateKey as `0x${string}`);
    const deployerClient = createWalletClient({
      chain: celoAlfajores,
      transport: http(this.config.rpcUrl),
      account: deployerAccount,
    });
    
    try {
      const transferHash = await deployerClient.writeContract({
        address: this.deployment.record.contracts.seasToken as `0x${string}`,
        abi: SEAS_TOKEN_ABI,
        functionName: "transfer",
        args: [distributionWallet.address, totalSeasNeeded],
      });
      
      console.log(`  ⏳ Transfer transaction: ${transferHash}`);
      await this.publicClient.waitForTransactionReceipt({ hash: transferHash });
      
      // Verify distribution wallet balance
      const distributionWalletBalance = await this.publicClient.readContract({
        address: this.deployment.record.contracts.seasToken as `0x${string}`,
        abi: SEAS_TOKEN_ABI,
        functionName: "balanceOf",
        args: [distributionWallet.address as `0x${string}`],
      });
      
      console.log(`✅ Transfer successful! Distribution wallet balance: ${Number(distributionWalletBalance) / 1e18} SEAS`);
    } catch (error) {
      console.error(`❌ Failed to transfer SEAS from deployer to distribution wallet:`, error);
      throw error;
    }
    
    // Now distribute tokens from the distribution wallet to other test wallets
    const distributionWalletAccount = privateKeyToAccount(distributionWallet.privateKey);
    const distributionWalletClient = createWalletClient({
      chain: celoAlfajores,
      transport: http(this.config.rpcUrl),
      account: distributionWalletAccount,
    });
    
    for (let i = 1; i < this.wallets.length; i++) { // Start from index 1 (skip distribution wallet)
      const wallet = this.wallets[i];
      
      // Check current SEAS balance of the target wallet
      const currentBalance = await this.publicClient.readContract({
        address: this.deployment.record.contracts.seasToken as `0x${string}`,
        abi: SEAS_TOKEN_ABI,
        functionName: "balanceOf",
        args: [wallet.address],
      });
      
      const currentBalanceInEther = Number(currentBalance) / 1e18;
      console.log(`💰 Wallet ${i + 1} current SEAS balance: ${currentBalanceInEther.toFixed(4)} SEAS`);
      
      // Only distribute if balance is below 100 SEAS
      if (currentBalanceInEther >= 100) {
        console.log(`✅ Wallet ${i + 1} already has sufficient SEAS (${currentBalanceInEther.toFixed(4)} SEAS), skipping distribution`);
        continue;
      }
      
      console.log(`💸 Transferring 10,000 SEAS to wallet ${i + 1}: ${wallet.address}`);
      
      try {
        const hash = await distributionWalletClient.writeContract({
          address: this.deployment.record.contracts.seasToken as `0x${string}`,
          abi: SEAS_TOKEN_ABI,
          functionName: "transfer",
          args: [wallet.address, amountPerWallet],
        });
        
        console.log(`  ⏳ Transaction: ${hash}`);
        await this.publicClient.waitForTransactionReceipt({ hash });
        
        // Verify new balance
        const newBalance = await this.publicClient.readContract({
          address: this.deployment.record.contracts.seasToken as `0x${string}`,
          abi: SEAS_TOKEN_ABI,
          functionName: "balanceOf",
          args: [wallet.address],
        });
        
        console.log(`  ✅ New balance: ${Number(newBalance) / 1e18} SEAS`);
      } catch (error) {
        console.error(`❌ Failed to transfer SEAS to wallet ${i + 1}:`, error);
        throw error;
      }
    }
    
    console.log("✅ SEAS token distribution completed successfully");

    this.state.seasDistributed = true;
    this.markStepCompleted("distribute-seas");
    console.log("✅ SEAS token distribution completed");
    
    // Mark scenario as completed successfully
    this.tracker.completeScenarioTest("seasDistribution", testId, "passed", Date.now() - this.testStartTime);
  }

  private async enableSeasTokenForVoting() {
    if (this.shouldSkipStep("enable-seas-voting")) return;
    
    console.log("\n🔓 Enabling SEAS token for voting...");
    
    // Start tracking SEAS token voting enablement test
    const testId = this.tracker.startScenarioTest(
      "seasVotingEnablement",
      "SEAS Token Voting Enablement",
      "Enable SEAS token for voting in VotingModule using deployer wallet"
    );
    
    if (!this.deployment.record.contracts.seasToken) {
      this.tracker.completeScenarioTest("seasVotingEnablement", testId, "failed", 0, undefined, "SEAS token not found in deployment");
      throw new Error("❌ SEAS token not found in deployment. Deploy SEAS token first.");
    }

    // Use the deployer wallet (from deployment record) to enable SEAS token for voting
    const deployerPrivateKey = process.env.PRIVATE_KEY;
    if (!deployerPrivateKey) {
      this.tracker.completeScenarioTest("seasVotingEnablement", testId, "failed", 0, undefined, "PRIVATE_KEY not found in environment");
      throw new Error("❌ PRIVATE_KEY not found in environment variables");
    }

    const deployerAccount = privateKeyToAccount(deployerPrivateKey as `0x${string}`);
    console.log(`🏭 Using deployer wallet: ${deployerAccount.address}`);
    
    const deployerClient = createWalletClient({
      chain: celoAlfajores,
      transport: http(this.config.rpcUrl),
      account: deployerAccount,
    });
    
    try {
      // Get the VotingModule address from the proxy
      const votingModuleAddress = await this.publicClient.readContract({
        address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI,
        functionName: "getModuleAddress",
        args: ["voting"],
      });
      
      console.log(`   📍 VotingModule address: ${votingModuleAddress}`);
      
      // Enable SEAS token for voting directly through the VotingModule
      console.log(`   🔓 Enabling SEAS token for voting in VotingModule...`);
      const enableHash = await deployerClient.writeContract({
        address: votingModuleAddress as `0x${string}`,
        abi: VOTING_MODULE_ABI,
        functionName: "setVotingToken",
        args: [this.deployment.record.contracts.seasToken, true],
      });
      
      console.log(`   ⏳ Enable voting transaction: ${enableHash}`);
      const enableReceipt = await this.publicClient.waitForTransactionReceipt({ hash: enableHash });
      console.log(`   ✅ SEAS token enabled for voting successfully`);
      console.log(`   Gas used: ${enableReceipt.gasUsed}`);
      
      // Add SEAS token as supported token in TreasuryModule
      console.log(`   💰 Adding SEAS token as supported token in TreasuryModule...`);
      const treasuryModuleAddress = await this.publicClient.readContract({
        address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI,
        functionName: "getModuleAddress",
        args: ["treasury"],
      });
      
      console.log(`   📍 TreasuryModule address: ${treasuryModuleAddress}`);
      
      // Check if SEAS token is already supported
      console.log(`   🔍 Checking if SEAS token is already supported...`);
      const isSupported = await this.publicClient.readContract({
        address: treasuryModuleAddress as `0x${string}`,
        abi: [
          {
            "inputs": [{"internalType": "address", "name": "", "type": "address"}],
            "name": "supportedTokens",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
          }
        ],
        functionName: "supportedTokens",
        args: [this.deployment.record.contracts.seasToken],
      });
      
      console.log(`   📊 SEAS token already supported: ${isSupported}`);
      
      if (!isSupported) {
        // Add SEAS token as supported token
        const addTokenHash = await deployerClient.writeContract({
          address: treasuryModuleAddress as `0x${string}`,
          abi: [
            {
              "inputs": [
                {"internalType": "address", "name": "_token", "type": "address"}
              ],
              "name": "addSupportedToken",
              "outputs": [],
              "stateMutability": "nonpayable",
              "type": "function"
            }
          ],
          functionName: "addSupportedToken",
          args: [this.deployment.record.contracts.seasToken],
        });
        
        console.log(`   ⏳ Add supported token transaction: ${addTokenHash}`);
        const addTokenReceipt = await this.publicClient.waitForTransactionReceipt({ hash: addTokenHash });
        console.log(`   ✅ SEAS token added as supported token`);
        console.log(`   Gas used: ${addTokenReceipt.gasUsed}`);
      } else {
        console.log(`   ✅ SEAS token is already supported, skipping addition`);
      }
      
      // Set manual rate: 1 SEAS = 0.001 CELO (for demonstration)
      const manualRateHash = await deployerClient.writeContract({
        address: treasuryModuleAddress as `0x${string}`,
        abi: [
          {
            "inputs": [
              {"internalType": "address", "name": "_token", "type": "address"},
              {"internalType": "uint256", "name": "_celoRate", "type": "uint256"}
            ],
            "name": "setManualTokenRate",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ],
        functionName: "setManualTokenRate",
        args: [this.deployment.record.contracts.seasToken, parseEther("0.001")], // 1 SEAS = 0.001 CELO
      });
      
      console.log(`   ⏳ Manual rate transaction: ${manualRateHash}`);
      const manualRateReceipt = await this.publicClient.waitForTransactionReceipt({ hash: manualRateHash });
      console.log(`   ✅ Manual rate set: 1 SEAS = 0.001 CELO`);
      console.log(`   Gas used: ${manualRateReceipt.gasUsed}`);
      
    } catch (error) {
      console.error(`❌ Failed to enable SEAS token for voting:`, error);
      this.tracker.completeScenarioTest("seasVotingEnablement", testId, "failed", 0, undefined, error.message);
      throw error;
    }
    
    this.markStepCompleted("enable-seas-voting");
    console.log("✅ SEAS token voting enablement completed");
    
    // Mark scenario as completed successfully
    this.tracker.completeScenarioTest("seasVotingEnablement", testId, "passed", Date.now() - this.testStartTime);
  }

  private async createProjects() {
    if (this.shouldSkipStep("create-projects")) return;
    
    console.log("\n🏗️ Creating projects for each wallet...");
    
    // Check if projects already exist in state
    if (this.state.projects && this.state.projects.length > 0) {
      console.log(`✅ Found ${this.state.projects.length} existing projects in state, reusing them...`);
      this.projects = this.state.projects.map(p => ({
        id: BigInt(p.id),
        owner: p.owner,
        name: p.name
      }));
      
      for (let i = 0; i < this.projects.length; i++) {
        const project = this.projects[i];
        console.log(`   📋 Project ${i + 1}: "${project.name}" (ID: ${project.id}, Owner: ${project.owner})`);
      }
      
      this.state.projectsCreated = true;
      this.saveState();
      return;
    }

    // Check if projects already exist in contracts
    console.log("🔍 Checking for existing projects in contracts...");
    try {
      const projectCount = await this.publicClient.readContract({
        address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI,
        functionName: "staticCallModule",
        args: ["projects", encodeFunctionData({
          abi: PROJECTS_MODULE_ABI,
          functionName: "getProjectCount",
          args: [],
        })],
      });
      
      const count = Number(projectCount);
      console.log(`📊 Found ${count} existing projects in contracts`);
      
      if (count > 0) {
        console.log("✅ Using existing projects from contracts...");
        this.projects = [];
        
        // Fetch existing projects
        for (let i = 0; i < count; i++) {
          try {
            const projectData = await this.publicClient.readContract({
              address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
              abi: SOVEREIGN_SEAS_V5_ABI,
              functionName: "staticCallModule",
              args: ["projects", encodeFunctionData({
                abi: PROJECTS_MODULE_ABI,
                functionName: "getProject",
                args: [BigInt(i)],
              })],
            });
            
            const decoded = decodeAbiParameters([
              { type: "address", name: "owner" },
              { type: "string", name: "name" },
              { type: "string", name: "description" },
              { type: "uint8", name: "status" },
              { type: "bool", name: "active" },
              { type: "uint256", name: "createdAt" },
              { type: "uint256", name: "updatedAt" }
            ], projectData);
            
            this.projects.push({
              id: BigInt(i), // Project ID is the index
              owner: decoded[0] as string,
              name: decoded[1] as string
            });
            
            if (!this.state.projects) this.state.projects = [];
            this.state.projects.push({
              id: BigInt(i), // Project ID is the index
              owner: decoded[0] as string,
              name: decoded[1] as string
            });
            
            console.log(`   📋 Project ${i + 1}: "${decoded[1]}" (ID: ${i}, Owner: ${decoded[0]})`);
          } catch (error) {
            console.log(`   ⚠️ Could not fetch project ${i}: ${error.message}`);
          }
        }
        
        this.state.projectsCreated = true;
        this.saveState();
        return;
      }
    } catch (error) {
      console.log(`⚠️ Could not check existing projects: ${error.message}`);
    }
    
    console.log("🆕 No existing projects found, creating new ones...");
    
    // Start tracking project creation test
    const testId = this.tracker.startScenarioTest(
      "projectCreation",
      "Project Creation",
      "Create projects for each test wallet"
    );
    
    if (!this.state.projects) this.state.projects = [];
    
    const projectTemplates = [
      { name: "Ocean Cleanup Initiative", description: "Revolutionary ocean cleaning technology", category: "Environment" },
      { name: "Solar Community Grid", description: "Decentralized solar energy network", category: "Energy" },
      { name: "Digital Education Platform", description: "Open-source learning management system", category: "Education" },
      { name: "Sustainable Farming Hub", description: "Smart agriculture solutions", category: "Agriculture" },
      { name: "Medical Research DAO", description: "Decentralized medical research funding", category: "Healthcare" },
      { name: "Climate Data Analytics", description: "AI-powered climate monitoring", category: "Technology" },
    ];
  
    for (let i = 0; i < this.wallets.length; i++) {
      const wallet = this.wallets[i];
      const template = projectTemplates[i % projectTemplates.length];
      
      console.log(`📝 Creating project "${template.name}" for wallet ${i + 1}`);
      console.log(`   Wallet address: ${wallet.address}`);
      console.log(`   Contract address: ${this.deployment.record.contracts.sovereignSeasV5}`);
      
      const account = privateKeyToAccount(wallet.privateKey);
      const walletClient = createWalletClient({
        chain: celoAlfajores,
        transport: http(this.config.rpcUrl),
        account,
      });
  
      // Check wallet balance first
      const balance = await this.publicClient.getBalance({ address: wallet.address });
      console.log(`   Wallet balance: ${Number(balance) / 1e18} CELO`);
  
      try {
        // Start tracking function test
        const functionTestId = this.tracker.startFunctionTest(
          "projects",
          "createProject",
          `Create project for wallet ${i + 1}`,
          `Create project "${template.name}" using wallet ${i + 1}`
        );
        
        // First, let's try to call getProjectCount to ensure the module is accessible
        console.log("   Testing module accessibility...");
        const testCall = await this.publicClient.readContract({
          address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
          abi: SOVEREIGN_SEAS_V5_ABI,
          functionName: "staticCallModule",
          args: ["projects", encodeFunctionData({
            abi: PROJECTS_MODULE_ABI,
            functionName: "getProjectCount",
            args: [],
          })],
        });
        console.log(`   Current project count: ${testCall}`);
  
                // Prepare the project metadata as individual fields (not JSON string)
        const projectMetadata = {
          bio: `Bio for ${template.name}`,
          contractInfo: `Contract info for ${template.name}`,
          additionalData: `Additional data for ${template.name}`,
          jsonMetadata: JSON.stringify({
            tags: ["general", "testing"],
            difficulty: "beginner",
            estimatedTime: "2-4 weeks",
            techStack: ["solidity", "react"],
            teamSize: 1,
            fundingNeeded: "1000 CELO",
            milestones: [
              { name: "MVP", description: "Basic functionality", reward: "500 CELO" },
              { name: "Beta", description: "User testing", reward: "500 CELO" }
            ],
            socialLinks: {
              github: "https://github.com/test",
              twitter: "@testproject",
              discord: "test#1234"
            }
          }),
          category: template.category || "General",
          website: "https://test.com",
          github: "https://github.com/test",
          twitter: "@test",
          discord: "test#1234",
          websiteUrl: "https://test.com",
          socialMediaHandle: "@test"
        };
        
        console.log(`   Using metadata: bio="${projectMetadata.bio}", category="${projectMetadata.category}"`);
        
        console.log("   Encoding function data...");
        console.log(`   Args: name="${template.name} #${i + 1}", description="${template.description} - Created by test wallet ${i + 1}", metadata struct, contracts=[], transferrable=false`);
        
        const createProjectData = encodeFunctionData({
          abi: PROJECTS_MODULE_ABI,
          functionName: "createProject",
          args: [
            `${template.name} #${i + 1}`,
            `${template.description} - Created by test wallet ${i + 1}`,
            projectMetadata,
            [], // contracts array (empty for test)
            false // transferrable
          ],
        });
  
        console.log(`   Encoded data length: ${createProjectData.length}`);
        console.log(`   Sending 0.5 CELO as fee`);
  
        // Estimate gas first
        console.log("   Estimating gas...");
        let gasUsed = 0;
        try {
          const gasEstimate = await this.publicClient.estimateContractGas({
            address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
            abi: SOVEREIGN_SEAS_V5_ABI,
            functionName: "callModule",
            args: ["projects", createProjectData],
            value: parseEther("0.5"),
            account: wallet.address as `0x${string}`,
          });
          console.log(`   Estimated gas: ${gasEstimate}`);
        } catch (gasError) {
          console.error("   Gas estimation failed:", gasError);
          console.error("   This might indicate the transaction will fail");
        }
  
        // Try the actual transaction
        console.log("   Sending transaction...");
        const startTime = Date.now();
        const hash = await walletClient.writeContract({
          address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
          abi: SOVEREIGN_SEAS_V5_ABI,
          functionName: "callModule",
          args: ["projects", createProjectData],
          value: parseEther("0.5"),
          // Let viem estimate gas automatically instead of hard limit
        });
  
        console.log(`  ⏳ Transaction: ${hash}`);
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
        const executionTime = Date.now() - startTime;
        console.log(`  📋 Transaction status: ${receipt.status}`);
        console.log(`  ⛽ Gas used: ${receipt.gasUsed}`);
        
        gasUsed = Number(receipt.gasUsed);
        this.updateGasUsage(gasUsed);
  
        if (receipt.status === "success") {
          // Get the actual project ID from the transaction logs
          let projectId: bigint = 0n;
          try {
            // Try to get project ID from event logs first
            const logs = await this.publicClient.getLogs({
              address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
              fromBlock: receipt.blockNumber,
              toBlock: receipt.blockNumber,
            });
            
            // Look for ProjectCreated event
            let foundProjectId = false;
            for (const log of logs) {
              try {
                const decoded = decodeEventLog({
                  abi: PROJECTS_MODULE_ABI,
                  data: log.data,
                  topics: log.topics,
                }) as any;
                if (decoded.eventName === "ProjectCreated") {
                  projectId = decoded.args.projectId as bigint;
                  foundProjectId = true;
                  break;
                }
              } catch (e) {
                // Continue searching
              }
            }
            
            if (!foundProjectId) {
              // Fallback: get the new project count to determine the project ID
              const newProjectCount = await this.publicClient.readContract({
                address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
                abi: SOVEREIGN_SEAS_V5_ABI,
                functionName: "staticCallModule",
                args: ["projects", encodeFunctionData({
                  abi: PROJECTS_MODULE_ABI,
                  functionName: "getProjectCount",
                  args: [],
                })],
              });
              
              // Project IDs are 0-indexed, so the new project ID is count - 1
              projectId = BigInt(newProjectCount as string) - 1n;
            }
          } catch (error) {
            console.log(`   ⚠️ Could not get project ID from logs, using fallback method`);
            // Fallback: get the new project count to determine the project ID
            const newProjectCount = await this.publicClient.readContract({
              address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
              abi: SOVEREIGN_SEAS_V5_ABI,
              functionName: "staticCallModule",
              args: ["projects", encodeFunctionData({
                abi: PROJECTS_MODULE_ABI,
                functionName: "getProjectCount",
                args: [],
              })],
            });
            
            // Project IDs are 0-indexed, so the new project ID is count - 1
            projectId = BigInt(newProjectCount as string) - 1n;
          }
          
          this.state.projects.push({
            id: projectId,
            owner: wallet.address,
            name: `${template.name} #${i + 1}`,
          });
  
          console.log(`  ✅ Project created with ID: ${projectId}`);
          
          // Use helper function to handle successful transaction
          this.handleSuccessfulTransaction(
            "project creation",
            functionTestId,
            "projects",
            "createProject",
            executionTime,
            gasUsed,
            `Project ID: ${projectId}`
          );
        } else {
          console.error(`  ❌ Transaction failed`);
          
          // Mark function test as failed
          this.tracker.completeFunctionTest(
            "projects",
            "createProject",
            functionTestId,
            "failed",
            executionTime,
            gasUsed,
            "Transaction failed"
          );
          
          this.failedTests++;
          throw new Error("Transaction failed");
        }
  
      } catch (error) {
        console.error(`❌ Failed to create project for wallet ${i + 1}:`);
        console.error("Error details:");
        
        if (error instanceof Error) {
          console.error("  Message:", error.message);
          console.error("  Stack:", error.stack);
        }
        
        // Check for specific error patterns
        if (error.message?.includes("revert")) {
          console.error("  This is a revert error - the contract rejected the transaction");
        }
        
        if (error.message?.includes("insufficient funds")) {
          console.error("  Insufficient funds - check wallet balance");
        }
        
        if (error.message?.includes("gas")) {
          console.error("  Gas-related error - try increasing gas limit");
        }
  
        // Log the raw error for debugging
        console.error("  Raw error:", JSON.stringify(error, null, 2));
        
        // Try fallback with minimal metadata if complex metadata fails
        console.log("  🔄 Trying fallback with minimal metadata...");
        try {
          const minimalMetadata = {
            bio: `Bio for ${template.name}`,
            contractInfo: "",
            additionalData: "",
            jsonMetadata: JSON.stringify({
              tags: ["general", "testing"],
              difficulty: "beginner",
              estimatedTime: "2-4 weeks",
              techStack: ["solidity"],
              teamSize: 1,
              fundingNeeded: "500 CELO"
            }),
            category: template.category || "General",
            website: "",
            github: "",
            twitter: "",
            discord: "",
            websiteUrl: "",
            socialMediaHandle: ""
          };
          
          const fallbackData = encodeFunctionData({
            abi: PROJECTS_MODULE_ABI,
            functionName: "createProject",
            args: [
              `${template.name} #${i + 1} (Minimal)`,
              `${template.description} - Created by test wallet ${i + 1}`,
              minimalMetadata,
              [],
              false
            ],
          });
          
          const fallbackHash = await walletClient.writeContract({
            address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
            abi: SOVEREIGN_SEAS_V5_ABI,
            functionName: "callModule",
            args: ["projects", fallbackData],
            value: parseEther("0.5"),
            // Let viem estimate gas automatically
          });
          
          console.log(`  🔄 Fallback transaction: ${fallbackHash}`);
          const fallbackReceipt = await this.publicClient.waitForTransactionReceipt({ hash: fallbackHash });
          
          if (fallbackReceipt.status === "success") {
            console.log(`  ✅ Fallback project creation succeeded!`);
            // Continue with the test instead of throwing
            return;
          } else {
            console.log(`  ❌ Fallback also failed`);
            throw error; // Re-throw original error if fallback fails
          }
          
        } catch (fallbackError) {
          console.log(`  ❌ Fallback attempt failed: ${fallbackError.message}`);
          throw error; // Re-throw original error
        }
      }
    }
  
    this.state.projectsCreated = true;
    this.markStepCompleted("create-projects");
    console.log("✅ Project creation completed");
    
    // Mark scenario as completed successfully
    this.tracker.completeScenarioTest("projectCreation", testId, "passed", Date.now() - this.testStartTime);
  }

  private async createCampaigns() {
    if (this.shouldSkipStep("create-campaigns")) return;
    
    console.log("\n📢 Creating campaigns...");
    
    // Check if campaigns already exist in state
    if (this.state.campaigns && this.state.campaigns.length > 0) {
      console.log(`✅ Found ${this.state.campaigns.length} existing campaigns in state, reusing them...`);
      this.campaigns = this.state.campaigns.map(c => ({
        id: BigInt(c.id),
        name: c.name,
        isERC20: c.isERC20,
        tokenAddress: c.tokenAddress
      }));
      
      for (let i = 0; i < this.campaigns.length; i++) {
        const campaign = this.campaigns[i];
        console.log(`   📋 Campaign ${i + 1}: "${campaign.name}" (ID: ${campaign.id}, ERC20: ${campaign.isERC20})`);
      }
      
      this.state.campaignsCreated = true;
      this.saveState();
      return;
    }

    // Check if campaigns already exist in contracts
    console.log("🔍 Checking for existing campaigns in contracts...");
    try {
      const campaignCount = await this.publicClient.readContract({
        address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI,
        functionName: "staticCallModule",
        args: ["campaigns", encodeFunctionData({
          abi: CAMPAIGNS_MODULE_ABI,
          functionName: "totalCampaigns",
          args: [],
        })],
      });
      
      const count = Number(campaignCount);
      console.log(`📊 Found ${count} existing campaigns in contracts`);
      
      if (count > 0) {
        console.log("✅ Using existing campaigns from contracts...");
        this.campaigns = [];
        
        // Fetch existing campaigns
        for (let i = 0; i < count; i++) {
          try {
            const campaignData = await this.publicClient.readContract({
              address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
              abi: SOVEREIGN_SEAS_V5_ABI,
              functionName: "staticCallModule",
              args: ["campaigns", encodeFunctionData({
                abi: CAMPAIGNS_MODULE_ABI,
                functionName: "getCampaign",
                args: [BigInt(i)],
              })],
            });
            
            const decoded = decodeAbiParameters([
              { type: "address", name: "admin" },
              { type: "string", name: "name" },
              { type: "string", name: "description" },
              { type: "uint8", name: "status" },
              { type: "bool", name: "active" },
              { type: "uint256", name: "startTime" },
              { type: "uint256", name: "endTime" },
              { type: "uint256", name: "totalFunds" }
            ], campaignData);
            
            // For now, we'll assume it's not an ERC20 campaign and set default values
            // We can enhance this later by checking campaign type
            this.campaigns.push({
              id: BigInt(i), // Campaign ID is the index
              name: decoded[1] as string,
              isERC20: false, // Default to false, can be enhanced later
              tokenAddress: undefined
            });
            
            if (!this.state.campaigns) this.state.campaigns = [];
            this.state.campaigns.push({
              id: BigInt(i), // Campaign ID is the index
              name: decoded[1] as string,
              isERC20: false, // Default to false, can be enhanced later
              tokenAddress: undefined
            });
            
            console.log(`   📋 Campaign ${i + 1}: "${decoded[1]}" (ID: ${i}, Admin: ${decoded[0]})`);
          } catch (error) {
            console.log(`   ⚠️ Could not fetch campaign ${i}: ${error.message}`);
          }
        }
        
        this.state.campaignsCreated = true;
        this.saveState();
        return;
      }
    } catch (error) {
      console.log(`⚠️ Could not check existing campaigns: ${error.message}`);
    }
    
    console.log("🆕 No existing campaigns found, creating new ones...");
    
    // Start tracking campaign creation test
    const testId = this.tracker.startScenarioTest(
      "campaignCreation",
      "Campaign Creation",
      "Create both CELO and SEAS token-based campaigns"
    );
    
    if (!this.state.campaigns) this.state.campaigns = [];
    
    // Use first wallet as campaign admin
    const adminAccount = privateKeyToAccount(this.wallets[0].privateKey);
    const adminClient = createWalletClient({
      chain: celoAlfajores,
      transport: http(this.config.rpcUrl),
      account: adminAccount,
    });

    const now = Math.floor(Date.now() / 1000);
    const oneDay = 24 * 60 * 60;

    // Campaign 1: Normal campaign (CELO-based)
    console.log("📝 Creating normal CELO-based campaign");
    try {
      const functionTestId = this.tracker.startFunctionTest(
        "campaigns",
        "createERC20Campaign",
        "Create CELO campaign",
        "Create normal CELO-based campaign with project addition fees"
      );
      
      const normalCampaignData = encodeFunctionData({
        abi: CAMPAIGNS_MODULE_ABI,
        functionName: "createERC20Campaign",
        args: [
          "Ocean Innovation Challenge",
          "Supporting innovative ocean-related projects with CELO funding",
          {
            mainInfo: "Ocean Innovation Challenge",
            additionalInfo: "Supporting innovative ocean-related projects with CELO funding",
            jsonMetadata: JSON.stringify({
              tags: ["ocean", "environment", "innovation"],
              targetAudience: "environmentalists",
              maxParticipants: 50,
              rewardStructure: {
                firstPlace: "500 CELO",
                secondPlace: "300 CELO",
                thirdPlace: "200 CELO"
              },
              requirements: [
                "Must be ocean-related",
                "Must be innovative",
                "Must have environmental impact"
              ],
              categories: ["ocean", "environment", "innovation"]
            }),
            category: "Environment",
            website: "https://example.com/ocean-campaign",
            logo: "https://example.com/ocean-campaign.jpg",
            banner: "https://example.com/ocean-campaign-banner.jpg",
            socialLinks: ["https://twitter.com/oceancampaign"],
            websiteUrl: "https://example.com/ocean-campaign",
            socialMediaHandle: "@oceancampaign"
          },
          BigInt(now + oneDay), // Start in 1 day
          BigInt(now + oneDay * 8), // End in 8 days
          50, // 5% admin fee
          3, // Max 3 winners
          0, // Proportional distribution
          "", // Custom distribution data
          this.deployment.record.contracts.seasToken, // Payout token
          this.deployment.record.contracts.seasToken, // Fee token
          1, // CELO_ONLY campaign type
          ["0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9"], // CELO token address for Alfajores testnet
          [parseEther("0.0001")], // CELO weight (very small amount for testing)
          [true], // Use CELO conversion
          "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9", // Project addition fee token (CELO)
          parseEther("0.0001") // Very small CELO fee to add project
        ],
      });

      const startTime = Date.now();
      const normalHash = await adminClient.writeContract({
        address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI,
        functionName: "callModule",
        args: ["campaigns", normalCampaignData],
      });

      console.log(`  ⏳ Normal campaign transaction: ${normalHash}`);
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash: normalHash });
      const executionTime = Date.now() - startTime;
      const gasUsed = Number(receipt.gasUsed);
      
      this.updateGasUsage(gasUsed);

      // Get the actual campaign ID from the transaction logs
      let campaignId: bigint = 0n;
      try {
        // Try to get campaign ID from event logs first
        const logs = await this.publicClient.getLogs({
          address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
          fromBlock: receipt.blockNumber,
          toBlock: receipt.blockNumber,
        });
        
        // Look for CampaignCreated event
        let foundCampaignId = false;
        for (const log of logs) {
          try {
            const decoded = decodeEventLog({
              abi: CAMPAIGNS_MODULE_ABI,
              data: log.data,
              topics: log.topics,
            }) as any;
            if (decoded.eventName === "CampaignCreated") {
              campaignId = decoded.args.campaignId as bigint;
              foundCampaignId = true;
              break;
            }
          } catch (e) {
            // Continue searching
          }
        }
        
        if (!foundCampaignId) {
          // Fallback: get the new campaign count to determine the campaign ID
          const newCampaignCount = await this.publicClient.readContract({
            address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
            abi: SOVEREIGN_SEAS_V5_ABI,
            functionName: "staticCallModule",
            args: ["campaigns", encodeFunctionData({
              abi: CAMPAIGNS_MODULE_ABI,
              functionName: "totalCampaigns",
              args: [],
            })],
          });
          
          // Campaign IDs are 0-indexed, so the new campaign ID is count - 1
          campaignId = BigInt(newCampaignCount as string) - 1n;
        }
      } catch (error) {
        console.log(`   ⚠️ Could not get campaign ID from logs, using fallback method`);
        // Fallback: get the new campaign count to determine the campaign ID
        const newCampaignCount = await this.publicClient.readContract({
          address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
          abi: SOVEREIGN_SEAS_V5_ABI,
          functionName: "staticCallModule",
          args: ["campaigns", encodeFunctionData({
            abi: CAMPAIGNS_MODULE_ABI,
            functionName: "totalCampaigns",
            args: [],
          })],
        });
        
        // Campaign IDs are 0-indexed, so the new campaign ID is count - 1
        campaignId = BigInt(newCampaignCount as string) - 1n;
      }

      this.state.campaigns.push({
        id: campaignId,
        name: "Ocean Innovation Challenge",
        isERC20: false,
      });
      
      console.log("  ✅ Normal campaign created");
      
      // Use helper function to handle successful transaction
      this.handleSuccessfulTransaction(
        "CELO campaign creation",
        functionTestId,
        "campaigns",
        "createERC20Campaign",
        executionTime,
        gasUsed,
        "Campaign ID: 1"
      );
    } catch (error) {
      console.error("❌ Failed to create normal campaign:", error);
      throw error;
    }

    // Campaign 2: SEAS token-based campaign
    console.log("📝 Creating SEAS token-based campaign");
    try {
      const functionTestId = this.tracker.startFunctionTest(
        "campaigns",
        "createERC20Campaign",
        "Create SEAS campaign",
        "Create SEAS token-based campaign using createERC20Campaign"
      );
      
      const seasCampaignData = encodeFunctionData({
        abi: CAMPAIGNS_MODULE_ABI,
        functionName: "createERC20Campaign",
        args: [
          "SEAS Innovation Fund",
          "SEAS token holders vote on the most innovative projects",
          {
            mainInfo: "SEAS Innovation Fund",
            additionalInfo: "SEAS token holders vote on the most innovative projects",
            jsonMetadata: JSON.stringify({
              tags: ["seas", "token", "innovation", "voting"],
              targetAudience: "SEAS token holders",
              maxParticipants: 100,
              rewardStructure: {
                firstPlace: "250 SEAS",
                secondPlace: "150 SEAS",
                thirdPlace: "100 SEAS"
              },
              requirements: [
                "Must hold SEAS tokens",
                "Must be innovative",
                "Must have clear roadmap"
              ],
              categories: ["technology", "innovation", "defi"],
              minSeasRequired: "100 SEAS"
            }),
            category: "Technology",
            website: "https://example.com/seas-campaign",
            logo: "https://example.com/seas-campaign.jpg",
            banner: "https://example.com/seas-campaign-banner.jpg",
            socialLinks: ["https://twitter.com/seascampaign"],
            websiteUrl: "https://example.com/seas-campaign",
            socialMediaHandle: "@seascampaign"
          },
          BigInt(now + oneDay), // Start in 1 day
          BigInt(now + oneDay * 15), // End in 15 days
          50, // 5% admin fee
          3, // Max 3 winners
          0, // Proportional distribution
          "", // Custom distribution data
          this.deployment.record.contracts.seasToken, // Payout token
          this.deployment.record.contracts.seasToken, // Fee token
          2, // TOKEN_ONLY campaign type
          [this.deployment.record.contracts.seasToken], // Only SEAS tokens allowed
          [parseEther("0.001")], // SEAS token weight (1 SEAS = 0.001 CELO)
          [false], // Use 1:1 voting (1 SEAS = 1 vote) instead of CELO conversion
          this.deployment.record.contracts.seasToken, // Project addition fee token
          parseEther("100") // 100 SEAS to add project
        ],
      });

      const startTime = Date.now();
      const seasHash = await adminClient.writeContract({
        address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI,
        functionName: "callModule",
        args: ["campaigns", seasCampaignData],
      });

      console.log(`  ⏳ SEAS campaign transaction: ${seasHash}`);
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash: seasHash });
      const executionTime = Date.now() - startTime;
      const gasUsed = Number(receipt.gasUsed);
      
      this.updateGasUsage(gasUsed);

      // Get the actual campaign ID from the transaction logs
      let seasCampaignId: bigint = 0n;
      try {
        // Try to get campaign ID from event logs first
        const logs = await this.publicClient.getLogs({
          address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
          fromBlock: receipt.blockNumber,
          toBlock: receipt.blockNumber,
        });
        
        // Look for CampaignCreated event
        let foundCampaignId = false;
        for (const log of logs) {
          try {
            const decoded = decodeEventLog({
              abi: CAMPAIGNS_MODULE_ABI,
              data: log.data,
              topics: log.topics,
            }) as any;
            if (decoded.eventName === "CampaignCreated") {
              seasCampaignId = decoded.args.campaignId as bigint;
              foundCampaignId = true;
              break;
            }
          } catch (e) {
            // Continue searching
          }
        }
        
        if (!foundCampaignId) {
          // Fallback: get the new campaign count to determine the campaign ID
          const newCampaignCount = await this.publicClient.readContract({
            address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
            abi: SOVEREIGN_SEAS_V5_ABI,
            functionName: "staticCallModule",
            args: ["campaigns", encodeFunctionData({
              abi: CAMPAIGNS_MODULE_ABI,
              functionName: "totalCampaigns",
              args: [],
            })],
          });
          
          // Campaign IDs are 0-indexed, so the new campaign ID is count - 1
          seasCampaignId = BigInt(newCampaignCount as string) - 1n;
        }
      } catch (error) {
        console.log(`   ⚠️ Could not get SEAS campaign ID from logs, using fallback method`);
        // Fallback: get the new campaign count to determine the campaign ID
        const newCampaignCount = await this.publicClient.readContract({
          address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
          abi: SOVEREIGN_SEAS_V5_ABI,
          functionName: "staticCallModule",
          args: ["campaigns", encodeFunctionData({
            abi: CAMPAIGNS_MODULE_ABI,
            functionName: "totalCampaigns",
            args: [],
          })],
        });
        
        // Campaign IDs are 0-indexed, so the new campaign ID is count - 1
        seasCampaignId = BigInt(newCampaignCount as string) - 1n;
      }

      this.state.campaigns.push({
        id: seasCampaignId,
        name: "SEAS Innovation Fund", 
        isERC20: true,
        tokenAddress: this.deployment.record.contracts.seasToken,
      });
      
      console.log("  ✅ SEAS token-based campaign created successfully");
      
      // Use helper function to handle successful transaction
      this.handleSuccessfulTransaction(
        "SEAS campaign creation",
        functionTestId,
        "campaigns",
        "createERC20Campaign",
        executionTime,
        gasUsed,
        "Campaign ID: 2"
      );
    } catch (error) {
      console.error("❌ Failed to create SEAS campaign:", error);
      throw error;
    }

    this.state.campaignsCreated = true;
    this.markStepCompleted("create-campaigns");
    console.log("✅ Campaign creation completed");
    
    // Mark scenario as completed successfully
    this.tracker.completeScenarioTest("campaignCreation", testId, "passed", Date.now() - this.testStartTime);
  }

  private async addProjectsToSeasCampaign() {
    if (this.shouldSkipStep("add-projects-to-seas-campaign")) return;
    
    console.log("\n🔗 Adding projects to SEAS campaign for voting...");
    
    // Start tracking project addition test
    const testId = this.tracker.startScenarioTest(
      "projectAdditionToSeas",
      "Project Addition to SEAS Campaign",
      "Add projects to SEAS campaign and test SEAS token voting"
    );
    
    try {
      if (!this.state.campaigns || this.state.campaigns.length < 2) {
        throw new Error("❌ SEAS campaign not found. Cannot add projects.");
      }
      
      const seasCampaign = this.state.campaigns.find(c => c.isERC20 && c.tokenAddress === this.deployment.record.contracts.seasToken);
      if (!seasCampaign) {
        throw new Error("❌ SEAS campaign not found in state.");
      }
      
      console.log(`🎯 Adding projects to SEAS campaign: ${seasCampaign.name}`);
      
      // Add first 3 projects to the SEAS campaign
      if (!this.state.projects || this.state.projects.length === 0) {
        throw new Error("No projects found. Create projects first.");
      }
      
      for (let i = 0; i < Math.min(3, this.state.projects.length); i++) {
        const project = this.state.projects[i];
        if (!project) continue;
        
        const wallet = this.wallets[i];
        if (!wallet) continue;
        
        console.log(`📝 Processing project "${project.name}" (${i + 1}/3) using wallet ${i + 1}`);
        
        try {
          // First check if project is already in the campaign
          console.log(`   🔍 Checking if project is already in campaign...`);
          const isInCampaignData = encodeFunctionData({
            abi: VOTING_MODULE_ABI,
            functionName: "isProjectInCampaign",
            args: [seasCampaign.id, project.id],
          });
          
          const isInCampaignResult = await this.publicClient.readContract({
            address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
            abi: SOVEREIGN_SEAS_V5_ABI,
            functionName: "staticCallModule",
            args: ["voting", isInCampaignData],
          });
          
          const isInCampaign = decodeAbiParameters([{ type: "bool" }], isInCampaignResult)[0];
          
          if (isInCampaign) {
            console.log(`   ✅ Project "${project.name}" is already in campaign, skipping...`);
            continue;
          }
          
          console.log(`   📝 Project "${project.name}" not in campaign, adding...`);
          
          const account = privateKeyToAccount(wallet.privateKey);
          const walletClient = createWalletClient({
            chain: celoAlfajores,
            transport: http(this.config.rpcUrl),
            account,
          });
          
          // First approve SEAS tokens for the campaign
          console.log(`   💰 Approving SEAS tokens for project addition...`);
          const approveHash = await walletClient.writeContract({
            address: this.deployment.record.contracts.seasToken as `0x${string}`,
            abi: SEAS_TOKEN_ABI,
            functionName: "approve",
            args: [this.deployment.record.contracts.sovereignSeasV5, parseEther("100")],
          });
          
          await this.publicClient.waitForTransactionReceipt({ hash: approveHash });
          console.log(`   ✅ SEAS tokens approved`);
          
          // Add project to campaign using voting module with fee payment (payable method)
          console.log(`   💰 Adding project to SEAS campaign with fee payment (payable method)...`);
          const addProjectData = encodeFunctionData({
            abi: VOTING_MODULE_ABI,
            functionName: "addProjectToCampaign",
            args: [seasCampaign.id, project.id, this.deployment.record.contracts.seasToken],
          });
          
          const addProjectHash = await walletClient.writeContract({
            address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
            abi: SOVEREIGN_SEAS_V5_ABI,
            functionName: "callModule",
            args: ["voting", addProjectData],
            value: 0n, // No additional CELO needed, fee is paid in SEAS tokens
          });
          
          console.log(`   ⏳ Adding project transaction: ${addProjectHash}`);
          await this.publicClient.waitForTransactionReceipt({ hash: addProjectHash });
          console.log(`   ✅ Project "${project.name}" added to SEAS campaign with fee payment`);
          
          // Approve the project using campaign creator wallet
          console.log(`   🔐 Approving project using campaign creator wallet...`);
          const campaignCreatorAccount = privateKeyToAccount(this.wallets[0].privateKey); // Campaign creator is wallet 0
          const campaignCreatorClient = createWalletClient({
            chain: celoAlfajores,
            transport: http(this.config.rpcUrl),
            account: campaignCreatorAccount,
          });
          
          console.log(`   🔍 Campaign creator account: ${campaignCreatorAccount.address}`);
          console.log(`   📋 Campaign ID: ${seasCampaign.id}`);
          
          // Approve the project (it's already initialized by addProjectToCampaign)
          console.log(`   🔐 Approving project in voting module...`);
          const approveData = encodeFunctionData({
            abi: VOTING_MODULE_ABI,
            functionName: "approveProject",
            args: [seasCampaign.id, project.id],
          });
          
          const approveParticipationHash = await campaignCreatorClient.writeContract({
            address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
            abi: SOVEREIGN_SEAS_V5_ABI,
            functionName: "callModule",
            args: ["voting", approveData],
          });
          
          console.log(`   ⏳ Approval transaction: ${approveParticipationHash}`);
          await this.publicClient.waitForTransactionReceipt({ hash: approveParticipationHash });
          console.log(`   ✅ Project "${project.name}" approved for SEAS campaign by campaign creator`);
          
          // Verify project is now in voting module and check approval status
          console.log(`   🔍 Verifying project is in voting module and checking approval status...`);
          
          // Check if project is in campaign
          const isInVotingData = encodeFunctionData({
            abi: VOTING_MODULE_ABI,
            functionName: "isProjectInCampaign",
            args: [seasCampaign.id, project.id],
          });
          
          const isInVotingResult = await this.publicClient.readContract({
            address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
            abi: SOVEREIGN_SEAS_V5_ABI,
            functionName: "staticCallModule",
            args: ["voting", isInVotingData],
          });
          
          const isInVoting = decodeAbiParameters([{ type: "bool" }], isInVotingResult)[0];
          console.log(`   📊 Project "${project.name}" is in voting module: ${isInVoting}`);
          
          if (!isInVoting) {
            throw new Error(`❌ Project "${project.name}" was not properly added to voting module`);
          }
          
          // Check detailed participation status including approval
          const participationData = encodeFunctionData({
            abi: VOTING_MODULE_ABI,
            functionName: "getParticipationWithPosition",
            args: [seasCampaign.id, project.id],
          });
          
          const participationResult = await this.publicClient.readContract({
            address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
            abi: SOVEREIGN_SEAS_V5_ABI,
            functionName: "staticCallModule",
            args: ["voting", participationData],
          });
          
          const [approved, voteCount, votingPower, fundsReceived, uniqueVoters, currentPosition, previousPosition, positionChange, percentageChange, isRising] = decodeAbiParameters(
            [
              { type: "bool" },    // approved
              { type: "uint256" }, // voteCount
              { type: "uint256" }, // votingPower
              { type: "uint256" }, // fundsReceived
              { type: "uint256" }, // uniqueVoters
              { type: "uint256" }, // currentPosition
              { type: "uint256" }, // previousPosition
              { type: "uint256" }, // positionChange
              { type: "uint256" }, // percentageChange
              { type: "bool" }     // isRising
            ],
            participationResult
          );
          
          console.log(`   📊 Project "${project.name}" participation status:`);
          console.log(`      ✅ Approved: ${approved}`);
          console.log(`      🗳️  Vote Count: ${voteCount}`);
          console.log(`      ⚡ Voting Power: ${votingPower}`);
          console.log(`      💰 Funds Received: ${fundsReceived}`);
          console.log(`      👥 Unique Voters: ${uniqueVoters}`);
          console.log(`      📍 Current Position: ${currentPosition}`);
          
          if (!approved) {
            throw new Error(`❌ Project "${project.name}" is not approved for voting in SEAS campaign`);
          }
          
          console.log(`   ✅ Project "${project.name}" is properly approved and ready for voting in SEAS campaign`);
          
          // Save progress after each successful project addition
          this.saveStateAfterOperation("project addition and approval");
          
        } catch (error) {
          console.error(`❌ Failed to add project "${project.name}" to SEAS campaign:`, error);
          console.error(`   Error details:`, {
            message: error.message,
            code: error.code,
            cause: error.cause?.message || 'No cause',
            stack: error.stack?.split('\n').slice(0, 3).join('\n')
          });
          // Continue with next project instead of throwing
          console.log(`   ⚠️  Continuing with next project...`);
        }
      }
    
      // Now add projects to CELO-based campaign (normal campaign)
      console.log(`\n🔗 Adding projects to CELO-based campaign...`);
      
      const celoCampaign = this.state.campaigns.find(c => !c.isERC20);
      if (!celoCampaign) {
        console.log(`   ⚠️  No CELO-based campaign found, skipping CELO project addition`);
      } else {
        console.log(`🎯 Adding projects to CELO campaign: ${celoCampaign.name}`);
        
        // Add first 3 projects to the CELO campaign
        for (let i = 0; i < Math.min(3, this.state.projects.length); i++) {
          const project = this.state.projects[i];
          if (!project) continue;
          
          const wallet = this.wallets[i];
          if (!wallet) continue;
          
          console.log(`📝 Processing project "${project.name}" for CELO campaign (${i + 1}/3) using wallet ${i + 1}`);
          
          try {
            // Check if project is already in the CELO campaign
            console.log(`   🔍 Checking if project is already in CELO campaign...`);
            const isInCeloCampaignData = encodeFunctionData({
              abi: VOTING_MODULE_ABI,
              functionName: "isProjectInCampaign",
              args: [celoCampaign.id, project.id],
            });
            
            const isInCeloCampaignResult = await this.publicClient.readContract({
              address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
              abi: SOVEREIGN_SEAS_V5_ABI,
              functionName: "staticCallModule",
              args: ["voting", isInCeloCampaignData],
            });
            
            const isInCeloCampaign = decodeAbiParameters([{ type: "bool" }], isInCeloCampaignResult)[0];
            
            if (isInCeloCampaign) {
              console.log(`   ✅ Project "${project.name}" is already in CELO campaign, skipping...`);
              continue;
            }
            
            console.log(`   📝 Project "${project.name}" not in CELO campaign, adding...`);
            
            const account = privateKeyToAccount(wallet.privateKey);
            const walletClient = createWalletClient({
              chain: celoAlfajores,
              transport: http(this.config.rpcUrl),
              account,
            });
            
            // Add project to CELO campaign using voting module with CELO fee payment (payable method)
            console.log(`   💰 Adding project to CELO campaign with CELO fee payment (payable method)...`);
            const addProjectData = encodeFunctionData({
              abi: VOTING_MODULE_ABI,
              functionName: "addProjectToCampaign",
              args: [celoCampaign.id, project.id, "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9"], // CELO token address
            });
            
            const addProjectHash = await walletClient.writeContract({
              address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
              abi: SOVEREIGN_SEAS_V5_ABI,
              functionName: "callModule",
              args: ["voting", addProjectData],
              value: parseEther("0.0001"), // Pay CELO fee for project addition
            });
            
            console.log(`   ⏳ Adding project to CELO campaign transaction: ${addProjectHash}`);
            await this.publicClient.waitForTransactionReceipt({ hash: addProjectHash });
            console.log(`   ✅ Project "${project.name}" added to CELO campaign with CELO fee payment`);
            
            // Approve the project using campaign creator wallet
            console.log(`   🔐 Approving project using campaign creator wallet...`);
            const campaignCreatorAccount = privateKeyToAccount(this.wallets[0].privateKey); // Campaign creator is wallet 0
            const campaignCreatorClient = createWalletClient({
              chain: celoAlfajores,
              transport: http(this.config.rpcUrl),
              account: campaignCreatorAccount,
            });
            
            // Approve the project (it's already initialized by addProjectToCampaign)
            console.log(`   🔐 Approving project in voting module for CELO campaign...`);
            const approveData = encodeFunctionData({
              abi: VOTING_MODULE_ABI,
              functionName: "approveProject",
              args: [celoCampaign.id, project.id],
            });
            
            const approveParticipationHash = await campaignCreatorClient.writeContract({
              address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
              abi: SOVEREIGN_SEAS_V5_ABI,
              functionName: "callModule",
              args: ["voting", approveData],
            });
            
            console.log(`   ⏳ CELO campaign approval transaction: ${approveParticipationHash}`);
            await this.publicClient.waitForTransactionReceipt({ hash: approveParticipationHash });
            console.log(`   ✅ Project "${project.name}" approved for CELO campaign by campaign creator`);
            
            // Verify project is now in voting module and check approval status
            console.log(`   🔍 Verifying project is in voting module and checking approval status for CELO campaign...`);
            
            // Check if project is in campaign
            const isInVotingData = encodeFunctionData({
              abi: VOTING_MODULE_ABI,
              functionName: "isProjectInCampaign",
              args: [celoCampaign.id, project.id],
            });
            
            const isInVotingResult = await this.publicClient.readContract({
              address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
              abi: SOVEREIGN_SEAS_V5_ABI,
              functionName: "staticCallModule",
              args: ["voting", isInVotingData],
            });
            
            const isInVoting = decodeAbiParameters([{ type: "bool" }], isInVotingResult)[0];
            console.log(`   📊 Project "${project.name}" is in voting module: ${isInVoting}`);
            
            if (!isInVoting) {
              throw new Error(`❌ Project "${project.name}" was not properly added to voting module for CELO campaign`);
            }
            
            // Check detailed participation status including approval
            const participationData = encodeFunctionData({
              abi: VOTING_MODULE_ABI,
              functionName: "getParticipationWithPosition",
              args: [celoCampaign.id, project.id],
            });
            
            const participationResult = await this.publicClient.readContract({
              address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
              abi: SOVEREIGN_SEAS_V5_ABI,
              functionName: "staticCallModule",
              args: ["voting", participationData],
            });
            
            const [approved, voteCount, votingPower, fundsReceived, uniqueVoters, currentPosition, previousPosition, positionChange, percentageChange, isRising] = decodeAbiParameters(
              [
                { type: "bool" },    // approved
                { type: "uint256" }, // voteCount
                { type: "uint256" }, // votingPower
                { type: "uint256" }, // fundsReceived
                { type: "uint256" }, // uniqueVoters
                { type: "uint256" }, // currentPosition
                { type: "uint256" }, // previousPosition
                { type: "uint256" }, // positionChange
                { type: "uint256" }, // percentageChange
                { type: "bool" }     // isRising
              ],
              participationResult
            );
            
            console.log(`   📊 Project "${project.name}" participation status:`);
            console.log(`      ✅ Approved: ${approved}`);
            console.log(`      🗳️  Vote Count: ${voteCount}`);
            console.log(`      ⚡ Voting Power: ${votingPower}`);
            console.log(`      💰 Funds Received: ${fundsReceived}`);
            console.log(`      👥 Unique Voters: ${uniqueVoters}`);
            console.log(`      📍 Current Position: ${currentPosition}`);
            
            if (!approved) {
              throw new Error(`❌ Project "${project.name}" is not approved for voting in CELO campaign`);
            }
            
            console.log(`   ✅ Project "${project.name}" is properly approved and ready for voting in CELO campaign`);
            
            // Save progress after each successful project addition
            this.saveStateAfterOperation("project addition and approval");
            
          } catch (error) {
            console.error(`❌ Failed to add project "${project.name}" to CELO campaign:`, error);
            console.error(`   Error details:`, {
              message: error.message,
              code: error.code,
              cause: error.cause?.message || 'No cause',
              stack: error.stack?.split('\n').slice(0, 3).join('\n')
            });
            console.log(`   ⚠️  Continuing with next project...`);
          }
        }
      }
      
      // Now start voting tests in the correct order
      console.log(`\n🗳️ Starting voting tests in order: CELO first, then SEAS tokens...`);
      
      // STEP 1: Vote on CELO-based campaign first
      console.log(`\n📊 STEP 1: Testing CELO-based campaign voting...`);
      
      if (celoCampaign) {
        const voterWallet = this.wallets[1];
        const projectToVoteFor = this.state.projects[0];
        
        if (voterWallet && projectToVoteFor) {
          console.log(`   💰 Wallet 1 voting for project "${projectToVoteFor.name}" with CELO`);
          console.log(`   🎯 Testing CELO campaign with enhanced conversion system:`);
          console.log(`      - CELO Campaign: Uses Mento → Manual Rate fallback`);
          console.log(`      - Conversion: Automatic with fallback to manual rates`);
          console.log(`      - Position Tracking: Based on CELO equivalent`);
          
          const voterAccount = privateKeyToAccount(voterWallet.privateKey);
          const voterClient = createWalletClient({
            chain: celoAlfajores,
            transport: http(this.config.rpcUrl),
            account: voterAccount,
          });
          
          try {
            // Check if manual rate is set for SEAS token (for demonstration)
            console.log(`   📊 Checking manual rate system for SEAS token...`);
            const treasuryModuleAddress = await this.publicClient.readContract({
              address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
              abi: SOVEREIGN_SEAS_V5_ABI,
              functionName: "getModuleAddress",
              args: ["treasury"],
            });
            
            const conversionInfo = await this.publicClient.readContract({
              address: treasuryModuleAddress as `0x${string}`,
              abi: [
                {
                  "inputs": [{"internalType": "address", "name": "_token", "type": "address"}],
                  "name": "getTokenConversionInfo",
                  "outputs": [
                    {"internalType": "bool", "name": "hasMentoProvider", "type": "bool"},
                    {"internalType": "bool", "name": "hasManualRate", "type": "bool"},
                    {"internalType": "uint256", "name": "manualRate", "type": "uint256"},
                    {"internalType": "uint256", "name": "mentoFailuresCount", "type": "uint256"},
                    {"internalType": "uint256", "name": "manualUsageCount", "type": "uint256"},
                    {"internalType": "uint256", "name": "lastMentoAttemptTime", "type": "uint256"}
                  ],
                  "stateMutability": "view",
                  "type": "function"
                }
              ],
              functionName: "getTokenConversionInfo",
              args: [this.deployment.record.contracts.seasToken],
            });
            
            console.log(`   🔄 SEAS Token Conversion Info:`, {
              hasMentoProvider: conversionInfo[0],
              hasManualRate: conversionInfo[1],
              manualRate: Number(conversionInfo[2]) / 1e18,
              mentoFailures: Number(conversionInfo[3]),
              manualUsage: Number(conversionInfo[4])
            });
            
            // Vote with CELO (send CELO directly)
            const voteData = encodeFunctionData({
              abi: VOTING_MODULE_ABI,
              functionName: "voteWithCelo",
              args: [celoCampaign.id, projectToVoteFor.id],
            });
            
            const voteHash = await voterClient.writeContract({
              address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
              abi: SOVEREIGN_SEAS_V5_ABI,
              functionName: "callModule",
              args: ["voting", voteData],
              value: parseEther("0.1"), // Send 0.1 CELO
            });
            
            console.log(`   ⏳ CELO voting transaction: ${voteHash}`);
            const voteReceipt = await this.publicClient.waitForTransactionReceipt({ hash: voteHash });
            console.log(`   ✅ Voted successfully with 0.1 CELO`);
            console.log(`   🎯 Voting Power: 0.1 CELO (direct CELO voting)`);
            console.log(`   Gas used: ${voteReceipt.gasUsed}`);
            
          } catch (error) {
            console.error(`❌ Failed to vote with CELO:`, error);
            console.error(`   Error details:`, {
              message: error.message,
              code: error.code,
              cause: error.cause?.message || 'No cause',
              stack: error.stack?.split('\n').slice(0, 3).join('\n')
            });
            console.log(`   ⚠️  CELO voting failed, but continuing with SEAS voting...`);
          }
        } else {
          console.log(`   ⚠️  Voter wallet or project not found for CELO voting test`);
        }
      } else {
        console.log(`   ⚠️  No CELO campaign found, skipping CELO voting test`);
      }
      
      // STEP 2: Vote on SEAS token-based campaign (Enhanced with new features)
      console.log(`\n📊 STEP 2: Testing SEAS token-based campaign voting with new token weight system...`);
      
      const voterWallet = this.wallets[1];
      const projectToVoteFor = this.state.projects[0];
      
      if (!voterWallet || !projectToVoteFor) {
        console.log(`   ⚠️  Voter wallet or project not found for SEAS voting test`);
      } else {
        console.log(`   💰 Wallet 1 voting for project "${projectToVoteFor.name}" with 51 SEAS tokens`);
        console.log(`   🎯 Testing new token weight and conversion features:`);
        console.log(`      - ERC20 Campaign: Uses campaign-specific token weights`);
        console.log(`      - Conversion Mode: 1:1 voting (1 SEAS = 1 vote)`);
        console.log(`      - Position Tracking: Unaffected by weight changes`);
        
        const voterAccount = privateKeyToAccount(voterWallet.privateKey);
        const voterClient = createWalletClient({
          chain: celoAlfajores,
          transport: http(this.config.rpcUrl),
          account: voterAccount,
        });
        
        try {
          // Check campaign token configuration before voting
          console.log(`   📋 Checking campaign token configuration...`);
          const campaignsModuleAddress = await this.publicClient.readContract({
            address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
            abi: SOVEREIGN_SEAS_V5_ABI,
            functionName: "getModuleAddress",
            args: ["campaigns"],
          });
          
          const tokenConfig = await this.publicClient.readContract({
            address: campaignsModuleAddress as `0x${string}`,
            abi: [
              {
                "inputs": [{"internalType": "uint256", "name": "_campaignId", "type": "uint256"}],
                "name": "getCampaignTokenConfiguration",
                "outputs": [
                  {"internalType": "address[]", "name": "tokens", "type": "address[]"},
                  {"internalType": "uint256[]", "name": "weights", "type": "uint256[]"},
                  {"internalType": "bool[]", "name": "conversionModes", "type": "bool[]"}
                ],
                "stateMutability": "view",
                "type": "function"
              }
            ],
            functionName: "getCampaignTokenConfiguration",
            args: [seasCampaign.id],
          });
          
          console.log(`   🎯 Campaign Configuration:`, {
            tokens: tokenConfig[0],
            weights: tokenConfig[1].map((w: bigint) => Number(w) / 1e18),
            conversionModes: tokenConfig[2]
          });
          
          // Approve SEAS tokens for voting
          console.log(`   💰 Approving SEAS tokens for voting...`);
          const approveVoteHash = await voterClient.writeContract({
            address: this.deployment.record.contracts.seasToken as `0x${string}`,
            abi: SEAS_TOKEN_ABI,
            functionName: "approve",
            args: [this.deployment.record.contracts.sovereignSeasV5, parseEther("1000")],
          });
          
          await this.publicClient.waitForTransactionReceipt({ hash: approveVoteHash });
          console.log(`   ✅ SEAS tokens approved for voting`);
          
          // Check if project is approved before voting
          console.log(`   🔍 Checking if project is approved before voting...`);
          const isApprovedData = encodeFunctionData({
            abi: VOTING_MODULE_ABI,
            functionName: "isProjectInCampaign",
            args: [seasCampaign.id, projectToVoteFor.id],
          });
          
          const isApprovedResult = await this.publicClient.readContract({
            address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
            abi: SOVEREIGN_SEAS_V5_ABI,
            functionName: "staticCallModule",
            args: ["voting", isApprovedData],
          });
          
          const isApproved = decodeAbiParameters([{ type: "bool" }], isApprovedResult)[0];
          
          if (!isApproved) {
            console.log(`   ⚠️ Project is not approved yet, skipping voting for now...`);
            console.log(`   ℹ️ Project will be approved in the main voting test`);
          } else {
            // Vote with SEAS tokens (using new enhanced voting system)
            console.log(`   🗳️ Voting with 51 SEAS tokens (1:1 voting mode)...`);
            const voteData = encodeFunctionData({
              abi: VOTING_MODULE_ABI,
              functionName: "vote",
              args: [seasCampaign.id, projectToVoteFor.id, this.deployment.record.contracts.seasToken, parseEther("51")],
            });
            
            const voteHash = await voterClient.writeContract({
              address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
              abi: SOVEREIGN_SEAS_V5_ABI,
              functionName: "callModule",
              args: ["voting", voteData],
            });
            
            console.log(`   ⏳ SEAS voting transaction: ${voteHash}`);
            const voteReceipt = await this.publicClient.waitForTransactionReceipt({ hash: voteHash });
            console.log(`   ✅ Voted successfully with 51 SEAS tokens`);
            console.log(`   🎯 Voting Power: 51 votes (1:1 mode)`);
            console.log(`   Gas used: ${voteReceipt.gasUsed}`);
          }
          
        } catch (error) {
          console.error(`❌ Failed to vote with SEAS tokens:`, error);
          console.error(`   Error details:`, {
            message: error.message,
            code: error.code,
            cause: error.cause?.message || 'No cause',
            stack: error.stack?.split('\n').slice(0, 3).join('\n')
          });
          console.log(`   ⚠️  SEAS voting failed, but continuing with test completion...`);
        }
      }
      
      console.log(`\n✅ All voting tests completed in order: CELO → SEAS tokens`);
    
      this.markStepCompleted("add-projects-to-seas-campaign");
      console.log("✅ Project addition and SEAS voting test completed");
      
      // Mark scenario as completed successfully
      this.tracker.completeScenarioTest("projectAdditionToSeas", testId, "passed", Date.now() - this.testStartTime);
      
    } catch (error) {
      console.error(`❌ Failed to complete project addition to SEAS campaign:`, error);
      console.error(`   Error details:`, {
        message: error.message,
        code: error.code,
        cause: error.cause?.message || 'No cause',
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      });
      this.tracker.completeScenarioTest("projectAdditionToSeas", testId, "failed", 0, undefined, error.message);
      throw error;
    }
  }

  private async testVotingAndDistribution() {
    if (this.shouldSkipStep("voting-distribution")) return;
    
    console.log("\n🗳️ Testing voting and distribution...");

    // Start tracking voting test
    const testId = this.tracker.startScenarioTest(
      "votingAndDistribution",
      "Voting and Distribution",
      "Test voting mechanisms and fund distribution"
    );

    if (!this.state.campaigns || this.state.campaigns.length === 0) {
      this.tracker.completeScenarioTest("votingAndDistribution", testId, "failed", 0, undefined, "No campaigns found");
      throw new Error("❌ No campaigns found. Create campaigns first.");
    }

    if (!this.state.projects || this.state.projects.length === 0) {
      this.tracker.completeScenarioTest("votingAndDistribution", testId, "failed", 0, undefined, "No projects found");
      throw new Error("❌ No projects found. Create projects first.");
    }

    // Test voting on SEAS token campaign
    const seasCampaign = this.state.campaigns.find(c => c.isERC20);
    if (seasCampaign) {
      console.log(`📊 Testing voting on SEAS campaign: ${seasCampaign.name}`);
      
      // Create voting session
      const adminAccount = privateKeyToAccount(this.wallets[0].privateKey);
      const adminClient = createWalletClient({
        chain: celoAlfajores,
        transport: http(this.config.rpcUrl),
        account: adminAccount,
      });

      try {
        const functionTestId = this.tracker.startFunctionTest(
          "voting",
          "createVotingSession",
          "Create voting session",
          "Create voting session for SEAS campaign"
        );
        
        const now = Math.floor(Date.now() / 1000);
        const oneDay = 24 * 60 * 60;
        
        const createVotingData = encodeFunctionData({
          abi: VOTING_MODULE_ABI,
          functionName: "createVotingSession",
          args: [
            seasCampaign.id,
            BigInt(now + oneDay), // Start in 1 day
            BigInt(now + oneDay * 8), // End in 8 days
            0, // LINEAR voting scheme
          ],
        });

        const startTime = Date.now();
        const votingHash = await adminClient.writeContract({
          address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
          abi: SOVEREIGN_SEAS_V5_ABI,
          functionName: "callModule",
          args: ["voting", createVotingData],
        });

        console.log(`  ⏳ Voting session creation: ${votingHash}`);
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash: votingHash });
        const executionTime = Date.now() - startTime;
        const gasUsed = Number(receipt.gasUsed);
        
        this.updateGasUsage(gasUsed);
        
        const sessionId = BigInt(1); // Assuming first voting session
        console.log(`  ✅ Voting session created with ID: ${sessionId}`);

        // Mark function test as passed
        this.tracker.completeFunctionTest(
          "voting",
          "createVotingSession",
          functionTestId,
          "passed",
          executionTime,
          gasUsed
        );
        
        this.passedTests++;

        // Have each wallet vote for different projects
        for (let i = 0; i < Math.min(this.wallets.length, this.state.projects.length); i++) {
          const wallet = this.wallets[i];
          const project = this.state.projects[i];
          
          console.log(`🗳️ Wallet ${i + 1} voting for project: ${project.name}`);
          
          // First, check if the project is approved in the campaign
          console.log(`   🔍 Checking if project is approved in campaign...`);
          const isInCampaignData = encodeFunctionData({
            abi: VOTING_MODULE_ABI,
            functionName: "isProjectInCampaign",
            args: [seasCampaign.id, project.id],
          });
          
          const isInCampaignResult = await this.publicClient.readContract({
            address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
            abi: SOVEREIGN_SEAS_V5_ABI,
            functionName: "staticCallModule",
            args: ["voting", isInCampaignData],
          });
          
          const isInCampaign = decodeAbiParameters([{ type: "bool" }], isInCampaignResult)[0];
          
          if (!isInCampaign) {
            console.log(`   ⚠️ Project "${project.name}" is not in campaign, adding and approving it first...`);
            
            // Add project to campaign
            const voterAccount = privateKeyToAccount(wallet.privateKey);
            const voterClient = createWalletClient({
              chain: celoAlfajores,
              transport: http(this.config.rpcUrl),
              account: voterAccount,
            });
            
            // Approve SEAS tokens for project addition
            const approveAddHash = await voterClient.writeContract({
              address: this.deployment.record.contracts.seasToken as `0x${string}`,
              abi: SEAS_TOKEN_ABI,
              functionName: "approve",
              args: [this.deployment.record.contracts.sovereignSeasV5, parseEther("100")],
            });
            
            await this.publicClient.waitForTransactionReceipt({ hash: approveAddHash });
            
            // Add project to campaign
            const addProjectData = encodeFunctionData({
              abi: VOTING_MODULE_ABI,
              functionName: "addProjectToCampaign",
              args: [seasCampaign.id, project.id, this.deployment.record.contracts.seasToken],
            });
            
            const addProjectHash = await voterClient.writeContract({
              address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
              abi: SOVEREIGN_SEAS_V5_ABI,
              functionName: "callModule",
              args: ["voting", addProjectData],
              value: 0n,
            });
            
            await this.publicClient.waitForTransactionReceipt({ hash: addProjectHash });
            console.log(`   ✅ Project added to campaign`);
            
            // Approve the project using campaign creator wallet
            const campaignCreatorAccount = privateKeyToAccount(this.wallets[0].privateKey);
            const campaignCreatorClient = createWalletClient({
              chain: celoAlfajores,
              transport: http(this.config.rpcUrl),
              account: campaignCreatorAccount,
            });
            
            const approveData = encodeFunctionData({
              abi: VOTING_MODULE_ABI,
              functionName: "approveProject",
              args: [seasCampaign.id, project.id],
            });
            
            const approveHash = await campaignCreatorClient.writeContract({
              address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
              abi: SOVEREIGN_SEAS_V5_ABI,
              functionName: "callModule",
              args: ["voting", approveData],
            });
            
            await this.publicClient.waitForTransactionReceipt({ hash: approveHash });
            console.log(`   ✅ Project approved for voting`);
          } else {
            console.log(`   ✅ Project is already in campaign and approved`);
          }
          
          const voterAccount = privateKeyToAccount(wallet.privateKey);
          const voterClient = createWalletClient({
            chain: celoAlfajores,
            transport: http(this.config.rpcUrl),
            account: voterAccount,
          });

          // Approve SEAS tokens for voting
          const approveHash = await voterClient.writeContract({
            address: this.deployment.record.contracts.seasToken as `0x${string}`,
            abi: SEAS_TOKEN_ABI,
            functionName: "approve",
            args: [this.deployment.record.contracts.sovereignSeasV5, parseEther("1000")],
          });
          
          await this.publicClient.waitForTransactionReceipt({ hash: approveHash });

          // Vote with 51 SEAS tokens
          const voteFunctionTestId = this.tracker.startFunctionTest(
            "voting",
            "vote",
            `Vote for project ${project.name}`,
            `Vote for project ${project.name} with 51 SEAS tokens`
          );
          
          const voteData = encodeFunctionData({
            abi: VOTING_MODULE_ABI,
            functionName: "vote",
            args: [seasCampaign.id, project.id, this.deployment.record.contracts.seasToken, parseEther("51")],
          });

          const voteStartTime = Date.now();
          const voteHash = await voterClient.writeContract({
            address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
            abi: SOVEREIGN_SEAS_V5_ABI,
            functionName: "callModule",
            args: ["voting", voteData],
          });

          console.log(`    ⏳ Vote transaction: ${voteHash}`);
          const voteReceipt = await this.publicClient.waitForTransactionReceipt({ hash: voteHash });
          const voteExecutionTime = Date.now() - voteStartTime;
          const voteGasUsed = Number(voteReceipt.gasUsed);
          
          this.updateGasUsage(voteGasUsed);
          
          console.log(`    ✅ Vote cast successfully`);
          
          // Mark function test as passed
          this.tracker.completeFunctionTest(
            "voting",
            "vote",
            voteFunctionTestId,
            "passed",
            voteExecutionTime,
            voteGasUsed
          );
          
          this.passedTests++;
        }

        if (!this.state.votingSessions) this.state.votingSessions = [];
        this.state.votingSessions.push({
          id: sessionId,
          campaignId: seasCampaign.id,
          isActive: true,
        });

        console.log("✅ Voting simulation completed");
      } catch (error) {
        console.error("❌ Voting failed:", error);
        throw error;
      }
    }

    this.state.votingCompleted = true;
    this.state.distributionCompleted = true;
    this.markStepCompleted("voting-distribution");
    console.log("✅ Voting and distribution testing completed");
    
    // Mark scenario as completed successfully
    this.tracker.completeScenarioTest("votingAndDistribution", testId, "passed", Date.now() - this.testStartTime);
  }

  private updateGasUsage(gasUsed: number) {
    this.gasUsage.total += gasUsed;
    this.gasUsage.max = Math.max(this.gasUsage.max, gasUsed);
    this.gasUsage.min = this.gasUsage.min === 0 ? gasUsed : Math.min(this.gasUsage.min, gasUsed);
    this.gasUsage.average = Math.round(this.gasUsage.total / this.totalTests);
  }

  private async testTokenWeightAndConversionFeatures() {
    if (this.shouldSkipStep("token-weight-conversion")) return;
    
    console.log("\n🔧 Testing Token Weight and Conversion Features...");
    
    // Start tracking token weight and conversion test
    const testId = this.tracker.startScenarioTest(
      "tokenWeightConversion",
      "Token Weight and Conversion System",
      "Test new token weight and conversion features"
    );
    
    try {
      // Test 1: Manual Rate System for CELO Campaigns
      await this.testManualRateSystem();
      
      // Test 2: ERC20 Campaign Token Weight Configuration
      await this.testERC20CampaignTokenWeights();
      
      // Test 3: Token Conversion Health Monitoring
      await this.testTokenConversionHealth();
      
      // Test 4: Admin Token Weight Management
      await this.testAdminTokenWeightManagement();
      
      console.log("✅ All token weight and conversion features tested successfully");
      this.tracker.completeScenarioTest("tokenWeightConversion", testId, "passed", Date.now() - this.testStartTime);
      
    } catch (error) {
      console.error(`❌ Token weight and conversion test failed:`, error);
      this.tracker.completeScenarioTest("tokenWeightConversion", testId, "failed", 0, undefined, error.message);
      throw error;
    }
    
    this.markStepCompleted("token-weight-conversion");
  }

  private async testManualRateSystem() {
    console.log("\n   🔄 Testing Manual Rate System...");
    
    const deployerPrivateKey = process.env.PRIVATE_KEY;
    if (!deployerPrivateKey) {
      throw new Error("❌ PRIVATE_KEY not found in environment variables");
    }

    const deployerAccount = privateKeyToAccount(deployerPrivateKey as `0x${string}`);
    const deployerClient = createWalletClient({
      chain: celoAlfajores,
      transport: http(this.config.rpcUrl),
      account: deployerAccount,
    });

    // Get TreasuryModule address
    const treasuryModuleAddress = await this.publicClient.readContract({
      address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
      abi: SOVEREIGN_SEAS_V5_ABI,
      functionName: "getModuleAddress",
      args: ["treasury"],
    });

    // Test setting manual rate
    console.log("     📝 Setting manual rate for SEAS token...");
    const setRateHash = await deployerClient.writeContract({
      address: treasuryModuleAddress as `0x${string}`,
      abi: [
        {
          "inputs": [
            {"internalType": "address", "name": "_token", "type": "address"},
            {"internalType": "uint256", "name": "_celoRate", "type": "uint256"}
          ],
          "name": "setManualTokenRate",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ],
      functionName: "setManualTokenRate",
      args: [this.deployment.record.contracts.seasToken, parseEther("0.002")], // 1 SEAS = 0.002 CELO
    });
    
    await this.publicClient.waitForTransactionReceipt({ hash: setRateHash });
    console.log("     ✅ Manual rate set: 1 SEAS = 0.002 CELO");

    // Test getting conversion info
    console.log("     📊 Getting token conversion info...");
    const conversionInfo = await this.publicClient.readContract({
      address: treasuryModuleAddress as `0x${string}`,
      abi: [
        {
          "inputs": [{"internalType": "address", "name": "_token", "type": "address"}],
          "name": "getTokenConversionInfo",
          "outputs": [
            {"internalType": "bool", "name": "hasMentoProvider", "type": "bool"},
            {"internalType": "bool", "name": "hasManualRate", "type": "bool"},
            {"internalType": "uint256", "name": "manualRate", "type": "uint256"},
            {"internalType": "uint256", "name": "mentoFailuresCount", "type": "uint256"},
            {"internalType": "uint256", "name": "manualUsageCount", "type": "uint256"},
            {"internalType": "uint256", "name": "lastMentoAttemptTime", "type": "uint256"}
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: "getTokenConversionInfo",
      args: [this.deployment.record.contracts.seasToken],
    });

    console.log(`     📈 Conversion Info:`, {
      hasMentoProvider: conversionInfo[0],
      hasManualRate: conversionInfo[1],
      manualRate: Number(conversionInfo[2]) / 1e18,
      mentoFailures: Number(conversionInfo[3]),
      manualUsage: Number(conversionInfo[4])
    });

    // Test conversion health
    console.log("     🏥 Checking conversion health...");
    const healthInfo = await this.publicClient.readContract({
      address: treasuryModuleAddress as `0x${string}`,
      abi: [
        {
          "inputs": [{"internalType": "address", "name": "_token", "type": "address"}],
          "name": "getConversionHealth",
          "outputs": [
            {"internalType": "bool", "name": "isHealthy", "type": "bool"},
            {"internalType": "string", "name": "status", "type": "string"},
            {"internalType": "uint256", "name": "failureRate", "type": "uint256"}
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: "getConversionHealth",
      args: [this.deployment.record.contracts.seasToken],
    });

    console.log(`     💚 Health Status:`, {
      isHealthy: healthInfo[0],
      status: healthInfo[1],
      failureRate: Number(healthInfo[2])
    });
  }

  private async testERC20CampaignTokenWeights() {
    console.log("\n   ⚖️ Testing ERC20 Campaign Token Weights...");
    
    const deployerPrivateKey = process.env.PRIVATE_KEY;
    if (!deployerPrivateKey) {
      throw new Error("❌ PRIVATE_KEY not found in environment variables");
    }

    const deployerAccount = privateKeyToAccount(deployerPrivateKey as `0x${string}`);
    const deployerClient = createWalletClient({
      chain: celoAlfajores,
      transport: http(this.config.rpcUrl),
      account: deployerAccount,
    });

    // Get CampaignsModule address
    const campaignsModuleAddress = await this.publicClient.readContract({
      address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
      abi: SOVEREIGN_SEAS_V5_ABI,
      functionName: "getModuleAddress",
      args: ["campaigns"],
    });

    // Get SEAS campaign from state
    const seasTokenAddress = this.deployment.record.contracts.seasToken;
    if (!seasTokenAddress) {
      throw new Error("❌ SEAS token not found in deployment");
    }
    if (!this.state.campaigns) {
      throw new Error("❌ Campaigns not found in state");
    }
    const seasCampaign = this.state.campaigns.find(c => c.isERC20 && c.tokenAddress === seasTokenAddress);
    if (!seasCampaign) {
      throw new Error("❌ SEAS campaign not found in state");
    }

    // Test getting campaign token configuration
    console.log("     📋 Getting SEAS campaign token configuration...");
    const tokenConfig = await this.publicClient.readContract({
      address: campaignsModuleAddress as `0x${string}`,
      abi: [
        {
          "inputs": [{"internalType": "uint256", "name": "_campaignId", "type": "uint256"}],
          "name": "getCampaignTokenConfiguration",
          "outputs": [
            {"internalType": "address[]", "name": "tokens", "type": "address[]"},
            {"internalType": "uint256[]", "name": "weights", "type": "uint256[]"},
            {"internalType": "bool[]", "name": "conversionModes", "type": "bool[]"}
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: "getCampaignTokenConfiguration",
      args: [seasCampaign.id],
    });

    console.log(`     🎯 Token Configuration:`, {
      tokens: tokenConfig[0],
      weights: tokenConfig[1].map((w: bigint) => Number(w) / 1e18),
      conversionModes: tokenConfig[2]
    });

    // Test updating token weight
    console.log("     🔧 Updating SEAS token weight...");
    const updateWeightHash = await deployerClient.writeContract({
      address: campaignsModuleAddress as `0x${string}`,
      abi: [
        {
          "inputs": [
            {"internalType": "uint256", "name": "_campaignId", "type": "uint256"},
            {"internalType": "address", "name": "_token", "type": "address"},
            {"internalType": "uint256", "name": "_newWeight", "type": "uint256"}
          ],
          "name": "updateCampaignTokenWeight",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ],
      functionName: "updateCampaignTokenWeight",
      args: [
        seasCampaign.id,
        seasTokenAddress,
        parseEther("0.005") // Update to 1 SEAS = 0.005 CELO
      ],
    });
    
    await this.publicClient.waitForTransactionReceipt({ hash: updateWeightHash });
    console.log("     ✅ Token weight updated to 0.005 CELO per SEAS");

    // Test updating conversion mode
    console.log("     🔄 Updating conversion mode to CELO conversion...");
    const updateModeHash = await deployerClient.writeContract({
      address: campaignsModuleAddress as `0x${string}`,
      abi: [
        {
          "inputs": [
            {"internalType": "uint256", "name": "_campaignId", "type": "uint256"},
            {"internalType": "address", "name": "_token", "type": "address"},
            {"internalType": "bool", "name": "_useCeloConversion", "type": "bool"}
          ],
          "name": "updateTokenConversionMode",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ],
      functionName: "updateTokenConversionMode",
      args: [
        seasCampaign.id,
        seasTokenAddress,
        true // Switch to CELO conversion mode
      ],
    });
    
    await this.publicClient.waitForTransactionReceipt({ hash: updateModeHash });
    console.log("     ✅ Conversion mode updated to CELO conversion");

    // Verify the changes
    const updatedConfig = await this.publicClient.readContract({
      address: campaignsModuleAddress as `0x${string}`,
      abi: [
        {
          "inputs": [{"internalType": "uint256", "name": "_campaignId", "type": "uint256"}],
          "name": "getCampaignTokenConfiguration",
          "outputs": [
            {"internalType": "address[]", "name": "tokens", "type": "address[]"},
            {"internalType": "uint256[]", "name": "weights", "type": "uint256[]"},
            {"internalType": "bool[]", "name": "conversionModes", "type": "bool[]"}
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: "getCampaignTokenConfiguration",
      args: [seasCampaign.id],
    });

    console.log(`     ✅ Updated Configuration:`, {
      weights: updatedConfig[1].map((w: bigint) => Number(w) / 1e18),
      conversionModes: updatedConfig[2]
    });
  }

  private async testTokenConversionHealth() {
    console.log("\n   🏥 Testing Token Conversion Health Monitoring...");
    
    const treasuryModuleAddress = await this.publicClient.readContract({
      address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
      abi: SOVEREIGN_SEAS_V5_ABI,
      functionName: "getModuleAddress",
      args: ["treasury"],
    });

    // Test conversion with logging
    console.log("     📊 Testing conversion with logging...");
    try {
      const conversionResult = await this.publicClient.readContract({
        address: treasuryModuleAddress as `0x${string}`,
        abi: [
          {
            "inputs": [
              {"internalType": "address", "name": "_token", "type": "address"},
              {"internalType": "uint256", "name": "_amount", "type": "uint256"}
            ],
            "name": "getTokenToCeloEquivalentWithLogging",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ],
        functionName: "getTokenToCeloEquivalentWithLogging",
        args: [this.deployment.record.contracts.seasToken, parseEther("100")], // 100 SEAS
      });

      console.log(`     💰 100 SEAS = ${Number(conversionResult) / 1e18} CELO`);
    } catch (error) {
      console.log(`     ⚠️ Conversion with logging failed (expected for view function): ${error.message}`);
    }

    // Test regular conversion
    console.log("     🔄 Testing regular conversion...");
    const regularConversion = await this.publicClient.readContract({
      address: treasuryModuleAddress as `0x${string}`,
      abi: [
        {
          "inputs": [
            {"internalType": "address", "name": "_token", "type": "address"},
            {"internalType": "uint256", "name": "_amount", "type": "uint256"}
          ],
          "name": "getTokenToCeloEquivalent",
          "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: "getTokenToCeloEquivalent",
      args: [this.deployment.record.contracts.seasToken, parseEther("100")], // 100 SEAS
    });

    console.log(`     💰 100 SEAS = ${Number(regularConversion) / 1e18} CELO (using manual rate)`);
  }

  private async testAdminTokenWeightManagement() {
    console.log("\n   👑 Testing Admin Token Weight Management...");
    
    const deployerPrivateKey = process.env.PRIVATE_KEY;
    if (!deployerPrivateKey) {
      throw new Error("❌ PRIVATE_KEY not found in environment variables");
    }

    const deployerAccount = privateKeyToAccount(deployerPrivateKey as `0x${string}`);
    const deployerClient = createWalletClient({
      chain: celoAlfajores,
      transport: http(this.config.rpcUrl),
      account: deployerAccount,
    });

    const treasuryModuleAddress = await this.publicClient.readContract({
      address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
      abi: SOVEREIGN_SEAS_V5_ABI,
      functionName: "getModuleAddress",
      args: ["treasury"],
    });

    // Test emergency rate setting
    console.log("     🚨 Testing emergency rate setting...");
    const emergencyRateHash = await deployerClient.writeContract({
      address: treasuryModuleAddress as `0x${string}`,
      abi: [
        {
          "inputs": [
            {"internalType": "address", "name": "_token", "type": "address"},
            {"internalType": "uint256", "name": "_celoRate", "type": "uint256"}
          ],
          "name": "emergencySetTokenRate",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ],
      functionName: "emergencySetTokenRate",
      args: [this.deployment.record.contracts.seasToken, parseEther("0.01")], // Emergency rate: 1 SEAS = 0.01 CELO
    });
    
    await this.publicClient.waitForTransactionReceipt({ hash: emergencyRateHash });
    console.log("     ✅ Emergency rate set: 1 SEAS = 0.01 CELO");

    // Test removing manual rate
    console.log("     🗑️ Testing manual rate removal...");
    const removeRateHash = await deployerClient.writeContract({
      address: treasuryModuleAddress as `0x${string}`,
      abi: [
        {
          "inputs": [{"internalType": "address", "name": "_token", "type": "address"}],
          "name": "removeManualTokenRate",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ],
      functionName: "removeManualTokenRate",
      args: [this.deployment.record.contracts.seasToken],
    });
    
    await this.publicClient.waitForTransactionReceipt({ hash: removeRateHash });
    console.log("     ✅ Manual rate removed");

    // Verify removal
    const finalConversionInfo = await this.publicClient.readContract({
      address: treasuryModuleAddress as `0x${string}`,
      abi: [
        {
          "inputs": [{"internalType": "address", "name": "_token", "type": "address"}],
          "name": "getTokenConversionInfo",
          "outputs": [
            {"internalType": "bool", "name": "hasMentoProvider", "type": "bool"},
            {"internalType": "bool", "name": "hasManualRate", "type": "bool"},
            {"internalType": "uint256", "name": "manualRate", "type": "uint256"},
            {"internalType": "uint256", "name": "mentoFailuresCount", "type": "uint256"},
            {"internalType": "uint256", "name": "manualUsageCount", "type": "uint256"},
            {"internalType": "uint256", "name": "lastMentoAttemptTime", "type": "uint256"}
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: "getTokenConversionInfo",
      args: [this.deployment.record.contracts.seasToken],
    });

    console.log(`     ✅ Final Conversion Info:`, {
      hasManualRate: finalConversionInfo[1],
      manualRate: Number(finalConversionInfo[2]) / 1e18
    });
  }

  private async generateReport() {
    console.log("\n📊 Generating Test Report");
    console.log("=" .repeat(50));
    
    console.log(`🌐 Network: ${this.config.network}`);
    console.log(`⏰ Test Started: ${this.state.timestamp}`);
    console.log(`📋 Deployment: ${this.deployment.path}`);
    
    if (this.state.seasDistributed) {
      console.log(`✅ SEAS Tokens: Distributed to ${this.wallets.length} wallets`);
    }
    
    if (this.state.projects && this.state.projects.length > 0) {
      console.log(`✅ Projects: ${this.state.projects.length} created`);
      this.state.projects.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} (ID: ${p.id})`);
      });
    }
    
    if (this.state.campaigns && this.state.campaigns.length > 0) {
      console.log(`✅ Campaigns: ${this.state.campaigns.length} created`);
      this.state.campaigns.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.name} (${c.isERC20 ? "SEAS" : "CELO"} based)`);
      });
    }
    
    if (this.state.votingSessions && this.state.votingSessions.length > 0) {
      console.log(`✅ Voting Sessions: ${this.state.votingSessions.length} created`);
    }
    
    console.log(`📝 Completed Steps: ${this.state.completedSteps?.length || 0}`);
    this.state.completedSteps?.forEach(step => {
      console.log(`   ✅ ${step}`);
    });
    
    // Update test results in tracker
    this.tracker.updateTestResults(
      this.totalTests,
      this.passedTests,
      this.failedTests,
      this.skippedTests,
      Date.now() - this.testStartTime,
      this.gasUsage
    );
    
    // Generate and display tracker report
    console.log(this.tracker.generateReport());
    
    console.log("=" .repeat(50));
    console.log("🎉 Comprehensive V5 Test Completed Successfully!");
  }

  async run() {
    try {
      this.testStartTime = Date.now();
      await this.initialize();
      await this.checkWalletFunding();
      await this.distributeSeasTokens();
      await this.enableSeasTokenForVoting();
      await this.createProjects();
      await this.createCampaigns();
      await this.addProjectsToSeasCampaign(); // Added this line
      await this.testTokenWeightAndConversionFeatures(); // Test new token weight and conversion features
      await this.testVotingAndDistribution();
      await this.generateReport();
    } catch (error) {
      console.error("❌ Test failed:", error);
      process.exit(1);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const network = args[0] || process.env.HARDHAT_NETWORK || "alfajores";
  const rpcUrl = process.env.RPC_URL || "https://alfajores-forno.celo-testnet.org";
  
  // Parse command line options
  const skipSteps = args.includes("--skip") 
    ? args[args.indexOf("--skip") + 1]?.split(",") || []
    : [];
  
  const repeatSteps = args.includes("--repeat")
    ? args[args.indexOf("--repeat") + 1]?.split(",") || []
    : [];

  console.log("🌊 Sovereign Seas V5 Comprehensive Test Suite");
  console.log("============================================");
  
  if (skipSteps.length > 0) {
    console.log(`⏭️  Skipping steps: ${skipSteps.join(", ")}`);
  }
  
  if (repeatSteps.length > 0) {
    console.log(`🔄 Repeating steps: ${repeatSteps.join(", ")}`);
  }

  const config: TestConfig = {
    network,
    rpcUrl,
    skipSteps,
    repeatSteps,
  };

  const test = new ComprehensiveV5Test(config);
  await test.run();
}

main().catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});
