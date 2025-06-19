import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAccount, useConnect, useReadContracts } from 'wagmi';
import { parseEther, formatEther, Address, Abi } from 'viem';
import { useVote, useTokenToCeloEquivalent } from '@/hooks/useVotingMethods';
import { useCampaignProjects, useProjectTokenVotes } from '@/hooks/useProjectMethods';
import { useSingleCampaign } from '@/hooks/useCampaignMethods';
import { supportedTokens } from '@/hooks/useSupportedTokens';
import { Wallet, Trophy } from 'lucide-react';
import { contractABI } from '@/abi/seas4ABI';

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

// Helper for badge color/icon
function getBadgeStyle(idx: number) {
  if (idx === 0) {
    return {
      bg: 'from-yellow-400 via-yellow-300 to-yellow-500',
      border: 'border-yellow-400',
      icon: <Trophy className="w-4 h-4 text-yellow-700 drop-shadow" />, // gold
      animate: 'animate-pulse'
    };
  } else if (idx === 1) {
    return {
      bg: 'from-gray-400 via-gray-300 to-gray-500',
      border: 'border-gray-400',
      icon: <Trophy className="w-4 h-4 text-gray-700" />, // silver
      animate: ''
    };
  } else if (idx === 2) {
    return {
      bg: 'from-amber-700 via-amber-400 to-amber-500',
      border: 'border-amber-700',
      icon: <Trophy className="w-4 h-4 text-amber-900" />, // bronze
      animate: ''
    };
  }
  return {
    bg: 'from-blue-400 via-blue-300 to-blue-500',
    border: 'border-blue-400',
    icon: null,
    animate: ''
  };
}

