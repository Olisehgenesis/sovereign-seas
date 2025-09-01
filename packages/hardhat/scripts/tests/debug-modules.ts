import { createPublicClient, http } from "viem";
import { celoAlfajores } from "viem/chains";
import * as fs from "fs";
import * as path from "path";
import { ensureDeployment } from "./state";

// Import ABIs
const SOVEREIGN_SEAS_V5_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "v5", "SovereignSeasV5.sol", "SovereignSeasV5.json"), 
  "utf8"
)).abi;

async function debugModules() {
  console.log("🔍 Debugging SovereignSeas V5 Modules");
  console.log("=" .repeat(50));

  // Load deployment
  const deployment = ensureDeployment("alfajores");
  console.log(`📋 Deployment: ${deployment.path}`);
  console.log(`🏗️ Main Contract: ${deployment.record.contracts.sovereignSeasV5}`);

  // Create public client
  const publicClient = createPublicClient({ 
    chain: celoAlfajores, 
    transport: http("https://alfajores-forno.celo-testnet.org") 
  });

  try {
    // Check if main contract exists
    const code = await publicClient.getBytecode({ 
      address: deployment.record.contracts.sovereignSeasV5 as `0x${string}` 
    });
    
    if (!code || code === "0x") {
      console.log("❌ Main contract has no bytecode - not deployed or wrong address");
      return;
    }
    
    console.log("✅ Main contract bytecode found");

    // Get registered modules
    console.log("\n📋 Checking registered modules...");
    try {
      const registeredModules = await publicClient.readContract({
        address: deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI,
        functionName: "getRegisteredModules",
        args: [],
      }) as string[];
      
      console.log(`📊 Total registered modules: ${registeredModules.length}`);
      
      for (const moduleId of registeredModules) {
        console.log(`\n🔍 Module: ${moduleId}`);
        
        // Get module address
        const moduleAddress = await publicClient.readContract({
          address: deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
          abi: SOVEREIGN_SEAS_V5_ABI,
          functionName: "getModuleAddress",
          args: [moduleId],
        });
        
        console.log(`   Address: ${moduleAddress}`);
        
        // Check if module is active
        try {
          const isActive = await publicClient.readContract({
            address: deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
            abi: SOVEREIGN_SEAS_V5_ABI,
            functionName: "staticCallModule",
            args: [moduleId, "0x"], // Empty call to test accessibility
          });
          console.log(`   Status: Active (can be called)`);
        } catch (error) {
          console.log(`   Status: Inactive or error - ${error.message}`);
        }
        
        // Get dependencies
        try {
          const dependencies = await publicClient.readContract({
            address: deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
            abi: SOVEREIGN_SEAS_V5_ABI,
            functionName: "getModuleDependencies",
            args: [moduleId],
          }) as string[];
          
          if (dependencies.length > 0) {
            console.log(`   Dependencies: ${dependencies.join(", ")}`);
          } else {
            console.log(`   Dependencies: None`);
          }
        } catch (error) {
          console.log(`   Dependencies: Error - ${error.message}`);
        }
      }
      
      // Check if "projects" module exists
      const projectsModuleExists = registeredModules.includes("projects");
      console.log(`\n🎯 Projects module registered: ${projectsModuleExists ? "✅ Yes" : "❌ No"}`);
      
      if (projectsModuleExists) {
        console.log("🔍 Testing projects module accessibility...");
        try {
          const projectCount = await publicClient.readContract({
            address: deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
            abi: SOVEREIGN_SEAS_V5_ABI,
            functionName: "staticCallModule",
            args: ["projects", "0x"], // We'll test with a proper call later
          });
          console.log("✅ Projects module is accessible");
        } catch (error) {
          console.log(`❌ Projects module error: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.log(`❌ Error reading modules: ${error.message}`);
    }

    // Check system status
    console.log("\n🔧 Checking system status...");
    try {
      const isPaused = await publicClient.readContract({
        address: deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI,
        functionName: "isPaused",
        args: [],
      });
      
      console.log(`⏸️  System paused: ${isPaused ? "Yes" : "No"}`);
      
      if (isPaused) {
        console.log("⚠️  System is paused - this could cause transaction reverts");
      }
    } catch (error) {
      console.log(`❌ Error checking system status: ${error.message}`);
    }

  } catch (error) {
    console.error("💥 Fatal error:", error);
  }
}

debugModules().catch(console.error);
