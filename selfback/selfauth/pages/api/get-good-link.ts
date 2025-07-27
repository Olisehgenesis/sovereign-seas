import type { NextApiRequest, NextApiResponse } from 'next';
import { getGoodLink } from '@/src/utils/good/get-good-link';
import { WalletClient, Address } from 'viem';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({ link: 'https://gooddollar.org/good-link' });
} 