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
    seasToken?: string;
  };
}

interface ContractStatus {
  address: string;
  isDeployed: boolean;
  isInitialized: boolean;
  needsDeployment: boolean;
  needsInitialization: boolean;
}

async function main() {
  console.log("🚀 Starting Enhanced SovereignSeas V5 Deployment...");
  console.log("==================================================");
  console.log("🎯 Features: Token Weight System + Manual Rate Fallback");
  console.log("");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying from: ${deployer.address}`);

  // Network configuration
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "hardhat" : network.name;
  console.log(`🌐 Network: ${networkName}`);

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Deployer balance: ${ethers.formatEther(balance)} ETH`);

  if (balance < ethers.parseEther("0.01")) {
    console.log("❌ Insufficient balance for deployment");
    return;
  }

  // Load existing deployment if available
  let existingDeployment: DeploymentConfig | null = null;
  try {
    const deploymentResult = loadLatestDeployment(networkName);
    if (deploymentResult) {
      existingDeployment = deploymentResult.record;
      console.log(`📋 Found existing deployment: ${existingDeployment.timestamp}`);
    }
  } catch (error) {
    console.log("📋 No existing deployment found, starting fresh");
  }

  // Check if we should preserve test wallets
  const preserveTestWallets = process.env.PRESERVE_TEST_WALLETS === "true";
  console.log(`🔒 Preserve test wallets: ${preserveTestWallets ? "YES" : "NO"}`);

  // Deployment configuration
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
    }
  };

  console.log("\n🏗️ Deploying Enhanced Contracts...");
  console.log("===================================");

  // Deploy modules in dependency order
  const modules = [
    { name: "ProjectsModule", key: "projectsModule" },
    { name: "CampaignsModule", key: "campaignsModule" },
    { name: "VotingModule", key: "votingModule" },
    { name: "TreasuryModule", key: "treasuryModule" },
    { name: "PoolsModule", key: "poolsModule" },
    { name: "MigrationModule", key: "migrationModule" },
  ];

  for (const module of modules) {
    console.log(`\n📦 Deploying ${module.name}...`);
    
    const contractFactory = await ethers.getContractFactory(module.name);
    const contract = await contractFactory.deploy();
    await contract.waitForDeployment();
    
    const address = await contract.getAddress();
    deploymentConfig.contracts[module.key as keyof typeof deploymentConfig.contracts] = address;
    
    console.log(`✅ ${module.name} deployed to: ${address}`);
    
    // Verify deployment
    const code = await ethers.provider.getCode(address);
    if (code === "0x") {
      throw new Error(`❌ ${module.name} deployment failed - no code at address`);
    }
  }

  // Deploy SEAS Token (if not preserving existing)
  if (!preserveTestWallets || !existingDeployment?.contracts.seasToken) {
    console.log(`\n🪙 Deploying SEAS Token...`);
    
    const seasTokenFactory = await ethers.getContractFactory("SEASToken");
    const seasToken = await seasTokenFactory.deploy();
    await seasToken.waitForDeployment();
    
    const seasTokenAddress = await seasToken.getAddress();
    deploymentConfig.contracts.seasToken = seasTokenAddress;
    
    console.log(`✅ SEAS Token deployed to: ${seasTokenAddress}`);
  } else {
    console.log(`\n🪙 Preserving existing SEAS Token: ${existingDeployment.contracts.seasToken}`);
    deploymentConfig.contracts.seasToken = existingDeployment.contracts.seasToken;
  }

  // Deploy SovereignSeas V5 Proxy
  console.log(`\n🏛️ Deploying SovereignSeas V5 Proxy...`);
  
  const proxyFactory = await ethers.getContractFactory("SovereignSeasV5");
  const proxy = await proxyFactory.deploy();
  await proxy.waitForDeployment();
  
  const proxyAddress = await proxy.getAddress();
  deploymentConfig.contracts.sovereignSeasV5 = proxyAddress;
  
  console.log(`✅ SovereignSeas V5 Proxy deployed to: ${proxyAddress}`);

  // Initialize the proxy
  console.log(`\n🔧 Initializing SovereignSeas V5 Proxy...`);
  
  const initTx = await proxy.initialize();
  await initTx.wait();
  console.log(`✅ Proxy initialized`);

  // Register modules
  console.log(`\n📋 Registering modules...`);
  
  const moduleDependencies = {
    projects: [],
    campaigns: ["projects"],
    voting: ["projects", "campaigns"],
    treasury: [],
    pools: ["projects", "campaigns", "treasury"],
    migration: ["projects", "campaigns", "voting", "treasury", "pools"]
  };

  for (const [moduleId, dependencies] of Object.entries(moduleDependencies)) {
    const moduleAddress = deploymentConfig.contracts[`${moduleId}Module` as keyof typeof deploymentConfig.contracts];
    
    console.log(`   📝 Registering ${moduleId} module...`);
    const registerTx = await proxy.registerModule(moduleId, moduleAddress, dependencies);
    await registerTx.wait();
    console.log(`   ✅ ${moduleId} module registered`);
  }

  // Initialize modules
  console.log(`\n🔧 Initializing modules...`);
  
  for (const module of modules) {
    const moduleId = module.name.replace("Module", "").toLowerCase();
    const moduleAddress = deploymentConfig.contracts[module.key as keyof typeof deploymentConfig.contracts];
    
    console.log(`   🔧 Initializing ${moduleId} module...`);
    
    // Get the module contract
    if (!moduleAddress) {
      throw new Error(`Module address not found for ${module.name}`);
    }
    const moduleContract = await ethers.getContractAt(module.name, moduleAddress);
    
    // Initialize the module
    const initTx = await moduleContract.initialize(proxyAddress, "0x");
    await initTx.wait();
    
    console.log(`   ✅ ${moduleId} module initialized`);
  }

  // Set up enhanced features
  console.log(`\n🎯 Setting up enhanced features...`);
  
  // Set up TreasuryModule with enhanced features
  const treasuryModule = await ethers.getContractAt("TreasuryModule", deploymentConfig.contracts.treasuryModule);
  
  // Set up Mento broker (if available)
  try {
    // This would be set to the actual Mento broker address on Celo
    const mentoBrokerAddress = "0x0000000000000000000000000000000000000000"; // Placeholder
    console.log(`   📊 Mento broker setup (placeholder): ${mentoBrokerAddress}`);
  } catch (error) {
    console.log(`   ⚠️ Mento broker setup skipped: ${error.message}`);
  }

  // Set up VotingModule with enhanced features
  const votingModule = await ethers.getContractAt("VotingModule", deploymentConfig.contracts.votingModule);
  
  // Enable SEAS token for voting (if SEAS token exists)
  if (deploymentConfig.contracts.seasToken) {
    console.log(`   🔓 Enabling SEAS token for voting...`);
    const enableTx = await votingModule.setVotingToken(deploymentConfig.contracts.seasToken, true);
    await enableTx.wait();
    console.log(`   ✅ SEAS token enabled for voting`);
  }

  // Set up CampaignsModule with enhanced features
  const campaignsModule = await ethers.getContractAt("CampaignsModule", deploymentConfig.contracts.campaignsModule);
  
  // Set default fees to zero for testing
  console.log(`   💰 Setting test fees...`);
  const setFeesTx = await campaignsModule.setZeroFeesForTesting();
  await setFeesTx.wait();
  console.log(`   ✅ Test fees set to zero`);

  // Save deployment
  console.log(`\n💾 Saving deployment...`);
  const deploymentPath = saveDeployment(networkName, deploymentConfig);
  console.log(`✅ Deployment saved to: ${deploymentPath}`);

  // Generate deployment summary
  console.log(`\n📊 Deployment Summary`);
  console.log("===================");
  console.log(`🌐 Network: ${networkName}`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`⏰ Timestamp: ${deploymentConfig.timestamp}`);
  console.log(`🔒 Preserve Test Wallets: ${preserveTestWallets ? "YES" : "NO"}`);
  console.log("");
  console.log("📦 Contract Addresses:");
  console.log(`   🏛️ SovereignSeas V5: ${deploymentConfig.contracts.sovereignSeasV5}`);
  console.log(`   📋 Projects Module: ${deploymentConfig.contracts.projectsModule}`);
  console.log(`   🎯 Campaigns Module: ${deploymentConfig.contracts.campaignsModule}`);
  console.log(`   🗳️ Voting Module: ${deploymentConfig.contracts.votingModule}`);
  console.log(`   💰 Treasury Module: ${deploymentConfig.contracts.treasuryModule}`);
  console.log(`   🏊 Pools Module: ${deploymentConfig.contracts.poolsModule}`);
  console.log(`   🔄 Migration Module: ${deploymentConfig.contracts.migrationModule}`);
  if (deploymentConfig.contracts.seasToken) {
    console.log(`   🪙 SEAS Token: ${deploymentConfig.contracts.seasToken}`);
  }
  console.log("");
  console.log("🎯 Enhanced Features:");
  console.log("   ✅ Token Weight System for ERC20 Campaigns");
  console.log("   ✅ Manual Rate Fallback for CELO Campaigns");
  console.log("   ✅ Enhanced Voting Logic with Position Tracking");
  console.log("   ✅ Admin Token Weight Management");
  console.log("   ✅ Conversion Health Monitoring");
  console.log("");
  console.log("🚀 Deployment completed successfully!");
  console.log("💡 Run the comprehensive test to verify all features work correctly.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
