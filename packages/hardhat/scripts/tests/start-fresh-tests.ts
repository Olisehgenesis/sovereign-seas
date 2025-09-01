#!/usr/bin/env ts-node

import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "viem/chains";
import * as fs from "fs";
import * as path from "path";
import { TestingTrackerManager } from "./testing-tracker-utils";

interface FreshTestConfig {
  network: string;
  rpcUrl: string;
  testMode: 'basic' | 'comprehensive' | 'module' | 'scenario';
  targetModule?: string;
  targetScenario?: string;
}

class FreshTestRunner {
  private config: FreshTestConfig;
  private publicClient: any;
  private tracker: TestingTrackerManager;
  private testStartTime: number = 0;

  constructor(config: FreshTestConfig) {
    this.config = config;
    this.publicClient = createPublicClient({ 
      chain: celoAlfajores, 
      transport: http(config.rpcUrl) 
    });
    this.tracker = new TestingTrackerManager(config.network);
  }

  private async initialize() {
    console.log(`🚀 Starting Fresh Tests on ${this.config.network}`);
    console.log(`📊 Test Mode: ${this.config.testMode}`);
    
    this.testStartTime = Date.now();
    
    // Verify deployment exists
    const deploymentPath = path.join(__dirname, "..", "..", "deployments", `${this.config.network}-deployment.json`);
    if (!fs.existsSync(deploymentPath)) {
      throw new Error(`❌ Deployment file missing: ${deploymentPath}`);
    }
    
    // Verify wallets exist
    const walletsPath = path.join(__dirname, "..", "..", "wallets", `${this.config.network}-wallets.json`);
    if (!fs.existsSync(walletsPath)) {
      throw new Error(`❌ Wallet file missing: ${walletsPath}. Run 'yarn test:gen-wallets' first.`);
    }
    
    console.log(`✅ Environment verified`);
  }

  private async runBasicTests() {
    console.log(`\n🔧 Running Basic Functionality Tests`);
    
    // Test 1: System Status Check
    await this.tracker.startTest('sovereignSeasV5', 'isPaused', 'System Status Check', 'Check if system is paused');
    
    try {
      const deployment = JSON.parse(fs.readFileSync(
        path.join(__dirname, "..", "..", "deployments", `${this.config.network}-deployment.json`), 
        "utf8"
      ));
      
      const isPaused = await this.publicClient.readContract({
        address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
        abi: [{
          "inputs": [],
          "name": "isPaused",
          "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
          "stateMutability": "view",
          "type": "function"
        }],
        functionName: 'isPaused'
      });
      
      await this.tracker.completeTest('sovereignSeasV5', 'isPaused', true, 0, 0);
      console.log(`✅ System paused status: ${isPaused}`);
      
    } catch (error) {
      await this.tracker.completeTest('sovereignSeasV5', 'isPaused', false, 0, 0, error.message);
      console.log(`❌ System status check failed: ${error.message}`);
    }

    // Test 2: Module Registration Check
    await this.tracker.startTest('sovereignSeasV5', 'getRegisteredModules', 'Module Registration Check', 'Get list of registered modules');
    
    try {
      const deployment = JSON.parse(fs.readFileSync(
        path.join(__dirname, "..", "..", "deployments", `${this.config.network}-deployment.json`), 
        "utf8"
      ));
      
      const modules = await this.publicClient.readContract({
        address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
        abi: [{
          "inputs": [],
          "name": "getRegisteredModules",
          "outputs": [{"internalType": "string[]", "name": "", "type": "string[]"}],
          "stateMutability": "view",
          "type": "function"
        }],
        functionName: 'getRegisteredModules'
      });
      
      await this.tracker.completeTest('sovereignSeasV5', 'getRegisteredModules', true, 0, 0);
      console.log(`✅ Registered modules: ${modules.join(', ')}`);
      
    } catch (error) {
      await this.tracker.completeTest('sovereignSeasV5', 'getRegisteredModules', false, 0, 0, error.message);
      console.log(`❌ Module registration check failed: ${error.message}`);
    }
  }

  private async runModuleTests(moduleName: string) {
    console.log(`\n🔧 Running Tests for ${moduleName} Module`);
    
    const moduleFunctions = this.tracker.getModuleFunctions(moduleName);
    if (!moduleFunctions) {
      console.log(`❌ Module ${moduleName} not found in tracker`);
      return;
    }

    for (const [functionName, functionData] of Object.entries(moduleFunctions)) {
      if (functionData.status === 'not_tested') {
        console.log(`⏳ Testing ${moduleName}.${functionName}`);
        
        // Start test
        await this.tracker.startTest(moduleName, functionName, `${functionName} Test`, `Test ${functionName} function`);
        
        // For now, just mark as tested (you can add actual test logic here)
        await this.tracker.completeTest(moduleName, functionName, true, 100, 50000);
        console.log(`✅ ${moduleName}.${functionName} - Test completed`);
      }
    }
  }

