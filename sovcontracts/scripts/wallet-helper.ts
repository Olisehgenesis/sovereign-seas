import { readFileSync, existsSync } from "fs";
import { privateKeyToAccount } from "viem/accounts";
import { getAddress } from "viem";
import { generateWalletsInMemory } from "./generate-test-wallets.js";

export interface TestWallet {
  index: number;
  address: string;
  privateKey: string;
}

let walletsCache: TestWallet[] | null = null;

/**
 * Load test wallets from JSON file, or generate them if file doesn't exist
 */
export function loadTestWallets(): TestWallet[] {
  if (walletsCache) {
    return walletsCache;
  }

  // If file doesn't exist, generate wallets in memory
  if (!existsSync("test-wallets.json")) {
    console.log("⚠ test-wallets.json not found. Generating 10 wallets in memory...");
    walletsCache = generateWalletsInMemory(10);
    return walletsCache;
  }

  try {
    const fileContent = readFileSync("test-wallets.json", "utf-8");
    walletsCache = JSON.parse(fileContent) as TestWallet[];
    return walletsCache;
  } catch (error) {
    // If file exists but can't be read, generate in memory as fallback
    console.warn("⚠ Failed to load test-wallets.json. Generating wallets in memory...");
    walletsCache = generateWalletsInMemory(10);
    return walletsCache;
  }
}

/**
 * Get a specific wallet by index (0-9)
 */
export function getWallet(index: number): TestWallet {
  const wallets = loadTestWallets();
  if (index < 0 || index >= wallets.length) {
    throw new Error(`Wallet index ${index} out of range. Available: 0-${wallets.length - 1}`);
  }
  return wallets[index];
}

/**
 * Get a wallet by address (case-insensitive)
 */
export function getWalletByAddress(address: string): TestWallet | undefined {
  const wallets = loadTestWallets();
  const normalizedAddress = getAddress(address);
  return wallets.find((w) => getAddress(w.address) === normalizedAddress);
}

/**
 * Get all wallets
 */
export function getAllWallets(): TestWallet[] {
  return loadTestWallets();
}

/**
 * Get wallet account (viem account object) by index
 */
export function getWalletAccount(index: number) {
  const wallet = getWallet(index);
  return privateKeyToAccount(wallet.privateKey as `0x${string}`);
}

/**
 * Get wallet account (viem account object) by address
 */
export function getWalletAccountByAddress(address: string) {
  const wallet = getWalletByAddress(address);
  if (!wallet) {
    throw new Error(`Wallet not found for address: ${address}`);
  }
  return privateKeyToAccount(wallet.privateKey as `0x${string}`);
}

/**
 * Print all wallets (addresses only, for safety)
 */
export function printWallets() {
  const wallets = loadTestWallets();
  console.log(`\n=== Test Wallets (${wallets.length} total) ===\n`);
  wallets.forEach((wallet) => {
    console.log(`Wallet ${wallet.index}: ${wallet.address}`);
  });
  console.log();
}

/**
 * Print wallet details (including private key) - use with caution
 */
export function printWalletDetails(index: number) {
  const wallet = getWallet(index);
  console.log(`\n=== Wallet ${index} Details ===`);
  console.log(`Address: ${wallet.address}`);
  console.log(`Private Key: ${wallet.privateKey}`);
  console.log();
}

