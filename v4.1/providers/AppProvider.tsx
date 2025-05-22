'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {WagmiProvider} from '@privy-io/wagmi';
import { PrivyProvider } from '@privy-io/react-auth';
import Layout from '../components/Layout';
import { config } from './config';
import { celo, celoAlfajores } from 'wagmi/chains';

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID as string;
const clientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID as string;

if (!appId || !clientId) {
  throw new Error(
    'Please set your Privy appId and clientId in the .env file'
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
          defaultChain: celo,
          supportedChains: [celo, celoAlfajores]
        }}
      >
        <WagmiProvider config={config}>
          {children}
        </WagmiProvider>
      </PrivyProvider>
    </QueryClientProvider>
  );
}
