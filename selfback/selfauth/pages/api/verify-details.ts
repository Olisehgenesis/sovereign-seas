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
    const { wallet, userId } = req.query;

    // Validate that at least one identifier is provided
    if (!wallet && !userId) {
      return res.status(400).json({ error: 'Either wallet or userId is required' });
    }

    // Check if data file exists
    if (!fs.existsSync(DATA_FILE)) {
      return res.status(404).json({ error: 'No verification data found' });
    }

    const verifications = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    
    // Find verifications matching either wallet or userId
    const matchingVerifications = verifications.filter((v: any) => {
      if (wallet && v.wallet.toLowerCase() === (wallet as string).toLowerCase()) return true;
      if (userId && v.userId === userId) return true;
      return false;
    }).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (matchingVerifications.length === 0) {
      return res.status(404).json({ 
        error: 'No verification found for the provided identifier',
        verified: false
      });
    }

    // Return the most recent verification
    const latestVerification = matchingVerifications[0];
    return res.status(200).json({
      verified: latestVerification.verificationStatus,
      wallet: latestVerification.wallet,
      userId: latestVerification.userId,
      timestamp: latestVerification.timestamp,
      message: latestVerification.verificationStatus ? 'Wallet is verified' : 'Wallet is not verified'
    });

  } catch (error) {
    console.error('Error fetching verification details:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 