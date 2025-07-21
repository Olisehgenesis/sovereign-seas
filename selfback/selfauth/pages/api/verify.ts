// pages/api/verify.ts (Pages Router API route)
import {
  SelfBackendVerifier,
  AllIds,
  DefaultConfigStore,
  VerificationConfig
} from '@selfxyz/core';
import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

// Add VerificationData interface
type VerificationData = {
  timestamp: string;
  walletAddress: string | null;
  nationality: string;
  attestationId: string;
  userDefinedData: any;
  verified: boolean;
};

// Configure the Self backend verifier
const verification_config = {
  minimumAge: 18,
  nationality: true,
};

const configStore = new DefaultConfigStore(verification_config);

const selfBackendVerifier = new SelfBackendVerifier(
  "seasv2",                           
  "https://auth.sovseas.xyz/api/verify", 
  false,                                       
  AllIds,                                     
  configStore,                                
  "hex"                                       
);


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
      // Extract data from the request
      const { attestationId, proof, publicSignals, userContextData } = req.body;
      // Validate required fields
      if (!proof || !publicSignals || !attestationId || !userContextData) {
        return res.status(400).json({
          message: "Proof, publicSignals, attestationId and userContextData are required",
        });
      }
      // Verify the proof
      const result = await selfBackendVerifier.verify(
        attestationId,    // Document type (1 = passport, 2 = EU ID card)
        proof,            // The zero-knowledge proof
        publicSignals,    // Public signals array
        userContextData   // User context data
      );
      // Check if verification was successful
      if (result.isValidDetails.isValid) {
        // Verification successful - process the result
        return res.status(200).json({
          status: "success",
          result: true,
          credentialSubject: result.discloseOutput,
        });
      } else {
        // Verification failed
        return res.status(500).json({
          status: "error",
          result: false,
          message: "Verification failed",
          details: result.isValidDetails,
        });
      }
    } catch (error) {
      return res.status(500).json({
        status: "error",
        result: false,
        message: error instanceof Error ? error.message : "Unknown error",
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