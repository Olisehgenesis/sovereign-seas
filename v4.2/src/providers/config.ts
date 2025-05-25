

import {createConfig} from '@privy-io/wagmi';
import {  http } from 'wagmi';
import { celo, celoAlfajores } from 'wagmi/chains';




export const config = createConfig({
  
  chains: [celoAlfajores, celo],
  
  transports: {
    [celoAlfajores.id]: http("https://celo-alfajores.drpc.org"),
    [celo.id]: http("https://celo.drpc.org"),
  },
});