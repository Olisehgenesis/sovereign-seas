import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { EventType, type Prisma } from '@prisma/client'

// Analytics route - uses Prisma/SQLite (Redis removed)

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

    const whereClause: Prisma.EventWhereInput = {
      timestamp: {
        gte: startDate
      }
    }

    if (campaignId) {
      whereClause.campaignId = campaignId
    }

    if (publisherId) {
      whereClause.publisherId = publisherId
    }

    // Get events from database
    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        campaign: true,
        publisher: true
      }
    })

    // Calculate metrics
    const impressions = events.filter(e => e.type === EventType.IMPRESSION).length
    const clicks = events.filter(e => e.type === EventType.CLICK).length
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0

    // Calculate revenue (for publishers)
    const totalRevenue = events
      .filter(e => e.type === EventType.CLICK)
      .reduce((sum, event) => sum + parseFloat(event.campaign.cpc.toString()), 0)

    const analytics = {
      period: `${days} days`,
      impressions,
      clicks,
      ctr: parseFloat(ctr.toFixed(2)),
      totalRevenue: parseFloat(totalRevenue.toFixed(6)),
      events: events.map(event => ({
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        campaignName: event.campaign.name,
        publisherDomain: event.publisher.domain
      }))
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
          revenue: 0
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
          revenue: 0
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