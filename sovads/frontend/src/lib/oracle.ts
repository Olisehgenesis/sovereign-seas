import { createPublicClient, createWalletClient, http, formatUnits } from 'viem'
import { celoAlfajores } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { getCollections } from '@/lib/db'

// Placeholder contract addresses (replace with actual deployed contracts)
const SOVADS_MANAGER_ADDRESS = '0x0000000000000000000000000000000000000000' // Placeholder
const USDC_ADDRESS = '0x874069Fa1Eb16D44d62F6aD4436B8c4C5C5C5C5C' // Placeholder USDC on Celo Alfajores
0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9

// Oracle configuration
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000'
const RPC_URL = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org'

// Create clients
const publicClient = createPublicClient({
  chain: celoAlfajores,
  transport: http(RPC_URL)
})

const account = privateKeyToAccount(ORACLE_PRIVATE_KEY as `0x${string}`)

const walletClient = createWalletClient({
  account,
  chain: celoAlfajores,
  transport: http(RPC_URL)
})

// Placeholder contract ABI (replace with actual contract ABI)
const SOVADS_MANAGER_ABI = [
  {
    name: 'payoutPublisher',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'publisher', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'proof', type: 'bytes32' }
    ],
    outputs: [{ name: 'success', type: 'bool' }]
  },
  {
    name: 'submitMetricsHash',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'date', type: 'uint256' },
      { name: 'hash', type: 'bytes32' }
    ],
    outputs: [{ name: 'success', type: 'bool' }]
  },
  {
    name: 'getPublisherBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'publisher', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }]
  }
] as const

interface PayoutData {
  publisherId: string
  publisherWallet: string
  amount: number
  date: string
  proof: string
}

class SovAdsOracle {
  private isRunning = false
  private intervalId: NodeJS.Timeout | null = null

