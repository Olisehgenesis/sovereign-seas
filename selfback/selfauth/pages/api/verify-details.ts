import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import Cors from 'cors';
import { initMiddleware } from '../../lib/init-middleware';
import { originList } from '@/src/utils/origin';
import { createPublicClient, http, Address } from 'viem';
import { celo } from 'viem/chains';

import { IdentitySDK } from '@/src/utils/good/useGooddollar'; // Update with correct path

const DATA_FILE = path.join(process.cwd(), 'data', 'wallet-verifications.json');
const SELF_VERIFICATIONS_FILE = path.join(process.cwd(), 'data', 'verifications.json');

// Initialize CORS middleware
const cors = initMiddleware(
  Cors({
    origin: originList,
    methods: ['GET', 'POST', 'OPTIONS'],
  })
);

export async function isWalletGoodDollarVerified(wallet: string): Promise<boolean> {
  try {
    const publicClient = createPublicClient({
      chain: undefined,
      transport: http('https://forno.celo.org')
    });
    const mockWalletClient = {
      chain: undefined,
      account: null,
      getAddresses: async () => [],
    } as any;
    const { IdentitySDK } = await import('@/src/utils/good/useGooddollar');
    const identitySDK = new IdentitySDK(publicClient, mockWalletClient, 'production');
    const { isWhitelisted } = await identitySDK.getWhitelistedRoot(wallet as `0x${string}`);
    return isWhitelisted;
  } catch {
    return false;
  }
}

// Helper to check if wallet is self-verified (via SelfBackendVerifier)
export function isWalletSelfVerified(wallet: string): boolean {
  if (!fs.existsSync(SELF_VERIFICATIONS_FILE)) return false;
  const verifications = JSON.parse(fs.readFileSync(SELF_VERIFICATIONS_FILE, 'utf-8'));
  const match = verifications.find((v: any) => v.walletAddress && v.walletAddress.toLowerCase() === wallet.toLowerCase() && v.verified);
  return !!match;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Run the CORS middleware
  await cors(req, res);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wallet, userId } = req.query;

    // Validate that at least one identifier is provided
    if (!wallet && !userId) {
      return res.status(400).json({ error: 'Either wallet or userId is required' });
    }

    // Check if data directory exists, create if not
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Check if data file exists
    if (!fs.existsSync(DATA_FILE)) {
      //create the file
      try {
        fs.writeFileSync(DATA_FILE, JSON.stringify([]));
      } catch (error) {
        console.error('Error creating data file:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    const verifications = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    
    // Find verifications matching either wallet or userId
    const matchingVerifications = verifications.filter((v: any) => {
      if (wallet && v.wallet.toLowerCase() === (wallet as string).toLowerCase()) return true;
      if (userId && v.userId === userId) return true;
      return false;
    }).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // GoodDollar and Self verification status
    let goodDollarDetails = null;
    let selfDetails = { isVerified: false };
    let providers: string[] = [];
    let isValid = false;
    let verified = false;

    if (wallet) {
      // Check GoodDollar
      try {
        const publicClient = createPublicClient({ chain: undefined, transport: http('https://forno.celo.org') });
        const mockWalletClient = { chain: celo, account: null, getAddresses: async () => [], } as any;
        const identitySDK = new IdentitySDK(publicClient, mockWalletClient, 'production');
        const { isWhitelisted, root } = await identitySDK.getWhitelistedRoot(wallet as Address);
        let expiryData = null;
        if (isWhitelisted) {
          try {
            const identityExpiryData = await identitySDK.getIdentityExpiryData(root || wallet as Address);
            const expiry = identitySDK.calculateIdentityExpiry(
              identityExpiryData.lastAuthenticated,
              identityExpiryData.authPeriod
            );
            expiryData = {
              lastAuthenticated: identityExpiryData.lastAuthenticated.toString(),
              authPeriod: identityExpiryData.authPeriod.toString(),
              expiryTimestamp: expiry.expiryTimestamp.toString(),
              expiryDate: new Date(Number(expiry.expiryTimestamp)).toISOString(),
              isExpired: Date.now() > Number(expiry.expiryTimestamp)
            };
          } catch (error) { }
        }
        goodDollarDetails = {
          isVerified: isWhitelisted,
          wallet: wallet,
          root: root,
          expiry: expiryData
        };
        if (isWhitelisted) {
          providers.push('GoodDollar');
          isValid = true;
          verified = true;
        }
      } catch (error) {
        goodDollarDetails = { isVerified: false, wallet: wallet, root: null, expiry: null };
      }
      // Check Self
      if (isWalletSelfVerified(wallet as string)) {
        selfDetails = { isVerified: true };
        providers.push('Self');
        isValid = true;
        verified = true;
      }
    }
    // If no local or remote verification, return the new format with all false
    if (matchingVerifications.length === 0 && !verified) {
      return res.status(200).json({
        profile: { isValid: false, providers: [] },
        verified: false,
        gooddollar: goodDollarDetails || { isVerified: false },
        self: selfDetails
      });
    }
    // If there is a local verification, use its status
    if (matchingVerifications.length > 0) {
      const latestVerification = matchingVerifications[0];
      if (latestVerification.verificationStatus) {
        if (!providers.includes('Self')) providers.push('Self');
        isValid = true;
        verified = true;
        selfDetails = { isVerified: true };
      }
    }
    return res.status(200).json({
      profile: { isValid, providers },
      verified,
      gooddollar: goodDollarDetails || { isVerified: false },
      self: selfDetails
    });

  } catch (error) {
    console.error('Error fetching verification details:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}