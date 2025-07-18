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
    console.log(`Data directory exists: ${dataDir}`);
  } catch (error) {
    console.log(`Creating data directory: ${dataDir}`);
    await fs.mkdir(dataDir, { recursive: true });
    console.log(`Data directory created successfully`);
  }
}

// Initialize data file on app startup/API call
async function initializeDataFile() {
  if (isInitialized) {
    return; // Already initialized
  }
  
  try {
    console.log(`=== INITIALIZING DATA FILE ===`);
    console.log(`Current working directory: ${process.cwd()}`);
    console.log(`Profiles file path: ${PROFILES_FILE}`);
    
    await ensureDataDirectory();
    
    // Check if profiles file exists
    try {
      await fs.access(PROFILES_FILE);
      console.log(`Profiles file exists: ${PROFILES_FILE}`);
    } catch (error) {
      console.log(`Profiles file does not exist, creating it: ${PROFILES_FILE}`);
      const emptyProfiles: any[] = [];
      await fs.writeFile(PROFILES_FILE, JSON.stringify(emptyProfiles, null, 2));
      console.log(`Created new profiles file with empty array`);
    }
    
    isInitialized = true;
    console.log(`=== DATA FILE INITIALIZATION COMPLETE ===`);
  } catch (error) {
    console.error(`=== DATA FILE INITIALIZATION ERROR ===`);
    console.error('Error type:', error instanceof Error ? error.constructor.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    // Don't throw error, just log it - app should still work
  }
}

async function loadProfiles() {
  try {
    // Ensure data file is initialized
    await initializeDataFile();
    
    console.log(`Attempting to read profiles from: ${PROFILES_FILE}`);
    const data = await fs.readFile(PROFILES_FILE, 'utf8');
    const profiles = JSON.parse(data);
    console.log(`Loaded ${profiles.length} profiles from file`);
    return profiles;
  } catch (error) {
    console.error(`Error loading profiles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.log(`Returning empty array for profiles`);
    return [];
  }
}

async function saveProfile(walletAddress: string, verificationData: any, provider: string = 'self') {
  try {
    console.log(`=== SAVING PROFILE FOR WALLET: ${walletAddress} ===`);
    console.log(`Provider: ${provider}`);
    console.log(`Verification data keys:`, Object.keys(verificationData));
    
    // Ensure data file is initialized
    await initializeDataFile();
    
    const profiles = await loadProfiles();
    console.log(`Current profiles count: ${profiles.length}`);
    
    // Check if wallet already exists
    const existingIndex = profiles.findIndex((p: any) => p.walletAddress === walletAddress);
    console.log(`Existing wallet index: ${existingIndex}`);
    
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
    
    console.log(`Created new verification object for provider: ${provider}`);
    
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
    
    console.log(`Attempting to write ${profiles.length} profiles to: ${PROFILES_FILE}`);
    const jsonData = JSON.stringify(profiles, null, 2);
    console.log(`JSON data size: ${jsonData.length} characters`);
    
    await fs.writeFile(PROFILES_FILE, jsonData);
    console.log(`Successfully saved profile to ${PROFILES_FILE}`);
    
    const savedProfile = profiles[existingIndex >= 0 ? existingIndex : profiles.length - 1];
    console.log(`Returning saved profile for wallet: ${savedProfile.walletAddress}`);
    
    return savedProfile;
  } catch (error) {
    console.error('=== ERROR SAVING PROFILE ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Wallet address:', walletAddress);
    console.error('Provider:', provider);
    console.error('PROFILES_FILE path:', PROFILES_FILE);
    console.error('Current working directory:', process.cwd());
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
  
  // Initialize data file on every API call
  await initializeDataFile();
  
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

      // Extract wallet address from user context data (fallback method)
      let walletAddress: string | null = null;
      try {
        console.log("=== EXTRACTING WALLET ADDRESS FROM USER CONTEXT ===");
        console.log("userContextData:", userContextData);
        const decodedData = Buffer.from(userContextData.replace('0x', ''), 'hex').toString();
        console.log("decodedData:", decodedData);
        const userData = JSON.parse(decodedData.replace(/\0/g, ''));
        console.log("parsed userData:", userData);
        walletAddress = userData.walletAddress;
        console.log("Extracted wallet address from userContextData:", walletAddress);
      } catch (error) {
        console.error('=== ERROR EXTRACTING WALLET ADDRESS FROM USER CONTEXT ===');
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
      
      // Extract wallet address from verification result (primary method)
      if (!walletAddress && result.userData && result.userData.userIdentifier) {
        console.log("=== EXTRACTING WALLET ADDRESS FROM VERIFICATION RESULT ===");
        console.log("result.userData.userIdentifier:", result.userData.userIdentifier);
        console.log("result.userData.userDefinedData:", result.userData.userDefinedData);
        
        // Convert UUID format back to wallet address (add 0x prefix)
        const walletId = result.userData.userIdentifier;
        if (walletId && walletId.length === 40) { // Ethereum address without 0x
          walletAddress = '0x' + walletId;
          console.log("Converted UUID format to wallet address:", walletAddress);
        } else {
          walletAddress = walletId;
          console.log("Using userIdentifier as wallet address:", walletAddress);
        }
      }
      
      // If still no wallet address, try to extract from userDefinedData
      if (!walletAddress && result.userData && result.userData.userDefinedData) {
        console.log("=== EXTRACTING WALLET ADDRESS FROM USER DEFINED DATA ===");
        try {
          const decodedData = Buffer.from(result.userData.userDefinedData.replace('0x', ''), 'hex').toString();
          const userData = JSON.parse(decodedData.replace(/\0/g, ''));
          console.log("userDefinedData parsed:", userData);
          if (userData.walletAddress) {
            walletAddress = userData.walletAddress;
            console.log("Extracted wallet address from userDefinedData:", walletAddress);
          }
        } catch (error) {
          console.error("Error parsing userDefinedData:", error);
        }
      }
      
      // Final fallback - if no wallet address found, log warning
      if (!walletAddress) {
        console.warn("=== NO WALLET ADDRESS FOUND ===");
        console.warn("Available data:");
        console.warn("- result.userData:", result.userData);
        console.warn("- result.discloseOutput:", result.discloseOutput);
        console.warn("- attestationId:", attestationId);
        console.warn("This verification will not be saved to profiles.json");
      }
      
      if (result.isValidDetails.isValid) {
        let savedProfile = null;
        let saveStatus = 'No wallet address to save';
        
        // Save to profiles.json if we have a wallet address
        if (walletAddress) {
          try {
            console.log(`=== ATTEMPTING TO SAVE PROFILE ===`);
            savedProfile = await saveProfile(walletAddress, {
              discloseOutput: result.discloseOutput,
              userData: result.userData,
              attestationId,
              isValidDetails: result.isValidDetails
            }, 'self');
            saveStatus = 'Profile saved successfully';
            console.log(`=== PROFILE SAVE SUCCESS ===`);
          } catch (saveError) {
            console.error('=== PROFILE SAVE ERROR ===');
            console.error('Error saving profile, but verification was successful:', saveError);
            console.error('Error details:', saveError instanceof Error ? saveError.message : 'Unknown error');
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