  async start() {
    if (this.isRunning) {
      console.log('Oracle is already running')
      return
    }

    this.isRunning = true
    console.log('Starting SovAds Oracle...')

    // Process pending payouts every 5 minutes
    this.intervalId = setInterval(async () => {
      try {
        await this.processPendingPayouts()
      } catch (error) {
        console.error('Error in oracle payout processing:', error)
      }
    }, 5 * 60 * 1000) // 5 minutes

    // Submit daily metrics hash at 2 AM UTC
    this.scheduleDailyMetricsSubmission()

    console.log('SovAds Oracle started successfully')
  }

  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
    console.log('SovAds Oracle stopped')
  }

  private async processPendingPayouts() {
    try {
      // Get pending payouts from MongoDB
      const { events } = await getCollections()
      const payoutKeys = await events.find({ 
        type: 'payout', 
        status: 'pending' 
      }).toArray()
      
      for (const payoutDoc of payoutKeys) {
        const payout: PayoutData = payoutDoc.data
        
        try {
          const txHash = await this.executePayout(payout)
          
          // Update payout record with transaction hash
          await events.updateOne(
            { _id: payoutDoc._id },
            { 
              $set: {
                ...payoutDoc,
                data: {
                  ...payout,
                  txHash,
                  status: 'completed',
                  timestamp: new Date().toISOString()
                },
                status: 'completed',
                updatedAt: new Date()
              }
            }
          )

          console.log(`Payout completed for ${payout.publisherWallet}: ${txHash}`)
        } catch (error) {
          console.error(`Failed to process payout for ${payout.publisherWallet}:`, error)
          
          // Mark as failed
          await events.updateOne(
            { _id: payoutDoc._id },
            { 
              $set: {
                ...payoutDoc,
                data: {
                  ...payout,
                  error: error instanceof Error ? error.message : 'Unknown error',
                  status: 'failed',
                  timestamp: new Date().toISOString()
                },
                status: 'failed',
                updatedAt: new Date()
              }
            }
          )
        }
      }
    } catch (error) {
      console.error('Error processing pending payouts:', error)
    }
  }

  private async executePayout(payout: PayoutData): Promise<string> {
    try {
      // For now, simulate the transaction (replace with actual contract call)
      console.log(`Simulating payout: ${payout.publisherWallet} -> ${payout.amount} USDC`)
      
      // TODO: Replace with actual contract interaction
      /*
      const txHash = await walletClient.writeContract({
        address: SOVADS_MANAGER_ADDRESS,
        abi: SOVADS_MANAGER_ABI,
        functionName: 'payoutPublisher',
        args: [
          payout.publisherWallet as `0x${string}`,
          BigInt(Math.floor(payout.amount * 1e6)), // Convert to USDC decimals (6)
          payout.proof as `0x${string}`
        ]
      })
      */

      // Simulate transaction hash
      const txHash = `0x${Math.random().toString(16).substr(2, 64)}`
      
      return txHash
    } catch (error) {
      console.error('Error executing payout transaction:', error)
      throw error
    }
  }

  private scheduleDailyMetricsSubmission() {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(2, 0, 0, 0) // 2 AM UTC

    const msUntilTomorrow = tomorrow.getTime() - now.getTime()

    setTimeout(() => {
      this.submitDailyMetricsHash()
      
      // Schedule for every 24 hours
      setInterval(() => {
        this.submitDailyMetricsHash()
      }, 24 * 60 * 60 * 1000)
    }, msUntilTomorrow)
  }

  private async submitDailyMetricsHash() {
    try {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)

      // Get analytics hash from database
      const { events } = await getCollections()
      // Assuming we store daily analytics hashes in an 'events' collection with type 'analyticsHash'
      const analyticsHash = await events.findOne({ type: 'analyticsHash', date: yesterday.toISOString().split('T')[0] })

      if (!analyticsHash) {
        console.log(`No analytics hash found for ${yesterday.toISOString().split('T')[0]}`)
        return
      }

      // Submit hash to contract
      console.log(`Submitting metrics hash for ${yesterday.toISOString().split('T')[0]}: ${analyticsHash.hash}`)
      
      // TODO: Replace with actual contract interaction
      /*
      const txHash = await walletClient.writeContract({
        address: SOVADS_MANAGER_ADDRESS,
        abi: SOVADS_MANAGER_ABI,
        functionName: 'submitMetricsHash',
        args: [
          BigInt(Math.floor(yesterday.getTime() / 1000)), // Unix timestamp
          analyticsHash.hash as `0x${string}`
        ]
      })
      */

      console.log(`Metrics hash submitted successfully`)
    } catch (error) {
      console.error('Error submitting daily metrics hash:', error)
    }
  }

  // Public methods for manual operations
  async queuePayout(publisherId: string, amount: number, proof: string) {
    try {
      const { publishers, events } = await getCollections()
      const publisher = await publishers.findOne({ _id: new (await import('mongodb')).ObjectId(publisherId) })

      if (!publisher) {
        throw new Error(`Publisher ${publisherId} not found`)
      }

      const payoutData: PayoutData = {
        publisherId,
        publisherWallet: publisher.wallet,
        amount,
        date: new Date().toISOString().split('T')[0],
        proof
      }

      const payoutDoc = {
        type: 'payout',
        status: 'pending',
        data: payoutData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      const result = await events.insertOne(payoutDoc as any)
      const key = result.insertedId.toString()

      console.log(`Payout queued for ${publisher.wallet}: ${amount} USDC`)
      return key
    } catch (error) {
      console.error('Error queuing payout:', error)
      throw error
    }
  }

  async getPublisherBalance(publisherWallet: string): Promise<number> {
    try {
      // TODO: Replace with actual contract call
      /*
      const balance = await publicClient.readContract({
        address: SOVADS_MANAGER_ADDRESS,
        abi: SOVADS_MANAGER_ABI,
        functionName: 'getPublisherBalance',
        args: [publisherWallet as `0x${string}`]
      })

      return parseFloat(formatUnits(balance, 6)) // USDC has 6 decimals
      */

      // Simulate balance
      return Math.random() * 100
    } catch (error) {
      console.error('Error getting publisher balance:', error)
      return 0
    }
  }

  async getOracleStatus() {
    return {
      isRunning: this.isRunning,
      chain: celoAlfajores.name,
      managerAddress: SOVADS_MANAGER_ADDRESS,
      oracleAddress: account.address
    }
  }
}

// Export singleton instance
export const oracle = new SovAdsOracle()

// Initialize oracle on startup
export async function initializeOracle() {
  try {
    await oracle.start()
    console.log('Oracle initialized successfully')
  } catch (error) {
    console.error('Failed to initialize oracle:', error)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down oracle...')
  await oracle.stop()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('Shutting down oracle...')
  await oracle.stop()
  process.exit(0)
})