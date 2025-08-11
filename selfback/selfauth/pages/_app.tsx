import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http } from "wagmi";
import { celo } from "viem/chains";
import { WagmiProvider } from "wagmi";
import { injected } from "@wagmi/connectors";

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  const wagmiConfig = createConfig({
    chains: [celo],
    transports: { [celo.id]: http() },
    connectors: [injected()],
  });
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || "YOUR_PRIVY_APP_ID"}
      config={{
        appearance: { theme: "dark" },
        embeddedWallets: { createOnLogin: "users-without-wallets" },
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <Component {...pageProps} />
        </QueryClientProvider>
      </WagmiProvider>
    </PrivyProvider>
  );
}
