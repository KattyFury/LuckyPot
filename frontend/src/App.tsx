import { Dashboard } from "./pages/Dashboard";
import { useAutoSwitchNetwork } from "./hooks/useAutoSwitchNetwork";
import { TokenUnitProvider } from "./config/tokenUnit";

export default function App() {
  useAutoSwitchNetwork();

  // Everything opens as a popup over the dashboard — there are no other pages.
  return (
    <TokenUnitProvider>
      <Dashboard />
    </TokenUnitProvider>
  );
}
