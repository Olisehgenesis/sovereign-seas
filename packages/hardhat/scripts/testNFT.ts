import { ethers } from "hardhat";
import * as dotenv from 'dotenv';

dotenv.config();

async function testNFT() {
  const NFT_ADDRESS = process.env.SOVEREIGN_SEAS_NFT_ADDRESS;
  const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS;

  if (!NFT_ADDRESS) {
    console.error("Error: SOVEREIGN_SEAS_NFT_ADDRESS environment variable is required");
    process.exit(1);
  }

  if (!SOVEREIGN_SEAS_V4_ADDRESS) {
    console.error("Error: SOVEREIGN_SEAS_V4_ADDRESS environment variable is required");
    process.exit(1);
  }

  console.log("🧪 Testing SovereignSeasNFT contract...");
  console.log(`NFT Contract: ${NFT_ADDRESS}`);
  console.log(`SovereignSeasV4: ${SOVEREIGN_SEAS_V4_ADDRESS}`);

  try {
    // Get contract instances
    const nftContract = await ethers.getContractAt("SovereignSeasNFT", NFT_ADDRESS);
    const sovereignSeasContract = await ethers.getContractAt("SovereignSeasV4", SOVEREIGN_SEAS_V4_ADDRESS);

    // Get signer
    const [signer] = await ethers.getSigners();
    console.log(`\n👤 Testing with account: ${signer.address}`);

    // Test 1: Get contract information
    console.log("\n📋 Contract Information:");
    const name = await nftContract.name();
    const symbol = await nftContract.symbol();
    const basicMintPrice = await nftContract.basicMintPrice();
    const supporterMintPrice = await nftContract.supporterMintPrice();
    const owner = await nftContract.owner();

    console.log(`Name: ${name}`);
    console.log(`Symbol: ${symbol}`);
    console.log(`Basic Mint Price: ${ethers.formatEther(basicMintPrice)} CELO`);
    console.log(`Supporter Mint Price: ${ethers.formatEther(supporterMintPrice)} CELO`);
    console.log(`Owner: ${owner}`);

    // Test 2: Check NFT types and tiers
    console.log("\n🎭 NFT Types and Tiers:");
    console.log("NFT Types: PROJECT(0), CAMPAIGN(1), ACHIEVEMENT(2), MILESTONE(3)");
    console.log("NFT Tiers: BASIC(0), SUPPORTER(1)");

    // Test 3: Get contract balances
    console.log("\n💰 Contract Balances:");
    const contractBalance = await ethers.provider.getBalance(NFT_ADDRESS);
    const contractAdminBalance = await nftContract.getContractAdminBalance();
    const unallocatedFunds = await nftContract.getUnallocatedFundsBalance();

    console.log(`Contract CELO Balance: ${ethers.formatEther(contractBalance)} CELO`);
    console.log(`Contract Admin Fees: ${ethers.formatEther(contractAdminBalance)} CELO`);
    console.log(`Unallocated Funds: ${ethers.formatEther(unallocatedFunds)} CELO`);

    // Test 4: Check if signer is super admin
    console.log("\n🔐 Authorization Check:");
    try {
      const isSuperAdmin = await sovereignSeasContract.superAdmins(signer.address);
      console.log(`Is Super Admin: ${isSuperAdmin}`);
    } catch (error) {
      console.log("Could not check super admin status (contract may not be deployed)");
    }

    // Test 5: Get NFTs by owner (if any)
    console.log("\n🖼️  NFTs by Owner:");
    try {
      const nftsByOwner = await nftContract.getNFTsByOwner(signer.address);
      console.log(`NFTs owned by ${signer.address}: ${nftsByOwner.length}`);
      
      if (nftsByOwner.length > 0) {
        for (let i = 0; i < Math.min(nftsByOwner.length, 5); i++) {
          const tokenId = nftsByOwner[i];
          const metadata = await nftContract.getNFTMetadata(tokenId);
          console.log(`  Token ${tokenId}: Type ${metadata.nftType}, Tier ${metadata.tier}, Related ID ${metadata.relatedId}`);
        }
      }
    } catch (error) {
      console.log("Could not fetch NFTs by owner");
    }

    console.log("\n✅ NFT contract test completed successfully!");
    console.log("\n📝 Next Steps:");
    console.log("1. Deploy SovereignSeasV4 contract if not already deployed");
    console.log("2. Create projects and campaigns in SovereignSeasV4");
    console.log("3. Mint NFTs using the minting functions");
    console.log("4. Test revenue distribution and withdrawal functions");

  } catch (error) {
    console.error("❌ Test failed:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
  }
}

testNFT()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 