import { createPublicClient, createWalletClient, http, parseEther, encodeFunctionData, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "viem/chains";
import * as fs from "fs";
import * as path from "path";
import { ensureDeployment, loadState, saveState, TestState } from "./state";

// Import ABIs from artifacts
const SOVEREIGN_SEAS_V5_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "v5", "SovereignSeasV5.sol", "SovereignSeasV5.json"), 
  "utf8"
)).abi;

const TREASURY_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "v5", "modules", "TreasuryModule.sol", "TreasuryModule.json"), 
  "utf8"
)).abi;

const CAMPAIGNS_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "v5", "modules", "CampaignsModule.sol", "CampaignsModule.json"), 
  "utf8"
)).abi;

const PROJECTS_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "v5", "modules", "ProjectsModule.sol", "ProjectsModule.json"), 
  "utf8"
)).abi;

interface FeeTestConfig {
  network: string;
  rpcUrl: string;
  adminPrivateKey: string;
  testUserPrivateKey: string;
}

class FeeManagementTest {
  private config: FeeTestConfig;
  private publicClient: any;
  private adminWallet: any;
  private testUserWallet: any;
  private state!: TestState;
  private deployment!: any;
  private testStartTime!: number;
  private totalTests = 0;
  private passedTests = 0;
  private failedTests = 0;

  constructor(config: FeeTestConfig) {
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

    this.testUserWallet = createWalletClient({
      account: privateKeyToAccount(config.testUserPrivateKey as `0x${string}`),
      chain: celoAlfajores,
      transport: http(config.rpcUrl)
    });
  }

  private async initialize() {
    console.log(`🚀 Initializing Fee Management Test on ${this.config.network}`);
    
    // Load deployment
    this.deployment = ensureDeployment(this.config.network);
    console.log(`📋 Using deployment: ${this.deployment.path}`);

    // Load or initialize state
    this.state = loadState(this.config.network) || {
      network: this.config.network,
      timestamp: new Date().toISOString(),
      completedSteps: [],
      feesTested: false,
      zeroFeesTested: false,
      testFeesTested: false
    };

    this.testStartTime = Date.now();
    console.log(`✅ Initialization complete`);
  }

  private async runTest(testName: string, testFunction: () => Promise<boolean>) {
    this.totalTests++;
    console.log(`\n🧪 Running test: ${testName}`);
    
    try {
      const result = await testFunction();
      if (result) {
        this.passedTests++;
        console.log(`✅ ${testName} - PASSED`);
      } else {
        this.failedTests++;
        console.log(`❌ ${testName} - FAILED`);
      }
    } catch (error) {
      this.failedTests++;
      console.log(`❌ ${testName} - ERROR: ${error}`);
    }
  }

