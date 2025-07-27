import type { NextApiRequest, NextApiResponse } from 'next';
// CORS removed - using next.config.ts headers instead
// initMiddleware removed - CORS handled by next.config.ts
// originList removed - CORS handled by next.config.ts
import { getGoodLink } from '@/src/utils/good/get-good-link';
import { WalletClient, Address } from 'viem';

// Initialize CORS middleware

  return res.status(200).json({ link: 'https://gooddollar.org/good-link' });

  
} 