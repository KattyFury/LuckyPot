import { useEffect } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { arcTestnet } from "../chains/arcTestnet";

/** Whenever a wallet connects on the wrong chain, prompt it to switch to Arc Testnet. */
export function useAutoSwitchNetwork() {
  const { isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    if (isConnected && chainId !== undefined && chainId !== arcTestnet.id) {
      switchChain({ chainId: arcTestnet.id });
    }
  }, [isConnected, chainId, switchChain]);
}
