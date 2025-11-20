import { network } from "hardhat";
import { getAddress } from "viem";

const SEAS_PROJECTS_ADDRESS = "0x0cC096B1cC568A22C1F02DAB769881d1aFE6161a";
const PROTOCOL_TREASURY_ADDRESS = "0x53eaf4cd171842d8144e45211308e5d90b4b0088";
const AIR_TREASURY_ADDRESS = "0x53eaf4cd171842d8144e45211308e5d90b4b0088";
const BUILDER_REWARDS_BASE_URI = "";

async function main() {
  const networkName = process.argv.find((arg) => arg === "--network")
    ? process.argv[process.argv.indexOf("--network") + 1]
    : process.env.HARDHAT_NETWORK || "hardhat";

  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  const deployer = walletClients[0];

  const seasProjectsAddress = getAddress(SEAS_PROJECTS_ADDRESS);
  const protocolTreasury = getAddress(PROTOCOL_TREASURY_ADDRESS);
  const airTreasury = getAddress(AIR_TREASURY_ADDRESS);
  const baseUri = BUILDER_REWARDS_BASE_URI;

  console.log("Deploying BuilderRewardsNFT contract...");
  console.log("Network:", networkName);
  console.log("Deployer:", deployer.account.address);
  console.log("SovereignSeasProjects:", seasProjectsAddress);
  console.log("Protocol Treasury:", protocolTreasury);
  console.log("Air Treasury:", airTreasury);
  console.log("Base URI:", baseUri.length > 0 ? baseUri : "<none>");

  try {
    const code = await publicClient.getBytecode({ address: seasProjectsAddress });
    if (!code || code === "0x") {
      console.warn(`⚠ Warning: No contract found at seasProjects address ${seasProjectsAddress}`);
      console.warn("  Deployment will continue, but ensure the address is correct.");
    } else {
      console.log("✓ SovereignSeasProjects contract detected");
    }
  } catch (error: any) {
    console.warn("⚠ Warning: Could not verify SovereignSeasProjects contract:", error.message || error);
    console.warn("  Deployment will continue, but verify RPC connectivity.");
  }

  const builderRewards = await viem.deployContract("BuilderRewardsNFT", [
    seasProjectsAddress,
    protocolTreasury,
    airTreasury,
    baseUri,
  ]);

  console.log("\n=== Deployment Successful ===");
  console.log("BuilderRewardsNFT deployed to:", builderRewards.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


