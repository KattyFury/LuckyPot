import { useEffect, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
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
  return useReadContract({ ...poolContract, functionName: "currentEpochId", query: { placeholderData: keepPreviousData } });
}

export function useCurrentAprBps() {
  return useReadContract({ ...poolContract, functionName: "currentAprBps", query: { placeholderData: keepPreviousData } });
}

/** Seconds after a draw during which a winner can self-claim; after that only sweep() works. */
export function useSweepDelay() {
  return useReadContract({ ...poolContract, functionName: "SWEEP_DELAY", query: { staleTime: Infinity } });
}

export function useEpoch(epochId: bigint | undefined) {
  const { data, ...rest } = useReadContract({
    ...poolContract,
    functionName: "getEpoch",
    args: epochId !== undefined ? [epochId] : undefined,
    query: { enabled: epochId !== undefined, placeholderData: keepPreviousData },
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
    query: { enabled: ids.length > 0, placeholderData: keepPreviousData },
  });

  const epochs = (data ?? [])
    .map((r, i) => (r.status === "success" ? { id: ids[i], epoch: toEpoch(r.result as readonly unknown[]) } : null))
    .filter((x): x is { id: bigint; epoch: EpochData } => x !== null);

  return { epochs, ...rest };
}

// Wagmi/tanstack-query only refetch on mount, window refocus, or an explicit
// invalidate by default - nothing re-polls a balance just because time passed.
// 15s keeps the numbers on screen close to live without piling more load on
// the public RPC (everything's already batched into one multicall per hook).
const BALANCE_POLL_MS = 15_000;

export function usePoolTotals() {
  return useReadContracts({
    contracts: [
      { ...poolContract, functionName: "balancesTotal" },
      { ...poolContract, functionName: "participantCount" },
    ],
    query: { placeholderData: keepPreviousData, refetchInterval: BALANCE_POLL_MS },
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
    query: { enabled: indices.length > 0, placeholderData: keepPreviousData, refetchInterval: BALANCE_POLL_MS },
  });

  // The public Arc Testnet RPC 429s under load, and a rate-limited read comes back as
  // one failed entry, not a thrown error — only trust the address list once every
  // participants(i) call succeeded, or a rate-limit blip reads as "fewer participants
  // than there really are" instead of "still loading".
  const addressesComplete =
    indices.length === 0 || (addressData?.length === indices.length && addressData.every((r) => r.status === "success"));
  const addresses = addressesComplete ? (addressData ?? []).map((r) => r.result as `0x${string}`) : [];

  const { data: eligibleData, ...rest } = useReadContracts({
    contracts: addresses.map((a) => ({ ...poolContract, functionName: "eligibleBalance", args: [a] as const })),
    query: { enabled: addresses.length > 0, placeholderData: keepPreviousData, refetchInterval: BALANCE_POLL_MS },
  });

  const eligibleComplete =
    addressesComplete &&
    (addresses.length === 0 || (eligibleData?.length === addresses.length && eligibleData.every((r) => r.status === "success")));

  // Same rate-limit hazard here: summing only the reads that happened to succeed would
  // silently undercount to "whichever participants' calls didn't get 429'd this time",
  // which changes on every reload. Only report a total once the whole set resolved —
  // otherwise keep showing the last complete total instead of a confidently wrong one.
  const [lastGood, setLastGood] = useState({ total: 0n, eligibleCount: 0 });
  useEffect(() => {
    if (!eligibleComplete) return;
    const total = (eligibleData ?? []).reduce((sum, r) => sum + (r.result as bigint), 0n);
    const eligibleCount = (eligibleData ?? []).filter((r) => (r.result as bigint) > 0n).length;
    setLastGood({ total, eligibleCount });
  }, [eligibleComplete, eligibleData]);

  return { ...lastGood, ...rest };
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
    query: { enabled: Boolean(address), placeholderData: keepPreviousData, refetchInterval: BALANCE_POLL_MS },
  });
}

export function useConnectedAddress() {
  const { address } = useAccount();
  return address;
}

export function useReferrer(address: `0x${string}` | undefined) {
  return useReadContract({
    ...poolContract,
    functionName: "refBy",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address), placeholderData: keepPreviousData },
  });
}

export function usePendingReferral(address: `0x${string}` | undefined) {
  return useReadContract({
    ...poolContract,
    functionName: "pendingRef",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address), placeholderData: keepPreviousData },
  });
}
