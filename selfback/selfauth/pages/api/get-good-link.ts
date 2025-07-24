import type { NextApiRequest, NextApiResponse } from 'next';
import Cors from 'cors';
import { initMiddleware } from '../../lib/init-middleware';
import { originList } from '@/src/utils/origin';
import { getGoodLink } from '@/src/utils/good/get-good-link';
import { WalletClient, Address } from 'viem';

// Initialize CORS middleware
const cors = initMiddleware(
  Cors({
    origin: originList,
    methods: ['POST', 'OPTIONS'],
  })
);

// Mock wallet client for demonstration (real implementation should use a real wallet client)
const mockWalletClient: WalletClient = {
  // ...implement required WalletClient methods or use a real one in production
  chain: undefined,
  account: null,
  getAddresses: async () => [],
  signMessage: async () => '', // This should be replaced with real signing logic
} as any;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await cors(req, res);
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({ link: 'https://gooddollar.org/good-link' });

  
} 