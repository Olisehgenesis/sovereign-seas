import { useWallets } from '@privy-io/react-auth';
import { useEffect, useMemo } from 'react';

export function useActiveWallet() {
  const { wallets, ready } = useWallets();

  const primaryWallet = useMemo(() => {
    if (!ready || !wallets || wallets.length === 0) return undefined;
    return wallets[0];
  }, [wallets, ready]);

  // Debug logs for wallet readiness and selection
  useEffect(() => {
    // Summarize wallet addresses for concise logging
    const addresses = (wallets || []).map(w => w.address);
    console.log('[useActiveWallet] ready:', ready, 'wallets:', addresses, 'primary:', primaryWallet?.address);
  }, [ready, wallets, primaryWallet?.address]);

  const selectConnectedWallet = (desiredAddress?: string) => {
    if (!ready || !wallets || wallets.length === 0) return undefined;
    if (!desiredAddress) return wallets[0];
    const lower = desiredAddress.toLowerCase();
    return wallets.find(w => w.address.toLowerCase() === lower) || wallets[0];
  };

  return {
    wallets,
    walletsReady: ready,
    wallet: primaryWallet,
    address: primaryWallet?.address,
    selectConnectedWallet
  } as const;
}


