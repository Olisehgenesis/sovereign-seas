#!/usr/bin/env ts-node

import * as fs from "fs";
import * as path from "path";

interface ResetConfig {
  network: string;
  resetTracker: boolean;
  resetState: boolean;
  resetWallets: boolean;
  resetDeployments: boolean;
}

class TestingEnvironmentReset {
  private config: ResetConfig;

  constructor(config: ResetConfig) {
    this.config = config;
  }

  private resetTestingTracker() {
    console.log(`🔄 Resetting testing tracker...`);
    
    const trackerPath = path.join(__dirname, "testing-tracker.json");
    
    const freshTracker = {
      "metadata": {
        "version": "1.0.0",
        "lastUpdated": new Date().toISOString(),
        "description": "Comprehensive testing tracker for SovereignSeas V5 modules and functions - Fresh Start",
        "totalModules": 6,
        "totalFunctions": 60
      },
      "modules": {
        "sovereignSeasV5": {
          "name": "SovereignSeasV5",
          "description": "Main proxy contract with module management",
          "status": "not_tested",
          "functions": {
            "callModule": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "delegateToModule": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "staticCallModule": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "registerModule": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "unregisterModule": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "updateModuleAddress": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "getModuleAddress": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "isModuleRegistered": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "getRegisteredModules": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "getModuleDependencies": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "isPaused": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "pauseSystem": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "unpauseSystem": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "setModuleActive": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 }
          },
          "coverage": 0,
          "lastTested": ""
        },
        "projects": {
          "name": "ProjectsModule",
          "description": "Project management and metadata handling",
          "status": "not_tested",
          "functions": {
            "createProject": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "updateProject": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "transferProjectOwnership": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "setProjectStatus": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "getProject": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "getProjectCount": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "getProjectsByOwner": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "getProjectsByCategory": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "getProjectsByTag": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "addProjectToCampaign": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "removeProjectFromCampaign": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 }
          },
          "coverage": 0,
          "lastTested": ""
        },
        "campaigns": {
          "name": "CampaignsModule",
          "description": "Campaign creation and management",
          "status": "not_tested",
          "functions": {
            "createCampaign": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "updateCampaign": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "startCampaign": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "pauseCampaign": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "completeCampaign": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "cancelCampaign": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "getCampaign": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "getCampaignCount": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "setCampaignAdmin": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "setCampaignFee": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "createERC20Campaign": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 }
          },
          "coverage": 0,
          "lastTested": ""
        },
        "voting": {
          "name": "VotingModule",
          "description": "Voting mechanisms and session management",
          "status": "not_tested",
          "functions": {
            "createVotingSession": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "vote": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "withdrawVote": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "getVotingSession": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "getVoteCount": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "getVotingPower": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "endVotingSession": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "calculateResults": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 }
          },
          "coverage": 0,
          "lastTested": ""
        },
        "treasury": {
          "name": "TreasuryModule",
          "description": "Fund management and distribution",
          "status": "not_tested",
          "functions": {
            "depositFunds": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "withdrawFunds": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "distributeFunds": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "getBalance": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "getTransactionHistory": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 }
          },
          "coverage": 0,
          "lastTested": ""
        },
        "pools": {
          "name": "PoolsModule",
          "description": "Liquidity pools and staking",
          "status": "not_tested",
          "functions": {
            "createPool": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "addLiquidity": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "removeLiquidity": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "getPoolInfo": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "stakeTokens": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "unstakeTokens": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 }
          },
          "coverage": 0,
          "lastTested": ""
        },
        "migration": {
          "name": "MigrationModule",
          "description": "V4 to V5 migration support",
          "status": "not_tested",
          "functions": {
            "migrateProject": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "migrateCampaign": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "migrateUserData": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "getMigrationStatus": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 },
            "rollbackMigration": { "status": "not_tested", "testCases": [], "lastTested": "", "coverage": 0 }
          },
          "coverage": 0,
          "lastTested": ""
        }
      },
      "testScenarios": {
        "basicFunctionality": { "status": "not_tested", "description": "Basic module registration and function calls", "testCases": [], "lastTested": "" },
        "projectLifecycle": { "status": "not_tested", "description": "Complete project creation to completion flow", "testCases": [], "lastTested": "" },
        "campaignVoting": { "status": "not_tested", "description": "Campaign creation, voting, and fund distribution", "testCases": [], "lastTested": "" },
        "multiTokenSupport": { "status": "not_tested", "description": "ERC20 token integration and voting", "testCases": [], "lastTested": "" },
        "accessControl": { "status": "not_tested", "description": "Role-based access control testing", "testCases": [], "lastTested": "" },
        "upgradeability": { "status": "not_tested", "description": "Module upgrade and proxy functionality", "testCases": [], "lastTested": "" },
        "emergencyFunctions": { "status": "not_tested", "description": "Pause, unpause, and emergency controls", "testCases": [], "lastTested": "" },
        "gasOptimization": { "status": "not_tested", "description": "Gas usage optimization and limits", "testCases": [], "lastTested": "" },
        "edgeCases": { "status": "not_tested", "description": "Boundary conditions and error handling", "testCases": [], "lastTested": "" },
        "integration": { "status": "not_tested", "description": "Cross-module integration and communication", "testCases": [], "lastTested": "" }
      },
      "testResults": {
        "totalTests": 0,
        "passedTests": 0,
        "failedTests": 0,
        "skippedTests": 0,
        "coverage": 0,
        "lastRun": "",
        "executionTime": 0,
        "gasUsage": { "total": 0, "average": 0, "max": 0, "min": 0 }
      },
      "deployment": {
        "network": this.config.network,
        "contracts": {},
        "lastDeployed": "",
        "deploymentHash": "fresh-start-deployment"
      },
      "notes": {
        "knownIssues": [],
        "improvements": [],
        "nextSteps": [
          "Start with basic functionality tests",
          "Test module registration and initialization",
          "Test project creation workflow",
          "Test campaign creation and management",
          "Test voting mechanisms",
          "Test treasury operations",
          "Test integration between modules"
        ]
      }
    };

    fs.writeFileSync(trackerPath, JSON.stringify(freshTracker, null, 2));
    console.log(`✅ Testing tracker reset`);
  }

  private resetTestState() {
    console.log(`🔄 Resetting test state...`);
    
    const stateDir = path.join(__dirname, "..", "..", "test-state");
    if (fs.existsSync(stateDir)) {
      const files = fs.readdirSync(stateDir);
      for (const file of files) {
        if (file.includes(this.config.network)) {
          fs.unlinkSync(path.join(stateDir, file));
          console.log(`🗑️  Deleted state file: ${file}`);
        }
      }
    }
    console.log(`✅ Test state reset`);
  }

  private resetWallets() {
    console.log(`🔄 Resetting wallets...`);
    
    const walletsPath = path.join(__dirname, "..", "..", "wallets", `${this.config.network}-wallets.json`);
    if (fs.existsSync(walletsPath)) {
      fs.unlinkSync(walletsPath);
      console.log(`🗑️  Deleted wallet file: ${this.config.network}-wallets.json`);
    }
    console.log(`✅ Wallets reset`);
  }

  private resetDeployments() {
    console.log(`🔄 Resetting deployments...`);
    
    const deploymentDir = path.join(__dirname, "..", "..", "deployments", this.config.network);
    if (fs.existsSync(deploymentDir)) {
      const files = fs.readdirSync(deploymentDir);
      for (const file of files) {
        if (file !== 'latest.json') { // Keep latest.json
          fs.unlinkSync(path.join(deploymentDir, file));
          console.log(`🗑️  Deleted deployment file: ${file}`);
        }
      }
    }
    console.log(`✅ Deployments reset (kept latest.json)`);
  }

  async reset() {
    console.log(`🚀 Resetting Testing Environment for ${this.config.network}`);
    console.log(`📊 Reset Options:`);
    console.log(`   - Testing Tracker: ${this.config.resetTracker ? 'YES' : 'NO'}`);
    console.log(`   - Test State: ${this.config.resetState ? 'YES' : 'NO'}`);
    console.log(`   - Wallets: ${this.config.resetWallets ? 'YES' : 'NO'}`);
    console.log(`   - Deployments: ${this.config.resetDeployments ? 'YES' : 'NO'}`);
    console.log(``);

    if (this.config.resetTracker) {
      this.resetTestingTracker();
    }

    if (this.config.resetState) {
      this.resetTestState();
    }

    if (this.config.resetWallets) {
      this.resetWallets();
    }

    if (this.config.resetDeployments) {
      this.resetDeployments();
    }

    console.log(`\n🎉 Testing environment reset completed!`);
    console.log(`\n📋 Next Steps:`);
    console.log(`   1. Generate new wallets: pnpm run test:gen-wallets`);
    console.log(`   2. Deploy contracts: pnpm run deploy:v5`);
    console.log(`   3. Run real tests: pnpm run test:real:fresh`);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🔄 Testing Environment Reset Tool

Usage:
  ts-node reset-testing-environment.ts <network> [options]

Options:
  --tracker      - Reset testing tracker
  --state        - Reset test state files
  --wallets      - Reset wallet files
  --deployments  - Reset deployment files (except latest.json)
  --all          - Reset everything

Examples:
  ts-node reset-testing-environment.ts alfajores --all
  ts-node reset-testing-environment.ts alfajores --tracker --state
  ts-node reset-testing-environment.ts alfajores --wallets --deployments

⚠️  WARNING: This will delete test data and state files!
    `);
    process.exit(0);
  }

  const network = args[0] || 'alfajores';
  const resetAll = args.includes('--all');
  
  const config: ResetConfig = {
    network,
    resetTracker: resetAll || args.includes('--tracker'),
    resetState: resetAll || args.includes('--state'),
    resetWallets: resetAll || args.includes('--wallets'),
    resetDeployments: resetAll || args.includes('--deployments')
  };

  const resetter = new TestingEnvironmentReset(config);
  await resetter.reset();
}

if (require.main === module) {
  main().catch(console.error);
}
