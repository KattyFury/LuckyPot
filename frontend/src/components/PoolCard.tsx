import { useState } from "react";
import { formatUSDC } from "../lib/format";
import { useAmount } from "../config/tokenUnit";
import { Modal } from "./Modal";

export function PoolCard({
  totalPool,
  eligiblePoolTotal,
  myEligible,
  myDeposited,
  walletBalance,
  onDeposit,
  onWithdraw,
  onLatestResult,
  latestResultAvailable,
}: {
  totalPool: bigint;
  eligiblePoolTotal: bigint;
  myEligible: bigint;
  myDeposited: bigint;
  walletBalance: bigint;
  onDeposit: () => void;
  onWithdraw: () => void;
  onLatestResult: () => void;
  latestResultAvailable: boolean;
}) {
  const amount = useAmount();
  const [showEligibleInfo, setShowEligibleInfo] = useState(false);
  const [showMyEligibleInfo, setShowMyEligibleInfo] = useState(false);

  return (
    <div className="card card-rows">
      <div className="two-col box-header">
        <span style={{ fontSize: "var(--fs-4)", fontWeight: 700, color: "var(--color-primary)" }}>TOTAL POOL</span>
        <span style={{ fontSize: "var(--fs-4)", fontWeight: 700, color: "var(--color-primary)", textAlign: "left" }}>
          MY TICKETS
        </span>
      </div>

      <div className="two-col" style={{ alignItems: "baseline", fontFamily: "var(--font-condensed)" }}>
        <div style={{ fontSize: "var(--fs-3)", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          {formatUSDC(eligiblePoolTotal)}/{amount(totalPool)}
          <button
            type="button"
            aria-label="Why is the eligible pool different from the total pool?"
            onClick={() => setShowEligibleInfo(true)}
            style={{ background: "none", padding: 0, lineHeight: 0, display: "inline-flex", alignItems: "center" }}
          >
            <span className="icon icon-info" style={{ fontSize: "var(--fs-caption)", color: "var(--color-text-secondary)" }} />
          </button>
        </div>
        <div style={{ fontSize: "var(--fs-3)", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          {formatUSDC(myEligible)}/{amount(myDeposited)}
          <button
            type="button"
            aria-label="Why is my eligible amount different from what I deposited?"
            onClick={() => setShowMyEligibleInfo(true)}
            style={{ background: "none", padding: 0, lineHeight: 0, display: "inline-flex", alignItems: "center" }}
          >
            <span className="icon icon-info" style={{ fontSize: "var(--fs-caption)", color: "var(--color-text-secondary)" }} />
          </button>
        </div>
      </div>

      {showEligibleInfo && (
        <Modal title="Eligible pool vs. total pool" onClose={() => setShowEligibleInfo(false)}>
          <div style={{ fontSize: "var(--fs-caption)", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
            <p>
              <strong style={{ color: "var(--color-text)" }}>{amount(totalPool)}</strong> deposited, always
              withdrawable. Only <strong style={{ color: "var(--color-text)" }}>{formatUSDC(eligiblePoolTotal)}</strong> has
              sat a full week and counts toward this draw – fresh deposits roll in next epoch.
            </p>
            <p>Tip: deposit right after a draw so your week starts immediately.</p>
          </div>
        </Modal>
      )}

      {showMyEligibleInfo && (
        <Modal title="Your eligible balance vs. your deposit" onClose={() => setShowMyEligibleInfo(false)}>
          <div style={{ fontSize: "var(--fs-caption)", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
            <p>
              <strong style={{ color: "var(--color-text)" }}>{amount(myDeposited)}</strong> deposited, always
              withdrawable. Only <strong style={{ color: "var(--color-text)" }}>{formatUSDC(myEligible)}</strong> has
              sat a full week and counts toward this draw – fresh deposits roll in next epoch.
            </p>
            <p>Tip: deposit right after a draw so your week starts immediately.</p>
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
