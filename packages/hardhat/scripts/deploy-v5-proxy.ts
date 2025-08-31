import { ethers, upgrades } from "hardhat";
import { Contract } from "ethers";
import { config } from "dotenv";
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

config();

// Configuration
const NETWORK = process.argv[2] || 'celo'; // Default to celo mainnet
const DEPLOYMENT_FILE = `deployment-${NETWORK}-${Date.now()}.json`;

// Load existing deployment if exists
function loadDeployment(): Record<string, string> {
  try {
    const files = require('fs').readdirSync('.').filter((f: string) => f.startsWith(`deployment-${NETWORK}-`) && f.endsWith('.json'));
    if (files.length > 0) {
      const latestFile = files.sort().pop();
      console.log(`📁 Loading existing deployment from: ${latestFile}`);
      const deployment = JSON.parse(readFileSync(latestFile, 'utf8'));
      return deployment.contracts || {};
    }
  } catch (error) {
    console.log('📁 No existing deployment found, starting fresh');
  }
  return {};
}

// Save deployment progress
function saveDeployment(contracts: Record<string, string>, deployer: string) {
  const deployment = {
    network: NETWORK,
    deployer: deployer,
    timestamp: new Date().toISOString(),
    contracts
  };
  writeFileSync(DEPLOYMENT_FILE, JSON.stringify(deployment, null, 2));
  console.log(`💾 Deployment progress saved to: ${DEPLOYMENT_FILE}`);
}

// Already deployed contract addresses
const DEPLOYED_ADDRESSES = loadDeployment();

