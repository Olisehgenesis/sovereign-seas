import { createConfig, http, injected, WagmiProvider } from "wagmi";
import { celo } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { metaMask } from 'wagmi/connectors';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import React from "react";



export const config = createConfig({
  chains: [celo],
  transports: {
    [celo.id]: http(),
  },
  connectors: [
    metaMask({
      dappMetadata: {
        name: "Sovseas",
        url: "https://sovseas.xyz",
      }
    }),
    injected(),
    farcasterFrame()
    
  ],
});

const queryClient = new QueryClient();



export default function Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
