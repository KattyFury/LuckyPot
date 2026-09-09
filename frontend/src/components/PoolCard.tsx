import { useState } from "react";
import { formatUSDC } from "../lib/format";
import { useAmount, useTokenUnit } from "../config/tokenUnit";
import { useT } from "../i18n/LanguageContext";
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
        alignSelf: "baseline",
        position: "relative",
        top: "0.15em",
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
  const t = useT();
  const [showEligibleInfo, setShowEligibleInfo] = useState(false);
  const [showMyEligibleInfo, setShowMyEligibleInfo] = useState(false);

  return (
    <div className="card card-rows">
      <div className="two-col box-header">
        <span className="eyebrow pair" style={{ color: "var(--color-primary)" }}>
          {t.pool.totalTickets} <span style={{ color: "var(--color-text-faint)" }}>{t.pool.slashPool}</span>
        </span>
        <span className="eyebrow pair" style={{ color: "var(--color-primary)" }}>
          {t.pool.myTickets} <span style={{ color: "var(--color-text-faint)" }}>{t.pool.slashDeposit}</span>
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
            label={t.pool.eligibleInfoLabel}
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
            label={t.pool.myEligibleInfoLabel}
            onClick={() => setShowMyEligibleInfo(true)}
          />
        </div>
      </div>

      {showEligibleInfo && (
        <Modal title={t.pool.eligibleModalTitle} onClose={() => setShowEligibleInfo(false)}>
          <div
            className="prose"
            style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)", lineHeight: 1.6 }}
          >
            <p>
              {t.pool.eligibleBodyPart1}{" "}
              <strong className="pair" style={{ color: "var(--color-text)" }}>
                {amount(totalPool)}
              </strong>{" "}
              {t.pool.eligibleBodyPart2}{" "}
              <strong className="pair" style={{ color: "var(--color-text)" }}>
                {formatUSDC(eligiblePoolTotal)}
              </strong>{" "}
              {t.pool.eligibleBodyPart3}
            </p>
            <p>{t.pool.tip}</p>
          </div>
        </Modal>
      )}

      {showMyEligibleInfo && (
        <Modal title={t.pool.myEligibleModalTitle} onClose={() => setShowMyEligibleInfo(false)}>
          <div
            className="prose"
            style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)", lineHeight: 1.6 }}
          >
            <p>
              {t.pool.myEligibleBodyPart1}{" "}
              <strong className="pair" style={{ color: "var(--color-text)" }}>
                {amount(myDeposited)}
              </strong>
              {t.pool.myEligibleBodyPart2}{" "}
              <strong className="pair" style={{ color: "var(--color-text)" }}>
                {formatUSDC(myEligible)}
              </strong>{" "}
              {t.pool.myEligibleBodyPart3}
            </p>
            <p>{t.pool.tip}</p>
          </div>
        </Modal>
      )}

      <div style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)" }}>
        {t.pool.inYourWallet}{" "}
        <strong className="num pair" style={{ color: "var(--color-text)", fontWeight: 600 }}>
          {amount(walletBalance)}
        </strong>
      </div>

      {/* Deposit is the one filled control — it's the action the page exists
          to invite. The other two read as the quieter siblings. */}
      <div style={{ display: "flex", gap: 10 }}>
        <button className="pill-button pill-button--accent" onClick={onDeposit}>
          {t.common.deposit}
        </button>
        <button className="pill-button pill-button--quiet" onClick={onWithdraw}>
          {t.common.withdraw}
        </button>
        <button
          className="pill-button pill-button--quiet"
          onClick={onLatestResult}
          disabled={!latestResultAvailable}
        >
          {t.common.latestResult}
        </button>
      </div>
    </div>
  );
}
