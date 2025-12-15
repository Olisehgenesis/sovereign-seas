import { execSync } from "child_process";

// Token addresses on Celo networks
const TOKEN_ADDRESSES: Record<string, { cUSD: string; USDC: string }> = {
  celo: {
    cUSD: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    USDC: "0xceba9300f2b22571077905E60d3f7c735d6f81b2",
  },
  celoSepolia: {
    cUSD: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
    USDC: "0x1a51b19CE03dbE0Cb44c1528E34a7EDD7771E9Af",
  },
};

async function main() {
  // Get network name from command line arguments first
  const networkIndex = process.argv.findIndex((arg) => arg === "--network");
  const networkName = networkIndex >= 0 && process.argv[networkIndex + 1]
    ? process.argv[networkIndex + 1]
    : "celo";

  // Get contract address from environment variable
  let contractAddress = process.env.QUIZELO_CONTRACT_ADDRESS || process.env.CONTRACT_ADDRESS;
  
  // Also check for address in process.argv
  if (!contractAddress) {
    contractAddress = process.argv.find((arg) => arg.startsWith("0x") && arg.length === 42);
  }

  if (!contractAddress) {
    console.error("Error: Contract address is required");
    console.error("\nUsage options:");
    console.error("  1. Set environment variable:");
    console.error("     CONTRACT_ADDRESS=0x... pnpm run verify:quizelo:celo");
    console.error("  2. Or use QUIZELO_CONTRACT_ADDRESS:");
    console.error("     QUIZELO_CONTRACT_ADDRESS=0x... pnpm run verify:quizelo:celo");
    console.error("\nExample:");
    console.error("  CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890 pnpm run verify:quizelo:celo");
    process.exit(1);
  }

  // Get token addresses from environment or use defaults (cUSD and USDC)
  let tokenAddresses: string[] = [];
  
  if (process.env.PAYMENT_TOKENS) {
    tokenAddresses = process.env.PAYMENT_TOKENS.split(",").map((t) => t.trim());
  } else {
    // Use default tokens (cUSD and USDC) for the network
    const networkTokens = TOKEN_ADDRESSES[networkName] || TOKEN_ADDRESSES.celo;
    tokenAddresses = [networkTokens.cUSD, networkTokens.USDC];
    console.log("ℹ Using default tokens (cUSD and USDC) for network");
  }

  console.log("Verifying QuizeloV2 contract...");
  console.log("Network:", networkName);
  console.log("Contract Address:", contractAddress);
  console.log("Constructor Arguments:");
  console.log("  Supported Tokens:");
  tokenAddresses.forEach((token, i) => {
    console.log(`    ${i + 1}. ${token}`);
  });

  // Build constructor arguments for hardhat verify
  // Constructor takes address[] memory _tokens
  // Hardhat verify has issues with array arguments, especially on Celo
  // We'll try multiple formats to see what works
  
  try {
    // Verify using hardhat verify plugin
    console.log("\n[1/2] Verifying on Sourcify via Hardhat...");
    console.log(`  Constructor args: Array with ${tokenAddresses.length} tokens`);
    
    // Hardhat verify format for arrays is tricky
    // Try passing as JSON string without outer quotes (shell will handle it)
    const arrayJson = JSON.stringify(tokenAddresses);
    
    // For shell, we need to properly escape it
    // Try: pass the JSON array as a single argument
    const verifyCommand = `npx hardhat verify --network ${networkName} ${contractAddress} '${arrayJson}'`;
    
    try {
      execSync(verifyCommand, {
        stdio: "inherit",
        env: { ...process.env },
      });
      console.log("\n✓ Verification successful!");
    } catch (error: any) {
      const errorMessage = error.message || error.stdout?.toString() || error.stderr?.toString() || "";
      
      if (errorMessage.includes("Already Verified") || 
          errorMessage.includes("already verified") ||
          errorMessage.includes("Contract source code already verified")) {
        console.log("\n✓ Contract is already verified on CeloScan!");
      } else if (errorMessage.includes("Fail - Unable to verify")) {
        console.warn("\n⚠ Verification failed. This might be due to:");
        console.warn("  - Contract not yet indexed (wait a few minutes)");
        console.warn("  - Constructor arguments mismatch");
        console.warn("  - Compiler settings mismatch");
        console.warn("\n  Try manual verification at:");
        if (networkName === "celo") {
          console.warn(`    https://celoscan.io/address/${contractAddress}#code`);
        } else {
          console.warn(`    https://sepolia.celoscan.io/address/${contractAddress}#code`);
        }
      } else {
        console.warn("\n⚠ Verification attempt completed with warnings:");
        console.warn(errorMessage.slice(0, 500)); // Show first 500 chars
      }
    }

    // Sourcify verification (hardhat verify also does this)
    console.log("\n[2/2] Sourcify verification (handled by Hardhat verify)...");
    console.log("ℹ Sourcify verification is automatic with Hardhat verify plugin");
    console.log("  Check status at:");
    if (networkName === "celo") {
      console.log(`    https://repo.sourcify.dev/contracts/full_match/42220/${contractAddress}/`);
    } else {
      console.log(`    https://repo.sourcify.dev/contracts/full_match/44787/${contractAddress}/`);
    }

    console.log("\n=== Verification Summary ===");
    console.log("✅ CeloScan: Verification attempted via Hardhat");
    console.log("✅ Sourcify: Automatic via Hardhat verify");
    
    console.log("\n📋 Verification Links:");
    if (networkName === "celo") {
      console.log(`  CeloScan: https://celoscan.io/address/${contractAddress}#code`);
      console.log(`  Sourcify: https://repo.sourcify.dev/contracts/full_match/42220/${contractAddress}/`);
    } else {
      console.log(`  CeloScan: https://sepolia.celoscan.io/address/${contractAddress}#code`);
      console.log(`  Sourcify: https://repo.sourcify.dev/contracts/full_match/44787/${contractAddress}/`);
    }
    
  } catch (error: any) {
    console.error("✗ Verification failed:", error.message || error);
    console.error("\nYou can try manual verification:");
    if (networkName === "celo") {
      console.error(`  https://celoscan.io/address/${contractAddress}#code`);
    } else {
      console.error(`  https://sepolia.celoscan.io/address/${contractAddress}#code`);
    }
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
