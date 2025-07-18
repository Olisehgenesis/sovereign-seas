import { NextApiRequest, NextApiResponse } from 'next';
import { 
  SelfBackendVerifier, 
  IConfigStorage,
  VerificationConfig,
  AllIds,
} from '@selfxyz/core';
import { promises as fs } from 'fs';
import path from 'path';
import Cors from 'cors';
import { initMiddleware } from '../../lib/init-middleware';
import { originList } from '@/src/utils/origin';
import { logger } from '@/src/utils/logger';



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
      minimumAge: 18,
      excludedCountries: ['IRN', 'PRK'],
      ofac: true
    };
  }
  
  async setConfig(configId: string, config: VerificationConfig): Promise<boolean> {
    // Implementation for setting config (can be empty for this use case)
    return true;
  }
  
  async getActionId(userIdentifier: string, userDefinedData: string): Promise<string> {
    // Use the userIdentifier directly as config ID (like working example)
    return userIdentifier;
  }
}

// Initialize verifier
const selfBackendVerifier = new SelfBackendVerifier(
  'sovereign-seas',
  'https://auth.sovseas.xyz/api/verify',
  false, // Use mock mode for testing
  AllIds, // Accept all ID types like working example
  new ConfigStorage(),
  'hex' // Use UUID format like working example
);



// JSON file storage functions
const PROFILES_FILE = path.join(process.cwd(), 'data', 'profiles.json');

// Global initialization flag
let isInitialized = false;

async function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
    logger('info', `Data directory exists: ${dataDir}`);
  } catch (error) {
    logger('info', `Creating data directory: ${dataDir}`);
    await fs.mkdir(dataDir, { recursive: true });
    logger('info', `Data directory created successfully`);
  }
}

