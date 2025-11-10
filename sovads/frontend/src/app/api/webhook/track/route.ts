import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { collections } from '@/lib/db'
import { decryptPayloadServer, verifySignatureServer } from '@/lib/crypto-server'

const EVENT_TYPES = ['IMPRESSION', 'CLICK'] as const
type EventType = (typeof EVENT_TYPES)[number]

const randomId = () => randomUUID()

/**
 * Webhook endpoint for encrypted SDK requests
 * Only accepts encrypted and signed requests from legitimate SDK instances
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey, encrypted, iv, signature, timestamp, siteId } = body as {
      apiKey?: string
      encrypted?: string
      iv?: string
      signature?: string
      timestamp?: number
      siteId?: string
    }

    if (!apiKey || !encrypted || !iv || !signature || !timestamp || !siteId) {
      return NextResponse.json({ 
        error: 'Missing required fields: apiKey, encrypted, iv, signature, timestamp, siteId' 
      }, { status: 400 })
    }

    // Verify timestamp (prevent replay attacks) - allow 5 minute window
    const now = Date.now()
    const timeDiff = Math.abs(now - timestamp)
    if (timeDiff > 5 * 60 * 1000) {
      return NextResponse.json({ 
        error: 'Request timestamp too old or too far in future' 
      }, { status: 400 })
    }

    // Find publisher site by API key
    const publisherSitesCollection = await collections.publisherSites()
    const publishersCollection = await collections.publishers()
    const campaignsCollection = await collections.campaigns()
    const eventsCollection = await collections.events()

    const site = await publisherSitesCollection.findOne({ apiKey })

    if (!site) {
      return NextResponse.json({ 
        error: 'Invalid API key' 
      }, { status: 401 })
    }

    // Verify siteId matches
    if (site.siteId !== siteId) {
      return NextResponse.json({ 
        error: 'Site ID mismatch' 
      }, { status: 401 })
    }

    // Note: In production, apiSecret should be stored hashed and we'd need a different approach
    // For now, we'll assume the secret is stored (this needs to be secured in production)
    // The secret should NEVER be returned to the frontend, only during initial generation
    
    // Decrypt payload (requires the actual secret, not hash)
    // In production, you'd retrieve this from secure storage
    // For now, we'll need to store it temporarily or use a key derivation approach
    
    // TODO: Implement proper secret retrieval from secure storage
    // For MVP, we can verify signature with stored secret hash if we use a different method
    
    // Verify signature first (this is critical for authentication)
    // Signature is created over the encrypted payload + timestamp
    const payloadForVerification = encrypted
    const isValidSignature = await verifySignatureServer(
      payloadForVerification,
      signature,
      site.apiSecret, // API secret (not hashed, stored securely)
      timestamp
    )

    if (!isValidSignature) {
      return NextResponse.json({ 
        error: 'Invalid signature - request not from legitimate SDK' 
      }, { status: 401 })
    }

    // Decrypt the payload
    let decryptedPayload
    try {
      decryptedPayload = await decryptPayloadServer(encrypted, iv, site.apiSecret)
    } catch (error) {
      console.error('Decryption error:', error)
      return NextResponse.json({ 
        error: 'Failed to decrypt payload' 
      }, { status: 400 })
    }

    // Parse decrypted payload
    const {
      type,
      campaignId,
      adId,
      fingerprint,
    } = JSON.parse(decryptedPayload) as {
      type?: EventType
      campaignId?: string
      adId?: string
      fingerprint?: string | null
    }

    if (!type || !campaignId || !adId) {
      return NextResponse.json({ error: 'Missing required fields in decrypted payload' }, { status: 400 })
    }

    // Validate event type
    if (!EVENT_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
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
      siteId: siteId,
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

    if (recentEvents > 100) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    // Create event
    const publisher = await publishersCollection.findOne({ _id: site.publisherId })

    const eventDoc = {
      _id: randomId(),
      type,
      campaignId,
      publisherId: publisher?._id ?? site.publisherId,
      siteId: site.siteId,
      adId,
      ipAddress:
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        request.headers.get('cf-connecting-ip') ||
        request.headers.get('x-client-ip') ||
        'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      fingerprint: fingerprint ?? null,
      verified: true,
      publisherSiteId: site._id,
      timestamp: new Date(),
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
    console.error('Error in webhook track:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