  private async testTreasuryFeeManagement() {
    console.log("\n💰 Testing Treasury Module Fee Management");
    
    // Test 1: Get current fee structure
    await this.runTest("Get Current Fee Structure", async () => {
      try {
        const feeStructureData = await this.publicClient.readContract({
          address: this.deployment.record.contracts.treasury as `0x${string}`,
          abi: TREASURY_MODULE_ABI,
          functionName: 'getFeeStructure'
        });
        
        console.log(`   Current fees: Platform=${feeStructureData[0]}%, Campaign=${formatEther(feeStructureData[1])} CELO, Project Addition=${formatEther(feeStructureData[2])} CELO, Project Creation=${formatEther(feeStructureData[3])} CELO`);
        return true;
      } catch (error) {
        console.log(`   Error getting fee structure: ${error}`);
        return false;
      }
    });

    // Test 2: Set fees to zero for testing
    await this.runTest("Set Zero Fees for Testing", async () => {
      try {
        const hash = await this.adminWallet.writeContract({
          address: this.deployment.record.contracts.treasury as `0x${string}`,
          abi: TREASURY_MODULE_ABI,
          functionName: 'setZeroFeesForTesting'
        });
        
        await this.publicClient.waitForTransactionReceipt({ hash });
        console.log(`   Zero fees set successfully`);
        return true;
      } catch (error) {
        console.log(`   Error setting zero fees: ${error}`);
        return false;
      }
    });

    // Test 3: Verify fees are zero
    await this.runTest("Verify Zero Fees", async () => {
      try {
        const feeStructureData = await this.publicClient.readContract({
          address: this.deployment.record.contracts.treasury as `0x${string}`,
          abi: TREASURY_MODULE_ABI,
          functionName: 'getFeeStructure'
        });
        
        const allZero = feeStructureData[1] === 0n && feeStructureData[2] === 0n && feeStructureData[3] === 0n;
        console.log(`   Fees are zero: ${allZero}`);
        return allZero;
      } catch (error) {
        console.log(`   Error verifying zero fees: ${error}`);
        return false;
      }
    });

    // Test 4: Set test fees (0.1 CELO)
    await this.runTest("Set Test Fees (0.1 CELO)", async () => {
      try {
        const hash = await this.adminWallet.writeContract({
          address: this.deployment.record.contracts.treasury as `0x${string}`,
          abi: TREASURY_MODULE_ABI,
          functionName: 'setTestFees'
        });
        
        await this.publicClient.waitForTransactionReceipt({ hash });
        console.log(`   Test fees set successfully`);
        return true;
      } catch (error) {
        console.log(`   Error setting test fees: ${error}`);
        return false;
      }
    });

    // Test 5: Verify test fees
    await this.runTest("Verify Test Fees", async () => {
      try {
        const feeStructureData = await this.publicClient.readContract({
          address: this.deployment.record.contracts.treasury as `0x${string}`,
          abi: TREASURY_MODULE_ABI,
          functionName: 'getFeeStructure'
        });
        
        const testFeeAmount = parseEther("0.1");
        const correctFees = feeStructureData[1] === testFeeAmount && feeStructureData[2] === testFeeAmount && feeStructureData[3] === testFeeAmount;
        console.log(`   Test fees are correct: ${correctFees}`);
        return correctFees;
      } catch (error) {
        console.log(`   Error verifying test fees: ${error}`);
        return false;
      }
    });

    // Test 6: Update fee structure
    await this.runTest("Update Fee Structure", async () => {
      try {
        const hash = await this.adminWallet.writeContract({
          address: this.deployment.record.contracts.treasury as `0x${string}`,
          abi: TREASURY_MODULE_ABI,
          functionName: 'updateFeeStructure',
          args: [15, parseEther("0.2"), parseEther("0.15"), parseEther("0.25"), true]
        });
        
        await this.publicClient.waitForTransactionReceipt({ hash });
        console.log(`   Fee structure updated successfully`);
        return true;
      } catch (error) {
        console.log(`   Error updating fee structure: ${error}`);
        return false;
      }
    });

    // Test 7: Toggle fees off
    await this.runTest("Toggle Fees Off", async () => {
      try {
        const hash = await this.adminWallet.writeContract({
          address: this.deployment.record.contracts.treasury as `0x${string}`,
          abi: TREASURY_MODULE_ABI,
          functionName: 'toggleFees',
          args: [false]
        });
        
        await this.publicClient.waitForTransactionReceipt({ hash });
        console.log(`   Fees toggled off successfully`);
        return true;
      } catch (error) {
        console.log(`   Error toggling fees: ${error}`);
        return false;
      }
    });

    // Test 8: Toggle fees back on
    await this.runTest("Toggle Fees On", async () => {
      try {
        const hash = await this.adminWallet.writeContract({
          address: this.deployment.record.contracts.treasury as `0x${string}`,
          abi: TREASURY_MODULE_ABI,
          functionName: 'toggleFees',
          args: [true]
        });
        
        await this.publicClient.waitForTransactionReceipt({ hash });
        console.log(`   Fees toggled on successfully`);
        return true;
      } catch (error) {
        console.log(`   Error toggling fees: ${error}`);
        return false;
      }
    });
  }

