import type { NextApiRequest, NextApiResponse } from 'next';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';
import { EngagementRewardsSDK } from '@goodsdks/engagement-sdk';

const APP_PRIVATE_KEY = (process.env.APP_PRIVATE_KEY as `0x${string}`) || ("0x" as `0x${string}`);
const APP_ADDRESS = (process.env.APP_ADDRESS as `0x${string}`) || ("0x0000000000000000000000000000000000000000" as `0x${string}`);
const REWARDS_CONTRACT = (process.env.REWARDS_CONTRACT as `0x${string}`) || ("0x25db74CF4E7BA120526fd87e159CF656d94bAE43" as `0x${string}`);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { user, validUntilBlock } = req.body as { user?: string; validUntilBlock?: string; inviter?: string };
    if (!user || !validUntilBlock) return res.status(400).json({ error: 'Missing required parameters' });
    if (!APP_PRIVATE_KEY || APP_PRIVATE_KEY === '0x') return res.status(500).json({ error: 'Server not configured' });

    const account = privateKeyToAccount(APP_PRIVATE_KEY);
    const publicClient = createPublicClient({ chain: celo, transport: http() });
    const walletClient = createWalletClient({ chain: celo, transport: http(), account });

    const engagementRewards = new EngagementRewardsSDK(publicClient as any, walletClient as any, REWARDS_CONTRACT);
    const { domain, types, message } = await engagementRewards.prepareAppSignature(
      APP_ADDRESS,
      user as `0x${string}`,
      BigInt(validUntilBlock)
    );

    const signature = await walletClient.signTypedData({ domain, types, primaryType: 'AppClaim', message });
    return res.status(200).json({ signature });
  } catch (error) {
    console.error('sign-claim error', error);
    return res.status(500).json({ error: 'Failed to sign message' });
  }
}


