// pages/api/verify.ts (Pages Router API route)
import { SelfBackendVerifier, DefaultConfigStore, AllIds } from '@selfxyz/core';
import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

// Configure the Self backend verifier
const configStore = new DefaultConfigStore({
  excludedCountries: [],
  ofac: false
});

const verifier = new SelfBackendVerifier(
  'sovereign-seas',
  'https://auth.sovseas.xyz/api/verify',
  false, 
  AllIds,
  configStore,
  'uuid'
);

interface VerificationData {
  timestamp: string;
  walletAddress: string;
  nationality: string;
  attestationId: string;
  userDefinedData: any;
  verified: boolean;
}

const saveVerificationData = async (data: VerificationData) => {
  const dataDir = path.join(process.cwd(), 'data');
  const filePath = path.join(dataDir, 'verifications.json');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  let existingData: VerificationData[] = [];
  if (fs.existsSync(filePath)) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      existingData = JSON.parse(fileContent);
    } catch (error) {
      console.error('Error reading existing data:', error);
    }
  }
  existingData.push(data);
  try {
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
    console.log('Verification data saved successfully');
  } catch (error) {
    console.error('Error saving verification data:', error);
    throw error;
  }
};

const parseUserDefinedData = (hexData: string) => {
  try {
    const cleanHex = hexData.replace(/0+$/, '');
    const jsonString = Buffer.from(cleanHex, 'hex').toString('utf8');
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error parsing user defined data:', error);
    return null;
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { attestationId, proof, pubSignals, userContextData } = req.body;
      console.log('Received verification request:', {
        attestationId,
        hasProof: !!proof,
        hasPubSignals: !!pubSignals,
        hasUserContextData: !!userContextData
      });

      // return  if any is not given
      if (!attestationId || !proof || !pubSignals || !userContextData) {
        res.status(400).json({
          verified: false,
          error: 'Missing required fields'
        });
        return;
      }
      const result = await verifier.verify(
        attestationId,
        proof,
        pubSignals,
        userContextData
      );
      console.log('Verification result:', {
        isValid: result.isValidDetails.isValid,
        nationality: result.discloseOutput?.nationality
      });
      if (result.isValidDetails.isValid) {
        const userDefinedData = parseUserDefinedData(userContextData.userDefinedData || '');
        const walletAddress = userDefinedData?.connectedWallet || null;
        const verificationData: VerificationData = {
          timestamp: new Date().toISOString(),
          walletAddress: walletAddress,
          nationality: result.discloseOutput?.nationality || 'Unknown',
          attestationId: attestationId,
          userDefinedData: userDefinedData,
          verified: true
        };
        await saveVerificationData(verificationData);
        res.status(200).json({
          verified: true,
          nationality: result.discloseOutput?.nationality,
          walletAddress: walletAddress,
          timestamp: verificationData.timestamp
        });
      } else {
        console.log('Verification failed:', result.isValidDetails);
        res.status(400).json({
          verified: false,
          error: 'Verification failed'
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      res.status(500).json({
        verified: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else if (req.method === 'GET') {
    try {
      const walletAddress = req.query.wallet;
      // Ensure walletAddress is a string
      const walletAddressStr = Array.isArray(walletAddress) ? walletAddress[0] : walletAddress;
      const dataDir = path.join(process.cwd(), 'data');
      const filePath = path.join(dataDir, 'verifications.json');
      if (!fs.existsSync(filePath)) {
        res.status(200).json({ verifications: [] });
        return;
      }
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const verifications: VerificationData[] = JSON.parse(fileContent);
      const filteredVerifications = walletAddressStr
        ? verifications.filter(v => v.walletAddress && v.walletAddress.toLowerCase() === walletAddressStr.toLowerCase())
        : verifications;
      res.status(200).json({
        verifications: filteredVerifications,
        total: filteredVerifications.length
      });
    } catch (error) {
      console.error('Error retrieving verification data:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}