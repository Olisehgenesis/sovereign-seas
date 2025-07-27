import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
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