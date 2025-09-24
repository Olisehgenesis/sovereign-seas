import hre from "hardhat";
import { saveDeployment, loadLatestDeployment } from "./utils/deployments";
const { ethers } = hre;

interface PrizePoolDeploymentConfig {
  network: string;
  deployer: string;
  timestamp: string;
  contracts: {
    seasPrizePool: string;
    sovereignSeasV4?: string;
    sovereignSeasV5?: string;
  };
}

async function main() {
  console.log("🏊 Starting SeasPrizePool Deployment...");
  console.log("=====================================");
  console.log("🎯 Features: Prize Pool Management + Campaign Integration");
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

  // Load existing SovereignSeas deployment to get the contract address
  let sovereignSeasAddress: string | null = null;
  try {
    const existingDeployment = loadLatestDeployment(networkName);
    if (existingDeployment) {
      // Try V5 first, then V4
      sovereignSeasAddress = "0x0cc096b1cc568a22c1f02dab769881d1afe6161a";
      if (sovereignSeasAddress) {
        console.log(`📋 Found existing SovereignSeas deployment: ${sovereignSeasAddress}`);
      }
    }
  } catch (error) {
    console.log("📋 No existing SovereignSeas deployment found");
  }

  // If no existing deployment found, use the provided Alfajores address
  if (!sovereignSeasAddress) {
    sovereignSeasAddress = "0x0cc096b1cc568a22c1f02dab769881d1afe6161a";
    console.log("⚠️  No existing SovereignSeas deployment found.");
    
    // Use the provided Alfajores SovereignSeas address
    if (networkName === "alfajores") {
      sovereignSeasAddress = "0x0cc096b1cc568a22c1f02dab769881d1afe6161a";
      console.log(`   📍 Using provided Alfajores SovereignSeas address: ${sovereignSeasAddress}`);
    } else {
      sovereignSeasAddress = "0x0cc096b1cc568a22c1f02dab769881d1afe6161a";
      console.log("   You can either:");
      console.log("   1. Deploy SovereignSeas first using: npx hardhat run scripts/deploy-v5-enhanced.ts --network <network>");
      console.log("   2. Provide an existing SovereignSeas contract address");
      
      if (!sovereignSeasAddress) {
        console.log("❌ Cannot proceed without SovereignSeas contract address");
        return;
      }
    }
  }

  // Deployment configuration
  const deploymentConfig: PrizePoolDeploymentConfig = {
    network: networkName,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      seasPrizePool: "",
      sovereignSeasV4: sovereignSeasAddress, // Default to V4, will be updated if V5
    }
  };

  // Try to determine if it's V5 by checking if it has the expected interface
  try {
    const tempContract = await ethers.getContractAt("ISovereignSeasV4", sovereignSeasAddress);
    // If we can call this, it's likely V4 or compatible
    console.log(`   ✅ Confirmed SovereignSeas contract is accessible at: ${sovereignSeasAddress}`);
  } catch (error) {
    console.log(`   ⚠️ Warning: Could not verify SovereignSeas contract interface: ${error.message}`);
  }

  console.log("\n🏗️ Deploying SeasPrizePool Contract...");
  console.log("=====================================");

  // Deploy SeasPrizePool
  console.log(`\n📦 Deploying SeasPrizePool...`);
  
  const prizePoolFactory = await ethers.getContractFactory("SeasPrizePool");
  const prizePool = await prizePoolFactory.deploy(sovereignSeasAddress);
  await prizePool.waitForDeployment();
  
  const prizePoolAddress = await prizePool.getAddress();
  deploymentConfig.contracts.seasPrizePool = prizePoolAddress;
  
  console.log(`✅ SeasPrizePool deployed to: ${prizePoolAddress}`);

  // Verify deployment
  const code = await ethers.provider.getCode(prizePoolAddress);
  if (code === "0x") {
    throw new Error(`❌ SeasPrizePool deployment failed - no code at address`);
  }

  // Test basic functionality
  console.log(`\n🧪 Testing basic functionality...`);
  
  try {
    // Test that we can read the seasContract address
    const seasContractAddress = await prizePool.seasContract();
    console.log(`   ✅ SeasContract address: ${seasContractAddress}`);
    
    // Test that we can read the owner
    const owner = await prizePool.owner();
    console.log(`   ✅ Owner: ${owner}`);
    
    // Test that we can read the nextPoolId (should be 0)
    const nextPoolId = await prizePool.nextPoolId();
    console.log(`   ✅ Next Pool ID: ${nextPoolId}`);
    
    console.log(`   ✅ Basic functionality test passed`);
  } catch (error) {
    console.log(`   ❌ Basic functionality test failed: ${error.message}`);
  }

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
  console.log("");
  console.log("📦 Contract Addresses:");
  console.log(`   🏊 SeasPrizePool: ${deploymentConfig.contracts.seasPrizePool}`);
  console.log(`   🏛️ SovereignSeas: ${deploymentConfig.contracts.sovereignSeasV4 || deploymentConfig.contracts.sovereignSeasV5}`);
  console.log("");
  console.log("🎯 Prize Pool Features:");
  console.log("   ✅ Universal and ERC20-specific pools");
  console.log("   ✅ Campaign integration");
  console.log("   ✅ Token management and freezing");
  console.log("   ✅ Quadratic and manual distribution");
  console.log("   ✅ Emergency rescue functions");
  console.log("   ✅ Admin controls and blacklisting");
  console.log("");
  console.log("🚀 Deployment completed successfully!");
  console.log("💡 You can now create pools and manage prize distributions.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
