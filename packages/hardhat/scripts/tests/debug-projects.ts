import { createPublicClient, createWalletClient, http, parseEther, encodeFunctionData, decodeErrorResult } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "viem/chains";
import * as fs from "fs";
import * as path from "path";

// Import ABIs
const SOVEREIGN_SEAS_V5_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "v5", "SovereignSeasV5.sol", "SovereignSeasV5.json"), 
  "utf8"
)).abi;

const PROJECTS_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "v5", "modules", "ProjectsModule.sol", "ProjectsModule.json"), 
  "utf8"
)).abi;

const BASE_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "v5", "base", "BaseModule.sol", "BaseModule.json"), 
  "utf8"
)).abi;

async function detailedDebug() {
  const network = "alfajores";
  const rpcUrl = "https://alfajores-forno.celo-testnet.org";
  
  // Load deployment
  const deploymentPath = path.join(__dirname, "..", "..", "deployments", network, "latest.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  
  // Load test wallet
  const walletsPath = path.join(__dirname, "..", "..", "wallets", `${network}-wallets.json`);
  const wallets = JSON.parse(fs.readFileSync(walletsPath, "utf8")).wallets;
  const testWallet = wallets[0];
  
  const publicClient = createPublicClient({ 
    chain: celoAlfajores, 
    transport: http(rpcUrl) 
  });
  
  console.log("🔬 Detailed Transaction Debug");
  console.log("============================");
  
  try {
    // Step 1: Check all module states individually
    console.log("\n🔍 Checking Module States...");
    
    // Check projects module directly
    const projectsModuleActive = await publicClient.readContract({
      address: deployment.contracts.projectsModule as `0x${string}`,
      abi: PROJECTS_MODULE_ABI,
      functionName: "isActive",
      args: [],
    });
    console.log(`Projects module active: ${projectsModuleActive}`);
    
    const projectsModulePaused = await publicClient.readContract({
      address: deployment.contracts.projectsModule as `0x${string}`,
      abi: BASE_MODULE_ABI,
      functionName: "modulePaused",
      args: [],
    });
    console.log(`Projects module paused: ${projectsModulePaused}`);
    
    // Check proxy state
    const proxyPaused = await publicClient.readContract({
      address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
      abi: SOVEREIGN_SEAS_V5_ABI,
      functionName: "isPaused",
      args: [],
    });
    console.log(`Proxy paused: ${proxyPaused}`);
    
    // Step 2: Test individual components of createProject
    console.log("\n🧪 Testing Individual Components...");
    
    // Test 1: Simple fee-only transaction (to isolate fee logic)
    console.log("Testing fee collection isolation...");
    try {
      const account = privateKeyToAccount(testWallet.privateKey);
      const walletClient = createWalletClient({
        chain: celoAlfajores,
        transport: http(rpcUrl),
        account,
      });
      
      // Try a simple send to the proxy with 0.5 CELO to see if that's the issue
      const feeTestHash = await walletClient.sendTransaction({
        to: deployment.contracts.sovereignSeasV5 as `0x${string}`,
        value: parseEther("0.5"),
      });
      
      const feeTestReceipt = await publicClient.waitForTransactionReceipt({ hash: feeTestHash });
      console.log(`✅ Simple fee send worked: ${feeTestReceipt.status}`);
      
    } catch (error) {
      console.log(`❌ Simple fee send failed: ${error.message}`);
    }
    
    // Test 2: Treasury module availability
    console.log("\nTesting treasury module...");
    try {
      const treasuryRegistered = await publicClient.readContract({
        address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI,
        functionName: "isModuleRegistered",
        args: ["treasury"],
      });
      console.log(`Treasury registered: ${treasuryRegistered}`);
      
      if (treasuryRegistered) {
        const treasuryAddress = await publicClient.readContract({
          address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
          abi: SOVEREIGN_SEAS_V5_ABI,
          functionName: "getModuleAddress",
          args: ["treasury"],
        });
        console.log(`Treasury address: ${treasuryAddress}`);
        
        const treasuryInitStatus = await publicClient.readContract({
          address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
          abi: SOVEREIGN_SEAS_V5_ABI,
          functionName: "getModulesInitializationStatus",
          args: [["treasury"]],
        });
        // Fix: Assert/parse the type of treasuryInitStatus to avoid 'unknown' error
        if (Array.isArray(treasuryInitStatus)) {
          console.log(`Treasury initialized: ${treasuryInitStatus[0]}`);
        } else {
          console.log(`Treasury initialized: ${treasuryInitStatus}`);
        }
      }
    } catch (error: any) {
      console.log(`❌ Treasury check failed: ${error?.message ?? error}`);
    }
    
    // Test 3: Try to call getProjectCount through the module directly (not proxy)
    console.log("\nTesting direct module access...");
    try {
      const directProjectCount = await publicClient.readContract({
        address: deployment.contracts.projectsModule as `0x${string}`,
        abi: PROJECTS_MODULE_ABI,
        functionName: "getProjectCount",
        args: [],
      });
      console.log(`✅ Direct module call works: ${directProjectCount}`);
    } catch (error) {
      console.log(`❌ Direct module call failed: ${error.message}`);
    }
    
    // Test 4: Try createProject with minimal data
    console.log("\nTesting minimal project creation...");
    
    const minimalMetadata = {
      bio: "",
      contractInfo: "",
      additionalData: "",
      tags: [],
      category: "",
      website: "",
      github: "",
      twitter: "",
      discord: "",
      websiteUrl: "",
      socialMediaHandle: ""
    };

    const minimalCreateProjectData = encodeFunctionData({
      abi: PROJECTS_MODULE_ABI,
      functionName: "createProject",
      args: [
        "Minimal Test",
        "Minimal test project",
        minimalMetadata,
        [],
        false
      ],
    });
    
    try {
      // Simulate minimal creation
      const minimalSimulation = await publicClient.call({
        to: deployment.contracts.sovereignSeasV5 as `0x${string}`,
        data: encodeFunctionData({
          abi: SOVEREIGN_SEAS_V5_ABI,
          functionName: "callModule",
          args: ["projects", minimalCreateProjectData],
        }),
        value: parseEther("0.5"),
        account: testWallet.address as `0x${string}`,
      });
      console.log("✅ Minimal simulation passed");
      
      // Try actual minimal transaction
      const account = privateKeyToAccount(testWallet.privateKey);
      const walletClient = createWalletClient({
        chain: celoAlfajores,
        transport: http(rpcUrl),
        account,
      });
      
      const minimalHash = await walletClient.writeContract({
        address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
        abi: SOVEREIGN_SEAS_V5_ABI,
        functionName: "callModule",
        args: ["projects", minimalCreateProjectData],
        value: parseEther("0.5"),
        gas: 700000n,
      });
      
      console.log(`Minimal transaction: ${minimalHash}`);
      const minimalReceipt = await publicClient.waitForTransactionReceipt({ hash: minimalHash });
      console.log(`Minimal result: ${minimalReceipt.status}, gas: ${minimalReceipt.gasUsed}`);
      
      if (minimalReceipt.status === "success") {
        console.log("✅ SUCCESS! Minimal project creation worked!");
        
        // Check new project count
        const newCount = await publicClient.readContract({
          address: deployment.contracts.sovereignSeasV5 as `0x${string}`,
          abi: SOVEREIGN_SEAS_V5_ABI,
          functionName: "staticCallModule",
          args: ["projects", encodeFunctionData({
            abi: PROJECTS_MODULE_ABI,
            functionName: "getProjectCount",
            args: [],
          })],
        });
        console.log(`New project count: ${newCount}`);
      } else {
        console.log("❌ Even minimal creation failed");
      }
      
    } catch (error) {
      console.log(`❌ Minimal creation failed: ${error.message}`);
      
      // Get transaction details if available
      if (error.hash) {
        try {
          const failedReceipt = await publicClient.waitForTransactionReceipt({ hash: error.hash });
          console.log(`Failed receipt status: ${failedReceipt.status}`);
          console.log(`Failed receipt gas used: ${failedReceipt.gasUsed}`);
        } catch (receiptError) {
          console.log("Could not get failed receipt");
        }
      }
    }
    
    // Test 5: Check reentrancy status
    console.log("\nChecking potential reentrancy issues...");
    
    // The issue might be that the reentrancy guard is not properly reset
    // Let's see if we can detect this
    
    console.log("\n📊 Summary of Findings:");
    console.log("- Simulation passes ✅");
    console.log("- Actual transaction reverts ❌");
    console.log("- High gas usage suggests deep execution");
    console.log("- Most likely causes:");
    console.log("  1. State change between simulation and execution");
    console.log("  2. Reentrancy guard conflict");
    console.log("  3. Treasury module integration issue");
    console.log("  4. Access control timing issue");
    
  } catch (error) {
    console.error("❌ Debug script failed:", error);
  }
}

detailedDebug().catch(console.error);