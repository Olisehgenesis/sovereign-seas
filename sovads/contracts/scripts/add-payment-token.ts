import { ethers } from "hardhat";

async function main() {
  console.log("🔧 Adding ERC20 as supported payment token...");

  // Get the deployed contract address from env
  const contractAddress = process.env.SOVADS_MANAGER_ADDRESS;
  
  if (!contractAddress) {
    throw new Error("SOVADS_MANAGER_ADDRESS not set. Please export the manager address.");
  }

  console.log("📋 Contract Address:", contractAddress);

  // Get the contract instance
  const SovAdsManager = await ethers.getContractFactory("SovAdsManager");
  const sovAdsManager = SovAdsManager.attach(contractAddress);

  // Token to add (e.g., CELO ERC20 on Sepolia)
  const tokenToAdd = process.env.TOKEN_TO_ADD;
  if (!tokenToAdd) {
    throw new Error("TOKEN_TO_ADD not set. Please export the ERC20 token address to add.");
  }

  try {
    // Check if token is already supported
    const isSupported = await sovAdsManager.supportedTokens(tokenToAdd);
    
    if (isSupported) {
      console.log("⚠️  Token is already supported:", tokenToAdd);
      return;
    }

    // Add the token as supported
    console.log("➕ Adding token:", tokenToAdd);
    const tx = await sovAdsManager.addSupportedToken(tokenToAdd);
    await tx.wait();

    console.log("✅ Successfully added token as supported payment token!");
    console.log("📋 Transaction hash:", tx.hash);
    console.log("🎯 Token address:", tokenToAdd);

    // Verify it was added
    const nowSupported = await sovAdsManager.supportedTokens(tokenToAdd);
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
