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
  await cors(req, res);
  
  // Initialize data file on every API call
  await initializeDataFile();
  
  logger('info', "=== VERIFICATION REQUEST START ===");
  logger('info', "Method:", req.method);
  logger('info', "Headers:", req.headers);
  logger('info', "Body:", req.body);
  logger('info', "Query:", req.query);
  logger('info', "Timestamp:", new Date().toISOString());

  if (req.method === 'POST') {
    try {
      const { attestationId, proof, pubSignals, userContextData } = req.body;
      logger('info', "attestationId", attestationId);
      logger('info', "proof", proof);
      logger('info', "pubSignals", pubSignals);
      logger('info', "userContextData", userContextData);

      if (!attestationId || !proof || !pubSignals || !userContextData) {
        logger('error', "=== MISSING REQUIRED FIELDS ===");
        logger('error', "attestationId:", !!attestationId, attestationId);
        logger('error', "proof:", !!proof, proof ? "present" : "missing");
        logger('error', "pubSignals:", !!pubSignals, pubSignals ? "present" : "missing");
        logger('error', "userContextData:", !!userContextData, userContextData);
        return res.status(400).json({ 
          status: 'error',
          result: false,
          reason: 'Missing required fields: attestationId, proof, pubSignals, userContextData',
          error_code: "MISSING_REQUIRED_FIELDS",
          message: 'Missing required fields: attestationId, proof, pubSignals, userContextData' 
        });
      }

      // Extract wallet address from user context data (fallback method)
      let walletAddress: string | null = null;
      try {
        logger('info', "=== EXTRACTING WALLET ADDRESS FROM USER CONTEXT ===");
        logger('info', "userContextData:", userContextData);
        const decodedData = Buffer.from(userContextData.replace('0x', ''), 'hex').toString();
        logger('info', "decodedData:", decodedData);
        const userData = JSON.parse(decodedData.replace(/\0/g, ''));
        logger('info', "parsed userData:", userData);
        walletAddress = userData.walletAddress;
        logger('info', "Extracted wallet address from userContextData:", walletAddress);
      } catch (error) {
        logger('error', '=== ERROR EXTRACTING WALLET ADDRESS FROM USER CONTEXT ===');
        logger('error', 'userContextData:', userContextData);
        logger('error', 'Error:', error);
        logger('warn', 'Could not extract wallet address from user context data');
      }

      // Verify the proof
      logger('info', "=== STARTING VERIFICATION ===");
      logger('info', "attestationId:", attestationId);
      logger('info', "proof length:", proof ? Object.keys(proof).length : "no proof");
      logger('info', "pubSignals length:", pubSignals ? pubSignals.length : "no pubSignals");
      logger('info', "userContextData length:", userContextData ? userContextData.length : "no userContextData");
      
      const result = await selfBackendVerifier.verify(
        attestationId,
        proof,
        pubSignals,
        userContextData
      );
      
      logger('info', "=== VERIFICATION RESULT ===");
      logger('info', "result.isValidDetails:", result.isValidDetails);
      logger('info', "result.isValidDetails.isValid:", result.isValidDetails.isValid);
      logger('info', "result.userData:", result.userData);
      logger('info', "result.discloseOutput:", result.discloseOutput);
      
      // Extract wallet address from verification result (primary method)
      if (!walletAddress && result.userData && result.userData.userIdentifier) {
        logger('info', "=== EXTRACTING WALLET ADDRESS FROM VERIFICATION RESULT ===");
        logger('info', "result.userData.userIdentifier:", result.userData.userIdentifier);
        logger('info', "result.userData.userDefinedData:", result.userData.userDefinedData);
        
        // Convert UUID format back to wallet address (add 0x prefix)
        const walletId = result.userData.userIdentifier;
        if (walletId && walletId.length === 40) { // Ethereum address without 0x
          walletAddress = '0x' + walletId;
          logger('info', "Converted UUID format to wallet address:", walletAddress);
        } else {
          walletAddress = walletId;
          logger('info', "Using userIdentifier as wallet address:", walletAddress);
        }
      }
      
      // If still no wallet address, try to extract from userDefinedData
      if (!walletAddress && result.userData && result.userData.userDefinedData) {
        logger('info', "=== EXTRACTING WALLET ADDRESS FROM USER DEFINED DATA ===");
        try {
          const decodedData = Buffer.from(result.userData.userDefinedData.replace('0x', ''), 'hex').toString();
          const userData = JSON.parse(decodedData.replace(/\0/g, ''));
          logger('info', "userDefinedData parsed:", userData);
          if (userData.walletAddress) {
            walletAddress = userData.walletAddress;
            logger('info', "Extracted wallet address from userDefinedData:", walletAddress);
          }
        } catch (error) {
          logger('error', "Error parsing userDefinedData:", error);
        }
      }
      
      // Final fallback - if no wallet address found, log warning
      if (!walletAddress) {
        logger('warn', "=== NO WALLET ADDRESS FOUND ===");
        logger('warn', "Available data:");
        logger('warn', "- result.userData:", result.userData);
        logger('warn', "- result.discloseOutput:", result.discloseOutput);
        logger('warn', "- attestationId:", attestationId);
        logger('warn', "This verification will not be saved to profiles.json");
      }
      
      if (result.isValidDetails.isValid) {
        let savedProfile = null;
        let saveStatus = 'No wallet address to save';
        
        // Save to profiles.json if we have a wallet address
        if (walletAddress) {
          try {
            logger('info', `=== ATTEMPTING TO SAVE PROFILE ===`);
            savedProfile = await saveProfile(walletAddress, {
              discloseOutput: result.discloseOutput,
              userData: result.userData,
              attestationId,
              isValidDetails: result.isValidDetails
            }, 'self');
            saveStatus = 'Profile saved successfully';
            logger('info', `=== PROFILE SAVE SUCCESS ===`);
          } catch (saveError) {
            logger('error', '=== PROFILE SAVE ERROR ===');
            logger('error', 'Error saving profile, but verification was successful:', saveError);
            logger('error', 'Error details:', saveError instanceof Error ? saveError.message : 'Unknown error');
            saveStatus = `Profile save failed: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`;
            // Continue with successful response even if save failed
          }
        }

        return res.status(200).json({
          status: 'success',
          result: true,
          credentialSubject: result.discloseOutput,
          userData: result.userData,
          walletAddress,
          savedProfile: saveStatus,
          saveSuccess: !!savedProfile
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
      logger('error', '=== VERIFICATION ERROR ===');
      logger('error', 'Error type:', error instanceof Error ? error.constructor.name : 'Unknown');
      logger('error', 'Error message:', error instanceof Error ? error.message : 'Unknown error');
      logger('error', 'Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      logger('error', 'Full error object:', error);
      logger('error', 'Timestamp:', new Date().toISOString());

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
      await initializeDataFile(); // Ensure file exists

      if (wallet) {
        // Get specific wallet profile
        const profile = await getProfile(wallet as string);
        if (profile) {
          logger('info', `Profile found for wallet: ${wallet}`);
          return res.status(200).json({ profile, message: 'Profile found' });
        } else {
          logger('info', `No profile found for wallet: ${wallet}`);
          return res.status(200).json({ profile: null, message: 'No profile found for this wallet' });
        }
      } else {
        // Get all profiles
        const profiles = await loadProfiles();
        logger('info', `Returning all profiles. Count: ${profiles.length}`);
        return res.status(200).json({ profiles, message: 'All profiles returned' });
      }
    } catch (error) {
      logger('error', 'Error retrieving profiles:', error);
      return res.status(500).json({ 
        error: 'Failed to retrieve profiles',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } 
  
  else {
    logger('info', "=== METHOD NOT ALLOWED ===");
    logger('info', "Method:", req.method);
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  logger('info', "=== VERIFICATION REQUEST END ===");
} 