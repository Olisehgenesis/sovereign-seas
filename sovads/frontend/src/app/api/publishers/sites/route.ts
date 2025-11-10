import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { collections } from '@/lib/db'
import { generateApiKeyServer, generateSecretServer } from '@/lib/crypto-server'

// Get all sites for a publisher
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 })
    }

    const publishersCollection = await collections.publishers()
    const publisherSitesCollection = await collections.publisherSites()

    const publisher = await publishersCollection.findOne({ wallet })

    if (!publisher) {
      return NextResponse.json({ error: 'Publisher not found' }, { status: 404 })
    }

    const sites = await publisherSitesCollection
      .find({ publisherId: publisher._id })
      .sort({ createdAt: -1 })
      .toArray()

    const normalizedSites = sites.map((site) => ({
      id: site._id,
      domain: site.domain,
      siteId: site.siteId,
      apiKey: site.apiKey,
      verified: site.verified,
      createdAt: site.createdAt,
    }))

    return NextResponse.json({ sites: normalizedSites })
  } catch (error) {
    console.error('Error fetching publisher sites:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Add a new site
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<{ wallet: string; domain: string }>
    const { wallet, domain } = body

    if (!wallet || !domain) {
      return NextResponse.json({ error: 'Wallet and domain are required' }, { status: 400 })
    }

    const publishersCollection = await collections.publishers()
    const publisherSitesCollection = await collections.publisherSites()

    const existingPublisher = await publishersCollection.findOne({ wallet })

    if (!existingPublisher) {
      // Create publisher first
      const now = new Date()
      const publisherId = randomUUID()
      const newPublisher = {
        _id: publisherId,
        wallet,
        domain,
        verified: false,
        totalEarned: 0,
        createdAt: now,
        updatedAt: now,
        sites: [],
      }
      await publishersCollection.insertOne(newPublisher)
      
      // Generate API credentials for SDK authentication
      const apiKey = generateApiKeyServer()
      const apiSecret = generateSecretServer() // Store plain secret for decryption (secure this in production!)
      
      // Create first site  
      const siteId = randomUUID()
      const newSite = {
        _id: siteId,
        publisherId,
        domain,
        siteId: `site_${publisherId}_0`,
        apiKey,
        apiSecret,
        verified: false,
        createdAt: now,
        updatedAt: now,
      }
      await publisherSitesCollection.insertOne(newSite)
      
      return NextResponse.json({
        success: true,
        site: {
          id: newSite._id,
          domain: newSite.domain,
          siteId: newSite.siteId,
          verified: newSite.verified,
          createdAt: newSite.createdAt
        }
      })
    } else {
      const sites = await publisherSitesCollection
        .find({ publisherId: existingPublisher._id })
        .toArray()

      // Check if site already exists
      const existingSite = sites.find((site) => site.domain === domain)
      if (existingSite) {
        return NextResponse.json({
          error: 'Site already registered',
          site: {
            id: existingSite._id,
            domain: existingSite.domain,
            siteId: existingSite.siteId,
            verified: existingSite.verified
          }
        }, { status: 409 })
      }

      // Generate API credentials for SDK authentication
      const apiKey = generateApiKeyServer()
      const apiSecret = generateSecretServer() // Store plain secret for decryption (secure this in production!)
      
      // Add new site
      const siteCount = sites.length
      const newSite = {
        _id: randomUUID(),
        publisherId: existingPublisher._id,
        domain,
        siteId: `site_${existingPublisher._id}_${siteCount}`,
        apiKey,
        apiSecret,
        verified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      await publisherSitesCollection.insertOne(newSite)

      return NextResponse.json({
        success: true,
        site: {
          id: newSite._id,
          domain: newSite.domain,
          siteId: newSite.siteId,
          apiKey: newSite.apiKey,
          apiSecret: apiSecret, // Return secret once - frontend should store this securely
          verified: newSite.verified,
          createdAt: newSite.createdAt
        }
      })
    }
  } catch (error) {
    console.error('Error adding site:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete a site
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')

    if (!siteId) {
      return NextResponse.json({ error: 'Site ID is required' }, { status: 400 })
    }

    const publisherSitesCollection = await collections.publisherSites()
    const site = await publisherSitesCollection.findOne({ _id: siteId })

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    await publisherSitesCollection.deleteOne({ _id: siteId })

    return NextResponse.json({ success: true, message: 'Site removed successfully' })
  } catch (error) {
    console.error('Error removing site:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

