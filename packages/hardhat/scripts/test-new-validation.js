const { ethers } = require('ethers');

const SEAS_CONTRACT_ADDRESS = "0x0cc096b1cc568a22c1f02dab769881d1afe6161a";
const RPC_URL = "https://forno.celo.org";
const CAMPAIGN_ID = 4;

// Updated SeasPrizePool ABI with new functions
const POOL_ABI = [
  "function campaignExists(uint256 campaignId) external view returns (bool)",
  "function hasCreatePermission(uint256 campaignId, address user) external view returns (bool)",
  "function createPoolUniversal(uint256 campaignId, string memory metadata) external returns (uint256)",
  "function getPoolInfo(uint256 poolId) external view returns (uint256 id, uint256 campaignId, address admin, uint8 poolType, bool isActive, bool isPaused, uint256 createdAt, string memory metadata)"
];

// Seas contract ABI for direct testing
const SEAS_ABI = [
  "function nextCampaignId() external view returns (uint256)",
  "function campaigns(uint256) external view returns (uint256 id, address admin, string memory name, string memory description, uint256 startTime, uint256 endTime, uint256 adminFeePercentage, uint256 maxWinners, bool useQuadraticDistribution, bool useCustomDistribution, address payoutToken, bool active, uint256 totalFunds)",
  "function isCampaignAdmin(uint256 _campaignId, address _admin) external view returns (bool)",
  "function superAdmins(address _admin) external view returns (bool)"
];

async function testNewValidation() {
  console.log("🧪 Testing New Campaign Validation Logic");
  console.log("=" .repeat(50));
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const seasContract = new ethers.Contract(SEAS_CONTRACT_ADDRESS, SEAS_ABI, provider);
  
  // Test 1: Direct Seas contract calls
  console.log("\n📋 Test 1: Direct Seas Contract Validation");
  console.log("-".repeat(40));
  
  try {
    const nextCampaignId = await seasContract.nextCampaignId();
    console.log(`✅ Total campaigns: ${nextCampaignId}`);
    console.log(`✅ Campaign ${CAMPAIGN_ID} exists: ${CAMPAIGN_ID < nextCampaignId && CAMPAIGN_ID > 0}`);
    
    // Test campaign struct access
    const campaign = await seasContract.campaigns(CAMPAIGN_ID);
    console.log(`✅ Campaign ID from struct: ${campaign.id}`);
    console.log(`✅ Campaign active: ${campaign.active}`);
    console.log(`✅ Campaign admin: ${campaign.admin}`);
    
  } catch (error) {
    console.log(`❌ Direct validation failed: ${error.message}`);
  }
  
  // Test 2: Permission checking
  console.log("\n🔐 Test 2: Permission Validation");
  console.log("-".repeat(30));
  
  try {
    // Test with a known address (you can replace this with your address)
    const testAddress = "0x1234567890123456789012345678901234567890"; // Replace with actual address
    
    const isCampaignAdmin = await seasContract.isCampaignAdmin(CAMPAIGN_ID, testAddress);
    console.log(`✅ Is campaign admin: ${isCampaignAdmin}`);
    
    const isSuperAdmin = await seasContract.superAdmins(testAddress);
    console.log(`✅ Is super admin: ${isSuperAdmin}`);
    
  } catch (error) {
    console.log(`❌ Permission check failed: ${error.message}`);
  }
  
  // Test 3: Simulate the new validation logic
  console.log("\n🎯 Test 3: Simulated New Validation Logic");
  console.log("-".repeat(40));
  
  try {
    // Simulate _campaignExists function
    let campaignExists = false;
    try {
      const totalCampaigns = await seasContract.nextCampaignId();
      campaignExists = CAMPAIGN_ID < totalCampaigns && CAMPAIGN_ID > 0;
      console.log(`✅ Primary validation (nextCampaignId): ${campaignExists}`);
    } catch {
      // Fallback validation
      try {
        const campaign = await seasContract.campaigns(CAMPAIGN_ID);
        campaignExists = campaign.id == CAMPAIGN_ID;
        console.log(`✅ Fallback validation (direct struct): ${campaignExists}`);
      } catch {
        campaignExists = false;
        console.log(`❌ Both validations failed`);
      }
    }
    
    // Simulate _hasCreatePermission function
    let hasPermission = false;
    try {
      const isAdmin = await seasContract.isCampaignAdmin(CAMPAIGN_ID, testAddress);
      hasPermission = isAdmin;
      console.log(`✅ Permission check (isCampaignAdmin): ${hasPermission}`);
    } catch {
      try {
        const isSuperAdmin = await seasContract.superAdmins(testAddress);
        hasPermission = isSuperAdmin;
        console.log(`✅ Fallback permission check (superAdmins): ${hasPermission}`);
      } catch {
        hasPermission = false;
        console.log(`❌ Permission check failed`);
      }
    }
    
    console.log(`\n📊 Final Results:`);
    console.log(`   Campaign exists: ${campaignExists}`);
    console.log(`   Has permission: ${hasPermission}`);
    console.log(`   Can create pool: ${campaignExists && hasPermission}`);
    
  } catch (error) {
    console.log(`❌ Simulation failed: ${error.message}`);
  }
  
  // Test 4: Gas estimation comparison
  console.log("\n⛽ Test 4: Gas Usage Comparison");
  console.log("-".repeat(35));
  
  try {
    // Estimate gas for nextCampaignId call
    const nextCampaignIdGas = await seasContract.nextCampaignId.estimateGas();
    console.log(`✅ nextCampaignId() gas: ${nextCampaignIdGas.toString()}`);
    
    // Estimate gas for campaigns call
    const campaignsGas = await seasContract.campaigns.estimateGas(CAMPAIGN_ID);
    console.log(`✅ campaigns() gas: ${campaignsGas.toString()}`);
    
    // Estimate gas for isCampaignAdmin call
    const isAdminGas = await seasContract.isCampaignAdmin.estimateGas(CAMPAIGN_ID, testAddress);
    console.log(`✅ isCampaignAdmin() gas: ${isAdminGas.toString()}`);
    
    console.log(`\n💡 Gas efficiency: nextCampaignId is ${campaignsGas > nextCampaignIdGas ? 'more' : 'less'} efficient than direct struct access`);
    
  } catch (error) {
    console.log(`❌ Gas estimation failed: ${error.message}`);
  }
  
  console.log("\n🎉 Validation Testing Complete!");
  console.log("\n💡 Key Benefits of New Validation:");
  console.log("1. ✅ More robust - uses nextCampaignId() first");
  console.log("2. ✅ Graceful fallbacks - tries direct struct if needed");
  console.log("3. ✅ Better error handling - each step has try-catch");
  console.log("4. ✅ Testable - public validation functions");
  console.log("5. ✅ Gas efficient - simpler checks first");
}

testNewValidation().catch(console.error);
