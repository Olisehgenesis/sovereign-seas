import { randomUUID } from 'crypto'
import crypto from 'crypto'
import { collections } from '@/lib/db'

// Simplified analytics functions without Redis/BullMQ
// In production with Redis, you can restore queue-based processing

export async function aggregateAnalytics(date?: string) {
  const targetDate = date ? new Date(date) : new Date()
  targetDate.setHours(0, 0, 0, 0)
  
  const nextDay = new Date(targetDate)
  nextDay.setDate(nextDay.getDate() + 1)

  // Get all events for the day
  const eventsCollection = await collections.events()
  const campaignsCollection = await collections.campaigns()
  const publishersCollection = await collections.publishers()
  const analyticsHashesCollection = await collections.analyticsHashes()

  const events = await eventsCollection
    .find({
      timestamp: {
        $gte: targetDate,
        $lt: nextDay,
      },
    })
    .toArray()

  const campaignIds = Array.from(new Set(events.map((event) => event.campaignId)))
  const publisherIds = Array.from(new Set(events.map((event) => event.publisherId)))

  const [campaigns, publishers] = await Promise.all([
    campaignIds.length
      ? campaignsCollection
          .find({ _id: { $in: campaignIds } })
          .project({ _id: 1, name: 1, cpc: 1 })
          .toArray()
      : [],
    publisherIds.length
      ? publishersCollection
          .find({ _id: { $in: publisherIds } })
          .project({ _id: 1, domain: 1 })
          .toArray()
      : [],
  ])

  const campaignMap = new Map<string, { name?: string; cpc?: number }>()
  campaigns.forEach((campaign) => {
    campaignMap.set(campaign._id, { name: campaign.name, cpc: campaign.cpc })
  })

  const publisherMap = new Map<string, { domain?: string }>()
  publishers.forEach((publisher) => {
    publisherMap.set(publisher._id, { domain: publisher.domain })
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
        campaignName: campaignMap.get(event.campaignId)?.name ?? 'Unknown Campaign'
      })
    }

    const campaignStat = campaignStats.get(campaignId)
    if (event.type === 'IMPRESSION') {
      campaignStat.impressions++
    } else if (event.type === 'CLICK') {
      campaignStat.clicks++
      campaignStat.revenue += campaignMap.get(event.campaignId)?.cpc ?? 0
    }

    // Publisher stats
    if (!publisherStats.has(publisherId)) {
      publisherStats.set(publisherId, {
        publisherId,
        impressions: 0,
        clicks: 0,
        revenue: 0,
        publisherDomain: publisherMap.get(event.publisherId)?.domain ?? 'Unknown Publisher'
      })
    }

    const publisherStat = publisherStats.get(publisherId)
    if (event.type === 'IMPRESSION') {
      publisherStat.impressions++
    } else if (event.type === 'CLICK') {
      publisherStat.clicks++
      publisherStat.revenue += campaignMap.get(event.campaignId)?.cpc ?? 0
    }
  })

  const aggregatedData = {
    date: targetDate.toISOString().split('T')[0],
    campaigns: Array.from(campaignStats.values()),
    publishers: Array.from(publisherStats.values()),
    totalEvents: events.length,
    totalImpressions: events.filter((e) => e.type === 'IMPRESSION').length,
    totalClicks: events.filter((e) => e.type === 'CLICK').length
  }

  // Generate hash for on-chain storage
  const hash = crypto.createHash('sha256')
    .update(JSON.stringify(aggregatedData))
    .digest('hex')

  // Store hash in database
  await analyticsHashesCollection.updateOne(
    { date: targetDate },
    {
      $set: {
        date: targetDate,
        hash: `0x${hash}`,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        _id: randomUUID(),
        createdAt: new Date(),
      },
    },
    { upsert: true }
  )

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
  const publishersCollection = await collections.publishers()
  const publisher = await publishersCollection.findOne({ _id: publisherId })

  if (!publisher) {
    throw new Error(`Publisher ${publisherId} not found`)
  }

  // Update publisher's total earnings
  await publishersCollection.updateOne(
    { _id: publisherId },
    {
      $inc: { totalEarned: amount },
      $set: { updatedAt: new Date() },
    }
  )

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
