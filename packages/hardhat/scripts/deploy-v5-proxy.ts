import hre from "hardhat";
import { saveDeployment, loadLatestDeployment } from "./utils/deployments";
const { ethers } = hre;

interface DeploymentConfig {
  network: string;
  deployer: string;
  timestamp: string;
  contracts: {
    projectsModule: string;
    campaignsModule: string;
    votingModule: string;
    treasuryModule: string;
    poolsModule: string;
    migrationModule: string;
    sovereignSeasV5: string;
  };
}

async function main() {
  console.log("🚀 Starting SovereignSeas V5 Deployment...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying from: ${deployer.address}`);

  // Network configuration
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "hardhat" : network.name;
  console.log(`🌐 Network: ${networkName}`);

  const args = process.argv.slice(2);
  const shouldRedeploy = args.includes("--redeploy") || args.includes("-r");

  if (!shouldRedeploy) {
    const existing = loadLatestDeployment(networkName);
    if (existing) {
      console.log("\n⏭️  Skipping deployment: existing deployment found (use --redeploy to force)");
      console.log(`   Latest: ${existing.path}`);
      console.log(`   Proxy:  ${existing.record.contracts.sovereignSeasV5}`);
      return;
    }
  }

  // Create deployment config
  const deploymentConfig: DeploymentConfig = {
    network: networkName,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      projectsModule: "",
      campaignsModule: "",
      votingModule: "",
      treasuryModule: "",
      poolsModule: "",
      migrationModule: "",
      sovereignSeasV5: "",
    },
  };

  try {
    // Deploy modules first
    console.log("\n📦 Deploying Modules...");

    // 1. Deploy ProjectsModule
    console.log("🔨 Deploying ProjectsModule...");
    const ProjectsModule = await ethers.getContractFactory("ProjectsModule");
    const projectsModule = await ProjectsModule.deploy();
    await projectsModule.waitForDeployment();
    const projectsModuleAddress = await projectsModule.getAddress();
    deploymentConfig.contracts.projectsModule = projectsModuleAddress;
    console.log(`✅ ProjectsModule deployed to: ${projectsModuleAddress}`);

    // 2. Deploy CampaignsModule
    console.log("🔨 Deploying CampaignsModule...");
    const CampaignsModule = await ethers.getContractFactory("CampaignsModule");
    const campaignsModule = await CampaignsModule.deploy();
    await campaignsModule.waitForDeployment();
    const campaignsModuleAddress = await campaignsModule.getAddress();
    deploymentConfig.contracts.campaignsModule = campaignsModuleAddress;
    console.log(`✅ CampaignsModule deployed to: ${campaignsModuleAddress}`);

    // 3. Deploy VotingModule
    console.log("🔨 Deploying VotingModule...");
    const VotingModule = await ethers.getContractFactory("VotingModule");
    const votingModule = await VotingModule.deploy();
    await votingModule.waitForDeployment();
    const votingModuleAddress = await votingModule.getAddress();
    deploymentConfig.contracts.votingModule = votingModuleAddress;
    console.log(`✅ VotingModule deployed to: ${votingModuleAddress}`);

    // 4. Deploy TreasuryModule
    console.log("🔨 Deploying TreasuryModule...");
    const TreasuryModule = await ethers.getContractFactory("TreasuryModule");
    const treasuryModule = await TreasuryModule.deploy();
    await treasuryModule.waitForDeployment();
    const treasuryModuleAddress = await treasuryModule.getAddress();
    deploymentConfig.contracts.treasuryModule = treasuryModuleAddress;
    console.log(`✅ TreasuryModule deployed to: ${treasuryModuleAddress}`);

    // 5. Deploy PoolsModule
    console.log("🔨 Deploying PoolsModule...");
    const PoolsModule = await ethers.getContractFactory("PoolsModule");
    const poolsModule = await PoolsModule.deploy();
    await poolsModule.waitForDeployment();
    const poolsModuleAddress = await poolsModule.getAddress();
    deploymentConfig.contracts.poolsModule = poolsModuleAddress;
    console.log(`✅ PoolsModule deployed to: ${poolsModuleAddress}`);

    // 6. Deploy MigrationModule
    console.log("🔨 Deploying MigrationModule...");
    const MigrationModule = await ethers.getContractFactory("MigrationModule");
    const migrationModule = await MigrationModule.deploy();
    await migrationModule.waitForDeployment();
    const migrationModuleAddress = await migrationModule.getAddress();
    deploymentConfig.contracts.migrationModule = migrationModuleAddress;
    console.log(`✅ MigrationModule deployed to: ${migrationModuleAddress}`);

    // Deploy main proxy contract
    console.log("\n🏗️ Deploying SovereignSeas V5 Proxy...");
    const SovereignSeasV5 = await ethers.getContractFactory("SovereignSeasV5");
    const sovereignSeasV5 = await SovereignSeasV5.deploy();
    await sovereignSeasV5.waitForDeployment();
    const sovereignSeasV5Address = await sovereignSeasV5.getAddress();
    deploymentConfig.contracts.sovereignSeasV5 = sovereignSeasV5Address;
    console.log(`✅ SovereignSeas V5 deployed to: ${sovereignSeasV5Address}`);

    // Initialize modules
    console.log("\n🔧 Initializing Modules...");

    // Initialize ProjectsModule
    console.log("🔧 Initializing ProjectsModule...");
    await projectsModule.initialize(sovereignSeasV5Address, "0x");
    console.log("✅ ProjectsModule initialized");

    // Initialize CampaignsModule
    console.log("🔧 Initializing CampaignsModule...");
    await campaignsModule.initialize(sovereignSeasV5Address, "0x");
    console.log("✅ CampaignsModule initialized");

    // Initialize VotingModule
    console.log("🔧 Initializing VotingModule...");
    await votingModule.initialize(sovereignSeasV5Address, "0x");
    console.log("✅ VotingModule initialized");

    // Initialize TreasuryModule
    console.log("🔧 Initializing TreasuryModule...");
    await treasuryModule.initialize(sovereignSeasV5Address, "0x");
    console.log("✅ TreasuryModule initialized");

    // Initialize PoolsModule
    console.log("🔧 Initializing PoolsModule...");
    await poolsModule.initialize(sovereignSeasV5Address, "0x");
    console.log("✅ PoolsModule initialized");

    // Initialize MigrationModule
    console.log("🔧 Initializing MigrationModule...");
    await migrationModule.initialize(sovereignSeasV5Address, "0x");
    console.log("✅ MigrationModule initialized");

    // Initialize main proxy
    console.log("🔧 Initializing SovereignSeas V5 Proxy...");
    await sovereignSeasV5.initialize(deployer.address);
    console.log("✅ SovereignSeas V5 Proxy initialized");

    // Register modules with the proxy
    console.log("\n📋 Registering Modules with Proxy...");

    // Register ProjectsModule
    console.log("📋 Registering ProjectsModule...");
    await sovereignSeasV5.registerModule("projects", projectsModuleAddress, []);
    console.log("✅ ProjectsModule registered");

    // Register CampaignsModule
    console.log("📋 Registering CampaignsModule...");
    await sovereignSeasV5.registerModule("campaigns", campaignsModuleAddress, ["projects"]);
    console.log("✅ CampaignsModule registered");

    // Register VotingModule
    console.log("📋 Registering VotingModule...");
    await sovereignSeasV5.registerModule("voting", votingModuleAddress, ["projects", "campaigns"]);
    console.log("✅ VotingModule registered");

    // Register TreasuryModule
    console.log("📋 Registering TreasuryModule...");
    await sovereignSeasV5.registerModule("treasury", treasuryModuleAddress, []);
    console.log("✅ TreasuryModule registered");

    // Register PoolsModule
    console.log("📋 Registering PoolsModule...");
    await sovereignSeasV5.registerModule("pools", poolsModuleAddress, ["projects", "campaigns", "treasury"]);
    console.log("✅ PoolsModule registered");

    // Register MigrationModule
    console.log("📋 Registering MigrationModule...");
    await sovereignSeasV5.registerModule("migration", migrationModuleAddress, ["projects", "campaigns", "voting", "treasury", "pools"]);
    console.log("✅ MigrationModule registered");

    // Save deployment configuration (timestamped per network)
    console.log("\n💾 Saving deployment configuration...");
    const savedPath = saveDeployment(networkName, deploymentConfig);
    console.log(`✅ Deployment config saved to: ${savedPath}`);

    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    
    // Check if all modules are registered
    const registeredModules = await sovereignSeasV5.getRegisteredModules();
    console.log(`📊 Registered modules: ${registeredModules.length}`);
    
    for (const moduleId of registeredModules) {
      const moduleAddress = await sovereignSeasV5.getModuleAddress(moduleId);
      const isActive = await sovereignSeasV5.isModuleRegistered(moduleId);
      console.log(`  - ${moduleId}: ${moduleAddress} (${isActive ? "Active" : "Inactive"})`);
    }

    // Test module calls
    console.log("\n🧪 Testing module calls...");
    
    // Test ProjectsModule
    const projectsModuleId = await projectsModule.getModuleId();
    const projectsModuleVersion = await projectsModule.getModuleVersion();
    console.log(`  - ProjectsModule: ${projectsModuleId} v${projectsModuleVersion}`);

    // Test CampaignsModule
    const campaignsModuleId = await campaignsModule.getModuleId();
    const campaignsModuleVersion = await campaignsModule.getModuleVersion();
    console.log(`  - CampaignsModule: ${campaignsModuleId} v${campaignsModuleVersion}`);

    // Test VotingModule
    const votingModuleId = await votingModule.getModuleId();
    const votingModuleVersion = await votingModule.getModuleVersion();
    console.log(`  - VotingModule: ${votingModuleId} v${votingModuleVersion}`);

    // Test TreasuryModule
    const treasuryModuleId = await treasuryModule.getModuleId();
    const treasuryModuleVersion = await treasuryModule.getModuleVersion();
    console.log(`  - TreasuryModule: ${treasuryModuleId} v${treasuryModuleVersion}`);

    // Test PoolsModule
    const poolsModuleId = await poolsModule.getModuleId();
    const poolsModuleVersion = await poolsModule.getModuleVersion();
    console.log(`  - PoolsModule: ${poolsModuleId} v${poolsModuleVersion}`);

    // Test MigrationModule
    const migrationModuleId = await migrationModule.getModuleId();
    const migrationModuleVersion = await migrationModule.getModuleVersion();
    console.log(`  - MigrationModule: ${migrationModuleId} v${migrationModuleVersion}`);

    console.log("\n🎉 SovereignSeas V5 Deployment Complete!");
    console.log("\n📋 Deployment Summary:");
    console.log(`  Network: ${networkName}`);
    console.log(`  Deployer: ${deployer.address}`);
    console.log(`  Main Proxy: ${sovereignSeasV5Address}`);
    console.log(`  Total Modules: ${registeredModules.length}`);
    console.log(`  Deployment Config: ${savedPath}`);

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const network = args[0] || "hardhat";

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
SovereignSeas V5 Deployment Script

Usage:
  npx hardhat run scripts/deploy-v5-proxy.ts [network]

Networks:
  hardhat    - Local Hardhat network (default)
  alfajores  - Celo Alfajores testnet
  celo       - Celo mainnet
  baklava    - Celo Baklava testnet

Examples:
  npx hardhat run scripts/deploy-v5-proxy.ts
  npx hardhat run scripts/deploy-v5-proxy.ts alfajores
  npx hardhat run scripts/deploy-v5-proxy.ts celo
 
 Options:
   --redeploy, -r  Force redeployment even if a previous deployment exists
`);
  process.exit(0);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
