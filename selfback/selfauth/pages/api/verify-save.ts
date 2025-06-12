import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import Cors from 'cors';
import { initMiddleware } from '../../lib/init-middleware';

interface WalletVerification {
  wallet: string;
  userId: string;
  verificationStatus: boolean;
  timestamp: string;
}

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

// Ensure data directory exists
if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
  fs.mkdirSync(path.join(process.cwd(), 'data'));
}

// Initialize empty array if file doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Run the CORS middleware
  await cors(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wallet, userId, verificationStatus } = req.body;

    // Enhanced validation with detailed error messages
    if (!wallet) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    if (typeof verificationStatus !== 'boolean') {
      return res.status(400).json({ error: 'Verification status must be a boolean' });
    }

    // Validate wallet address format (basic Ethereum address validation)
    const walletRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!walletRegex.test(wallet)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    console.log('Received verification request:', { wallet, userId, verificationStatus });

    const newVerification: WalletVerification = {
      wallet: wallet.toLowerCase(), // Normalize wallet address
      userId,
      verificationStatus,
      timestamp: new Date().toISOString()
    };

    // Read existing data
    let existingData: WalletVerification[] = [];
    try {
      const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
      existingData = JSON.parse(fileContent);
    } catch (error) {
      console.log('Creating new data file...');
      existingData = [];
    }

    // Check if wallet is already verified
    const existingIndex = existingData.findIndex(
      item => item.wallet.toLowerCase() === wallet.toLowerCase()
    );

    if (existingIndex !== -1) {
      // Update existing record
      existingData[existingIndex] = newVerification;
      console.log('Updated existing verification for wallet:', wallet);
    } else {
      // Add new record
      existingData.push(newVerification);
      console.log('Added new verification for wallet:', wallet);
    }

    // Save to file
    fs.writeFileSync(DATA_FILE, JSON.stringify(existingData, null, 2));

    return res.status(200).json({ 
      success: true, 
      data: newVerification,
      message: 'Verification saved successfully'
    });
  } catch (error) {
    console.error('Error saving verification:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}