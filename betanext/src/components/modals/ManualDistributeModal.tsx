import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, AlertCircle, CheckCircle, Calculator } from 'lucide-react';
import { formatEther, parseEther, type Address } from 'viem';
import { useDistributeManual } from '@/hooks/usePools';
import { usePoolBalance } from '@/hooks/usePools';
import { useParticipation } from '@/hooks/useCampaignMethods';
import { useSingleProject } from '@/hooks/useProjectMethods';
import { supportedTokens } from '@/hooks/useSupportedTokens';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ButtonCool } from '@/components/ui/button-cool';

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
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white border-[0.35em] border-[#ef4444] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] max-w-md w-full p-6 relative">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <h2 className="text-xl font-extrabold text-[#050505] mb-2 uppercase tracking-[0.05em]">Distribution Error</h2>
        <p className="text-[#050505] mb-4 text-sm font-semibold">
          An error occurred while loading the distribution modal. Please try again or contact support if the issue persists.
        </p>
        <div className="space-y-2">
          <ButtonCool
            onClick={onClose}
            text="Close Modal"
            bgColor="#2563eb"
            hoverBgColor="#1d4ed8"
            textColor="#ffffff"
            borderColor="#050505"
            size="md"
          />
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="relative bg-white border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Pattern Grid Overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30 z-[1]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
            backgroundSize: '0.5em 0.5em',
          }}
        />

        {/* Accent Corner */}
        <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
        <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">
          ★
        </div>

        <div
          className="relative flex items-center justify-between px-[1.5em] pt-[1.4em] pb-[1em] border-b-[0.35em] border-[#050505] z-[2]"
          style={{
            background: '#2563eb',
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
            backgroundBlendMode: 'overlay',
          }}
        >
          <h2 className="text-xl font-extrabold text-white uppercase tracking-[0.05em]">
            Manual Pool Distribution
          </h2>
          <button
            onClick={handleClose}
            className="p-2 border-[0.15em] border-white/40 rounded-[0.3em] hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        <div className="relative p-6 space-y-6 z-[2]">
          {/* Token Selection */}
          <div>
            <label className="block text-sm font-extrabold text-[#050505] mb-2 uppercase tracking-[0.05em]">
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
                    className={`p-3 rounded-[0.4em] border-[0.2em] shadow-[0.2em_0.2em_0_#000000] transition-all text-left ${
                      selectedToken === token.address
                        ? 'border-[#2563eb] bg-[#dbeafe]'
                        : 'border-[#050505] bg-white hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em]'
                    }`}
                  >
                    <div className="text-left">
                      <div className="font-extrabold text-[#050505] uppercase tracking-[0.05em]">
                        {token.symbol}
                      </div>
                      <div className="text-sm text-[#050505] font-semibold">
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
                <h3 className="text-lg font-extrabold text-[#050505] uppercase tracking-[0.05em]">
                  Distribution Configuration
                </h3>
                <ButtonCool
                  onClick={calculateVoteBasedDistribution}
                  disabled={isCalculating}
                  text={isCalculating ? 'Calculating...' : 'Calculate by Votes'}
                  bgColor="#2563eb"
                  hoverBgColor="#1d4ed8"
                  textColor="#ffffff"
                  borderColor="#050505"
                  size="sm"
                >
                  {isCalculating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {!isCalculating && <Calculator className="h-4 w-4" />}
                </ButtonCool>
              </div>

              {/* Distribution Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border-[0.15em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-slate-200 px-4 py-3 text-left text-xs font-extrabold text-[#050505] uppercase tracking-[0.05em]">
                        Project
                      </th>
                      <th className="border border-slate-200 px-4 py-3 text-left text-xs font-extrabold text-[#050505] uppercase tracking-[0.05em]">
                        Votes
                      </th>
                      <th className="border border-slate-200 px-4 py-3 text-left text-xs font-extrabold text-[#050505] uppercase tracking-[0.05em]">
                        Amount ({availableTokens.find((t: TokenInfo) => t.address === selectedToken)?.symbol})
                      </th>
                      <th className="border border-slate-200 px-4 py-3 text-left text-xs font-extrabold text-[#050505] uppercase tracking-[0.05em]">
                        Percentage
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {distributions.map((dist, index) => (
                      <tr key={dist.projectId.toString()} className="hover:bg-gray-50">
                        <td className="border border-slate-200 px-4 py-3">
                          <div className="font-extrabold text-[#050505] uppercase tracking-[0.05em]">
                            {dist.projectName}
                          </div>
                          <div className="text-xs text-gray-600 font-mono">
                            ID: {dist.projectId.toString()}
                          </div>
                        </td>
                        <td className="border border-slate-200 px-4 py-3 text-sm text-[#050505]">
                          {Number(formatEther(dist.voteCount)).toFixed(1)}
                        </td>
                        <td className="border border-slate-200 px-4 py-3">
                          <input
                            type="number"
                            step="0.000001"
                            value={dist.amount}
                            onChange={(e) => handleAmountChange(index, e.target.value)}
                            className="w-full px-3 py-2 border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.1em_0.1em_0_#000000] focus:outline-none text-sm font-semibold"
                            placeholder="0.000000"
                          />
                        </td>
                        <td className="border border-slate-200 px-4 py-3 text-sm text-[#050505] font-semibold">
                          {dist.percentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Amount Display */}
              <div className="p-4 bg-gray-50 border-[0.15em] border-gray-300 rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[#050505] uppercase tracking-[0.05em]">
                    Total Amount:
                  </span>
                  <span className="font-extrabold text-[#050505]">
                    {totalAmount} {availableTokens.find((t: TokenInfo) => t.address === selectedToken)?.symbol}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-[#fee2e2] border-[0.2em] border-[#ef4444] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
              <AlertCircle className="h-5 w-5 text-[#ef4444]" />
              <span className="text-[#050505] text-sm font-semibold">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-2 p-3 bg-[#d1fae5] border-[0.2em] border-[#10b981] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
              <CheckCircle className="h-5 w-5 text-[#10b981]" />
              <span className="text-[#065f46] text-sm font-semibold">{success}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t-[0.35em] border-[#050505]">
            <ButtonCool
              onClick={handleClose}
              text="Cancel"
              bgColor="#ffffff"
              hoverBgColor="#f3f4f6"
              textColor="#050505"
              borderColor="#050505"
              size="md"
            />
            <ButtonCool
              onClick={handleSubmit}
              text={isPending ? 'Distributing...' : 'Distribute Manually'}
              bgColor="#2563eb"
              hoverBgColor="#1d4ed8"
              textColor="#ffffff"
              borderColor="#050505"
              size="md"
              disabled={!selectedToken || distributions.length === 0 || isPending}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            </ButtonCool>
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
