import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { arcTestnet } from "../chains/arcTestnet";

// Plain wagmi config used until a Privy app is registered (see .env.example).
// Works with any injected wallet (MetaMask, Rabby, ...) via useConnect/useAccount.
export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http(),
  },
});
