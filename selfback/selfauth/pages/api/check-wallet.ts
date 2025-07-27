import type { NextApiRequest, NextApiResponse } from 'next';
// CORS removed - using next.config.ts headers instead
// initMiddleware removed - CORS handled by next.config.ts
// originList removed - CORS handled by next.config.ts
import { createClient } from 'redis';

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
  }

  try {
    const { wallet } = req.query;

    // Validate wallet parameter
    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Get verification data from Redis
    const client = await getRedisClient();
    const verificationData = await client.get(wallet);
    
    if (!verificationData) {
      return res.status(200).json({ 
        verified: false,
        message: 'Wallet not found in verification records'
      });
    }

    // Parse verification data
    const data = JSON.parse(verificationData as string);
    return res.status(200).json({
      verified: data.verified,
      timestamp: data.timestamp,
      message: data.verified ? 'Wallet is verified' : 'Wallet is not verified'
    });

  } catch (error) {
    console.error('Error checking wallet verification:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 