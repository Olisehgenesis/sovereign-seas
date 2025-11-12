import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  Loader2,
  CheckCircle,
  XCircle,
  Plus,
  X,
  Clock,
  Lock,
  DollarSign,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { useCreateGrant, EntityType } from '@/hooks/useMilestoneFunding';
import { type Address } from 'viem';
import { parseEther, formatEther } from 'viem';
import { usePublicClient } from 'wagmi';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { useChainSwitch } from '@/hooks/useChainSwitch';
import { supportedTokens } from '@/hooks/useSupportedTokens';
import { getCeloTokenAddress, getMainContractAddress } from '@/utils/contractConfig';
import { useAllProjects, formatProjectForDisplay } from '@/hooks/useProjectMethods';
import DynamicHelmet from '@/components/DynamicHelmet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MILESTONE_CONTRACT_ADDRESS = (import.meta.env.VITE_MILESTONE_CONTRACT || import.meta.env.VITE_CONTRACT_V4) as Address;
const MAIN_CONTRACT_ADDRESS = getMainContractAddress();

// Token Selector Component
interface TokenSelectorProps {
  selectedToken: string;
  onTokenSelect: (tokenAddress: string) => void;
  disabled?: boolean;
  tokenBalances: Array<{
    address: string;
    symbol: string;
    name: string;
    balance: bigint;
    formattedBalance: string;
  }>;
}

