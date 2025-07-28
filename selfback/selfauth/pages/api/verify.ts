// pages/api/verify.ts (Pages Router API route)
import {
  SelfBackendVerifier,
  AllIds,
  DefaultConfigStore,
  VerificationConfig,
  IConfigStorage
} from '@selfxyz/core';
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from 'redis';

// CORS middleware function
const corsMiddleware = (req: NextApiRequest, res: NextApiResponse) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
};

// Add VerificationData interface
type VerificationData = {
  timestamp: string;
  walletAddress: string | null;
  nationality: string;
  attestationId: string;
  userDefinedData: any;
  verified: boolean;
};

// Add SelfDetails interface
type SelfDetails = {
  isVerified: boolean;
  nationality: string | null;
  attestationId: string | null;
  timestamp: string | null;
  userDefinedData: any | null;
  verificationOptions: {
    minimumAge: number;
    ofac: boolean;
    excludedCountries: string[];
    nationality: boolean;
    gender: boolean;
  } | null;
};

// Redis client
let redis: any = null;

const getRedisClient = async () => {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    console.log('Connecting to Redis at:', redisUrl);
    redis = createClient({
      url: redisUrl
    });
    try {
      await redis.connect();
      console.log('Successfully connected to Redis');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw new Error('Redis connection failed. Please check your REDIS_URL environment variable.');
    }
  }
  return redis;
};

// Redis Config Store for storing verification configurations
export class RedisConfigStore implements IConfigStorage {
  async getActionId(userIdentifier: string, data: string): Promise<string> {
    return userIdentifier;
  }

  async setConfig(id: string, config: VerificationConfig): Promise<boolean> {
    const client = await getRedisClient();
    await client.set(`config_${id}`, JSON.stringify(config));
    return true;
  }

  async getConfig(id: string): Promise<VerificationConfig> {
    try {
      const client = await getRedisClient();
      const config = await client.get(`config_${id}`);
      if (!config) {
        // Return default config if no saved config found
        return verification_config;
      }
      return JSON.parse(config as string) as VerificationConfig;
    } catch (error) {
      console.log('Error getting config, returning default:', error);
      // Return default config on error
      return verification_config;
    }
  }
}

// Configure the Self backend verifier
// IMPORTANT: This config must match the frontend disclosures exactly
const verification_config = {
  minimumAge: 18,           // Minimum age requirement
  nationality: true,        // Request nationality disclosure
  gender: true,             // Request gender disclosure (must match frontend)
  excludedCountries: [],    // Exclude no countries (can add as needed)
  ofac: false,              // OFAC check (set to true if needed)
};

const configStore = new RedisConfigStore();

// Initialize the verifier with the config store
const selfBackendVerifier = new SelfBackendVerifier(
  "seasv2",                           // Scope: must match frontend
  "https://selfauth.vercel.app/api/verify", // Public API endpoint
  false,                               // Production mode (set to true for mock/testing)
  AllIds,                              // Accept all document types
  configStore,                         // Configuration store
  "hex"                               // Address type
);


const saveVerificationData = async (data: VerificationData) => {
  try {
    // Use wallet address as key, or generate a unique key if no wallet address
    const key = data.walletAddress || `verification_${Date.now()}`;
    
    // Store the verification data in Redis
    const client = await getRedisClient();
    await client.set(key, JSON.stringify(data));
    console.log('Verification data saved successfully to Redis');
  } catch (error) {
    console.error('Error saving verification data to Redis:', error);
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

export async function isWalletSelfVerified(wallet: string): Promise<boolean> {
  try {
    const client = await getRedisClient();
    const verificationData = await client.get(wallet);
    if (!verificationData) return false;
    
    const data = JSON.parse(verificationData as string) as VerificationData;
    return data.verified === true;
  } catch (error) {
    console.error('Error checking wallet verification:', error);
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apply CORS middleware
  if (corsMiddleware(req, res)) {
    return; // Preflight request handled
  }
  
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
        // Extract wallet address from user context data
        const userDefinedData = parseUserDefinedData(userContextData);
        const walletAddress = result.userData.userIdentifier;
        
        // Get configuration options (will return default if none saved)
        let saveOptions: VerificationConfig;
        try {
          saveOptions = await configStore.getConfig(
            result.userData.userIdentifier
          );
          console.log('Using saved configuration for user:', result.userData.userIdentifier);
        } catch (error) {
          console.log('Error getting config, using default configuration');
          saveOptions = verification_config;
        }
        
        // Create filtered subject based on verification result
        const filteredSubject = { ...result.discloseOutput };
        
        // Create verification data object
        const verificationData: VerificationData = {
          timestamp: new Date().toISOString(),
          walletAddress: walletAddress,
          nationality: filteredSubject.nationality || "Not disclosed",
          attestationId: attestationId,
          userDefinedData: userDefinedData,
          verified: true,
        };
        
        // Save the verification data
        await saveVerificationData(verificationData);
        
        const response: any = {
          status: "success",
          result: true,
          credentialSubject: filteredSubject,
          verificationOptions: {
            minimumAge: saveOptions.minimumAge,
            ofac: saveOptions.ofac,
            excludedCountries: saveOptions.excludedCountries,
          },
        };
        
        return res.status(200).json(response);
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
      // Improved error handling for clarity
      return res.status(500).json({
        status: "error",
        result: false,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  } else if (req.method === 'GET') {
    try {
      const walletAddress = req.query.wallet;
      const walletAddressStr = Array.isArray(walletAddress) ? walletAddress[0] : walletAddress;
      let selfDetails: SelfDetails = { 
        isVerified: false,
        nationality: null,
        attestationId: null,
        timestamp: null,
        userDefinedData: null,
        verificationOptions: null
      };
      let providers: string[] = [];
      let isValid = false;
      let verified = false;
      let profileIcons: { [provider: string]: string } = { GoodDollar: '❌', Self: '❌' };
      
      if (!walletAddressStr) {
        return res.status(200).json({
          profile: {
            isValid: false,
            providers: [],
            icons: profileIcons
          },
          verified: false,
          gooddollar: { isVerified: false },
          self: selfDetails
        });
      }
      
      // Get verification data from Redis
      const client = await getRedisClient();
      const verificationData = await client.get(walletAddressStr);
      if (verificationData) {
        const data = JSON.parse(verificationData as string) as VerificationData;
        if (data.verified) {
          // Get user's verification configuration
          let userConfig: any = verification_config;
          try {
            userConfig = await configStore.getConfig(walletAddressStr);
          } catch (error) {
            console.log('Using default config for user:', walletAddressStr);
          }
          
          selfDetails = { 
            isVerified: true,
            nationality: data.nationality,
            attestationId: data.attestationId,
            timestamp: data.timestamp,
            userDefinedData: data.userDefinedData,
            verificationOptions: {
              minimumAge: (userConfig as any).minimumAge || verification_config.minimumAge,
              ofac: (userConfig as any).ofac || verification_config.ofac,
              excludedCountries: (userConfig as any).excludedCountries || verification_config.excludedCountries,
              nationality: (userConfig as any).nationality || verification_config.nationality,
              gender: (userConfig as any).gender || verification_config.gender
            }
          };
          providers.push('Self');
          isValid = true;
          verified = true;
          profileIcons.Self = '✅';
        }
      }
      
      // GoodDollar always ❌ in this endpoint (no on-chain check)
      return res.status(200).json({
        profile: {
          isValid,
          providers,
          icons: profileIcons
        },
        verified,
        gooddollar: { isVerified: false },
        self: selfDetails
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