import { useWallets } from '@privy-io/react-auth';
import { useMemo } from 'react';

export function useActiveWallet() {
  const { wallets, ready } = useWallets();

  const primaryWallet = useMemo(() => {
    if (!ready || !wallets || wallets.length === 0) return undefined;
    return wallets[0];
  }, [wallets, ready]);

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


