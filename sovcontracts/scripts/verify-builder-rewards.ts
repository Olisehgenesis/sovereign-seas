import { execSync } from "child_process";
import { getAddress } from "viem";

const BUILDER_REWARDS_PARAMS: Record<
  string,
  {
    seasProjects: string;
    protocolTreasury: string;
    airTreasury: string;
    baseUri: string;
  }
> = {
  celo: {
    seasProjects: "0x0cC096B1cC568A22C1F02DAB769881d1aFE6161a",
    protocolTreasury: "0x53eaf4cd171842d8144e45211308e5d90b4b0088",
    airTreasury: "0x53eaf4cd171842d8144e45211308e5d90b4b0088",
    baseUri: "",
  },
  celoSepolia: {
    seasProjects: "0x0cC096B1cC568A22C1F02DAB769881d1aFE6161a",
    protocolTreasury: "0x53eaf4cd171842d8144e45211308e5d90b4b0088",
    airTreasury: "0x53eaf4cd171842d8144e45211308e5d90b4b0088",
    baseUri: "",
  },
};

const BUILDER_REWARDS_DEFAULT_ADDRESS: Record<string, string> = {
  celo: "0x70b8d1b5bD6dC55A060C020915a03a448243966f",
  celoSepolia: "0x70b8d1b5bD6dC55A060C020915a03a448243966f",
};

function resolveConstructorArgs(networkName: string) {
  const params = BUILDER_REWARDS_PARAMS[networkName] || BUILDER_REWARDS_PARAMS.celo;
  return {
    seasProjects: getAddress(params.seasProjects),
    protocolTreasury: getAddress(params.protocolTreasury),
    airTreasury: getAddress(params.airTreasury),
    baseUri: params.baseUri,
  };
}

function resolveContractAddress(networkName: string): string | undefined {
  let address = process.env.BUILDER_REWARDS_ADDRESS || process.env.CONTRACT_ADDRESS;
  if (!address) {
    address = process.argv.find((arg) => arg.startsWith("0x") && arg.length === 42);
  }
  if (!address) {
    address = BUILDER_REWARDS_DEFAULT_ADDRESS[networkName] || BUILDER_REWARDS_DEFAULT_ADDRESS.celo;
  }
  return address;
}

function interpretVerifyOutput(output: string): boolean {
  if (!output) return false;
  if (
    output.includes("Already Verified") ||
    output.includes("already verified") ||
    output.includes("verified successfully") ||
    output.includes("Sourcify")
  ) {
    return true;
  }
  return false;
}

async function main() {
  const networkIndex = process.argv.findIndex((arg) => arg === "--network");
  const networkName =
    networkIndex >= 0 && process.argv[networkIndex + 1] ? process.argv[networkIndex + 1] : "celo";

  const contractAddress = resolveContractAddress(networkName);
  if (!contractAddress) {
    console.error("Error: Contract address is required to verify BuilderRewardsNFT.");
    console.error("Provide it via BUILDER_REWARDS_ADDRESS / CONTRACT_ADDRESS env var or CLI argument.");
    console.error("Example:");
    console.error("  BUILDER_REWARDS_ADDRESS=0x... pnpm run verify:builder-rewards:celo");
    process.exit(1);
  }

  const args = resolveConstructorArgs(networkName);

  console.log("Verifying BuilderRewardsNFT contract...");
  console.log("Network:", networkName);
  console.log("Contract Address:", contractAddress);
  console.log("Constructor Arguments:");
  console.log("  Seas Projects:", args.seasProjects);
  console.log("  Protocol Treasury:", args.protocolTreasury);
  console.log("  Air Treasury:", args.airTreasury);
  console.log("  Base URI:", args.baseUri.length > 0 ? args.baseUri : "<none>");

  const baseUriArg = args.baseUri.length > 0 ? args.baseUri : '""';
  const verifyCmd = `npx hardhat verify --network ${networkName} ${getAddress(
    contractAddress
  )} ${args.seasProjects} ${args.protocolTreasury} ${args.airTreasury} ${baseUriArg} 2>&1`;

  let verifyOutput = "";
  let sourcifyVerified = false;

  try {
    verifyOutput = execSync(verifyCmd, {
      stdio: "pipe",
      encoding: "utf-8",
      env: { ...process.env },
    });
    sourcifyVerified = interpretVerifyOutput(verifyOutput);
  } catch (error: any) {
    verifyOutput = error?.stdout?.toString() || error?.stderr?.toString() || error?.message || "";
    sourcifyVerified = interpretVerifyOutput(verifyOutput);
  }

  console.log(verifyOutput);

  if (sourcifyVerified) {
    console.log("✓ BuilderRewardsNFT verification (Sourcify) completed!");
    if (networkName === "celo") {
      console.log(`Sourcify: https://repo.sourcify.dev/contracts/full_match/42220/${contractAddress}/`);
    } else if (networkName === "celoSepolia") {
      console.log(`Sourcify: https://repo.sourcify.dev/contracts/full_match/44787/${contractAddress}/`);
    }
    return;
  }

  console.error("✗ Verification failed. Full output above.");
  process.exit(1);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Verification failed:", error);
    process.exit(1);
  });


