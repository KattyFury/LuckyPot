import { createConfig } from "@privy-io/wagmi";
import { http } from "viem";
import { arcTestnet } from "../chains/arcTestnet";

// Used only once VITE_PRIVY_APP_ID is set — see main.tsx.
export const wagmiPrivyConfig = createConfig({
  chains: [arcTestnet],
  transports: {
    [arcTestnet.id]: http(),
  },
});
