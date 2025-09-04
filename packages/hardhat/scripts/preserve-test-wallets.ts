import * as fs from "fs";
import * as path from "path";
import { loadState, saveState } from "./tests/state";

interface TestWallet {
  address: string;
  privateKey: string;
  balance?: string;
}

interface PreservedWallets {
  timestamp: string;
  network: string;
  wallets: TestWallet[];
}

async function preserveTestWallets() {
  console.log("🔒 Preserving Test Wallets...");
  console.log("=============================");

  try {
    // Load current test state
    const network = "alfajores"; // Default network
    const state = loadState(network);
    
    if (!state || !state.wallets || state.wallets.length === 0) {
      console.log("⚠️ No test wallets found to preserve");
      return;
    }

    // Create preserved wallets data
    const preservedWallets: PreservedWallets = {
      timestamp: new Date().toISOString(),
      network: "celo-alfajores", // Default network
      wallets: state.wallets.map(wallet => ({
        address: wallet.address,
        privateKey: wallet.privateKey || "",
        balance: wallet.balance?.toString()
      }))
    };

    // Save preserved wallets
    const preservedDir = path.join(__dirname, "..", "preserved-wallets");
    if (!fs.existsSync(preservedDir)) {
      fs.mkdirSync(preservedDir, { recursive: true });
    }

    const filename = `wallets-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    const filepath = path.join(preservedDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(preservedWallets, null, 2));
    
    console.log(`✅ Preserved ${preservedWallets.wallets.length} test wallets`);
    console.log(`📁 Saved to: ${filepath}`);
    console.log("");
    console.log("📋 Preserved Wallets:");
    preservedWallets.wallets.forEach((wallet, index) => {
      console.log(`   ${index + 1}. ${wallet.address} (${wallet.balance || "unknown"} CELO)`);
    });

    // Set environment variable for deployment
    process.env.PRESERVE_TEST_WALLETS = "true";
    console.log("");
    console.log("🔧 Environment variable set: PRESERVE_TEST_WALLETS=true");
    console.log("💡 You can now run the enhanced deployment script");

  } catch (error) {
    console.error("❌ Failed to preserve test wallets:", error);
    throw error;
  }
}

async function restoreTestWallets() {
  console.log("🔄 Restoring Test Wallets...");
  console.log("============================");

  try {
    // Find the most recent preserved wallets file
    const preservedDir = path.join(__dirname, "..", "preserved-wallets");
    
    if (!fs.existsSync(preservedDir)) {
      console.log("⚠️ No preserved wallets directory found");
      return;
    }

    const files = fs.readdirSync(preservedDir)
      .filter(file => file.startsWith("wallets-") && file.endsWith(".json"))
      .sort()
      .reverse();

    if (files.length === 0) {
      console.log("⚠️ No preserved wallets files found");
      return;
    }

    const latestFile = files[0];
    const filepath = path.join(preservedDir, latestFile);
    
    console.log(`📁 Loading from: ${latestFile}`);
    
    const preservedData: PreservedWallets = JSON.parse(fs.readFileSync(filepath, "utf8"));
    
    // Restore to test state
    const network = "alfajores"; // Default network
    const state = loadState(network) || { wallets: [] };
    state.wallets = preservedData.wallets.map(wallet => ({
      address: wallet.address,
      privateKey: wallet.privateKey,
      balance: wallet.balance ? BigInt(wallet.balance) : undefined
    }));
    
    saveState(network, state);
    
    console.log(`✅ Restored ${preservedData.wallets.length} test wallets`);
    console.log(`⏰ Preserved at: ${preservedData.timestamp}`);
    console.log("");
    console.log("📋 Restored Wallets:");
    preservedData.wallets.forEach((wallet, index) => {
      console.log(`   ${index + 1}. ${wallet.address} (${wallet.balance || "unknown"} CELO)`);
    });

  } catch (error) {
    console.error("❌ Failed to restore test wallets:", error);
    throw error;
  }
}

// Command line interface
const command = process.argv[2];

if (command === "preserve") {
  preserveTestWallets()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Error:", error);
      process.exit(1);
    });
} else if (command === "restore") {
  restoreTestWallets()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Error:", error);
      process.exit(1);
    });
} else {
  console.log("🔒 Test Wallet Preservation Tool");
  console.log("================================");
  console.log("");
  console.log("Usage:");
  console.log("  npm run preserve-wallets    - Preserve current test wallets");
  console.log("  npm run restore-wallets     - Restore preserved test wallets");
  console.log("");
  console.log("Or directly:");
  console.log("  npx ts-node scripts/preserve-test-wallets.ts preserve");
  console.log("  npx ts-node scripts/preserve-test-wallets.ts restore");
}