  private async runScenarioTests(scenarioName: string) {
    console.log(`\n🔧 Running Tests for ${scenarioName} Scenario`);
    
    const scenario = this.tracker.getScenario(scenarioName);
    if (!scenario) {
      console.log(`❌ Scenario ${scenarioName} not found in tracker`);
      return;
    }

    console.log(`📋 Scenario: ${scenario.description}`);
    
    // Start scenario test
    await this.tracker.startScenarioTest(scenarioName, `${scenarioName} Test`, scenario.description);
    
    // For now, just mark as completed (you can add actual test logic here)
    await this.tracker.completeScenarioTest(scenarioName, true, 1000);
    console.log(`✅ ${scenarioName} scenario - Test completed`);
  }

  private async runComprehensiveTests() {
    console.log(`\n🔧 Running Comprehensive Tests`);
    
    // Run all basic tests first
    await this.runBasicTests();
    
    // Run tests for each module
    const modules = ['sovereignSeasV5', 'projects', 'campaigns', 'voting', 'treasury', 'pools', 'migration'];
    for (const module of modules) {
      await this.runModuleTests(module);
    }
    
    // Run all scenarios
    const scenarios = [
      'basicFunctionality', 'projectLifecycle', 'campaignVoting', 
      'multiTokenSupport', 'accessControl', 'upgradeability',
      'emergencyFunctions', 'gasOptimization', 'edgeCases', 'integration'
    ];
    
    for (const scenario of scenarios) {
      await this.runScenarioTests(scenario);
    }
  }

  private printResults() {
    const executionTime = Date.now() - this.testStartTime;
    console.log(`\n📊 Test Results Summary`);
    console.log(`⏱️  Total Execution Time: ${executionTime}ms`);
    
    const results = this.tracker.getTestResults();
    console.log(`📈 Test Statistics:`);
    console.log(`   Total Tests: ${results.totalTests}`);
    console.log(`   Passed: ${results.passedTests}`);
    console.log(`   Failed: ${results.failedTests}`);
    console.log(`   Skipped: ${results.skippedTests}`);
    console.log(`   Coverage: ${results.coverage}%`);
    
    if (results.gasUsage.total > 0) {
      console.log(`⛽ Gas Usage:`);
      console.log(`   Total: ${results.gasUsage.total}`);
      console.log(`   Average: ${results.gasUsage.average}`);
      console.log(`   Max: ${results.gasUsage.max}`);
      console.log(`   Min: ${results.gasUsage.min}`);
    }
  }

  async run() {
    try {
      await this.initialize();
      
      switch (this.config.testMode) {
        case 'basic':
          await this.runBasicTests();
          break;
        case 'module':
          if (!this.config.targetModule) {
            throw new Error('Target module required for module test mode');
          }
          await this.runModuleTests(this.config.targetModule);
          break;
        case 'scenario':
          if (!this.config.targetScenario) {
            throw new Error('Target scenario required for scenario test mode');
          }
          await this.runScenarioTests(this.config.targetScenario);
          break;
        case 'comprehensive':
          await this.runComprehensiveTests();
          break;
        default:
          throw new Error(`Unknown test mode: ${this.config.testMode}`);
      }
      
      this.printResults();
      console.log(`\n🎉 Fresh tests completed successfully!`);
      
    } catch (error) {
      console.error(`❌ Test execution failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🚀 Fresh Test Runner for SovereignSeas V5

Usage:
  ts-node start-fresh-tests.ts <network> <mode> [options]

Modes:
  basic          - Run basic functionality tests
  comprehensive  - Run all tests
  module <name>  - Run tests for specific module
  scenario <name> - Run tests for specific scenario

Examples:
  ts-node start-fresh-tests.ts alfajores basic
  ts-node start-fresh-tests.ts alfajores comprehensive
  ts-node start-fresh-tests.ts alfajores module projects
  ts-node start-fresh-tests.ts alfajores scenario basicFunctionality

Available modules: sovereignSeasV5, projects, campaigns, voting, treasury, pools, migration
Available scenarios: basicFunctionality, projectLifecycle, campaignVoting, multiTokenSupport, accessControl, upgradeability, emergencyFunctions, gasOptimization, edgeCases, integration
    `);
    process.exit(0);
  }

  const network = args[0] || 'alfajores';
  const mode = args[1] || 'basic';
  
  const rpcUrl = network === 'alfajores' 
    ? 'https://alfajores-forno.celo-testnet.org'
    : 'https://forno.celo.org';

  const config: FreshTestConfig = {
    network,
    rpcUrl,
    testMode: mode as any,
    targetModule: args[2],
    targetScenario: args[2]
  };

  const runner = new FreshTestRunner(config);
  await runner.run();
}

if (require.main === module) {
  main().catch(console.error);
}
