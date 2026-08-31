import { useState } from "react";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { poolAbi, POOL_ADDRESS } from "../lib/contract";
import { usePendingReferral } from "../hooks/usePoolData";
import { useReferralSummary } from "../hooks/useReferralSummary";
import { useAmount } from "../config/tokenUnit";
import { plural, shortAddress } from "../lib/format";
import { Modal } from "./Modal";

export function ReferralInfoModal({ onClose }: { onClose: () => void }) {
  const { address } = useAccount();
  const { data: pendingRef } = usePendingReferral(address);
  const { data: summary } = useReferralSummary(address);
  const fmt = useAmount();
  const [copied, setCopied] = useState(false);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const link = address ? `${window.location.origin}${window.location.pathname}?ref=${address}` : null;

  function copyLink() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Modal title="Invite & Earn" onClose={onClose}>
      <div style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
        <p>
          The platform takes a 5% fee on every prize won — 2.5% funds the reserve pool, 2.5% goes toward running
          and growing the ecosystem. Invite a friend, though, and that second 2.5% is paid straight to{" "}
          <strong style={{ color: "var(--color-text)" }}>your wallet</strong> instead, every time they win.
        </p>
      </div>

      {link ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--color-line)" }}>
          <span
            style={{
              flex: 1,
              fontSize: "var(--fs-1)",
              fontWeight: 700,
              padding: "12px 0",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {link}
          </span>
          <button
            type="button"
            onClick={copyLink}
            style={{ background: "none", padding: 0, lineHeight: 0, display: "inline-flex", alignItems: "center" }}
          >
            <span
              className={copied ? "icon icon-check" : "icon icon-copy"}
              style={{ fontSize: "var(--fs-1)", color: copied ? "var(--color-primary)" : "var(--color-text)" }}
            />
          </button>
        </div>
      ) : (
        <div style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)" }}>
          Connect your wallet to get your personal invite link.
        </div>
      )}

      {pendingRef !== undefined && (pendingRef as bigint) > 0n && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)" }}>
            Unclaimed referral earnings: <strong style={{ color: "var(--color-text)" }}>{fmt(pendingRef as bigint)}</strong>
          </span>
          <button
            className="pill-button pill-button--accent"
            disabled={isPending || isConfirming}
            onClick={() => writeContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: "claimReferral" })}
          >
            {isPending || isConfirming ? "Claiming..." : "Claim"}
          </button>
        </div>
      )}

      {address && (
        <div>
          <div
            className="card-list__header"
            style={{ height: "auto", padding: "0 0 10px", boxShadow: "none", borderBottom: "1px solid var(--color-line)" }}
          >
            <span>
              {summary?.referredCount ?? 0} {plural(summary?.referredCount ?? 0, "referral")}
            </span>
            <span className="num">Total earned: {fmt(summary?.totalEarned ?? 0n)}</span>
          </div>
          <div>
            {(summary?.referred.length ?? 0) === 0 ? (
              <div style={{ padding: "12px 0", fontSize: "var(--fs-1)", color: "var(--color-text-secondary)" }}>
                Nobody yet — share your link above.
              </div>
            ) : (
              summary!.referred.map((r) => (
                <div key={r.wallet} className="card-list__row">
                  <span className="num">{shortAddress(r.wallet)}</span>
                  <span className="num" style={{ fontWeight: 600 }}>
                    {fmt(r.earned)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
