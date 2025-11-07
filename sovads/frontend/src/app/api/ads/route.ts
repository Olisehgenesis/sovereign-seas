import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// CORS headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')

    if (!siteId) {
      return NextResponse.json({ error: 'Site ID is required' }, { status: 400 })
    }

    // Check PublisherSite first (new structure)
    const publisherSite = await prisma.publisherSite.findUnique({
      where: { siteId },
      include: { publisher: true }
    })

    let publisher = publisherSite?.publisher ?? null

    // If not found in PublisherSite, check Publisher (legacy or direct ID)
    if (!publisher) {
      // Try as direct publisher ID
      publisher = await prisma.publisher.findFirst({
        where: {
          OR: [
            { id: siteId },
            { id: siteId.replace('site_', '') },
            { domain: siteId }
          ]
        }
      })
    }

    // Allow temp site IDs for development/testing
    if (!publisher && !publisherSite) {
      if (siteId.startsWith('site_') || siteId.startsWith('temp_')) {
        if (process.env.NODE_ENV === 'development') {
          // In development, allow unknown sites
        } else {
          return NextResponse.json({ error: 'Publisher not found or not verified' }, { status: 404 })
        }
      } else {
        return NextResponse.json({ error: 'Publisher not found or not verified' }, { status: 404 })
      }
    }

    if (publisher && !publisher.verified && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Publisher not verified' }, { status: 403 })
    }

    // Get active campaigns with budget remaining
    // Using raw query to compare budget > spent (Prisma doesn't support field comparisons directly)
    const allCampaigns = await prisma.campaign.findMany({
      where: {
        active: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Get more to filter by budget
    })

    // Filter campaigns where budget > spent
    const campaigns = allCampaigns
      .filter((campaign) => Number(campaign.budget) > Number(campaign.spent))
      .slice(0, 10)

    if (campaigns.length === 0) {
      return NextResponse.json({ error: 'No active campaigns available' }, { status: 404 })
    }

    // Select random campaign
    const randomCampaign = campaigns[Math.floor(Math.random() * campaigns.length)]

    // Create ad response
    const ad = {
      id: `ad_${randomCampaign.id}`,
      campaignId: randomCampaign.id,
      name: randomCampaign.name,
      bannerUrl: randomCampaign.bannerUrl,
      targetUrl: randomCampaign.targetUrl,
      cpc: randomCampaign.cpc.toString()
    }

    return NextResponse.json(ad, { headers: corsHeaders })
  } catch (error) {
    console.error('Error fetching ad:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}