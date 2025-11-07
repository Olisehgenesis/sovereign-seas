import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { EventType } from '@prisma/client'
import { logCallback, getIpAddress } from '@/lib/debug-logger'

/**
 * Dedicated webhook endpoint for receiving Beacon API interactions
 * Designed for tracking impressions and clicks with enhanced metadata:
 * - Render verification (rendered, viewportVisible, renderTime)
 * - IP address detection (server-side)
 * - Site ID validation
 * - Better fraud prevention
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  try {
    // Extract IP address from request headers (server-side IP detection)
    const ipAddress = getIpAddress(request) || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Parse request body (from Beacon API Blob)
    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ 
        error: 'Invalid JSON payload' 
      }, { status: 400 })
    }

    const { 
      type, 
      campaignId, 
      adId, 
      siteId, 
      fingerprint,
      consumerId,
      rendered,
      viewportVisible,
      renderTime,
      timestamp,
      pageUrl,
      userAgent: clientUserAgent
    } = body

    // Validate required fields
    if (!type || !campaignId || !adId || !siteId) {
      return NextResponse.json({ 
        error: 'Missing required fields: type, campaignId, adId, siteId' 
      }, { status: 400 })
    }

    // Validate event type
    if (!Object.values(EventType).includes(type)) {
      return NextResponse.json({ 
        error: 'Invalid event type' 
      }, { status: 400 })
    }

    // Verify site ID exists and is valid
    // First check PublisherSite (new structure)
    const publisherSite = await (prisma as any).publisherSite.findUnique({
      where: { siteId: siteId },
      include: { publisher: true }
    })

    // If not found, check legacy Publisher structure
    let publisher = null
    if (!publisherSite) {
      // Try to find by ID pattern or domain
      publisher = await prisma.publisher.findFirst({
        where: {
          OR: [
            { id: siteId },
            { domain: siteId }
          ]
        }
      })
    }

    // Allow temp site IDs for development/testing
    if (!publisherSite && !publisher) {
      if (siteId.startsWith('site_') || siteId.startsWith('temp_')) {
        if (process.env.NODE_ENV === 'development') {
          // In development, allow unknown sites but log it
          console.warn(`Unknown site ID in development: ${siteId}`)
        } else {
          return NextResponse.json({ 
            error: 'Invalid site ID - site not registered' 
          }, { status: 404 })
        }
      } else {
        return NextResponse.json({ 
          error: 'Invalid site ID - site not registered' 
        }, { status: 404 })
      }
    }

    // Get campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    })

    if (!campaign || !campaign.active) {
      return NextResponse.json({ 
        error: 'Campaign not found or inactive' 
      }, { status: 404 })
    }

    // Enhanced fraud prevention:
    // 1. Verify ad was actually rendered (optional check - don't reject, but log)
    const renderVerified = rendered === true
    if (!renderVerified && type === EventType.IMPRESSION) {
      console.warn(`Unverified render for impression: adId=${adId}, siteId=${siteId}`)
    }

    // 2. Check for duplicate events (within last hour)
    const oneHourAgo = new Date(Date.now() - 3600 * 1000)
    const existingEvent = await prisma.event.findFirst({
      where: {
        type: type as EventType,
        campaignId,
        adId,
        siteId: siteId,
        fingerprint: fingerprint || null,
        timestamp: {
          gte: oneHourAgo
        }
      }
    })
    
    if (existingEvent) {
      return NextResponse.json({ 
        error: 'Duplicate event detected',
        eventId: existingEvent.id
      }, { status: 409 })
    }

    // 3. Rate limiting per campaign per site (100 events/hour)
    const recentEvents = await prisma.event.count({
      where: {
        type: type as EventType,
        campaignId,
        siteId: siteId,
        timestamp: {
          gte: oneHourAgo
        }
      }
    })

    if (recentEvents > 100) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded' 
      }, { status: 429 })
    }

    // Determine publisher ID
    const publisherId = publisherSite?.publisherId || publisher?.id || null
    
    if (!publisherId && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ 
        error: 'Publisher not found for site ID' 
      }, { status: 404 })
    }

    // Create event with enhanced metadata
    const eventData: any = {
      type: type as EventType,
      campaignId,
      publisherId: publisherId || 'temp', // Use temp for development
      siteId: siteId,
      adId,
      ipAddress,
      userAgent: clientUserAgent || userAgent,
      fingerprint: fingerprint || null,
      verified: renderVerified && (viewportVisible !== false), // Mark as verified if rendered and visible
    }
    
    // Add publisherSiteId if available (may require Prisma regenerate)
    if (publisherSite?.id) {
      eventData.publisherSiteId = publisherSite.id
    }
    
    const event = await prisma.event.create({
      data: eventData
    })

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

    // Log render metrics for analytics (if available)
    if (renderTime !== undefined && process.env.NODE_ENV === 'development') {
      console.log(`Render metrics:`, {
        adId,
        renderTime: `${renderTime}ms`,
        rendered,
        viewportVisible,
        renderVerified
      })
    }

    const duration = Date.now() - startTime
    const response = NextResponse.json({ 
      success: true, 
      eventId: event.id,
      metadata: {
        ipAddress,
        renderVerified,
        viewportVisible: viewportVisible ?? null,
        renderTime: renderTime ?? null
      }
    })

    // Log callback
    await logCallback({
      type: 'BEACON',
      endpoint: '/api/webhook/beacon',
      payload: body,
      ipAddress,
      userAgent,
      fingerprint,
      statusCode: 200,
    })

    return response
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Log failed callback
    try {
      const body = await request.json().catch(() => ({}))
      await logCallback({
        type: 'BEACON',
        endpoint: '/api/webhook/beacon',
        payload: body,
        ipAddress: getIpAddress(request),
        userAgent: request.headers.get('user-agent') || undefined,
        statusCode: 500,
        error: errorMessage,
      })
    } catch {}

    console.error('Error in beacon webhook:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: errorMessage
    }, { status: 500 })
  }
}

// Support OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

