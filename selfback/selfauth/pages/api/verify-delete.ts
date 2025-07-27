import type { NextApiRequest, NextApiResponse } from 'next';
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wallet, userId } = req.body;

    // Validate required fields
    if (!wallet && !userId) {
      return res.status(400).json({ error: 'Either wallet or userId is required' });
    }

    const client = await getRedisClient();
    
    // Find matching verifications
    let targetKey = null;
    if (wallet) {
      const verificationData = await client.get(wallet);
      if (verificationData) {
        targetKey = wallet;
      }
    } else if (userId) {
      // Search for userId in all keys (this is a simplified approach)
      const keys = await client.keys('*');
      for (const key of keys) {
        const data = await client.get(key);
        if (data) {
          const verification = JSON.parse(data as string);
          if (verification.userId === userId) {
            targetKey = key;
            break;
          }
        }
      }
    }

    if (!targetKey) {
      return res.status(404).json({ error: 'No verification found for the provided identifier' });
    }

    // Get existing verification data
    const existingData = await client.get(targetKey);
    if (!existingData) {
      return res.status(404).json({ error: 'No verification found for the provided identifier' });
    }

    const verification = JSON.parse(existingData as string);

    // Create new verification with status false
    const newVerification = {
      wallet: verification.wallet || targetKey,
      userId: verification.userId,
      verificationStatus: false,
      timestamp: new Date().toISOString()
    };

    // Save to Redis
    await client.set(targetKey, JSON.stringify(newVerification));

    return res.status(200).json({
      success: true,
      data: newVerification,
      message: 'Verification status updated to unverified'
    });

  } catch (error) {
    console.error('Error updating verification status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 