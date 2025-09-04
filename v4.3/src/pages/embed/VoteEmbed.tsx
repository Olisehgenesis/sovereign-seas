import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAccount, useConnect } from 'wagmi';
import { parseEther, formatEther, Address } from 'viem';
import { useVote, useTokenToCeloEquivalent } from '@/hooks/useVotingMethods';
import { useProjectTokenVotes, useSingleProject } from '@/hooks/useProjectMethods';
import { useSingleCampaign } from '@/hooks/useCampaignMethods';
import { supportedTokens } from '@/hooks/useSupportedTokens';
import { Wallet } from 'lucide-react';

const contractAddress = import.meta.env.VITE_CONTRACT_V4 as Address;

const tokenIcons: Record<string, string> = {
  CELO: '/images/celo.png',
  cUSD: '/images/cusd.png',
};

function formatDate(ts: bigint) {
  if (!ts) return '';
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleDateString();
}

export default function VoteEmbed() {
  const { campaignid, projectid } = useParams<{ campaignid: string; projectid: string }>();
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isVoting, setIsVoting] = useState(false);
  const [selectedToken, setSelectedToken] = useState(supportedTokens[0].address);

  const campaignId = campaignid ? BigInt(campaignid) : 0n;
  const projectId = projectid ? BigInt(projectid) : 0n;

  // Fetch campaign details
  const { campaign, isLoading: campaignLoading } = useSingleCampaign(contractAddress, campaignId);
  // Fetch project details for name
  const { project: projectDetails, isLoading: projectDetailsLoading } = useSingleProject(contractAddress, projectId);
  // const { isLoading: projectLoading } = useProjectParticipation(contractAddress, campaignId, projectId);
  const now = Date.now() / 1000;
  const isEnded = campaign && (!campaign.active || now > Number(campaign.endTime));

  // Get token info
  const tokenMeta = supportedTokens.find(t => t.address === selectedToken) || supportedTokens[0];

  // Votes for this project/token
  const { tokenVotes, isLoading } = useProjectTokenVotes(
    contractAddress,
    campaignId,
    projectId,
    selectedToken as `0x${string}`
  );

  // For cUSD, show CELO equivalent
  const { celoEquivalentFormatted } = useTokenToCeloEquivalent(
    contractAddress as `0x${string}`,
    selectedToken as `0x${string}`,
    amount ? parseEther(amount) : 0n
  );

  const { vote, voteWithCelo } = useVote(contractAddress as `0x${string}`);

  const handleVote = async () => {
    setError('');
    setSuccess('');
    if (!isConnected) {
      setError('Connect your wallet to vote.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    setIsVoting(true);
    try {
      if (tokenMeta.symbol === 'CELO') {
        await voteWithCelo({
          campaignId,
          projectId,
          amount: parseEther(amount)
        });
      } else {
        await vote({
          campaignId,
          projectId,
          token: selectedToken as `0x${string}`,
          amount: parseEther(amount)
        });
      }
      setSuccess('Vote cast successfully!');
      setAmount('');
    } catch (e: any) {
      setError(e?.message || 'Voting failed.');
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-green-50 to-white p-2">
      <div className="w-full max-w-md mx-auto rounded-2xl shadow-xl border border-blue-200 p-2 bg-white/90">
        <h2 className="text-xl font-bold text-center mb-1 text-blue-700">
          {projectDetailsLoading ? 'Loading...' : projectDetails?.name || 'Project'}
        </h2>
        <div className="text-xs text-gray-500 text-center mb-2">
          {campaignLoading ? 'Loading...' : campaign?.name || 'Campaign'}
          {campaign && (
            <span> | {campaign.active ? 'Active' : 'Inactive'} | {formatDate(campaign.startTime)} - {formatDate(campaign.endTime)}</span>
          )}
        </div>
        <div className="mb-2 text-center text-gray-700">
          <span className="font-semibold">Project ID:</span> {projectid}
        </div>
        <div className="mb-2 text-center text-gray-700">
          <span className="font-semibold">Campaign ID:</span> {campaignid}
        </div>
        <div className="mb-4 text-center">
          <span className="font-semibold text-green-700">Current Votes ({tokenMeta.symbol}):</span>{' '}
          {isLoading ? 'Loading...' : tokenVotes ? parseFloat(formatEther(tokenVotes)).toFixed(2) : '0.00'}
        </div>
        {/* If campaign ended, show message and no voting UI */}
        {isEnded ? (
          <div className="text-center text-red-500 font-semibold text-lg py-6">Campaign Ended</div>
        ) : (
          <>
            {/* Token select */}
            <div className="mb-3">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Select Token</label>
              <div className="flex gap-2 justify-center">
                {supportedTokens.map(token => (
                  <button
                    key={token.address}
                    onClick={() => setSelectedToken(token.address)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all duration-200 font-semibold text-sm shadow-sm
                      ${selectedToken === token.address
                        ? 'bg-blue-100 border-blue-400 text-blue-700 scale-105'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-blue-50'}
                    `}
                    type="button"
                    disabled={isVoting}
                  >
                    <img src={tokenIcons[token.symbol] || ''} alt={token.symbol} className="w-5 h-5 rounded-full" />
                    {token.symbol}
                  </button>
                ))}
              </div>
            </div>
            {/* Amount input */}
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border-2 border-blue-200 rounded-lg px-3 py-2 mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
              placeholder={`Amount in ${tokenMeta.symbol}`}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              disabled={isVoting}
            />
            {/* Show CELO equivalent if cUSD */}
            {tokenMeta.symbol === 'cUSD' && amount && parseFloat(amount) > 0 && (
              <div className="mb-2 text-xs text-blue-600 text-center">≈ {celoEquivalentFormatted} CELO</div>
            )}
            <button
              className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg py-2 font-semibold hover:from-green-600 hover:to-blue-700 transition disabled:opacity-50 shadow-lg mt-2"
              onClick={handleVote}
              disabled={isVoting || !isConnected}
            >
              {isVoting ? 'Voting...' : `Vote with ${tokenMeta.symbol}`}
            </button>
            {error && <div className="mt-2 text-red-600 text-sm text-center font-semibold">{error}</div>}
            {success && <div className="mt-2 text-green-600 text-sm text-center font-semibold">{success}</div>}
            {/* Connect wallet button if not connected */}
            {!isConnected && (
              <div className="mt-4 flex flex-col items-center">
                <button
                  onClick={() => connect({ connector: connectors[0] })}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-xl font-bold shadow hover:from-blue-600 hover:to-green-600 transition-all text-base"
                >
                  <Wallet className="h-5 w-5" /> Connect Wallet
                </button>
                <div className="text-xs text-gray-400 mt-1">Wallet required to vote</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 