import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateApiKeyServer, generateSecretServer } from '@/lib/crypto-server'

// Get all sites for a publisher
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 })
    }

    const publisher = await prisma.publisher.findUnique({
      where: { wallet },
      include: {
        sites: true
      }
    })

    if (!publisher) {
      return NextResponse.json({ error: 'Publisher not found' }, { status: 404 })
    }

    const sites = (publisher.sites ?? []).map((site) => ({
      id: site.id,
      domain: site.domain,
      siteId: site.siteId,
      apiKey: site.apiKey,
      verified: site.verified,
      createdAt: site.createdAt,
    }))

    return NextResponse.json({ sites })
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

    // Find or create publisher
    const existingPublisher = await prisma.publisher.findUnique({
      where: { wallet },
      include: { sites: true }
    })

    if (!existingPublisher) {
      // Create publisher first
      const newPublisher = await prisma.publisher.create({
        data: {
          wallet,
          domain, // Legacy field for backwards compatibility
          verified: false,
          totalEarned: 0,
        },
        include: { sites: true }
      })
      
      // Generate API credentials for SDK authentication
      const apiKey = generateApiKeyServer()
      const apiSecret = generateSecretServer() // Store plain secret for decryption (secure this in production!)
      
      // Create first site  
      const newSite = await prisma.publisherSite.create({
        data: {
          publisherId: newPublisher.id,
          domain,
          siteId: `site_${newPublisher.id}_0`,
          apiKey,
          apiSecret, // TODO: In production, encrypt this or use secure storage
          verified: false
        }
      })
      
      return NextResponse.json({
        success: true,
        site: {
          id: newSite.id,
          domain: newSite.domain,
          siteId: newSite.siteId,
          verified: newSite.verified,
          createdAt: newSite.createdAt
        }
      })
    } else {
      // Check if site already exists
      const existingSite = (existingPublisher.sites ?? []).find((site) => site.domain === domain)
      if (existingSite) {
        return NextResponse.json({
          error: 'Site already registered',
          site: {
            id: existingSite.id,
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
      const siteCount = (existingPublisher.sites ?? []).length
      const newSite = await prisma.publisherSite.create({
        data: {
          publisherId: existingPublisher.id,
          domain,
          siteId: `site_${existingPublisher.id}_${siteCount}`,
          apiKey,
          apiSecret, // TODO: In production, encrypt this or use secure storage
          verified: false
        }
      })

      return NextResponse.json({
        success: true,
        site: {
          id: newSite.id,
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

    const site = await prisma.publisherSite.findUnique({
      where: { id: siteId }
    })

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    await prisma.publisherSite.delete({
      where: { id: siteId }
    })

    return NextResponse.json({ success: true, message: 'Site removed successfully' })
  } catch (error) {
    console.error('Error removing site:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

