import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, AlertCircle, CheckCircle, Calculator } from 'lucide-react';
import { formatEther, parseEther, type Address } from 'viem';
import { useDistributeManual } from '@/hooks/usePools';
import { usePoolBalance } from '@/hooks/usePools';
import { useParticipation } from '@/hooks/useCampaignMethods';
import { useSingleProject } from '@/hooks/useProjectMethods';
import { supportedTokens } from '@/hooks/useSupportedTokens';
import ErrorBoundary from '@/components/ErrorBoundary';

interface ManualDistributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  poolId: bigint;
  campaignId: bigint;
  projectIds: bigint[];
}

interface ProjectDistribution {
  projectId: bigint;
  projectName: string;
  voteCount: bigint;
  amount: string;
  percentage: number;
}

interface TokenInfo {
  address: Address;
  symbol: string;
  decimals: number;
  balance: bigint;
}

// Custom fallback component for modal errors
const ModalErrorFallback = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl max-w-md w-full p-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Distribution Error</h2>
        <p className="text-gray-600 mb-4 text-sm">
          An error occurred while loading the distribution modal. Please try again or contact support if the issue persists.
        </p>
        <div className="space-y-2">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150 text-sm font-medium"
          >
            Close Modal
          </button>
        </div>
      </div>
    </div>
  </div>
);

