import { createPublicClient, createWalletClient, http, parseEther, encodeFunctionData, decodeAbiParameters } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "viem/chains";
import { loadLatestDeployment } from "../utils/deployments";
import { loadState, saveState, TestState } from "./state";
// TestingTrackerManager not needed for dynamic test

// Import ABIs
import SOVEREIGN_SEAS_V5_ABI from "../../artifacts/contracts/v5/SovereignSeasV5.sol/SovereignSeasV5.json";
import CAMPAIGNS_MODULE_ABI from "../../artifacts/contracts/v5/modules/CampaignsModule.sol/CampaignsModule.json";
import PROJECTS_MODULE_ABI from "../../artifacts/contracts/v5/modules/ProjectsModule.sol/ProjectsModule.json";
import VOTING_MODULE_ABI from "../../artifacts/contracts/v5/modules/VotingModule.sol/VotingModule.json";
// We'll use the SEAS token ABI from deployment instead of ERC20Mock

interface TestConfig {
  network: string;
  rpcUrl: string;
  skipSteps?: string[];
}

interface Project {
  id: bigint;
  owner: string;
  name: string;
  description?: string;
}

interface Campaign {
  id: bigint;
  name: string;
  isERC20: boolean;
  tokenAddress?: string;
  startTime?: bigint;
  endTime?: bigint;
  isActive?: boolean;
}

interface Wallet {
  address: string;
  privateKey: string;
}

class DynamicV5Test {
  private config: TestConfig;
  private publicClient: any;
  private state!: TestState;
  private wallets!: Wallet[];
  private deployment!: any;
  // TestingTrackerManager not needed for dynamic test
  private testStartTime!: number;
  private projects: Project[] = [];
  private campaigns: Campaign[] = [];
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
   */
  private handleSuccessfulTransaction(
    operation: string,
    additionalData?: any
  ) {
    this.saveState();
    console.log(`  💾 State saved after ${operation}`);
    
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
    console.log(`🚀 Initializing Dynamic V5 Test on ${this.config.network}`);
    
    // Testing tracker not needed for dynamic test
    this.testStartTime = Date.now();
    
    // Load deployment
    this.deployment = await loadLatestDeployment(this.config.network);
    console.log(`📦 Loaded deployment: ${this.deployment.path}`);
    
    // Load wallets
    const walletsData = require("../../wallets/alfajores-wallets.json");
    this.wallets = walletsData.wallets;
    console.log(`👛 Loaded ${this.wallets.length} test wallets`);
    
    // Load or initialize state
    this.state = loadState(this.config.network) || {
      network: this.config.network,
      timestamp: new Date().toISOString(),
      deploymentPath: this.deployment.path,
      completedSteps: [],
      projects: [],
      campaigns: [],
      votingSessions: []
    };
    
    console.log(`📊 State loaded with ${this.state.completedSteps?.length || 0} completed steps`);
  }

  private saveState() {
    // Save current state with projects and campaigns data
    const stateToSave = {
      ...this.state,
      projects: this.projects.map(p => ({
        id: p.id.toString(),
        owner: p.owner,
        name: p.name,
        description: p.description
      })),
      campaigns: this.campaigns.map(c => ({
        id: c.id.toString(),
        name: c.name,
        isERC20: c.isERC20,
        tokenAddress: c.tokenAddress,
        startTime: c.startTime?.toString(),
        endTime: c.endTime?.toString(),
        isActive: c.isActive
      }))
    };
    saveState(this.config.network, stateToSave as any);
  }

  private shouldSkipStep(step: string): boolean {
    return this.config.skipSteps?.includes(step) || this.state.completedSteps?.includes(step) || false;
  }

  private markStepCompleted(step: string) {
    if (!this.state.completedSteps) this.state.completedSteps = [];
    if (!this.state.completedSteps.includes(step)) {
      this.state.completedSteps.push(step);
    }
  }

