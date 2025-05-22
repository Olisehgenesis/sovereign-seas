//make public and wallet clients

import { createPublicClient, createWalletClient, http } from 'viem';
import { celo, celoAlfajores } from 'viem/chains';


const publicClient = createPublicClient({
  chain: celoAlfajores,
  transport: http(),
});

const walletClient = createWalletClient({
  chain: celoAlfajores,
  transport: http(),
});


//export the clients
export { publicClient, walletClient };