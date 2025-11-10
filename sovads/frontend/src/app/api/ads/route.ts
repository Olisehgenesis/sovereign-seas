import { NextRequest, NextResponse } from 'next/server'
import { collections } from '@/lib/db'

// CORS headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')
    const location = searchParams.get('location')?.toLowerCase()

    if (!siteId) {
      return NextResponse.json({ error: 'Site ID is required' }, { status: 400 })
    }

    // Check PublisherSite first (new structure)
    const publisherSitesCollection = await collections.publisherSites()
    const publishersCollection = await collections.publishers()
    const campaignsCollection = await collections.campaigns()

    const publisherSite = await publisherSitesCollection.findOne({ siteId })

    let publisher = null
    if (publisherSite) {
      publisher = await publishersCollection.findOne({ _id: publisherSite.publisherId })
    }

    // If not found in PublisherSite, check Publisher (legacy or direct ID)
    if (!publisher) {
      // Try as direct publisher ID
      publisher = await publishersCollection.findOne({
        $or: [{ _id: siteId }, { _id: siteId.replace('site_', '') }, { domain: siteId }],
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
    const candidatesCursor = campaignsCollection
      .find({ active: true })
      .sort({ createdAt: -1 })
      .limit(50)

    const candidateCampaigns = await candidatesCursor.toArray()
    const campaigns = candidateCampaigns
      .filter((campaign) => campaign.budget > campaign.spent)
      .filter((campaign) => {
        if (!location) return true
        if (!campaign.targetLocations || campaign.targetLocations.length === 0) return true
        return campaign.targetLocations.some(
          (loc) => typeof loc === 'string' && loc.toLowerCase() === location
        )
      })
      .slice(0, 10)

    if (campaigns.length === 0) {
      return NextResponse.json({ error: 'No active campaigns available' }, { status: 404 })
    }

    // Select random campaign
    const randomCampaign = campaigns[Math.floor(Math.random() * campaigns.length)]

    // Create ad response
    const ad = {
      id: `ad_${randomCampaign._id}`,
      campaignId: randomCampaign._id,
      name: randomCampaign.name,
      description: randomCampaign.description ?? '',
      bannerUrl: randomCampaign.bannerUrl,
      targetUrl: randomCampaign.targetUrl,
      cpc: randomCampaign.cpc.toString(),
      tags: randomCampaign.tags ?? [],
      targetLocations: randomCampaign.targetLocations ?? [],
      metadata: randomCampaign.metadata ?? null,
      startDate: randomCampaign.startDate ?? null,
      endDate: randomCampaign.endDate ?? null,
      mediaType: randomCampaign.mediaType ?? 'image',
    }

    return NextResponse.json(ad, { headers: corsHeaders })
  } catch (error) {
    console.error('Error fetching ad:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}