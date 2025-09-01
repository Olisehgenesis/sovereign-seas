import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

console.log("🔍 Testing .env file loading...");
console.log("=" .repeat(40));

// Check if PRIVATE_KEY is loaded (without showing the actual value)
const key = process.env.PRIVATE_KEY;
const privateKey = key ;
if (privateKey) {
  console.log("✅ PRIVATE_KEY is loaded");
  console.log(`   Length: ${privateKey.length} characters`);
  console.log(`   Format: ${privateKey.startsWith('0x') ? '0x prefix' : 'No 0x prefix'}`);
  
  // Validate format without exposing the key
  if (privateKey.startsWith('0x') && privateKey.length === 66) {
    console.log("✅ Private key format appears correct");
  } else {
    console.log("❌ Private key format may be incorrect");
    console.log("   Expected: 0x + 64 hex characters");
  }
} else {
  console.log("❌ PRIVATE_KEY not found in .env file");
}

console.log("\n🔍 Other environment variables:");
console.log(`   CELO_RPC_URL: ${process.env.CELO_RPC_URL ? '✅ Set' : '❌ Not set'}`);
console.log(`   TESTNET_ENV_MODE: ${process.env.TESTNET_ENV_MODE || 'Not set'}`);

console.log("\n📝 Next steps:");
if (privateKey && privateKey.startsWith('0x') && privateKey.length === 66) {
  console.log("✅ Environment looks good - you can run the module initialization script");
} else {
  console.log("❌ Please check your .env file format");
  console.log("   PRIVATE_KEY should be: 0x + 64 hex characters");
}
