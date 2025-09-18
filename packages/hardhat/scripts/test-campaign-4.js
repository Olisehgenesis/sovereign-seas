const { ethers } = require('ethers');

const SEAS_CONTRACT_ADDRESS = "0x0cc096b1cc568a22c1f02dab769881d1afe6161a";
const RPC_URL = "https://forno.celo.org";
const CAMPAIGN_ID = 4;

// Test different campaign function signatures
const CAMPAIGN_SIGNATURES = [
    // Your pool contract expects this:
    "function campaigns(uint256) view returns (uint256, address, string, string, uint256, uint256, uint256, uint256, bool, bool, address, bool, uint256)",
    
    // Alternative possibilities:
    "function campaigns(uint256) view returns (uint256 id, address admin, string memory name, string memory description, uint256 startTime, uint256 endTime, uint256 adminFeePercentage, uint256 maxWinners, bool useQuadraticDistribution, bool useCustomDistribution, address payoutToken, bool active, uint256 totalFunds)",
    
    // Try to get raw struct
    "function campaigns(uint256) view returns (tuple(uint256,address,string,string,uint256,uint256,uint256,uint256,bool,bool,address,bool,uint256))"
];

async function testCampaignStructure() {
    console.log("🔍 Testing Campaign Struct Format");
    console.log("=" .repeat(50));
    
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    for (let i = 0; i < CAMPAIGN_SIGNATURES.length; i++) {
        console.log(`\n📋 Test ${i + 1}: Campaign Signature ${i + 1}`);
        try {
            const seasContract = new ethers.Contract(SEAS_CONTRACT_ADDRESS, [CAMPAIGN_SIGNATURES[i]], provider);
            const campaign = await seasContract.campaigns(CAMPAIGN_ID);
            
            console.log("✅ Success! Campaign data:");
            if (Array.isArray(campaign)) {
                campaign.forEach((value, index) => {
                    console.log(`  [${index}]: ${value}`);
                });
            } else {
                console.log("  Campaign object:", campaign);
            }
            
            // Test the specific validation that pool contract does
            if (Array.isArray(campaign) && campaign.length >= 13) {
                const id = campaign[0];
                const active = campaign[11];
                console.log(`✅ Validation test - ID: ${id}, Active: ${active}`);
                console.log(`✅ Would pass validation: ${id == CAMPAIGN_ID && active}`);
            }
            
        } catch (error) {
            console.log(`❌ Failed: ${error.message.substring(0, 100)}`);
        }
    }
    
    // Test what happens when we try to recreate the pool contract's validation
    console.log("\n🧪 Testing Pool Contract Validation Logic");
    try {
        const properSeasABI = [
            "function campaigns(uint256) view returns (uint256 id, address admin, string memory name, string memory description, uint256 startTime, uint256 endTime, uint256 adminFeePercentage, uint256 maxWinners, bool useQuadraticDistribution, bool useCustomDistribution, address payoutToken, bool active, uint256 totalFunds)"
        ];
        
        const seasContract = new ethers.Contract(SEAS_CONTRACT_ADDRESS, properSeasABI, provider);
        const campaign = await seasContract.campaigns(CAMPAIGN_ID);
        
        console.log("✅ Campaign data with proper ABI:");
        console.log(`  ID: ${campaign.id}`);
        console.log(`  Admin: ${campaign.admin}`);
        console.log(`  Name: ${campaign.name}`);
        console.log(`  Active: ${campaign.active}`);
        console.log(`  Total Funds: ${ethers.formatEther(campaign.totalFunds)} CELO`);
        
        // This is exactly what your pool contract should be checking
        const isValid = campaign.id == CAMPAIGN_ID && campaign.active;
        console.log(`✅ Pool validation result: ${isValid}`);
        
    } catch (error) {
        console.log(`❌ Validation test failed: ${error.message}`);
    }
    
    console.log("\n💡 Next Steps:");
    console.log("If validation logic works here but fails in pool contract:");
    console.log("1. Check if pool contract has correct Seas contract interface");
    console.log("2. Verify gas limits aren't being hit");
    console.log("3. Consider updating pool contract's campaign validation");
}

testCampaignStructure().catch(console.error);