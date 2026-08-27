import { useEffect } from "react";
import { Dashboard } from "./pages/Dashboard";
import { useAutoSwitchNetwork } from "./hooks/useAutoSwitchNetwork";
import { TokenUnitProvider } from "./config/tokenUnit";
import { captureReferrerFromUrl } from "./lib/referralState";

export default function App() {
  useAutoSwitchNetwork();
  useEffect(captureReferrerFromUrl, []);

  // Everything opens as a popup over the dashboard — there are no other pages.
  return (
    <TokenUnitProvider>
      <Dashboard />
    </TokenUnitProvider>
  );
}
