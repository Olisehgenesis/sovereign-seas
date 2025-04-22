'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { PrivyProvider } from '@privy-io/react-auth';
import Layout from '../components/Layout';
import { config } from './config';

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const clientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;

if (!appId || !clientId) {
  throw new Error(
    'Please set your Privy appId and clientId in the .env file'
  );
}

const queryClient = new QueryClient();

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <PrivyProvider
          appId={appId}
          config={{
            "appearance": {
              "accentColor": "#6A6FF5",
              "theme": "#FFFFFF",
              "showWalletLoginFirst": false,
              "logo": "https://auth.privy.io/logos/privy-logo.png",
              "walletChainType": "ethereum-only",
              "walletList": [
                "detected_wallets",
                "metamask",
                "phantom"
              ]
            },
            "loginMethods": [
              "email",
              "wallet",
              "google",
              "apple",
              "github",
              "discord"
            ],
            "embeddedWallets": {
              "requireUserPasswordOnCreate": false,
              "showWalletUIs": true,
              "ethereum": {
                "createOnLogin": "users-without-wallets"
              }
            },
            "mfa": {
              "noPromptOnMfaRequired": false
            }
          }}
        >
          <Layout>{children}</Layout>
        </PrivyProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}