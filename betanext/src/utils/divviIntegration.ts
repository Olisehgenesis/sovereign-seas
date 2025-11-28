import type { Address } from 'viem'

// Divvi configuration
export const DIVVI_CONFIG = {
  CONSUMER_ADDRESS: '0x53eaF4CD171842d8144e45211308e5D90B4b0088' as Address,
  IDENTIFIER: 'sovseas.divvi.xyz',
  ENABLED: true
} as const

// Types
export interface DivviTransactionResult {
  txHash: string
  referralTag: string
  success: boolean
  error?: string
}

export interface DivviIntegrationOptions {
  trackTransaction?: boolean
  userAddress?: Address
  chainId?: number
}

// Divvi integration class
export class DivviIntegration {
  private static instance: DivviIntegration
  private isSDKAvailable: boolean = false
  private sdk: any = null

  private constructor() {
    this.initializeSDK()
  }

  public static getInstance(): DivviIntegration {
    if (!DivviIntegration.instance) {
      DivviIntegration.instance = new DivviIntegration()
    }
    return DivviIntegration.instance
  }

  private async initializeSDK() {
    try {
      const { getReferralTag, submitReferral } = await import('@divvi/referral-sdk')
      this.sdk = { getReferralTag, submitReferral }
      this.isSDKAvailable = true
      console.log('Divvi SDK initialized successfully')
    } catch (error) {
      console.warn('Divvi SDK not available:', error)
      this.isSDKAvailable = false
    }
  }

  public isAvailable(): boolean {
    return this.isSDKAvailable && DIVVI_CONFIG.ENABLED
  }

  public async generateReferralTag(userAddress: Address): Promise<string | null> {
    if (!this.isAvailable() || !this.sdk) {
      console.warn('Divvi SDK not available')
      return null
    }

    try {
      const referralTag = this.sdk.getReferralTag({
        user: userAddress,
        consumer: DIVVI_CONFIG.CONSUMER_ADDRESS,
      })

      console.log('Generated Divvi referral tag:', referralTag)
      return referralTag
    } catch (error) {
      console.error('Error generating Divvi referral tag:', error)
      return null
    }
  }

  public async submitReferral(txHash: string, chainId: number): Promise<boolean> {
    if (!this.isAvailable() || !this.sdk) {
      console.warn('Divvi SDK not available')
      return false
    }

    try {
      await this.sdk.submitReferral({
        txHash,
        chainId,
      })

      console.log('Divvi referral submitted successfully:', txHash)
      return true
    } catch (error) {
      console.error('Error submitting Divvi referral:', error)
      return false
    }
  }

  public addReferralTagToData(originalData: `0x${string}`, referralTag: string): `0x${string}` {
    return (originalData + referralTag) as `0x${string}`
  }

  public async trackTransaction(
    txHash: string,
    chainId: number,
    userAddress?: Address
  ): Promise<boolean> {
    if (!userAddress) {
      console.warn('User address required for Divvi tracking')
      return false
    }

    return await this.submitReferral(txHash, chainId)
  }

  public getConfig() {
    return {
      ...DIVVI_CONFIG,
      isAvailable: this.isAvailable()
    }
  }
}

// Utility functions
export const divviUtils = {
  // Get Divvi instance
  getInstance: () => DivviIntegration.getInstance(),

  // Quick referral tag generation
  async generateTag(userAddress: Address): Promise<string | null> {
    const divvi = DivviIntegration.getInstance()
    return await divvi.generateReferralTag(userAddress)
  },

  // Quick referral submission
  async submitReferral(txHash: string, chainId: number): Promise<boolean> {
    const divvi = DivviIntegration.getInstance()
    return await divvi.submitReferral(txHash, chainId)
  },

  // Add referral tag to transaction data
  addTagToData(originalData: `0x${string}`, userAddress: Address): Promise<`0x${string}`> {
    return new Promise(async (resolve) => {
      const divvi = DivviIntegration.getInstance()
      const referralTag = await divvi.generateReferralTag(userAddress)
      
      if (referralTag) {
        resolve(divvi.addReferralTagToData(originalData, referralTag))
      } else {
        resolve(originalData)
      }
    })
  },

  // Check if Divvi is available
  isAvailable(): boolean {
    const divvi = DivviIntegration.getInstance()
    return divvi.isAvailable()
  },

  // Get configuration
  getConfig() {
    const divvi = DivviIntegration.getInstance()
    return divvi.getConfig()
  }
}

// Hook for React components
export function useDivviIntegration() {
  const divvi = DivviIntegration.getInstance()

  return {
    isAvailable: divvi.isAvailable(),
    generateReferralTag: divvi.generateReferralTag.bind(divvi),
    submitReferral: divvi.submitReferral.bind(divvi),
    addReferralTagToData: divvi.addReferralTagToData.bind(divvi),
    trackTransaction: divvi.trackTransaction.bind(divvi),
    config: divvi.getConfig()
  }
}

// Enhanced transaction wrapper
export async function withDivviTracking<T>(
  transactionFn: () => Promise<T>,
  userAddress: Address,
  chainId: number,
  options: DivviIntegrationOptions = {}
): Promise<DivviTransactionResult> {
  const divvi = DivviIntegration.getInstance()

  if (!divvi.isAvailable()) {
    console.warn('Divvi not available, proceeding without tracking', options)
    const result = await transactionFn()
    return {
      txHash: result as string,
      referralTag: '',
      success: true
    }
  }

  try {
    // Generate referral tag
    const referralTag = await divvi.generateReferralTag(userAddress)
    
    // Execute transaction
    const result = await transactionFn()
    
    // Submit referral
    if (referralTag && typeof result === 'string') {
      await divvi.submitReferral(result, chainId)
    }

    return {
      txHash: result as string,
      referralTag: referralTag || '',
      success: true
    }
  } catch (error) {
    console.error('Error in Divvi-tracked transaction:', error)
    return {
      txHash: '',
      referralTag: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export default DivviIntegration
