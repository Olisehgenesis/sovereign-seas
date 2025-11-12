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
  // Apply CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await getRedisClient();
    
    // Get all keys from Redis that contain verification data
    const keys = await client.keys('*');
    const countriesSet = new Set<string>();
    
    for (const key of keys) {
      try {
        const data = await client.get(key);
        if (data) {
          const profile = JSON.parse(data as string);
          if (profile.verified === true && profile.nationality) {
            // Add country/nationality to set (removes duplicates)
            const country = profile.nationality.trim();
            if (country && country !== 'Unknown' && country !== 'Not disclosed') {
              countriesSet.add(country);
            }
          }
        }
      } catch (error) {
        console.error('Error parsing data for key:', key, error);
      }
    }
    
    // Convert set to array and sort
    const countries = Array.from(countriesSet).sort();

    return res.status(200).json({
      countries,
      count: countries.length,
      message: `Found ${countries.length} unique countries`
    });

  } catch (error) {
    console.error('Error fetching countries:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