  private async testCampaignsFeeManagement() {
    console.log("\n🎯 Testing Campaigns Module Fee Management");
    
    // Test 1: Get campaigns by fee type
    await this.runTest("Get Campaigns by Fee Type", async () => {
      try {
        const feeTypeData = await this.publicClient.readContract({
          address: this.deployment.record.contracts.campaigns as `0x${string}`,
          abi: CAMPAIGNS_MODULE_ABI,
          functionName: 'getCampaignsByFeeType'
        });
        
        console.log(`   Custom fee campaigns: ${feeTypeData[0].length}, Default fee campaigns: ${feeTypeData[1].length}`);
        return true;
      } catch (error) {
        console.log(`   Error getting campaigns by fee type: ${error}`);
        return false;
      }
    });

    // Test 2: Set zero fees for testing (only affects default fee campaigns)
    await this.runTest("Set Zero Campaign Fees (Default Only)", async () => {
      try {
        const hash = await this.adminWallet.writeContract({
          address: this.deployment.record.contracts.campaigns as `0x${string}`,
          abi: CAMPAIGNS_MODULE_ABI,
          functionName: 'setZeroFeesForTesting'
        });
        
        await this.publicClient.waitForTransactionReceipt({ hash });
        console.log(`   Zero campaign fees set for default fee campaigns only`);
        return true;
      } catch (error) {
        console.log(`   Error setting zero campaign fees: ${error}`);
        return false;
      }
    });

    // Test 3: Set test fees (only affects default fee campaigns)
    await this.runTest("Set Test Campaign Fees (Default Only)", async () => {
      try {
        const hash = await this.adminWallet.writeContract({
          address: this.deployment.record.contracts.campaigns as `0x${string}`,
          abi: CAMPAIGNS_MODULE_ABI,
          functionName: 'setTestFees'
        });
        
        await this.publicClient.waitForTransactionReceipt({ hash });
        console.log(`   Test campaign fees set for default fee campaigns only`);
        return true;
      } catch (error) {
        console.log(`   Error setting test campaign fees: ${error}`);
        return false;
      }
    });

    // Test 4: Update global campaign fees (only affects default fee campaigns)
    await this.runTest("Update Global Campaign Fees (Default Only)", async () => {
      try {
        const hash = await this.adminWallet.writeContract({
          address: this.deployment.record.contracts.campaigns as `0x${string}`,
          abi: CAMPAIGNS_MODULE_ABI,
          functionName: 'updateGlobalCampaignFees',
          args: [100, this.deployment.record.contracts.seasToken] // 10% admin fee, SEAS token
        });
        
        await this.publicClient.waitForTransactionReceipt({ hash });
        console.log(`   Global campaign fees updated for default fee campaigns only`);
        return true;
      } catch (error) {
        console.log(`   Error updating global campaign fees: ${error}`);
        return false;
      }
    });

    // Test 5: Update global project addition fees (only affects default fee campaigns)
    await this.runTest("Update Global Project Addition Fees (Default Only)", async () => {
      try {
        const hash = await this.adminWallet.writeContract({
          address: this.deployment.record.contracts.campaigns as `0x${string}`,
          abi: CAMPAIGNS_MODULE_ABI,
          functionName: 'updateGlobalProjectAdditionFees',
          args: [this.deployment.record.contracts.seasToken, parseEther("0.05")] // SEAS token, 0.05 SEAS
        });
        
        await this.publicClient.waitForTransactionReceipt({ hash });
        console.log(`   Global project addition fees updated for default fee campaigns only`);
        return true;
      } catch (error) {
        console.log(`   Error updating global project addition fees: ${error}`);
        return false;
      }
    });

    // Test 6: Test campaign-specific fee updates
    await this.runTest("Update Campaign-Specific Fees", async () => {
      try {
        // Get first campaign ID
        const campaignsData = await this.publicClient.readContract({
          address: this.deployment.record.contracts.campaigns as `0x${string}`,
          abi: CAMPAIGNS_MODULE_ABI,
          functionName: 'getActiveCampaigns'
        });
        
        if (campaignsData.length > 0) {
          const campaignId = campaignsData[0];
          
          // Update specific campaign fees
          const hash = await this.adminWallet.writeContract({
            address: this.deployment.record.contracts.campaigns as `0x${string}`,
            abi: CAMPAIGNS_MODULE_ABI,
            functionName: 'updateCampaignFees',
            args: [campaignId, 75, this.deployment.record.contracts.seasToken, parseEther("0.02"), parseEther("0.01")]
          });
          
          await this.publicClient.waitForTransactionReceipt({ hash });
          console.log(`   Campaign ${campaignId} fees updated successfully`);
          return true;
        } else {
          console.log(`   No active campaigns found to test`);
          return true; // Not a failure, just no campaigns to test
        }
      } catch (error) {
        console.log(`   Error updating campaign-specific fees: ${error}`);
        return false;
      }
    });
  }

