

import {
  RainbowKitProvider,
  connectorsForWallets,
} from '@rainbow-me/rainbowkit';
import { createConfig, http } from 'wagmi';
import { celo, celoAlfajores } from 'wagmi/chains';


import { injectedWallet, rainbowWallet, metaMaskWallet, valoraWallet, trustWallet } from '@rainbow-me/rainbowkit/wallets';


const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [injectedWallet, rainbowWallet, metaMaskWallet, valoraWallet, trustWallet],
    },
  ],
  {
    appName: 'Sovereign Seas',
    projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? '044601f65212332475a09bc14ceb3c34',
  }
);

export const config = createConfig({
  connectors,
  chains: [celo, celoAlfajores],
  transports: {
    [celo.id]: http(),
    [celoAlfajores.id]: http(),
  },
});