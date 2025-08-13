#!/usr/bin/env ts-node

import { config } from "dotenv";
import { spawn } from "child_process";

config();

async function main() {
  const args = process.argv.slice(2);
  const testType = args[0];
  const network = args[1] || "alfajores";

  console.log(`🧪 Testing ${testType} on ${network} network...`);

  try {
    switch (testType) {
      case "nft":
        await testNFT(network);
        break;
      case "vote":
        await testVote(network);
        break;
      case "vote:loose":
        await testVoteLoose(network);
        break;
      case "swap":
        await testSwap();
        break;
      case "swap:loose":
        await testSwapLoose();
        break;
      case "uniswap-proxy":
        await testUniswapProxy(network);
        break;
      case "uniswap-v3-proxy":
        await testUniswapV3Proxy(network);
        break;
      case "uniswap-v2-proxy":
        await testUniswapV2Proxy(network);
        break;
      case "ubeswap-proxy":
        await testUbeswapProxy(network);
        break;
      case "good-dollar-voter":
        await testGoodDollarVoter();
        break;
      case "claim-vote":
        await testClaimVote();
        break;
      case "uniswap-voting":
        await testUniswapVoting(network);
        break;
      default:
        console.log("❌ Unknown test type. Available types:");
        console.log("  - nft: Test NFT functionality");
        console.log("  - vote: Test voting functionality");
        console.log("  - vote:loose: Test voting with loose transpilation");
        console.log("  - swap: Test swap functionality");
        console.log("  - swap:loose: Test swap with loose transpilation");
        console.log("  - uniswap-proxy: Test Uniswap voting proxy");
        console.log("  - uniswap-v3-proxy: Test Uniswap V3 voting proxy");
        console.log("  - uniswap-v2-proxy: Test Uniswap V2 voting proxy");
        console.log("  - ubeswap-proxy: Test Ubeswap voting proxy");
        console.log("  - good-dollar-voter: Test Good Dollar voter");
        console.log("  - claim-vote: Test claim vote functionality");
        console.log("  - uniswap-voting: Test Uniswap voting");
        console.log("\nUsage: npm run test <type> [network]");
        process.exit(1);
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

async function testNFT(network: string) {
  console.log(`🖼️ Testing NFT functionality on ${network}...`);
  spawn("npx", ["ts-node", "scripts/tests/testNFT.ts", "--network", network], { stdio: "inherit" });
}

async function testVote(network: string) {
  console.log(`🗳️ Testing voting functionality on ${network}...`);
  spawn("npx", ["ts-node", "scripts/tests/testVoteWithToken.ts", "--network", network], { stdio: "inherit" });
}

async function testVoteLoose(network: string) {
  console.log(`🗳️ Testing voting functionality with loose transpilation on ${network}...`);
  spawn("npx", ["ts-node", "--transpileOnly", "scripts/tests/testVoteWithToken.ts", "--network", network], { stdio: "inherit" });
}

async function testSwap() {
  console.log("🔄 Testing swap functionality...");
  spawn("npx", ["ts-node", "scripts/tests/swap.ts"], { stdio: "inherit" });
}

async function testSwapLoose() {
  console.log("🔄 Testing swap functionality with loose transpilation...");
  spawn("npx", ["ts-node", "--transpileOnly", "scripts/tests/swap.ts"], { stdio: "inherit" });
}

async function testUniswapProxy(network: string) {
  console.log(`🔄 Testing Uniswap voting proxy on ${network}...`);
  spawn("npx", ["ts-node", "scripts/tests/testUniswapVotingProxy.ts", "--network", network], { stdio: "inherit" });
}

async function testUniswapV3Proxy(network: string) {
  console.log(`🔄 Testing Uniswap V3 voting proxy on ${network}...`);
  spawn("npx", ["ts-node", "scripts/tests/testUniswapV3VotingProxy.ts", "--network", network], { stdio: "inherit" });
}

async function testUniswapV2Proxy(network: string) {
  console.log(`🔄 Testing Uniswap V2 voting proxy on ${network}...`);
  spawn("npx", ["ts-node", "scripts/tests/testUniswapVotingProxy.ts", "--network", network], { stdio: "inherit" });
}

async function testUbeswapProxy(network: string) {
  console.log(`🔄 Testing Ubeswap voting proxy on ${network}...`);
  spawn("npx", ["ts-node", "scripts/tests/testUbeswapVotingProxy.ts", "--network", network], { stdio: "inherit" });
}

async function testGoodDollarVoter() {
  console.log("💚 Testing Good Dollar voter...");
  spawn("npx", ["ts-node", "--transpileOnly", "scripts/deploy/test-good-dollar-voter.ts"], { stdio: "inherit" });
}

async function testClaimVote() {
  console.log("💰 Testing claim vote functionality...");
  spawn("npx", ["ts-node", "scripts/utilities/testclaimVote.ts"], { stdio: "inherit" });
}

async function testUniswapVoting(network: string) {
  console.log(`🔄 Testing Uniswap voting on ${network}...`);
  spawn("npx", ["ts-node", "scripts/tests/testUniswapVotingProxy.ts", "--network", network], { stdio: "inherit" });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