  private async testProjectsFeeManagement() {
    console.log("\n🏗️ Testing Projects Module Fee Management");
    
    // Test 1: Get current project creation fee
    await this.runTest("Get Current Project Creation Fee", async () => {
      try {
        const currentFee = await this.publicClient.readContract({
          address: this.deployment.record.contracts.projects as `0x${string}`,
          abi: PROJECTS_MODULE_ABI,
          functionName: 'projectCreationFee'
        });
        
        console.log(`   Current project creation fee: ${formatEther(currentFee)} CELO`);
        return true;
      } catch (error) {
        console.log(`   Error getting project creation fee: ${error}`);
        return false;
      }
    });

    // Test 2: Set zero project creation fee
    await this.runTest("Set Zero Project Creation Fee", async () => {
      try {
        const hash = await this.adminWallet.writeContract({
          address: this.deployment.record.contracts.projects as `0x${string}`,
          abi: PROJECTS_MODULE_ABI,
          functionName: 'setZeroProjectCreationFeeForTesting'
        });
        
        await this.publicClient.waitForTransactionReceipt({ hash });
        console.log(`   Zero project creation fee set successfully`);
        return true;
      } catch (error) {
        console.log(`   Error setting zero project creation fee: ${error}`);
        return false;
      }
    });

    // Test 3: Verify zero fee
    await this.runTest("Verify Zero Project Creation Fee", async () => {
      try {
        const currentFee = await this.publicClient.readContract({
          address: this.deployment.record.contracts.projects as `0x${string}`,
          abi: PROJECTS_MODULE_ABI,
          functionName: 'projectCreationFee'
        });
        
        const isZero = currentFee === 0n;
        console.log(`   Project creation fee is zero: ${isZero}`);
        return isZero;
      } catch (error) {
        console.log(`   Error verifying zero project creation fee: ${error}`);
        return false;
      }
    });

    // Test 4: Set test project creation fee
    await this.runTest("Set Test Project Creation Fee", async () => {
      try {
        const hash = await this.adminWallet.writeContract({
          address: this.deployment.record.contracts.projects as `0x${string}`,
          abi: PROJECTS_MODULE_ABI,
          functionName: 'setTestProjectCreationFee'
        });
        
        await this.publicClient.waitForTransactionReceipt({ hash });
        console.log(`   Test project creation fee set successfully`);
        return true;
      } catch (error) {
        console.log(`   Error setting test project creation fee: ${error}`);
        return false;
      }
    });

    // Test 5: Verify test fee
    await this.runTest("Verify Test Project Creation Fee", async () => {
      try {
        const currentFee = await this.publicClient.readContract({
          address: this.deployment.record.contracts.projects as `0x${string}`,
          abi: PROJECTS_MODULE_ABI,
          functionName: 'projectCreationFee'
        });
        
        const testFeeAmount = parseEther("0.1");
        const isCorrect = currentFee === testFeeAmount;
        console.log(`   Project creation fee is correct: ${isCorrect} (${formatEther(currentFee)} CELO)`);
        return isCorrect;
      } catch (error) {
        console.log(`   Error verifying test project creation fee: ${error}`);
        return false;
      }
    });

    // Test 6: Toggle project creation fees off
    await this.runTest("Toggle Project Creation Fees Off", async () => {
      try {
        const hash = await this.adminWallet.writeContract({
          address: this.deployment.record.contracts.projects as `0x${string}`,
          abi: PROJECTS_MODULE_ABI,
          functionName: 'toggleProjectCreationFees',
          args: [false]
        });
        
        await this.publicClient.waitForTransactionReceipt({ hash });
        console.log(`   Project creation fees toggled off successfully`);
        return true;
      } catch (error) {
        console.log(`   Error toggling project creation fees: ${error}`);
        return false;
      }
    });

    // Test 7: Toggle project creation fees back on
    await this.runTest("Toggle Project Creation Fees On", async () => {
      try {
        const hash = await this.adminWallet.writeContract({
          address: this.deployment.record.contracts.projects as `0x${string}`,
          abi: PROJECTS_MODULE_ABI,
          functionName: 'toggleProjectCreationFees',
          args: [true]
        });
        
        await this.publicClient.waitForTransactionReceipt({ hash });
        console.log(`   Project creation fees toggled on successfully`);
        return true;
      } catch (error) {
        console.log(`   Error toggling project creation fees: ${error}`);
        return false;
      }
    });

    // Test 8: Update project creation fee amount
    await this.runTest("Update Project Creation Fee Amount", async () => {
      try {
        const newFee = parseEther("0.05"); // 0.05 CELO
        const hash = await this.adminWallet.writeContract({
          address: this.deployment.record.contracts.projects as `0x${string}`,
          abi: PROJECTS_MODULE_ABI,
          functionName: 'updateProjectCreationFee',
          args: [newFee]
        });
        
        await this.publicClient.waitForTransactionReceipt({ hash });
        console.log(`   Project creation fee updated to ${formatEther(newFee)} CELO`);
        return true;
      } catch (error) {
        console.log(`   Error updating project creation fee: ${error}`);
        return false;
      }
    });
  }

