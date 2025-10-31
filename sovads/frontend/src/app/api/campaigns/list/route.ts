import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')

    if (!wallet) {
      return NextResponse.json({ error: 'Missing wallet parameter' }, { status: 400 })
    }

    const advertiser = await prisma.advertiser.findUnique({
      where: { wallet },
      include: {
        campaigns: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            description: true,
            bannerUrl: true,
            targetUrl: true,
            budget: true,
            spent: true,
            cpc: true,
            active: true,
            tokenAddress: true,
          }
        }
      }
    })

    if (!advertiser) {
      return NextResponse.json({ campaigns: [] }, { status: 200 })
    }

    const campaigns = advertiser.campaigns.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      bannerUrl: c.bannerUrl,
      targetUrl: c.targetUrl,
      budget: Number(c.budget),
      spent: Number(c.spent),
      cpc: Number(c.cpc),
      active: c.active,
      tokenAddress: c.tokenAddress || undefined,
    }))

    return NextResponse.json({ campaigns }, { status: 200 })
  } catch (error) {
    console.error('List campaigns error:', error)
    return NextResponse.json({ error: 'Failed to list campaigns' }, { status: 500 })
  }
}


