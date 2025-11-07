import { createPublicClient, createWalletClient, http, formatUnits } from 'viem'
import { celoSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { prisma } from '@/lib/db'

// SovAds Manager contract address on Celo Sepolia
const SOVADS_MANAGER_ADDRESS = '0x3eCE3a48818efF703204eC9B60f00d476923f5B5'
const USDC_ADDRESS = '0x01C5C0122039549AD1493B8220cABEdD739BC44E' // USDC on Celo Sepolia

// Oracle configuration
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000'
const RPC_URL = process.env.CELO_SEPOLIA_RPC_URL || 'https://rpc.ankr.com/celo_sepolia'

// Create clients
const publicClient = createPublicClient({
  chain: celoSepolia,
  transport: http(RPC_URL)
})

const account = privateKeyToAccount(ORACLE_PRIVATE_KEY as `0x${string}`)

const walletClient = createWalletClient({
  account,
  chain: celoSepolia,
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
      // Get pending payouts from database
      const pendingPayouts = await prisma.payout.findMany({
        where: { status: 'pending' },
        include: { publisher: true }
      })
      
      if (pendingPayouts.length === 0) {
        return // No payouts to process
      }
      
      console.log(`Processing ${pendingPayouts.length} pending payout(s)`)
      
      for (const payoutDoc of pendingPayouts) {
        const payout: PayoutData = {
          publisherId: payoutDoc.publisherId,
          publisherWallet: payoutDoc.publisherWallet,
          amount: Number(payoutDoc.amount),
          date: payoutDoc.date,
          proof: payoutDoc.proof
        }
        
        try {
          const txHash = await this.executePayout(payout)
          console.log(`Payout completed for ${payout.publisherWallet}: ${txHash}`)
          
          // Update payout record in database
          await prisma.payout.update({
            where: { id: payoutDoc.id },
            data: {
              txHash,
              status: 'completed',
              updatedAt: new Date()
            }
          })

          // Update publisher's total earnings
          await prisma.publisher.update({
            where: { id: payout.publisherId },
            data: {
              totalEarned: {
                increment: payoutDoc.amount
              }
            }
          })
        } catch (error) {
          console.error(`Failed to process payout for ${payout.publisherWallet}:`, error)
          
          // Mark as failed in database
          await prisma.payout.update({
            where: { id: payoutDoc.id },
            data: {
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
              updatedAt: new Date()
            }
          })
        }
      }
    } catch (error) {
      console.error('Error processing pending payouts:', error)
    }
  }

  private async executePayout(payout: PayoutData): Promise<string> {
    try {
      console.log(`Executing payout: ${payout.publisherWallet} -> ${payout.amount} USDC`)
      
      // Execute contract interaction
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

      console.log(`Payout transaction submitted: ${txHash}`)
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

      // Get analytics hash from database using Prisma
      const dateString = yesterday.toISOString().split('T')[0]
      const analyticsHash = await prisma.analyticsHash.findUnique({
        where: { date: new Date(dateString) }
      })

      if (!analyticsHash) {
        console.log(`No analytics hash found for ${dateString}`)
        return
      }

      // Submit hash to contract
      console.log(`Submitting metrics hash for ${dateString}: ${analyticsHash.hash}`)
      
      // Execute contract interaction
      const txHash = await walletClient.writeContract({
        address: SOVADS_MANAGER_ADDRESS,
        abi: SOVADS_MANAGER_ABI,
        functionName: 'submitMetricsHash',
        args: [
          BigInt(Math.floor(yesterday.getTime() / 1000)), // Unix timestamp
          analyticsHash.hash as `0x${string}`
        ]
      })

      console.log(`Metrics hash submitted successfully: ${txHash}`)
    } catch (error) {
      console.error('Error submitting daily metrics hash:', error)
    }
  }

  // Public methods for manual operations
  async queuePayout(publisherId: string, amount: number, proof: string) {
    try {
      const publisher = await prisma.publisher.findUnique({
        where: { id: publisherId }
      })

      if (!publisher) {
        throw new Error(`Publisher ${publisherId} not found`)
      }

      // Store payout in database
      const payout = await prisma.payout.create({
        data: {
          publisherId,
          publisherWallet: publisher.wallet,
          amount,
          date: new Date().toISOString().split('T')[0],
          proof,
          status: 'pending'
        }
      })

      console.log(`Payout queued for ${publisher.wallet}: ${amount} USDC (ID: ${payout.id})`)
      return payout.id
    } catch (error) {
      console.error('Error queuing payout:', error)
      throw error
    }
  }

  async getPublisherBalance(publisherWallet: string): Promise<number> {
    try {
      // Get balance from contract
      const balance = await publicClient.readContract({
        address: SOVADS_MANAGER_ADDRESS,
        abi: SOVADS_MANAGER_ABI,
        functionName: 'getPublisherBalance',
        args: [publisherWallet as `0x${string}`]
      })

      return parseFloat(formatUnits(balance as bigint, 6)) // USDC has 6 decimals
    } catch (error) {
      console.error('Error getting publisher balance:', error)
      return 0
    }
  }

  async getOracleStatus() {
    return {
      isRunning: this.isRunning,
      chain: celoSepolia.name,
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