  /**
   * Dynamically get all projects from the contracts
   */
  private async getExistingProjects(): Promise<Project[]> {
    console.log("\n🔍 Getting existing projects from contracts...");
    
    try {
      // Get project count
      const projectCountData = encodeFunctionData({
        abi: PROJECTS_MODULE_ABI.abi,
        functionName: "getProjectCount",
        args: []
      });
      
      const projectCountResult = await this.publicClient.readContract({
        address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI.abi,
        functionName: "staticCallModule",
        args: ["projects", projectCountData],
      });
      
      const projectCount = BigInt(projectCountResult as string);
      console.log(`📊 Found ${projectCount} existing projects`);
      
      if (projectCount === 0n) {
        console.log("⚠️  No projects found, will need to create some");
        return [];
      }
      
      const projects: Project[] = [];
      
      // Get each project
      for (let i = 1n; i <= projectCount; i++) {
        try {
          const projectData = encodeFunctionData({
            abi: PROJECTS_MODULE_ABI.abi,
            functionName: "getProject",
            args: [i]
          });
          
          const projectResult = await this.publicClient.readContract({
            address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
            abi: SOVEREIGN_SEAS_V5_ABI.abi,
            functionName: "staticCallModule",
            args: ["projects", projectData],
          });
          
          const [owner, name, description, status, active, createdAt, updatedAt] = decodeAbiParameters(
            [
              { type: "address" }, // owner
              { type: "string" },  // name
              { type: "string" },  // description
              { type: "uint8" },   // status (enum)
              { type: "bool" },    // active
              { type: "uint256" }, // createdAt
              { type: "uint256" }  // updatedAt
            ],
            projectResult
          );
          
          projects.push({
            id: i,
            owner: owner.toLowerCase(),
            name,
            description
          });
          
          console.log(`   📋 Project ${i}: "${name}" (Owner: ${owner})`);
          
        } catch (error) {
          console.log(`   ⚠️  Could not get project ${i}: ${error.message}`);
        }
      }
      
      this.projects = projects;
      
      return projects;
      
    } catch (error) {
      console.error("❌ Failed to get existing projects:", error);
      return [];
    }
  }

  /**
   * Dynamically get all campaigns from the contracts
   */
  private async getExistingCampaigns(): Promise<Campaign[]> {
    console.log("\n🔍 Getting existing campaigns from contracts...");
    
    try {
      // Get campaign count using totalCampaigns public variable
      const campaignCountData = encodeFunctionData({
        abi: CAMPAIGNS_MODULE_ABI.abi,
        functionName: "totalCampaigns",
        args: []
      });
      
      const campaignCountResult = await this.publicClient.readContract({
        address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI.abi,
        functionName: "staticCallModule",
        args: ["campaigns", campaignCountData],
      });
      
      const campaignCount = BigInt(campaignCountResult as string);
      console.log(`📊 Found ${campaignCount} existing campaigns`);
      
      if (campaignCount === 0n) {
        console.log("⚠️  No campaigns found, will need to create some");
        return [];
      }
      
      const campaigns: Campaign[] = [];
      
      // Get each campaign
      for (let i = 1n; i <= campaignCount; i++) {
        try {
          const campaignData = encodeFunctionData({
            abi: CAMPAIGNS_MODULE_ABI.abi,
            functionName: "getCampaign",
            args: [i]
          });
          
          const campaignResult = await this.publicClient.readContract({
            address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
            abi: SOVEREIGN_SEAS_V5_ABI.abi,
            functionName: "staticCallModule",
            args: ["campaigns", campaignData],
          });
          
          const [admin, name, description, status, active, startTime, endTime, totalFunds] = decodeAbiParameters(
            [
              { type: "address" }, // admin
              { type: "string" },  // name
              { type: "string" },  // description
              { type: "uint8" },   // status (enum)
              { type: "bool" },    // active
              { type: "uint256" }, // startTime
              { type: "uint256" }, // endTime
              { type: "uint256" }  // totalFunds
            ],
            campaignResult
          );
          
          // For now, we'll assume it's a CELO campaign unless we can determine otherwise
          // We'd need to call getERC20CampaignConfig to get the full details
          campaigns.push({
            id: i,
            name,
            isERC20: false, // Default to CELO campaign, would need additional call to determine
            tokenAddress: undefined,
            startTime,
            endTime,
            isActive: active
          });
          
          console.log(`   📋 Campaign ${i}: "${name}" (CELO based, Active: ${active})`);
          
        } catch (error) {
          console.log(`   ⚠️  Could not get campaign ${i}: ${error.message}`);
        }
      }
      
      this.campaigns = campaigns;
      
      return campaigns;
      
    } catch (error) {
      console.error("❌ Failed to get existing campaigns:", error);
      return [];
    }
  }

