import { useState } from "react";
import { formatUSDC } from "../lib/format";
import { useAmount } from "../config/tokenUnit";
import { Modal } from "./Modal";

export function PoolCard({
  totalPool,
  eligiblePoolTotal,
  myTickets,
  walletBalance,
  onDeposit,
  onWithdraw,
  onLatestResult,
  latestResultAvailable,
}: {
  totalPool: bigint;
  eligiblePoolTotal: bigint;
  myTickets: bigint;
  walletBalance: bigint;
  onDeposit: () => void;
  onWithdraw: () => void;
  onLatestResult: () => void;
  latestResultAvailable: boolean;
}) {
  const amount = useAmount();
  const [showEligibleInfo, setShowEligibleInfo] = useState(false);

  return (
    <div className="card card-rows">
      <div className="two-col box-header">
        <span style={{ fontSize: "var(--fs-4)", fontWeight: 700, color: "var(--color-primary)" }}>TOTAL POOL</span>
        <span style={{ fontSize: "var(--fs-4)", fontWeight: 700, color: "var(--color-primary)", textAlign: "left" }}>
          MY TICKETS
        </span>
      </div>

      <div className="two-col" style={{ alignItems: "baseline", fontFamily: "var(--font-condensed)" }}>
        <div style={{ fontSize: "var(--fs-3)", fontWeight: 700, display: "flex", alignItems: "baseline", gap: 6 }}>
          {formatUSDC(eligiblePoolTotal)}/{amount(totalPool)}
          <button
            type="button"
            aria-label="Why is the eligible pool different from the total pool?"
            onClick={() => setShowEligibleInfo(true)}
            style={{ background: "none", padding: 0, lineHeight: 0 }}
          >
            <span className="icon icon-info" style={{ fontSize: "var(--fs-caption)", color: "var(--color-text-secondary)" }} />
          </button>
        </div>
        <div style={{ fontSize: "var(--fs-3)", fontWeight: 700, textAlign: "left" }}>
          {formatUSDC(myTickets)}
          <span style={{ fontSize: "var(--fs-4)", fontWeight: 400, color: "var(--color-text-secondary)" }}>
            {" "}
            (USDC deposited)
          </span>
        </div>
      </div>

      {showEligibleInfo && (
        <Modal title="Eligible pool vs. total pool" onClose={() => setShowEligibleInfo(false)}>
          <div style={{ fontSize: "var(--fs-caption)", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
            <p>
              <strong style={{ color: "var(--color-text)" }}>{amount(totalPool)}</strong> is everything currently
              deposited – it's always safe and withdrawable anytime.
            </p>
            <p>
              <strong style={{ color: "var(--color-text)" }}>{formatUSDC(eligiblePoolTotal)}</strong> is the slice of
              that pool eligible for this week's draw. A deposit only counts once it has sat in the pool for one full
              epoch without being withdrawn; a fresh deposit rolls into eligibility at the next draw.
            </p>
            <p>
              Tip: deposit right after a draw happens so your funds start their full week immediately, instead of
              depositing right before the current epoch ends.
            </p>
          </div>
        </Modal>
      )}

      <div
        style={{
          fontSize: "var(--fs-caption)",
          color: "var(--color-text-secondary)",
          fontFamily: "var(--font-condensed)",
        }}
      >
        My wallet's balance: <strong style={{ color: "var(--color-text)" }}>{amount(walletBalance)}</strong>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button className="pill-button pill-button--primary" onClick={onDeposit}>
          Deposit
        </button>
        <button className="pill-button pill-button--primary" onClick={onWithdraw}>
          Withdraw
        </button>
        <button
          className="pill-button pill-button--secondary"
          onClick={onLatestResult}
          disabled={!latestResultAvailable}
        >
          Latest Result
        </button>
      </div>
    </div>
  );
}
