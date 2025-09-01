import hre from "hardhat";
import { loadLatestDeployment } from "./utils/deployments";

async function main() {
  console.log("🔍 Debugging Module Initialization...");
  console.log("=====================================");

  // Load latest deployment
  const deployment = loadLatestDeployment("alfajores");
  if (!deployment) {
    console.log("❌ No deployment found");
    return;
  }

  const { ethers } = hre;
  const [deployer] = await ethers.getSigners();

  console.log(`📝 Using deployer: ${deployer.address}`);
  console.log(`🌐 Network: alfajores`);
  console.log(`🏗️ Proxy: ${deployment.record.contracts.sovereignSeasV5}`);

  // Create proxy contract interface
  const proxyContract = new ethers.Contract(
    deployment.record.contracts.sovereignSeasV5,
    [
      "function isModuleRegistered(string moduleId) view returns (bool)",
      "function getModuleAddress(string moduleId) view returns (address)",
      "function getModulesInitializationStatus(string[] moduleIds) view returns (bool[])",
      "function hasRole(bytes32 role, address account) view returns (bool)",
      "function DEFAULT_ADMIN_ROLE() view returns (bytes32)"
    ],
    deployer
  );

  // Check admin role
  try {
    const adminRole = await proxyContract.DEFAULT_ADMIN_ROLE();
    const hasAdminRole = await proxyContract.hasRole(adminRole, deployer.address);
    console.log(`\n👑 Admin Role Check:`);
    console.log(`   Admin Role: ${adminRole}`);
    console.log(`   Deployer has admin role: ${hasAdminRole}`);
  } catch (error) {
    console.log(`❌ Failed to check admin role: ${error.message}`);
  }

  // Check module registration status
  const modules = ["projects", "campaigns", "voting", "treasury", "pools", "migration"];
  
  console.log(`\n📋 Module Registration Status:`);
  for (const moduleId of modules) {
    try {
      const isRegistered = await proxyContract.isModuleRegistered(moduleId);
      const moduleAddress = await proxyContract.getModuleAddress(moduleId);
      console.log(`   ${isRegistered ? "✅" : "❌"} ${moduleId}: ${moduleAddress}`);
    } catch (error) {
      console.log(`   ❌ ${moduleId}: Error checking status - ${error.message}`);
    }
  }

  // Check initialization status
  console.log(`\n🔧 Module Initialization Status:`);
  try {
    const initStatuses = await proxyContract.getModulesInitializationStatus(modules);
    for (let i = 0; i < modules.length; i++) {
      const status = initStatuses[i] ? "✅" : "❌";
      console.log(`   ${status} ${modules[i]}: ${initStatuses[i] ? "Initialized" : "Not Initialized"}`);
    }
  } catch (error) {
    console.log(`❌ Failed to check initialization status: ${error.message}`);
  }

  // Try to manually initialize a module to see the exact error
  console.log(`\n🧪 Testing Manual Initialization:`);
  try {
    console.log(`   Attempting to initialize projects module...`);
    const tx = await proxyContract.initializeModule("projects", "0x");
    console.log(`   ✅ Transaction sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);
    
  } catch (error: any) {
    console.log(`   ❌ Initialization failed: ${error.message}`);
    
    // Check if it's a revert with reason
    if (error.data) {
      console.log(`   📄 Error data: ${error.data}`);
    }
    
    // Check if it's a gas estimation error
    if (error.message.includes("gas")) {
      console.log(`   ⛽ Gas estimation failed`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
