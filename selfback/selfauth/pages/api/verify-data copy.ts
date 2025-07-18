import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import Cors from 'cors';
import { initMiddleware } from '../../lib/init-middleware';

const PROFILES_FILE = path.join(process.cwd(), 'data', 'profiles.json');

// Initialize CORS middleware
const cors = initMiddleware(
  Cors({
    origin: [
      'http://localhost:4173',
      'http://localhost:4174',
      'http://localhost:5173',
      'http://localhost:3000',
      'https://sovseas.xyz',
      'https://auth.sovseas.xyz'
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
  })
);

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
    // Check if data file exists
    if (!fs.existsSync(PROFILES_FILE)) {
      return res.status(200).json({ 
        verifiedUsers: [],
        total: 0,
        message: 'No verification data found'
      });
    }

    const profiles = JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf-8'));
    
    // Get only verified users and include country information
    const verifiedUsers = profiles
      .filter((p: any) => p.isValid)
      .map((p: any) => ({
        wallet: p.walletAddress,
        verificationType: p.verificationType || 'self',
        verifiedAt: p.verifiedAt,
        country: p.disclosures?.nationality || 'Unknown',
        timestamp: p.verifiedAt
      }))
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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