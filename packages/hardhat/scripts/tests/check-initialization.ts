import { createPublicClient, http } from "viem";
import { celoAlfajores } from "viem/chains";
import * as fs from "fs";
import * as path from "path";
import { ensureDeployment } from "./state";

// Import ABIs from artifacts
const SOVEREIGN_SEAS_V5_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "v5", "SovereignSeasV5.sol", "SovereignSeasV5.json"), 
  "utf8"
)).abi;

const PROJECTS_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "v5", "modules", "ProjectsModule.sol", "ProjectsModule.json"), 
  "utf8"
)).abi;

async function main() {
  console.log("🔍 Checking SovereignSeas V5 Initialization Status");
  console.log("=================================================");

  // Load deployment
  const deployment = ensureDeployment("alfajores");
  console.log(`📋 Using deployment: ${deployment.path}`);
  console.log(`🌐 Network: ${deployment.record.network}`);

  const publicClient = createPublicClient({ 
    chain: celoAlfajores, 
    transport: http("https://alfajores-forno.celo-testnet.org") 
  });

  const mainContractAddress = deployment.record.contracts.sovereignSeasV5;
  const projectsModuleAddress = deployment.record.contracts.projectsModule;

  console.log(`\n📊 Contract Addresses:`);
  console.log(`   Main Contract: ${mainContractAddress}`);
  console.log(`   Projects Module: ${projectsModuleAddress}`);

  try {
    // 1. Check if main contract is initialized
    console.log(`\n🔍 Checking main contract initialization...`);
    
    const isPaused = await publicClient.readContract({
      address: mainContractAddress as `0x${string}`,
      abi: SOVEREIGN_SEAS_V5_ABI,
      functionName: "isPaused",
      args: [],
    });
    
    console.log(`   Paused: ${isPaused}`);

    // 2. Check module registration
    console.log(`\n🔍 Checking module registration...`);
    
    const isProjectsRegistered = await publicClient.readContract({
      address: mainContractAddress as `0x${string}`,
      abi: SOVEREIGN_SEAS_V5_ABI,
      functionName: "isModuleRegistered",
      args: ["projects"],
    });
    
    console.log(`   Projects module registered: ${isProjectsRegistered}`);

    let projectsModuleRegisteredAddress: string | undefined;
    if (isProjectsRegistered) {
      const moduleAddress = await publicClient.readContract({
        address: mainContractAddress as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI,
        functionName: "getModuleAddress",
        args: ["projects"],
      });
      
      projectsModuleRegisteredAddress = moduleAddress as string;
      console.log(`   Projects module address: ${projectsModuleRegisteredAddress}`);
      console.log(`   Expected address: ${projectsModuleAddress}`);
      console.log(`   Addresses match: ${projectsModuleRegisteredAddress.toLowerCase() === projectsModuleAddress.toLowerCase()}`);
    }

    // 3. Check all registered modules
    console.log(`\n🔍 Checking all registered modules...`);
    
    const registeredModules = await publicClient.readContract({
      address: mainContractAddress as `0x${string}`,
      abi: SOVEREIGN_SEAS_V5_ABI,
      functionName: "getRegisteredModules",
      args: [],
    }) as string[];
    
    console.log(`   Total registered modules: ${registeredModules.length}`);
    
    for (const moduleId of registeredModules) {
      const moduleAddress = await publicClient.readContract({
        address: mainContractAddress as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI,
        functionName: "getModuleAddress",
        args: [moduleId],
      });
      
      const isActive = await publicClient.readContract({
        address: mainContractAddress as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI,
        functionName: "moduleActive",
        args: [moduleId],
      });
      
      console.log(`   - ${moduleId}: ${moduleAddress} (${isActive ? "Active" : "Inactive"})`);
    }

    // 4. Check ProjectsModule initialization
    console.log(`\n🔍 Checking ProjectsModule initialization...`);
    
    try {
      const moduleId = await publicClient.readContract({
        address: projectsModuleAddress as `0x${string}`,
        abi: PROJECTS_MODULE_ABI,
        functionName: "moduleName",
        args: [],
      });
      
      const moduleVersion = await publicClient.readContract({
        address: projectsModuleAddress as `0x${string}`,
        abi: PROJECTS_MODULE_ABI,
        functionName: "getModuleVersion",
        args: [],
      });
      
      const moduleActive = await publicClient.readContract({
        address: projectsModuleAddress as `0x${string}`,
        abi: PROJECTS_MODULE_ABI,
        functionName: "moduleActive",
        args: [],
      });
      
      console.log(`   Module Name: ${moduleId}`);
      console.log(`   Module Version: ${moduleVersion}`);
      console.log(`   Module Active: ${moduleActive}`);
      
    } catch (error) {
      console.log(`   ❌ Error reading ProjectsModule: ${error.message}`);
    }

    // 5. Summary and recommendations
    console.log(`\n📋 Summary:`);
    
    if (!isProjectsRegistered) {
      console.log(`   ❌ Projects module is NOT registered in main contract`);
      console.log(`   💡 Need to run deployment script to register modules`);
    } else if (projectsModuleRegisteredAddress && projectsModuleRegisteredAddress.toLowerCase() !== projectsModuleAddress.toLowerCase()) {
      console.log(`   ⚠️  Projects module registered but address mismatch`);
      console.log(`   💡 Need to update module registration`);
    } else {
      console.log(`   ✅ Projects module properly registered and active`);
    }

    console.log(`\n🔧 To fix module registration issues:`);
    console.log(`   1. Run: pnpm run deploy:v5:testnet --redeploy`);
    console.log(`   2. Or manually register modules using admin functions`);

  } catch (error) {
    console.error(`❌ Error checking initialization:`, error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
