import { network } from "hardhat";
import { getAddress } from "viem";

// Base token (ETH/WETH) and broker addresses for different networks
const BASE_TOKEN_ADDRESSES: Record<string, string> = {
  // Celo Mainnet: Native CELO token
  celo: "0x471EcE3750Da237f93B8E339c536989b8978a438",
  // Celo Sepolia: Native CELO token
  celoSepolia: "0x471EcE3750Da237f93B8E339c536989b8978a438",
  // Base Mainnet: WETH (0x4200000000000000000000000000000000000006)
  base: "0x4200000000000000000000000000000000000006",
  // Base Sepolia: WETH
  baseSepolia: "0x4200000000000000000000000000000000000006",
};

const BROKER_ADDRESSES: Record<string, string> = {
  // Celo Mainnet: Mento Protocol Broker
  celo: "0xB9Ae2065142EB79b6c5EB1E8778F883fad6B07Ba",
  // Celo Sepolia: Mento Protocol Broker
  celoSepolia: "0xB9Ae2065142EB79b6c5EB1E8778F883fad6B07Ba",
  // Base networks: Use MockBroker (deploy separately or set via env)
  base: process.env.BASE_BROKER_ADDRESS || "",
  baseSepolia: process.env.BASE_BROKER_ADDRESS || "",
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
  const baseTokenAddress = BASE_TOKEN_ADDRESSES[networkName] || BASE_TOKEN_ADDRESSES.celo;
  let brokerAddress = BROKER_ADDRESSES[networkName] || BROKER_ADDRESSES.celo;

  // For Base networks, require broker address to be set
  if ((networkName === "base" || networkName === "baseSepolia") && !brokerAddress) {
    console.error("❌ Error: BROKER_ADDRESS or BASE_BROKER_ADDRESS must be set for Base networks");
    console.error("   Deploy MockBroker first: pnpm run deploy:mock-broker:base");
    console.error("   Then set BASE_BROKER_ADDRESS=<address> and run this script again");
    process.exit(1);
  }

  console.log("Deploying SovereignSeasV4 contract...");
  console.log("Network:", networkName);
  console.log("Deployer:", deployer.account.address);
  console.log("Base Token:", baseTokenAddress);
  console.log("Broker:", brokerAddress);

  // Verify base token contract exists and is accessible
  try {
    const tokenCode = await publicClient.getBytecode({
      address: getAddress(baseTokenAddress),
    });
    if (!tokenCode || tokenCode === "0x") {
      console.warn(`⚠ Warning: No contract found at base token address ${baseTokenAddress}`);
      console.warn("  Deployment will continue, but verify the address is correct.");
    } else {
      console.log("✓ Base token contract verified at address");
    }
  } catch (error: any) {
    console.warn("⚠ Warning: Could not verify base token contract:", error.message || error);
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
    getAddress(baseTokenAddress),
    getAddress(brokerAddress),
  ]);

  console.log("\n=== Deployment Successful ===");
  console.log("SovereignSeasV4 deployed to:", seas.address);
  console.log("\nYou can verify the contract:");
  if (networkName === "celo") {
    console.log(`https://celoscan.io/address/${seas.address}#code`);
  } else if (networkName === "celoSepolia") {
    console.log(`https://sepolia.celoscan.io/address/${seas.address}#code`);
  } else if (networkName === "base") {
    console.log(`https://basescan.org/address/${seas.address}#code`);
  } else if (networkName === "baseSepolia") {
    console.log(`https://sepolia.basescan.org/address/${seas.address}#code`);
  }
  console.log("\nConstructor Arguments:");
  console.log(`  Base Token: ${baseTokenAddress}`);
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

