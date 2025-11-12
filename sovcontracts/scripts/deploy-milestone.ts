import { network } from "hardhat";
import { getAddress } from "viem";

// Deployed Seas4 contract addresses
// Celo Mainnet: https://celoscan.io/address/0x0cc096b1cc568a22c1f02dab769881d1afe6161a#code
const SEAS4_MAINNET_ADDRESS = "0x0cC096B1cC568A22C1F02DAB769881d1aFE6161a";

const SEAS4_CONTRACT_ADDRESSES: Record<string, string> = {
  celo: SEAS4_MAINNET_ADDRESS,
  // For testnet, use mainnet address by default (or override with SEAS4_SEPOLIA_ADDRESS)
  celoSepolia: process.env.SEAS4_SEPOLIA_ADDRESS || SEAS4_MAINNET_ADDRESS,
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
  const seas4Address = SEAS4_CONTRACT_ADDRESSES[networkName] || SEAS4_MAINNET_ADDRESS;
  
  const isUsingMainnetAddress = networkName === "celoSepolia" && seas4Address === SEAS4_MAINNET_ADDRESS;
  if (isUsingMainnetAddress) {
    console.log("ℹ Using mainnet Seas4 address on testnet (for testing purposes)");
  }

  console.log("Deploying MilestoneBasedFunding contract...");
  console.log("Network:", networkName);
  console.log("Deployer:", deployer.account.address);
  console.log("Seas4 Contract:", seas4Address);
  if (isUsingMainnetAddress) {
    console.log("  (Note: This is the mainnet address - cross-chain calls may not work)");
  }

  // Verify Seas4 contract exists and is accessible
  // Note: If using mainnet address on testnet, this check will fail but we'll continue anyway
  try {
    const code = await publicClient.getBytecode({
      address: getAddress(seas4Address),
    });
    if (!code || code === "0x") {
      if (isUsingMainnetAddress) {
        console.warn(`⚠ Warning: Mainnet Seas4 contract not found on ${networkName} network`);
        console.warn("  This is expected if using mainnet address on testnet.");
        console.warn("  Deployment will continue, but cross-chain calls won't work.");
      } else {
        console.warn(`⚠ Warning: No contract found at address ${seas4Address}`);
        console.warn("  Deployment will continue, but verify the address is correct.");
      }
    } else {
      console.log("✓ Seas4 contract verified at address");
    }
  } catch (error: any) {
    if (isUsingMainnetAddress) {
      console.warn("⚠ Warning: Could not verify mainnet Seas4 contract on testnet network");
      console.warn("  This is expected - deployment will continue.");
    } else {
      console.warn("⚠ Warning: Could not verify Seas4 contract:", error.message || error);
      console.warn("  Deployment will continue, but verify the RPC connection and address.");
    }
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

