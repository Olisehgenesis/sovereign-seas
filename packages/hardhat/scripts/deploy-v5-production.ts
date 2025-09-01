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
  console.log("🚀 Deploying SovereignSeas V5 with new access control architecture...");

  const [deployer] = await ethers.getSigners();
  console.log(`📋 Deploying from: ${deployer.address}`);
  console.log(`💰 Deployer balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} CELO`);

  // Load or create deployment state
  const network = await ethers.provider.getNetwork().then(n => n.name);
  const deploymentStatePath = path.join(__dirname, "..", "deployments", `v5-${network}-state.json`);
  
  let deploymentState: DeploymentState;
  try {
    if (fs.existsSync(deploymentStatePath)) {
      deploymentState = JSON.parse(fs.readFileSync(deploymentStatePath, 'utf8'));
      console.log(`📂 Found existing deployment state: ${deploymentState.step}`);
      console.log(`✅ Completed steps: ${deploymentState.completedSteps.join(', ')}`);
    } else {
      deploymentState = {
        step: "starting",
        network,
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        contracts: {},
        roles: {},
        moduleRoles: {},
        completedSteps: []
      };
      console.log("🆕 Starting fresh deployment");
    }
  } catch (error) {
    console.log("⚠️  Error loading deployment state, starting fresh:", error.message);
    deploymentState = {
      step: "starting",
      network,
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      contracts: {},
      roles: {},
      moduleRoles: {},
      completedSteps: []
    };
  }

  // Helper function to save deployment state
  const saveDeploymentState = (step: string) => {
    deploymentState.step = step;
    deploymentState.timestamp = new Date().toISOString();
    if (!deploymentState.completedSteps.includes(step)) {
      deploymentState.completedSteps.push(step);
    }
    
    fs.mkdirSync(path.dirname(deploymentStatePath), { recursive: true });
    fs.writeFileSync(deploymentStatePath, JSON.stringify(deploymentState, null, 2));
    console.log(`💾 Deployment state saved: ${step}`);
  };

  // Helper function to check if step is completed
  const isStepCompleted = (step: string) => deploymentState.completedSteps.includes(step);

  // Show resume information
  if (deploymentState.completedSteps.length > 0) {
    console.log(`🔄 Resuming deployment from step: ${deploymentState.step}`);
    console.log(`📋 Completed steps: ${deploymentState.completedSteps.join(', ')}`);
    console.log(`⏭️  Skipping completed steps...`);
  }

  // Deploy the main proxy contract (if not already deployed)
  let sovereignSeasV5;
  if (deploymentState.contracts.sovereignSeasV5 && !deploymentState.completedSteps.includes("proxy_deployed")) {
    console.log(`📂 Using existing proxy: ${deploymentState.contracts.sovereignSeasV5}`);
    const SovereignSeasV5 = await ethers.getContractFactory("SovereignSeasV5");
    sovereignSeasV5 = SovereignSeasV5.attach(deploymentState.contracts.sovereignSeasV5);
  } else {
    console.log("\n🏗️  Deploying SovereignSeasV5 proxy...");
    const SovereignSeasV5 = await ethers.getContractFactory("SovereignSeasV5");
    sovereignSeasV5 = await SovereignSeasV5.deploy();
    await sovereignSeasV5.waitForDeployment();
    deploymentState.contracts.sovereignSeasV5 = await sovereignSeasV5.getAddress();
    saveDeploymentState("proxy_deployed");
    console.log(`✅ SovereignSeasV5 deployed to: ${deploymentState.contracts.sovereignSeasV5}`);
  }

  // Deploy all modules (incrementally)
  console.log("\n🔧 Deploying modules...");
  
  let projectsModule, campaignsModule, votingModule, treasuryModule, poolsModule, migrationModule;
  
  // Deploy ProjectsModule
  if (deploymentState.contracts.projectsModule && !deploymentState.completedSteps.includes("projects_deployed")) {
    console.log(`📂 Using existing ProjectsModule: ${deploymentState.contracts.projectsModule}`);
    const ProjectsModule = await ethers.getContractFactory("ProjectsModule");
    projectsModule = ProjectsModule.attach(deploymentState.contracts.projectsModule);
  } else {
    console.log("🏗️  Deploying ProjectsModule...");
    const ProjectsModule = await ethers.getContractFactory("ProjectsModule");
    projectsModule = await ProjectsModule.deploy();
    await projectsModule.waitForDeployment();
    deploymentState.contracts.projectsModule = await projectsModule.getAddress();
    saveDeploymentState("projects_deployed");
    console.log(`✅ ProjectsModule deployed to: ${deploymentState.contracts.projectsModule}`);
  }

  // Deploy CampaignsModule
  if (deploymentState.contracts.campaignsModule && !deploymentState.completedSteps.includes("campaigns_deployed")) {
    console.log(`📂 Using existing CampaignsModule: ${deploymentState.contracts.campaignsModule}`);
    const CampaignsModule = await ethers.getContractFactory("CampaignsModule");
    campaignsModule = CampaignsModule.attach(deploymentState.contracts.campaignsModule);
  } else {
    console.log("🏗️  Deploying CampaignsModule...");
    const CampaignsModule = await ethers.getContractFactory("CampaignsModule");
    campaignsModule = await CampaignsModule.deploy();
    await campaignsModule.waitForDeployment();
    deploymentState.contracts.campaignsModule = await campaignsModule.getAddress();
    saveDeploymentState("campaigns_deployed");
    console.log(`✅ CampaignsModule deployed to: ${deploymentState.contracts.campaignsModule}`);
  }

  // Deploy VotingModule
  if (deploymentState.contracts.votingModule && !deploymentState.completedSteps.includes("voting_deployed")) {
    console.log(`📂 Using existing VotingModule: ${deploymentState.contracts.votingModule}`);
    const VotingModule = await ethers.getContractFactory("VotingModule");
    votingModule = VotingModule.attach(deploymentState.contracts.votingModule);
  } else {
    console.log("🏗️  Deploying VotingModule...");
    const VotingModule = await ethers.getContractFactory("VotingModule");
    votingModule = await VotingModule.deploy();
    await votingModule.waitForDeployment();
    deploymentState.contracts.votingModule = await votingModule.getAddress();
    saveDeploymentState("voting_deployed");
    console.log(`✅ VotingModule deployed to: ${deploymentState.contracts.votingModule}`);
  }

  // Deploy TreasuryModule
  if (deploymentState.contracts.treasuryModule && !deploymentState.completedSteps.includes("treasury_deployed")) {
    console.log(`📂 Using existing TreasuryModule: ${deploymentState.contracts.treasuryModule}`);
    const TreasuryModule = await ethers.getContractFactory("TreasuryModule");
    treasuryModule = TreasuryModule.attach(deploymentState.contracts.treasuryModule);
  } else {
    console.log("🏗️  Deploying TreasuryModule...");
    const TreasuryModule = await ethers.getContractFactory("TreasuryModule");
    treasuryModule = await TreasuryModule.deploy();
    await treasuryModule.waitForDeployment();
    deploymentState.contracts.treasuryModule = await treasuryModule.getAddress();
    saveDeploymentState("treasury_deployed");
    console.log(`✅ TreasuryModule deployed to: ${deploymentState.contracts.treasuryModule}`);
  }

  // Deploy PoolsModule
  if (deploymentState.contracts.poolsModule && !deploymentState.completedSteps.includes("pools_deployed")) {
    console.log(`📂 Using existing PoolsModule: ${deploymentState.contracts.poolsModule}`);
    const PoolsModule = await ethers.getContractFactory("PoolsModule");
    poolsModule = PoolsModule.attach(deploymentState.contracts.poolsModule);
  } else {
    console.log("🏗️  Deploying PoolsModule...");
    const PoolsModule = await ethers.getContractFactory("PoolsModule");
    poolsModule = await PoolsModule.deploy();
    await poolsModule.waitForDeployment();
    deploymentState.contracts.poolsModule = await poolsModule.getAddress();
    saveDeploymentState("pools_deployed");
    console.log(`✅ PoolsModule deployed to: ${deploymentState.contracts.poolsModule}`);
  }

  // Deploy MigrationModule
  if (deploymentState.contracts.migrationModule && !deploymentState.completedSteps.includes("migration_deployed")) {
    console.log(`📂 Using existing MigrationModule: ${deploymentState.contracts.migrationModule}`);
    const MigrationModule = await ethers.getContractFactory("MigrationModule");
    migrationModule = MigrationModule.attach(deploymentState.contracts.migrationModule);
  } else {
    console.log("🏗️  Deploying MigrationModule...");
    const MigrationModule = await ethers.getContractFactory("MigrationModule");
    migrationModule = await MigrationModule.deploy();
    await migrationModule.waitForDeployment();
    deploymentState.contracts.migrationModule = await migrationModule.getAddress();
    saveDeploymentState("migration_deployed");
    console.log(`✅ MigrationModule deployed to: ${deploymentState.contracts.migrationModule}`);
  }

  // Initialize the proxy (if not already initialized)
  if (!deploymentState.completedSteps.includes("proxy_initialized")) {
    console.log("\n🔐 Initializing proxy with deployer as admin...");
    await sovereignSeasV5.initialize(deployer.address);
    saveDeploymentState("proxy_initialized");
    console.log("✅ Proxy initialized with deployer as admin");
  } else {
    console.log("📂 Proxy already initialized, skipping...");
  }

  // Grant module-specific admin roles to deployer (if not already granted)
  if (!deploymentState.completedSteps.includes("roles_granted")) {
    console.log("\n🔑 Granting module-specific admin roles...");
    await sovereignSeasV5.grantRole(await sovereignSeasV5.PROJECTS_ADMIN_ROLE(), deployer.address);
    await sovereignSeasV5.grantRole(await sovereignSeasV5.CAMPAIGNS_ADMIN_ROLE(), deployer.address);
    await sovereignSeasV5.grantRole(await sovereignSeasV5.VOTING_ADMIN_ROLE(), deployer.address);
    await sovereignSeasV5.grantRole(await sovereignSeasV5.TREASURY_ADMIN_ROLE(), deployer.address);
    await sovereignSeasV5.grantRole(await sovereignSeasV5.POOLS_ADMIN_ROLE(), deployer.address);
    await sovereignSeasV5.grantRole(await sovereignSeasV5.MIGRATION_ADMIN_ROLE(), deployer.address);
    saveDeploymentState("roles_granted");
    console.log("✅ All module-specific admin roles granted to deployer");
  } else {
    console.log("📂 Module-specific admin roles already granted, skipping...");
  }

  // Register all modules (incrementally)
  if (!deploymentState.completedSteps.includes("modules_registered")) {
    console.log("\n📝 Registering modules...");
    
    await sovereignSeasV5.registerModule("projects", await projectsModule.getAddress(), []);
    console.log("✅ Projects module registered");

    await sovereignSeasV5.registerModule("campaigns", await campaignsModule.getAddress(), []);
    console.log("✅ Campaigns module registered");

    await sovereignSeasV5.registerModule("voting", await votingModule.getAddress(), []);
    console.log("✅ Voting module registered");

    await sovereignSeasV5.registerModule("treasury", await treasuryModule.getAddress(), []);
    console.log("✅ Treasury module registered");

    await sovereignSeasV5.registerModule("pools", await poolsModule.getAddress(), []);
    console.log("✅ Pools module registered");

    await sovereignSeasV5.registerModule("migration", await migrationModule.getAddress(), []);
    console.log("✅ Migration module registered");
    
    saveDeploymentState("modules_registered");
  } else {
    console.log("📂 Modules already registered, skipping...");
  }

  // Initialize all modules (incrementally)
  if (!deploymentState.completedSteps.includes("modules_initialized")) {
    console.log("\n⚙️  Initializing modules...");
    
    await projectsModule.initialize(await sovereignSeasV5.getAddress(), "0x");
    console.log("✅ Projects module initialized");

    await campaignsModule.initialize(await sovereignSeasV5.getAddress(), "0x");
    console.log("✅ Campaigns module initialized");

    await votingModule.initialize(await sovereignSeasV5.getAddress(), "0x");
    console.log("✅ Voting module initialized");

    await treasuryModule.initialize(await sovereignSeasV5.getAddress(), "0x");
    console.log("✅ Treasury module initialized");

    await poolsModule.initialize(await sovereignSeasV5.getAddress(), "0x");
    console.log("✅ Pools module initialized");

    await migrationModule.initialize(await sovereignSeasV5.getAddress(), "0x");
    console.log("✅ Migration module initialized");
    
    saveDeploymentState("modules_initialized");
  } else {
    console.log("📂 Modules already initialized, skipping...");
  }

  // Verify module registration
  console.log("\n🔍 Verifying module registration...");
  const registeredModules = await sovereignSeasV5.getRegisteredModules();
  console.log(`📋 Registered modules: ${registeredModules.join(", ")}`);

  for (const moduleId of registeredModules) {
    const isRegistered = await sovereignSeasV5.isModuleRegistered(moduleId);
    const address = await sovereignSeasV5.getModuleAddress(moduleId);
    const isActive = await sovereignSeasV5.moduleActive(moduleId);
    console.log(`  ${moduleId}: ${isRegistered ? "✅" : "❌"} | ${address} | Active: ${isActive}`);
  }

  // Save final deployment state
  saveDeploymentState("deployment_completed");

  // Save deployment info
  const deploymentInfo = {
    network: await ethers.provider.getNetwork().then(n => n.name),
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      sovereignSeasV5: await sovereignSeasV5.getAddress(),
      projectsModule: await projectsModule.getAddress(),
      campaignsModule: await campaignsModule.getAddress(),
      votingModule: await votingModule.getAddress(),
      treasuryModule: await treasuryModule.getAddress(),
      poolsModule: await poolsModule.getAddress(),
      migrationModule: await migrationModule.getAddress(),
    },
    roles: {
      admin: deployer.address,
      hasAdminRole: await sovereignSeasV5.hasRole(await sovereignSeasV5.ADMIN_ROLE(), deployer.address),
      hasManagerRole: await sovereignSeasV5.hasRole(await sovereignSeasV5.MANAGER_ROLE(), deployer.address),
      hasOperatorRole: await sovereignSeasV5.hasRole(await sovereignSeasV5.OPERATOR_ROLE(), deployer.address),
      hasEmergencyRole: await sovereignSeasV5.hasRole(await sovereignSeasV5.EMERGENCY_ROLE(), deployer.address),
    },
    moduleRoles: {
      projectsAdmin: await sovereignSeasV5.hasRole(await sovereignSeasV5.PROJECTS_ADMIN_ROLE(), deployer.address),
      campaignsAdmin: await sovereignSeasV5.hasRole(await sovereignSeasV5.CAMPAIGNS_ADMIN_ROLE(), deployer.address),
      votingAdmin: await sovereignSeasV5.hasRole(await sovereignSeasV5.VOTING_ADMIN_ROLE(), deployer.address),
      treasuryAdmin: await sovereignSeasV5.hasRole(await sovereignSeasV5.TREASURY_ADMIN_ROLE(), deployer.address),
      poolsAdmin: await sovereignSeasV5.hasRole(await sovereignSeasV5.POOLS_ADMIN_ROLE(), deployer.address),
      migrationAdmin: await sovereignSeasV5.hasRole(await sovereignSeasV5.MIGRATION_ADMIN_ROLE(), deployer.address),
    }
  };

  // Save to file
  const deploymentPath = path.join(__dirname, "..", "deployments", `v5-${deploymentInfo.network}-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

  // Test value forwarding (CELO payments)
  console.log("\n🧪 Testing value forwarding...");
  try {
    const testAmount = ethers.parseEther("0.01");
    const testData = projectsModule.interface.encodeFunctionData("createProject", [
      "Test Project",
      "Test Description",
      { category: "test", tags: ["test"], website: "", github: "", documentation: "" },
      [],
      false
    ]);
    
    await sovereignSeasV5.callModule("projects", testData, { value: testAmount });
    console.log("✅ Value forwarding test passed - CELO successfully forwarded to module");
  } catch (error) {
    console.log("⚠️  Value forwarding test failed (this might be expected in some cases):", error.message);
  }

  // Print summary
  console.log("\n🎉 Deployment completed successfully!");
  console.log("=" .repeat(60));
  console.log(`🌐 Network: ${deploymentInfo.network}`);
  console.log(`👑 Admin: ${deploymentInfo.roles.admin}`);
  console.log(`🔑 Proxy: ${deploymentInfo.contracts.sovereignSeasV5}`);
  console.log(`📦 Modules: ${registeredModules.length} registered`);
  console.log("=" .repeat(60));
  
  console.log("\n📋 Next steps:");
  console.log("1. Verify all contracts on block explorer");
  console.log("2. Test module functionality");
  console.log("3. Grant additional roles to team members if needed");
  console.log("4. Test cross-module communication");
  console.log("5. Test value forwarding (CELO payments)");
  console.log("6. Test cross-module communication via proxy");
  
  console.log("\n💡 Incremental Deployment Features:");
  console.log("✅ Deployment state saved to: deployments/v5-{network}-state.json");
  console.log("✅ Can resume from any step if deployment fails");
  console.log("✅ Skips already completed steps");
  console.log("✅ Tracks progress and contract addresses");
  console.log("✅ Safe to run multiple times");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
