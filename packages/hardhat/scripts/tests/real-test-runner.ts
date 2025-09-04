#!/usr/bin/env ts-node

import { createPublicClient, createWalletClient, http, parseEther, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "viem/chains";
import * as fs from "fs";
import * as path from "path";
import { TestingTrackerManager } from "./testing-tracker-utils";

interface RealTestConfig {
  network: string;
  rpcUrl: string;
  testMode: 'basic' | 'comprehensive' | 'module' | 'scenario';
  targetModule?: string;
  targetScenario?: string;
  freshStart?: boolean;
}

interface TestState {
  network: string;
  timestamp: string;
  createdProjects: Array<{
    id: string;
    name: string;
    owner: string;
    txHash: string;
  }>;
  createdCampaigns: Array<{
    id: string;
    name: string;
    type: 'CELO' | 'ERC20';
    admin: string;
    txHash: string;
  }>;
  testResults: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
  };
}

class RealTestRunner {
  private config: RealTestConfig;
  private publicClient: any;
  private walletClients: any[] = [];
  private tracker: TestingTrackerManager;
  private testStartTime: number = 0;
  private deployment: any;
  private state!: TestState;
  private statePath: string;

  constructor(config: RealTestConfig) {
    this.config = config;
    this.publicClient = createPublicClient({ 
      chain: celoAlfajores, 
      transport: http(config.rpcUrl) 
    });
    this.tracker = new TestingTrackerManager(config.network);
    this.statePath = path.join(__dirname, "..", "..", "test-state", `${config.network}-real-tests.json`);
  }

  private async initialize() {
    console.log(`🚀 Starting REAL Tests on ${this.config.network}`);
    console.log(`📊 Test Mode: ${this.config.testMode}`);
    console.log(`🔄 Fresh Start: ${this.config.freshStart ? 'YES' : 'NO'}`);
    
    this.testStartTime = Date.now();
    
    // Load deployment
    const deploymentPath = path.join(__dirname, "..", "..", "deployments", this.config.network, "latest.json");
    if (!fs.existsSync(deploymentPath)) {
      throw new Error(`❌ Deployment file missing: ${deploymentPath}`);
    }
    
    this.deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    console.log(`📋 Loaded deployment: ${this.deployment.contracts.sovereignSeasV5}`);
    
    // Load or create test state
    this.state = this.loadTestState();
    
    // Load wallets
    const walletsPath = path.join(__dirname, "..", "..", "wallets", `${this.config.network}-wallets.json`);
    if (!fs.existsSync(walletsPath)) {
      throw new Error(`❌ Wallet file missing: ${walletsPath}. Run 'pnpm run test:gen-wallets' first.`);
    }
    
    const walletsData = JSON.parse(fs.readFileSync(walletsPath, "utf8"));
    this.walletClients = walletsData.wallets.map((wallet: any) => 
      createWalletClient({
        account: privateKeyToAccount(wallet.privateKey as `0x${string}`),
        chain: celoAlfajores,
        transport: http(this.config.rpcUrl)
      })
    );
    
    console.log(`👛 Loaded ${this.walletClients.length} test wallets`);
    console.log(`📊 Current state: ${this.state.createdProjects.length} projects, ${this.state.createdCampaigns.length} campaigns`);
    
    if (this.config.freshStart) {
      console.log(`🔄 Starting fresh - clearing previous state`);
      this.state = this.createFreshState();
    }
  }

  private loadTestState(): TestState {
    try {
      if (fs.existsSync(this.statePath)) {
        return JSON.parse(fs.readFileSync(this.statePath, "utf8"));
      }
    } catch (error) {
      console.warn("⚠️ Could not load test state, creating fresh state");
    }
    return this.createFreshState();
  }

