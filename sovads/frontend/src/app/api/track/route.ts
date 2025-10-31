import { NextRequest, NextResponse } from 'next/server'
import { prisma, redis } from '@/lib/db'
import { EventType } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, campaignId, adId, siteId, fingerprint } = body

    if (!type || !campaignId || !adId || !siteId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate event type
    if (!Object.values(EventType).includes(type)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }

    // Get publisher by siteId
    const publisher = await prisma.publisher.findFirst({
      where: {
        id: siteId.replace('site_', '')
      }
    })

    if (!publisher) {
      return NextResponse.json({ error: 'Publisher not found' }, { status: 404 })
    }

    // Get campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    })

    if (!campaign || !campaign.active) {
      return NextResponse.json({ error: 'Campaign not found or inactive' }, { status: 404 })
    }

    // Check for duplicate events (fraud prevention)
    const eventKey = `event:${type}:${campaignId}:${adId}:${siteId}:${fingerprint}`
    const existingEvent = await redis.get(eventKey)
    
    if (existingEvent) {
      return NextResponse.json({ error: 'Duplicate event detected' }, { status: 409 })
    }

    // Rate limiting per campaign
    const rateLimitKey = `rate_limit:${type}:${campaignId}:${siteId}`
    const rateLimitCount = await redis.incr(rateLimitKey)
    await redis.expire(rateLimitKey, 3600) // 1 hour

    if (rateLimitCount > 100) { // Max 100 events per hour per campaign per site
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    // Create event
    const event = await prisma.event.create({
      data: {
        type: type as EventType,
        campaignId,
        publisherId: publisher.id,
        siteId,
        adId,
        ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        fingerprint: fingerprint || null
      }
    })

    // Cache event for duplicate detection
    await redis.setex(eventKey, 3600, '1') // 1 hour

    // Update campaign spent amount for clicks
    if (type === EventType.CLICK) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          spent: {
            increment: campaign.cpc
          }
        }
      })
    }

    return NextResponse.json({ success: true, eventId: event.id })
  } catch (error) {
    console.error('Error tracking event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}