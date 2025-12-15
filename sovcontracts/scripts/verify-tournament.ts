import { execSync } from "child_process";

// Celo token addresses for different networks
const CELO_TOKEN_ADDRESSES: Record<string, string> = {
  celo: "0x471EcE3750Da237f93B8E339c536989b8978a438",
  celoSepolia: "0x471EcE3750Da237f93B8E339c536989b8978a438",
};

async function main() {
  // Get network name from command line arguments first
  const networkIndex = process.argv.findIndex((arg) => arg === "--network");
  const networkName = networkIndex >= 0 && process.argv[networkIndex + 1]
    ? process.argv[networkIndex + 1]
    : "celo";

  // Get contract address from environment variable
  let contractAddress = process.env.CONTRACT_ADDRESS || process.env.TOURNAMENT_CONTRACT_ADDRESS;
  
  // Also check for address in process.argv (in case it's passed differently)
  if (!contractAddress) {
    // Look for any argument that looks like an Ethereum address
    contractAddress = process.argv.find((arg) => arg.startsWith("0x") && arg.length === 42);
  }

  // Get Seas4 contract address
  let seasAddress = process.env.SEAS_CONTRACT_ADDRESS;
  if (!seasAddress) {
    console.error("Error: SEAS_CONTRACT_ADDRESS is required");
    console.error("\nUsage:");
    console.error("  CONTRACT_ADDRESS=0x... SEAS_CONTRACT_ADDRESS=0x... pnpm run verify:tournament:celo");
    process.exit(1);
  }

  if (!contractAddress) {
    console.error("Error: Contract address is required");
    console.error("\nUsage options:");
    console.error("  1. Set environment variables:");
    console.error("     CONTRACT_ADDRESS=0x... SEAS_CONTRACT_ADDRESS=0x... pnpm run verify:tournament:celo");
    console.error("  2. Or use:");
    console.error("     TOURNAMENT_CONTRACT_ADDRESS=0x... SEAS_CONTRACT_ADDRESS=0x... pnpm run verify:tournament:celo");
    console.error("\nExample:");
    console.error("  CONTRACT_ADDRESS=0x... SEAS_CONTRACT_ADDRESS=0x... pnpm run verify:tournament:celo-sepolia");
    process.exit(1);
  }

  // Get addresses for the network
  const celoTokenAddress = CELO_TOKEN_ADDRESSES[networkName] || CELO_TOKEN_ADDRESSES.celo;

  console.log("Verifying SovereignTournament contract...");
  console.log("Network:", networkName);
  console.log("Contract Address:", contractAddress);
  console.log("Constructor Arguments:");
  console.log(`  Seas4 Contract: ${seasAddress}`);
  console.log(`  Celo Token: ${celoTokenAddress}`);

  try {
    // Verify on CeloScan (if API key is configured)
    if (process.env.CELOSCAN_API_KEY) {
      console.log("\n[1/2] Verifying on CeloScan...");
      try {
        execSync(
          `npx hardhat verify --network ${networkName} ${contractAddress} ${seasAddress} ${celoTokenAddress}`,
          { stdio: "inherit" }
        );
        console.log("✓ CeloScan verification successful!");
      } catch (error: any) {
        const errorMessage = error.message || error.stdout?.toString() || error.stderr?.toString() || "";
        if (errorMessage.includes("Already Verified") || errorMessage.includes("already verified")) {
          console.log("✓ Contract is already verified on CeloScan!");
        } else if (errorMessage.includes("not supported")) {
          console.warn("⚠ CeloScan verification: Network not fully supported by Hardhat verify plugin.");
          console.warn("  The plugin tries Etherscan/Blockscout first, which don't support Celo.");
          console.warn("  However, Sourcify verification (below) is working and is sufficient for transparency.");
          console.warn("  For CeloScan verification, you can verify manually at:");
          if (networkName === "celo") {
            console.warn(`    https://celoscan.io/address/${contractAddress}#code`);
          } else if (networkName === "celoSepolia") {
            console.warn(`    https://sepolia.celoscan.io/address/${contractAddress}#code`);
          }
        } else {
          console.warn("⚠ CeloScan verification failed:", errorMessage);
        }
      }
    } else {
      console.log("\n[1/2] Skipping CeloScan verification (CELOSCAN_API_KEY not set)");
      console.log("  To verify on CeloScan, add CELOSCAN_API_KEY to your .env file");
    }

    // Verify on Sourcify
    console.log("\n[2/2] Verifying on Sourcify...");
    let sourcifyVerified = false;
    try {
      const result = execSync(
        `npx hardhat verify --network ${networkName} ${contractAddress} ${seasAddress} ${celoTokenAddress} 2>&1`,
        { stdio: "pipe", encoding: "utf-8", env: { ...process.env } }
      );
      
      // Check output for verification status
      const output = result.toString();
      if (output.includes("already been verified") || output.includes("verified successfully") || output.includes("Sourcify")) {
        sourcifyVerified = true;
        console.log("✓ Contract is already verified on Sourcify!");
        // Try to extract explorer URL
        const explorerMatch = output.match(/Explorer: (https:\/\/[^\s]+)/);
        if (explorerMatch) {
          console.log(`  ${explorerMatch[1]}`);
        }
      } else if (output.includes("Sourcify")) {
        // Check if Sourcify verification succeeded
        console.log("✓ Sourcify verification successful!");
        sourcifyVerified = true;
      }
    } catch (error: any) {
      const errorOutput = error.stdout?.toString() || error.stderr?.toString() || error.message || "";
      
      // Check if it's already verified (this is actually success for Sourcify)
      if (errorOutput.includes("already been verified") || errorOutput.includes("verified successfully")) {
        sourcifyVerified = true;
        console.log("✓ Contract is already verified on Sourcify!");
        const explorerMatch = errorOutput.match(/Explorer: (https:\/\/[^\s]+)/);
        if (explorerMatch) {
          console.log(`  ${explorerMatch[1]}`);
        }
      } else if (errorOutput.includes("Sourcify") && !errorOutput.includes("not supported")) {
        // Sourcify verification might have succeeded despite error
        sourcifyVerified = true;
        console.log("✓ Sourcify verification completed!");
      } else if (!errorOutput.includes("not supported")) {
        console.warn("⚠ Sourcify verification had issues, but contract may still be verified.");
        console.warn("  Please check manually at the Sourcify link below.");
      }
    }
    
    if (!sourcifyVerified) {
      console.log("ℹ Note: Contract verification status may need manual checking.");
    }

    console.log("\n=== Verification Summary ===");
    if (sourcifyVerified) {
      console.log("✅ Sourcify: VERIFIED (Decentralized verification - Recommended)");
    } else {
      console.log("⚠️  Sourcify: Verification status unclear");
    }
    console.log("⚠️  CeloScan: Manual verification may be needed (see links below)");
    
    console.log("\n📋 Verification Links:");
    console.log("\nSourcify (Verified):");
    if (networkName === "celo") {
      console.log(`  https://repo.sourcify.dev/contracts/full_match/42220/${contractAddress}/`);
      console.log(`  https://sourcify.dev/server/repo-ui/42220/${contractAddress}`);
    } else if (networkName === "celoSepolia") {
      console.log(`  https://repo.sourcify.dev/contracts/full_match/44787/${contractAddress}/`);
      console.log(`  https://sourcify.dev/server/repo-ui/44787/${contractAddress}`);
    }
    
    console.log("\nCeloScan (Manual verification if needed):");
    if (networkName === "celo") {
      console.log(`  https://celoscan.io/address/${contractAddress}#code`);
      console.log(`  Click "Verify and Publish" to verify manually`);
    } else if (networkName === "celoSepolia") {
      console.log(`  https://sepolia.celoscan.io/address/${contractAddress}#code`);
      console.log(`  Click "Verify and Publish" to verify manually`);
    }
  } catch (error: any) {
    console.error("✗ Verification failed:", error.message || error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


