'use client';

import { useState, useEffect, useMemo } from 'react';
import { parseEther, formatEther } from 'viem';
import { useAccount, usePublicClient } from 'wagmi';
import { Wallet, ChevronDown, Check, Loader2, AlertCircle } from 'lucide-react';
import { ButtonCool } from '@/components/ui/button-cool';
import { 
  MobileDialog as Dialog,
  MobileDialogContent as DialogContent,
  MobileDialogHeader as DialogHeader,
  MobileDialogDescription as DialogDescription,
} from '@/components/ui/mobile-dialog';
import { Input } from '@/components/ui/input';
import { useVoteWithCelo, useVoteWithToken, useProjectPower } from '@/hooks/useTournamentMethods';
import { getTournamentContractAddress } from '@/utils/contractConfig';
import { supportedTokens } from '@/hooks/useSupportedTokens';
import { useCurrentStageNumber } from '@/hooks/useTournamentMethods';

interface TournamentVoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: bigint;
  projectId: bigint;
  onVoteSuccess?: () => void;
}

type TokenBalance = {
  address: string;
  symbol: string;
  name: string;
  balance: bigint;
  formattedBalance: string;
};

const ZERO = '0x0000000000000000000000000000000000000000';

export default function TournamentVoteModal({
  isOpen,
  onClose,
  tournamentId,
  projectId,
  onVoteSuccess
}: TournamentVoteModalProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const contractAddress = getTournamentContractAddress();
  
  const { currentStageNumber } = useCurrentStageNumber(contractAddress, tournamentId);
  const { voteWithCelo, isPending: isCeloPending, isSuccess: celoSuccess } = useVoteWithCelo(contractAddress);
  const { voteWithToken, isPending: isTokenPending, isSuccess: tokenSuccess } = useVoteWithToken(contractAddress);
  const { power: currentPower } = useProjectPower(contractAddress, tournamentId, currentStageNumber || 0n, projectId);

  const [amountStr, setAmountStr] = useState('');
  const [selectedToken, setSelectedToken] = useState<string>(ZERO);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
      setErrorMsg('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (celoSuccess || tokenSuccess) {
      setTimeout(() => {
        onVoteSuccess?.();
        onClose();
      }, 2000);
    }
  }, [celoSuccess, tokenSuccess, onVoteSuccess, onClose]);

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

  const canConfirm = useMemo(() => {
    const n = parseFloat(amountStr || '0');
    const bal = parseFloat(selectedBalance || '0');
    return !isCeloPending && !isTokenPending && n > 0 && n <= bal && !!selectedToken;
  }, [amountStr, selectedBalance, selectedToken, isCeloPending, isTokenPending]);

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setErrorMsg('');
    
    try {
      const amount = parseEther(amountStr);
      const celoToken = tokens.find(t => t.symbol === 'CELO');
      const isCelo = celoToken && selectedToken.toLowerCase() === celoToken.address.toLowerCase();

      if (isCelo) {
        await voteWithCelo({ tournamentId, projectId });
      } else {
        await voteWithToken({ 
          tournamentId, 
          projectId, 
          token: selectedToken as `0x${string}`, 
          amount 
        });
      }
    } catch (e: any) {
      const msg = e?.shortMessage || e?.message || 'Transaction failed';
      setErrorMsg(msg);
    }
  };

  if (!isOpen) return null;

  const tokenMeta = tokens.find(t => t.address?.toLowerCase() === selectedToken.toLowerCase());

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-white border-[0.35em] border-[#a855f7] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] p-0 [&>button]:hidden relative">
        <div 
          className="absolute inset-0 pointer-events-none opacity-30 z-[1]"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
            backgroundSize: '0.5em 0.5em'
          }}
        />

        <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#a855f7] rotate-45 z-[1]" />
        <div className="absolute top-[0.4em] right-[0.4em] text-white text-[1.2em] font-bold z-[2]">⚔</div>

        <DialogHeader className="relative px-[1.5em] pt-[1.4em] pb-[1em] text-white font-extrabold border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2] overflow-hidden"
          style={{ 
            background: '#a855f7',
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
            backgroundBlendMode: 'overlay'
          }}
        >
          <DialogDescription className="text-white text-xl font-extrabold uppercase tracking-[0.05em]">
            Vote for Project #{projectId.toString()}
          </DialogDescription>
        </DialogHeader>

        <div className="relative px-[1.5em] pb-[1.5em] space-y-4 z-[2]">
          {/* Current Power */}
          <div className="p-3 bg-gray-50 border-[0.15em] border-[#050505] rounded-[0.3em]">
            <div className="text-xs font-semibold text-gray-600 uppercase">Current Power</div>
            <div className="text-lg font-bold text-[#050505]">{currentPower ? formatEther(currentPower) : '0'}</div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border-[0.2em] border-red-300 rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-xs font-bold text-red-700">{errorMsg}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-[#050505] uppercase tracking-[0.05em]">Amount</label>
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
                className="text-sm font-extrabold h-10 border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.15em_0.15em_0_#000000] focus:outline-none"
                step="0.01"
                min="0"
              />
              <div className="relative w-48">
                <button 
                  onClick={() => setSelectorOpen(!selectorOpen)} 
                  className="w-full h-10 rounded-[0.3em] border-[0.15em] border-[#050505] shadow-[0.15em_0.15em_0_#000000] hover:shadow-[0.2em_0.2em_0_#000000] hover:-translate-x-[0.05em] hover:-translate-y-[0.05em] transition-all px-3 flex items-center justify-between bg-white font-extrabold text-xs"
                >
                  <span className="text-[#050505]">{tokenMeta?.symbol || selectedSymbol || 'Token'}</span>
                  <ChevronDown className="h-4 w-4 text-[#050505]" />
                </button>
                {selectorOpen && (
                  <div className="absolute z-50 mt-2 w-full bg-white border-[0.15em] border-[#050505] rounded-[0.3em] shadow-[0.2em_0.2em_0_#000000]">
                    {tokenBalances.map((tb, idx) => (
                      <button 
                        key={`${tb.address}-${idx}`} 
                        className={`w-full flex items-center justify-between p-2 border-b-[0.1em] border-gray-300 last:border-b-0 hover:bg-gray-50 font-extrabold text-xs ${selectedToken === tb.address ? 'bg-[#dbeafe]' : ''}`}
                        onClick={() => { setSelectedToken(tb.address); setSelectorOpen(false); }}
                      >
                        <div className="text-left">
                          <div className="font-extrabold text-[#050505] uppercase">{tb.name}</div>
                          <div className="text-[10px] text-[#050505] font-semibold">{tb.symbol}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-[#050505] font-semibold">Balance</div>
                          <div className="font-extrabold text-[#050505]">{tb.formattedBalance}</div>
                          {selectedToken === tb.address && <Check className="h-3 w-3 text-[#a855f7] mt-1 ml-auto" />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between gap-3 pt-3 border-t-[0.2em] border-[#050505]">
            <ButtonCool 
              onClick={onClose} 
              text="Cancel" 
              bgColor="#ffffff" 
              hoverBgColor="#f3f4f6" 
              textColor="#050505" 
              borderColor="#050505" 
              size="sm"
              disabled={isCeloPending || isTokenPending}
            />
            <ButtonCool 
              onClick={handleConfirm} 
              text={isCeloPending || isTokenPending ? "Voting..." : "Vote"}
              bgColor="#a855f7"
              hoverBgColor="#9333ea"
              textColor="#ffffff"
              borderColor="#050505"
              size="sm"
              disabled={!canConfirm}
            >
              {(isCeloPending || isTokenPending) && <Loader2 className="h-3 w-3 animate-spin" />}
            </ButtonCool>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

