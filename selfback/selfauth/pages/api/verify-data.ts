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

interface VerifiedUser {
  wallet: string;
  verificationType: string;
  verifiedAt: string;
  country: string;
  timestamp: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await getRedisClient();
    
    // Get all keys from Redis that contain verification data
    const keys = await client.keys('*');
    const verifiedUsers: VerifiedUser[] = [];
    
    for (const key of keys) {
      try {
        const data = await client.get(key);
        if (data) {
          const profile = JSON.parse(data as string);
          if (profile.verified === true) {
            verifiedUsers.push({
              wallet: profile.walletAddress || key,
              verificationType: 'self',
              verifiedAt: profile.timestamp,
              country: profile.nationality || 'Unknown',
              timestamp: profile.timestamp
            });
          }
        }
      } catch (error) {
        console.error('Error parsing data for key:', key, error);
      }
    }
    
    // Sort by timestamp (most recent first)
    verifiedUsers.sort((a: VerifiedUser, b: VerifiedUser) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return res.status(200).json({
      verifiedUsers,
      total: verifiedUsers.length,
      message: `Found ${verifiedUsers.length} verified users`
    });

  } catch (error) {
    console.error('Error fetching verified users:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 