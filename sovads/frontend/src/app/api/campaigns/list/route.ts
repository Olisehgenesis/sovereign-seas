import { NextRequest, NextResponse } from 'next/server'
import { getCollections } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')

    if (!wallet) {
      return NextResponse.json({ error: 'Missing wallet parameter' }, { status: 400 })
    }

    const { advertisers, campaigns } = await getCollections()
    const advertiser = await advertisers.findOne({ wallet })

    if (!advertiser) {
      return NextResponse.json({ campaigns: [] }, { status: 200 })
    }

    const docs = await campaigns
      .find({ advertiserId: advertiser._id })
      .sort({ createdAt: -1 })
      .project({
        name: 1,
        description: 1,
        bannerUrl: 1,
        targetUrl: 1,
        budget: 1,
        spent: 1,
        cpc: 1,
        active: 1,
      })
      .toArray()

    const shaped = docs.map((c: any) => ({
      id: c._id.toString(),
      name: c.name,
      description: c.description,
      bannerUrl: c.bannerUrl,
      targetUrl: c.targetUrl,
      budget: Number(c.budget),
      spent: Number(c.spent ?? 0),
      cpc: Number(c.cpc),
      active: c.active,
    }))

    return NextResponse.json({ campaigns: shaped }, { status: 200 })
  } catch (error) {
    console.error('List campaigns error:', error)
    return NextResponse.json({ error: 'Failed to list campaigns' }, { status: 500 })
  }
}


