import { network } from "hardhat";
import { getAddress } from "viem";

// Deployed Seas4 contract addresses
// Celo Mainnet: https://celoscan.io/address/0x0cc096b1cc568a22c1f02dab769881d1afe6161a#code
const SEAS4_CONTRACT_ADDRESSES: Record<string, string> = {
  celo: "0x0cC096B1cC568A22C1F02DAB769881d1aFE6161a",
  celoSepolia: process.env.SEAS4_SEPOLIA_ADDRESS || "", // Optional: set if Seas4 is deployed on Sepolia
};

async function main() {
  // Get network name from command line arguments
  const networkName = process.argv.find((arg) => arg === "--network") 
    ? process.argv[process.argv.indexOf("--network") + 1] 
    : process.env.HARDHAT_NETWORK || "hardhat";

  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  const deployer = walletClients[0];

  // Get Seas4 contract address for the current network
  const seas4Address = SEAS4_CONTRACT_ADDRESSES[networkName];
  
  if (!seas4Address) {
    console.warn(`⚠ Warning: No Seas4 contract address configured for network "${networkName}"`);
    console.warn("  The milestone contract will be deployed but may not work correctly without a valid Seas4 address.");
    console.warn("  Set SEAS4_SEPOLIA_ADDRESS in .env if Seas4 is deployed on this network.");
  }

  console.log("Deploying MilestoneBasedFunding contract...");
  console.log("Network:", networkName);
  console.log("Deployer:", deployer.account.address);
  if (seas4Address) {
    console.log("Seas4 Contract:", seas4Address);
  }

  // Verify Seas4 contract exists and is accessible (only if address is configured)
  if (seas4Address) {
    try {
      const code = await publicClient.getBytecode({
        address: getAddress(seas4Address),
      });
      if (!code || code === "0x") {
        console.warn(`⚠ Warning: No contract found at address ${seas4Address}`);
        console.warn("  Deployment will continue, but verify the address is correct.");
      } else {
        console.log("✓ Seas4 contract verified at address");
      }
    } catch (error: any) {
      console.warn("⚠ Warning: Could not verify Seas4 contract:", error.message || error);
      console.warn("  Deployment will continue, but verify the RPC connection and address.");
    }
  }

  // Deploy MilestoneBasedFunding
  if (!seas4Address) {
    throw new Error(
      `Cannot deploy: No Seas4 contract address configured for network "${networkName}". ` +
      `Please set SEAS4_SEPOLIA_ADDRESS in .env or deploy Seas4 to this network first.`
    );
  }

  const milestone = await viem.deployContract("MilestoneBasedFunding", [
    getAddress(seas4Address),
  ]);

  console.log("\n=== Deployment Successful ===");
  console.log("MilestoneBasedFunding deployed to:", milestone.address);
  console.log("\nYou can verify the contract on CeloScan:");
  if (networkName === "celo") {
    console.log(`https://celoscan.io/address/${milestone.address}#code`);
  } else if (networkName === "celoSepolia") {
    console.log(`https://sepolia.celoscan.io/address/${milestone.address}#code`);
  }
  console.log("\nConstructor Arguments:");
  console.log(`  Seas4 Contract: ${seas4Address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

