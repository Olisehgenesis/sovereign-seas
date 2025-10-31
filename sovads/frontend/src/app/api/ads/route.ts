import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')

    if (!siteId) {
      return NextResponse.json({ error: 'Site ID is required' }, { status: 400 })
    }

    // Get publisher by siteId
    const publisher = await prisma.publisher.findFirst({
      where: {
        id: siteId.replace('site_', '')
      }
    })

    if (!publisher || !publisher.verified) {
      return NextResponse.json({ error: 'Publisher not found or not verified' }, { status: 404 })
    }

    // Get active campaigns with budget remaining
    const campaigns = await prisma.campaign.findMany({
      where: {
        active: true,
        budget: {
          gt: prisma.campaign.fields.spent
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

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

    return NextResponse.json(ad)
  } catch (error) {
    console.error('Error fetching ad:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}