import React from "react";
import ReactDOM from "react-dom/client";
import { PrivyProvider, type ConnectedWallet, type User } from "@privy-io/react-auth";
import { WagmiProvider as PrivyWagmiProvider } from "@privy-io/wagmi";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "./config/wagmi";
import { wagmiPrivyConfig } from "./config/wagmiPrivy";
import { USE_PRIVY } from "./config/authMode";
import { arcTestnet } from "./chains/arcTestnet";
import App from "./App";
import "./styles/global.css";

// Defaults tuned for one shared public RPC. Left alone, a single 429 became a
// burst of its own: every query retried three times with backoff, and each
// window refocus refired the lot.
/**
 * Which of the user's wallets wagmi should treat as the active one.
 *
 * Without this prop, Privy's useSyncPrivyWallets registers one wagmi connector
 * per wallet it knows about and then just calls reconnect(), which restores
 * whatever `recentConnectorId` is sitting in localStorage. That key is written
 * every time any wallet connects — so once MetaMask has been used in a browser,
 * every later email login reconnects straight back to MetaMask, and the
 * embedded wallet the user just signed in as is never the one wagmi holds.
 *
 * Passing this also stops Privy writing `recentConnectorId` at all, so the
 * stale-storage path is gone rather than merely outvoted.
 *
 * The rule: prefer the embedded wallet whenever one exists. Because
 * embeddedWallets.createOnLogin is "users-without-wallets" below, an embedded
 * wallet only ever exists for someone who signed up WITHOUT one — so "prefer
 * embedded" is the same thing as "use the wallet you actually logged in with".
 * Sign in with MetaMask and no embedded wallet is created, so MetaMask wins.
 */
function pickActiveWallet({ wallets }: { wallets: ConnectedWallet[]; user: User | null }) {
  return wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
  },
});

function Providers({ children }: { children: React.ReactNode }) {
  if (USE_PRIVY) {
    return (
      <PrivyProvider
        appId={import.meta.env.VITE_PRIVY_APP_ID}
        config={{
          defaultChain: arcTestnet,
          supportedChains: [arcTestnet],
          embeddedWallets: { createOnLogin: "users-without-wallets" },
        }}
      >
        <QueryClientProvider client={queryClient}>
          <PrivyWagmiProvider config={wagmiPrivyConfig} setActiveWalletForWagmi={pickActiveWallet}>
            {children}
          </PrivyWagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>
);
