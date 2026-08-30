import { createConfig } from "@privy-io/wagmi";
import { http } from "viem";
import { arcTestnet } from "../chains/arcTestnet";

// Used only once VITE_PRIVY_APP_ID is set — see main.tsx.
export const wagmiPrivyConfig = createConfig({
  chains: [arcTestnet],
  transports: {
    // batch: true packs every eth_call issued in the same tick into ONE
    // JSON-RPC POST. multicall3 (see chains/arcTestnet.ts) already collapses
    // each useReadContracts into a single call, but the single reads and the
    // one-multicall-per-hook still left ~8 separate requests firing at once on
    // mount - enough for the public Arc RPC to start returning 429.
    [arcTestnet.id]: http(undefined, { batch: true }),
  },
});
