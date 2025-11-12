import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

// Helper function to get private key from env or config variable
function getPrivateKey(key: string, fallback?: string): string | undefined {
  // dotenvx will populate process.env, check that first
  if (process.env[key]) {
    return process.env[key];
  }
  if (fallback && process.env[fallback]) {
    return process.env[fallback];
  }
  // Fallback to configVariable (for hardhat keystore compatibility)
  try {
    const value = configVariable(key, fallback);
    return typeof value === "string" ? value : undefined;
  } catch {
    return undefined;
  }
}

// Helper function to get RPC URL from env or config variable
function getRpcUrl(key: string, defaultValue?: string): string {
  // dotenvx will populate process.env, check that first
  if (process.env[key]) {
    return process.env[key];
  }
  // Fallback to configVariable (for hardhat keystore compatibility)
  try {
    const value = configVariable(key);
    if (typeof value === "string") {
      return value;
    }
  } catch {
    // Ignore
  }
  return defaultValue || "";
}

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
          viaIR: true,
        },
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
          viaIR: true,
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: getRpcUrl("SEPOLIA_RPC_URL"),
      accounts: getPrivateKey("SEPOLIA_PRIVATE_KEY") ? [getPrivateKey("SEPOLIA_PRIVATE_KEY")!] : [],
    },
    celo: {
      type: "http",
      chainType: "l1",
      url: getRpcUrl("CELO_RPC_URL", "https://forno.celo.org"),
      accounts: getPrivateKey("CELO_PRIVATE_KEY", "PRIVATE_KEY") ? [getPrivateKey("CELO_PRIVATE_KEY", "PRIVATE_KEY")!] : [],
    },
    celoSepolia: {
      type: "http",
      chainType: "l1",
      url: getRpcUrl("CELO_SEPOLIA_RPC_URL", "https://sepolia-forno.celo.org"),
      accounts: getPrivateKey("CELO_SEPOLIA_PRIVATE_KEY", "PRIVATE_KEY") ? [getPrivateKey("CELO_SEPOLIA_PRIVATE_KEY", "PRIVATE_KEY")!] : [],
    },
  },
});
