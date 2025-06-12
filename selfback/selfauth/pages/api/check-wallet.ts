import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import Cors from 'cors';
import { initMiddleware } from '../../lib/init-middleware';

// Path to the JSON file
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

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wallet } = req.query;

    // Validate wallet parameter
    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Check if data file exists
    if (!fs.existsSync(DATA_FILE)) {
      return res.status(200).json({ 
        verified: false,
        message: 'No verification data found'
      });
    }

    // Read verification data
    const verifications = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    
    // Find the most recent verification for this wallet
    const walletVerifications = verifications
      .filter((v: any) => v.wallet.toLowerCase() === wallet.toLowerCase())
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (walletVerifications.length === 0) {
      return res.status(200).json({ 
        verified: false,
        message: 'Wallet not found in verification records'
      });
    }

    // Return the most recent verification status
    const latestVerification = walletVerifications[0];
    return res.status(200).json({
      verified: latestVerification.verificationStatus,
      timestamp: latestVerification.timestamp,
      message: latestVerification.verificationStatus ? 'Wallet is verified' : 'Wallet is not verified'
    });

  } catch (error) {
    console.error('Error checking wallet verification:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 