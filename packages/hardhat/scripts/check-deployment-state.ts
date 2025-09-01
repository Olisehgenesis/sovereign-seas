import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeploymentState {
  step: string;
  network: string;
  timestamp: string;
  deployer: string;
  contracts: {
    sovereignSeasV5?: string;
    projectsModule?: string;
    campaignsModule?: string;
    votingModule?: string;
    treasuryModule?: string;
    poolsModule?: string;
    migrationModule?: string;
  };
  roles: {
    admin?: string;
    hasAdminRole?: boolean;
    hasManagerRole?: boolean;
    hasOperatorRole?: boolean;
    hasEmergencyRole?: boolean;
  };
  moduleRoles: {
    projectsAdmin?: boolean;
    campaignsAdmin?: boolean;
    votingAdmin?: boolean;
    treasuryAdmin?: boolean;
    poolsAdmin?: boolean;
    migrationAdmin?: boolean;
  };
  completedSteps: string[];
}

async function main() {
  console.log("🔍 Checking SovereignSeas V5 deployment state...");

  const network = await ethers.provider.getNetwork().then(n => n.name);
  const deploymentStatePath = path.join(__dirname, "..", "deployments", `v5-${network}-state.json`);
  
  if (!fs.existsSync(deploymentStatePath)) {
    console.log("❌ No deployment state found. Run deploy-v5-production.ts first.");
    return;
  }

  try {
    const deploymentState: DeploymentState = JSON.parse(fs.readFileSync(deploymentStatePath, 'utf8'));
    
    console.log("\n📊 Deployment State Summary");
    console.log("=" .repeat(50));
    console.log(`🌐 Network: ${deploymentState.network}`);
    console.log(`👑 Deployer: ${deploymentState.deployer}`);
    console.log(`📅 Last Updated: ${deploymentState.timestamp}`);
    console.log(`📍 Current Step: ${deploymentState.step}`);
    
    console.log("\n✅ Completed Steps:");
    deploymentState.completedSteps.forEach((step, index) => {
      console.log(`  ${index + 1}. ${step}`);
    });
    
    console.log("\n🏗️  Deployed Contracts:");
    if (deploymentState.contracts.sovereignSeasV5) {
      console.log(`  🔑 Proxy: ${deploymentState.contracts.sovereignSeasV5}`);
    }
    if (deploymentState.contracts.projectsModule) {
      console.log(`  📁 Projects: ${deploymentState.contracts.projectsModule}`);
    }
    if (deploymentState.contracts.campaignsModule) {
      console.log(`  🎯 Campaigns: ${deploymentState.contracts.campaignsModule}`);
    }
    if (deploymentState.contracts.votingModule) {
      console.log(`  🗳️  Voting: ${deploymentState.contracts.votingModule}`);
    }
    if (deploymentState.contracts.treasuryModule) {
      console.log(`  💰 Treasury: ${deploymentState.contracts.treasuryModule}`);
    }
    if (deploymentState.contracts.poolsModule) {
      console.log(`  🏊 Pools: ${deploymentState.contracts.poolsModule}`);
    }
    if (deploymentState.contracts.migrationModule) {
      console.log(`  🔄 Migration: ${deploymentState.contracts.migrationModule}`);
    }
    
    // Determine next steps
    const allSteps = [
      "proxy_deployed",
      "projects_deployed", 
      "campaigns_deployed",
      "voting_deployed",
      "treasury_deployed",
      "pools_deployed",
      "migration_deployed",
      "proxy_initialized",
      "roles_granted",
      "modules_registered",
      "modules_initialized",
      "deployment_completed"
    ];
    
    const nextSteps = allSteps.filter(step => !deploymentState.completedSteps.includes(step));
    
    if (nextSteps.length > 0) {
      console.log("\n⏭️  Next Steps:");
      nextSteps.forEach((step, index) => {
        console.log(`  ${index + 1}. ${step}`);
      });
    } else {
      console.log("\n🎉 All deployment steps completed!");
    }
    
    console.log("\n💡 To resume deployment, run: pnpm run deploy:v5");
    console.log("💡 To check contract verification, run: pnpm run verify:v5");
    
  } catch (error) {
    console.error("❌ Error reading deployment state:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
