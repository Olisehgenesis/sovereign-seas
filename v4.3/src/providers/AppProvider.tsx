'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {WagmiProvider} from '@privy-io/wagmi';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import { useEffect } from 'react';
// import Layout from '../components/Layout';
import { config } from './config';
import { celo, celoAlfajores } from 'wagmi/chains';

const appId = import.meta.env.VITE_PRIVY_APP_ID as string;
const isTestnet = import.meta.env.VITE_ENV === 'testnet';

console.log('Privy Environment Check:', {
  hasAppId: !!appId,
 
  isTestnet,
  env: import.meta.env.VITE_ENV,
  walletConnectId: !!import.meta.env.VITE_WALLET_CONNECT_ID
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
  console.log('AppProvider Rendering with config:', {
    defaultChain: isTestnet ? 'celoAlfajores' : 'celo',
    supportedChains: isTestnet ? ['celoAlfajores'] : ['celo'],
    // hasWalletConnectId: !!import.meta.env.VITE_WALLET_CONNECT_ID
  });

  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProvider
        appId={appId}
        config={{
          appearance: {
            accentColor: "#6A6FF5",
            theme: "#FFFFFF",
            logo: "https://auth.privy.io/logos/privy-logo.png",
            walletChainType: "ethereum-only",
          },
          defaultChain: isTestnet ? celoAlfajores : celo,
          supportedChains: isTestnet ? [celoAlfajores] : [celo],
          // walletConnectCloudProjectId: import.meta.env.VITE_WALLET_CONNECT_ID as string,
        }}
      >
        <PrivyInitializationTracker>
          <WagmiProvider config={config}>
            {children}
          </WagmiProvider>
        </PrivyInitializationTracker>
      </PrivyProvider>
    </QueryClientProvider>
  );
}

// Component to track Privy initialization
function PrivyInitializationTracker({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = usePrivy();

  useEffect(() => {
    console.log('Privy State Changed:', { ready, authenticated });
  }, [ready, authenticated]);

  return <>{children}</>;
}
