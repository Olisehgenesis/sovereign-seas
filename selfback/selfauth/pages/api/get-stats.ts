import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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