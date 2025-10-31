import { NextRequest, NextResponse } from 'next/server'
import { getCollections } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet, domain } = body

    if (!wallet || !domain) {
      return NextResponse.json({ error: 'Wallet and domain are required' }, { status: 400 })
    }

    const { publishers } = await getCollections()
    const existingPublisher = await publishers.findOne({ wallet })

    if (existingPublisher) {
      return NextResponse.json({ 
        success: true, 
        siteId: `site_${existingPublisher.id}`,
        verified: existingPublisher.verified 
      })
    }

    // Create new publisher
    const doc = {
      wallet,
      domain,
      verified: false,
      totalEarned: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const res = await publishers.insertOne(doc as any)
    const publisher = { _id: res.insertedId, ...doc }

    return NextResponse.json({ 
      success: true, 
      siteId: `site_${publisher.id}`,
      verified: false 
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

    const { publishers } = await getCollections()
    const publisher = await publishers.findOne({ wallet })

    if (!publisher) {
      return NextResponse.json({ error: 'Publisher not found' }, { status: 404 })
    }

    return NextResponse.json(publisher)
  } catch (error) {
    console.error('Error fetching publisher:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}