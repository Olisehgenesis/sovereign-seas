#!/usr/bin/env ts-node

import { ethers } from "hardhat";
import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";

config();

type OptionalEnv = string | undefined;

function requireEnv(name: string, value: OptionalEnv): string {
  if (!value || value.trim() === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function parseEtherFromEnv(name: string, value: OptionalEnv): bigint | undefined {
  if (!value || value.trim() === "") return undefined;
  return ethers.parseEther(value);
}

async function main() {
  console.log("🚀 Deploying SovSeasBridge...");

  // Required constructor args
  const SOVEREIGN_SEAS_ADDRESS = process.env.SOVEREIGN_SEAS_ADDRESS || process.env.SOVEREIGN_SEAS_V4_ADDRESS || process.env.SOV_SEAS_CONTRACT;
  const GOOD_DOLLAR_TOKEN = process.env.GOOD_DOLLAR_TOKEN;
  const DIRECT_PAYMENTS_FACTORY = process.env.DIRECT_PAYMENTS_FACTORY;

  const sovSeasAddress = requireEnv("SOVEREIGN_SEAS_ADDRESS", SOVEREIGN_SEAS_ADDRESS);
  const goodDollarToken = requireEnv("GOOD_DOLLAR_TOKEN", GOOD_DOLLAR_TOKEN);
  const directPaymentsFactory = requireEnv("DIRECT_PAYMENTS_FACTORY", DIRECT_PAYMENTS_FACTORY);

  // Optional settings
  const DEFAULT_POOL_SIZE = parseEtherFromEnv("DEFAULT_POOL_SIZE", process.env.DEFAULT_POOL_SIZE);
  const PROJECT_CREATION_REWARD = parseEtherFromEnv("PROJECT_CREATION_REWARD", process.env.PROJECT_CREATION_REWARD);
  const MEMBERSHIP_REWARD = parseEtherFromEnv("MEMBERSHIP_REWARD", process.env.MEMBERSHIP_REWARD);
  const DISTRIBUTION_REWARD = parseEtherFromEnv("DISTRIBUTION_REWARD", process.env.DISTRIBUTION_REWARD);

  const MANAGER_FEE_BPS_RAW = process.env.MANAGER_FEE_BPS;
  const MANAGER_FEE_BPS = MANAGER_FEE_BPS_RAW ? Number(MANAGER_FEE_BPS_RAW) : undefined;

  if (MANAGER_FEE_BPS !== undefined) {
    if (!Number.isInteger(MANAGER_FEE_BPS) || MANAGER_FEE_BPS < 0 || MANAGER_FEE_BPS > 1000) {
      throw new Error("MANAGER_FEE_BPS must be an integer between 0 and 1000 (max 10%)");
    }
  }

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("📋 Config:");
  console.log(`  Network: ${network.name} (chainId: ${network.chainId})`);
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  SovSeas: ${sovSeasAddress}`);
  console.log(`  G$ Token: ${goodDollarToken}`);
  console.log(`  DirectPaymentsFactory: ${directPaymentsFactory}`);
  console.log("");

  // Deploy
  const Bridge = await ethers.getContractFactory("SovSeasBridge");
  const bridge = await Bridge.deploy(sovSeasAddress, goodDollarToken, directPaymentsFactory);
  await bridge.waitForDeployment();
  const bridgeAddress = await bridge.getAddress();
  console.log(`✅ SovSeasBridge deployed at: ${bridgeAddress}`);

  // Optional post-deploy configuration
  const needsSettings = DEFAULT_POOL_SIZE !== undefined || PROJECT_CREATION_REWARD !== undefined || MEMBERSHIP_REWARD !== undefined || DISTRIBUTION_REWARD !== undefined;
  if (needsSettings) {
    // Read current to fill in any missing values so we don't zero them unintentionally
    // There are no direct getters for these fields, so require all 4 when any provided
    if (
      DEFAULT_POOL_SIZE === undefined ||
      PROJECT_CREATION_REWARD === undefined ||
      MEMBERSHIP_REWARD === undefined ||
      DISTRIBUTION_REWARD === undefined
    ) {
      throw new Error("When setting pool settings, you must provide all 4 env vars: DEFAULT_POOL_SIZE, PROJECT_CREATION_REWARD, MEMBERSHIP_REWARD, DISTRIBUTION_REWARD");
    }

    console.log("⚙️  Updating GoodDollar settings...");
    const tx = await bridge.updateGoodDollarSettings(
      DEFAULT_POOL_SIZE,
      PROJECT_CREATION_REWARD,
      MEMBERSHIP_REWARD,
      DISTRIBUTION_REWARD
    );
    await tx.wait();
    console.log("   ✅ GoodDollar settings updated");
  }

  if (MANAGER_FEE_BPS !== undefined) {
    console.log("⚙️  Updating manager fee...");
    const tx = await bridge.updateManagerFee(MANAGER_FEE_BPS);
    await tx.wait();
    console.log(`   ✅ Manager fee set to ${MANAGER_FEE_BPS} bps`);
  }

  // Save deployment info
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });

  const out = {
    network: { name: network.name, chainId: network.chainId.toString(), timestamp: new Date().toISOString() },
    deployer: deployer.address,
    contracts: { SovSeasBridge: bridgeAddress },
    constructorArgs: {
      sovSeasAddress,
      goodDollarToken,
      directPaymentsFactory
    },
    settings: {
      defaultPoolSize: DEFAULT_POOL_SIZE?.toString() ?? null,
      projectCreationReward: PROJECT_CREATION_REWARD?.toString() ?? null,
      membershipReward: MEMBERSHIP_REWARD?.toString() ?? null,
      distributionReward: DISTRIBUTION_REWARD?.toString() ?? null,
      managerFeeBps: MANAGER_FEE_BPS ?? null
    },
    explorer: {
      contract: `https://celoscan.io/address/${bridgeAddress}`
    }
  };

  const outFile = path.join(deploymentsDir, `${network.chainId.toString()}-sovseas-bridge.json`);
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
  console.log(`💾 Saved deployment to ${outFile}`);

  console.log("\n🎉 Done.");
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Deployment error:", err);
    process.exit(1);
  });
}

export { main };


