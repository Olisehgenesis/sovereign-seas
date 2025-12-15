import {createConfig} from '@privy-io/wagmi';
import {  http } from 'wagmi';
import { celo, celoAlfajores } from 'wagmi/chains';
import { celoSepolia } from '@/utils/celoSepolia';

const isTestnet = process.env.NEXT_PUBLIC_ENV === 'testnet';
const isCeloSepolia = process.env.NEXT_PUBLIC_ENV === 'celo-sepolia' || process.env.NEXT_PUBLIC_NETWORK === 'celo-sepolia';

// Determine which chains to support
const getChains = () => {
  if (isCeloSepolia) {
    return [celoSepolia];
  }
  return isTestnet ? [celoAlfajores] : [celo];
};

export const config = createConfig({
  chains: getChains(),
  transports: {
    [celoAlfajores.id]: http("https://celo-alfajores.drpc.org"),
    [celo.id]: http("https://celo.drpc.org"),
    [celoSepolia.id]: http("https://forno.celo-sepolia.celo-testnet.org"),
  },
});
