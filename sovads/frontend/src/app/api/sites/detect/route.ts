import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { domain, fingerprint, userAgent, timestamp } = await request.json()

    if (!domain) {
      return NextResponse.json({ 
        error: 'Domain is required' 
      }, { status: 400 })
    }

    // Check if site already exists
    let site = await prisma.publisher.findFirst({
      where: { 
        domain: domain,
        verified: true 
      }
    })

    if (site) {
      return NextResponse.json({ 
        siteId: site.id,
        domain: site.domain,
        verified: site.verified
      })
    }

    // Check for unverified site
    let unverifiedSite = await prisma.publisher.findFirst({
      where: { 
        domain: domain,
        verified: false 
      }
    })

    if (unverifiedSite) {
      return NextResponse.json({ 
        siteId: unverifiedSite.id,
        domain: unverifiedSite.domain,
        verified: unverifiedSite.verified,
        message: 'Site exists but not verified'
      })
    }

    // Generate a temporary site ID for new domains
    const tempSiteId = `temp_${btoa(domain).substring(0, 8)}_${Date.now()}`
    
    return NextResponse.json({ 
      siteId: tempSiteId,
      domain: domain,
      verified: false,
      message: 'New site detected - please register to start earning'
    })

  } catch (error) {
    console.error('Error detecting site:', error)
    return NextResponse.json({ 
      error: 'Failed to detect site' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain')

    if (!domain) {
      return NextResponse.json({ 
        error: 'Domain parameter is required' 
      }, { status: 400 })
    }

    const site = await prisma.publisher.findFirst({
      where: { domain },
      select: {
        id: true,
        domain: true,
        verified: true,
        totalEarned: true,
        createdAt: true
      }
    })

    if (!site) {
      return NextResponse.json({ 
        error: 'Site not found' 
      }, { status: 404 })
    }

    return NextResponse.json({ site })
  } catch (error) {
    console.error('Error fetching site:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch site' 
    }, { status: 500 })
  }
}
