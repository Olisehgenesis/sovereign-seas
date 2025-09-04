import * as fs from "fs";
import * as path from "path";

/**
 * Script to add the source wallet (0x53eaF4CD171842d8144e45211308e5D90B4b0088) 
 * to the test wallets file for SEAS token distribution
 */

const SOURCE_WALLET_ADDRESS = "0x53eaF4CD171842d8144e45211308e5D90B4b0088";
const NETWORK = "alfajores";

async function addSourceWallet() {
  console.log("🔧 Adding source wallet to test wallets...");
  
  const walletsPath = path.join(__dirname, "..", "..", "wallets", `${NETWORK}-wallets.json`);
  
  if (!fs.existsSync(walletsPath)) {
    console.error(`❌ Wallet file not found: ${walletsPath}`);
    console.log("💡 Run generate-wallets first to create the wallet file");
    return;
  }
  
  try {
    // Read existing wallets
    const walletsData = JSON.parse(fs.readFileSync(walletsPath, "utf8"));
    
    // Check if source wallet already exists
    const existingWallet = walletsData.wallets.find((w: any) => w.address === SOURCE_WALLET_ADDRESS);
    if (existingWallet) {
      console.log(`✅ Source wallet ${SOURCE_WALLET_ADDRESS} already exists in test wallets`);
      console.log(`   Index: ${existingWallet.index}`);
      return;
    }
    
    // Add source wallet to the beginning of the list
    const sourceWallet = {
      index: 0, // Give it index 0 to make it the primary source
      address: SOURCE_WALLET_ADDRESS,
      privateKey: "YOUR_PRIVATE_KEY_HERE" // You need to provide this
    };
    
    // Update indices for existing wallets
    walletsData.wallets.forEach((wallet: any) => {
      wallet.index = wallet.index + 1;
    });
    
    // Add source wallet at the beginning
    walletsData.wallets.unshift(sourceWallet);
    
    // Write back to file
    fs.writeFileSync(walletsPath, JSON.stringify(walletsData, null, 2));
    
    console.log(`✅ Source wallet ${SOURCE_WALLET_ADDRESS} added to test wallets`);
    console.log(`   Index: 0 (primary source wallet)`);
    console.log(`   Total wallets: ${walletsData.wallets.length}`);
    console.log("");
    console.log("⚠️  IMPORTANT: You need to add the private key for this wallet!");
    console.log("   Edit the wallets file and replace 'YOUR_PRIVATE_KEY_HERE' with the actual private key");
    console.log("");
    console.log("💡 After adding the private key, you can run the comprehensive test");
    console.log("   The test will automatically distribute SEAS tokens from this wallet to others");
    
  } catch (error) {
    console.error("❌ Failed to add source wallet:", error);
  }
}

// Alternative: Create a new wallet file with the source wallet included
async function createNewWalletFile() {
  console.log("🔧 Creating new wallet file with source wallet...");
  
  const walletsPath = path.join(__dirname, "..", "..", "wallets", `${NETWORK}-wallets.json`);
  const backupPath = path.join(__dirname, "..", "..", "wallets", `${NETWORK}-wallets-backup.json`);
  
  try {
    // Backup existing file
    if (fs.existsSync(walletsPath)) {
      fs.copyFileSync(walletsPath, backupPath);
      console.log(`📋 Backed up existing wallets to: ${backupPath}`);
    }
    
    // Create new wallet structure
    const newWalletsData = {
      network: NETWORK,
      wallets: [
        {
          index: 0,
          address: SOURCE_WALLET_ADDRESS,
          privateKey: "YOUR_PRIVATE_KEY_HERE", // You need to provide this
          description: "Source wallet for SEAS token distribution"
        },
        {
          index: 1,
          address: "0xD726abE8131FBc75b922a4Ef8eB47895DF11Dc89",
          privateKey: "0x2658d828dbb62bb17548e2c7393bb35e1cbf412c61f6b4b7a020bcef08cf2109"
        },
        {
          index: 2,
          address: "0x90D310d39d50682D2b20c34Bc399695A458595F3",
          privateKey: "0xbf2f2f869ffebba2bb16276a89106c1d6ccf491e38d90d226eb0f72513ebc2bd"
        },
        {
          index: 3,
          address: "0x56164f137128BF0eA493f4AC3b0e073Fe1EF2A2A",
          privateKey: "0x2f529a5fe9b661dd094ea5301379740c6e3a7a2f711b04d08a4d5c3cb86f68a2"
        },
        {
          index: 4,
          address: "0xE8Fe28A6f03d76c7d53d9110B586a60C9B16A857",
          privateKey: "0xc9911b9616614756ebfb9f0c5b86cfa48204796bac3f09ec56a8a46861481b9b"
        },
        {
          index: 5,
          address: "0x33BAe931944758c0631d95FB6A391eF2dc335301",
          privateKey: "0x55cfa0b4339b8fc34581b9a153f3b7b12c3009671dd8bbd5dc0a2550005d8aec"
        },
        {
          index: 6,
          address: "0x6a50243f53b5C52252c42d56e01511CF295b4C1C",
          privateKey: "0xddeff0876206e7e78e1e41a7e5d2afe407fe6a5464f9731b63c6f240e7b237bf"
        }
      ]
    };
    
    // Write new wallet file
    fs.writeFileSync(walletsPath, JSON.stringify(newWalletsData, null, 2));
    
    console.log(`✅ New wallet file created: ${walletsPath}`);
    console.log(`   Source wallet added as index 0`);
    console.log(`   Total wallets: ${newWalletsData.wallets.length}`);
    console.log("");
    console.log("⚠️  IMPORTANT: You need to add the private key for the source wallet!");
    console.log("   Edit the wallets file and replace 'YOUR_PRIVATE_KEY_HERE' with the actual private key");
    console.log("");
    console.log("💡 After adding the private key, you can run the comprehensive test");
    console.log("   The test will automatically distribute SEAS tokens from this wallet to others");
    
  } catch (error) {
    console.error("❌ Failed to create new wallet file:", error);
  }
}

// Main execution
async function main() {
  console.log("🚀 Source Wallet Addition Script");
  console.log("================================");
  console.log(`Network: ${NETWORK}`);
  console.log(`Source Wallet: ${SOURCE_WALLET_ADDRESS}`);
  console.log("");
  
  console.log("Choose an option:");
  console.log("1. Add source wallet to existing file");
  console.log("2. Create new wallet file with source wallet");
  console.log("");
  
  // For now, create new file (option 2)
  console.log("🔄 Creating new wallet file with source wallet...");
  await createNewWalletFile();
}

if (require.main === module) {
  main().catch(console.error);
}

export { addSourceWallet, createNewWalletFile };
