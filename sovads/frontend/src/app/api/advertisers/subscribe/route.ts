import { NextRequest, NextResponse } from 'next/server'
import { getCollections } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { wallet, email, company, plan } = await request.json()

    if (!wallet || !email || !company || !plan) {
      return NextResponse.json({ 
        error: 'Wallet, email, company, and plan are required' 
      }, { status: 400 })
    }

    const { advertisers } = await getCollections()
    let advertiser = await advertisers.findOne({ wallet })

    if (advertiser) {
      // Update subscription plan
      await advertisers.updateOne(
        { wallet },
        { $set: {
          email,
          company,
          subscriptionPlan: plan,
          subscriptionActive: true,
          subscriptionDate: new Date(),
          updatedAt: new Date(),
        } }
      )
      advertiser = await advertisers.findOne({ wallet })
      return NextResponse.json({ 
        message: 'Subscription updated successfully', 
        advertiser 
      }, { status: 200 })
    }

    // Create new advertiser subscription
    const doc = {
      wallet,
      email,
      company,
      subscriptionPlan: plan,
      subscriptionActive: true,
      subscriptionDate: new Date(),
      totalSpent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await advertisers.insertOne(doc as any)
    advertiser = await advertisers.findOne({ wallet })

    return NextResponse.json({ 
      message: 'Subscription created successfully', 
      advertiser 
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating subscription:', error)
    return NextResponse.json({ 
      error: 'Failed to create subscription' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')

    if (!wallet) {
      return NextResponse.json({ 
        error: 'Wallet address is required' 
      }, { status: 400 })
    }

    const { advertisers } = await getCollections()
    const advertiser = await advertisers.findOne({ wallet })

    if (!advertiser) {
      return NextResponse.json({ 
        error: 'Advertiser not found' 
      }, { status: 404 })
    }

    return NextResponse.json({ advertiser })
  } catch (error) {
    console.error('Error fetching advertiser:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch advertiser' 
    }, { status: 500 })
  }
}
