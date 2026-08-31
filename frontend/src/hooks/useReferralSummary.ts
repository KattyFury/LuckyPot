import { useQuery } from "@tanstack/react-query";

export type ReferralSummary = {
  referredCount: number;
  totalEarned: bigint;
  referred: { wallet: `0x${string}`; earned: bigint }[];
};

type ReferralSummaryRow = { referredCount: number; totalEarned: string; referred: { wallet: string; earned: string }[] };

/** Reads from luckypot-history (D1) via functions/api/referrals.js, same
 *  reasoning as useMyHistory.ts: who a wallet referred and how much each one
 *  earned them isn't cheap to reconstruct client-side (it takes pairing a
 *  ReferralPaid/Accrued event to the Claimed/Swept event it fired alongside),
 *  so automation/src/indexHistory.ts does that once on its existing schedule
 *  and this is just a normal fast read. */
export function useReferralSummary(address: `0x${string}` | undefined) {
  return useQuery({
    queryKey: ["referralSummary", address],
    enabled: Boolean(address),
    staleTime: 60_000,
    queryFn: async (): Promise<ReferralSummary> => {
      const res = await fetch(`/api/referrals?wallet=${address}`);
      if (!res.ok) throw new Error(`referrals fetch failed: ${res.status}`);
      const data: ReferralSummaryRow = await res.json();
      return {
        referredCount: data.referredCount,
        totalEarned: BigInt(data.totalEarned),
        referred: data.referred.map((r) => ({ wallet: r.wallet as `0x${string}`, earned: BigInt(r.earned) })),
      };
    },
  });
}
