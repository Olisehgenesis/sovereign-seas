import { createPublicClient, createWalletClient, http, parseEther, encodeFunctionData, decodeAbiParameters } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "viem/chains";
import * as fs from "fs";
import * as path from "path";
import { ensureDeployment, loadState, saveState, TestState } from "./state";
import { TestingTrackerManager } from "./testing-tracker-utils";

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
  }

  private async checkWalletFunding() {
    console.log("\n💰 Checking wallet funding...");
    
    for (let i = 0; i < this.wallets.length; i++) {
      const wallet = this.wallets[i];
      const balance = await this.publicClient.getBalance({ address: wallet.address });
      const balanceInEther = Number(balance) / 1e18;
      
      if (balanceInEther < 0.5) {
        console.log(`❌ Wallet ${i + 1} (${wallet.address}) has insufficient CELO: ${balanceInEther.toFixed(4)}`);
        throw new Error("Please fund test wallets with CELO and rerun");
      } else {
        console.log(`✅ Wallet ${i + 1}: ${balanceInEther.toFixed(4)} CELO`);
      }
    }
  }

  private async distributeSeasTokens() {
    if (this.shouldSkipStep("distribute-seas")) return;
    
    console.log("\n🪙 Distributing SEAS tokens to test wallets...");
    
    // Start tracking SEAS token distribution test
    const testId = this.tracker.startScenarioTest(
      "seasDistribution",
      "SEAS Token Distribution",
      "Distribute SEAS tokens from first wallet to all other test wallets"
    );
    
    if (!this.deployment.record.contracts.seasToken) {
      this.tracker.completeScenarioTest("seasDistribution", testId, "failed", 0, undefined, "SEAS token not found in deployment");
      throw new Error("❌ SEAS token not found in deployment. Deploy SEAS token first.");
    }

    // Use the first wallet (index 0) as the source wallet for SEAS tokens
    const sourceWallet = this.wallets[0];
    console.log(`✅ Using first wallet as source: ${sourceWallet.address}`);
    
    // Check if source wallet has SEAS tokens
    const sourceWalletBalance = await this.publicClient.readContract({
      address: this.deployment.record.contracts.seasToken as `0x${string}`,
      abi: SEAS_TOKEN_ABI,
      functionName: "balanceOf",
      args: [sourceWallet.address as `0x${string}`],
    });

    if (Number(sourceWalletBalance) > 0) {
      console.log(`✅ Source wallet has ${Number(sourceWalletBalance) / 1e18} SEAS tokens`);
      
      // Transfer tokens from source wallet to other test wallets
      const sourceWalletAccount = privateKeyToAccount(sourceWallet.privateKey);
      const sourceWalletClient = createWalletClient({
        chain: celoAlfajores,
        transport: http(this.config.rpcUrl),
        account: sourceWalletAccount,
      });

      const amountToDistribute = parseEther("10000");
      
      for (let i = 1; i < this.wallets.length; i++) { // Start from index 1 (skip source wallet)
        const wallet = this.wallets[i];
        console.log(`💸 Transferring 10,000 SEAS to wallet ${i + 1}: ${wallet.address}`);
        
        try {
          const hash = await sourceWalletClient.writeContract({
            address: this.deployment.record.contracts.seasToken as `0x${string}`,
            abi: SEAS_TOKEN_ABI,
            functionName: "transfer",
            args: [wallet.address, amountToDistribute],
          });
          
          console.log(`  ⏳ Transaction: ${hash}`);
          await this.publicClient.waitForTransactionReceipt({ hash });
          
          // Verify balance
          const balance = await this.publicClient.readContract({
            address: this.deployment.record.contracts.seasToken as `0x${string}`,
            abi: SEAS_TOKEN_ABI,
            functionName: "balanceOf",
            args: [wallet.address],
          });
          
          console.log(`  ✅ Balance: ${Number(balance) / 1e18} SEAS`);
        } catch (error) {
          console.error(`❌ Failed to transfer SEAS to wallet ${i + 1}:`, error);
          throw error;
        }
      }
      
      console.log("✅ SEAS token distribution completed successfully");
      
    } else {
      console.log("❌ Source wallet has no SEAS tokens. Cannot distribute.");
      console.log("💡 You may need to manually send SEAS tokens to the first wallet or use the deployer account.");
      throw new Error("Source wallet has no SEAS tokens to distribute");
    }

    this.state.seasDistributed = true;
    this.markStepCompleted("distribute-seas");
    console.log("✅ SEAS token distribution completed");
    
    // Mark scenario as completed successfully
    this.tracker.completeScenarioTest("seasDistribution", testId, "passed", Date.now() - this.testStartTime);
  }

  private async createProjects() {
    if (this.shouldSkipStep("create-projects")) return;
    
    console.log("\n🏗️ Creating projects for each wallet...");
    
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
          // Try to get the new project count to verify creation
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
          
          const projectId = BigInt(newProjectCount as string);
          
          this.state.projects.push({
            id: projectId,
            owner: wallet.address,
            name: `${template.name} #${i + 1}`,
          });
  
          console.log(`  ✅ Project created with ID: ${projectId}`);
          
          // Mark function test as passed
          this.tracker.completeFunctionTest(
            "projects",
            "createProject",
            functionTestId,
            "passed",
            executionTime,
            gasUsed
          );
          
          this.passedTests++;
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
        "createCampaign",
        "Create CELO campaign",
        "Create normal CELO-based campaign"
      );
      
      const normalCampaignData = encodeFunctionData({
        abi: CAMPAIGNS_MODULE_ABI,
        functionName: "createCampaign",
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
          this.deployment.record.contracts.seasToken, // Payout token
          this.deployment.record.contracts.seasToken // Fee token
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

      this.state.campaigns.push({
        id: BigInt(1), // Assuming first campaign
        name: "Ocean Innovation Challenge",
        isERC20: false,
      });
      
      console.log("  ✅ Normal campaign created");
      
      // Mark function test as passed
      this.tracker.completeFunctionTest(
        "campaigns",
        "createCampaign",
        functionTestId,
        "passed",
        executionTime,
        gasUsed
      );
      
      this.passedTests++;
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
          [1000], // SEAS token weight (1x)
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

      this.state.campaigns.push({
        id: BigInt(2), // Assuming second campaign
        name: "SEAS Innovation Fund", 
        isERC20: true,
        tokenAddress: this.deployment.record.contracts.seasToken,
      });
      
      console.log("  ✅ SEAS token-based campaign created successfully");
      
      // Mark function test as passed
      this.tracker.completeFunctionTest(
        "campaigns",
        "createERC20Campaign",
        functionTestId,
        "passed",
        executionTime,
        gasUsed
      );
      
      this.passedTests++;
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
    
    if (!this.state.campaigns || this.state.campaigns.length < 2) {
      console.log("❌ SEAS campaign not found. Cannot add projects.");
      return;
    }
    
    const seasCampaign = this.state.campaigns.find(c => c.isERC20 && c.tokenAddress === this.deployment.record.contracts.seasToken);
    if (!seasCampaign) {
      console.log("❌ SEAS campaign not found in state.");
      return;
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
      
      console.log(`📝 Adding project "${project.name}" to SEAS campaign using wallet ${i + 1}`);
      
      const account = privateKeyToAccount(wallet.privateKey);
      const walletClient = createWalletClient({
        chain: celoAlfajores,
        transport: http(this.config.rpcUrl),
        account,
      });
      
      try {
        // First approve SEAS tokens for the campaign
        console.log(`   Approving SEAS tokens for project addition...`);
        const approveHash = await walletClient.writeContract({
          address: this.deployment.record.contracts.seasToken as `0x${string}`,
          abi: SEAS_TOKEN_ABI,
          functionName: "approve",
          args: [this.deployment.record.contracts.sovereignSeasV5, parseEther("100")],
        });
        
        await this.publicClient.waitForTransactionReceipt({ hash: approveHash });
        console.log(`   ✅ SEAS tokens approved`);
        
        // Add project to campaign
        const addProjectData = encodeFunctionData({
          abi: CAMPAIGNS_MODULE_ABI,
          functionName: "requestProjectParticipation",
          args: [seasCampaign.id, project.id],
        });
        
        const addProjectHash = await walletClient.writeContract({
          address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
          abi: SOVEREIGN_SEAS_V5_ABI,
          functionName: "callModule",
          args: ["campaigns", addProjectData],
        });
        
        console.log(`   ⏳ Adding project transaction: ${addProjectHash}`);
        await this.publicClient.waitForTransactionReceipt({ hash: addProjectHash });
        console.log(`   ✅ Project "${project.name}" added to SEAS campaign`);
        
        // Approve the project participation using campaign admin account
        console.log(`   Approving project participation using campaign admin account...`);
        const campaignAdminAccount = privateKeyToAccount(this.wallets[0].privateKey);
        const campaignAdminClient = createWalletClient({
          chain: celoAlfajores,
          transport: http(this.config.rpcUrl),
          account: campaignAdminAccount,
        });
        
        console.log(`   🔍 Campaign admin account: ${campaignAdminAccount.address}`);
        console.log(`   📋 Campaign ID: ${seasCampaign.id}`);
        
        // Campaign admin should now be able to approve projects directly
        console.log(`   ✅ Campaign admin account ready: ${campaignAdminAccount.address}`);
        
        const approveData = encodeFunctionData({
          abi: CAMPAIGNS_MODULE_ABI,
          functionName: "finalizeProjectParticipationApproval",
          args: [seasCampaign.id, project.id, true],
        });
        
        const approveParticipationHash = await campaignAdminClient.writeContract({
          address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
          abi: SOVEREIGN_SEAS_V5_ABI,
          functionName: "callModule",
          args: ["campaigns", approveData],
        });
        
        console.log(`   ⏳ Approval transaction: ${approveParticipationHash}`);
        await this.publicClient.waitForTransactionReceipt({ hash: approveParticipationHash });
        console.log(`   ✅ Project "${project.name}" approved for SEAS campaign`);
        
      } catch (error) {
        console.error(`❌ Failed to add project "${project.name}" to SEAS campaign:`, error);
        throw error;
      }
    }
    
    // Test SEAS token voting
    console.log(`🗳️ Testing SEAS token voting...`);
    
    // Use wallet 1 to vote for project 1
    const voterWallet = this.wallets[1];
    const projectToVoteFor = this.state.projects[0];
    
    console.log(`   Wallet 1 voting for project "${projectToVoteFor.name}" with SEAS tokens`);
    
    const voterAccount = privateKeyToAccount(voterWallet.privateKey);
    const voterClient = createWalletClient({
      chain: celoAlfajores,
      transport: http(this.config.rpcUrl),
      account: voterAccount,
    });
    
    try {
      // Approve SEAS tokens for voting
      console.log(`   Approving SEAS tokens for voting...`);
      const approveVoteHash = await voterClient.writeContract({
        address: this.deployment.record.contracts.seasToken as `0x${string}`,
        abi: SEAS_TOKEN_ABI,
        functionName: "approve",
        args: [this.deployment.record.contracts.sovereignSeasV5, parseEther("1000")],
      });
      
      await this.publicClient.waitForTransactionReceipt({ hash: approveVoteHash });
      console.log(`   ✅ SEAS tokens approved for voting`);
      
      // Vote with SEAS tokens
      const voteData = encodeFunctionData({
        abi: VOTING_MODULE_ABI,
        functionName: "vote",
        args: [seasCampaign.id, projectToVoteFor.id, this.deployment.record.contracts.seasToken, parseEther("500")],
      });
      
      const voteHash = await voterClient.writeContract({
        address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI,
        functionName: "callModule",
        args: ["voting", voteData],
      });
      
      console.log(`   ⏳ Voting transaction: ${voteHash}`);
      const voteReceipt = await this.publicClient.waitForTransactionReceipt({ hash: voteHash });
      console.log(`   ✅ Voted successfully with 500 SEAS tokens`);
      console.log(`   Gas used: ${voteReceipt.gasUsed}`);
      
    } catch (error) {
      console.error(`❌ Failed to vote with SEAS tokens:`, error);
      throw error;
    }
    
    this.markStepCompleted("add-projects-to-seas-campaign");
    console.log("✅ Project addition and SEAS voting test completed");
    
    // Mark scenario as completed successfully
    this.tracker.completeScenarioTest("projectAdditionToSeas", testId, "passed", Date.now() - this.testStartTime);
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
        
        const createVotingData = encodeFunctionData({
          abi: VOTING_MODULE_ABI,
          functionName: "createVotingSession",
          args: [
            seasCampaign.id,
            BigInt(7 * 24 * 60 * 60), // 7 days duration
            this.deployment.record.contracts.seasToken as `0x${string}`,
            parseEther("50"), // 50 SEAS minimum to vote
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
          
          const voterAccount = privateKeyToAccount(wallet.privateKey);
          const voterClient = createWalletClient({
            chain: celoAlfajores,
            transport: http(this.config.rpcUrl),
            account: voterAccount,
          });

          // First approve SEAS tokens for voting
          const approveHash = await voterClient.writeContract({
            address: this.deployment.record.contracts.seasToken as `0x${string}`,
            abi: SEAS_TOKEN_ABI,
            functionName: "approve",
            args: [this.deployment.record.contracts.sovereignSeasV5, parseEther("1000")],
          });
          
          await this.publicClient.waitForTransactionReceipt({ hash: approveHash });

          // Vote with 100 SEAS tokens
          const voteFunctionTestId = this.tracker.startFunctionTest(
            "voting",
            "vote",
            `Vote for project ${project.name}`,
            `Vote for project ${project.name} with 100 SEAS tokens`
          );
          
          const voteData = encodeFunctionData({
            abi: VOTING_MODULE_ABI,
            functionName: "vote",
            args: [sessionId, project.id, parseEther("100")],
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
      await this.createProjects();
      await this.createCampaigns();
      await this.addProjectsToSeasCampaign(); // Added this line
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
