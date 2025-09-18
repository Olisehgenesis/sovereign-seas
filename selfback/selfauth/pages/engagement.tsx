'use client'

import React, { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useEngagementRewards, DEV_REWARDS_CONTRACT } from '@goodsdks/engagement-sdk'

// Lazy import SDK hook to avoid SSR issues if not installed
const DynamicEngagementGuide = dynamic(async () => Promise.resolve(EngagementGuide), { ssr: false })

// Minimal UI to demonstrate calling backend /api/sign-claim
function ClaimDemo() {
  const [user, setUser] = useState('')
  const [inviter] = useState('0xB8f936be2B12406391B4232647593Cdb62dF2203')
  const [status, setStatus] = useState<string>('')
  const [signature, setSignature] = useState<string>('')
  const [userSignature, setUserSignature] = useState<string>('')
  const [validUntilBlock, setValidUntilBlock] = useState<bigint | null>(null)
  const [txHash, setTxHash] = useState<string>('')

  const apiBase = useMemo(() => '', []) // same origin
  const engagementRewards = useEngagementRewards(DEV_REWARDS_CONTRACT)
  const APP_ADDRESS = process.env.NEXT_PUBLIC_APP_ADDRESS as `0x${string}` | "0x752850Cd4143137d0cdB32b0bc141fd79e7626EA"

  const connectWallet = async () => {
    try {
      const anyWindow: any = window as any
      if (!anyWindow.ethereum) {
        setStatus('MetaMask not found')
        return
      }
      const accounts: string[] = await anyWindow.ethereum.request({ method: 'eth_requestAccounts' })
      if (accounts && accounts.length > 0) {
        setUser(accounts[0])
        setStatus(`Connected: ${accounts[0]}`)
      }
    } catch (e: any) {
      setStatus(`Connect error: ${e?.message || 'Unknown error'}`)
    }
  }

  const handleUserSignature = async () => {
    try {
      if (!engagementRewards) {
        setStatus('SDK not ready')
        return
      }

      setStatus('Preparing user signature...')

      // Get current block and prepare signature
      const currentBlock = await engagementRewards.getCurrentBlockNumber()
      const vub = currentBlock + BigInt(50) // extend validity window
      setValidUntilBlock(vub)

      if (!user) {
        throw new Error('Connect wallet first')
      }

      if (!APP_ADDRESS) {
        throw new Error('Missing NEXT_PUBLIC_APP_ADDRESS')
      }

      // Generate user signature (will prompt wallet if required)
      let uSig: `0x${string}` = '0x'
      try {
        uSig = await engagementRewards.signClaim(
          APP_ADDRESS,
          inviter as `0x${string}`,
          vub
        )
      } catch (_e) {
        uSig = '0x'
      }
      setUserSignature(uSig)

      setStatus('User signature prepared')
    } catch (e: any) {
      setStatus(`Error: ${e?.message || 'Unknown error'}`)
    }
  }

  const handleGetAppSignature = async () => {
    try {
      if (!engagementRewards) {
        setStatus('SDK not ready')
        return
      }
      if (!APP_ADDRESS) {
        throw new Error('Missing NEXT_PUBLIC_APP_ADDRESS')
      }
      if (!user) {
        throw new Error('Connect wallet first')
      }

      // Ensure validUntilBlock exists
      let vub = validUntilBlock
      if (!vub) {
        const currentBlock = await engagementRewards.getCurrentBlockNumber()
        vub = currentBlock + BigInt(50)
        setValidUntilBlock(vub)
      }

      setStatus('Requesting app signature from backend...')

      const resp = await fetch(`${apiBase}/api/sign-claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          inviter,
          validUntilBlock: vub!.toString()
        })
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(err.error || `Failed with ${resp.status}`)
      }

      const data = await resp.json()
      setSignature(data.signature)
      setStatus('App signature ready')
    } catch (e: any) {
      setStatus(`Error: ${e?.message || 'Unknown error'}`)
    }
  }

  const handleClaim = async () => {
    try {
      if (!engagementRewards) {
        setStatus('SDK not ready')
        return
      }
      if (!APP_ADDRESS) {
        setStatus('Missing NEXT_PUBLIC_APP_ADDRESS')
        return
      }
      // ensure signature not expired
      const nowBlock = await engagementRewards.getCurrentBlockNumber()
      if (!validUntilBlock || nowBlock > validUntilBlock) {
        setStatus('Signatures expired. Please regenerate user & app signatures.')
        return
      }
      if (!user) {
        setStatus('Connect wallet first')
        return
      }
      if (!validUntilBlock) {
        setStatus('Get signatures first')
        return
      }
      setStatus('Submitting claim...')
      console.log('[Claim Debug] Params', {
        contract: 'DEV_REWARDS_CONTRACT',
        app: APP_ADDRESS,
        inviter,
        validUntilBlock: validUntilBlock.toString(),
        user,
        userSignature,
        appSignature: signature
      })
      const receipt = await engagementRewards.nonContractAppClaim(
        APP_ADDRESS,
        inviter as `0x${string}`,
        validUntilBlock,
        (userSignature || '0x') as `0x${string}`,
        signature as `0x${string}`
      )
      // receipt may be a hash or object depending on SDK; handle common case
      const hash = (receipt as any)?.transactionHash || (receipt as any)?.hash || String(receipt)
      setTxHash(hash)
      setStatus('Claim submitted')
    } catch (e: any) {
      console.error('[Claim Debug] Error object', e)
      const message = e?.message || 'Unknown error'
      const cause = e?.cause || null
      // Map contract revert reasons to user-friendly messages
      let userMessage = message
      if (message.includes('Invalid user address')) {
        userMessage = 'Wallet is not verified'
      } else if (message.includes('Signature expired')) {
        userMessage = 'Signatures expired. Please regenerate user & app signatures.'
      } else if (message.includes('Invalid app signature')) {
        userMessage = 'App signature invalid. Please regenerate app signature.'
      } else if (message.includes('User not eligible')) {
        userMessage = 'User not eligible to claim'
      }
      console.error('[Claim Debug] Details', {
        message,
        cause,
        app: APP_ADDRESS,
        inviter,
        user,
        validUntilBlock: validUntilBlock ? validUntilBlock.toString() : null,
        userSignature,
        appSignature: signature
      })
      setStatus(`Claim failed: ${userMessage}`)
    }
  }

  return (
    <div style={{ border: '1px solid #eee', padding: 16, borderRadius: 8, marginTop: 16 }}>
      <h3>Claim Demo</h3>
      <ol style={{ display: 'grid', gap: 12, paddingLeft: 18 }}>
        <li>
          <div style={{ display: 'grid', gap: 6 }}>
            <div>Connect the USER wallet (this wallet will perform the claim)</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={connectWallet}>Connect MetaMask</button>
              {user && <span style={{ alignSelf: 'center' }}>User: {user}</span>}
            </div>
          </div>
        </li>
        <li>
          <div style={{ display: 'grid', gap: 6 }}>
            <div>Inviter is fixed for this demo</div>
            <input value={inviter} readOnly style={{ width: '100%' }} />
          </div>
        </li>
        <li>
          <div style={{ display: 'grid', gap: 6 }}>
            <div>Generate User Signature (may prompt wallet)</div>
            <button onClick={handleUserSignature} disabled={!user || !engagementRewards}>Generate User Signature</button>
          </div>
        </li>
        <li>
          <div style={{ display: 'grid', gap: 6 }}>
            <div>Get App Signature (from backend)</div>
            <button onClick={handleGetAppSignature} disabled={!user || !engagementRewards}>Get App Signature</button>
          </div>
        </li>
        <li>
          <div style={{ display: 'grid', gap: 6 }}>
            <div>Submit Claim (with the connected USER wallet)</div>
            <button onClick={handleClaim} disabled={!signature || !engagementRewards || !user || !validUntilBlock}>Claim</button>
          </div>
        </li>
      </ol>
      {status && <div style={{ marginTop: 8 }}>{status}</div>}
      {txHash && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 600 }}>Transaction</div>
          <div style={{ wordBreak: 'break-all' }}>{txHash}</div>
        </div>
      )}
    </div>
  )
}

function EngagementGuide() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <h1>Claim</h1>
      <ClaimDemo />
    </div>
  )
}

export default function EngagementPage() {
  return <DynamicEngagementGuide />
}


