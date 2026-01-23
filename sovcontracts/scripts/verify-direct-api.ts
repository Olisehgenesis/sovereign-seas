import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

/**
 * Direct API verification script for Basescan/Etherscan
 * Uses the API endpoint directly instead of Hardhat plugin
 * 
 * Usage:
 *   CONTRACT_ADDRESS=0x... CONTRACT_NAME=SovereignSeasV4 pnpm run verify:direct-api:base
 *   CONTRACT_ADDRESS=0x... CONTRACT_NAME=MockBroker pnpm run verify:direct-api:base-sepolia
 */

interface NetworkConfig {
  chainId: string;
  apiUrl: string;
  apiKey: string;
  explorerUrl: string;
}

const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  base: {
    chainId: "8453",
    apiUrl: "https://api.basescan.org/api",
    apiKey: process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY || "",
    explorerUrl: "https://basescan.org",
  },
  baseSepolia: {
    chainId: "84532",
    apiUrl: "https://api-sepolia.basescan.org/api",
    apiKey: process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY || "",
    explorerUrl: "https://sepolia.basescan.org",
  },
  celo: {
    chainId: "42220",
    apiUrl: "https://api.celoscan.io/api",
    apiKey: process.env.CELOSCAN_API_KEY || "",
    explorerUrl: "https://celoscan.io",
  },
  celoSepolia: {
    chainId: "44787",
    apiUrl: "https://api-sepolia.celoscan.io/api",
    apiKey: process.env.CELOSCAN_API_KEY || "",
    explorerUrl: "https://sepolia.celoscan.io",
  },
};

// Compiler version mapping
const COMPILER_VERSION = "v0.8.28+commit.0c0a0c0a";

// License types: 1=No License, 3=MIT, 4=GPL-3.0, etc.
const LICENSE_TYPE = "3"; // MIT

