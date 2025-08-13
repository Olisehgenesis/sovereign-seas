#!/usr/bin/env ts-node

import { config } from "dotenv";
import { spawn } from "child_process";

config();

async function main() {
  const args = process.argv.slice(2);
  const utilityType = args[0];
  const network = args[1] || "alfajores";

  console.log(`🔧 Running utility: ${utilityType} on ${network} network...`);

  try {
    switch (utilityType) {
      case "mint":
        await mint(network);
        break;
      case "withdraw":
        await withdraw(network);
        break;
      case "vote":
        await vote();
        break;
      case "view-projects":
        await viewProjects();
        break;
      case "view-campaign":
        await viewCampaign();
        break;
      case "create-campaign":
        await createCampaign();
        break;
      case "end-campaign":
        await endCampaign();
        break;
      case "get-campaign":
        await getCampaign();
        break;
      case "show-votes":
        await showVotes();
        break;
      case "add-tokens":
        await addSupportedTokens();
        break;
      case "add-providers":
        await addExchangeProviders();
        break;
      case "add-sample":
        await generateSampleData();
        break;
      case "add-custom-sample":
        await generateCustomSampleData();
        break;
      case "update-winners":
        await updateCampaignWinners();
        break;
      case "claim-vote":
        await claimVote();
        break;
      case "get-vote-conversion":
        await getVoteConversion();
        break;
      case "check-celo-addresses":
        await checkCeloAddresses();
        break;
      case "sync-abis":
        await syncAbis();
        break;
      default:
        console.log("❌ Unknown utility type. Available types:");
        console.log("  - mint: Mint NFTs");
        console.log("  - withdraw: Withdraw funds");
        console.log("  - vote: Execute voting");
        console.log("  - view-projects: View projects");
        console.log("  - view-campaign: View campaign");
        console.log("  - create-campaign: Create campaign");
        console.log("  - end-campaign: End campaign");
        console.log("  - get-campaign: Get campaign details");
        console.log("  - show-votes: Show votes");
        console.log("  - add-tokens: Add supported tokens");
        console.log("  - add-providers: Add exchange providers");
        console.log("  - add-sample: Generate sample data");
        console.log("  - add-custom-sample: Generate custom sample data");
        console.log("  - update-winners: Update campaign winners");
        console.log("  - claim-vote: Claim vote");
        console.log("  - get-vote-conversion: Get vote conversion");
        console.log("  - check-celo-addresses: Check Celo addresses");
        console.log("  - sync-abis: Sync ABIs");
        console.log("\nUsage: npm run utils <type> [network]");
        process.exit(1);
    }
  } catch (error) {
    console.error("❌ Utility operation failed:", error);
    process.exit(1);
  }
}

async function mint(network: string) {
  console.log(`🪙 Minting on ${network}...`);
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/utilities/mint.ts", "--network", network], { stdio: "inherit" });
}

async function withdraw(network: string) {
  console.log(`💸 Withdrawing on ${network}...`);
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/utilities/withdraw.ts", "--network", network], { stdio: "inherit" });
}

async function vote() {
  console.log("🗳️ Executing voting...");
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/utilities/swapVote.ts"], { stdio: "inherit" });
}

async function viewProjects() {
  console.log("👀 Viewing projects...");
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/utilities/viewProjects.ts"], { stdio: "inherit" });
}

async function viewCampaign() {
  console.log("👀 Viewing campaign...");
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/utilities/viewCampaign.ts"], { stdio: "inherit" });
}

async function createCampaign() {
  console.log("🚀 Creating campaign...");
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/utilities/createCampaign.ts"], { stdio: "inherit" });
}

async function endCampaign() {
  console.log("🏁 Ending campaign...");
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/utilities/endCampaigns.ts"], { stdio: "inherit" });
}

async function getCampaign() {
  console.log("📋 Getting campaign details...");
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/utilities/getCampaign.ts"], { stdio: "inherit" });
}

async function showVotes() {
  console.log("📊 Showing votes...");
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/utilities/showVotes.ts"], { stdio: "inherit" });
}

async function addSupportedTokens() {
  console.log("🪙 Adding supported tokens...");
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/utilities/addSupportedToken.ts"], { stdio: "inherit" });
}

async function addExchangeProviders() {
  console.log("🏪 Adding exchange providers...");
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/utilities/addExchangeProviders.ts"], { stdio: "inherit" });
}

async function generateSampleData() {
  console.log("📝 Generating sample data...");
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/utilities/generateSampleData.ts"], { stdio: "inherit" });
}

async function generateCustomSampleData() {
  console.log("📝 Generating custom sample data...");
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/utilities/generateCustomSampleData.ts"], { stdio: "inherit" });
}

async function updateCampaignWinners() {
  console.log("🏆 Updating campaign winners...");
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/utilities/updateCampaignWinners.ts"], { stdio: "inherit" });
}

async function claimVote() {
  console.log("💰 Claiming vote...");
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/utilities/testclaimVote.ts"], { stdio: "inherit" });
}

async function getVoteConversion() {
  console.log("🔄 Getting vote conversion...");
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/utilities/getVoteConversion.ts"], { stdio: "inherit" });
}

async function checkCeloAddresses() {
  console.log("🔍 Checking Celo addresses...");
  const { spawn } = require("child_process");
  spawn("npx", ["ts-node", "scripts/utilities/checkCeloAddresses.ts"], { stdio: "inherit" });
}

async function syncAbis() {
  console.log("🔄 Syncing ABIs...");
  const { spawn } = require("child_process");
  spawn("node", ["sync-abis.js"], { stdio: "inherit" });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
