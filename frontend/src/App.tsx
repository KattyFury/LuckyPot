import { useState } from "react";
import { Dashboard } from "./pages/Dashboard";
import { Deposit } from "./pages/Deposit";
import { Withdraw } from "./pages/Withdraw";
import { Scratch } from "./pages/Scratch";

type View = "dashboard" | "deposit" | "withdraw" | "scratch";

export default function App() {
  const [view, setView] = useState<View>("dashboard");

  if (view === "deposit") return <Deposit onBack={() => setView("dashboard")} />;
  if (view === "withdraw") return <Withdraw onBack={() => setView("dashboard")} />;
  if (view === "scratch") return <Scratch onBack={() => setView("dashboard")} />;

  return <Dashboard onNavigate={setView} />;
}
