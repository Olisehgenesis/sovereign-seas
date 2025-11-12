import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Deployed Seas4 contract address on Celo Mainnet
// https://celoscan.io/address/0x0cc096b1cc568a22c1f02dab769881d1afe6161a#code
const SEAS4_CONTRACT_ADDRESS = "0x0cC096B1cC568A22C1F02DAB769881d1aFE6161a";

export default buildModule("MilestoneModule", (m) => {
  // Deploy MilestoneBasedFunding contract with Seas4 contract address
  const milestone = m.contract("MilestoneBasedFunding", [
    SEAS4_CONTRACT_ADDRESS,
  ]);

  return { milestone };
});

