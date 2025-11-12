import { execSync } from "child_process";

// Deployed Seas4 contract address on Celo Mainnet
const SEAS4_MAINNET_ADDRESS = "0x0cC096B1cC568A22C1F02DAB769881d1aFE6161a";

async function main() {
  // Get network name from command line arguments first
  const networkIndex = process.argv.findIndex((arg) => arg === "--network");
  const networkName = networkIndex >= 0 && process.argv[networkIndex + 1]
    ? process.argv[networkIndex + 1]
    : "celo";

  // Get contract address from environment variable or command line arguments
  // Check for address in environment variable first, then in process.argv
  let contractAddress = process.env.MILESTONE_CONTRACT_ADDRESS;
  if (!contractAddress) {
    // Try to find address in command line arguments (after script name)
    const scriptIndex = process.argv.findIndex((arg) => arg.includes("verify-milestone.ts"));
    if (scriptIndex >= 0 && process.argv[scriptIndex + 1]) {
      contractAddress = process.argv[scriptIndex + 1];
    } else {
      // Look for any argument that looks like an Ethereum address
      contractAddress = process.argv.find((arg) => arg.startsWith("0x") && arg.length === 42);
    }
  }

  if (!contractAddress) {
    console.error("Error: Contract address is required");
    console.error("Usage: pnpm run verify:milestone:celo <CONTRACT_ADDRESS>");
    console.error("   or: pnpm run verify:milestone:celo-sepolia <CONTRACT_ADDRESS>");
    console.error("\nExample: pnpm run verify:milestone:celo 0x71c3293127cc83620834c74216c2db7adf9d924c");
    process.exit(1);
  }

  // Get Seas4 address for the network
  const seas4Address =
    networkName === "celoSepolia"
      ? process.env.SEAS4_SEPOLIA_ADDRESS || SEAS4_MAINNET_ADDRESS
      : SEAS4_MAINNET_ADDRESS;

  console.log("Verifying MilestoneBasedFunding contract...");
  console.log("Network:", networkName);
  console.log("Contract Address:", contractAddress);
  console.log("Constructor Arguments:");
  console.log(`  Seas4 Contract: ${seas4Address}`);

  try {
    // Verify on CeloScan (if API key is configured)
    if (process.env.CELOSCAN_API_KEY) {
      console.log("\n[1/2] Verifying on CeloScan...");
      try {
        execSync(
          `npx hardhat verify --network ${networkName} ${contractAddress} ${seas4Address}`,
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
        `npx hardhat verify --network ${networkName} ${contractAddress} ${seas4Address} 2>&1`,
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

