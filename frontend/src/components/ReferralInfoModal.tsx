import { useState } from "react";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { poolAbi, POOL_ADDRESS } from "../lib/contract";
import { usePendingReferral } from "../hooks/usePoolData";
import { useReferralSummary } from "../hooks/useReferralSummary";
import { useAmount } from "../config/tokenUnit";
import { shortAddress } from "../lib/format";
import { useT } from "../i18n/LanguageContext";
import { Modal } from "./Modal";

export function ReferralInfoModal({ onClose }: { onClose: () => void }) {
  const { address } = useAccount();
  const { data: pendingRef } = usePendingReferral(address);
  const { data: summary } = useReferralSummary(address);
  const fmt = useAmount();
  const t = useT();
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
    <Modal title={t.referral.modalTitle} onClose={onClose}>
      <div style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
        <p>
          {t.referral.feeExplanationPart1}{" "}
          <strong style={{ color: "var(--color-text)" }}>{t.referral.feeExplanationBold}</strong>{" "}
          {t.referral.feeExplanationPart2}
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
          {t.referral.connectPrompt}
        </div>
      )}

      {pendingRef !== undefined && (pendingRef as bigint) > 0n && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)" }}>
            {t.referral.unclaimedLabel} <strong style={{ color: "var(--color-text)" }}>{fmt(pendingRef as bigint)}</strong>
          </span>
          <button
            className="pill-button pill-button--accent"
            disabled={isPending || isConfirming}
            onClick={() => writeContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: "claimReferral" })}
          >
            {isPending || isConfirming ? t.common.claiming : t.common.claim}
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
              {summary?.referredCount ?? 0} {t.common.referralWord(summary?.referredCount ?? 0)}
            </span>
            <span className="num">{t.referral.totalEarned} {fmt(summary?.totalEarned ?? 0n)}</span>
          </div>
          <div>
            {(summary?.referred.length ?? 0) === 0 ? (
              <div style={{ padding: "12px 0", fontSize: "var(--fs-1)", color: "var(--color-text-secondary)" }}>
                {t.referral.nobodyYet}
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
