import { createPublicClient, createWalletClient, http, parseEther, encodeFunctionData, decodeAbiParameters } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "viem/chains";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config();

// Import ABIs from artifacts
const SOVEREIGN_SEAS_V5_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "artifacts", "contracts", "v5", "SovereignSeasV5.sol", "SovereignSeasV5.json"), 
  "utf8"
)).abi;

const PROJECTS_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "artifacts", "contracts", "v5", "modules", "ProjectsModule.sol", "ProjectsModule.json"), 
  "utf8"
)).abi;

const CAMPAIGNS_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "artifacts", "contracts", "v5", "modules", "CampaignsModule.sol", "CampaignsModule.json"), 
  "utf8"
)).abi;

const VOTING_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "artifacts", "contracts", "v5", "modules", "VotingModule.sol", "VotingModule.json"), 
  "utf8"
)).abi;

interface Campaign {
  id: bigint;
  name: string;
  isERC20: boolean;
  tokenAddress?: string;
  owner?: string;
  deployer?: string;
}

interface Project {
  id: bigint;
  name: string;
  owner: string;
  deployer?: string;
}

interface Deployment {
  network: string;
  deployer: string;
  timestamp: string;
  contracts: {
    sovereignSeasV5: string;
    seasToken: string;
    projectsModule: string;
    campaignsModule: string;
    votingModule: string;
    treasuryModule: string;
    poolsModule: string;
    migrationModule: string;
  };
}

class CampaignProjectManager {
  private publicClient: any;
  private deployment!: Deployment;
  private wallets: any[] = [];

  constructor() {
    this.publicClient = createPublicClient({
      chain: celoAlfajores,
      transport: http(process.env.RPC_URL || "https://alfajores-forno.celo-testnet.org"),
    });
  }

  async initialize() {
    console.log("🚀 Initializing Campaign Project Manager...");
    
    // Load deployment
    await this.loadDeployment();
    
    // Load wallets
    await this.loadWallets();
    
    console.log("✅ Initialization complete");
  }

  private async loadDeployment() {
    const network = process.env.NETWORK || "alfajores";
    const deploymentPath = path.join(__dirname, "..", "deployments", network, "latest.json");
    
    if (!fs.existsSync(deploymentPath)) {
      throw new Error(`❌ Deployment file not found: ${deploymentPath}`);
    }
    
    this.deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    console.log(`📋 Loaded deployment for ${network}`);
    console.log(`   SovereignSeasV5: ${this.deployment.contracts.sovereignSeasV5}`);
    console.log(`   SEAS Token: ${this.deployment.contracts.seasToken}`);
    console.log(`   Deployer: ${this.deployment.deployer}`);
  }

  private async loadWallets() {
    const network = process.env.NETWORK || "alfajores";
    const walletsPath = path.join(__dirname, "..", "wallets", `${network}-wallets.json`);
    
    if (!fs.existsSync(walletsPath)) {
      throw new Error(`❌ Wallet file not found: ${walletsPath}`);
    }
    
    this.wallets = (JSON.parse(fs.readFileSync(walletsPath, "utf8")) as { wallets: any[] }).wallets;
    console.log(`👛 Loaded ${this.wallets.length} test wallets`);
  }

