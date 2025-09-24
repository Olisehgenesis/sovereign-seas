import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying Updated SeasPrizePool Contract");
  console.log("=" .repeat(50));

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📋 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "CELO");

  // Seas contract address (from your test script)
  const SEAS_CONTRACT_ADDRESS = "0x0cc096b1cc568a22c1f02dab769881d1afe6161a";
  console.log("🔗 Seas Contract Address:", SEAS_CONTRACT_ADDRESS);

  // Deploy the updated SeasPrizePool contract
  console.log("\n📦 Deploying SeasPrizePool...");
  const SeasPrizePool = await ethers.getContractFactory("SeasPrizePool");
  const poolContract = await SeasPrizePool.deploy(SEAS_CONTRACT_ADDRESS);
  
  await poolContract.waitForDeployment();
  const poolAddress = await poolContract.getAddress();
  
  console.log("✅ SeasPrizePool deployed to:", poolAddress);

  // Test the new validation functions
  console.log("\n🧪 Testing New Validation Functions");
  console.log("-".repeat(30));
  
  const CAMPAIGN_ID = 4;
  
  try {
    // Test campaign existence
    const campaignExists = await poolContract.campaignExists(CAMPAIGN_ID);
    console.log(`✅ Campaign ${CAMPAIGN_ID} exists:`, campaignExists);
    
    // Test create permission
    const hasPermission = await poolContract.hasCreatePermission(CAMPAIGN_ID, deployer.address);
    console.log(`✅ Deployer has create permission:`, hasPermission);
    
  } catch (error) {
    console.log("❌ Validation test failed:", error);
  }

  // Try to create a pool with the new validation
  console.log("\n🏊 Testing Pool Creation");
  console.log("-".repeat(20));
  
  try {
    const tx = await poolContract.createPoolUniversal(
      CAMPAIGN_ID,
      "Updated pool with improved validation"
    );
    
    console.log("📝 Transaction hash:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("✅ Pool created successfully!");
    console.log("📊 Gas used:", receipt?.gasUsed.toString());
    
    // Get the pool ID from the event
    const event = receipt?.logs.find(log => {
      try {
        const parsed = poolContract.interface.parseLog(log);
        return parsed?.name === "PoolCreated";
      } catch {
        return false;
      }
    });
    
    if (event) {
      const parsed = poolContract.interface.parseLog(event);
      console.log("🆔 Pool ID:", parsed?.args[0].toString());
      console.log("🎯 Campaign ID:", parsed?.args[1].toString());
      console.log("👤 Admin:", parsed?.args[2]);
    }
    
  } catch (error) {
    console.log("❌ Pool creation failed:", error);
  }

  console.log("\n📋 Deployment Summary");
  console.log("=" .repeat(30));
  console.log("🏗️  Contract Address:", poolAddress);
  console.log("🔗 Seas Contract:", SEAS_CONTRACT_ADDRESS);
  console.log("👤 Deployer:", deployer.address);
  console.log("🌐 Network:", await deployer.provider.getNetwork().then(n => n.name));
  
  console.log("\n💡 Next Steps:");
  console.log("1. Verify the contract on Celo Explorer");
  console.log("2. Test the new validation functions");
  console.log("3. Create pools using the improved validation");
  console.log("4. Monitor gas usage improvements");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
