import { network } from "hardhat";
import { getAddress } from "viem";

// Celo token and broker addresses for different networks
const CELO_TOKEN_ADDRESSES: Record<string, string> = {
  // Celo Mainnet: Native CELO token
  celo: "0x471EcE3750Da237f93B8E339c536989b8978a438",
  // Celo Sepolia: Native CELO token
  celoSepolia: "0x471EcE3750Da237f93B8E339c536989b8978a438",
};

const BROKER_ADDRESSES: Record<string, string> = {
  // Celo Mainnet: Mento Protocol Broker
  celo: "0xB9Ae2065142EB79b6c5EB1E8778F883fad6B07Ba",
  // Celo Sepolia: Mento Protocol Broker
  celoSepolia: "0xB9Ae2065142EB79b6c5EB1E8778F883fad6B07Ba",
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
  const brokerAddress = BROKER_ADDRESSES[networkName] || BROKER_ADDRESSES.celo;

  console.log("Deploying SovereignSeasV4 contract...");
  console.log("Network:", networkName);
  console.log("Deployer:", deployer.account.address);
  console.log("Celo Token:", celoTokenAddress);
  console.log("Broker:", brokerAddress);

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

  // Verify Broker contract exists and is accessible
  try {
    const brokerCode = await publicClient.getBytecode({
      address: getAddress(brokerAddress),
    });
    if (!brokerCode || brokerCode === "0x") {
      console.warn(`⚠ Warning: No contract found at Broker address ${brokerAddress}`);
      console.warn("  Deployment will continue, but verify the address is correct.");
    } else {
      console.log("✓ Broker contract verified at address");
    }
  } catch (error: any) {
    console.warn("⚠ Warning: Could not verify Broker contract:", error.message || error);
    console.warn("  Deployment will continue, but verify the RPC connection and address.");
  }

  const seas = await viem.deployContract("SovereignSeasV4", [
    getAddress(celoTokenAddress),
    getAddress(brokerAddress),
  ]);

  console.log("\n=== Deployment Successful ===");
  console.log("SovereignSeasV4 deployed to:", seas.address);
  console.log("\nYou can verify the contract on CeloScan:");
  if (networkName === "celo") {
    console.log(`https://celoscan.io/address/${seas.address}#code`);
  } else if (networkName === "celoSepolia") {
    console.log(`https://sepolia.celoscan.io/address/${seas.address}#code`);
  }
  console.log("\nConstructor Arguments:");
  console.log(`  Celo Token: ${celoTokenAddress}`);
  console.log(`  Broker: ${brokerAddress}`);
  console.log("\n📝 Next Steps:");
  console.log("1. Verify the contract:");
  console.log(`   CONTRACT_ADDRESS=${seas.address} pnpm run verify:seas:${networkName}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

