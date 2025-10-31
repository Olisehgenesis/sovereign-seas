import { ethers } from "hardhat";

async function main() {
  console.log("🔍 SovAds Contract Interaction Script");
  
  // Get contract instance (replace with deployed address)
  const contractAddress = "0x..."; // Replace with actual deployed address
  const SovAdsManager = await ethers.getContractFactory("SovAdsManager");
  const sovAdsManager = SovAdsManager.attach(contractAddress);

  const [owner, advertiser, publisher] = await ethers.getSigners();
  
  console.log("👤 Owner:", owner.address);
  console.log("👤 Advertiser:", advertiser.address);
  console.log("👤 Publisher:", publisher.address);

  try {
    // 1. Check contract state
    console.log("\n📊 Contract State:");
    const totalFees = await sovAdsManager.getTotalProtocolFees();
    const activeCampaigns = await sovAdsManager.getActiveCampaignsCount();
    const supportedTokens = await sovAdsManager.getSupportedTokens();
    
    console.log("   Total Protocol Fees:", ethers.utils.formatEther(totalFees));
    console.log("   Active Campaigns:", activeCampaigns.toString());
    console.log("   Supported Tokens:", supportedTokens.length);

    // 2. Subscribe as publisher
    console.log("\n🌐 Publisher Subscription:");
    const sites = ["example.com", "test.com"];
    const tx1 = await sovAdsManager.connect(publisher).subscribePublisher(sites);
    await tx1.wait();
    console.log("   ✅ Publisher subscribed with sites:", sites);

    // 3. Add a new site
    console.log("\n➕ Adding New Site:");
    const tx2 = await sovAdsManager.connect(publisher).addSite("newsite.com");
    await tx2.wait();
    console.log("   ✅ Added newsite.com");

    // 4. Get publisher info
    console.log("\n👤 Publisher Info:");
    const publisherInfo = await sovAdsManager.getPublisher(publisher.address);
    console.log("   Wallet:", publisherInfo.wallet);
    console.log("   Sites:", publisherInfo.sites);
    console.log("   Total Earned:", ethers.utils.formatEther(publisherInfo.totalEarned));
    console.log("   Banned:", publisherInfo.banned);

    // 5. Create a campaign (requires token approval first)
    console.log("\n📢 Campaign Creation:");
    console.log("   ⚠️  Note: This requires token approval and balance");
    console.log("   To create a campaign, you need to:");
    console.log("   1. Have cUSD/USDC tokens");
    console.log("   2. Approve the contract to spend your tokens");
    console.log("   3. Call createCampaign() with JSON metadata");
    
    // Example JSON metadata for campaign
    const exampleMetadata = JSON.stringify({
      name: "Celo DeFi Campaign",
      description: "Promote DeFi adoption on Celo",
      banner: "https://example.com/banner.png",
      targetUrl: "https://celo.org",
      tags: ["DeFi", "Celo", "Finance"],
      targetAudience: "Crypto users",
      budget: "1000",
      currency: "cUSD"
    });
    
    console.log("   Example JSON metadata:");
    console.log("   ", exampleMetadata);

    // Example campaign creation (commented out as it requires tokens)
    /*
    const amount = ethers.utils.parseEther("100");
    const duration = 86400; // 1 day
    
    const tx3 = await sovAdsManager.connect(advertiser).createCampaign(
      "0x874069Fa1Eb16D44d13F0F66B92D3971647cE6c9", // cUSD
      amount,
      duration,
      exampleMetadata
    );
    await tx3.wait();
    console.log("   ✅ Campaign created");
    */

    // 6. Admin functions example
    console.log("\n👑 Admin Functions:");
    console.log("   Available admin functions:");
    console.log("   - banUser(address, reason)");
    console.log("   - unbanUser(address)");
    console.log("   - addSupportedToken(address)");
    console.log("   - removeSupportedToken(address)");
    console.log("   - setFeePercent(uint256)");
    console.log("   - disburseFunds(campaignId, recipient, amount)");
    console.log("   - collectFees(token, amount)");

    // 7. Claim order example
    console.log("\n💰 Claim Orders:");
    console.log("   To create a claim order:");
    console.log("   1. Publisher calls createClaimOrder(campaignId, amount)");
    console.log("   2. Admin reviews and calls processClaimOrder(orderId, approvedAmount, rejected, reason)");
    console.log("   3. If approved, tokens are transferred to publisher");

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
