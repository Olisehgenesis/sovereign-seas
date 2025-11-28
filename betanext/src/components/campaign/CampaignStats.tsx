'use client';

import React from 'react';
import { Trophy, Info, Coins, Loader2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import type { Address } from 'viem';
import { ButtonCool } from '@/components/ui/button-cool';

interface CampaignStatsProps {
  poolBalance: any;
  isLoadingPoolBalance: boolean;
  poolBalanceError: any;
  supportedTokens: Array<{
    address: string;
    symbol: string;
    decimals: number;
  }>;
  onDonateClick: () => void;
  isDonating: boolean;
  isAdmin?: boolean;
  onCreatePool?: () => void;
  campaignPoolId?: bigint;
}

export const CampaignStats: React.FC<CampaignStatsProps> = ({
  poolBalance,
  isLoadingPoolBalance,
  poolBalanceError,
  supportedTokens,
  onDonateClick,
  isDonating,
  isAdmin = false,
  onCreatePool,
  campaignPoolId,
}) => {
  // Check if pool exists and has data
  const tokens = Array.isArray(poolBalance) ? poolBalance[0] : poolBalance?.tokens;
  const balances = Array.isArray(poolBalance) ? poolBalance[1] : poolBalance?.balances;
  const hasPoolData = tokens && balances && tokens.length > 0 && balances.some((b: any) => Number(b) > 0);
  const poolExists = campaignPoolId !== undefined && campaignPoolId !== 0n;

  // If no pool data and not loading, show small badge instead of full card
  if (!isLoadingPoolBalance && !poolBalanceError && !hasPoolData) {
    return (
      <div className="relative w-full flex justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-2 bg-white border-[0.2em] border-[#050505] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000]">
          <Info className="h-4 w-4 text-[#2563eb]" />
          <span className="text-[0.8em] font-bold text-[#050505]">No Pool</span>
          {isAdmin && onCreatePool && !poolExists ? (
            <ButtonCool
              onClick={onCreatePool}
              text="Create Pool"
              bgColor="#10b981"
              hoverBgColor="#059669"
              borderColor="#050505"
              textColor="#ffffff"
              size="sm"
            />
          ) : !isAdmin && poolExists ? (
            <ButtonCool
              onClick={onDonateClick}
              text="Donate"
              bgColor="#2563eb"
              hoverBgColor="#1d4ed8"
              borderColor="#050505"
              textColor="#ffffff"
              size="sm"
            />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="group relative w-full max-w-2xl"
    >
      {/* Pattern Overlays */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
          backgroundSize: '0.5em 0.5em'
        }}
      />
      
      {/* Main Card */}
      <div 
        className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2] group-hover:shadow-[1em_1em_0_#000000] group-hover:-translate-x-[0.4em] group-hover:-translate-y-[0.4em] group-hover:scale-[1.02]"
        style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
      >
        {/* Accent Corner */}
        <div className="absolute -top-[1em] -right-[1em] w-[4em] h-[4em] bg-[#00e0b0] rotate-45 z-[1]" />
        <div className="absolute top-[0.4em] right-[0.4em] text-[#050505] text-[1.2em] font-bold z-[2]">★</div>

        {/* Title Area */}
        <div 
          className="relative px-[1em] py-[0.8em] text-white font-extrabold flex items-center justify-between border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
          style={{ 
            background: '#2563eb',
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
            backgroundBlendMode: 'overlay'
          }}
        >
          <h3 className="text-[0.9em] flex items-center">
            <Trophy className="h-4 w-4 mr-2" />
            Campaign Pool
          </h3>
          <div className="relative group">
            <div className="w-[1.4em] h-[1.4em] flex items-center justify-center bg-white/20 border-[0.12em] border-white rounded-[0.3em] cursor-help hover:bg-white/30 transition-all">
              <Info className="h-[0.9em] w-[0.9em] text-white" />
            </div>
            <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-[#050505] text-white text-[0.8em] rounded-[0.4em] shadow-[0.3em_0.3em_0_#000000] border-[0.15em] border-[#050505] opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
              This is the amount in contract that will be distributed between projects
              <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#050505]"></div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="relative px-[1.2em] py-[1em] z-[2]">
          {isLoadingPoolBalance ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-[#2563eb]" />
              <span className="ml-2 text-[#2563eb] font-semibold">Loading...</span>
            </div>
          ) : poolBalanceError ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-red-100 border-[0.15em] border-[#ef4444] rounded-full flex items-center justify-center mx-auto mb-3 shadow-[0.2em_0.2em_0_#000000]">
                <XCircle className="h-6 w-6 text-[#ef4444]" />
              </div>
              <p className="text-[#ef4444] text-[0.9em] font-semibold">Error loading pool</p>
            </div>
          ) : (() => {
          // Handle both array and object formats
          const tokens = Array.isArray(poolBalance) ? poolBalance[0] : poolBalance?.tokens;
          const balances = Array.isArray(poolBalance) ? poolBalance[1] : poolBalance?.balances;
          
          return tokens && balances ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 justify-center">
                {tokens.length > 0 ? (() => {
                  // Filter out tokens with zero balance
                  const tokensWithBalance = tokens
                    .map((token: string, index: number) => {
                      const balance = Number(balances[index]);
                      return { token, balance, index };
                    })
                    .filter(({ balance }: { balance: number }) => balance > 0);

                  if (tokensWithBalance.length === 0) {
                    return (
                      <div className="text-center py-4 text-[#2563eb] font-semibold">
                        Pool is empty
                      </div>
                    );
                  }

                  return tokensWithBalance.map(({ token, balance, index }: { token: string; balance: number; index: number }) => {
                    // Find token info from supported tokens
                    const tokenInfo = supportedTokens.find(t => 
                      t.address.toLowerCase() === token.toLowerCase()
                    );
                    
                    const formattedBalance = tokenInfo 
                      ? (balance / Math.pow(10, tokenInfo.decimals)).toFixed(0)
                      : (balance / 1e18).toFixed(0);
                    
                    const tokenSymbol = tokenInfo?.symbol || 'UNK';
                    
                    return (
                      <div key={token} className="flex items-center gap-2 p-2 bg-[#dbeafe] border-[0.15em] border-[#2563eb] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
                        {tokenInfo ? (
                          <div className="w-10 h-10 rounded-full border-[0.15em] border-[#050505] flex items-center justify-center overflow-hidden relative bg-white shadow-[0.2em_0.2em_0_rgba(0,0,0,0.2)]">
                            {tokenSymbol === 'CELO' ? (
                              <Image 
                                src="/images/celo.png" 
                                alt="CELO" 
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                              />
                            ) : tokenSymbol === 'cUSD' ? (
                              <Image 
                                src="/images/cusd.png" 
                                alt="cUSD" 
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                              />
                            ) : tokenSymbol === 'G$' ? (
                              <Image 
                                src="/images/good.png" 
                                alt="Good Dollar" 
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                              />
                            ) : null}
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-100 border-[0.15em] border-[#050505] flex items-center justify-center shadow-[0.2em_0.2em_0_rgba(0,0,0,0.2)]">
                            <span className="text-xs font-bold text-[#050505]">
                              ?
                            </span>
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-[1.2em] font-extrabold text-[#050505]">
                            {formattedBalance}
                          </span>
                          <span className="text-[0.7em] font-bold text-[#2563eb] uppercase tracking-[0.05em]">
                            {tokenSymbol}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })() : (
                  <div className="text-center py-4 text-[#2563eb] font-semibold">
                    No tokens in pool
                  </div>
                )}
              </div>
              
              <div className="mt-4">
                <ButtonCool
                  onClick={onDonateClick}
                  disabled={isDonating}
                  text={isDonating ? 'Processing...' : 'Donate to Pool'}
                  bgColor="#2563eb"
                  hoverBgColor="#1d4ed8"
                  borderColor="#050505"
                  textColor="#ffffff"
                  size="md"
                  className="w-full"
                >
                  <Coins className="w-4 h-4" />
                </ButtonCool>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-[#2563eb] font-semibold">
              No pool data available
            </div>
          );
        })()}
        </div>

        {/* Corner Slice */}
        <div className="absolute bottom-0 left-0 w-[1.5em] h-[1.5em] bg-white border-r-[0.25em] border-t-[0.25em] border-[#050505] rounded-tl-[0.5em] z-[1]" />
      </div>
    </motion.div>
  );
};

