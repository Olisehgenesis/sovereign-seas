import { NextApiRequest, NextApiResponse } from 'next';
import { getUserIdentifier, SelfBackendVerifier } from '@selfxyz/core';
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Run the CORS middleware
  await cors(req, res);

  if (req.method === 'POST') {
    try {
      const { proof, publicSignals } = req.body;

      if (!proof || !publicSignals) {
        return res.status(400).json({ message: 'Proof and publicSignals are required' });
      }

      // Extract user ID from the proof
      const userId = await getUserIdentifier(publicSignals);
      console.log("Extracted userId:", userId);

      // Initialize and configure the verifier
      const selfBackendVerifier = new SelfBackendVerifier(
        'sovereign-seas', // Using a unique scope for this application
        'https://auth.sovseas.xyz/api/verify'
      );

      // Verify the proof
      const result = await selfBackendVerifier.verify(proof, publicSignals);
      
      if (result.isValid) {
        // Return successful verification response
        return res.status(200).json({
          status: 'success',
          result: true,
          credentialSubject: result.credentialSubject
        });
      } else {
        // Return failed verification response
        return res.status(500).json({
          status: 'error',
          result: false,
          message: 'Verification failed',
          details: result.isValidDetails
        });
      }
    } catch (error) {
      console.error('Error verifying proof:', error);
      return res.status(500).json({
        status: 'error',
        result: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
} 