import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "viem/chains";
import * as fs from "fs";
import * as path from "path";
import { loadLatestDeployment } from "./utils/deployments";

// Import ABIs from artifacts
const TREASURY_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "artifacts", "contracts", "v5", "modules", "TreasuryModule.sol", "TreasuryModule.json"), 
  "utf8"
)).abi;

const CAMPAIGNS_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "artifacts", "contracts", "v5", "modules", "CampaignsModule.sol", "CampaignsModule.sol", "CampaignsModule.json"), 
  "utf8"
)).abi;

const PROJECTS_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "artifacts", "contracts", "v5", "modules", "ProjectsModule.sol", "ProjectsModule.json"), 
  "utf8"
)).abi;

interface SetZeroFeesConfig {
  network: string;
  rpcUrl: string;
  adminPrivateKey: string;
}

class SetZeroFees {
  private config: SetZeroFeesConfig;
  private publicClient: any;
  private adminWallet: any;
  private deployment!: any;

  constructor(config: SetZeroFeesConfig) {
    this.config = config;
    this.publicClient = createPublicClient({ 
      chain: celoAlfajores, 
      transport: http(config.rpcUrl) 
    });
    
    this.adminWallet = createWalletClient({
      account: privateKeyToAccount(config.adminPrivateKey as `0x${string}`),
      chain: celoAlfajores,
      transport: http(config.rpcUrl)
    });
  }

  private async initialize() {
    console.log(`🚀 Initializing Set Zero Fees on ${this.config.network}`);
    
    // Load deployment
    this.deployment = loadLatestDeployment(this.config.network);
    console.log(`📋 Using deployment: ${this.deployment.path}`);
    console.log(`✅ Initialization complete`);
  }

  private async setTreasuryZeroFees() {
    console.log("\n💰 Setting Treasury Module Zero Fees");
    
    try {
      const hash = await this.adminWallet.writeContract({
        address: this.deployment.record.contracts.treasury as `0x${string}`,
        abi: TREASURY_MODULE_ABI,
        functionName: 'setZeroFeesForTesting'
      });
      
      await this.publicClient.waitForTransactionReceipt({ hash });
      console.log(`   ✅ Treasury zero fees set successfully`);
      return true;
    } catch (error) {
      console.log(`   ❌ Error setting treasury zero fees: ${error}`);
      return false;
    }
  }

  private async setCampaignsZeroFees() {
    console.log("\n🎯 Setting Campaigns Module Zero Fees");
    
    try {
      const hash = await this.adminWallet.writeContract({
        address: this.deployment.record.contracts.campaigns as `0x${string}`,
        abi: CAMPAIGNS_MODULE_ABI,
        functionName: 'setZeroFeesForTesting'
      });
      
      await this.publicClient.waitForTransactionReceipt({ hash });
      console.log(`   ✅ Campaigns zero fees set successfully`);
      return true;
    } catch (error) {
      console.log(`   ❌ Error setting campaigns zero fees: ${error}`);
      return false;
    }
  }

  private async setProjectsZeroFees() {
    console.log("\n🏗️ Setting Projects Module Zero Fees");
    
    try {
      const hash = await this.adminWallet.writeContract({
        address: this.deployment.record.contracts.projects as `0x${string}`,
        abi: PROJECTS_MODULE_ABI,
        functionName: 'setZeroProjectCreationFeeForTesting'
      });
      
      await this.publicClient.waitForTransactionReceipt({ hash });
      console.log(`   ✅ Projects zero fees set successfully`);
      return true;
    } catch (error) {
      console.log(`   ❌ Error setting projects zero fees: ${error}`);
      return false;
    }
  }

  private async verifyZeroFees() {
    console.log("\n🔍 Verifying Zero Fees");
    
    try {
      // Verify Treasury fees
      const treasuryFees = await this.publicClient.readContract({
        address: this.deployment.record.contracts.treasury as `0x${string}`,
        abi: TREASURY_MODULE_ABI,
        functionName: 'getFeeStructure'
      });
      
      const treasuryZero = treasuryFees[1] === 0n && treasuryFees[2] === 0n && treasuryFees[3] === 0n;
      console.log(`   Treasury fees: ${treasuryZero ? '✅ Zero' : '❌ Not zero'}`);

      // Verify Projects fees
      const projectsFee = await this.publicClient.readContract({
        address: this.deployment.record.contracts.projects as `0x${string}`,
        abi: PROJECTS_MODULE_ABI,
        functionName: 'projectCreationFee'
      });
      
      const projectsZero = projectsFee === 0n;
      console.log(`   Projects fee: ${projectsZero ? '✅ Zero' : '❌ Not zero'}`);

      return treasuryZero && projectsZero;
    } catch (error) {
      console.log(`   ❌ Error verifying zero fees: ${error}`);
      return false;
    }
  }

  async run() {
    try {
      await this.initialize();
      
      console.log("\n🎯 Setting all fees to zero for testing...");
      
      const treasurySuccess = await this.setTreasuryZeroFees();
      const campaignsSuccess = await this.setCampaignsZeroFees();
      const projectsSuccess = await this.setProjectsZeroFees();
      
      if (treasurySuccess && campaignsSuccess && projectsSuccess) {
        console.log("\n✅ All zero fees set successfully!");
        
        // Verify the fees
        const verificationSuccess = await this.verifyZeroFees();
        
        if (verificationSuccess) {
          console.log("\n🎉 All fees are now set to zero for testing!");
          console.log("\n📋 Summary of changes:");
          console.log("   • Treasury Module: Campaign, Project Addition, and Project Creation fees set to 0 CELO");
          console.log("   • Campaigns Module: Admin fee set to 0%, Project Addition and Voting fees set to 0 CELO");
          console.log("   • Projects Module: Project Creation fee set to 0 CELO");
          console.log("\n💡 Users can now create projects and participate in campaigns without paying fees!");
        } else {
          console.log("\n⚠️ Fees were set to zero but verification failed. Check the logs above.");
        }
      } else {
        console.log("\n❌ Some fees failed to set to zero. Check the logs above.");
      }
      
    } catch (error) {
      console.error("❌ Failed to set zero fees:", error);
    }
  }
}

// Main execution
async function main() {
  const config: SetZeroFeesConfig = {
    network: process.env.NETWORK || "alfajores",
    rpcUrl: process.env.RPC_URL || "https://alfajores-forno.celo-testnet.org",
    adminPrivateKey: process.env.ADMIN_PRIVATE_KEY || ""
  };

  if (!config.adminPrivateKey) {
    console.error("❌ ADMIN_PRIVATE_KEY environment variable is required");
    process.exit(1);
  }

  const setZeroFees = new SetZeroFees(config);
  await setZeroFees.run();
}

if (require.main === module) {
  main().catch(console.error);
}

export { SetZeroFees };
