import { NextApiRequest, NextApiResponse } from 'next';
import { 
  SelfBackendVerifier, 
  IConfigStorage,
  VerificationConfig,
} from '@selfxyz/core';
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

// Configuration storage implementation
class ConfigStorage implements IConfigStorage {
  async getConfig(configId: string): Promise<VerificationConfig> {
    return {
      excludedCountries: ['IRN', 'PRK'],
      ofac: true
    };
  }
  
  async setConfig(configId: string, config: VerificationConfig): Promise<boolean> {
    // Implementation for setting config (can be empty for this use case)
    return true;
  }
  
  async getActionId(userIdentifier: string, userDefinedData: string): Promise<string> {
    // Parse user defined data to get wallet address and other info
    try {
      const decodedData = Buffer.from(userDefinedData.replace('0x', ''), 'hex').toString();
      const userData = JSON.parse(decodedData.replace(/\0/g, '')); // Remove null padding
      console.log('Parsed user data:', userData);
      
      // You can use wallet address or other data to determine config
      return userData.walletAddress ? 'wallet_verification' : 'default_config';
    } catch (error) {
      console.log('Could not parse user defined data, using default config');
      return 'default_config';
    }
  }
}

// Initialize verifier
const allowedIds = new Map();
allowedIds.set(1, true); // Accept passports

const selfBackendVerifier = new SelfBackendVerifier(
  'sovereign-seas',
  'https://auth.sovseas.xyz/api/verify',
  false,
  allowedIds,
  new ConfigStorage(),
  'hex' // Use hex for wallet addresses
);



// JSON file storage functions
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