  /**
   * Check if projects are in campaigns and add them if needed
   */
  private async ensureProjectsInCampaigns() {
    console.log("\n🔗 Ensuring projects are in campaigns...");
    
    if (this.projects.length === 0) {
      console.log("⚠️  No projects available to add to campaigns");
      return;
    }
    
    if (this.campaigns.length === 0) {
      console.log("⚠️  No campaigns available to add projects to");
      return;
    }
    
    for (const campaign of this.campaigns) {
      console.log(`\n📢 Processing campaign: "${campaign.name}" (ID: ${campaign.id})`);
      
      for (const project of this.projects) {
        console.log(`\n   📋 Checking project: "${project.name}" (ID: ${project.id})`);
        
        try {
          // Check if project is already in campaign
          const isInCampaignData = encodeFunctionData({
            abi: VOTING_MODULE_ABI.abi,
            functionName: "isProjectInCampaign",
            args: [campaign.id, project.id],
          });
          
          const isInCampaignResult = await this.publicClient.readContract({
            address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
            abi: SOVEREIGN_SEAS_V5_ABI.abi,
            functionName: "staticCallModule",
            args: ["voting", isInCampaignData],
          });
          
          const isInCampaign = decodeAbiParameters([{ type: "bool" }], isInCampaignResult)[0];
          
          if (isInCampaign) {
            console.log(`   ✅ Project "${project.name}" is already in campaign "${campaign.name}"`);
            
            // Check if it's approved
            const participationData = encodeFunctionData({
              abi: VOTING_MODULE_ABI.abi,
              functionName: "getParticipationWithPosition",
              args: [campaign.id, project.id],
            });
            
            const participationResult = await this.publicClient.readContract({
              address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
              abi: SOVEREIGN_SEAS_V5_ABI.abi,
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
            
            console.log(`      📊 Status: Approved=${approved}, VoteCount=${voteCount}, VotingPower=${votingPower}`);
            
            if (!approved) {
              console.log(`   🔐 Project needs approval, attempting to approve...`);
              await this.approveProject(campaign, project);
            }
            
          } else {
            console.log(`   ➕ Project "${project.name}" not in campaign, attempting to add...`);
            await this.addProjectToCampaign(campaign, project);
          }
          
        } catch (error) {
          console.error(`   ❌ Error checking project "${project.name}" in campaign "${campaign.name}":`, error.message);
        }
      }
    }
  }

  /**
   * Add project to campaign with proper fee payment
   */
  private async addProjectToCampaign(campaign: Campaign, project: Project) {
    console.log(`   💰 Adding project "${project.name}" to campaign "${campaign.name}"...`);
    
    try {
      // Find a wallet that can pay the fee (use project owner or first wallet)
      const wallet = this.wallets.find(w => w.address.toLowerCase() === project.owner) || this.wallets[0];
      const account = privateKeyToAccount(wallet.privateKey as `0x${string}`);
      const walletClient = createWalletClient({
        chain: celoAlfajores,
        transport: http(this.config.rpcUrl),
        account,
      });
      
      // Determine fee token and amount
      let feeToken: string;
      let feeAmount: bigint;
      let value: bigint = 0n;
      
      if (campaign.isERC20 && campaign.tokenAddress) {
        // ERC20 campaign - pay fee in ERC20 tokens
        feeToken = campaign.tokenAddress;
        feeAmount = parseEther("100"); // 100 SEAS tokens
        
        // Approve SEAS tokens first
        console.log(`   🔐 Approving ${feeAmount} SEAS tokens for project addition...`);
        const approveHash = await walletClient.writeContract({
          address: campaign.tokenAddress as `0x${string}`,
          abi: this.deployment.record.abis.seasToken.abi,
          functionName: "approve",
          args: [this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`, feeAmount],
        });
        
        await this.publicClient.waitForTransactionReceipt({ hash: approveHash });
        console.log(`   ✅ SEAS tokens approved`);
        
      } else {
        // CELO campaign - pay fee in CELO
        feeToken = "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9"; // CELO token address
        feeAmount = parseEther("0.0001"); // Small CELO fee
        value = feeAmount;
      }
      
      // Add project to campaign
      const addProjectData = encodeFunctionData({
        abi: VOTING_MODULE_ABI.abi,
        functionName: "addProjectToCampaign",
        args: [campaign.id, project.id, feeToken],
      });
      
      const addProjectHash = await walletClient.writeContract({
        address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI.abi,
        functionName: "callModule",
        args: ["voting", addProjectData],
        value,
      });
      
      console.log(`   ⏳ Adding project transaction: ${addProjectHash}`);
      await this.publicClient.waitForTransactionReceipt({ hash: addProjectHash });
      console.log(`   ✅ Project "${project.name}" added to campaign "${campaign.name}"`);
      
      // Now approve the project
      await this.approveProject(campaign, project);
      
            } catch (error) {
          console.error(`   ❌ Failed to add project "${project.name}" to campaign "${campaign.name}":`, error.message);
          console.error(`   🔍 Error details:`, error);
          console.error(`   🛑 Stopping execution to debug this error`);
          throw error; // Stop execution to debug
        }
  }

  /**
   * Approve project in campaign
   */
  private async approveProject(campaign: Campaign, project: Project) {
    console.log(`   🔐 Approving project "${project.name}" in campaign "${campaign.name}"...`);
    
    try {
      // Use campaign creator wallet (first wallet) for approval
      const campaignCreatorAccount = privateKeyToAccount(this.wallets[0].privateKey as `0x${string}`);
      const campaignCreatorClient = createWalletClient({
        chain: celoAlfajores,
        transport: http(this.config.rpcUrl),
        account: campaignCreatorAccount,
      });
      
      const approveData = encodeFunctionData({
        abi: VOTING_MODULE_ABI.abi,
        functionName: "approveProject",
        args: [campaign.id, project.id],
      });
      
      const approveHash = await campaignCreatorClient.writeContract({
        address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI.abi,
        functionName: "callModule",
        args: ["voting", approveData],
      });
      
      console.log(`   ⏳ Approval transaction: ${approveHash}`);
      await this.publicClient.waitForTransactionReceipt({ hash: approveHash });
      console.log(`   ✅ Project "${project.name}" approved in campaign "${campaign.name}"`);
      
      // Verify approval
      const participationData = encodeFunctionData({
        abi: VOTING_MODULE_ABI.abi,
        functionName: "getParticipationWithPosition",
        args: [campaign.id, project.id],
      });
      
      const participationResult = await this.publicClient.readContract({
        address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI.abi,
        functionName: "staticCallModule",
        args: ["voting", participationData],
      });
      
      const [approved] = decodeAbiParameters([{ type: "bool" }], participationResult);
      
      if (approved) {
        console.log(`   ✅ Project "${project.name}" is now approved and ready for voting`);
        this.saveStateAfterOperation(`project approval: ${project.name} in ${campaign.name}`);
      } else {
        console.log(`   ⚠️  Project "${project.name}" approval may have failed`);
      }
      
    } catch (error) {
      console.error(`   ❌ Failed to approve project "${project.name}" in campaign "${campaign.name}":`, error.message);
    }
  }

  /**
   * Perform voting on all approved projects
   */
  private async performVoting() {
    console.log("\n🗳️  Performing voting on all approved projects...");
    
    if (this.campaigns.length === 0) {
      console.log("⚠️  No campaigns available for voting");
      return;
    }
    
    for (const campaign of this.campaigns) {
      console.log(`\n📢 Voting in campaign: "${campaign.name}" (ID: ${campaign.id})`);
      
      // Get approved projects in this campaign
      const approvedProjects = await this.getApprovedProjectsInCampaign(campaign);
      
      if (approvedProjects.length === 0) {
        console.log(`   ⚠️  No approved projects found in campaign "${campaign.name}"`);
        continue;
      }
      
      console.log(`   📊 Found ${approvedProjects.length} approved projects for voting`);
      
      // Vote with different wallets
      for (let i = 0; i < Math.min(this.wallets.length, approvedProjects.length); i++) {
        const wallet = this.wallets[i];
        const project = approvedProjects[i];
        
        console.log(`\n   👤 Wallet ${i + 1} (${wallet.address}) voting for project "${project.name}"`);
        
        try {
          await this.voteForProject(campaign, project, wallet);
        } catch (error) {
          console.error(`   ❌ Failed to vote for project "${project.name}":`, error.message);
        }
      }
    }
  }

  /**
   * Get approved projects in a campaign
   */
  private async getApprovedProjectsInCampaign(campaign: Campaign): Promise<Project[]> {
    const approvedProjects: Project[] = [];
    
    for (const project of this.projects) {
      try {
        const participationData = encodeFunctionData({
          abi: VOTING_MODULE_ABI.abi,
          functionName: "getParticipationWithPosition",
          args: [campaign.id, project.id],
        });
        
        const participationResult = await this.publicClient.readContract({
          address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
          abi: SOVEREIGN_SEAS_V5_ABI.abi,
          functionName: "staticCallModule",
          args: ["voting", participationData],
        });
        
        const [approved] = decodeAbiParameters([{ type: "bool" }], participationResult);
        
        if (approved) {
          approvedProjects.push(project);
        }
        
      } catch (error) {
        // Project not in campaign or error getting data
        continue;
      }
    }
    
    return approvedProjects;
  }

  /**
   * Vote for a project
   */
  private async voteForProject(campaign: Campaign, project: Project, wallet: Wallet) {
    try {
      const account = privateKeyToAccount(wallet.privateKey as `0x${string}`);
      const walletClient = createWalletClient({
        chain: celoAlfajores,
        transport: http(this.config.rpcUrl),
        account,
      });
      
      // Determine voting power based on campaign type
      let votingPower: bigint;
      let value: bigint = 0n;
      
      if (campaign.isERC20 && campaign.tokenAddress) {
        // SEAS token campaign - voting power based on SEAS token balance
        const balanceResult = await this.publicClient.readContract({
          address: campaign.tokenAddress as `0x${string}`,
          abi: this.deployment.record.abis.seasToken.abi,
          functionName: "balanceOf",
          args: [wallet.address as `0x${string}`],
        });
        
        votingPower = BigInt(balanceResult as string);
        console.log(`   💰 SEAS token balance: ${votingPower} tokens`);
        
      } else {
        // CELO campaign - voting power based on CELO balance
        const balance = await this.publicClient.getBalance({ address: wallet.address as `0x${string}` });
        votingPower = balance;
        console.log(`   💰 CELO balance: ${Number(balance) / 1e18} CELO`);
      }
      
      if (votingPower === 0n) {
        console.log(`   ⚠️  No voting power available for wallet ${wallet.address}`);
        return;
      }
      
      // Vote for the project
      const voteData = encodeFunctionData({
        abi: VOTING_MODULE_ABI.abi,
        functionName: "vote",
        args: [campaign.id, project.id, votingPower],
      });
      
      const voteHash = await walletClient.writeContract({
        address: this.deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI.abi,
        functionName: "callModule",
        args: ["voting", voteData],
        value,
      });
      
      console.log(`   ⏳ Voting transaction: ${voteHash}`);
      await this.publicClient.waitForTransactionReceipt({ hash: voteHash });
      console.log(`   ✅ Successfully voted for project "${project.name}" with ${votingPower} voting power`);
      
      this.saveStateAfterOperation(`voting: ${wallet.address} for ${project.name}`);
      
    } catch (error) {
      console.error(`   ❌ Failed to vote for project "${project.name}":`, error.message);
    }
  }

  /**
   * Generate final report
   */
  private async generateReport() {
    console.log("\n📊 Generating Dynamic Test Report...");
    
    const endTime = Date.now();
    const totalTime = endTime - this.testStartTime;
    
    console.log("\n" + "=".repeat(60));
    console.log("🎯 DYNAMIC V5 TEST REPORT");
    console.log("=".repeat(60));
    
    console.log(`⏱️  Total Execution Time: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`📦 Deployment: ${this.deployment.path}`);
    console.log(`🌐 Network: ${this.config.network}`);
    
    console.log(`\n📋 Projects Found: ${this.projects.length}`);
    this.projects.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name} (ID: ${p.id}, Owner: ${p.owner})`);
    });
    
    console.log(`\n📢 Campaigns Found: ${this.campaigns.length}`);
    this.campaigns.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.name} (${c.isERC20 ? 'ERC20' : 'CELO'} based, Active: ${c.isActive})`);
    });
    
    console.log(`\n👛 Wallets Used: ${this.wallets.length}`);
    this.wallets.forEach((w, i) => {
      console.log(`   ${i + 1}. ${w.address}`);
    });
    
    console.log(`\n✅ Completed Steps: ${this.state.completedSteps?.length || 0}`);
    this.state.completedSteps?.forEach((step, i) => {
      console.log(`   ${i + 1}. ${step}`);
    });
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 Dynamic test completed successfully!");
    console.log("=".repeat(60));
  }

  /**
   * Main test execution
   */
  async run() {
    try {
      console.log("🚀 Starting Dynamic V5 Test...");
      this.testStartTime = Date.now();
      
      await this.initialize();
      await this.getExistingProjects();
      await this.getExistingCampaigns();
      await this.ensureProjectsInCampaigns();
      await this.performVoting();
      await this.generateReport();
      
    } catch (error) {
      console.error("❌ Dynamic test failed:", error);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const config: TestConfig = {
    network: "alfajores",
    rpcUrl: "https://alfajores-forno.celo-testnet.org",
    skipSteps: [] // No steps to skip in dynamic test
  };
  
  const test = new DynamicV5Test(config);
  await test.run();
}

if (require.main === module) {
  main().catch(console.error);
}

export { DynamicV5Test };
