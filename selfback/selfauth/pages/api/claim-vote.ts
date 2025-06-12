//add api route to claim and vote for a user with reeor logoong

import type { NextApiRequest, NextApiResponse } from 'next';
import { claimAndVoteForUser } from '../../src/utils/claims';

// Allowed origins
const allowedOrigins = [
  'http://localhost:4173',
  'http://localhost:4174',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://sovseas.xyz',
  'https://auth.sovseas.xyz'
];


const testnetEnabled=process.env.TESTNET_ENABLED === 'true' 

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
    const returnData = await claimAndVoteForUser(beneficiaryAddress, campaignId, projectId, data || {})


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
      error: testnetEnabled
        ? `Internal server error: ${error.message}`
        : 'An unexpected error occurred while processing your request'
    });
  }
}
