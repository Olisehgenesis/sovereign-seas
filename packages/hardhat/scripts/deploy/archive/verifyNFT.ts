import { run } from "hardhat";
import * as dotenv from 'dotenv';

dotenv.config();

async function verifyNFT() {
  const NFT_ADDRESS = process.env.SOVEREIGN_SEAS_NFT_ADDRESS;
  const SOVEREIGN_SEAS_V4_ADDRESS = process.env.SOVEREIGN_SEAS_V4_ADDRESS;
  const NFT_NAME = process.env.NFT_NAME || "Sovereign Seas NFT";
  const NFT_SYMBOL = process.env.NFT_SYMBOL || "SSNFT";

  if (!NFT_ADDRESS) {
    console.error("Error: SOVEREIGN_SEAS_NFT_ADDRESS environment variable is required");
    process.exit(1);
  }

  if (!SOVEREIGN_SEAS_V4_ADDRESS) {
    console.error("Error: SOVEREIGN_SEAS_V4_ADDRESS environment variable is required");
    process.exit(1);
  }

  console.log("Verifying SovereignSeasNFT contract on Celo mainnet...");
  console.log(`Contract address: ${NFT_ADDRESS}`);
  console.log(`SovereignSeasV4 address: ${SOVEREIGN_SEAS_V4_ADDRESS}`);
  console.log(`NFT Name: ${NFT_NAME}`);
  console.log(`NFT Symbol: ${NFT_SYMBOL}`);

  try {
    await run("verify:verify", {
      address: NFT_ADDRESS,
      constructorArguments: [
        SOVEREIGN_SEAS_V4_ADDRESS,
        NFT_NAME,
        NFT_SYMBOL
      ],
    });

    console.log("✅ Contract verified successfully!");
    console.log(`🔗 View on CeloScan: https://celoscan.io/address/${NFT_ADDRESS}`);
    
  } catch (error) {
    console.error("❌ Verification failed:", error);
    
    if (error instanceof Error) {
      // Check if it's already verified
      if (error.message.includes("Already Verified")) {
        console.log("ℹ️  Contract is already verified!");
        console.log(`🔗 View on CeloScan: https://celoscan.io/address/${NFT_ADDRESS}`);
      } else {
        console.error("Error details:", error.message);
      }
    }
  }
}

verifyNFT()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 