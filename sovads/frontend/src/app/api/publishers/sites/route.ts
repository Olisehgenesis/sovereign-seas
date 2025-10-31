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

    const publisher = await (prisma as any).publisher.findUnique({
      where: { wallet },
      include: {
        sites: true
      }
    })

    if (!publisher) {
      return NextResponse.json({ error: 'Publisher not found' }, { status: 404 })
    }

    return NextResponse.json({
      sites: ((publisher.sites || []) as any[]).map((site: any) => ({
          id: site.id,
          domain: site.domain,
          siteId: site.siteId,
          apiKey: site.apiKey, // Return API key for SDK integration
          verified: site.verified,
          createdAt: site.createdAt
        }))
      })
  } catch (error) {
    console.error('Error fetching publisher sites:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Add a new site
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet, domain } = body

    if (!wallet || !domain) {
      return NextResponse.json({ error: 'Wallet and domain are required' }, { status: 400 })
    }

    // Find or create publisher
    let publisher = await (prisma as any).publisher.findUnique({
      where: { wallet },
      include: { sites: true }
    })

    if (!publisher) {
      // Create publisher first
      publisher = await (prisma as any).publisher.create({
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
      const newSite = await (prisma as any).publisherSite.create({
        data: {
          publisherId: publisher.id,
          domain,
          siteId: `site_${publisher.id}_0`,
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
      // Load sites for existing publisher
      const publisherWithSites = await (prisma as any).publisher.findUnique({
        where: { wallet },
        include: { sites: true }
      })
      
      if (!publisherWithSites) {
        return NextResponse.json({ error: 'Publisher not found' }, { status: 404 })
      }
      
      // Check if site already exists
      const existingSite = ((publisherWithSites.sites || []) as any[]).find((s: any) => s.domain === domain)
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
      const siteCount = ((publisherWithSites.sites || []) as any[]).length
      const newSite = await (prisma as any).publisherSite.create({
        data: {
          publisherId: publisher.id,
          domain,
          siteId: `site_${publisher.id}_${siteCount}`,
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

    const site = await (prisma as any).publisherSite.findUnique({
      where: { id: siteId }
    })

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    await (prisma as any).publisherSite.delete({
      where: { id: siteId }
    })

    return NextResponse.json({ success: true, message: 'Site removed successfully' })
  } catch (error) {
    console.error('Error removing site:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

