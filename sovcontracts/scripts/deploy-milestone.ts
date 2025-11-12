import { network, config } from "hardhat";
import { getAddress } from "viem";

// Deployed Seas4 contract address on Celo Mainnet
// https://celoscan.io/address/0x0cc096b1cc568a22c1f02dab769881d1afe6161a#code
const SEAS4_CONTRACT_ADDRESS = "0x0cC096B1cC568A22C1F02DAB769881d1aFE6161a";

async function main() {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  const deployer = walletClients[0];
  
  // Get network name from process.argv or default
  const networkName = process.env.HARDHAT_NETWORK || "hardhat";

  console.log("Deploying MilestoneBasedFunding contract...");
  console.log("Network:", networkName);
  console.log("Deployer:", deployer.account.address);
  console.log("Seas4 Contract:", SEAS4_CONTRACT_ADDRESS);

  // Verify Seas4 contract exists and is accessible
  try {
    const code = await publicClient.getBytecode({
      address: getAddress(SEAS4_CONTRACT_ADDRESS),
    });
    if (!code || code === "0x") {
      throw new Error(`No contract found at address ${SEAS4_CONTRACT_ADDRESS}`);
    }
    console.log("✓ Seas4 contract verified at address");
  } catch (error) {
    console.error("✗ Failed to verify Seas4 contract:", error);
    throw error;
  }

  // Deploy MilestoneBasedFunding
  const milestone = await viem.deployContract("MilestoneBasedFunding", [
    SEAS4_CONTRACT_ADDRESS,
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
  console.log(`  Seas4 Contract: ${SEAS4_CONTRACT_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

