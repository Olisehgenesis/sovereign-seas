// utils/divvi.ts - Divvi Integration Utility Functions

// Lazy import Divvi SDK to avoid loading it for read-only operations
// This prevents dynamic import errors in production builds
let divviSDK: { getReferralTag: (params: { user: Address; consumer: Address }) => string; submitReferral: (params: { txHash: `0x${string}`; chainId: number }) => Promise<void> } | null = null;

const loadDivviSDK = async () => {
  if (divviSDK) return divviSDK;
  
  try {
    const { getReferralTag, submitReferral } = await import('@divvi/referral-sdk');
    divviSDK = { getReferralTag, submitReferral };
    return divviSDK;
  } catch (error) {
    console.warn('Divvi SDK not available:', error);
    return null;
  }
};

import { Interface } from 'ethers';
import type { Address } from 'viem';

// Divvi Integration Configuration
export const DIVVI_CONSUMER_ADDRESS = '0x53eaF4CD171842d8144e45211308e5D90B4b0088' as const;

// Get chain ID based on environment
export const getChainId = (): number => {
  const isTestnet = import.meta.env.VITE_ENV === 'testnet';
  return isTestnet ? 44787 : 42220; // Alfajores testnet : Celo mainnet
};

// Generate referral tag for a user (lazy loaded)
export const generateReferralTag = async (userAddress: Address): Promise<string> => {
  const sdk = await loadDivviSDK();
  if (!sdk) {
    console.warn('Divvi SDK not available, skipping referral tag generation');
    return '';
  }
  
  return sdk.getReferralTag({
    user: userAddress,
    consumer: DIVVI_CONSUMER_ADDRESS,
  });
};

// Submit referral to Divvi (lazy loaded)
export const submitReferralToDivvi = async (txHash: string, chainId?: number): Promise<void> => {
  try {
    const sdk = await loadDivviSDK();
    if (!sdk) {
      console.warn('Divvi SDK not available, skipping referral submission');
      return;
    }
    
    await sdk.submitReferral({
      txHash: txHash as `0x${string}`,
      chainId: chainId || getChainId()
    });
    console.log('✅ Referral submitted successfully to Divvi');
  } catch (error) {
    console.error('❌ Referral submission error:', error);
    // Don't throw error to avoid breaking the main transaction flow
  }
};

// Enhanced transaction wrapper with Divvi integration
export const executeTransactionWithDivvi = async (
  contractAddress: Address,
  abi: any,
  functionName: string,
  args: any[],
  userAddress: Address,
  sendTransactionAsync: (params: any) => Promise<string>,
  additionalParams: {
    value?: bigint;
    account?: Address;
  } = {}
): Promise<string> => {
  try {
    // Encode function data
    const contractInterface = new Interface(abi);
    const functionData = contractInterface.encodeFunctionData(functionName, args);
    
    // Generate referral tag (now async)
    const referralTag = await generateReferralTag(userAddress);
    const dataWithSuffix = referralTag ? functionData + referralTag : functionData;
    
    // Execute transaction
    const txHash = await sendTransactionAsync({
      to: contractAddress,
      data: dataWithSuffix as `0x${string}`,
      ...additionalParams
    });
    
    if (!txHash) {
      throw new Error('Transaction failed to send');
    }
    
    // Submit referral to Divvi
    await submitReferralToDivvi(txHash);
    
    return txHash;
  } catch (error) {
    console.error('❌ Error in executeTransactionWithDivvi:', error);
    throw error;
  }
};

// Utility for writeContract with Divvi integration
export const writeContractWithDivvi = async (
  contractAddress: Address,
  abi: any,
  functionName: string,
  args: any[],
  userAddress: Address,
  writeContract: (params: any) => Promise<string>,
  additionalParams: {
    value?: bigint;
    account?: Address;
  } = {}
): Promise<string> => {
  try {
    // For writeContract, we need to modify the data field
    const contractInterface = new Interface(abi);
    const functionData = contractInterface.encodeFunctionData(functionName, args);
    
    // Generate referral tag (now async)
    const referralTag = await generateReferralTag(userAddress);
    const dataWithSuffix = referralTag ? functionData + referralTag : functionData;
    
    // Execute transaction
    const txHash = await writeContract({
      address: contractAddress,
      abi,
      functionName,
      args,
      data: dataWithSuffix as `0x${string}`,
      ...additionalParams
    });
    
    // Submit referral to Divvi
    await submitReferralToDivvi(txHash);
    
    return txHash;
  } catch (error) {
    console.error('❌ Error in writeContractWithDivvi:', error);
    throw error;
  }
};

// Logging utility for Divvi operations
export const logDivviOperation = (operation: string, data: any, type: 'info' | 'error' | 'success' = 'info') => {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    operation: `DIVVI_${operation}`,
    data
  };

  switch (type) {
    case 'error':
      console.error('🔴', logData);
      break;
    case 'success':
      console.log('🟢', logData);
      break;
    default:
      console.log('🔵', logData);
  }
};

// Validation utility for Divvi parameters
export const validateDivviParams = (userAddress: Address): { isValid: boolean; error?: string } => {
  if (!userAddress) {
    return { isValid: false, error: 'User address is required for Divvi integration' };
  }
  
  if (userAddress === '0x0000000000000000000000000000000000000000') {
    return { isValid: false, error: 'Invalid user address for Divvi integration' };
  }
  
  return { isValid: true };
};

// Hook wrapper for Divvi integration
export const withDivviIntegration = <T extends (...args: any[]) => Promise<any>>(
  originalFunction: T,
  operationName: string
): T => {
  return (async (...args: any[]) => {
    try {
      logDivviOperation(`${operationName}_START`, { args });
      const result = await originalFunction(...args);
      logDivviOperation(`${operationName}_SUCCESS`, { result }, 'success');
      return result;
    } catch (error) {
      logDivviOperation(`${operationName}_ERROR`, { error }, 'error');
      throw error;
    }
  }) as T;
};

// Export all utilities
export default {
  DIVVI_CONSUMER_ADDRESS,
  getChainId,
  generateReferralTag,
  submitReferralToDivvi,
  executeTransactionWithDivvi,
  writeContractWithDivvi,
  logDivviOperation,
  validateDivviParams,
  withDivviIntegration
};
