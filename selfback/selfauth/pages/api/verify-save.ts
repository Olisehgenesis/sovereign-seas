import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

interface WalletVerification {
  wallet: string;
  userId: string;
  verificationStatus: boolean;
  timestamp: string;
}

const DATA_FILE = path.join(process.cwd(), 'data', 'wallet-verifications.json');

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
  // Check origin
  const origin = req.headers.origin;
  if (origin !== 'https://sovseas.xyz') {
    return res.status(403).json({ error: 'Unauthorized origin' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wallet, userId, verificationStatus } = req.body;

    // Validate required fields
    if (!wallet || !userId || typeof verificationStatus !== 'boolean') {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newVerification: WalletVerification = {
      wallet,
      userId,
      verificationStatus,
      timestamp: new Date().toISOString()
    };

    const existingData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    existingData.push(newVerification);
    fs.writeFileSync(DATA_FILE, JSON.stringify(existingData, null, 2));

    return res.status(200).json({ 
      success: true, 
      data: newVerification,
      message: 'Verification saved successfully'
    });
  } catch (error) {
    console.error('Error saving verification:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}