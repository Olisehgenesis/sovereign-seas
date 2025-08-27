import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Loader2, Wallet, Check, Gift, TrendingUp, Info, PlusCircle, ChevronDown, Coins, Heart, DollarSign, Sparkles } from 'lucide-react';
import { useAccount, useBalance, useReadContract, useWriteContract } from 'wagmi';
import { parseEther, formatEther, Address, encodeFunctionData, Hash } from 'viem';
import { 
  useProjectTipping, 
  useTipProject, 
  useTipProjectWithCelo, 
  useProjectTipSummary,
  useMinimumTipAmount,
  usePlatformFeePercentage,
  useCanUserTipProject,
  useApproveToken
} from '@/hooks/useProjectTipping';
import { erc20ABI } from '@/abi/erc20ABI';
import { useProjectDetails } from '@/hooks/useProjectMethods';
import { formatIpfsUrl } from '@/utils/imageUtils';
import { tokenList, getTokenInfo } from '@/utils/tokenUtils';
import LocationBadge from '@/components/LocationBadge';
import { getNormalizedLocation } from '@/utils/locationUtils';
import { publicClient, walletClient } from '@/utils/clients';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: bigint;
    name: string;
    owner: string;
    contractAddress: string;
  };
  onTipSuccess?: () => void;
}

const isValidTokenAddress = (address: string) => /^0x[a-fA-F0-9]{40}$/.test(address);
const LOCALSTORAGE_KEY = 'sovseas_custom_tokens';
const TIPPING_CONTRACT = import.meta.env.VITE_TIP_CONTRACT_V4 as Address;

