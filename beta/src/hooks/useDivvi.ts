import { useCallback, useEffect, useState } from 'react'
import { useAccount, useChainId, useWalletClient } from 'wagmi'
import { Address } from 'viem'

// Divvi configuration
const DIVVI_CONSUMER_ADDRESS = '0x53eaF4CD171842d8144e45211308e5D90B4b0088' // Your Divvi Identifier
const DIVVI_IDENTIFIER = 'sovseas.divvi.xyz'

// Types for Divvi integration
export interface DivviReferralData {
  user: Address
  consumer: Address
  referralTag: string
}

export interface DivviTransactionData {
  txHash: string
  chainId: number
  referralTag: string
}

export interface DivviConfig {
  consumerAddress: Address
  identifier: string
  enabled: boolean
}

// Divvi integration hook
export function useDivvi() {
  const { address: userAddress } = useAccount()
  const chainId = useChainId()
  const { data: walletClient } = useWalletClient()
  const [isDivviAvailable, setIsDivviAvailable] = useState(false)

  // Check if Divvi SDK is available
  useEffect(() => {
    const checkDivviAvailability = async () => {
      try {
        // Dynamic import to check if SDK is available
        const { getReferralTag, submitReferral } = await import('@divvi/referral-sdk')
        setIsDivviAvailable(true)
      } catch (error) {
        console.warn('Divvi SDK not available:', error)
        setIsDivviAvailable(false)
      }
    }

    checkDivviAvailability()
  }, [])

  // Generate referral tag for a user
  const generateReferralTag = useCallback(async (user?: Address): Promise<string | null> => {
    if (!isDivviAvailable || !user) return null

    try {
      const { getReferralTag } = await import('@divvi/referral-sdk')
      
      const referralTag = getReferralTag({
        user: user,
        consumer: DIVVI_CONSUMER_ADDRESS as Address,
      })

      return referralTag
    } catch (error) {
      console.error('Error generating Divvi referral tag:', error)
      return null
    }
  }, [isDivviAvailable])

  // Submit referral to Divvi
  const submitReferral = useCallback(async (txHash: string, chainId?: number): Promise<boolean> => {
    if (!isDivviAvailable) return false

    try {
      const { submitReferral: submitDivviReferral } = await import('@divvi/referral-sdk')
      
      await submitDivviReferral({
        txHash,
        chainId: chainId || chainId,
      })

      console.log('Divvi referral submitted successfully:', txHash)
      return true
    } catch (error) {
      console.error('Error submitting Divvi referral:', error)
      return false
    }
  }, [isDivviAvailable, chainId])

  // Enhanced transaction function with Divvi tracking
  const sendTransactionWithDivvi = useCallback(async (
    transactionData: {
      to: Address
      data: `0x${string}`
      value?: bigint
      gas?: bigint
      gasPrice?: bigint
      maxFeePerGas?: bigint
      maxPriorityFeePerGas?: bigint
    }
  ): Promise<string | null> => {
    if (!walletClient || !userAddress) {
      throw new Error('Wallet not connected')
    }

    try {
      // Generate referral tag
      const referralTag = await generateReferralTag(userAddress)
      
      // Append referral tag to transaction data
      const enhancedData = referralTag 
        ? (transactionData.data + referralTag) as `0x${string}`
        : transactionData.data

      // Send transaction
      const txHash = await walletClient.sendTransaction({
        account: userAddress,
        to: transactionData.to,
        data: enhancedData,
        value: transactionData.value || 0n,
        gas: transactionData.gas,
        gasPrice: transactionData.gasPrice,
        maxFeePerGas: transactionData.maxFeePerGas,
        maxPriorityFeePerGas: transactionData.maxPriorityFeePerGas,
      })

      // Submit referral to Divvi
      if (referralTag) {
        await submitReferral(txHash, chainId)
      }

      return txHash
    } catch (error) {
      console.error('Error sending transaction with Divvi:', error)
      throw error
    }
  }, [walletClient, userAddress, generateReferralTag, submitReferral, chainId])

  // Get Divvi configuration
  const getDivviConfig = useCallback((): DivviConfig => ({
    consumerAddress: DIVVI_CONSUMER_ADDRESS as Address,
    identifier: DIVVI_IDENTIFIER,
    enabled: isDivviAvailable
  }), [isDivviAvailable])

  return {
    // Core functions
    generateReferralTag,
    submitReferral,
    sendTransactionWithDivvi,
    getDivviConfig,
    
    // State
    isDivviAvailable,
    userAddress,
    chainId,
    
    // Constants
    DIVVI_CONSUMER_ADDRESS,
    DIVVI_IDENTIFIER
  }
}

// Hook for tracking specific contract interactions
export function useDivviContractInteraction(contractAddress: Address) {
  const divvi = useDivvi()
  const { address: userAddress } = useAccount()

  const trackContractInteraction = useCallback(async (
    functionName: string,
    args: any[],
    value?: bigint
  ): Promise<string | null> => {
    if (!divvi.isDivviAvailable || !userAddress) {
      console.warn('Divvi not available or user not connected')
      return null
    }

    try {
      // Generate referral tag
      const referralTag = await divvi.generateReferralTag(userAddress)
      
      if (!referralTag) {
        console.warn('Could not generate Divvi referral tag')
        return null
      }

      // This would be used with your contract write functions
      // The actual implementation depends on your contract interaction pattern
      console.log(`Tracking ${functionName} interaction with Divvi:`, {
        contractAddress,
        functionName,
        args,
        referralTag
      })

      return referralTag
    } catch (error) {
      console.error('Error tracking contract interaction with Divvi:', error)
      return null
    }
  }, [divvi, userAddress, contractAddress])

  return {
    trackContractInteraction,
    isDivviAvailable: divvi.isDivviAvailable,
    userAddress,
    contractAddress
  }
}

// Utility function to add Divvi tracking to existing transaction data
export function addDivviTrackingToTransactionData(
  originalData: `0x${string}`,
  referralTag: string
): `0x${string}` {
  return (originalData + referralTag) as `0x${string}`
}

// Utility function to check if a transaction has Divvi tracking
export function hasDivviTracking(transactionData: string): boolean {
  // Check if the transaction data contains a Divvi referral tag
  // This is a simple check - you might want to make it more sophisticated
  return transactionData.length > 66 && transactionData.endsWith('0x')
}

// Export default for convenience
export default useDivvi
