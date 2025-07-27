import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from 'redis';

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

async function saveGoodDollarVerification(walletAddress: string, verificationData: any) {
  try {
    const client = await getRedisClient();
    
    // Create the verification data structure
    const newVerification = {
      provider: 'gooddollar',
      verifiedAt: new Date().toISOString(),
      isValid: verificationData.verificationStatus || true,
      root: verificationData.root || false,
      userId: verificationData.userId || walletAddress, // Use wallet address as userId
      verificationStatus: verificationData.verificationStatus || true,
      walletAddress: walletAddress
    };
    
    // Save to Redis using wallet address as key
    await client.set(walletAddress, JSON.stringify(newVerification));
    console.log(`Saved GoodDollar verification to Redis for wallet: ${walletAddress}`);
    
    return newVerification;
  } catch (error) {
    console.error('Error saving GoodDollar verification:', error);
    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("GoodDollar verification request:", req.body);

  if (req.method === 'POST') {
    try {
      const { wallet, userId, verificationStatus, root } = req.body;

      if (!wallet) {
        return res.status(400).json({ 
          message: 'Missing required field: wallet' 
        });
      }

      // Save GoodDollar verification
      const savedProfile = await saveGoodDollarVerification(wallet, {
        userId,
        verificationStatus: verificationStatus || true,
        root
      });

      return res.status(200).json({
        status: 'success',
        result: true,
        message: 'GoodDollar verification saved successfully',
        profile: savedProfile
      });

    } catch (error) {
      console.error('Error saving GoodDollar verification:', error);

      return res.status(200).json({
        status: 'error',
        result: false,
        reason: 'Internal server error',
        error_code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
} 