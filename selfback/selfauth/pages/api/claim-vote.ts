//add api route to claim and vote for a user with reeor logoong

import type { NextApiRequest, NextApiResponse } from 'next';
import { claimAndVoteForUser } from '../../src/utils/claims';
import { createPublicClient, createWalletClient, http} from 'viem';
import { PublicClient, WalletClient } from "viem";
import { celo } from 'viem/chains';
import { isWalletGoodDollarVerified } from './verify-details';
import { createClient } from 'redis';

const testnetEnabled = process.env.TESTNET_ENABLED === 'true';

// Redis client
let redis: any = null;

const getRedisClient = async () => {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    console.log('Connecting to Redis at:', redisUrl);
    redis = createClient({
      url: redisUrl
    });
    try {
      await redis.connect();
      console.log('Successfully connected to Redis');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw new Error('Redis connection failed. Please check your REDIS_URL environment variable.');
    }
  }
  return redis;
};

const publicClient = createPublicClient({
  chain: celo,
  transport: http(),
});
const walletClient = createWalletClient({
  chain: celo,
  transport: http(),
  // ...add your wallet config if needed
});

// Helper function to check if a wallet is verified using Redis
async function isWalletVerified(wallet: string): Promise<boolean> {
  try {
    const client = await getRedisClient();
    const verificationData = await client.get(wallet);
    if (!verificationData) return false;
    
    const data = JSON.parse(verificationData as string);
    return data.verified === true;
  } catch (error) {
    console.error('Error checking wallet verification:', error);
    return false;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }

  try {
    const { beneficiaryAddress, campaignId, projectId, data } = req.body;

    // Validate required fields
    if (!beneficiaryAddress || !campaignId || !projectId) {
      console.error('Missing required fields:', { beneficiaryAddress, campaignId, projectId });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: beneficiaryAddress, campaignId, and projectId are required'
      });
    }

    // Check if beneficiary is verified (self or GoodDollar)
    const isSelfVerified = await isWalletVerified(beneficiaryAddress);
    let isVerified = isSelfVerified;
    if (!isSelfVerified) {
      isVerified = await isWalletGoodDollarVerified(beneficiaryAddress);
    }
    if (!isVerified) {
      return res.status(403).json({
        success: false,
        error: 'Beneficiary wallet is not verified (self or GoodDollar). Please verify your wallet before claiming.'
      });
    }

    // Call the claim and vote function
    const result = await claimAndVoteForUser(
      beneficiaryAddress,
      campaignId,
      projectId,
      data || {}
    );

    if (!result.success) {
      console.error('Claim and vote failed:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to process claim and vote'
      });
    }

    // Return success response
    return res.status(200).json({
      success: true,
      data: {
        transactionHash: result.transactionHash,
        message: 'Claim and vote processed successfully'
      }
    });

  } catch (error: any) {
    // Log the full error for debugging
    console.error('Error in claim-vote endpoint:', {
      message: error.message,
      stack: error.stack,
      details: error
    });

    // Return a sanitized error response
    return res.status(500).json({
      success: false,
      error: `Internal server error: ${error.message}`
    });
  }
}