  async getCampaign(campaignId: bigint): Promise<Campaign> {
    console.log(`🔍 Getting campaign ${campaignId}...`);
    
    try {
      const campaignData = await this.publicClient.readContract({
        address: this.deployment.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI,
        functionName: "staticCallModule",
        args: ["campaigns", encodeFunctionData({
          abi: CAMPAIGNS_MODULE_ABI,
          functionName: "getCampaign",
          args: [campaignId],
        })],
      });

      const decoded = decodeAbiParameters(
        [
          { name: "id", type: "uint256" },
          { name: "name", type: "string" },
          { name: "description", type: "string" },
          { name: "targetAmount", type: "uint256" },
          { name: "isERC20", type: "bool" },
          { name: "tokenAddress", type: "address" },
          { name: "owner", type: "address" },
          { name: "isActive", type: "bool" },
        ],
        campaignData as `0x${string}`
      );

      const campaign: Campaign = {
        id: decoded[0] as bigint,
        name: decoded[1] as string,
        isERC20: decoded[4] as boolean,
        tokenAddress: decoded[5] as string,
        owner: decoded[6] as string,
        deployer: this.deployment.deployer,
      };

      console.log(`   📋 Campaign ${campaignId}: "${campaign.name}"`);
      console.log(`   👤 Owner: ${campaign.owner}`);
      console.log(`   🏭 Deployer: ${campaign.deployer}`);
      console.log(`   🪙 ERC20: ${campaign.isERC20 ? "Yes" : "No"}`);
      if (campaign.tokenAddress) {
        console.log(`   🪙 Token: ${campaign.tokenAddress}`);
      }

      return campaign;
    } catch (error) {
      console.error(`❌ Failed to get campaign ${campaignId}:`, error);
      throw error;
    }
  }

  async getProject(projectId: bigint): Promise<Project> {
    console.log(`🔍 Getting project ${projectId}...`);
    
    try {
      const projectData = await this.publicClient.readContract({
        address: this.deployment.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI,
        functionName: "staticCallModule",
        args: ["projects", encodeFunctionData({
          abi: PROJECTS_MODULE_ABI,
          functionName: "getProject",
          args: [projectId],
        })],
      });

      const decoded = decodeAbiParameters(
        [
          { name: "id", type: "uint256" },
          { name: "owner", type: "address" },
          { name: "name", type: "string" },
          { name: "description", type: "string" },
          { name: "category", type: "string" },
          { name: "isActive", type: "bool" },
        ],
        projectData as `0x${string}`
      );

      const project: Project = {
        id: decoded[0] as bigint,
        name: decoded[2] as string,
        owner: decoded[1] as string,
        deployer: this.deployment.deployer,
      };

      console.log(`   📋 Project ${projectId}: "${project.name}"`);
      console.log(`   👤 Owner: ${project.owner}`);
      console.log(`   🏭 Deployer: ${project.deployer}`);

      return project;
    } catch (error) {
      console.error(`❌ Failed to get project ${projectId}:`, error);
      throw error;
    }
  }

  async addProjectToCampaign(campaignId: bigint, projectId: bigint, tokenAddress: string, walletIndex: number = 0) {
    console.log(`🔗 Adding project ${projectId} to campaign ${campaignId}...`);
    
    const wallet = this.wallets[walletIndex];
    if (!wallet) {
      throw new Error(`❌ Wallet at index ${walletIndex} not found`);
    }

    const walletAccount = privateKeyToAccount(wallet.privateKey);
    const walletClient = createWalletClient({
      chain: celoAlfajores,
      transport: http(process.env.RPC_URL || "https://alfajores-forno.celo-testnet.org"),
      account: walletAccount,
    });

    try {
      const addProjectData = encodeFunctionData({
        abi: VOTING_MODULE_ABI,
        functionName: "addProjectToCampaign",
        args: [campaignId, projectId, tokenAddress],
      });

      const addProjectHash = await walletClient.writeContract({
        address: this.deployment.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI,
        functionName: "callModule",
        args: ["voting", addProjectData],
        value: tokenAddress === "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9" ? parseEther("0.0001") : 0n, // CELO fee for CELO token
      });

      console.log(`   ⏳ Transaction: ${addProjectHash}`);
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash: addProjectHash });
      
