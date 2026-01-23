import { execSync } from "child_process";

const SEAS4_CONTRACT_ADDRESSES: Record<string, string> = {
  celo: "0x0cC096B1cC568A22C1F02DAB769881d1aFE6161a",
  celoSepolia: process.env.SEAS_CONTRACT_ADDRESS || "0x73ac3ce3358a892f69238c7009ca4da4b0dd1470",
  base: process.env.SEAS_CONTRACT_ADDRESS || "",
  baseSepolia: process.env.SEAS_CONTRACT_ADDRESS || "",
};

async function main() {
  const networkIndex = process.argv.findIndex((arg) => arg === "--network");
  const networkName = networkIndex >= 0 && process.argv[networkIndex + 1]
    ? process.argv[networkIndex + 1]
    : "celo";

  let contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    contractAddress = process.argv.find((arg) => arg.startsWith("0x") && arg.length === 42);
  }

  if (!contractAddress) {
    console.error("Error: Contract address is required");
    console.error("\nUsage: CONTRACT_ADDRESS=0x... SEAS_CONTRACT_ADDRESS=0x... pnpm run verify:pool:base");
    process.exit(1);
  }

  const seasAddress = SEAS4_CONTRACT_ADDRESSES[networkName] || process.env.SEAS_CONTRACT_ADDRESS;
  if (!seasAddress) {
    console.error("Error: SEAS_CONTRACT_ADDRESS is required");
    console.error("\nUsage: CONTRACT_ADDRESS=0x... SEAS_CONTRACT_ADDRESS=0x... pnpm run verify:pool:base");
    process.exit(1);
  }

  console.log("Verifying SeasPrizePool contract...");
  console.log("Network:", networkName);
  console.log("Contract Address:", contractAddress);
  console.log("Constructor Arguments:");
  console.log(`  Seas4 Contract: ${seasAddress}`);

  try {
    execSync(
      `npx hardhat verify --network ${networkName} ${contractAddress} ${seasAddress}`,
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
      } else if (networkName === "baseSepolia") {
        console.log(`  https://sepolia.basescan.org/address/${contractAddress}#code`);
      } else if (networkName === "celo") {
        console.log(`  https://celoscan.io/address/${contractAddress}#code`);
      } else if (networkName === "celoSepolia") {
        console.log(`  https://sepolia.celoscan.io/address/${contractAddress}#code`);
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
