// pages/api/sign-claim.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';
import { EngagementRewardsSDK, REWARDS_CONTRACT } from '@goodsdks/engagement-sdk';

// Basic CORS middleware (aligned with pages/api/verify.ts)
const corsMiddleware = (req: NextApiRequest, res: NextApiResponse) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
};

// Lazily create SDK instance so we don't re-create on every request
let sdk: EngagementRewardsSDK | null = null;

function getSdk(): EngagementRewardsSDK {
  if (sdk) return sdk;

  const appPrivateKey = process.env.APP_PRIVATE_KEY as `0x${string}` | undefined;
  const rewardsContract = (process.env.REWARDS_CONTRACT as `0x${string}` | undefined) || (REWARDS_CONTRACT as `0x${string}`);

  if (!appPrivateKey) {
    throw new Error('Missing APP_PRIVATE_KEY env variable');
  }

  const account = privateKeyToAccount(appPrivateKey);
  const transport = http(process.env.CELO_RPC_URL || undefined);

  const publicClient = createPublicClient({ chain: celo, transport });
  const walletClient = createWalletClient({ chain: celo, transport, account: account });

  sdk = new EngagementRewardsSDK(publicClient as any, walletClient as any, rewardsContract);
  return sdk;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (corsMiddleware(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user, validUntilBlock, inviter } = req.body || {};

    if (!user || !validUntilBlock) {
      return res.status(400).json({ error: 'Missing required parameters: user, validUntilBlock' });
    }

    const appAddress = process.env.APP_ADDRESS as `0x${string}` | undefined;
    if (!appAddress) {
      return res.status(500).json({ error: 'Missing APP_ADDRESS env variable' });
    }

    const engagementRewards = getSdk();

    // Prepare EIP-712 typed data for the app signature
    const { domain, types, message } = await engagementRewards.prepareAppSignature(
      appAddress,
      user as `0x${string}`,
      BigInt(validUntilBlock)
    );

    const account = privateKeyToAccount(process.env.APP_PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({ chain: celo, transport: http(process.env.CELO_RPC_URL || undefined), account });

    const signature = await (walletClient as any).signTypedData({
      domain,
      types,
      primaryType: 'AppClaim',
      message
    });

    // Optional: basic logging for auditability (avoid sensitive data)
    console.log('Signed app claim', {
      app: appAddress,
      user,
      inviter: inviter || null,
      validUntilBlock,
      domain,
      primaryType: 'AppClaim',
      typesKeys: Object.keys(types || {}),
      message
    });

    return res.status(200).json({ signature });
  } catch (error) {
    console.error('Error signing claim:', error);
    try {
      console.error('Error details', JSON.stringify(error, null, 2));
    } catch {}
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}