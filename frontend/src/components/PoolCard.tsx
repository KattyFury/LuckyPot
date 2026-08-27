import { useState } from "react";
import { formatUSDC } from "../lib/format";
import { useAmount, useTokenUnit } from "../config/tokenUnit";
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
  const { unit } = useTokenUnit();
  const [showEligibleInfo, setShowEligibleInfo] = useState(false);
  const [showMyEligibleInfo, setShowMyEligibleInfo] = useState(false);

  return (
    <div className="card card-rows">
      <div className="two-col box-header">
        <span style={{ fontWeight: 700, color: "var(--color-primary)" }}>
          <span style={{ fontSize: "var(--fs-lg)" }}>TOTAL TICKET</span>
          <span style={{ fontSize: "var(--fs-sm)" }}>/POOL</span>
        </span>
        <span style={{ fontWeight: 700, color: "var(--color-primary)", textAlign: "left" }}>
          <span style={{ fontSize: "var(--fs-lg)" }}>MY TICKETS</span>
          <span style={{ fontSize: "var(--fs-sm)" }}>/MY DEPOSIT</span>
        </span>
      </div>

      <div className="two-col" style={{ fontFamily: "var(--font-condensed)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: "var(--fs-xl)", fontWeight: 700, display: "flex", alignItems: "baseline", gap: 6 }}>
            {formatUSDC(eligiblePoolTotal)}/{formatUSDC(totalPool)}
            <button
              type="button"
              aria-label="How much money does the pool actually hold?"
              onClick={() => setShowEligibleInfo(true)}
              style={{ background: "none", padding: 0, lineHeight: 0, display: "inline-flex", alignItems: "center" }}
            >
              <span className="icon icon-info" style={{ fontSize: "var(--fs-md)", color: "var(--color-text-secondary)" }} />
            </button>
          </div>
          <span style={{ fontSize: "var(--fs-sm)", fontWeight: 700 }}>{unit}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: "var(--fs-xl)", fontWeight: 700, display: "flex", alignItems: "baseline", gap: 6 }}>
            {formatUSDC(myEligible)}/{formatUSDC(myDeposited)}
            <button
              type="button"
              aria-label="Why is my ticket count different from what I deposited?"
              onClick={() => setShowMyEligibleInfo(true)}
              style={{ background: "none", padding: 0, lineHeight: 0, display: "inline-flex", alignItems: "center" }}
            >
              <span className="icon icon-info" style={{ fontSize: "var(--fs-md)", color: "var(--color-text-secondary)" }} />
            </button>
          </div>
          <span style={{ fontSize: "var(--fs-sm)", fontWeight: 700 }}>{unit}</span>
        </div>
      </div>

      {showEligibleInfo && (
        <Modal title="What's a ticket?" onClose={() => setShowEligibleInfo(false)}>
          <div style={{ fontSize: "var(--fs-md)", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
            <p>
              "Tickets" is every $1 that's sat in the pool a full week and counts toward this draw. The pool
              actually holds <strong style={{ color: "var(--color-text)" }}>{amount(totalPool)}</strong> in
              total, always withdrawable — but only{" "}
              <strong style={{ color: "var(--color-text)" }}>{formatUSDC(eligiblePoolTotal)}</strong> of that has
              been in long enough to count; fresh deposits roll into tickets next epoch.
            </p>
            <p>Tip: deposit right before a draw so your week starts immediately.</p>
          </div>
        </Modal>
      )}

      {showMyEligibleInfo && (
        <Modal title="Why don't my tickets match my deposit?" onClose={() => setShowMyEligibleInfo(false)}>
          <div style={{ fontSize: "var(--fs-md)", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
            <p>
              You've deposited <strong style={{ color: "var(--color-text)" }}>{amount(myDeposited)}</strong>,
              always withdrawable. Only{" "}
              <strong style={{ color: "var(--color-text)" }}>{formatUSDC(myEligible)}</strong> of that has sat a
              full week, so that's the only part counted as tickets for this draw — the rest rolls in next epoch.
            </p>
            <p>Tip: deposit right before a draw so your week starts immediately.</p>
          </div>
        </Modal>
      )}

      <div
        style={{
          fontSize: "var(--fs-md)",
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