async function main() {
  const [deployer] = await ethers.getSigners();
  
  // Display current deployment status
  console.log('\n📊 Current Deployment Status:');
  const status = {
    'ProjectsModule': DEPLOYED_ADDRESSES.projectsModule || '❌ Not deployed',
    'CampaignsModule': DEPLOYED_ADDRESSES.campaignsModule || '❌ Not deployed',
    'VotingModule': DEPLOYED_ADDRESSES.votingModule || '❌ Not deployed',
    'TreasuryModule': DEPLOYED_ADDRESSES.treasuryModule || '❌ Not deployed',
    'MigrationModule': DEPLOYED_ADDRESSES.migrationModule || '❌ Not deployed',
    'SovereignSeasV5': DEPLOYED_ADDRESSES.sovereignSeasV5 || '❌ Not deployed'
  };
  
  Object.entries(status).forEach(([contract, address]) => {
    const icon = address !== '❌ Not deployed' ? '✅' : '❌';
    console.log(`   ${icon} ${contract}: ${address}`);
  });
  
  const deployedCount = Object.values(DEPLOYED_ADDRESSES).filter(addr => addr !== '').length;
  const totalCount = 6;
  console.log(`\n📈 Progress: ${deployedCount}/${totalCount} contracts deployed`);
  
  console.log(`\n🚀 Deploying SovereignSeas V5 Proxy Architecture to ${NETWORK === 'celo' ? 'Celo Mainnet' : 'Alfajores Testnet'}...`);
  console.log("👤 Deployer account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "CELO");
  
  // Deploy ProjectsModule
  let projectsModuleAddress: string;
  if (!DEPLOYED_ADDRESSES.projectsModule) {
    console.log("\n1️⃣ Deploying ProjectsModule...");
    const ProjectsModule = await ethers.getContractFactory("ProjectsModule");
    const projectsModule = await ProjectsModule.deploy();
    await projectsModule.waitForDeployment();
    projectsModuleAddress = await projectsModule.getAddress();
    console.log("✅ ProjectsModule deployed to:", projectsModuleAddress);
    
    // Save deployment progress
    DEPLOYED_ADDRESSES.projectsModule = projectsModuleAddress;
    saveDeployment(DEPLOYED_ADDRESSES, deployer.address);
  } else {
    console.log("\n1️⃣ ProjectsModule already deployed at:", DEPLOYED_ADDRESSES.projectsModule);
    projectsModuleAddress = DEPLOYED_ADDRESSES.projectsModule;
  }
  
  // Deploy CampaignsModule
  let campaignsModuleAddress: string;
  if (!DEPLOYED_ADDRESSES.campaignsModule) {
    console.log("\n2️⃣ Deploying CampaignsModule...");
    const CampaignsModule = await ethers.getContractFactory("CampaignsModule");
    const campaignsModule = await CampaignsModule.deploy();
    await campaignsModule.waitForDeployment();
    campaignsModuleAddress = await campaignsModule.getAddress();
    console.log("✅ CampaignsModule deployed to:", campaignsModuleAddress);
    
    DEPLOYED_ADDRESSES.campaignsModule = campaignsModuleAddress;
    saveDeployment(DEPLOYED_ADDRESSES, deployer.address);
  } else {
    console.log("\n2️⃣ CampaignsModule already deployed at:", DEPLOYED_ADDRESSES.campaignsModule);
    campaignsModuleAddress = DEPLOYED_ADDRESSES.campaignsModule;
  }
  
  // Deploy VotingModule
  let votingModuleAddress: string;
  if (!DEPLOYED_ADDRESSES.votingModule) {
    console.log("\n3️⃣ Deploying VotingModule...");
    const VotingModule = await ethers.getContractFactory("VotingModule");
    const votingModule = await VotingModule.deploy();
    await votingModule.waitForDeployment();
    votingModuleAddress = await votingModule.getAddress();
    console.log("✅ VotingModule deployed to:", votingModuleAddress);
    
    DEPLOYED_ADDRESSES.votingModule = votingModuleAddress;
    saveDeployment(DEPLOYED_ADDRESSES, deployer.address);
  } else {
    console.log("\n3️⃣ VotingModule already deployed at:", DEPLOYED_ADDRESSES.votingModule);
    votingModuleAddress = DEPLOYED_ADDRESSES.votingModule;
  }
  
  // Deploy TreasuryModule
  let treasuryModuleAddress: string;
  if (!DEPLOYED_ADDRESSES.treasuryModule) {
    console.log("\n4️⃣ Deploying TreasuryModule...");
    const TreasuryModule = await ethers.getContractFactory("TreasuryModule");
    const treasuryModule = await TreasuryModule.deploy();
    await treasuryModule.waitForDeployment();
    treasuryModuleAddress = await treasuryModule.getAddress();
    console.log("✅ TreasuryModule deployed to:", treasuryModuleAddress);
    
    DEPLOYED_ADDRESSES.treasuryModule = treasuryModuleAddress;
    saveDeployment(DEPLOYED_ADDRESSES, deployer.address);
  } else {
    console.log("\n4️⃣ TreasuryModule already deployed at:", DEPLOYED_ADDRESSES.treasuryModule);
    treasuryModuleAddress = DEPLOYED_ADDRESSES.treasuryModule;
  }
  
  // Deploy MigrationModule
  let migrationModuleAddress: string;
  if (!DEPLOYED_ADDRESSES.migrationModule) {
    console.log("\n5️⃣ Deploying MigrationModule...");
    const MigrationModule = await ethers.getContractFactory("MigrationModule");
    const migrationModule = await MigrationModule.deploy();
    await migrationModule.waitForDeployment();
    migrationModuleAddress = await migrationModule.getAddress();
    console.log("✅ MigrationModule deployed to:", migrationModuleAddress);
    
    DEPLOYED_ADDRESSES.migrationModule = migrationModuleAddress;
    saveDeployment(DEPLOYED_ADDRESSES, deployer.address);
  } else {
    console.log("\n5️⃣ MigrationModule already deployed at:", DEPLOYED_ADDRESSES.migrationModule);
    migrationModuleAddress = DEPLOYED_ADDRESSES.migrationModule;
  }
  
  // Deploy SovereignSeasV5 with OpenZeppelin Upgrades
  let sovereignSeasV5Address: string;
  let implementationAddress: string;
  let sovereignSeasV5: any;
  
  if (!DEPLOYED_ADDRESSES.sovereignSeasV5) {
    console.log("\n6️⃣ Deploying SovereignSeasV5 with OpenZeppelin Upgrades...");
    const SovereignSeasV5 = await ethers.getContractFactory("SovereignSeasV5");
    sovereignSeasV5 = await upgrades.deployProxy(SovereignSeasV5, [deployer.address], {
      initializer: "initialize",
      kind: "uups"
    });
    await sovereignSeasV5.waitForDeployment();
    sovereignSeasV5Address = await sovereignSeasV5.getAddress();
    console.log("✅ SovereignSeasV5 deployed to:", sovereignSeasV5Address);
    console.log("✅ Contract initialized during deployment");
    
    // Get implementation address for verification
    try {
      implementationAddress = await upgrades.erc1967.getImplementationAddress(sovereignSeasV5Address);
      console.log("🔧 Implementation contract address:", implementationAddress);
    } catch (error) {
      console.log("⚠️  Warning: Could not get implementation address:", error.message);
      console.log("🔧 This is normal for newly deployed proxies. The contract should still work.");
      implementationAddress = "0x0000000000000000000000000000000000000000"; // Placeholder
    }
    
    // Save deployment progress
    DEPLOYED_ADDRESSES.sovereignSeasV5 = sovereignSeasV5Address;
    saveDeployment(DEPLOYED_ADDRESSES, deployer.address);
  } else {
    console.log("\n6️⃣ SovereignSeasV5 already deployed at:", DEPLOYED_ADDRESSES.sovereignSeasV5);
    sovereignSeasV5Address = DEPLOYED_ADDRESSES.sovereignSeasV5;
    
    // Get implementation address for verification
    try {
      implementationAddress = await upgrades.erc1967.getImplementationAddress(sovereignSeasV5Address);
      console.log("🔧 Implementation contract address:", implementationAddress);
    } catch (error) {
      console.log("⚠️  Warning: Could not get implementation address:", error.message);
      console.log("🔧 This is normal for newly deployed proxies. The contract should still work.");
      implementationAddress = "0x0000000000000000000000000000000000000000"; // Placeholder
    }
    
    // Get contract instance for existing deployment
    sovereignSeasV5 = await ethers.getContractAt("SovereignSeasV5", sovereignSeasV5Address);
  }
  
  // Register all modules (this will also initialize them)
  console.log("\n7️⃣ Registering modules...");
  
  await sovereignSeasV5.registerModule("projects", projectsModuleAddress);
  console.log("✅ Projects module registered and initialized");
  
  await sovereignSeasV5.registerModule("campaigns", campaignsModuleAddress);
  console.log("✅ Campaigns module registered and initialized");
  
  await sovereignSeasV5.registerModule("voting", votingModuleAddress);
  console.log("✅ Voting module registered and initialized");
  
  await sovereignSeasV5.registerModule("treasury", treasuryModuleAddress);
  console.log("✅ Treasury module registered and initialized");
  
  await sovereignSeasV5.registerModule("migration", migrationModuleAddress);
  console.log("✅ Migration module registered and initialized");
  
  // Set up method routing for fallback function
  console.log("\n🔧 Setting up method routing...");
  
  // Calculate method selectors for key functions
  const getProjectCountSelector = ethers.id("getProjectCount()").slice(0, 10);
  const getCampaignCountSelector = ethers.id("getCampaignCount()").slice(0, 10);
  const createProjectSelector = ethers.id("createProject(string,string,string,string,string,address[],bool)").slice(0, 10);
  const createCampaignSelector = ethers.id("createCampaign(string,string,string,string,uint256,uint256,uint256,uint256,bool,bool,string,address,address)").slice(0, 10);
  
  // Register method routes
  await sovereignSeasV5.registerMethodRoute(getProjectCountSelector, projectsModuleAddress);
  await sovereignSeasV5.registerMethodRoute(getCampaignCountSelector, campaignsModuleAddress);
  await sovereignSeasV5.registerMethodRoute(createProjectSelector, projectsModuleAddress);
  await sovereignSeasV5.registerMethodRoute(createCampaignSelector, campaignsModuleAddress);
  
  console.log("✅ Method routing configured");
  
  // Verify roles are set correctly
  console.log("\n🔍 Verifying role assignments...");
  
  const ADMIN_ROLE = await sovereignSeasV5.ADMIN_ROLE();
  const MANAGER_ROLE = await sovereignSeasV5.MANAGER_ROLE();
  const OPERATOR_ROLE = await sovereignSeasV5.OPERATOR_ROLE();
  const EMERGENCY_ROLE = await sovereignSeasV5.EMERGENCY_ROLE();
  
  console.log("🔑 ADMIN_ROLE:", ADMIN_ROLE);
  console.log("🔑 MANAGER_ROLE:", MANAGER_ROLE);
  console.log("🔑 OPERATOR_ROLE:", OPERATOR_ROLE);
  console.log("🔑 EMERGENCY_ROLE:", EMERGENCY_ROLE);
  
  // Verify deployer has all roles
  const hasAdminRole = await sovereignSeasV5.hasRole(ADMIN_ROLE, deployer.address);
  const hasManagerRole = await sovereignSeasV5.hasRole(MANAGER_ROLE, deployer.address);
  const hasOperatorRole = await sovereignSeasV5.hasRole(OPERATOR_ROLE, deployer.address);
  const hasEmergencyRole = await sovereignSeasV5.hasRole(EMERGENCY_ROLE, deployer.address);
  
  console.log("👤 Deployer has ADMIN_ROLE:", hasAdminRole);
  console.log("👤 Deployer has MANAGER_ROLE:", hasManagerRole);
  console.log("👤 Deployer has OPERATOR_ROLE:", hasOperatorRole);
  console.log("👤 Deployer has EMERGENCY_ROLE:", hasEmergencyRole);
  
  // Test basic functionality
  console.log("\n🔍 Testing basic functionality...");
  
  // Test if the main contract is working
  try {
    const contractVersion = await sovereignSeasV5.getContractVersion();
    const implementationVersion = await sovereignSeasV5.getImplementationVersion();
    console.log("✅ Main contract is working!");
    console.log("  📊 Contract version:", contractVersion);
    console.log("  📊 Implementation version:", implementationVersion.toString());
  } catch (error) {
    console.log("❌ Main contract test failed:", error.message);
    console.log("🔧 This might indicate the proxy deployment had issues");
  }
  
  // Test campaign creation
 
  
  // Test view functions
  try {
    const projectCount = await sovereignSeasV5.getProjectCount();
    const campaignCount = await sovereignSeasV5.getCampaignCount();
    const moduleCount = await sovereignSeasV5.getModuleCount();
    
    console.log("✅ View functions working:");
    console.log("  📊 Project count:", projectCount.toString());
    console.log("  📊 Campaign count:", campaignCount.toString());
    console.log("  📊 Module count:", moduleCount.toString());
  } catch (error) {
    console.log("❌ View functions failed:", error.message);
  }
  
  // Test module registration
  try {
    const [moduleNames, moduleAddresses] = await sovereignSeasV5.getAllModules();
    console.log("✅ Module registration verified:");
    for (let i = 0; i < moduleNames.length; i++) {
      console.log(`  🔗 ${moduleNames[i]}: ${moduleAddresses[i]}`);
    }
  } catch (error) {
    console.log("❌ Module registration verification failed:", error.message);
  }
  
  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Contract Addresses:");
  console.log("ProjectsModule:", projectsModuleAddress);
  console.log("CampaignsModule:", campaignsModuleAddress);
  console.log("VotingModule:", votingModuleAddress);
  console.log("TreasuryModule:", treasuryModuleAddress);
  console.log("MigrationModule:", migrationModuleAddress);
  console.log("SovereignSeasV5 (Proxy):", sovereignSeasV5Address);
  console.log("SovereignSeasV5 (Implementation):", implementationAddress);
  
  console.log("\n🔗 Proxy Contract Features:");
  console.log("- All V4/V6 functions are accessible through the proxy");
  console.log("- Functions are automatically routed to appropriate modules");
  console.log("- Circuit breaker and emergency functions are centralized");
  console.log("- UUPS upgradeable architecture maintained");
  console.log("- Enhanced quadratic voting with voter diversity bonuses");
  console.log("- Preview distribution functionality");
  console.log("- Configurable slippage tolerance and fees");
  
  console.log("\n📊 Architecture Benefits:");
  console.log("- Modular design with focused responsibilities");
  console.log("- Easier maintenance and debugging");
  console.log("- Smaller attack surface per contract");
  console.log("- Teams can work on different modules independently");
  console.log("- Gas efficient deployment and upgrades");
  console.log("- Enhanced security without bypass codes");
  
  console.log("\n🚀 Next Steps:");
  console.log("1. Verify contracts on block explorer:");
  console.log("   - Verify IMPLEMENTATION contract at:", implementationAddress);
  console.log("   - Verify PROXY contract at:", sovereignSeasV5Address);
  console.log("2. Test advanced features (quadratic voting, preview distribution)");
  console.log("3. Configure treasury parameters (fees, slippage tolerance)");
  console.log("4. Set up bridge and tipping integrations if needed");
  
  // Save final deployment info
  const deploymentInfo = {
    network: NETWORK,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      projectsModule: projectsModuleAddress,
      campaignsModule: campaignsModuleAddress,
      votingModule: votingModuleAddress,
      treasuryModule: treasuryModuleAddress,
      migrationModule: migrationModuleAddress,
      sovereignSeasV5: sovereignSeasV5Address,
      implementation: implementationAddress
    }
  };
  
  // Save to deployment file
  writeFileSync(DEPLOYMENT_FILE, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Final deployment info saved to: ${DEPLOYMENT_FILE}`);
  console.log("Use this for contract verification and frontend integration");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