function ManualDistributeModalContent({ 
  isOpen, 
  onClose, 
  poolId, 
  campaignId, 
  projectIds 
}: ManualDistributeModalProps) {
  const [selectedToken, setSelectedToken] = useState<Address | null>(null);
  const [distributions, setDistributions] = useState<ProjectDistribution[]>([]);
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { distribute, isPending } = useDistributeManual();
  const { balance: poolBalance, isLoading: isLoadingBalance } = usePoolBalance(poolId);

  // Get participation data for each project
  const participations = projectIds.map(projectId => 
    useParticipation(process.env.NEXT_PUBLIC_CONTRACT_V4 as Address, campaignId, projectId)
  );

  // Get project details for each project
  const projects = projectIds.map(projectId => 
    useSingleProject(process.env.NEXT_PUBLIC_CONTRACT_V4 as Address, projectId)
  );

  // Get project names and vote counts
  const projectData = useMemo(() => {
    return projectIds.map((projectId, index) => ({
      projectId,
      participation: participations[index],
      project: projects[index]
    }));
  }, [projectIds, participations, projects]);

  // Get available tokens with their info
  const availableTokens = useMemo(() => {
    // Handle both array and object formats (same as main page)
    const tokens = Array.isArray(poolBalance) ? poolBalance[0] : poolBalance?.tokens;
    const balances = Array.isArray(poolBalance) ? poolBalance[1] : poolBalance?.balances;
    
    if (!poolBalance || !tokens || !balances || !supportedTokens) {
      return [];
    }
    
    const processedTokens = tokens.map((tokenAddress: Address, index: number) => {
      const tokenInfo = supportedTokens.find((t: any) => t.address.toLowerCase() === tokenAddress.toLowerCase());
      return {
        address: tokenAddress,
        symbol: tokenInfo?.symbol || 'Unknown',
        decimals: tokenInfo?.decimals || 18,
        balance: balances[index]
      } as TokenInfo;
    }).filter((token: TokenInfo) => token.balance > 0n);
    
    return processedTokens;
  }, [poolBalance, supportedTokens]);

  // Initialize distributions when token is selected
  useEffect(() => {
    if (selectedToken && projectData.length > 0) {
      // Calculate total votes
      const totalVotes = projectData.reduce((sum, { participation }) => {
        const voteCount = participation.participation ? 
          participation.participation.voteCount : 0n;
        return sum + Number(formatEther(voteCount));
      }, 0);

      // Get selected token balance
      const selectedTokenInfo = availableTokens.find((t: TokenInfo) => t.address === selectedToken);
      const tokenBalance = selectedTokenInfo ? Number(formatEther(selectedTokenInfo.balance)) : 0;

      const newDistributions: ProjectDistribution[] = projectData.map(({ projectId, participation, project }) => {
        const voteCount = participation.participation ? 
          participation.participation.voteCount : 0n;
        
        const projectName = project.project ? 
          project.project.name || `Project ${projectId.toString()}` : 
          `Project ${projectId.toString()}`;
        
        // Calculate amount based on vote ratio
        const voteRatio = totalVotes > 0 ? Number(formatEther(voteCount)) / totalVotes : 0;
        const amount = totalVotes > 0 ? (tokenBalance * voteRatio).toFixed(6) : '0';
        
        return {
          projectId,
          projectName,
          voteCount,
          amount,
          percentage: voteRatio * 100
        };
      });
      
      setDistributions(newDistributions);
      
      // Set total amount
      setTotalAmount(tokenBalance.toFixed(6));
    }
  }, [selectedToken, projectData, availableTokens]);

  // Calculate percentages when amounts change
  useEffect(() => {
    if (distributions.length > 0 && totalAmount) {
      const totalAmountNum = parseFloat(totalAmount);
      if (totalAmountNum > 0) {
        const newDistributions = distributions.map(dist => ({
          ...dist,
          percentage: parseFloat(dist.amount) > 0 ? (parseFloat(dist.amount) / totalAmountNum) * 100 : 0
        }));
        setDistributions(newDistributions);
      }
    }
  }, [distributions, totalAmount]);

  const calculateVoteBasedDistribution = async () => {
    if (!selectedToken || distributions.length === 0) return;
    
    setIsCalculating(true);
    setError(null);

    try {
      const totalVotes = distributions.reduce((sum, dist) => sum + Number(formatEther(dist.voteCount)), 0);
      
      if (totalVotes === 0) {
        setError('No votes found for distribution calculation');
        return;
      }

      const selectedTokenInfo = availableTokens.find((t: TokenInfo) => t.address === selectedToken);
      if (!selectedTokenInfo) {
        setError('Selected token not found');
        return;
      }

      const availableBalance = Number(formatEther(selectedTokenInfo.balance));
      
      const newDistributions = distributions.map(dist => {
        const votePercentage = Number(formatEther(dist.voteCount)) / totalVotes;
        const amount = (availableBalance * votePercentage).toFixed(6);
        
        return {
          ...dist,
          amount,
          percentage: votePercentage * 100
        };
      });

      setDistributions(newDistributions);
      setTotalAmount(availableBalance.toFixed(6));
    } catch (err) {
      setError('Failed to calculate vote-based distribution');
      console.error('Calculation error:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleAmountChange = (index: number, value: string) => {
    const newDistributions = [...distributions];
    const oldAmount = parseFloat(newDistributions[index].amount) || 0;
    const newAmount = parseFloat(value) || 0;
    const difference = newAmount - oldAmount;
    
    // Update the changed project
    newDistributions[index].amount = value;
    
    // Calculate total of other projects (excluding the changed one)
    const otherProjectsTotal = newDistributions.reduce((sum, dist, i) => {
      if (i === index) return sum;
      return sum + (parseFloat(dist.amount) || 0);
    }, 0);
    
    // If we're increasing this project, decrease others proportionally
    if (difference > 0 && otherProjectsTotal > 0) {
      const reductionRatio = difference / otherProjectsTotal;
      newDistributions.forEach((dist, i) => {
        if (i !== index) {
          const currentAmount = parseFloat(dist.amount) || 0;
          const reduction = currentAmount * reductionRatio;
          const newAmount = Math.max(0, currentAmount - reduction);
          dist.amount = newAmount.toFixed(6);
        }
      });
    }
    // If we're decreasing this project, increase others proportionally
    else if (difference < 0 && otherProjectsTotal > 0) {
      const increaseRatio = Math.abs(difference) / otherProjectsTotal;
      newDistributions.forEach((dist, i) => {
        if (i !== index) {
          const currentAmount = parseFloat(dist.amount) || 0;
          const increase = currentAmount * increaseRatio;
          const newAmount = currentAmount + increase;
          dist.amount = newAmount.toFixed(6);
        }
      });
    }
    
    setDistributions(newDistributions);
  };

  const handleSubmit = async () => {
    if (!selectedToken || distributions.length === 0) {
      setError('Please select a token and configure distributions');
      return;
    }

    const projectIds = distributions.map(d => d.projectId);
    const amounts = distributions.map(d => parseEther(d.amount));
    
    // Validate amounts
    const totalAmountNum = amounts.reduce((sum, amount) => sum + Number(formatEther(amount)), 0);
    const selectedTokenInfo = availableTokens.find((t: TokenInfo) => t.address === selectedToken);
    const availableBalance = Number(formatEther(selectedTokenInfo!.balance));
    
    if (totalAmountNum > availableBalance) {
      setError(`Total amount (${totalAmountNum.toFixed(6)}) exceeds available balance (${availableBalance.toFixed(6)})`);
      return;
    }

    try {
      await distribute(poolId, projectIds, amounts, selectedToken);
      setSuccess('Manual distribution initiated successfully!');
    } catch (err) {
      setError(`Distribution failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleClose = () => {
    setSelectedToken(null);
    setDistributions([]);
    setTotalAmount('');
    setError(null);
    setSuccess(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800">Manual Pool Distribution</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Token Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Token to Distribute
            </label>
            {isLoadingBalance ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-slate-500">Loading pool balances...</span>
              </div>
            ) : availableTokens.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-sm text-slate-500 mb-2">No tokens available for distribution</div>
                <div className="text-xs text-slate-400">
                  Pool Balance: {poolBalance ? 'Loaded' : 'Not loaded'}<br/>
                  Format: {Array.isArray(poolBalance) ? 'Array' : 'Object'}<br/>
                  Tokens: {Array.isArray(poolBalance) ? poolBalance[0]?.length || 0 : poolBalance?.tokens?.length || 0}<br/>
                  Balances: {Array.isArray(poolBalance) ? poolBalance[1]?.length || 0 : poolBalance?.balances?.length || 0}<br/>
                  Supported Tokens: {supportedTokens?.length || 0}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableTokens.map((token: TokenInfo) => (
                  <button
                    key={token.address}
                    onClick={() => setSelectedToken(token.address)}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      selectedToken === token.address
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-left">
                      <div className="font-medium text-slate-800">{token.symbol}</div>
                      <div className="text-sm text-slate-600">
                        Balance: {Number(formatEther(token.balance)).toFixed(6)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Distribution Configuration */}
          {selectedToken && distributions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-slate-800">Distribution Configuration</h3>
                <button
                  onClick={calculateVoteBasedDistribution}
                  disabled={isCalculating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  {isCalculating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Calculator className="h-4 w-4" />
                  )}
                  <span>Calculate by Votes</span>
                </button>
              </div>

              {/* Distribution Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-200 rounded-lg">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700">
                        Project
                      </th>
                      <th className="border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700">
                        Votes
                      </th>
                      <th className="border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700">
                        Amount ({availableTokens.find((t: TokenInfo) => t.address === selectedToken)?.symbol})
                      </th>
                      <th className="border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700">
                        Percentage
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {distributions.map((dist, index) => (
                      <tr key={dist.projectId.toString()} className="hover:bg-slate-50">
                        <td className="border border-slate-200 px-4 py-3">
                          <div className="font-medium text-slate-800">{dist.projectName}</div>
                          <div className="text-xs text-slate-500">ID: {dist.projectId.toString()}</div>
                        </td>
                        <td className="border border-slate-200 px-4 py-3 text-sm text-slate-600">
                          {Number(formatEther(dist.voteCount)).toFixed(1)}
                        </td>
                        <td className="border border-slate-200 px-4 py-3">
                          <input
                            type="number"
                            step="0.000001"
                            value={dist.amount}
                            onChange={(e) => handleAmountChange(index, e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholder="0.000000"
                          />
                        </td>
                        <td className="border border-slate-200 px-4 py-3 text-sm text-slate-600">
                          {dist.percentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Amount Display */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800">Total Amount:</span>
                  <span className="font-semibold text-slate-800">
                    {totalAmount} {availableTokens.find((t: TokenInfo) => t.address === selectedToken)?.symbol}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-green-700">{success}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedToken || distributions.length === 0 || isPending}
              className="px-6 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground rounded-lg transition-colors flex items-center space-x-2"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              <span>{isPending ? 'Distributing...' : 'Distribute Manually'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main export with ErrorBoundary wrapper
export default function ManualDistributeModal(props: ManualDistributeModalProps) {
  return (
    <ErrorBoundary 
      fallback={<ModalErrorFallback onClose={props.onClose} />}
      onError={(error, errorInfo) => {
        console.error('ManualDistributeModal Error:', error, errorInfo);
        // You can add additional error reporting here (e.g., Sentry, analytics)
      }}
    >
      <ManualDistributeModalContent {...props} />
    </ErrorBoundary>
  );
}
