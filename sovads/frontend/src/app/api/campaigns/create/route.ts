import { NextRequest, NextResponse } from 'next/server';
import { getCollections } from '@/lib/db';

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

    const { advertisers, campaigns } = await getCollections()

    // Check if advertiser exists, create if not
    let advertiser = await advertisers.findOne({ wallet })
    if (!advertiser) {
      const doc = {
        wallet,
        name: `Advertiser ${wallet.slice(0, 6)}...`,
        subscriptionActive: true,
        subscriptionDate: new Date(),
        subscriptionPlan: 'basic',
        totalSpent: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const res = await advertisers.insertOne(doc as any)
      advertiser = { _id: res.insertedId, ...doc }
    }

    const campaignDoc = {
      advertiserId: advertiser._id,
      name: campaignData.name,
      description: campaignData.description,
      bannerUrl: campaignData.bannerUrl,
      targetUrl: campaignData.targetUrl,
      budget: parseFloat(campaignData.budget),
      spent: 0,
      cpc: parseFloat(campaignData.cpc),
      active: true,
      metadataURI: JSON.stringify({
        contractCampaignId,
        transactionHash,
        ...campaignData
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const created = await campaigns.insertOne(campaignDoc as any)
    const id = created.insertedId.toString()

    return NextResponse.json({
      success: true,
      campaign: {
        id,
        name: campaignDoc.name,
        budget: campaignDoc.budget,
        active: campaignDoc.active
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ 
      error: 'Failed to save campaign to database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
