import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from 'redis';

interface WalletVerification {
  wallet: string;
  userId: string;
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
  // This API is deprecated - verification is now handled by the main verify endpoint
  return res.status(410).json({ 
    error: 'This endpoint is deprecated. Verification is now handled by the main verify endpoint.',
    message: 'Please use /api/verify instead'
  });
}