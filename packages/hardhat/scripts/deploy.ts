#!/usr/bin/env ts-node

import { ethers } from "hardhat";
import { config } from "dotenv";

config();

async function main() {
  const args = process.argv.slice(2);
  const deploymentType = args[0];
  const network = args[1] || "alfajores";

  console.log(`🚀 Deploying ${deploymentType} to ${network} network...`);

  try {
    switch (deploymentType) {
      case "seas":
        await deploySeas(network);
        break;
      case "grants":
        await deployGrants();
        break;
      case "claims":
        await deployClaims();
        break;
      case "tips":
        await deployTips(network);
        break;
      case "nft":
        await deployNFT(network);
        break;
      case "uniswap-proxy":
        await deployUniswapProxy(network);
        break;
      case "uniswap-v3-proxy":
        await deployUniswapV3Proxy(network);
        break;
      case "uniswap-v2-proxy":
        await deployUniswapV2Proxy(network);
        break;
      case "uniswap-factory":
        await deployUniswapFactory(network);
        break;
      case "ubeswap-proxy":
        await deployUbeswapProxy(network);
        break;
      case "good-dollar-voter":
        await deployGoodDollarVoter();
        break;
      case "sovereign-voting":
        await deploySovereignVoting(network);
        break;
      case "working-proxy":
        await deployWorkingProxy(network);
        break;
      case "good-dollar-bridge":
        await deployGoodDollarBridge(network);
        break;
      case "all-uniswap":
        await deployAllUniswap(network);
        break;
      default:
        console.log("❌ Unknown deployment type. Available types:");
        console.log("  - seas: Deploy Sovereign Seas contracts");
        console.log("  - grants: Deploy grants contracts");
        console.log("  - claims: Deploy claims contracts");
        console.log("  - tips: Deploy tips contracts");
        console.log("  - nft: Deploy NFT contracts");
        console.log("  - uniswap-proxy: Deploy Uniswap voting proxy");
        console.log("  - uniswap-v3-proxy: Deploy Uniswap V3 voting proxy");
        console.log("  - uniswap-v2-proxy: Deploy Uniswap V2 voting proxy");
        console.log("  - uniswap-factory: Deploy Uniswap factory");
        console.log("  - ubeswap-proxy: Deploy Ubeswap voting proxy");
        console.log("  - good-dollar-voter: Deploy Good Dollar voter");
        console.log("  - sovereign-voting: Deploy Sovereign voting gateway");
        console.log("  - working-proxy: Deploy working proxy");
        console.log("  - good-dollar-bridge: Deploy Good Dollar Bridge contracts");
        console.log("  - all-uniswap: Deploy all Uniswap contracts");
        console.log("\nUsage: npm run deploy <type> [network]");
        process.exit(1);
    }
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

async function deploySeas(network: string) {
  console.log("📦 Deploying Sovereign Seas contracts...");
  // Import and run the deploySov script
  const { deploySov } = await import("./deploy/archive/deploySov");
  await deploySov(network);
}

async function deployGrants() {
  console.log("🎁 Deploying grants contracts...");
  const { deploySovGrants } = await import("./deploy/archive/deploySovGrants");
  await deploySovGrants();
}

async function deployClaims() {
  console.log("💰 Deploying claims contracts...");
  const { deployClaims } = await import("./deploy/archive/deployclaims");
  await deployClaims();
}

async function deployTips(network: string) {
  console.log(`💡 Deploying tips contracts to ${network}...`);
  const { deployTips } = await import("./deploy/deploy-tips");
  await deployTips(network);
}

async function deployNFT(network: string) {
  console.log(`🖼️ Deploying NFT contracts to ${network}...`);
  const { deployNFT } = await import("./deploy/archive/deployNFT");
  await deployNFT(network);
}

async function deployUniswapProxy(network: string) {
  console.log(`🔄 Deploying Uniswap voting proxy to ${network}...`);
  const { deployUniswapVotingProxy } = await import("./deploy/archive/deployUniswapVotingProxy");
  await deployUniswapVotingProxy(network);
}

async function deployUniswapV3Proxy(network: string) {
  console.log(`🔄 Deploying Uniswap V3 voting proxy to ${network}...`);
  const { deployUniswapV3VotingProxy } = await import("./deploy/archive/deployUniswapV3VotingProxy");
  await deployUniswapV3VotingProxy(network);
}

async function deployUniswapV2Proxy(network: string) {
  console.log(`🔄 Deploying Uniswap V2 voting proxy to ${network}...`);
  const { deployUniswapV2VotingProxy } = await import("./deploy/archive/deployUniswapV2VotingProxy");
  await deployUniswapV2VotingProxy(network);
}

async function deployUniswapFactory(network: string) {
  console.log(`🏭 Deploying Uniswap factory to ${network}...`);
  const { deployUniswapFactory } = await import("./deploy/archive/deployUniswapFactory");
  await deployUniswapFactory(network);
}

async function deployUbeswapProxy(network: string) {
  console.log(`🔄 Deploying Ubeswap voting proxy to ${network}...`);
  const { deployUbeswapVotingProxy } = await import("./deploy/archive/deployUbeswapVotingProxy");
  await deployUbeswapVotingProxy(network);
}

async function deployGoodDollarVoter() {
  console.log("💚 Deploying Good Dollar voter...");
  const { deployGoodDollarVoter } = await import("./deploy/deploy-good-dollar-voter");
  await deployGoodDollarVoter();
}

async function deploySovereignVoting(network: string) {
  console.log(`🏛️ Deploying Sovereign voting gateway to ${network}...`);
  const { deploySovereignVotingGateway } = await import("./deploy/archive/deploySovereignVotingGateway");
  await deploySovereignVotingGateway(network);
}

async function deployWorkingProxy(network: string) {
  console.log(`⚙️ Deploying working proxy to ${network}...`);
  const { deployWorkingProxy } = await import("./deploy/deploy-working-proxy");
  await deployWorkingProxy(network);
}

async function deployGoodDollarBridge(network: string) {
  console.log(`🌉 Deploying Good Dollar Bridge to ${network}...`);
  const { main } = await import("./deploy-good-dollar-bridge");
  await main();
}

async function deployAllUniswap(network: string) {
  console.log(`🏭 Deploying all Uniswap contracts to ${network}...`);
  await deployUniswapV3Proxy(network);
  await deployUniswapV2Proxy(network);
  await deployUniswapFactory(network);
  console.log("✅ All Uniswap contracts deployed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
