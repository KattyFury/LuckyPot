import { useState } from "react";
import { Dashboard } from "./pages/Dashboard";
import { Deposit } from "./pages/Deposit";
import { Withdraw } from "./pages/Withdraw";
import { useAutoSwitchNetwork } from "./hooks/useAutoSwitchNetwork";
import { TokenUnitProvider } from "./config/tokenUnit";

type View = "dashboard" | "deposit" | "withdraw";

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  useAutoSwitchNetwork();

  return (
    <TokenUnitProvider>
      {view === "deposit" ? (
        <Deposit onBack={() => setView("dashboard")} />
      ) : view === "withdraw" ? (
        <Withdraw onBack={() => setView("dashboard")} />
      ) : (
        <Dashboard onNavigate={setView} />
      )}
    </TokenUnitProvider>
  );
}
