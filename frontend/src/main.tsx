import React from "react";
import ReactDOM from "react-dom/client";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider as PrivyWagmiProvider } from "@privy-io/wagmi";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "./config/wagmi";
import { wagmiPrivyConfig } from "./config/wagmiPrivy";
import { arcTestnet } from "./chains/arcTestnet";
import App from "./App";
import "./styles/global.css";

const queryClient = new QueryClient();

// Register an app at https://dashboard.privy.io and set VITE_PRIVY_APP_ID in
// frontend/.env to enable Privy's embedded/social login. Until then the app
// falls back to a plain injected-wallet connector (MetaMask, Rabby, ...).
const privyAppId = import.meta.env.VITE_PRIVY_APP_ID ?? "";

function Providers({ children }: { children: React.ReactNode }) {
  if (privyAppId) {
    return (
      <PrivyProvider
        appId={privyAppId}
        config={{
          defaultChain: arcTestnet,
          supportedChains: [arcTestnet],
          embeddedWallets: { createOnLogin: "users-without-wallets" },
        }}
      >
        <QueryClientProvider client={queryClient}>
          <PrivyWagmiProvider config={wagmiPrivyConfig}>{children}</PrivyWagmiProvider>
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
