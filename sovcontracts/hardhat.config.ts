import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-verify";
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

// Helper function to get RPC URL from env or config variable with fallbacks
function getRpcUrl(key: string, defaultValue?: string, fallbacks?: string[]): string {
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
  // Return default or first fallback
  return defaultValue || fallbacks?.[0] || "";
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
    celo: {
      type: "http",
      chainType: "l1",
      url: getRpcUrl("CELO_RPC_URL", "https://forno.celo.org"),
      accounts: getPrivateKey("CELO_PRIVATE_KEY", "PRIVATE_KEY") ? [getPrivateKey("CELO_PRIVATE_KEY", "PRIVATE_KEY")!] : [],
    },
    celoSepolia: {
      type: "http",
      chainType: "l1",
      url: getRpcUrl(
        "CELO_SEPOLIA_RPC_URL",
        "https://rpc.ankr.com/celo_sepolia", // Use Ankr as default (more reliable)
        [
          "https://rpc.ankr.com/celo_sepolia", // Ankr public RPC (most reliable)
          "https://celo-sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161", // Public Infura endpoint
          "https://forno.celo-sepolia.celo-testnet.org", // Official Celo endpoint
        ]
      ),
      accounts: getPrivateKey("CELO_SEPOLIA_PRIVATE_KEY", "PRIVATE_KEY") ? [getPrivateKey("CELO_SEPOLIA_PRIVATE_KEY", "PRIVATE_KEY")!] : [],
    },
  },
  etherscan: {
    apiKey: {
      celo: process.env.CELOSCAN_API_KEY || "",
      celoSepolia: process.env.CELOSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "celo",
        chainId: 42220,
        urls: {
          apiURL: "https://api.celoscan.io/api",
          browserURL: "https://celoscan.io",
        },
      },
      {
        network: "celoSepolia",
        chainId: 44787,
        urls: {
          apiURL: "https://api-sepolia.celoscan.io/api",
          browserURL: "https://sepolia.celoscan.io",
        },
      },
    ],
  },
  sourcify: {
    enabled: true,
    apiUrl: "https://sourcify.dev/server",
    browserUrl: "https://repo.sourcify.dev",
  },
});
