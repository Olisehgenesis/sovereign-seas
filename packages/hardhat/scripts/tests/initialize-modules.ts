import { createPublicClient, createWalletClient, http, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "viem/chains";
import * as fs from "fs";
import * as path from "path";
import { ensureDeployment } from "./state";

// Load environment variables from .env file
import * as dotenv from "dotenv";
dotenv.config();

// Import ABIs
const SOVEREIGN_SEAS_V5_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "v5", "SovereignSeasV5.sol", "SovereignSeasV5.json"), 
  "utf8"
)).abi;

const PROJECTS_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "v5", "modules", "ProjectsModule.sol", "ProjectsModule.json"), 
  "utf8"
)).abi;

const CAMPAIGNS_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "v5", "modules", "CampaignsModule.sol", "CampaignsModule.json"), 
  "utf8"
)).abi;

const VOTING_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "v5", "modules", "VotingModule.sol", "VotingModule.json"), 
  "utf8"
)).abi;

const TREASURY_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "v5", "modules", "TreasuryModule.sol", "TreasuryModule.json"), 
  "utf8"
)).abi;

const POOLS_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "v5", "modules", "PoolsModule.sol", "PoolsModule.json"), 
  "utf8"
)).abi;

const MIGRATION_MODULE_ABI = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "artifacts", "contracts", "v5", "modules", "MigrationModule.sol", "MigrationModule.json"), 
  "utf8"
)).abi;

async function initializeModules() {
  console.log("🔧 Initializing SovereignSeas V5 Modules");
  console.log("=" .repeat(50));

  // Load deployment
  const deployment = ensureDeployment("alfajores");
  console.log(`📋 Deployment: ${deployment.path}`);
  console.log(`🏗️ Main Contract: ${deployment.record.contracts.sovereignSeasV5}`);

  // Load deployer wallet (you'll need to set this)
  const deployerPrivateKey = process.env.PRIVATE_KEY;
  if (!deployerPrivateKey) {
    console.log("❌ PRIVATE_KEY environment variable not set");
    console.log("💡 Set it to the private key of the wallet that deployed the contracts");
    return;
  }

  const deployerAccount = privateKeyToAccount(deployerPrivateKey as `0x${string}`);
  const deployerClient = createWalletClient({
    chain: celoAlfajores,
    transport: http("https://alfajores-forno.celo-testnet.org"),
    account: deployerAccount,
  });

  const publicClient = createPublicClient({ 
    chain: celoAlfajores, 
    transport: http("https://alfajores-forno.celo-testnet.org") 
  });

  try {
    // Check deployer balance
    const balance = await publicClient.getBalance({ address: deployerAccount.address });
    console.log(`💰 Deployer balance: ${Number(balance) / 1e18} CELO`);

    if (Number(balance) < 0.1) {
      console.log("❌ Insufficient balance for gas fees");
      return;
    }

    // Initialize modules in dependency order
    const modulesToInitialize = [
      { id: "projects", name: "ProjectsModule", abi: PROJECTS_MODULE_ABI },
      { id: "campaigns", name: "CampaignsModule", abi: CAMPAIGNS_MODULE_ABI },
      { id: "voting", name: "VotingModule", abi: VOTING_MODULE_ABI },
      { id: "treasury", name: "TreasuryModule", abi: TREASURY_MODULE_ABI },
      { id: "pools", name: "PoolsModule", abi: POOLS_MODULE_ABI },
      { id: "migration", name: "MigrationModule", abi: MIGRATION_MODULE_ABI },
    ];

    for (const module of modulesToInitialize) {
      console.log(`\n🔧 Initializing ${module.name}...`);
      
      try {
        // Check if module is already initialized by trying a simple call
        try {
          await publicClient.readContract({
            address: deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
            abi: SOVEREIGN_SEAS_V5_ABI,
            functionName: "staticCallModule",
            args: [module.id, "0x"], // Empty call
          });
          console.log(`   ✅ ${module.name} already initialized`);
          continue;
        } catch (error) {
          console.log(`   ⏳ ${module.name} needs initialization`);
        }

        console.log(`   📝 Sending initialization transaction...`);
        const hash = await deployerClient.writeContract({
          address: deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
          abi: SOVEREIGN_SEAS_V5_ABI,
          functionName: "initializeModule",
          args: [module.id, "0x"], // Empty data for default initialization
        });

        console.log(`   ⏳ Transaction: ${hash}`);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        
        if (receipt.status === "success") {
          console.log(`   ✅ ${module.name} initialized successfully`);
          
          // Verify initialization
          try {
            await publicClient.readContract({
              address: deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
              abi: SOVEREIGN_SEAS_V5_ABI,
              functionName: "staticCallModule",
              args: [module.id, "0x"], // Empty call should work now
            });
            console.log(`   ✅ ${module.name} verification successful`);
          } catch (error) {
            console.log(`   ⚠️  ${module.name} verification failed: ${error.message}`);
          }
        } else {
          console.log(`   ❌ ${module.name} initialization failed`);
        }

      } catch (error) {
        console.log(`   ❌ Failed to initialize ${module.name}: ${error.message}`);
      }
    }

    console.log("\n🎉 Module initialization completed!");
    console.log("\n🔍 Testing all modules...");
    
    // Test all modules
    for (const module of modulesToInitialize) {
      try {
        await publicClient.readContract({
          address: deployment.record.contracts.sovereignSeasV5 as `0x${string}`,
          abi: SOVEREIGN_SEAS_V5_ABI,
          functionName: "staticCallModule",
          args: [module.id, "0x"],
        });
        console.log(`   ✅ ${module.name}: Working`);
      } catch (error) {
        console.log(`   ❌ ${module.name}: ${error.message}`);
      }
    }

  } catch (error) {
    console.error("💥 Fatal error:", error);
  }
}

initializeModules().catch(console.error);
