import { NextRequest, NextResponse } from 'next/server'
import { collections } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')

    if (!wallet) {
      return NextResponse.json({ error: 'Missing wallet parameter' }, { status: 400 })
    }

    const advertisersCollection = await collections.advertisers()
    const campaignsCollection = await collections.campaigns()

    const advertiser = await advertisersCollection.findOne({ wallet })

    if (!advertiser) {
      return NextResponse.json({ campaigns: [] }, { status: 200 })
    }

    const campaignsCursor = campaignsCollection
      .find({ advertiserId: advertiser._id })
      .sort({ createdAt: -1 })

    const campaigns = await campaignsCursor
      .map((campaign) => ({
        id: campaign._id,
        name: campaign.name,
        description: campaign.description ?? undefined,
        bannerUrl: campaign.bannerUrl,
        targetUrl: campaign.targetUrl,
        budget: campaign.budget,
        spent: campaign.spent,
        cpc: campaign.cpc,
        active: campaign.active,
        tokenAddress: campaign.tokenAddress ?? undefined,
        tags: campaign.tags ?? [],
        targetLocations: campaign.targetLocations ?? [],
        metadata: campaign.metadata ?? undefined,
        startDate: campaign.startDate ?? null,
        endDate: campaign.endDate ?? null,
        mediaType: campaign.mediaType ?? 'image',
      }))
      .toArray()

    return NextResponse.json({ campaigns }, { status: 200 })
  } catch (error) {
    console.error('List campaigns error:', error)
    return NextResponse.json({ error: 'Failed to list campaigns' }, { status: 500 })
  }
}


