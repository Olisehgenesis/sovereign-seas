import type { NextApiRequest, NextApiResponse } from 'next';
import Cors from 'cors';
import { initMiddleware } from '../../lib/init-middleware';
import { originList } from '@/src/utils/origin';

// Initialize CORS middleware
const cors = initMiddleware(
  Cors({
    origin: originList,
    methods: ['GET', 'POST', 'OPTIONS'],
  })
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Run the CORS middleware
  await cors(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Add your statistics logic here
  res.status(200).json({
    stats: {
      total: 0,
      verified: 0,
      pending: 0
    }
  });
} 