async function main() {
  const networkIndex = process.argv.findIndex((arg) => arg === "--network");
  const networkName = networkIndex >= 0 && process.argv[networkIndex + 1]
    ? process.argv[networkIndex + 1]
    : "base";

  const config = NETWORK_CONFIGS[networkName];
  if (!config) {
    console.error(`❌ Unsupported network: ${networkName}`);
    console.error(`Supported networks: ${Object.keys(NETWORK_CONFIGS).join(", ")}`);
    process.exit(1);
  }

  if (!config.apiKey) {
    console.error(`❌ API key not found for ${networkName}`);
    console.error(`Set ${networkName === "base" || networkName === "baseSepolia" ? "BASESCAN_API_KEY" : "CELOSCAN_API_KEY"} in your .env file`);
    process.exit(1);
  }

  const contractAddress = process.env.CONTRACT_ADDRESS;
  const contractName = process.env.CONTRACT_NAME || process.env.CONTRACT;
  
  if (!contractAddress) {
    console.error("❌ Error: CONTRACT_ADDRESS is required");
    console.error("\nUsage:");
    console.error(`  CONTRACT_ADDRESS=0x... CONTRACT_NAME=SovereignSeasV4 pnpm run verify:direct-api:${networkName}`);
    console.error("\nOptional:");
    console.error("  CONSTRUCTOR_ARGS=0x... (hex encoded constructor arguments)");
    process.exit(1);
  }

  if (!contractName) {
    console.error("❌ Error: CONTRACT_NAME is required");
    console.error("\nUsage:");
    console.error(`  CONTRACT_ADDRESS=0x... CONTRACT_NAME=SovereignSeasV4 pnpm run verify:direct-api:${networkName}`);
    console.error("\nAvailable contracts:");
    console.error("  - SovereignSeasV4");
    console.error("  - MockBroker");
    console.error("  - MilestoneBasedFunding");
    console.error("  - SeasPrizePool");
    console.error("  - QuizeloV2");
    console.error("  - SovereignTournament");
    process.exit(1);
  }

  // Handle constructor arguments - should be hex-encoded string
  // Users can encode using: cast abi-encode "constructor(address,address)" 0x... 0x...
  // Or use viem: viem encodeAbiParameters([...], [...])
  const constructorArgs = process.env.CONSTRUCTOR_ARGS || "";
  
  if (constructorArgs && !constructorArgs.startsWith("0x")) {
    console.warn("⚠ Constructor args should be hex-encoded (start with 0x)");
    console.warn("  Use: cast abi-encode \"constructor(address,address)\" 0x... 0x...");
    console.warn("  Or provide hex string directly");
  }

  console.log("🔍 Direct API Verification");
  console.log("Network:", networkName);
  console.log("Contract Address:", contractAddress);
  console.log("Contract Name:", contractName);
  console.log("API URL:", config.apiUrl);
  console.log("");

  // Find the build info file
  const artifactsPath = join(process.cwd(), "artifacts");
  const buildInfoPath = join(process.cwd(), "artifacts", "build-info");
  
  let buildInfoFile: string | null = null;
  
  // Helper to recursively find JSON files
  function findBuildInfoFiles(dir: string): string[] {
    const files: string[] = [];
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          files.push(...findBuildInfoFiles(fullPath));
        } else if (entry.endsWith(".json") && entry.includes("solc")) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't read
    }
    return files;
  }
  
  try {
    const buildInfoFiles = findBuildInfoFiles(buildInfoPath);
    // Try to find one that matches the contract
    buildInfoFile = buildInfoFiles.find(f => {
      try {
        const content = readFileSync(f, "utf-8");
        return content.includes(contractName) || content.includes(contractName.toLowerCase());
      } catch {
        return false;
      }
    }) || buildInfoFiles[0] || null;
  } catch (error) {
    console.warn("⚠ Could not find build info files, will try alternative method");
  }

  // Try to get source code from artifacts
  let sourceCode: string | null = null;
  let contractPath: string | null = null;

  if (buildInfoFile) {
    try {
      const buildInfo = JSON.parse(readFileSync(buildInfoFile, "utf-8"));
      
      // Find contract in sources
      const contractKey = Object.keys(buildInfo.input.sources).find(key => 
        key.toLowerCase().includes(contractName.toLowerCase().replace("sovereign", "").replace("based", "")) ||
        key.includes(contractName)
      );
      
      if (contractKey && buildInfo.input.sources) {
        contractPath = contractKey;
        // Use standard JSON input format - this is preferred for complex contracts
        sourceCode = JSON.stringify(buildInfo.input);
        console.log(`✓ Found build info: ${buildInfoFile}`);
        console.log(`✓ Contract path: ${contractPath}`);
      } else {
        console.warn("⚠ Contract not found in build info, trying single file method");
        buildInfoFile = null;
      }
    } catch (error: any) {
      console.warn(`⚠ Could not parse build info: ${error.message}`);
      console.warn("Trying single file method...");
      buildInfoFile = null;
    }
  }

  // Fallback: try to read source file directly
  if (!sourceCode) {
    const possibleFiles = [
      `contracts/${contractName}.sol`,
      `contracts/${contractName.replace("Sovereign", "").replace("Based", "")}.sol`,
      `contracts/${contractName.toLowerCase()}.sol`,
    ];
    
    let found = false;
    for (const contractFile of possibleFiles) {
      try {
        const sourcePath = join(process.cwd(), contractFile);
        sourceCode = readFileSync(sourcePath, "utf-8");
        contractPath = contractFile;
        console.log(`✓ Using single file source code: ${contractFile}`);
        found = true;
        break;
      } catch (error) {
        // Try next file
      }
    }
    
    if (!found) {
      console.error(`❌ Could not find source file. Tried: ${possibleFiles.join(", ")}`);
      console.error("Please ensure:");
      console.error("  1. Contract is compiled: pnpm run compile");
      console.error("  2. Source file exists in contracts/ directory");
      process.exit(1);
    }
  }

  // Determine code format
  const codeFormat = typeof sourceCode === "string" && sourceCode.startsWith("{") 
    ? "solidity-standard-json-input" 
    : "solidity-single-file";

  // Format contract name
  const fullContractName = contractPath 
    ? `${contractPath}:${contractName}`
    : `contracts/${contractName}.sol:${contractName}`;

  // Build API request
  const params = new URLSearchParams({
    apikey: config.apiKey,
    chainid: config.chainId,
    module: "contract",
    action: "verifysourcecode",
    contractaddress: contractAddress,
    sourceCode: sourceCode,
    codeformat: codeFormat,
    contractname: fullContractName,
    compilerversion: COMPILER_VERSION,
    optimizationUsed: "1", // We use optimizer
    runs: "1", // From hardhat.config.ts
    evmVersion: "default",
    licenseType: LICENSE_TYPE,
  });

  if (constructorArgs) {
    params.append("constructorArguments", constructorArgs);
  }

  console.log("📤 Submitting verification request...");
  if (constructorArgs) {
    console.log(`   Constructor Args: ${constructorArgs.substring(0, 66)}...`);
  }
  console.log(`   Code Format: ${codeFormat}`);
  console.log(`   Contract Name: ${fullContractName}`);
  console.log("");

  try {
    const response = await fetch(`${config.apiUrl}?${params.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const result = await response.json();

    if (result.status === "1" && result.result) {
      const guid = result.result;
      console.log("✅ Verification request submitted successfully!");
      console.log("GUID:", guid);
      console.log("");
      console.log("⏳ Checking verification status...");
      console.log("");

      // Poll for verification status
      let verified = false;
      let attempts = 0;
      const maxAttempts = 30;

      while (!verified && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        const checkParams = new URLSearchParams({
          apikey: config.apiKey,
          chainid: config.chainId,
          module: "contract",
          action: "checkverifystatus",
          guid: guid,
        });

        const checkResponse = await fetch(`${config.apiUrl}?${checkParams.toString()}`);
        const checkResult = await checkResponse.json();

        if (checkResult.status === "1") {
          if (checkResult.result === "Pass - Verified") {
            verified = true;
            console.log("✅ Contract verified successfully!");
            console.log(`📄 View on explorer: ${config.explorerUrl}/address/${contractAddress}#code`);
            break;
          } else if (checkResult.result.includes("Fail")) {
            console.error("❌ Verification failed:", checkResult.result);
            console.error("Reason:", checkResult.message || "Unknown");
            break;
          } else {
            console.log(`⏳ Status: ${checkResult.result} (attempt ${attempts + 1}/${maxAttempts})`);
          }
        }

        attempts++;
      }

      if (!verified && attempts >= maxAttempts) {
        console.warn("⚠ Verification is still pending. Check manually:");
        console.warn(`  ${config.explorerUrl}/address/${contractAddress}#code`);
        console.warn(`  GUID: ${guid}`);
      }
    } else {
      console.error("❌ Verification request failed:");
      console.error("Status:", result.status);
      console.error("Message:", result.message || result.result);
      if (result.result && typeof result.result === "string" && result.result.includes("already verified")) {
        console.log("ℹ Contract may already be verified");
        console.log(`📄 Check: ${config.explorerUrl}/address/${contractAddress}#code`);
      }
    }
  } catch (error: any) {
    console.error("❌ Error submitting verification:", error.message);
    console.error("\nYou can verify manually:");
    console.error(`  ${config.explorerUrl}/address/${contractAddress}#code`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
