import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// CORS headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

export async function POST(request: NextRequest) {
  try {
    const { domain } = (await request.json()) as { domain?: string }

    if (!domain) {
      return NextResponse.json({ 
        error: 'Domain is required' 
      }, { status: 400, headers: corsHeaders })
    }

    // Check PublisherSite first (new structure)
    const publisherSite = await prisma.publisherSite.findFirst({
      where: { domain },
      include: { publisher: true }
    })

    if (publisherSite) {
      return NextResponse.json({ 
        siteId: publisherSite.siteId,
        domain: publisherSite.domain,
        verified: publisherSite.publisher?.verified || false
      }, { headers: corsHeaders })
    }

    // Check if site already exists in Publisher (legacy)
    const site = await prisma.publisher.findFirst({
      where: { 
        domain,
        verified: true 
      }
    })

    if (site) {
      return NextResponse.json({ 
        siteId: site.id,
        domain: site.domain,
        verified: site.verified
      }, { headers: corsHeaders })
    }

    // Check for unverified site
    const unverifiedSite = await prisma.publisher.findFirst({
      where: { 
        domain,
        verified: false 
      }
    })

    if (unverifiedSite) {
      return NextResponse.json({ 
        siteId: unverifiedSite.id,
        domain: unverifiedSite.domain,
        verified: unverifiedSite.verified,
        message: 'Site exists but not verified'
      }, { headers: corsHeaders })
    }

    // Generate a temporary site ID for new domains
    const tempSiteId = `temp_${btoa(domain).substring(0, 8)}_${Date.now()}`
    
    return NextResponse.json({ 
      siteId: tempSiteId,
      domain: domain,
      verified: false,
      message: 'New site detected - please register to start earning'
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Error detecting site:', error)
    return NextResponse.json({ 
      error: 'Failed to detect site' 
    }, { status: 500, headers: corsHeaders })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain')

    if (!domain) {
      return NextResponse.json({ 
        error: 'Domain parameter is required' 
      }, { status: 400, headers: corsHeaders })
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
      }, { status: 404, headers: corsHeaders })
    }

    return NextResponse.json({ site }, { headers: corsHeaders })
  } catch (error) {
    console.error('Error fetching site:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch site' 
    }, { status: 500, headers: corsHeaders })
  }
}
