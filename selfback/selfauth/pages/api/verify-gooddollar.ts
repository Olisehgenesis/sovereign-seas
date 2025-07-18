import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import Cors from 'cors';
import { initMiddleware } from '../../lib/init-middleware';
import { originList } from '@/src/utils/origin';

// Initialize CORS middleware
const cors = initMiddleware(
  Cors({
    origin: originList,
    methods: ['GET', 'POST', 'OPTIONS'],
  })
);

// JSON file storage functions (same as verify.ts)
const PROFILES_FILE = path.join(process.cwd(), 'data', 'profiles.json');

async function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

async function loadProfiles() {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(PROFILES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or is empty, return empty array
    return [];
  }
}

async function saveGoodDollarVerification(walletAddress: string, verificationData: any) {
  try {
    await ensureDataDirectory();
    
    const profiles = await loadProfiles();
    
    // Check if wallet already exists
    const existingIndex = profiles.findIndex((p: any) => p.walletAddress === walletAddress);
    
    const newVerification = {
      provider: 'gooddollar',
      verifiedAt: new Date().toISOString(),
      isValid: verificationData.verificationStatus || true,
      root: verificationData.root,
      userId: verificationData.userId || `gooddollar-${Date.now()}`,
      verificationStatus: verificationData.verificationStatus || true
    };
    
    if (existingIndex >= 0) {
      // Wallet exists - check if GoodDollar verification already exists
      const existingProfile = profiles[existingIndex];
      const existingVerifications = existingProfile.verifications || [];
      
      // Check if GoodDollar verification already exists
      const providerIndex = existingVerifications.findIndex((v: any) => v.provider === 'gooddollar');
      
      if (providerIndex >= 0) {
        // Update existing GoodDollar verification
        existingVerifications[providerIndex] = newVerification;
        console.log(`Updated GoodDollar verification for wallet: ${walletAddress}`);
      } else {
        // Add new GoodDollar verification
        existingVerifications.push(newVerification);
        console.log(`Added new GoodDollar verification for wallet: ${walletAddress}`);
      }
      
      // Update the profile with new verifications array
      profiles[existingIndex] = {
        ...existingProfile,
        verifications: existingVerifications,
        lastUpdated: new Date().toISOString()
      };
    } else {
      // Create new profile with GoodDollar verification
      const newProfile = {
        walletAddress,
        verifications: [newVerification],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      profiles.push(newProfile);
      console.log(`Created new profile with GoodDollar verification for wallet: ${walletAddress}`);
    }
    
    await fs.writeFile(PROFILES_FILE, JSON.stringify(profiles, null, 2));
    console.log(`Saved GoodDollar verification to ${PROFILES_FILE}`);
    
    return profiles[existingIndex >= 0 ? existingIndex : profiles.length - 1];
  } catch (error) {
    console.error('Error saving GoodDollar verification:', error);
    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await cors(req, res);
  console.log("GoodDollar verification request:", req.body);

  if (req.method === 'POST') {
    try {
      const { wallet, userId, verificationStatus, root } = req.body;

      if (!wallet) {
        return res.status(400).json({ 
          message: 'Missing required field: wallet' 
        });
      }

      // Save GoodDollar verification
      const savedProfile = await saveGoodDollarVerification(wallet, {
        userId,
        verificationStatus: verificationStatus || true,
        root
      });

      return res.status(200).json({
        status: 'success',
        result: true,
        message: 'GoodDollar verification saved successfully',
        profile: savedProfile
      });

    } catch (error) {
      console.error('Error saving GoodDollar verification:', error);

      return res.status(200).json({
        status: 'error',
        result: false,
        reason: 'Internal server error',
        error_code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
} 