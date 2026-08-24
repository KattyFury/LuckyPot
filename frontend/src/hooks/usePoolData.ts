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

export function useCurrentAprBps() {
  return useReadContract({ ...poolContract, functionName: "currentAprBps" });
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
    ],
  });
}

/**
 * Sums eligibleBalance() across every participant, i.e. the slice of the pool that has
 * sat through a full epoch and actually counts toward this week's draw. There's no
 * single on-chain getter for this total, so it's assembled from `participants(i)` plus
 * one `eligibleBalance` read per address – fine at this participant count.
 */
export function useEligiblePoolTotal(participantCount: number | undefined) {
  const count = participantCount ?? 0;
  const indices = count > 0 ? Array.from({ length: count }, (_, i) => i) : [];

  const { data: addressData } = useReadContracts({
    contracts: indices.map((i) => ({ ...poolContract, functionName: "participants", args: [BigInt(i)] as const })),
    query: { enabled: indices.length > 0 },
  });

  const addresses = (addressData ?? [])
    .map((r) => (r.status === "success" ? (r.result as `0x${string}`) : null))
    .filter((a): a is `0x${string}` => a !== null);

  const { data: eligibleData, ...rest } = useReadContracts({
    contracts: addresses.map((a) => ({ ...poolContract, functionName: "eligibleBalance", args: [a] as const })),
    query: { enabled: addresses.length > 0 },
  });

  const total = (eligibleData ?? []).reduce(
    (sum, r) => (r.status === "success" ? sum + (r.result as bigint) : sum),
    0n,
  );

  return { total, ...rest };
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