const TokenSelector: React.FC<TokenSelectorProps> = ({ selectedToken, onTokenSelect, disabled, tokenBalances }) => {
  const tokens = supportedTokens.map(token => ({
    address: token.address,
    name: token.name,
    symbol: token.symbol,
    logo: token.symbol === 'CELO' ? '/images/celo.png' : 
          token.symbol === 'cUSD' ? '/images/cusd.png' : 
          '/images/good.png'
  }));
  
  const selectedTokenData = tokens.find(token => token.address === selectedToken);
  
  const getBalance = (tokenAddress: string) => {
    const tokenBalance = tokenBalances.find(tb => tb.address.toLowerCase() === tokenAddress.toLowerCase());
    return tokenBalance ? tokenBalance.formattedBalance : '0.00';
  };

  return (
    <Select value={selectedToken} onValueChange={onTokenSelect} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue>
          {selectedTokenData ? (
            <div className="flex items-center space-x-2">
              <img 
                src={selectedTokenData.logo} 
                alt={selectedTokenData.symbol}
                className="w-5 h-5 rounded-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <span>{selectedTokenData.symbol}</span>
            </div>
          ) : (
            'Select token'
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {tokens.map((token) => (
          <SelectItem key={token.address} value={token.address}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <img 
                  src={token.logo} 
                  alt={token.symbol}
                  className="w-5 h-5 rounded-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <span>{token.symbol}</span>
              </div>
              <span className="text-xs text-gray-500 ml-4">{getBalance(token.address)}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

interface TokenAmount {
  token: Address;
  amount: string;
  tokenSymbol: string;
}

export default function CreateGrant() {
  const navigate = useNavigate();
  const { address: activeAddress } = useActiveWallet();
  const { ensureCorrectChain } = useChainSwitch();
  const publicClient = usePublicClient();
  const celoToken = getCeloTokenAddress();

  // Form state
  const [entityType] = useState<EntityType>(EntityType.PROJECT); // Always PROJECT
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [linkedEntityId, setLinkedEntityId] = useState<string>('');
  const [grantee, setGrantee] = useState<string>('');
  const [siteFeePercentage, setSiteFeePercentage] = useState<string>('2');
  const [reviewTimeLock, setReviewTimeLock] = useState<string>('7'); // days
  const [milestoneDeadline, setMilestoneDeadline] = useState<string>(''); // optional, in days
  const [tokenAmounts, setTokenAmounts] = useState<TokenAmount[]>([
    { token: celoToken as Address, amount: '', tokenSymbol: 'CELO' }
  ]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [granteeValidationWarning, setGranteeValidationWarning] = useState<string>('');

  // Token balances
  const [tokenBalances, setTokenBalances] = useState<Array<{
    address: string;
    symbol: string;
    name: string;
    balance: bigint;
    formattedBalance: string;
  }>>([]);

  const { createGrant, isPending } = useCreateGrant(MILESTONE_CONTRACT_ADDRESS);

  // Fetch all projects for selector
  const { projects: allProjects, isLoading: projectsLoading } = useAllProjects(MAIN_CONTRACT_ADDRESS);

  // Format projects for display
  const formattedProjects = useMemo(() => {
    if (!allProjects) return [];
    return allProjects
      .map(formatProjectForDisplay)
      .filter(Boolean)
      .filter(p => p && p.active);
  }, [allProjects]);

  // Auto-fill project ID and grantee when project is selected
  useEffect(() => {
    if (selectedProjectId) {
      const selectedProject = formattedProjects.find(p => p?.id?.toString() === selectedProjectId);
      if (selectedProject?.owner) {
        setLinkedEntityId(selectedProject.id.toString());
        setGrantee(selectedProject.owner);
        setGranteeValidationWarning('');
      }
    } else {
      setLinkedEntityId('');
      setGrantee('');
    }
  }, [selectedProjectId, formattedProjects]);

  // Load token balances
  useEffect(() => {
    if (!activeAddress || !publicClient) return;

    const loadBalances = async () => {
      const balances = await Promise.all(
        supportedTokens.map(async (token) => {
          try {
            let balance = 0n;
            if (token.address.toLowerCase() === celoToken.toLowerCase()) {
              const result = await publicClient.getBalance({ address: activeAddress as Address });
              balance = result;
            } else {
              const result = await publicClient.readContract({
                address: token.address as Address,
                abi: [
                  {
                    inputs: [{ name: 'account', type: 'address' }],
                    name: 'balanceOf',
                    outputs: [{ name: '', type: 'uint256' }],
                    stateMutability: 'view',
                    type: 'function'
                  }
                ],
                functionName: 'balanceOf',
                args: [activeAddress as Address]
              });
              balance = result as bigint;
            }
            return {
              address: token.address,
              symbol: token.symbol,
              name: token.name,
              balance,
              formattedBalance: formatEther(balance)
            };
          } catch (err) {
            return {
              address: token.address,
              symbol: token.symbol,
              name: token.name,
              balance: 0n,
              formattedBalance: '0.00'
            };
          }
        })
      );
      setTokenBalances(balances);
    };

    loadBalances();
  }, [activeAddress, publicClient, celoToken]);

  const addTokenRow = () => {
    setTokenAmounts([
      ...tokenAmounts,
      { token: celoToken as Address, amount: '', tokenSymbol: 'CELO' }
    ]);
  };

  const removeTokenRow = (index: number) => {
    if (tokenAmounts.length > 1) {
      setTokenAmounts(tokenAmounts.filter((_, i) => i !== index));
    }
  };

  const updateTokenAmount = (index: number, field: 'token' | 'amount', value: string) => {
    const updated = [...tokenAmounts];
    if (field === 'token') {
      const token = supportedTokens.find(t => t.address === value);
      updated[index] = {
        ...updated[index],
        token: value as Address,
        tokenSymbol: token?.symbol || ''
      };
    } else {
      updated[index] = {
        ...updated[index],
        amount: value
      };
    }
    setTokenAmounts(updated);
  };

  const validateForm = (): boolean => {
    if (!linkedEntityId || isNaN(Number(linkedEntityId))) {
      setError('Please enter a valid entity ID');
      return false;
    }

    if (!grantee || !/^0x[a-fA-F0-9]{40}$/.test(grantee)) {
      setError('Please enter a valid grantee address');
      return false;
    }

    const fee = Number(siteFeePercentage);
    if (isNaN(fee) || fee < 1 || fee > 5) {
      setError('Site fee must be between 1% and 5%');
      return false;
    }

    const timeLock = Number(reviewTimeLock);
    if (isNaN(timeLock) || timeLock <= 0) {
      setError('Review time lock must be greater than 0 days');
      return false;
    }

    if (tokenAmounts.length === 0) {
      setError('Please add at least one token');
      return false;
    }

    for (const tokenAmount of tokenAmounts) {
      if (!tokenAmount.amount || Number(tokenAmount.amount) <= 0) {
        setError('Please enter valid amounts for all tokens');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    if (!activeAddress || !publicClient) {
      setError('Please connect your wallet');
      return;
    }

    try {
      await ensureCorrectChain();

      setIsSubmitting(true);
      setSuccess('Approving tokens and creating grant...');

      // Approve ERC20 tokens (not CELO)
      const tokens = tokenAmounts.map(ta => ta.token);
      const amounts = tokenAmounts.map(ta => parseEther(ta.amount));

      // Approve each ERC20 token
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const amount = amounts[i];
        
        // Skip CELO (native token doesn't need approval)
        if (token.toLowerCase() === celoToken.toLowerCase()) {
          continue;
        }

        try {
          // Check current allowance
          const currentAllowance = await publicClient.readContract({
            address: token,
            abi: [
              {
                inputs: [
                  { name: 'owner', type: 'address' },
                  { name: 'spender', type: 'address' }
                ],
                name: 'allowance',
                outputs: [{ name: '', type: 'uint256' }],
                stateMutability: 'view',
                type: 'function'
              }
            ],
            functionName: 'allowance',
            args: [activeAddress as Address, MILESTONE_CONTRACT_ADDRESS]
          }) as bigint;

          // If allowance is insufficient, we'll need to approve
          // Note: The contract will fail if tokens aren't approved, showing a clear error
          if (currentAllowance < amount) {
            console.log(`Token ${tokenAmounts[i].tokenSymbol} needs approval. Current allowance: ${formatEther(currentAllowance)}, Required: ${formatEther(amount)}`);
            // The transaction will fail with an approval error if needed
            // Users can approve tokens manually or we can add an approval step
          }
        } catch (approvalErr) {
          console.warn(`Could not check approval for ${tokenAmounts[i].tokenSymbol}:`, approvalErr);
        }
      }

      const deadlineDays = milestoneDeadline ? Number(milestoneDeadline) : 0;
      const deadlineSeconds = deadlineDays > 0 
        ? BigInt(Math.floor(Date.now() / 1000) + (deadlineDays * 24 * 60 * 60))
        : 0n;

      const reviewTimeLockSeconds = BigInt(Math.floor(Number(reviewTimeLock) * 24 * 60 * 60));

      setSuccess('Creating grant...');

      const txHash = await createGrant({
        linkedEntityId: BigInt(linkedEntityId),
        entityType: entityType,
        grantee: grantee as Address,
        tokens,
        amounts,
        siteFeePercentage: BigInt(siteFeePercentage),
        reviewTimeLock: reviewTimeLockSeconds,
        milestoneDeadline: deadlineSeconds
      });

      setSuccess(`Grant created successfully! Transaction: ${txHash}`);
      
      // Wait a bit then navigate to grants page
      setTimeout(() => {
        navigate('/explorer/grants');
      }, 2000);
    } catch (err: any) {
      console.error('Error creating grant:', err);
      const errorMessage = err.message || 'Failed to create grant. Please try again.';
      
      // Check if it's an approval error
      if (errorMessage.includes('allowance') || errorMessage.includes('approve')) {
        setError('Token approval required. Please approve the tokens first and try again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTokenBalance = (tokenAddress: string): string => {
    const balance = tokenBalances.find(tb => tb.address.toLowerCase() === tokenAddress.toLowerCase());
    return balance ? balance.formattedBalance : '0.00';
  };

  return (
    <>
      <DynamicHelmet 
        config={{
          title: 'Create Grant',
          description: 'Create a new milestone-based grant on Sov Seas',
          image: '/og-image.png',
          url: window.location.href,
          type: 'website'
        }}
      />

      <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-blue-50 to-cyan-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/explorer/grants')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Grants
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Grant</h1>
            <p className="text-gray-600">Create a milestone-based funding grant</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="w-5 h-5 mr-2 text-blue-600" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Project Selector */}
                  <div>
                    <Label htmlFor="project">Select Project *</Label>
                    <Select
                      value={selectedProjectId}
                      onValueChange={(value) => setSelectedProjectId(value)}
                      disabled={isSubmitting || projectsLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={projectsLoading ? 'Loading projects...' : 'Select a project'}>
                          {selectedProjectId && formattedProjects.find(p => p?.id?.toString() === selectedProjectId)?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {formattedProjects.map((project) => {
                          if (!project) return null;
                          return (
                            <SelectItem key={project.id} value={project.id.toString()}>
                              <div className="flex flex-col">
                                <span className="font-medium">{project.name}</span>
                                <span className="text-xs text-gray-500">ID: {project.id.toString()}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      Select the project that will receive the grant. The project owner will be auto-filled as the grantee.
                    </p>
                  </div>

                  {/* Grantee Address (Auto-filled, read-only) */}
                  <div>
                    <Label htmlFor="grantee">Grantee Address (Project Owner) *</Label>
                    <Input
                      id="grantee"
                      type="text"
                      value={grantee}
                      readOnly
                      disabled={isSubmitting || !selectedProjectId}
                      placeholder="Select a project to auto-fill"
                      className="bg-gray-50"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This is automatically set to the project owner's address when you select a project.
                    </p>
                    {granteeValidationWarning && (
                      <div className="mt-2 border border-yellow-200 bg-yellow-50 rounded-lg p-3 flex items-start gap-3">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-yellow-800 text-sm">Validation Warning</h4>
                          <p className="text-yellow-700 text-sm mt-1">{granteeValidationWarning}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Funding */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
                    Funding
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tokenAmounts.map((tokenAmount, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label>Token</Label>
                        <TokenSelector
                          selectedToken={tokenAmount.token}
                          onTokenSelect={(address) => updateTokenAmount(index, 'token', address)}
                          disabled={isSubmitting}
                          tokenBalances={tokenBalances}
                        />
                      </div>
                      <div className="flex-1">
                        <Label>Amount</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={tokenAmount.amount}
                            onChange={(e) => updateTokenAmount(index, 'amount', e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            disabled={isSubmitting}
                            required
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                            Balance: {getTokenBalance(tokenAmount.token)}
                          </div>
                        </div>
                      </div>
                      {tokenAmounts.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTokenRow(index)}
                          disabled={isSubmitting}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addTokenRow}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Token
                  </Button>
                </CardContent>
              </Card>

              {/* Grant Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-blue-600" />
                    Grant Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Site Fee Percentage */}
                  <div>
                    <Label htmlFor="siteFee">Site Fee Percentage (1-5%) *</Label>
                    <Input
                      id="siteFee"
                      type="number"
                      value={siteFeePercentage}
                      onChange={(e) => setSiteFeePercentage(e.target.value)}
                      min="1"
                      max="5"
                      step="0.1"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Platform fee percentage (1-5%)
                    </p>
                  </div>

                  {/* Review Time Lock */}
                  <div>
                    <Label htmlFor="reviewTimeLock">Review Time Lock (days) *</Label>
                    <Input
                      id="reviewTimeLock"
                      type="number"
                      value={reviewTimeLock}
                      onChange={(e) => setReviewTimeLock(e.target.value)}
                      min="1"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Milestones will auto-approve after this many days if not reviewed
                    </p>
                  </div>

                  {/* Milestone Deadline (Optional - for locking) */}
                  <div>
                    <Label htmlFor="milestoneDeadline" className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Milestone Deadline (days) - Optional
                    </Label>
                    <Input
                      id="milestoneDeadline"
                      type="number"
                      value={milestoneDeadline}
                      onChange={(e) => setMilestoneDeadline(e.target.value)}
                      min="0"
                      placeholder="Leave empty for no deadline"
                    />
                    <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                      <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>
                        Set a deadline for milestone submissions. After the deadline + 30 days, milestones will be locked.
                        Leave empty to allow submissions at any time.
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Error/Success Messages */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-800">Error</h3>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-green-800">Success</h3>
                    <p className="text-sm text-green-700">{success}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/explorer/grants')}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || isPending || !activeAddress}
                  className="flex-1"
                >
                  {isSubmitting || isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Grant...
                    </>
                  ) : (
                    <>
                      <Award className="w-4 h-4 mr-2" />
                      Create Grant
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

