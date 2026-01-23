import { network } from "hardhat";
import { getAddress } from "viem";

async function main() {
  // Get network name from command line arguments
  const networkName = process.argv.find((arg) => arg === "--network") 
    ? process.argv[process.argv.indexOf("--network") + 1] 
    : process.env.HARDHAT_NETWORK || "hardhat";

  const { viem } = await network.connect();
  const walletClients = await viem.getWalletClients();
  const deployer = walletClients[0];

  console.log("Deploying MockBroker contract...");
  console.log("Network:", networkName);
  console.log("Deployer:", deployer.account.address);

  const mockBroker = await viem.deployContract("MockBroker", []);

  console.log("\n=== Deployment Successful ===");
  console.log("MockBroker deployed to:", mockBroker.address);
  console.log("\nYou can verify the contract:");
  if (networkName === "base") {
    console.log(`https://basescan.org/address/${mockBroker.address}#code`);
  } else if (networkName === "baseSepolia") {
    console.log(`https://sepolia.basescan.org/address/${mockBroker.address}#code`);
  } else if (networkName === "celo") {
    console.log(`https://celoscan.io/address/${mockBroker.address}#code`);
  } else if (networkName === "celoSepolia") {
    console.log(`https://sepolia.celoscan.io/address/${mockBroker.address}#code`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