export default function CampaignEmbed() {
  const { campaignid } = useParams<{ campaignid: string }>();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const campaignId = campaignid ? BigInt(campaignid) : 0n;
  const { campaignProjects, isLoading } = useCampaignProjects(contractAddress, campaignId);
  const { campaign, isLoading: campaignLoading } = useSingleCampaign(contractAddress, campaignId);
  const now = Date.now() / 1000;
  const isEnded = campaign && (!campaign.active || now > Number(campaign.endTime));

  // State for each project: amount, error, success, isVoting, selectedToken
  const [voteState, setVoteState] = useState<Record<string, { amount: string; error: string; success: string; isVoting: boolean; selectedToken: string }>>({});
  // Store vote counts for sorting
  const [projectVotes, setProjectVotes] = useState<Record<string, number>>({});
  const { vote, voteWithCelo } = useVote(contractAddress);

  // Get all project IDs and selected tokens
  const projectIds = (campaignProjects || []).filter(Boolean).map((p: any) => p.id);
  const selectedTokens = projectIds.map((id: any) => {
    const key = id.toString();
    return (voteState[key]?.selectedToken as `0x${string}`) || supportedTokens[0].address;
  });

  // Prepare contracts for batch read (use imported contractABI)
  const voteContracts = projectIds.map((id: any, idx: number) => ({
    address: contractAddress,
    abi: contractABI as Abi,
    functionName: 'getProjectTokenVotes',
    args: [campaignId, id, selectedTokens[idx]]
  }));

  // Batch fetch all votes
  const { data: votesData, isLoading: votesLoading } = useReadContracts({
    contracts: voteContracts,
    query: { enabled: projectIds.length > 0 }
  });

  // Build projectVotes from batch data
  useEffect(() => {
    if (!votesData) return;
    const newVotes: Record<string, number> = {};
    votesData.forEach((result: any, idx: number) => {
      const key = projectIds[idx]?.toString();
      if (key) {
        newVotes[key] = result?.result ? parseFloat(formatEther(result.result)) : 0;
      }
    });
    setProjectVotes(newVotes);
    // eslint-disable-next-line
  }, [votesData]);

  // Sort projects by vote count for the selected token, filter out nulls
  let sortedProjects = (campaignProjects || []).filter(Boolean);
  if (sortedProjects.length > 0) {
    sortedProjects = [...sortedProjects].sort((a, b) => {
      if (!a || !b) return 0;
      const keyA = a.id.toString();
      const keyB = b.id.toString();
      const votesA = projectVotes[keyA] ?? 0;
      const votesB = projectVotes[keyB] ?? 0;
      return votesB - votesA;
    });
  }

  const handleVote = async (projectId: bigint) => {
    const key = projectId.toString();
    const state = voteState[key] || { amount: '', error: '', success: '', isVoting: false, selectedToken: supportedTokens[0].address };
    setVoteState(prev => ({ ...prev, [key]: { ...state, error: '', success: '', isVoting: true } }));
    if (!isConnected) {
      setVoteState(prev => ({ ...prev, [key]: { ...state, error: 'Connect your wallet to vote.', isVoting: false } }));
      return;
    }
    if (!state.amount || parseFloat(state.amount) <= 0) {
      setVoteState(prev => ({ ...prev, [key]: { ...state, error: 'Enter a valid amount.', isVoting: false } }));
      return;
    }
    try {
      const tokenMeta = supportedTokens.find(t => t.address === state.selectedToken) || supportedTokens[0];
      if (tokenMeta.symbol === 'CELO') {
        await voteWithCelo({
          campaignId,
          projectId,
          amount: parseEther(state.amount)
        });
      } else {
        await vote({
          campaignId,
          projectId,
          token: state.selectedToken as `0x${string}`,
          amount: parseEther(state.amount)
        });
      }
      setVoteState(prev => ({ ...prev, [key]: { ...state, success: 'Vote cast successfully!', amount: '', isVoting: false } }));
    } catch (e: any) {
      setVoteState(prev => ({ ...prev, [key]: { ...state, error: e?.message || 'Voting failed.', isVoting: false } }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-green-50 to-white p-2">
      <div className="w-full max-w-md mx-auto rounded-2xl shadow-xl border border-blue-200 p-2 bg-white/90">
        <h2 className="text-xl font-bold text-center mb-4 text-blue-700">
          {campaign ? campaign.name : 'Campaign'}
        </h2>
        {/* Campaign dates */}
        {campaign && (
          <div className="text-xs text-gray-500 text-center mb-2">
            {campaign.active ? 'Active' : 'Inactive'} | {formatDate(campaign.startTime)} - {formatDate(campaign.endTime)}
          </div>
        )}
        {isEnded && (
          <div className="mb-4 text-center text-red-500 font-semibold text-lg">Campaign Ended</div>
        )}
        {!isConnected && !isEnded && (
          <div className="mb-4 flex flex-col items-center">
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-xl font-bold shadow hover:from-blue-600 hover:to-green-600 transition-all text-base"
            >
              <Wallet className="h-5 w-5" /> Connect Wallet
            </button>
            <div className="text-xs text-gray-400 mt-1">Wallet required to vote</div>
          </div>
        )}
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="space-y-4">
            {campaignProjects && campaignProjects.length > 0 ? (
              sortedProjects.map((project: any, idx: number) => {
                const key = project.id.toString();
                const state = voteState[key] || { amount: '', error: '', success: '', isVoting: false, selectedToken: supportedTokens[0].address };
                const tokenMeta = supportedTokens.find(t => t.address === state.selectedToken) || supportedTokens[0];
                const { celoEquivalentFormatted } = useTokenToCeloEquivalent(
                  contractAddress,
                  state.selectedToken as `0x${string}`,
                  state.amount ? parseEther(state.amount) : 0n
                );
                // Position badge redesigned
                const badge = getBadgeStyle(idx);
                return (
                  <div key={key} className="border-2 border-blue-100 rounded-xl p-3 flex flex-col gap-2 bg-gradient-to-br from-blue-50 to-green-50 shadow-sm">
                    <div className={`flex items-center gap-2`}>
                      <span
                        className={`inline-flex items-center justify-center mr-2 rounded-full border-4 bg-gradient-to-br ${badge.bg} ${badge.border} shadow-lg w-9 h-9 text-lg font-extrabold text-white relative transition-transform duration-200 ${badge.animate}`}
                        style={{ minWidth: 36 }}
                        title={`Position ${idx + 1}`}
                      >
                        {badge.icon ? (
                          <span className="absolute -top-1 -right-1">{badge.icon}</span>
                        ) : null}
                        <span className="z-10">{idx + 1}</span>
                      </span>
                      <div className="font-semibold text-base text-blue-800">{project.name || `Project #${key}`}</div>
                    </div>
                    <div className="text-xs text-green-700">Current Votes ({tokenMeta.symbol}): {projectVotes[key] ? projectVotes[key].toFixed(2) : '0.00'}</div>
                    {/* If campaign ended, do not show voting UI */}
                    {isEnded ? null : <>
                    {/* Token select */}
                    <div className="flex gap-2 mt-1 mb-1">
                      {supportedTokens.map(token => (
                        <button
                          key={token.address}
                          onClick={() => setVoteState(prev => ({ ...prev, [key]: { ...state, selectedToken: token.address } }))}
                          className={`flex items-center gap-2 px-2 py-1 rounded-lg border-2 transition-all duration-200 font-semibold text-xs shadow-sm
                            ${state.selectedToken === token.address
                              ? 'bg-blue-100 border-blue-400 text-blue-700 scale-105'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-blue-50'}
                          `}
                          type="button"
                          disabled={state.isVoting}
                        >
                          <img src={tokenIcons[token.symbol] || ''} alt={token.symbol} className="w-4 h-4 rounded-full" />
                          {token.symbol}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="flex-1 border-2 border-blue-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                        placeholder={`Amount in ${tokenMeta.symbol}`}
                        value={state.amount}
                        onChange={e => setVoteState(prev => ({ ...prev, [key]: { ...state, amount: e.target.value } }))}
                        disabled={state.isVoting}
                      />
                      <button
                        className="bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg px-3 py-1 font-semibold hover:from-green-600 hover:to-blue-700 transition disabled:opacity-50 shadow-lg"
                        onClick={() => handleVote(project.id)}
                        disabled={state.isVoting || !isConnected}
                      >
                        {state.isVoting ? 'Voting...' : `Vote with ${tokenMeta.symbol}`}
                      </button>
                    </div>
                    {/* Show CELO equivalent if cUSD */}
                    {tokenMeta.symbol === 'cUSD' && state.amount && parseFloat(state.amount) > 0 && (
                      <div className="mb-1 text-xs text-blue-600">≈ {celoEquivalentFormatted} CELO</div>
                    )}
                    {state.error && <div className="text-red-600 text-xs mt-1 font-semibold">{state.error}</div>}
                    {state.success && <div className="text-green-600 text-xs mt-1 font-semibold">{state.success}</div>}
                    </>}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">No projects in this campaign.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 