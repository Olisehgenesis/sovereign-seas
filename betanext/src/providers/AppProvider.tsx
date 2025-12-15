'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {WagmiProvider} from '@privy-io/wagmi';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import { useEffect } from 'react';
// import Layout from '../components/Layout';
import { config } from './config';
import { celo, celoAlfajores } from 'wagmi/chains';
import { celoSepolia } from '@/utils/celoSepolia';
import { HelmetProvider } from 'react-helmet-async';

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID as string;
const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
const isCeloSepolia = process.env.NEXT_PUBLIC_ENV === 'celo-sepolia' || process.env.NEXT_PUBLIC_NETWORK === 'celo-sepolia';

console.log('Privy Environment Check:', {
  hasAppId: !!appId,
 
  isTestnet,
  env: process.env.NEXT_PUBLIC_ENV,
  walletConnectId: !!process.env.NEXT_PUBLIC_WALLET_CONNECT_ID
});

if (!appId) {
  throw new Error(
    'Please set your Privy appId in the .env file'
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const defaultChain = isCeloSepolia ? celoSepolia : (isTestnet ? celoAlfajores : celo);
  const supportedChains = isCeloSepolia ? [celoSepolia] : (isTestnet ? [celoAlfajores] : [celo]);
  
  console.log('AppProvider Rendering with config:', {
    defaultChain: isCeloSepolia ? 'celoSepolia' : (isTestnet ? 'celoAlfajores' : 'celo'),
    supportedChains: isCeloSepolia ? ['celoSepolia'] : (isTestnet ? ['celoAlfajores'] : ['celo']),
    // hasWalletConnectId: !!import.meta.env.VITE_WALLET_CONNECT_ID
  });

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <PrivyProvider
        appId={appId}
        config={{
          appearance: {
            accentColor: "#6A6FF5",
            theme: "#FFFFFF",
            logo: "https://auth.privy.io/logos/privy-logo.png",
            walletChainType: "ethereum-and-solana",
            walletList: ['wallet_connect_qr','wallet_connect', 'metamask', 'rainbow', 'detected_ethereum_wallets'],
          },
          embeddedWallets: {
            createOnLogin: 'users-without-wallets'
          },
          defaultChain: defaultChain,
          supportedChains: supportedChains,
          walletConnectCloudProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_ID as string,
        }}
        >
          <PrivyInitializationTracker>
            <WagmiProvider config={config}>
              {children}
            </WagmiProvider>
          </PrivyInitializationTracker>
        </PrivyProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

// Component to track Privy initialization
function PrivyInitializationTracker({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user } = usePrivy();

  useEffect(() => {
    console.log('Privy State Changed:', { 
      ready, 
      authenticated, 
      hasUser: !!user,
      userId: user?.id,
      wallets: user?.linkedAccounts?.filter(acc => 'address' in acc).map(acc => (acc as any).address) || []
    });
  }, [ready, authenticated, user]);

  return <>{children}</>;
}