// Add Step component for stepper UI
const Step = ({ active, label }: { active: boolean; label: string }) => (
  <div className="flex flex-col items-center">
    <div className={`w-4 h-4 rounded-full ${active ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
    <span className={`text-xs mt-1 ${active ? 'text-blue-700 font-bold' : 'text-gray-400'}`}>{label}</span>
  </div>
);

const TipModal: React.FC<TipModalProps> = ({ isOpen, onClose, project, onTipSuccess }) => {
  const { address: userAddress } = useAccount();
  const { writeContract } = useWriteContract();

  // Project details (use project.contractAddress)
  const { projectDetails, isLoading: projectLoading } = useProjectDetails(project.contractAddress as Address, project.id);
  const projectLogo = useMemo(() => {
    if (!projectDetails) return '';
    try {
      const additional = projectDetails.metadata?.additionalData ? JSON.parse(projectDetails.metadata.additionalData) : {};
      return additional.media?.logo || additional.logo || '';
    } catch {
      return '';
    }
  }, [projectDetails]);

  // Tipping contract hooks (use TIPPING_CONTRACT)
  const { summary: tipSummary, isLoading: tipSummaryLoading, refetch: refetchTipSummary } = useProjectTipSummary(TIPPING_CONTRACT, project.id);
  const { minimumTipAmount, minimumTipAmountFormatted, isLoading: minTipLoading } = useMinimumTipAmount(TIPPING_CONTRACT);
  const { platformFeePercentage, isLoading: feeLoading } = usePlatformFeePercentage(TIPPING_CONTRACT);
  const { formatTipAmount, calculatePlatformFee, getNetTipAmount } = useProjectTipping(TIPPING_CONTRACT);
  const { tipProject, data: tipData, isSuccess: tipSuccess } = useTipProject(TIPPING_CONTRACT);
  const { tipProjectWithCelo, data: tipCeloData, isSuccess: tipCeloSuccess } = useTipProjectWithCelo(TIPPING_CONTRACT);
  const { approveToken, isPending: isApproving, error: approveError, data: approveData, isSuccess: approveSuccess } = useApproveToken();

  // State
  const [currentView, setCurrentView] = useState<'tip' | 'success'>('tip');
  const [tipAmount, setTipAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [customTokens, setCustomTokens] = useState<any[]>([]);
  const [customTokenInput, setCustomTokenInput] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [tokenDropdownOpen, setTokenDropdownOpen] = useState(false);
  // Add stepper state
  const [tipStep, setTipStep] = useState<'idle' | 'approving' | 'tipping' | 'done'>('idle');
  const [waitingForApproval, setWaitingForApproval] = useState(false);
  const [waitingForTip, setWaitingForTip] = useState(false);

  // Load custom tokens from localStorage
  useEffect(() => {
    if (!isOpen) return;
    const saved = localStorage.getItem(LOCALSTORAGE_KEY);
    if (saved) {
      try {
        setCustomTokens(JSON.parse(saved));
      } catch {
        setCustomTokens([]);
      }
    }
  }, [isOpen]);

  // Save custom tokens to localStorage
  useEffect(() => {
    if (customTokens.length > 0) {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(customTokens));
    }
  }, [customTokens]);

  // All tokens (default + custom)
  const allTokens = useMemo(() => {
    return [
      ...tokenList,
      ...customTokens.filter(
        t => !tokenList.some((st: any) => st.address.toLowerCase() === t.address.toLowerCase())
      ),
    ];
  }, [customTokens]);

  // Set default selected token
  useEffect(() => {
    if (!selectedToken && allTokens.length > 0) {
      setSelectedToken(allTokens[0]);
    }
  }, [allTokens, selectedToken]);

  // CELO Balance
  const { data: celoBalance } = useBalance({
    address: userAddress,
    query: { enabled: !!userAddress && isOpen }
  });

  // cUSD Balance
  const { data: cusdBalance } = useReadContract({
    address: import.meta.env.VITE_CUSD_TOKEN as Address,
    abi: erc20ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress && isOpen }
  });

  // GoodDollar Balance
  const { data: goodDollarBalance } = useReadContract({
    address: (import.meta.env.VITE_GOOD_DOLLAR_TOKEN || '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A') as Address,
    abi: erc20ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress && isOpen }
  });

  // Custom token balances (for first 3 custom tokens to avoid too many hooks)
  const { data: custom1Balance } = useReadContract({
    address: customTokens[0]?.address as Address,
    abi: erc20ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress && isOpen && customTokens.length > 0 }
  });

  const { data: custom2Balance } = useReadContract({
    address: customTokens[1]?.address as Address,
    abi: erc20ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress && isOpen && customTokens.length > 1 }
  });

  const { data: custom3Balance } = useReadContract({
    address: customTokens[2]?.address as Address,
    abi: erc20ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress && isOpen && customTokens.length > 2 }
  });

  // Get balance for selected token
  const getTokenBalance = useCallback((token: any) => {
    if (!token) return 0n;
    
    if (token.symbol === 'CELO') {
      return celoBalance?.value || 0n;
    } else if (token.symbol === 'cUSD') {
      return cusdBalance as bigint || 0n;
    } else if (token.symbol === 'G$') {
      return goodDollarBalance as bigint || 0n;
    } else if (customTokens.length > 0) {
      // Handle custom tokens
      const customIndex = customTokens.findIndex(t => t.address.toLowerCase() === token.address.toLowerCase());
      if (customIndex === 0) return custom1Balance as bigint || 0n;
      if (customIndex === 1) return custom2Balance as bigint || 0n;
      if (customIndex === 2) return custom3Balance as bigint || 0n;
    }
    
    return 0n;
  }, [celoBalance, cusdBalance, goodDollarBalance, custom1Balance, custom2Balance, custom3Balance, customTokens]);

    // Add custom token
  const handleAddCustomToken = async () => {
    setError('');
    const addr = customTokenInput.trim();
    if (!isValidTokenAddress(addr)) {
      setError('Invalid token address.');
      return;
    }
    
    if (allTokens.some(t => t.address.toLowerCase() === addr.toLowerCase())) {
      setError('Token already added.');
      return;
    }
    
    try {
      const { symbol, name, decimals } = getTokenInfo(addr as Address);
      const icon = '/images/token.png';
      setCustomTokens(tokens => [...tokens, { address: addr as Address, symbol, name, decimals, icon }]);
      setCustomTokenInput('');
    } catch {
      setError('Could not fetch token info.');
    }
  };

  // Validation
  const selectedTokenBalance = getTokenBalance(selectedToken);
  const parsedTipAmount = useMemo(() => {
    try {
      return parseEther(tipAmount || '0');
    } catch {
      return 0n;
    }
  }, [tipAmount]);

  const isCelo = selectedToken?.symbol === 'CELO';
  const minTip = minimumTipAmount ?? 0n;
  const platformFee = useMemo(() => calculatePlatformFee(parsedTipAmount), [parsedTipAmount, calculatePlatformFee]);
  const netTip = useMemo(() => getNetTipAmount(parsedTipAmount), [parsedTipAmount, getNetTipAmount]);

  const celoEquivalent = useMemo(() => {
    if (isCelo) {
      return parsedTipAmount;
    }
    return parsedTipAmount;
  }, [parsedTipAmount, isCelo]);

  // Use validation hook
  const { canTip, reason: validationReason, isLoading: validationLoading } = useCanUserTipProject(
    TIPPING_CONTRACT,
    userAddress as Address,
    project.id,
    selectedToken?.address as Address,
    parsedTipAmount,
    celoEquivalent as bigint
  );

  // Debug logging for validation
  useEffect(() => {
    console.log('🔍 Tip Validation Debug:', {
      canTip,
      validationReason,
      validationLoading,
      userAddress,
      projectId: project.id,
      selectedToken: selectedToken?.symbol,
      parsedTipAmount: parsedTipAmount.toString(),
      celoEquivalent: celoEquivalent.toString(),
      tippingContract: TIPPING_CONTRACT
    });
  }, [canTip, validationReason, validationLoading, userAddress, project.id, selectedToken, parsedTipAmount, celoEquivalent]);

  // Add helper for formatting balances to 3 decimal places
  const formatBalance3 = (balance: bigint) => {
    try {
      return parseFloat(formatEther(balance)).toFixed(3);
    } catch {
      return '0.000';
    }
  };

  // Parse project metadata for location
  const parsedMetadata = useMemo(() => {
    if (!projectDetails) return {};
    try {
      const bio = projectDetails.metadata?.bio ? JSON.parse(projectDetails.metadata.bio) : {};
      const contractInfo = projectDetails.metadata?.contractInfo ? JSON.parse(projectDetails.metadata.contractInfo) : {};
      const additionalData = projectDetails.metadata?.additionalData ? JSON.parse(projectDetails.metadata.additionalData) : {};
      return { ...bio, ...contractInfo, ...additionalData };
    } catch {
      return {};
    }
  }, [projectDetails]);
  const location = getNormalizedLocation(parsedMetadata);

  // Handle tip
  const handleTip = async () => {
    setError('');
    
    // Basic validations
    if (!userAddress) {
      setError('Please connect your wallet');
      return;
    }
    if (!tipAmount || !selectedToken) {
      setError('Please select a token and enter an amount');
      return;
    }
    if (parseFloat(tipAmount) <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }
    if (parsedTipAmount < minTip) {
      setError(`Minimum tip is ${formatTipAmount(minTip)} CELO equivalent`);
      return;
    }
    if (selectedTokenBalance < parsedTipAmount) {
      setError('Insufficient balance');
      return;
    }

    // Check contract validation
    if (!validationLoading && !canTip && validationReason) {
      setError(validationReason);
      return;
    }

    setIsProcessing(true);
    setTipStep('approving');

    try {
      if (isCelo) {
        setTipStep('tipping');
        setWaitingForTip(true);
        await tipProjectWithCelo({
          userAddress: userAddress as `0x${string}`,
          projectId: project.id,
          amount: parsedTipAmount,
          message,
        });
      } else {
        // For ERC20 tokens, first approve then tip
        setError('');
        setTipStep('approving');
        setWaitingForApproval(true);
        
        // Step 1: Approve token spending
        try {
          await approveToken({
            tokenAddress: selectedToken.address as Address,
            spender: TIPPING_CONTRACT,
            amount: parsedTipAmount,
            account: userAddress as Address,
          });
        } catch (approvalErr: any) {
          console.error('Approval error:', approvalErr);
          setError('Approval failed: ' + (approvalErr?.message || 'Unknown error'));
          setWaitingForApproval(false);
          return;
        }

        // Step 2: Send tip with CELO equivalent
        if (!project.id || !selectedToken.address || !parsedTipAmount || !celoEquivalent) {
          setError('Missing required parameters for tipping');
          setWaitingForApproval(false);
          return;
        }
        
        setWaitingForTip(true);
        await tipProject({
          projectId: project.id,
          token: selectedToken.address,
          amount: parsedTipAmount,
          celoEquivalent: celoEquivalent,
          message,
        });
      }
    } catch (err: any) {
      console.error('Tip error:', err);
      let errorMessage = 'Failed to tip.';
      
      if (err?.shortMessage) {
        errorMessage = err.shortMessage;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
      setTipStep('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  // Watch for approval transaction completion
  useEffect(() => {
    if (waitingForApproval && approveData) {
      const handleApprovalCompletion = async () => {
        try {
          await publicClient.waitForTransactionReceipt({ hash: approveData as Hash });
          setWaitingForApproval(false);
          setTipStep('tipping');
        } catch (err) {
          console.error('Error waiting for approval transaction:', err);
          setError('Approval transaction failed to confirm');
          setWaitingForApproval(false);
          setTipStep('idle');
        }
      };
      
      handleApprovalCompletion();
    }
  }, [approveData, waitingForApproval]);

  // Watch for tip transaction completion
  useEffect(() => {
    if (waitingForTip && (tipData || tipCeloData)) {
      const handleTipCompletion = async () => {
        try {
          const hash = tipData || tipCeloData;
          if (hash) {
            await publicClient.waitForTransactionReceipt({ hash: hash as Hash });
          }
          setWaitingForTip(false);
          setTipStep('done');
          onClose();
        } catch (err) {
          console.error('Error waiting for tip transaction:', err);
          setError('Transaction failed to confirm');
          setWaitingForTip(false);
          setTipStep('idle');
        }
      };
      
      handleTipCompletion();
    }
  }, [tipData, tipCeloData, waitingForTip, onClose]);

  // Reset modal on close
  useEffect(() => {
    if (!isOpen) {
      setCurrentView('tip');
      setTipAmount('');
      setMessage('');
      setError('');
      setIsProcessing(false);
      setTokenDropdownOpen(false);
      setCustomTokenInput('');
      setTipStep('idle');
      setWaitingForApproval(false);
      setWaitingForTip(false);
    } else {
      // Debug logging when modal opens
      console.log('🔍 Tip Modal Opened:', {
        project,
        userAddress,
        tippingContract: TIPPING_CONTRACT,
        selectedToken: selectedToken?.symbol,
        tipAmount,
        parsedTipAmount: parsedTipAmount.toString()
      });
    }
  }, [isOpen, project, userAddress, selectedToken, tipAmount, parsedTipAmount]);

  // Handle close
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-1 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-gradient-to-br from-[#f8e9d2] via-[#f3e6f9] to-[#e7d6f7] rounded-3xl shadow-2xl border border-slate-200 flex flex-col lg:flex-row overflow-hidden relative animate-fadeIn mt-4 sm:mt-8 lg:mt-16 max-h-[90vh] overflow-y-auto min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] mb-4">
        {/* Country flag badge in top-left */}
        <div className="absolute left-4 top-4 z-30">
          <LocationBadge location={location} variant="card" />
        </div>

        {/* Left: Project Info & Stats */}
        <div className="flex-1 min-w-[252px] max-w-md bg-gradient-to-br from-[#f8e9d2] via-[#f3e6f9] to-[#e7d6f7] text-gray-900 p-7 flex flex-col justify-between relative">
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 text-gray-700/80 hover:text-gray-900 transition-colors p-2 rounded-full hover:bg-white/20 z-10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col items-center gap-3">
            <div className="relative group mb-1">
              {projectLogo ? (
                <img
                  src={formatIpfsUrl(projectLogo)}
                  alt={`${project.name} logo`}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-lg group-hover:scale-105 transition-transform duration-300"
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-[#e7d6f7] via-[#f3e6f9] to-[#f8e9d2] rounded-2xl flex items-center justify-center text-purple-700 text-3xl font-bold shadow-lg border-2 border-white">
                  {project.name?.charAt(0) || 'P'}
                </div>
              )}
              <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-yellow-300 animate-pulse group-hover:scale-110 transition-transform duration-300" />
            </div>

            <h2 className="text-xl font-bold text-center mb-1">{project.name}</h2>
            <p className="text-purple-900/80 text-center text-xs mb-2 line-clamp-2">
              {projectDetails?.project?.description || ''}
            </p>

            <div className="flex items-center gap-2 mb-3">
              <Wallet className="h-4 w-4 text-emerald-400 animate-bounce" />
              <span className="text-xs font-mono">{project.owner?.slice(0, 6)}...{project.owner?.slice(-4)}</span>
            </div>

            {/* Tip Summary */}
            <div className="w-full bg-white/30 rounded-xl p-3 flex flex-col gap-2 mb-2">
              {tipSummaryLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-700" />
                </div>
              ) : tipSummary ? (
                <>
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-yellow-400 animate-bounce" />
                    <span className="font-semibold">Total Tips:</span>
                    <span className="ml-auto text-amber-700 font-bold">
                      {formatTipAmount(tipSummary.totalTipsInCelo)} CELO
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-400 animate-pulse" />
                    <span className="font-semibold">Tippers:</span>
                    <span className="ml-auto text-green-700 font-bold">
                      {tipSummary.tipperCount?.toString() || '0'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-blue-400 animate-spin" />
                    <span className="font-semibold">Tokens:</span>
                    <span className="ml-auto text-blue-700 font-bold">
                      {tipSummary.tippedTokens?.length || 0}
                    </span>
                  </div>

                  {/* ERC20 Tipped Tokens Table */}
                  {tipSummary.tippedTokens && tipSummary.tippedTokens.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs font-semibold text-gray-700 mb-1">Tipped Tokens</div>
                      <div className="rounded-lg bg-white/60 border border-blue-100 overflow-x-auto">
                        <table className="min-w-full text-xs text-left">
                          <thead>
                            <tr className="text-blue-700">
                              <th className="px-2 py-1">Token</th>
                              <th className="px-2 py-1">Address</th>
                              <th className="px-2 py-1">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tipSummary.tippedTokens.map((tokenAddr, idx) => {
                              const known = [...tokenList, ...customTokens].find(t => t.address.toLowerCase() === tokenAddr.toLowerCase());
                              const symbol = known ? known.symbol : 'ERC20';
                              const shortAddr = tokenAddr.slice(0, 6) + '...' + tokenAddr.slice(-4);
                              const amount = tipSummary.tokenAmounts && tipSummary.tokenAmounts[idx] ? tipSummary.tokenAmounts[idx] : 0n;
                              return (
                                <tr key={tokenAddr} className="border-t border-blue-100">
                                  <td className="px-2 py-1 font-semibold">{symbol}</td>
                                  <td className="px-2 py-1 font-mono text-gray-500">{shortAddr}</td>
                                  <td className="px-2 py-1">{formatTipAmount(amount)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-xs text-purple-900/80">No tip data yet.</div>
              )}
            </div>
          </div>

          <div className="mt-auto pt-4">
            <div className="text-xs text-purple-700/80 text-center">
              Powered by Sovereign Seas Tipping
            </div>
          </div>
        </div>

        {/* Right: Tip Form */}
        <div className="flex-1 min-w-[288px] bg-gradient-to-br from-[#f8e9d2] via-[#f3e6f9] to-[#e7d6f7] p-7 flex flex-col justify-center relative">
          {currentView === 'success' ? (
            <div className="flex flex-col items-center justify-center h-full gap-5 animate-fadeIn">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-3 animate-bounce">
                  <Check className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 text-2xl">🎉</div>
              </div>
              <h4 className="text-xl font-bold text-emerald-600 mb-1">Tip Sent Successfully!</h4>
              <p className="text-gray-700 mb-4 text-center">
                Your tip has been sent to <span className="font-semibold text-purple-700">{project.name}</span>
              </p>
              <button
                onClick={handleClose}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          ) : (
            <form className="flex flex-col gap-5 animate-fadeIn" onSubmit={e => { e.preventDefault(); handleTip(); }}>
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 flex items-start animate-shake">
                  <Info className="h-4 w-4 text-red-500 mr-2 flex-shrink-0 mt-0.5 animate-pulse" />
                  <p className="text-xs font-medium text-red-800">{error}</p>
                </div>
              )}
              
              {/* Token Dropdown */}
              <div>
                <label className="text-xs font-semibold text-gray-800 mb-1 block">Select Token</label>
                <div className="relative">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2 border-2 border-gray-200 rounded-xl bg-gray-50 hover:border-blue-400 transition-all text-sm font-semibold"
                    onClick={() => setTokenDropdownOpen(v => !v)}
                  >
                    <div className="flex items-center gap-2">
                      {selectedToken?.symbol === 'CELO' && <img src="/images/celo.png" alt="CELO" className="w-4 h-4 rounded-full" />}
                      {selectedToken?.symbol === 'cUSD' && <img src="/images/cusd.png" alt="cUSD" className="w-4 h-4 rounded-full" />}
                      {selectedToken?.symbol === 'G$' && <img src="/images/good.png" alt="G$" className="w-4 h-4 rounded-full" />}
                      <span>{selectedToken?.symbol || 'Select token'}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${tokenDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {tokenDropdownOpen && (
                    <div className="absolute z-20 mt-2 w-full bg-white border-2 border-blue-100 rounded-xl shadow-xl max-h-56 overflow-y-auto animate-fadeIn">
                      {allTokens.map(token => {
                        const balance = getTokenBalance(token);
                        return (
                          <button
                            key={token.address}
                            type="button"
                            onClick={() => { setSelectedToken(token); setTokenDropdownOpen(false); setError(''); }}
                            className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-50 transition-colors text-sm ${selectedToken?.address === token.address ? 'bg-blue-100 font-bold' : ''}`}
                          >
                            {token.symbol === 'CELO' && <img src="/images/celo.png" alt="CELO" className="w-4 h-4 rounded-full" />}
                            {token.symbol === 'cUSD' && <img src="/images/cusd.png" alt="cUSD" className="w-4 h-4 rounded-full" />}
                            {token.symbol === 'G$' && <img src="/images/good.png" alt="G$" className="w-4 h-4 rounded-full" />}
                            <span>{token.symbol}</span>
                            <span className="ml-auto text-xs text-gray-500 font-mono">
                              {formatBalance3(balance)} {token.symbol}
                            </span>
                          </button>
                        );
                      })}
                      
                      <div className="px-3 py-2 border-t border-blue-100 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Add custom token (0x...)"
                          value={customTokenInput}
                          onChange={e => setCustomTokenInput(e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded-lg text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomToken}
                          className="p-1 text-blue-600 hover:text-blue-800"
                          title="Add token by address"
                        >
                          <PlusCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>


                </div>

             {/* Amount Input */}
             <div>
               <div className="flex items-center justify-between mb-1">
                 <label className="text-xs font-semibold text-gray-800">Tip Amount</label>
                 {selectedToken && (
                   <span className="text-xs text-gray-500 font-mono">
                     Balance: {formatBalance3(selectedTokenBalance)} {selectedToken.symbol}
                   </span>
                 )}
               </div>
               <input
                 type="number"
                 value={tipAmount}
                 onChange={e => setTipAmount(e.target.value)}
                 placeholder="0.00"
                 disabled={isProcessing || isApproving}
                 className={`w-full px-3 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-base font-semibold ${(isProcessing || isApproving) ? 'cursor-not-allowed opacity-60' : ''}`}
                 step="0.0001"
                 min="0"
               />
               {minTipLoading ? (
                 <div className="mt-1 text-xs text-gray-600 flex items-center bg-gray-50 rounded-lg p-2">
                   <Loader2 className="h-3 w-3 animate-spin mr-2" />Loading minimum tip...
                 </div>
               ) : minimumTipAmount ? (
                 <div className="mt-1 text-xs text-gray-600 flex items-center bg-gray-50 rounded-lg p-2">
                   <TrendingUp className="h-3 w-3 mr-2" />
                   <span>Min tip: {formatTipAmount(minimumTipAmount)} CELO equivalent</span>
                 </div>
               ) : null}
               
               {/* CELO Equivalent Display */}
               {!isCelo && tipAmount && (
                 <div className="mt-1 text-xs text-blue-600 flex items-center bg-blue-50 rounded-lg p-2">
                   <Coins className="h-3 w-3 mr-2" />
                   <span>CELO equivalent: ~{formatTipAmount(celoEquivalent)} CELO</span>
                 </div>
               )}
             </div>

             {/* Message Input */}
             <div>
               <label className="text-xs font-semibold text-gray-800 mb-1 block">Message (optional)</label>
               <input
                 type="text"
                 value={message}
                 onChange={e => setMessage(e.target.value)}
                 placeholder="Say something nice..."
                 className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm font-normal"
                 maxLength={120}
               />
             </div>

             {/* Platform Fee Info */}
             <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl p-2">
               <DollarSign className="h-3 w-3 text-amber-400" />
               <span>Platform fee: {platformFeePercentage?.toString() || '0'}%</span>
               {tipAmount && (
                 <span className="ml-auto">
                   Fee: {formatTipAmount(platformFee)} {selectedToken?.symbol} | 
                   Net: {formatTipAmount(netTip)} {selectedToken?.symbol}
                 </span>
               )}
             </div>

             {/* Validation Info */}
             {validationLoading && (
               <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded-xl p-2">
                 <Loader2 className="h-3 w-3 animate-spin" />
                 <span>Validating tip...</span>
               </div>
             )}
             
             {!validationLoading && !canTip && validationReason && (
               <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-xl p-2">
                 <Info className="h-3 w-3" />
                 <span>{validationReason}</span>
               </div>
             )}

             {/* Tip Button */}
             <button
               type="submit"
               disabled={
                 isProcessing ||
                 isApproving ||
                 !tipAmount ||
                 !selectedToken ||
                 parseFloat(tipAmount) <= 0 ||
                 validationLoading ||
                 (!canTip && !validationLoading)
               }
               className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
               onClick={() => {
                 console.log('🔍 Tip Button Debug Info:', {
                   isProcessing,
                   isApproving,
                   tipAmount,
                   selectedToken: selectedToken?.symbol,
                   tipAmountValid: parseFloat(tipAmount || '0') > 0,
                   validationLoading,
                   canTip,
                   validationReason,
                   userAddress,
                   projectId: project.id
                 });
               }}
             >
               {(isProcessing || isApproving) ? (
                 <>
                   <Loader2 className="h-4 w-4 animate-spin" />
                   <span>
                     {tipStep === 'approving' ? 'Approving Token...' : 
                      tipStep === 'tipping' ? 'Sending Tip...' : 'Processing...'}
                   </span>
                 </>
               ) : (
                 <>
                   <Gift className="h-4 w-4 animate-bounce" />
                   <span>
                     Tip {parseFloat(tipAmount || '0').toFixed(2)} {selectedToken?.symbol || 'Token'}
                   </span>
                 </>
               )}
             </button>

             {/* Stepper UI */}
             {!isCelo && (tipStep !== 'idle' || isProcessing) && (
               <div className="w-full flex justify-center mt-4">
                 <div className="flex items-center gap-4">
                   <Step active={tipStep === 'approving' || tipStep === 'tipping' || tipStep === 'done'} label="Approving" />
                   <div className={`w-6 h-1 rounded ${tipStep === 'tipping' || tipStep === 'done' ? 'bg-blue-600' : 'bg-gray-300'}`} />
                   <Step active={tipStep === 'tipping' || tipStep === 'done'} label="Tipping" />
                   <div className={`w-6 h-1 rounded ${tipStep === 'done' ? 'bg-blue-600' : 'bg-gray-300'}`} />
                   <Step active={tipStep === 'done'} label="Done" />
                 </div>
               </div>
             )}

             {/* Info Section */}
             <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mt-1">
               <div className="flex items-start">
                 <Info className="h-3 w-3 text-blue-600 mr-2 flex-shrink-0 mt-0.5 animate-pulse" />
                 <div className="text-xs text-blue-700">
                   <p className="font-medium mb-1">Tipping Info</p>
                   <p>Your tip will be sent directly to the project. Platform fees may apply. You can tip with CELO or any supported ERC20 token.</p>
                   {!isCelo && (
                     <p className="mt-1 text-blue-600">
                       Note: Exchange rates are approximated. Actual CELO equivalent may vary.
                     </p>
                   )}
                 </div>
               </div>
             </div>
           </form>
         )}
       </div>
     </div>
   </div>
 );
};

export default TipModal;