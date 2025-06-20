import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { originList } from '@/src/utils/origin';

// Define the data structure
interface WalletVerification {
  wallet: string;
  verificationStatus: boolean;
  timestamp: string;
}

// Path to store the JSON file
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
 

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wallet, verificationStatus } = req.body;

    // Validate required fields
    if (!wallet || typeof verificationStatus !== 'boolean') {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create new verification entry
    const newVerification: WalletVerification = {
      wallet,
      verificationStatus,
      timestamp: new Date().toISOString()
    };

    // Read existing data
    const existingData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    
    // Add new verification
    existingData.push(newVerification);

    // Save updated data
    fs.writeFileSync(DATA_FILE, JSON.stringify(existingData, null, 2));

    return res.status(200).json({ success: true, data: newVerification });
  } catch (error) {
    console.error('Error processing wallet verification:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 