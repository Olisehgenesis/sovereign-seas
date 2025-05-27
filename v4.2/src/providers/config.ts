import {createConfig} from '@privy-io/wagmi';
import {  http } from 'wagmi';
import { celo, celoAlfajores } from 'wagmi/chains';

const isTestnet = import.meta.env.VITE_ENV === 'testnet';





export const config = createConfig({
  
  chains: isTestnet ? [celoAlfajores] : [celo],
  
  transports: {
    [celoAlfajores.id]: http("https://celo-alfajores.drpc.org"),
    [celo.id]: http("https://celo.drpc.org"),
  },
});