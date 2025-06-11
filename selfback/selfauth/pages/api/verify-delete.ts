import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'wallet-verifications.json');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check origin
  const origin = req.headers.origin;
//   if (origin !== 'https://sovseas.xyz') {
//     return res.status(403).json({ error: 'Unauthorized origin' });
//   }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wallet, userId } = req.body;

    // Validate required fields
    if (!wallet && !userId) {
      return res.status(400).json({ error: 'Either wallet or userId is required' });
    }

    // Check if data file exists
    if (!fs.existsSync(DATA_FILE)) {
      return res.status(404).json({ error: 'No verification data found' });
    }

    const verifications = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    
    // Find matching verifications
    const matchingVerifications = verifications.filter((v: any) => {
      if (wallet && v.wallet.toLowerCase() === wallet.toLowerCase()) return true;
      if (userId && v.userId === userId) return true;
      return false;
    });

    if (matchingVerifications.length === 0) {
      return res.status(404).json({ error: 'No verification found for the provided identifier' });
    }

    // Add new verification with status false
    const newVerification = {
      wallet: matchingVerifications[0].wallet,
      userId: matchingVerifications[0].userId,
      verificationStatus: false,
      timestamp: new Date().toISOString()
    };

    verifications.push(newVerification);
    fs.writeFileSync(DATA_FILE, JSON.stringify(verifications, null, 2));

    return res.status(200).json({
      success: true,
      data: newVerification,
      message: 'Verification status updated to unverified'
    });

  } catch (error) {
    console.error('Error updating verification status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 