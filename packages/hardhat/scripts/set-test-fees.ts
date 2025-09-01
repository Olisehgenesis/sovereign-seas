import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "viem/chains";
import * as fs from "fs";
import * as path from "path";
import { ensureDeployment } from "./utils/deployments";

// Import ABIs from artifacts
const TREASURY_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "artifacts", "contracts", "v5", "modules", "TreasuryModule.sol", "TreasuryModule.json"), 
  "utf8"
)).abi;

const CAMPAIGNS_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "artifacts", "contracts", "v5", "modules", "CampaignsModule.sol", "CampaignsModule.json"), 
  "utf8"
)).abi;

const PROJECTS_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "artifacts", "contracts", "v5", "modules", "ProjectsModule.sol", "ProjectsModule.json"), 
  "utf8"
)).abi;

interface SetTestFeesConfig {
  network: string;
  rpcUrl: string;
  adminPrivateKey: string;
}

class SetTestFees {
  private config: SetTestFeesConfig;
  private publicClient: any;
  private adminWallet: any;
  private deployment!: any;

  constructor(config: SetTestFeesConfig) {
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
    console.log(`🚀 Initializing Set Test Fees on ${this.config.network}`);
    
    // Load deployment
    this.deployment = ensureDeployment(this.config.network);
    console.log(`📋 Using deployment: ${this.deployment.path}`);
    console.log(`✅ Initialization complete`);
  }

  private async setTreasuryTestFees() {
    console.log("\n💰 Setting Treasury Module Test Fees");
    
    try {
      const hash = await this.adminWallet.writeContract({
        address: this.deployment.record.contracts.treasury as `0x${string}`,
        abi: TREASURY_MODULE_ABI,
        functionName: 'setTestFees'
      });
      
      await this.publicClient.waitForTransactionReceipt({ hash });
      console.log(`   ✅ Treasury test fees set successfully`);
      return true;
    } catch (error) {
      console.log(`   ❌ Error setting treasury test fees: ${error}`);
      return false;
    }
  }

  private async setCampaignsTestFees() {
    console.log("\n🎯 Setting Campaigns Module Test Fees");
    
    try {
      const hash = await this.adminWallet.writeContract({
        address: this.deployment.record.contracts.campaigns as `0x${string}`,
        abi: CAMPAIGNS_MODULE_ABI,
        functionName: 'setTestFees'
      });
      
      await this.publicClient.waitForTransactionReceipt({ hash });
      console.log(`   ✅ Campaigns test fees set successfully`);
      return true;
    } catch (error) {
      console.log(`   ❌ Error setting campaigns test fees: ${error}`);
      return false;
    }
  }

  private async setProjectsTestFees() {
    console.log("\n🏗️ Setting Projects Module Test Fees");
    
    try {
      const hash = await this.adminWallet.writeContract({
        address: this.deployment.record.contracts.projects as `0x${string}`,
        abi: PROJECTS_MODULE_ABI,
        functionName: 'setTestProjectCreationFee'
      });
      
      await this.publicClient.waitForTransactionReceipt({ hash });
      console.log(`   ✅ Projects test fees set successfully`);
      return true;
    } catch (error) {
      console.log(`   ❌ Error setting projects test fees: ${error}`);
      return false;
    }
  }

  private async verifyTestFees() {
    console.log("\n🔍 Verifying Test Fees");
    
    try {
      // Verify Treasury fees
      const treasuryFees = await this.publicClient.readContract({
        address: this.deployment.record.contracts.treasury as `0x${string}`,
        abi: TREASURY_MODULE_ABI,
        functionName: 'getFeeStructure'
      });
      
      const testFeeAmount = parseEther("0.1");
      const treasuryCorrect = treasuryFees[1] === testFeeAmount && treasuryFees[2] === testFeeAmount && treasuryFees[3] === testFeeAmount;
      console.log(`   Treasury fees: ${treasuryCorrect ? '✅ Correct' : '❌ Incorrect'}`);

      // Verify Projects fees
      const projectsFee = await this.publicClient.readContract({
        address: this.deployment.record.contracts.projects as `0x${string}`,
        abi: PROJECTS_MODULE_ABI,
        functionName: 'projectCreationFee'
      });
      
      const projectsCorrect = projectsFee === testFeeAmount;
      console.log(`   Projects fee: ${projectsCorrect ? '✅ Correct' : '❌ Incorrect'}`);

      return treasuryCorrect && projectsCorrect;
    } catch (error) {
      console.log(`   ❌ Error verifying fees: ${error}`);
      return false;
    }
  }

  async run() {
    try {
      await this.initialize();
      
      console.log("\n🎯 Setting all fees to 0.1 CELO for testing...");
      
      const treasurySuccess = await this.setTreasuryTestFees();
      const campaignsSuccess = await this.setCampaignsTestFees();
      const projectsSuccess = await this.setProjectsTestFees();
      
      if (treasurySuccess && campaignsSuccess && projectsSuccess) {
        console.log("\n✅ All test fees set successfully!");
        
        // Verify the fees
        const verificationSuccess = await this.verifyTestFees();
        
        if (verificationSuccess) {
          console.log("\n🎉 All fees are now set to 0.1 CELO for testing!");
          console.log("\n📋 Summary of changes:");
          console.log("   • Treasury Module: Campaign, Project Addition, and Project Creation fees set to 0.1 CELO");
          console.log("   • Campaigns Module: Admin fee set to 5%, Project Addition and Voting fees set to 0.1 CELO");
          console.log("   • Projects Module: Project Creation fee set to 0.1 CELO");
        } else {
          console.log("\n⚠️ Fees were set but verification failed. Check the logs above.");
        }
      } else {
        console.log("\n❌ Some fees failed to set. Check the logs above.");
      }
      
    } catch (error) {
      console.error("❌ Failed to set test fees:", error);
    }
  }
}

// Main execution
async function main() {
  const config: SetTestFeesConfig = {
    network: process.env.NETWORK || "alfajores",
    rpcUrl: process.env.RPC_URL || "https://alfajores-forno.celo-testnet.org",
    adminPrivateKey: process.env.ADMIN_PRIVATE_KEY || ""
  };

  if (!config.adminPrivateKey) {
    console.error("❌ ADMIN_PRIVATE_KEY environment variable is required");
    process.exit(1);
  }

  const setTestFees = new SetTestFees(config);
  await setTestFees.run();
}

if (require.main === module) {
  main().catch(console.error);
}

export { SetTestFees };