  private createFreshState(): TestState {
    return {
      network: this.config.network,
      timestamp: new Date().toISOString(),
      createdProjects: [],
      createdCampaigns: [],
      testResults: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0
      }
    };
  }

  private saveTestState() {
    const stateDir = path.dirname(this.statePath);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
    fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
  }

  private async runBasicTests() {
    console.log(`\n🔧 Running REAL Basic Functionality Tests`);
    
    // Test 1: System Status Check
    const testTimestamp1 = this.tracker.startFunctionTest('sovereignSeasV5', 'isPaused', 'System Status Check', 'Check if system is paused');
    
    try {
      const isPaused = await this.publicClient.readContract({
        address: this.deployment.contracts.sovereignSeasV5 as `0x${string}`,
        abi: [{
          "inputs": [],
          "name": "isPaused",
          "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
          "stateMutability": "view",
          "type": "function"
        }],
        functionName: 'isPaused'
      });
      
      this.tracker.completeFunctionTest('sovereignSeasV5', 'isPaused', testTimestamp1, "passed", 100, 0);
      this.state.testResults.passedTests++;
      console.log(`✅ System paused status: ${isPaused}`);
      
    } catch (error) {
      this.tracker.completeFunctionTest('sovereignSeasV5', 'isPaused', testTimestamp1, "failed", 100, 0, error.message);
      this.state.testResults.failedTests++;
      console.log(`❌ System status check failed: ${error.message}`);
    }
    this.state.testResults.totalTests++;

    // Test 2: Module Registration Check
    const testTimestamp2 = this.tracker.startFunctionTest('sovereignSeasV5', 'getRegisteredModules', 'Module Registration Check', 'Get list of registered modules');
    
    try {
      const modules = await this.publicClient.readContract({
        address: this.deployment.contracts.sovereignSeasV5 as `0x${string}`,
        abi: [{
          "inputs": [],
          "name": "getRegisteredModules",
          "outputs": [{"internalType": "string[]", "name": "", "type": "string[]"}],
          "stateMutability": "view",
          "type": "function"
        }],
        functionName: 'getRegisteredModules'
      });
      
      this.tracker.completeFunctionTest('sovereignSeasV5', 'getRegisteredModules', testTimestamp2, "passed", 150, 0);
      this.state.testResults.passedTests++;
      console.log(`✅ Registered modules: ${modules.join(', ')}`);
      
    } catch (error) {
      this.tracker.completeFunctionTest('sovereignSeasV5', 'getRegisteredModules', testTimestamp2, "failed", 150, 0, error.message);
      this.state.testResults.failedTests++;
      console.log(`❌ Module registration check failed: ${error.message}`);
    }
    this.state.testResults.totalTests++;

    // Test 3: Check if modules are registered
    const testTimestamp3 = this.tracker.startFunctionTest('sovereignSeasV5', 'isModuleRegistered', 'Module Registration Verification', 'Check if specific modules are registered');
    
    try {
      const expectedModules = ['projects', 'campaigns', 'voting', 'treasury', 'pools', 'migration'];
      let allRegistered = true;
      
      for (const moduleName of expectedModules) {
        const isRegistered = await this.publicClient.readContract({
          address: this.deployment.contracts.sovereignSeasV5 as `0x${string}`,
          abi: [{
            "inputs": [{"internalType": "string", "name": "moduleName", "type": "string"}],
            "name": "isModuleRegistered",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
          }],
          functionName: 'isModuleRegistered',
          args: [moduleName]
        });
        
        if (!isRegistered) {
          allRegistered = false;
          console.log(`⚠️ Module ${moduleName} is not registered`);
        } else {
          console.log(`✅ Module ${moduleName} is registered`);
        }
      }
      
      this.tracker.completeFunctionTest('sovereignSeasV5', 'isModuleRegistered', testTimestamp3, allRegistered ? "passed" : "failed", 200, 0);
      if (allRegistered) {
        this.state.testResults.passedTests++;
      } else {
        this.state.testResults.failedTests++;
      }
      
    } catch (error) {
      this.tracker.completeFunctionTest('sovereignSeasV5', 'isModuleRegistered', testTimestamp3, "failed", 200, 0, error.message);
      this.state.testResults.failedTests++;
      console.log(`❌ Module registration verification failed: ${error.message}`);
    }
    this.state.testResults.totalTests++;
  }

  private async runProjectCreationTests() {
    console.log(`\n🔧 Running REAL Project Creation Tests`);
    
    const testTimestamp = this.tracker.startFunctionTest('projects', 'createProject', 'Project Creation Test', 'Create real projects and track their IDs');
    
    try {
      const projectNames = [
        "Ocean Cleanup Initiative",
        "Solar Community Grid", 
        "Digital Education Platform",
        "Sustainable Farming Hub",
        "Medical Research DAO",
        "Climate Data Analytics"
      ];

      for (let i = 0; i < Math.min(projectNames.length, this.walletClients.length); i++) {
        const wallet = this.walletClients[i];
        const projectName = projectNames[i];
        
        console.log(`📝 Creating project "${projectName}" using wallet ${i + 1}`);
        
        // Create project metadata
        const projectMetadata = {
          name: projectName,
          description: `A comprehensive ${projectName.toLowerCase()} project`,
          category: "Environment",
          tags: ["sustainability", "innovation"],
          website: `https://${projectName.toLowerCase().replace(/\s+/g, '')}.org`,
          imageUrl: `https://example.com/images/${projectName.toLowerCase().replace(/\s+/g, '')}.jpg`
        };

        // Encode the function call
        const functionData = encodeFunctionData({
          abi: [{
            "inputs": [
              {"internalType": "string", "name": "name", "type": "string"},
              {"internalType": "string", "name": "description", "type": "string"},
              {"internalType": "string", "name": "category", "type": "string"},
              {"internalType": "string[]", "name": "tags", "type": "string[]"},
              {"internalType": "string", "name": "website", "type": "string"},
              {"internalType": "string", "name": "imageUrl", "type": "string"}
            ],
            "name": "createProject",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "nonpayable",
            "type": "function"
          }],
          functionName: 'createProject',
          args: [
            projectMetadata.name,
            projectMetadata.description,
            projectMetadata.category,
            projectMetadata.tags,
            projectMetadata.website,
            projectMetadata.imageUrl
          ]
        });

        // Call through proxy
        const txHash = await wallet.writeContract({
          address: this.deployment.contracts.sovereignSeasV5 as `0x${string}`,
          abi: [{
            "inputs": [
              {"internalType": "string", "name": "moduleName", "type": "string"},
              {"internalType": "bytes", "name": "data", "type": "bytes"}
            ],
            "name": "callModule",
            "outputs": [{"internalType": "bytes", "name": "", "type": "bytes"}],
            "stateMutability": "nonpayable",
            "type": "function"
          }],
          functionName: 'callModule',
          args: ['projects', functionData]
        });

        // Wait for transaction to be mined
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });
        
        if (receipt.status === 'success') {
          // Decode the result to get project ID
          const projectId = BigInt(receipt.logs[0].data);
          
          // Track the created project
          this.state.createdProjects.push({
            id: projectId.toString(),
            name: projectName,
            owner: wallet.account.address,
            txHash: txHash
          });
          
          console.log(`✅ Project "${projectName}" created with ID: ${projectId}`);
        } else {
          throw new Error(`Transaction failed: ${txHash}`);
        }
      }
      
      this.tracker.completeFunctionTest('projects', 'createProject', testTimestamp, "passed", 5000, 0);
      this.state.testResults.passedTests++;
      console.log(`✅ Created ${this.state.createdProjects.length} projects successfully`);
      
    } catch (error) {
      this.tracker.completeFunctionTest('projects', 'createProject', testTimestamp, "failed", 5000, 0, error.message);
      this.state.testResults.failedTests++;
      console.log(`❌ Project creation failed: ${error.message}`);
    }
    this.state.testResults.totalTests++;
  }

  private async runCampaignCreationTests() {
    console.log(`\n🔧 Running REAL Campaign Creation Tests`);
    
    // Test CELO Campaign
    const testTimestamp1 = this.tracker.startFunctionTest('campaigns', 'createCampaign', 'CELO Campaign Creation', 'Create a real CELO campaign');
    
    try {
      const wallet = this.walletClients[0];
      
      console.log(`📝 Creating CELO campaign using wallet 1`);
      
      const campaignData = {
        name: "Community Development Fund",
        description: "A fund for community development projects",
        targetAmount: parseEther("1000"), // 1000 CELO
        duration: BigInt(30 * 24 * 60 * 60), // 30 days in seconds
        category: "Community",
        tags: ["development", "community"]
      };

      const functionData = encodeFunctionData({
        abi: [{
          "inputs": [
            {"internalType": "string", "name": "name", "type": "string"},
            {"internalType": "string", "name": "description", "type": "string"},
            {"internalType": "uint256", "name": "targetAmount", "type": "uint256"},
            {"internalType": "uint256", "name": "duration", "type": "uint256"},
            {"internalType": "string", "name": "category", "type": "string"},
            {"internalType": "string[]", "name": "tags", "type": "string[]"}
          ],
          "name": "createCampaign",
          "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
          "stateMutability": "nonpayable",
          "type": "function"
        }],
        functionName: 'createCampaign',
        args: [
          campaignData.name,
          campaignData.description,
          campaignData.targetAmount,
          campaignData.duration,
          campaignData.category,
          campaignData.tags
        ]
      });

      const txHash = await wallet.writeContract({
        address: this.deployment.contracts.sovereignSeasV5 as `0x${string}`,
        abi: [{
          "inputs": [
            {"internalType": "string", "name": "moduleName", "type": "string"},
            {"internalType": "bytes", "name": "data", "type": "bytes"}
          ],
          "name": "callModule",
          "outputs": [{"internalType": "bytes", "name": "", "type": "bytes"}],
          "stateMutability": "nonpayable",
          "type": "function"
        }],
        functionName: 'callModule',
        args: ['campaigns', functionData]
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });
      
      if (receipt.status === 'success') {
        const campaignId = BigInt(receipt.logs[0].data);
        
        this.state.createdCampaigns.push({
          id: campaignId.toString(),
          name: campaignData.name,
          type: 'CELO',
          admin: wallet.account.address,
          txHash: txHash
        });
        
        console.log(`✅ CELO campaign "${campaignData.name}" created with ID: ${campaignId}`);
        this.tracker.completeFunctionTest('campaigns', 'createCampaign', testTimestamp1, "passed", 3000, 0);
        this.state.testResults.passedTests++;
      } else {
        throw new Error(`Transaction failed: ${txHash}`);
      }
      
    } catch (error) {
      this.tracker.completeFunctionTest('campaigns', 'createCampaign', testTimestamp1, "failed", 3000, 0, error.message);
      this.state.testResults.failedTests++;
      console.log(`❌ CELO campaign creation failed: ${error.message}`);
    }
    this.state.testResults.totalTests++;

    // Test ERC20 Campaign
    const testTimestamp2 = this.tracker.startFunctionTest('campaigns', 'createERC20Campaign', 'SEAS Campaign Creation', 'Create a real SEAS token campaign');
    
    try {
      const wallet = this.walletClients[1];
      
      console.log(`📝 Creating SEAS campaign using wallet 2`);
      
      const campaignData = {
        name: "SEAS Innovation Fund",
        description: "A fund for innovative projects using SEAS tokens",
        tokenAddress: this.deployment.contracts.seasToken,
        targetAmount: parseEther("50000"), // 50,000 SEAS
        duration: BigInt(45 * 24 * 60 * 60), // 45 days in seconds
        category: "Innovation",
        tags: ["innovation", "seas", "token"]
      };

      const functionData = encodeFunctionData({
        abi: [{
          "inputs": [
            {"internalType": "string", "name": "name", "type": "string"},
            {"internalType": "string", "name": "description", "type": "string"},
            {"internalType": "address", "name": "tokenAddress", "type": "address"},
            {"internalType": "uint256", "name": "targetAmount", "type": "uint256"},
            {"internalType": "uint256", "name": "duration", "type": "uint256"},
            {"internalType": "string", "name": "category", "type": "string"},
            {"internalType": "string[]", "name": "tags", "type": "string[]"}
          ],
          "name": "createERC20Campaign",
          "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
          "stateMutability": "nonpayable",
          "type": "function"
        }],
        functionName: 'createERC20Campaign',
        args: [
          campaignData.name,
          campaignData.description,
          campaignData.tokenAddress,
          campaignData.targetAmount,
          campaignData.duration,
          campaignData.category,
          campaignData.tags
        ]
      });

      const txHash = await wallet.writeContract({
        address: this.deployment.contracts.sovereignSeasV5 as `0x${string}`,
        abi: [{
          "inputs": [
            {"internalType": "string", "name": "moduleName", "type": "string"},
            {"internalType": "bytes", "name": "data", "type": "bytes"}
          ],
          "name": "callModule",
          "outputs": [{"internalType": "bytes", "name": "", "type": "bytes"}],
          "stateMutability": "nonpayable",
          "type": "function"
        }],
        functionName: 'callModule',
        args: ['campaigns', functionData]
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });
      
      if (receipt.status === 'success') {
        const campaignId = BigInt(receipt.logs[0].data);
        
        this.state.createdCampaigns.push({
          id: campaignId.toString(),
          name: campaignData.name,
          type: 'ERC20',
          admin: wallet.account.address,
          txHash: txHash
        });
        
        console.log(`✅ SEAS campaign "${campaignData.name}" created with ID: ${campaignId}`);
        this.tracker.completeFunctionTest('campaigns', 'createERC20Campaign', testTimestamp2, "passed", 4000, 0);
        this.state.testResults.passedTests++;
      } else {
        throw new Error(`Transaction failed: ${txHash}`);
      }
      
    } catch (error) {
      this.tracker.completeFunctionTest('campaigns', 'createERC20Campaign', testTimestamp2, "failed", 4000, 0, error.message);
      this.state.testResults.failedTests++;
      console.log(`❌ SEAS campaign creation failed: ${error.message}`);
    }
    this.state.testResults.totalTests++;
  }

  private async runComprehensiveTests() {
    console.log(`\n🔧 Running REAL Comprehensive Tests`);
    
    // Run basic tests first
    await this.runBasicTests();
    
    // Run project creation tests
    await this.runProjectCreationTests();
    
    // Run campaign creation tests
    await this.runCampaignCreationTests();
    
    // Save state after each major test
    this.saveTestState();
  }

  private printResults() {
    const executionTime = Date.now() - this.testStartTime;
    console.log(`\n📊 REAL Test Results Summary`);
    console.log(`⏱️  Total Execution Time: ${executionTime}ms`);
    
    console.log(`📈 Test Statistics:`);
    console.log(`   Total Tests: ${this.state.testResults.totalTests}`);
    console.log(`   Passed: ${this.state.testResults.passedTests}`);
    console.log(`   Failed: ${this.state.testResults.failedTests}`);
    console.log(`   Skipped: ${this.state.testResults.skippedTests}`);
    
    console.log(`\n📋 Created Resources:`);
    console.log(`   Projects: ${this.state.createdProjects.length}`);
    for (const project of this.state.createdProjects) {
      console.log(`     - ${project.name} (ID: ${project.id})`);
    }
    
    console.log(`   Campaigns: ${this.state.createdCampaigns.length}`);
    for (const campaign of this.state.createdCampaigns) {
      console.log(`     - ${campaign.name} (ID: ${campaign.id}, Type: ${campaign.type})`);
    }
  }

  async run() {
    try {
      await this.initialize();
      
      switch (this.config.testMode) {
        case 'basic':
          await this.runBasicTests();
          break;
        case 'comprehensive':
          await this.runComprehensiveTests();
          break;
        default:
          throw new Error(`Test mode ${this.config.testMode} not implemented yet`);
      }
      
      // Save final state
      this.saveTestState();
      
      this.printResults();
      console.log(`\n🎉 REAL tests completed successfully!`);
      console.log(`💾 Test state saved to: ${this.statePath}`);
      
    } catch (error) {
      console.error(`❌ Test execution failed: ${error.message}`);
      this.saveTestState(); // Save state even on failure
      process.exit(1);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🚀 REAL Test Runner for SovereignSeas V5

This runner actually executes blockchain transactions and tracks real state!

Usage:
  ts-node real-test-runner.ts <network> <mode> [--fresh]

Modes:
  basic          - Run basic functionality tests (read-only)
  comprehensive  - Run comprehensive tests (creates real projects and campaigns)

Options:
  --fresh        - Start completely fresh (clears previous state)

Examples:
  ts-node real-test-runner.ts alfajores basic
  ts-node real-test-runner.ts alfajores comprehensive
  ts-node real-test-runner.ts alfajores comprehensive --fresh

⚠️  WARNING: Comprehensive tests will create real projects and campaigns on the blockchain!
    `);
    process.exit(0);
  }

  const network = args[0] || 'alfajores';
  const mode = args[1] || 'basic';
  const freshStart = args.includes('--fresh');
  
  const rpcUrl = network === 'alfajores' 
    ? 'https://alfajores-forno.celo-testnet.org'
    : 'https://forno.celo.org';

  const config: RealTestConfig = {
    network,
    rpcUrl,
    testMode: mode as any,
    freshStart
  };

  const runner = new RealTestRunner(config);
  await runner.run();
}

if (require.main === module) {
  main().catch(console.error);
}
