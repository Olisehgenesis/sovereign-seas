import { network } from "hardhat";
import { getAddress } from "viem";

// Celo token addresses for different networks
const CELO_TOKEN_ADDRESSES: Record<string, string> = {
  // Celo Mainnet: Native CELO token
  celo: "0x471EcE3750Da237f93B8E339c536989b8978a438",
  // Celo Sepolia: Native CELO token
  celoSepolia: "0x471EcE3750Da237f93B8E339c536989b8978a438",
};

// SovereignSeasV4 contract addresses
const SEAS_CONTRACT_ADDRESSES: Record<string, string> = {
  // Celo Mainnet: https://celoscan.io/address/0x0cc096b1cc568a22c1f02dab769881d1afe6161a#code
  celo: process.env.SEAS_CONTRACT_ADDRESS || "0x0cC096B1cC568A22C1F02DAB769881d1aFE6161a",
  // Celo Sepolia: https://sepolia.celoscan.io/address/0x73ac3ce3358a892f69238c7009ca4da4b0dd1470#code
  celoSepolia: process.env.SEAS_CONTRACT_ADDRESS || "0x73ac3ce3358a892f69238c7009ca4da4b0dd1470",
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

  // Get addresses for the current network
  const celoTokenAddress = CELO_TOKEN_ADDRESSES[networkName] || CELO_TOKEN_ADDRESSES.celo;
  const seasAddress = SEAS_CONTRACT_ADDRESSES[networkName] || process.env.SEAS_CONTRACT_ADDRESS;
  
  if (!seasAddress) {
    console.error("Error: SEAS_CONTRACT_ADDRESS is required");
    console.error("\nPlease set the SovereignSeasV4 contract address:");
    console.error("  1. Set environment variable: SEAS_CONTRACT_ADDRESS=0x...");
    console.error("  2. Or update SEAS_CONTRACT_ADDRESSES in this script");
    console.error("\nExample:");
    console.error("  SEAS_CONTRACT_ADDRESS=0x... pnpm run deploy:tournament:celo");
    process.exit(1);
  }

  console.log("Deploying SovereignTournament contract...");
  console.log("Network:", networkName);
  console.log("Deployer:", deployer.account.address);
  console.log("Seas4 Contract:", seasAddress);
  console.log("Celo Token:", celoTokenAddress);

  // Verify Seas4 contract exists and is accessible
  try {
    const seasCode = await publicClient.getBytecode({
      address: getAddress(seasAddress),
    });
    if (!seasCode || seasCode === "0x") {
      console.warn(`⚠ Warning: No contract found at Seas4 address ${seasAddress}`);
      console.warn("  Deployment will continue, but verify the address is correct.");
    } else {
      console.log("✓ Seas4 contract verified at address");
    }
  } catch (error: any) {
    console.warn("⚠ Warning: Could not verify Seas4 contract:", error.message || error);
    console.warn("  Deployment will continue, but verify the RPC connection and address.");
  }

  // Verify Celo token contract exists and is accessible
  try {
    const celoCode = await publicClient.getBytecode({
      address: getAddress(celoTokenAddress),
    });
    if (!celoCode || celoCode === "0x") {
      console.warn(`⚠ Warning: No contract found at Celo token address ${celoTokenAddress}`);
      console.warn("  Deployment will continue, but verify the address is correct.");
    } else {
      console.log("✓ Celo token contract verified at address");
    }
  } catch (error: any) {
    console.warn("⚠ Warning: Could not verify Celo token contract:", error.message || error);
    console.warn("  Deployment will continue, but verify the RPC connection and address.");
  }

  const tournament = await viem.deployContract("SovereignTournament", [
    getAddress(seasAddress),
    getAddress(celoTokenAddress),
  ]);

  console.log("\n=== Deployment Successful ===");
  console.log("SovereignTournament deployed to:", tournament.address);
  console.log("\nYou can verify the contract on CeloScan:");
  if (networkName === "celo") {
    console.log(`https://celoscan.io/address/${tournament.address}#code`);
  } else if (networkName === "celoSepolia") {
    console.log(`https://sepolia.celoscan.io/address/${tournament.address}#code`);
  }
  console.log("\nConstructor Arguments:");
  console.log(`  Seas4 Contract: ${seasAddress}`);
  console.log(`  Celo Token: ${celoTokenAddress}`);
  console.log("\n📝 Next Steps:");
  console.log("1. Verify the contract:");
  console.log(`   CONTRACT_ADDRESS=${tournament.address} SEAS_CONTRACT_ADDRESS=${seasAddress} pnpm run verify:tournament:${networkName}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

