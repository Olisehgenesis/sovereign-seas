//add api route to claim and vote for a user with reeor logoong
import type { NextApiRequest, NextApiResponse } from 'next';
import { claimAndVoteForUser, getContractStats, getCampaignStats, getProjectStats, walletBalance, getContractBalance } from '../../src/utils/claims';
// CORS removed - using next.config.ts headers instead
// initMiddleware removed - CORS handled by next.config.ts
// originList removed - CORS handled by next.config.ts
import { isWalletGoodDollarVerified } from './verify-details';

// Initialize CORS middleware
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

  if (method === 'claimDetails') {
    const { wallet } = req.body;
    if (!wallet) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    const isVerified = await isWalletGoodDollarVerified(wallet);
    if (!isVerified) {
      return res.status(403).json({ error: 'Wallet is not verified by GoodDollar. Cannot claim.' });
    }
    // Here you can add logic to record the claim, return claimable details, etc.
    return res.status(200).json({ success: true, message: 'Claim successful. Wallet is verified by GoodDollar.' });
  }
}
