import { createPublicClient, createWalletClient, http, parseEther, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "viem/chains";
import * as fs from "fs";
import * as path from "path";
import { ensureDeployment } from "./state";

// Import ABIs from artifacts
const PROJECTS_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "v5", "modules", "ProjectsModule.sol", "ProjectsModule.json"), 
  "utf8"
)).abi;

async function main() {
  console.log("🧪 Testing Direct ProjectsModule Call");
  console.log("=====================================");

  // Load deployment
  const deployment = ensureDeployment("alfajores");
  console.log(`📋 Using deployment: ${deployment.path}`);

  // Load wallets
  const walletsPath = path.join(__dirname, "..", "..", "wallets", "alfajores-wallets.json");
  if (!fs.existsSync(walletsPath)) {
    throw new Error(`❌ Wallet file missing: ${walletsPath}. Run generate-wallets first.`);
  }
  const wallets = (JSON.parse(fs.readFileSync(walletsPath, "utf8")) as { wallets: any[] }).wallets;
  console.log(`👛 Loaded ${wallets.length} test wallets`);

  const publicClient = createPublicClient({ 
    chain: celoAlfajores, 
    transport: http("https://alfajores-forno.celo-testnet.org") 
  });

  const projectsModuleAddress = deployment.record.contracts.projectsModule;
  console.log(`🔧 Projects Module Address: ${projectsModuleAddress}`);

  // Use first wallet for testing
  const testWallet = wallets[0];
  const account = privateKeyToAccount(testWallet.privateKey);
  
  console.log(`👤 Testing with wallet: ${testWallet.address}`);

  const walletClient = createWalletClient({
    chain: celoAlfajores,
    transport: http("https://alfajores-forno.celo-testnet.org"),
    account,
  });

  try {
    // Test 1: Check if we can read from the module
    console.log(`\n📖 Test 1: Reading from module...`);
    
    const moduleName = await publicClient.readContract({
      address: projectsModuleAddress as `0x${string}`,
      abi: PROJECTS_MODULE_ABI,
      functionName: "moduleName",
      args: [],
    });
    
    console.log(`✅ Module name: ${moduleName}`);

    // Test 2: Check project count
    console.log(`\n📊 Test 2: Checking project count...`);
    
    const projectCount = await publicClient.readContract({
      address: projectsModuleAddress as `0x${string}`,
      abi: PROJECTS_MODULE_ABI,
      functionName: "getProjectCount",
      args: [],
    });
    
    console.log(`✅ Current project count: ${projectCount}`);

    // Test 3: Try to create a project directly
    console.log(`\n🏗️ Test 3: Creating project directly on module...`);
    
    const createProjectData = encodeFunctionData({
      abi: PROJECTS_MODULE_ABI,
      functionName: "createProject",
      args: [
        "Test Project Direct Call",
        "Testing direct module call to isolate the issue",
        {
          bio: "Test bio for direct call",
          contractInfo: "Test contract info",
          additionalData: "Test additional data",
          jsonMetadata: JSON.stringify({
            tags: ["test", "direct", "debug"],
            difficulty: "beginner",
            estimatedTime: "1 week",
            techStack: ["solidity", "typescript"],
            teamSize: 1,
            fundingNeeded: "500 CELO"
          }),
          category: "Environment",
          website: "https://test.example.com",
          github: "https://github.com/test",
          twitter: "@test",
          discord: "test",
          websiteUrl: "https://test.example.com",
          socialMediaHandle: "@test"
        },
        [], // contracts array (empty for test)
        false // transferrable
      ],
    });

    console.log(`📝 Encoded function data: ${createProjectData}`);

    const hash = await walletClient.writeContract({
      address: projectsModuleAddress as `0x${string}`,
      abi: PROJECTS_MODULE_ABI,
      functionName: "createProject",
      args: [
        "Test Project Direct Call",
        "Testing direct module call to isolate the issue",
        {
          bio: "Test bio for direct call",
          contractInfo: "Test contract info",
          additionalData: "Test additional data",
          jsonMetadata: JSON.stringify({
            tags: ["test", "direct", "debug"],
            difficulty: "beginner",
            estimatedTime: "1 week",
            techStack: ["solidity", "typescript"],
            teamSize: 1,
            fundingNeeded: "500 CELO"
          }),
          category: "Environment",
          website: "https://test.example.com",
          github: "https://github.com/test",
          twitter: "@test",
          discord: "test",
          websiteUrl: "https://test.example.com",
          socialMediaHandle: "@test"
        },
        [], // contracts array (empty for test)
        false // transferrable
      ],
      value: parseEther("0.5"), // 0.5 CELO project creation fee
    });

    console.log(`⏳ Transaction hash: ${hash}`);
    
    // Wait for transaction
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

    // Check new project count
    const newProjectCount = await publicClient.readContract({
      address: projectsModuleAddress as `0x${string}`,
      abi: PROJECTS_MODULE_ABI,
      functionName: "getProjectCount",
      args: [],
    });
    
    console.log(`📊 New project count: ${newProjectCount}`);
    console.log(`🎉 Project created successfully!`);

  } catch (error) {
    console.error(`❌ Test failed:`, error);
    
    // Log detailed error information
    if (error.message) {
      console.error("Error message:", error.message);
    }
    if (error.cause) {
      console.error("Error cause:", error.cause);
    }
    
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
