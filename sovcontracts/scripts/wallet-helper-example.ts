/**
 * Example usage of wallet-helper.ts
 * 
 * This file demonstrates how to use the wallet helper functions
 * to access test wallets for testing purposes.
 */

import {
  getWallet,
  getWalletByAddress,
  getAllWallets,
  getWalletAccount,
  getWalletAccountByAddress,
  printWallets,
  printWalletDetails,
} from "./wallet-helper";

// Example 1: Get a specific wallet by index
function example1() {
  console.log("=== Example 1: Get wallet by index ===");
  const wallet = getWallet(0);
  console.log(`Wallet 0 address: ${wallet.address}`);
  console.log(`Wallet 0 private key: ${wallet.privateKey}`);
}

// Example 2: Get wallet account (viem account) by index
function example2() {
  console.log("\n=== Example 2: Get wallet account by index ===");
  const account = getWalletAccount(0);
  console.log(`Account address: ${account.address}`);
  // You can use this account with viem clients
}

// Example 3: Get wallet by address
function example3() {
  console.log("\n=== Example 3: Get wallet by address ===");
  const wallets = getAllWallets();
  if (wallets.length > 0) {
    const wallet = getWalletByAddress(wallets[0].address);
    if (wallet) {
      console.log(`Found wallet: ${wallet.address}`);
    }
  }
}

// Example 4: Get all wallets
function example4() {
  console.log("\n=== Example 4: Get all wallets ===");
  const wallets = getAllWallets();
  console.log(`Total wallets: ${wallets.length}`);
  wallets.forEach((w) => {
    console.log(`  Wallet ${w.index}: ${w.address}`);
  });
}

// Example 5: Print all wallets (addresses only)
function example5() {
  console.log("\n=== Example 5: Print all wallets ===");
  printWallets();
}

// Example 6: Print wallet details (including private key)
function example6() {
  console.log("\n=== Example 6: Print wallet details ===");
  printWalletDetails(0);
}

// Example 7: Use in a Hardhat script
async function example7() {
  console.log("\n=== Example 7: Use in Hardhat script ===");
  // This is how you'd use it in a deployment script
  const { network } = await import("hardhat");
  const { viem } = await network.connect();
  
  // Get wallet account
  const account = getWalletAccount(0);
  
  // You can use this with viem
  console.log(`Using wallet: ${account.address}`);
  // const walletClient = await viem.getWalletClient({ account });
}

// Run examples
if (require.main === module) {
  example1();
  example2();
  example3();
  example4();
  example5();
  example6();
  // example7(); // Uncomment if you want to test with Hardhat
}

