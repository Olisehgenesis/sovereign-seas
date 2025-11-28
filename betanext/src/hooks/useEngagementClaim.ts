import { useCallback, useMemo, useState } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { REWARDS_CONTRACT, EngagementRewardsSDK } from '@goodsdks/engagement-sdk'
import { useSearchParams } from 'next/navigation'
import { useWallets } from '@privy-io/react-auth'
import { createPublicClient, http } from 'viem'
import { celo } from 'viem/chains'

type ClaimStatus = 'idle' | 'connecting' | 'signing' | 'waiting_for_app' | 'claiming' | 'success' | 'error'

export function useEngagementClaim() {
  const { address, isConnected } = useAccount()
  const { data: wagmiWalletClient } = useWalletClient()
  const { wallets, ready: walletsReady } = useWallets()
  const [status, setStatus] = useState<ClaimStatus>('idle')
  const [error, setError] = useState<string>('')
  const [txHash, setTxHash] = useState<string>('')
  const searchParams = useSearchParams()

  const apiBase = useMemo(() => 'https://selfauth.vercel.app', [])
  const APP_ADDRESS = '0x53eaF4CD171842d8144e45211308e5D90B4b0088'
  
  // Get the primary wallet from Privy
  const primaryWallet = wallets?.[0]
  const walletAddress = primaryWallet?.address || address
  const isWalletReady = walletsReady && (primaryWallet || isConnected)
  
  // Use Wagmi wallet client (which works with Privy)
  const walletClient = wagmiWalletClient
  
  // Create Viem clients directly
  const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet'
  const chain = isTestnet ? celo : celo
  
  const publicClient = useMemo(() => {
    return createPublicClient({
      chain,
      transport: http()
    })
  }, [chain])
  
  // Create SDK instance directly with Viem clients
  const engagementRewards = useMemo(() => {
    if (!publicClient || !walletClient) return null
    
    try {
      return new EngagementRewardsSDK(
        publicClient as any,
        walletClient as any,
        REWARDS_CONTRACT
      )
    } catch (error) {
      console.error('Failed to create EngagementRewardsSDK:', error)
      return null
    }
  }, [publicClient, walletClient])
  
  // Get inviter from URL params or use default
  const inviterFromUrl = searchParams?.get('referral')
  const INVITER: `0x${string}` = (inviterFromUrl && inviterFromUrl.startsWith('0x') && inviterFromUrl.length === 42) 
    ? inviterFromUrl as `0x${string}` 
    : '0xB8f936be2B12406391B4232647593Cdb62dF2203'

  const claim = useCallback(async () => {
    try {
      setError('')
      setTxHash('')
      
      console.log('Claim attempt - Debug info:', {
        isConnected,
        address,
        walletClient: !!walletClient,
        publicClient: !!publicClient,
        engagementRewards: !!engagementRewards,
        APP_ADDRESS,
        walletsReady,
        walletsCount: wallets?.length || 0,
        primaryWallet: !!primaryWallet,
        walletAddress,
        isWalletReady,
        chain: chain.name,
        isTestnet
      })
      
      if (!isWalletReady) {
        setStatus('connecting')
        throw new Error('Wallet is not ready. Please wait a moment.')
      }
      if (!walletAddress) {
        console.error('No wallet address available:', { 
          isConnected, 
          address, 
          primaryWallet: !!primaryWallet,
          walletAddress,
          walletsReady 
        })
        throw new Error('Wallet address not available. Please reconnect your wallet.')
      }
      if (!publicClient) {
        console.error('Public client not ready:', publicClient)
        throw new Error('Public client not ready. Please wait a moment.')
      }
      if (!walletClient) {
        console.error('Wallet client not ready:', walletClient)
        throw new Error('Wallet client not ready. Please try again in a moment.')
      }
      if (!engagementRewards) {
        console.error('Engagement rewards SDK not ready:', engagementRewards)
        throw new Error('Good Dollar SDK not ready. Please try again in a moment.')
      }
      if (!APP_ADDRESS) {
        throw new Error('Missing app address')
      }

      // 1) Prepare validity window and user signature
      setStatus('signing')
      const currentBlock = await engagementRewards.getCurrentBlockNumber()
      const validUntilBlock = currentBlock + BigInt(50)
      
      // Check if app is registered and user can claim
      console.log('Checking app registration and claim eligibility...')
      try {
        const canClaim = await engagementRewards.canClaim(APP_ADDRESS, walletAddress as `0x${string}`)
        console.log('Can claim:', canClaim)
        
        if (!canClaim) {
          throw new Error('You are not eligible to claim. You may have already claimed or there may be a cooldown period.')
        }
        
        const appInfo = await engagementRewards.getAppInfo(APP_ADDRESS)
        console.log('App info:', {
          isRegistered: appInfo[7], // isRegistered field
          isApproved: appInfo[8],  // isApproved field
          description: appInfo[9],
          url: appInfo[10]
        })
      } catch (error) {
        console.warn('Failed to check app status:', error)
        if (error instanceof Error && error.message.includes('not eligible')) {
          throw error
        }
      }

      let userSignature: `0x${string}` = '0x'
      try {
        console.log('Attempting to sign claim with wallet...')
        console.log('Signing parameters:', {
          APP_ADDRESS,
          INVITER,
          validUntilBlock: validUntilBlock.toString(),
          walletAddress,
          walletClient: !!walletClient
        })
        
        userSignature = await engagementRewards.signClaim(
          APP_ADDRESS,
          INVITER,
          validUntilBlock
        )
        
        console.log('User signature successful:', userSignature ? `${userSignature.slice(0, 10)}...` : 'empty')
      } catch (signError: any) {
        console.error('User signature failed:', signError)
        throw new Error(`Failed to sign transaction: ${signError?.message || 'User rejected or wallet error'}`)
      }

      // 2) Request app signature from backend (selfauth)
      setStatus('waiting_for_app')
      console.log('Requesting app signature with:', {
        user: walletAddress,
        inviter: INVITER,
        validUntilBlock: validUntilBlock.toString(),
        apiBase
      })
      
      const resp = await fetch(`${apiBase}/api/sign-claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: walletAddress,
          inviter: INVITER,
          validUntilBlock: validUntilBlock.toString(),
        }),
      })
      
      console.log('App signature response:', {
        status: resp.status,
        ok: resp.ok,
        headers: Object.fromEntries(resp.headers.entries())
      })
      
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        console.error('App signature request failed:', err)
        throw new Error(err.error || `Failed with ${resp.status}`)
      }
      const { signature: appSignature } = await resp.json()
      
      console.log('Received app signature:', {
        appSignature: appSignature ? `${appSignature.slice(0, 10)}...` : 'null',
        userSignature: userSignature ? `${userSignature.slice(0, 10)}...` : 'null'
      })

      // 3) Submit claim
      setStatus('claiming')
      console.log('Submitting claim to contract with:', {
        APP_ADDRESS,
        INVITER,
        validUntilBlock: validUntilBlock.toString(),
        userSignature: userSignature || '0x',
        appSignature: appSignature ? `${appSignature.slice(0, 10)}...${appSignature.slice(-10)}` : 'null',
        contractAddress: REWARDS_CONTRACT
      })
      
      const receipt = await engagementRewards.nonContractAppClaim(
        APP_ADDRESS,
        INVITER,
        validUntilBlock,
        (userSignature || '0x') as `0x${string}`,
        appSignature as `0x${string}`
      )
      const hash = (receipt as any)?.transactionHash || (receipt as any)?.hash || String(receipt)
      setTxHash(hash)
      setStatus('success')
    } catch (e: any) {
      let message: string = e?.message || 'Unknown error'
      
      // Parse contract revert reasons
      if (message.includes('Claim cooldown not reached')) {
        message = 'Please wait before claiming again. There is a cooldown period between claims.'
      } else if (message.includes('not eligible')) {
        message = 'You are not eligible to claim. You may have already claimed or there may be a cooldown period.'
      } else if (message.includes('Already claimed')) {
        message = 'You have already claimed your reward for this period.'
      } else if (message.includes('Invalid app signature')) {
        message = 'App signature verification failed. The backend signature may be invalid or expired. Please try again.'
      } else if (message.includes('Expired signature')) {
        message = 'Signature has expired. Please try again.'
      } else if (message.includes('Invalid inviter')) {
        message = 'Invalid referral. Please contact support.'
      } else if (message.includes('Contract call reverted')) {
        // Extract the reason from the error message
        const reasonMatch = message.match(/reason: ([^.]+)/)
        if (reasonMatch) {
          const reason = reasonMatch[1].trim()
          if (reason.includes('cooldown')) {
            message = 'Please wait before claiming again. There is a cooldown period between claims.'
          } else if (reason.includes('already claimed')) {
            message = 'You have already claimed your reward for this period.'
          } else if (reason.includes('invalid')) {
            message = 'Invalid claim request. Please try again.'
          } else {
            message = `Claim failed: ${reason}`
          }
        } else {
          message = 'Transaction failed. Please try again.'
        }
      }
      
      // Filter and clean up other error messages
      if (message.includes('Failed to sign transaction')) {
        if (message.includes('User rejected') || message.includes('rejected')) {
          message = 'Transaction cancelled by user'
        } else if (message.includes('wallet error')) {
          message = 'Wallet error during signing. Please try again.'
        } else {
          message = 'Failed to sign transaction. Please check your wallet and try again.'
        }
      } else if (message.includes('User rejected')) {
        message = 'Transaction cancelled by user'
      } else if (message.includes('insufficient funds')) {
        message = 'Insufficient funds for transaction'
      } else if (message.includes('network')) {
        message = 'Network error. Please try again'
      } else if (message.includes('Wallet is not ready')) {
        message = 'Wallet is initializing. Please wait a moment and try again.'
      } else if (message.includes('Wallet address not available')) {
        message = 'Wallet address not available. Please reconnect your wallet.'
      } else if (message.includes('Public client not ready')) {
        message = 'Public client is initializing. Please wait a moment and try again.'
      } else if (message.includes('Wallet client not ready')) {
        message = 'Wallet client is initializing. Please wait a moment and try again.'
      } else if (message.includes('SDK not ready') || message.includes('Good Dollar SDK not ready')) {
        message = 'Good Dollar SDK is initializing. Please wait a moment and try again.'
      } else if (message.includes('Missing app address')) {
        message = 'Configuration error. Please contact support'
      } else if (message.includes('Failed with 4')) {
        message = 'Verification failed. Please verify via GoodDollar wallet'
      } else if (message.includes('Failed with 5')) {
        message = 'Server error. Please try again later'
      }
      
      setError(message)
      setStatus('error')
    }
  }, [address, apiBase, isConnected, walletClient, publicClient, engagementRewards, APP_ADDRESS, walletsReady, primaryWallet, walletAddress, isWalletReady, chain, isTestnet])

  return {
    address: walletAddress,
    isConnected: isWalletReady,
    status,
    error,
    txHash,
    claim,
    inviter: INVITER,
    walletsReady,
    primaryWallet,
  }
}

export default useEngagementClaim


