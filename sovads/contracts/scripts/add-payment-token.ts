import { ethers } from "hardhat";

async function main() {
  console.log("🔧 Adding cUSD as supported payment token...");

  // Get the deployed contract address from deployments
  const deploymentInfo = require("../deployments/.alfajores.json");
  const contractAddress = deploymentInfo.contracts.SovAdsManager.address;
  
  if (!contractAddress) {
    throw new Error("Contract address not found in deployment info. Please deploy first.");
  }

  console.log("📋 Contract Address:", contractAddress);

  // Get the contract instance
  const SovAdsManager = await ethers.getContractFactory("SovAdsManager");
  const sovAdsManager = SovAdsManager.attach(contractAddress);

  // cUSD token address on Celo Alfajores
  const cUSD_ADDRESS = "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9";

  try {
    // Check if token is already supported
    const isSupported = await sovAdsManager.supportedTokens(cUSD_ADDRESS);
    
    if (isSupported) {
      console.log("⚠️  Token is already supported:", cUSD_ADDRESS);
      return;
    }

    // Add the token as supported
    console.log("➕ Adding token:", cUSD_ADDRESS);
    const tx = await sovAdsManager.addSupportedToken(cUSD_ADDRESS);
    await tx.wait();

    console.log("✅ Successfully added cUSD as supported payment token!");
    console.log("📋 Transaction hash:", tx.hash);
    console.log("🎯 Token address:", cUSD_ADDRESS);

    // Verify it was added
    const nowSupported = await sovAdsManager.supportedTokens(cUSD_ADDRESS);
    console.log("✅ Verification - Token supported:", nowSupported);

    // Get all supported tokens
    const supportedTokensList = await sovAdsManager.getSupportedTokens();
    console.log("📋 All supported tokens:");
    supportedTokensList.forEach((token: string, index: number) => {
      console.log(`   ${index + 1}. ${token}`);
    });

  } catch (error) {
    console.error("❌ Error adding supported token:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
