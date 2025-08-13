#!/usr/bin/env ts-node

import { ethers } from "hardhat";
import { config } from "dotenv";

config();

async function main() {
  const args = process.argv.slice(2);
  const verificationType = args[0];
  const network = args[1] || "alfajores";

  console.log(`🔍 Verifying ${verificationType} on ${network} network...`);

  try {
    switch (verificationType) {
      case "seas":
        await verifySeas(network);
        break;
      case "grants":
        await verifyGrants(network);
        break;
      case "claims":
        await verifyClaims(network);
        break;
      case "nft":
        await verifyNFT(network);
        break;
      case "tips":
        await verifyTips(network);
        break;
      case "uniswap-proxy":
        await verifyUniswapProxy(network);
        break;
      case "uniswap-v3-proxy":
        await verifyUniswapV3Proxy(network);
        break;
      case "uniswap-v2-proxy":
        await verifyUniswapV2Proxy(network);
        break;
      case "uniswap-factory":
        await verifyUniswapFactory(network);
        break;
      case "ubeswap-proxy":
        await verifyUbeswapProxy(network);
        break;
      case "good-dollar-voter":
        await verifyGoodDollarVoter();
        break;
      case "sovereign-voting":
        await verifySovereignVoting(network);
        break;
      case "working-proxy":
        await verifyWorkingProxy(network);
        break;
      case "all-uniswap":
        await verifyAllUniswap(network);
        break;
      default:
        console.log("❌ Unknown verification type. Available types:");
        console.log("  - seas: Verify Sovereign Seas contracts");
        console.log("  - grants: Verify grants contracts");
        console.log("  - claims: Verify claims contracts");
        console.log("  - nft: Verify NFT contracts");
        console.log("  - tips: Verify tips contracts");
        console.log("  - uniswap-proxy: Verify Uniswap voting proxy");
        console.log("  - uniswap-v3-proxy: Verify Uniswap V3 voting proxy");
        console.log("  - uniswap-v2-proxy: Verify Uniswap V2 voting proxy");
        console.log("  - uniswap-factory: Verify Uniswap factory");
        console.log("  - ubeswap-proxy: Verify Ubeswap voting proxy");
        console.log("  - good-dollar-voter: Verify Good Dollar voter");
        console.log("  - sovereign-voting: Verify Sovereign voting gateway");
        console.log("  - working-proxy: Verify working proxy");
        console.log("  - all-uniswap: Verify all Uniswap contracts");
        console.log("\nUsage: npm run verify <type> [network]");
        process.exit(1);
    }
  } catch (error) {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  }
}

async function verifySeas(network: string) {
  console.log("📦 Verifying Sovereign Seas contracts...");
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/verifies/verifySov.ts", "--network", network], { stdio: "inherit" });
}

async function verifyGrants(network: string) {
  console.log("🎁 Verifying grants contracts...");
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/verifies/verifyGrants.ts", "--network", network], { stdio: "inherit" });
}

async function verifyClaims(network: string) {
  console.log("💰 Verifying claims contracts...");
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/verifies/verifyClaims.ts", "--network", network], { stdio: "inherit" });
}

async function verifyNFT(network: string) {
  console.log(`🖼️ Verifying NFT contracts on ${network}...`);
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/verifies/verifyNFT.ts", "--network", network], { stdio: "inherit" });
}

async function verifyTips(network: string) {
  console.log(`💡 Verifying tips contracts on ${network}...`);
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/deploy/verify-tips.ts", "--network", network], { stdio: "inherit" });
}

async function verifyUniswapProxy(network: string) {
  console.log(`🔄 Verifying Uniswap voting proxy on ${network}...`);
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/verifies/verifyUniswapVotingProxy.ts", "--network", network], { stdio: "inherit" });
}

async function verifyUniswapV3Proxy(network: string) {
  console.log(`🔄 Verifying Uniswap V3 voting proxy on ${network}...`);
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/verifies/verifyUniswapV3VotingProxy.ts", "--network", network], { stdio: "inherit" });
}

async function verifyUniswapV2Proxy(network: string) {
  console.log(`🔄 Verifying Uniswap V2 voting proxy on ${network}...`);
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/verifies/verifyUniswapV2VotingProxy.ts", "--network", network], { stdio: "inherit" });
}

async function verifyUniswapFactory(network: string) {
  console.log(`🏭 Verifying Uniswap factory on ${network}...`);
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/verifies/verifyUniswapFactory.ts", "--network", network], { stdio: "inherit" });
}

async function verifyUbeswapProxy(network: string) {
  console.log(`🔄 Verifying Ubeswap voting proxy on ${network}...`);
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/verifies/verifyUbeswapVotingProxy.ts", "--network", network], { stdio: "inherit" });
}

async function verifyGoodDollarVoter() {
  console.log("💚 Verifying Good Dollar voter...");
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/deploy/verify-good-dollar-voter.ts"], { stdio: "inherit" });
}

async function verifySovereignVoting(network: string) {
  console.log(`🏛️ Verifying Sovereign voting gateway on ${network}...`);
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/verifies/verifySovereignVotingGateway.ts", "--network", network], { stdio: "inherit" });
}

async function verifyWorkingProxy(network: string) {
  console.log(`⚙️ Verifying working proxy on ${network}...`);
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/deploy/verify-enhanced-celo-voting-proxy.ts"], { stdio: "inherit" });
}

async function verifyAllUniswap(network: string) {
  console.log(`🏭 Verifying all Uniswap contracts on ${network}...`);
  await verifyUniswapV3Proxy(network);
  await verifyUniswapV2Proxy(network);
  await verifyUniswapFactory(network);
  console.log("✅ All Uniswap contracts verified successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
