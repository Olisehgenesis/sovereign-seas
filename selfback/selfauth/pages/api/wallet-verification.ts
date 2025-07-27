import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from 'redis';

// Define the data structure
interface WalletVerification {
  wallet: string;
  verificationStatus: boolean;
  timestamp: string;
}

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
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wallet, verificationStatus } = req.body;

    // Validate required fields
    if (!wallet || typeof verificationStatus !== 'boolean') {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create new verification entry
    const newVerification: WalletVerification = {
      wallet,
      verificationStatus,
      timestamp: new Date().toISOString()
    };

    // Save to Redis
    const client = await getRedisClient();
    await client.set(wallet, JSON.stringify(newVerification));

    return res.status(200).json({ success: true, data: newVerification });
  } catch (error) {
    console.error('Error processing wallet verification:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 