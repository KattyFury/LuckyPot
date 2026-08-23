import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { poolAbi, POOL_ADDRESS, USDC_ADDRESS } from "../lib/contract";
import { erc20Abi } from "../lib/erc20Abi";

const poolContract = { address: POOL_ADDRESS, abi: poolAbi } as const;

export type EpochData = {
  startTime: bigint;
  endTime: bigint;
  drawnAt: bigint;
  eligiblePoolSnapshot: bigint;
  eligibleParticipants: bigint;
  weeklyYield: bigint;
  numWinners: bigint;
  committed: boolean;
  drawn: boolean;
  winners: readonly `0x${string}`[];
};

function toEpoch(raw: readonly unknown[]): EpochData {
  const [
    startTime,
    endTime,
    drawnAt,
    eligiblePoolSnapshot,
    eligibleParticipants,
    weeklyYield,
    numWinners,
    committed,
    drawn,
    winners,
  ] = raw as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, boolean, boolean, `0x${string}`[]];
  return {
    startTime,
    endTime,
    drawnAt,
    eligiblePoolSnapshot,
    eligibleParticipants,
    weeklyYield,
    numWinners,
    committed,
    drawn,
    winners,
  };
}

export function useCurrentEpochId() {
  return useReadContract({ ...poolContract, functionName: "currentEpochId" });
}

export function useEpoch(epochId: bigint | undefined) {
  const { data, ...rest } = useReadContract({
    ...poolContract,
    functionName: "getEpoch",
    args: epochId !== undefined ? [epochId] : undefined,
    query: { enabled: epochId !== undefined },
  });
  return { data: data ? toEpoch(data as readonly unknown[]) : undefined, ...rest };
}

/** Fetches getEpoch for a descending range of past epoch ids, for the draw-history list. */
export function useEpochHistory(currentEpochId: bigint | undefined, count = 10) {
  const ids: bigint[] = [];
  if (currentEpochId !== undefined) {
    for (let i = currentEpochId - 1n; i >= 1n && ids.length < count; i--) {
      ids.push(i);
    }
  }

  const { data, ...rest } = useReadContracts({
    contracts: ids.map((id) => ({ ...poolContract, functionName: "getEpoch", args: [id] as const })),
    query: { enabled: ids.length > 0 },
  });

  const epochs = (data ?? [])
    .map((r, i) => (r.status === "success" ? { id: ids[i], epoch: toEpoch(r.result as readonly unknown[]) } : null))
    .filter((x): x is { id: bigint; epoch: EpochData } => x !== null);

  return { epochs, ...rest };
}

export function usePoolTotals() {
  return useReadContracts({
    contracts: [
      { ...poolContract, functionName: "balancesTotal" },
      { ...poolContract, functionName: "participantCount" },
      { ...poolContract, functionName: "pendingYield" },
    ],
  });
}

export function useUserPosition(address: `0x${string}` | undefined) {
  return useReadContracts({
    contracts: [
      { ...poolContract, functionName: "balances", args: address ? [address] : undefined },
      { ...poolContract, functionName: "eligibleBalance", args: address ? [address] : undefined },
      { ...poolContract, functionName: "pendingBalance", args: address ? [address] : undefined },
      { address: USDC_ADDRESS, abi: erc20Abi, functionName: "balanceOf", args: address ? [address] : undefined },
      {
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "allowance",
        args: address ? [address, POOL_ADDRESS] : undefined,
      },
    ],
    query: { enabled: Boolean(address) },
  });
}

export function useConnectedAddress() {
  const { address } = useAccount();
  return address;
}
