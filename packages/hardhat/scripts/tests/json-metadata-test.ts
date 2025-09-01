import { createPublicClient, createWalletClient, http, parseEther, encodeFunctionData, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "viem/chains";
import * as fs from "fs";
import * as path from "path";
import { ensureDeployment, loadState, saveState, TestState } from "./state";

// Import ABIs from artifacts
const PROJECTS_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "v5", "modules", "ProjectsModule.sol", "ProjectsModule.json"), 
  "utf8"
)).abi;

const CAMPAIGNS_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "v5", "modules", "CampaignsModule.sol", "CampaignsModule.json"), 
  "utf8"
)).abi;

interface JsonMetadataTestConfig {
  network: string;
  rpcUrl: string;
  adminPrivateKey: string;
  testUserPrivateKey: string;
}

class JsonMetadataTest {
  private config: JsonMetadataTestConfig;
  private publicClient: any;
  private adminWallet: any;
  private testUserWallet: any;
  private state!: TestState;
  private deployment!: any;
  private testStartTime!: number;
  private totalTests = 0;
  private passedTests = 0;
  private failedTests = 0;

  constructor(config: JsonMetadataTestConfig) {
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
    console.log(`🚀 Initializing JSON Metadata Test on ${this.config.network}`);
    
    // Load deployment
    this.deployment = ensureDeployment(this.config.network);
    console.log(`📋 Using deployment: ${this.deployment.path}`);

    // Load or initialize state
    this.state = loadState(this.config.network) || {
      network: this.config.network,
      timestamp: new Date().toISOString(),
      completedSteps: [],
      jsonMetadataTested: false
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

  private async testProjectJsonMetadata() {
    console.log("\n🏗️ Testing Project JSON Metadata");
    
    // Test 1: Create project with JSON metadata
    await this.runTest("Create Project with JSON Metadata", async () => {
      try {
        const projectMetadata = {
          bio: "Test project for JSON metadata",
          contractInfo: "Test contract",
          additionalData: "Additional test data",
          jsonMetadata: JSON.stringify({
            tags: ["defi", "celo", "testing"],
            difficulty: "beginner",
            estimatedTime: "2-4 weeks",
            techStack: ["solidity", "react", "typescript"],
            teamSize: 3,
            fundingNeeded: "5000 CELO",
            milestones: [
              { name: "MVP", description: "Basic functionality", reward: "1000 CELO" },
              { name: "Beta", description: "User testing", reward: "2000 CELO" },
              { name: "Launch", description: "Production release", reward: "2000 CELO" }
            ],
            socialLinks: {
              github: "https://github.com/test",
              twitter: "@testproject",
              discord: "test#1234"
            }
          }),
          category: "defi",
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
          args: ["JSON Metadata Project", "Testing JSON metadata functionality", projectMetadata, [], true],
          value: 0n // Assuming zero fees for testing
        });
        
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
        console.log(`   Project created successfully with JSON metadata`);
        return true;
      } catch (error) {
        console.log(`   Error creating project with JSON metadata: ${error}`);
        return false;
      }
    });

    // Test 2: Get project JSON metadata
    await this.runTest("Get Project JSON Metadata", async () => {
      try {
        const projectsData = await this.publicClient.readContract({
          address: this.deployment.record.contracts.projects as `0x${string}`,
          abi: PROJECTS_MODULE_ABI,
          functionName: 'getAllProjectIds'
        });
        
        if (projectsData.length > 0) {
          const projectId = projectsData[projectsData.length - 1]; // Get the latest project
          
          const jsonMetadata = await this.publicClient.readContract({
            address: this.deployment.record.contracts.projects as `0x${string}`,
            abi: PROJECTS_MODULE_ABI,
            functionName: 'getProjectJsonMetadata',
            args: [projectId]
          });
          
          if (bytes(jsonMetadata).length > 0) {
            console.log(`   Project ${projectId} JSON metadata retrieved: ${jsonMetadata.substring(0, 100)}...`);
            return true;
          } else {
            console.log(`   Project ${projectId} has no JSON metadata`);
            return false;
          }
        } else {
          console.log(`   No projects found to test`);
          return true; // Not a failure, just no projects to test
        }
      } catch (error) {
        console.log(`   Error getting project JSON metadata: ${error}`);
        return false;
      }
    });

    // Test 3: Search projects by JSON metadata
    await this.runTest("Search Projects by JSON Metadata", async () => {
      try {
        const searchResults = await this.publicClient.readContract({
          address: this.deployment.record.contracts.projects as `0x${string}`,
          abi: PROJECTS_MODULE_ABI,
          functionName: 'searchProjectsByJsonMetadata',
          args: ["defi"]
        });
        
        console.log(`   Found ${searchResults.length} projects with "defi" in JSON metadata`);
        return searchResults.length > 0;
      } catch (error) {
        console.log(`   Error searching projects by JSON metadata: ${error}`);
        return false;
      }
    });

    // Test 4: Get projects by metadata field value
    await this.runTest("Get Projects by Metadata Field Value", async () => {
      try {
        const fieldResults = await this.publicClient.readContract({
          address: this.deployment.record.contracts.projects as `0x${string}`,
          abi: PROJECTS_MODULE_ABI,
          functionName: 'getProjectsByMetadataField',
          args: ["difficulty", "beginner"]
        });
        
        console.log(`   Found ${fieldResults.length} projects with difficulty:beginner`);
        return fieldResults.length > 0;
      } catch (error) {
        console.log(`   Error getting projects by metadata field: ${error}`);
        return false;
      }
    });

    // Test 5: Validate JSON metadata
    await this.runTest("Validate JSON Metadata", async () => {
      try {
        const validJson = '{"name":"test","value":123}';
        const invalidJson = '{"name":"test","value":123'; // Missing closing brace
        
        const isValid1 = await this.publicClient.readContract({
          address: this.deployment.record.contracts.projects as `0x${string}`,
          abi: PROJECTS_MODULE_ABI,
          functionName: 'validateJsonMetadata',
          args: [validJson]
        });
        
        const isValid2 = await this.publicClient.readContract({
          address: this.deployment.record.contracts.projects as `0x${string}`,
          abi: PROJECTS_MODULE_ABI,
          functionName: 'validateJsonMetadata',
          args: [invalidJson]
        });
        
        console.log(`   Valid JSON validation: ${isValid1}, Invalid JSON validation: ${isValid2}`);
        return isValid1 && !isValid2;
      } catch (error) {
        console.log(`   Error validating JSON metadata: ${error}`);
        return false;
      }
    });
  }

  private async testCampaignJsonMetadata() {
    console.log("\n🎯 Testing Campaign JSON Metadata");
    
    // Test 1: Create campaign with JSON metadata
    await this.runTest("Create Campaign with JSON Metadata", async () => {
      try {
        const campaignMetadata = {
          mainInfo: "Test campaign for JSON metadata",
          additionalInfo: "Additional campaign information",
          jsonMetadata: JSON.stringify({
            tags: ["defi", "celo", "campaign"],
            targetAudience: "developers",
            maxParticipants: 100,
            rewardStructure: {
              firstPlace: "1000 CELO",
              secondPlace: "500 CELO",
              thirdPlace: "250 CELO"
            },
            requirements: [
              "Must be a verified project",
              "Must have working prototype",
              "Must provide documentation"
            ],
            timeline: {
              startDate: "2024-01-01",
              endDate: "2024-03-01",
              votingPeriod: "2 weeks"
            },
            categories: ["defi", "nft", "gaming"],
            socialMedia: {
              twitter: "@testcampaign",
              discord: "testcampaign#1234",
              telegram: "@testcampaign"
            }
          }),
          category: "defi",
          website: "https://campaign.test.com",
          logo: "https://logo.test.com",
          banner: "https://banner.test.com",
          socialLinks: ["https://twitter.com/testcampaign"],
          websiteUrl: "https://campaign.test.com",
          socialMediaHandle: "@testcampaign"
        };

        const hash = await this.adminWallet.writeContract({
          address: this.deployment.record.contracts.campaigns as `0x${string}`,
          abi: CAMPAIGNS_MODULE_ABI,
          functionName: 'createCampaign',
          args: [
            "JSON Metadata Campaign",
            "Testing JSON metadata functionality for campaigns",
            campaignMetadata,
            Math.floor(Date.now() / 1000) + 86400, // Start in 1 day
            Math.floor(Date.now() / 1000) + 2592000, // End in 30 days
            50, // 5% admin fee
            10, // Max 10 winners
            0, // Proportional distribution
            "",
            this.deployment.record.contracts.seasToken // SEAS token
          ]
        });
        
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
        console.log(`   Campaign created successfully with JSON metadata`);
        return true;
      } catch (error) {
        console.log(`   Error creating campaign with JSON metadata: ${error}`);
        return false;
      }
    });

    // Test 2: Get campaign JSON metadata
    await this.runTest("Get Campaign JSON Metadata", async () => {
      try {
        const campaignsData = await this.publicClient.readContract({
          address: this.deployment.record.contracts.campaigns as `0x${string}`,
          abi: CAMPAIGNS_MODULE_ABI,
          functionName: 'getActiveCampaigns'
        });
        
        if (campaignsData.length > 0) {
          const campaignId = campaignsData[0];
          
          const jsonMetadata = await this.publicClient.readContract({
            address: this.deployment.record.contracts.campaigns as `0x${string}`,
            abi: CAMPAIGNS_MODULE_ABI,
            functionName: 'getCampaignJsonMetadata',
            args: [campaignId]
          });
          
          if (bytes(jsonMetadata).length > 0) {
            console.log(`   Campaign ${campaignId} JSON metadata retrieved: ${jsonMetadata.substring(0, 100)}...`);
            return true;
          } else {
            console.log(`   Campaign ${campaignId} has no JSON metadata`);
            return false;
          }
        } else {
          console.log(`   No active campaigns found to test`);
          return true; // Not a failure, just no campaigns to test
        }
      } catch (error) {
        console.log(`   Error getting campaign JSON metadata: ${error}`);
        return false;
      }
    });

    // Test 3: Search campaigns by JSON metadata
    await this.runTest("Search Campaigns by JSON Metadata", async () => {
      try {
        const searchResults = await this.publicClient.readContract({
          address: this.deployment.record.contracts.campaigns as `0x${string}`,
          abi: CAMPAIGNS_MODULE_ABI,
          functionName: 'searchCampaignsByJsonMetadata',
          args: ["defi"]
        });
        
        console.log(`   Found ${searchResults.length} campaigns with "defi" in JSON metadata`);
        return searchResults.length > 0;
      } catch (error) {
        console.log(`   Error searching campaigns by JSON metadata: ${error}`);
        return false;
      }
    });

    // Test 4: Get campaigns by metadata field value
    await this.runTest("Get Campaigns by Metadata Field Value", async () => {
      try {
        const fieldResults = await this.publicClient.readContract({
          address: this.deployment.record.contracts.campaigns as `0x${string}`,
          abi: CAMPAIGNS_MODULE_ABI,
          functionName: 'getCampaignsByMetadataField',
          args: ["targetAudience", "developers"]
        });
        
        console.log(`   Found ${fieldResults.length} campaigns with targetAudience:developers`);
        return fieldResults.length > 0;
      } catch (error) {
        console.log(`   Error getting campaigns by metadata field: ${error}`);
        return false;
      }
    });

    // Test 5: Update campaign JSON metadata
    await this.runTest("Update Campaign JSON Metadata", async () => {
      try {
        const campaignsData = await this.publicClient.readContract({
          address: this.deployment.record.contracts.campaigns as `0x${string}`,
          abi: CAMPAIGNS_MODULE_ABI,
          functionName: 'getActiveCampaigns'
        });
        
        if (campaignsData.length > 0) {
          const campaignId = campaignsData[0];
          
          const updatedMetadata = JSON.stringify({
            tags: ["defi", "celo", "campaign", "updated"],
            targetAudience: "developers",
            maxParticipants: 150, // Updated value
            rewardStructure: {
              firstPlace: "1500 CELO", // Updated value
              secondPlace: "750 CELO", // Updated value
              thirdPlace: "375 CELO"   // Updated value
            },
            requirements: [
              "Must be a verified project",
              "Must have working prototype",
              "Must provide documentation",
              "Must have community support" // New requirement
            ],
            timeline: {
              startDate: "2024-01-01",
              endDate: "2024-03-01",
              votingPeriod: "3 weeks" // Updated value
            },
            categories: ["defi", "nft", "gaming", "dao"], // Added DAO
            socialMedia: {
              twitter: "@testcampaign",
              discord: "testcampaign#1234",
              telegram: "@testcampaign",
              github: "github.com/testcampaign" // New social media
            }
          });
          
          const hash = await this.adminWallet.writeContract({
            address: this.deployment.record.contracts.campaigns as `0x${string}`,
            abi: CAMPAIGNS_MODULE_ABI,
            functionName: 'updateCampaignJsonMetadata',
            args: [campaignId, updatedMetadata]
          });
          
          await this.publicClient.waitForTransactionReceipt({ hash });
          console.log(`   Campaign ${campaignId} JSON metadata updated successfully`);
          return true;
        } else {
          console.log(`   No active campaigns found to test update`);
          return true; // Not a failure, just no campaigns to test
        }
      } catch (error) {
        console.log(`   Error updating campaign JSON metadata: ${error}`);
        return false;
      }
    });
  }

  private async runAllTests() {
    console.log("🚀 Starting JSON Metadata Tests");
    
    await this.testProjectJsonMetadata();
    await this.testCampaignJsonMetadata();
    
    this.printTestResults();
  }

  private printTestResults() {
    const duration = Date.now() - this.testStartTime;
    console.log("\n" + "=".repeat(60));
    console.log("📊 JSON METADATA TEST RESULTS");
    console.log("=".repeat(60));
    console.log(`Total Tests: ${this.totalTests}`);
    console.log(`Passed: ${this.passedTests} ✅`);
    console.log(`Failed: ${this.failedTests} ❌`);
    console.log(`Success Rate: ${((this.passedTests / this.totalTests) * 100).toFixed(2)}%`);
    console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log("=".repeat(60));
    
    if (this.failedTests === 0) {
      console.log("🎉 All JSON metadata tests passed!");
      this.state.jsonMetadataTested = true;
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
  const config: JsonMetadataTestConfig = {
    network: process.env.NETWORK || "alfajores",
    rpcUrl: process.env.RPC_URL || "https://alfajores-forno.celo-testnet.org",
    adminPrivateKey: process.env.ADMIN_PRIVATE_KEY || "",
    testUserPrivateKey: process.env.TEST_USER_PRIVATE_KEY || ""
  };

  if (!config.adminPrivateKey || !config.testUserPrivateKey) {
    console.error("❌ ADMIN_PRIVATE_KEY and TEST_USER_PRIVATE_KEY environment variables are required");
    process.exit(1);
  }

  const test = new JsonMetadataTest(config);
  await test.run();
}

if (require.main === module) {
  main().catch(console.error);
}

export { JsonMetadataTest };
