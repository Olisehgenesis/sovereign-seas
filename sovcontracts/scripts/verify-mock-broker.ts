import { execSync } from "child_process";

async function main() {
  const networkIndex = process.argv.findIndex((arg) => arg === "--network");
  const networkName = networkIndex >= 0 && process.argv[networkIndex + 1]
    ? process.argv[networkIndex + 1]
    : "base";

  let contractAddress = process.env.CONTRACT_ADDRESS || process.env.MOCK_BROKER_ADDRESS;
  if (!contractAddress) {
    contractAddress = process.argv.find((arg) => arg.startsWith("0x") && arg.length === 42);
  }

  if (!contractAddress) {
    console.error("Error: Contract address is required");
    console.error("\nUsage options:");
    console.error("  1. Set environment variable:");
    console.error("     CONTRACT_ADDRESS=0x... pnpm run verify:mock-broker:base");
    console.error("  2. Or use:");
    console.error("     MOCK_BROKER_ADDRESS=0x... pnpm run verify:mock-broker:base");
    console.error("\nExample:");
    console.error("  CONTRACT_ADDRESS=0xf32906ed19dd9ab4aa0cf07d5402b80bdab54909 pnpm run verify:mock-broker:base");
    process.exit(1);
  }

  console.log("Verifying MockBroker contract...");
  console.log("Network:", networkName);
  console.log("Contract Address:", contractAddress);
  console.log("Constructor Arguments: None (MockBroker has no constructor parameters)");

  try {
    // MockBroker has no constructor arguments
    execSync(
      `npx hardhat verify --network ${networkName} ${contractAddress}`,
      { stdio: "inherit" }
    );
    console.log("✓ Verification successful!");
  } catch (error: any) {
    const errorMessage = error.message || error.stdout?.toString() || error.stderr?.toString() || "";
    if (errorMessage.includes("Already Verified") || errorMessage.includes("already verified")) {
      console.log("✓ Contract is already verified!");
    } else {
      console.warn("⚠ Verification failed:", errorMessage);
      console.log("\nYou can verify manually:");
      if (networkName === "base") {
        console.log(`  https://basescan.org/address/${contractAddress}#code`);
        console.log(`  Click "Verify and Publish" → Select "Solidity (Single file)" → Upload MockBroker.sol`);
      } else if (networkName === "baseSepolia") {
        console.log(`  https://sepolia.basescan.org/address/${contractAddress}#code`);
        console.log(`  Click "Verify and Publish" → Select "Solidity (Single file)" → Upload MockBroker.sol`);
      } else if (networkName === "celo") {
        console.log(`  https://celoscan.io/address/${contractAddress}#code`);
      } else if (networkName === "celoSepolia") {
        console.log(`  https://sepolia.celoscan.org/address/${contractAddress}#code`);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
