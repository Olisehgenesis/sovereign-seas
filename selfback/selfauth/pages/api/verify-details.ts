import type { NextApiRequest, NextApiResponse } from 'next';
import Cors from 'cors';
import { initMiddleware } from '../../lib/init-middleware';
import { originList } from '@/src/utils/origin';
import { createPublicClient, http, Address } from 'viem';
import { celo } from 'viem/chains';
import { createClient } from 'redis';

import { IdentitySDK } from '@/src/utils/good/useGooddollar'; // Update with correct path

// Redis client
let redis: any = null;

const getRedisClient = async () => {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redis = createClient({
      url: redisUrl
    });
    await redis.connect();
  }
  return redis;
};

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

// Helper to check if wallet is self-verified and get details
export async function getWalletSelfVerificationDetails(wallet: string): Promise<{
  isVerified: boolean;
  nationality?: string | null;
  attestationId?: string | null;
  timestamp?: string | null;
  userDefinedData?: any | null;
  verificationOptions?: any | null;
}> {
  try {
    const client = await getRedisClient();
    const verificationData = await client.get(wallet);
    if (!verificationData) return { isVerified: false };
    
    const data = JSON.parse(verificationData as string);
    if (data.verified) {
      return {
        isVerified: true,
        nationality: data.nationality || null,
        attestationId: data.attestationId || null,
        timestamp: data.timestamp || null,
        userDefinedData: data.userDefinedData || null,
        verificationOptions: data.verificationOptions || null
      };
    }
    return { isVerified: false };
  } catch (error) {
    console.error('Error checking wallet verification:', error);
    return { isVerified: false };
  }
}

// Helper to check if wallet is self-verified (via SelfBackendVerifier)
export async function isWalletSelfVerified(wallet: string): Promise<boolean> {
  const details = await getWalletSelfVerificationDetails(wallet);
  return details.isVerified;
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

    // Get verification data from Redis
    let matchingVerifications: any[] = [];
    if (wallet || userId) {
      try {
        const client = await getRedisClient();
        const key = wallet || userId;
        const verificationData = await client.get(key as string);
        if (verificationData) {
          const data = JSON.parse(verificationData as string);
          matchingVerifications = [data];
        }
      } catch (error) {
        console.log('No verification data found in Redis');
      }
    }

    // GoodDollar and Self verification status
    let goodDollarDetails: any = null;
    let selfDetails: any = { 
      isVerified: false,
      nationality: null,
      attestationId: null,
      timestamp: null,
      userDefinedData: null,
      verificationOptions: null
    };
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
        let expiryData: any = null;
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
      const selfVerificationDetails = await getWalletSelfVerificationDetails(wallet as string);
      if (selfVerificationDetails.isVerified) {
        selfDetails = selfVerificationDetails;
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
        selfDetails = { 
          isVerified: true,
          nationality: latestVerification.nationality || null,
          attestationId: latestVerification.attestationId || null,
          timestamp: latestVerification.timestamp || null,
          userDefinedData: latestVerification.userDefinedData || null,
          verificationOptions: latestVerification.verificationOptions || null
        };
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