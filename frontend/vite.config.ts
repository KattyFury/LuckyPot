import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // The dashboard lives at /app on luckypot.cc; the static landing page (built
  // separately, see scripts/build-site.mjs) occupies the domain root.
  base: "/app/",
  build: {
    outDir: "dist-site/app",
  },
});
