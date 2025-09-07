/**
 * Client utilities - DEPRECATED
 * 
 * ⚠️  WARNING: This file is deprecated!
 * 
 * Use Wagmi hooks instead:
 * - usePublicClient() instead of publicClient
 * - useWalletClient() instead of walletClient
 * 
 * These Wagmi hooks automatically use the correct testnet configuration
 * from the WagmiProvider in AppProvider.tsx
 */

// Legacy exports for backward compatibility
// TODO: Remove these once all components are updated to use Wagmi hooks
export const publicClient = null;
export const walletClient = null;