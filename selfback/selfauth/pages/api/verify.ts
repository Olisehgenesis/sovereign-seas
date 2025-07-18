// pages/api/verify.ts or app/api/verify/route.ts (depending on your Next.js version)
import { NextRequest, NextResponse } from 'next/server';
import { SelfBackendVerifier, DefaultConfigStore, AllIds } from '@selfxyz/core';
import fs from 'fs';
import path from 'path';

// Configure the Self backend verifier
const configStore = new DefaultConfigStore({
  // No minimum age requirement - just verify human and get country
  excludedCountries: [], // No country restrictions
  ofac: false // No OFAC checking needed for basic verification
});

const verifier = new SelfBackendVerifier(
  'sovereign-seas', // Same scope as frontend
  'https://auth.sovseatests.xyz/api/verify',
  false, // Production mode (set to true for development)
  AllIds, // Accept all document types
  configStore,
  'uuid' // User ID type matches frontend (hex for wallet addresses)
);

// Data storage structure
interface VerificationData {
  timestamp: string;
  walletAddress: string;
  nationality: string;
  attestationId: string;
  userDefinedData: any;
  verified: boolean;
}

// Save verification data to file
const saveVerificationData = async (data: VerificationData) => {
  const dataDir = path.join(process.cwd(), 'data');
  const filePath = path.join(dataDir, 'verifications.json');
  
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  let existingData: VerificationData[] = [];
  
  // Read existing data if file exists
  if (fs.existsSync(filePath)) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      existingData = JSON.parse(fileContent);
    } catch (error) {
      console.error('Error reading existing data:', error);
    }
  }
  
  // Add new verification
  existingData.push(data);
  
  // Save back to file
  try {
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
    console.log('Verification data saved successfully');
  } catch (error) {
    console.error('Error saving verification data:', error);
    throw error;
  }
};

// Parse user defined data
const parseUserDefinedData = (hexData: string) => {
  try {
    // Remove padding and convert from hex
    const cleanHex = hexData.replace(/0+$/, '');
    const jsonString = Buffer.from(cleanHex, 'hex').toString('utf8');
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error parsing user defined data:', error);
    return null;
  }
};

// Handle POST request for verification
export async function POST(request: NextRequest) {
  try {
    const { attestationId, proof, pubSignals, userContextData } = await request.json();
    
    console.log('Received verification request:', {
      attestationId,
      hasProof: !!proof,
      hasPubSignals: !!pubSignals,
      hasUserContextData: !!userContextData
    });
    
    // Verify the proof using Self protocol
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
      // Parse user defined data to get wallet address
      const userDefinedData = parseUserDefinedData(userContextData.userDefinedData || '');
      // 'userId' does not exist on type 'GenericDiscloseOutput', so only use connectedWallet
      const walletAddress = userDefinedData?.connectedWallet || null;
      
      // Prepare verification data
      const verificationData: VerificationData = {
        timestamp: new Date().toISOString(),
        walletAddress: walletAddress,
        nationality: result.discloseOutput?.nationality || 'Unknown',
        attestationId: attestationId,
        userDefinedData: userDefinedData,
        verified: true
      };
      
      // Save verification data
      await saveVerificationData(verificationData);
      
      return NextResponse.json({ 
        verified: true,
        nationality: result.discloseOutput?.nationality,
        walletAddress: walletAddress,
        timestamp: verificationData.timestamp
      });
    } else {
      console.log('Verification failed:', result.isValidDetails);
      return NextResponse.json({ 
        verified: false,
        error: 'Verification failed'
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ 
      verified: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Optional: Handle GET request to retrieve verification data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    
    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'verifications.json');
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ verifications: [] });
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const verifications: VerificationData[] = JSON.parse(fileContent);
    
    // Filter by wallet address if provided
    const filteredVerifications = walletAddress 
      ? verifications.filter(v => v.walletAddress.toLowerCase() === walletAddress.toLowerCase())
      : verifications;
    
    return NextResponse.json({ 
      verifications: filteredVerifications,
      total: filteredVerifications.length
    });
    
  } catch (error) {
    console.error('Error retrieving verification data:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}