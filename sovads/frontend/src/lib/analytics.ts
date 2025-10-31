import { Queue, Worker } from 'bullmq'
import { redis } from '@/lib/db'
import { prisma } from '@/lib/db'
import { EventType } from '@prisma/client'
import crypto from 'crypto'

// Create queues
export const analyticsQueue = new Queue('analytics', {
  connection: redis
})

export const payoutQueue = new Queue('payout', {
  connection: redis
})

// Analytics aggregation worker
export const analyticsWorker = new Worker('analytics', async (job) => {
  const { date } = job.data
  console.log(`Processing analytics aggregation for ${date}`)

  try {
    const targetDate = date ? new Date(date) : new Date()
    targetDate.setHours(0, 0, 0, 0)
    
    const nextDay = new Date(targetDate)
    nextDay.setDate(nextDay.getDate() + 1)

    // Get all events for the day
    const events = await prisma.event.findMany({
      where: {
        timestamp: {
          gte: targetDate,
          lt: nextDay
        }
      },
      include: {
        campaign: true,
        publisher: true
      }
    })

    // Aggregate by campaign and publisher
    const campaignStats = new Map()
    const publisherStats = new Map()

    events.forEach(event => {
      const campaignId = event.campaignId
      const publisherId = event.publisherId

      // Campaign stats
      if (!campaignStats.has(campaignId)) {
        campaignStats.set(campaignId, {
          campaignId,
          impressions: 0,
          clicks: 0,
          revenue: 0,
          campaignName: event.campaign.name
        })
      }

      const campaignStat = campaignStats.get(campaignId)
      if (event.type === EventType.IMPRESSION) {
        campaignStat.impressions++
      } else if (event.type === EventType.CLICK) {
        campaignStat.clicks++
        campaignStat.revenue += parseFloat(event.campaign.cpc.toString())
      }

      // Publisher stats
      if (!publisherStats.has(publisherId)) {
        publisherStats.set(publisherId, {
          publisherId,
          impressions: 0,
          clicks: 0,
          revenue: 0,
          publisherDomain: event.publisher.domain
        })
      }

      const publisherStat = publisherStats.get(publisherId)
      if (event.type === EventType.IMPRESSION) {
        publisherStat.impressions++
      } else if (event.type === EventType.CLICK) {
        publisherStat.clicks++
        publisherStat.revenue += parseFloat(event.campaign.cpc.toString())
      }
    })

    const aggregatedData = {
      date: targetDate.toISOString().split('T')[0],
      campaigns: Array.from(campaignStats.values()),
      publishers: Array.from(publisherStats.values()),
      totalEvents: events.length,
      totalImpressions: events.filter(e => e.type === EventType.IMPRESSION).length,
      totalClicks: events.filter(e => e.type === EventType.CLICK).length
    }

    // Cache aggregated data in Redis
    const cacheKey = `analytics:aggregated:${targetDate.toISOString().split('T')[0]}`
    await redis.setex(cacheKey, 86400 * 30, JSON.stringify(aggregatedData)) // 30 days

    // Generate hash for on-chain storage
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(aggregatedData))
      .digest('hex')

    // Store hash in database
    await prisma.analyticsHash.upsert({
      where: { date: targetDate },
      update: { hash: `0x${hash}` },
      create: {
        date: targetDate,
        hash: `0x${hash}`
      }
    })

    console.log(`Analytics aggregation completed for ${date}. Hash: 0x${hash}`)

    // Queue payout processing for publishers with earnings
    const publishersWithEarnings = Array.from(publisherStats.values())
      .filter(p => p.revenue > 0)

    for (const publisher of publishersWithEarnings) {
      await payoutQueue.add('process-payout', {
        publisherId: publisher.publisherId,
        amount: publisher.revenue,
        date: targetDate.toISOString().split('T')[0]
      })
    }

    return {
      success: true,
      aggregatedData,
      hash: `0x${hash}`,
      publishersWithEarnings: publishersWithEarnings.length
    }
  } catch (error) {
    console.error('Error in analytics aggregation:', error)
    throw error
  }
}, {
  connection: redis
})

// Payout processing worker
export const payoutWorker = new Worker('payout', async (job) => {
  const { publisherId, amount, date } = job.data
  console.log(`Processing payout for publisher ${publisherId}: ${amount} USDC`)

  try {
    // Get publisher details
    const publisher = await prisma.publisher.findUnique({
      where: { id: publisherId }
    })

    if (!publisher) {
      throw new Error(`Publisher ${publisherId} not found`)
    }

    // Update publisher's total earnings
    await prisma.publisher.update({
      where: { id: publisherId },
      data: {
        totalEarned: {
          increment: amount
        }
      }
    })

    // TODO: Implement actual on-chain payout using smart contracts
    // For now, we'll just log the payout
    console.log(`Payout processed: ${publisher.domain} earned ${amount} USDC on ${date}`)

    // Store payout record (you might want to create a Payout model)
    const payoutRecord = {
      publisherId,
      amount,
      date,
      status: 'processed',
      txHash: null // Will be filled when on-chain transaction is completed
    }

    // Cache payout in Redis for quick access
    const payoutKey = `payout:${publisherId}:${date}`
    await redis.setex(payoutKey, 86400 * 7, JSON.stringify(payoutRecord)) // 7 days

    return {
      success: true,
      payoutRecord
    }
  } catch (error) {
    console.error('Error processing payout:', error)
    throw error
  }
}, {
  connection: redis
})

// Schedule daily analytics aggregation
export async function scheduleDailyAnalytics() {
  // Run at 1 AM UTC every day
  await analyticsQueue.add('daily-aggregation', {}, {
    repeat: {
      pattern: '0 1 * * *' // Cron pattern for 1 AM daily
    }
  })
}

// Schedule hourly analytics aggregation for real-time updates
export async function scheduleHourlyAnalytics() {
  // Run every hour
  await analyticsQueue.add('hourly-aggregation', {}, {
    repeat: {
      pattern: '0 * * * *' // Cron pattern for every hour
    }
  })
}

// Initialize workers and schedules
export async function initializeAnalytics() {
  console.log('Initializing analytics workers...')
  
  // Start workers
  analyticsWorker.on('completed', (job) => {
    console.log(`Analytics job ${job.id} completed`)
  })

  analyticsWorker.on('failed', (job, err) => {
    console.error(`Analytics job ${job?.id} failed:`, err)
  })

  payoutWorker.on('completed', (job) => {
    console.log(`Payout job ${job.id} completed`)
  })

  payoutWorker.on('failed', (job, err) => {
    console.error(`Payout job ${job?.id} failed:`, err)
  })

  // Schedule recurring jobs
  await scheduleDailyAnalytics()
  await scheduleHourlyAnalytics()

  console.log('Analytics workers initialized and scheduled')
}

// Manual trigger functions for testing
export async function triggerAnalyticsAggregation(date?: string) {
  const job = await analyticsQueue.add('manual-aggregation', { date })
  return job
}

export async function triggerPayoutProcessing(publisherId: string, amount: number) {
  const job = await payoutQueue.add('manual-payout', {
    publisherId,
    amount,
    date: new Date().toISOString().split('T')[0]
  })
  return job
}