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

    if (matchingVerifications.length === 0) {
      // If no local verification, but wallet is provided, check with your IdentitySDK
      if (wallet) {
        try {
          // Check self-verification first
          if (isWalletSelfVerified(wallet as string)) {
            return res.status(200).json({
              verified: true,
              wallet: wallet,
              userId: null,
              timestamp: null,
              message: 'Wallet is verified by Self Protocol',
              self: { isVerified: true },
              eligibleToClaim: true
            });
          }
          // Create public client for Celo network
          const publicClient = createPublicClient({
            chain: undefined,
            transport: http('https://forno.celo.org')
          });

          // Create a mock wallet client (since we only need read operations)
          // Note: For read-only operations, you might want to create a separate helper
          // that only uses publicClient without requiring walletClient
          const mockWalletClient = {
            chain: celo,
            account: null,
            getAddresses: async () => [],
          } as any;

          const identitySDK = new IdentitySDK(publicClient, mockWalletClient, 'production');
          
          // Check if wallet is whitelisted
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
            } catch (error) {
              console.error('Error getting expiry data:', error);
            }
          }

          if (isWhitelisted) {
            return res.status(200).json({
              verified: true,
              wallet: wallet,
              userId: null,
              timestamp: null,
              message: 'Wallet is verified by GoodDollar',
              gooddollar: {
                isVerified: true,
                wallet: wallet,
                root: root,
                expiry: expiryData,
                nationality: null // This would need to be fetched from another source if available
              },
              eligibleToClaim: true
            });
          }
        } catch (error) {
          console.error('Error verifying with IdentitySDK:', error);
          // fall through to 404 below
        }
      }
      return res.status(404).json({ 
        error: 'No verification found for the provided identifier',
        verified: false
      });
    }

    // Return the most recent verification
    const latestVerification = matchingVerifications[0];

    // Add GoodDollar verification details using your IdentitySDK
    let goodDollarDetails = null;
    if (wallet) {
      try {
        // Create public client for Celo network
        const publicClient = createPublicClient({
          chain: undefined,
          transport: http('https://forno.celo.org')
        });

        // Create a mock wallet client for read-only operations
        const mockWalletClient = {
          chain: celo,
          account: null,
          getAddresses: async () => [],
        } as any;

        const identitySDK = new IdentitySDK(publicClient, mockWalletClient, 'production');
        
        // Check if wallet is whitelisted
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
          } catch (error) {
            console.error('Error getting expiry data:', error);
          }
        }

        goodDollarDetails = {
          isVerified: isWhitelisted,
          wallet: wallet,
          root: root,
          expiry: expiryData,
          nationality: null // This would need to be fetched from another source if available
        };
      } catch (error) {
        console.error('Error verifying with IdentitySDK:', error);
        goodDollarDetails = {
          isVerified: false,
          wallet: wallet,
          root: null,
          expiry: null,
          nationality: null,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }

    return res.status(200).json({
      verified: latestVerification.verificationStatus,
      wallet: latestVerification.wallet,
      userId: latestVerification.userId,
      timestamp: latestVerification.timestamp,
      message: latestVerification.verificationStatus ? 'Wallet is verified' : 'Wallet is not verified',
      gooddollar: goodDollarDetails,
      eligibleToClaim: goodDollarDetails?.isVerified || false
    });

  } catch (error) {
    console.error('Error fetching verification details:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}