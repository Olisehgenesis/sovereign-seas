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

  // Add default supported tokens (Celo testnet tokens)
  console.log("🔧 Adding supported tokens...");
  
  // cUSD on Celo Alfajores testnet (main cUSD)
  const cUSD_ALFAJORES = "0x874069fa1eb16d44d622f2e0ca25eea172369bc1";
  
  // cUSD on Celo Alfajores testnet (alternative)
  const cUSD_ALFAJORES_ALT = "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9";
  
  // USDC on Celo Alfajores testnet  
  const USDC_ALFAJORES = "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B";
  
  // Add supported tokens
  await sovAdsManager.addSupportedToken(cUSD_ALFAJORES);
  console.log("✅ Added cUSD as supported token");
  
  await sovAdsManager.addSupportedToken(cUSD_ALFAJORES_ALT);
  console.log("✅ Added cUSD (alt) as supported token");
  
  await sovAdsManager.addSupportedToken(USDC_ALFAJORES);
  console.log("✅ Added USDC as supported token");

  // Set initial fee percentage (5%)
  await sovAdsManager.setFeePercent(5);
  console.log("✅ Set protocol fee to 5%");

  console.log("\n🎉 Deployment completed successfully!");
  console.log("📋 Contract Addresses:");
  console.log("   SovAdsManager:", sovAdsManager.address);
  console.log("\n📋 Supported Tokens:");
  console.log("   cUSD (Alfajores):", cUSD_ALFAJORES);
  console.log("   cUSD Alt (Alfajores):", cUSD_ALFAJORES_ALT);
  console.log("   USDC (Alfajores):", USDC_ALFAJORES);
  
  console.log("\n🔗 Network:", await ethers.provider.getNetwork());
  
  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    contracts: {
      SovAdsManager: {
        address: sovAdsManager.address,
        deployedAt: new Date().toISOString(),
        supportedTokens: [cUSD_ALFAJORES, cUSD_ALFAJORES_ALT, USDC_ALFAJORES]
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
