//add api route to claim and vote for a user with reeor logoong
import type { NextApiRequest, NextApiResponse } from 'next';
import { claimAndVoteForUser, getContractStats, getCampaignStats, getProjectStats, walletBalance, getContractBalance } from '../../src/utils/claims';
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

const testnetEnabled = process.env.TESTNET_ENABLED === 'true';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Run the CORS middleware
  await cors(req, res);

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }

  //get method in req.query
  const { method } = req.query;

  if (method === 'getContractStats') {
    const returnData = await getContractStats();
    return res.status(200).json(returnData);
  }
  if (method === 'getCampaignStats') {
    const { campaignId } = req.query;
    if (!campaignId || Array.isArray(campaignId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid campaignId parameter'
      });
    }
    const returnData = await getCampaignStats(parseInt(campaignId, 10));
    return res.status(200).json(returnData);
  }
  if (method === 'getProjectStats') {
    const { projectId } = req.query;
    if (!projectId || Array.isArray(projectId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid projectId parameter'
      });
    }
    const returnData = await getProjectStats(parseInt(projectId, 10));
    return res.status(200).json(returnData);
  }
  if (method === 'getContractBalance') {
    const returnData = await getContractBalance();
    return res.status(200).json(returnData);
  }
  if (method === 'walletBalance') {
    const { address } = req.query;
    if (!address || Array.isArray(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address parameter'
      });
    }
    const returnData = await walletBalance(address);
    return res.status(200).json(returnData);
  }
}
