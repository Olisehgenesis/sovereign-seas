import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Address, formatEther, parseEther } from 'viem';
import { 
  useProjectTipSummary, 
  useRecentTips, 
  useTipProjectWithCelo,
  useMinimumTipAmount,
  usePlatformFeePercentage,
  useAllTippedProjects,
  useContractStats,
  useTopTippedProjects,
  useUserTipSummary,
  useProjectWithTipInfo,
  useCanUserTipProject,
  useAllTips,
  useEmergencyWithdraw,
  useWithdrawPlatformFees,
  useToggleTipping,
  useSetMinimumTipAmount,
  useOwner,
  useTransferOwnership,
  useRenounceOwnership,
  useTippingStatus,
  useCeloTokenAddress,
  useSovereignSeasAddress,
  useCollectedFees,
  usePlatformFeeBalance
} from '@/hooks/useProjectTipping';
import { Gift, Loader2, Check, X, Info, Coins, RefreshCw, TrendingUp, Users, BarChart3, Zap, Target, Wallet } from 'lucide-react';

export default function TestTipsPage() {
  const { address: userAddress } = useAccount();
  const [tipAmount, setTipAmount] = useState('0.1');
  const [message, setMessage] = useState('Test tip from debug page');
  const [testProjectId, setTestProjectId] = useState('0');
  const [isTipping, setIsTipping] = useState(false);
  const [tipResult, setTipResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'testing' | 'analytics' | 'debug' | 'admin'>('overview');

  // Contract addresses
  const TIPPING_CONTRACT = '0xDEde24e4321DEDCE98DA61B0E1a84D93dCC72C79' as Address;
  const SOVEREIGN_SEAS_CONTRACT = '0x0cc096b1cc568a22c1f02dab769881d1afe6161a' as Address;

  // Test with project ID 0
  const projectId = BigInt(testProjectId);

  // Hooks
  const { summary: tipSummary, isLoading: tipSummaryLoading, refetch: refetchTipSummary } = useProjectTipSummary(TIPPING_CONTRACT, projectId);
  const { tips: allRecentTips, isLoading: recentTipsLoading, refetch: refetchRecentTips } = useRecentTips(TIPPING_CONTRACT, 20);
  const { minimumTipAmount, isLoading: minTipLoading } = useMinimumTipAmount(TIPPING_CONTRACT);
  const { platformFeePercentage, isLoading: feeLoading } = usePlatformFeePercentage(TIPPING_CONTRACT);
  const { tipProjectWithCelo, data: tipData, isSuccess: tipSuccess, error: tipError } = useTipProjectWithCelo(TIPPING_CONTRACT);
  const { projectIds: allTippedProjectIds, isLoading: allProjectsLoading, refetch: refetchAllProjects } = useAllTippedProjects(TIPPING_CONTRACT);
  const { stats: contractStats, isLoading: statsLoading, refetch: refetchStats } = useContractStats(TIPPING_CONTRACT);
  const { topProjects, isLoading: topProjectsLoading, refetch: refetchTopProjects } = useTopTippedProjects(TIPPING_CONTRACT, 10);
  const { summary: userSummary, isLoading: userSummaryLoading, refetch: refetchUserSummary } = useUserTipSummary(TIPPING_CONTRACT, userAddress as Address);
  const { projectInfo: projectWithTips, isLoading: projectTipsLoading, refetch: refetchProjectTips } = useProjectWithTipInfo(TIPPING_CONTRACT, projectId);
  const { canTip, reason, isLoading: canTipLoading } = useCanUserTipProject(TIPPING_CONTRACT, userAddress as Address, projectId, '0x0000000000000000000000000000000000000000', parseEther(tipAmount), parseEther(tipAmount));
  
  // New hooks for additional functionality
  const { allTips, isLoading: allTipsLoading, refetch: refetchAllTips } = useAllTips(TIPPING_CONTRACT);
  const { emergencyWithdraw, isPending: emergencyWithdrawPending } = useEmergencyWithdraw(TIPPING_CONTRACT);
  const { withdrawPlatformFees, isPending: withdrawFeesPending } = useWithdrawPlatformFees(TIPPING_CONTRACT);
  const { toggleTipping, isPending: toggleTippingPending } = useToggleTipping(TIPPING_CONTRACT);
  const { setMinimumTipAmount, isPending: setMinTipPending } = useSetMinimumTipAmount(TIPPING_CONTRACT);
  const { owner, isLoading: ownerLoading } = useOwner(TIPPING_CONTRACT);
  const { transferOwnership, isPending: transferOwnershipPending } = useTransferOwnership(TIPPING_CONTRACT);
  const { renounceOwnership, isPending: renounceOwnershipPending } = useRenounceOwnership(TIPPING_CONTRACT);
  const { isEnabled: tippingEnabled, isLoading: tippingStatusLoading } = useTippingStatus(TIPPING_CONTRACT);
  const { celoTokenAddress, isLoading: celoTokenLoading } = useCeloTokenAddress(TIPPING_CONTRACT);
  const { sovereignSeasAddress, isLoading: sovereignSeasLoading } = useSovereignSeasAddress(TIPPING_CONTRACT);
  const { collectedFees, isLoading: collectedFeesLoading } = useCollectedFees(TIPPING_CONTRACT, '0x0000000000000000000000000000000000000000');
  const { feeBalance: platformFeeBalance, isLoading: platformFeeBalanceLoading } = usePlatformFeeBalance(TIPPING_CONTRACT, '0x0000000000000000000000000000000000000000');

  // Handle tip
  const handleTip = async () => {
    if (!userAddress || !tipAmount || parseFloat(tipAmount) <= 0) return;
    
    setIsTipping(true);
    setTipResult(null);
    
    try {
      console.log('🔍 Sending tip:', {
        projectId: projectId.toString(),
        amount: parseEther(tipAmount),
        message,
        userAddress,
        tippingContract: TIPPING_CONTRACT
      });

      await tipProjectWithCelo({
        projectId,
        amount: parseEther(tipAmount),
        message,
        userAddress: userAddress as `0x${string}`
      });

      console.log('✅ Tip sent successfully');
    } catch (error) {
      console.error('❌ Tip failed:', error);
      setTipResult({ success: false, error: error });
    } finally {
      setIsTipping(false);
    }
  };

  // Watch for tip success
  useEffect(() => {
    if (tipSuccess && tipData) {
      console.log('🎉 Tip transaction hash:', tipData);
      setTipResult({ success: true, hash: tipData });
      // Refresh all data
      setTimeout(() => {
        refetchTipSummary();
        refetchRecentTips();
        refetchAllProjects();
        refetchStats();
        refetchTopProjects();
        refetchUserSummary();
        refetchProjectTips();
      }, 2000);
    }
  }, [tipSuccess, tipData, refetchTipSummary, refetchRecentTips, refetchAllProjects, refetchStats, refetchTopProjects, refetchUserSummary, refetchProjectTips]);

  // Watch for tip error
  useEffect(() => {
    if (tipError) {
      console.error('❌ Tip error:', tipError);
      setTipResult({ success: false, error: tipError });
    }
  }, [tipError]);

  // Get token symbol helper
  const getTokenSymbol = (tokenAddress: Address): string => {
    if (tokenAddress === '0x0000000000000000000000000000000000000000') return 'CELO';
    return 'ERC20';
  };

  // Format time ago
  const getTimeAgo = (timestamp: bigint): string => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - Number(timestamp);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const refreshAllData = () => {
    refetchTipSummary();
    refetchRecentTips();
    refetchAllProjects();
    refetchStats();
    refetchTopProjects();
    refetchUserSummary();
    refetchProjectTips();
    refetchAllTips();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🧪 Tip Debug Test Page</h1>
          <button
            onClick={refreshAllData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh All Data
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-white rounded-lg p-1 mb-6 border border-gray-200">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'testing', label: 'Testing', icon: Zap },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp },
            { id: 'debug', label: 'Debug', icon: Target },
            { id: 'admin', label: 'Admin', icon: Users }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Contract Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-6 border border-gray-200/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Coins className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Tips</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statsLoading ? '...' : contractStats?.totalTips?.toString() || '0'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Target className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Projects Tipped</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statsLoading ? '...' : contractStats?.totalProjectsTipped?.toString() || '0'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Unique Users</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statsLoading ? '...' : contractStats?.totalUniqueUsers?.toString() || '0'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Zap className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {tippingStatusLoading ? '...' : tippingEnabled ? 'Active' : 'Disabled'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Tipped Projects */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200/50">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Top Tipped Projects
              </h2>
              {topProjectsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading top projects...</span>
                </div>
              ) : topProjects && topProjects.projectIds.length > 0 ? (
                <div className="space-y-3">
                  {topProjects.projectIds.map((projectId, index) => (
                    <div key={projectId.toString()} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">
                          #{index + 1}
                        </span>
                        <span className="font-medium">Project {projectId.toString()}</span>
                      </div>
                      <span className="text-lg font-bold text-green-600">
                        {formatEther(topProjects.tipAmounts[index] || 0n)} CELO
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Info className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No top projects found</p>
                </div>
              )}
            </div>

            {/* Recent Tips */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Recent Tips (All Projects)</h2>
                <div className="text-sm text-gray-600">
                  Total Tips: {allTipsLoading ? '...' : allTips ? allTips.length : '0'}
                </div>
              </div>
              {recentTipsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading recent tips...</span>
                </div>
              ) : allRecentTips.length > 0 ? (
                <div className="space-y-3">
                  {allRecentTips.slice(0, 8).map((tip, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">
                            {tip.tipper.slice(0, 6)}...{tip.tipper.slice(-4)} → Project {tip.projectId.toString()}
                          </p>
                          <p className="text-xs text-gray-600">
                            {formatEther(tip.amount)} {getTokenSymbol(tip.token)} 
                            ({formatEther(tip.celoEquivalent)} CELO equiv.)
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{getTimeAgo(tip.timestamp)}</p>
                          {tip.message && (
                            <p className="text-xs text-gray-600 italic">"{tip.message}"</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Info className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No recent tips found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Testing Tab */}
        {activeTab === 'testing' && (
          <div className="space-y-6">
            {/* Contract Info */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200/50">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Contract Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Tipping Contract:</p>
                  <p className="font-mono text-gray-900 break-all">{TIPPING_CONTRACT}</p>
                </div>
                <div>
                  <p className="text-gray-600">Sovereign Seas Contract:</p>
                  <p className="font-mono text-gray-900 break-all">{SOVEREIGN_SEAS_CONTRACT}</p>
                </div>
                <div>
                  <p className="text-gray-600">User Address:</p>
                  <p className="font-mono text-gray-900 break-all">{userAddress || 'Not connected'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Test Project ID:</p>
                  <input
                    type="number"
                    value={testProjectId}
                    onChange={(e) => setTestProjectId(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg w-full"
                    placeholder="0"
                  />
                </div>
                <div>
                  <p className="text-gray-600">Minimum Tip Amount:</p>
                  <p className="font-medium text-gray-900">
                    {minTipLoading ? 'Loading...' : minimumTipAmount ? `${formatEther(minimumTipAmount)} CELO` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Platform Fee %:</p>
                  <p className="font-medium text-gray-900">
                    {feeLoading ? 'Loading...' : platformFeePercentage ? `${platformFeePercentage.toString()}%` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Tip Form */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200/50">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Send Test Tip</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tip Amount (CELO)</label>
                  <input
                    type="number"
                    value={tipAmount}
                    onChange={(e) => setTipAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    step="0.01"
                    min="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Test message"
                  />
                </div>
                <button
                  onClick={handleTip}
                  disabled={!userAddress || isTipping || parseFloat(tipAmount) <= 0}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isTipping ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending Tip...
                    </>
                  ) : (
                    <>
                      <Gift className="w-4 h-4" />
                      Send Test Tip
                    </>
                  )}
                </button>
              </div>

              {/* Tip Result */}
              {tipResult && (
                <div className={`mt-4 p-4 rounded-lg ${
                  tipResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {tipResult.success ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <X className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`font-medium ${
                      tipResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {tipResult.success ? 'Tip sent successfully!' : 'Tip failed'}
                    </span>
                  </div>
                  {tipResult.success && tipResult.hash && (
                    <p className="text-sm text-green-700 mt-2">
                      Transaction Hash: {tipResult.hash}
                    </p>
                  )}
                  {tipResult.error && (
                    <p className="text-sm text-red-700 mt-2">
                      Error: {tipResult.error?.message || tipResult.error?.toString()}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Project Tip Summary */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200/50">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Project Tip Summary (ID: {testProjectId})
              </h2>
              {tipSummaryLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading tip summary...</span>
                </div>
              ) : tipSummary ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Project Name</p>
                      <p className="font-medium text-gray-900">{tipSummary.projectName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Project Owner</p>
                      <p className="font-mono text-gray-900 break-all">{tipSummary.projectOwner || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Tips (CELO)</p>
                      <p className="font-medium text-gray-900">
                        {formatEther(tipSummary.totalTipsInCelo || 0n)} CELO
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tipper Count</p>
                      <p className="font-medium text-gray-900">{tipSummary.tipperCount?.toString() || '0'}</p>
                    </div>
                  </div>
                  
                  {tipSummary.tippedTokens && tipSummary.tippedTokens.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Tipped Tokens</p>
                      <div className="space-y-2">
                        {tipSummary.tippedTokens.map((token, idx) => (
                          <div key={token} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="font-mono text-sm">{token}</span>
                            <span className="font-medium">
                              {formatEther(tipSummary.tokenAmounts?.[idx] || 0n)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Info className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No tip summary found for this project</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* User Tip Summary */}
            {userAddress && (
              <div className="bg-white rounded-2xl p-6 border border-gray-200/50">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Your Tip Summary
                </h2>
                {userSummaryLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Loading user summary...</span>
                  </div>
                ) : userSummary ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-600 font-medium">Total Tipped</p>
                        <p className="text-lg font-bold text-blue-900">
                          {formatEther(userSummary.totalTippedInCelo || 0n)} CELO
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-600 font-medium">Projects Supported</p>
                        <p className="text-lg font-bold text-green-900">
                          {userSummary.projectCount?.toString() || '0'}
                        </p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-purple-600 font-medium">Recent Tips</p>
                        <p className="text-lg font-bold text-purple-900">
                          {userSummary.recentTips?.length || '0'}
                        </p>
                      </div>
                    </div>
                    
                    {userSummary.tippedProjectIds && userSummary.tippedProjectIds.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Projects You've Tipped:</p>
                        <div className="flex flex-wrap gap-2">
                          {userSummary.tippedProjectIds.map(projectId => (
                            <span key={projectId.toString()} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                              #{projectId.toString()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Info className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No tip history found</p>
                  </div>
                )}
              </div>
            )}

            {/* All Tipped Projects */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200/50">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">All Tipped Projects</h2>
              {allProjectsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading tipped projects...</span>
                </div>
              ) : allTippedProjectIds && allTippedProjectIds.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allTippedProjectIds.map(projectId => (
                    <div key={projectId.toString()} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Project #{projectId.toString()}</span>
                        <span className="text-sm text-gray-500">ID</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Info className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No tipped projects found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Debug Tab */}
        {activeTab === 'debug' && (
          <div className="space-y-6">
            {/* Contract Stats */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200/50">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Contract Statistics</h2>
              {statsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading contract stats...</span>
                </div>
              ) : contractStats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium">Total Tips</p>
                    <p className="text-lg font-bold text-blue-900">{contractStats.totalTips?.toString() || '0'}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">Projects Tipped</p>
                    <p className="text-lg font-bold text-green-900">{contractStats.totalProjectsTipped?.toString() || '0'}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-600 font-medium">Unique Users</p>
                    <p className="text-lg font-bold text-purple-900">{contractStats.totalUniqueUsers?.toString() || '0'}</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-orange-600 font-medium">Tipping Enabled</p>
                    <p className="text-lg font-bold text-orange-900">{contractStats.isEnabled ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600 font-medium">Min Tip Amount</p>
                    <p className="text-lg font-bold text-red-900">
                      {contractStats.minTipAmount ? `${formatEther(contractStats.minTipAmount)} CELO` : 'N/A'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Info className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No contract stats available</p>
                </div>
              )}
            </div>

            {/* Can User Tip Check */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200/50">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Can User Tip Check</h2>
              {canTipLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Checking tip permissions...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Can Tip:</p>
                    <p className={`text-lg font-bold ${canTip ? 'text-green-600' : 'text-red-600'}`}>
                      {canTip ? 'Yes' : 'No'}
                    </p>
                  </div>
                  {reason && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Reason:</p>
                      <p className="text-sm text-gray-900">{reason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Project With Tip Info */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200/50">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Project With Tip Info</h2>
              {projectTipsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading project info...</span>
                </div>
              ) : projectWithTips ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Project ID</p>
                      <p className="font-medium text-gray-900">{projectWithTips.id?.toString() || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Owner</p>
                      <p className="font-mono text-gray-900 break-all">{projectWithTips.owner || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium text-gray-900">{projectWithTips.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Active</p>
                      <p className="font-medium text-gray-900">{projectWithTips.active ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Tips (CELO)</p>
                      <p className="font-medium text-gray-900">
                        {projectWithTips.totalTipsInCelo ? formatEther(projectWithTips.totalTipsInCelo) : '0'} CELO
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tipper Count</p>
                      <p className="font-medium text-gray-900">{projectWithTips.tipperCount?.toString() || '0'}</p>
                    </div>
                  </div>
                  
                  {projectWithTips.tippedTokens && projectWithTips.tippedTokens.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Tipped Tokens:</p>
                      <div className="flex flex-wrap gap-2">
                        {projectWithTips.tippedTokens.map((token, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-mono">
                            {token}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Info className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No project info available</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admin Tab */}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            {/* Contract Admin Info */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200/50">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Contract Administration</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Contract Owner</p>
                  <p className="font-mono text-sm text-blue-900 break-all">
                    {ownerLoading ? 'Loading...' : owner || 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Tipping Status</p>
                  <p className={`font-medium ${tippingEnabled ? 'text-green-600' : 'text-red-600'}`}>
                    {tippingStatusLoading ? 'Loading...' : tippingEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">CELO Token</p>
                  <p className="font-mono text-sm text-purple-900 break-all">
                    {celoTokenLoading ? 'Loading...' : celoTokenAddress || 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-600 font-medium">Sovereign Seas</p>
                  <p className="font-mono text-sm text-orange-900 break-all">
                    {sovereignSeasLoading ? 'Loading...' : sovereignSeasAddress || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Admin Actions */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200/50">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Toggle Tipping</h3>
                  <button
                    onClick={() => toggleTipping()}
                    disabled={toggleTippingPending}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {toggleTippingPending ? 'Toggling...' : 'Toggle Tipping Status'}
                  </button>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Set Minimum Tip Amount</h3>
                  <div className="space-y-2">
                    <input
                      type="number"
                      placeholder="0.01"
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      id="minTipInput"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('minTipInput') as HTMLInputElement;
                        const value = parseEther(input.value || '0.01');
                        setMinimumTipAmount({ newMinimum: value });
                      }}
                      disabled={setMinTipPending}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {setMinTipPending ? 'Setting...' : 'Set Minimum Amount'}
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Emergency Withdraw</h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Token Address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      id="emergencyTokenInput"
                    />
                    <input
                      type="text"
                      placeholder="Recipient Address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      id="emergencyRecipientInput"
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      id="emergencyAmountInput"
                    />
                    <button
                      onClick={() => {
                        const tokenInput = document.getElementById('emergencyTokenInput') as HTMLInputElement;
                        const recipientInput = document.getElementById('emergencyRecipientInput') as HTMLInputElement;
                        const amountInput = document.getElementById('emergencyAmountInput') as HTMLInputElement;
                        emergencyWithdraw({
                          token: tokenInput.value as Address,
                          recipient: recipientInput.value as Address,
                          amount: parseEther(amountInput.value || '0')
                        });
                      }}
                      disabled={emergencyWithdrawPending}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {emergencyWithdrawPending ? 'Withdrawing...' : 'Emergency Withdraw'}
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Withdraw Platform Fees</h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Token Address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      id="platformTokenInput"
                    />
                    <input
                      type="text"
                      placeholder="Recipient Address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      id="platformRecipientInput"
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      id="platformAmountInput"
                    />
                    <button
                      onClick={() => {
                        const tokenInput = document.getElementById('platformTokenInput') as HTMLInputElement;
                        const recipientInput = document.getElementById('platformRecipientInput') as HTMLInputElement;
                        const amountInput = document.getElementById('platformAmountInput') as HTMLInputElement;
                        withdrawPlatformFees({
                          token: tokenInput.value as Address,
                          recipient: recipientInput.value as Address,
                          amount: parseEther(amountInput.value || '0')
                        });
                      }}
                      disabled={withdrawFeesPending}
                      className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                    >
                      {withdrawFeesPending ? 'Withdrawing...' : 'Withdraw Platform Fees'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Fee Management */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200/50">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Fee Management</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Platform Fee Balance (CELO)</p>
                  <p className="text-lg font-bold text-blue-900">
                    {platformFeeBalanceLoading ? 'Loading...' : platformFeeBalance ? formatEther(platformFeeBalance) : '0'} CELO
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Collected Fees (CELO)</p>
                  <p className="text-lg font-bold text-green-900">
                    {collectedFeesLoading ? 'Loading...' : collectedFees ? formatEther(collectedFees) : '0'} CELO
                  </p>
                </div>
              </div>
            </div>

            {/* Ownership Management */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200/50">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Ownership Management</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Transfer Ownership</h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="New Owner Address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      id="newOwnerInput"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('newOwnerInput') as HTMLInputElement;
                        transferOwnership({ newOwner: input.value as Address });
                      }}
                      disabled={transferOwnershipPending}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {transferOwnershipPending ? 'Transferring...' : 'Transfer Ownership'}
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Renounce Ownership</h3>
                  <p className="text-sm text-gray-600 mb-3">⚠️ This action cannot be undone!</p>
                  <button
                    onClick={() => renounceOwnership()}
                    disabled={renounceOwnershipPending}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {renounceOwnershipPending ? 'Renouncing...' : 'Renounce Ownership'}
                  </button>
                </div>
              </div>
            </div>

            {/* All Tips Display */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200/50">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">All Tips (Raw Data)</h2>
              {allTipsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading all tips...</span>
                </div>
              ) : allTips && allTips.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {allTips.slice(0, 20).map((tip, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {tip.tipper.slice(0, 6)}...{tip.tipper.slice(-4)} → Project {tip.projectId.toString()}
                          </p>
                          <p className="text-gray-600">
                            {formatEther(tip.amount)} {getTokenSymbol(tip.token)} 
                            ({formatEther(tip.celoEquivalent)} CELO equiv.)
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-500">{getTimeAgo(tip.timestamp)}</p>
                          {tip.message && (
                            <p className="text-gray-600 italic">"{tip.message}"</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {allTips.length > 20 && (
                    <p className="text-center text-gray-500 text-sm">
                      Showing first 20 of {allTips.length} total tips
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Info className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No tips found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
