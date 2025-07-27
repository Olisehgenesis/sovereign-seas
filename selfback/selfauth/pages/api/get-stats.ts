import type { NextApiRequest, NextApiResponse } from 'next';
// CORS removed - using next.config.ts headers instead
// initMiddleware removed - CORS handled by next.config.ts
// originList removed - CORS handled by next.config.ts

// Initialize CORS middleware

  // Add your statistics logic here
  res.status(200).json({
    stats: {
      total: 0,
      verified: 0,
      pending: 0
    }
  });
} 