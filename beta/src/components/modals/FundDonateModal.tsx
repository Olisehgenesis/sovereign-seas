'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { Button } from '@/components/ui/button';
import { 
  MobileDialog as Dialog,
  MobileDialogContent as DialogContent,
  MobileDialogHeader as DialogHeader,
  MobileDialogDescription as DialogDescription,
} from '@/components/ui/mobile-dialog';
import { Input } from '@/components/ui/input';
import { Wallet, ChevronDown, Check, Loader2 } from 'lucide-react';
import { supportedTokens } from '@/hooks/useSupportedTokens';
import { addCustomToken } from '@/utils/tokenRegistry';

type FundDonateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  onConfirm: (token: `0x${string}`, amount: bigint) => Promise<{ approveTxHash?: `0x${string}`, fundTxHash?: `0x${string}` } | void> | void;
  isSubmitting?: boolean;
};

type TokenBalance = {
  address: string;
  symbol: string;
  name: string;
  balance: bigint;
  formattedBalance: string;
};

const ZERO = '0x0000000000000000000000000000000000000000';

export default function FundDonateModal({ isOpen, onClose, title = 'Fund Pool', onConfirm, isSubmitting }: FundDonateModalProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [amountStr, setAmountStr] = useState('');
  const [selectedToken, setSelectedToken] = useState<string>(ZERO);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [agree, setAgree] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [approveHash, setApproveHash] = useState<string>('');
  const [fundHash, setFundHash] = useState<string>('');

  const tokens = useMemo(() => supportedTokens, []);

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
          return { address: token.address, symbol: token.symbol, name: token.name, balance, formattedBalance: i + (f ? '.' + f.slice(0, 3) : '') } as TokenBalance;
        } catch {
          return { address: token.address, symbol: token.symbol, name: token.name, balance: 0n, formattedBalance: '0' } as TokenBalance;
        }
      }));
      setTokenBalances(balances);
    }
    if (isOpen) fetchBalances();
  }, [isOpen, address, publicClient, tokens]);

  useEffect(() => {
    if (isOpen) {
      const celo = supportedTokens.find(t => t.symbol === 'CELO');
      setSelectedToken(celo ? celo.address : ZERO);
      setAmountStr('');
      setAgree(false);
    }
  }, [isOpen]);

  const selectedBalance = useMemo(() => {
    if (!selectedToken) return '0.00';
    const tb = tokenBalances.find(t => t.address?.toLowerCase() === selectedToken.toLowerCase());
    return tb ? tb.formattedBalance : '0.00';
  }, [tokenBalances, selectedToken]);

  const selectedSymbol = useMemo(() => {
    if (!selectedToken) return '';
    const tb = tokenBalances.find(t => t.address?.toLowerCase() === selectedToken.toLowerCase());
    if (tb) return tb.symbol;
    const tok = tokens.find(t => t.address?.toLowerCase() === selectedToken.toLowerCase());
    return tok ? tok.symbol : '';
  }, [tokenBalances, selectedToken, tokens]);

  const selectedName = useMemo(() => {
    if (!selectedToken) return '';
    const tb = tokenBalances.find(t => t.address?.toLowerCase() === selectedToken.toLowerCase());
    if (tb) return tb.name;
    const tok = tokens.find(t => t.address?.toLowerCase() === selectedToken.toLowerCase());
    return tok ? tok.name : '';
  }, [tokenBalances, selectedToken, tokens]);

  // Prefer canonical metadata (from supportedTokens) for display
  const tokenMeta = useMemo(() => {
    if (!selectedToken) return undefined;
    return tokens.find(t => t.address?.toLowerCase() === selectedToken.toLowerCase());
  }, [tokens, selectedToken]);

  const canConfirm = useMemo(() => {
    const n = parseFloat(amountStr || '0');
    const bal = parseFloat(selectedBalance || '0');
    return !isSubmitting && agree && n > 0 && n <= bal && !!selectedToken;
  }, [amountStr, selectedBalance, agree, selectedToken, isSubmitting]);

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setErrorMsg('');
    setApproveHash('');
    setFundHash('');
    try {
      const res = await onConfirm(selectedToken as `0x${string}`, parseEther(amountStr));
      if (res && typeof res === 'object') {
        if (res.approveTxHash) setApproveHash(res.approveTxHash);
        if (res.fundTxHash) setFundHash(res.fundTxHash);
      }
    } catch (e: any) {
      const msg = e?.shortMessage || e?.message || 'Transaction failed';
      setErrorMsg(msg);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-white p-0 [&>button]:hidden">
        <DialogHeader className="p-6 pb-3">
          <div className="bg-gray-500 p-4 text-white relative overflow-hidden rounded-t-lg -m-6 mb-3">
            <div className="relative z-10">
              <DialogDescription className="text-white text-2xl">{title}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded border border-red-200 bg-red-50 text-sm text-red-700">{errorMsg}</div>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-800">Amount</label>
              <div className="text-xs text-gray-600 flex items-center">
                <Wallet className="h-3 w-3 mr-1" />
                Available: {selectedBalance} {selectedSymbol}
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                className="text-lg font-semibold h-12"
                step="0.01"
                min="0"
              />
              <div className="relative w-72">
                <button onClick={() => setSelectorOpen(!selectorOpen)} className="w-full h-12 rounded-xl border-2 border-gray-200 hover:border-blue-300 px-3 flex items-center justify-between">
                  <span className="font-semibold text-gray-900">{tokenMeta?.symbol || selectedSymbol || tokenMeta?.name || selectedName || 'Token'}</span>
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                </button>
                {selectorOpen && (
                  <div className="absolute z-50 mt-2 w-full bg-white border rounded-lg shadow">
                    {tokenBalances.map((tb, idx) => (
                      <button key={`${tb.address}-${idx}`} className={`w-full flex items-center justify-between p-3 hover:bg-gray-50 ${selectedToken === tb.address ? 'bg-blue-50' : ''}`}
                        onClick={() => { setSelectedToken(tb.address); setSelectorOpen(false); }}>
                        <div className="text-left">
                          <div className="font-semibold text-gray-900">{tb.name}</div>
                          <div className="text-sm text-gray-500">{tb.symbol}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Balance</div>
                          <div className="font-semibold text-gray-900">{tb.formattedBalance}</div>
                          {selectedToken === tb.address && <Check className="h-4 w-4 text-blue-600 mt-1 ml-auto" />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <input id="agree-fund" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
            <label htmlFor="agree-fund" className="text-sm text-gray-600">
              I understand this will transfer funds to the prize pool and may be distributed per campaign rules.
            </label>
          </div>

          <div className="flex justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const addr = prompt('Enter token address (0x...)');
                  if (!addr) return;
                  const symbol = prompt('Enter token symbol (e.g. G$)') || 'TKN';
                  const name = prompt('Enter token name') || symbol;
                  const decimalsStr = prompt('Enter token decimals', '18') || '18';
                  const decimals = Number(decimalsStr) || 18;
                  addCustomToken({ address: addr as string, name, symbol, decimals });
                  // Force refresh by resetting selection; balances will reload on reopen
                  setSelectedToken(addr);
                }}
                className="text-xs underline text-blue-600"
              >
                Add custom token
              </button>
            </div>
            
            <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="h-11">Cancel</Button>
            <Button onClick={handleConfirm} disabled={!canConfirm} className="h-11">
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</> : 'Confirm'}
            </Button>
            </div>
          </div>

          {(approveHash || fundHash) && (
            <div className="pt-2 space-y-1 text-sm">
              {approveHash && (
                <div>
                  Approval: <a className="text-blue-600 underline" href={`https://celoscan.io/tx/${approveHash}`} target="_blank" rel="noreferrer">View</a>
                </div>
              )}
              {fundHash && (
                <div>
                  Funding: <a className="text-blue-600 underline" href={`https://celoscan.io/tx/${fundHash}`} target="_blank" rel="noreferrer">View</a>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


