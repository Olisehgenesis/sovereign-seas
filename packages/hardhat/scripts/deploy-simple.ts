import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("🚀 Simple SeasPrizePool Deployment");
  console.log("==================================");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying from: ${deployer.address}`);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);

  // SovereignSeas contract address
  const sovereignSeasAddress = "0x0cC096B1cC568A22C1F02DAB769881d1aFE6161a";
  console.log(`🏛️ SovereignSeas: ${sovereignSeasAddress}`);

  // Deploy SeasPrizePool
  console.log("\n📦 Deploying SeasPrizePool...");
  const prizePoolFactory = await ethers.getContractFactory("SeasPrizePool");
  
  // Deploy with increased gas limit and timeout
  const prizePool = await prizePoolFactory.deploy(sovereignSeasAddress, {
    gasLimit: 5000000, // 5M gas limit
  });
  
  console.log("⏳ Waiting for deployment confirmation...");
  await prizePool.waitForDeployment();
  
  const prizePoolAddress = await prizePool.getAddress();
  console.log(`✅ SeasPrizePool deployed to: ${prizePoolAddress}`);

  // Verify deployment
  const code = await ethers.provider.getCode(prizePoolAddress);
  if (code === "0x") {
    throw new Error("❌ Deployment failed - no code at address");
  }

  // Test basic functionality
  console.log("\n🧪 Testing deployment...");
  const seasContractAddress = await prizePool.seasContract();
  const owner = await prizePool.owner();
  const nextPoolId = await prizePool.nextPoolId();
  
  console.log(`   ✅ SeasContract: ${seasContractAddress}`);
  console.log(`   ✅ Owner: ${owner}`);
  console.log(`   ✅ Next Pool ID: ${nextPoolId}`);

  console.log("\n🎉 Deployment completed successfully!");
  console.log(`📍 Contract Address: ${prizePoolAddress}`);
  console.log(`🔗 View on CeloScan: https://celoscan.io/address/${prizePoolAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
