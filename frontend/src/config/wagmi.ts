import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { arcTestnet } from "../chains/arcTestnet";

// Plain wagmi config used until a Privy app is registered (see .env.example).
// Works with any injected wallet (MetaMask, Rabby, ...) via useConnect/useAccount.
export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  connectors: [injected()],
  transports: {
    // batch: true packs every eth_call issued in the same tick into ONE
    // JSON-RPC POST. multicall3 (see chains/arcTestnet.ts) already collapses
    // each useReadContracts into a single call, but the single reads and the
    // one-multicall-per-hook still left ~8 separate requests firing at once on
    // mount - enough for the public Arc RPC to start returning 429.
    [arcTestnet.id]: http(undefined, { batch: true }),
  },
});