  private async testFeeCollection() {
    console.log("\n💸 Testing Fee Collection");
    
    // Test 1: Try to create a project with zero fees
    await this.runTest("Create Project with Zero Fees", async () => {
      try {
        const projectMetadata = {
          bio: "Test project for fee testing",
          contractInfo: "Test contract",
          additionalData: "Additional test data",
          tags: ["test", "fee-testing"],
          category: "testing",
          website: "https://test.com",
          github: "https://github.com/test",
          twitter: "@test",
          discord: "test#1234",
          websiteUrl: "https://test.com",
          socialMediaHandle: "@test"
        };

        const hash = await this.testUserWallet.writeContract({
          address: this.deployment.record.contracts.projects as `0x${string}`,
          abi: PROJECTS_MODULE_ABI,
          functionName: 'createProject',
          args: ["Fee Test Project", "Testing fee collection", projectMetadata, [], true],
          value: 0n // No fee required
        });
        
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
        console.log(`   Project created successfully with zero fees`);
        return true;
      } catch (error) {
        console.log(`   Error creating project with zero fees: ${error}`);
        return false;
      }
    });

    // Test 2: Try to create a project with fees enabled
    await this.runTest("Create Project with Fees Enabled", async () => {
      try {
        // First enable fees
        await this.adminWallet.writeContract({
          address: this.deployment.record.contracts.projects as `0x${string}`,
          abi: PROJECTS_MODULE_ABI,
          functionName: 'toggleProjectCreationFees',
          args: [true]
        });

        // Set fee to 0.1 CELO
        await this.adminWallet.writeContract({
          address: this.deployment.record.contracts.projects as `0x${string}`,
          abi: PROJECTS_MODULE_ABI,
          functionName: 'setTestProjectCreationFee'
        });

        const projectMetadata = {
          bio: "Test project with fees",
          contractInfo: "Test contract with fees",
          additionalData: "Additional test data with fees",
          tags: ["test", "fees-enabled"],
          category: "testing",
          website: "https://test.com",
          github: "https://github.com/test",
          twitter: "@test",
          discord: "test#1234",
          websiteUrl: "https://test.com",
          socialMediaHandle: "@test"
        };

        const hash = await this.testUserWallet.writeContract({
          address: this.deployment.record.contracts.projects as `0x${string}`,
          abi: PROJECTS_MODULE_ABI,
          functionName: 'createProject',
          args: ["Fee Enabled Project", "Testing fee collection with fees", projectMetadata, [], true],
          value: parseEther("0.1") // 0.1 CELO fee
        });
        
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
        console.log(`   Project created successfully with fees enabled`);
        return true;
      } catch (error) {
        console.log(`   Error creating project with fees: ${error}`);
        return false;
      }
    });
  }

  private async runAllTests() {
    console.log("🚀 Starting Fee Management Tests");
    
    await this.testTreasuryFeeManagement();
    await this.testCampaignsFeeManagement();
    await this.testProjectsFeeManagement();
    await this.testFeeCollection();
    
    this.printTestResults();
  }

  private printTestResults() {
    const duration = Date.now() - this.testStartTime;
    console.log("\n" + "=".repeat(60));
    console.log("📊 FEE MANAGEMENT TEST RESULTS");
    console.log("=".repeat(60));
    console.log(`Total Tests: ${this.totalTests}`);
    console.log(`Passed: ${this.passedTests} ✅`);
    console.log(`Failed: ${this.failedTests} ❌`);
    console.log(`Success Rate: ${((this.passedTests / this.totalTests) * 100).toFixed(2)}%`);
    console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log("=".repeat(60));
    
    if (this.failedTests === 0) {
      console.log("🎉 All fee management tests passed!");
      this.state.feesTested = true;
      this.state.zeroFeesTested = true;
      this.state.testFeesTested = true;
    } else {
      console.log("⚠️ Some tests failed. Check the logs above for details.");
    }
    
    saveState(this.config.network, this.state);
  }

  async run() {
    try {
      await this.initialize();
      await this.runAllTests();
    } catch (error) {
      console.error("❌ Test execution failed:", error);
    }
  }
}

// Main execution
async function main() {
  const config: FeeTestConfig = {
    network: process.env.NETWORK || "alfajores",
    rpcUrl: process.env.RPC_URL || "https://alfajores-forno.celo-testnet.org",
    adminPrivateKey: process.env.ADMIN_PRIVATE_KEY || "",
    testUserPrivateKey: process.env.TEST_USER_PRIVATE_KEY || ""
  };

  if (!config.adminPrivateKey || !config.testUserPrivateKey) {
    console.error("❌ ADMIN_PRIVATE_KEY and TEST_USER_PRIVATE_KEY environment variables are required");
    process.exit(1);
  }

  const test = new FeeManagementTest(config);
  await test.run();
}

if (require.main === module) {
  main().catch(console.error);
}

export { FeeManagementTest };
