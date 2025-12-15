import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { writeFileSync } from "fs";

export interface TestWallet {
  index: number;
  address: string;
  privateKey: string;
}

/**
 * Generate test wallets and save to JSON file
 * @param count Number of wallets to generate (default: 10)
 * @param outputFile Output file path (default: "test-wallets.json")
 */
export function generateTestWallets(count: number = 10, outputFile: string = "test-wallets.json"): TestWallet[] {
  const wallets: TestWallet[] = [];

  console.log(`Generating ${count} test wallets...`);

  for (let i = 0; i < count; i++) {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    
    wallets.push({
      index: i,
      address: account.address,
      privateKey: privateKey,
    });

    console.log(`  Wallet ${i}: ${account.address}`);
  }

  // Save to JSON file
  writeFileSync(outputFile, JSON.stringify(wallets, null, 2), "utf-8");
  console.log(`\n✓ Generated ${count} wallets and saved to ${outputFile}`);

  return wallets;
}

/**
 * Generate wallets programmatically (without saving to file)
 * @param count Number of wallets to generate (default: 10)
 */
export function generateWalletsInMemory(count: number = 10): TestWallet[] {
  const wallets: TestWallet[] = [];

  for (let i = 0; i < count; i++) {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    
    wallets.push({
      index: i,
      address: account.address,
      privateKey: privateKey,
    });
  }

  return wallets;
}

// Main function for Hardhat scripts
async function main() {
  const count = process.argv.find((arg) => arg.startsWith("--count"))
    ? parseInt(process.argv[process.argv.findIndex((arg) => arg.startsWith("--count")) + 1] || "10", 10)
    : process.argv[2] ? parseInt(process.argv[2], 10) : 10;
  
  const outputFile = process.argv.find((arg) => arg.startsWith("--output"))
    ? process.argv[process.argv.findIndex((arg) => arg.startsWith("--output")) + 1]
    : process.argv[3] || "test-wallets.json";

  if (isNaN(count) || count < 1) {
    console.error("Error: Count must be a positive number");
    process.exit(1);
  }

  generateTestWallets(count, outputFile);
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

