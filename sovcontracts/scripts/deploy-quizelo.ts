import { network } from "hardhat";
import { getAddress } from "viem";

// Token addresses on Celo networks
const TOKEN_ADDRESSES: Record<string, { cUSD: string; USDC: string }> = {
  // Celo Mainnet
  celo: {
    cUSD: "0x765DE816845861e75A25fCA122bb6898B8B1282a", // https://celoscan.io/token/0x765DE816845861e75A25fCA122bb6898B8B1282a
    USDC: "0xceBA9300F2b22571077905E60d3f7C735d6f81B2", // https://celoscan.io/token/0xceba9300f2b22571077905e60d3f7c735d6f81b2 (checksummed)
  },
  // Celo Sepolia testnet
  celoSepolia: {
    cUSD: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
    USDC: "0x1a51b19CE03dbE0Cb44c1528E34a7EDD7771E9Af", // Common testnet USDC address
  },
};

async function main() {
  // Get network name from command line arguments
  const networkName = process.argv.find((arg) => arg === "--network") 
    ? process.argv[process.argv.indexOf("--network") + 1] 
    : process.env.HARDHAT_NETWORK || "hardhat";

  // Get token addresses from environment or use defaults
  let tokens: string[] = [];
  
  // Check for comma-separated token addresses in env var
  if (process.env.PAYMENT_TOKENS) {
    tokens = process.env.PAYMENT_TOKENS.split(",").map((t) => t.trim());
  } else {
    // Use default tokens (cUSD and USDC) for the network
    const networkTokens = TOKEN_ADDRESSES[networkName] || TOKEN_ADDRESSES.celo;
    tokens = [networkTokens.cUSD, networkTokens.USDC];
    console.log("ℹ Using default tokens (cUSD and USDC) for network");
  }

  if (tokens.length === 0) {
    throw new Error("At least one token address is required");
  }

  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  const deployer = walletClients[0];

  // Validate and normalize token addresses
  const tokenAddresses = tokens.map((token) => getAddress(token));

  console.log("Deploying QuizeloV2 contract...");
  console.log("Network:", networkName);
  console.log("Deployer:", deployer.account.address);
  console.log("Supported Tokens:", tokenAddresses.length);
  tokenAddresses.forEach((token, i) => {
    console.log(`  ${i + 1}. ${token}`);
  });

  // Verify token contracts exist and are accessible
  for (const token of tokenAddresses) {
    try {
      const code = await publicClient.getBytecode({
        address: token,
      });
      if (!code || code === "0x") {
        console.warn(`⚠ Warning: No contract found at token address ${token}`);
        console.warn("  Deployment will continue, but verify the address is correct.");
      } else {
        console.log(`✓ Token contract verified: ${token}`);
      }
    } catch (error: any) {
      console.warn(`⚠ Warning: Could not verify token ${token}:`, error.message || error);
    }
  }

  const quizelo = await viem.deployContract("QuizeloV2", [
    tokenAddresses,
  ]);

  console.log("\n=== Deployment Successful ===");
  console.log("QuizeloV2 deployed to:", quizelo.address);
  console.log("\nYou can verify the contract on CeloScan:");
  if (networkName === "celo") {
    console.log(`https://celoscan.io/address/${quizelo.address}#code`);
  } else if (networkName === "celoSepolia") {
    console.log(`https://sepolia.celoscan.io/address/${quizelo.address}#code`);
  }
  console.log("\nConstructor Arguments:");
  console.log("  Supported Tokens:");
  tokenAddresses.forEach((token, i) => {
    console.log(`    ${i + 1}. ${token}`);
  });
  console.log("\n📝 Next Steps:");
  console.log("1. Top up the contract with tokens for rewards:");
  console.log(`   - Users will pay ${100} tokens (QUIZ_FEE) to take quizzes`);
  console.log(`   - Contract needs at least ${1000} tokens per token (MIN_CONTRACT_BALANCE) to operate`);
  console.log("   - You can top up each token separately using topUpContract(token, amount)");
  console.log("2. Verify the contract:");
  console.log(`   CONTRACT_ADDRESS=${quizelo.address} pnpm run verify:quizelo:${networkName}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

