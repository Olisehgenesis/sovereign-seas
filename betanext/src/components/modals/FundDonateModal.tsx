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
      <DialogContent className="max-w-xl bg-white border-[0.35em] border-[#2563eb] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] p-0 [&>button]:hidden relative">
        {/* Pattern Grid Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-30 z-[1]"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
            backgroundSize: '0.5em 0.5em'
          }}
        />

        {/* Accent Corner */}
        <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#2563eb] rotate-45 z-[1]" />
        <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">★</div>

        <DialogHeader className="relative px-[1.5em] pt-[1.4em] pb-[1em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2] overflow-hidden"
          style={{ 
            background: '#2563eb',
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
            backgroundBlendMode: 'overlay'
          }}
        >
          <DialogDescription className="text-white text-2xl font-extrabold uppercase tracking-[0.05em]">{title}</DialogDescription>
        </DialogHeader>

        <div className="relative px-[1.5em] pb-[1.5em] space-y-5 z-[2]">
          {errorMsg && (
            <div className="p-3 border-[0.2em] border-[#ef4444] bg-[#fee2e2] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] text-sm text-[#050505] font-extrabold uppercase tracking-[0.05em]">{errorMsg}</div>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-extrabold text-[#050505] uppercase tracking-[0.05em]">Amount</label>
              <div className="text-xs text-[#050505] flex items-center font-semibold">
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
                className="text-lg font-extrabold h-12 border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000] focus:outline-none"
                step="0.01"
                min="0"
              />
              <div className="relative w-72">
                <button onClick={() => setSelectorOpen(!selectorOpen)} className="w-full h-12 rounded-[0.4em] border-[0.2em] border-[#050505] shadow-[0.2em_0.2em_0_#000000] hover:shadow-[0.3em_0.3em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] transition-all px-3 flex items-center justify-between bg-white font-extrabold">
                  <span className="text-[#050505]">{tokenMeta?.symbol || selectedSymbol || tokenMeta?.name || selectedName || 'Token'}</span>
                  <ChevronDown className="h-5 w-5 text-[#050505]" />
                </button>
                {selectorOpen && (
                  <div className="absolute z-50 mt-2 w-full bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000]">
                    {tokenBalances.map((tb, idx) => (
                      <button key={`${tb.address}-${idx}`} className={`w-full flex items-center justify-between p-3 border-b-[0.15em] border-gray-300 last:border-b-0 hover:bg-gray-50 font-extrabold ${selectedToken === tb.address ? 'bg-[#dbeafe]' : ''}`}
                        onClick={() => { setSelectedToken(tb.address); setSelectorOpen(false); }}>
                        <div className="text-left">
                          <div className="font-extrabold text-[#050505] uppercase tracking-[0.05em]">{tb.name}</div>
                          <div className="text-sm text-[#050505] font-semibold">{tb.symbol}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-[#050505] font-semibold">Balance</div>
                          <div className="font-extrabold text-[#050505]">{tb.formattedBalance}</div>
                          {selectedToken === tb.address && <Check className="h-4 w-4 text-[#2563eb] mt-1 ml-auto" />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <input id="agree-fund" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 w-5 h-5 border-[0.15em] border-[#050505] rounded-[0.2em] accent-[#2563eb]" />
            <label htmlFor="agree-fund" className="text-sm text-[#050505] font-semibold">
              I understand this will transfer funds to the prize pool and may be distributed per campaign rules.
            </label>
          </div>

          <div className="flex justify-between gap-3 pt-2 border-t-[0.35em] border-[#050505]">
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
                  setSelectedToken(addr);
                }}
                className="text-xs underline text-[#2563eb] font-extrabold uppercase tracking-[0.05em]"
              >
                Add custom token
              </button>
            </div>
            
            <div className="flex gap-3">
            <ButtonCool onClick={onClose} text="Cancel" bgColor="#ffffff" hoverBgColor="#f3f4f6" textColor="#050505" borderColor="#050505" size="md" />
            <ButtonCool 
              onClick={handleConfirm} 
              text={isSubmitting ? "Processing..." : "Confirm"}
              bgColor="#2563eb"
              hoverBgColor="#1d4ed8"
              textColor="#ffffff"
              borderColor="#050505"
              size="md"
              disabled={!canConfirm}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            </ButtonCool>
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


