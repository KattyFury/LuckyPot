import { useState } from "react";
import { formatUSDC } from "../lib/format";
import { useAmount, useTokenUnit } from "../config/tokenUnit";
import { Modal } from "./Modal";

/** The little "why is this number what it is?" affordance beside a figure. */
function InfoButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        background: "none",
        padding: 0,
        lineHeight: 0,
        display: "inline-flex",
        alignItems: "center",
        alignSelf: "center",
        flex: "none",
      }}
    >
      <span
        className="icon icon-info"
        style={{ fontSize: "var(--fs-1)", color: "var(--color-text-faint)" }}
      />
    </button>
  );
}

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
        <span className="eyebrow pair" style={{ color: "var(--color-primary)" }}>
          Total tickets <span style={{ color: "var(--color-text-faint)" }}>/ pool</span>
        </span>
        <span className="eyebrow pair" style={{ color: "var(--color-primary)" }}>
          My tickets <span style={{ color: "var(--color-text-faint)" }}>/ deposit</span>
        </span>
      </div>

      {/* The eligible figure leads at --fs-4; the total trails it a step down
          in the faint tone. The unit is a --fs-0 label, not a third number,
          which is what let the whole line fit on one row again. */}
      <div className="two-col">
        <div className="pair" style={{ display: "flex", alignItems: "baseline", gap: 5, minWidth: 0 }}>
          <span className="num" style={{ fontSize: "var(--fs-4)", fontWeight: 700 }}>
            {formatUSDC(eligiblePoolTotal)}
          </span>
          <span
            className="num"
            style={{ fontSize: "var(--fs-2)", fontWeight: 500, color: "var(--color-text-faint)" }}
          >
            /{formatUSDC(totalPool)}
          </span>
          <span
            style={{ fontSize: "var(--fs-0)", fontWeight: 700, color: "var(--color-text-secondary)" }}
          >
            {unit}
          </span>
          <InfoButton
            label="How much money does the pool actually hold?"
            onClick={() => setShowEligibleInfo(true)}
          />
        </div>
        <div className="pair" style={{ display: "flex", alignItems: "baseline", gap: 5, minWidth: 0 }}>
          <span className="num" style={{ fontSize: "var(--fs-4)", fontWeight: 700 }}>
            {formatUSDC(myEligible)}
          </span>
          <span
            className="num"
            style={{ fontSize: "var(--fs-2)", fontWeight: 500, color: "var(--color-text-faint)" }}
          >
            /{formatUSDC(myDeposited)}
          </span>
          <span
            style={{ fontSize: "var(--fs-0)", fontWeight: 700, color: "var(--color-text-secondary)" }}
          >
            {unit}
          </span>
          <InfoButton
            label="Why is my ticket count different from what I deposited?"
            onClick={() => setShowMyEligibleInfo(true)}
          />
        </div>
      </div>

      {showEligibleInfo && (
        <Modal title="What's a ticket?" onClose={() => setShowEligibleInfo(false)}>
          <div
            className="prose"
            style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)", lineHeight: 1.6 }}
          >
            <p>
              "Tickets" is every $1 that sat in the pool through a whole epoch &mdash; Monday 00:00 UTC to the
              next Monday 00:00 UTC &mdash; and so counts toward this draw. The pool actually holds{" "}
              <strong className="pair" style={{ color: "var(--color-text)" }}>
                {amount(totalPool)}
              </strong>{" "}
              in total, always withdrawable — but only{" "}
              <strong className="pair" style={{ color: "var(--color-text)" }}>
                {formatUSDC(eligiblePoolTotal)}
              </strong>{" "}
              of that has been in long enough to count; fresh deposits roll into tickets at the next Monday
              boundary.
            </p>
            <p>Tip: deposit just before a draw, so your money starts a full epoch immediately instead of
              waiting out the rest of this one.</p>
          </div>
        </Modal>
      )}

      {showMyEligibleInfo && (
        <Modal title="Why don't my tickets match my deposit?" onClose={() => setShowMyEligibleInfo(false)}>
          <div
            className="prose"
            style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)", lineHeight: 1.6 }}
          >
            <p>
              You've deposited{" "}
              <strong className="pair" style={{ color: "var(--color-text)" }}>
                {amount(myDeposited)}
              </strong>
              , always withdrawable. Only{" "}
              <strong className="pair" style={{ color: "var(--color-text)" }}>
                {formatUSDC(myEligible)}
              </strong>{" "}
              of that sat through a whole epoch, so that's the only part counted as tickets for this draw &mdash;
              the rest rolls in at the next Monday boundary.
            </p>
            <p>Tip: deposit just before a draw, so your money starts a full epoch immediately instead of
              waiting out the rest of this one.</p>
          </div>
        </Modal>
      )}

      <div style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)" }}>
        In your wallet:{" "}
        <strong className="num pair" style={{ color: "var(--color-text)", fontWeight: 600 }}>
          {amount(walletBalance)}
        </strong>
      </div>

      {/* Deposit is the one filled control — it's the action the page exists
          to invite. The other two read as the quieter siblings. */}
      <div style={{ display: "flex", gap: 10 }}>
        <button className="pill-button pill-button--accent" onClick={onDeposit}>
          Deposit
        </button>
        <button className="pill-button pill-button--quiet" onClick={onWithdraw}>
          Withdraw
        </button>
        <button
          className="pill-button pill-button--quiet"
          onClick={onLatestResult}
          disabled={!latestResultAvailable}
        >
          Latest result
        </button>
      </div>
    </div>
  );
}
