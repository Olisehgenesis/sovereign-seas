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
    dataAggregatorModule: string;
    sovereignSeasV5: string;
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
  console.log("🚀 Starting Smart SovereignSeas V5 Deployment...");
  console.log("================================================");

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
  const existingDeployment = loadLatestDeployment(networkName);
  let deploymentConfig: DeploymentConfig;

  if (existingDeployment) {
    console.log(`📂 Found existing deployment: ${existingDeployment.path}`);
    deploymentConfig = existingDeployment.record;
    
    // Check which contracts are actually deployed on-chain
    console.log("\n🔍 Checking on-chain deployment status...");
    const contractStatuses = await checkOnChainStatus(deploymentConfig, deployer);
    
    // Show status summary
    console.log("\n📊 Deployment Status Summary:");
    console.log("=============================");
    for (const [contractName, status] of Object.entries(contractStatuses)) {
      const deployIcon = status.needsDeployment ? "🔨" : "✅";
      const initIcon = status.needsInitialization ? "⚙️" : "✅";
      console.log(`${deployIcon} ${contractName}: ${status.address || "Not deployed"} ${initIcon}`);
    }
    
    // Check if we need to deploy anything
    const needsDeployment = Object.values(contractStatuses).some(s => s.needsDeployment);
    const needsInitialization = Object.values(contractStatuses).some(s => s.needsInitialization);
    
    if (!needsDeployment && !needsInitialization) {
      console.log("\n🎉 All contracts are deployed and initialized! Nothing to do.");
      return;
    }
    
    if (needsDeployment) {
      console.log("\n🔨 Some contracts need deployment...");
    }
    
    if (needsInitialization) {
      console.log("\n⚙️ Some contracts need initialization...");
    }
  } else {
    console.log("📝 No existing deployment found. Creating new deployment config...");
    deploymentConfig = {
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
        dataAggregatorModule: "",
        sovereignSeasV5: "",
      },
    };
  }

  try {
    // Deploy missing contracts
    await deployMissingContracts(deploymentConfig, deployer);
    
    // Initialize missing contracts
    await initializeMissingContracts(deploymentConfig, deployer);
    
    // Save final deployment configuration
    saveDeployment(networkName, deploymentConfig);
    
    console.log("\n🎉 Smart deployment completed successfully!");
    console.log(`📁 Deployment saved to: deployments/${networkName}/${Date.now()}.json`);
    
  } catch (error) {
    console.error("💥 Deployment failed:", error);
    process.exit(1);
  }
}

async function checkOnChainStatus(
  deploymentConfig: DeploymentConfig, 
  deployer: any
): Promise<Record<string, ContractStatus>> {
  const statuses: Record<string, ContractStatus> = {};
  
  // Check each contract
  const contracts = [
    { name: "projectsModule", factory: "ProjectsModule" },
    { name: "campaignsModule", factory: "CampaignsModule" },
    { name: "votingModule", factory: "VotingModule" },
    { name: "treasuryModule", factory: "TreasuryModule" },
    { name: "poolsModule", factory: "PoolsModule" },
    { name: "migrationModule", factory: "MigrationModule" },
    { name: "dataAggregatorModule", factory: "DataAggregatorModule" },
    { name: "sovereignSeasV5", factory: "SovereignSeasV5" }
  ];
  
  for (const contract of contracts) {
    const address = deploymentConfig.contracts[contract.name as keyof typeof deploymentConfig.contracts];
    
    if (!address || address === "") {
      statuses[contract.name] = {
        address: "",
        isDeployed: false,
        isInitialized: false,
        needsDeployment: true,
        needsInitialization: false
      };
      continue;
    }
    
    // Check if contract exists at address
    const code = await ethers.provider.getCode(address);
    const isDeployed = code !== "0x";
    
    if (!isDeployed) {
      statuses[contract.name] = {
        address,
        isDeployed: false,
        isInitialized: false,
        needsDeployment: true,
        needsInitialization: false
      };
      continue;
    }
    
    // Check if contract is initialized
    let isInitialized = false;
    try {
      if (contract.name === "sovereignSeasV5") {
        // Check if proxy has admin role set
        const proxyContract = new ethers.Contract(
          address,
          ["function hasRole(bytes32 role, address account) view returns (bool)", "function DEFAULT_ADMIN_ROLE() view returns (bytes32)"],
          deployer
        );
        const adminRole = await proxyContract.DEFAULT_ADMIN_ROLE();
        isInitialized = await proxyContract.hasRole(adminRole, deployer.address);
      } else {
        // Check if module has proxy address set
        const moduleContract = new ethers.Contract(
          address,
          ["function sovereignSeasProxy() view returns (address)"],
          deployer
        );
        const proxyAddress = await moduleContract.sovereignSeasProxy();
        isInitialized = proxyAddress !== ethers.ZeroAddress;
      }
    } catch (error) {
      // If we can't check initialization, assume it needs initialization
      isInitialized = false;
    }
    
    statuses[contract.name] = {
      address,
      isDeployed: true,
      isInitialized,
      needsDeployment: false,
      needsInitialization: !isInitialized
    };
  }
  
  return statuses;
}

