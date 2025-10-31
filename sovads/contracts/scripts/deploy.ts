import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying SovAds Contracts...");

  // Get the contract factory
  const SovAdsManager = await ethers.getContractFactory("SovAdsManager");

  // Deploy the contract
  console.log("📝 Deploying SovAdsManager...");
  const sovAdsManager = await SovAdsManager.deploy();
  await sovAdsManager.deployed();

  console.log("✅ SovAdsManager deployed to:", sovAdsManager.address);

  // Add default supported tokens (Celo Sepolia)
  console.log("🔧 Adding supported tokens (Celo Sepolia)...");

  // ERC20 token addresses on Celo Sepolia
  const CUSD_SEPOLIA = "0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80";
  const USDC_SEPOLIA = "0x01C5C0122039549AD1493B8220cABEdD739BC44E";
  const USDT_SEPOLIA = "0xd077A400968890Eacc75cdc901F0356c943e4fDb";
  const CELO_SEPOLIA = "0x471EcE3750Da237f93B8E339c536989b8978a438";

  // Add supported tokens
  await sovAdsManager.addSupportedToken(CUSD_SEPOLIA);
  console.log("✅ Added cUSD (Sepolia) as supported token");

  await sovAdsManager.addSupportedToken(USDC_SEPOLIA);
  console.log("✅ Added USDC (Sepolia) as supported token");

  await sovAdsManager.addSupportedToken(USDT_SEPOLIA);
  console.log("✅ Added USDT (Sepolia) as supported token");

  await sovAdsManager.addSupportedToken(CELO_SEPOLIA);
  console.log("✅ Added CELO (Sepolia) as supported token");

  // Set initial fee percentage (5%)
  await sovAdsManager.setFeePercent(5);
  console.log("✅ Set protocol fee to 5%");

  console.log("\n🎉 Deployment completed successfully!");
  console.log("📋 Contract Addresses:");
  console.log("   SovAdsManager:", sovAdsManager.address);
  console.log("\n📋 Supported Tokens (Sepolia):");
  console.log("   cUSD:", CUSD_SEPOLIA);
  console.log("   USDC:", USDC_SEPOLIA);
  console.log("   USDT:", USDT_SEPOLIA);
  console.log("   CELO:", CELO_SEPOLIA);
  
  console.log("\n🔗 Network:", await ethers.provider.getNetwork());
  
  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    contracts: {
      SovAdsManager: {
        address: sovAdsManager.address,
        deployedAt: new Date().toISOString(),
        supportedTokens: [CUSD_SEPOLIA, USDC_SEPOLIA, USDT_SEPOLIA, CELO_SEPOLIA]
      }
    }
  };

  console.log("\n📄 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
