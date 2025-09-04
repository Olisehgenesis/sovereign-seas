import { createPublicClient, http, Address, WalletClient, PublicClient } from 'viem';
import { celo } from 'viem/chains';
import { IdentitySDK } from './useGooddollar';

/**
 * Generates a GoodDollar Face Verification Link.
 * @param address - The wallet address to verify.
 * @param walletClient - A WalletClient instance for signing.
 * @param popupMode - Whether to generate a popup link.
 * @param callbackUrl - The URL to callback after verification.
 * @param chainId - The blockchain network ID.
 * @returns The generated Face Verification link.
 */
export async function getGoodLink({
  address,
  walletClient,
  popupMode = false,
  callbackUrl,
  chainId
}: {
  address: Address,
  walletClient: WalletClient,
  popupMode?: boolean,
  callbackUrl?: string,
  chainId?: number
}): Promise<string> {
  const publicClient = createPublicClient({
    chain: celo,
    transport: http('https://forno.celo.org')
  });
  const identitySDK = new IdentitySDK(publicClient as PublicClient, walletClient, 'production');
  return identitySDK.generateFVLink(popupMode, callbackUrl, chainId);
} 