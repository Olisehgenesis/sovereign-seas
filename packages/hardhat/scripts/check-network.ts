import { ethers } from "hardhat";
import { config } from "dotenv";

config();

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("\n🔍 Network Configuration Check");
  console.log("==============================");
  
  // Get network info
  const networkId = network.chainId;
  const networkName = network.name;
  
  console.log(`📍 Network ID: ${networkId}`);
  console.log(`📍 Network Name: ${networkName}`);
  console.log(`👤 Deployer: ${deployer.address}`);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} CELO`);
  
  // Network safety check
  console.log("\n⚠️  NETWORK SAFETY CHECK");
  console.log("========================");
  
  if (networkId === 42220n) {
    console.log("🚨 DANGER: You are on CELO MAINNET!");
    console.log("🚨 This will use real CELO tokens and cost real money!");
    console.log("🚨 Make sure this is what you want!");
    console.log("\n💡 To switch to testnet:");
    console.log("   - Update your .env file to use Alfajores RPC");
    console.log("   - Or run: npm run deploy:v5:testnet");
  } else if (networkId === 44787n) {
    console.log("✅ SAFE: You are on Celo Alfajores Testnet");
    console.log("✅ Perfect for testing - no real money involved");
  } else if (networkId === 62320n) {
    console.log("✅ SAFE: You are on Celo Baklava Testnet");
    console.log("✅ Perfect for testing - no real money involved");
  } else {
    console.log("⚠️  UNKNOWN: You are on an unrecognized network");
    console.log("⚠️  Please verify this is the intended network");
  }
  
  // Check if this looks like a test deployment
  if (balance < ethers.parseEther("0.1")) {
    console.log("\n⚠️  LOW BALANCE WARNING");
    console.log("=======================");
    console.log("💰 Your balance is very low. Consider:");
    console.log("   - Getting testnet CELO from a faucet");
    console.log("   - Or switching to mainnet if you have funds there");
  }
  
  console.log("\n📋 Available Commands:");
  console.log("   npm run deploy:v5:testnet  - Deploy to Alfajores (SAFE)");
  console.log("   npm run deploy:v5:mainnet  - Deploy to Celo Mainnet (REAL MONEY)");
  console.log("   npm run deploy:v5:baklava  - Deploy to Baklava (SAFE)");
  
  if (networkId === 42220n) {
    console.log("\n⏰ Waiting 15 seconds before proceeding...");
    console.log("   Press Ctrl+C to cancel if you want to switch to testnet");
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Network check failed:", error);
    process.exit(1);
  });
