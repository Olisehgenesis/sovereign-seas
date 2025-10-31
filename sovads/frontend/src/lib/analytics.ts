import { prisma } from '@/lib/db'
import { EventType } from '@prisma/client'
import crypto from 'crypto'

// Simplified analytics functions without Redis/BullMQ
// In production with Redis, you can restore queue-based processing

export async function aggregateAnalytics(date?: string) {
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

  console.log(`Analytics aggregation completed for ${targetDate.toISOString().split('T')[0]}. Hash: 0x${hash}`)

  return {
    success: true,
    aggregatedData,
    hash: `0x${hash}`,
    publishersWithEarnings: Array.from(publisherStats.values()).filter(p => p.revenue > 0).length
  }
}

// Process payout for a publisher
export async function processPayout(publisherId: string, amount: number, date: string) {
  console.log(`Processing payout for publisher ${publisherId}: ${amount}`)

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
  console.log(`Payout processed: ${publisher.domain} earned ${amount} on ${date}`)

  return {
    success: true,
    publisherId,
    amount,
    date
  }
}

// Manual trigger functions for testing
export async function triggerAnalyticsAggregation(date?: string) {
  return aggregateAnalytics(date)
}

export async function triggerPayoutProcessing(publisherId: string, amount: number) {
  const date = new Date().toISOString().split('T')[0]
  return processPayout(publisherId, amount, date)
}
