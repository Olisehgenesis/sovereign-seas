import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { collections } from '@/lib/db'
import type { Event } from '@/lib/models'

const EVENT_TYPES = ['IMPRESSION', 'CLICK'] as const

const randomId = () => randomUUID()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, campaignId, adId, siteId, fingerprint } = body

    if (!type || !campaignId || !adId || !siteId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate event type
    if (!EVENT_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }

    // Get publisher by siteId
    const publisherSitesCollection = await collections.publisherSites()
    const publishersCollection = await collections.publishers()
    const campaignsCollection = await collections.campaigns()
    const eventsCollection = await collections.events()

    const publisherSite = await publisherSitesCollection.findOne({ siteId })

    const publisher =
      (publisherSite && (await publishersCollection.findOne({ _id: publisherSite.publisherId }))) ||
      (await publishersCollection.findOne({ _id: siteId.replace('site_', '') })) ||
      (await publishersCollection.findOne({ domain: siteId }))

    if (!publisher) {
      return NextResponse.json({ error: 'Publisher not found' }, { status: 404 })
    }

    // Get campaign
    const campaign = await campaignsCollection.findOne({ _id: campaignId })

    if (!campaign || !campaign.active) {
      return NextResponse.json({ error: 'Campaign not found or inactive' }, { status: 404 })
    }

    // Check for duplicate events (fraud prevention) - within last hour
    const oneHourAgo = new Date(Date.now() - 3600 * 1000)
    const existingEvent = await eventsCollection.findOne({
      type,
      campaignId,
      adId,
      siteId,
      fingerprint: fingerprint ?? null,
      timestamp: { $gte: oneHourAgo },
    })
    
    if (existingEvent) {
      return NextResponse.json({ error: 'Duplicate event detected' }, { status: 409 })
    }

    // Rate limiting per campaign - check events in last hour
    const recentEvents = await eventsCollection.countDocuments({
      type,
      campaignId,
      siteId,
      timestamp: { $gte: oneHourAgo },
    })

    if (recentEvents > 100) { // Max 100 events per hour per campaign per site
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    // Create event
    const eventDoc: Event = {
      _id: randomId(),
      type,
      campaignId,
      publisherId: publisher._id,
      siteId,
      adId,
      ipAddress:
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        request.headers.get('cf-connecting-ip') ||
        request.headers.get('x-client-ip') ||
        'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      ...(fingerprint && { fingerprint }),
      ...(publisherSite?._id && { publisherSiteId: publisherSite._id }),
      timestamp: new Date(),
      verified: type === 'CLICK',
    }

    await eventsCollection.insertOne(eventDoc)

    // Update campaign spent amount for clicks
    if (type === 'CLICK') {
      await campaignsCollection.updateOne(
        { _id: campaignId },
        {
          $inc: { spent: campaign.cpc },
          $set: { updatedAt: new Date() },
        }
      )
    }

    return NextResponse.json({ success: true, eventId: eventDoc._id })
  } catch (error) {
    console.error('Error tracking event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}