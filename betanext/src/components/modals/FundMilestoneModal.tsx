'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { ButtonCool } from '@/components/ui/button-cool';
import { 
  MobileDialog as Dialog,
  MobileDialogContent as DialogContent,
  MobileDialogHeader as DialogHeader,
  MobileDialogDescription as DialogDescription,
} from '@/components/ui/mobile-dialog';
import { Input } from '@/components/ui/input';
import { Wallet, ChevronDown, Check, Loader2, Plus, X, XCircle, AlertCircle } from 'lucide-react';
import { supportedTokens } from '@/hooks/useSupportedTokens';
import { useFundProjectMilestone } from '@/hooks/useProjectMilestones';
import { getCeloTokenAddress } from '@/utils/contractConfig';
import type { Address } from 'viem';

type FundMilestoneModalProps = {
  isOpen: boolean;
  onClose: () => void;
  milestoneId: bigint;
  onSuccess?: () => void;
};

type TokenAmount = {
  token: Address;
  amount: string;
  symbol: string;
  name: string;
  balance: bigint;
  formattedBalance: string;
};

const ZERO = '0x0000000000000000000000000000000000000000';

export default function FundMilestoneModal({ 
  isOpen, 
  onClose, 
  milestoneId,
  onSuccess 
}: FundMilestoneModalProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { fundProjectMilestone, isPending } = useFundProjectMilestone();
  const [tokenAmounts, setTokenAmounts] = useState<TokenAmount[]>([]);
  const [selectorOpen, setSelectorOpen] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const tokens = useMemo(() => supportedTokens, []);
  const celoTokenAddress = getCeloTokenAddress();

  useEffect(() => {
    async function fetchBalances() {
      if (!address || !publicClient) return;

      const balances = await Promise.all(tokens.map(async (token) => {
        try {
          let balance: bigint;
          if (token.symbol === 'CELO') {
            balance = await publicClient.getBalance({ address: address as `0x${string}` });
          } else {
            balance = await publicClient.readContract({
              address: token.address as `0x${string}`,
              abi: [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] }],
              functionName: 'balanceOf',
              args: [address as `0x${string}`]
            });
          }
          const formatted = formatEther(balance);
          const [i, f] = formatted.split('.');
          return { 
            address: token.address, 
            symbol: token.symbol, 
            name: token.name, 
            balance, 
            formattedBalance: i + (f ? '.' + f.slice(0, 3) : '') 
          };
        } catch {
          return { 
            address: token.address, 
            symbol: token.symbol, 
            name: token.name, 
            balance: 0n, 
            formattedBalance: '0' 
          };
        }
      }));
      
      // Initialize with one empty token amount
      if (tokenAmounts.length === 0) {
        const celo = balances.find(t => t.address.toLowerCase() === celoTokenAddress.toLowerCase());
        setTokenAmounts([{
          token: celo?.address as Address || balances[0]?.address as Address || ZERO as Address,
          amount: '',
          symbol: celo?.symbol || balances[0]?.symbol || '',
          name: celo?.name || balances[0]?.name || '',
          balance: celo?.balance || balances[0]?.balance || 0n,
          formattedBalance: celo?.formattedBalance || balances[0]?.formattedBalance || '0'
        }]);
      } else {
        // Update balances for existing token amounts
        setTokenAmounts(prev => prev.map(ta => {
          const updated = balances.find(b => b.address.toLowerCase() === ta.token.toLowerCase());
          return updated ? {
            ...ta,
            balance: updated.balance,
            formattedBalance: updated.formattedBalance,
            symbol: updated.symbol,
            name: updated.name
          } : ta;
        }));
      }
    }
    if (isOpen) fetchBalances();
  }, [isOpen, address, publicClient, tokens, celoTokenAddress]);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSelectorOpen(null);
    }
  }, [isOpen]);

  const handleAddToken = () => {
    const celo = tokens.find(t => t.symbol === 'CELO');
    setTokenAmounts([...tokenAmounts, {
      token: celo?.address as Address || tokens[0]?.address as Address || ZERO as Address,
      amount: '',
      symbol: celo?.symbol || tokens[0]?.symbol || '',
      name: celo?.name || tokens[0]?.name || '',
      balance: 0n,
      formattedBalance: '0'
    }]);
  };

  const handleRemoveToken = (index: number) => {
    if (tokenAmounts.length > 1) {
      setTokenAmounts(tokenAmounts.filter((_, i) => i !== index));
    }
  };

  const handleTokenChange = (index: number, tokenAddress: Address) => {
    const token = tokens.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
    if (!token) return;

    const updated = [...tokenAmounts];
    updated[index] = {
      ...updated[index],
      token: tokenAddress,
      symbol: token.symbol,
      name: token.name,
      // Balance will be updated by the effect
    };
    setTokenAmounts(updated);
    setSelectorOpen(null);
  };

  const handleAmountChange = (index: number, amount: string) => {
    const updated = [...tokenAmounts];
    updated[index] = { ...updated[index], amount };
    setTokenAmounts(updated);
  };

  const canConfirm = useMemo(() => {
    if (tokenAmounts.length === 0) return false;
    return tokenAmounts.every(ta => {
      const amount = parseFloat(ta.amount || '0');
      const balance = parseFloat(ta.formattedBalance || '0');
      return amount > 0 && amount <= balance;
    });
  }, [tokenAmounts]);

  const handleConfirm = async () => {
    if (!canConfirm || !address) return;
    setErrorMsg('');

    try {
      const tokenAddresses = tokenAmounts.map(ta => ta.token);
      const amounts = tokenAmounts.map(ta => parseEther(ta.amount));
      
      // Calculate total CELO value needed
      const celoIndex = tokenAmounts.findIndex(ta => 
        ta.token.toLowerCase() === celoTokenAddress.toLowerCase()
      );
      const celoValue = celoIndex >= 0 ? amounts[celoIndex] : 0n;

      await fundProjectMilestone({
        milestoneId,
        tokens: tokenAddresses,
        amounts,
        value: celoValue
      });

      onSuccess?.();
      onClose();
    } catch (e: any) {
      const msg = e?.shortMessage || e?.message || 'Transaction failed';
      setErrorMsg(msg);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="relative max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] p-0 [&>button]:hidden">
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

        <DialogHeader
          className="relative px-[1.5em] pt-[1.4em] pb-[1em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2] overflow-hidden"
          style={{
            background: '#2563eb',
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
            backgroundBlendMode: 'overlay',
          }}
        >
          <DialogDescription className="text-white text-2xl font-extrabold uppercase tracking-[0.05em]">
            Fund Milestone
          </DialogDescription>
        </DialogHeader>

        <div className="relative px-[1.5em] pb-[1.5em] pt-4 space-y-4 sm:space-y-5 z-[2]">
          {errorMsg && (
            <div className="p-3 sm:p-4 rounded-lg border-2 border-red-300 bg-red-50 text-sm text-red-700 flex items-start gap-2">
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold mb-1">Error</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          <div className="space-y-3 sm:space-y-4">
            {tokenAmounts.map((ta, index) => {
              const amount = parseFloat(ta.amount || '0');
              const balance = parseFloat(ta.formattedBalance || '0');
              const exceedsBalance = amount > balance;
              const hasAmount = amount > 0;
              
              return (
                <div 
                  key={index} 
                  className={`space-y-2 p-3 sm:p-4 border-2 rounded-lg transition-colors ${
                    exceedsBalance 
                      ? 'border-red-300 bg-red-50' 
                      : hasAmount 
                        ? 'border-green-300 bg-green-50' 
                        : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-800">
                      Token {index + 1}
                    </label>
                    {tokenAmounts.length > 1 && (
                      <button
                        onClick={() => handleRemoveToken(index)}
                        className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
                        disabled={isPending}
                        title="Remove token"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 relative">
                      <Input
                        type="number"
                        value={ta.amount}
                        onChange={(e) => handleAmountChange(index, e.target.value)}
                        placeholder="0.00"
                        className={`text-lg font-semibold h-11 sm:h-12 ${
                          exceedsBalance ? 'border-red-300 focus:border-red-500' : ''
                        }`}
                        step="0.01"
                        min="0"
                        disabled={isPending}
                      />
                      {exceedsBalance && (
                        <div className="absolute -bottom-5 left-0 flex items-center gap-1 text-xs text-red-600 mt-1">
                          <AlertCircle className="h-3 w-3" />
                          Insufficient balance
                        </div>
                      )}
                    </div>
                    <div className="relative w-full sm:w-48">
                      <button
                        onClick={() => setSelectorOpen(selectorOpen === index ? null : index)}
                        disabled={isPending}
                        className="w-full h-11 sm:h-12 rounded-lg border-2 border-gray-200 hover:border-blue-300 px-3 flex items-center justify-between transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="font-semibold text-gray-900 text-sm sm:text-base">{ta.symbol || 'Token'}</span>
                        <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-400 transition-transform ${
                          selectorOpen === index ? 'rotate-180' : ''
                        }`} />
                      </button>
                      {selectorOpen === index && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setSelectorOpen(null)}
                          />
                          <div className="absolute z-50 mt-2 w-full bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                            {tokens.map((token) => (
                              <button
                                key={token.address}
                                className={`w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors ${
                                  ta.token.toLowerCase() === token.address.toLowerCase() ? 'bg-blue-50' : ''
                                }`}
                                onClick={() => handleTokenChange(index, token.address as Address)}
                              >
                                <div className="text-left">
                                  <div className="font-semibold text-gray-900 text-sm">{token.name}</div>
                                  <div className="text-xs text-gray-500">{token.symbol}</div>
                                </div>
                                {ta.token.toLowerCase() === token.address.toLowerCase() && (
                                  <Check className="h-4 w-4 text-blue-600" />
                                )}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="text-gray-600 flex items-center">
                      <Wallet className="h-3 w-3 mr-1" />
                      Available: <span className="font-semibold ml-1">{ta.formattedBalance} {ta.symbol}</span>
                    </div>
                    {hasAmount && !exceedsBalance && (
                      <button
                        onClick={() => handleAmountChange(index, ta.formattedBalance)}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                        disabled={isPending}
                      >
                        Use Max
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            <button
              onClick={handleAddToken}
              disabled={isPending}
              className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-semibold text-gray-700">Add Another Token</span>
            </button>
          </div>

          {/* Summary */}
          {canConfirm && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-blue-900 mb-2">Funding Summary</p>
              <div className="space-y-1 text-xs text-blue-800">
                {tokenAmounts.filter(ta => parseFloat(ta.amount || '0') > 0).map((ta, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{ta.amount} {ta.symbol}</span>
                    <span className="font-medium">✓</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t-[0.35em] border-[#050505]">
            <ButtonCool
              onClick={onClose}
              text="Cancel"
              bgColor="#ffffff"
              hoverBgColor="#f3f4f6"
              textColor="#050505"
              borderColor="#050505"
              size="md"
              disabled={isPending}
            />
            <ButtonCool
              onClick={handleConfirm}
              text={isPending ? "Processing..." : "Fund Milestone"}
              bgColor="#2563eb"
              hoverBgColor="#1d4ed8"
              textColor="#ffffff"
              borderColor="#050505"
              size="md"
              disabled={!canConfirm || isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="h-4 w-4" />
              )}
            </ButtonCool>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