      if (receipt.status === "success") {
        console.log(`   ✅ Project ${projectId} added to campaign ${campaignId} successfully`);
        console.log(`   ⛽ Gas used: ${receipt.gasUsed}`);
      } else {
        throw new Error(`❌ Transaction failed with status: ${receipt.status}`);
      }
    } catch (error) {
      console.error(`❌ Failed to add project to campaign:`, error);
      throw error;
    }
  }

  async approveProject(campaignId: bigint, projectId: bigint, walletIndex: number = 0) {
    console.log(`🔐 Approving project ${projectId} in campaign ${campaignId}...`);
    
    const wallet = this.wallets[walletIndex];
    if (!wallet) {
      throw new Error(`❌ Wallet at index ${walletIndex} not found`);
    }

    const walletAccount = privateKeyToAccount(wallet.privateKey);
    const walletClient = createWalletClient({
      chain: celoAlfajores,
      transport: http(process.env.RPC_URL || "https://alfajores-forno.celo-testnet.org"),
      account: walletAccount,
    });

    try {
      const approveData = encodeFunctionData({
        abi: VOTING_MODULE_ABI,
        functionName: "approveProject",
        args: [campaignId, projectId],
      });

      const approveHash = await walletClient.writeContract({
        address: this.deployment.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI,
        functionName: "callModule",
        args: ["voting", approveData],
        value: 0n,
      });

      console.log(`   ⏳ Transaction: ${approveHash}`);
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash: approveHash });
      
      if (receipt.status === "success") {
        console.log(`   ✅ Project ${projectId} approved in campaign ${campaignId} successfully`);
        console.log(`   ⛽ Gas used: ${receipt.gasUsed}`);
      } else {
        throw new Error(`❌ Transaction failed with status: ${receipt.status}`);
      }
    } catch (error) {
      console.error(`❌ Failed to approve project:`, error);
      throw error;
    }
  }

  async getProjectCount(): Promise<number> {
    try {
      const projectCount = await this.publicClient.readContract({
        address: this.deployment.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI,
        functionName: "staticCallModule",
        args: ["projects", encodeFunctionData({
          abi: PROJECTS_MODULE_ABI,
          functionName: "getProjectCount",
          args: [],
        })],
      });
      return Number(projectCount);
    } catch (error) {
      console.error("❌ Failed to get project count:", error);
      return 0;
    }
  }

  async runCampaignProjectOperations() {
    console.log("\n🎯 Starting Campaign Project Operations...");
    
    try {
      // Get campaigns 1 and 2
      console.log("\n📢 Getting Campaigns 1 and 2...");
      const campaign1 = await this.getCampaign(1n);
      const campaign2 = await this.getCampaign(2n);
      
      // Check how many projects exist
      console.log("\n📊 Checking available projects...");
      const projectCount = await this.getProjectCount();
      console.log(`   📋 Total projects available: ${projectCount}`);
      
      if (projectCount < 2) {
        console.log(`⚠️  Not enough projects available. Need at least 2, but only ${projectCount} exist.`);
        console.log("💡 You need to create projects first using the comprehensive test script.");
        console.log("   Run: npx ts-node scripts/tests/comprehensive-v5-test.ts");
        return;
      }
      
      // Use projects 0 and 1 (first two projects) instead of 3 and 4
      console.log("\n📋 Getting Projects 0 and 1...");
      const project0 = await this.getProject(0n);
      const project1 = await this.getProject(1n);
      
      // Add project 0 to campaign 1
      console.log("\n🔗 Adding Project 0 to Campaign 1...");
      const tokenAddress1 = campaign1.isERC20 ? this.deployment.contracts.seasToken : "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9";
      await this.addProjectToCampaign(campaign1.id, project0.id, tokenAddress1, 0);
      
      // Approve project 0 in campaign 1
      console.log("\n🔐 Approving Project 0 in Campaign 1...");
      await this.approveProject(campaign1.id, project0.id, 0);
      
      // Add project 1 to campaign 2
      console.log("\n🔗 Adding Project 1 to Campaign 2...");
      const tokenAddress2 = campaign2.isERC20 ? this.deployment.contracts.seasToken : "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9";
      await this.addProjectToCampaign(campaign2.id, project1.id, tokenAddress2, 1);
      
      // Approve project 1 in campaign 2
      console.log("\n🔐 Approving Project 1 in Campaign 2...");
      await this.approveProject(campaign2.id, project1.id, 1);
      
      console.log("\n✅ All operations completed successfully!");
      
    } catch (error) {
      console.error("\n❌ Operations failed:", error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const manager = new CampaignProjectManager();
  
  try {
    await manager.initialize();
    await manager.runCampaignProjectOperations();
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { CampaignProjectManager };
