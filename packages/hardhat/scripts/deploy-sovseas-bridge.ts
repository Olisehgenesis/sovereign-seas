#!/usr/bin/env ts-node

import { ethers } from "hardhat";
import { config } from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { run } from "hardhat";

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

async function verifyContract(address: string, constructorArgs: any[]) {
  try {
    console.log(`🔍 Verifying contract at ${address}...`);
    await run("verify:verify", {
      address: address,
      constructorArguments: constructorArgs,
    });
    console.log("   ✅ Contract verified successfully");
    return true;
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("   ✅ Contract already verified");
      return true;
    } else {
      console.log(`   ⚠️  Verification failed: ${error.message}`);
      return false;
    }
  }
}

interface ContractVersion {
  address: string;
  deployedAt: string;
  deployer: string;
  verified: boolean;
  verifiedAt?: string;
  explorer: string;
  status: "active" | "deprecated";
}

interface ContractInfo {
  current: {
    version: string;
    address: string;
    deployedAt: string;
    deployer: string;
    verified: boolean;
    verifiedAt?: string;
    explorer: string;
  };
  versions: Record<string, ContractVersion>;
  constructorArgs: Record<string, string>;
  settings: Record<string, any>;
  totalDeployments: number;
  lastDeployment: string;
}

interface ContractsData {
  network: {
    name: string;
    chainId: string;
    lastUpdated: string;
  };
  contracts: Record<string, ContractInfo>;
  deploymentHistory: Array<{
    version: string;
    contract: string;
    address: string;
    deployedAt: string;
    status: string;
  }>;
}

async function loadContractsData(): Promise<ContractsData> {
  const contractsFile = path.join(__dirname, "../deployments/contracts.json");
  
  if (fs.existsSync(contractsFile)) {
    const data = JSON.parse(fs.readFileSync(contractsFile, "utf8"));
    return data;
  }
  
  // Create new structure if file doesn't exist
  return {
    network: {
      name: "celo",
      chainId: "42220",
      lastUpdated: new Date().toISOString()
    },
    contracts: {},
    deploymentHistory: []
  };
}

async function updateContractsData(
  contractName: string,
  newAddress: string,
  deployer: string,
  constructorArgs: any[],
  settings: any,
  verified: boolean,
  verifiedAt?: string
): Promise<void> {
  const contractsFile = path.join(__dirname, "../deployments/contracts.json");
  const data = await loadContractsData();
  
  // Update network info
  data.network.lastUpdated = new Date().toISOString();
  
  // Get next version number
  let nextVersion = "v1";
  if (data.contracts[contractName]) {
    const currentVersion = data.contracts[contractName].current.version;
    const versionNum = parseInt(currentVersion.substring(1));
    nextVersion = `v${versionNum + 1}`;
    
    // Mark current version as deprecated
    data.contracts[contractName].versions[currentVersion].status = "deprecated";
  }
  
  // Create new contract info
  const newContractInfo: ContractInfo = {
    current: {
      version: nextVersion,
      address: newAddress,
      deployedAt: new Date().toISOString(),
      deployer: deployer,
      verified: verified,
      verifiedAt: verifiedAt,
      explorer: `https://celoscan.io/address/${newAddress}#code`
    },
    versions: {
      ...(data.contracts[contractName]?.versions || {}),
      [nextVersion]: {
        address: newAddress,
        deployedAt: new Date().toISOString(),
        deployer: deployer,
        verified: verified,
        verifiedAt: verifiedAt,
        explorer: `https://celoscan.io/address/${newAddress}#code`,
        status: "active" as const
      }
    },
    constructorArgs: {
      sovSeasAddress: constructorArgs[0],
      goodDollarToken: constructorArgs[1],
      directPaymentsFactory: constructorArgs[2]
    },
    settings: settings,
    totalDeployments: (data.contracts[contractName]?.totalDeployments || 0) + 1,
    lastDeployment: new Date().toISOString()
  };
  
  // Update contracts data
  data.contracts[contractName] = newContractInfo;
  
  // Add to deployment history
  data.deploymentHistory.push({
    version: nextVersion,
    contract: contractName,
    address: newAddress,
    deployedAt: new Date().toISOString(),
    status: "active"
  });
  
  // Mark previous deployments as deprecated in history
  data.deploymentHistory.forEach(item => {
    if (item.contract === contractName && item.status === "active" && item.version !== nextVersion) {
      item.status = "deprecated";
    }
  });
  
  // Save updated data
  fs.writeFileSync(contractsFile, JSON.stringify(data, null, 2));
  console.log(`💾 Updated contracts.json with new ${contractName} ${nextVersion}`);
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
  console.log(`  GoodDollar Token: ${goodDollarToken}`);
  console.log(`  DirectPaymentsFactory: ${directPaymentsFactory}`);
  console.log("");

  // Deploy
  const Bridge = await ethers.getContractFactory("SovSeasBridge");
  const bridge = await Bridge.deploy(sovSeasAddress, goodDollarToken, directPaymentsFactory);
  await bridge.waitForDeployment();
  const bridgeAddress = await bridge.getAddress();
  console.log(`✅ SovSeasBridge deployed at: ${bridgeAddress}`);

  // Verify contract
  const constructorArgs = [sovSeasAddress, goodDollarToken, directPaymentsFactory];
  const verified = await verifyContract(bridgeAddress, constructorArgs);
  const verifiedAt = verified ? new Date().toISOString() : undefined;

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
    console.log(`   ✅ Manager fee updated to ${MANAGER_FEE_BPS} bps`);
  }

  // Prepare settings for contracts.json
  const settings = {
    defaultPoolSize: DEFAULT_POOL_SIZE?.toString() ?? "1000000000000000000000",
    projectCreationReward: PROJECT_CREATION_REWARD?.toString() ?? "50000000000000000000",
    membershipReward: MEMBERSHIP_REWARD?.toString() ?? "25000000000000000000",
    distributionReward: DISTRIBUTION_REWARD?.toString() ?? "10000000000000000000",
    managerFeeBps: MANAGER_FEE_BPS ?? 500
  };

  // Update contracts.json with new deployment
  await updateContractsData(
    "SovSeasBridge",
    bridgeAddress,
    deployer.address,
    constructorArgs,
    settings,
    verified,
    verifiedAt
  );

  // Save individual deployment info (legacy format)
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
  console.log(`💾 Saved individual deployment to ${outFile}`);

  console.log("\n🎉 Done.");
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Deployment error:", err);
    process.exit(1);
  });
}

export { main };


