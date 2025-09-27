import { useCallback, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { useEngagementRewards, DEV_REWARDS_CONTRACT, REWARDS_CONTRACT } from '@goodsdks/engagement-sdk'
import { useSearchParams } from 'react-router-dom'

type ClaimStatus = 'idle' | 'connecting' | 'signing' | 'waiting_for_app' | 'claiming' | 'success' | 'error'

export function useEngagementClaim() {
  const { address, isConnected } = useAccount()
  const [status, setStatus] = useState<ClaimStatus>('idle')
  const [error, setError] = useState<string>('')
  const [txHash, setTxHash] = useState<string>('')
  const [searchParams] = useSearchParams()

  const apiBase = useMemo(() => 'https://selfauth.vercel.app', [])
  const engagementRewards = useEngagementRewards(REWARDS_CONTRACT)
  const APP_ADDRESS = '0x752850Cd4143137d0cdB32b0bc141fd79e7626EA'
  
  // Get inviter from URL params or use default
  const inviterFromUrl = searchParams.get('referral')
  const INVITER: `0x${string}` = (inviterFromUrl && inviterFromUrl.startsWith('0x') && inviterFromUrl.length === 42) 
    ? inviterFromUrl as `0x${string}` 
    : '0xB8f936be2B12406391B4232647593Cdb62dF2203'

  const claim = useCallback(async () => {
    try {
      setError('')
      setTxHash('')
      if (!isConnected || !address) {
        setStatus('connecting')
        throw new Error('Connect your wallet to claim')
      }
      if (!engagementRewards) {
        throw new Error('SDK not ready')
      }
      if (!APP_ADDRESS) {
        throw new Error('Missing app address')
      }

      // 1) Prepare validity window and user signature
      setStatus('signing')
      const currentBlock = await engagementRewards.getCurrentBlockNumber()
      const validUntilBlock = currentBlock + BigInt(50)

      let userSignature: `0x${string}` = '0x'
      try {
        userSignature = await engagementRewards.signClaim(
          APP_ADDRESS,
          INVITER,
          validUntilBlock
        )
      } catch (_e) {
        userSignature = '0x'
      }

      // 2) Request app signature from backend (selfauth)
      setStatus('waiting_for_app')
      const resp = await fetch(`${apiBase}/api/sign-claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: address,
          inviter: INVITER,
          validUntilBlock: validUntilBlock.toString(),
        }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(err.error || `Failed with ${resp.status}`)
      }
      const { signature: appSignature } = await resp.json()

      // 3) Submit claim
      setStatus('claiming')
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
      } else if (message.includes('Already claimed')) {
        message = 'You have already claimed your reward for this period.'
      } else if (message.includes('Invalid signature')) {
        message = 'Signature verification failed. Please try again.'
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
      if (message.includes('User rejected')) {
        message = 'Transaction cancelled by user'
      } else if (message.includes('insufficient funds')) {
        message = 'Insufficient funds for transaction'
      } else if (message.includes('network')) {
        message = 'Network error. Please try again'
      } else if (message.includes('SDK not ready')) {
        message = 'Please connect your wallet first'
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
  }, [address, apiBase, isConnected, engagementRewards, APP_ADDRESS])

  return {
    address,
    isConnected,
    status,
    error,
    txHash,
    claim,
    inviter: INVITER,
  }
}

export default useEngagementClaim


