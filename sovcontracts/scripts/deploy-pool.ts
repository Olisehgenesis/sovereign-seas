import { network } from "hardhat";
import { getAddress } from "viem";

const SEAS4_CONTRACT_ADDRESSES: Record<string, string> = {
  // Celo Mainnet: https://celoscan.io/address/0x0cc096b1cc568a22c1f02dab769881d1afe6161a#code
  celo: "0x0cC096B1cC568A22C1F02DAB769881d1aFE6161a",
  // Celo Sepolia: https://sepolia.celoscan.io/address/0x73ac3ce3358a892f69238c7009ca4da4b0dd1470#code
  celoSepolia: process.env.SEAS_CONTRACT_ADDRESS || "0x73ac3ce3358a892f69238c7009ca4da4b0dd1470",
  // Base networks: Set via env or update after deployment
  base: process.env.SEAS_CONTRACT_ADDRESS || "",
  baseSepolia: process.env.SEAS_CONTRACT_ADDRESS || "",
};

const SEAS4_MAINNET_ADDRESS = SEAS4_CONTRACT_ADDRESSES.celo;

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
  
  if (!seas4Address) {
    console.error("❌ Error: SEAS_CONTRACT_ADDRESS must be set for this network");
    console.error("   Set SEAS_CONTRACT_ADDRESS=<address> and run this script again");
    process.exit(1);
  }
  
  const isUsingMainnetAddress = networkName === "celoSepolia" && seas4Address === SEAS4_MAINNET_ADDRESS;
  if (isUsingMainnetAddress) {
    console.log("ℹ Using mainnet Seas4 address on testnet (for testing purposes)");
  }

  console.log("Deploying SeasPrizePool contract...");
  console.log("Network:", networkName);
  console.log("Deployer:", deployer.account.address);
  console.log("Seas4 Contract:", seas4Address);
  if (isUsingMainnetAddress) {
    console.log("  (Note: This is the mainnet address - cross-chain calls may not work)");
  }

  // Verify Seas4 contract exists and is accessible
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

  const pool = await viem.deployContract("SeasPrizePool", [
    getAddress(seas4Address),
  ]);

  console.log("\n=== Deployment Successful ===");
  console.log("SeasPrizePool deployed to:", pool.address);
  console.log("\nYou can verify the contract:");
  if (networkName === "celo") {
    console.log(`https://celoscan.io/address/${pool.address}#code`);
  } else if (networkName === "celoSepolia") {
    console.log(`https://sepolia.celoscan.io/address/${pool.address}#code`);
  } else if (networkName === "base") {
    console.log(`https://basescan.org/address/${pool.address}#code`);
  } else if (networkName === "baseSepolia") {
    console.log(`https://sepolia.basescan.org/address/${pool.address}#code`);
  }
  console.log("\nConstructor Arguments:");
  console.log(`  Seas4 Contract: ${seas4Address}`);
  console.log("\n📝 Next Steps:");
  console.log("1. Verify the contract:");
  console.log(`   CONTRACT_ADDRESS=${pool.address} SEAS_CONTRACT_ADDRESS=${seas4Address} pnpm run verify:pool:${networkName}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
