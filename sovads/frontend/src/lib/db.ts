import 'server-only'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export interface CampaignFormData {
  name: string;
  description: string;
  bannerUrl: string;
  targetUrl: string;
  budget: string;
  cpc: string;
  duration: string;
  tokenAddress: string;
}

export async function saveCampaign(params: {
  wallet: `0x${string}`;
  campaignData: CampaignFormData;
  transactionHash: `0x${string}`;
  contractCampaignId: string;
}) {
  const response = await fetch('/api/campaigns/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    let message = 'Failed to save campaign to database';
    try {
      const data = await response.json();
      message = data?.error || message;
    } catch {}
    throw new Error(message);
  }

  return response.json();
}