async function saveProfile(walletAddress: string, verificationData: any, provider: string = 'self') {
  try {
    await ensureDataDirectory();
    
    const profiles = await loadProfiles();
    
    // Check if wallet already exists
    const existingIndex = profiles.findIndex((p: any) => p.walletAddress === walletAddress);
    
    const newVerification = {
      provider,
      verifiedAt: new Date().toISOString(),
      isValid: verificationData.isValidDetails?.isValid || verificationData.isValid || true,
      ...(provider === 'self' ? {
        sessionId: verificationData.userData?.userIdentifier,
        disclosures: verificationData.discloseOutput,
        attestationId: verificationData.attestationId,
        validationDetails: verificationData.isValidDetails
      } : {
        // GoodDollar specific fields
        root: verificationData.root,
        userId: verificationData.userId || `gooddollar-${Date.now()}`,
        verificationStatus: verificationData.verificationStatus || true
      })
    };
    
    if (existingIndex >= 0) {
      // Wallet exists - check if this provider verification already exists
      const existingProfile = profiles[existingIndex];
      const existingVerifications = existingProfile.verifications || [];
      
      // Check if this provider verification already exists
      const providerIndex = existingVerifications.findIndex((v: any) => v.provider === provider);
      
      if (providerIndex >= 0) {
        // Update existing verification for this provider
        existingVerifications[providerIndex] = newVerification;
        console.log(`Updated ${provider} verification for wallet: ${walletAddress}`);
      } else {
        // Add new verification for this provider
        existingVerifications.push(newVerification);
        console.log(`Added new ${provider} verification for wallet: ${walletAddress}`);
      }
      
      // Update the profile with new verifications array
      profiles[existingIndex] = {
        ...existingProfile,
        verifications: existingVerifications,
        lastUpdated: new Date().toISOString()
      };
    } else {
      // Create new profile with first verification
      const newProfile = {
        walletAddress,
        verifications: [newVerification],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      profiles.push(newProfile);
      console.log(`Created new profile with ${provider} verification for wallet: ${walletAddress}`);
    }
    
    await fs.writeFile(PROFILES_FILE, JSON.stringify(profiles, null, 2));
    console.log(`Saved profile to ${PROFILES_FILE}`);
    
    return profiles[existingIndex >= 0 ? existingIndex : profiles.length - 1];
  } catch (error) {
    console.error('Error saving profile:', error);
    throw error;
  }
}

async function getProfile(walletAddress: string) {
  try {
    const profiles = await loadProfiles();
    const profile = profiles.find((p: any) => p.walletAddress === walletAddress);
    
    if (!profile) {
      return null;
    }
    
    // Calculate overall verification status
    const verifications = profile.verifications || [];
    const isValid = verifications.some((v: any) => v.isValid);
    const providers = verifications.map((v: any) => v.provider);
    
    return {
      ...profile,
      isValid,
      providers,
      verificationCount: verifications.length
    };
  } catch (error) {
    console.error('Error loading profile:', error);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await cors(req, res);
  console.log("=== VERIFICATION REQUEST START ===");
  console.log("Method:", req.method);
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  console.log("Query:", req.query);
  console.log("Timestamp:", new Date().toISOString());

  if (req.method === 'POST') {
    try {
      const { attestationId, proof, pubSignals, userContextData } = req.body;
      console.log("attestationId", attestationId);
      console.log("proof", proof);
      console.log("pubSignals", pubSignals);
      console.log("userContextData", userContextData);

      if (!attestationId || !proof || !pubSignals || !userContextData) {
        console.error("=== MISSING REQUIRED FIELDS ===");
        console.error("attestationId:", !!attestationId, attestationId);
        console.error("proof:", !!proof, proof ? "present" : "missing");
        console.error("pubSignals:", !!pubSignals, pubSignals ? "present" : "missing");
        console.error("userContextData:", !!userContextData, userContextData);
        return res.status(400).json({ 
          status: 'error',
          result: false,
          reason: 'Missing required fields: attestationId, proof, pubSignals, userContextData',
          error_code: "MISSING_REQUIRED_FIELDS",
          message: 'Missing required fields: attestationId, proof, pubSignals, userContextData' 
        });
      }

      // Extract wallet address from user context data
      let walletAddress: string | null = null;
      try {
        console.log("=== EXTRACTING WALLET ADDRESS ===");
        console.log("userContextData:", userContextData);
        const decodedData = Buffer.from(userContextData.replace('0x', ''), 'hex').toString();
        console.log("decodedData:", decodedData);
        const userData = JSON.parse(decodedData.replace(/\0/g, ''));
        console.log("parsed userData:", userData);
        walletAddress = userData.walletAddress;
        console.log("Extracted wallet address:", walletAddress);
      } catch (error) {
        console.error('=== ERROR EXTRACTING WALLET ADDRESS ===');
        console.error('userContextData:', userContextData);
        console.error('Error:', error);
        console.log('Could not extract wallet address from user context data');
      }

      // Verify the proof
      console.log("=== STARTING VERIFICATION ===");
      console.log("attestationId:", attestationId);
      console.log("proof length:", proof ? Object.keys(proof).length : "no proof");
      console.log("pubSignals length:", pubSignals ? pubSignals.length : "no pubSignals");
      console.log("userContextData length:", userContextData ? userContextData.length : "no userContextData");
      
      const result = await selfBackendVerifier.verify(
        attestationId,
        proof,
        pubSignals,
        userContextData
      );
      
      console.log("=== VERIFICATION RESULT ===");
      console.log("result.isValidDetails:", result.isValidDetails);
      console.log("result.isValidDetails.isValid:", result.isValidDetails.isValid);
      console.log("result.userData:", result.userData);
      console.log("result.discloseOutput:", result.discloseOutput);
      
      if (result.isValidDetails.isValid) {
        let savedProfile = null;
        
        // Save to profiles.json if we have a wallet address
        if (walletAddress) {
          try {
            savedProfile = await saveProfile(walletAddress, {
              discloseOutput: result.discloseOutput,
              userData: result.userData,
              attestationId,
              isValidDetails: result.isValidDetails
            }, 'self');
          } catch (saveError) {
            console.error('Error saving profile, but verification was successful:', saveError);
            // Continue with successful response even if save failed
          }
        }

        return res.status(200).json({
          status: 'success',
          result: true,
          credentialSubject: result.discloseOutput,
          userData: result.userData,
          walletAddress,
          savedProfile: savedProfile ? 'Profile saved successfully' : 'No wallet address to save'
        });
      } else {
        return res.status(200).json({
          status: 'error',
          result: false,
          reason: 'Verification failed',
          error_code: "VERIFICATION_FAILED",
          details: result.isValidDetails
        });
      }
    } catch (error) {
      console.error('=== VERIFICATION ERROR ===');
      console.error('Error type:', error instanceof Error ? error.constructor.name : 'Unknown');
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('Full error object:', error);
      console.error('Timestamp:', new Date().toISOString());

      return res.status(200).json({
        status: 'error',
        result: false,
        reason: 'Internal server error',
        error_code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } 
  
  // GET method to retrieve profiles (optional)
  else if (req.method === 'GET') {
    try {
      const { wallet } = req.query;
      
      if (wallet) {
        // Get specific wallet profile
        const profile = await getProfile(wallet as string);
        return res.status(200).json({ profile });
      } else {
        // Get all profiles
        const profiles = await loadProfiles();
        return res.status(200).json({ profiles });
      }
    } catch (error) {
      console.error('Error retrieving profiles:', error);
      return res.status(500).json({ 
        error: 'Failed to retrieve profiles',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } 
  
  else {
    console.log("=== METHOD NOT ALLOWED ===");
    console.log("Method:", req.method);
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  console.log("=== VERIFICATION REQUEST END ===");
} 