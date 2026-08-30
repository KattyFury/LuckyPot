import { useEffect } from "react";
import { Dashboard } from "./pages/Dashboard";
import { AdminPage } from "./pages/AdminPage";
import { useAutoSwitchNetwork } from "./hooks/useAutoSwitchNetwork";
import { TokenUnitProvider } from "./config/tokenUnit";
import { captureReferrerFromUrl } from "./lib/referralState";

export default function App() {
  useAutoSwitchNetwork();
  useEffect(captureReferrerFromUrl, []);

  // No router: there are exactly two pages, and /admin is an internal ops
  // tool, not a public route worth pulling in react-router for. Vite's base
  // is "/app/", so this is the literal browser path (with or without a
  // trailing slash) — see _redirects for the rewrite that makes a direct
  // visit to /app/admin resolve here instead of Pages' 404.
  const isAdmin = ["/app/admin", "/app/admin/"].includes(window.location.pathname);

  return <TokenUnitProvider>{isAdmin ? <AdminPage /> : <Dashboard />}</TokenUnitProvider>;
}
