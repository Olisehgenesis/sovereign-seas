import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { collections } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      wallet,
      campaignData,
      transactionHash,
      contractCampaignId,
      startDate,
      endDate,
    } = body

    if (!wallet || !campaignData || !transactionHash || !contractCampaignId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const advertisersCollection = await collections.advertisers()
    const campaignsCollection = await collections.campaigns()

    let advertiser = await advertisersCollection.findOne({ wallet })
    const now = new Date()

    if (!advertiser) {
      advertiser = {
        _id: randomUUID(),
        wallet,
        name: `Advertiser ${wallet.slice(0, 6)}...`,
        subscriptionActive: true,
        subscriptionDate: now,
        subscriptionPlan: 'basic',
        totalSpent: 0,
        createdAt: now,
        updatedAt: now,
        email: undefined,
        company: undefined,
      }
      await advertisersCollection.insertOne(advertiser)
    } else {
      await advertisersCollection.updateOne(
        { _id: advertiser._id },
        { $set: { updatedAt: now } }
      )
    }

    const budget = Number.parseFloat(campaignData.budget)
    const cpc = Number.parseFloat(campaignData.cpc || '0.002')

    if (Number.isNaN(budget) || budget <= 0) {
      return NextResponse.json({ error: 'Invalid budget amount' }, { status: 400 })
    }

    if (Number.isNaN(cpc) || cpc < 0) {
      return NextResponse.json({ error: 'Invalid CPC amount' }, { status: 400 })
    }

    const tags: string[] = Array.isArray(campaignData.tags)
      ? campaignData.tags
      : typeof campaignData.tags === 'string'
        ? campaignData.tags
            .split(',')
            .map((tag: string) => tag.trim())
            .filter((tag: string) => tag.length > 0)
        : []

    const targetLocations: string[] = Array.isArray(campaignData.targetLocations)
      ? campaignData.targetLocations
      : typeof campaignData.targetLocations === 'string'
        ? campaignData.targetLocations
            .split(',')
            .map((loc: string) => loc.trim())
            .filter((loc: string) => loc.length > 0)
        : []

    const metadata =
      typeof campaignData.metadata === 'object' && campaignData.metadata !== null
        ? campaignData.metadata
        : undefined

    const mediaType: 'image' | 'video' =
      campaignData.mediaType === 'video' ? 'video' : 'image'

    const campaignId = randomUUID()
    const startDateValue = startDate ? new Date(startDate) : undefined
    const endDateValue = endDate ? new Date(endDate) : undefined

    const campaignDoc = {
      _id: campaignId,
      advertiserId: advertiser._id,
      name: campaignData.name,
      description: campaignData.description || null,
      bannerUrl: campaignData.bannerUrl,
      targetUrl: campaignData.targetUrl,
      budget,
      spent: 0,
      cpc,
      active: true,
      tokenAddress: campaignData.tokenAddress || null,
      metadataURI: JSON.stringify({
        contractCampaignId,
        transactionHash,
        startDate: startDateValue?.toISOString(),
        endDate: endDateValue?.toISOString(),
        tags,
        targetLocations,
        metadata,
        mediaType,
      }),
      tags,
      targetLocations,
      metadata,
      startDate: startDateValue,
      endDate: endDateValue,
      mediaType,
      createdAt: now,
      updatedAt: now,
    }

    await campaignsCollection.insertOne(campaignDoc)

    return NextResponse.json(
      {
        success: true,
        campaign: {
          id: campaignId,
          name: campaignDoc.name,
          budget: campaignDoc.budget,
          active: campaignDoc.active,
          tags,
          targetLocations,
          mediaType,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Database error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        error: 'Failed to save campaign to database',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
