import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { collections } from '@/lib/db'

/**
 * Publisher registration API
 * Note: This only saves to database. 
 * To register on-chain, use the subscribePublisher function from useAds hook
 * which calls the SovAdsManager contract's subscribePublisher function.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet, domain } = body

    if (!wallet || !domain) {
      return NextResponse.json({ error: 'Wallet and domain are required' }, { status: 400 })
    }

    const publishersCollection = await collections.publishers()
    const existingPublisher = await publishersCollection.findOne({ wallet })

    if (existingPublisher) {
      return NextResponse.json({ 
        success: true, 
        id: existingPublisher._id,
        siteId: `site_${existingPublisher._id}`,
        domain: existingPublisher.domain,
        verified: existingPublisher.verified 
      })
    }

    // Create new publisher in database
    // NOTE: To register on-chain, call subscribePublisher from useAds hook
    const now = new Date()
    const publisher = {
      _id: randomUUID(),
      wallet,
      domain,
      verified: false,
      totalEarned: 0,
      createdAt: now,
      updatedAt: now,
    }
    await publishersCollection.insertOne(publisher)

    return NextResponse.json({ 
      success: true,
      id: publisher._id,
      siteId: `site_${publisher._id}`,
      domain: publisher.domain,
      verified: false,
      note: 'Register on-chain using subscribePublisher from useAds hook'
    })
  } catch (error) {
    console.error('Error registering publisher:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 })
    }

    const publishersCollection = await collections.publishers()
    const publisher = await publishersCollection.findOne({ wallet })

    if (!publisher) {
      return NextResponse.json({ error: 'Publisher not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: publisher._id,
      wallet: publisher.wallet,
      domain: publisher.domain,
      verified: publisher.verified,
      totalEarned: publisher.totalEarned,
      createdAt: publisher.createdAt,
      updatedAt: publisher.updatedAt,
    })
  } catch (error) {
    console.error('Error fetching publisher:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}