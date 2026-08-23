import { useState } from "react";
import { Dashboard } from "./pages/Dashboard";
import { Deposit } from "./pages/Deposit";
import { Withdraw } from "./pages/Withdraw";
import { useAutoSwitchNetwork } from "./hooks/useAutoSwitchNetwork";

type View = "dashboard" | "deposit" | "withdraw";

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  useAutoSwitchNetwork();

  if (view === "deposit") return <Deposit onBack={() => setView("dashboard")} />;
  if (view === "withdraw") return <Withdraw onBack={() => setView("dashboard")} />;

  return <Dashboard onNavigate={setView} />;
}
