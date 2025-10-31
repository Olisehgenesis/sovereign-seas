import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      wallet,
      campaignData,
      transactionHash,
      contractCampaignId
    } = body;

    // Validate required fields
    if (!wallet || !campaignData || !transactionHash || !contractCampaignId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if advertiser exists, create if not
    let advertiser = await prisma.advertiser.findUnique({
      where: { wallet }
    });

    if (!advertiser) {
      advertiser = await prisma.advertiser.create({
        data: {
          wallet,
          name: `Advertiser ${wallet.slice(0, 6)}...`,
          subscriptionActive: true,
          subscriptionDate: new Date(),
          subscriptionPlan: 'basic',
          totalSpent: 0,
        }
      });
    }

    // Parse Decimal values - Prisma Decimal accepts string or number
    const budget = parseFloat(campaignData.budget);
    const cpc = parseFloat(campaignData.cpc || '0.002');
    
    if (isNaN(budget) || budget <= 0) {
      return NextResponse.json(
        { error: 'Invalid budget amount' },
        { status: 400 }
      );
    }
    
    if (isNaN(cpc) || cpc < 0) {
      return NextResponse.json(
        { error: 'Invalid CPC amount' },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.create({
      data: {
        advertiserId: advertiser.id,
        name: campaignData.name,
        description: campaignData.description || null,
        bannerUrl: campaignData.bannerUrl,
        targetUrl: campaignData.targetUrl,
        budget: budget,
        spent: 0,
        cpc: cpc,
        active: true,
        tokenAddress: campaignData.tokenAddress || null,
        metadataURI: JSON.stringify({
          contractCampaignId,
          transactionHash,
          ...campaignData
        }),
      }
    });

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        budget: Number(campaign.budget),
        active: campaign.active
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Database error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log full error details for debugging
    console.error('Full error details:', {
      message: errorMessage,
      stack: errorStack,
      error
    });
    
    return NextResponse.json({ 
      error: 'Failed to save campaign to database',
      details: errorMessage
    }, { status: 500 });
  }
}
