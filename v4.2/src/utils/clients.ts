//make public and wallet clients

import { createPublicClient, createWalletClient, http } from 'viem';
import { celoAlfajores, celo } from 'viem/chains';

const isTestnet = import.meta.env.VITE_ENV === 'testnet';


// const celoAlfajoresRpcUrl = process.env.NEXT_PUBLIC_CELO_ALFAJORES_RPC_URL;

const rpcUrl = isTestnet ? "https://celo-alfajores.drpc.org" : "https://celo.drpc.org";
const publicClient = createPublicClient({
  chain: isTestnet ? celoAlfajores : celo,
  transport: http(rpcUrl),
});

const walletClient = createWalletClient({
  chain: isTestnet ? celoAlfajores : celo,
  //set chain rpc url to https://celo-alfajores.drpc.org
  transport: http(rpcUrl),
});


//export the clients
export { publicClient, walletClient };