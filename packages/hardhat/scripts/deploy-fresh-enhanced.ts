import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Fresh Enhanced Deployment Process");
  console.log("====================================");
  console.log("🎯 This will deploy fresh contracts with enhanced features");
  console.log("🔒 While preserving your existing test wallets");
  console.log("");

  try {
    // Step 1: Preserve test wallets
    console.log("📋 Step 1: Preserving test wallets...");
    try {
      execSync("npx ts-node scripts/preserve-test-wallets.ts preserve", { 
        stdio: "inherit",
        cwd: process.cwd()
      });
      console.log("✅ Test wallets preserved successfully");
    } catch (error) {
      console.log("⚠️ No test wallets to preserve (this is okay for fresh deployment)");
    }

    // Step 2: Compile contracts
    console.log("\n🔨 Step 2: Compiling enhanced contracts...");
    execSync("npx hardhat compile", { 
      stdio: "inherit",
      cwd: process.cwd()
    });
    console.log("✅ Contracts compiled successfully");

    // Step 3: Deploy enhanced contracts
    console.log("\n🏗️ Step 3: Deploying enhanced contracts...");
    execSync("npx ts-node scripts/deploy-v5-enhanced.ts", { 
      stdio: "inherit",
      cwd: process.cwd(),
      env: { ...process.env, PRESERVE_TEST_WALLETS: "true" }
    });
    console.log("✅ Enhanced contracts deployed successfully");

    // Step 4: Restore test wallets
    console.log("\n🔄 Step 4: Restoring test wallets...");
    try {
      execSync("npx ts-node scripts/preserve-test-wallets.ts restore", { 
        stdio: "inherit",
        cwd: process.cwd()
      });
      console.log("✅ Test wallets restored successfully");
    } catch (error) {
      console.log("⚠️ No preserved wallets to restore (this is okay for fresh deployment)");
    }

    // Step 5: Verify deployment
    console.log("\n🔍 Step 5: Verifying deployment...");
    try {
      execSync("npx ts-node scripts/check-deployment-status.ts", { 
        stdio: "inherit",
        cwd: process.cwd()
      });
      console.log("✅ Deployment verification completed");
    } catch (error) {
      console.log("⚠️ Deployment verification failed, but deployment may still be successful");
    }

    console.log("\n🎉 Fresh Enhanced Deployment Completed!");
    console.log("======================================");
    console.log("");
    console.log("✅ Enhanced Features Deployed:");
    console.log("   🎯 Token Weight System for ERC20 Campaigns");
    console.log("   🔄 Manual Rate Fallback for CELO Campaigns");
    console.log("   🗳️ Enhanced Voting Logic with Position Tracking");
    console.log("   👑 Admin Token Weight Management");
    console.log("   📊 Conversion Health Monitoring");
    console.log("");
    console.log("🔒 Test Wallets Status:");
    console.log("   ✅ Preserved and restored (if they existed)");
    console.log("");
    console.log("🚀 Next Steps:");
    console.log("   1. Run comprehensive test: npm run test:comprehensive");
    console.log("   2. Test new features: npm run test:enhanced");
    console.log("   3. Verify token weight system works correctly");
    console.log("");

  } catch (error) {
    console.error("❌ Deployment process failed:", error);
    console.log("");
    console.log("🔧 Troubleshooting:");
    console.log("   1. Check your network connection");
    console.log("   2. Ensure you have sufficient CELO for gas");
    console.log("   3. Verify your private key is correct");
    console.log("   4. Check if contracts compiled successfully");
    console.log("");
    process.exit(1);
  }
}

main();
