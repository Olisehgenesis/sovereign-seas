import { NextRequest, NextResponse } from 'next/server'
import { collections } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId')
    const publisherId = searchParams.get('publisherId')
    const days = Number.parseInt(searchParams.get('days') ?? '7', 10)

    if (!campaignId && !publisherId) {
      return NextResponse.json({ error: 'Campaign ID or Publisher ID is required' }, { status: 400 })
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const eventsCollection = await collections.events()
    const campaignsCollection = await collections.campaigns()
    const publishersCollection = await collections.publishers()

    const query: Record<string, unknown> = {
      timestamp: { $gte: startDate },
    }

    if (campaignId) {
      query.campaignId = campaignId
    }

    if (publisherId) {
      query.publisherId = publisherId
    }

    const events = await eventsCollection
      .find(query)
      .sort({ timestamp: -1 })
      .toArray()

    const campaignIds = Array.from(new Set(events.map((event) => event.campaignId)))
    const publisherIds = Array.from(new Set(events.map((event) => event.publisherId)))

    const [campaignDocs, publisherDocs] = await Promise.all([
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
    campaignDocs.forEach((doc) => {
      campaignMap.set(doc._id, { name: doc.name, cpc: doc.cpc })
    })

    const publisherMap = new Map<string, { domain?: string }>()
    publisherDocs.forEach((doc) => {
      publisherMap.set(doc._id, { domain: doc.domain })
    })

    // Calculate metrics
    const impressions = events.filter((e) => e.type === 'IMPRESSION').length
    const clicks = events.filter((e) => e.type === 'CLICK').length
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0

    // Calculate revenue (for publishers)
    const totalRevenue = events
      .filter((e) => e.type === 'CLICK')
      .reduce((sum, event) => {
        const campaign = campaignMap.get(event.campaignId)
        return sum + (campaign?.cpc ?? 0)
      }, 0)

    const analytics = {
      period: `${days} days`,
      impressions,
      clicks,
      ctr: parseFloat(ctr.toFixed(2)),
      totalRevenue: parseFloat(totalRevenue.toFixed(6)),
      events: events.map((event) => ({
        id: event._id,
        type: event.type,
        timestamp: event.timestamp,
        campaignName: campaignMap.get(event.campaignId)?.name ?? 'Unknown Campaign',
        publisherDomain: publisherMap.get(event.publisherId)?.domain ?? 'Unknown Publisher',
      })),
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Endpoint for aggregating analytics (called by cron job)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date } = body

    const targetDate = date ? new Date(date) : new Date()
    targetDate.setHours(0, 0, 0, 0)
    
    const nextDay = new Date(targetDate)
    nextDay.setDate(nextDay.getDate() + 1)

    // Get all events for the day
    const eventsCollection = await collections.events()
    const campaignsCollection = await collections.campaigns()

    const events = await eventsCollection
      .find({
        timestamp: {
          $gte: targetDate,
          $lt: nextDay,
        },
      })
      .toArray()

    const campaignIds = Array.from(new Set(events.map((event) => event.campaignId)))
    const campaignDocs = campaignIds.length
      ? await campaignsCollection
          .find({ _id: { $in: campaignIds } })
          .project({ _id: 1, cpc: 1 })
          .toArray()
      : []

    const campaignMap = new Map<string, { cpc?: number }>()
    campaignDocs.forEach((doc) => {
      campaignMap.set(doc._id, { cpc: doc.cpc })
    })

    // Aggregate by campaign and publisher
    const campaignStats = new Map()
    const publisherStats = new Map()

    events.forEach((event) => {
      const campaignId = event.campaignId
      const publisherId = event.publisherId

      // Campaign stats
      if (!campaignStats.has(campaignId)) {
        campaignStats.set(campaignId, {
          campaignId,
          impressions: 0,
          clicks: 0,
          revenue: 0
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
          revenue: 0
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
      totalEvents: events.length
    }

    // Generate hash for on-chain storage (placeholder)
    // Note: In production, you might want to store aggregated data in a separate table
    const hash = `0x${Buffer.from(JSON.stringify(aggregatedData)).toString('hex').slice(0, 64)}`

    return NextResponse.json({
      success: true,
      aggregatedData,
      hash
    })
  } catch (error) {
    console.error('Error aggregating analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}