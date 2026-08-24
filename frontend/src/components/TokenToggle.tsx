import { useTokenUnit, type TokenUnit } from "../config/tokenUnit";

const UNITS: TokenUnit[] = ["USDC", "$ARC"];

export function TokenToggle() {
  const { unit, setUnit } = useTokenUnit();

  return (
    <span className="token-toggle" role="group" aria-label="Display token">
      {UNITS.map((u) => {
        const disabled = u === "$ARC";
        return (
          <button
            key={u}
            type="button"
            className={u === unit ? "is-active" : undefined}
            aria-pressed={u === unit}
            disabled={disabled}
            title={disabled ? "$ARC hasn't launched yet – the pool only holds USDC" : undefined}
            onClick={() => setUnit(u)}
          >
            {u}
          </button>
        );
      })}
    </span>
  );
}