async function deployMissingContracts(
  deploymentConfig: DeploymentConfig, 
  deployer: any
) {
  console.log("\n🔨 Deploying missing contracts...");
  console.log("=================================");
  
  const contracts = [
    { name: "projectsModule", factory: "ProjectsModule" },
    { name: "campaignsModule", factory: "CampaignsModule" },
    { name: "votingModule", factory: "VotingModule" },
    { name: "treasuryModule", factory: "TreasuryModule" },
    { name: "poolsModule", factory: "PoolsModule" },
    { name: "migrationModule", factory: "MigrationModule" },
    { name: "dataAggregatorModule", factory: "DataAggregatorModule" },
    { name: "sovereignSeasV5", factory: "SovereignSeasV5" }
  ];
  
  for (const contract of contracts) {
    const address = deploymentConfig.contracts[contract.name as keyof typeof deploymentConfig.contracts];
    
    if (address && address !== "") {
      // Check if contract is actually deployed
      const code = await ethers.provider.getCode(address);
      if (code !== "0x") {
        console.log(`✅ ${contract.name} already deployed at: ${address}`);
        continue;
      }
    }
    
    console.log(`🔨 Deploying ${contract.name}...`);
    
    try {
      const ContractFactory = await ethers.getContractFactory(contract.factory);
      const deployedContract = await ContractFactory.deploy();
      await deployedContract.waitForDeployment();
      
      const deployedAddress = await deployedContract.getAddress();
      deploymentConfig.contracts[contract.name as keyof typeof deploymentConfig.contracts] = deployedAddress;
      
      console.log(`✅ ${contract.name} deployed to: ${deployedAddress}`);
      
    } catch (error) {
      console.error(`❌ Failed to deploy ${contract.name}:`, error);
      throw error;
    }
  }
}

async function initializeMissingContracts(
  deploymentConfig: DeploymentConfig, 
  deployer: any
) {
  console.log("\n⚙️ Initializing missing contracts...");
  console.log("=====================================");
  
  // Initialize main proxy first if needed
  const proxyAddress = deploymentConfig.contracts.sovereignSeasV5;
  if (proxyAddress && proxyAddress !== "") {
    const proxyContract = new ethers.Contract(
      proxyAddress,
      [
        "function hasRole(bytes32 role, address account) view returns (bool)",
        "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
        "function initialize(address admin)"
      ],
      deployer
    );
    
    try {
      const adminRole = await proxyContract.DEFAULT_ADMIN_ROLE();
      const hasAdminRole = await proxyContract.hasRole(adminRole, deployer.address);
      
      if (!hasAdminRole) {
        console.log("🔧 Initializing SovereignSeas V5 Proxy...");
        const tx = await proxyContract.initialize(deployer.address);
        await tx.wait();
        console.log("✅ Proxy initialized");
      } else {
        console.log("✅ Proxy already initialized");
      }
    } catch (error) {
      console.error("❌ Failed to initialize proxy:", error);
      throw error;
    }
  }
  
  // Register modules if needed
  await registerMissingModules(deploymentConfig, deployer);
  
  // Initialize modules if needed
  await initializeMissingModules(deploymentConfig, deployer);
}

async function registerMissingModules(
  deploymentConfig: DeploymentConfig, 
  deployer: any
) {
  console.log("\n📋 Registering missing modules...");
  console.log("==================================");
  
  const proxyContract = new ethers.Contract(
    deploymentConfig.contracts.sovereignSeasV5,
    [
      "function isModuleRegistered(string moduleId) view returns (bool)",
      "function registerModule(string moduleId, address moduleAddress, string[] dependencies)"
    ],
    deployer
  );
  
  const modules = [
    { id: "projects", address: deploymentConfig.contracts.projectsModule, dependencies: [] },
    { id: "campaigns", address: deploymentConfig.contracts.campaignsModule, dependencies: ["projects"] },
    { id: "voting", address: deploymentConfig.contracts.votingModule, dependencies: ["projects", "campaigns"] },
    { id: "treasury", address: deploymentConfig.contracts.treasuryModule, dependencies: [] },
    { id: "pools", address: deploymentConfig.contracts.poolsModule, dependencies: ["projects", "campaigns", "treasury"] },
    { id: "migration", address: deploymentConfig.contracts.migrationModule, dependencies: ["projects", "campaigns", "voting", "treasury", "pools"] },
    { id: "dataAggregator", address: deploymentConfig.contracts.dataAggregatorModule, dependencies: ["projects", "campaigns", "migration"] }
  ];
  
  for (const module of modules) {
    try {
      const isRegistered = await proxyContract.isModuleRegistered(module.id);
      
      if (!isRegistered) {
        console.log(`📋 Registering ${module.id} module...`);
        const tx = await proxyContract.registerModule(module.id, module.address, module.dependencies);
        await tx.wait();
        console.log(`✅ ${module.id} module registered`);
      } else {
        console.log(`✅ ${module.id} module already registered`);
      }
    } catch (error) {
      console.error(`❌ Failed to register ${module.id} module:`, error);
      throw error;
    }
  }
}

