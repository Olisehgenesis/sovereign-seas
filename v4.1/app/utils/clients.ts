//make public and wallet clients

import { createPublicClient, createWalletClient, http } from 'viem';
import { celo, celoAlfajores } from 'viem/chains';


const celoAlfajoresRpcUrl = process.env.NEXT_PUBLIC_CELO_ALFAJORES_RPC_URL;


const publicClient = createPublicClient({
  chain: celoAlfajores,
  transport: http(),
});

const walletClient = createWalletClient({
  chain: celoAlfajores,
  //set chain rpc url to https://celo-alfajores.drpc.org
  transport: http(celoAlfajoresRpcUrl),
});


//export the clients
export { publicClient, walletClient };