// Initialize data file on app startup/API call
async function initializeDataFile() {
  if (isInitialized) {
    return; // Already initialized
  }
  
  try {
    logger('info', `=== INITIALIZING DATA FILE ===`);
    logger('info', `Current working directory: ${process.cwd()}`);
    logger('info', `Profiles file path: ${PROFILES_FILE}`);
    
    await ensureDataDirectory();
    
    // Check if profiles file exists
    try {
      await fs.access(PROFILES_FILE);
      logger('info', `Profiles file exists: ${PROFILES_FILE}`);
    } catch (error) {
      logger('info', `Profiles file does not exist, creating it: ${PROFILES_FILE}`);
      const emptyProfiles: any[] = [];
      await fs.writeFile(PROFILES_FILE, JSON.stringify(emptyProfiles, null, 2));
      logger('info', `Created new profiles file with empty array`);
    }
    
    isInitialized = true;
    logger('info', `=== DATA FILE INITIALIZATION COMPLETE ===`);
  } catch (error) {
    logger('error', `=== DATA FILE INITIALIZATION ERROR ===`);
    logger('error', 'Error type:', error instanceof Error ? error.constructor.name : 'Unknown');
    logger('error', 'Error message:', error instanceof Error ? error.message : 'Unknown error');
    logger('error', 'Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    // Don't throw error, just log it - app should still work
  }
}

async function loadProfiles() {
  try {
    // Ensure data file is initialized
    await initializeDataFile();
    
    logger('info', `Attempting to read profiles from: ${PROFILES_FILE}`);
    const data = await fs.readFile(PROFILES_FILE, 'utf8');
    const profiles = JSON.parse(data);
    logger('info', `Loaded ${profiles.length} profiles from file`);
    return profiles;
  } catch (error) {
    logger('error', `Error loading profiles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    logger('info', `Returning empty array for profiles`);
    return [];
  }
}

async function saveProfile(walletAddress: string, verificationData: any, provider: string = 'self') {
  try {
    logger('info', `=== SAVING PROFILE FOR WALLET: ${walletAddress} ===`);
    logger('info', `Provider: ${provider}`);
    logger('info', `Verification data keys:`, Object.keys(verificationData));
    
    // Ensure data file is initialized
    await initializeDataFile();
    
    const profiles = await loadProfiles();
    logger('info', `Current profiles count: ${profiles.length}`);
    
    // Check if wallet already exists
    const existingIndex = profiles.findIndex((p: any) => p.walletAddress === walletAddress);
    logger('info', `Existing wallet index: ${existingIndex}`);
    
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
    
    logger('info', `Created new verification object for provider: ${provider}`);
    
    if (existingIndex >= 0) {
      // Wallet exists - check if this provider verification already exists
      const existingProfile = profiles[existingIndex];
      const existingVerifications = existingProfile.verifications || [];
      
      // Check if this provider verification already exists
      const providerIndex = existingVerifications.findIndex((v: any) => v.provider === provider);
      
      if (providerIndex >= 0) {
        // Update existing verification for this provider
        existingVerifications[providerIndex] = newVerification;
        logger('info', `Updated ${provider} verification for wallet: ${walletAddress}`);
      } else {
        // Add new verification for this provider
        existingVerifications.push(newVerification);
        logger('info', `Added new ${provider} verification for wallet: ${walletAddress}`);
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
      logger('info', `Created new profile with ${provider} verification for wallet: ${walletAddress}`);
    }
    
    logger('info', `Attempting to write ${profiles.length} profiles to: ${PROFILES_FILE}`);
    const jsonData = JSON.stringify(profiles, null, 2);
    logger('info', `JSON data size: ${jsonData.length} characters`);
    
    await fs.writeFile(PROFILES_FILE, jsonData);
    logger('info', `Successfully saved profile to ${PROFILES_FILE}`);
    
    const savedProfile = profiles[existingIndex >= 0 ? existingIndex : profiles.length - 1];
    logger('info', `Returning saved profile for wallet: ${savedProfile.walletAddress}`);
    
    return savedProfile;
  } catch (error) {
    logger('error', '=== ERROR SAVING PROFILE ===');
    logger('error', 'Error type:', error instanceof Error ? error.constructor.name : 'Unknown');
    logger('error', 'Error message:', error instanceof Error ? error.message : 'Unknown error');
    logger('error', 'Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    logger('error', 'Wallet address:', walletAddress);
    logger('error', 'Provider:', provider);
    logger('error', 'PROFILES_FILE path:', PROFILES_FILE);
    logger('error', 'Current working directory:', process.cwd());
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
    logger('error', 'Error loading profile:', error);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  logger('info', `Incoming request: ${req.method} ${req.url}`);
  await cors(req, res);
  logger('info', `CORS middleware completed for: ${req.method} ${req.url}`);
  await initializeDataFile();
  logger('info', `Data file initialization completed for: ${req.method} ${req.url}`);

  logger('info', `Request details: method=${req.method}, headers=${JSON.stringify(req.headers)}, query=${JSON.stringify(req.query)}`);

  if (req.method === 'POST') {
    logger('info', 'Handling POST request');
    try {
      const { attestationId, proof, publicSignals , userContextData } = req.body;
      logger('info', 'POST body:', { attestationId, proof, publicSignals, userContextData });

      if (!attestationId || !proof || !publicSignals || !userContextData) {
        logger('error', 'Missing required POST fields', { attestationId, proof, publicSignals, userContextData });
        const response = { 
          status: 'error',
          result: false,
          reason: 'Missing required fields: attestationId, proof, pubSignals, userContextData',
          error_code: "MISSING_REQUIRED_FIELDS",
          message: 'Missing required fields: attestationId, proof, pubSignals, userContextData' 
        };
        logger('info', 'Responding:', response);
        return res.status(400).json(response);
      }

      let walletAddress: string | null = null;
      try {
        logger('info', 'Extracting wallet address from userContextData');
        const decodedData = Buffer.from(userContextData.replace('0x', ''), 'hex').toString();
        const userData = JSON.parse(decodedData.replace(/\0/g, ''));
        walletAddress = userData.walletAddress;
        logger('info', 'Extracted wallet address:', walletAddress);
      } catch (error) {
        logger('warn', 'Could not extract wallet address from userContextData', { userContextData, error });
      }

      logger('info', 'Calling selfBackendVerifier.verify');
      const result = await selfBackendVerifier.verify(attestationId, proof, publicSignals, userContextData);
      logger('info', 'Verification result:', result);

      if (!walletAddress && result.userData && result.userData.userIdentifier) {
        logger('info', 'Extracting wallet address from verification result');
        const walletId = result.userData.userIdentifier;
        if (walletId && walletId.length === 40) {
          walletAddress = '0x' + walletId;
        } else {
          walletAddress = walletId;
        }
        logger('info', 'Wallet address after extraction:', walletAddress);
      }

      if (!walletAddress && result.userData && result.userData.userDefinedData) {
        try {
          logger('info', 'Extracting wallet address from userDefinedData');
          const decodedData = Buffer.from(result.userData.userDefinedData.replace('0x', ''), 'hex').toString();
          const userData = JSON.parse(decodedData.replace(/\0/g, ''));
          if (userData.walletAddress) {
            walletAddress = userData.walletAddress;
            logger('info', 'Extracted wallet address from userDefinedData:', walletAddress);
          }
        } catch (error) {
          logger('warn', 'Error parsing userDefinedData', error);
        }
      }

      if (!walletAddress) {
        logger('warn', 'No wallet address found, verification will not be saved', { resultUserData: result.userData, attestationId });
      }

      if (result.isValidDetails.isValid) {
        let savedProfile = null;
        let saveStatus = 'No wallet address to save';
        if (walletAddress) {
          try {
            logger('info', 'Saving profile for wallet:', walletAddress);
            savedProfile = await saveProfile(walletAddress, {
              discloseOutput: result.discloseOutput,
              userData: result.userData,
              attestationId,
              isValidDetails: result.isValidDetails
            }, 'self');
            saveStatus = 'Profile saved successfully';
            logger('info', 'Profile save success');
          } catch (saveError) {
            logger('error', 'Profile save error', saveError);
            saveStatus = `Profile save failed: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`;
          }
        }
        const response = {
          status: 'success',
          result: true,
          credentialSubject: result.discloseOutput,
          userData: result.userData,
          walletAddress,
          savedProfile: saveStatus,
          saveSuccess: !!savedProfile
        };
        logger('info', 'Responding:', response);
        return res.status(200).json(response);
      } else {
        const response = {
          status: 'error',
          result: false,
          reason: 'Verification failed',
          error_code: "VERIFICATION_FAILED",
          details: result.isValidDetails
        };
        logger('info', 'Responding:', response);
        return res.status(200).json(response);
      }
    } catch (error) {
      logger('error', 'Verification error', error);
      const response = {
        status: 'error',
        result: false,
        reason: 'Internal server error',
        error_code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : 'Unknown error'
      };
      logger('info', 'Responding:', response);
      return res.status(200).json(response);
    }
  } else if (req.method === 'GET') {
    logger('info', 'Handling GET request');
    try {
      const { wallet } = req.query;
      await initializeDataFile();
      if (wallet) {
        const profile = await getProfile(wallet as string);
        if (profile) {
          logger('info', `Profile found for wallet: ${wallet}`);
          const response = { profile, message: 'Profile found' };
          logger('info', 'Responding:', response);
          return res.status(200).json(response);
        } else {
          logger('info', `No profile found for wallet: ${wallet}`);
          const response = { profile: null, message: 'No profile found for this wallet' };
          logger('info', 'Responding:', response);
          return res.status(200).json(response);
        }
      } else {
        const profiles = await loadProfiles();
        logger('info', `Returning all profiles. Count: ${profiles.length}`);
        const response = { profiles, message: 'All profiles returned' };
        logger('info', 'Responding:', response);
        return res.status(200).json(response);
      }
    } catch (error) {
      logger('error', 'Error retrieving profiles:', error);
      const response = {
        error: 'Failed to retrieve profiles',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
      logger('info', 'Responding:', response);
      return res.status(500).json(response);
    }
  } else {
    logger('info', `Method not allowed: ${req.method}`);
    const response = { message: 'Method not allowed' };
    logger('info', 'Responding:', response);
    return res.status(405).json(response);
  }
  logger('info', '=== VERIFICATION REQUEST END ===');
} 