async function initializeMissingModules(
  deploymentConfig: DeploymentConfig, 
  deployer: any
) {
  console.log("\n🔧 Initializing missing modules...");
  console.log("===================================");
  
  const proxyContract = new ethers.Contract(
    deploymentConfig.contracts.sovereignSeasV5,
    [
      "function initializeModule(string moduleId, bytes data) returns (bool)",
      "function initializeModulesBatch(string[] moduleIds, bytes[] dataArray) returns (bool[])",
      "function getModulesInitializationStatus(string[] moduleIds) view returns (bool[])"
    ],
    deployer
  );
  
  const modules = ["projects", "campaigns", "voting", "treasury", "pools", "migration", "dataAggregator"];
  
  try {
    // Try batch initialization first
    console.log("🚀 Attempting batch initialization...");
    // Use empty bytes array for proper type compatibility with Solidity
    const initDataArray = new Array(modules.length).fill("0x");
    
    // Add better error handling
    const tx = await proxyContract.initializeModulesBatch(modules, initDataArray);
    
    console.log(`⏳ Waiting for batch initialization transaction: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Batch initialization completed in block ${receipt.blockNumber}`);
    
    // Get initialization status using the new view function
    const results = await proxyContract.getModulesInitializationStatus(modules);
    console.log("\n📊 Initialization Results:");
    for (let i = 0; i < modules.length; i++) {
      const status = results[i] ? "✅" : "❌";
      console.log(`   ${status} ${modules[i]}: ${results[i] ? "Success" : "Failed"}`);
    }
    
    // Check if any modules failed initialization
    const failedModules = results.map((success, index) => ({ success, moduleId: modules[index] }))
      .filter(item => !item.success);
    
          if (failedModules.length > 0) {
        console.log(`\n⚠️ ${failedModules.length} modules failed batch initialization, retrying individually...`);
        await initializeFailedModulesIndividually(proxyContract, failedModules.map(m => m.moduleId), deployer);
      }
    
  } catch (error: any) {
    console.log(`⚠️ Batch initialization failed: ${error.message}`);
    console.log("🔄 Falling back to individual initialization...");
    
    // Fallback to individual initialization
    await initializeFailedModulesIndividually(proxyContract, modules, deployer);
  }
}

/**
 * Initialize failed modules individually with better error handling
 */
async function initializeFailedModulesIndividually(
  proxyContract: any, 
  moduleIds: string[],
  deployer: any
) {
  for (const moduleId of moduleIds) {
    try {
      console.log(`🔧 Initializing ${moduleId} module individually...`);
      
      // Check if module is already initialized by calling isActive() function
      try {
        const moduleContract = new ethers.Contract(
          await proxyContract.modules(moduleId),
          ["function isActive() view returns (bool)"],
          deployer
        );
        const isActive = await moduleContract.isActive();
        if (isActive) {
          console.log(`✅ ${moduleId} module already initialized`);
          continue;
        }
      } catch (error) {
        // If we can't check status, proceed with initialization
        console.log(`⚠️ Could not check ${moduleId} status, proceeding with initialization...`);
      }
      
      const tx = await proxyContract.initializeModule(moduleId, "0x");
      
      console.log(`⏳ Waiting for ${moduleId} initialization: ${tx.hash}`);
      await tx.wait();
      console.log(`✅ ${moduleId} module initialized successfully`);
      
    } catch (error: any) {
      if (error.message.includes("already initialized") || error.message.includes("Module is active")) {
        console.log(`✅ ${moduleId} module already initialized`);
      } else {
        console.error(`❌ Failed to initialize ${moduleId} module:`, error.message);
        // Continue with other modules instead of throwing
        console.log(`⚠️ Continuing with remaining modules...`);
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
