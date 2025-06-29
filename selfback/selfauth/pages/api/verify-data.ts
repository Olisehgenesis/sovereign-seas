import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import Cors from 'cors';
import { initMiddleware } from '../../lib/init-middleware';

const DATA_FILE = path.join(process.cwd(), 'data', 'wallet-verifications.json');

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
    if (!fs.existsSync(DATA_FILE)) {
      return res.status(200).json({ 
        verifiedUsers: [],
        total: 0,
        message: 'No verification data found'
      });
    }

    const verifications = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    
    // Get only verified users (most recent verification for each user)
    const verifiedUsers = verifications
      .filter((v: any) => v.verificationStatus)
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      // Remove duplicates by keeping only the most recent verification for each wallet
      .filter((v: any, index: number, self: any[]) => 
        index === self.findIndex((t: any) => t.wallet.toLowerCase() === v.wallet.toLowerCase())
      );

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