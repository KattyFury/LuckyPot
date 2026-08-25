import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  // Privy's SDK (and some of its wallet-connect dependencies) reach for
  // Node's Buffer/process globals, which don't exist in the browser and
  // which Vite — unlike webpack — doesn't polyfill automatically. Without
  // this, depositing through a Privy-connected wallet throws "Buffer is not
  // defined" mid-transaction.
  plugins: [react(), nodePolyfills({ globals: { Buffer: true, process: true, global: true } })],
  // The dashboard lives at /app on luckypot.cc; the static landing page (built
  // separately, see scripts/build-site.mjs) occupies the domain root.
  base: "/app/",
  build: {
    outDir: "dist-site/app",
  },
});
