

import {
  RainbowKitProvider,
  connectorsForWallets,
} from '@rainbow-me/rainbowkit';
import {createConfig} from '@privy-io/wagmi';
import {  http } from 'wagmi';
import { celo, celoAlfajores } from 'wagmi/chains';




export const config = createConfig({
  
  chains: [celo, celoAlfajores],
  transports: {
    [celo.id]: http(),
    [celoAlfajores.id]: http(),
  },
});