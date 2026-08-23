import { createContext, useContext, useState, type ReactNode } from "react";
import { formatUSDC } from "../lib/format";

/** Pool token shown in the UI. The pool itself always holds USDC today —
 *  $ARC is roadmap (spec section 4: TGE has no date), so selecting it only
 *  changes the label, and the dashboard says so while it's on. */
export type TokenUnit = "USDC" | "$ARC";

const TokenUnitContext = createContext<{ unit: TokenUnit; setUnit: (u: TokenUnit) => void }>({
  unit: "USDC",
  setUnit: () => {},
});

export function TokenUnitProvider({ children }: { children: ReactNode }) {
  const [unit, setUnit] = useState<TokenUnit>("USDC");
  return <TokenUnitContext.Provider value={{ unit, setUnit }}>{children}</TokenUnitContext.Provider>;
}

export function useTokenUnit() {
  return useContext(TokenUnitContext);
}

/** Formats a pool amount with the currently selected unit, e.g. "18,600 USDC". */
export function useAmount() {
  const { unit } = useTokenUnit();
  return (value: bigint, maximumFractionDigits = 0) => `${formatUSDC(value, maximumFractionDigits)} ${unit}`;
}
