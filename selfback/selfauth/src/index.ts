import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { SelfBackendVerifier, getUserIdentifier } from '@selfxyz/core';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Initialize Self verifier
const selfBackendVerifier = new SelfBackendVerifier(
  'sovereign-seas',
  'https://self.sovseas.xyz/verify'
);

// Verification endpoint
app.post('/verify', async (req, res) => {
  try {
    const { proof, publicSignals } = req.body;

    if (!proof || !publicSignals) {
      return res.status(400).json({
        status: 'error',
        result: false,
        message: 'Proof and publicSignals are required'
      });
    }

    // Extract user ID from the proof
    const userId = await getUserIdentifier(publicSignals);
    console.log("Extracted userId:", userId);

    // Verify the proof
    const result = await selfBackendVerifier.verify(proof, publicSignals);
    
    if (result.isValid) {
      return res.status(200).json({
        status: 'success',
        result: true,
        credentialSubject: result.credentialSubject
      });
    } else {
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
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 