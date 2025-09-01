import hre from "hardhat";
import { loadLatestDeployment } from "./utils/deployments";
const { ethers } = hre;

interface ContractStatus {
  address: string;
  isDeployed: boolean;
  isInitialized: boolean;
  needsDeployment: boolean;
  needsInitialization: boolean;
  error?: string;
}

async function main() {
  console.log("🔍 Checking SovereignSeas V5 Deployment Status...");
  console.log("================================================");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deployer: ${deployer.address}`);

  // Network configuration
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "hardhat" : network.name;
  console.log(`🌐 Network: ${networkName}`);

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Deployer balance: ${ethers.formatEther(balance)} ETH`);

  // Load existing deployment if available
  const existingDeployment = loadLatestDeployment(networkName);
  
  if (!existingDeployment) {
    console.log("\n❌ No deployment configuration found!");
    console.log("💡 Run the deployment script first to create a deployment configuration.");
    return;
  }

  console.log(`\n📂 Found deployment configuration: ${existingDeployment.path}`);
  console.log(`📅 Deployed: ${existingDeployment.record.timestamp}`);
  
  // Check which contracts are actually deployed on-chain
  console.log("\n🔍 Checking on-chain deployment status...");
  const contractStatuses = await checkOnChainStatus(existingDeployment.record, deployer);
  
  // Show detailed status
  console.log("\n📊 Detailed Deployment Status:");
  console.log("===============================");
  
  let totalDeployed = 0;
  let totalInitialized = 0;
  let needsDeployment = 0;
  let needsInitialization = 0;
  
  for (const [contractName, status] of Object.entries(contractStatuses)) {
    const deployIcon = status.needsDeployment ? "🔨" : "✅";
    const initIcon = status.needsInitialization ? "⚙️" : "✅";
    const address = status.address || "Not deployed";
    
    console.log(`\n${deployIcon} ${contractName}:`);
    console.log(`   Address: ${address}`);
    console.log(`   Deployed: ${status.isDeployed ? "Yes" : "No"}`);
    console.log(`   Initialized: ${status.isInitialized ? "Yes" : "No"}`);
    
    if (status.error) {
      console.log(`   Error: ${status.error}`);
    }
    
    if (status.isDeployed) totalDeployed++;
    if (status.isInitialized) totalInitialized++;
    if (status.needsDeployment) needsDeployment++;
    if (status.needsInitialization) needsInitialization++;
  }
  
  // Summary
  console.log("\n📋 Summary:");
  console.log("============");
  console.log(`🔨 Contracts deployed: ${totalDeployed}/7`);
  console.log(`⚙️ Contracts initialized: ${totalInitialized}/7`);
  console.log(`🔨 Needs deployment: ${needsDeployment}`);
  console.log(`⚙️ Needs initialization: ${needsInitialization}`);
  
  // Recommendations
  console.log("\n💡 Recommendations:");
  console.log("===================");
  
  if (needsDeployment > 0) {
    console.log(`🔨 Deploy ${needsDeployment} missing contract(s)`);
  }
  
  if (needsInitialization > 0) {
    console.log(`⚙️ Initialize ${needsInitialization} contract(s)`);
  }
  
  if (needsDeployment === 0 && needsInitialization === 0) {
    console.log("🎉 All contracts are deployed and initialized!");
    console.log("✅ Your system is ready to use!");
  } else {
    console.log("\n🚀 To fix deployment issues, run:");
    console.log("   npx hardhat run scripts/deploy-v5-smart.ts --network <network>");
  }
  
  // Check if system is functional
  if (totalDeployed === 7 && totalInitialized === 7) {
    console.log("\n🧪 Testing system functionality...");
    await testSystemFunctionality(existingDeployment.record, deployer);
  }
}

async function checkOnChainStatus(
  deploymentConfig: any, 
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
    { name: "sovereignSeasV5", factory: "SovereignSeasV5" }
  ];
  
  for (const contract of contracts) {
    const address = deploymentConfig.contracts[contract.name];
    
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
    let isDeployed = false;
    try {
      const code = await ethers.provider.getCode(address);
      isDeployed = code !== "0x";
    } catch (error) {
      statuses[contract.name] = {
        address,
        isDeployed: false,
        isInitialized: false,
        needsDeployment: true,
        needsInitialization: false,
        error: `Failed to check code: ${error.message}`
      };
      continue;
    }
    
    if (!isDeployed) {
      statuses[contract.name] = {
        address,
        isDeployed: false,
        isInitialized: false,
        needsDeployment: true,
        needsInitialization: false,
        error: "No contract code at address"
      };
      continue;
    }
    
    // Check if contract is initialized
    let isInitialized = false;
    let error: string | undefined;
    
    try {
      if (contract.name === "sovereignSeasV5") {
        // Check if proxy has admin role set
        const proxyContract = new ethers.Contract(
          address,
          [
            "function hasRole(bytes32 role, address account) view returns (bool)",
            "function DEFAULT_ADMIN_ROLE() view returns (bytes32)"
          ],
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
    } catch (err: any) {
      error = `Failed to check initialization: ${err.message}`;
      isInitialized = false;
    }
    
    statuses[contract.name] = {
      address,
      isDeployed: true,
      isInitialized,
      needsDeployment: false,
      needsInitialization: !isInitialized,
      error
    };
  }
  
  return statuses;
}

async function testSystemFunctionality(deploymentConfig: any, deployer: any) {
  try {
    const proxyAddress = deploymentConfig.contracts.sovereignSeasV5;
    
    if (!proxyAddress) {
      console.log("❌ No proxy address found");
      return;
    }
    
    const proxyContract = new ethers.Contract(
      proxyAddress,
      [
        "function getRegisteredModules() view returns (string[])",
        "function moduleActive(string moduleId) view returns (bool)",
        "function isPaused() view returns (bool)"
      ],
      deployer
    );
    
    // Check system status
    const isPaused = await proxyContract.isPaused();
    console.log(`   System paused: ${isPaused ? "Yes" : "No"}`);
    
    // Check registered modules
    const registeredModules = await proxyContract.getRegisteredModules();
    console.log(`   Registered modules: ${registeredModules.length}`);
    
    // Check module status
    for (const moduleId of registeredModules) {
      try {
        const isActive = await proxyContract.moduleActive(moduleId);
        const status = isActive ? "✅" : "❌";
        console.log(`   ${status} ${moduleId}: ${isActive ? "Active" : "Inactive"}`);
      } catch (error) {
        console.log(`   ❓ ${moduleId}: Error checking status`);
      }
    }
    
    console.log("\n🎯 System appears to be functional!");
    
  } catch (error: any) {
    console.log(`❌ Failed to test system functionality: ${error.message}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
