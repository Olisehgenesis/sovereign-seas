//add api route to claim and vote for a user with reeor logoong

import type { NextApiRequest, NextApiResponse } from 'next';
import { claimAndVoteForUser } from '../../src/utils/claims';
import Cors from 'cors';
import { initMiddleware } from '../../lib/init-middleware';
import fs from 'fs';
import path from 'path';
import { originList } from '@/src/utils/origin';
import { createPublicClient, createWalletClient, http} from 'viem';
import { PublicClient, WalletClient } from "viem";
import { celo } from 'viem/chains';
import { isWalletGoodDollarVerified } from './verify-details';

// Initialize CORS middleware
const cors = initMiddleware(
  Cors({
    origin: originList,
    methods: ['GET', 'POST', 'OPTIONS'],
  })
);

const DATA_FILE = path.join(process.cwd(), 'data', 'wallet-verifications.json');
const testnetEnabled = process.env.TESTNET_ENABLED === 'true';

const publicClient = createPublicClient({
  chain: celo,
  transport: http(),
});
const walletClient = createWalletClient({
  chain: celo,
  transport: http(),
  // ...add your wallet config if needed
});

// Helper function to check if a wallet is verified
async function isWalletVerified(wallet: string): Promise<boolean> {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return false;
    }

    const verifications = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    
    // Find the most recent verification for this wallet
    const walletVerifications = verifications
      .filter((v: any) => v.wallet.toLowerCase() === wallet.toLowerCase())
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (walletVerifications.length === 0) {
      return false;
    }

    // Return the most recent verification status
    return walletVerifications[0].verificationStatus;
  } catch (error) {
    console.error('Error checking wallet verification:', error);
    return false;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Run the CORS middleware
  await cors(req, res);

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }

  try {
    const { beneficiaryAddress, campaignId, projectId, data } = req.body;

    // Validate required fields
    if (!beneficiaryAddress || !campaignId || !projectId) {
      console.error('Missing required fields:', { beneficiaryAddress, campaignId, projectId });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: beneficiaryAddress, campaignId, and projectId are required'
      });
    }

    // Check if beneficiary is verified (self or GoodDollar)
    const isSelfVerified = await isWalletVerified(beneficiaryAddress);
    let isVerified = isSelfVerified;
    if (!isSelfVerified) {
      isVerified = await isWalletGoodDollarVerified(beneficiaryAddress);
    }
    if (!isVerified) {
      return res.status(403).json({
        success: false,
        error: 'Beneficiary wallet is not verified (self or GoodDollar). Please verify your wallet before claiming.'
      });
    }

    // Call the claim and vote function
    const result = await claimAndVoteForUser(
      beneficiaryAddress,
      campaignId,
      projectId,
      data || {}
    );

    if (!result.success) {
      console.error('Claim and vote failed:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to process claim and vote'
      });
    }

    // Return success response
    return res.status(200).json({
      success: true,
      data: {
        transactionHash: result.transactionHash,
        message: 'Claim and vote processed successfully'
      }
    });

  } catch (error: any) {
    // Log the full error for debugging
    console.error('Error in claim-vote endpoint:', {
      message: error.message,
      stack: error.stack,
      details: error
    });

    // Return a sanitized error response
    return res.status(500).json({
      success: false,
      error: `Internal server error: ${error.message}`
    });
  }
}
