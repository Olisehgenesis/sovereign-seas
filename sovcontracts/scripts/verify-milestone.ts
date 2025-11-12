import { execSync } from "child_process";

// Deployed Seas4 contract address on Celo Mainnet
const SEAS4_MAINNET_ADDRESS = "0x0cC096B1cC568A22C1F02DAB769881d1aFE6161a";

async function main() {
  // Get contract address from command line arguments
  const contractAddress = process.argv[2];
  const networkName = process.argv.find((arg) => arg === "--network")
    ? process.argv[process.argv.indexOf("--network") + 1]
    : "celo";

  if (!contractAddress) {
    console.error("Error: Contract address is required");
    console.error("Usage: pnpm run verify:milestone:celo <CONTRACT_ADDRESS>");
    console.error("   or: pnpm run verify:milestone:celo-sepolia <CONTRACT_ADDRESS>");
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
    // Verify on CeloScan
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
      } else {
        console.warn("⚠ CeloScan verification failed:", errorMessage);
        console.warn("  Continuing with Sourcify verification...");
      }
    }

    // Verify on Sourcify
    console.log("\n[2/2] Verifying on Sourcify...");
    try {
      execSync(
        `npx hardhat sourcify --network ${networkName} ${contractAddress} ${seas4Address}`,
        { stdio: "inherit" }
      );
      console.log("✓ Sourcify verification successful!");
    } catch (error: any) {
      const errorMessage = error.message || error.stdout?.toString() || error.stderr?.toString() || "";
      if (errorMessage.includes("already verified") || errorMessage.includes("Already Verified")) {
        console.log("✓ Contract is already verified on Sourcify!");
      } else {
        console.warn("⚠ Sourcify verification failed:", errorMessage);
      }
    }

    console.log("\n=== Verification Complete ===");
    console.log("\nView on CeloScan:");
    if (networkName === "celo") {
      console.log(`https://celoscan.io/address/${contractAddress}#code`);
    } else if (networkName === "celoSepolia") {
      console.log(`https://sepolia.celoscan.io/address/${contractAddress}#code`);
    }
    console.log("\nView on Sourcify:");
    if (networkName === "celo") {
      console.log(`https://repo.sourcify.dev/contracts/full_match/42220/${contractAddress}/`);
    } else if (networkName === "celoSepolia") {
      console.log(`https://repo.sourcify.dev/contracts/full_match/44787/${contractAddress}/`);
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

